// Validação estrutural do conteúdo com Zod (espelha GDD §12.4).
import { z } from 'zod';
import { CANAIS, TAGS, PEDIDOS } from '../engine/types';

const Tag = z.enum(TAGS);
const Pedido = z.enum(PEDIDOS);

export const FonteSchema = z.object({ id: z.string(), titulo: z.string(), url: z.string().url() });

export const TagInfoSchema = z.object({
  id: Tag, tipo: z.enum(['gatilho', 'pedido']), icone: z.string(), rotulo: z.string(), ideia: z.string(),
});

export const CartaDefesaSchema = z.object({
  id: z.string(), nome: z.string(), contra: z.array(Tag).min(1),
  forca: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  raridade: z.enum(['comum', 'incomum', 'rara']),
  licao: z.string(), fonte: z.string(), verificar: z.boolean().optional(),
  usoUnicoPorNivel: z.boolean().optional(), armadilha: z.boolean().optional(), mito: z.string().optional(),
  matriz: z.string().regex(/^M\d{2}$/).optional(),
});

export const CartaAmeacaSchema = z.object({
  id: z.string(), mensagem: z.string(), tags: z.array(Tag).min(1).max(2),
  pressao: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
  sinais: z.array(z.string()),
});

const VazaSchema = z.object({
  papel: z.enum(['abordagem', 'escalada', 'pedido']),
  opcoes: z.array(CartaAmeacaSchema).min(1).max(2),
});

export const CenarioSchema = z.object({
  id: z.string(), titulo: z.string(), canal: z.enum(CANAIS), persona: z.string(), contexto: z.string(),
  vazas: z.tuple([VazaSchema, VazaSchema, VazaSchema]),
  desfechoVitoria: z.string(), desfechoDerrota: z.string(),
  raioX: z.object({ oQueEra: z.string(), comoAgir: z.array(z.string()).min(1), verificar: z.boolean().optional() }),
  contencao: z.object({
    opcoes: z.tuple([z.string(), z.string(), z.string()]),
    correta: z.union([z.literal(0), z.literal(1), z.literal(2)]), explicacao: z.string(),
  }).optional(),
  fonte: z.string(),
  matriz: z.array(z.string().regex(/^BR-GP\d{3}$/)).optional(),
});

export const NivelSchema = z.object({
  id: z.string(), ordem: z.number().int(), titulo: z.string(), fontes: z.array(z.string()),
  regras: z.object({
    tagsVisiveis: z.boolean(), pressaoMin: z.number(), pressaoMax: z.number(), combos: z.boolean(),
    ia: z.enum(['roteiro', 'aleatoria', 'adaptativa']),
    desmascarar: z.boolean(), armadilhasNaLoja: z.boolean(), rarasNaLoja: z.boolean(),
  }),
  pool: z.array(z.string()), maoInicial: z.array(z.string()),
  cenarios: z.array(CenarioSchema), recompensas: z.array(z.string()),
});

const Efeito = z.discriminatedUnion('tipo', [
  z.object({ tipo: z.literal('pressao'), tags: z.array(Tag), delta: z.number() }),
  z.object({ tipo: z.literal('forca'), contraTags: z.array(Tag), delta: z.number() }),
  z.object({ tipo: z.literal('converterDerrotaVaza'), tags: z.array(Tag), usosPorNivel: z.number() }),
  z.object({ tipo: z.literal('anularPontoCenario'), pedido: Pedido, usosPorNivel: z.number() }),
  z.object({ tipo: z.literal('desconfiometro'), delta: z.number() }),
  z.object({ tipo: z.literal('reservado') }),
]);

export const ProtecaoSchema = z.object({
  id: z.string(), nome: z.string(), descricao: z.string(), fonte: z.string(), efeito: Efeito,
});
