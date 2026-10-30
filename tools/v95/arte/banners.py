"""RACHA v95 · os 6 BANNERS DE PERFIL desenhados em código (no lugar dos da v91, recortes de uma imagem gerada por IA): as
mesmas cenas do catálogo, na mesma ordem (laje, por_do_sol, grafite, cristo, estadio, carnaval), cada uma 720 × 200, uma
embaixo da outra (o atlas V91_BANNERS). O estilo é o da quadra do lobby (cena.py): cores chapadas, contorno de tinta."""
import math, random
import cena as C
from cena import Svg, f, mistura, TINTA, TIMES

W, H = 720, 200
CENAS = ['laje', 'por_do_sol', 'grafite', 'cristo', 'estadio', 'carnaval']


def _svg(S, fundo=''):
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %d %d" width="%d" height="%d"><defs>%s</defs>%s%s</svg>' % (W, H, W, H, ''.join(S.defs), fundo, '\n'.join(S.corpo))


def faixas(S, cores, y0=0, y1=H):
    p = (y1 - y0) / len(cores)
    for i, c in enumerate(cores):
        S.rect(-5, y0 + i * p - .5, W + 10, p + 1.5, c)


def laje():
    # as casas da quebrada de noite (a mesma quadra do lobby, mais perto, com as janelas acesas)
    return C.svg_cena(470, 108, W, H, W, H, hora='noite', grao=False)


def por_do_sol():
    S = Svg()
    faixas(S, ['#3a2470', '#552d84', '#7a3389', '#a13f83', '#c74e72', '#e76659', '#fa8248', '#ff9c47'], 0, 150)
    S.rect(-5, 148, W + 10, 60, '#ff9c47')
    sx, sy = 470, 132
    for r, c, o in ((118, '#ffaa58', .3), (88, '#ffbf63', .55), (62, '#ffd77c', 1)):
        S('<circle cx="%s" cy="%s" r="%s" fill="%s" opacity="%s"/>' % (sx, sy, r, c, o))
    for cx, cy, cw in ((150, 40, 220), (600, 24, 170), (330, 70, 130)):
        S('<rect x="%s" y="%s" width="%s" height="16" rx="8" fill="#a13f83"/>' % (cx - cw / 2, cy, cw))
        S('<rect x="%s" y="%s" width="%s" height="4" rx="2" fill="#e76659"/>' % (cx - cw * .4, cy + 12, cw * .7))
    # o morro (a silhueta) e as casinhas acesas
    pts = [(x, 150 - 46 * math.exp(-((x - 150) / 170) ** 2) - 30 * math.exp(-((x - 640) / 150) ** 2) + 3 * math.sin(x / 23)) for x in range(-10, W + 20, 8)]
    S.poli(pts + [(W + 20, H + 5), (-10, H + 5)], '#3a2462')
    rnd = random.Random(5)
    for _ in range(220):
        x = rnd.random() * W; y = 120 + rnd.random() * 80
        top = 150 - 46 * math.exp(-((x - 150) / 170) ** 2) - 30 * math.exp(-((x - 640) / 150) ** 2) + 6
        if y < top: continue
        w, h = 7 + rnd.random() * 12, 5 + rnd.random() * 8
        S.rect(x, y, w, h, rnd.choice(['#4b2f74', '#563682', '#44306c', '#5d3a7f']))
        if rnd.random() < .45: S.rect(x + w * .3, y + h * .3, 2, 2.6, '#ffd27a')
    # os fios e o poste
    S.rect(98, 60, 8, 150, '#2c2448'); S.rect(84, 72, 36, 5, '#2c2448')
    for dy in (0, 10):
        S.path('M-10 %s Q%s %s %s %s' % (78 + dy, 300, 110 + dy, W + 10, 70 + dy), 'none', stroke='#1a1430', stroke_width='2')
    return _svg(S)


def grafite():
    S = Svg()
    S.rect(0, 0, W, H, '#3a3f6c')
    for x in range(0, W, 160): S.rect(x, 0, 3, H, '#30355e')
    # as manchas de tinta (chapadas, nas cores dos times e do amarelo)
    rnd = random.Random(12)
    for _ in range(26):
        x, y, r = rnd.random() * W, rnd.random() * H, 8 + rnd.random() * 30
        c = rnd.choice([TIMES['a'], TIMES['b'], TIMES['ama'], '#2fbfa0', TIMES['giz']])
        S('<circle cx="%s" cy="%s" r="%s" fill="%s" opacity=".85"/>' % (f(x), f(y), f(r), c))
        for k in range(rnd.randint(0, 2)):                 # (os pingos escorrendo)
            S.rect(x - r * .3 + k * r * .5, y, 3.5, r + rnd.random() * 26, c, opacity='.85', rx='1.7')
    # o RACHA grandão no meio, com a coroa
    S('<g font-family="LilitaOne" font-size="104" letter-spacing="2" text-anchor="middle" transform="rotate(-4 360 110)">'
      '<text x="368" y="148" fill="%s" stroke="%s" stroke-width="14" stroke-linejoin="round" paint-order="stroke">RACHA</text>'
      '<text x="360" y="140" fill="%s" stroke="%s" stroke-width="12" stroke-linejoin="round" paint-order="stroke">RACHA</text></g>' % (TIMES['b'], TINTA, TIMES['giz'], TINTA))
    S('<g transform="translate(486 34) rotate(16)"><polygon points="-30,16 -30,-6 -15,6 0,-18 15,6 30,-6 30,16" fill="%s" stroke="%s" stroke-width="5" stroke-linejoin="round"/></g>' % (TIMES['ama'], TINTA))
    # as assinaturas (tags) pequenas
    for x, y, t, c in ((70, 46, 'RC', TIMES['giz']), (640, 170, 'DDQ', TIMES['ama']), (600, 44, '★', TIMES['a'])):
        S('<text x="%s" y="%s" font-family="LilitaOne" font-size="26" fill="%s" stroke="%s" stroke-width="4" paint-order="stroke" transform="rotate(-8 %s %s)">%s</text>' % (x, y, c, TINTA, x, y, t))
    S.rect(0, 186, W, 14, '#2a2e52')
    return _svg(S)


def cristo():
    S = Svg()
    faixas(S, ['#45287b', '#5e2e86', '#7d348a', '#a13f83', '#c74e72', '#e76659', '#fa8248'], 0, 200)
    S('<circle cx="560" cy="150" r="70" fill="#ffd77c"/>')
    # o morro grande e a estátua lá em cima (de longe: a silhueta)
    pts = [(x, 200 - 128 * math.exp(-((x - 300) / 210) ** 2) - 18 * math.exp(-((x - 640) / 90) ** 2) + 3 * math.sin(x / 19)) for x in range(-10, W + 20, 6)]
    S.poli(pts + [(W + 20, H + 5), (-10, H + 5)], '#3a2462')
    pico = min(pts, key=lambda p: p[1])
    px, py = pico
    S.rect(px - 6, py - 10, 12, 10, '#2a1a45')
    S.poli([(px - 4, py - 10), (px + 4, py - 10), (px + 3, py - 34), (px - 3, py - 34)], '#2a1a45')
    S.rect(px - 22, py - 33, 44, 4.5, '#2a1a45', rx='2')
    S('<circle cx="%s" cy="%s" r="3.6" fill="#2a1a45"/>' % (f(px), f(py - 37)))
    rnd = random.Random(8)
    for _ in range(300):
        x = rnd.random() * W; y = 90 + rnd.random() * 110
        top = 200 - 128 * math.exp(-((x - 300) / 210) ** 2) - 18 * math.exp(-((x - 640) / 90) ** 2) + 10
        if y < top or y > 196: continue
        w, h = 7 + rnd.random() * 12, 5 + rnd.random() * 8
        S.rect(x, y, w, h, rnd.choice(['#4b2f74', '#563682', '#44306c', '#5d3a7f']))
        if rnd.random() < .5: S.rect(x + w * .3, y + h * .3, 2, 2.6, '#ffd27a')
    return _svg(S)


def estadio():
    S = Svg()
    faixas(S, ['#0b0e2a', '#0e1231', '#111538', '#14193f'], 0, 96)
    # os refletores e os fachos (do alto do poste para o meio)
    for x, lado in ((90, 1), (630, -1)):
        S.poli([(x - 26, 30), (x + 26, 30), (x + lado * 330 + 90, 200), (x + lado * 330 - 90, 200)], '#fff4cf', opacity='.08')
        S.rect(x - 4, 26, 8, 70, '#262b50')
        S.rect(x - 34, 8, 68, 26, '#1d2142', stroke=TINTA, stroke_width='3', rx='4')
        for i in range(3):
            S.rect(x - 28 + i * 20, 13, 15, 15, '#fff6d6', rx='2')
    # a arquibancada: os degraus e a galera (as cabeças e os ombros, com a luz do refletor em cima), de trás para a frente
    rnd = random.Random(4)
    for fila in range(5):
        y = 92 + fila * 22
        S.rect(-5, y + 10, W + 10, 22, mistura('#1f2550', '#353d74', fila / 4))
        S.rect(-5, y + 10, W + 10, 2.5, mistura('#2f3770', '#4b5596', fila / 4))
        cor = mistura('#2b3266', '#434c88', fila / 4)
        luzc = mistura('#4a5390', '#6f79b8', fila / 4)
        x = -10 + (fila % 2) * 9
        while x < W + 10:
            r = 6 + fila * .9 + rnd.random() * 1.2
            S('<path d="M%s %s Q%s %s %s %s Z" fill="%s"/>' % (f(x - r * 1.5), f(y + 14), f(x), f(y - r * .4), f(x + r * 1.5), f(y + 14), cor))
            S('<circle cx="%s" cy="%s" r="%s" fill="%s"/>' % (f(x), f(y + 2 - r * .6), f(r), cor))
            S('<path d="M%s %s A%s %s 0 0 1 %s %s" fill="none" stroke="%s" stroke-width="2"/>' % (f(x - r * .7), f(y + 2 - r * .9), f(r), f(r), f(x + r * .5), f(y + 2 - r * 1.45), luzc))
            if rnd.random() < .09:                     # (uma bandeira levantada, nas cores dos times)
                c = rnd.choice([TIMES['a'], TIMES['b'], TIMES['giz']])
                S.rect(x - 1, y - 30, 2.5, 30, '#d9d6ea')
                S('<path d="M%s %s h26 l-5 9 l5 9 h-26z" fill="%s" stroke="%s" stroke-width="2"/>' % (f(x + 1.5), f(y - 30), c, TINTA))
            elif rnd.random() < .12:                   # (um braço para cima)
                S.rect(x + r * .5, y - r * 1.6, 3, r * 1.4, cor, rx='1.5')
            x += r * 2.3 + rnd.random() * 3
    S.rect(-5, 192, W + 10, 10, '#0d1028')
    return _svg(S)


def carnaval():
    S = Svg()
    S.rect(0, 0, W, H, TIMES['b'])
    S.poli([(W * .48, 0), (W, 0), (W, H), (W * .3, H)], '#ff7a1c')
    S.poli([(W * .44, 0), (W * .5, 0), (W * .32, H), (W * .26, H)], '#ffcf2e')
    rnd = random.Random(21)
    # as serpentinas (as fitas enroladas) e o confete
    for _ in range(9):
        x, y = rnd.random() * W, rnd.random() * H
        c = rnd.choice([TIMES['giz'], TIMES['ama'], '#2fbfa0', '#ff5aa0'])
        d = 'M%s %s' % (f(x), f(y))
        for k in range(6):
            d += ' q %s %s %s %s' % (f(8 + rnd.random() * 8), f(-14 if k % 2 else 14), f(18 + rnd.random() * 8), f((rnd.random() - .5) * 10))
        S.path(d, 'none', stroke=c, stroke_width='3.4', stroke_linecap='round')
    for _ in range(170):
        x, y = rnd.random() * W, rnd.random() * H
        c = rnd.choice([TIMES['giz'], TIMES['ama'], '#2fbfa0', '#ff5aa0', TIMES['a'], '#2c7fc4'])
        S('<rect x="%s" y="%s" width="%s" height="%s" fill="%s" transform="rotate(%s %s %s)"/>' % (f(x), f(y), f(4 + rnd.random() * 4), f(2.4 + rnd.random() * 2), c, int(rnd.random() * 180), f(x), f(y)))
    C.bandeirinhas(S, -40, 10, W + 40, 18, 22, 34, 0, .8)
    C.bandeirinhas(S, -40, 70, W + 40, 60, 26, 38, 2, .9)
    return _svg(S)


def svg_atlas(esc=1.0):
    corpo = ''
    for i, nome in enumerate(CENAS):
        svg = globals()[nome]()
        # (cada cena é um <svg> próprio, posto na sua fileira)
        corpo += svg.replace('<svg xmlns="http://www.w3.org/2000/svg"', '<svg x="0" y="%d"' % (i * H), 1)
    return '<svg xmlns="http://www.w3.org/2000/svg" width="%d" height="%d" viewBox="0 0 %d %d">%s</svg>' % (W, H * len(CENAS), W, H * len(CENAS), corpo)
