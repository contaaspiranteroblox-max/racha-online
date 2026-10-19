# RACHA · mudanças

As versões até a v83 estão descritas no `LEIA-ME.md` (uma seção por versão). Este arquivo começa na v85.

## v88.2 — 18/10/2026 · jogar online sem conta, só com o nome

A pedido: "a sala funcionar online sem criar conta, só botando o nome de usuário". A física não mudou (sha256 do bloco:
`ad9f1d2216409b0e`).

- **A tela de entrada do jogo** ganhou, em cima de tudo, **JOGAR ONLINE SEM CONTA**: o campo **Seu nome no jogo** e o botão
  **JOGAR ONLINE**. O nome (2 a 12 letras, com o filtro do chat: sem palavrão, link, @, telefone ou e-mail) vira o nome do
  perfil; a tela fecha, abre as **SALAS** (a GALERA) e o jogo já conecta no servidor das salas. Sem conta dá para criar sala,
  entrar pelo código ou pelo JOGAR AGORA, jogar a partida (no servidor), o chat da sala e o Chat do Brasil. Na próxima vez o
  nome já vem escrito. O que é da conta (o progresso salvo na conta, a patente, o XP, os amigos, o correio, a loja da conta)
  continua pedindo a conta. (`tools/v88/visitante.js`)
- **Sem a plataforma de contas no endereço** (o site de teste do Render, que roda só o servidor das salas, ou o GitHub
  Pages), a tela mostra só o JOGAR ONLINE e o SÓ TREINAR OFFLINE — as abas ENTRAR e RECUPERAR não funcionariam ali (antes,
  o único jeito de entrar nas salas ali era o "SÓ TREINAR OFFLINE", que dizia o contrário). Com a plataforma, o JOGAR ONLINE
  fica em cima e o "OU ENTRE NA SUA CONTA" embaixo.
- **A plataforma** (o servidor das salas montado nela) passou a aceitar quem joga sem conta, como visitante (o número de
  visitante, de 7 dígitos; nunca o de uma conta). `RACHA_VISITANTES=0` volta ao login obrigatório da v84 — aí o JOGAR ONLINE
  mostra o LOGIN OBRIGATÓRIO de sempre. O site de teste do Render já aceitava visitante (`RACHA_VISITANTES=1` no
  `render.yaml`).
- **Testes:** `tests/v882_visitante_test.py` (o jogo de verdade em dois navegadores: num servidor como o do Render, duas
  pessoas só com o nome criando a sala, entrando pelo JOGAR AGORA, vendo o nome uma da outra e jogando; os nomes recusados;
  o nome lembrado; na plataforma, a sala sem conta e, com `RACHA_VISITANTES=0`, o LOGIN OBRIGATÓRIO). O
  `plataforma_salas_test.mjs` confere o login obrigatório com `RACHA_VISITANTES=0` e o visitante no padrão; o
  `v881_contas_test.mjs` confere que o bilhete de antes do zerar só entra como visitante (nunca com o número da conta).

## v88.1 — 18/10/2026 · as contas pelo Dono: cadastro fechado, RACHA CONTROL › Contas, ZERAR CONTAS e o login do Dono

A pedido: "no painel Admin, um sistema em que só eu adiciono contas novas para jogar", "o login de Admin do RACHA CONTROL"
e "zerar os IDs e me mandar o 01". A física não mudou (o build confere o sha256 do bloco de física: `ad9f1d2216409b0e`).
O banco não ganhou tabela nem coluna (o cadastro, o contador e a hora do zerar ficam na tabela `contadores`): não precisa de
migração.

- **Cadastro fechado (o padrão novo).** O `auth.registrar` recusa com a explicação ("as contas novas são criadas pelo dono
  do RACHA") e a rota pública `auth.cadastro` diz se está aberto. O login do jogo (sem o site) mostra só **ENTRAR** e
  **RECUPERAR**, com o aviso; o **CRIAR CONTA** do Ajustes › Conta some e os outros botões CRIAR CONTA do jogo levam ao
  ENTRAR com o aviso; a página `/entrar` do site esconde a aba "Criar conta". Quem decide é o Dono, no painel (o que ele
  escolhe fica no banco). Sem nada no banco, vale `RACHA_CADASTRO=aberto|fechado` (para testes e para o computador de quem
  desenvolve); sem a variável, fechado.
- **RACHA CONTROL › 👤 Contas** (`app/src/pages/AdminContas.tsx` + `app/api/racha/v88/donoContas.ts`), **só para a conta
  do Dono (000001)** — nem um segundo "Dono" (o cargo dado pelo painel) vê a aba, e cada rota confere de novo no servidor
  (e vai para a auditoria):
  o resumo (quantas contas, o número da próxima, o cadastro), **CRIAR CONTA** (usuário, nome no jogo, e-mail opcional e a
  senha — em branco, o servidor gera uma fácil de ditar, como `abcd-EFGH-2345`; o usuário, a senha e o código de
  recuperação aparecem **uma vez**, com o botão COPIAR PARA MANDAR), a lista das contas com busca, **SENHA NOVA** (a conta
  sai de todos os aparelhos, e o código de recuperação também é trocado) e **ABRIR / FECHAR O CADASTRO**.
- **ZERAR CONTAS** (só a conta **000001**, com a senha dela e a palavra ZERAR): numa transação, apaga todas as outras contas
  e tudo o que era delas em todas as tabelas (sessões, cargos, 2FA, selos, progresso, carteira e movimentações, itens,
  conquistas, partidas, patente, missões, passe, eventos, cartas, mensagens, amigos, pedidos, bloqueios, denúncias,
  punições, clubes delas e os pedidos/convites de clube); o Dono fica com o progresso, a carteira, os itens, as
  estatísticas e os clubes dele (só com ele); ficam a auditoria, os eventos, as cartas para todos e o registro das
  distribuições e os limites de tentativa (onde fica a marca de uso único de cada resultado online). Os números voltam a
  contar: **a próxima conta é a 000002**. O servidor das salas montado na plataforma
  derruba as conexões das contas apagadas e esquece o que era delas (os troféus da turma, os duelos, os convites, o
  histórico dos chats, os lugares guardados nas salas e nas partidas) e passa a recusar o bilhete assinado antes do zerar
  (o bilhete leva a hora `t`; a hora do zerar, tomada depois do commit, fica guardada e vale também depois de reiniciar —
  e, se o servidor das salas não viu o zerar, ele esquece as contas apagadas ao ligar). No aparelho, o começo do jogo
  (`tools/v82/inicio.js`, pela troca da v88.1) confere a conta que entrou: a hora em que ela nasceu (anotada no aparelho na
  primeira vez) e o que o servidor diz — se ela nasceu depois do último zerar (sem comparar relógios: fora a 000001, toda
  conta que existe nasceu depois do zerar). Se o número é de uma conta apagada, o progresso guardado para aquele número sai
  antes de o jogo ler — nada passa para a conta nova (e o do Dono continua).
- **O login do Dono.** No boot, a plataforma confere a conta 000001 (`garanteDono` em `app/api/racha/contas.ts`): com
  `RACHA_OWNER_PASSWORD` definida, a senha do Dono passa a ser a da variável (se mudou, as sessões antigas do Dono caem e o
  2FA do painel é zerado: configura de novo no primeiro login); sem a conta 000001, ela é criada com a variável. A senha do
  manual (`Racha@Dono1`, escrita no repositório) **não abre mais** o RACHA CONTROL nem a conta do Dono no jogo (com ela,
  qualquer pessoa podia chegar antes do Dono na chave do 2FA). Com a variável definida, a senha do Dono não muda pelo site
  nem pela recuperação (o aviso diz para trocar a variável). O `db/seed.ts` sorteia uma senha forte quando a variável não
  existe. O login do painel mostra a chave do 2FA em grupos de 4, com o passo a passo do app autenticador.
- **Correções encontradas no caminho** (já existiam antes desta versão):
  1. **o RACHA CONTROL não abria no navegador**: depois do código do 2FA, o painel ficava parado na tela do 2FA — o
     `verificar2fa` grava o cookie `racha_admin`, mas as rotas do painel só liam o cookie do jogo. Conferido rodando o
     commit anterior num navegador (o painel não abriu) e o novo (abre e continua aberto depois de recarregar). O
     **SAIR DO PAINEL** encerrava a sessão do **jogo** em vez da do painel; agora encerra a do painel.
  2. **o site não compilava**: `EntrarPage.tsx` e `RedefinirPage.tsx` importavam `../auth`, `../trpc` e
     `react-router-dom`, que não existem no projeto (o `npm run build` parava ali). E a recuperação por código do site
     mandava os campos errados e recusava os códigos com letras (o código é `RACHA-` e três grupos de 0–9/A–F).
  3. **o número da conta** saía de duas consultas soltas (`UPDATE … LAST_INSERT_ID(…)` e `SELECT LAST_INSERT_ID()`) num
     pool de conexões do MySQL — o `LAST_INSERT_ID` é da conexão. Agora as duas vão numa transação (a mesma conexão), e
     se o contador ficar para trás de um número em uso, o servidor pula.
- **Revisão independente** (um segundo agente leu o código sem ver o trabalho; nenhum furo grave) — e o que ela pediu
  entrou: as contas são da conta **000001** (não de qualquer cargo Dono), a SENHA NOVA troca também o código de recuperação,
  o zerar não apaga mais os limites (a marca de uso único dos resultados online), a hora do zerar é tomada depois do commit,
  o servidor das salas esquece as contas apagadas também ao ligar, a decisão do aparelho vem do servidor (sem comparar
  relógios) e o `db/seed.ts` não dá o cargo de Dono para uma conta com o usuário do Dono e outro ID.
- **Testes novos:** `v881_contas_test.mjs` (a plataforma de teste em três boots com o mesmo banco), `v881_painel_test.py`
  (o RACHA CONTROL e o login do site num navegador de verdade: as páginas do `app/src` juntadas pelo `tests/ui_site/` com o
  React desta máquina e um cliente de teste no lugar do `@trpc/react-query`, que o npm não instala aqui) e
  `v881_jogo_test.py` (o login do jogo com o cadastro fechado e o aparelho tirando o que era das contas apagadas — com o
  controle negativo: sem a proteção, as contas novas herdavam o progresso das apagadas) — 63, 26 e 15 verificações. Os
  testes da v88 que criam contas pelo jogo sobem a plataforma de teste com `RACHA_CADASTRO=aberto`. A bateria inteira
  (`bash tests/roda_tudo.sh`; a saída de cada suíte em `tests/saida/logs/`): 47 suítes, 2.213 verificações, nenhuma falha.

## v88 — 18/10/2026 · a atualização completa dos menus (amigos, mensagens, correio, loja, clube, treino, missões, eventos, passe, chat, denúncias, modo e campo, estatísticas, espectador, ajustes e controle)

A pedido (o "PROMPT — ATUALIZAÇÃO COMPLETA DO RACHA" e as 4 imagens de referência): os botões e menus que faltavam, no jogo
de sempre, ligados às contas e ao servidor — sem criar outro jogo e sem mexer na física (o build confere o sha256 do bloco
de física: `ad9f1d2216409b0e`, o mesmo da v87.1; a física, a movimentação, os chutes e as colisões são os mesmos). Cosmético
continua sem dar vantagem. O relatório completo (o que entrou em cada parte do pedido, o que foi preservado, as pendências
reais e como instalar e testar) está no `LEIA-ME.md`, na seção "v88".

Feita em três etapas (três commits):

- **Etapa 0 · a plataforma de teste** (`tests/plataforma/`): o código de verdade da plataforma (`app/api`) rodando sem
  MySQL e sem npm (um drizzle pequeno sobre o `node:sqlite`, um tRPC pequeno no formato do jogo e o servidor das salas
  montado no mesmo endereço). É onde as contas, o banco e o social foram testados de ponta a ponta. Os testes do online
  ficaram em dia com as salas hospedadas da v83.
- **Etapa 1 · a plataforma** (`app/`): as tabelas novas (`app/db/migrations/v88_social.sql`: mensagens, correio,
  correio_global, missoes_progresso, eventos, eventos_progresso, passe_temporada, clube_pedidos e as colunas novas), o
  catálogo único (`app/contracts/catalogo88.json`, o mesmo arquivo para o jogo e o servidor) e as regras
  (`app/contracts/v88.ts`), e as rotas `social`, `mensagens`, `correio`, `loja`, `missoes`, `passe`, `eventos`, `estat`,
  `conta` e `admin88` (`app/api/racha/v88/`). A carteira do servidor (`economia.ts`) passou a ser usada: logado, moedas,
  gemas e itens são da conta (a primeira vez leva o saldo da cópia do progresso, uma vez, até 50.000 moedas, 5.000 gemas e
  200 peças). Amigos (cancelar, pedir de novo depois de recusado, limite de 100, bloqueio dos dois lados, avisos),
  denúncias com os 7 motivos e a proteção contra abuso, clube (admins, pedidos, estatísticas, histórico, ranking).
- **Etapa 2 · o jogo e o servidor das salas** (este commit): os módulos do jogo em `tools/v88/*.js` (colados pelo
  `tools/v88/v88.py`) e o estilo em `app/public/game/v88.css`; o social ao vivo no servidor das salas
  (`server/social88.js`, ligado no `server/turma.js`): o status dos amigos, os convites em tempo real, o chat dos amigos,
  do clube e da equipe, o bloqueio no servidor e a denúncia de mensagem com motivo (vai para a tabela do RACHA CONTROL);
  e as abas **EVENTOS** e **CORREIO** do RACHA CONTROL (`app/src/pages/AdminV88.tsx`).

O que mudou no jogo (detalhes no LEIA-ME):

- **Lobby:** o mesmo da v77 (o fundo da favela com o Cristo, a tampinha equipada no meio, o perfil, as moedas, as gemas, a
  patente, o chat, o JOGAR e os botões de antes nos mesmos lugares). Apareceram o **CORREIO** (o botão que já existia
  escondido como "em breve": mensagens e correio) ao lado dos ajustes e o **PASSE** (o outro que estava escondido, agora um
  quadrado no topo com o nível), e entrou a **lista dos amigos** à direita (avatar, nome, status de verdade, o botão de cada um, VER TODOS e o sinal da
  conexão). A lista desce quando cobriria o Cristo (`v88AmgEncaixa`). Os números de não lido nos botões que já existiam.
  Sem conta, AMIGOS, EVENTOS e DESAFIOS fazem o que sempre fizeram neste aparelho; com a conta, abrem as telas da conta.
- **Amigos** (buscar por nome ou ID, pedidos, aceitar, recusar, cancelar, remover, perfil, online/offline/em partida,
  chamar para a sala ou para o time, aceitar convite, bloquear, recentes, adicionar pelo perfil e pelo resultado),
  **Mensagens** (Sistema, Amigos, Clube, Convites, Recompensas, com as não lidas), **Correio** (COLETAR conferido no
  servidor, uma vez), **Loja** (Destaques, Tampinhas, Bolas, Efeitos, Comemorações, Gols, Banners, Avatares, Pacotes,
  Ofertas e o Inventário; o servidor confere o preço e o saldo), **Clube** (pedir para entrar, pedidos, admins, chat do
  clube, estatísticas, histórico, ranking), **Treino** (POSICIONAMENTO, DEFESA, GOLEIRO e TREINO COM BOTS entraram ao lado
  dos de sempre; campo, tamanho, dificuldade e o relógio do treino livre; a mesma física; o prêmio do treino com a conta é
  pago pelo servidor, com o teto do dia, e o treino com bots não vale nada), **Missões** (diárias, semanais, da temporada e
  especiais), **Eventos** (login diário, desafios, a Copa dos Amigos, temporada, temporários — configuráveis no servidor e
  no RACHA CONTROL), **Passe RACHA** (temporada, 30 níveis, trilha grátis e premium — com 9 tampinhas exclusivas na
  premium, 5 delas novas: Laje Neon, Pipa no Céu, Cria do Beco, Onça da Quebrada e Fogo no Asfalto), **Chat** (MUNDO, SALA, EQUIPE, CLUBE e
  AMIGOS; silenciar, denunciar com motivo, bloquear; o filtro e a trava de spam de antes valem nos canais novos),
  **Denúncias** (a janela com os 7 motivos; na ficha do chat, o motivo ali mesmo, que funciona também na partida),
  **Modo e campo** (a folha do MODO: RANQUEADA, SALAS e TREINO; os campos com o desenho, o nome e os modos em que valem —
  a Arena leva a uma sala nova nela ou ao treino nela), **Estatísticas** (DA CONTA, com filtro de temporada e de modo, ao
  lado do DESTE APARELHO de antes), **Espectador** (a câmera CAMPO INTEIRO na volta do CÂMERA e o SAIR na barra),
  **Ajustes** (Música e Efeitos, sensibilidade do analógico, idioma, a aba nova PRIVACIDADE com as notificações, a
  privacidade da conta, os silenciados e os bloqueados, e EXCLUIR MINHA CONTA) e o **controle Bluetooth** (API Gamepad:
  as mesmas 32 direções e velocidade do toque, A/B/X/START, os menus pelo direcional).
- **O fim da partida** com a conta: as moedas que a conta recebeu (com o teto do dia), as missões, o passe e o melhor da
  partida (online: o do servidor das salas; contra os bots: o jogo diz quem foi e o servidor só aceita se for possível).

Mudou de propósito, e os testes de antes foram postos em dia (com um comentário "v88" em cada troca):
`camera_test.py` (a volta do CÂMERA passa pelo CAMPO INTEIRO), `v73_test.py` (12 cartões no TREINAMENTO: os 8 de sempre na
mesma ordem e os novos depois), `v71_test.py` (o PASSE voltou ao topo; 7 abas nos Ajustes), `v77_test.py` (o CORREIO no
topo), `v79_test.py` e `enxuto_test.py` (a folha do MODO mostra os dois campos com os modos de cada um; a
ranqueada continua só no Estádio), `v81_test.py` (a denúncia pede o motivo; a aba EQUIPE ao lado da PARTIDA),
`perfil_test.py` (a troca de gemas mora em OFERTAS) e `v87_site_test.py` (com a conta, o AMIGOS abre os amigos dentro do
jogo; o painel do site continua para o perfil da conta).

Testes novos: `tests/v88_plataforma_test.mjs` (a plataforma de verdade no banco de teste, três contas e o reinício),
`tests/v88_social_test.js` (o social ao vivo no servidor das salas), `tests/v88_salas_plataforma_test.mjs` (o mesmo com o
servidor montado na plataforma), `tests/v88_cliente_test.py` (o jogo de verdade logado em dois e três navegadores, pelos
botões) e `tests/v88_controle_test.py` (o controle Bluetooth com um controle simulado no navegador). Os cinco entraram no
`tests/roda_tudo.sh`.

## v87.2 — 17/10/2026 · moedas e gemas para testar o jogo

A pedido: moedas e gemas para testar no jogo (no site com as contas também, não só na demonstração).

- **O presente de teste vale na produção** quando o `app/public/game/config.js` pede — e o do pacote pede:
  `presente: true` dá **50.000 moedas e 5.000 gemas**, uma vez em cada aparelho e em cada conta (o id `teste-v87`: quem já
  tinha ganho o presente antigo da demonstração, o `v32`, também recebe). `presente: {id, moedas, gemas}` dá outro valor, e
  cada id novo dá de novo (até 10 milhões de moedas e 1 milhão de gemas). **No lançamento, apague a linha** (ou
  `presente: false`): o jogo volta a começar com 500 moedas e 25 gemas. A demonstração continua igual (o `v32`, e o
  `presente: false` tira).
- A janela PRESENTE, fora da demonstração, diz que é um presente de teste (o texto da demonstração fala que ele não existe no
  lançamento).
- As moedas e as gemas só compram cosméticos (as peças da tampinha): a física e os números do jogo são os mesmos para
  todos. Elas moram no progresso do jogador (o aparelho e a cópia do progresso na conta), como sempre; a carteira do servidor
  (`app/api/racha/economia.ts`) continua sem uso.
- Arquivos: `tools/v87/v87.py` (o `presenteTeste()` e a condição do presente), `tools/v87/site.js` (o texto da janela) e
  `app/public/game/config.js`.
- Testes: `tests/v872_presente_test.py` (novo: o presente na produção com o `config.js` do pacote, uma vez só, a loja com o
  presente, o `presente: false`, o presente com outro valor e o teto, a demonstração igual) e o `tests/v87_site_test.py` (a
  conta que entra pelo jogo ganha o presente uma vez, e a janela). O `tests/comum.py` abre os outros testes como o
  lançamento (`presente: false`, a não ser que o teste diga outra coisa). A plataforma de mentira
  (`tests/v87_plataforma_falsa.mjs`) passou a entregar os arquivos ao lado da cópia de teste (o `config.js`, o `rua.js`, o
  `lobby.js`…), que antes faltavam nela.

## v87.1 — 17/10/2026 · o chute 15% abaixo da versão antiga

A pedido, depois de jogar: o PASSE, o CHUTE e o teto da bola ficaram **15% abaixo dos da versão antiga** (a v84).

- `FORCA_KICK` 250 → **212,5** (PASSE), `FORCA_POWER` 400 → **340** (CHUTE) e `LIMITE_VEL_BOLA` 55 → **46,75 u/s**, iguais no
  `backup/racha.html` (AJUSTES) e no `server/partida/fisica.js` (na v86 eram 275, 440 e 60). A bola parada sai a 21,25 e
  34 u/s (eram 25 e 40); os bots, o treino, a CURVA e as previsões usam essas constantes e acompanham sozinhos.
- Testes: o `tests/v86_chute_test.py` confere os números novos (18/18); o `tests/v78_test.py` lê as forças com meio
  (212,5); os textos do `server/partida/sala.js` e do `tests/v83_partida_test.mjs` com o teto novo.

## v87 — 17/10/2026 · tudo dentro do jogo: o site abre o jogo direto, em tela cheia

A pedido, depois de jogar no site com a plataforma: a barra de cima (a conta, o SAIR) e as abas (Perfil, Carreira,
Estatísticas, Conquistas, Inventário, Amigos, Ranking) ficavam por cima do jogo e espremiam a tela.

- **A plataforma abre o jogo direto** (`/game/racha.html`, na página inteira): `app/api/lib/vite.ts` redireciona a raiz no
  servidor; `app/src/main.tsx` faz o mesmo no modo de desenvolvimento; no `app/src/App.tsx` a raiz e os endereços
  desconhecidos levam ao jogo (`IrParaOJogo`, sem laço se o jogo não estiver no build). O jogo dentro do site, com a barra
  e as abas (o jeito de antes), continua em `/jogo-no-site`. As páginas da conta continuam no site (`/perfil`, `/amigos`…).
- **O login é o do jogo** (o da v84, com ENTRAR, CRIAR CONTA, RECUPERAR e SÓ TREINAR OFFLINE), agora **com a cara do jogo**
  (o cinza-carvão das janelas, o amarelo dos botões, o contorno de tinta, a Lilita One) e compacto no celular deitado.
- **Quem já entrou pelo site entra direto no jogo:** sem a sessão no aparelho, o jogo pergunta ao `auth.eu` pela sessão do
  site no mesmo endereço (o cookie `racha_sessao`) antes de mostrar o formulário (`RACHA84.cookie`; o jogo não guarda senha
  nem token nesse caso). O SÓ TREINAR OFFLINE já aparece enquanto ele confere e, escolhido, vale.
- **As coisas da conta pelos botões do jogo:** o que o jogo já tem (perfil, ranking, tampinha, clube, Ajustes) continua lá;
  o que só existe no site abre **por cima do jogo**, num painel com o VOLTAR AO JOGO (o jogo continua aberto embaixo, sem
  recarregar), pelos botões que já existiam: o AMIGOS do lobby e o ABRIR AMIGOS da tela AMIGOS (os amigos da conta), o ABRIR
  O PERFIL DA CONTA (o nome do cartão) e o VER PERFIL do chat. Dentro do painel, a página do site mostra só as abas da conta
  (`Layout.tsx`); o "Jogar" de lá e o Esc fecham o painel. Antes, sem o site por fora, esses botões não faziam nada.
- **SAIR DA CONTA** em Ajustes › Conta (o da v84) e, para a equipe, o **RACHA CONTROL** ao lado (abre o `/admin`).
- Depois do login pelo jogo, a conta completa vem do `auth.eu` (o XP, a patente e o cargo).
- Arquivos: `tools/v87/v87.py` e `tools/v87/site.js` (a etapa nova do build, depois da v84), `tools/aplicar_rua.py`,
  `tools/mapa_codigo.py`, `app/api/lib/vite.ts`, `app/src/main.tsx`, `app/src/App.tsx`, `app/src/components/racha/Layout.tsx`.
- Testes: `tests/v87_site_test.py` (novo, com a plataforma de mentira `tests/v87_plataforma_falsa.mjs`: a raiz leva ao jogo,
  a API tRPC com token ou cookie, as páginas da conta) — o login do jogo, entrar, as páginas por cima do jogo, o SAIR, a
  sessão do site, o RACHA CONTROL, o offline enquanto confere e o jogo sem a plataforma. O `npm run build` da plataforma não
  rodou neste ambiente (o registro do npm não responde daqui): o `App.tsx`, o `Layout.tsx` e o `main.tsx` de verdade foram
  compilados com o esbuild e testados no Chromium com stubs no lugar do react-router e do tRPC.

## v86 — 17/10/2026 · a mecânica clássica de volta, com o chute mais forte

A pedido, depois do teste da v85 no site: a mecânica da v84 de volta e só a força do chute mudada.

- **A mecânica da v84 voltou** (no jogo e no servidor): a física (o movimento que soma e corta no teto e para ao soltar, o
  chute força ÷ massa, os materiais, o giro), as quadras e as marcas, o analógico de 32 direções, os botões 1/2/3 com os
  0,02 s, o comando `button` na rede, a câmera da base, os bots, o treino e as previsões. Arquivos: `backup/racha.html`,
  `tools/partida_rua.js`, `tools/v78/bots.js`, `tools/v70/camera.py`, `tools/v70/online.{py,js}`,
  `tools/v70/interface.{py,js}`, `server/turma.js`, `server/partida/fisica.js` e `server/partida/sala.js` — os da v84 com os
  textos da v85. Saíram `server/partida/nucleo_fisica.js`, `tools/v85/FISICA_RACHA.md`, `tests/v85_fisica_test.mjs` e
  `tests/v85_sincronia_test.py`.
- **O chute:** `FORCA_KICK` 250 → **275** (PASSE), `FORCA_POWER` 400 → **440** (CHUTE), `LIMITE_VEL_BOLA` 55 → **60 u/s**,
  iguais no `backup/racha.html` (AJUSTES) e no `server/partida/fisica.js`. A bola parada sai a 27,5 e 44 u/s (eram 25 e 40).
- **Continua da v85:** os textos próprios, as chaves sem a marca e a migração das antigas (a chave do modo também:
  `racha-treino-modo-v1`), as fontes no pacote, o SÓ TREINAR OFFLINE, a imagem da favela fora, o FPS verde a 90% do alvo,
  o build reconciliado (`tools/v84/`) e o site de teste (v85.1).
- **Comentários** da mecânica que voltou sem o nome do outro jogo e sem as descrições da análise; o cabeçalho do
  `server/partida/fisica.js` diz o que ele é (o porte da física do jogo) e aponta para o `PROVENIENCIA.md`, que registra
  a origem da mecânica da v86.
- **Build:** `tools/aplicar_rua.py` sem o núcleo FR-85; o sha256 do bloco de física é o da v86 (`ad9f1d22…`).
- **Testes:** `tests/v86_chute_test.py` (novo, 18 verificações); `tests/v85_online_test.py` percebe a mecânica clássica
  (o `button`, as 32 direções e a força do PASSE e do CHUTE na sala hospedada); os testes que a v85 tinha ajustado à FR-85
  (v78, v83_sala, v83_salas_ws, servidor) voltaram aos da v84; o `tests/roda_tudo.sh` roda o v86_chute.
- **Repositório:** as duas migrações da v84 (`app/db/migrations/v84_economia.sql` e `v84_login_obrigatorio.sql`) entram no
  git — o `app/.gitignore` ignorava `db/migrations/*.sql` e elas tinham ficado de fora do GitHub na v85. O `SHA256SUMS.txt`
  (que confere o pacote da auditoria) e os logs da bateria da v85 ficaram na branch `v85-auditada`; os logs da bateria da
  v86 estão em `tests/saida/logs/`.
- Um jogo da v85 (que manda `acao`) não chuta num servidor da v86, e vice-versa: o jogo e o servidor vão juntos.

## v85.1 — 17/10/2026 · o site de teste (Render e GitHub Pages)

- `server/servidor.js`: `--visitantes` (`RACHA_VISITANTES=1`) aceita nas salas quem joga sem conta — opcional; o padrão
  continua o da v84 (só com a conta da plataforma). `/health` responde como o `/saude`.
- Raiz do repositório: `server.js` (atalho que sobe o `server/servidor.js` com o modo visitantes, para o site de teste sem
  a plataforma de contas), `package.json`, `render.yaml` (Render: `node server.js`, `/health`, modo visitantes, o GitHub
  Pages como origem permitida), `Dockerfile`, `INICIAR-NO-WINDOWS.bat`, `README.md`, `.gitignore`.
- Branch `gh-pages`: só o jogo (`app/public`), para o GitHub Pages.
- O jogo, a física e os testes são os da v85 (nada mudou neles).

## v85 — 17/10/2026 · auditoria de proveniência e reimplementação própria

Feita a partir da v84 entregue (o pacote "OKComputer", `RACHA_v84`, com o `app/public/game/racha.html` de SHA-256
`efc914cd5c3ed265f26e…`). Os detalhes, as evidências e os testes estão nos relatórios da auditoria; o resumo dos
componentes está em `PROVENIENCIA.md`.

### Build reconciliado (antes de qualquer correção)
- `tools/v84/` (novo): `v84.py`, `login_cedo.js` e `login.js` refazem como etapa do build as mudanças da v83/v84 que tinham
  sido editadas direto no jogo gerado (os textos das salas hospedadas e o login obrigatório). Com elas, o build voltou a
  gerar exatamente o arquivo entregue (mesmo SHA-256). `tools/aplicar_rua.py` ganhou a etapa `v84/v84`.

### Física própria (FR-85)
- `server/partida/nucleo_fisica.js` (novo): o núcleo da física FR-85 (números e funções), o mesmo arquivo no jogo e no
  servidor. Especificação em `tools/v85/FISICA_RACHA.md`.
- `tools/aplicar_rua.py`: cola o núcleo no jogo (marca `/*NUCLEO_FISICA*/`, `window.RACHA_FISICA`) e confere o SHA-256 dele e
  o do bloco de física.
- `backup/racha.html` (o jogo-base): o bloco AJUSTES dá nomes aos números do núcleo; o bloco PHYS chama o núcleo (movimento,
  batidas, chute, bola, analógico); quadras, marcas, saída e barreira pela regra própria; o treino, a previsão do convidado
  e o online usam as mesmas funções.
- `server/partida/fisica.js` (reescrito sobre o núcleo) e `server/partida/sala.js` (o motor das salas sobre o núcleo).
- `tools/v78/bots.js`, `tools/partida_rua.js`, `tools/v70/camera.py`, `tools/v74/campo.js`: a previsão do chute, o analógico,
  a folga da câmera e as vagas do campo na FR-85.

### Controles e protocolo
- Analógico de 256 direções (eram 32).
- Botões PASSE/CHUTE pelo gatilho da FR-85 (o último apertado vale; segurando, espera a bola; um aperto, um chute); saíram
  os estados 1/2/3 e o intervalo de 0,02 s.
- Rede: o comando `input` leva `acao` (bits: 1 = PASSE, 2 = CHUTE) no lugar de `button` — `tools/v70/online.py`,
  `tools/v70/online.js`, `server/turma.js`, `server/partida/sala.js`. Um jogo da v84 não chuta num servidor da v85.
- Câmera da base com meia-vida de 0,18 s; contador de FPS verde a partir de 90% do alvo.

### Textos, marcas e imagem
- As 20 frases distintivas iguais à tradução do jogo de referência (de 34 expressões iguais) foram reescritas (Ajustes, EDITAR HUD, clube, sala, chat).
- O nome do jogo de referência e os comentários de engenharia reversa saíram de todo o projeto (jogo, servidor, ferramentas,
  testes, documentos). O cabeçalho do `server/partida/fisica.js` que dizia "implementação original" foi corrigido.
- Chaves salvas do treino: `racha-treino-perfil-v1`, `-hud-v11`, `-som-v1`, `-campo-v1`, `-modo-v1`. `tools/v82/inicio.js` leva,
  uma vez, o que estava nas chaves antigas para as novas (no aparelho, nas gavetas das contas e na cópia antiga da conta),
  reconhecendo a chave pelo formato; `tools/v82/conta.js` aplica o mesmo mapa no QUAL PROGRESSO FICA?.
- A imagem embutida `img-favela-1v1` (sem uso e sem proveniência demonstrável) saiu do jogo-base.

### Outras correções
- Login (v84): o SÓ TREINAR OFFLINE aparece também no formulário de login e no SEM CONEXÃO (`tools/v84/login.js`). Antes, com
  o jogo servido por um endereço sem as rotas de conta (o `server/servidor.js`, um `http.server`) ou com a plataforma fora do
  ar, a tela de login não tinha saída.
- Fontes no pacote: os `.ttf` originais da Lilita One, Anton, Barlow e Barlow Condensed (OFL 1.1) em
  `app/public/game/fontes/`, com a licença e o SHA-256 de cada arquivo; o build aceita `.ttf`. O jogo não pede mais nada ao
  Google Fonts.
- `app/package-lock.json`: os 272 pacotes que apontavam para um espelho privado do ambiente de geração passaram a apontar para
  o registro público do npm (mesmos hashes de integridade).
- `tools/mapa_codigo.py` conhece a etapa v84 e o núcleo; `tools/MAPA_REDEFINICOES.md` regerado.
- A concordância dos textos trocados na auditoria ("os pontos mínimos", "a Seta da direção"; `tools/clubes_rua.js`,
  `server/clubes.js` e comentários).

### Testes
- Novos: `tests/v85_fisica_test.mjs`, `tests/v85_sincronia_test.py`, `tests/v85_online_test.py`, `tests/v85_chaves_test.py`.
- Arnês da v84, aplicado igual na v84 e na v85 para comparar: `tests/servidor_visitantes.cjs` (o servidor de verdade
  aceitando quem não tem conta, só nos testes), o SÓ TREINAR OFFLINE no `tests/comum.py`, a tela de login fechada no
  `tests/online_test.py`, a parte "0) login obrigatório" no `tests/servidor_test.js` e o `tests/plataforma_salas_test.mjs`
  na regra da v84; `tests/roda_lista.sh` guarda a saída inteira de cada teste.
- Ajustados à FR-85 (cada ajuste explicado no RELATORIO_DE_TESTES): `v78_test.py`, `v83_sala_test.mjs`, `v83_salas_ws_test.py`,
  `servidor_test.js` (o campo `acao`) e os testes que liam as chaves e os textos antigos.

### Documentos
- `PROVENIENCIA.md`, `THIRD_PARTY_NOTICES.md`, `CHANGELOG.md` (novos); `LEIA-ME.md` (seção v85, como rodar com o login,
  fontes, testes, limitações), `server/LEIAME.md` (seção v85, protocolo `acao`, física), `app/RUA.md`.
