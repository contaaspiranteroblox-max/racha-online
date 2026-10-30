"""A tampinha seguida (trilha2.py) no mundo: a velocidade (em d/s, d = o diâmetro da tampinha em px no vídeo), as arrancadas,
as paradas e as inversões, e o que a câmera faz (a tampinha fica no meio da tela? atrasa? vai à frente?).
Uso: python3 -I movimento.py trilha.json D_PX [t0 t1]"""
import sys, json, numpy as np
d = json.load(open(sys.argv[1])); D = float(sys.argv[2]); cam2 = json.load(open(sys.argv[5]))["q"] if len(sys.argv) > 5 else None
t0 = float(sys.argv[3]) if len(sys.argv) > 3 else -1; t1 = float(sys.argv[4]) if len(sys.argv) > 4 else 1e9
q = d['q']; W, H = d['W'], d['H']
C = np.zeros(2); rows = []
for f in q:
    cc = cam2[f["i"]] if cam2 else None
    if cc is not None and cc["d"] is not None and cc["n"] >= 10:
        C = C - np.array(cc["d"]); camok = True
    elif cam2 is None and f["cam"] and f["resp"] is not None and f["resp"] > 0.08 and abs(f["cam"][0]) < 40 and abs(f["cam"][1]) < 40:
        C = C - np.array(f['cam'])
        camok = True
    else: camok = False
    t = f['t'] / 1000
    if f['jog'] and camok and t0 <= t <= t1:
        rows.append((t, f['jog'][0] + C[0], f['jog'][1] + C[1], f['jog'][0], f['jog'][1], f['jogS'], f['i']))
    else: rows.append((t, np.nan, np.nan, np.nan, np.nan, 0, f['i']))
R = np.array(rows)
t = R[:, 0]; x = R[:, 1] / D; y = R[:, 2] / D
# velocidade por diferença em ±1 quadro (central), só onde os 3 quadros existem
v = np.full(len(t), np.nan); vx = np.full(len(t), np.nan); vy = np.full(len(t), np.nan)
for i in range(1, len(t) - 1):
    if np.isfinite(x[i - 1]) and np.isfinite(x[i + 1]):
        dt = t[i + 1] - t[i - 1]
        vx[i] = (x[i + 1] - x[i - 1]) / dt; vy[i] = (y[i + 1] - y[i - 1]) / dt; v[i] = np.hypot(vx[i], vy[i])
ok = np.isfinite(v)
print('quadros com a tampinha e a câmera: %d de %d' % (ok.sum(), len(t)))
if ok.sum() < 10: sys.exit()
vs = v[ok]
print('velocidade (d/s): p50 %.2f · p75 %.2f · p90 %.2f · p95 %.2f · p99 %.2f' % tuple(np.percentile(vs, [50, 75, 90, 95, 99])))
# o "teto": a moda dos valores altos (histograma de 0,1 d/s)
alto = vs[vs > np.percentile(vs, 60)]
h, e = np.histogram(alto, bins=np.arange(0, 8, 0.1)); k = np.argmax(h)
print('teto provável (moda dos 40%% mais altos): %.2f–%.2f d/s (%d quadros)' % (e[k], e[k + 1], h[k]))
vmax = (e[k] + e[k + 1]) / 2
# arrancadas e paradas: de <15% a >85% do teto, e o contrário
ev = []
idx = np.where(ok)[0]
for a in range(len(idx) - 1):
    i = idx[a]
    if v[i] < 0.15 * vmax:
        for b in range(a + 1, min(len(idx), a + 30)):
            j = idx[b]
            if j - idx[b - 1] > 1: break
            if v[j] > 0.85 * vmax: ev.append(('arrancada', t[i], t[j] - t[i], j - i)); break
            if v[j] < 0.15 * vmax: break
    if v[i] > 0.85 * vmax:
        for b in range(a + 1, min(len(idx), a + 30)):
            j = idx[b]
            if j - idx[b - 1] > 1: break
            if v[j] < 0.15 * vmax: ev.append(('parada', t[i], t[j] - t[i], j - i)); break
            if v[j] > 0.85 * vmax: break
# inversões: a direção gira mais de 150° com a velocidade alta antes e depois
for a in range(len(idx) - 12):
    i = idx[a]
    if v[i] > 0.7 * vmax:
        for b in range(a + 2, min(len(idx), a + 15)):
            j = idx[b]
            if j - idx[b - 1] > 1: break
            if v[j] > 0.7 * vmax:
                c = (vx[i] * vx[j] + vy[i] * vy[j]) / (v[i] * v[j])
                if c < -0.87: ev.append(('inversao', t[i], t[j] - t[i], j - i)); break
# (tira as repetidas: a mesma transição achada em quadros vizinhos)
fin = []
for e_ in sorted(ev, key=lambda z: (z[0], z[1])):
    if fin and fin[-1][0] == e_[0] and e_[1] - fin[-1][1] < 0.25: continue
    fin.append(e_)
for nome in ('arrancada', 'parada', 'inversao'):
    L = [e_ for e_ in fin if e_[0] == nome]
    if L:
        dur = np.array([e_[2] for e_ in L])
        print('%-9s %2d · duração (de 15%% a 85%% do teto, %s): mediana %.3f s · mín %.3f · máx %.3f · em quadros: %s' % (nome, len(L), 'vel. alta antes e depois' if nome == 'inversao' else 'em quadros', np.median(dur), dur.min(), dur.max(), [e_[3] for e_ in L][:12]))
        print('          quando: %s' % ', '.join('%.2f' % e_[1] for e_ in L[:20]))
# a câmera: onde a tampinha fica na tela em função da velocidade
sx = R[:, 3] - W / 2; sy = R[:, 4] - H / 2
m = ok & np.isfinite(sx)
if m.sum() > 20:
    A = np.vstack([vx[m], np.ones(m.sum())]).T
    kx = np.linalg.lstsq(A, sx[m] / D, rcond=None)[0]
    A = np.vstack([vy[m], np.ones(m.sum())]).T
    ky = np.linalg.lstsq(A, sy[m] / D, rcond=None)[0]
    print('câmera: a tampinha na tela = %.3f s × vx + %.2f d (x) · %.3f s × vy + %.2f d (y)  [positivo = a tampinha à frente do centro]' % (kx[0], kx[1], ky[0], ky[1]))
    print('        desvio da tampinha em relação ao centro: p50 %.2f d · p90 %.2f d' % tuple(np.percentile(np.hypot(sx[m], sy[m]) / D, [50, 90])))
np.savez(sys.argv[1].replace('.json', '_mov.npz'), t=t, x=x, y=y, v=v, vx=vx, vy=vy)
