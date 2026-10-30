# RACHA v92 · OFICINA DE CRIAÇÃO 2.0 — relatório de entrega

Este é o relatório pedido no fim do prompt (o código, os arquivos, os componentes, os dados, as salas, a interface, os
modelos, os testes, as limitações e como rodar). O manual de uso, com todos os detalhes de cada tela e ferramenta, é o
**`LEIA-ME-OFICINA.md`**.

## 0. A atualização de 28/10/2026 — a v93 e a v94 dentro, os ajustes finos, as linhas da bola e o CRIAR SALA

Os pedidos: *"melhore configuração como extrapolação etc, tudo que tinha no teste, certa de aonde a bola vai, várias
configurações, mesmo tamanho da bola etc, e tira exportar mapa etc, apenas posta mapas, cada jogador pode publicar 3 mapas e
aparece lá likes, favoritos etc, criar sala etc"* (com as respostas: a física **só na Oficina, nas configurações de criar
sala**; da Oficina **só editar, salvar e publicar**; o limite **só dos públicos**; **as duas** linhas da bola) e *"adicione o
que tem nesse zip* (`racha-online-v94-testes-etapas1a7.zip`) *no outro, no RACHA com Oficina — as bolas, a contagem
regressiva, o perfil de quem faz gol… tudo"*.

| Pedido | O que foi feito | Onde |
|---|---|---|
| Tudo o que tem no ZIP da v94 | a **v93** inteira (HUD, bolas lisas, contagem, replay e painel online, cartão de quem marcou, craque, salas e admin, grupo, falas, sons, as revisões) e a **v94** (o motor próprio, em testes e desligado como no ZIP das etapas 1 a 7). Conferido: o build **sem** as duas etapas novas sai **igual, byte a byte**, ao `racha.html` da v94; a física `sha256 ad9f1d2216409b0e` | `tools/v93/*`, `tools/v94/*`, `server/turma.js`, `server/grupo93.js`, `server/partida/motor.js`, `sala94.js`, `docs/v94/` |
| As funções da v93 também na Oficina | no TESTAR e nas salas com mapa: a **contagem 3, 2, 1, JÁ!** (no TESTAR com a chave na pausa; online o servidor segura e solta junto), o **cartão de quem fez o gol** (avatar/tampinha, nome, banner e a assistência — o evento do gol traz quem fez), os **balões de fala** (tecla T), o **craque da partida** no fim e a bola **EQUIPADA** na Aparência | `tools/oficina/jogo.js`, `sala.js`, `desenho.js`, `paineis.js`, `server/partida/sala_mapa.js`, `mapa.js` |
| "Melhore configuração como extrapolação, tudo que tinha no teste" | os **AJUSTES FINOS** na versão oficial (Ajustes › Visual › ABRIR OS AJUSTES FINOS; as 7 abas continuam): FLUIDEZ, A BOLA, ONLINE (a **extrapolação** 0–200 ms, a bola na tela, o deslize das correções, a previsão), CONTROLES (zona morta, folga, área de toque) e CÂMERA — guardados no aparelho, com VOLTAR TUDO PARA O PADRÃO | `tools/ajustes/ajustes.js`, `app/public/game/ajustes.css`, `tools/ajustes/ajustes.py` |
| "Certa de aonde a bola vai" (as duas) | a **LINHA DO CHUTE** (CHUTE ou PASSE E CHUTE; dourada no gol, vermelha no gol contra; as batidas) e o **CAMINHO DA BOLA** andando, pela conta da física de verdade: o bloco da física no treino e contra os bots, o núcleo das salas no online, o motor do mapa na Oficina — o teste confere passo a passo (0,0000 px de diferença) | `tools/ajustes/linhas.js`, `tools/oficina/jogo.js` |
| "Várias configurações, mesmo tamanho da bola" — só no CRIAR SALA da Oficina | a **FÍSICA DA SALA** na janela CRIAR SALA (predefinições ou os números em % do RACHA: a bola — tamanho, velocidade, deslize, peso, quique —, o chute e as tampinhas; a amostra e o alcance do chute); o admin muda nos AJUSTES entre as partidas; o servidor limpa e corta nos limites, muda o hash e manda o mapa da sala de novo | `tools/oficina/sala.js`, `server/turma.js`, `server/partida/mapa.js` |
| "Tira exportar mapa, apenas posta mapas" | saíram o exportar (arquivo e texto) e o importar (arquivo, texto e a aba Importar): fica editar, salvar e publicar | `tools/oficina/hub.js`, `editor.js` |
| "Cada jogador pode publicar 3 mapas" (só os públicos) | no máximo **3 públicos** por criador (os não listados e os privados não contam; a equipe sem limite), conferido no servidor no publicar, na versão nova e no CONFIGURAR; **PÚBLICOS n DE 3** em Meus mapas; a janela de publicar sem o Público quando enche | `server/mapas.js`, `tools/oficina/hub.js` |
| "Aparece lá likes, favoritos" | o **coração** e a **estrela** dos cartões curtem e favoritam na hora (tocar de novo tira); os números também nos cartões de Meus mapas | `tools/oficina/hub.js`, `oficina.css` |
| "Criar sala" | o **CRIAR SALA** no lugar do JOGAR (página do mapa, cartão, menu dos seus mapas, modelos, ⋮ do editor, "Mapa publicado!") | `tools/oficina/sala.js`, `hub.js`, `editor.js` |

**Um defeito evitado na junção:** o painel de jogadores da v93 roda a cada 2 s no relógio das salas e lia os números da
partida sem conferir se existiam; numa sala com mapa ele derrubaria o processo do servidor. A partida no mapa ganhou os
números dela (`est`), o painel aceita a partida sem eles, e o ENCERRAR do admin numa sala com mapa limpa a contagem pendente.

**O que não mudou:** a física oficial (o build confere a cada vez), a ranqueada, as salas comuns (o motor de sempre), as
contas e a progressão. O ZIP continua o da **versão oficial**: sem o `experimental`, sem os dois `.bat` de testes e sem os
LEIA-ME de testes (o motor próprio da v94 vem desligado; `motor: 'v94'` no `config.js` e `RACHA_MOTOR_JOGO=v94` no servidor
ligam para todo mundo).

**Os testes desta atualização:** a bateria inteira (`tests/roda_tudo.sh`; os logs em `tests/saida/logs_v94oficina/`, o resumo em `RESUMO.txt`): **86 conjuntos, 3.514 de 3.542 verificações ok**. As 28 que falham são **as mesmas, uma por uma, da v94 pura** (o build sem os ajustes finos e sem a Oficina, rodado à parte com os mesmos testes): `v82` (20 — esperam a tela inicial, o perfil e a conta de antes da v90), `v92` (6) e `v92_celular` (2) — as memórias A/B e a parte MOTOR do painel de testes, que a versão oficial não mostra. Todos os testes novos e os da Oficina passam.

## 0.1. A atualização de 27/10/2026 — só a v92 oficial, a bola branca e o editor mais "de verdade"

O pedido: *"Deixe apenas versão V 92, remova aquilo das configurações, deixe a bola toda branca na oficina de criação igual
a do hax ball, bote mais funções e deixe mais tangível."*

| Pedido | O que foi feito | Onde |
|---|---|---|
| Só a v92, sem "aquilo das configurações" | o `config.js` ficou o da **versão oficial** (sem `experimental: true`): os AJUSTES não têm mais a aba **TESTES v92** (PADRÃO v92 / RESTAURAR v91, memórias A e B, DB por estados, medidor) e a pausa não tem **A ⇄ B** nem **DB**; o ZIP sai sem o `INICIAR-TESTES-NO-WINDOWS.bat` e sem o `LEIA-ME-v92-TESTES.md` (como o `pacote.py --producao`) | `app/public/game/config.js`, `LEIA-ME-MELHORIAS.md` |
| A bola toda branca na Oficina | a bola das partidas da Oficina (TESTAR e salas com mapa) é **branca, lisa, de contorno preto** e sem sombra, do tamanho exato da colisão; a Aparência ganhou a seção **Bola** (amostra; Branca, Colorida ou a do RACHA) — o padrão de todo mapa, inclusive os de antes. O jogo de sempre continua com a bola dele | `tools/oficina/desenho.js`, `jogo.js`, `paineis.js`, `server/partida/mapa.js` |
| Mais funções | **lançar a bola** no editor (a prévia do caminho com as batidas e o gol antes de soltar, e a bola de verdade no motor do mapa), **copiar para o outro lado** (espelhado, com os times trocados), **repetir** (em fila ou em círculo), **as medidas** perto do dedo, **as guias** ao mover (o meio, a mesma linha, o lugar espelhado) | `tools/oficina/ferramentas.js` (novo), `editor.js` |
| Mais tangível | a **vibração** (criar, apagar, pegar uma alça, encaixar, chutar, a batida, o gol — com a chave do jogo), a **sombra** das peças sólidas (com a chave), a peça pequena que **move** em vez de esticar, as ferramentas em **duas colunas** no celular deitado | `ferramentas.js`, `desenho.js`, `editor.js`, `oficina.css` |

**Um defeito achado no caminho (e corrigido):** o evento do gol do motor dos mapas saía com o tipo trocado pelo tempo do jogo
(`Object.assign({ t: 'gol' }, info)` com o `t` do tempo por cima) — o placar estava certo, mas o letreiro **GOL DO TIME…**,
o som e o confete do gol não apareciam no TESTAR nem nas salas com mapa (o servidor nem mandava o evento). Agora o tempo vai
em `seg`, e os testes conferem o letreiro no TESTAR e nos três navegadores do online.

**O que não mudou:** a física oficial (`fisica identica · sha256 ad9f1d2216409b0e`), a ranqueada, as salas comuns, as contas e
a progressão. O código do modo de testes continua no jogo, desligado — só um `experimental: true` no `config.js` o traria
de volta (os testes dele continuam passando com o config deles). O presente de teste (`presente: true`) continua no
`config.js`, como antes: é a linha a apagar no lançamento.

**Os testes desta atualização (no build final; as saídas inteiras em `tests/saida/logs_v92oficina2/`):** 32 conjuntos —
os 5 da Oficina (`oficina_mapa` **100/100**, `oficina_servidor` **118/118**, `oficina_cliente` **98/98**, `oficina_online`
**59/59** e o novo `oficina_ferramentas` **44/44**) e os do jogo que tocam no lobby, no celular, na v92 e no online:
`interface` 133/133 · `interface4` 105/105 · `interface5` 68/68 · `celular` 195/195 · **`v71` 78/78** (antes 76/78: as duas
falhas eram justamente os botões da versão de testes na pausa) · `v77` 34/34 · `v78` 38/38 · `v79` 68/68 · `v80` 80/80 ·
`polimento` 64/64 · `hud_salvamento` 3/3 · `v872_presente` 12/12 · `v92` 35/35 · `v92_celular` 35/35 · **`v92_db_celular`
19/19** (antes 18/19, pelo mesmo motivo) · `online` 31/31 · `v85_online` 14/14 · `v92_online` 16/16 · `matriz` 12/12 ·
`regras` 56/56 · `camera` 47/47 · `servidor_test` 191 ok · `v92_nucleo_test` 22/22 · `v83_sala_test` 60 ok ·
`plataforma_salas_test` 15 ok · `v88_salas_plataforma_test` 23 ok · `v92_db_test` 33/33. (O `interface` falhou uma vez na
leva — um texto do lobby em pé medido a 6,5 px enquanto a máquina rodava outro navegador ao mesmo tempo — e passou 133/133
rodando de novo, com a mesma medida de sempre, 12,4 px; o lobby não foi mexido nesta rodada.) O build confere a física
oficial a cada vez: `fisica identica · sha256 ad9f1d2216409b0e`.

## 1. O que foi feito, em uma frase

A Oficina foi construída **por cima do RACHA v92 recebido**, sem recriar nada: o build de sempre (`tools/aplicar_rua.py`)
ganhou uma etapa no fim (`oficina/oficina`) que **só acrescenta** o link do `oficina.css` e um bloco de código ao
`racha.html` (o diff do `racha.html` contra o recebido tem **0 linhas apagadas**), a física oficial continua conferida pelo
build (`fisica identica · sha256 ad9f1d2216409b0e`), e o servidor das salas ganhou o catálogo dos mapas e as salas com mapa
(até 4 times) sem mudar as salas de sempre, a ranqueada, as contas nem a progressão.

Conferido item por item contra o prompt (as 24 seções). O que entrou na rodada final: as **regras do goleiro** (Partida ›
Goleiro: a última vaga é o goleiro, a área livre / só o goleiro do time / só o goleiro para todos, o goleiro que não sai da
área — no motor, valendo no servidor e no TESTAR), as **9 camadas com os nomes do prompt** (Fundo, Texturas, Marcações,
Geometria, Colisões, Objetos, Elementos interativos, Decoração, Interface do mapa) e as correções de uma **revisão de
segurança independente** do servidor (seção 9).

## 2. Onde está no jogo

Tela inicial → botão **OFICINA · CRIE SEUS MAPAS** (entre a coluna da esquerda e a tampinha, acima do PASSE) → a central:
CRIAR NOVO MAPA, Meus mapas, Em desenvolvimento, Comunidade (com as categorias e as salas abertas com mapa), Populares,
Recentes, Favoritos, Oficiais, Compartilhados, a busca (nome, criador, etiqueta ou código de 7 letras), o botão
SALA (entrar pelo código) e, só para a equipe, Moderação. Do cartão de um mapa: editar, testar, criar sala, publicar,
duplicar, renomear, apagar. (28/10: o Importar e o exportar saíram.)

## 3. Arquivos

**Novos**

| Arquivo | O que é |
|---|---|
| `server/partida/mapa.js` | o motor dos mapas, **o mesmo arquivo no servidor e no jogo** (o build cola ele no `racha.html` como `window.RachaMapa`): o formato e a validação (`limpa`), a compilação (`compila`), a partida (`novaPartida`: passo de 1/60 s, até 4 times, gols, zonas, portais, portões, botões, interruptores, cronômetros, objetos móveis, barreiras temporárias), a lógica QUANDO → ENTÃO, os bots para qualquer mapa, as predefinições de física e o quadro compacto da rede |
| `server/partida/sala_mapa.js` | a partida num mapa dentro do servidor das salas (a mesma fila de comandos e a mesma máquina dos botões PASSE/CHUTE/CURVA das salas hospedadas; quem reconecta continua na mesma tampinha) |
| `server/mapas.js` | o catálogo: publicar, versões, lista/busca/categorias, curtir, favoritar, denunciar, colaboradores, permitir copiar, moderação — gravado em disco |
| `tools/oficina/base.js` | o espaço `OFI`, os ícones, as janelas, a **gaveta** do aparelho (IndexedDB), a conversa com o servidor (`mapa_req`), os ganchos no jogo e o botão do lobby |
| `tools/oficina/modelos.js` | os tamanhos, os 9 formatos, o mapa do zero e os **15 modelos** |
| `tools/oficina/desenho.js` | o desenho do mapa (o mesmo no editor, no TESTAR, na partida online e na miniatura) |
| `tools/oficina/editor.js` | o editor: o canvas, o toque (um dedo, segurar, dois dedos), as ferramentas, as alças, desfazer/refazer, seleção, agrupar, alinhar, distribuir, espelhar, ordem, camadas, copiar/colar, o salvamento automático, as versões e a recuperação |
| `tools/oficina/paineis.js` | o painel da direita: as propriedades de cada tipo e as abas Campo, Aparência, Física, Partida, Lógica, Camadas, Spawns e Validação; a biblioteca |
| `tools/oficina/hub.js` | a central: as abas, os cartões, a busca, a comunidade, a página do mapa (criar sala, testar, curtir, favoritar, código, editar, duplicar, versões, configurar, colaboradores, denunciar, moderar, apagar), o coração e a estrela nos cartões, os 3 públicos e publicar (28/10: o importar e o exportar saíram) |
| `tools/oficina/jogo.js` | a partida da Oficina no canvas do jogo: o TESTAR (com bots) e a partida online (a previsão com o mesmo motor, a correção suave, espectador, pausa, resultado), com os controles do jogo |
| `tools/oficina/sala.js` | a sala com mapa: a tela da sala (times, espectadores, chat, bots, COMEÇAR, ajustes, trocar o mapa, convidar), as ações do admin, a queda e a volta automática, a etiqueta OFICINA na lista de salas do jogo |
| `tools/oficina/oficina.py` | a etapa do build |
| `app/public/game/oficina.css` | o visual da Oficina (no estilo da v91: as bordas pretas grossas, o amarelo, o roxo) |
| `tests/oficina_mapa_test.mjs`, `tests/oficina_servidor_test.js`, `tests/oficina_cliente_test.py`, `tests/oficina_online_test.py` | os testes novos (seção 9) |
| `LEIA-ME-OFICINA.md`, `RELATORIO-OFICINA-v92.md` | o manual e este relatório |

**Mudados**

| Arquivo | O que mudou |
|---|---|
| `app/public/game/racha.html` | gerado pelo build: + o link do `oficina.css` e o bloco da Oficina (5.212 linhas acrescentadas, 0 apagadas) |
| `server/turma.js` | as salas com mapa (até 4 times e 20 pessoas, o mapa da sala para todos com o hash, a partida no mapa, o resultado `custom:true` sem selo, XP, troféu nem ranqueada), o `mapa_req` → `mapa_res`, o `mapa_encerrar`, as mensagens grandes só para o mapa, a denúncia de mapa também para o RACHA CONTROL (com a plataforma montada) |
| `server/servidor.js`, `server/turma.d.ts`, `app/api/lib/salas.ts` | as opções `--mapas`/`RACHA_MAPAS` (padrão: a pasta `mapas` ao lado do arquivo da turma) e `--moderadores`/`RACHA_MODERADORES` |
| `deploy/prepara-vps.sh`, `deploy/LEIA-ME-DEPLOY.md` | o VPS cria `/var/lib/racha/mapas` (a única pasta em que o serviço pode gravar) e grava `RACHA_MAPAS` no `racha.env` |
| `tools/aplicar_rua.py` | a etapa `oficina/oficina` no fim da lista |
| `tests/roda_tudo.sh` | os 4 testes da Oficina no `npm test` |
| `tests/polimento_test.py` | a conferência das PATENTES espera a animação de abrir a janela terminar (ela olhava o centro da janela ainda recortado pela animação; falhava às vezes com ou sem a Oficina — medido) |
| `CHANGELOG.md`, `README.md` | a entrada da v92 · Oficina e o aviso no topo |

## 4. Os componentes novos (como as peças conversam)

```text
 jogo (racha.html, uma função só)                                    servidor das salas (server/)
 ┌──────────────────────────────────────────────┐                    ┌───────────────────────────────────────┐
 │ RachaMapa (server/partida/mapa.js, colado)   │  mesmo arquivo     │ partida/mapa.js                        │
 │ OFI: base · modelos · desenho · editor ·     │ ◄───────────────►  │ partida/sala_mapa.js  (a partida)      │
 │      paineis · hub · jogo · sala             │  NET49 (o mesmo    │ mapas.js              (o catálogo)     │
 │ ganchos: frame · net49Message · cbContexto · │  WebSocket do jogo)│ turma.js              (as salas)       │
 │          lbLayout · controleVisivel ·        │                    │   └ pasta RACHA_MAPAS: indice.json,    │
 │          arcHitSel · pausaAbre · sbLinha ·   │                    │     indice.json.bak, m/<id>.json,      │
 │          slRapido                            │                    │     t/<id>.txt                         │
 │ GAVETA (IndexedDB 'racha-oficina')           │                    └───────────────────────────────────────┘
 └──────────────────────────────────────────────┘
```

- **Os ganchos** são poucos e conferidos: o laço do quadro (`frame`: o jogo dorme enquanto a Oficina está aberta e a
  partida da Oficina desenha no lugar dele), as mensagens da rede (`net49Message`: o que é da sala com mapa fica com a
  Oficina, o resto vai para o jogo sem mudança), a barra do chat (`cbContexto`), o lobby (`lbLayout`: o botão), os
  controles (`controleVisivel`, `arcHitSel`, `pausaAbre`: só quando a partida da Oficina está rodando) e a lista de salas
  (`sbLinha`, `slRapido`: a etiqueta OFICINA e o JOGAR AGORA só nas salas comuns). Cada gancho chama a função original
  quando não é com a Oficina, e eles só são ligados depois que a Oficina carregou inteira (`ofiLigaGanchos`): se algo da
  Oficina falhar ao carregar, o jogo segue como antes.
- **O motor é um só**: a validação, a compilação e a partida rodam com o mesmo código no aparelho (TESTAR e a previsão do
  online) e no servidor (a autoridade). Com o perfil Clássico num campo igual ao das salas, a conta é a do núcleo das
  salas, tique a tique (o `oficina_mapa_test` confere).

## 5. A estrutura dos dados

- **O mapa** (`.racha-mapa.json`, tudo em u — 1 u = 19 px): `formato, v, id, codigo, nome, descricao, categoria, tags,
  autor, versao, criado, editado, campo{forma, w, h, canto, pontos, borda, laterais, margem…}, aparencia{piso, cores,
  textura, linhas, fundo, luz}, fisica{preset, perfil, extra, colideParedes}, partida{modo, jogo, equipes, porTime, times,
  vitoria, meta, tempo, desempate, prorrogacao, reinicio, saida, golContra, colisões, bots, goleiro, espectadores…},
  camadas[9], objetos[{id, tipo, x, y, rot, camada, cor, opac, visivel, ativo, bloqueado, oculto, grupo, nome, mov?, …}],
  logica[{id, on, quando{tipo, alvo, equipe, seg, valor}, entao[{acao, alvo, …}], atraso, repete, vezes, espera}]`. Os 16
  tipos de objeto e os limites (400 objetos, 80 regras × 8 ações, 12 gols, 24 portais, 80 zonas, 40 móveis, 40 spawns,
  1–4 times de 1–5, 180 KB, 2.400 peças de colisão) estão no `LEIA-ME-OFICINA.md`. Tudo o que chega (publicar,
  abrir sala, a física da sala) passa pelo `RachaMapa.limpa` — o mesmo no aparelho e no servidor.
- **No aparelho** (IndexedDB `racha-oficina`; sem IndexedDB, o armazenamento local com aviso): `mapas` (o rascunho:
  id local, nome, mapa, datas, miniatura, `remoto{id, codigo, versao}` quando publicado), `versoes` (as últimas 30 de cada
  mapa) e `recupera` (o estado do editor a cada mudança, para a recuperação).
- **No servidor** (a pasta `RACHA_MAPAS`): `indice.json` (por mapa: nome, criador, código, visibilidade, categoria, modo,
  jogos, curtidas, favoritos, denúncias por pessoa, colaboradores e permissões, permitir copiar, estado da moderação;
  gravado de forma atômica 1 s depois de cada mudança e ao desligar; cópia `indice.json.bak`), `m/<id>.json` (o mapa e as
  últimas 15 versões) e `t/<id>.txt` (a miniatura, uma `data:image` pequena e conferida). Se o índice estragar, ele é
  refeito dos arquivos dos mapas. **As curtidas, os favoritos e as denúncias ficam gravados** e sobrevivem ao reinício (o
  `oficina_online_test` reinicia o servidor e confere).

## 6. A integração com as salas

- **A mesma conexão do jogo** (NET49) e o mesmo servidor das salas — nada de servidor novo. Pedidos do catálogo:
  `mapa_req {rid, op, args}` → `mapa_res {rid, op, ok, …}` (op = eu, lista, abrir, versoes, publicar, curtir, favorito,
  denunciar, apagar, config, colab, moderar, fila), com limites por pessoa (o "balde" de sempre).
- **A sala com mapa**: `create`/`config` com `mapa:{id|codigo}` (um publicado) ou `mapaDados` (um rascunho: a sala fica
  fechada — é o "teste multiplayer privado"). O servidor valida, compila, manda `mapa_sala {code, hash, info, mapa}` para
  quem entra e depois o `room` de sempre com `E` (o número de times, até 4) e `mapa`. Até 20 pessoas: as vagas dos times,
  os bots nas vagas livres (ou vazias) e o resto assiste.
- **A partida**: no servidor (a autoridade, 60 passos/s, a mesma fila de comandos `input {seq, x, y, button, k, kc, pc}` e
  a mesma máquina dos botões das salas hospedadas), os quadros a 30/s; o aparelho prevê a própria tampinha e a bola com o
  mesmo motor e corrige suave. Pausa e ENCERRAR do admin, a queda (um bot segura a vaga) e a volta automática no mesmo
  lugar (90 s), o espectador, o resultado (`result` com `custom:true`: placar de cada time, gols e assistências; **não
  vale** para a ranqueada, o XP, os troféus nem o ranking).
- **Nas listas**: a sala aparece no GALERA com a etiqueta **OFICINA** e o nome do mapa, e na Comunidade da Oficina; o
  JOGAR AGORA do jogo continua só nas salas comuns; criar uma sala comum abre a tela de sempre.
- **A ranqueada e as salas comuns não passam por este código**: a física delas é a oficial (o servidor nem chama o motor
  dos mapas nelas).

## 7. A interface no celular e no computador

- Na horizontal, como o jogo (em pé aparece o aviso de girar de sempre). O botão OFICINA conferido em 11 tamanhos (de
  568×320 a 1920×1080): inteiro na tela, com o toque mínimo de 44 px, sem encostar em nenhum botão do lobby, na tampinha nem
  no letreiro "segure para trocar" (nas telas menores ele fica só "OFICINA" e sobe para cima do letreiro); a central sem
  nada passando da borda.
- O editor: a barra de cima (voltar, nome, desfazer, refazer, salvar, TESTAR, ⋮), as ferramentas à esquerda, o canvas no
  meio, o painel à direita (recolhe; em telas até 860 px ele fica por cima do canvas e o "ver tudo" enquadra só a parte
  visível), a barra de baixo com as ações da seleção. Tudo pelo toque (um dedo, segurar, dois dedos, as alças), e também
  mouse e teclado.
- O TESTAR e a partida online usam o canvas e os controles do próprio jogo (o analógico, PASSE, CHUTE, CURVA no modo com
  curva, o teclado e o controle).

## 8. Os 15 modelos

Campo Clássico RACHA · Mini Arena X1 · Futsal Brasileiro · Arena Circular · Campo Gigante · Arena de Quatro Gols · Campo
com Obstáculos · Campo de Treinamento · Labirinto de Bola · Arena Neon · Futebol de Rua · Quadra de Favela · Arena Técnica ·
Campo Assimétrico · Mapa Vazio. Funcionam sem internet (aba Oficiais), viram rascunho seu ao abrir, e o teste confere que
cada um é válido, abre no editor, joga no TESTAR e anda com os bots.

## 9. Os testes que rodaram

### 9.1 Os testes novos da Oficina (no build final)

| Teste | Resultado | O que confere |
|---|---|---|
| `node tests/oficina_mapa_test.mjs` | **91/91** | o motor: a validação do que vem de fora, a **mesma conta do núcleo das salas** no perfil Clássico (tique a tique), o determinismo, 4 times, gols e gols contra, zonas, portais, botões, portões, barreiras, cronômetros, a lógica com os limites, as **regras do goleiro**, o teto do MOVER/VOLTAR e o custo da grade (o mapa feito para pesar é recusado em ~30 ms) |
| `node tests/oficina_servidor_test.js` | **118/118** | o catálogo (publicar, versões, busca, categorias, curtir, favoritar), as denúncias (só as de confiança tiram o mapa), a moderação, os colaboradores e as permissões, permitir copiar, a miniatura, o disco (reinício, índice estragado, a queda antes de gravar o índice), a sala com mapa (até 4 times, lugares, a partida no servidor, o gol, o fim sem selo, a queda e a volta, a reconexão sem segunda tampinha), a sala comum e a ranqueada iguais, e a rede de verdade (WebSocket) |
| `python3 tests/oficina_cliente_test.py` | **97/97** | no Chromium com toque: o botão e a central em 6 tamanhos de tela, os 6 tamanhos × 9 formatos, os 15 modelos (cada um no editor e no TESTAR), **todas as ferramentas pelo toque** (desenhar, mover, girar e redimensionar pelas alças, caixa de seleção, agrupar, alinhar, distribuir, espelhar, duplicar, excluir, copiar/colar, ordem, bloquear, ocultar, camadas, grade e encaixe, câmera com a mão, a roda e a pinça, seleção múltipla, propriedades, as 8 abas, física, spawns, validação, lógica e a biblioteca inteira), salvar (automático, Ctrl+S, versões, recuperação depois de "travar"), exportar/importar (e o arquivo ruim), duplicar, renomear, apagar, o TESTAR (chute, gol, fim, jogar de novo, trocar de time, bots, colisões, pausa, volta ao editor) e o jogo de sempre rodando depois |
| `python3 tests/oficina_online_test.py` | **58/58** | o servidor de verdade e 3 navegadores (Ana, Beto, Caio): publicar, a comunidade, busca por nome/criador/código, curtir, favoritar, denunciar, a sala com 4 times (entrar pelo código, pela lista da Oficina e a etiqueta no GALERA), o chat, a partida no servidor (comandos, previsão, pausa, a internet caindo e voltando, espectador, ENCERRAR e o fim natural com gol), colaborador e versão nova, permitir copiar, mapa privado, o servidor reiniciando com a mesma pasta (curtidas, favoritos, denúncias e versões continuam), a moderação e a sala comum de sempre |

### 9.2 Os testes do jogo que já existiam

- **Rodada 1 — a suíte inteira (66 conjuntos, num build intermediário da Oficina):** tudo passou, menos: `interface` (1: o
  botão OFICINA tinha 40 px de altura — virou ≥ 46 px), `plataforma_salas_test` (o servidor usava `__dirname`, que não
  existe no pacote ESM da plataforma — corrigido), `polimento` (1: corrida no próprio teste — ver abaixo) e quatro que **já
  falham do mesmo jeito na versão recebida, sem a Oficina** (conferido rodando o build sem a Oficina): `v71` (2) e
  `v92_db_celular` (1), porque o `config.js` recebido é o da **versão de testes** (`experimental: true`: os botões A ⇄ B e DB
  na pausa e a conferência da "versão oficial"); `v82` (20), com expectativas anteriores à v90 (por exemplo a linha "0 peças
  da tampinha"); e `v92_mista`, que precisa da página da v91 original como argumento.
- **Rodada 2 — no build final** (as telas do lobby, o celular, o online, os servidores e os da Oficina):
  `interface` 133/133 · `interface4` 105/105 · `interface5` 68/68 · `celular` 195/195 · `v77` 34/34 · `v78` 38/38 ·
  `polimento` 64/64 · `online` 31/31 · `v85_online` 14/14 · `v92_online` 16/16 · `servidor_test` 191 ok ·
  `plataforma_salas_test` 15 ok · `v88_salas_plataforma_test` 23 ok · `v83_sala_test` 60 ok · `v92_nucleo_test` 22/22 ·
  os 4 da Oficina (91/91, 118/118, 97/97, 58/58) — e `v71` 76/78, as mesmas 2 da versão recebida (os botões da versão de
  testes na pausa). O build confere a física oficial a cada vez: `fisica identica · sha256 ad9f1d2216409b0e`.
- **O `polimento_test`:** a conferência das PATENTES olhava o centro da janela 0,30 s depois do toque, mas a janela abre com
  uma animação de recorte de 0,28 s que começa ~0,15 s depois do toque; no meio dela o centro ainda não recebe o toque.
  Medido: falhava às vezes também **sem** a Oficina. O teste agora espera a animação de abrir terminar (a conferência é a
  mesma).

### 9.3 A revisão de segurança independente (um segundo agente leu o servidor sem ver o meu raciocínio)

Seis achados, todos corrigidos e cobertos por teste:
1. **(alta)** um mapa feito para pesar travava o servidor na validação (a grade das colisões): 33 KB → 1,2 s e 207 MB por
   mensagem. Agora cada peça só entra nas células que alcança e a grade tem teto: recusado em ~30 ms. E um balde próprio para
   o rascunho mandado à sala.
2. **(alta)** cinco conexões sem token (cinco "pessoas" novas) tiravam qualquer mapa do catálogo. Agora só as denúncias de
   **confiança** (conta, equipe ou 24 h + 3 partidas) tiram o mapa sozinhas; as outras vão para a fila da equipe. As curtidas
   de confiança mandam na ordem de "Mais curtidos"; mapas novos de quem acabou de chegar têm teto por hora; o catálogo tem
   teto de disco (`RACHA_MAPAS_MAX_MB`).
3. **(média)** o colaborador com "publicar" mudava nome e visibilidade por um pedido feito à mão — agora só o criador.
4. **(média)** quem reconectava com a conexão velha ainda aberta ganhava uma segunda tampinha (tomava a vaga de um bot) —
   corrigido na partida com mapa. *O mesmo padrão existe na partida das salas de sempre (`server/partida/sala.js`), que não
   mexi para não mudar as salas existentes.*
5. **(baixa)** o MOVER da lógica com 0 s passava do teto de velocidade (a parede atravessava a bola) — agora respeita.
6. **(baixa)** a queda no segundo antes de gravar o índice podia "perder" um mapa recém-publicado — o índice agora confere os
   arquivos mais novos que ele ao abrir, e a moderação vai também para o arquivo do mapa.

### 9.4 O que os testes de navegador pegaram (e foi corrigido)

A página do mapa (detalhes, curtir, favoritar) não aparecia — a janela com duas classes perdia o estilo; entrar numa sala
pelo código deixava a pessoa só assistindo (agora entra num time com vaga); o salvamento automático pendente de uma sessão do
editor podia gravar por cima de um RENOMEAR feito na central; a recuperação não avisava de uma mudança feita logo depois de
salvar; o botão OFICINA encostava na tampinha e no letreiro em telas pequenas.

## 10. As limitações reais

- **"Permitir copiar"** impede duplicar pela Oficina e publicar uma cópia (o servidor confere a origem), mas quem pode jogar
  um mapa recebe os dados dele (é preciso para jogar e testar): alguém com as ferramentas de desenvolvedor do navegador
  consegue extrair o JSON. Não existe como impedir isso num jogo que roda no navegador.
- **Sem conta**, as curtidas, os favoritos e os mapas publicados ficam ligados ao navegador (o token do aparelho); com a
  conta, à conta. Na plataforma sem `RACHA_DADOS`, os tokens de visitante não sobrevivem ao reinício do servidor.
- **No online**, a lógica do mapa (portões, botões, portais, mensagens) vem do servidor, com cerca de um quadro de atraso;
  a sua tampinha e a bola são previstas na hora, como nas salas comuns.
- **A moderação dos mapas** é feita na aba Moderação da própria Oficina (para a equipe). As denúncias de mapa também caem
  na lista de denúncias do RACHA CONTROL quando o servidor das salas está montado na plataforma, mas o RACHA CONTROL não
  ganhou uma tela própria para ocultar/marcar mapas.
- **As miniaturas** são imagens pequenas feitas pelo próprio jogo (até 40 KB); não existe envio de imagem de fora
  (segurança: nada de arquivo de terceiros no servidor).
- **Tamanho**: até 16 jogadores numa partida (4 × 4 ou 3 × 5) e 20 pessoas por sala (o resto assiste); 30 mapas por
  pessoa, 12 publicações por dia.
- **Hospedagem**: no Docker/Render, como o `turma.json`, a pasta dos mapas precisa de um disco que sobreviva ao reinício,
  senão os mapas publicados somem quando o serviço reinicia (no VPS, `/var/lib/racha/mapas` já resolve).
- **Onde foi testado**: no Chromium (Playwright) em tamanhos de celular com toque simulado e de computador, e o servidor de
  verdade pela rede. Não foi testado num iPhone/Android físico nem com a plataforma de produção (MySQL) no ar — o servidor das
  salas montado na plataforma foi testado com o banco de teste do projeto (`plataforma_salas_test`, `v88_salas_plataforma`).

## 11. Como rodar e testar

```bash
# o jogo + as salas + a Oficina, no computador (Node 18+):
python3 tools/aplicar_rua.py          # o build (já está feito no zip; rode de novo se mudar algo em tools/)
node server.js                        # http://localhost:8080 — os mapas ficam em server/dados/mapas
#   (ou: node server/servidor.js --mapas PASTA --moderadores c1,c2 …)
# os testes da Oficina:
node tests/oficina_mapa_test.mjs
node tests/oficina_servidor_test.js
python3 tests/oficina_cliente_test.py     # Python 3 + Playwright + Chromium (como os outros testes do projeto)
python3 tests/oficina_online_test.py
python3 tests/oficina_ferramentas_test.py
python3 tests/oficina_v94_test.py         # (28/10) o CRIAR SALA com a física da sala, os 3 públicos, curtir/favoritar no cartão e a v93 na partida
python3 tests/ajustes_linhas_test.py      # (28/10) os ajustes finos, as linhas da bola e, na Oficina, a contagem, as linhas, o cartão do gol e o craque
# tudo (os de antes, os da v93/v94 e os novos):
npm test                              # = bash tests/roda_tudo.sh
```
A saída inteira de cada teste está em `tests/saida/logs_v94oficina/` (28/10: a bateria inteira no build final, com o
`RESUMO.txt`), `tests/saida/logs_v92oficina/` e `tests/saida/logs_v92oficina_final/` (as rodadas de 24/10).

No Windows: `INICIAR-NO-WINDOWS.bat` (como antes). No VPS: `deploy/prepara-vps.sh` já cria a pasta dos mapas; faça backup
de `/var/lib/racha` (o `turma.json` e a pasta `mapas`).
