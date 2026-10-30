# RACHA v94 · a versão de TESTES do motor próprio

Esta é a **versão de testes** do RACHA v94: a jogabilidade reconstruída com um **motor próprio** (`server/partida/motor.js`),
o mesmo arquivo no jogo e no servidor. O painel **AJUSTES › TESTES** continua inteiro e ganhou a parte **MOTOR**.

> Nada foi publicado nem mexido na produção. **Não publique este ZIP como está no serviço oficial:** ele vem com
> `experimental: true` no `app/public/game/config.js` (o painel aparece para todos).

## Qual motor vale neste ZIP

- **ZIP das etapas 1 a 7** (`racha-online-v94-testes-etapas1a7.zip`): o motor próprio está pronto, mas **o padrão ainda é o
  motor de antes** — ative o motor novo como está abaixo.
- **ZIP final** (depois da etapa 8): o motor próprio já vem como padrão; o motor de antes continua no painel para comparar.

## Como ativar o motor novo

**No treino e na partida contra os bots (um celular só, sem servidor):**
1. Abra o jogo (`http://localhost:8080` no PC, ou o link de testes) e toque em **SÓ TREINAR OFFLINE**.
2. **AJUSTES › TESTES** (no PC: **F2**) › a parte **MOTOR** (a primeira) › **MOTOR PRÓPRIO** — ou **PADRÃO v94**, que também
   volta todos os números do motor próprio para os da especificação. Em cima aparece "Agora vale o MOTOR PRÓPRIO (v94)".
3. Na partida, a **pausa** tem **MOTOR: PRÓPRIO/DE ANTES ⇄** (troca na hora) e **A ⇄ B** (as memórias já vêm prontas:
   **A = o motor próprio**, **B = o motor de antes**) — para comparar os dois no mesmo lance.

**Para todo mundo, sem o painel:** no `app/public/game/config.js`, acrescente a linha `motor: 'v94',` dentro do
`RACHA_CONFIG` (ou `motor: 'v93',` para forçar o de antes).

**No online (dois celulares e o PC):**
1. No Windows, dê dois cliques em **`INICIAR-TESTES-MOTOR-NOVO-NO-WINDOWS.bat`**: todas as salas jogam no motor próprio
   (`RACHA_EXPERIMENTAL=1` e `RACHA_MOTOR_JOGO=v94`). O **`INICIAR-TESTES-NO-WINDOWS.bat`** sobe as salas no motor de antes;
   nele, o admin escolhe o motor no painel (MOTOR PRÓPRIO) e toca em **MANDAR PARA A SALA** (parte ONLINE) antes de começar.
   Fora do Windows: `RACHA_EXPERIMENTAL=1 RACHA_MOTOR_JOGO=v94 node server.js`.
2. No PC: `http://localhost:8080`; nos celulares (mesmo Wi-Fi): `http://IP-DO-PC:8080` (o .bat mostra o IP).
3. Na sala, a linha da parte ONLINE do painel diz "motor da sala: o PRÓPRIO (v94)". Se alguém em campo estiver com uma
   página antiga do jogo guardada no aparelho, a rodada vai no motor de antes para todos e o chat da sala avisa
   (recarregue a página nesse aparelho).

## O que vale a pena testar (na mão)

- **Correr, parar e virar**: a tampinha arranca em ~67 ms e para em ~50 ms (o motor de antes era instantâneo). Se ficar
  pesado ou solto demais, os números Arrancada, Parada e Inversão estão no painel.
- **PASSE e CHUTE**: com a bola parada, chutando correndo e com a bola vindo; o toque um pouco antes de a bola chegar
  (até 100 ms vale); segurar o botão até a bola chegar; **PASSE → CHUTE** (com a bola parada só sai no passo seguinte).
- **Conduzir** (a tampinha dá toques curtos na bola), a disputa de frente, a bola na trave, na linha e na rede.
- **O analógico** (a direção agora é contínua; no painel dá para limitar a 32, 16 ou 8 para comparar) e **a câmera**
  (23 × 13 d; o painel volta para a de antes).
- **O online**: o chute aparece na hora, sem voltar; com o 4G ruim a correção deve continuar pequena.
- **Os bots** (1 VS 1 a 4 VS 4).

## Onde está o resto

`docs/v94/RELATORIO.md` (o relatório: o que mudou, a origem de cada coisa, os testes, as limitações),
`docs/v94/ESPECIFICACAO_MOTOR.md` (a especificação), `docs/v94/PARAMETROS.md` (os números com as unidades),
`docs/v94/COMPARACAO.md` (o motor de antes × o próprio × os vídeos), `docs/v94/OBSERVACOES_VIDEOS.md` (o que os vídeos
mostram e o que não mostram) e `docs/v94/NOTAS_MOTOR.md` (as interpretações de quem escreveu o motor).

**Sem teste em Android e iPhone de verdade**: tudo foi conferido no navegador de teste. A sensação na mão é o que falta
confirmar — e é para isso que serve esta versão.
