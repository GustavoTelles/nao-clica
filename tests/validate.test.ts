import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import { lerBloqueio, validar } from '../scripts/validate-content';
import type { Conteudo } from '../src/engine/types';
import { cfg, conteudo } from './helpers';

const bloqueio = lerBloqueio(fileURLToPath(new URL('../scripts/marcas-bloqueadas.txt', import.meta.url)));
const copia = (): Conteudo => structuredClone(conteudo);

describe('validador de conteúdo (GDD §13)', () => {
  it('o conteúdo atual passa sem erros', () => {
    expect(validar(conteudo, cfg, bloqueio).erros).toEqual([]);
  });

  it('pega domínio real, telefone fora do DDD 00, marca real e sinal inexistente', () => {
    const c = copia();
    const a = c.niveis[0].cenarios[0].vazas[0].opcoes[0];
    a.mensagem = 'Acesse premios.com.br ou ligue (11) 91234-5678 — oferta Nubank';
    a.sinais = ['não existe'];
    const { erros } = validar(c, cfg, bloqueio);
    expect(erros.some((e) => e.includes('domínio não reservado'))).toBe(true);
    expect(erros.some((e) => e.includes('DDD 11'))).toBe(true);
    expect(erros.some((e) => e.includes('termo bloqueado "nubank"'))).toBe(true);
    expect(erros.some((e) => e.includes('sinal não é trecho exato'))).toBe(true);
  });

  it('pega ameaça impossível de vencer e pressão fora da faixa', () => {
    const c = copia();
    c.niveis[0].cenarios[0].vazas[2].opcoes[0].pressao = 5;
    c.niveis[0].pool = c.niveis[0].pool.filter((id) => !conteudo.defesas[id].contra.includes('LINK'));
    const { erros } = validar(c, cfg, bloqueio);
    expect(erros.some((e) => e.includes('pressão 5 fora'))).toBe(true);
    expect(erros.some((e) => e.includes('nenhuma carta do pool vence'))).toBe(true);
    expect(erros.some((e) => e.includes('tag LINK sem contra'))).toBe(true);
  });
});
