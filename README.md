# RACHA · Futebol de Rua — v110

> **Novo · v110 (06/11/2026)** — o **jogo mais leve**: o `racha.html` que vai para o jogador caiu de 7,4 MB para 6,1 MB
> (com o gzip, de 3,4 MB para 2,8 MB) — as imagens de versões antigas que não aparecem mais viraram um pontinho e o código vai
> sem os comentários e sem o recuo (o mesmo programa; a física byte a byte igual; os comentários continuam em `tools/`). A
> pasta do projeto foi de 53 MB para 24 MB (saíram os originais das imagens geradas por IA, fora do jogo desde a v95). E o
> **CI do GitHub voltou a passar da conferência da plataforma** (falhava desde a v101: os testes no navegador e o deploy nem
> rodavam). Nada do que se vê muda. O detalhe está no [`CHANGELOG.md`](CHANGELOG.md).
>
> **v101 (30/10/2026)** — o **lobby no estilo da imagem da noite**: a quadra da quebrada no pôr do sol desenhada em
> código (o Cristo, a favela acesa, o grafite RACHA, o bar do Seu Zé, o chão molhado) cobrindo a tela toda, os cartões de vidro
> flutuando por cima (o perfil com o ID, a patente com os pontos, o sinal), os botões baixos dos lados, o cartão dourado da
> OFICINA, a tampinha no círculo aceso com as **três vagas do grupo**, o CAMPO, o MODO e o JOGAR com a coroa — e **as telas no
> mesmo estilo** (o vidro azul-noite, a escolhida no roxo do neon). E **só o CRIAR TAMPINHA, por enquanto**: as tampinhas
> prontas saíram de cena (nada é apagado; `skinsProntas: true` no `config.js` traz de volta). A partida e a física não mudam.
> O detalhe está no [`CHANGELOG.md`](CHANGELOG.md).
>
> **v100 (30/10/2026)** — a **revisão de segurança** antes do lançamento no Android, sem mudar a jogabilidade, a
> física, os controles nem os menus: o resultado online vale uma vez só e a patente online só anda contra gente; os limites
> de tentativa de senha pelo endereço certo e por conta; o convite com outro servidor pergunta antes (e o bilhete da conta
> só vai para o servidor do jogo); o cookie da conta com `Secure` por https e a sessão de no máximo 90 dias; a conta banida
> cai das salas na hora; os cabeçalhos de proteção; o pacote sem segredo, banco ou chave e o `--lancamento` sem o presente de
> teste; o instalador com `DOMINIO=` (o HTTPS). Para valer, a **plataforma e o servidor das salas precisam ser atualizados
> juntos**. O detalhe está no [`CHANGELOG.md`](CHANGELOG.md).
>
> **v99 (29/10/2026)** — os **chutes do Rachão nas salas personalizadas**: no CRIAR SALA de FUTEBOL, **CHUTES DO
> RACHÃO** — **CAVADINHA** (a bola sobe por cima de quem está na frente; o travessão segura a bola alta), **CURVA** (↶ ou ↷:
> o próximo chute sai girando) e **SUPER CHUTE** (segure, carregue e solte: mais forte que o CHUTE, pegando fogo). Cada um
> liga e desliga; nenhum ligado é só o chutar, como sempre. Na partida aparecem só os botões dos chutes da sala (as teclas
> Q, Z, X e V), com a bola no alto desenhada com a sombra no chão; os bots usam os três. A física é a do núcleo das salas
> (a mesma conta no servidor e na previsão do aparelho) e a sala neste aparelho joga no motor das salas. A ranqueada, o COM
> CURVA e as salas sem os chutes não mudam. Para valer online, o **servidor das salas precisa ser atualizado**. O detalhe
> está no [`CHANGELOG.md`](CHANGELOG.md).
>
> **v98 (29/10/2026)** — o **RACHA e o Rachão separados** na Oficina e as **salas online do Rachão**. A central da
> Oficina tem a chave **RACHA | RACHÃO** no topo: no RACHA, os mapas de sempre (Meus mapas, Comunidade, Populares…); no
> RACHÃO, os **Estádios** e as **Salas online**. O **CRIAR** pergunta o que criar: um **mapa do RACHA** ou um **estádio do
> Rachão**. E o Rachão ganhou o online: **CRIAR SALA** abre a tela do Rachão (um dos 17 campos ou um estádio seu, 1x1 a
> 7x7, Partida ou Caos, os bots completando ou só gente, o tempo, os gols, a corrida, os chutes, aberta ou fechada), a
> galera entra pela lista ou pelo **código**, e a partida roda no **servidor das salas** com o motor do Rachão (o mesmo
> código da página) — cada um joga do seu aparelho, que prevê a própria tampinha. O admin tem os AJUSTES (a mesma tela),
> passa o admin, mexe nos times e encerra. Para o online do Rachão funcionar, o **servidor das salas precisa ser
> atualizado** (a demonstração não tem servidor). O detalhe está no [`CHANGELOG.md`](CHANGELOG.md).
>
> **v97 (29/10/2026)** — o **Rachão na Oficina**: a aba **Rachão** da Oficina de criação abre o Rachão (o futebol de
> física enviado pelo dono do jogo, com o motor dele: 17 campos, contra bots, caos, 2 jogadores, treino, pênaltis,
> cabeçada, vôlei e minigolfe) por cima da Oficina, e a **oficina de estádios** dele: criar do zero ou a partir de um dos 17
> campos e mudar o formato (retângulo, oval ou rinque), o tamanho, os cantos, os gols, o piso (17), a física (11 prontas e 18
> valores), as peças no campo (poste, para-choque, vaso, cerca viva, lama e poça, com espelho e ímã), o vento e os poderes —
> e jogar contra bots ou em 2 no estádio. Sem online: tudo no aparelho (para levar a outro, o código do estádio). O RACHA não
> muda (a física oficial é a mesma). Depois do teste: a aba **Chutes** do editor de estádios (a cavadinha, a curva e o super
> chute; **Só o Chutar** tira os três) e a **física misturada** entre os dois jogos — a bola, o jogador e o chute de um no
> outro, cada um sozinho (no Rachão, MISTURAR COM O RACHA; na Oficina do RACHA, MISTURAR COM O RACHÃO no mapa e na sala). Para
> a tampinha com o embalo do Rachão valer igual online, o **servidor das salas precisa ser atualizado**. O detalhe está no
> [`CHANGELOG.md`](CHANGELOG.md) e no [`LEIA-ME-OFICINA.md`](LEIA-ME-OFICINA.md).
>
> **v96 (29/10/2026)** — o **online liso como o treino**: as correções da previsão viram um deslize (a mola sem tranco
> e com limite de velocidade) em vez do pulo, o desenho bate nas traves e na rede (nada aparece dentro da trave ou do outro
> lado da rede), o recomeço depois do gol vem do servidor e, no servidor das salas, os comandos que chegam juntos depois de um
> apagão do 4G andam em vez de ir para o lixo (medido no simulador do Brasil até a Virgínia: os pulos da bola e do outro
> jogador caíram de 21 e 26 por minuto para 0; a sua tampinha dentro da trave, de 12 quadros por minuto para 0). Para valer
> online, o **servidor das salas precisa ser atualizado** junto com o jogo. E as **tampinhas animadas novas** (as caras PIPA NO
> CÉU, BAILE, MARÉ, TEMPESTADE, IPÊ AMARELO e LAVA e as bordas ARCO-ÍRIS VIVO, OURO LÍQUIDO e COMETA) e a **tampinha dos
> FUNDADORES**, ultra rara: só as **30 primeiras contas que entrarem no jogo** ganham, numeradas ("Fundador nº 7 de 30"); não
> está à venda, ninguém mais consegue usar (o servidor das salas confere) e o ZERAR CONTAS do Dono devolve as vagas. Depois
> do teste: a **conta saiu dos Ajustes** (a janela SUA CONTA abre pelo selo ao lado do seu ID no Perfil; o chat foi para
> Ajustes › Privacidade) e o **anel do chute** acende num branco suave. A física oficial é a mesma. O detalhe está no
> [`CHANGELOG.md`](CHANGELOG.md).
>
> **v95 (28/10/2026)** — o **fim da partida** no estilo da imagem (os dois times nas cores deles, VITÓRIA DO LARANJA, o
> placar pendurado com os gols), os **emojis da tampinha** (102, na LOJA › EMOJIS por raridade, no meio da tampinha em todo
> lugar), as **patentes** novas (cada uma com a sua forma), a **ranqueada ao vivo** (online, jogando e procurando em cada
> tamanho; a PARTIDA ENCONTRADA), o **chat** com os emojis e as frases prontas, o **perfil** com o cartão do craque e a vitrine,
> os **campos 30% maiores** (o gol do tamanho de antes), a **economia** nova (a assistência, o craque, a sequência e a 1ª vitória
> do dia rendem; a tela do fim mostra parte por parte), o **placar minimalista** (as abas de vidro penduradas em cima; o nome e o
> escudo do clube do lado quando o time todo é do mesmo clube), o **painel dos jogadores** com a foto de perfil cheia e o clube
> embaixo do nome, o **sensor** verde (o dos parceiros na cor do time; apertou, acende num branco forte — segurando fica, soltou
> some rápido), a **tampinha inicial** roxo, branco e laranja
> (no time, a cor do time dos lados), as **linhas da bola** em pontinhos **só na Oficina com o RANK OFF** (ou, se o criador do
> mapa ligar, para todos com aquele mapa) e o **visual sem cara de IA** (a arte toda desenhada em código, os botões em placa).
> Depois do segundo teste: o **grupo na ranqueada** (no lobby, PRONTO e o dono joga; no fim, o JOGAR DE NOVO do grupo com 10 s
> para todos tocarem, senão todo mundo volta para o lobby) e, na Oficina, o **menu que não pula** para cima ao mudar um valor, a
> **tampinha grande que chuta** e o **deslize da tampinha**. E as **cores dos dois campos** das imagens enviadas: o Estádio
> com o gramado listrado escuro dentro das linhas e a Arena virando a quadra de futsal verde, com as áreas amarelas em "D" e o
> círculo azul (gasta, com as rachaduras). A física oficial é a mesma. O detalhe está no
> [`CHANGELOG.md`](CHANGELOG.md); de onde vem a arte, no [`PROVENIENCIA.md`](PROVENIENCIA.md).
>
> **28/10/2026 · a v93 e a v94 com a OFICINA** — este pacote junta tudo o que veio na **v93** (a atualização por fases: o HUD,
> as bolas lisas, a contagem 3, 2, 1, JÁ!, o replay e o painel online, o perfil de quem faz o gol, as salas e o admin, o grupo,
> as falas rápidas e os sons — ver o [`LEIA-ME-v93.md`](LEIA-ME-v93.md)) e na **v94** (o motor próprio, **em testes e
> desligado**, como no ZIP das etapas 1 a 7: o jogo e as salas usam o motor de sempre; para ligar para todo mundo,
> `motor: 'v94',` no `app/public/game/config.js` e `RACHA_MOTOR_JOGO=v94` no servidor — ver o
> [`docs/v94/RELATORIO.md`](docs/v94/RELATORIO.md)) com a Oficina. E traz os **AJUSTES FINOS** (Ajustes › Visual: o que o painel de testes tinha — a fluidez, a extrapolação do online,
> o analógico e a câmera — na versão oficial) e as **LINHAS DA BOLA** (para onde a bola vai se você chutar agora e o caminho
> dela andando, pela conta da física de verdade). Na Oficina: a contagem, o cartão de quem fez o gol, as falas e o craque nas
> partidas, a bola equipada, o **CRIAR SALA** com a **física da sala** (o tamanho da bola, os chutes, as tampinhas — a física
> só se ajusta aí), **3 mapas públicos** por jogador, curtir e favoritar no cartão e o fim do exportar/importar (só editar,
> salvar e publicar).
>
> **Novo · v92 · OFICINA DE CRIAÇÃO 2.0** — o editor de mapas dentro do jogo (o botão **OFICINA** na tela inicial): criar
> do zero ou de um dos 15 modelos, editar pelo toque, testar na hora, salvar no aparelho (automático, versões, recuperação),
> publicar para a comunidade (código de 7 letras, curtir, favoritar, denunciar, moderação) e jogar online em salas com o seu
> mapa (até 4 times). A física oficial, a ranqueada e as salas de sempre não mudam. O manual inteiro está no
> [`LEIA-ME-OFICINA.md`](LEIA-ME-OFICINA.md); o que mudou, no [`CHANGELOG.md`](CHANGELOG.md).
> **27/10/2026:** só a **v92 oficial** (sem a aba TESTES v92 nos Ajustes), a bola da Oficina **branca de contorno preto** e
> o editor com **lançar a bola**, **copiar para o outro lado**, **repetir**, as **medidas**, as **guias**, a **vibração** e as
> **sombras** das peças.

O jogo de futebol de rua com tampinhas, na versão **v91**: **o visual da imagem de referência em todas as telas** — a tela
inicial com a própria quadra da imagem no fundo (o alambrado, o RACHA grafitado, a bandeira e o Cristo), a faixa azul em
cima, os botões quadrados dos lados, a sua tampinha em pé e em destaque no meio e o JOGAR amarelo grande; o perfil, o cofre,
a loja, o ranking, as salas, os eventos, o Passe RACHA, os amigos, o clube, o treino e o chat com a mesma faixa e os mesmos
painéis; os banners de perfil e as 8 patentes redesenhados. Só a cara mudou: a física, as regras, o online, as contas, as
moedas e as gemas são os mesmos (o build confere a física) — o que mudou está no [`CHANGELOG.md`](CHANGELOG.md) e de onde
vem cada imagem, no [`PROVENIENCIA.md`](PROVENIENCIA.md). Por baixo continuam a **v90** (o COFRE, a roda das favoritas e o
RANKING da temporada) e a **v88.2**:

A **v88.2**: **jogar online sem conta, só com o nome** — na tela de entrada,
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
2. Abra **`/admin`** (o RACHA CONTROL), entre com `dono` e a senha e configure o 2FA: no Google Authenticator ou no
   Authy, **+** › **Ler código QR** e aponte para o QR code da tela (ou **Inserir chave de configuração** com a chave de 8
   grupos de 4, **Baseada no horário**) e digite o código de 6 números. Perdeu o app? Na VPS, `sudo racha-2fa dono` (v109).
   Desde a v109 são dois painéis: o do Dono (tudo, inclusive selos, moedas, presentes e os registros da staff) e o da staff
   (banir, silenciar no chat, advertir, expulsar da sala, denúncias), com os níveis administrador, moderador e ajudante.
3. Aba **👤 Contas**: **CRIAR CONTA** para cada jogador (o usuário e a senha aparecem uma vez, com COPIAR PARA MANDAR),
   **SENHA NOVA**, **ABRIR/FECHAR O CADASTRO** (fechado é o padrão: no jogo, o CRIAR CONTA some) e **ZERAR CONTAS** (faça
   um backup do banco antes: apaga todas as outras contas e a próxima volta a ser a 000002).

Detalhes em [`app/DEPLOY.md`](app/DEPLOY.md#v881--as-contas-pelo-dono-racha-control--contas) e no [`CHANGELOG.md`](CHANGELOG.md).

## Na sua plataforma (o servidor com as contas e o MySQL)

Desde a v87 a raiz do site abre o jogo em tela cheia: o login é o do jogo, e quem já estava logado no site entra direto.
O jogo dentro do site, com a barra e as abas (o jeito de antes), ficou em `/jogo-no-site`; o painel da equipe continua em
`/admin` (e no jogo, no Perfil: o selo da conta ao lado do ID abre a SUA CONTA, com o RACHA CONTROL). Para o servidor pegar a versão nova:

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
├── app/public/game/rachao/  o Rachão (v97: a página gerada de backup/rachao.html e a oficina de estádios, estadios.js/.css;
│                            v98: o quadro da partida online, quadro.js, e o online da página, rede.js)
├── server/                o servidor da turma (salas, chat, clubes, copa, partida no servidor) — Node puro
├── server/partida/        a física no servidor (fisica.js) e o motor das salas (sala.js), com os números do jogo;
│                            v98: as salas do Rachão (rachao.js) e o motor dele, gerado da página (rachao_motor.js);
│                            v99: os chutes do Rachão nas salas (no núcleo, nucleo.js: a parte cr*)
├── app/                   a plataforma RACHA 2.0 (contas, XP, ranking) — precisa de MySQL
├── backup/racha.html      o jogo-base (os AJUSTES e a física)   ·   tools/   o build e as camadas   ·   tests/   os testes
├── backup/rachao.html     o Rachão como chegou (v97; o build gera a página dele com tools/v97/rachao.py)
├── server.js              atalho do site de teste (sobe o server/servidor.js com o modo visitantes)
└── render.yaml · Dockerfile · INICIAR-NO-WINDOWS.bat
```

Editar o jogo: mexa em `backup/racha.html` ou em `tools/` e rode `python3 tools/aplicar_rua.py` (gera o
`app/public/game/racha.html`). Testes: `bash tests/roda_tudo.sh` (Python + Playwright + Node); a saída da bateria da v88
está em `tests/saida/logs/`.
