# RACHA · o servidor da turma

As **salas online**, o **Chat do Brasil**, os **clubes da turma**, a **Copa dos Amigos** e os **duelos 1v1** do RACHA ·
Futebol de Rua. Node 18 ou mais novo, **sem dependências** (nada de `npm install`): só os arquivos desta pasta.

```bash
node server/servidor.js
# RACHA · Servidor da turma no ar: http://localhost:8080/game/racha.html (salas em ws://localhost:8080/)
```

Abra o endereço que ele mostrar. O jogo, aberto por esse endereço, conecta sozinho no mesmo lugar (não precisa
configurar nada): GALERA/COMUNIDADE › SALAS mostra **ONLINE**. Para jogar com quem está na mesma rede, abra
`http://<o IP deste computador>:8080/game/racha.html` no celular dos outros.

## v85 · a física própria (FR-85) e o comando `acao`

A auditoria de proveniência de 17/10/2026 trocou a física e os controles que vinham de outro jogo (ver `PROVENIENCIA.md` na
raiz). Para o servidor, isso quer dizer:

* **Um núcleo só** (`server/partida/nucleo_fisica.js`, a FR-85): os números (corrida, chutes, bola, batidas) e as funções
  (movimento com aceleração limitada, chute com velocidade de saída, meia-vida da bola, batidas por par, subpassos, o
  analógico de 256 direções e o gatilho dos botões). O jogo usa **o mesmo arquivo** (o build cola o texto dele e confere o
  sha256), e a partida autoritativa (`fisica.js`) e o motor das salas (`sala.js`) chamam esse núcleo. A especificação está
  em `tools/v85/FISICA_RACHA.md`; o teste `tests/v85_sincronia_test.py` confere o mesmo lance no jogo e aqui (diferença 0).
* **O comando de entrada mudou:** `input {seq, x, y, acao, k}`. `acao` são os botões em bits: **1 = PASSE**, **2 = CHUTE**
  (os dois apertados = 3). O `button` (1/2/3) e o intervalo de 0,02 s entre trocas de botão da v84 saíram. O gatilho é o da
  FR-85: o último botão apertado arma o chute, segurando ele espera a bola entrar no alcance, e um aperto dá um chute só.
  Um jogo da v84 que mande `button` anda, mas não chuta neste servidor (o jogo e o servidor vão juntos na mesma versão).
* **A direção** que chega é arredondada a 1/256 de volta (a v84 usava 32 direções).

## Opções

| Opção | Variável | Para quê | Padrão |
|---|---|---|---|
| `--porta N` | `PORT` | porta HTTP | 8080 |
| `--host H` | `HOST` | onde escutar (`127.0.0.1` = só este computador) | `0.0.0.0` |
| `--estaticos DIR` | `RACHA_ESTATICOS` | a pasta entregue por HTTP (o jogo fica em `/game/`) | `app/public` |
| `--dados ARQ` | `RACHA_DADOS` | o arquivo com troféus, clubes, duelos e campeões | `server/dados/turma.json` |
| `--origens A,B` | `RACHA_ORIGENS` | outras páginas que podem conectar (o mesmo endereço e localhost sempre podem) | — |
| `--nome TXT` | `RACHA_SALAS_NOME` | o nome do servidor (aparece na sala) | Servidor da turma |
| `--segredo TXT` | `RACHA_SEGREDO_SALAS` | o mesmo segredo da plataforma (bilhete da conta e selo do resultado) | — |
| `--sem-p2p` | `RACHA_P2P=0` | sem a conexão direta entre os aparelhos (tudo pelo servidor) | com P2P |
| `--memoria` | — | não grava nada (testes) | — |
| `--tempo-normal SEG` | `RACHA_TEMPO_NORMAL` | v80: os segundos da partida normal (a ranqueada); para testes e demonstrações | 180 (3:00) |
| `--prorrogacao SEG` | `RACHA_PRORROGACAO` | v80: os segundos da prorrogação do 0 × 0 | 120 (até -2:00) |
| `--visitantes` | `RACHA_VISITANTES=1` | v85.1: aceita nas salas quem joga sem conta (rede local, site de teste, demonstração). Com a plataforma no ar, deixe desligado | desligado (exige a conta, v84) |

`/saude` (e `/health`, o caminho que o Render confere) responde um JSON com o número de salas e de gente conectada.
O `server.js` da raiz é o atalho do site de teste: sobe este servidor com o modo visitantes ligado (`RACHA_VISITANTES=0`
desliga).

### Jogo e servidor em endereços diferentes

Se o jogo for publicado num lugar e o servidor em outro, ponha o endereço do servidor no `app/public/game/config.js`
(`servidor: 'salas.meusite.com'`) e a página do jogo em `--origens` do servidor (`--origens https://jogo.meusite.com`).
Em HTTPS o servidor precisa estar em `wss://` (um proxy com TLS na frente: Caddy, Nginx, Render, Fly…).

### Dentro da plataforma (RACHA 2.0)

Em produção (`npm start` em `app/`), a plataforma monta este mesmo servidor no endereço dela (`app/api/lib/salas.ts`):
quem está logado no site entra nas salas com a conta (a sessão é conferida no aperto de mão), e o resultado online
sai com o **selo** que a plataforma confere antes de dar XP. `RACHA_SALAS=0` desliga. Detalhes em `app/DEPLOY.md`.

## Quem roda a partida e o que o servidor confere

O aparelho do dono da sala (o **anfitrião**) simula a física e manda os quadros; os outros mandam os comandos. O
servidor **não simula a bola** — ele organiza a sala e repassa. Por isso ele **confere o resultado antes de guardar
qualquer coisa**:

* só vale o `finish` do anfitrião, da rodada certa, com a sala em jogo;
* o placar do fim tem de ser igual ao do último quadro que passou pelo servidor;
* o placar tem de ser possível para o modo (futebol e com curva vão a 3; com tempo, empate não termina — tem gol de
  ouro). As regras do vôlei, do americano (3), da ginga (5, o gol de ginga vale 2) e do basquete (12, cestas de 2 e 3)
  continuam na conferência, mas desde a v70.2 nenhuma sala abre nesses modos (abaixo);
* o tempo de jogo não pode passar do tempo de verdade (a pausa não conta) nem ser curto demais; com tempo, a partida
  tem de chegar ao fim do relógio; o ritmo de pontos tem limite;
* partida encerrada pelo árbitro não vale.

Só o resultado que passou vira **troféu** (vitória), conta para os **clubes**, os **duelos 1v1** e a **copa**. O jogo
mostra **NÃO VALEU** (sem prêmio) quando o servidor recusa. Isto torna a trapaça trivial inútil (mandar placar
inventado, de outra rodada, de outra pessoa). Desde a etapa final da v83, **nenhuma partida online é simulada em
aparelho**: as salas de sempre (pública, privada e ranqueada) rodam no motor do servidor (abaixo, "As salas 100%
hospedadas"), então nem a prova de cada toque depende mais de ninguém — o caminho `auto_*` (a partida autoritativa,
logo abaixo) continua existindo como modo independente.

## A partida autoritativa (v83 · o servidor simula tudo)

A v83 acrescenta um segundo jeito de jogar online, ao lado das salas de sempre: a **partida autoritativa**
(`server/partida/`). Nela **o servidor é a autoridade final de tudo o que é competitivo** — posições, bola, placar e
relógio. Ninguém é anfitrião: cada aparelho **só manda intenção** (a direção do joystick e o toque no chute, com
número de sequência) e **só recebe quadros** (as posições calculadas pelo servidor). O placar não passa pelo
aparelho de ninguém.

* **A simulação** (`server/partida/fisica.js`): a física do jogo — desde a v85, o mesmo núcleo FR-85 que o jogo usa
  (`server/partida/nucleo_fisica.js`: passo fixo de 60 por segundo, a corrida, os chutes, a bola, as batidas, as traves,
  as redes e as paredes com a boca do gol aberta, o gol só com a bola inteira dentro), sem depender de nada.
  Determinística: os mesmos comandos dão a mesma partida.
* **A partida** (`server/partida/partida.js`): a regra da partida normal da v80, no relógio do servidor — **3:00**,
  **3 gols acabam na hora**, **empate no 1 × 1 e no 2 × 2**, só o **0 × 0** vai para a **prorrogação** (até 2:00 a
  mais, gol de ouro; sem gol, empate). Os quadros saem a **20 por segundo** (um a cada 3 passos). Quem cai tem **45
  s** para voltar (na ranqueada, cair de vez é desistência); se todo mundo cair, a partida termina sem vencedor.
* **O gerente** (`server/partida/gerente.js`): as salas autoritativas nascem e se enchem sozinhas
  (`auto_entrar {n, ranked}`) — entra na sala que espera gente do mesmo tamanho e modo, senão abre uma; lotou,
  começa. Sala vazia é desfeita em 10 s, encerrada em 30 s, e há teto de 100 salas autoritativas vivas. No fim, cada
  jogador **com conta** recebe o `auto_fim` com o **selo assinado** no mesmo formato que a plataforma já confere
  (`k:1` na ranqueada, `n` o tamanho, o placar do lado dele, a duração medida pelo servidor) — ou seja, **a
  plataforma não precisou mudar nada** para dar XP e patente de partida autoritativa. Quem desiste não recebe selo.

**A antitrampa da partida autoritativa.** Como o servidor simula, a trapaça de placar desaparece (ninguém manda
placar). O que chega do aparelho é conferido um a um:

* o **número de sequência** só anda para frente (comando repetido ou atrasado é descartado);
* o **ritmo** tem teto (120 comandos por segundo; rajada anormal é registrada);
* a **direção** é o joystick quantizado do jogo (256 direções desde a v85); módulo acima de 1 é cortado — e acima de 1,05 é
  registrado como `direcao_acima_de_1`;
* o **chute** tem o tempo mínimo entre um e outro (33 ms — macro de chute vira `chute_rapido_demais`) e **só vale no
  alcance** (chute longe demais da bola não acontece e vira `chute_fora_do_alcance`).

Os registros de suspeita vão para o **registro do servidor com a partida, o jogador e o horário, para investigação —
ninguém é banido automaticamente** por uma detecção incerta (é o que pede o plano da v83). O resumo de cada partida
(encerrada) leva a lista de suspeitas no resultado.

**O protocolo autoritativo** (tudo com o prefixo `auto_`, na mesma conexão das salas, depois do `hello`):

Cliente → servidor: `auto_entrar {n, ranked}` · `auto_cmd {seq, mx, my, k?}` · `auto_sair` · `auto_status`.
Servidor → cliente: `auto_bemvindo {partida, voce, campo, regra}` · `auto_gente {jogadores}` · `auto_comeca {em}` ·
`auto_q {t, jog, bola, placar, relogio}` (os quadros) · `auto_gol {placar, time}` · `auto_fim {resultado, selo?}` ·
`auto_erro {msg}`. Sem bilhete da conta (`hello` com `conta`), a partida autoritativa não abre. `/saude` mostra o
resumo (`auto`): salas vivas, em jogo, à espera.

## As salas 100% hospedadas (v83 · etapa final — nenhuma partida online usa a física do aparelho)

A etapa final da v83 leva a simulação do servidor para **todas** as partidas online das salas de sempre — a sala
**pública**, a **privada** por código e a **ranqueada** (a partida autoritativa `auto_*` acima continua existindo como
caminho independente). Nenhuma sala nasce mais no aparelho de alguém.

* **O motor da sala** (`server/partida/sala.js`): a mesma simulação do jogo, passo a passo — 60 passos por segundo,
  o mesmo núcleo FR-85 (v85), a mesma ordem de colisões, a barreira da saída, o toque, o chute (com alcance e tempo mínimo,
  igual para todo mundo), a autoria do gol (autor, assistência, contra e desvio), a comemoração, a saída do outro
  time, a meta ou o relógio com gol de ouro (partida livre) e a regra v80 (ranqueada: 3:00 do servidor, meta 3,
  prorrogação só no 0 × 0). Os quadros saem a **30 por segundo no formato clássico** (`snapshot` com `tick`, `state`,
  `score`, `ball`, `players` e o `goal` com a autoria) — ou seja, **o jogo renderiza a partida hospedada sem mudar o
  desenho**: a predição local, a reconciliação (repete os comandos depois do ack), a interpolação e a suavização da
  bola que a v82 já tinha para jogar como convidado passam a valer para **todos**, inclusive o criador.
* **Ninguém é anfitrião** (`host:'srv'` no `room`): o criador é só o **admin** (`room.admin`) — começa a partida,
  mexe nos times antes de começar, expulsa, passa o cargo. Na partida ele é um jogador comum: os comandos dele valem
  o mesmo que os de qualquer um. `snapshot` ou `finish` mandados por aparelho em sala hospedada são **ignorados e
  registrados** no log (suspeita para investigação, sem banimento automático).
* **A REGRA FUNDAMENTAL — quem caiu, caiu sozinho**: se o criador (ou qualquer um) ficar sem internet, **só ele sai**:
  um bot assume a tampinha dele **na hora** e a partida segue para os outros; ele tem **90 s** para voltar **no mesmo
  lugar** (a reserva de sempre) e reassumir. Só a função de **admin** passa para quem está há mais tempo na sala — a
  simulação nunca sai do servidor. Se quem pausou cair, a partida dos outros descongela sozinha. Se a sala ficar sem
  ninguém, a partida acaba sem resultado (e a sala espera 90 s por quem caiu antes de fechar).
* **Os bots do servidor** (`server/partida/bot.js`): as vagas vazias (e as tampinhas de quem caiu) são jogadas por
  bots no próprio servidor — goleiro na linha, atacante buscando a bola, passe para quem está livre, chute alinhado
  ao gol; níveis `facil` e `dificil`. Não fazem tabela nem curva planejada (limitação conhecida).
* **O fim pelo servidor**: o resultado nasce do motor (`onFim`) e passa pelo caminho de conferência de sempre — o
  **selo** sai igual (a ranqueada com `k:1`), a plataforma não mudou, e quem saiu no meio não recebe selo (na
  ranqueada, a desistência continua contando −25).

**O que mudou no protocolo das salas (v83):** no `room`, `host:'srv'`, `servidor:true` e `admin` (o criador; `null`
na ranqueada). O `start` vale para todos ao mesmo tempo (ninguém roda a partida). O `input` de **todo mundo** vai ao
servidor (antes o anfitrião não mandava). O `pause` vale só na partida livre e desfaz sozinho se quem pausou cair. O
`snapshot` e o `finish` de aparelho não valem nada em sala hospedada. Os testes: `v83_sala_test.mjs` (o motor, 60
verificações) e `v83_salas_ws_test.py` (o caminho inteiro por WebSocket — os 15 testes obrigatórios do plano).

**Convivência.** As salas de sempre (o anfitrião simula) continuam iguais — o `auto_*` é um caminho novo, e o jogo
(racha.html) da v82 não manda essas mensagens. A próxima etapa (o jogo entrar nas partidas autoritativas, com
previsão no aparelho para a resposta ficar instantânea) é cliente; o servidor já está pronto para ela.

## Os modos e os mapas das salas (v70.2)

O jogo ficou só com **FUTEBOL** e **COM CURVA**, e só com a **ARENA** (`map` 0) e o **ESTÁDIO** de grama (`map` 4; a
física é a mesma da Arena). O servidor segue: `create` e `config` só aceitam `jogo` em `MODOS_SALA` (`futebol`, `curva`)
e `map` em `MAPAS_SALA` (`4`, `0`). Um pedido com outro modo ou mapa (um jogo antigo, por exemplo) abre a sala no
futebol e no Estádio (`create`; até a v78 era a Arena) ou não muda a sala (`config`). Os mapas 1 a 3 (Favela, Escadão, Viaduto) e os modos que
saíram continuam no código do jogo, guardados; para voltar com eles, as listas ficam no começo de `turma.js` e em
`tools/v70/enxuto.js` (`V702`).

## Os times (v71 · v80)

Os dois times são o **Time A** (o time 0, laranja) e o **Time B** (o time 1, roxo) desde a v80 (na v71 eram o Time Preto e
o Time Branco); no servidor só mudaram os nomes nas mensagens ("O Time A está cheio.", "Toque no Time A ou no Time B para
entrar."). O protocolo, os números dos times e a conferência do resultado das salas são os mesmos. A tampinha de cada um
continua indo como `skin` (o código); quem está com a padrão aparece na cor do time (metade/metade quando assiste) — isso é
o jogo que desenha pela vaga de cada um na sala, então a troca de time aparece para todos com o próprio `room`.

## A partida normal: o relógio do servidor (v80)

A ranqueada online é a **partida normal** (`room.regra = 'v80'`, `tempo` 3): **3:00** de jogo; quem tiver mais gols no fim
vence; **3 gols** acabam na hora; **1 × 1 e 2 × 2 empatam**; só o **0 × 0** vai para a **prorrogação** (até 2:00 a mais: o
primeiro gol vence, o gol de ouro; sem gol, empate). **O relógio é do servidor**:

* o tempo de jogo da rodada é `agora − início − pausas` (a pausa do anfitrião para o relógio de todos);
* o servidor manda `relogio {round, ms, pausado, seg, prorrog}` **a cada segundo** e na hora da pausa (e o `room.relogio` vai no
  `start` e em cada `room`); o jogo mostra esse relógio (com metade do ping somado) e quem roda a partida decide o fim por ele;
* no quadro, o gol leva a hora dele (`data.goal.el`, no relógio do servidor visto pelo anfitrião); o servidor guarda cada
  mudança de placar na **linha do tempo** da rodada (`linha`: o placar, a hora do anfitrião e a dele);
* no `finish`, além do de sempre, o servidor **confere pela linha do tempo** (`fim80`): o relógio do anfitrião não pode estar
  mais de 3 s atrás nem 1,5 s à frente do dele; gol depois do fim (do 3º gol ou do gol de ouro), depois dos 3:00 (com placar
  diferente de 0 × 0) ou depois da prorrogação não vale; o placar tem de ser o que a linha do tempo permite; e o fim não pode
  chegar antes da hora (3:00, ou 5:00 no 0 × 0) a não ser pelo 3º gol ou pelo gol de ouro;
* se o anfitrião não manda o fim **10 s depois da hora**, o servidor **encerra sozinho** com o placar da linha do tempo
  (`result` com `servidor:true`);
* o empate vale (`winner: -1`) e fica guardado como empate.

O tempo pode ser encurtado para testes e demonstrações (`--tempo-normal SEG`, `--prorrogacao SEG`); o jogo usa o que vem na
sala (`room.relogio.seg` e `prorrog`). As **salas personalizadas** ficam como eram: sem a regra nova e sem o `relogio`
(o tempo delas é o de quem roda a partida, conferido como antes).

## O chat (v81)

Dois chats, os dois neste servidor, cada um na sua conexão:

* **O Chat do Brasil** (a conexão `brasil_join`): público, para todo mundo ligado no servidor, independente de sala. Cada
  mensagem (`brasil_message`) leva o `id`, quem escreveu (`from`, o mesmo id da conexão das salas — `u…` ou `c…` com a
  conta), o `nome`, o `selo` V, o `clube`, a `skin` e a hora. O histórico recente vai no `brasil_history` ao entrar.
* **O chat da sala** (`say` na conexão das salas): só quem está na sala recebe (`say` e, ao entrar, `sayHistory` com as 30
  últimas); mudando de sala, o histórico é o da sala nova; na partida também. Cada mensagem tem o número dela (`mid`:
  `CÓDIGO-n`), que é o que a denúncia usa. O `typing {on}` vai para os outros da sala (`typing {id, on}`): o jogo desenha os
  três pontinhos em cima da tampinha de quem digita (o texto nunca vai).

**A moderação (as duas conversas)**:

* **o filtro** (`FILTRO`, o mesmo nos dois): palavrão e ofensa (com as variações de letras), link (`http`, `www.`, `.com`,
  `.br`, `.gg`, `discord.`, `t.me/`, `bit.ly`, `wa.me`, `.io`, `.app`, `.xyz`, `.link`, `.org`…), `@` de rede social e, novo na
  v81, **telefone**, **número tipo CPF** e **e-mail** (dados pessoais). O jogo barra isso antes de mandar (com o motivo na tela)
  e o servidor confere de novo (`error {codigo:'filtro'}` na sala, `brasil_error {reason:'filtro'}` no Brasil);
* **o ritmo**: na sala, 1 mensagem por segundo e a **repetida em menos de 30 s** não vai (`codigo:'repetida'`); no Brasil, 1 a
  cada 3 s e sem repetir; o jogo ainda segura 4 mensagens seguidas em 10 s na sala;
* **a denúncia**: na sala, `report {mid}`; **2 pessoas diferentes** (por conta ou por navegador — não por IP, porque na rede de
  celular milhares dividem o mesmo IP da operadora) escondem a mensagem para todos (`say_hide {mid}`, e `escondida` no
  histórico) e **quem escreveu fica 5 min sem falar naquela sala** (`codigo:'silenciado'`). No Brasil, `brasil_report {id}`:
  **3 pessoas diferentes** escondem (`brasil_hide`) e o autor fica **10 min** sem falar. Quem escreveu não conta como
  denunciante, e cada um denuncia no máximo uma vez por mensagem (e no máximo uma denúncia a cada 2 s);
* **silenciar** alguém é no aparelho de quem silencia (a lista fica salva no jogo): as mensagens dele chegam, mas não
  aparecem — nem na barra, nem no painel, nem na tela cheia do Chat do Brasil;
* **esconder o chat** é no jogo (Ajustes › "Chat na tela" e o olho do painel): a barra some de todo lugar.

## A ranqueada online e o selo V (v79)

**A fila.** No jogo, o JOGAR é sempre a ranqueada (no Estádio). Ele manda `fila {n, pts}` (o tamanho do time, 1 a 4, e os
pontos da patente); o servidor responde `fila {on:true, n, espera, mista, online}` e junta quem espera no mesmo tamanho:

* com gente para os dois times inteiros (2 no 1v1, 4 no 2v2…), a partida sai na hora;
* no 2v2, 3v3 e 4v4, depois de `FILA_MISTA_MS` (8 s) 2 ou mais já jogam juntos e os **bots completam** as vagas;
* depois de `FILA_MAX_MS` (20 s) sem ninguém, vai `fila_nada {n}` e o jogo começa a ranqueada **contra bots**;
* `fila_sai` tira da fila (CANCELAR, JOGAR CONTRA BOTS AGORA); cair também tira; quem está numa sala não entra
  (`error` com `codigo:'fila_sala'`); procurar de novo tem limite de ritmo.

Os times são montados pelos pontos (o de mais pontos num time, os dois seguintes no outro…), quem espera há mais tempo
roda a partida (o anfitrião), e a sala nasce em jogo: `room` e `start` com `room.ranked = true`, no Estádio
(`MAPA_RANQUEADA` = 4), até 3 gols, `bots:true` (v80: com a regra da partida normal, 3:00 no relógio do servidor; acima). A sala ranqueada **não aparece na lista**, ninguém entra
pelo código (só quem é dela, voltando de uma queda), não tem árbitro, troca de time, configuração nem revanche. O fim é
conferido como o de qualquer sala; o `result` vai com `ranked:true` e cada jogo mostra os pontos da sua patente só se
`valida`. **v82: com a conta, quem guarda a patente é a plataforma**: o `selo` do resultado (a assinatura que ela confere)
leva `k:1` quando a partida é da ranqueada (`k:0` nas outras salas) e `n`, o tamanho do time; a plataforma só conta a
ranqueada online com `k:1` e o mesmo tamanho do começo. Sem conta, os pontos ficam no aparelho, como antes. Quem sai no
meio perde 25 (o jogo manda a desistência; com a conta, a plataforma aplica); se quem sai é o anfitrião, a partida para
(`interrupted`) e ninguém ganha nem perde.

**O selo V.** O selo da conta (`equipe`, `criador`, `verificado`, `parceiro` — vale o primeiro, nessa ordem) vem da
plataforma: da sessão do site (o `selosDe` do `ligaSalas`, que lê o banco) ou do bilhete assinado (`s`). O que o jogo
mandar no `hello` é ignorado. Ele vai no `hello` (o seu), nos membros da sala, na lista das salas (o do dono) e nas
mensagens do Chat do Brasil; o jogo desenha o V na frente do nome. Só o dono da plataforma dá e tira (RACHA CONTROL).

## O protocolo (JSON por WebSocket)

Cliente → servidor: `hello {token, name, skin, avatar, flag, conta?, clube?}` · `ping` · `list` ·
`create {n, map, jogo, tempo, bots, pub, name}` · `join {code, spectate?, slot?, rapido?}` · `leave` ·
`seat {slot?|team?, id?}` · `config {n, map, jogo, tempo, bots, pub, name}` · `ready {on}` · `rematch {on}` · `start` ·
`pause {paused}` · `input {seq, x, y, acao, k}` (v85: `acao` = os botões em bits, 1 = PASSE, 2 = CHUTE) · `snapshot {round, data}` · `finish {round, score}` · `kick {id}` ·
`promote {id}` · `say {text}` · `typing {on}` · `report {mid}` (v81) · `profile {name, skin, avatar, clube?}` · `social` · `rtc {to, d}` ·
`p2p {on}` · `cupCreate {name}` · `cupNext` · `cupEnd` · `club_req {rid, op, args}` ·
`brasil_join {name, skin, avatar, token}` · `brasil_say {text}` · `brasil_report {id}` · `fila {n, pts}` · `fila_sai` (v79) ·
`auto_entrar {n, ranked}` · `auto_cmd {seq, mx, my, k?}` · `auto_sair` · `auto_status` (v83, a partida autoritativa — acima).
No `snapshot` da partida normal, `data.goal.el` é a hora do gol (v80).

Servidor → cliente: `hello {id, token, server, p2p, pub, conta, selo}` · `rooms {list, online}` · `room {room}` ·
`start {room, resume?}` · `snapshot` · `input` · `pause` · `result {round, score, winner, valida, motivo?, selo?, ranked?}` ·
`interrupted {message}` · `left` · `say {id, name, text, t, mid}` · `sayHistory {list}` · `say_hide {mid}` (v81) · `typing {id, on}` · `social` · `rtc` · `club_res {rid, ok, data|erro}` ·
`pong` · `error {message, codigo?}` · `brasil_hello` · `brasil_history` · `brasil_online` · `brasil_message` ·
`brasil_hide` · `brasil_error {reason}` · `fila {on, n?, espera?, mista?, online?}` · `fila_nada {n}` (v79) ·
`relogio {round, ms, pausado, seg, prorrog}` (v80) · `auto_bemvindo` · `auto_gente` · `auto_comeca` · `auto_q` · `auto_gol` ·
`auto_fim` · `auto_erro {msg}` (v83). No `room`, `room.regra` e `room.relogio` (v80); no `result`, `servidor:true`
quando o servidor encerrou pelo relógio dele (v80). Os `codigo` do `error` do chat da sala: `silenciado`, `repetida` e `filtro`
(v81); os `reason` do `brasil_error`: `ritmo`, `repetida`, `filtro`, `silenciado`, `longa`. O `auto_erro` (v83) leva `msg` em
português claro (sem hello, sem a conta, o servidor cheio, a partida lotada).
No `room`, `room.ranked` e o `selo` de cada membro; na lista das salas, o `selo` do dono; no Chat do Brasil, o `selo` de quem
escreveu (v79). O `selo` do `result` é outra coisa: a assinatura do resultado que a plataforma confere.

`k` no comando: 1 = CURVA segurada · 2 = FINTA · 4 = DRIBLE (o anfitrião aplica com as mesmas regras do botão dele).

**O selo do resultado** (o `selo` do `result`, assinado com o segredo; a plataforma confere): `j` (o ID público da conta), `p`
(o placar do lado dela: nosso, deles), `m` (o modo), `t` (a hora), `d` (a duração medida pelo servidor) e, desde a v82, `k`
(1 = ranqueada) e `n` (o tamanho do time). Só sai para quem joga com a conta (o bilhete da plataforma).

**Os IDs públicos** (v82): quem entra com a conta usa o ID da conta (`000123`); o visitante (sem conta) ganha um número de
**7 dígitos a partir de 9000000**, que não bate com o de nenhuma conta (antes começava do 1 e podia repetir o de alguém —
um clube podia achar o visitante no lugar da conta). O clube da turma procura a conta primeiro.

## Regras da sala

* Quem cria começa no Time A (o jogo põe o árbitro assistindo); quem entra pelo código ou pela lista assiste
  até o árbitro montar os times; **JOGAR AGORA** entra com lugar no time com menos gente.
* Só o dono (árbitro principal) muda regras, mexe nos outros, começa, pausa, remove (30 s sem voltar) e passa o dono.
* Quem cai no meio da partida tem o lugar guardado por 90 s: voltando com o mesmo token, volta para o mesmo lugar e
  recebe o placar de agora; o anfitrião devolve o boneco (o bot sai). Se quem cai é o anfitrião, a partida para sem
  resultado e a sala passa para quem está há mais tempo.
* A mesma pessoa abrindo em outra aba: a nova fica com a conexão; a antiga é avisada e para de tentar.
* Chat da sala: até 120 letras, 1 por segundo, sem repetir em 30 s, com filtro (palavrão, link, @, telefone, CPF, e-mail),
  denúncia (2 pessoas diferentes escondem e silenciam o autor por 5 min naquela sala). Chat do Brasil: 1 a cada 3 s, sem
  repetir, o mesmo filtro, denúncia (3 pessoas diferentes escondem e silenciam o autor por 10 min). Ver "O chat (v81)".

## Testes

```bash
node tests/servidor_test.js        # as regras (na memória) e duas sessões pela rede (HTTP, origem, reconexão); a parte 0: o login obrigatório (v84)
python3 tests/online_test.py       # o jogo de verdade no navegador: sessões independentes contra este servidor
node tests/plataforma_salas_test.mjs   # montado na plataforma (sessão do site e selo conferido)
```
