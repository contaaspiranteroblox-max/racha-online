"""RACHA v101 · os ÍCONES no estilo da tela inicial nova (coloridos, com volume: o degradê, um brilho em cima, o contorno escuro
fino e a sombrinha embaixo). Os mesmos 22 nomes do sprite da v91/v95 (v91i-*, as mesmas larguras de viewBox: 100, e 120 no
bilhete) e mais 5 novos: oficina, bola, troca, wifi e pessoa. Tudo desenhado aqui, em código (sem imagem e sem letra: a moeda
e a gema também viram imagens soltas, sem as fontes do jogo).

Este arquivo não importa nada do projeto (o build carrega este e o da v95 no mesmo processo). Os degradês de cada símbolo
ficam dentro dele (<defs> no <symbol>, ids v101g-<nome>-<n>): o símbolo funciona sozinho no <use> e também quando o jogo monta a
moeda e a gema como imagem (o innerHTML do símbolo leva os degradês junto). O <svg> do sprite não pode ser display:none (os
degradês param de pintar): fica com tamanho zero, como o da v95.
Uso: from sprite import svg_sprite → o <svg> com o <defs> vazio (o jogo usa) e os 27 <symbol>.
"""
import math

OUT = '#0b0d26'          # o contorno
K = 3.4                   # a grossura do contorno (na caixa de 100)
LARGOS = {'bilhete': 120}
NOMES = ['loja', 'cofre', 'clube', 'treino', 'salas', 'amigos', 'ranking', 'eventos', 'moeda', 'gema', 'mais', 'carta', 'chat', 'galera',
         'ajustes', 'coroa', 'bilhete', 'missoes', 'campo', 'play', 'volta', 'desce', 'oficina', 'bola', 'troca', 'wifi', 'pessoa']

OURO = ('#fff09a', '#ffcf3a', '#e8960e')
ROXO = ('#c79bff', '#9a5cf5', '#5b21b6')
VERM = ('#ff8a8a', '#f43f4e', '#b3122a')
VERDE = ('#8af7a2', '#34d35a', '#15803d')
CIANO = ('#a5f3ff', '#38c8f5', '#1675c8')
BRANCO = ('#ffffff', '#f1f2fb', '#c3c7e2')
LARANJA = ('#ffc27a', '#ff8a2e', '#e2510f')


def n(v):
    return ('%.2f' % v).rstrip('0').rstrip('.')


class Sim:
    def __init__(self, nome):
        self.nome, self.w, self.defs, self.corpo, self.k = nome, LARGOS.get(nome, 100), [], [], 0

    def __call__(self, s):
        self.corpo.append(s)

    def grad(self, cores, x1=0, y1=0, x2=0, y2=1):
        self.k += 1
        i = 'v101g-%s-%d' % (self.nome, self.k)
        st = ''.join('<stop offset="%s" stop-color="%s"/>' % (n(j / (len(cores) - 1)), c) for j, c in enumerate(cores))
        self.defs.append('<linearGradient id="%s" x1="%s" y1="%s" x2="%s" y2="%s">%s</linearGradient>' % (i, n(x1), n(y1), n(x2), n(y2), st))
        return 'url(#%s)' % i

    def radial(self, cores, cx=.35, cy=.3, r=.85):
        self.k += 1
        i = 'v101g-%s-%d' % (self.nome, self.k)
        st = ''.join('<stop offset="%s" stop-color="%s"/>' % (n(j / (len(cores) - 1)), c) for j, c in enumerate(cores))
        self.defs.append('<radialGradient id="%s" cx="%s" cy="%s" r="%s">%s</radialGradient>' % (i, n(cx), n(cy), n(r), st))
        return 'url(#%s)' % i

    def clip(self, forma):
        self.k += 1
        i = 'v101g-%s-%d' % (self.nome, self.k)
        self.defs.append('<clipPath id="%s">%s</clipPath>' % (i, forma))
        return 'url(#%s)' % i

    def p(self, d, fill, k=K, extra=''):
        self('<path d="%s" fill="%s" stroke="%s" stroke-width="%s" stroke-linejoin="round" stroke-linecap="round"%s/>' % (d, fill, OUT, n(k), extra))

    def sombra(self, d, dy=3.6, op=.32):
        self('<path d="%s" fill="#04051a" opacity="%s" transform="translate(0 %s)"/>' % (d, n(op), n(dy)))

    def luz(self, d, op=.55, k=3.2):
        self('<path d="%s" fill="none" stroke="#ffffff" stroke-width="%s" stroke-linecap="round" opacity="%s"/>' % (d, n(k), n(op)))

    def traco(self, d, cor, k, sob=True):
        """um traço grosso com contorno (o contorno é um traço mais grosso por baixo)"""
        if sob:
            self('<path d="%s" fill="none" stroke="%s" stroke-width="%s" stroke-linecap="round" stroke-linejoin="round"/>' % (d, OUT, n(k + 2 * K * .9)))
        self('<path d="%s" fill="none" stroke="%s" stroke-width="%s" stroke-linecap="round" stroke-linejoin="round"/>' % (d, cor, n(k)))

    def svg(self):
        return '<symbol id="v91i-%s" viewBox="0 0 %d 100"><defs>%s</defs>%s</symbol>' % (self.nome, self.w, ''.join(self.defs), ''.join(self.corpo))


def ret(x, y, w, h, r=0):
    if not r:
        return 'M%s %s H%s V%s H%s Z' % (n(x), n(y), n(x + w), n(y + h), n(x))
    return ('M%s %s H%s Q%s %s %s %s V%s Q%s %s %s %s H%s Q%s %s %s %s V%s Q%s %s %s %s Z'
            % (n(x + r), n(y), n(x + w - r), n(x + w), n(y), n(x + w), n(y + r), n(y + h - r), n(x + w), n(y + h), n(x + w - r), n(y + h),
               n(x + r), n(x), n(y + h), n(x), n(y + h - r), n(y + r), n(x), n(y), n(x + r), n(y)))


def circ(cx, cy, r):
    return 'M%s %s A%s %s 0 1 0 %s %s A%s %s 0 1 0 %s %s Z' % (n(cx - r), n(cy), n(r), n(r), n(cx + r), n(cy), n(r), n(r), n(cx - r), n(cy))


def poli(pts):
    return 'M' + ' L'.join('%s %s' % (n(x), n(y)) for x, y in pts) + ' Z'


def cifrao(cx, cy, h, cor):
    """o $ desenhado em traço (sem letra)"""
    w = h * .62
    d = ('M%s %s C%s %s %s %s %s %s C%s %s %s %s %s %s C%s %s %s %s %s %s'
         % (n(cx + .42 * w), n(cy - .3 * h), n(cx + .3 * w), n(cy - .5 * h), n(cx - .52 * w), n(cy - .5 * h), n(cx - .48 * w), n(cy - .2 * h),
            n(cx - .44 * w), n(cy + .02 * h), n(cx + .48 * w), n(cy - .04 * h), n(cx + .48 * w), n(cy + .2 * h),
            n(cx + .5 * w), n(cy + .5 * h), n(cx - .32 * w), n(cy + .5 * h), n(cx - .44 * w), n(cy + .3 * h)))
    k = h * .17
    return ('<path d="%s" fill="none" stroke="%s" stroke-width="%s" stroke-linecap="round" stroke-linejoin="round"/>' % (d, cor, n(k))
            + '<path d="M%s %s V%s" stroke="%s" stroke-width="%s" stroke-linecap="round"/>' % (n(cx), n(cy - .6 * h), n(cy + .6 * h), cor, n(k * .8)))


# ================================================================================================ os ícones
def loja(S):
    cesto = 'M22 30 H90 L82 64 H31 Z'
    S.sombra(cesto)
    S.traco('M7 20 H19 L31 64 L35 74 H82', '#d6d9ea', 4.2)
    S.p(cesto, S.grad(VERM))
    S('<path d="M37 34 L41 60 M51 34 L52 60 M65 34 L64 60 M78 34 L74 60 M26 47 H86" stroke="#ffffff" stroke-width="2.4" opacity=".38" fill="none"/>')
    for x in (41, 75):
        S.p(circ(x, 84, 8.5), S.grad(('#4a4f78', '#22264a')))
        S('<circle cx="%d" cy="84" r="3" fill="#c9cde2"/>' % x)
    S.luz('M29 36 H84', .6)


def cofre(S):
    S.sombra(ret(11, 20, 78, 68, 8))
    S.p('M11 50 V38 Q11 19 30 19 H70 Q89 19 89 38 V50 Z', S.grad(ROXO))
    S.p(ret(11, 46, 78, 42, 6), S.grad(('#a374ff', '#7a3ae8', '#4c1a9e')))
    for x in (23, 69):
        S.p(ret(x, 19, 8, 69, 2), S.grad(OURO, 0, 0, 1, 0), 2.6)
    S.p(ret(8, 44, 84, 9, 3), S.grad(OURO), 2.6)
    S.p(ret(41, 50, 18, 21, 4), S.grad(OURO), 2.6)
    S('<circle cx="50" cy="58.5" r="3" fill="%s"/><rect x="48.6" y="59" width="2.8" height="7" rx="1.2" fill="%s"/>' % (OUT, OUT))
    S.luz('M19 34 Q21 25 33 24 H40', .6)


def clube(S):
    esc = 'M50 7 L87 19 V48 Q87 77 50 93 Q13 77 13 48 V19 Z'
    S.sombra(esc)
    S.p(esc, S.grad(VERM))
    S('<path d="M50 15 L80 25 V48 Q80 71 50 85 Q20 71 20 48 V25 Z" fill="none" stroke="#ffb0b0" stroke-width="2.4" opacity=".55"/>')
    S.p(poli([(31, 64), (27, 37), (40, 48), (50, 30), (60, 48), (73, 37), (69, 64)]), S.grad(OURO), 2.8)
    S.p(ret(31, 61, 38, 8, 2), S.grad(('#ffd75a', '#d9890a')), 2.6)
    S.luz('M22 23 L48 14', .55)


def treino(S):
    cone = 'M44 12 Q50 7 56 12 L81 78 H19 Z'
    S.sombra(ret(10, 74, 80, 16, 5))
    S.p(ret(10, 74, 80, 15, 5), S.grad(('#3a3e66', '#1a1d3a')))
    S.p(cone, S.grad(LARANJA, 0, 0, 1, 0))
    esq = lambda y: 44 - 25 * (y - 12) / 66
    dir_ = lambda y: 56 + 25 * (y - 12) / 66
    for y0, y1 in ((36, 47), (57, 68)):
        S.p(poli([(esq(y0), y0), (dir_(y0), y0), (dir_(y1), y1), (esq(y1), y1)]), S.grad(('#ffffff', '#dfe1f2')), 2.2)
    S.luz('M43 19 L31 66', .5)


def salas(S):
    S.sombra(ret(20, 42, 60, 48))
    S.p(ret(65, 18, 10, 20, 1.5), S.grad(ROXO))
    S.p(ret(21, 44, 58, 45, 2), S.grad(BRANCO))
    S.p('M8 49 L50 13 L92 49 L84 56 L50 28 L16 56 Z', S.grad(ROXO))
    S.p('M41 89 V67 Q41 58 50 58 Q59 58 59 67 V89 Z', S.grad(('#a678ff', '#5b21b6')), 2.8)
    S('<circle cx="55" cy="75" r="2" fill="#ffd36b"/>')
    S.p(circ(50, 42, 5), S.grad(('#fff2a8', '#ffb82e')), 2.2)
    S.luz('M22 45 L47 24', .55)


def pessoas(S, c_tras, c_frente):
    S.sombra('M10 90 Q10 58 38 56 Q66 58 66 90 Z')
    S.p(circ(65, 30, 13), S.grad(c_tras))
    S.p('M43 86 Q43 55 65 53 Q87 55 87 86 Z', S.grad(c_tras))
    S.p(circ(38, 34, 15.5), S.grad(c_frente))
    S.p('M11 90 Q11 58 38 56 Q65 58 65 90 Z', S.grad(c_frente))
    S.luz('M29 27 Q32 22 38 22', .6, 3)
    S.luz('M20 72 Q23 64 31 62', .45, 3)


def amigos(S):
    pessoas(S, CIANO, VERDE)


def galera(S):
    pessoas(S, ('#e6e8f6', '#c3c8e4', '#8f96bf'), BRANCO)


def ranking(S):
    for x, y in ((13, 47), (39, 15), (65, 59)):
        S.sombra(ret(x, y, 23, 89 - y, 3))
        S.p(ret(x, y, 23, 89 - y, 3), S.grad(ROXO, 0, 0, 1, 1))
        S.luz('M%s %s V%s' % (n(x + 6), n(y + 6), n(y + min(34, 85 - y - 6))), .5, 3)


def eventos(S):
    S.sombra(ret(11, 21, 78, 70, 8))
    S.p(ret(11, 21, 78, 70, 8), S.grad(BRANCO))
    S.p('M11 43 V29 Q11 21 19 21 H81 Q89 21 89 29 V43 Z', S.grad(VERM))
    for x in (29, 64):
        S.p(ret(x, 10, 8, 20, 4), S.grad(('#5a5f88', '#2a2e52')), 2.6)
    for rr in range(3):
        for c in range(4):
            cor = '#f43f4e' if (rr, c) == (1, 2) else '#2b2f55'
            S('<rect x="%s" y="%s" width="9" height="8" rx="1.6" fill="%s"/>' % (n(21 + c * 16), n(51 + rr * 12.5), cor))
    S.luz('M19 30 H45', .6)


def moeda(S):
    S.sombra(circ(50, 50, 42))
    S.p(circ(50, 50, 42), S.grad(('#ffe57a', '#f6a70f', '#b96d00')))
    S('<circle cx="50" cy="50" r="33" fill="%s" stroke="#a86400" stroke-width="2.6"/>' % S.radial(('#fff3b0', '#ffd23f', '#f0a512'), .38, .32, .8))
    S(cifrao(50, 50, 34, '#a05e00'))
    S.luz('M22 40 A30 30 0 0 1 40 21', .75, 4)


def gema(S):
    con = poli([(17, 35), (32, 15), (68, 15), (83, 35), (50, 89)])
    S.sombra(con)
    S.p(con, S.grad(CIANO))
    for pts, cor in (([(32, 15), (68, 15), (60, 35), (40, 35)], '#c4f8ff'), ([(17, 35), (32, 15), (40, 35)], '#86e8ff'), ([(68, 15), (83, 35), (60, 35)], '#56cff5'),
                     ([(17, 35), (40, 35), (50, 89)], '#3ab8f2'), ([(40, 35), (60, 35), (50, 89)], '#24a2e6'), ([(60, 35), (83, 35), (50, 89)], '#1677c4')):
        S('<path d="%s" fill="%s"/>' % (poli(pts), cor))
    S('<path d="%s" fill="none" stroke="%s" stroke-width="%s" stroke-linejoin="round"/>' % (con, OUT, n(K)))
    S('<path d="M17.5 35 H82.5" stroke="%s" stroke-width="2" opacity=".55"/>' % OUT)
    S.luz('M35 20 L44 31', .8, 3)


def mais(S):
    S.sombra(ret(8, 8, 84, 84, 18))
    S.p(ret(8, 8, 84, 84, 18), S.grad(VERDE))
    S('<path d="M14 66 Q14 86 34 86 H66 Q86 86 86 66 Z" fill="#0f6b2e" opacity=".35"/>')
    S.traco('M50 27 V73 M27 50 H73', '#ffffff', 12)
    S.luz('M20 22 Q24 16 34 16', .5, 3.4)


def carta(S):
    S.sombra(ret(9, 23, 82, 56, 8))
    S.p(ret(9, 23, 82, 56, 8), S.grad(BRANCO))
    S('<path d="M13 76 L40 52 M87 76 L60 52" stroke="#a9aed0" stroke-width="2.6" fill="none" stroke-linecap="round"/>')
    S.p('M12 27 L50 57 L88 27', 'none', 3.2)
    S.luz('M18 33 L32 44', .5, 2.8)


def chat(S):
    bal = 'M14 23 Q14 12 26 12 H74 Q86 12 86 23 V57 Q86 68 74 68 H45 L26 86 L30 68 H26 Q14 68 14 57 Z'
    S.sombra(bal)
    S.p(bal, S.grad(BRANCO))
    for x in (34, 50, 66):
        S('<circle cx="%d" cy="40" r="6.2" fill="%s"/>' % (x, S.grad(('#a678ff', '#5b21b6'))))
    S.luz('M22 22 Q24 18 32 18', .55, 3)


def ajustes(S):
    pts = []
    dentes = 8
    for i in range(dentes * 4):
        a = i * math.pi * 2 / (dentes * 4) - math.pi / 2
        r = 44 if (i % 4) in (1, 2) else 34
        pts.append((50 + r * math.cos(a), 50 + r * math.sin(a)))
    eng = poli(pts)
    S.sombra(eng)
    S.p(eng, S.grad(BRANCO))
    S.p(circ(50, 50, 14), S.grad(('#3a3f6a', '#1e2244')), 2.8)
    S('<circle cx="50" cy="50" r="24" fill="none" stroke="#9aa0c6" stroke-width="2" opacity=".6"/>')
    S.luz('M30 28 Q36 22 44 21', .6, 3)


def coroa(S):
    cor = poli([(15, 70), (10, 27), (32, 46), (50, 15), (68, 46), (90, 27), (85, 70)])
    S.sombra(ret(13, 26, 74, 62, 3))
    S.p(cor, S.grad(OURO))
    S.p(ret(13, 67, 74, 17, 4), S.grad(('#ffd75a', '#e8960e', '#b56a00')))
    for x, y in ((10, 27), (50, 15), (90, 27)):
        S.p(circ(x, y, 6), S.grad(('#fff6c0', '#ffc928')), 2.4)
    for x, c in ((31, ('#ff8a9a', '#d61f3c')), (50, ('#8ad8ff', '#1f6fd6')), (69, ('#ff8a9a', '#d61f3c'))):
        S.p(circ(x, 75.5, 5), S.grad(c), 2.2)
    S.luz('M24 60 L21 40', .5, 3)


def bilhete(S):
    S('<g transform="rotate(-9 60 50)">')
    b = 'M15 25 H105 V43 A7 7 0 0 0 105 57 V75 H15 V57 A7 7 0 0 0 15 43 Z'
    S.sombra(b)
    S.p(b, S.grad(OURO, 0, 0, 1, 1))
    S('<path d="M23 32 H97 V68 H23 Z" fill="none" stroke="#b06a00" stroke-width="2.2" stroke-dasharray="5 3.4" opacity=".75"/>')
    S.p(poli([(44, 62), (41, 38), (51, 48), (60, 32), (69, 48), (79, 38), (76, 62)]), S.grad(('#b68aff', '#6d28d9')), 2.6)
    S.p(ret(44, 59, 32, 7, 2), S.grad(('#9a6cf5', '#5b21b6')), 2.2)
    S.luz('M22 30 H50', .55, 3)
    S('</g>')


def missoes(S):
    S.sombra(ret(15, 13, 70, 82, 10))
    S.p(ret(15, 13, 70, 82, 10), S.grad(ROXO))
    S.p(ret(24, 25, 52, 62, 5), S.grad(BRANCO), 2.6)
    S.p(ret(35, 6, 30, 15, 5), S.grad(('#e9ebf8', '#9aa0c4')), 2.8)
    for i, y in enumerate((39, 53, 67)):
        S('<path d="M30 %s l4.5 4.5 l8 -9" fill="none" stroke="%s" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>' % (n(y), '#16a34a' if i < 2 else '#c3c7e2'))
        S('<rect x="47" y="%s" width="22" height="4.6" rx="2.3" fill="%s"/>' % (n(y - 2.4), '#8f95bd' if i < 2 else '#c3c7e2'))
    S.luz('M22 22 Q24 17 30 17', .5, 3)


def campo(S):
    S.sombra(ret(9, 17, 82, 66, 7))
    S.p(ret(9, 17, 82, 66, 7), S.grad(('#6ee88e', '#2fbf5a', '#15803d')))
    for x in (19, 39, 59, 79):
        S('<rect x="%d" y="19" width="10" height="62" fill="#ffffff" opacity=".1"/>' % (x - 5))
    S('<g fill="none" stroke="#ffffff" stroke-width="2.6" opacity=".92"><rect x="16" y="24" width="68" height="52" rx="2"/>'
      '<path d="M50 24 V76"/><circle cx="50" cy="50" r="9"/><rect x="16" y="38" width="11" height="24"/><rect x="73" y="38" width="11" height="24"/></g>')
    S.luz('M17 28 H40', .4, 2.6)


def play(S):
    tri = 'M30 17 Q30 9 37 13 L84 43 Q91 50 84 57 L37 87 Q30 91 30 83 Z'
    S.sombra(tri)
    S.p(tri, S.grad(BRANCO))
    S.luz('M37 24 L37 50', .55, 3.4)


def volta(S):
    s = 'M11 50 L45 18 V35 H87 V65 H45 V82 Z'
    S.sombra(s)
    S.p(s, S.grad(BRANCO))
    S.luz('M23 47 L40 31', .55, 3)


def desce(S):
    s = 'M17 33 H83 L50 73 Z'
    S.sombra(s)
    S.p(s, S.grad(BRANCO))


def oficina(S):
    # a chave de boca (dourada), inclinada para a direita
    S('<g transform="rotate(42 50 50)">')
    chave = 'M44.5 36 H55.5 V88 Q55.5 94 50 94 Q44.5 94 44.5 88 Z'
    cab = 'M41.5 7 A17 17 0 1 0 58.5 7 L58.5 19 L41.5 19 Z'
    S.sombra(chave); S.sombra(cab)
    S.p(chave, S.grad(OURO, 0, 0, 1, 0))
    S.p(cab, S.grad(OURO))
    S.luz('M47 42 V84', .45, 2.6)
    S('</g>')
    # o martelo (o cabo dourado e a cabeça de aço), inclinado para a esquerda
    S('<g transform="rotate(-42 50 50)">')
    cabo = 'M45 30 H55 V89 Q55 95 50 95 Q45 95 45 89 Z'
    S.sombra(cabo)
    S.p(cabo, S.grad(('#ffe07a', '#f2a51a', '#c47400'), 0, 0, 1, 0))
    S.p('M24 12 H70 Q76 12 76 18 V28 Q76 34 70 34 H24 L18 30 V16 Z', S.grad(('#f4f5fb', '#b9bdd6', '#6e7499')))
    S.luz('M28 17 H66', .65, 2.8)
    S('</g>')


def bola(S):
    cl = S.clip('<circle cx="50" cy="50" r="40"/>')
    S.sombra(circ(50, 50, 41))
    S.p(circ(50, 50, 41), S.radial(('#ffffff', '#eef0f8', '#b6bad4'), .38, .32, .8))
    def penta(cx, cy, s, rot=0):
        return poli([(cx + s * math.cos(rot + k * 2 * math.pi / 5 - math.pi / 2), cy + s * math.sin(rot + k * 2 * math.pi / 5 - math.pi / 2)) for k in range(5)])
    S('<g clip-path="%s" fill="#1c1e36">' % cl)
    S('<path d="%s"/>' % penta(50, 50, 13))
    for k in range(5):
        a = k * 2 * math.pi / 5 - math.pi / 2
        S('<path d="%s"/>' % penta(50 + math.cos(a) * 37, 50 + math.sin(a) * 37, 13, math.pi / 5))
        S('<path d="M%s %s L%s %s" stroke="#7a7f9e" stroke-width="2.2" fill="none"/>' % (n(50 + math.cos(a) * 12.4), n(50 + math.sin(a) * 12.4), n(50 + math.cos(a) * 25), n(50 + math.sin(a) * 25)))
    S('</g>')
    S('<circle cx="50" cy="50" r="41" fill="none" stroke="%s" stroke-width="%s"/>' % (OUT, n(K)))
    S('<ellipse cx="35" cy="27" rx="10" ry="5.5" fill="#ffffff" opacity=".85" transform="rotate(-28 35 27)"/>')


def troca(S):
    S.traco('M20 47 A31 31 0 0 1 76 33', '#ffffff', 9)
    S.traco('M80 53 A31 31 0 0 1 24 67', '#ffffff', 9)
    S.p(poli([(66, 31), (87, 22), (85, 46)]), '#ffffff', 3)
    S.p(poli([(34, 69), (13, 78), (15, 54)]), '#ffffff', 3)


def wifi(S):
    verde = S.grad(('#7dffa0', '#2fd35a', '#14a344'))
    for r in (50, 34, 18):
        a0, a1 = math.radians(225), math.radians(315)
        d = 'M%s %s A%s %s 0 0 1 %s %s' % (n(50 + r * math.cos(a0)), n(84 + r * math.sin(a0)), n(r), n(r), n(50 + r * math.cos(a1)), n(84 + r * math.sin(a1)))
        S('<path d="%s" fill="none" stroke="%s" stroke-width="%s" stroke-linecap="round"/>' % (d, OUT, n(9 + 2 * K * .8)))
        S('<path d="%s" fill="none" stroke="%s" stroke-width="9" stroke-linecap="round"/>' % (d, verde))
    S.p(circ(50, 82, 7.5), verde, 3)


def pessoa(S):
    S.sombra('M11 90 Q11 57 40 55 Q69 57 69 90 Z')
    S.p(circ(40, 32, 16), S.grad(BRANCO))
    S.p('M11 90 Q11 57 40 55 Q69 57 69 90 Z', S.grad(BRANCO))
    S.p(circ(75, 70, 16), S.grad(VERDE))
    S('<path d="M75 61.5 V78.5 M66.5 70 H83.5" stroke="#ffffff" stroke-width="5" stroke-linecap="round"/>')
    S.luz('M31 25 Q34 20 40 20', .55, 3)


DESENHOS = {'loja': loja, 'cofre': cofre, 'clube': clube, 'treino': treino, 'salas': salas, 'amigos': amigos, 'ranking': ranking, 'eventos': eventos,
            'moeda': moeda, 'gema': gema, 'mais': mais, 'carta': carta, 'chat': chat, 'galera': galera, 'ajustes': ajustes, 'coroa': coroa,
            'bilhete': bilhete, 'missoes': missoes, 'campo': campo, 'play': play, 'volta': volta, 'desce': desce, 'oficina': oficina, 'bola': bola,
            'troca': troca, 'wifi': wifi, 'pessoa': pessoa}


def simbolo(nome):
    S = Sim(nome)
    DESENHOS[nome](S)
    return S.svg()


def svg_sprite():
    return ('<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="0" height="0" '
            'style="position:absolute;width:0;height:0;overflow:hidden" aria-hidden="true" focusable="false">'
            '<defs></defs>' + ''.join(simbolo(nm) for nm in NOMES) + '</svg>')   # (o <defs> vazio primeiro: o jogo monta a moeda e a gema soltas com ele)
