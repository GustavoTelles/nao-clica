import { describe, expect, it } from 'vitest';
import { inteiro, proximo, sortearPeso } from '../src/engine/rng';

describe('rng', () => {
  it('é determinístico pela semente', () => {
    const seq = (s: number) => {
      const r: number[] = [];
      for (let i = 0; i < 5; i++) { const [v, n] = proximo(s); r.push(v); s = n; }
      return r;
    };
    expect(seq(42)).toEqual(seq(42));
    expect(seq(42)).not.toEqual(seq(43));
  });
  it('gera inteiros no intervalo', () => {
    let s = 7;
    for (let i = 0; i < 1000; i++) {
      const [v, n] = inteiro(s, 3); s = n;
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(3);
    }
  });
  it('peso zero nunca sai', () => {
    let s = 1;
    for (let i = 0; i < 500; i++) { const [k, n] = sortearPeso(s, [0, 5, 0]); s = n; expect(k).toBe(1); }
  });
});
