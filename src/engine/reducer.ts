// Máquina de estados do jogo (GDD §12.3). reducer(estado, ação, ctx) → novo estado, sem efeitos colaterais.
import { escolherOpcao } from './ai';
import { resolverVaza } from './rules';
import { candidatasLoja, contarCopias, gerarOferta, validarEscolha } from './shop';
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
        mao: [...nivel.maoInicial], descarte: [], usadosUnicos: [],
        cartaAmeaca: null, tagsReveladas: nivel.regras.tagsVisiveis, desconfiometro: desconf,
        usosProtecao, bonusLeituraPerfeita: false, loja: null, historico: [],
        stats: { vazas: 0, perfeitos: 0, derrotasPorTag: {} }, resultado: null,
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
      return { ...s, fase: 'VEZ_AMEACA', partida: { ...p, vazaIdx: 0, vazas: [], cartaAmeaca: null } };
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
      const i = p.mao.indexOf(acao.cartaId);
      if (i < 0) return erro(s, 'Essa carta não está na mão.');
      const defesa = conteudo.defesas[acao.cartaId];
      const res = resolverVaza(p.cartaAmeaca, defesa, {
        protecoes: protecoesAtivas(s, ctx), config, usosRestantes: p.usosProtecao,
      });
      const mao = [...p.mao];
      mao.splice(i, 1);
      const usosProtecao = { ...p.usosProtecao };
      if (res.protecaoUsada) usosProtecao[res.protecaoUsada] -= 1;
      const derrotasPorTag = { ...p.stats.derrotasPorTag };
      if (res.vencedor === 'ameaca') for (const t of p.cartaAmeaca.tags) derrotasPorTag[t] = (derrotasPorTag[t] ?? 0) + 1;
      return {
        ...s, fase: 'RESOLUCAO',
        partida: {
          ...p, mao, descarte: [...p.descarte, acao.cartaId],
          usadosUnicos: defesa.usoUnicoPorNivel ? [...p.usadosUnicos, defesa.id] : p.usadosUnicos,
          usosProtecao, vazas: [...p.vazas, res],
          stats: {
            vazas: p.stats.vazas + 1,
            perfeitos: p.stats.perfeitos + (res.motivo === 'contra_perfeito' ? 1 : 0),
            derrotasPorTag,
          },
        },
      };
    }

    case 'CONTINUAR':
      return continuar(s, p, nivel, ctx);

    case 'ESCOLHER_LOJA': {
      if (s.fase !== 'LOJA' || !p.loja) return erro(s, 'Fora de hora.');
      const msg = validarEscolha(acao.ids, p.loja.oferta, p.loja.precisa, p.mao, config);
      if (msg) return erro(s, msg);
      return {
        ...s, fase: 'INTRO_CENARIO',
        partida: { ...p, mao: [...p.mao, ...acao.ids], loja: null, cenarioIdx: p.cenarioIdx + 1, vazaIdx: 0, vazas: [], cartaAmeaca: null },
      };
    }

    case 'TROCAR_NA_LOJA': {
      if (s.fase !== 'LOJA' || !p.loja) return erro(s, 'Fora de hora.');
      if (p.loja.trocasRestantes <= 0) return erro(s, 'Você já usou a troca desta loja.');
      const i = p.mao.indexOf(acao.sai);
      if (i < 0 || !p.loja.oferta.includes(acao.entra)) return erro(s, 'Troca inválida.');
      const mao = [...p.mao];
      mao[i] = acao.entra;
      if (contarCopias(mao, acao.entra) > config.maxCopias) return erro(s, `Máximo de ${config.maxCopias} cópias por carta.`);
      const oferta = p.loja.oferta.filter((x) => x !== acao.entra);
      return {
        ...s,
        partida: { ...p, mao, loja: { oferta, precisa: Math.min(p.loja.precisa, oferta.length), trocasRestantes: p.loja.trocasRestantes - 1 } },
      };
    }

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
        bonusLeituraPerfeita: p.bonusLeituraPerfeita || leituraPerfeita,
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

    const tamanho = p.bonusLeituraPerfeita ? config.ofertaLojaLeituraPerfeita : config.ofertaLoja;
    const cand = candidatasLoja(nivel, conteudo.defesas, p.mao, p.usadosUnicos, config);
    const [oferta, rng] = gerarOferta(p.rng, cand, conteudo.defesas, config, tamanho);
    const precisa = Math.min(Math.max(0, config.tamanhoMao - p.mao.length), oferta.length);
    return {
      ...s, fase: 'LOJA',
      partida: { ...p, rng, bonusLeituraPerfeita: false, loja: { oferta, precisa, trocasRestantes: config.trocasPorLoja } },
    };
  }

  if (s.fase === 'FIM_NIVEL') {
    if (p.resultado === 'vitoria' && ofertaRecompensa(s, ctx).length > 0) return { ...s, fase: 'RECOMPENSA' };
    return { ...s, fase: 'MAPA', partida: null };
  }

  return erro(s, 'Fora de hora.');
}
