"""RACHA v101 · O LOBBY NOVO NO ESTILO DA IMAGEM E SÓ O CRIAR TAMPINHA (aplicada por último, depois da v100).
O pedido (30/10/2026), com a imagem da tela inicial à noite: "reformule o jogo neste estilo, tire todas as skins e deixe
apenas o criar skins por enquanto".
- a arte nova, desenhada em código (tools/v101/arte: a quadra da quebrada no pôr do sol, com o Cristo, a favela acesa, o
  grafite RACHA, o bar e o chão molhado; os ícones com volume; a ilustração do cartão da OFICINA) — sem imagem gerada por IA,
  como pedido na v95;
- o lobby da imagem (tools/v101/lobby.js + app/public/game/v101.css): o fundo cobrindo a tela toda, os cartões flutuando em
  cima (o perfil com o ID e a bandeira, a patente com os pontos, as moedas, as gemas, os botões e o sinal), as colunas dos
  lados em botões baixos (o ícone e o nome), o cartão dourado da OFICINA, a tampinha menor com a luz roxa e o reflexo no chão
  molhado, as três vagas do grupo (+) e a fileira de baixo (o PASSE, as MISSÕES, o campo, o modo e o JOGAR);
- as outras telas no mesmo estilo (o v101.css: os painéis escuros com o contorno fino, as abas e os botões);
- as tampinhas prontas escondidas (tools/v101/semskins.js): fica só o CRIAR TAMPINHA (o editor), com um interruptor para
  religar (V101_SKINS_PRONTAS).
Nada no bloco PHYS muda (o build confere o sha da física); a partida, os controles e a rede são os de sempre."""
import base64, json, pathlib, re, sys
AQUI = pathlib.Path(__file__).resolve().parent
RAIZ = AQUI.parent.parent
ARTE = AQUI / 'arte'
SUBS = []
SUBS_PHYS = []

# ---- o estilo da v101 depois de todos (depois do da v99, o último)
CSS = RAIZ / 'app' / 'public' / 'game' / 'v101.css'
if CSS.exists():
    SUBS.append(('<link rel="stylesheet" href="./v99.css">\n', '<link rel="stylesheet" href="./v99.css">\n<link rel="stylesheet" href="./v101.css">\n'))


def _uri(p, tipo='image/webp'):
    return 'data:%s;base64,%s' % (tipo, base64.b64encode(p.read_bytes()).decode('ascii'))


# ---- as peças embutidas: o fundo (e o das telas), o lugar da tampinha nele e a ilustração da OFICINA
pre = []
if (ARTE / 'fundo.webp').exists() and (ARTE / 'fundo.json').exists():
    info = json.loads((ARTE / 'fundo.json').read_text(encoding='utf-8'))
    pre.append('const V101_FUNDO = {src:"%s", telas:%s, info:%s};' % (
        _uri(ARTE / 'fundo.webp'),
        json.dumps(_uri(ARTE / 'fundo_telas.webp')) if (ARTE / 'fundo_telas.webp').exists() else 'null',
        json.dumps(info, separators=(',', ':'))))
else:
    pre.append('const V101_FUNDO = null;')
pre.append('const V101_OFICINA = %s;' % (json.dumps(_uri(ARTE / 'oficina.webp')) if (ARTE / 'oficina.webp').exists() else 'null'))

# ---- os ícones (o sprite v91i-*: a tela inicial e as telas) no desenho da v101 — os mesmos nomes e mais os novos
if (ARTE / 'sprite.py').exists():
    def _sprite_js(svg):
        svg = re.sub(r'<!--.*?-->', '', svg, flags=re.S)
        svg = re.sub(r'>\s+<', '><', svg).strip()
        return 'const V91_SPRITE = ' + json.dumps(svg, ensure_ascii=False) + ';'
    sys.path.insert(0, str(RAIZ / 'tools' / 'v95' / 'arte'))
    import importlib.util as _iu
    _e95 = _iu.spec_from_file_location('sprite95', RAIZ / 'tools' / 'v95' / 'arte' / 'sprite.py'); _m95 = _iu.module_from_spec(_e95); _e95.loader.exec_module(_m95)
    sys.path.insert(0, str(ARTE))
    _e101 = _iu.spec_from_file_location('sprite101', ARTE / 'sprite.py'); _m101 = _iu.module_from_spec(_e101); _e101.loader.exec_module(_m101)
    SUBS.append((_sprite_js(_m95.svg_sprite()), _sprite_js(_m101.svg_sprite())))

# ---- a sua tampinha: uma PRONTA equipada vale a inicial enquanto as prontas estiverem fora (tools/v101/semskins.js). O tpMinha
#      é chamado antes de a v101 rodar (o perfil, no começo): o v101Esconde é uma function (içada) que responde "não" até o fim
#      do semskins.js — nada é apagado: a equipada continua guardada e volta sozinha se as prontas voltarem
SUBS.append(("const tpMinha = () => TP.equipada || TP_PADRAO_COD;",
             "const tpMinha = () => (TP.equipada && !(typeof v101Esconde === 'function' && v101Esconde(TP.equipada)) ? TP.equipada : '') || TP_PADRAO_COD;   /* v101: a pronta vale a inicial (as prontas fora) */"))

ARQUIVOS = [n for n in ('lobby.js', 'semskins.js', 'telas.js') if (AQUI / n).exists()]
assert 'lobby.js' in ARQUIVOS, 'falta tools/v101/lobby.js'
CODIGO = '\n'.join(pre) + '\n' + '\n'.join('/* ---------------------------------------------------------------- tools/v101/' + n + ' */\n' + (AQUI / n).read_text(encoding='utf-8') for n in ARQUIVOS)
assert '</script' not in CODIGO.lower(), 'o código da v101 não pode ter </script'
SUBS.append(('\nmontaAbas();\nif (onbPrecisa()) onbAbre();',
             '\n/* ======================================================================= RACHA v101 (tools/v101/*.js) */\n' + CODIGO
             + '\nmontaAbas();\nif (onbPrecisa()) onbAbre();'))
