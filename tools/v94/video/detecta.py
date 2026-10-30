"""Detecta a bola (branca com manchas pretas) e as tampinhas (círculos) num quadro; desenha o que achou."""
import sys, cv2, numpy as np, json
def bola(img):
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    branco = cv2.inRange(hsv, (0, 0, 185), (180, 60, 255))
    n, lab, st, cen = cv2.connectedComponentsWithStats(branco)
    cands = []
    for i in range(1, n):
        x, y, w, h, a = st[i]
        if a < 25 or a > 2500 or w < 6 or h < 6: continue
        if max(w, h) / max(1, min(w, h)) > 1.5: continue
        # a bola tem manchas pretas dentro do círculo
        cx, cy = x + w / 2, y + h / 2; r = max(w, h) / 2
        roi = img[max(0, int(cy - r)):int(cy + r) + 1, max(0, int(cx - r)):int(cx + r) + 1]
        if roi.size == 0: continue
        g = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
        escuro = (g < 70).mean(); claro = (g > 185).mean()
        if escuro < 0.05 or claro < 0.25: continue
        cands.append({'x': float(cx), 'y': float(cy), 'd': float(max(w, h)), 'escuro': float(escuro), 'claro': float(claro)})
    return cands
def tampinhas(img, dmin=30, dmax=90):
    g = cv2.medianBlur(cv2.cvtColor(img, cv2.COLOR_BGR2GRAY), 5)
    cs = cv2.HoughCircles(g, cv2.HOUGH_GRADIENT, dp=1.2, minDist=dmin * .8, param1=120, param2=32, minRadius=dmin // 2, maxRadius=dmax // 2)
    return [] if cs is None else [{'x': float(c[0]), 'y': float(c[1]), 'd': float(2 * c[2])} for c in cs[0]]
if __name__ == '__main__':
    img = cv2.imread(sys.argv[1]); out = sys.argv[2]
    B = bola(img); T = tampinhas(img)
    v = img.copy()
    for b in B: cv2.circle(v, (int(b['x']), int(b['y'])), int(b['d'] / 2) + 2, (0, 0, 255), 2)
    for t in T: cv2.circle(v, (int(t['x']), int(t['y'])), int(t['d'] / 2), (255, 0, 255), 2)
    cv2.imwrite(out, v)
    print(json.dumps({'bola': B, 'tampinhas': T}))
