"""RACHA v96 · O ONLINE LISO NO NAVEGADOR: dois jogos de verdade numa sala 1v1 hospedada no servidor da turma, ligados por
um "4G do Brasil até a Virgínia" de mentira (tests/v92_proxy.cjs: 80 ms em cada sentido ± 25 e um apagão de 260 ms a cada
~4 s). A Ana (a medida) corre em zigue-zague, vai nas traves e empurra, corre rente à rede, conduz e chuta; o Beto vai na
bola, dribla e chuta. A cada quadro da tela da Ana grava onde a tampinha dela, a bola e o Beto foram DESENHADOS e conta:
  · os pulos: um quadro em que a coisa desenhada andou mais do que dá para andar (a tampinha 1,2 u, a bola 1,3 u em 16,7 ms);
  · o desenho dentro da trave ou do outro lado da rede (o centro mais perto do que o corpo deixa);
  · e o que o jogo conta (window.RachaRede96: os recomeços, os pulos que sobraram, a guarda e a batida).
Roda duas vezes: ANTES (a fila de comandos da v95 no servidor — RACHA_FILA=v95 — e as correções da v92 no aparelho —
RACHA_CONFIG.rede96 = false) e AGORA (a v96). Confere que agora não há pulo nem desenho dentro da trave e que ficou melhor.
(v108: com o prazo da v108 ligado — a correção grande da sua tampinha acabando em ~0,12 s, a volta de um apagão — a guarda
dela sobe de propósito: esses quadros contam à parte e têm que ser poucos; os outros continuam com a regra da v96.)
Rodar: python3 tests/v96_online_test.py [--segundos 40]"""
import asyncio, json, math, os, subprocess, sys, time, pathlib, random
from comum import Placar, rt, async_playwright, FONTES, HARNESS, CHROME
from online_test import porta_livre, espera

AQUI = pathlib.Path(__file__).resolve().parent
RAIZ = AQUI.parent
SEG = int(sys.argv[sys.argv.index('--segundos') + 1]) if '--segundos' in sys.argv else 40
P = Placar('v96 · o online liso (o 4G do Brasil até a Virgínia de mentira, dois navegadores)')

GRAVA = r"""(() => {                       // a cada quadro da tela: o desenho da Ana (depois do quadro do jogo)
  window.__gr = []; window.__grOn = false;
  const loop = (ts) => {
    if (window.__grOn){
      const o = RQ.jog[1 - NET49.localSlot] || null;
      // (v108: e se o deslize da sua tampinha estava com o prazo — a correção grande acabando em ~0,12 s, de propósito)
      const v108 = typeof V96R === 'object' && V96R.P && V96R.P.acel108 ? 1 : 0;
      window.__gr.push([ts, VIS.px, VIS.py, VIS.bx, VIS.by, o ? o.x : null, o ? o.y : null, RQ.estado, NET49.lastTick, v108]);
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop); return 1;
})()"""

# a Ana: o roteiro do simulador (tests/v96/rede_sim.mjs: roteiroA), com o analógico e os botões de verdade
ANA = r"""(() => {
  const R = JOY.max*hud.joy.al; joy.id = 77;
  let missao = null, fim = 0, dir = [1, 0], troca = 0, toqueT = 0, posteI = 0, fase = 0, i = 0;
  const ms = ['zigue', 'trave', 'bola', 'trave', 'rede', 'bola', 'zigue', 'trave', 'parado', 'bola'];
  window.__ana = setInterval(() => {
    const M = V92N.M; if (!M) return;
    const eu = M.jog[V92N.slot], Bw = M.B, G = M.G, t = performance.now(); let mx = 0, my = 0;
    if (!missao || t > fim){ missao = ms[i++ % ms.length]; fim = t + (missao === 'parado' ? 1200 : 3800); fase = 0; posteI = (posteI + 1) % 4; troca = 0; }
    const vai = (x, y) => { const dx = x - eu.x, dy = y - eu.y, d = Math.hypot(dx, dy); if (d > U(0.6)){ mx = dx/d; my = dy/d; } };
    if (missao === 'zigue'){
      if (t > troca){ const a = Math.random()*Math.PI*2; dir = [Math.cos(a), Math.sin(a)]; troca = t + 220 + Math.random()*450; }
      if ((eu.x < G.GL + U(6) && dir[0] < 0) || (eu.x > G.GR - U(6) && dir[0] > 0)) dir[0] = -dir[0];
      if ((eu.y < G.GT + U(6) && dir[1] < 0) || (eu.y > G.GB - U(6) && dir[1] > 0)) dir[1] = -dir[1];
      mx = dir[0]; my = dir[1];
    } else if (missao === 'trave'){
      const p = G.POSTS[posteI], s = p[0] < G.CX ? 1 : -1, sy = p[1] < G.CY ? -1 : 1;
      if (fase === 0){ const ax = p[0] + s*U(5), ay = p[1] + sy*U(3); vai(ax, ay); if (Math.hypot(ax - eu.x, ay - eu.y) < U(1)){ fase = 1; troca = t + 1300; } }
      else if (fase === 1){ const a = Math.atan2(p[1] - eu.y, p[0] - eu.x) + Math.sin(t/180)*0.6; mx = Math.cos(a); my = Math.sin(a); if (t > troca){ fase = 2; troca = t + 1200; } }
      else { mx = -s; my = sy*0.35; if (t > troca) fase = 0; }
    } else if (missao === 'rede'){
      const lado = posteI % 2 ? 1 : -1, x = lado < 0 ? G.LX0 - G.GOL_PROF - U(2.3) : G.LX1 + G.GOL_PROF + U(2.3);
      if (fase === 0){ vai(x, G.GOL_Y0 - U(3)); if (Math.hypot(x - eu.x, G.GOL_Y0 - U(3) - eu.y) < U(1.2)) fase = 1; }
      else { mx = -lado*0.5; my = Math.sin(t/400) > 0 ? 1 : -1; const l = Math.hypot(mx, my); mx /= l; my /= l; }
    } else if (missao === 'bola'){
      const gx = P.time === 0 ? G.LX1 : G.LX0, gy = G.CY, ux = gx - Bw.x, uy = gy - Bw.y, ul = Math.hypot(ux, uy) || 1, off = R_JOG + R_BOLA + U(0.4);
      const ax = Bw.x - ux/ul*off, ay = Bw.y - uy/ul*off;
      if (Math.hypot(ax - eu.x, ay - eu.y) > U(1.2)) vai(ax, ay); else { mx = ux/ul; my = uy/ul; }
      if (Math.hypot(Bw.x - eu.x, Bw.y - eu.y) < ALCANCE_CHUTE + U(0.5) && t > toqueT && Math.hypot(gx - Bw.x, gy - Bw.y) < U(30)){
        toqueT = t + 900; if (Math.random() < 0.6){ BOTAO.kickL = true; keys.KeyJ = true; setTimeout(() => { keys.KeyJ = false; }, 50); } else { BOTAO.powerL = true; keys.KeyK = true; setTimeout(() => { keys.KeyK = false; }, 50); }
      }
    }
    joy.id = 77; joy.dx = mx*R; joy.dy = my*R;
  }, 16);
  return 1;
})()"""

# o Beto: vai na bola pelo lado de trás (para o gol da Ana), dribla e chuta
BETO = r"""(() => {
  const R = JOY.max*hud.joy.al; joy.id = 78; let finta = 0, troca = 0, toqueT = 0, parado = 0;
  window.__beto = setInterval(() => {
    const M = V92N.M; if (!M) return;
    const eu = M.jog[V92N.slot], Bw = M.B, G = M.G, t = performance.now();
    if (t < parado){ joy.dx = joy.dy = 0; return; }
    if (t > troca){ finta = (Math.random() - 0.5)*1.2; troca = t + 300 + Math.random()*700; if (Math.random() < 0.08) parado = t + 400 + Math.random()*500; }
    const gx = P.time === 0 ? G.LX1 : G.LX0, gy = G.CY, ux = gx - Bw.x, uy = gy - Bw.y, ul = Math.hypot(ux, uy) || 1, off = R_JOG + R_BOLA + U(0.3);
    let dx = Bw.x - ux/ul*off - eu.x, dy = Bw.y - uy/ul*off - eu.y; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
    const c = Math.cos(finta), s = Math.sin(finta);
    joy.id = 78; joy.dx = (dx*c - dy*s)*R; joy.dy = (dx*s + dy*c)*R;
    if (Math.hypot(Bw.x - eu.x, Bw.y - eu.y) < ALCANCE_CHUTE + U(0.4) && t > toqueT && Math.random() < 0.25){
      toqueT = t + 700 + Math.random()*900; if (Math.random() < 0.5){ BOTAO.kickL = true; keys.KeyJ = true; setTimeout(() => { keys.KeyJ = false; }, 50); } else { BOTAO.powerL = true; keys.KeyK = true; setTimeout(() => { keys.KeyK = false; }, 50); }
    }
  }, 16);
  return 1;
})()"""


async def sessao(pw, url, nome, ws, rede96):
    b = await pw.chromium.launch(executable_path=CHROME, args=['--no-sandbox', '--autoplay-policy=no-user-gesture-required'])
    ctx = await b.new_context(viewport={'width': 1280, 'height': 720}, has_touch=True)
    await ctx.add_init_script("document.addEventListener('DOMContentLoaded',()=>{const s=document.createElement('style');s.textContent=%s;document.head.prepend(s);});" % json.dumps(FONTES))
    await ctx.add_init_script("window.RACHA_CONFIG = Object.assign(window.RACHA_CONFIG || {}, {servidor:%s, presente:false, rede96:%s});" % (json.dumps(ws), 'true' if rede96 else 'false'))
    await ctx.add_init_script("try{if(!localStorage.getItem('racha-treino-perfil-v1'))localStorage.setItem('racha-treino-perfil-v1', JSON.stringify({nome:%s, st:{partidas:3, concluidas:3}}));}catch(e){}" % json.dumps(nome))
    pg = await ctx.new_page()
    pg.erros = []
    pg.on('pageerror', lambda e: pg.erros.append(str(e)[:300]))
    await pg.goto(url)
    await pg.wait_for_function('() => typeof window.__RT === "function"', polling=100, timeout=30000)
    await pg.wait_for_timeout(700)
    await pg.evaluate("(() => { const o = document.getElementById('onb'); if (o) o.hidden = true; })()")
    await rt(pg, "(() => { if (typeof v84Fecha === 'function') v84Fecha(); return 1; })()")
    await rt(pg, HARNESS)
    await rt(pg, "(() => { filaPop.length = 0; if (!LB.pop.hidden) fechaPop(); return true; })()")
    pg.b = b
    return pg


def medidas(gr, geo):
    """os pulos e o desenho dentro das traves (a tela da Ana)"""
    U = 19.0
    vJ, vB, rJ, rB, PR = geo['vJ'], geo['vB'], geo['rJ'], geo['rB'], geo['postR']
    seg = lambda x, y, s: (lambda abx, aby: (lambda t: math.hypot(x - s[0] - abx * t, y - s[1] - aby * t))(max(0, min(1, ((x - s[0]) * abx + (y - s[1]) * aby) / (abx * abx + aby * aby)))))(s[2] - s[0], s[3] - s[1])
    def dentro(x, y, r, linhas=False):
        pior = 0
        for q in geo['posts']:
            pior = max(pior, r + PR - math.hypot(x - q[0], y - q[1]))
        for s in geo['rede']:
            pior = max(pior, r - seg(x, y, s))
        if linhas:
            for s in geo['linhas']:
                pior = max(pior, r - seg(x, y, s))
        return pior
    m = {'quadros': 0, 'pulos_eu': 0, 'pulos_bola': 0, 'pulos_outro': 0, 'rapidos_eu': 0, 'rapidos_eu_v108': 0, 'rapidos_outro': 0,
         'dentro_eu': 0, 'dentro_outro': 0, 'dentro_bola': 0, 'dentro_max_eu': 0.0, 'pulo_max_eu': 0.0, 'pulo_max_bola': 0.0, 'pulo_max_outro': 0.0}
    for i in range(1, len(gr)):
        a, b = gr[i - 1], gr[i]
        dt = (b[0] - a[0]) / 1000
        if not (0 < dt < 0.08) or a[7] != b[7] or b[7] in ('gol', 'fim', 'intro') or a[7] == 'gol' or b[5] is None or a[5] is None:
            continue
        m['quadros'] += 1
        k = dt * 60
        de = math.hypot(b[1] - a[1], b[2] - a[2]); db = math.hypot(b[3] - a[3], b[4] - a[4]); do = math.hypot(b[5] - a[5], b[6] - a[6])
        m['pulo_max_eu'] = max(m['pulo_max_eu'], de); m['pulo_max_bola'] = max(m['pulo_max_bola'], db); m['pulo_max_outro'] = max(m['pulo_max_outro'], do)
        if de > U * 1.2 * k: m['pulos_eu'] += 1
        if db > U * 1.3 * k: m['pulos_bola'] += 1
        if do > U * 1.2 * k: m['pulos_outro'] += 1
        if de > vJ * dt * 1.5 + 0.5:                  # (v108: com o prazo ligado — a volta de um apagão — a guarda da sua tampinha
            if len(b) > 9 and (a[9] or b[9]): m['rapidos_eu_v108'] += 1   # sobe de propósito: contado à parte)
            else: m['rapidos_eu'] += 1
        if do > vJ * dt * 1.5 + 0.5: m['rapidos_outro'] += 1
        fe = dentro(b[1], b[2], rJ); fo = dentro(b[5], b[6], rJ); fb = dentro(b[3], b[4], rB, True)
        m['dentro_max_eu'] = max(m['dentro_max_eu'], fe)
        if fe > 4: m['dentro_eu'] += 1
        if fo > 4: m['dentro_outro'] += 1
        if fb > 3: m['dentro_bola'] += 1
    for c in ('dentro_max_eu', 'pulo_max_eu', 'pulo_max_bola', 'pulo_max_outro'):
        m[c] = round(m[c], 1)
    return m


async def rodada(pw, nome, antes):
    porta = porta_livre(); pproxy = porta_livre()
    env = dict(os.environ)
    if antes:
        env['RACHA_FILA'] = 'v95'
    srv = subprocess.Popen(['node', str(AQUI / 'servidor_visitantes.cjs'), '--porta', str(porta), '--host', '127.0.0.1', '--memoria',
                            '--estaticos', str(RAIZ), '--nome', 'Testes v96', '--sem-p2p'], stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, env=env)
    prx = subprocess.Popen(['node', str(AQUI / 'v92_proxy.cjs'), '--porta', str(pproxy), '--destino', str(porta), '--atraso', '80', '--oscila', '25', '--controle'],
                           stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    time.sleep(1.0)
    url = 'http://127.0.0.1:%d/tests/build/racha_teste.html' % porta
    ws = 'ws://127.0.0.1:%d' % pproxy
    sess = []
    res = {}
    try:
        A = await sessao(pw, url, 'Ana', ws, not antes); Bp = await sessao(pw, url, 'Beto', ws, not antes); sess += [A, Bp]
        for pg in (A, Bp):
            await rt(pg, "abreTela('amigos')")
        if not (await espera(A, "!!NET49.id", 15000) and await espera(Bp, "!!NET49.id", 15000)):
            raise RuntimeError('não conectou')
        await rt(A, "(() => { Object.assign(SX.form, {onde:'online', pub:true, n:1, map:0, jogo:'futebol', tempo:0, bots:false, nome:'Liso'}); sxCriar(); return 1; })()")
        cod = await espera(A, "NET49.room && NET49.room.code", 10000)
        await rt(Bp, "(() => { net49Send({type:'join', code:%s, slot:1}); return 1; })()" % json.dumps(cod))
        await espera(A, "NET49.room && NET49.room.members.length === 2", 10000)
        await rt(A, "document.querySelector('.v70-sl-atalhos .entrar').click()")
        await espera(A, "NET49.room.roster.indexOf(NET49.id) >= 0 && NET49.room.roster.every(Boolean)", 10000)
        await rt(A, "slIniciar()")
        JOGA = "NET49.playing && !NET49.host && NET49.localSlot >= 0 && NET49.lastTick > 0"
        if not (await espera(A, JOGA, 15000) and await espera(Bp, JOGA, 15000)):
            raise RuntimeError('a partida não começou')
        for pg in (A, Bp):
            await rt(pg, "(() => { filaPop.length = 0; if (!LB.pop.hidden) fechaPop(); return 1; })()")
        await espera(A, "typeof V92N !== 'undefined' && V92N.on && !!V92N.M", 8000)
        res['previsao'] = await rt(A, "typeof V92N !== 'undefined' && V92N.on")
        res['v96'] = await rt(A, "!!(window.RachaRede96 && window.RachaRede96.estado().ativo)")
        geo = await rt(A, """(() => { const G = V92N.M.G, C = V92N.C; return {posts:G.POSTS, rede:G.NET_SEGS, linhas:G.WALL_SEGS, postR:G.POST_R, rJ:C.R_JOG, rB:C.R_BOLA, vJ:C.VEL_JOG, vB:C.LIMITE_VEL_BOLA}; })()""")
        await rt(A, GRAVA)
        await rt(A, "(() => { window.__gr.length = 0; window.__grOn = true; return 1; })()")
        await rt(A, ANA); await rt(Bp, BETO)
        t0 = time.time(); prox = t0 + 3
        while time.time() - t0 < SEG:                  # os apagões do 4G: ~260 ms a cada ~4 s
            await asyncio.sleep(0.25)
            if time.time() > prox:
                prx.stdin.write('apaga %d\n' % random.randint(200, 320)); prx.stdin.flush()
                prox = time.time() + 3.2 + random.random() * 1.6
        await rt(A, "(() => { window.__grOn = false; clearInterval(window.__ana); return 1; })()")
        await rt(Bp, "(() => { clearInterval(window.__beto); return 1; })()")
        gr = await rt(A, "window.__gr")
        res['m'] = medidas(gr, geo)
        res['jogo'] = await rt(A, "window.RachaRede96 ? window.RachaRede96.estado() : null")
        res['ping'] = await rt(A, "Math.round(NET49.ping)")
        res['erros'] = [e for pg in sess for e in pg.erros][:5]
        print('  ' + nome + ':', json.dumps(res['m']), '· ping', res['ping'], 'ms · o jogo:', json.dumps(res['jogo'] and res['jogo']['medidas']))
    finally:
        for pg in sess:
            try:
                await pg.b.close()
            except Exception:
                pass
        srv.terminate(); prx.terminate()
    return res


async def principal():
    print(P.nome)
    async with async_playwright() as pw:
        an = await rodada(pw, 'ANTES (a fila da v95 e as correções da v92)', True)
        ag = await rodada(pw, 'AGORA (v96)', False)
    m0, m = an['m'], ag['m']
    P.confere(ag['previsao'] and ag['v96'], 'a previsão da v92 e o desenho liso da v96 estão ligados na partida online', [ag['previsao'], ag['v96']])
    P.confere(not an['v96'], 'com RACHA_CONFIG.rede96 = false o desenho é o de antes (para comparar)', an['v96'])
    P.confere(m['quadros'] > SEG * 30, 'a tela da Ana gravou a partida (%d quadros)' % m['quadros'], m['quadros'])
    P.confere(m['pulos_eu'] == 0, 'a sua tampinha nunca pula (era %d)' % m0['pulos_eu'], m)
    P.confere(m['pulos_bola'] == 0, 'a bola nunca pula (era %d)' % m0['pulos_bola'], m)
    P.confere(m['pulos_outro'] == 0, 'o outro jogador nunca pula (era %d)' % m0['pulos_outro'], m)
    P.confere(m['rapidos_eu'] <= 2 and m['rapidos_outro'] <= max(3, m0['rapidos_outro'] // 10), 'nem desliza rápido demais (a sua: %d, era %d; a do outro: %d, era %d)' % (m['rapidos_eu'], m0['rapidos_eu'], m['rapidos_outro'], m0['rapidos_outro']), m)
    # v108: a correção grande da sua tampinha (a volta de um apagão) acaba em ~0,12 s — a guarda sobe enquanto isso, de propósito
    # (o "tudo em câmera lenta por uns segundos" era essa correção sumindo a 110 px/s). Aqui os apagões são curtos: quase nunca
    # liga; quando liga, é curto e sem pulo (o "nunca pula" acima vale para todos os quadros)
    P.confere(m['rapidos_eu_v108'] <= max(3, m['quadros'] // 100), 'a volta rápida da v108 (o prazo da correção grande) é curta: %d quadros da sua tampinha acima da guarda de propósito, em %d' % (m['rapidos_eu_v108'], m['quadros']), m)
    P.confere(m['dentro_eu'] == 0 and m['dentro_outro'] == 0 and m['dentro_bola'] == 0, 'nada desenhado dentro da trave, do outro lado da rede ou fora das linhas (a sua tampinha: era %d quadros, até %.1f px)' % (m0['dentro_eu'], m0['dentro_max_eu']), m)
    tot0 = m0['pulos_eu'] + m0['pulos_bola'] + m0['pulos_outro'] + m0['rapidos_eu'] + m0['rapidos_outro']
    tot = m['pulos_eu'] + m['pulos_bola'] + m['pulos_outro'] + m['rapidos_eu'] + m['rapidos_eu_v108'] + m['rapidos_outro']
    P.confere(tot < tot0 or tot0 == 0, 'ficou melhor que antes (pulos + deslizes rápidos: %d → %d)' % (tot0, tot), [tot0, tot])
    j = ag['jogo'] or {}
    P.confere(j.get('erro') is None and (j.get('medidas') or {}).get('snaps', 0) > SEG * 20, 'o jogo contou os quadros do servidor sem erro (%s)' % json.dumps(j.get('medidas')), j)
    P.confere(not an['erros'] and not ag['erros'], 'nenhum erro de JavaScript nas quatro sessões', an['erros'] + ag['erros'])
    return P.fim()

if __name__ == '__main__':
    sys.exit(asyncio.run(principal()))
