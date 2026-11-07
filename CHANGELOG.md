# RACHA · mudanças

As versões até a v83 estão descritas no `LEIA-ME.md` (uma seção por versão). Este arquivo começa na v85.

## v115 — 07/11/2026 · a partida da sala personalizada limpa

A pedido, com a foto de como estava e a de como queria: *"um bagulho bem limpo… isso tá poluindo muito o jogo"*. A faixa de
cima da partida nas salas ("SALA KL6S6Q · árbitro" com SALA, CÂMERA: BOLA e SAIR escritos) ocupava o canto de cima à direita —
no celular deitado ela até cortava os botões e encostava no PASSE.

- **Os botões só com o desenho** (`tools/v115/limpa.js`), quadrados como o da pausa (o contorno escuro e a sombra dura), em
  fila do lado da pausa, no canto de cima à esquerda: **SALA** (azul, o desenho de menu: abre a sala) para todo mundo e, para
  quem assiste, **CÂMERA** (azul: troca quem ela acompanha) e **SAIR** (vermelho, a porta). São os mesmos botões de antes (o
  que cada um faz não muda); se os botões do placar estiverem no caminho, a fila desce embaixo da pausa, e com a pausa mudada
  de lugar no EDITAR HUD ela fica no canto de cima à direita. Os desenhos são nossos (SVG simples).
- **Sem o texto da faixa**: o código da sala e o "· árbitro" saem da partida (estão na tela da sala); a pausa do árbitro já
  tem o aviso grande no meio da tela; só o "esperando quem roda a partida" continua, numa plaquinha.
- **O FPS e o ping** pequenos no canto de baixo à esquerda (o ping some na sala neste aparelho).
- Vale nas salas personalizadas (online, neste aparelho, do Rachão e do mapa); **a ranqueada fica como estava**.
- **Testes**: `tests/v115_limpa_test.py` (20, no navegador: quem joga e quem assiste, no celular e no PC, os botões do lado da
  pausa sem encostar no placar, nas falas, no emoji nem no PASSE, o FPS e o ping, o SALA, a CÂMERA, a pausa do árbitro, o
  SAIR e a ranqueada igual), com as fotos em `tests/saida/`.

## v114 — 07/11/2026 · a sala personalizada com até 17 pessoas

A pedido: *"pode pôr até 17 jogadores na sala"*. A sala personalizada (a online, do CRIAR SALA) cabia 12 pessoas; agora
cabe **17** (`server/turma.js`, `MAX_GENTE`): os times em campo (até 4x4) e o resto assistindo, esperando a vez — o
árbitro troca quem joga pela ficha, como já era. A 18ª pessoa ouve "A sala está cheia (17 pessoas)"; o convite pelo chat e
a lista das salas usam o mesmo número. A sala do Rachão e a do mapa da Oficina continuam com 20.

- **Testes**: `tests/v114_sala17_test.py` (7, no navegador: 17 conexões de verdade na sala, a 18ª recusada, a tela da sala
  com as 17 pessoas no PC e no celular deitado — a coluna de quem assiste rola —, a partida começando com 15 assistindo);
  o `tests/v107_convite_servidor_test.mjs` enche a sala até 17. Passam também `servidor_test`, `v88_social`, `v93_salas` e
  `v113_salas`.

## v113 — 07/11/2026 · as salas personalizadas com 10 minutos e a saída do Time Vermelho no começo

A pedido: *"quero 10 min nas salas personalizadas"* e *"quando a sala iniciar é sempre do mesmo lado, porém quando um time
fizer gol a bola vai pro que sofreu o gol"*.

- **10 MINUTOS**: o TEMPO da sala personalizada vai de "sem tempo" (1º a 3) a 2, 3, 5 e agora **10 minutos** — no CRIAR SALA,
  nas regras da sala e na sala neste aparelho (`SL_TEMPOS`, `tools/v113/v113.py`); o servidor aceita o mesmo
  (`server/turma.js`, `TEMPOS`). Empate no fim continua indo para o GOL DE OURO.
- **A SAÍDA**: na sala personalizada a partida começa **sempre com a saída do Time Vermelho** (o da esquerda) — antes era
  sorteada pela hora; depois de cada gol sai quem levou o gol, como já era (`server/partida/sala.js`, que a sala neste
  aparelho também usa). A ranqueada continua sorteando a primeira saída.
- **Testes**: `tests/v113_salas_test.mjs` (15, sem navegador: a saída do Vermelho a qualquer hora nos dois motores, quem
  sai depois de cada gol, a ranqueada sorteando, os 10 minutos no motor e no servidor, e os tempos que não existem
  recusados) e `tests/v113_salas_test.py` (10, no navegador: o TEMPO com 10 minutos, a sala online de 10 minutos com 10:00
  e a saída do Vermelho nos dois aparelhos, e a sala neste aparelho igual). Passam também `v103_salas`, `v99_chutes_online`,
  `online`, `v79`, `v93_fase3`, `v112_tela` e os do servidor.

## v112 — 07/11/2026 · o online tão liso quanto o treino (a tela sem travar, o medidor da partida e o colchão medido)

A pedido: *"No treino livre, a movimentação é fluida, mas nas salas online os jogadores apresentam travamentos, quedas de FPS,
movimentos bruscos e teletransportes"* — primeiro as causas no código, depois as correções e as medidas antes × depois. A
física não muda (o build confere: `sha256 ad9f1d2216409b0e`). O relatório inteiro, com as tabelas: `docs/v112/RESULTADOS.md`.

- **AS CAUSAS (medidas com o perfil da CPU, o jogo de verdade, a CPU 4× mais lenta e o 4G de mentira)**: o online pesava o
  dobro do treino por coisas que só rodam nele — a faixa do placar (SAÍDA DO SEU TIME…) trocava a fonte e media o texto a
  cada quadro (10% de toda a CPU numa linha); o texto da barra da sala era reescrito até 4 vezes por quadro pelos embrulhos
  empilhados do `x49GameUI` e o `hidden` dos botões dela e do chat, reescrito igual — ~1.500 mudanças na página a cada 3 s,
  cada uma acordando o observador das janelas da v70 (a busca de todas as janelas: mais 6,5%) e sujando o layout que os
  `getBoundingClientRect` forçavam na hora; e a barra da partida rodava duas vezes por quadro (um segundo laço de
  `requestAnimationFrame`, o da v49). A previsão e o replay da rede custavam pouco (~1,4 ms por quadro).
- **A TELA** (`tools/v112/tela.js` e `tools/v112/v112.py`): o placar mede a faixa com a medida guardada (`medeTxt`), sem
  trocar a fonte; escrever no `hidden` o valor que ele já tem não muda a página; o texto da barra da sala vale só no fim da
  barra do quadro (a última escrita) e só se mudou; a barra roda uma vez por quadro; as janelas continuam sincronizadas (o
  observador igual, mais a troca do lobby e uma conferência por segundo); o endereço do servidor fica guardado por texto.
  **Resultado** (a mediana de 3 rodadas intercaladas, a CPU 4× mais lenta): o online 1×1 de **31 para 52 fps**, o 2×2 de
  **28 para 50** e o 4×4 de **29 para 50** (o treino 4×4: 53), as travadas acima de 50 ms de 60–126 para 6–12 por minuto, o
  JavaScript do quadro online pela metade (4×4: 9,4 → 4,4 ms) e o desenho de 7,2 para 2,6 ms. A página: de 1.516 para 49
  mudanças em 3 s, e a sincronização das janelas de 379 para 11 vezes. O treino também ganhou (45 → 53 fps): o `hidden`
  repetido acontecia nele também.
- **O MEDIDOR DA PARTIDA** (`tools/v112/diag.js`; Ajustes › Visual › *Medidor da partida*, desligado por padrão, e
  `window.RachaDiag.estado()`): o FPS, as quedas, as travadas e o tempo de cada quadro; o ping, a variação (jitter), os quadros
  do servidor por segundo, os apagões e os passos sem quadro (a perda de pacotes no WebSocket aparece assim: o TCP reenvia e
  tudo chega junto); o tempo até o comando voltar confirmado; as correções por minuto (você, a bola, cada outro), os pulos, os
  recomeços e a divergência cliente × servidor (95% e máximo). Vetores fixos (nada novo a cada quadro); a caixinha só é escrita
  duas vezes por segundo, e não pega o toque.
- **O COLCHÃO DA FILA DE COMANDOS** (`server/partida/colchao112.js`, no `server/partida/sala.js`), **desligado por padrão**: a
  causa dos trancos na "verdade" do servidor é a fila sem folga (o servidor adivinha o comando em 18 a 29% dos passos; no 4G,
  36 a 64 paradas por minuto na verdade de cada um). Com o colchão (1 a 2 passos, do tamanho da oscilação de cada jogador; o
  atrasado anda no passo seguinte), os palpites caem para 1–9% e as paradas 50–65% — mas o comando passa a valer 16 a 34 ms
  mais tarde e a bola prevista fica mais longe da verdade (no 4×4, os outros pulam mais). Medido em 1×1, 2×2 e 4×4 com Wi-Fi,
  4G, 4G ruim e 4G com perda (40 partidas de 60 s por caso, as mesmas com e sem: `tests/v112/pareado.mjs`). Como o pedido é
  não atrasar os controles nem mexer na disputa da bola, fica desligado (a fila de sempre, quadro a quadro igual: os testes da
  v92, v96, v99, v102 e v108 conferem) — `RACHA_COLCHAO=1` no servidor liga. A sala neste aparelho (o pacote da v99) leva o
  `colchao112.js`, desligado.
- **Testes**: `tests/v112_tela_test.py` (26 verificações, no navegador) e `tests/v112_colchao_test.mjs` (27, sem navegador),
  novos; as medidas (não são passa/falha): `tests/v112_fps_medidas.py`, `tests/v112_pagina_medidas.py`, `tests/v112/sim.mjs`
  (o simulador do online para 1×1, 2×2 e 4×4, com a perda de pacotes do TCP) e `tests/v112/pareado.mjs`. Passam também os de
  antes que mexem no que mudou: `polimento`, `ajustes_linhas`, `v79`, `v103_salas`, `v99_chutes_online`, `v92`, `online`,
  `v111_enxuga`, `v108_lento`, `v96_online`, `v88_cliente`, `v92_online` e os do servidor (`v83_sala`, `v92_nucleo`, `v93_salas`, `v94_sala`, `v96_rede`, `v102_rede`,
  `v105_rede`, `v108_rede`, `v108_servidor`, `v99_chutes`, `v103_ranqueada`, `v106_corpo`, `v109_silencio_salas`). O
  `tools/v92/pacote.py` confere os arquivos da v112 no ZIP.

## v111 — 06/11/2026 · o jogo mais leve (sem o peso das versões antigas) e o CI de volta

A pedido: *"tira tudo que pesa o jogo, versões antigas que não precisa mais, só deixe o que precisa, e atualiza lá"*. Nada
do que o jogador vê muda: a física (o build confere: `sha256 ad9f1d2216409b0e`), as telas, os textos, os sons e o que o
`config.js` liga e desliga são os mesmos. O backup do antes: o commit `848fc2e` (a v110, o botão de metal; daqui não deu para criar a etiqueta `antes-v111` no GitHub).

- **O QUE PESAVA**: o `racha.html` tinha 7.390 KB (3.372 KB com o gzip do Caddy): 2,5 MB de imagens embutidas, 840 KB de
  comentários, o recuo das linhas e ~4,5 MB do código das versões empilhadas. As 35 pastas de `tools/` são o código-fonte do
  jogo (cada versão é uma camada por cima da outra, e as de hoje chamam as de antes): elas não vão para o jogador — o que vai
  é o `racha.html` montado.
- **AS IMAGENS DE VERSÕES ANTIGAS QUE NÃO APARECEM MAIS** (`tools/v111/enxuga.py`, a lista APOSENTADAS) viram um pontinho
  transparente (1×1), com as medidas mantidas (o código de antes continua achando o que procura): o fundo das telas da v91 (a
  v101 troca pelo dela antes de a tela ser pintada), o fundo do lobby da v75 e o da v77 (só eram pintados no `#lb-fundo`,
  escondido desde a v90), o banner do perfil da v77 (o banner da v91 cobre) e a ilustração do cartão da OFICINA da v101 (a
  v102 tirou o cartão da tela inicial). Cada uma confere, no jogo montado, o motivo de não aparecer: se uma versão futura
  voltar a mostrar alguma, o build para e avisa. Ficam (aparecem): o fundo da v91 (é o fundo da tela de ENTRAR, pelo
  `--v91-fundo`), o letreiro e os ícones da v77, os banners da v91, os emojis, o fundo da v101/v103, os kits dos campos e as
  tampinhas animadas (as prontas voltam com `skinsProntas: true`).
- **O CÓDIGO E O ESTILO SEM COMENTÁRIOS NEM RECUO** no que vai para o jogador (a mesma etapa): nada dentro de texto ou de
  expressão regular muda, as linhas não são juntadas (o ponto e vírgula automático fica igual) e o bloco da física fica byte a
  byte igual. Os comentários continuam onde se edita (`tools/` e `backup/`); a cópia completa do jogo montado fica em
  `tests/build/racha_completo.html` (o `tools/mapa_codigo.py` lê ela — e o `tools/MAPA_REDEFINICOES.md` foi refeito).
- **O RESULTADO**: o `racha.html` de **7.390 KB para 6.080 KB** (−18%); com o gzip, de **3.372 KB para 2.834 KB** (−16%). O
  celular também deixa de abrir as 5 imagens no começo.
- **A PASTA DO PROJETO**: as imagens originais geradas por IA (os PNG de `tools/v74` a `tools/v77`, de `tools/v91` e a
  referência da v101, ~27 MB) e os scripts que recortavam as peças delas (`*_kit.py`, `pecas.py`, `tools/v75/lobby_fundo.py`,
  `tools/v91/fundo.py` e `tools/v91/banners.py`) saíram: não entravam no jogo desde a v95 (a arte desenhada em código). Saíram
  também os recortes em WebP delas (os 11 de `tools/v74` a `tools/v77` e de `tools/v91`, ~1,3 MB): o build embutia cada um e
  logo depois trocava pela arte da v95 — agora a arte da v95 entra direto no lugar (`tools/aplicar_rua.py` e
  `tools/v91/v91.py`; a troca do `tools/v95/v95.py` saiu) e o jogo gerado ficou o mesmo, byte a byte (conferido: o
  `racha.html`, a cópia completa e a de teste). E os 7 originais da plataforma da v69 guardados em `backup/`, que nada usava.
  A pasta foi de 53 MB para 22 MB; tudo continua no histórico (o commit `1b2b8c4`). A medida do fundo da v75 (1844 × 853),
  que o build lia do PNG, ficou escrita no `tools/aplicar_rua.py`.
- **O CI DE VOLTA**: o *Testar e publicar* do GitHub falhava desde a v101 na conferência de tipos da plataforma (o `tsc -b`),
  então os testes no navegador e o deploy na VPS nunca chegaram a rodar. Os dois erros: o `server/ip.js` sem tipos (agora o
  `server/ip.d.ts`, como o `turma.d.ts` e o `ws.d.ts`) e o fundador e as mascotes lidos de dentro de uma transação (as
  leituras deles aceitam a transação: só o tipo muda). E os testes no navegador do CI paravam no `v92` e no `v92_celular`
  (falhavam igual na v109: eles ainda esperavam o painel da versão de testes de antes da v94 — as memórias A = v92 e B = v91,
  7 partes). Agora esperam o da v94, como o `tests/v94_jogo_test.py`: A = o motor próprio, B = o Padrão v92 com o motor de
  antes, a parte MOTOR e o A ⇄ B trocando o motor; a física do painel é conferida no motor de antes (a memória B). Os dois
  passam (35/35 cada) — com isso a lista inteira do CI passa e o deploy volta a rodar quando a main recebe um envio.
  No GitHub, o primeiro envio para a main pegou ainda um teste que muda com a fonte: no `interface`, o botão de copiar o ID
  do PERFIL ficou com 42 px (menos que os 44 px de toque) — quando o ID aparece com a fonte do sistema, mais larga, antes de
  a Barlow carregar, a linha do ID aperta e o botão encolhia. Agora ele não encolhe (`flex:none` no `v77.css`): fica com os
  46 px de sempre; com a Barlow carregada nada muda na tela (os prints antes e depois são iguais).
- **Testes**: `tests/v111_enxuga_test.mjs` (novo, no CI: o esbuild reescreve cada `<script>` e `<style>` do enxuto e do
  completo e as saídas precisam ser idênticas; o HTML de fora igual; a física byte a byte; as 5 aposentadas e as que ficam).
  Os testes que procuram trechos do código com comentário leem a cópia completa (`texto_do_jogo()` no `tests/comum.py`: o
  `v103_tela` e o `v107_chute`) e os que conferiam as imagens embutidas (`v75`, `v77` e `v95`) conferem as aposentadas. As
  telas comparadas antes e depois (a entrada, o lobby, as 19 telas, a Oficina e uma partida em cada campo, no computador e no
  celular deitado): iguais, fora o que muda de uma abertura para outra (a tampinha que balança, o ID e os bots sorteados). Os
  testes do CI que rodam aqui (sem o `npm ci`) passam todos, o `v92` e o `v92_celular` também (acertados, acima). Com o
  relógio da página parado, os prints da tela de ENTRAR, do lobby, de 10 telas, das duas partidas, do MENU e da Oficina, no
  computador e no celular deitado, saem iguais aos da v109 pixel a pixel. Fora da lista do CI, falham do mesmo jeito que na
  v109 (nada aqui mexeu neles): o `v73`, o `v75`, o `v76`, o `v77` e o `v96_skins` (conferem coisas das versões antigas que
  as de depois mudaram) e o `v92_pacote` (as salas do Rachão no servidor do ZIP).

## v110 — 06/11/2026 · o botão de metal e as sombras

A pedido, com as imagens de dois botões (azul e vermelho, com a listra branca no meio): *"deixe o jogo parecido com essas
skins, as sombras etc."* — perguntado, *"em todas as peças"* e *"as cores de agora"* nos times. Na v105 a BOTÃO tinha ficado
chapada (o aro branco liso, sem relevo e sem a sombra por dentro), como nas imagens daquela vez; as imagens novas têm o aro de
metal e o desenho afundado, e é isso que volta, medido nelas. Só a pintura das tampinhas: a física não muda (o build confere:
`sha256 ad9f1d2216409b0e`), nem o tamanho, o alcance ou as medidas da v105. O backup do antes: a etiqueta git `antes-v110`.

- **A BOTÃO de metal** (`tools/v110/botao.js`; a borda de todo mundo — a inicial, as do time e a de fábrica): o contorno preto
  fino por fora (2% do raio; nunca menos de 1,1 px); o aro de METAL — o lábio claro logo depois do desenho, escurecendo para a
  beira de fora (nas imagens: 94% de claro no lábio, 73% no meio e 56% perto do contorno), com a luz em cima à esquerda (o mesmo
  raio mais claro em cima à esquerda que embaixo à direita) —; o sulco escuro entre o aro e o desenho; e o desenho afundado: a
  sombra por dentro em volta toda (some a 86% do raio do desenho: 12% a 89%, 23% a 93%, 33% a 95% e metade colada no aro),
  reforçada rente ao aro embaixo e à direita, e o degradê de cima (mais claro) para baixo (mais escuro) que deixa o branco
  branco (o azul #0561bc vai de #046bc9 em cima a #0452af embaixo; nas imagens, #066ec4 a #0555b5). O aro continua na cor 1 da
  borda (o ARO do editor): o branco de fábrica vira o metal prateado; um aro colorido vira o metal daquela cor. FINA, NORMAL,
  GROSSA e SEM BORDA (v105) continuam, com o mesmo desenho do meio.
- **As sombras em todas as peças**: as tampinhas com as outras bordas (as de dentes, a Medalhão das mascotes, as acesas) e as
  SEM BORDA ganham a mesma sombra por dentro e o mesmo degradê no desenho; a borda de cada uma continua a dela (as compradas
  não mudam). As caras animadas ficam como são.
- **Nada a mais por quadro**: tudo isso vai nas imagens prontas das tampinhas (uma por tampinha e tamanho); as de antes da v110
  saem ao abrir o jogo. Na partida, o desenho não é refeito a cada quadro.
- **Testes**: `tests/v110_botao_test.py` (a BOTÃO medida nos pixels no tamanho das imagens: o contorno, o lábio claro e o metal
  escurecendo para fora, sem cor, a luz em cima à esquerda, o sulco, a sombra por dentro em volta toda e mais forte embaixo à
  direita, sumindo antes de 80%, o degradê com o branco branco, nada fora, as medidas da v105, o aro dourado, os tamanhos da
  borda e a SEM BORDA; as sombras na Clássica escolhida, na Medalhão, na Ouro e num aro aceso, com a borda de cada uma; a cara
  animada com o aro de metal; e a partida tirando as tampinhas das imagens prontas). O `v102`, o `v105_borda` e o
  `v105_cosmeticos` conferiam o aro branco chapado da v105: agora conferem o aro de metal (claro e sem cor) e o desenho com a
  sombra rente ao aro; o `v92_pacote` confere os arquivos e a marca da v110.

## v109 — 06/11/2026 · os dois painéis do RACHA CONTROL (o do Dono e o da staff) e o 2FA consertado

A pedido: *"o 2 etapas está bugado, e quero que tenha 2 painéis: um meu, do dono, com várias funções — dar verificado, dar
moedas etc. — e um painel para os caras que forem staff cuidarem do jogo: banir player, multar, essas coisas. Faça bastante
funções, porém o painel dos staff não consegue dar verificado nem enviar presentes; tudo o que os staff fazem aparece para
mim"*. O 2FA: *"lá no app aparece que o código está errado no autenticador"*. A multa: *"o chat não pode mais mandar mensagem
por 5 min, 10 min, 1 hora, 1 dia, 5 dias, 10 dias, 30 dias"*. A staff com níveis (Administrador, Moderador e Ajudante). A
física não muda (o build confere: `sha256 ad9f1d2216409b0e`). O backup do antes: a etiqueta git `antes-v109` (a v108).

- **O QUE ERA O "CÓDIGO ERRADO" DO 2FA**: a chave tinha 20 letras sorteadas (cada byte aleatório virando UMA letra): 100 bits,
  que não fecham em bytes — os 4 bits do fim sobravam. Um app autenticador mais rígido recusa essa chave ("chave inválida") ou
  chega num código diferente do servidor. E não tinha QR code: eram 20 letras para digitar no celular (o 0 no lugar do O ou o 1
  no lugar do I dão chave inválida ou código errado). Por cima: o limite contava também os logins CERTOS (o 9º login em 10 min
  travava), o mesmo código valia duas vezes e um relógio errado (do celular ou do servidor) aparecia como "código errado".
- **O 2FA AGORA** (`app/api/racha/security.ts`, `adminRouter.ts`, `app/src/lib/qr109.ts`): a chave é base32 de verdade (20
  bytes, 32 letras, fecha sem sobra); a de 20 letras que nunca foi confirmada vira a nova no próximo login (a que já
  funcionava continua valendo); a tela mostra o QR CODE (o app lê com a câmera — o gerador é daqui, sem dependência, conferido
  com o leitor de QR do OpenCV das versões 1 a 23), o botão que abre o app no celular e a chave em grupos de 4 (com "copiar");
  o código de outro horário mostra *"o relógio do celular está uns X min adiantado/atrasado"* no lugar de "código errado"; o
  mesmo código não vale duas vezes; o limite só conta os errados; e a VPS acerta o relógio sozinha (`timedatectl set-ntp true`
  no `deploy/prepara-vps.sh`). Perdeu o celular: o Dono reseta o 2FA de alguém da staff no painel (o próprio, com a senha) e,
  sem entrar no painel, `sudo racha-2fa <usuario>` no servidor (`deploy/bin/racha-2fa`) — no próximo login aparece um QR novo.
- **OS DOIS PAINÉIS** (`app/src/pages/PainelDono.tsx`, `PainelStaff.tsx` e `PainelComum.tsx`; o login de sempre em
  `AdminPage.tsx`): o servidor diz quem é quem (`estadoPainel.painel`) e o Dono cai no **PAINEL DO DONO** (dourado), a staff
  no **PAINEL DA STAFF** (azul). O do Dono: a VISÃO GERAL (o que cada um da staff fez nos últimos 7 dias e as últimas ações),
  JOGADORES (a ficha com a moderação e o que só o Dono faz: dar e tirar o verificado e os outros selos, moedas e gemas, itens e
  a patente), STAFF (colocar e tirar, mudar o cargo, as permissões, resetar o 2FA, encerrar as sessões do painel, "o que fez"),
  REGISTROS (tudo, com filtro: quem fez, em quem, a ação, feitas ou negadas, o período, e páginas), DENÚNCIAS, PUNIDOS,
  PRESENTES (itens e o correio), EVENTOS e CONTAS. O da staff: JOGADORES (a ficha de moderação), DENÚNCIAS (com o que foi dito e
  as ações direto dela), PUNIDOS e MEUS REGISTROS, com o aviso do que o cargo pode e de que tudo fica registrado para o Dono.
- **O QUE A STAFF FAZ** (`app/api/racha/v109/staff.ts`): SILENCIAR o chat (5 min, 10 min, 1 hora, 1 dia, 5, 10 ou 30 dias — o
  Ajudante até 1 hora, o Moderador até 10 dias, o Administrador até 30); BANIR por um tempo (1, 3, 7, 30 ou 90 dias — o
  Moderador até 7) ou para sempre (só o Administrador): a conta cai das salas na hora; ADVERTIR (a advertência chega na central
  de mensagens do jogador); TIRAR DA SALA (sai da partida na hora, o bot assume, e não volta para a mesma sala por 10 min);
  TROCAR O NOME (e a frase do perfil) impróprios (vira `Jogador000123` e ele escolhe outro); as NOTAS da equipe na ficha; TIRAR
  uma punição (o silêncio, quem silencia; o banimento e a advertência, o Administrador; nunca a de quem tem um cargo acima do
  seu); e ZERAR a patente de quem trapaceou (a staff só tira pontos). Sempre com motivo (o jogador vê), a confirmação e a
  hierarquia: ninguém mexe no Dono nem num cargo igual ou maior, nem em si mesmo. A ação direto da denúncia deixa ela resolvida.
- **O QUE A STAFF NÃO FAZ** (`app/contracts/racha.ts`): dar selo (verificado), presente, item, moeda, gema ou XP; mexer em
  eventos, avisos, contas e equipe; dar pontos de patente; ver os registros dos outros (só os dela). O Administrador perdeu o
  "enviar itens" e os "eventos" que tinha. O ajuste de permissões do Dono só TIRA poderes do padrão do cargo (pedir uma do Dono
  não entra). Cada tentativa negada vai para a auditoria: o Dono vê *"tentou sem permissão"* com a permissão que faltou.
- **TUDO APARECE PARA O DONO** (`app/api/racha/v109/dono.ts`): os registros de tudo o que a staff faz — cada tentativa negada
  e o "olhou a ficha" (uma linha a cada 10 min por jogador; o filtro esconde por padrão) —, o resumo por pessoa (silenciou,
  baniu, advertiu, tirou da sala, trocou nome, cuidou de denúncia, negadas, a última ação) e a equipe (o cargo, o 2FA ligado ou
  esperando o 1º login, o último login, as sessões abertas, as ações e as negadas em 7 dias). E a CARTEIRA: dar e tirar moedas
  e gemas com motivo (o jogador recebe o aviso do presente; tirar mais do que ele tem é recusado; o histórico da carteira
  guarda quem, quanto e por quê).
- **O SILÊNCIO NO JOGO** (`server/silencio109.js`, as trocas em `server/turma.js`, `social88.js` e `emotes106.js`;
  `tools/v109/silencio.py` + `silencio.js`, a última etapa do build): a conta calada não manda nada no Chat do Brasil, no chat
  da sala, no da equipe, no dos amigos, no do clube, nas falas e nos emojis da partida; ela recebe o aviso com quanto falta e o
  motivo (o jogo mostra esse aviso no lugar do de antes, "silenciado por denúncias"), o aviso ao vivo quando é calada ou
  liberada (uma vez só: no lobby, o balão de cima do lobby; na partida, o aviso de baixo), e continua lendo e jogando. Vale na hora (a plataforma avisa o servidor das salas montado nela), já na conexão (a
  sessão traz o silêncio do banco) e no servidor das salas separado (o bilhete assinado leva o silêncio: `z` e `zm`; um bilhete
  assinado antes do silêncio não o tira). O silêncio vence sozinho.
- **O BANCO** (`app/db/migrations/v109_painel.sql`, que o deploy aplica uma vez com o backup antes): o tipo "silencio" nas
  punições, um índice na auditoria (o filtro do Dono por jogador) e a tabela das notas da equipe (`notas_staff`). Só acrescenta:
  a v108 continua funcionando com o banco assim (o rollback não precisa desfazer nada).
- **Testes**: `tests/v109_painel_servidor_test.mjs` (Node: a plataforma de teste com o servidor das salas e WebSockets de
  verdade — o 2FA com um decodificador base32 rígido, o código de outro horário, o código usado duas vezes, o limite; quem cai
  em qual painel; a staff sem selo/presente/item/moeda/eventos/equipe/registros, com cada tentativa na auditoria; o silêncio
  com os tetos e a hierarquia valendo na hora nas salas e no bilhete; banir, advertir, tirar da sala, trocar o nome, notas,
  tirar punição, punidos; o Dono: carteira, verificado, registros com filtro e página, resumo, equipe, 2FA, sessões,
  permissões), `tests/v109_silencio_salas_test.js` (o silêncio em cada chat das salas, o bilhete de antes e o de depois, a
  sessão e a expulsão) e `tests/v109_painel_test.py` (os dois painéis no navegador: o 2FA pelo QR code lido pelo OpenCV, o Dono
  colocando um Moderador, o Moderador silenciando pelo painel, os registros e a visão geral do Dono, o verificado e as moedas,
  resetar o 2FA, o aviso do silêncio no jogo e o painel no celular). O `v881_painel`, o `v881_contas` e o `v100_seguranca`
  pegam um passo livre do 2FA por login (o mesmo código não vale mais duas vezes) e a chave de 32 letras; o `v92_pacote`
  confere os arquivos e as marcas da v109.

## v108 — 05/11/2026 · o online sem câmera lenta e o chute logo depois da volta da internet

A pedido: *"às vezes o personagem fica lento do nada por uns segundos até clicar no pausar, aí sai o lag; e a bola, muito raro,
mas chuta e o chute falha: parece que vai, mas não vai"* — no online, no celular e no PC: *"o jogo fica lento, tudo em câmera
lenta por uns segundos"*. Tudo foi medido antes de mexer, com o jogo de verdade, o servidor das salas e o 4G de mentira
(`tests/v92_proxy.cjs`). A física não muda (o build confere: `sha256 ad9f1d2216409b0e`). O backup do antes: a etiqueta git
`antes-v108` (a v107).

- **O QUE ERA A CÂMERA LENTA**: a volta de um apagão da internet de 1 s ou mais (comum no 4G). Durante o apagão o servidor
  para a sua tampinha (350 ms sem comando, a regra de sempre) e o aparelho continua prevendo; quando os quadros voltam, a
  diferença é de 150 a 500 px. A v96 somava essa correção no deslize (a mola), que some no máximo a ~110 px/s: a sua tampinha
  desenhada ficava atrás da prevista e corria a 60–75% (159 a 205 px/s no lugar de 268) por 0,9 a 3 s num 1v1 e por 2,6 a 6 s
  num 4v4 com a CPU 5× mais lenta (o celular) — e as dos outros até 1.438 px atrás. Por cima, o servidor recusava os comandos
  do segundo seguinte à volta (a janela de 1 s com 120 enchia com a rajada do apagão, e os recusados também contavam: de 40 a
  62 recusados por apagão, a tampinha parada lá 51 de 60 passos) e o celular travava de 0,4 a 0,6 s refazendo os ~150 quadros
  que chegavam juntos, cada um com o seu replay. A pausa não curava nada: só deixava o tempo passar (uma pausa curta não muda
  nada; com o menu aberto uns segundos, quando ele fecha o deslize já acabou).
- **A CORREÇÃO QUE SOME SOZINHA** (`tools/v108/lento.py` e `lento.js`, a última etapa do build): o deslize grande, ou o que
  fica grande por tempo demais, acaba em ~0,12 s (a mola continua crítica: sem tranco); o limite do pulo da v96 vale também
  para o deslize somado (vários quadros abaixo do limite somavam centenas de px); e o rollback + replay roda uma vez por quadro
  da tela, com o quadro do servidor mais novo (o placar, os gols e os sons continuam quadro a quadro). As tampinhas dos outros
  ficam com a guarda de sempre na tela (1,5 × a corrida) fora a volta de um apagão, e a bola com a dela. No jogo normal nada
  muda (o prazo só entra em até 0,09% dos quadros da sua tampinha). Medido com 2 s de apagão: no 1v1 a sua tampinha alcança
  em 0,3 a 1,1 s (era 0,9 a 3 s) e volta a correr a 252–268 px/s; no 4v4 com a CPU 5× mais lenta, em no máximo 1 s (as dos
  outros em 0,75 s), e o replay da volta leva de 7 a 41 ms (eram 400 a 573). `RACHA_CONFIG.lento108 = false` desliga, para
  comparar.
- **O SERVIDOR ACEITANDO A RAJADA DA VOLTA** (`server/partida/ritmo108.js`, nas salas do RACHA, do mapa e do Rachão): o teto
  de comandos de cada jogador virou um balde de fichas — enche 75 por segundo, até 150 (o jogo manda 60 por segundo e o
  aparelho para de mandar depois de 2 s sem notícia do servidor: a rajada de um apagão inteiro cabe). Nenhum comando recusado
  na volta; quem manda mais que 75 por segundo sem parar continua recusado (e anotado como suspeito, no máximo uma linha por
  segundo — antes era uma por comando). Mandar mais não anda mais: o servidor usa um comando por passo, como sempre.
- **A PARTIDA INTEIRA NO RELÓGIO CERTO** (`server/partida/sala.js`): depois de um engasgo do processo, o motor das salas
  alcança até 12 passos (200 ms) de uma vez — eram 5 (83 ms). Num servidor com a CPU dividida, as paradas de 90 a 200 ms
  jogavam passos fora e a partida ficava em câmera lenta para todo mundo (medido com o processo travando 150 ms a cada 200 ms:
  42 passos por segundo com 5, 60 com 12). `RACHA_MOTOR_ALCANCA=5` e `RACHA_RITMO=v107` voltam ao de antes, para comparar.
- **O CHUTE QUE "PARECE QUE VAI, MAS NÃO VAI"**: medido (o aparelho mostrou o chute e o servidor não chutou) em partidas de
  1 min pela rede: 0 de 31 sem atraso, 3,9% no 4G, 4,5% no 4G ruim e 24% no 4G péssimo. Dos 40 falhos: 23 com a sua tampinha
  atrás no servidor (quando os seus comandos atrasam, o servidor continua o seu último movimento por até 4 passos e espera;
  quando os de verdade chegam, o movimento desses passos fica perdido e, depois de uma virada, a tampinha de lá fica de 12 a
  19 px fora e o toque armado acaba antes de a bola chegar), 9 com a bola em outro lugar (outro tocou, ou a bola prevista
  errada) e uns 8 com o toque chegando muito depois (os soluços longos). O que muda: o toque logo depois da volta de um apagão
  não se perde mais (era recusado junto com o segundo seguinte). O que ficou de fora: o toque atrasado (o servidor olhando a
  bola até 100 ms antes) não salvou nenhum dos 40 falhos medidos — uma regra a mais no servidor sem ganho medido, então não
  entrou (o ramo `v108-toque-atrasado-medido` guarda a tentativa). O resto (2 a 4% dos chutes no 4G ruim) precisa de uma
  mudança no servidor junto com a previsão do aparelho.
- **Testes**: `tests/v108_servidor_test.mjs` (o balde: a rajada passa, o recusado não gasta ficha, o jogo nunca é recusado nem
  chegando em bolos, o excesso recusado com uma linha por segundo nas três salas; a tampinha e o chute logo depois de um
  apagão de 2 s, na v107 e agora; o motor alcançando 12 passos com o processo travando), `tests/v108_rede_test.mjs` (o núcleo
  do deslize com prazo e, no simulador da rede, os apagões de 1 e 2 s e o jogo normal igual ao da v105) e
  `tests/v108_lento_test.py` (no navegador, com o servidor das salas e o 4G de mentira: a internet sumindo por 2 s num 1v1 e
  num 4v4 contra bots com a CPU 5× mais lenta, antes e agora; a correção da volta é o trecho que começa nela, e as de depois —
  no 4v4, os bots trombando na Ana — ficam medidas à parte, cada uma curta). O `v98_rachao_servidor` confere a rajada (200 de
  uma vez: o excesso ignorado e uma linha só); o `v96_online` conta à parte os quadros da volta rápida da v108 (a guarda da
  sua tampinha sobe de propósito enquanto a correção grande acaba) e confere que são poucos — fora deles, a regra da v96 é a
  mesma; o simulador da v102 ganhou o cliente `v108` (o padrão não muda); o `v92_pacote` confere os arquivos e as marcas da
  v108.

## v107 — 05/11/2026 · os emojis e as falas arrastando, o árbitro arrastando na sala e na partida, o perfil pelo nome e o anel do chute bem branco

A pedido, com dois vídeos e uma foto de outro jogo: *"mostrei como funcionam os emojis e as msg rápidas: não precisa clicar, é
só arrastar para o lado que você quer e vai aparecer as msg e emojis; nos players dá para arrastar o player para o time ou
reserva — quero essa função no meio da partida e na sala quando cria, pois é mais prático arrastando; se clicar no nome de
alguém no chat você pode entrar no perfil da pessoa, adicionar ela e ver estatísticas — quero isso no chat; e nas salas
personalizadas poder clicar no perfil da pessoa e ver"*. Dos vídeos e da foto vem só o jeito de usar: os desenhos, as cores e
os textos são os do RACHA. A física não muda (o build confere: `sha256 ad9f1d2216409b0e`). O backup do antes: a etiqueta git
`antes-v107` (a v106).

- **OS GESTOS DO EMOJI E DAS FALAS** (`tools/v107/gestos.py`, `gestos.js` e `app/public/game/v107-gestos.css`): nos dois
  botões do lado do placar — o do emoji e o das falas —, **segurar e arrastar** sem tirar o dedo: aparece no meio da tela a
  cruz dos 5 daquele botão (os 5 emojis da cruz da v106 ou as 5 frases da cruz nova, com as setinhas entre o meio e cada
  lado), o aro pequeno em volta do botão (o botão anda um pouco com o dedo) e o X de cancelar do lado de fora, um pouco para
  baixo (fora das 4 direções). O lado para onde o dedo vai acende uma opção; parado perto do começo, a do meio; **soltar
  manda** (o balão de sempre em cima da tampinha) e soltar no X não manda nada. O **toque rápido** continua o de sempre (a
  cruz da v106; o menu das 8 frases), assim como o teclado e o controle; o toque e o segurar são decididos pela hora de cada
  evento (o celular ocupado não transforma um toque em gesto). Cada gesto tem o seu dedo: dá para correr com o analógico num
  dedão e mandar o emoji com o outro (o PASSE e o CHUTE também seguem). O ritmo é o de sempre (no aparelho e no servidor), sem
  as transições com Reduzir animações, e nada cobre os controles, a pausa, o placar, os outros botões nem a barra da sala
  (844 × 390 com o entalhe, 667 × 375, 740 × 360, 1280 × 720, 1920 × 1080 e o treino). As falas continuam só nas partidas
  (contra os bots e online). **A cruz das frases**: 5 das 8 — Golaço! em cima, Boa! à esquerda, Passa! no meio, Que defesa! à
  direita e Foi mal! embaixo, no começo —, guardada em `racha-falas-v107` (na cópia do progresso da conta). No **COFRE ›
  EMOJI**, a troca **EMOJIS | FRASES**: em FRASES, a cruz das 5 frases (tocar num lugar acende; tocar numa das 8 frases põe no
  lugar aceso; o PADRÃO volta as de fábrica). O servidor não muda (o `emote {e}` e a `fala {i}` já existiam).
- **O ÁRBITRO ARRASTANDO NA SALA E NA PARTIDA** (`tools/v107/painel.js` e `app/public/game/v107-painel.css`): **na sala
  online**, o árbitro aperta o cartão de alguém e arrasta (o arrasto começa depois de 8 px; tocar sem mexer continua abrindo a
  ficha; na coluna que rola, o dedo na vertical rola e de lado arrasta). A cópia do cartão vai com o dedo, com a etiqueta do
  que acontece ao soltar (PARA O TIME B, PARA O BANCO, TROCAR COM…), e o lugar embaixo acende — o outro time (a primeira vaga
  livre; o time cheio acende vermelho e avisa), uma VAGA LIVRE, o cartão de outra pessoa (os dois trocam) e QUEM ASSISTE (o
  banco). Ao soltar vão as mesmas ações da ficha: o servidor não muda e confere tudo. Quem não é o árbitro não arrasta. **Na
  partida**, o painel dos jogadores arrasta já com o movimento, sem o meio segundo de segurar (o segurar continua valendo);
  soltar um arrasto não abre nada. **A faixa**: cada mudança do árbitro vira uma faixa curta em cima, para todo mundo da sala,
  na tela da sala e na partida (embaixo do placar) — "fulano foi para o TIME B" / "fulano foi para o BANCO" —, a partir da linha
  que o servidor já mandava no chat da sala. A sala neste aparelho (você e os bots) continua com o toque no cartão.
- **O PERFIL PELO NOME** (`tools/v107/perfil.py`, `perfil.js`, `app/public/game/v107-perfil.css` e `server/convite107.js`):
  tocar no nome de alguém em qualquer chat (o painel da barra do lobby, a tela inteira do Chat do Brasil, a sala, a partida, a
  equipe, o clube e os amigos) abre a **janelinha colada no nome** (a pontinha aponta para ele, sempre dentro da tela e da área
  segura; fecha tocando fora, no ✕ ou no Esc), com três botões grandes: **PERFIL** (azul), **CONVIDAR** (verde) e
  **DENUNCIAR** (vermelho, com o motivo ali mesmo), e SILENCIAR · BLOQUEAR embaixo. O seu nome: só o MEU PERFIL; quem não tem
  conta: o PERFIL diz "sem conta" e o CONVIDAR fica apagado com o motivo. O **PERFIL** abre o perfil do jogo (partidas,
  vitórias, gols, assistências, melhor da partida, tempo jogado, a COMPETIÇÃO e o ADICIONAR) no lobby, na sala e por cima da
  partida. O **CONVIDAR** chama para a sua sala quem escreveu, **mesmo quem ainda não é seu amigo**: o jogo manda
  `convite {mid, canal}` (o número da mensagem) e o servidor acha quem escreveu a mensagem recente (até 15 min; não a escondida
  pela moderação nem a da equipe dos outros) e confere tudo — as duas contas, a sala (nem a ranqueada nem cheia), o bloqueio dos
  dois lados, quem aparece online e recebe convites, quem já está na sala —, com os limites para quem não é amigo (1 a cada
  10 s, 6 a cada 10 min, a mesma pessoa 1 a cada 2 min e quem recebe no máximo 8 a cada 10 min; por conta: reconectar não
  zera). Tudo que depende de quem recebe dá o mesmo texto ("Não deu para convidar essa pessoa agora.") e os limites de quem
  convida são conferidos antes de olhar quem recebe: o convite não revela quem está online escondido. Quem recebe vê o convite
  de sempre (ENTRAR ou RECUSAR) dizendo que veio pelo chat; os amigos continuam pelo ID; em Ajustes › Privacidade, "Receber
  convites para jogar" vale também para o convite pelo chat. **Nas salas personalizadas**, tocar no cartão de alguém mostra o
  perfil para todo mundo (a janelinha com o PERFIL; para o árbitro, a ficha dele com o VER PERFIL primeiro); o mesmo no painel
  dos jogadores da partida. Só contas: o bot, a vaga livre e o visitante não têm perfil.
- **O ANEL DO CHUTE BEM BRANCO** (`tools/v107/chute.py` e `chute.js`), a pedido: *"quando o jogador chuta, o arco ao redor
  deve ficar bem branco: a opacidade do chute tá muito fraca"*. Na v96 (a pedido de então) o branco do anel tinha ficado
  suave, no máximo 30% (`V95S.luz = 0,3`); agora volta a 1 e passa do branco da v95: apertou o CHUTE, o anel em volta da
  tampinha acende em **branco opaco** (o anel cheio de branco, a borda de fora e um brilho um pouco maior; medido na tela,
  o anel vai a 253 de 255, contra 185 com o branco suave); o PASSE acende quase igual (86%, como na v95). Segurando fica;
  soltou ou foi só um toque, some rápido, como sempre. Vale para você e para os outros (online, pelo botão de cada um no
  quadro do servidor), na partida, no treino, no replay e na Oficina (a troca no desenho de lá). Só o desenho: o botão, o
  chute e a força não mudam.
- **Testes**: `tests/v107_gestos_test.py` (o toque de verdade pelo CDP: os 5 lados nos dois botões, o X, o toque rápido, dois
  dedos, o mouse, o ritmo, 6 tamanhos, a cruz das frases e o COFRE, o Reduzir animações e o online com duas sessões),
  `tests/v107_painel_test.py` (a plataforma de teste e três navegadores: os arrastos na sala e na partida, com o mouse e com o
  dedo, quem não é o árbitro, o toque que abre a ficha e a faixa), `tests/v107_perfil_test.py` (três navegadores logados: a
  janelinha no chat, o PERFIL no lobby, na sala e na partida, o convite pelo chat para quem não é amigo, a denúncia, o cartão da
  sala e o painel da partida), `tests/v107_convite_servidor_test.mjs` (o convite pela mensagem, as regras e os limites) e `tests/v107_chute_test.py` (o
  anel aceso opaco e os pixels do anel na partida com o CHUTE e o PASSE). Os
  testes de antes que liam a ficha velha do chat (`v81`, `v103_chat_perfil`, `v105_chat_lobby`, `v88_cliente`) leem a
  janelinha nova; o `v98_rachao_online` espera a comemoração de cada gol antes do próximo (com a máquina ocupada, os 2,7 s fixos
  não bastavam); o `v92_pacote` confere os arquivos e as marcas da v107.

## v106 — 05/11/2026 · o jogo de corpo no meio-termo, o COFRE no estilo das fotos, as bolas e as mascotes novas e os emojis da partida

A pedido: *"bom, antes o jogo de corpo deslizava muito, agora gruda muito: tem que ser o meio-termo, porque senão os players
ficam fechando o caminho — tem que ser uma boa disputa de bola; quero o cofre nesse estilo das fotos; crie mais bolas e skins,
não muitas, e crie emojis e um balão para emoji na partida"*, com 5 capturas do inventário de outro jogo. Delas vem só a
organização (as abas, o pedestal, os cartões com o cadeado e o visto, o CRIAR PERSONALIZADO e a cruz dos emojis): nenhum
desenho foi copiado, tudo é desenhado em código. A física das salas muda de propósito, só no atrito tampinha × tampinha (o
núcleo, o mesmo do servidor e do aparelho); o bloco da física do jogo não muda (o build confere: `sha256 ad9f1d2216409b0e`).
O backup do antes: a etiqueta git `antes-v106` (a v105).

- **O JOGO DE CORPO NO MEIO-TERMO** (`server/partida/nucleo.js`: o `atritoJogJog` do `PERFIL_V92` de 0,5 para 0,2; o mesmo
  arquivo do servidor, da previsão do online e da partida neste aparelho). Medido no núcleo: quem fica de frente para você só
  fecha o caminho quando você vem quase reto — até 25° da linha dos centros (na v105, até 52,5°; na v104, 2,5°); a 30° e a 45°
  você passa por ele. Empurrando quem está parado a 15°, você escorrega em volta dele (107° em 1 s; a v105 grudava: 0°; a v104:
  131°) e ainda leva ele um pouco (4 u; v104: 2,4; v105: 7,1). Correndo um contra o outro quase reto, o empurra-empurra
  continua (a disputa de bola); com 1 u de desvio, um passa pelo outro em 0,4 s (v104: 0,3 s). A bola, o chute e a virada não
  mudam. 48 partidas de bots (1x1 a 4x4): nenhuma travada (o pior trecho com a bola parada: 1,9 s). A página da v105 segue o
  atrito que a sala manda (não precisa atualizar para jogar).
- **AS BOLAS NOVAS** (`tools/v106/bolas.js`; os itens no `app/contracts/catalogo88.json`, o mesmo do jogo e da plataforma,
  pelo `tools/v106/catalogo.py`): 6 bolas à venda na LOJA › BOLAS, com 3 padrões novos pintados ponto a ponto na esfera (a luz,
  a sombra e o contorno como os da bola de sempre) e girando com a mesma matriz do giro — os **gomos de praia** (BOLA DE PRAIA
  e BOLA DO ARRAIÁ, com as cores das bandeirinhas; raras, 3.000 moedas), as **labaredas** (BOLA DE FOGO, 60 gemas, e BOLA
  MAÇARICO, a chama azul, 70 gemas; épicas) e o **espaço** (BOLA GALÁXIA e CÉU DO SERTÃO, com a Via Láctea dando a volta na
  bola; lendárias, 150 gemas). Aparecem na partida, no treino, no replay, na Oficina (o mapa com a bola de cada um) e em toda
  miniatura. Só o desenho: o raio, a colisão e a física não mudam.
- **AS MASCOTES** (`tools/v106/mascotes.js` e `conteudo.js`): 6 tampinhas à venda na LOJA › TAMPINHAS › MASCOTES — os bichos
  do Brasil em medalhão, de contorno grosso e olhar bravo, piscando de vez em quando: ARARA INVOCADA, ONÇA-PRETA e MICO-LEÃO
  BOLADO (lendárias, 150 gemas), GUARÁ DA VÁRZEA, TUCANO MARRENTO e JACARÉ PAPO-AMARELO (épicas, 80 gemas). Cada uma é a cara
  da mascote (ocupa a tampinha inteira) com a borda nova **MEDALHÃO** (o aro de metal com o chanfro, os rebites, a estrela e o
  filete colorido; vale o TAMANHO DA BORDA da v105). As peças entram no FIM das listas (as caras nos lugares 87 a 92, a
  Medalhão no 28): os códigos de sempre não mudam (a Fundador continua no 86, a Aura no 26 e a BOTÃO no 27). As peças são da
  conta: quem comprou vê e usa a cara (e a Medalhão, que vem com qualquer mascote) no CRIAR TAMPINHA; quem não tem não vê, não
  monta pelo código colado nem pela sorteada, e elas não se vendem avulsas (o EQUIPAR do editor explica e manda para a LOJA).
  O COMPRAR (pelo preço do catálogo: a plataforma recusa outro) abre o EQUIPAR AGORA; a mascote equipada fica na conta, em
  qualquer aparelho, e aparece para todo mundo na partida. Com as prontas escondidas da v101, as mascotes são a exceção
  (continuam na LOJA, nas miniaturas e no COFRE). Os bots não pegam. As peças entram antes da releitura das tampinhas
  adiadas da v105: a mascote equipada e as salvas com ela não somem ao entrar de novo.
- **OS EMOJIS DA PARTIDA** (`tools/v106/emotes.py`, `emotes.js`, `app/public/game/v106-emotes.css` e `server/emotes106.js`):
  **20 emojis** de graça, desenhados no canvas e nítidos em qualquer tamanho — RINDO, CHORANDO DE RIR, COMEMORANDO, VALEU, NA
  MORAL, PISCADA, ZOANDO, CONFIANTE, APAIXONADO, SURPRESO, PENSANDO, DESCONFIADO, AFF, NERVOSO, ASSUSTADO, SONO, TRISTE,
  CHORANDO, BRAVO e FURIOSO —, carinhas laranja dentro do contorno branco de um balão de fala com a pontinha, prontas numa
  imagem por tamanho (nada é redesenhado a cada quadro). **Na partida** (o treino, contra os bots e o online), o botão do
  emoji do lado do placar, no lugar livre (sem encostar nos controles, na pausa, no placar, nos botões das falas e dos
  jogadores nem na barra da sala; conferido em 6 tamanhos, com o entalhe do iPhone); tocar abre a **cruz dos 5** (cima,
  esquerda, meio, direita e baixo: VALEU, RINDO, COMEMORANDO, BRAVO e CHORANDO no começo; fecha tocando fora ou sozinha em 6 s)
  e o escolhido aparece num **balão branco em cima da sua tampinha**, a pontinha apontando para ela, do tamanho da tampinha na
  câmera (nunca menos de 44 px), com um "pop" (sem ele com Reduzir animações), por 2,5 s; ele segue a tampinha, fica
  transparente com a bola atrás e espera no replay e na pausa. Um a cada 1,5 s (no máximo 3 em 6 s), com a espera no botão; no
  computador, E abre a cruz e 1 a 5 escolhem (se o E não for de outra ação nos Ajustes › Controles); no controle, o SELECT e o
  direcional. **Online**, `emote {e}`: o servidor confere o emoji (só os 20 da lista: nada de texto livre) e o ritmo (1 a cada
  1 s e 3 a cada 5 s por pessoa na sala, mesmo reconectando; só quem joga, com a partida rolando, e sem silêncio por
  denúncias) e repassa `emote {id, e}` para a sala, menos para quem tem bloqueio com quem mandou; a página da v105 ignora a
  mensagem nova. Em **Ajustes › Visual › Emojis dos outros na partida** (ligada) dá para ficar só com o seu. Contra os bots,
  depois de um gol, às vezes (1 em 4) um bot de quem marcou comemora e um do outro time lamenta. Os 5 da cruz vão na cópia do
  progresso da conta (`racha-emotes-v106`, em `tools/v82/inicio.js` e `app/contracts/progresso.ts`: sem a chave na lista, a
  plataforma recusaria a cópia inteira).
- **O COFRE NO ESTILO DAS FOTOS** (`tools/v106/cofre.js` e `app/public/game/v106-cofre.css`): a mesma tela COFRE de sempre
  (o render da v90 trocado por cima: o atalho COFRE do lobby, o toque na tampinha grande, o "+ FAVORITA" da RODA e o
  `v90AbreCofre` com a categoria antiga abrem o novo), com o desenho novo — em cima a faixa de sempre, com o VOLTAR azul; à
  esquerda a peça escolhida GRANDE num pedestal cinza, com um botão em cima e a placa do nome embaixo; à direita a barra
  escura das abas **CARTÕES · SKIN · EMOJI · ESCUDO DO CLUBE · BOLA · MAIS** (a escolhida com o sublinhado branco) e a grade
  de cartões bege (a peça no meio, o CADEADO e o preço no que não é seu, o CHECK verde no equipado e a raridade numa
  faixinha na cor dela). Tocar num seu equipa na hora (o pedestal muda); tocar num bloqueado abre a janelinha com a peça, o
  preço (com a oferta da semana, quando tem) e COMPRAR / CANCELAR — a compra da loja (o servidor confere o preço e o
  saldo). **CARTÕES**: os banners, com o cartão do perfil equipado à esquerda. **SKIN**: o CRIAR PERSONALIZADO (roxo, o
  primeiro: o editor volta para o COFRE), a equipada, as criadas (com a ★ das favoritas da RODA), as da conta e, numa parte
  só delas, as tampinhas do catálogo **À VENDA** (as mascotes) — aparecem sozinhas, mesmo com as prontas escondidas da v101
  (a nota diz que as *outras* prontas saíram); embaixo, EMOJI NA TAMPINHA (o emoji que vai no meio da tampinha).
  **EMOJI**: os emojis da partida — a cruz dos 5 lugares (tocar escolhe o lugar aceso) e a grade dos 20 (tocar põe no lugar
  aceso), com o PADRÃO. **ESCUDO DO CLUBE**: o escudo do seu clube no pedestal (ou SEM CLUBE, com o IR PARA O CLUBE) e os
  escudos prontos; só o dono troca (o mesmo caminho do lápis do clube) e tem o CRIAR PERSONALIZADO do escudo. **BOLA**: a
  equipada no pedestal e todas as bolas do catálogo (as novas aparecem sozinhas). **MAIS**: AVATARES, EFEITOS,
  COMEMORAÇÕES e GOLS, nas sub-abas. Sem conta, tudo à vista (o bloqueado explica que precisa entrar na conta). Cabe e é
  tocável de 568 × 320 a 1920 × 1080 e no iPhone com o entalhe (só a grade rola); as abas andam com as setas do teclado.
- **AS MASCOTES SÓ COM QUEM COMPROU, TAMBÉM NO SERVIDOR** (`server/mascotes106.js`, chamado pelo `server/fundador96.js`, e
  `app/api/racha/mascotes.ts`): o jogo já não deixa montar a tampinha com as peças das mascotes sem a mascote; agora o
  servidor confere também, para quem monta o código na mão (como na tampinha dos fundadores). A plataforma põe as mascotes
  compradas nas relações da conta (`mascotes`; no bilhete assinado das salas, `m`) e avisa o servidor das salas logo depois
  da compra; quem aparece com a cara de uma mascote que não tem, ou com a Medalhão sem nenhuma mascote, fica com a tampinha
  padrão — no cartão da sala, na partida, na lista e no Chat do Brasil. As mascotes de cada um não vão para os outros. A
  tampinha da conta e o escudo do clube com peça de mascote também só se guardam com a mascote (o escudo de antes, posto
  por outro dono, continua valendo nas outras mudanças do clube).
- **Testes**: `tests/v106_corpo_test.mjs` (o jogo de corpo contra a v104 e a v105), `tests/v106_conteudo_test.py` (as peças no
  fim das listas e os códigos de sempre iguais, as 6 mascotes e as 6 bolas desenhadas, as peças só para quem tem, a LOJA e,
  na plataforma de teste, comprar e equipar a Onça-Preta e a Bola de Fogo; os lugares das peças iguais no jogo, no servidor
  e na plataforma), `tests/v106_emotes_test.py` e `tests/v106_emotes_servidor_test.js` (os 20 desenhados, a cruz e a
  gravação, o HUD em 6 tamanhos, o balão, os Ajustes, o teclado, o controle, o online com duas sessões e o ritmo no
  servidor), `tests/v106_cofre_test.py` (as 6 abas e o pedestal, os caminhos de sempre, o CRIAR, equipar, a ★, as à venda, a
  compra sem conta, na demonstração e com a conta, a cruz dos emojis, o escudo e seis tamanhos) e
  `tests/v106_mascotes_servidor_test.mjs` (as peças, o servidor das salas e a plataforma de teste). O `v101` lê as classes
  novas do COFRE, o `v102` aceita a Medalhão depois da BOTÃO e o `v92_pacote` confere os arquivos e as marcas da v106.

## v105 — 05/11/2026 · o jogo de corpo, o analógico sem atraso, o online sem a bola atravessando, o chat no lobby, a tampinha que fica e o tamanho da borda

A pedido: *"quero melhorar o jogo de corpo — os jogadores, quando se encostam para disputar a bola, deslizam muito; quero um chat
visível na tela do lobby igual o de dentro da partida, lá embaixo; tirar todo lag possível das partidas online, deixar muito
fluido, sem player atravessando bola quando o ping está ruim; quando o jogador cria uma skin e reloga no jogo, a skin some;
quero a borda lisa padrão no jogo, a inicial para geral, e mais parecida (parece que tem uma sombra ali por dentro); o
analógico está com um mini delay"*, com as duas tampinhas de referência. A física das salas muda de propósito (o núcleo, o
mesmo do servidor e do aparelho); o bloco da física do jogo não muda (o build confere: `sha256 ad9f1d2216409b0e`). O backup do
antes: a etiqueta git `antes-v105` (a v104).

- **O JOGO DE CORPO** (`server/partida/nucleo.js`: `atritoJogJog` 0,5 no `PERFIL_V92` e o `contatoJog` no passo; o mesmo arquivo
  do servidor, da previsão do online e da sala neste aparelho; `tools/v105/corpo.js` para a partida contra os bots). O que
  acontecia: a batida tampinha × tampinha não tinha atrito e acontecia depois de andar — duas tampinhas correndo uma contra a
  outra com um desvio de 0,1 u passavam uma pela outra em ~0,4 s, e quem empurrava de lado escorregava em volta do outro (mais
  de 120° por segundo). Agora o contato que já vem encostado se segura antes de andar (sem quique: é o empurra-empurra) e o
  atrito segura o deslize de lado: de frente, as duas se seguram; empurrando quem está parado até uns 27° da linha dos centros,
  você leva ele junto; mais de lado, você ainda passa (escorregando mais devagar contra quem segura). A trombada de quem chega
  correndo continua com o quique de sempre. A bola, o chute e o DB não mudam. O motor dos mapas da Oficina usa o mesmo
  (`server/partida/mapa.js`, com a regra de colisão dos times). Os **bots não encalham**: com o atrito, dois bots se
  empurrando de frente ficavam parados para sempre (num 3x3, 10 minutos do lado da bola); agora, parado encostado em alguém
  por 200 ms, o bot desvia 70° por 400 ms, sempre no mesmo sentido (os dois passam um pelo outro) — no servidor
  (`server/partida/bot.js`), no motor dos mapas e na partida deste aparelho. 48 partidas de bots (1x1 a 4x4): nenhuma travada.
- **O ANALÓGICO SEM O MINI ATRASO: A VIRADA NA HORA** (`viraNaHora` no núcleo). Medido no jogo: a velocidade da tampinha era a
  direção nova SOMADA à de antes e cortada no teto — cada virada só chegava na metade do caminho por passo: a curva de 30°
  levava ~100 ms para valer, a de 90° passava ~80 ms escorregando para o lado de antes e a meia-volta parava um passo inteiro
  antes de voltar. Agora a tampinha vai na hora para onde o analógico aponta (a corrida toda na direção nova, já no primeiro
  quadro — o desenho entre os passos também), e o analógico tem **64 direções** (eram 32: os degraus de 11,25° viram 5,6°). Na
  GINGA a arrancada do drible continua mandando. O perfil da v91 (o "Restaurar v91" do painel de testes) tem tudo como antes.
- **O ONLINE SEM A BOLA ATRAVESSANDO A TAMPINHA** (`tools/v105/rede.js`). O que acontecia com o ping ruim: o que vai para a tela
  é o lugar do mundo previsto MAIS o deslize de cada correção (a mola da v96) — cada coisa com a sua mola, e a bola desenhada
  deslizava para o lugar certo por dentro da tampinha desenhada. Agora, no fim de cada quadro, a bola desenhada sai de dentro
  de qualquer tampinha (a sua por último: o seu toque manda), sem entrar nas traves, na rede nem nas linhas, e o empurrão entra
  na mola da bola (sem vaivém), com teto por quadro (1100 px/s: a sobreposição grande sai em dois ou três quadros, sem a bola
  pular). No simulador da rede: a bola dentro de uma tampinha caiu de 3,4% para 0,8% dos quadros no 4G
  e de 4,3% para 0,4% no 4G ruim, e a mais funda de ~26 px (a bola tem 19) para ~9 px, sem piorar o resto (separar as
  tampinhas umas das outras também foi medido e ficou de fora: o outro jogador dava arrancos). `RACHA_CONFIG.contato105 = false`
  desliga.
- **60 QUADROS POR SEGUNDO NAS SALAS** (`server/turma.js`, `quadrosDe`; eram 30): as correções da previsão ficam com a metade do
  tamanho — no 4G ruim, a correção da sua tampinha (p95) de 6,2 para 2,5 px —, por uns 20 KB/s num 2v2 (29 KB/s num 4v4). As
  salas do mapa da Oficina e as do Rachão seguem com 30; `RACHA_QUADROS=30` volta ao de antes.
- **A PÁGINA DE ANTES PEDE PARA ATUALIZAR** (`server/turma.js`): com a física das salas nova, a página do jogo de antes (o app
  instalado que ficou aberto no fundo, a aba esquecida) preveria a própria tampinha com a física velha — um tranco a cada
  virada. O jogo novo diz que é a v105 no hello; a página de antes (a que manda o v93 e não o v105) não cria, não entra, não
  volta para a sala do RACHA e não entra na fila da ranqueada: aparece *"Tem jogo novo (a física das salas mudou): atualize o
  jogo — recarregue a página ou feche e abra o app — para jogar online"*. As salas do Rachão seguem como antes.
- **O CHAT NA TELA DO LOBBY** (`tools/v105/chat_lobby.js` e `app/public/game/v105-chat.css`): a barra do chat da partida (a
  etiqueta BRASIL, NOME: a última mensagem, as não lidas e o ^) volta para a tela inicial com o Chat do Brasil e a cara da da
  partida — embaixo, no vão entre a barra de atalhos e o JOGAR; nos apertados (o iPhone com o entalhe, o 800 × 336), logo em
  cima da barra de atalhos; sem lugar, não aparece. Tocar abre o painel de sempre (as mensagens, o campo e o ENVIAR; o nome
  abre a ficha com o VER PERFIL — o painel fecha antes, para o perfil não ficar atrás). O lugar é medido só quando o lobby
  muda de tamanho (nada por quadro). Sem servidor ou com o "Chat na tela" desligado: sem a barra; com o Chat do Brasil
  desligado nos Ajustes, a barra diz isso; o servidor fora do ar: "Chat do Brasil fora do ar".
- **A TAMPINHA CRIADA NÃO SOME MAIS AO ENTRAR DE NOVO** (`tools/v105/cosmeticos.js` e `cosmeticos.py`). A causa (reproduzida na
  v104 só abrindo o jogo de novo, sem conta nenhuma): a leitura da chave das tampinhas (`racha-tampa-v1`, no `tools/tampa_rua.js`)
  roda no começo do script, antes de as peças das versões seguintes — as caras e os aros animados da v76 e da v96 e a borda
  BOTÃO da v102 — entrarem nas listas; o código de toda tampinha feita com uma delas era recusado: a equipada voltava a ser a
  inicial, a salva sumia do inventário e a gravação seguinte apagava de vez (no aparelho e, com a cópia, na conta). Como a v102
  pôs a BOTÃO no editor, quase toda tampinha nova sumia ao "relogar". Agora o que não dá para ler no começo fica guardado e é
  lido de novo no fim, com todas as peças. E a cópia na conta: vai logo depois de cada mudança nas tampinhas (em ~1 s; antes,
  de 8 a 12 s depois e nunca no meio da partida), o SAIR DA CONTA manda o que falta antes de encerrar a sessão, com o app
  fechando o envio sai com keepalive, e no QUAL PROGRESSO FICA? (e no LEVAR O PROGRESSO PARA A CONTA) as tampinhas dos dois
  lados juntam (as apagadas de propósito não voltam; a equipada é a equipada por último); a tampinha da conta que o aparelho
  nunca viu entra nas salvas.
- **A BORDA BOTÃO PARA TODO MUNDO, CHAPADA COMO NAS IMAGENS**: a tampinha inicial (e as do time, as da Oficina e as de versões
  antigas) e toda tampinha com a borda de fábrica aparecem com a BOTÃO de aro branco (os códigos não mudam: é só o desenho); as
  novas já nascem com ela. E a BOTÃO ficou chapada — sem o degradê de relevo do aro, sem o brilho e sem a sombra por dentro: o
  contorno escuro fino por fora, o aro branco liso, um filete escuro fino entre o aro e o desenho e o desenho cheio no meio, nas
  proporções medidas nas duas imagens. O tamanho da tampinha, o alcance e a física não mudam.
- **O TAMANHO DA BORDA DA TAMPINHA** (`tools/v105/borda.py` e `borda.js`), a pedido: *"crie uma função tamanho da borda, sem
  borda, na skin"*. No CRIAR TAMPINHA, na aba BORDA, embaixo das cores: o **TAMANHO DA BORDA**, com SEM · FINA · NORMAL ·
  GROSSA (a NORMAL é a de sempre; grátis), para toda borda — a BOTÃO, as de dentes, as acesas e com as caras animadas. Na
  FINA e na GROSSA o desenho do meio cresce ou diminui e a borda fica mais fina ou mais grossa (na BOTÃO o aro branco com 4,5%
  ou 17% do raio — o normal tem 9%; nas de dentes o meio com 80% ou 66% do raio — o normal tem 74%). **SEM BORDA** a tampinha
  fica só com o desenho, cheio até a beirada, chapado: sem a saia, os dentes, o aro, o contorno, a luz e a animação do aro
  aceso (com uma cara animada, a cara ocupa a tampinha inteira); a faixa das bordas continua mostrando cada borda no tamanho
  normal. O tamanho vai no fim do código da tampinha (2 bits, só quando não é a normal): os códigos de sempre não mudam (200
  tampinhas sorteadas no teste), o jogo de antes lê a mesma tampinha com a borda normal, e o servidor das salas e a plataforma
  só olham o começo do código e o tamanho dele (o mais comprido, sem borda, fica com 39 letras de 44). O emoji em cima da
  tampinha cobre o meio de cada tamanho. Só desenho: o tamanho da tampinha, o alcance e a física não mudam.
- **Testes**: `tests/v105_rede_test.mjs` (o corpo e a virada no núcleo; o contato desenhado e os 60 quadros no simulador da
  rede), `tests/v105_chat_lobby_test.py` (o lugar em 10 tamanhos, abrir e minimizar, desligada/fora do ar, na partida, nada por
  quadro e o Chat do Brasil de verdade entre duas contas) e `tests/v105_cosmeticos_test.py` (a criada com a BOTÃO e com a cara
  animada continuando ao abrir o jogo de novo, a borda de fábrica com a BOTÃO, o aro chapado medido nos pixels, as tampinhas
  juntando no QUAL PROGRESSO FICA? e, com a conta, a cópia indo logo, o SAIR que manda antes de sair e um navegador novo). As comparações históricas (o lance da v91 tique a tique, os quadros
  da v98, o DB contra o núcleo de referência, a v95 × v96 da rede) rodam com a física da v104 — sem o corpo, com a virada de
  antes e as 32 direções; o `servidor_test` reconhece o quadro de mentira pelo conteúdo (com 60 por segundo o passo 3 também
  é de verdade); o `v92_pacote` confere os 60 quadros por segundo do servidor oficial (o admin pede 30 e fica o padrão); e o `tests/v105_borda_test.py` (o tamanho da borda: o código, os pixels de cada tamanho, o editor e o servidor).

## v104 — 04/11/2026 · o correio de verdade, o árbitro arrastando no painel e a tela inteira só com o jogo

A pedido, com o jogo já na VPS nova e três prints (o painel dos jogadores, o correio com erro e a tela cheia): *"quero o nome
dos jogadores assim quando clicar ali; se eu segurar um jogador posso afastar ele pra reserva e o reserva para algum time — o
árbitro da partida consegue fazer isso; o correio ainda não funciona; o ranking dos jogadores também não; a tela cheia ainda
fica com umas bordas estranhas, meio bugadas — quero tela cheia sem bordas meio transparentes, totalmente, só o jogo"*. A
física não muda (o build confere: `sha256 ad9f1d2216409b0e`). O backup do antes: a etiqueta git `antes-v104` (a v103).

- **O CORREIO FUNCIONA NO SERVIDOR DE VERDADE** (`tools/v84/login_cedo.js`). O defeito do print ("expected object, received
  null"): sem entrada, o jogo mandava `{"json": null}` para a plataforma; o tRPC 11 com o zod 4 da produção entrega esse null
  para a validação, e as entradas opcionais (a `mensagens.listar` da CAIXA DE ENTRADA, a `estat.resumo`, a `clubes.listar`)
  recusam o null — a caixa inteira não abria (as cartas e as mensagens vêm juntas). Agora vai o "undefined" do superjson
  (`{"json": null, "meta": {"values": ["undefined"]}}`), como o cliente do tRPC manda. Os testes não pegavam porque o servidor
  de teste trocava o null por undefined: o `tests/plataforma/trpc_lite.mjs` agora entrega o null como a produção (e o
  `superjson_lite.mjs` entende o valor de cima anotado), e com ele o `v102_correio_test` falhava do mesmo jeito do print antes
  da correção; os clientes dos testes (Node e Python) mandam como o jogo.
- **O PAINEL DOS JOGADORES NA PARTIDA** (`tools/v104/painel.js`, o botão das pessoas do lado do placar):
  - a vaga sem gente aparece como **VAGA LIVRE** (antes, como um "Jogador · SEM CLUBE" com uma tampinha qualquer: o painel
    achava que era um bot sem nome — o "Jogador" do print); quem caiu: "CAIU · A VAGA ESPERA";
  - o **ÁRBITRO SEGURA** o nome de alguém (meio segundo: o nome "levanta") **e arrasta**: para o **BANCO** (vai para o banco e a
    vaga fica livre), para uma **VAGA LIVRE** (entra ali), para o **nome de outro** (os dois trocam: quem vem do banco entra e
    o outro vai para o banco) ou para a **cor de um time** (a primeira vaga livre dele). Vale na hora, com a partida rolando
    (as mesmas ações do servidor da ficha do árbitro e do TIMES E JOGADORES da pausa). O banco aparece mesmo vazio, para
    receber; a dica fica no alto do painel. Quem não é o árbitro só vê o painel (os toques passam para o jogo, como antes).
- **A TELA INTEIRA SÓ COM O JOGO** (`tools/v104/tela_inteira.js`): a moldura da v103 (o campo escurecido num canvas de trás,
  redesenhado 10 vezes por segundo) saiu. Agora o **próprio canvas do jogo cobre a tela toda**: o campo, as tampinhas, a bola e
  as redes vão até a beirada, no mesmo quadro, sem escurecer e sem atraso — no computador de 16:10 e no tablet o campo aparece
  inteiro (antes, cortado em cima e embaixo pela faixa). A área de sempre (a tela virtual de 1920 × 888: o HUD, os botões, o
  analógico e a pausa) continua no mesmo lugar e do mesmo tamanho, dentro da área segura do celular. Por dentro: o contexto
  soma o deslocamento da área de sempre em cada `setTransform` e o canvas responde a área de sempre no `getBoundingClientRect`
  (os toques, o HUD e as janelas por cima fazem as mesmas contas de antes). O escuro da PAUSA, do fim e da apresentação vai até
  a beirada também. No Ultra leve e na partida da Oficina fica como antes; `RACHA_CONFIG.telaInteira = false` desliga.
- **O RANKING ABRE ONDE TEM GENTE** (`tools/v104/ranking.js`): a v103 fez o RANKING abrir em PONTOS RANQUEADOS, que só tem
  quem jogou a RANQUEADA — num servidor novo (as contas do zero), com a turma jogando nas salas, ele abria vazio e parecia
  quebrado, com os GOLS e as ASSISTÊNCIAS das salas já contando. Agora, se a aba de agora vier vazia, ele vai sozinho para a
  primeira categoria com alguém (a não ser que a pessoa tenha escolhido a aba). Lembrando: só contam as partidas online, com
  conta, contra gente com conta do outro lado, que terminaram (o placar ou o tempo; a encerrada pelo árbitro não vale).
- **Os testes**: entram na bateria o `v104_painel_test.py` (10 verificações, três navegadores: a VAGA LIVRE, a dica só para o
  árbitro, segurar e soltar no banco, na vaga, em cima de outro e no time, com a partida rolando) e o `v104_ranking_test.py`
  (4: a caixa de entrada abre com o servidor de teste rigoroso e o ranking vai para a aba com gente). O `v103_tela` confere o
  canvas de ponta a ponta (no lugar da moldura); os testes que liam pixels do canvas com a escala `cv.width/W` usam o `K` (o
  `v93_fase1` e o `v92_hud`) — o `getImageData` do jogo já soma o deslocamento da área de sempre. O `tools/v92/pacote.py`
  confere os arquivos da v104 no ZIP. Continuam como na v103: o `v71`, o `v73`, o `v75`, o `v76`, o `v77`, o `v92`, o
  `v92_celular` e o `v93_fase4` (do lobby e do painel da versão de testes de versões anteriores).

## v103 — 03/11/2026 · o lobby de dia, as salas sem bots, o árbitro simples, a ranqueada que vale, os sons do online, os controles e a tela cheia

A pedido, com a imagem da quadra de grama do Bar do Seu Zé: *"use esta imagem de fundo, crie uma função nas configurações para
configurar o controle (chute no quadrado etc.) e pra PC também, tire os bots das salas personalizadas e quando alguém sai fica
com um a menos, crie uma função de poder pôr pessoas nas salas sem reiniciar a sala, deixe mais clean as configurações de
árbitros, caso tenha algum delay no analógico retire, deixe a ranqueada e o ranking funcional, poder clicar no perfil dos
players pelo chat, sons no online está bugado, aumentar bem pouco a força do chute e do passe, e faça o RACHA funcionar em tela
cheia no Android e no iPhone (PWA e um botão de tela cheia)"*. O bloco de física da base não muda (o build confere:
`sha256 ad9f1d2216409b0e`); a força do CHUTE mora no núcleo (abaixo). O backup do antes: a etiqueta git `antes-v103` (a v102).

- **O LOBBY DE DIA** (`tools/v103/lobby_dia.js`, `tools/v103/arte`): a imagem enviada no fundo da tela inicial (no lugar da
  quadra da noite da v101 — a imagem da noite saiu do jogo) e a mesma cena desfocada no fundo das telas; a tampinha em pé no
  círculo do meio da quadra, com a sombra macia na grama e a luz do sol (sem a luz roxa, o anel de neon e o reflexo de chão
  molhado, que eram da quadra da noite). A arrumação da v102 (o MENU, a barra, o MODO e o JOGAR) não muda.
- **O CHUTE UM POUCO MAIS FORTE** (`server/partida/nucleo.js`, o mesmo arquivo do servidor e do jogo): o CHUTE 340 → **360**
  (a bola parada sai a 36 u/s, era 34; uns 6%). O teto da bola não muda (46,75 u/s): o DB continua no teto, e o chute sozinho
  fica mais perto dele. **O PASSE ficou em 212,5**: ele decide o DB com a bola rolando (a bola não pode sair do alcance antes
  do CHUTE do passo seguinte) e qualquer aumento derruba o DB — medido no laboratório do DB (`tests/v92_db/lab.cjs`, o cenário
  da bola rolando): com o PASSE a 213 a chance do DB cai de 76% para 31%; a 220, para 0%. A ponte da física RACHA × Rachão
  (`app/public/game/rachao/ponte.js`, e o `server/partida/rachao_motor.js` gerado dela) usa o CHUTE novo: misturar "o chute
  do RACHA" num estádio do Rachão dá os mesmos 36 u/s.
- **AS SALAS PERSONALIZADAS SEM BOTS** (`server/turma.js`, `server/partida/sala.js`, `server/partida/nucleo.js`,
  `server/partida/sala_mapa.js`, `tools/v103/salas.js`):
  - as salas online (as normais, as do mapa da Oficina e as do Rachão) não têm mais bots: o quadro BOTS saiu das regras e do
    CRIAR SALA (a sala NESTE APARELHO continua com os bots — é o treino); as cinco regras que ficam usam a grade de cinco, com
    o texto inteiro ("Futebol" e "Só chutar" eram cortados na de seis);
  - começa com **pelo menos uma pessoa em cada time** (o time pode ter um a menos); a vaga sem gente fica **vazia**: a
    tampinha não entra no campo (o núcleo pula a vaga vazia, no servidor e na previsão do aparelho) e o quadro diz quais
    estão vazias (`Q.fora`); o jogo não desenha nem aponta a vaga vazia;
  - **quem sai, cai ou vai para o banco deixa a vaga vazia** — o time joga com um a menos, sem bot no lugar; quem caiu e
    volta em até 90 s reassume a vaga dele (a tampinha volta ao campo);
  - **pôr gente sem reiniciar**: o árbitro põe quem assiste (ou quem chegou no meio da partida) numa vaga vazia — a tampinha
    aparece no campo do time na hora, o placar e o relógio continuam; com o time cheio, TROCAR COM quem está lá;
  - (no Rachão, o motor é outro: quem cai no meio ainda deixa um bot segurando o lugar até voltar; a vaga sem gente no começo
    fica vazia como nas outras).
- **O ÁRBITRO MAIS SIMPLES** (`tools/v103/arbitro.js`): eram dois jeitos de mexer nos times, um por cima do outro (o árbitro
  dos cartões, com o apito e o apito principal, que não valia com a partida rolando, e o ADMIN da v93). Agora é um só, que
  vale antes e durante a partida:
  - tocar no **cartão** de alguém abre a ficha: MUDAR PARA O TIME B (ou A; com o time cheio, TROCAR COM quem está lá), PÔR NO
    BANCO, TORNAR ÁRBITRO e REMOVER DA SALA (os dois últimos confirmam); quem assiste: PÔR NO TIME A / PÔR NO TIME B;
  - tocar numa **VAGA LIVRE** pergunta QUEM ENTRA ali;
  - o **apito dos ajudantes saiu**; "árbitro" em todo lugar (era admin, apito, apito principal); o botão ADMIN da tela da
    sala saiu (os cartões fazem o mesmo); na partida, a faixa de cima diz "SALA X · árbitro";
  - na **pausa**, a parte do árbitro junta TIMES E JOGADORES (o painel do lado, com OUTRO TIME, BANCO, ÁRBITRO e "vaga
    livre"), PAUSAR PARA TODOS e ENCERRAR PARTIDA.
- **A RANQUEADA QUE VALE** (`server/turma.js`, `server/grupo93.js`, `app/api/racha/jogoRouter.ts`, `tools/v103/ranqueada.js`):
  desde a revisão de segurança da v100 só vale na conta o resultado que o servidor simulou — e, quando ninguém aparecia na
  busca (o normal com pouca gente), a ranqueada ia contra os bots NO APARELHO e não valia nada (nem patente, nem XP, nem
  moedas). Agora, ninguém em 20 s (ou o JOGAR CONTRA BOTS AGORA, que manda `fila_bots`): **a partida contra os bots roda no
  servidor** (o grupo junto, no mesmo time) e o resultado vale: a patente como contra os bots, **com o teto do dia de 250
  pontos** (o que a liga contra os bots sempre teve), XP e moedas. Contra gente continua sem o teto. Sem servidor, a partida
  fica no aparelho e a busca avisa que ela não vale pontos na conta. Servidor antigo (sem o `fila_bots`): em 6 s vai para o
  aparelho, como antes.
- **O RANKING**: abre em PONTOS RANQUEADOS (a patente de quem joga a ranqueada, agora com as partidas contra os bots do
  servidor); GOLS, ASSISTÊNCIAS e CRAQUE DO JOGO continuam só com as partidas contra gente com conta, e a tela vazia diz isso.
- **O PERFIL PELO CHAT** (`tools/v103/chat_perfil.js`): na partida, o VER PERFIL da ficha (o nome no chat) não mostrava nada
  — a janela abria dentro do lobby escondido. Agora abre por cima do jogo (e fechar volta para a partida); a ficha de quem tem
  conta sempre tem o VER PERFIL como o primeiro botão; tocar na tampinha da ficha também abre; a sua ficha abre o seu perfil
  do jogo.
- **OS SONS DO ONLINE** (`tools/v103/sons.js`): medido com dois navegadores, contando cada som — no online só tocava o SEU
  chute e o gol. Agora tocam também o chute e o passe dos outros (pelo quadro do servidor, CHUTE ou PASSE pelos botões), a
  bola na trave (no mundo previsto, uma vez por batida), o apito da saída depois do gol e o apito final (uma vez por rodada).
- **OS CONTROLES DO JEITO DE CADA UM** (`tools/v103/controles.js`, `app/public/game/v103-controles.css`; AJUSTES › CONTROLES):
  - **no controle** (o de videogame, Bluetooth ou com fio, no celular ou no PC): cada ação no botão que você quiser — PASSE,
    CHUTE, CURVA, PAUSA, os chutes do Rachão (CAVADINHA, CURVA ← →, SUPER), a FINTA e o DRIBLE da GINGA e o CONFIRMAR/VOLTAR
    dos menus: toque na ação e aperte o botão no controle (o Esc ou 8 s cancelam). Até dois botões por ação; nenhuma ação fica
    sem botão (o botão que era de outra sai de lá, ou os dois trocam). Jeitos prontos: PADRÃO (✕/A passe, ○/B chute), **ESTILO
    FIFA** (✕ passe, **□ chute**, ○ curva) e INVERTIDO (quem tinha o "Trocar A e B" da v88 ligado passa para ele). Os nomes dos
    botões aparecem como no controle ligado (PlayStation ✕ ○ □ △ L1 R1…, Xbox A B X Y LB RB…, Nintendo, ou "Botão n"); mais a
    zona morta do analógico do controle (com o analógico ao vivo), a vibração no chute (com o TESTAR) e o VOLTAR AO PADRÃO.
    Andar continua no analógico da esquerda e no direcional;
  - **no teclado (PC)**: a lista de teclas de sempre ganhou a PAUSA (P; o Esc continua) e as dicas do começo da partida, o
    tutorial e o cartão dos chutes do Rachão mostram as teclas — ou os botões do controle — de cada um;
  - guardado em `racha-controle-v103` (o `racha88-controle` antigo continua sendo gravado: voltar para uma versão antiga não
    perde o ligado/desligado).
- **O ANALÓGICO SEM ATRASO** (medido): o controle chegava **um quadro depois** (a v88 lia o controle depois do quadro do jogo) —
  agora é lido no começo do quadro; a zona morta dele caiu de 28% para 12% (ajustável) e ele anda nas mesmas direções do
  analógico da tela. O analógico da tela começa a andar a **6% do curso** (era 15%) e para abaixo de 4% (era 9%); quem tinha o
  padrão antigo guardado nos ajustes finos passa para o novo uma vez (os valores mudados à mão ficam). Nenhuma suavização no
  caminho do toque (procurado); no online vai a mesma direção da previsão do aparelho.
- **A TELA CHEIA E O APP INSTALÁVEL** (`tools/v103/tela.js`, `app/public/game/v103-tela.css`,
  `app/public/game/manifest.webmanifest`, `app/public/game/sw.js`, os ícones em `app/public/game/icones`):
  - o botão **TELA CHEIA** — o quadrado dos quatro cantinhos na barra de cima do lobby (antes do MENU), o cantinho da PAUSA,
    AJUSTES › Visual e, com o celular em pé no Android, o JOGAR EM TELA CHEIA da tela GIRE O CELULAR — põe o jogo em tela
    cheia, sem as barras do navegador, e trava o celular deitado (Chrome no Android; no PC, o Esc sai). **Nada entra em tela
    cheia sozinho** (como ficou combinado na v101.1): só pelo botão; em tela cheia e no app instalado o botão some;
  - no **iPhone**, onde o Safari não deixa um site entrar em tela cheia, o botão mostra o guia curto: Compartilhar ›
    Adicionar à Tela de Início (no iOS 26 o Compartilhar fica no menu •••) — pelo ícone, o RACHA abre como app, sem barra
    nenhuma (as marcas do iPhone: `apple-mobile-web-app-capable`, a barra de status por cima do jogo e o ícone 180 × 180);
  - o **app instalável (PWA)**: o manifesto (deitado, tela cheia, os ícones com o grafite do próprio jogo, gerados por
    `tools/v103/icones.py`) e o service worker **sempre a rede primeiro** (o jogo novo chega na hora; a cópia guardada só abre
    o jogo sem internet, para treinar contra os bots; nunca mexe na API, nos websockets das salas nem em POST). Só registra por
    https ou no localhost; `sw: false` no `config.js` desliga e tira o registro. Os servidores mandam o manifesto com o tipo
    certo e sem guardar versão velha (`server/servidor.js`, `app/api/lib/vite.ts`);
  - **a tela inteira**: as faixas em volta da área do jogo (o entalhe, a barrinha do iPhone, as sobras da tela) mostram o
    próprio campo, mais escuro, em vez do preto; o canvas, o HUD e os controles ficam exatamente onde estavam, dentro da área
    segura — conferido em 8 tamanhos de tela, com e sem entalhe, contra a v102; o puxar-para-atualizar e o "elástico" do
    iPhone não atrapalham mais. No Ultra leve e na Oficina a faixa fica na cor do fundo. Com a câmera andando, as faixas são
    redesenhadas no máximo 10 vezes por segundo: redesenhadas a cada quadro, elas atrasavam o laço do jogo o bastante para
    mudar em que comando o CHUTE chegava no servidor (medido no `v92_db_online`, que voltou a passar sempre).
- **Os testes**: entram na bateria (`tests/roda_tudo.sh`) o `v103_ranqueada_test.mjs` (12 verificações, Node: a fila, o
  `fila_bots`, os pontos com o teto do dia e o ranking na plataforma de teste), o `v103_salas_test.py` (15, quatro navegadores),
  o `v103_sons_test.py` (8), o `v103_chat_perfil_test.py` (8, a plataforma de teste), o `v103_controles_test.py` (58) e o
  `v103_tela_test.py` (264; com `RACHA_BASE=<a página de teste da v102>` confere também que o jogo ficou no mesmo lugar). Os
  testes que contavam com os bots nas salas online ou com o ADMIN e a RESERVA ganharam a sala com duas pessoas e os nomes
  novos: o `servidor_test`, o `v93_salas`, o `v93_revisao` (1 e 3), o `v94_turma`, o `oficina_servidor`, o
  `v98_rachao_servidor`, o `v93_fase3` (a ficha pelo cartão e a pausa do árbitro), o `v79` (a ranqueada contra os bots no
  servidor) e o `v83_salas_ws` (o fim da partida pelos gols do gancho de teste, com o novo `tests/ganchos_teste_pre.cjs`, e as
  três salas da medição com duas pessoas cada), o `v98_rachao_online` (no 2x2 com duas pessoas, duas no campo) e o
  `v100_seguranca` (a ranqueada contra os bots do servidor agora vale para a patente, uma vez por selo); os de força do chute
  comparam com o CHUTE novo (`v92_nucleo`, `v92_db`, `v92_db_online`, `v99_chutes`, `v86_chute`, `v97_mistura`, `v97_rachao`; o lance de 900
  passos do `v92` e a sessão da v92 do `v92_celular` rodam com o CHUTE de antes, para continuar iguais aos da v91); o sorteio de partidas também mudou com o chute:
  o simulador do `v102_rede` passou de 8 para 24 sementes (com 8, uma medida do "outro pula" virou só pelo sorteio) e o
  `oficina_mapa` olha 3 minutos para os bots fazerem gol (a semente de sempre fez o 1º aos 75 s); o `v88_controle` confere a
  lista nova do controle e a zona morta nova; o `v102` conta o botão da tela cheia na barra. O `tools/v92/pacote.py` confere os arquivos da v103 no ZIP. Continuam como na v102: o `v71` na sala
  (o *Só chutar*, desde a v99), o `v73` (o anel novo da v102), o `v92` e o `v92_celular` (o painel da versão de testes e o A ⇄ B) e o
  `v93_fase4` (as vagas do grupo no lobby da v102).
- **Fica para depois**: no Rachão, quem cai no meio ainda deixa um bot até voltar (o motor do Rachão é outro); o PASSE mais
  forte (só junto com uma mudança na janela do DB); a tela cheia e o guia do iPhone conferidos no Chromium (com os tamanhos e
  os entalhes de mentira), não num aparelho de verdade.

## v102 — 03/11/2026 · o correio de volta, a borda BOTÃO, o anel da tampinha, o lobby mais limpo e o online mais liso

A pedido, com a imagem de duas tampinhas listradas num campo: *"crie uma borda de botão nesse estilo e os mensagens do correio
não funciona no racha melhore essa borda ao redor e deixe o jogo mais liso multiplayer manda um preview pra mim cria um lobby
com menos informações tá muito confuso"*. A física não muda (o build confere: `sha256 ad9f1d2216409b0e`). O backup do antes: a
etiqueta git `antes-v102` (a v101).

- **O CORREIO E AS MENSAGENS FUNCIONAM DE NOVO** (a plataforma, `app/api`). O defeito: o `drizzle-orm` da produção (0.45)
  embrulha todo erro do MySQL num `DrizzleQueryError` ("Failed query: …") e o código conferia a chave repetida (`ER_DUP_ENTRY`)
  só no erro de fora. Depois da primeira carta para todo mundo (o RACHA CONTROL, o login do dia, o presente), cada abertura do
  correio, das mensagens e do resumo do lobby tentava gravar a mesma carta de novo e caía no erro — o correio parava de abrir
  para todo mundo. Agora:
  - o `app/api/racha/erros.ts` (`ehDuplicado`) procura a chave repetida no erro e nos de dentro (`.cause`), e todos os lugares
    que esperavam a chave repetida usam ele: o correio, as missões, o comum da v88, o fundador, os amigos, a economia, o clube,
    o guard e o ranking (o `INSERT INTO limites` da v100 caía do mesmo jeito);
  - o correio confere as cartas que a conta já tem antes de gravar as cartas para todo mundo (sem tentar de novo a cada vez);
  - **APAGAR** marca a carta como apagada (some da lista e não volta); antes ela era apagada do banco e voltava na abertura
    seguinte, **com o prêmio para coletar de novo**;
  - o banco de teste (`tests/plataforma/drizzle_lite.mjs`) embrulha os erros como o da produção — os testes antigos passavam
    porque o de teste não embrulhava.
- **A BORDA BOTÃO** (`tools/v102/borda.js`): no CRIAR TAMPINHA › BORDA, **grátis**, logo depois da Lisa — o jeito do futebol de
  botão da imagem: o **aro liso** na cor do ARO (o nome da cor dela no editor; branco na imagem), o **contorno escuro** firme
  por fora, o filete entre o aro e o desenho, o relevo e o brilho em cima à esquerda; o desenho (o padrão, as cores e o ícone)
  ocupa mais da tampinha. Ela entra no **fim da lista das bordas** (o lugar 27): os códigos das tampinhas de sempre não mudam,
  o servidor das salas só olha o lugar 26 (a dos fundadores) e o catálogo da plataforma (`app/contracts/catalogo_tampinhas.json`,
  gerado do jogo) ganhou a peça. Com uma cara animada, o aro do botão entra no lugar dos dentes. Os bots também podem sair com
  ela (é uma borda grátis).
- **O ANEL EM VOLTA DA TAMPINHA** (o seu verde; o dos outros, na cor do time): encostado na tampinha, um degradê (mais forte
  perto dela), a sombra curta da tampinha em cima, o brilho de vidro em cima à esquerda, a **borda de fora clara e firme** (é o
  alcance do chute, como antes) com a luz no chão e um fio escuro por fora, que lê na grama, na quadra e no concreto. Só o
  desenho: o alcance e a força do chute não mudam.
- **O LOBBY COM MENOS COISA NA TELA** (`tools/v102/lobby.js` e `app/public/game/v102.css`): eram **26 botões** na tela
  inicial; agora são **13**:
  - em cima: o **perfil**; as **moedas**, as **gemas**, o **correio** e o **MENU** (☰);
  - no meio: a **tampinha** e **uma vaga do grupo** (o + com GRUPO embaixo; com o grupo formado, as vagas mostram quem está);
  - embaixo: a **barra de atalhos** (SALAS, TREINO, OFICINA e COFRE) e, na direita, o **MODO** (o tamanho do time, RANQUEADA e o
    campo, com as setas de trocar — o MODO repetido da v101 saiu) em cima do **JOGAR**;
  - o **MENU**, a gaveta da direita: a **PATENTE** no alto (a insígnia, o nome e os pontos; tocar abre as patentes) e LOJA,
    CLUBE, AMIGOS, RANKING, EVENTOS, PASSE RACHA, MISSÕES, CHAT, AJUSTES e CONEXÃO. Os números e os pontos vermelhos de sempre
    (os pedidos de amizade, o prêmio das missões, as não lidas do chat…) aparecem no item e somados no botão do MENU; fecha no X,
    tocando fora ou no Esc (e no B do controle);
  - cada botão novo toca o botão de sempre (escondido): abre exatamente o que já abria; pelo teclado e pelo controle, Enter (A)
    no MENU abre a gaveta com o foco dentro, e quando a janela ou a tela aberta por ela fecha, o foco volta para o MENU; em pé
    continua o lobby de antes;
  - no celular deitado (onde o texto não cresce sozinho) a barra, o MODO e os itens do MENU ficam maiores (o MODO nunca com
    menos de 44 px de verdade).
- **O cabeçalho do CRIAR TAMPINHA**: os três quadrados de cima (o chat, os amigos e os ajustes) apareciam **vazios** — o editor
  abre pelo `abreTela` de antes da v91 e os ícones novos só entravam pelo da v91. Agora entram ao abrir (e em todas as telas
  montadas no fim do carregamento).
- **Os testes**: o `tests/v102_correio_test.mjs` (o correio com o banco embrulhando os erros como a produção: falha no código de
  antes, passa no novo) e o `tests/v102_test.py` (100 verificações: o lobby em cinco tamanhos de tela, o MENU e os atalhos
  abrindo o mesmo que os botões de sempre, a PATENTE, os números e os pontos, a borda BOTÃO e o anel) entram na bateria. Os
  testes que tocavam nos botões que foram para o MENU tocam por ele (o `comum.clica_lobby` acha o botão novo que toca o de
  sempre): o v71 (os lugares e as medidas do lobby), o v77 (a barra de cima), o v81 (o chat e as não lidas), o v87_site (os
  AMIGOS), o v95 (a OFICINA na barra), o celular (o MODO em cima do JOGAR), a Oficina (o botão da barra), o polimento (o foco
  de volta no MENU) e o controle (o MODO para cima; a LOJA pelo MENU); o v101 deixa a contagem das peças à vista para o da v102.
  O `tools/v92/pacote.py` confere os arquivos da v102 no ZIP. Continuam como na v101: o `v71` na sala (o *Só chutar*, desde a
  v99).
- **O ONLINE MAIS LISO** (o "deixe o jogo mais liso multiplayer"): medido antes de mexer — dois navegadores numa sala 1v1 com
  a internet de mentira do 4G (o atraso, os picos do rádio e os pedaços que chegam juntos: `tests/v92_proxy.cjs` ganhou
  `--pico`, `--rajada`, `--semente` e `--estat`), com a "verdade" de cada passo gravada pelo servidor
  (`tests/v102/servidor_verdade.cjs`, `tests/v102_rede_medidas.py`) e um simulador com o motor de verdade
  (`tests/v102/sim.mjs`). As causas, da maior para a menor: no pico do 4G a fila de comandos de alguém esvazia, a tampinha
  dele para no servidor e o mundo previsto no aparelho corria na frente e depois parava (o "pulo" do tempo do mundo); os
  outros jogadores eram adivinhados pela velocidade do quadro (a virada chegava uma ida e volta depois, e quem engasgava
  aparecia parado e depois correndo). O que entrou:
  - o quadro do servidor leva as **direções que cada um apertou** (`Q.ent`: a de agora e as da fila, em 64 setores) e o
    **crédito que a recuperação da fila vai pagar** (`Q.cred`, só quando alguém tem) — uns 40 bytes por quadro no 1v1
    (`server/partida/sala.js`; a fila e a partida não mudam; `RACHA_ENTRADAS=0` desliga);
  - a previsão do aparelho (`tools/v102/liso.js`) anda os outros com o que eles apertaram (e não pela velocidade do quadro) e
    refaz os seus comandos que o servidor vai pagar como passos só da tampinha, como ele faz — o mundo previsto não corre
    na frente e para; nos 2 s depois do começo e de um engasgo seu (mais de 140 ms sem comando) o crédito não vale (o
    servidor junta crédito que não paga). Servidor antigo: sem os campos, tudo como antes; jogo antigo: ignora os campos;
    `RACHA_CONFIG.rede102 = false` desliga;
  - medido (24 sementes × 60 s no simulador, v96 → v102): no 4G, o pulo do tempo do mundo de 3,4% para 0,35% dos quadros
    (no 4G ruim, de 6,4% para 1%), os outros parados e depois correndo de 14 para 3,6 por minuto, a correção da sua tampinha
    (p95) de 4,4 para 2,9 px e o erro dos outros (p95) de 50 para 39 px; nos navegadores a melhora vai no mesmo sentido
    (os números variam muito de uma rodada para outra). Fica para depois: a fila do servidor sem colchão contra a oscilação
    e o empurra-empurra na bola a 30 quadros por segundo;
  - testes: `tests/v102_rede_test.mjs` (35 verificações, sem navegador) na bateria; o `v92_nucleo_test` e o `v99_chutes_test`
    comparam os quadros sem os campos novos.

## v101 — 30/10/2026 · o lobby no estilo da imagem da noite e só o CRIAR TAMPINHA

A pedido, com a imagem da tela inicial no pôr do sol: *"reformule o jogo neste estilo, tire todas skins, deixe apenas o criar
skins por enquanto"*. A partida, a física, os controles e a rede não mudam (o build confere: `sha256 ad9f1d2216409b0e`); cada
botão abre o que já abria. O backup do antes: a etiqueta git `antes-v101` (a v100).

- **A ARTE NOVA, DESENHADA EM CÓDIGO** (`tools/v101/arte`: `cena.py`, `sprite.py`, `oficina.py` e `arte.py`, que gera tudo):
  o fundo da tela inicial — a quadra da quebrada no pôr do sol: o céu do roxo ao laranja, o morro com o Cristo em silhueta e o
  sol atrás, a favela acesa (centenas de janelinhas), as palmeiras, os postes e os fios, o refletor aceso, o muro com o grafite
  **RACHA** roxo e rosa (a coroa dourada e os escorridos), o **BAR DO SEU ZÉ** com a bandeira do Brasil, a galera e a moto, a
  trave, a bola e a quadra de asfalto molhado refletindo as luzes —, o fundo das telas (a mesma cena, desfocada e escura), os
  **ícones com volume** (os 22 de sempre e mais 5: o martelo e a chave da OFICINA, a bola, as setas de trocar, o sinal e a
  pessoa) e a planta do campo do cartão da OFICINA. Nenhum pixel da imagem enviada entra (a v95 pediu "sem cara de IA"): dela
  vieram a arrumação, as cores e o que aparece na cena (ver o `PROVENIENCIA.md`).
- **O LOBBY DA IMAGEM** (`tools/v101/lobby.js` e `app/public/game/v101.css`):
  - o fundo cobre a **tela toda** (sem a faixa de cima): os cartões de cima flutuam por cima da cena;
  - em cima: o **PERFIL** (a tampinha com o nível no hexágono roxo, o nome com a bandeira do aparelho, o **ID da conta** — sem
    conta, *SEM CONTA* — e a barra do XP roxa), a **PATENTE** (a insígnia, o nome, a barra e os **pontos com o troféu**), as
    moedas e as gemas com o + verde, o chat, o correio, os ajustes e o **SINAL** (as barras e o ping do servidor das salas, na
    cor da conexão; tocar abre a janela da CONEXÃO de sempre);
  - os lados: LOJA, COFRE, CLUBE e TREINO; SALAS, AMIGOS, RANKING e EVENTOS — **botões baixos de vidro** com o ícone e o nome;
    embaixo da coluna da esquerda, o **cartão dourado da OFICINA** (a coroa, o martelo e a chave e a planta do campo);
  - no meio, a **tampinha menor, em pé no chão molhado**: a luz roxa atrás, o **círculo do meio aceso** (o anel do jogo em cima
    da linha do desenho), as faíscas e o reflexo; ao lado, **as três vagas do grupo** (+): tocar cria o grupo e abre o painel
    para chamar os amigos (sem conta, o aviso de sempre); com o grupo, as vagas mostram quem está nele (a tampinha, o nome, a
    coroa do líder e o PRONTO) — no lugar do botão CRIAR GRUPO e da lista do lado da tampinha (o painel do grupo é o mesmo);
  - embaixo: o **PASSE RACHA**, as **MISSÕES** (o ponto vermelho quando tem prêmio para pegar), o **CAMPO** (o desenho do campo,
    o tamanho do time e o nome do campo, com as setas de trocar), o **MODO** (novo: a bola, RANQUEADA e a setinha — abre a mesma
    folha do JOGAR) e o **JOGAR** amarelo-laranja com a coroa no canto (a linha de baixo dele só aparece com o grupo: o PRONTO,
    o ESPERANDO O LÍDER);
  - a dica embaixo da tampinha saiu (a imagem não tem); tocar na tampinha continua abrindo o COFRE e segurar, a roda das
    favoritas;
  - em todo tamanho de tela (o celular deitado, o computador, o tablet 4:3, a tela 21:9): nada sai da tela e nenhum botão fica
    por cima de outro.
- **AS TELAS NO MESMO ESTILO**: a faixa de cima escura com o fio do pôr do sol (roxo, rosa, laranja), os painéis de vidro
  azul-noite com o contorno fino, as abas e as escolhas em vidro — **a escolhida no roxo do neon** (a loja, o cofre, o perfil, o
  treino, o clube, os ajustes, o chat e a folha do JOGAR) —, os botões com volume e a beirada fina (o amarelo fica para as
  ações: CRIAR, JOGAR RANQUEADA…) e o fundo da cena nova desfocado atrás. A Oficina também (o topo, o menu, os cartões e a
  escolhida no roxo). O perfil ganha a tampinha com a luz e o anel aceso.
- **SÓ O CRIAR TAMPINHA, POR ENQUANTO** (`tools/v101/semskins.js`): as **tampinhas prontas** saíram de cena — os modelos prontos
  do editor (a aba MODELOS PRONTOS), as 14 animadas prontas (CRIA, CRISTO, PITBULL…), a dos FUNDADORES, as da conta e as
  exclusivas do passe, dos eventos e do ranking (88 desenhos). Fica o **editor** (COFRE › CRIAR TAMPINHA: as peças — inclusive
  as caras e as bordas animadas, que são peças de criar —, as cores, as salvas criadas) e a **inicial** (roxo, branco e laranja).
  - **Nada é apagado.** Quem estava com uma pronta aparece com a inicial — para todo mundo: é a inicial que vai para o servidor
    — e vê um aviso uma vez (CRIE A SUA TAMPINHA, com o CRIAR AGORA); a pronta fica guardada (no aparelho e na conta) e volta
    sozinha se as prontas voltarem.
  - As prontas de outros jogadores (online, no chat, no grupo, no replay, no fim da partida, na Oficina) aparecem como a
    inicial na cor do time; equipar uma pronta (a roda, um código colado, o cartão da conta) diz para criar a sua; na LOJA, a
    categoria TAMPINHAS fica com as peças do editor; no passe, nos eventos, no correio e no TOP 3 do ranking, uma tampinha
    pronta aparece como a marca **?**; no cofre, o aviso *as tampinhas prontas saíram por enquanto*.
  - **O interruptor**: `V101_SKINS_PRONTAS = true` (no `tools/v101/semskins.js`, com o build) ou `skinsProntas: true` no
    `config.js` (sem refazer o build) trazem tudo de volta. A plataforma e o servidor não mudaram: os itens continuam nas contas.
- **Os testes**: o `tests/v101_test.py` (92 verificações: o lobby em cinco tamanhos de tela, os botões, as telas e as prontas
  escondidas, com o interruptor) entra na bateria. Os testes que conferem as tampinhas prontas (v71, v76, v80, v96_skins,
  polimento, celular e v93_itens) ligam o interruptor (`comum.SKINS_PRONTAS = True`): o que eles conferem continua existindo.
- **O que a bateria inteira achou (e foi corrigido)**, comparando com a v100 rodada de novo:
  - **no celular deitado**, os botões dos lados (84 no palco) ficavam com 35 px de verdade: agora crescem até **44 px** (o
    dedo), a coluna sobe para logo embaixo da barra de cima e a OFICINA cabe no que sobra até a fileira de baixo; os quadrados
    de cima (o chat, o correio, os ajustes) e as moedas/gemas ficam com 30 px e **as vagas do grupo, com 46 px**; no tablet
    4:3 (o palco encolhe para 0,68) os quadrados de cima crescem até os 44 px (no computador, as medidas da imagem não mudam);
  - os nomes dos botões dos lados na letra 28 (com 30, o RANKING e o EVENTOS ficavam no limite e cortavam com reticências);
  - o **JOGAR do grupo**: o PRONTO na letra menor (cabe inteiro) e **verde** quando a pessoa está pronta; com a etiqueta em cima
    (ESPERANDO O LÍDER…), a coroa do canto sai;
  - o **RANKING**: a aba escolhida voltou a ter a cor da categoria (estava igual às outras);
  - o **verde do confirmar** (CRIAR SALA, CRIAR GRÁTIS) mais escuro: o branco em cima com 4,4:1 de contraste (estava 2,8:1); o
    amarelo e o azul dos botões nos tons da v95/v91 no meio do degradê;
  - o **JOGAR a 22 da borda** em toda tela (nas telas estreitas sobravam 3 px do arredondamento);
  - **em pé** (a janela estreita do computador; o celular em pé pede para girar): sem a ilustração e a coroa da OFICINA e sem o
    nome do campo e as setas (estouravam os cartões); a bandeira emoji do perfil maior;
  - o **piso do texto** (os 12 px de verdade da v70): a legenda dos botões dos lados voltava miúda 1,5 s depois de abrir — o
    `lobby.js` antigo apagava o piso ao ajustar as legendas; agora ele deixa as que o piso aumentou (e o piso roda de novo
    quando o lobby se rearruma, deitado ⇄ em pé);
  - os testes antigos que mediam o desenho de antes conferem o da v101: o JOGAR de 140 e o MODO novo colado nele (eram 154 e
    126), as vagas no lugar do CRIAR GRUPO, a OFICINA embaixo do TREINO, o vidro no lugar da placa de beirada grossa, o VOLTAR
    com o contorno fino, os 27 ícones do sprite, o sinal depois dos ajustes, a barra de cima como o limite da tampinha e o MODO
    novo como o vizinho do JOGAR no controle;
  - o `tests/roda_tudo.sh` não cai mais no `BrokenPipeError` do build (a saída inteira numa variável; se o build falhar, para).
- **Para publicar pelo GitHub** (o `racha-online`: a `main` com o projeto inteiro e a `gh-pages` com o jogo):
  - as **migrações do banco** (`app/db/migrations/*.sql`) entram no git e no ZIP — o `app/.gitignore` as deixava de fora e o
    deploy da VPS (`deploy/migracoes.conf`) precisa delas; o `tools/v92/pacote.py` confere;
  - o **GitHub Actions** (`.github/workflows/deploy.yml`) monta o jogo sem o `| head` (o mesmo `BrokenPipeError`: a página
    dos testes no navegador nem era gerada) e o build não precisa mais do PIL (o tamanho do WebP vem do cabeçalho; o
    resultado é o mesmo byte a byte, conferido com `python3 -S`, só com a biblioteca padrão).
  - Continuam como na v100 (e não são da v101): o `v82` (as 20 verificações que esperam as regras de antes da revisão de
    segurança), o `v92` e o `v92_celular` (o perfil A ⇄ B mudou de nome na v94), o `v71` na sala (o *Só chutar* cortado em
    1280 × 720, desde a v99) e os que dependem do relógio — da rede de mentira (`v92_db_online`, `v94_online`, `v96_online`)
    ou do navegador gravar antes de recarregar (`enxuto`: *continua ligado ao reabrir*, que já falhava às vezes desde a v92) —,
    que às vezes passam e às vezes não.

## v100 — 30/10/2026 · a revisão de segurança (antes do lançamento no Android)

A pedido: a revisão completa de segurança (o login, o multiplayer, as patentes e a progressão, a proteção do projeto e a
organização do código), corrigindo o que existe de verdade **sem mudar a jogabilidade, a física, os controles, os menus nem
tirar funcionalidade**. Cada problema foi reproduzido antes de corrigir (na plataforma de teste, com o código de verdade de
`app/api` e o servidor das salas) e ganhou teste. O relatório completo (o que foi achado, a gravidade, o que é teórico, o que
falta fazer no servidor e no APK) foi entregue à parte e **não fica no repositório**. O backup do antes: a etiqueta git
`antes-seguranca-v100` (a v99). A física oficial é a mesma (sha256 ad9f1d2216409b0e).

- **O selo do resultado online vale uma vez só.** A plataforma aceitava a mesma assinatura escrita de outro jeito, e a trava
  de "resultado já usado" olhava o texto que o aparelho mandou: o mesmo resultado podia entrar de novo (patente, XP, moedas e
  o ranking). Agora a assinatura só vale na escrita exata (`app/api/lib/selo.ts` e `server/banco.js`), a trava olha o corpo
  assinado e a patente anda uma vez por selo — duas barreiras independentes.
- **A patente online e o ranking da temporada só contam partida contra gente.** O servidor das salas marca no selo (`o: 1`)
  quando havia contas de gente em pelo menos dois times na saída de bola; a ranqueada que a fila completou com bots do outro
  lado vale como uma partida online comum (o XP de sempre, com os tetos do dia), sem mexer na patente nem no ranking.
- **Os limites de tentativa pelo endereço certo.** O endereço de quem pede vinha do começo do `X-Forwarded-For`, que o
  próprio cliente escreve — trocando-o a cada tentativa, os limites por IP (senha do jogo, RACHA CONTROL, cadastro,
  recuperação, salas) não seguravam ninguém. `server/ip.js`: só valem os endereços que um proxy **nosso** acrescentou (o
  próprio computador, a rede interna ou os de `RACHA_PROXIES`, com prefixos IPv4 e IPv6; `RACHA_PROXIES=nenhum` com o
  servidor exposto direto); os endereços da **Cloudflare** contam como proxy dentro da lista e o `CF-Connecting-IP` vale
  depois dela (no Render, cada jogador com o próprio endereço); o IPv6 conta pelo bloco /64.
- **As tentativas erradas de cada conta**, de qualquer endereço (pelo número da conta: o usuário e o e-mail juntos): 10
  senhas erradas em 15 minutos e a conta espera (no RACHA CONTROL, 5); enquanto espera, nem a senha certa entra — a não ser
  de um endereço que já entrou nesta conta (quem tenta adivinhar não tranca o dono fora).
- **Os contadores e a trava do selo são atômicos**: o banco soma só enquanto não chegou no máximo e o selo é consumido com
  uma linha única — pedidos ao mesmo tempo não passam mais todos juntos.
- **O convite com outro servidor pergunta antes.** O link com `?servidor=` trocava de servidor sozinho, guardava a troca e
  mandava junto o bilhete da conta (que abre as salas como a conta). Agora aparece **OUTRO SERVIDOR** (FICAR AQUI ou TROCAR
  DE SERVIDOR; quando o servidor não é do RACHA, o aviso de que a conta não vai junto) e o bilhete só vai para o servidor do
  jogo: o mesmo endereço da página, o `RACHA_CONFIG.servidor` e os de `RACHA_CONFIG.servidoresConfiaveis` (novo, opcional).
  O bilhete vale 15 minutos (eram 30); o jogo continua pedindo outro a cada 9. O jogo tira a conta de **qualquer** mensagem
  que vá para outro servidor (a troca de amigos, bloqueios e cosméticos também levava o bilhete), a entrada no Chat do Brasil
  leva o bilhete (só para o servidor do jogo) e, antes de se apresentar, o jogo pede um bilhete novo se o dele passou de 10
  minutos (o celular que volta do segundo plano volta com a conta).
- **A sessão da conta**: o cookie sai com `Secure` quando o pedido chegou por https (o proxy diz no `X-Forwarded-Proto`, ou
  `RACHA_COOKIE_SEGURO=1`); a sessão do jogo renova com o uso, mas no máximo 90 dias depois do login (depois, entra de novo).
- **As salas**: o token do aparelho de quem saiu da conta não abre mais a conta (sem a sessão ou o bilhete, entra como
  visitante); a conta suspensa, banida ou excluída no RACHA CONTROL cai das salas na hora e o bilhete assinado antes da
  punição não abre as salas nem o Chat do Brasil (a conta liberada volta na hora, com o bilhete novo); o limite de conexões
  abertas (`RACHA_CONEXOES_IP`, 256 por endereço; `RACHA_CONEXOES`, 5000 no total) e o prazo para a conexão se apresentar
  (`RACHA_PRAZO_HELLO_MS`, 30 s); os comandos da partida antiga (`auto_*`) com ritmo; o `/health` sem a pasta do disco; o
  nome e a descrição do estádio do Rachão sem `<` e `>`.
- **Os cabeçalhos de proteção** na plataforma e no servidor das salas: `nosniff`, `Referrer-Policy`, CSP com
  `frame-ancestors` (o jogo só dentro de moldura do próprio endereço e dos de `RACHA_ORIGENS`/`RACHA_MOLDURAS`), `object-src`
  e `base-uri`, `Permissions-Policy` (sem câmera, microfone, localização, pagamento) e o HSTS por https.
- **O resto do login**: a busca de jogadores trata `%` e `_` como letras; o link de redefinir a senha leva o código depois do
  `#` (não vai para os registros do servidor) e a página o tira da barra de endereço (o link antigo, com `?token=`, ainda vale).
- **O pacote**: `tools/v92/pacote.py` não leva segredo, banco, chave, log nem pacote (`.env`, `*.db`/`*.sqlite`, `*.pem`,
  `*.key`, as chaves do Android `*.jks`/`*.keystore`, `*.zip` — o ZIP de testes deixado na pasta ia para dentro do oficial) e
  confere o ZIP pronto; o `.gitignore` da raiz também. Novo **`--lancamento`**: o oficial sem o presente de teste (moedas e
  gemas) — é o do lançamento (o site e o APK); o `--producao` continua com ele (o site de teste).
- **O instalador** (`deploy/instala-tudo.sh`): `DOMINIO=seu.dominio` liga o HTTPS do Caddy sozinho; sem domínio, o aviso de
  que o site fica sem criptografia (só para testar; o APK precisa de https).
- **O que o servidor precisa**: a plataforma e o servidor das salas atualizados **juntos** (o selo novo e o derrubar a conta
  são dos dois lados; com o servidor das salas antigo, a ranqueada online não mexe na patente), o `RACHA_SEGREDO_SALAS` igual
  nos dois, o domínio com https e, com um proxy fora da máquina (Cloudflare, outro balanceador), os endereços dele em
  `RACHA_PROXIES`.
- **Testes**: `tests/v100_seguranca_test.mjs` (39, com a plataforma de teste e o servidor das salas montado nela: o endereço
  de quem conecta, o selo — também 8 vezes ao mesmo tempo —, a patente só contra gente, a progressão do aparelho que não vira
  conta, os limites por IP e por conta — também 20 senhas ao mesmo tempo —, o endereço conhecido, o cookie, os 90 dias, o
  token do aparelho, o banimento derrubando e a punição tirada, o limite de conexões, o prazo do hello, os cabeçalhos, o
  `/health` e o pacote) e `tests/v100_seguranca_test.py` (25, no navegador: o convite com outro servidor, FICAR AQUI e
  TROCAR, o convite do próprio servidor, o bilhete só para o servidor do jogo em qualquer mensagem e o bilhete renovado
  antes do hello). A plataforma de teste ganhou `RACHA_TESTE_LATENCIA=1` (as consultas esperam a vez, como na rede do MySQL:
  os pedidos juntos se intercalam). O `v92_pacote` confere também o ZIP do `--lancamento`; o
  `seguranca_resultados` entrou no `tests/roda_tudo.sh`.

## v99 — 29/10/2026 · os chutes do Rachão nas salas personalizadas

A pedido: *"crie um modo com cavadinha e curva igual do Rachão que dê pra jogar nas salas personalizadas; o cara pode
escolher sem nada, com cavadinha e curva, e super chute"*. A leitura feita: a sala de **FUTEBOL** do RACHA ganha a opção
**CHUTES** com os três chutes do Rachão, cada um liga e desliga (nenhum ligado = só o chutar, como sempre); as regras são as
do Rachão, na medida do RACHA, e valem igual no servidor e no aparelho. A ranqueada, o COM CURVA e as salas sem os chutes
não mudam.

- **O CRIAR SALA**: embaixo de QUEM ENTRA, **CHUTES DO RACHÃO** (ligue quantos quiser): **CAVADINHA**, **CURVA** e **SUPER
  CHUTE**, cada um com o desenho dele e a luz de ligado; embaixo, o resumo (*Só o chutar* ou *Cavadinha e curva…*). No COM
  CURVA eles ficam travados (a curva é a dele); com um servidor antigo, travados com o aviso de que ele precisa ser
  atualizado. A escolha fica guardada com as outras regras da sala.
- **A SALA**: o sexto quadro das regras, **CHUTES** (*Só chutar*, *Cavadinha*, *Curva*, *Super*, *Cav+Curva*, *Cav+Super*,
  *Curva+Super* ou *Os três*), que o árbitro troca nas setas como os outros; os chutes ligados aparecem na linha embaixo do
  nome da sala; na lista das salas, a etiqueta **CHUTES** (com os nomes no título).
- **NA PARTIDA**, só os botões dos chutes que a sala ligou, no HUD de sempre (o editor arrasta, os moldes e os layouts
  guardam): **CAVADINHA** (um toque arma, outro desarma: o próximo chute — PASSE, CHUTE ou SUPER — sai com 70% da força para
  a frente e sobe 2,45 tampinhas, por cima de quem está na frente; a bola no ar que chega na tampinha vira **cabeçada**),
  **CURVA ↶** e **CURVA ↷** (armam o próximo chute girando para o lado; o mesmo de novo desarma) e **SUPER** (segure para
  carregar — 0,75 s até o cheio — e solte com a bola no pé: de 0,6 a 2,2 vezes o CHUTE, passando do teto da bola de sempre e,
  bem carregado, **pegando fogo**; se a bola ainda não estiver no pé ao soltar, ele espera 8 passos por ela; carregando, o
  PASSE e o CHUTE esperam; um super em cima do outro não passa do teto do super cheio; o toque que o sistema cancela — o
  celular tira o dedo, a janela perde o foco — não chuta: a carga cai, como na CURVA). As teclas: **Q**, **Z**, **X** e **V**
  (Ajustes › Controles › Teclado troca; quem já usava uma delas em outra ação continua com ela, e a ação nova fica sem tecla
  até ele escolher uma). O botão armado
  acende; o super mostra a carga no botão e em volta da tampinha. Em cima de cada tampinha, o que ela armou (o arco da
  cavadinha, a seta da curva) — você vê o que o outro vai fazer.
- **A BOLA NO ALTO**: a sombra fica no chão e a bola sobe na tela (e cresce um pouco); o **TRAVESSÃO** segura a bola que chega
  alta nele vindo do campo — ela bate na boca do gol e volta, não é gol; a que passa por baixo dele é gol, mesmo subindo acima
  dele já dentro (nenhuma bola fica presa no gol). Acima da altura da tampinha a bola passa por cima de todo mundo (nem bate,
  nem conta como toque de ninguém) e acima do alcance ninguém chuta. O som do travessão e o do quique; o fogo do super é um
  rastro atrás da bola. Nas três primeiras partidas com os chutes, depois do 3, 2, 1, o **cartão de como joga** (um toque
  fecha), no maior vão livre embaixo da pausa e do placar, sem cobrir nenhum botão (no celular deitado, a dica curta).
- **O SERVIDOR DAS SALAS** (`server/partida/nucleo.js`, a parte v99; `sala.js`, `bot.js` e `turma.js`): a física dos chutes
  mora no **núcleo**, o mesmo arquivo que o servidor roda e que o jogo usa na previsão. As medidas do Rachão (o jogador de 15
  px de lá) viram as do RACHA multiplicando pelo tamanho da tampinha (o tempo é o mesmo: 60 passos por segundo). Os toques vão
  no comando de cada passo como **contadores** (um toque nunca se perde com um comando perdido; o super cancelado também é um
  contador, e o último lado da curva tocado decide a ordem quando o servidor junta comandos) e o super segurado como um bit;
  num buraco curto da internet, o super carregando continua segurado (só o comando que solta solta; o silêncio de 350 ms zera
  sem chutar), e os comandos que a fila recupera (v96) carregam o super como no aparelho. O quadro leva a bola no alto e o
  estado de cada um. Os **bots** usam os três: a cavadinha quando tem
  alguém no caminho, a curva às vezes no chute ao gol e o super no chute de longe. A sala com os chutes roda no motor das
  salas de sempre (o motor próprio da v94 não tem os chutes); a ranqueada e a sala com mapa da Oficina nunca têm.
- **A PÁGINA ANTIGA** não vê as salas com os chutes na lista nem entra pelo código (o aviso para recarregar); com alguém de
  página antiga na sala, ligar os chutes é recusado com o nome de quem precisa recarregar; a página antiga do mesmo perfil
  (outra aba, o app guardado) também não volta para a partida com os chutes — nem para a do Rachão —: sai como quem caiu (o
  lugar fica guardado 90 s para a página nova) e recebe o aviso. A sala que recebe um mapa da Oficina perde os chutes (a
  partida é a do mapa). O hello diz **cr: 1** nos dois sentidos.
- **A SALA NESTE APARELHO** (sem servidor, a demonstração) também tem os chutes: a partida roda no **motor das salas do
  servidor** colado na página (`window.RachaSalaLocal`: `server/partida/fisica.js`, `bot.js` e `sala.js`) e o jogo entra
  nela como numa sala online — o que se testa sem servidor é exatamente o que o servidor roda. O 3, 2, 1, a pausa e o
  ENCERRAR do árbitro (você) e o JOGAR DE NOVO funcionam.
- **Testes**: `tests/v99_chutes_test.mjs` (94: o núcleo; a física no motor — por cima de quem está na frente, a cabeçada, as
  duas curvas, o super com o teto, o fogo e a espera, o travessão e a cavadinha de 20 a 240 px do gol (nenhuma presa); os
  contadores, os valores estranhos, o buraco da internet, o super cancelado, a curva dos dois lados num comando, a fila
  recuperada, a volta e a saída; os bots usando os três em partidas inteiras; **a previsão do aparelho com o código do jogo
  num vm igual ao servidor em cada passo**, sem atraso e com 4 passos de atraso, em 9 jogadas; **as salas sem os chutes
  iguais às da v98 quadro por quadro**; o servidor de verdade por WebSocket, com a página antiga pela outra aba e o mapa da
  Oficina) e `tests/v99_chutes_online_test.py` (48, com o servidor e duas sessões: o CRIAR SALA, a sala, a lista, a partida
  nas duas telas, o super com fogo, a rodada sem os chutes, os moldes, o editor, as teclas — e as guardadas antes —, o toque
  cancelado e a sala neste aparelho). O pacote confere os arquivos novos e o `v92_pacote` cria uma sala com os
  chutes no servidor de cada ZIP. A física oficial do RACHA é a mesma (sha256 ad9f1d2216409b0e).
- Para os chutes valerem online, o **servidor das salas precisa ser atualizado** junto com o jogo.

## v98 — 29/10/2026 · o RACHA e o Rachão separados na Oficina e as salas online do Rachão

A pedido: *"deixe separado o RACHA e o Rachão, os caras podem escolher criar modo RACHA ou Rachão, porém dá pra criar sala de
Rachão também online"*. A leitura feita: os dois jogos como dois modos da Oficina, cada um com as suas abas, o CRIAR
perguntando qual dos dois, e o Rachão com sala online de verdade (a partida no servidor das salas, cada um no seu aparelho).
A física misturada da v97 continua como opção dentro de cada editor.

- **OS DOIS MODOS DA OFICINA**: a chave **RACHA | RACHÃO** no topo da central (com a tampinha e a bola desenhadas). No
  **RACHA**, as abas dos mapas de sempre (Meus mapas, Em desenvolvimento, Comunidade, Populares, Recentes, Favoritos,
  Oficiais, Compartilhados e a Moderação de quem modera) e a busca; no **RACHÃO**, os **Estádios** (a placa com JOGAR O
  RACHÃO, SALA ONLINE, CRIAR ESTÁDIO e COLAR CÓDIGO, e os seus estádios) e as **Salas online**. O modo fica guardado no
  aparelho (a Oficina abre no último). O **CRIAR** pergunta *"O que você quer criar?"*: **Mapa do RACHA** (o criar mapa de
  sempre, do zero ou de um modelo) ou **Estádio do Rachão** (a oficina de estádios no "Começar de onde?"), com o do modo de
  agora marcado; escolher um leva para o modo dele.
- **A ABA SALAS ONLINE** (modo RACHÃO): **CRIAR SALA**, **ENTRAR COM CÓDIGO** e a lista das salas abertas do Rachão (o nome,
  o campo, o modo e as vagas; ENTRAR). Na lista do GALERA, a sala do Rachão aparece com a etiqueta **RACHÃO**.
- **A TELA SALA ONLINE** é a preparação do próprio Rachão (os botões de sempre dele): o **campo** (os 17, com a miniatura, os
  seus estádios com o selo Seu e o Criar o seu), o **tamanho dos times** (1x1 a 7x7), **Partida** ou **Caos** (com poderes), o
  **nível dos bots**, o **tempo**, os **gols**, a **corrida**, os **chutes extras**, as **vagas vazias** (os bots completam ou
  só gente: cada time precisa de uma pessoa) e a sala **aberta** ou **fechada** — e, em cima, o **ENTRAR COM O CÓDIGO** (6
  letras; minúsculas viram maiúsculas). A tela inicial do Rachão, dentro da Oficina, ganha a placa **Jogar online**.
- **A SALA** (a tela da sala da Oficina): **Vermelho × Azul**, a linha do Rachão (o campo, o modo, o tamanho, o tempo ou os
  gols, aberta ou fechada) e o chat de sempre. O **admin** tem os **AJUSTES** (a mesma tela do Rachão, com o que a sala tem
  agora; vale da próxima partida), passa o admin, muda quem joga em cada lugar, manda para o banco e **ENCERRA** (não vale
  para a sala). Se o estádio da sala não é um dos estádios do admin (ele herdou a sala, ou mudou o estádio depois), os
  AJUSTES mostram o estádio **Da sala**, só nessa tela, sem guardar nos estádios dele.
- **A PARTIDA**: o **COMEÇAR** abre o Rachão por cima da Oficina nos aparelhos de todos, com a contagem **3, 2, 1** do
  servidor. Desenho, sons, botões, placar e a faixa do GOL! são os do Rachão; o nome de quem joga aparece embaixo da tampinha
  (a sua tem a setinha de sempre); quem **assiste** vê *Assistindo* e não tem os botões. Fechar no meio volta para a sala com
  o **VOLTAR PARA A PARTIDA**; caiu a internet, a Oficina volta sozinha e a partida reabre no mesmo lugar. No fim, a tela do
  Rachão com o resultado do servidor (Vitória, Derrota ou quem venceu, quem fez os gols), o **VOLTAR PARA A SALA** e o
  **SAIR DA SALA**; a sala mostra a "Última".
- **O SERVIDOR DAS SALAS JOGA A PARTIDA** (`server/partida/rachao.js`): o motor do Rachão no servidor
  (`server/partida/rachao_motor.js`) é **gerado da página do Rachão** pelo build (`tools/v98/rachao_servidor.py`), sem mudar
  uma letra — a física, os 17 campos, os bots, o Caos com os poderes e os estádios da Oficina de estádios. Ninguém é
  anfitrião: o relógio de 60 passos por segundo é o das salas, o quadro sai 30 vezes por segundo
  (`app/public/game/rachao/quadro.js`, o mesmo nos dois lados) e cada aparelho manda o comando de cada passo. A fila de
  cada um anda um comando por passo, segue com o último por até 4 passos quando falta comando (o palpite) e para a tampinha
  depois de 350 ms sem nada; os toques (chutar, cavadinha, curva, super chute e poder) vão como contadores, para nenhum se
  perder com um pacote perdido; mais de 120 comandos por segundo são ignorados e anotados. Quem cai vira bot na hora e volta
  para o mesmo lugar; o gol de ouro da prorrogação vai até 3 min (depois, empate) e nenhuma partida passa de 45 min.
- **A PREVISÃO NO APARELHO** (`app/public/game/rachao/rede.js`): o aparelho joga a própria tampinha e a bola com o mesmo
  motor na hora do toque; a cada quadro, põe o do servidor, refaz os comandos que ele ainda não usou e suaviza a diferença
  (medido: o aparelho e o servidor dão o mesmo número até 0,05 px em 5 campos). Sem quadro por 0,6 s, a previsão para e o
  placar diz *Reconectando…*.
- **SEGURANÇA**: a página do Rachão continua **sem conexão nenhuma** (a trava de conteúdo com `connect-src 'none'`): a
  conexão é a do RACHA, e a Oficina passa as mensagens à moldura (só do mesmo endereço, conferido nos dois lados). No
  servidor, tudo o que chega é conferido: o campo existe; o estádio passa pela mesma limpeza da Oficina de estádios (os
  limites de cada número e das peças, até 24 mil letras) e o nome e a descrição pelo filtro do chat; as opções só nos
  valores que existem; o comando com a direção até 1, só 3 botões e os contadores inteiros; os nomes sem caracteres de
  controle. O aparelho com a página antiga (sem as salas do Rachão) não vê essas salas na lista e, pelo código, recebe o
  aviso para recarregar.
- **Revisado por um segundo par de olhos** antes de sair (a segurança do servidor e da conversa entre as páginas): a
  **saída não trava** — quem tem a saída e está parado (a aba escondida, a moldura fechada) segurava a partida para sempre;
  agora, em 8 s sem ninguém tocar na bola, ela fica livre (como nas salas de sempre), e nenhuma partida passa de 1 hora no
  relógio do servidor; os **gols e os passes são da pessoa** (trocar de lugar ou cair não leva os gols para quem ficou no
  lugar, e o bot que segurou o lugar tem os dele); a sala do Rachão **não pausa** nem vira **copa** (a tela dele não tem a
  pausa da sala e a copa não andaria); **VOLTAR PARA A PARTIDA continua a contagem dos comandos** (antes, nos primeiros
  segundos, o servidor jogava fora os comandos de quem voltava); a mensagem escondida do árbitro do jogo de sempre (ARB:) não
  aparece mais na partida; e o aparelho ignora o quadro fora do formato inteiro (nada pela metade), limita os sons e as
  partículas guardados com a aba escondida e só aceita número de verdade nos comandos.
- **PARA O ONLINE DO RACHÃO FUNCIONAR, O SERVIDOR DAS SALAS PRECISA SER ATUALIZADO** (o `server/` desta versão). O servidor
  novo diz no hello que tem as salas do Rachão; com o antigo, a aba Salas online e o CRIAR SALA explicam que ele precisa ser
  atualizado (sem criar uma sala comum no lugar). A versão de demonstração (sem servidor) explica que o online precisa do
  servidor das salas, e o resto do Rachão funciona.

**Testes:** `tests/v98_rachao_servidor_test.mjs` (90 verificações, Node: o motor do servidor igual ao da página, o campo e o
estádio que chegam (o sujo sai limpo, o grande demais é recusado), as opções, a fila de comandos — um passo por comando, o
palpite, o atrasado pulado, o silêncio, o excesso, o comando conferido e os toques que não se perdem —, o quadro e a previsão
do aparelho iguais ao servidor, a queda com o bot e a volta, o admin trocando lugares no meio, o fim por gols, por tempo e
pela prorrogação, a saída que fica livre, os gols da pessoa, o quadro quebrado, partidas inteiras de bots nos 17 campos e
no Caos, e a sala pela rede com dois aparelhos e um antigo, sem pausa nem copa) e
`tests/v98_rachao_online_test.py` (53 verificações, no navegador com o servidor de verdade e três sessões: os dois modos, o
CRIAR, a SALA ONLINE (e o servidor antigo), a lista, o código, os AJUSTES, a contagem, os nomes, a previsão, o fechar e voltar
(com os comandos valendo na hora), o chat na partida, a queda, os gols e o fim de cada um, a sala com um estádio de quem cria
e o admin que herdou a sala, a demonstração sem servidor e as telas no celular). O `tests/v97_rachao_test.py` confere a chave dos modos e a placa nova; o `tools/v92/pacote.py` confere os arquivos
das salas do Rachão no ZIP, e o `tests/v92_pacote_test.py` cria uma sala do Rachão no servidor de cada ZIP e recebe os quadros.

## v97 (depois do teste) — 29/10/2026 · os chutes do estádio e a física misturada entre o RACHA e o Rachão

Depois de testar: *"faltou pôr o modo sem cavadinha, sem curva, sem super chute, e quero no mesmo editor"* e *"dá pra
mesclar, por exemplo, física da bola do Rachão no RACHA, ao contrário também — quero algo bem feito junto"*. Na pergunta, a
escolha: **no editor do estádio** (a regra dos chutes no editor de estádios; a mistura nos dois editores).

- **A ABA CHUTES** no editor de estádios (depois da Física): a **cavadinha**, a **curva** e o **super chute** ligam e
  desligam, e **SÓ O CHUTAR** tira os três de uma vez (o modo clássico). O estádio leva a regra para todo modo jogado nele:
  o chute desligado some da partida (o botão sai da tela), os bots também não usam, a preparação da partida mostra a opção
  travada (riscada) com a explicação e o cartão do estádio diz SÓ O CHUTAR (ou "Sem cavadinha e curva"). O TESTAR respeita.
- **A PONTE DA FÍSICA** (`app/public/game/rachao/ponte.js`, a mesma nas duas páginas): os dois jogos são de discos a 60
  passos por segundo, mas com medidas e contas diferentes. A ponte traduz pelo **comportamento**, medido pelo tamanho do
  jogador: o tamanho da bola, o peso dela no contato, o quique no pé, na parede, na trave e na rede, até onde ela rola, o
  teto de velocidade; a velocidade máxima do jogador, o caminho que ele perde arrancando e o que ainda anda depois de soltar;
  a velocidade que a bola ganha no chute e a folga do alcance. Cada parte vai sozinha (a bola mais pesada não deixa o chute
  mais fraco: a força acompanha) e a ponte reconhece de quem é cada parte (do RACHA, do Rachão ou ajustada).
- **NO RACHÃO: MISTURAR COM O RACHA** (aba Física do editor de estádios): **Bola**, **Jogador** e **Chute**, cada um
  [Rachão | RACHA], com a frase do que muda. Para caber a física do RACHA, o motor do Rachão ganhou ganchos pequenos (que
  nos 17 campos não fazem nada): a **velocidade máxima da bola**, o **peso no contato** e o **quique no pé** (só entre bola e
  jogador: o chute não muda) e o **jeito de andar direto** (soma a velocidade até a máxima e, soltou, freia — a tampinha),
  com os bots sabendo andar assim e o sabão e o mergulho do goleiro continuando a funcionar. A aba ganhou os controles
  disso: o **jeito de andar** (com embalo ou direto, e no direto a velocidade máxima, a arrancada e o freio ao soltar), a
  velocidade máxima da bola, o quique no pé e o peso no contato (com o "automático") e o quique no fundo da rede.
- **NO RACHA: MISTURAR COM O RACHÃO** na física do mapa (aba Física do editor da Oficina) e na **física da sala** (CRIAR
  SALA e os AJUSTES do admin): **Bola**, **Tampinha** e **Chute**, cada um [RACHA | Rachão]. A física vira Personalizada
  com os números nos limites do servidor; o resumo da sala diz "bola do Rachão" (ou "a do Rachão", com as três). Vale só na
  Oficina: a ranqueada e as salas comuns continuam com a física oficial (o build confere: `sha256 ad9f1d2216409b0e`).
- **O SERVIDOR DAS SALAS**: a arrancada da tampinha (o extra `acelJog` do mapa, `server/partida/mapa.js`) agora vai até
  **0,02** (era 0,05), para a tampinha com o embalo do Rachão chegar na máxima devagar como o jogador de lá. Para valer
  igual nas salas online, o servidor das salas precisa ser atualizado; o antigo corta em 0,05 (a sala fica um pouco mais
  arrancada, igual para todos — o aparelho joga com o mapa que o servidor manda).

- **Revisado por um segundo par de olhos** antes de sair: a leveza da bola (que também muda o super chute e a cavadinha)
  ficou com o CHUTE, e a bola só mexe no peso do contato; o cartão do misturar se refaz quando um número muda (e o botão
  aceso refaz a parte); a decisão do "automático" do quique no pé segue o passo do controle (aplicar duas vezes dá o
  mesmo); a trava da preparação no Treino só vale no Livre (a finalização e o goleiro são no Clássico); o "padrão" da
  velocidade do andar direto é a do embalo de agora; a lama freia também no andar direto; o tamanho mínimo da bola continua
  6 (menor, a bola rápida atravessava a parede); e a aceleração da tampinha na Oficina do RACHA vai de 0,02 a 1 de 0,01 em
  0,01 (antes o deslizante não chegava no 1).

**Testes:** `tests/v97_mistura_test.mjs` (32 verificações, sem navegador, com os dois motores: cada mistura **jogada** — a
bola do RACHA no Rachão rola, quica, para no teto e sai do pé igual no RACHA, e a do Rachão no RACHA igual no Rachão; o
jogador e o chute também; **uma parte não mexe nas outras**, medido nos motores partindo de seis físicas do Rachão (o
Clássico, a bola de praia, a pesada, o gelo, o quica tudo e a Lua) e das cinco do RACHA; o que a ponte escreve fica nos
limites do servidor em 400 físicas sorteadas; o estádio só com o Chutar em 1 minuto de bots não tem nenhum chute por cima,
com curva ou super; o Rachão todo com a física do RACHA em Contra bots e Caos de 90 s; o estádio guarda tudo; e as **102
partidas dos 17 campos** — Contra bots, Caos, bate-bola, 2 jogadores e os treinos, com os bots e um roteiro de comandos —
dão **o mesmo número por número** no motor original e no da página). No `tests/v97_rachao_test.py`, a aba CHUTES, o TESTAR,
a preparação travada (e não travada no treino de finalização), o MISTURAR das duas Oficinas e o cartão que não fica velho
(79 verificações); o `tests/v97_estadios_test.mjs` sorteia também os números novos e os chutes. O `tools/v92/pacote.py`
confere a ponte no ZIP.

## v97 — 29/10/2026 · o RACHÃO na Oficina, com a oficina de estádios

A pedido, com o arquivo `rachao.html`: *"adicione esse rachão na oficina de criação com várias opções de edição"* — e, na
pergunta de como ele entraria, a escolha **do jeito dele**: o Rachão com o motor dele (a física, os 17 campos e os 8 modos do
arquivo), um editor de estádios com várias opções e jogar contra bots ou em 2, **sem online**. O RACHA não muda: a física
oficial é a mesma (o build confere: `sha256 ad9f1d2216409b0e`), e o servidor e a plataforma não mudam.

- **A ABA RACHÃO NA OFICINA** (`tools/oficina/rachao.js`, colado com a Oficina; o estilo no fim do `oficina.css`): a central
  ganha a aba **Rachão** (a terceira, depois de Meus mapas e Em desenvolvimento), com a placa de entrada na cara do Rachão (a
  parede amarela, a faixa verde e o letreiro com a sombra vermelha; o campinho desenhado em SVG aqui) — **JOGAR O RACHÃO**,
  **CRIAR ESTÁDIO** e **COLAR CÓDIGO** — e os **estádios deste aparelho** (a miniatura, o nome, quantas peças, **EDITAR** e
  **JOGAR**). O Rachão abre **por cima da Oficina**, numa moldura do mesmo endereço (`game/rachao/rachao.html?na=oficina`):
  a Oficina pede a tela pela âncora (`#inicio`, `#estadios`, `#novo`, `#importar`, `#editar=ID`, `#jogar=ID`) e o Rachão
  avisa quando está pronto, quando os estádios mudam e quando a pessoa volta (postMessage, só dessa moldura e desse endereço).
  Quem veio da Oficina volta para ela pelo **‹** (do editor, da lista ou da preparação da partida) e pelo **VOLTAR PARA A
  OFICINA** da tela inicial do Rachão; o Esc fora da moldura também fecha. Com o Rachão aberto, o **celular pode ficar em pé**
  (o Rachão foi feito assim; o GIRE O CELULAR volta a valer quando ele fecha). Se um navegador não deixar abrir a moldura, a
  Oficina oferece abrir o Rachão nesta aba (com o voltar para o RACHA).
- **A PÁGINA DO RACHÃO** (`tools/v97/rachao.py`, etapa `v97/v97` do build): o arquivo enviado fica guardado como chegou em
  `backup/rachao.html` (o sha256 é conferido) e a página é gerada dele com poucas trocas: as **fontes do pacote** (a Lilita
  One no lugar da Bungee e a Barlow Condensed no lugar da Semi Condensed, licença OFL — nada do Google Fonts), a **trava da
  página** (Content-Security-Policy: só o próprio endereço, nenhuma conexão para fora; o Rachão roda inteiro no aparelho), a
  oficina de estádios ao lado (`estadios.js` e `estadios.css`) e **quatro ganchos pequenos no motor**, que com os 17 campos
  deixam tudo igual: a cerca viva pode ficar inclinada; o vento lê as direções, a troca e a força do estádio; os poderes
  leem a lista e o intervalo do estádio; o gol do Golzão não passa do tamanho do estádio.
- **A OFICINA DE ESTÁDIOS** (`app/public/game/rachao/estadios.js` e `.css`, no visual do Rachão): a placa **Oficina de
  estádios** na tela inicial dele abre **SEUS ESTÁDIOS** (até 40 no aparelho: criar **do zero ou a partir de um dos 17
  campos**, colar código, duplicar, copiar o código, apagar). O **editor** desenha o campo com o próprio motor do Rachão e tem:
  - **as peças no campo**: o **poste**, o **para-choque** (o do Fliperama, com a força do empurrão), o **vaso**, a **cerca
    viva** (comprimento, grossura e inclinação), a **lama** e a **poça** (quanto seguram a bola, a velocidade e o freio de
    quem pisa) — tocar põe, arrastar move, as bolinhas brancas esticam e giram, o APAGAR tira; o **espelho** de cada peça
    (só uma, dos dois lados, em cima e embaixo, nos 4 cantos ou do outro lado girada), o **ímã** (de 10 em 10, a linha do meio,
    o giro de 15 em 15°) e os **times** de mentira mostrando onde cada um começa; desfazer e refazer (e o teclado: Ctrl+Z,
    Ctrl+Y, Ctrl+D, Delete, as setas);
  - **Campo**: o formato (retângulo, oval ou rinque), o comprimento e a largura, os cantos (retos, redondos ou cortados, o
    tamanho e o canto que devolve a bola), o círculo do meio e a área de fora; **Gols**: a largura, o fundo da rede, a
    distância da tabela (no rinque), as traves (traves, chinelos ou bambu) e o fundo (rede, portão ou buraco no muro);
    **Piso**: os 17, cada um com a amostra desenhada pelo motor; **Física**: 11 prontas (Clássico, Quadra, Asfalto, Terra,
    Areia, Gelo, Molhado, Lua, Quica tudo, Bola de praia e Bola pesada) e 18 valores um a um (a bola, o jogador, o chute e o
    mundo), cada um com o "padrão"; **Vento**: ligado, a força, de quanto em quanto tempo muda e para onde sopra (para todo
    lado, de gol a gol, de lado ou na diagonal); **Poderes**: quais dos 10 aparecem, de quanto em quanto tempo e "também no
    Contra bots"; **Partida**: o nome, a descrição, os tamanhos de time e os gols para vencer ao escolher o estádio;
  - os **avisos** do que atrapalha o jogo (peça na boca do gol, em cima da bola do meio, o canto que encolheu para caber o
    gol), o **salvamento automático** (com a miniatura) e o **TESTAR** (bate-bola sozinho, 1x1 ou 2x2 rápido, voltando ao
    editor pela pausa) e o **JOGAR** (Contra bots, 2 jogadores ou Caos: a preparação do modo já com o estádio). Os estádios entram na lista de campos de
    **todos os modos vistos de cima** (Contra bots, Caos, 2 jogadores e o treino livre), na frente, com o selo SEU; no fim da
    lista, **CRIAR O SEU**.
  - **o código** (`RACHAO1.…`) leva o estádio para outro aparelho ou para um amigo. Tudo o que entra — do aparelho ou de um
    código colado — passa pela mesma limpeza: só os campos conhecidos, cada número no seu limite, os textos sem caracteres de
    controle, no máximo 48 peças (160 no campo), e o texto de quem joga só entra na tela como texto.
  - **os limites que o jogo precisa**: o círculo do meio nunca passa da linha do gol, o gol cabe no rinque e no oval, a
    parede nunca devolve a bola mais rápido do que ela chegou (a força da tabela desce sozinha quando a bola quica mais) e
    mexer uma peça espelhada não passa das 160 no campo. Se outra aba mexer nos estádios ao mesmo tempo, a lista junta as
    duas (vale a edição mais nova de cada estádio; o apagado continua apagado).
- **Fiel ao original**: cada um dos 17 campos, aberto no editor e montado de volta, dá o **mesmo** estádio (as paredes, as
  traves, os obstáculos, as zonas, a física e as regras — conferido no teste, campo a campo).

**Testes:** `tests/v97_rachao_test.py` (61 verificações, no navegador, servido por http como no servidor: o original e a
página gerada; as fontes e nada pedido para fora; os 17 campos de ida e volta; a limpeza de entradas ruins e o código; o
editor no celular deitado — as ferramentas, o espelho, as abas, o salvamento, o TESTAR, o JOGAR (contra bots e em 2),
recarregar, colar código, apagar e o limite; os limites — as 160 peças ao mexer, o campo que encolhe, a janela que fecha ao
trocar de tela, o círculo do meio, o Golzão, a tabela e as duas abas; as telas em 844x390 e 390x844; e a aba RACHÃO da
Oficina com o Rachão por cima, inclusive quando a Oficina fecha com ele aberto) e `tests/v97_estadios_test.mjs` (8
verificações, sem navegador, com o motor de verdade: os 17 campos de ida e volta, a limpeza com 400 entradas sorteadas, o
código de 120 estádios e 210 partidas de bots em estádios sorteados). O `tests/comum.py` ganhou o `url=` (abrir o jogo por
http), o `tools/v92/pacote.py` confere que o ZIP leva o Rachão do build e o `tests/oficina_v94_test.py` espera também o
estado da sala nos AJUSTES DA SALA (o texto da física da sala vem na mensagem da sala, que às vezes chega depois do mapa).
A bateria: 97 conjuntos, 3.883 de 3.913 verificações ok — as que falham são as de antes (v82, v92, v92_celular, a
v92_db_online de vez em quando) e a v94_online, que nesta máquina falha igual com o build da v96 (o tempo da rede de
mentira).

## v96 — 29/10/2026 · o online liso como o treino, as tampinhas animadas novas e a tampinha dos FUNDADORES

A pedido: *"deixar o online com a mesma sensação que no treino — online é tudo bugado, lag, parece pesado, bola e personagem
teleportam ou dá a sensação que teleportam; as traves: quando está perto delas realmente atravessa e dá um bug de teleporte
na trave; é muito lag, deixar a mesma sensação do treino, liso igual; crie skins animadas; skin ultra rara para os 30
primeiros players que entrarem no jogo, deve ser muito bonita essa skin; quando o jogador estiver em equipe e clicar jogar de
novo aparece se todos da equipe botaram jogar de novo, se todos não botarem em 10 segundos volta automaticamente para o
lobby; jogadores põem pronto e o dono da equipe joga"*. O último pedido já estava pronto desde a v95 (o **grupo na
ranqueada**: o PRONTO, o JOGAR do dono e o JOGAR DE NOVO com 10 s — ver abaixo, na v95). A física oficial é a mesma (o build
confere: `sha256 ad9f1d2216409b0e`): muda só o que o aparelho desenha no online, a fila de comandos do servidor das salas, as
tampinhas e a plataforma (a tampinha dos fundadores). Depois do teste, com o print dos AJUSTES › Conta: *"tire o modo conta
das configurações; quando o jogador chuta a bola, o arco ao redor tem que ser uma opacidade baixa"*.

- **A CONTA FORA DOS AJUSTES** (depois do teste; `tools/v96/conta.js`): os AJUSTES ficam com **6 abas** (Áudio, Visual,
  Controles, Câmera, Acessibilidade e Privacidade). O que era de jogo continua lá: o **Chat do Brasil** e o **Chat na tela**
  foram para **Privacidade** (em cima). O que era da conta virou a janela **SUA CONTA**, que abre pelo **selo ao lado do seu
  ID no PERFIL** ("CONTA" ou "NESTE APARELHO", agora com a setinha): o cartão da conta — ou o SEM CONTA com o ENTRAR e o
  CRIAR CONTA —, o SALVAR AGORA, o SAIR DA CONTA, o **RACHA CONTROL** (a equipe), o EXPORTAR e o IMPORTAR do progresso, o
  ZERAR PROGRESSO e o EXCLUIR MINHA CONTA. É a mesma janela por baixo, sem as abas e com o nome SUA CONTA: tudo o que pintava
  a aba Conta continua pintando, e quem chamava `ajxAbre('conta')` abre a SUA CONTA. O **Servidor do jogo** (Avançado) saiu
  da tela: o endereço vem do `config.js` ou do link `…/racha.html?servidor=ENDERECO` (o que já estava guardado no aparelho
  continua valendo). Os avisos do chat dizem Ajustes › Privacidade; o do zerar, SUA CONTA.
- **O ANEL DO CHUTE SUAVE** (depois do teste): apertou o CHUTE (ou o PASSE), o anel acende em branco com **opacidade baixa**
  (no máximo 30%, `V95S.luz`; era o branco forte da v95). Segurando fica, soltou some rápido, como antes — na partida, no
  online, no replay e na Oficina. Medido na tela: o anel clareia +33 (de 0 a 255) em vez de +110.

- **O ONLINE COM A SENSAÇÃO DO TREINO** (`tools/v96/liso.js` — o núcleo, o mesmo arquivo no jogo e nos testes do Node —,
  `tools/v96/rede.js` e `server/partida/sala.js`). Para achar a causa, o `tests/v96/rede_sim.mjs` liga o motor das salas de
  verdade à previsão do aparelho (uma cópia fiel da v92: o mundo de previsão, o rollback e o replay) por uma internet de
  mentira — o atraso do Brasil até o servidor da Virgínia, a oscilação do 4G, os apagões do rádio do celular e os engasgos do
  plano grátis do Render — e mede o que a tela desenha. O que estava acontecendo:
  1. **a correção que pulava**: quando a previsão errava (o outro mudou de direção, um chute, um apagão), a diferença sumia
     num deslize exponencial de 90 ms, que começa na velocidade máxima (50 px viravam 550 px/s: um pulo), e acima de 5 u (os
     outros), 8 u (a bola) ou 12 u (você) ia direto para o lugar novo — com ~160 ms de ida e volta, a bola e o outro jogador
     pulavam dezenas de vezes por minuto;
  2. **a saída que parecia recomeço**: a previsão passa a partida para "jogo" no seu toque da saída, antes de o servidor
     confirmar, e cada quadro do servidor que ainda dizia "saída" era tratado como o recomeço depois do gol — que põe tudo
     no lugar na hora, sem deslize;
  3. **o desenho dentro da trave**: o deslize da correção era somado ao lugar do mundo sem bater em nada — a tampinha (ou a
     bola) aparecia dentro da trave ou do outro lado da rede e voltava (o "bug de teleporte na trave");
  4. **os comandos jogados fora** (no servidor): depois de um apagão do 4G os comandos chegam todos juntos, e o servidor
     descartava os que passavam de 8 (ficavam 3) — no servidor a tampinha andava menos do que no aparelho, e o aparelho
     corrigia para trás.

  Agora: cada correção vira um **deslize com mola crítica** (a velocidade começa em zero, sem tranco, e nunca passa de um teto
  — uma fração da corrida da tampinha ou da velocidade da bola): o desenho chega no lugar certo andando. A **guarda**: nada
  desenhado anda mais que o possível num quadro (o que sobra vira deslize). A **batida**: do lugar no mundo da previsão (que
  a física já resolveu) até o lugar desenhado, em passinhos que batem nas traves, na rede e nas paredes. O **recomeço** é o do
  servidor (o quadro anterior dele não era saída e este é). E no servidor, a **recuperação**: o passo que ficou sem comando
  (o comando atrasou) vira crédito, e quando os comandos chegam juntos eles **andam** — um passo a mais só daquela tampinha
  (`passoSolo` em `server/partida/nucleo.js`, com as mesmas batidas na trave, na rede e na barreira da saída), até 30 passos
  (0,5 s), e o crédito acaba em 1,2 s (ficar parado sem mandar nada não guarda um "pique" para correr o dobro depois); só um
  apagão enorme (mais de 40 comandos) alcança de uma vez, como antes. No DB por estados (o experimental da v92: o
  PASSE + CHUTE contado comando a comando) a recuperação fica desligada (ela mudava as decisões medidas do DB). A Oficina online usa o mesmo deslize (`tools/oficina/jogo.js`, com o
  pulo direto só nos recomeços dela: o gol, a saída, a lateral, o portal, quem foi eliminado e quem voltou).
  Medido no simulador (60 s × 4 sementes; pulo = um quadro em que o desenho andou mais de 1,2 u, a bola 1,3 u; dentro = o
  desenho mais de 4 px dentro da trave ou da rede):

  | Brasil → Virgínia (~165 ms, 4G, apagões e engasgos) | antes (v95) | agora (v96) |
  |---|---|---|
  | pulos por minuto · a sua tampinha / a bola / o outro | 0,3 / 21,5 / 26,5 | 0 / 0 / 0 |
  | trancos por minuto (mais rápido que dá para correr) · sua / bola / outro | 19 / 26 / 603 | 0,3 / 0 / 0,8 |
  | quadros por minuto dentro da trave ou da rede · sua / bola / outro | 12,4 / 0,5 / 1,9 | 0 / 0 / 0 |
  | o maior pulo num quadro · bola / outro | 206 px / 138 px | 26 px / 14 px |

  Nos navegadores de verdade (`tests/v96_online_test.py`: dois jogos numa sala 1v1, ~40 s de partida pelo 4G de mentira), na
  tela da Ana: os pulos da tampinha dela, da bola e do Beto 1 / 2 / 18 → 0 / 0 / 0, os trancos dela 15 → 0 e os do Beto
  225 → 2, o Beto desenhado dentro da trave 5 quadros → 0. No 4G ruim (~200 ms, apagões mais longos): a sua tampinha dentro da trave 23,7 → 0 quadros por minuto, os pulos da bola
  16,4 → 0 e os do outro 48,3 → 0. No Wi-Fi já era quase liso; os trancos do outro jogador caíram de 96 para 0 por minuto.
  O preço: como o desenho chega andando em vez de pular, ele passa alguns pixels a mais longe do lugar exato que o servidor
  decidiu (no Brasil → Virgínia, em média: a sua tampinha 4,5 → 5,5 px, a bola 10 → 10 px, o outro 21 → 32 px) — quem decide
  o gol, a batida e o chute continua sendo o servidor, igual antes. O atraso que sobra é a distância: o Render não tem servidor
  no Brasil (a Virgínia é o mais perto) e o plano grátis divide o processador (os engasgos do servidor); um plano pago tira os
  engasgos, e um servidor em São Paulo tiraria uns 100 ms de cada ida e volta. Para comparar: `RACHA_FILA=v95` no servidor
  volta a fila de antes, e `rede96: false` no `app/public/game/config.js`, as correções de antes no aparelho. **O servidor das
  salas precisa ser atualizado junto com o jogo** (sem ele, o aparelho já desenha liso, mas os comandos do apagão continuam
  indo para o lixo no servidor).
- **AS TAMPINHAS ANIMADAS NOVAS** (`tools/v96/skins.js`, desenhadas em código como as da v76): as caras (lendárias, 100
  gemas) **PIPA NO CÉU** (a pipa dançando no vento em cima da laje, no pôr do sol), **BAILE** (a caixa de som batendo a 128
  batidas por minuto, o equalizador e os lasers), **MARÉ** (as ondas, o brilho do sol na água e o calçadão), **TEMPESTADE** (a
  chuva, os raios e o refletor do campinho), **IPÊ AMARELO** (as flores caindo) e **LAVA** (a lava correndo nas rachaduras), e
  as bordas acesas (épicas, 40 gemas) **ARCO-ÍRIS VIVO**, **OURO LÍQUIDO** e **COMETA**. Em MODELOS PRONTOS, seis tampinhas
  prontas com elas logo depois das oito da v76. Mexem na partida, no lobby e no editor; nas miniaturas ficam paradas; com
  Reduzir animações ou o Ultra leve, paradas em todo lugar; os bots não pegam. As peças novas entram no fim das listas (os
  códigos de tampinha de antes não mudam) e nada passa de 1,2 × o raio da tampinha (o aro do time e a bola ficam livres).
  E a faixa do editor: escolher a última peça (agora a LAVA e o COMETA) empurrava a tela inteira para o lado — a faixa anda
  sozinha agora (`tools/editor_rua.js`).
- **A TAMPINHA DOS FUNDADORES**, ultra rara: a cara **FUNDADOR** (o medalhão de ouro com a coroa e as pedras, os louros, a fita
  FUNDADOR, o sol de raios girando, o céu de estrelas e o brilho holográfico passando) e a borda **AURA DOS FUNDADORES** (o
  ouro respirando, os três brilhos dando a volta e o pulso de luz). Só as **30 primeiras contas que entrarem no jogo**
  ganham (`app/api/racha/fundador.ts`: o contador só sobe até 30 no mesmo UPDATE que reserva o número — duas entrando no mesmo
  instante nunca pegam o mesmo número nem passam de 30 — e o item entra no inventário na mesma transação), numeradas: na
  primeira vez, a janela **VOCÊ É UM DOS 30 PRIMEIROS!** (Fundador nº 7 de 30) com o EQUIPAR AGORA (na fila das janelas do
  lobby: não passa por cima de outra nem da primeira vez). Não está à venda (sem
  preço no catálogo, fora dos destaques e das ofertas; o editor diz por quê); no editor ela só aparece para quem tem (com o
  selo FUNDADOR); a sorteada nunca cai nela; e o **servidor das salas** sabe quem é fundador pelo bilhete assinado da conta
  (`q.fundador`) e tira as peças de quem não é (`server/fundador96.js`) — no cartão da sala, na partida e no Chat do Brasil —,
  e a plataforma não guarda a tampinha da conta nem o escudo do clube com as peças dela para quem não é (o perfil, o clube e
  o ranking mostram essas): ninguém vê a tampinha falsa, nem pelo código montado na mão. As peças são da conta: nunca ficam
  guardadas no aparelho (quem usar o aparelho depois, sem a conta, não fica com elas) e voltam equipadas quando a conta
  entra. O **ZERAR CONTAS** do Dono devolve as vagas (as contas de teste de antes do lançamento não ficam com elas; o Dono, se
  era fundador, fica com o nº 1). Conta só quem tem conta (o visitante sem conta não ganha), a partir de quando a plataforma
  desta versão estiver no ar. (Para conferir sem a plataforma: `demoFundador: true` no `config.js` de uma DEMONSTRAÇÃO deixa a
  dos fundadores com o aparelho, marcada DEMONSTRAÇÃO — o artefato de teste usa; fora da demonstração, não vale.)
- **Os testes**: `tests/v96_rede_test.mjs` (36: o deslize, a guarda, a batida, o `passoSolo`, a recuperação da fila — e o
  crédito que não vira pique guardado —, o recomeço e o simulador antes × agora no Wi-Fi, no 4G e no Brasil → Virgínia), `tests/v96_online_test.py` (11: dois
  navegadores numa sala 1v1 do servidor da turma, ligados por um 4G de mentira — 80 ms em cada sentido e um apagão de 260 ms a
  cada ~4 s —, antes e agora: os pulos, o desenho dentro da trave e da rede), `tests/v96_fundador_test.mjs` (31: o código da
  tampinha, o servidor das salas tirando as peças, 33 contas entrando ao mesmo tempo — exatamente 30 numeradas de 1 a 30 —,
  não se compra, a tampinha da conta e o escudo do clube, o bilhete e o ZERAR CONTAS) e `tests/v96_skins_test.py` (26: o
  desenho de cada peça em vários tamanhos e instantes, os lugares nas listas iguais aos do servidor, o editor sem e com a dos
  fundadores, a janela — que espera na fila do lobby —, as peças que são da conta — nunca guardadas no aparelho, saem junto com a conta e voltam com ela —, a
  partida, o custo — 8 iguais na tela, no pior caso 4,8 ms por quadro — e a faixa que não empurra a tela). O
  `tests/v76_test.py` confere as da v76 no lugar delas (as da v96 vêm depois); o `tests/servidor_test.js` troca o código de
  tampinha de mentira que usava (o `T.NOVA1234` cai justamente na borda 26, a Aura dos Fundadores — o servidor tirava); e a
  cor do modelo BAILE deixou de ser o rosa exato que o `polimento_test.py` procura (o do cristal rosa, que saiu do jogo). A bateria
  inteira (`tests/saida/logs_v96/` e, os que rodaram de novo depois das últimas mudanças, `tests/saida/logs_v96_re/`): **94
  conjuntos, 3.796 de 3.825 verificações ok**; as 28 que falham são **as mesmas da rodada anterior** (`v82` 20, `v92` 6 e
  `v92_celular` 2 — a tela inicial e a conta de antes da v90 e o painel de testes que a versão oficial não mostra) e 1 é a do
  `v92_db_online` que oscila nesta máquina (a correção da bola a 150 ms: os mesmos números da rodada da v95). E o
  `tools/v92/pacote.py --producao` (o ZIP da versão oficial) deixa de fora também os dois arquivos de testes da v94 (o
  `INICIAR-TESTES-MOTOR-NOVO-NO-WINDOWS.bat` e o `LEIA-ME-v94-TESTES.md`): antes ele parava na própria conferência; o
  `v92_pacote_test.py` passa inteiro (7/7).
  Depois do teste: o `tests/v96_conta_test.py` (19: as 6 abas — também nas setas do teclado —, o Chat em Privacidade
  funcionando e em cima mesmo quando a aba se pinta de novo, a SUA CONTA pelo selo do perfil — com o toque e com o teclado
  —, sem as abas e sem o Servidor, o Escape e o PRONTO, o `ajxAbre('conta')`, o anel do chute medido nos pixels e o celular
  deitado); o `ajustes_linhas_test.py` e o `v71_test.py` contam 6 abas; o `v82_test.py` confere o selo do perfil abrindo a
  SUA CONTA (sem conta, com o ENTRAR; com a conta, o cartão dela). Os 31 conjuntos que passam pelos Ajustes, pelo perfil,
  pelo anel ou pela Oficina rodaram de novo (`tests/saida/logs_v96b/`, `logs_v96c/` e `logs_v96c_re/`): todos inteiros,
  fora as falhas de sempre (`v82` 20 e `v92` 6); o selo do perfil ganhou a área de toque de 44 px que o
  `interface_test.py` mede.

## v95 — 29/10/2026 · o fim da partida, os emojis, a ranqueada ao vivo, o chat, o perfil, os campos maiores, a economia, o visual sem cara de IA, o placar minimalista, o grupo na ranqueada e as cores dos dois campos

A pedido: *"depois que termina as partidas faça algo nesse estilo* [a imagem do VITÓRIA DO AZUL]*, e esses emojis faça para pôr
na tampinha, o sistema de ranqueada faça patentes mais bonitas, ranqueada mais daora na hora de jogar, ao escolher faça algo
diferente, quantos players estão procurando partida etc, players online, chat mais fácil de mexer, e um perfil que os caras
olhem e sintam orgulho de ver, aumente os mapas de 1v1 2v2 3v3 4v4 (estão muito pequenos), melhore a economia do jogo"* (nas
respostas: os emojis **na loja, por raridade**; entram **todos os outros**, menos os personagens e as marcas; os campos **uns
30% maiores**); depois, *"adicione linhas assim* [a imagem dos pontinhos] *apenas na oficina de criação caso o criador da sala
ative a opção rank off; o sensor ao redor do player deixe assim, porém o dos parceiros de time da cor do time; no personagem
inicial bote roxo, branco e laranja, e se o cara cair no time roxo fica roxo, branco, roxo"*; e, por último, *"deixe o jogo
sem cara de IA, melhore tudo — gráficos, lobby etc., menos a mecânica; botões, perfil, deixe bem organizado e tangível"*.
Depois de testar o artefato: *"os gols eu quero que nem antes, agora ficou muito grande — quero apenas o campo maior, não os
gols; a foto de perfil do player está muito pequena, tem que preencher tudo; quando todos os jogadores forem do mesmo clube,
aparece ali do lado do placar o nome do time; e quero um placar igual esse minimalista* [o print do GROTA MMB 0 04:00 0]*, e o
clube embaixo do nome ali no negócio de ver os players* [o print do PNS X QFC]*; o sensor eu quero diferente: quando é clicado
fica um branco mais forte e some rapidamente, porém se o player segurar ele fica esse branco mais forte"*.
E depois do segundo teste: *"começar falando da oficina de criação: quando mexe em algo, por exemplo o tamanho do jogador, o
menu volta lá pra cima e fica meio difícil mudar os valores, pois o menu fica subindo quando muda algo; outra coisa, quando
aumenta muito o tamanho do botão o chute não funciona; outra coisa, a linha deve ter para pôr na sala, deve ser ativada apenas
pelo curador da sala, aí caso o criador ative quando estiver criando o mapa vai ficar para geral isso da linha; deve ter
extrapolação/deslize para o player tampinha; agora falando sobre a ranqueada: quando o jogador estiver em equipe e clicar
jogar de novo, aparece se todos da equipe botaram jogar de novo; se todos não botarem em 10 segundos, volta automaticamente
para o lobby; jogadores põem pronto e o dono da equipe joga"* (na resposta: o deslize é **o da tampinha** — quanto ela ainda
anda depois de soltar o analógico, como o *Deslize no chão* da bola). E depois do terceiro, com duas imagens: *"quero as
cores desse mapa* [o gramado listrado visto de cima, no fim da tarde] *do lado de dentro do campo apenas, mantenha o mesmo
mapa; e no do futsal troque por esse"* [a quadra da favela pintada de verde, com as áreas amarelas e o círculo azul, gasta].
Só aparência, telas e prêmios: a física oficial é a mesma (o build confere: `sha256 ad9f1d2216409b0e`) — os campos crescem
pelas medidas do campo, não pela física; o anel do chute e o deslize da tampinha só mudam nos mapas e nas salas da Oficina.

- **O FIM DA PARTIDA no estilo da imagem** (`tools/v95/fim.js`): a tela inteira nas cores dos dois times (o de cima e o de
  baixo, com o xadrez e a faixa escura no meio), cada jogador na fileira do seu time — a tampinha grande (com o emoji), o
  clube, a placa com o nome na cor do time, os gols e as assistências e a coroa no craque —, o título grande atravessando a
  faixa (**VITÓRIA DO LARANJA**, **VITÓRIA DO ROXO**, **EMPATE**; com outras cores de time, o nome da cor) e, do lado, o
  **PLACAR PENDURADO** (o vidro preso por dois cabos): o placar com o relógio no meio, **os gols da partida** (quem fez, a
  assistência e o minuto), os seus números, o craque, o prêmio, a patente e os botões de sempre. Vale contra os bots e online.
- **OS EMOJIS DA TAMPINHA** (`tools/v95/emoji.js`, o atlas `tools/v95/emojis.webp` feito pelo `tools/v95/emojis_atlas.py`):
  **102 emojis** das três folhas enviadas (ficaram de fora **27**: os personagens conhecidos e os escudos/logos de times e
  marcas). Na **LOJA › EMOJIS**, por raridade: **comum 600 moedas, raro 1.400, épico 2.800, lendário 150 gemas**; **4 de
  graça** para todo mundo (Diabinho, Bola de Fogo, Anjinho e Bola 8) e o "Sem emoji". O emoji equipado vai **no meio da
  tampinha, em todo lugar**: na partida (treino, contra os bots, online e replay), na tela inicial, no perfil, no fim da
  partida, na loja, no COFRE › EMOJIS, na PARTIDA ENCONTRADA e na Oficina. Online cada um vê o dos outros (vem no cartão da
  sala, **assinado pela conta**: ninguém põe um emoji que não comprou); metade dos bots tem um (de graça, comum ou raro, sempre
  o mesmo para o mesmo nome). Com a conta, comprar e equipar é na conta (a plataforma confere o preço e o que é seu); sem a conta, os de
  graça equipam no aparelho; na demonstração, a loja usa as moedas do aparelho. Só aparência: o tamanho e a física não mudam.
- **AS PATENTES MAIS BONITAS** (`tools/v95/patentes.js`, o mesmo `rqInsignia` em todo lugar): cada patente com a **sua forma**
  — o escudo redondo de cobre com a tampinha (Bronze), o escudo com o recorte e a estrela (Prata), o escudo de ponta com o sol
  (Ouro), o hexágono de cristal (Platina), a pedra lapidada (Diamante), o brasão roxo de seis pontas com a coroa (Élite), o
  brasão vermelho de oito pontas com a chama (Mestre) e o brasão de ouro com o céu roxo, os louros e a coroa grande
  (Lendário). A divisão na fita de baixo (III, II, I): o II ganha as asas pequenas; o I, as grandes e o brilho. Os pontos e as
  divisões continuam os mesmos.
- **A RANQUEADA AO VIVO** (`tools/v95/ranqueada.js`, `server/fila95.js`): no JOGAR, a faixa **AO VIVO** — quantos estão
  **ONLINE**, **JOGANDO** e **PROCURANDO** —, em cada tamanho de time quantos procuram agora (o mais cheio ganha o **RÁPIDO**), no
  JOGAR RANQUEADA **quanto deve demorar** e a sua **sequência de vitórias** e a **melhor patente**. A busca ganhou o radar em
  volta da insígnia, as contagens ao vivo e as dicas; quando acha gente, a tela **PARTIDA ENCONTRADA!** com os dois times (as
  tampinhas com os emojis) passa por cima do começo, sem atrasar nada. O servidor das salas responde `{type:'fila_info'}` só com
  números (nenhum nome, nenhum ID), com ritmo próprio, e manda sozinho para quem está na fila. Sem servidor ou sem conta, a
  faixa diz que a ranqueada é contra os bots.
- **O CHAT MAIS FÁCIL** (`tools/v95/chat.js`): o botão **😀** ao lado do campo com **32 emojis** (um toque põe no texto, onde
  está o cursor) e **10 frases prontas** (um toque escreve; o ENVIAR manda) — no Chat do Brasil e no painel das salas, da
  partida, do clube e dos amigos —, o **contador** (0/120) e o ENVIAR que só acende com texto. Na tela do chat: as abas
  **MUNDO · AMIGOS · CLUBE · SALA**, as suas mensagens **do lado direito** e, para quem está lendo as de cima, **↓ MENSAGENS
  NOVAS** em vez de pular para baixo. O filtro e o limite de envio são os mesmos.
- **O PERFIL DE ORGULHO** (`tools/v95/perfil.js`): o **CARTÃO DO CRAQUE** no canto (a nota **OVR**, de 40 a 99, pelo nível, o
  aproveitamento, os gols e as assistências por partida, as vezes de craque e a patente; o tipo do cartão — **BRONZE, PRATA,
  OURO ou LENDA** — pela nota) e a **VITRINE**: **CRAQUE DA PARTIDA** (quantas vezes), **MELHOR SEQUÊNCIA**, **MAIOR PATENTE** e a
  **FORMA** (as 5 últimas: V, E, D). A conta da nota é só para mostrar.
- **OS CAMPOS 30% MAIORES** (1v1, 2v2, 3v3 e 4v4): o campo da bola e as marcas (as áreas, o pênalti, o círculo e a meia-lua)
  × 1,3 — o 2v2 passou de 71 × 50 para **92,3 × 65** —; **o gol é o de antes** (a boca e a profundidade: 12,8, 16, 20,5 e 24,5
  — no primeiro teste ele tinha crescido junto e ficou grande demais); a faixa de fora (onde só o jogador anda) é a mesma. O
  servidor das salas tem as mesmas medidas (`server/partida/fisica.js` e `nucleo.js`, e a barreira da saída). O mapa Clássico
  da Oficina continua com as medidas dele. Com o campo maior e o gol de antes sai menos gol (nas partidas só de bots, de 30%
  a 60% menos que na v94, conforme o tamanho).
  **O bot das salas online** (`server/partida/bot.js`) chutava "de perto" a 1,15 meio campo — com o campo maior e o gol de
  antes, de longe demais, e de lado, da linha de fundo: a bola batia na trave e voltava, às vezes sem parar (sozinho contra
  alguém parado, ele passava 4 minutos sem gol). Agora: "perto" é medido pela boca do gol (2,5 bocas, o mesmo de antes em todos
  os tamanhos); sem ninguém marcando, ele só bate no gol quando a linha do chute entra na boca (marcado, bate como antes); e
  duas travas antigas saíram — a bola parada entre ele e a parede (ele empurrava para sempre: depois de ~1 s chuta como está)
  e o bot parado no ponto de mira sem alcançar a bola (encosta nela). Contra alguém parado, ele volta a fazer os 3 gols em
  todas as simulações; entre bots, o ritmo de gols fica parecido com o de antes da mudança (é o campo maior que faz sair menos
  gol).
- **A ECONOMIA MELHOR** (`tools/v95/economia.js` e `app/contracts/v88.ts`, os mesmos números no jogo e na plataforma): partida
  **30** moedas (era 25), vitória **70** (60), cada gol **12** (10), cada **assistência 6** (nova), o **craque da partida 40**
  (novo), as **vitórias seguidas +10** por vitória a mais (até +50; nova), a **1ª vitória do dia +150 moedas e +10 gemas** (uma
  vez por dia; nova), cada nível **150 moedas e 8 gemas** (eram 100 e 5) e a cada 5 níveis **+30 gemas** (eram 25); o teto do
  dia das partidas na conta subiu para 6.000 (era 4.000). A tela do fim mostra **O QUE VOCÊ GANHOU**, parte por parte (com a
  conta, o que o servidor pagou de verdade: `moedasDetalhe`, `sequencia` e `primeiraVitoria` na resposta), e a **LOJA › COMO
  GANHAR** tem a tabela nova.
- **O SENSOR** (`tools/v95/times.js`): o anel em volta de cada um agora é **limpo e translúcido** (a borda de fora continua
  marcando o alcance do chute). O **SEU é verde**; o dos **parceiros, na cor do time**; o dos adversários, na cor deles. A ponta
  da direção também ficou limpa; o respingo e o rastro são os mesmos. **Apertou o PASSE ou o CHUTE, o anel acende num BRANCO
  FORTE** na hora (com um brilho curto); **segurando, ele fica branco** (no CHUTE um pouco mais forte que no PASSE); soltou — ou
  foi só um toque —, o branco **some rápido** (~0,22 s). No lugar da carga girando de antes. Vale para você (o dedo, o teclado,
  o controle; o toque rápido também acende) e para os outros: online, o botão de cada um vem no quadro do servidor (os 2 bits
  que já iam para a previsão); os bots e o replay acendem no chute e apagam do mesmo jeito; na Oficina, o mesmo (pelo botão do
  quadro e pelo chute). Só desenho: o botão, o chute e a força não mudam.
- **O PLACAR MINIMALISTA** (`tools/v95/hud.js`, como no print): **três abas de vidro escuro penduradas na borda de cima** — o
  relógio no meio (a aba mais funda e mais escura) e os dois números do lado, **cada um na cor do seu time** —, sem a caixa, sem
  TIME A/TIME B e sem o rótulo do modo do lado (o modo continua no aviso do começo e no painel dos jogadores; o COM CURVA vira
  uma etiqueta pequena no pé do relógio). O símbolo do contorno do time (○ cheio no Time A, ◌ tracejado no Time B, o mesmo de
  em campo) fica pequeno embaixo de cada número. **Quando o time todo é do mesmo clube**, o **nome do clube e o escudo** aparecem
  do lado de fora do número daquele time: online, quando todas as vagas do time são de gente do mesmo clube (um bot na vaga, de
  outro clube ou sem clube: nada); contra os bots, quando você joga sozinho no seu time e tem clube. O nome que não cabe (no
  celular, ou com a barra da sala online do lado) diminui e, se nem assim, vira a sigla (ASSOCIAÇÃO ATLÉTICA VILA ESPERANÇA →
  AAVE). Os botões do lado do placar (o dos jogadores e o das falas) se afastam para dar lugar.
- **O PAINEL DOS JOGADORES** (o botão do lado do placar; `tools/v95/hud.js`, como no print): os dois times em **placas na cor de
  cada um** (com o xadrez de fundo), cada jogador numa linha com a **FOTO DE PERFIL CHEIA no círculo** — o avatar equipado; sem
  avatar, a tampinha dele com o emoji, o meio da tampinha preenchendo o círculo (44 px; 30 px no celular deitado; antes era uma
  tampinha de 26 px com a borda) —, **o nome com a bandeira** e a bolinha de conectado (verde, amarela ou vermelha pelo ping) e
  **o CLUBE EMBAIXO DO NOME** (o bot: BOT; quem caiu: o aviso). Em cima, **o confronto** (a sigla e o escudo do clube de cada
  time quando o time é de um clube só; senão, a cor do time: LARANJA × ROXO) e o modo da partida. Os números (gols,
  assistências e defesas) continuam, com ícones desenhados. No celular deitado, o painel do 4v4 cabe entre o analógico e os
  botões; ele continua sem pegar o toque.
- **A TAMPINHA INICIAL** (a de quem não escolheu outra): as listras em pé **ROXO, BRANCO e LARANJA**. No time ela fica com a cor
  do time dos lados — **Time A: laranja, branco e laranja; Time B: roxo, branco e roxo** — nas partidas, nas salas, com os bots,
  no fim da partida e na Oficina (lá, a cor do time do mapa). A inicial antiga (metade laranja, metade roxa) vira a nova. O padrão
  **Tricolor** ficou de graça (como o Listras da inicial de antes): mexer só na borda da inicial não cobra o padrão (o jogo e
  o catálogo da plataforma, `app/contracts/catalogo_tampinhas.json`).
- **AS LINHAS DA BOLA SÓ NA OFICINA, COM O RANK OFF**: as linhas agora são **pontinhos brancos** (como na imagem: maiores perto
  da bola, sumindo no fim; dourados quando a bola vai entrar) e só aparecem **nas salas da Oficina em que o criador ligou o RANK
  OFF** — ao criar a sala (*RANK OFF · as linhas da bola para todos*) ou nos ajustes da sala (o admin, fora da partida); a sala
  mostra **RANK OFF** no cartão e na lista, e a partida com ele **não conta nas jogadas do mapa**. No TESTAR, a pausa tem
  **RANK OFF (LINHAS DA BOLA)**. Nas partidas de sempre (treino, bots, salas, ranqueada) as linhas não aparecem.
- **O VISUAL SEM CARA DE IA** (`tools/v95/visual.js`, `tools/v95/arte/*`, `app/public/game/v95.css`):
  - **A arte desenhada em código, no lugar das imagens geradas por IA**: o fundo da tela inicial (a quadra da quebrada no fim
    da tarde: o céu em faixas, o morro com as casinhas, as casas de tijolo com a laje e a caixa d'água, os fios, o alambrado,
    os refletores, as bandeirinhas e o muro com o RACHA pichado) e o das telas, os fundos antigos do lobby e do perfil, o
    **letreiro RACHA**, o banner do perfil, a folha de ícones e os 22 ícones das telas (o traço de tinta grosso e a cor
    chapada; o $ da moeda desenhado), os **6 banners de perfil** (a laje, o pôr do sol, o grafite, o Cristo, o estádio e o
    carnaval), as peças dos mapas (a Arena, com o desgaste discreto, e o Estádio de noite, com os carros, as árvores e as casas)
    e **as 5 caras das tampinhas animadas** (CRIA, CRISTO, PITBULL, FÉ e DRAGÃO, com as mesmas animações). Cada imagem é um SVG
    feito pelos scripts de `tools/v95/arte`, desenhado pelo Chromium com as fontes do jogo e guardado em WebP; o build troca as
    antigas com as mesmas medidas (ver o `PROVENIENCIA.md`).
  - **Os botões viram placas**: a face chapada, o contorno de tinta e a **beirada de baixo grossa** — apertar afunda a placa —,
    sem o brilho de neon em volta; os blocos retos (sem inclinar); a faixa de cima escura com a linha **laranja | roxo** dos
    times; a coluna da esquerda com a faixa laranja (o lado do Time A) e a da direita com a roxa (o Time B); **o amarelo é só do
    JOGAR** (e da aba escolhida). As cores por papel (verde, vermelho, azul, roxo) ficaram chapadas, com o mesmo contraste.
    A **OFICINA** foi para a fileira do TREINO, ao lado dele; a dica embaixo da tampinha virou frase (*Toque para abrir o cofre,
    segure para trocar*).
  - **A tampinha em pé** da tela inicial e do perfil sem a luz roxa borrada, sem o anel de neon e sem o reflexo de chão molhado
    (a quadra é de cimento): a sombra no chão e a lateral de metal.
  - **As telas** com a mesma faixa escura, os painéis em placa (sem o contorno azul elétrico), as abas em placa (a escolhida
    amarela; no RANKING, a da cor da categoria) e, no perfil, o cartão do craque no canto de cima à esquerda e a vitrine em
    placas maiores.
- **A OFICINA NÃO PULA MAIS PARA CIMA** (`tools/oficina/paineis.js`): mexer num valor refaz o painel (os campos que dependem
  dele aparecem ou somem) e ele voltava para o começo a cada mudança — mudar o tamanho do jogador lá embaixo da FÍSICA era
  rolar de novo a cada passo. Agora **a rolagem fica onde estava** e o campo continua com o foco (dá para seguir no teclado ou
  no deslizador); digitou um número e tocou em outro campo ou botão, o painel espera o toque acabar: o campo tocado fica com o
  foco e o botão tocado funciona (antes o toque se perdia).
- **A TAMPINHA GRANDE CHUTA** (`server/partida/nucleo.js`): o alcance do chute é contado do centro (o anel + a bola) e, com o
  tamanho maior que o anel, a bola nunca chegava perto o bastante — com a tampinha de 3,2 u e o alcance de 2,5 u, nenhum chute
  saía. O anel agora vale **pelo menos o raio + 0,5 u** (a mesma folga do RACHA de sempre, 2,5 − 2,0): 3,2 → 3,7 u, 2,6 → 3,1
  u; o anel maior que isso fica o dele. **O perfil oficial não muda** (2,5 u, o mesmo alcance de antes). Vale no TESTAR, nas
  salas com mapa (o servidor e a previsão do aparelho, o mesmo código), no bot do mapa e na física da sala; o editor avisa o que
  vale embaixo do *Alcance do chute* (*Valendo 3,7 u: o alcance acompanha o tamanho…*) e a amostra do CRIAR SALA também.
- **AS LINHAS DA BOLA: NA SALA, PELO CURADOR; NO MAPA, PARA TODOS**: na sala, o RANK OFF continua só com o curador (o admin
  da sala — quem criou, ou quem ficou com a sala), no CRIAR SALA ou nos AJUSTES, fora da partida (as linhas para todos naquela
  sala e a partida não conta nas jogadas do mapa). Novo: no editor, **PARTIDA › Linhas da bola para todos** — o criador do
  mapa liga e as linhas aparecem **para todo mundo, em qualquer sala com aquele mapa e no TESTAR** (a partida conta normal). A
  sala mostra a etiqueta **LINHAS** e o RANK OFF sai do CRIAR SALA, dos AJUSTES e da sala (no lugar, a nota *o mapa já mostra
  para todos*); a pausa do TESTAR diz *LINHAS DA BOLA: DO MAPA*; o servidor não liga o RANK OFF nesses mapas. O mapa guarda
  `partida.linhas: true` só quando ligado (os mapas de antes ficam com o mesmo JSON).
- **O DESLIZE DA TAMPINHA** (o freio do mapa, `freioJog`, que o motor da Oficina já tinha): quanto a tampinha ainda anda
  **depois de soltar o analógico** — **0% para na hora** (o RACHA de sempre) e **100% desliza o máximo** (~7,6 u na velocidade
  de sempre); a escala é a da distância (50% ≈ 3,8 u). No editor, **FÍSICA › Jogadores › Deslize ao soltar o analógico** (no
  lugar da *Desaceleração (parar)*, de 0,03 a 1), com a distância escrita embaixo; no **CRIAR SALA** e nos **AJUSTES da sala**,
  **Tampinhas › Deslize**, com a amostra dizendo quanto ela desliza e o resumo da sala (*deslize das tampinhas 40%*).
- **O GRUPO NA RANQUEADA** (`tools/v95/grupo.js`, `server/grupo93.js`):
  - **No lobby, PRONTO e o dono joga**: com grupo, o JOGAR de quem não é o dono vira **PRONTO** (tocou: **PRONTO ✓**, verde;
    tocou de novo: sai), com a etiqueta *O LÍDER COMEÇA A BUSCA* / *ESPERANDO O LÍDER*. O dono vê em cima do JOGAR quantos estão
    prontos (*1 DE 2 PRONTOS*, *TODOS PRONTOS*) e **o JOGAR dele só procura com todos prontos** (senão, o aviso diz quem falta;
    o servidor confere de novo). Ao lado da tampinha e no painel do grupo, quem está pronto aparece **PRONTO ✓**. Quem cancela
    a busca deixa de estar pronto; a partida começou, o PRONTO zera.
  - **O JOGAR DE NOVO do grupo**: no fim da ranqueada, com grupo, o JOGAR DE NOVO é **uma votação de 10 s** — quem tocou vê
    *ESPERANDO…* e todos veem o quadro **JOGAR DE NOVO COM O GRUPO**: a tampinha de cada um com ✓ (já tocou) ou … (falta), o
    relógio e a barra. **Todos tocaram: a busca do grupo começa sozinha** (o mesmo tamanho; todos saem da tela do fim juntos,
    sem precisar do PRONTO); **não tocaram em 10 s: todo mundo volta para o lobby** (o aviso diz quem não confirmou) — e lá,
    PRONTO e o dono joga. O LOBBY com a votação aberta leva todo mundo para o lobby na hora; quem já estava no lobby (ou caiu,
    ou saiu do grupo) também fecha a votação. Sozinho, o JOGAR DE NOVO é o de sempre. (O dono que procurava de novo do lobby e
    puxava quem ainda estava na tela do fim: agora é a votação.)
- **AS CORES DOS DOIS CAMPOS** (`tools/v95/mapas.js`, desenhadas em código como o resto da arte; as cores medidas nas
  imagens enviadas e conferidas no desenho):
  - **O ESTÁDIO** (o gramado, o da ranqueada): dentro das linhas, o gramado da imagem — o corte em **11 faixas** (as das
    pontas escuras e a do meio clara, em cima da linha do meio; eram 13), o verde escuro **#244a22** e o claro **#386c33**
    (eram #215915 e #578d25) e as linhas **brancas**; os fachos dos refletores ficam fracos dentro das linhas (15%: na imagem
    o gramado inteiro tem a mesma luz). Fora das linhas o mapa é o mesmo: a grama de fora, o alambrado, a calçada, o
    estacionamento, os postes, a galera e as casas.
  - **A ARENA** (a quadra da favela, a de futsal): a quadra da imagem — o verde **#237d52**; as **áreas de futsal** amarelas
    **#e6a41c** (o "D" que sai da linha de fundo, com a meia-lua amarela por fora — no lugar da grande área quadrada e da
    pequena área do futebol); o **círculo do meio azul #19618a com o anel amarelo**; as linhas brancas; a **tinta
    descascada** (o cimento aparecendo em ~6% da quadra, mais onde se pisa: o meio, a frente das áreas e a linha do meio) e as
    **rachaduras**. O resto do mapa é o mesmo (o muro grafitado, as escadas, o piso de placas, o alambrado e as casas), e
    também a prévia no JOGAR e o Ultra leve (as cores lisas).
  Só desenho: o tamanho de cada quadra (1v1 a 4v4), os gols, as marcas do jogo (o pênalti, o círculo do meio) e a física não
  mudam. Os testes do Estádio e da Arena (`v74`, `v76` e `v77`) conferem as cores novas.
- **Os testes novos**: `tests/v95_test.py` (80 verificações, o jogo no navegador: a arte, os ícones e os preços, as placas, a tampinha inicial
  e o sensor, os campos, as linhas só na Oficina, os emojis — a loja, comprar, equipar, na partida e nos bots —, o fim da
  partida, a economia, a ranqueada ao vivo, o chat, o perfil, as patentes e o celular deitado) e `tests/v95_servidor_test.js`
  (40: o `fila_info` e o ritmo, o RANK OFF da sala com mapa, o emoji no cartão da sala e as medidas dos campos iguais no jogo e no
  servidor, também pela rede de verdade); os testes antigos que mediam o campo, a economia ou o sensor foram atualizados para
  os números novos (o `v73_test.py` confere agora o anel limpo: o meio vazio, o cheio translúcido e a borda de fora no alcance
  do chute). Depois do teste: a parte 10 do `v95_test.py` (o placar minimalista — as abas, o clube do lado contra os bots e,
  simulado, online —, o painel com a foto cheia e o clube embaixo do nome, o sensor branco — segurando, soltando, o toque
  rápido, os outros online, os bots e a Oficina — e, no celular, o painel do 4v4 e o nome que vira sigla); o `v80_test.py`, o
  `polimento_test.py` e o `v93_fase5_test.py` conferem o placar novo; o `v94_jogo_test.py` zera o placar antes do gol de
  teste (a partida automática pode já ter 2 gols); o `v83_salas_ws_test.py` espera até 7 min o bot sozinho fazer os 3 gols; a
  referência da v91 do bot (`tests/v92/ref_v91/bot.js`) tem as mesmas regras novas (o `v92_nucleo_test.mjs` compara os quadros).
  A bateria inteira (`tests/saida/logs_v95d/` e, os que rodaram de novo depois das correções, `tests/saida/logs_v95e/`):
  **88 conjuntos, 3.640 de 3.669 verificações ok**; 28 das que falham são **as mesmas, uma por uma, da rodada anterior**
  (`v82` 20, `v92` 6 e `v92_celular` 2 — a tela inicial e a conta de antes da v90 e o painel de testes que a versão
  oficial não mostra) e 1 é do `v92_db_online` (a correção da bola com 40/150 ms de atraso de mentira, que oscila nesta
  máquina de 2 núcleos: rodado de novo, passa inteiro às vezes — o mesmo acontece com a versão de antes desta rodada).
  Depois do segundo teste: o `tests/v95_grupo_test.js` (20, o servidor: o PRONTO e a votação do JOGAR DE NOVO — todos tocam,
  o tempo acaba, o LOBBY, quem já está no lobby, sozinho e quem cai), o `tests/v95_grupo_navegador_test.py` (13, dois
  navegadores na plataforma de teste: o PRONTO, o JOGAR do dono, o JOGAR DE NOVO com os dois, o tempo e o LOBBY), a parte 11
  do `v95_test.py` (12, a Oficina: a rolagem e o foco, o deslize, a tampinha grande e as linhas do mapa) e a parte 6 do
  `v95_servidor_test.js` (7: as linhas do mapa na sala, o anel do chute e o deslize medido no motor); o `v93_grupo_test.js`,
  o `v93_revisao2_test.js` e o `v93_revisao3_test.js` com o PRONTO; o `v80_test.py` compara a aba do placar com o mesmo ponto
  sem o placar (o campo embaixo muda com a câmera). A bateria inteira (`tests/saida/logs_v95f/` e, os que rodaram de novo
  depois das correções, `tests/saida/logs_v95g/`): **90 conjuntos, 3.693 de 3.721 verificações ok**; as 28 que falham são
  **as mesmas da rodada anterior** (`v82` 20, `v92` 6 e `v92_celular` 2). O `v92_db_celular` e o `v94_motor` (o tempo do
  4v4 nesta máquina de 2 núcleos) oscilaram na primeira passada e passaram inteiros rodados de novo.
  Depois do terceiro teste (as cores dos campos): o `v74_test.py`, o `v76_test.py`, o `v77_test.py` e o `enxuto_test.py`
  conferem as faixas e as cores novas (o Estádio com 11 faixas, as áreas amarelas e o círculo azul da Arena, o Ultra leve e a
  prévia). A bateria inteira (`tests/saida/logs_v95i/`; o `enxuto` rodou de novo em `logs_v95i_re/` depois de o teste olhar
  o ponto certo da prévia): **90 conjuntos, 3.693 de 3.721 verificações ok**; as 28 que falham são as mesmas (`v82` 20, `v92`
  6 e `v92_celular` 2).

## v94 + OFICINA — 28/10/2026 · a v93 e a v94 dentro, os ajustes finos, as linhas da bola e o CRIAR SALA com a física da sala

A pedido: *"melhore configuração como extrapolação etc, tudo que tinha no teste, certa de aonde a bola vai igual do beat
ball, várias configurações, mesmo tamanho da bola etc, e tira exportar mapa etc, apenas posta mapas, cada jogador pode
publicar 3 mapas e aparece lá likes, favoritos etc, criar sala etc"* (e, nas respostas: a física **só na Oficina, nas
configurações de criar sala**; da Oficina fica **só o que precisa: editar o mapa, salvar e publicar**; o limite de 3 é **só dos
públicos**; as **duas** linhas da bola) — e *"adicione o que tem nesse arquivo zip* (`racha-online-v94-testes-etapas1a7.zip`)
*no outro, no RACHA com Oficina: as funções como bolas, contagem regressiva, perfil de quem faz gol… tudo que tem nesse"*.

- **A v93 e a v94 dentro do RACHA com Oficina.** Tudo o que o ZIP da v94 trazia veio junto: a **v93** inteira (o HUD da
  partida, as bolas lisas e a Clássica Lisa na loja, a contagem 3, 2, 1, JÁ!, o replay do gol online com o cartão de quem
  marcou, o painel de jogadores, o craque da partida, as salas e as ações do admin, o grupo, os balões de fala rápida, os sons
  e as três revisões — ver o `LEIA-ME-v93.md`) e a **v94** (o motor próprio `server/partida/motor.js`, a sala do servidor no
  motor `server/partida/sala94.js`, `tools/v94/*` e `docs/v94/*`). O motor próprio fica **em testes e desligado**, como no
  ZIP das etapas 1 a 7: o jogo e as salas usam o motor de sempre (`motor: 'v94',` no `config.js` e `RACHA_MOTOR_JOGO=v94` no
  servidor ligam para todo mundo). A junção conferida: o build sem as duas etapas novas (os ajustes finos e a Oficina) sai
  **igual, byte a byte**, ao `racha.html` da v94, e a física continua `sha256 ad9f1d2216409b0e`. O `server/turma.js` tem as duas coisas (as salas da v93/
  v94 e as salas com mapa); as migrações SQL da base (que não estavam no ZIP da v94) ficaram. Continua a **versão oficial**: o
  ZIP sai sem o `experimental`, sem os dois `.bat` de testes e sem os LEIA-ME de testes.
- **A v93 também na Oficina.** No TESTAR e nas salas com mapa: a **contagem 3, 2, 1, JÁ!** (no TESTAR a física espera e dá
  para desligar na pausa — CONTAGEM 3, 2, 1: LIGADA/DESLIGADA, guardado no aparelho; online o servidor segura a partida e
  solta junto, e cada aparelho desconta metade do ping), o **CARTÃO DE QUEM FEZ O GOL** (o avatar ou a tampinha, o nome e o
  banner equipados de quem marcou e a assistência, no canto, como o do replay da v93 — o mesmo em todos os aparelhos: o evento
  do gol traz quem fez), os **BALÕES DE FALA RÁPIDA** (a tecla **T** ou FALAS RÁPIDAS na pausa: as 8 frases da v93; o servidor
  repassa só de quem está jogando, no ritmo de cada um, e quem bloqueou não recebe) e o **CRAQUE DA PARTIDA** na tela do fim
  (a conta da v93 com os gols e as assistências). A Aparência ganhou a bola **EQUIPADA** (cada um vê a bola que equipou na
  loja; sem bola equipada, a branca). No servidor, as salas com mapa convivem com o que a v93 pôs nas salas: a contagem (o
  motor do mapa espera), o painel (os números de cada um, também com 4 times), as ações do admin no meio da partida (pôr,
  tirar e trocar alguém de lugar) e o ENCERRAR, que limpa a contagem; o replay do gol do servidor continua só nas salas comuns.
- **Os AJUSTES FINOS** (`tools/ajustes/ajustes.js`, `app/public/game/ajustes.css`): o que o painel AJUSTES › TESTES v92 tinha
  de útil, agora na **versão oficial**, dentro dos Ajustes de sempre — **Ajustes › Visual › ABRIR OS AJUSTES FINOS** (e os
  atalhos em Controles e em Câmera). As 7 abas continuam as mesmas: a página abre por cima da aba, com o ‹ VOLTAR, e tem
  **FLUIDEZ** (o desenho entre os passos — último passo, suave ou prever —, a cadência dos quadros, o FPS em passo inteiro e o
  medidor na tela), **A BOLA** (as linhas, abaixo, e o aro mais justo), **ONLINE** (a extrapolação, a bola na tela — do
  servidor, mista ou prevista —, o deslize das correções e a previsão v91/v92), **CONTROLES** (a zona morta do analógico, a
  folga para trocar de direção e a área de toque a mais nos botões) e **CÂMERA** (a mola e o quanto ela olha à frente).
  Valem na hora, ficam guardados no aparelho e **VOLTAR TUDO PARA O PADRÃO** volta o da versão oficial. A física não está
  aqui: a das partidas é a oficial (ela só se ajusta nas salas da Oficina). No celular deitado a página fica no tamanho
  normal e rola (as abas e o PRONTO continuam numa linha).
- **AS LINHAS DA BOLA** (`tools/ajustes/linhas.js`) — "para onde a bola vai", como nos jogos de bolinha: a **LINHA DO CHUTE**
  (com a bola perto do pé: para onde ela vai se você chutar AGORA — o CHUTE, ou PASSE E CHUTE, as duas; dourada quando entra no
  gol, vermelha no gol contra; as batidas marcadas) e o **CAMINHO DA BOLA** andando (até onde ela vai sozinha, com as
  batidas). O comprimento: curta (1,5 s), média (3 s) ou longa (até parar). A conta é a **da física de verdade**, rodada à
  frente numa bola de mentira: no treino e contra os bots, o bloco da física do jogo (lido e nunca mexido — as mesmas funções
  de batida, os subpassos, o freio do campo, o teto, a curva, o paredão e os cones do treino); no online, o **núcleo das salas**
  (o mesmo do servidor), no mundo da previsão; na Oficina, o **motor do mapa** (com as zonas, os portais e os objetos que
  andam). Os testes conferem que o caminho previsto é o caminho de verdade **passo a passo** (diferença 0,0000 px). Os outros
  jogadores não entram na conta (podem tocar na bola no caminho); com o motor próprio da v94 as linhas ainda não aparecem.
- **A EXTRAPOLAÇÃO do online** (Ajustes finos › ONLINE, 0 a 200 ms; 0 = desligada): o jogo desenhado uns ms à frente, como no
  Haxball — o mundo da previsão roda mais esses passos pela física do núcleo (a bola e todo mundo; a sua tampinha com o
  analógico de agora) e o desenho anda o que o mundo andou (com a bola do servidor, ela anda sozinha até lá). Na Oficina, a
  bola pelo motor do mapa e as tampinhas na direção delas.
- **A Oficina: só editar, salvar e publicar.** Saíram o **exportar** (o arquivo `.racha-mapa.json` e o texto) e o
  **importar** (o arquivo, o texto e a aba Importar da central). Um mapa vai para outro aparelho ou para outra pessoa
  publicado (pode ser não listado ou privado).
- **No máximo 3 mapas PÚBLICOS por jogador** (`server/mapas.js`: os não listados e os privados não contam; a equipe não tem
  limite). O servidor confere no publicar (o mapa novo e a versão nova) e no CONFIGURAR (deixar público um que não era);
  passando, volta `codigo:'publicos'` com a conta. **Meus mapas** mostra **PÚBLICOS n DE 3** (cheio: "publique como não
  listado ou privado"); com os 3, a janela de PUBLICAR só oferece Não listado e Privado (e explica como abrir a vaga), e o
  CONFIGURAR também. Se os 3 encherem por outro aparelho, a janela pergunta se publica como não listado ou privado.
- **Curtir e favoritar no cartão:** o **coração** e a **estrela** dos cartões da comunidade curtem e favoritam na hora (tocar
  de novo tira), com os números ao lado; os cartões de Meus mapas mostram as partidas, as curtidas e os favoritos do servidor.
- **CRIAR SALA com a FÍSICA DA SALA** (no lugar do JOGAR: na página do mapa, no JOGAR do cartão, no menu dos seus mapas, nos
  modelos, no ⋮ do editor e no "Mapa publicado!"): a janela com o nome da sala, os jogadores por time, os bots, aberta ou
  fechada e a física da sala — a predefinição (Do mapa, Clássico, Rápido, Técnico, Arcade, Precisão) ou os números em % do
  RACHA de sempre: **Bola** (o **tamanho**, a velocidade máxima, o deslize no chão, o peso, o quique), **Chute** (a força do
  chute e do passe, o alcance, o efeito da curva) e **Tampinhas** (a velocidade, a aceleração, o tamanho, o peso), com a
  amostra (a tampinha e a bola no tamanho da sala) e até onde vai um chute forte. Vale **só naquela sala** (o mapa publicado
  não muda; a ranqueada e as salas comuns continuam com a física oficial). O servidor (`server/turma.js`) passa a física pela
  mesma limpeza do mapa (`RachaMapa.limpaFisica` + `RachaMapa.limpa`: cada número cortado nos limites do núcleo), muda o hash
  e manda o mapa da sala de novo para todo mundo (a previsão de cada aparelho continua igual à do servidor); o admin troca nos
  **AJUSTES** da sala entre as partidas (com a partida rolando, o servidor recusa). A tela da sala e a lista de salas do
  GALERA mostram **«física da sala»** ("bola 150%", "Rápido"…).
- **Corrigido no caminho:** o painel de jogadores da v93 (a cada 2 s, no relógio das salas) lia os números da partida sem
  conferir se existiam — numa sala com mapa ele derrubaria o processo do servidor; agora a partida no mapa tem os números dela
  (`est`) e o painel aceita a partida sem eles. O ENCERRAR do admin numa sala com mapa limpa a contagem pendente. Com um menu
  da Oficina aberto (a pausa, as falas), as teclas do modo clássico (T, C, 1–4, H…) chegavam ao jogo de sempre por baixo;
  agora ficam no menu (o campo de texto da mensagem continua escrevendo normal), e o **T** abre as falas só online.
- **A revisão de segurança** (um segundo agente leu o servidor sem ver o meu raciocínio; nada derrubava o servidor nem
  furava o limite dos 3 públicos) e o que mudou por causa dela, em `server/turma.js` e `server/partida/sala_mapa.js`:
  - **trocar o mapa da sala** tem ritmo próprio (4 seguidas, depois uma a cada 2 s) e escolher o mesmo mapa não refaz nada;
    o `mapa_sala` (até ~200 KB) vira texto **uma vez** e vai igual para todo mundo (antes, o admin de uma sala cheia trocando
    de mapa sem parar segurava o servidor — vinha da v92);
  - um pedido do admin com uma parte errada (o mapa certo com a física errada) é recusado **inteiro**, sem deixar a sala
    pela metade (antes o mapa trocava e ninguém era avisado);
  - nas salas com mapa **sem bots**, a vaga que o admin esvazia (o banco) **fica vazia** (antes virava bot) e quem ele põe numa
    vaga vazia no meio do jogo **entra já no campo** (antes esperava a próxima saída);
  - os gols e as assistências do painel e do resultado (o craque) são **da pessoa**, não da vaga: quem troca de lugar leva os
    números dele;
  - a mensagem grande (só o mapa passa dos 64 KB) é conferida pelo tipo que o JSON leu (um `"type"` repetido no meio não
    passa mais pela porta dos mapas); o código de um mapa **não listado** não aparece na lista pública de salas; e os balões
    de fala de quem foi **silenciado** na sala por denúncias esperam, como o chat.
- **Os testes:** `tests/ajustes_linhas_test.py` (novo, 31: os ajustes finos — as 7 abas, a página, cada ajuste valendo na
  hora, guardado, depois de recarregar, o padrão, trocar de aba e fechar; o celular deitado; a linha do chute e o caminho da
  bola iguais à física de verdade passo a passo — reto, com a batida, o gol contra, o passe, a bola andando —; as chaves; o
  núcleo das salas e a extrapolação; e na Oficina a contagem e a chave dela, a linha pelo motor do mapa, o cartão do gol, o
  craque e a bola equipada), `tests/oficina_v94_test.py` (novo, 36: o servidor e duas sessões — curtir/favoritar no cartão, o
  CRIAR SALA com a bola em 150%, o corte do servidor, o Rápido nos AJUSTES, os 3 públicos, a contagem nos dois, as falas de
  um no outro, o cartão do gol da Ana nos dois aparelhos e o craque), as partes novas do `tests/oficina_servidor_test.js`
  (os 3 públicos, a física da sala e as salas com mapa com a v93), e o `tests/roda_tudo.sh` com a v93, a v94 e os novos.
- **A entrega:** a bateria inteira deu **86 conjuntos, 3.514 de 3.542 verificações ok** (os logs em
  `tests/saida/logs_v94oficina/`). As 28 que falham são as mesmas, uma por uma, da v94 pura (o build sem os ajustes finos e sem
  a Oficina, com os mesmos testes): `v82` (20: a tela inicial, o perfil e a conta de antes da v90), `v92` (6) e `v92_celular`
  (2: as memórias A/B e a parte MOTOR do painel de testes, que a versão oficial não mostra).

## v92 · OFICINA — 27/10/2026 · só a v92 oficial, a bola branca e o editor mais "de verdade"

A pedido ("deixe apenas a versão V92, remova aquilo das configurações, deixe a bola toda branca na Oficina de criação igual
à do HaxBall, bote mais funções e deixe mais tangível"):
- **Só a v92 oficial:** o `app/public/game/config.js` não tem mais o `experimental: true` — os AJUSTES não têm a aba
  **TESTES v92** (o PADRÃO v92 / RESTAURAR v91, as memórias A e B, o DB por estados, o medidor) e a pausa não tem os botões
  **A ⇄ B** e **DB**; o jogo usa o padrão da v92. O ZIP é o da versão oficial (como o `tools/v92/pacote.py --producao`: sem o
  `INICIAR-TESTES-NO-WINDOWS.bat`, que ligava o servidor de testes, e sem o `LEIA-ME-v92-TESTES.md`). O código do modo de
  testes continua no jogo, desligado (só um `experimental: true` no config.js o traria de volta); os testes dele seguem
  passando com o config deles.
- **A bola da Oficina é BRANCA, lisa e de contorno preto** (a de sempre dos jogos de bolinha), sem sombra, do tamanho exato da
  colisão (o contorno fica do lado de dentro) — no TESTAR e nas salas online com mapa, em todo mapa (os de antes também). A
  Aparência ganhou a seção **Bola** (a amostra em cima do piso; Branca, **Colorida** com a cor que quiser, ou a do **RACHA**,
  a do jogo de sempre) e o formato do mapa, os campos `aparencia.bola`, `corBola` e `sombras` (validados no aparelho e no
  servidor). O jogo de sempre (treino, salas comuns, ranqueada) continua com a bola dele.
- **Mais funções no editor** (`tools/oficina/ferramentas.js`): **LANÇAR A BOLA** (tecla B — a mira com o caminho previsto
  pelo motor do mapa antes de soltar, as batidas e o GOL/FORA previstos; solta, a bola corre de verdade no motor, com os
  portões, botões, zonas, portais, a lógica e os objetos que andam ao vivo, a trilha e o GOL!), **COPIAR PARA O OUTRO LADO**
  (a cópia espelhada com os times trocados: gols, spawns, zonas, botões e a cor do time; os portais em par continuam em par),
  **REPETIR** em fila ou em círculo (com os limites do mapa), **as medidas** perto do dedo enquanto desenha, move, gira ou
  estica, **as guias** ao mover (o meio do campo, a mesma linha de outra peça e o lugar espelhado dela) e **a vibração** (criar,
  apagar, pegar uma alça, encaixar, chutar, a batida e o gol — a chave Vibração dos Ajustes vale aqui também).
- **Mais tangível:** a **sombra** das peças sólidas (paredes, curvas, linhas e obstáculos que batem; a sombra dura do jogo,
  com a chave em Aparência › Peças); numa peça pequena na tela, o dedo no meio dela **move** a peça (antes o quadradinho de
  esticar ganhava e a peça crescia); no celular deitado, as ferramentas ficam em **duas colunas**, todas à vista.
- **Corrigido no motor dos mapas:** o evento do gol saía com o tipo trocado pelo tempo do jogo (o `t` do tempo apagava o
  `'gol'`) — o letreiro **GOL DO TIME…**, o som e o confete do gol não apareciam no TESTAR nem nas salas com mapa (o placar
  estava certo). Agora o tempo vai em `seg` e o evento é `gol`.
- O espelhar também espelha o movimento circular e o giro (a fase), não só o vai e vem.
- Testes: `tests/oficina_ferramentas_test.py` (novo: a página publicada só com a v92 oficial; a bola branca de contorno preto
  pelos pixels do canvas do TESTAR, a colorida e a do RACHA; o painel; lançar a bola; copiar para o outro lado; repetir; as
  medidas; as guias; a vibração; as sombras) e a parte 10 do `tests/oficina_mapa_test.mjs` (a aparência nova, a bola sozinha
  no motor e o evento do gol).

## v92 · OFICINA DE CRIAÇÃO 2.0 — 24/10/2026 · o editor de mapas, a comunidade e as salas com mapa (até 4 times)

A pedido ("PROMPT ULTRA COMPLETO — RACHA V92 · OFICINA DE CRIAÇÃO 2.0"): um editor de mapas completo dentro do jogo, sem
recriar nada e sem mexer na física oficial, na ranqueada, nas salas de sempre, nas contas nem na progressão. O manual
inteiro está no **`LEIA-ME-OFICINA.md`**.
- **O motor dos mapas** (`server/partida/mapa.js`, o mesmo arquivo no servidor e no jogo): o formato JSON e a validação de
  tudo o que chega (`limpa`: campos conhecidos, números nos limites, textos limpos, referências conferidas, tamanho e
  complexidade limitados), a compilação (segmentos, círculos, polígonos com o modo de colisão; gols com boca, traves e rede;
  zonas, portais, botões, spawns, a grade espacial), a partida (o passo de 1/60 s com as batidas do núcleo; até 4 times;
  gols em qualquer lugar e direção; zonas de velocidade, lentidão, impulso, gravidade, esteira, rampa, pontos, reinício e
  eliminação; portais, portões, botões, interruptores, cronômetros, objetos móveis e barreiras temporárias; a lógica
  QUANDO → ENTÃO sem script, só ações da lista, com limites), os bots para qualquer mapa e o quadro compacto da rede. Com o
  perfil Clássico num campo igual ao das salas, a conta é a mesma do núcleo, bit a bit (o teste confere).
- **O servidor das salas**: o catálogo (`server/mapas.js`: publicar, versões — as 15 últimas —, lista, busca, curtir,
  favoritar, denunciar, colaboradores, permitir copiar, moderação; gravado em disco de forma atômica, com o índice refeito se
  estragar) e as **salas com mapa** (`server/turma.js` + `server/partida/sala_mapa.js`: até 4 times e 20 pessoas, o mapa da
  sala para todos com o hash, a partida no servidor com a mesma fila de comandos das salas hospedadas, a queda e a volta, o
  fim sem selo/XP/troféu). As opções `--mapas` / `RACHA_MAPAS` (padrão: "mapas" ao lado do arquivo da turma) e
  `--moderadores` / `RACHA_MODERADORES`; o VPS grava em `/var/lib/racha/mapas`.
- **O jogo**: o botão OFICINA na tela inicial; a central (meus mapas, em desenvolvimento, comunidade, populares, recentes,
  favoritos, oficiais com os 15 modelos, compartilhados, importar, a busca, a moderação para a equipe); o editor (as
  ferramentas pelo toque, as alças, a câmera, desfazer/refazer, agrupar, alinhar, distribuir, espelhar, camadas, o painel de
  propriedades, as abas Campo/Aparência/Física/Partida/Lógica/Camadas/Spawns/Validação, a biblioteca); o salvamento
  automático, as versões e a recuperação no aparelho; exportar/importar; publicar; o TESTAR no canvas do jogo, com os
  controles do jogo; e a sala com mapa com a previsão do aparelho pelo mesmo motor (`tools/oficina/*.js`, a etapa
  `oficina/oficina` do build e o `app/public/game/oficina.css`). O jogo de antes continua byte a byte o mesmo: o build só
  acrescenta o link do CSS e o bloco da Oficina, e a Oficina só liga os ganchos dela no jogo depois de carregar inteira.
- **As regras do goleiro** (Partida › Goleiro): a última vaga de cada time é o goleiro (com 3 ou mais por time), a área do
  goleiro livre / só o goleiro do time / só o goleiro para todos, e o goleiro que não sai da área — no motor (o mesmo no
  servidor e no TESTAR), com a área desenhada e a etiqueta GOLEIRO na sala. As 9 camadas com os nomes pedidos (Fundo,
  Texturas, Marcações, Geometria, Colisões, Objetos, Elementos interativos, Decoração, Interface do mapa).
- **A revisão de segurança** (um segundo par de olhos no servidor): a grade das colisões não trava mais com um mapa feito
  para pesar (antes, 1,2 s e 200 MB numa mensagem de 33 KB; agora o mapa é recusado em ~30 ms — cada peça só entra nas
  células que alcança e a grade tem teto); um balde próprio para o rascunho mandado à sala; as denúncias que tiram um mapa
  sozinhas e as curtidas que contam na ordem são só as de quem é de confiança (conta, equipe ou 24 h + 3 partidas) e os mapas
  novos de quem acabou de chegar têm teto por hora; o teto de disco do catálogo (`RACHA_MAPAS_MAX_MB`); o colaborador não
  muda mais nome, descrição, categoria nem visibilidade; quem reconecta com a conexão velha ainda aberta não ganha uma
  segunda tampinha; o MOVER/VOLTAR da lógica com o teto de velocidade; o índice dos mapas confere os arquivos gravados
  depois dele (a queda no segundo antes de gravar) e a moderação também vai para o arquivo do mapa.
- **O que os testes de navegador da Oficina pegaram (e foi corrigido):** a página do mapa (detalhes, curtir, favoritar) não
  aparecia — a janela com duas classes perdia o estilo; entrar numa sala pelo código deixava a pessoa só assistindo (agora
  entra num time com vaga, como o JOGAR AGORA); o salvamento automático que ficava pendente de uma sessão do editor podia
  gravar por cima de um RENOMEAR feito na central (agora os relógios são da sessão e o automático só grava com o editor
  aberto); a recuperação não avisava de uma mudança feita logo depois de salvar (agora compara o conteúdo); o botão OFICINA
  encostava na tampinha e no letreiro em telas pequenas (agora fica livre em 11 tamanhos, de 568×320 a 1920×1080).
- O `polimento_test`: a conferência das PATENTES olhava o centro da janela 0,30 s depois do toque, durante a animação de
  abrir (0,28 s de recorte, que começa ~0,15 s depois do toque) — falhava às vezes com ou sem a Oficina (medido); agora
  espera a animação terminar (a conferência é a mesma).
- Testes novos: `tests/oficina_mapa_test.mjs`, `tests/oficina_servidor_test.js`, `tests/oficina_cliente_test.py` e
  `tests/oficina_online_test.py` (ver o LEIA-ME-OFICINA.md), também no `npm test` (`tests/roda_tudo.sh`).

## v93 — 21–22/10/2026 · a atualização completa por fases (interface, partidas e social)

A pedido: "tornar o jogo mais completo, competitivo e agradável, com funcionalidades reais e uma interface moderna,
compacta, limpa e intuitiva", por fases, com commits e testes separados, **sem publicar na produção**. O editor de HUD
novo (tools/v92/hud.js) foi preservado e só recebeu as melhorias pedidas. A física (o bloco PHYS: sha256 ad9f1d2216409b0e,
conferido a cada build), a mecânica do DB, o chute, o passe, a movimentação, as contas, o ranking e a economia não mudaram.
O código fica em `tools/v93/*.js` (um arquivo por fase), o estilo em `app/public/game/v93.css` e o servidor em
`server/turma.js`, `server/partida/sala.js` e `server/grupo93.js` (o protocolo novo está no `server/LEIAME.md`). Depois das
Fases 3, 5 e 7, três revisões independentes do código (outra leitura, sem ver o desenvolvimento) acharam 15 casos, todos
corrigidos com teste (as seções "Correções da revisão" abaixo). O resultado da bateria inteira está em "A entrega", no fim.

### Fase 1 · bugs, HUD e controles
- **O editor de HUD** (o pedido anterior, "v92 · Fase 1"; `tools/v92/hud.js`): a barra compacta que sai de cima do
  controle escolhido (nada fixo no meio da tela), a caixinha de tamanho/opacidade/opções que procura o lugar livre (em
  telas pequenas ela estreita, encurta ou solta), arrastar qualquer controle para qualquer lugar (a barra some enquanto o
  dedo arrasta), a pinça, a prévia na hora, ↶ ↷, o salvamento automático (o rascunho volta depois de fechar o app), até 8
  layouts com nome (**NOVO**, **DUPLICAR**, renomear, excluir e trocar — no editor, na pausa com **LAYOUT ⇄** quando há
  mais de um, e em Ajustes), os layouts **na conta** (voltam depois de limpar o cache ou em outro aparelho; dois aparelhos
  se juntam), restaurar só um botão, o modo teste sem mexer na partida online e a área segura do celular deitado.
- **Opacidade de 0% a 100% de 1 em 1%** (inclui 1%); com 0% o controle some mas o toque continua no mesmo lugar; no editor
  os invisíveis aparecem tracejados.
- **Efeitos ao pressionar: ligado/desligado** (nas opções de cada controle; vai no layout e na conta): desligado, o botão
  fica parado ao tocar e segurar — não encolhe, não pisca, não acende, sem o anel do ARMADO, sem a piscada do chute em cima
  dele, sem o anel da carga; no analógico sem a luz e o pino fica no meio. Só o desenho: o toque, o tempo de resposta e a
  mecânica são os mesmos.
- **Os itens que não equipavam** (`tools/v93/equipa.js`, `app/api/racha/v88/loja.ts`, `perfilRouter.ts`): o efeito de
  chute agora sai também no chute armado/toque armado (quase todo chute); as tampinhas exclusivas (passe, eventos) não somem
  mais da lista da conta e têm EQUIPAR na loja; bordas, padrões e ícones comprados equipam na tampinha (EQUIPAR NA
  TAMPINHA) e o inventário mostra todas as peças; equipar/TIRAR aparece na hora, não volta sozinho para o anterior e vai um
  pedido de cada vez; o equipado é da conta (outra conta no mesmo aparelho não herda); os cosméticos antigos da v49 que
  ficaram presos voltam ao original; os banners, molduras e títulos do site aparecem e equipam (o título equipava pelo nome
  errado no servidor); a compra de peça com desconto de evento não dá mais "o preço mudou"; os avisos de troca de tampinha
  não se perdem no ritmo do servidor (os outros jogadores veem a nova). O servidor só guarda como equipado o que a conta tem.
- **O tutorial no celular** (`tools/v93/tutorial.js`): textos de uma frase, o recado de cada tentativa dentro do painel
  (não mais solto no campo, em cima da tampinha), o painel procura o lugar sem cobrir nenhum controle (nem a pausa), os
  seletores do treino somem no tutorial, PULAR com 44 px; os avisos ARMADO e a carga da CURVA vão para o lado livre do
  botão (antes iam em cima do PASSE).
- Testes: `tests/v93_fase1_test.py` (54), `tests/v92_hud_test.py` (134, três celulares + a conta), `tests/v93_itens_test.py`
  (15, com a plataforma de teste). A bateria (46 conjuntos, do treino ao online e à plataforma): 2.276 de 2.287 verificações;
  as 11 que falham são as mesmas do ZIP recebido, rodadas nele (`celular` 4, `v71` 3, `v92` 4: a pausa e os Ajustes da
  versão de testes têm os botões A ⇄ B e DB e a aba TESTES v92, que só existem com `experimental: true` no config.js).

### Fase 2 · partidas, placar e craque
- **3, 2, 1, JÁ!** antes de começar (`tools/v93/partida.js`; `server/turma.js`: contagem): contra os bots, depois da
  apresentação (a física espera, como na pausa); online, o servidor segura o motor (parado, com os comandos de antes
  descartados), manda a contagem a todos e solta junto — o JÁ! de cada aparelho sai com o primeiro quadro andando do
  servidor. O número grande com o anel do segundo, no visual do placar. O relógio da partida começa depois da contagem.
- **O painel de jogadores**: um botão discreto do lado do placar (no lado sem controle) abre um painel pequeno embaixo dele —
  os dois times nas cores do RACHA, a tampinha, o nome, a posição, o ping (o servidor recebe o ping que cada aparelho mede),
  ativo / caiu (o bot segura o lugar, com os segundos para voltar) / bot / reserva / assistindo, e os gols, as assistências e
  as defesas de cada um, ao vivo (o servidor manda a cada 2 s e na hora de cada gol). Não pega o toque e não cobre controle.
- **O Craque da Partida**: a mesma conta no aparelho (contra os bots) e no servidor (online, `server/partida/sala.js` conta
  gols, assistências, defesas — uma por chute no gol —, desarmes, chutes no gol, passes certos e gols contra): gol 10,
  assistência 6, defesa 4, desarme 2, chute no gol 1,5, passe certo 0,5, gol contra −5, vitória 3 / empate 1. O cartão na tela
  do fim (a tampinha, o nome e os números; "VOCÊ É O CRAQUE DA PARTIDA"), o número no perfil (`perfil.st.craque`) e, online,
  o "melhor da partida" do selo da conta passa a ser o craque do servidor. Quem assiste vê o cartão em cima da tela.
- **O replay do gol**: o cartão de quem marcou (a tampinha ou o avatar, o nome e o banner equipado; e a assistência) num canto,
  entrando e saindo rápido — no lugar das duas linhas de texto no meio. Online, o replay passa para todos: o servidor para a
  partida (o relógio também), PULAR vira voto (PULAR · 1/2), pula quando todos que estão jogando votam, quem cai sai da conta
  e o servidor encerra para todos ao mesmo tempo (no máximo 7 s). Sem o lance gravado (ou com o replay desligado nos
  Ajustes), o aparelho vota sozinho. As mudanças do replay vêm por fora do bloco PHYS (que fica byte a byte igual).
- **O banco de reservas**: quem assiste a sala aparece ao lado do campo com a tampinha (fora da quadra: não toca em nada);
  "RESERVA" em quem pediu para entrar (`banco {on}`); atualiza quando alguém entra, sai ou vira jogador.
- **A sala mista** (alguém ainda com a página antiga guardada no aparelho): o hello da v93 avisa o servidor (`v93:1`); a
  contagem e o replay só esperam por quem conhece os dois — a página antiga não tem o PULAR e não trava o replay de ninguém;
  numa sala só com páginas antigas, a partida começa e recomeça na hora, como antes.
- Os testes antigos do online sobem o servidor sem a contagem e sem o replay (`RACHA_CONTAGEM_MS=0`, `RACHA_REPLAY=0` nos
  arneses de teste; o padrão do servidor é com os dois); dois testes antigos que esperavam a partida andar logo depois de
  começar (`tutorial`, `polimento`) agora esperam a contagem.
- Testes: `tests/v93_fase2_test.py` (14: contra os bots num iPhone e online com o servidor de verdade e três
  navegadores) e `tests/v93_mista_test.js` (6: a sala mista no servidor). A bateria (62 conjuntos): 2.672 de 2.684
  verificações; as 12 que falham são as da versão de testes, as mesmas do ZIP recebido (`celular` 4, `v71` 3, `v92` 4 e
  `v92_db_celular` 1: a pausa, os Ajustes e o DB da versão de testes, que só existem com `experimental: true`).

### Fase 3 · o admin da sala
- **O painel do admin** (`tools/v93/admin.js`; `server/turma.js`: adm; `server/partida/sala.js`: admPoe, admTira, admTroca,
  encerraJa): lateral e compacto (até 340 px, só da altura do que tem dentro, nunca no meio), pela pausa (ADMIN DA SALA) ou
  pelo botão ADMIN da tela da sala (junto dos atalhos ENTRAR NO TIME / MONTAR COM BOTS, em cima do INICIAR; no celular com
  44 px). O painel começa embaixo do placar (não cobre o placar nem o INICIAR) e só é refeito quando a sala muda. Os dois
  times e o banco, com MOVER (para o outro time; com o time cheio, escolhe com quem trocar), RESERVA (para o banco; na
  partida o bot segura o lugar), ENTRAR (do banco para uma vaga ou no lugar de alguém), ADMIN (passar a administração),
  REINICIAR (0 × 0, os mesmos times) e ENCERRAR (o placar de agora; o resultado não vale prêmio, como o encerrar do árbitro)
  — os dois com a confirmação dentro do próprio painel.
- Tudo conferido no servidor: só o admin, só sala personalizada (a ranqueada e a copa não têm admin), a pessoa ainda na sala,
  o ritmo (3 ações por segundo). Na partida, o motor troca quem joga em cada tampinha (as tampinhas ficam onde estão; cada um
  começa a fila de comandos do zero), sem duplicar ninguém (a volta de quem caiu também não pega um segundo lugar); o placar,
  o relógio e os números de cada um continuam. O aparelho de quem foi movido passa a jogar com a tampinha nova (a previsão
  recomeça no lugar novo) ou a assistir. Cada ação vai para o log do servidor e para o chat da sala. Se o admin cai, a
  administração passa para quem está há mais tempo na sala e a partida continua.
- **A pausa no celular deitado**: com 5 botões ou mais (o ADMIN DA SALA, o LAYOUT ⇄ da Fase 1), eles vão para duas colunas e
  a pausa cabe sem rolar (antes, com muitos botões, a caixa rolava).
- Testes: `tests/v93_salas_test.js` (30: as regras no servidor, também o admin que cai) e `tests/v93_fase3_test.py` (10: três
  navegadores, a admin num celular deitado). A regressão (25 conjuntos: o servidor, o online, as salas hospedadas, a pausa, o
  editor de HUD e as telas no celular) passou inteira, menos as da versão de testes (`v71` 2, `v92` 4); com as duas colunas, a
  pausa da versão de testes (com o A ⇄ B e o DB) agora cabe no celular (`celular` 195/195, antes 191).

### Fase 4 · o grupo com líder na tela inicial
- **O grupo** (`server/grupo93.js`; `tools/v93/grupo.js`): CRIAR GRUPO num botão em cima do JOGAR (GRUPO 2/4 quando tem
  grupo; com a largura do texto inteiro, encostado no EVENTOS) abre o painel do grupo, do lado direito, entre a barra de cima e
  o JOGAR (sem rolar no celular deitado): quem está nele (a coroa no líder, o status de verdade — DISPONÍVEL, OCUPADO,
  PROCURANDO, EM PARTIDA, OFFLINE), CHAMAR os amigos online, SAIR e, para o líder, PASSAR A LIDERANÇA e TIRAR. Até 4 pessoas.
  Só com conta (o grupo é dos amigos da conta).
- **No lobby**, os membros aparecem ao lado da sua tampinha (a tampinha, o nome, o status; a coroa no líder — em cima da sua
  tampinha quando o líder é você), no espaço livre: nada do lobby muda de lugar.
- **O convite** é um cartão pequeno em cima (ACEITAR / RECUSAR, vale 60 s), com as regras dos convites da sala (só amigos dos
  dois lados, sem bloqueio, quem recebe convites); no meio de uma partida ele espera (o aviso de cima avisa).
- **A busca**: o JOGAR do líder leva o grupo para a ranqueada (a busca abre em todos; quem não é o líder vê o aviso se tocar
  em JOGAR); o grupo cabe no time (o líder com 3 no grupo não procura 2 VS 2), fica no MESMO time, a fila junta pelos pontos
  como sempre e, sozinhos, os bots completam depois de 8 s. Qualquer um cancela para todos. Quem ainda está na tela do fim da
  ranqueada que acabou sai junto. Depois da partida o grupo continua.
- **As quedas**: quem cai continua no grupo por 60 s (OFFLINE); o líder que cai passa a coroa em 20 s; a busca para.
- Testes: `tests/v93_grupo_test.js` (30: o servidor) e `tests/v93_fase4_test.py` (11: duas contas amigas na plataforma de
  teste, a líder num celular deitado). A regressão (24 conjuntos: o servidor, a plataforma, o social, o ranking, a
  ranqueada, o lobby e as telas no celular, o online e as Fases 2 e 3) passou inteira, menos as 2 da versão de testes (`v71`).

### Fase 5 · os balões de fala rápida
- **As falas** (`tools/v93/falas.js`; `server/turma.js`: fala): Golaço!, Que defesa!, Passa!, Boa!, Foi mal!, Obrigado!, Sem
  problemas! e Minha culpa! — num menu compacto de duas colunas que abre num botão do lado do placar (no computador, T abre e
  1 a 8 escolhem). O balão aparece perto da tampinha de quem falou por 2,6 s, no tamanho do HUD (no celular, maior), no lado
  em que não cobre a bola, os gols, os controles, o placar nem a pausa. No máximo uma a cada 1,6 s (o servidor confere o
  ritmo de novo).
  BALÕES: LIGADOS/DESLIGADOS no próprio menu (guardado no aparelho). Só as frases prontas (nada de texto livre), só de quem
  está jogando, e quem bloqueou não recebe.
- **O lado do placar**: o botão das falas fica junto do botão dos jogadores (Fase 2), e os dois não ficam mais em cima do
  rótulo do modo (CASUAL, SALA PRIVADA…); no celular, online, quando a barra da sala (SALA XXXX · admin · 40 ms) fica por cima
  desse rótulo, ele não é desenhado (antes os dois textos se encavalavam — já era assim no ZIP recebido; a barra já diz a sala).
- Testes: `tests/v93_falas_test.js` (9: o servidor) e `tests/v93_fase5_test.py` (10: iPhone contra os bots, online e o celular
  online). A regressão (25 conjuntos: o HUD, o editor, a pausa, o tutorial, as partidas, os modos, o online, o lobby e as
  Fases 2 a 4) passou inteira, menos as 2 da versão de testes (`v71`); a medida da contagem do `v93_fase2` ficou tolerante ao
  aparelho ocupado montando a partida (o servidor continua segurando os 3 s).

### Correções da revisão (Fases 2 e 3)
Uma revisão independente do código das Fases 2 e 3 (outra leitura, sem ver o desenvolvimento) achou cinco casos; todos
corrigidos e com teste:
- **REINICIAR que não pode começar** (bots desligados e alguém caiu): antes o servidor parava a partida e não avisava
  ninguém (todos ficavam parados); agora recusa com o motivo ("Não dá para reiniciar agora: falta 1 jogador…") e a partida
  continua.
- **A pausa no meio do replay do gol**: antes, quando o replay acabava, a física voltava a andar com a sala pausada (e o
  relógio contava o tempo parado duas vezes); agora o motor continua parado até a pausa acabar e o relógio conta uma vez só.
- **A vaga guardada de quem caiu**: quando o admin põe outra pessoa nela, quem volta entra assistindo (antes o motor podia
  dar a ele o primeiro bot livre — às vezes do outro time); e quem volta a tempo reassume o mesmo lugar na sala e no motor.
- **Depois do apito final** o admin não muda ninguém de time; e quem o admin trocou de time no meio da partida não leva o
  resultado do time novo (sem prêmio, troféu nem o selo da conta; o resto da sala, normal).
- **O replay nunca fica parado na tela**: a partida encerrada (ou que parou) no meio do replay manda o fim do replay para
  todos, e o aparelho fecha o replay junto com o fim da partida (antes ele ficava parado no último quadro, embaixo da tela do
  fim, e podia aparecer de novo na partida seguinte).
- Testes: `tests/v93_revisao_test.js` (13, no servidor) e `tests/v93_revisao_cli_test.py` (4, dois navegadores). A regressão
  (24 conjuntos: o servidor, a plataforma, o ranking, as salas hospedadas, o online, a reconexão e as Fases 2 a 5) passou
  inteira.

### Fase 6 · as bolas
- **10 bolas lisas e brilhantes** (`tools/v93/bolas.js`; o catálogo `app/contracts/catalogo88.json`): Bola Roxa, Rosa,
  Verde-clara, Verde-escura, Preta, Branca, Azul, Cinza, Marrom e Amarela (1.200 moedas cada) — a cor com o degradê da luz,
  o reflexo definido em cima, a luz que volta do chão e o contorno escuro (as escuras com um aro claro por dentro).
- **A Clássica Lisa** (grátis): branca e lisa com o contorno preto, 2D (sem degradê, sem sombra, sem textura).
- Na LOJA (BOLAS), no INVENTÁRIO e no EQUIPAR de sempre (o servidor confere a compra e o equipar pelo catálogo). Só o desenho:
  o raio da bola, a colisão, a velocidade e a força não mudam.
- Testes: `tests/v93_bolas_test.py` (8, logado na plataforma de teste num celular: a loja, comprar com a confirmação,
  EQUIPAR AGORA, a bola na partida e as 11 desenhadas). A regressão (14 conjuntos: a plataforma, as contas, a loja, o
  inventário, os itens, o perfil, as telas no celular, o ranking e os eventos) passou inteira.

### Correções da segunda revisão (Fases 4 e 5)
Outra revisão independente, do grupo e das falas, achou sete casos; todos corrigidos e com teste:
- **Quem reconecta no meio da busca do grupo** (outra aba, a internet que voltou): antes o grupo seguia procurando sem ele e
  a partida podia começar sem ele (e, com os dois reconectando, a busca ficava presa); agora a busca para para todos, com o
  aviso também na conexão nova, e o líder procura de novo.
- **Os convites**: ninguém do grupo pode ter bloqueio com quem é chamado (antes só quem chamava era conferido); o convite de
  quem saiu do grupo deixa de valer; e aceitar confere de novo a amizade e os bloqueios.
- **Quem saiu do grupo enquanto estava fora** (o celular bloqueado por mais de um minuto): o aparelho pergunta o grupo quando
  a conexão volta e limpa o grupo velho (antes o JOGAR dele continuava preso a um líder que não era mais o dele).
- **A busca sozinho de quem já estava no grupo** para quando o amigo entra (agora o líder procura com todos).
- **O Dono zerou as contas**: as contas apagadas saem dos grupos na hora (o número reaproveitado por uma conta nova não herda
  mais o grupo).
- **O ritmo das falas** é da pessoa na sala (antes reconectar zerava o limite).
- **Aceitar o convite** não tira mais você da sala nem para a sua busca antes do servidor aceitar.
- Testes: `tests/v93_revisao2_test.js` (12, no servidor) e o passo 8 do `tests/v93_fase4_test.py` (o aparelho limpa o grupo
  velho quando a conexão volta). A regressão (19 conjuntos: o servidor, o social, a plataforma, as contas, o ranking, a
  ranqueada, as salas e as Fases 2 a 5) passou inteira; a medida do ritmo das falas no `v93_fase5` ficou independente do
  tempo da foto da tela.

### Fase 7 · os sons
- (`tools/v93/sons.js` explica; as trocas ficam dentro do motor de som, fora do bloco PHYS) o limitador no fim da cadeia (sem
  estouro), o ataque de 2–3 ms em cada som (sem o clique seco do começo), o passe com o som dele (antes era o chute mais
  baixo), as variações discretas no chute, no passe, no toque e nos estalos das colisões (os sons com notas continuam
  afinados), a bola na trave sem o clique do começo, dois chutes colados sem dobrar o volume, a rede e um acorde curto no
  gol, o clique mais macio, o bip do 3, 2, 1 e o JÁ!, até 32 sons juntos no celular e a latência de jogo. Os volumes de
  MÚSICA e EFEITOS continuam separados (Ajustes › Áudio).
- Testes: `tests/v93_sons_test.py` (8, o Web Audio do Chromium instrumentado; as medidas numa chamada só, sem a música do
  lobby no meio). A regressão (17 conjuntos: a interface, o tutorial, as partidas, os modos, o celular, o online, o chute, o
  controle e as Fases 1, 2 e 5) passou inteira.

### Correções da terceira revisão (Fases 6 e 7 e as correções)
A terceira revisão independente (as bolas, os sons e as correções das duas revisões) achou três casos; todos corrigidos e
com teste:
- **Quem volta por outra conexão com a antiga ainda aberta** (outra aba, o celular que trocou do Wi-Fi para o 4G): antes o
  servidor jogava fora os comandos da conexão nova por até 10 s (a tampinha ficava parada); agora a fila de comandos dele
  recomeça na hora, e ele continua numa tampinha só.
- **Aceitar o convite do grupo numa sala esperando começar** (personalizada): antes a pessoa ficava OCUPADO e o JOGAR do
  líder não começava a busca; agora ela sai da sala quando o servidor aceita (o aparelho volta para o lobby, no grupo).
- **A pausa que começou durante o 3, 2, 1**: antes o relógio da partida perdia até 3 s a mais; agora a pausa conta só a
  partir do começo da partida.
- Testes: `tests/v93_revisao3_test.js` (5, no servidor; sem as correções, 4 dos 5 falham). A regressão (31 conjuntos: o
  servidor, a plataforma, o social, o ranking, as salas hospedadas, o online, a reconexão e as Fases 2 a 5) passou
  inteira, menos 1 medida do `v92_db_online` que às vezes falha também no ZIP recebido (rodada de novo: 3 de 3; ver "A
  entrega").

### A entrega
- **A bateria inteira** (com o `config.js` da versão oficial, depois da Fase 7): **73 conjuntos, 2.829 de 2.830
  verificações** — do treino, das telas e do celular ao online, à reconexão, às salas hospedadas, à plataforma, às contas,
  ao ranking e às Fases 1 a 7; depois das correções da terceira revisão, os 31 conjuntos do servidor e do online rodaram de
  novo. O resumo e o log de cada um estão em `tests/saida/logs` (`RESUMO.txt`).
- **As duas medidas que às vezes falham, também no ZIP recebido** (as duas do DB por estados, que é experimental e só
  existe na versão de testes), rodadas de novo na v93 e na v92 recebida, no mesmo computador: `v92_db_celular` "o medidor
  registra os DBs… na parede" (falhou em 3 de 4 rodadas nas duas versões) e `v92_db_online` "a correção da bola… abaixo
  de 1 u" a 40 ms (v93: 3 de 3 depois; v92: falhou em 1 de 3). A física (o bloco PHYS) e o DB não mudaram.
- **A sala mista com a v92** (`tests/v92_mista_test.py` com a página da v92 recebida no lugar da antiga: um celular que
  ainda tem a v92 guardada, no servidor v93): a partida começa, os dois andam e chutam, e os dois e o servidor veem tudo no
  mesmo lugar, sem erro (7 de 8; a que falta só confere que a página antiga é a v91).
- **Os dois ZIPs** (`tools/v92/pacote.py`; `tests/v92_pacote_test.py`, cada ZIP descompactado e servido pelo
  `node server.js`): 7 de 7 — o oficial sem o painel de testes e sem aceitar o perfil do admin; o de testes com os dois.
- **Pendente:** o teste nos aparelhos de verdade (os testes de celular são no Chromium imitando iPhone e Android deitados,
  com toque e área segura; o Safari do iPhone, o som no iOS e a sensação dos controles ficam para o teste no aparelho); o
  grupo, a compra das bolas e o Craque no perfil precisam da plataforma com as contas (o servidor do .bat roda sem contas);
  e, no lançamento, apagar a linha `presente: true` do `config.js`.

## v92 · o DB (PASSE + CHUTE) — 21/10/2026 · o estudo de viabilidade e o DB por estados (experimental)

A pedido: "tornar o DB parado muito difícil por meio da ordem, duração e consumo dos comandos, sem delay artificial", com a
análise de viabilidade da janela de 2–5 ms antes. **A janela de 2–5 ms não é confiável** (a tela de toque lê o dedo a cada 4
a 17 ms; dois dedos na mesma leitura chegam com o mesmo instante; a física e o servidor andam em passos de 16,7 ms; o corte
de 2 ms cai no ruído de quem aperta junto; a bola leva ~23 ms para sair do alcance, não 7). No lugar dela, **o DB por estados**
(`server/partida/nucleo.js`: dbComando/dbTick, o perfil com `dbModo: 1`; **o padrão e a versão oficial continuam com o DB
atual, `dbModo: 0`**): os dois no mesmo passo = vale o PASSE e o CHUTE é anulado (com o relógio do toque, o CHUTE antes =
vale o CHUTE); um chute consome os comandos; um CHUTE apertado depois que o PASSE saiu completa o DB dentro da janela (bola
parada em campo aberto: o passo seguinte) e é anulado durante a proteção (4 passos); a parede segue só a física. Tudo
contado pelo seq do comando — o mesmo número no aparelho e no servidor: o ping não muda a decisão.
- Medido (laboratório com a física das salas e o motor de verdade; treinado = dedos ±10 ms, comum = 30 ± 12 ms): com o DB
  por estados, todo DB com a bola parada fica em ~58% (treinado) e ~31% (comum). O DB parado de pé, colado, girando e de
  lado, que hoje não saem em nenhuma versão, passam a sair com essa chance. Chegando correndo na bola parada: 58%/30% na
  v91 no ar, 87%/77% no online da v92 (o toque armado), 58%/30% por estados — mas empurrando a bola ~7 passos antes do
  PASSE ela já conta como andando e volta a 87%/77%. O normal fica como no online da v92 (87%/78%; v91: 56%/32%); a parede,
  igual em todas (100%/96%).
- **Corrigido no DB atual da v92** (o online; já no ZIP oficial da v92, que não foi publicado): a previsão do aparelho não
  tinha o mínimo de 2 passos entre chutes do servidor e discordava dele em 440 de 864 jogadas simuladas (em 192 a bola saía
  no teto na tela e voltava); e o servidor media os 33 ms entre dois chutes no relógio de parede, que oscila com a carga
  (de 7% a 14% dos chutes com 2 passos de distância recusados). Agora os dois contam 2 passos (`sala.js`: MIN_PASSOS_CHUTE;
  `rede.js`: v92PrevChuta).
- O aparelho: o relógio do toque (o instante de cada PASSE/CHUTE vai no comando como `dt`, só para desempatar a ordem dentro
  do passo e para a regra de ms de comparação), a varredura da tela de toque medida pelos eventos coalescidos do dedo, a
  máquina do núcleo no treino com `dbModo: 1` (`tools/v92/db.js`); o painel de testes ganhou a parte **DB** (a mecânica, as
  janelas e proteções, a parede, o relógio do toque e o medidor) e a pausa, o botão **DB: ATUAL ⇄ POR ESTADOS**.
- Testes: `tests/v92_db_test.cjs` (33: o DB atual idêntico ao de antes em 8.832 jogadas, as 9 regras, as dificuldades, o
  servidor × a previsão em 864 jogadas e com a rede atrasando), `tests/v92_db_celular_test.py` (19, toques de verdade com o
  relógio do toque), `tests/v92_db_online_test.py` (17, o jogo de verdade a 40 e 150 ms) e o laboratório `tests/v92_db/`.
- A bateria inteira (`tests/roda_tudo.sh`, commit 2677e5c): 57 de 58 conjuntos, 2.466 de 2.467 verificações (34 min). O
  `v92_db_online` é instável: passou 17/17 em 2 de 5 rodadas. As causas achadas: (1) nas travadas da máquina (2 navegadores,
  o servidor e o proxy em 2 núcleos), o servidor anda com um palpite e confirma o comando antes de ele chegar; a tela perde o
  toque por um instante e a bola sai e volta 5 a 10 u — com os 2 núcleos ocupados por outros processos, a 150 ms, em 7 de
  20 lances por estados e 5 de 20 no DB atual (0 de 20 com a máquina livre); (2) no DB atual, quando o servidor descarta um
  comando atrasado (`nsDescarta`), junta os botões dele no seguinte e o CHUTE tem a prioridade: o PASSE seguido do CHUTE
  no comando seguinte pode sair como CHUTE (a causa provável de 2 rodadas a 40 ms; o código é de antes do DB por estados,
  que processa cada comando no passo dele). Corrigir o (2) mexe no online oficial: fica para a decisão do dono.

## v92 — 21/10/2026 · a mecânica mais lisa, precisa e responsiva (e a versão de testes com o painel de ajustes)

A pedido: "uma melhoria completa da mecânica do RACHA usando o ZIP novo como base, preservando a UI nova; primeiro os
trancos, o atraso da bola no multiplayer, os chutes que não registram, o descompasso entre o aparelho e o servidor e a
ergonomia dos controles; depois opções experimentais de tamanho, bola, velocidade, peso, colisões e força, numa versão de
testes com um painel que não aparece para os jogadores comuns". **A UI da v91 não mudou** (as telas, os botões, as cores, as
letras, o cofre, a loja, o perfil, o ranking, as salas, o passe, os eventos e os amigos são os mesmos — conferido pixel a
pixel, ver Testes) e **a física de números é a mesma da v91** no padrão (velocidade 14,1 u/s, PASSE 212,5, CHUTE 340, teto da
bola 46,75 u/s, freio 0,99…): um lance de 900 passos do treino contra bots dá exatamente as mesmas posições da v91.
Nada foi publicado no servidor oficial e nenhum banco foi mexido.

**1. Sem trancos (o desenho e a cadência)** — `tools/v92/base.js`
- A cadência dos quadros: a física anda em passos de 1/60 s e o relógio que o navegador entrega a cada quadro oscila
  um pouco em volta do quadro da tela. Na v91 (no treino) essa oscilação ia direto para a física: quando o resto do relógio
  caía perto da divisa entre dois passos, quadros com 0 passos se alternavam com quadros de 2 (a tampinha "engasgava").
  Agora o intervalo vira o múltiplo de passo mais perto pelo ritmo da tela (60, 120 e 30 Hz; a mediana dos últimos 21
  intervalos, que um engasgo não muda; um quadro perdido conta 2 passos) e a diferença fica guardada: dentro de 6 ms ela
  não mexe em nada; passou disso (uma tela de 59,94 Hz, ou um pouco mais rápida que 60), o jogo acompanha o relógio de
  verdade aos poucos, no máximo 1 ms por quadro — sem salto de passos e sem intervalo negativo.
- O desenho entre os passos ('prever', o padrão): a sua tampinha, a bola e os bots são desenhados onde estão AGORA (a sua
  tampinha com a velocidade do próximo passo e o analógico de agora; a bola batendo nas paredes, traves e rede), sem atraso a
  mais; quando um quadro fica com 0 ou 2 passos (uma tela que não é de 60 Hz certinho), o desenho continua liso. 'suave'
  (entre passos, +16 ms) e 'v91' ficam no painel.
- O limite de FPS em passo inteiro: com o limite de 60 (o padrão) numa tela de 90 Hz, a v91 desenhava 2 de cada 3 quadros
  da tela (11 ms e 22 ms alternados). Agora: 90 Hz → 90 desenhos/s; 120 Hz → 60/s iguais; 144 Hz → 72/s.

**2. A bola no online na hora** — `server/partida/nucleo.js` (novo) e `tools/v92/rede.js`
- O núcleo compartilhado: as batidas, o passo da física das salas, os botões, a curva e a barreira da saída moram num
  arquivo só, que o servidor carrega (require) e o build cola no jogo. Quem joga roda o MESMO passo do servidor num mundo de
  previsão: a sua tampinha com os seus comandos, a bola com as batidas de verdade e os outros seguindo a última direção.
- A cada quadro do servidor o mundo volta para o estado dele e os comandos que ainda não chegaram lá são refeitos (rollback +
  replay); a diferença que sobra vira um deslize curto (90 ms).
- O PASSE/CHUTE sai na tela na hora do toque, com o som, a piscada e a vibração (antes: só quando o quadro do servidor
  voltava, sem som); quando o servidor confirma, nada se repete.
- Entre dois quadros da tela, a sua tampinha e a bola continuam onde estão desenhadas (na v91, o quadro do servidor que
  chegava as punha de volta uns 100 ms até o próximo desenho).
- A bola na tela ('eu', o padrão): tudo na hora da previsão; 'misto' (a bola do servidor perto dos outros) e 'servidor'
  (a da v91) ficam no painel.
- Um erro na previsão nunca trava a partida: ela desliga sozinha e o jogo segue pelo caminho da v91 (o mesmo no desenho
  entre os passos).

**3. Chutes que registram** — o mesmo código no treino e no servidor (`nucleo.js · botaoTick`)
- O toque armado: um toque no PASSE/CHUTE fica valendo por 6 passos (100 ms) esperando a bola entrar no alcance. Antes, se
  a bola não estivesse no alcance no passo exato do toque, o chute se perdia. Um chute por toque; segurar arma como sempre.
- Os contadores de toque no comando (`kc`/`pc`): um toque que caiu num comando descartado (o servidor alcançando depois de
  um tranco da internet) ou atrasado não se perde.

**4. O aparelho igual ao servidor**
- O motor das salas anda **60 passos por segundo de verdade** (um acumulador; a v91 rodava um passo por disparo do
  `setInterval`, que o Node arredonda para 16 ms: 60,7 a 61,2 passos/s medidos aqui — o servidor andava mais rápido que
  os 60 comandos por segundo dos aparelhos e completava o que faltava no palpite).
- A rede e as traves seguram a tampinha também no servidor (no jogo sempre seguraram: quem entrava no gol "voltava").
- O quadro leva o estado dos botões de cada um e, na COM CURVA, o efeito da bola (a previsão continua dali). O jogo da v91
  ignora os campos novos; o jogo da v92 num servidor antigo usa o caminho da v91.
- `RACHA_FISICA=v91` e `RACHA_MOTOR=v91` voltam o servidor ao comportamento da v91.

**5. Os controles**
- O analógico começa a andar a 15% do curso (antes 20%), para abaixo de 9% (antes 12%) e troca de direção com 0,03 rad de
  folga na divisa (antes 0,05: o ajuste fino "grudava"). Com os valores da v91 a função é a mesma de antes.

**A versão de testes** (`experimental: true` no `config.js` — o ZIP de testes vem assim; sem a linha, o painel não existe)
- AJUSTES › **TESTES v92** (a primeira aba; F2 no computador): PERFIS (Padrão v92, Restaurar v91, memórias A e B com o A ⇄ B
  também na pausa, a tabela das diferenças, exportar e importar), FÍSICA (tamanho da tampinha e da bola, alcance, velocidade,
  pesos, forças, teto, freio, giro, atritos e quiques — na hora no treino e contra bots), CONTROLES (toque armado, direções,
  zona morta, folga, fixo/flutuante, área de toque, moldes e tamanho dos botões), TELA (o desenho, a cadência, o FPS em passo
  inteiro, a câmera, o aro justo e o medidor), ONLINE (a previsão, a bola, o deslize, 30/60 quadros e MANDAR PARA A SALA) e
  MEDIDAS (FPS, passos por quadro, toques; ping, correções e o ritmo do servidor).
- O servidor de testes: `RACHA_EXPERIMENTAL=1` (ou `--experimental`; o `INICIAR-TESTES-NO-WINDOWS.bat` liga) aceita o perfil
  da física do admin da sala e os 60 quadros/s. Sem isso, toda sala usa o padrão.
- `tools/v92/pacote.py` monta o ZIP de testes (o `config.js` do repositório continua o da versão oficial).
- Para a física do aparelho poder mudar, as constantes da física viraram variáveis (os mesmos valores): no bloco de física
  isso entra pelas trocas documentadas do build (`SUBS_PHYS` de `tools/v92/v92.py`).

**Medidas** (antes × depois; `tests/v92_medidas.py` e `tests/v92_online_medidas.py`, navegador sem tela, relógio dos quadros
de mentira e rede simulada — não substituem o teste em celulares)
- **Treino, a tremida da tampinha correndo** (px por quadro: o quanto o desenho foge do andar liso; a média de 5 fases do
  relógio e, entre parênteses, a pior): 60 Hz com o relógio oscilando ±1 ms 0,62 (3,09) → 0,00 (0,01); 90 Hz com o limite
  de 60 FPS 2,02 (2,92) → 0,10, com 90 desenhos por segundo iguais em vez de 60 irregulares; 120 Hz 0,53 (2,09) → 0,00;
  144 Hz 1,43 (2,65) → 0,09, com 72 desenhos por segundo em vez de 60 irregulares; 30 Hz 0,73 (3,08) → 0,04 (0,22); o
  relógio à deriva (o pior caso) 0,79 (1,45) → 0,23; 60 Hz exato e 59,94 Hz: 0 nas duas. A 60 Hz com o relógio oscilando,
  os quadros com 0 ou 2 passos caem de 9,5% para 0. Do analógico até a tampinha andar: o mesmo (9,6 ms a 60 Hz).
- **A janela do toque** (sem internet): um toque de 40 ms vale de 80 ms antes de a bola entrar no alcance até 60 ms
  depois (v91: só de 20 ms antes); um de 90 ms, também de 80 ms antes (v91: 70 ms).
- **Online** (o servidor de verdade e 2 navegadores, a internet simulada com 40, 90 e 150 ms em cada sentido, 2 rodadas
  de 6 chutes): do toque no CHUTE até a bola andar na tela de quem chutou, mediana 126 → 10 ms, 232 → 11 ms e
  363 → 11 ms; toques sem chute na tela em 0,9 s: 3 de 36 → 0 de 35; o tranco da tampinha conduzindo a bola (p95, px por
  quadro) 3,7 → 0,2, 4,1 → 0,3 e 4,1 → 0,4; o servidor visto do aparelho, 59,8 a 60,5 passos/s; a correção média da
  previsão, 0,03 a 0,22 px.
- **O motor das salas**: 60,7 a 61,2 passos/s (v91) → 60 (59,9 em 10 s, contando a partida do relógio).

**A validação final (antes de publicar)** — a pedido: "uma versão de teste jogável para celular, comparar v91 e v92 com
facilidade, conferir os controles, a bola, as tampinhas, as colisões, a câmera e a fluidez, o offline e o online com
reconexão, as duas falhas restantes, e a versão de produção sem o painel"
- **A versão de testes no celular**: as memórias A (Padrão v92) e B (v91, tudo como era) já vêm prontas, e o A ⇄ B da pausa
  diz qual está valendo ("A ⇄ B · agora B (v91)"); o medidor da tela fica como está ao trocar.
- **A vibração do iPhone no toque armado** (`tools/v92/base.js`): no iPhone a vibração só sai dentro do toque; um toque um
  pouco adiantado que virava chute (o toque armado) saía sem vibrar. Agora, se a bola entra no alcance dentro da janela do
  toque armado, vibra no toque.
- **O soluço da internet** (`tools/v92/rede.js`): depois de ~0,5 s sem internet o servidor fica uns 5 u atrás da previsão
  (ele para a tampinha de quem não manda comando e descarta os comandos velhos que chegam juntos); a correção, logo acima do
  limite de 5 u, pulava. A sua tampinha agora desliza até 12 u e só pula no teleporte de verdade (a saída depois do gol, o
  fim) ou acima de 12 u. O maior pulo num quadro depois do soluço: ~90 → 8–13 px do mundo.
- **As duas falhas que sobravam**: `v90_ranking` — o cadastro recusava o e-mail errado com a mensagem genérica do zod 4 em
  inglês ("email: Invalid input"); a união do e-mail (`app/api/racha/authRouter.ts`) agora leva "E-mail inválido.". `v79` —
  o bot que assume a vaga de quem desistiu às vezes fazia gol no jogador parado do teste (3×1: +28 pela regra, o teste
  esperava +31) ou um gol pedido caía na comemoração; só o teste mudou (os gols seguem até o fim e os pontos saem do placar
  final). Nenhuma das duas mexia na partida; as duas aconteciam igual na v91 original.
- **A versão oficial**: `tools/v92/pacote.py --producao` monta o ZIP sem o experimental, sem o .bat de testes e sem o
  LEIA-ME de testes, e o confere aberto de novo.

**Testes**
- A bateria completa (`tests/roda_tudo.sh`) na versão final: 55 arquivos, 2.395 de 2.398 verificações ok (37 min). As 3
  que falharam passaram na repetição: o clube do `online` com P2P (falha de vez em quando nas duas versões) e duas medidas
  do ritmo do servidor feitas com o computador carregado (a janela do `v92_online` e a margem do `v92_reconexao` foram
  acertadas). As falhas antigas do `v90_ranking` e do `v79` foram corrigidas (ver A validação final).
- Na validação final: `tests/v92_celular_test.py` (45 com a v91 original, 35 sem ela: um iPhone e um Android de mentira
  com toques de verdade pelo CDP — o HUD em 3 celulares, a bola, a tampinha e a câmera, o PASSE/CHUTE, o toque armado, as
  8 direções do analógico, dois dedos, um lance com colisões igual passo a passo, a fluidez a 60/90/120 Hz, a vibração e o
  A ⇄ B da pausa), `tests/v92_reconexao_test.py` (23: soluço, apagão, queda, segundo plano, 24 s de internet ruim e a
  consistência com o servidor), `tests/v92_mista_test.py` (8: a v91 original e a v92 na mesma sala),
  `tests/v92_pacote_test.py` (7: os dois ZIPs servidos pelo `node server.js`) e, no `tests/v92_test.py`, a versão oficial
  num celular que já usou a de testes (35).
- Novos: `tests/v92_nucleo_test.mjs` (22: o servidor com o perfil da v91 dá quadros idênticos aos da v91 em 9 partidas —
  1v1 a 4v4, bots e humanos com a internet oscilando, COM CURVA, a regra de 3:00 —, o toque armado, a rede, os limites do
  perfil e o ritmo do motor), `tests/v92_test.py` (28: a versão oficial sem o painel, a física e um lance de 900 passos
  idênticos aos da v91, a cadência em 60 Hz com o relógio oscilando, 90 Hz, 59,94 Hz por 1 minuto, telas 1% mais rápidas
  e mais lentas e o relógio à deriva, o desenho, o toque armado, o analógico e o painel no PC e no celular) e
  `tests/v92_online_test.py` (16: a previsão contra o servidor de verdade com 40 ms de atraso, o chute na hora, o
  servidor oficial recusando o perfil do admin e o de testes aceitando, a previsão da v91 no painel e a queda segura).
- A UI: `tests/v92_ui_compara.py` fotografa 13 telas no PC (1280 × 720) e no celular deitado (844 × 390) na v91 e na v92
  com o mesmo relógio e o mesmo sorteio: 22 das 26 fotos idênticas pixel a pixel; as outras 4 diferem só no número do
  jogador e num prêmio sorteados a cada abertura (duas fotos da própria v91 diferem nos mesmos lugares). Na versão de
  testes, só a barra de abas dos AJUSTES muda (a aba TESTES v92 entra primeiro; a barra rola até a Conta).

## v91 — 21/10/2026 · o visual da imagem de referência em todas as telas

A pedido: "use a imagem enviada como referência principal e recrie o visual do meu jogo RACHA — Futebol de Rua nesse mesmo
estilo", com a tela inicial, o perfil, o cofre/skins, a loja, o ranking, as salas, os eventos, o Passe RACHA, os amigos, o
clube, o treino, o chat, os banners de perfil e as patentes no mesmo padrão — mantendo os botões dos lados, a tampinha em
destaque no meio e a identidade do RACHA. **Só a cara mudou**: a física (sha256 do bloco: `ad9f1d2216409b0e`), as regras, a
partida, o online, as contas, as moedas, as gemas e as skins são os mesmos, e cada botão abre o que abria (o build confere a
física; os destinos dos botões da tela inicial foram conferidos um a um contra a v90.1). Tudo da v91 fica atrás da classe
`.v91`: o código em `tools/v91/*.js` e o estilo em `app/public/game/v91.css` (depois do `v90.css`).

**A tela inicial**
- **O fundo é a própria quadra da imagem** (o alambrado, o RACHA grafitado com a coroa, a bandeira, o Cristo, as casas e o
  chão molhado), sem os botões dela: os buracos foram preenchidos com pedaços da própria imagem (`tools/v91/completa.py`,
  um preenchimento por exemplos feito aqui) e os lados foram estendidos para as telas largas (`tools/v91/fundo.py`). A
  tampinha do jogo fica exatamente onde a da imagem estava.
- **A faixa azul de cima**: o perfil (a tampinha, o nível no hexágono, o nome e o XP), a **patente** (a insígnia nova, o nome
  e a barra até a próxima divisão — tocar abre as patentes), as moedas e as gemas com o **+ verde**, o chat, o correio e os
  ajustes (no computador e no tablet, com 44 px de toque de verdade).
- **Os botões dos lados continuam** — LOJA (amarela), COFRE, CLUBE e TREINO; SALAS (azul), AMIGOS, RANKING e EVENTOS —, agora
  quadrados com o desenho grande, o nome embaixo, o contorno grosso e a borda na cor de cada um (roxo, índigo, azul e
  turquesa, como na imagem); o número vermelho de não lido no canto.
- **A tampinha no meio, em destaque**: a sua tampinha equipada em pé, com espessura (3D), a luz roxa atrás, o anel no chão e
  o reflexo no chão molhado, pulsando com a música (tocar abre o COFRE; segurar abre a roda das favoritas, como na v90). A
  luz e o anel são desenhados uma vez por tamanho (no celular o quadro fica leve).
- **Embaixo**: o PASSE RACHA (a coroa, o nível no hexágono dourado, a barra e o bilhete), as MISSÕES (a prancheta e o
  prêmio), o MODO (o campo, o nome e a setinha) e o **JOGAR amarelo grande** com o ▶ — a fileira ocupa a largura toda em
  qualquer tela (16:9, 19,5:9 do celular e 4:3 do tablet) e os números pequenos não ficam ilegíveis no celular.
- Um modelo pronto novo no editor, a **COROA RACHA** (a tampinha preta com o anel roxo e a coroa da imagem), logo depois da
  Clássica. Ninguém troca de tampinha sozinho: quem quiser equipa.
- Com a janela do computador em pé, a arrumação de antes (a de pé) com as peças novas no tamanho dela; no celular em pé, o
  GIRE O CELULAR também no azul-marinho.

**As telas** (perfil, cofre, editor da tampinha, loja, caixas, ranking, replays, salas e a sala aberta, amigos, comunidade,
clube, eventos, Passe RACHA, missões, correio, estatísticas, chat, treino, Ajustes, a entrada, a folha do JOGAR, a pausa e o
fim da partida)
- **A mesma faixa azul em cima** em todas: o VOLTAR amarelo, o título com o desenho novo, as moedas e as gemas com o +, e os
  quadrados do chat, dos amigos e dos ajustes (o RANKING e as telas da v88 — passe, eventos, missões, correio — ganharam as
  moedas e os quadrados que não tinham).
- A quadra da tela inicial desfocada atrás; os painéis azul-marinho com o contorno preto grosso e a luz em cima; o texto
  branco com contorno (Lilita One); o carvão da v71.1 desligado (as telas das salas, do clube e do editor voltam ao
  azul-marinho de quando foram desenhadas) — e o que ainda era carvão, preto ou marrom (a sala aberta, a folha do JOGAR, os
  cartões do COFRE, o Passe, as missões prontas, o treino, a pausa e o fim) também.
- **As cores por papel continuam** (as regras de contraste da v70): o amarelo da ação principal com a letra escura, o verde de
  confirmar, o vermelho de sair, o azul, o roxo e o neutro — só que com o volume e o contorno da imagem (o meio de cada
  degradê escuro o bastante para a letra branca: 4:1 ou mais).
- **O perfil** mostra o banner que está equipado atrás do nome (antes era sempre o mesmo) e a tampinha em pé, grande; logado,
  o bloco COMPETIÇÃO (v90) fica na coluna da esquerda (antes passava por baixo do cartão).
- **A sala aberta** (os times laranja e roxo, os espectadores e as escolhas) com a faixa azul, os cartões azul-marinho, o
  VOLTAR amarelo e a quadra atrás.
- **A entrada do jogo** com o letreiro grafitado do RACHA (o mesmo do perfil e do muro), o JOGAR ONLINE SEM CONTA no painel
  azul com o verde do JOGAR ONLINE.

**Banners de perfil e patentes**
- As 6 cenas do catálogo (Laje Noturna, Pôr do Sol, Muro Grafitado, Cristo ao Fundo, Arquibancada e Carnaval) agora são
  recortes da própria quadra da imagem, cada uma com a sua luz (`tools/v91/banners.py`); os banners do pódio (v90) continuam.
- **As 8 patentes redesenhadas** no estilo da insígnia "MESTRE 1" da imagem: o escudo lapidado com o contorno grosso e a
  **tampinha no meio** (a marca do RACHA: com a estrela no Bronze, na Prata e no Ouro, o brilho de 4 pontas na Platina e a
  pedra no Diamante — cada patente se reconhece pela forma, não só pela cor); a divisão no escudo (III = 1 ponto; II = 2
  pontos e as asas pequenas; I = 3 pontos, as asas grandes e a pedra em cima); da Élite para cima, a coroa (no Lendário, a
  grande). As mesmas patentes e os mesmos pontos da v79: só o desenho.

**Consertos que vieram junto**
- O controle Bluetooth (v88) não anda mais para dentro dos desenhos: os ícones novos usam `xlink:href` e o controle só mira
  botões de verdade (o direcional para a esquerda, do JOGAR, vai para o MODO).
- Os navegadores sem `color-mix()` (iOS 15 e antes) ganham as mesmas sombras sem a mistura de cor.

**Testes**: a bateria inteira (49 conjuntos, `tests/saida/logs/RESUMO.txt`) rodou na versão final: **46 passam**. Os 3 que
não passaram naquela rodada:
- `v90_ranking_test` (1 de 38): **já falhava na v90.1, igual** — "um e-mail escrito errado continua recusado" volta
  "email: Invalid input" em vez de "E-mail inválido" na plataforma de teste daqui (a validação da plataforma, `app/api`;
  nada da tela);
- `v881_jogo` (1 de 15): passou nas outras 4 rodadas desta versão (é a conta apagada e recriada, com esperas de tempo);
- `enxuto` (1 de 37): "ligou de novo, continua ligado ao reabrir" oscila — falhou 5 vezes em 31 rodadas na v91 e nenhuma em
  15 na v90.1. É o teste que regrava o armazenamento antigo a cada recarga (o `armazenamento` do `comum.abre`); um laço de 20
  recargas normais (ligar, salvar, recarregar) não falhou nenhuma vez. Fica anotado como pendência: a causa não foi achada.

Os testes que conferiam desenhos de antes foram atualizados para o desenho de agora, conferindo as mesmas coisas (o destino de
cada botão, nada se cobrindo, os toques de 44 px, as cores por papel e o contraste, nada rolando). Vários deles **já falhavam
na v90.1**, que mudou o lobby sem mexer neles (o `v71`, o `v77`, o `polimento`, o `v82` e o `v87_site` paravam no meio, sem
rodar o resto; agora rodam inteiros):
- `celular` (v77 → v91): o JOGAR com 154 de altura (de 360 a 440 de largura) a 22 da borda e o MODO com 126, dentro da faixa
  do JOGAR (a v90.1 também já falhava aqui: e o MODO dela tinha 42 px no menor celular);
- `v71`: o COFRE no lugar da TAMPINHA e o PASSE embaixo (v90), a PATENTE da faixa de cima (v91; ela entra nas caixas que não
  podem se cobrir), as telas sem o carvão da v71.1 (era: sem o azul-marinho) e o contorno da faixa azul;
- `v77`: nada em cima da tampinha (o RACHA está no muro), os desenhos novos, o correio no alto (os AMIGOS ficam na coluna da
  direita), a prancheta das MISSÕES e o banner equipado no perfil;
- `v78`: a tampinha do lobby abaixo da faixa azul (era: abaixo do letreiro, que saiu na v90);
- `polimento`: COFRE → COFRE (era TAMPINHA → SUA TAMPINHA) e a LOJA amarela com a palavra branca na placa escura;
- `v76`: a COROA RACHA é um modelo pronto novo (53 cartões; as 44 de antes continuam com o mesmo código);
- `v79`: a coroa das insígnias novas é marcada com a classe `ins-coroa`;
- `v81`: no lobby a barra do chat fica guardada desde a v90 (o chat abre pelo quadrado de cima, conferido);
- `v82`: o RANKING é a tela da temporada desde a v90 — **o PATENTES | LIGA DA SEMANA da v82 saiu do jogo na v90** (a lista
  das patentes de todos continua na plataforma e é conferida pelos dados que chegam ao jogo);
- `v87_site`: a entrada com a cara da v91 e o AMIGOS da coluna da direita (o de cima saiu na v90).

## v90 — 20/10/2026 · a nova temática do RACHA e o ranking completo da temporada

A pedido: a nova temática visual (preto fosco, roxo e laranja dos dois times, amarelo no JOGAR, pouco brilho), a tela
inicial reorganizada, a troca rápida de tampinhas, o COFRE e o RANKING de verdade (gols, assistências, pontos ranqueados e
Craque do Jogo), com temporadas, histórico, perfil e recompensas do TOP 3. **A física não mudou** (sha256 do bloco:
`ad9f1d2216409b0e`): o chute, o movimento, as colisões, o multiplayer, o login, as contas, as moedas, as gemas e as skins
continuam os mesmos. (A v89 — o lobby roxo e laranja com brilho — nunca foi para a `main` e saiu: a v90 toma o lugar dela.)

**O ranking (servidor e plataforma)**
- **Só conta o que o servidor viu.** O servidor das salas (`server/turma.js`) põe no **selo assinado** de cada conta os
  gols e as assistências que o **motor** contou (`h:1`, o número da partida `pid`, `gl`, `as`), só nas partidas que ele
  simulou. A plataforma (`app/api/racha/v90/ranking.ts`) soma isso no ranking da temporada — o que o aparelho manda não
  entra. Partida contra os bots, treino e sala antiga (com anfitrião) não entram em gols, assistências nem Craque do Jogo.
- **O critério da assistência** é o que o servidor já usava (`server/partida/sala.js · lance`), agora documentado em
  `app/contracts/v90.ts`: o toque imediatamente anterior ao do autor, de um companheiro, até 10 s antes do gol; se um
  adversário tocou no meio, não há assistência (a não ser o desvio rápido num chute que já ia no gol); gol contra não dá
  gol nem assistência; o autor nunca dá assistência para si mesmo.
- **Sem duplicar:** cada (partida, conta) entra uma vez (`ranking_partidas`). **Desempate** sempre igual: o maior número →
  quem chegou primeiro nele → o menor número da conta. **Craque do Jogo** = o "melhor da partida" de sempre (mais gols,
  depois assistências, depois o time que venceu). **Pontos ranqueados** = os pontos da patente (as regras da v82).
- **Temporadas:** a T1 nasce das datas do catálogo (a do Passe RACHA). O RACHA CONTROL abre a próxima e **fecha** a que
  acabou: a classificação de cada categoria congela (todas as posições), a ranqueada faz o **recomeço parcial** (metade dos
  pontos, uma vez por temporada) e, **depois** de conferir, as **recompensas do TOP 3** são entregues (uma vez só). As
  estatísticas de sempre da conta não zeram.
- **Recompensas do TOP 3** (só cosméticas): uma tampinha exclusiva para o 1º, o 2º e o 3º de cada categoria (12 no total,
  com o símbolo grande da categoria: bola, seta do passe, coroa e estrela; bordas de ouro, prata e bronze), um banner do
  pódio e um título com a temporada (`catalogo88.json`, raridade "exclusivo", fora da loja).
- Tabelas novas: `temporadas_ranking`, `ranking_sazonal`, `ranking_partidas`, `ranking_final`, `recompensas_ranking`
  (migração `app/db/migrations/v90_ranking.sql`; nada que já existia muda).

**A tela inicial e o visual**
- **Cenário novo**: a quadra do bairro no fim de tarde (as casas, o alambrado, o muro com pouco grafite, os postes e a
  arquibancadinha), em desenho vetorial dentro do jogo (`tools/v90/cenario.svg`).
- **Perfil compacto** em cima à esquerda (a tampinha, o nome, o nível, o XP e a **patente**; tocar abre o perfil), o
  letreiro RACHA no meio, e à direita as moedas e as gemas (com o +), o correio, o chat e os ajustes.
- **Os lados**: LOJA, **COFRE**, CLUBE e TREINO; SALAS, AMIGOS (convites e chamar para jogar), RANKING e EVENTOS — com o
  desenho, o nome e uma legenda. **Embaixo**: PASSE RACHA, MISSÕES DIÁRIAS, o modo e o **JOGAR amarelo**.
- **A tampinha do meio**: tocar abre o COFRE; **segurar** abre a **roda com as 3 favoritas** — arrastar até uma e soltar
  equipa. As favoritas são marcadas no COFRE (★) e vão para a conta junto com as tampinhas salvas.
- **COFRE**: as tampinhas (equipar, favoritar e o CRIAR TAMPINHA), avatares, banners, efeitos, bolas, comemorações, gols
  e emotes (ainda não existem no jogo: a categoria avisa que chegam numa próxima atualização).
- **A tela de RANKING**: as 4 categorias (assistências em turquesa, com as linhas de passe no TOP 1), o pódio com as
  tampinhas de verdade (ouro, prata e bronze), a lista do TOP 4 ao TOP 20 com o perfil de cada um, a **minha posição**
  fixa embaixo (mesmo fora do TOP 20, e quanto falta), as temporadas anteriores e os prêmios do TOP 3.
- **O perfil** (o público e o seu): as melhores colocações (TOP 1 — Assistências, Temporada…), os números validados, a
  melhor colocação, a patente, as exclusivas ganhas e os títulos; o **banner do pódio** atrás do nome e do ID.

**Testes:** `tests/v90_ranking_test.mjs` (35 verificações: uma partida 2v2 de verdade no servidor com passe e gol, o selo
adulterado, a mesma partida duas vezes, os bots, o TOP 20, o desempate, a posição fora do TOP 20, o perfil privado, o
fechamento, o recomeço parcial, as recompensas uma vez só, o histórico e a temporada nova) e a bateria inteira.

## v88.2 — 18/10/2026 · jogar online sem conta, só com o nome

A pedido: "a sala funcionar online sem criar conta, só botando o nome de usuário". A física não mudou (sha256 do bloco:
`ad9f1d2216409b0e`).

- **A tela de entrada do jogo** ganhou, em cima de tudo, **JOGAR ONLINE SEM CONTA**: o campo **Seu nome no jogo** e o botão
  **JOGAR ONLINE**. O nome (2 a 12 letras, com o filtro do chat: sem palavrão, link, @, telefone ou e-mail) vira o nome do
  perfil; a tela fecha, abre as **SALAS** (a GALERA) e o jogo já conecta no servidor das salas. Sem conta dá para criar sala,
  entrar pelo código ou pelo JOGAR AGORA, jogar a partida (no servidor), o chat da sala e o Chat do Brasil. Na próxima vez o
  nome já vem escrito. O que é da conta (o progresso salvo na conta, a patente, o XP, os amigos, o correio, a loja da conta)
  continua pedindo a conta. (`tools/v88/visitante.js`)
- **Sem a plataforma de contas no endereço** (o site de teste do Render, que roda só o servidor das salas, ou o GitHub
  Pages), a tela mostra só o JOGAR ONLINE e o SÓ TREINAR OFFLINE — as abas ENTRAR e RECUPERAR não funcionariam ali (antes,
  o único jeito de entrar nas salas ali era o "SÓ TREINAR OFFLINE", que dizia o contrário). Com a plataforma, o JOGAR ONLINE
  fica em cima e o "OU ENTRE NA SUA CONTA" embaixo.
- **A plataforma** (o servidor das salas montado nela) passou a aceitar quem joga sem conta, como visitante (o número de
  visitante, de 7 dígitos; nunca o de uma conta). `RACHA_VISITANTES=0` volta ao login obrigatório da v84 — aí o JOGAR ONLINE
  mostra o LOGIN OBRIGATÓRIO de sempre. O site de teste do Render já aceitava visitante (`RACHA_VISITANTES=1` no
  `render.yaml`).
- **Testes:** `tests/v882_visitante_test.py` (o jogo de verdade em dois navegadores: num servidor como o do Render, duas
  pessoas só com o nome criando a sala, entrando pelo JOGAR AGORA, vendo o nome uma da outra e jogando; os nomes recusados;
  o nome lembrado; na plataforma, a sala sem conta e, com `RACHA_VISITANTES=0`, o LOGIN OBRIGATÓRIO). O
  `plataforma_salas_test.mjs` confere o login obrigatório com `RACHA_VISITANTES=0` e o visitante no padrão; o
  `v881_contas_test.mjs` confere que o bilhete de antes do zerar só entra como visitante (nunca com o número da conta).
  A bateria inteira com a v88.2 (`tests/saida/logs/`): 48 suítes, 2.227 verificações, nenhuma falha.

## v88.1 — 18/10/2026 · as contas pelo Dono: cadastro fechado, RACHA CONTROL › Contas, ZERAR CONTAS e o login do Dono

A pedido: "no painel Admin, um sistema em que só eu adiciono contas novas para jogar", "o login de Admin do RACHA CONTROL"
e "zerar os IDs e me mandar o 01". A física não mudou (o build confere o sha256 do bloco de física: `ad9f1d2216409b0e`).
O banco não ganhou tabela nem coluna (o cadastro, o contador e a hora do zerar ficam na tabela `contadores`): não precisa de
migração.

- **Cadastro fechado (o padrão novo).** O `auth.registrar` recusa com a explicação ("as contas novas são criadas pelo dono
  do RACHA") e a rota pública `auth.cadastro` diz se está aberto. O login do jogo (sem o site) mostra só **ENTRAR** e
  **RECUPERAR**, com o aviso; o **CRIAR CONTA** do Ajustes › Conta some e os outros botões CRIAR CONTA do jogo levam ao
  ENTRAR com o aviso; a página `/entrar` do site esconde a aba "Criar conta". Quem decide é o Dono, no painel (o que ele
  escolhe fica no banco). Sem nada no banco, vale `RACHA_CADASTRO=aberto|fechado` (para testes e para o computador de quem
  desenvolve); sem a variável, fechado.
- **RACHA CONTROL › 👤 Contas** (`app/src/pages/AdminContas.tsx` + `app/api/racha/v88/donoContas.ts`), **só para a conta
  do Dono (000001)** — nem um segundo "Dono" (o cargo dado pelo painel) vê a aba, e cada rota confere de novo no servidor
  (e vai para a auditoria):
  o resumo (quantas contas, o número da próxima, o cadastro), **CRIAR CONTA** (usuário, nome no jogo, e-mail opcional e a
  senha — em branco, o servidor gera uma fácil de ditar, como `abcd-EFGH-2345`; o usuário, a senha e o código de
  recuperação aparecem **uma vez**, com o botão COPIAR PARA MANDAR), a lista das contas com busca, **SENHA NOVA** (a conta
  sai de todos os aparelhos, e o código de recuperação também é trocado) e **ABRIR / FECHAR O CADASTRO**.
- **ZERAR CONTAS** (só a conta **000001**, com a senha dela e a palavra ZERAR): numa transação, apaga todas as outras contas
  e tudo o que era delas em todas as tabelas (sessões, cargos, 2FA, selos, progresso, carteira e movimentações, itens,
  conquistas, partidas, patente, missões, passe, eventos, cartas, mensagens, amigos, pedidos, bloqueios, denúncias,
  punições, clubes delas e os pedidos/convites de clube); o Dono fica com o progresso, a carteira, os itens, as
  estatísticas e os clubes dele (só com ele); ficam a auditoria, os eventos, as cartas para todos e o registro das
  distribuições e os limites de tentativa (onde fica a marca de uso único de cada resultado online). Os números voltam a
  contar: **a próxima conta é a 000002**. O servidor das salas montado na plataforma
  derruba as conexões das contas apagadas e esquece o que era delas (os troféus da turma, os duelos, os convites, o
  histórico dos chats, os lugares guardados nas salas e nas partidas) e passa a recusar o bilhete assinado antes do zerar
  (o bilhete leva a hora `t`; a hora do zerar, tomada depois do commit, fica guardada e vale também depois de reiniciar —
  e, se o servidor das salas não viu o zerar, ele esquece as contas apagadas ao ligar). No aparelho, o começo do jogo
  (`tools/v82/inicio.js`, pela troca da v88.1) confere a conta que entrou: a hora em que ela nasceu (anotada no aparelho na
  primeira vez) e o que o servidor diz — se ela nasceu depois do último zerar (sem comparar relógios: fora a 000001, toda
  conta que existe nasceu depois do zerar). Se o número é de uma conta apagada, o progresso guardado para aquele número sai
  antes de o jogo ler — nada passa para a conta nova (e o do Dono continua).
- **O login do Dono.** No boot, a plataforma confere a conta 000001 (`garanteDono` em `app/api/racha/contas.ts`): com
  `RACHA_OWNER_PASSWORD` definida, a senha do Dono passa a ser a da variável (se mudou, as sessões antigas do Dono caem e o
  2FA do painel é zerado: configura de novo no primeiro login); sem a conta 000001, ela é criada com a variável. A senha do
  manual (`Racha@Dono1`, escrita no repositório) **não abre mais** o RACHA CONTROL nem a conta do Dono no jogo (com ela,
  qualquer pessoa podia chegar antes do Dono na chave do 2FA). Com a variável definida, a senha do Dono não muda pelo site
  nem pela recuperação (o aviso diz para trocar a variável). O `db/seed.ts` sorteia uma senha forte quando a variável não
  existe. O login do painel mostra a chave do 2FA em grupos de 4, com o passo a passo do app autenticador.
- **Correções encontradas no caminho** (já existiam antes desta versão):
  1. **o RACHA CONTROL não abria no navegador**: depois do código do 2FA, o painel ficava parado na tela do 2FA — o
     `verificar2fa` grava o cookie `racha_admin`, mas as rotas do painel só liam o cookie do jogo. Conferido rodando o
     commit anterior num navegador (o painel não abriu) e o novo (abre e continua aberto depois de recarregar). O
     **SAIR DO PAINEL** encerrava a sessão do **jogo** em vez da do painel; agora encerra a do painel.
  2. **o site não compilava**: `EntrarPage.tsx` e `RedefinirPage.tsx` importavam `../auth`, `../trpc` e
     `react-router-dom`, que não existem no projeto (o `npm run build` parava ali). E a recuperação por código do site
     mandava os campos errados e recusava os códigos com letras (o código é `RACHA-` e três grupos de 0–9/A–F).
  3. **o número da conta** saía de duas consultas soltas (`UPDATE … LAST_INSERT_ID(…)` e `SELECT LAST_INSERT_ID()`) num
     pool de conexões do MySQL — o `LAST_INSERT_ID` é da conexão. Agora as duas vão numa transação (a mesma conexão), e
     se o contador ficar para trás de um número em uso, o servidor pula.
- **Revisão independente** (um segundo agente leu o código sem ver o trabalho; nenhum furo grave) — e o que ela pediu
  entrou: as contas são da conta **000001** (não de qualquer cargo Dono), a SENHA NOVA troca também o código de recuperação,
  o zerar não apaga mais os limites (a marca de uso único dos resultados online), a hora do zerar é tomada depois do commit,
  o servidor das salas esquece as contas apagadas também ao ligar, a decisão do aparelho vem do servidor (sem comparar
  relógios) e o `db/seed.ts` não dá o cargo de Dono para uma conta com o usuário do Dono e outro ID.
- **Testes novos:** `v881_contas_test.mjs` (a plataforma de teste em três boots com o mesmo banco), `v881_painel_test.py`
  (o RACHA CONTROL e o login do site num navegador de verdade: as páginas do `app/src` juntadas pelo `tests/ui_site/` com o
  React desta máquina e um cliente de teste no lugar do `@trpc/react-query`, que o npm não instala aqui) e
  `v881_jogo_test.py` (o login do jogo com o cadastro fechado e o aparelho tirando o que era das contas apagadas — com o
  controle negativo: sem a proteção, as contas novas herdavam o progresso das apagadas) — 63, 26 e 15 verificações. Os
  testes da v88 que criam contas pelo jogo sobem a plataforma de teste com `RACHA_CADASTRO=aberto`. A bateria inteira
  (`bash tests/roda_tudo.sh`; a saída de cada suíte em `tests/saida/logs/`): 47 suítes, 2.213 verificações, nenhuma falha.

## v88 — 18/10/2026 · a atualização completa dos menus (amigos, mensagens, correio, loja, clube, treino, missões, eventos, passe, chat, denúncias, modo e campo, estatísticas, espectador, ajustes e controle)

A pedido (o "PROMPT — ATUALIZAÇÃO COMPLETA DO RACHA" e as 4 imagens de referência): os botões e menus que faltavam, no jogo
de sempre, ligados às contas e ao servidor — sem criar outro jogo e sem mexer na física (o build confere o sha256 do bloco
de física: `ad9f1d2216409b0e`, o mesmo da v87.1; a física, a movimentação, os chutes e as colisões são os mesmos). Cosmético
continua sem dar vantagem. O relatório completo (o que entrou em cada parte do pedido, o que foi preservado, as pendências
reais e como instalar e testar) está no `LEIA-ME.md`, na seção "v88".

Feita em três etapas (três commits):

- **Etapa 0 · a plataforma de teste** (`tests/plataforma/`): o código de verdade da plataforma (`app/api`) rodando sem
  MySQL e sem npm (um drizzle pequeno sobre o `node:sqlite`, um tRPC pequeno no formato do jogo e o servidor das salas
  montado no mesmo endereço). É onde as contas, o banco e o social foram testados de ponta a ponta. Os testes do online
  ficaram em dia com as salas hospedadas da v83.
- **Etapa 1 · a plataforma** (`app/`): as tabelas novas (`app/db/migrations/v88_social.sql`: mensagens, correio,
  correio_global, missoes_progresso, eventos, eventos_progresso, passe_temporada, clube_pedidos e as colunas novas), o
  catálogo único (`app/contracts/catalogo88.json`, o mesmo arquivo para o jogo e o servidor) e as regras
  (`app/contracts/v88.ts`), e as rotas `social`, `mensagens`, `correio`, `loja`, `missoes`, `passe`, `eventos`, `estat`,
  `conta` e `admin88` (`app/api/racha/v88/`). A carteira do servidor (`economia.ts`) passou a ser usada: logado, moedas,
  gemas e itens são da conta (a primeira vez leva o saldo da cópia do progresso, uma vez, até 50.000 moedas, 5.000 gemas e
  200 peças). Amigos (cancelar, pedir de novo depois de recusado, limite de 100, bloqueio dos dois lados, avisos),
  denúncias com os 7 motivos e a proteção contra abuso, clube (admins, pedidos, estatísticas, histórico, ranking).
- **Etapa 2 · o jogo e o servidor das salas** (este commit): os módulos do jogo em `tools/v88/*.js` (colados pelo
  `tools/v88/v88.py`) e o estilo em `app/public/game/v88.css`; o social ao vivo no servidor das salas
  (`server/social88.js`, ligado no `server/turma.js`): o status dos amigos, os convites em tempo real, o chat dos amigos,
  do clube e da equipe, o bloqueio no servidor e a denúncia de mensagem com motivo (vai para a tabela do RACHA CONTROL);
  e as abas **EVENTOS** e **CORREIO** do RACHA CONTROL (`app/src/pages/AdminV88.tsx`).

O que mudou no jogo (detalhes no LEIA-ME):

- **Lobby:** o mesmo da v77 (o fundo da favela com o Cristo, a tampinha equipada no meio, o perfil, as moedas, as gemas, a
  patente, o chat, o JOGAR e os botões de antes nos mesmos lugares). Apareceram o **CORREIO** (o botão que já existia
  escondido como "em breve": mensagens e correio) ao lado dos ajustes e o **PASSE** (o outro que estava escondido, agora um
  quadrado no topo com o nível), e entrou a **lista dos amigos** à direita (avatar, nome, status de verdade, o botão de cada um, VER TODOS e o sinal da
  conexão). A lista desce quando cobriria o Cristo (`v88AmgEncaixa`). Os números de não lido nos botões que já existiam.
  Sem conta, AMIGOS, EVENTOS e DESAFIOS fazem o que sempre fizeram neste aparelho; com a conta, abrem as telas da conta.
- **Amigos** (buscar por nome ou ID, pedidos, aceitar, recusar, cancelar, remover, perfil, online/offline/em partida,
  chamar para a sala ou para o time, aceitar convite, bloquear, recentes, adicionar pelo perfil e pelo resultado),
  **Mensagens** (Sistema, Amigos, Clube, Convites, Recompensas, com as não lidas), **Correio** (COLETAR conferido no
  servidor, uma vez), **Loja** (Destaques, Tampinhas, Bolas, Efeitos, Comemorações, Gols, Banners, Avatares, Pacotes,
  Ofertas e o Inventário; o servidor confere o preço e o saldo), **Clube** (pedir para entrar, pedidos, admins, chat do
  clube, estatísticas, histórico, ranking), **Treino** (POSICIONAMENTO, DEFESA, GOLEIRO e TREINO COM BOTS entraram ao lado
  dos de sempre; campo, tamanho, dificuldade e o relógio do treino livre; a mesma física; o prêmio do treino com a conta é
  pago pelo servidor, com o teto do dia, e o treino com bots não vale nada), **Missões** (diárias, semanais, da temporada e
  especiais), **Eventos** (login diário, desafios, a Copa dos Amigos, temporada, temporários — configuráveis no servidor e
  no RACHA CONTROL), **Passe RACHA** (temporada, 30 níveis, trilha grátis e premium — com 9 tampinhas exclusivas na
  premium, 5 delas novas: Laje Neon, Pipa no Céu, Cria do Beco, Onça da Quebrada e Fogo no Asfalto), **Chat** (MUNDO, SALA, EQUIPE, CLUBE e
  AMIGOS; silenciar, denunciar com motivo, bloquear; o filtro e a trava de spam de antes valem nos canais novos),
  **Denúncias** (a janela com os 7 motivos; na ficha do chat, o motivo ali mesmo, que funciona também na partida),
  **Modo e campo** (a folha do MODO: RANQUEADA, SALAS e TREINO; os campos com o desenho, o nome e os modos em que valem —
  a Arena leva a uma sala nova nela ou ao treino nela), **Estatísticas** (DA CONTA, com filtro de temporada e de modo, ao
  lado do DESTE APARELHO de antes), **Espectador** (a câmera CAMPO INTEIRO na volta do CÂMERA e o SAIR na barra),
  **Ajustes** (Música e Efeitos, sensibilidade do analógico, idioma, a aba nova PRIVACIDADE com as notificações, a
  privacidade da conta, os silenciados e os bloqueados, e EXCLUIR MINHA CONTA) e o **controle Bluetooth** (API Gamepad:
  as mesmas 32 direções e velocidade do toque, A/B/X/START, os menus pelo direcional).
- **O fim da partida** com a conta: as moedas que a conta recebeu (com o teto do dia), as missões, o passe e o melhor da
  partida (online: o do servidor das salas; contra os bots: o jogo diz quem foi e o servidor só aceita se for possível).

Mudou de propósito, e os testes de antes foram postos em dia (com um comentário "v88" em cada troca):
`camera_test.py` (a volta do CÂMERA passa pelo CAMPO INTEIRO), `v73_test.py` (12 cartões no TREINAMENTO: os 8 de sempre na
mesma ordem e os novos depois), `v71_test.py` (o PASSE voltou ao topo; 7 abas nos Ajustes), `v77_test.py` (o CORREIO no
topo), `v79_test.py` e `enxuto_test.py` (a folha do MODO mostra os dois campos com os modos de cada um; a
ranqueada continua só no Estádio), `v81_test.py` (a denúncia pede o motivo; a aba EQUIPE ao lado da PARTIDA),
`perfil_test.py` (a troca de gemas mora em OFERTAS) e `v87_site_test.py` (com a conta, o AMIGOS abre os amigos dentro do
jogo; o painel do site continua para o perfil da conta).

Testes novos: `tests/v88_plataforma_test.mjs` (a plataforma de verdade no banco de teste, três contas e o reinício),
`tests/v88_social_test.js` (o social ao vivo no servidor das salas), `tests/v88_salas_plataforma_test.mjs` (o mesmo com o
servidor montado na plataforma), `tests/v88_cliente_test.py` (o jogo de verdade logado em dois e três navegadores, pelos
botões) e `tests/v88_controle_test.py` (o controle Bluetooth com um controle simulado no navegador). Os cinco entraram no
`tests/roda_tudo.sh`.

## v87.2 — 17/10/2026 · moedas e gemas para testar o jogo

A pedido: moedas e gemas para testar no jogo (no site com as contas também, não só na demonstração).

- **O presente de teste vale na produção** quando o `app/public/game/config.js` pede — e o do pacote pede:
  `presente: true` dá **50.000 moedas e 5.000 gemas**, uma vez em cada aparelho e em cada conta (o id `teste-v87`: quem já
  tinha ganho o presente antigo da demonstração, o `v32`, também recebe). `presente: {id, moedas, gemas}` dá outro valor, e
  cada id novo dá de novo (até 10 milhões de moedas e 1 milhão de gemas). **No lançamento, apague a linha** (ou
  `presente: false`): o jogo volta a começar com 500 moedas e 25 gemas. A demonstração continua igual (o `v32`, e o
  `presente: false` tira).
- A janela PRESENTE, fora da demonstração, diz que é um presente de teste (o texto da demonstração fala que ele não existe no
  lançamento).
- As moedas e as gemas só compram cosméticos (as peças da tampinha): a física e os números do jogo são os mesmos para
  todos. Elas moram no progresso do jogador (o aparelho e a cópia do progresso na conta), como sempre; a carteira do servidor
  (`app/api/racha/economia.ts`) continua sem uso.
- Arquivos: `tools/v87/v87.py` (o `presenteTeste()` e a condição do presente), `tools/v87/site.js` (o texto da janela) e
  `app/public/game/config.js`.
- Testes: `tests/v872_presente_test.py` (novo: o presente na produção com o `config.js` do pacote, uma vez só, a loja com o
  presente, o `presente: false`, o presente com outro valor e o teto, a demonstração igual) e o `tests/v87_site_test.py` (a
  conta que entra pelo jogo ganha o presente uma vez, e a janela). O `tests/comum.py` abre os outros testes como o
  lançamento (`presente: false`, a não ser que o teste diga outra coisa). A plataforma de mentira
  (`tests/v87_plataforma_falsa.mjs`) passou a entregar os arquivos ao lado da cópia de teste (o `config.js`, o `rua.js`, o
  `lobby.js`…), que antes faltavam nela.

## v87.1 — 17/10/2026 · o chute 15% abaixo da versão antiga

A pedido, depois de jogar: o PASSE, o CHUTE e o teto da bola ficaram **15% abaixo dos da versão antiga** (a v84).

- `FORCA_KICK` 250 → **212,5** (PASSE), `FORCA_POWER` 400 → **340** (CHUTE) e `LIMITE_VEL_BOLA` 55 → **46,75 u/s**, iguais no
  `backup/racha.html` (AJUSTES) e no `server/partida/fisica.js` (na v86 eram 275, 440 e 60). A bola parada sai a 21,25 e
  34 u/s (eram 25 e 40); os bots, o treino, a CURVA e as previsões usam essas constantes e acompanham sozinhos.
- Testes: o `tests/v86_chute_test.py` confere os números novos (18/18); o `tests/v78_test.py` lê as forças com meio
  (212,5); os textos do `server/partida/sala.js` e do `tests/v83_partida_test.mjs` com o teto novo.

## v87 — 17/10/2026 · tudo dentro do jogo: o site abre o jogo direto, em tela cheia

A pedido, depois de jogar no site com a plataforma: a barra de cima (a conta, o SAIR) e as abas (Perfil, Carreira,
Estatísticas, Conquistas, Inventário, Amigos, Ranking) ficavam por cima do jogo e espremiam a tela.

- **A plataforma abre o jogo direto** (`/game/racha.html`, na página inteira): `app/api/lib/vite.ts` redireciona a raiz no
  servidor; `app/src/main.tsx` faz o mesmo no modo de desenvolvimento; no `app/src/App.tsx` a raiz e os endereços
  desconhecidos levam ao jogo (`IrParaOJogo`, sem laço se o jogo não estiver no build). O jogo dentro do site, com a barra
  e as abas (o jeito de antes), continua em `/jogo-no-site`. As páginas da conta continuam no site (`/perfil`, `/amigos`…).
- **O login é o do jogo** (o da v84, com ENTRAR, CRIAR CONTA, RECUPERAR e SÓ TREINAR OFFLINE), agora **com a cara do jogo**
  (o cinza-carvão das janelas, o amarelo dos botões, o contorno de tinta, a Lilita One) e compacto no celular deitado.
- **Quem já entrou pelo site entra direto no jogo:** sem a sessão no aparelho, o jogo pergunta ao `auth.eu` pela sessão do
  site no mesmo endereço (o cookie `racha_sessao`) antes de mostrar o formulário (`RACHA84.cookie`; o jogo não guarda senha
  nem token nesse caso). O SÓ TREINAR OFFLINE já aparece enquanto ele confere e, escolhido, vale.
- **As coisas da conta pelos botões do jogo:** o que o jogo já tem (perfil, ranking, tampinha, clube, Ajustes) continua lá;
  o que só existe no site abre **por cima do jogo**, num painel com o VOLTAR AO JOGO (o jogo continua aberto embaixo, sem
  recarregar), pelos botões que já existiam: o AMIGOS do lobby e o ABRIR AMIGOS da tela AMIGOS (os amigos da conta), o ABRIR
  O PERFIL DA CONTA (o nome do cartão) e o VER PERFIL do chat. Dentro do painel, a página do site mostra só as abas da conta
  (`Layout.tsx`); o "Jogar" de lá e o Esc fecham o painel. Antes, sem o site por fora, esses botões não faziam nada.
- **SAIR DA CONTA** em Ajustes › Conta (o da v84) e, para a equipe, o **RACHA CONTROL** ao lado (abre o `/admin`).
- Depois do login pelo jogo, a conta completa vem do `auth.eu` (o XP, a patente e o cargo).
- Arquivos: `tools/v87/v87.py` e `tools/v87/site.js` (a etapa nova do build, depois da v84), `tools/aplicar_rua.py`,
  `tools/mapa_codigo.py`, `app/api/lib/vite.ts`, `app/src/main.tsx`, `app/src/App.tsx`, `app/src/components/racha/Layout.tsx`.
- Testes: `tests/v87_site_test.py` (novo, com a plataforma de mentira `tests/v87_plataforma_falsa.mjs`: a raiz leva ao jogo,
  a API tRPC com token ou cookie, as páginas da conta) — o login do jogo, entrar, as páginas por cima do jogo, o SAIR, a
  sessão do site, o RACHA CONTROL, o offline enquanto confere e o jogo sem a plataforma. O `npm run build` da plataforma não
  rodou neste ambiente (o registro do npm não responde daqui): o `App.tsx`, o `Layout.tsx` e o `main.tsx` de verdade foram
  compilados com o esbuild e testados no Chromium com stubs no lugar do react-router e do tRPC.

## v86 — 17/10/2026 · a mecânica clássica de volta, com o chute mais forte

A pedido, depois do teste da v85 no site: a mecânica da v84 de volta e só a força do chute mudada.

- **A mecânica da v84 voltou** (no jogo e no servidor): a física (o movimento que soma e corta no teto e para ao soltar, o
  chute força ÷ massa, os materiais, o giro), as quadras e as marcas, o analógico de 32 direções, os botões 1/2/3 com os
  0,02 s, o comando `button` na rede, a câmera da base, os bots, o treino e as previsões. Arquivos: `backup/racha.html`,
  `tools/partida_rua.js`, `tools/v78/bots.js`, `tools/v70/camera.py`, `tools/v70/online.{py,js}`,
  `tools/v70/interface.{py,js}`, `server/turma.js`, `server/partida/fisica.js` e `server/partida/sala.js` — os da v84 com os
  textos da v85. Saíram `server/partida/nucleo_fisica.js`, `tools/v85/FISICA_RACHA.md`, `tests/v85_fisica_test.mjs` e
  `tests/v85_sincronia_test.py`.
- **O chute:** `FORCA_KICK` 250 → **275** (PASSE), `FORCA_POWER` 400 → **440** (CHUTE), `LIMITE_VEL_BOLA` 55 → **60 u/s**,
  iguais no `backup/racha.html` (AJUSTES) e no `server/partida/fisica.js`. A bola parada sai a 27,5 e 44 u/s (eram 25 e 40).
- **Continua da v85:** os textos próprios, as chaves sem a marca e a migração das antigas (a chave do modo também:
  `racha-treino-modo-v1`), as fontes no pacote, o SÓ TREINAR OFFLINE, a imagem da favela fora, o FPS verde a 90% do alvo,
  o build reconciliado (`tools/v84/`) e o site de teste (v85.1).
- **Comentários** da mecânica que voltou sem o nome do outro jogo e sem as descrições da análise; o cabeçalho do
  `server/partida/fisica.js` diz o que ele é (o porte da física do jogo) e aponta para o `PROVENIENCIA.md`, que registra
  a origem da mecânica da v86.
- **Build:** `tools/aplicar_rua.py` sem o núcleo FR-85; o sha256 do bloco de física é o da v86 (`ad9f1d22…`).
- **Testes:** `tests/v86_chute_test.py` (novo, 18 verificações); `tests/v85_online_test.py` percebe a mecânica clássica
  (o `button`, as 32 direções e a força do PASSE e do CHUTE na sala hospedada); os testes que a v85 tinha ajustado à FR-85
  (v78, v83_sala, v83_salas_ws, servidor) voltaram aos da v84; o `tests/roda_tudo.sh` roda o v86_chute.
- **Repositório:** as duas migrações da v84 (`app/db/migrations/v84_economia.sql` e `v84_login_obrigatorio.sql`) entram no
  git — o `app/.gitignore` ignorava `db/migrations/*.sql` e elas tinham ficado de fora do GitHub na v85. O `SHA256SUMS.txt`
  (que confere o pacote da auditoria) e os logs da bateria da v85 ficaram na branch `v85-auditada`; os logs da bateria da
  v86 estão em `tests/saida/logs/`.
- Um jogo da v85 (que manda `acao`) não chuta num servidor da v86, e vice-versa: o jogo e o servidor vão juntos.

## v85.1 — 17/10/2026 · o site de teste (Render e GitHub Pages)

- `server/servidor.js`: `--visitantes` (`RACHA_VISITANTES=1`) aceita nas salas quem joga sem conta — opcional; o padrão
  continua o da v84 (só com a conta da plataforma). `/health` responde como o `/saude`.
- Raiz do repositório: `server.js` (atalho que sobe o `server/servidor.js` com o modo visitantes, para o site de teste sem
  a plataforma de contas), `package.json`, `render.yaml` (Render: `node server.js`, `/health`, modo visitantes, o GitHub
  Pages como origem permitida), `Dockerfile`, `INICIAR-NO-WINDOWS.bat`, `README.md`, `.gitignore`.
- Branch `gh-pages`: só o jogo (`app/public`), para o GitHub Pages.
- O jogo, a física e os testes são os da v85 (nada mudou neles).

## v85 — 17/10/2026 · auditoria de proveniência e reimplementação própria

Feita a partir da v84 entregue (o pacote "OKComputer", `RACHA_v84`, com o `app/public/game/racha.html` de SHA-256
`efc914cd5c3ed265f26e…`). Os detalhes, as evidências e os testes estão nos relatórios da auditoria; o resumo dos
componentes está em `PROVENIENCIA.md`.

### Build reconciliado (antes de qualquer correção)
- `tools/v84/` (novo): `v84.py`, `login_cedo.js` e `login.js` refazem como etapa do build as mudanças da v83/v84 que tinham
  sido editadas direto no jogo gerado (os textos das salas hospedadas e o login obrigatório). Com elas, o build voltou a
  gerar exatamente o arquivo entregue (mesmo SHA-256). `tools/aplicar_rua.py` ganhou a etapa `v84/v84`.

### Física própria (FR-85)
- `server/partida/nucleo_fisica.js` (novo): o núcleo da física FR-85 (números e funções), o mesmo arquivo no jogo e no
  servidor. Especificação em `tools/v85/FISICA_RACHA.md`.
- `tools/aplicar_rua.py`: cola o núcleo no jogo (marca `/*NUCLEO_FISICA*/`, `window.RACHA_FISICA`) e confere o SHA-256 dele e
  o do bloco de física.
- `backup/racha.html` (o jogo-base): o bloco AJUSTES dá nomes aos números do núcleo; o bloco PHYS chama o núcleo (movimento,
  batidas, chute, bola, analógico); quadras, marcas, saída e barreira pela regra própria; o treino, a previsão do convidado
  e o online usam as mesmas funções.
- `server/partida/fisica.js` (reescrito sobre o núcleo) e `server/partida/sala.js` (o motor das salas sobre o núcleo).
- `tools/v78/bots.js`, `tools/partida_rua.js`, `tools/v70/camera.py`, `tools/v74/campo.js`: a previsão do chute, o analógico,
  a folga da câmera e as vagas do campo na FR-85.

### Controles e protocolo
- Analógico de 256 direções (eram 32).
- Botões PASSE/CHUTE pelo gatilho da FR-85 (o último apertado vale; segurando, espera a bola; um aperto, um chute); saíram
  os estados 1/2/3 e o intervalo de 0,02 s.
- Rede: o comando `input` leva `acao` (bits: 1 = PASSE, 2 = CHUTE) no lugar de `button` — `tools/v70/online.py`,
  `tools/v70/online.js`, `server/turma.js`, `server/partida/sala.js`. Um jogo da v84 não chuta num servidor da v85.
- Câmera da base com meia-vida de 0,18 s; contador de FPS verde a partir de 90% do alvo.

### Textos, marcas e imagem
- As 20 frases distintivas iguais à tradução do jogo de referência (de 34 expressões iguais) foram reescritas (Ajustes, EDITAR HUD, clube, sala, chat).
- O nome do jogo de referência e os comentários de engenharia reversa saíram de todo o projeto (jogo, servidor, ferramentas,
  testes, documentos). O cabeçalho do `server/partida/fisica.js` que dizia "implementação original" foi corrigido.
- Chaves salvas do treino: `racha-treino-perfil-v1`, `-hud-v11`, `-som-v1`, `-campo-v1`, `-modo-v1`. `tools/v82/inicio.js` leva,
  uma vez, o que estava nas chaves antigas para as novas (no aparelho, nas gavetas das contas e na cópia antiga da conta),
  reconhecendo a chave pelo formato; `tools/v82/conta.js` aplica o mesmo mapa no QUAL PROGRESSO FICA?.
- A imagem embutida `img-favela-1v1` (sem uso e sem proveniência demonstrável) saiu do jogo-base.

### Outras correções
- Login (v84): o SÓ TREINAR OFFLINE aparece também no formulário de login e no SEM CONEXÃO (`tools/v84/login.js`). Antes, com
  o jogo servido por um endereço sem as rotas de conta (o `server/servidor.js`, um `http.server`) ou com a plataforma fora do
  ar, a tela de login não tinha saída.
- Fontes no pacote: os `.ttf` originais da Lilita One, Anton, Barlow e Barlow Condensed (OFL 1.1) em
  `app/public/game/fontes/`, com a licença e o SHA-256 de cada arquivo; o build aceita `.ttf`. O jogo não pede mais nada ao
  Google Fonts.
- `app/package-lock.json`: os 272 pacotes que apontavam para um espelho privado do ambiente de geração passaram a apontar para
  o registro público do npm (mesmos hashes de integridade).
- `tools/mapa_codigo.py` conhece a etapa v84 e o núcleo; `tools/MAPA_REDEFINICOES.md` regerado.
- A concordância dos textos trocados na auditoria ("os pontos mínimos", "a Seta da direção"; `tools/clubes_rua.js`,
  `server/clubes.js` e comentários).

### Testes
- Novos: `tests/v85_fisica_test.mjs`, `tests/v85_sincronia_test.py`, `tests/v85_online_test.py`, `tests/v85_chaves_test.py`.
- Arnês da v84, aplicado igual na v84 e na v85 para comparar: `tests/servidor_visitantes.cjs` (o servidor de verdade
  aceitando quem não tem conta, só nos testes), o SÓ TREINAR OFFLINE no `tests/comum.py`, a tela de login fechada no
  `tests/online_test.py`, a parte "0) login obrigatório" no `tests/servidor_test.js` e o `tests/plataforma_salas_test.mjs`
  na regra da v84; `tests/roda_lista.sh` guarda a saída inteira de cada teste.
- Ajustados à FR-85 (cada ajuste explicado no RELATORIO_DE_TESTES): `v78_test.py`, `v83_sala_test.mjs`, `v83_salas_ws_test.py`,
  `servidor_test.js` (o campo `acao`) e os testes que liam as chaves e os textos antigos.

### Documentos
- `PROVENIENCIA.md`, `THIRD_PARTY_NOTICES.md`, `CHANGELOG.md` (novos); `LEIA-ME.md` (seção v85, como rodar com o login,
  fontes, testes, limitações), `server/LEIAME.md` (seção v85, protocolo `acao`, física), `app/RUA.md`.
