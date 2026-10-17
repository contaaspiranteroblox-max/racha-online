# RACHA · Futebol de Rua — v85

O jogo de futebol de rua com tampinhas, na versão **v85**: a correção da auditoria de proveniência de 17/10/2026 (física
própria FR-85, quadras e controles próprios, textos e marca revistos, fontes no pacote). O que mudou e por quê está no
[`CHANGELOG.md`](CHANGELOG.md), no [`PROVENIENCIA.md`](PROVENIENCIA.md) e na seção v85 do [`LEIA-ME.md`](LEIA-ME.md).

> A versão que estava aqui antes (as salas online da v62) ficou guardada na branch **`versao-anterior`**.

## Testar num site

### 1. Render — o jogo com as salas online (recomendado)

O Render roda o `server.js`, que entrega o jogo **e** as salas no mesmo endereço.

- **Se este repositório já está ligado ao Render**, ele publica a versão nova sozinho a cada atualização. Abra o
  endereço do seu serviço (ex.: `https://racha-online.onrender.com`); a primeira abertura do plano grátis demora ~1 min.
- **Se ainda não está:** entre em <https://render.com> com o GitHub › **New › Blueprint** › escolha este repositório ›
  confirme. O `render.yaml` já diz tudo. Em uns minutos o Render mostra o endereço do jogo.

No site de teste o servidor está em **modo visitantes** (`RACHA_VISITANTES=1`): a plataforma de contas (o banco MySQL)
não está no ar, então as salas aceitam quem não tem conta. Na tela de login do jogo, toque em **SÓ TREINAR OFFLINE** —
depois disso dá para jogar contra os bots **e** entrar nas salas (GALERA › SALAS). Saúde do servidor: `/health`.

### 2. GitHub Pages — o jogo sem servidor (contra os bots)

A branch **`gh-pages`** tem só o jogo (os arquivos de `app/public`). Para ligar: **Settings › Pages › Build and
deployment › Branch: `gh-pages` / (root) › Save**. O jogo fica em
`https://contaaspiranteroblox-max.github.io/racha-online/`.

O GitHub Pages não roda servidor: lá funcionam o treino, os bots, a tampinha, o perfil e as telas. Para as salas, use o
servidor do Render pelo link: `https://contaaspiranteroblox-max.github.io/racha-online/game/racha.html?servidor=ENDERECO-DO-RENDER`
(sem `https://`, ex.: `?servidor=racha-online.onrender.com`).

### 3. No seu computador

Instale o Node.js 18+ (<https://nodejs.org>) e rode `node server.js` (no Windows: dois cliques em
`INICIAR-NO-WINDOWS.bat`). Abra <http://localhost:8080>; no celular (mesmo Wi-Fi), `http://IP-DO-PC:8080`.

## O que tem aqui

```
├── app/public/game/       o jogo (racha.html + estilos, scripts, fontes) — gerado pelo build
├── server/                o servidor da turma (salas, chat, clubes, copa, partida no servidor) — Node puro
├── server/partida/nucleo_fisica.js   a física FR-85 (o mesmo arquivo no jogo e no servidor)
├── app/                   a plataforma RACHA 2.0 (contas, XP, ranking) — precisa de MySQL
├── backup/racha.html      o jogo-base   ·   tools/   o build e as camadas   ·   tests/   os testes automáticos
├── server.js              atalho do site de teste (sobe o server/servidor.js com o modo visitantes)
└── render.yaml · Dockerfile · INICIAR-NO-WINDOWS.bat
```

Editar o jogo: mexa em `backup/racha.html` ou em `tools/` e rode `python3 tools/aplicar_rua.py` (gera o
`app/public/game/racha.html`). Testes: `bash tests/roda_tudo.sh` (Python + Playwright + Node).

O `SHA256SUMS.txt` confere o pacote entregue na auditoria (o commit "RACHA v85 — pacote da auditoria"). Depois dele,
só o commit do site de teste mexeu no `server/servidor.js` (o modo visitantes opcional e o `/health`) e nos arquivos da
raiz (este README, `server.js`, `package.json`, `render.yaml`, `Dockerfile`, `.bat`, `.gitignore`).
