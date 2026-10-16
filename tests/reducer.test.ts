import { describe, expect, it } from 'vitest';
import { estadoInicial, medidasDoNivel, reducer, type Ctx } from '../src/engine/reducer';
import { ehContraPerfeito } from '../src/engine/rules';
import type { Acao, Estado } from '../src/engine/types';
import { cfg, conteudo, ctx } from './helpers';

const rodar = (cx: Ctx, e: Estado, ...acoes: Acao[]) => acoes.reduce((s, a) => {
  const r = reducer(s, a, cx);
  if (r.erro) throw new Error(`${a.tipo}: ${r.erro}`);
  return r;
}, e);
const run = (e: Estado, ...acoes: Acao[]) => rodar(ctx, e, ...acoes);

/** A ameaça joga; você responde com um contra perfeito (ganhar) ou com uma medida que perde. */
function jogar(e: Estado, ganhar: boolean, cx: Ctx = ctx): Estado {
  e = rodar(cx, e, { tipo: 'AMEACA_JOGA' });
  const p = e.partida!;
  const A = p.cartaAmeaca!;
  const d = (id: string) => cx.conteudo.defesas[id];
  const boa = p.mao.find((id) => ehContraPerfeito(A, d(id)));
  const ruim = p.mao.find((id) => !d(id).armadilha && !A.tags.some((t) => d(id).contra.includes(t)) && d(id).forca <= A.pressao);
  return rodar(cx, e, { tipo: 'JOGAR_CARTA', cartaId: (ganhar ? boa : ruim) ?? p.mao[0] }, { tipo: 'CONTINUAR' });
}

const comNiveis = (): Estado => {
  const e = estadoInicial(conteudo);
  return { ...e, progresso: { ...e.progresso, desbloqueados: conteudo.niveis.map((n) => n.id) } };
};
const inicio = (nivelId = 'N1_GOLPES', seed = 1) =>
  run(comNiveis(), { tipo: 'INICIAR_NIVEL', nivelId, seed }, { tipo: 'INICIAR_CENARIO' });
const n1 = conteudo.niveis[0];

describe('reducer', () => {
  it('a mão do caso tem todas as medidas do nível + as tentações do caso', () => {
    const e = inicio();
    const medidas = medidasDoNivel(n1, conteudo);
    const tent = n1.cenarios[0].tentacoes ?? [];
    expect(e.partida!.mao).toHaveLength(medidas.length + tent.length);
    expect(e.partida!.mao).toEqual(expect.arrayContaining([...medidas, ...tent]));
  });

  it('as medidas não se gastam ao serem jogadas', () => {
    const antes = inicio().partida!.mao;
    const e = run(inicio(), { tipo: 'AMEACA_JOGA' }, { tipo: 'JOGAR_CARTA', cartaId: 'PAUSA' });
    expect(e.partida!.mao).toEqual(antes);
    expect(e.partida!.jogadas).toEqual(['PAUSA']);
  });

  it('medida de uso único sai da mão depois de usada e não volta no caso seguinte', () => {
    let e = run(comNiveis(), { tipo: 'INICIAR_NIVEL', nivelId: 'N3_COMERCIO', seed: 1 }, { tipo: 'INICIAR_CENARIO' }, { tipo: 'AMEACA_JOGA' });
    expect(e.partida!.mao).toContain('BLOQUEAR_DENUNCIAR');
    e = run(e, { tipo: 'JOGAR_CARTA', cartaId: 'BLOQUEAR_DENUNCIAR' }, { tipo: 'CONTINUAR' });
    expect(e.partida!.mao).not.toContain('BLOQUEAR_DENUNCIAR');
    while (e.fase !== 'INTRO_CENARIO' && e.fase !== 'FIM_NIVEL') e = e.fase === 'VEZ_AMEACA' ? jogar(e, true) : run(e, { tipo: 'CONTINUAR' });
    e = run(e, { tipo: 'INICIAR_CENARIO' });
    expect(e.partida!.mao).not.toContain('BLOQUEAR_DENUNCIAR');
  });

  it('2–0 encerra o cenário sem a vaza 3, e depois do Raio-X vem direto o próximo caso (sem loja)', () => {
    let e = jogar(inicio(), true);
    expect(e.fase).toBe('VEZ_AMEACA');
    e = jogar(e, true);
    expect(e.fase).toBe('RAIOX');
    expect(e.partida!.vazas).toHaveLength(2);
    expect(e.partida!.placar).toEqual({ jogador: 1, ameaca: 0 });
    expect(e.partida!.historico[0].leituraPerfeita).toBe(true);
    expect(e.partida!.desconfiometro).toBe(cfg.desconfiometroInicial + 1);
    e = run(e, { tipo: 'CONTINUAR' });
    expect(e.fase).toBe('INTRO_CENARIO');
    expect(e.partida!.cenarioIdx).toBe(1);
  });

  it('as tentações trocam a cada caso: as do caso anterior saem, as do novo entram', () => {
    let e = jogar(jogar(inicio(), true), true);
    e = run(e, { tipo: 'CONTINUAR' }, { tipo: 'INICIAR_CENARIO' });
    const t0 = n1.cenarios[0].tentacoes ?? [];
    const t1 = n1.cenarios[1].tentacoes ?? [];
    for (const id of t1) expect(e.partida!.mao).toContain(id);
    for (const id of t0.filter((x) => !t1.includes(x))) expect(e.partida!.mao).not.toContain(id);
  });

  it('ameaça vence 2 vazas = você caiu', () => {
    const e = jogar(jogar(inicio(), false), false);
    expect(e.fase).toBe('RAIOX');
    expect(e.partida!.placar.ameaca).toBe(1);
  });

  it('3 pontos encerram o nível, desbloqueiam o próximo e oferecem proteção', () => {
    let e = run(estadoInicial(conteudo), { tipo: 'INICIAR_NIVEL', nivelId: 'N1_GOLPES', seed: 1 }, { tipo: 'INICIAR_CENARIO' });
    for (let c = 0; c < 3; c++) {
      e = run(jogar(jogar(e, true), true), { tipo: 'CONTINUAR' });
      if (e.fase === 'INTRO_CENARIO') e = run(e, { tipo: 'INICIAR_CENARIO' });
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
      return { mao: e.partida!.mao.join(','), vazas: e.partida!.vazas.map((v) => `${v.ameacaId}/${v.defesaId}`) };
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
  it('tentação jogada sempre perde e conta nas estatísticas', () => {
    const c = structuredClone(conteudo);
    c.niveis[0].cenarios[0].tentacoes = ['ARM_SO_OLHAR', 'ARM_RESPONDO'];
    const cx: Ctx = { conteudo: c, config: cfg };
    let e = rodar(cx, estadoInicial(c), { tipo: 'INICIAR_NIVEL', nivelId: 'N1_GOLPES', seed: 4 }, { tipo: 'INICIAR_CENARIO' }, { tipo: 'AMEACA_JOGA' });
    expect(e.partida!.mao).toEqual(expect.arrayContaining(['ARM_SO_OLHAR', 'ARM_RESPONDO']));
    e = rodar(cx, e, { tipo: 'JOGAR_CARTA', cartaId: 'ARM_SO_OLHAR' });
    expect(e.partida!.vazas[0]).toMatchObject({ vencedor: 'ameaca', motivo: 'armadilha' });
    expect(e.partida!.stats.armadilhas).toBe(1);
  });

  it('posições sorteadas são determinísticas pela semente', () => {
    const mao = (seed: number) => run(comNiveis(), { tipo: 'INICIAR_NIVEL', nivelId: 'N1_GOLPES', seed }, { tipo: 'INICIAR_CENARIO' }).partida!.mao;
    expect(mao(9)).toEqual(mao(9));
  });
});
