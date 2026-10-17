#!/usr/bin/env python3
"""RACHA rua v76 · o kit das tampinhas animadas, tirado da folha enviada (tools/v76/skins_original.png, a COLEÇÃO MISTURA DE
TODAS: CRIA, CRISTO, BRASIL, PITBULL, DEBOCHE, FÉ, DRAGÃO e GALÁXIA).

Da folha saem as caras que são ilustração (CRIA, CRISTO, PITBULL, FÉ e DRAGÃO): o miolo de cada tampinha, recortado em
círculo. O aro (os dentes), o brilho do aro e as animações são desenhados no jogo (tools/v76/skins.js), assim a tampinha
fica nítida em qualquer tamanho e mexe. BRASIL, DEBOCHE e GALÁXIA são desenhadas inteiras no jogo (a bandeira com o lema
certo, a carinha que muda de cara e a galáxia que gira), sem imagem.
Para as animações que passam por trás do personagem, saem também as camadas da frente (o menino e a bola da CRIA, a
estátua do CRISTO e a cruz da FÉ), com o fundo transparente.
Junta tudo numa imagem só (tools/v76/skins_kit.webp, a que o build embute; .png para conferir) com o mapa das peças
(tools/v76/skins_kit.json: [x, y, w, h] na imagem do kit; as caras são quadradas, do tamanho do círculo).
Rodar: python3 tools/v76/skins_kit.py
"""
import json, pathlib
from collections import deque
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

AQUI = pathlib.Path(__file__).resolve().parent
im = Image.open(AQUI / 'skins_original.png').convert('RGB')
A = np.asarray(im).astype(np.int32)

# o centro de cada tampinha na folha (achado pelo aro: o círculo em que os dentes coloridos ficam mais nítidos) e o raio
# do miolo que entra (um pouco para dentro da borda do desenho, para o aro da folha não aparecer)
CARAS = {'cria': (220, 254, 106), 'cristo': (588, 259, 104), 'pitbull': (1317, 256, 103), 'fe': (581, 685, 99), 'dragao': (954, 688, 103)}
LADO = 208                                                  # px de cada cara no kit (o círculo inteiro)


def cara(cx, cy, R):
    """o miolo: o quadrado em volta do círculo, reamostrado para LADO × LADO, com o fora do círculo transparente"""
    c = im.crop((cx - R, cy - R, cx + R, cy + R)).resize((LADO, LADO), Image.LANCZOS).convert('RGBA')
    m = Image.new('L', (LADO * 4, LADO * 4), 0); ImageDraw.Draw(m).ellipse((0, 0, LADO * 4 - 1, LADO * 4 - 1), fill=255)
    c.putalpha(m.resize((LADO, LADO), Image.LANCZOS))
    return c


def camada(nome, cx, cy, R, dentro, seeds, regiao):
    """a camada da frente: os pixels que passam no teste `dentro`, ligados a uma das sementes e dentro da `regiao`
    (u, v em -1..1 no círculo da cara), com a borda suave"""
    c = np.asarray(im.crop((cx - R, cy - R, cx + R, cy + R)).resize((LADO, LADO), Image.LANCZOS)).astype(np.int32)
    ok = dentro(c)
    vv, uu = np.mgrid[0:LADO, 0:LADO]; u = (uu + .5) / LADO * 2 - 1; v = (vv + .5) / LADO * 2 - 1
    ok &= regiao(u, v) & (u * u + v * v < 1)
    m = np.zeros(ok.shape, bool); q = deque()
    for su, sv in seeds:
        x, y = int((su + 1) / 2 * LADO), int((sv + 1) / 2 * LADO)
        if ok[y, x] and not m[y, x]: m[y, x] = True; q.append((y, x))
    while q:
        y, x = q.popleft()
        for yy, xx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
            if 0 <= yy < LADO and 0 <= xx < LADO and ok[yy, xx] and not m[yy, xx]: m[yy, xx] = True; q.append((yy, xx))
    mi = Image.fromarray((m * 255).astype('uint8')).filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.GaussianBlur(.7))
    out = Image.fromarray(c.astype('uint8')).convert('RGBA'); out.putalpha(mi)
    print('  camada', nome, int(m.sum()), 'px')
    return out


lum = lambda c: (c[..., 0] * 299 + c[..., 1] * 587 + c[..., 2] * 114) // 1000
sat = lambda c: c.max(axis=2) - c.min(axis=2)

PECAS = {n: cara(*v) for n, v in CARAS.items()}
# CRIA: o menino (a silhueta preta) e a bola, na frente do sol
PECAS['cria_menino'] = camada('cria_menino', *CARAS['cria'], dentro=lambda c: lum(c) < 70, seeds=[(0, -.1), (0, .25), (-.05, -.45), (.38, .58)],
                              regiao=lambda u, v: (u > -.55) & (u < .62) & (v > -.72))
# CRISTO: a estátua (o cinza claro, sem cor), na frente do céu
PECAS['cristo_estatua'] = camada('cristo_estatua', *CARAS['cristo'], dentro=lambda c: (lum(c) > 92) & (sat(c) < 40),
                                 seeds=[(0, 0), (0, .4), (0, -.62), (-.5, -.32), (.5, -.32), (0, .62), (-.12, .62), (.12, .62), (0, .85), (-.2, .9), (.2, .9)],
                                 regiao=lambda u, v: ((np.abs(u + .02) < .36) & (v > -.8)) | ((v > -.46) & (v < -.18) & (np.abs(u) < .92)))
# FÉ: a cruz de pedra, na frente dos raios
PECAS['fe_cruz'] = camada('fe_cruz', *CARAS['fe'], dentro=lambda c: (lum(c) > 105) & (sat(c) < 50), seeds=[(.02, .1), (.02, -.37), (-.4, -.37), (.42, -.37), (.02, .7)],
                          regiao=lambda u, v: ((np.abs(u - .02) < .19) & (v > -1)) | ((v > -.56) & (v < -.2) & (np.abs(u - .01) < .58)))

# o kit: as peças lado a lado (2 px de folga)
x, y, alt, larg_max = 0, 0, 0, 3 * LADO + 4
rects, colocar = {}, []
for nome, p in PECAS.items():
    if x + p.width > larg_max: x, y, alt = 0, y + alt + 2, 0
    rects[nome] = [x, y, p.width, p.height]; colocar.append((p, x, y))
    x += p.width + 2; alt = max(alt, p.height)
kit = Image.new('RGBA', (larg_max, y + alt), (0, 0, 0, 0))
for p, px, py in colocar: kit.alpha_composite(p, (px, py))
kit.save(AQUI / 'skins_kit.png', optimize=True)
kit.save(AQUI / 'skins_kit.webp', 'WEBP', quality=90, alpha_quality=92, method=6)
json.dump(rects, open(AQUI / 'skins_kit.json', 'w'), indent=1)
print('kit', kit.size, (AQUI / 'skins_kit.webp').stat().st_size, 'bytes (webp) ·', len(rects), 'peças')
