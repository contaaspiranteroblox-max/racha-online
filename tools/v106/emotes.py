"""RACHA v106 · OS EMOJIS DA PARTIDA (aplicada por último, depois da v105/borda).
O pedido (05/11/2026): "crie emojis e um balão para emoji na partida" (com a foto da aba Emoji de outro jogo: as carinhas laranja
dentro de um balão de fala branco e a cruz com os 5 lugares — de lá vem só a ideia; os desenhos são daqui, em código).
- tools/v106/emotes.js: os 20 emojis desenhados no canvas (as carinhas no balão branco com a pontinha; prontos numa imagem por
  tamanho), a cruz dos 5 rápidos (cima, esquerda, meio, direita, baixo; guardada em racha-emotes-v106, que vai na cópia do
  progresso da conta: tools/v82/inicio.js e app/contracts/progresso.ts), o botão do emoji do lado do placar, o balão em cima
  da tampinha (no canvas do jogo, do tamanho da tampinha na câmera, com o "pop"; sem ele com Reduzir animações), a espera
  entre um e outro, o E e o 1 a 5 no teclado, o online (emote {e}: server/emotes106.js), os emojis dos outros nos Ajustes ›
  Visual, os bots depois do gol (às vezes) e a API do COFRE (window.RachaEmotes106);
- app/public/game/v106-emotes.css: o botão (a cara do das falas), a espera no botão e a cruz.
Nada no bloco PHYS muda (o build confere o sha da física)."""
import pathlib
AQUI = pathlib.Path(__file__).resolve().parent
RAIZ = AQUI.parent.parent
SUBS = []
SUBS_PHYS = []

# ---- o estilo da v106 depois do da v105 (o chat no lobby)
CSS = RAIZ / 'app' / 'public' / 'game' / 'v106-emotes.css'
assert CSS.exists(), 'falta app/public/game/v106-emotes.css'
SUBS.append(('<link rel="stylesheet" href="./v105-chat.css">\n', '<link rel="stylesheet" href="./v105-chat.css">\n<link rel="stylesheet" href="./v106-emotes.css">\n'))

ARQUIVOS = [n for n in ('emotes.js',) if (AQUI / n).exists()]
assert ARQUIVOS == ['emotes.js'], 'falta tools/v106/emotes.js'
CODIGO = '\n'.join('/* ---------------------------------------------------------------- tools/v106/' + n + ' */\n' + (AQUI / n).read_text(encoding='utf-8') for n in ARQUIVOS)
assert '</script' not in CODIGO.lower(), 'o código da v106 não pode ter </script'
SUBS.append(('\nmontaAbas();\nif (onbPrecisa()) onbAbre();',
             '\n/* ======================================================================= RACHA v106 · os emojis da partida (tools/v106/emotes.js) */\n' + CODIGO
             + '\nmontaAbas();\nif (onbPrecisa()) onbAbre();'))
