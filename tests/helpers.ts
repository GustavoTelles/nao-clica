import { carregarConteudo, config } from '../src/content';
import type { CartaAmeaca, CartaDefesa, Tag } from '../src/engine/types';

export const conteudo = carregarConteudo();
export const cfg = config;
export const ctx = { conteudo, config };

export const ameaca = (tags: Tag[], pressao: CartaAmeaca['pressao'], id = 'A'): CartaAmeaca =>
  ({ id, mensagem: 'm', tags, pressao, sinais: [] });
export const defesa = (contra: Tag[], forca: CartaDefesa['forca'], extra: Partial<CartaDefesa> = {}): CartaDefesa =>
  ({ id: 'D', nome: 'd', contra, forca, raridade: 'comum', licao: '', fonte: 'F_GOLPES', ...extra });
