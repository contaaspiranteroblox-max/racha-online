"""RACHA v112 · AS MEDIDAS DO DESEMPENHO DA PARTIDA (FPS, tempo de cada quadro, o que pesa) — não é teste de passa/falha.

O jogo de verdade no navegador (tests/build/racha_teste.html, ou RACHA_TESTE=<outro .html> para medir outra versão), o servidor
das salas de verdade (tests/servidor_visitantes.cjs) e, entre eles, o 4G de mentira (tests/v92_proxy.cjs). A CPU do navegador
fica N vezes mais lenta (Emulation.setCPUThrottlingRate: 4 = um celular intermediário, 6 = um fraco). Cenas:
  · treino: 4v4 contra os bots, sem rede (x49Start) — a referência ("no treino é liso");
  · online 1v1, 2v2 e 4v4: a ranqueada contra os bots do servidor (fila + fila_bots), a Ana jogando com um dedo de mentira.
Em cada quadro da tela: o intervalo (o FPS), o tempo do JavaScript do quadro e, separados, o replay + a previsão (o
net49RemoteFrame sem o desenho), a lógica do desenho (o net49Draw sem o render) e o render; e o tempo de cada quadro do
servidor tratado (o net49Snapshot: o JSON já lido, o placar, os outros). Mais o perfil da CPU (CDP Profiler) do online 4v4: as
funções que mais pesam.
Uso: python3 tests/v112_fps_medidas.py [--cpu 4] [--dur 12] [--cenas treino,1v1,2v2,4v4] [--rede 4g|direto] [--perfil] [saida.json]"""
import asyncio, json, math, os, socket, subprocess, sys, time, pathlib, statistics as st
from comum import rt, async_playwright, FONTES, HARNESS, CHROME
from online_test import porta_livre, espera

AQUI = pathlib.Path(__file__).resolve().parent
RAIZ = AQUI.parent
PAGINA = os.environ.get('RACHA_TESTE')


def argv(n, d):
    return sys.argv[sys.argv.index('--' + n) + 1] if '--' + n in sys.argv else d


CPU = float(argv('cpu', '4'))
DUR = float(argv('dur', '12'))
CENAS = argv('cenas', 'treino,1v1,2v2,4v4').split(',')
REDE = argv('rede', '4g')
PERFIL = '--perfil' in sys.argv
PERFIL_CENAS = argv('perfil-cenas', '4v4').split(',')
JOGA = "NET49.playing && !NET49.host && NET49.localSlot >= 0 && NET49.lastTick > 0"

# os relógios de cada quadro (o frame inteiro, o net49RemoteFrame, o net49Draw, o render) e de cada quadro do servidor
MEDE = r"""(() => {
  const R = window.__M = {f: [], s: [], on: false, q: {}};
  const agora = () => performance.now();
  const rfA = net49RemoteFrame, dwA = net49Draw, rdA = render, snA = net49Snapshot, frA = frame;
  net49RemoteFrame = function(){ const t0 = agora(); try { return rfA.apply(this, arguments); } finally { R.q.rf = (R.q.rf || 0) + agora() - t0; } };
  net49Draw = function(){ const t0 = agora(); try { return dwA.apply(this, arguments); } finally { R.q.dw = (R.q.dw || 0) + agora() - t0; } };
  render = function(){ const t0 = agora(); try { return rdA.apply(this, arguments); } finally { R.q.rd = (R.q.rd || 0) + agora() - t0; } };
  net49Snapshot = function(s){ const t0 = agora(); try { return snA.apply(this, arguments); } finally { if (R.on) R.s.push([t0, agora() - t0]); } };
  frame = function(now){
    const t0 = agora(); R.q = {};
    try { return frA.apply(this, arguments); }
    finally { if (R.on) R.f.push([now, agora() - t0, R.q.rf || 0, R.q.dw || 0, R.q.rd || 0]); if (R.f.length > 60000) R.f.splice(0, 20000); }
  };
  return 1;
})()"""

# o dedo da Ana: vai na bola, conduz para o gol, zigue-zague e toques (como o do v102_rede_medidas, mais simples)
DEDO = r"""(() => {
  let a = 12345; const r = () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  let troca = 0, dir = [1, 0], missao = 'bola', fim = 0, toqueT = 0;
  const raio = () => JOY.max*hud.joy.al;
  clearInterval(window.__dedoT);
  window.__dedoT = setInterval(() => {
    try {
      const t = performance.now(), eu = {x: VIS.px, y: VIS.py}, bola = {x: VIS.bx, y: VIS.by}, alvoX = (P.time | 0) === 0 ? LX1 : LX0;
      if (t > fim) { missao = r() < 0.5 ? 'bola' : 'zigue'; fim = t + 2500 + r()*2500; }
      let mx = 0, my = 0;
      if (missao === 'zigue') { if (t > troca) { const g = r()*Math.PI*2; dir = [Math.cos(g), Math.sin(g)]; troca = t + 250 + r()*400; } [mx, my] = dir; }
      else {
        const ux = alvoX - bola.x, uy = CY - bola.y, ul = Math.hypot(ux, uy) || 1, off = R_JOG + R_BOLA + U(0.4);
        const ax = bola.x - ux/ul*off, ay = bola.y - uy/ul*off; mx = ax - eu.x; my = ay - eu.y;
        if (Math.hypot(ax - eu.x, ay - eu.y) < U(1.2)) { mx = ux; my = uy; }
        if (Math.hypot(bola.x - eu.x, bola.y - eu.y) < ALCANCE_CHUTE + U(0.5) && t > toqueT) { if (r() < 0.6) BOTAO.kickL = true; else BOTAO.powerL = true; toqueT = t + 800; }
      }
      const l = Math.hypot(mx, my); if (l > 1e-6) { joy.id = 77; joy.dx = mx/l*raio(); joy.dy = my/l*raio(); } else { joy.id = null; joy.dx = joy.dy = 0; }
    } catch (e) {}
  }, 16);
  return 1;
})()"""

REDES = {'direto': None, '4g': ['--atraso', '45', '--oscila', '20', '--pico', '150', '--pico-cada', '5000', '--rajada', '0.03', '--rajada-ms', '40', '--semente', '3']}


def sobe():
    porta = porta_livre()
    env = dict(os.environ); env.pop('RACHA_EXPERIMENTAL', None)
    srv = subprocess.Popen(['node', str(RAIZ / 'tests' / 'servidor_visitantes.cjs'), '--porta', str(porta), '--host', '127.0.0.1', '--memoria',
                            '--estaticos', str(RAIZ), '--nome', 'FPS v112', '--sem-p2p'], stdout=subprocess.DEVNULL, stderr=subprocess.STDOUT, env=env)
    prx, ws = None, 'ws://127.0.0.1:%d' % porta
    if REDES.get(REDE):
        pp = porta_livre()
        prx = subprocess.Popen(['node', str(RAIZ / 'tests' / 'v92_proxy.cjs'), '--porta', str(pp), '--destino', str(porta)] + REDES[REDE],
                               stdout=subprocess.DEVNULL, stderr=subprocess.STDOUT)
        ws = 'ws://127.0.0.1:%d' % pp
    for _ in range(100):
        try:
            socket.create_connection(('127.0.0.1', porta), timeout=0.5).close(); break
        except OSError:
            time.sleep(0.1)
    time.sleep(0.4)
    pag = PAGINA or 'tests/build/racha_teste.html'
    if os.path.isabs(pag):
        pag = os.path.relpath(pag, RAIZ)
    return srv, prx, 'http://127.0.0.1:%d/%s' % (porta, pag), ws


async def sessao(pw, url, ws):
    b = await pw.chromium.launch(executable_path=CHROME, args=['--no-sandbox', '--autoplay-policy=no-user-gesture-required'])
    ctx = await b.new_context(viewport={'width': 1280, 'height': 720}, has_touch=True)
    await ctx.add_init_script("document.addEventListener('DOMContentLoaded',()=>{const s=document.createElement('style');s.textContent=%s;document.head.prepend(s);});" % json.dumps(FONTES))
    await ctx.add_init_script("window.RACHA_CONFIG = Object.assign(window.RACHA_CONFIG || {}, %s);" % json.dumps({'servidor': ws, 'presente': False}))
    await ctx.add_init_script("try{if(!localStorage.getItem('racha-treino-perfil-v1'))localStorage.setItem('racha-treino-perfil-v1', JSON.stringify({nome:'Ana', st:{partidas:3, concluidas:3}}));}catch(e){}")
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
    pg.cdp = await ctx.new_cdp_session(pg)
    pg.b = b
    return pg


def resumo(fr, ss, dur):
    if len(fr) < 10:
        return {'quadros': len(fr)}
    iv = [fr[i][0] - fr[i - 1][0] for i in range(1, len(fr))]
    js = [x[1] for x in fr]
    q = lambda xs, p: sorted(xs)[min(len(xs) - 1, int(p * len(xs)))]
    tot = (fr[-1][0] - fr[0][0]) / 1000
    rf = [x[2] - x[3] for x in fr]        # o replay + a previsão + o resto do quadro do online (sem o desenho)
    dw = [x[3] - x[4] for x in fr]        # a lógica do desenho (sem o render)
    rd = [x[4] for x in fr]
    return {
        'fps': round(len(fr) / tot, 1),
        'intervalo_p95_ms': round(q(iv, 0.95), 1), 'intervalo_max_ms': round(max(iv), 1),
        'quedas_25ms_pct': round(100 * sum(1 for x in iv if x > 25) / len(iv), 2), 'travadas_50ms_min': round(sum(1 for x in iv if x > 50) / tot * 60, 1),
        'js_p50_ms': round(q(js, 0.5), 2), 'js_p95_ms': round(q(js, 0.95), 2), 'js_p99_ms': round(q(js, 0.99), 2), 'js_max_ms': round(max(js), 1),
        'online_p50_ms': round(q(rf, 0.5), 2), 'online_p95_ms': round(q(rf, 0.95), 2),
        'desenho_p50_ms': round(q(dw, 0.5), 2), 'render_p50_ms': round(q(rd, 0.5), 2), 'render_p95_ms': round(q(rd, 0.95), 2),
        'quadros_servidor_s': round(len(ss) / tot, 1), 'quadros_servidor_ms_s': round(sum(x[1] for x in ss) / tot, 1),
        'quadro_servidor_p95_ms': round(q([x[1] for x in ss], 0.95), 2) if ss else None,
    }


def perfil_inclusivo(prof, n=30):
    """o tempo inclusivo (a função e o que ela chama) de cada função, e quem chama as funções nativas mais pesadas"""
    nos = {x['id']: x for x in prof['nodes']}
    pai = {}
    for x in prof['nodes']:
        for c in x.get('children', []):
            pai[c] = x['id']
    nome = lambda no: (no['callFrame'].get('functionName') or '(anônima)') + ' :' + str(no['callFrame'].get('lineNumber', 0) + 1)
    incl, quem = {}, {}
    for s in prof.get('samples', []):
        vistos, k, prim = set(), s, True
        while k in nos:
            nm = nome(nos[k])
            if nm not in vistos:
                incl[nm] = incl.get(nm, 0) + 1; vistos.add(nm)
            if prim:
                prim = False
                cf = nos[k]['callFrame']
                if not cf.get('url') and k in pai and pai[k] in nos:       # (nativa: quem chamou)
                    q = nome(nos[k]) + '  <=  ' + nome(nos[pai[k]])
                    quem[q] = quem.get(q, 0) + 1
            k = pai.get(k)
    tot = max(1, len(prof.get('samples', [])))
    return ([(k, round(100 * v / tot, 1)) for k, v in sorted(incl.items(), key=lambda kv: -kv[1])[:n]],
            [(k, round(100 * v / tot, 1)) for k, v in sorted(quem.items(), key=lambda kv: -kv[1])[:15]])


def perfil_top(prof, n=25):
    """o perfil da CPU (CDP Profiler) → as funções com mais tempo próprio (self), em % das amostras"""
    nos = {x['id']: x for x in prof['nodes']}
    conta = {}
    for s in prof.get('samples', []):
        no = nos.get(s)
        if not no: continue
        cf = no['callFrame']
        nome = (cf.get('functionName') or '(anônima)') + ' :' + str(cf.get('lineNumber', 0) + 1)
        conta[nome] = conta.get(nome, 0) + 1
    tot = max(1, sum(conta.values()))
    return [(k, round(100 * v / tot, 1)) for k, v in sorted(conta.items(), key=lambda kv: -kv[1])[:n]]


async def cena(pw, url, ws, nome):
    pg = await sessao(pw, url, ws)
    try:
        await rt(pg, MEDE)
        if nome == 'treino':
            await rt(pg, "(() => { try { if (fimAberto()) fechaFim(); } catch (_) {} x49Start(4, 0); try { rqVsFecha(); } catch (_) {} RQ.estado = 'jogo'; return 1; })()")
            await asyncio.sleep(1.0)
        else:
            n = int(nome[0])
            await rt(pg, "abreTela('amigos')")
            await espera(pg, "!!NET49.id", 10000)
            await rt(pg, "(() => { abrirLobby(); net49Send({type:'fila', n:%d, pts:0}); return 1; })()" % n)
            await asyncio.sleep(0.5)
            await rt(pg, "(() => { net49Send({type:'fila_bots'}); return 1; })()")
            ok = await espera(pg, JOGA, 15000)
            if not ok:
                return {'erro': 'a partida não começou', 'erros': pg.erros[:3]}
            await rt(pg, "(() => { filaPop.length = 0; if (!LB.pop.hidden) fechaPop(); return 1; })()")
        await rt(pg, DEDO)
        await pg.cdp.send('Emulation.setCPUThrottlingRate', {'rate': CPU})
        await asyncio.sleep(3.0)                       # (o começo: a saída, o colchão enchendo)
        await rt(pg, "(() => { __M.f.length = 0; __M.s.length = 0; __M.on = true; return 1; })()")
        prof = None
        if PERFIL and nome in PERFIL_CENAS:
            await pg.cdp.send('Profiler.enable'); await pg.cdp.send('Profiler.setSamplingInterval', {'interval': 200}); await pg.cdp.send('Profiler.start')
        await asyncio.sleep(DUR)
        if PERFIL and nome in PERFIL_CENAS:
            prof = (await pg.cdp.send('Profiler.stop'))['profile']
        dados = await rt(pg, "(() => { __M.on = false; return {f: __M.f, s: __M.s, est: RQ.estado, n: RQ.jog ? RQ.jog.length : 0}; })()")
        r = resumo(dados['f'], dados['s'], DUR)
        r['jogadores'] = dados['n']
        if prof:
            r['perfil'] = perfil_top(prof)
            r['perfil_incl'], r['perfil_nativas'] = perfil_inclusivo(prof)
            pathlib.Path(os.environ.get('RACHA_PERFIL_ARQ', '/tmp/racha_perfil') + '_' + nome + '.cpuprofile').write_text(json.dumps(prof))
        if pg.erros:
            r['erros'] = pg.erros[:3]
        return r
    finally:
        try:
            await pg.cdp.send('Emulation.setCPUThrottlingRate', {'rate': 1})
        except Exception:
            pass
        await pg.b.close()


async def principal():
    srv, prx, url, ws = sobe()
    saida = {'cpu': CPU, 'rede': REDE, 'pagina': PAGINA or 'tests/build/racha_teste.html', 'cenas': {}}
    try:
        async with async_playwright() as pw:
            for nome in CENAS:
                r = await cena(pw, url, ws, nome)
                saida['cenas'][nome] = r
                linha = {k: v for k, v in r.items() if not k.startswith('perfil')}
                print(nome.ljust(7), json.dumps(linha, ensure_ascii=False))
                if 'perfil' in r:
                    print('  o que mais pesa em %s (%% do tempo da CPU):' % nome)
                    for k, v in r['perfil']:
                        print('   %5.1f%%  %s' % (v, k))
                    print('  inclusivo (a função e o que ela chama):')
                    for k, v in r['perfil_incl']:
                        print('   %5.1f%%  %s' % (v, k))
                    print('  as nativas e quem chama:')
                    for k, v in r['perfil_nativas']:
                        print('   %5.1f%%  %s' % (v, k))
    finally:
        for p in (prx, srv):
            if p:
                p.terminate()
    arq = next((a for a in sys.argv[1:] if a.endswith('.json')), None)
    if arq:
        pathlib.Path(arq).write_text(json.dumps(saida, ensure_ascii=False, indent=1), encoding='utf-8')
    return 0


if __name__ == '__main__':
    sys.exit(asyncio.run(principal()))
