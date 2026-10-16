// Laço principal: estado → reducer → salvar → desenhar.
import '@fontsource/silkscreen/400.css';
import '../styles/main.css';
import { carregarConteudo, config } from '../content';
import { estadoInicial, reducer, type Ctx } from '../engine/reducer';
import { CHAVE_SAVE, carregarSave, serializarSave, type Ajustes } from '../engine/save';
import type { Acao, Estado } from '../engine/types';
import type { App, Painel, Tela } from './app';
import { botao, h } from './dom';
import { telaFimNivel, telaRecompensa } from './screens/fim';
import { telaLoja } from './screens/loja';
import { painelAjustes, painelComoJogar, painelCreditos, telaMapa, telaMenu } from './screens/menu';
import { telaMesa } from './screens/mesa';
import { telaIntro, telaRaioX } from './screens/raiox';

const conteudo = carregarConteudo();
const ctx: Ctx = { conteudo, config };
const inicial = estadoInicial(conteudo);

function lerStorage(): string | null {
  try { return localStorage.getItem(CHAVE_SAVE); } catch { return null; }
}
function gravarStorage(valor: string | null) {
  try {
    if (valor === null) localStorage.removeItem(CHAVE_SAVE);
    else localStorage.setItem(CHAVE_SAVE, valor);
  } catch { /* modo privado ou armazenamento cheio: o jogo segue sem salvar */ }
}

const salvo = carregarSave(lerStorage(), inicial, conteudo.niveis.map((n) => n.id), Object.keys(conteudo.protecoes));
let estado: Estado = salvo.estado;
let ajustes: Ajustes = salvo.ajustes;
let painel: Painel = null;
let telaAtual: Tela | null = null;
let faseAnterior = '';

const raiz = document.getElementById('app')!;
const vivo = document.getElementById('anuncio')!;

function aplicarAjustes() {
  const html = document.documentElement;
  html.classList.toggle('reduz-movimento', ajustes.animacoesReduzidas);
  html.classList.toggle('texto-grande', ajustes.texto === 'grande');
}

function anunciar(msg: string) {
  vivo.textContent = '';
  requestAnimationFrame(() => { vivo.textContent = msg; });
}

let toastTimer = 0;
function toast(msg: string) {
  document.querySelector('.toast')?.remove();
  const t = h('div', { class: 'toast', role: 'status' }, msg);
  document.body.append(t);
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => t.remove(), 3000);
}

const app: App = {
  get estado() { return estado; },
  ctx,
  get ajustes() { return ajustes; },
  dispatch(acao: Acao) {
    const novo = reducer(estado, acao, ctx);
    if (novo.erro) { toast(novo.erro); anunciar(novo.erro); return; }
    estado = novo;
    gravarStorage(serializarSave(estado, ajustes));
    anunciarMudanca(acao);
    render();
  },
  render: () => render(),
  abrirPainel(p) { painel = p; render(); },
  salvarAjustes(a) { ajustes = a; aplicarAjustes(); gravarStorage(serializarSave(estado, ajustes)); render(); },
  anunciar,
  novaSeed() {
    const b = new Uint32Array(1);
    crypto.getRandomValues(b);
    return b[0] | 0;
  },
  resetar() {
    gravarStorage(null);
    estado = estadoInicial(conteudo);
    painel = null;
    render();
    toast('Progresso apagado.');
  },
};

/** Texto para leitores de tela a cada passo importante (GDD §15.3). */
function anunciarMudanca(acao: Acao) {
  const p = estado.partida;
  if (!p) return;
  if (acao.tipo === 'AMEACA_JOGA' && p.cartaAmeaca) anunciar(`A Máscara diz: ${p.cartaAmeaca.mensagem}`);
  if (acao.tipo === 'JOGAR_CARTA') {
    const r = p.vazas[p.vazas.length - 1];
    anunciar(`${r.vencedor === 'defesa' ? 'Você venceu a vaza' : 'A Máscara venceu a vaza'}. ${r.motivo.replace('_', ' ')}. Força ${r.forca}, pressão ${r.pressao}.`);
  }
  if (acao.tipo === 'USAR_DESCONFIOMETRO' && p.cartaAmeaca) anunciar(`Táticas reveladas: ${p.cartaAmeaca.tags.join(', ')}.`);
}

function telaDaFase(): Tela {
  switch (estado.fase) {
    case 'MENU': return telaMenu(app);
    case 'MAPA': return telaMapa(app);
    case 'INTRO_CENARIO': return telaIntro(app);
    case 'VEZ_AMEACA': case 'VEZ_JOGADOR': case 'RESOLUCAO': return telaMesa(app);
    case 'RAIOX': return telaRaioX(app);
    case 'LOJA': return telaLoja(app);
    case 'FIM_NIVEL': return telaFimNivel(app);
    case 'RECOMPENSA': return telaRecompensa(app);
  }
}

function render() {
  const foco = document.activeElement as HTMLElement | null;
  const focoId = foco?.dataset?.id ?? foco?.getAttribute?.('aria-label');
  const mudouFase = faseAnterior !== estado.fase || !!painel;
  faseAnterior = estado.fase;

  telaAtual = telaDaFase();
  const conteudoPainel = painel === 'comoJogar' ? painelComoJogar(app)
    : painel === 'creditos' ? painelCreditos(app)
    : painel === 'ajustes' ? painelAjustes(app) : null;

  raiz.replaceChildren(telaAtual.el);
  if (conteudoPainel) {
    raiz.append(h('div', { class: 'painel', role: 'dialog', 'aria-modal': 'true' },
      h('div', { class: 'painel-caixa' }, conteudoPainel,
        botao('Fechar (Esc)', () => app.abrirPainel(null), { class: 'btn primario', 'data-foco-painel': '' }))));
  }

  // Foco: no painel, no alvo preferido da tela, ou de volta ao mesmo elemento.
  const alvo = conteudoPainel
    ? raiz.querySelector<HTMLElement>('[data-foco-painel]')
    : raiz.querySelector<HTMLElement>('.resolucao [data-foco], .detalhe [data-foco]')
      || (!mudouFase && focoId && [...raiz.querySelectorAll<HTMLElement>('[data-id],[aria-label]')]
        .find((el) => (el.dataset.id ?? el.getAttribute('aria-label')) === focoId && !el.hasAttribute('disabled')))
      || raiz.querySelector<HTMLElement>('[data-foco]:not([disabled])');
  alvo?.focus({ preventScroll: !mudouFase });
  if (mudouFase && !conteudoPainel) window.scrollTo(0, 0);
  telaAtual.montada?.();
}

document.addEventListener('keydown', (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.key === 'Escape') {
    if (painel) { app.abrirPainel(null); e.preventDefault(); return; }
    if (estado.fase === 'MAPA') app.dispatch({ tipo: 'ABRIR_MENU' });
    else if (estado.fase !== 'MENU') app.dispatch({ tipo: 'ABRIR_MAPA' });
    e.preventDefault();
    return;
  }
  if (painel) return;
  // Enter num botão/link já aciona o próprio elemento.
  const t = e.target as HTMLElement;
  if ((e.key === 'Enter' || e.key === ' ') && (t.tagName === 'BUTTON' || t.tagName === 'A' || t.tagName === 'INPUT')) return;
  if (telaAtual?.teclas?.(e)) e.preventDefault();
});

aplicarAjustes();
render();
