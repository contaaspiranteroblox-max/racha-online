"""A bola e a câmera no mundo (a câmera pelo fluxo óptico, camera2.py): os chutes (a velocidade logo depois), o freio da bola
nos trechos livres e o que a câmera segue (a tampinha, a bola ou um meio-termo).
Uso: python3 -I bola_cam.py trilha2.json camera2.json D_PX T_MAX"""
import sys, json, numpy as np
d = json.load(open(sys.argv[1])); c2 = json.load(open(sys.argv[2]))['q']; D = float(sys.argv[3]); tmax = float(sys.argv[4])
W, H = d['W'], d['H']
C = np.zeros(2); T, BX, BY, PX, PY, CX, CY = [], [], [], [], [], [], []
for f in d['q']:
    cc = c2[f['i']]
    ok = cc['d'] is not None and cc['n'] >= 10
    if ok: C = C - np.array(cc['d'])
    t = f['t'] / 1000
    T.append(t); CX.append(C[0] + W / 2 if ok else np.nan); CY.append(C[1] + H / 2 if ok else np.nan)
    if ok and f['bola'] and t <= tmax: BX.append(f['bola'][0] + C[0]); BY.append(f['bola'][1] + C[1])
    else: BX.append(np.nan); BY.append(np.nan)
    if ok and f['jog'] and t <= tmax: PX.append(f['jog'][0] + C[0]); PY.append(f['jog'][1] + C[1])
    else: PX.append(np.nan); PY.append(np.nan)
T, BX, BY, PX, PY, CX, CY = map(np.array, (T, BX, BY, PX, PY, CX, CY))
bx, by = BX / D, BY / D
# velocidade da bola em janelas de 3 quadros
vb = np.full(len(T), np.nan)
for i in range(2, len(T) - 2):
    if np.isfinite(bx[i - 2]) and np.isfinite(bx[i + 2]) and np.isfinite(bx[i]):
        vb[i] = np.hypot(bx[i + 2] - bx[i - 2], by[i + 2] - by[i - 2]) / (T[i + 2] - T[i - 2])
ok = np.isfinite(vb)
print('bola achada com câmera: %d quadros (até %.0f s)' % (ok.sum(), tmax))
print('vel. da bola (d/s): p50 %.2f · p90 %.2f · p95 %.2f · p99 %.2f · máx %.2f' % tuple(list(np.nanpercentile(vb, [50, 90, 95, 99])) + [np.nanmax(vb)]))
# os chutes: a velocidade sobe mais de 3 d/s em até 2 quadros e fica alta por 4 quadros
chutes = []
for i in range(3, len(T) - 6):
    if ok[i - 2] and ok[i + 2] and ok[i + 4] and vb[i + 2] - vb[i - 2] > 3 and min(vb[i + 2], vb[i + 3] if ok[i + 3] else 0, vb[i + 4]) > vb[i - 2] + 2.5:
        if not chutes or T[i] - chutes[-1][0] > 0.3: chutes.append((T[i], vb[i - 2], max(vb[i + 2], vb[i + 3] if ok[i + 3] else 0, vb[i + 4])))
print('saltos de velocidade (chutes ou empurrões fortes): %d' % len(chutes))
for c in chutes[:40]: print('   t=%.2f s: %.1f → %.1f d/s' % c)
# o freio: trechos de ≥ 0,5 s com a bola acima de 1,5 d/s e sem subir; ajuste exponencial
tr = []
i = 0
while i < len(T) - 1:
    if not ok[i] or vb[i] < 1.5: i += 1; continue
    j = i
    while j + 1 < len(T) and ok[j + 1] and vb[j + 1] >= 1.0 and vb[j + 1] <= vb[j] * 1.06 + 0.15: j += 1
    if T[j] - T[i] >= 0.5:
        k, l0 = np.polyfit(T[i:j + 1] - T[i], np.log(vb[i:j + 1]), 1)
        pred = np.exp(l0 + k * (T[i:j + 1] - T[i])); err = np.sqrt(np.mean((pred - vb[i:j + 1])**2)) / np.mean(vb[i:j + 1])
        tr.append((T[i], T[j], vb[i], vb[j], np.exp(k), err))
    i = j + 1
print('trechos livres da bola (≥ 0,5 s, sem subir): %d' % len(tr))
for a in tr: print('   %.2f–%.2f s: %.2f → %.2f d/s · fator por segundo %.3f (erro %.0f%%)' % (a[0], a[1], a[2], a[3], a[4], 100 * a[5]))
# o que a câmera segue: centro = a·tampinha + b·bola + c (por eixo), nos quadros com os três
for eixo, (P, B, Cc) in (('x', (PX, BX, CX)), ('y', (PY, BY, CY))):
    m = np.isfinite(P) & np.isfinite(B) & np.isfinite(Cc)
    if m.sum() > 50:
        A = np.vstack([P[m], B[m], np.ones(m.sum())]).T
        co, res, *_ = np.linalg.lstsq(A, Cc[m], rcond=None)
        r = Cc[m] - A @ co
        print('câmera %s ≈ %.2f·tampinha + %.2f·bola + c  (resíduo p90 %.2f d, %d quadros)' % (eixo, co[0], co[1], np.percentile(np.abs(r), 90) / D, m.sum()))
np.savez(sys.argv[1].replace('.json', '_bola.npz'), t=T, bx=bx, by=by, vb=vb, cx=CX / D, cy=CY / D, px=PX / D, py=PY / D)
