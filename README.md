# RACHA · Futebol de Rua — o jogo no GitHub Pages

Esta branch tem só o jogo (os arquivos de `app/public` da branch `main`, **v87.2**: tudo dentro do jogo, com a mecânica
clássica, o chute 15% abaixo da versão antiga e as moedas e gemas de teste — 50.000 moedas e 5.000 gemas uma vez em cada
aparelho, pelo `presente: true` do `game/config.js`; no lançamento, apague essa linha). Para publicar: **Settings › Pages › Build and deployment › Branch: `gh-pages` / (root) ›
Save**. O jogo abre em `https://contaaspiranteroblox-max.github.io/racha-online/`.

O GitHub Pages não roda servidor nem a plataforma de contas: aqui funcionam o treino, os bots, a tampinha, o perfil e as
telas (na tela de login, **SÓ TREINAR OFFLINE**). Para as salas online, use o servidor do Render pelo link
`.../game/racha.html?servidor=ENDERECO-DO-RENDER` (ver o README da `main`). Para atualizar esta branch: copie de novo o
`app/public` da `main` depois do build (`python3 tools/aplicar_rua.py`).
