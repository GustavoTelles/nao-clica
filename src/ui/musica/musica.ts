// Tocador da trilha: sintetiza a partitura com a Web Audio API, sem nenhum arquivo de áudio.
// Agenda os compassos um pouco à frente do relógio do áudio (lookahead) para não haver falhas.
import { compasso, frequencia, SEG_POR_COMPASSO, SEG_POR_SEMICOLCHEIA, type Nota } from './partitura';

const VOLUME = 0.16;
const ANTECEDENCIA = 0.35;

let ctx: AudioContext | null = null;
let mestre: GainNode;
let eco: GainNode;
let ruido: AudioBuffer;
let timer = 0;
let proximoCompasso = 0;
let inicioProximo = 0;
let tocando = false;

function montar(): AudioContext {
  const c = new AudioContext();
  mestre = c.createGain();
  mestre.gain.value = 0;
  const comp = c.createDynamicsCompressor();
  comp.threshold.value = -18;
  comp.ratio.value = 3;
  mestre.connect(comp).connect(c.destination);

  // Eco simples (delay com realimentação filtrada) para dar ambiência ao arpejo e à melodia.
  eco = c.createGain();
  eco.gain.value = 0.28;
  const atraso = c.createDelay(2);
  atraso.delayTime.value = SEG_POR_SEMICOLCHEIA * 3;
  const volta = c.createGain();
  volta.gain.value = 0.38;
  const filtro = c.createBiquadFilter();
  filtro.type = 'lowpass';
  filtro.frequency.value = 2200;
  eco.connect(atraso).connect(filtro).connect(volta).connect(atraso);
  filtro.connect(mestre);

  ruido = c.createBuffer(1, c.sampleRate, c.sampleRate);
  const dados = ruido.getChannelData(0);
  let s = 12345;
  for (let i = 0; i < dados.length; i++) { s = (s * 1103515245 + 12345) & 0x7fffffff; dados[i] = s / 0x3fffffff - 1; }
  return c;
}

function envelope(g: GainNode, t: number, pico: number, ataque: number, dur: number, soltura: number) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(pico, t + ataque);
  g.gain.setValueAtTime(pico, t + Math.max(ataque, dur));
  g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(ataque, dur) + soltura);
}

function oscilador(tipo: OscillatorType, freq: number, t: number, fim: number, destino: AudioNode, detune = 0) {
  const o = ctx!.createOscillator();
  o.type = tipo;
  o.frequency.value = freq;
  o.detune.value = detune;
  o.connect(destino);
  o.start(t);
  o.stop(fim);
  return o;
}

function tocarNota(n: Nota, t: number) {
  const c = ctx!;
  const dur = n.dur * SEG_POR_SEMICOLCHEIA;
  const g = c.createGain();
  switch (n.inst) {
    case 'pad': {
      const f = c.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 700 + n.vel * 900;
      f.Q.value = 0.7;
      g.connect(f).connect(mestre);
      envelope(g, t, 0.07 * n.vel, 0.8, dur - 0.4, 1.6);
      oscilador('sawtooth', frequencia(n.midi), t, t + dur + 2, g, -7);
      oscilador('sawtooth', frequencia(n.midi), t, t + dur + 2, g, 7);
      break;
    }
    case 'baixo': {
      const f = c.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 500;
      g.connect(f).connect(mestre);
      envelope(g, t, 0.28 * n.vel, 0.01, dur * 0.6, 0.15);
      oscilador('triangle', frequencia(n.midi), t, t + dur + 0.3, g);
      oscilador('square', frequencia(n.midi), t, t + dur + 0.3, g).frequency.value = frequencia(n.midi - 12);
      break;
    }
    case 'arpejo': {
      g.connect(mestre);
      g.connect(eco);
      envelope(g, t, 0.06 * n.vel, 0.005, 0.03, Math.min(0.25, dur * 0.8));
      oscilador('square', frequencia(n.midi), t, t + dur + 0.3, g);
      break;
    }
    case 'melodia': {
      g.connect(mestre);
      g.connect(eco);
      envelope(g, t, 0.11 * n.vel, 0.03, dur * 0.85, 0.35);
      const o = oscilador('triangle', frequencia(n.midi), t, t + dur + 0.5, g);
      // Vibrato leve.
      const lfo = c.createOscillator();
      const prof = c.createGain();
      lfo.frequency.value = 5.2;
      prof.gain.value = 6;
      lfo.connect(prof).connect(o.detune);
      lfo.start(t);
      lfo.stop(t + dur + 0.5);
      break;
    }
    case 'bumbo': {
      g.connect(mestre);
      envelope(g, t, 0.55 * n.vel, 0.002, 0.02, 0.28);
      const o = oscilador('sine', 140, t, t + 0.4, g);
      o.frequency.setValueAtTime(140, t);
      o.frequency.exponentialRampToValueAtTime(42, t + 0.25);
      break;
    }
    case 'chimbal':
    case 'caixa': {
      const fonte = c.createBufferSource();
      fonte.buffer = ruido;
      const f = c.createBiquadFilter();
      f.type = n.inst === 'chimbal' ? 'highpass' : 'bandpass';
      f.frequency.value = n.inst === 'chimbal' ? 7000 : 1800;
      fonte.connect(f).connect(g).connect(mestre);
      const sol = n.inst === 'chimbal' ? 0.05 : 0.16;
      envelope(g, t, (n.inst === 'chimbal' ? 0.07 : 0.18) * n.vel, 0.001, 0.01, sol);
      fonte.start(t, Math.random() * 0.5);
      fonte.stop(t + sol + 0.05);
      break;
    }
  }
}

function agendar() {
  if (!ctx) return;
  while (inicioProximo < ctx.currentTime + ANTECEDENCIA) {
    for (const n of compasso(proximoCompasso)) tocarNota(n, inicioProximo + n.t * SEG_POR_SEMICOLCHEIA);
    proximoCompasso++;
    inicioProximo += SEG_POR_COMPASSO;
  }
}

export function musicaTocando(): boolean {
  return tocando;
}

/** Liga a trilha. Precisa ser chamado a partir de um gesto do usuário (clique ou tecla). */
export function ligarMusica(): void {
  if (tocando) return;
  try {
    ctx ??= montar();
  } catch {
    return; // navegador sem Web Audio: o jogo segue em silêncio
  }
  tocando = true;
  void ctx.resume();
  const agora = ctx.currentTime;
  mestre.gain.cancelScheduledValues(agora);
  mestre.gain.setValueAtTime(mestre.gain.value, agora);
  mestre.gain.linearRampToValueAtTime(VOLUME, agora + 2);
  if (inicioProximo < agora) inicioProximo = agora + 0.1;
  agendar();
  timer = window.setInterval(agendar, 100);
}

export function desligarMusica(): void {
  if (!tocando || !ctx) return;
  tocando = false;
  window.clearInterval(timer);
  const agora = ctx.currentTime;
  mestre.gain.cancelScheduledValues(agora);
  mestre.gain.setValueAtTime(mestre.gain.value, agora);
  mestre.gain.linearRampToValueAtTime(0, agora + 0.6);
  const c = ctx;
  window.setTimeout(() => { if (!tocando) void c.suspend(); }, 700);
}

// Aba escondida: pausa o áudio para economizar bateria; ao voltar, continua de onde parou.
document.addEventListener('visibilitychange', () => {
  if (!ctx || !tocando) return;
  if (document.hidden) void ctx.suspend();
  else void ctx.resume();
});
