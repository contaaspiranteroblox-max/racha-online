"""RACHA v101 · a ilustração do cartão da OFICINA (o lado direito do cartão, como na tela inicial enviada): a planta azul do campo
com a ponta enrolada, a folha de papel pardo atrás, o lápis e a trena amarela. Desenhada em código, fundo transparente, sem
texto e sem moldura (o nome OFICINA, as ferramentas e a moldura dourada são do jogo). 420 × 140 (o arte.py desenha em 2×).
O desenho fica na parte da direita (x de ~150 a 415): a esquerda fica livre para o nome."""
import math

W, H = 420, 140


def n(v):
    return ('%.2f' % v).rstrip('0').rstrip('.')


def svg_oficina():
    d = []
    defs = []

    def g(i, cores, x1=0, y1=0, x2=0, y2=1):
        st = ''.join('<stop offset="%s" stop-color="%s"/>' % (n(j / (len(cores) - 1)), c) for j, c in enumerate(cores))
        defs.append('<linearGradient id="%s" x1="%s" y1="%s" x2="%s" y2="%s">%s</linearGradient>' % (i, n(x1), n(y1), n(x2), n(y2), st))
        return 'url(#%s)' % i

    OUT = '#0b0d26'
    # a sombra no chão do cartão
    defs.append('<filter id="of-s" x="-20%" y="-40%" width="140%" height="180%"><feGaussianBlur stdDeviation="5"/></filter>')
    d.append('<ellipse cx="290" cy="122" rx="128" ry="11" fill="#000" opacity=".45" filter="url(#of-s)"/>')
    # a folha de papel pardo (atrás, inclinada)
    d.append('<g transform="rotate(7 300 70)"><path d="M210 22 H372 V118 H210 Z" fill="%s" stroke="%s" stroke-width="3" stroke-linejoin="round"/>'
             '<path d="M222 40 H360 M222 56 H350 M222 72 H356 M222 88 H340" stroke="#a87a48" stroke-width="2.4" opacity=".55"/></g>' % (g('of-p', ('#e8c89a', '#c99a62')), OUT))
    # a planta azul do campo (a ponta da esquerda enrolada)
    d.append('<g transform="rotate(-8 270 70)">')
    d.append('<path d="M176 20 H352 V114 H176 Z" fill="%s" stroke="%s" stroke-width="3" stroke-linejoin="round"/>' % (g('of-a', ('#3f8cf0', '#2563c9', '#1b4a9e')), OUT))
    grade = ''.join('<path d="M%s 22 V112" />' % n(180 + i * 12) for i in range(15)) + ''.join('<path d="M178 %s H350" />' % n(26 + i * 12) for i in range(8))
    d.append('<g stroke="#8ec0ff" stroke-width="1" opacity=".35">%s</g>' % grade)
    d.append('<g fill="none" stroke="#ffffff" stroke-width="2.6" opacity=".95"><rect x="196" y="32" width="142" height="70" rx="2"/>'
             '<path d="M267 32 V102"/><circle cx="267" cy="67" r="13"/><rect x="196" y="50" width="20" height="34"/><rect x="318" y="50" width="20" height="34"/>'
             '<path d="M196 59 H205 V75 H196 M338 59 H329 V75 H338"/></g>')
    d.append('<g fill="#ffd23a" stroke="%s" stroke-width="1.6"><circle cx="232" cy="58" r="4"/><circle cx="246" cy="80" r="4"/><circle cx="300" cy="62" r="4"/></g>' % OUT)
    d.append('<path d="M234 60 Q252 72 246 78 M248 80 Q280 84 298 64" fill="none" stroke="#ffd23a" stroke-width="2" stroke-dasharray="4 3"/>')
    # o rolo da ponta
    d.append('<path d="M164 18 Q154 18 154 30 V104 Q154 116 164 116 H180 V18 Z" fill="%s" stroke="%s" stroke-width="3" stroke-linejoin="round"/>' % (g('of-r', ('#1b4a9e', '#4f9cff', '#1b4a9e'), 0, 0, 1, 0), OUT))
    d.append('<ellipse cx="170" cy="18" rx="10" ry="5" fill="#9cc8ff" stroke="%s" stroke-width="2.4"/>' % OUT)
    d.append('<path d="M188 26 H344" stroke="#ffffff" stroke-width="2.6" opacity=".45" stroke-linecap="round"/>')
    d.append('</g>')
    # o lápis (atravessado por cima da planta)
    d.append('<g transform="rotate(-28 248 104)"><path d="M190 98 H292 V110 H190 Z" fill="%s" stroke="%s" stroke-width="2.6"/>'
             '<path d="M292 98 L310 104 L292 110 Z" fill="#f2d2a8" stroke="%s" stroke-width="2.4" stroke-linejoin="round"/>'
             '<path d="M304 102 L310 104 L304 106 Z" fill="%s"/><path d="M182 98 H192 V110 H182 Q178 104 182 98 Z" fill="#ff8aa0" stroke="%s" stroke-width="2.4"/>'
             '<path d="M196 101 H288" stroke="#ffffff" stroke-width="2" opacity=".55"/></g>' % (g('of-l', ('#ffd84a', '#f0a512')), OUT, OUT, OUT, OUT))
    # a trena amarela (a caixa redonda e a fita saindo)
    d.append('<path d="M358 104 H404 V112 H358 Z" fill="%s" stroke="%s" stroke-width="2.4"/>' % (g('of-f', ('#fff1a0', '#e8c22a')), OUT))
    d.append(''.join('<path d="M%s 104 V%s" stroke="%s" stroke-width="1.4"/>' % (n(362 + i * 5), n(108 if i % 2 else 110), OUT) for i in range(8)))
    d.append('<circle cx="356" cy="84" r="34" fill="%s" stroke="%s" stroke-width="3.4"/>' % (g('of-t', ('#ffe36a', '#f5b20f', '#c98400')), OUT))
    d.append('<circle cx="356" cy="84" r="22" fill="%s" stroke="%s" stroke-width="2.8"/>' % (g('of-t2', ('#3a3f6a', '#1a1d3a')), OUT))
    d.append('<circle cx="356" cy="84" r="9" fill="%s" stroke="%s" stroke-width="2.4"/>' % (g('of-t3', ('#e8eaf6', '#9aa0c4')), OUT))
    d.append('<path d="M330 66 A32 32 0 0 1 352 52" fill="none" stroke="#ffffff" stroke-width="4" stroke-linecap="round" opacity=".6"/>')
    return ('<svg xmlns="http://www.w3.org/2000/svg" width="%d" height="%d" viewBox="0 0 %d %d"><defs>%s</defs>%s</svg>'
            % (W, H, W, H, ''.join(defs), ''.join(d)))
