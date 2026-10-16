// Resolução da vaza — implementa exatamente o pseudocódigo do GDD §4.5.
import type { CartaAmeaca, CartaDefesa, Config, Protecao, ResultadoVaza, Tag } from './types';

const intersecta = (a: readonly Tag[], b: readonly Tag[]) => a.some((t) => b.includes(t));

export function pressaoEfetiva(ameaca: CartaAmeaca, protecoes: Protecao[]): number {
  let p = ameaca.pressao;
  for (const pr of protecoes) {
    if (pr.efeito.tipo === 'pressao' && intersecta(ameaca.tags, pr.efeito.tags)) p += pr.efeito.delta;
  }
  return Math.max(1, p);
}

export function bonusForca(defesa: CartaDefesa, protecoes: Protecao[]): number {
  let b = 0;
  for (const pr of protecoes) {
    if (pr.efeito.tipo === 'forca' && intersecta(defesa.contra, pr.efeito.contraTags)) b += pr.efeito.delta;
  }
  return b;
}

/** Contra perfeito: a defesa anula todas as tags da ameaça. */
export function ehContraPerfeito(ameaca: CartaAmeaca, defesa: CartaDefesa): boolean {
  return !defesa.armadilha && ameaca.tags.every((t) => defesa.contra.includes(t));
}

export interface ContextoResolucao {
  protecoes: Protecao[];
  config: Config;
  /** Usos restantes por proteção reativa no nível. Ausente = sem limite conhecido (trata como 0). */
  usosRestantes?: Record<string, number>;
}

export function resolverVaza(A: CartaAmeaca, D: CartaDefesa, ctx: ContextoResolucao): ResultadoVaza {
  const n = A.tags.length;
  const pressao = pressaoEfetiva(A, ctx.protecoes);
  const base = { pressao, n, ameacaId: A.id, defesaId: D.id };

  let res: ResultadoVaza;
  if (D.armadilha) {
    res = { ...base, vencedor: 'ameaca', motivo: 'armadilha', forca: D.forca, k: 0 };
  } else {
    const k = A.tags.filter((t) => D.contra.includes(t)).length;
    if (k === n) {
      res = { ...base, vencedor: 'defesa', motivo: 'contra_perfeito', forca: D.forca, k };
    } else {
      let forca = D.forca + bonusForca(D, ctx.protecoes);
      const motivo = k > 0 ? 'contra_parcial' : 'forca';
      if (k > 0) forca += ctx.config.bonusContraParcial;
      const defesaVence = forca > pressao || (forca === pressao && ctx.config.empateFavorece === 'defesa');
      res = { ...base, vencedor: defesaVence ? 'defesa' : 'ameaca', motivo, forca, k };
    }
  }

  // Proteções reativas (ex.: 2FA) podem converter uma derrota.
  if (res.vencedor === 'ameaca') {
    for (const pr of ctx.protecoes) {
      if (pr.efeito.tipo !== 'converterDerrotaVaza') continue;
      if (!intersecta(A.tags, pr.efeito.tags)) continue;
      if ((ctx.usosRestantes?.[pr.id] ?? 0) <= 0) continue;
      return { ...res, vencedor: 'defesa', motivo: 'protecao', protecaoUsada: pr.id };
    }
  }
  return res;
}
