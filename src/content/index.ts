// Carrega e valida o conteúdo empacotado (JSON) e devolve o objeto tipado do motor.
import { z } from 'zod';
import type { Config, Conteudo } from '../engine/types';
import configJson from '../../config.json';
import tagsJson from './tags.json';
import defesasJson from './defesas.json';
import protecoesJson from './protecoes.json';
import fontesJson from './fontes.json';
import nivel1 from './niveis/01-golpes.json';
import nivel2 from './niveis/02-banco.json';
import nivel3 from './niveis/03-comercio.json';
import nivel4 from './niveis/04-redes.json';
import nivel5 from './niveis/05-malware.json';
import { CartaDefesaSchema, FonteSchema, NivelSchema, ProtecaoSchema, TagInfoSchema } from './schema';

const porId = <T extends { id: string }>(lista: T[]) => Object.fromEntries(lista.map((x) => [x.id, x]));

export function carregarConteudo(): Conteudo {
  const niveis = z.array(NivelSchema).parse([nivel1, nivel2, nivel3, nivel4, nivel5]).sort((a, b) => a.ordem - b.ordem);
  return {
    tags: z.array(TagInfoSchema).parse(tagsJson),
    defesas: porId(z.array(CartaDefesaSchema).parse(defesasJson)),
    protecoes: porId(z.array(ProtecaoSchema).parse(protecoesJson)),
    fontes: porId(z.array(FonteSchema).parse(fontesJson)),
    niveis: niveis as Conteudo['niveis'],
  };
}

export const config = configJson as Config;
