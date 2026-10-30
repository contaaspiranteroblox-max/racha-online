"""RACHA v91 · completar buracos de uma imagem (o que ficava embaixo dos botões da imagem de referência).

A completação por exemplos (Criminisi, Pérez e Toyama, 2004): o buraco é preenchido da borda para dentro, um retalho por
vez, começando pelos lugares com mais estrutura (linhas do alambrado, beiradas do muro, as linhas da quadra) e com mais
vizinhança conhecida; cada retalho é copiado do pedaço conhecido da imagem que mais combina com o que já está em volta
(cv2.matchTemplate com máscara, numa janela perto). Só numpy + OpenCV. Roda aqui, na hora de gerar as imagens do jogo:
nada disto vai para o jogo.

completa(img, buraco, fonte=None, meio=6, janela=170) -> imagem completada
  img    : H×W×3 uint8 (RGB)
  buraco : H×W bool (True = refazer)
  fonte  : H×W bool opcional (True = pode servir de modelo; o padrão é tudo o que não é buraco)
"""
import numpy as np
import cv2


def completa(img, buraco, fonte=None, meio=6, janela=170, log=None):
    H, W = buraco.shape
    m = meio
    k = 2 * m + 1
    I = img.astype(np.float32).copy()
    falta = buraco.copy()
    if fonte is None:
        fonte = np.ones_like(buraco)
    conf = (~falta).astype(np.float32)
    # onde um retalho inteiro pode servir de modelo (conhecido desde o começo, dentro da imagem)
    ok = (fonte & ~buraco).astype(np.uint8)
    ok = cv2.erode(ok, np.ones((k, k), np.uint8), borderType=cv2.BORDER_CONSTANT, borderValue=0) > 0
    ok[:m, :] = ok[H - m:, :] = False
    ok[:, :m] = ok[:, W - m:] = False
    if not ok.any():
        raise ValueError('sem modelo para completar')
    # a estrutura (o gradiente) da parte conhecida, para a ordem
    cinza = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY).astype(np.float32)
    gx = cv2.Sobel(cinza, cv2.CV_32F, 1, 0, ksize=3)
    gy = cv2.Sobel(cinza, cv2.CV_32F, 0, 1, ksize=3)
    longe = cv2.erode((~buraco).astype(np.uint8), np.ones((3, 3), np.uint8)) == 0
    gx[longe] = 0
    gy[longe] = 0
    mag = np.sqrt(gx * gx + gy * gy)
    big = cv2.dilate(mag, np.ones((k, k), np.uint8))               # a linha mais forte perto
    IXm = cv2.dilate(np.abs(gy), np.ones((k, k), np.uint8))         # a direção dela (aproximação: os maiores em volta)
    IYm = cv2.dilate(np.abs(gx), np.ones((k, k), np.uint8))
    passos = 0
    while falta.any():
        # a frente: o que falta e encosta no que já está pintado
        fr = falta & (cv2.dilate((~falta).astype(np.uint8), np.ones((3, 3), np.uint8)) > 0)
        fy, fx = np.nonzero(fr)
        if not len(fy):
            fy, fx = np.nonzero(falta)
        # confiança: quanto do retalho já é conhecido (e com que certeza)
        cmed = cv2.boxFilter(conf, -1, (k, k), normalize=True, borderType=cv2.BORDER_CONSTANT)
        C = cmed[fy, fx]
        # estrutura: a normal da frente contra a direção das linhas (isófotas) que chegam nela
        mf = cv2.GaussianBlur(falta.astype(np.float32), (5, 5), 1.2)
        nx = cv2.Sobel(mf, cv2.CV_32F, 1, 0, ksize=3)[fy, fx]
        ny = cv2.Sobel(mf, cv2.CV_32F, 0, 1, ksize=3)[fy, fx]
        nn = np.sqrt(nx * nx + ny * ny) + 1e-6
        ix = IXm[fy, fx]
        iy = IYm[fy, fx]
        D = (np.abs(ix * nx) + np.abs(iy * ny)) / nn / 255.0 + .05 * big[fy, fx] / 255.0 + 1e-3
        p = int(np.argmax(C * D))
        py = min(max(int(fy[p]), m), H - 1 - m)
        px = min(max(int(fx[p]), m), W - 1 - m)
        # o modelo: na janela perto, o retalho conhecido que mais combina com o que já tem
        y0, y1 = max(0, py - janela), min(H, py + janela + 1)
        x0, x1 = max(0, px - janela), min(W, px + janela + 1)
        tpl = I[py - m:py + m + 1, px - m:px + m + 1]
        msk = (~falta[py - m:py + m + 1, px - m:px + m + 1]).astype(np.float32)
        win = I[y0:y1, x0:x1]
        okw = ok[y0 + m:y1 - m, x0 + m:x1 - m]
        if msk.sum() < 1 or not okw.any():
            # (sem nada conhecido em volta ou sem modelo perto: procura na imagem toda)
            y0, y1, x0, x1 = 0, H, 0, W
            win = I
            okw = ok[m:H - m, m:W - m]
        if msk.sum() < 1:
            res = np.zeros(okw.shape, np.float32)
        else:
            res = cv2.matchTemplate(win, tpl, cv2.TM_SQDIFF, mask=np.repeat(msk[..., None], 3, 2))
        res = np.where(okw, res, np.inf)
        if not np.isfinite(res).any():
            raise ValueError('sem modelo na janela')
        q = int(np.argmin(res))
        qy, qx = divmod(q, res.shape[1])
        qy += y0 + m
        qx += x0 + m
        # copia só o que falta
        sl = (slice(py - m, py + m + 1), slice(px - m, px + m + 1))
        f = falta[sl]
        I[sl][f] = I[qy - m:qy + m + 1, qx - m:qx + m + 1][f]
        conf[sl][f] = C[p]
        falta[sl] = False
        passos += 1
        if log and passos % 500 == 0:
            log('    %d retalhos, faltam %d px' % (passos, int(falta.sum())))
    out = img.copy()
    out[buraco] = np.clip(I[buraco] + .5, 0, 255).astype(np.uint8)
    return out
