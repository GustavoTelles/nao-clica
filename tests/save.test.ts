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

describe('migração de saves antigos', () => {
  it('v1 (com loja): mantém o progresso, descarta a partida antiga e usa a trilha principal', () => {
    const v1 = JSON.stringify({ versao: 1, estado: { fase: 'LOJA', progresso: { desbloqueados: ['N1_GOLPES', 'N2_BANCO'], protecoes: ['P_2FA'], melhorIndice: { N1_GOLPES: 70 } }, partida: { nivelId: 'N2_BANCO', loja: {} } }, ajustes: { som: true, trilha: 'gerada' } });
    const s = carregarSave(v1, ini, niveis, prots);
    expect(s.estado.progresso.desbloqueados).toEqual(['N1_GOLPES', 'N2_BANCO']);
    expect(s.estado.progresso.protecoes).toEqual(['P_2FA']);
    expect(s.estado.partida).toBeNull();
    expect(s.estado.fase).toBe('MENU');
    expect(s.ajustes.trilha).toBe('gerada');
  });
  it('v2: mantém a partida e volta para a trilha principal (No Breu)', () => {
    const v2 = JSON.stringify({ versao: 2, estado: { fase: 'MAPA', progresso: { desbloqueados: ['N1_GOLPES'], protecoes: [], melhorIndice: {} }, partida: null }, ajustes: { som: true, trilha: 'faixa' } });
    expect(carregarSave(v2, ini, niveis, prots).ajustes.trilha).toBe('gerada');
  });
  it('v3: respeita a trilha escolhida', () => {
    const v3 = JSON.stringify({ versao: 3, estado: { fase: 'MENU', progresso: { desbloqueados: ['N1_GOLPES'], protecoes: [], melhorIndice: {} }, partida: null }, ajustes: { som: true, trilha: 'faixa' } });
    expect(carregarSave(v3, ini, niveis, prots).ajustes.trilha).toBe('faixa');
  });
});
