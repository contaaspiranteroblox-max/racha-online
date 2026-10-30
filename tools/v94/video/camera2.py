"""O deslocamento da câmera entre quadros pelo fluxo óptico de cantos do cenário (linhas, tijolos, cerca, a grama), fora das
caixas do HUD (que ficam paradas na tela) e fora das tampinhas que andam: a mediana dos deslocamentos, refinada pelos que
concordam com ela (os que não concordam são os bonecos e a bola).
Uso: python3 -I camera2.py video.mp4 saida.json "x0,y0,x1,y1;..." (as caixas do HUD a excluir)"""
import sys, json, cv2, numpy as np
vid, out = sys.argv[1], sys.argv[2]
caixas = [tuple(int(v) for v in c.split(',')) for c in sys.argv[3].split(';')] if len(sys.argv) > 3 and sys.argv[3] else []
cap = cv2.VideoCapture(vid)
W = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)); H = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
masc = np.full((H, W), 255, np.uint8)
for (a, b, c, d) in caixas: masc[b:d, a:c] = 0
res = []; ant = None; i = 0
while True:
    ok, img = cap.read()
    if not ok: break
    t = cap.get(cv2.CAP_PROP_POS_MSEC)
    g = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    reg = {'i': i, 't': t, 'd': None, 'n': 0, 'esp': None}
    if ant is not None:
        p0 = cv2.goodFeaturesToTrack(ant, maxCorners=500, qualityLevel=0.01, minDistance=7, mask=masc, blockSize=7)
        if p0 is not None and len(p0) >= 12:
            p1, st, err = cv2.calcOpticalFlowPyrLK(ant, g, p0, None, winSize=(21, 21), maxLevel=3,
                                                   criteria=(cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 30, 0.01))
            if p1 is not None:
                ok_ = st.ravel() == 1
                dd = (p1 - p0).reshape(-1, 2)[ok_]
                if len(dd) >= 12:
                    m = np.median(dd, axis=0)
                    for _ in range(3):
                        dist = np.hypot(*(dd - m).T); inl = dd[dist < 1.5]
                        if len(inl) < 8: break
                        m = inl.mean(axis=0)
                    reg['d'] = [float(m[0]), float(m[1])]; reg['n'] = int(len(inl)) if len(inl) >= 8 else 0
                    reg['esp'] = float(np.std(np.hypot(*(inl - m).T))) if len(inl) >= 8 else None
    res.append(reg); ant = g; i += 1
json.dump({'W': W, 'H': H, 'caixas': caixas, 'q': res}, open(out, 'w'))
n = [r['n'] for r in res if r['d']]
print(len(res), 'quadros · com câmera:', len(n), '· inliers mediana', int(np.median(n)) if n else 0)
