import { describe, expect, it } from 'vitest';
import { escolherOpcao } from '../src/engine/ai';
import { ameaca, conteudo } from './helpers';

describe('IA da ameaça', () => {
  const op = [ameaca(['CODIGO'], 3, 'cod'), ameaca(['SENHA'], 3, 'sen')];
  it('roteiro joga a 1ª opção', () => {
    expect(escolherOpcao('roteiro', op, [], conteudo.defesas, 1)[0].id).toBe('cod');
  });
  it('adaptativa escolhe a opção com menos contras na mão', () => {
    expect(escolherOpcao('adaptativa', op, ['CODIGO_E_MEU'], conteudo.defesas, 1)[0].id).toBe('sen');
    expect(escolherOpcao('adaptativa', op, ['SENHA_NINGUEM', 'DUAS_ETAPAS'], conteudo.defesas, 1)[0].id).toBe('cod');
  });
  it('aleatória é determinística pela semente', () => {
    const a = escolherOpcao('aleatoria', op, [], conteudo.defesas, 99);
    expect(escolherOpcao('aleatoria', op, [], conteudo.defesas, 99)).toEqual(a);
  });
});
