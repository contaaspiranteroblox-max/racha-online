# RACHA · proveniência dos componentes (v86; auditoria de 17/10/2026)

> **v86 (17/10/2026), a pedido: a mecânica da v84 voltou.** A física, as quadras, o analógico de 32 direções e os botões
> da v86 são os da v84 — os que a auditoria achou montados a partir da análise do jogo de referência (a coluna "até a v84"
> da tabela abaixo) —, com só três números mudados: o PASSE (250 → 212,5), o CHUTE (400 → 340) e o teto da bola (55 → 46,75
> u/s) — 15% abaixo desde a v87.1 (na v86 eram 275, 440 e 60).
> Mudar esses números muda o jogo, mas **não muda a origem** do resto da mecânica. Os comentários do código não têm o nome
> do outro jogo nem as descrições da análise; o registro da origem é este arquivo. O resto da correção da v85 continua
> (textos, marca, chaves, imagem, fontes). A v85 (com a física própria FR-85) está na branch `v85-auditada`.

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
* Imagens: as 6 imagens originais em `tools/v74` a `tools/v77` têm credencial de conteúdo (C2PA) da OpenAI ("ChatGPT /
  gpt-image", 15/10/2026); os kits embutidos no jogo são recortes delas feitos pelos scripts `*_kit.py`/`pecas.py`.
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
