// Contrato entre o laço principal (main.ts) e as telas.
import type { Ctx } from '../engine/reducer';
import type { Ajustes } from '../engine/save';
import type { Acao, Canal, Estado, ResultadoVaza, Tag } from '../engine/types';

export type Painel = 'comoJogar' | 'creditos' | 'ajustes' | null;

export interface App {
  estado: Estado;
  ctx: Ctx;
  ajustes: Ajustes;
  dispatch(acao: Acao): void;
  /** Redesenha a tela atual (para estado só de interface, como a carta selecionada). */
  render(): void;
  abrirPainel(p: Painel): void;
  salvarAjustes(a: Ajustes): void;
  anunciar(msg: string): void;
  novaSeed(): number;
  resetar(): void;
}

export interface Tela {
  el: HTMLElement;
  /** Trata atalhos de teclado da tela. Devolve true se consumiu a tecla. */
  teclas?: (e: KeyboardEvent) => boolean;
  /** Executado depois que a tela entra no DOM. */
  montada?: () => void;
}

export const NOME_CANAL: Record<Canal, string> = {
  SMS: 'SMS', MENSAGEM: 'Mensagem', EMAIL: 'E-mail', LIGACAO: 'Ligação', REDE_SOCIAL: 'Rede social', SITE: 'Site/anúncio',
};

export function rotuloTag(app: App, t: Tag): string {
  const info = app.ctx.conteudo.tags.find((x) => x.id === t);
  return info ? `${info.icone} ${info.rotulo}` : t;
}

export function textoMotivo(r: ResultadoVaza, app: App): string {
  switch (r.motivo) {
    case 'armadilha': return 'ARMADILHA!';
    case 'contra_perfeito': return 'CONTRA PERFEITO!';
    case 'protecao': return `PROTEÇÃO: ${app.ctx.conteudo.protecoes[r.protecaoUsada!]?.nome ?? ''}`.toUpperCase();
    case 'contra_parcial':
    case 'forca':
      return r.vencedor === 'defesa'
        ? `FORÇA ${r.forca} > PRESSÃO ${r.pressao}`
        : `PRESSÃO ${r.pressao} ≥ FORÇA ${r.forca}`;
  }
}
