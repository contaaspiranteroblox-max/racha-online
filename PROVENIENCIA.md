# RACHA · proveniência dos componentes (v86; auditoria de 17/10/2026)

> **v110 (06/11/2026): os originais saíram da pasta.** As imagens originais geradas por IA (os PNG de `tools/v74` a
> `tools/v77` e de `tools/v91`, e a `tools/v101/referencia.png`) e os scripts que recortavam peças delas (`*_kit.py`,
> `pecas.py`, `tools/v75/lobby_fundo.py`, `tools/v91/fundo.py` e `tools/v91/banners.py`) não entravam no jogo desde a v95 e
> saíram de `tools/`. Continuam no histórico do git (o commit `1b2b8c4`, a v109): os caminhos citados abaixo valem lá. Os WebP
> antigos ficam (o build ainda os usa para achar e trocar as imagens pela arte da v95). E cinco imagens que o jogo não mostra
> mais em lugar nenhum viraram um pontinho transparente no jogo publicado (`tools/v110/enxuga.py`, a lista APOSENTADAS).

> **v86 (17/10/2026), a pedido: a mecânica da v84 voltou.** A física, as quadras, o analógico de 32 direções e os botões
> da v86 são os da v84 — os que a auditoria achou montados a partir da análise do jogo de referência (a coluna "até a v84"
> da tabela abaixo) —, com só três números mudados: o PASSE (250 → 212,5), o CHUTE (400 → 340) e o teto da bola (55 → 46,75
> u/s) — 15% abaixo desde a v87.1 (na v86 eram 275, 440 e 60).
> Mudar esses números muda o jogo, mas **não muda a origem** do resto da mecânica. Os comentários do código não têm o nome
> do outro jogo nem as descrições da análise; o registro da origem é este arquivo. O resto da correção da v85 continua
> (textos, marca, chaves, imagem, fontes). A v85 (com a física própria FR-85) está na branch `v85-auditada`.

> **v91 (21/10/2026), a pedido: o visual da imagem de referência.** A imagem enviada pelo dono do jogo
> (`tools/v91/referencia.png`, 1672 × 941) tem a credencial de conteúdo (C2PA) da OpenAI ("ChatGPT / gpt-image", 20/10/2026):
> é um desenho de tela gerado por IA, não a tela de outro jogo. O que vem dela: o **fundo da tela inicial** (`fundo.webp`: a
> quadra sem os botões, com os buracos preenchidos por pedaços da própria imagem — o preenchimento por exemplos de
> `tools/v91/completa.py`, escrito aqui, sem modelo nem imagem de fora — e os lados estendidos por `tools/v91/fundo.py`), o
> **fundo das telas** (`fundo_telas.webp`, o mesmo desfocado) e os **6 banners de perfil** (`banners.webp`: recortes desse
> fundo com a luz de cada cena e o que falta desenhado por cima — as janelas acesas, o sol, os refletores, a galera, as
> bandeirinhas e o confete —,
> `tools/v91/banners.py`). O que foi **desenhado aqui**, em código: os ícones (`tools/v91/icones.svg`),
> as 8 insígnias das patentes (`tools/v91/patentes.js`), a tampinha em pé com espessura, luz e reflexo (`tools/v91/inicio.js`)
> e o modelo pronto COROA RACHA (as peças do editor de tampinhas). A arrumação da tela segue a imagem, como pedido; nenhum
> arquivo de outro jogo entra. Valem para ela as mesmas questões de decisão jurídica de baixo (a titularidade de imagens
> geradas por IA, o Cristo Redentor e a bandeira do Brasil, que também aparecem nela).

> **v95 (28/10/2026), a pedido: "deixe o jogo sem cara de IA".** As imagens que vinham das imagens geradas por IA (as da
> v74 à v77 e a da v91, com a credencial C2PA da OpenAI) **saíram do jogo**. No lugar delas entra arte **desenhada em código
> aqui**: cada imagem é um SVG montado pelos scripts de `tools/v95/arte` (`cena.py` — a quadra, o morro e as casas —,
> `logo.py`, `icones.py`, `sprite.py`, `banners.py`, `mapas.py` e `caras.py`), desenhado pelo Chromium com as fontes do jogo
> (as da licença OFL, abaixo) e guardado em WebP por `tools/v95/arte/arte.py`; o build (`tools/v95/v95.py`) troca as imagens
> antigas pelas novas, com as mesmas medidas. Nenhum modelo de imagem e nenhuma imagem de fora entram nesses desenhos. São
> trocados: o fundo da tela inicial e o das telas (v91), os fundos antigos do lobby e do perfil (v75 e v77), o letreiro RACHA,
> o banner do perfil e a folha de ícones (v77), os 22 ícones das telas (v91), os 6 banners de perfil (v91), as peças dos
> mapas — a Arena (v77) e o Estádio de noite (v74) — e as caras das tampinhas animadas CRIA, CRISTO, PITBULL, FÉ e DRAGÃO
> (v76). Os arquivos antigos continuaram em `tools/` (o histórico), sem entrar no build — os originais em PNG saíram na v110
> (ver no começo). **Os emojis da tampinha** (v95) vêm
> das três folhas de emojis que o dono do jogo enviou em 28/10/2026 (a origem delas não foi conferida aqui); entram 102, e
> ficaram de fora 27 (os personagens conhecidos e os escudos/logos de times e marcas — `tools/v95/emojis_atlas.py`). Continuam
> como decisão jurídica: a titularidade das folhas dos emojis e o Cristo Redentor (agora redesenhado em código, na tampinha
> CRISTO e no banner do Cristo). O placar minimalista, o painel dos jogadores e o sensor aceso (v95, depois do teste) são
> desenhados em código no próprio jogo (`tools/v95/hud.js` e `tools/v95/times.js`: o canvas e três ícones SVG pequenos — a
> bola, a chuteira e a luva — escritos à mão); os dois prints enviados serviram só de referência de layout, nada deles entra
> no jogo. As cores novas do Estádio e da Arena (v95, depois do terceiro teste) também são desenhadas em código
> (`tools/v95/mapas.js`: as faixas do gramado, a quadra de futsal com as áreas em "D", o círculo, a tinta descascada e as
> rachaduras); das duas imagens enviadas vieram só as cores, medidas, e a disposição das marcas — nenhum pixel delas entra no
> jogo.
>
> **v96 (29/10/2026).** As tampinhas animadas novas — as caras PIPA NO CÉU, BAILE, MARÉ, TEMPESTADE, IPÊ AMARELO, LAVA e a
> FUNDADOR (a coroa, as pedras, os louros e a fita), e as bordas ARCO-ÍRIS VIVO, OURO LÍQUIDO, COMETA e AURA DOS FUNDADORES —
> são desenhadas em código no próprio jogo (`tools/v96/skins.js`: caminhos, degradês e partículas no canvas, com o kit da v76);
> nenhuma imagem pronta, nenhuma imagem gerada por IA, nenhum personagem, marca ou obra de terceiros. O online liso
> (`tools/v96/liso.js`, `tools/v96/rede.js`) e a recuperação da fila do servidor (`server/partida/sala.js`) são código próprio.
>
> **v97 (29/10/2026), a pedido: o Rachão na Oficina.** O **Rachão** é um arquivo que o dono do jogo enviou em 29/10/2026
> (`rachao.html`, guardado como chegou em `backup/rachao.html`, sha256 `2e9ec298…`): um jogo à parte, com motor, campos, sons
> sintetizados e desenhos próprios do arquivo (o comentário dele diz "Estádios (todos originais)"). A origem do arquivo **não
> foi conferida aqui** (como as folhas de emojis da v95). O próprio código chama a física da bola e do jogador de "a do modo
> Clássico" — os números de base (o atrito da bola 0,99 e o do jogador 0,96, os raios 10 e 15, a trave 8, a força do chute 5)
> são os de um jogo de futebol de discos conhecido —; fica registrado como decisão do dono do jogo, como as outras deste
> arquivo. O que entra no RACHA é a página gerada desse arquivo (`tools/v97/rachao.py`: as fontes do pacote no lugar do
> Google Fonts — a Lilita One e a Barlow Condensed, OFL —, a trava de conteúdo e quatro ganchos pequenos no motor) e o que foi
> **escrito aqui**: a oficina de estádios (`app/public/game/rachao/estadios.js` e `.css`, com os ícones em SVG feitos à mão),
> a aba RACHÃO da Oficina e a moldura (`tools/oficina/rachao.js`, com o campinho da placa desenhado em SVG aqui). Nenhuma
> imagem pronta, nenhuma imagem gerada por IA. Depois do teste, a **ponte da física** (`app/public/game/rachao/ponte.js`)
> também foi **escrita aqui**: ela só faz contas com os números dos dois jogos (o perfil oficial do RACHA, PERFIL_V92 do
> núcleo, e o basePhys do Rachão) — nada de fora.
>
> **v99 (29/10/2026), a pedido: os chutes do Rachão nas salas personalizadas.** As **regras** da cavadinha, da cabeçada, da
> curva, do super chute, da bola no alto e do travessão vêm do Rachão (`backup/rachao.html`: `doKick`, `integrateBall`,
> `controlPlayer`, enviado pelo dono do jogo); os números de lá foram passados para a medida do RACHA (multiplicados pelo
> tamanho da tampinha ÷ o jogador de 15 px do Rachão) e **escritos aqui** no núcleo das salas (`server/partida/nucleo.js`,
> a parte cr*), sem copiar código. O resto também foi **escrito aqui**: o servidor (`sala.js`, `bot.js`, `turma.js`), o jogo
> (`tools/v99/chutes.js` e `salas.js`, `app/public/game/v99.css`) e os ícones dos botões, do cartão e do quadro da sala,
> desenhados com o código (canvas e SVG). A sala neste aparelho cola na página os arquivos do servidor do próprio RACHA.
> Nenhuma imagem pronta, nenhuma imagem gerada por IA.
>
> **v98 (29/10/2026), a pedido: as salas online do Rachão.** O motor do Rachão que roda no servidor das salas
> (`server/partida/rachao_motor.js`) é **gerado** da página do Rachão da v97 pelo build (`tools/v98/rachao_servidor.py`:
> recorta o motor da página sem mudar uma letra e põe em volta o que o Node não tem — a tela, o som); a origem dele é a do
> `rachao.html` acima. O resto foi **escrito aqui**: a partida da sala (`server/partida/rachao.js`), o quadro da rede
> (`app/public/game/rachao/quadro.js`), o online da página (`rede.js`, com o ícone da placa desenhado em SVG aqui), a sala na
> Oficina (`tools/oficina/rachao_sala.js`) e os dois modos da central (`tools/oficina/hub.js`, com a tampinha e a bola da
> chave desenhadas em SVG aqui). Nenhuma imagem pronta, nenhuma imagem gerada por IA.
>
> **v101 (30/10/2026), a pedido: "reformule o jogo neste estilo".** O dono do jogo enviou uma imagem da tela inicial à noite
> (um print do celular; guardada recortada, só como referência, em `tools/v101/referencia.png` — a origem dela não foi
> conferida aqui; ela parece gerada por IA). **Nenhum pixel dela entra no jogo**: como pedido na v95 (sem cara de IA), a arte
> nova é **desenhada em código aqui** — o fundo da tela inicial e o das telas (`tools/v101/arte/cena.py`: o céu do pôr do sol,
> o morro com o Cristo em silhueta, a favela acesa, as palmeiras, os postes, o refletor, o muro com o grafite RACHA, o bar
> com a bandeira do Brasil, a gente em silhueta, a moto, a trave, a bola e a quadra molhada), os ícones
> (`tools/v101/arte/sprite.py`) e a ilustração do cartão da OFICINA (`tools/v101/arte/oficina.py`), cada um um SVG desenhado
> pelo Chromium com as fontes do jogo (OFL, abaixo) e guardado em WebP por `tools/v101/arte/arte.py`. Da imagem vieram só a
> arrumação da tela, as cores e o que aparece na cena. O lobby, as telas e o "só o CRIAR TAMPINHA" (`tools/v101/*.js`,
> `app/public/game/v101.css`) são código próprio. Continuam como decisão jurídica, como antes: o Cristo Redentor e a bandeira
> do Brasil (desenhados em código).

Este arquivo resume de onde vem cada parte do RACHA. O detalhe está nos relatórios da auditoria: AUDITORIA_INICIAL,
RELATORIO_DE_CORRECOES, AUDITORIA_FINAL, RELATORIO_DE_TESTES e DOCUMENTO_DE_CODIGO_PROPRIO_RACHA. A auditoria comparou o
RACHA v84 com o APK de um jogo de futebol de discos para celular de terceiros (o "jogo de referência"; nome, versão e
hashes nos relatórios). Nenhum arquivo desse jogo faz parte do RACHA.

## O que vinha do jogo de referência: até a v84, na v85 e na v86

| componente | até a v84 | v85 (a correção da auditoria) | v86 (agora) |
|---|---|---|---|
| física (números) | velocidade, chutes, massas, raios, desaceleração, teto, materiais: valores do jogo de referência | FR-85: núcleo próprio `server/partida/nucleo_fisica.js` (`tools/v85/FISICA_RACHA.md`) | **os da v84**, com PASSE 212,5 / CHUTE 340 (eram 250 / 400) e teto 46,75 u/s (era 55) — v87.1; na v86, 275 / 440 / 60 |
| física (modelo) | movimento "impulso + teto + zera ao soltar"; chute "força ÷ massa"; combinação de materiais da Unity; giro | aceleração limitada; chute com velocidade de saída; tabela de batidas por par; sem giro físico | **o da v84** |
| quadras | medidas dos mapas do jogo de referência (linhas, gols, marcas, barreira da saída, posição de saída) | regra própria de quadras (FR-85, seção 5) | **as da v84** |
| analógico | 32 direções (o mesmo número do jogo de referência) | 256 direções | **32 direções** (o da v84) |
| botões | estados 1/2/3 e 0,02 s entre trocas (os do jogo de referência) | gatilho próprio em bits; o comando de rede leva `acao` | **os da v84** (1/2/3, 0,02 s, o comando `button`) |
| câmera da base | suavização 3·dt (o valor do jogo de referência; a câmera da v70 já a substituía) | meia-vida 0,18 s; a câmera ativa continua a da v70 | a da v84 (a câmera ativa continua a da v70) |
| contador de FPS | verde a partir de 57 (o limite do jogo de referência) | verde a 90% do alvo | verde a 90% do alvo (o da v85) |
| textos | 34 expressões iguais à tradução pt-BR do jogo de referência, 20 delas distintivas (EDITAR HUD, Ajustes, clube, sala, chat) | textos próprios; as frases genéricas restantes estão listadas nos relatórios | os da v85 |
| marca e rastros | o nome do jogo de referência em código, chaves salvas, ferramentas e testes; comentários de engenharia reversa | removidos; chaves `racha-treino-*` (o jogo leva os dados das chaves antigas para as novas uma vez, reconhecendo a chave pelo formato, sem o nome antigo no código) | removidos também dos comentários da mecânica que voltou; a origem fica registrada aqui |
| imagem do 1v1 da favela (v42) | imagem embutida sem proveniência demonstrável (e sem uso) | removida | removida |

## O que é próprio do RACHA (sem evidência de cópia)

* Bots (papéis de futsal, jogadas, níveis), modos (curva, ginga, vôlei, basquete, americano), treinos, tutorial, replays,
  economia, perfil, patentes, clubes, chat, salas, servidor WebSocket (`server/ws.js`, RFC 6455), regras da partida.
* Desenho procedural dos campos e do HUD (canvas), tampinhas personalizáveis, efeitos.
* Sons sintetizados no código (Web Audio): não há arquivo de áudio no projeto.
* Imagens (até a v94; desde a v95 o jogo usa a arte desenhada em código de `tools/v95/arte` — ver acima): as 6 imagens originais em `tools/v74` a `tools/v77` têm credencial de conteúdo (C2PA) da OpenAI ("ChatGPT /
  gpt-image", 15/10/2026); os kits embutidos no jogo são recortes delas feitos pelos scripts `*_kit.py`/`pecas.py`. A da v91
  (`tools/v91/referencia.png`, 20/10/2026) também; o fundo e os banners da v91 saem dela pelos scripts de `tools/v91`.
  Comparadas com as 280 texturas decodificáveis do jogo de referência (pHash e SIFT+RANSAC), nenhuma bate.

## Terceiros, com licença

* Plataforma (`app/`): React, tRPC, Drizzle, Hono, Radix/shadcn-ui, Tailwind e as demais dependências do
  `package-lock.json` (licenças MIT, ISC, Apache-2.0, BSD-2/3, 0BSD, CC-BY-4.0 e Python-2.0; nenhuma copyleft). Lista em
  `THIRD_PARTY_NOTICES.md`.
* Fontes do jogo: Lilita One, Anton, Barlow e Barlow Condensed (SIL Open Font License 1.1). Desde a v85 vêm no pacote:
  os `.ttf` originais de github.com/google/fonts, com a licença de cada família e o SHA-256 de cada arquivo
  (`app/public/game/fontes/LEIA-ME.txt`); até a v84 eram carregadas do Google Fonts.

## Ambiente de geração da plataforma

A plataforma (`app/`) foi gerada num ambiente de terceiros: o `package-lock.json` apontava 272 pacotes para um espelho privado
(`npm.mirrors.msh.team`) — na v85, apontados para o registro público, com os mesmos hashes de integridade — e o
`vite.config.ts` usa o `kimi-plugin-inspect-react` (ISC, publicado no npm, só desenvolvimento), um plugin do inspetor visual
daquele ambiente que não é preciso para publicar. O `npm ci` e o build da plataforma não rodaram aqui (o registro do npm não
responde deste ambiente).

## O que continua dependendo de decisão jurídica (não técnica)

Imagem do Cristo Redentor (tampinha CRISTO e fundos do lobby/perfil), a bandeira do Brasil em item cosmético, o rosto
amarelo da tampinha DEBOCHE, a titularidade de imagens geradas por IA e os termos de uso do jogo de referência sobre a
análise do APK — que na v86 voltam a importar também para a mecânica (os números e a estrutura dela vieram dessa análise).
Ver o DOCUMENTO_DE_CODIGO_PROPRIO_RACHA, seção 11. Esta versão não teve análise jurídica.

## Sobre a independência

**v86:** a mecânica desta versão é a da v84, não a reimplementação da v85. O DOCUMENTO_DE_CODIGO_PROPRIO_RACHA da
auditoria descreve a v85 e não cobre a física, as quadras, o analógico nem os botões da v86. O que segue vale para a v85.

A reimplementação foi feita pelo mesmo assistente de IA que analisou o jogo de referência nesta sessão de trabalho.
**Não houve separação de equipes (clean room).** A independência está na especificação escrita por metas
(`tools/v85/FISICA_RACHA.md`), na troca dos modelos e na varredura automática que confere que nenhum valor, nome ou
estrutura do jogo de referência ficou (a varredura da auditoria, entregue junto com os relatórios, fora do projeto).
