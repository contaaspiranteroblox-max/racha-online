# RACHA · mudanças

As versões até a v83 estão descritas no `LEIA-ME.md` (uma seção por versão). Este arquivo começa na v85.

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
