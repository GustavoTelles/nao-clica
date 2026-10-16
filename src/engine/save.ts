// Serialização do progresso (GDD §12.5). Puro: quem lê/escreve no localStorage é a UI.
import type { Estado, Progresso } from './types';

export const CHAVE_SAVE = 'naoclica.save.v1';
/** v2 (16/10/2026): sem loja; partidas salvas na v1 são descartadas, o progresso é mantido. */
export const VERSAO_SAVE = 2;

/** `trilha`: "gerada" (No Breu, sintetizada, sem fim) ou "faixa" (A ameaça no breu, original, em loop). */
export interface Ajustes { animacoesReduzidas: boolean; som: boolean; texto: 'normal' | 'grande'; trilha: 'gerada' | 'faixa' }
/** `som` liga a trilha sonora; ela só começa depois do primeiro clique ou tecla (regra dos navegadores). */
export const AJUSTES_PADRAO: Ajustes = { animacoesReduzidas: false, som: true, texto: 'normal', trilha: 'faixa' };

export interface Save { versao: number; estado: Estado; ajustes: Ajustes }

const ehObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);
const ehListaTexto = (x: unknown): x is string[] => Array.isArray(x) && x.every((i) => typeof i === 'string');

function progressoValido(x: unknown): x is Progresso {
  return ehObj(x) && ehListaTexto(x.desbloqueados) && ehListaTexto(x.protecoes) && ehObj(x.melhorIndice);
}

export function serializarSave(estado: Estado, ajustes: Ajustes): string {
  const limpo: Estado = { ...estado, erro: undefined };
  return JSON.stringify({ versao: VERSAO_SAVE, estado: limpo, ajustes } satisfies Save);
}

/**
 * Lê o save. JSON ausente, corrompido ou de versão desconhecida vira o estado inicial, sem lançar erro.
 * `idsNiveis` filtra referências a níveis que não existem mais.
 */
export function carregarSave(raw: string | null, inicial: Estado, idsNiveis: string[], idsProtecoes: string[]): Save {
  const padrao: Save = { versao: VERSAO_SAVE, estado: inicial, ajustes: { ...AJUSTES_PADRAO } };
  if (!raw) return padrao;
  let dado: unknown;
  try { dado = JSON.parse(raw); } catch { return padrao; }
  if (!ehObj(dado) || (dado.versao !== VERSAO_SAVE && dado.versao !== 1) || !ehObj(dado.estado)) return padrao;
  const migrandoV1 = dado.versao === 1;
  const est = dado.estado;
  if (!progressoValido(est.progresso)) return padrao;

  const progresso: Progresso = {
    desbloqueados: est.progresso.desbloqueados.filter((id) => idsNiveis.includes(id)),
    protecoes: est.progresso.protecoes.filter((id) => idsProtecoes.includes(id)),
    melhorIndice: Object.fromEntries(Object.entries(est.progresso.melhorIndice).filter(([, v]) => typeof v === 'number')),
  };
  if (progresso.desbloqueados.length === 0) progresso.desbloqueados = [...inicial.progresso.desbloqueados];

  // Partida em andamento só é retomada se o nível ainda existir; senão volta ao mapa.
  const partida = !migrandoV1 && ehObj(est.partida) && typeof est.partida.nivelId === 'string' && idsNiveis.includes(est.partida.nivelId)
    ? (est.partida as unknown as Estado['partida'])
    : null;
  const retomar = partida && typeof est.retomar === 'string' ? (est.retomar as Estado['fase']) : undefined;
  const fase = partida && typeof est.fase === 'string' ? (est.fase as Estado['fase']) : est.fase === 'MAPA' ? 'MAPA' : 'MENU';

  const aj = ehObj(dado.ajustes) ? dado.ajustes : {};
  const ajustes: Ajustes = {
    animacoesReduzidas: typeof aj.animacoesReduzidas === 'boolean' ? aj.animacoesReduzidas : AJUSTES_PADRAO.animacoesReduzidas,
    som: typeof aj.som === 'boolean' ? aj.som : AJUSTES_PADRAO.som,
    texto: aj.texto === 'grande' ? 'grande' : 'normal',
    // Na migração da v1, a faixa nova vira a trilha (pedido do responsável em 16/10/2026).
    trilha: migrandoV1 ? 'faixa' : aj.trilha === 'gerada' ? 'gerada' : 'faixa',
  };
  return { versao: VERSAO_SAVE, estado: { fase, progresso, partida, retomar }, ajustes };
}
