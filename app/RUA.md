# RACHA · Identidade visual de rua

Só apresentação. Física, rede, controles, regras e dimensões de mapa não foram tocados:
o bloco `/*PHYS_START*/ … /*PHYS_END*/` do jogo é byte a byte idêntico ao original (conferido por hash SHA-256 no build).

## Arquivos
| Arquivo | O que mudou |
|---|---|
| `public/game/rua.css` (novo) | Tokens (paleta, tipografia, espaçamento), botões, painéis, lobby, navegação, cards de sala, ranking, perfil, cor por modo, animações leves |
| `public/game/rua.js` (novo) | O primeiro cenário do lobby (fim de tarde, muro, escadaria, quadra de cimento). Agora fica de reserva: o `lobby.js` desenha o fundo novo por cima dele e, se falhar, este volta |
| `public/game/arena.js` (novo) | A Arena (campo principal) como a quadra no meio da favela: piso verde, áreas amarelas, linhas brancas, chão pintado de ondas amarelas/verdes/azuis/brancas, murais grafitados no muro de cima, telhados embaixo, casas da comunidade atrás dos gols, postes, fios e pipas. Inclui a versão de prévia (painel JOGAR) e a do Ultra leve |
| `public/game/racha.html` | v67: o código do `partida_rua.js` no lugar do teste do MC Fejuca, o título, o `JOY.aro` (o raio da base do analógico), o estilo da câmera salvo no HUD, as 5 câmeras e o chip Fixo na tela no EDITAR HUD, a Trilha do lobby nos AJUSTES e textos sem skins. Lobby: 2 linhas de gancho em `lbLayout` (a tampinha no meio; as legendas cabem numa linha), a ponte `RUA_LOBBY_API` (abre as telas que já existem) e a marcação dos botões novos. Antes: recolor de CSS (roxo/neon → asfalto/amarelo/tijolo), paleta dos mapas Escadão e Viaduto, cores do desenho dos mapas, botões do HUD e analógico (só cor), 1 linha de gancho em `cenaQuadra`, 2 tags (`rua.css`, `rua.js`), fontes, rótulos da lista de salas |
| `racha.html` (Arena) | `ruaArenaCtx()` (só lê a geometria) + 1 linha de gancho em `desenhaEstadio` e em `campoPlano`; armação do gol da Arena branca; cor de fundo e descrição do mapa |
| `public/game/lobby.css` (novo) | O lobby no modelo de colunas: cartão do jogador, MOEDAS/GEMAS e ícones em cima; CLUBE, SKINS, TREINAMENTO, LOJA, COMUNIDADE à esquerda; PASSE, RANQUEADA, RANKING, SALAS e o JOGAR grande à direita; DESAFIOS, CHAT e AMIGOS embaixo. Em pé, os mesmos botões viram uma grade de 2 colunas |
| `public/game/lobby.js` (novo) | O fundo do lobby em desenho (Cristo Redentor no Corcovado, o morro da favela com as casas coloridas, o muro grafitado, a quadra verde com as áreas amarelas e o chão de ondas) e o que cada botão abre |
| `src/lib/ponteJogo.ts` | +1 efeito: a plataforma expõe `RACHA_ABRIR(rota)` para o iframe do jogo (só as rotas da lista: /amigos, /ranking, /perfil, /conquistas, /inventario, /carreira, /estatisticas). É assim que o AMIGOS do lobby abre a lista de amigos de verdade |
| `tools/partida_rua.js` (novo, v67) | Colado pelo `aplicar_rua.py` no fim do script do jogo: o analógico novo (maior e fixo na tela), as câmeras novas e o jogo sem skins (ver a seção da v67) |
| `tools/salas_rua.js` (novo, v68) | Colado logo depois do `partida_rua.js`: as salas (lista, CRIAR SALA, a sala na favela), a sala neste aparelho com bots e o árbitro (ver a seção da v68) |
| `public/game/sala.css` (novo, v68) | O visual da lista SALAS PERSONALIZADAS, do CRIAR SALA, da sala em cima da favela, do apito nos cartões e da pausa do árbitro |
| `tools/tampa_rua.js` (novo, v69) | O motor das tampinhas personalizadas: as 19 bordas, 15 formas de escudo, 48 padrões, 72 ícones, 4 estilos de ícone, os 44 pré-projetados (+12 escudos), o código curto, o desenho e os ganchos no jogo (você, bots, treino, salas online, replay, chat) |
| `tools/editor_rua.js` (novo, v69) | O editor na tela SKINS (PADRÃO · BORDA · ÍCONE · PRÉ-PROJETADO · INVENTÁRIO) e no escudo do clube |
| `tools/clubes_rua.js` (novo, v69) | Os clubes (lista, convites, criar, a página do clube, os membros) na sua conta ou neste aparelho |
| `public/game/tampa.css` (novo, v69) | O visual do editor e dos clubes |
| `db/schema.ts` (v69) | `usuarios.tampa` (o código da tampinha) e as tabelas `clubes`, `clube_membros`, `clube_convites` |
| `api/racha/clubeRouter.ts` (novo, v69) · `api/router.ts` | O router `clubes` (listar, meu, ver, criar, editar, entrar, sair, convidar, convites, responder, expulsar, passarDono, salvarTampa) |
| `api/racha/authRouter.ts` · `src/lib/racha.tsx` (v69) | A conta passa a trazer `tampa` |
| `src/lib/ponteJogo.ts` (v69) | `RACHA_JOGO` para o iframe: a conta, as skins da conta, salvar a tampinha e os clubes (pelo cliente tRPC do site) |
| `tools/aplicar_rua.py` (novo) | Regera o `racha.html` a partir do backup e falha se a física mudar |
| `tools/v71/times.py` · `tools/v71/times.js` (v71) | Os times PRETO × BRANCO (cores, nomes, placar, fim, saída de bola) e a tampinha padrão metade/metade que vira a do time na partida |
| `tools/v71/lobby.js` · `public/game/v71.css` (v71) | O lobby novo (os mesmos botões em outra arrumação e com cara de jogo) e a folha do JOGAR redesenhada |
| `tools/v71/telas.js` · `tools/v71/tema.py` → `public/game/v71-tema.css` (v71.1) | As telas de dentro, os Ajustes, a pausa e o fim no estilo do lobby novo; o tema troca o azul-marinho das folhas antigas pelo carvão (gerado no build) |
| `tools/v73/sensor.js` (v73) | O sensor (o halo de spray em volta de cada jogador) mais transparente: halo 45%, ponta 70%, contorno do time 40%; a carga do chute armado igual. O TESTE da v72 saiu (o bloco de física voltou ao da v71.1) |
| `tools/v74/campo.js` · `tools/v74/campo_kit.py` (v74) | O ESTÁDIO como o society da imagem enviada (grama listrada à noite, alambrado, calçamento, meio-fio, estacionamento com os carros, bancos, postes, árvores e, fora do mapa, as casas), no tamanho e com os gols do jogo; o kit das peças da imagem (`campo_noite_kit.webp`) vai embutido pelo build |
| `tools/v75/lobby.js` · `tools/v75/lobby_fundo.py` (v75) | O fundo do lobby é a imagem enviada (a quadra da favela com o Rio atrás), embutida pelo build; o alto dela abaixo da fileira de cima (o Cristo aparece) e o meio da quadra embaixo da tampinha |
| `tools/v76/skins.js` · `tools/v76/skins_kit.py` (v76) | As 8 tampinhas animadas (as caras como ícones novos e as 4 bordas acesas como bordas novas, no fim das listas), o editor com a coleção primeiro e tudo mexendo; o kit das ilustrações embutido pelo build. No `tools/v74/campo.js`: a grama de fora das linhas toda escura e a calçada de Copacabana |
| `tools/v77/pecas.js` · `lobby.js` · `telas.js` · `quadra.js` · `public/game/v77.css` · `tools/v77/pecas.py` · `tools/v77/quadra_kit.py` (v77) | O lobby e o perfil como nas imagens enviadas (o fundo limpo, o letreiro, os desenhos, o EVENTOS, o topo com os AMIGOS, a tampinha reta), cada botão abrindo só a sua tela com a mesma barra em cima, e o mapa principal (a Arena) como a quadra da imagem; as peças das imagens (o fundo, o letreiro, os ícones, o banner e o kit da quadra) vão embutidas pelo build |
| `tools/v78/bots.js` · `tools/v78/perfil.js` · `public/game/v78.css` (v78) | Os bots novos (a cabeça nova: os 6 jeitos, os companheiros que jogam com você, a defesa de rua com o goleiro-linha, o placar mexendo no jogo, a comemoração), nada escrito em cima da cabeça dos jogadores, o perfil mais fácil de entender (a VISÃO GERAL com o nível por extenso, 4 números, a frase e a bio) e a tampinha maior no lobby e no perfil (na partida, o tamanho de sempre) |
| `tools/v79/patentes.js` · `tools/v79/ranqueada.js` · `tools/v79/selo.js` · `public/game/v79.css` (v79) | As 8 patentes da ranqueada (Bronze a Lendário, III → I) com as insígnias e a tela PATENTES RANQUEADAS; só a ranqueada no JOGAR, no Estádio, com a BUSCA (a fila do servidor da turma e os bots de reserva) e sem o nível dos bots escrito na partida; o selo V (verificado, parceiro, equipe, criador) na frente do nome |
| `tools/v80/times.py` · `times.js` · `partida.js` · `gol.js` · `treino.js` · `public/game/v80.css` (v80) | O Time A laranja × Time B roxo (cores, nomes, sala, fim) e a tampinha inicial Listras (metade/metade; toda da cor do time); a partida normal (3:00, prorrogação só no 0 × 0 até -2:00, empate, 3 gols, o relógio do servidor na online); o placar novo; os adversários sem a setinha do halo e sem a gota fora da tela; a animação GOOOL!; os controles novos do treino |
| `tools/v81/chat.js` · `public/game/v81.css` (v81) | O chat: a barra embaixo (no menu, um bloco no vão da fileira de baixo; nas telas do menu, um chip no canto; na sala, embaixo; na partida, menor e meio transparente, no tamanho do HUD), o painel que abre dela (as abas 🇧🇷 BRASIL e ⚽ SALA/PARTIDA, quem está online, as mensagens com o nome em amarelo e o V, as frases rápidas, "Digite sua mensagem…" e ENVIAR; sobe com o teclado do celular), a ficha pelo nome (VER PERFIL, SILENCIAR, DENUNCIAR), os três pontinhos do "digitando" em cima da tampinha, os filtros no aparelho (telefone, CPF, e-mail, link, @, palavrão, repetida, muitas seguidas), o OCULTAR e a chave "Chat na tela" dos Ajustes. Nos mesmos nós da v63 (`#cb` e `#cp`) |
| `src/lib/ponteJogo.ts` (v81) | O `RACHA_ABRIR` aceita também `/jogador/<id público>` (o VER PERFIL da ficha do chat abre o perfil de quem escreveu, na plataforma) |
| `tools/v82/inicio.js` · `conta.js` · `conta.py` · `public/game/v82.css` (v82) | As contas no jogo: cada conta com o seu progresso no aparelho (as gavetas) e a cópia da conta antes do jogo ler; o nível e o XP da conta; a patente da conta no fim da partida (o que valeu, a nota, o XP da conta); a cópia do progresso indo e voltando, QUAL PROGRESSO FICA? e LEVAR O PROGRESSO PARA A CONTA?; ENTRAR/CRIAR CONTA (Ajustes › Conta, o perfil, o ranking); o RANKING › PATENTES |
| `contracts/patentes.ts` · `partida.ts` · `progresso.ts` (v82, novos) | As regras sem banco (as do jogo): a patente, o que a partida faz com ela (o selo da ranqueada, a desistência), a cópia do progresso |
| `api/racha/ranqueada.ts` · `progressoRouter.ts` (v82, novos) · `jogoRouter.ts` · `perfilRouter.ts` · `authRouter.ts` · `adminRouter.ts` · `api/router.ts` · `api/lib/selo.ts` | A patente na conta (em transação, uma vez por partida, o teto do dia, a desistência da vencida, a importação, o ajuste), o ranking das patentes, a cópia do progresso, `eu.rq` |
| `db/schema.ts` (v82) | `ranqueada`, `ranqueada_eventos`, `progresso_jogo`; em `partidas`: `ranqueada`, `online`, `tamanho`, `pontos`, `gols_contra`, `rq_delta` (`npm run db:push`) |
| `src/lib/ponteJogo.ts` · `racha.tsx` · `pages/LobbyPage.tsx` · `EntrarPage.tsx` · `AmigosPage.tsx` · `AdminPage.tsx` · `components/racha/Cartao.tsx` · `Patente.tsx` (v82) | A ponte v82 (a conta com o nível e a patente, o progresso, as patentes, os avisos, `/entrar`), o iframe por conta, o Ranking na aba Patente, o cartão com a patente, o ajuste no RACHA CONTROL |
| `backup/` | `racha.html`, `racha-bridge.js`, `ponteJogo.ts` originais e, da v69, `schema.ts`, `router.ts`, `authRouter.ts`, `perfilRouter.ts` (não mudou) e `racha.tsx` de antes |

## Rótulos da lista de salas (reais)
ESPERANDO → **PELADA ABERTA** · JOGANDO → **ROLANDO** · COPA e OFICIAL já existiam.
Não foram criados VALENDO RANK, TREINO ou CLÁSSICO DA QUEBRADA: não existem como estado de sala no servidor.

## Desfazer
Copie `backup/racha.html` de volta para `public/game/racha.html` (as tags de `rua.css`, `rua.js`, `arena.js`, `lobby.css`, `lobby.js`, `sala.css`,
`tampa.css`, `v70.css`, `v71-tema.css`, `v71.css`, `v77.css`, `v78.css`, `v79.css`, `v80.css`, `v81.css` e `v82.css` só existem na versão gerada). Só o Estádio da v74: tire a linha `V70JS += '\n' + _campo74()` do
`tools/aplicar_rua.py` e rode o build (volta o gramado da v70.2). Só o lobby da v75: tire a linha `V70JS += '\n' + _lobby75()` (volta o
cenário desenhado). Só as tampinhas animadas da v76: tire a linha `V70JS += '\n' + _skins76()` (quem
estiver com uma equipada volta a ver uma tampinha comum). Só a v77: tire a linha `V70JS += '\n' + _v77()` e a tag do `v77.css` do
`tools/aplicar_rua.py` (voltam o lobby da v75, as telas da v71.1 e a Arena da v61); só a quadra nova: tire `'quadra.js'` da lista do `_v77()`. Só a v78: tire a linha `V70JS += '\n' + _v78()` e a tag do `v78.css` do `tools/aplicar_rua.py` (voltam os bots de antes, os nomes das jogadas em cima da cabeça e o perfil da v77); só os bots: tire `'bots.js'` da lista do `_v78()` (voltam também os nomes em cima da cabeça). Só a v79: tire a linha `V70JS += '\n' + _v79()` e a tag do `v79.css` do `tools/aplicar_rua.py` (voltam os elos da v35, a casual e a liga contra bots; o servidor continua aceitando a fila, só que ninguém pede); só o selo: tire `'selo.js'` da lista do `_v79()`. Só a v80: tire a linha `V70JS += '\n' + _v80()`, o `'v80/times'` do `V70_ETAPAS` e a tag do `v80.css` do `tools/aplicar_rua.py` (voltam o preto × branco, a padrão metade preta/branca, o placar e a faixa do gol da v71/v61, a ranqueada sem relógio e os seletores do treino de antes; o servidor continua mandando o relógio, que o jogo de antes ignora — mas confere a ranqueada pela regra nova: volte também o `server/turma.js` da v79); só o GOOOL!: tire `'gol.js'` da lista do `_v80()`; só os controles do treino: tire `'treino.js'`. Só a v81: tire a linha `V70JS += '\n' + _v81()` e a tag do `v81.css` do `tools/aplicar_rua.py` (volta a barra da v63, em cima; o servidor continua numerando as mensagens e aceitando a denúncia, que o jogo de antes não manda; o filtro novo do servidor continua valendo — para o de antes, volte o `FILTRO` do `server/turma.js` da v80). Só a v82: tire a linha `V70JS += '\n' + _v82()`, o `'v82/conta'` do `V70_ETAPAS` e a tag do `v82.css` do `tools/aplicar_rua.py` (o jogo volta a ser o de sem conta em qualquer lugar; o progresso de quem está na gaveta de uma conta fica guardado em `racha-guarda:<conta>` e não aparece — para trazer, copie as chaves de volta antes); na plataforma, a ponte com `versao` menor que 82 desliga as contas do jogo sem mexer no resto. No `ponteJogo.ts`, os efeitos do `RACHA_ABRIR` e do `RACHA_JOGO` podem sair sem afetar o resto.
Na plataforma (v69): os arquivos de `backup/` voltam no lugar e o `clubeRouter.ts` sai; as tabelas novas e a coluna `tampa` podem ficar.

## Lobby novo (no modelo da imagem laranja + RANKING)
> **v71:** a arrumação abaixo foi trocada pelo lobby da v71 (ver a seção "v71 · preto × branco e o lobby novo", no fim).
> Os botões e os destinos são os mesmos; mudaram o lugar, o desenho e o que saiu da tela (PASSE, COMUNIDADE, o CHAT grande
> e o ícone repetido das SALAS).

Cada botão abre uma coisa que já existe; nada de tela de mentira:

| Botão | Abre |
|---|---|
| Cartão do jogador (lápis) | PERFIL |
| MOEDAS / GEMAS | LOJA |
| Ícone da galera · SALAS | GALERA › SALAS (salas abertas, sala personalizada, entrar com código) |
| Ícone e botão CHAT | Chat do Brasil |
| Ícone engrenagem | Ajustes |
| CLUBE | Os clubes (v69): o seu clube direto, ou a lista para criar/entrar |
| SKINS (v69; na v67/v68 era REPLAYS) | O editor da sua tampinha (os replays ficam em PERFIL › REPLAYS) |
| A tampinha do meio | O editor da tampinha |
| TREINAMENTO | Exercícios |
| LOJA | Loja |
| COMUNIDADE | Copa dos amigos (eventos da galera) |
| PASSE · *sem temporada ativa* | Aviso EM BREVE (não existe temporada no jogo) |
| RANQUEADA · *competitivo · seu elo* | Painel JOGAR na aba RANQUEADA; o elo e a insígnia são os seus |
| RANKING · *top da semana* | Top semanal, com os prêmios |
| JOGAR | Partida rápida no modo escolhido (o texto embaixo mostra qual) |
| ⇄ TROCAR | Painel JOGAR na aba CASUAL (modo, tamanho, mapa) |
| DESAFIOS | A missão de verdade: jogue 5 partidas, 500 moedas |
| AMIGOS | Dentro do site do RACHA: a página Amigos da conta (busca, pedidos, bloqueados). Jogo solto: aviso explicando que a lista fica na conta e apontando as SALAS |

O pontinho de novidade do menu antigo (você numa sala) aparece em SALAS e no ícone da galera.
As legendas ficam numa linha; se a fonte do aparelho for mais larga, a letra diminui um pouco em vez de cortar.
O fundo é uma imagem parada (pintada uma vez por tamanho de tela). Deitado, o Cristo fica à direita do RACHA, entre a marca
e a coluna da direita; em pé, no céu à direita do cartão do jogador.

## Arena da comunidade
O desenho novo só entra na imagem estática do cenário. Medidas do mundo, linhas, traves, rede, paredes,
área do jogador, câmera e rede online são as mesmas. Nos modos Vôlei, Basquete e Americano a quadra do modo
continua pintada por cima (como antes); o chão de ondas, os murais e as casas ficam em volta.
Se o `arena.js` falhar ou não carregar, a Arena antiga é desenhada (os ganchos têm try/catch).

## v67 · analógico novo, mais câmeras e sem skins
Tudo no `tools/partida_rua.js`. A física e a entrada continuam iguais: o analógico entrega as mesmas 32 direções
de antes (até a v84; desde a v85 são 256, ver `tools/v85/FISICA_RACHA.md`), com a mesma zona morta (anda com o dedo a 20% do curso, para abaixo de 12%). O hash do bloco PHYS não mudou.

**Analógico**
- Maior: a 100% a base tem raio 170 (era 129), a tampinha do manipulador 60 (era 32) e o curso 128 (era 100). O toque pega num círculo de 300.
- Novo desenho: a base é um círculo de quadra no asfalto (aro de cal, círculo do meio tracejado e as setas); o manipulador é uma tampinha amarela.
  Andando, acende uma fatia e um arco do lado de fora na direção que o jogo está usando.
- Fixo na tela por padrão, no canto de baixo à esquerda. Quem já jogava recebe o analógico novo uma vez (`racha-analogico-v67`).
- EDITAR HUD › Controle › ANALÓGICO: novo chip **Fixo na tela**. Adere ao dedo, Seguir dedo, Ocultar ao soltar, Tamanho, Opacidade,
  Tamanho e Alcance do manipulador continuam; Restaurar padrão volta para o fixo.

**Câmeras** (EDITAR HUD › Câmera; ficam salvas com o HUD)
| Opção | O que faz |
|---|---|
| Seguir jogador | A de sempre (o Deslocamento escolhe entre você e o meio do caminho até a bola) |
| À frente | Segue você e mostra mais do campo para onde você corre |
| Seguir a bola | A câmera vai atrás da bola |
| Transmissão | Como na TV: corre de lado com a bola e quase não sobe nem desce |
| Tela parada | O campo inteiro (a de sempre) |
O zoom vale para todas que andam. No replay do gol a câmera continua seguindo a bola, como antes.

**Sem skins (no jogo todo)** — *v69: as skins voltaram como tampinhas personalizadas (ver a seção v69); o resto abaixo continua*
- Você, os bots, o treino, o replay, as salas online, o Chat do Brasil e o lobby: todo mundo é a tampinha lisa (sem texto nem emblema),
  na cor do time: o seu time amarelo, o adversário azul (no online continuam as cores das salas).
- Saíram: o botão SKINS (no lugar entrou REPLAYS), a aba SKINS do VESTIÁRIO (o grupo agora se chama LOJA: LOJA e CAIXAS), o atalho DISCOS
  e o PACOTE LENDÁRIO da loja, o Trocar skin, a raridade e a COLEÇÃO do perfil, a escolha na primeira vez, os avisos de coleção nova e
  de disco liberado, os efeitos de bola, borda, comemoração e uniforme (voltam ao padrão) e o botão de teste do MC Fejuca.
- Quem tinha comprado skin recebe de volta, uma vez, as moedas e gemas que pagou (aviso SEM SKINS no lobby).
- A trilha do lobby, que ficava dentro de SKINS, foi para os AJUSTES (Trilha do lobby).
- Não mexido: o Inventário do site (as recompensas da conta no servidor: skins de tampinha, banners e molduras por nível e evento).
  Elas aparecem só nas páginas do site, não dentro do jogo.

## v68 · salas, sala neste aparelho e o árbitro
**As telas** (no modelo das imagens enviadas)
- GALERA › SALAS virou **SALAS PERSONALIZADAS**: procurar sala, filtros SEM CHEIAS e SÓ ESPERANDO, CÓDIGO (entrar com o código),
  CRIAR SALA, JOGAR AGORA (online), a tabela SALA / MODO / CAMPO / REGIÃO / JOGADORES / STATUS e o aviso "Nenhuma sala ainda".
  A pílula do canto diz a verdade: SEM SERVIDOR, CONECTANDO…, ONLINE (com quantos estão na área) ou NESTE APARELHO; tocar nela abre
  o endereço do servidor (o mesmo quadro de antes). O SEM SENHA da imagem não entrou: o servidor não tem senha de sala. No lugar,
  QUEM ENTRA: ABERTA (aparece na lista) ou FECHADA (só com o código), que é o que existe.
- **CRIAR SALA**: NOME DA SALA, ONDE (ONLINE · precisa do servidor / NESTE APARELHO · você e os bots), QUEM ENTRA, MODO, CAMPO,
  TIMES, TEMPO, BOTS, CANCELAR e CRIAR SALA.
- **A sala** é a de antes (Time Vermelho · Espectadores · Equipe Azul, as regras embaixo, Convidar, Iniciar Partida) em cima da favela
  desenhada (`RUA_FAVELA` no `lobby.js`: céu de fim de tarde, o Cristo no Corcovado, os morros com as casas, as bandeirinhas).
  Ao criar, você aparece em Espectadores, como no print. O chat é o mesmo do RACHA (a barra embaixo e o painel).
- Na partida da sala os times são Time Vermelho × Equipe Azul de verdade (as tampinhas, o placar e o replay).

**A sala neste aparelho** (sem servidor)
- Um "servidor" dentro do jogo responde às mesmas mensagens (create, seat, config, start, finish, kick, say…): a tela da sala, o
  chat e a partida são os mesmos das salas online. CONVIDAR vira CHAMAR BOT (o bot chega assistindo e o árbitro põe num time);
  vaga vazia com BOTS ativado é completada pelo bot do jogo, como online. Partida até o fim dá o prêmio de sempre.
- Enquanto ela está aberta, o jogo fica fora do servidor (CLUBE e COPA avisam e oferecem voltar para a sala); ao sair, volta a conectar.

**O árbitro**
| Quem | Pode |
|---|---|
| Árbitro principal (quem criou a sala; o dono para o servidor) | Montar os times, pausar e voltar o jogo para todos, encerrar a partida, banir, dar e tirar o apito, passar o apito principal |
| Com o apito (até 5 pessoas) | Montar os times, pausar e voltar, encerrar. **Não bane** |
| Os outros | Assistir até o árbitro pôr num time (não escolhem o time; quem entra pela lista, pelo código ou pelo link entra assistindo) |
- Se o principal sai, o apito principal passa para quem tem o apito; sem ninguém com apito, vai para alguém sorteado da sala.
  Se ele cai (fecha o jogo), o servidor passa a sala para alguém e esse alguém faz o mesmo (quem tem o apito, ou sorteio).
- Banido não volta: se entrar de novo (código, lista ou link), o principal tira na hora. Quem herda o apito principal herda a lista.
- Pausar: no menu da pausa (ou no botão SALA durante a partida), PAUSAR PARA TODOS. O jogo de quem roda a partida para de chamar o
  passo da física (como a pausa normal) e todo mundo vê PARTIDA PAUSADA. VOLTAR O JOGO solta.
- Encerrar: ENCERRAR PARTIDA (dois toques). Mostra ENCERRADA com o placar e **não vale prêmio** (nem moedas, nem estatística).
- Sala oficial e Copa dos amigos continuam com as regras delas (sem árbitro).

**Como anda pela rede (sem mexer no server.js)**
- O `server.js` não está no projeto. O combinado do árbitro anda pelo chat da sala, em mensagens curtas e escondidas
  (`⁣ARB:` + códigos de 6 letras de cada um, menos de 120 caracteres): elas nunca aparecem no chat. Quem executa é sempre o
  árbitro principal, com as mensagens que o servidor já aceita do dono: seat, kick, promote, pause, finish.
- Para ficar à prova de cliente modificado, as mesmas regras podem ir para o `server.js` (só o principal e quem tem o apito mexem
  nos times; só o principal bane; lista de banidos por sala). Dá para fazer isso se você mandar o `server.js`.
- Limite: se o servidor estiver rodando a partida na nuvem (o dono da partida é o servidor), pausar e encerrar dependem dele.
- Este `racha.html` é a versão de prévia: ele desliga a conexão (bloco "preview sem servidor" no começo do script), por isso aqui as
  salas mostram SEM SERVIDOR e só a sala neste aparelho funciona. O online foi testado com um servidor de teste, sem esse bloco.

**Testado**: sala neste aparelho de ponta a ponta (criar, chamar bots, montar times, partida Vermelho × Azul, pausar para todos,
encerrar sem prêmio, jogar de novo, sair); online com 4 jogadores (apito, pedidos de quem tem o apito, pausa, encerrar, banir e voltar
pelo código, sucessão para quem tem o apito e por sorteio); telas em 1280×720, 844×390, 390×844 e 1920×1080; os 20 botões do lobby.


## v69 · tampinhas personalizadas e clubes
Pedido: skins personalizáveis no modelo tampinha (para todo mundo, com bastante opção) e os clubes como nas imagens, com o escudo
personalizável. Os ícones de marca da última imagem não entraram: todos os 72 ícones foram desenhados aqui.

**A tampinha** (tela SKINS: o botão SKINS do lobby, a tampinha do meio e o PERSONALIZAR do perfil)
| Aba | O que tem |
|---|---|
| PADRÃO | 48 padrões (liso, metade, listras, xadrez, losangos, bolinhas, anéis, alvo, raios, espiral, chevron, zigue-zague, ondas, colmeia, bola, degradês, camuflado, pixel, respingos, escorrido, tijolos, grade, arco-íris, mármore, labaredas, escamas, xadrez escocês, galáxia, zebra, onça, pipas…) · FUNDO + até 2 cores · posição, tamanho e ângulo |
| BORDA | 19 saias (Clássica com o nome RACHA em volta, dentadas, lisa, ondulada, bicolor, listrada, pontilhada, coroa, engrenagem, trançada, rebites, cromada, ouro, neon, fogo, arco-íris, gelo) · 1 ou 2 cores |
| ÍCONE | 72 ícones próprios + TEXTO (até 3 letras) · 1 ou 2 cores · posição, tamanho, ângulo · estilo CONTORNO, RELEVO, SOMBRA ou ADESIVO |
| PRÉ-PROJETADO | 44 tampinhas prontas para usar como estão ou de ponto de partida |
| INVENTÁRIO | Até 24 salvas neste aparelho e, com o jogo aberto pelo site com login, as skins da sua conta do RACHA (Tampinha da Rua, Artilheiro, Lenda Suprema, Aniversário, Parceiro, Fundador) como tampinhas, sem custo |
- Cores: cada uma com a amostra (abre a paleta de 40 cores, as usadas na tampinha e MAIS CORES), o código hexadecimal e o
  **conta-gotas** (toca na tampinha grande e pega a cor daquele ponto). Posição no quadradinho (arrasta; o alvo volta ao centro).
- ⋮ na tampinha grande: Aleatória, Desfazer, Refazer, Salvar no inventário, Copiar o código, Colar um código (de um amigo),
  Voltar à equipada. Desfazer, refazer e aleatória também ficam do lado.
- **Preço**: cada peça tem a raridade (a faixa de cor em cima do item): grátis, comum 300 moedas, raro 800 moedas, épico 40 gemas,
  lendário 100 gemas (23 peças grátis). CONCLUÍDO mostra o que falta comprar e o total; a peça comprada fica sua neste aparelho
  para qualquer tampinha e para o escudo do clube. Sem moedas/gemas, a janela diz quanto falta e leva para a LOJA (e volta ao editor
  do jeito que estava). Zerar perfil apaga também as peças, as salvas e a equipada.
- A tampinha vira um código curto (`T.` + até 38 letras) que vai no `perfil.skin`: aparece no lobby, no perfil (nome e raridade da
  peça mais rara), na partida, no treino, no replay (também nos salvos), nas salas online (o `skin` do hello/profile, que o servidor
  já repassa) e no Chat do Brasil (o nome na cor dela). Os bots e os companheiros do treino ganham tampinhas variadas, sempre a
  mesma para o mesmo nome. **O time continua no halo** em volta de cada um (o seu amarelo × azul; nas salas, vermelho × azul).
  Na sala neste aparelho, o bot chamado já chega com a tampinha dele no cartão (1 linha no `salas_rua.js`).
- Com a conta: equipar salva o código na conta (`usuarios.tampa`); os membros do clube veem a tampinha de cada um, e um aparelho
  novo começa com a da conta.

**Os clubes** (CLUBE no lobby e GALERA › CLUBE)
- Lista: o cartão **Gostaria de criar seu próprio clube? + CRIAR CLUBE** (ou o seu clube), **OU**, as abas **CLUBES / CONVITES**,
  **Pesquisar clube** com o atualizar, e cada clube com escudo, nome e bandeira, descrição, MEMBROS (n/30), TROFÉUS e RANKING.
- **Criar Clube**: escudo (abre o editor no modo escudo: FORMA, PADRÃO, ÍCONE, PRÉ-PROJETADO), NOME DO CLUBE, DESCRIÇÃO
  ("Junte-se a nós!"), TROFÉU MÍNIMO (0 a 1000), PAÍS (24), TIPO (Público / Só convite) e **CRIAR 10 💎** (devolve se der errado).
- A página do clube: escudo (o dono edita no lápis), nome e bandeira, descrição, o dono, o megafone (CONVIDAR), TROFÉUS, RANKING,
  TIPO, TROFÉU NECESSÁRIO, SAIR / ENTRAR (com o motivo quando não dá) / EDITAR (dono) / OUTROS CLUBES e MEMBROS com a tampinha,
  Proprietário ou Membro e os troféus. O dono toca num membro para PASSAR A DONO ou TIRAR DO CLUBE.
- Regras (no servidor): um clube por jogador, até 30; troféus = vitórias (1 por vitória), os do clube são a soma; ranking pelos
  troféus; Público entra quem tiver o troféu mínimo; Só convite só com convite (convidado entra mesmo sem os troféus); qualquer
  membro convida pelo ID público ou usuário (respeita os bloqueios); o dono sai e o membro com mais troféus vira dono; o último a
  sair fecha o clube. Nome único (sem diferença de acento/maiúscula), 3 a 24 letras. Limites: 5 clubes criados por dia,
  30 convites e 20 entradas por hora.
- **Onde mora**: com o jogo aberto pelo site e com login, na conta (de verdade, com a galera). Sem a conta (o link de teste),
  **NESTE APARELHO**: dá para criar o clube, fazer o escudo e ver a página, mas ele só tem você e não há convites (a tela avisa).
  O clube antigo do servidor das salas continua em **CLUBE DA TURMA**.

**Para publicar** (além do de sempre): `npm run db:push` cria `clubes`, `clube_membros`, `clube_convites` e a coluna `usuarios.tampa`.

**Testado**: o desenho de todas as peças e dos pré-projetados; o código (ida e volta de 3.000 tampinhas sorteadas, até 40 letras);
o editor (cada aba, paleta, conta-gotas, posição/tamanho/ângulo, desfazer/refazer, salvar, compra e equipar) em 1280×720, 844×390,
390×844 e 1920×1080; a tampinha no lobby, no perfil, numa partida 2v2 com bots, num replay salvo e numa sala online com 2 jogadores
(cada um vê a do outro); os clubes neste aparelho (criar com escudo, página, lista) e na conta com uma plataforma simulada
(lista por troféus, convite aceito, trocar de clube, troféu mínimo, membros com tampinha, skins da conta); os 20 botões do lobby;
o `clubeRouter.ts`, o `schema.ts` e o `ponteJogo.ts` conferidos pelo TypeScript com stubs (sem `node_modules` aqui).

## v70 · a revisão completa (auditoria)

O resumo, como rodar, a configuração, os testes feitos e as limitações estão no [`LEIA-ME.md`](../LEIA-ME.md) da raiz. Aqui fica
onde mora cada parte.

| Arquivo | O que tem |
|---|---|
| `tools/v70/regras.py` · `camera.py` · `interface.py` · `perfil.py` · `online.py` · `polimento.py` | As trocas de cada etapa no `racha.html` gerado (`SUBS`) e, documentadas, as poucas dentro do bloco de física (`SUBS_PHYS`: só regra, texto e dados do replay) |
| `tools/v70/ajustes.js` · `interface.js` | Ajustes em abas, Tamanho da interface, teclas, HUD com escala própria, editor dos controles |
| `tools/v70/economia.js` · `perfil.js` · `tutorial.js` | Loja, missões, limites do dia, dificuldade, perfil e estatísticas, salvamento (aviso, exportar/importar), tutorial e COMO JOGA |
| `tools/v70/online.js` · `comunidade.js` | O cliente das salas (conta, curva/ginga de quem joga de fora, reconexão, eventos uma vez) e a COMUNIDADE |
| `tools/v70/polimento.js` | Contorno dos times e VOCÊ em campo, etiqueta do modo, camadas (foco, Tab, inert, Escape), abas e estados, Reduzir animações seguindo o sistema, Ajustes com palavras simples |
| `tools/v70/celular.js` (v70.1) | GIRE O CELULAR em pé (pausa a partida contra os bots), o modo em que tudo cabe no celular deitado (o zoom de quem rolaria), as sub-abas do perfil e os Ajustes compactos |
| `tools/v70/enxuto.py` · `enxuto.js` (v70.2) | Só FUTEBOL e COM CURVA, só a ARENA e o ESTÁDIO de grama (o desenho novo, mesma física), a bola sem efeitos e o Indicador de Direção começando desligado; o que saiu fica guardado (`V702`) |
| `public/game/v70.css` | A camada de interface da v70; no fim, as cores por papel (amarelo/verde/vermelho/neutro/azul), o foco visível e o desabilitado |
| `public/game/config.js` | Demonstração × produção, o endereço do servidor das salas e as origens da plataforma |
| `public/game/fontes/` | As fontes locais opcionais (o build usa os `.woff2` que estiverem aqui) |
| `../server/` | O servidor da turma (salas, Chat do Brasil, clubes da turma, Copa, duelos), sem dependências |
| `api/lib/salas.ts` · `api/lib/selo.ts` | A plataforma monta o servidor da turma e confere o selo do resultado online |
| `../tools/mapa_codigo.py` | Lista as funções trocadas por versões posteriores e qual delas está valendo (`tools/MAPA_REDEFINICOES.md`) |
| `../tests/` | As suítes automáticas (`bash tests/roda_tudo.sh`) |

**As cores por papel** (v70.css, fim do arquivo): amarelo `#ffd23f` = ação principal e seleção · verde `#23893d` (era o lima
`#98f262`, com o branco ilegível) = confirmar · vermelho `#d8392b` (era o laranja `#d96f45`) = sair/excluir · grafite `#3a3f43`
(ou a ardósia das telas azuis) = voltar/cancelar · azul `#1f6fd1` = ir para outra tela. Foco: anel `#5cc8ff` de 4 px.

### v70.1 · o celular deitado (depois do teste no iPhone)

O jogo é só na horizontal. **Em pé**, num aparelho de toque, a tela GIRE O CELULAR (`#v70-gire`) cobre tudo — prende o
foco, deixa o resto inerte, o Esc não fecha — e a partida contra os bots (ou o treino) pausa; deitando, a pausa continua
aberta com o foco no CONTINUAR. Num computador com a janela em pé nada disso aparece.

**Deitado no celular** (`#lb.v70-cabe`: o `lbLayout` liga quando a escala do palco fica abaixo de `UIX.cabe` = 0,56, ou
seja, em celular; tablet e computador ficam como na v70) as telas e janelas voltam à escala do palco, como na v69, sem os
pisos de 44 px / 12 px (que empurravam tudo para baixo). O que ainda passaria da altura encolhe junto: o `celular.js` põe
`zoom` nos filhos de quem rolaria (`V70CB_ALVOS`), o maior que cabe, até 0,62; lista longa de verdade continua rolando no
tamanho normal. Com o Tamanho da interface acima de 100% nada encolhe (a tela rola). Para caber sem ficar miúdo: o perfil
ganha as sub-abas CARTÃO · ESTATÍSTICAS · RECORDES · PARTIDAS (a tampinha fica do lado), o ranking fica em três colunas,
a criação de sala em duas, a comunidade com os quatro cartões numa fileira e os modelos prontos numa faixa de duas
fileiras que arrasta de lado (como as outras faixas do editor). Os Ajustes (`#pop-ajustes.v70-compacto`, tela com até
520 px de altura) põem o título, as abas, o PRONTO e o ✕ numa linha e as opções em duas colunas; sem mouse nem touchpad
o grupo do teclado físico sai (fica uma nota). Na partida, o editor dos controles (`#hp`) e o COMO JOGA (`.tu-intro-cx`)
usam o mesmo zoom quando a tela tem até 520 px de altura.

**O lobby como na v69, com as opções novas**: o JOGAR inteiro e o ⇄ TROCAR em cima do canto dele, em todos os tamanhos
deitados. Fora do celular o TROCAR cresce um pouco para cima e a área de toque dele passa do desenho (`::after`).

### v70.2 · enxuto: 2 modos, 2 mapas, a bola sem efeitos

O pedido: deixar só o futebol normal e o COM CURVA, um estádio de grama além da Arena, tirar os outros campos e os
efeitos da bola, e o indicador já vir desligado. Tudo em `tools/v70/enxuto.py` (as trocas de texto, fora do bloco de
física) e `tools/v70/enxuto.js` (colado depois do `celular.js`).

* **Modos**: `V702.modos = ['futebol', 'curva']`. O `MD_MAP.has` só reconhece esses (o `mdValida` devolve futebol para os
  outros), e o `v702Aplica()` refaz a partir das listas guardadas (`V702_TODOS`) o `MD_LISTA`, o `MD_SALA`, o `EST_MODOS`
  e o `SL_MODO`, e esconde (`.v702-fora`) os chips do JOGAR, o "Layout da GINGA" do editor, as teclas da FINTA e do
  DRIBLE e a ajuda deles. O `rqCria` (por onde passa toda partida) e o `rqComeca` normalizam modo e mapa; as missões do
  dia trocam o mapa/modo que saiu; o perfil esconde os cartões de cesta/touchdown/pontos (os totais seguem); a novidade
  antiga dos seis modos não abre mais. O código do vôlei, do americano, do basquete e da ginga **não foi apagado**.
* **Mapas**: `V702.mapas = [0, 4]`. O **ESTÁDIO** é o `CAMPOS[4]` (`id:'gramado'`, `grama:true`) com as medidas da Arena
  (margem 206 × 59, `FATOR_BOLA`, rede, entra pela boca): paredes, traves, redes e marcas idênticas — o teste confere
  1v1 a 4v4 e o mesmo chute dando o mesmo caminho da bola. Desenho (`gramadoDesenha`, pelo gancho no `desenhaEstadio`):
  o gramado com as listras do corte (simétricas a partir do meio), o xadrez de leve, o pé da grama e o gasto na boca do
  gol; as linhas de cal (a de fora, o meio, o círculo, as áreas, a meia-lua, as marcas e os arcos de escanteio) e as
  bandeirinhas; as placas em volta (de frente em cima, com RACHA, FUTEBOL DE RUA, TAMPINHA, GOLAÇO, VÁRZEA, PELADA,
  RESENHA, CRAQUE); a arquibancada com a torcida dividida (a cor do seu time à esquerda, a do adversário à direita), a
  galera na grade com o bandeirão e o sinalizador, o banco de reservas e as torres de luz. Sem torcedores: as cadeiras e
  os degraus vazios. Ultra leve: as listras e as linhas lisas (`gramadoPlano`, gancho no `campoPlano`). O som de fundo é
  o da torcida (como a Arena). Favela, Escadão e Viaduto ficam guardados; um replay gravado neles continua no mapa dele.
* **A bola sem efeitos**: `trilhaDesenha` (o rastro, no jogo e no replay) e `desenhaRespingos` (o respingo e o estalo)
  não desenham nada; `X49.ball` fica `classic` e o grupo BOLA saiu do `SK_EFEITOS`. Os Efeitos do Jogo seguem para o
  confete, o nome da jogada e o brilho do chute no halo.
* **Indicador de Direção**: `OPC_PADRAO.dir = false`; quem já tinha salvo ligado é desligado uma vez
  (`racha-v702-dir` no aparelho) e depois vale a escolha da pessoa.
* **Servidor**: `MODOS_SALA` e `MAPAS_SALA` no `turma.js` (ver `server/LEIAME.md`). A plataforma continua aceitando o
  `modo` de partidas antigas no registro de resultados (`api/racha/jogoRouter.ts`), sem mudança.
* **Para trazer de volta**: pôr os ids em `V702.modos`/`V702.mapas` no `enxuto.js` e em `MODOS_SALA`/`MAPAS_SALA` no
  servidor e rodar o build. Os testes fazem isso só na página de teste (`__T.guardados()`) para a regra dos modos
  guardados continuar conferida.

## v71 · preto × branco e o lobby novo

O pedido: "cores rivais no jogo: preto × branco; o personagem padrão não é mais amarelo, é metade preto e metade branco;
no time preto ele fica todo preto, no branco todo branco; nas salas também; com outra skin, não muda" e "um layout que não
pareça de IA, bem de game, porque está muito confuso". As trocas de texto em `tools/v71/times.py` (fora do bloco de
física: `SUBS_PHYS` vazio); o resto colado no fim do script (`tools/v71/times.js` e `tools/v71/lobby.js`, depois do
`enxuto.js`); o visual em `public/game/v71.css` (depois do `v70.css`).

**Times** (`times.js`): `TIME71` = {Time Preto `#1b1d21`, Time Branco `#f3f1ea`} com a cor da letra de cada um (`txt`).
`skinDoTime` e `rqCor` passam a devolver essas cores (o halo, a torcida, a rede, a apresentação, o replay das salas), o
`SALA_COR` também. O placar (`placarCaixa`/`placarFundo`) põe o número escuro em cima do branco e claro em cima do preto,
com o ○ cheio e o ◌ tracejado na cor da letra; a tela do fim pinta os números do mesmo jeito (`rqMostraFim`); a barreira
da saída de bola ganha contorno (`desenhaSaidaArco`). Os nomes (Time Vermelho/Equipe Azul → Time Preto/Time Branco) mudam
nas telas, no menu do árbitro, nos avisos e no servidor (`server/turma.js`, só as mensagens).

**A tampinha** (`times.py` em `tampa_rua.js` e `times.js`): `TP_PADRAO_COD` é a padrão (o padrão "Metade", preto e branco,
borda clássica, sem ícone); `TP_TIME_COD` = [toda preta, toda branca] (lisas). `tpNoTime(código, time)` e
`tpNoTimeSk(skin, time)` trocam a padrão pela do time e deixam qualquer outra como está. Valem no seu botão (`render`), nos
bots (`skinDoBot`: os bots jogam com a padrão), na sala online (`net49Skin`), no cartão da sala (`slTampa`, pelo lugar no
time) e no replay (`rpSkinDe`/`rpSkinEnt`). A amarela de antes (`TP_PADRAO_ANTIGO`) é a Clássica dos modelos prontos: não
muda de cor. Quem estava com ela equipada passa para a padrão nova uma vez (`racha-v71-padrao`).

**O lobby** (`lobby.js`, classe `v71` no `#lb`): os botões de sempre são movidos para `nav.v71-esq` (LOJA, TAMPINHA,
CLUBE, TREINO) e `nav.v71-dir` (SALAS, AMIGOS, RANKING) e ganham o desenho novo (SVG próprio, contorno grosso); a LIGA
(`[data-rx=ranqueada]`) vai para o topo do lado do `#lb-eu`; o `#lb-modo` (o antigo ⇄ TROCAR) vira o cartão do MODO
(o desenho do modo, o nome, o tamanho e o campo) e o `#lb-jogar` fica só com o JOGAR; o nível vira o selo `#v71-nv`.
PASSE, COMUNIDADE, o CHAT grande e o `.rx-amg` ganham `.v71-fora` (somem e saem do Tab). O `lbRender` e o
`renderRanqueada` chamam o `v71LbSync` (o texto do MODO, os nomes lidos, o selo). O cenário ganha um véu escuro nas bordas
e embaixo (`RUA_CENA` embrulhado). Medidas (px do palco, 888 de altura): os quadrados 130 com 14 de espaço, o topo 104, os
DESAFIOS 390 × 106, o MODO 300 × 150 e o JOGAR 400 × 150, a 28 da borda; os pisos de toque do v70 (`--s`) continuam.

**O JOGAR (a folha)**: `#lb-rq .rq-caixa` vira uma grade (abas · cabeçalho da liga · linhas · nota | JOGAR); o cabeçalho da
CASUAL e as descrições do modo e do mapa saem (o COMO JOGA fica do lado do MODO); na LIGA a linha BOTS sai porque a nota
de baixo já diz o nível (`.v71-rq`); o JOGAR da folha é o amarelo do lobby (118 de altura no celular deitado).

## v71.1 · todas as telas no estilo do lobby novo

O pedido: "muda o interior dos botões, quando clica; o perfil, tudo, os ajustes, quando pausa, todos mesmo".

**O tema** (`tools/v71/tema.py`, rodado pelo `aplicar_rua.py` a cada build): lê `lobby.css`, `sala.css`, `tampa.css` e
`v70.css`, acha cada declaração com uma cor da família do azul-marinho (matiz 222°–236°, saturação ≥ 0,2) e escreve em
`v71-tema.css` a mesma declaração, com o mesmo seletor e o mesmo @media, trocando só a cor por um cinza-carvão (matiz 214°,
saturação baixa) de luz parecida — as escuras um pouco mais escuras, porque o azul parece mais escuro que o cinza. As
variáveis `--sx-*` e `--rx-*` vão para o carvão. O arquivo entra depois do `v70.css` e antes do `v71.css`. As cores de
destaque (o azul dos botões AZUL, o céu, os roxos das raridades) ficam fora da faixa e não mudam.

**O kit** (`v71.css`, seção 4): as variáveis `--k*` em `:root` (o preto do contorno, o carvão da face, o amarelo, as
sombras de relevo); a moldura das telas (o carvão com a colmeia de leve e a luz quente em cima); `.tl-cab` (o contorno
de baixo por dentro, para a altura não mudar), `.tl-voltar`, `.tl-carteira`, `.tl-abas`/`.tl-aba`, `.tl-sub`, `.tl-seg`;
`.lb-btn` e `.sx-bt` com as cores por papel da v70 e a cara nova; as janelas (`.pop-caixa`, `.pop-tag`, `.pop-acoes`).
Depois, cada tela (perfil, ranking, replays, loja, treino, comunidade/salas/clube/copa, chat, editor, desafios, a barra
de escolhas da sala) e as janelas de tamanho real (Ajustes, pausa, fim, COMO JOGA, editor dos controles, chat da sala).
No celular deitado (`.v70-cabe`) as abas, as bordas e as vitrines voltam às medidas de antes, para o que encolhe para
caber não encolher mais.

**O JS** (`telas.js`): o `v70PfAplica` liga as partes do perfil em toda tela deitada (o CSS da v70.1 só fazia isso no
`.v70-cabe`; o do v71 repete as regras para `#lb.v71:not(.retrato)`); o `tpeNomeDe` devolve "Padrão" para a
`TP_PADRAO_COD`; o `renderLoja` marca `data-r` (a raridade) em cada peça do dia; os desenhos das abas dos Ajustes
(`#ajx-t-*`) e dos botões da pausa (com um MutationObserver: o `pausaAbre`/`pausaSair` trocam o texto do SAIR e o
desenho volta).

## v73 · o sensor mais transparente (e o TESTE saiu)

O pedido: "remova esse teste; agora o sensor preto ao redor dos players deve ser mais transparente, para ficar com um
visual mais bonito".

**O sensor** (`sensor.js`): é o halo de spray de cada jogador (v61: `aroDe` → `aroJog`, com as imagens prontas de
`spriteHalo(cor, rpx, 'p')` e `spriteTag`), mais o contorno do time da v70 (`v70Contorno`, chamado pelo `aroDe` da
polimento nas partidas e no replay). O mapa das redefinições confirma que estas eram as versões ativas. A v73 troca as
três por versões que chamam a de antes: o `spriteHalo` da camada `'p'` monta a imagem pronta com `globalAlpha = 0,45`
(a mesma imagem, pixel a pixel × 0,45; a forte sai do cache), o `spriteTag` faz o mesmo com 0,7 (guardando o `dc`, a
distância da ponta ao centro) e o `v70Contorno` desenha com `globalAlpha × 0,4`. A camada `'c'` (a carga do chute armado)
e a piscada do chute ficam como estavam. A prévia dos times em SKINS (`miniTime` → `spriteAro`) usa o mesmo halo.
Os valores ficam em `SENSOR73 = {halo, tag, contorno}`. Só desenho: o alcance do chute (`ALCANCE_CHUTE`) e o resto da
física não mudam.

**O TESTE saiu**: o build não junta mais `tools/v72` (nem o `teste.js`, nem as duas trocas do `teste.py` no
`physicsStep`) e não põe mais o `<link>` do `v72.css`. O bloco de física voltou a ser o da v71.1, byte a byte (8 trocas),
e o jogo gerado é o da v71.1 com o `sensor.js` a mais. O `sensor.js` também apaga do aparelho a escolha que o TESTE
guardava (`racha-teste-modo-v72`). O teste é o `tests/v73_test.py` (com `RACHA_REF=<página de teste da v71.1>`, compara o
bloco de física e o caminho de um roteiro de 1.800 passos).

## v74 · o Estádio virou o society da imagem

O pedido: "troque o campo de grama por esse; ajuste o tamanho e os gols" (a imagem de um society à noite, no meio de um
estacionamento e das casas do morro).

**Qual implementação valia**: o mapa das redefinições mostrava `desenhaEstadio` e `campoPlano` com 2 definições, a que
vale vindo da v70.2 (`tools/v70/enxuto.js`: com `CAMPO.grama`, `gramadoDesenha` e `gramadoPlano`). O `buildStatic`
(a imagem do cenário: `G().plano ? campoPlano : … desenhaEstadio(g, false)`) e o `previaMorro` (a prévia do JOGAR:
`desenhaEstadio(g, true)` + `golEstadio`) chamam as duas; o gol de verdade é o `golEstadio` desenhado nas imagens `nets`,
por cima da bola, e a sombra dele é o `estGolChao`, no cenário. O `campo.js` troca de novo as duas (com `CAMPO.grama`:
`campoNoite` e `campoNoitePlano`; se der erro, guarda em `window.RUA_CAMPO74_ERRO` e chama a da v70.2), e mais duas: o
`buildStatic` (depois do de antes, monta `CN_FORA`, as duas imagens de fora do mundo) e o `desenhaStat` (antes do de
antes, desenha essas imagens quando a câmera mostra além do mapa). Agora as quatro valem do `tools/v74/campo.js`.

**A geometria não muda**: tudo sai de `GL, GR, GT, GB` (a área do jogador: a grama e o alambrado), `LX0…LY1` (as linhas),
`MARCAS` (as marcas de cada tamanho, pelo `grLinhas` da v70.2), `GOL_Y0/GOL_Y1/GOL_PROF` (os gols) e da margem do Estádio
(a da Arena, `[206, 59]`, que continua no `CAMPOS`). Só a cor `fundo` do Estádio troca, em tempo de execução, para a noite
(`#161b21`). As peças do kit são desenhadas em `CN.D = 2,2` px do mundo por px da imagem (um carro fica com umas duas
tampinhas de comprimento), igual em todo tamanho de time.

**O kit**: `tools/v74/campo_kit.py` recorta da imagem os carros (máscara de retângulo de canto redondo), as árvores (o
verde dentro do círculo da copa, só o maior pedaço) e as faixas de casas, e junta numa imagem só (`.png` e `.webp`) com o
mapa das peças (`.json`). O build troca o `/*KIT74*/null` do `campo.js` por `{src:"data:image/webp;base64,…", p:{…}}`;
quando a imagem abre (`CN_IMG.ok`), o `cnRefaz` refaz o cenário se o Estádio estiver aberto e apaga as prévias do Estádio
guardadas no `PREV_MORRO`.

## v75 · a imagem no fundo do lobby

O pedido: "bote essa imagem no lobby" (a quadra da favela com o Rio de Janeiro atrás, no fim de tarde).

**Qual implementação valia**: o fundo do lobby é o canvas `LB.fundo`, pintado pelo `pintaFundoLobby` (jogo-base), que
chama o `cenaQuadra`, que entrega o desenho ao `window.RUA_CENA` do `lobby.js` (o céu, o Cristo, o morro, o muro e a quadra
desenhados) — e a v71 (`tools/v71/lobby.js`) embrulha esse `RUA_CENA` com o véu escuro nas bordas e embaixo. O letreiro
RACHA (`.rx-logo`), a tampinha (`#lb-brilho` e o emblema) e os botões são elementos à parte, por cima do canvas. A v75
embrulha o `RUA_CENA` de novo: com a imagem aberta (`L75.ok`), ela é o cenário (`l75Cena`: o encaixe do `l75Encaixe` e o
mesmo véu da v71, `l75Veu`); enquanto abre, o degradê (`l75Espera`); se não abrir (`L75.erro`), chama o de antes.

**O encaixe** (`l75Encaixe`, em px do palco): deitado, a escala é a que põe o alto da imagem a `L75_BORDA.alto` = 100 px
do topo (abaixo da fileira de cima: o Cristo fica no alto da imagem) e o pé dela no pé da tela; na horizontal, o meio da
quadra (`L75.foco` = 930, 672 px da imagem) fica embaixo da tampinha (`PALCO.cx`). O que sobra fora da imagem vem da
`l75Estendida`: uma cópia dela com 300 px espelhados de cada lado e, em cima, o céu da primeira fila esticado (espelhar o
alto repetiria o Cristo de cabeça para baixo). Em pé, cobre pela altura em volta da quadra.

**A imagem**: `tools/v75/lobby_fundo.py` grava `lobby_fundo.webp` (WebP 85, o mesmo tamanho); o build troca o
`/*FUNDO75*/null` do `lobby.js` por `{src:"data:image/webp;base64,…", w, h}` (a medida vem do cabeçalho do PNG original).
Quando a imagem abre, o `l75Repinta` zera a chave do `LB.fundo` e chama o `pintaFundoLobby` (com o lobby escondido, ele
pinta quando abrir).

## v76 · a grama de fora escura, a calçada de Copacabana e as tampinhas animadas

O pedido: "o lado de fora do campo, deixe todo nesta grama mais verde escuro, e a calçada mude, bote uma mais brasileira,
e crie essas skins animadas" (a folha da COLEÇÃO MISTURA DE TODAS).

**O campo** (no próprio `tools/v74/campo.js`, que é o desenho do Estádio): `cnFaixas` pinta as faixas claras só no
retângulo das linhas (`LX0…LX1 × LY0…LY1`), com a grama de fora no verde escuro (`cnGrama` e `campoNoitePlano`); a
calçada é `cnCalcadao` (no lugar do bloquinho): as 4 faixas em volta do alambrado, cortadas em diagonal nos cantos, cada
uma com a pedra branca e as ondas pretas — curvas a uma distância `d` do alambrado com `d + A·sen(2π s/L)` (`CN.onda` =
a largura de cada onda, a altura e o comprimento) —, as pedrinhas (`cnPadrao('pedrinha')`) e o escuro para fora. O
`cnPiso` chama o `cnCalcadao` e põe o meio-fio de antes.

**Qual implementação valia nas tampinhas**: a tampinha é desenhada por `tpDesenha → tpTampa` (`tools/tampa_rua.js`, v69:
`tpSaia`, o miolo com `tpPintaTampo → tpPintaIcone`, e o verniz); no jogo, `drawBotao` e `botaoPronto` (os dois da v69)
chamam `tpPoe`, que usa a imagem pronta `tpSprite`. O mapa das redefinições confirmava essas versões. A v76 (`skins.js`)
põe as caras no fim de `TP_ICONES` (ids `zc zr zb zp zd zf zg zx`, `cara:true`) e as bordas no fim de `TP_BORDAS` (ids
`vf ve vb vp`, `anim`), e troca: `tpTampa` (com uma cara: os dentes, o anel escuro, a cara no quadro parado `t0` e um
verniz mais leve), `tpSaia` (as bordas novas: a luz rente aos dentes e a beira acesa), `tpPintaIcone` (a cara num escudo
de clube, como um medalhão), `tpPoe` (na tela que se mexe — `sk76Vivo`: o canvas da partida, o do lobby, o do perfil e o
do editor, nunca com Reduzir animações ou Ultra leve —, a parte parada vem pronta de `sk76Base` e a cara e o aro são
desenhados a cada quadro com o tempo de `performance.now`), `tpDoBot` (troca a cara e a borda animadas de um bot por
comuns), e no editor `tpePreProjetados`, `tpeFaixa`, `tpeSincroniza`, `tpeNomeDe` e `pintaPreview` (o lobby chama a cada
quadro com o editor aberto: a tampinha grande e os cartões da coleção mexendo).

**As caras**: `SK76_CARAS` (o id, o nome, o que mexe, o quadro parado e a função). As de ilustração (`skCria`,
`skCristo`, `skPitbull`, `skFe`, `skDragao`) desenham a peça do kit e, por cima, o que mexe; a CRIA, o CRISTO e a FÉ têm
uma camada da frente (o menino, a estátua, a cruz) para a luz passar por trás. BRASIL (`skBrasil`: a bandeira pronta em
`sk76Cache`, desenhada em fatias que sobem e descem), DEBOCHE (`skDeboche`) e GALÁXIA (`skGalaxia`: o fundo e o disco
prontos, o disco girando achatado e inclinado, os planetas no plano dele) são desenhadas aqui. O kit
(`tools/v76/skins_kit.py`) recorta da folha o miolo de cada tampinha (o centro achado pelo aro) e as camadas da frente
(os pixels ligados a uns pontos de dentro, numa região do desenho); o build troca o `/*KIT76*/null` por
`{src:"data:image/webp;base64,…", p:{…}}`.

**A coleção**: `SK76_PRE` (os 8 desenhos prontos, com as cores de cada borda). Os códigos das 8 ficam fixos (a lista
nova só cresce no fim).

## v77 · o lobby, o perfil e as telas das imagens, e o mapa principal novo

O pedido: o mapa principal trocado pela quadra da imagem; o perfil como na imagem, com a tampinha reta como no lobby; o lobby
como na imagem, com o fundo dela, mas sem a fileira de tampinhas embaixo (trocar de tampinha é na TAMPINHA); o jogo todo
parecido com as duas imagens; e cada botão abrindo só a sua tela ("ranking do ranking"), tudo em ordem.

**Qual implementação valia**: o lobby da v71 (`tools/v71/lobby.js` + `v71.css`: os botões quadrados dos lados, o topo, os
DESAFIOS, o MODO e o JOGAR, sincronizados por `v71LbSync` depois de cada `lbRender`), com o fundo da v75 (`window.RUA_CENA`
embrulhado pelo `tools/v75/lobby.js`, que embrulha o da v71, que embrulha o do `lobby.js`) e a tampinha do meio do
`pintaBrilho` (jogo-base) no canvas `LB.brilho`. As telas: `TELAS` + `abreTela`/`fechaTela` (a que vale é a do
`tools/editor_rua.js`), com as abas de grupo do jogo-base (`GRUPOS` + `montaAbas`, chamado no fim do script; a v70 trocou o
grupo `galera` pela COMUNIDADE e apagou o `vestiario`). O perfil: `renderPerfil` (a da v70, `tools/v70/perfil.js`, com
`pxMonta`/`pxEstRender`/`pxMeta`/`pxClube`) e as partes da v70.1/v71.1 (`V70PF`, `v70PfAplica`); a tampinha do perfil é a
do `pintaPalcoPerfil` (jogo-base, chamado pelo `lbAnima`). A Arena: o `desenhaEstadio` do jogo-base chama o
`window.RUA_ARENA` do `arena.js` pelo gancho do build (e o `campoPlano`, o `RUA_ARENA_PLANO`); a v74 desvia os dois só
para o Estádio. O mapa das redefinições confirmava essas versões.

**As peças** (`tools/v77/pecas.py`): o letreiro sai da imagem do lobby pelo contorno preto da tinta (o maior pedaço escuro,
fechado, mais os respingos perto); o fundo é a imagem com os botões, o letreiro e a tampinha apagados por uma máscara e
completados pelo LaMa (OpenCV Zoo, ONNX, rodado em janelas de 512 px, o meio primeiro) — os braços e a cabeça do Cristo
são desenhados à mão por cima, nas cores da estátua; os ícones saem do fundo escuro de cada botão (a diferença para a cor
da beirada da caixa; a moeda e a coroa, pela cor do ouro) e vão numa folha só (`icones.webp` + `icones.json`); o banner do
perfil é um pedaço do morro do fundo limpo, quase sem cor e escuro. O kit da quadra (`tools/v77/quadra_kit.py`): os
pedaços do muro de cima (com as beiradas esmaecidas para emendar), as escadas e as casas dos lados, as lixeiras, as
faixas de fora (em cima e embaixo, menores no kit), o grão da tinta (um pedaço de verde limpo emendado nas beiradas pelo
LaMa, guardado como cinza em volta de 128) e 7 pedaços gastos (onde a tinta verde saiu, achados pela cor do cimento e
pelas rachaduras, sem as sobras compridas das linhas). O build (`_v77()` no `aplicar_rua.py`) troca os marcadores
`/*FUNDO77*/null`, `/*LETREIRO77*/null`, `/*ICONES77*/null`, `/*BANNER77*/null` e `/*KIT77*/null` pelas imagens em WebP
(base64) com as medidas e os mapas.

**O lobby** (`tools/v77/lobby.js`): liga a classe `.v77` no `#lb` (o visual mora no `v77.css`, só com ela), embrulha o
`RUA_CENA` (a imagem limpa cobrindo a tela, a tampinha da imagem embaixo da tampinha do jogo — `l77Encaixe` —, com um véu
leve em cima e embaixo; sem a imagem, o da v75), o `RUA_LOBBY.layout` (a tampinha um pouco mais para baixo, para o
letreiro caber em cima) e o `pintaBrilho` (a tampinha reta, do tamanho da imagem, com a sombra no chão e sem a bola), e
troca os desenhos dos botões pelos da imagem (`v77Ic`: um recorte da folha como fundo de um `<i>`), põe o EVENTOS (abre a
`copa`), o XP em números, a barra do elo na LIGA, os AMIGOS no topo (a lista da conta na plataforma; sem ela, a tela
AMIGOS), o letreiro (`<img>`; o RACHA escrito fica para o leitor de tela) e o MODO novo (`v77LbSync` depois do
`lbRender` e do `renderRanqueada`). A moeda e a gema de todo o jogo (`.ic-moeda`, `.ic-gema`) passam a ser as da imagem
(`tools/v77/pecas.js`).

**As telas** (`tools/v77/telas.js`): o `montaAbas` apaga os grupos `perfil` e `galera` antes de montar (nenhuma tela ganha
abas de outras) e depois arruma o cabeçalho de cada tela (`v77Cabecalhos`: o título do botão com o desenho, as moedas e
os 3 ícones — chat, amigos, ajustes); o `lbMarcaTela` esconde o lobby com uma tela aberta (fica a quadra, escurecida pelo
fundo da tela) e o `RUA_CENA` do perfil põe o meio da quadra embaixo da tampinha do perfil; o `cmRender` deixa a tela
AMIGOS (a antiga COMUNIDADE) só com os amigos e o chat. **O perfil**: o `renderPerfil` monta uma vez o cartão novo
(`v77PfMonta`: o banner, a tampinha no aro com o hexágono do nível, o nome — o mesmo `lb-nomew` com o lápis —, a bandeira
do `slPais`, o ID com o copiar, o XP, as 4 abas e as 4 partes, movendo para elas as peças de antes: as 5 estatísticas do
cartão, a bio, a seção ESTATÍSTICAS da v70, as insígnias, a próxima meta, os títulos do cartão, os recordes e as partidas)
e a cada vez escreve os números (`estSoma`, `nivelInfo`, `X49.bestSeq`) e os 7 títulos (`v77PfTitulos`). As partes antigas
(`V70PF`) seguem as novas nos dois sentidos. O `pintaPalcoPerfil` desenha a tampinha reta (a da v34 tinha os raios girando
e os brilhos); tocar nela abre o editor e o VOLTAR traz de volta.

**A quadra** (`tools/v77/quadra.js`): `quadra77` (o mapa) e `quadra77Plano` (Ultra leve) nas medidas de cada tamanho:
`qdLado` (as casas e as escadas da imagem atrás dos gols, viradas uma sim, outra não), `qdMuroCima` (o muro na margem de
cima: o liso desenhado e os pedaços da imagem — o meio com os jogadores e a bandeira no meio do campo, os bancos dos
lados, o RACHA e o BRASIL nas pontas), `qdAlambrado` (a faixa de baixo da imagem e o alambrado), `qdPiso` (as placas),
`qdQuadra` (o verde, `qdAreas` — o amarelo das áreas, da meia-lua e do aro do meio, e o azul —, o grão em `overlay`, as
manchas, os pedaços gastos carimbados girados e as linhas do `grLinhas` no branco da imagem), `qdSombras` (o pé do muro, o
lado direito na sombra e a sombra das árvores desenhada pequena e aumentada, para ficar macia) e `qdTorcida` (a galera
nas escadas, com o `cnPessoa` da v74). Fora do mundo, `qdForaMonta` faz uma imagem só (as casas em colunas, a faixa de
cima e a de baixo, escurecendo longe da quadra) quando a tela passa do mapa (o `desenhaStat` desenha ela antes do mapa);
o `buildStatic` libera essa imagem a cada troca. `CAMPOS[0].fundo` vira a cor das casas e o `MAPA_DESC.estadio`, a
descrição nova. Nada aqui muda medida, parede, trave, rede, câmera ou rede de internet.

## v82 · as contas: a patente na conta, o ranking de todos, o nível da conta, entrar pelo jogo e o progresso na conta

O pedido: a etapa das contas do pacote (a lista dos itens 20 a 31 não chegou; o escopo seguido está no `LEIA-ME.md` da raiz):
a patente da ranqueada calculada e guardada pela plataforma, o ranking das patentes de todos, o jogo mostrando a conta,
entrar e criar conta pelo jogo, o progresso do jogo na conta (com outro aparelho) e as correções que a etapa pedia.

**Qual implementação valia** (o mapa das redefinições): o nível era o `nivelInfo` do jogo-base (a curva do aparelho, 80 + 20·n),
lido pelo `v77LbSync`/`v71LbSync` (o `#v77-xp` e o `#v71-nv` do lobby), pelo perfil da v77/v78 e pelo `ganha()`; a patente, o
`CONTA.rq` com o `rqPontua` (o do jogo-base, embrulhado pelo empate da v80) e o `rqElo` da v79; o fim, o `rqMostraFim`
(v70 → v80) com o `rqPintaPontos` e o `premioNos`; os eventos, o `v70EvInicio`/`v70EvFim` (`tools/v70/online.js`) e o
`racha-bridge.js`; a conta, o `tpePlataforma().conta()` (`editor_rua.js`); o RANKING, só a liga da semana (`renderRanking`); o
exportar/zerar, o `PX_CHAVES` da v70 (`tools/v70/perfil.js`); a fila de janelas do lobby, o `filaPops`; a primeira vez, o
`onbPrecisa` (chamado no fim do script, depois das camadas).

**Antes do jogo** (`tools/v82/inicio.js`, posto pelo `tools/v82/conta.py` antes do script do jogo — o jogo lê tudo ao carregar
e grava o que tem na memória ao fechar, então trocar depois não serve): `window.RACHA82` descobre a conta (`parent.RACHA_JOGO`,
`versao` ≥ 82); cada conta tem as **10 chaves de progresso** só dela (as de `app/contracts/progresso.ts`): o dono das chaves
fica em `racha-dono` ('' = sem conta, `c123` = a conta 000123); se quem joga é outro, o progresso de antes vai para a gaveta
dele (`racha-guarda:<dono>`) e o de quem chegou sai da gaveta. Logado: a versão da cópia da conta que está aqui
(`racha-nuvem:<dono>`: `versao`, `hash`, `salvoEm`, `primeira`); o que o `conta.js` deixou preparado para a próxima abertura
(`racha-82-entra:<dono>`: a cópia escolhida, a que vai para a conta) entra antes do jogo ler; e o `R.decide(cópia da conta)`:
`aplicou` (a cópia da conta é mais nova e aqui não mudou nada que não foi: entra já), `aplicar` (a cópia chegou depois: vai
preparada e o jogo abre de novo), `conflito` (os dois mudaram), `primeira` (a conta não tem cópia, nunca teve aqui e o aparelho
tem progresso sem conta) ou `nada`. O `R.hash` é o resumo (FNV-1a) do JSON de cada chave **em forma única** (os campos em
ordem alfabética) e, do X49, só do que o jogo lê ao abrir (ele grava também o `matchMode` e o `matchStarted` da partida de
agora): sem isso, abrir o jogo de novo "mudava" o progresso e mandava versões à toa.

**No jogo** (`tools/v82/conta.js`, no fim do script):

* **a conta** (`c82AplicaConta`, a cada aviso `conta` da plataforma e no `c82Vigia` de 4 em 4 s): só a do dono das chaves
  (a de outro dono é ignorada: a plataforma abre o jogo de novo para quem entrou); o `nivelInfo` embrulhado devolve o da conta
  (`nivelInfo` da plataforma: `n`, `atual`, `prox`) quando é o `CONTA.xp`; `c82PremiaNiveis` dá o `PREMIO.nivel` de cada nível
  novo da conta uma vez (`CONTA.nivelConta`; na primeira vez, sem os de antes); `c82SincRq` põe a patente da conta no
  `CONTA.rq` (menos com uma ranqueada esperando a resposta). `c82LeExtras` (no `contaCarregar`) lê o `rq.emp` e o
  `nivelConta`, que o jogo-base não lia. Com a conta, o `premioNos` e as missões não mostram o XP do aparelho (`c82SemXpLocal`).
* **a partida** (`v70EvInicio`/`v70EvFim` embrulhados): o começo e o fim dizem `ranqueada` (`RQ.on && X49.matchMode ===
  'ranked'`, ou a sala `ranked`) e o `tamanho`; o fim guarda a partida (`C82.fim.R`) e a resposta da plataforma (`c82Resultado`,
  aviso `resultado`) acerta o `CONTA.rq` e a tela do fim **dessa** partida (`c82PintaFim`: na hora, ou quando a tela abrir —
  o `rqMostraFim` embrulhado —, igual se ela for pintada de novo): o que valeu na conta no lugar da prévia (`c82AcertaFim`), a
  nota (o teto do dia, a conta que não registrou) e o `+N XP DA CONTA`. O aviso `desistencia` (a ranqueada vencida que a
  plataforma fechou ao começar esta) acerta a patente e escreve no campo (`c82Desistencia`).
* **a cópia** (`c82Envia`, `c82NuvemLogo`, `c82Vigia`): manda as chaves (`{v:1, chaves}`) com a versão de base; mudou e ficou
  parado 5 s (e 15 s desde a última), no fim da partida, ao esconder a página e ao fechar; nada vai enquanto a cópia da conta
  não é conhecida (`R82.nuvem === undefined`: o `c82BuscaNuvem` pede de novo), enquanto uma pergunta espera resposta ou depois
  de uma escolha que abre o jogo de novo (`C82.bloqueio`). A resposta `conflito` abre o QUAL PROGRESSO FICA?. A cópia que
  chega atrasada no meio da partida espera o menu (`c82Tardia`: a partida muda o progresso daqui).
* **as perguntas** (`c82Pop`, na fila própria, **antes** da fila do jogo — o `filaPops` embrulhado — e da primeira vez — o
  `onbPrecisa` embrulhado): **QUAL PROGRESSO FICA?** (`c82Conflito`: os dois resumos, `c82Resumo`; O DA CONTA prepara a cópia da
  conta e abre de novo; O DESTE APARELHO manda a daqui com a versão da conta) e **LEVAR O PROGRESSO PARA A CONTA?**
  (`c82Primeira`: LEVAR prepara o progresso sem conta para a conta — a patente vai antes pelo `patente.importar`, até 799, e
  de novo na próxima abertura se a rede falhar (`meta.importar`) — e abre de novo; COMEÇAR DO ZERO manda a cópia nova e abre a
  primeira vez do jogo).
* **entrar** (`c82Abre`): `RACHA_ABRIR('/entrar')` ou `('/entrar?aba=criar')`; fora da plataforma, a janela que explica. O
  cartão de **Ajustes › Conta** (`c82PintaConta`, pelo `ajxSync` embrulhado), o "NESTE APARELHO" do perfil (`renderPerfil`
  embrulhado: `role=button`, com a área de toque aumentada no `v82.css`) e o RANKING › PATENTES levam a ele. O zerar
  (`pxZerarPop`/`pxZerar` embrulhados) diz o que fica na conta.
* **o ranking** (`renderRanking` embrulhado): as abas PATENTES | LIGA DA SEMANA (`c82RkMonta`), a lista da plataforma
  (`patente.ranking(50)`, 30 s de cache; no celular deitado, a grade de 3 × 10 da liga: até 30 linhas, a sua na última se
  estiver abaixo) com a sua linha marcada, ou a explicação e o ENTRAR; nas PATENTES, o "termina em" da liga sai do topo.

Trocas de texto (`tools/v82/conta.py`): o script de entrada; o `PX_CHAVES` sem `racha-dono`, `racha-guarda:*`, `racha-nuvem:*`,
`racha-aparelho` e `racha-82-*` (exportar/importar/zerar não levam nem apagam as gavetas); o XP nas missões e no aviso do
prêmio só sem conta. Nada no bloco de física.

**Na plataforma**: `contracts/patentes.ts` (as patentes e as regras: `pontuaRanqueada`, `patenteImportada`, `RQ_LIMITES`),
`contracts/partida.ts` (`motivoResultadoOnline`, `acaoRanqueada`), `contracts/progresso.ts` (`validaProgresso`); `api/racha/ranqueada.ts`
(a patente em transação, um evento por partida, o teto do dia, a importação uma vez, o ajuste do RACHA CONTROL, o ranking);
`api/racha/progressoRouter.ts` (`progresso.carregar`/`salvar`, com a versão condicional); `jogoRouter.ts` (a ranqueada do
começo, o fim com a patente, a ranqueada vencida = desistência no próximo `iniciarPartida` e no fim atrasado);
`perfilRouter.ts` (`rankingPatentes`, `minhaPatente`, `importarPatente`, a patente no cartão), `authRouter.ts` (`eu.rq`),
`adminRouter.ts` (`ajustarPatente`); `db/schema.ts` (`ranqueada`, `ranqueada_eventos`, `progresso_jogo`; em `partidas`:
`ranqueada`, `online`, `tamanho`, `pontos`, `gols_contra`, `rq_delta`); `src/lib/ponteJogo.ts` (a ponte v82: `conta()` com o nível
e a patente, `progresso`, `patente`, `ouvir`, a rota `/entrar`; o fim que chega antes da resposta do começo espera o token; o
iframe só abre depois de saber a conta e a cópia, ou 3 s); `LobbyPage.tsx` (o iframe por conta), `EntrarPage.tsx` (`?aba=criar`),
`AmigosPage.tsx` (o Ranking na aba Patente), `Cartao.tsx` e `components/racha/Patente.tsx`, `AdminPage.tsx` (o ajuste).

**No servidor das salas** (`server/turma.js`, `server/clubes.js`): o selo leva `k` (1 = ranqueada) e `n` (o tamanho do time);
os visitantes têm IDs de 7 dígitos a partir de 9000000 e o clube procura a conta primeiro. Ver `server/LEIAME.md`.

## v81 · o chat: a barra embaixo, BRASIL | SALA, o perfil pelo nome, os três pontinhos e a moderação

O pedido: os itens 14 a 19 do pacote — o chat fixo embaixo (no menu, a barra compacta com a última mensagem, que abre ao
tocar e minimiza de novo, disponível enquanto a pessoa anda pelos menus; na partida, menor e meio transparente, sem cobrir
os controles, o placar nem a bola, e sem pausar a partida multiplayer), o 🇧🇷 BRASIL (o chat público, independente da sala)
e o ⚽ SALA (só quem está na sala, na espera e na partida), o visual (grafite meio transparente, bordas modernas, os
detalhes amarelos, o texto branco, os nomes em destaque, ícones pequenos, animações suaves), o "digitando" com os três
pontinhos em cima da tampinha (sincronizado, sem mostrar o texto) e a moderação (silenciar, denunciar, filtro de spam, de
ofensa, de links e de dados pessoais, o limite de envio, a opção de ocultar). Visual próprio do RACHA, não o de outro jogo.

**Qual implementação valia** (conferido no mapa das redefinições antes de mexer): a barra era a da v63 (`CB`, o nó `#cb`,
`cbContexto`/`cbLugar`/`cbPinta`/`cbAbre`/`cbFecha`/`cbDiz`, com o painel `#cp` abrindo **em cima** da tela), com o
`x49GameUI` chamando o `cbLugar` a cada quadro e o `cbBalaoDesenha` desenhando o balão "digitando" (o `rqHmDesenhaTags` da
v78 ainda o chama: a v78 tirou as etiquetas de cima da cabeça, não ele); o Chat do Brasil era o da v56/v57 (`BRASIL`,
`brasilConecta`, `brasilMsg`, a tela cheia `#tela-chat`, o `brasilRenderLista`, o silenciar salvo em `streetball-brasil`); o chat
da sala era o da v62 (`SL.chat`, `say`/`sayHistory`/`typing` no `net49Message`); a lista `V70C_LISTA` da v70 já tratava o `#cp`
como janela (o foco preso, o Escape); o V do nome era o `v79SeloMarca` da v79.

**O que a v81 faz** (`tools/v81/chat.js`, nos mesmos nós `#cb`/`#cp`, remontados por dentro):

* **o lugar da barra** (`cbContexto` e `cbLugar` novos): no menu (`lobby`), um **bloco no vão da fileira de baixo**, entre o
  DESAFIOS e o MODO e da altura deles (`c81LobbyAjusta` mede o vão nas coordenadas do palco a cada mudança de tamanho; sem
  vão ou em pé, fica onde o CSS põe); nas telas do menu com o canto livre (`C81_CHIP`: perfil, salas, amigos, clube, eventos,
  replays), um **chip** no canto de baixo à esquerda; na **sala** online (`SL.el`), embaixo, entre o CONVIDAR e o INICIAR; na
  **partida** online (`#wrap`), menor (520 × 56 px do jogo) e mais transparente, embaixo do campo entre o analógico e os
  botões, escalada pelo tamanho do jogo na tela × o Tamanho da interface (`cbEscalaJogo`). No celular (o menu encolhido,
  `v70-cabe`) a barra é maior em px do palco (`v81.css`), para ler e tocar no tamanho real. Some com a chave "Chat na tela"
  dos Ajustes (`CONTA.chatOculto`, `c81Oculta`) e no onboarding, na pausa, no fim e no editor. O Chat do Brasil liga sozinho
  onde a barra está (independe da sala).
* **a barra** (`cbPinta`): a tag BRASIL/SALA com o ícone, a mensagem mais recente entre as conversas que você tem
  (`c81Ultima`, pela hora; NOME: em amarelo, com o V), o contador de não lidas e a seta; a troca anima de leve (não com
  Reduzir animações).
* **o painel** (`cbPintaPainel`, `cbAbre`, `cbFecha`): **embaixo** da tela (a v63 abria em cima: `#cp.c81-pn` ganha do `#cp` de
  antes), as abas 🇧🇷 BRASIL e ⚽ SALA (PARTIDA na partida) com os contadores, quem está online ("128 online" / "3 na sala"),
  a lista em ordem de chegada (o nome em amarelo abre a ficha; a sua em verde; a escondida pela moderação em cinza), as
  frases rápidas na sala, o campo "Digite sua mensagem…" e ENVIAR, o olho (OCULTAR), o ⊞ (a tela cheia do Chat do Brasil, só
  no menu) e a seta (minimizar). No celular o painel **sobe com o teclado** (`c81Teclado`: `VisualViewport` → `--c81-kb`). Na
  partida o painel não pausa (o seu jogador só para de andar enquanto você escreve, como na v63) e fecha ao ENVIAR.
* **a ficha pelo nome** (`c81FichaAbre`): a tampinha, o nome com o V, o clube e a hora; **VER PERFIL** (com a plataforma e a
  conta: `RACHA_ABRIR('/jogador/<id público>')` — a rota nova no `ponteJogo.ts`), **SILENCIAR/DEIXAR FALAR** (a lista da v57,
  `BRASIL.silenciados`, agora vale para os dois chats e fica salva) e **DENUNCIAR** (`report {mid}` na sala, `brasil_report`
  no Brasil; uma vez por mensagem).
* **os três pontinhos** (`cbBalaoDesenha` novo, `c81Digitou`, `cbDigitando`): a cada letra o jogo manda `typing` (de 2 em 2 s
  enquanto há texto; ao enviar, fechar ou esvaziar, `typing:false`; o servidor repassa à sala); em cima da tampinha de quem
  digita entra o balão escuro pequeno com os três pontos brancos pulando (parados com Reduzir animações), que some ao enviar,
  ao fechar ou sozinho em 4,5 s sem sinal. Nunca mostra o texto.
* **a moderação no aparelho** (`c81Motivo`, `cbDiz`): telefone, CPF, e-mail, link e @ não saem (com o motivo no painel), nem
  palavrão (o filtro do Brasil, `BR_FILTRO`), nem a mensagem igual à anterior em 30 s, nem mais de 4 em 10 s na sala (e 1 a
  cada 3 s no Brasil). O servidor confere tudo de novo e o aviso dele (`error` com `codigo`, `brasil_error`) aparece no
  painel (ou na tela, se o painel fechou). A mensagem escondida por denúncia (`say_hide`) vira "Mensagem escondida pela
  moderação." para todos, inclusive para quem escreveu; quem foi denunciado por 2 fica 5 min sem falar naquela sala.

**No servidor** (`server/turma.js`): o `mid` de cada mensagem da sala, o `report`, o `say_hide`, a repetida, o silêncio por sala e o
filtro com telefone, CPF e e-mail; a denúncia conta por conta ou por navegador (não por IP). Ver `server/LEIAME.md`.

## v80 · a partida: Time A laranja × Time B roxo, a Listras, o placar com 3:00, a prorrogação, o GOOOL! e o treino

O pedido: os itens 2 a 11 e 13 do pacote (e a parte da partida do 29) — as cores oficiais, a tampinha inicial Listras, o placar
novo, o cronômetro de 3:00 do servidor, a prorrogação só no 0 × 0, o limite de 3 gols, os adversários sem os indicadores a
mais, os controles do treino sem as setas verdes, a animação nova do gol e o editor da tampinha como está.

**Qual implementação valia** (conferido no mapa das redefinições antes de mexer): as cores dos times eram as da v71
(`TIME71`, `TIME71_SKIN`, `skinDoTime`, `rqCor`, `SALA_COR`, em `tools/v71/times.js`) e a padrão era a `TP_PADRAO_COD` da troca
de texto da v71 (`tools/v71/times.py`, a Metade preta e branca, com `TP_TIME_COD` lisas); a tampinha de cada um passava pelo
`tpNoTime`/`tpNoTimeSk` da v71 (no treino, a do time 0); o placar era o `rqPlacar70` do jogo-base com 3 camadas (a janela
da GINGA da v70, a etiqueta do modo da v70 e o nome curto da v79) e a caixa da v71 (`placarCaixa`/`placarFundo`); o relógio
(`RQ.t`) só andava no estado `jogo` (`rqPos` do jogo-base), a ranqueada ia até 3 gols sem tempo e o tempo das salas era o
da v62 (`rqPos`/`rqGol`/`net49Begin` embrulhados: GOL DE OURO em qualquer empate, sem limite); o fim era o `rqFim` do
jogo-base (empate contava como derrota no `rqPontua`); a faixa do gol era o `drawBanner`/`bannerImagem` da v61 (o pixo neon,
embrulhado pela v70 para Reduzir animações) com o confete do `spawnConfetti`; a ponta do halo vinha do `aroJog` (v61),
chamado pelo `aroDe` (embrulhado na v70 com o contorno), e a gota de quem está fora da tela era o `desenhaForaDaTela` da v55;
os seletores do treino eram o `selCorpo`/`drawSeta`/`drawSeletores` do jogo-base (v30/v48, sem camadas por cima).

**Os times e a tampinha** (`tools/v80/times.py` + `times.js`): a troca de texto põe a padrão nova (`TP_PADRAO_V80`: a
Listras com `pp [76, 50, 84, 0]` — uma listra só, do centro para a direita — e as cores laranja/roxo; `TP_TIME_COD` com as
duas cores iguais; a borda da padrão de antes) e troca os nomes (Time A, Time B, as classes `time-a`/`time-b` dos botões —
`roxo` já era o nome do botão neutro); o `times.js` muda as cores dos objetos da v71 (`TIME71`, `TIME71_SKIN`, `SALA_COR`) no
lugar, redefine `tpNoTime`/`tpNoTimeSk` (sem time: a metade/metade; a padrão da v71 também segue o time), embrulha o
`tpSkin` (a da v71 vira a nova) e faz a troca de quem estava com ela (`racha-v80-padrao`).

**A partida** (`tools/v80/partida.js`): `RQ.v80` (a regra) é ligado no `rqComeca` (contra os bots, futebol e com curva) e no
`net49Begin` (sala com `regra:'v80'`, com o tempo da sala); o `rqPos` embrulhado (`v80Tempo`) anda o relógio na saída e na
festa do gol (online: `RQ.t` = o relógio do servidor, `v80Servidor`) e decide o fim (a prorrogação só no 0 × 0, o empate, o
gol de ouro); o `rqGol` embrulhado não deixa entrar a bola depois do tempo, marca o gol de ouro e põe a hora do gol no
`NET49.goal.el`; o `rqFim` marca `empate`/`ouro`; o `net49Message` recebe o `relogio`. O placar é um `rqPlacar70` novo
(`v80Placar`: a caixa pronta `v80PlacarCaixa`, os nomes, os gols, o relógio do `v80TempoTela`, a faixa embaixo, o modo do
lado e a janela da GINGA guardada) e o `foraObstaculos` sabe a largura dele. O empate: `rqPontua` (0), `estResultado`,
`x49Record`, `rqMostraFim` e `net49Result`. Os indicadores: o `aroDe` guarda quem está sendo desenhado e o `aroJog` tira a
ponta dos adversários (`v80Adversario`: na partida, não no replay; quem assiste não tem adversário); o `desenhaForaDaTela`
desenha só os companheiros, você e a bola. O TEMPO da sala (`SL_OPS`) mostra "3 min".

**O GOOOL!** (`tools/v80/gol.js`): o `rqEventos` e o `net49Snapshot` embrulhados guardam quem fez o gol (`v80GolGuarda`); o
`drawBanner` novo monta as peças uma vez por gol (`v80GolPecas`: as letras, a faixa de torcida e a placa, em canvas) e só cola
as imagens a cada quadro, com o papel picado (`v80GolParticulas`, com o sorteio só dele: o `Math.random` da partida fica
igual); o `spawnConfetti` embrulhado não solta a chuva de confete no gol (a da vitória continua). O texto do lance
(`bannerTxt`/`bannerSub`, o replay, a sala e a plataforma) é o mesmo de antes.

**O treino** (`tools/v80/treino.js`): o `ARC_SELS` com a medida nova (272 × 80, a 304 de distância), o `selCorpo` novo (o
cartão, as tampinhas das pontas, o ícone, o nome, o escolhido e as bolinhas; a imagem pronta continua pelo `drawSel`) e o
`drawSeletores` sem o nome por fora. O toque é o de antes (`arcHitSel`/`selPerto`, a metade do cartão, troca ao soltar).

**No servidor** (`server/turma.js`): a sala ranqueada nasce com `regra:'v80'`; o `relogios` (a cada segundo) manda o
`relogio` e encerra a partida que passou da hora (`encerra`, o `finish` de antes dividido em dois); o `snapshot` guarda a
linha do tempo; o `confere` usa o `fim80`. Ver `server/LEIAME.md`.

## v79 · as patentes, só ranqueada (online + bots, no Estádio) e o selo V

O pedido: as patentes da imagem (Bronze a Lendário); a ranqueada jogada também online; sem a casual, só a ranqueada, só no
campo (o Estádio, escolhido na conversa); procurar gente online e, sem ninguém, jogar contra os bots; o V dos
influenciadores na frente do nome; o perfil como está. É a primeira etapa do pacote de 31 itens (v79 → v83).

**Qual implementação valia**: os elos eram os da v35 (`RQ_ELOS`, `rqElo`, `rqEloDaOrdem`, `rqInsignia` e o `rqPontua` no
jogo-base; Mestre e Lenda de uma divisão só); a dificuldade da liga pela patente era o `ECO_LIGA_DIF` da v70
(`tools/v70/economia.js`, com os textos "LIGA CONTRA BOTS"/"LIGA: BOTS FÁCIL" do `rqNivelTexto`, `rqNivelCurto` e
`ligaNota`); o JOGAR do lobby chamava o `jogoRapido` (a casual) e o MODO o `abreJogar('casual')` (a folha com as abas
RANQUEADA/CASUAL, embrulhada na v70, v70.2, v71 e v77); o fim do tutorial começava uma casual (o capture do `TRF.prox`);
o online é o das salas (`net49*`, `salas_rua.js`, `tools/v70/online.js`) com o servidor da turma. O mapa das redefinições
confirmava essas versões.

**As patentes** (`tools/v79/patentes.js`): a tabela `PATENTES` (os mínimos da imagem e os cortes das 3 divisões) substitui
o `rqElo` e o `rqEloDaOrdem` (o resto do jogo usa os mesmos campos: `nome`, `elo`, `div`, `ordem`, `min`, `prox`, `pct`);
o `rqInsignia` desenha o escudo novo (SVG); o `rqPontua` é o mesmo (a proteção usa o mínimo da patente). A tela das
patentes (`v79PatentesAbre`) é uma folha na camada das janelas.

**Só ranqueada** (`tools/v79/ranqueada.js`): o `abreJogar` sempre na ranqueada e o `renderRanqueada` embrulhado esconde as
abas, a casual, os mapas que não são o Estádio e a escolha dos bots (`v79Folha`); o tamanho do time vale na hora. O
`jogoRapido`, o `jogarFolha` e o `jogarRanqueada` chamam o `v79Jogar`, que abre a BUSCA (`v79BuscaAbre`): com o servidor
(`v79OnlinePode`), manda `fila` e espera `start` (com `room.ranked`), `fila_nada` (20 s) ou o tempo acabar; sem servidor,
1,5 s e os bots (`x49Start(n, 4)` com `X49.mode = 'ranked'`). O `net49Begin` embrulhado marca a partida online como
ranqueada (`X49.matchMode`), o `net49Result` aplica os pontos (`rqPontua`, com `nivel:'online'`, só com `valida`), o
`net49Send` cobra os 25 de quem manda `leave` no meio, o `salaJogoRender` troca o SAIR por DESISTIR e o `slEntrou` não abre a
tela da sala; o `arbEu`/`arbEuPrincipal` embrulhados dizem que ninguém é árbitro na ranqueada e o `x49GameUI` escreve a barrinha
(RANQUEADA ONLINE, o MENU). Os textos: `x49ModeName` (RANQUEADA / RANQUEADA ONLINE; do lado do placar, pelo `rqPlacar70`, só RANQUEADA), `rqNivelTexto`/`rqNivelCurto`/`rqNivelDesc` sem o
nível, `rqComeca` (a faixa), `rqIntro`, `tuBotsNaApresentacao` e `b78NaApresentacao` (a apresentação), `rqInfoPilula`,
`pausaRotulo`, `rqMostraFim` e `x49GameUI`. As missões (`ecoMissoes`, `ecoPartidaFim`) e o Estádio padrão (`V702.mapas`
com o 4 primeiro; o treino e as salas só de quem nunca escolheu).

**O selo V** (`tools/v79/selo.js`): no DOM, o atributo `data-v79-selo` e um `::before` com o desenho (um data: URI por selo,
gerado no carregamento; o `v79.css` dá o tamanho); na partida, o `drawPlayer` (o seu) e o `rqDesenhaJog` (os da sala, do
`room.members`) desenham o emblema antes do nome. O seu vem do `pxConta().selos` (a plataforma) ou do `hello` do servidor;
o dos outros, dos membros da sala, da lista e das mensagens do Brasil (`slCartao`, `sxLinha`, `cbPintaPainel`,
`brasilRenderLista` embrulhados). Na plataforma, o `SeloV` (o mesmo desenho, em React) na frente do nome (o `SelosLinha` passou
para antes do nome no `Layout`, no `Cartao` e na `AmigosPage`) e no RACHA CONTROL.

## v78 · os bots novos, nada em cima da cabeça e o perfil mais fácil de entender

O pedido: tirar os nomes das jogadas (fintas, dribles) de cima da cabeça dos jogadores; trocar os bots por outros, mais
divertidos; o perfil mais fácil de entender, com a mesma ideia; e a tampinha maior só no lobby (e no perfil), não na partida.

**Qual implementação valia**: os bots eram a cabeça de antes (`rqBots` com o `RQ_HM` — `rqHmCria`, `rqHmToque`,
`rqHmChute`, `rqEliteToque`, os estilos da v47 — e os níveis de `RQ_NIVEIS`); os nomes em cima da cabeça saíam do `rqHmDesenhaTags`
(a fila `RQ_HM.tags`, que também desenha o balão "digitando" da sala online). O perfil era o da v77 (`v77PfMonta`, a VISÃO
GERAL com 3 cartões e 5 números) e a tampinha do perfil, o `pintaPalcoPerfil` da v77; a do lobby, o `pintaBrilho` da v77
(`EMB.R × V77L.esc`) com o centro no `RUA_LOBBY.layout`. O mapa das redefinições confirmava essas versões.

**Os bots** (`tools/v78/bots.js`): o `rqBots` passa a chamar a cabeça nova (`b78Tick`) no FUTEBOL e no COM CURVA (nos modos
guardados da v70.2 continua a antiga); o `rqHmCria` embrulhado cria o estado de cada bot (`b78Cria`: o jeito sorteado sem
repetir no time, o nível — os companheiros de quem joga, sempre o Difícil —, o tempo de reação e, no 3v3 e no 4v4, o
goleiro-linha, o último da formação); o `rqHmSaida`, o `rqGol` (o termômetro do placar) e o `rqVsAbre` (o jeito na apresentação)
também. Cada 4 ticks o `b78Organiza` acha, pela bola prevista (`rqTrajeto`), quem chega antes nela em cada time (você, se
chega junto ou está com ela — os bots não roubam), a fase (ataque, defesa, disputa) e os papéis (apoio, sobra, marca, corta,
cobre, goleiro). Cada bot pensa com o atraso dele (`b78Bot`: o papel e a bola que ele viu) e, com a bola, escolhe entre
chutar, tocar, levar, aliviar e tabelar na parede (`b78Opcoes`, com notas que dependem do jeito e do nível) e bate quando
alinha (`b78Bate`, que confere com `b78Seguro` que a bola não vai para o próprio gol). O corpo é o de sempre: o bot só
escreve `q.mx`, `q.my` e `q.chutar`, que o `rqPre` transforma em movimento e chute igual ao seu. O `rqHmDesenhaTags`
embrulhado esvazia a fila dos nomes de jogada antes de desenhar (o balão "digitando" continua). `window.RachaBots78`
mostra o estado (os jeitos, os papéis, as contas de cada ação) para os testes. Os pesos de ajuste ficam em `B78.cfg` e em
`B78_NIVEL`; `B78.on = false` volta à cabeça antiga (só os testes usam, para comparar).

**O perfil e a tampinha** (`tools/v78/perfil.js` + `public/game/v78.css`): o `renderPerfil` embrulhado arruma uma vez a
VISÃO GERAL (`v78PfMonta`: os 4 números grandes, a frase e a bio; o tempo, a sequência, o aproveitamento e os 5 números
pequenos ficam escondidos) e a cada vez escreve a frase (`v78PfFrase`) e o nível por extenso (`v78PfNivel`). O
`pintaPalcoPerfil` desenha a tampinha com o raio até 220 (era 150); no lobby, `V77L.esc` passa de 0,82 para 1,15 e o
`RUA_LOBBY.layout` embrulhado põe o centro um pouco mais para baixo (fora do celular em pé). Na partida, nada: o raio do
jogador é o da física.
