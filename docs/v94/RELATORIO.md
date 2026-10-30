# RACHA v94 · a jogabilidade reconstruída com um motor próprio — o relatório (estado das etapas 1 a 7)

> Esta é a versão do relatório que vai no ZIP das etapas 1 a 7 (o motor próprio pronto, **o padrão ainda é o motor de
> antes**: veja `LEIA-ME-v94-TESTES.md` para ativar). A etapa 8 (o motor próprio como padrão), a bateria inteira e as
> pendências finais vêm no ZIP final.

Branch `v94` (a partir da v93, com as melhorias do RACHA-v92-melhorado). Nada foi publicado nem mexido na produção.

## 1. O que foi feito

- **Um motor próprio** (`server/partida/motor.js`): o campo, os corpos, o movimento, a bola, as batidas, o chute, a máquina
  de comandos (PASSE, CHUTE, CURVA, segurar, toque antecipado, PASSE → CHUTE), a saída e o gol — um arquivo só, sem
  dependências, o MESMO no servidor e no aparelho, determinístico (sem trigonometria nem `pow`/`exp`/`hypot` no passo) e com
  o mundo em JSON (empacota/desempacota para a previsão do online).
- **As mesmas regras em todo lugar:** o treino, a partida contra os bots, o tutorial (`tools/v94/jogo.js`), a sala do
  servidor (`server/partida/sala94.js`) e a previsão de quem joga online (`tools/v94/rede.js`) rodam o mesmo arquivo com os
  mesmos números (o servidor manda o perfil resolvido no começo da rodada).
- **O painel AJUSTES › TESTES** ganhou a parte MOTOR (os dois motores com o nome à vista, o PADRÃO v94, um deslizante por
  número do motor próprio, em d e segundos), e as memórias A (motor próprio) e B (motor de antes) já vêm prontas.
- **A identidade do RACHA** fica: o desenho, as tampinhas, os campos Arena e Estádio, o HUD, os sons, a loja, o passe, as
  skins e o social não foram mexidos.

## 2. De onde veio cada coisa (o acesso prévio, declarado)

- **Eu (o assistente que conduziu o trabalho) tive acesso prévio** ao código do RACHA, inclusive à física antiga — que,
  como mostrei antes, tem números iguais aos do arquivo de parâmetros do Mamoball que você enviou (`Mamoball-Equal-Parametros.json`,
  conferido contra o APK só pelo hash; o código e os assets do APK não foram abertos). Também vi os 9 vídeos. **Por isso
  este trabalho não é apresentado como uma implementação feita sem acesso prévio.**
- **A especificação** (`docs/v94/ESPECIFICACAO_MOTOR.md`) fui eu que escrevi, a partir de medidas dos vídeos (marcadas
  [obs], com a confiança) e de decisões de projeto (marcadas [dec]) — com uma regra própria para o campo (área por jogador
  e proporção), não uma tabela, e sem copiar estruturas da física antiga.
- **O código do motor** foi escrito por um agente separado que trabalhou numa pasta isolada (`/home/claude/motor94`) só com
  a especificação, os testes e os cenários de medida; ele não viu o código do RACHA, o jogo de referência nem a internet.
  Ele declarou ter usado a pasta temporária da sessão para os próprios scripts de medida (`perf.js`, `conducao.js`,
  `estresse.js`…); conferi: eles só leem arquivos de `/home/claude/motor94`. As interpretações dele estão em
  `docs/v94/NOTAS_MOTOR.md`.
- **A integração** (jogo, servidor, previsão, bots, painel, câmera, analógico) fui eu que escrevi.
- **Coincidências** (conferidas por programa, `node` sobre o motor e o JSON): os nomes em comum com a física antiga são
  palavras comuns em português (bola, chute, passo, trave, saída…) e os nomes de parâmetro que o próprio RACHA já usava
  (quiqueParede, quiqueTrave, quiqueRede, limiarQuique). Os números em comum com o JSON do Mamoball têm outro significado:
  1,25 (aqui a meia-vida da bola, em s; lá a massa do jogador), 0,02 (aqui a folga do toque, em m; lá o intervalo do
  botão do controle, em s), 10 e 400 (aqui limites das faixas do painel; lá a massa da bola e a força do chute forte), e
  medidas de caixas dos mapas (0,5, 3, 4,5, 16, 35, 60, 110, 120) que aqui são faixas e contas. Nenhum dos números que eram
  iguais na física antiga (velocidade 14,1, massas 1,25 e 10, raios 2 / 2,5 / 1, desaceleração 0,99, chutes 250 e 400,
  teto 55) entra no motor com o mesmo papel.
- O que isto **não** é: um parecer jurídico. Semelhança de comportamento (um jogo de tampinhas e bola visto de cima) não
  quer dizer cópia, e eu não afirmo que algo foi copiado só por se comportar parecido.

## 3. O que foi substituído

| componente | antes | agora |
|---|---|---|
| a física do treino, da partida contra os bots e do tutorial (futebol e com curva, na Arena e no Estádio) | o bloco de física do `racha.html` (physicsStep, collide, kickBall, dominarBola…) | `server/partida/motor.js` pelo `tools/v94/jogo.js` |
| o campo desses modos (linhas, gols, traves, redes, a área da tampinha, as marcas) | a tabela de medidas por tamanho | a regra do motor (`M.campo`), pelo `tools/v94/base.js` |
| a física das salas do servidor | `server/partida/nucleo.js` (o núcleo da v92) | `server/partida/motor.js` pelo `server/partida/sala94.js` |
| a máquina dos botões (no jogo e no servidor) | a do núcleo da v92 e a do bloco de física | a máquina de comandos do motor (intenções contadas) |
| a previsão do online | a do núcleo da v92 (`tools/v92/rede.js`) | o motor, voltando para o estado exato do servidor (`tools/v94/rede.js`) |
| o desenho entre os passos | a conta da v92 | a regra de movimento do motor (`tools/v94/desenho.js`) |
| o analógico | 32 direções | a direção contínua (`tools/v94/analogico.js`) |
| a câmera (Equilibrado/Perto e o Deslocamento) | o enquadramento de sempre | 23 × 13 d e o puxão 0,29/0,13 dos vídeos (`tools/v94/camera.js`) |
| os bots do servidor | chute direto e mira girando o corpo | o toque no botão, a mira girando a linha, parar a tempo, não chutar em quem está encostado na bola (`server/partida/bot.js`) |

**O que ficou como estava** (e por quê): o motor de antes continua no código, para a comparação A ⇄ B do painel, para as
salas com alguém de versão antiga e para os modos que o motor próprio ainda não cobre (vôlei, americano, basquete, ginga e
os mapas de rua Favela, Escadão e Viaduto). `server/partida/fisica.js` e o caminho `auto_*` do servidor são de um teste da
v83 que o jogo de hoje não usa mais (o jogo não manda `auto_*`). **Para tirar do produto tudo o que veio da física antiga,
falta (com a sua autorização): passar esses modos para o motor próprio e então apagar o bloco antigo, o núcleo da v92 e o
caminho `auto_*`.**

## 3b. As etapas (o que mudou, como foi testado, o que ainda difere)

O motor foi escrito de uma vez, a partir da especificação inteira (é o que garante que ele saiu só dela); a integração
foi feita etapa por etapa, cada uma num commit (`git log v93..v94`).

| etapa | o que mudou | como foi testado | o que ainda difere / não deu para confirmar |
|---|---|---|---|
| 1 · proporções | o campo pela regra do motor (62 d² por jogador; 1 VS 1 13,45 × 9,22 d … 4 VS 4 24,90 × 19,92 d), a margem 1,35 d / 2,4 d (O10), a bola com metade do diâmetro da tampinha (O1), 95 px por metro (a tampinha com os mesmos 38 px) | `tests/v94_motor_test.js` (a regra, os 4 tamanhos), `tests/v94_jogo_test.py` (o campo do jogo = o do motor; a volta exata para o de antes), `tests/v94_sala_test.js` (o campo da sala) | o tamanho do campo e da boca do gol: os vídeos não mostram (decisão) |
| 2 · movimentação | a aceleração limitada (arranca 67 ms, para 50 ms, inverte 100 ms; 3,69 d/s); a inclinação não muda a velocidade | os cenários (`tests/v94/cenarios.js`: arrancada, frenagem, inversão, virada, analógico) contra as metas da seção 16 | fica um pouco mais "pesado" que o motor de antes (que mudava a velocidade num passo); o analógico do jogo de referência não dá para medir |
| 3 · colisões e bola | a bola com meia-vida (0,55 por segundo, O7) e atrito de rolamento (para de vez), os subpassos, as batidas (linhas, trave, rede, tampinhas, obstáculos do treino), a condução em toques curtos, a disputa travada, a bola presa | os cenários (rebotes, trave, condução, disputa), o treino com obstáculos e os 3600 passos de bots sem nada sair do campo | os quiques e a condução não deram para medir nos vídeos (decisão) |
| 4 · passe, chute e combinações | o chute pela linha centro → centro com herança parcial (CHUTE 9,41 d/s e PASSE 5,94: O6), a máquina de comandos (intenções contadas, segurar, toque antecipado de 100 ms, intervalo de 100 ms), PASSE → CHUTE (bola parada: só no passo seguinte; andando: até 3 passos) | os cenários (os chutes, a direção, o alcance, as combinações, o segurar, o toque antecipado, o intervalo), o jogo no navegador (o CHUTE no mesmo passo, a combinação) | o DB do jogo de referência não dá para medir nos vídeos |
| 5 · analógico | a direção contínua (3 casas no comando), a zona morta do HUD de sempre; 32/16/8 no painel para comparar | `tests/v94_jogo_test.py` (o analógico da tela e o teclado) | o número de direções e a zona morta do jogo de referência não dão para medir; sem celular de verdade |
| 6 · câmera | o EQUILIBRADO com pelo menos 23 × 13 d (O9) e o Deslocamento 0,29/0,13 (O8) | `tests/v94_jogo_test.py` | a câmera dos vídeos tem confiança baixa (O8) |
| 7 · online e bots | a sala do servidor no motor (sala94), a previsão exata do aparelho, o m94 nos quadros, a escolha do motor por sala e a volta automática para o motor de antes com alguém de versão antiga; os bots pelo botão, sem teleporte, sem chutar em quem está encostado na bola | `tests/v94_sala_test.js` (a previsão bit a bit em 1444 passos), `tests/v94_turma_test.js`, `tests/v94_online_test.py` (o servidor de verdade, 40 e 150 ms), partidas de bots medidas | a rede ≈ 2,5 vezes maior; a inteligência dos bots é a de antes, adaptada |
| 8 · ajustes finais | (em andamento) o motor próprio como padrão no jogo e no servidor, com a chave para voltar | (em andamento) a bateria inteira | — |

## 4. A especificação, os parâmetros e as medidas

- A especificação da jogabilidade: `docs/v94/ESPECIFICACAO_MOTOR.md` (com as metas da seção 16) e as interpretações do
  implementador: `docs/v94/NOTAS_MOTOR.md`.
- O que os vídeos mostram e o que não mostram: `docs/v94/OBSERVACOES_VIDEOS.md`.
- A tabela de parâmetros com as unidades (o padrão, a faixa, o número no jogo e a origem): `docs/v94/PARAMETROS.md`.
- A comparação o motor de antes × o próprio × os vídeos: `docs/v94/COMPARACAO.md`.

## 5. Os testes (até a etapa 7)

| teste | o que confere | resultado |
|---|---|---|
| `node tests/v94_motor_test.js` | o contrato da API, o campo, a saída, o gol, o determinismo bit a bit, cópia/empacotamento, cinemática, obstáculos, CURVA, fatorVel, reiniciaComandos e as metas da seção 16 | 79 ok, 0 falharam |
| `node tests/v94_sala_test.js` | a sala do servidor no motor: o campo, o m94, os bots, o toque, a fila, a comemoração, a previsão do aparelho bit a bit (1444 passos, 77 chutes, 1 gol), quem assume a tampinha, a sala do motor de antes | 35 ok, 0 falharam |
| `node tests/v94_turma_test.js` | o motor das salas na turma: o padrão, a rodada no motor próprio, a volta para o de antes com alguém de versão antiga, o admin na versão de testes | 16 ok, 0 falharam |
| `python3 tests/v94_jogo_test.py` | no navegador: o motor no jogo, o painel MOTOR, o campo e os tamanhos, o treino (o CHUTE no passo, PASSE → CHUTE), a partida 2 VS 2 contra os bots, o gol e a saída, o analógico, a câmera, a pausa | 25 ok, 0 falharam |
| `python3 tests/v94_online_test.py` | o servidor de verdade, dois navegadores, 40 e 150 ms: o motor da rodada, o CHUTE e o PASSE → CHUTE iguais na tela e no servidor, a correção | 12 ok, 0 falharam |
| a bateria de antes (com o motor de antes valendo) | regras, controles, câmera, interface, celular, perfil, eventos, tutorial, v71–v81 e o resto | em andamento (vai no ZIP final) |

## 6. Limitações

- **Sem teste em celular de verdade.** Não tive acesso a Android nem iPhone físicos: tudo foi conferido no Chromium de teste
  (inclusive fazendo de conta que é um celular, com toques de vários dedos). Isso não diz como fica a sensação na mão, o
  atraso do vidro, a vibração nem o desempenho num aparelho fraco. **Os testes automáticos passando não querem dizer que a
  sensação ficou igual à do jogo de referência.**
- **Os vídeos limitam o que dá para afirmar:** 30 quadros por segundo (nada abaixo de 33 ms), editados, sem o campo
  inteiro, sem os toques. Não deu para determinar: o tamanho do campo e do gol, quantas direções o analógico tem e a zona
  morta, o alcance exato e a direção do chute, o DB (PASSE → CHUTE), os quiques, a condução e as batidas entre jogadores.
  Esses números são decisões, marcadas [dec] na especificação, e estão todos no painel para ajustar. O pedido de gravações
  que fecharia essas lacunas está no fim de `docs/v94/OBSERVACOES_VIDEOS.md`.
- **Os bots** jogam o motor novo pelas mesmas regras, mas a inteligência deles é a de antes, adaptada; no 3 VS 3 do servidor
  eles fazem menos gols que antes (0,5 por minuto contra 1,3).
- **A rede:** o quadro leva o estado do motor (para a previsão voltar exatamente ao servidor) e ficou ≈ 2,5 vezes maior
  (4 VS 4: 39 KB/s contra 15). Dá para reduzir depois (compressão no WebSocket ou mandar só o que mudou).
- **Os modos fora do motor próprio** (ver 3) continuam com a física antiga.

## 7. Como testar no Ajustes (versão de testes)

1. Abra o jogo de testes (o `config.js` com `experimental: true`) e vá em **AJUSTES › TESTES**. A primeira parte é a
   **MOTOR**: em cima diz qual motor está valendo ("Agora vale o MOTOR PRÓPRIO (v94)…").
2. **MOTOR PRÓPRIO / MOTOR DE ANTES** troca na hora (no treino e contra os bots). **PADRÃO v94** volta todos os números do
   motor próprio para os da especificação. Embaixo, cada número do motor em unidades de jogo (d/s, ms, %): mexa um de cada
   vez; o nome curto do perfil passa a "v94 · ajuste".
3. **A ⇄ B:** as memórias já vêm prontas — **A = o motor próprio**, **B = o motor de antes**. Na pausa da partida, **A ⇄ B**
   troca entre os dois no mesmo lance; **MOTOR: PRÓPRIO/DE ANTES ⇄** troca só o motor. Guardar numa memória (A ou B) fica no
   aparelho; os perfis também exportam e importam como sempre.
4. **O analógico e a câmera** (no mesmo painel): as direções (LIVRE, 32, 16, 8) e a câmera (A DOS VÍDEOS / A DE ANTES).
5. **Online:** na sala de testes o admin escolhe o motor da sala; na sala vale o motor da sala (o do painel volta na saída).
   No servidor, `RACHA_MOTOR_JOGO=v93` volta todas as salas para o motor de antes; no jogo, `RACHA_CONFIG.motor = 'v93'`
   faz o mesmo sem refazer o build.
6. Os medidores do painel (toques, chutes, toques perdidos, a correção da previsão, a fila e o ritmo do servidor) também
   funcionam com o motor próprio.
