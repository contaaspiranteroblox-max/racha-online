# RACHA 2.0 — Implantação e Configuração

Sistema completo de contas, perfis, carreira, níveis, IDs, verificados e painel admin seguro para o jogo RACHA.

## O que foi entregue

| Sistema | Como funciona |
|---|---|
| **Contas** | Registro/login com usuário + senha (hash scrypt, nunca texto puro). Sessões de 30 dias com revogação. Recuperação por código único (mostrado 1 vez no registro). |
| **IDs** | ID público numérico sequencial (000001, 000002...) gerado **só pelo servidor** (incremento atômico, nunca reutilizado) + UUID interno para relações do banco. ID 000001 reservado ao Dono via seed. |
| **Perfil (Cartão do RACHA)** | Avatar, banner, moldura, título, cor de destaque, nível, barra de XP, skin em destaque, emblemas, estatísticas, 3 conquistas favoritas. Edição validada no servidor (só equipa o que possui). Perfil público por ID ou nome, com privacidade (perfil público/privado). |
| **Carreira** | Níveis 1–100 com 12 títulos da rua (configuráveis em `contracts/racha.ts`), curva de XP, barra de progresso, jornada completa, próxima recompensa, histórico de evolução, recompensas por marco (níveis 10/20/30/40/50/60/80/100 + molduras 5/15/30/70). |
| **XP** | Concedido **apenas pelo servidor** por eventos legítimos: partida válida (participação, vitória, empate, gols, assistências, ginga) e gols de treino (teto 10/dia, espelhando o jogo). Tetos: 250 XP/partida, 3.000 XP/dia em partidas. **Não existe endpoint de "adicionar XP".** |
| **Estatísticas (Minha Carreira)** | Partidas, V/D/E, gols, assistências, defesas, dribles, fintas, gols de ginga, sequências, modo favorito, aproveitamento, média de gols, histórico recente. Só eventos validados pelo servidor. |
| **Conquistas** | 10 conquistas com emblemas visuais próprios, desbloqueadas no servidor (Primeiro Racha, Primeiro Golaço, 100/500/1000 gols, Rei da Tabela, Ginga Brasileira, Invicto, Veterano, Lenda do RACHA). Até 3 destacadas no perfil. |
| **Inventário** | Skins, banners, molduras, títulos, emblemas e efeitos com raridade, origem e data. Equipar valida posse no servidor. Histórico de recompensas. |
| **Selos** | Verificado, Criador, Parceiro, Equipe — aparecem no perfil, busca, amigos e ranking. Concedidos/removidos só por quem tem a permissão `gerenciar_selos` (Dono, por padrão). Selo ≠ cargo: verificado não abre o painel. |
| **Amigos** | Busca por ID/nome (com rate limit anti-varredura), pedidos, aceite/recusa, bloqueio, denúncia, configurações de privacidade. |
| **RACHA CONTROL** | Painel admin com login próprio + **2FA TOTP obrigatório**, cargos (Dono/Administrador/Moderador/Ajudante) com permissões e hierarquia, gestão de jogador por ID (conceder/revogar itens, selos, punições), denúncias, distribuição individual/grupo/global (idempotente, sem duplicação), auditoria completa (operador, alvo, ação, data, resultado). |
| **Ponte jogo↔servidor** | O HTML do jogo recebeu **apenas adições** (4 ganchos try/catch + 1 tag de script). Nenhuma linha da física foi alterada — verificado por diff (0 linhas removidas/modificadas). |

## Subindo o projeto

```bash
cd app
npm install
npm run db:push      # cria as tabelas (MySQL/TiDB via DATABASE_URL do .env)
npx tsx db/seed.ts   # catálogo + conta do Dono (ID 000001) — v88.1: sem RACHA_OWNER_PASSWORD, sorteia a senha e mostra uma vez
npm run build        # gera dist/
npm start            # sobe em http://localhost:3000
```

Desenvolvimento: `npm run dev` (HMR na porta 3000).

**v87 — o site abre o jogo direto.** A raiz (`/`) leva ao jogo em tela cheia (`/game/racha.html`): o login é o do jogo e as
coisas da conta ficam nos botões dele (as páginas `/perfil`, `/amigos`, `/carreira`, `/estatisticas`, `/conquistas`,
`/inventario`, `/ranking` e `/jogador/:id` continuam aqui e o jogo as abre por cima dele, num painel). O jogo dentro do
site, com a barra e as abas, ficou em `/jogo-no-site`; o painel administrativo continua em `/admin`. Para atualizar um
servidor que já está no ar: `git pull`, `npm install`, `npm run build` e reiniciar o `npm start`.

**v87.2 — moedas e gemas de teste.** O `public/game/config.js` vem com `presente: true`: o jogo dá 50.000 moedas e 5.000
gemas uma vez em cada aparelho e em cada conta, para testar a loja. No lançamento, apague a linha (ou `presente: false`) e
rode o `npm run build` de novo — o `config.js` vai para o `dist/public/game` no build.

## Variáveis de ambiente

| Variável | Uso |
|---|---|
| `DATABASE_URL` | gerada pelo init — **não alterar** |
| `RACHA_OWNER_USERNAME` | usuário do Dono quando a conta 000001 é criada (padrão: `dono`) |
| `RACHA_OWNER_PASSWORD` | **v88.1:** a senha do Dono (a conta 000001). A cada início da plataforma, a senha do Dono passa a ser esta (8 a 100 caracteres; se mudou, as sessões antigas do Dono caem e o 2FA do painel é zerado). A senha do manual de antes (`Racha@Dono1`) **não abre mais** o painel nem a conta do Dono |
| `RACHA_CADASTRO` | **v88.1:** `aberto` ou `fechado` — só vale enquanto o Dono não escolheu no painel (RACHA CONTROL › Contas). Sem ela: **fechado** (só o Dono cria contas) |
| `RACHA_VISITANTES` | **v88.2:** sem ela, as salas aceitam quem joga **sem conta, só com o nome** (o JOGAR ONLINE da tela de entrada: salas, JOGAR AGORA e chat; nada que é da conta). `0` volta ao login obrigatório da v84 (só quem tem conta entra nas salas) |

## Primeiro acesso do Dono

1. Defina `RACHA_OWNER_PASSWORD` (a senha que você quer) nas variáveis de ambiente do servidor e (re)inicie a plataforma.
   O usuário é `dono` (ou o `RACHA_OWNER_USERNAME` com que a conta foi criada). Sem a conta 000001 no banco, a plataforma
   cria; com ela, a senha passa a ser a da variável. (O seed também cria o Dono com o ID 000001, selos Criador + Verificado
   e itens Fundador.)
2. Entre no painel em `/admin` com o usuário e essa senha.
3. No primeiro login, o painel mostra a chave do 2FA em grupos de 4 — no app autenticador (Google Authenticator, Authy):
   **+** › **Inserir chave de configuração**, nome `RACHA`, cole a chave, **Baseada no horário**; digite o código de 6
   números. A partir daí, todo login de painel pede o código.
4. Cadastre a equipe em **Equipe** (cada novo membro configura o próprio 2FA no primeiro login).

## v88.1 — as contas pelo Dono (RACHA CONTROL › 👤 Contas)

* **O cadastro fica fechado**: no jogo e no site, o CRIAR CONTA some (fica o aviso de que as contas saem do dono). Para
  abrir de novo (qualquer um cria a conta pelo jogo, como antes): **ABRIR O CADASTRO** na aba Contas.
* **Criar a conta de um jogador**: aba **👤 Contas** (só a conta do Dono, a 000001, vê) › CRIAR CONTA (usuário, nome no jogo, e-mail opcional, senha
  opcional — em branco, o servidor gera). O usuário e a senha aparecem **uma vez**: toque em COPIAR PARA MANDAR e envie
  para o jogador. Esqueceu? **SENHA NOVA** na lista (a conta sai de todos os aparelhos e ganha um código de recuperação novo).
* **Zerar as contas e os IDs**: só a conta 000001. Antes, faça um **backup do banco** (o zerar não tem volta). Na aba
  Contas › ZERAR CONTAS: a sua senha + a palavra `ZERAR`. Apaga todas as outras contas e o que era delas; você continua
  000001 e **a próxima conta criada é a 000002**. Quem estiver jogando com uma conta apagada cai das salas na hora.
  Se o servidor das salas roda **separado** da plataforma (`node server/servidor.js` com `RACHA_DADOS`), ele não fica
  sabendo do zerar: desligue-o, apague o arquivo de `RACHA_DADOS` e ligue de novo (montado na plataforma, o padrão, ele
  já esquece sozinho).
* Nada de migração: o cadastro, o contador e a hora do zerar ficam na tabela `contadores` que já existe.

## Segurança implementada (seção 15 do design)

- Hash scrypt com sal; tokens de sessão guardados só como SHA-256; sessões de painel curtas (8h) e separadas das de jogo.
- 2FA TOTP obrigatório para qualquer cargo; sessão de painel sem 2FA não executa nada.
- RBAC com hierarquia: ninguém altera o próprio cargo/permissões, ninguém age sobre cargo igual/maior, conta do Dono protegida, autoelevação bloqueada.
- Verificação de autorização em cada operação admin + auditoria de todas as ações críticas.
- Rate limit persistente em registro, login, painel, 2FA, buscas, partidas, treinos, amizades e denúncias.
- Validação de entrada (zod) em todos os endpoints; nada de chaves secretas no cliente.
- Recuperação de conta por código com hash; troca de senha revoga todas as sessões; revogação individual de sessões.

## Honestidade sobre progressão (seção 16 do design)

A simulação física roda no navegador. O servidor **não pode provar cada toque na bola** — e o sistema não finge que pode. O que ele faz de verdade:

- token de partida de uso único com validade (30 min), emitido no início;
- deduplicação por `matchId` — o mesmo resultado nunca rende duas vezes;
- validação de plausibilidade (duração, placar compatível com o tempo, gols ≤ placar, ginga ≤ gols);
- resultado recalculado no servidor a partir do placar (o campo "venceu" do cliente é ignorado);
- partidas abandonadas não rendem; tetos por partida e por dia contra farm;
- gols de treino limitados a 10/dia, como no jogo.

Isso torna a progressão resistente a adulterações triviais (editar JS/localStorage não concede XP, itens, selos nem cargos). Para rankings competitivos de alto valor, o caminho seguinte é a validação servidor-a-servidor (partidas online autoritárias) — o esquema de `partidas` já guarda os dados necessários para isso.

## Verificação

A pasta `verifier/` contém os critérios de aceite (v1, v2) e o histórico de execuções em `verifier/runs/`, incluindo:

- diff do jogo: **0 linhas alteradas** — só adições da ponte;
- `npm run check` e `npm run build` sem erros;
- suíte de API: IDs sequenciais, dedup, plausibilidade, RBAC, 2FA, idempotência, rate limit, auditoria;
- E2E com navegador real: partida contra bots → XP no servidor.

## v70 — Salas online (servidor da turma) dentro da plataforma

Em produção (`npm start`), a plataforma monta o **servidor da turma** (`server/` na raiz do projeto, sem dependências) no
mesmo endereço do site: o jogo aberto em `/game/racha.html` conecta sozinho em `ws(s)://<endereço do site>/` para as
salas online, o Chat do Brasil, os clubes da turma e a Copa dos Amigos.

* **Conta**: quem está logado entra nas salas com a conta (a sessão do cookie é conferida no aperto de mão; nome e ID
  público da conta). Visitante entra com um ID da turma.
* **Resultado online**: o servidor da turma confere o resultado (do anfitrião, da rodada certa, placar igual ao dos
  quadros, placar e tempo possíveis para o modo) e assina um **selo** para cada conta. `jogo.encerrarPartida` só dá XP
  de partida online com o selo válido (conta, lado, placar, modo, validade) e usa cada selo uma vez.
* **Origem**: o WebSocket aceita o próprio site, `localhost` e o que estiver em `RACHA_ORIGENS`.

| Variável | Uso |
|---|---|
| `RACHA_SALAS` | `0` desliga as salas no endereço da plataforma (padrão: ligadas) |
| `RACHA_SEGREDO_SALAS` | segredo do bilhete e do selo. Montado aqui, pode ficar vazio (sorteia um a cada início). **Obrigatório** se o servidor da turma rodar separado (`node server/servidor.js --segredo …`): o mesmo valor nos dois |
| `RACHA_DADOS` | arquivo JSON onde a turma guarda troféus, clubes, duelos e campeões (padrão: só memória) |
| `RACHA_ORIGENS` | outras páginas que podem conectar nas salas (separadas por vírgula) |
| `RACHA_SALAS_NOME` | o nome do servidor que aparece na sala (padrão: RACHA) |
| `RACHA_P2P` | `0` desliga a conexão direta entre os aparelhos |
| `VITE_RACHA_ORIGENS_JOGO` | (build) se o jogo for publicado em outro endereço: as origens dele que a ponte aceita |

No desenvolvimento (`npm run dev`) as salas não são montadas: rode `node ../server/servidor.js --porta 8080` e ponha
`servidor: 'localhost:8080'` em `public/game/config.js` (ou abra o jogo direto em `http://localhost:8080/game/racha.html`).

A ponte (`public/game/racha-bridge.js`) só posta para a origem do próprio jogo (ou para `RACHA_CONFIG.origensPlataforma`
do `config.js`), nunca para `*`; a página-mãe (`src/lib/ponteJogo.ts`) só aceita mensagens dessas origens e de um iframe
dela. O começo e o fim de partida chegam uma vez por partida (contra os bots, a liga e as salas).

## v82 — As contas: a patente, o ranking, o nível e o progresso do jogo na conta

**Banco.** Rode `npm run db:push` de novo: entram as tabelas `ranqueada` (a patente de cada conta: pontos, melhor, jogos,
vitórias, derrotas, empates, sequência, desistências, se já trouxe a do aparelho e o que ganhou hoje contra os bots),
`ranqueada_eventos` (cada mudança da patente, uma por partida: a referência é o `matchId`) e `progresso_jogo` (a cópia do
progresso do jogo de cada conta, com a versão), e as colunas `ranqueada`, `online`, `tamanho`, `pontos`, `gols_contra` e
`rq_delta` em `partidas`. Nada antigo muda (as partidas de antes ficam como não ranqueadas).

**A patente.** `jogo.iniciarPartida` recebe `ranqueada`, `online` e `tamanho`; `jogo.encerrarPartida` faz a conta com
`contracts/patentes.ts` (as regras do jogo) e devolve `rq` (antes, depois, delta, se subiu/caiu, se bateu no teto do dia, a
patente e o estado). Online, só com o selo do servidor das salas com `k:1` e o mesmo `n` (o tamanho) — o servidor das salas
desta versão já manda; o de antes não manda `k`, então a ranqueada online com ele não conta na patente (o XP continua).
Contra os bots: no máximo 250 pontos ganhos por dia (`RQ_LIMITES.botsPorDia`). A desistência tira 25. A ranqueada que passa
da validade do token (30 min) sem o fim conta como desistência na próxima partida que a conta começar (a resposta do
`iniciarPartida` traz `desistencias` e `rq`) ou se o fim chegar atrasado. `perfil.rankingPatentes` (as contas com perfil
público e pontos), `perfil.minhaPatente`, `perfil.importarPatente` (a do aparelho, uma vez por conta, até 799) e
`admin.ajustarPatente` (permissão de punir, com motivo, confirmação e auditoria). `auth.eu` traz `rq`.

**O progresso.** `progresso.carregar` e `progresso.salvar({versaoBase, dados, aparelho})`: a cópia das 10 chaves de progresso
do jogo (`contracts/progresso.ts`: até 256 KB, 160 KB por chave; tokens, replays e ajustes do aparelho não vão), gravada só
se a versão de base for a de agora (senão volta `conflito` com a cópia da conta e o jogo pergunta qual fica). Limite: 60
gravações em 10 min por conta.

**A ponte** (`src/lib/ponteJogo.ts`, `RACHA_JOGO.versao = 82`): `conta()` com o nível e o XP da conta (`nivelInfo`) e a
patente; `progresso` (`inicial`, `carregar`, `salvar`); `patente` (`minha`, `ranking`, `importar`); `ouvir(fn)` (os avisos
`conta`, `resultado` e `desistencia`); `RACHA_ABRIR('/entrar')` e `('/entrar?aba=criar')`. O iframe do jogo só abre depois de
saber quem está logado e, logado, com a cópia do progresso (ou 3 s de espera), e abre de novo a cada troca de conta. O fim de
partida que chega antes da resposta do começo espera o token. A página de entrar aceita `?aba=criar`.

## v83 — A partida autoritativa no servidor e a correção das permissões

**Banco.** Nada muda: **não precisa rodar `db:push`**. A partida autoritativa termina com o mesmo **selo** que a plataforma
já confere no `jogo.encerrarPartida` (o servidor das salas assina com `k:1` na ranqueada e o `n` do começo, como a v82 já
espera) — XP, patente e ranking funcionam sem mudança no código da plataforma nem no banco.

**O servidor das salas** (`server/`): entra a pasta `server/partida/` (`fisica.js`, `partida.js`, `gerente.js`) — a partida
autoritativa: o servidor simula a física (passo fixo de 60/s com as constantes do jogo), é dono do placar e do relógio
(3:00, 3 gols acabam na hora, empate no 1 × 1 e no 2 × 2, prorrogação só no 0 × 0 até 2:00 com gol de ouro), manda quadros a
20/s e confere cada comando (sequência só para frente, teto de 120/s, direção do joystick, chute com 33 ms mínimo e só no
alcance). As suspeitas ficam **registradas no registro do servidor para investigação** (partida, jogador, horário) — sem
banimento automático. As salas de sempre (o anfitrião simula) continuam iguais; o caminho novo é o protocolo `auto_*`
(documentado no `server/LEIAME.md`). O jogo (racha.html) **não mudou** nesta versão: a entrada dele nas partidas
autoritativas (com previsão no aparelho) é a próxima etapa. Em produção, como a plataforma monta este mesmo servidor
(`api/lib/salas.ts`), a partida autoritativa já sobe junto — sem configuração nova. Teto de 100 partidas autoritativas
simultâneas por processo (`MAX_SALAS_AUTO` em `server/partida/gerente.js`); para mais, suba mais processos atrás de um
balanceador com afinidade de conexão (cada partida mora num processo só).

**As salas 100% hospedadas (etapa final da v83).** Agora **toda** partida online das salas de sempre — pública, privada
por código e ranqueada — é simulada no servidor (`server/partida/sala.js` + `server/partida/bot.js`, integrados ao
`server/turma.js`). Nenhuma partida usa mais a física do aparelho: o `room` anuncia `host:'srv'`, `servidor:true` e o
`admin` (o criador; `null` na ranqueada), todos mandam `input` e recebem os mesmos `snapshot` a 30/s no formato clássico,
e quem cai é substituído por um bot na hora (90 s de reserva para voltar no mesmo lugar; só o cargo de admin muda de mão).
O resultado nasce do servidor e segue o caminho de conferência e selo de sempre — **plataforma e banco não mudam** (o
`db:push` continua desnecessário). O jogo (racha.html) teve só 3 ajustes mínimos (a copa e o início reconhecem a sala
hospedada); a predição, a reconciliação e a interpolação que o convidado já usava passam a valer para todos. Em produção
vale a mesma observação acima: a plataforma monta este mesmo servidor, então as salas hospedadas sobem juntas, sem
configuração nova. O custo medido (3 partidas simultâneas + as anteriores, no teste `v83_salas_ws_test.py`): ~3% de um
núcleo, ~61 MB de RAM e ~9 KB/s de banda por jogador — escala bem além disso, mas **não medimos** centenas de partidas
simultâneas nem milhares de conexões; antes de prometer capacidade alta, repita a medição no hardware de produção.

**A correção das permissões** (`api/racha/guard.ts`, o `cargoDo`): o ajuste fino do RACHA CONTROL (`admin.definirPermissoes`)
**não tinha efeito** desde que existiu — a função sempre devolvia o conjunto padrão do cargo. Agora a lista ajustada
**substitui** o padrão (filtrada pelo teto do cargo, como o `adminRouter` já grava); `null` continua significando "sem
ajuste" e o dono continua com o conjunto cheio. Testada em `tests/guard_test.mjs` (compila o guard.ts de verdade com o banco
fingido: rode `node tests/compila_guard.cjs` antes). Se você já tinha "ajustado" permissões de alguém no painel e estranhar
a pessoa perder acessos, é a correção fazendo efeito — revise os ajustes salvos.

## v88 — A atualização completa dos menus (amigos, mensagens, correio, loja, missões, passe, eventos, estatísticas, clube, denúncias, conta)

**Banco (obrigatório).** Faça o backup e rode `npm run db:push` (o `db/schema.ts` descreve tudo) **ou** aplique à mão
`db/migrations/v88_social.sql` (precisa da `v84_economia.sql` antes; o arquivo traz o backup, o aplicar e o rollback).
Entram as tabelas `mensagens`, `correio`, `correio_global`, `missoes_progresso`, `eventos`, `eventos_progresso`,
`passe_temporada` e `clube_pedidos`, e as colunas da privacidade (`mostra_online`, `aceita_convites`), dos cosméticos
equipados, da bio, da exclusão de conta, do melhor da partida e de quem jogou junto (`partidas`), do contexto das denúncias
e o papel `admin` no clube. Nada antigo é apagado.

**A carteira passou a ser a da conta.** Logado, as moedas, as gemas e os itens moram no servidor (`carteiras`,
`transacoes`, `itens_usuario`): o jogo só mostra — ganhar e gastar passam pela plataforma (as partidas, o treino, as
missões, o passe, o correio, a loja, a troca de gemas e as peças da tampinha), sempre numa transação e sem confiar em valor
mandado pelo aparelho. Na primeira vez de cada conta, o saldo da cópia do progresso (a da v82) entra uma vez, até 50.000
moedas, 5.000 gemas e 200 peças (`MIGRACAO_TETO` em `api/racha/economia.ts`). Tetos do dia: 4.000 moedas de partidas e
1.500 do treino (`app/contracts/v88.ts`). Sem conta (SÓ TREINAR OFFLINE), a economia do aparelho continua a de sempre.

**O catálogo** (`contracts/catalogo88.json`) é o mesmo arquivo para o jogo e para o servidor: o build do jogo
(`python3 tools/aplicar_rua.py`) cola ele no `racha.html`. Mudou um preço ou um item: rode o build do jogo **e** o
`npm run build`, e publique os dois juntos.

**Variável nova** (opcional, só para teste): `RACHA_PRESENTE_TESTE=1` põe no correio de cada conta, uma vez, a carta
"Presente de teste" com 50.000 moedas e 5.000 gemas (`RACHA_PRESENTE_TESTE=100000,10000` para outro valor). No lançamento,
não defina. (O `presente` do `public/game/config.js`, da v87.2, só vale para a economia do aparelho, sem conta.)

**O servidor das salas montado aqui** (`api/lib/salas.ts`) já recebe o que o social ao vivo precisa (as relações da conta
vindas do banco e a denúncia de mensagem indo para a tabela `denuncias`): nada para configurar. Se você roda o servidor
das salas separado (`node server/servidor.js --segredo …`), as relações vêm assinadas no bilhete da conta e as denúncias de
mensagem ficam só no registro daquele servidor.

**RACHA CONTROL** (`/admin`, o mesmo login com 2FA): as abas novas **📅 Eventos** (criar, editar, ligar/desligar; os
padrões — login diário, desafio da favela, copa dos amigos, temporada — entram sozinhos) e **✉️ Correio** (carta para uma
conta ou para todos, com moedas, gemas, um item e XP do passe; aviso do sistema; as cartas para todos). Permissões:
`gerenciar_eventos`, `enviar_itens` e `distribuir_global`; cada ação vai para a auditoria. As denúncias novas (pelo perfil,
pelo resultado e pelas mensagens do chat, com o motivo e o texto da mensagem) caem na aba **🚩 Denúncias** de sempre.
As abas novas foram conferidas só pela sintaxe (o site não compila nesta máquina); as rotas por trás delas (`admin88.*`)
foram testadas na plataforma de teste (`tests/v88_plataforma_test.mjs`).

**Atualizar um servidor no ar:** backup do banco → `git pull` → `npm install` → `npm run db:push` (ou o SQL) →
`npm run build` → reiniciar o `npm start`. O jogo e a plataforma vão juntos na mesma versão (o jogo da v88 chama as rotas
novas; um jogo antigo continua funcionando com a plataforma nova, sem as telas novas).

**Testar sem MySQL** (o código de verdade da plataforma num SQLite, sem `npm install`): `node tests/plataforma/servidor.mjs
--porta 8099 --teste --banco /tmp/racha88.db` sobe a plataforma de teste com o servidor das salas montado e o jogo em
`http://localhost:8099/game/racha.html`; `node tests/v88_plataforma_test.mjs` e `python3 tests/v88_cliente_test.py` usam ela.
