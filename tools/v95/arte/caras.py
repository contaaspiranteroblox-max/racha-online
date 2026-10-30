"""RACHA v95 · as CARAS DAS TAMPINHAS ANIMADAS desenhadas em código (no lugar do kit da v76, recortado de uma folha de
ilustrações geradas por IA): CRIA, CRISTO, PITBULL, FÉ e DRAGÃO, no traço da v95 (o contorno de tinta, a cor chapada, a luz
em faixas). As mesmas 8 peças do kit (tools/v76/skins_kit.json): as 5 caras redondas e as 3 camadas da frente (o menino e a
bola da CRIA, a estátua do CRISTO e a cruz da FÉ), com os mesmos lugares que as animações acendem (as janelas, os olhos, a
corrente, as coroas, a boca do dragão) — ver tools/v76/skins.js.

Cada peça é desenhada num quadrado de 208 (o centro em 104, 104; o raio da cara, 104) com as medidas em u, v (-1..1, em
raios da cara, como no skins.js) e vai para o kit no tamanho LADO."""
import math

TINTA = '#0f1222'
LADO = 300                                           # px de cada peça no kit (o kit: 3 × 3 peças, 2 px de folga)
NOMES = ['cria', 'cristo', 'pitbull', 'fe', 'dragao', 'cria_menino', 'cristo_estatua', 'fe_cruz']


def X(u):
    return 104 + u * 104


def Y(v):
    return 104 + v * 104


def P(*pts):
    return ' '.join('%.2f,%.2f' % (X(u), Y(v)) for u, v in pts)


def d(*seq):
    """um caminho em u, v: d('M', (u, v), 'C', (u, v), (u, v), (u, v), 'Z')"""
    out = []
    for s in seq:
        if isinstance(s, str):
            out.append(s)
        else:
            out.append('%.2f %.2f' % (X(s[0]), Y(s[1])))
    return ' '.join(out)


def pol(pts, cor, k=2.6, extra=''):
    return '<polygon points="%s" fill="%s" stroke="%s" stroke-width="%.2f" stroke-linejoin="round"%s/>' % (P(*pts), cor, TINTA if k else 'none', k, extra)


def cam(dd, cor, k=2.6, extra='', tinta=TINTA):
    return '<path d="%s" fill="%s" stroke="%s" stroke-width="%.2f" stroke-linejoin="round" stroke-linecap="round"%s/>' % (dd, cor, tinta if k else 'none', k, extra)


def cir(u, v, r, cor, k=2.6, extra=''):
    return '<circle cx="%.2f" cy="%.2f" r="%.2f" fill="%s" stroke="%s" stroke-width="%.2f"%s/>' % (X(u), Y(v), r * 104, cor, TINTA if k else 'none', k, extra)


def ret(u0, v0, u1, v1, cor, k=2.6, extra=''):
    return '<rect x="%.2f" y="%.2f" width="%.2f" height="%.2f" fill="%s" stroke="%s" stroke-width="%.2f" stroke-linejoin="round"%s/>' % (
        X(u0), Y(v0), (u1 - u0) * 104, (v1 - v0) * 104, cor, TINTA if k else 'none', k, extra)


def linha(pts, cor, w, extra=''):
    return '<polyline points="%s" fill="none" stroke="%s" stroke-width="%.2f" stroke-linejoin="round" stroke-linecap="round"%s/>' % (P(*pts), cor, w, extra)


def traco(dd, cor, w, extra=''):
    return '<path d="%s" fill="none" stroke="%s" stroke-width="%.2f" stroke-linejoin="round" stroke-linecap="round"%s/>' % (dd, cor, w, extra)


def coroa(cu, cv, larg, ang, cor='#ffcf2e', sombra='#b37400', k=2.4):
    """a coroa de grafite: as três pontas, a faixa e as joias (larg em raios)"""
    w = larg * 104; h = w * .62
    pts = [(-w / 2, h / 2), (-w / 2 - w * .04, -h * .32), (-w * .22, h * .02), (0, -h / 2), (w * .22, h * .02), (w / 2 + w * .04, -h * .32), (w / 2, h / 2)]
    p = ' '.join('%.2f,%.2f' % xy for xy in pts)
    joias = ''.join('<circle cx="%.2f" cy="%.2f" r="%.2f" fill="%s" stroke="%s" stroke-width="%.2f"/>' % (x, y, w * .075, c, TINTA, k * .7)
                    for (x, y), c in (((-w / 2 - w * .04, -h * .32), '#ff6a00'), ((0, -h / 2), '#7a3fc4'), ((w / 2 + w * .04, -h * .32), '#ff6a00')))
    return ('<g transform="translate(%.2f %.2f) rotate(%.1f)">'
            '<polygon points="%s" fill="%s" stroke="%s" stroke-width="%.2f" stroke-linejoin="round" transform="translate(%.2f %.2f)"/>'
            '<polygon points="%s" fill="%s" stroke="%s" stroke-width="%.2f" stroke-linejoin="round"/>'
            '<rect x="%.2f" y="%.2f" width="%.2f" height="%.2f" rx="1" fill="#ffe27a" stroke="%s" stroke-width="%.2f"/>'
            '<path d="M%.2f %.2f L%.2f %.2f" stroke="#ffffff" stroke-width="%.2f" stroke-linecap="round" opacity=".6"/>%s</g>'
            % (X(cu), Y(cv), ang, p, sombra, TINTA, k, w * .05, w * .07, p, cor, TINTA, k, -w / 2 - 1, h * .26, w + 2, h * .26, TINTA, k * .8,
               -w * .36, h * .1, -w * .3, -h * .1, w * .045, joias))


# ---------------------------------------------------------------------------------------------------------------- CRIA
# o pôr do sol na laje: o céu em faixas, o sol atrás do menino, as casas da favela dos dois lados (as janelas onde o jogo acende
# as luzes: SK76_CRIA_LUZ), os fios, o asfalto e a coroa pichada no céu (onde o jogo faz a estrelinha: .66, -.7)
CRIA_JANELAS = [(-.65, -.44), (-.78, -.46), (-.65, -.22), (-.68, 0), (-.84, -.07), (-.77, .26), (-.53, .41),
                (.85, -.25), (.6, 0), (.85, 0), (.6, .19), (.72, .46), (.89, .46)]


def janela(u, v, w=.085, h=.1, cor='#2a1830'):
    return ret(u - w / 2, v - h / 2, u + w / 2, v + h / 2, cor, 1.6)


def casa(u0, v0, u1, v1, cor, laje='#5b4636', tijolo=None):
    s = ret(u0, v0, u1, v1, cor, 2.4)
    if tijolo:                                       # os tijolos à mostra (as fiadas desencontradas)
        lin = ''
        v = v0 + .06
        i = 0
        while v < v1 - .02:
            lin += '<path d="M%.2f %.2f H%.2f" stroke="%s" stroke-width="1.1"/>' % (X(u0) + 1.5, Y(v), X(u1) - 1.5, tijolo)
            u = u0 + (.05 if i % 2 else .1)
            while u < u1 - .03:
                lin += '<path d="M%.2f %.2f V%.2f" stroke="%s" stroke-width="1.1"/>' % (X(u), Y(v - .06) + 1, Y(v) - 1, tijolo)
                u += .1
            v += .06; i += 1
        s += '<g opacity=".75">%s</g>' % lin
    s += ret(u0 - .02, v0 - .035, u1 + .02, v0 + .01, laje, 2.2)     # a beira da laje
    return s


def cria_fundo():
    s = ''
    for v0, v1, c in ((-1.05, -.62, '#ff5e1a'), (-.62, -.3, '#ff7d22'), (-.3, -.02, '#ff9b2e'), (-.02, .3, '#ffb43c'), (.3, .7, '#ffc457')):
        s += ret(-1.05, v0, 1.05, v1, c, 0)
    # o sol (atrás do menino: o jogo pulsa a luz em 0, -.12)
    s += cir(0, -.12, .62, '#ffd36e', 0) + cir(0, -.12, .5, '#ffe7a1', 2.2) + cir(0, -.12, .36, '#fff3cf', 0)
    # os fios (de um poste ao outro, caindo no meio)
    s += traco(d('M', (-1.05, -.6), 'Q', (0, -.28), (1.05, -.66)), TINTA, 1.6) + traco(d('M', (-1.05, -.5), 'Q', (.1, -.16), (1.05, -.55)), TINTA, 1.3)
    # as casas da esquerda (de trás para a frente)
    s += casa(-1.08, -.56, -.71, .08, '#d9668f')
    s += ret(-.98, -.72, -.82, -.58, '#2f6fd1', 2.2) + ret(-1.0, -.75, -.8, -.7, '#4a8ae8', 2)              # a caixa d'água
    s += casa(-.72, -.52, -.5, .12, '#e8a33a')
    s += linha([(-.66, -.56), (-.66, -.66)], TINTA, 1.4) + linha([(-.56, -.56), (-.56, -.63)], TINTA, 1.4)    # os ferros da laje
    s += casa(-1.08, .06, -.6, .64, '#2f8f8a')
    s += casa(-.6, .2, -.4, .64, '#b5532f', tijolo='#7d3218')
    # as da direita
    s += casa(.72, -.38, 1.08, .12, '#3d6fb3')
    s += ret(.8, -.52, .94, -.4, '#e8e2d4', 2.2) + ret(.78, -.55, .96, -.5, '#ffffff', 2)                    # a caixa d'água
    s += casa(.5, -.12, .72, .34, '#c4532d')
    s += casa(.6, .32, 1.08, .66, '#8f55dc')
    for u, v in CRIA_JANELAS:
        s += janela(u, v)
    # a rua: o asfalto, o meio-fio e a sombra das casas
    s += ret(-1.05, .6, 1.05, 1.05, '#2b2133', 2.4) + ret(-1.05, .6, 1.05, .66, '#4b3d55', 2)
    s += traco(d('M', (-.7, .84), 'L', (-.45, .84)), '#f3efe6', 2.2, ' opacity=".5"') + traco(d('M', (.45, .84), 'L', (.7, .84)), '#f3efe6', 2.2, ' opacity=".5"')
    # a coroa pichada no céu
    s += coroa(.58, -.63, .28, -12)
    return s


def cria_menino():
    """o menino e a bola: a silhueta escura com a luz do sol na beira (a mesma forma deslocada, em laranja, por baixo)"""
    corpo = ''
    # o cabelo (os cachos) e a cabeça
    for u, v, r in ((-.05, -.47, .13), (-.16, -.45, .09), (.06, -.45, .09), (-.13, -.56, .085), (.02, -.58, .085), (-.06, -.6, .08), (-.17, -.52, .07), (.08, -.53, .07)):
        corpo += '<circle cx="%.2f" cy="%.2f" r="%.2f"/>' % (X(u), Y(v), r * 104)
    corpo += '<circle cx="%.2f" cy="%.2f" r="%.2f"/>' % (X(-.03), Y(-.38), .1 * 104)
    corpo += '<rect x="%.2f" y="%.2f" width="%.2f" height="%.2f"/>' % (X(-.07), Y(-.32), .08 * 104, .06 * 104)               # o pescoço
    # o tronco (a camiseta larga)
    corpo += '<path d="%s"/>' % d('M', (-.21, -.27), 'Q', (-.03, -.31), (.15, -.27), 'L', (.15, .1), 'L', (-.17, .1), 'Z')
    # os braços (o da bola, para trás; o outro, solto)
    corpo += '<path d="%s" fill="none" stroke-width="%.2f" stroke-linecap="round" stroke-linejoin="round"/>' % (d('M', (-.17, -.22), 'L', (-.28, -.04), 'L', (-.27, .12)), .085 * 104)
    corpo += '<path d="%s" fill="none" stroke-width="%.2f" stroke-linecap="round" stroke-linejoin="round"/>' % (d('M', (.12, -.22), 'L', (.24, -.07), 'L', (.33, .02)), .08 * 104)
    # o calção
    corpo += '<path d="%s"/>' % d('M', (-.18, .06), 'L', (.15, .06), 'L', (.2, .31), 'L', (.03, .31), 'L', (-.01, .2), 'L', (-.05, .31), 'L', (-.21, .31), 'Z')
    # as pernas: uma em pé, a outra pisando na bola
    corpo += '<path d="%s" fill="none" stroke-width="%.2f" stroke-linecap="round" stroke-linejoin="round"/>' % (d('M', (-.12, .28), 'L', (-.13, .47), 'L', (-.14, .62)), .085 * 104)
    corpo += '<path d="%s" fill="none" stroke-width="%.2f" stroke-linecap="round" stroke-linejoin="round"/>' % (d('M', (-.18, .64), 'L', (-.02, .645)), .075 * 104)
    corpo += '<path d="%s" fill="none" stroke-width="%.2f" stroke-linecap="round" stroke-linejoin="round"/>' % (d('M', (.11, .28), 'L', (.2, .43), 'L', (.25, .5)), .08 * 104)
    corpo += '<path d="%s" fill="none" stroke-width="%.2f" stroke-linecap="round" stroke-linejoin="round"/>' % (d('M', (.22, .5), 'L', (.33, .47)), .07 * 104)
    # a bola
    corpo += '<circle cx="%.2f" cy="%.2f" r="%.2f"/>' % (X(.38), Y(.57), .1 * 104)
    luz = '<g fill="#ff9a3a" stroke="#ff9a3a" transform="translate(-2.2 -1.6)">%s</g>' % corpo
    sil = '<g fill="#1b1424" stroke="#1b1424">%s</g>' % corpo
    # as costuras da bola (para ler como bola) e a sombra no chão
    bola = (traco(d('M', (.31, .52), 'Q', (.38, .56), (.44, .5)), '#4a3d58', 1.4) + traco(d('M', (.38, .56), 'L', (.37, .66)), '#4a3d58', 1.4)
            + traco(d('M', (.3, .62), 'Q', (.34, .6), (.38, .62)), '#4a3d58', 1.2))
    sombra = '<ellipse cx="%.2f" cy="%.2f" rx="%.2f" ry="%.2f" fill="#120c18" opacity=".55"/>' % (X(.12), Y(.67), .42 * 104, .035 * 104)
    return sombra + luz + sil + bola


# -------------------------------------------------------------------------------------------------------------- CRISTO
# o dia no Rio: o céu, as nuvens, o Pão de Açúcar e a baía, os morros com as casas (as janelas onde o jogo acende as luzes de
# noite: SK76_CRISTO_CASA) e a estátua no meio (a camada da frente, acesa de noite). O canto de cima à esquerda fica limpo para
# a lua da noite (-.58, -.6).
CRISTO_JANELAS = [(-.82, .5), (-.66, .62), (-.48, .72), (-.75, .78), (-.6, .45), (.45, .58), (.6, .48), (.75, .62), (.62, .78), (.86, .5), (.5, .75)]


def nuvem(u, v, e, k=2.2):
    s = ''
    base = [(-.5, .1, .3), (-.18, -.05, .4), (.22, .02, .34), (.5, .12, .24)]
    s += ''.join(cir(u + a * e, v + b * e, r * e, '#ffffff', k) for a, b, r in base)
    s += ''.join(cir(u + a * e, v + b * e, r * e - .012, '#ffffff', 0) for a, b, r in base)
    s += ret(u - .72 * e, v + .12 * e, u + .72 * e, v + .3 * e, '#ffffff', 0)
    s += traco('M%.2f %.2f H%.2f' % (X(u - .72 * e), Y(v + .3 * e), X(u + .72 * e)), TINTA, k)
    s += traco('M%.2f %.2f H%.2f' % (X(u - .5 * e), Y(v + .22 * e), X(u + .2 * e)), '#cfe6f5', 2)
    return s


def cristo_fundo():
    s = ret(-1.05, -1.05, 1.05, .3, '#8fd0ff', 0) + ret(-1.05, -.05, 1.05, .3, '#b6e2ff', 0) + ret(-1.05, .12, 1.05, .3, '#d4eeff', 0)
    s += nuvem(.6, -.62, .32) + nuvem(-.8, -.16, .2) + nuvem(.86, -.2, .16)
    # o Pão de Açúcar e a Urca (à direita) e os morros do fundo
    s += pol([(-1.05, .26), (-.88, .14), (-.74, .19), (-.6, .1), (-.42, .22), (-.3, .26)], '#7cb9a4', 2.2)
    s += pol([(.36, .3), (.44, .18), (.52, .2), (.58, .3)], '#5f8f78', 2.2)
    s += cam(d('M', (.52, .32), 'C', (.56, .06), (.64, -.08), (.72, -.08), 'C', (.82, -.08), (.88, .1), (.95, .32), 'Z'), '#5f8f78', 2.4)
    s += traco(d('M', (.66, -.04), 'C', (.62, .06), (.6, .16), (.6, .3)), '#4b7562', 2)                         # a sombra do morro
    s += traco(d('M', (.48, .2), 'L', (.7, -.06)), TINTA, .9)                                                    # o bondinho (o cabo)
    # a baía
    s += ret(-1.05, .28, 1.05, .56, '#3d8fd6', 2.2)
    for u, v in ((-.2, .36), (.1, .42), (.3, .34), (-.5, .45), (.62, .44)):
        s += traco('M%.2f %.2f h%.2f' % (X(u), Y(v), .14 * 104), '#ffffff', 1.8, ' opacity=".7"')
    # os morros da frente com as casas
    s += cam(d('M', (-1.05, .38), 'C', (-.8, .34), (-.6, .36), (-.42, .5), 'C', (-.36, .6), (-.34, .8), (-.3, 1.05), 'L', (-1.05, 1.05), 'Z'), '#3f8a55', 2.4)
    s += cam(d('M', (1.05, .4), 'C', (.82, .36), (.58, .38), (.44, .48), 'C', (.38, .56), (.36, .8), (.32, 1.05), 'L', (1.05, 1.05), 'Z'), '#3f8a55', 2.4)
    cores = ['#f3e3c0', '#e48aa8', '#d0603a', '#55b3a8', '#f0b44a', '#9ac0ec']
    for i, (u, v) in enumerate(CRISTO_JANELAS):      # cada janela numa casinha (a casinha em volta, a janela no lugar da luz)
        c = cores[i % len(cores)]
        s += ret(u - .085, v - .075, u + .085, v + .085, c, 1.8) + ret(u - .1, v - .1, u + .1, v - .07, '#7a5a44', 1.6)
        s += janela(u, v, .045, .055, '#24324a')
    # o pé do morro do Corcovado (embaixo da estátua)
    s += cam(d('M', (-.42, 1.05), 'C', (-.36, .86), (-.2, .78), (0, .76), 'C', (.2, .78), (.36, .86), (.42, 1.05), 'Z'), '#4f7d3c', 2.4)
    s += cristo_estatua()
    return s


def cristo_estatua():
    pedra, sombra, dobra = '#efebe1', '#cfc8b8', '#a59e8c'
    s = ''
    # o pedestal
    s += ret(-.28, .62, .28, .92, '#d9d3c3', 2.4) + ret(.06, .62, .28, .92, '#c4bdab', 0) + ret(-.28, .62, .28, .92, 'none', 2.4)
    s += ret(-.22, .5, .22, .63, pedra, 2.4) + ret(.04, .5, .22, .63, sombra, 0) + ret(-.22, .5, .22, .63, 'none', 2.4)
    # os braços abertos (com as mangas caindo)
    s += pol([(-.9, -.43), (-.2, -.5), (.2, -.5), (.9, -.43), (.9, -.33), (.3, -.31), (.2, -.16), (-.2, -.16), (-.3, -.31), (-.9, -.33)], pedra, 2.6)
    s += pol([(.3, -.31), (.9, -.33), (.9, -.39), (.3, -.36)], sombra, 0) + pol([(-.3, -.31), (-.9, -.33), (-.9, -.37), (-.3, -.35)], sombra, 0)
    s += cir(-.9, -.38, .055, pedra, 2.2) + cir(.9, -.38, .055, sombra, 2.2)                                   # as mãos
    # o corpo (a túnica)
    s += pol([(-.17, -.5), (.17, -.5), (.21, .0), (.23, .52), (-.23, .52), (-.21, .0)], pedra, 2.6)
    s += pol([(.04, -.48), (.17, -.5), (.21, 0), (.23, .52), (.06, .52)], sombra, 0)
    s += pol([(-.17, -.5), (.17, -.5), (.21, .0), (.23, .52), (-.23, .52), (-.21, .0)], 'none', 2.6)
    for a, b in (((-.1, -.1), (-.12, .48)), ((0, -.08), (.0, .5)), ((.11, -.1), (.13, .48))):
        s += linha([a, b], dobra, 1.3)
    s += linha([(-.2, -.06), (.2, -.06)], dobra, 1.6)                                                         # o cinto
    s += linha([(-.3, -.32), (-.17, -.42)], dobra, 1.2) + linha([(.3, -.32), (.17, -.42)], dobra, 1.2)
    # a cabeça
    s += ret(-.045, -.58, .045, -.48, pedra, 2.2)
    s += cir(0, -.65, .085, pedra, 2.4) + cam('M%.2f %.2f A%.2f %.2f 0 0 1 %.2f %.2f Z' % (X(0), Y(-.735), .085 * 104, .085 * 104, X(0), Y(-.565)), sombra, 0)
    s += cir(0, -.65, .085, 'none', 2.4)
    return s


# -------------------------------------------------------------------------------------------------------------- PITBULL
# a cara de frente no muro pichado: os olhos onde o jogo acende o vermelho (SK76_PB_OLHO), a corrente de ouro nos dois lados
# de baixo (onde o brilho corre: SK76_PB_CORRENTE) e a coroa em cima (a estrelinha em .17, -.9)
PB_CORRENTE = [[(-.86, .28), (-.8, .45), (-.7, .6), (-.58, .76), (-.44, .9)], [(.88, .28), (.8, .45), (.72, .62), (.6, .78), (.47, .92)]]


def no_caminho(pts, s):
    L = [math.dist(pts[i], pts[i + 1]) for i in range(len(pts) - 1)]
    a = s * sum(L)
    for i, l in enumerate(L):
        if a <= l:
            f = a / l if l else 0
            return (pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f), math.atan2(pts[i + 1][1] - pts[i][1], pts[i + 1][0] - pts[i][0])
        a -= l
    return pts[-1], 0


def corrente(pts, n=9):
    s = ''
    for i in range(n):
        (u, v), ang = no_caminho(pts, (i + .5) / n)
        deg = math.degrees(ang)
        if i % 2 == 0:                               # o elo de frente (o anel) e o de lado (a barrinha)
            s += ('<g transform="translate(%.2f %.2f) rotate(%.1f)"><ellipse rx="%.2f" ry="%.2f" fill="#ffcf2e" stroke="%s" stroke-width="1.8"/>'
                  '<ellipse rx="%.2f" ry="%.2f" fill="#2a1530" stroke="%s" stroke-width="1.2"/>'
                  '<path d="M%.2f %.2f a%.2f %.2f 0 0 1 %.2f %.2f" fill="none" stroke="#fff6c8" stroke-width="1.3" stroke-linecap="round"/></g>'
                  % (X(u), Y(v), deg, .085 * 104, .055 * 104, TINTA, .04 * 104, .018 * 104, TINTA, -.06 * 104, -.01 * 104, .06 * 104, .04 * 104, .06 * 104, -.03 * 104))
        else:
            s += ('<g transform="translate(%.2f %.2f) rotate(%.1f)"><rect x="%.2f" y="%.2f" width="%.2f" height="%.2f" rx="%.2f" fill="#e0a800" stroke="%s" stroke-width="1.6"/></g>'
                  % (X(u), Y(v), deg, -.075 * 104, -.022 * 104, .15 * 104, .044 * 104, .022 * 104, TINTA))
    return s


def pitbull():
    s = ret(-1.05, -1.05, 1.05, 1.05, '#2a1530', 0)
    # o muro: o spray em volta (as faixas), os escorridos e uns pixos apagados
    s += cir(0, .02, .98, '#3e1f4a', 0) + cir(0, .02, .86, '#53296a', 0)
    for u, l in ((-.5, .2), (-.3, .12), (.36, .18), (.56, .1)):
        s += traco('M%.2f %.2f v%.2f' % (X(u), Y(.86), l * 104), '#53296a', 4)
        s += cir(u, .86 + l + .02, .022, '#53296a', 0)
    s += traco('M%.2f %.2f q%.2f %.2f %.2f %.2f' % (X(-.92), Y(-.2), 8, -14, 18, -4), '#6a3a84', 2.4)
    # as orelhas (cortadas, em pé)
    for sg in (-1, 1):
        s += pol([(sg * .68, -.34), (sg * .64, -.9), (sg * .26, -.6)], '#74482a', 2.6)
        s += pol([(sg * .6, -.42), (sg * .6, -.78), (sg * .36, -.58)], '#b06a54', 0)
    # a cabeça
    cabeca = d('M', (-.6, -.5), 'C', (-.4, -.7), (.4, -.7), (.6, -.5), 'C', (.84, -.3), (.88, .14), (.68, .4), 'C', (.52, .64), (.3, .8), (0, .82),
               'C', (-.3, .8), (-.52, .64), (-.68, .4), 'C', (-.88, .14), (-.84, -.3), (-.6, -.5), 'Z')
    s += cam(cabeca, '#8a5a34', 2.8)
    # as bochechas (o volume: a sombra em baixo dos lados)
    for sg in (-1, 1):
        s += cam(d('M', (sg * .8, -.05), 'C', (sg * .84, .2), (sg * .72, .4), (sg * .56, .55), 'L', (sg * .5, .3), 'Z'), '#6e4426', 0)
    # a testa: a mancha branca descendo até o focinho e as rugas
    s += cam(d('M', (-.08, -.66), 'C', (-.04, -.4), (-.1, -.2), (-.12, .0), 'L', (.12, .0), 'C', (.1, -.2), (.04, -.4), (.08, -.66), 'Z'), '#efe4d4', 0)
    for sg in (-1, 1):
        s += traco(d('M', (sg * .14, -.5), 'Q', (sg * .24, -.55), (sg * .36, -.51)), '#5a361c', 2.2)
        s += traco(d('M', (sg * .13, -.27), 'Q', (sg * .1, -.2), (sg * .12, -.12)), '#5a361c', 2)
    s += traco(d('M', (0, -.5), 'L', (0, -.3)), '#cdb99c', 2)                                                      # o vinco da testa
    # o focinho
    s += cam(d('M', (-.42, .14), 'C', (-.4, -.04), (-.2, -.06), (0, -.04), 'C', (.2, -.06), (.4, -.04), (.42, .14), 'C', (.44, .36), (.3, .62), (0, .66),
               'C', (-.3, .62), (-.44, .36), (-.42, .14), 'Z'), '#c99a6a', 2.4)
    # os olhos bravos (o jogo acende o vermelho em cima)
    for (u, v), sg in ((( -.36, -.12), -1), ((.39, -.13), 1)):
        s += cam(d('M', (u - sg * .15, v + .03), 'Q', (u, v - .07), (u + sg * .15, v - .05), 'Q', (u, v + .1), (u - sg * .15, v + .03), 'Z'), '#2a0806', 2.2)
        s += cir(u, v, .062, '#e3261b', 1.4) + cir(u, v, .028, '#120404', 0) + cir(u - .022, v - .025, .016, '#ffffff', 0)
        s += pol([(u - sg * .18, v - .07), (u + sg * .2, v - .19), (u + sg * .19, v - .28), (u - sg * .15, v - .17)], '#5a361c', 2)     # a sobrancelha brava (a ponta de dentro, baixa)
    # o nariz
    s += cam(d('M', (-.17, .1), 'C', (-.18, .02), (.18, .02), (.17, .1), 'C', (.16, .22), (.06, .26), (0, .26), 'C', (-.06, .26), (-.16, .22), (-.17, .1), 'Z'), '#1a1215', 2.2)
    s += cir(-.07, .17, .03, '#3a2a30', 0) + cir(.07, .17, .03, '#3a2a30', 0) + traco(d('M', (-.08, .07), 'Q', (0, .05), (.08, .07)), '#6a5a64', 1.8)
    # a boca rosnando: a gengiva, os dentes e a língua
    boca = d('M', (-.34, .38), 'C', (-.2, .34), (.2, .34), (.34, .38), 'C', (.3, .52), (.16, .62), (0, .63), 'C', (-.16, .62), (-.3, .52), (-.34, .38), 'Z')
    s += cam(boca, '#3a0808', 2.4)
    s += cam(d('M', (-.12, .58), 'C', (-.1, .5), (.1, .5), (.12, .58), 'C', (.06, .62), (-.06, .62), (-.12, .58), 'Z'), '#d8505e', 0)
    s += cam(d('M', (-.33, .39), 'C', (-.2, .35), (.2, .35), (.33, .39), 'L', (.3, .43), 'C', (.18, .4), (-.18, .4), (-.3, .43), 'Z'), '#c9465a', 0)
    for u0, comp in ((-.22, .14), (.22, .14)):       # os caninos de cima
        s += pol([(u0 - .045, .4), (u0 + .045, .4), (u0, .4 + comp)], '#fbf7ec', 1.6)
    for u0 in (-.11, -.04, .04, .11):                 # os da frente, de cima
        s += pol([(u0 - .03, .395), (u0 + .03, .395), (u0, .46)], '#fbf7ec', 1.4)
    for u0 in (-.15, .15):                            # os caninos de baixo
        s += pol([(u0 - .04, .6), (u0 + .04, .6), (u0, .5)], '#fbf7ec', 1.6)
    s += cam(d('M', (-.34, .38), 'C', (-.2, .3), (.2, .3), (.34, .38)), 'none', 2.6)                          # o lábio de cima
    # a corrente de ouro
    for pts in PB_CORRENTE:
        s += corrente(pts)
    # a coroa
    s += coroa(.04, -.78, .46, 8)
    return s


# -------------------------------------------------------------------------------------------------------------------- FÉ
# a cruz de pedra no escuro com a luz em faixas atrás (o jogo gira os raios por cima, com o centro em .02, -.37), as nuvens
# embaixo e a coroa ao lado (a estrelinha em .56, -.13)
FE_C = (.02, -.37)


def fe_cruz():
    pedra, lado, risco = '#ebe7dc', '#c2bba9', '#8f887a'
    s = ''
    forma = [(-.17, -.98), (.21, -.98), (.21, -.56), (.6, -.56), (.6, -.2), (.21, -.2), (.21, 1.1), (-.17, 1.1), (-.17, -.2), (-.56, -.2), (-.56, -.56), (-.17, -.56)]
    s += pol(forma, pedra, 2.8)
    # o volume: a beira de baixo e a da direita mais escuras
    s += pol([(.13, -.98), (.21, -.98), (.21, -.56), (.13, -.56)], lado, 0) + pol([(.21, -.28), (.6, -.28), (.6, -.2), (.21, -.2)], lado, 0)
    s += pol([(.13, -.2), (.21, -.2), (.21, 1.1), (.13, 1.1)], lado, 0) + pol([(-.56, -.28), (-.17, -.28), (-.17, -.2), (-.56, -.2)], lado, 0)
    s += pol(forma, 'none', 2.8)
    # as rachaduras e as lascas
    for pts in ([(-.1, -.9), (-.04, -.8), (-.07, -.7)], [(.1, -.44), (.04, -.36), (.08, -.3)], [(-.44, -.5), (-.36, -.42), (-.38, -.36)],
                [(.4, -.5), (.46, -.4)], [(-.02, .1), (.05, .22), (.0, .34), (.04, .46)], [(-.1, .62), (-.04, .7)], [(.1, .82), (.04, .92)]):
        s += linha(pts, risco, 1.4)
    s += pol([(.21, -.72), (.17, -.68), (.21, -.64)], '#17120a', 0) + pol([(-.56, -.44), (-.52, -.4), (-.56, -.36)], '#17120a', 0)
    s += traco('M%.2f %.2f V%.2f' % (X(-.12), Y(-.9), Y(-.62)), '#ffffff', 2, ' opacity=".55"')                  # a luz na beira
    s += traco('M%.2f %.2f H%.2f' % (X(-.5), Y(-.5), X(-.22)), '#ffffff', 2, ' opacity=".55"')
    return s


def fe():
    s = ret(-1.05, -1.05, 1.05, 1.05, '#15110b', 0)
    for r, c in ((1.3, '#1d170d'), (1.0, '#271e0f'), (.74, '#332710'), (.52, '#433212'), (.34, '#594216')):
        s += cir(FE_C[0], FE_C[1], r, c, 0)
    s += cir(FE_C[0], FE_C[1], .44, 'none', 0, ' stroke="#c99a2e" stroke-width="2" stroke-dasharray="3 5"')
    # as nuvens embaixo (dos dois lados)
    for sg in (-1, 1):
        base = [(sg * .9, .62, .26), (sg * .64, .72, .24), (sg * .4, .86, .2), (sg * .78, .9, .22), (sg * .98, .8, .2)]
        s += ''.join(cir(u, v, r, '#cfcabe', 2.4) for u, v, r in base)
        s += ''.join(cir(u, v, r - .02, '#e8e4da', 0) for u, v, r in base)
        s += ''.join(cir(u + sg * .03, v + .05, r * .7, '#b9b3a5', 0) for u, v, r in base)
    s += fe_cruz()
    s += coroa(.5, -.03, .3, 12)
    return s


# --------------------------------------------------------------------------------------------------------------- DRAGÃO
# o dragão enrolado no fogo: o corpo em C (de baixo, pela esquerda, até o rabo em cima), a cabeça olhando para a direita (o olho
# em .45, -.38 e a boca aberta onde sai o bafo do jogo: .62, .14), o fogo embaixo
def bezier(p0, p1, p2, p3, n):
    out = []
    for i in range(n):
        t = i / n
        a = (1 - t) ** 3; b = 3 * (1 - t) ** 2 * t; c = 3 * (1 - t) * t * t; e = t ** 3
        out.append((a * p0[0] + b * p1[0] + c * p2[0] + e * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + e * p3[1]))
    return out


DR_CORPO = [((.3, .16), (.06, .62), (-.38, .78), (-.64, .46)),
            ((-.64, .46), (-.9, .14), (-.82, -.38), (-.52, -.58)),
            ((-.52, -.58), (-.3, -.72), (-.08, -.66), (-.06, -.48))]


def dragao_corpo():
    pts = []
    for seg in DR_CORPO:
        pts += bezier(*seg, 40)
    pts.append(DR_CORPO[-1][3])
    n = len(pts)
    larg = [.17 - .135 * (i / (n - 1)) ** 1.3 for i in range(n)]   # (a meia largura: grossa no pescoço, fina no rabo)
    nor = []
    for i in range(n):
        a, b = pts[max(0, i - 1)], pts[min(n - 1, i + 1)]
        tx, ty = b[0] - a[0], b[1] - a[1]; l = math.hypot(tx, ty) or 1
        nx, ny = -ty / l, tx / l
        if nx * (0 - pts[i][0]) + ny * (0 - pts[i][1]) < 0:        # (a normal para dentro do C)
            nx, ny = -nx, -ny
        nor.append((nx, ny))
    dentro = [(p[0] + nx * w, p[1] + ny * w) for p, (nx, ny), w in zip(pts, nor, larg)]
    fora = [(p[0] - nx * w, p[1] - ny * w) for p, (nx, ny), w in zip(pts, nor, larg)]
    s = ''
    # os espinhos das costas (do lado de fora)
    for i in range(6, n - 8, 9):
        p, (nx, ny), w = pts[i], nor[i], larg[i]
        tx, ty = -ny, nx
        base1 = (p[0] - nx * w * .8 + tx * w * .45, p[1] - ny * w * .8 + ty * w * .45)
        base2 = (p[0] - nx * w * .8 - tx * w * .45, p[1] - ny * w * .8 - ty * w * .45)
        ponta = (p[0] - nx * (w + .1 + w * .25), p[1] - ny * (w + .1 + w * .25))
        s += pol([base1, ponta, base2], '#d42a12', 2)
    # o corpo
    s += pol(dentro + fora[::-1], '#ffb31a', 2.8)
    # a barriga (as placas, do lado de dentro)
    bar_d = [(p[0] + nx * w * .92, p[1] + ny * w * .92) for p, (nx, ny), w in zip(pts, nor, larg)]
    bar_f = [(p[0] + nx * w * .2, p[1] + ny * w * .2) for p, (nx, ny), w in zip(pts, nor, larg)]
    s += pol(bar_d + bar_f[::-1], '#ffe27a', 0)
    for i in range(3, n - 6, 5):
        s += linha([bar_d[i], bar_f[i]], '#d99a1a', 1.3)
    s += traco('M' + ' L'.join('%.2f %.2f' % (X(u), Y(v)) for u, v in bar_f), '#d99a1a', 1.4)
    # as escamas (do lado de fora: os arquinhos)
    for i in range(4, n - 10, 4):
        p, (nx, ny), w = pts[i], nor[i], larg[i]
        for f in (-.45, -.75):
            c = (p[0] + nx * w * f, p[1] + ny * w * f)
            r = w * .2
            ang = math.degrees(math.atan2(ny, nx))
            s += ('<path d="M%.2f %.2f a%.2f %.2f 0 0 0 %.2f %.2f" fill="none" stroke="#e07a10" stroke-width="1.5" stroke-linecap="round" transform="rotate(%.1f %.2f %.2f)"/>'
                  % (X(c[0]) - r * 104, Y(c[1]), r * 104, r * 104, 2 * r * 104, 0, ang + 90, X(c[0]), Y(c[1])))
    s += pol(dentro + fora[::-1], 'none', 2.8)
    # a ponta do rabo (a barbatana)
    pt = pts[-1]
    s += pol([(pt[0] - .04, pt[1] - .02), (pt[0] + .1, pt[1] - .16), (pt[0] + .12, pt[1] + .02), (pt[0] + .02, pt[1] + .06)], '#d42a12', 2.2)
    # a garra (a pata da frente, embaixo à esquerda)
    s += pol([(-.36, .58), (-.26, .7), (-.3, .78), (-.42, .74)], '#ffb31a', 2.2)
    for a in ((-.44, .76), (-.36, .82), (-.27, .8)):
        s += pol([(a[0] - .025, a[1] - .03), (a[0] + .025, a[1] - .03), (a[0], a[1] + .04)], '#f3e3c0', 1.4)
    return s


def dragao_cabeca():
    s = ''
    # os chifres (atrás da cabeça)
    s += cam(d('M', (.26, -.46), 'C', (.18, -.66), (.1, -.82), (-.02, -.92), 'C', (.12, -.86), (.3, -.72), (.36, -.5), 'Z'), '#f3e3c0', 2.2)
    s += cam(d('M', (.36, -.52), 'C', (.34, -.72), (.3, -.88), (.22, -.98), 'C', (.36, -.9), (.48, -.74), (.48, -.52), 'Z'), '#e6d2a8', 2.2)
    # a juba (as chamas da nuca, descendo pelo pescoço)
    s += pol([(.18, -.42), (-.04, -.42), (.1, -.3), (-.08, -.2), (.1, -.12), (-.04, .0), (.14, .02), (.06, .14), (.24, .1), (.3, -.1)], '#d42a12', 2.2)
    s += pol([(.18, -.38), (.04, -.36), (.14, -.27), (.02, -.18), (.15, -.12), (.06, -.02), (.2, .0), (.26, -.14)], '#ff6a00', 0)
    # a mandíbula de baixo (aberta) e o fundo da boca
    s += pol([(.5, .06), (.92, .04), (.9, .1), (.86, .3), (.7, .2)], '#4a0606', 2.2)
    s += cam(d('M', (.56, .1), 'C', (.66, .1), (.78, .14), (.82, .22), 'C', (.72, .2), (.62, .16), (.56, .1), 'Z'), '#e0405a', 0)        # a língua
    s += pol([(.5, .08), (.7, .2), (.86, .3), (.8, .38), (.6, .36), (.38, .26), (.3, .16)], '#ffb31a', 2.4)
    s += pol([(.5, .14), (.68, .25), (.78, .33), (.6, .32), (.42, .24)], '#ffe27a', 0)
    for u, v in ((.62, .19), (.72, .25)):           # os dentes de baixo
        s += pol([(u - .025, v + .02), (u + .025, v + .035), (u - .005, v - .045)], '#fbf7ec', 1.3)
    # a cabeça com o focinho
    s += pol([(.12, -.22), (.18, -.42), (.32, -.55), (.55, -.52), (.72, -.36), (.9, -.24), (.98, -.1), (.92, .02), (.74, .03), (.5, .06), (.36, .12), (.22, .04)], '#ffb31a', 2.6)
    s += pol([(.34, -.06), (.5, .0), (.74, .0), (.9, -.02), (.92, .02), (.74, .03), (.5, .06), (.36, .1)], '#e08a12', 0)                 # a sombra do queixo
    for u in (.6, .7, .8):                             # os dentes de cima
        s += pol([(u - .025, .03), (u + .025, .03), (u + .005, .1)], '#fbf7ec', 1.3)
    # a crista do focinho, a narina e as escamas da bochecha
    s += pol([(.55, -.52), (.62, -.6), (.66, -.46)], '#d42a12', 1.8) + pol([(.7, -.38), (.8, -.42), (.8, -.3)], '#d42a12', 1.8)
    s += cam('M%.2f %.2f q%.2f %.2f %.2f %.2f' % (X(.86), Y(-.17), 4, -4, 7, 1), 'none', 1.8)
    for u, v in ((.26, -.18), (.32, -.06), (.2, -.06)):
        s += traco('M%.2f %.2f a%.2f %.2f 0 0 0 %.2f %.2f' % (X(u) - 4, Y(v), 4, 4, 8, 0), '#d97a10', 1.5)
    # o olho bravo (o jogo acende a luz em .45, -.38)
    s += cam(d('M', (.36, -.38), 'Q', (.45, -.46), (.56, -.38), 'Q', (.45, -.32), (.36, -.38), 'Z'), '#fff2b0', 2)
    s += cam(d('M', (.45, -.43), 'Q', (.475, -.38), (.45, -.33), 'Q', (.425, -.38), (.45, -.43), 'Z'), TINTA, 0)
    s += pol([(.32, -.44), (.58, -.5), (.6, -.42), (.36, -.4)], '#c8520f', 2)                                    # a sobrancelha
    # o bigode (o fio comprido saindo do focinho)
    s += pol([(.44, .28), (.5, .48), (.56, .34), (.62, .5), (.66, .36)], '#d42a12', 1.8)                          # a barbicha
    s += pol([(.12, -.22), (.18, -.42), (.32, -.55), (.55, -.52), (.72, -.36), (.9, -.24), (.98, -.1), (.92, .02), (.74, .03), (.5, .06), (.36, .12), (.22, .04)], 'none', 2.6)
    return s


def dragao():
    s = ret(-1.05, -1.05, 1.05, 1.05, '#5a0b0a', 0)
    for (u, v, r), c in (((.42, -.18, .82), '#6e100c'), ((.42, -.18, .6), '#82160f'), ((.42, -.18, .4), '#97200f')):
        s += cir(u, v, r, c, 0)
    # a fumaça escura (os rolos) e o fogo de baixo
    for u, v, r in ((-.7, -.75, .2), (-.86, -.55, .14), (.86, .62, .18)):
        s += cir(u, v, r, '#460807', 0)
    for i, c in enumerate(('#c8320f', '#ff6a00', '#ffbf1a')):
        pts = []
        n = 9
        for j in range(n + 1):
            u = -1.05 + j * 2.1 / n
            alto = (.36, .24, .13)[i] * (1 + .45 * math.sin(j * 2.3 + i))
            pts.append((u, 1.0 - alto))
            if j < n:
                pts.append((u + 1.05 / n, 1.0 - alto * .35 - .02))
        s += pol([(-1.05, 1.1)] + pts + [(1.05, 1.1)], c, 2 if i == 0 else 0)
    s += dragao_corpo() + dragao_cabeca()
    return s


# ------------------------------------------------------------------------------------------------------------------ o kit
def peca(nome):
    corpo = {'cria': lambda: cria_fundo() + cria_menino(), 'cristo': cristo_fundo, 'pitbull': pitbull, 'fe': fe, 'dragao': dragao,
             'cria_menino': cria_menino, 'cristo_estatua': cristo_estatua, 'fe_cruz': fe_cruz}[nome]()
    clip = 'cc-' + nome
    return ('<defs><clipPath id="%s"><circle cx="104" cy="104" r="103.5"/></clipPath></defs><g clip-path="url(#%s)">%s</g>' % (clip, clip, corpo))


def rects():
    out = {}
    for i, n in enumerate(NOMES):
        out[n] = [(i % 3) * (LADO + 2), (i // 3) * (LADO + 2), LADO, LADO]
    return out


def svg_kit():
    R = rects()
    w = 3 * LADO + 4
    h = 3 * LADO + 4
    corpo = ''.join('<svg x="%d" y="%d" width="%d" height="%d" viewBox="0 0 208 208" overflow="hidden">%s</svg>' % (x, y, ww, hh, peca(n))
                    for n, (x, y, ww, hh) in R.items())
    return '<svg xmlns="http://www.w3.org/2000/svg" width="%d" height="%d" viewBox="0 0 %d %d">%s</svg>' % (w, h, w, h, corpo), w, h
