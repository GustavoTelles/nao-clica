import { describe, expect, it } from 'vitest';
import { estadoInicial, reducer, type Ctx } from '../src/engine/reducer';
import { ehContraPerfeito } from '../src/engine/rules';
import type { Acao, Estado } from '../src/engine/types';
import { cfg, conteudo, ctx } from './helpers';

const run = (e: Estado, ...acoes: Acao[]) =>
  acoes.reduce((s, a) => {
    const r = reducer(s, a, ctx);
    if (r.erro) throw new Error(`${a.tipo}: ${r.erro}`);
    return r;
  }, e);

/** A ameaça joga; você responde com um contra perfeito (ganhar) ou com uma carta que perde. */
function jogar(e: Estado, ganhar: boolean): Estado {
  e = run(e, { tipo: 'AMEACA_JOGA' });
  const p = e.partida!;
  const A = p.cartaAmeaca!;
  const d = (id: string) => conteudo.defesas[id];
  const boa = p.mao.find((id) => ehContraPerfeito(A, d(id)));
  const ruim = p.mao.find((id) => !A.tags.some((t) => d(id).contra.includes(t)) && d(id).forca <= A.pressao);
  return run(e, { tipo: 'JOGAR_CARTA', cartaId: (ganhar ? boa : ruim) ?? p.mao[0] }, { tipo: 'CONTINUAR' });
}

/** Escolhe na loja cartas que respeitam o limite de cópias. */
function escolhaValida(e: Estado): string[] {
  const { oferta, precisa } = e.partida!.loja!;
  const mao = [...e.partida!.mao];
  const ids: string[] = [];
  for (const id of oferta) {
    if (ids.length === precisa) break;
    if (mao.filter((x) => x === id).length < cfg.maxCopias) { ids.push(id); mao.push(id); }
  }
  return ids;
}

const comNiveis = (): Estado => {
  const e = estadoInicial(conteudo);
  return { ...e, progresso: { ...e.progresso, desbloqueados: ['N1_GOLPES', 'N2_BANCO'] } };
};
const inicio = (nivelId = 'N1_GOLPES', seed = 1) =>
  run(comNiveis(), { tipo: 'INICIAR_NIVEL', nivelId, seed }, { tipo: 'INICIAR_CENARIO' });

describe('reducer', () => {
  it('2–0 encerra o cenário sem a vaza 3', () => {
    let e = jogar(inicio(), true);
    expect(e.fase).toBe('VEZ_AMEACA');
    e = jogar(e, true);
    expect(e.fase).toBe('RAIOX');
    expect(e.partida!.vazas).toHaveLength(2);
    expect(e.partida!.placar).toEqual({ jogador: 1, ameaca: 0 });
    expect(e.partida!.historico[0].leituraPerfeita).toBe(true);
  });

  it('ameaça vence 2 vazas = você caiu', () => {
    const e = jogar(jogar(inicio(), false), false);
    expect(e.fase).toBe('RAIOX');
    expect(e.partida!.placar.ameaca).toBe(1);
  });

  it('cartas usadas não voltam e a loja repõe a mão até 8', () => {
    let e = jogar(jogar(inicio(), true), true);
    const usadas = [...e.partida!.descarte];
    expect(e.partida!.mao).toHaveLength(6);
    e = run(e, { tipo: 'CONTINUAR' });
    expect(e.fase).toBe('LOJA');
    expect(e.partida!.loja!.oferta).toHaveLength(cfg.ofertaLojaLeituraPerfeita);
    expect(e.partida!.desconfiometro).toBe(cfg.desconfiometroInicial + 1);
    e = run(e, { tipo: 'ESCOLHER_LOJA', ids: escolhaValida(e) });
    expect(e.partida!.mao).toHaveLength(8);
    expect(e.partida!.descarte).toEqual(usadas);
    expect(e.fase).toBe('INTRO_CENARIO');
  });

  it('troca na loja só 1 vez', () => {
    let e = run(jogar(jogar(inicio(), true), true), { tipo: 'CONTINUAR' });
    const entra = e.partida!.loja!.oferta.find((id) => !e.partida!.mao.includes(id))!;
    e = run(e, { tipo: 'TROCAR_NA_LOJA', sai: e.partida!.mao[0], entra });
    expect(e.partida!.mao).toContain(entra);
    expect(reducer(e, { tipo: 'TROCAR_NA_LOJA', sai: e.partida!.mao[0], entra: e.partida!.loja!.oferta[0] }, ctx).erro).toMatch(/troca/);
  });

  it('3 pontos encerram o nível, desbloqueiam o próximo e oferecem proteção', () => {
    let e = run(estadoInicial(conteudo), { tipo: 'INICIAR_NIVEL', nivelId: 'N1_GOLPES', seed: 1 }, { tipo: 'INICIAR_CENARIO' });
    for (let c = 0; c < 3; c++) {
      e = run(jogar(jogar(e, true), true), { tipo: 'CONTINUAR' });
      if (e.fase === 'LOJA') e = run(e, { tipo: 'ESCOLHER_LOJA', ids: escolhaValida(e) }, { tipo: 'INICIAR_CENARIO' });
    }
    expect(e.fase).toBe('FIM_NIVEL');
    expect(e.partida!.resultado).toBe('vitoria');
    expect(e.progresso.desbloqueados).toContain('N2_BANCO');
    e = run(e, { tipo: 'CONTINUAR' });
    expect(e.fase).toBe('RECOMPENSA');
    e = run(e, { tipo: 'ESCOLHER_PROTECAO', id: 'P_LIMITES' });
    expect(e.progresso.protecoes).toEqual(['P_LIMITES']);
    expect(e.fase).toBe('MAPA');
  });

  it('nível bloqueado não inicia; ação fora de hora devolve erro sem lançar', () => {
    expect(reducer(estadoInicial(conteudo), { tipo: 'INICIAR_NIVEL', nivelId: 'N2_BANCO', seed: 1 }, ctx).erro).toMatch(/bloqueado/);
    expect(reducer(inicio(), { tipo: 'CONTINUAR' }, ctx).erro).toBeTruthy();
  });

  it('desconfiômetro revela tags e gasta carga (nível 2)', () => {
    let e = run(inicio('N2_BANCO', 3), { tipo: 'AMEACA_JOGA' });
    expect(e.partida!.tagsReveladas).toBe(false);
    e = run(e, { tipo: 'USAR_DESCONFIOMETRO' });
    expect(e.partida!.tagsReveladas).toBe(true);
    expect(e.partida!.desconfiometro).toBe(cfg.desconfiometroInicial - 1);
  });

  it('mesma seed = mesma partida', () => {
    const jogo = (seed: number) => {
      let e = inicio('N2_BANCO', seed);
      for (let i = 0; i < 3 && e.fase === 'VEZ_AMEACA'; i++) e = jogar(e, i !== 1);
      return e.partida!.vazas.map((v) => `${v.ameacaId}/${v.defesaId}`);
    };
    expect(jogo(5)).toEqual(jogo(5));
  });

  it('P_BACKUP anula o ponto da ameaça em cenário que pede APP_ANEXO', () => {
    let e = comNiveis();
    e = { ...e, progresso: { ...e.progresso, protecoes: ['P_BACKUP'] } };
    e = run(e, { tipo: 'INICIAR_NIVEL', nivelId: 'N2_BANCO', seed: 1 });
    e = run({ ...e, partida: { ...e.partida!, cenarioIdx: 2 } }, { tipo: 'INICIAR_CENARIO' }); // C2_3
    while (e.fase === 'VEZ_AMEACA') e = jogar(e, false);
    expect(e.partida!.placar.ameaca).toBe(0);
    expect(e.partida!.historico.at(-1)!.anulado).toBe('P_BACKUP');
  });
});

describe('pausa', () => {
  it('ABRIR_MAPA pausa e RETOMAR volta à mesma fase', () => {
    let e = run(inicio(), { tipo: 'AMEACA_JOGA' });
    e = run(e, { tipo: 'ABRIR_MAPA' });
    expect(e.fase).toBe('MAPA');
    expect(e.retomar).toBe('VEZ_JOGADOR');
    e = run(e, { tipo: 'RETOMAR' });
    expect(e.fase).toBe('VEZ_JOGADOR');
    expect(e.retomar).toBeUndefined();
  });
});

describe('tentações (respostas erradas do caso)', () => {
  // Cópia do conteúdo com 2 tentações no 1º caso do nível 1.
  const comTentacoes = (): Ctx => {
    const c = structuredClone(conteudo);
    c.niveis[0].cenarios[0].tentacoes = ['ARM_SO_OLHAR', 'ARM_RESPONDO'];
    return { conteudo: c, config: cfg };
  };
  const rodar = (cx: Ctx, e: Estado, ...acoes: Acao[]) => acoes.reduce((s, a) => {
    const r = reducer(s, a, cx);
    if (r.erro) throw new Error(`${a.tipo}: ${r.erro}`);
    return r;
  }, e);

  it('entram na mão no início do caso e saem no fim, se não forem jogadas', () => {
    const cx = comTentacoes();
    let e = rodar(cx, estadoInicial(cx.conteudo), { tipo: 'INICIAR_NIVEL', nivelId: 'N1_GOLPES', seed: 4 }, { tipo: 'INICIAR_CENARIO' });
    expect(e.partida!.mao).toHaveLength(10);
    expect(e.partida!.mao).toEqual(expect.arrayContaining(['ARM_SO_OLHAR', 'ARM_RESPONDO']));
    expect(e.partida!.tentacoes).toEqual(['ARM_SO_OLHAR', 'ARM_RESPONDO']);
    for (let i = 0; i < 2; i++) {
      e = rodar(cx, e, { tipo: 'AMEACA_JOGA' });
      const boa = e.partida!.mao.find((id) => ehContraPerfeito(e.partida!.cartaAmeaca!, cx.conteudo.defesas[id]))!;
      e = rodar(cx, e, { tipo: 'JOGAR_CARTA', cartaId: boa }, { tipo: 'CONTINUAR' });
    }
    expect(e.fase).toBe('RAIOX');
    expect(e.partida!.mao).toHaveLength(6);
    expect(e.partida!.mao.some((id) => cx.conteudo.defesas[id].armadilha)).toBe(false);
    expect(e.partida!.tentacoes).toEqual([]);
  });

  it('tentação jogada sempre perde, vai ao descarte e conta nas estatísticas', () => {
    const cx = comTentacoes();
    let e = rodar(cx, estadoInicial(cx.conteudo), { tipo: 'INICIAR_NIVEL', nivelId: 'N1_GOLPES', seed: 4 }, { tipo: 'INICIAR_CENARIO' }, { tipo: 'AMEACA_JOGA' });
    e = rodar(cx, e, { tipo: 'JOGAR_CARTA', cartaId: 'ARM_SO_OLHAR' });
    const r = e.partida!.vazas[0];
    expect(r).toMatchObject({ vencedor: 'ameaca', motivo: 'armadilha' });
    expect(e.partida!.tentacoes).toEqual(['ARM_RESPONDO']);
    expect(e.partida!.stats.armadilhas).toBe(1);
    expect(e.partida!.descarte).toContain('ARM_SO_OLHAR');
  });

  it('posições sorteadas são determinísticas pela semente', () => {
    const cx = comTentacoes();
    const mao = (seed: number) => rodar(cx, estadoInicial(cx.conteudo), { tipo: 'INICIAR_NIVEL', nivelId: 'N1_GOLPES', seed }, { tipo: 'INICIAR_CENARIO' }).partida!.mao;
    expect(mao(9)).toEqual(mao(9));
  });
});
