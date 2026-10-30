"""RACHA v95 · o LETREIRO desenhado em código (no lugar do da v77, que vinha de uma imagem gerada por IA): RACHA em letra
grossa de placa pintada (o branco-giz com o contorno de tinta e o volume laranja por baixo), a coroa dourada em cima do A e
a faixa amarela FUTEBOL DE RUA. Fundo transparente, 447 × 221 (as medidas do letreiro antigo; desenhado em 2×)."""
import math

TINTA = '#0f1222'


def coroa(cx, cy, w, ang):
    h = w * .62
    pts = [(-w / 2, h / 2), (-w / 2, -h * .18), (-w * .27, h * .08), (0, -h / 2), (w * .27, h * .08), (w / 2, -h * .18), (w / 2, h / 2)]
    p = ' '.join('%.1f,%.1f' % xy for xy in pts)
    joias = ''.join('<circle cx="%.1f" cy="%.1f" r="%.1f" fill="%s" stroke="%s" stroke-width="3"/>' % (x, y - 2, w * .07, c, TINTA)
                    for (x, y), c in (((-w / 2, -h * .18), '#ff6a00'), ((0, -h / 2), '#7a3fc4'), ((w / 2, -h * .18), '#ff6a00')))
    return ('<g transform="translate(%.1f %.1f) rotate(%.1f)">'
            '<polygon points="%s" fill="#b37400" stroke="%s" stroke-width="7" stroke-linejoin="round" transform="translate(4 6)"/>'
            '<polygon points="%s" fill="#ffcf2e" stroke="%s" stroke-width="7" stroke-linejoin="round"/>'
            '<rect x="%.1f" y="%.1f" width="%.1f" height="%.1f" rx="3" fill="#ffe27a" stroke="%s" stroke-width="5"/>'
            '%s</g>' % (cx, cy, ang, p, TINTA, p, TINTA, -w / 2 - 3, h * .3, w + 6, h * .28, TINTA, joias))


def svg_logo(px_w=447, px_h=221):
    W, H = 447, 221
    letras = 'RACHA'
    # o volume (laranja e o escuro dele) em camadas por baixo, depois a face branca-giz com o contorno de tinta
    camadas = ''
    N = 12
    for k in range(N, 0, -1):                         # (a camada do fundo leva o contorno de tinta; as outras são o volume laranja)
        dx, dy = k * .55, k * 1.05
        if k == N:
            camadas += '<text x="%.2f" y="%.2f" fill="#a83c00" stroke="%s" stroke-width="14" stroke-linejoin="round" paint-order="stroke">%s</text>' % (30 + dx, 150 + dy, TINTA, letras)
        else:
            camadas += '<text x="%.2f" y="%.2f" fill="%s" stroke="%s" stroke-width="14" stroke-linejoin="round" paint-order="stroke">%s</text>' % (
                30 + dx, 150 + dy, '#ff6a00' if k < 7 else '#e55800', '#ff6a00' if k < 7 else '#e55800', letras)
    face = ('<text x="30" y="150" fill="#f3efe6" stroke="%s" stroke-width="14" stroke-linejoin="round" paint-order="stroke">%s</text>'
            '<text x="30" y="150" fill="#f3efe6">%s</text>' % (TINTA, letras, letras))
    # o brilho de tinta fresca (uma faixa clara em cima das letras, recortada pelas próprias letras)
    brilho = ('<clipPath id="lt"><text x="30" y="150">%s</text></clipPath>'
              '<rect x="20" y="62" width="400" height="20" fill="#ffffff" opacity=".55" clip-path="url(#lt)"/>' % letras)
    faixa = ('<g transform="rotate(-3 230 186)">'
             '<path d="M64 168 L396 168 L382 186 L396 204 L64 204 L78 186 Z" fill="#b37400" stroke="%s" stroke-width="6" stroke-linejoin="round" transform="translate(4 5)"/>'
             '<path d="M64 168 L396 168 L382 186 L396 204 L64 204 L78 186 Z" fill="#ffcf2e" stroke="%s" stroke-width="6" stroke-linejoin="round"/>'
             '<text x="230" y="196" text-anchor="middle" font-family="BarlowCondensed" font-size="29" letter-spacing="4" fill="%s">FUTEBOL DE RUA</text></g>' % (TINTA, TINTA, TINTA))
    return ('<svg xmlns="http://www.w3.org/2000/svg" width="%d" height="%d" viewBox="0 0 %d %d">'
            '<g transform="rotate(-4 223 110)"><g font-family="LilitaOne" font-size="112" letter-spacing="2">%s%s%s</g>%s</g>%s</svg>'
            % (px_w, px_h, W, H, camadas, face, brilho, coroa(352, 40, 84, 14), faixa))
