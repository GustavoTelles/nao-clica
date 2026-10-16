# Não Clica!

Jogo de cartas para navegador, de turnos, para aprender a reconhecer golpes digitais. Você tem 8 cartas de defesa; **a Máscara**, um golpista que muda de disfarce a cada caso, joga primeiro. Quem vence 2 vazas leva o caso, e quem faz 3 pontos leva o nível.

A fonte da verdade das regras é o [GDD](docs/GDD.md).

## Rodar

```bash
npm install
npm run dev        # http://localhost:5173
```

## Scripts

| Comando | O que faz |
|---|---|
| `npm test` | Testes do motor (Vitest) |
| `npm run validate` | Valida o conteúdo (GDD §13): ids, referências, pressão, vencibilidade, domínios `.example`, DDD 00, marcas bloqueadas |
| `npm run simulate -- --nivel 2 --partidas 2000` | Simula partidas com 3 bots (ótimo, guloso, aleatório) — GDD §14 |
| `npm run build` | `validate` + `tsc` + build estático em `dist/` |
| `npx vite preview` | Serve o `dist/` localmente |

## Estrutura

```
config.json            constantes de balanceamento (GDD §12.6)
src/engine/            motor puro: sem DOM, sem Math.random, sem Date
src/content/           JSON de conteúdo + schema Zod
src/ui/                telas (DOM puro) e componentes
src/styles/main.css    tema "terminal noturno"
scripts/               validador, simulação e lista de marcas bloqueadas
tests/                 testes do motor
docs/                  GDD, anotações das fontes, status da licença
```

## Guia em PDF

[docs/guia-como-jogar.pdf](docs/guia-como-jogar.pdf) ensina a jogar, com capturas reais do jogo. Para regenerar depois de mudar o jogo (precisa de Edge ou Chrome instalado):

```bash
npm run build
npm run guia
```

O texto fica em `scripts/guia/guia.html`; as cenas capturadas são montadas pelo motor em `scripts/guia/estados.ts`.

## Publicar (GitHub + Cloudflare Pages)

O build é estático (`dist/`). Com o código no GitHub, o Cloudflare Pages publica sozinho a cada `git push`:

1. Crie um repositório vazio no GitHub e envie o código (`git remote add origin …` e `git push -u origin main`).
2. No painel da Cloudflare: **Workers & Pages → Create → Pages → Connect to Git** e escolha o repositório.
3. Configuração do build:
   - Framework preset: **None** (ou Vite)
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Node: lido de `.node-version` (22)
4. Salve. Cada push na `main` gera um novo deploy; outros branches viram *previews*.

`public/_headers` aplica a CSP e os cabeçalhos de segurança no Cloudflare. Antes de divulgar para o público, veja as pendências `verificar` (`npm run validate`) e o status do pedido ao CERT.br em [docs/licenca.md](docs/licenca.md).

## Privacidade

Sem cadastro, sem *analytics*, sem *scripts* de terceiros. O progresso fica só no `localStorage` do navegador (`naoclica.save.v1`).
