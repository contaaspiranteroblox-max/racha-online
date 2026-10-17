# RACHA · Futebol de Rua — v87

O jogo (`app/public/game/racha.html`), o servidor das salas online (`server/`) e a plataforma RACHA 2.0 com contas
(`app/`). A v70 é a revisão completa pedida na auditoria: regras e câmera, interface e HUD, perfil/inventário/economia,
clube e online, e o polimento (cores, nomes, acessibilidade e salvamento). A identidade de futebol de rua, as tampinhas
personalizáveis e a proposta arcade continuam; cosmético não dá vantagem (todo mundo tem o mesmo tamanho, a mesma
velocidade e o mesmo chute). A v70.1 é o ajuste do celular depois do teste no iPhone: o jogo é só na horizontal e,
deitado, tudo cabe na tela sem arrastar. A **v70.2** deixa o jogo enxuto, a pedido: só **FUTEBOL** e **COM CURVA**, só a
**ARENA** e o **ESTÁDIO** de grama (novo), a bola sem efeitos e o Indicador de Direção começando desligado. A **v71** troca
as cores rivais para **PRETO × BRANCO** (a tampinha padrão agora é metade preta, metade branca e fica da cor do time) e
redesenha o **lobby** e a folha do **JOGAR** com cara de jogo; a **v71.1** leva esse estilo para todas as telas que abrem
dos botões, os Ajustes, a pausa e o fim da partida. A **v73** deixa o **sensor** — o anel em volta de cada jogador — mais
transparente e tira o TESTE que a v72 tinha posto no TREINAMENTO. A **v74** troca o desenho do **ESTÁDIO** pelo society
da imagem enviada — o gramado listrado à noite no meio do morro, com o alambrado, o calçamento, o estacionamento e as
casas —, no tamanho e com os gols do jogo. A **v75** põe no fundo do **lobby** a imagem enviada: a quadra da favela com o Rio de
Janeiro atrás — o Cristo, o Pão de Açúcar e a praia no fim de tarde. A **v76** deixa a grama de fora das linhas do Estádio
toda no verde escuro, troca a calçada pela de **Copacabana** e cria as **8 tampinhas animadas** da COLEÇÃO MISTURA DE
TODAS. A **v77** deixa o jogo com a cara das imagens enviadas: o **lobby** e o **perfil** como nelas, **cada botão abrindo
só a sua tela** (com a mesma barra em cima) e o **mapa principal** (a Arena) virando a quadra verde e amarela da imagem.
A **v78** troca a cabeça dos **bots** por uma nova (cada bot com um jeito de jogar, os companheiros jogando com você), tira
os nomes das jogadas de cima da cabeça dos jogadores e deixa o **perfil** mais fácil de entender, com a tampinha maior no
lobby e no perfil — na partida, o tamanho continua o de sempre. A **v79** é a primeira etapa do pacote grande pedido
depois: as **8 patentes** da ranqueada (Bronze a Lendário, cada uma com III, II e I), **só a ranqueada** no JOGAR (a casual
saiu; a partida livre continua nas salas), sempre no **Estádio**, **procurando gente online** e, sem ninguém, **contra os
bots**, e o **selo V** dos influenciadores na frente do nome. A **v80** é a segunda etapa: a **partida** — os times viram
**TIME A (laranja)** × **TIME B (roxo)**, a tampinha inicial vira a **Listras** metade laranja e metade roxa (toda da cor do
time na partida), o **placar novo** com o relógio de **3:00** (o do servidor na partida online), a **prorrogação** só no 0 × 0
(até -2:00, gol de ouro), o **empate** no 1 × 1 e no 2 × 2, os adversários sem os indicadores a mais, a animação **GOOOL!** e
os **controles novos do treino**. A **v81** é a terceira etapa: o **chat** — a **barra fixa embaixo** (no menu, um bloco com a
última mensagem que abre ao tocar; nas telas do menu, um chip; na sala e na partida, menor, sem cobrir nada), as duas
conversas **🇧🇷 BRASIL** (pública, independente da sala) e **⚽ SALA** (só quem está na sala), o **perfil pelo nome**, os **três
pontinhos** de quem está digitando em cima da tampinha e a **moderação** (silenciar, denunciar, os filtros de spam, ofensa,
link e dados pessoais, o limite de envio e o OCULTAR). A **v82** é a quarta etapa: as **contas** — a **patente da ranqueada
na conta** (o servidor da plataforma faz a conta de cada partida e guarda; online só com o selo do servidor das salas,
contra os bots com teto de pontos por dia, a desistência tira 25 e a ranqueada que fica aberta conta como desistência), o
**ranking das patentes de todos** (no site e no jogo), o jogo mostrando **a conta** (o nível e o XP da conta, uma curva só, e o
XP ganho no fim da partida), **entrar e criar conta pelo jogo** e o **progresso na conta** (moedas, gemas, tampinhas, peças,
missões, estatísticas e recordes salvos na conta e de volta em outro aparelho; na primeira vez, o progresso do aparelho pode
ir para a conta; cada conta com o seu progresso no mesmo navegador; sem conta, tudo como antes) — logo abaixo. A **v83** é a
etapa do **servidor**: a **partida autoritativa** (`server/partida/`) — o servidor simula a física (60 passos por segundo, as
mesmas constantes do jogo), é dono do placar e do relógio da partida normal (3:00, 3 gols acabam, empate no 1 × 1 e no 2 × 2,
prorrogação só no 0 × 0 com gol de ouro), manda os quadros a 20 por segundo e **confere cada comando** (sequência, ritmo,
direção, chute no alcance e com tempo mínimo), com as suspeitas **registradas para investigação — sem banimento automático**;
no fim, o **selo** do resultado sai no formato que a plataforma já confere (a ranqueada com `k:1`), então a plataforma não
mudou. E a v83 se completa com as **salas 100% hospedadas no servidor**: toda partida online — a sala pública, a privada
por código e a ranqueada — é **simulada no servidor** (`server/partida/sala.js`), não no aparelho de quem criou a sala.
Ninguém é mais anfitrião (`host:'srv'`): o criador vira só o **admin** (expulsar, passar o cargo, começar a partida), todos
mandam os mesmos comandos e recebem os mesmos quadros (30 por segundo, no formato clássico que o jogo já renderiza, com a
predição, a reconciliação e a interpolação que já existiam), e **se o criador cair, só ele sai** — a partida segue, um bot
assume a tampinha dele na hora e ele tem 90 s para voltar no mesmo lugar; só a função de admin passa para quem está há mais
tempo. As regras são as de sempre (a partida livre com meta ou tempo e gol de ouro, e a v80 na ranqueada), os bots vagos são
do servidor (`server/partida/bot.js`), e o resultado sai **pelo servidor** com o selo de sempre — quadro ou resultado
inventado por aparelho é ignorado e registrado, sem banimento automático. E a correção pedida desde a v81: o **ajuste fino de permissões do RACHA CONTROL
volta a valer** (o `cargoDo` do `app/api/racha/guard.ts` ignorava a lista ajustada; agora ela substitui o conjunto do cargo,
sempre limitada ao teto dele) — detalhes no `server/LEIAME.md` e nos testes `v83_*` e `guard_test.mjs`. A **v84** trouxe o
**login obrigatório** sem o site (o online só com a conta da plataforma). A **v85** é a correção da **auditoria de
proveniência**: a física, as quadras, os controles e os textos que vinham de outro jogo foram trocados por uma
implementação própria (a física FR-85, num núcleo só para o jogo e o servidor), e as fontes passaram a vir no pacote.
A **v86** voltou, a pedido, à **mecânica da v84** (a física, as quadras, o analógico de 32 direções e os botões) com o
**chute mais forte** (v87.1: o PASSE, o CHUTE e o teto da bola ficaram 15% abaixo da versão antiga), e o resto da v85 continua
(textos, chaves, fontes, login). A **v87** leva tudo para **dentro do jogo**: a plataforma abre o jogo direto, em tela
cheia, com o login do jogo e as coisas da conta nos botões dele — logo abaixo.

---

## Como rodar

**1 · Só o jogo (sem servidor, funciona sem internet).** Abra `app/public/game/racha.html` no navegador. Partidas contra
bots (FUTEBOL e COM CURVA, na ARENA e no ESTÁDIO, de 1v1 a 4v4), os 7 treinos e o tutorial, a tampinha, a loja, o perfil, o clube pessoal e a sala
neste aparelho (você e os bots) funcionam assim. Se o navegador não abrir arquivos locais direito, sirva a pasta:

```bash
python3 -m http.server 8000 -d app/public      # e abra http://localhost:8000/game/racha.html
```

**2 · Jogo + salas online, Chat do Brasil, clubes da turma e Copa (a turma na mesma rede).** Node 18 ou mais novo, sem
`npm install`:

```bash
node server/servidor.js                        # abra http://localhost:8080/game/racha.html
```

Os outros aparelhos da rede abrem `http://<IP deste computador>:8080/game/racha.html`. Opções (porta, origens, segredo,
arquivo de dados) em [`server/LEIAME.md`](server/LEIAME.md). Desde a v84 o online pede a **conta da plataforma** (o bilhete
assinado com o `--segredo` dela): o servidor sozinho entrega o jogo, mas não deixa ninguém entrar nas salas sem conta. Na
tela de login, **SÓ TREINAR OFFLINE** abre o jogo contra os bots (v85: também quando a plataforma não responde).

**3 · A plataforma RACHA 2.0 (contas, XP no servidor, amigos, painel).** Precisa de MySQL/TiDB (`DATABASE_URL`):

```bash
cd app && npm install && npm run db:push && npx tsx db/seed.ts && npm run build && npm start   # http://localhost:3000
```

Em produção a plataforma entrega o jogo em `/game/racha.html` e monta o servidor das salas no mesmo endereço (quem está
logado entra nas salas com a conta). Desde a v87 **a raiz do site abre o jogo direto**, em tela cheia: o login é o do jogo
e as páginas da conta (`/perfil`, `/amigos`…) abrem por cima dele; o jogo dentro do site, com a barra e as abas, ficou em
`/jogo-no-site`. Detalhes e variáveis em [`app/DEPLOY.md`](app/DEPLOY.md).

**Demonstração × lançamento.** O arquivo `app/public/game/config.js` diz o modo. O padrão é `producao` (sem presente de
teste, salas online ligadas). Para mostrar o jogo sem servidor: `modo: 'demo'` (presente de 50.000 moedas e 5.000 gemas,
selo DEMONSTRAÇÃO e as salas online desligadas com aviso claro; `presente: false` tira o presente).

| `config.js` | Para quê |
|---|---|
| `modo` | `'producao'` (padrão) ou `'demo'` |
| `presente` | `false` tira o presente de teste da demonstração |
| `servidor` | endereço do servidor das salas se ele **não** estiver no mesmo endereço do jogo (ex.: `'salas.meusite.com'`) |
| `salas` | `'servidor'` liga as salas numa demonstração servida pelo `server/servidor.js` |
| `origensPlataforma` | páginas que recebem os eventos do jogo quando ele está num iframe de outro endereço |

**Editar o jogo.** As fontes ficam em `tools/` (por versão e por etapa) e `backup/racha.html` (o original, com a física).
Depois de mexer: `python3 tools/aplicar_rua.py` gera `app/public/game/racha.html` e confere o sha256 do bloco de física
(v86: o da mecânica clássica), com só as trocas de regra documentadas: mudar a física sem querer quebra o build. A força do
chute fica no bloco AJUSTES do `backup/racha.html` (`FORCA_KICK` = PASSE, `FORCA_POWER` = CHUTE, `LIMITE_VEL_BOLA` = o teto
da bola) **e** no começo do `server/partida/fisica.js` — os dois iguais (o `tests/v86_chute_test.py` confere). `python3 tools/mapa_codigo.py` mostra, para cada função que foi
trocada por uma versão posterior, qual implementação está valendo ([`tools/MAPA_REDEFINICOES.md`](tools/MAPA_REDEFINICOES.md)).

**Sem internet de verdade (fontes).** Desde a v85 as quatro famílias (Lilita One, Anton, Barlow e Barlow Condensed, licença
OFL) vêm em `app/public/game/fontes/` (os `.ttf` originais, com a licença ao lado): o jogo não pede nada de fora para
desenhar as letras. Ver `app/public/game/fontes/LEIA-ME.txt`.

---

## v87 · tudo dentro do jogo: o site abre o jogo direto, em tela cheia

No site com a plataforma, a barra de cima (a conta, o SAIR, o RACHA CONTROL) e as abas (Perfil, Carreira, Estatísticas,
Conquistas, Inventário, Amigos, Ranking) ficavam por cima do jogo e espremiam a tela — no celular deitado, quase metade dela.
A v87 tira tudo isso de cima do jogo:

* **A raiz do site abre o jogo direto**, na página inteira (`/game/racha.html`): o servidor da plataforma redireciona
  (`app/api/lib/vite.ts`), o `app/src/main.tsx` faz o mesmo no modo de desenvolvimento e o `App.tsx` leva a raiz e os
  endereços desconhecidos ao jogo. O jogo dentro do site (o jeito de antes) continua em `/jogo-no-site`.
* **O login é o do jogo** (ENTRAR, CRIAR CONTA, RECUPERAR, SÓ TREINAR OFFLINE — o da v84), agora com a cara do jogo e
  compacto no celular deitado. **Quem já entrou pelo site entra direto**: sem a sessão no aparelho, o jogo pergunta pela
  sessão do site no mesmo endereço (o cookie) antes de mostrar o formulário — e não guarda senha nem token nesse caso.
* **As coisas da conta pelos botões do jogo.** O perfil, o ranking, a tampinha, o clube e os Ajustes já estavam no jogo.
  O que só existe no site abre **por cima do jogo**, num painel com o **VOLTAR AO JOGO** — o jogo continua aberto embaixo,
  do jeito que estava —, pelos botões que já existiam: o **AMIGOS** do lobby e o ABRIR AMIGOS da tela AMIGOS (os amigos da
  conta), o **ABRIR O PERFIL DA CONTA** (o nome do cartão) e o **VER PERFIL** do chat. Dentro do painel, a página do site
  mostra só as abas da conta (Perfil, Carreira, Estatísticas, Conquistas, Inventário, Amigos, Ranking); o "Jogar" de lá e o
  Esc fecham o painel.
* **SAIR DA CONTA** fica em Ajustes › Conta e, para a equipe, o **RACHA CONTROL** ao lado (abre o painel `/admin`).
* Arquivos: `tools/v87/v87.py` e `tools/v87/site.js` (a etapa do build depois da v84) e, na plataforma, `app/api/lib/vite.ts`,
  `app/src/main.tsx`, `app/src/App.tsx` e `app/src/components/racha/Layout.tsx`. Teste: `tests/v87_site_test.py`, com a
  plataforma de mentira `tests/v87_plataforma_falsa.mjs`.

**Para o seu servidor da plataforma pegar a v87:** `git pull`, depois `cd app && npm install && npm run build` e reiniciar o
`npm start` (o jogo vem junto no build, de `app/public/game`).

## v86 · a mecânica clássica de volta, com o chute mais forte

A física nova da v85 não agradou no teste; a v86 volta, a pedido, à **mecânica da v84** e muda só a força do chute:

* **O que voltou (o jeito da v84):** a física do jogo-base (a tampinha soma a direção nova à velocidade e corta no teto, e
  para na hora ao soltar; o chute soma força ÷ massa à bola; os quiques e o atrito dos materiais; o giro da bola), as
  quadras e as marcas da v84 (56 × 40 u no 1v1 até 108 × 90 u no 4v4), o analógico de 32 direções, os botões PASSE/CHUTE
  com os estados 1/2/3 e os 0,02 s entre trocas, o comando `button` na rede, os bots, o treino e as previsões com esse
  chute. No servidor, a partida autoritativa e o motor das salas com a mesma física. Saíram o núcleo FR-85
  (`server/partida/nucleo_fisica.js`), a especificação dele e os testes dele — a v85 inteira ficou na branch `v85-auditada`.
* **O chute mais forte:** PASSE **275** e CHUTE **440** (eram 250 e 400: a bola parada sai a 27,5 e 44 u/s em vez de 25
  e 40) e o teto da bola **60 u/s** (era 55, para o chute de quem vem correndo não bater no teto antes). Os mesmos números
  no jogo e no servidor; os bots, o treino, a CURVA e as previsões usam essas constantes e acompanham sozinhos. Todo
  mundo igual: nenhum cosmético mexe nisso.
* **O que continua da v85:** os textos próprios, as chaves salvas `racha-treino-*` (com a migração das antigas), as fontes no
  pacote, o SÓ TREINAR OFFLINE no login, a imagem da favela fora, o contador de FPS verde a 90% do alvo, o build que
  reproduz a v84 (`tools/v84/`) e o site de teste (o `server.js` com o modo visitantes, o Render e o GitHub Pages).
* **Os comentários** da mecânica que voltou não têm o nome do outro jogo nem as descrições da análise; de onde vem a
  mecânica está registrado no [`PROVENIENCIA.md`](PROVENIENCIA.md). O documento de código próprio da auditoria vale para a
  v85, não para a mecânica desta versão.
* **Os testes:** `tests/v86_chute_test.py` (novo: os números iguais no jogo e no servidor, a bola depois do PASSE e do
  CHUTE pelo `kickBall`, pelos botões e pelo comando da rede, o teto, as 32 direções, os botões 1/2/3 e a quadra da v84) e
  o `tests/v85_online_test.py`, que percebe a mecânica clássica e confere o `button`, as 32 direções e a força do PASSE e
  do CHUTE na sala hospedada. Os testes que a v85 tinha ajustado à FR-85 (v78, v83_sala, v83_salas_ws, servidor) voltaram
  aos da v84.

> **v87.1 (a pedido, depois de jogar):** o chute ficou **15% abaixo da versão antiga** — PASSE **212,5** e CHUTE **340**
> (a bola parada sai a 21,25 e 34 u/s em vez de 25 e 40) e o teto da bola **46,75 u/s** (era 55) —, no jogo e no servidor.
> Os números de 275, 440 e 60 acima são os da v86.

**O que muda para quem joga:** a sensação da v84 (o arranque e a parada na hora, a bola e as quadras de antes), com a bola
saindo 10% mais rápida no PASSE e no CHUTE (v87.1: 15% mais devagar que na versão antiga). Isso foi medido nos testes; **se ficou bom, só jogando**. Para mudar de novo,
é um número em cada um dos dois arquivos (ver "Editar o jogo", acima).

## v85 · a auditoria de proveniência: a física própria (FR-85), os controles, os textos e as fontes no pacote

> Na v86, a física, as quadras e os controles desta seção voltaram aos da v84 (ver acima); o resto da v85 continua.

A v85 é a correção pedida na auditoria de 17/10/2026, que comparou o RACHA v84 com o APK de um jogo de futebol de discos
de terceiros (o "jogo de referência"). O que a auditoria achou e o que mudou está em [`PROVENIENCIA.md`](PROVENIENCIA.md)
e nos relatórios entregues junto (AUDITORIA_INICIAL, RELATORIO_DE_CORRECOES, AUDITORIA_FINAL, RELATORIO_DE_TESTES e
DOCUMENTO_DE_CODIGO_PROPRIO_RACHA). Em resumo:

* **A física é outra (FR-85).** Um núcleo só, `server/partida/nucleo_fisica.js`, usado pelo jogo (o build cola o arquivo e
  confere o sha256) e pelo servidor (a partida autoritativa e as salas hospedadas). Os modelos são próprios — aceleração
  limitada no lugar de "impulso, teto e zerar ao soltar", chute com velocidade de saída e embalo, meia-vida da bola por piso,
  batidas por par sem giro, subpassos — e os números saem de metas de jogo escritas antes deles
  ([`tools/v85/FISICA_RACHA.md`](tools/v85/FISICA_RACHA.md)). Todo mundo continua igual: cosmético não muda nada.
* **As quadras têm medidas próprias** (de 52 × 36 u no 1v1 a 92 × 68 u no 4v4; os gols, as marcas e o círculo por uma
  regra).
* **Os controles.** O analógico tem 256 direções (eram 32). Os botões PASSE e CHUTE funcionam por um gatilho próprio: o
  último apertado vale, segurando ele espera a bola chegar e um aperto dá um chute só; o comando da rede leva `acao` (os
  botões em bits) no lugar do `button`. A câmera da base usa meia-vida (0,18 s) e o contador de FPS fica verde a partir de
  90% do alvo.
* **Os textos e as marcas.** As frases iguais às do jogo de referência foram reescritas; o nome do outro jogo e os
  comentários de engenharia reversa saíram do projeto inteiro. As chaves salvas do treino viraram `racha-treino-*`; quem
  já tinha o jogo salvo não perde nada: na primeira vez, o jogo leva o que estava nas chaves antigas (o perfil, o HUD, o
  som, o campo e o modo) para as novas — neste aparelho, nas gavetas das contas e na cópia antiga da conta — reconhecendo
  a chave pelo formato (`tests/v85_chaves_test.py`). A imagem embutida do 1v1 da favela (sem uso e sem proveniência) saiu.
* **As fontes vêm no pacote** (os `.ttf` originais com a OFL, em `app/public/game/fontes/`): o jogo não pede mais nada ao
  Google Fonts.
* **O login da v84 ganhou o SÓ TREINAR OFFLINE** no formulário e no SEM CONEXÃO. Antes ele só existia quando o jogo não
  sabia o endereço da plataforma: servido por um endereço (o `server/servidor.js`, um `http.server`), o jogo ficava preso na
  tela de login — o próprio módulo dizia que o treino offline seguia livre.
* **A plataforma.** O `app/package-lock.json` passou a apontar para o registro público do npm (272 pacotes apontavam para um
  espelho privado do ambiente em que a plataforma foi gerada; os hashes de integridade são os mesmos). As licenças estão em
  [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).
* **Os testes.** `tests/v85_fisica_test.mjs` (o núcleo e as metas), `tests/v85_sincronia_test.py` (o mesmo lance no
  aparelho e no servidor: diferença zero), `tests/v85_online_test.py` (duas sessões do jogo numa sala hospedada: o
  analógico de 256 direções e os botões em bits chegando ao servidor) e `tests/v85_chaves_test.py` (as chaves antigas). Os testes que a v83 e a v84 deixaram para trás
  (o login obrigatório e as salas hospedadas não estavam neles) rodam com um arnês aplicado igual antes e depois:
  `tests/servidor_visitantes.cjs` (o servidor de verdade aceitando quem não tem conta, só nos testes), o SÓ TREINAR OFFLINE
  no `tests/comum.py` e a parte nova do `servidor_test.js` que confere o login obrigatório. O resultado antes × depois,
  teste por teste, está no RELATORIO_DE_TESTES; `bash tests/roda_lista.sh <testes>` guarda a saída inteira de cada um em
  `tests/saida/logs/`.

**O que muda para quem joga.** O ritmo foi mantido de propósito — o tempo para atravessar cada quadra e o alcance do passe e
do chute em proporção da quadra ficaram perto dos de antes —, mas a sensação muda um pouco: a tampinha arranca e para em
~0,05 s (antes era instantâneo), o passe e o chute saem mais rápidos em relação à corrida e a bola freia um pouco mais, e as
quadras e os gols têm outro tamanho. As medidas antes × depois estão no RELATORIO_DE_TESTES; **o equilíbrio e a sensação
no celular só se provam jogando**.

**A v84, como chegou.** O login obrigatório sem o site (`tools/v84/login_cedo.js` e `login.js`) e os textos das salas
hospedadas tinham sido editados direto no jogo gerado, e o build não gerava mais o jogo entregue. A v85 reconstruiu essas
mudanças como etapa do build (`tools/v84/v84.py`): antes das correções, o build voltou a gerar exatamente o arquivo
entregue (mesmo sha256).

## v82 · as contas: a patente na conta, o ranking de todos, o nível da conta, entrar pelo jogo e o progresso na conta

O pedido: a etapa das contas do pacote. **A lista dos itens 20 a 31 não chegou até aqui** (o texto não estava na conversa
nem nos arquivos); a v82 seguiu o que a etapa tinha de dizer pelo resto do pedido e pelas limitações que a v79–v81 deixaram
anotadas — se a lista aparecer, dá para conferir item a item e ajustar. O que a conta passa a ter (com o jogo dentro da
plataforma RACHA 2.0; aberto sozinho, o jogo é o de sempre, de quem joga sem conta):

* **A patente da ranqueada na conta.** Cada ranqueada (contra os bots ou online) diz à plataforma, no começo, que é
  ranqueada e o tamanho do time; no fim, **o servidor da plataforma faz a conta dos pontos** com as mesmas regras do jogo
  (`app/contracts/patentes.ts`: +22 a vitória, +3 por gol de diferença até 3, +6 contra os bots no difícil, +4 a partir da
  3ª vitória seguida; a derrota −14 e −2 por gol, pela metade no Bronze; o empate 0; a desistência −25; a derrota e a
  desistência não fazem descer de patente) e **guarda na conta** (cada partida muda a patente uma vez só). O jogo mostra a conta na hora, como sempre, e acerta
  pelo que a plataforma devolveu: se for diferente, a tela do fim troca para o que valeu e explica por quê. **Online**, só
  vale com o **selo do servidor das salas** dizendo que a partida era da ranqueada e o tamanho do time; **contra os bots**,
  os pontos ganhos por dia têm um **teto de 250** (a vitória conta, os pontos param; online não tem teto); **desistir** tira
  25; a ranqueada que **fica aberta** (o jogo fechou ou a rede caiu no meio) e passa da validade de 30 min **conta como
  desistência** na próxima partida que a conta começar — o jogo avisa no campo ("A RANQUEADA DE ANTES FICOU ABERTA:
  DESISTÊNCIA (−25)"). No RACHA CONTROL, quem pode punir ajusta a patente de alguém (com o motivo, a confirmação e o
  registro).
* **O ranking das patentes de todos.** No site, a página **Ranking** abre na aba **Patente** (as contas com perfil público,
  pela patente, com a sua posição); no jogo, o **RANKING** ganhou as abas **PATENTES | LIGA DA SEMANA** (logado, abre em
  PATENTES, com a sua linha marcada; a liga contra os bots de sempre continua na outra aba). O cartão do jogador no site mostra
  a patente.
* **O jogo mostra a conta.** Logado, o nível e o XP que aparecem (o lobby, o perfil, as metas) são **os da conta**: uma curva
  só, a da plataforma (`50·n·(n−1)`, níveis 1 a 100). Cada nível novo da conta dá as mesmas moedas e gemas de antes (100
  moedas e 5 gemas; +25 gemas a cada 5 níveis), uma vez. O XP do aparelho não aparece com a conta (nas missões e nos
  prêmios): quem dá XP da conta é o servidor (as partidas e os gols de treino), e a tela do fim mostra **+N XP DA CONTA** (e
  **NÍVEL N!** quando sobe).
* **Entrar e criar conta pelo jogo.** Em **Ajustes › Conta**, o cartão da conta fica em cima: sem conta, **SEM CONTA** com
  **ENTRAR** e **CRIAR CONTA**; logado, a tampinha da patente, o nome, o ID, o nível, a patente e se o progresso já está salvo na
  conta (com SALVAR AGORA). O "NESTE APARELHO" do perfil e o RANKING › PATENTES também levam ao ENTRAR. Eles abrem a página
  de entrar da plataforma (`/entrar`, ou `/entrar?aba=criar`); fora dela, o jogo explica onde fica a conta.
* **O progresso na conta.** As moedas, as gemas, as tampinhas e as peças, os desenhos, as missões, as estatísticas, os
  recordes, o treino e as escolhas do jogo (as 10 chaves de progresso de `app/contracts/progresso.ts`) vão para a conta
  **sozinhos** — alguns segundos depois de cada mudança, no fim da partida e ao fechar — e **voltam em outro aparelho** (o
  jogo já abre com eles). Se **os dois mudaram** (a conta tem uma versão de outro aparelho e este tem o que ainda não foi),
  o jogo pergunta **QUAL PROGRESSO FICA?** mostrando os dois (moedas, gemas, partidas, peças, a patente): **O DA CONTA** ou
  **O DESTE APARELHO**. Na **primeira vez** de uma conta num aparelho que tem progresso de quem jogava sem conta, o jogo
  pergunta **LEVAR O PROGRESSO PARA A CONTA?** — LEVAR (vai tudo; a patente entra até **Prata I, 799**, porque a ranqueada
  contra os bots feita sem conta não teve conferência) ou COMEÇAR DO ZERO (a conta começa nova e o de sem conta fica no
  aparelho); a pergunta vem antes da primeira vez do jogo e das novidades. **Cada conta tem o seu progresso no mesmo
  navegador**: sair guarda o da conta numa gaveta do aparelho e volta o de quem joga sem conta; entrar de novo traz a gaveta
  e, se a conta tiver uma versão mais nova, ela. Sem conta, tudo é como antes. Exportar o progresso (Ajustes › Conta) não
  leva as gavetas das contas.
* **Correções** que a etapa pedia: os **empates da ranqueada** sumiam ao abrir o jogo de novo (o jogo-base não lia o campo)
  — agora ficam; os **pontos** e os **gols contra** que o jogo mandava no fim eram jogados fora pela plataforma — agora ficam na
  partida; o **ID de visitante** do servidor das salas podia ser igual ao ID de uma conta — os visitantes agora têm 7
  dígitos a partir de 9000000 e o clube procura a conta primeiro; o fim de uma partida que chegava antes da resposta do
  começo (a rede lenta) se perdia — agora espera; e um aviso da conta que chegasse a um jogo aberto com o progresso de outro
  (sem conta, ou outra conta) misturava a patente — agora é ignorado (a plataforma abre o jogo de novo para quem entrou).

**Qual implementação valia** (o mapa das redefinições, antes de mexer): o nível vinha do `nivelInfo` do jogo-base (a curva do
aparelho, 80 + 20·n) usado pelo lobby (`v77LbSync`, o `#v71-nv`), pelo perfil (`v78PfNivel`, o `pxMeta` da v70) e pelo `ganha()`; a
patente, do `CONTA.rq` com o `rqPontua` (o do jogo-base + o empate da v80) e o `rqElo` da v79; o fim da partida, do
`rqMostraFim` (v70 → v80) com o `rqPintaPontos` e o `premioNos`; os eventos para a plataforma, do `v70EvInicio`/`v70EvFim`
(`tools/v70/online.js`) e do `racha-bridge.js`; a conta, do `tpePlataforma().conta()` (`editor_rua.js`; `pxConta`, `v70ContaLogada`); o
RANKING era só a liga da semana contra bots; o exportar/zerar do progresso, do `PX_CHAVES` da v70 (`tools/v70/perfil.js`).

Arquivos: no jogo, `tools/v82/inicio.js` (antes do script do jogo: de quem é o progresso nas chaves, as gavetas, a cópia da
conta antes de o jogo ler), `tools/v82/conta.js` (no fim do script: a conta, o nível, a patente, o fim, a cópia, as perguntas,
o ENTRAR, o cartão, o ranking), `tools/v82/conta.py` (as trocas de texto: o script de entrada, o `PX_CHAVES`, o XP das missões)
e `app/public/game/v82.css`; o `racha-bridge.js` manda `ranqueada` e `tamanho`. Na plataforma: `app/contracts/patentes.ts`,
`partida.ts` e `progresso.ts` (as regras, sem banco), `app/api/racha/ranqueada.ts` e `progressoRouter.ts` (novos), o
`jogoRouter.ts` (a ranqueada no começo e no fim, a desistência da vencida), o `perfilRouter.ts` (o ranking, a minha patente, a
importação), o `authRouter.ts` (a patente na conta), o `adminRouter.ts` (o ajuste), o `db/schema.ts` (as tabelas `ranqueada`,
`ranqueada_eventos`, `progresso_jogo` e as colunas novas de `partidas`: rode `npm run db:push`), o `src/lib/ponteJogo.ts` (a ponte
v82), as páginas Ranking, Entrar, Lobby e RACHA CONTROL e o cartão. No servidor das salas: o selo diz se a partida era da
ranqueada e o tamanho (`k`, `n`) e os IDs de visitante (`server/turma.js`, `server/clubes.js`). Testes: `tests/v82_test.py` (o
jogo dentro de uma plataforma de mentira com as mesmas regras: `tests/plataforma82_falsa.mjs` + `tests/v82_plataforma.html`),
`tests/contas_test.mjs` (as regras e a cópia) e a parte 7 do `tests/servidor_test.js` (o selo da ranqueada, os visitantes).

**O que depende de fora**: tudo o que é da conta precisa da **plataforma no ar com o banco** (MySQL/TiDB, `npm run db:push` para
as tabelas novas) e do jogo **aberto dentro dela** (a página do lobby do site); a ranqueada online precisa também do
**servidor das salas** com o mesmo segredo do selo. Sem a plataforma, o jogo é o de sempre (o progresso e a patente ficam no
aparelho, e o ENTRAR explica onde fica a conta).

## v81 · o chat: a barra embaixo, BRASIL | SALA, o perfil pelo nome, os três pontinhos e a moderação

O pedido (a terceira etapa do pacote: os itens 14 a 19): o chat fixo embaixo, com o visual próprio do RACHA; o Chat BRASIL e
o chat da SALA; o "digitando" com três pontinhos; a moderação. Tudo o que já existia por baixo continua (o Chat do Brasil da
v57 com a tela cheia dele, o chat da sala da v62, as frases rápidas): a v81 é a cara nova, os lugares a mais, o perfil pelo
nome, os pontinhos, os filtros no aparelho, a denúncia na sala e o OCULTAR.

* **A barra embaixo**: no **menu**, um bloco compacto no vão da fileira de baixo, entre o DESAFIOS e o MODO e da altura deles
  — a tag **🇧🇷 BRASIL** ou **⚽ SALA** (a conversa da mensagem mais recente), o contador de não lidas, a seta e **NOME: a
  mensagem** (o nome em amarelo, com o V de quem tem); toca para abrir, a seta minimiza de novo. Nas **telas do menu** com o
  canto livre (perfil, salas, amigos, clube, eventos, replays) ela fica como um **chip** no canto de baixo, à esquerda — você
  anda pelos menus sem perder a conversa (nas telas de rodapé ocupado — ranking, loja, treino, tampinha — e na tela cheia do
  Chat do Brasil ela não entra). Na **sala online**, embaixo, entre o CONVIDAR e o INICIAR. Na **partida online**, **menor e
  mais transparente**, embaixo do campo, entre o analógico e os botões: não cobre o placar, os controles nem a bola, e
  abre sem pausar a partida (o seu jogador só para de andar enquanto você escreve, como antes). No **celular** a barra é
  maior, para ler e tocar no tamanho real. O Chat do Brasil liga sozinho onde a barra está.
* **O painel**: abre **embaixo** da tela (a v63 abria em cima), com as abas **🇧🇷 BRASIL | ⚽ SALA** (PARTIDA na partida) e os
  contadores, quem está online ("128 online" / "3 na sala"), as mensagens em ordem (o nome em amarelo antes de cada uma,
  com o V; a sua em verde), as frases rápidas na sala, o campo **"Digite sua mensagem…"** e o **ENVIAR**, o olho (OCULTAR), o
  ⊞ (a tela cheia do Chat do Brasil, no menu) e a seta (minimizar). No celular o painel sobe junto com o teclado. Na
  partida, o ENVIAR manda e fecha (a barra fica).
* **🇧🇷 BRASIL**: o chat público de quem está ligado no servidor, em tempo real, independente de sala (chega no menu, nas
  telas, na sala e na partida), com o histórico recente ao entrar. **⚽ SALA**: só quem está na sala vê (o servidor entrega
  só para os membros; quem está fora não recebe nada), na espera e na partida; mudando de sala, a conversa é a da sala
  nova; a aba só aparece quando você está numa sala online.
* **O perfil pelo nome**: tocar no nome (na barra não; no painel) abre a **ficha** — a tampinha, o nome com o V, o clube, a
  hora da mensagem — com **VER PERFIL** (abre o perfil dele na plataforma, quando o jogo está nela e a pessoa tem conta;
  sem isso, o botão não aparece), **SILENCIAR / DEIXAR FALAR** e **DENUNCIAR**.
* **Os três pontinhos**: enquanto alguém da sala escreve, aparece em cima da tampinha dele, na partida, um balão escuro
  pequeno com três pontos brancos pulando (parados com Reduzir animações), que segue a tampinha; some quando a mensagem
  sai, quando a pessoa fecha o chat ou sozinho uns segundos depois de parar. Nunca mostra o texto; é o servidor que avisa
  a sala, então todo mundo vê o mesmo.
* **A moderação**: **silenciar** alguém esconde as mensagens dele só para você (nos dois chats, na barra, no painel e na
  tela cheia; fica salvo); **denunciar** uma mensagem da sala: com 2 pessoas diferentes ela vira "Mensagem escondida pela
  moderação." para todos (inclusive para quem escreveu) e quem escreveu fica 5 min sem falar naquela sala (no Chat do
  Brasil continuam as 3 denúncias e os 10 min); os **filtros no aparelho** avisam antes de mandar (com o motivo): telefone,
  CPF, e-mail ("Para a sua segurança, o chat não envia telefone, e-mail nem CPF."), link e @ ("O chat não envia links nem @ de
  rede social."), palavrão e ofensa, a mensagem igual à anterior em 30 s e mais de 4 seguidas em 10 s (no Brasil, 1 a cada
  3 s); **o servidor confere tudo de novo** com o mesmo filtro (telefone, CPF e e-mail são novos lá também) e o aviso dele
  aparece no painel. **Ocultar**: o olho do painel ou a chave **"Chat na tela"** em Ajustes › Chat tira a barra de todo lugar
  (e traz de volta).
* **O visual** é do RACHA: o grafite meio transparente com a borda clara fina, o amarelo da quadra na tag, nos nomes, no
  ENVIAR e na borda de cima do painel, o texto branco, os ícones pequenos (a bandeira, a bola, a seta, o olho), a mensagem
  nova entrando de leve e o painel subindo (nada disso com Reduzir animações).

Arquivos: `tools/v81/chat.js` e `app/public/game/v81.css`; no servidor, o número de cada mensagem, a denúncia, a repetida,
o silêncio por sala e o filtro de dados pessoais (`server/turma.js`, ver `server/LEIAME.md`); na plataforma, a rota
`/jogador/<id>` no `app/src/lib/ponteJogo.ts`. Teste: `tests/v81_test.py` e as partes 6 e 6b do `tests/servidor_test.js`. O
`v79_test.py` que lia o painel antigo (`.cp-lin`) passou a ler o novo; o `celular_test.py` continua tirando a cópia de tela
do painel aberto.

**O que depende de fora**: o Chat do Brasil e o chat da sala precisam do **servidor da turma** no ar (sem servidor, a barra
não entra; a sala neste aparelho tem a barra e o chat local, sem os pontinhos nem a denúncia); o VER PERFIL precisa da
**plataforma** (o jogo dentro dela) e de quem escreveu ter conta; "quem está na região" é quem está ligado no mesmo
servidor — não há ainda divisão por estado ou cidade.

## v80 · a partida: Time A laranja × Time B roxo, a tampinha Listras, o placar com 3:00, a prorrogação, o GOOOL! e o treino

O pedido (a segunda etapa do pacote de 31 itens: os itens 2 a 11 e 13, e a parte da partida do 29): as cores oficiais
**laranja #FF6A00** (Time A) e **roxo #7A3FC4** (Time B); a tampinha inicial no modelo **Listras**; o placar novo; o
cronômetro de **3:00** controlado pelo servidor; a **prorrogação** só no 0 × 0; o limite de 3 gols; sem os indicadores a mais
nos adversários; os controles do treino sem as setas verdes; a animação nova do gol; o editor da tampinha como está.

* **Os times**: o **TIME A** (o da esquerda; o seu, contra os bots) é laranja e o **TIME B** é roxo em todo lugar — o halo e
  o contorno de cada jogador, o placar, a apresentação dos times, a tela do fim, a saída de bola, a rede, a torcida, a sala
  (a coluna do Time A laranja, a do Time B roxa, os botões do menu do cartão e do árbitro) e as mensagens ("O Time B está
  cheio.", "Toque no Time A ou no Time B para entrar."). Os nomes antigos (preto × branco) saíram das telas.
* **A tampinha inicial** é o modelo **Listras** do editor com o fundo laranja e uma listra roxa só, do meio para a direita:
  **metade laranja, metade roxa**, divisão vertical no centro, sem branco, com a borda e os detalhes de sempre. No **Time A**
  ela fica **toda laranja**; no **Time B**, **toda roxa**; sem time (no lobby, no perfil, no treino e assistindo na sala) volta
  para a metade/metade. A troca aparece na hora para todo mundo da sala (cada jogo desenha a tampinha de cada um pela vaga
  dele, que vem do servidor a cada mudança). Só a inicial muda: as compradas, desbloqueadas, personalizadas e os modelos
  prontos ficam como são (o time aparece no halo e no contorno). Quem estava com a padrão da v71 passa para a nova uma vez.
* **O placar novo**: o Time A à esquerda em laranja e o Time B à direita em roxo (com o nome do time e o símbolo do contorno
  em campo: ○ cheio no A, ◌ tracejado no B), os gols grandes e o relógio no meio; compacto, no mesmo espaço do de antes (nada
  do HUD mudou de lugar). Em toda partida: a ranqueada, a sala neste aparelho e a sala online.
* **O relógio de 3:00** (a partida normal: a ranqueada, contra os bots e online): começa em **03:00** na saída de bola e desce
  segundo a segundo (na saída, no jogo e na festa do gol; não corre na pausa nem no replay); nos 10 últimos segundos fica
  amarelo. Em **00:00**: quem tiver mais gols vence; **1 × 1 e 2 × 2 terminam empatados**; **só o 0 × 0 vai para a
  prorrogação**: o relógio continua **negativo, em vermelho** (-00:01 … -02:00, com a faixa PRORROGAÇÃO · GOL DE OURO), o
  primeiro gol vence na hora (**gol de ouro**) e, sem gol até **-02:00**, empata. Os **3 gols** continuam: quem chega no 3º
  vence na hora. A bola que entra depois do tempo não vale e, depois do fim, nada muda o resultado.
* **O relógio é do servidor na partida online**: o servidor manda o tempo a cada segundo e na pausa (o `relogio`), e todo
  mundo — quem roda a partida, quem joga de fora e quem assiste — mostra o mesmo relógio (a diferença é só a da rede). Quem
  roda a partida decide o fim por esse relógio; cada gol vai com a hora dele, e o servidor confere tudo pela linha do tempo
  dele: gol depois do fim, depois do tempo, depois da prorrogação ou com o relógio do anfitrião longe do dele não vale; o
  resultado precisa ser o que a linha do tempo permite (um 1 × 1 antes dos 3:00, por exemplo, não). Se o fim não chega 10 s
  depois da hora, **o servidor encerra sozinho** pelo relógio dele (e avisa: "encerrada pelo relógio do servidor").
* **O empate** (novo na ranqueada): a tela do fim diz **EMPATE** (sem a cara de derrota), **±0 ponto** na patente, a sequência de
  vitórias zera, as estatísticas e as ÚLTIMAS PARTIDAS contam o empate e a plataforma recebe o empate (ela já conta XP de
  empate).
* **As salas personalizadas ficam com as regras delas** (o pedido: manter as configurações): sem tempo (primeiro a 3, e o
  placar mostra o tempo de jogo e ATÉ 3) ou 2, 3 ou 5 minutos com o GOL DE OURO no empate (agora no relógio vermelho do placar
  novo, contando para baixo). O TEMPO da sala aparece como "3 min" (o "3 minutos" saía cortado no quadro).
* **Os adversários sem os indicadores a mais**: o halo deles não tem mais a ponta (a setinha para onde estão virados) e,
  fora da tela, eles não ganham mais a gota na beira. Ficam o nome, a cor do time (o halo e o contorno), a **sua** setinha
  branca e as gotas dos companheiros e da bola. No replay a setinha de todos continua (para entender o lance).
* **A animação GOOOL!** (no lugar da faixa de pixo): uma **faixa de torcida** na cor do time que marcou (o pano torto com as
  listras e a franja nas pontas) entra varrendo, com os riscos de velocidade; o **GOOOL!** cai letra por letra (os três Os
  cada vez maiores, o grito que estica) e uma onda passa por ele; embaixo, a **placa com o nome de quem marcou** (e o passe,
  o desvio ou o gol contra; as moedas do seu gol); umas poucas tiras de **papel picado**. Laranja no gol do Time A, roxo no do
  Time B; dura o mesmo 1,7 s de antes e sai para o lado. A chuva de confete da tela inteira saiu do gol (a da vitória
  continua). Com Reduzir animações, só aparece e some. No treino, o recado do exercício (NO ÂNGULO!, DE PRIMEIRA!) vai na placa.
* **Os controles do treino** (TAMANHO, CAMPO e TREINO, embaixo): cartões de grafite meio transparentes com a borda bem
  marcada, o ícone de cada um (duas tampinhas, o campinho, o cone) e o nome em amarelo, o escolhido no meio e as bolinhas
  de quantas opções há; nas pontas, tampinhas pequenas com a seta fina branca (sem as setas verdes). Ao apertar, a metade
  tocada acende de leve e a tampinha dela ganha a borda amarela. Maiores que os de antes; as trocas e a hora do toque são
  as mesmas.
* **O editor da tampinha continua igual** (as abas Padrão, Borda, Ícone, Modelos Prontos e Inventário, as cores, os modelos,
  os preços): só a tampinha inicial e a adaptação ao time mudaram.

Arquivos: `tools/v80/times.py` (as trocas de texto: a tampinha padrão, os nomes dos times e a classe dos botões),
`tools/v80/times.js` (as cores, a tampinha de cada um, a troca da padrão da v71), `tools/v80/partida.js` (o relógio, as
regras, o placar, o empate, os indicadores e o TEMPO da sala), `tools/v80/gol.js` (o GOOOL!), `tools/v80/treino.js` (os
controles do treino), `app/public/game/v80.css`; no servidor, o relógio, a linha do tempo, a conferência e o fim pelo
servidor (`server/turma.js`, as opções `--tempo-normal`/`--prorrogacao` no `server/servidor.js`, ver `server/LEIAME.md`).
Teste: `tests/v80_test.py` e a parte 11 do `tests/servidor_test.js`. Os testes antigos que conferiam o preto × branco, o
símbolo do placar antigo, a ranqueada sem tempo no servidor e a Arena pixel a pixel contra a v71.1 (`v71`, `polimento`, a parte 10
do `servidor_test.js` e o `v74` com `RACHA_REF`, que desenha a Arena com as cores da v71 por um momento)
passaram a conferir o novo (marcados com "v80").

**O que depende de fora**: o relógio do servidor e a conferência só existem na partida online, com o **servidor da turma**
no ar; contra os bots (sem servidor), o relógio é o do aparelho, que é quem roda a partida. As salas personalizadas online
continuam com o relógio de quem roda a partida (as regras delas não mudaram).

## v79 · as patentes, só ranqueada (online + bots, no Estádio) e o selo V

O pedido: "crie essas patentes ranqueadas também; a ranqueada pode ser jogada multiplayer; tire o casual, deixe só
ranqueada, só no campo; e procura partidas online — caso não achar, aí vai contra os bots; crie esse V ali, que será para
influenciadores (essa imagem é só um exemplo); o perfil deixe como já está", com a imagem das patentes, a do V e a lista
de 31 itens. Na conversa ficou: **tudo, em etapas** (esta é a primeira: v79 ranqueada → v80 a partida → v81 o chat → v82 as
contas → v83 a sincronia e os testes finais), as cores **laranja × roxo** (na v80) e o **Estádio** como o campo da ranqueada.

* **As 8 patentes** (desenho próprio, nas faixas da imagem): **BRONZE** 0–399 · **PRATA** 400–799 · **OURO** 800–1.299 ·
  **PLATINA** 1.300–1.899 · **DIAMANTE** 1.900–2.599 · **ÉLITE** 2.600–3.399 · **MESTRE** 3.400–4.299 · **LENDÁRIO** 4.300+.
  Cada uma tem **III** (a de entrada), **II** e **I** (a faixa dividida em 3, de 10 em 10; no Lendário, de 300 em 300). A
  insígnia é o escudo na cor da patente com a bola no meio; as asas crescem da III para a I; coroa na Élite (II e I), no
  Mestre e no Lendário. Os pontos que cada um já tinha continuam os mesmos — só a tabela mudou. A conta dos pontos é a de
  antes (vitória +22, +3 por gol de diferença até 3, +4 com 3 seguidas e +6 contra os bots mais fortes; derrota −14 e −2 por
  gol, no Bronze a metade; sair no meio −25) e uma derrota pode tirar você da divisão, mas não da patente.
* **A tela PATENTES RANQUEADAS**: as 8 colunas com as 3 insígnias e a faixa de pontos, a sua marcada (VOCÊ) e as regras
  embaixo. Abre pela sua patente (em cima, do lado do seu cartão, agora escrito **RANQUEADA**) e pelo **VER PATENTES** do JOGAR.
* **Só ranqueada, no Estádio**: o JOGAR do lobby e o da folha (o MODO abre a folha) são sempre a ranqueada; a folha mostra
  a sua patente, o tamanho do time (1v1 a 4v4, que vale na hora) e o campo — só o **ESTÁDIO** —, sem as abas e sem a CASUAL.
  Quem tinha a casual salva passa para a ranqueada. A partida livre (o modo, o mapa e o tempo que quiser, contra bots ou
  com os amigos) continua nas **SALAS** (a sala neste aparelho ou a online). O Estádio virou o campo padrão: o do treino de
  quem nunca escolheu um campo e o das salas de quem nunca criou uma (quem já tinha escolhido a Arena continua com ela).
* **A BUSCA**: o JOGAR abre "PROCURANDO PARTIDA" (a patente, o tamanho, o campo, o tempo correndo, CANCELAR e JOGAR CONTRA
  BOTS AGORA). Com o servidor da turma, entra na **fila** do tamanho escolhido: com gente para os dois times a partida sai
  na hora; no 2v2 a 4v4, depois de 8 s, 2 ou mais já jogam juntos e **os bots completam**; depois de 20 s sem ninguém, a
  partida é **contra bots** (a faixa avisa: NINGUÉM ONLINE AGORA · RANQUEADA CONTRA BOTS). Sem servidor (como na prévia),
  a busca avisa e a partida contra bots começa em 1,5 s. Os pontos valem igual nos dois casos. O fim do tutorial e o JOGAR
  DE NOVO (com servidor) também passam pela busca.
* **A ranqueada online**: no Estádio, até 3 gols, sem árbitro (ninguém pausa para todos nem encerra), sem troca de time e
  sem revanche; a sala não aparece na lista; a barrinha de cima diz RANQUEADA ONLINE (sem código de sala) e o botão dela
  vira MENU. O resultado conta só se o servidor conferiu (senão, NÃO VALEU, sem pontos), e cada jogo aplica os pontos da sua
  patente (sem o bônus dos bots). Sair no meio é **DESISTIR (−25 PONTOS)**; se quem sai é quem roda a partida, ela para e
  ninguém ganha nem perde (A PARTIDA PAROU). JOGAR DE NOVO procura outra partida. A missão "Conclua 1 partida ranqueada"
  conta as duas.
* **Nada de "LIGA" nem do nível dos bots na partida**: a faixa do começo (RANQUEADA CONTRA BOTS), a pílula de baixo, a
  pausa, a apresentação dos times (BOT · e o jeito), o fim (… · contra bots) e o nome do modo dizem RANQUEADA. O desafio
  dos bots continua crescendo com a patente (a chance de pegar os mais fortes vai de 25% no Bronze a 97% no Lendário), só
  não aparece. As missões do dia que pediam outro mapa ou outro modo viraram as que dá para fazer na ranqueada.
* **O selo V** (desenho próprio, o mesmo na plataforma): um emblema de seis lados com o V no meio — **VERIFICADO** dourado
  (os influenciadores), **PARCEIRO** prata, **EQUIPE** vermelho e **CRIADOR** laranja. Aparece na frente do nome no lobby,
  no perfil, na partida (embaixo da tampinha), na apresentação dos times, nos cartões da sala, na lista das salas (o do
  dono) e nos chats. Ninguém se dá um selo pelo jogo: o seu vem da conta (a plataforma) e o dos outros vem do servidor, que
  tira da conta de cada um. Quem dá e tira é só o dono, no RACHA CONTROL (a plataforma). Cosmético: não muda nada no jogo.
  Das variações da imagem de exemplo: VERIFICADO e PARCEIRO são os selos de mesmo nome; STAFF é o EQUIPE; o laranja ficou
  com o CRIADOR, que a plataforma já tinha. Um selo PRO PLAYER separado não foi criado (seria um valor novo no banco).
* **O perfil continua como está** (o pedido); só ganhou o V na frente do nome de quem tem selo.

Arquivos: `tools/v79/patentes.js` (a tabela, as insígnias e a tela), `tools/v79/ranqueada.js` (só ranqueada, a busca, o
online e os textos), `tools/v79/selo.js` (o V), `app/public/game/v79.css`; no servidor, a fila e a sala ranqueada
(`server/turma.js`, ver `server/LEIAME.md`); na plataforma, o selo no bilhete e nas salas (`app/api/lib/selo.ts`,
`app/api/lib/salas.ts`, `app/api/boot.ts`, `app/api/racha/jogoRouter.ts`), o V nas páginas (`SeloV` em
`app/src/lib/racha.tsx`, na frente do nome no topo, no cartão do perfil e na lista de amigos) e no RACHA CONTROL
(`app/src/pages/AdminPage.tsx`). Teste: `tests/v79_test.py`. Os testes antigos que
conferiam o que a v79 mudou de propósito — a CASUAL no JOGAR, a Arena como o mapa padrão, a LIGA abrindo o JOGAR, o nível
dos bots na apresentação, as missões de modo e o COMO JOGA da casual (`enxuto`, `v71`, `v77`, `v78`, `tutorial`, `perfil`,
`polimento`) — passaram a conferir o comportamento novo (cada troca marcada com "v79" no teste); o resto ficou igual.

**O que depende de fora** (não dá para fingir que funciona): a busca online precisa do **servidor da turma** no ar (o da
plataforma, no mesmo endereço do site, ou o `server/servidor.js`); sem ele, é sempre contra bots. O selo de verdade
precisa da **plataforma com o banco** (o MySQL) e do dono dando o selo no RACHA CONTROL. Os pontos da patente ficam na
conta **deste aparelho** (como os da liga de antes): guardar a patente na conta do site, com o ranking de todos, é da
etapa das contas (v82/v83).

## v78 · os bots novos, nada em cima da cabeça e o perfil mais fácil de entender

O pedido: "tire essas fintas e dribles que ficam em cima da cabeça do player e faça um sistema de bot mais divertido — os
bots não estão divertidos, remova esses atuais e faça uns mais divertidos —, e faça um perfil mais fácil de entender, porém
com a mesma ideia, e a tampinha maior na tela" e, depois, "as tampinhas maiores eu quero só no lobby, não no jogo em si".

* **Nada em cima da cabeça**: os nomes das jogadas (FINTA!, DRIBLE!, TABELA!, DOUBLE SHOT!) não aparecem mais em cima dos
  jogadores. O balão de "digitando" da sala online continua (ele não é nome de jogada).
* **A cabeça dos bots é nova** (a antiga não joga mais FUTEBOL nem COM CURVA; o código dela ficou no arquivo, desligado, só
  para os testes compararem):
  * **Cada bot tem um jeito** que muda o que ele faz: o **Fominha** dribla e chuta de longe, o **Garçom** procura o passe
    (de preferência para você), o **Matador** espera na frente para bater de primeira, o **Paredão** segura atrás (no 3v3 e
    no 4v4 é o goleiro-linha), o **Raçudo** corre atrás de toda bola e dá bote, e o **Malandro** corta passe, tabela na
    parede e, no COM CURVA, bate de curva. No começo da partida a faixa de cima diz a escalação ("COM VOCÊ: GARÇOM ·
    CONTRA: FOMINHA E MATADOR"); na apresentação dos times da LIGA aparece o jeito de cada um (BOT · DIFÍCIL · MALANDRO).
  * **Os seus companheiros jogam com você**: não tomam a bola de você, abrem para receber, tocam para você quando você
    está livre e devolvem a tabelinha; e jogam sempre no nível bom (o nível escolhido é o dos adversários). Se você ficar
    parado 4 s, o time joga sem esperar; na sua saída de bola, um companheiro dá a saída depois de 5 s.
  * **Adversários que dá para vencer**: cada um percebe o lance com um atraso (no Fácil, maior), erra a mira um pouco (mais
    quando está apertado), marca de mais longe no Fácil e às vezes dá o bote — e quem dá o bote pode levar o drible.
  * **Defesa de rua**: sem goleiro (1v1 e 2v2), com a bola na zona do chute e o caminho dela aberto, o último fica entre a
    bola e o gol; no 2v2 do Difícil os dois de lá não sobem juntos. No 3v3 e no 4v4 o **goleiro-linha** joga na linha com
    a bola longe e volta com ela chegando; adiantado, ele corta a bola de frente (não corre junto com ela para o gol), sai
    na bola que vem rolando devagar e espera as saídas de bola no gol. O goleiro do Fácil sai mais do gol.
  * **O placar mexe no jogo** (só na casual contra os bots): o time de bots que abre vantagem relaxa, o que perde de 2
    aperta; no 3v3 e no 4v4, onde você pesa menos no time, os de lá jogam um tico mais soltos.
  * **Comemoram**: quem fez corre para a bandeirinha, cada jeito do seu modo (o avião do Matador, a dança do Malandro, a
    volta correndo do Raçudo…), e os companheiros vão abraçar; quem levou fica parado.
  * **O mesmo corpo de todo mundo**: o bot só mexe no analógico e aperta PASSE ou CHUTE, com a mesma velocidade, o mesmo
    alcance e a mesma força que você. O bloco de física é o mesmo, byte a byte.
* **O perfil mais fácil de entender** (a mesma ideia da v77: a tampinha na quadra à esquerda, o cartão à direita): o nível
  por extenso com quanto falta ("NÍVEL 3 · FALTAM 120 XP PARA O 4"), **4 números grandes com o nome inteiro** (PARTIDAS,
  VITÓRIAS, GOLS, ASSISTÊNCIAS), **uma frase que explica o seu momento** ("Você ganhou 5 de 7 partidas (71%) e fez 11 gols.
  Melhor sequência: 3 vitórias seguidas.") — sem partidas, o convite para jogar — e a **SUA BIO** inteira. O selo diz
  NESTE APARELHO ou CONTA (era LOCAL) e o ID vem com "SEU ID:". As abas com o nome inteiro em qualquer tela (no computador
  ESTATÍSTICAS e CONQUISTAS eram cortadas). As abas ESTATÍSTICAS, CONQUISTAS e PARTIDAS continuam como na v77.
* **A tampinha maior só no lobby e no perfil**: no lobby, 1,4× (um pouco mais para baixo, com o letreiro inteiro em cima);
  no perfil, até 1,4× também (o raio vai a 220; era 150). **Na partida nada muda**: o tamanho da tampinha em campo é o da
  física, igual para todo mundo.

Arquivos: `tools/v78/bots.js` (os bots), `tools/v78/perfil.js` (o perfil e a tampinha do lobby), `app/public/game/v78.css`
(o visual do perfil) e `tests/v78_test.py`. Os testes antigos que liam os textos de antes (`perfil_test.py`: o selo LOCAL;
`v77_test.py`: o XP em números) passaram a aceitar os novos.

**As medições dos bots (partidas simuladas, não pessoas).** Um "jogador simples" programado faz o seu papel (vai na bola,
leva para o gol e chuta quando alinha, sem passar) contra os bots, partidas até 3 gols (ou 5 min) no Chromium de teste:

| Tamanho | Nível | Partidas | O jogador simples venceu | Duração (mediana) | Gols contra por partida | A cabeça antiga (12 partidas): venceu · duração · gols contra |
|---|---|---|---|---|---|---|
| 1v1 | Fácil | 120 | 64% | 58 s | 0,14 | 92% · 29 s · 0,50 |
| 1v1 | Difícil | 120 | 45% | 52 s | 0,18 | 83% · 1 min 14 s · 0,58 |
| 2v2 | Fácil | 60 | 80% | 1 min 09 s | 0,37 | 75% · 2 min 04 s · 0,92 |
| 2v2 | Difícil | 60 | 58% | 2 min 02 s | 0,33 | 58% · 2 min 13 s · 1,42 |
| 3v3 | Fácil | 24 | 62% | 2 min 09 s | 0,21 | 92% · 1 min 43 s · 0,92 |
| 3v3 | Difícil | 24 | 17% | 2 min 21 s | 0,21 | 50% · 2 min 19 s · 0,75 |
| 4v4 | Fácil | 24 | 71% | 3 min 50 s | 0,29 | 100% · 55 s · 0,75 |
| 4v4 | Difícil | 24 | 46% | 2 min 31 s | 0,21 | 67% · 2 min 49 s · 0,75 |

Como ler: o jogador simples não é gente (não passa, chuta sempre perto do meio do gol e reage do mesmo jeito sempre);
ele serve para comparar os níveis e a cabeça antiga com a nova, não para dizer quanto uma pessoa vai ganhar. O que os
números mostram: os **gols contra caíram para um terço ou menos** em todos os tamanhos; a cabeça antiga quase não segurava
o jogador simples no Fácil (92–100% no 1v1, no 3v3 e no 4v4) e a nova ainda perde para ele na maioria das partidas do
Fácil, mas jogando; no Difícil ele ganha menos (no 2v2, onde o seu companheiro — também Difícil — é metade do time, ganha
mais). **O 4v4 é o mais lento**: com quatro defendendo e o goleiro-linha no gol, o time do jogador simples leva uns 2,5
min (Difícil) e quase 4 min (Fácil) para fazer 3 gols, e 5 a 7 partidas em 24 passaram de 5 min — a cabeça antiga era mais
rápida aí porque tomava gol fácil. Bots contra bots (8 partidas por tamanho e nível), as partidas acabam em 48 s a 3 min
12 s (mediana). O custo dos bots novos no 4v4, por passo da física: 0,08 ms (os antigos: 0,21 ms) no Chromium de teste.
Os pesos de ajuste ficam em `B78.cfg` e `B78_NIVEL` (`tools/v78/bots.js`).

## v77 · o lobby, o perfil e as telas das imagens, e o mapa principal novo

O pedido: "quero trocar o mapa principal por esse novo; quero o perfil assim, porém a tampinha quero reta igual está no
lobby; e o lobby quero assim, o fundo igual esse da imagem também; e quero todo o jogo parecido com essas imagens do perfil
e do lobby, só não deixe essas tampinhas ali embaixo do lobby — tem que entrar nas skins para trocar de roupa; e você viu
que no perfil só tem o perfil: quero tudo assim, ranking do ranking, porque quando clica num botão tem vários botões;
quero tudo em ordem" (com três imagens: a quadra vista de cima, o lobby e o perfil).

* **O mapa principal (a ARENA) é a quadra da imagem**: o verde com as **áreas amarelas** (a grande área e a meia-lua) e o
  **círculo azul** com o aro amarelo no meio, as linhas brancas, a tinta gasta com o cimento aparecendo nas rachaduras, o
  **piso de placas** em volta, a sombra salpicada das árvores em cima, o **muro de cima** com os grafites da imagem (o
  RACHA com a coroa, os bancos cobertos, os jogadores pintados com a bandeira do Brasil e o BRASIL), as **escadas e os
  muros pintados** atrás dos gols, o **alambrado** embaixo com as lixeiras e, em volta, as **casas** com as caixas-d'água
  azuis. Com **Mostrar Torcedores**, a galera fica nas escadas, na cor de cada time. Na Tela parada, onde a tela passa do
  mapa, entram as casas e as árvores de fora (uma imagem só, feita na primeira vez que precisa).
* **O tamanho e os gols são os do jogo**: a imagem é de uma quadra bem mais comprida que as do jogo, então ela não foi
  esticada — o desenho segue as medidas de cada tamanho (de 1v1 a 4v4): o verde vai de uma linha à outra, as áreas e o
  círculo seguem as marcas de cada tamanho, o piso vai até onde o jogador para, o muro e o alambrado ficam na margem de
  cima e de baixo do mapa e as escadas atrás dos gols. As medidas, as paredes, as traves, as redes e o fator da bola são
  os mesmos da Arena de antes e da v71.1 (o teste confere de 1v1 a 4v4 e o mesmo chute dá o mesmo caminho); o bloco de
  física é o mesmo, byte a byte. O **Estádio** continua o da v74/v76.
* **Ultra leve**: as mesmas cores, lisas (sem textura, sem cenário). A prévia da ARENA no JOGAR já é a quadra nova.
* **O LOBBY como na imagem**: o fundo é a própria imagem enviada, **limpa** — sem os botões, o letreiro e a tampinha que
  vinham desenhados nela (o que estava embaixo deles foi completado; os braços do Cristo, que ficavam embaixo das moedas,
  foram redesenhados). Em cima da tampinha, o **letreiro da imagem** (RACHA com a coroa e a faixa FUTEBOL DE RUA). Os
  botões dos lados com os **desenhos da imagem** (LOJA, TAMPINHA, CLUBE, TREINO à esquerda; SALAS, AMIGOS, RANKING e o
  novo **EVENTOS**, que abre a Copa dos Amigos, à direita). Em cima: você (a tampinha com o nível, o nome e o XP em
  números), a LIGA com a barra do elo, as moedas e as gemas com o +, o chat, os **AMIGOS** e os ajustes. Embaixo: os
  DESAFIOS com o prêmio na pilha de moedas, o MODO escuro (o tamanho grande, **2 VS 2**, e o modo e o mapa embaixo) e o
  JOGAR. A **tampinha do meio** fica reta na quadra, com a sombra no chão (sem a bola do lado). **Não tem a fileira de
  tampinhas** que a imagem mostrava embaixo: trocar de tampinha é na TAMPINHA (o editor), como antes.
* **Cada botão abre só a sua tela**: sumiram as abas que levavam para outras telas (o PERFIL tinha PERFIL · RANKING ·
  REPLAYS; a COMUNIDADE tinha INÍCIO · SALAS · CLUBE · COPA · CHAT). O RANKING abre só o ranking, o CLUBE só o clube, as
  SALAS só as salas, o EVENTOS só a copa, o AMIGOS só os amigos e o chat; os REPLAYS ficam dentro do PERFIL (aba PARTIDAS).
  O título de cada tela é a palavra do botão (TREINO, não TREINAMENTO). Em cima de **todas**, a mesma barra do perfil da
  imagem: o VOLTAR, o título numa pincelada escura com o desenho do botão, as moedas e as gemas com o +, o chat, os amigos e
  os ajustes. Atrás das telas, a quadra do lobby escurecida (não mais um fundo liso).
* **O PERFIL como na imagem**: à esquerda, a sua tampinha **reta** (como no lobby), grande, na quadra — tocar nela abre o
  editor; à direita, o cartão: o banner com o morro e o letreiro, a tampinha no aro dourado com o **nível no hexágono**, o
  nome (com o lápis) e a bandeira, o **ID com o botão de copiar**, o XP e as abas **VISÃO GERAL · ESTATÍSTICAS ·
  CONQUISTAS · PARTIDAS**. A VISÃO GERAL tem o tempo jogado em campo, a melhor sequência, a bio e os 5 números (gols,
  assistências, vitórias, partidas e aproveitamento); ESTATÍSTICAS, as da v70 (onde jogou × modo); CONQUISTAS, a liga, o
  top semanal, os treinos 3 ★, a próxima meta, os 7 títulos com a conta de cada um, os 2 do seu cartão e os recordes dos
  treinos; PARTIDAS, os recordes das partidas, as últimas 30 e o botão dos REPLAYS. Os números são os de verdade. A imagem
  mostrava um "MVP" (melhor da partida): o jogo não elege craque da partida, então no lugar dele fica a **melhor
  sequência** de vitórias (inventar esse número seria mentir para o jogador).
* **No celular deitado** tudo cabe sem rolar, como antes (o lobby, o perfil em cada aba e as telas). No computador com a
  janela em pé, o perfil vira uma coluna que rola.
* **As peças das imagens**: `tools/v77/pecas.py` faz o fundo limpo, o letreiro, os ícones (24 desenhos, numa folha só), o
  banner do perfil; `tools/v77/quadra_kit.py` faz o kit da quadra (os pedaços do muro, as escadas, as casas, as lixeiras, o
  grão da tinta e 7 pedaços gastos). Para completar o que ficava embaixo dos botões e para emendar o grão da tinta foi
  usado o **LaMa** (o modelo de "apagar e completar" do OpenCV Zoo, licença Apache 2.0) só na hora de gerar as imagens: ele
  **não vai para o jogo** e os scripts funcionam sem ele (mantêm as imagens que já estão prontas). O build embute tudo no
  jogo (o arquivo continua funcionando sozinho, sem internet); o racha.html ficou com 4,0 MB (eram 3,1).
* **Reservas**: se as peças da v77 não abrirem no aparelho, cada parte volta a ser a de antes (o fundo da v75, o RACHA
  escrito, os desenhos da v71, a Arena da v61).

Arquivos: `tools/v77/pecas.js` (as peças embutidas, os ícones, a moeda e a gema), `tools/v77/lobby.js` (o lobby),
`tools/v77/telas.js` (as telas e o perfil), `tools/v77/quadra.js` (o mapa), `app/public/game/v77.css` (o visual),
`tools/v77/pecas.py` e `quadra_kit.py` (as peças), as três imagens enviadas (`lobby_original.png`, `perfil_original.png`,
`quadra_original.png`), as peças prontas (`fundo_lobby.*`, `letreiro.*`, `icones.*`, `banner_perfil.webp`, `quadra_kit.*`,
`tx_det.png`) e `tests/v77_test.py`. Os testes antigos que conferiam o desenho de antes (o JOGAR de 400 px, as abas do
perfil da v71, os títulos e os desenhos da v71, o fundo da v75 e a Arena da v61) agora conferem o da v77; o fundo da v75 e
a Arena da v61 continuam conferidos como reserva (os testes desligam a camada da v77 com `RUA_FUNDO77_DESLIGA` e
`RUA_QUADRA77_DESLIGA`).

## v76 · a grama de fora escura, a calçada de Copacabana e as tampinhas animadas

O pedido: "o lado de fora do campo, deixe todo nesta grama mais verde escuro, e a calçada mude, bote uma mais brasileira,
e crie essas skins animadas" (com a folha da coleção: CRIA, CRISTO, BRASIL, PITBULL, DEBOCHE, FÉ, DRAGÃO e GALÁXIA).

* **A grama de fora das linhas**, no Estádio: entre as linhas e o alambrado (atrás dos gols, em cima e embaixo) a grama
  agora é toda do verde escuro; as faixas claras do corte ficam só dentro do campo. Também no Ultra leve.
* **A calçada de Copacabana**: no lugar do bloquinho marrom e azul, a calçada em volta do alambrado é a de pedra
  portuguesa com as **ondas pretas e brancas** do calçadão, correndo junto do alambrado, com as pedrinhas e a luz do campo
  sumindo para fora. O meio-fio laranja e cinza, as pedras atrás dos gols, os bancos e a galera continuam. No Ultra leve,
  as mesmas ondas, lisas.
* **As 8 tampinhas animadas** (a coleção da folha), cada uma mexendo como na folha:
  CRIA — as luzes das janelas da favela piscando e o sol pulsando atrás do menino ·
  CRISTO — o ciclo do dia e da noite (o pôr do sol, a noite com estrelas, a lua, as luzes das casas e a estátua acesa, o
  amanhecer) · BRASIL — a bandeira ondulando (desenhada aqui, com **ORDEM E PROGRESSO** escrito certo; a da folha veio
  com o lema embaralhado) · PITBULL — os olhos acesos, com um clarão de raiva de vez em quando, e o brilho correndo pela
  corrente · DEBOCHE — a carinha muda de cara: deboche com a língua balançando, piscadinha, a língua de lado e de óculos
  escuros (desenhada aqui) · FÉ — os raios girando atrás da cruz e a cruz brilhando · DRAGÃO — as chamas subindo, o
  bafo de fogo e as brasas · GALÁXIA — o disco girando, os planetas passando por trás e pela frente e as estrelas
  piscando (desenhada aqui). As ilustrações de CRIA, CRISTO, PITBULL, FÉ e DRAGÃO são as da folha (o miolo de cada
  tampinha, recortado); o aro e as animações são desenhados no jogo, então ficam nítidos em qualquer tamanho.
* **O aro aceso**: 4 bordas novas que também mexem — **Fogo vivo** (chamas em volta: CRIA, FÉ e DRAGÃO), **Elétrica**
  (raios estalando: CRISTO), **Brilhos** (a luz correndo e as estrelinhas: BRASIL e GALÁXIA) e **Pulso neon** (o neon
  respirando: PITBULL e DEBOCHE). Cada borda usa as duas cores da borda (os dentes e a luz), então combina com qualquer
  tampinha.
* **Onde ficam**: TAMPINHA › MODELOS PRONTOS começa pelas 8 da coleção, com o selo ANIMADA (os cartões mexem); as caras
  estão no fim da faixa do ÍCONE e as bordas no fim da faixa da BORDA, também com o selo. São peças como as outras:
  **cada cara é lendária (100 gemas) e cada borda acesa é épica (40 gemas)** — uma tampinha da coleção sai por 140 gemas,
  e quem já tem a borda paga só a cara. Os dois preços ficam juntos no começo de `tools/v76/skins.js` (`SK76_PRECO`).
* **Onde mexem**: na partida, no treino, no replay, no lobby, no perfil e no editor. Nas listas e miniaturas ficam
  paradas (um quadro de cada). Com **Reduzir animações** ou no **Ultra leve**, ficam paradas em todo lugar. No online
  viajam no código de sempre (T.xxxx): quem tem a v76 vê mexendo; uma versão antiga mostra uma tampinha comum.
* **Igualdade**: só aparência. O tamanho, o aro do time e a física são os de todo mundo; o brilho e as chamas ficam
  rentes aos dentes (nada passa de 1,2 vez o raio da tampinha, por baixo do aro do time). Os bots não usam as animadas.
* Os códigos das tampinhas que já existiam não mudam: as caras e as bordas novas entram no fim das listas.

Arquivos: `tools/v76/skins.js` (as tampinhas), `tools/v76/skins_kit.py` (recorta o kit), `tools/v76/skins_original.png`
(a folha enviada), `tools/v76/skins_kit.png`, `.webp` e `.json`, `tools/v74/campo.js` (a grama e a calçada, no próprio
desenho do Estádio) e `tests/v76_test.py`; o `tools/aplicar_rua.py` junta o `skins.js` com o kit embutido.

## v75 · a imagem no fundo do lobby

O pedido: "bote essa imagem no lobby" (a quadra da favela com o Rio de Janeiro atrás: o Cristo no Corcovado, o Pão de
Açúcar, a praia e o morro colorido, no fim de tarde).

* **O fundo do lobby agora é a imagem**, inteira e do jeito que veio (1844 × 853 px), embutida no jogo — o arquivo continua
  funcionando sozinho, sem internet. Os botões, o letreiro RACHA, a tampinha no meio com a luz no chão e a bola ficam
  iguais, por cima dela, com o mesmo véu escuro da v71 nas bordas e embaixo (para os botões continuarem fáceis de ler).
* **O encaixe** foi pensado para a tela do jogo: o alto da imagem fica logo abaixo da fileira de cima (moedas, gemas,
  chat e ajustes), senão o **Cristo** — que fica no alto da imagem — ficaria escondido atrás das moedas; e o meio da
  quadra da imagem fica embaixo da tampinha (ela aparece em pé na quadra, entre a linha do fundo e o círculo do meio com a
  bandeira). Em tela mais estreita (16:9, 4:3) a imagem é cortada dos lados, sempre em volta da quadra; em tela mais larga
  que ela, o que sobra nas beiradas (atrás das colunas de botões e da fileira de cima) é a própria imagem espelhada dos
  lados e o céu dela em cima.
* Enquanto a imagem abre (um instante, na primeira vez), o fundo é um degradê nas cores dela; se ela não abrir no aparelho
  (navegador muito antigo, sem WebP), volta o cenário desenhado de antes.
* Nada mais muda: o jogo, a física, o Estádio da v74 e as outras telas são os mesmos. O arquivo do jogo ficou com 2,9 MB
  (a imagem é uns 430 KB em WebP).

Arquivos: `tools/v75/lobby.js` (o desenho), `tools/v75/lobby_fundo.py` (faz o `.webp`), `tools/v75/lobby_fundo_original.png`
(a imagem enviada) e `lobby_fundo.webp`, e `tests/v75_test.py`; o `tools/aplicar_rua.py` junta o `lobby.js` com a imagem
embutida. Para voltar ao cenário desenhado: tire a linha `V70JS += '\n' + _lobby75()` do `aplicar_rua.py` e rode o build.

## v74 · o Estádio virou o society da imagem

O pedido: "troque o campo de grama por esse; ajuste o tamanho e os gols" (com a imagem de um society à noite, no meio de
um estacionamento e das casas do morro).

* **O que mudou**: o mapa **ESTÁDIO** (o de grama, desde a v70.2) agora é esse society: a grama listrada (13 faixas entre
  as linhas de fundo, a do meio clara, nas cores medidas na imagem), as linhas de cal, os fachos dos refletores saindo das
  quatro quinas do alambrado e do meio-campo (como na imagem), o alambrado em volta, o calçamento de bloquinho com as
  faixas marrons e azuis, o meio-fio laranja e cinza, o estacionamento com as vagas de lado, os batentes amarelos e os
  carros, as três pedras atrás de cada gol, o paraciclo, os postes de luz, as árvores dos cantos e, na Tela parada, as
  casas do morro dos lados. Os bancos de reserva ficam na cor de cada time (na imagem, um vermelho e um azul; no jogo, o
  Time Preto e o Time Branco). Com Mostrar Torcedores, a galera fica em pé no calçamento, encostada no alambrado.
* **O tamanho e os gols são os do jogo**: a imagem é de um campo mais comprido (1,78 : 1) do que os do jogo (do 1v1 ao
  4v4, de 1,4 : 1 a 1,2 : 1). Em vez de esticar a imagem (as linhas e os gols não bateriam com a física) ou de mudar o
  campo (a física e o equilíbrio mudariam), o campo é desenhado na medida de cada tamanho: as linhas são as paredes da
  bola, a grama vai até onde o jogador para, o alambrado fica bem ali, e os gols são os do jogo (a boca, a profundidade,
  as traves e a rede de cada tamanho; a armação branca e a rede na cor do time, como na Arena), atrás da linha de fundo.
  As medidas, as paredes, as traves, as redes e o fator da bola continuam iguais aos da Arena — conferido em 1v1 a 4v4 —,
  e o mesmo chute dá o mesmo caminho nos dois mapas e na v71.1.
* **Da imagem vêm só as peças**: os 6 carros, as 2 árvores e as 2 faixas de casas, recortados e sem o fundo por
  `tools/v74/campo_kit.py` (o kit `tools/v74/campo_noite_kit.webp`, 62 KB), que o build embute no jogo — o arquivo
  continua funcionando sozinho, sem internet. O resto é desenhado no jogo, então acompanha qualquer tamanho e zoom. Sem o
  kit (se a imagem não abrir no aparelho), o campo sai igual, com os carros lisos.
* **Tela parada**: a margem do Estádio é a da Arena (para a física não mudar nem uma vírgula), então dentro do mapa cabem
  o alambrado, o calçamento e um pedaço do estacionamento. Quando a tela mostra além do mapa (a Tela parada e o
  enquadramento do campo inteiro), dos lados entram o resto do estacionamento e as casas do morro, numa imagem à parte (por
  baixo do campo, sumindo no escuro da noite). Seguindo o jogador a câmera fica dentro do mapa e essa imagem nem é
  desenhada.
* **Ultra leve**: as cores lisas (as faixas, as linhas, o calçamento, o meio-fio e o alambrado), sem o kit e sem a imagem
  de fora. A prévia do ESTÁDIO no JOGAR é o desenho novo, pequeno.
* A **Arena não muda** (a imagem do cenário dela sai igual à da v71.1, pixel a pixel) e o bloco de física é o mesmo, byte a
  byte.

Arquivos: `tools/v74/campo.js` (o desenho), `tools/v74/campo_kit.py` (o kit), `tools/v74/campo_noite_original.png` (a
imagem enviada, guardada como referência), `tools/v74/campo_noite_kit.png`, `.webp` e `.json`, e `tests/v74_test.py`; o
`tools/aplicar_rua.py` junta o `campo.js` com o kit embutido. Para voltar ao gramado da v70.2: tire a linha
`V70JS += '\n' + _campo74()` do `aplicar_rua.py` e rode o build.

## v73 · o sensor mais transparente (e o TESTE saiu)

O pedido: "remova esse teste; agora o sensor preto ao redor dos players deve ser mais transparente, para ficar com um
visual mais bonito".

* **O sensor** é o halo de spray em volta de cada jogador (v61), na cor do time — no Time Preto, um anel quase preto
  com contorno escuro e sombra; a borda de fora dele marca o **alcance do chute**. Agora o halo sai com **45%** da força
  (o mesmo desenho e o mesmo tamanho, pixel a pixel: a borda de fora continua no alcance do chute), a ponta que mostra
  para onde cada um está virado com **70%** e o contorno de cada time nas partidas e no replay (cheio = Time Preto,
  tracejado = Time Branco; v70) com **40%** — ele continua separando os times sem pesar. A **carga do chute armado** (o
  tracejado que gira quando você segura o botão) e a piscada do chute que sai **continuam fortes**: são o aviso do botão.
  Vale em todo lugar onde o halo aparece (partida, treino, replay e a prévia dos times em SKINS). Só desenho: física,
  colisão, alcance e força do chute não mudam. Os três números ficam juntos no começo de `tools/v73/sensor.js`
  (`SENSOR73`), para ajustar de uma vez se precisar.
* **O TESTE saiu**, a pedido: o cartão do TREINAMENTO, os modos IGUAL e CLÁSSICO, os botões CHUTAR/CHUTE PODEROSO/
  CORRIDA, o `v72.css` e os dois ganchos dele no bloco de física. O bloco de física voltou a ser **o mesmo da v71.1, byte
  a byte** (o build volta a mostrar 8 trocas), e a escolha IGUAL/CLÁSSICO que ficava guardada some do aparelho. Fora o
  sensor, o jogo gerado é o da v71.1 (a diferença entre os dois arquivos é só o `sensor.js`). Quem quiser o TESTE de
  volta tem a v72 inteira no pacote `RACHA_v72.zip` (na v72 ficou medido que o modo Igual do jogo de referência é a
  física de sempre da RACHA).
* Fica da v72 o ajuste no teste da v71: a conferência "quem equipar a Clássica amarela de novo continua com ela" abre o
  jogo num navegador novo com o que ficou gravado, em vez de recarregar a página (o reload num Chromium recém-aberto às
  vezes vinha antes de o localStorage estar no disco, e a conferência falhava à toa — não era defeito do jogo).

Arquivos: `tools/v73/sensor.js` e `tests/v73_test.py`; saíram `tools/v72/`, `app/public/game/v72.css` e
`tests/v72_test.py`.

## v71.1 · todas as telas no estilo do lobby novo

O pedido: "agora muda o interior dos botões, quando clica; o perfil, tudo, os ajustes, quando pausa, todos mesmo". Tudo
o que abre do lobby e da partida ficou com a mesma cara do lobby da v71 — preto-carvão, contorno grosso, o "degrau"
embaixo dos botões e o amarelo no que se toca primeiro (as cores por papel da v70 continuam: amarelo = ação principal e
escolha, verde = confirmar, vermelho = sair/apagar, azul = ir para outra tela).

* **O azul-marinho acabou.** As salas, a comunidade, o clube, a copa e o editor da tampinha eram azul-marinho; agora são
  do mesmo carvão do lobby. A troca é feita por um script no build (`tools/v71/tema.py` gera `v71-tema.css`), que acha
  cada cor da família do marinho nas folhas de estilo e põe um cinza-carvão de luz parecida — então não sobra nenhuma
  (o teste varre 16 telas e janelas). A sala continua em cima da favela, com as colunas do Time Preto e do Time Branco.
* **Cabeçalho e abas de jogo** em todas as telas: o VOLTAR quadrado de contorno grosso, o título com contorno, a carteira
  em pílulas e as abas como botões grossos (a escolhida, amarela).
* **PERFIL em partes também no computador**: CARTÃO · ESTATÍSTICAS · RECORDES · PARTIDAS, com a tampinha ao lado (era uma
  página de 6 telas de altura no computador; cada parte agora tem no máximo 1,6). Os números do cartão viraram botões
  escuros (eram adesivos amarelos e creme), as últimas partidas têm a faixa da cor do resultado, e a tampinha padrão
  se chama **PADRÃO** (no perfil e no editor aparecia "Personalizada").
* **LOJA**: as peças do dia em vitrine, com a faixa da cor da raridade (comum, raro, épico, lendário). **TREINO**: os
  exercícios como botões grandes (o escolhido com o aro amarelo). **RANKING**: o pódio em ouro, prata e bronze e a sua
  linha amarela. **COPA**: um cartão com o troféu (era uma faixa solta). **REPLAYS**: o vazio com a bola.
  **DESAFIOS**: cada missão num cartão, com a barra amarela e o prêmio em ficha. O lápis de editar o nome e a bio virou
  amarelo (era azul).
* **AJUSTES**: as seis abas com desenho (som, olho, controle, câmera, acessibilidade, conta), as chaves liga/desliga e os
  deslizantes grossos, o ✕ vermelho e o PRONTO verde. No celular deitado as abas ficam só com o nome, para caberem as
  seis numa linha com o PRONTO e o ✕.
* **PAUSA**: CONTINUAR (amarelo), EDITAR CONTROLES, AJUSTES e SAIR (vermelho), cada um com o desenho; o desenho fica
  também quando o SAIR vira DESISTIR, VER A SALA ou TOQUE DE NOVO. **FIM DA PARTIDA**: o VITÓRIA! com contorno, o placar
  em preto × branco e o JOGAR DE NOVO amarelo. **COMO JOGA**, o editor dos controles, o chat da sala, a primeira vez e
  as janelas de prêmio no mesmo estilo.
* **Na sala**, as escolhas de baixo (TIMES · CAMPO · MODO · TEMPO · BOTS) mostram o nome inteiro (em 1280 × 720 cortava
  "Estádio", "Futebol" e "Ativado").
* **No celular deitado** tudo continua cabendo sem rolar (como na v70.1); o visual novo não deixou nada mais miúdo:
  nenhuma tela encolhe abaixo de 0,72 para caber (a loja, a que mais encolhe, ficou em 0,74; na v71 era 0,75).

Arquivos: `tools/v71/telas.js` (o perfil em partes, o nome PADRÃO, os desenhos das abas dos Ajustes e da pausa, a cor da
raridade na loja), `tools/v71/tema.py` → `app/public/game/v71-tema.css` (gerado; não editar) e a seção 4 do
`app/public/game/v71.css`. A física não mudou (o build confere o hash).

## v71 · preto × branco e o lobby novo

**Os times são o TIME PRETO e o TIME BRANCO em todo lugar** (eram o Time Vermelho e a Equipe Azul): partida contra os
bots, liga, treino, sala neste aparelho, sala online, copa e replay — o halo, o contorno, o placar, a tela do fim, a
saída de bola, a rede, a torcida, as colunas da sala, o menu do árbitro e as mensagens do servidor.

* **A tampinha padrão é metade preta e metade branca** (era a amarela). No lobby, no perfil e no editor ela aparece
  assim; **na partida ela vira a do seu time: toda preta no Time Preto, toda branca no Time Branco** — a sua, a dos bots
  (que jogam com a padrão) e a de quem está na sala com ela, online ou neste aparelho (o cartão da sala também). Quem usa
  **outra tampinha** (personalizada ou modelo pronto) **continua com ela**: o time aparece no contorno e no halo.
* A amarela virou um modelo pronto como os outros (a **Clássica**): escolhida, fica amarela. Quem estava com ela por ser
  a padrão (o "equipar" da primeira vez gravava a padrão) passa para a nova **uma vez**; depois vale a escolha.
* O branco em cima do branco foi cuidado: o número do placar é escuro em cima do branco e claro em cima do preto, a
  barreira da saída de bola tem contorno, e as bolinhas dos times no JOGAR têm borda.
* Cosmético continua sem vantagem: as duas tampinhas do time têm o mesmo tamanho e a mesma física de todas.

**O lobby novo** (o pedido: "não pareça de IA, bem de game"). Era uma lista de 12 cartões iguais (ícone, título, legenda
e setinha), três ícones soltos em cima, o logo, o "Pronto, fulano!" e o JOGAR com duas linhas de letra miúda — tudo com o
mesmo peso. Agora, deitado:

* **Em cima, à esquerda:** você (a sua tampinha com o **nível num selo**, o nome e a barra de XP) e a sua **LIGA** (a
  insígnia e o elo; abre o JOGAR na aba da liga). **À direita:** moedas e gemas com o **+** (abrem a loja), o chat (com o
  número de mensagens) e os ajustes.
* **Dos lados, botões quadrados de jogo** — um desenho grande e uma palavra só: **LOJA** (a barraca), **TAMPINHA** (a sua,
  com o pincel), **CLUBE** e **TREINO** à esquerda; **SALAS**, **AMIGOS** e **RANKING** à direita.
* **No meio:** a sua tampinha na quadra, com o RACHA em cima. **Embaixo:** os **DESAFIOS** do dia (a barra e o prêmio;
  pisca "PEGAR PRÊMIO!" quando tem) e, à direita, o **MODO** (o que vai ser jogado: modo, tamanho e campo — toque para
  trocar) colado no **JOGAR** grande, a única coisa amarela forte da tela.
* **Saíram da tela** (o caminho continua): o PASSE (em breve, sem temporada), o cartão COMUNIDADE (o AMIGOS abre ela), o
  CHAT grande (fica o ícone em cima) e o ícone repetido das SALAS no topo. Nada disso entra no Tab.
* As cores: preto-carvão com contorno grosso e o "degrau" embaixo (o mesmo preto × branco dos times), o amarelo só no que
  é para tocar primeiro. Em pé (no computador com a janela estreita) os botões viram uma grade embaixo do JOGAR.

**O JOGAR (a folha de escolher a partida)**: abas grossas (LIGA · CASUAL · ONLINE); o MODO com o desenho de cada um
(a bola; a bola com a curva) e o COMO JOGA do lado; TIME, MAPA e BOTS em botões de jogo (o escolhido fica amarelo); a
nota curta e o JOGAR amarelo embaixo. Saiu o cabeçalho repetido da CASUAL e as descrições longas: **cabe sem rolar** em
1280×720 e no celular deitado (antes, em 1280×720, o JOGAR ficava embaixo da dobra).

São os **mesmos botões** (os mesmos ids, os mesmos cliques e destinos): só mudaram de lugar e de cara. O código novo mora
em `tools/v71/` (`times.py`/`times.js` e `lobby.js`) e o visual em `app/public/game/v71.css`. A física não mudou (o build
confere o hash; a v71 não faz troca nenhuma no bloco de física). As telas de dentro (salas, comunidade, clube, editor,
loja) continuam com o visual da v70.

## v70.2 · enxuto: 2 modos, 2 mapas, a bola sem efeitos

* **Modos: só FUTEBOL e COM CURVA.** Vôlei, Americano, Basquete e Ginga saíram de todo lugar onde se escolhe (JOGAR ›
  CASUAL, CRIAR SALA, as setas da sala, o filtro do perfil, as missões) e das telas que só serviam para eles (o "Layout
  da GINGA" do editor, as teclas e a ajuda da FINTA e do DRIBLE). O que estava salvo com um deles (o último modo da
  casual, a sala, um filtro, uma missão) vira futebol — ou Com Curva, na missão de modo. O servidor das salas também só
  aceita os dois.
* **Mapas: a ARENA e o ESTÁDIO.** O ESTÁDIO é novo: gramado com as listras do corte e as linhas de cal, placas em volta,
  a arquibancada com a torcida dividida (a cor do seu time de um lado, a do adversário do outro), a galera na grade com o
  bandeirão, o banco de reservas e as torres de luz. Tem **a mesma física da Arena** — as mesmas medidas, paredes,
  traves, redes e o mesmo rolar da bola (o teste confere de 1v1 a 4v4 e repete o mesmo chute nos dois mapas: o caminho
  da bola é idêntico). Favela, Escadão e Viaduto saíram do JOGAR, do treino (setas e tecla C), do CRIAR SALA e da liga;
  o salvo com eles vira a Arena.
* **A bola sem efeitos**: sem o rastro neon (no jogo e no replay), sem o respingo de tinta e o estalo do chute, e a cor
  da bola (Neon, Ouro, Cósmica) saiu de EFEITOS — a bola é sempre a clássica. A chave Efeitos do Jogo continua para o
  confete do gol, o nome da jogada e o brilho do chute no halo.
* **O Indicador de Direção começa desligado.** Quem já jogava com ele ligado tem ele desligado uma vez; depois vale o
  que escolher em Ajustes › Visual (ou no EDITAR HUD).
* **Nada foi apagado**: os modos e mapas que saíram continuam no código, só não aparecem (a lista do que aparece fica em
  `V702`, no `tools/v70/enxuto.js`, e em `MODOS_SALA`/`MAPAS_SALA` no `server/turma.js`). A física não mudou: o build
  confere o bloco de física pelo hash e esta versão não faz nenhuma troca dentro dele.

## v70.1 · o celular deitado (o ajuste depois do teste no iPhone)

* **Só na horizontal.** Com o celular em pé aparece a tela GIRE O CELULAR por cima de tudo (no tablet, GIRE A TELA); a partida
  contra os bots e o treino pausam sozinhos e, deitando, a pausa continua aberta com o CONTINUAR. Na partida online o jogo
  segue (o anfitrião roda a partida de todos) e a tela avisa. Num computador com a janela em pé nada disso aparece.
* **Tudo cabe, sem arrastar para baixo.** No celular deitado as telas voltaram à escala do lobby, como na v69 (os pisos
  de 44 px e 12 px da Etapa 3 empurravam o conteúdo para baixo e cortavam botões). O que ainda passaria da altura encolhe
  um pouco junto em vez de rolar. Para não ficar miúdo: o perfil virou sub-abas (CARTÃO · ESTATÍSTICAS · RECORDES ·
  PARTIDAS, com a tampinha ao lado), o ranking tem três colunas, a criação de sala duas, a comunidade os quatro cartões
  numa fileira e os modelos prontos uma faixa que arrasta de lado, como as outras faixas do editor.
* **Os Ajustes no celular**: o título, as abas, o PRONTO e o ✕ numa linha e as opções em duas colunas — cada aba
  inteira na tela. No aparelho só de toque o grupo do teclado físico sai (fica uma nota). Na partida, o editor dos
  controles e o COMO JOGA também cabem inteiros (encolhem junto, como o editor da v69).
* **O menu como antes, com as opções novas**: o JOGAR inteiro e o ⇄ TROCAR pequeno em cima do canto dele (como na v69),
  com TAMPINHA, LIGA, PASSE, DESAFIOS e o resto da v70. O TROCAR não cobre mais o JOGAR. (Na v71 o lobby foi redesenhado:
  o TROCAR virou o cartão do MODO colado no JOGAR.)
* Medido no Chromium de teste em 800×336 (mais ou menos o app do Claude no iPhone deitado, pelas capturas), 844×390, 740×360 e 667×375:
  nenhuma tela, janela ou aba dos Ajustes rola e nenhum botão fica fora da tela, no lobby e na partida
  (`tests/celular_test.py`).

## O que mudou na v70

A física (movimento, colisão, força e efeito do chute, bots) **não foi reescrita**. O build confere o bloco de física
contra o original e só aceitava 8 trocas, todas de regra ou de texto: o touchdown com o portador certo, os dados e o título
do replay (autor, gol contra, modo, pontos), o rótulo da câmera no replay, a ginga liberada nas salas e a curva automática
invisível do convidado (substituída pelo botão CURVA de verdade).

**1 · Regras e resultados.** Uma regra só para autor, gol contra e assistência (a assistência não vale depois de
interceptação do adversário), o touchdown só com quem conduz a bola na travessia, o basquete com 2 e 3 pontos e a origem
do arremesso, a meta e a unidade de cada modo (gols, pontos, touchdowns; ginga a 5, basquete a 12) — e a mesma
classificação no placar, na faixa do GOL, no replay, nas estatísticas, no prêmio e no evento da plataforma.

**2 · Câmeras.** Uma câmera só (Seguir jogador, À frente, Seguir bola, Transmissão, Tela parada) com enquadramentos
(Perto, Equilibrado, Campo inteiro, Personalizado) ajustados ao tamanho do time, a sua tampinha sempre inteira na área
livre da tela (fora do placar e dos controles), zoom automático sem vaivém, setinhas de quem está fora da tela longe dos
botões e a câmera do espectador.

**3 · Interface e HUD.** As telas e janelas com escala própria: alvos de toque com 44 px de verdade e texto com pelo
menos 12 px, medidos em 1440×900, 1280×720 e na janela em pé do computador (390×844) — no celular deitado a v70.1 voltou
à escala da v69 para tudo caber (acima); o HUD (placar, aviso, pausa) cresce em tela pequena; Ajustes em
abas (Áudio, Visual, Controles, Câmera, Acessibilidade, Conta) com Tamanho da interface, teclas configuráveis e o
"Suavizar movimento" (era "Estabilização de Lag"); o editor dos controles da tela com moldes que não encostam.

**4 · Perfil, inventário, economia, tutorial e dificuldade.** Compra atômica (saldo e peça na mesma gravação: falhou,
nada é cobrado), a tampinha da conta não volta a ser cobrada, zerar com a lista do que apaga e do que fica,
estatísticas por contexto e por modo, missões do dia com série e bônus, limites diários de moedas (15 gols no treino
livre), troca de gemas com DESFAZER, bots Fácil/Difícil/Aleatório (a liga pelo elo), o tutorial PRIMEIROS TOQUES na
primeira vez e o COMO JOGA de cada modo, exportar/importar o progresso e o aviso quando a gravação falha.

**5 · Clube, social e online.** O servidor da turma (`server/`): salas públicas e privadas com árbitro, JOGAR AGORA,
reconexão (o lugar fica guardado 90 s), Chat do Brasil com filtro e denúncia, clubes da turma, Copa dos Amigos e duelos;
o resultado online é conferido pelo servidor (anfitrião, rodada, placar igual ao dos quadros, placar e tempo possíveis
para o modo) e sai com um selo que a plataforma confere antes de dar XP. COM CURVA e GINGA iguais para quem hospeda e
para quem joga de fora. Um clube só por conta (o pessoal fica neste aparelho). A COMUNIDADE junta salas, amigos, clube,
copa e chat. Os eventos de começo e fim chegam uma vez por partida.

**6 · Polimento e acessibilidade.**

* **Cores por papel**: amarelo = ação principal e seleção (JOGAR, CRIAR SALA, CRIAR CLUBE, ABRIR…); verde = confirmar
  (CRIAR do formulário, SALVAR, CONCLUÍDO, ENTRAR, COMPRAR); vermelho = sair/excluir (era laranja); neutro = voltar,
  cancelar (o VOLTAR do editor era verde); azul = ir para outra tela. O verde ficou mais escuro (branco legível), os
  ícones sobre amarelo ficaram escuros (LOJA, DESAFIOS), o foco do teclado é um anel azul igual em todo o jogo e o
  desabilitado é o mesmo apagado em todas as telas.
* **Nomes iguais entre o botão e o destino**: TAMPINHA abre SUA TAMPINHA (era SKINS), TREINAMENTO abre TREINAMENTO (era
  EXERCÍCIOS), RANKING abre RANKING (era TOP SEMANAL), AMIGOS abre a COMUNIDADE já no cartão AMIGOS; "Modelos prontos"
  (era Pré-projetado); a apresentação não fala mais de VESTIÁRIO; os Ajustes com palavras simples (quadros por segundo,
  qualidade dos gráficos, "quanto a câmera olha à frente"); a plataforma em pt-BR.
* **Uma gema só**: a gema laranja com o losango branco em todo lugar (o pacote antigo desenhava um cristal rosa).
* **Em campo, além da cor**: contorno escuro em cada tampinha — cheio no time da casa, tracejado no visitante — que
  também separa a tampinha dourada do chão amarelo da Arena; a setinha VOCÊ em cima da sua tampinha (e a palavra VOCÊ na
  saída de bola); o mesmo símbolo cheio/tracejado no placar; na sala, o seu cartão diz VOCÊ.
* **Modos alternativos**: vôlei, americano e basquete já têm quadra própria; na partida, a etiqueta do modo na cor dele
  (a mesma do JOGAR) ao lado do CASUAL — é ela que diferencia COM CURVA e GINGA, que usam o campo do futebol.
* **Janelas**: o foco entra na janela, o Tab fica dentro, o fundo não responde (inert), o Escape fecha só a camada de
  cima (janela › menu do editor › tela) e o foco volta para o botão que abriu (também quando a tela se redesenha).
  Corrigido: o COMO JOGA aberto pelo JOGAR aparecia escondido atrás do lobby.
* **Teclado e leitor de tela**: as abas das telas com aria-selected e setas/Home/End; os cartões da sala com papel de
  botão, nome e Enter/Espaço; as escolhas com o estado (aria-pressed, aria-current); a chave da música com nome.
* **Reduzir animações**: começa igual ao do aparelho (prefers-reduced-motion) até a pessoa escolher, e agora vale também
  na partida (sem confete, a faixa do GOL sem o carimbo, o cenário parado) e em todas as transições dos menus.
* **Salvamento** (Etapa 4, conferido de novo): sem armazenamento o jogo avisa que o progresso vale até fechar e oferece
  exportar; falha de gravação aparece; exportar/importar em Ajustes › Conta; compra atômica; os saves antigos migram.
* **Organização**: um documento HTML só (um head, um body); o build não depende mais do caminho da máquina; as fontes
  locais opcionais; `tools/mapa_codigo.py` lista as funções trocadas por versões posteriores (117 na v70.2) e qual delas vale.

---

## Testes

Rodar tudo (≈ 30 min; Python 3 com Playwright e Chromium, Node 18+): `bash tests/roda_tudo.sh`. A coluna "Resultado" é a da
versão em que cada suíte foi escrita ou mexida pela última vez; o resultado da v85 (antes × depois, com o arnês da v84) está
no RELATORIO_DE_TESTES da auditoria.

| Suíte | O que confere | Resultado |
|---|---|---|
| `regras_test.py` | gol contra e autoria, assistência depois de interceptação, touchdown com o portador certo, basquete (2 e 3), metas e unidades dos modos, a mesma classificação em placar/faixa/replay/estatística/prêmio/evento (v70.2: os modos guardados são ligados só na página de teste) | 56/56 |
| `camera_test.py` | câmera protegendo o jogador (3v3/4v4, zoom alto, bola longe), enquadramentos, zoom automático, setinhas | 47/47 |
| `controles_test.py` | moldes dos controles sem encostar, o layout da ginga (guardado), salvar/cancelar/restaurar | 29/29 |
| `interface_test.py` | lobby, telas, Ajustes, pausa e editor em 5 tamanhos de tela: toque ≥ 44 px e texto ≥ 12 px (no celular deitado: cabe sem rolar) | 133/133 |
| `interface4_test.py` | perfil, loja, missões, zerar, inventário, bots, tutorial, COMO JOGA em tamanho real (no celular deitado: cabe sem rolar) | 105/105 |
| `interface5_test.py` | comunidade, clube, sala neste aparelho e demonstração sem servidor em tamanho real (no celular deitado: cabe sem rolar) | 68/68 |
| `celular_test.py` (v70.1) | GIRE O CELULAR em pé (cobre, prende o foco, pausa o treino, volta com o CONTINUAR; nada no computador); 34 telas, janelas e abas do lobby e 4 da partida (pausa, Ajustes, editor, COMO JOGA) em 4 tamanhos de celular deitado sem rolar e sem botão fora da tela; o JOGAR e o MODO colado nele (v77: as medidas da imagem); as abas do perfil (v77: VISÃO GERAL · ESTATÍSTICAS · CONQUISTAS · PARTIDAS); Ajustes compactos; 130% rola em vez de encolher | 195/195 |
| `v71_test.py` (v71 e v71.1) | as cores e os nomes do Time Preto e do Time Branco (v80: do Time A laranja e do Time B roxo, com a Listras) (nenhum "Vermelho"/"Azul" na página); a tampinha padrão (metade) e as do time; o que o quadro da partida desenha em 1v1 e 3v3 (você e o seu time pretos, o adversário branco); o replay; outra tampinha e a Clássica sem mudar; a sala online e a deste aparelho; a tela do fim e a saída de bola; a amarela salva passando para a nova uma vez; o lobby novo (os lugares — v77: com o EVENTOS —, o que saiu do Tab, a LIGA, o selo do nível, o MODO, os 16 destinos); 6 tamanhos sem nada fora da tela nem um por cima do outro, com os toques de 44 px; a folha do JOGAR cabendo sem rolar (v79: só a ranqueada; a LIGA abre as PATENTES e o JOGAR, a BUSCA). v71.1: 16 telas e janelas sem azul-marinho; cabeçalhos (v77: sem abas de outras telas, com as moedas e os 3 ícones) e VOLTAR; o perfil em partes no computador (v77: as abas novas); o nome PADRÃO; a raridade na loja; os desenhos dos Ajustes e da pausa; o fim; a sala sem nome cortado; no celular, nenhuma tela abaixo de 0,72, os Ajustes compactos e a pausa cabendo | 77/77 (v79: sem as 6 da CASUAL) |
| `v73_test.py` (v73) | o TESTE saiu inteiro (cartão, código, estilo, ganchos da física e a escolha guardada; o TREINAMENTO com os 8 cartões de sempre; a tecla do DRIBLE escondida fora da GINGA); o halo com 45% nos dois times, pixel a pixel o mesmo desenho (a borda no alcance do chute), a ponta com 70%, a carga do chute armado igual, a prévia de SKINS igual ao campo; o que o quadro da partida desenha de verdade (3v3, computador e celular): halos com 45%, contornos com 40%, cheio no Preto e tracejado no Branco; com `RACHA_REF`, o bloco de física e o caminho de um roteiro de 1.800 passos iguais aos da v71.1 | 18/18 (16 sem `RACHA_REF`) |
| `v74_test.py` (v74) | o kit embutido e abrindo; o Estádio com o desenho novo em 1v1 a 4v4 (sem erro, com o kit e os 2 gols): as 13 faixas alternando entre as linhas de fundo e escura depois delas, a grama até a beira da área do jogador, o alambrado e o calçamento por fora, os bancos na cor de cada time; a geometria e o chute iguais aos da Arena; a Tela parada com o estacionamento e as casas dos lados (e nada disso seguindo o jogador); Ultra leve; Mostrar Torcedores; sem o kit; com erro no desenho novo (entra o gramado da v70.2); a prévia no JOGAR; a Arena sem nada do Estádio; o celular deitado; com `RACHA_REF`, o bloco de física, a imagem da Arena de antes (v77: a reserva da quadra nova; v80: desenhada com as cores dos times da v71, porque as redes e os bancos seguem a cor do time) pixel a pixel e o chute no Estádio iguais aos da v71.1 | 36/36 (33 sem `RACHA_REF`) |
| `v75_test.py` (v75) | a imagem do lobby embutida e abrindo; em 5 tamanhos (1920×888, 1280×720, 1024×768 e os celulares deitados 844×390 e 667×375): o fundo do lobby é a imagem (6 amostras, cor a cor, contra a própria imagem), cobre a tela inteira, o Cristo aparece sem botão nem letreiro em cima e a tampinha fica em pé na quadra; o encaixe cobre qualquer palco (monitor bem largo, quadrado, em pé); sem a imagem volta o cenário de antes, sem erro; o degradê enquanto ela abre (v77: com a camada da v77 desligada — a v75 é a reserva) | 29/29 |
| `v76_test.py` (v76) | o campo em 1v1, 2v2, 4v4 e no Ultra leve: fora das linhas a grama é do verde escuro (sem as faixas claras) e a calçada vai e volta entre a pedra clara e a escura (as ondas), atrás do gol e em cima; as 8 caras (lendárias) e as 4 bordas (épicas) no fim das listas, as 44 prontas de antes com o mesmo código (e, com `RACHA_REF`, o mesmo da v71.1); as 8 da coleção vão e voltam no código, mudam com o tempo e a miniatura fica igual; nada passa de 1,2 × o raio; os bots não pegam as animadas; mexe na partida (a sua tampinha parada no lugar) e no lobby, e com Reduzir animações fica parada; o editor (a coleção primeiro, os cartões mexendo, o ÍCONE sem posição para as caras); o custo de 8 animadas por quadro; o celular deitado; com `RACHA_REF`, o bloco de física igual ao da v71.1 | 30/30 (28 sem `RACHA_REF`) |
| `v77_test.py` (v77) | as peças das imagens e o v77.css no jogo; o lobby em 4 tamanhos (computador e celular deitado): o fundo é a imagem limpa (6 amostras, cor a cor) e cobre a tela; o letreiro em cima da tampinha; os 8 botões com os desenhos da imagem (o EVENTOS); o topo com os AMIGOS; o XP em números, o MODO (2 VS 2) e o prêmio dos DESAFIOS; nenhuma fileira de tampinhas; a tampinha do meio reta e sem a bola; 11 telas só com o que é delas (sem abas de outras telas), o título do botão, a barra de cima e a quadra atrás, com os ícones funcionando; o perfil (as 4 abas, uma por vez, nada rola; os números de verdade; o cartão da imagem; a tampinha reta; as sub-abas antigas levando às novas; a tampinha abrindo o editor e voltando); a quadra em 1v1 a 4v4 (as cores nos lugares de cada tamanho), o Ultra leve, a Tela parada com as casas de fora, a prévia do JOGAR e o erro no desenho novo (entra a Arena de antes); o celular deitado sem rolar; com `RACHA_REF`, as medidas e o caminho da bola da Arena e o bloco de física iguais aos da v71.1 | 37/37 (34 sem `RACHA_REF`) |
| `v78_test.py` (v78) | nada em cima da cabeça (com FINTA!, DRIBLE! e DOUBLE SHOT! na fila o quadro não desenha nada; o balão "digitando" da sala continua; 30 s de 4v4 sem etiqueta); a cabeça nova ligada de 1v1 a 4v4, um jeito para cada bot sem repetir no time, o goleiro-linha no 3v3 e no 4v4 e os seus companheiros no nível bom; a escalação na faixa de cima; a apresentação com o jeito e o nível de verdade; o mesmo corpo (em 45 s de 4v4 nenhum bot passa da velocidade do jogador e todo chute é PASSE ou CHUTE no alcance); o companheiro não toma a bola de você e toca para você; a saída (a sua espera 5 s); a comemoração; o placar mexendo no jogo só na casual; 6 partidas inteiras com sorteio fixo (acabam, sem bola presa mais de 6 s, sem gol contra demais); o custo por passo; o perfil (os 4 números com o nome inteiro, a frase, o nível por extenso, a bio, nada cortado nem rolando em 4 tamanhos, a tampinha maior, a frase de quem ainda não jogou); a tampinha do lobby 1,4× sem encostar no letreiro nem nos botões em 5 tamanhos; na partida, o raio da física (com `RACHA_REF`, igual ao da v71.1) | 38/38 |
| `v79_test.py` (v79) | as 8 patentes da imagem nas faixas certas e as divisões nas bordas (III → II → I), as 24 insígnias diferentes, a conta dos pontos de antes (e a derrota que não tira da patente); a tela PATENTES RANQUEADAS pela sua patente no lobby e pelo VER PATENTES (a sua marcada, o foco, o Esc e o X); só a ranqueada (quem tinha a casual salva, o MODO, a folha sem abas e só com o Estádio, o tamanho do time valendo na hora, o caminho antigo da casual abrindo a ranqueada); a BUSCA e, sem servidor, a ranqueada contra bots no Estádio; nada de LIGA nem de FÁCIL/DIFÍCIL na faixa, na pílula, na pausa, na apresentação e no fim; os pontos de uma vitória; o JOGAR DE NOVO; desistir (−25); as missões; o fim do tutorial levando à busca; o Estádio padrão (e quem escolheu a Arena continua com ela); o selo V (o seu no lobby, no perfil e na partida; o dos outros na sala, na lista, no Chat do Brasil e no chat de baixo; selo inválido não aparece); **online, com o servidor de verdade e 3 sessões**: a fila do 1v1 juntando dois, a sala ranqueada fora da lista e sem a tela da sala, a pausa, a barrinha RANQUEADA ONLINE e o MENU sem o apito do árbitro, o resultado conferido com os pontos (+31/−20, sem o bônus dos bots), a missão, o JOGAR DE NOVO procurando outra, o DESISTIR (−25) de quem roda a partida e A PARTIDA PAROU para o outro (sem perder pontos), o 2v2 com 2 bots depois de ~8 s, o CANCELAR, o JOGAR CONTRA BOTS AGORA e, sozinho, a partida contra bots depois de ~20 s | 67/67 |
| `v80_test.py` (v80) | as cores oficiais (Time A #FF6A00, Time B #7A3FC4) no halo, no placar e na sala; a tampinha inicial (o modelo Listras, grátis, metade laranja e metade roxa na vertical, no meio, sem branco, a borda de sempre — conferido nos pixels), toda laranja no A e toda roxa no B, metade/metade sem time (lobby, treino, assistindo), outra tampinha sem mudar, a da v71 passando para a nova; os nomes novos (nenhum preto × branco na página); o placar (laranja à esquerda, roxo à direita, o relógio no meio — nos pixels — e no mesmo espaço de antes); o relógio de 3:00 (correndo na saída e no jogo, amarelo no fim), 2 × 1 e 0 × 1 acabando no 00:00, 1 × 1 e 2 × 2 empatando, a prorrogação do 0 × 0 (vermelha, -00:21 … -02:00), o gol de ouro, o 0 × 0 até -02:00, os 3 gols, a bola que entra depois do tempo, nada mudando depois do fim, o tempo acabando na festa do gol, o empate (±0, a sequência, EMPATE, o histórico); a sala neste aparelho (as cores, o 3 min, as regras dela, o gol de ouro dela no placar novo); os adversários sem a setinha do halo e sem a gota (os companheiros e a bola com elas; os nomes e a sua setinha; o replay); o GOOOL! (a palavra, o autor e o passe, laranja × roxo nos pixels, o papel picado, o confete só na vitória, Reduzir animações, o treino, 1,7 s); o treino (sem verde nos pixels, os cartões maiores, toques de verdade voltando e avançando, o apertar) e as 5 abas do editor; **online, com o servidor de verdade (a partida encurtada para 14 s + 8 s)**: o mesmo relógio nos dois, a prorrogação nos dois, o gol de ouro conferido (vitória × derrota, o GOOOL! do outro lado com o nome), o 1 × 1 empatado nos dois (±0) e a troca de time mudando a tampinha na tela do outro | 79/79 |
| `v81_test.py` (v81) | a barra no lobby (o bloco no vão entre o DESAFIOS e o MODO, da altura deles; a tag, NOME: a mensagem, o contador, o V; o aviso de baixo subindo), o painel embaixo (a aba BRASIL, as mensagens em ordem com o V, o campo, o ENVIAR, quem está online, o foco), a ficha (SILENCIAR salvo, DENUNCIAR), minimizar; o chip nas 6 telas do menu e nada nas de rodapé ocupado; a sala neste aparelho (a barra, as duas abas, as frases rápidas, "1 na sala", a troca de aba, o ENVIAR); os filtros no aparelho (telefone, CPF, e-mail, link, site, @, palavrão; placar e hora passam; a repetida); o OCULTAR e a chave dos Ajustes; **no celular (844×390)**: o bloco, o chip e a barra da sala maiores (altura e letra medidas) e o painel cabendo; **na partida (computador e celular)**: a barra embaixo do campo, longe do placar, entre o analógico e os botões, menor e meio transparente no tamanho do HUD, o painel PARTIDA sem pausar, os três pontinhos nos pixels (o balão escuro, o ponto branco, sem a palavra); **online, com o servidor de verdade e 3 sessões**: o Chat do Brasil ligando sozinho e chegando na barra de quem está fora de sala, o chat da sala só para quem está nela, o Brasil chegando dentro da sala, os pontinhos aparecendo na tela do outro e sumindo ao enviar, ao fechar e sozinhos (3–7 s), o ENVIAR fechando o painel na partida, o telefone barrado pelo servidor, o `mid`, 1 denúncia sem esconder e 2 escondendo para todos (inclusive o autor), o silenciado avisado no painel, o silenciar só para quem silencia | 64/64 |
| `v82_test.py` (v82) | o jogo **dentro de uma plataforma de mentira** (`tests/plataforma82_falsa.mjs` + `tests/v82_plataforma.html`, com as mesmas regras do servidor da plataforma) em três aparelhos: **sem conta** (o cartão SEM CONTA com ENTRAR → `/entrar` e CRIAR CONTA → `/entrar?aba=criar`, o "NESTE APARELHO" do perfil, as abas PATENTES | LIGA DA SEMANA, as missões com o XP; os empates da ranqueada ficando ao abrir de novo); **a primeira vez de uma conta** (LEVAR O PROGRESSO PARA A CONTA? antes da primeira vez do jogo, o resumo do que vai, a nota dos 799; LEVAR: o jogo abre de novo com as moedas, o nome e as partidas, a patente 950 entrando como 799 na conta, o aviso, a cópia indo sozinha; COMEÇAR DO ZERO: a primeira vez do jogo, a cópia nova e o progresso sem conta ficando); **o nível da conta** (5 e 8 no lobby e no perfil, 234 / 500, os prêmios dos níveis uma vez, as missões sem o XP do aparelho); **a ranqueada** (o começo dizendo ranqueada e o tamanho; 3 × 0 = +31 na conta e na tela; +80 XP DA CONTA; os pontos e os gols contra chegando; o teto do dia: +5 com a nota, a resposta antes da tela do fim; a desistência −25; o fim antes da resposta do começo; a ranqueada aberta e vencida virando desistência na próxima partida, com o aviso no campo; a casual sem mexer na patente); **outro aparelho** (B abre com a cópia; QUAL PROGRESSO FICA? ao salvar e ao abrir, O DA CONTA e O DESTE APARELHO; abrir o jogo não manda versão nova à toa; sair guarda a gaveta da conta e volta o de sem conta; entrar de novo traz a versão mais nova; exportar sem as gavetas); **RANKING › PATENTES** (a ordem, a sua linha com os pontos legíveis, o "termina em" da liga escondido, a liga de volta); **as regras** (11 casos: o `rqPontua` do jogo × o `pontuaRanqueada` do servidor); **no celular** (844×390: as abas, as linhas e a janela da conta cabendo); sem erros de JavaScript | 63/63 |
| `enxuto_test.py` (v70.2) | só FUTEBOL e COM CURVA e só a ARENA e o ESTÁDIO em todas as escolhas (JOGAR, CRIAR SALA, sala, treino, perfil, missões, editor, teclas); o ESTÁDIO com a mesma geometria da Arena de 1v1 a 4v4 e o mesmo chute dando o mesmo caminho da bola; o gramado desenhado (normal, sem torcida, Ultra leve, prévia); a bola sem rastro e sem respingo, a bola clássica; o Indicador desligado no aparelho novo e desligado uma vez em quem já jogava; o salvo antigo com modo/mapa que saiu | 37/37 |
| `tutorial_test.py` | primeiros toques com teclado de verdade, primeira vez, COMO JOGA do COM CURVA, indicador da curva (finta/drible/ginga: guardados) | 26/26 |
| `perfil_test.py` | compra e restauração de propriedade, reset completo, estatísticas, missões, exportar/importar, falha de gravação | 53/53 |
| `eventos_test.py` | eventos emitidos uma única vez (bots, desistência, sala), paridade da curva anfitrião × convidado | 13/13 |
| `polimento_test.py` | cores por papel e contraste, nomes botão = destino (v77: cada botão abre só a tela dele, com o título dele), contorno dos times e VOCÊ, sala no teclado, janelas (foco, Tab, inert, Escape por camada, foco de volta), abas e estados, Reduzir animações seguindo o sistema, sem armazenamento, o que vem de fora e o jogo sem internet | 64/64 |
| `matriz_test.py` | os 2 modos × 2 mapas × 1v1–4v4 (16 partidas) abrindo e respondendo ao teclado com os bots jogando, e os 7 treinos | 12/12 |
| `online_test.py` (e `--p2p`) | duas sessões de navegador contra o servidor de verdade: sala, árbitro, partida, COM CURVA no ESTÁDIO, a sala recusando o modo/mapa que saiu, reconexão, resultado conferido, o clube da turma e a tela AMIGOS (v77: era a COMUNIDADE; só os amigos e o chat) | 43/43 e 43/43 (as verificações de tempo da CURVA do convidado falham às vezes neste Chromium de teste, na v78 também: abaixo) |
| `servidor_test.js` | regras do servidor (memória) e duas sessões pela rede (HTTP, origem, reconexão); só os 2 modos e os 2 mapas nas salas; v80: a partida normal (a regra e o relógio no start, a cada segundo e parado na pausa; 1 × 1 antes do tempo recusado e no fim empate guardado; gol depois do tempo, depois do gol de ouro, depois do 3º gol e depois da prorrogação recusados; 2 × 1 no fim; o gol de ouro; 0 × 0 até o fim; o relógio do anfitrião longe do servidor recusado; a hora do gol (goal.el); o servidor encerrando sozinho 10 s depois da hora, nos 3:00 e na prorrogação; o tempo encurtado por opção; a sala personalizada sem a regra nova); v79: a fila da ranqueada (juntar, misturar com bots depois de 8 s, os times pelos pontos, fila_nada depois de 20 s, sair, cair, recusar quem está numa sala), a sala ranqueada (no Estádio, fora da lista, sem entrar pelo código, sem trocar de time nem de regra, sem revanche, `ranked` no resultado), o Estádio como o mapa padrão e o selo da conta (só o assinado pela plataforma; no hello, nos cartões, na lista e no Chat do Brasil); v81: o filtro com telefone, CPF e e-mail nos dois chats, o `mid` de cada mensagem da sala, a repetida, 1 denúncia sem esconder, a do autor ignorada, 2 pessoas diferentes escondendo (`say_hide` para todos, `escondida` no histórico), o autor silenciado (`codigo:'silenciado'`) e os outros falando; v82: o selo diz se a partida era da ranqueada (`k`) e o tamanho (`n`) — a sala personalizada `k:0`, a fila da ranqueada com duas contas `k:1` e o placar de cada lado —, os IDs de visitante com 7 dígitos (9000000+, nunca o de uma conta) | 189/189 |
| `plataforma_salas_test.mjs` | o servidor montado na plataforma (sessão do site, selo conferido, origem); v79: o selo V vindo do banco (`selosDe`) só para quem está logado, no hello e no cartão da sala | 10/10 |
| `v86_chute_test.py` (v86, v87.1) | a mecânica clássica e a força do chute: PASSE 212,5, CHUTE 340 e o teto de 46,75 u/s (v87.1; na v86, 275, 440 e 60) iguais no jogo e no servidor (17 constantes, as quadras inclusive); a bola parada depois do PASSE e do CHUTE (27,5 e 44 u/s) no `kickBall`, pelos botões de verdade, na partida autoritativa e no motor das salas (pelo comando da rede, o mesmo valor do aparelho); o teto; as 32 direções iguais no jogo e no servidor; o movimento e os botões 1/2/3 da v84; a quadra da v84 | 18/18 |
| `v87_site_test.py` (v87) | tudo dentro do jogo, com a plataforma de mentira (`v87_plataforma_falsa.mjs`): a raiz leva ao jogo; o login é o do jogo, com a cara dele; entrar; o AMIGOS e o ABRIR O PERFIL DA CONTA abrem as páginas da conta por cima do jogo (VOLTAR AO JOGO, o "Jogar" da página e o Esc fecham, sem recarregar); o SAIR DA CONTA; quem entrou pelo site entra direto (pelo cookie, sem ficar recarregando); o RACHA CONTROL da equipe; o SÓ TREINAR OFFLINE enquanto confere; o jogo sem a plataforma | 22/22 |
| `v85_online_test.py` (v85, v86) | duas sessões do jogo numa sala hospedada no servidor: a tampinha correndo e parando no servidor; na v86 (mecânica clássica) os comandos com `button` e o analógico em 1/32 de volta, o PASSE e o CHUTE saindo com a força do jogo (na v85: `acao` e 1/256, com a FR-85) | 14/14 |
| (`v85_fisica_test.mjs` e `v85_sincronia_test.py`) | testavam o núcleo FR-85; saíram na v86 (estão na branch `v85-auditada`) | — |
| `v85_chaves_test.py` (v85) | as chaves antigas do treino (perfil, HUD, som, campo, modo) indo para as novas no aparelho, nas gavetas das contas e na cópia antiga da conta; a chave nova que já existe fica | ver o RELATORIO_DE_TESTES |
| `contas_test.mjs` (v82) | as regras da patente (`app/contracts/patentes.ts`: as 8 patentes e as divisões, vitória, bônus, derrota no Bronze pela metade, o piso, o empate, a desistência, o teto do dia contra os bots, a importação até 799), o que a partida faz com a patente (`partida.ts`: o selo da ranqueada, o tamanho, a desistência sem selo, a partida que mudou de tipo) e a cópia do progresso (`progresso.ts`: só as chaves de progresso, os tamanhos, o que não vai para a conta) | 33/33 |

`dificuldade_medida.py` (Etapa 4) mede Fácil × Difícil com partidas simuladas IA × IA (`tests/saida/dificuldade.txt`).

### O que os testes provam e o que não provam

* **Testado de verdade (Chromium sem janela; 1280×720 e, nas suítes de interface, 5 tamanhos de tela; no
  `celular_test.py`, 4 tamanhos de celular deitado e um em pé, com toque emulado)**: tudo o que está na tabela acima.
* **Visto só por inspeção de código**: a plataforma completa com banco (o MySQL não roda aqui; a parte das salas foi
  testada com a sessão do site trocada por uma de teste, e o resto foi conferido com `tsc`); o caminho do selo até o XP
  dentro de `jogo.encerrarPartida`; na v82, a patente e a cópia do progresso gravadas no banco (`ranqueada.ts`,
  `progressoRouter.ts`, a desistência da ranqueada vencida no `jogoRouter.ts`) — as mesmas regras rodaram no teste pela
  plataforma de mentira.
* **Não provado por estes testes**: equilíbrio entre pessoas (a dificuldade foi medida IA × IA), desempenho em celular
  de verdade (os testes rodam num Chromium de computador), a eficácia de cada jogada, o online em redes móveis reais
  (WebRTC/P2P atrás de NAT de operadora) e leitores de tela reais (NVDA, VoiceOver, TalkBack) — os atributos ARIA e o
  foco foram conferidos, a experiência falada não. Também não provado: a leitura confortável do texto pequeno num
  iPhone de verdade (o teste mede que tudo cabe, não o conforto) e o giro da tela no app do Claude (emulado com a troca do
  tamanho da janela). Na v70.2: a física igual entre a Arena e o Estádio foi conferida pela geometria e por um chute
  repetido nos dois mapas, não por partidas inteiras entre pessoas; o visual do gramado foi visto em capturas do Chromium
  (computador e celular deitado emulado), não num aparelho de verdade. Na v71: os testes conferem as cores, os nomes, o
  que cada quadro desenha, os lugares, os destinos, os tamanhos e que nada se cobre — **não provam se o visual novo agrada**
  (isso é com quem joga) nem a leitura no celular de verdade. O navegador de teste não tem a fonte Lilita One (sem internet:
  ela foi trocada por uma parecida e mais larga), então as capturas mostram a letra um pouco diferente da do jogo. Na
  v71.1, o mesmo: o teste confere que não sobrou azul-marinho, que cada tela abre e cabe e que os botões têm o tamanho
  certo; se o visual agrada é com quem joga. Na v73: o teste mede a força do halo nos pixels das imagens prontas e no que
  o quadro da partida desenha, e compara a física com a da v71.1; **se o anel mais transparente ficou mais bonito é com
  quem joga** — as capturas são do Chromium (computador e celular deitado emulado), não de um aparelho de verdade, e num
  sol forte ou numa tela mais escura o anel pode aparecer menos do que nas capturas. Na v74: o teste confere onde cada
  parte do campo novo cai (as faixas, a grama, o alambrado, o calçamento, os bancos), que a física é a da Arena e a da
  v71.1 e que tudo desenha sem erro, inclusive sem o kit; **se o campo ficou parecido com a imagem e bonito é com quem
  joga** — as capturas são do Chromium. A imagem enviada é bem menor que o campo no jogo (1490 × 1056 px), então as peças
  que vêm dela (os carros, as árvores e as casas) ficam um pouco macias de perto, num zoom alto ou numa tela de alta
  densidade. O tempo do desenho foi medido só aqui (o cenário inteiro sai em 10–16 ms no Chromium de teste, uma vez por
  partida ou troca de zoom), não num celular de verdade. Na v75: o teste confere que o fundo do lobby é a imagem, que ela
  cobre a tela em qualquer tamanho, que o Cristo não fica atrás dos botões e que a tampinha cai na quadra; **se o lobby
  ficou bonito com ela é com quem joga** (as capturas são do Chromium). A imagem tem 1844 px de largura: numa tela de alta
  densidade grande (um monitor 4K) ela fica um pouco macia. Na v76: o teste confere a grama de fora, as ondas da
  calçada, que cada tampinha muda com o tempo onde deve (e para onde deve) e o custo de desenhar 8 animadas por quadro —
  no Chromium de teste, sem placa de vídeo, até uns 3 ms; **num celular de verdade, com 8 tampinhas animadas na tela
  (um 4v4 online, todo mundo com uma), o custo não foi medido**. Se as animações ficaram bonitas é com quem joga: as
  ilustrações vêm da folha (que tem 1536 px de largura: cada miolo tem uns 200 px), então ficam um pouco macias no lobby
  de um celular de tela muito densa. Na v77: o teste confere que o fundo do lobby é a imagem limpa, que cada peça está no
  lugar, que cada tela abre sozinha com a barra de cima, que o perfil mostra os números de verdade, que a quadra nova tem
  as cores certas nos lugares certos em cada tamanho e que a física e as medidas são as da v71.1; **se o jogo ficou
  parecido com as imagens e bonito é com quem joga** (as capturas são do Chromium). O que estava embaixo dos botões na
  imagem do lobby foi completado por um modelo (LaMa) e os braços do Cristo foram redesenhados à mão: de perto, quem
  conhece a imagem original pode notar essas partes. A quadra da imagem é bem mais comprida que as do jogo, então as peças
  dela (o muro, as escadas, as casas) entram em pedaços e repetidas, não a imagem inteira; o muro de cima cabe só na margem
  de cima do mapa (59 px do mundo), então os grafites ficam pequenos. O desenho da quadra e a imagem de fora do mundo foram
  medidos só no Chromium de teste, não num celular de verdade; o arquivo do jogo ficou com 4,0 MB (eram 3,1). Na v78:
  os testes conferem que nada é desenhado em cima da cabeça, que os bots usam o mesmo corpo de todo mundo, que o
  companheiro não toma a bola de você e toca para você, que as partidas acabam e quanto os bots custam por quadro; as
  medições comparam os níveis com um jogador programado. **Se os bots ficaram divertidos é com quem joga** — nenhum teste
  prova isso, nem o equilíbrio entre pessoas de verdade, nem o custo num celular de verdade (medido só no Chromium de
  teste). O 4v4 continua o tamanho mais demorado. Na v79: a fila, a sala ranqueada, os pontos, a desistência e os bots de
  reserva foram testados de verdade com o servidor local e até 3 sessões do Chromium no mesmo computador; **a fila com
  muita gente ao mesmo tempo, a rede de celular e o tempo de espera com poucos jogadores online de verdade não foram
  provados** (com pouca gente, quase toda partida vai ser contra bots ou mista). O selo V foi testado com o selo vindo do
  servidor e com o da conta trocado por um de teste; **o caminho inteiro na plataforma (o dono dá o selo no RACHA CONTROL,
  o banco guarda, a sessão leva para o jogo) depende do MySQL e não rodou aqui**. A verificação de tipos da plataforma
  (`npm run check`, o `tsc -b`) **não rodou**: o registro do npm não responde deste ambiente, então as dependências não
  foram instaladas; os arquivos mudados passaram no esbuild (a sintaxe) e no TypeScript do sistema com as bibliotecas
  trocadas por `any` (sem erro neles) — rodar o `npm run check` aí é o próximo passo. O `online_test.py` tem verificações
  que dependem do tempo (a CURVA do convidado precisa chegar ao anfitrião em ~0,4 s): neste Chromium de teste sem placa de
  vídeo (cada quadro leva ~11 ms e 2–3 navegadores dividem a máquina) elas falham às vezes, na v78 também: alternando as
  duas versões na mesma máquina parada, cada uma passou inteira em 2 de 4 rodadas, sempre falhando uma das verificações de
  tempo da CURVA do convidado (com a máquina ocupada, as duas falham mais); o custo do quadro medido nas duas é o mesmo.
  Na v80: as regras do relógio, da prorrogação e do empate foram testadas passo a passo (contra os bots) e, online, com o
  servidor de verdade e a partida **encurtada para 14 s + 8 s** (a mesma conta, com outro número): **a partida inteira de 3:00
  online e a rede de celular não foram provadas aqui**; a diferença de relógio entre os jogadores é a da rede (no teste, no
  mesmo computador, abaixo de 0,6 s). A conferência do servidor é pela linha do tempo dos quadros do anfitrião, com uma
  folga de 3 s para a rede: um anfitrião adulterado ainda pode, no máximo, encaixar um gol nesses 3 s (barrar isso de
  verdade pede a partida simulada no servidor). O visual novo (as cores, a Listras, o placar, o GOOOL! e os controles do
  treino) foi conferido nos pixels e em capturas do Chromium (computador e celular deitado emulado); **se ficou bonito é
  com quem joga**, e o custo da animação num celular de verdade não foi medido (aqui, as peças são feitas uma vez por gol e o
  quadro só cola as imagens). As capturas usam outra fonte no lugar da Lilita One (o teste não tem internet), então as letras
  saem um pouco mais largas que no jogo. Na v81: a barra, o painel, a ficha, os filtros, o OCULTAR e os pontinhos foram
  testados no Chromium (computador e celular deitado emulado, com os tamanhos e as letras medidos) e, online, com o servidor
  local e 3 sessões no mesmo computador (o Brasil fora e dentro da sala, a sala só para quem está nela, os pontinhos, a
  denúncia, o silenciado, o silenciar); **o teclado do celular de verdade** (o painel sobe pelo `VisualViewport`, que o teste
  não emula), **a rede de celular**, o chat com **muita gente ao mesmo tempo** e o VER PERFIL **dentro da plataforma com
  banco** (a rota foi conferida no código e o botão só aparece com a plataforma e a conta) **não foram provados aqui**. Os
  filtros são listas de padrões: pegam o telefone, o CPF, o e-mail, os links e as palavras da lista com as variações
  comuns — **não** pegam tudo o que alguém inventar para escrever por fora (um número com espaços estranhos, um xingamento
  novo); a denúncia e o silenciar são o complemento. **Se o visual do chat agrada é com quem joga** (as capturas são do
  Chromium, com a fonte trocada). O `enxuto_test.py` tem uma verificação que às vezes falha sozinha ("ligou de novo,
  continua ligado ao reabrir", o Indicador de Direção depois de recarregar a página): acontece também na v81, com a mesma
  frequência (nesta máquina, 2 de 6 rodadas na v81 e 0 de 6 na v82) e passa rodando de novo; os mesmos passos com um
  diagnóstico a mais passaram 7 de 7, então parece ser o tempo do recarregar no Chromium de teste — a causa não foi achada. Na v82: **o servidor da plataforma de verdade não rodou** (o MySQL não roda aqui e o registro
  do npm não responde, então as dependências não foram instaladas). O que foi testado de verdade: as regras da patente, o que a
  partida faz com ela e a cópia do progresso (os contratos `app/contracts/*.ts`, no `contas_test.mjs`); o selo da ranqueada e
  os visitantes no servidor das salas (`servidor_test.js`); e **o jogo inteiro dentro de uma plataforma de mentira** que usa
  esses mesmos contratos (`v82_test.py`: as contas, a patente, o fim da partida, o nível, a cópia em dois aparelhos, as
  perguntas, o ranking). O que a plataforma de mentira **não é**: o banco (lá, mapas na memória: a transação, o `FOR UPDATE` e
  a troca de versão condicional do `progressoRouter` só foram conferidos no código), a sessão (lá, a página diz quem está
  logado), a assinatura do selo (lá, o selo é o JSON dele; a assinatura é testada no `servidor_test.js`), os tetos de XP do dia
  e o React (a página-mãe faz o papel do `ponteJogo.ts` em JavaScript puro, com a mesma ordem das coisas). O código da
  plataforma (`app/api`, `app/src`, `app/db`) foi conferido pelo TypeScript do sistema com as bibliotecas trocadas por `any`:
  nenhum erro novo além dos que essa troca causa — rodar o `npm run check` e o `npm run db:push` aí é o próximo passo. A
  ranqueada online com a conta (o selo `k:1` indo do servidor das salas até a plataforma) foi testada em pedaços (o servidor
  dá o selo certo; a plataforma de mentira confere o conteúdo), não as duas juntas com o banco. **Não provados**: a rede de
  celular (a cópia indo e voltando em rede ruim), muitos aparelhos da mesma conta abertos ao mesmo tempo (a regra é a mesma:
  quem salva com a versão velha recebe a pergunta) e se as janelas novas agradam (as capturas são do Chromium).

## Limitações conhecidas (e o porquê)

* **A força do chute (v86, v87.1) foi medida, não jogada por pessoas**: a velocidade da bola depois do PASSE e do CHUTE, o
  teto e os números iguais no jogo e no servidor foram testados no Chromium; se 15% abaixo da antiga ficou bom, o equilíbrio e a
  sensação no celular dependem de jogar. Os bots usam as mesmas constantes (a previsão do chute deles acompanha); o jeito
  deles jogarem foi conferido pelos testes dos bots (v78), não por partidas contra pessoas.
* **A plataforma da v87 não foi construída aqui**: o `npm install` e o `npm run build` do `app/` não rodam neste ambiente (o
  registro do npm não responde daqui). O `App.tsx`, o `Layout.tsx` e o `main.tsx` foram compilados com o esbuild e testados
  no Chromium com stubs no lugar do react-router e do tRPC; o lado do jogo foi testado com uma plataforma de mentira. O
  build de verdade acontece no seu servidor (`npm run build`).
* **A mecânica da v86 é a da v84** (a pedido): os números e a estrutura dela vieram da análise de outro jogo (ver
  `PROVENIENCIA.md`); a física própria da v85 está na branch `v85-auditada`.
* **Jogo e servidor de versões diferentes não conversam direito**: o comando de entrada da v85 é `acao` e o da v84/v86 é
  `button`; um jogo de uma anda, mas não chuta num servidor da outra. O jogo e o servidor vão juntos na mesma versão.

* **Sem conta, moedas, gemas, peças e a patente ficam neste aparelho** (localStorage), como antes; dá para exportar/importar o
  progresso. **Com a conta** (v82: o jogo dentro da plataforma), a patente fica na conta (o servidor faz a conta) e o progresso
  do jogo vai para a conta e volta em outro aparelho; XP, conquistas e itens da conta já ficavam no servidor.
* **A ranqueada contra os bots continua sem prova lance a lance** (v82): a simulação roda no aparelho, então o servidor da
  plataforma confere o tempo e o ritmo do placar, não cada toque — por isso o teto de 250 pontos por dia contra os bots e a
  patente do aparelho entrando na conta só até 799. A online vale pelo selo do servidor das salas (que confere o resultado
  do anfitrião, sem simular a bola: ver abaixo).
* **A cópia do progresso guarda a versão inteira, não junta as duas** (v82): se dois aparelhos mudaram, um dos dois fica
  (a pergunta QUAL PROGRESSO FICA?) — juntar moeda por moeda abriria espaço para duplicar. A patente e o nível não entram
  nisso (ficam na conta). A cópia tem até 256 KB (as tampinhas desenhadas são o que mais pesa).
* **O relógio da partida contra os bots é o do aparelho** (v80): sem servidor, quem roda a partida é o seu jogo, e o relógio
  anda junto com ela (para na pausa e no replay). O relógio do servidor vale na ranqueada online.
* **As salas personalizadas continuam com as regras e o relógio delas** (v80, o pedido: manter as configurações): sem tempo,
  ou com 2, 3 ou 5 minutos e o GOL DE OURO no empate (sem limite), com o relógio de quem roda a partida. Só o placar mudou.
* **A conferência do servidor tem uma folga de 3 s** (v80) entre a hora do gol que o anfitrião manda e a hora em que o
  servidor recebe o quadro (a rede): menos que isso recusaria gols de verdade em redes lentas.
* **O chat precisa do servidor da turma** (v81): sem ele, a barra não entra (a sala neste aparelho tem o chat local, sem
  pontinhos nem denúncia). O "BRASIL" é quem está ligado no mesmo servidor: não há divisão por estado ou cidade ainda, e
  o histórico recente fica na memória do servidor (50 mensagens no Brasil, 30 por sala) e some quando ele reinicia. A moderação é por lista de padrões, denúncia e silenciar: não há moderador humano nem conta de
  denúncias entre salas; quem muito denunciado fica 5 min (sala) ou 10 min (Brasil) sem falar, e volta.
* **A fila junta quem está procurando no mesmo tamanho de time** (v79): no 1v1 só sai partida com 2 pessoas; no 2v2 a 4v4,
  depois de 8 s, 2 ou mais jogam com bots completando; depois de 20 s, contra bots. Não tem fila em grupo (jogar a
  ranqueada com um amigo no mesmo time) nem faixa de patente máxima entre os que se juntam (vale quem espera há mais
  tempo e os de pontos mais perto dele).
* **Até a v82, o servidor das salas não simulava a bola** (o anfitrião simulava e o servidor conferia o resultado). Desde a
  v83 as partidas online das salas são simuladas no servidor (salas hospedadas), com o porte da física do jogo (as mesmas
  constantes; na v85 era o núcleo FR-85, e na v86 voltou o porte da v84); a partida contra os bots continua simulada no aparelho.
* **As fontes vêm no pacote desde a v85** (antes vinham do Google Fonts). São `.ttf` (os originais): mais pesados que `.woff2`
  (~850 KB as oito), mas sem conversão — a Lilita One tem nome reservado na licença.
* **O jogo ainda é um arquivo grande montado em camadas** (o original + v67–v84; a v85 e a v86 mexeram no original e nas
  camadas no lugar). As fontes estão separadas por versão e
  por assunto em `tools/`, a física fica isolada e conferida por hash, e o mapa das redefinições mostra qual versão de
  cada função vale; juntar as camadas num código único é o próximo passo e não foi feito agora para não arriscar a física
  e o online já testados.
* **Uma família visual só** (v71.1): o preto-carvão com o amarelo, do lobby às telas de dentro, aos Ajustes, à pausa e ao
  fim. O azul-marinho das telas antigas é trocado no build (`tools/v71/tema.py`); quem mexer nessas folhas de estilo pode
  continuar escrevendo o marinho de antes que ele vira carvão sozinho. Ficam coloridos de propósito: a bolinha de cada
  rival no ranking, o desenho de cada exercício e de cada número do perfil, e as cores das raridades.
* **No celular deitado as letras ficam pequenas, como na v69** (v70.1): foi a escolha para tudo caber sem arrastar. Quem
  precisa de letra maior escolhe 115% ou 130% em Ajustes › Acessibilidade › Tamanho da interface — aí as telas crescem e
  voltam a rolar. Fora do celular os alvos de 44 px da Etapa 3 continuam (medidos em 1440×900 e 1280×720).
* **O ⇄ TROCAR virou o cartão do MODO** (v71), do tamanho do JOGAR e colado nele: passa de 44 px de toque em todos os
  tamanhos medidos (no celular deitado, os botões quadrados e o JOGAR também). No celular deitado pequeno (667×375) o chat
  e os ajustes do topo ficam com uns 40 px e as pílulas de moedas e gemas com uns 34 px (na v70.1, 33 e 30); fora do
  celular deitado tudo passa de 44 px.
* **O Estádio (v74) é desenhado no tamanho do jogo, não é a imagem esticada**: o society da imagem é mais comprido que
  os campos do jogo, então ela serve de modelo (as cores, as faixas, a luz, o alambrado, o calçamento, o estacionamento) e
  de fonte das peças (os carros, as árvores e as casas). O estacionamento de cima e de baixo e as casas não cabem na margem
  do mapa (a mesma da Arena, para a física não mudar); as casas aparecem dos lados quando a tela mostra além do mapa. Um
  campo com a proporção da imagem (mais comprido) seria outra geometria e outra física — fica como escolha para depois.
* **Os catálogos arrastam de lado** (os 44 modelos prontos, os padrões, as bordas e os ícones da tampinha) e a conversa
  do Chat do Brasil rola: é lista, não tela fixa.
* **No celular, os Ajustes não mostram as teclas do teclado físico** (sem mouse nem touchpad não há teclado para trocar);
  no computador elas aparecem como antes.
* **Os modos e mapas que saíram na v70.2 ficaram guardados no código**, não apagados (para voltar, é uma lista no
  `tools/v70/enxuto.js` e outra no `server/turma.js`). Por isso o jogo ainda carrega o desenho deles; um replay gravado
  na Favela, no Escadão ou no Viaduto continua tocando no mapa dele, e as estatísticas antigas desses modos entram nos
  totais do perfil (os cartões próprios deles não aparecem). A plataforma continua aceitando o `modo` antigo no registro
  de resultados, para não perder partidas de quem ainda estiver com a versão anterior aberta.
