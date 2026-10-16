// Monta, com o próprio motor, os estados salvos usados nas capturas de tela do guia.
import { carregarConteudo, config } from '../../src/content';
import { estadoInicial, reducer, type Ctx } from '../../src/engine/reducer';
import { ehContraPerfeito } from '../../src/engine/rules';
import { serializarSave, AJUSTES_PADRAO } from '../../src/engine/save';
import type { Acao, Estado } from '../../src/engine/types';

const conteudo = carregarConteudo();
const ctx: Ctx = { conteudo, config };
const ajustes = { ...AJUSTES_PADRAO, animacoesReduzidas: true };

const run = (e: Estado, ...acoes: Acao[]) => acoes.reduce((s, a) => {
  const r = reducer(s, a, ctx);
  if (r.erro) throw new Error(`${a.tipo}: ${r.erro}`);
  return r;
}, e);

const melhor = (e: Estado) => {
  const p = e.partida!;
  return p.mao.find((id) => ehContraPerfeito(p.cartaAmeaca!, conteudo.defesas[id])) ?? p.mao[0];
};

const cenas: Record<string, Estado> = {};
let e = estadoInicial(conteudo);
cenas.menu = e;
e = run(e, { tipo: 'ABRIR_MAPA' });
cenas.mapa = { ...e, progresso: { ...e.progresso, desbloqueados: ['N1_GOLPES', 'N2_BANCO'], melhorIndice: { N1_GOLPES: 86 } } };
e = run(e, { tipo: 'INICIAR_NIVEL', nivelId: 'N1_GOLPES', seed: 1 });
cenas.intro = e;
e = run(e, { tipo: 'INICIAR_CENARIO' }, { tipo: 'AMEACA_JOGA' });
cenas.mesa = e;
e = run(e, { tipo: 'JOGAR_CARTA', cartaId: melhor(e) });
cenas.resolucao = e;
e = run(e, { tipo: 'CONTINUAR' }, { tipo: 'AMEACA_JOGA' });
e = run(e, { tipo: 'JOGAR_CARTA', cartaId: melhor(e) }, { tipo: 'CONTINUAR' });
cenas.raiox = e;

// Nível 2: táticas ocultas, com e sem o Desconfiômetro.
let n2 = estadoInicial(conteudo);
n2 = { ...n2, progresso: { desbloqueados: ['N1_GOLPES', 'N2_BANCO'], protecoes: ['P_LIMITES'], melhorIndice: {} } };
n2 = run(n2, { tipo: 'INICIAR_NIVEL', nivelId: 'N2_BANCO', seed: 7 }, { tipo: 'INICIAR_CENARIO' }, { tipo: 'AMEACA_JOGA' });
cenas.oculta = n2;
cenas.desconfiometro = run(n2, { tipo: 'USAR_DESCONFIOMETRO' });
// Uma vaza perdida, para mostrar a explicação da derrota.
const errada = n2.partida!.mao.find((id) => !ehContraPerfeito(n2.partida!.cartaAmeaca!, conteudo.defesas[id]))!;
cenas.derrota = run(n2, { tipo: 'JOGAR_CARTA', cartaId: errada });

// Fim de nível com vitória: joga o nível 1 inteiro com contras perfeitos.
let f = run(estadoInicial(conteudo), { tipo: 'INICIAR_NIVEL', nivelId: 'N1_GOLPES', seed: 1 });
while (f.fase !== 'FIM_NIVEL') {
  if (f.fase === 'INTRO_CENARIO') f = run(f, { tipo: 'INICIAR_CENARIO' });
  else if (f.fase === 'VEZ_AMEACA') f = run(f, { tipo: 'AMEACA_JOGA' });
  else if (f.fase === 'VEZ_JOGADOR') f = run(f, { tipo: 'JOGAR_CARTA', cartaId: melhor(f) });
  else f = run(f, { tipo: 'CONTINUAR' });
}
cenas.fim = f;
cenas.recompensa = run(f, { tipo: 'CONTINUAR' });

const saida = Object.fromEntries(Object.entries(cenas).map(([k, v]) => [k, serializarSave(v, ajustes)]));
process.stdout.write(JSON.stringify(saida));
