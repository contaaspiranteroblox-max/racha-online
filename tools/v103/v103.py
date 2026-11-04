"""RACHA v103 · o lobby de dia, as salas personalizadas sem bots, a ranqueada, o perfil pelo chat e os sons do online
(aplicada depois da v102; os controles e a tela cheia têm as etapas deles: v103/controles e v103/tela).
O pedido (03/11/2026), com a imagem da quadra de grama do Bar do Seu Zé: "use esta imagem de fundo (...), tire os bots das
salas personalizadas e quando alguém quita fica com um a menos, não bote bot no lugar, crie uma função de poder pôr pessoas
nas salas sem reiniciar a sala e deixe mais clean as configurações de árbitros, mais funcional e simples (...), deixe a
ranqueada e o ranking funcional, poder clicar no perfil dos players pelo chat, sons no online está bugado, aumentar bem pouco
a força do chute e do passe (...)".
- o fundo: o V101_FUNDO (o fundo da tela inicial e o das telas, desenhados em código na v101) vira a imagem enviada
  (tools/v103/arte: fundo_dia.webp, fundo_dia_telas.webp — a mesma cena desfocada — e fundo_dia.json, o lugar da tampinha no
  círculo do meio); a tampinha do meio de dia (tools/v103/lobby_dia.js);
- o CHUTE uns 6% mais forte mora no núcleo (server/partida/nucleo.js: o PERFIL_V92, o mesmo arquivo do servidor e do jogo —
  o build cola o núcleo no jogo pela v92); nada aqui mexe no bloco PHYS (o build confere o sha da física)."""
import base64, json, pathlib
AQUI = pathlib.Path(__file__).resolve().parent
RAIZ = AQUI.parent.parent
ARTE101 = RAIZ / 'tools' / 'v101' / 'arte'
ARTE = AQUI / 'arte'
SUBS = []
SUBS_PHYS = []

# ---- o estilo da v103 depois do da v102
CSS = RAIZ / 'app' / 'public' / 'game' / 'v103.css'
if CSS.exists():
    SUBS.append(('<link rel="stylesheet" href="./v102.css">\n', '<link rel="stylesheet" href="./v102.css">\n<link rel="stylesheet" href="./v103.css">\n'))


def _uri(p, tipo='image/webp'):
    return 'data:%s;base64,%s' % (tipo, base64.b64encode(p.read_bytes()).decode('ascii'))


def _fundo(webp, telas, info):
    # (o mesmo formato da linha que a v101 escreve: tools/v101/v101.py)
    return 'const V101_FUNDO = {src:"%s", telas:%s, info:%s};' % (
        _uri(webp), json.dumps(_uri(telas)) if telas.exists() else 'null', json.dumps(info, separators=(',', ':')))


# ---- o fundo de dia no lugar do da noite (a linha inteira da v101 é trocada: a imagem da noite não fica no jogo à toa)
if (ARTE / 'fundo_dia.webp').exists() and (ARTE101 / 'fundo.webp').exists():
    antes = _fundo(ARTE101 / 'fundo.webp', ARTE101 / 'fundo_telas.webp', json.loads((ARTE101 / 'fundo.json').read_text(encoding='utf-8')))
    depois = _fundo(ARTE / 'fundo_dia.webp', ARTE / 'fundo_dia_telas.webp', json.loads((ARTE / 'fundo_dia.json').read_text(encoding='utf-8')))
    SUBS.append((antes, depois))

ARQUIVOS = [n for n in ('lobby_dia.js', 'salas.js', 'arbitro.js', 'ranqueada.js', 'chat_perfil.js', 'sons.js') if (AQUI / n).exists()]
assert 'lobby_dia.js' in ARQUIVOS, 'falta tools/v103/lobby_dia.js'
CODIGO = '\n'.join('/* ---------------------------------------------------------------- tools/v103/' + n + ' */\n' + (AQUI / n).read_text(encoding='utf-8') for n in ARQUIVOS)
assert '</script' not in CODIGO.lower(), 'o código da v103 não pode ter </script'
SUBS.append(('\nmontaAbas();\nif (onbPrecisa()) onbAbre();',
             '\n/* ======================================================================= RACHA v103 (tools/v103/*.js) */\n' + CODIGO
             + '\nmontaAbas();\nif (onbPrecisa()) onbAbre();'))
