// Gera docs/guia-como-jogar.pdf: captura as telas do jogo (build em dist/) com um navegador
// headless (Edge ou Chrome) e imprime scripts/guia/guia.html em PDF.
// Uso: npm run build && npm run guia      (NAVEGADOR=caminho/para/chrome para escolher outro)
import { createServer } from 'node:http';
import { execFile, execFileSync } from 'node:child_process';
import { promisify } from 'node:util';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const dist = join(raiz, 'dist');
const pastaGuia = join(raiz, 'scripts', 'guia');
const pastaImg = join(pastaGuia, 'img');
const saidaPdf = join(raiz, 'docs', 'guia-como-jogar.pdf');

const candidatos = [
  process.env.NAVEGADOR,
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean);
const navegador = candidatos.find((c) => existsSync(c));
if (!navegador) throw new Error('Nenhum Edge/Chrome encontrado. Defina NAVEGADOR=caminho.');
if (!existsSync(join(dist, 'index.html'))) throw new Error('Rode "npm run build" antes.');

// Estados de jogo montados pelo motor (scripts/guia/estados.ts).
const tsx = join(raiz, 'node_modules', 'tsx', 'dist', 'cli.mjs');
const estados = JSON.parse(execFileSync(process.execPath, [tsx, join(pastaGuia, 'estados.ts')], { cwd: raiz, maxBuffer: 1 << 26 }).toString());

const tipos = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.woff': 'font/woff', '.png': 'image/png', '.svg': 'image/svg+xml' };
const servidor = createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/__cena') {
    // Grava o estado no localStorage do jogo e abre o jogo já naquela tela.
    const save = estados[url.searchParams.get('n')];
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(`<script>localStorage.setItem('naoclica.save.v1', ${JSON.stringify(save)});location.replace('/');</script>`);
    return;
  }
  if (url.pathname === '/__fonte.woff2') {
    res.writeHead(200, { 'content-type': 'font/woff2' });
    res.end(readFileSync(join(raiz, 'node_modules', '@fontsource', 'silkscreen', 'files', 'silkscreen-latin-400-normal.woff2')));
    return;
  }
  const base = url.pathname.startsWith('/__guia/') ? pastaGuia : dist;
  const rel = url.pathname.replace(/^\/__guia\//, '/').replace(/^\/$/, '/index.html');
  const arq = join(base, decodeURIComponent(rel));
  if (!arq.startsWith(base) || !existsSync(arq)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': tipos[extname(arq)] ?? 'application/octet-stream' });
  res.end(readFileSync(arq));
});
await new Promise((r) => servidor.listen(0, '127.0.0.1', r));
const porta = servidor.address().port;

// Assíncrono: o servidor acima roda neste mesmo processo e precisa continuar atendendo.
async function headless(args) {
  const perfil = mkdtempSync(join(tmpdir(), 'naoclica-guia-'));
  try {
    await promisify(execFile)(navegador, ['--headless=new', '--disable-gpu', '--no-first-run', '--hide-scrollbars', `--user-data-dir=${perfil}`, '--force-device-scale-factor=2', ...args], { timeout: 90000 });
  } finally {
    rmSync(perfil, { recursive: true, force: true });
  }
}

mkdirSync(pastaImg, { recursive: true });
const cenas = { menu: [480, 640], mapa: [480, 640], intro: [480, 600], mesa: [480, 740], resolucao: [480, 740], raiox: [480, 1100],
oculta: [480, 740], desconfiometro: [480, 440], derrota: [480, 740], fim: [480, 560], recompensa: [480, 640] };
for (const [nome, [l, a]] of Object.entries(cenas)) {
  await headless([`--window-size=${l},${a}`, '--virtual-time-budget=5000', `--screenshot=${join(pastaImg, `${nome}.png`)}`, `http://127.0.0.1:${porta}/__cena?n=${nome}`]);
  console.log(`  captura: ${nome}.png`);
}

await headless(['--no-pdf-header-footer', '--virtual-time-budget=5000', `--print-to-pdf=${saidaPdf}`, `http://127.0.0.1:${porta}/__guia/guia.html`]);
servidor.close();
console.log(`\nGuia gerado: ${saidaPdf}`);
