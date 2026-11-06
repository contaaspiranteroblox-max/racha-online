"""RACHA v110 · O BOTÃO DE METAL E AS SOMBRAS (aplicada por último, depois da v109/silencio).
O pedido (06/11/2026), com as imagens de dois botões (azul e vermelho, a listra branca no meio): "deixe o jogo parecido com
essas skins, as sombras etc." — em todas as peças, com as cores dos times de agora.
- tools/v110/botao.js: a BOTÃO (a borda de todo mundo) com o aro de metal, o sulco e o desenho afundado (a sombra por dentro e
  o degradê de cima para baixo), medidos nas imagens; e a mesma sombra no desenho das tampinhas com as outras bordas e sem
  borda (as bordas escolhidas continuam as delas). Troca o v102Aro e o v102Botao (os da v105) e embrulha o tpTampa.
Nada no bloco PHYS muda (o build confere o sha da física): é só a pintura das imagens prontas das tampinhas."""
import pathlib
AQUI = pathlib.Path(__file__).resolve().parent
SUBS = []
SUBS_PHYS = []
ARQUIVOS = [n for n in ('botao.js',) if (AQUI / n).exists()]
assert ARQUIVOS == ['botao.js'], 'falta tools/v110/botao.js'
CODIGO = '\n'.join('/* ---------------------------------------------------------------- tools/v110/' + n + ' */\n' + (AQUI / n).read_text(encoding='utf-8') for n in ARQUIVOS)
assert '</script' not in CODIGO.lower(), 'o código da v110 não pode ter </script'
SUBS.append(('\nmontaAbas();\nif (onbPrecisa()) onbAbre();',
             '\n/* ======================================================================= RACHA v110 · o botão de metal e as sombras (tools/v110/botao.js) */\n' + CODIGO
             + '\nmontaAbas();\nif (onbPrecisa()) onbAbre();'))
