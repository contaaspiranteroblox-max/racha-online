# RACHA · Futebol de Rua — o jogo no GitHub Pages

Esta branch tem só o jogo (os arquivos de `app/public` da branch `main`, **v101**): o lobby no estilo da imagem da noite —
a quadra da quebrada no pôr do sol, desenhada em código, com os cartões de vidro por cima, a tampinha no círculo aceso e as
três vagas do grupo — e as telas no mesmo estilo; por enquanto, **só o CRIAR TAMPINHA** (as tampinhas prontas ficam
guardadas: `skinsProntas: true` no `game/config.js` traz todas de volta). Vem com as moedas e gemas de teste — 50.000 moedas
e 5.000 gemas uma vez em cada aparelho, pelo `presente: true` do `game/config.js`; no lançamento, apague essa linha.

Para publicar: **Settings › Pages › Build and deployment › Branch: `gh-pages` / (root) › Save**. O jogo abre em
`https://contaaspiranteroblox-max.github.io/racha-online/`.

O GitHub Pages não roda servidor nem a plataforma de contas: aqui funcionam o treino, os bots, a tampinha, o perfil e as
telas (na tela de login, **SÓ TREINAR OFFLINE**). As telas da conta (amigos, mensagens, correio, compras na conta, missões,
passe, eventos, estatísticas da conta, clube completo e o grupo) precisam da plataforma de contas no ar: aqui elas dizem que
precisam da conta. Para as salas online, use o servidor do Render pelo link
`.../game/racha.html?servidor=ENDERECO-DO-RENDER` (ver o README da `main`). Para atualizar esta branch: copie de novo o
`app/public` da `main` depois do build (`python3 tools/aplicar_rua.py`).
