# RACHA · Futebol de Rua — o jogo no GitHub Pages

Esta branch tem só o jogo (os arquivos de `app/public` da branch `main`, **v86**: a mecânica clássica com o chute mais
forte). Para publicar: **Settings › Pages › Build and deployment › Branch: `gh-pages` / (root) › Save**. O jogo abre em
`https://contaaspiranteroblox-max.github.io/racha-online/`.

O GitHub Pages não roda servidor: aqui funcionam o treino, os bots, a tampinha, o perfil e as telas. Para as salas
online, use o servidor do Render pelo link `.../game/racha.html?servidor=ENDERECO-DO-RENDER` (ver o README da `main`).
Para atualizar esta branch: copie de novo o `app/public` da `main` depois do build (`python3 tools/aplicar_rua.py`).
