"""RACHA v106 · o COFRE no estilo das fotos (aplicado por último, depois do tamanho da borda da v105).
O pedido (05/11/2026): "quero o cofre nesse estilo das foto" (as 5 capturas eram de outro jogo: só o jeito — o layout, as abas,
o pedestal, os cartões bege, o cadeado, o check e o roxo do criar; o fundo e todos os desenhos são os do RACHA).
- tools/v106/cofre.js: a mesma tela 'cofre' da v90 (o V90CF) com o render e o abre trocados por cima — a peça escolhida
  grande no pedestal à esquerda (com o botão em cima e a placa do nome embaixo), as abas CARTÕES · SKIN · EMOJI · ESCUDO DO
  CLUBE · BOLA · MAIS na barra escura e a grade de cartões bege (o cadeado e o preço no que não é seu, o check verde no
  equipado, a raridade numa faixinha); tocar no seu equipa na hora, tocar no bloqueado abre a janelinha com o preço e o
  COMPRAR (a compra da loja). O v90AbreCofre(cat) leva a categoria antiga para a aba nova (o atalho do lobby, a tampinha
  grande e a RODA continuam abrindo o COFRE);
- app/public/game/v106-cofre.css: o desenho (os tamanhos no palco de 888 de altura: cabe do 568 × 320 ao 1920 × 1080; só a
  grade rola).
Nada no bloco PHYS muda (o build confere o sha da física)."""
import pathlib
AQUI = pathlib.Path(__file__).resolve().parent
RAIZ = AQUI.parent.parent
SUBS = []
SUBS_PHYS = []

# ---- o estilo da v106 depois do chat da v105 (o último link de estilo)
CSS = RAIZ / 'app' / 'public' / 'game' / 'v106-cofre.css'
assert CSS.exists(), 'falta app/public/game/v106-cofre.css'
SUBS.append(('<link rel="stylesheet" href="./v105-chat.css">\n', '<link rel="stylesheet" href="./v105-chat.css">\n<link rel="stylesheet" href="./v106-cofre.css">\n'))

ARQUIVOS = [n for n in ('cofre.js',) if (AQUI / n).exists()]
assert ARQUIVOS == ['cofre.js'], 'falta tools/v106/cofre.js'
CODIGO = '\n'.join('/* ---------------------------------------------------------------- tools/v106/' + n + ' */\n' + (AQUI / n).read_text(encoding='utf-8') for n in ARQUIVOS)
assert '</script' not in CODIGO.lower(), 'o código da v106 não pode ter </script'
SUBS.append(('\nmontaAbas();\nif (onbPrecisa()) onbAbre();',
             '\n/* ======================================================================= RACHA v106 · o COFRE no estilo das fotos (tools/v106/cofre.js) */\n' + CODIGO
             + '\nmontaAbas();\nif (onbPrecisa()) onbAbre();'))
