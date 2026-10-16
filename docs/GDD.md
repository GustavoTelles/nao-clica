# Não Clica! — Documento de Design do Jogo (GDD)

> **Versão 0.1 · 15/10/2026 · Responsável: Gustavo Telles**
> Nome provisório. Este documento é a **fonte da verdade** do projeto. Se uma regra mudar no código, mude aqui também.

---

## 0. Resumo em uma tela

**Não Clica!** é um jogo de cartas para navegador, de turnos, que mistura o *loop* de *roguelike* do Balatro (montar a mão, comprar cartas, ganhar "coringas" permanentes) com a disputa em vazas do truco. O objetivo é ensinar a reconhecer golpes digitais.

- **Você** é a pessoa usuária. Sua mão tem **8 cartas de defesa**: validações e perguntas que você pode fazer.
- **A Máscara** é a ameaça, um golpista que troca de disfarce a cada caso. Ela **sempre joga primeiro** e tenta levar você a clicar, pagar, passar um código, instalar algo ou entregar dados.
- Cada **cenário** é uma conversa de golpe disputada em **até 3 vazas**. Quem vence 2 vazas leva o cenário.
- Cada **nível** tem **5 cenários** baseados em um fascículo da Cartilha do CERT.br. Quem fizer **3 pontos** primeiro vence o nível.
- Depois de cada cenário, as cartas usadas são descartadas e você **repõe a mão até 8** escolhendo na loja. Ao vencer um nível, você ganha uma **proteção** permanente (o "coringa").
- No fim de cada cenário aparece o **Raio-X do golpe**, que mostra os sinais da mensagem, o que fazer na vida real e um link para o fascículo oficial.

```
Mapa ─► Intro do cenário ─► [Ameaça joga ─► Você responde ─► Resolução] ×(2–3)
   ▲                                                              │
   │                                         Raio-X do golpe ◄────┘
   │                                               │
   │       (nível decidido?) ── não ──► Loja (repor até 8) ─► próximo cenário
   │              │ sim
   └── Recompensa (proteção) ◄── vitória      derrota ──► Resumo + tentar de novo
```

---

## 1. Licença e conformidade (LEIA PRIMEIRO)

| Material | Licença | O que significa para o jogo |
|---|---|---|
| Fascículos (PDF) | **CC BY-NC-ND 4.0** ([cartilha.cert.br/cc](https://cartilha.cert.br/cc/)) | Pode compartilhar o PDF sem alteração e sem fins comerciais. **Não pode distribuir obra derivada** (adaptar texto ou ilustrações). |
| *Slides* dos fascículos | **CC BY-NC-SA 4.0**, com condições ([orientações](https://cartilha.cert.br/orientacoes-materiais/)) | Aceitam alteração, desde que se mantenham a mesma licença, a identidade visual, os créditos e o primeiro e último *slides* íntegros. Não servem como base para um jogo. |

**Regras do projeto, válidas até haver autorização escrita do CERT.br:**

1. **Conteúdo 100% original.** Cenários, diálogos, nomes de cartas e lições são escritos pela equipe. É proibido copiar frases, tabelas, ilustrações ou a diagramação dos fascículos.
2. **Recomendações, sim; texto, não.** Pode-se ensinar a mesma orientação de segurança (por exemplo, "não compartilhe código de verificação") com redação própria.
3. **Crédito e link.** Todo Raio-X mostra apenas o link para o PDF oficial do fascículo (texto: 📄 Fascículo "*X*"), sem citar o CERT.br por extenso. O crédito ao CERT.br/NIC.br, a licença dos fascículos e o aviso de não endosso ficam **somente** na tela Créditos e fontes (e em `CREDITS.md`). *Decisão do responsável em 15/10/2026; antes, o Raio-X também citava "CERT.br/NIC.br".*
4. **Sem sugerir endosso.** Não usar logotipos nem a identidade visual do CERT.br, NIC.br ou CGI.br, nem frases como "jogo oficial".
5. **Pedir autorização.** O modelo de e-mail para `doc@cert.br` está no Anexo A. É o caminho recomendado, e é obrigatório antes de qualquer uso comercial (treinamentos pagos, produto de empresa etc.).
6. **Balatro é inspiração de mecânica.** Não usar nome, arte, fontes, sons ou layout do Balatro.
7. **Nada de marcas, órgãos ou pessoas reais** no papel de golpista ou de vítima. Use nomes fictícios ("Banco Horizonte", "Loja MegaSorte").
8. **Nenhum endereço ou telefone real** no conteúdo. Domínios devem terminar em `.example`, `.test` ou `.invalid`, que são reservados (RFC 2606). Telefones usam o DDD inexistente `00`, como em `(00) 90000-0000`. Links da ameaça são texto, nunca `<a href>`.

> Este documento não é parecer jurídico. Antes de publicar, confirme a leitura da licença com um advogado.

---

## 2. Decisões assumidas (confirmar com o responsável)

Estas eram perguntas em aberto. O jogo usa os padrões abaixo, que podem ser alterados em `config.json` ou nesta seção.

| # | Pergunta | Padrão adotado | Alternativa |
|---|---|---|---|
| D1 | Placar | Cenário = **melhor de 3 vazas** (vence com 2). Nível = **5 cenários**, vence quem fizer **3 pontos** primeiro. | Exigir 3 vazas de 3 (fica muito difícil). |
| D2 | Como uma carta vence a outra | **Contra certo + força**: a defesa vence se anular as táticas da carta da ameaça; sem anulação completa, compara força com pressão (§4.5). | Hierarquia fixa, como no truco (ensina menos). |
| D3 | Reposição da mão | Depois de cada cenário, descarta as usadas e **repõe até 8** escolhendo numa loja de 5 cartas. | Sempre ganhar 3 cartas, com limite de 8. |
| D4 | O que é um nível | **1 nível = 1 fascículo-base = 5 cenários.** A campanha encadeia os níveis. | Partida mista com 5 fascículos. |
| D5 | Público e uso | **Educacional, não comercial**, em português do Brasil, a partir de 12 anos. | Corporativo/comercial: exige autorização (§1, regra 5). |

---

## 3. Glossário e estrutura

| Termo | Definição |
|---|---|
| **Vaza** | Uma troca: a ameaça joga 1 carta e você responde com 1. Corresponde à "rodada" da ideia original. |
| **Cenário** | Um caso de golpe com até 3 vazas, na ordem **abordagem → escalada → pedido**. Vale 1 ponto (ou 2 com Desmascarar, §4.9). |
| **Nível** | Conjunto de 5 cenários de um mesmo fascículo. É uma disputa até 3 pontos. |
| **Campanha** | Sequência de níveis em dificuldade crescente (§9). |
| **Tag** | Rótulo de manipulação da carta da ameaça. Pode ser **gatilho** (tática psicológica) ou **pedido** (o que o golpista quer). |
| **Pressão** | Força da carta da ameaça, de 1 a 5. |
| **Força** | Força da carta de defesa, de 1 a 3. |
| **Proteção** | Carta permanente com efeito passivo (o "coringa"). Máximo de 3. |
| **Desconfiômetro** | Recurso que revela as tags ocultas de uma carta da ameaça (§4.7). |

---

## 4. Regras do jogo

### 4.1 Partida e placar
1. O nível começa com o placar em 0 × 0 e a mão inicial do nível (8 cartas).
2. Os cenários são jogados na ordem do arquivo do nível. O 5º é o **chefe** do nível e pode ter +1 de pressão acima do teto.
3. Em cada vaza, a **ameaça joga primeiro** e a carta dela fica visível (a mensagem). Depois você escolhe 1 carta da mão.
4. Quem vence 2 vazas leva o cenário e soma o valor dele (normalmente 1).
   - Se você vencer as vazas 1 e 2, a vaza 3 não acontece e o golpista desiste antes do pedido final.
   - Se a ameaça vencer 2 vazas, você caiu no golpe.
5. Quem chega a 3 pontos vence o nível.
   - **Vitória:** você escolhe 1 de 3 proteções e o próximo nível é desbloqueado.
   - **Derrota:** aparece o resumo do nível e você pode tentar de novo. O nível reinicia com a mão inicial; as proteções conquistadas antes são mantidas.

### 4.2 Mão, descarte e loja
- O tamanho da mão é **8**.
- Cada carta jogada vai para o **descarte** e não volta naquele nível.
- **Loja** (entre os cenários do mesmo nível):
  - Mostra 5 cartas sorteadas do **pool** do nível. Os pesos são: comum 60, incomum 30, rara 10. Cartas raras só aparecem a partir do nível 2.
  - Você escolhe exatamente a quantidade necessária para voltar a 8 cartas.
  - Uma vez por loja, você pode **trocar** 1 carta da mão por 1 carta da oferta.
  - Cada carta pode ter no máximo **2 cópias** na mão.
  - A loja mostra a **prévia do próximo caso**: título e canal (SMS, e-mail, ligação…), sem revelar as tags. Isso permite planejar a mão.
- **Leitura perfeita:** se você vencer um cenário só com contras perfeitos, a próxima loja oferece 6 cartas e você ganha +1 de Desconfiômetro.

### 4.3 Cartas da ameaça
- Cada cenário tem **3 slots**: abordagem, escalada e pedido. Cada slot tem 1 ou 2 **opções** de carta, e a IA escolhe entre elas (§4.8).
- Cada carta da ameaça tem:
  - **`mensagem`:** o que o golpista diz, com até 180 caracteres.
  - **`tags`:** 1 tag nos níveis sem combos; 1 ou 2 tags nos níveis com combos.
  - **`pressao`:** de 1 a 5.
  - **`sinais`:** trechos exatos da mensagem que denunciam o golpe, destacados no Raio-X.
- A carta do slot "pedido" normalmente traz uma tag de **pedido** (LINK, PIX…).

### 4.4 Cartas de defesa
- Cada carta de defesa tem:
  - **`contra`:** as tags que ela anula.
  - **`forca`:** de 1 a 3.
  - **`raridade`.**
  - **`licao`:** uma frase do que fazer na vida real.
  - **`fonte`:** o fascículo-base.
- Flags opcionais:
  - `usoUnicoPorNivel`: a carta não volta à loja depois de usada.
  - `armadilha`: veja §7.

### 4.5 Resolução da vaza (algoritmo canônico)

```
entrada: cartaAmeaca A, cartaDefesa D, proteções P, config C
pressão  = max(1, A.pressao + Σ modificadores de pressão de P aplicáveis a A.tags)
se D.armadilha:                       → AMEAÇA vence   (motivo: "armadilha")
k = |A.tags ∩ D.contra|;  n = |A.tags|
se k == n:                            → DEFESA vence   (motivo: "contra_perfeito")
força = D.forca + Σ bônus de força de P aplicáveis
se 0 < k < n:  força += C.bonusContraParcial   (padrão 2)   (motivo: "contra_parcial")
senão:                                                       (motivo: "forca")
se força > pressão:                   → DEFESA vence
senão:                                → AMEAÇA vence   (empate favorece a ameaça: C.empateFavorece = "ameaca")
depois: aplicar proteções reativas (ex.: 2FA) → podem converter uma derrota (motivo: "protecao")
```

Consequências do algoritmo:
- Pressão 1–2: uma carta com força maior que a pressão vence mesmo sem contra (força 3 sempre vence), o que torna o tutorial tolerante.
- Pressão ≥ 3 em carta de **1 tag**: só o contra perfeito vence, porque a força máxima é 3 e o empate favorece a ameaça.
- Carta com **2 tags** (combo): um contra parcial soma +2, então força 3 parcial vence pressão até 4. Pressão 5 **só cai com contra perfeito**.

### 4.6 Proteções (coringas)
- Cada proteção é ganha ao vencer um nível, escolhendo 1 entre 3. Os efeitos são passivos e cumulativos.
- Há no máximo 3 proteções. Com os slots cheios, uma nova proteção substitui uma das atuais, à escolha do jogador.
- O catálogo está em §8.

### 4.7 Desconfiômetro (a partir do nível 2)
- A partir do nível 2, as **tags da ameaça ficam ocultas**: você vê só a mensagem e precisa reconhecer a manipulação. Esse é o aprendizado central do jogo.
- Você começa cada nível com **3 cargas**. Gastar 1 carga revela as tags da carta atual.
- Você ganha +1 carga com uma Leitura perfeita (§4.2).

### 4.8 IA da ameaça
| Modo | Comportamento |
|---|---|
| `roteiro` | Sempre joga a 1ª opção do slot (usado no tutorial). |
| `aleatoria` | Sorteia entre as opções do slot com o RNG semeado. |
| `adaptativa` | Escolhe a opção que **menos cartas da sua mão anulam perfeitamente**, sorteando em caso de empate. Ela "lê" sua mão como um golpista que testa abordagens. |

### 4.9 Desmascarar! (o truco do jogo; fase 3, ativável por nível)
- Na vaza 1 ou 2, **antes** de responder, você pode gritar **"Desmascarar!"**. Com isso o cenário passa a valer **2 pontos**.
- A IA reage de uma de duas formas:
  - **Foge** quando a pressão máxima restante no roteiro é ≤ 2: você ganha 1 ponto e o cenário acaba ("O golpista sumiu").
  - **Insiste** nos demais casos: o cenário continua valendo 2.
- O chamado é sempre seu; **a ameaça nunca pede truco**. Isso evita ensinar que sair de uma conversa suspeita é "perder".

### 4.10 Contenção — "Caiu? E agora?" (fase 3)
- Quando você perde um cenário, aparece uma decisão rápida com 3 ações. Só 1 é a correta para o pedido daquele golpe (por exemplo, para PIX: contatar o banco imediatamente).
- Se acertar, você recupera 1 carta do descarte ou ganha +1 de Desconfiômetro. A ameaça marca o ponto de qualquer forma.
- O conteúdo vem do fascículo **Golpes: Caiu? Veja o que Fazer** e deve ser extraído e conferido (§1).

### 4.11 Índice de Desconfiança
- É o percentual de vazas vencidas com contra perfeito, calculado sobre o total de vazas jogadas.
- Aparece no fim de cada nível. O melhor índice de cada nível fica salvo, e a tela mostra uma dica do tipo "Você caiu mais em URGÊNCIA".

---

## 5. Tags

Os ícones abaixo são temporários. Os definitivos serão SVGs próprios, sempre acompanhados do rótulo em texto, nunca só cor ou ícone.

**Gatilhos** (como a ameaça manipula):

| Tag | Ícone temp. | Ideia |
|---|---|---|
| `AUTORIDADE` | 🎩 | Diz ser banco, órgão, empresa, chefe ou suporte. |
| `URGENCIA` | ⏰ | Impõe prazo ou "agora ou nunca" e tira o tempo de pensar. |
| `RECOMPENSA` | 🎁 | Prêmio, oferta, dinheiro fácil, vaga dos sonhos. |
| `MEDO` | ⚠️ | Bloqueio, multa, processo, conta invadida. |
| `AFETO` | ❤️ | Parente, amigo, par romântico em apuros. |
| `CURIOSIDADE` | 👀 | Encomenda, foto sua, "olha isso". |

**Pedidos** (o que a ameaça quer):

| Tag | Ícone temp. | Ideia |
|---|---|---|
| `LINK` | 🔗 | Clicar ou abrir um endereço. |
| `CODIGO` | 🔢 | Código de verificação (SMS, app). |
| `PIX` | 💸 | Transferir ou pagar. |
| `APP_ANEXO` | 📎 | Instalar um app ou abrir um arquivo. |
| `SENHA` | 🔑 | Informar senha. |
| `DADOS` | 🪪 | CPF, documento, selfie, dados do cartão. |

Para extensões futuras, `COMPARTILHAR` (repassar boato) fica reservada para o nível bônus Boatos.

---

## 6. Catálogo inicial de cartas de defesa

As lições abaixo são **rascunhos**. Cada uma precisa ser conferida com o fascículo-base antes de publicar; se não houver respaldo, marque `"verificar": true`.

| id | Nome na carta | contra | Força | Raridade | Lição (rascunho) | Fascículo-base |
|---|---|---|---|---|---|---|
| `PAUSA` | Respira: nada é tão urgente | URGENCIA, MEDO | 2 | comum | Pressa é ferramenta do golpista; pare antes de agir. | Golpes |
| `CANAL_OFICIAL` | Confirmo pelo canal oficial | AUTORIDADE, MEDO, LINK | 2 | rara* | Procure a empresa pelo app, site digitado por você ou telefone do cartão. | Golpes / Banco |
| `BOM_DEMAIS` | Bom demais pra ser verdade? | RECOMPENSA | 3 | comum | Prêmio de promoção da qual você não participou é isca. | Golpes |
| `CONFERIR_LINK` | Confiro o endereço antes | LINK, CURIOSIDADE | 2 | comum | Olhe o endereço com atenção; na dúvida, não abra. | Golpes |
| `NAO_CLICO` | Não clico: digito eu mesmo | LINK | 3 | comum | Acesse serviços digitando o endereço ou pelo app oficial. | Golpes / Evite Fraudes |
| `LIGO_PRA_PESSOA` | Ligo no número que eu já tinha | AFETO, AUTORIDADE | 2 | incomum | Confirme pelo contato antigo, nunca pelo que veio na mensagem. | Golpes / Evite Fraudes |
| `CONFERIR_RECEBEDOR` | Confiro quem recebe o Pix | PIX | 3 | comum | Confira nome e instituição do recebedor antes de confirmar. | Banco / Evite Fraudes |
| `PESQUISAR` | Pesquiso "nome + golpe" | RECOMPENSA, CURIOSIDADE | 2 | comum | Busque a reputação da loja, oferta ou empresa. | Comércio |
| `SEGUNDA_OPINIAO` | Pergunto a alguém de confiança | URGENCIA, AFETO, MEDO | 1 | comum | Contar para alguém quebra o isolamento que o golpe cria. | Golpes |
| `DADOS_MINIMOS` | Por que precisam disso? | DADOS | 3 | comum | Só informe dados quando for necessário e em canal confiável. | Proteção de Dados |
| `SENHA_NINGUEM` | Senha é só minha | SENHA, DADOS | 2 | incomum | Instituições sérias não pedem sua senha por mensagem ou ligação. | Banco / Autenticação |
| `CODIGO_E_MEU` | Código de verificação não se passa | CODIGO | 3 | comum | O código existe para provar que é você; quem pede quer sua conta. | Banco / Autenticação |
| `DESLIGAR_LIGAR` | Desligo e ligo eu para a central | AUTORIDADE, CODIGO, SENHA | 2 | rara | Encerre a ligação e ligue para o número oficial. | Banco |
| `LOJA_OFICIAL` | Só instalo da loja oficial | APP_ANEXO | 3 | comum | Instale apps só da loja oficial do sistema. | Celulares / Códigos Maliciosos |
| `NAO_ABRO_ANEXO` | Anexo inesperado? Não abro | APP_ANEXO, CURIOSIDADE | 2 | comum | Arquivo que você não esperava pode trazer *malware*. | Códigos Maliciosos |
| `PAGAR_NA_PLATAFORMA` | Pago só dentro da plataforma | PIX, RECOMPENSA | 2 | incomum | Negociar fora do site ou app tira a proteção da compra. | Comércio |
| `PERFIL_SUSPEITO` | Confiro o perfil antes | AFETO, CURIOSIDADE, AUTORIDADE | 1 | incomum | Perfil novo, com poucos contatos ou fotos genéricas, é sinal de alerta. | Redes Sociais |
| `VOZ_NAO_PROVA` | Voz ou vídeo não é prova | AUTORIDADE, AFETO | 2 | incomum | Áudio e vídeo podem ser falsificados com IA; confirme por outro canal. | IA |
| `BLOQUEAR_DENUNCIAR` | Bloqueio e denuncio | todos os 6 gatilhos | 1 | rara | Encerrar o contato e denunciar protege você e os outros. `usoUnicoPorNivel`. | Golpes / Evite Fraudes |

\* `CANAL_OFICIAL` é **rara** na loja, mas entra na mão inicial do nível 1 para ensinar o conceito.

### 6.1 Cartas acrescentadas (Matriz BR-Fraude)

Cada carta aponta para a mitigação correspondente da Matriz BR-Fraude (`matriz`). Lições conferidas nos fascículos indicados.

| id | Nome na carta | contra | Força | Raridade | Mitigação | Fascículo-base |
|---|---|---|---|---|---|---|
| `COMPARO_PRECOS` | Comparo o preço em outros sites | RECOMPENSA, LINK | 2 | comum | M18 | F_COMERCIO |
| `REPUTACAO_VENDEDOR` | Vejo a reputação do vendedor | RECOMPENSA, AUTORIDADE | 2 | incomum | M18 | F_COMERCIO |
| `CONFIRO_NO_EXTRATO` | Confiro no extrato se o Pix caiu | PIX, URGENCIA | 2 | comum | M06 | F_EVITE_FRAUDES |
| `CONFIRO_QR` | Confiro o QR Code e quem recebe | PIX, LINK | 2 | incomum | M14 | F_EVITE_FRAUDES |
| `SO_ACEITO_CONHECIDOS` | Só aceito quem eu conheço | CURIOSIDADE, AFETO | 2 | comum | M18 | F_REDES_SOCIAIS |
| `CHECO_OUTRAS_FONTES` | Checo em outras fontes | AUTORIDADE, RECOMPENSA, CURIOSIDADE | 1 | incomum | M18 | F_REDES_SOCIAIS |
| `DUAS_ETAPAS` | Minha conta tem verificação em duas etapas | SENHA, LINK | 2 | incomum | M02 | F_REDES_SOCIAIS |
| `AMOR_NAO_COBRA` | Quem gosta de mim não pede Pix | AFETO, PIX | 2 | comum | M01 | F_EVITE_FRAUDES |
| `ANTIVIRUS` | Passo o antivírus antes | APP_ANEXO, LINK | 2 | comum | M15 | F_CODIGOS |
| `FECHO_O_ALERTA` | Alerta de vírus na tela? Fecho e não ligo | MEDO, APP_ANEXO | 2 | incomum | M15 | F_CODIGOS |
| `TENHO_BACKUP` | Tenho backup dos meus arquivos | MEDO, PIX | 2 | incomum | M21 | F_CODIGOS |
| `CONFERIR_DDA` | Pago boleto pelo DDA | PIX | 2 | incomum | M08 | F_BANCO |

Lições que deixaram de ter `verificar` em 15/10/2026 (respaldo nos fascículos Golpes: Evite Fraudes, Códigos Maliciosos, Comércio e Redes Sociais): `CONFERIR_LINK, CONFERIR_RECEBEDOR, NAO_ABRO_ANEXO, PAGAR_NA_PLATAFORMA, PERFIL_SUSPEITO, BLOQUEAR_DENUNCIAR, ARM_SO_OLHAR`. Só `ARM_CADEADO` continua pendente.

**Cobertura mínima garantida:** no catálogo completo, cada uma das 12 tags tem pelo menos 2 contras fora de armadilha. Dentro de cada nível, o validador exige pelo menos 1 contra por tag usada (§13).

---

## 7. Armadilhas (a partir do nível 3; `armadilhasNaLoja: true`)

Armadilhas são cartas que **parecem boas** e aparecem na loja sem marcação especial, no máximo 1 por oferta. Elas **sempre perdem a vaza**, e o Raio-X explica o mito por trás delas. Ensinar a desconfiar de "conselhos" errados também faz parte do jogo.

| id | Nome na carta | Força exibida | Mito |
|---|---|---|---|
| `ARM_LIGO_NUMERO_MSG` | Ligo pro número da mensagem pra confirmar | 3 | Esse número é do golpista. |
| `ARM_CADEADO` | Tem cadeado, então é seguro | 3 | O cadeado indica conexão cifrada, não que o site seja legítimo. |
| `ARM_SO_OLHAR` | Clico só pra ver o que é | 3 | Abrir o link já pode expor você ou confirmar seu número. |
| `ARM_RESPONDO` | Respondo pedindo mais detalhes | 3 | Manter a conversa dá ao golpista mais chances de convencer. |
| `ARM_COMPROVANTE` | Recebi o comprovante, já posso enviar | 3 | Comprovante pode ser falso ou de Pix só agendado; quem confirma é o extrato. |
| `ARM_PATROCINADO` | Primeiro resultado da busca é o oficial | 3 | Golpistas pagam anúncios para aparecer no topo; patrocinado não é oficial. |

---

## 8. Proteções (os coringas)

As proteções vêm dos fascículos de **prevenção**, que não viram nível.

| id | Nome | Efeito no motor | Fascículo-base |
|---|---|---|---|
| `P_2FA` | Verificação em duas etapas | 1x por nível: uma vaza perdida contra carta com `SENHA` vira vitória ("a senha sozinha não bastou"). | Autenticação |
| `P_GERENCIADOR` | Gerenciador de senhas | +1 de força nas suas cartas que anulam `SENHA` ou `LINK` (ele não preenche senha em site falso). | Autenticação |
| `P_BACKUP` | *Backup* em dia | 1x por nível: se você perder um cenário cujo pedido foi `APP_ANEXO`, a ameaça não pontua ("seus arquivos voltaram"). | Backup |
| `P_LIMITES` | Limites de transação baixos | −1 de pressão em cartas com `PIX`. | Banco via Internet |
| `P_PERFIL_FECHADO` | Perfil fechado | −1 de pressão em cartas com `AFETO` ou `CURIOSIDADE` (o golpista sabe menos sobre você). | Privacidade / Redes Sociais |
| `P_ATUALIZADO` | Sistema e apps atualizados | −1 de pressão em cartas com `APP_ANEXO`. | Computadores / Celulares e Tablets |
| `P_DADOS_MINIMOS` | Exposição mínima de dados | −1 de pressão em cartas com `DADOS`. | Proteção de Dados |
| `P_REDE_SEGURA` | Rede de casa protegida | +1 de Desconfiômetro no início de cada nível. *Efeito provisório; rebalancear.* | Redes |
| `P_BLOQUEIO_TELA` | Bloqueio de tela + apagar remoto | Reservada para cenários de furto de celular (fase 3). | Furto de Celular |

A pressão mínima é sempre 1.

---

## 9. Campanha: fascículos → níveis

Todos os 19 fascículos têm destino no jogo: **10 viram nível** (o nível 9 junta dois deles), **7 viram proteção**, **1 vira nível bônus** e **1 vira mecânica**.

| Nível | Fascículo-base (PDF oficial) | Tema | Tags visíveis | Pressão | Combos | IA | Extras |
|---|---|---|---|---|---|---|---|
| 1 | [Golpes: Não se Deixe Enganar](https://cartilha.cert.br/fasciculos/golpes/fasciculo-golpes.pdf) | Golpes do dia a dia | **Sim** | 1–2 (chefe 3) | Não | roteiro | Tutorial |
| 2 | [Banco via Internet](https://cartilha.cert.br/fasciculos/banco-via-internet/fasciculo-banco-via-internet.pdf) | Falsa central, boleto falso, Pix | Não | 2–3 | Não | aleatoria | Desconfiômetro, raras |
| 3 ✔ | [Comércio via Internet](https://cartilha.cert.br/fasciculos/comercio-via-internet/fasciculo-comercio-via-internet.pdf) | Loja e vendedor falsos | Não | 2–3 | Não | aleatoria | Armadilhas na loja |
| 4 ✔ | [Redes Sociais](https://cartilha.cert.br/fasciculos/redes-sociais/fasciculo-redes-sociais.pdf) | Perfil falso, golpe do amor, sorteio | Não | 2–4 | Sim | adaptativa | |
| 5 ✔ | [Códigos Maliciosos](https://cartilha.cert.br/fasciculos/codigos-maliciosos/fasciculo-codigos-maliciosos.pdf) | Anexo, app falso, *ransomware* | Não | 3–4 | Sim | adaptativa | |
| 6 | [Autenticação](https://cartilha.cert.br/fasciculos/autenticacao/fasciculo-autenticacao.pdf) | Roubo de conta, código de verificação | Não | 3–4 | Sim | adaptativa | Desmascarar |
| 7 | [Trabalho Remoto](https://cartilha.cert.br/fasciculos/trabalho-remoto/fasciculo-trabalho-remoto.pdf) | Falso suporte de TI, fraude do chefe | Não | 3–5 | Sim | adaptativa | Desmascarar |
| 8 | [Inteligência Artificial](https://cartilha.cert.br/fasciculos/ia/fasciculo-ia.pdf) | Voz e vídeo falsos, IA como isca | Não | 4–5 | Sim | adaptativa | Desmascarar |
| 9 | [Golpes: Evite Fraudes](https://cartilha.cert.br/fasciculos/golpes-evite-fraudes/fasciculo-golpes-evite-fraudes.pdf) + [Vazamento de Dados](https://cartilha.cert.br/fasciculos/vazamento-de-dados/fasciculo-vazamento-de-dados.pdf) | Final: golpes que usam dados vazados | Não | 4–5 | Sim | adaptativa | Chefe final |
| Bônus | [Boatos](https://cartilha.cert.br/fasciculos/boatos/fasciculo-boatos.pdf) | Desinformação (pedido `COMPARTILHAR`) | Não | 2–4 | Sim | adaptativa | Opcional |

**Viram proteções (§8):** [Backup](https://cartilha.cert.br/fasciculos/backup/fasciculo-backup.pdf), [Computadores](https://cartilha.cert.br/fasciculos/computadores/fasciculo-computadores.pdf), [Celulares e Tablets](https://cartilha.cert.br/fasciculos/celulares-e-tablets/fasciculo-celulares-e-tablets.pdf), [Furto de Celular](https://cartilha.cert.br/fasciculos/furto-de-celular/fasciculo-furto-de-celular.pdf), [Redes](https://cartilha.cert.br/fasciculos/redes/fasciculo-redes.pdf), [Privacidade](https://cartilha.cert.br/fasciculos/privacidade/fasciculo-privacidade.pdf), [Proteção de Dados](https://cartilha.cert.br/fasciculos/protecao-de-dados/fasciculo-protecao-de-dados.pdf).

**Vira mecânica (§4.10):** [Golpes: Caiu? Veja o que Fazer](https://cartilha.cert.br/fasciculos/golpes-o-que-fazer/fasciculo-golpes-o-que-fazer.pdf).

> ✔ = implementado. Os níveis 3–5 usam os golpes da **Matriz BR-Fraude** (v2), baseada no MITRE F3; cada cenário guarda os códigos `BR-GP###` e cada carta, a mitigação `M##`. O Desmascarar continua desligado (fase 3).

> A lista de fascículos foi conferida em 15/10/2026 em [cartilha.cert.br/fasciculos](https://cartilha.cert.br/fasciculos/). Antes de criar um nível, confira se surgiu fascículo novo ou se o PDF foi atualizado.

---

## 10. Nível 1 detalhado — "Golpes do dia a dia"

**Pool:** `PAUSA, CANAL_OFICIAL, BOM_DEMAIS, CONFERIR_LINK, NAO_CLICO, LIGO_PRA_PESSOA, CONFERIR_RECEBEDOR, PESQUISAR, SEGUNDA_OPINIAO, DADOS_MINIMOS, SENHA_NINGUEM`

**Mão inicial:** `PAUSA, CANAL_OFICIAL, BOM_DEMAIS, CONFERIR_LINK, LIGO_PRA_PESSOA, CONFERIR_RECEBEDOR, SEGUNDA_OPINIAO, PESQUISAR`

**Recompensas oferecidas:** `P_PERFIL_FECHADO, P_LIMITES, P_GERENCIADOR`

| # | Título | Canal | Máscara (fictícia) | Abordagem | Escalada | Pedido |
|---|---|---|---|---|---|---|
| 1.1 | Você foi sorteado! | SMS | Central de Prêmios MegaSorte | RECOMPENSA p1 | URGENCIA p2 | LINK p2 |
| 1.2 | Oi, troquei de número | Mensagem | "Sobrinha" | AFETO p2 | URGENCIA p2 | PIX p2 |
| 1.3 | Sua encomenda está retida | SMS | Transportadora Rápido Já | CURIOSIDADE p2 | MEDO p2 | LINK p2 |
| 1.4 | Vaga dos sonhos | Mensagem | Recrutadora da Talento+ | RECOMPENSA p2 | AUTORIDADE p2 | DADOS p2 |
| 1.5 ★ | Acesso suspenso (chefe) | E-mail | Central de Segurança do Banco Horizonte | MEDO p2 | AUTORIDADE p2 | SENHA p3 |

Todas as cartas do nível têm contra perfeito no pool, e a mão inicial já resolve o cenário 1.1.

> **Balanceamento (15/10/2026):** as abordagens de 1.2, 1.3 e 1.4 subiram de p1 para p2. Com p1, o bot aleatório vencia 78% (alvo 40–60%); com p2, vence 53%.

### 10.1 Exemplo completo (`content/niveis/01-golpes.json`, trecho)

```json
{
  "id": "C1_1",
  "titulo": "Você foi sorteado!",
  "canal": "SMS",
  "persona": "Central de Prêmios MegaSorte",
  "contexto": "Terça, 9h12. Chega um SMS de um número que você não conhece.",
  "vazas": [
    { "papel": "abordagem", "opcoes": [{
      "id": "A1_1_1",
      "mensagem": "PARABÉNS! Seu número foi sorteado na promoção de aniversário MegaSorte. Você ganhou um vale de R$ 5.000!",
      "tags": ["RECOMPENSA"], "pressao": 1,
      "sinais": ["PARABÉNS!", "Você ganhou um vale de R$ 5.000"]
    }]},
    { "papel": "escalada", "opcoes": [{
      "id": "A1_1_2",
      "mensagem": "Atenção: o prêmio expira HOJE às 18h. Depois disso ele passa para o próximo sorteado.",
      "tags": ["URGENCIA"], "pressao": 2,
      "sinais": ["expira HOJE às 18h", "passa para o próximo sorteado"]
    }]},
    { "papel": "pedido", "opcoes": [{
      "id": "A1_1_3",
      "mensagem": "Para resgatar, confirme seus dados em megasorte-premios.example/resgate",
      "tags": ["LINK"], "pressao": 2,
      "sinais": ["megasorte-premios.example/resgate"]
    }]}
  ],
  "desfechoVitoria": "A Máscara fica sem resposta e some. Prêmio que você não pediu costuma ser isca.",
  "desfechoDerrota": "Você abriu o link e preencheu o formulário. Seus dados agora estão com a Máscara.",
  "raioX": {
    "oQueEra": "Golpe do falso prêmio: promessa de ganho + prazo curto + link para 'confirmar dados'.",
    "comoAgir": [
      "Desconfie de prêmio de promoção da qual você não participou.",
      "Não abra links recebidos por SMS; se quiser checar, procure a empresa por conta própria.",
      "Na dúvida, apague a mensagem."
    ],
    "verificar": false
  },
  "fonte": "F_GOLPES"
}
```

### 10.2 Mensagens dos demais cenários do nível 1 (rascunho)

| Cenário | Abordagem | Escalada | Pedido |
|---|---|---|---|
| 1.2 | "Oi, tudo bem? É sua sobrinha! Troquei de número, salva esse aqui 😘" | "Tô numa enrascada, preciso pagar um boleto até meio-dia e o app do meu banco travou 😩" | "Consegue fazer um Pix pra mim? Devolvo amanhã. A chave tá no nome de uma amiga: (00) 90000-0000" |
| 1.3 | "Rápido Já: sua encomenda BR000000000 não pôde ser entregue. Veja os detalhes." | "Sem atualização em 24h, o pacote volta ao remetente e você perde a compra." | "Pague a taxa de reentrega de R$ 3,90 em rapidoja-entregas.example/taxa" |
| 1.4 | "Olá! Vi seu perfil e temos vaga home office: R$ 300 por dia só curtindo vídeos." | "Sou da equipe oficial de RH da Talento+, parceira das maiores marcas do país." | "Pra cadastrar, me envie foto do documento, CPF e uma selfie segurando o documento." |
| 1.5 | "Banco Horizonte: detectamos acesso suspeito. Sua conta foi suspensa preventivamente." | "Este é um comunicado oficial da Central de Segurança. Protocolo nº 000000." | "Para reativar, responda este e-mail com agência, conta e senha." |

### 10.3 Nível 2 — "Banco via Internet" (implementado)

Fonte das recomendações: `docs/fontes/banco-via-internet.md`. Regras do §9: tags ocultas, pressão 2–3 (chefe até 4), sem combos, IA aleatória, raras na loja.

**Pool:** `PAUSA, CANAL_OFICIAL, NAO_CLICO, CONFERIR_LINK, CODIGO_E_MEU, SENHA_NINGUEM, DESLIGAR_LIGAR, LOJA_OFICIAL, NAO_ABRO_ANEXO, CONFERIR_RECEBEDOR, CONFERIR_DDA, DADOS_MINIMOS, BOM_DEMAIS, SEGUNDA_OPINIAO, PESQUISAR`

**Mão inicial:** `CANAL_OFICIAL, PAUSA, CODIGO_E_MEU, SENHA_NINGUEM, NAO_CLICO, BOM_DEMAIS, LOJA_OFICIAL, CONFERIR_DDA`

**Recompensas:** `P_2FA, P_ATUALIZADO, P_DADOS_MINIMOS`

**Carta nova:** `CONFERIR_DDA` — "Pago boleto pelo DDA", contra PIX, força 2, incomum, fonte Banco via Internet.

| # | Título | Canal | Máscara (fictícia) | Abordagem | Escalada | Pedido |
|---|---|---|---|---|---|---|
| 2.1 | Ligação da central | Ligação | Falsa central do Banco Horizonte | AUTORIDADE p2 | MEDO p2 / MEDO p2 | CODIGO p3 / SENHA p3 |
| 2.2 | Cashback no Pix | Site (anúncio) | Anúncio patrocinado falso | RECOMPENSA p2 / AUTORIDADE p2 | URGENCIA p2 | LINK p3 |
| 2.3 | Atualize seu módulo de segurança | SMS | Falso suporte digital | MEDO p2 | AUTORIDADE p2 / URGENCIA p2 | APP_ANEXO p3 |
| 2.4 | Renegociação com 80% de desconto | E-mail | Setor de Cobrança Horizonte | RECOMPENSA p2 | URGENCIA p2 / MEDO p2 | PIX p3 |
| 2.5 ★ | Atendimento pelo perfil oficial (chefe) | Rede social | Perfil falso de atendimento | AUTORIDADE p3 | URGENCIA p3 / MEDO p3 | DADOS p4 / PIX p4 |

> **Balanceamento (15/10/2026):** quatro escaladas desceram de p3 para p2 (`A2_1_2a, A2_3_2b, A2_4_2a, A2_4_2b`). O bot aleatório passou de 9,7% para 24,6% (alvo 20–40%). O bot ótimo vence 100% (alvo 85–95%); como ele enxerga as tags ocultas, esse número é um teto, e humanos devem ficar abaixo.

### 10.4 Nível 3 — "Comércio via Internet" (implementado)

Regras (§9): tags ocultas, pressão 2–3 (chefe até 4), sem combos, IA aleatoria, armadilhas na loja.

**Pool:** `PAUSA, BOM_DEMAIS, PESQUISAR, COMPARO_PRECOS, REPUTACAO_VENDEDOR, PAGAR_NA_PLATAFORMA, CONFERIR_RECEBEDOR, CONFIRO_NO_EXTRATO, CONFIRO_QR, CANAL_OFICIAL, NAO_CLICO, CONFERIR_LINK, LIGO_PRA_PESSOA, SEGUNDA_OPINIAO, DADOS_MINIMOS, ARM_COMPROVANTE, ARM_PATROCINADO, ARM_RESPONDO`

**Mão inicial:** `BOM_DEMAIS, PAUSA, PAGAR_NA_PLATAFORMA, CONFERIR_RECEBEDOR, CONFIRO_NO_EXTRATO, REPUTACAO_VENDEDOR, CANAL_OFICIAL, COMPARO_PRECOS`

**Recompensas:** `P_LIMITES, P_DADOS_MINIMOS, P_REDE_SEGURA`

| # | Título | Canal | Máscara (fictícia) | Matriz | Abordagem | Escalada | Pedido |
|---|---|---|---|---|---|---|---|
| 3.1 | Queima de estoque | Rede social | Loja Passo Certo (perfil novo) | BR-GP018 | RECOMPENSA p2 | URGENCIA p2 / AUTORIDADE p2 | PIX p3 |
| 3.2 | A plataforma está com falha | Mensagem | "Vendedor" de bicicleta usada | BR-GP020, BR-GP023 | AUTORIDADE p2 | URGENCIA p2 / RECOMPENSA p2 | PIX p3 |
| 3.3 | Já paguei, olha o comprovante | Mensagem | "Comprador" do seu celular usado | BR-GP021, BR-GP006 | RECOMPENSA p2 | URGENCIA p2 | PIX p3 / PIX p3 |
| 3.4 | Casa pé na areia | Rede social | Anfitriã Temporada Sol (perfil em rede social) | BR-GP024 | RECOMPENSA p2 | URGENCIA p3 / AUTORIDADE p2 | PIX p3 |
| 3.5 ★ | Leilão de carros recuperados | Site | Leiloeira Martelo Digital | BR-GP019 | AUTORIDADE p3 | URGENCIA p3 / RECOMPENSA p3 | PIX p4 / DADOS p4 |

> **Balanceamento (15/10/2026):** ótimo 100%, guloso 53%, aleatório 20,2% (alvo 20–40%). Sem ajustes.

### 10.5 Nível 4 — "Redes Sociais" (implementado)

Regras (§9): tags ocultas, pressão 2–4 (chefe até 5), **com combos**, IA adaptativa, armadilhas na loja.

**Pool:** `PAUSA, CANAL_OFICIAL, LIGO_PRA_PESSOA, SEGUNDA_OPINIAO, PERFIL_SUSPEITO, SO_ACEITO_CONHECIDOS, CHECO_OUTRAS_FONTES, AMOR_NAO_COBRA, VOZ_NAO_PROVA, CODIGO_E_MEU, DESLIGAR_LIGAR, DUAS_ETAPAS, NAO_CLICO, CONFERIR_LINK, DADOS_MINIMOS, SENHA_NINGUEM, PAGAR_NA_PLATAFORMA, BLOQUEAR_DENUNCIAR, ARM_SO_OLHAR, ARM_RESPONDO`

**Mão inicial:** `LIGO_PRA_PESSOA, SEGUNDA_OPINIAO, CODIGO_E_MEU, DESLIGAR_LIGAR, AMOR_NAO_COBRA, SO_ACEITO_CONHECIDOS, DADOS_MINIMOS, PAUSA`

**Recompensas:** `P_PERFIL_FECHADO, P_2FA, P_GERENCIADOR`

| # | Título | Canal | Máscara (fictícia) | Matriz | Abordagem | Escalada | Pedido |
|---|---|---|---|---|---|---|---|
| 4.1 | Vota em mim? | Mensagem | Conta invadida da sua amiga Bia | BR-GP013, BR-GP012 | AFETO p2 | URGENCIA+AFETO p3 / CURIOSIDADE+AFETO p3 | LINK+CODIGO p3 / LINK+SENHA p3 |
| 4.2 | Perfil novo, pedido antigo | Rede social | Perfil clonado do seu tio Marcos | BR-GP014 | AFETO+CURIOSIDADE p2 / AFETO p2 | RECOMPENSA+URGENCIA p3 | PIX+AFETO p3 |
| 4.3 | Amor à distância | Rede social | "Engenheiro em plataforma de petróleo" | BR-GP016 | AFETO p2 | AFETO+MEDO p3 / AFETO+AUTORIDADE p3 | PIX+AFETO p3 |
| 4.4 | Benefício para todo mundo | Mensagem | Corrente no grupo da família | BR-GP051 | RECOMPENSA+AUTORIDADE p3 | CURIOSIDADE+AFETO p3 / URGENCIA p3 | LINK+DADOS p3 |
| 4.5 ★ | Sua conta vai ser desativada | SMS | Falso suporte do app de mensagens | BR-GP012 | AUTORIDADE+MEDO p4 | URGENCIA+MEDO p4 / AUTORIDADE+URGENCIA p3 | CODIGO+AUTORIDADE p5 |

> **Balanceamento (15/10/2026):** os pedidos dos casos 4.1–4.4 desceram de p4 para p3 e a escalada `A4_5_2b` de p4 para p3 (só caía com carta rara de uso único). Aleatório: 4,3% → 10,4% (alvo 10–25%). Ótimo: 100% (teto, vê as tags).

### 10.6 Nível 5 — "Códigos Maliciosos" (implementado)

Regras (§9): tags ocultas, pressão 3–4 (chefe até 5), **com combos**, IA adaptativa, armadilhas na loja.

**Pool:** `LOJA_OFICIAL, NAO_ABRO_ANEXO, ANTIVIRUS, FECHO_O_ALERTA, TENHO_BACKUP, DUAS_ETAPAS, NAO_CLICO, CONFERIR_LINK, PAUSA, CANAL_OFICIAL, CODIGO_E_MEU, DESLIGAR_LIGAR, SENHA_NINGUEM, PESQUISAR, SEGUNDA_OPINIAO, ARM_SO_OLHAR, ARM_LIGO_NUMERO_MSG`

**Mão inicial:** `LOJA_OFICIAL, NAO_ABRO_ANEXO, ANTIVIRUS, FECHO_O_ALERTA, DUAS_ETAPAS, PAUSA, CANAL_OFICIAL, TENHO_BACKUP`

**Recompensas:** `P_BACKUP, P_ATUALIZADO, P_REDE_SEGURA`

| # | Título | Canal | Máscara (fictícia) | Matriz | Abordagem | Escalada | Pedido |
|---|---|---|---|---|---|---|---|
| 5.1 | Nota fiscal em anexo | E-mail | "Setor Fiscal" da Loja MegaCasa | BR-GP044 | AUTORIDADE+CURIOSIDADE p3 | CURIOSIDADE+MEDO p3 / MEDO+URGENCIA p3 | APP_ANEXO+CURIOSIDADE p3 |
| 5.2 | Seu computador está infectado! | Site | Falso "Suporte Técnico Certificado" | BR-GP045 | MEDO p3 | AUTORIDADE+URGENCIA p3 / MEDO+URGENCIA p3 | APP_ANEXO+AUTORIDADE p3 |
| 5.3 | Modo Segurança | Ligação | Falsa central do Banco Horizonte | BR-GP003, BR-GP043 | AUTORIDADE+MEDO p3 | URGENCIA+AUTORIDADE p3 / MEDO+URGENCIA p3 | APP_ANEXO+CODIGO p3 / APP_ANEXO+AUTORIDADE p3 |
| 5.4 | Caixa postal cheia | E-mail | "Equipe de Contas" do seu provedor de e-mail | BR-GP044 | AUTORIDADE+MEDO p3 | MEDO+URGENCIA p3 | LINK+SENHA p3 / LINK+APP_ANEXO p3 |
| 5.5 ★ | Fotos da confraternização | E-mail | Conta invadida de um colega de trabalho | BR-GP031 | CURIOSIDADE+AFETO p3 | APP_ANEXO+LINK p3 | PIX+MEDO p5 |

> **Balanceamento (15/10/2026):** pedidos e escaladas de p4 para p3; `ARM_CADEADO` saiu do pool (lição ainda com `verificar`); `A5_1_1`, `A5_4_1` e `A5_1_3` viraram combos. Aleatório: 0,9% → 11,7% (alvo 10–25%). Ótimo: 100% (teto).

---

## 11. Narrativa e tom

- **A Máscara** é o antagonista recorrente. A cada cenário ela veste um disfarce diferente (banco, parente, loja). Ela é caricata, nunca assustadora demais. Ao perder, ela "racha" a máscara; ao vencer, ri e some.
- **Você** é representado por um avatar neutro e escolhível. O jogo não pede nome real.
- **Tom:** leve, com humor e sem culpar a vítima. A mensagem é "golpistas são bons nisso; agora você também é".
- **Raio-X:** tem 3 a 5 linhas, linguagem simples, verbos de ação e o link para o fascículo oficial.
- **Mensagens da ameaça:** devem soar reais (gírias, emojis, erros sutis), mas **sem marcas, órgãos, domínios ou telefones reais** (§1).

---

## 12. Arquitetura técnica

### 12.1 Stack
- **Vite + TypeScript (`strict`)**, sem framework de UI. A UI é feita com DOM e funções de renderização simples, e o CSS fica em arquivos próprios.
- **Motor puro:** sem DOM, sem `Math.random` e sem `Date`. Toda aleatoriedade passa por um RNG semeado (mulberry32).
- **Zod** valida o conteúdo, **Vitest** roda os testes e **tsx** executa os *scripts*.
- O resultado é um **build estático** (`dist/`), que pode ser hospedado em GitHub Pages, Netlify, Cloudflare Pages ou num servidor interno.
- Animações usam CSS e a Web Animations API, sem biblioteca obrigatória.

### 12.2 Pastas
```
nao-clica/
├─ index.html
├─ config.json                 # constantes de balanceamento (§12.6)
├─ src/
│  ├─ engine/                  # TS puro, 100% testável
│  │  ├─ types.ts  rules.ts  reducer.ts  ai.ts  shop.ts  rng.ts  save.ts
│  ├─ content/
│  │  ├─ schema.ts             # Zod (espelha §12.4)
│  │  ├─ tags.json  defesas.json  protecoes.json  fontes.json
│  │  └─ niveis/01-golpes.json …
│  ├─ ui/
│  │  ├─ screens/  (menu, mapa, intro, mesa, raiox, loja, fimNivel, creditos, ajustes)
│  │  ├─ components/ (carta, mao, mensagem, placar, protecoes, desconfiometro)
│  │  └─ main.ts
│  └─ styles/
├─ scripts/
│  ├─ validate-content.ts      # §13
│  └─ simulate.ts              # §14
├─ tests/                      # *.test.ts
├─ CREDITS.md                  # créditos, licenças, fontes tipográficas
└─ README.md
```

### 12.3 Máquina de estados (`reducer(state, action) → state`)
```
MENU → MAPA → INTRO_CENARIO → VEZ_AMEACA → VEZ_JOGADOR → RESOLUCAO
                                   ▲                         │
                                   └──── (cenário segue) ────┘
RESOLUCAO → (cenário decidido) → [CONTENCAO]* → RAIOX → (nível decidido?)
   não → LOJA → INTRO_CENARIO
   sim → FIM_NIVEL → (vitória) RECOMPENSA → MAPA | (derrota) MAPA
* CONTENCAO apenas na fase 3, quando o jogador perde o cenário.
```
**Ações:** `INICIAR_NIVEL{nivelId, seed}`, `INICIAR_CENARIO`, `AMEACA_JOGA`, `USAR_DESCONFIOMETRO`, `DESMASCARAR`, `JOGAR_CARTA{cartaId}`, `CONTINUAR`, `ESCOLHER_CONTENCAO{opcao}`, `ESCOLHER_LOJA{ids[]}`, `TROCAR_NA_LOJA{sai, entra}`, `ESCOLHER_PROTECAO{id, substitui?}`, `VOLTAR_MAPA`.

### 12.4 Tipos de conteúdo
```ts
type Gatilho = 'AUTORIDADE'|'URGENCIA'|'RECOMPENSA'|'MEDO'|'AFETO'|'CURIOSIDADE';
type Pedido  = 'LINK'|'CODIGO'|'PIX'|'APP_ANEXO'|'SENHA'|'DADOS';
type Tag = Gatilho | Pedido;
type Canal = 'SMS'|'MENSAGEM'|'EMAIL'|'LIGACAO'|'REDE_SOCIAL'|'SITE';

interface Fonte { id: string; titulo: string; url: string }          // fontes.json

interface CartaDefesa {
  id: string; nome: string; contra: Tag[]; forca: 1|2|3;
  raridade: 'comum'|'incomum'|'rara';
  licao: string; fonte: string; verificar?: boolean;
  usoUnicoPorNivel?: boolean; armadilha?: boolean; mito?: string;      // mito: obrigatório se armadilha
}

interface CartaAmeaca {
  id: string; mensagem: string;            // ≤ 180 caracteres
  tags: Tag[];                             // 1 (ou 2 se o nível permitir combos)
  pressao: 1|2|3|4|5;
  sinais: string[];                        // cada item é substring exata de `mensagem`
}

interface Vaza { papel: 'abordagem'|'escalada'|'pedido'; opcoes: CartaAmeaca[] } // 1–2 opções

interface Cenario {
  id: string; titulo: string; canal: Canal; persona: string; contexto: string;
  vazas: [Vaza, Vaza, Vaza];
  desfechoVitoria: string; desfechoDerrota: string;
  raioX: { oQueEra: string; comoAgir: string[]; verificar?: boolean };
  contencao?: { opcoes: [string, string, string]; correta: 0|1|2; explicacao: string };
  fonte: string;
}

interface Nivel {
  id: string; ordem: number; titulo: string; fontes: string[];
  regras: {
    tagsVisiveis: boolean; pressaoMin: number; pressaoMax: number;
    combos: boolean; ia: 'roteiro'|'aleatoria'|'adaptativa';
    desmascarar: boolean; armadilhasNaLoja: boolean; rarasNaLoja: boolean;
  };
  pool: string[]; maoInicial: string[];    // maoInicial.length === 8
  cenarios: Cenario[];                     // exatamente 5; o 5º é o chefe
  recompensas: string[];                   // 3 ids de proteções
}

interface Protecao {
  id: string; nome: string; descricao: string; fonte: string;
  efeito:
    | { tipo: 'pressao'; tags: Tag[]; delta: number }
    | { tipo: 'forca'; contraTags: Tag[]; delta: number }
    | { tipo: 'converterDerrotaVaza'; tags: Tag[]; usosPorNivel: number }
    | { tipo: 'anularPontoCenario'; pedido: Pedido; usosPorNivel: number }
    | { tipo: 'desconfiometro'; delta: number }
    | { tipo: 'reservado' };
}
```

### 12.5 Salvamento
- O progresso fica em `localStorage`, na chave `naoclica.save.v1`, com um campo `versao` para migração.
- Toda leitura e escrita fica em `try/catch`, e o jogo funciona sem salvar se o armazenamento falhar (modo privado).
- O que é salvo: níveis desbloqueados, proteções, melhor Índice de Desconfiança por nível, ajustes e partida em andamento.

### 12.6 `config.json` (valores iniciais)
```json
{
  "tamanhoMao": 8, "ofertaLoja": 5, "ofertaLojaLeituraPerfeita": 6, "trocasPorLoja": 1,
  "maxCopias": 2, "pesosRaridade": { "comum": 60, "incomum": 30, "rara": 10 },
  "vazasParaVencerCenario": 2, "pontosParaVencerNivel": 3, "cenariosPorNivel": 5,
  "bonusContraParcial": 2, "empateFavorece": "ameaca", "pressaoBonusChefe": 1,
  "desconfiometroInicial": 3, "maxProtecoes": 3,
  "desmascarar": { "valorCenario": 2, "iaFogeSePressaoMaxRestante": 2 }
}
```

---

## 13. Validação de conteúdo (`npm run validate`)

O *build* falha se qualquer regra abaixo falhar.

1. Todos os `id` são únicos em todo o conteúdo.
2. Todas as referências apontam para algo que existe (`pool`, `maoInicial`, `recompensas`, `fonte`).
3. Cada nível tem exatamente 5 cenários; cada cenário tem 3 vazas, nesta ordem: abordagem, escalada, pedido. Cada vaza tem 1 ou 2 opções.
4. A `maoInicial` tem 8 cartas, todas contidas no `pool`.
5. A pressão de cada carta da ameaça fica dentro de `[pressaoMin, pressaoMax]`. O 5º cenário pode ultrapassar o teto em `pressaoBonusChefe`.
6. Se `combos: false`, toda carta da ameaça tem exatamente 1 tag.
7. **Vencibilidade:** para cada carta da ameaça existe ao menos 1 carta não armadilha no `pool` que a vence pelo algoritmo do §4.5, sem contar proteções.
8. Cada tag usada no nível tem pelo menos 1 contra não armadilha no `pool`.
9. Cada item de `sinais` é substring exata da `mensagem`, e cada `mensagem` tem até 180 caracteres.
10. **Segurança do conteúdo:**
    - Todo domínio detectado (regex de hostname) termina em `.example`, `.test` ou `.invalid`.
    - Todo telefone detectado usa DDD `00`.
    - Nenhum termo da lista de bloqueio `scripts/marcas-bloqueadas.txt` aparece (bancos, varejistas, apps de mensagem, órgãos públicos reais etc.).
11. Armadilhas têm o campo `mito` e só aparecem no `pool` de níveis com `armadilhasNaLoja: true`.
12. **Pendências:** o validador lista (como aviso, sem falhar) todas as cartas, cenários e Raio-X com `verificar: true`. A publicação final exige zero pendências.

---

## 14. Testes e balanceamento

**Testes unitários (Vitest), obrigatórios:**
- `resolverVaza` com tabela de casos: um por motivo (`armadilha`, `contra_perfeito`, `contra_parcial`, `forca`, empate → ameaça, `protecao`).
- Placar:
  - Um 2–0 encerra o cenário sem a vaza 3.
  - Um 3–x encerra o nível.
  - Desmascarar vale 2, e a fuga dá 1 ponto.
- Mão:
  - Depois da loja, a mão volta a ter 8 cartas.
  - As cartas usadas não voltam.
  - O limite de cópias é respeitado.
  - `usoUnicoPorNivel` é respeitado.
- IA:
  - A `adaptativa` escolhe a opção com menos contras na mão.
  - Com a mesma *seed*, a partida é idêntica.
- Proteções: cada efeito do §8.
- Save:
  - JSON corrompido ou ausente vira estado inicial, sem lançar erro.

**Simulação (`npm run simulate -- --nivel 1 --partidas 2000`)** com três bots:
- **ótimo**, que vê as tags, joga o contra perfeito se tiver e, se não tiver, a maior força efetiva;
- **guloso**, que joga sempre a carta de maior força;
- **aleatório**.

| Nível | Bot ótimo (vitória de nível) | Bot aleatório |
|---|---|---|
| 1 | ≥ 95% | 40–60% |
| 2–3 | 85–95% | 20–40% |
| 4–6 | 75–90% | 10–25% |
| 7–9 | 65–85% | ≤ 15% |

Estas faixas são um ponto de partida, a ser ajustado com testes com pessoas. Como o bot ótimo **enxerga as tags**, o resultado dele é um teto, e humanos ficarão abaixo. Se o bot ótimo ficar abaixo da faixa, o nível está injusto; se o aleatório ficar acima, o nível está fácil demais.

---

## 15. UI/UX

### 15.1 Telas
1. **Menu:** Continuar partida (se houver), Jogar, Como jogar, Créditos e fontes, Ajustes (música, animações reduzidas, tamanho do texto) e **Apagar progresso** (com confirmação; desativado sem progresso salvo). Ao lado (abaixo, no celular), o bloco **Regras em 30 segundos**: 4 passos e a anatomia da mensagem (pressão, rótulo de tática) e da carta (número pequeno = tecla/posição, número verde = força, rótulos = táticas anuladas), com marcadores numerados.
   - Nas telas de jogo (intro, mesa, Raio-X, loja, fim de nível sem proteção pendente) há o botão **⌂ Menu**, que pausa a partida (`ABRIR_MENU`) e volta à tela inicial.
2. **Mapa:** níveis com cadeado, fascículo-base e melhor Índice de Desconfiança.
3. **Intro do cenário:** máscara, canal, contexto e a frase "a Máscara começa".
4. **Mesa:**
   - No topo ficam a Máscara, o placar das vazas (●○○) e o placar do nível (Você 0 × 0 Ameaça).
   - No centro fica um **celular genérico** com a mensagem da ameaça, sem imitar nenhum app real.
   - À direita ficam as proteções e o Desconfiômetro.
   - Embaixo fica a **mão de 8 cartas**.
5. **Resolução:**
   - As cartas se encontram e o motivo aparece em letras grandes ("CONTRA PERFEITO!", "FORÇA 3 > PRESSÃO 2", "ARMADILHA!").
   - No contra perfeito, os sinais da mensagem pulsam.
6. **Raio-X:** a mensagem completa com os `sinais` grifados, "O que era", "Como agir" e o link para o fascículo oficial.
7. **Loja:** 5 cartas, um contador "escolha N", o botão Trocar (1x) e a prévia do próximo caso.
8. **Fim de nível:**
   - Na vitória: escolha da proteção, o Índice de Desconfiança e a tag em que você mais caiu.
   - Na derrota: o resumo e "Tentar de novo".
9. **Créditos:** fascículos com links, licença CC BY-NC-ND 4.0, aviso de que o jogo não é oficial do CERT.br e licenças das fontes tipográficas e *assets*.

### 15.2 Celular primeiro
- A tela de referência é 360 × 740 px. A mão aparece em leque com sobreposição: um toque levanta a carta e mostra os detalhes, e o botão "Jogar" confirma.
- Não pode haver rolagem horizontal da página. Alvos de toque têm pelo menos 44 px.
- A mensagem da ameaça usa uma **fonte de leitura legível**, porque ler bem é a habilidade central. A fonte *pixel* fica só para títulos e números.

### 15.3 Acessibilidade
- O jogo funciona inteiro pelo teclado: teclas `1`–`8` selecionam a carta, `Enter` joga, `D` usa o Desconfiômetro e `Esc` volta.
- O resultado de cada vaza é anunciado por `aria-live`. Todo ícone de tag tem rótulo em texto.
- `prefers-reduced-motion` desliga o tremor de tela, o *glitch* e o *scanline*.
- O contraste segue o WCAG AA, e nenhuma informação depende só de cor.

### 15.4 Direção visual (inspirada, não copiada)
- **Estética:** "terminal noturno" com leve efeito CRT, cartas com borda grossa e sombra dura, *hover* com inclinação e "pulo".
- **Paleta (tokens):**
  - `--fundo #10131a`
  - `--painel #1a1f2b`
  - `--texto #e8eaf0`
  - `--defesa #3ddc97`
  - `--ameaca #ff4d6d`
  - `--alerta #ffd166`
  - `--raro #a78bfa`
- **Fontes:** título em "Silkscreen" ou "VT323"; texto em "Inter" ou na fonte do sistema. Todas têm licença OFL, e os créditos ficam em `CREDITS.md`.
- **"Suco":**
  - O placar sobe como fichas.
  - O contra perfeito traz *flash* e um leve tremor.
  - A derrota traz um *glitch* na tela do celular.
  - A máscara racha ao perder.
  - **Trilha "Terminal Noturno"** (implementada): música generativa sintetizada com Web Audio (`src/ui/musica/`), 92 BPM, ciclo de ~20 min em 28 seções (intro → subida → clímax → ponte → segundo clímax → volta) que recomeça com outra semente, sem fim. Liga no primeiro clique/tecla; botão ♪ fixo no canto, tecla `M` e opção em Ajustes. Pausa com a aba escondida.
  - Efeitos sonoros: ainda não (fase 3).

---

## 16. Privacidade e segurança do próprio jogo

- **Coleta:** nenhuma. Não há *analytics* nem cadastro, e nenhum dado pessoal é pedido. O jogo usa só `localStorage` local, o que facilita adequação à LGPD.
- **Cabeçalhos:** se houver servidor próprio, usar CSP restritiva (`default-src 'self'`).
- **Dependências:** nenhum *script* de terceiros carregado em tempo de execução. As fontes ficam *self-hosted*.
- **Links:** o conteúdo da ameaça nunca gera link clicável (§1, regra 8). Os únicos links externos são os dos fascículos (Raio-X e Créditos), que apontam para `cartilha.cert.br` com `rel="noopener noreferrer"`.
- **Uso em turma ou empresa** (fase 4): se houver, a exportação de resultados é feita pelo próprio jogador, como um arquivo JSON baixado, e nunca é enviada automaticamente.

---

## 17. Roteiro e critérios de aceite

| Fase | Escopo | Pronto quando… |
|---|---|---|
| **0 — Licença** | Enviar o e-mail do Anexo A e registrar a resposta em `docs/licenca.md`. | O pedido foi enviado. Enquanto não houver resposta, valem as regras do §1. |
| **1 — MVP** | Motor + testes, nível 1 completo, loja, Raio-X, save, créditos, *deploy* estático. | Uma partida completa do nível 1 roda no celular e no desktop; `test`, `validate` e `build` passam; o bot ótimo vence ≥ 95%. |
| **2 — Campanha inicial** | Níveis 2–4, tags ocultas, Desconfiômetro, proteções, IA aleatória e adaptativa, armadilhas. | Validador sem erros, simulação dentro das faixas e 5 pessoas testaram. |
| **3 — Profundidade** | Desmascarar, Contenção, níveis 5–9, bônus Boatos, sons, polimento visual. | Mesmos critérios, com zero pendências `verificar`. |
| **4 — Opcional** | Modo turma, exportação de resultados, outros idiomas. | Conforme demanda. |

---

## Anexo A — Modelo de e-mail ao CERT.br

> **Para:** doc@cert.br
> **Assunto:** Pedido de autorização: jogo educativo baseado nos Fascículos da Cartilha
>
> Olá, equipe do CERT.br.
>
> Estou desenvolvendo o **Não Clica!**, um jogo educativo gratuito para navegador em que a pessoa jogadora enfrenta golpes digitais usando "cartas" de verificação. Cada nível é inspirado em um fascículo da Cartilha de Segurança para Internet.
>
> Os textos do jogo são originais e cada caso termina com um link para o fascículo oficial e o crédito ao CERT.br/NIC.br. Como os fascículos estão sob CC BY-NC-ND 4.0, gostaria de pedir autorização para adaptar os temas e recomendações em cenários do jogo. O uso previsto é: **[descrever: escolas / campanha interna / público geral; com ou sem fins comerciais]**.
>
> Também gostaria de saber se há orientações sobre o uso do nome "Cartilha" e se a equipe teria interesse em revisar o conteúdo.
>
> Obrigado,
> **[Nome] · [Organização] · [Contato]**

---

## Fontes

- Fascículos da Cartilha de Segurança para Internet — https://cartilha.cert.br/fasciculos/
- Licença de uso (CC BY-NC-ND 4.0) — https://cartilha.cert.br/cc/
- Como utilizar os materiais disponíveis (slides, contato `doc@cert.br`) — https://cartilha.cert.br/orientacoes-materiais/
- RFC 2606, Reserved Top Level DNS Names — https://www.rfc-editor.org/rfc/rfc2606
