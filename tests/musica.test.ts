import { describe, expect, it } from 'vitest';
import { BPM, compasso, COMPASSOS_POR_CICLO, COMPASSOS_POR_SECAO, DURACAO_CICLO_SEG, INTENSIDADE } from '../src/ui/musica/partitura';

const PERCUSSAO = new Set(['pulso', 'estrondo', 'sopro']);
const climax = INTENSIDADE.indexOf(5) * COMPASSOS_POR_SECAO + 8;

describe('partitura "No Breu"', () => {
  it('um ciclo dura cerca de 20 minutos, no andamento da faixa de referência', () => {
    expect(BPM).toBe(68);
    expect(DURACAO_CICLO_SEG / 60).toBeGreaterThan(18);
    expect(DURACAO_CICLO_SEG / 60).toBeLessThan(22);
  });

  it('é determinística e todo compasso tem notas válidas', () => {
    for (let n = 0; n < COMPASSOS_POR_CICLO; n++) {
      const notas = compasso(n);
      expect(notas.some((x) => x.inst === 'pad')).toBe(true);
      for (const x of notas) {
        expect(x.t).toBeGreaterThanOrEqual(0);
        expect(x.t).toBeLessThan(16);
        expect(x.dur).toBeGreaterThan(0);
        expect(x.vel).toBeGreaterThan(0);
        expect(x.vel).toBeLessThanOrEqual(1);
        if (!PERCUSSAO.has(x.inst)) {
          expect(x.midi).toBeGreaterThanOrEqual(24);
          expect(x.midi).toBeLessThanOrEqual(96);
        }
      }
    }
    expect(compasso(1234)).toEqual(compasso(1234));
  });

  it('todas as notas ficam em Ré frígio dominante (Ré, Mi♭, Fá, Fá#, Sol, Lá, Si♭, Dó) — exceto o V (Lá maior) da cadência final', () => {
    const permitidas = new Set([2, 3, 5, 6, 7, 9, 10, 0]); // classes de altura
    const fora = new Set<number>();
    for (let n = 0; n < COMPASSOS_POR_CICLO - COMPASSOS_POR_SECAO; n++) {
      for (const x of compasso(n)) if (!PERCUSSAO.has(x.inst) && !permitidas.has(x.midi % 12)) fora.add(x.midi % 12);
    }
    // Sib maior e Sol menor trazem Ré/Fá/Sib; Mi♭ maior traz Sol/Si♭; o único "estranho" admitido é o Lá (dominante) no fim.
    expect([...fora]).toEqual([]);
  });

  it('a intensidade controla as camadas: começo só no escuro, clímax completo', () => {
    const insts = (n: number) => new Set(compasso(n).map((x) => x.inst));
    expect(insts(0)).toEqual(new Set(['drone', 'pad']));
    for (const i of ['drone', 'pad', 'baixo', 'pulso', 'sino', 'tremolo']) expect(insts(climax).has(i as never)).toBe(true);
  });

  it('o brilho abre nos clímax, como na faixa de referência', () => {
    const brilho = (n: number) => compasso(n).find((x) => x.inst === 'pad')!.brilho!;
    expect(brilho(climax)).toBeGreaterThan(brilho(0) + 0.5);
  });

  it('não tem fim: continua depois do ciclo e varia na volta seguinte', () => {
    expect(compasso(COMPASSOS_POR_CICLO * 50 + 3).length).toBeGreaterThan(0);
    const sinos = (n: number) => compasso(n).filter((x) => x.inst === 'sino').map((x) => x.midi).join(',');
    const voltas = new Set([0, 1, 2, 3, 4, 5].map((c) => sinos(c * COMPASSOS_POR_CICLO + INTENSIDADE.indexOf(3) * COMPASSOS_POR_SECAO + 8)));
    expect(voltas.size).toBeGreaterThan(1);
  });
});
