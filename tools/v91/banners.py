#!/usr/bin/env python3
"""RACHA v91 · os BANNERS DE PERFIL no estilo da imagem de referência: cada cena é um recorte da própria quadra da tela
inicial (tools/v91/fundo_limpo.png, a imagem enviada sem os botões), com a luz e a cor de cada banner e o que falta
desenhado por cima (as janelas acesas, o sol, os refletores, a galera, as bandeirinhas e o confete). Sai um atlas só: banners.webp (720 × 200 cada,
um embaixo do outro) + banners.json (a ordem). O jogo desenha o banner pelo nome da cena (o mesmo do catálogo v88).

Rodar: python3 tools/v91/banners.py      (depois do fundo.py)
"""
import json, math, pathlib
import numpy as np
import cv2
from PIL import Image, ImageDraw, ImageFilter

AQUI = pathlib.Path(__file__).resolve().parent
A = np.asarray(Image.open(AQUI / 'fundo_limpo.png').convert('RGB')).astype(np.float32) / 255.0   # 1672 × 837
W, H = 720, 200


def recorte(x0, y0, x1, y1):
    im = Image.fromarray((A[y0:y1, x0:x1] * 255).astype(np.uint8)).resize((W, H), Image.LANCZOS)
    return np.asarray(im).astype(np.float32) / 255.0


def mistura(a, b, t):
    return a * (1 - t) + b * t


def lum(a):
    return a[..., 0] * .299 + a[..., 1] * .587 + a[..., 2] * .114


def contraste(a, c=1.15, meio=.45):
    return np.clip((a - meio) * c + meio, 0, 1)


def vinheta(a, forca=.45):
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    d = ((xx - W / 2) / (W * .62)) ** 2 + ((yy - H / 2) / (H * .9)) ** 2
    return a * (1 - forca * np.clip(d, 0, 1))[..., None]


def brilho(a, mask, cor, raio=6, forca=1.0):
    """luz que vaza (bloom) de onde a máscara acende"""
    m = cv2.GaussianBlur(mask.astype(np.float32), (0, 0), raio)
    return np.clip(a + m[..., None] * np.array(cor, np.float32) * forca, 0, 1)


def noite():  # Laje Noturna: as casas do morro à noite, as janelas acesas e o céu com estrelas
    a = recorte(300, 0, 1020, 200)
    L = lum(a)
    sat = a.max(2) - a.min(2)
    yy0 = np.linspace(0, 1, H, dtype=np.float32)[:, None] * np.ones((1, W), np.float32)
    nuvem = (L > .72) & (sat < .2) & (yy0 < .6)
    ceu = ((a[..., 2] > a[..., 0] + .08) & (L > .45)) | nuvem
    n = a * np.array([.28, .34, .62], np.float32) + np.array([.01, .02, .06], np.float32)
    n = contraste(n, 1.25, .2)
    yy = np.linspace(0, 1, H, dtype=np.float32)[:, None]
    ceu_cor = mistura(np.array([.02, .03, .10], np.float32), np.array([.10, .10, .30], np.float32), yy[..., None] * np.ones((1, W, 1), np.float32))
    cm = cv2.GaussianBlur(ceu.astype(np.float32), (0, 0), 2)[..., None]
    n = mistura(n, ceu_cor, cm * .92)
    nm = cv2.GaussianBlur(nuvem.astype(np.float32), (0, 0), 3)[..., None]
    n = mistura(n, np.array([.16, .18, .34], np.float32) * np.ones_like(n), nm * .55)
    rng = np.random.default_rng(91)
    est = np.zeros((H, W), np.float32)
    for _ in range(90):
        x, y = rng.integers(0, W), rng.integers(0, H)
        if ceu[y, x]: est[y, x] = rng.uniform(.5, 1)
    n = brilho(n, est, (.9, .9, 1.0), 1.0, 1.2)
    # as janelas: as paredes claras e quentes da imagem viram luz amarela
    quente = (a[..., 0] > .62) & (a[..., 0] > a[..., 2] + .18) & ~ceu
    jan = np.zeros((H, W), np.float32)
    ys, xs = np.nonzero(quente)
    sel = rng.choice(len(ys), size=min(150, len(ys)), replace=False) if len(ys) else []
    for i in sel:
        y, x = ys[i], xs[i]
        cv2.rectangle(jan, (int(x), int(y)), (int(x) + 3, int(y) + 4), 1.0, -1)
    n = np.clip(n + jan[..., None] * np.array([1.0, .78, .35], np.float32) * .85, 0, 1)
    n = brilho(n, jan, (1.0, .7, .3), 5, .55)
    return vinheta(n, .35)


def por_do_sol():  # Pôr do Sol: o céu laranja e rosa atrás dos telhados, o sol baixo
    a = recorte(300, 0, 1020, 200)
    L = lum(a)
    ceu = (a[..., 2] > a[..., 0] + .08) & (L > .45)
    cm = cv2.GaussianBlur(ceu.astype(np.float32), (0, 0), 2)[..., None]
    yy = np.linspace(0, 1, H, dtype=np.float32)[:, None, None] * np.ones((1, W, 1), np.float32)
    ceu_cor = mistura(np.array([.42, .16, .45], np.float32), np.array([1.0, .55, .22], np.float32), np.clip(yy * 1.3, 0, 1))
    xx = np.linspace(0, 1, W, dtype=np.float32)[None, :]
    sol = np.exp(-(((xx - .78) / .09) ** 2 + ((np.linspace(0, 1, H)[:, None] - .62) / .3) ** 2))
    ceu_cor = np.clip(ceu_cor + sol[..., None] * np.array([1.0, .85, .5], np.float32) * .9, 0, 1)
    casas = a * np.array([.62, .38, .46], np.float32)
    casas = np.clip(casas + np.array([.12, .03, .05], np.float32), 0, 1)
    n = mistura(casas, ceu_cor, cm)
    n = brilho(n, sol > .5, (1.0, .7, .35), 14, .6)
    return vinheta(contraste(n, 1.1, .4), .3)


def grafite():  # Muro Grafitado: o RACHA da imagem no meio do muro, com tinta respingada em volta
    corte = A[222:422, 248:608]                                   # as letras e a coroa (360 × 200)
    meio = np.asarray(Image.fromarray((corte * 255).astype(np.uint8))).astype(np.float32) / 255.0
    muro = cv2.GaussianBlur(cv2.resize(meio, (W, H), interpolation=cv2.INTER_AREA), (0, 0), 18)
    muro = muro * np.array([.55, .62, .95], np.float32)
    rng = np.random.default_rng(12)
    img = Image.fromarray((np.clip(muro, 0, 1) * 255).astype(np.uint8)).convert('RGBA')
    tinta = Image.new('RGBA', (W, H), (0, 0, 0, 0)); g = ImageDraw.Draw(tinta)
    cores = [(255, 79, 163), (59, 201, 219), (255, 210, 63), (155, 92, 255), (255, 138, 26)]
    for i in range(60):
        x = int(rng.choice([rng.integers(0, 200), rng.integers(520, W)])); y = int(rng.integers(0, H)); r = int(rng.integers(6, 34))
        g.ellipse((x - r, y - r * .7, x + r, y + r * .7), fill=cores[i % 5] + (int(rng.integers(120, 210)),))
        for j in range(5):
            dx, dy = rng.normal(0, r * 1.2, 2); rr = rng.uniform(1.5, 4)
            g.ellipse((x + dx - rr, y + dy - rr, x + dx + rr, y + dy + rr), fill=cores[i % 5] + (200,))
    for i in range(12):                                            # os pingos escorrendo
        x = int(rng.integers(0, W)); y = int(rng.integers(20, 120)); c = cores[i % 5]
        g.rectangle((x, y, x + 3, y + int(rng.integers(20, 70))), fill=c + (190,))
    tinta = tinta.filter(ImageFilter.GaussianBlur(1.2))
    img.alpha_composite(tinta)
    # as letras no meio, com a beirada sumindo no muro
    m = np.ones((200, 360), np.float32)
    rx = np.minimum(np.arange(360), 359 - np.arange(360)) / 40.0
    m = np.clip(np.minimum(m, rx[None, :]), 0, 1)
    letras = Image.fromarray((meio * 255).astype(np.uint8)).convert('RGBA')
    letras.putalpha(Image.fromarray((m * 255).astype(np.uint8)))
    img.alpha_composite(letras, (180, 0))
    out = np.asarray(img.convert('RGB')).astype(np.float32) / 255.0
    hsv = cv2.cvtColor((out * 255).astype(np.uint8), cv2.COLOR_RGB2HSV).astype(np.float32)
    hsv[..., 1] = np.clip(hsv[..., 1] * 1.2, 0, 255)
    out = cv2.cvtColor(hsv.astype(np.uint8), cv2.COLOR_HSV2RGB).astype(np.float32) / 255.0
    return vinheta(contraste(out, 1.1, .45), .3)


def cristo():  # Cristo ao Fundo: o morro e o Cristo no fim de tarde
    a = recorte(812, 0, 1492, 189)
    n = a * np.array([1.08, .9, .78], np.float32) + np.array([.05, .02, 0], np.float32)
    L = lum(a)
    ceu = (a[..., 2] > a[..., 0] + .08) & (L > .45)
    cm = cv2.GaussianBlur(ceu.astype(np.float32), (0, 0), 2)[..., None]
    yy = np.linspace(0, 1, H, dtype=np.float32)[:, None, None] * np.ones((1, W, 1), np.float32)
    ceu_cor = mistura(np.array([.98, .62, .35], np.float32), np.array([1.0, .82, .55], np.float32), yy)
    n = mistura(n, mistura(n, ceu_cor, .55), cm)
    return vinheta(contraste(np.clip(n, 0, 1), 1.08, .45), .3)


def arquibancada():  # Arquibancada: a quadra à noite, os refletores e a galera na arquibancada (de pé, de braço para cima, com bandeira)
    a = recorte(1040, 268, 1660, 440)
    n = a * np.array([.34, .42, .62], np.float32)
    n = contraste(n, 1.2, .2)
    K = 2                                                          # (desenhado no dobro e reduzido: as beiradas ficam lisas)
    img = Image.fromarray((n * 255).astype(np.uint8)).resize((W * K, H * K), Image.LANCZOS).convert('RGBA')
    luz = Image.new('RGBA', (W * K, H * K), (0, 0, 0, 0))
    d = ImageDraw.Draw(luz)
    for i, x in enumerate((70, 250, 470, 650)):                    # os refletores e os fachos
        x *= K
        d.polygon([(x - 14, 22), (x + 14, 22), (x + 230, H * K), (x - 230, H * K)], fill=(235, 245, 255, 38))
    luz = luz.filter(ImageFilter.GaussianBlur(10 * K))
    img.alpha_composite(luz)
    g = ImageDraw.Draw(img)
    for x in (70, 250, 470, 650):
        x *= K
        g.rounded_rectangle((x - 46, 0, x + 46, 26), 6, fill=(20, 24, 48, 255))
        for j in range(4):
            g.ellipse((x - 40 + j * 21, 5, x - 24 + j * 21, 21), fill=(255, 252, 228, 255))
    rng = np.random.default_rng(7)
    fileiras = [(H * K - 128, .7, (44, 52, 104)), (H * K - 84, .86, (28, 34, 74)), (H * K - 38, 1.06, (13, 15, 36))]
    bandeiras = [((0, 156, 59), (255, 223, 0)), ((255, 106, 0), (255, 255, 255)), ((122, 63, 196), (255, 255, 255))]
    for yb, esc, cor in fileiras:                                    # de trás para a frente: menores e mais claros atrás
        x = -20
        while x < W * K + 20:
            x += int(rng.integers(26, 40) * esc)
            hd = rng.uniform(9, 12) * esc * K / 2 * 2
            yc = yb + rng.uniform(-6, 6) * esc
            c = cor + (255,)
            # o corpo (ombros e tronco) e a cabeça
            g.rounded_rectangle((x - hd * 1.9, yc + hd * .9, x + hd * 1.9, H * K + 10), int(hd * .9), fill=c)
            g.ellipse((x - hd, yc - hd, x + hd, yc + hd), fill=c)
            g.arc((x - hd + 1, yc - hd + 1, x + hd - 1, yc + hd - 1), 195, 345, fill=(160, 185, 255, 230), width=max(3, int(3 * esc)))   # a luz dos refletores no contorno
            g.arc((x - hd * 1.9 + 2, yc + hd * .9 + 2, x + hd * 1.9 - 2, yc + hd * 3.2), 200, 340, fill=(120, 145, 230, 170), width=max(2, int(2 * esc)))
            r = rng.random()
            if r < .22:                                              # o braço para cima
                lado = 1 if rng.random() < .5 else -1
                bx = x + lado * hd * 1.6
                g.line([(bx, yc + hd * 1.3), (bx + lado * hd * .7, yc - hd * 2.4)], fill=c, width=int(hd * .9))
                g.ellipse((bx + lado * hd * .7 - hd * .45, yc - hd * 2.9, bx + lado * hd * .7 + hd * .45, yc - hd * 2.0), fill=c)
            elif r < .32:                                            # a bandeira
                f0, f1 = bandeiras[int(rng.integers(0, 3))]
                bx = x + hd * 1.4; topo = yc - hd * 4.2
                g.line([(bx, yc + hd), (bx, topo)], fill=(200, 200, 210, 255), width=max(2, int(hd * .25)))
                g.rectangle((bx, topo, bx + hd * 3.2, topo + hd * 2.0), fill=f0 + (255,), outline=(8, 8, 20, 255), width=2)
                g.ellipse((bx + hd * 1.0, topo + hd * .45, bx + hd * 2.2, topo + hd * 1.55), fill=f1 + (255,))
    img = img.resize((W, H), Image.LANCZOS)
    out = np.asarray(img.convert('RGB')).astype(np.float32) / 255.0
    return vinheta(out, .3)


def bandeirinhas(g, x0, y0, x1, y1, queda, cores, tam, rng):
    """um varal de bandeirinhas (as de festa): a linha caindo no meio e os triângulos pendurados, cada um na sua cor"""
    n = max(2, int(abs(x1 - x0) / (tam * 1.15)))
    pts = []
    for i in range(n * 4 + 1):
        t = i / (n * 4)
        x = x0 + (x1 - x0) * t; y = y0 + (y1 - y0) * t + queda * 4 * t * (1 - t)
        pts.append((x, y))
    g.line(pts, fill=(250, 246, 230, 255), width=max(2, int(tam * .09)))
    for i in range(n):
        t = (i + .5) / n
        x = x0 + (x1 - x0) * t; y = y0 + (y1 - y0) * t + queda * 4 * t * (1 - t)
        incl = math.atan2((y1 - y0) + queda * 4 * (1 - 2 * t), (x1 - x0))   # a bandeirinha segue a linha
        ca, sa = math.cos(incl), math.sin(incl)
        lado = tam * .5; alto = tam * (.95 + rng.uniform(-.06, .06))
        p1 = (x - ca * lado, y - sa * lado); p2 = (x + ca * lado, y + sa * lado)
        p3 = (x - sa * alto, y + ca * alto)                         # a ponta: para baixo, perpendicular à linha
        cor = cores[i % len(cores)]
        g.polygon([p1, p2, p3], fill=cor + (255,), outline=(10, 8, 26, 255))
        g.line([p1, p2, p3, p1], fill=(10, 8, 26, 255), width=max(2, int(tam * .08)))
        g.line([(p1[0] + (p3[0] - p1[0]) * .2, p1[1] + (p3[1] - p1[1]) * .2), (p1[0] + (p2[0] - p1[0]) * .5 + (p3[0] - p1[0]) * .08, p1[1] + (p2[1] - p1[1]) * .5 + 2)],
               fill=(255, 255, 255, 110), width=max(1, int(tam * .07)))


def carnaval():  # Carnaval: a rua em festa à noite — o muro com a bandeira, os varais de bandeirinhas e o confete
    a = recorte(960, 200, 1472, 342)
    n = a * np.array([.62, .38, .86], np.float32) + np.array([.08, .0, .12], np.float32)
    K = 2
    img = Image.fromarray((np.clip(contraste(n, 1.1, .4), 0, 1) * 255).astype(np.uint8)).resize((W * K, H * K), Image.LANCZOS).convert('RGBA')
    # a luz quente da festa vindo de cima
    luz = Image.new('RGBA', (W * K, H * K), (0, 0, 0, 0)); dl = ImageDraw.Draw(luz)
    for x, cor in ((180, (255, 170, 60, 70)), (560, (255, 90, 170, 60))):
        dl.ellipse(((x - 220) * K, -140 * K, (x + 220) * K, 120 * K), fill=cor)
    luz = luz.filter(ImageFilter.GaussianBlur(28 * K)); img.alpha_composite(luz)
    cam = Image.new('RGBA', (W * K, H * K), (0, 0, 0, 0))
    g = ImageDraw.Draw(cam)
    rng = np.random.default_rng(5)
    cores = [(255, 210, 63), (255, 79, 163), (59, 201, 219), (105, 219, 124), (155, 92, 255), (255, 138, 26)]
    bandeirinhas(g, -20 * K, 8 * K, 380 * K, 26 * K, 46 * K, cores, 30 * K, rng)
    bandeirinhas(g, 330 * K, 18 * K, 760 * K, 4 * K, 52 * K, cores[2:] + cores[:2], 30 * K, rng)
    bandeirinhas(g, -30 * K, 70 * K, 760 * K, 82 * K, 60 * K, cores[4:] + cores[:4], 24 * K, rng)
    for i in range(170):                                            # o confete (girado, de vários tamanhos)
        x, y = rng.uniform(0, W * K), rng.uniform(0, H * K)
        w, h = rng.uniform(5, 11) * K / 2, rng.uniform(3, 6) * K / 2
        an = rng.uniform(0, math.pi)
        ca, sa = math.cos(an), math.sin(an)
        q = [(x + ca * dx - sa * dy, y + sa * dx + ca * dy) for dx, dy in ((-w, -h), (w, -h), (w, h), (-w, h))]
        g.polygon(q, fill=cores[i % len(cores)] + (235,))
    img.alpha_composite(cam)
    img = img.resize((W, H), Image.LANCZOS)
    out = np.asarray(img.convert('RGB')).astype(np.float32) / 255.0
    return vinheta(out, .3)


CENAS = [('laje', noite), ('por_do_sol', por_do_sol), ('grafite', grafite), ('cristo', cristo), ('estadio', arquibancada), ('carnaval', carnaval)]

if __name__ == '__main__':
    atlas = np.zeros((H * len(CENAS), W, 3), np.float32)
    for i, (nome, f) in enumerate(CENAS):
        atlas[i * H:(i + 1) * H] = np.clip(f(), 0, 1)
    im = Image.fromarray((atlas * 255).astype(np.uint8))
    im.save(AQUI / 'banners.png')
    im.save(AQUI / 'banners.webp', 'WEBP', quality=82, method=6)
    json.dump({'w': W, 'h': H, 'cenas': [n for n, _ in CENAS]}, open(AQUI / 'banners.json', 'w'), indent=1)
    print('banners', im.size, (AQUI / 'banners.webp').stat().st_size, 'bytes')
