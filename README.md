# RACHA · Futebol de Rua — v88.2

O jogo de futebol de rua com tampinhas, na versão **v88.2**: **jogar online sem conta, só com o nome** — na tela de entrada,
**JOGAR ONLINE SEM CONTA**: escreva o seu nome e toque em JOGAR ONLINE; as salas abrem na hora (criar sala, JOGAR AGORA,
jogar e conversar), sem criar conta. E a v88.1, **as contas pelo Dono** — o cadastro fechado (só o Dono cria
contas, no RACHA CONTROL › 👤 Contas), o ZERAR CONTAS (os IDs voltam a contar do 000002) e o login do Dono pela variável
`RACHA_OWNER_PASSWORD` ([abaixo](#as-contas-pelo-dono-v881)) — em cima da **v88**, a **atualização completa dos menus** — amigos, mensagens,
correio, loja por categorias, clube completo, treino (posicionamento, defesa, goleiro e com bots), missões, eventos, Passe
RACHA, chat por canais, denúncias, a escolha do modo e do campo, estatísticas da conta, espectador, ajustes que faltavam e o
controle Bluetooth — no lobby de sempre, ligados às contas e ao servidor. A física, a movimentação, os chutes e as colisões
são os mesmos (o build confere), e cosmético continua sem dar vantagem. O que mudou está no
[`CHANGELOG.md`](CHANGELOG.md); o relatório completo (o que entrou, o que foi preservado, as pendências reais, como instalar
e testar), no [`LEIA-ME.md`](LEIA-ME.md#v88--a-atualização-completa-dos-menus); de onde vem cada parte, no
[`PROVENIENCIA.md`](PROVENIENCIA.md).

**Importante — o que precisa da plataforma de contas.** As telas da conta (amigos, mensagens, correio, compras com a
carteira da conta, missões, eventos e passe do servidor, estatísticas DA CONTA, o clube completo, a privacidade e excluir a
conta) precisam da **plataforma RACHA 2.0** (`app/`, com o banco MySQL) no ar. O site de teste do Render roda só o servidor
das salas (sem contas): ali essas telas mostram "Entre na sua conta" — não fingem que funcionam. Para ver tudo funcionando:
suba a plataforma ([`app/DEPLOY.md`](app/DEPLOY.md)) ou teste no seu computador sem MySQL
([abaixo](#testar-as-contas-no-seu-computador-sem-mysql)).

> Outras versões guardadas aqui: a branch **`v85-auditada`** (a v85 da auditoria, com a física FR-85 e o `SHA256SUMS.txt`
> do pacote) e a **`versao-anterior`** (as salas online da v62, o que estava aqui antes).

## As contas pelo Dono (v88.1)

1. Nas variáveis de ambiente do servidor da plataforma, defina **`RACHA_OWNER_PASSWORD`** com a sua senha e reinicie
   (`npm start`). O usuário do Dono é **`dono`** (a conta **000001**). A senha antiga do manual (`Racha@Dono1`) não entra mais.
2. Abra **`/admin`** (o RACHA CONTROL), entre com `dono` e a senha e configure o 2FA (a chave aparece em grupos de 4: no
   Google Authenticator ou no Authy, **+** › **Inserir chave de configuração**).
3. Aba **👤 Contas**: **CRIAR CONTA** para cada jogador (o usuário e a senha aparecem uma vez, com COPIAR PARA MANDAR),
   **SENHA NOVA**, **ABRIR/FECHAR O CADASTRO** (fechado é o padrão: no jogo, o CRIAR CONTA some) e **ZERAR CONTAS** (faça
   um backup do banco antes: apaga todas as outras contas e a próxima volta a ser a 000002).

Detalhes em [`app/DEPLOY.md`](app/DEPLOY.md#v881--as-contas-pelo-dono-racha-control--contas) e no [`CHANGELOG.md`](CHANGELOG.md).

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
não está no ar, então as salas aceitam quem não tem conta. **v88.2:** a tela de entrada do jogo mostra **JOGAR ONLINE SEM
CONTA** — escreva o seu nome e toque em **JOGAR ONLINE**: as salas abrem já conectadas (criar sala, JOGAR AGORA, jogar e o
chat). O SÓ TREINAR OFFLINE continua para jogar contra os bots. Saúde do servidor: `/health`.

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

### Testar as contas no seu computador (sem MySQL)

A **plataforma de teste** roda o código de verdade da plataforma (as rotas, as regras, as sessões e o servidor das salas
montado junto) em cima de um arquivo SQLite. Precisa do Node.js **22.13 ou mais novo** e, uma vez, das ferramentas do `app/`:

```bash
cd app && npm install && cd ..                                  # uma vez (traz o esbuild e o zod)
RACHA_OWNER_PASSWORD='uma-senha-sua' RACHA_CADASTRO=aberto node tests/plataforma/servidor.mjs --porta 8099 --banco racha88.db
# abra http://localhost:8099 — o jogo abre com o login: CRIAR CONTA (faça duas, em dois navegadores, para testar os amigos)
# (v88.1: sem RACHA_CADASTRO=aberto o cadastro fica fechado, como na plataforma: crie as contas em /admin › Contas)
```

Com o mesmo `--banco`, desligar e ligar de novo mantém as contas, os amigos, o correio e as compras. Para ter moedas e gemas
de teste na conta: `RACHA_PRESENTE_TESTE=1 node tests/plataforma/servidor.mjs …` (a carta "Presente de teste" chega no
CORREIO: toque em COLETAR). É só para testar: para hospedar de verdade, use a plataforma com MySQL ([`app/DEPLOY.md`](app/DEPLOY.md)).

## Mexer na força do chute

Os números ficam em dois lugares, que precisam ser iguais:

- o bloco **AJUSTES** do `backup/racha.html` — `FORCA_KICK` (o PASSE, hoje 212,5), `FORCA_POWER` (o CHUTE, hoje 340) e
  `LIMITE_VEL_BOLA` (o teto da bola, hoje `U(46.75)`) — na versão antiga eram 250, 400 e `U(55)`;
- o começo do `server/partida/fisica.js` (os mesmos três), que o servidor usa nas salas.

Depois: `python3 tools/aplicar_rua.py` (gera o jogo) e `python3 tests/v86_chute_test.py` (confere que o jogo e o servidor
estão iguais e mede a bola depois do PASSE e do CHUTE).

## Moedas e gemas de teste

**Sem conta** (SÓ TREINAR OFFLINE, o site de teste e o GitHub Pages), quem abre o jogo ganha um **presente de teste**:
**50.000 moedas e 5.000 gemas**, uma vez em cada aparelho (a janela PRESENTE aparece no lobby). **Com a conta** (v88), as
moedas e as gemas são da conta, no servidor: o presente de teste chega pelo CORREIO quando o servidor da plataforma tem
`RACHA_PRESENTE_TESTE=1` (uma vez por conta); e quem já tinha moedas na cópia do progresso leva o saldo para a conta uma vez
(até 50.000 moedas e 5.000 gemas). Dá para comprar as peças da tampinha (comum 300 moedas, raro 800, épico 40 gemas,
lendário 100 gemas) e testar a loja inteira. As moedas e as gemas só compram cosméticos: ninguém joga melhor com elas.

Quem liga é a linha `presente: true` do [`app/public/game/config.js`](app/public/game/config.js):

- **No lançamento:** apague essa linha (ou troque por `presente: false`). O jogo volta a começar com 500 moedas e 25 gemas.
- **Dar de novo, com outro valor:** `presente: { id: 'loja2', moedas: 100000, gemas: 10000 }` — cada `id` novo dá o presente
  mais uma vez em cada aparelho e conta (até 10 milhões de moedas e 1 milhão de gemas por presente).

O `config.js` não passa pelo build do jogo (`tools/aplicar_rua.py`). Na plataforma, ele vai para o `app/dist` no
`npm run build`: mudou, rode o `npm run build` de novo e reinicie. No Render (o `server.js`) e no GitHub Pages, basta
publicar o arquivo. Sem conta, as moedas e as gemas moram no progresso do aparelho, como sempre; com a conta, desde a v88,
na carteira do servidor (`app/api/racha/economia.ts`), e o jogo só mostra.

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
`app/public/game/racha.html`). Testes: `bash tests/roda_tudo.sh` (Python + Playwright + Node); a saída da bateria da v88
está em `tests/saida/logs/`.
