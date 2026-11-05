"""RACHA v107 · ARRASTAR OS JOGADORES NA SALA E NA PARTIDA (aplicada por último, depois do COFRE da v106).
O pedido (05/11/2026): "No vídeo aparece o botão pausar, cartões e o dos players; nos players dá para arrastar o player para o
time ou reserva. Quero essa função no meio da partida e na sala quando cria, pois é mais prático arrastando." (o vídeo era de
outro jogo — as três colunas, o arrastar e a faixa de quem foi movido —: de lá vem só o jeito; os desenhos e os textos são daqui).
- tools/v107/painel.js: na SALA online (a do servidor), o árbitro aperta o cartão de alguém e arrasta (depois de 8 px: tocar sem
  mexer continua abrindo a ficha da v103) para o outro time, uma VAGA LIVRE, o cartão de outra pessoa (troca) ou QUEM ASSISTE (o
  banco) — a cópia do cartão vai com o dedo, o lugar embaixo acende e o soltar manda as mesmas ações da ficha (adm mover e
  reserva); na PARTIDA, o painel dos jogadores da v104 arrasta já com o movimento (sem o meio segundo; o segurar continua); e a
  FAIXA "fulano foi para o TIME B" / "... foi para o BANCO" para todo mundo da sala, a partir da linha que o servidor já manda;
- app/public/game/v107-painel.css: o cartão que o árbitro pega, os lugares que acendem, a cópia com a etiqueta e a faixa.
O servidor não muda (as ações são as da ficha). Nada no bloco PHYS muda (o build confere o sha da física)."""
import pathlib
AQUI = pathlib.Path(__file__).resolve().parent
RAIZ = AQUI.parent.parent
SUBS = []
SUBS_PHYS = []

# ---- o estilo da v107 depois do último da v106 (o dos emojis da partida)
CSS = RAIZ / 'app' / 'public' / 'game' / 'v107-painel.css'
assert CSS.exists(), 'falta app/public/game/v107-painel.css'
SUBS.append(('<link rel="stylesheet" href="./v106-emotes.css">\n', '<link rel="stylesheet" href="./v106-emotes.css">\n<link rel="stylesheet" href="./v107-painel.css">\n'))

ARQUIVOS = [n for n in ('painel.js',) if (AQUI / n).exists()]
assert ARQUIVOS == ['painel.js'], 'falta tools/v107/painel.js'
CODIGO = '\n'.join('/* ---------------------------------------------------------------- tools/v107/' + n + ' */\n' + (AQUI / n).read_text(encoding='utf-8') for n in ARQUIVOS)
assert '</script' not in CODIGO.lower(), 'o código da v107 não pode ter </script'
SUBS.append(('\nmontaAbas();\nif (onbPrecisa()) onbAbre();',
             '\n/* ======================================================================= RACHA v107 · arrastar os jogadores na sala e na partida (tools/v107/painel.js) */\n' + CODIGO
             + '\nmontaAbas();\nif (onbPrecisa()) onbAbre();'))
