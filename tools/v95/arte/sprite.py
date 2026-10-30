"""RACHA v95 · os ÍCONES DA TELA INICIAL E DAS TELAS (o sprite da v91: os mesmos 22 nomes, v91i-*) no desenho chapado da v95:
o contorno de tinta grosso, a cor chapada e um brilho só — a mesma família da folha de ícones (icones.py). Sem degradê de
"render": o volume é a beirada escura embaixo."""
import json, math, re
import icones as I

TINTA = I.TINTA


def bau(w, h):                                         # o COFRE: o baú roxo com o cadeado
    k = I.K
    return (I.ret(10, h * .42, w - 20, h * .46, '#7a3fc4', 8) + I.cam('M10 %.1f V%.1f C10 %.1f 22 %.1f %.1f %.1f H%.1f C%.1f %.1f %.1f %.1f %.1f %.1f V%.1fZ'
            % (h * .44, h * .32, h * .18, h * .14, w * .3, h * .14, w * .7, w - 22, h * .14, w - 10, h * .18, w - 10, h * .32, h * .44), '#8f55dc')
            + I.ret(10, h * .4, w - 20, h * .1, '#ffcf2e', 2) + I.ret(w * .2, h * .14, w * .08, h * .74, '#ffcf2e', 2, k * .8) + I.ret(w * .72, h * .14, w * .08, h * .74, '#ffcf2e', 2, k * .8)
            + I.ret(w / 2 - 12, h * .42, 24, 26, '#f3efe6', 6) + I.cir(w / 2, h * .42 + 11, 4.5, TINTA, 0) + I.ret(w / 2 - 2, h * .42 + 13, 4, 8, TINTA, 1, 0)
            + I.luz('M18 %.1f C22 %.1f 30 %.1f 40 %.1f' % (h * .3, h * .22, h * .2, h * .2), .5))


def mais(w, h):
    a, b = 7.5, 22                                    # (meia grossura e meio comprimento da cruz)
    cx, cy = w / 2, h / 2
    cruz = [(cx - a, cy - b), (cx + a, cy - b), (cx + a, cy - a), (cx + b, cy - a), (cx + b, cy + a), (cx + a, cy + a), (cx + a, cy + b), (cx - a, cy + b), (cx - a, cy + a), (cx - b, cy + a), (cx - b, cy - a), (cx - a, cy - a)]
    return (I.ret(8, 8, w - 16, h - 16, '#26a957', 16) + '<rect x="11" y="%.1f" width="%.1f" height="9" fill="#178a42"/>' % (h - 22, w - 22)
            + I.ret(8, 8, w - 16, h - 16, 'none', 16) + I.pol(cruz, '#f3efe6', 4.2) + I.luz('M18 20 H40', .6))


def carta(w, h):
    return I.ret(8, 20, w - 16, h - 40, '#f3efe6', 8) + I.cam('M12 26 L%.1f %.1f L%.1f 26' % (w / 2, h * .56, w - 12), 'none') + I.cam('M12 %.1f L%.1f %.1f M%.1f %.1f L%.1f %.1f' % (h - 24, w * .38, h * .5, w - 12, h - 24, w * .62, h * .5), 'none', 2.4)


def chat(w, h):
    return (I.cam('M14 18 H%.1f Q%.1f 18 %.1f 30 V%.1f Q%.1f %.1f %.1f %.1f H40 L22 %.1f L26 %.1f H26 Q14 %.1f 14 %.1f V30 Q14 18 26 18Z'
                  % (w - 26, w - 14, w - 14, h - 40, w - 14, h - 28, w - 26, h - 28, h - 12, h - 28, h - 28, h - 40), '#f3efe6')
            + ''.join(I.cir(w / 2 + (i - 1) * 18, h / 2 - 4, 6, TINTA, 0) for i in range(3)))


def bilhete(w, h):                                     # o bilhete do PASSE (dourado, com a coroa roxa)
    d = 'M8 30 L%.1f 14 L%.1f %.1f L14 %.1fZ' % (w - 14, w - 6, h - 32, h - 16)
    return (I.cam(d, '#b37400', I.K, ' transform="translate(3 4)"') + I.cam(d, '#ffcf2e') + I.cam('M22 36 L%.1f 24 L%.1f %.1f L26 %.1fZ' % (w - 26, w - 20, h - 40, h - 28), '#7a3fc4', 2.6)
            + I.pol([(w * .36, h * .62), (w * .35, h * .44), (w * .44, h * .52), (w * .5, h * .38), (w * .57, h * .5), (w * .65, h * .42), (w * .66, h * .6)], '#ffcf2e', 2.4))


def play(w, h):
    return I.cam('M%.1f %.1f L%.1f %.1f L%.1f %.1fZ' % (w * .28, h * .16, w * .86, h / 2, w * .28, h * .84), '#f3efe6', 7)


def volta(w, h):
    return I.cam('M10 %.1f L%.1f 16 V%.1f H%.1f V%.1f H%.1f V%.1fZ' % (h / 2, w * .46, h * .34, w - 10, h * .66, w * .46, h - 16), '#f3efe6', 7)


def desce(w, h):
    return I.cam('M18 %.1f H%.1f L%.1f %.1fZ' % (h * .3, w - 18, w / 2, h * .74), '#f3efe6', 6)


MAPA = {'loja': 'loja', 'clube': 'clube', 'treino': 'treino', 'salas': 'salas', 'amigos': 'amigos', 'ranking': 'ranking', 'eventos': 'eventos',
        'moeda': 'moeda', 'gema': 'gema', 'galera': 'amigos_topo', 'ajustes': 'ajustes_topo', 'coroa': 'coroa', 'missoes': 'desafios', 'campo': 'campo'}
PROPRIOS = {'cofre': bau, 'mais': mais, 'carta': carta, 'chat': chat, 'bilhete': bilhete, 'play': play, 'volta': volta, 'desce': desce}
NOMES = ['loja', 'cofre', 'clube', 'treino', 'salas', 'amigos', 'ranking', 'eventos', 'moeda', 'gema', 'mais', 'carta', 'chat', 'galera', 'ajustes',
         'coroa', 'bilhete', 'missoes', 'campo', 'play', 'volta', 'desce']


def simbolo(nome):
    w = 120 if nome == 'bilhete' else 100
    k0 = I.K
    I.K = 5.4
    try:
        if nome in PROPRIOS:
            corpo = PROPRIOS[nome](w, 100)
        else:
            # (os da folha foram feitos no tamanho da folha: aqui, o mesmo desenho ampliado para a caixa de 100, com a margem)
            w0, h0 = I.P[MAPA[nome]][2:4]
            s = min(88 / w0, 88 / h0)
            I.K = 5.0 / s
            corpo = '<g transform="translate(%.2f %.2f) scale(%.4f)">%s</g>' % ((w - w0 * s) / 2, (100 - h0 * s) / 2, s, I.desenha(MAPA[nome], w0, h0))
    finally:
        I.K = k0
    corpo = corpo.replace('id="tpc"', 'id="v95tpc-%s"' % nome).replace('url(#tpc)', 'url(#v95tpc-%s)' % nome)
    return '<symbol id="v91i-%s" viewBox="0 0 %d 100">%s</symbol>' % (nome, w, corpo)


def svg_sprite():
    return _svg().replace('font-family="LilitaOne"', 'font-family="\'Lilita One\',LilitaOne,sans-serif"')


def _svg():
    return ('<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="0" height="0" style="position:absolute;width:0;height:0;overflow:hidden" aria-hidden="true" focusable="false">'
            + '<defs></defs>' + ''.join(simbolo(n) for n in NOMES) + '</svg>')   # (o <defs> vazio: o v91 monta as moedas e as gemas soltas com ele)
