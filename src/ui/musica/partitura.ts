// Partitura generativa da trilha "No Breu", inspirada na faixa "A ameaça no breu" (public/audio/).
// Da análise da faixa: Ré frígio dominante (Ré menor com Mi♭ e Fá#), ~68 BPM, textura cinematográfica
// sustentada (sem grade de bateria), baixos Sol–Mi♭–Sib–Fá e Dó–Ré–Sol, e brilho que abre nos clímax.
// Pura (sem Web Audio): dado o número do compasso, devolve as notas. Um ciclo tem ~20 minutos
// (21 seções de 16 compassos a 68 BPM) e recomeça com outra semente — varia a cada volta e nunca tem fim.
import { inteiro, proximo } from '../../engine/rng';

export type Instrumento = 'drone' | 'pad' | 'baixo' | 'pulso' | 'sino' | 'tremolo' | 'estrondo' | 'sopro';

export interface Nota {
  inst: Instrumento;
  /** Início em semicolcheias (0–15) dentro do compasso. */
  t: number;
  /** Duração em semicolcheias. */
  dur: number;
  /** Altura MIDI (ignorada na percussão e no sopro). */
  midi: number;
  /** Intensidade 0–1. */
  vel: number;
  /** Brilho 0–1 (abre o filtro do pad e do tremolo nos clímax). */
  brilho?: number;
}

export const BPM = 68;
export const COMPASSOS_POR_SECAO = 16;
/** Curva de intensidade (1–5): três "arcos" como o da faixa — começo no escuro, subida, clímax, respiro. */
export const INTENSIDADE = [1, 2, 3, 4, 3, 2, 3, 4, 5, 4, 2, 1, 2, 3, 4, 5, 5, 4, 3, 2, 1];
export const SECOES = INTENSIDADE.length;
export const COMPASSOS_POR_CICLO = SECOES * COMPASSOS_POR_SECAO;
export const SEG_POR_SEMICOLCHEIA = 60 / BPM / 4;
export const SEG_POR_COMPASSO = SEG_POR_SEMICOLCHEIA * 16;
export const DURACAO_CICLO_SEG = COMPASSOS_POR_CICLO * SEG_POR_COMPASSO;

/** Tônica fixa em Ré (MIDI 50): na faixa, o Sol aparece como acorde (Sol menor) dentro de Ré, não como mudança de tom. */
const TONICA = 50;

/** Acordes relativos à tônica: [fundamental em semitons, intervalos]. */
type Acorde = [number, number[]];
const m = [0, 3, 7];
const M = [0, 4, 7];
const ACORDES: Record<string, Acorde> = {
  i: [0, m], I: [0, M], bII: [1, M], iv: [5, m], bVI: [8, M], bIII: [3, M], V: [7, M],
  // Dó com Sol e Si♭, sem Mi (foi o que a análise da faixa encontrou): mantém a escala frígia.
  bVII: [10, [0, 7, 10]],
};
/** Progressões de 4 compassos tiradas dos baixos da faixa. */
const PROGRESSOES = [
  ['iv', 'bII', 'iv', 'bII'], // Sol menor – Mi♭ (abertura)
  ['bII', 'bVI', 'bIII', 'bII'], // Mi♭ – Si♭ – Fá – Mi♭
  ['bVII', 'i', 'I', 'iv'], // Dó – Ré m – Ré – Sol m (clímax: Fá e Fá# se alternam, como na faixa)
  ['i', 'bII', 'iv', 'i'], // Ré m – Mi♭ – Sol m – Ré m
  ['i', 'I', 'iv', 'V'], // Ré m – Ré – Sol m – Lá (final)
];
/** Escala frígia dominante (Ré, Mi♭, Fá#, Sol, Lá, Si♭, Dó) para o motivo dos sinos. */
const ESCALA = [0, 1, 4, 5, 7, 8, 10];
/** Motivos de sino: graus da escala e posição (semicolcheia). Desenhos curtos, com o semitom da "ameaça". */
const MOTIVOS: [number, number][][] = [
  [[0, 0], [1, 6], [0, 8]],
  [[4, 0], [5, 4], [4, 8], [2, 12]],
  [[7, 0], [6, 6], [5, 10]],
  [[0, 0], [2, 4], [1, 8], [0, 12]],
];

export function grau(g: number): number {
  const oit = Math.floor(g / 7);
  return ESCALA[((g % 7) + 7) % 7] + 12 * oit;
}

export interface Secao {
  ciclo: number;
  indice: number;
  intensidade: number;
  tonica: number;
  progressao: string[];
  motivo: [number, number][];
  semente: number;
}

const cache = new Map<string, Secao>();

export function secao(ciclo: number, indice: number): Secao {
  const chave = `${ciclo}:${indice}`;
  const salva = cache.get(chave);
  if (salva) return salva;
  let s = (ciclo * 7919 + indice * 104729 + 31) | 0;
  const escolher = <T>(lista: T[]): T => { const [i, n] = inteiro(s, lista.length); s = n; return lista[i]; };
  const I = INTENSIDADE[indice];
  // Clímax prefere a progressão Dó–Ré–Sol; o fim do ciclo prefere a cadência em Lá.
  // Abertura firma o Ré (i–bII–iv–I); clímax usa Dó–Ré–Ré–Sol; o fim do ciclo, a cadência em Lá.
  const progressao = indice === 0 ? PROGRESSOES[3] : indice === SECOES - 1 ? PROGRESSOES[4] : I >= 5 ? PROGRESSOES[2] : escolher(PROGRESSOES.slice(0, 4));
  const sec: Secao = { ciclo, indice, intensidade: I, tonica: TONICA, progressao, motivo: escolher(MOTIVOS), semente: s };
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
  const [raiz, intervalos] = ACORDES[sec.progressao[c % 4]];
  const fund = tonica + raiz;
  const notas: Nota[] = [];
  // Quem acabou de entrar na seção vem crescendo nos primeiros compassos.
  const entrada = (nivel: number) => (I === nivel && c < 6 ? 0.45 + c * 0.09 : 1);
  // Brilho acompanha a intensidade, com uma leve subida dentro da seção (como o centroide da faixa).
  const brilho = Math.min(1, 0.2 + (I - 1) * 0.19 + c * 0.006);

  // Drone: Ré grave contínuo — o "breu".
  if (c % 2 === 0) notas.push({ inst: 'drone', t: 0, dur: 32, midi: tonica - 12, vel: 0.55 + 0.08 * I });

  // Pad: o acorde, sustentado, abrindo o filtro conforme o brilho.
  for (const iv of intervalos) notas.push({ inst: 'pad', t: 0, dur: 16, midi: fund + iv + 12, vel: 0.45 + 0.1 * I, brilho });

  if (I >= 2) {
    // Baixo longo na fundamental e pulso de "batimento" (tum-tum) nos tempos 1 e 3.
    notas.push({ inst: 'baixo', t: 0, dur: 14, midi: fund - 12, vel: 0.7 * entrada(2) });
    const v = 0.55 * entrada(2);
    notas.push({ inst: 'pulso', t: 0, dur: 1, midi: 0, vel: v }, { inst: 'pulso', t: 2, dur: 1, midi: 0, vel: v * 0.6 });
    if (I >= 4) notas.push({ inst: 'pulso', t: 8, dur: 1, midi: 0, vel: v * 0.8 }, { inst: 'pulso', t: 10, dur: 1, midi: 0, vel: v * 0.5 });
  }

  if (I >= 3) {
    // Sinos: o motivo frígio, em pergunta (compassos pares) e resposta uma oitava acima (ímpares, só no auge).
    if (c % 2 === 0 || I >= 5) {
      const oitava = c % 2 === 1 ? 12 : 0;
      for (const [g, t] of sec.motivo) notas.push({ inst: 'sino', t, dur: 4, midi: tonica + 24 + oitava + grau(g), vel: 0.5 * entrada(3) });
    }
  }

  if (I >= 4) {
    // Tremolo de cordas: semicolcheias sobre as notas do acorde, em ondas.
    const [r] = proximo(sec.semente + n);
    const alto = r > 0.5 ? 12 : 0;
    for (let t = 0; t < 16; t++) {
      const iv = intervalos[Math.floor(t / 4) % intervalos.length];
      notas.push({ inst: 'tremolo', t, dur: 1, midi: fund + iv + 12 + alto, vel: (0.35 + 0.25 * Math.sin((t / 16) * Math.PI)) * entrada(4), brilho });
    }
  }

  if (I >= 5 && c % 4 === 0) notas.push({ inst: 'estrondo', t: 0, dur: 1, midi: 0, vel: 0.85 });

  // Sopro de ruído filtrado na virada para a próxima seção.
  if (c === COMPASSOS_POR_SECAO - 1) notas.push({ inst: 'sopro', t: 0, dur: 16, midi: 0, vel: 0.25 + 0.08 * I });
  return notas;
}

export const frequencia = (midi: number) => 440 * 2 ** ((midi - 69) / 12);
