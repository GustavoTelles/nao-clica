// Helpers de DOM. Todo texto entra como nó de texto (nunca innerHTML), então o conteúdo não vira HTML.

type Filho = Node | string | number | null | undefined | false;
type Attrs = Record<string, unknown>;

export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Attrs = {}, ...filhos: (Filho | Filho[])[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v as EventListener);
    else if (k === 'class') el.className = String(v);
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, String(v));
  }
  for (const f of filhos.flat()) {
    if (f === null || f === undefined || f === false) continue;
    el.append(f instanceof Node ? f : document.createTextNode(String(f)));
  }
  return el;
}

/** Elemento SVG a partir de marcação estática do próprio jogo (nunca de conteúdo). */
export function svg(marcacao: string): SVGElement {
  const t = document.createElement('template');
  t.innerHTML = marcacao.trim();
  return t.content.firstElementChild as SVGElement;
}

export function botao(texto: string | Node, onclick: () => void, attrs: Attrs = {}): HTMLButtonElement {
  return h('button', { type: 'button', class: 'btn', ...attrs, onclick }, texto);
}

/** Destaca, com <mark>, os trechos `sinais` dentro de `mensagem`. */
export function destacar(mensagem: string, sinais: string[], classe = 'sinal'): Node[] {
  const faixas: [number, number][] = [];
  for (const s of sinais) {
    const i = mensagem.indexOf(s);
    if (i >= 0 && s) faixas.push([i, i + s.length]);
  }
  faixas.sort((a, b) => a[0] - b[0]);
  const unidas: [number, number][] = [];
  for (const f of faixas) {
    const u = unidas[unidas.length - 1];
    if (u && f[0] <= u[1]) u[1] = Math.max(u[1], f[1]);
    else unidas.push([...f]);
  }
  const nos: Node[] = [];
  let pos = 0;
  for (const [a, b] of unidas) {
    if (a > pos) nos.push(document.createTextNode(mensagem.slice(pos, a)));
    nos.push(h('mark', { class: classe }, mensagem.slice(a, b)));
    pos = b;
  }
  if (pos < mensagem.length) nos.push(document.createTextNode(mensagem.slice(pos)));
  return nos;
}

export function movimentoReduzido(): boolean {
  return document.documentElement.classList.contains('reduz-movimento') ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function animar(el: Element | null, quadros: Keyframe[], ms = 300): Promise<void> {
  if (!el || movimentoReduzido() || !('animate' in el)) return Promise.resolve();
  const fim = el.animate(quadros, { duration: ms, easing: 'cubic-bezier(.2,.8,.2,1)' }).finished.then(() => undefined, () => undefined);
  // Se a aba estiver em segundo plano a animação pode não avançar; o jogo não espera por ela.
  return Promise.race([fim, new Promise<void>((r) => setTimeout(r, ms + 150))]);
}
