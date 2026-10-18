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
cd "$(dirname "$0")/.." || exit 1
python3 tools/aplicar_rua.py | head -1 || exit 1
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
for t in v88_cliente v88_controle v881_painel v881_jogo; do
  printf '%-12s ' "$t"
  if out=$(python3 "tests/${t}_test.py" 2>&1); then echo "$out" | grep -E 'verificações ok' | tail -1; else falhou=1; echo "$out" | grep -E 'verificações ok|FALHOU|Error' | tail -6; fi
done
exit $falhou
