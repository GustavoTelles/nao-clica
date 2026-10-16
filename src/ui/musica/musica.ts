// Tocador da trilha. Dois modos:
//  - "gerada": sintetiza a partitura (partitura.ts) com a Web Audio API — ~20 min por ciclo, sem fim;
//  - "faixa": toca a faixa original "A ameaça no breu" (public/audio/) em loop.
// Na trilha gerada, os compassos são agendados um pouco à frente do relógio do áudio (lookahead).
import { compasso, frequencia, SEG_POR_COMPASSO, SEG_POR_SEMICOLCHEIA, type Nota } from './partitura';

export type Trilha = 'gerada' | 'faixa';

const VOLUME_GERADA = 0.34;
const VOLUME_FAIXA = 0.45;
const ANTECEDENCIA = 0.4;
const URL_FAIXA = 'audio/a-ameaca-no-breu.mp3';

let ctx: BaseAudioContext | null = null;
let mestre: GainNode;
let eco: GainNode;
let reverb: GainNode;
let ruido: AudioBuffer;
let timer = 0;
let proximoCompasso = 0;
let inicioProximo = 0;
let tocando = false;
let trilha: Trilha = 'gerada';
let faixa: HTMLAudioElement | null = null;
let ganhoFaixa: GainNode | null = null;

function impulso(c: BaseAudioContext, seg: number): AudioBuffer {
  const b = c.createBuffer(2, Math.floor(c.sampleRate * seg), c.sampleRate);
  let s = 987654;
  for (let ch = 0; ch < 2; ch++) {
    const d = b.getChannelData(ch);
    for (let i = 0; i < d.length; i++) {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      d[i] = (s / 0x3fffffff - 1) * (1 - i / d.length) ** 3;
    }
  }
  return b;
}

function montar(c: BaseAudioContext = new AudioContext()): BaseAudioContext {
  mestre = c.createGain();
  mestre.gain.value = 0;
  const comp = c.createDynamicsCompressor();
  comp.threshold.value = -16;
  comp.ratio.value = 3;
  mestre.connect(comp).connect(c.destination);

  // Reverberação longa (o "breu") e eco de colcheia pontuada.
  reverb = c.createGain();
  reverb.gain.value = 0.55;
  const conv = c.createConvolver();
  conv.buffer = impulso(c, 3.5);
  reverb.connect(conv).connect(mestre);

  eco = c.createGain();
  eco.gain.value = 0.25;
  const atraso = c.createDelay(3);
  atraso.delayTime.value = SEG_POR_SEMICOLCHEIA * 3;
  const volta = c.createGain();
  volta.gain.value = 0.35;
  const filtro = c.createBiquadFilter();
  filtro.type = 'lowpass';
  filtro.frequency.value = 1600;
  eco.connect(atraso).connect(filtro).connect(volta).connect(atraso);
  filtro.connect(mestre);
  filtro.connect(reverb);

  ruido = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
  const dados = ruido.getChannelData(0);
  let s = 12345;
  for (let i = 0; i < dados.length; i++) { s = (s * 1103515245 + 12345) & 0x7fffffff; dados[i] = s / 0x3fffffff - 1; }
  return c;
}

function envelope(g: GainNode, t: number, pico: number, ataque: number, sustenta: number, soltura: number) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(pico, t + ataque);
  g.gain.setValueAtTime(pico, t + Math.max(ataque, sustenta));
  g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(ataque, sustenta) + soltura);
}

function osc(tipo: OscillatorType, freq: number, t: number, fim: number, destino: AudioNode, detune = 0) {
  const o = ctx!.createOscillator();
  o.type = tipo;
  o.frequency.value = freq;
  o.detune.value = detune;
  o.connect(destino);
  o.start(t);
  o.stop(fim);
  return o;
}

function filtroPassaBaixa(freq: number, q = 0.7): BiquadFilterNode {
  const f = ctx!.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = freq;
  f.Q.value = q;
  return f;
}

function tocarNota(n: Nota, t: number) {
  const c = ctx!;
  const dur = n.dur * SEG_POR_SEMICOLCHEIA;
  const g = c.createGain();
  const f = frequencia(n.midi);
  switch (n.inst) {
    case 'drone': {
      g.connect(filtroPassaBaixa(420)).connect(mestre);
      envelope(g, t, 0.13 * n.vel, 2.5, dur - 1, 3);
      osc('sine', f, t, t + dur + 4, g);
      osc('sawtooth', f, t, t + dur + 4, g, 6);
      const quinta = c.createGain();
      quinta.gain.value = 0.3;
      quinta.connect(g);
      osc('sine', f * 1.5, t, t + dur + 4, quinta, -4);
      break;
    }
    case 'pad': {
      const filtro = filtroPassaBaixa(900 + (n.brilho ?? 0) * 4200, 1.1);
      g.connect(filtro);
      filtro.connect(mestre);
      filtro.connect(reverb);
      envelope(g, t, 0.05 * n.vel, 1.4, dur - 0.6, 2.2);
      osc('sawtooth', f, t, t + dur + 3, g, -9);
      osc('sawtooth', f, t, t + dur + 3, g, 9);
      // Camada de "ar" uma oitava acima, que só aparece quando o filtro abre.
      const ar = c.createGain();
      ar.gain.value = 0.45 * (n.brilho ?? 0);
      ar.connect(g);
      osc('square', f * 2, t, t + dur + 3, ar, 4);
      break;
    }
    case 'baixo': {
      g.connect(filtroPassaBaixa(320)).connect(mestre);
      envelope(g, t, 0.24 * n.vel, 0.08, dur * 0.8, 0.9);
      osc('triangle', f, t, t + dur + 1.2, g);
      osc('sine', f / 2, t, t + dur + 1.2, g);
      break;
    }
    case 'pulso': {
      g.connect(mestre);
      envelope(g, t, 0.5 * n.vel, 0.004, 0.03, 0.32);
      const o = osc('sine', 62, t, t + 0.45, g);
      o.frequency.setValueAtTime(62, t);
      o.frequency.exponentialRampToValueAtTime(38, t + 0.3);
      break;
    }
    case 'sino': {
      g.connect(mestre);
      g.connect(eco);
      g.connect(reverb);
      envelope(g, t, 0.09 * n.vel, 0.005, 0.02, 2.6);
      osc('sine', f, t, t + 3, g);
      const parcial = c.createGain();
      parcial.gain.value = 0.35;
      parcial.connect(g);
      osc('sine', f * 2.76, t, t + 3, parcial);
      break;
    }
    case 'tremolo': {
      const filtro = filtroPassaBaixa(1800 + (n.brilho ?? 0) * 4500, 1.5);
      g.connect(filtro);
      filtro.connect(mestre);
      filtro.connect(reverb);
      envelope(g, t, 0.05 * n.vel, 0.01, dur * 0.5, dur * 0.6);
      osc('sawtooth', f, t, t + dur + 0.3, g, (n.t % 2) * 7 - 3);
      break;
    }
    case 'estrondo': {
      g.connect(mestre);
      g.connect(reverb);
      envelope(g, t, 0.6 * n.vel, 0.005, 0.05, 1.6);
      const o = osc('sine', 58, t, t + 1.8, g);
      o.frequency.setValueAtTime(58, t);
      o.frequency.exponentialRampToValueAtTime(28, t + 1.4);
      const fonte = c.createBufferSource();
      fonte.buffer = ruido;
      const gr = c.createGain();
      fonte.connect(filtroPassaBaixa(500)).connect(gr).connect(g);
      envelope(gr, t, 0.5, 0.002, 0.02, 0.5);
      fonte.start(t);
      fonte.stop(t + 0.7);
      break;
    }
    case 'sopro': {
      const fonte = c.createBufferSource();
      fonte.buffer = ruido;
      fonte.loop = true;
      const bp = c.createBiquadFilter();
      bp.type = 'bandpass';
      bp.Q.value = 1.4;
      bp.frequency.setValueAtTime(250, t);
      bp.frequency.exponentialRampToValueAtTime(3200, t + dur);
      fonte.connect(bp).connect(g);
      g.connect(mestre);
      g.connect(reverb);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.05 * n.vel + 0.0001, t + dur * 0.9);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.4);
      fonte.start(t);
      fonte.stop(t + dur + 0.5);
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

function rampa(g: AudioParam, alvo: number, seg: number) {
  const agora = ctx!.currentTime;
  g.cancelScheduledValues(agora);
  g.setValueAtTime(g.value, agora);
  g.linearRampToValueAtTime(alvo, agora + seg);
}

function prepararFaixa() {
  if (faixa || !(ctx instanceof AudioContext)) return;
  faixa = new Audio(new URL(URL_FAIXA, document.baseURI).href);
  faixa.loop = true;
  faixa.preload = 'auto';
  ganhoFaixa = ctx.createGain();
  ganhoFaixa.gain.value = 0;
  ctx.createMediaElementSource(faixa).connect(ganhoFaixa).connect(ctx.destination);
}

export function musicaTocando(): boolean {
  return tocando;
}

export function trilhaAtual(): Trilha {
  return trilha;
}

function pararGerada() {
  window.clearInterval(timer);
  timer = 0;
  rampa(mestre.gain, 0, 0.8);
}

function pararFaixa() {
  if (!ganhoFaixa || !faixa) return;
  rampa(ganhoFaixa.gain, 0, 0.8);
  const f = faixa;
  window.setTimeout(() => { if (!(tocando && trilha === 'faixa')) f.pause(); }, 900);
}

/** Liga a trilha escolhida (e silencia a outra). Precisa ser chamado a partir de um gesto do usuário. */
export function ligarMusica(): void {
  if (tocando) return;
  try {
    ctx ??= montar();
  } catch {
    return; // navegador sem Web Audio: o jogo segue em silêncio
  }
  tocando = true;
  void (ctx as AudioContext).resume();
  if (trilha === 'faixa') {
    pararGerada();
    prepararFaixa();
    rampa(ganhoFaixa!.gain, VOLUME_FAIXA, 1.5);
    void faixa!.play().catch(() => undefined);
    return;
  }
  pararFaixa();
  rampa(mestre.gain, VOLUME_GERADA, 2.5);
  if (inicioProximo < ctx.currentTime) inicioProximo = ctx.currentTime + 0.1;
  agendar();
  if (!timer) timer = window.setInterval(agendar, 100);
}

export function desligarMusica(): void {
  if (!tocando || !ctx) return;
  tocando = false;
  pararGerada();
  pararFaixa();
  const c = ctx as AudioContext;
  window.setTimeout(() => { if (!tocando) void c.suspend(); }, 900);
}

/** Troca a trilha; se estiver tocando, faz a passagem de uma para a outra com fade. */
export function definirTrilha(nova: Trilha): void {
  if (nova === trilha) return;
  trilha = nova;
  if (tocando) {
    tocando = false;
    ligarMusica();
  }
}

// Aba escondida: pausa o áudio para economizar bateria; ao voltar, continua de onde parou.
document.addEventListener('visibilitychange', () => {
  if (!ctx || !tocando) return;
  if (!(ctx instanceof AudioContext)) return;
  if (document.hidden) {
    void ctx.suspend();
    faixa?.pause();
  } else {
    void ctx.resume();
    if (trilha === 'faixa') void faixa?.play().catch(() => undefined);
  }
});

/**
 * Renderiza um trecho da trilha gerada fora do tempo real (para conferência e análise).
 * Não interfere no tocador: usa um contexto offline próprio.
 */
export async function renderizarTrecho(compassoInicial: number, quantos: number, taxa = 22050): Promise<AudioBuffer> {
  const salvo = { ctx, mestre, eco, reverb, ruido };
  const off = new OfflineAudioContext(1, Math.ceil((quantos * SEG_POR_COMPASSO + 4) * taxa), taxa);
  ctx = off;
  try {
    montar(off);
    mestre.gain.value = VOLUME_GERADA;
    for (let k = 0; k < quantos; k++) {
      for (const n of compasso(compassoInicial + k)) tocarNota(n, k * SEG_POR_COMPASSO + n.t * SEG_POR_SEMICOLCHEIA);
    }
  } finally {
    ({ ctx, mestre, eco, reverb, ruido } = salvo);
  }
  return off.startRendering();
}
