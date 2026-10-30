# RACHA · OFICINA DE CRIAÇÃO 2.0 — o editor de mapas e a comunidade (com a v93 e a v94), o Rachão (v97) e as salas online do Rachão (v98)

A **Oficina** é o lugar do RACHA onde você cria mapas, testa na hora, joga online com a galera em salas com o seu mapa
(até **4 times**) e publica para a comunidade. Ela entra no jogo de sempre **sem mudar nada do que já existia**: a física
oficial, a ranqueada, as salas comuns, as contas, a progressão, os controles e o multiplayer continuam iguais (o build confere
o bloco da física: `sha256 ad9f1d22…`). Os mapas da Oficina só valem nas salas da Oficina e no TESTAR — o resultado delas
**não conta** para a ranqueada, o XP, os troféus nem o ranking.

**Nesta versão** (28/10/2026): tudo o que veio na v93 e na v94 do RACHA está no jogo, e a Oficina ganhou o que a v93 trouxe
para as partidas — a **contagem 3, 2, 1, JÁ!**, o **cartão de quem fez o gol**, os **balões de fala rápida** e o **craque da
partida** — e a **bola equipada** como estilo de bola. Saíram o exportar e o importar (fica só **editar, salvar e publicar**);
cada jogador tem até **3 mapas públicos**; o cartão da comunidade **curte e favorita** na hora; e o JOGAR dos mapas virou o
**CRIAR SALA**, com a **física da sala** (o tamanho da bola, os chutes, as tampinhas…). A física do jogo só se ajusta aí: nas
salas da Oficina, escolhida por quem cria a sala.

## Onde fica

- **No jogo:** o botão roxo **OFICINA · CRIE SEUS MAPAS** na tela inicial (entre a coluna da esquerda e a tampinha).
- **A central** (a tela de entrada) tem dois **modos**, na chave **RACHA | RACHÃO** do topo (v98; o modo fica guardado no
  aparelho). O **CRIAR** pergunta o que criar: um **mapa do RACHA** ou um **estádio do Rachão** (e leva para o modo dele).
- **No modo RACHA:** **Meus mapas**, **Em desenvolvimento**, **Comunidade**
  (Mais jogados, Mais curtidos, Novidades, Competitivos, Criativos, Treinamento, Minigames e Escolha da comunidade — e as
  salas abertas com mapa da Oficina), **Populares**, **Recentes**, **Favoritos**, **Oficiais** (os 15 modelos do RACHA,
  que funcionam sem internet, e os mapas que a equipe marcou), **Compartilhados** (onde você é colaborador) e a
  **busca** por nome, criador, etiqueta ou o **código de 7 letras**. O botão **SALA** entra numa sala pelo código dela.
  A aba **Moderação** só aparece para a equipe.
- **No modo RACHÃO:** **Estádios** (o futebol de física e a oficina de estádios dele — abaixo) e **Salas online** (v98: as
  salas do Rachão — abaixo).

A Oficina funciona na horizontal, como o jogo (no celular em pé aparece o aviso de girar de sempre). Sem o servidor das salas,
tudo o que é do aparelho continua funcionando (criar, editar, salvar e testar); a comunidade, publicar e as salas online
precisam dele. (O exportar e o importar de arquivo saíram: um mapa vai para outro aparelho ou para outra pessoa
**publicado** — pode ser como não listado ou privado.)

## As salas online do Rachão (v98)

A pedido: *"deixe separado o RACHA e o Rachão… porém dá pra criar sala de Rachão também online"*. A aba **Salas online** do
modo RACHÃO tem o **CRIAR SALA**, o **ENTRAR COM CÓDIGO** e a lista das salas abertas do Rachão (na lista do GALERA elas
aparecem com a etiqueta **RACHÃO**). O CRIAR SALA abre a tela **Sala online** do próprio Rachão: o **campo** (os 17 ou um
estádio seu), o **tamanho dos times** (1x1 a 7x7), **Partida** ou **Caos**, o **nível dos bots**, o **tempo**, os **gols**, a
**corrida**, os **chutes extras**, as **vagas vazias** (os bots completam ou só gente) e a sala **aberta** ou **fechada**.
A sala é a tela de sala da Oficina, com **Vermelho × Azul**; o admin tem os **AJUSTES** (a mesma tela do Rachão; se o
estádio da sala não está entre os dele, ele aparece como **Da sala**, só ali), passa o admin, muda os lugares e ENCERRA.

No **COMEÇAR**, o Rachão abre por cima da Oficina nos aparelhos de todos, com a contagem do servidor. Quem joga a partida é o
**servidor das salas**, com o motor do Rachão gerado da página (`server/partida/rachao_motor.js`, pelo
`tools/v98/rachao_servidor.py`; a partida da sala em `server/partida/rachao.js`); cada aparelho manda o comando de cada
passo e **prevê** a própria tampinha e a bola com o mesmo motor (`app/public/game/rachao/rede.js`, com o quadro de
`quadro.js`, o mesmo nos dois lados). Quem cai vira bot e volta para o mesmo lugar; quem assiste não tem os botões. Fechar
no meio: **VOLTAR PARA A PARTIDA** na sala; no fim, **VOLTAR PARA A SALA**. A página do Rachão continua sem conexão
nenhuma: a conexão é a do RACHA e a Oficina passa as mensagens (`tools/oficina/rachao_sala.js`). **Para valer, o servidor
das salas precisa ser atualizado** (o novo diz no hello que tem as salas do Rachão; com o antigo, o CRIAR SALA avisa).

## O Rachão (v97)

O **Rachão** é o futebol de física que o dono do jogo enviou em 29/10/2026 (um jogo à parte, com o motor dele: 17 campos e 8
modos — contra bots, caos, 2 jogadores, treino, pênaltis, cabeçada, vôlei de praia e minigolfe). Ele entra **do jeito dele**:
a aba **Estádios** do modo RACHÃO (na v97, a aba Rachão) mostra a placa de entrada (**JOGAR O RACHÃO**, **SALA ONLINE** —
v98 —, **CRIAR ESTÁDIO**, **COLAR CÓDIGO**) e os seus estádios (**EDITAR** e **JOGAR**), e o Rachão abre **por cima da
Oficina**. Para voltar: o **‹** do editor, da lista ou da preparação da partida (quem veio da Oficina volta para ela), o
**VOLTAR PARA A OFICINA** da tela inicial do Rachão ou o Esc. Com o Rachão aberto, o celular pode ficar em pé. Os modos do
Rachão rodam inteiros no aparelho (o online é só o das salas, acima); os estádios ficam no aparelho, até 40 — para levar a
outro aparelho ou mandar para alguém, o **código** do estádio, `RACHAO1.…` (numa sala online, o estádio vai junto).

**A oficina de estádios** (a placa **Oficina de estádios** na tela inicial do Rachão, ou CRIAR ESTÁDIO na central):

- **Começar** do zero (o gramado liso) ou a partir de um dos 17 campos (as cópias espelhadas do campo viram uma peça com
  espelho, como foram feitas).
- **No campo**: o **poste**, o **para-choque** (com a força do empurrão), o **vaso**, a **cerca viva** (comprimento, grossura e
  inclinação), a **lama** e a **poça** (quanto seguram a bola, a velocidade e o freio de quem pisa). Tocar põe, arrastar
  move, as bolinhas brancas esticam (e giram a cerca), APAGAR tira. O **ESPELHO** de cada peça: só uma, dos dois lados, em cima
  e embaixo, nos 4 cantos ou do outro lado girada. O **ÍMÃ** prende de 10 em 10, na linha do meio e o giro de 15 em 15°; os
  **TIMES** mostram onde cada um começa. Desfazer e refazer; no teclado, Ctrl+Z, Ctrl+Y, Ctrl+D (duplicar), Delete e as setas.
- **As abas**: **Campo** (retângulo, oval ou rinque; o comprimento e a largura; os cantos retos, redondos ou cortados — o
  tamanho e o canto que devolve a bola —; o círculo do meio; a área de fora), **Gols** (a largura, o fundo da rede, a distância
  da tabela no rinque, as traves — traves, chinelos ou bambu — e o fundo: rede, portão ou buraco no muro), **Piso** (17),
  **Física** (11 prontas e os valores um a um, cada um com o "padrão"; e o **MISTURAR COM O RACHA**, abaixo), **Chutes** (a
  cavadinha, a curva e o super chute ligam e desligam; **SÓ O CHUTAR** tira os três — o modo clássico), **Vento** (a força, de
  quanto em quanto tempo muda e para onde sopra), **Poderes** (quais dos 10 aparecem, o intervalo e "também no Contra bots") e
  **Partida** (o nome, a descrição, os tamanhos de time e os gols para vencer).
- **Os chutes do estádio** valem em todo modo jogado nele: o chute desligado some da partida (o botão sai da tela), os bots
  também não usam e a preparação da partida mostra a opção travada, explicando. O cartão do estádio diz SÓ O CHUTAR (ou o
  que não tem).
- **Avisos** do que atrapalha o jogo, o **salvamento automático**, o **TESTAR** (bate-bola, 1x1 ou 2x2 rápido) e o **JOGAR**
  (Contra bots, 2 jogadores ou Caos: a preparação do modo já com o estádio). Os estádios valem em todos os modos vistos de cima (Contra bots, Caos, 2
  jogadores e o treino livre), na frente da lista de campos, com o selo SEU.

**Misturar a física dos dois jogos** (depois do teste): no Rachão, a aba Física tem o **MISTURAR COM O RACHA** — a **bola**, o
**jogador** e o **chute**, cada um do Rachão ou do RACHA; no RACHA, a física do mapa (aba Física do editor) e a física da sala
(CRIAR SALA e os AJUSTES do admin) têm o **MISTURAR COM O RACHÃO** — a **bola**, a **tampinha** e o **chute**. Cada parte vem
com o **jeito** do outro jogo, medido pelo tamanho do jogador (a ponte da física, `app/public/game/rachao/ponte.js`, a mesma
nas duas páginas): a bola do RACHA é metade do jogador, pesa 8 jogadores no contato (gruda no pé), quica 65% na parede e
tem teto de velocidade; a do Rachão é dois terços do jogador, leve (quica no pé), quica a metade e não tem teto. O jogador do
RACHA arranca e para na hora (o **jeito de andar direto**, que o Rachão ganhou) e não corre; o do Rachão embala aos poucos e
desliza ao soltar. O chute do RACHA é um pouco mais fraco que o do Rachão. Uma parte não mexe nas outras (a bola mais
pesada não deixa o chute mais fraco: a força acompanha) e os números embaixo mostram o que mudou. O que um jogo não tem fica
de fora: o RACHA não tem a bola no alto nem a corrida; o Rachão não tem o PASSE (no RACHA, o passe acompanha o chute).
No RACHA vale só na Oficina (o mapa, o TESTAR e a sala com o mapa): a ranqueada e as salas comuns continuam com a física
oficial. Para a tampinha com o embalo do Rachão valer igual nas salas online, o **servidor das salas precisa ser
atualizado** (a arrancada agora vai até 0,02; o servidor antigo corta em 0,05 — a sala fica um pouco mais arrancada, igual
para todos).

Os arquivos: o original fica em `backup/rachao.html` (como chegou); a página é gerada por `tools/v97/rachao.py` (as fontes
do pacote no lugar do Google Fonts, a trava de conteúdo sem conexão para fora e quatro ganchos pequenos no motor — a cerca
inclinada, o vento e os poderes do estádio e o Golzão do tamanho do estádio —; depois do teste, os chutes do estádio, o
teto da bola, o peso e o quique no pé e o andar direto, com os bots — que com os 17 campos deixam tudo igual: o teste joga
as 51 partidas com o motor original e com o da página e dá o mesmo número por número) em `app/public/game/rachao/rachao.html`,
com a ponte da física e a oficina de estádios ao lado (`ponte.js`, `estadios.js` e `estadios.css`); a aba e a moldura
ficam em `tools/oficina/rachao.js` e o misturar do RACHA em `tools/oficina/paineis.js` (mapa) e `sala.js` (sala).

## Criar um mapa

**Do zero:** o nome, o tamanho — **Mini** (56×40 u), **Pequeno** (71×50), **Médio** (86×70), **Grande** (108×90),
**Gigante** (150×100) ou **Personalizado** (16–220 × 12–160 u) — e o formato: **retangular, quadrado, circular, octogonal,
arena (cantos redondos), com paredes, aberto, assimétrico ou livre**. (1 u = 19 px do jogo: o Pequeno é o campo das salas.)

**Dos modelos (15):** Campo Clássico RACHA, Mini Arena X1, Futsal Brasileiro, Arena Circular, Campo Gigante, Arena de
Quatro Gols, Campo com Obstáculos, Campo de Treinamento, Labirinto de Bola, Arena Neon, Futebol de Rua, Quadra de Favela,
Arena Técnica, Campo Assimétrico e Mapa Vazio. Todo modelo vira um rascunho seu, editável.

## O editor

- **Em cima:** voltar, o nome (toque para renomear), salvo há…, **desfazer**, **refazer**, **salvar**, **TESTAR** e o
  **⋮** (publicar, teste multiplayer privado, **criar sala** — fechada, com o rascunho e a física da sala —, validar,
  versões, duplicar, configurações do mapa).
- **À esquerda, as ferramentas:** selecionar e mover · arrastar a câmera · parede reta · parede curva · obstáculo retangular ·
  obstáculo redondo · zona · linha de pontos · polígono livre (o polígono vira obstáculo, zona, decoração ou o **contorno do
  campo**) · **lançar a bola** · a **biblioteca**. (No celular deitado, as ferramentas ficam em duas colunas, todas à vista.)
- **À direita, o painel** (recolhe no botão de baixo, à direita): com algo selecionado, as **propriedades** só do que vale para
  o tipo (posição X/Y, tamanho, rotação, cor, opacidade, colisão, elasticidade, atrito, movimento, velocidade, visibilidade,
  ativo, bloqueado…, com deslizante + número e as cores rápidas); sem seleção, as abas do mapa: **Campo**, **Aparência**,
  **Física**, **Partida**, **Lógica**, **Camadas**, **Spawns** e **Validação**.
- **Embaixo:** biblioteca, grade, encaixar (na grade e nas guias), seleção múltipla, zoom −/+, ver o mapa inteiro, camadas
  e, com algo selecionado, duplicar, excluir, copiar, girar 15°, espelhar na horizontal/vertical, **copiar para o outro
  lado**, **repetir**, trazer para a frente/mandar para trás, agrupar, alinhar (esquerda, centro, direita, em cima, meio,
  embaixo), distribuir (horizontal/vertical), desagrupar, bloquear e ocultar.
- **Toque:** um dedo seleciona e arrasta (ou desenha com a ferramenta); **segurar** um objeto liga a seleção múltipla; arrastar
  no vazio faz a **caixa de seleção**; **dois dedos** dão zoom e mexem a câmera. As **alças**: o círculo azul gira (de 15 em
  15° com o encaixe), os quadrados mudam o tamanho, os amarelos são os pontos do polígono e o **+** no meio de um lado põe
  um ponto novo (numa peça pequena na tela, o dedo no meio dela move a peça; no quadradinho, estica). **Mouse e teclado:**
  roda = zoom, botão do meio ou Espaço = câmera, Shift soma à seleção, Ctrl+Z / Ctrl+Y, Ctrl+C / Ctrl+V / Ctrl+D, Ctrl+S,
  Del, setas (Shift = 5×), G agrupa, R gira, F mostra tudo, V/H/W/A/C/Z/L/P/B as ferramentas.

### Sentir o mapa antes de jogar (as ferramentas novas)

- **LANÇAR A BOLA** (a ferramenta da bola com a seta, ou a tecla **B**): ponha o dedo onde a bola começa e arraste para onde
  ela vai — quanto mais longe, mais forte (até a força do **CHUTE** do jogo; a etiqueta mostra "62% do chute · 21 u/s").
  **Antes de soltar**, a linha pontilhada mostra o caminho inteiro, com um anel em cada batida e o **GOL** (ou o **FORA**)
  onde a bola termina. Soltou, a bola corre de verdade no **motor do mapa** — o mesmo da partida e do servidor: paredes,
  curvas, obstáculos, zonas, portais, portões, botões, a lógica e os objetos que andam (que se mexem ao vivo enquanto ela
  corre) — deixa a trilha, marca as batidas e mostra **GOL!** no gol de quem foi. Só a bola: ninguém em campo e as regras de
  fim (tempo, meta) não contam. Mexeu no mapa ou trocou de ferramenta, a bola de teste some.
- **COPIAR PARA O OUTRO LADO:** a cópia espelhada da seleção do outro lado do campo, com os times trocados — o gol, o spawn,
  a zona e o botão do Time A viram do Time B (e a cor do time troca junto), a zona que empurra para um lado empurra para o
  lado espelhado, o par de portais continua um par. O que está no meio do campo fica como está (já vale para os dois lados).
  Para mapas simétricos: monte metade e copie.
- **REPETIR:** cópias da seleção **em fila** (quantas e o passo em x e em y) ou **em círculo** (quantas no total e o raio, em
  volta do centro do campo, girando junto ou não). Respeita os limites do mapa (o aviso diz o que estouraria).
- **AS MEDIDAS:** enquanto desenha, move, gira ou estica, uma etiqueta perto do dedo mostra o comprimento e o ângulo da
  parede, o raio, o diâmetro, a largura × altura, a posição (x · y) ou o giro.
- **AS GUIAS** (com o ímã ligado): ao mover, a peça encaixa no **meio do campo**, na **mesma linha** de outra peça e no
  **lugar espelhado** de outra (a linha rosa aparece e o celular dá um toque). Com o ímã desligado, nada encaixa.
- **A VIBRAÇÃO:** um toque leve ao criar, apagar, pegar uma alça, encaixar numa guia, chutar, em cada batida e no gol — a
  mesma chave do jogo (Ajustes › Vibração) desliga tudo.

### O que dá para pôr no mapa (a biblioteca)

| Categoria | Itens |
|---|---|
| Paredes | reta, diagonal, curva, circular, **invisível**, **só a bola bate**, **só o jogador bate**, barreira **móvel**, barreira **temporária** (some depois de N s), linha de pontos |
| Obstáculos | quadrado, retângulo, triângulo, círculo, polígono desenhado, **giratório**, para-choque (quica mais) |
| Gols | do Time A, B, C, D, neutro, **móvel**, especial (×2, detecção por área) — largura, profundidade, posição, direção, cor, a área de detecção (linha ou área), traves e rede (batem ou não), o time dono, ativo ou não; até 12 gols |
| Zonas | **aceleração**, **lentidão**, **impulso (boost)**, **gravidade** (puxa para o centro ou numa direção), **esteira/plataforma**, **plataforma móvel**, **rampa 2D**, **área de pontos**, **zona de reinício**, **eliminação** (sobrevivência), zona só para a lógica, zona desenhada |
| Interativos | **portal em par** (já ligado; a saída na mesma direção ou num ângulo, a espera), **portão**, **portão automático** (abre e fecha sozinho), **botão** (apertado ou liga/desliga), **interruptor**, **cronômetro** |
| Nascimento | spawn do Time A, B, C, D e o spawn da bola (ou **GERAR AUTOMÁTICO** na aba Spawns, pela formação das salas) |
| Decoração | ícones (estrela, coração, raio, coroa, bola, seta, chama, caveira, troféu, nota, flor, lua), formas, texto, marcações (linha, círculo, arco, retângulo, ponto; tracejadas ou não) |

Qualquer objeto pode **se mover** (vai e volta, em círculo ou girando; a velocidade tem teto para a bola nunca atravessar).

### As abas do mapa

- **Campo:** o formato, o tamanho, as bordas (só a bola bate / com paredes / aberto — e o que acontece com a bola fora), as
  margens onde o jogador anda, o nome, a descrição e a categoria.
- **Aparência:** o piso (grama tradicional, escura, clara, sintética, concreto, asfalto, quadra, areia, neon, futurista ou
  personalizado), as cores, a textura e o tamanho dela, as linhas (cor, espessura, laterais, meio, círculo central, área do
  goleiro, área de pênalti), o fundo (liso, degradê, arquibancada, rua, noite, neon) e a iluminação (dia, fim de tarde, noite,
  neon). Marcações personalizadas pela biblioteca. **Peças:** a sombra das peças sólidas (paredes, curvas, linhas e
  obstáculos que batem: a sombra dura do jogo, para a direita e para baixo — dá para desligar). **Bola:** a **branca**, lisa e
  de contorno preto (a de sempre dos jogos de bolinha, o padrão de todo mapa da Oficina — e do tamanho exato da colisão: o
  contorno fica do lado de dentro), a **colorida** (a cor que quiser, com o mesmo contorno), a do **RACHA** (a do jogo de
  sempre, com a sombra) ou a **EQUIPADA** (cada um vê a bola que equipou na loja — as bolas lisas da v93, a Clássica Lisa…;
  sem bola equipada, a branca; só o desenho: o tamanho é o da física) — com a amostra em cima do piso do mapa. Vale no TESTAR
  e nas salas online com o mapa.
- **Física:** **Clássico** (a do RACHA), **Rápido**, **Técnico**, **Arcade**, **Precisão** ou **Personalizado** — da bola
  (velocidade máxima, aceleração do chute, freio, elasticidade, massa, tamanho, quiques, resistência, rotação, efeito da curva,
  bate nas paredes) e dos jogadores (velocidade, aceleração, desaceleração, atrito, massa, tamanho, força do chute e do passe,
  recuo, colisão, controle de condução, alcance). **Só vale na Oficina** — a ranqueada e as salas comuns usam sempre a física
  oficial (o servidor nem passa por este código nelas). Quem cria uma sala com o mapa pode trocar a física **só naquela
  sala** (a FÍSICA DA SALA, no CRIAR SALA: ver "As salas com mapa"); o mapa publicado não muda. O **MISTURAR COM O RACHÃO**
  (v97, depois do teste) põe a bola, a tampinha ou o chute do Rachão (ver "O Rachão").
- **Partida:** o modo (futebol, futsal, X1 a X5, treino, corrida, precisão, labirinto, sobrevivência, quatro gols, arena
  circular, minigame, livre), com curva ou não, 1 a 4 times (nome e cor de cada), jogadores por time (e o mínimo/máximo na
  sala), a vitória (gols/pontos ou sobrevivência por rodadas), a meta, o tempo, o empate (gol de ouro com prorrogação ou
  empate), a troca de lado no intervalo, o que acontece depois do gol, a saída (meio, círculo, livre) e o raio dela, a bola
  livre sem saída, o gol contra, a colisão entre companheiros e entre adversários, os bots e os espectadores. E as **regras
  do goleiro**: o **Goleiro** (a última vaga de cada time, com 3 ou mais por time — o bot dela joga no gol), a **área do
  goleiro** — *livre*, *só o goleiro do time* (os jogadores de linha não entram na própria área) ou *só o goleiro, para todos*
  (nem o adversário entra, como no handebol) — e **o goleiro não sai da área**. A área é a caixa na frente de cada gol com
  dono (a mesma da marcação, que aparece sozinha quando há regra); vale para as tampinhas, a bola passa à vontade. Sem
  goleiro, a área fica fechada para o time inteiro. Na tela da sala, a vaga do goleiro tem a etiqueta GOLEIRO.
- **Lógica (QUANDO → ENTÃO), sem programar:** QUANDO a partida começa, sai uma saída, a bola ou um jogador entra/sai de uma
  zona, apertam/soltam um botão, um interruptor liga/desliga, um cronômetro termina, chega um tempo, a cada N segundos, sai um
  gol (em qualquer um ou num gol certo), um time chega aos pontos, alguém passa num portal, a bola bate num objeto → ENTÃO abrir/
  fechar/alternar um portão, ativar/desativar, mostrar/esconder, mover/voltar um objeto, mudar a cor, parar a bola, a bola volta
  ao spawn, mudar a velocidade da bola, dar pontos, mostrar uma mensagem, efeito na tela (confete, clarão, tremor, brilho),
  iniciar/parar um cronômetro, trocar um interruptor, acabar a partida. Com espera, repetição (sempre, uma vez, N vezes) e
  intervalo mínimo. **Não existe script:** o servidor só roda as ações da lista, com limites (80 regras, 8 ações por regra,
  64 ações por passo, profundidade 4) — tudo determinístico e igual no servidor e no TESTAR.
- **Camadas (9):** **Fundo**, **Texturas**, **Marcações**, **Geometria**, **Colisões**, **Objetos**, **Elementos
  interativos**, **Decoração** e **Interface do mapa** — cada objeto entra sozinho na dele (paredes e curvas na Geometria,
  as linhas de pontos nas Colisões, obstáculos e gols em Objetos, zonas, portais, portões, botões e interruptores em Elementos
  interativos, marcações em Marcações, decoração e textos em Decoração, cronômetros e spawns na Interface do mapa) e pode
  trocar nas propriedades. Mostrar/esconder e bloquear no editor (esconder Fundo, Texturas ou Marcações tira também o
  cenário, o piso ou as linhas do campo da tela do editor), subir/descer (a ordem vale também na partida) e a lista dos
  ocultos/bloqueados.
- **Spawns:** quantos cada time tem, + SPAWN, GERAR AUTOMÁTICO, o spawn da bola, os spawns em lugar ruim (em vermelho).
  Os objetos especiais nascem onde estão no editor (a lógica esconde, mostra, move e devolve cada um para esse lugar). Quem
  assiste não tem tampinha no campo (vê pela câmera), então não há spawn de espectador.
- **Validação:** os erros (o mapa não testa nem publica com eles) e os avisos, com o botão que seleciona os objetos com
  problema, e o tamanho do mapa (objetos, peças que colidem, regras, KB).

## Testar

**TESTAR** abre a partida na hora, no canvas do jogo, com os controles do jogo (o analógico, PASSE, CHUTE, CURVA no modo
com curva, o teclado e o controle) e os bots. Começa com a **contagem 3, 2, 1, JÁ!** da v93 (a física espera). Na pausa:
continuar, reiniciar (ou a tecla R), trocar de time, bots ligados/desligados, **ver as colisões** (azul = só a bola, rosa =
só o jogador, branco = todos), **CONTAGEM 3, 2, 1: LIGADA/DESLIGADA** (fica guardado no aparelho) e voltar ao editor do jeito
que estava. A cada gol, o **cartão de quem fez** (a tampinha ou o avatar, o nome, o banner equipado e a assistência) no
canto; no fim, o **CRAQUE DA PARTIDA** (a conta da v93 com os gols e as assistências). **As linhas da bola (v95)** — os
pontinhos brancos da linha do chute e do caminho da bola, pela conta do motor do mapa, com as zonas, os portais e os objetos
que andam — **só aparecem com o RANK OFF**: no TESTAR, a pausa tem **RANK OFF (LINHAS DA BOLA): LIGADO/DESLIGADO**; nas salas
com mapa, quem cria a sala liga (*RANK OFF · as linhas da bola para todos*, no CRIAR SALA) e o admin liga e desliga nos ajustes
da sala, fora da partida. A sala mostra **RANK OFF** no cartão e na lista, e a partida com ele **não conta nas jogadas do
mapa**. Nas partidas de sempre do RACHA (treino, bots, salas e ranqueada) as linhas não aparecem.
**Teste multiplayer privado** (no ⋮): abre uma sala fechada com o rascunho para chamar a galera pelo código.

## Salvar

- **Automático:** 2,5 s depois de cada mudança, no aparelho (IndexedDB; sem ele, o armazenamento local, com o aviso).
- **Manual:** o botão salvar (Ctrl+S) — cria também uma versão.
- **Versões:** as últimas 30 de cada mapa no aparelho (⋮ › VERSÕES: voltar para uma; a de agora vira versão também).
- **Recuperação:** se o aparelho travar ou a aba fechar antes de salvar, a central e o editor oferecem recuperar.
- **Duplicar, renomear, apagar** (no menu do cartão do mapa). Cada mapa tem um identificador único. Para levar um mapa para
  outro aparelho, publique (pode ser como **privado**: só você e os colaboradores veem) e abra pela Oficina do outro aparelho.

## Publicar e a comunidade

**PUBLICAR** (no ⋮ do editor ou no cartão): o nome, a descrição, a categoria, a visibilidade (**público** — aparece na
comunidade; **não listado** — só com o código; **privado** — só você e os colaboradores), permitir copiar ou não e a
miniatura (feita sozinha). O mapa ganha o **código de 7 letras**. Publicar de novo o mesmo rascunho vira a **versão nova** (o
servidor guarda as últimas 15; quem estiver jogando a antiga termina a partida nela). Na página do mapa: **CRIAR SALA** (a
janela da sala com ele: ver abaixo), **TESTAR**, **CURTIR**, **FAVORITAR**, copiar o código, **EDITAR** e **VERSÕES** (criador
e colaboradores que editam), **DUPLICAR** (se o criador deixou copiar), **CONFIGURAR** e **COLABORADORES** (o criador: pelo
ID público, com editar, testar, publicar e duplicar, até 10), **DENUNCIAR** (uma vez por pessoa; com 5 pessoas diferentes o
mapa sai do catálogo até a equipe olhar) e **MODERAR** (a equipe: ocultar, restaurar, oficial, escolha da comunidade, limpar
as denúncias, remover). Limites: 30 mapas por pessoa, 12 publicações por dia, uma a cada 15 s.

**No máximo 3 mapas PÚBLICOS por jogador** (os que aparecem na comunidade, com as curtidas e os favoritos; os **não
listados** e os **privados** não contam, e a equipe não tem limite). **Meus mapas** mostra **PÚBLICOS n DE 3**. Com os 3, a
janela de PUBLICAR só oferece Não listado e Privado (e explica); para um mapa novo ir para a comunidade, deixe um dos públicos
como não listado em **CONFIGURAR** (ou apague um) — a vaga abre na hora. O servidor confere tudo (publicar, versão nova e
CONFIGURAR): ninguém passa dos 3 mandando a mensagem à mão.

**No cartão** de cada mapa da comunidade, o **coração** curte e a **estrela** favorita na hora (tocar de novo tira), com os
números ao lado; o **JOGAR** do cartão abre o CRIAR SALA.

**Quem modera:** quem tem o selo `equipe`, o Dono (000001) e os ids em `RACHA_MODERADORES` / `--moderadores`.
As denúncias de mapa vão também para o RACHA CONTROL quando o servidor das salas está montado na plataforma.

**Contra quem abre mil conexões:** quem joga sem conta e não manda o token do aparelho vira "uma pessoa nova" a cada
conexão. Por isso o servidor separa quem é **de confiança** — a conta, a equipe ou quem joga ali sem conta há 24 h e já
terminou 3 partidas: só as denúncias de confiança tiram um mapa do catálogo sozinhas (as outras ficam anotadas e vão para a
fila da equipe), a ordem de "Mais curtidos" vai primeiro pelas curtidas de confiança, e os mapas novos de quem ainda não é de
confiança têm um teto no servidor inteiro (120 por hora). O catálogo também tem um teto de espaço em disco
(`RACHA_MAPAS_MAX_MB`, padrão 512 MB). O colaborador que publica uma versão nova não muda o nome, a descrição, a categoria nem
a visibilidade (são do criador).

## As salas com mapa

**CRIAR SALA** (na página do mapa, no JOGAR do cartão, no menu dos seus mapas, nos modelos e no ⋮ do editor) abre a janela da
sala: o nome, os jogadores por time (no que o mapa deixa), **bots completam as vagas**, **sala aberta** (aparece na lista;
com mapa privado ou rascunho fica fechada) e a **FÍSICA DA SALA**, do lado direito (no celular, embaixo):
- a predefinição — **Do mapa** (o padrão), **Clássico**, **Rápido**, **Técnico**, **Arcade** ou **Precisão** — ou os números,
  em % do RACHA de sempre (100% = o Clássico): **Bola** (tamanho, velocidade máxima, deslize no chão, peso, quique nas
  paredes), **Chute** (força do chute, força do passe, alcance, efeito da curva) e **Tampinhas** (velocidade, aceleração,
  tamanho, peso). Mexeu num número, vira **Personalizada**; **VOLTAR PARA A DO MAPA** desfaz;
- a **amostra** (a tampinha e a bola no tamanho da sala, em cima do piso do mapa) e **até onde vai um chute forte**, em u
  (com o tamanho do campo ao lado, para comparar).
A física da sala vale **só nela**: o mapa publicado não muda, e a ranqueada e as salas comuns continuam com a física oficial.
O servidor passa tudo pela mesma limpeza do mapa (os limites do núcleo: um número fora deles é cortado) e manda o mapa da sala
de novo para todo mundo (o hash muda; a previsão de cada aparelho continua igual à do servidor). Nos **AJUSTES** da sala, o
admin troca a física entre as partidas (durante a partida só aparece qual está valendo). A tela da sala e a lista de salas
do GALERA mostram **«física da sala»** (ex.: "bola 150%" ou "Rápido").

Até **4 times** e **20 pessoas** (os outros assistem), bots nas vagas (ou vagas vazias), o admin (quem criou) muda as pessoas
de time, passa o admin, tira da sala, liga os bots, abre/fecha a sala, muda o tamanho dos times (no que o mapa deixa), **troca
o mapa** (um publicado pelo código ou um rascunho seu — com rascunho a sala fica fechada; no ritmo: 4 trocas seguidas, depois
uma a cada 2 s) ou volta para os campos do RACHA. No meio da partida o admin também põe, tira (banco) e troca as pessoas de
lugar (as ações da v93): **sem bots**, a vaga que fica sem ninguém fica vazia e quem entra numa vaga vazia entra já no campo;
os gols e as assistências vão com a pessoa.
O chat da sala, a pausa e o ENCERRAR (não vale) do admin, a queda e a volta automática no mesmo lugar (90 s; um bot segura a
vaga), os espectadores e o resultado no fim (o placar de cada time, os gols e as assistências). A sala aparece na lista de
salas do GALERA com a etiqueta **OFICINA** e na Comunidade da Oficina; o **JOGAR AGORA** do jogo continua só nas salas comuns.

Da v93, também nas salas com mapa: a **contagem 3, 2, 1, JÁ!** (o servidor segura a partida e solta junto para todos; cada
aparelho desconta metade do ping), os **balões de fala rápida** (a tecla **T** ou FALAS RÁPIDAS na pausa: as 8 frases da v93,
só de quem está jogando, no ritmo do servidor, e quem bloqueou não recebe), o **cartão de quem fez o gol** (o avatar ou a
tampinha, o nome e o banner equipados de quem marcou, e a assistência — o mesmo em todos os aparelhos) e o **CRAQUE DA
PARTIDA** na tela do fim. (O replay do gol e o painel de jogadores continuam só nas salas comuns: a partida da Oficina tem o
placar e o cartão dela.)

O servidor é a autoridade (a mesma fila de comandos das salas hospedadas, a mesma máquina dos botões PASSE/CHUTE/CURVA); o
aparelho prevê a própria tampinha e a bola com o **mesmo motor** (`server/partida/mapa.js`) e suaviza as correções. Com a
**extrapolação** dos Ajustes finos (ONLINE), o desenho vai uns ms à frente: a bola pelo motor do mapa, as tampinhas na
direção delas.

## Para quem roda o servidor

- `node server/servidor.js --mapas PASTA` (ou `RACHA_MAPAS=PASTA`). Sem os dois, a pasta **`mapas` ao lado do arquivo da
  turma** (`--dados` / `RACHA_DADOS`): `server/dados/mapas` no computador e **`/var/lib/racha/mapas` no VPS** (o
  `deploy/prepara-vps.sh` também grava `RACHA_MAPAS=/var/lib/racha/mapas` no `/etc/racha/racha.env` — é a única pasta em que o
  serviço `racha` pode gravar). Com `--memoria` e sem `--mapas`, só na memória (os testes). No Docker/Render, como o
  `turma.json`, a pasta precisa de um disco que sobreviva ao reinício para os mapas não sumirem.
  Na pasta: `indice.json` (e a cópia `indice.json.bak` a cada gravação), `m/<id>.json` (as versões) e `t/<id>.txt` (a
  miniatura). Tudo gravado de forma atômica; se o índice estragar, ele é refeito dos arquivos dos mapas (as curtidas e os
  favoritos vêm da cópia). Faça backup da pasta junto com o `turma.json`.
- `--moderadores L` (ou `RACHA_MODERADORES`): os ids que moderam os mapas, separados por vírgula.
- `RACHA_MAPAS_MAX_MB` (padrão 512): o espaço em disco que o catálogo pode usar (os mapas e as versões guardadas).
- Na plataforma (`app/api/lib/salas.ts`): as mesmas variáveis `RACHA_MAPAS` e `RACHA_MODERADORES` (sem `RACHA_MAPAS`, a pasta
  `mapas` ao lado do `RACHA_DADOS`; sem os dois, `server/dados/mapas`).

## O formato do mapa (`.racha-mapa.json`)

```text
{ formato:'racha-mapa', v:1, id, codigo, nome, descricao, categoria, tags[], autor, versao, criado, editado,
  campo:{ forma, w, h, canto, pontos[], borda, laterais, margem, margemY },
  aparencia:{ piso, cor1, cor2, textura, escala, linhas:{on, cor, esp, laterais, meio, centro, areas, penalti}, fundo, corFundo, luz,
             bola ('branca' | 'cor' | 'racha' | 'jogador'), corBola, sombras },
  fisica:{ preset, perfil:{…}, extra:{…}, colideParedes },
  partida:{ modo, jogo, equipes, porTime, porMin, porMax, times:[{nome, cor}], vitoria, meta, tempo, desempate, prorrogacao,
            trocaLados, reinicio, saida, raioSaida, saidaLivre, golContra, colisaoAmigos, colisaoAdversarios, bots, goleiro,
            areaGol ('livre' | 'defesa' | 'todos'), goleiroPreso, espectadores },
  camadas:[{id, visivel, bloqueada}] (9),
  objetos:[{ id, tipo, x, y, rot, camada, cor, opac, visivel, ativo, bloqueado, oculto, grupo, nome, mov?, …campos do tipo }],
  logica:[{ id, on, quando:{tipo, alvo, equipe, seg, valor}, entao:[{acao, alvo, …}], atraso, repete, vezes, espera }] }
```
Tudo em **u** (1 u = 19 px). Os tipos: parede, arco, linha, obstaculo, gol, zona, portal, portao, botao, interruptor,
cronometro, spawn, spawnBola, decoracao, marcacao, texto. Tudo o que chega (publicar, abrir sala, a física da sala) passa pelo
`RachaMapa.limpa` — o mesmo no aparelho e no servidor: campos conhecidos, números cortados nos limites, textos limpos,
referências conferidas. Limites: 400 objetos, 48 pontos por polígono, 80 regras com 8 ações, 12 gols, 24 portais, 80 zonas,
40 objetos móveis, 40 spawns, 1–4 times de 1–5 (16 no total), 180 KB, 2.400 peças de colisão e 120.000 entradas na grade das
colisões (o mapa feito para pesar é recusado em milissegundos, sem travar o servidor). O MOVER e o VOLTAR da lógica respeitam
o mesmo teto de velocidade dos objetos que se movem (40 u/s): pedir "0 s" leva o tempo mínimo desse teto.

## Os arquivos

| Novo | O que é |
|---|---|
| `server/partida/mapa.js` | o motor dos mapas (validação, compilação, partida, lógica, bots, o quadro da rede) — o mesmo arquivo no servidor e no jogo |
| `server/partida/sala_mapa.js` | a partida no mapa dentro do servidor das salas (a fila de comandos e os botões das salas hospedadas) |
| `server/mapas.js` | o catálogo (publicar, versões, lista, busca, curtir, favoritar, denunciar, colaboradores, moderação) gravado em disco |
| `tools/oficina/*.js` | o cliente: `base` (ícones, janelas, a gaveta do aparelho, a conversa com o servidor, os ganchos), `modelos`, `desenho`, `editor`, `ferramentas` (lançar a bola, copiar para o outro lado, repetir, as medidas, as guias e a vibração), `paineis`, `hub` (a central), `jogo` (o TESTAR e a partida online), `sala` |
| `tools/oficina/oficina.py` | a etapa do build (cola o motor e o cliente no jogo, numa função só) |
| `app/public/game/oficina.css` | o visual (o da v91) |
| `tests/oficina_*` | os testes (abaixo) |

| Mudou | O quê |
|---|---|
| `server/turma.js` | as salas com mapa (até 4 times, o mapa da sala, a partida no mapa, o fim sem selo), o pedido `mapa_req` → `mapa_res`, o `mapa_encerrar` e as mensagens grandes só para o mapa |
| `server/servidor.js`, `server/turma.d.ts`, `app/api/lib/salas.ts` | as opções `--mapas` e `--moderadores` |
| `tools/aplicar_rua.py` | a etapa `oficina/oficina` no fim da lista |

O protocolo: `mapa_req {rid, op, args}` → `mapa_res {rid, op, ok, …}` com `op` = eu, lista, abrir, versoes, publicar,
curtir, favorito, denunciar, apagar, config, colab, moderar, fila (o `eu`, a lista `meus`, o publicar e o config dizem
também `publicos` e `maxPublicos`; passar dos 3 volta `codigo:'publicos'`). A sala: `create`/`config` com `mapa:{id|codigo}`
ou `mapaDados:{…}` (o rascunho) e `fisicaSala:{preset, perfil, extra, colideParedes}` (ou `null` = a do mapa), `mapa_sala
{code, hash, info, mapa}` antes do `room` (que traz `E` e `mapa`; o `info` traz `fisicaSala` e `fisicaMapa`, e o item da lista
de salas, `mapa.fisica`), a `contagem {round, ms}` depois do `start`, a `fala {i}` → `fala {id, slot, i}`, o `snapshot` com o
quadro do mapa (`tick, el, st, sc[], b[], p[][], d[][], c[], bt[], m, ev[]` — o evento do gol com `j`/`ja`, quem fez e a
assistência) e o `result` com `custom:true` e os jogadores (`jog`: os gols e as assistências).

## Os testes

- `node tests/oficina_mapa_test.mjs` — o motor (validação, a fidelidade com o núcleo das salas no perfil Clássico,
  determinismo, 4 times, gols e gols contra, zonas, portais, botões, portões, barreiras, cronômetros, lógica e os limites).
- `node tests/oficina_servidor_test.js` — o catálogo, as permissões, as denúncias, o disco, as salas com mapa e o servidor de
  verdade pela rede.
- `python3 tests/oficina_cliente_test.py` — o cliente no navegador: o botão e a central em 6 tamanhos de tela, os tamanhos ×
  formatos e os 15 modelos, todas as ferramentas pelo toque, salvar/versões/recuperação (e que o exportar/importar saiu), o
  TESTAR e o jogo de sempre depois.
- `python3 tests/oficina_v94_test.py` — o servidor e duas sessões (computador e celular): curtir e favoritar no cartão, o
  CRIAR SALA com a física da sala (a bola em 150%, o corte do servidor, a predefinição Rápido nos AJUSTES), os 3 públicos
  (a cota, a janela de publicar, o CONFIGURAR recusado e a vaga que abre) e a partida com a contagem, os balões de fala, o
  cartão do gol nos dois aparelhos e o craque.
- `python3 tests/ajustes_linhas_test.py` (a parte 7) — no TESTAR: a contagem e a chave dela, a linha do chute pelo motor do
  mapa igual ao caminho de verdade, o cartão do gol, o craque e a bola equipada.
- `python3 tests/oficina_online_test.py` — o servidor e três sessões: publicar, a comunidade, a sala com 4 times, a partida
  (comandos, pausa, queda e volta, espectador, encerrar e o fim natural), as permissões, o reinício do servidor e a moderação.
- `python3 tests/v97_rachao_test.py` — o Rachão (v97): a página gerada do original, as fontes e nada pedido para fora, os 17
  campos de ida e volta pelo editor, a limpeza do que entra e o código, o editor no celular (as ferramentas, o espelho, as abas,
  o salvamento, o TESTAR, o JOGAR, colar código, apagar e o limite) e a aba RACHÃO com o Rachão por cima da Oficina.
- `node tests/v97_mistura_test.mjs` — a mistura da física, jogada nos dois motores: a bola (o tamanho, até onde rola, o teto,
  a parede e o pé), o jogador (a máxima, o embalo e o deslize) e o chute medidos no RACHA e no Rachão dão o mesmo; uma parte
  não muda as outras; os chutes do estádio em partidas de bots; e os 17 campos iguais ao motor original, número por número.
- `node tests/v98_rachao_servidor_test.mjs` — as salas do Rachão no servidor (v98): o motor igual ao da página, o campo e as
  opções conferidos, a fila de comandos (o palpite, o silêncio, o excesso, os toques), o quadro e a previsão iguais ao
  servidor, a queda com o bot, o fim, e a sala pela rede (a página antiga não vê a sala).
- `python3 tests/v98_rachao_online_test.py` — os dois modos e as salas online do Rachão no navegador, com o servidor e três
  sessões: CRIAR, SALA ONLINE, lista, código, AJUSTES, a partida com a previsão, a queda, o fim, o estádio de quem cria, o
  admin que herdou a sala, o servidor antigo, a demonstração e o celular.
- `node tests/v97_estadios_test.mjs` — a oficina de estádios no motor do Rachão, sem navegador: os 17 campos de ida e volta,
  a limpeza com 400 entradas sorteadas (metade ruins), o código de 120 estádios e 210 partidas de bots em estádios sorteados
  (nada vira NaN, o círculo do meio e o Golzão cabem, a parede não acelera a bola).
- `python3 tests/oficina_ferramentas_test.py` — a versão publicada só com a v92 oficial, a bola branca de contorno preto no
  TESTAR (os pixels do canvas), a colorida e a do RACHA, o painel Aparência, LANÇAR A BOLA (a prévia, o gol, a batida),
  COPIAR PARA O OUTRO LADO, REPETIR (fila, círculo, a janela e o limite), as medidas, as guias, a vibração e as sombras.

## O que fica de fora (limitações reais)

- **"Permitir copiar"** impede duplicar pela Oficina e publicar uma cópia (o servidor confere a origem), mas quem pode jogar um
  mapa recebe os dados dele (é preciso para jogar e testar): alguém com ferramentas de desenvolvedor consegue extrair o JSON.
- Para quem joga **sem conta**, as curtidas, os favoritos e os mapas publicados ficam ligados ao navegador (o token do
  aparelho); com a conta, à conta. Na plataforma sem `RACHA_DADOS`, os tokens de visitante não sobrevivem ao reinício.
  Quem abre muitas conexões sem o token consegue inflar o NÚMERO de curtidas de um mapa (a ordem de "Mais curtidos" usa
  primeiro as curtidas de confiança, e as denúncias dessas conexões não tiram o mapa do catálogo sozinhas). Os limites do
  servidor são por conexão e por pessoa; um limite por endereço IP, se for preciso, fica no proxy na frente do servidor.
- No online, a lógica do mapa (portões, botões, portais, mensagens) vem do servidor (cerca de um quadro de atraso); a sua
  tampinha e a bola são previstas na hora, como nas salas comuns.
- As miniaturas são imagens pequenas feitas pelo próprio jogo (até 40 KB); não há envio de imagens de fora (segurança).
- Os mapas jogam com até 16 jogadores (4 × 4 ou 3 × 5); as salas comportam até 20 pessoas.
- As linhas da bola não contam com os outros jogadores (eles podem tocar na bola no caminho); online, a lógica do mapa que
  muda no meio do caminho (um portão que abre depois) entra quando o servidor manda.
- A física da sala muda entre as partidas, não no meio de uma (o servidor só aceita com a sala esperando).
