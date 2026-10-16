// Loja entre cenários (GDD §4.2).
import { sortearPeso } from './rng';
import type { CartaDefesa, Config, Nivel } from './types';

export function contarCopias(mao: string[], id: string): number {
  return mao.filter((x) => x === id).length;
}

/** Cartas do pool que podem ser oferecidas agora. */
export function candidatasLoja(
  nivel: Nivel,
  defesas: Record<string, CartaDefesa>,
  mao: string[],
  usadosUnicos: string[],
  config: Config,
): string[] {
  return nivel.pool.filter((id) => {
    const d = defesas[id];
    if (!d) return false;
    if (d.raridade === 'rara' && !nivel.regras.rarasNaLoja) return false;
    if (d.armadilha && !nivel.regras.armadilhasNaLoja) return false;
    if (d.usoUnicoPorNivel && usadosUnicos.includes(id)) return false;
    if (contarCopias(mao, id) >= config.maxCopias) return false;
    return true;
  });
}

/** Sorteia `tamanho` cartas distintas, ponderadas por raridade, com no máximo 1 armadilha. */
export function gerarOferta(
  rng: number,
  candidatas: string[],
  defesas: Record<string, CartaDefesa>,
  config: Config,
  tamanho: number,
): [string[], number] {
  const restantes = [...candidatas];
  const oferta: string[] = [];
  let s = rng;
  while (oferta.length < tamanho && restantes.length > 0) {
    const pesos = restantes.map((id) => config.pesosRaridade[defesas[id].raridade]);
    const [i, ns] = sortearPeso(s, pesos);
    s = ns;
    if (i < 0) break;
    const [id] = restantes.splice(i, 1);
    oferta.push(id);
    if (defesas[id].armadilha) {
      for (let j = restantes.length - 1; j >= 0; j--) if (defesas[restantes[j]].armadilha) restantes.splice(j, 1);
    }
  }
  return [oferta, s];
}

/** Valida a escolha da loja. Retorna mensagem de erro ou null. */
export function validarEscolha(ids: string[], oferta: string[], precisa: number, mao: string[], config: Config): string | null {
  if (ids.length !== precisa) return `Escolha exatamente ${precisa} carta(s).`;
  if (new Set(ids).size !== ids.length) return 'Cada carta da oferta só pode ser escolhida uma vez.';
  for (const id of ids) if (!oferta.includes(id)) return 'Carta fora da oferta.';
  const nova = [...mao, ...ids];
  for (const id of new Set(nova)) if (contarCopias(nova, id) > config.maxCopias) return `Máximo de ${config.maxCopias} cópias por carta.`;
  return null;
}
