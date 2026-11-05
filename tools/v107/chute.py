"""RACHA v107 · O ANEL DO CHUTE BEM BRANCO (aplicado por último).
O pedido (05/11/2026): "quando o jogador chuta, o arco ao redor deve ficar bem branco: a opacidade do chute tá muito fraca".
- tools/v107/chute.js: o V95S.luz volta a 1 (a v96 tinha deixado em 0,3) e o anel aceso da partida fica com o branco opaco (o
  v95SpriteBrancoDe com a imagem nova);
- a Oficina desenha o anel aceso por conta própria (tools/oficina/desenho.js): a troca abaixo deixa o branco de lá opaco também.
Só o desenho: nada no bloco PHYS muda (o build confere o sha da física)."""
import pathlib
AQUI = pathlib.Path(__file__).resolve().parent
SUBS = []
SUBS_PHYS = []

# ---- a Oficina: o anel aceso com o branco opaco (era .84), como o da partida
SUBS.append(("g.fillStyle = 'rgba(255,255,255,.84)'; g.fill(); g.restore();\n    g.lineWidth = w * 1.2;",
             "g.fillStyle = '#ffffff'; g.fill(); g.restore();   // (v107: o branco opaco)\n    g.lineWidth = w * 1.2;"))

ARQUIVOS = [n for n in ('chute.js',) if (AQUI / n).exists()]
assert ARQUIVOS == ['chute.js'], 'falta tools/v107/chute.js'
CODIGO = '\n'.join('/* ---------------------------------------------------------------- tools/v107/' + n + ' */\n' + (AQUI / n).read_text(encoding='utf-8') for n in ARQUIVOS)
assert '</script' not in CODIGO.lower(), 'o código da v107 não pode ter </script'
SUBS.append(('\nmontaAbas();\nif (onbPrecisa()) onbAbre();',
             '\n/* ======================================================================= RACHA v107 · o anel do chute bem branco (tools/v107/chute.js) */\n' + CODIGO
             + '\nmontaAbas();\nif (onbPrecisa()) onbAbre();'))
