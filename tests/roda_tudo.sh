#!/usr/bin/env bash
# RACHA · roda todos os testes automáticos e mostra o resumo de cada um (≈ 15 min no total).
# Precisa de: Python 3 com Playwright e um Chromium (RACHA_CHROME=/caminho/do/chromium se não for o padrão), Node 18+.
# O build (python3 tools/aplicar_rua.py) gera a cópia de teste tests/build/racha_teste.html antes.
# v73/v74/v76/v77/v78: com RACHA_REF=<racha_teste.html da v71.1> o v73, o v74, o v76 e o v77 também comparam o bloco de física e o caminho da bola entre as
# duas versões (e o v74, a imagem da Arena, pixel a pixel); o v78 confere que o tamanho do jogador em campo é o mesmo da v71.1.
# v79: o v79 sobe o servidor da turma (como o online) para a ranqueada online; leva ~1,5 min (as esperas da fila são de verdade).
# v80: o v80 também sobe o servidor (com a partida normal encurtada para 14 s + 8 s: --tempo-normal/--prorrogacao); ~1,5 min.
# v81: o v81 sobe o servidor com três sessões (o Chat do Brasil, o chat da sala, o digitando, a denúncia e o silenciar); ~1 min.
# v82: o v82 sobe a plataforma de mentira (tests/plataforma82_falsa.mjs: as mesmas regras do servidor da plataforma) e abre o jogo
# dentro dela em três aparelhos (as contas, a patente, o progresso na conta); ~1 min. O contas (Node) testa as regras e a cópia.
# v83: o v83_partida (Node) testa a partida autoritativa no servidor (a física, o cronômetro, a antitrampa, o gerente de salas);
# o v83_ws (Python) sobe o servidor de verdade e joga uma partida inteira por WebSocket (os quadros a 20/s, o selo do resultado);
# o guard (Node) testa a correção das permissões do RACHA CONTROL (compila o guard.ts antes, sem precisar de banco).
# v83 (salas hospedadas): o v83_sala (Node) testa o motor das salas no servidor (a física, a entrada, a autoria, as
# regras, a saída/retorno com bot, a pausa, a curva e uma partida inteira de bots); o v83_salas_ws (Python) sobe o
# servidor de verdade e cobre os 15 testes obrigatórios do plano por WebSocket (a sala pública e a privada hospedadas,
# dois aparelhos, a queda do criador sem parar a partida, a trapaça de quadro/placar ignorada, a perda de pacotes, a
# reconexão, a bola e o placar sincronizados, a ranqueada hospedada, as partidas simultâneas com CPU/RAM/banda); ~5 min.
# O v83_medida (Node, fora da lista por não ser teste de passa/falha) imprime o custo de CPU do passo de 60 Hz e o
# tamanho dos quadros na rede — a medida que o plano da v83 pede antes de fixar a frequência.
# v85: o v85_online joga com duas sessões do jogo numa sala hospedada (o comando chegando ao servidor; na v86 ele confere a
# mecânica clássica: 32 direções e os botões 1/2/3); o v85_chaves confere a migração das chaves antigas do treino. O online,
# o v79, o v80, o v81 e a parte "pela rede" do servidor_test sobem o tests/servidor_visitantes.cjs (o servidor de verdade
# aceitando quem não tem conta: o padrão da v84 exige a conta). Para guardar a saída inteira de cada teste: bash tests/roda_lista.sh.
# v86: o v86_chute confere a mecânica clássica de volta e o chute mais forte — os mesmos números no jogo e no servidor, a
# velocidade da bola depois do PASSE e do CHUTE no jogo de verdade e na sala do servidor.
# v87: o v87_site sobe a plataforma de mentira da v87 (tests/v87_plataforma_falsa.mjs: a raiz leva ao jogo, a API tRPC com
# token ou cookie, as páginas da conta) e confere tudo dentro do jogo: o login do jogo, a sessão do site valendo, as páginas
# da conta por cima do jogo, o SAIR, o RACHA CONTROL e o jogo sem a plataforma.
# v87.2: o v872_presente confere as moedas e gemas de teste (o presente: true do config.js na produção: uma vez só, a loja
# com o presente, o presente: false do lançamento, o presente com outro valor e a demonstração igual). Os outros testes
# abrem como o lançamento (o comum.abre põe presente: false, a não ser que o teste diga outra coisa).
# v90: o v90_ranking (Node) sobe a plataforma de teste com o servidor das salas e confere o ranking da temporada: o selo com os
# gols e as assistências contados pelo motor, nada do aparelho, nada duplicado, o TOP 20 e o desempate, o fechamento e as recompensas.
# v88: o v88_plataforma (Node) roda o código de verdade da plataforma (app/api) na plataforma de teste (tests/plataforma:
# SQLite no lugar do MySQL, sem npm) com três contas — amigos, mensagens, correio (o COLETAR uma vez), loja e carteira,
# missões, passe, eventos, estatísticas, clube, denúncias, privacidade, excluir a conta e o RACHA CONTROL — e reinicia com o
# mesmo banco; o v88_social (Node) testa o social ao vivo no servidor da turma (status dos amigos, convites, chat dos amigos,
# do clube e da equipe, bloqueio, denúncia com motivo); o v88_salas_plataforma (Node) faz o mesmo com o servidor das salas
# montado na plataforma; o v88_cliente (Python) abre o jogo de verdade logado em dois e três navegadores e usa os botões
# (login, correio, loja, amigos, mensagem, convite, partida, espectador, denúncia, missões, passe, eventos, estatísticas,
# privacidade, treino) e reinicia a plataforma para conferir que tudo ficou; ~1 min. O v88_controle confere o controle
# Bluetooth com um controle simulado no navegador (a API Gamepad de mentira: menus, 32 direções, velocidade e força iguais às
# do teclado, A/B trocados, START, desconectar).
# v88.1: as contas pelo Dono. O v881_contas (Node) roda a plataforma de teste em três boots com o mesmo banco: o cadastro
# fechado, a senha do manual recusada, a senha do Dono pela variável, o RACHA CONTROL › Contas (criar, só o Dono, senha nova,
# abrir/fechar o cadastro) e o ZERAR CONTAS (todas as tabelas sem as contas apagadas, o servidor das salas derrubando e
# esquecendo, o bilhete velho recusado, a conta nova com o número de volta sem herdar nada); o v881_painel (Python) abre o
# RACHA CONTROL e o login do site num navegador de verdade (as páginas do app/src juntadas pelo tests/ui_site com o React
# desta máquina e um cliente de teste no lugar do @trpc/react-query) e usa os botões; o v881_jogo (Python) confere o login do
# jogo com o cadastro fechado e o aparelho tirando o que era das contas apagadas quando o mesmo número volta.
# v92: o v92_nucleo (Node) confere o núcleo compartilhado da física das salas (com o perfil v91, os mesmos quadros do motor da
# v91 tique a tique; o toque armado, os contadores e a rede do perfil v92; o relógio de 60 passos/s); o v92 (Python) a cadência,
# o desenho entre os passos, o toque armado, o analógico e o painel da versão de testes; o v92_online (Python) a previsão do
# online com o núcleo (um "4G de mentira" de 40 ms: tests/v92_proxy.cjs) e o servidor de testes (RACHA_EXPERIMENTAL=1); ~1 min.
# O v92_celular (Python) os controles com toques de verdade num iPhone e num Android de mentira (o HUD, o PASSE/CHUTE, o
# toque armado, o analógico, dois dedos, as colisões, a fluidez, a vibração e o A ⇄ B da pausa); ~2 min. O v92_pacote monta
# os dois ZIPs e confere que o oficial não tem o painel e o de testes tem (servidos pelo node server.js). O v92_reconexao
# derruba a internet de mentira (um soluço, um apagão, a conexão caindo, o app em segundo plano, 24 s de internet ruim) e
# confere a volta, as correções e que o servidor e os dois aparelhos veem o mesmo; ~2,5 min.
# As MEDIDAS de antes × depois (não são passa/falha): tests/v92_medidas.py e tests/v92_online_medidas.py.
# v92 · o DB (PASSE + CHUTE): o v92_db (Node) confere o DB por estados (experimental, dbModo 1) e que o DB atual não mudou (o
# núcleo novo × o de antes), as 9 regras, as dificuldades por cenário e o servidor × a previsão (também com a rede atrasando);
# o v92_db_celular (Python) com toques de verdade e o relógio do toque; o v92_db_online (Python) a previsão × o servidor com o
# jogo de verdade a 40 e 150 ms. O laboratório (tests/v92_db/lab.cjs) imprime a matriz inteira (node tests/v92_db/lab.cjs).
# v88.2: o v882_visitante (Python) confere o JOGAR ONLINE SEM CONTA: duas pessoas só com o nome jogando numa sala (num servidor
# que aceita visitante, como o do Render) e, na plataforma de teste, a sala sem conta e o login obrigatório com RACHA_VISITANTES=0.
cd "$(dirname "$0")/.." || exit 1
# (v101: a saída do build inteira numa variável — o "| head -1" de antes fechava o cano no meio do build e o Python caía com
#  BrokenPipeError; e o "|| exit 1" olhava o head, não o build. Agora: se o build falhar, mostra o fim e para; senão, a linha da física)
if ! build=$(python3 tools/aplicar_rua.py 2>&1); then echo "$build" | tail -20; exit 1; fi
echo "$build" | grep -m1 -E 'fisica identica' || echo "$build" | tail -1
falhou=0
for t in regras controles camera interface interface4 interface5 celular enxuto v71 v73 v74 v75 v76 v77 v78 v79 v80 v81 v82 tutorial perfil eventos polimento matriz; do
  printf '%-12s ' "$t"
  if out=$(python3 "tests/${t}_test.py" 2>&1); then echo "$out" | grep -E 'verificações ok' | tail -1; else falhou=1; echo "$out" | grep -E 'verificações ok|FALHOU|Error' | tail -6; fi
done
for p in '' '--p2p'; do
  printf '%-12s ' "online$p"
  if out=$(python3 tests/online_test.py $p 2>&1); then echo "$out" | grep -E 'verificações ok' | tail -1; else falhou=1; echo "$out" | tail -6; fi
done
for t in servidor_test.js plataforma_salas_test.mjs contas_test.mjs; do
  printf '%-12s ' "${t%%_*}"
  if out=$(node "tests/$t" 2>&1); then echo "$out" | tail -1; else falhou=1; echo "$out" | grep -E 'FALHOU' | head -4; echo "$out" | tail -1; fi
done
printf '%-12s ' "v83_partida"
if out=$(node tests/v83_partida_test.mjs 2>&1); then echo "$out" | tail -1; else falhou=1; echo "$out" | grep -E 'FALHOU' | head -4; echo "$out" | tail -1; fi
printf '%-12s ' "v83_ws"
if out=$(python3 tests/v83_ws_test.py 2>&1); then echo "$out" | tail -1; else falhou=1; echo "$out" | grep -E 'FALHOU|Error' | head -4; echo "$out" | tail -1; fi
printf '%-12s ' "v83_sala"
if out=$(node tests/v83_sala_test.mjs 2>&1); then echo "$out" | tail -1; else falhou=1; echo "$out" | grep -E 'FALHOU' | head -4; echo "$out" | tail -1; fi
printf '%-12s ' "v83_salas_ws"
if out=$(python3 tests/v83_salas_ws_test.py 2>&1); then echo "$out" | tail -1; else falhou=1; echo "$out" | grep -E 'FALHOU|Error' | head -4; echo "$out" | tail -1; fi
printf '%-12s ' "guard"
if out=$(node tests/compila_guard.cjs >/dev/null 2>&1 && node tests/guard_test.mjs 2>&1); then echo "$out" | tail -1; else falhou=1; echo "$out" | grep -E 'FALHOU' | head -4; echo "$out" | tail -1; fi
for t in v85_online v85_chaves v86_chute v87_site v872_presente; do
  printf '%-12s ' "$t"
  if out=$(python3 "tests/${t}_test.py" 2>&1); then echo "$out" | grep -E 'verificações ok' | tail -1; else falhou=1; echo "$out" | grep -E 'verificações ok|FALHOU|Error' | tail -6; fi
done
for t in v88_plataforma_test.mjs v88_social_test.js v88_salas_plataforma_test.mjs; do
  printf '%-12s ' "${t%%_test*}"
  if out=$(node "tests/$t" 2>&1); then echo "$out" | tail -1; else falhou=1; echo "$out" | grep -E 'FALHOU' | head -4; echo "$out" | tail -1; fi
done
printf '%-12s ' "v881_contas"
if out=$(node tests/v881_contas_test.mjs 2>&1); then echo "$out" | tail -1; else falhou=1; echo "$out" | grep -E 'FALHOU' | head -4; echo "$out" | tail -1; fi
printf '%-12s ' "v92_nucleo"
if out=$(node tests/v92_nucleo_test.mjs 2>&1); then echo "$out" | tail -1; else falhou=1; echo "$out" | grep -E 'FALHOU' | head -4; echo "$out" | tail -1; fi
printf '%-12s ' "v92_db"
if out=$(node tests/v92_db_test.cjs 2>&1); then echo "$out" | tail -1; else falhou=1; echo "$out" | grep -E 'FALHOU' | head -4; echo "$out" | tail -1; fi
printf '%-12s ' "v90_ranking"
if out=$(node tests/v90_ranking_test.mjs 2>&1); then echo "$out" | tail -1; else falhou=1; echo "$out" | grep -E 'FALHOU' | head -4; echo "$out" | tail -1; fi
for t in v88_cliente v88_controle v881_painel v881_jogo v882_visitante v92 v92_online v92_celular v92_reconexao v92_db_celular v92_db_online; do
  printf '%-12s ' "$t"
  if out=$(python3 "tests/${t}_test.py" 2>&1); then echo "$out" | grep -E 'verificações ok' | tail -1; else falhou=1; echo "$out" | grep -E 'verificações ok|FALHOU|Error' | tail -6; fi
done
# v92 · OFICINA (o editor de mapas, ver o LEIA-ME-OFICINA.md): o oficina_mapa (Node) confere o motor dos mapas (a validação, a
# mesma conta do núcleo das salas no perfil Clássico, o determinismo, 4 times, as zonas, os portais, os botões, a lógica e os
# limites); o oficina_servidor (Node) o catálogo, as permissões, as denúncias, o disco e as salas com mapa pela rede; o
# oficina_cliente (Python) o botão, a central, os modelos, as ferramentas pelo toque, salvar/versões/recuperação e o TESTAR no
# navegador; o oficina_online (Python) o servidor com três sessões (publicar, a comunidade, a sala com 4 times, a partida, as
# permissões, o reinício e a moderação); o oficina_ferramentas (Python) só a v92 oficial na página publicada, a bola branca de
# contorno preto (os pixels do TESTAR), lançar a bola, copiar para o outro lado, repetir, as medidas, as guias, a vibração e
# as sombras; ~6 min.
for t in oficina_mapa_test.mjs oficina_servidor_test.js; do
  printf '%-12s ' "${t%%_test*}"
  if out=$(node "tests/$t" 2>&1); then echo "$out" | tail -1; else falhou=1; echo "$out" | grep -E 'FALHOU' | head -4; echo "$out" | tail -1; fi
done
for t in oficina_cliente oficina_online oficina_ferramentas; do
  printf '%-12s ' "$t"
  if out=$(python3 "tests/${t}_test.py" 2>&1); then echo "$out" | grep -E 'verificações ok' | tail -1; else falhou=1; echo "$out" | grep -E 'verificações ok|FALHOU|Error' | tail -6; fi
done
# v93 (ver o LEIA-ME-v93.md): o HUD, os itens, a contagem, o replay e o painel online, as salas e o admin, o grupo, as falas,
# as bolas lisas, os sons e as três revisões. v94 (o motor próprio, em testes: ver o LEIA-ME-v94-TESTES.md): o motor, a sala
# do servidor no motor, a turma, o jogo e o online. Depois, os AJUSTES FINOS e as LINHAS DA BOLA (ajustes_linhas: as 7 abas,
# a página por cima da aba, guardar, o celular, a linha do chute e o caminho da bola = a física de verdade passo a passo, o
# núcleo e a extrapolação, e na Oficina a contagem, as linhas, o cartão do gol, o craque e a bola equipada) e a OFICINA desta
# versão no online (oficina_v94: curtir/favoritar no cartão, CRIAR SALA com a física da sala, os 3 públicos, a contagem, as
# falas, o cartão do gol e o craque com duas sessões); ~12 min.
for t in v93_mista_test.js v93_salas_test.js v93_grupo_test.js v93_falas_test.js v93_revisao_test.js v93_revisao2_test.js v93_revisao3_test.js v94_motor_test.js v94_sala_test.js v94_turma_test.js; do
  printf '%-12s ' "${t%%_test*}"
  if out=$(node "tests/$t" 2>&1); then echo "$out" | tail -1; else falhou=1; echo "$out" | grep -E 'FALHOU' | head -4; echo "$out" | tail -1; fi
done
for t in v93_fase1 v92_hud v93_itens v93_fase2 v93_fase3 v93_fase4 v93_fase5 v93_bolas v93_sons v93_revisao_cli v94_jogo v94_online ajustes_linhas oficina_v94; do
  printf '%-12s ' "$t"
  if out=$(python3 "tests/${t}_test.py" 2>&1); then echo "$out" | grep -E 'verificações ok' | tail -1; else falhou=1; echo "$out" | grep -E 'verificações ok|FALHOU|Error' | tail -6; fi
done
# v95: o fim da partida, os emojis, a ranqueada, o chat, o perfil, os campos, a economia, o visual, o placar, o sensor e a
# Oficina (o v95, no navegador); o servidor das salas desta rodada e o grupo na ranqueada (Node: o PRONTO e o JOGAR DE NOVO
# com 10 s); o v95_grupo_navegador abre dois navegadores na plataforma de teste (~1,5 min)
for t in v95_servidor_test.js v95_grupo_test.js; do
  printf '%-12s ' "${t%%_test*}"
  if out=$(node "tests/$t" 2>&1); then echo "$out" | tail -1; else falhou=1; echo "$out" | grep -E 'FALHOU' | head -4; echo "$out" | tail -1; fi
done
for t in v95 v95_grupo_navegador; do
  printf '%-12s ' "$t"
  if out=$(python3 "tests/${t}_test.py" 2>&1); then echo "$out" | grep -E 'verificações ok' | tail -1; else falhou=1; echo "$out" | grep -E 'verificações ok|FALHOU|Error' | tail -6; fi
done
# v96: o online liso como o treino (Node: o simulador de rede com o cliente e o servidor de verdade, antes e depois — os
# teleportes, as traves, o atraso, a fila do servidor; no navegador: duas sessões na sala de verdade, a rede lenta e os
# apagões), a tampinha dos FUNDADORES na plataforma (as 30 primeiras contas, o número, não vende, o bilhete) e as tampinhas
# animadas novas no jogo (o desenho, o editor, a dos fundadores só para quem tem, a partida e o custo); ~3 min.
for t in v96_rede_test.mjs v96_fundador_test.mjs v102_rede_test.mjs; do
  printf '%-12s ' "${t%%_test*}"
  if out=$(node "tests/$t" 2>&1); then echo "$out" | tail -1; else falhou=1; echo "$out" | grep -E 'FALHOU|falhou' | head -4; echo "$out" | tail -1; fi
done
# (depois do teste: a conta fora dos Ajustes — a janela SUA CONTA pelo perfil, o chat em Privacidade — e o anel do chute suave)
for t in v96_online v96_skins v96_conta; do
  printf '%-12s ' "$t"
  if out=$(python3 "tests/${t}_test.py" 2>&1); then echo "$out" | grep -E 'verificações ok' | tail -1; else falhou=1; echo "$out" | grep -E 'verificações ok|FALHOU|Error' | tail -6; fi
done
# v97: a oficina de estádios no motor do Rachão, sem navegador (os 17 campos de ida e volta, a limpeza com 400 entradas
# sorteadas, o código para compartilhar e 210 partidas de bots em estádios sorteados; ~20 s)
printf '%-12s ' "v97_estadios"
if out=$(node tests/v97_estadios_test.mjs 2>&1); then echo "$out" | tail -1; else falhou=1; echo "$out" | grep -E 'FALHOU' | head -4; echo "$out" | tail -1; fi
# v97 (depois do teste): a mistura da física entre o RACHA e o Rachão, jogada nos dois motores (a bola, o jogador e o chute
# medidos lá e cá), os chutes do estádio e os 17 campos iguais ao motor original com o mesmo sorteio; ~15 s
printf '%-12s ' "v97_mistura"
if out=$(node tests/v97_mistura_test.mjs 2>&1); then echo "$out" | tail -1; else falhou=1; echo "$out" | grep -E 'FALHOU' | head -4; echo "$out" | tail -1; fi
# v97: o Rachão na Oficina (no navegador, servido por http: a página gerada do original, os 17 campos de ida e volta pelo
# editor, a limpeza do que entra, o editor no celular, o TESTAR, o JOGAR e a aba RACHÃO com o Rachão por cima; ~1 min)
for t in v97_rachao; do
  printf '%-12s ' "$t"
  if out=$(python3 "tests/${t}_test.py" 2>&1); then echo "$out" | grep -E 'verificações ok' | tail -1; else falhou=1; echo "$out" | grep -E 'verificações ok|FALHOU|Error' | tail -6; fi
done
# v98: o RACHA e o Rachão separados na Oficina e as SALAS ONLINE do Rachão. O v98_rachao_servidor (Node) confere o motor do
# Rachão no servidor (gerado da página: as mesmas contas), o estádio e as opções da sala que chegam limpos, a fila de comandos
# (o palpite, o silêncio, o excesso, os toques que não se perdem), o quadro e a previsão do aparelho iguais ao servidor, a
# queda com o bot no lugar, o fim e a sala pela rede (o aparelho antigo não vê a sala); ~20 s. O v98_rachao_online (Python)
# sobe o servidor das salas com três sessões: os dois modos da central, o CRIAR SALA na tela do Rachão, a lista, o código, os
# AJUSTES, a partida com a previsão, o fechar e voltar, a queda, os gols e o fim, a sala com um estádio de quem cria (e o
# admin que herdou a sala), a demonstração sem servidor e as telas no celular; ~1 min.
printf '%-12s ' "v98_servidor"
if out=$(node tests/v98_rachao_servidor_test.mjs 2>&1); then echo "$out" | tail -1; else falhou=1; echo "$out" | grep -E 'FALHOU' | head -4; echo "$out" | tail -1; fi
for t in v98_rachao_online; do
  printf '%-12s ' "$t"
  if out=$(python3 "tests/${t}_test.py" 2>&1); then echo "$out" | grep -E 'verificações ok' | tail -1; else falhou=1; echo "$out" | grep -E 'verificações ok|FALHOU|Error' | tail -6; fi
done
# v99: os chutes do Rachão (CAVADINHA, CURVA e SUPER CHUTE) nas salas personalizadas do RACHA. O v99_chutes (Node) confere o
# núcleo (as opções, o estado no quadro, as medidas do Rachão), a física no motor das salas (por cima de quem está na frente,
# a cabeçada, a curva, o super com o teto e o fogo, o travessão), os comandos (os toques que não se perdem, o buraco da
# internet), os bots usando os três, a previsão do aparelho (o código do jogo num vm) igual ao servidor com e sem atraso, as
# salas sem os chutes iguais às da v98 quadro por quadro e o servidor de verdade (a página antiga não vê nem entra); ~10 s.
# O v99_chutes_online (Python) sobe o servidor com duas sessões: o CRIAR SALA, o quadro CHUTES da sala, a lista, a partida
# (os botões, o cartão, a tecla e o dedo, a cavadinha subindo nas duas telas, a curva, o super com fogo, a rodada sem os
# chutes), os moldes e o editor do HUD, as teclas e a sala neste aparelho no motor das salas (a pausa e o ENCERRAR); ~1 min.
printf '%-12s ' "v99_chutes"
if out=$(node tests/v99_chutes_test.mjs 2>&1); then echo "$out" | tail -1; else falhou=1; echo "$out" | grep -E 'FALHOU' | head -4; echo "$out" | tail -1; fi
for t in v99_chutes_online; do
  printf '%-12s ' "$t"
  if out=$(python3 "tests/${t}_test.py" 2>&1); then echo "$out" | grep -E 'verificações ok' | tail -1; else falhou=1; echo "$out" | grep -E 'verificações ok|FALHOU|Error' | tail -6; fi
done
# v100: A REVISÃO DE SEGURANÇA (ver o CHANGELOG.md, v100). O seguranca_resultados (Node) confere o treino, a cópia do
# progresso, a patente local e as estatísticas assinadas; o v100_seguranca (Node) a plataforma e o servidor das salas: o selo uma
# vez só e na escrita canônica, a patente só contra gente, a progressão do aparelho que não vira conta, os limites do login por IP
# (o endereço que o proxy viu, não o que o cliente escreve) e por conta, o cookie Secure, a sessão de no máximo 90 dias, o token
# do aparelho que não abre a conta, a conta banida caindo das salas, o limite de conexões, os cabeçalhos e o /health; o
# v100_seguranca (Python) o convite com outro servidor (pergunta antes) e o bilhete da conta só para o servidor do jogo; ~1 min.
for t in seguranca_resultados_test.mjs v100_seguranca_test.mjs; do
  printf '%-12s ' "${t%%_test*}"
  if out=$(node "tests/$t" 2>&1); then echo "$out" | tail -1; else falhou=1; echo "$out" | grep -E 'FALHOU' | head -4; echo "$out" | tail -1; fi
done
for t in v100_seguranca; do
  printf '%-12s ' "$t"
  if out=$(python3 "tests/${t}_test.py" 2>&1); then echo "$out" | grep -E 'verificações ok' | tail -1; else falhou=1; echo "$out" | grep -E 'verificações ok|FALHOU|Error' | tail -6; fi
done
# v101: O LOBBY NO ESTILO DA IMAGEM DA NOITE E SÓ O CRIAR TAMPINHA (ver o CHANGELOG.md, v101). O v101 (Python) confere o lobby
# novo em cinco tamanhos de tela (as peças novas, o fundo cobrindo a tela, nada fora dela, nenhum botão por cima de outro), os
# botões abrindo o que já abriam, as telas no estilo novo e as tampinhas prontas escondidas (o interruptor as traz de volta).
# Os testes que conferem as prontas (v71, v76, v80, v96_skins, polimento, celular, v93_itens) ligam o interruptor (comum.SKINS_PRONTAS).
for t in v101; do
  printf '%-12s ' "$t"
  if out=$(python3 "tests/${t}_test.py" 2>&1); then echo "$out" | grep -E 'verificações ok' | tail -1; else falhou=1; echo "$out" | grep -E 'verificações ok|FALHOU|Error' | tail -6; fi
done
# v102: A BORDA BOTÃO, O ANEL, O LOBBY MAIS LIMPO E O CORREIO (ver o CHANGELOG.md, v102). O v102_correio (Node) roda a plataforma
# de teste com o banco embrulhando os erros como o drizzle da produção (o "Failed query" com a chave repetida dentro): a carta
# para todo mundo chega uma vez e o correio continua abrindo, COLETAR paga uma vez, APAGAR não traz a carta nem o prêmio de
# volta. O v102 (Python) confere o lobby com menos coisa na tela em cinco tamanhos (o MENU com o resto, os mesmos botões de
# sempre por trás, os números e os pontos), a borda BOTÃO (o lugar 27, o desenho, o editor) e o anel novo; ~2,5 min.
printf '%-12s ' "v102_correio"
if out=$(node tests/v102_correio_test.mjs 2>&1); then echo "$out" | tail -1; else falhou=1; echo "$out" | grep -E 'FALHOU' | head -4; echo "$out" | tail -1; fi
for t in v102; do
  printf '%-12s ' "$t"
  if out=$(python3 "tests/${t}_test.py" 2>&1); then echo "$out" | grep -E 'verificações ok' | tail -1; else falhou=1; echo "$out" | grep -E 'verificações ok|FALHOU|Error' | tail -6; fi
done
# v103: O LOBBY DE DIA, AS SALAS SEM BOTS, O ÁRBITRO, A RANQUEADA QUE VALE, O PERFIL PELO CHAT, OS SONS DO ONLINE, OS CONTROLES E A TELA
# CHEIA (ver o CHANGELOG.md, v103). O v103_ranqueada (Node) confere a fila (o fila_bots e os 20 s sem ninguém: a ranqueada contra
# os bots no servidor) e, na plataforma de teste, os pontos dela com o teto do dia contra os bots e o ranking; o v103_salas
# (Python, quatro navegadores) a sala sem bots, a ficha do árbitro, o começo com um a menos, pôr gente no meio sem reiniciar e quem
# sai deixando a vaga vazia; o v103_sons, os sons do online contados em dois navegadores; o v103_chat_perfil (a plataforma de
# teste), o VER PERFIL pelo chat no lobby e na partida; o v103_controles, o controle e o teclado configuráveis e o analógico; o
# v103_tela, a tela cheia, o PWA e o encaixe em vários tamanhos.
printf '%-12s ' "v103_ranq"
if out=$(node tests/v103_ranqueada_test.mjs 2>&1); then echo "$out" | tail -1; else falhou=1; echo "$out" | grep -E 'FALHOU' | head -4; echo "$out" | tail -1; fi
for t in v103_salas v103_sons v103_chat_perfil v103_controles v103_tela; do
  [ -f "tests/${t}_test.py" ] || continue
  printf '%-12s ' "$t"
  if out=$(python3 "tests/${t}_test.py" 2>&1); then echo "$out" | grep -E 'verificações ok' | tail -1; else falhou=1; echo "$out" | grep -E 'verificações ok|FALHOU|Error' | tail -6; fi
done
# v104: O CORREIO DE VERDADE, O ÁRBITRO ARRASTANDO NO PAINEL DOS JOGADORES, A TELA INTEIRA SÓ COM O JOGO E O RANKING QUE ABRE ONDE
# TEM GENTE (ver o CHANGELOG.md, v104). O v104_painel (Python, três navegadores e o servidor da turma) a VAGA LIVRE no painel e
# o árbitro segurando e arrastando (banco, vaga, troca, time) com a partida rolando; o v104_ranking (a plataforma de teste, que
# agora entrega o null como a produção) a caixa de entrada e o ranking indo para a aba que tem gente.
for t in v104_painel v104_ranking; do
  printf '%-12s ' "$t"
  if out=$(python3 "tests/${t}_test.py" 2>&1); then echo "$out" | grep -E 'verificações ok' | tail -1; else falhou=1; echo "$out" | grep -E 'verificações ok|FALHOU|Error' | tail -6; fi
done
# v105: O JOGO DE CORPO, A VIRADA NA HORA E O ONLINE SEM A BOLA ATRAVESSANDO (ver o CHANGELOG.md, v105). O v105_rede (Node) confere
# no núcleo das salas o empurra-empurra (as tampinhas se seguram de frente; de lado ainda passam), a virada na hora e as 64
# direções, e no simulador da rede a bola desenhada fora das tampinhas e os 60 quadros por segundo das salas.
printf '%-12s ' "v105_rede"
if out=$(node tests/v105_rede_test.mjs 2>&1); then echo "$out" | tail -1; else falhou=1; echo "$out" | grep -E 'FALHOU' | head -4; echo "$out" | tail -1; fi
# v106: O JOGO DE CORPO NO MEIO-TERMO (o atrito de 0,5 para 0,2): quem fecha o caminho, quem está parado e o empurra-empurra,
# contra a v104 e a v105; < 1 s.
printf '%-12s ' "v106_corpo"
if out=$(node tests/v106_corpo_test.mjs 2>&1); then echo "$out" | tail -1; else falhou=1; echo "$out" | grep -E 'FALHOU' | head -4; echo "$out" | tail -1; fi
# v106: AS MASCOTES SÓ COM QUEM COMPROU (server/mascotes106.js e app/api/racha/mascotes.ts): as peças pelo lugar nas listas, o
# servidor das salas (o bilhete, a troca no meio da sala, a compra que vale na hora) e a plataforma de teste (as relações, o
# bilhete, a tampinha da conta e o escudo do clube); ~2 s.
printf '%-12s ' "v106_mascotes"
if out=$(node tests/v106_mascotes_servidor_test.mjs 2>&1); then echo "$out" | tail -1; else falhou=1; echo "$out" | grep -E 'FALHOU' | head -4; echo "$out" | tail -1; fi
# v107: O CONVITE PELO CHAT (server/convite107.js): convidar quem escreveu uma mensagem recente (o Chat do Brasil, a sala, a equipe,
# o clube) para a sua sala, mesmo quem não é amigo — as regras de sempre (conta, sala, ranqueada, cheia, bloqueio dos dois lados,
# quem recebe convites, quem já está), as do chat (a mensagem de até 15 min, a escondida, a do sistema, a da equipe dos outros, o
# visitante), os limites (10 s, 6 em 10 min, 2 min a mesma pessoa, 8 para quem recebe; reconectar não zera), o texto do erro que
# não conta nada de quem recebe e os amigos pelo ID como antes; < 1 s.
printf '%-12s ' "v107_convite"
if out=$(node tests/v107_convite_servidor_test.mjs 2>&1); then echo "$out" | tail -1; else falhou=1; echo "$out" | grep -E 'FALHOU' | head -4; echo "$out" | tail -1; fi
# v108: O ONLINE SEM CÂMERA LENTA (ver o tools/v108/lento.js e o server/partida/ritmo108.js). O v108_rede (Node)
# confere o núcleo do deslize com prazo (tools/v108/lento.js) e, no simulador da rede, os apagões de 1 e 2 s (a mola de antes
# levava de 0,9 a 4 s para sumir; agora menos de meio segundo na sua tampinha) e o jogo normal igual ao da v105; o
# v108_servidor o ritmo dos comandos num balde (a rajada do apagão passa — a tampinha e o chute logo depois da volta; o excesso,
# não, com uma linha por segundo, nas salas do RACHA, do mapa e do Rachão) e o motor que alcança 12 passos com o processo
# travando; ~30 s.
for t in v108_rede v108_servidor; do
  printf '%-12s ' "$t"
  if out=$(node "tests/${t}_test.mjs" 2>&1); then echo "$out" | tail -1; else falhou=1; echo "$out" | grep -E 'FALHOU' | head -4; echo "$out" | tail -1; fi
done
# v109: OS DOIS PAINÉIS DO RACHA CONTROL (o do Dono e o da staff) E O 2FA CONSERTADO. O v109_painel_servidor (Node; a
# plataforma de teste com o servidor das salas e WebSockets de verdade) a chave nova do 2FA (32 letras, fecha em bytes), a de
# antes trocada ou mantida, o código errado, o de outro horário (o relógio adiantado/atrasado), o código usado duas vezes e o
# limite; quem cai em qual painel; a staff sem selo, presente, item, moeda, eventos, equipe e registros dos outros (cada
# tentativa na auditoria); o silêncio do chat com os tetos (1 hora, 10 dias, 30 dias) e a hierarquia, valendo na hora nas salas
# e no bilhete; banir, advertir, tirar da sala, trocar o nome, notas, tirar punição, punidos; e o Dono (carteira, verificado,
# registros com filtro, resumo, equipe, 2FA, sessões, permissões); ~5 s. O v109_silencio_salas (Node, na memória) o silêncio em
# cada chat das salas (Brasil, sala, equipe, amigos, clube, falas, emojis), o bilhete de antes/depois, a sessão e a expulsão; < 1 s.
printf '%-12s ' "v109_servidor"
if out=$(node tests/v109_painel_servidor_test.mjs 2>&1); then echo "$out" | tail -1; else falhou=1; echo "$out" | grep -E 'FALHOU' | head -4; echo "$out" | tail -1; fi
printf '%-12s ' "v109_salas"
if out=$(node tests/v109_silencio_salas_test.js 2>&1); then echo "$out" | tail -1; else falhou=1; echo "$out" | grep -E 'FALHOU' | head -4; echo "$out" | tail -1; fi
# v105: O CHAT NA TELA DO LOBBY. O v105_chat_lobby (Python; a plataforma de teste e dois navegadores na parte 6) a barra do chat
# da partida de volta à tela inicial: o lugar em 10 tamanhos sem encostar em nenhum botão, tocar abre e minimizar volta, sem
# servidor/desligada/fora do ar, na partida, nada por quadro e o Chat do Brasil de verdade entre duas contas (o VER PERFIL por cima).
# v105: AS TAMPINHAS CRIADAS NA CONTA E A BORDA BOTÃO PARA TODO MUNDO (ver o tools/v105/cosmeticos.js). O v105_cosmeticos (Python;
# a parte da conta sobe a plataforma de teste) a criada com a BOTÃO e com a cara animada continuando ao abrir o jogo de novo, a
# borda de fábrica com a BOTÃO, o aro chapado medido nos pixels, as tampinhas juntando no QUAL PROGRESSO FICA? e, com a conta, a
# cópia indo logo, o SAIR que manda antes de sair, o mesmo navegador e um navegador novo; ~2 min.
# v105: O TAMANHO DA BORDA (tools/v105/borda.js): o v105_borda confere o código (vai e volta; a NORMAL igual à de antes; o jogo
# de antes lê a mesma tampinha), os pixels de cada tamanho (a BOTÃO, a de dentes, a cara animada, sem borda), o editor e o
# servidor; ~30 s.
# v106: AS BOLAS E AS MASCOTES (tools/v106/): o v106_conteudo confere as peças no fim das listas (os códigos de sempre iguais aos
# do master), as 6 mascotes e as 6 bolas desenhadas (diferentes, nada fora do círculo, nítidas em 40 px, girando), o catálogo,
# as peças só para quem tem e, na plataforma de teste, comprar e equipar uma mascote e uma bola pela conta com as prontas
# escondidas, entrar de novo e a partida; ~1,5 min.
# v106: OS EMOJIS DA PARTIDA (tools/v106/emotes.js e server/emotes106.js): o v106_emotes confere os 20 emojis desenhados (nada
# fora do balão, cada um diferente), a cruz dos 5 e a gravação (e a cópia da conta), o botão e a cruz em 6 tamanhos sem cobrir
# nada, o balão em cima da tampinha (seguindo, sumindo, o pop, o intervalo, os bots), a chave dos Ajustes, o teclado, o online
# com duas sessões e o servidor (roda o tests/v106_emotes_servidor_test.js: a lista, o ritmo, quem joga, o bloqueio); ~4 min.
# v106: O COFRE NO ESTILO DAS FOTOS (tools/v106/cofre.js): o v106_cofre (Python; a parte da conta sobe a plataforma de teste e dois
# navegadores) as 6 abas e o pedestal de cada uma, os caminhos de sempre abrindo o COFRE novo, o CRIAR PERSONALIZADO, equipar (a
# tampinha salva, o emoji da tampinha, a bola), a ★ da RODA, a tampinha à venda que aparece sozinha, o cadeado e a janelinha de
# compra (sem conta, na demonstração e com a conta no servidor), a cruz dos emojis com uma API falsa, o escudo (sem clube, o
# pessoal, o da conta com o dono e com o membro) e tudo cabendo de 568×320 a 1920×1080 e no iPhone com o entalhe; ~2 min.
# v107: O PERFIL PELO NOME (tools/v107/perfil.js): o v107_perfil (Python; a plataforma de teste e três navegadores logados, ninguém
# amigo de ninguém) a janelinha colada no nome com PERFIL, CONVIDAR e DENUNCIAR (no painel, no 844 × 390 com e sem a área segura do
# iPhone e na tela inteira do Chat do Brasil; fecha tocando fora e no Esc), o PERFIL com os números e o ADICIONAR (no lobby, na
# sala e por cima da partida), o seu nome e quem não tem conta, a denúncia com o motivo indo para o banco, o convite pelo chat
# para quem não é amigo (chega, e o ENTRAR põe na sala), o cartão da sala (a janelinha com o PERFIL; a ficha do árbitro com o VER
# PERFIL), o painel dos jogadores da partida e sem estar na conta; ~5 min.
# v107: O ÁRBITRO ARRASTANDO NA SALA E NA PARTIDA (tools/v107/painel.js): o v107_painel (Python; a plataforma de teste e três
# navegadores, os arrastos com o mouse e com o dedo de verdade) na sala o cartão para o outro time, para o banco, para a VAGA
# LIVRE e em cima de outro (troca) — a cópia com a etiqueta, o lugar que acende e os três vendo —, quem não é o árbitro sem
# arrastar, o tocar que abre a ficha, na partida o painel arrastando sem segurar (com o dedo para o banco, com o mouse para a
# vaga) e a faixa "fulano foi para o TIME B" para os três, o toque no painel chegando como toque e a partida seguindo; ~1,5 min.
# v107: OS GESTOS DO EMOJI E DAS FALAS (tools/v107/gestos.js): o v107_gestos (Python; o toque de verdade pelo CDP) arrastar para os
# 5 lados nos dois botões (o balão certo em cima da tampinha), o X e o toque cancelado que não mandam nada, o toque rápido de
# sempre, dois dedos (o analógico andando com um e o emoji com o outro; o PASSE no meio), o mouse, o ritmo, as peças em 6 tamanhos
# sem cobrir nada, a cruz das frases (racha-falas-v107 na cópia da conta e o COFRE › EMOJI › FRASES), o Reduzir animações e o online
# com duas sessões; ~9 min.
# v107: O ANEL DO CHUTE BEM BRANCO (tools/v107/chute.js): o v107_chute (Python) o V95S.luz em 1 e a imagem do anel aceso
# opaca, os pixels do anel na partida segurando o CHUTE (quase branco) e o PASSE, o soltar e a Oficina com o mesmo branco; ~15 s.
# v108: O ONLINE SEM CÂMERA LENTA (tools/v108/lento.js): o v108_lento (Python; o servidor das salas e o 4G de mentira) a internet
# da Ana sumindo por 2 s, num 1v1 e num 4v4 contra bots com a CPU 5× mais lenta, antes (lento108: false e o servidor como na
# v107; ou RACHA_ANTES=<pasta> com outra cópia montada) e agora: antes a câmera lenta (a mola sumindo no teto da v96, o atraso
# acumulado de 70 px·s ou mais) e os comandos recusados; agora a correção some sozinha (até 1,3 s e 65 px·s), nada recusado e o
# jogo normal igual; ~3 min.
# v109: OS DOIS PAINÉIS NO NAVEGADOR (tests/v109_painel_test.py; as páginas de verdade do RACHA CONTROL com a plataforma de
# teste): o 2FA pelo QR code (lido pelo OpenCV), o Dono e o Moderador em cada painel, silenciar pelo painel, os registros e a
# visão geral do Dono, dar o verificado e moedas, resetar o 2FA, o aviso do silêncio no jogo e o painel no celular; ~20 s.
for t in v105_chat_lobby v105_cosmeticos v105_borda v106_conteudo v106_emotes v106_cofre v107_perfil v107_painel v107_gestos v107_chute v108_lento v109_painel; do
  printf '%-12s ' "$t"
  if out=$(python3 "tests/${t}_test.py" 2>&1); then echo "$out" | grep -E 'verificações ok' | tail -1; else falhou=1; echo "$out" | grep -E 'verificações ok|FALHOU|Error' | tail -6; fi
done
# v92: os dois ZIPs prontos (o oficial sem o painel; o de testes com ele) servidos pelo node server.js, como num servidor
# (v100: e o do lançamento, --lancamento: sem o presente de teste; nenhum dos três com segredo, banco, chave ou pacote)
printf '%-12s ' "v92_pacote"
tmpz=$(mktemp -d)
if out=$(python3 tools/v92/pacote.py --producao "$tmpz/oficial.zip" >/dev/null 2>&1 && python3 tools/v92/pacote.py "$tmpz/testes.zip" >/dev/null 2>&1 && python3 tools/v92/pacote.py --lancamento "$tmpz/lancamento.zip" >/dev/null 2>&1 && python3 tests/v92_pacote_test.py "$tmpz/oficial.zip" "$tmpz/testes.zip" "$tmpz/lancamento.zip" 2>&1); then echo "$out" | grep -E 'verificações ok' | tail -1; else falhou=1; echo "$out" | grep -E 'verificações ok|FALHOU|Error' | tail -6; fi
rm -rf "$tmpz"
exit $falhou
