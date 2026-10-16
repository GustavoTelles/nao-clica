// Mesa: vez da ameaça, vez do jogador e resolução da vaza (GDD §15.1, itens 4 e 5).
import { nivelDe, protecoesAtivas } from '../../engine/reducer';
import { rotuloTag, textoMotivo, type App, type Tela } from '../app';
import { animar, botao, h, movimentoReduzido } from '../dom';
import { bolinhas, botaoMenuInicial, cartaDefesa, celular, listaProtecoes, mascara, placarNivel } from '../components/componentes';

let selecionada: number | null = null;
let chaveVaza = '';

export function telaMesa(app: App): Tela {
  const { estado, ctx } = app;
  const p = estado.partida!;
  const nivel = nivelDe(ctx, p.nivelId)!;
  const cenario = nivel.cenarios[p.cenarioIdx];
  const fase = estado.fase;
  const defs = ctx.conteudo.defesas;

  const chave = `${p.cenarioIdx}-${p.vazaIdx}`;
  if (chave !== chaveVaza || fase !== 'VEZ_JOGADOR') selecionada = null;
  chaveVaza = chave;
  if (selecionada !== null && selecionada >= p.mao.length) selecionada = null;

  const ultima = fase === 'RESOLUCAO' ? p.vazas[p.vazas.length - 1] : null;
  const cartaAmeaca = fase === 'RESOLUCAO' && ultima
    ? cenario.vazas[p.vazaIdx].opcoes.find((o) => o.id === ultima.ameacaId) ?? null
    : p.cartaAmeaca;

  const jogar = () => {
    if (fase !== 'VEZ_JOGADOR' || selecionada === null) return;
    const id = p.mao[selecionada];
    const el = document.querySelector(`.medidas .carta[data-idx="${selecionada}"]`);
    animar(el, [{ transform: 'scale(1)' }, { transform: 'scale(.92)', opacity: 0.4 }], 180)
      .then(() => { selecionada = null; app.dispatch({ tipo: 'JOGAR_CARTA', cartaId: id }); });
  };
  const selecionar = (i: number, alternar = true) => {
    if (fase !== 'VEZ_JOGADOR' || i < 0 || i >= p.mao.length) return;
    selecionada = alternar && selecionada === i ? null : i;
    app.render();
    document.querySelector<HTMLElement>(`.medidas .carta[data-idx="${i}"]`)?.scrollIntoView({ block: 'nearest' });
  };
  /** Setas: ←/→ andam uma medida; ↑/↓ andam uma linha da grade. */
  const mover = (tecla: string) => {
    const cartas = [...document.querySelectorAll<HTMLElement>('.medidas .carta')];
    if (cartas.length === 0) return;
    const colunas = Math.max(1, cartas.filter((c) => c.offsetTop === cartas[0].offsetTop).length);
    const atual = selecionada ?? -1;
    const passo = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: colunas, ArrowUp: -colunas }[tecla] ?? 0;
    const alvo = atual < 0 ? 0 : Math.min(cartas.length - 1, Math.max(0, atual + passo));
    selecionar(alvo, false);
  };
  const desconfiar = () => app.dispatch({ tipo: 'USAR_DESCONFIOMETRO' });

  // ----- topo -----
  const topo = h('header', { class: 'mesa-topo' },
    mascara(cenario.persona, fase === 'RESOLUCAO' && ultima?.vencedor === 'defesa'),
    h('div', { class: 'mesa-placar' },
      h('div', { class: 'mini' }, `Caso ${p.cenarioIdx + 1}/${nivel.cenarios.length} · vaza ${p.vazaIdx + 1}`),
      bolinhas(p),
      placarNivel(p)),
    botaoMenuInicial(app));

  // ----- centro -----
  const ocultas = !p.tagsReveladas;
  const desconfBtn = botao(
    h('span', {}, '🔍 Desconfiômetro ', h('b', {}, String(p.desconfiometro)), h('span', { class: 'mini' }, ' (D)')),
    desconfiar,
    { class: 'btn desconf', disabled: fase !== 'VEZ_JOGADOR' || !ocultas || p.desconfiometro <= 0, 'aria-label': `Usar Desconfiômetro: revela as táticas. Cargas: ${p.desconfiometro}` },
  );
  const lateral = h('aside', { class: 'mesa-lateral' },
    nivel.regras.tagsVisiveis ? null : desconfBtn,
    h('h2', { class: 'mini titulo-lateral' }, 'Proteções'),
    listaProtecoes(protecoesAtivas(estado, ctx), p.usosProtecao));

  const esquerda = h('div', { class: 'mesa-esquerda' },
    celular(app, cenario.canal, cenario.persona, cartaAmeaca, {
      tagsVisiveis: p.tagsReveladas || fase === 'RESOLUCAO',
      sinais: fase === 'RESOLUCAO' && ultima?.motivo === 'contra_perfeito',
    }),
    lateral);

  // ----- medidas: todas as do fascículo do nível + as respostas erradas do caso -----
  const fonte = ctx.conteudo.fontes[nivel.fontes[0]];
  const medidas = h('section', { class: 'mesa-medidas', 'aria-labelledby': 'titulo-medidas' },
    h('h2', { id: 'titulo-medidas', class: 'titulo-medidas' },
      `Medidas — ${fonte.titulo}`, h('span', { class: 'mini' }, ` · ${p.mao.length} opções · escolha a melhor`)),
    h('div', { class: 'medidas', role: 'group', 'aria-label': 'Medidas disponíveis' },
      p.mao.map((id, i) => {
        const c = cartaDefesa(app, defs[id], {
          tecla: i < 10 ? i + 1 : undefined, selecionada: selecionada === i, compacta: true, onclick: () => selecionar(i),
        });
        c.dataset.idx = String(i);
        if (fase !== 'VEZ_JOGADOR') c.setAttribute('disabled', '');
        return c;
      })));
  const centro = h('main', { class: 'mesa-centro' }, esquerda, medidas);

  const sel = selecionada !== null ? defs[p.mao[selecionada]] : null;
  const detalhe = h('div', { class: 'detalhe', 'aria-live': 'polite' },
    fase === 'VEZ_AMEACA' ? h('p', { class: 'mini' }, 'A Máscara está escrevendo…')
    : fase === 'VEZ_JOGADOR'
      ? (sel
        ? h('div', { class: 'detalhe-linha' },
            h('div', {}, h('strong', {}, sel.nome), h('div', { class: 'mini' }, `Força ${sel.forca} · anula ${sel.contra.join(', ').toLowerCase()}`)),
            botao('Jogar ⏎', jogar, { class: 'btn primario', 'data-foco': '' }))
        : h('p', { class: 'mini' }, ocultas
            ? 'Leia a mensagem: qual tática ela usa? Toque na melhor medida (ou use as setas e Enter). O Desconfiômetro (D) revela as táticas. Cuidado: há respostas erradas!'
            : 'Toque na medida que anula as táticas da mensagem (ou use as setas e Enter). Cuidado: há respostas erradas entre as opções!'))
      : null);

  const raiz = h('div', { class: `tela mesa fase-${fase.toLowerCase()}` }, topo, centro, detalhe);

  // ----- resolução -----
  if (fase === 'RESOLUCAO' && ultima) {
    const d = defs[ultima.defesaId];
    const ganhou = ultima.vencedor === 'defesa';
    raiz.append(h('div', { class: `resolucao ${ganhou ? 'ganhou' : 'perdeu'}`, role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'res-titulo' },
      h('div', { class: 'resolucao-caixa' },
        h('p', { class: 'mini' }, ganhou ? 'Vaza sua!' : 'Vaza da Máscara'),
        h('h2', { id: 'res-titulo', class: 'motivo' }, textoMotivo(ultima, app)),
        cartaDefesa(app, d, { compacta: true }),
        d.armadilha
          ? h('div', { class: 'licao' }, h('p', {}, h('b', {}, 'Resposta errada! '), d.mito), h('p', { class: 'certo' }, h('b', {}, 'Em vez disso: '), d.licao))
          : h('p', { class: 'licao' }, d.licao),
        !ganhou && cartaAmeaca
          ? h('p', { class: 'mini' }, `A mensagem usava ${cartaAmeaca.tags.map((t) => rotuloTag(app, t)).join(' + ')}. Uma carta que anule isso vence com qualquer pressão.`)
          : null,
        botao('Continuar ⏎', () => app.dispatch({ tipo: 'CONTINUAR' }), { class: 'btn primario', 'data-foco': '' }))));
  }

  return {
    el: raiz,
    montada: () => {
      if (fase === 'VEZ_AMEACA') {
        setTimeout(() => { if (app.estado.fase === 'VEZ_AMEACA') app.dispatch({ tipo: 'AMEACA_JOGA' }); }, movimentoReduzido() ? 100 : 750);
      }
      if (fase === 'VEZ_JOGADOR' && p.cartaAmeaca) {
        animar(raiz.querySelector('.balao'), [{ transform: 'translateY(12px) scale(.96)' }, { transform: 'none' }], 280);
      }
      if (fase === 'RESOLUCAO' && ultima) {
        if (ultima.motivo === 'contra_perfeito') {
          animar(raiz, [{ transform: 'translateX(0)' }, { transform: 'translateX(-5px)' }, { transform: 'translateX(5px)' }, { transform: 'translateX(0)' }], 240);
          animar(raiz.querySelector('.resolucao-caixa'), [{ boxShadow: '0 0 0 0 var(--defesa)' }, { boxShadow: '0 0 60px 10px var(--defesa)' }, { boxShadow: '0 0 0 0 var(--defesa)' }], 600);
        } else if (ultima.vencedor === 'ameaca') {
          raiz.querySelector('.celular')?.classList.add('glitch');
        }
      }
    },
    teclas: (e) => {
      if (fase === 'RESOLUCAO' && e.key === 'Enter') { app.dispatch({ tipo: 'CONTINUAR' }); return true; }
      if (fase !== 'VEZ_JOGADOR') return false;
      if (/^[0-9]$/.test(e.key)) { selecionar(e.key === '0' ? 9 : Number(e.key) - 1); return true; }
      if (e.key === 'Enter' && selecionada !== null) { jogar(); return true; }
      if (e.key.startsWith('Arrow')) { mover(e.key); return true; }
      if (e.key.toLowerCase() === 'd' && !nivel.regras.tagsVisiveis) { desconfiar(); return true; }
      return false;
    },
  };
}
