#!/usr/bin/env python3
"""RACHA rua v74 · o kit do campo de grama novo (o ESTÁDIO), tirado da imagem enviada (tools/v74/campo_noite_original.png).

O campo do jogo (as linhas, os gols, a grama listrada, a luz dos refletores, o alambrado, o calçamento, o meio-fio, os
bancos e os postes) é desenhado no jogo, na medida de cada tamanho (1v1 a 4v4): assim as linhas e os gols batem com a
física e nada estica. Da imagem saem só as peças que não dá para desenhar bem: os carros, as árvores dos cantos e as
casas da beira (o morro). Este script recorta essas peças, tira o fundo de cada uma e junta tudo numa imagem só
(tools/v74/campo_noite_kit.png, e a mesma em .webp, que é a que o build embute no jogo) com o mapa das peças
(tools/v74/campo_noite_kit.json).
Rodar: python3 tools/v74/campo_kit.py
"""
import json, pathlib
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

AQUI = pathlib.Path(__file__).resolve().parent
ORIG = AQUI / 'campo_noite_original.png'
im = Image.open(ORIG).convert('RGB')
A = np.asarray(im).astype(np.int32)

def caixa_carro(x0, y0, x1, y1, raio=9):
    """o carro visto de cima: a máscara é um retângulo de cantos redondos (sem o asfalto em volta), com a borda suave"""
    c = im.crop((x0, y0, x1, y1)).convert('RGBA')
    m = Image.new('L', c.size, 0); ImageDraw.Draw(m).rounded_rectangle([1, 1, c.width - 2, c.height - 2], radius=raio, fill=255)
    c.putalpha(m.filter(ImageFilter.GaussianBlur(0.8)))
    return c

def maior_pedaco(m):
    """fica só o maior pedaço ligado da máscara (os fiapos de linha e de alambrado que encostam na copa saem)"""
    h, w = m.shape; rot = np.zeros((h, w), np.int32); n = 0; tam = [0]
    for y0 in range(h):
        for x0 in range(w):
            if not m[y0, x0] or rot[y0, x0]: continue
            n += 1; pilha = [(y0, x0)]; rot[y0, x0] = n; t = 0
            while pilha:
                y, x = pilha.pop(); t += 1
                for yy, xx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
                    if 0 <= yy < h and 0 <= xx < w and m[yy, xx] and not rot[yy, xx]: rot[yy, xx] = n; pilha.append((yy, xx))
            tam.append(t)
    return rot == (int(np.argmax(tam)) if n else -1)

def caixa_verde(x0, y0, x1, y1, cx, cy, raio):
    """as árvores: fica o que é verde (a folha) dentro do círculo da copa (a grama do campo, que também é verde, fica de fora)"""
    c = np.asarray(im.crop((x0, y0, x1, y1))).astype(np.int32)
    r, g, b = c[..., 0], c[..., 1], c[..., 2]
    yy, xx = np.mgrid[y0:y1, x0:x1]
    copa = (xx - cx) ** 2 + (yy - cy) ** 2 <= raio ** 2
    folha = (g > r + 8) & (g > b + 4) & (g > 45) & copa
    m = Image.fromarray((folha * 255).astype('uint8')).filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.MinFilter(3))
    m = Image.fromarray((maior_pedaco(np.asarray(m) > 127) * 255).astype('uint8')).filter(ImageFilter.GaussianBlur(1.2))
    out = Image.fromarray(c.astype('uint8')).convert('RGBA'); out.putalpha(m)
    return out

PECAS = {
    # carros (x0, y0, x1, y1 na imagem original) · todos de pé (a frente para cima ou para baixo)
    'carro_vermelho': caixa_carro(108, 152, 139, 217),
    'carro_branco':   caixa_carro(93, 408, 123, 471),
    'carro_preto':    caixa_carro(91, 575, 123, 643),
    'carro_preto2':   caixa_carro(667, 883, 701, 953),
    'carro_amarelo':  caixa_carro(1363, 387, 1394, 451),
    'carro_branco2':  caixa_carro(1363, 740, 1395, 807),
    # as árvores dos cantos (a de cima à direita e a de baixo à esquerda)
    'arvore1': caixa_verde(1200, 150, 1300, 250, 1252, 197, 47),
    'arvore2': caixa_verde(180, 757, 280, 857, 228, 806, 47),
    # as casas da beira (com a calçada): a coluna da esquerda e a da direita, do meio-fio de cima ao de baixo
    'casas_esq': im.crop((0, 230, 89, 860)).convert('RGBA'),      # (até a beira da calçada: o asfalto e os carros ficam de fora)
    'casas_dir': im.crop((1402, 230, 1490, 860)).convert('RGBA'),
}

# o kit: as peças lado a lado (com 2 px de folga), numa imagem só
x, y, alt, larg_max = 0, 0, 0, 640
rects, colocar = {}, []
for nome, p in PECAS.items():
    if x + p.width > larg_max: x, y, alt = 0, y + alt + 2, 0
    rects[nome] = [x, y, p.width, p.height]; colocar.append((p, x, y))
    x += p.width + 2; alt = max(alt, p.height)
kit = Image.new('RGBA', (larg_max, y + alt), (0, 0, 0, 0))
for p, px, py in colocar: kit.alpha_composite(p, (px, py))
kit.save(AQUI / 'campo_noite_kit.png', optimize=True)
kit.save(AQUI / 'campo_noite_kit.webp', 'WEBP', quality=90, alpha_quality=90, method=6)   # (é este que o build embute no jogo)
json.dump(rects, open(AQUI / 'campo_noite_kit.json', 'w'), indent=1)
print('kit', kit.size, (AQUI / 'campo_noite_kit.png').stat().st_size, 'bytes (png) ·', (AQUI / 'campo_noite_kit.webp').stat().st_size, 'bytes (webp) ·', len(rects), 'peças')
