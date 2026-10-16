# Créditos e licenças

## Conteúdo educativo

As recomendações de segurança do jogo se baseiam nos **Fascículos da Cartilha de Segurança para Internet**, produzidos pelo **CERT.br/NIC.br** — https://cartilha.cert.br/fasciculos/

- Licença dos fascículos: **Creative Commons BY-NC-ND 4.0** — https://cartilha.cert.br/cc/
- Os textos, cenários, cartas e ilustrações do jogo são **originais**. Nenhum trecho, tabela, ilustração ou diagramação dos fascículos foi reproduzido.
- Cada Raio-X do jogo linka o fascículo oficial correspondente.
- **Não Clica! não é um material oficial** nem é endossado pelo CERT.br, NIC.br ou CGI.br.

Fascículos usados até agora:

| Nível | Fascículo | Link |
|---|---|---|
| 1 | Golpes: Não se Deixe Enganar | https://cartilha.cert.br/fasciculos/golpes/fasciculo-golpes.pdf |
| 2 | Banco via Internet | https://cartilha.cert.br/fasciculos/banco-via-internet/fasciculo-banco-via-internet.pdf |
| 3 | Comércio via Internet + Golpes: Evite Fraudes | https://cartilha.cert.br/fasciculos/comercio-via-internet/fasciculo-comercio-via-internet.pdf |
| 4 | Redes Sociais + Golpes: Evite Fraudes | https://cartilha.cert.br/fasciculos/redes-sociais/fasciculo-redes-sociais.pdf |
| 5 | Códigos Maliciosos | https://cartilha.cert.br/fasciculos/codigos-maliciosos/fasciculo-codigos-maliciosos.pdf |

## Tipografia

- **Silkscreen**, de Jason Kottke — SIL Open Font License 1.1. Empacotada localmente via `@fontsource/silkscreen` (nenhuma fonte é carregada de terceiros em tempo de execução).
- Texto corrido: fonte do sistema.

## Matriz BR-Fraude

Os casos e as cartas seguem a **Matriz BR-Fraude** (v2, 15/10/2026), mapa de 52 golpes brasileiros com táticas, técnicas e mitigações, baseado no **MITRE Fight Fraud Framework (F3) v1.2** — https://ctid.mitre.org/fraud. Cada cenário guarda os códigos dos golpes correspondentes (`matriz: ["BR-GP018"]`) e cada carta, a mitigação (`matriz: "M14"`).

## Arte e som

- Máscara, ícone e interface: desenhados em SVG/CSS para este projeto.
- Ícones de tática: emojis do sistema, sempre acompanhados de rótulo em texto (provisórios, GDD §5).
- Trilha "No Breu": composição generativa própria (`src/ui/musica/`), sintetizada em tempo real com a Web Audio API, inspirada na faixa "A ameaça no breu" (análise: Ré frígio dominante, ~68 BPM, baixos Sol–Mi♭–Sib–Fá e Dó–Ré–Sol).
- Faixa "A ameaça no breu" (`public/audio/a-ameaca-no-breu.mp3`, ~3 min): fornecida pelo responsável do projeto, gerada com ferramenta de IA; o arquivo traz credenciais de conteúdo C2PA assinadas pelo Google. Opcional em Ajustes → Trilha. Antes de uso comercial, confira os termos da ferramenta que a gerou.

## Inspiração de mecânica

Jogos de cartas *roguelike* e o truco. Nenhum nome, arte, fonte, som ou layout de outro jogo foi usado.

## Bibliotecas

- [Vite](https://vitejs.dev/) — MIT
- [TypeScript](https://www.typescriptlang.org/) — Apache 2.0
- [Zod](https://zod.dev/) — MIT
- [Vitest](https://vitest.dev/) — MIT
- [tsx](https://tsx.is/) — MIT
