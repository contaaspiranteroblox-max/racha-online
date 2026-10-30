"""RACHA v99 · OS CHUTES DO RACHÃO NAS SALAS PERSONALIZADAS (aplicada por último, depois da v98).
O pedido (29/10/2026): "crie um modo com cavadinha e curva igual do Rachão que dê pra jogar nas salas personalizadas; o cara
pode escolher sem nada, com cavadinha e curva, e super chute".
- a física é a do núcleo das salas (server/partida/nucleo.js, a parte v99 · OS CHUTES DO RACHÃO: a bola no alto, o travessão,
  a curva do Rachão e o super chute) — o MESMO arquivo que o build já cola no jogo (etapa v92) e que o servidor roda;
- a sala de FUTEBOL ganha a opção CHUTES (cavadinha, curva e super chute; nenhum = só o chutar, como sempre): no CRIAR SALA,
  no quadro de regras da sala e na lista (tools/v99/salas.js);
- os botões CAVADINHA, CURVA ↶, CURVA ↷ e SUPER entram no HUD de sempre (as trocas abaixo põem os quatro nas listas do HUD
  ANTES de o jogo ler o HUD guardado: o editor arrasta, os moldes e os layouts guardam), as teclas Q, Z, X e V no Teclado;
  o comando, a previsão, o desenho da bola no alto e o cartão de como joga ficam em tools/v99/chutes.js;
- a SALA NESTE APARELHO com os chutes joga com o motor das salas do servidor (server/partida/fisica.js, bot.js e sala.js,
  colados aqui num pacote — window.RachaSalaLocal): o que se testa sem servidor é exatamente o que o servidor roda.
Nada no bloco PHYS muda (o build confere o sha da física); a ranqueada e as salas sem os chutes são as de sempre."""
import pathlib
AQUI = pathlib.Path(__file__).resolve().parent
RAIZ = AQUI.parent.parent
SUBS = []
SUBS_PHYS = []

# ---- o estilo da v99 depois de todos (o último é o dos ajustes)
CSS = RAIZ / 'app' / 'public' / 'game' / 'v99.css'
if CSS.exists():
    SUBS.append(('<link rel="stylesheet" href="./ajustes.css">\n', '<link rel="stylesheet" href="./ajustes.css">\n<link rel="stylesheet" href="./v99.css">\n'))

# ---- os quatro botões nas listas do HUD (antes do carregar(): as posições guardadas voltam)
SUBS.append(("  reset: {r:46,  nome:'REINICIAR'}\n};",
             "  reset: {r:46,  nome:'REINICIAR'},\n"
             "  cav:   {r:82,  nome:'CAVADINHA'},                   // v99: os chutes do Rachão (só nas salas que ligam)\n"
             "  cve:   {r:76,  nome:'CURVA ESQUERDA'},\n"
             "  cvd:   {r:76,  nome:'CURVA DIREITA'},\n"
             "  sup:   {r:112, nome:'SUPER CHUTE'}\n};"))
SUBS.append(("  reset: {x:66,   y:66,  s:1, a:1}\n};",
             "  reset: {x:66,   y:66,  s:1, a:1},\n"
             "  cav:   {x:1440, y:215, s:1, a:1, oc:false},          // v99: acima do SUPER, do lado do PASSE\n"
             "  cve:   {x:1330, y:700, s:1, a:1, oc:false},          // v99: as duas curvas embaixo, do lado do CHUTE\n"
             "  cvd:   {x:1500, y:790, s:1, a:1, oc:false},\n"
             "  sup:   {x:1560, y:455, s:1, a:1, oc:false}           // v99: entre o PASSE e o CHUTE (o lugar da CURVA do COM CURVA)\n};"))
SUBS.append(("const ctlVis = {joy:1, kick:1, power:1, curva:1, finta:1, drible:1};",
             "const ctlVis = {joy:1, kick:1, power:1, curva:1, finta:1, drible:1, cav:1, cve:1, cvd:1, sup:1};   // v99: + os chutes do Rachão"))
SUBS.append(("const ORDEM_TOQUE = ['finta', 'curva', 'drible', 'power', 'kick', 'joy', 'reset'];",
             "const ORDEM_TOQUE = ['finta', 'curva', 'drible', 'cav', 'cve', 'cvd', 'sup', 'power', 'kick', 'joy', 'reset'];   // v99: + os chutes do Rachão"))
# ---- as teclas (Ajustes › Controles › Teclado): o carregamento de sempre já lê as escolhidas
SUBS.append(("['curva', 'CURVA — segure para carregar (COM CURVA)', ['KeyU', 'KeyI']], ",
             "['curva', 'CURVA — segure para carregar (COM CURVA)', ['KeyU', 'KeyI']], "
             "['cav', 'CAVADINHA (chutes do Rachão)', ['KeyQ']], ['cve', 'CURVA ESQUERDA (chutes do Rachão)', ['KeyZ']], "
             "['cvd', 'CURVA DIREITA (chutes do Rachão)', ['KeyX']], ['sup', 'SUPER CHUTE — segure e solte (chutes do Rachão)', ['KeyV']], "))

# ---- o motor das salas do servidor, num pacote para a sala neste aparelho (o núcleo já está na página: window.RachaNucleo)
def modulo(nome):
    t = (RAIZ / 'server' / 'partida' / nome).read_text(encoding='utf-8')
    assert '</script' not in t.lower(), nome
    return "(function () {\n  const module = { exports: {} }, exports = module.exports;\n" + t + "\n  return module.exports;\n})()"
PACOTE = ("/* ======================================================================= RACHA v99 · o motor das salas (server/partida) para a sala neste aparelho */\n"
          "window.RachaSalaLocal = (function () {\n'use strict';\n"
          "const process = { env: {}, hrtime() { const t = performance.now(), s = Math.floor(t / 1000); return [s, Math.round((t - s * 1000) * 1e6)]; } };\n"
          "const MODS = {}, require = n => { if (n in MODS) return MODS[n]; throw new Error('sala neste aparelho: ' + n + ' não existe aqui'); };\n"
          "MODS['./nucleo'] = window.RachaNucleo;\n"
          "MODS['./fisica'] = " + modulo('fisica.js') + ";\n"
          "MODS['./bot'] = " + modulo('bot.js') + ";\n"
          "MODS['./sala'] = " + modulo('sala.js') + ";\n"
          "return MODS['./sala'];\n})();\n")

ARQUIVOS = ['chutes.js', 'salas.js']
for n in ARQUIVOS:
    assert (AQUI / n).exists(), 'falta tools/v99/' + n
CODIGO = '\n'.join('/* ---------------------------------------------------------------- tools/v99/' + n + ' */\n' + (AQUI / n).read_text(encoding='utf-8') for n in ARQUIVOS)
assert '</script' not in CODIGO.lower(), 'o código da v99 não pode ter </script'
SUBS.append(('\nmontaAbas();\nif (onbPrecisa()) onbAbre();',
             '\n/* ======================================================================= RACHA v99 (tools/v99/*.js) */\n' + PACOTE + CODIGO
             + '\nmontaAbas();\nif (onbPrecisa()) onbAbre();'))
