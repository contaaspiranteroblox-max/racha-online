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
for t in v96_rede_test.mjs v96_fundador_test.mjs; do
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
# v92: os dois ZIPs prontos (o oficial sem o painel; o de testes com ele) servidos pelo node server.js, como num servidor
# (v100: e o do lançamento, --lancamento: sem o presente de teste; nenhum dos três com segredo, banco, chave ou pacote)
printf '%-12s ' "v92_pacote"
tmpz=$(mktemp -d)
if out=$(python3 tools/v92/pacote.py --producao "$tmpz/oficial.zip" >/dev/null 2>&1 && python3 tools/v92/pacote.py "$tmpz/testes.zip" >/dev/null 2>&1 && python3 tools/v92/pacote.py --lancamento "$tmpz/lancamento.zip" >/dev/null 2>&1 && python3 tests/v92_pacote_test.py "$tmpz/oficial.zip" "$tmpz/testes.zip" "$tmpz/lancamento.zip" 2>&1); then echo "$out" | grep -E 'verificações ok' | tail -1; else falhou=1; echo "$out" | grep -E 'verificações ok|FALHOU|Error' | tail -6; fi
rm -rf "$tmpz"
exit $falhou
