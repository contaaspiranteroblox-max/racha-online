#!/usr/bin/env python3
"""RACHA rua v77 · as peças tiradas das duas imagens enviadas do LOBBY e do PERFIL (tools/v77/lobby_original.png e
perfil_original.png), para o jogo ficar com a cara delas:

1. o LETREIRO (RACHA com a coroa e a faixa FUTEBOL DE RUA), recortado do lobby pelo contorno preto da tinta
   → letreiro.png / letreiro.webp (com transparência);
2. o FUNDO do lobby limpo: a imagem sem os botões, sem o letreiro e sem a tampinha (o jogo põe os dele por cima).
   O que estava embaixo dos botões é refeito pelo LaMa (o modelo de "apagar e completar" do OpenCV Zoo, licença
   Apache 2.0), que só roda aqui, na hora de gerar a imagem: ele não vai para o jogo. Os braços e a cabeça do Cristo
   ficavam embaixo da pílula das moedas e são desenhados à mão (o LaMa não sabe que ali tem uma estátua).
   → fundo_lobby.png / fundo_lobby.webp. Sem o modelo, o script mantém o fundo que já está pronto na pasta.
3. os ÍCONES dos botões (loja, tampinha, clube, treino, salas, amigos, ranking, eventos, moeda, gema, desafios, pilha
   de moedas, campo, coroa do título e os do perfil: relógio, estrela, bio, bola, chuteira, troféu, controle, %),
   recortados do fundo escuro do botão com o contorno junto → icones.png / icones.webp + icones.json ([x, y, w, h]);
4. o BANNER do perfil: as casas do morro do fundo limpo, em tom escuro → banner_perfil.webp.

Rodar: python3 tools/v77/pecas.py          (com o LaMa: RACHA_LAMA=/caminho/inpainting_lama_2025jan.onnx)
O modelo: https://github.com/opencv/opencv_zoo/tree/main/models/inpainting_lama (inpainting_lama_2025jan.onnx)
"""
import json, os, pathlib
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage as ndi

AQUI = pathlib.Path(__file__).resolve().parent
LOBBY = Image.open(AQUI / 'lobby_original.png').convert('RGB')          # 1844 × 853
PERFIL = Image.open(AQUI / 'perfil_original.png').convert('RGB')        # 1846 × 852
A_L = np.asarray(LOBBY).astype(np.int32)
A_P = np.asarray(PERFIL).astype(np.int32)
lum = lambda C: (C[..., 0]*299 + C[..., 1]*587 + C[..., 2]*114)//1000


# ------------------------------------------------------------------ 1) o letreiro
LET_BOX = (680, 172, 1162, 408)                                       # onde ele fica na imagem do lobby


def letreiro():
    x0, y0, x1, y1 = LET_BOX
    C = A_L[y0:y1, x0:x1]
    L, S = lum(C), C.max(axis=2) - C.min(axis=2)
    B = (L < 50) & (S < 70)                                            # a tinta preta do contorno, das letras e dos pingos
    lab, n = ndi.label(B); tam = ndi.sum(B, lab, range(1, n + 1)); grande = 1 + int(np.argmax(tam))
    F = ndi.binary_fill_holes(lab == grande)                           # o que o contorno fecha: as letras, a coroa e a faixa
    perto = ndi.binary_dilation(F, iterations=18)
    for i in range(1, n + 1):                                          # os respingos do spray em volta
        if i == grande: continue
        comp = lab == i
        if not (6 <= tam[i - 1] <= 400 and (comp & perto).any()): continue
        cor = C[comp].mean(axis=0)
        if cor[1] > cor[0] + 6 or L[comp].mean() > 34: continue        # (verde de árvore ou cinza do fundo: não é tinta)
        F |= ndi.binary_fill_holes(comp)
    alfa = np.asarray(Image.fromarray((F*255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(.6)))
    ys, xs = np.nonzero(F)
    bx0, by0, bx1, by1 = xs.min() - 2, ys.min() - 2, xs.max() + 3, ys.max() + 3
    out = np.zeros(C.shape[:2] + (4,), np.uint8); out[..., :3] = C; out[..., 3] = alfa
    im = Image.fromarray(out[by0:by1, bx0:bx1])
    im.save(AQUI / 'letreiro.png', optimize=True)
    im.save(AQUI / 'letreiro.webp', 'WEBP', quality=90, alpha_quality=95, method=6)
    caixa = (x0 + bx0, y0 + by0, x0 + bx1, y0 + by1)
    print('letreiro', im.size, 'na imagem', caixa, (AQUI / 'letreiro.webp').stat().st_size, 'bytes')
    M = np.zeros(A_L.shape[:2], bool); M[y0:y1, x0:x1] = F
    return M, caixa


# ------------------------------------------------------------------ 2) o fundo limpo (LaMa)
def mascara_lobby(M_let):
    H, W = A_L.shape[:2]
    Mi = Image.new('L', (W, H), 0); d = ImageDraw.Draw(Mi)
    R = lambda b, r=18: d.rounded_rectangle(b, radius=r, fill=255)
    R((22, 12, 572, 118)); R((1156, 16, 1370, 95), 30); R((1368, 16, 1570, 97), 30); R((1564, 12, 1826, 104))   # o topo
    R((22, 140, 184, 668)); R((1658, 140, 1826, 668))                                                           # as colunas
    R((20, 688, 460, 830)); R((650, 698, 1194, 830)); R((1194, 680, 1826, 830))                                 # embaixo
    d.ellipse((917 - 112, 548 - 112, 917 + 112, 548 + 112), fill=255); d.ellipse((790, 620, 1045, 676), fill=255)   # a tampinha e a sombra
    d.ellipse((720, 518, 786, 584), fill=255); d.ellipse((1058, 518, 1124, 584), fill=255)                          # as setinhas
    return (np.asarray(Mi) > 0) | ndi.binary_dilation(M_let, iterations=9)


def lama(modelo):
    import onnxruntime as ort
    ort.set_default_logger_severity(3)
    so = ort.SessionOptions(); so.log_severity_level = 3
    S = ort.InferenceSession(str(modelo), so, providers=['CPUExecutionProvider'])

    def roda(img, mask):
        x = img.astype(np.float32).transpose(2, 0, 1)[None]/255.0
        m = mask.astype(np.float32)[None, None]
        out = S.run(None, {'image': x*(1 - m), 'mask': m})[0][0].transpose(1, 2, 0)
        if out.max() <= 1.5: out = out*255.0
        return np.clip(out, 0, 255).astype(np.uint8)
    return roda


def janela(roda, A, M, x0, y0, lado=512):
    H, W = M.shape
    x0 = max(0, min(W - lado, x0)); y0 = max(0, min(H - lado, y0))
    m = M[y0:y0 + lado, x0:x0 + lado]
    if not m.any(): return A, M
    a = A[y0:y0 + lado, x0:x0 + lado]
    o = roda(a, m) if lado == 512 else np.asarray(Image.fromarray(roda(np.asarray(Image.fromarray(a).resize((512, 512), Image.LANCZOS)),
                                                                        np.asarray(Image.fromarray((m*255).astype(np.uint8)).resize((512, 512))) > 20)).resize((lado, lado), Image.LANCZOS))
    A = A.copy(); A[y0:y0 + lado, x0:x0 + lado] = np.where(m[..., None], o, a)
    M = M.copy(); M[y0:y0 + lado, x0:x0 + lado] = False                  # (o que já foi preenchido vira fundo conhecido)
    return A, M


def cristo(A):                                                         # os braços e a cabeça (ficavam embaixo da pílula das moedas)
    A = A.copy()
    for y in range(64, 84):                                            # o céu por cima dos tocos que sobraram
        esq = A[y, 1240:1248].astype(float).mean(axis=0); dir_ = A[y, 1288:1296].astype(float).mean(axis=0)
        for x in range(1248, 1288):
            t = (x - 1248)/40.0; A[y, x] = (esq*(1 - t) + dir_*t).astype(np.uint8)
    K, ox, oy = 8, 1207, 62
    cam = Image.new('RGBA', (120*K, 60*K), (0, 0, 0, 0)); g = ImageDraw.Draw(cam)
    P = lambda x, y: ((x - ox)*K, (y - oy)*K)
    C1, C2, C3 = (190, 128, 94, 255), (138, 90, 84, 255), (158, 102, 80, 255)   # o lado do sol · o da sombra · embaixo dos braços
    g.polygon([P(1257.2, 84), P(1277, 84), P(1278.6, 101), P(1255.8, 101)], fill=C1)
    g.polygon([P(1267.6, 84), P(1277, 84), P(1278.6, 101), P(1267.6, 101)], fill=C2)
    g.polygon([P(1262.2, 80.5), P(1272.2, 80.5), P(1275.5, 85.5), P(1259, 85.5)], fill=C1)
    g.polygon([P(1267.4, 80.5), P(1272.2, 80.5), P(1275.5, 85.5), P(1267.4, 85.5)], fill=C2)
    g.rounded_rectangle([P(1236.5, 83.4), P(1297.5, 88.2)], radius=2.3*K, fill=C3)
    g.rounded_rectangle([P(1236.5, 83.4), P(1267.4, 86)], radius=1.2*K, fill=C1)
    g.polygon([P(1247, 87.6), P(1257.5, 87.6), P(1257.5, 96)], fill=C3)
    g.polygon([P(1277.3, 87.6), P(1287.8, 87.6), P(1277.3, 96)], fill=C2)
    g.ellipse([P(1263, 73), P(1271.6, 82)], fill=C1)
    g.pieslice([P(1263, 73), P(1271.6, 82)], -90, 90, fill=C2)
    cam = cam.resize((120, 60), Image.LANCZOS).filter(ImageFilter.GaussianBlur(.45))
    base = Image.fromarray(A).convert('RGBA'); base.alpha_composite(cam, (ox, oy))
    return np.asarray(base.convert('RGB')).copy()


def fundo(M_let):
    modelo = pathlib.Path(os.environ.get('RACHA_LAMA', AQUI / 'inpainting_lama_2025jan.onnx'))
    if not modelo.exists():
        print('fundo: sem o modelo LaMa (%s) · fica o fundo_lobby.png que já está pronto' % modelo)
        return
    roda = lama(modelo)
    A = np.asarray(LOBBY).copy(); M = mascara_lobby(M_let); H, W = M.shape
    Image.fromarray((M*255).astype(np.uint8)).save(AQUI / 'fundo_mascara.png', optimize=True)
    for x0, y0 in [(665, 40), (661, 300), (0, 120), (0, 341), (1332, 120), (1332, 341)]:   # o meio primeiro, depois as colunas
        A, M = janela(roda, A, M, x0, y0)
    for x0 in list(range(0, W - 256, 320)) + [W - 512]:                                     # o topo e a faixa de baixo
        for y0 in (0, 341):
            A, M = janela(roda, A, M, x0, y0)
    assert not M.any()
    A = cristo(A)
    im = Image.fromarray(A)
    im.save(AQUI / 'fundo_lobby.png', optimize=True)
    im.save(AQUI / 'fundo_lobby.webp', 'WEBP', quality=84, method=6)
    print('fundo', im.size, (AQUI / 'fundo_lobby.webp').stat().st_size, 'bytes')


# ------------------------------------------------------------------ 3) os ícones
ICONES = {   # nome: (imagem, caixa x0 y0 x1 y1, limiar da diferença para o fundo do botão, folga do contorno)
    'loja': ('lobby', (46, 158, 154, 236), 34, 2), 'tampinha': ('lobby', (46, 290, 154, 364), 34, 2),
    'clube': ('lobby', (46, 414, 154, 494), 34, 2), 'treino': ('lobby', (52, 546, 150, 616), 34, 2),
    'salas': ('lobby', (1688, 158, 1796, 236), 34, 2), 'amigos': ('lobby', (1688, 286, 1796, 364), 34, 2),
    'ranking': ('lobby', (1690, 415, 1795, 488), 34, 2), 'eventos': ('lobby', (1690, 540, 1795, 614), 34, 2),
    'moeda': ('lobby', (1174, 30, 1226, 84), 'ouro', 2), 'gema': ('lobby', (1382, 31, 1435, 84), 30, 1),
    'amigos_topo': ('lobby', (1662, 32, 1726, 84), 40, 1), 'ajustes_topo': ('lobby', (1748, 30, 1806, 86), 40, 1),
    'desafios': ('lobby', (50, 722, 116, 792), 30, 2), 'pilha': ('lobby', (348, 720, 424, 781), 30, 1),
    'campo': ('lobby', (1230, 712, 1296, 782), 30, 1), 'coroa': ('perfil', (340, 18, 432, 88), 'ouro', 3),
    'relogio': ('perfil', (1126, 570, 1180, 624), 30, 1), 'estrela': ('perfil', (1346, 570, 1396, 624), 30, 1),
    'bio': ('perfil', (1556, 570, 1600, 614), 30, 1), 'bola': ('perfil', (1116, 706, 1170, 760), 30, 1),
    'chuteira': ('perfil', (1248, 706, 1302, 760), 30, 1), 'trofeu': ('perfil', (1404, 706, 1456, 760), 30, 1),
    'controle': ('perfil', (1544, 706, 1600, 760), 30, 1), 'porcento': ('perfil', (1686, 706, 1742, 760), 30, 1),
}


def icone(fonte, box, limiar, dil):
    A = A_L if fonte == 'lobby' else A_P
    x0, y0, x1, y1 = box
    C = A[y0:y1, x0:x1]
    borda = np.concatenate([C[0], C[-1], C[:, 0], C[:, -1]])
    bg = np.median(borda, axis=0)
    if limiar == 'ouro':                                               # pela cor: o dourado (e o contorno preto, pela folga)
        R_, G_, B_ = C[..., 0], C[..., 1], C[..., 2]
        m = (R_ > 140) & (G_ > 95) & (B_ < 120) & (R_ - B_ > 60)
    else:
        m = np.sqrt(((C - bg)**2).sum(axis=2)) > limiar
    lab, n = ndi.label(m); tam = ndi.sum(m, lab, range(1, n + 1)); h, w = m.shape
    keep = np.zeros_like(m)
    for i in range(1, n + 1):
        if tam[i - 1] < max(25, .015*tam.max()): continue             # (respingos e beiradas soltas)
        ys, xs = np.nonzero(lab == i)
        if ys.min() <= 0 and ys.max() < h*.2: continue                 # (a beirada de cima do botão, se a caixa pegou)
        cor = C[lab == i].mean(axis=0)
        if tam[i - 1] < tam.max() and cor[0] > 170 and cor[1] < 110 and cor[2] < 110: continue   # (o pontinho vermelho de novidade do botão vizinho)
        keep |= lab == i
    keep = ndi.binary_dilation(ndi.binary_fill_holes(keep), iterations=dil)
    alfa = np.asarray(Image.fromarray((keep*255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(.7)))
    ys, xs = np.nonzero(keep)
    bx0, by0, bx1, by1 = max(0, xs.min() - 2), max(0, ys.min() - 2), min(w, xs.max() + 3), min(h, ys.max() + 3)
    out = np.zeros((h, w, 4), np.uint8); out[..., :3] = C; out[..., 3] = alfa
    return Image.fromarray(out[by0:by1, bx0:bx1])


def icones():
    pecas = {n: icone(*v) for n, v in ICONES.items()}
    x = y = alt = 0; larg = 520; rects = {}; pos = []
    for n, p in pecas.items():
        if x + p.width > larg: x, y, alt = 0, y + alt + 2, 0
        rects[n] = [x, y, p.width, p.height]; pos.append((p, x, y)); x += p.width + 2; alt = max(alt, p.height)
    at = Image.new('RGBA', (larg, y + alt), (0, 0, 0, 0))
    for p, px, py in pos: at.alpha_composite(p, (px, py))
    at.save(AQUI / 'icones.png', optimize=True)
    at.save(AQUI / 'icones.webp', 'WEBP', quality=92, alpha_quality=95, method=6)
    json.dump(rects, open(AQUI / 'icones.json', 'w'), indent=1)
    print('ícones', at.size, (AQUI / 'icones.webp').stat().st_size, 'bytes ·', len(rects))


# ------------------------------------------------------------------ 4) o banner do perfil (as casas do morro, no escuro)
def banner():
    f = AQUI / 'fundo_lobby.png'
    if not f.exists(): print('banner: falta o fundo_lobby.png'); return
    im = Image.open(f).convert('RGB').crop((1290, 196, 1844, 334)).resize((760, 190), Image.LANCZOS)
    A = np.asarray(im).astype(np.float32)
    cinza = A.mean(axis=2, keepdims=True)
    A = (cinza*.78 + A*.22)*.62                                        # quase sem cor e escuro, como no cartão da imagem
    yy, xx = np.mgrid[0:190, 0:760]
    v = 1 - .55*np.clip(((xx - 380)/420)**2 + ((yy - 70)/170)**2, 0, 1)   # mais escuro nas bordas
    A = A*v[..., None]
    out = Image.fromarray(np.clip(A, 0, 255).astype(np.uint8))
    out.save(AQUI / 'banner_perfil.webp', 'WEBP', quality=82, method=6)
    print('banner', out.size, (AQUI / 'banner_perfil.webp').stat().st_size, 'bytes')


if __name__ == '__main__':
    M_let, caixa = letreiro()
    fundo(M_let)
    icones()
    banner()
    tam = {n: list(Image.open(AQUI / a).size) for n, a in [('fundo', 'fundo_lobby.webp'), ('letreiro', 'letreiro.webp'), ('icones', 'icones.webp'), ('banner', 'banner_perfil.webp')] if (AQUI / a).exists()}
    json.dump({'tam': tam, 'letreiro_na_imagem': list(map(int, caixa)), 'tampinha_na_imagem': [917, 548, 102]}, open(AQUI / 'pecas.json', 'w'), indent=1)
