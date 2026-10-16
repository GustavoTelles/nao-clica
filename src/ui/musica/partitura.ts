// Partitura generativa da trilha "Terminal Noturno". Pura (sem Web Audio): dado o número do compasso,
// devolve as notas a tocar. Um ciclo tem ~20 minutos (28 seções de 16 compassos a 92 BPM) e, ao
// terminar, recomeça com outra semente — a música varia a cada volta e nunca tem fim.
import { inteiro, proximo } from '../../engine/rng';

export type Instrumento = 'pad' | 'baixo' | 'arpejo' | 'melodia' | 'bumbo' | 'chimbal' | 'caixa';

export interface Nota {
  inst: Instrumento;
  /** Início em semicolcheias (0–15) dentro do compasso. */
  t: number;
  /** Duração em semicolcheias. */
  dur: number;
  /** Altura MIDI (ignorada na percussão). */
  midi: number;
  /** Intensidade 0–1. */
  vel: number;
}

export const BPM = 92;
export const COMPASSOS_POR_SECAO = 16;
/** Curva de intensidade das 28 seções: intro, subida, respiro, clímax, ponte, segundo clímax e volta ao início. */
export const INTENSIDADE = [1, 1, 2, 2, 3, 3, 4, 4, 3, 2, 2, 3, 4, 5, 5, 4, 3, 2, 1, 2, 3, 4, 4, 5, 5, 4, 2, 1];
export const SECOES = INTENSIDADE.length;
export const COMPASSOS_POR_CICLO = SECOES * COMPASSOS_POR_SECAO;
export const SEG_POR_SEMICOLCHEIA = 60 / BPM / 4;
export const SEG_POR_COMPASSO = SEG_POR_SEMICOLCHEIA * 16;
export const DURACAO_CICLO_SEG = COMPASSOS_POR_CICLO * SEG_POR_COMPASSO;

/** Tônicas (MIDI) das seções: modulações suaves, sempre em menor natural. */
const TONICAS = [57, 57, 57, 53, 53, 50, 50, 55, 55, 52, 57, 57, 53, 53, 50, 55, 52, 52, 57, 57, 53, 50, 50, 55, 55, 52, 57, 57];
const ESCALA = [0, 2, 3, 5, 7, 8, 10];
const PROGRESSOES = [
  [0, 5, 2, 6], // i – VI – III – VII
  [0, 3, 5, 4], // i – iv – VI – v
  [5, 3, 0, 4], // VI – iv – i – v
  [0, 6, 5, 6], // i – VII – VI – VII
  [3, 0, 5, 6], // iv – i – VI – VII
];
const RITMOS_BAIXO = [[0, 8], [0, 6, 8, 14], [0, 3, 8, 11], [0, 10]];
const RITMOS_MELODIA = [[0, 4, 6, 8, 12], [0, 3, 6, 10, 12], [2, 4, 8, 10, 14], [0, 6, 8, 11, 14]];

/** Grau da escala → semitons a partir da tônica (aceita graus fora de 0–6). */
export function grau(g: number): number {
  const oit = Math.floor(g / 7);
  return ESCALA[((g % 7) + 7) % 7] + 12 * oit;
}

function triade(tonica: number, g: number): number[] {
  return [tonica + grau(g), tonica + grau(g + 2), tonica + grau(g + 4)];
}

export interface Secao {
  ciclo: number;
  indice: number;
  intensidade: number;
  tonica: number;
  progressao: number[];
  ritmoBaixo: number[];
  ritmoMelodia: number[];
  /** Frase de 4 compassos em graus da escala (para a melodia). */
  frase: number[][];
  semente: number;
}

const cache = new Map<string, Secao>();

export function secao(ciclo: number, indice: number): Secao {
  const chave = `${ciclo}:${indice}`;
  const salva = cache.get(chave);
  if (salva) return salva;
  let s = (ciclo * 7919 + indice * 104729 + 17) | 0;
  const escolher = <T>(lista: T[]): T => { const [i, n] = inteiro(s, lista.length); s = n; return lista[i]; };
  const progressao = escolher(PROGRESSOES);
  const ritmoBaixo = escolher(RITMOS_BAIXO);
  const ritmoMelodia = escolher(RITMOS_MELODIA);
  // Melodia: passeio aleatório pela escala, puxado para notas do acorde.
  const frase: number[][] = [];
  let g = 4;
  for (let c = 0; c < 4; c++) {
    const notas: number[] = [];
    for (let k = 0; k < ritmoMelodia.length; k++) {
      const [passo, n] = inteiro(s, 5); s = n;
      g = Math.max(0, Math.min(11, g + passo - 2));
      notas.push(k === 0 ? progressao[c] + 7 : g);
    }
    frase.push(notas);
  }
  const sec: Secao = {
    ciclo, indice, intensidade: INTENSIDADE[indice], tonica: TONICAS[indice],
    progressao, ritmoBaixo, ritmoMelodia, frase, semente: s,
  };
  if (cache.size > 64) cache.clear();
  cache.set(chave, sec);
  return sec;
}

/** Notas do compasso global `n` (0, 1, 2, … para sempre). */
export function compasso(n: number): Nota[] {
  const ciclo = Math.floor(n / COMPASSOS_POR_CICLO);
  const noCiclo = n % COMPASSOS_POR_CICLO;
  const idx = Math.floor(noCiclo / COMPASSOS_POR_SECAO);
  const c = noCiclo % COMPASSOS_POR_SECAO;
  const sec = secao(ciclo, idx);
  const { intensidade: I, tonica } = sec;
  const g = sec.progressao[c % 4];
  const acorde = triade(tonica, g);
  const notas: Nota[] = [];
  // Entrada suave: na 1ª metade da seção, quem acabou de entrar toca mais baixo.
  const entrada = (nivel: number) => (I === nivel && c < 8 ? 0.55 + c * 0.06 : 1);

  // Pad: sempre presente.
  for (const m of acorde) notas.push({ inst: 'pad', t: 0, dur: 16, midi: m + 12, vel: 0.5 + 0.08 * I });

  if (I >= 2) {
    for (const t of sec.ritmoBaixo) notas.push({ inst: 'baixo', t, dur: 3, midi: tonica + grau(g) - 12, vel: 0.8 * entrada(2) });
  }

  if (I >= 3) {
    const passo = I >= 5 ? 1 : 2;
    const desenho = [0, 1, 2, 1, 0, 2, 1, 2];
    const [r] = proximo(sec.semente + n);
    const subir = r > 0.5 ? 12 : 0;
    for (let t = 0, k = 0; t < 16; t += passo, k++) {
      const m = acorde[desenho[k % desenho.length]] + (k % 8 >= 4 ? subir : 0);
      notas.push({ inst: 'arpejo', t, dur: passo, midi: m, vel: (t % 4 === 0 ? 0.7 : 0.45) * entrada(3) });
    }
  }

  if (I >= 4) {
    const v = entrada(4);
    notas.push({ inst: 'bumbo', t: 0, dur: 1, midi: 0, vel: 0.9 * v }, { inst: 'bumbo', t: 8, dur: 1, midi: 0, vel: 0.8 * v });
    if (c % 4 === 3) notas.push({ inst: 'bumbo', t: 10, dur: 1, midi: 0, vel: 0.6 * v });
    for (let t = 2; t < 16; t += 4) notas.push({ inst: 'chimbal', t, dur: 1, midi: 0, vel: 0.5 * v });
    if (I >= 5) for (let t = 0; t < 16; t += 4) notas.push({ inst: 'chimbal', t, dur: 1, midi: 0, vel: 0.25 });
  }

  if (I >= 5) {
    notas.push({ inst: 'caixa', t: 4, dur: 1, midi: 0, vel: 0.7 }, { inst: 'caixa', t: 12, dur: 1, midi: 0, vel: 0.7 });
    // Melodia em pergunta (compassos 0–7) e resposta variada (8–15).
    const frase = sec.frase[c % 4];
    const varia = c >= 8 ? (c % 2 === 0 ? 2 : -1) : 0;
    sec.ritmoMelodia.forEach((t, k) => {
      const prox = sec.ritmoMelodia[k + 1] ?? 16;
      notas.push({ inst: 'melodia', t, dur: Math.max(1, prox - t), midi: tonica + 12 + grau(frase[k] + (k > 0 ? varia : 0)), vel: 0.6 });
    });
  } else if (I === 4 && c % 8 >= 4) {
    // Prévia da melodia nas seções de intensidade 4.
    const frase = sec.frase[c % 4];
    notas.push({ inst: 'melodia', t: 0, dur: 8, midi: tonica + 12 + grau(frase[0]), vel: 0.35 }, { inst: 'melodia', t: 8, dur: 8, midi: tonica + 12 + grau(frase[2]), vel: 0.3 });
  }
  return notas;
}

export const frequencia = (midi: number) => 440 * 2 ** ((midi - 69) / 12);
