// Simulação de balanceamento (GDD §14). Uso: npm run simulate -- --nivel 1 --partidas 2000
import { carregarConteudo, config } from '../src/content';
import { estadoInicial, indiceDesconfianca, reducer, type Ctx } from '../src/engine/reducer';
import { inteiro } from '../src/engine/rng';
import { ehContraPerfeito, resolverVaza } from '../src/engine/rules';
import type { Acao, CartaDefesa, Estado, Tag } from '../src/engine/types';

export type Bot = 'otimo' | 'guloso' | 'aleatorio';

const valor = (d: CartaDefesa) => d.contra.length + d.forca;

function escolherCarta(bot: Bot, e: Estado, ctx: Ctx, rng: number): [string, number] {
  const p = e.partida!;
  const defs = ctx.conteudo.defesas;
  const mao = p.mao;
  if (bot === 'aleatorio') { const [i, s] = inteiro(rng, mao.length); return [mao[i], s]; }
  if (bot === 'guloso') return [[...mao].sort((a, b) => defs[b].forca - defs[a].forca)[0], rng];

  // ótimo: vê as tags. Contra perfeito mais especializado; senão o mais barato que vence; senão sacrifica o de menor valor.
  const A = p.cartaAmeaca!;
  const porValor = [...mao].sort((a, b) => valor(defs[a]) - valor(defs[b]));
  const perfeito = porValor.find((id) => ehContraPerfeito(A, defs[id]));
  if (perfeito) return [perfeito, rng];
  const vence = porValor.find((id) => resolverVaza(A, defs[id], { protecoes: [], config: ctx.config }).vencedor === 'defesa');
  return [vence ?? porValor[0], rng];
}

function escolherLoja(bot: Bot, e: Estado, ctx: Ctx, rng: number): [string[], number] {
  const p = e.partida!;
  const { oferta, precisa } = p.loja!;
  const defs = ctx.conteudo.defesas;
  const mao = [...p.mao];
  const pode = (id: string) => mao.filter((x) => x === id).length < ctx.config.maxCopias;
  let ordem = [...oferta];
  let s = rng;

  if (bot === 'aleatorio') {
    for (let i = ordem.length - 1; i > 0; i--) { const [j, ns] = inteiro(s, i + 1); s = ns; [ordem[i], ordem[j]] = [ordem[j], ordem[i]]; }
  } else if (bot === 'guloso') {
    ordem.sort((a, b) => defs[b].forca - defs[a].forca);
  } else {
    // ótimo: prioriza cobrir as tags do próximo caso que a mão ainda não anula.
    const nivel = ctx.conteudo.niveis.find((n) => n.id === p.nivelId)!;
    const prox = nivel.cenarios[p.cenarioIdx + 1];
    const tags = new Set<Tag>(prox ? prox.vazas.flatMap((v) => v.opcoes.flatMap((o) => o.tags)) : []);
    const coberta = (t: Tag, m: string[]) => m.some((id) => defs[id].contra.includes(t));
    const nota = (id: string) => [...tags].filter((t) => !coberta(t, mao) && defs[id].contra.includes(t)).length * 10 + valor(defs[id]);
    ordem = ordem.sort((a, b) => nota(b) - nota(a));
  }
  const ids: string[] = [];
  for (const id of ordem) {
    if (ids.length === precisa) break;
    if (pode(id)) { ids.push(id); mao.push(id); }
  }
  return [ids, s];
}

export interface ResultadoSim { vitorias: number; partidas: number; indiceMedio: number }

export function simular(nivelOrdem: number, bot: Bot, partidas: number): ResultadoSim {
  const conteudo = carregarConteudo();
  const ctx: Ctx = { conteudo, config };
  const nivel = conteudo.niveis.find((n) => n.ordem === nivelOrdem);
  if (!nivel) throw new Error(`Nível ${nivelOrdem} não existe.`);
  let vitorias = 0;
  let somaIndice = 0;

  for (let seed = 1; seed <= partidas; seed++) {
    let e = estadoInicial(conteudo);
    e = { ...e, progresso: { ...e.progresso, desbloqueados: conteudo.niveis.map((n) => n.id) } };
    let rng = seed * 7919;
    const despachar = (a: Acao) => {
      const r = reducer(e, a, ctx);
      if (r.erro) throw new Error(`${a.tipo} em ${e.fase}: ${r.erro}`);
      e = r;
    };
    despachar({ tipo: 'INICIAR_NIVEL', nivelId: nivel.id, seed });
    for (let passos = 0; passos < 500 && e.fase !== 'FIM_NIVEL'; passos++) {
      switch (e.fase) {
        case 'INTRO_CENARIO': despachar({ tipo: 'INICIAR_CENARIO' }); break;
        case 'VEZ_AMEACA': despachar({ tipo: 'AMEACA_JOGA' }); break;
        case 'VEZ_JOGADOR': { const [id, s] = escolherCarta(bot, e, ctx, rng); rng = s; despachar({ tipo: 'JOGAR_CARTA', cartaId: id }); break; }
        case 'RESOLUCAO': case 'RAIOX': despachar({ tipo: 'CONTINUAR' }); break;
        case 'LOJA': { const [ids, s] = escolherLoja(bot, e, ctx, rng); rng = s; despachar({ tipo: 'ESCOLHER_LOJA', ids }); break; }
        default: throw new Error(`Fase inesperada ${e.fase}`);
      }
    }
    if (e.partida!.resultado === 'vitoria') vitorias++;
    somaIndice += indiceDesconfianca(e.partida!);
  }
  return { vitorias, partidas, indiceMedio: somaIndice / partidas };
}

const arg = (nome: string, padrao: string) => {
  const i = process.argv.indexOf(`--${nome}`);
  return i >= 0 ? process.argv[i + 1] : padrao;
};

const conteudo = carregarConteudo();
const partidas = Number(arg('partidas', '2000'));
const niveis = arg('nivel', 'todos') === 'todos' ? conteudo.niveis.map((n) => n.ordem) : [Number(arg('nivel', '1'))];
for (const n of niveis) {
  console.log(`\nNível ${n} — ${partidas} partidas por bot`);
  for (const bot of ['otimo', 'guloso', 'aleatorio'] as Bot[]) {
    const r = simular(n, bot, partidas);
    console.log(`  ${bot.padEnd(10)} vitória ${(100 * r.vitorias / r.partidas).toFixed(1).padStart(5)}%   índice médio ${r.indiceMedio.toFixed(0)}%`);
  }
}
