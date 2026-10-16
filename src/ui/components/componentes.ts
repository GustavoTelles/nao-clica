// Componentes reutilizados pelas telas: carta de defesa, máscara, celular, placar, proteções.
import type { CartaAmeaca, CartaDefesa, Canal, Partida, Protecao } from '../../engine/types';
import { NOME_CANAL, rotuloTag, type App } from '../app';
import { destacar, h, svg } from '../dom';

const MASCARA = `
<svg viewBox="0 0 120 70" aria-hidden="true" class="mascara-svg">
  <path d="M8 22 C20 6 46 8 60 20 C74 8 100 6 112 22 C116 40 104 60 84 60 C72 60 66 50 60 44 C54 50 48 60 36 60 C16 60 4 40 8 22 Z" fill="currentColor"/>
  <ellipse cx="36" cy="32" rx="12" ry="8" fill="var(--fundo)"/>
  <ellipse cx="84" cy="32" rx="12" ry="8" fill="var(--fundo)"/>
  <path class="racha" d="M60 20 L54 30 L63 36 L56 48 L60 56" fill="none" stroke="var(--fundo)" stroke-width="3"/>
</svg>`;

/** Atalho de teclado da posição na mão: 1–9 e 0 para a 10ª carta. */
export const rotuloTecla = (n: number) => (n === 10 ? '0' : String(n));

export function mascara(persona: string, rachada = false): HTMLElement {
  return h('div', { class: `mascara${rachada ? ' rachada' : ''}` },
    svg(MASCARA),
    h('div', { class: 'mascara-nome' }, h('span', { class: 'mini' }, 'A Máscara como'), h('strong', {}, persona)));
}

export function cartaDefesa(app: App, d: CartaDefesa, opts: { tecla?: number; selecionada?: boolean; compacta?: boolean; onclick?: () => void; extra?: string } = {}): HTMLElement {
  const raridade = d.raridade === 'rara' ? 'rara' : d.raridade === 'incomum' ? 'incomum' : 'comum';
  const conteudo = [
    h('div', { class: 'carta-topo' },
      opts.tecla ? h('span', { class: 'tecla', 'aria-hidden': 'true' }, rotuloTecla(opts.tecla)) : null,
      h('span', { class: 'forca', title: `Força ${d.forca}` }, h('span', { class: 'sr' }, 'Força '), String(d.forca))),
    h('div', { class: 'carta-nome' }, d.nome),
    h('ul', { class: 'contra', 'aria-label': 'Anula' }, d.contra.map((t) => h('li', {}, rotuloTag(app, t)))),
    opts.compacta ? null : h('div', { class: 'raridade' }, raridade),
  ];
  const attrs = {
    class: `carta defesa r-${raridade}${opts.selecionada ? ' selecionada' : ''}${opts.compacta ? ' compacta' : ''} ${opts.extra ?? ''}`,
    'data-id': d.id,
  };
  if (!opts.onclick) return h('div', attrs, conteudo);
  return h('button', {
    ...attrs, type: 'button', onclick: opts.onclick, 'aria-pressed': opts.selecionada ? 'true' : 'false',
    'aria-label': `${opts.tecla ? `${rotuloTecla(opts.tecla)}: ` : ''}${d.nome}. Força ${d.forca}. Anula ${d.contra.map((t) => rotuloTag(app, t).replace(/^\S+\s/, '')).join(', ')}.`,
  }, conteudo);
}

export function celular(app: App, canal: Canal, persona: string, carta: CartaAmeaca | null, opts: { tagsVisiveis?: boolean; sinais?: boolean; digitando?: boolean } = {}): HTMLElement {
  const corpo = carta
    ? h('div', { class: 'balao' },
        h('p', { class: 'msg' }, opts.sinais ? destacar(carta.mensagem, carta.sinais) : carta.mensagem),
        h('div', { class: 'balao-pe' },
          h('span', { class: 'pressao', title: 'Pressão' }, `Pressão ${carta.pressao}`),
          opts.tagsVisiveis
            ? h('ul', { class: 'tags', 'aria-label': 'Táticas' }, carta.tags.map((t) => h('li', {}, rotuloTag(app, t))))
            : h('span', { class: 'tags-ocultas' }, '??? táticas ocultas')))
    : h('div', { class: 'balao digitando', 'aria-label': 'A Máscara está digitando' }, h('span'), h('span'), h('span'));
  return h('section', { class: 'celular', 'aria-label': `Celular — ${NOME_CANAL[canal]}` },
    h('div', { class: 'celular-topo' },
      h('span', { class: 'canal' }, NOME_CANAL[canal]),
      h('span', { class: 'remetente' }, persona)),
    h('div', { class: 'celular-tela' }, corpo));
}

export function bolinhas(p: Partida): HTMLElement {
  const marcas = [0, 1, 2].map((i) => {
    const v = p.vazas[i];
    const cls = v ? (v.vencedor === 'defesa' ? 'ganhou' : 'perdeu') : '';
    const txt = v ? (v.vencedor === 'defesa' ? 'você' : 'ameaça') : 'a jogar';
    return h('li', { class: `vaza ${cls}`, title: `Vaza ${i + 1}: ${txt}` }, h('span', { class: 'sr' }, `Vaza ${i + 1}: ${txt}`));
  });
  return h('ol', { class: 'vazas', 'aria-label': 'Vazas do cenário' }, marcas);
}

export function placarNivel(p: Partida): HTMLElement {
  return h('div', { class: 'placar', 'aria-label': `Placar do nível: você ${p.placar.jogador}, ameaça ${p.placar.ameaca}` },
    h('span', { class: 'p-voce' }, 'Você ', h('b', {}, String(p.placar.jogador))),
    h('span', { class: 'x' }, '×'),
    h('span', { class: 'p-ameaca' }, h('b', {}, String(p.placar.ameaca)), ' Ameaça'));
}

export function listaProtecoes(prot: Protecao[], usos: Record<string, number> = {}): HTMLElement {
  if (prot.length === 0) return h('p', { class: 'mini vazio' }, 'Sem proteções ainda.');
  return h('ul', { class: 'protecoes' }, prot.map((p) =>
    h('li', { class: 'protecao', title: p.descricao },
      h('strong', {}, '🛡 ', p.nome),
      usos[p.id] !== undefined ? h('span', { class: 'mini' }, ` (${usos[p.id]} uso)`) : null,
      h('span', { class: 'mini desc' }, p.descricao))));
}

export function cartaProtecao(p: Protecao, opts: { selecionada?: boolean; onclick?: () => void } = {}): HTMLElement {
  return h('button', {
    type: 'button', class: `carta protecao-carta${opts.selecionada ? ' selecionada' : ''}`,
    'aria-pressed': opts.selecionada ? 'true' : 'false', onclick: opts.onclick,
  },
    h('div', { class: 'carta-nome' }, '🛡 ', p.nome),
    h('p', { class: 'desc' }, p.descricao));
}

/** Volta à tela inicial pausando a partida (lá aparece "Continuar partida"). */
export function botaoMenuInicial(app: App): HTMLButtonElement {
  const b = h('button', {
    type: 'button', class: 'btn btn-menu-inicial',
    'aria-label': 'Voltar ao menu inicial (a partida fica pausada)', title: 'Voltar ao menu inicial — a partida fica pausada',
  }, h('span', { 'aria-hidden': 'true' }, '⌂ '), 'Menu');
  b.addEventListener('click', () => app.dispatch({ tipo: 'ABRIR_MENU' }));
  return b;
}

/** Barra fina no topo das telas de jogo (intro, Raio-X). */
export function barraJogo(app: App, titulo: string): HTMLElement {
  return h('div', { class: 'barra-jogo' }, botaoMenuInicial(app), h('span', { class: 'mini' }, titulo));
}
