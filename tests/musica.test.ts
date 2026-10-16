import { describe, expect, it } from 'vitest';
import { compasso, COMPASSOS_POR_CICLO, DURACAO_CICLO_SEG, INTENSIDADE } from '../src/ui/musica/partitura';

describe('partitura da trilha', () => {
  it('um ciclo dura cerca de 20 minutos', () => {
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
        expect(Number.isFinite(x.midi)).toBe(true);
        if (x.inst !== 'bumbo' && x.inst !== 'chimbal' && x.inst !== 'caixa') {
          expect(x.midi).toBeGreaterThanOrEqual(28);
          expect(x.midi).toBeLessThanOrEqual(96);
        }
      }
    }
    expect(compasso(1234)).toEqual(compasso(1234));
  });

  it('a intensidade controla as camadas (intro só com pad, clímax com bateria e melodia)', () => {
    const insts = (n: number) => new Set(compasso(n).map((x) => x.inst));
    expect([...insts(0)]).toEqual(['pad']);
    const climax = INTENSIDADE.indexOf(5) * 16 + 9;
    expect(insts(climax)).toEqual(new Set(['pad', 'baixo', 'arpejo', 'bumbo', 'chimbal', 'caixa', 'melodia']));
  });

  it('não tem fim: continua depois do ciclo e varia na volta seguinte', () => {
    const climax = INTENSIDADE.indexOf(5) * 16 + 9;
    expect(compasso(COMPASSOS_POR_CICLO * 50 + 3).length).toBeGreaterThan(0);
    const mel = (n: number) => compasso(n).filter((x) => x.inst === 'melodia').map((x) => x.midi);
    const voltas = new Set([0, 1, 2, 3].map((c) => mel(c * COMPASSOS_POR_CICLO + climax).join(',')));
    expect(voltas.size).toBeGreaterThan(1);
  });
});
