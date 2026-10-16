// Fim de nível e escolha de proteção (GDD §15.1, item 8).
import { indiceDesconfianca, nivelDe, ofertaRecompensa, tagMaisCaida } from '../../engine/reducer';
import { rotuloTag, type App, type Tela } from '../app';
import { botao, h } from '../dom';
import { cartaProtecao, listaProtecoes, placarNivel } from '../components/componentes';

export function telaFimNivel(app: App): Tela {
  const { estado, ctx } = app;
  const p = estado.partida!;
  const nivel = nivelDe(ctx, p.nivelId)!;
  const venceu = p.resultado === 'vitoria';
  const indice = indiceDesconfianca(p);
  const tag = tagMaisCaida(p);
  const temRecompensa = venceu && ofertaRecompensa(estado, ctx).length > 0;
  const proximo = ctx.conteudo.niveis.find((n) => n.ordem === nivel.ordem + 1);

  return {
    el: h('div', { class: 'tela fim' },
      h('p', { class: 'mini' }, nivel.titulo),
      h('h1', { class: `titulo ${venceu ? 'ok' : 'ruim'}` }, venceu ? 'Nível vencido!' : 'A Máscara levou essa'),
      placarNivel(p),
      h('div', { class: 'indice' },
        h('span', { class: 'mini' }, 'Índice de Desconfiança'),
        h('strong', {}, `${indice}%`),
        h('span', { class: 'mini' }, `das rodadas vencidas com contra perfeito · melhor: ${estado.progresso.melhorIndice[nivel.id] ?? indice}%`)),
      tag ? h('p', {}, `Você caiu mais em ${rotuloTag(app, tag)}. Fique de olho nessa tática.`) : h('p', {}, 'Você não caiu em nenhuma tática. Impecável!'),
      h('p', {}, (p.stats.armadilhas ?? 0) === 0 ? 'Você não jogou nenhuma resposta errada. 👏' : `Você jogou ${p.stats.armadilhas} resposta(s) errada(s). Releia o "O que NÃO fazer" dos Raio-X.`),
      venceu
        ? h('p', {}, proximo ? `Próximo nível desbloqueado: ${proximo.titulo}.` : 'Você concluiu todos os níveis disponíveis por enquanto.')
        : h('p', {}, 'Golpistas são bons nisso — e você está aprendendo os truques deles. Tente de novo: suas proteções continuam com você.'),
      h('div', { class: 'acoes-linha' },
        temRecompensa ? botao('Escolher proteção ⏎', () => app.dispatch({ tipo: 'CONTINUAR' }), { class: 'btn primario', 'data-foco': '' }) : null,
        !venceu ? botao('Tentar de novo', () => app.dispatch({ tipo: 'INICIAR_NIVEL', nivelId: nivel.id, seed: app.novaSeed() }), { class: 'btn primario', 'data-foco': '' }) : null,
        botao('Mapa', () => app.dispatch({ tipo: 'VOLTAR_MAPA' }), { class: 'btn', 'data-foco': temRecompensa || !venceu ? undefined : '' }),
        // Com proteção a escolher, não oferece sair: a escolha se perderia.
        temRecompensa ? null : botao('Menu inicial', () => app.dispatch({ tipo: 'ABRIR_MENU' }), { class: 'btn' }))),
  };
}

let escolhida: string | null = null;

export function telaRecompensa(app: App): Tela {
  const { estado, ctx } = app;
  const oferta = ofertaRecompensa(estado, ctx);
  const atuais = estado.progresso.protecoes;
  const cheio = atuais.length >= ctx.config.maxProtecoes;
  if (escolhida && !oferta.includes(escolhida)) escolhida = null;

  const escolher = (id: string) => {
    if (!cheio) { app.dispatch({ tipo: 'ESCOLHER_PROTECAO', id }); return; }
    escolhida = id;
    app.render();
  };

  return {
    el: h('div', { class: 'tela recompensa' },
      h('h1', { class: 'titulo ok' }, 'Escolha uma proteção'),
      h('p', {}, 'Proteções são permanentes e valem em todos os níveis seguintes.'),
      h('div', { class: 'grade-cartas' }, oferta.map((id, i) => {
        const c = cartaProtecao(ctx.conteudo.protecoes[id], { selecionada: escolhida === id, onclick: () => escolher(id) });
        if (i === 0) c.setAttribute('data-foco', '');
        return c;
      })),
      cheio ? h('section', { class: 'bloco' },
        h('h2', {}, `Você já tem ${ctx.config.maxProtecoes} proteções. ${escolhida ? 'Qual delas sai?' : 'Escolha a nova primeiro.'}`),
        escolhida ? h('div', { class: 'grade-cartas' }, atuais.map((id) =>
          cartaProtecao(ctx.conteudo.protecoes[id], { onclick: () => app.dispatch({ tipo: 'ESCOLHER_PROTECAO', id: escolhida!, substitui: id }) }))) : listaProtecoes(atuais.map((id) => ctx.conteudo.protecoes[id])))
        : null),
  };
}
