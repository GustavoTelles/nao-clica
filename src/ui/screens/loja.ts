// Loja entre cenários (GDD §4.2 e §15.1, item 7).
import { nivelDe } from '../../engine/reducer';
import { contarCopias } from '../../engine/shop';
import { NOME_CANAL, type App, type Tela } from '../app';
import { botao, h } from '../dom';
import { barraJogo, cartaDefesa } from '../components/componentes';

let escolhidas: string[] = [];
let trocaSai: number | null = null;
let chaveLoja = '';

export function telaLoja(app: App): Tela {
  const { estado, ctx } = app;
  const p = estado.partida!;
  const loja = p.loja!;
  const nivel = nivelDe(ctx, p.nivelId)!;
  const prox = nivel.cenarios[p.cenarioIdx + 1];
  const defs = ctx.conteudo.defesas;
  const max = ctx.config.maxCopias;

  const chave = `${p.cenarioIdx}-${loja.oferta.join(',')}-${p.mao.join(',')}`;
  if (chave !== chaveLoja) { escolhidas = []; trocaSai = null; chaveLoja = chave; }

  const podeEscolher = (id: string) =>
    escolhidas.includes(id) || (escolhidas.length < loja.precisa && contarCopias([...p.mao, ...escolhidas], id) < max);

  const alternar = (id: string) => {
    if (trocaSai !== null) {
      app.dispatch({ tipo: 'TROCAR_NA_LOJA', sai: p.mao[trocaSai], entra: id });
      return;
    }
    if (escolhidas.includes(id)) escolhidas = escolhidas.filter((x) => x !== id);
    else if (podeEscolher(id)) escolhidas = [...escolhidas, id];
    app.render();
  };
  const confirmar = () => {
    if (escolhidas.length === loja.precisa) app.dispatch({ tipo: 'ESCOLHER_LOJA', ids: escolhidas });
  };

  const oferta = h('div', { class: 'grade-cartas', role: 'group', 'aria-label': 'Oferta da loja' },
    loja.oferta.map((id, i) => {
      const c = cartaDefesa(app, defs[id], { tecla: i + 1, selecionada: escolhidas.includes(id), onclick: () => alternar(id) });
      if (trocaSai === null && !podeEscolher(id)) c.setAttribute('disabled', '');
      return c;
    }));

  const mao = h('div', { class: 'grade-cartas mao-loja', role: 'group', 'aria-label': 'Sua mão' },
    p.mao.map((id, i) => cartaDefesa(app, defs[id], {
      selecionada: trocaSai === i, compacta: true,
      onclick: loja.trocasRestantes > 0 ? () => { trocaSai = trocaSai === i ? null : i; app.render(); } : undefined,
    })));

  const falta = loja.precisa - escolhidas.length;
  return {
    el: h('div', { class: 'tela loja' },
      barraJogo(app, nivel.titulo),
      h('h1', { class: 'titulo' }, 'Loja de defesas'),
      prox ? h('div', { class: 'previa' }, h('span', { class: 'mini' }, 'Próximo caso: '), h('strong', {}, prox.titulo), h('span', { class: 'mini' }, ` · ${NOME_CANAL[prox.canal]}`)) : null,
      h('p', { class: 'contador', 'aria-live': 'polite' },
        loja.precisa === 0 ? 'Sua mão já está cheia.' : falta > 0 ? `Escolha ${falta} carta(s) para voltar a ${ctx.config.tamanhoMao}.` : 'Pronto! Confirme a escolha.'),
      trocaSai !== null ? h('p', { class: 'alerta' }, `Trocar "${defs[p.mao[trocaSai]].nome}" por qual carta da oferta?`) : null,
      oferta,
      botao(`Confirmar (${escolhidas.length}/${loja.precisa}) ⏎`, confirmar, { class: 'btn primario', disabled: falta !== 0, 'data-foco': '' }),
      h('h2', { class: 'subtitulo' }, 'Sua mão'),
      h('p', { class: 'mini' }, loja.trocasRestantes > 0
        ? `Troca (${loja.trocasRestantes}x): toque numa carta da mão e depois numa da oferta. Máximo de ${max} cópias por carta.`
        : 'Troca já usada nesta loja.'),
      mao),
    teclas: (e) => {
      if (/^[1-6]$/.test(e.key) && loja.oferta[Number(e.key) - 1]) { alternar(loja.oferta[Number(e.key) - 1]); return true; }
      if (e.key === 'Enter' && !(e.target instanceof HTMLButtonElement && !e.target.classList.contains('primario'))) { confirmar(); return true; }
      return false;
    },
  };
}
