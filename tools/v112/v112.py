"""RACHA v112 · O ONLINE TÃO LISO QUANTO O TREINO (aplicada por último, depois da v110/botao; a v111 enxuga depois de todas).
O pedido (07/11/2026): "No treino livre, a movimentação é fluida, mas nas salas online os jogadores apresentam travamentos,
quedas de FPS, movimentos bruscos e teletransportes" — primeiro achar as causas no código, depois corrigir e medir.
- tools/v112/tela.js: o que pesava só no quadro da partida online (o hidden e o texto da barra da sala escritos de novo a
  cada quadro — o observador das janelas da v70 refazia a busca e o navegador o layout —, a barra rodando duas vezes por
  quadro e o endereço do servidor recalculado a cada quadro);
- tools/v112/diag.js: o medidor da partida (FPS e quedas, o tempo do quadro, ping, variação, perda, as correções e a
  divergência cliente × servidor, o tempo de confirmação dos comandos): window.RachaDiag e Ajustes › Visual;
- as trocas abaixo: o placar sem trocar a fonte nem medir o texto a cada quadro (a medida guardada, medeTxt) e a sala neste
  aparelho (o pacote da v99) com o colchão da fila (server/partida/colchao112.js, que o sala.js passou a usar), desligado
  nela (os comandos chegam do próprio aparelho: a fila fica como antes).
Nada no bloco PHYS muda (o build confere o sha da física)."""
import pathlib
AQUI = pathlib.Path(__file__).resolve().parent
RAIZ = AQUI.parent.parent
SUBS = []
SUBS_PHYS = []

# ---- 1) o placar (tools/v95/hud.js, e as duas versões de antes dele, da v70 e da v80, que ficaram no jogo): a faixa de baixo
#      media o texto com a fonte trocada a cada quadro
SUBS.append(("    g.save(); g.font = '24px ' + FONT; const lw = g.measureText(linha).width + 36;",
             "    g.save(); const lw = medeTxt(linha, '24px ' + FONT) + 36;   // (v112: a medida guardada — trocar a fonte e medir a cada quadro custava 10% da CPU)", 3))

# ---- 2) a sala neste aparelho (o pacote da v99): o colchão da fila vai junto com o sala.js (desligado: RACHA_COLCHAO=0)
def modulo(nome):
    t = (RAIZ / 'server' / 'partida' / nome).read_text(encoding='utf-8')
    assert '</script' not in t.lower(), nome
    return "(function () {\n  const module = { exports: {} }, exports = module.exports;\n" + t + "\n  return module.exports;\n})()"
SUBS.append(("MODS['./sala'] = (function () {\n",
             "MODS['./colchao112'] = " + modulo('colchao112.js') + ";   // (v112: o colchão da fila de comandos)\nMODS['./sala'] = (function () {\n"))
SUBS.append(("const process = { env: {}, hrtime() {",
             "const process = { env: { RACHA_COLCHAO: '0' }, hrtime() {"))

# ---- 3) o código da v112
ARQUIVOS = [n for n in ('tela.js', 'diag.js') if (AQUI / n).exists()]
assert ARQUIVOS == ['tela.js', 'diag.js'], 'falta tools/v112/tela.js ou tools/v112/diag.js'
CODIGO = '\n'.join('/* ---------------------------------------------------------------- tools/v112/' + n + ' */\n' + (AQUI / n).read_text(encoding='utf-8') for n in ARQUIVOS)
assert '</script' not in CODIGO.lower(), 'o código da v112 não pode ter </script'
SUBS.append(('\nmontaAbas();\nif (onbPrecisa()) onbAbre();',
             '\n/* ======================================================================= RACHA v112 · o online tão liso quanto o treino (tools/v112/*.js) */\n' + CODIGO
             + '\nmontaAbas();\nif (onbPrecisa()) onbAbre();'))
