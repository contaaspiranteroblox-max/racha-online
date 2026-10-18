# RACHA · Futebol de Rua — o jogo no GitHub Pages

Esta branch tem só o jogo (os arquivos de `app/public` da branch `main`, **v88.1**: as contas pelo Dono — com a plataforma, o
cadastro fechado (só o Dono cria contas, no RACHA CONTROL) e o ZERAR CONTAS — em cima da **v88**, a atualização completa dos menus —
amigos, mensagens, correio, loja por categorias, clube, treino com posicionamento, defesa, goleiro e com bots, missões,
eventos, Passe RACHA, chat por canais, denúncias, modo e campo, estatísticas, espectador, ajustes e controle Bluetooth —,
com a mecânica clássica de sempre e as moedas e gemas de teste — 50.000 moedas e 5.000 gemas uma vez em cada aparelho, pelo
`presente: true` do `game/config.js`; no lançamento, apague essa linha). Para publicar: **Settings › Pages › Build and deployment › Branch: `gh-pages` / (root) ›
Save**. O jogo abre em `https://contaaspiranteroblox-max.github.io/racha-online/`.

O GitHub Pages não roda servidor nem a plataforma de contas: aqui funcionam o treino, os bots, a tampinha, o perfil e as
telas (na tela de login, **SÓ TREINAR OFFLINE**). As telas da conta da v88 (amigos, mensagens, correio, compras na conta,
missões, passe, eventos, estatísticas da conta, clube completo) precisam da plataforma de contas no ar: aqui elas dizem que
precisam da conta. Para as salas online, use o servidor do Render pelo link
`.../game/racha.html?servidor=ENDERECO-DO-RENDER` (ver o README da `main`). Para atualizar esta branch: copie de novo o
`app/public` da `main` depois do build (`python3 tools/aplicar_rua.py`).
