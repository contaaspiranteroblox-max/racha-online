# RACHA v112 · o online tão liso quanto o treino — as causas, o que mudou e as medidas

O pedido (07/11/2026): *"No treino livre, a movimentação é fluida, mas nas salas online os jogadores apresentam travamentos,
quedas de FPS, movimentos bruscos e teletransportes."* Primeiro as causas no código, depois as correções, depois as medidas
(antes × depois, com os mesmos testes). Nada da física muda: o build confere o bloco da física (`sha256 ad9f1d2216409b0e`).

## 1. As causas encontradas

### 1.1 A tela: o quadro online pesava muito mais que o do treino (o motivo das quedas de FPS e das travadas)

Medido com o jogo de verdade no Chromium, a CPU 4× mais lenta (um Android intermediário), o 4G de mentira
(`tests/v92_proxy.cjs`: 45 ms ± 20, picos de 150 ms) e o perfil da CPU (`tests/v112_fps_medidas.py --perfil`). Com os
mesmos 8 jogadores, o treino 4×4 dava 45 fps e a partida online 4×4, 29 fps, com 126 travadas (quadros de mais de 50 ms) por
minuto (a mediana de 3 rodadas, abaixo). A rede em si (o replay da previsão e o quadro do servidor) custava pouco: ~1,4 ms por quadro. O que pesava era o que só
roda no online:

| causa (no código) | onde | custo no 4×4 online |
|---|---|---|
| a faixa do placar (SAÍDA DO SEU TIME, o aviso, a prorrogação) trocava a fonte do canvas e media o texto **a cada quadro** (`g.font = …; g.measureText(linha)`) | `tools/v95/hud.js` (`v95Placar`), e as cópias da v70 e da v80 | **10,4% de toda a CPU** numa linha |
| a página mudava a cada quadro sem mudar nada: o texto da barra da sala (`SALA X · 45 ms`) escrito até **4 vezes por quadro** pelos embrulhos empilhados do `x49GameUI` (v49, v68, v79, v103), e o `hidden` dos botões dela (CÂMERA, SAIR) e do chat reescrito igual | `backup/racha.html` (`x49GameUI`), `tools/salas_rua.js`, `tools/v79/ranqueada.js`, `tools/v103/arbitro.js`, `tools/v70/ajustes.js`, `tools/v88/espectador.js` | ~1.500 mudanças na página a cada 3 s |
| cada mudança acordava o observador das janelas, que refazia a busca de todas as janelas (um `querySelectorAll` para cada uma) e, com a página suja, os `getBoundingClientRect` forçavam o layout na hora | `tools/v70/polimento.js` (`v70Sincroniza`), `tools/v95/hud.js`, `tools/v93/falas.js` | 6,5% + 1,8% da CPU, mais o estilo e o layout recalculados |
| a barra da partida (`x49GameUI`) rodava **duas vezes por quadro** no online: no fim do quadro da partida e num segundo laço de `requestAnimationFrame` só dela | `backup/racha.html` (`x49Init`: o `tick`) | 2,1% da CPU |
| o endereço do servidor recalculado a cada quadro (`new URL`) pela barra do chat | `backup/racha.html` (`cbLugar` → `normalizaServidor`) | 0,5% da CPU |

### 1.2 A rede: por que a "verdade" do servidor anda aos trancos

O cliente já prevê tudo (a sua tampinha, a bola e os outros com as direções que o servidor manda — v92/v102), refaz a
previsão a cada quadro do servidor uma vez por quadro da tela (v108), ignora quadro velho (`tick ≤ lastTick`, e o WebSocket é
TCP: chega na ordem) e desliza as correções com molas críticas com teto e prazo (v96/v108), pulando direto só no recomeço (a
saída depois do gol) e em erros enormes. Medido no simulador do online (`tests/v112/sim.mjs`: o motor das salas de verdade e
uma cópia fiel do aparelho para cada jogador, cada um com a sua internet de mentira), a causa que sobra está no servidor:

- a fila de comandos de cada jogador anda **sem folga** (a cada meio segundo é cortada até sobrar só o comando do passo);
- com a oscilação normal da internet, a fila fica vazia na hora do passo em **18 a 29% dos passos** (até no Wi-Fi) — o
  servidor adivinha o comando (repete o último) e joga fora o de verdade quando ele chega;
- quase sempre o palpite acerta (quem corre segura a direção), mas na virada a verdade fica com a virada atrasada, e no 4G a
  tampinha **para e depois corre o dobro** (a recuperação da v96): 36 a 64 paradas por minuto na verdade de cada jogador (no
  Wi-Fi, 4 a 7; com 2% de perda de pacotes, mais de 450). É essa verdade que todo mundo vê e que corrige a previsão.

## 2. O que mudou

- **`tools/v112/tela.js`** (o build cola por último): escrever no `hidden` o valor que ele já tem não muda a página; os textos
  da barra da sala escritos durante a barra do quadro valem só no fim (a última escrita) e só se mudaram; a barra roda uma vez
  por quadro; as janelas continuam sincronizadas (o observador da v70 igual, mais a troca do lobby e uma conferência por
  segundo — nada depende das escritas repetidas); o endereço do servidor guardado por texto.
- **O placar** (`tools/v112/v112.py`): a largura da faixa vem do `medeTxt` (a medida guardada que o resto do HUD já usa), sem
  trocar a fonte nem medir a cada quadro — nas três cópias (v70, v80, v95).
- **O medidor da partida** (`tools/v112/diag.js`; Ajustes › Visual › *Medidor da partida*, e `window.RachaDiag.estado()`):
  FPS e quedas, travadas, o tempo de processamento do quadro, o ping, a variação (jitter, como no RTP), os quadros do servidor
  por segundo, os quadros pulados e os apagões (é assim que a perda de pacote aparece no WebSocket: o TCP reenvia e tudo chega
  junto depois), o tempo até o comando voltar confirmado, as correções por minuto (a sua, a da bola, a dos outros), os pulos,
  os recomeços e a divergência cliente × servidor (o tamanho de cada correção, 95% e máximo).
- **O colchão da fila de comandos** (`server/partida/colchao112.js`, no `server/partida/sala.js`) — **desligado por padrão**
  (`RACHA_COLCHAO=1` liga): cada jogador ganha uma folga do tamanho da oscilação dele (1 a 2 passos), e o comando atrasado anda
  no passo seguinte em vez de virar palpite. A troca medida está abaixo: a verdade do servidor fica bem mais lisa no 4G, mas o
  comando leva 16 a 34 ms a mais para valer e a bola prevista fica mais longe da verdade — o pedido diz para não atrasar os
  controles nem mexer na disputa da bola, então ele fica para quem quiser experimentar no servidor.

## 3. As medidas

### 3.1 A tela: o FPS antes × depois

`tests/v112_fps_medidas.py --cpu 4 --dur 10`: o jogo de verdade no Chromium com a CPU 4× mais lenta (o Android
intermediário), o 4G de mentira e o servidor das salas desta cópia (`RACHA_COLCHAO=0`: a mesma fila nos dois). O treino 4×4 e a
partida online contra bots (a fila da ranqueada) em 1×1, 2×2 e 4×4, com um dedo de mentira jogando. **Antes** = o mesmo build
sem a v112 (`tests/build/racha_teste_antes112.html`: a etapa `v112/v112` tirada da lista do `tools/aplicar_rua.py` e o
`server/partida/sala.js` do commit anterior, para a sala neste aparelho; `RACHA_TESTE=` aponta para ele); **depois** = com a v112. Três rodadas de cada, intercaladas (antes,
depois, antes, depois…); a tabela é a mediana.

| cena | FPS | intervalo entre quadros, 95% (ms) | quadros acima de 25 ms (%) | travadas acima de 50 ms (/min) | JavaScript do quadro, mediana (ms) | 95% (ms) | 99% (ms) | o desenho, mediana (ms) |
|---|---|---|---|---|---|---|---|---|
| treino 4×4 · antes | 45,4 | 33,4 | 30,6 | 6 | 2,8 | 6,1 | 9,0 | 1,8 |
| treino 4×4 · depois | **53,4** | 33,3 | **11,4** | 6 | 3,4 | 6,7 | 9,8 | 2,1 |
| online 1×1 · antes | 31,1 | 50,0 | 81,2 | 60 | 7,7 | 12,5 | 16,9 | 6,1 |
| online 1×1 · depois | **52,0** | **33,4** | **14,3** | **6** | **3,2** | **7,0** | **10,8** | **1,8** |
| online 2×2 · antes | 28,0 | 50,1 | 88,7 | 102 | 8,8 | 14,4 | 21,9 | 7,0 |
| online 2×2 · depois | **49,9** | **33,4** | **19,2** | **6** | **4,1** | **7,8** | **10,3** | **2,3** |
| online 4×4 · antes | 28,6 | 50,1 | 90,3 | 126 | 9,4 | 14,3 | 21,1 | 7,2 |
| online 4×4 · depois | **50,0** | **33,4** | **18,7** | **12** | **4,4** | **7,7** | **12,5** | **2,6** |

As rodadas, uma a uma (FPS): treino 48,8 / 45,4 / 43,8 → 52,8 / 56,4 / 53,4; 1×1 35,5 / 31,1 / 29,5 → 52,0 / 57,5 / 50,4;
2×2 32,6 / 27,6 / 28,0 → 48,6 / 58,1 / 49,9; 4×4 25,6 / 28,6 / 29,1 → 50,0 / 55,5 / 44,7. O online, que andava em 28–31 fps
com até 126 travadas por minuto, agora fica no nível do treino (50–52 fps contra 53). O JavaScript do quadro online caiu
pela metade e o desenho, de 7 para 2,6 ms — a faixa do placar estava dentro do desenho.

### 3.2 A página a cada quadro

`tests/v112_pagina_medidas.py` (a CPU normal, 60 quadros por segundo; 3 s de cada cena):

| cena | mudanças na página | sincronizações das janelas (v70) | a barra da partida rodou | quadros | medidas de texto (measureText) |
|---|---|---|---|---|---|
| treino 4×4 · antes | 608 | 196 | 181 | 180 | 183 |
| treino 4×4 · depois | **41** | **9** | 180 | 179 | **2** |
| online 4×4 · antes | 1.516 | 379 | 360 (2 por quadro) | 179 | 186 |
| online 4×4 · depois | **49** | **11** | **180 (1 por quadro)** | 179 | **6** |

As 41–49 mudanças que sobram são de verdade (o botão do emoji e o das falas abrindo e fechando, o texto da barra quando o
ping muda a cada 3 s).

### 3.3 A rede: o colchão da fila, ligado × desligado (1×1, 2×2 e 4×4; Wi-Fi, 4G, 4G ruim e 4G com perda)

`tests/v112/pareado.mjs`: a mesma partida (as mesmas 40 sementes de 60 s: a mesma internet de mentira e os mesmos
roteiros dos jogadores) sem o colchão, com o colchão até 2 passos e com o colchão de 1 passo. Cada número é a média; entre
parênteses, a diferença para "sem colchão", em **negrito com ▼/▲ quando ela passa do intervalo de 95%** (não é sorte). As
internets (em cada sentido, as do `tests/v92_proxy.cjs`): Wi-Fi 15 ms ± 6; 4G 50 ms ± 30 com um pico de 150 ms a cada ~4 s e
rajadas; 4G ruim 80 ms ± 30 com um pico a cada ~2 s e mais rajadas; 4G com perda = o 4G + 2% dos pacotes perdidos (o TCP
reenvia: tudo o que vem atrás espera).

**O servidor e a sua tampinha:**

| partida | variante | palpites do servidor (% dos passos) | paradas na verdade do servidor (por jogador, /min) | correção da sua tampinha (95%, px) | deslize da sua tampinha (95%, px) | comando até valer no servidor (mediana, ms) |
|---|---|---|---|---|---|---|
| 1×1 Wi-Fi | sem colchão (hoje) | 19,2 | 7,41 | 0,69 | 4,55 | 25,1 |
| 1×1 Wi-Fi | colchão até 2 passos | **1,04** (-18,2▼) | 5,69 (-1,72) | **0,37** (-0,32▼) | **3,34** (-1,20▼) | **41,1** (+16,0▲) |
| 1×1 Wi-Fi | colchão de 1 passo | **1,03** (-18,2▼) | 6,29 (-1,11) | **0,37** (-0,33▼) | **3,40** (-1,15▼) | **41,3** (+16,2▲) |
| 1×1 4G | sem colchão (hoje) | 22,1 | 35,9 | 2,49 | 7,96 | 77,2 |
| 1×1 4G | colchão até 2 passos | **2,81** (-19,3▼) | **14,9** (-21,0▼) | **1,60** (-0,89▼) | **6,75** (-1,21▼) | **110,5** (+33,3▲) |
| 1×1 4G | colchão de 1 passo | **8,29** (-13,8▼) | **25,8** (-10,1▼) | **2,04** (-0,45▼) | **7,16** (-0,80▼) | **93,8** (+16,5▲) |
| 1×1 4G ruim | sem colchão (hoje) | 22,7 | 62,2 | 4,03 | 10,6 | 112,1 |
| 1×1 4G ruim | colchão até 2 passos | **5,31** (-17,4▼) | **21,6** (-40,7▼) | **2,75** (-1,29▼) | 9,58 (-0,99) | **143,2** (+31,1▲) |
| 1×1 4G ruim | colchão de 1 passo | **10,7** (-12,0▼) | **40,4** (-21,8▼) | **2,94** (-1,10▼) | **9,38** (-1,19▼) | **127,6** (+15,5▲) |
| 1×1 4G com perda | sem colchão (hoje) | 17,7 | 470,8 | 5,65 | 15,0 | 98,7 |
| 1×1 4G com perda | colchão até 2 passos | **8,75** (-8,93▼) | **398,2** (-72,6▼) | **4,47** (-1,18▼) | **13,0** (-2,10▼) | **126,9** (+28,2▲) |
| 1×1 4G com perda | colchão de 1 passo | **11,0** (-6,68▼) | **441,3** (-29,5▼) | 5,11 (-0,55) | 14,1 (-0,94) | **110,5** (+11,8▲) |
| 2×2 Wi-Fi | sem colchão (hoje) | 25,7 | 5,25 | 0,68 | 4,49 | 23,3 |
| 2×2 Wi-Fi | colchão até 2 passos | **2,65** (-23,0▼) | 5,70 (+0,45) | 0,72 (+0,04) | 4,29 (-0,20) | **40,4** (+17,1▲) |
| 2×2 Wi-Fi | colchão de 1 passo | **2,92** (-22,8▼) | 6,38 (+1,13) | 0,75 (+0,07) | 4,36 (-0,13) | **40,5** (+17,1▲) |
| 2×2 4G | sem colchão (hoje) | 28,1 | 36,7 | 2,74 | 8,03 | 72,3 |
| 2×2 4G | colchão até 2 passos | **3,09** (-25,0▼) | **17,9** (-18,8▼) | **2,25** (-0,50▼) | 7,41 (-0,62) | **103,0** (+30,6▲) |
| 2×2 4G | colchão de 1 passo | **12,6** (-15,5▼) | **29,7** (-7,03▼) | 2,49 (-0,25) | 7,71 (-0,32) | **86,1** (+13,7▲) |
| 2×2 4G ruim | sem colchão (hoje) | 28,5 | 64,1 | 4,84 | 11,6 | 105,5 |
| 2×2 4G ruim | colchão até 2 passos | **5,77** (-22,7▼) | **27,8** (-36,2▼) | **3,70** (-1,14▼) | 10,9 (-0,70) | **137,8** (+32,3▲) |
| 2×2 4G ruim | colchão de 1 passo | **13,8** (-14,6▼) | **46,0** (-18,0▼) | 4,48 (-0,36) | 11,8 (+0,16) | **119,6** (+14,1▲) |
| 2×2 4G com perda | sem colchão (hoje) | 21,6 | 462,7 | 6,76 | 16,1 | 88,7 |
| 2×2 4G com perda | colchão até 2 passos | **8,92** (-12,6▼) | **393,6** (-69,2▼) | **5,99** (-0,76▼) | 15,0 (-1,04) | **122,0** (+33,3▲) |
| 2×2 4G com perda | colchão de 1 passo | **11,2** (-10,4▼) | **429,1** (-33,6▼) | 6,35 (-0,41) | 15,7 (-0,36) | **108,2** (+19,5▲) |
| 4×4 Wi-Fi | sem colchão (hoje) | 25,7 | 3,96 | 0,65 | 4,16 | 23,9 |
| 4×4 Wi-Fi | colchão até 2 passos | **3,19** (-22,5▼) | 4,71 (+0,74) | 0,61 (-0,04) | **3,41** (-0,74▼) | **40,9** (+16,9▲) |
| 4×4 Wi-Fi | colchão de 1 passo | **3,88** (-21,8▼) | 4,72 (+0,76) | 0,60 (-0,05) | **3,42** (-0,73▼) | **40,7** (+16,7▲) |
| 4×4 4G | sem colchão (hoje) | 27,7 | 36,0 | 2,04 | 7,05 | 73,1 |
| 4×4 4G | colchão até 2 passos | **3,12** (-24,6▼) | **15,5** (-20,5▼) | 1,87 (-0,17) | 6,55 (-0,50) | **105,1** (+32,0▲) |
| 4×4 4G | colchão de 1 passo | **10,6** (-17,1▼) | **24,4** (-11,6▼) | 1,90 (-0,14) | 6,56 (-0,49) | **88,9** (+15,8▲) |
| 4×4 4G ruim | sem colchão (hoje) | 26,0 | 61,4 | 3,48 | 10,1 | 107,6 |
| 4×4 4G ruim | colchão até 2 passos | **5,71** (-20,3▼) | **26,8** (-34,6▼) | 3,31 (-0,17) | 10,1 (-0,03) | **138,8** (+31,2▲) |
| 4×4 4G ruim | colchão de 1 passo | **11,8** (-14,2▼) | **43,6** (-17,8▼) | 3,18 (-0,30) | 9,47 (-0,67) | **123,2** (+15,5▲) |
| 4×4 4G com perda | sem colchão (hoje) | 19,7 | 467,6 | 6,01 | 14,5 | 88,2 |
| 4×4 4G com perda | colchão até 2 passos | **8,89** (-10,8▼) | **385,0** (-82,6▼) | 5,36 (-0,65) | 13,9 (-0,66) | **122,5** (+34,3▲) |
| 4×4 4G com perda | colchão de 1 passo | **11,0** (-8,69▼) | **426,0** (-41,5▼) | **5,31** (-0,70▼) | 14,1 (-0,39) | **106,8** (+18,6▲) |

**O que você vê dos outros e da bola:**

| partida | variante | pulos dos outros na tela (/min) | paradas dos outros na tela (/min) | os outros × a verdade (95%, px) | a bola × a verdade (95%, px) | correção da bola (95%, px) | bola desenhada dentro de uma tampinha (% dos quadros) |
|---|---|---|---|---|---|---|---|
| 1×1 Wi-Fi | sem colchão (hoje) | 3,58 | 6,12 | 12,6 | 12,5 | 0,38 | 0,19 |
| 1×1 Wi-Fi | colchão até 2 passos | 2,14 (-1,43) | **4,05** (-2,08▼) | 13,3 (+0,66) | **16,1** (+3,63▲) | **0,23** (-0,15▼) | 0,23 (+0,04) |
| 1×1 Wi-Fi | colchão de 1 passo | 2,21 (-1,37) | **3,83** (-2,29▼) | **13,5** (+0,82▲) | **16,4** (+3,94▲) | 0,24 (-0,13) | 0,22 (+0,04) |
| 1×1 4G | sem colchão (hoje) | 4,46 | 5,93 | 35,1 | 37,6 | 2,20 | 0,48 |
| 1×1 4G | colchão até 2 passos | 3,76 (-0,70) | 3,86 (-2,07) | **39,1** (+4,01▲) | **45,6** (+8,01▲) | 2,79 (+0,59) | 0,44 (-0,05) |
| 1×1 4G | colchão de 1 passo | 4,71 (+0,24) | 5,50 (-0,43) | **37,3** (+2,22▲) | **41,3** (+3,75▲) | 2,67 (+0,46) | 0,39 (-0,09) |
| 1×1 4G ruim | sem colchão (hoje) | 4,40 | 6,64 | 54,4 | 58,4 | 4,72 | 0,70 |
| 1×1 4G ruim | colchão até 2 passos | 4,53 (+0,14) | 5,36 (-1,28) | 56,2 (+1,81) | **72,9** (+14,5▲) | 5,01 (+0,29) | 0,61 (-0,09) |
| 1×1 4G ruim | colchão de 1 passo | 4,38 (-0,02) | 5,17 (-1,47) | **58,0** (+3,66▲) | 61,9 (+3,51) | 4,26 (-0,46) | 0,70 (+0,00) |
| 1×1 4G com perda | sem colchão (hoje) | 9,05 | 6,94 | 82,0 | 71,0 | 6,75 | 0,64 |
| 1×1 4G com perda | colchão até 2 passos | **4,85** (-4,20▼) | 5,31 (-1,63) | 80,7 (-1,21) | 78,2 (+7,24) | **7,99** (+1,23▲) | 0,63 (-0,01) |
| 1×1 4G com perda | colchão de 1 passo | 5,73 (-3,32) | 7,01 (+0,07) | **85,7** (+3,72▲) | 75,4 (+4,46) | 6,96 (+0,21) | 0,54 (-0,10) |
| 2×2 Wi-Fi | sem colchão (hoje) | 5,27 | 7,11 | 9,82 | 14,0 | 0,27 | 0,22 |
| 2×2 Wi-Fi | colchão até 2 passos | 6,06 (+0,80) | **5,74** (-1,37▼) | **11,2** (+1,42▲) | **20,2** (+6,22▲) | **0,41** (+0,13▲) | **0,45** (+0,23▲) |
| 2×2 Wi-Fi | colchão de 1 passo | 6,12 (+0,86) | 6,04 (-1,08) | **11,3** (+1,47▲) | **25,1** (+11,2▲) | **0,41** (+0,14▲) | 1,01 (+0,78) |
| 2×2 4G | sem colchão (hoje) | 5,74 | 5,78 | 29,1 | 43,5 | 2,59 | 1,01 |
| 2×2 4G | colchão até 2 passos | 5,17 (-0,57) | 6,23 (+0,45) | **30,5** (+1,46▲) | **64,0** (+20,5▲) | 2,79 (+0,19) | 0,98 (-0,03) |
| 2×2 4G | colchão de 1 passo | 5,19 (-0,55) | 6,66 (+0,88) | 30,0 (+0,93) | 46,7 (+3,14) | 2,62 (+0,03) | 0,93 (-0,08) |
| 2×2 4G ruim | sem colchão (hoje) | 5,26 | 6,03 | 46,3 | 67,7 | 5,25 | 1,51 |
| 2×2 4G ruim | colchão até 2 passos | 5,63 (+0,36) | 5,92 (-0,11) | **48,3** (+2,06▲) | **78,0** (+10,3▲) | 5,48 (+0,23) | 1,38 (-0,12) |
| 2×2 4G ruim | colchão de 1 passo | 5,09 (-0,17) | 6,74 (+0,71) | **47,9** (+1,65▲) | **73,9** (+6,14▲) | 5,15 (-0,10) | 1,88 (+0,37) |
| 2×2 4G com perda | sem colchão (hoje) | 8,61 | 10,2 | 71,4 | 75,1 | 7,27 | 1,46 |
| 2×2 4G com perda | colchão até 2 passos | **5,23** (-3,38▼) | **6,95** (-3,22▼) | 71,5 (+0,10) | 84,2 (+9,04) | **9,40** (+2,13▲) | 1,55 (+0,10) |
| 2×2 4G com perda | colchão de 1 passo | **5,83** (-2,78▼) | **7,28** (-2,89▼) | 71,8 (+0,45) | 79,3 (+4,12) | 8,16 (+0,89) | 1,45 (-0,01) |
| 4×4 Wi-Fi | sem colchão (hoje) | 25,7 | 94,5 | 9,74 | 14,5 | 0,23 | 0,23 |
| 4×4 Wi-Fi | colchão até 2 passos | **35,7** (+10,0▲) | **87,0** (-7,43▼) | **10,7** (+0,93▲) | **20,3** (+5,77▲) | 0,17 (-0,06) | **0,49** (+0,26▲) |
| 4×4 Wi-Fi | colchão de 1 passo | **36,5** (+10,9▲) | **87,1** (-7,33▼) | **10,7** (+0,92▲) | **20,8** (+6,24▲) | 0,18 (-0,05) | **0,53** (+0,30▲) |
| 4×4 4G | sem colchão (hoje) | 80,4 | 32,5 | 28,1 | 44,6 | 1,32 | 1,16 |
| 4×4 4G | colchão até 2 passos | 81,4 (+1,01) | 30,8 (-1,70) | **29,9** (+1,78▲) | **57,7** (+13,1▲) | 1,69 (+0,37) | 1,21 (+0,05) |
| 4×4 4G | colchão de 1 passo | 81,6 (+1,28) | 31,9 (-0,61) | **29,4** (+1,26▲) | **55,9** (+11,4▲) | 1,51 (+0,18) | 1,44 (+0,28) |
| 4×4 4G ruim | sem colchão (hoje) | 77,0 | 23,8 | 44,7 | 69,1 | 3,09 | 1,08 |
| 4×4 4G ruim | colchão até 2 passos | **84,1** (+7,10▲) | 24,0 (+0,20) | **46,6** (+1,86▲) | **95,8** (+26,7▲) | **4,32** (+1,23▲) | **1,96** (+0,88▲) |
| 4×4 4G ruim | colchão de 1 passo | 77,0 (-0,04) | 24,0 (+0,16) | **45,7** (+1,00▲) | **79,3** (+10,1▲) | 3,25 (+0,16) | 1,33 (+0,25) |
| 4×4 4G com perda | sem colchão (hoje) | 49,8 | 16,2 | 71,8 | 75,2 | 5,21 | 1,04 |
| 4×4 4G com perda | colchão até 2 passos | 47,8 (-1,97) | **12,4** (-3,80▼) | 72,6 (+0,82) | **91,6** (+16,4▲) | **7,09** (+1,89▲) | 1,58 (+0,55) |
| 4×4 4G com perda | colchão de 1 passo | 47,0 (-2,82) | **13,2** (-3,05▼) | 72,3 (+0,48) | 82,1 (+6,89) | 5,67 (+0,46) | 1,39 (+0,35) |

**Leitura**: o colchão faz o que promete no servidor — os palpites caem de 18–29% para 1–9% dos passos e as paradas na
verdade do servidor caem 50 a 65% no 4G — e a sua tampinha corrige menos (1×1 e 2×2). Mas o comando passa a valer 16 ms
(Wi-Fi) a 34 ms (4G) mais tarde, a previsão precisa adivinhar mais longe, e **na tela** isso aparece: a bola fica mais longe
da verdade em todos os casos (no 4×4, de +6 px no Wi-Fi a +27 px no 4G ruim), e no 4×4 os outros pulam mais (+10 por minuto
no Wi-Fi) e a bola é desenhada dentro de uma tampinha com mais frequência. O colchão de 1 passo divide a troca ao meio, sem
mudar o sinal. Como o pedido é não atrasar os controles e não mexer na disputa da bola, **o colchão fica desligado** (a fila
de sempre, conferida quadro a quadro igual à de antes pelos testes da v92, v96, v99, v102 e v108) e pode ser ligado no
servidor com `RACHA_COLCHAO=1` para quem quiser experimentar.

### 3.4 Os testes

- **Novos**: `tests/v112_tela_test.py` (26 verificações: a página quase sem mudanças no treino e no online, a barra uma vez
  por quadro e com o texto certo, a sincronização das janelas rara e a pausa ainda virando janela, o placar sem medir a
  cada quadro, o medidor com os números da tela, da rede e das correções, a caixinha ligando, sem pegar o toque e sumindo)
  e `tests/v112_colchao_test.mjs` (27: a medida do colchão, desligado por padrão, a mesma verdade quadro a quadro sem ele,
  e com ele os palpites caindo, o atrasado segurado e o atraso a mais do tamanho do colchão em 1×1, 2×2 e 4×4).
- **Os de antes que mexem no que mudou**, todos passando: `polimento` (64: o foco e as janelas da v70), `ajustes_linhas`
  (34), `v79` (68: a ranqueada online e a barra dela), `v103_salas` (15: a sala com árbitro e a barra), `v99_chutes_online`
  (48: a sala neste aparelho, com o pacote do motor novo), `v92` (35: a cadência e o painel de testes), `v111_enxuga` (15: o
  jogo enxuto é o mesmo programa), `online` (31: as salas públicas pelo navegador), `v108_lento` (20), `v96_online` (12: o 4G do Brasil até a Virgínia), `v88_cliente` (39: o jogo logado, o espectador) e `v92_online` (16) e, sem navegador, `v83_sala` (60), `v92_nucleo` (22), `v93_salas` (30),
  `v94_sala` (35), `v96_rede` (36), `v102_rede` (35), `v105_rede` (20), `v108_rede` (23), `v108_servidor` (21), `v99_chutes`
  (94), `v103_ranqueada` (12), `v106_corpo` (9) e `v109_silencio_salas` (20).
- O build: `ok · fisica identica · sha256 ad9f1d2216409b0e`.

## 4. O que ficou de fora (e por quê)

- **Ver os outros jogadores "no passado" com um buffer de interpolação** (o que muitos jogos fazem): no RACHA a bola e o
  contato são previstos no presente (v92/v105); desenhar os outros ~100 ms atrás faria a bola bater em quem ainda não chegou
  na tela. O equivalente do lado do servidor (o colchão) foi feito e medido: a troca não compensou, então fica desligado.
- **Mudar o formato dos pacotes** (os quadros em bytes no lugar do JSON): é uma troca de protocolo que pede o servidor e os
  aparelhos atualizados juntos; o codec já está pronto e testado no protótipo do Colyseus (`prototipos/colyseus`), para a
  migração.
- **30, 60, 90 e 120 Hz**: a cadência (o passo fixo de 60 por segundo, o desenho entre os passos e o FPS em passo inteiro) é
  a da v92 e continua igual — o `tests/v92_test.py` confere e passa.

## 5. Para conferir no celular

Ajustes › Visual › **Medidor da partida**: a caixinha no canto mostra, na partida, o FPS, as quedas e as travadas, o tempo do
quadro, o ping, a variação, os quadros do servidor por segundo, os apagões, o tempo até o comando voltar confirmado, as
correções (você, a bola e cada outro jogador), os pulos, os recomeços e a diferença para o servidor. Os mesmos números saem
de `window.RachaDiag.estado()` (o `RachaDiag.zera()` começa a conta de novo).
