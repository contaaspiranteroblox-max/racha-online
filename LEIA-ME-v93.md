# RACHA v93 · a atualização completa (interface, partidas e social)

Feita em cima do ZIP de testes da v92 (`racha-online-v92-testes.zip`), por fases, cada fase num commit com os testes dela
(e três revisões independentes do código, com as correções em commits próprios).
**Nada foi publicado e nenhum banco de produção foi mexido.** O editor de HUD novo foi preservado (só ganhou as melhorias
pedidas); a física (o bloco PHYS, conferido a cada build), a mecânica do DB, o chute, o passe, a movimentação, as contas, o
ranking e a economia continuam os mesmos.

Dois ZIPs, montados do mesmo código (`tools/v92/pacote.py`):

- **`racha-online-v93-testes.zip`** — a versão de testes (como o ZIP que você mandou: `experimental: true` no
  `app/public/game/config.js`, o painel AJUSTES › TESTES v92 e o `INICIAR-TESTES-NO-WINDOWS.bat`). **É este para testar.**
- **`racha-online-v93.zip`** — a versão oficial (sem o painel de testes). Fica pronta para quando você autorizar.

## O que mudou (resumo por fase)

O `CHANGELOG.md` (seção v93) tem o detalhe de cada fase.

1. **Bugs, HUD e controles** — os itens que não equipavam (todas as categorias, na conta e na partida); o editor de HUD com
   vários layouts (criar, nomear, duplicar, excluir, trocar — também na pausa), na conta; opacidade de 1 em 1% (0% invisível
   e tocável); **Efeitos ao pressionar** ligado/desligado por botão; o tutorial com textos curtos e fora dos controles.
2. **Partidas, placar e craque** — a contagem **3, 2, 1, JÁ!** (online, o servidor segura todos e solta junto); o **painel de
   jogadores** (o botão redondo do lado do placar); o **Craque da Partida** (calculado no servidor; na tela do fim e no perfil);
   o **replay do gol** com o cartão de quem marcou e, online, o PULAR por votação (PULAR · 1/3); o **banco de reservas** com as
   tampinhas de quem assiste.
3. **Admin da sala** — o painel lateral do admin (pausa › ADMIN DA SALA ou o ADMIN da tela da sala, em cima do INICIAR):
   mover, trocar, reserva, entrar no meio da partida, passar o admin, encerrar e reiniciar (com confirmação). Só nas salas
   personalizadas. A pausa com muitos botões vai para duas colunas no celular deitado (cabe sem rolar).
4. **Grupo com líder** — CRIAR GRUPO em cima do JOGAR, convidar amigos online, os membros ao lado da tampinha (coroa no líder,
   o status de cada um), o líder procura a ranqueada com o grupo (todos no mesmo time), sair/expulsar/passar a liderança.
5. **Falas rápidas** — o botão do balão ao lado do botão dos jogadores: 8 frases, o balão perto da tampinha (sem cobrir a bola,
   os gols nem os controles), no máximo uma a cada 1,6 s, e BALÕES: LIGADOS/DESLIGADOS.
6. **Bolas** — 10 bolas lisas e brilhantes (Roxa, Rosa, Verde-clara, Verde-escura, Preta, Branca, Azul, Cinza, Marrom e
   Amarela; 1.200 moedas cada) e a **Clássica Lisa** (branca com contorno preto, 2D; grátis). Mesmo tamanho na física.
7. **Sons** — sem estouro (o limitador), o passe com som próprio, variações discretas, a rede no gol, o clique mais macio e o
   bip da contagem. Música e efeitos com volumes separados (Ajustes › Áudio).

## Como testar no iPhone e no Android

1. **Suba o jogo no computador.** No Windows, descompacte o ZIP de testes e dê dois cliques em
   **`INICIAR-TESTES-NO-WINDOWS.bat`** (precisa do Node.js LTS: https://nodejs.org; se o Windows perguntar, permita o acesso
   nas redes privadas). No Linux/Mac: `RACHA_EXPERIMENTAL=1 node server.js`.
2. **Abra no celular**, no mesmo Wi-Fi: `http://IP-DO-COMPUTADOR:8080` (o .bat mostra o IP) e **deite o celular**.
   - **iPhone (Safari):** se o som não sair, toque uma vez na tela (o iOS só libera o áudio depois de um toque). Para tela
     cheia: Compartilhar › Adicionar à Tela de Início.
   - **Android (Chrome):** para tela cheia: ⋮ › Adicionar à tela inicial.
3. **Sozinho:** toque em **SÓ TREINAR OFFLINE** e depois em **JOGAR**. Dá para ver: a contagem **3, 2, 1, JÁ!**, os dois
   botões redondos do lado do placar (o painel de jogadores e as falas rápidas), o replay do gol com o cartão, o Craque da
   Partida no fim, a pausa › **EDITAR CONTROLES** (os layouts, a opacidade de 1 em 1%, os Efeitos ao pressionar) e a
   **LOJA › BOLAS** (as bolas novas com a miniatura; comprar e equipar é pela conta, como toda a loja da v88).
4. **Online (dois celulares, ou celular + computador):** escreva um nome e toque em **JOGAR ONLINE**.
   - **Sala e admin:** um cria a sala (SALAS › CRIAR SALA) e o outro entra pelo código; o criador toca em **ADMIN** (em cima
     do INICIAR, na tela da sala) ou, na partida, na pausa › **ADMIN DA SALA**. Com um terceiro aparelho assistindo, dá para
     ver o banco de reservas e trocar quem joga.
   - Na partida: a contagem junto nos dois, o **PULAR · 1/2** do replay, as falas aparecendo no outro aparelho e o ping no
     painel de jogadores.
   - **Com as contas** (a plataforma com as contas no ar, num ambiente de teste; o servidor do .bat roda sem contas): o
     **grupo** (duas contas amigas: CRIAR GRUPO, em cima do JOGAR › CHAMAR; o outro aceita; o líder toca em JOGAR), a compra
     e o EQUIPAR das **bolas** e o **Craque** no perfil e no selo da conta. Sem conta, o botão CRIAR GRUPO não aparece.

## Testes automáticos

`tests/roda_lista.sh` roda a lista que você passar e guarda a saída de cada um em `tests/saida/logs`. Os da v93:
`v93_fase1`, `v92_hud`, `v93_itens` (Fase 1) · `v93_fase2`, `v93_mista_test.js` (Fase 2) · `v93_salas_test.js`, `v93_fase3`
(Fase 3) · `v93_grupo_test.js`, `v93_fase4` (Fase 4) · `v93_falas_test.js`, `v93_fase5` (Fase 5) · `v93_bolas` (Fase 6) ·
`v93_sons` (Fase 7) · `v93_revisao_test.js`, `v93_revisao_cli`, `v93_revisao2_test.js`, `v93_revisao3_test.js` (as
correções das três revisões).
Exemplo: `bash tests/roda_lista.sh v93_fase2 v93_fase3 v93_grupo_test.js`. A bateria inteira: **73 conjuntos, 2.829 de
2.830 verificações** (a que falta é uma medida do DB experimental que às vezes falha também no ZIP recebido); o detalhe
está em "A entrega", no fim da seção v93 do `CHANGELOG.md`, e o log de cada um em `tests/saida/logs` (`RESUMO.txt`).

## Antes de publicar (quando você autorizar)

- Use o ZIP **oficial** (`racha-online-v93.zip`): sem o `experimental` no `config.js` e sem o .bat de testes.
- O `config.js` ainda tem `presente: true` (o presente de TESTE da v87.2): apague essa linha no lançamento.
- Nunca ligue `RACHA_EXPERIMENTAL=1` no serviço oficial.
- Os tempos novos do servidor têm variáveis (o padrão já é o pedido): `RACHA_CONTAGEM_MS` (3000; 0 desliga a contagem),
  `RACHA_REPLAY` (0 desliga o replay online) e `RACHA_REPLAY_MS` (7000, o máximo do replay).
