#!/usr/bin/env python3
"""RACHA v111 · o jogo mais leve — a última etapa do build (o tools/aplicar_rua.py chama no fim, depois da conferência da
física). O jogo continua o mesmo: a física, as telas, os textos, os sons e o que o config.js liga e desliga. Só sai o peso
que não serve para quem joga:

1. AS IMAGENS DE VERSÕES ANTIGAS que o jogo de hoje não mostra em lugar nenhum (a lista APOSENTADAS, logo abaixo). Cada uma
   vira um pontinho transparente (1×1) e as medidas dela ficam: o código de antes continua achando o que procura e
   nada muda na tela. Cada troca confere, no jogo montado, o motivo de a imagem não aparecer (a versão nova que cobre a
   velha) — se uma versão futura mudar isso, o build para e avisa, em vez de sumir com uma imagem que voltou a aparecer.
2. OS COMENTÁRIOS, O RECUO, OS ESPAÇOS SOBRANDO E AS LINHAS VAZIAS do código (os <script> do racha.html) e do estilo (o
   <style>). Os comentários continuam nos arquivos de onde o jogo é montado (tools/ e backup/): só a cópia que vai para o
   jogador sai sem eles. Nada dentro de texto ('…', "…", `…`) ou de expressão regular muda; as linhas não são juntadas (a
   quebra de linha decide onde entra o ponto e vírgula automático); e o bloco da física (PHYS_START…PHYS_END) fica byte a
   byte igual.

O build também grava a cópia completa (tests/build/racha_completo.html: o mesmo jogo, com os comentários e as imagens
aposentadas já trocadas); o tests/v111_enxuga_test.mjs confere com o esbuild que os dois são o mesmo programa, script por
script e estilo por estilo. O tools/mapa_codigo.py lê a cópia completa (os trechos dela batem com os arquivos de tools/).

Rodar sozinho (só para medir): python3 tools/v111/enxuga.py app/public/game/racha.html
"""
import re, sys

# ---------------------------------------------------------------------------------------------------------------- imagens
PONTINHO = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'   # 1×1 transparente (GIF, 42 bytes)


def _confere(codigo, css, onde, trecho, n, motivo):
    """codigo: o jogo SEM os comentários (o que conta é o código: um comentário novo citando a imagem não para o build)."""
    if onde == 'jogo':
        k = codigo.count(trecho)
        assert k == n, ('v111: %r aparece %d vez(es) no código do jogo (esperava %d). A imagem aposentada pode ter voltado '
                        'a aparecer (%s) — confira a lista APOSENTADAS do tools/v111/enxuga.py.' % (trecho[:90], k, n, motivo))
    else:
        assert trecho in css.get(onde, ''), ('v111: não achei no %s: %r. A imagem aposentada pode ter voltado a aparecer (%s) '
                                             '— confira a lista APOSENTADAS do tools/v111/enxuga.py.' % (onde, trecho[:90], motivo))


# (a constante, o caminho até o texto da imagem, o porquê, e o que garante que ela não aparece: (onde, trecho, quantas vezes
#  no código do jogo); onde = 'jogo' ou o arquivo de estilo). caminho: as chaves, em ordem; None = a constante é a imagem.
APOSENTADAS = [
    ('V91_FUNDO', ('telas',), 'o fundo das telas de dentro da v91: a v101 põe o dela (V101_FUNDO.telas) no lugar — no '
     'V91.F e nas duas variáveis --v91-fundo-telas — no mesmo instante em que a v91 monta (o v101Monta logo depois do v91Monta, '
     'no mesmo lbRender), antes de a tela ser desenhada. (O V91_FUNDO.src fica: é o fundo da tela de entrar, --v91-fundo.)', [
        ('jogo', "V91.F = {src:V101.F.src, telas:V101.F.telas || (V91.F && V91.F.telas) || null, info:V101.F.info};", 1),
        ('jogo', "document.documentElement.style.setProperty('--v91-fundo-telas', u); LB.raiz.style.setProperty('--v91-fundo-telas', u);", 1),
        ('jogo', "setProperty('--v91-fundo-telas'", 4),
        ('jogo', 'V91.F.telas', 5),
        ('jogo', "lbRender = function(){ const r = lbRenderAntes101.apply(this, arguments); try { v101Monta(); v101Arruma(); }", 1),
        ('jogo', 'try { v101Monta(); v101Arruma(); } catch (e)', 2),
        ('jogo', '", telas:"data:image/', 2),                       # (o da V91_FUNDO e o da V101_FUNDO)
        ('jogo', 'V91_FUNDO', 3)]),
    ('LOBBY75', ('src',), 'o fundo do lobby da v75: só era pintado no #lb-fundo (o canvas do fundo do lobby), escondido '
     'desde a v90 (e a v77 já pintava o dela por cima)', [
        ('v90.css', '#lb.v90 #lb-fundo{ visibility:hidden; }', 0),
        ('jogo', "if (!R.classList.contains('v90')) R.classList.add('v90');", 1),     # (o v90Arruma, no lbRender e no lbLayout)
        ('jogo', 'RUA_CENA(g, w, h, chao, cx, esq, dir, zonas,', 1),                    # (a cena só é pintada no fundo do lobby…)
        ('jogo', 'const c = LB.fundo,', 1),                                             # (… que é o #lb-fundo)
        ('jogo', 'L75.el', 2)]),
    ('V77P', ('fundo', 'src'), 'o fundo do lobby e do perfil da v77: só era pintado no #lb-fundo (o canvas do fundo do lobby), '
     'escondido desde a v90', [
        ('v90.css', '#lb.v90 #lb-fundo{ visibility:hidden; }', 0),
        ('jogo', "if (!R.classList.contains('v90')) R.classList.add('v90');", 1),     # (o v90Arruma, no lbRender e no lbLayout)
        ('jogo', 'RUA_CENA(g, w, h, chao, cx, esq, dir, zonas,', 1),                    # (a cena só é pintada no fundo do lobby…)
        ('jogo', 'const c = LB.fundo,', 1),                                             # (… que é o #lb-fundo)
        ('jogo', 'V77.img.fundo', 2)]),
    ('V77P', ('banner', 'src'), 'o banner do perfil da v77: o banner da v91 cobre (v91-com-banner tira a imagem de fundo)', [
        ('v91.css', '#lb.v91 #lb-camada .v77-pf-banner.v91-com-banner{ background-image:none !important; }', 0),
        ('jogo', "ban.classList.add('v91-com-banner');", 1),
        ('jogo', 'V77P.banner', 2)]),
    ('V101_OFICINA', None, 'a ilustração do cartão da OFICINA da v101: a v102 tirou o cartão da tela inicial (a OFICINA '
     'foi para a barra de baixo) e, em pé, a v101 já escondia a ilustração', [
        ('v102.css', '#lb.v91.v95v.v101.v102:not(.retrato) #lb-palco #ofi-lobby,', 0),
        ('v101.css', '#lb.v101.retrato #ofi-lobby .v101-ofi-arte,', 0),
        ('jogo', 'V101_OFICINA', 4)]),
]


def _acha_texto(html, nome, caminho):
    """O começo e o fim (sem as aspas) do texto data:… da imagem dentro da constante."""
    marca = '\nconst %s = ' % nome
    assert html.count(marca) == 1, ('v111: a constante %s não está no jogo (ou está mais de uma vez)' % nome)
    i = html.index(marca) + len(marca)
    if caminho is None:
        assert html.startswith('"data:image/', i), ('v111: %s não é mais o texto de uma imagem' % nome)
        a = i + 1
    else:
        fim_linha = html.index('\n', i)
        p = i
        for k, chave in enumerate(caminho):
            ultimo = k == len(caminho) - 1
            achou = re.compile(r'[{,]\s*"?%s"?\s*:\s*%s' % (re.escape(chave), r'"' if ultimo else r'\{')).search(html, max(i, p - 1), fim_linha)
            assert achou, ('v111: não achei %s.%s no jogo' % (nome, '.'.join(caminho)))
            p = achou.end()
        a = p
        assert html.startswith('data:image/', a), ('v111: %s.%s não é mais uma imagem embutida' % (nome, '.'.join(caminho)))
    b = html.index('"', a)
    return a, b


def aposenta(html, css, codigo):
    """Troca as imagens de APOSENTADAS pelo pontinho. css: {'v90.css': texto, …} (os estilos que garantem que não aparecem);
    codigo: o jogo sem os comentários (onde as conferências contam). Devolve (o jogo, a lista do que saiu: (rótulo, bytes))."""
    saiu = []
    for nome, caminho, motivo, conferencias in APOSENTADAS:
        for onde, trecho, n in conferencias:
            _confere(codigo, css, onde, trecho, n, motivo)
        a, b = _acha_texto(html, nome, caminho)
        rot = nome + ('.' + '.'.join(caminho) if caminho else '')
        saiu.append((rot, b - a))
        html = html[:a] + PONTINHO + html[b:]
    return html, saiu


# ---------------------------------------------------------------------------------------------------------------- código
_ESPACOS = ' \t\n\r\v\f ﻿  '
_QUEBRAS = '\n\r  '
_PALAVRAS_ANTES_DE_REGEX = {'return', 'typeof', 'instanceof', 'in', 'of', 'new', 'delete', 'void', 'throw', 'case', 'do',
                            'else', 'yield', 'await'}


def _letra(c):
    return c.isalnum() or c in '_$\\' or ord(c) > 127


def _pedacos(src):
    """Os pedaços do código, em ordem: (tipo, início, fim). tipo: 'esp' (espaços e quebras), 'com' (comentário), 'str'
    (texto), 'tpl' (um pedaço de modelo `…`, até a crase ou o ${), 'rx' (expressão regular), 'id', 'num' ou 'pt'."""
    i, n = 0, len(src)
    chaves = []                        # dentro de ${ … } de um modelo: quantas chaves estão abertas em cada nível
    ant = ('pt', '')                   # o último pedaço que conta (decide se a próxima / é divisão ou expressão regular)
    while i < n:
        c = src[i]
        if c in _ESPACOS:
            j = i + 1
            while j < n and src[j] in _ESPACOS:
                j += 1
            yield 'esp', i, j
            i = j
            continue
        if c == '/' and src.startswith('//', i):
            j = i + 2
            while j < n and src[j] not in _QUEBRAS:
                j += 1
            yield 'com', i, j
            i = j
            continue
        if c == '/' and src.startswith('/*', i):
            j = src.find('*/', i + 2)
            if j < 0:
                raise ValueError('comentário sem fim (posição %d)' % i)
            yield 'com', i, j + 2
            i = j + 2
            continue
        if c == '"' or c == "'":
            j = i + 1
            while True:
                if j >= n:
                    raise ValueError('texto sem fim (posição %d)' % i)
                d = src[j]
                if d == '\\':
                    j += 2
                    continue
                if d == c:
                    j += 1
                    break
                if d in '\n\r':
                    raise ValueError('quebra de linha dentro de um texto (posição %d)' % i)
                j += 1
            yield 'str', i, j
            ant = ('str', '')
            i = j
            continue
        if c == '`' or (c == '}' and chaves and chaves[-1] == 0):
            if c == '}':
                chaves.pop()
            j, abriu = i + 1, False
            while True:
                if j >= n:
                    raise ValueError('modelo sem fim (posição %d)' % i)
                d = src[j]
                if d == '\\':
                    j += 2
                    continue
                if d == '`':
                    j += 1
                    break
                if d == '$' and j + 1 < n and src[j + 1] == '{':
                    j += 2
                    abriu = True
                    chaves.append(0)
                    break
                j += 1
            yield 'tpl', i, j
            ant = ('pt', '${') if abriu else ('tpl', '')
            i = j
            continue
        if c == '{':
            if chaves:
                chaves[-1] += 1
            yield 'pt', i, i + 1
            ant = ('pt', '{')
            i += 1
            continue
        if c == '}':
            if chaves:
                chaves[-1] -= 1
            yield 'pt', i, i + 1
            ant = ('pt', '}')
            i += 1
            continue
        if c == '/':
            t, v = ant
            regex = (t == 'pt' and v not in (')', ']', '}', '++', '--')) or (t == 'id' and v in _PALAVRAS_ANTES_DE_REGEX)
            if regex:
                j, classe = i + 1, False
                while True:
                    if j >= n or src[j] in '\n\r':
                        raise ValueError('expressão regular sem fim (posição %d)' % i)
                    d = src[j]
                    if d == '\\':
                        j += 2
                        continue
                    if classe:
                        if d == ']':
                            classe = False
                    elif d == '[':
                        classe = True
                    elif d == '/':
                        j += 1
                        break
                    j += 1
                while j < n and _letra(src[j]):
                    j += 1                                # (as letras do fim: g, i, m, s, u, y, d, v)
                yield 'rx', i, j
                ant = ('rx', '')
                i = j
                continue
            j = i + 2 if src.startswith('/=', i) else i + 1
            yield 'pt', i, j
            ant = ('pt', src[i:j])
            i = j
            continue
        if c.isdigit() or (c == '.' and i + 1 < n and src[i + 1].isdigit()):
            j = i + 1
            hexa = src[i:i + 2].lower() in ('0x', '0b', '0o')
            while j < n and (src[j].isalnum() or src[j] in '._'):
                if not hexa and src[j] in 'eE' and j + 1 < n and src[j + 1] in '+-':
                    j += 2
                    continue
                j += 1
            yield 'num', i, j
            ant = ('num', '')
            i = j
            continue
        if _letra(c):
            j = i + 1
            while j < n and _letra(src[j]):
                j += 2 if src[j] == '\\' else 1
            yield 'id', i, j
            ant = ('id', src[i:j])
            i = j
            continue
        dois = src[i:i + 2]
        if dois in ('++', '--', '=>'):
            yield 'pt', i, i + 2
            ant = ('pt', dois)
            i += 2
            continue
        yield 'pt', i, i + 1
        ant = ('pt', c)
        i += 1


def enxuga_js(src):
    """O mesmo código sem os comentários, o recuo, os espaços sobrando e as linhas vazias. Entre dois pedaços que estavam
    separados fica um espaço (ou uma quebra de linha, se havia uma — também dentro de um comentário /* … */ de várias
    linhas, que conta como quebra para o ponto e vírgula automático); os que estavam colados continuam colados."""
    saida, entre = [], None
    for tipo, a, b in _pedacos(src):
        if tipo == 'esp' or tipo == 'com':
            if any(q in src[a:b] for q in _QUEBRAS):
                entre = '\n'
            elif entre is None:
                entre = ' '
            continue
        if entre:
            saida.append(entre)
            entre = None
        saida.append(src[a:b])
    if entre:
        saida.append(entre)
    return ''.join(saida)


def assinatura_js(src):
    """Os pedaços que contam (sem espaços e comentários) e onde havia quebra de linha entre eles: o enxuto precisa dar o
    mesmo que o completo (a conferência do próprio build; a do esbuild fica no tests/v111_enxuga_test.mjs)."""
    sai, quebra = [], False
    for tipo, a, b in _pedacos(src):
        if tipo == 'esp' or tipo == 'com':
            quebra = quebra or any(q in src[a:b] for q in _QUEBRAS)
            continue
        sai.append(('\n' if quebra else '') + src[a:b])
        quebra = False
    return sai


# ---------------------------------------------------------------------------------------------------------------- estilo
def enxuga_css(src):
    """O mesmo estilo sem os comentários, o recuo e as linhas vazias (cada sequência de espaços vira um só; nada dentro
    de texto ou de url(…) muda)."""
    saida, i, n, entre = [], 0, len(src), None
    def nome(ch):
        return ch.isalnum() or ch in '-_\\%.#' or ord(ch) > 127
    while i < n:
        c = src[i]
        if c in ' \t\n\r\f':
            j = i
            while j < n and src[j] in ' \t\n\r\f':
                j += 1
            entre = '\n' if ('\n' in src[i:j] or entre == '\n') else (' ' if entre in (None, '', ' ') else entre)
            i = j
            continue
        if src.startswith('/*', i):
            j = src.find('*/', i + 2)
            if j < 0:
                raise ValueError('comentário sem fim no estilo (posição %d)' % i)
            i = j + 2
            if entre is None:
                entre = ''                       # (um comentário colado: não vira espaço no CSS)
            continue
        if entre is not None:
            if entre == '':
                # o comentário colado separava dois pedaços? (a/**/b não é ab): fica o separador vazio /**/
                if saida and nome(saida[-1][-1:] or ' ') and nome(c):
                    saida.append('/**/')
            else:
                saida.append(entre)
            entre = None
        if c == '"' or c == "'":
            j = i + 1
            while True:
                if j >= n:
                    raise ValueError('texto sem fim no estilo (posição %d)' % i)
                if src[j] == '\\':
                    j += 2
                    continue
                if src[j] == c:
                    j += 1
                    break
                j += 1
            saida.append(src[i:j])
            i = j
            continue
        if src[i:i + 4].lower() == 'url(':
            k = i + 4
            while k < n and src[k] in ' \t\n\r\f':
                k += 1
            if k < n and src[k] not in '"\'':
                j = src.index(')', k) + 1
                saida.append(src[i:j])
                i = j
                continue
        saida.append(c)
        i += 1
    if entre:
        saida.append(entre)
    return ''.join(saida)


# ---------------------------------------------------------------------------------------------------------------- o jogo
_BLOCO = re.compile(r'(<script>|<style>)(.*?)(</script>|</style>)', re.S)
FIS_A, FIS_B = '/*PHYS_START*/', '/*PHYS_END*/'


def _js_com_fisica(js):
    """O <script> enxuto, com o bloco da física do jeito que está (byte a byte) e as marcas dele."""
    if FIS_A not in js:
        return enxuga_js(js)
    a = js.index(FIS_A)
    b = js.index(FIS_B) + len(FIS_B)
    return enxuga_js(js[:a]) + js[a:b] + enxuga_js(js[b:])


def enxuga_html(html):
    """Os <script> (sem src) e os <style> do jogo enxutos; o resto (o HTML) igual. Confere cada script pela assinatura."""
    def troca(m):
        abre, corpo, fecha = m.group(1), m.group(2), m.group(3)
        if abre == '<script>':
            novo = _js_com_fisica(corpo)
            if FIS_A in corpo:
                a, b = corpo.index(FIS_A), corpo.index(FIS_B) + len(FIS_B)
                na, nb = novo.index(FIS_A), novo.index(FIS_B) + len(FIS_B)
                assert corpo[a:b] == novo[na:nb], 'v111: o bloco da física mudou'
                assert assinatura_js(corpo[:a]) == assinatura_js(novo[:na]) and assinatura_js(corpo[b:]) == assinatura_js(novo[nb:]), \
                    'v111: o código enxuto não bate com o completo'
            else:
                assert assinatura_js(corpo) == assinatura_js(novo), 'v111: o código enxuto não bate com o completo'
        else:
            novo = enxuga_css(corpo)
        return abre + novo + fecha
    return _BLOCO.sub(troca, html)


def monta(html, css):
    """Do jogo montado pelo build: (o completo — só com as imagens aposentadas trocadas —, o enxuto, o que saiu)."""
    enxuto = enxuga_html(html)                           # (as conferências das imagens contam no código, sem os comentários)
    completo, saiu = aposenta(html, css, enxuto)
    enxuto, _ = aposenta(enxuto, css, enxuto)            # (a mesma troca, dentro do texto da imagem: o resto não muda)
    return completo, enxuto, saiu


if __name__ == '__main__':
    import pathlib
    arq = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else 'app/public/game/racha.html')
    t = arq.read_text(encoding='utf-8')
    pasta = arq.parent
    css = {n: (pasta / n).read_text(encoding='utf-8') for n in ('v90.css', 'v91.css', 'v101.css', 'v102.css') if (pasta / n).exists()}
    completo, enxuto, saiu = monta(t, css)
    kb = lambda s: len(s.encode('utf-8')) / 1024
    print('o jogo: %.0f KB → %.0f KB (imagens aposentadas: %s)' % (kb(t), kb(enxuto), ', '.join('%s %.0f KB' % (r, b / 1024) for r, b in saiu)))
