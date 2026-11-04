"""RACHA v104 · o correio de verdade, o árbitro arrastando no painel dos jogadores e a tela inteira só com o jogo
(aplicada depois da v103/tela).
O pedido (04/11/2026), com o jogo já na VPS nova: "quero o nome dos jogadores assim quando clicar ali [o painel do botão das
pessoas]; se eu segurar um jogador posso afastar ele pra reserva e o reserva para algum time — o árbitro da partida consegue
fazer isso; o correio ainda não funciona; o ranking dos jogadores também não; a tela cheia ainda fica com umas bordas
estranhas, meio bugadas — quero tela cheia sem bordas meio transparentes, totalmente, só o jogo".
- tools/v104/painel.js: a VAGA LIVRE no painel dos jogadores e o árbitro segurando e arrastando (banco, vaga, troca, time);
- tools/v104/tela_inteira.js: o canvas do jogo cobre a tela toda (a área de sempre do HUD no mesmo lugar) e a moldura da
  v103 sai;
- tools/v104/ranking.js: o RANKING abre na primeira categoria que tem gente (a aba de PONTOS RANQUEADOS vazia parecia quebra);
- (o correio é no tools/v84/login_cedo.js: sem entrada, o jogo manda o "undefined" do superjson — o servidor de verdade
  recusava o null puro.)
Nada no bloco PHYS muda (o build confere o sha da física)."""
import pathlib
AQUI = pathlib.Path(__file__).resolve().parent
RAIZ = AQUI.parent.parent
SUBS = []
SUBS_PHYS = []

CSS = RAIZ / 'app' / 'public' / 'game' / 'v104.css'
if CSS.exists():
    SUBS.append(('<link rel="stylesheet" href="./v103-controles.css">\n', '<link rel="stylesheet" href="./v103-controles.css">\n<link rel="stylesheet" href="./v104.css">\n'))

ARQUIVOS = [n for n in ('painel.js', 'tela_inteira.js', 'ranking.js') if (AQUI / n).exists()]
assert ARQUIVOS == ['painel.js', 'tela_inteira.js', 'ranking.js'], 'faltam arquivos da v104: ' + ', '.join(ARQUIVOS)
CODIGO = '\n'.join('/* ---------------------------------------------------------------- tools/v104/' + n + ' */\n' + (AQUI / n).read_text(encoding='utf-8') for n in ARQUIVOS)
assert '</script' not in CODIGO.lower(), 'o código da v104 não pode ter </script'
SUBS.append(('\nmontaAbas();\nif (onbPrecisa()) onbAbre();',
             '\n/* ======================================================================= RACHA v104 (tools/v104/*.js) */\n' + CODIGO
             + '\nmontaAbas();\nif (onbPrecisa()) onbAbre();'))
