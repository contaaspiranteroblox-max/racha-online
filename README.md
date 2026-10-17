# RACHA · Futebol de Rua — v87

O jogo de futebol de rua com tampinhas, na versão **v87**: **tudo dentro do jogo** — a plataforma abre o jogo direto, em
tela cheia, sem a barra de cima e sem as abas; o login é o do jogo (com a cara dele) e as coisas da conta ficam nos botões
do jogo (o que só existe no site abre por cima do jogo, com o VOLTAR AO JOGO). A **mecânica clássica** da v86 continua (a
da v84, com o PASSE e o CHUTE 10% mais fortes e o teto da bola de 55 para 60 u/s), e o resto da v85 também: os textos
próprios, as fontes no pacote, as chaves salvas sem a marca e o site de teste. O que mudou está no [`CHANGELOG.md`](CHANGELOG.md); de onde vem cada parte
(inclusive a mecânica), no [`PROVENIENCIA.md`](PROVENIENCIA.md).

> Outras versões guardadas aqui: a branch **`v85-auditada`** (a v85 da auditoria, com a física FR-85 e o `SHA256SUMS.txt`
> do pacote) e a **`versao-anterior`** (as salas online da v62, o que estava aqui antes).

## Na sua plataforma (o servidor com as contas e o MySQL)

Desde a v87 a raiz do site abre o jogo em tela cheia: o login é o do jogo, e quem já estava logado no site entra direto.
O jogo dentro do site, com a barra e as abas (o jeito de antes), ficou em `/jogo-no-site`; o painel da equipe continua em
`/admin` (e no jogo, em Ajustes › Conta › RACHA CONTROL). Para o servidor pegar a versão nova:

```bash
git pull
cd app && npm install && npm run build
# e reinicie o "npm start" (o jogo vem junto no build, de app/public/game)
```

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

## Mexer na força do chute

Os números ficam em dois lugares, que precisam ser iguais:

- o bloco **AJUSTES** do `backup/racha.html` — `FORCA_KICK` (o PASSE, hoje 275), `FORCA_POWER` (o CHUTE, hoje 440) e
  `LIMITE_VEL_BOLA` (o teto da bola, hoje `U(60)`);
- o começo do `server/partida/fisica.js` (os mesmos três), que o servidor usa nas salas.

Depois: `python3 tools/aplicar_rua.py` (gera o jogo) e `python3 tests/v86_chute_test.py` (confere que o jogo e o servidor
estão iguais e mede a bola depois do PASSE e do CHUTE).

## O que tem aqui

```
├── app/public/game/       o jogo (racha.html + estilos, scripts, fontes) — gerado pelo build
├── server/                o servidor da turma (salas, chat, clubes, copa, partida no servidor) — Node puro
├── server/partida/        a física no servidor (fisica.js) e o motor das salas (sala.js), com os números do jogo
├── app/                   a plataforma RACHA 2.0 (contas, XP, ranking) — precisa de MySQL
├── backup/racha.html      o jogo-base (os AJUSTES e a física)   ·   tools/   o build e as camadas   ·   tests/   os testes
├── server.js              atalho do site de teste (sobe o server/servidor.js com o modo visitantes)
└── render.yaml · Dockerfile · INICIAR-NO-WINDOWS.bat
```

Editar o jogo: mexa em `backup/racha.html` ou em `tools/` e rode `python3 tools/aplicar_rua.py` (gera o
`app/public/game/racha.html`). Testes: `bash tests/roda_tudo.sh` (Python + Playwright + Node); a saída da bateria da v86
está em `tests/saida/logs/`.
