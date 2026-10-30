"""RACHA v95 · a FOLHA DE ÍCONES desenhada em código (no lugar da da v77, que vinha de uma imagem gerada por IA): os mesmos
24 ícones nos mesmos lugares (tools/v77/icones.json — 520 × 268), no estilo dos ícones da v91 (o contorno de tinta grosso, a
cor chapada e um brilho só). A moeda e a gema daqui são as de todo o jogo (.ic-moeda e .ic-gema)."""
import json, math, pathlib

TINTA = '#0f1222'
AQUI = pathlib.Path(__file__).resolve().parent
P = json.loads((AQUI.parent.parent / 'v77' / 'icones.json').read_text(encoding='utf-8'))
K = 3.2                                               # (a grossura do contorno de tinta, em px da folha)


def ret(x, y, w, h, cor, rx=0, k=K, extra=''):
    return '<rect x="%.1f" y="%.1f" width="%.1f" height="%.1f" rx="%.1f" fill="%s" stroke="%s" stroke-width="%.1f" stroke-linejoin="round"%s/>' % (x, y, w, h, rx, cor, TINTA, k, extra)


def cir(x, y, r, cor, k=K, extra=''):
    return '<circle cx="%.1f" cy="%.1f" r="%.1f" fill="%s" stroke="%s" stroke-width="%.1f"%s/>' % (x, y, r, cor, TINTA, k, extra)


def pol(pts, cor, k=K, extra=''):
    return '<polygon points="%s" fill="%s" stroke="%s" stroke-width="%.1f" stroke-linejoin="round"%s/>' % (' '.join('%.1f,%.1f' % p for p in pts), cor, TINTA, k, extra)


def cam(d, cor, k=K, extra=''):
    return '<path d="%s" fill="%s" stroke="%s" stroke-width="%.1f" stroke-linejoin="round" stroke-linecap="round"%s/>' % (d, cor, TINTA, k, extra)


def luz(d, op=.55):
    return '<path d="%s" fill="none" stroke="#ffffff" stroke-width="2.6" stroke-linecap="round" opacity="%s"/>' % (d, op)


def estrela_pts(cx, cy, r, ri, n=5, a0=-math.pi / 2):
    return [(cx + math.cos(a0 + i * math.pi / n) * (r if i % 2 == 0 else ri), cy + math.sin(a0 + i * math.pi / n) * (r if i % 2 == 0 else ri)) for i in range(2 * n)]


def cifrao(cx, cy, h, cor):
    """o $ desenhado (sem letra: o ícone também vira imagem solta, sem as fontes do jogo)"""
    w = h * .62
    S = ('M%.2f %.2f C%.2f %.2f %.2f %.2f %.2f %.2f C%.2f %.2f %.2f %.2f %.2f %.2f C%.2f %.2f %.2f %.2f %.2f %.2f'
         % (cx + .42 * w, cy - .3 * h, cx + .3 * w, cy - .5 * h, cx - .52 * w, cy - .5 * h, cx - .48 * w, cy - .2 * h,
            cx - .44 * w, cy + .02 * h, cx + .48 * w, cy - .04 * h, cx + .48 * w, cy + .2 * h,
            cx + .5 * w, cy + .5 * h, cx - .32 * w, cy + .5 * h, cx - .44 * w, cy + .3 * h))
    k = h * .17
    return ('<path d="%s" fill="none" stroke="%s" stroke-width="%.2f" stroke-linecap="round" stroke-linejoin="round"/>' % (S, cor, k)
            + '<path d="M%.2f %.2f V%.2f" stroke="%s" stroke-width="%.2f" stroke-linecap="round"/>' % (cx, cy - .6 * h, cy + .6 * h, cor, k * .8))


def moeda(w, h, r=None):
    cx, cy = w / 2, h / 2; r = r or min(w, h) / 2 - 3
    return (cir(cx, cy + 1.5, r, '#c98500') + cir(cx, cy, r, '#ffcf2e') + cir(cx, cy, r * .72, '#ffbf1a', 2.2)
            + cifrao(cx, cy, r * .78, '#8a5a00')
            + luz('M%.1f %.1f A%.1f %.1f 0 0 1 %.1f %.1f' % (cx - r * .62, cy - r * .2, r * .7, r * .7, cx - r * .1, cy - r * .66)))


def gema(w, h):
    cx = w / 2
    t, m, b = 6, h * .38, h - 4
    L, R = 4, w - 4
    return (pol([(L + 7, t), (R - 7, t), (R, m), (cx, b), (L, m)], '#3fb6ff')
            + pol([(L + 7, t), (cx, t), (cx - 7, m), (L, m)], '#9be3ff', 0) + pol([(cx, t), (R - 7, t), (R, m), (cx + 7, m)], '#5cc8ff', 0)
            + pol([(L, m), (cx - 7, m), (cx, b)], '#2a8de0', 0) + pol([(cx + 7, m), (R, m), (cx, b)], '#1f6fc4', 0)
            + pol([(L + 7, t), (R - 7, t), (R, m), (cx, b), (L, m)], 'none') + cam('M%.1f %.1f H%.1f' % (L + 1, m, R - 1), 'none', 2)
            + luz('M%.1f %.1f L%.1f %.1f' % (L + 9, t + 5, cx - 6, t + 5), .8))


def pessoas(w, h, c1, c2, branco=False):
    k = 2.6 if branco else K
    a = '#f3efe6' if branco else c1; b = '#d9d6ea' if branco else c2
    return (cir(w * .68, h * .32, h * .2, b, k) + cam('M%.1f %.1f C%.1f %.1f %.1f %.1f %.1f %.1fZ' % (w * .42, h - 3, w * .44, h * .5, w * .96, h * .5, w - 3, h - 3), b, k)
            + cir(w * .36, h * .3, h * .23, a, k) + cam('M3 %.1f C3 %.1f %.1f %.1f %.1f %.1fZ' % (h - 3, h * .48, w * .72, h * .48, w * .7, h - 3), a, k))


def desenha(nome, w, h):
    if nome == 'loja':                                 # o carrinho
        return (cam('M3 10 H14 L22 44 H%.1f L%.1f 18 H17' % (w - 14, w - 5), 'none', 4) + cam('M17 18 H%.1f L%.1f 40 H22Z' % (w - 5, w - 12), '#e5392f')
                + ''.join(cam('M%.1f 21 L%.1f 37' % (24 + i * 10, 26 + i * 9), 'none', 2.2) for i in range(5))
                + cir(26, h - 11, 6.5, '#f3efe6') + cir(w - 18, h - 11, 6.5, '#f3efe6') + luz('M22 22 H%.1f' % (w - 12), .6))
    if nome == 'tampinha':                             # a tampinha (a inicial) com a coroa
        cx, cy, r = w * .44, h * .56, h * .4
        dentes = [(cx + math.cos(i * math.pi / 14) * (r if i % 2 == 0 else r * .9), cy + math.sin(i * math.pi / 14) * (r if i % 2 == 0 else r * .9)) for i in range(28)]
        return (pol(dentes, '#c9ccd8') + '<clipPath id="tpc"><circle cx="%.1f" cy="%.1f" r="%.1f"/></clipPath>' % (cx, cy, r * .68)
                + '<g clip-path="url(#tpc)"><rect x="%.1f" y="%.1f" width="%.1f" height="%.1f" fill="#7a3fc4"/><rect x="%.1f" y="%.1f" width="%.1f" height="%.1f" fill="#f3efe6"/><rect x="%.1f" y="%.1f" width="%.1f" height="%.1f" fill="#ff6a00"/></g>'
                % (cx - r, cy - r, r * .76, 2 * r, cx - r * .24, cy - r, r * .48, 2 * r, cx + r * .24, cy - r, r, 2 * r)
                + cir(cx, cy, r * .68, 'none', 2.6)
                + pol([(w - 30, 18), (w - 30, 4), (w - 22, 11), (w - 15, 2), (w - 8, 11), (w - 2, 4), (w - 2, 18)], '#ffcf2e', 2.6))
    if nome == 'clube':                                # o escudo
        d = 'M%.1f 4 L%.1f 11 V%.1f C%.1f %.1f %.1f %.1f %.1f %.1f C%.1f %.1f %.1f %.1f %.1f %.1f V11Z' % (w / 2, w - 4, h * .5, w - 4, h * .78, w * .7, h * .9, w / 2, h - 3, w * .3, h * .9, 4, h * .78, 4, h * .5)
        return (cam(d, '#e5392f') + cam('M%.1f 12 L%.1f 17 V%.1f C%.1f %.1f %.1f %.1f %.1f %.1f' % (w / 2, w - 11, h * .5, w - 11, h * .7, w * .66, h * .8, w / 2, h - 11), 'none', 0, ' stroke="#ff8a7a" stroke-width="3"')
                + pol([(w * .27, h * .55), (w * .27, h * .32), (w * .38, h * .43), (w / 2, h * .26), (w * .62, h * .43), (w * .73, h * .32), (w * .73, h * .55)], '#ffcf2e', 2.6))
    if nome == 'treino':                               # o cone
        return (ret(4, h - 13, w - 8, 9, '#ff6a00', 3) + pol([(w * .38, 5), (w * .62, 5), (w * .82, h - 12), (w * .18, h - 12)], '#ff6a00')
                + pol([(w * .31, h * .3), (w * .69, h * .3), (w * .74, h * .46), (w * .26, h * .46)], '#f3efe6', 0) + pol([(w * .23, h * .6), (w * .77, h * .6), (w * .8, h * .74), (w * .2, h * .74)], '#f3efe6', 0)
                + pol([(w * .38, 5), (w * .62, 5), (w * .82, h - 12), (w * .18, h - 12)], 'none') + luz('M%.1f 12 L%.1f %.1f' % (w * .45, w * .36, h * .52)))
    if nome == 'salas':                                # a casa (a sala)
        return (pol([(w / 2, 4), (w - 4, h * .46), (w - 12, h * .46), (w - 12, h - 4), (12, h - 4), (12, h * .46), (4, h * .46)], '#f3efe6')
                + pol([(w / 2, 4), (w - 4, h * .46), (w - 12, h * .46), (w / 2, h * .17), (12, h * .46), (4, h * .46)], '#7a3fc4') + ret(w / 2 - 8, h * .58, 16, h * .42 - 4, '#7a3fc4', 2) + cir(w / 2 + 4, h * .78, 1.8, '#ffcf2e', 0))
    if nome == 'amigos':
        return pessoas(w, h, '#26b866', '#1f9fb0')
    if nome in ('ranking',):                           # a taça
        return (cam('M%.1f 8 C2 8 2 %.1f %.1f %.1f' % (w * .26, h * .42, w * .3, h * .46), 'none', 4) + cam('M%.1f 8 C%.1f 8 %.1f %.1f %.1f %.1f' % (w * .74, w - 2, w - 2, h * .42, w * .7, h * .46), 'none', 4)
                + cam('M%.1f 4 H%.1f V%.1f C%.1f %.1f %.1f %.1f %.1f %.1f C%.1f %.1f %.1f %.1f %.1f %.1fZ' % (w * .24, w * .76, h * .3, w * .76, h * .52, w * .62, h * .62, w / 2, h * .62, w * .38, h * .62, w * .24, h * .52, w * .24, h * .3), '#ffcf2e')
                + ret(w * .44, h * .62, w * .12, h * .14, '#e0a400', 0) + ret(w * .28, h * .75, w * .44, h * .2, '#ffcf2e', 3) + pol(estrela_pts(w / 2, h * .3, 8, 3.6), '#fff1b0', 1.6) + luz('M%.1f 10 V%.1f' % (w * .33, h * .38)))
    if nome == 'eventos':                              # o calendário
        return (ret(4, 9, w - 8, h - 13, '#f3efe6', 6) + cam('M4 22 V15 Q4 9 10 9 H%.1f Q%.1f 9 %.1f 15 V22Z' % (w - 10, w - 4, w - 4), '#e5392f')
                + ret(17, 3, 6, 12, '#d9d6ea', 3, 2.4) + ret(w - 23, 3, 6, 12, '#d9d6ea', 3, 2.4)
                + ''.join(ret(13 + (i % 4) * ((w - 26) / 4), 28 + (i // 4) * 11, 8, 7, '#7a3fc4' if i != 6 else '#ff6a00', 1.5, 0) for i in range(8)))
    if nome == 'moeda':
        return moeda(w, h)
    if nome == 'gema':
        return gema(w, h)
    if nome == 'amigos_topo':
        return pessoas(w, h, '', '', True)
    if nome == 'ajustes_topo':                         # a engrenagem
        cx, cy = w / 2, h / 2; R, r = min(w, h) / 2 - 2, min(w, h) / 2 - 7
        pts = []
        for i in range(8):
            a = i * math.pi / 4
            for da, rr in ((-.2, R), (.2, R), (.32, r), (.68, r)):
                pts.append((cx + math.cos(a + da) * rr, cy + math.sin(a + da) * rr))
        return pol(pts, '#f3efe6', 2.6) + cir(cx, cy, 5.5, '#262d58', 2.6)
    if nome == 'desafios':                             # a prancheta das missões
        return (ret(6, 7, w - 12, h - 10, '#7a3fc4', 7) + ret(13, 14, w - 26, h - 24, '#f3efe6', 3, 2.6) + ret(w / 2 - 10, 2, 20, 10, '#d9d6ea', 3, 2.6)
                + ''.join(cam('M19 %.1f l4 4 l7 -8' % (26 + i * 12), 'none', 3, ' stroke="#26b866"') + ret(33, 25 + i * 12, w - 52, 4, '#b9b6cc', 2, 0) for i in range(3)))
    if nome == 'pilha':                                # a pilha de moedas
        s = ''
        for (x, n) in ((10, 3), (30, 5), (50, 4)):
            for i in range(n):
                y = h - 10 - i * 7
                s += '<ellipse cx="%.1f" cy="%.1f" rx="11" ry="5" fill="%s" stroke="%s" stroke-width="2.6"/>' % (x + 2, y, '#ffcf2e' if i == n - 1 else '#e8aa10', TINTA)
        return s
    if nome == 'campo':                                # o campo
        return (ret(6, 4, w - 12, h - 8, '#26a957', 5) + ret(6, 4 + (h - 8) * .25, w - 12, (h - 8) * .25, '#2fbf63', 0, 0) + ret(6, 4 + (h - 8) * .75 - 1, w - 12, 1, '#2fbf63', 0, 0)
                + ret(6, 4, w - 12, h - 8, 'none', 5) + cam('M6 %.1f H%.1f' % (h / 2, w - 6), 'none', 2.4, ' stroke="#f3efe6"') + '<circle cx="%.1f" cy="%.1f" r="8" fill="none" stroke="#f3efe6" stroke-width="2.4"/>' % (w / 2, h / 2)
                + ret(w / 2 - 11, 4, 22, 9, 'none', 0, 2.4).replace('stroke="%s"' % TINTA, 'stroke="#f3efe6"') + ret(w / 2 - 11, h - 13, 22, 9, 'none', 0, 2.4).replace('stroke="%s"' % TINTA, 'stroke="#f3efe6"'))
    if nome == 'coroa':
        return (pol([(4, h - 6), (4, h * .3), (w * .27, h * .55), (w / 2, 4), (w * .73, h * .55), (w - 4, h * .3), (w - 4, h - 6)], '#ffcf2e')
                + ret(4, h - 15, w - 8, 10, '#ffe27a', 2) + cir(w / 2, 6, 4, '#7a3fc4', 2.2) + cir(5, h * .3, 3.6, '#ff6a00', 2.2) + cir(w - 5, h * .3, 3.6, '#ff6a00', 2.2))
    if nome == 'relogio':
        cx, cy, r = w / 2, h * .56, min(w, h) * .4
        return (ret(cx - 5, 1, 10, 7, '#d9d6ea', 2, 2.4) + cir(cx, cy, r, '#f3efe6') + cam('M%.1f %.1f V%.1f L%.1f %.1f' % (cx, cy - r * .62, cy, cx + r * .45, cy + r * .3), 'none', 3))
    if nome == 'estrela':
        return pol(estrela_pts(w / 2, h * .53, min(w, h) / 2 - 2, min(w, h) * .22), '#ffcf2e') + luz('M%.1f %.1f L%.1f %.1f' % (w * .4, h * .3, w * .46, h * .2), .8)
    if nome == 'bio':                                  # o bloco e o lápis
        return (ret(3, 4, w - 10, h - 7, '#ffcf2e', 3, 2.6) + ''.join(ret(8, 10 + i * 6, w - 22, 2, '#b37400', 1, 0) for i in range(3))
                + cam('M%.1f %.1f L%.1f %.1f L%.1f %.1f L%.1f %.1fZ' % (w - 3, 8, w - 9, 2, w - 22, 22, w - 20, 26), '#f3efe6', 2.2))
    if nome == 'bola':
        cx, cy, r = w / 2, h / 2, min(w, h) / 2 - 3
        pent = lambda x, y, rr, a0: [(x + math.cos(a0 + k * 2 * math.pi / 5) * rr, y + math.sin(a0 + k * 2 * math.pi / 5) * rr) for k in range(5)]
        s = cir(cx, cy, r, '#f3efe6') + pol(pent(cx, cy, r * .34, -math.pi / 2), TINTA, 0)
        for k in range(5):
            a = -math.pi / 2 + math.pi / 5 + k * 2 * math.pi / 5
            s += pol(pent(cx + math.cos(a) * r * .88, cy + math.sin(a) * r * .88, r * .26, a + math.pi), TINTA, 0)
        return s + cir(cx, cy, r, 'none') + luz('M%.1f %.1f A%.1f %.1f 0 0 1 %.1f %.1f' % (cx - r * .6, cy - r * .3, r * .7, r * .7, cx - r * .15, cy - r * .7), .8)
    if nome in ('chuteira', 'trofeu', 'controle', 'porcento'):   # as placas das estatísticas (o quadrado colorido e o desenho branco)
        cor = {'chuteira': '#2c6be0', 'trofeu': '#26a957', 'controle': '#7a3fc4', 'porcento': '#e5392f'}[nome]
        base = ret(3, 3, w - 6, h - 6, cor, 10) + '<rect x="6" y="6" width="%.1f" height="5" rx="2.5" fill="#ffffff" opacity=".22"/>' % (w - 12)
        cx, cy = w / 2, h / 2 + 1
        if nome == 'chuteira':
            g = cam('M10 %.1f C10 %.1f 14 %.1f 18 %.1f L26 %.1f C30 %.1f 40 %.1f 42 %.1f L42 %.1f H10Z' % (cy + 8, cy - 2, cy - 6, cy - 6, cy - 2, cy + 1, cy + 1, cy + 5, cy + 9), '#f3efe6', 2.4) + ''.join(ret(13 + i * 8, cy + 9, 3, 4, '#f3efe6', 1, 1.6) for i in range(4))
        elif nome == 'trofeu':
            g = (cam('M%.1f %.1f H%.1f V%.1f C%.1f %.1f %.1f %.1f %.1f %.1f C%.1f %.1f %.1f %.1f %.1f %.1fZ' % (cx - 10, cy - 12, cx + 10, cy - 3, cx + 10, cy + 5, cx + 5, cy + 7, cx, cy + 7, cx - 5, cy + 7, cx - 10, cy + 5, cx - 10, cy - 3), '#ffcf2e', 2.4)
                 + ret(cx - 8, cy + 9, 16, 5, '#ffcf2e', 1.5, 2.2) + ret(cx - 2, cy + 7, 4, 3, '#e0a400', 0, 0))
        elif nome == 'controle':
            g = (cir(cx - 11, cy + 5, 7, '#f3efe6', 2.4) + cir(cx + 11, cy + 5, 7, '#f3efe6', 2.4) + ret(cx - 17, cy - 9, 34, 17, '#f3efe6', 8, 2.4)
                 + '<rect x="%.1f" y="%.1f" width="12" height="9" fill="#f3efe6"/>' % (cx - 6, cy + 1)
                 + ret(cx - 13, cy - 2.5, 9, 3, '#7a3fc4', 1, 0) + ret(cx - 10, cy - 5.5, 3, 9, '#7a3fc4', 1, 0) + cir(cx + 8, cy - 3, 2.2, '#ff6a00', 0) + cir(cx + 12, cy + 1, 2.2, '#26a957', 0))
        else:
            g = ('<text x="%.1f" y="%.1f" text-anchor="middle" font-family="LilitaOne" font-size="28" fill="#f3efe6" stroke="%s" stroke-width="5" paint-order="stroke">%%</text>' % (cx, cy + 10, TINTA))
        return base + g
    return ''


def svg_icones():
    W, H = 520, 268
    corpo = ''
    for nome, (x, y, w, h) in P.items():
        corpo += '<g transform="translate(%d %d)">%s</g>' % (x, y, desenha(nome, w, h))
    return '<svg xmlns="http://www.w3.org/2000/svg" width="%d" height="%d" viewBox="0 0 %d %d">%s</svg>' % (W, H, W, H, corpo)
