"""Segue, quadro a quadro: a câmera (correlação de fase no gramado), uma tampinha (modelo recortado de um quadro) e a bola.
Uso: python3 -I trilha2.py video.mp4 saida.json T_MODELO CX CY LADO [x0 y0 x1 y1]
     T_MODELO (s), CX CY = o centro da tampinha nesse quadro, LADO = o lado do recorte (px)."""
import sys, json, cv2, numpy as np
vid, out = sys.argv[1], sys.argv[2]
tm, mcx, mcy, lado = float(sys.argv[3]), float(sys.argv[4]), float(sys.argv[5]), int(sys.argv[6])
cap = cv2.VideoCapture(vid)
W = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)); H = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
reg = [int(v) for v in sys.argv[7:11]] if len(sys.argv) >= 11 else [int(W*.18), int(H*.2), int(W*.82), int(H*.85)]
x0, y0, x1, y1 = reg
han = cv2.createHanningWindow((x1-x0, y1-y0), cv2.CV_32F)
quadros = []
while True:
    ok, img = cap.read()
    if not ok: break
    quadros.append((cap.get(cv2.CAP_PROP_POS_MSEC), img))
# o modelo da tampinha
k = min(range(len(quadros)), key=lambda i: abs(quadros[i][0] / 1000 - tm))
h2 = lado // 2
mod = quadros[k][1][int(mcy-h2):int(mcy+h2), int(mcx-h2):int(mcx+h2)].copy()
modg = cv2.cvtColor(mod, cv2.COLOR_BGR2GRAY)
def campo(img):
    g = cv2.cvtColor(img[y0:y1, x0:x1], cv2.COLOR_BGR2GRAY).astype(np.float32)
    hsv = cv2.cvtColor(img[y0:y1, x0:x1], cv2.COLOR_BGR2HSV)
    m = (cv2.inRange(hsv, (30, 50, 40), (90, 255, 255)) > 0) | (cv2.inRange(hsv, (0, 0, 200), (180, 40, 255)) > 0)
    g[~m] = g[m].mean() if m.any() else g.mean()
    return g
def acha(img, perto, raio):
    g = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    if perto is None: a, b, c, d = 0, 0, W, H
    else:
        a = int(max(0, perto[0] - raio - h2)); b = int(max(0, perto[1] - raio - h2))
        c = int(min(W, perto[0] + raio + h2)); d = int(min(H, perto[1] + raio + h2))
    if c - a <= lado or d - b <= lado: return None, 0
    r = cv2.matchTemplate(g[b:d, a:c], modg, cv2.TM_CCOEFF_NORMED)
    _, mx, _, ml = cv2.minMaxLoc(r)
    px, py = ml
    # subpixel (parábola)
    def sub(v, i, n):
        if 0 < i < n - 1:
            l, m0, rr = v[i - 1], v[i], v[i + 1]; den = l - 2 * m0 + rr
            return i + (0.5 * (l - rr) / den if den != 0 else 0)
        return i
    sx = sub(r[py, :], px, r.shape[1]); sy = sub(r[:, px], py, r.shape[0])
    return (a + sx + h2, b + sy + h2), float(mx)
def bolas(img):
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    branco = cv2.inRange(hsv, (0, 0, 170), (180, 70, 255))
    n, lab, st, cen = cv2.connectedComponentsWithStats(branco)
    cs = []
    for i in range(1, n):
        x, y, w, h, a = st[i]
        if a < 30 or a > 900 or w < 9 or h < 9 or w > 34 or h > 34 or max(w, h) / max(1, min(w, h)) > 1.45: continue
        cx, cy = x + w/2, y + h/2; r = max(w, h)/2 + 1
        roi = img[max(0, int(cy-r)):int(cy+r)+1, max(0, int(cx-r)):int(cx+r)+1]
        g = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
        esc = (g < 80).mean(); cla = (g > 170).mean(); sat = (cv2.cvtColor(roi, cv2.COLOR_BGR2HSV)[..., 1] > 90).mean()
        if 0.05 < esc < 0.45 and cla > 0.3 and sat < 0.35: cs.append((float(cx), float(cy), float(max(w, h))))
    return cs
res = []; ant = None; pos = None; bola_ant = None
for i, (t, img) in enumerate(quadros):
    c = campo(img); d = None; resp = None
    if ant is not None:
        (dx, dy), resp = cv2.phaseCorrelate(ant, c, han); d = [float(dx), float(dy)]
    ant = c
    p, s = acha(img, pos, 45)
    if s < 0.55: p, s = acha(img, None, 0)
    pos = p if s >= 0.55 else None
    cs = bolas(img); b = None
    if cs:
        ref = bola_ant if bola_ant is not None else (pos if pos is not None else (W/2, H/2))
        b = min(cs, key=lambda q: (q[0] - ref[0])**2 + (q[1] - ref[1])**2)
        if bola_ant is not None and (b[0] - bola_ant[0])**2 + (b[1] - bola_ant[1])**2 > 70**2: b = None
    bola_ant = (b[0], b[1]) if b else None
    res.append({'i': i, 't': t, 'cam': d, 'resp': None if resp is None else float(resp),
                'jog': None if p is None else [float(p[0]), float(p[1])], 'jogS': s, 'bola': list(b) if b else None})
json.dump({'W': W, 'H': H, 'reg': reg, 'modelo': {'t': tm, 'cx': mcx, 'cy': mcy, 'lado': lado}, 'q': res}, open(out, 'w'))
print(len(res), 'quadros; tampinha achada em', sum(1 for r in res if r['jog']), '; bola em', sum(1 for r in res if r['bola']))
