// IA da ameaça (GDD §4.8).
import { inteiro } from './rng';
import { ehContraPerfeito } from './rules';
import type { CartaAmeaca, CartaDefesa, ModoIA } from './types';

export function contrasNaMao(opcao: CartaAmeaca, mao: string[], defesas: Record<string, CartaDefesa>): number {
  return mao.filter((id) => defesas[id] && ehContraPerfeito(opcao, defesas[id])).length;
}

export function escolherOpcao(
  modo: ModoIA,
  opcoes: CartaAmeaca[],
  mao: string[],
  defesas: Record<string, CartaDefesa>,
  rng: number,
): [CartaAmeaca, number] {
  if (opcoes.length === 1 || modo === 'roteiro') return [opcoes[0], rng];
  if (modo === 'aleatoria') {
    const [i, s] = inteiro(rng, opcoes.length);
    return [opcoes[i], s];
  }
  const contagens = opcoes.map((o) => contrasNaMao(o, mao, defesas));
  const menor = Math.min(...contagens);
  const empatadas = opcoes.filter((_, i) => contagens[i] === menor);
  const [i, s] = inteiro(rng, empatadas.length);
  return [empatadas[i], s];
}
