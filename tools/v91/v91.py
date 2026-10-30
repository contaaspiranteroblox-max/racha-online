"""v91 (aplicado por último, depois da v90): O VISUAL DA IMAGEM DE REFERÊNCIA EM TODAS AS TELAS.
- o estilo em app/public/game/v91.css (depois do v90.css): a faixa azul de cima, os botões quadrados dos lados com o
  contorno grosso, os blocos inclinados de baixo, o JOGAR amarelo grande, as telas internas com a mesma faixa e os mesmos
  painéis, as patentes e os banners novos;
- o código em tools/v91/*.js (na ordem de ARQUIVOS), colado no fim do script principal, logo antes da arrumação final
  (montaAbas, a primeira vez, o lobby), depois do da v90;
- as peças embutidas (nada de arquivo de fora): o fundo da tela inicial (tools/v91/fundo.webp, tirado da imagem de
  referência por tools/v91/fundo.py), o fundo das telas internas (fundo_telas.webp), o lugar da tampinha nele
  (fundo.json) e os ícones (tools/v91/icones.svg).
A física NÃO muda (o build continua conferindo o bloco de física)."""
import base64, json, pathlib, re
AQUI = pathlib.Path(__file__).resolve().parent
SUBS = []

# ---- o estilo da v91 depois de todos os outros
SUBS.append(('<link rel="stylesheet" href="./v90.css">\n', '<link rel="stylesheet" href="./v90.css">\n<link rel="stylesheet" href="./v91.css">\n'))

ARQUIVOS = [n for n in ('base.js', 'patentes.js', 'banners.js', 'inicio.js', 'telas.js') if (AQUI / n).exists()]
CODIGO = '\n'.join((AQUI / n).read_text(encoding='utf-8') for n in ARQUIVOS)


def _uri(nome, tipo='image/webp'):
    return 'data:%s;base64,%s' % (tipo, base64.b64encode((AQUI / nome).read_bytes()).decode('ascii'))


if CODIGO.strip():
    pre = []
    if (AQUI / 'fundo.webp').exists() and (AQUI / 'fundo.json').exists():
        info = json.loads((AQUI / 'fundo.json').read_text(encoding='utf-8'))
        pre.append('const V91_FUNDO = {src:"%s", telas:%s, info:%s};' % (
            _uri('fundo.webp'),
            json.dumps(_uri('fundo_telas.webp')) if (AQUI / 'fundo_telas.webp').exists() else 'null',
            json.dumps(info, separators=(',', ':'))))
    else:
        pre.append('const V91_FUNDO = null;')
    if (AQUI / 'banners.webp').exists() and (AQUI / 'banners.json').exists():
        bj = json.loads((AQUI / 'banners.json').read_text(encoding='utf-8'))
        pre.append('const V91_BANNERS = {src:"%s", w:%d, h:%d, cenas:%s};' % (_uri('banners.webp'), bj['w'], bj['h'], json.dumps(bj['cenas'])))
    else:
        pre.append('const V91_BANNERS = null;')
    svg = (AQUI / 'icones.svg').read_text(encoding='utf-8') if (AQUI / 'icones.svg').exists() else ''
    svg = re.sub(r'<!--.*?-->', '', svg, flags=re.S)
    svg = re.sub(r'>\s+<', '><', svg).strip()
    pre.append('const V91_SPRITE = ' + json.dumps(svg, ensure_ascii=False) + ';')
    CODIGO = '\n'.join(pre) + '\n' + CODIGO
    SUBS.append(('\nmontaAbas();\nif (onbPrecisa()) onbAbre();',
                 '\n/* ======================================================================= RACHA v91 (tools/v91/*.js) */\n' + CODIGO
                 + '\nmontaAbas();\nif (onbPrecisa()) onbAbre();'))
