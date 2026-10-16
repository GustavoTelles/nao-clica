// Menu, mapa e painéis informativos (Como jogar, Créditos, Ajustes).
import { protecoesAtivas } from '../../engine/reducer';
import { rotuloTag, type App, type Tela } from '../app';
import { botao, h } from '../dom';
import { listaProtecoes } from '../components/componentes';

/** Níveis planejados no GDD §9 que ainda não têm conteúdo. */
const PLANEJADOS: [number, string, string][] = [
  [3, 'Comércio via Internet', 'Loja e vendedor falsos'],
  [4, 'Redes Sociais', 'Perfil falso, golpe do amor, sorteio'],
  [5, 'Códigos Maliciosos', 'Anexo, app falso, ransomware'],
  [6, 'Autenticação', 'Roubo de conta, código de verificação'],
  [7, 'Trabalho Remoto', 'Falso suporte de TI, fraude do chefe'],
  [8, 'Inteligência Artificial', 'Voz e vídeo falsos'],
  [9, 'Golpes: Evite Fraudes + Vazamento de Dados', 'Final'],
];

export function telaMenu(app: App): Tela {
  const emAndamento = !!app.estado.retomar;
  return {
    el: h('div', { class: 'tela menu' },
      h('h1', { class: 'logo' }, 'Não Clica!'),
      h('p', { class: 'slogan' }, 'Um jogo de cartas contra os golpes digitais.'),
      h('nav', { class: 'menu-botoes', 'aria-label': 'Menu principal' },
        emAndamento ? botao('Continuar partida', () => app.dispatch({ tipo: 'RETOMAR' }), { class: 'btn primario', 'data-foco': '' }) : null,
        botao('Jogar', () => app.dispatch({ tipo: 'ABRIR_MAPA' }), { class: `btn ${emAndamento ? '' : 'primario'}`, 'data-foco': emAndamento ? undefined : '' }),
        botao('Como jogar', () => app.abrirPainel('comoJogar')),
        botao('Créditos e fontes', () => app.abrirPainel('creditos')),
        botao('Ajustes', () => app.abrirPainel('ajustes')))),
  };
}

export function telaMapa(app: App): Tela {
  const { estado, ctx } = app;
  const partida = estado.retomar ? estado.partida : null;
  const ultimoLivre = ctx.conteudo.niveis.filter((n) => estado.progresso.desbloqueados.includes(n.id)).at(-1)?.id;
  const itens = ctx.conteudo.niveis.map((n) => {
    const livre = estado.progresso.desbloqueados.includes(n.id);
    const fonte = ctx.conteudo.fontes[n.fontes[0]];
    const melhor = estado.progresso.melhorIndice[n.id];
    const jogando = partida?.nivelId === n.id;
    return h('li', { class: `nivel ${livre ? '' : 'bloqueado'}` },
      h('div', { class: 'nivel-num' }, livre ? String(n.ordem) : '🔒'),
      h('div', { class: 'nivel-info' },
        h('strong', {}, n.titulo),
        h('span', { class: 'mini' }, `Fascículo: ${fonte.titulo}`),
        melhor !== undefined ? h('span', { class: 'mini' }, `Melhor Índice de Desconfiança: ${melhor}%`) : null,
        n.regras.tagsVisiveis ? null : h('span', { class: 'mini' }, 'Táticas ocultas · Desconfiômetro')),
      livre
        ? botao(jogando ? 'Continuar' : 'Jogar', () => {
            if (jogando) app.dispatch({ tipo: 'RETOMAR' });
            else app.dispatch({ tipo: 'INICIAR_NIVEL', nivelId: n.id, seed: app.novaSeed() });
          }, { class: 'btn primario', 'data-foco': (partida ? jogando : n.id === ultimoLivre) ? '' : undefined })
        : h('span', { class: 'mini' }, 'Vença o nível anterior'));
  });
  const futuros = PLANEJADOS.filter(([o]) => !ctx.conteudo.niveis.some((n) => n.ordem === o)).map(([o, t, tema]) =>
    h('li', { class: 'nivel bloqueado' }, h('div', { class: 'nivel-num' }, String(o)),
      h('div', { class: 'nivel-info' }, h('strong', {}, t), h('span', { class: 'mini' }, `${tema} · em breve`))));

  return {
    el: h('div', { class: 'tela mapa' },
      h('header', { class: 'barra' },
        botao('← Menu', () => app.dispatch({ tipo: 'ABRIR_MENU' }), { class: 'btn' }),
        h('h1', { class: 'titulo' }, 'Mapa')),
      h('ol', { class: 'niveis' }, itens, futuros),
      h('section', { class: 'bloco' }, h('h2', {}, 'Suas proteções'), listaProtecoes(protecoesAtivas(estado, ctx)))),
  };
}

export function painelComoJogar(app: App): HTMLElement {
  const c = app.ctx.config;
  return h('div', { class: 'painel-conteudo' },
    h('h1', { class: 'titulo' }, 'Como jogar'),
    h('ol', { class: 'regras' },
      h('li', {}, 'A Máscara é um golpista que muda de disfarce a cada caso. Ela ', h('b', {}, 'sempre joga primeiro'), ': manda uma mensagem.'),
      h('li', {}, `Você responde com 1 das ${c.tamanhoMao} cartas de defesa da sua mão. Quem vencer 2 vazas leva o caso.`),
      h('li', {}, h('b', {}, 'Contra perfeito'), ': se sua carta anula todas as táticas da mensagem, você vence a vaza, não importa a pressão.'),
      h('li', {}, 'Sem contra perfeito, vale a força: sua carta precisa ter ', h('b', {}, 'força maior'), ' que a pressão da mensagem. Empate é da Máscara. Contra parcial (em mensagens com 2 táticas) soma +2.'),
      h('li', {}, `Cada nível tem 5 casos. Quem fizer ${c.pontosParaVencerNivel} pontos primeiro vence.`),
      h('li', {}, 'Entre os casos, a loja repõe sua mão. Ao vencer um nível, você ganha uma proteção permanente.'),
      h('li', {}, 'A partir do nível 2 as táticas ficam ocultas: leia a mensagem! O Desconfiômetro revela as táticas (3 cargas por nível).')),
    h('h2', { class: 'subtitulo' }, 'Táticas'),
    h('ul', { class: 'tags-legenda' }, app.ctx.conteudo.tags.map((t) => h('li', {}, h('strong', {}, rotuloTag(app, t.id)), ` — ${t.ideia}`))),
    h('h2', { class: 'subtitulo' }, 'Teclado'),
    h('p', {}, '1–8 escolhe a carta · Enter joga/continua · D usa o Desconfiômetro · Esc volta.'));
}

export function painelCreditos(app: App): HTMLElement {
  const fontes = Object.values(app.ctx.conteudo.fontes);
  return h('div', { class: 'painel-conteudo' },
    h('h1', { class: 'titulo' }, 'Créditos e fontes'),
    h('p', {}, 'O conteúdo educativo deste jogo se baseia nas recomendações dos ',
      h('b', {}, 'Fascículos da Cartilha de Segurança para Internet'), ', produzidos pelo CERT.br/NIC.br. ',
      'Os textos, cenários e cartas do jogo são originais; nenhum trecho, ilustração ou diagramação dos fascículos foi reproduzido.'),
    h('p', {}, 'Os fascículos são distribuídos sob a licença ',
      h('a', { href: 'https://cartilha.cert.br/cc/', target: '_blank', rel: 'noopener noreferrer' }, 'Creative Commons BY-NC-ND 4.0'), '.'),
    h('p', { class: 'alerta' }, 'Aviso: Não Clica! é um projeto independente e não é um material oficial nem endossado pelo CERT.br, NIC.br ou CGI.br.'),
    h('p', {}, 'Todas as marcas, pessoas, endereços e telefones dos casos são fictícios (domínios .example, DDD 00).'),
    h('h2', { class: 'subtitulo' }, 'Fascículos oficiais'),
    h('ul', { class: 'fontes' }, fontes.map((f) => h('li', {}, h('a', { href: f.url, target: '_blank', rel: 'noopener noreferrer' }, f.titulo)))),
    h('h2', { class: 'subtitulo' }, 'Tipografia e mecânica'),
    h('p', {}, 'Fonte de títulos: Silkscreen, de Jason Kottke (SIL Open Font License 1.1). Texto: fonte do sistema.'),
    h('p', {}, 'Mecânica inspirada em jogos de cartas roguelike e no truco. Ilustrações e sons próprios.'));
}

export function painelAjustes(app: App): HTMLElement {
  const a = app.ajustes;
  const opcao = (rotulo: string, marcado: boolean, aoMudar: (v: boolean) => void, desabilitado = false) =>
    h('label', { class: 'ajuste' },
      h('input', { type: 'checkbox', checked: marcado, disabled: desabilitado, onchange: (e: Event) => aoMudar((e.target as HTMLInputElement).checked) }),
      ' ', rotulo);
  return h('div', { class: 'painel-conteudo' },
    h('h1', { class: 'titulo' }, 'Ajustes'),
    opcao('Animações reduzidas', a.animacoesReduzidas, (v) => app.salvarAjustes({ ...a, animacoesReduzidas: v })),
    opcao('Texto grande', a.texto === 'grande', (v) => app.salvarAjustes({ ...a, texto: v ? 'grande' : 'normal' })),
    opcao('Som (em breve)', false, () => undefined, true),
    h('p', { class: 'mini' }, 'O progresso fica salvo só neste navegador. Nada é enviado para a internet.'),
    botao('Apagar progresso', () => {
      if (confirm('Apagar todo o progresso salvo neste navegador?')) app.resetar();
    }, { class: 'btn perigo' }));
}
