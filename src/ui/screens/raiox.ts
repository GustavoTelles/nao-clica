// Raio-X do golpe (GDD §15.1, item 6) e intro do cenário (item 3).
import { nivelDe } from '../../engine/reducer';
import type { CartaAmeaca } from '../../engine/types';
import { NOME_CANAL, rotuloTag, type App, type Tela } from '../app';
import { botao, destacar, h } from '../dom';
import { barraJogo, mascara, placarNivel } from '../components/componentes';

/** Link para o fascículo oficial do caso. O crédito por extenso fica só em Créditos e fontes. */
export function linkFasciculo(app: App, fonteId: string): HTMLElement {
  const f = app.ctx.conteudo.fontes[fonteId];
  return h('p', { class: 'link-fasciculo' },
    h('a', { href: f.url, target: '_blank', rel: 'noopener noreferrer' }, `📄 Fascículo "${f.titulo}" ↗`));
}

export function telaIntro(app: App): Tela {
  const p = app.estado.partida!;
  const nivel = nivelDe(app.ctx, p.nivelId)!;
  const c = nivel.cenarios[p.cenarioIdx];
  const chefe = p.cenarioIdx === nivel.cenarios.length - 1;
  const iniciar = () => app.dispatch({ tipo: 'INICIAR_CENARIO' });
  return {
    el: h('div', { class: 'tela intro' },
      barraJogo(app, `${nivel.titulo} · Caso ${p.cenarioIdx + 1} de ${nivel.cenarios.length}`),
      placarNivel(p),
      h('h1', { class: 'titulo' }, chefe ? '★ ' : '', c.titulo),
      mascara(c.persona),
      h('p', { class: 'canal-tag' }, `Canal: ${NOME_CANAL[c.canal]}`),
      h('p', { class: 'contexto' }, c.contexto),
      chefe ? h('p', { class: 'alerta' }, 'Caso chefe: a pressão é mais alta.') : null,
      h('p', { class: 'mini' }, 'A Máscara começa.'),
      botao('Começar ⏎', iniciar, { class: 'btn primario', 'data-foco': '' })),
    teclas: (e) => (e.key === 'Enter' ? (iniciar(), true) : false),
  };
}

export function telaRaioX(app: App): Tela {
  const p = app.estado.partida!;
  const nivel = nivelDe(app.ctx, p.nivelId)!;
  const c = nivel.cenarios[p.cenarioIdx];
  const res = p.historico[p.historico.length - 1];
  const ganhou = res.vencedor === 'defesa';

  // Mensagens que a Máscara usou neste cenário, com os sinais grifados.
  const usadas: CartaAmeaca[] = p.vazas.map((v, i) => c.vazas[i].opcoes.find((o) => o.id === v.ameacaId)!).filter(Boolean);
  const continuar = () => app.dispatch({ tipo: 'CONTINUAR' });

  return {
    el: h('div', { class: 'tela raiox' },
      barraJogo(app, 'Raio-X do golpe'),
      h('h1', { class: `titulo ${ganhou ? 'ok' : 'ruim'}` }, ganhou ? (res.leituraPerfeita ? 'Leitura perfeita!' : 'Você escapou!') : 'Você caiu…'),
      h('p', { class: 'desfecho' }, ganhou ? c.desfechoVitoria : c.desfechoDerrota),
      res.anulado ? h('p', { class: 'alerta' }, `🛡 ${app.ctx.conteudo.protecoes[res.anulado].nome}: a Máscara não pontua.`) : null,
      res.leituraPerfeita ? h('p', { class: 'alerta' }, 'Bônus: +1 Desconfiômetro e a próxima loja mostra 6 cartas.') : null,
      placarNivel(p),
      h('section', { class: 'bloco' },
        h('h2', {}, 'A conversa, com os sinais grifados'),
        h('ol', { class: 'conversa' }, usadas.map((a) =>
          h('li', {},
            h('p', { class: 'msg' }, destacar(a.mensagem, a.sinais)),
            h('p', { class: 'mini' }, 'Táticas: ', a.tags.map((t) => rotuloTag(app, t)).join(' · ')))))),
      h('section', { class: 'bloco' }, h('h2', {}, 'O que era'), h('p', {}, c.raioX.oQueEra)),
      h('section', { class: 'bloco' }, h('h2', {}, 'Como agir na vida real'), h('ul', { class: 'acoes' }, c.raioX.comoAgir.map((x) => h('li', {}, x)))),
      c.raioX.verificar ? h('p', { class: 'mini aviso' }, 'Conteúdo em revisão.') : null,
      c.matriz?.length ? h('p', { class: 'mini matriz' }, 'Matriz BR-Fraude: ', c.matriz.join(' · ')) : null,
      linkFasciculo(app, c.fonte),
      botao('Continuar ⏎', continuar, { class: 'btn primario', 'data-foco': '' })),
    teclas: (e) => (e.key === 'Enter' && !(e.target instanceof HTMLAnchorElement) ? (continuar(), true) : false),
  };
}
