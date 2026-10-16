// Tipos do jogo. Espelham o GDD §12.4 (conteúdo) e §12.3 (estado e ações).

export const GATILHOS = ['AUTORIDADE', 'URGENCIA', 'RECOMPENSA', 'MEDO', 'AFETO', 'CURIOSIDADE'] as const;
export const PEDIDOS = ['LINK', 'CODIGO', 'PIX', 'APP_ANEXO', 'SENHA', 'DADOS'] as const;
export const TAGS = [...GATILHOS, ...PEDIDOS] as const;
export const CANAIS = ['SMS', 'MENSAGEM', 'EMAIL', 'LIGACAO', 'REDE_SOCIAL', 'SITE'] as const;

export type Gatilho = (typeof GATILHOS)[number];
export type Pedido = (typeof PEDIDOS)[number];
export type Tag = Gatilho | Pedido;
export type Canal = (typeof CANAIS)[number];
export type Raridade = 'comum' | 'incomum' | 'rara';
export type ModoIA = 'roteiro' | 'aleatoria' | 'adaptativa';

export interface Fonte { id: string; titulo: string; url: string }

export interface CartaDefesa {
  id: string; nome: string; contra: Tag[]; forca: 1 | 2 | 3;
  raridade: Raridade;
  licao: string; fonte: string; verificar?: boolean;
  usoUnicoPorNivel?: boolean; armadilha?: boolean; mito?: string;
  /** Mitigação correspondente na Matriz BR-Fraude (ex.: "M14"). */
  matriz?: string;
}

export interface CartaAmeaca {
  id: string; mensagem: string;
  tags: Tag[];
  pressao: 1 | 2 | 3 | 4 | 5;
  sinais: string[];
}

export type Papel = 'abordagem' | 'escalada' | 'pedido';
export interface Vaza { papel: Papel; opcoes: CartaAmeaca[] }

export interface Cenario {
  id: string; titulo: string; canal: Canal; persona: string; contexto: string;
  vazas: [Vaza, Vaza, Vaza];
  desfechoVitoria: string; desfechoDerrota: string;
  raioX: { oQueEra: string; comoAgir: string[]; verificar?: boolean };
  contencao?: { opcoes: [string, string, string]; correta: 0 | 1 | 2; explicacao: string };
  fonte: string;
  /** Golpes da Matriz BR-Fraude que o cenário representa (ex.: ["BR-GP018"]). */
  matriz?: string[];
  /** Tentações: armadilhas (respostas erradas típicas deste golpe) que entram na mão só durante o caso. */
  tentacoes?: string[];
}

export interface RegrasNivel {
  tagsVisiveis: boolean; pressaoMin: number; pressaoMax: number;
  combos: boolean; ia: ModoIA;
  desmascarar: boolean; armadilhasNaLoja: boolean; rarasNaLoja: boolean;
}

export interface Nivel {
  id: string; ordem: number; titulo: string; fontes: string[];
  regras: RegrasNivel;
  pool: string[]; maoInicial: string[];
  cenarios: Cenario[];
  recompensas: string[];
}

export type EfeitoProtecao =
  | { tipo: 'pressao'; tags: Tag[]; delta: number }
  | { tipo: 'forca'; contraTags: Tag[]; delta: number }
  | { tipo: 'converterDerrotaVaza'; tags: Tag[]; usosPorNivel: number }
  | { tipo: 'anularPontoCenario'; pedido: Pedido; usosPorNivel: number }
  | { tipo: 'desconfiometro'; delta: number }
  | { tipo: 'reservado' };

export interface Protecao {
  id: string; nome: string; descricao: string; fonte: string;
  efeito: EfeitoProtecao;
}

export interface TagInfo { id: Tag; tipo: 'gatilho' | 'pedido'; icone: string; rotulo: string; ideia: string }

export interface Conteudo {
  tags: TagInfo[];
  defesas: Record<string, CartaDefesa>;
  protecoes: Record<string, Protecao>;
  fontes: Record<string, Fonte>;
  niveis: Nivel[];
}

export interface Config {
  tamanhoMao: number; ofertaLoja: number; ofertaLojaLeituraPerfeita: number; trocasPorLoja: number;
  maxCopias: number; pesosRaridade: Record<Raridade, number>;
  vazasParaVencerCenario: number; pontosParaVencerNivel: number; cenariosPorNivel: number;
  bonusContraParcial: number; empateFavorece: 'ameaca' | 'defesa'; pressaoBonusChefe: number;
  desconfiometroInicial: number; maxProtecoes: number;
  desmascarar: { valorCenario: number; iaFogeSePressaoMaxRestante: number };
  maxTentacoesPorCenario: number;
}

// ---------- Resolução ----------

export type Motivo = 'armadilha' | 'contra_perfeito' | 'contra_parcial' | 'forca' | 'protecao';
export type Lado = 'defesa' | 'ameaca';

export interface ResultadoVaza {
  vencedor: Lado;
  motivo: Motivo;
  pressao: number;
  forca: number;
  k: number;
  n: number;
  ameacaId: string;
  defesaId: string;
  protecaoUsada?: string;
}

// ---------- Estado ----------

export type Fase =
  | 'MENU' | 'MAPA' | 'INTRO_CENARIO' | 'VEZ_AMEACA' | 'VEZ_JOGADOR' | 'RESOLUCAO'
  | 'RAIOX' | 'LOJA' | 'FIM_NIVEL' | 'RECOMPENSA';

export interface ResumoCenario {
  cenarioId: string;
  vencedor: Lado;
  pontos: number;
  anulado?: string; // id da proteção que anulou o ponto da ameaça
  leituraPerfeita: boolean;
}

export interface Loja {
  oferta: string[];
  precisa: number;
  trocasRestantes: number;
}

export interface Partida {
  nivelId: string;
  seed: number;
  rng: number;
  cenarioIdx: number;
  vazaIdx: number;
  placar: { jogador: number; ameaca: number };
  vazas: ResultadoVaza[];
  mao: string[];
  descarte: string[];
  usadosUnicos: string[];
  /** Tentações do caso atual ainda na mão (saem no fim do caso). Ausente em saves antigos. */
  tentacoes?: string[];
  cartaAmeaca: CartaAmeaca | null;
  tagsReveladas: boolean;
  desconfiometro: number;
  usosProtecao: Record<string, number>;
  bonusLeituraPerfeita: boolean;
  loja: Loja | null;
  historico: ResumoCenario[];
  stats: { vazas: number; perfeitos: number; derrotasPorTag: Partial<Record<Tag, number>>; armadilhas?: number };
  resultado: 'vitoria' | 'derrota' | null;
}

export interface Progresso {
  desbloqueados: string[];
  protecoes: string[];
  melhorIndice: Record<string, number>;
}

export interface Estado {
  fase: Fase;
  progresso: Progresso;
  partida: Partida | null;
  /** Fase a retomar quando a partida foi pausada (menu ou mapa). */
  retomar?: Fase;
  erro?: string;
}

export type Acao =
  | { tipo: 'ABRIR_MAPA' }
  | { tipo: 'ABRIR_MENU' }
  | { tipo: 'RETOMAR' }
  | { tipo: 'INICIAR_NIVEL'; nivelId: string; seed: number }
  | { tipo: 'INICIAR_CENARIO' }
  | { tipo: 'AMEACA_JOGA' }
  | { tipo: 'USAR_DESCONFIOMETRO' }
  | { tipo: 'JOGAR_CARTA'; cartaId: string }
  | { tipo: 'CONTINUAR' }
  | { tipo: 'ESCOLHER_LOJA'; ids: string[] }
  | { tipo: 'TROCAR_NA_LOJA'; sai: string; entra: string }
  | { tipo: 'ESCOLHER_PROTECAO'; id: string; substitui?: string }
  | { tipo: 'VOLTAR_MAPA' };
