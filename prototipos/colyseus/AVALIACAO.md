# RACHA × Colyseus — auditoria, comparação e migração gradual

Protótipo isolado em `prototipos/colyseus/` (o jogo principal não mudou uma linha). Seis testes de multiplayer de verdade
(servidor real, aparelhos pelo SDK do Colyseus, o "4G de mentira" do RACHA na frente), **todos passando** — ver §5.
Colyseus estudado e usado: **0.18.27** (código do repositório `colyseus/colyseus`, commit `db47af86`, 5/11/2026 — a mesma
versão publicada no npm nesse dia).

---

## 1. Em uma página

**O RACHA já tem a parte mais difícil.** Desde a v83 toda partida de sala roda no servidor (`server/partida/sala.js`), com
a física num núcleo só (`server/partida/nucleo.js`) que o aparelho também roda para prever a própria tampinha (v92), a fila
de comandos com palpite e recuperação (v96), o balde de ritmo (v108), o relógio do motor que alcança até 12 passos (v108) e
o selo HMAC do resultado que a plataforma confere. **Nada disso deve ser trocado pelo Colyseus** — o Colyseus não tem
física, e a previsão dele (`@colyseus/sdk/predict`) é genérica e experimental; a do RACHA é feita para este jogo e já mede
0,06 px de correção típica.

**Onde o Colyseus ajuda de verdade:**

| | o que entra | medido no protótipo |
|---|---|---|
| Salas | matchmaking por modo/tamanho/jogo, privada por código, **fila da ranqueada com o rank assinado** (não o que o aparelho diz) | 19/19 em `t2_salas` |
| Rede | o quadro de sempre **em binário sem perda** + o estado pequeno em Schema | **−59% a −70%** de bytes para baixo por aparelho, −46% para cima |
| Reconexão | reserva de vaga com token, volta automática do SDK, volta pela conta (outro aparelho) | de volta em **~0,3 s** depois de a conexão cair |
| Trapaça | entrada só pelo HTTP com o bilhete (`onAuth`), limites de mensagem, **resultado direto do servidor para a plataforma** | 12/12 em `t4_trapaca` |
| Integração | monta no MESMO servidor HTTP, ao lado da turma; selos no formato que a plataforma já confere | 8/8 em `t6_integracao` |

**O que custa:** o servidor hoje não tem dependências (`Dockerfile`: "O servidor não tem dependências"); com o Colyseus
passa a ter (~14 MB em `node_modules`, inclusive `ws`, `msgpackr`, `nanoid`, `debug`, `@colyseus/better-call`,
`@better-auth/*`). O jogo ganha ~218 KB minificados / **~70 KB com gzip** (SDK + o decodificador do quadro) — o
`racha.html` tem 6,2 MB / 2,9 MB com gzip hoje. E é uma camada a mais para acompanhar: o Colyseus quebra API entre versões
"menores" (0.15 → 0.16 → 0.17 → 0.18).

**Recomendação:** migrar **só a partida**, em fases, cada uma atrás de uma chave e com volta imediata, e **a turma continua
dona do lobby** (lista, chat, amigos, clubes, copa, convites, admin). A ponte já está provada no protótipo (§5, `ponte.mjs`).

---

## 2. A arquitetura de hoje (auditoria)

```
 aparelho (racha.html)                       servidor (Node, sem dependências)                       plataforma (Hono + MySQL)
 ┌────────────────────────┐   WebSocket "/"   ┌──────────────────────────────────────────┐   bilhete   ┌──────────────────────────┐
 │ NET49 (o canal)        │ ── JSON texto ──▶ │ server/ws.js (RFC 6455 próprio, só texto) │ ◀────────── │ jogo.bilheteSala         │
 │ v92 previsão (núcleo)  │ ◀── quadros ───── │ server/turma.js  (lobby + salas + fila)   │             │ (app/api/lib/selo.ts)    │
 │ tools/v92/rede.js      │   60/s, JSON      │   └ PartidaSala (server/partida/sala.js)  │    selo     │ jogo.encerrarPartida     │
 └────────────────────────┘                   │       └ nucleo.js (a mesma física)        │ ─(aparelho)▶│ confereSelo + regras     │
                                              │       └ MOTOR (60 passos/s, alcança 12)   │             │ (jogoRouter.ts:221)      │
                                              └──────────────────────────────────────────┘             └──────────────────────────┘
   montado sozinho: server.js / server/servidor.js · montado na plataforma: app/api/boot.ts:80 → app/api/lib/salas.ts (mesma porta)
```

### 2.1 Servidor autoritativo — **forte, manter**
- Toda partida de sala (pública, privada, copa e ranqueada) roda no servidor desde a v83 (`server/turma.js:30-37`): o
  aparelho só manda o comando; quadro ou fim mandado por aparelho vira registro de suspeito (`turma.js:857`, `:931`).
- A física é uma só (`server/partida/nucleo.js`, 829 linhas) — o build cola o mesmo arquivo no jogo para a previsão.
- O relógio é o do motor: um acumulador compartilhado por todas as salas, 60 passos/s, alcançando até 12 passos depois de
  um engasgo (`sala.js:116-125`, v108; o `setFixedTimestep` do Colyseus alcança só 5 — a "câmera lenta" que a v108 tirou).
- A fila de comandos: colchão, palpite de até 4 passos (`sala.js:410`), crédito e recuperação (v96, `sala.js:87-90`),
  silêncio de 350 ms = parado (`sala.js:77`), descarte do que sobra; o balde de 75 comandos/s com rajada de 150 (v108,
  `server/partida/ritmo108.js`).
- Placar, relógio v80, gols, autoria, assistências e o fim nascem no motor; o selo leva `h:1`, `gl`, `as`, `pid`
  (`turma.js:961-966`).

### 2.2 Salas — **funciona; dois pontos fracos**
- Pública/privada: código de 6 letras sem I, O, 0 e 1 (`turma.js:103`), a sala na lista com `pub`.
- Ranqueada (v79): a fila junta pelos pontos — **os pontos que o aparelho declara** (`turma.js:1539`: `pts = inteiro(m.pts…)`;
  agrupamento em `filaGrupo`, `:1569`). Um aparelho modificado pode dizer que é fraco e cair com os fracos.
- Esperas da fila: 8 s para 2+ jogarem com bots, 20 s para jogar sozinho contra os bots (`turma.js:80`, `:1546-1557`, a regra dos 8 s em `:1553`).
- Tudo num processo só (salas, chat, social, clubes e partidas): sem caminho pronto para dividir em vários processos.

### 2.3 Sincronização — **o maior ganho fácil**
- O canal é um WebSocket próprio que só fala texto: o quadro binário é recebido e **jogado fora** (`server/ws.js:90`, só o
  opcode 1 vira mensagem), `send(texto)` (`ws.js:25`), sem extensões (`ws.js:5`), quadro de até 1 MiB (`ws.js:10`).
- O quadro inteiro vai em JSON, 60 por segundo desde a v105 (`turma.js:186-190`, `:824`). Medido com os mesmos quadros
  (`t5_rede`): **15,7 KB/s** por aparelho no 1v1, **21,1 KB/s** no 2v2, **26,3 KB/s** no 3v3 COM CURVA — só para baixo.
- O comando sobe em JSON com o x e o y em ponto flutuante cheio (~100 bytes, 6,5 KB/s).

### 2.4 Reconexão — **funciona; detecção lenta**
- Quem cai tem a vaga guardada por 90 s (`turma.js:534`), um bot assume na ranqueada (`sala.js:254-262`), e a volta é pela
  conta (ou pelo token do visitante) no `hello` (`turma.js:353`, `:668`).
- A conexão morta "em silêncio" (o celular que perdeu o sinal sem fechar) só é derrubada pelo batimento de 15 s
  (`turma.js:155`, `:278-282`): entre 15 e 30 s até a vaga entrar em reserva e o bot assumir. O motor já para a tampinha em
  350 ms, mas o resto da sala espera esse tempo.
- O aparelho para de mandar comandos depois de 2 s sem quadro (o freio citado em `ritmo108.js:15-16`).

### 2.5 Trapaças e resultado — **bom; dois buracos**
- Bom: o motor decide tudo; o comando é limpo (x e y presos em −1..1, botões e contadores conferidos — `sala.js:341-350`);
  o ritmo é limitado duas vezes (`turma.js:878` e o balde da v108); o bilhete é HMAC com 15 min (`app/api/lib/selo.ts`,
  `BILHETE_MS`); a origem é conferida (`turma.js:1759`; sem `Origin` passa — certo: só navegador manda, e é ele que um site
  de fora usaria); limite de conexões por IP (`turma.js:95`); o selo é usado uma vez só pela plataforma (v100).
- **Buraco 1 — a fila pelos pontos declarados** (§2.2).
- **Buraco 2 — o resultado só chega pela mão do aparelho.** O selo vai para cada aparelho (`turma.js:966-971`) e a
  plataforma só o recebe quando o aparelho chama `encerrarPartida` (`app/api/racha/jogoRouter.ts:221`). A v82 já cobra
  desistência da ranqueada que passa de 30 min sem fim (`jogoRouter.ts:20-22`, `:78-97`) — mas só de quem abriu a partida
  com `iniciarPartida`; um aparelho modificado que nunca chama `iniciarPartida` perde a ranqueada sem perder pontos.
- Baixo: o quadro manda a direção que cada um está apertando (`Q.ent`, `sala.js:685`, v102 — a previsão dos outros
  precisa); dá um passo de antecipação a um robô que leia o quadro. Aceitável.

### 2.6 Movimento no celular — **forte, manter**
- A previsão roda o MESMO passo do servidor (`tools/v92/rede.js`), com o toque de PASSE/CHUTE previsto na hora (som,
  piscada, vibração), rollback + replay a cada quadro e o deslize curto da correção (`tauCorr`, `rede.js:223`).
- O que falta não é técnica de previsão: é rede mais leve (§2.3) e a volta mais rápida (§2.4).

### 2.7 Integração — **o que tem que continuar valendo**
- A plataforma assina o bilhete (`jogoRouter.ts:107` → `bilheteDaConta`) e confere o selo com `confereSelo` e as regras
  de `app/contracts/partida.ts · motivoResultadoOnline` (a conta com 6 dígitos de `formatarIdPublico`, o placar, o modo, a
  validade, `k:1` e o tamanho na ranqueada).
- Montada na plataforma, a turma confere a sessão do site antes do aperto de mão (`app/api/lib/salas.ts`) e fala com o
  banco (MySQL/drizzle) pelos ganchos `selosDe`, `relacoesDe`, `denuncia`, `silencioDe` (`app/api/boot.ts:81-93`).
- Código parado: o gerente das partidas `auto_*` da v83 (`server/partida/gerente.js`, `partida.js`, `fisica.js`) — o jogo de
  hoje não manda `auto_*` (0 ocorrências no `racha.html`). Não atrapalha; pode sair numa limpeza.

---

## 3. O Colyseus 0.18 — o que importa para o RACHA

### 3.1 As peças usadas
- **Room** (o ciclo de vida da sala: `onCreate`, `onJoin`, `onDrop` → `allowReconnection` → `onReconnect`, `onLeave`,
  `onDispose`), `maxClients`, `lock()`, `setPrivate()`, `metadata`.
- **matchMaker**: `joinOrCreate`/`create`/`joinById`/`reconnect` pelo HTTP (`POST /matchmake/...`), `filterBy`, a reserva da
  vaga, `createRoom` + `reserveSeatFor` do lado do servidor (é assim que a fila e a ponte criam a partida).
- **`static onAuth(token, opções, contexto)`**: roda no pedido HTTP, antes de reservar a vaga — o bilhete da plataforma
  entra aqui (no `Authorization: Bearer`; montado na plataforma, dá para ler a sessão do cookie pelo `contexto.headers`).
- **Schema** (`@colyseus/schema` 5): o estado pequeno, mandado só quando muda.
- **Mensagens em bytes**: `broadcast('q', Uint8Array)` vai cru, sem msgpack — o quadro binário do RACHA passa direto.
- **SDK**: entrada, mensagens, volta automática na queda (1001/1005/1006/4010).
- **QueueRoom** (a fila com grupos por rank) e **Presence/Driver** (Redis, para vários processos — não usado aqui).

### 3.2 Pegadinhas encontradas (e o que o protótipo faz com cada uma)

| pegadinha (Colyseus 0.18) | efeito no RACHA | no protótipo |
|---|---|---|
| `setFixedTimestep` alcança no máximo 5 passos | a câmera lenta depois de um engasgo que a v108 tirou | o motor do RACHA continua com o relógio dele (alcance 12) |
| o relógio da sala só anda com patch/timestep | temporizador da sala "parado" | temporizadores do Node, limpos no `onDispose` |
| CORS padrão devolve **qualquer** origem; o middleware do Node não põe CORS na resposta do POST | site de fora usa o matchmaking / o navegador de outra origem não lê a vaga | a regra de origem da turma (403) e o CORS só da origem permitida (`montagem.mjs`) |
| `onAuth` pode rodar até 5 vezes por pedido | efeito colateral repetido | `onAuth` só confere (sem efeito) |
| `metadata = {…}` **substitui** (0.18) e o `filterBy` mora nele | a sala some do matchmaking | `{ ...this.metadata, … }` |
| `filterBy` só filtra as chaves que vieram no pedido | pedido sem `modo` cairia em qualquer sala | `onAuth` recusa pedido sem modo/tamanho/jogo válido |
| `QueueRoom` usa o **rank que o aparelho manda** e lê `maxPlayers`, `maxWaitingCycles`… das opções do pedido | a mesma trapaça da fila de hoje | `fila.mjs`: o rank vem do bilhete assinado; só as opções do servidor |
| `maxMessagesPerSecond` derruba (4002) | o apagão do 4G que solta 300+ comandos de uma vez derrubaria | teto 300/s + o freio de 2 s do aparelho (rajada ≤ ~125); o balde da v108 faz o ritmo fino |
| o SDK reenvia até 10 mensagens guardadas na volta | comandos velhos atrasam a tampinha | `maxEnqueuedMessages: 0` (a fila do motor recomeça na volta) |
| o SDK desiste da volta em ~56 s e só tenta depois de 5 s na sala | a janela de 90 s da turma não é aproveitada; quem cai no começo não volta sozinho | `maxRetries: 25`, `minUptime: 1500` |
| sala trancada não aceita `joinById` | quem perdeu o token (outro aparelho) não volta | `POST /racha/volta` com o bilhete devolve o token da vaga da conta |
| mensagem acima de `maxPayload` fecha com 1009 no aparelho, mas chega como **1006** no servidor | parece uma queda comum (a vaga fica guardada) | aceitável (só derruba quem mandou); documentado |
| o `matchMaker` é um só por processo | dois servidores no mesmo processo se atropelam | um servidor por vez (testes em processos separados) |
| `content-length` da resposta do matchmaking = `json.length` | quebraria com acento no metadata | metadata só ASCII (`modo`, `n`, `jogo`) |

---

## 4. Lado a lado — as 7 prioridades

| prioridade | RACHA hoje | Colyseus | decisão |
|---|---|---|---|
| 1. Autoritativo (física, bola, jogadores, gols, resultado) | completo (v83+), física compartilhada com a previsão | não tem física; dá o ciclo de vida da sala | **manter o motor**; a sala do Colyseus só embrulha o `PartidaSala` (provado: quadros idênticos um por um) |
| 2. Salas públicas, privadas, ranqueadas | turma; fila pelos pontos **declarados** | matchmaking, privada por id, QueueRoom | **adotar** para a partida; ranqueada pela fila com rank **assinado**; a turma segue com o lobby |
| 3. Sincronização eficiente, baixa latência | JSON 60/s, ~16–26 KB/s por aparelho | mensagens em bytes + Schema | **adotar** o transporte com o quadro binário sem perda (−59% a −70%); o Schema só para o estado pequeno |
| 4. Reconexão automática | 90 s pela conta; detecção em 15–30 s | token + volta do SDK; ping de 3 s | **adotar**, com a volta pela conta e as opções do SDK ajustadas |
| 5. Trapaças e resultados | bom; fila e resultado pela mão do aparelho | `onAuth` no HTTP, limites | **adotar** + resultado direto do servidor para a plataforma |
| 6. Celular: previsão e reconciliação | v92 com o núcleo (forte) | `predict` experimental, genérico | **manter a do RACHA**; o protótipo mostra que ela funciona igual pelo Colyseus |
| 7. Integração com servidor e banco | turma montada na plataforma; selo conferido | monta num servidor HTTP que já existe | **montar ao lado da turma**, mesmo processo e porta; selo no formato de sempre |

---

## 5. O protótipo

### 5.1 Como encaixa

```
 aparelho (SDK do Colyseus)                     o MESMO servidor HTTP (index.mjs · montagem.mjs)
 ┌──────────────────────────┐  POST /matchmake  ┌───────────────────────────────────────────────────────────────┐
 │ cliente/aparelho.mjs     │ ── + bilhete ───▶ │ onAuth (o bilhete da plataforma)                               │
 │  · codec (desempacota)   │                   │ "racha"  sala_racha.mjs ── PartidaSala + núcleo + MOTOR (iguais) │
 │  · previsao.mjs (núcleo) │ ◀─ 'q' binário ── │ "fila"   fila.mjs (QueueRoom, rank do bilhete)                 │
 │  · comandos 60/s, freio  │ ── 'c' comando ─▶ │ ponte.mjs (a sala da turma → a partida)                         │
 └──────────────────────────┘   /<proc>/<sala>  │ "/" → a turma de verdade (server/turma.js), com --junto        │
                                                │ POST /racha/volta (o token da vaga pela conta)                 │
                                                └───────────────────────────────────────────────────────────────┘
                                                      │ selo (formato da turma) · resultado assinado ▶ plataforma
```

| arquivo | o que faz |
|---|---|
| `servidor/sala_racha.mjs` | a sala: entrada pelo bilhete, lugares e times como no roster da turma, o motor de sempre, quadro binário, Schema pequeno, queda/volta, fim com o selo da turma + o resultado direto para a plataforma |
| `servidor/codec.mjs` | o quadro clássico em bytes e de volta **igual** (posições ×10 em 2 bytes, com 4 bytes se não couber; o gol quando muda e no quadro-chave; o raro em JSON) |
| `servidor/fila.mjs` | a fila da ranqueada (QueueRoom) com o rank do bilhete assinado; a sala que ela cria é privada e só aceita quem ela chamou |
| `servidor/ponte.mjs` | a sala da turma joga a partida no Colyseus: mesmo código, os lugares da turma, uma vaga reservada para cada um |
| `servidor/montagem.mjs` | o Colyseus dentro de um servidor HTTP que já existe, com a regra de origem da turma e o limite de 4 KB por mensagem |
| `servidor/index.mjs` | sobe tudo; `--junto` põe a turma de verdade no "/" da mesma porta; `POST /racha/volta` |
| `servidor/gravador.mjs` | grava a partida (relógio + comandos) e roda de novo fora do Colyseus (a prova da física) |
| `cliente/aparelho.mjs`, `previsao.mjs` | o aparelho de mentira (SDK do Colyseus) e o esqueleto da previsão com o núcleo |

### 5.2 O que os testes provam (`node testes/roda.mjs`)

| teste | verificações | o que prova |
|---|---|---|
| `t1_fisica` | 8 | 16.200 quadros (1v1 a 4v4, COM CURVA, chutes do Rachão, vaga vazia) voltam iguais do binário; uma partida jogada no Colyseus e reproduzida **fora** dele dá os 499 quadros idênticos; o motor anda a 60,0 passos/s; o aparelho recebe exatamente o que o servidor calculou |
| `t2_salas` | 19 | casual por tamanho e jogo; sala cheia trancada; pedido inválido recusado; privada por código (sem I, O, 0, 1) fora do matchmaking; ranqueada só pela fila e só com o bilhete de verdade (outro segredo, adulterado e vencido recusados); a fila junta pelo rank **assinado** (o "rank: 0" do pedido não vale); bots completam; a sala da fila recusa quem ela não chamou; a mesma conta fica com o mesmo lugar; nome limpo |
| `t3_reconexao` | 13 | apagão de 2 s e 4 s sem derrubar ninguém; queda de verdade com volta **sozinha** em ~0,3 s, no mesmo lugar, com o quadro-chave certo; a página recarregada volta com o token; outro aparelho volta pela conta; o token não vale duas vezes; na ranqueada o bot assume na hora; depois da janela nada volta; todos foram embora = sem resultado e a sala some |
| `t4_trapaca` | 12 | quadro/fim/placar/selo/gol/aviso forjados não mudam nada e ficam anotados; 1e9, NaN e lixo não aceleram; 120 comandos/s não andam mais rápido; comando velho não mexe; enxurrada derruba sem guardar a vaga; mensagem > 4 KB derruba; site de fora recebe 403; selo fabricado ou mexido a plataforma recusa; quem sai no meio não segura o resultado |
| `t5_rede` | 8 | bytes por aparelho contra o JSON de hoje com os mesmos quadros; previsão no 4G de 80 e 150 ms; o ack; dez salas ao mesmo tempo a 60 passos/s |
| `t6_integracao` | 8 | a turma de verdade e o Colyseus na mesma porta; ranqueada do começo ao fim com gol; os selos passam em `confereSelo` e `motivoResultadoOnline` da plataforma; o resultado direto confere; a ponte da sala da turma |
| **total** | **68** | |

### 5.3 Números medidos

| medida | hoje (JSON) | protótipo (Colyseus + binário) |
|---|---|---|
| quadro médio (16.200 quadros) | 479 bytes | 153 bytes (−68%) |
| para baixo, 1v1 (por aparelho) | 15,7 KB/s | 4,7 KB/s (−70%) |
| para baixo, 2v2 | 21,1 KB/s | 7,6 KB/s (−64%) |
| para baixo, 3v3 COM CURVA | 26,3 KB/s | 10,9 KB/s (−59%) |
| para cima (comandos) | 6,5 KB/s | 3,5 KB/s (−46%; o x e o y ainda em 8 bytes) |
| correção da previsão, 4G de 80 ms ± 10 | — | 0,06 px (p50) / 0,09 px (p95); sem previsão o jogador veria 18–22 px de atraso |
| correção da previsão, 4G de 150 ms ± 25 | — | 0,06 px (p50) / 4,5 px (p95); sem previsão, 31–45 px |
| comando até o ack | — | 85 ms (p50) com 80 ms de ida e volta; 140–160 ms com 150 |
| volta depois da queda (Wi-Fi → 4G) | 15–30 s para perceber + o aparelho reconectar | ~0,3 s do corte ao primeiro quadro |
| dez salas, 20 aparelhos | — | 60,0 passos/s em todas; ~10% de um núcleo (servidor + os 20 aparelhos de mentira) |

(Os bytes do TCP/IP — ~50 por pacote — são iguais nos dois caminhos: um pacote por quadro e por comando.)

O que **não** está no protótipo e a turma faz: a contagem e o replay do gol (v93), a pausa, o árbitro/admin no meio da
partida (expulsar, promover), espectadores, a revanche, o Rachão, a OFICINA (mapas de até 4 times), o motor v94, a copa,
o craque/MVP no selo (aqui `v:0`), o grupo de amigos junto na fila (v93) e as duas esperas da fila (8 s / 20 s — aqui uma).

---

## 6. A migração gradual

Cada fase tem uma chave (variável de ambiente) que **volta para o caminho de hoje sem deploy**, e só começa quando a
anterior passou no critério. Os aparelhos antigos nunca deixam de funcionar: o caminho de hoje fica de pé até o fim.

### Fase 0 — o protótipo (feita)
`prototipos/colyseus/` + 68 verificações. Nada do jogo mudou.

### Fase 1 — o Colyseus montado, desligado (`RACHA_COLYSEUS=0` por padrão)
- **O que muda:** `server/servidor.js` e `app/api/boot.ts` montam o Colyseus no MESMO servidor HTTP, ao lado da turma
  (`montaColyseus`). Na plataforma (Hono), o matchmaking entra como rota: `app.all('/matchmake/*', c =>
  getDefaultRouter().handler(c.req.raw))` (`@colyseus/core/router/default_routes`), com a regra de origem da turma num
  middleware; o `onAuth` aceita o bilhete e, montado ali, a sessão do site pelo cookie (como `lib/salas.ts`).
  O `Dockerfile` passa a instalar as dependências do servidor (`npm ci --omit=dev`) — versões **fixas** e lockfile.
- **O que não muda:** a turma, o jogo, a plataforma, o banco.
- **Para seguir:** a suíte do protótipo rodando contra o servidor de verdade (staging) + os testes de hoje do repositório.
- **Para voltar:** `RACHA_COLYSEUS=0` (padrão).

### Fase 2 — a ponte: as salas da turma jogam a partida no Colyseus (`RACHA_COLYSEUS_SALAS=1`)
- **O que muda:** quando o admin aperta COMEÇAR, a turma chama `partidaDaTurma(...)` (já provado em `t6`) e manda a vaga
  de cada aparelho pelo WebSocket dela (`{type:'partida', vaga}`); o aparelho novo entra com `consumeSeatReservation`,
  recebe o quadro binário e o entrega ao MESMO `net49Snapshot` de hoje (o decodificador devolve o objeto de sempre: a
  previsão v92, o desenho e o som não mudam). A turma recebe o fim pela sala (selo e resumo) e segue registrando troféus,
  clube e copa como hoje.
- **Quem vai:** só aparelho que anuncia no `hello` que entende a partida nova (como o `v93`/`v105` de hoje) e só nas salas
  de futebol e COM CURVA (as que o `PartidaSala` roda); Rachão, OFICINA e v94 continuam no caminho de hoje.
- **A medir em produção (A/B por sala):** bytes por aparelho, correções da previsão (o painel da v102), quedas e voltas,
  tempo até o bot assumir, CPU do processo.
- **Para seguir:** duas semanas sem regressão nas medidas e sem aumento de reclamação de "travou/teleporte".
- **Para voltar:** `RACHA_COLYSEUS_SALAS=0` — a próxima partida já sai pelo caminho de hoje.
- **Falta construir:** a contagem/replay da v93, a pausa e o admin dentro da partida (a turma chama a sala pelo
  `matchMaker.remoteRoomCall(id, 'expulsa', [conta])`), espectadores (entrar na sala como observador, sem lugar).

### Fase 3 — a ranqueada pela fila com o rank assinado (`RACHA_FILA_COLYSEUS=1`)
- **Plataforma:** o `bilheteDaConta` passa a assinar `rk` (os pontos da patente) — uma linha em `app/api/lib/selo.ts`
  (`ExtraBilhete`) e no `jogoRouter.ts:107`.
- **Servidor:** a fila do Colyseus (`fila.mjs`) no lugar da `fila` da turma para os aparelhos novos; portar o grupo de
  amigos (o `teamId` do QueueRoom) e as duas esperas (8 s com 2+, 20 s sozinho).
- **Para seguir:** tempo de espera e equilíbrio de rank iguais ou melhores que os de hoje.
- **Para voltar:** a chave; a fila da turma continua lá.

### Fase 4 — o resultado direto do servidor para a plataforma (`RACHA_RESULTADO_SERVIDOR=1`)
- **Plataforma:** uma rota interna que confere o documento assinado (`tipo:'resultado'`, `pid`, as contas, o placar —
  o formato que `sala_racha.mjs` já gera) e aplica a partida **para todas as contas** do documento, uma vez por `pid`+conta
  (a mesma trava de "selo já usado" da v100). O selo pelo aparelho continua aceito no período de transição (o primeiro
  que chegar vale; o segundo é duplicado).
- **Fecha o buraco 2** (§2.5): quem fecha o jogo para não perder, perde.
- **Para voltar:** a chave; o selo pelo aparelho continua funcionando.

### Fase 5 — só se precisar
- Vários processos (Presence/Driver com Redis) quando um processo não der conta — o Colyseus já tem; a turma não.
- Levar Rachão, OFICINA e v94 para salas do Colyseus (o mesmo embrulho: o motor deles não muda).
- Desligar o caminho antigo da partida quando nenhum aparelho antigo aparecer por um mês.

---

## 7. O que não fazer
- Não trocar o lobby, o chat, o social, os clubes e a copa: a turma faz isso bem e não tem o que o Colyseus melhore ali.
- Não trocar a física nem a previsão pelas do Colyseus (`predict`/`input` são experimentais e genéricos).
- Não usar `setFixedTimestep` para o motor (alcance de 5 passos).
- Não mandar o quadro de 60/s pelo Schema: o Schema serve para o estado pequeno; o quadro vai em bytes (já sem perda).
- Não deixar o CORS e as opções da `QueueRoom` no padrão do Colyseus (§3.2).

## 8. Riscos e o que falta
- **Dependências e cadeia de fornecimento:** de zero para ~20 pacotes no servidor; fixar versões, lockfile, `npm audit` no
  CI. Aqui o registro do npm não estava acessível: o `node_modules` do protótipo foi construído do código-fonte do
  repositório (commit `db47af86`), com um `express` de mentira (o `ws-transport` importa o express como dependência par —
  o npm instala sozinho — mas só o usa se você pedir um app express).
- **Ritmo do Colyseus:** breaking changes frequentes entre versões menores; prender na 0.18.x e atualizar só com a suíte.
- **Tamanho do jogo:** +~70 KB com gzip (SDK + decodificador) no `racha.html`.
- **O esqueleto da previsão** do protótipo só anda a própria tampinha (perto da bola e dos outros, o jogo de verdade usa o
  passo inteiro do núcleo — `tools/v92/rede.js`); as medidas de correção são com a tampinha longe da bola.
- **A ida de 150 ms ± 25:** a correção p95 sobe para ~4,5 px porque a fila do motor às vezes fica vazia e ele segue o
  último comando (o palpite). É o motor de hoje (não é do Colyseus); um colchão que se ajusta à oscilação medida seria a
  melhoria — independente da migração.
- **O comando ainda em msgpack** com x e y em 8 bytes: dá para mandar em ~8 bytes binários (x e y em 1 byte, −127..127),
  mas aí a previsão do aparelho tem que usar o mesmo valor arredondado — mudança de física de entrada, para outra versão.

## 9. Fontes
- Colyseus — código-fonte estudado: repositório `colyseus/colyseus`, commit `db47af86` (5/11/2026).
- [Migrating to 0.18 — documentação do Colyseus](https://docs.colyseus.io/migrating/0.18) (metadata que substitui,
  Schema 5, `setTimestep`, previsão como adição).
- [@colyseus/core no Snyk](https://security.snyk.io/package/npm/%40colyseus%2Fcore) (0.18.27, publicada em 5/11/2026,
  sem vulnerabilidade direta conhecida).
