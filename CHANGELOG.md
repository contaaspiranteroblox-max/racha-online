# RACHA · mudanças

As versões até a v83 estão descritas no `LEIA-ME.md` (uma seção por versão). Este arquivo começa na v85.

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
