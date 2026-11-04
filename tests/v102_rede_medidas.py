"""RACHA v102 · AS MEDIDAS DO ONLINE LISO (não é teste de passa/falha: mede e grava num JSON).

Sobe o servidor das salas de verdade gravando a VERDADE (tests/v102/servidor_verdade.cjs: a cada passo do motor, a bola e as
tampinhas com o instante) e, entre ele e os dois navegadores, o "4G de mentira" (tests/v92_proxy.cjs: o atraso em cada sentido,
a oscilação na ordem do TCP, os picos do rádio do celular e as rajadas). Os dois jogam uma partida de verdade numa sala 1v1
(5 minutos, sem limite de gols): cada um com um "dedo" de mentira que decide pelo que a própria tela mostra (correr em
zigue-zague, ir na bola, conduzir, chutar, parar). Na tela da Ana (A), a cada quadro desenhado, grava onde foram desenhadas a
tampinha dela, a do Beto (B, a de fora) e a bola, e mede:
  · d2 (px): a 2ª diferença do desenho (a mudança de velocidade de um quadro para o outro, normalizada para 60 Hz) — o tranco;
  · pulos/min: quadros em que o desenho anda mais que 2,5 × a mediana dos passos em volta (com a coisa andando);
  · rapidos/min: quadros mais rápidos que 1,5 × a velocidade máxima de verdade (a tampinha ou a bola nunca andam assim);
  · paradas/min: quadros parados (menos de 15% do passo em volta) com a coisa andando;
  · a correção da própria tampinha (o pulo da previsão em cada quadro do servidor, e o deslize que fica na tela);
  · o atraso e o erro do desenho contra a verdade do servidor (o melhor atraso L* e o erro com ele: o formato do caminho).
Condições (--redes): direto (sem proxy), 4g e 4g_ruim (ver REDES). --cliente chave=valor põe chaves no RACHA_CONFIG dos dois
navegadores (ex.: --cliente rede102=false mede o desenho de antes no mesmo build).
Uso: python3 tests/v102_rede_medidas.py [--redes direto,4g,4g_ruim] [--dur 60] [--semente 1] [--rotulo X] [--cliente k=v ...]
       [--quadros 60] [--bruto] [saida.json]"""
import asyncio, json, math, os, subprocess, sys, time, statistics as st, pathlib, tempfile, bisect
from comum import rt, async_playwright, FONTES, HARNESS, CHROME
from online_test import porta_livre, espera

AQUI = pathlib.Path(__file__).resolve().parent
RAIZ = AQUI.parent


def argv(n, d):
    return sys.argv[sys.argv.index('--' + n) + 1] if '--' + n in sys.argv else d


# as condições da internet (em cada sentido): o atraso, a oscilação (±, por pedaço, na ordem do TCP), os picos do rádio (nada
# passa por pico ms, em média a cada pico_cada ms, os dois sentidos do aparelho juntos) e as rajadas (a chance de um pedaço
# ficar parado mais 10..rajada_ms ms, com os de trás chegando juntos)
REDES = {
    'direto': None,
    '4g': dict(atraso=50, oscila=30, pico=150, pico_cada=4000, rajada=0.03, rajada_ms=40),
    '4g_ruim': dict(atraso=80, oscila=30, pico=150, pico_cada=2000, rajada=0.08, rajada_ms=50),
}
FILA = argv('fila', None)    # (RACHA_FILA do servidor: v96 = a fila de antes, v102 = o colchão)
VEL_JOG = 14.1 * 19          # px/s (a corrida da tampinha)
VEL_BOLA = 46.75 * 19        # px/s (o teto da bola)
QUADRO = 1000 / 60

# ---------------------------------------------------------------------------------------------------- o que roda no navegador
# o dedo de mentira (os dois aparelhos): decide a cada quadro da tela pelo que ela mostra; a semente deixa o roteiro repetível
DEDO = r"""((papel, semente) => {
  let a = semente >>> 0; const r = () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const S = window.__DEDO = {papel, on:false, missao:null, fim:0, dir:[1, 0], troca:0, toqueT:0, toque:null, parado:0, finta:0, chutes:0, missoes:{}};
  const raio = () => JOY.max*hud.joy.al;
  const poe = (mx, my) => { const l = Math.hypot(mx, my); if (!(l > 1e-6)){ joy.id = null; joy.dx = joy.dy = 0; return; } joy.id = 77; joy.dx = mx/l*raio(); joy.dy = my/l*raio(); };
  const toca = tipo => { S.toque = {tipo, resta:3}; if (tipo === 'P') BOTAO.kickL = true; else BOTAO.powerL = true; S.chutes++; };
  const dedos = () => { keys.KeyJ = keys.KeyK = false; if (!S.toque) return; if (S.toque.tipo === 'P') keys.KeyJ = true; else keys.KeyK = true; if (--S.toque.resta <= 0) S.toque = null; };
  function decideA(t, eu, bola, alvoX){                  // a Ana: zigue-zague, vai na bola e conduz para o gol, persegue, para
    if (!S.missao || t > S.fim){
      const ms = ['zigue', 'bola', 'zigue', 'bola', 'persegue', 'parado'];
      S.missao = ms[Math.floor(r()*ms.length)]; S.fim = t + (S.missao === 'parado' ? 900 + r()*500 : 3000 + r()*3000); S.troca = 0;
      S.missoes[S.missao] = (S.missoes[S.missao] | 0) + 1;
    }
    if (S.missao === 'parado') return [0, 0];
    if (S.missao === 'zigue'){
      if (t > S.troca){ const g = r()*Math.PI*2; S.dir = [Math.cos(g), Math.sin(g)]; S.troca = t + 220 + r()*450; }
      let [mx, my] = S.dir;
      if ((eu.x < GL + U(6) && mx < 0) || (eu.x > GR - U(6) && mx > 0)) mx = -mx;
      if ((eu.y < GT + U(6) && my < 0) || (eu.y > GB - U(6) && my > 0)) my = -my;
      S.dir = [mx, my]; return [mx, my];
    }
    if (S.missao === 'persegue') return [bola.x - eu.x, bola.y - eu.y];
    const ux = alvoX - bola.x, uy = CY - bola.y, ul = Math.hypot(ux, uy) || 1, off = R_JOG + R_BOLA + U(0.4);   // 'bola': por trás dela
    const ax = bola.x - ux/ul*off, ay = bola.y - uy/ul*off, d = Math.hypot(ax - eu.x, ay - eu.y);
    const dB = Math.hypot(bola.x - eu.x, bola.y - eu.y);
    if (dB < ALCANCE_CHUTE + U(0.5) && t > S.toqueT && (Math.hypot(alvoX - bola.x, CY - bola.y) < U(28) || r() < 0.01)){ toca(r() < 0.6 ? 'P' : 'K'); S.toqueT = t + 900; }
    return d > U(1.2) ? [ax - eu.x, ay - eu.y] : [ux, uy];
  }
  function decideB(t, eu, bola, alvoX){                  // o Beto: vai na bola e leva para o gol dele, com fintas, toques e paradas
    if (t < S.parado) return [0, 0];
    if (t > S.troca){ S.finta = (r() - 0.5)*1.2; S.troca = t + 300 + r()*700; if (r() < 0.08) S.parado = t + 400 + r()*500; }
    const ux = alvoX - bola.x, uy = CY - bola.y, ul = Math.hypot(ux, uy) || 1, off = R_JOG + R_BOLA + U(0.3);
    let dx = bola.x - ux/ul*off - eu.x, dy = bola.y - uy/ul*off - eu.y; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
    const c = Math.cos(S.finta), s = Math.sin(S.finta);
    if (Math.hypot(bola.x - eu.x, bola.y - eu.y) < ALCANCE_CHUTE + U(0.4) && t > S.toqueT && r() < 0.25){ toca(r() < 0.5 ? 'P' : 'K'); S.toqueT = t + 700 + r()*900; }
    return [dx*c - dy*s, dx*s + dy*c];
  }
  function decide(t){
    if (!S.on || !NET49.playing || !RQ.on || NET49.localSlot < 0 || (RQ.estado !== 'jogo' && RQ.estado !== 'saida')){ poe(0, 0); return; }
    const eu = {x:VIS.px, y:VIS.py}, bola = {x:VIS.bx, y:VIS.by}, alvoX = (P.time | 0) === 0 ? LX1 : LX0;
    const d = (papel === 'A' ? decideA : decideB)(t, eu, bola, alvoX);
    poe(d[0], d[1]);
  }
  const frameAntes = frame;
  frame = function(now){
    window.__raf = now;
    try { decide(performance.now()); dedos(); } catch (e) { S.erro = String(e && e.stack || e); }
    return frameAntes.apply(this, arguments);
  };
  return 1;
})"""

# a gravação (na Ana): o desenho de cada quadro e cada quadro do servidor que chegou (com as correções da previsão)
GRAVA = r"""(() => {
  const R = window.__REC = {on:false, f:[], s:[], erro:null};
  const ep = () => performance.timeOrigin + performance.now();
  const outro = () => RQ.jog.find(q => q && q !== P);
  const nv = v => (typeof v === 'number' && isFinite(v)) ? Math.round(v*100)/100 : null;
  const temR = () => typeof V96R !== 'undefined';
  const renderAntes = render;
  render = function(dt){
    if (R.on) try {
      const a = VIS.a == null ? 1 : VIS.a, o = outro(), oi = o ? RQ.jog.indexOf(o) : -1;
      const ox = o ? o.ax + (o.x - o.ax)*a + (o.ex || 0) : null, oy = o ? o.ay + (o.y - o.ay)*a + (o.ey || 0) : null;
      const M = (typeof V92N !== 'undefined' && V92N.on) ? V92N.M : null, eu = M ? M.jog[V92N.slot] : null, ou = M && oi >= 0 ? M.jog[oi] : null;
      const dj = temR() && oi >= 0 && V96R.J[oi] ? V96R.J[oi] : null;
      const ex = typeof window.__v102Extra === 'function' ? window.__v102Extra() : null;
      R.f.push([nv(ep()), nv(window.__raf || 0), nv(VIS.px), nv(VIS.py), nv(ox), nv(oy), nv(VIS.bx), nv(VIS.by), RQ.estado, NET49.lastTick, M ? V92N.pend.length : -1,
        temR() ? nv(V96R.P.x) : 0, temR() ? nv(V96R.P.y) : 0, eu ? nv(eu.x) : null, eu ? nv(eu.y) : null, ou ? nv(ou.x) : null, ou ? nv(ou.y) : null,
        M ? nv(M.B.x) : null, M ? nv(M.B.y) : null, nv(acc), NET49.seq, dj ? nv(dj.x) : 0, dj ? nv(dj.y) : 0, temR() ? nv(V96R.B.x) : 0, temR() ? nv(V96R.B.y) : 0,
        nv(cam.z), ex]);
    } catch (e) { R.erro = String(e && e.stack || e); }
    if (R.semPintar) return;
    return renderAntes.apply(this, arguments);
  };
  const snapAntes = net49Snapshot;
  net49Snapshot = function(s){
    const M = (typeof V92N !== 'undefined' && V92N.on) ? V92N.M : null, o = outro(), oi = o ? RQ.jog.indexOf(o) : -1;
    const novo = !!(s && s.tick > NET49.lastTick), t = ep();
    const antes = M && oi >= 0 && M.jog[oi] ? [M.jog[oi].x, M.jog[oi].y, M.tick] : null;
    const r = snapAntes.apply(this, arguments);
    if (R.on && novo) try {
      const c = V92.med.corr, cb = V92.med.corrB || [], M2 = (typeof V92N !== 'undefined' && V92N.on) ? V92N.M : null;
      const dj = antes && M2 && M2.jog[oi] ? Math.hypot(antes[0] - M2.jog[oi].x, antes[1] - M2.jog[oi].y) : null;
      const pl = s.players && s.players[NET49.localSlot];
      R.s.push([nv(t), s.tick, c.length ? nv(c[c.length - 1]) : null, cb.length ? nv(cb[cb.length - 1]) : null, nv(dj), M2 ? V92N.pend.length : -1, pl ? pl[4] : -1, antes && M2 ? M2.tick - antes[2] : null, NET49.seq, s.state]);
    } catch (e) { R.erro = String(e && e.stack || e); }
    return r;
  };
  return 1;
})()"""


async def sessao(pw, url, nome, ws, extra):
    b = await pw.chromium.launch(executable_path=CHROME, args=['--no-sandbox', '--autoplay-policy=no-user-gesture-required'])
    ctx = await b.new_context(viewport={'width': 1280, 'height': 720}, has_touch=True)
    await ctx.add_init_script("document.addEventListener('DOMContentLoaded',()=>{const s=document.createElement('style');s.textContent=%s;document.head.prepend(s);});" % json.dumps(FONTES))
    cfg = dict({'servidor': ws, 'presente': False}, **extra)
    await ctx.add_init_script("window.RACHA_CONFIG = Object.assign(window.RACHA_CONFIG || {}, %s);" % json.dumps(cfg))
    await ctx.add_init_script("try{if(!localStorage.getItem('racha-treino-perfil-v1'))localStorage.setItem('racha-treino-perfil-v1', JSON.stringify({nome:%s, st:{partidas:3, concluidas:3}}));}catch(e){}" % json.dumps(nome))
    pg = await ctx.new_page()
    pg.erros = []
    pg.on('pageerror', lambda e: pg.erros.append(str(e)[:300]))
    pg.on('console', lambda m: pg.erros.append('console: ' + m.text[:200]) if m.type == 'error' else None)
    await pg.goto(url)
    await pg.wait_for_function('() => typeof window.__RT === "function"', polling=100, timeout=30000)
    await pg.wait_for_timeout(700)
    await pg.evaluate("(() => { const o = document.getElementById('onb'); if (o) o.hidden = true; })()")
    await rt(pg, "(() => { if (typeof v84Fecha === 'function') v84Fecha(); return 1; })()")
    await rt(pg, HARNESS)
    await rt(pg, "(() => { filaPop.length = 0; if (!LB.pop.hidden) fechaPop(); return true; })()")
    pg.b = b
    return pg


# ---------------------------------------------------------------------------------------------------- as contas
def p(xs, q):
    if not xs:
        return None
    s = sorted(xs)
    return s[min(len(s) - 1, int(q * (len(s) - 1) + 0.5))]


def rms(xs):
    return math.sqrt(sum(x * x for x in xs) / len(xs)) if xs else None


def r2(v, n=2):
    return None if v is None else round(v, n)


def mediana_movel(xs, meia):
    out = []
    for i in range(len(xs)):
        j0, j1 = max(0, i - meia), min(len(xs), i + meia + 1)
        out.append(st.median(xs[j0:j1]))
    return out


def trechos(fr, margem_ms=500):
    """os pedaços seguidos de quadros com a partida rolando ('jogo'), sem o meio segundo depois de cada recomeço"""
    seg, cur, t_ini = [], [], None
    for f in fr:
        if f[8] == 'jogo' and f[2] is not None:
            if t_ini is None:
                t_ini = f[0]
            if f[0] - t_ini >= margem_ms:
                cur.append(f)
        else:
            if len(cur) > 10:
                seg.append(cur)
            cur, t_ini = [], None
    if len(cur) > 10:
        seg.append(cur)
    return seg


def mede_objeto(segs, ix, iy, vmax):
    """o tranco, os pulos, os rápidos e as paradas do desenho de uma coisa (ix, iy: as colunas da gravação)"""
    d2, saltos, rapidos, paradas, n_mov, n_tot, passos_mov = [], 0, 0, 0, 0, 0, []
    for s in segs:
        ts = [f[1] for f in s]; xs = [f[ix] for f in s]; ys = [f[iy] for f in s]
        if any(v is None for v in xs + ys):
            continue
        dt = [ts[i] - ts[i - 1] for i in range(1, len(ts))]
        passo = [math.hypot(xs[i] - xs[i - 1], ys[i] - ys[i - 1]) for i in range(1, len(xs))]
        norm = [passo[i] * QUADRO / dt[i] if dt[i] > 1 else passo[i] for i in range(len(passo))]   # (o passo de um quadro de 60 Hz)
        med = mediana_movel(norm, 15)
        for i in range(len(norm)):
            n_tot += 1
            if not (8 < dt[i] < 40):
                continue
            mov = med[i] > 0.67                            # (andando: mais que 40 px/s em volta)
            if not mov:
                continue
            n_mov += 1; passos_mov.append(norm[i])
            if norm[i] > 2.5 * med[i] and norm[i] > 2:
                saltos += 1
            if norm[i] * 60 > 1.5 * vmax:
                rapidos += 1
            if norm[i] < 0.15 * med[i] and med[i] > 1.5:
                paradas += 1
            if i + 1 < len(norm) and 12 < dt[i] < 22 and 12 < dt[i + 1] < 22:
                v1 = ((xs[i + 1] - xs[i]) / dt[i], (ys[i + 1] - ys[i]) / dt[i])
                v2 = ((xs[i + 2] - xs[i + 1]) / dt[i + 1], (ys[i + 2] - ys[i + 1]) / dt[i + 1])
                d2.append(math.hypot(v2[0] - v1[0], v2[1] - v1[1]) * QUADRO)
    minutos = max(1e-9, n_tot * QUADRO / 60000)
    return {'d2_rms_px': r2(rms(d2)), 'd2_p99_px': r2(p(d2, .99)), 'pulos_min': r2(saltos / minutos, 1), 'rapidos_min': r2(rapidos / minutos, 1),
            'paradas_min': r2(paradas / minutos, 1), 'passo_med_px': r2(st.median(passos_mov) if passos_mov else None), 'quadros_andando_%': r2(100 * n_mov / max(1, n_tot), 1)}


class Verdade:
    """o caminho de verdade (o servidor): a posição de cada coisa num instante (ms desde 1970), entre dois passos"""
    def __init__(self, linhas):
        # o instante de cada passo é o da conta no relógio de verdade (o motor acorda atrasado e alcança uns passos de uma vez
        # quando a máquina está ocupada, e depois de 5 passos de atraso pula o resto): a simulação é em passos de 1/60 s, então o
        # caminho de verdade usa o instante ideal do passo — o envelope de baixo do atraso de cada passo (o menor atraso nos 30
        # passos seguintes: o motor nunca adianta um passo; quando ele pula passos, o envelope sobe junto)
        self.L = linhas
        d = [l['t'] - l['k'] * QUADRO for l in linhas]
        n = len(d); base = [0.0] * n; m = float('inf'); fila = []
        for i in range(n - 1, -1, -1):                     # (o mínimo da janela [i, i + 30], de trás para a frente)
            while fila and d[fila[-1]] >= d[i]:
                fila.pop()
            fila.append(i)
            while fila[0] > i + 30:
                fila.pop(0)
            base[i] = d[fila[0]]
        self.t = [base[i] + linhas[i]['k'] * QUADRO for i in range(n)]
        for i in range(1, n):                              # (sempre em ordem)
            if self.t[i] <= self.t[i - 1]:
                self.t[i] = self.t[i - 1] + 0.01

    def pos(self, t, quem):
        i = bisect.bisect_left(self.t, t)
        if i <= 0 or i >= len(self.t):
            return None
        a, b = self.L[i - 1], self.L[i]
        if a['e'] != 'jogo' or b['e'] != 'jogo':
            return None
        u = (t - self.t[i - 1]) / max(1e-6, self.t[i] - self.t[i - 1])
        pa = a['b'] if quem == 'b' else a['j'][quem]; pb = b['b'] if quem == 'b' else b['j'][quem]
        return (pa[0] + (pb[0] - pa[0]) * u, pa[1] + (pb[1] - pa[1]) * u)


def contra_verdade(segs, V, ix, iy, quem):
    """o melhor atraso L* (ms: o desenho mostra a verdade de L ms atrás; negativo = à frente) e o erro com ele (px)"""
    amostra = [f for s in segs for f in s[::3] if f[ix] is not None]
    if not amostra or not V:
        return {}
    def erro(L):
        es = []
        for f in amostra:
            q = V.pos(f[0] - L, quem)
            if q:
                es.append(math.hypot(f[ix] - q[0], f[iy] - q[1]))
        return es
    melhor = None
    for L in range(-250, 401, 10):
        es = erro(L)
        if len(es) > 50:
            m = st.mean(es)
            if melhor is None or m < melhor[1]:
                melhor = (L, m, es)
    e0 = erro(0)
    if not melhor:
        return {}
    return {'atraso_ms': melhor[0], 'erro_med_px': r2(melhor[1], 1), 'erro_p95_px': r2(p(melhor[2], .95), 1), 'erro_agora_med_px': r2(st.mean(e0), 1) if e0 else None}


def tempo_tela(fr):
    """o instante (ms desde 1970) de cada quadro da tela: o do requestAnimationFrame (o vsync) + o timeOrigin da página — estimado
    como a menor diferença entre o instante do desenho e o do quadro (o desenho acontece uns ms depois, variando)"""
    dif = [f[0] - f[1] for f in fr if f[1]]
    if not dif:
        return
    origem = min(dif)
    for f in fr:
        if f[1]:
            f[0] = f[1] + origem


def analisa(fr, snaps, verdade, slots):
    tempo_tela(fr)
    segs = trechos(fr)
    V = Verdade([l for l in verdade if 'j' in l]) if verdade else None
    eu, outro = slots
    res = {'quadros': sum(len(s) for s in segs)}
    dts = [fr[i][1] - fr[i - 1][1] for i in range(1, len(fr)) if fr[i][1] and fr[i - 1][1]]
    res['tela'] = {'intervalo_med_ms': r2(st.mean(dts)) if dts else None, 'intervalo_p95_ms': r2(p(dts, .95)), 'quadros_>25ms_%': r2(100 * sum(1 for d in dts if d > 25) / max(1, len(dts)), 1)}
    res['eu'] = mede_objeto(segs, 2, 3, VEL_JOG)
    res['outro'] = mede_objeto(segs, 4, 5, VEL_JOG)
    res['bola'] = mede_objeto(segs, 6, 7, VEL_BOLA)
    if V:
        res['eu'].update(contra_verdade(segs, V, 2, 3, eu))
        res['outro'].update(contra_verdade(segs, V, 4, 5, outro))
        res['bola'].update(contra_verdade(segs, V, 6, 7, 'b'))
        # a referência: o caminho de verdade (o servidor) amostrado nos mesmos quadros, com o mesmo atraso — o que uma tela
        # perfeita (a verdade atrasada, sem erro nenhum) mostraria. O que passar disto é o desenho; o resto é o caminho do servidor.
        ref = {}
        for nome, quem in (('eu', eu), ('outro', outro), ('bola', 'b')):
            L = res[nome].get('atraso_ms') or 0
            sv = []
            for s in segs:
                cur = []
                for f in s:
                    q = V.pos(f[0] - L, quem)
                    if q is None:
                        if len(cur) > 10:
                            sv.append(cur)
                        cur = []
                        continue
                    g = list(f); g[2] = g[4] = g[6] = q[0]; g[3] = g[5] = g[7] = q[1]
                    cur.append(g)
                if len(cur) > 10:
                    sv.append(cur)
            m = mede_objeto(sv, 2, 3, VEL_BOLA if quem == 'b' else VEL_JOG)
            ref[nome] = {k: m[k] for k in ('d2_rms_px', 'pulos_min', 'rapidos_min', 'paradas_min')}
        res['verdade_nos_quadros'] = ref
    # a correção da própria tampinha: o pulo da previsão em cada quadro do servidor e o deslize que fica na tela
    sj = [s for s in snaps if s[9] == 'jogo']
    cP = [s[2] for s in sj if s[2] is not None]; cB = [s[3] for s in sj if s[3] is not None]; cJ = [s[4] for s in sj if s[4] is not None]
    off = [math.hypot(f[11] or 0, f[12] or 0) for s in segs for f in s]
    res['eu'].update({'correcao_med_px': r2(st.mean(cP)) if cP else None, 'correcao_p95_px': r2(p(cP, .95)), 'correcao_max_px': r2(max(cP) if cP else None),
                      'correcoes_>1px_%': r2(100 * sum(1 for c in cP if c > 1) / max(1, len(cP)), 1), 'deslize_tela_p95_px': r2(p(off, .95)), 'deslize_tela_max_px': r2(max(off) if off else None)})
    res['outro'].update({'correcao_med_px': r2(st.mean(cJ)) if cJ else None, 'correcao_p95_px': r2(p(cJ, .95))})
    res['bola'].update({'correcao_med_px': r2(st.mean(cB)) if cB else None, 'correcao_p95_px': r2(p(cB, .95))})
    # os quadros do servidor: a chegada (o intervalo entre eles) e o atraso de verdade (o envio no servidor → a chegada aqui)
    envio = {l['k']: l['t'] for l in verdade if l.get('s')} if verdade else {}
    lat = [s[0] - envio[s[1]] for s in snaps if s[1] in envio]
    chg = [snaps[i][0] - snaps[i - 1][0] for i in range(1, len(snaps))]
    saltos = [s[7] for s in sj if s[7] is not None]        # (o tempo do mundo previsto pulando no quadro: passos a mais ou a menos)
    res['quadros_servidor'] = {'n': len(snaps), 'atraso_med_ms': r2(st.mean(lat), 1) if lat else None, 'atraso_p95_ms': r2(p(lat, .95), 1), 'atraso_max_ms': r2(max(lat) if lat else None, 1),
                               'intervalo_p95_ms': r2(p(chg, .95), 1), 'juntos_<5ms_%': r2(100 * sum(1 for c in chg if c < 5) / max(1, len(chg)), 1),
                               'fila_previsao_med': r2(st.mean([s[5] for s in snaps if s[5] >= 0]), 1) if snaps else None,
                               'saltos_tempo_%': r2(100 * sum(1 for x in saltos if x) / max(1, len(saltos)), 1)}
    # a fila de comandos no servidor (a da Ana): vazia (o servidor no palpite) e o tamanho
    if verdade:
        fj = [l['j'][eu] for l in verdade if l.get('e') == 'jogo' and 'j' in l]
        if fj:
            palp = sum(1 for i in range(1, len(fj)) if fj[i][2] > fj[i][4] and fj[i][2] != fj[i - 1][2])
            res['fila_servidor'] = {'tamanho_med': r2(st.mean([x[3] for x in fj]), 2), 'vazia_%': r2(100 * sum(1 for x in fj if x[3] == 0) / len(fj), 1),
                                    'palpites_%': r2(100 * palp / len(fj), 1)}
    return res


# ---------------------------------------------------------------------------------------------------- uma medida
async def uma(pw, rede, dur, semente, extra, quadros, cfg92=None, env_extra=None):
    tmp = pathlib.Path(tempfile.mkdtemp(prefix='v102_'))
    arq_v = tmp / 'verdade.jsonl'
    porta = porta_livre()
    env = dict(os.environ, RACHA_VERDADE=str(arq_v), **(env_extra or {}))
    if quadros == 60:
        env['RACHA_EXPERIMENTAL'] = '1'
    if FILA:
        env['RACHA_FILA'] = FILA
    srv = subprocess.Popen(['node', str(AQUI / 'v102' / 'servidor_verdade.cjs'), '--porta', str(porta), '--host', '127.0.0.1', '--memoria',
                            '--estaticos', str(RAIZ), '--nome', 'Medidas v102', '--sem-p2p'], stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, env=env)
    prx = None
    ws = 'ws://127.0.0.1:%d' % porta
    if REDES[rede]:
        c = REDES[rede]; pproxy = porta_livre()
        prx = subprocess.Popen(['node', str(AQUI / 'v92_proxy.cjs'), '--porta', str(pproxy), '--destino', str(porta), '--atraso', str(c['atraso']), '--oscila', str(c['oscila']),
                                '--pico', str(c['pico']), '--pico-cada', str(c['pico_cada']), '--rajada', str(c['rajada']), '--rajada-ms', str(c['rajada_ms']),
                                '--semente', str(semente), '--estat'], stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
        ws = 'ws://127.0.0.1:%d' % pproxy
    time.sleep(1.0)
    url = 'http://127.0.0.1:%d/tests/build/racha_teste.html' % porta
    sess, out = [], {'rede': rede, 'condicao': REDES[rede], 'semente': semente, 'dur_s': dur, 'cliente': extra, 'cfg92': cfg92 or {}, 'quadros': quadros, 'fila': FILA,
                     'servidor_env': env_extra or {}, 'carga_antes': [round(x, 2) for x in os.getloadavg()]}
    fr = snaps = None
    try:
        A = await sessao(pw, url, 'Ana', ws, extra); Bp = await sessao(pw, url, 'Beto', ws, extra); sess += [A, Bp]
        if cfg92:                                          # (as escolhas da v92 nos dois: ex. bolaPrev=misto)
            for pg in (A, Bp):
                await rt(pg, "(() => { V92.cfg = v92Limpa(Object.assign({}, V92.cfg, %s)); v92Aplica(); return 1; })()" % json.dumps(cfg92))
        for pg in (A, Bp):
            await rt(pg, "abreTela('amigos')")
        if not (await espera(A, "!!NET49.id", 10000) and await espera(Bp, "!!NET49.id", 10000)):
            raise RuntimeError('não conectou')
        await rt(A, "(() => { Object.assign(SX.form, {onde:'online', pub:true, n:1, map:4, jogo:'futebol', tempo:5, bots:false, nome:'Medidas v102'}); sxCriar(); return 1; })()")
        cod = await espera(A, "NET49.room && NET49.room.code", 8000)
        await rt(Bp, "(() => { net49Send({type:'join', code:%s, slot:1}); return 1; })()" % json.dumps(cod))
        await espera(A, "NET49.room && NET49.room.members.length === 2", 8000)
        await rt(A, "document.querySelector('.v70-sl-atalhos .entrar').click()")
        await espera(A, "NET49.room.roster.indexOf(NET49.id) >= 0 && NET49.room.roster.every(Boolean)", 8000)
        if quadros == 60:
            await rt(A, "(() => { net49Send({type:'config', quadros:60}); return 1; })()")
            await asyncio.sleep(0.6)
        await rt(A, "slIniciar()")
        JOGA = "NET49.playing && !NET49.host && NET49.localSlot >= 0 && NET49.lastTick > 0"
        if not (await espera(A, JOGA, 10000) and await espera(Bp, JOGA, 10000)):
            raise RuntimeError('a partida não começou')
        for pg in (A, Bp):
            await rt(pg, "(() => { filaPop.length = 0; if (!LB.pop.hidden) fechaPop(); return 1; })()")
        info = await rt(A, "({v92: typeof V92N !== 'undefined' && V92N.on, slot:NET49.localSlot, quadros:NET49.room.quadros, motor:NET49.room.motorRodada || NET49.room.motor, n:NET49.room.n, extra:typeof window.RachaRede102 === 'object' ? window.RachaRede102.estado() : null})")
        out['info'] = info
        await rt(A, GRAVA)
        # (o Beto não desenha: ele só joga — as contas e o dedo dele usam o que a previsão põe no VIS/RQ antes do desenho; menos
        #  carga nesta máquina de 2 núcleos. --sem-desenho faz o mesmo na Ana: grava o que seria desenhado e não pinta a tela)
        await rt(Bp, "(() => { render = function(){}; return 1; })()")
        if '--sem-desenho' in sys.argv:
            await rt(A, "(() => { window.__REC.semPintar = true; return 1; })()")
        await rt(A, DEDO + "('A', %d)" % (semente * 1000 + 11)); await rt(Bp, DEDO + "('B', %d)" % (semente * 1000 + 23))
        await rt(A, "window.__DEDO.on = true"); await rt(Bp, "window.__DEDO.on = true")
        await asyncio.sleep(3.0)
        await rt(A, "(() => { window.__REC.f.length = 0; window.__REC.s.length = 0; window.__REC.on = true; return 1; })()")
        t0 = time.time()
        while time.time() - t0 < dur:
            await asyncio.sleep(min(5, dur - (time.time() - t0)))
        await rt(A, "(() => { window.__REC.on = false; return 1; })()")
        fr = await rt(A, "window.__REC.f"); snaps = await rt(A, "window.__REC.s")
        out['dedos'] = {'A': await rt(A, "({chutes:__DEDO.chutes, missoes:__DEDO.missoes, erro:__DEDO.erro || null})"), 'B': await rt(Bp, "({chutes:__DEDO.chutes, erro:__DEDO.erro || null})")}
        out['erro_gravacao'] = await rt(A, "window.__REC.erro")
        out['placar'] = await rt(A, "RQ.placar.slice()")
        out['extra_fim'] = await rt(A, "typeof window.RachaRede102 === 'object' ? window.RachaRede102.estado() : (typeof window.RachaRede96 === 'object' ? window.RachaRede96.estado().medidas : null)")
        out['erros_js'] = [e for pg in sess for e in pg.erros][:5]
    finally:
        for pg in sess:
            try:
                await pg.b.close()
            except Exception:
                pass
        if prx:
            prx.terminate()
            try:
                txt = prx.communicate(timeout=3)[0]
                for l in txt.splitlines():
                    if l.startswith('estat '):
                        out['proxy'] = json.loads(l[6:])
            except Exception:
                pass
        srv.terminate()
        try:
            srv.communicate(timeout=4)
        except Exception:
            srv.kill()
    verdade = []
    try:
        with open(arq_v, encoding='utf-8') as f:
            for l in f:
                try:
                    verdade.append(json.loads(l))
                except Exception:
                    pass
    except Exception:
        pass
    if fr is not None:
        t_ini, t_fim = fr[0][0] - 1000, fr[-1][0] + 1000
        verdade = [l for l in verdade if t_ini <= l['t'] <= t_fim]
        slot = out['info']['slot']
        out['medidas'] = analisa(fr, snaps, verdade, (slot, 1 - slot))
        out['_bruto'] = {'f': fr, 's': snaps, 'v': verdade}
    return out


def linha_tabela(rot, m):
    def g(o, k):
        v = m.get(o, {}).get(k)
        return '-' if v is None else str(v)
    return ('%-22s' % rot + ' | eu d2 %s pul %s cor95 %s desl95 %s | outro d2 %s pul %s rap %s par %s L %s err %s | bola d2 %s pul %s rap %s par %s L %s err %s' % (
        g('eu', 'd2_rms_px'), g('eu', 'pulos_min'), g('eu', 'correcao_p95_px'), g('eu', 'deslize_tela_p95_px'),
        g('outro', 'd2_rms_px'), g('outro', 'pulos_min'), g('outro', 'rapidos_min'), g('outro', 'paradas_min'), g('outro', 'atraso_ms'), g('outro', 'erro_med_px'),
        g('bola', 'd2_rms_px'), g('bola', 'pulos_min'), g('bola', 'rapidos_min'), g('bola', 'paradas_min'), g('bola', 'atraso_ms'), g('bola', 'erro_med_px')))


CHAVES_AB = [('eu', 'd2_rms_px'), ('eu', 'correcao_p95_px'), ('eu', 'correcao_max_px'), ('eu', 'deslize_tela_p95_px'), ('eu', 'deslize_tela_max_px'),
             ('outro', 'd2_rms_px'), ('outro', 'pulos_min'), ('outro', 'rapidos_min'), ('outro', 'paradas_min'), ('outro', 'atraso_ms'), ('outro', 'erro_med_px'), ('outro', 'erro_p95_px'), ('outro', 'correcao_p95_px'),
             ('bola', 'd2_rms_px'), ('bola', 'pulos_min'), ('bola', 'rapidos_min'), ('bola', 'paradas_min'), ('bola', 'atraso_ms'), ('bola', 'erro_med_px'), ('bola', 'erro_p95_px'),
             ('tela', 'quadros_>25ms_%'), ('quadros_servidor', 'saltos_tempo_%'), ('quadros_servidor', 'fila_previsao_med')]


async def ab(pw, redes, dur, semente, reps, quadros, cfg92):
    """antes × depois, um logo depois do outro (a mesma carga na máquina), reps vezes por rede, com sementes iguais nos dois lados:
    antes = o servidor sem os campos novos (RACHA_ENTRADAS=0) e o jogo com RACHA_CONFIG.rede102 = false; depois = os dois ligados"""
    lados = (('antes', {'rede102': False}, {'RACHA_ENTRADAS': '0'}), ('depois', {}, {}))
    res = {}
    for rede in redes:
        for r in range(reps):
            ordem = lados if r % 2 == 0 else lados[::-1]          # (alterna quem vai primeiro)
            for nome, cli, env in ordem:
                o = await uma(pw, rede, dur, semente + r, cli, quadros, cfg92, env)
                o.pop('_bruto', None)
                res.setdefault(rede, {}).setdefault(nome, []).append(o)
                print(linha_tabela('%s · %s #%d' % (nome, rede, r + 1), o.get('medidas', {})), '· carga', o.get('carga_antes'), '· tela >25ms', (o.get('medidas', {}).get('tela') or {}).get('quadros_>25ms_%'), flush=True)
    tabela = {}
    for rede, por in res.items():
        tabela[rede] = {}
        for nome, lista in por.items():
            med = {}
            for o_, k in CHAVES_AB:
                vs = [x['medidas'][o_][k] for x in lista if x.get('medidas', {}).get(o_, {}).get(k) is not None]
                med[o_ + '.' + k] = r2(st.mean(vs), 2) if vs else None
            tabela[rede][nome] = med
    print('\nRESUMO (média de %d repetições de %d s por lado)' % (reps, dur))
    for rede, por in tabela.items():
        print('\n' + rede)
        for chave in [o_ + '.' + k for o_, k in CHAVES_AB]:
            a, d = por.get('antes', {}).get(chave), por.get('depois', {}).get(chave)
            print('  %-34s %10s %10s' % (chave, a, d))
    return {'por_rodada': res, 'tabela': tabela}


async def principal():
    redes = argv('redes', 'direto,4g,4g_ruim').split(',')
    dur = float(argv('dur', '60')); semente = int(argv('semente', '1')); rotulo = argv('rotulo', 'medida')
    quadros = int(argv('quadros', '30'))
    extra, cfg92 = {}, {}
    for i, a in enumerate(sys.argv):
        if a in ('--cliente', '--cfg92') and i + 1 < len(sys.argv):
            k, v = sys.argv[i + 1].split('=', 1)
            (extra if a == '--cliente' else cfg92)[k] = json.loads(v) if v in ('true', 'false') or v.replace('.', '', 1).isdigit() else v
    saida = [a for a in sys.argv[1:] if a.endswith('.json')]
    res = {'rotulo': rotulo, 'quando': time.strftime('%Y-%m-%d %H:%M'), 'medidas': {}}
    print('RACHA v102 · medidas do online liso ·', rotulo, '· redes', redes, '·', dur, 's · semente', semente, '· cliente', extra, '· v92', cfg92, '· quadros', quadros, '· fila', FILA)
    if '--ab' in sys.argv:
        async with async_playwright() as pw:
            res['ab'] = await ab(pw, redes, dur, semente, int(argv('reps', '2')), quadros, cfg92)
        if saida:
            with open(saida[0], 'w', encoding='utf-8') as f:
                json.dump(res, f, ensure_ascii=False, indent=1)
            print('gravado em', saida[0])
        return 0
    async with async_playwright() as pw:
        for rede in redes:
            o = await uma(pw, rede, dur, semente, extra, quadros, cfg92)
            bruto = o.pop('_bruto', None)
            res['medidas'][rede] = o
            print(linha_tabela(rotulo + ' · ' + rede, o.get('medidas', {})))
            print('   ', json.dumps({k: o.get(k) for k in ('info', 'placar', 'proxy', 'erros_js', 'erro_gravacao', 'dedos')}, ensure_ascii=False)[:600])
            print('   ', json.dumps(o.get('medidas', {}), ensure_ascii=False))
            if saida and '--bruto' in sys.argv and bruto:
                with open(saida[0][:-5] + '_' + rede + '_bruto.json', 'w', encoding='utf-8') as f:
                    json.dump(bruto, f)
    if saida:
        with open(saida[0], 'w', encoding='utf-8') as f:
            json.dump(res, f, ensure_ascii=False, indent=1)
        print('gravado em', saida[0])
    return 0


if __name__ == '__main__':
    sys.exit(asyncio.run(principal()))
