// RNG semeado (mulberry32). Puro: o estado é um inteiro de 32 bits guardado na partida.

export function proximo(estado: number): [valor: number, novoEstado: number] {
  const s = (estado + 0x6d2b79f5) | 0;
  let t = s;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const valor = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return [valor, s];
}

/** Inteiro em [0, max). */
export function inteiro(estado: number, max: number): [number, number] {
  const [v, s] = proximo(estado);
  return [Math.floor(v * max), s];
}

/** Índice sorteado proporcionalmente aos pesos (pesos ≤ 0 nunca saem). */
export function sortearPeso(estado: number, pesos: number[]): [number, number] {
  const total = pesos.reduce((a, p) => a + Math.max(0, p), 0);
  const [v, s] = proximo(estado);
  if (total <= 0) return [-1, s];
  let alvo = v * total;
  for (let i = 0; i < pesos.length; i++) {
    const p = Math.max(0, pesos[i]);
    if (alvo < p) return [i, s];
    alvo -= p;
  }
  return [pesos.length - 1, s];
}

export function semente(n: number): number {
  return n | 0;
}
