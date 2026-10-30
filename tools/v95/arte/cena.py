"""RACHA v95 · A ARTE DESENHADA AQUI (sem imagem gerada por IA): a quadra da quebrada no fim da tarde.

O pedido: "deixe o jogo sem cara de IA, melhore os gráficos, o lobby...". Os fundos da v75, v77 e v91 saíam de imagens geradas
por IA (ver PROVENIENCIA.md). Esta cena é desenhada em código, como um cartaz de serigrafia: poucas cores chapadas, o céu em
faixas (do roxo do Time B ao laranja do Time A), o morro com as casinhas acesas, as casas de laje com caixa-d'água e vergalhão,
o alambrado, os refletores, as bandeirinhas nas cores dos times, o muro pintado (RACHA e o gol de parede) e a quadra azul com as
linhas de giz. Nada de brilho borrado nem de "render": o que é luz é forma chapada e transparente.

O mundo tem as medidas do fundo da v91 (2272 × 837, a tampinha do lobby no meio: x 1132, y 386, raio 205; o chão embaixo dela
em y 591) e continua para os lados, para cima e para baixo: cada imagem é uma janela (viewBox) desse mundo.
Uso: from cena import svg_cena  →  svg_cena(x0, y0, w, h, largura_px, altura_px, opcoes)
"""
import math, random

TINTA = '#0f1222'
CEU = ['#271c58', '#33226a', '#45287b', '#5e2e86', '#7d348a', '#a13f83', '#c74e72', '#e76659', '#fa8248', '#ff9c47']
SOL = ['#ffd77c', '#ffbf63', '#ffaa58']
MORRO = ['#3a2462', '#2f1d53', '#261846']
CASINHAS = ['#4b2f74', '#563682', '#44306c', '#5d3a7f', '#3f2b66']
FACHADAS = ['#c86a45', '#d79a52', '#5d78b0', '#b45c88', '#7f8a5e', '#d6c09c', '#a5512f', '#c97a3e', '#6d6fb3', '#9a5a3c']
JANELA_ESC, JANELA_ACESA = '#2a2142', '#ffd27a'
CAIXA = ('#2c7fc4', '#4fa3e0', '#1d5d96')
MURO = {'face': '#474c7e', 'topo': '#666ba0', 'base': '#33375e', 'junta': '#3c4172'}
CHAO = {'quadra': '#282c5c', 'fora': '#6e2f2a', 'linha': '#ebe6da', 'luz': '#323870', 'luz2': '#3b4284', 'rachado': '#20244b'}
TIMES = {'a': '#ff6a00', 'b': '#7a3fc4', 'giz': '#f3efe6', 'ama': '#ffcf2e'}

PALETAS = {
    'tarde': dict(CEU=CEU, SOL=SOL, MORRO=MORRO, CASINHAS=CASINHAS, ACESA=.36, TOM=None, ESTRELAS=0),
    'noite': dict(CEU=['#0b0e2a', '#0e1231', '#111538', '#14193f', '#171d47', '#1b214e', '#1f2656', '#232a5d', '#272f65', '#2c346d'],
                  SOL=None, MORRO=['#161b3f', '#121633', '#0e1229'], CASINHAS=['#1e2449', '#252c55', '#1b2043', '#2a2f5c', '#20264b'],
                  ACESA=.62, TOM=('#141a46', .42), ESTRELAS=1),
}
PAL = dict(PALETAS['tarde'])


def usa_paleta(nome):
    global CEU, SOL, MORRO, CASINHAS
    PAL.clear(); PAL.update(PALETAS[nome])
    CEU, SOL, MORRO, CASINHAS = PAL['CEU'], PAL['SOL'], PAL['MORRO'], PAL['CASINHAS']


CHAO_Y = 430          # o pé do muro (onde começa o chão)
MURO_Y = 318          # o alto do muro
LINHA_Y = 462         # a linha lateral da quadra (perto do muro)
CENTRO = (1136, 600)  # o meio da quadra (a tampinha do lobby fica em cima: o pé dela em y 591)
FUGA = (1136, 280)    # o ponto de fuga (as linhas que vão para longe do muro)


def mistura(a, b, t):
    a = [int(a[i:i + 2], 16) for i in (1, 3, 5)]; b = [int(b[i:i + 2], 16) for i in (1, 3, 5)]
    return '#' + ''.join('%02x' % round(a[i] + (b[i] - a[i]) * t) for i in range(3))


def f(v):
    return ('%.1f' % v).rstrip('0').rstrip('.')


class Svg:
    def __init__(self):
        self.defs, self.corpo = [], []

    def __call__(self, s):
        self.corpo.append(s)

    def rect(self, x, y, w, h, cor, **k):
        extra = ''.join(' %s="%s"' % (a.replace('_', '-'), v) for a, v in k.items())
        self('<rect x="%s" y="%s" width="%s" height="%s" fill="%s"%s/>' % (f(x), f(y), f(w), f(h), cor, extra))

    def poli(self, pts, cor, **k):
        extra = ''.join(' %s="%s"' % (a.replace('_', '-'), v) for a, v in k.items())
        self('<polygon points="%s" fill="%s"%s/>' % (' '.join(f(x) + ',' + f(y) for x, y in pts), cor, extra))

    def path(self, d, cor='none', **k):
        extra = ''.join(' %s="%s"' % (a.replace('_', '-'), v) for a, v in k.items())
        self('<path d="%s" fill="%s"%s/>' % (d, cor, extra))


# ------------------------------------------------------------------------------------------------ o céu, o sol e as nuvens
def ceu(S, x0, y0, w, h):
    fim = 330                                         # (o horizonte fica atrás do morro e das casas)
    topo = min(y0, -40)
    passo = (fim - 0) / len(CEU)
    S.rect(x0 - 10, topo - 10, w + 20, (0 - topo) + 12, '#16113a')
    for i, c in enumerate(('#241a55', '#211850', '#1e164a', '#1b1444', '#18123e')):   # (acima: a noite chegando, em faixas mais escuras)
        S.rect(x0 - 10, -80 * (i + 1) - .5, w + 20, 81.5, c)
    rnd = random.Random(3)                            # as estrelas (poucas, na parte de cima)
    for _ in range(int(w * max(0, 160 - topo) / 9000)):
        sx, sy = x0 + rnd.random() * w, topo + rnd.random() * (150 - topo)
        if sy > 150: continue
        S('<circle cx="%s" cy="%s" r="%s" fill="#fff6dc" opacity="%s"/>' % (f(sx), f(sy), f(.9 + rnd.random() * 1.5), f(.35 + rnd.random() * .55)))
    for i, c in enumerate(CEU):
        S.rect(x0 - 10, i * passo - 0.5, w + 20, passo + 1.5, c)
    S.rect(x0 - 10, fim, w + 20, 60, CEU[-1])
    # o sol, baixo, à direita (atrás do morro), com dois anéis chapados
    sx, sy = 1745, 258
    if SOL:
        for r, c in ((172, SOL[2]), (134, SOL[1]), (98, SOL[0])):
            S('<circle cx="%s" cy="%s" r="%s" fill="%s" opacity="%s"/>' % (sx, sy, r, c, '1' if r == 98 else '.55' if r == 134 else '.32'))
    else:                                             # (a lua minguante, no alto)
        S('<circle cx="1560" cy="70" r="34" fill="#fff1c7"/><circle cx="1576" cy="60" r="31" fill="%s"/>' % CEU[1])
    if PAL.get('ESTRELAS'):
        rr = random.Random(9)
        for _ in range(int(w / 9)):
            S('<circle cx="%s" cy="%s" r="%s" fill="#fff6dc" opacity="%s"/>' % (f(x0 + rr.random() * w), f(rr.random() * 240), f(.8 + rr.random() * 1.4), f(.3 + rr.random() * .6)))
    # as nuvens: faixas compridas e arredondadas, na cor da faixa de cima (luz de baixo: a beirada de baixo mais clara)
    rnd = random.Random(7)
    for cx, cy, cw, i in ((560, 92, 420, 3), (1500, 62, 360, 2), (2050, 128, 300, 4), (180, 150, 260, 5), (1150, 132, 230, 4), (2600, 70, 330, 2), (-320, 96, 300, 3)):
        c = CEU[min(len(CEU) - 1, i + 2)]
        luz = CEU[min(len(CEU) - 1, i + 4)] if SOL else CEU[min(len(CEU) - 1, i + 3)]
        hh = 22 + rnd.random() * 8
        S('<rect x="%s" y="%s" width="%s" height="%s" rx="%s" fill="%s"/>' % (f(cx - cw / 2), f(cy), f(cw), f(hh), f(hh / 2), c))
        S('<rect x="%s" y="%s" width="%s" height="%s" rx="%s" fill="%s"/>' % (f(cx - cw * .32), f(cy - hh * .7), f(cw * .5), f(hh), f(hh / 2), c))
        S('<rect x="%s" y="%s" width="%s" height="%s" rx="3" fill="%s"/>' % (f(cx - cw * .42), f(cy + hh - 5), f(cw * .78), 5, luz))


# ------------------------------------------------------------------------------------------------ o morro e as casinhas acesas
def morro_y(x):
    # duas corcovas (a da direita mais alta, com o sol atrás) e o vale no meio, atrás da tampinha
    return (300 - 150 * math.exp(-((x - 1720) / 520) ** 2) - 105 * math.exp(-((x - 420) / 420) ** 2)
            - 60 * math.exp(-((x - 2700) / 380) ** 2) - 70 * math.exp(-((x + 300) / 400) ** 2)
            + 6 * math.sin(x / 47) + 4 * math.sin(x / 13.3))


def morro(S, x0, x1):
    pts = [(x, morro_y(x)) for x in range(int(x0) - 20, int(x1) + 40, 12)]
    S.poli(pts + [(x1 + 40, 400), (x0 - 20, 400)], MORRO[0])
    # a encosta de trás (mais escura) só aparece nas corcovas
    pts2 = [(x, morro_y(x) + 34 + 10 * math.sin(x / 90)) for x in range(int(x0) - 20, int(x1) + 40, 12)]
    S.poli(pts2 + [(x1 + 40, 400), (x0 - 20, 400)], MORRO[1])
    rnd = random.Random(11)
    casas = []
    for _ in range(int((x1 - x0) / 2.6)):
        x = x0 + rnd.random() * (x1 - x0)
        topo = morro_y(x) + 8
        y = topo + rnd.random() * (330 - topo)
        if y > 326: continue
        w, h = 8 + rnd.random() * 14, 6 + rnd.random() * 9
        casas.append((y, x, w, h, rnd.choice(CASINHAS), rnd.random()))
    casas.sort()
    for y, x, w, h, c, r in casas:
        S.rect(x, y, w, h, c)
        S.rect(x, y - 2, w, 2, mistura(c, '#ffffff', .12))
        if r < .5:
            S.rect(x + w * .2, y + h * .3, 2.4, 3, JANELA_ACESA)
        if r < .18:
            S.rect(x + w * .62, y + h * .35, 2.4, 3, JANELA_ACESA)


# ------------------------------------------------------------------------------------------------ as casas (duas fileiras subindo o morro)
TIJOLO = '#a5512f'


def janela(S, rnd, jx, jy, jw, jh, cor, acesa, grade):
    S.rect(jx - 2, jy - 2, jw + 4, jh + 4, mistura(cor, TINTA, .55))
    S.rect(jx, jy, jw, jh, JANELA_ACESA if acesa else JANELA_ESC)
    if acesa:
        S.rect(jx, jy + jh * .55, jw, jh * .45, mistura(JANELA_ACESA, '#ff9a3d', .45))
    if grade:
        for k in range(1, 3):
            S.rect(jx + jw * k / 3 - .8, jy, 1.6, jh, mistura(cor, TINTA, .65))


def caixa_dagua(S, cx, base, cw, ch, contorno):
    S.rect(cx - cw / 2, base - ch, cw, ch, CAIXA[0], stroke=TINTA, stroke_width=contorno)
    S.rect(cx - cw / 2 + 2, base - ch + 2, cw * .26, ch - 3, CAIXA[2])
    S('<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="%s" stroke="%s" stroke-width="%s"/>' % (f(cx), f(base - ch), f(cw / 2 + 2), f(ch * .2), CAIXA[1], TINTA, contorno))


def bloco(S, rnd, x, w, topo, base, cor, contorno, detalhe=1.0, tijolo=False):
    """um bloco de casa: a face chapada, o contorno de tinta, a laje com a beirada e as janelas"""
    S.rect(x, topo, w, base - topo, cor, stroke=TINTA, stroke_width=contorno, stroke_linejoin='round')
    if tijolo:
        for k, yy in enumerate(range(int(topo) + 6, int(base), 7)):
            S.rect(x + 1.5, yy, w - 3, 1.1, mistura(cor, TINTA, .25))
            for xx in range(int(x) + (6 if k % 2 else 12), int(x + w) - 4, 14):
                S.rect(xx, yy - 6, 1.1, 6, mistura(cor, TINTA, .22))
    else:                                             # o reboco gasto: umas manchas chapadas
        for _ in range(int(w * (base - topo) / 2600 * detalhe)):
            mx, my = x + rnd.random() * (w - 16), topo + 6 + rnd.random() * (base - topo - 18)
            S.rect(mx, my, 10 + rnd.random() * 18, 6 + rnd.random() * 10, mistura(cor, '#ffffff' if rnd.random() < .5 else TINTA, .12))
    S.rect(x - 3, topo - 4, w + 6, 6, mistura(cor, '#ffffff', .22), stroke=TINTA, stroke_width=contorno * .8)
    if detalhe < .5: return
    jw, jh = (14, 18) if w > 60 else (10, 13)
    nj = max(1, int(w // 38))
    andares = max(1, int((base - topo - 12) // 40))
    for a in range(andares):
        for j in range(nj):
            if rnd.random() < .18: continue
            jx = x + (w / nj) * (j + .5) - jw / 2 + (rnd.random() - .5) * 6
            jy = topo + 12 + a * 40
            if jy + jh > base - 6: continue
            janela(S, rnd, jx, jy, jw, jh, cor, rnd.random() < PAL['ACESA'], rnd.random() < .3)


def casa(S, rnd, x, w, topo, base, cor, contorno, detalhe=1.0):
    tijolo = rnd.random() < .3
    tij = mistura(TIJOLO, PAL['TOM'][0], PAL['TOM'][1]) if PAL.get('TOM') else TIJOLO
    if tijolo: cor = tij
    bloco(S, rnd, x, w, topo, base, cor, contorno, detalhe, tijolo)
    if detalhe < .5: return
    r = rnd.random()
    # o "puxadinho": mais um andar em cima, menor, de outra cor ou no tijolo
    if r < .35 and w > 70:
        w2 = w * (.45 + rnd.random() * .3); x2 = x + (rnd.random() * (w - w2))
        h2 = 30 + rnd.random() * 26
        t2 = rnd.random() < .5
        cor2 = tij if t2 else rnd.choice(FACHADAS)
        if not t2 and PAL.get('TOM'): cor2 = mistura(cor2, PAL['TOM'][0], PAL['TOM'][1])
        bloco(S, rnd, x2, w2, topo - h2, topo - 2, cor2, contorno, detalhe, t2)
        topo2, xm, wm = topo - h2, x2, w2
    else:
        topo2, xm, wm = topo, x, w
    r2 = rnd.random()
    if r2 < .42:
        caixa_dagua(S, xm + wm * (.25 + rnd.random() * .5), topo2 - 3, 24 + rnd.random() * 8, 18 + rnd.random() * 6, contorno * .8)
    elif r2 < .72:                                    # a laje sem terminar: os vergalhões
        for k in range(3 + int(rnd.random() * 4)):
            vx = xm + 4 + rnd.random() * (wm - 8)
            S.rect(vx, topo2 - 8 - 6 - rnd.random() * 10, 2.2, 18, mistura(cor, TINTA, .6))
    elif r2 < .86:                                    # o telhado de fibrocimento (cinza, com as ondas)
        S.poli([(xm - 4, topo2 - 2), (xm + wm + 4, topo2 - 12), (xm + wm + 4, topo2 - 5), (xm - 4, topo2 + 5)], '#9aa0b4', stroke=TINTA, stroke_width=contorno * .8, stroke_linejoin='round')
        for k in range(1, int(wm // 9)):
            xx = xm - 4 + k * 9
            S.rect(xx, topo2 - 2 - (10 * k * 9 / (wm + 8)), 1.4, 7, '#7c8297')
    else:
        ax = xm + wm * .7
        S.rect(ax, topo2 - 40, 2.4, 36, TINTA)
        S.rect(ax - 10, topo2 - 34, 22, 2.4, TINTA)
        S.rect(ax - 6, topo2 - 26, 14, 2.4, TINTA)
    if rnd.random() < .2 and w > 90:                  # o varal
        vy = topo2 - 18
        S.path('M%s %s Q%s %s %s %s' % (f(xm + 6), f(vy), f(xm + wm / 2), f(vy + 8), f(xm + wm - 6), f(vy)), 'none', stroke=TINTA, stroke_width='1.6')
        for k in range(4):
            px = xm + 14 + k * (wm - 28) / 3
            S.rect(px - 6, vy + 3 + (2 if 0 < k < 3 else 0), 12, 14, rnd.choice(['#ff6a00', '#f3efe6', '#7a3fc4', '#ffcf2e', '#2c7fc4']), stroke=TINTA, stroke_width='1.2')
    if rnd.random() < .16 and w > 80:                 # a escada de fora (no lado)
        lado = 1 if rnd.random() < .5 else -1
        ex = x + (w if lado > 0 else 0)
        S.path('M%s %s L%s %s' % (f(ex), f(base - 6), f(ex + lado * 18), f(topo + 10)), 'none', stroke=TINTA, stroke_width='3')
        for k in range(1, 6):
            yy = base - 6 - (base - topo - 16) * k / 6
            xx = ex + lado * 18 * k / 6
            S.rect(min(xx, xx + lado * 10), yy, 10, 2.4, TINTA)


def fileira(S, semente, x0, x1, base, hmin, hmax, wmin, wmax, tom, contorno, detalhe, meio_baixo=1.0):
    rnd = random.Random(semente)
    x = x0 - 120
    while x < x1 + 120:
        w = wmin + rnd.random() * (wmax - wmin)
        h = hmin + rnd.random() * (hmax - hmin)
        if 880 < x + w / 2 < 1400: h *= meio_baixo     # (atrás da tampinha: mais baixas, o céu e o morro aparecem em volta dela)
        cor = rnd.choice(FACHADAS)
        if tom: cor = mistura(cor, tom[0], tom[1])
        if PAL.get('TOM'): cor = mistura(cor, PAL['TOM'][0], PAL['TOM'][1])
        b = base + rnd.random() * 10
        casa(S, rnd, x, w, b - h, b + 40, cor, contorno, detalhe)
        x += w + rnd.random() * 8 - 3


def casas(S, x0, x1):
    # a fileira de trás (mais longe: menores, com a cor puxada para o roxo do céu) e a da frente (atrás do alambrado)
    fileira(S, 41, x0, x1, 286, 40, 78, 44, 84, ('#5a3a86', .42), 1.6, .7, .8)
    fileira(S, 23, x0, x1, MURO_Y + 8, 62, 128, 74, 150, None, 2.6, 1.0, .62)


# ------------------------------------------------------------------------------------------------ os fios, o alambrado, os refletores
def fios(S, x0, x1):
    for (ax, ay, bx, by, s) in ((x0 - 50, 168, 760, 196, 30), (760, 196, 1530, 176, 38), (1530, 176, x1 + 50, 202, 30),
                                (x0 - 50, 186, 760, 206, 22), (760, 206, 1530, 190, 30), (1530, 190, x1 + 50, 214, 24)):
        S.path('M%s %s Q%s %s %s %s' % (f(ax), f(ay), f((ax + bx) / 2), f((ay + by) / 2 + s * 2), f(bx), f(by)), 'none', stroke='#1a1430', stroke_width='2.2')
    for px in (760, 1530):                             # os postes (concreto) com a cruzeta
        S.rect(px - 6, 160, 12, MURO_Y - 160, '#2c2448')
        S.rect(px - 26, 176, 52, 6, '#2c2448')
        S.rect(px - 6, 160, 3, MURO_Y - 160, '#3c3360')


def alambrado(S, x0, x1):
    S.defs.append('<pattern id="tela" width="18" height="18" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">'
                  '<rect width="18" height="18" fill="none"/><path d="M0 0H18M0 0V18" stroke="#d9dcf2" stroke-width="1.4" opacity=".55"/></pattern>')
    S.rect(x0 - 40, 236, x1 - x0 + 80, MURO_Y - 236, 'url(#tela)', opacity='.6')
    S.rect(x0 - 40, 232, x1 - x0 + 80, 6, '#2b3058')
    px = x0 - (x0 % 170) - 170
    while px < x1 + 170:
        S.rect(px - 4, 228, 8, MURO_Y - 228, '#2b3058', stroke=TINTA, stroke_width='2')
        px += 170


def refletor(S, x, lado):
    # o poste alto, a caixa dos refletores e o facho (chapado, transparente) até o meio da quadra
    S.rect(x - 9, 66, 18, MURO_Y - 66 + 4, '#262b50', stroke=TINTA, stroke_width='3')
    S.rect(x - 9, 66, 5, MURO_Y - 66, '#353b68')
    cw = 104
    S.rect(x - cw / 2, 38, cw, 46, '#1d2142', stroke=TINTA, stroke_width='4', rx='6')
    for i in range(3):
        for j in range(2):
            S.rect(x - cw / 2 + 9 + i * 31, 44 + j * 19, 24, 15, '#fff6d6', rx='3')
    alvo = CENTRO[0] + lado * 140
    S.poli([(x - 40, 84), (x + 40, 84), (alvo + 340, 760), (alvo - 340, 760)], '#fff4cf', opacity='.055')
    S.poli([(x - 22, 84), (x + 22, 84), (alvo + 170, 760), (alvo - 170, 760)], '#fff4cf', opacity='.05')


# ------------------------------------------------------------------------------------------------ as bandeirinhas
def bandeirinhas(S, ax, ay, bx, by, flecha, passo, deslize, tam=1.0):
    def ponto(t):
        cx, cy = (ax + bx) / 2, (ay + by) / 2 + flecha * 2
        return ((1 - t) ** 2 * ax + 2 * (1 - t) * t * cx + t * t * bx, (1 - t) ** 2 * ay + 2 * (1 - t) * t * cy + t * t * by)
    S.path('M%s %s Q%s %s %s %s' % (f(ax), f(ay), f((ax + bx) / 2), f((ay + by) / 2 + flecha * 2), f(bx), f(by)), 'none', stroke=TINTA, stroke_width='2.4')
    n = int(math.hypot(bx - ax, by - ay) / passo)
    cores = [TIMES['a'], TIMES['giz'], TIMES['b'], TIMES['ama']]
    for i in range(1, n):
        t = i / n
        (x, y), (x2, y2) = ponto(t), ponto(min(1, t + .01))
        ang = math.degrees(math.atan2(y2 - y, x2 - x))
        c = cores[(i + deslize) % 4]
        w, h = 30 * tam, 38 * tam
        S('<g transform="translate(%s %s) rotate(%s)"><polygon points="%s,0 %s,0 0,%s" fill="%s" stroke="%s" stroke-width="2.2" stroke-linejoin="round"/></g>'
          % (f(x), f(y), f(ang + (i * 37 % 11 - 5) * .6), f(-w / 2), f(w / 2), f(h), c, TINTA))


# ------------------------------------------------------------------------------------------------ o muro pintado
def muro(S, x0, x1, fonte):
    S.rect(x0 - 40, MURO_Y, x1 - x0 + 80, CHAO_Y - MURO_Y, MURO['face'])
    S.rect(x0 - 40, MURO_Y - 7, x1 - x0 + 80, 11, MURO['topo'])
    S.rect(x0 - 40, MURO_Y - 7, x1 - x0 + 80, 2.5, mistura(MURO['topo'], '#ffffff', .25))
    S.rect(x0 - 40, CHAO_Y - 10, x1 - x0 + 80, 10, MURO['base'])
    jx = x0 - (x0 % 230) - 230
    while jx < x1 + 230:
        S.rect(jx, MURO_Y + 4, 2.5, CHAO_Y - MURO_Y - 14, MURO['junta'])
        jx += 230
    # a faixa pintada de baixo (as cores dos times, gasta)
    S.rect(x0 - 40, CHAO_Y - 34, x1 - x0 + 80, 10, TIMES['b'], opacity='.55')
    S.rect(x0 - 40, CHAO_Y - 24, x1 - x0 + 80, 6, TIMES['a'], opacity='.55')
    # o RACHA pintado à mão (à esquerda da tampinha): tinta de muro (laranja com a sombra roxa), um pouco gasta
    S('<g font-family="%s" font-size="104" letter-spacing="3" transform="rotate(-2.5 720 380)" opacity=".92">'
      '<text x="566" y="414" fill="%s" stroke="%s" stroke-width="11" stroke-linejoin="round" paint-order="stroke">RACHA</text>'
      '<text x="558" y="406" fill="%s" stroke="%s" stroke-width="10" stroke-linejoin="round" paint-order="stroke">RACHA</text></g>'
      % (fonte, TIMES['b'], TINTA, TIMES['a'], TINTA))
    for k in range(5):                                # (os pingos da tinta)
        px = 590 + k * 63 + (k * 17 % 11)
        S.rect(px, 404 + (k % 3) * 2, 3, 8 + (k * 7 % 9), TIMES['a'], opacity='.8')
    # o gol de parede (à direita): as traves pintadas e a rede riscada
    gx0, gx1, gy = 1490, 1760, 340
    rede = []
    for k in range(1, 9):
        xx = gx0 + (gx1 - gx0) * k / 9
        rede.append('M%s %s V%s' % (f(xx), gy + 6, CHAO_Y - 12))
    for k in range(1, 5):
        yy = gy + 6 + (CHAO_Y - 12 - gy - 6) * k / 5
        rede.append('M%s %s H%s' % (gx0 + 6, f(yy), gx1 - 6))
    S.path(' '.join(rede), 'none', stroke=TIMES['giz'], stroke_width='2', opacity='.38')
    S.path('M%s %s V%s H%s V%s' % (gx0, CHAO_Y - 10, gy, gx1, CHAO_Y - 10), 'none', stroke=TINTA, stroke_width='15', stroke_linejoin='round')
    S.path('M%s %s V%s H%s V%s' % (gx0, CHAO_Y - 10, gy, gx1, CHAO_Y - 10), 'none', stroke=TIMES['giz'], stroke_width='9', stroke_linejoin='round')
    # umas marcas de bola no muro (as boladas)
    for bx, by in ((1580, 372), (1666, 392), (1610, 404), (402, 384), (452, 360)):
        S('<circle cx="%s" cy="%s" r="9" fill="none" stroke="%s" stroke-width="2.5" opacity=".28"/>' % (bx, by, TINTA))


# ------------------------------------------------------------------------------------------------ o chão da quadra
def chao(S, x0, x1, y1):
    S.rect(x0 - 40, CHAO_Y, x1 - x0 + 80, y1 - CHAO_Y + 40, CHAO['quadra'])
    S.rect(x0 - 40, CHAO_Y, x1 - x0 + 80, LINHA_Y - CHAO_Y, CHAO['fora'])
    S.rect(x0 - 40, CHAO_Y, x1 - x0 + 80, 6, mistura(CHAO['fora'], TINTA, .35))
    # a luz dos refletores no meio (chapada, em dois tons)
    cx, cy = CENTRO
    S('<ellipse cx="%s" cy="%s" rx="640" ry="175" fill="%s"/>' % (cx, cy + 6, CHAO['luz']))
    S('<ellipse cx="%s" cy="%s" rx="420" ry="112" fill="%s"/>' % (cx, cy + 4, CHAO['luz2']))
    # as linhas de giz: a lateral, a do meio (para longe do muro), o círculo do meio
    lin = CHAO['linha']
    S.rect(x0 - 40, LINHA_Y - 3, x1 - x0 + 80, 6, lin, opacity='.85')
    fx, fy = FUGA
    def fuga_x(xm, y):                                # a linha que nasce em (xm, LINHA_Y) e vai para perto da câmera
        return fx + (xm - fx) * (y - fy) / (LINHA_Y - fy)
    S.poli([(cx - 3, LINHA_Y), (cx + 3, LINHA_Y), (cx + 3 + 6, y1 + 40), (cx - 3 - 6, y1 + 40)], lin, opacity='.85')
    S('<ellipse cx="%s" cy="%s" rx="318" ry="84" fill="none" stroke="%s" stroke-width="6.5" opacity=".85"/>' % (cx, cy, lin))
    # as áreas, longe (as linhas que vão para longe do muro), dos dois lados
    for xm in (cx - 760, cx + 760):
        S.poli([(xm - 3, LINHA_Y), (xm + 3, LINHA_Y), (fuga_x(xm, y1 + 40) + 7, y1 + 40), (fuga_x(xm, y1 + 40) - 7, y1 + 40)], lin, opacity='.7')
    for lado in (-1, 1):
        xm = cx + lado * 1180
        S.poli([(xm - 3, LINHA_Y), (xm + 3, LINHA_Y), (fuga_x(xm, y1 + 40) + 7, y1 + 40), (fuga_x(xm, y1 + 40) - 7, y1 + 40)], lin, opacity='.6')
    # o desgaste: rachaduras finas e manchas
    rnd = random.Random(31)
    for _ in range(int((x1 - x0) / 120)):
        x = x0 + rnd.random() * (x1 - x0); y = LINHA_Y + 30 + rnd.random() * (y1 - LINHA_Y)
        d = 'M%s %s' % (f(x), f(y))
        for k in range(4):
            x += 14 + rnd.random() * 22; y += (rnd.random() - .5) * 18
            d += ' L%s %s' % (f(x), f(y))
        S.path(d, 'none', stroke=CHAO['rachado'], stroke_width='2', opacity='.7', stroke_linecap='round')
    for _ in range(int((x1 - x0) / 160)):
        x = x0 + rnd.random() * (x1 - x0); y = LINHA_Y + 40 + rnd.random() * (y1 - LINHA_Y)
        S('<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="#ffffff" opacity=".035"/>' % (f(x), f(y), f(40 + rnd.random() * 90), f(10 + rnd.random() * 18)))


# ------------------------------------------------------------------------------------------------ as coisas no chão: a bola e os chinelos
def bola(S, x, y, r):
    S('<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="%s" opacity=".55"/>' % (f(x + r * .2), f(y + r * .95), f(r * 1.05), f(r * .3), TINTA))
    S('<circle cx="%s" cy="%s" r="%s" fill="#f3efe6" stroke="%s" stroke-width="3"/>' % (f(x), f(y), f(r), TINTA))
    pent = lambda cx, cy, rr, a0: ' '.join(f(cx + math.cos(a0 + k * 2 * math.pi / 5) * rr) + ',' + f(cy + math.sin(a0 + k * 2 * math.pi / 5) * rr) for k in range(5))
    S('<polygon points="%s" fill="%s"/>' % (pent(x - r * .08, y - r * .05, r * .34, -math.pi / 2), TINTA))
    for k in range(5):
        a = -math.pi / 2 + math.pi / 5 + k * 2 * math.pi / 5
        S('<polygon points="%s" fill="%s"/>' % (pent(x + math.cos(a) * r * .86, y + math.sin(a) * r * .86, r * .26, a + math.pi), TINTA))
    S('<circle cx="%s" cy="%s" r="%s" fill="none" stroke="%s" stroke-width="3"/>' % (f(x), f(y), f(r), TINTA))
    S('<path d="M%s %s A%s %s 0 0 1 %s %s" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" opacity=".7"/>' % (f(x - r * .55), f(y - r * .35), f(r * .7), f(r * .7), f(x - r * .1), f(y - r * .68)))


def chinelo(S, x, y, ang, cor):
    S('<g transform="translate(%s %s) rotate(%s)">'
      '<ellipse cx="2" cy="4" rx="34" ry="12" fill="%s" opacity=".45"/>'
      '<path d="M-32 0 C-32 -12 -8 -13 6 -10 C20 -8 33 -8 33 0 C33 8 20 9 6 10 C-8 13 -32 12 -32 0Z" fill="%s" stroke="%s" stroke-width="3" stroke-linejoin="round"/>'
      '<path d="M-28 0 C-28 -8 -8 -9 6 -7 C18 -5 28 -5 28 0 C28 5 18 6 6 7 C-8 9 -28 8 -28 0Z" fill="%s"/>'
      '<path d="M14 -6 L-4 0 L14 6" fill="none" stroke="%s" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></g>'
      % (f(x), f(y), f(ang), TINTA, mistura(cor, TINTA, .35), TINTA, cor, '#f3efe6'))


def coisas(S):
    bola(S, 1610, 520, 25)                            # a bola encostada perto do gol do muro
    chinelo(S, 640, 560, -12, '#ffcf2e')               # o par de chinelos (a trave da rua) à esquerda
    chinelo(S, 720, 590, 18, '#ffcf2e')


# ------------------------------------------------------------------------------------------------ a cena inteira (uma janela do mundo)
def svg_cena(x0, y0, w, h, px_w, px_h, fonte='LilitaOne', escurece=0.0, borra=0.0, grao=True, hora='tarde'):
    usa_paleta(hora)
    S = Svg()
    x1, y1 = x0 + w, y0 + h
    ceu(S, x0, y0, w, h)
    morro(S, x0 - 60, x1 + 60)
    refletor(S, 356, 1)
    refletor(S, 1916, -1)
    casas(S, x0 - 60, x1 + 60)
    fios(S, x0, x1)
    alambrado(S, x0, x1)
    bandeirinhas(S, 356, 92, 1916, 92, 64, 46, 0)
    bandeirinhas(S, 356, 132, 1916, 132, 40, 52, 2, tam=.82)
    if x0 < 0: bandeirinhas(S, x0 - 400, 110, 356, 92, 30, 46, 1)
    if x1 > 2272: bandeirinhas(S, 1916, 92, x1 + 400, 110, 30, 46, 3)
    muro(S, x0, x1, fonte)
    chao(S, x0, x1, y1)
    coisas(S)
    filtros = ''
    if grao:
        S.defs.append('<filter id="grao" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="5" stitchTiles="stitch"/>'
                      '<feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .55 0"/></filter>')
    if borra:
        S.defs.append('<filter id="borra" x="-5%%" y="-5%%" width="110%%" height="110%%"><feGaussianBlur stdDeviation="%s"/></filter>' % borra)
        filtros = ' filter="url(#borra)"'
    corpo = '\n'.join(S.corpo)
    sobre = ''
    if grao:
        sobre += '<rect x="%s" y="%s" width="%s" height="%s" filter="url(#grao)" opacity=".18" style="mix-blend-mode:multiply"/>' % (f(x0), f(y0), f(w), f(h))
    if escurece:
        sobre += '<rect x="%s" y="%s" width="%s" height="%s" fill="#0d1030" opacity="%s"/>' % (f(x0 - 10), f(y0 - 10), f(w + 20), f(h + 20), escurece)
    return ('<svg xmlns="http://www.w3.org/2000/svg" width="%d" height="%d" viewBox="%s %s %s %s" preserveAspectRatio="xMidYMid slice">'
            '<defs>%s</defs><g%s>%s</g>%s</svg>' % (px_w, px_h, f(x0), f(y0), f(w), f(h), ''.join(S.defs), filtros, corpo, sobre))
