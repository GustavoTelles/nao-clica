import { describe, expect, it } from 'vitest';
import { resolverVaza } from '../src/engine/rules';
import type { Protecao } from '../src/engine/types';
import { ameaca, cfg, defesa } from './helpers';

const sem = { protecoes: [] as Protecao[], config: cfg };
const prot = (efeito: Protecao['efeito'], id = 'P'): Protecao => ({ id, nome: '', descricao: '', fonte: '', efeito });

describe('resolverVaza (GDD §4.5)', () => {
  it.each([
    ['armadilha', ameaca(['LINK'], 1), defesa(['LINK'], 3, { armadilha: true }), 'ameaca', 'armadilha'],
    ['contra perfeito vence pressão alta', ameaca(['SENHA'], 5), defesa(['SENHA'], 1), 'defesa', 'contra_perfeito'],
    ['contra parcial soma +2', ameaca(['MEDO', 'PIX'], 4), defesa(['MEDO'], 3), 'defesa', 'contra_parcial'],
    ['contra parcial não vence pressão 5', ameaca(['MEDO', 'PIX'], 5), defesa(['MEDO'], 3), 'ameaca', 'contra_parcial'],
    ['força maior vence sem contra', ameaca(['LINK'], 2), defesa(['PIX'], 3), 'defesa', 'forca'],
    ['empate favorece a ameaça', ameaca(['LINK'], 2), defesa(['PIX'], 2), 'ameaca', 'forca'],
    ['força 3 não vence pressão 3 sem contra', ameaca(['LINK'], 3), defesa(['PIX'], 3), 'ameaca', 'forca'],
  ] as const)('%s', (_, A, D, vencedor, motivo) => {
    const r = resolverVaza(A, D, sem);
    expect(r.vencedor).toBe(vencedor);
    expect(r.motivo).toBe(motivo);
  });

  it('proteção de pressão reduz, com mínimo 1', () => {
    const p = prot({ tipo: 'pressao', tags: ['PIX'], delta: -1 });
    expect(resolverVaza(ameaca(['PIX'], 3), defesa(['LINK'], 3), { protecoes: [p], config: cfg }).vencedor).toBe('defesa');
    expect(resolverVaza(ameaca(['PIX'], 1), defesa(['LINK'], 1), { protecoes: [p, p], config: cfg }).pressao).toBe(1);
  });

  it('proteção de força soma quando a defesa anula a tag', () => {
    const p = prot({ tipo: 'forca', contraTags: ['LINK'], delta: 1 });
    const r = resolverVaza(ameaca(['URGENCIA'], 3), defesa(['LINK'], 3), { protecoes: [p], config: cfg });
    expect(r.forca).toBe(4);
    expect(r.vencedor).toBe('defesa');
  });

  it('proteção reativa (2FA) converte derrota só com uso disponível', () => {
    const p = prot({ tipo: 'converterDerrotaVaza', tags: ['SENHA'], usosPorNivel: 1 }, 'P_2FA');
    const A = ameaca(['SENHA'], 3);
    const D = defesa(['LINK'], 1);
    expect(resolverVaza(A, D, { protecoes: [p], config: cfg, usosRestantes: { P_2FA: 1 } }))
      .toMatchObject({ vencedor: 'defesa', motivo: 'protecao', protecaoUsada: 'P_2FA' });
    expect(resolverVaza(A, D, { protecoes: [p], config: cfg, usosRestantes: { P_2FA: 0 } }).vencedor).toBe('ameaca');
  });
});
