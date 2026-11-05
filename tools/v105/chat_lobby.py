"""RACHA v105 · o chat na tela do lobby (aplicada depois da v104).
O pedido (04/11/2026): "quero um chat visível na tela do lobby igual o dentro da partida lá em baixo".
- tools/v105/chat_lobby.js: a barra do chat da v81 (a mesma da partida: a etiqueta, NOME: a última mensagem, as não lidas e o
  ^) de volta à tela inicial, com o Chat do Brasil — embaixo, no vão entre a barra de atalhos e o JOGAR, embaixo da tampinha
  (nos apertados, como o iPhone com o entalhe e o 800 × 336, logo em cima da barra de atalhos; sem lugar, não aparece),
  medida só quando o lobby muda de tamanho (nada por quadro); tocar abre o painel de sempre (as mensagens, o campo e o
  ENVIAR; o nome abre a ficha com o VER PERFIL) e a janela que abre por cima do lobby fecha o painel antes;
- app/public/game/v105-chat.css: a cara da barra da partida no lobby (o grafite meio transparente) e o tamanho no celular.
Sem servidor (ou com a chave "Chat na tela" desligada) a barra não aparece, como antes. Nada no bloco PHYS muda (o build
confere o sha da física)."""
import pathlib
AQUI = pathlib.Path(__file__).resolve().parent
RAIZ = AQUI.parent.parent
SUBS = []
SUBS_PHYS = []

# ---- o estilo da v105 depois do da v104 (o último)
CSS = RAIZ / 'app' / 'public' / 'game' / 'v105-chat.css'
assert CSS.exists(), 'falta app/public/game/v105-chat.css'
SUBS.append(('<link rel="stylesheet" href="./v104.css">\n', '<link rel="stylesheet" href="./v104.css">\n<link rel="stylesheet" href="./v105-chat.css">\n'))

ARQUIVOS = [n for n in ('chat_lobby.js',) if (AQUI / n).exists()]
assert ARQUIVOS == ['chat_lobby.js'], 'falta tools/v105/chat_lobby.js'
CODIGO = '\n'.join('/* ---------------------------------------------------------------- tools/v105/' + n + ' */\n' + (AQUI / n).read_text(encoding='utf-8') for n in ARQUIVOS)
assert '</script' not in CODIGO.lower(), 'o código da v105 não pode ter </script'
SUBS.append(('\nmontaAbas();\nif (onbPrecisa()) onbAbre();',
             '\n/* ======================================================================= RACHA v105 · chat no lobby (tools/v105/chat_lobby.js) */\n' + CODIGO
             + '\nmontaAbas();\nif (onbPrecisa()) onbAbre();'))
