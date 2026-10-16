import { describe, expect, it } from 'vitest';
import { escolherOpcao } from '../src/engine/ai';
import { candidatasLoja, gerarOferta, validarEscolha } from '../src/engine/shop';
import { ameaca, cfg, conteudo } from './helpers';

const n2 = conteudo.niveis[1];

describe('IA da ameaça', () => {
  const op = [ameaca(['CODIGO'], 3, 'cod'), ameaca(['SENHA'], 3, 'sen')];
  it('roteiro joga a 1ª opção', () => {
    expect(escolherOpcao('roteiro', op, [], conteudo.defesas, 1)[0].id).toBe('cod');
  });
  it('adaptativa escolhe a opção com menos contras na mão', () => {
    expect(escolherOpcao('adaptativa', op, ['CODIGO_E_MEU'], conteudo.defesas, 1)[0].id).toBe('sen');
    expect(escolherOpcao('adaptativa', op, ['SENHA_NINGUEM', 'SENHA_NINGUEM'], conteudo.defesas, 1)[0].id).toBe('cod');
  });
  it('aleatória é determinística pela semente', () => {
    const a = escolherOpcao('aleatoria', op, [], conteudo.defesas, 99);
    expect(escolherOpcao('aleatoria', op, [], conteudo.defesas, 99)).toEqual(a);
  });
});

describe('loja', () => {
  it('respeita limite de cópias e uso único', () => {
    expect(candidatasLoja(n2, conteudo.defesas, ['PAUSA', 'PAUSA'], [], cfg)).not.toContain('PAUSA');
    const comBloq = { ...n2, pool: [...n2.pool, 'BLOQUEAR_DENUNCIAR'] };
    expect(candidatasLoja(comBloq, conteudo.defesas, [], [], cfg)).toContain('BLOQUEAR_DENUNCIAR');
    expect(candidatasLoja(comBloq, conteudo.defesas, [], ['BLOQUEAR_DENUNCIAR'], cfg)).not.toContain('BLOQUEAR_DENUNCIAR');
  });
  it('não oferece raras quando o nível não permite', () => {
    expect(candidatasLoja(conteudo.niveis[0], conteudo.defesas, [], [], cfg)).not.toContain('CANAL_OFICIAL');
  });
  it('oferta sem repetição e com no máximo 1 armadilha', () => {
    const pool = ['ARM_CADEADO', 'ARM_SO_OLHAR', 'ARM_RESPONDO', 'PAUSA', 'NAO_CLICO'];
    for (let s = 0; s < 50; s++) {
      const [o] = gerarOferta(s, pool, conteudo.defesas, cfg, 5);
      expect(new Set(o).size).toBe(o.length);
      expect(o.filter((id) => conteudo.defesas[id].armadilha).length).toBeLessThanOrEqual(1);
    }
  });
  it('valida quantidade e cópias', () => {
    expect(validarEscolha(['PAUSA'], ['PAUSA', 'NAO_CLICO'], 2, [], cfg)).toMatch(/exatamente/);
    expect(validarEscolha(['PAUSA'], ['PAUSA'], 1, ['PAUSA', 'PAUSA'], cfg)).toMatch(/cópias/);
    expect(validarEscolha(['PAUSA', 'NAO_CLICO'], ['PAUSA', 'NAO_CLICO'], 2, [], cfg)).toBeNull();
  });
});
