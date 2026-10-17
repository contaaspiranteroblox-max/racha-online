#!/usr/bin/env python3
"""RACHA rua v77 · o kit da QUADRA NOVA (o mapa principal, a Arena), tirado da imagem enviada (tools/v77/quadra_original.png:
a quadra da favela vista de cima, de dia — verde com as áreas amarelas e o círculo azul, o muro grafitado em cima, os muros
pintados e as escadas dos lados, o alambrado com o portão embaixo e as casas em volta).

O campo do jogo NÃO é a imagem esticada: as linhas, os gols e a área do jogador são os do jogo, de cada tamanho (1v1 a 4v4), e
são desenhados no jogo (tools/v77/quadra.js). Da imagem vêm as peças que não dá para desenhar bem:
  · mr_*      os pedaços do muro de cima (o RACHA com a coroa, os dois bancos cobertos, os jogadores pintados com a bandeira do
              Brasil e as bolas, e o BRASIL), cada um com a beirada esmaecida para emendar no muro desenhado;
  · lado_e/d  os muros pintados com as escadas dos lados (atrás dos gols), para repetir de cima a baixo;
  · casas_e/d as casas dos lados (fora do mapa, na Tela parada);
  · lixo, caixas  as lixeiras e as caixas de fora do alambrado;
  · tx_det    o "grão" da tinta da quadra (cinza: 128 = sem mudança), emendado nas 4 beiradas;
  · gasto0…6 os pedaços gastos da tinta verde (o cimento e as rachaduras aparecendo), com transparência: o jogo carimba
              eles espalhados pela quadra, girados (não repete um padrão);
  · fora_cima, fora_baixo  as casas e as árvores de fora (em cima do muro e embaixo do alambrado), só para a Tela parada.
A emenda das texturas é feita pelo LaMa (o modelo de apagar e completar do OpenCV Zoo, Apache 2.0), só aqui; sem o modelo,
o script mantém as texturas que já estão prontas na pasta.
Junta tudo numa imagem só (quadra_kit.webp, a que o build embute) com o mapa das peças (quadra_kit.json:
[x, y, w, h] no kit). Rodar: python3 tools/v77/quadra_kit.py   (com o LaMa: RACHA_LAMA=/caminho/inpainting_lama_2025jan.onnx)
"""
import json, os, pathlib
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage as ndi

AQUI = pathlib.Path(__file__).resolve().parent
IM = Image.open(AQUI / 'quadra_original.png').convert('RGB')           # 1672 × 941
A = np.asarray(IM).astype(np.float32)


def corte(x0, y0, x1, y1, borda=(0, 0, 0, 0)):
    """um retângulo da imagem, com as beiradas esmaecidas (esquerda, cima, direita, baixo: px de rampa)"""
    c = IM.crop((x0, y0, x1, y1)).convert('RGBA')
    w, h = c.size
    a = np.ones((h, w), np.float32)
    e, t, d, b = borda
    xx = np.arange(w)[None, :] + .5; yy = np.arange(h)[:, None] + .5
    if e: a *= np.clip(xx/e, 0, 1)
    if d: a *= np.clip((w - xx)/d, 0, 1)
    if t: a *= np.clip(yy/t, 0, 1)
    if b: a *= np.clip((h - yy)/b, 0, 1)
    a = a*a*(3 - 2*a)                                                  # (rampa suave)
    c.putalpha(Image.fromarray((a*255).astype(np.uint8)))
    return c


def copa(x0, y0, x1, y1):
    """uma copa de árvore sem o fundo: a folhagem (verde/amarelada), ligada à maior mancha, com a beirada suave"""
    C = A[y0:y1, x0:x1]
    R, G, B = C[..., 0], C[..., 1], C[..., 2]
    folha = (G > R*.88) & (G > B*1.08) & (G > 40)
    folha = ndi.binary_opening(folha, iterations=1)
    lab, n = ndi.label(ndi.binary_closing(folha, iterations=3))
    tam = ndi.sum(np.ones_like(lab), lab, range(1, n + 1)); keep = np.zeros_like(folha)
    for i in range(1, n + 1):
        if tam[i - 1] > tam.max()*.04: keep |= lab == i
    keep = ndi.binary_fill_holes(keep)
    a = Image.fromarray((keep*255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.1))
    c = Image.fromarray(C.astype(np.uint8)).convert('RGBA'); c.putalpha(a)
    return c


# ------------------------------------------------------------------ as texturas da quadra (emendadas nas beiradas)
TEX = 200                                                              # px do pedaço (na imagem): verde limpo, sem linha
def textura_base():
    x0, y0 = 527, 452
    P = np.asarray(IM.crop((x0, y0, x0 + TEX, y0 + TEX)))
    modelo = pathlib.Path(os.environ.get('RACHA_LAMA', AQUI / 'inpainting_lama_2025jan.onnx'))
    if not modelo.exists(): return None
    import onnxruntime as ort
    ort.set_default_logger_severity(3)
    so = ort.SessionOptions(); so.log_severity_level = 3
    S = ort.InferenceSession(str(modelo), so, providers=['CPUExecutionProvider'])
    W = np.roll(np.roll(P, TEX//2, axis=0), TEX//2, axis=1)            # as emendas vão para o meio (uma cruz)
    M = np.zeros((TEX, TEX), bool); k = 9
    M[:, TEX//2 - k:TEX//2 + k] = True; M[TEX//2 - k:TEX//2 + k, :] = True
    big = np.asarray(Image.fromarray(W).resize((512, 512), Image.LANCZOS)).astype(np.float32)/255
    mb = np.asarray(Image.fromarray((M*255).astype(np.uint8)).resize((512, 512))) > 20
    out = S.run(None, {'image': (big*(1 - mb[..., None])).transpose(2, 0, 1)[None].astype(np.float32), 'mask': mb.astype(np.float32)[None, None]})[0][0].transpose(1, 2, 0)
    if out.max() <= 1.5: out = out*255
    o = np.asarray(Image.fromarray(np.clip(out, 0, 255).astype(np.uint8)).resize((TEX, TEX), Image.LANCZOS))
    return np.where(M[..., None], o, W)


def texturas():
    T = textura_base()
    if T is None:
        print('texturas: sem o modelo LaMa · ficam as que já estão prontas (tx_det.png, tx_gasto.png)')
        return Image.open(AQUI / 'tx_det.png').convert('RGBA'), None
    T = T.astype(np.float32)
    R, G, B = T[..., 0], T[..., 1], T[..., 2]
    Y = R*.299 + G*.587 + B*.114
    gasto = np.clip((R/np.maximum(G, 1) - .74)/.24, 0, 1)              # onde a tinta saiu (o cimento bege aparece)
    escuro = np.clip((ndi.gaussian_filter(Y, 2.2, mode='wrap') - Y - 7)/16, 0, 1)   # as rachaduras escuras
    # o grão da tinta: a luz de cada pedaço da tinta (sem o desgaste), em volta de 128
    tinta = np.where(gasto[..., None] > .35, np.nan, T)
    Yt = np.where(gasto > .35, np.nan, Y)
    media = ndi.gaussian_filter(np.nan_to_num(Yt, nan=float(np.nanmean(Yt))), 14, mode='wrap')
    det = np.clip(128 + (np.nan_to_num(Yt, nan=0) - media)*1.9, 0, 255)
    det = np.where(np.isnan(Yt), 128, det)
    det = ndi.gaussian_filter(det, .6, mode='wrap')
    d = np.stack([det]*3 + [np.full_like(det, 255)], -1).astype(np.uint8)
    # o desgaste: o bege da imagem onde a tinta saiu; a rachadura escura por cima
    cor = np.where(gasto[..., None] > .02, T, np.array([150, 126, 98], np.float32))
    cor = cor*(1 - escuro[..., None]*.75)
    alfa = np.clip(np.maximum(gasto*.95, escuro*.8), 0, 1)
    g = np.concatenate([np.clip(cor, 0, 255), (alfa*255)[..., None]], -1).astype(np.uint8)
    Image.fromarray(d).save(AQUI / 'tx_det.png')
    print('texturas', TEX, 'px · desgaste médio %.0f%%' % (100*alfa.mean()))
    return Image.fromarray(d), Image.fromarray(g)


# ------------------------------------------------------------------ os carimbos de desgaste (a tinta verde gasta, o cimento aparecendo)
def gastos(n=7):
    x0, y0, x1, y1 = 318, 248, 1354, 706                               # (dentro das linhas de fora)
    C = A[y0:y1, x0:x1]; R, G, B = C[..., 0], C[..., 1], C[..., 2]
    verde = (G > R + 12) & (G > B + 4)
    zona = ndi.binary_closing(verde, iterations=6) & ~ndi.binary_dilation(~ndi.binary_closing(verde, iterations=6), iterations=3)   # (o verde, longe do amarelo, do azul e das linhas)
    gasto = np.clip((R/np.maximum(G, 1) - .74)/.24, 0, 1) * zona
    Y = R*.299 + G*.587 + B*.114
    racha = np.clip((ndi.gaussian_filter(Y, 2.2) - Y - 7)/16, 0, 1) * zona
    alfa = np.clip(np.maximum(gasto*.95, racha*.75), 0, 1)
    dens = ndi.gaussian_filter(alfa, 10)
    lab, k = ndi.label(dens > .06)
    objs = ndi.find_objects(lab)
    caixas = sorted(((float(alfa[objs[i - 1]][lab[objs[i - 1]] == i].sum()), objs[i - 1]) for i in range(1, k + 1)), key=lambda t: -t[0])
    alonga = lambda o: max(o[0].stop - o[0].start, o[1].stop - o[1].start)/max(1, min(o[0].stop - o[0].start, o[1].stop - o[1].start))
    caixas = [c for c in caixas if alonga(c[1]) < 2.2][:n]             # (as compridas e finas são sobra das linhas brancas, não desgaste)
    out = []
    for _, (sy, sx) in caixas:
        a0, a1 = max(0, sy.start - 10), min(alfa.shape[0], sy.stop + 10); b0, b1 = max(0, sx.start - 10), min(alfa.shape[1], sx.stop + 10)
        al = alfa[a0:a1, b0:b1]; cor = C[a0:a1, b0:b1]
        h, w = al.shape; yy, xx = np.mgrid[0:h, 0:w]
        borda = np.clip(np.minimum(np.minimum(xx, w - 1 - xx), np.minimum(yy, h - 1 - yy))/8, 0, 1)
        cor = np.where((gasto[a0:a1, b0:b1] > .05)[..., None], cor, np.array([150, 126, 98], np.float32)) * (1 - racha[a0:a1, b0:b1][..., None]*.7)
        im = np.concatenate([np.clip(cor, 0, 255), (al*borda*255)[..., None]], -1).astype(np.uint8)
        out.append(Image.fromarray(im))
    print('desgaste:', len(out), 'carimbos', [o.size for o in out])
    return out


# ------------------------------------------------------------------ as peças
def pecas():
    P = {}
    # o muro de cima: os pedaços (a altura toda do muro: da coroa até o pé, com um tico do chão)
    MY0, MY1 = 117, 212
    for nome, x0, x1 in (('mr_racha', 262, 478), ('mr_banco', 497, 671), ('mr_meio', 668, 1006), ('mr_banco2', 1001, 1176), ('mr_brasil', 1172, 1347)):
        P[nome] = corte(x0, MY0, x1, MY1, (14, 0, 14, 9))
    # os lados (atrás dos gols): o muro pintado e a escada, de cima a baixo
    P['lado_e'] = corte(92, 128, 217, 630, (0, 10, 0, 10))
    P['lado_d'] = corte(1456, 128, 1583, 630, (0, 10, 0, 10))
    P['casas_e'] = corte(0, 0, 92, 941)
    P['casas_d'] = corte(1583, 0, 1672, 941)
    # de fora do mundo (só na Tela parada): as casas e as árvores em cima do muro e embaixo do alambrado
    P['fora_cima'] = corte(0, 0, 1672, 112, (0, 0, 0, 8))
    P['fora_baixo'] = corte(0, 806, 1672, 941, (0, 8, 0, 0))
    # de fora do alambrado: as lixeiras e as caixas
    P['lixo'] = corte(626, 800, 778, 856, (6, 6, 6, 6))
    P['caixas'] = corte(898, 800, 1052, 856, (6, 6, 6, 6))
    d, g = texturas()
    P['tx_det'] = d
    for i, c in enumerate(gastos()): P['gasto%d' % i] = c
    return P


MENOR = {'fora_cima': .6, 'fora_baixo': .6, 'casas_e': .6, 'casas_d': .6}   # (as de fora do mundo aparecem pequenas: vão menores no kit)
if __name__ == '__main__':
    P = pecas()
    for n, f in MENOR.items(): P[n] = P[n].resize((round(P[n].width*f), round(P[n].height*f)), Image.LANCZOS)
    larg = 1700; x = y = alt = 0; rects = {}; pos = []
    for n, p in P.items():
        if x + p.width > larg: x, y, alt = 0, y + alt + 2, 0
        rects[n] = [x, y, p.width, p.height]; pos.append((p, x, y)); x += p.width + 2; alt = max(alt, p.height)
    kit = Image.new('RGBA', (larg, y + alt), (0, 0, 0, 0))
    for p, px, py in pos: kit.alpha_composite(p, (px, py))
    kit.save(AQUI / 'quadra_kit.webp', 'WEBP', quality=82, alpha_quality=88, method=6)
    rects['_esc'] = MENOR                                              # (px do kit por px da imagem, nas peças que foram menores)
    json.dump(rects, open(AQUI / 'quadra_kit.json', 'w'), indent=1)
    print('kit', kit.size, (AQUI / 'quadra_kit.webp').stat().st_size, 'bytes ·', len(rects), 'peças')
