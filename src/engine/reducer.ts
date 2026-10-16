// Máquina de estados do jogo (GDD §12.3). reducer(estado, ação, ctx) → novo estado, sem efeitos colaterais.
import { escolherOpcao } from './ai';
import { inteiro } from './rng';
import { resolverVaza } from './rules';
import type { Acao, Conteudo, Config, Estado, Nivel, Partida, Protecao, Tag } from './types';

export interface Ctx { conteudo: Conteudo; config: Config }

export function estadoInicial(conteudo: Conteudo): Estado {
  return {
    fase: 'MENU',
    progresso: { desbloqueados: [conteudo.niveis[0].id], protecoes: [], melhorIndice: {} },
    partida: null,
  };
}

export const nivelDe = (ctx: Ctx, id: string): Nivel | undefined => ctx.conteudo.niveis.find((n) => n.id === id);

export function protecoesAtivas(estado: Estado, ctx: Ctx): Protecao[] {
  return estado.progresso.protecoes.map((id) => ctx.conteudo.protecoes[id]).filter(Boolean);
}

export function indiceDesconfianca(p: Partida): number {
  return p.stats.vazas === 0 ? 0 : Math.round((p.stats.perfeitos / p.stats.vazas) * 100);
}

/** Tag em que a pessoa mais caiu no nível (ou null). */
export function tagMaisCaida(p: Partida): Tag | null {
  let melhor: Tag | null = null;
  let max = 0;
  for (const [t, n] of Object.entries(p.stats.derrotasPorTag) as [Tag, number][]) {
    if (n > max) { max = n; melhor = t; }
  }
  return melhor;
}

/** Proteções que podem ser escolhidas ao vencer o nível (exclui as que a pessoa já tem). */
export function ofertaRecompensa(estado: Estado, ctx: Ctx): string[] {
  const nivel = estado.partida && nivelDe(ctx, estado.partida.nivelId);
  if (!nivel) return [];
  return nivel.recompensas.filter((id) => !estado.progresso.protecoes.includes(id));
}

/**
 * Medidas do nível: todas as cartas de defesa do pool (GDD §4.2). Ficam disponíveis o nível inteiro e
 * não se gastam ao serem jogadas — só as de uso único saem depois de usadas.
 */
export function medidasDoNivel(nivel: Nivel, conteudo: Conteudo, usadosUnicos: string[] = []): string[] {
  return nivel.pool.filter((id) => conteudo.defesas[id] && !conteudo.defesas[id].armadilha && !usadosUnicos.includes(id));
}

/** Mão do caso: as medidas do nível + as tentações do caso, em posições sorteadas. */
function montarMao(nivel: Nivel, cenarioIdx: number, p: Partida, ctx: Ctx): [string[], number] {
  const { conteudo, config } = ctx;
  const mao = medidasDoNivel(nivel, conteudo, p.usadosUnicos);
  const tentacoes = (nivel.cenarios[cenarioIdx].tentacoes ?? []).slice(0, config.maxTentacoesPorCenario).filter((id) => conteudo.defesas[id]);
  let rng = p.rng;
  for (const id of tentacoes) {
    const [pos, r] = inteiro(rng, mao.length + 1);
    rng = r;
    mao.splice(pos, 0, id);
  }
  return [mao, rng];
}

const erro = (estado: Estado, msg: string): Estado => ({ ...estado, erro: msg });

export function reducer(estado: Estado, acao: Acao, ctx: Ctx): Estado {
  const s: Estado = { ...estado, erro: undefined };
  const { config, conteudo } = ctx;
  const p = s.partida;

  switch (acao.tipo) {
    case 'ABRIR_MAPA':
    case 'ABRIR_MENU': {
      const fase = acao.tipo === 'ABRIR_MAPA' ? 'MAPA' : 'MENU';
      const pausar = s.partida && s.partida.resultado === null && s.fase !== 'MENU' && s.fase !== 'MAPA';
      return { ...s, fase, retomar: pausar ? s.fase : s.retomar };
    }

    case 'RETOMAR':
      if (!s.partida || !s.retomar) return erro(s, 'Nenhuma partida para retomar.');
      return { ...s, fase: s.retomar, retomar: undefined };

    case 'VOLTAR_MAPA':
      return { ...s, fase: 'MAPA', partida: null, retomar: undefined };

    case 'INICIAR_NIVEL': {
      const nivel = nivelDe(ctx, acao.nivelId);
      if (!nivel) return erro(s, 'Nível inexistente.');
      if (!s.progresso.desbloqueados.includes(nivel.id)) return erro(s, 'Nível bloqueado.');
      const prot = protecoesAtivas(s, ctx);
      const usosProtecao: Record<string, number> = {};
      let desconf = config.desconfiometroInicial;
      for (const pr of prot) {
        if (pr.efeito.tipo === 'converterDerrotaVaza' || pr.efeito.tipo === 'anularPontoCenario') usosProtecao[pr.id] = pr.efeito.usosPorNivel;
        if (pr.efeito.tipo === 'desconfiometro') desconf += pr.efeito.delta;
      }
      const partida: Partida = {
        nivelId: nivel.id, seed: acao.seed, rng: acao.seed | 0,
        cenarioIdx: 0, vazaIdx: 0, placar: { jogador: 0, ameaca: 0 }, vazas: [],
        mao: medidasDoNivel(nivel, conteudo), jogadas: [], usadosUnicos: [],
        cartaAmeaca: null, tagsReveladas: nivel.regras.tagsVisiveis, desconfiometro: desconf,
        usosProtecao, historico: [],
        stats: { vazas: 0, perfeitos: 0, derrotasPorTag: {}, armadilhas: 0 }, resultado: null,
      };
      return { ...s, fase: 'INTRO_CENARIO', partida, retomar: undefined };
    }
  }

  if (!p) return erro(s, 'Nenhuma partida em andamento.');
  const nivel = nivelDe(ctx, p.nivelId)!;
  const cenario = nivel.cenarios[p.cenarioIdx];

  switch (acao.tipo) {
    case 'INICIAR_CENARIO': {
      if (s.fase !== 'INTRO_CENARIO') return erro(s, 'Fora de hora.');
      const [mao, rng] = montarMao(nivel, p.cenarioIdx, p, ctx);
      return { ...s, fase: 'VEZ_AMEACA', partida: { ...p, rng, mao, vazaIdx: 0, vazas: [], cartaAmeaca: null } };
    }

    case 'AMEACA_JOGA': {
      if (s.fase !== 'VEZ_AMEACA') return erro(s, 'Fora de hora.');
      const [carta, rng] = escolherOpcao(nivel.regras.ia, cenario.vazas[p.vazaIdx].opcoes, p.mao, conteudo.defesas, p.rng);
      return {
        ...s, fase: 'VEZ_JOGADOR',
        partida: { ...p, rng, cartaAmeaca: carta, tagsReveladas: nivel.regras.tagsVisiveis },
      };
    }

    case 'USAR_DESCONFIOMETRO': {
      if (s.fase !== 'VEZ_JOGADOR') return erro(s, 'Fora de hora.');
      if (p.tagsReveladas) return erro(s, 'As tags já estão visíveis.');
      if (p.desconfiometro <= 0) return erro(s, 'Sem cargas de Desconfiômetro.');
      return { ...s, partida: { ...p, tagsReveladas: true, desconfiometro: p.desconfiometro - 1 } };
    }

    case 'JOGAR_CARTA': {
      if (s.fase !== 'VEZ_JOGADOR' || !p.cartaAmeaca) return erro(s, 'Fora de hora.');
      if (!p.mao.includes(acao.cartaId)) return erro(s, 'Essa carta não está na mão.');
      const defesa = conteudo.defesas[acao.cartaId];
      const res = resolverVaza(p.cartaAmeaca, defesa, {
        protecoes: protecoesAtivas(s, ctx), config, usosRestantes: p.usosProtecao,
      });
      // As medidas não se gastam; só a de uso único sai da mão depois de usada.
      const mao = defesa.usoUnicoPorNivel ? p.mao.filter((id) => id !== defesa.id) : p.mao;
      const usosProtecao = { ...p.usosProtecao };
      if (res.protecaoUsada) usosProtecao[res.protecaoUsada] -= 1;
      const derrotasPorTag = { ...p.stats.derrotasPorTag };
      if (res.vencedor === 'ameaca') for (const t of p.cartaAmeaca.tags) derrotasPorTag[t] = (derrotasPorTag[t] ?? 0) + 1;
      return {
        ...s, fase: 'RESOLUCAO',
        partida: {
          ...p, mao, jogadas: [...p.jogadas, acao.cartaId],
          usadosUnicos: defesa.usoUnicoPorNivel ? [...p.usadosUnicos, defesa.id] : p.usadosUnicos,
          usosProtecao, vazas: [...p.vazas, res],
          stats: {
            vazas: p.stats.vazas + 1,
            perfeitos: p.stats.perfeitos + (res.motivo === 'contra_perfeito' ? 1 : 0),
            derrotasPorTag,
            armadilhas: (p.stats.armadilhas ?? 0) + (res.motivo === 'armadilha' ? 1 : 0),
          },
        },
      };
    }

    case 'CONTINUAR':
      return continuar(s, p, nivel, ctx);

    case 'ESCOLHER_PROTECAO': {
      if (s.fase !== 'RECOMPENSA') return erro(s, 'Fora de hora.');
      if (!ofertaRecompensa(s, ctx).includes(acao.id)) return erro(s, 'Proteção indisponível.');
      let protecoes = [...s.progresso.protecoes];
      if (protecoes.length >= config.maxProtecoes) {
        if (!acao.substitui || !protecoes.includes(acao.substitui)) return erro(s, 'Escolha qual proteção substituir.');
        protecoes = protecoes.map((x) => (x === acao.substitui ? acao.id : x));
      } else {
        protecoes.push(acao.id);
      }
      return { ...s, fase: 'MAPA', partida: null, progresso: { ...s.progresso, protecoes } };
    }

    default:
      return erro(s, 'Ação desconhecida.');
  }
}

function continuar(s: Estado, p: Partida, nivel: Nivel, ctx: Ctx): Estado {
  const { config, conteudo } = ctx;
  const cenario = nivel.cenarios[p.cenarioIdx];

  if (s.fase === 'RESOLUCAO') {
    const vd = p.vazas.filter((v) => v.vencedor === 'defesa').length;
    const va = p.vazas.filter((v) => v.vencedor === 'ameaca').length;
    if (vd < config.vazasParaVencerCenario && va < config.vazasParaVencerCenario) {
      return { ...s, fase: 'VEZ_AMEACA', partida: { ...p, vazaIdx: p.vazaIdx + 1, cartaAmeaca: null } };
    }
    const vencedor = vd >= config.vazasParaVencerCenario ? 'defesa' : 'ameaca';
    const pontos = 1;
    const placar = { ...p.placar };
    const usosProtecao = { ...p.usosProtecao };
    let anulado: string | undefined;
    if (vencedor === 'ameaca') {
      const pedidos = cenario.vazas[2].opcoes.flatMap((o) => o.tags);
      for (const pr of protecoesAtivas(s, ctx)) {
        if (pr.efeito.tipo === 'anularPontoCenario' && pedidos.includes(pr.efeito.pedido) && (usosProtecao[pr.id] ?? 0) > 0) {
          anulado = pr.id;
          usosProtecao[pr.id] -= 1;
          break;
        }
      }
      if (!anulado) placar.ameaca += pontos;
    } else {
      placar.jogador += pontos;
    }
    const leituraPerfeita = vencedor === 'defesa' && p.vazas.every((v) => v.motivo === 'contra_perfeito');
    return {
      ...s, fase: 'RAIOX',
      partida: {
        ...p, placar, usosProtecao, cartaAmeaca: null,
        desconfiometro: p.desconfiometro + (leituraPerfeita ? 1 : 0),
        historico: [...p.historico, { cenarioId: cenario.id, vencedor, pontos, anulado, leituraPerfeita }],
      },
    };
  }

  if (s.fase === 'RAIOX') {
    const alvo = config.pontosParaVencerNivel;
    const acabou = p.cenarioIdx + 1 >= nivel.cenarios.length;
    let resultado: Partida['resultado'] = null;
    if (p.placar.jogador >= alvo) resultado = 'vitoria';
    else if (p.placar.ameaca >= alvo) resultado = 'derrota';
    else if (acabou) resultado = p.placar.jogador > p.placar.ameaca ? 'vitoria' : 'derrota';

    if (resultado) {
      const partida = { ...p, resultado };
      const indice = indiceDesconfianca(partida);
      const melhorIndice = { ...s.progresso.melhorIndice, [nivel.id]: Math.max(indice, s.progresso.melhorIndice[nivel.id] ?? 0) };
      const desbloqueados = [...s.progresso.desbloqueados];
      const proximo = conteudo.niveis.find((n) => n.ordem === nivel.ordem + 1);
      if (resultado === 'vitoria' && proximo && !desbloqueados.includes(proximo.id)) desbloqueados.push(proximo.id);
      return { ...s, fase: 'FIM_NIVEL', partida, progresso: { ...s.progresso, melhorIndice, desbloqueados } };
    }

    // Sem loja: segue direto para o próximo caso.
    return {
      ...s, fase: 'INTRO_CENARIO',
      partida: { ...p, cenarioIdx: p.cenarioIdx + 1, vazaIdx: 0, vazas: [], cartaAmeaca: null },
    };
  }

  if (s.fase === 'FIM_NIVEL') {
    if (p.resultado === 'vitoria' && ofertaRecompensa(s, ctx).length > 0) return { ...s, fase: 'RECOMPENSA' };
    return { ...s, fase: 'MAPA', partida: null };
  }

  return erro(s, 'Fora de hora.');
}
