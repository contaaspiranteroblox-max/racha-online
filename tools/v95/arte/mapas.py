"""RACHA v95 · os KITS DOS MAPAS desenhados em código (no lugar dos da v74 e da v77, que vinham de imagens geradas por IA):
· QD_KIT (a ARENA, a quadra da favela vista de cima): os pedaços do muro de cima (de frente: o RACHA, os bancos, o mural do
  meio e o BRASIL), as escadas dos lados, as colunas de casas, as faixas de cima e de baixo, as lixeiras, as caixas, o grão
  da tinta e os pedaços gastos — 1700 × 1057, os mesmos lugares (tools/v77/quadra_kit.json);
· CN_KIT (o ESTÁDIO de noite): os 6 carros, as 2 árvores e as duas faixas de casas — 640 × 630 (tools/v74/campo_noite_kit.json).
Tudo em cores chapadas com o contorno de tinta (o mesmo estilo da quadra do lobby). O código que usa as peças é o mesmo."""
import json, math, pathlib, random

AQUI = pathlib.Path(__file__).resolve().parent
QDJ = json.loads((AQUI.parent.parent / 'v77' / 'quadra_kit.json').read_text(encoding='utf-8'))
CNJ = json.loads((AQUI.parent.parent / 'v74' / 'campo_noite_kit.json').read_text(encoding='utf-8'))
TINTA = '#1a1714'
LAR, ROX, GIZ, AMA = '#ff6a00', '#7a3fc4', '#f3efe6', '#ffcf2e'


def f(v):
    return ('%.1f' % v).rstrip('0').rstrip('.')


def mist(a, b, t):
    a = [int(a[i:i + 2], 16) for i in (1, 3, 5)]; b = [int(b[i:i + 2], 16) for i in (1, 3, 5)]
    return '#' + ''.join('%02x' % round(a[i] + (b[i] - a[i]) * t) for i in range(3))


def R(x, y, w, h, c, k=0, rx=0, op=None, cor_k=TINTA):
    s = '<rect x="%s" y="%s" width="%s" height="%s" fill="%s"' % (f(x), f(y), f(w), f(h), c)
    if rx: s += ' rx="%s"' % f(rx)
    if k: s += ' stroke="%s" stroke-width="%s" stroke-linejoin="round"' % (cor_k, f(k))
    if op is not None: s += ' opacity="%s"' % op
    return s + '/>'


def C(x, y, r, c, k=0, op=None, cor_k=TINTA):
    s = '<circle cx="%s" cy="%s" r="%s" fill="%s"' % (f(x), f(y), f(r), c)
    if k: s += ' stroke="%s" stroke-width="%s"' % (cor_k, f(k))
    if op is not None: s += ' opacity="%s"' % op
    return s + '/>'


def P(pts, c, k=0, op=None):
    s = '<polygon points="%s" fill="%s"' % (' '.join(f(x) + ',' + f(y) for x, y in pts), c)
    if k: s += ' stroke="%s" stroke-width="%s" stroke-linejoin="round"' % (TINTA, f(k))
    if op is not None: s += ' opacity="%s"' % op
    return s + '/>'


def L(d, c, k, op=None, cap='round'):
    s = '<path d="%s" fill="none" stroke="%s" stroke-width="%s" stroke-linecap="%s" stroke-linejoin="round"' % (d, c, f(k), cap)
    if op is not None: s += ' opacity="%s"' % op
    return s + '/>'


def peca(x, y, w, h, corpo, clip=True):
    cid = 'c%d_%d' % (x, y)
    if clip:
        return '<clipPath id="%s"><rect x="0" y="0" width="%s" height="%s"/></clipPath><g transform="translate(%d %d)"><g clip-path="url(#%s)">%s</g></g>' % (cid, w, h, x, y, cid, corpo)
    return '<g transform="translate(%d %d)">%s</g>' % (x, y, corpo)


# ================================================================================================ a ARENA (QD_KIT)
def muro_fundo(w, h):
    """o muro de frente (a mesma cor do muro liso que o jogo desenha entre os pedaços: as emendas não aparecem)"""
    gid = 'mf%d' % w
    return ('<linearGradient id="%s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5f574d"/><stop offset=".12" stop-color="#7a6e60"/>'
            '<stop offset=".85" stop-color="#6c6154"/><stop offset="1" stop-color="#4d463d"/></linearGradient>'
            '<rect width="%s" height="%s" fill="url(#%s)"/>' % (gid, w, h, gid))


def tinta_letras(txt, x, y, tam, face, sombra, k=6, ang=-3, fonte='LilitaOne', anc='middle'):
    return ('<g font-family="%s" font-size="%s" text-anchor="%s" transform="rotate(%s %s %s)">'
            '<text x="%s" y="%s" fill="%s" stroke="%s" stroke-width="%s" stroke-linejoin="round" paint-order="stroke">%s</text>'
            '<text x="%s" y="%s" fill="%s" stroke="%s" stroke-width="%s" stroke-linejoin="round" paint-order="stroke">%s</text></g>'
            % (fonte, tam, anc, ang, f(x), f(y), f(x + 4), f(y + 4), sombra, TINTA, k, txt, f(x), f(y), face, TINTA, k - 1, txt))


def pingos(rnd, x0, x1, y, cor, n=5):
    s = ''
    for _ in range(n):
        x = x0 + rnd.random() * (x1 - x0)
        s += R(x, y, 2.6, 5 + rnd.random() * 10, cor, rx=1.3, op='.85')
    return s


def mr_racha(w, h):
    rnd = random.Random(1)
    return (muro_fundo(w, h) + tinta_letras('RACHA', w / 2, h * .66, 54, LAR, ROX, 7)
            + '<g transform="translate(%s %s) rotate(14)"><polygon points="-15,8 -15,-3 -8,3 0,-9 8,3 15,-3 15,8" fill="%s" stroke="%s" stroke-width="3.5" stroke-linejoin="round"/></g>' % (f(w * .78), f(h * .2), AMA, TINTA)
            + pingos(rnd, w * .2, w * .8, h * .7, LAR))


def mr_banco(w, h, semente=2):
    rnd = random.Random(semente)
    s = muro_fundo(w, h)
    # as pichações pequenas no muro (tags) e o banco de concreto na frente
    for _ in range(3):
        x, y = 12 + rnd.random() * (w - 40), 14 + rnd.random() * 26
        s += '<text x="%s" y="%s" font-family="LilitaOne" font-size="%s" fill="%s" stroke="%s" stroke-width="3" paint-order="stroke" transform="rotate(%s %s %s)" opacity=".85">%s</text>' % (
            f(x), f(y + 14), 14 + int(rnd.random() * 8), rnd.choice([GIZ, AMA, '#2fbfa0', LAR]), TINTA, int(rnd.random() * 16 - 8), f(x), f(y), rnd.choice(['RC', 'ZN', '★', 'MK', 'DDQ', 'VL']))
    by = h * .62
    s += R(w * .1 + 3, by + 12, w * .8, 10, '#3b352e', op='.6')                       # (a sombra no chão)
    s += R(w * .16, by + 2, 10, h - by - 8, '#9b948a', 2.2) + R(w * .84 - 10, by + 2, 10, h - by - 8, '#9b948a', 2.2)
    s += R(w * .1, by - 6, w * .8, 12, '#c9c2b6', 2.4, 3) + R(w * .1, by - 6, w * .8, 3.5, '#e2dccf')
    return s


def mr_meio(w, h):
    s = muro_fundo(w, h)
    # o mural: a bandeira pintada no meio e os dois jogadores (silhuetas), cada um de um lado, com a bola
    bx, bw, bh = w / 2 - 70, 140, 64
    by = h / 2 - bh / 2 - 4
    s += R(bx, by, bw, bh, '#1f9a4a', 3)
    s += P([(w / 2, by + 7), (bx + bw - 10, by + bh / 2), (w / 2, by + bh - 7), (bx + 10, by + bh / 2)], AMA)
    s += C(w / 2, by + bh / 2, 15, '#2c4fb0')
    s += L('M%s %s Q%s %s %s %s' % (f(w / 2 - 15), f(by + bh / 2 - 1), f(w / 2), f(by + bh / 2 - 7), f(w / 2 + 15), f(by + bh / 2 + 2)), GIZ, 3)
    for lado in (-1, 1):                                # (o jogador: cabeça, tronco, a perna do chute e a bola)
        x = w / 2 + lado * 112
        sil = '#2a2522'
        s += C(x, h * .28, 7, sil)
        s += P([(x - 9, h * .36), (x + 9, h * .36), (x + 7, h * .62), (x - 7, h * .62)], sil)
        s += L('M%s %s L%s %s' % (f(x - 4), f(h * .62), f(x - 6), f(h * .9)), sil, 6)
        s += L('M%s %s L%s %s' % (f(x + 4), f(h * .62), f(x + lado * 16), f(h * .78)), sil, 6)
        s += L('M%s %s L%s %s M%s %s L%s %s' % (f(x - 9), f(h * .4), f(x - 18), f(h * .52), f(x + 9), f(h * .4), f(x + 17), f(h * .3)), sil, 5)
        s += C(x + lado * 26, h * .8, 6.5, GIZ, 2)
    return s


def mr_brasil(w, h):
    rnd = random.Random(5)
    return (muro_fundo(w, h) + tinta_letras('BRASIL', w / 2, h * .66, 44, AMA, '#1f9a4a', 6, -4)
            + pingos(rnd, w * .18, w * .82, h * .7, AMA, 4))


def escada(w, h, lado):
    """atrás do gol, vista de cima: o muro pintado (os azulejos coloridos) e a escada (os degraus), com as plantas"""
    rnd = random.Random(40 + lado)
    s = R(0, 0, w, h, '#8a7a66')
    muro_x = 0 if lado < 0 else w - 26
    deg_x = 26 if lado < 0 else 0
    dw = w - 26
    # os degraus (de cima: faixas claras e a sombra de cada um)
    for y in range(0, h, 14):
        s += R(deg_x, y, dw, 14, '#b9ab95' if (y // 14) % 2 else '#c8bba6') + R(deg_x, y + 11, dw, 3, '#8f806b')
    # o corrimão (o cano) e os pés dele
    cx = deg_x + dw * (.18 if lado < 0 else .82)
    s += L('M%s 0 V%s' % (f(cx), h), '#3d4248', 3.2)
    for y in range(20, h, 64): s += C(cx, y, 3, '#2b2f34')
    # o muro de azulejos (o mosaico colorido)
    s += R(muro_x, 0, 26, h, '#5c4f42')
    cores = [LAR, ROX, AMA, '#2fbfa0', '#e5392f', '#2c7fc4', GIZ]
    for y in range(0, h, 9):
        for x in range(0, 26, 9):
            s += R(muro_x + x + 1, y + 1, 7, 7, rnd.choice(cores), op='.92')
    s += R(muro_x + (26 if lado < 0 else -2), 0, 2, h, TINTA, op='.5')
    # as plantas nos vasos (de cima) encostadas no muro
    for y in range(40, h - 20, 120 + int(rnd.random() * 40)):
        px = deg_x + (6 if lado < 0 else dw - 18)
        s += C(px + 6, y, 9, '#2e7d3a', 1.6) + C(px + 2, y - 4, 5, '#46a04f') + C(px + 10, y + 3, 4, '#46a04f')
    return s


def telhados(w, h, semente, noite=False):
    """uma coluna de telhados vista de cima (fibrocimento, laje com caixa-d'água, telha de barro)"""
    rnd = random.Random(semente)
    s = R(0, 0, w, h, '#3a2f29' if not noite else '#151a33')
    y = 0
    while y < h:
        hh = 34 + rnd.random() * 52
        tipo = rnd.random()
        x0, ww = 1.5, w - 3
        if tipo < .34:                                 # fibrocimento: o cinza com as ondas
            base = '#a7a59d' if not noite else '#3d4466'
            s += R(x0, y, ww, hh - 2, base, 1.4)
            for k in range(3, int(ww), 5): s += R(x0 + k, y + 1, 1.6, hh - 4, mist(base, TINTA, .22))
        elif tipo < .67:                               # a laje: o concreto, as manchas e a caixa-d'água
            base = '#b3a48c' if not noite else '#444b70'
            s += R(x0, y, ww, hh - 2, base, 1.4)
            s += C(x0 + ww * (.3 + rnd.random() * .4), y + hh * .45, min(ww, hh) * .22, '#2c7fc4' if not noite else '#25507f', 1.4) + C(x0 + ww * .5, y + hh * .45, min(ww, hh) * .1, '#4fa3e0' if not noite else '#3a6fa0')
            for k in range(3): s += C(x0 + 4 + rnd.random() * (ww - 8), y + 4 + rnd.random() * (hh - 10), 1.2, TINTA)
        else:                                          # a telha de barro
            base = '#b55a35' if not noite else '#4a2c3a'
            s += R(x0, y, ww, hh - 2, base, 1.4)
            for k in range(4, int(hh) - 3, 5): s += R(x0 + 1, y + k, ww - 2, 1.4, mist(base, TINTA, .3))
        if noite and rnd.random() < .4:                # (de noite: a luz que escapa do vão)
            s += R(x0 + ww * .3, y + hh - 6, ww * .4, 3, '#ffd27a', op='.85')
        y += hh
    return s


def faixa_cima(w, h):
    """em cima do muro de cima: as árvores (as copas, de cima) e os telhados"""
    rnd = random.Random(61)
    s = R(0, 0, w, h, '#4a3d33')
    x = 0
    while x < w:
        ww = 30 + rnd.random() * 46
        tipo = rnd.random()
        base = rnd.choice(['#a7a59d', '#b3a48c', '#b55a35', '#c98a52', '#9a9488'])
        s += R(x + 1, 2 + rnd.random() * 6, ww - 2, h - 10, base, 1.4)
        if tipo < .4:
            s += C(x + ww / 2, h * .45, min(ww, h) * .18, '#2c7fc4', 1.2)
        x += ww
    for _ in range(int(w / 70)):                       # as copas das árvores por cima
        cx, cy, r = rnd.random() * w, h * (.25 + rnd.random() * .5), 12 + rnd.random() * 12
        for k in range(5):
            s += C(cx + (rnd.random() - .5) * r * 1.4, cy + (rnd.random() - .5) * r, r * (.55 + rnd.random() * .3), rnd.choice(['#2e7d3a', '#38913f', '#276b33']), 1.2)
    return s


def faixa_baixo(w, h):
    """embaixo: a calçada (com as lixeiras), a rua (a faixa do meio) e os telhados do outro lado"""
    rnd = random.Random(62)
    s = R(0, 0, w, h, '#6c5e52')
    s += R(0, 0, w, h * .26, '#a39885') + R(0, h * .26, w, 3, '#6a5f54')            # a calçada e o meio-fio
    s += R(0, h * .29, w, h * .38, '#45413e')                                          # a rua
    for x in range(10, w, 46): s += R(x, h * .47, 22, 3, '#e6dfcf', op='.8')
    s += R(0, h * .67, w, h * .33, '#4a3d33')                                          # os telhados do outro lado
    x = 0
    while x < w:
        ww = 26 + rnd.random() * 40
        s += R(x + 1, h * .69, ww - 2, h * .3, rnd.choice(['#a7a59d', '#b3a48c', '#b55a35', '#c98a52']), 1.2)
        x += ww
    for x in range(30, w, 150):                                                        # as lixeiras na calçada
        s += R(x, h * .04, 14, 11, rnd.choice(['#2e8b4a', '#2c6fb5', '#e5392f', '#e8a317']), 1.4, 2)
    for _ in range(int(w / 140)):                                                      # as árvores da calçada
        cx = rnd.random() * w
        for k in range(4): s += C(cx + (rnd.random() - .5) * 18, h * .12 + (rnd.random() - .5) * 8, 7 + rnd.random() * 5, rnd.choice(['#2e7d3a', '#38913f']), 1.1)
    return s


def lixeiras(w, h):
    s = ''
    for i, c in enumerate(['#2e8b4a', '#2c6fb5', '#e5392f']):
        x = 4 + i * 50
        s += R(x + 3, 9, 42, 44, '#000000', op='.25', rx=5) + R(x, 5, 42, 44, c, 2.4, 5) + R(x + 4, 9, 34, 10, mist(c, '#ffffff', .25), rx=3)
        s += R(x + 17, 30, 8, 3, mist(c, TINTA, .4), rx=1.5)
    return s


def caixas(w, h):
    s = ''
    for i, c in enumerate(['#e8a317', '#2c6fb5', '#e8a317']):
        x = 4 + i * 50
        s += R(x + 3, 9, 44, 44, '#000000', op='.25', rx=3) + R(x, 5, 44, 44, c, 2.4, 3)
        for gx in range(3):
            for gy in range(3): s += R(x + 6 + gx * 12, 11 + gy * 12, 8, 8, mist(c, TINTA, .45), rx=1.5)
    return s


def rachadura(w, h, semente):
    """um pedaço gasto: a tinta descascada (o cimento aparecendo) e as rachaduras finas"""
    rnd = random.Random(semente)
    s = ''
    cx, cy = w / 2, h / 2
    for _ in range(3 + int(w * h / 6000)):            # as lascas (o cimento aparecendo por baixo da tinta: poucas e discretas)
        x, y = cx + (rnd.random() - .5) * w * .5, cy + (rnd.random() - .5) * h * .5
        pts = [(x + math.cos(a) * r, y + math.sin(a) * r) for a, r in ((k / 7 * 2 * math.pi, (2 + rnd.random() * 6) * min(w, h) / 120) for k in range(7))]
        s += P(pts, rnd.choice(['#8f9785', '#88907e', '#979e8c']), op='.5')
    for _ in range(3):                                 # as rachaduras (o risco que se divide)
        x, y = cx + (rnd.random() - .5) * w * .3, cy + (rnd.random() - .5) * h * .3
        a = rnd.random() * 2 * math.pi
        d = 'M%s %s' % (f(x), f(y))
        for k in range(6):
            a += (rnd.random() - .5) * 1.1
            x += math.cos(a) * min(w, h) * .09; y += math.sin(a) * min(w, h) * .09
            if 0 < x < w and 0 < y < h: d += ' L%s %s' % (f(x), f(y))
        s += L(d, '#2e3326', 1.3, '.6')
    return s


def svg_quadra():
    W, H = 1700, 1057
    p = QDJ
    corpo = []
    F = {'mr_racha': mr_racha, 'mr_banco': lambda w, h: mr_banco(w, h, 2), 'mr_meio': mr_meio, 'mr_banco2': lambda w, h: mr_banco(w, h, 3), 'mr_brasil': mr_brasil,
         'lado_e': lambda w, h: escada(w, h, -1), 'lado_d': lambda w, h: escada(w, h, 1), 'casas_e': lambda w, h: telhados(w, h, 71), 'casas_d': lambda w, h: telhados(w, h, 72),
         'fora_cima': faixa_cima, 'fora_baixo': faixa_baixo, 'lixo': lixeiras, 'caixas': caixas}
    for nome, fn in F.items():
        x, y, w, h = p[nome]
        corpo.append(peca(x, y, w, h, fn(w, h)))
    for i in range(7):                                 # os pedaços gastos (transparentes)
        x, y, w, h = p['gasto%d' % i]
        corpo.append(peca(x, y, w, h, rachadura(w, h, 90 + i)))
    # (o tx_det, o grão da tinta, é feito à parte: arte.py cola o ruído cinza no lugar dele)
    return '<svg xmlns="http://www.w3.org/2000/svg" width="%d" height="%d" viewBox="0 0 %d %d">%s</svg>' % (W, H, W, H, ''.join(corpo))


# ================================================================================================ o ESTÁDIO de noite (CN_KIT)
def carro(w, h, cor):
    """um carro estacionado, visto de cima (a frente para baixo)"""
    esc = mist(cor, TINTA, .45)
    vid = '#26324d'
    return (R(1.5, 1.5, w - 3, h - 3, cor, 1.8, w * .32) + R(4, h * .28, w - 8, h * .44, mist(cor, '#ffffff', .12), rx=4)
            + P([(4, h * .27), (w - 4, h * .27), (w - 6, h * .17), (6, h * .17)], vid) + P([(5, h * .72), (w - 5, h * .72), (w - 7, h * .82), (7, h * .82)], vid)
            + R(-1, h * .24, 3, 5, esc) + R(w - 2, h * .24, 3, 5, esc) + R(4, h - 5, 6, 3, '#fff2b0') + R(w - 10, h - 5, 6, 3, '#fff2b0') + R(4, 2, 6, 3, '#e5392f') + R(w - 10, 2, 6, 3, '#e5392f'))


def arvore(w, h, semente):
    rnd = random.Random(semente)
    s = C(w / 2 + 6, h / 2 + 8, w * .4, '#000000', op='.28')
    for k in range(9):
        a = k / 9 * 2 * math.pi + rnd.random() * .5
        r = w * (.14 + rnd.random() * .1)
        s += C(w / 2 + math.cos(a) * w * .22, h / 2 + math.sin(a) * h * .22, r, rnd.choice(['#22652e', '#2a7536', '#1d5a29']), 1.6)
    s += C(w / 2, h / 2, w * .2, '#2f8a3f', 1.6) + C(w / 2 - 6, h / 2 - 6, w * .09, '#46a04f')
    return s


def casas_noite(w, h, semente, lado):
    """a faixa de casas do lado do estádio, de noite e vista de cima: os telhados, a rua com os postes acesos"""
    rnd = random.Random(semente)
    s = R(0, 0, w, h, '#11152c')
    rua_x = w - 26 if lado < 0 else 0
    s += '<g transform="translate(%s 0)">%s</g>' % (0 if lado < 0 else 26, telhados(w - 26, h, semente, True))
    s += R(rua_x, 0, 26, h, '#2a2e3e') + R(rua_x + 12, 0, 2, h, '#e6dfcf', op='.25')
    for y in range(30, h, 90):                         # os postes acesos (a luz em volta)
        px = rua_x + (4 if lado < 0 else 22)
        s += C(px, y, 16, '#ffd27a', op='.16') + C(px, y, 9, '#ffd27a', op='.25') + C(px, y, 3.4, '#fff6d6', 1.2)
    for _ in range(int(h / 160)):                      # as árvores entre as casas
        cx, cy = rnd.random() * (w - 26) + (0 if lado < 0 else 26), rnd.random() * h
        for k in range(4): s += C(cx + (rnd.random() - .5) * 16, cy + (rnd.random() - .5) * 16, 8 + rnd.random() * 5, rnd.choice(['#1d4a2a', '#24572f']), 1.1)
    return s


def svg_noite():
    W, H = 640, 630
    p = CNJ
    corpo = []
    for nome, cor in (('carro_vermelho', '#d8382c'), ('carro_branco', '#e9e6dc'), ('carro_preto', '#2a2c33'), ('carro_preto2', '#33363f'), ('carro_amarelo', '#f2b51d'), ('carro_branco2', '#d9d6cc')):
        x, y, w, h = p[nome]
        corpo.append(peca(x, y, w, h, carro(w, h, cor), clip=False))
    for nome, sem in (('arvore1', 1), ('arvore2', 2)):
        x, y, w, h = p[nome]
        corpo.append(peca(x, y, w, h, arvore(w, h, sem)))
    for nome, sem, lado in (('casas_esq', 81, -1), ('casas_dir', 82, 1)):
        x, y, w, h = p[nome]
        corpo.append(peca(x, y, w, h, casas_noite(w, h, sem, lado)))
    return '<svg xmlns="http://www.w3.org/2000/svg" width="%d" height="%d" viewBox="0 0 %d %d">%s</svg>' % (W, H, W, H, ''.join(corpo))
