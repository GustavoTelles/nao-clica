// Menu, mapa e painéis informativos (Como jogar, Créditos, Ajustes).
import { protecoesAtivas } from '../../engine/reducer';
import { rotuloTag, type App, type Tela } from '../app';
import { botao, h } from '../dom';
import { cartaDefesa, listaProtecoes } from '../components/componentes';

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

export function apagarProgresso(app: App) {
  if (confirm('Apagar todo o progresso salvo neste navegador? Níveis liberados, proteções e partida em andamento serão perdidos.')) app.resetar();
}

/** Resumo das regras com a "anatomia" da mensagem e da carta, mostrado na tela inicial. */
function resumoRegras(app: App): HTMLElement {
  const exemplo = app.ctx.conteudo.defesas.CODIGO_E_MEU;
  const marca = (n: number, cls: string) => h('span', { class: `marca ${cls}`, 'aria-hidden': 'true' }, String(n));
  return h('section', { class: 'resumo', 'aria-labelledby': 'resumo-titulo' },
    h('h2', { id: 'resumo-titulo', class: 'subtitulo' }, 'Regras em 30 segundos'),
    h('ol', { class: 'passos' },
      h('li', {}, 'A ', h('b', {}, 'Máscara'), ' (o golpista) manda uma mensagem de golpe.'),
      h('li', {}, 'Você responde com ', h('b', {}, '1 carta'), ' da sua mão.'),
      h('li', {}, 'Você vence a rodada se a carta ', h('b', {}, 'anula todas as táticas'), ' da mensagem, ou se a ', h('b', {}, 'força'), ' dela for ', h('b', {}, 'maior'), ' que a pressão. Empate é da Máscara.'),
      h('li', {}, 'Quem vence 2 rodadas leva o caso. Quem faz 3 pontos leva o nível.'),
      h('li', {}, h('b', {}, 'Cuidado com as respostas erradas: '), 'a cada caso a Máscara mistura na sua mão cartas que parecem boas (força 3!), mas são atitudes erradas. Elas sempre perdem. Quanto mais o nível avança, mais delas aparecem.')),

    h('div', { class: 'anatomia' },
      h('div', { class: 'anatomia-item' },
        h('div', { class: 'anatomia-figura' },
          h('div', { class: 'balao mini-balao' },
            h('p', { class: 'msg' }, 'Me fala o código que chegou por SMS?'),
            h('div', { class: 'balao-pe' },
              h('span', { class: 'pressao' }, 'Pressão 2'), marca(1, 'm-pressao'),
              h('ul', { class: 'tags' }, h('li', {}, rotuloTag(app, 'CODIGO'))), marca(2, 'm-tag')))),
        h('dl', { class: 'legenda-anatomia' },
          h('dt', {}, marca(1, ''), ' Pressão (1 a 5)'), h('dd', {}, 'A força da mensagem. Quanto maior, mais difícil vencer.'),
          h('dt', {}, marca(2, ''), ' Rótulo de tática'), h('dd', {}, 'O truque usado: medo, pressa, prêmio… ou o que o golpista pede (link, código, Pix). A partir do nível 2 os rótulos ficam ocultos: leia a mensagem!'))),
      h('div', { class: 'anatomia-item' },
        h('div', { class: 'anatomia-figura' },
          h('div', { class: 'carta-exemplo' },
            cartaDefesa(app, exemplo, { tecla: 1, compacta: true }),
            marca(3, 'm-tecla'), marca(4, 'm-forca'), marca(5, 'm-contra'))),
        h('dl', { class: 'legenda-anatomia' },
          h('dt', {}, marca(3, ''), ' Número pequeno'), h('dd', {}, 'A posição da carta na mão: é a tecla de atalho (1 a 8).'),
          h('dt', {}, marca(4, ''), ' Número verde'), h('dd', {}, 'A força da carta (1 a 3). Vence se for maior que a pressão.'),
          h('dt', {}, marca(5, ''), ' Rótulos da carta'), h('dd', {}, 'As táticas que ela anula. Se anular todas as da mensagem, é contra perfeito: vence sempre.')))),
    h('p', { class: 'mini' }, 'Dica: no fim de cada caso, o Raio-X mostra os sinais do golpe e como agir na vida real.'));
}

export function telaMenu(app: App): Tela {
  const emAndamento = !!app.estado.retomar;
  const temProgresso = app.estado.progresso.desbloqueados.length > 1 || app.estado.progresso.protecoes.length > 0
    || Object.keys(app.estado.progresso.melhorIndice).length > 0 || !!app.estado.partida;
  return {
    el: h('div', { class: 'tela menu' },
      h('div', { class: 'menu-topo' },
        h('h1', { class: 'logo' }, 'Não Clica!'),
        h('p', { class: 'slogan' }, 'Um jogo de cartas contra os golpes digitais.'),
        h('nav', { class: 'menu-botoes', 'aria-label': 'Menu principal' },
          emAndamento ? botao('Continuar partida', () => app.dispatch({ tipo: 'RETOMAR' }), { class: 'btn primario', 'data-foco': '' }) : null,
          botao('Jogar', () => app.dispatch({ tipo: 'ABRIR_MAPA' }), { class: `btn ${emAndamento ? '' : 'primario'}`, 'data-foco': emAndamento ? undefined : '' }),
          botao('Como jogar', () => app.abrirPainel('comoJogar')),
          botao('Créditos e fontes', () => app.abrirPainel('creditos')),
          botao('Ajustes', () => app.abrirPainel('ajustes')),
          botao('Apagar progresso', () => apagarProgresso(app), {
            class: 'btn perigo-leve', disabled: !temProgresso,
            title: temProgresso ? 'Apaga níveis liberados, proteções e a partida em andamento' : 'Ainda não há progresso salvo',
          }))),
      resumoRegras(app)),
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
      h('li', {}, h('b', {}, 'Respostas erradas'), ': cada caso mistura na sua mão 1 ou 2 cartas de atitudes erradas (ex.: "Passo o código, é do suporte oficial"). Elas parecem fortes, mas sempre perdem, e saem da mão quando o caso termina. O Raio-X explica por que estão erradas.'),
      h('li', {}, `Cada nível tem 5 casos. Quem fizer ${c.pontosParaVencerNivel} pontos primeiro vence.`),
      h('li', {}, 'Entre os casos, a loja repõe sua mão. Ao vencer um nível, você ganha uma proteção permanente.'),
      h('li', {}, 'A partir do nível 2 as táticas ficam ocultas: leia a mensagem! O Desconfiômetro revela as táticas (3 cargas por nível).')),
    h('h2', { class: 'subtitulo' }, 'Táticas'),
    h('ul', { class: 'tags-legenda' }, app.ctx.conteudo.tags.map((t) => h('li', {}, h('strong', {}, rotuloTag(app, t.id)), ` — ${t.ideia}`))),
    h('h2', { class: 'subtitulo' }, 'Teclado'),
    h('p', {}, '1–9 e 0 escolhem a carta · Enter joga/continua · D usa o Desconfiômetro · M liga/desliga a música · Esc volta.'));
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
    h('h2', { class: 'subtitulo' }, 'Matriz BR-Fraude'),
    h('p', {}, 'Os casos e as cartas dos níveis seguem a Matriz BR-Fraude (v2, out/2026), um mapa de 52 golpes brasileiros, técnicas e mitigações baseado no ',
      h('a', { href: 'https://ctid.mitre.org/fraud', target: '_blank', rel: 'noopener noreferrer' }, 'MITRE Fight Fraud Framework (F3)'),
      '. O Raio-X de cada caso mostra os códigos do golpe na Matriz (ex.: BR-GP018).'),
    h('h2', { class: 'subtitulo' }, 'Trilha sonora'),
    h('p', {}, '"Terminal Noturno": música generativa composta para o jogo e sintetizada ao vivo no navegador. Cada ciclo dura cerca de 20 minutos e recomeça variado, sem fim.'),
    h('h2', { class: 'subtitulo' }, 'Tipografia e mecânica'),
    h('p', {}, 'Fonte de títulos: Silkscreen, de Jason Kottke (SIL Open Font License 1.1). Texto: fonte do sistema.'),
    h('p', {}, 'Mecânica inspirada em jogos de cartas roguelike e no truco. Ilustrações e música próprias.'));
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
    opcao('Música (trilha "Terminal Noturno")', a.som, (v) => app.salvarAjustes({ ...a, som: v })),
    h('p', { class: 'mini' }, 'O progresso fica salvo só neste navegador. Nada é enviado para a internet.'),
    botao('Apagar progresso', () => apagarProgresso(app), { class: 'btn perigo' }));
}
