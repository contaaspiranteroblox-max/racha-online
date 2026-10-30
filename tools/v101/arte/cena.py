"""RACHA v101 · O FUNDO DA TELA INICIAL: a quadra da quebrada no pôr do sol, com neon — desenhada em código (SVG), sem imagem
gerada por IA (o pedido da v95 continua valendo). A referência (a tela inicial enviada em 30/10/2026) serviu só de guia de
composição e de cor: nada dela é copiado ou recortado.

O mundo tem 2400 × 1000 e é visto inteiro na altura (a largura que sobra sai dos lados): em 16:9 aparece x 311..2089, no
celular deitado (19,5:9) x 117..2283. A tampinha do lobby fica em (1200, 585), raio 160 — o jogo desenha a tampinha, a luz roxa,
o anel e o reflexo; aqui fica só o piso molhado com o círculo central e a linha do meio.

Camadas (do fundo para a frente): o céu do pôr do sol com as nuvens acesas por baixo, a luz do sol atrás do morro, as serras ao
longe, o morro do Corcovado com o Cristo, a favela acesa nas encostas, os prédios da esquerda (o poste de luz), as palmeiras, a
casa e as árvores da direita, o refletor e o poste com os fios, o alambrado do fundo com a mureta, a trave com a rede, o muro da
esquerda com o grafite RACHA e a coroa, o Bar do Seu Zé (a bandeira, as mesas, a gente, a moto, a escada e o cachorro) e a quadra
de asfalto molhado com os reflexos, as linhas e a bola.
Uso: svg_cena101(x0, y0, w, h, px_w, px_h, escurece=0, borra=0) → o <svg> da janela (x0, y0, w, h) do mundo.
"""
import math, random

W, H = 2400, 1000
TAMPA = {'x': 1200, 'y': 585, 'r': 160}
CIRCULO = {'cx': 1205, 'cy': 718, 'rx': 292, 'ry': 36}
CHAO_Y = 578                       # a beirada de trás do piso da quadra (no meio: o pé da mureta e da trave)
LINHA_FUNDO = 612                  # a linha de fundo da quadra (no meio; curva um pouco para baixo nas pontas)
TRAVE = {'x0': 1298, 'x1': 1418, 'topo': 482, 'pe': 578}
BOLA = {'x': 1653, 'y': 644, 'r': 30}
BAR_DX, BANDEIRA_DX = -60, -40     # (v101: o bar e a bandeira para a esquerda: a coluna de botões da direita começa em x ≈ 1842)
BAR = {'x0': 1576, 'x1': 1798, 'topo': 300, 'pe': 560}            # (já deslocado; a placa termina em x ≈ 1790)
BANDEIRA = {'x0': 1456, 'x1': 1554, 'topo': 412, 'pe': 482}
GRAFITE = {'x0': 596, 'x1': 1024, 'topo': 318, 'pe': 522}
REFLETOR = {'x': 1702, 'y': 156}
ALAMBRADO_Y = 395                  # o alto do alambrado do fundo (atrás da trave)


def f(v):
    return ('%.1f' % v).rstrip('0').rstrip('.')


def rgb(c):
    return [int(c[i:i + 2], 16) for i in (1, 3, 5)]


def mistura(a, b, t):
    a, b = rgb(a), rgb(b)
    t = max(0.0, min(1.0, t))
    return '#' + ''.join('%02x' % round(a[i] + (b[i] - a[i]) * t) for i in range(3))


class Svg:
    def __init__(self):
        self.defs, self.corpo, self.n, self._blur = [], [], 0, {}

    def __call__(self, s):
        self.corpo.append(s)

    def novo_id(self, p='g'):
        self.n += 1
        return 'v101c%s%d' % (p, self.n)

    def lin(self, paradas, x1=0, y1=0, x2=0, y2=1, uso=False):
        """degradê linear; paradas = [(pos, cor, opacidade)] · uso=True: coordenadas do mundo"""
        i = self.novo_id('l')
        st = ''.join('<stop offset="%s" stop-color="%s"%s/>' % (f(o), c, '' if a >= 1 else ' stop-opacity="%s"' % f(a)) for o, c, a in paradas)
        u = ' gradientUnits="userSpaceOnUse"' if uso else ''
        self.defs.append('<linearGradient id="%s" x1="%s" y1="%s" x2="%s" y2="%s"%s>%s</linearGradient>' % (i, f(x1), f(y1), f(x2), f(y2), u, st))
        return 'url(#%s)' % i

    def rad(self, paradas, cx, cy, r, sy=1.0, uso=True, fx=None, fy=None):
        """degradê radial (no mundo); sy achata na vertical (a elipse de luz)"""
        i = self.novo_id('r')
        st = ''.join('<stop offset="%s" stop-color="%s"%s/>' % (f(o), c, '' if a >= 1 else ' stop-opacity="%s"' % f(a)) for o, c, a in paradas)
        tr = '' if sy == 1 else ' gradientTransform="translate(%s %s) scale(1 %s) translate(%s %s)"' % (f(cx), f(cy), '%.4f' % sy, f(-cx), f(-cy))
        foco = '' if fx is None else ' fx="%s" fy="%s"' % (f(fx), f(fy))
        u = ' gradientUnits="userSpaceOnUse"' if uso else ''
        self.defs.append('<radialGradient id="%s" cx="%s" cy="%s" r="%s"%s%s%s>%s</radialGradient>' % (i, f(cx), f(cy), f(r), foco, u, tr, st))
        return 'url(#%s)' % i

    def borra(self, sx, sy=None):
        """o filtro de desfoque (um por tamanho), com folga grande em volta (as luzes finas e compridas)"""
        k = (round(sx, 2), round(sy if sy is not None else sx, 2))
        if k not in self._blur:
            i = self.novo_id('b')
            self.defs.append('<filter id="%s" x="-60%%" y="-60%%" width="220%%" height="220%%" color-interpolation-filters="sRGB">'
                             '<feGaussianBlur stdDeviation="%s %s"/></filter>' % (i, f(k[0]), f(k[1])))
            self._blur[k] = 'url(#%s)' % i
        return self._blur[k]

    def rect(self, x, y, w, h, cor, **k):
        self('<rect x="%s" y="%s" width="%s" height="%s" fill="%s"%s/>' % (f(x), f(y), f(w), f(h), cor, _attr(k)))

    def poli(self, pts, cor, **k):
        self('<polygon points="%s" fill="%s"%s/>' % (' '.join(f(x) + ',' + f(y) for x, y in pts), cor, _attr(k)))

    def path(self, d, cor='none', **k):
        self('<path d="%s" fill="%s"%s/>' % (d, cor, _attr(k)))

    def circ(self, x, y, r, cor, **k):
        self('<circle cx="%s" cy="%s" r="%s" fill="%s"%s/>' % (f(x), f(y), f(r), cor, _attr(k)))

    def elip(self, x, y, rx, ry, cor, **k):
        self('<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="%s"%s/>' % (f(x), f(y), f(rx), f(ry), cor, _attr(k)))


def _attr(k):
    return ''.join(' %s="%s"' % (a.rstrip('_').replace('_', '-'), v) for a, v in k.items())


def pts_d(pts, fecha=True):
    return 'M' + ' L'.join(f(x) + ' ' + f(y) for x, y in pts) + (' Z' if fecha else '')


def fio(x1, y1, x2, y2, queda):
    """um fio pendurado entre dois pontos (a curva de baixo)"""
    mx, my = (x1 + x2) / 2, (y1 + y2) / 2 + queda
    return 'M%s %s Q%s %s %s %s' % (f(x1), f(y1), f(mx), f(my), f(x2), f(y2))


# ================================================================================================ o céu
def ceu(S):
    g = S.lin([(0, '#120a30', 1), (.07, '#1c0e3e', 1), (.15, '#33124e', 1), (.22, '#5c1858', 1), (.28, '#8e2252', 1),
               (.33, '#c23646', 1), (.38, '#e8543a', 1), (.43, '#fb7a34', 1), (.48, '#ff9a3e', 1), (.54, '#ffb650', 1),
               (.62, '#ffc868', 1), (1, '#ffd27a', 1)], 0, 0, 0, 560, uso=True)
    S.rect(-60, -60, W + 120, 700, g)
    # os lados mais escuros (o roxo da noite chegando na esquerda; o vinho na direita)
    S.rect(-60, -60, W + 120, 560, S.lin([(0, '#0d0828', .62), (.32, '#140c34', .2), (.5, '#140c34', 0), (.76, '#1c0a2a', 0), (1, '#1c0a2a', .42)], -60, 0, W + 60, 0, uso=True))
    # a luz do sol atrás do morro (larga e achatada)
    S.rect(-60, -60, W + 120, 660, S.rad([(0, '#fff6d6', 1), (.06, '#ffe7a4', .98), (.18, '#ffc064', .85), (.38, '#ff8c3e', .55),
                                          (.65, '#ea4a50', .2), (1, '#c03060', 0)], 1380, 246, 820, sy=.46))
    S.rect(-60, -60, W + 120, 660, S.rad([(0, '#ff7a3a', .35), (1, '#ff7a3a', 0)], 1380, 160, 900, sy=.3))
    # estrelas (poucas, no alto escuro)
    r = random.Random(41)
    for _ in range(70):
        x, y = r.random() * W, r.random() * 95
        if 980 < x < 1760 and y > 40:
            continue
        S.circ(x, y, .7 + r.random() * 1.2, '#fff4e0', opacity=f(.25 + r.random() * .5))
    nuvens(S)


def nuvens(S):
    """as nuvens do pôr do sol: o corpo escuro em cima e a barriga acesa por baixo (mais quente perto do sol)"""
    r = random.Random(7)
    SOLX = 1372
    lista = [  # (cx, cy, comprimento, grossura)
        (420, 58, 760, 30), (1080, 40, 560, 26), (1660, 52, 700, 30), (2200, 78, 600, 28), (-40, 96, 420, 26),
        (240, 138, 560, 26), (820, 122, 640, 28), (1480, 112, 760, 30), (2030, 150, 640, 28), (2480, 128, 400, 24),
        (600, 190, 600, 20), (1160, 176, 640, 22), (1760, 196, 560, 20), (2260, 214, 420, 18),
        (940, 228, 460, 13), (1560, 236, 520, 13), (330, 232, 380, 13), (2050, 250, 380, 12),
    ]
    for cx, cy, L, T in lista:
        ts = math.exp(-((cx - SOLX) / 760) ** 2)                     # perto do sol
        tb = max(0, min(1, (cy - 20) / 170))                          # as de baixo, mais acesas
        topo = mistura(mistura('#25103e', '#4a1450', tb), '#6a1a44', ts * .7)
        meio = mistura(mistura('#5a1a5c', '#b02a4c', tb), '#e0443c', ts * .6)
        aceso = mistura(mistura('#c0406a', '#ff7040', tb), '#ffd080', ts * .85)
        g = S.lin([(0, topo, .96), (.55, meio, .96), (1, aceso, 1)], 0, cy - T * 1.1, 0, cy + T * .75, uso=True)
        n = max(5, int(L / (T * 1.4)))
        corpo = []
        for i in range(n):
            t = i / (n - 1)
            fat = 1 - .55 * abs(2 * t - 1) ** 1.6
            rx = T * (1.1 + r.random() * .9) * fat + 6
            ry = rx * (.42 + r.random() * .2)
            x = cx - L / 2 + L * t + (r.random() - .5) * T
            y = cy - ry * .25 + (r.random() - .5) * T * .35
            corpo.append('<ellipse cx="%s" cy="%s" rx="%s" ry="%s"/>' % (f(x), f(y), f(rx), f(ry)))
        S('<g fill="%s" filter="%s">%s</g>' % (g, S.borra(2.2), ''.join(corpo)))
        # a beirada acesa por baixo (fina, mais clara)
        bri = mistura(aceso, '#fff0c0', .35 + ts * .4)
        k = []
        for i in range(max(3, n // 2)):
            t = (i + .5) / max(3, n // 2)
            x = cx - L * .42 + L * .84 * t + (r.random() - .5) * T
            k.append('<ellipse cx="%s" cy="%s" rx="%s" ry="%s"/>' % (f(x), f(cy + T * .32 + r.random() * 3), f(T * (1.2 + r.random()) * (1 - .4 * abs(2 * t - 1))), f(2 + r.random() * 2.2)))
        S('<g fill="%s" opacity="%s" filter="%s">%s</g>' % (bri, f(.45 + ts * .4), S.borra(1.4), ''.join(k)))
    # os fiapos finos perto do horizonte (acesos)
    for i in range(16):
        x = 700 + r.random() * 1500
        y = 236 + r.random() * 44
        ts = math.exp(-((x - SOLX) / 520) ** 2)
        S.elip(x, y, 60 + r.random() * 120, 1.6 + r.random() * 1.8, mistura('#ff8a5a', '#ffe0a0', ts), opacity=f(.35 + ts * .45), filter=S.borra(1.2))


# ================================================================================================ as serras, o morro e o Cristo
def serra_esq(x):
    return (292 - 46 * math.exp(-((x - 380) / 300) ** 2) - 30 * math.exp(-((x - 860) / 210) ** 2) - 22 * math.exp(-((x + 80) / 200) ** 2)
            + 3 * math.sin(x / 37) + 2 * math.sin(x / 11.7))


def serra_dir(x):
    return (286 - 58 * math.exp(-((x - 1960) / 260) ** 2) - 34 * math.exp(-((x - 2330) / 200) ** 2) - 18 * math.exp(-((x - 1700) / 140) ** 2)
            + 3 * math.sin(x / 41) + 2 * math.sin(x / 13.1))


CORCOVADO = [(980, 312), (1050, 300), (1110, 288), (1160, 272), (1200, 262), (1232, 250), (1258, 236), (1278, 224), (1296, 212),
             (1310, 203), (1322, 196), (1333, 189), (1343, 182), (1350, 177), (1356, 175), (1371, 175), (1377, 179), (1386, 186),
             (1398, 194), (1414, 201), (1432, 208), (1452, 216), (1478, 226), (1508, 238), (1540, 249), (1578, 260), (1620, 270),
             (1668, 280), (1720, 290), (1780, 300), (1850, 310)]


def corcovado_y(x):
    for (a, ya), (b, yb) in zip(CORCOVADO, CORCOVADO[1:]):
        if a <= x <= b:
            return ya + (yb - ya) * (x - a) / (b - a)
    return 330


def luzinhas(S, x0, x1, topo, fundo_y, dens, seed, tam=1.0, op=1.0):
    """as luzes da favela ao longe: pontinhos quentes (mais juntos embaixo)"""
    r = random.Random(seed)
    cores = ['#ffcf7a', '#ffb35a', '#ffe2a8', '#ff9a5a', '#ffd9b0', '#ff9fb2']
    n = int((x1 - x0) * dens)
    luz = []
    for _ in range(n):
        x = x0 + r.random() * (x1 - x0)
        t = topo(x)
        if t >= fundo_y:
            continue
        y = t + 6 + (fundo_y - t - 6) * (r.random() ** .7)
        w = (1.4 + r.random() * 1.8) * tam
        luz.append('<rect x="%s" y="%s" width="%s" height="%s" fill="%s" opacity="%s"/>' % (f(x), f(y), f(w), f(w * (.8 + r.random() * .5)), r.choice(cores), f((.45 + r.random() * .55) * op)))
    corpo = ''.join(luz)
    S('<g opacity=".75" filter="%s">%s</g>' % (S.borra(2.4), corpo))      # o brilho
    S('<g>%s</g>' % corpo)


def serras(S):
    # a serra de trás (bem longe: a névoa do pôr do sol)
    pe = 420
    pts = [(x, serra_esq(x) - 6) for x in range(-80, 1260, 14)]
    S.poli(pts + [(1260, pe), (-80, pe)], S.lin([(0, '#5a2a68', 1), (1, '#2e1a4a', 1)], 0, 230, 0, 330, uso=True))
    pts = [(x, serra_dir(x) - 4) for x in range(1480, 2500, 14)]
    S.poli(pts + [(2500, pe), (1480, pe)], S.lin([(0, '#62285e', 1), (1, '#2e1a4a', 1)], 0, 220, 0, 330, uso=True))
    # a beirada acesa das serras (a luz rasante)
    S.path(pts_d([(x, serra_esq(x) - 6) for x in range(-80, 1260, 14)], False), 'none', stroke='#ff9a7a', stroke_width='2', opacity='.35', filter=S.borra(1.2))
    S.path(pts_d([(x, serra_dir(x) - 4) for x in range(1480, 2500, 14)], False), 'none', stroke='#ff9a7a', stroke_width='2', opacity='.3', filter=S.borra(1.2))
    # a névoa do horizonte
    S.rect(-60, 262, W + 120, 110, S.lin([(0, '#ff8a6a', 0), (.5, '#e0607a', .22), (1, '#5a2462', 0)], 0, 262, 0, 372, uso=True))
    luzinhas(S, -60, 1240, lambda x: serra_esq(x), 360, .22, 3, .9, .8)
    luzinhas(S, 1500, 2480, lambda x: serra_dir(x), 360, .2, 4, .9, .8)


def corcovado(S):
    r = random.Random(12)
    # a silhueta (as pedras: um tremidinho na beirada)
    pts = []
    for (a, ya), (b, yb) in zip(CORCOVADO, CORCOVADO[1:]):
        n = max(1, int((b - a) / 9))
        for i in range(n):
            t = i / n
            x = a + (b - a) * t
            y = ya + (yb - ya) * t + (r.random() - .5) * 2.6
            pts.append((x, y))
    pts.append(CORCOVADO[-1])
    g = S.lin([(0, '#2a1640', 1), (.45, '#231438', 1), (1, '#1c1030', 1)], 0, 175, 0, 340, uso=True)
    S.poli(pts + [(1850, 420), (980, 420)], g)
    # a encosta da esquerda pegando um pouco de luz (o lado do sol rasante)
    S.poli([(1356, 175), (1300, 212), (1230, 252), (1160, 276), (1240, 300), (1320, 260)], '#43245e', opacity='.5', filter=S.borra(6))
    S.poli([(1371, 175), (1440, 212), (1540, 250), (1640, 280), (1560, 296), (1430, 250)], '#5a2a52', opacity='.35', filter=S.borra(8))
    # a beirada acesa (o sol está atrás do morro)
    crista = [(x, y) for x, y in pts if 1180 < x < 1640]
    S.path(pts_d(crista, False), 'none', stroke='#ffc77a', stroke_width='3', opacity='.85', filter=S.borra(2.2), stroke_linejoin='round')
    S.path(pts_d(crista, False), 'none', stroke='#fff0c8', stroke_width='1.2', opacity='.8', stroke_linejoin='round')
    # árvores escuras na encosta (o mato)
    mato = []
    for _ in range(70):
        x = 1120 + r.random() * 640
        t = corcovado_y(x)
        y = t + 3 + r.random() * 30
        mato.append('<ellipse cx="%s" cy="%s" rx="%s" ry="%s"/>' % (f(x), f(y), f(3 + r.random() * 6), f(1.6 + r.random() * 2.2)))
    S('<g fill="#1c1030" opacity=".45">%s</g>' % ''.join(mato))
    # o Cristo
    cristo(S, 1363.5, 175)
    # as luzes da encosta (a favela subindo o morro)
    luzinhas(S, 1000, 1840, lambda x: max(corcovado_y(x) + 40, 252), 380, .5, 5, 1.0, .95)


def cristo(S, x, pe):
    """a silhueta do Cristo no alto do morro (o pedestal, a túnica, os braços abertos e a cabeça), um pouco maior que o real
    (a referência também o aumenta: é o que diz onde a quadra fica)"""
    c = '#160a24'
    S.circ(x, pe - 40, 46, '#fff1c4', opacity='.35', filter=S.borra(10))                      # o halo do sol atrás
    S('<g transform="translate(%s %s) scale(1.3) translate(%s %s)">' % (f(x), f(pe), f(-x), f(-pe)))
    S.poli([(x - 9, pe + 1), (x + 9, pe + 1), (x + 7, pe - 8), (x - 7, pe - 8)], c)              # o pedestal
    S.poli([(x - 5.5, pe - 8), (x + 5.5, pe - 8), (x + 4, pe - 34), (x + 3.2, pe - 39), (x - 3.2, pe - 39), (x - 4, pe - 34)], c)   # a túnica
    S.path('M%s %s L%s %s L%s %s L%s %s L%s %s L%s %s Z' % (f(x - 24), f(pe - 39.5), f(x - 3), f(pe - 41.5), f(x + 3), f(pe - 41.5), f(x + 24), f(pe - 39.5),
                                                        f(x + 24), f(pe - 37.2), f(x - 24), f(pe - 37.2)), c)                          # os braços
    S.circ(x, pe - 45, 3.3, c)                                                                  # a cabeça
    S('</g>')


# ================================================================================================ a favela (longe e no meio)
DUSK = ['#6a4466', '#7a4a60', '#58456e', '#86565c', '#4e3d66', '#946658', '#6c5274', '#7f5a6c']
ACESAS = ['#ffcd6e', '#ffb552', '#ffe4a2', '#ffd08a', '#ffa860', '#ffefc0']


def casinhas(S, x0, x1, linhas, seed, base0, base1, esc0, esc1, nevoa0, nevoa1, acesa=.55):
    """fileiras de casinhas (as de trás menores e mais apagadas; as da frente maiores, com janelas e caixa-d'água)"""
    r = random.Random(seed)
    janelas, brilho = [], []
    for li in range(linhas):
        t = li / max(1, linhas - 1)
        base = base0 + (base1 - base0) * t
        esc = esc0 + (esc1 - esc0) * t
        nev = nevoa0 + (nevoa1 - nevoa0) * t
        x = x0 - r.random() * 30 * esc
        while x < x1:
            w = (16 + r.random() * 20) * esc
            h = (12 + r.random() * 18) * esc
            y = base - h + (r.random() - .5) * 8 * esc
            cor = mistura(mistura(r.choice(DUSK), '#1c1232', .55), '#2a1a46', nev)
            S.rect(x, y, w, h + 30 * esc, cor)
            S.rect(x - 1.5 * esc, y - 2.5 * esc, w + 3 * esc, 3 * esc, mistura(cor, '#1c1230', .45))        # a laje
            if r.random() < .3:                                                                           # a caixa-d'água
                S.rect(x + w * (.2 + r.random() * .5), y - 7 * esc, 7 * esc, 5 * esc, mistura('#3f6fb0', '#3a2456', nev * .8))
            if r.random() < .25:                                                                          # o vergalhão
                S.rect(x + w * .8, y - 6 * esc, .9 * esc, 6 * esc, '#24162e')
            # as janelas
            nj = int(w / (7 * esc))
            for j in range(nj):
                if r.random() < acesa:
                    jx = x + 3 * esc + j * 7 * esc + r.random() * 1.5 * esc
                    jy = y + 3 * esc + r.random() * max(1, h - 9 * esc)
                    c = r.choice(ACESAS)
                    jw, jh = 3.2 * esc, 3.6 * esc
                    janelas.append('<rect x="%s" y="%s" width="%s" height="%s" fill="%s"/>' % (f(jx), f(jy), f(jw), f(jh), c))
                    if r.random() < .5:
                        brilho.append('<rect x="%s" y="%s" width="%s" height="%s" fill="%s"/>' % (f(jx - jw), f(jy - jh), f(jw * 3), f(jh * 3), c))
            x += w + r.random() * 4 * esc
    if brilho:
        S('<g opacity=".55" filter="%s">%s</g>' % (S.borra(3.5), ''.join(brilho)))
    S('<g>%s</g>' % ''.join(janelas))


def favela(S):
    # a encosta escura atrás das casinhas do meio (o chão do morro descendo até a quadra)
    S.poli([(900, 296), (1000, 290), (1100, 290), (1300, 286), (1500, 282), (1700, 292), (1880, 304), (1880, 600), (900, 600)], '#1e1434')
    casinhas(S, 900, 1800, 7, 21, 304, 368, .45, .75, .5, .32, .55)
    casinhas(S, 940, 1740, 4, 22, 392, 452, .9, 1.2, .26, .12, .58)
    # os postes de luz espalhados na favela (os pontos brancos com o halo)
    r = random.Random(29)
    for _ in range(22):
        x, y = 940 + r.random() * 800, 300 + r.random() * 150
        S.circ(x, y, 9 + r.random() * 8, '#ffe2b0', opacity='.45', filter=S.borra(5))
        S.circ(x, y, 1.8 + r.random() * 1.2, '#fffbe8')
    # as casas mais perto (atrás do alambrado do fundo): maiores, com janelas de verdade
    perto(S)


def perto(S):
    r = random.Random(33)
    casas = [(1030, 404, 86, 120, '#7a5068'), (1112, 418, 70, 110, '#5f4a74'), (1176, 398, 96, 140, '#8a5a5c'), (1266, 424, 74, 100, '#6a4a70'),
             (1334, 408, 92, 130, '#7c5466'), (1420, 420, 80, 110, '#5c4a6c'), (1494, 402, 96, 140, '#86605a'), (1584, 414, 60, 120, '#6a4c6a')]
    for x, y, w, h, cor in casas:
        cor = mistura(cor, '#1c1230', .45)
        g = S.lin([(0, mistura(cor, '#ffb27a', .1), 1), (1, mistura(cor, '#120c20', .4), 1)], 0, y, 0, y + h, uso=True)
        S.rect(x, y, w, h + 40, g)
        S.rect(x - 3, y - 4, w + 6, 5, mistura(cor, '#160e22', .5))
        if r.random() < .5:
            S.rect(x + w * .55, y - 13, 16, 10, '#355f9a'); S.rect(x + w * .55, y - 13, 16, 3, '#4f82c0')
        # janelas: 2 colunas × 2 andares
        for a in range(2):
            for c in range(max(1, int(w / 38))):
                jx, jy = x + 10 + c * 34, y + 14 + a * 44
                if jy + 22 > y + h + 30:
                    continue
                if r.random() < .62:
                    luz = r.choice(ACESAS)
                    S.rect(jx - 8, jy - 8, 34, 38, luz, opacity='.35', filter=S.borra(6))
                    S.rect(jx, jy, 18, 22, S.lin([(0, '#fff2c8', 1), (1, luz, 1)]))
                    S.rect(jx + 8, jy, 2, 22, '#5a3a2a', opacity='.7'); S.rect(jx, jy + 10, 18, 2, '#5a3a2a', opacity='.7')
                else:
                    S.rect(jx, jy, 18, 22, '#24182e')
                S.rect(jx - 2, jy + 22, 22, 3, mistura(cor, '#120a1c', .4))


# ================================================================================================ a esquerda: os prédios e o poste de luz
def predios_esq(S):
    """os prédios da esquerda, subindo o morro (os da ponta, mais perto, mais altos), escuros, com as janelas quentes; o poste de
    luz no meio deles; nada passa de x 920 (o céu do meio fica aberto)"""
    r = random.Random(61)
    # (x, topo, largura, cor) — de trás para a frente
    tras = [(-90, 0, 210, '#33203a'), (120, 10, 170, '#3a2238'), (430, 40, 150, '#36203a'), (640, 92, 140, '#34203c')]
    frente = [(-80, 30, 190, '#563040'), (110, 54, 170, '#623646'), (280, 92, 150, '#6e3c48'), (430, 108, 150, '#7a444c'),
              (580, 126, 180, '#844a50'), (760, 176, 150, '#6e4250'), (880, 236, 60, '#603a4c')]
    for x, t, w, cor in tras:
        S.rect(x, t, w, 420, cor)
        S.rect(x - 4, t - 5, w + 8, 6, '#1c1226')
        for a in range(4):
            for c in range(int(w / 46)):
                if r.random() < .45:
                    S.rect(x + 14 + c * 44, t + 18 + a * 46, 14, 18, r.choice(ACESAS), opacity='.8')
    for x, t, w, cor in frente:
        predio(S, r, x, t, w, cor)
    # as plantas no alto das lajes (o mato escuro, pendurado)
    mato, folha = [], []
    for x, t, w, _ in frente[1:6]:
        for _ in range(int(w / 16)):
            cx, cy, rr = x + r.random() * w, t - 3 + r.random() * 6, 3 + r.random() * 5
            mato.append('<ellipse cx="%s" cy="%s" rx="%s" ry="%s"/>' % (f(cx), f(cy), f(rr * 1.3), f(rr)))
            folha.append('<ellipse cx="%s" cy="%s" rx="%s" ry="%s"/>' % (f(cx - rr * .3), f(cy - rr * .45), f(rr * .7), f(rr * .4)))
    S('<g fill="#1c2a2c">%s</g>' % ''.join(mato))
    S('<g fill="#3a5248" opacity=".7">%s</g>' % ''.join(folha))
    # o poste de luz (o braço e a lâmpada) e a luz quente nas paredes
    S.rect(-60, 0, 1100, 620, S.rad([(0, '#ffb067', .42), (.3, '#ff8a4a', .16), (1, '#ff8a4a', 0)], 826, 276, 280, sy=.9))
    S.rect(843, 262, 5, 300, '#1b1222')
    S.path('M845 268 Q838 256 820 258', 'none', stroke='#1b1222', stroke_width='4')
    S.elip(816, 262, 14, 5, '#2a1c26')
    S.elip(816, 266, 10, 4, '#fff1c8')
    S.circ(816, 268, 34, '#ffd59a', opacity='.8', filter=S.borra(11))
    S.circ(816, 268, 9, '#fff8e8', filter=S.borra(2))


def predio(S, r, x, t, w, cor):
    fundo = 620
    g = S.lin([(0, mistura(cor, '#160c22', .3), 1), (.5, cor, 1), (1, mistura(cor, '#ffae78', .2), 1)], 0, t, 0, 470, uso=True)
    S.rect(x, t, w, fundo - t, g)
    S.rect(x - 5, t - 6, w + 10, 8, mistura(cor, '#140c1c', .6))                   # a laje
    S.rect(x - 5, t + 2, w + 10, 3, mistura(cor, '#ffd0a0', .1), opacity='.6')
    if r.random() < .55:
        S.rect(x + w * .62, t - 22, 26, 16, '#2d4f84'); S.rect(x + w * .62, t - 22, 26, 4, '#4a74b0')
    # o reboco manchado
    for _ in range(int(w / 12)):
        S.elip(x + r.random() * w, t + 20 + r.random() * 300, 6 + r.random() * 14, 4 + r.random() * 9, '#140a1c', opacity=f(.08 + r.random() * .14))
    # as janelas: poucas e de tamanhos diferentes (umas acesas, com cortina; outras escuras, com grade)
    andares = max(1, int((440 - t) / 70))
    for a in range(andares):
        cols = max(1, int(w / 70))
        for c in range(cols):
            if r.random() < .22:
                continue
            jw = 22 + r.random() * 16
            jh = 28 + r.random() * 12
            jx = x + 12 + c * (w - 24) / cols + r.random() * max(1, (w - 24) / cols - jw - 4)
            jy = t + 22 + a * 70 + r.random() * 8
            acesa = r.random() < .62
            S.rect(jx - 3, jy - 3, jw + 6, jh + 6, mistura(cor, '#120a1a', .6))
            if acesa:
                luz = r.choice(ACESAS)
                S.rect(jx - 16, jy - 16, jw + 32, jh + 32, luz, opacity='.3', filter=S.borra(9))
                S.rect(jx, jy, jw, jh, S.lin([(0, '#fff3cc', 1), (.6, luz, 1), (1, mistura(luz, '#b4602a', .45), 1)]))
                if r.random() < .5:
                    S.rect(jx, jy, jw * .4, jh, '#c06a42', opacity='.6')                  # a cortina
                S.rect(jx + jw / 2 - .8, jy, 1.6, jh, '#3a2016', opacity='.7')
            else:
                S.rect(jx, jy, jw, jh, '#1e1426')
                for k in range(1, 4):
                    S.rect(jx + jw * k / 4 - .7, jy, 1.4, jh, '#2c1e2a', opacity='.9')          # a grade
            S.rect(jx - 4, jy + jh + 2, jw + 8, 3, mistura(cor, '#ffd6b0', .12))
            if r.random() < .25:                                                             # o ar-condicionado
                S.rect(jx + jw + 6, jy + jh * .4, 18, 12, '#8a8494'); S.rect(jx + jw + 6, jy + jh * .4, 18, 3, '#b0aab8')
    # o fio descendo pela parede
    S.path('M%s %s Q%s %s %s %s' % (f(x + w * .9), f(t + 10), f(x + w * .82), f(t + 120), f(x + w * .95), f(t + 260)), 'none', stroke='#120a16', stroke_width='1.6', opacity='.8')


# ================================================================================================ as palmeiras e as árvores
def palmeira(S, xb, yb, xt, yt, esc, cor='#170d22', seed=1):
    r = random.Random(seed)
    cx = (xb + xt) / 2 + (yb - yt) * .06
    S.path('M%s %s Q%s %s %s %s' % (f(xb), f(yb), f(cx), f((yb + yt) / 2), f(xt), f(yt)), 'none', stroke=cor, stroke_width=f(9 * esc), stroke_linecap='round')
    S.path('M%s %s Q%s %s %s %s' % (f(xb), f(yb), f(cx), f((yb + yt) / 2), f(xt), f(yt)), 'none', stroke='#2c1a3a', stroke_width=f(9 * esc), stroke_dasharray='%s %s' % (f(1.4 * esc), f(5 * esc)), opacity='.7')
    folhas = []
    n = 11
    for i in range(n):
        a = -math.pi + (i + .5) * math.pi / n * 1.25 - .15 + (r.random() - .5) * .2
        L = (58 + r.random() * 34) * esc
        dx, dy = math.cos(a) * L, math.sin(a) * L * .55
        caida = (22 + r.random() * 18) * esc
        ex, ey = xt + dx, yt + dy + caida
        mx, my = xt + dx * .55, yt + dy * .55 - 14 * esc
        w = 8 * esc
        nx, ny = -math.sin(a) * w, math.cos(a) * w * .6
        folhas.append('M%s %s Q%s %s %s %s Q%s %s %s %sZ' % (f(xt), f(yt), f(mx + nx), f(my + ny), f(ex), f(ey), f(mx - nx), f(my - ny), f(xt), f(yt)))
        # os folíolos (o serrilhado da folha)
        for k in range(1, 7):
            t = k / 7
            px = xt + (ex - xt) * t; py = yt + (ey - yt) * t - math.sin(t * math.pi) * 10 * esc
            ll = (15 - 8 * t) * esc
            folhas.append('M%s %s L%s %s L%s %s Z' % (f(px), f(py), f(px + nx * 1.3 + ll * .3), f(py + ll), f(px + 2 * esc), f(py)))
    S.path(' '.join(folhas), cor)
    S.circ(xt, yt + 2 * esc, 7 * esc, cor)


def arvores(S, pts, cor='#1a1630', seed=2):
    r = random.Random(seed)
    c = []
    for x, y, rr in pts:
        for _ in range(9):
            c.append('<circle cx="%s" cy="%s" r="%s"/>' % (f(x + (r.random() - .5) * rr * 1.6), f(y + (r.random() - .5) * rr), f(rr * (.4 + r.random() * .45))))
    S('<g fill="%s">%s</g>' % (cor, ''.join(c)))


# ================================================================================================ a direita: a casa, as árvores, o refletor, os postes e os fios
def direita(S):
    """a direita: as árvores escuras, a casa de dois andares atrás do bar (baixa: o céu aparece em cima) e as da ponta"""
    r = random.Random(77)
    arvores(S, [(1880, 168, 40), (2000, 150, 44), (2140, 120, 56), (2290, 132, 52), (2390, 110, 56), (1716, 226, 30)], '#1a1428', 5)
    arvores(S, [(1890, 160, 22), (2150, 112, 30), (2300, 124, 26)], '#33203c', 6)
    for x, t, w, cor in [(1760, 196, 230, '#6e4652'), (1990, 172, 180, '#5c3c4e'), (2170, 150, 260, '#50344a')]:
        predio(S, r, x, t, w, cor)
    # as trepadeiras penduradas na laje
    arvores(S, [(1790, 194, 18), (1850, 190, 16), (1940, 194, 18), (2040, 170, 16)], '#1c2030', 8)


def postes(S):
    # o poste de madeira
    S.rect(1617, 212, 10, 360, S.lin([(0, '#3a2620', 1), (1, '#1c1216', 1)], 0, 0, 1, 0))
    S.rect(1594, 230, 58, 7, '#2a1a1a')
    for x in (1600, 1612, 1634, 1646):
        S.rect(x - 2, 224, 4, 7, '#d8d2dc')
    # o refletor: o poste, o braço e o painel com as 6 lâmpadas
    S.rect(1698, 192, 8, 380, S.lin([(0, '#2c2638', 1), (1, '#16121e', 1)], 0, 0, 1, 0))
    x, y = REFLETOR['x'], REFLETOR['y']
    S.rect(1300, -80, 820, 560, S.rad([(0, '#fff6dc', .62), (.16, '#ffe2a6', .34), (.45, '#ffb070', .1), (1, '#ff9a5a', 0)], x, y, 330, sy=.85))
    S('<g transform="rotate(-6 %s %s)">' % (f(x), f(y)))
    S.rect(x - 56, y - 42, 112, 82, '#15121f', rx='8')
    S.rect(x - 52, y - 38, 104, 74, '#24202f', rx='6')
    for a in range(2):
        for c in range(3):
            lx, ly = x - 46 + c * 32, y - 32 + a * 36
            S.rect(lx - 6, ly - 6, 38, 36, '#fff6e0', opacity='.55', filter=S.borra(6))
            S.rect(lx, ly, 26, 24, S.lin([(0, '#ffffff', 1), (1, '#fff0c4', 1)]), rx='4')
            S.rect(lx + 3, ly + 3, 9, 5, '#ffffff', opacity='.9', rx='2')
    S('</g>')
    S.circ(x, y, 46, '#fffbea', opacity='.42', filter=S.borra(14))
    # os fios (do poste para a favela e para a casa; do refletor para a direita)
    fios = [fio(1598, 233, 1330, 300, 26), fio(1598, 233, 1150, 322, 40), fio(1646, 233, 1760, 214, 10), fio(1646, 233, 2010, 180, 34),
            fio(1706, 196, 2140, 150, 40), fio(1598, 241, 1420, 326, 22), fio(1700, 210, 1990, 238, 28), fio(1622, 214, 1980, 120, 50)]
    S('<g fill="none" stroke="#120a18" stroke-width="1.7" opacity=".85">%s</g>' % ''.join('<path d="%s"/>' % d for d in fios))


# ================================================================================================ o alambrado do fundo, a mureta e a trave
def malha(S):
    """o desenho do alambrado (a tela em losango)"""
    i = S.novo_id('p')
    S.defs.append('<pattern id="%s" width="11" height="11" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">'
                  '<rect width="11" height="1.3" fill="#140e22"/><rect width="1.3" height="11" fill="#140e22"/></pattern>' % i)
    return 'url(#%s)' % i


def fundo_quadra(S):
    tela = malha(S)
    # o alambrado do fundo (de 1040 até o bar): a tela, os postes e o cano de cima
    S.rect(1040, ALAMBRADO_Y, 600, CHAO_Y - 30 - ALAMBRADO_Y, tela, opacity='.55')
    for x in range(1040, 1641, 100):
        S.rect(x - 2.5, ALAMBRADO_Y - 6, 5, CHAO_Y - ALAMBRADO_Y, '#1a1426')
    S.rect(1036, ALAMBRADO_Y - 6, 608, 5, '#211a30')
    # a mureta embaixo (o reboco gasto)
    g = S.lin([(0, '#54485e', 1), (.15, '#3e3550', 1), (1, '#2a2338', 1)], 0, CHAO_Y - 32, 0, CHAO_Y, uso=True)
    S.rect(1030, CHAO_Y - 32, 640, 32, g)
    r = random.Random(4)
    for _ in range(40):
        S.elip(1040 + r.random() * 620, CHAO_Y - 30 + r.random() * 28, 3 + r.random() * 9, 1.5 + r.random() * 3, '#1a1426', opacity=f(.15 + r.random() * .2))


def trave(S):
    T = TRAVE
    x0, x1, t, p = T['x0'], T['x1'], T['topo'], T['pe']
    # o fundo da rede (a parte de trás, mais alta e estreita) e as laterais
    bx0, bx1, bt, bp = x0 + 14, x1 - 10, t - 14, p - 22
    rede = []
    for i in range(0, 15):
        xx = bx0 + (bx1 - bx0) * i / 14
        rede.append('M%s %s L%s %s' % (f(xx), f(bt), f(xx), f(bp)))
    for i in range(0, 10):
        yy = bt + (bp - bt) * i / 9
        rede.append('M%s %s L%s %s' % (f(bx0), f(yy), f(bx1), f(yy)))
    S.path(' '.join(rede), 'none', stroke='#d8d4e4', stroke_width='.9', opacity='.35')
    lat = []
    for i in range(0, 9):
        tt = i / 8
        lat.append('M%s %s L%s %s' % (f(x0 + (bx0 - x0) * tt), f(t + (bt - t) * tt), f(x0 + (bx0 - x0) * tt), f(p + (bp - p) * tt)))
        lat.append('M%s %s L%s %s' % (f(x1 + (bx1 - x1) * tt), f(t + (bt - t) * tt), f(x1 + (bx1 - x1) * tt), f(p + (bp - p) * tt)))
    for i in range(0, 8):
        tt = i / 7
        lat.append('M%s %s L%s %s' % (f(x0 + (bx0 - x0) * tt), f(t + (bt - t) * tt), f(x1 + (bx1 - x1) * tt), f(t + (bt - t) * tt)))
    S.path(' '.join(lat), 'none', stroke='#e4e0ee', stroke_width='.9', opacity='.4')
    # a rede da frente (bem fina)
    fr = []
    for i in range(1, 16):
        xx = x0 + (x1 - x0) * i / 16
        fr.append('M%s %s L%s %s' % (f(xx), f(t), f(xx), f(p)))
    for i in range(1, 12):
        yy = t + (p - t) * i / 12
        fr.append('M%s %s L%s %s' % (f(x0), f(yy), f(x1), f(yy)))
    S.path(' '.join(fr), 'none', stroke='#f0ecf8', stroke_width='.8', opacity='.28')
    # as traves (brancas, com a sombra do lado e o brilho do refletor)
    for xx in (x0, x1):
        S.rect(xx - 4, t - 3, 8, p - t + 3, S.lin([(0, '#ffffff', 1), (.6, '#dcd8e6', 1), (1, '#9a94b0', 1)], 0, 0, 1, 0))
    S.rect(x0 - 4, t - 4, x1 - x0 + 8, 8, S.lin([(0, '#ffffff', 1), (1, '#c6c0d4', 1)]))
    S.rect(x0 - 2, t - 3, x1 - x0 + 4, 2, '#ffffff', opacity='.9')
    S.rect(x0 - 30, p - 12, x1 - x0 + 60, 18, '#000000', opacity='.25', filter=S.borra(6))


# ================================================================================================ o muro da esquerda e o grafite
def muro_topo(x):
    return 300 + .2126 * (x - 520)


def muro_pe(x):
    return 557 - .005 * (x - 520)


def alambrado_topo(x):
    return 245 + .205 * (x - 520)


def muro(S):
    tela = malha(S)
    xs = list(range(-80, 1061, 20))
    # o alambrado em cima do muro (dá para ver os prédios atrás) e os postes
    S.poli([(x, alambrado_topo(x)) for x in xs] + [(x, muro_topo(x)) for x in reversed(xs)], tela, opacity='.6')
    for x in range(-60, 1061, 118):
        S.poli([(x - 4, alambrado_topo(x) - 8), (x + 4, alambrado_topo(x) - 8), (x + 4, muro_topo(x) + 4), (x - 4, muro_topo(x) + 4)], '#1b1428')
    S.path(pts_d([(x, alambrado_topo(x) - 6) for x in xs], False), 'none', stroke='#241c34', stroke_width='5')
    # a face do muro
    face = [(x, muro_topo(x)) for x in xs] + [(x, muro_pe(x)) for x in reversed(xs)]
    S.poli(face, S.lin([(0, '#3a2a4c', 1), (.6, '#2e2442', 1), (1, '#292038', 1)], -80, 0, 1060, 0, uso=True))
    # o roxo do neon espalhado (a tinta) e os pixels rosa do spray
    S.poli(face, S.rad([(0, '#c23aa0', .55), (.5, '#7a2a9a', .25), (1, '#3a1a5a', 0)], 760, 420, 380, sy=.55))
    r = random.Random(17)
    px = []
    for _ in range(260):
        x = 520 + r.random() * 160
        y0, y1 = muro_topo(x) + 8, muro_pe(x) - 40
        y = y0 + r.random() * (y1 - y0)
        s = 6 + r.random() * 9
        px.append('<rect x="%s" y="%s" width="%s" height="%s" fill="%s" opacity="%s"/>' % (f(x), f(y), f(s), f(s), r.choice(['#ff4fae', '#e03aa0', '#ff7ac8', '#a83ad0']), f(.25 + r.random() * .5)))
    S('<g>%s</g>' % ''.join(px))
    # manchas, respingos e rachaduras
    for _ in range(120):
        x = -60 + r.random() * 1110
        y = muro_topo(x) + 6 + r.random() * (muro_pe(x) - muro_topo(x) - 10)
        S.circ(x, y, 1 + r.random() * 3.5, r.choice(['#120a1c', '#c03aa0', '#ff8a3a', '#e8e0f0']), opacity=f(.12 + r.random() * .3))
    # o rodapé (a parte de baixo, de cimento)
    S.poli([(x, muro_pe(x) - 38) for x in xs] + [(x, muro_pe(x)) for x in reversed(xs)], S.lin([(0, '#4a4258', 1), (1, '#2c2638', 1)]), opacity='.92')
    for _ in range(50):
        x = -60 + r.random() * 1110
        S.elip(x, muro_pe(x) - 10 - r.random() * 26, 4 + r.random() * 12, 2 + r.random() * 5, '#16101e', opacity=f(.2 + r.random() * .25))
    # a quina do muro (onde ele encontra o alambrado do fundo)
    S.poli([(1052, muro_topo(1052) - 2), (1066, muro_topo(1066) - 2), (1066, muro_pe(1066)), (1052, muro_pe(1052))], '#1e1830')
    grafite(S)


# as letras do grafite: (letra, x do pé, altura, inclinação, cor de cima, cor de baixo)
LETRAS = [('R', 600, 186, -6, '#c35cff', '#7a1fd0'), ('A', 716, 160, -4, '#e252e8', '#9a24c8'), ('C', 802, 146, -7, '#ff4f8f', '#d12a6e'),
          ('H', 876, 133, -3, '#ff7438', '#e0401f'), ('A', 952, 122, -6, '#ffa63a', '#ff6a1a')]


def grafite(S):
    """o RACHA pichado: cada letra do tamanho que a parede deixa (a parede some para a direita), com o contorno escuro, o
    volume, o brilho branco, os escorridos e a névoa do spray; a coroa dourada em cima do R"""
    pe_y = lambda x: muro_pe(x) - 44
    letras = []
    for ch, x, alt, inc, c1, c2 in LETRAS:
        fs = alt / .74                                     # (a altura das maiúsculas da Lilita é ~0,74 do corpo)
        y = pe_y(x + alt * .3)
        letras.append((ch, x, y, fs, inc, c1, c2))
    def txt(ch, x, y, fs, inc, extra):
        return ('<text x="0" y="0" font-family="LilitaOne" font-size="%s" transform="translate(%s %s) skewX(%s) scale(.92 1)"%s>%s</text>'
                % (f(fs), f(x), f(y), f(inc * 1.6 - 8), extra, ch))
    # a névoa do spray atrás das letras
    S('<g filter="%s" opacity=".75">%s</g>' % (S.borra(9), ''.join(txt(ch, x, y, fs, inc, ' fill="%s" stroke="%s" stroke-width="26"' % (c2, c2)) for ch, x, y, fs, inc, c1, c2 in letras)))
    # cada letra inteira, da esquerda para a direita (a de depois pinta por cima da de antes, como no muro): o volume, o
    # contorno escuro, a tinta em degradê e o fio claro de dentro
    for ch, x, y, fs, inc, c1, c2 in letras:
        S(txt(ch, x + 7, y + 8, fs, inc, ' fill="#1a0a26" stroke="#1a0a26" stroke-width="16" stroke-linejoin="round"'))
        S(txt(ch, x, y, fs, inc, ' fill="#24103a" stroke="#24103a" stroke-width="14" stroke-linejoin="round"'))
        g = S.lin([(0, mistura(c1, '#ffffff', .18), 1), (.45, c1, 1), (1, c2, 1)])
        S(txt(ch, x, y, fs, inc, ' fill="%s"' % g))
        S(txt(ch, x, y, fs, inc, ' fill="none" stroke="#ffe6ff" stroke-width="2.2" stroke-linejoin="round" opacity=".5"'))
    r = random.Random(23)
    brilhos = []
    for ch, x, y, fs, inc, c1, c2 in letras:
        a = fs * .74
        for _ in range(3):
            bx, by = x + fs * (.12 + r.random() * .3), y - a * (.55 + r.random() * .35)
            brilhos.append('<path d="M%s %s q%s %s %s %s" stroke="#ffffff" stroke-width="%s" stroke-linecap="round" fill="none" opacity="%s"/>'
                           % (f(bx), f(by), f(6), f(-4), f(14), f(-6), f(2.4 + r.random() * 2), f(.5 + r.random() * .4)))
        brilhos.append('<circle cx="%s" cy="%s" r="%s" fill="#ffffff" opacity=".85"/>' % (f(x + fs * .42), f(y - a * .78), f(2.4)))
    S('<g>%s</g>' % ''.join(brilhos))
    # os escorridos (a tinta escorrendo das letras)
    pingos = []
    for ch, x, y, fs, inc, c1, c2 in letras:
        for _ in range(3 + r.randint(0, 2)):
            px = x + fs * (.08 + r.random() * .48)
            L = 10 + r.random() * 28
            w = 2.4 + r.random() * 2.4
            pingos.append('<path d="M%s %s v%s" stroke="%s" stroke-width="%s" stroke-linecap="round"/>' % (f(px), f(y - 4), f(L), c2, f(w)))
            pingos.append('<circle cx="%s" cy="%s" r="%s" fill="%s"/>' % (f(px), f(y - 4 + L), f(w * .75), c2))
    S('<g>%s</g>' % ''.join(pingos))
    # a coroa dourada em cima do R (inclinada como a letra)
    cx, cy = 648, muro_topo(648) + 22
    coroa = [(-30, 18), (-34, -14), (-15, 2), (0, -24), (15, 2), (34, -14), (30, 18)]
    d = pts_d([(cx + a, cy + b) for a, b in coroa])
    S('<g transform="rotate(-12 %s %s)">' % (f(cx), f(cy)))
    S.path(d, '#ffb02a', stroke='#ffb02a', stroke_width='18', stroke_linejoin='round', opacity='.35', filter=S.borra(6))
    S.path(d, '#1a0a26', stroke='#1a0a26', stroke_width='11', stroke_linejoin='round', transform='translate(4 5)')
    S.path(d, S.lin([(0, '#ffe38a', 1), (.55, '#ffb52e', 1), (1, '#e07a12', 1)]), stroke='#2a1206', stroke_width='4.5', stroke_linejoin='round')
    S.rect(cx - 30, cy + 10, 60, 8, '#c86a10', opacity='.7')
    for a, b in ((-34, -14), (0, -24), (34, -14)):
        S.circ(cx + a, cy + b, 4.5, '#fff1b0', stroke='#2a1206', stroke_width='2')
    S('</g>')


# ================================================================================================ o Bar do Seu Zé
def bar(S):
    B = BAR
    x0, x1, t, p = B['x0'] - BAR_DX, B['x1'] - BAR_DX, B['topo'], B['pe']      # (dentro do grupo deslocado: as contas de antes)
    r = random.Random(91)
    S('<g transform="translate(%d 0)">' % BAR_DX)
    # a parede acesa por dentro (a luz da lâmpada no meio de cima)
    S.rect(x0, t, x1 - x0, p - t + 6, S.rad([(0, '#ffc066', 1), (.35, '#f2943e', 1), (.75, '#c4622c', 1), (1, '#7a3a24', 1)], 1762, 330, 260, sy=.9))
    for _ in range(45):
        S.elip(x0 + r.random() * (x1 - x0), t + r.random() * (p - t), 4 + r.random() * 14, 3 + r.random() * 8, '#7a3a1a', opacity=f(.08 + r.random() * .15))
    S.rect(x1 - 14, t, 14, p - t + 6, '#5a2a1a', opacity='.55')
    # o letreiro pintado à mão
    S('<g transform="rotate(-8 1780 392)" font-family="LilitaOne" fill="#3a170c" opacity=".92">'
      '<text x="1733" y="384" font-size="34" letter-spacing="1">BAR DO</text><text x="1741" y="424" font-size="34" letter-spacing="1">SEU ZÉ</text></g>')
    S.path('M1700 362 q6 -10 14 0 q-4 8 -14 0z', '#3a170c', opacity='.6')
    # a porta escura e quem está nela
    S.rect(1664, 410, 48, 152, S.lin([(0, '#3a1c12', 1), (1, '#1a0c0a', 1)]))
    S.rect(1660, 406, 56, 6, '#5a2a18')
    gente(S, 1690, 492, 1.05, em_pe=True)
    # a lâmpada (o tubo) e a luz dela
    S.rect(1736, 333, 52, 7, '#fffbe8', rx='3')
    S.circ(1762, 338, 60, '#ffd890', opacity='.55', filter=S.borra(18))
    # o toldo (telha azul ondulada), inclinado, e o pedaço de cima da bandeira
    toldo = [(1592, 350), (1870, 252), (1880, 272), (1602, 374)]
    S.poli(toldo, S.lin([(0, '#3a64a8', 1), (1, '#1f3a70', 1)]))
    S.path(' '.join('M%s %s L%s %s' % (f(1600 + i * 14), f(358 - i * 4.8), f(1606 + i * 14), f(372 - i * 4.8)) for i in range(20)), 'none', stroke='#6a92d0', stroke_width='2', opacity='.55')
    S.poli([(1604, 372), (1878, 276), (1878, 280), (1606, 378)], '#ffcf8a', opacity='.6')
    S('</g><g transform="translate(%d 0)">' % BANDEIRA_DX)
    # o toldinho da bandeira, a bandeira e as cadeiras empilhadas na frente do alambrado (sem encostar na trave)
    S.poli([(1478, 392), (1612, 372), (1614, 384), (1480, 406)], S.lin([(0, '#33599a', 1), (1, '#1d3668', 1)]))
    S.path(' '.join('M%s %s L%s %s' % (f(1484 + i * 13), f(391 - i * 1.9), f(1486 + i * 13), f(402 - i * 1.9)) for i in range(10)), 'none', stroke='#6a92d0', stroke_width='1.6', opacity='.5')
    bandeira(S, BANDEIRA['x0'] - BANDEIRA_DX, BANDEIRA['topo'], BANDEIRA['x1'] - BANDEIRA['x0'], BANDEIRA['pe'] - BANDEIRA['topo'])
    cadeiras_empilhadas(S)
    S('</g><g transform="translate(%d 0)">' % BAR_DX)
    # as mesas, as cadeiras vermelhas, a gente sentada
    cadeiras(S, r)
    gente(S, 1742, 494, .92)
    gente(S, 1788, 488, .98)
    # a moto
    moto(S, 1642, 572)
    # a escada de cimento na frente e o cachorro
    for i, (yy, xx) in enumerate(((548, 1640), (574, 1618))):
        S.rect(xx, yy, 1870 - xx, 30, S.lin([(0, '#7a5a58', 1), (.2, '#4a3c4c', 1), (1, '#2c2436', 1)]))
        S.rect(xx, yy, 1870 - xx, 3, '#ffb070', opacity='.45')
    cachorro(S, 1728, 584)
    S('</g>')


def bandeira(S, x, y, w, h):
    """a bandeira do Brasil pendurada (com as dobras e a luz da tarde por cima)"""
    i = S.novo_id('c')
    onda = 'M%s %s Q%s %s %s %s Q%s %s %s %s L%s %s Q%s %s %s %s Q%s %s %s %s Z' % (
        f(x), f(y), f(x + w * .25), f(y - 3), f(x + w * .5), f(y), f(x + w * .75), f(y + 3), f(x + w), f(y),
        f(x + w), f(y + h), f(x + w * .75), f(y + h + 4), f(x + w * .5), f(y + h), f(x + w * .25), f(y + h - 4), f(x), f(y + h))
    S.defs.append('<clipPath id="%s"><path d="%s"/></clipPath>' % (i, onda))
    S('<g clip-path="url(#%s)">' % i)
    S.rect(x, y - 6, w, h + 12, '#0e8a3c')
    m = 8.5 * w / 100
    S.poli([(x + w / 2, y + m * .7), (x + w - m, y + h / 2), (x + w / 2, y + h - m * .7), (x + m, y + h / 2)], '#f4d21a')
    cx, cy, rr = x + w / 2, y + h / 2, h * .25
    S.circ(cx, cy, rr, '#1c3a8a')
    S.path('M%s %s Q%s %s %s %s' % (f(cx - rr), f(cy - rr * .1), f(cx), f(cy - rr * .62), f(cx + rr), f(cy + rr * .25)), 'none', stroke='#f2f2f2', stroke_width=f(rr * .2))
    for k in range(9):
        S.circ(cx - rr * .55 + (k % 3) * rr * .5 + (k // 3) * 3, cy + rr * .25 + (k // 3) * rr * .2, .9, '#ffffff', opacity='.85')
    for k in range(5):                                         # as dobras
        S.rect(x + w * (k + .5) / 5 - 4, y - 6, 8, h + 12, '#000000', opacity='.14', filter=S.borra(3))
    S.rect(x, y - 6, w, h + 12, S.lin([(0, '#ffb070', .22), (1, '#1a0a20', .3)], 0, 0, 1, 1))
    S('</g>')
    S.path(onda, 'none', stroke='#0a2a14', stroke_width='1.5', opacity='.6')
    S.path('M%s %s L%s %s M%s %s L%s %s' % (f(x + 4), f(y), f(x + 2), f(y - 12), f(x + w - 4), f(y), f(x + w - 2), f(y - 18)), 'none', stroke='#1a1424', stroke_width='1.6')


def cadeiras(S, r):
    def cadeira(x, y, k=1.0, vira=1):
        c, c2 = '#c8202c', '#ff5a5a'
        S.rect(x, y, 22 * k, 4 * k, c2)                                     # o assento
        S.rect(x + (0 if vira > 0 else 18 * k), y - 20 * k, 4 * k, 22 * k, c)   # o encosto
        S.rect(x + (0 if vira > 0 else 4 * k), y - 20 * k, 18 * k, 5 * k, c)
        S.rect(x + 1 * k, y + 4 * k, 3 * k, 16 * k, c); S.rect(x + 18 * k, y + 4 * k, 3 * k, 16 * k, c)
    def mesa(x, y, k=1.0):
        S.rect(x, y, 46 * k, 5 * k, '#e02a34'); S.rect(x, y, 46 * k, 2 * k, '#ff7a6a')
        S.rect(x + 4 * k, y + 5 * k, 3 * k, 24 * k, '#a81a24'); S.rect(x + 39 * k, y + 5 * k, 3 * k, 24 * k, '#a81a24')
    # as de trás (perto do bar)
    mesa(1730, 512); cadeira(1712, 520, 1, 1); cadeira(1780, 516, 1, -1)
    mesa(1800, 506, .9); cadeira(1840, 512, .9, -1)
    S.rect(1740, 498, 6, 14, '#e8d090', opacity='.9'); S.rect(1756, 500, 6, 12, '#9ad0a0', opacity='.8')     # as garrafas


def cadeiras_empilhadas(S):
    """as cadeiras da esquerda (empilhadas, na frente do alambrado, embaixo da bandeira)"""
    def cadeira(x, y, k=1.0):
        c, c2 = '#c8202c', '#ff5a5a'
        S.rect(x, y, 22 * k, 4 * k, c2); S.rect(x, y - 20 * k, 4 * k, 22 * k, c); S.rect(x, y - 20 * k, 18 * k, 5 * k, c)
        S.rect(x + 1 * k, y + 4 * k, 3 * k, 16 * k, c); S.rect(x + 18 * k, y + 4 * k, 3 * k, 16 * k, c)
    for k in range(4):
        cadeira(1474 + k * 26, 540 + (k % 2) * 3, .95)
    for k in range(3):
        cadeira(1490 + k * 28, 554, 1)


def gente(S, x, pe, k=1.0, em_pe=False):
    """uma pessoa em silhueta (sem rosto), com a luz quente do bar na beirada"""
    c, luz = '#2a1418', '#ffa860'
    if em_pe:
        S.path('M%s %s L%s %s L%s %s L%s %s Z' % (f(x - 9 * k), f(pe), f(x - 7 * k), f(pe - 40 * k), f(x + 7 * k), f(pe - 40 * k), f(x + 9 * k), f(pe)), c)
        S.rect(x - 1 * k, pe - 30 * k, 2 * k, 30 * k, '#140a0e')
        S.path('M%s %s Q%s %s %s %s L%s %s Q%s %s %s %s Z' % (f(x - 13 * k), f(pe - 38 * k), f(x - 14 * k), f(pe - 70 * k), f(x), f(pe - 72 * k),
                                                         f(x + 1 * k), f(pe - 72 * k), f(x + 14 * k), f(pe - 70 * k), f(x + 13 * k), f(pe - 38 * k)), c)
        S.path('M%s %s q%s %s %s %s' % (f(x + 13 * k), f(pe - 66 * k), f(4 * k), f(12 * k), f(2 * k), f(26 * k)), 'none', stroke=c, stroke_width=f(6 * k), stroke_linecap='round')
        S.rect(x - 3 * k, pe - 78 * k, 6 * k, 7 * k, c)
        S.circ(x, pe - 84 * k, 8 * k, c)
        S.path('M%s %s q%s %s %s %s' % (f(x + 12 * k), f(pe - 68 * k), f(3 * k), f(14 * k), f(1 * k), f(28 * k)), 'none', stroke=luz, stroke_width=f(1.6 * k), opacity='.75')
        S.path('M%s %s a%s %s 0 0 1 %s %s' % (f(x + 3 * k), f(pe - 91 * k), f(8 * k), f(8 * k), f(5 * k), f(8 * k)), 'none', stroke=luz, stroke_width=f(1.5 * k), opacity='.75')
    else:
        S.path('M%s %s L%s %s L%s %s L%s %s Z' % (f(x - 12 * k), f(pe - 20 * k), f(x + 12 * k), f(pe - 22 * k), f(x + 14 * k), f(pe), f(x + 6 * k), f(pe)), c)   # as pernas
        S.path('M%s %s Q%s %s %s %s L%s %s Q%s %s %s %s Z' % (f(x - 12 * k), f(pe - 18 * k), f(x - 14 * k), f(pe - 48 * k), f(x), f(pe - 50 * k),
                                                         f(x + 2 * k), f(pe - 50 * k), f(x + 13 * k), f(pe - 46 * k), f(x + 11 * k), f(pe - 18 * k)), c)
        S.path('M%s %s q%s %s %s %s' % (f(x + 10 * k), f(pe - 44 * k), f(10 * k), f(6 * k), f(18 * k), f(12 * k)), 'none', stroke=c, stroke_width=f(6 * k), stroke_linecap='round')
        S.rect(x - 3 * k, pe - 56 * k, 6 * k, 7 * k, c)
        S.circ(x, pe - 62 * k, 8 * k, c)
        S.path('M%s %s q%s %s %s %s' % (f(x + 11 * k), f(pe - 46 * k), f(3 * k), f(12 * k), f(0), f(26 * k)), 'none', stroke=luz, stroke_width=f(1.5 * k), opacity='.7')
        S.path('M%s %s a%s %s 0 0 1 %s %s' % (f(x + 3 * k), f(pe - 69 * k), f(8 * k), f(8 * k), f(5 * k), f(8 * k)), 'none', stroke=luz, stroke_width=f(1.4 * k), opacity='.7')


def moto(S, x, chao):
    """a moto parada (vermelha), de lado"""
    rr = 21
    for cx in (x - 36, x + 42):
        S.circ(cx, chao - rr, rr, '#120c12')
        S.circ(cx, chao - rr, rr - 6, 'none', stroke='#6a5a6a', stroke_width='2')
        S.circ(cx, chao - rr, 4, '#9a8a9a')
    S.path('M%s %s L%s %s L%s %s L%s %s Z' % (f(x - 36), f(chao - rr), f(x - 6), f(chao - 44), f(x + 26), f(chao - 44), f(x + 42), f(chao - rr)), 'none', stroke='#2a1a20', stroke_width='5')
    S.path('M%s %s q%s %s %s %s l%s %s q%s %s %s %s z' % (f(x - 18), f(chao - 50), f(10), f(-16), f(36), f(-14), f(10), f(10), f(-10), f(10), f(-46), f(4)), S.lin([(0, '#ff4a4a', 1), (1, '#a01020', 1)]))
    S.path('M%s %s l%s %s' % (f(x - 40), f(chao - 56), f(24), f(4)), 'none', stroke='#1a1016', stroke_width='7', stroke_linecap='round')   # o banco
    S.path('M%s %s l%s %s l%s %s' % (f(x + 28), f(chao - 62), f(10), f(-22), f(10), f(-4)), 'none', stroke='#2a2026', stroke_width='3.5', stroke_linecap='round')   # o guidão
    S.circ(x + 46, chao - 74, 4.5, '#fff4d0')
    S.circ(x + 46, chao - 74, 12, '#fff0c0', opacity='.5', filter=S.borra(5))
    S.path('M%s %s q%s %s %s %s' % (f(x - 30), f(chao - 64), f(30), f(-14), f(62), f(-6)), 'none', stroke='#ffb070', stroke_width='1.6', opacity='.7')


def cachorro(S, x, y):
    """o vira-lata deitado no degrau"""
    c = '#7a4a2a'
    S.elip(x, y + 8, 34, 10, c)
    S.path('M%s %s q%s %s %s %s q%s %s %s %s z' % (f(x + 26), f(y + 4), f(8), f(-14), f(22), f(-10), f(6), f(10), f(-8), f(16)), c)      # a cabeça
    S.path('M%s %s l%s %s l%s %s z' % (f(x + 38), f(y - 7), f(6), f(-9), f(2), f(10)), '#5a3018')                                         # a orelha
    S.path('M%s %s q%s %s %s %s' % (f(x - 32), f(y + 8), f(-12), f(-2), f(-16), f(8)), 'none', stroke=c, stroke_width='4', stroke_linecap='round')
    S.elip(x - 4, y + 2, 24, 5, '#ffb070', opacity='.35')
    S.elip(x, y + 18, 40, 5, '#000000', opacity='.3', filter=S.borra(3))


# ================================================================================================ a quadra molhada
def linha_fundo_y(x):
    return LINHA_FUNDO + .000034 * (x - 1200) ** 2


def quadra(S):
    r = random.Random(101)
    # o piso de asfalto molhado (atrás mais claro: o céu e as luzes refletidos; na frente mais escuro)
    S.rect(-60, 528, W + 120, 520, S.lin([(0, '#4a3352', 1), (.1, '#3c2c48', 1), (.32, '#2a2036', 1), (.62, '#1c1628', 1), (1, '#100c18', 1)], 0, 528, 0, 1000, uso=True))
    # o céu refletido no fundo da quadra (laranja no meio, rosa dos lados)
    S.rect(-60, 556, W + 120, 170, S.rad([(0, '#ff9a4a', .42), (.5, '#e0507a', .16), (1, '#8a2a6a', 0)], 1380, 600, 900, sy=.2))
    # os espelhos borrados do que fica em pé (o grafite, a favela acesa, o bar) — o chão molhado repete as cores de cima
    for x0, x1, cor, op in ((590, 700, '#b04ae0', .42), (700, 820, '#e04ab8', .38), (820, 920, '#ff5a6a', .34), (920, 1030, '#ff8a3a', .34),
                            (1040, 1600, '#ffb060', .12), (1570, 1810, '#ff9a40', .5)):
        S.rect(x0, 560, x1 - x0, 150, S.lin([(0, cor, op), (1, cor, 0)], 0, 560, 0, 710, uso=True), filter=S.borra(14, 22))
    reflexos(S)
    # o asfalto que já secou (os riscos escuros que quebram os reflexos: é o que faz parecer molhado)
    secos = []
    for _ in range(520):
        y = 570 + (r.random() ** 1.25) * 430
        x = r.random() * W
        k = .6 + (y - 560) / 440 * 1.4
        secos.append('<ellipse cx="%s" cy="%s" rx="%s" ry="%s" opacity="%s"/>' % (f(x), f(y), f((10 + r.random() * 46) * k), f((1.2 + r.random() * 2.6) * k), f(.25 + r.random() * .45)))
    S('<g fill="#181222">%s</g>' % ''.join(secos))
    # as poças (lisas: o reflexo mais forte)
    for _ in range(18):
        x, y = r.random() * W, 610 + r.random() * 360
        S.elip(x, y, 70 + r.random() * 170, 7 + r.random() * 14, '#5a4078', opacity=f(.1 + r.random() * .12), filter=S.borra(4))
    # o grão do asfalto
    grao = []
    for _ in range(2600):
        x, y = r.random() * W, 560 + r.random() * 440
        grao.append('<rect x="%s" y="%s" width="%s" height="%s" fill="%s" opacity="%s"/>' % (f(x), f(y), f(1 + r.random() * 2), f(1 + r.random() * 1.2), r.choice(['#0a0710', '#6a5a7a', '#2a2236']), f(.2 + r.random() * .4)))
    S('<g>%s</g>' % ''.join(grao))
    # as rachaduras
    for _ in range(18):
        x, y = r.random() * W, 620 + r.random() * 360
        d = 'M%s %s' % (f(x), f(y))
        for k in range(5):
            x += (r.random() - .3) * 40; y += (r.random() - .5) * 8
            d += ' L%s %s' % (f(x), f(y))
        S.path(d, 'none', stroke='#0a0610', stroke_width=f(.8 + r.random()), opacity='.55')
    brilhinhos(S)
    linhas(S)


def coluna(S, x, y0, cor, op, w, comp):
    """o reflexo de uma luz no chão molhado: o halo largo e o miolo forte, sumindo para a frente"""
    S.rect(x - w, y0, 2 * w, comp, S.lin([(0, cor, op * .7), (.35, cor, op * .4), (1, cor, 0)], 0, y0, 0, y0 + comp, uso=True), filter=S.borra(w * .42, 12))
    S.rect(x - w * .2, y0, w * .4, comp * .85, S.lin([(0, mistura(cor, '#ffffff', .35), min(1, op * 1.25)), (.5, cor, op * .55), (1, cor, 0)], 0, y0, 0, y0 + comp * .85, uso=True), filter=S.borra(max(2, w * .1), 6))


def reflexos(S):
    r = random.Random(5)
    # o roxo ambiente em volta da tampinha (o jogo põe a luz dela por cima)
    S.elip(1200, 742, 440, 96, S.rad([(0, '#9a4cff', .38), (.5, '#7a34d0', .16), (1, '#5a20a0', 0)], 1200, 742, 440, sy=.22))
    # o grafite (rosa e roxo), o poste da esquerda, o refletor, o bar, a lâmpada do bar, as janelas do meio e as traves
    for x, cor, op in ((640, '#c050f0', .5), (740, '#ee50c8', .45), (830, '#ff5a8a', .42), (905, '#ff7a3a', .42), (985, '#ffa040', .42)):
        coluna(S, x, 556, cor, op, 34, 380)
    coluna(S, 816, 560, '#ffc070', .75, 30, 430)
    coluna(S, 1702, 600, '#fff2d0', .75, 36, 400)
    coluna(S, 1628, 600, '#ffd8a0', .35, 26, 300)          # (o farol da moto)
    coluna(S, 1700, 606, '#ff9a40', .8, 92, 390)
    coluna(S, 1702, 606, '#ffe6b0', .55, 26, 340)
    coluna(S, 1480, 592, '#ffc070', .3, 34, 280)
    for x in (1298, 1418):
        coluna(S, x, 584, '#f4f0ff', .4, 6, 150)
    for _ in range(34):
        x = 1030 + r.random() * 580
        coluna(S, x, 586, r.choice(ACESAS), .2 + r.random() * .2, 4 + r.random() * 5, 110 + r.random() * 150)
    for _ in range(16):
        x = 300 + r.random() * 280
        coluna(S, x, 590, r.choice(ACESAS), .18 + r.random() * .18, 5 + r.random() * 5, 140 + r.random() * 140)
    # a luz quente do bar espalhada no chão
    S.elip(1700, 640, 320, 80, S.rad([(0, '#ffa04a', .42), (1, '#ff9a4a', 0)], 1700, 640, 320, sy=.25))
    S.elip(816, 600, 200, 40, S.rad([(0, '#ffb060', .35), (1, '#ffb060', 0)], 816, 600, 200, sy=.2))


def brilhinhos(S):
    """os pontinhos de brilho na água (as luzes quebradas pelo asfalto)"""
    r = random.Random(55)
    fontes = [(640, '#e070ff'), (740, '#ff70d0'), (830, '#ff7a9a'), (905, '#ff9a5a'), (985, '#ffb860'), (816, '#ffd08a'),
              (1702, '#fff6e0'), (1700, '#ffc070'), (1640, '#ffb060'), (1740, '#ff9a40')]
    b = []
    for _ in range(260):
        x0, cor = r.choice(fontes)
        y = 575 + (r.random() ** 1.6) * 360
        x = x0 + (r.random() - .5) * (30 + (y - 560) * .25)
        b.append('<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="%s" opacity="%s"/>' % (f(x), f(y), f(2 + r.random() * 8), f(.7 + r.random() * 1.1), cor, f(.35 + r.random() * .55)))
    S('<g>%s</g>' % ''.join(b))


def linhas(S):
    giz = '#ece8f2'
    # a linha de fundo (curva de leve nas pontas)
    S.path(pts_d([(x, linha_fundo_y(x)) for x in range(-60, W + 61, 30)], False), 'none', stroke=giz, stroke_width='4.2', opacity='.78')
    # o círculo central (em perspectiva) e a linha do meio (mais grossa na frente)
    C = CIRCULO
    S.elip(C['cx'], C['cy'], C['rx'], C['ry'], 'none', stroke=giz, stroke_width='5.5', opacity='.86')
    S.elip(C['cx'], C['cy'], C['rx'], C['ry'], 'none', stroke='#ffffff', stroke_width='12', opacity='.12', filter=S.borra(4))
    S.poli([(1198, LINHA_FUNDO), (1203, LINHA_FUNDO), (1224, 1000), (1206, 1000)], giz, opacity='.86')
    # as meias-luas das áreas (nas pontas, quase escondidas pelas colunas de botões)
    S.path('M%s %s A 330 64 0 0 0 %s %s' % (f(-40), f(632), f(-40), f(800)), 'none', stroke=giz, stroke_width='4', opacity='.55')
    S.path('M%s %s A 340 64 0 0 1 %s %s' % (f(2440), f(636), f(2440), f(806)), 'none', stroke=giz, stroke_width='4', opacity='.55')
    S.path('M%s %s A 330 64 0 0 0 %s %s' % (f(80), f(640), f(80), f(780)), 'none', stroke=giz, stroke_width='3', opacity='0')
    # o reflexo das linhas no molhado (a luz do refletor passando)
    S.path(pts_d([(x, linha_fundo_y(x) + 6) for x in range(1500, 2000, 30)], False), 'none', stroke='#ffffff', stroke_width='3', opacity='.18', filter=S.borra(3))


def bola(S):
    B = BOLA
    x, y, rr = B['x'], B['y'], B['r']
    S.elip(x + 4, y + rr - 2, rr * 1.2, rr * .26, '#05030a', opacity='.6', filter=S.borra(3))
    # o reflexo no molhado
    S('<g opacity=".28" transform="translate(0 %s) scale(1 -.55) translate(0 %s)">' % (f(y + rr), f(-(y + rr))))
    S.circ(x, y, rr, '#f0eef8')
    S('</g>')
    g = S.rad([(0, '#ffffff', 1), (.55, '#e6e4f0', 1), (.85, '#a8a2c0', 1), (1, '#5a5470', 1)], x - rr * .35, y - rr * .4, rr * 1.35)
    S.circ(x, y, rr, g)
    i = S.novo_id('c')
    S.defs.append('<clipPath id="%s"><circle cx="%s" cy="%s" r="%s"/></clipPath>' % (i, f(x), f(y), f(rr)))
    S('<g clip-path="url(#%s)" fill="#1a1626">' % i)
    def penta(cx, cy, s, rot=0):
        return '<polygon points="%s"/>' % ' '.join('%s,%s' % (f(cx + s * math.cos(rot + k * 2 * math.pi / 5 - math.pi / 2)), f(cy + s * math.sin(rot + k * 2 * math.pi / 5 - math.pi / 2))) for k in range(5))
    S(penta(x - 2, y - 1, rr * .34) + penta(x - rr * .9, y - rr * .55, rr * .3, .5) + penta(x + rr * .72, y - rr * .78, rr * .3, .2)
      + penta(x + rr * .92, y + rr * .3, rr * .3, .9) + penta(x - rr * .1, y + rr * .98, rr * .3, .3) + penta(x - rr * .98, y + rr * .5, rr * .28, .7))
    S('</g>')
    S.circ(x, y, rr, 'none', stroke='#ff9a50', stroke_width='2.5', opacity='.5')          # a luz do bar na beirada
    S.elip(x - rr * .38, y - rr * .45, rr * .32, rr * .2, '#ffffff', opacity='.85')


# ================================================================================================ o acabamento
def acabamento(S):
    # o escuro de baixo (a fileira de baixo fica por cima) e o das beiradas
    S.rect(-60, 760, W + 120, 300, S.lin([(0, '#06040c', 0), (1, '#06040c', .55)], 0, 760, 0, 1000, uso=True))
    S.rect(-60, -60, W + 120, H + 120, S.rad([(0, '#000000', 0), (.62, '#000000', 0), (1, '#05030c', .45)], 1200, 520, 1500, sy=.62))
    # o entulho no canto de baixo à esquerda (embaixo da OFICINA e do PASSE)
    r = random.Random(8)
    for _ in range(9):
        x, y = 300 + r.random() * 360, 650 + r.random() * 60
        S.rect(x, y, 18 + r.random() * 34, 6 + r.random() * 8, r.choice(['#2a2030', '#33263a', '#1e1626']), opacity='.7', transform='rotate(%s %s %s)' % (f((r.random() - .5) * 24), f(x), f(y)))


def svg_cena101(x0=0, y0=0, w=W, h=H, px_w=None, px_h=None, escurece=0, borra=0):
    S = Svg()
    ceu(S)
    serras(S)
    corcovado(S)
    favela(S)
    predios_esq(S)
    direita(S)
    for xb, yb, xt, yt, e, sd in ((962, 420, 948, 116, 1.05, 1), (1009, 420, 1018, 128, 1.0, 2), (1085, 410, 1090, 184, .92, 3),
                                  (1040, 420, 1044, 258, .75, 4), (1135, 430, 1130, 300, .6, 5), (2030, 330, 2050, 182, .8, 6)):
        palmeira(S, xb, yb, xt, yt, e, seed=sd)
    postes(S)
    quadra(S)
    fundo_quadra(S)
    trave(S)
    muro(S)
    bar(S)
    bola(S)
    acabamento(S)
    corpo = ''.join(S.corpo)
    if borra:
        i = S.novo_id('b')
        S.defs.append('<filter id="%s" x="-5%%" y="-5%%" width="110%%" height="110%%"><feGaussianBlur stdDeviation="%s"/></filter>' % (i, f(borra)))
        corpo = '<g filter="url(#%s)">%s</g>' % (i, corpo)
    if escurece:
        corpo += '<rect x="%s" y="%s" width="%s" height="%s" fill="#0a0818" opacity="%s"/>' % (f(x0 - 10), f(y0 - 10), f(w + 20), f(h + 20), f(escurece))
    px_w, px_h = px_w or w, px_h or h
    return ('<svg xmlns="http://www.w3.org/2000/svg" width="%d" height="%d" viewBox="%s %s %s %s" preserveAspectRatio="xMidYMid slice">'
            '<defs>%s</defs>%s</svg>' % (px_w, px_h, f(x0), f(y0), f(w), f(h), ''.join(S.defs), corpo))


def info():
    return {'w': W, 'h': H, 'tampa': dict(TAMPA), 'circulo': dict(CIRCULO), 'chao_y': CHAO_Y, 'linha_fundo': LINHA_FUNDO,
            'meio': {'x0': 311, 'x1': 2089}, 'trave': dict(TRAVE), 'bola': dict(BOLA), 'bar': dict(BAR), 'placa_x1': 1790, 'bandeira': dict(BANDEIRA), 'grafite': dict(GRAFITE),
            'refletor': dict(REFLETOR), 'alambrado_y': ALAMBRADO_Y}
