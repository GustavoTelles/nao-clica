// Validador de conteúdo (GDD §13). Uso: npm run validate
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { carregarConteudo, config } from '../src/content';
import { resolverVaza } from '../src/engine/rules';
import type { Config, Conteudo, Tag } from '../src/engine/types';

export interface Relatorio { erros: string[]; avisos: string[] }

const RE_HOST = /\b(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s)]*)?/gi;
const RE_TEL = /\((\d{2})\)\s?\d{4,5}-\d{4}|\b(\d{2})\s\d{4,5}-\d{4}\b/g;
const TLD_OK = ['.example', '.test', '.invalid'];

export function lerBloqueio(caminho: string): string[] {
  return readFileSync(caminho, 'utf8').split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
}

export function verificarTexto(texto: string, onde: string, bloqueio: string[], erros: string[]) {
  for (const m of texto.matchAll(RE_HOST)) {
    const host = m[0].split('/')[0].split('@').pop()!.toLowerCase();
    if (!TLD_OK.some((t) => host.endsWith(t))) erros.push(`${onde}: domínio não reservado "${m[0]}"`);
  }
  for (const m of texto.matchAll(RE_TEL)) {
    const ddd = m[1] ?? m[2];
    if (ddd !== '00') erros.push(`${onde}: telefone com DDD ${ddd} (use 00): "${m[0]}"`);
  }
  for (const termo of bloqueio) {
    const esc = termo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (new RegExp(`(?<![\\p{L}\\d])${esc}(?![\\p{L}\\d])`, 'iu').test(texto)) erros.push(`${onde}: termo bloqueado "${termo}"`);
  }
}

export function validar(c: Conteudo, cfg: Config, bloqueio: string[]): Relatorio {
  const erros: string[] = [];
  const avisos: string[] = [];
  const err = (m: string) => erros.push(m);

  // 1. ids únicos
  const ids = new Map<string, string>();
  const registrar = (id: string, onde: string) => {
    if (ids.has(id)) err(`id duplicado "${id}" (${ids.get(id)} e ${onde})`);
    else ids.set(id, onde);
  };
  Object.keys(c.defesas).forEach((id) => registrar(id, 'defesas'));
  Object.keys(c.protecoes).forEach((id) => registrar(id, 'protecoes'));
  Object.keys(c.fontes).forEach((id) => registrar(id, 'fontes'));
  for (const n of c.niveis) {
    registrar(n.id, 'niveis');
    for (const ce of n.cenarios) {
      registrar(ce.id, n.id);
      for (const v of ce.vazas) for (const o of v.opcoes) registrar(o.id, ce.id);
    }
  }

  for (const d of Object.values(c.defesas)) {
    if (!c.fontes[d.fonte]) err(`defesa ${d.id}: fonte inexistente ${d.fonte}`);
    if (d.armadilha && !d.mito) err(`armadilha ${d.id} sem "mito"`); // 11
    verificarTexto(`${d.nome} ${d.licao} ${d.mito ?? ''}`, `defesa ${d.id}`, bloqueio, erros);
    if (d.verificar) avisos.push(`verificar: lição da defesa ${d.id}`);
  }
  for (const p of Object.values(c.protecoes)) {
    if (!c.fontes[p.fonte]) err(`proteção ${p.id}: fonte inexistente ${p.fonte}`);
    verificarTexto(`${p.nome} ${p.descricao}`, `proteção ${p.id}`, bloqueio, erros);
  }

  for (const n of c.niveis) {
    const N = `nível ${n.id}`;
    // 2. referências
    for (const id of [...n.pool, ...n.maoInicial]) if (!c.defesas[id]) err(`${N}: defesa inexistente ${id}`);
    for (const id of n.recompensas) if (!c.protecoes[id]) err(`${N}: proteção inexistente ${id}`);
    for (const id of n.fontes) if (!c.fontes[id]) err(`${N}: fonte inexistente ${id}`);
    if (n.recompensas.length !== 3) err(`${N}: precisa de 3 recompensas`);
    // 3. estrutura
    if (n.cenarios.length !== cfg.cenariosPorNivel) err(`${N}: tem ${n.cenarios.length} cenários (esperado ${cfg.cenariosPorNivel})`);
    // 4. mão inicial
    if (n.maoInicial.length !== cfg.tamanhoMao) err(`${N}: mão inicial com ${n.maoInicial.length} cartas`);
    for (const id of n.maoInicial) if (!n.pool.includes(id)) err(`${N}: ${id} da mão inicial fora do pool`);
    // 11. armadilhas
    for (const id of n.pool) if (c.defesas[id]?.armadilha && !n.regras.armadilhasNaLoja) err(`${N}: armadilha ${id} em nível sem armadilhas`);

    const poolOk = n.pool.map((id) => c.defesas[id]).filter((d) => d && !d.armadilha);
    const tagsUsadas = new Set<Tag>();

    n.cenarios.forEach((ce, i) => {
      const C = `${N} › ${ce.id}`;
      if (!c.fontes[ce.fonte]) err(`${C}: fonte inexistente ${ce.fonte}`);
      const papeis = ce.vazas.map((v) => v.papel).join(',');
      if (papeis !== 'abordagem,escalada,pedido') err(`${C}: ordem das vazas "${papeis}"`);
      const teto = n.regras.pressaoMax + (i === n.cenarios.length - 1 ? cfg.pressaoBonusChefe : 0);
      verificarTexto(
        [ce.titulo, ce.persona, ce.contexto, ce.desfechoVitoria, ce.desfechoDerrota, ce.raioX.oQueEra, ...ce.raioX.comoAgir].join(' \n '),
        C, bloqueio, erros,
      );
      if (ce.raioX.verificar) avisos.push(`verificar: Raio-X de ${ce.id}`);
      // Tentações: armadilhas que entram na mão só durante o caso.
      const tent = ce.tentacoes ?? [];
      if (tent.length > cfg.maxTentacoesPorCenario) err(`${C}: ${tent.length} tentações (máx. ${cfg.maxTentacoesPorCenario})`);
      if (new Set(tent).size !== tent.length) err(`${C}: tentação repetida`);
      if (cfg.tamanhoMao + tent.length > 10) err(`${C}: mão passaria de 10 cartas (atalhos 1–9 e 0)`);
      for (const id of tent) {
        const d = c.defesas[id];
        if (!d) err(`${C}: tentação inexistente ${id}`);
        else if (!d.armadilha || !d.mito) err(`${C}: tentação ${id} precisa ser armadilha com "mito"`);
        else if (d.verificar) avisos.push(`verificar: tentação ${id} usada em ${ce.id}`);
      }

      for (const v of ce.vazas) {
        if (v.opcoes.length < 1 || v.opcoes.length > 2) err(`${C}: vaza ${v.papel} com ${v.opcoes.length} opções`);
        for (const A of v.opcoes) {
          const O = `${C} › ${A.id}`;
          A.tags.forEach((t) => tagsUsadas.add(t));
          // 5. pressão
          if (A.pressao < n.regras.pressaoMin || A.pressao > teto) err(`${O}: pressão ${A.pressao} fora de [${n.regras.pressaoMin}, ${teto}]`);
          // 6. combos
          if (!n.regras.combos && A.tags.length !== 1) err(`${O}: nível sem combos exige 1 tag`);
          // 7. vencibilidade
          if (!poolOk.some((d) => resolverVaza(A, d, { protecoes: [], config: cfg }).vencedor === 'defesa')) err(`${O}: nenhuma carta do pool vence esta ameaça`);
          // 9. sinais e tamanho
          if (A.mensagem.length > 180) err(`${O}: mensagem com ${A.mensagem.length} caracteres (máx. 180)`);
          for (const s of A.sinais) if (!A.mensagem.includes(s)) err(`${O}: sinal não é trecho exato: "${s}"`);
          if (A.sinais.length === 0) err(`${O}: sem sinais`);
          // 10. segurança
          verificarTexto(A.mensagem, O, bloqueio, erros);
          if (/<a\s|href=/i.test(A.mensagem)) err(`${O}: mensagem com HTML de link`);
        }
      }
    });

    // 8. cada tag usada tem contra no pool
    for (const t of tagsUsadas) if (!poolOk.some((d) => d.contra.includes(t))) err(`${N}: tag ${t} sem contra no pool`);
  }

  return { erros, avisos };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const bloqueio = lerBloqueio(fileURLToPath(new URL('./marcas-bloqueadas.txt', import.meta.url)));
  const { erros, avisos } = validar(carregarConteudo(), config, bloqueio);
  for (const a of avisos) console.log(`⚠  ${a}`);
  for (const e of erros) console.log(`✖  ${e}`);
  console.log(`\nValidação: ${erros.length} erro(s), ${avisos.length} pendência(s) "verificar".`);
  process.exit(erros.length ? 1 : 0);
}
