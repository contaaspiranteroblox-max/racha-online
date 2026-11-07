# Protótipo: as partidas do RACHA no Colyseus

**Isolado.** Nada aqui é usado pelo jogo, pelo `server.js` nem pela plataforma. O protótipo **lê** os arquivos de sempre
(`server/partida/sala.js`, `server/partida/nucleo.js`, `server/banco.js`, `server/turma.js`, `server/ws.js`,
`app/api/lib/selo.ts`, `app/contracts/*.ts`) e não muda nenhum deles.

A auditoria, a comparação e o plano de migração estão em **[AVALIACAO.md](AVALIACAO.md)**.

## Rodar os testes

```bash
cd prototipos/colyseus
npm install          # (uma vez) Colyseus 0.18 — ver "As dependências" abaixo
npm test             # = node testes/roda.mjs — os 6 testes, ~2 min
node testes/roda.mjs 3 4   # só o 3 e o 4
```

Precisa do **Node 22.18 ou mais novo** (os testes carregam `app/api/lib/selo.ts` e `app/contracts/*.ts` direto, com a
remoção de tipos do próprio Node).

| teste | o que prova |
|---|---|
| `t1_fisica` | a física é a do RACHA: o quadro binário volta igual; a partida jogada no Colyseus, reproduzida fora dele, dá os mesmos quadros |
| `t2_salas` | pública, privada (código), ranqueada só pela fila e só com o bilhete da plataforma, o rank assinado |
| `t3_reconexao` | apagão, queda, a volta sozinha do SDK, a página recarregada, outro aparelho, a janela vencida |
| `t4_trapaca` | mensagens forjadas, comandos absurdos, speed hack, enxurrada, origem, selo fabricado, o resultado de quem sai no meio |
| `t5_rede` | bytes contra o JSON de hoje, a previsão no 4G de mentira, dez salas ao mesmo tempo |
| `t6_integracao` | a turma de verdade e o Colyseus na mesma porta; os selos nas regras da plataforma; a ponte da sala da turma |

Os testes sobem o próprio servidor numa porta livre e usam o "4G de mentira" do repositório (`tests/v92_proxy.cjs`).
Linhas como `❌ reconnection token invalid…` ou `Max payload size exceeded` no meio da saída são o Colyseus contando o
que ele recusou — os testes pedem essas recusas.

## Subir o servidor do protótipo

```bash
npm start            # o Colyseus sozinho em http://127.0.0.1:2567
npm run junto        # o Colyseus + a turma de verdade no "/" da mesma porta (a fase 1 da AVALIACAO.md)
```

O segredo do bilhete e do selo vem do `RACHA_SEGREDO_SALAS` (o mesmo da plataforma); sem ele, um segredo de teste.

## As peças

| arquivo | |
|---|---|
| `servidor/sala_racha.mjs` | a sala do Colyseus em volta do `PartidaSala` de sempre |
| `servidor/codec.mjs` | o quadro em bytes, sem perda |
| `servidor/fila.mjs` | a fila da ranqueada (QueueRoom) com o rank do bilhete |
| `servidor/ponte.mjs` | a sala da turma jogando a partida no Colyseus |
| `servidor/montagem.mjs` | o Colyseus dentro de um servidor HTTP que já existe (origem, CORS, 4 KB por mensagem) |
| `servidor/index.mjs` | sobe tudo; `POST /racha/volta` (o token da vaga pela conta) |
| `servidor/gravador.mjs` | grava e reproduz a partida (a prova da física) |
| `cliente/aparelho.mjs` | o aparelho de mentira (SDK do Colyseus): entrada, fila, vaga, comandos 60/s, freio, volta |
| `cliente/previsao.mjs` | o esqueleto da previsão com o núcleo (só a própria tampinha) |

## As dependências

`package.json` pede `@colyseus/core` 0.18.27, `@colyseus/ws-transport` 0.18.4, `@colyseus/schema` 5.0.45 e
`@colyseus/sdk` 0.18.9 (o servidor do jogo, hoje, não tem nenhuma dependência).

Neste ambiente o registro do npm não estava acessível, então o `node_modules/` que rodou os testes foi **construído do
código-fonte** do repositório `colyseus/colyseus` (commit `db47af86`, 5/11/2026 — as mesmas versões publicadas no npm
nesse dia), com um `express` de mentira no lugar do verdadeiro (o `@colyseus/ws-transport` importa o express — uma dependência par,
que o npm instala sozinho — mas só o usa se você pedir um app express; o protótipo não pede). O
`node_modules/` não vai para o git; numa máquina com internet, `npm install` aqui dentro instala os pacotes publicados.
