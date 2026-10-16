import { describe, expect, it } from 'vitest';
import { estadoInicial } from '../src/engine/reducer';
import { AJUSTES_PADRAO, carregarSave, serializarSave } from '../src/engine/save';
import { conteudo } from './helpers';

const ini = estadoInicial(conteudo);
const niveis = conteudo.niveis.map((n) => n.id);
const prots = Object.keys(conteudo.protecoes);

describe('save', () => {
  it.each([null, '', '{quebrado', '[]', '{"versao":99}', '{"versao":1,"estado":{"progresso":5}}'])(
    'entrada inválida (%s) vira estado inicial',
    (raw) => {
      expect(carregarSave(raw, ini, niveis, prots).estado).toEqual(ini);
    },
  );
  it('ida e volta preserva o progresso e descarta ids desconhecidos', () => {
    const e = { ...ini, progresso: { desbloqueados: niveis, protecoes: ['P_2FA', 'NAO_EXISTE'], melhorIndice: { N1_GOLPES: 80 } } };
    const s = carregarSave(serializarSave(e, AJUSTES_PADRAO), ini, niveis, prots);
    expect(s.estado.progresso).toEqual({ ...e.progresso, protecoes: ['P_2FA'] });
    expect(s.estado.fase).toBe('MENU');
  });
});
