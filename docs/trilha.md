# Trilha sonora

O jogo tem duas trilhas, escolhidas em **Ajustes → Trilha**:

| Trilha | O que é | Duração |
|---|---|---|
| **No Breu** (principal, padrão) | Generativa, sintetizada ao vivo com Web Audio (`src/ui/musica/`) | ~19,8 min por ciclo, recomeça variada, sem fim |
| **A ameaça no breu** | Faixa original (`public/audio/a-ameaca-no-breu.mp3`, 192 kbps, 4,3 MB) | 2:59, em loop |

A faixa original só é baixada quando escolhida. Ela foi fornecida pelo responsável do projeto e traz credenciais de conteúdo C2PA assinadas pelo Google (indício de geração por IA). Antes de qualquer uso comercial, confira os termos da ferramenta que a gerou.

## Como a "No Breu" foi composta a partir da faixa

A faixa foi analisada no navegador (decodificação Web Audio + FFT, 16/10/2026):

| Medida | "A ameaça no breu" (referência) | Decisão na "No Breu" |
|---|---|---|
| Tonalidade (Krumhansl) | **Ré menor 0,58** | Tônica fixa em Ré; ciclo inteiro mede **Ré menor 0,58** |
| Notas marcantes | Ré, Dó, Si♭, Sol, Dó#, Lá; Mi♭ e Fá# nos baixos | Ré **frígio dominante** (Mi♭ e Fá# = som de "ameaça") |
| Andamento | ~68 BPM | 68 BPM |
| Baixos por compasso | Sol–Mi♭–Sol–Mi♭–Si♭–Fá… / Dó–Ré–Ré–Sol… / final em Lá | Progressões `iv–bII`, `bII–bVI–bIII–bII`, `bVII–i–I–iv`, cadência `i–I–iv–V` |
| Acorde de Dó | Dó + Sol + Si♭ (sem Mi) | `bVII` = Dó–Sol–Si♭ |
| Grade rítmica | Plana (sem bateria marcada) | Sem chimbal/caixa; só "batimento" grave e estrondos |
| Curva de energia | Escuro → sobe → clímax (~1:20) → respiro → 2º clímax → some | 21 seções em três arcos com a mesma forma |
| Brilho (centroide) | 1.100 Hz no começo → 2.400 Hz nos clímax | 580 Hz → 1.100 Hz (mesmo desenho, mais escuro para ficar de fundo) |

Camadas por intensidade: 1 drone + pad · 2 + baixo e batimento · 3 + sinos com motivo frígio · 4 + tremolo de cordas · 5 + estrondos. Todas passam por uma reverberação longa (3,5 s). Os testes em `tests/musica.test.ts` garantem andamento, duração do ciclo, escala, camadas e que o brilho abre nos clímax.

Para reanalisar, renderize um trecho com `renderizarTrecho(compassoInicial, quantos)` (em `musica.ts`) no navegador e aplique a mesma FFT.
