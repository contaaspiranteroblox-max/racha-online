#!/usr/bin/env python3
"""RACHA v91 · o FUNDO da tela inicial tirado da imagem de referência enviada (tools/v91/referencia.png, 1672 × 941).

A imagem enviada é a tela inicial pronta (com os botões, a faixa azul de cima e a tampinha no meio). O jogo desenha os
botões e a tampinha dele por cima, então o fundo precisa ficar LIMPO:

1. corta a faixa azul de cima (o jogo tem a dele): o fundo começa logo embaixo dela (y = 104 da imagem);
2. marca o que é interface (os 8 botões dos lados com os selos vermelhos, os 4 blocos de baixo, a tampinha e a sombra
   dela) e refaz o que ficava embaixo com a completação por retalhos (tools/v91/completa.py: PatchMatch em várias
   escalas, só numpy + OpenCV), cada pedaço olhando só a vizinhança dele (o grafite RACHA, a bandeira e o Cristo não
   servem de modelo, para não aparecerem repetidos);
3. estica os dois lados para as telas mais largas que 16:9 (celular deitado 19,5:9 e 21:9) do mesmo jeito;
4. salva o fundo (fundo.webp) e a versão desfocada e escura para as telas internas (fundo_telas.webp), e o
   fundo.json com o tamanho e o lugar da tampinha (o centro e o raio) — o jogo põe a tampinha dele ali.

Rodar: python3 tools/v91/fundo.py           (uns 3 a 6 minutos; o resultado fica na pasta e entra no build)
"""
import json, pathlib, sys, time
import numpy as np
import cv2
from PIL import Image, ImageDraw, ImageFilter

AQUI = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(AQUI))
from completa import completa  # noqa: E402

REF = np.asarray(Image.open(AQUI / 'referencia.png').convert('RGB'))   # 1672 × 941
TOPO = 104                                     # a faixa azul de cima termina aqui
LADO = 300                                     # quanto cada lado cresce (telas largas)
TAMPA = (832, 490, 205)                        # a tampinha na imagem: centro x, centro y, raio (o jogo põe a dele aqui)


def log(*a):
    print(*a, flush=True)


def mascara():
    """o que é interface na imagem (True = refazer), nas coordenadas da imagem inteira"""
    H, W = REF.shape[:2]
    m = Image.new('L', (W, H), 0)
    d = ImageDraw.Draw(m)
    R = lambda b, r=18: d.rounded_rectangle(b, radius=r, fill=255)
    C = lambda cx, cy, r: d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=255)
    d.rectangle((0, 0, W, TOPO + 1), fill=255)
    d.rounded_rectangle((22, 90, 145, TOPO + 12), radius=20, fill=255)          # o aro do avatar desce um pouco
    for (x0, y0, x1, y1) in [(23, 147, 193, 287), (23, 296, 187, 435), (22, 442, 193, 582), (24, 596, 187, 729)]:
        R((x0 - 6, y0 - 5, x1 + 6, y1 + 8))
    for cy in (165, 313, 459, 607):
        C(175, cy, 21)
    for (x0, y0, x1, y1) in [(1484, 147, 1648, 282), (1484, 292, 1648, 431), (1484, 444, 1648, 581), (1485, 589, 1653, 729)]:
        R((x0 - 6, y0 - 5, x1 + 6, y1 + 8))
    for cy in (159, 306, 456, 606):
        C(1636, cy, 21)
    R((17, 751, 533, 918)); R((519, 770, 785, 916)); C(762, 793, 21)             # PASSE e MISSÕES
    R((789, 773, 1210, 916)); R((1197, 740, 1658, 924))                          # o MODO e o JOGAR
    d.ellipse((TAMPA[0] - 222, TAMPA[1] - 214, TAMPA[0] + 222, TAMPA[1] + 214), fill=255)   # a tampinha
    d.ellipse((TAMPA[0] - 196, 668, TAMPA[0] + 196, 722), fill=255)               # a sombra dela no chão
    return np.asarray(m) > 0


def proibidos():
    """o que não pode servir de modelo (é único na cena: copiar daria repetido)"""
    H, W = REF.shape[:2]
    m = Image.new('L', (W, H), 0)
    d = ImageDraw.Draw(m)
    d.rectangle((282, 322, 592, 552), fill=255)       # o grafite RACHA com a coroa
    d.rectangle((1176, 378, 1346, 510), fill=255)     # a bandeira
    d.rectangle((1000, 112, 1100, 215), fill=255)     # o Cristo
    return np.asarray(m) > 0


def pedaco(A, B, F, x0, y0, x1, y1, nome):
    H, W = B.shape
    x0, y0, x1, y1 = max(0, x0), max(0, y0), min(W, x1), min(H, y1)
    b = B[y0:y1, x0:x1]
    if not b.any():
        return A, B
    t = time.time()
    a = completa(A[y0:y1, x0:x1], b, F[y0:y1, x0:x1], log=None)
    A = A.copy(); A[y0:y1, x0:x1] = a
    B = B.copy(); B[y0:y1, x0:x1] = False
    log('  %-10s %4dx%-4d  %.1fs' % (nome, x1 - x0, y1 - y0, time.time() - t))
    return A, B


def limpa():
    """a imagem sem a interface (o passo demorado: uns 3 minutos) → fundo_limpo.png"""
    t0 = time.time()
    M = mascara()
    P = proibidos()
    A = REF[TOPO:].copy()
    B = M[TOPO:].copy()
    F = ~P[TOPO:]
    H, W = B.shape
    log('fundo: %dx%d, a refazer %d px' % (W, H, B.sum()))
    o = lambda y: y - TOPO
    # a tampinha primeiro (o maior), depois os botões, depois a fileira de baixo
    A, B = pedaco(A, B, F, 470, o(190), 1195, o(800), 'tampinha')
    for i, (y0, y1) in enumerate([(104, 300), (282, 450), (430, 600), (575, 760)]):
        A, B = pedaco(A, B, F, 0, o(y0 - 40), 380, o(y1 + 60), 'esq%d' % i)
        A, B = pedaco(A, B, F, 1300, o(y0 - 40), 1672, o(y1 + 60), 'dir%d' % i)
    A, B = pedaco(A, B, F, 0, o(650), 640, o(941), 'passe')
    A, B = pedaco(A, B, F, 380, o(650), 960, o(941), 'missoes')
    A, B = pedaco(A, B, F, 640, o(650), 1330, o(941), 'modo')
    A, B = pedaco(A, B, F, 1050, o(640), 1672, o(941), 'jogar')
    if B.any():
        A, B = pedaco(A, B, F, 0, 0, W, H, 'resto')
    Image.fromarray(A).save(AQUI / 'fundo_limpo.png')
    log('limpo em %.0fs' % (time.time() - t0))
    return A


def suave(x0, x1, x):
    t = np.clip((x - x0) / float(x1 - x0), 0, 1)
    return t * t * (3 - 2 * t)


def compoe(A):
    """o fundo final: o meio nítido (como na imagem), as beiradas desfocadas e mais escuras (os botões dos lados ficam
    por cima; o desfoque esconde o que foi refeito embaixo deles e vira a profundidade da cena), os lados das telas largas
    (o espelho da beirada, bem desfocado), o chão de baixo mais escuro (a fileira de baixo fica por cima) e o lugar da
    tampinha com a luz roxa (o jogo põe a tampinha dele ali)."""
    H, W = A.shape[:2]
    E = np.zeros((H, W + 2 * LADO, 3), np.uint8)
    E[:, LADO:LADO + W] = A
    E[:, :LADO] = A[:, LADO - 1::-1]
    E[:, LADO + W:] = A[:, :W - LADO - 1:-1]
    Ef = E.astype(np.float32)
    WW = Ef.shape[1]
    xx = np.arange(WW, dtype=np.float32)
    # quanto desfocar em cada coluna: 0 no meio; cresce nas beiradas da imagem (onde ficam os botões) e nos lados novos
    b_esq = 1 - suave(LADO + 60, LADO + 300, xx)
    b_dir = suave(LADO + W - 300, LADO + W - 60, xx)
    w = np.maximum(b_esq, b_dir)
    f1 = cv2.GaussianBlur(Ef, (0, 0), 3.2)
    f2 = cv2.GaussianBlur(Ef, (0, 0), 9)
    w1 = np.clip(w * 2, 0, 1)[None, :, None]
    w2 = np.clip(w * 2 - 1, 0, 1)[None, :, None]
    out = Ef * (1 - w1) + f1 * w1
    out = out * (1 - w2) + f2 * w2
    # mais escuro e mais azul nas beiradas (o tom dos botões)
    esc = (1 - .38 * w)[None, :, None]
    out = out * esc + np.array([10, 14, 40], np.float32)[None, None, :] * (.38 * w)[None, :, None]
    # o chão de baixo (embaixo da fileira de baixo): mais escuro
    yy = np.arange(H, dtype=np.float32)
    baixo = suave(H - 210, H - 20, yy)[:, None, None]
    fb = cv2.GaussianBlur(out, (0, 0), 4)
    out = out * (1 - baixo * .6) + fb * (baixo * .6)
    out = out * (1 - .42 * baixo)
    # o lugar da tampinha: o que foi refeito ali vira luz (desfocado, com o roxo da imagem por cima)
    tx, ty, tr = TAMPA[0] + LADO, TAMPA[1] - TOPO, TAMPA[2]
    Y, X = np.mgrid[0:H, 0:WW].astype(np.float32)
    d = np.sqrt(((X - tx) / (tr * 1.1)) ** 2 + ((Y - ty) / (tr * 1.06)) ** 2)
    dentro = (1 - suave(.86, 1.06, d))[..., None]
    fc = cv2.GaussianBlur(out, (0, 0), 14)
    out = out * (1 - dentro) + fc * dentro
    # o chão molhado embaixo da tampinha (o reflexo dela): borrado na vertical, como reflexo em chão molhado
    fr = cv2.GaussianBlur(out, (0, 0), sigmaX=5, sigmaY=16)
    chao = (suave(ty + tr * .55, ty + tr * .95, Y) * (1 - suave(tr * 1.05, tr * 1.6, np.abs(X - tx))))[..., None]
    chao = np.maximum(chao, (suave(H - 330, H - 200, Y) * .92)[..., None])     # e o chão todo perto da fileira de baixo
    out = out * (1 - chao) + fr * chao
    luz = np.clip(1 - d / 1.25, 0, 1) ** 1.6
    roxo = np.array([150, 70, 255], np.float32)
    out = out * (1 - .55 * luz[..., None]) + roxo * (.55 * luz[..., None])
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8))


def main():
    t0 = time.time()
    lim = AQUI / 'fundo_limpo.png'
    if 'refaz' in sys.argv or not lim.exists():
        A = limpa()
    else:
        A = np.asarray(Image.open(lim).convert('RGB'))
        log('fundo: usando o fundo_limpo.png que já está pronto (python3 tools/v91/fundo.py refaz: refaz)')
    im = compoe(A)
    im.save(AQUI / 'fundo.png')
    im.save(AQUI / 'fundo.webp', 'WEBP', quality=84, method=6)
    # as telas internas: o mesmo fundo, desfocado e escuro (o painel fica legível por cima)
    pq = im.resize((im.width // 2, im.height // 2), Image.LANCZOS).filter(ImageFilter.GaussianBlur(9))
    q = np.asarray(pq).astype(np.float32)
    q = q * np.array([.52, .5, .62], np.float32) + np.array([8, 6, 22], np.float32)
    Image.fromarray(np.clip(q, 0, 255).astype(np.uint8)).save(AQUI / 'fundo_telas.webp', 'WEBP', quality=80, method=6)
    info = {'w': im.width, 'h': im.height, 'lado': LADO, 'topo_na_imagem': TOPO,
            'tampa': {'x': TAMPA[0] + LADO, 'y': TAMPA[1] - TOPO, 'r': TAMPA[2]},
            'meio': {'x0': LADO, 'x1': LADO + A.shape[1]}}
    json.dump(info, open(AQUI / 'fundo.json', 'w'), indent=1)
    log('ok', info, '%.0fs' % (time.time() - t0), (AQUI / 'fundo.webp').stat().st_size, 'bytes')


if __name__ == '__main__':
    main()
