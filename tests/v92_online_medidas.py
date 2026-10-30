"""RACHA v92 · AS MEDIDAS DO ONLINE (antes × depois). Não é teste de passa/falha: mede e grava num JSON.

Sobe o servidor da turma da árvore escolhida (--raiz: a v91 original ou a v92) e um "4G de mentira" (tests/v92_proxy.cjs:
cada pedaço de dado atrasa N ms em cada sentido, com oscilação) entre ele e dois navegadores com o jogo de verdade numa
sala 1v1 hospedada. Na sessão medida (Ana) grava, a cada quadro da tela, onde a tampinha e a bola foram desenhadas e mede:
  · o tranco da própria tampinha correndo (correções da previsão): a 2ª diferença do desenho em trechos de direção fixa;
  · o encaixe na condução: empurrando a bola, quanto a bola aparece DENTRO da tampinha (a bola atrasada na tela);
  · a resposta do chute: do toque no CHUTE até a bola começar a andar NA TELA de quem chutou;
  · e, na v92, o que o medidor do jogo conta (correções por quadro do servidor, passos/s do servidor, a fila).
Uso: python3 tests/v92_online_medidas.py [--raiz /caminho/da/arvore] [--atraso 40] [--oscila 8] [--bruto] [saida.json]
     (--bruto: grava ao lado <saida>_bruto.json com os quadros gravados)"""
import asyncio, json, math, os, subprocess, sys, time, statistics as st, pathlib
from comum import rt, async_playwright, FONTES, HARNESS, CHROME
from online_test import porta_livre, espera

AQUI = pathlib.Path(__file__).resolve().parent


def argv(n, d):
    return sys.argv[sys.argv.index('--' + n) + 1] if '--' + n in sys.argv else d


RAIZ = pathlib.Path(argv('raiz', str(AQUI.parent)))
ATRASO = int(argv('atraso', '40')); OSCILA = int(argv('oscila', '8'))
SAIDA = [a for a in sys.argv[1:] if a.endswith('.json')]
BRUTO = {'corrida': [], 'conducao': [], 'chute': []}     # (--bruto: grava também os quadros gravados, para olhar depois)

GRAVA = r"""(() => {                       // grava o desenho a cada quadro da tela (depois do quadro do jogo)
  window.__gr = []; window.__grOn = false;
  // [0] agora, [1..4] a tampinha e a bola desenhadas, [5,6] o analógico, [7] o estado, [8] o último quadro do servidor,
  // [9] o horário do quadro da tela (o do requestAnimationFrame), [10..13] (v92) a tampinha e a bola no mundo de previsão,
  // [14, 15] (v92) o deslize da correção da tampinha, [16] o tempo desde o último passo (acc, s)
  const loop = (ts) => {
    window.__desenho = [VIS.px, VIS.py, VIS.bx, VIS.by];        // (o que a tela mostrou neste quadro: é o que o toque usa)
    if (window.__grOn){
      const m = typeof V92N !== 'undefined' && V92N.on && V92N.M ? V92N.M : null, eu = m ? m.jog[V92N.slot] : null;
      window.__gr.push([performance.now(), VIS.px, VIS.py, VIS.bx, VIS.by, joy.dx, joy.dy, RQ.estado, NET49.lastTick, ts,
                        eu ? eu.x : null, eu ? eu.y : null, m ? m.B.x : null, m ? m.B.y : null,
                        m ? V92N.ofP[0] : null, m ? V92N.ofP[1] : null, typeof acc === 'number' ? acc : null]);
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop); return 1;
})()"""

ANDA = r"""((padrao, ms) => {               // corre num padrão de direções (cada uma por ms) — o analógico no máximo
  const R = JOY.max*hud.joy.al, dirs = padrao.map(a => a*Math.PI/180);
  let i = 0; joy.id = 77; joy.dx = Math.cos(dirs[0])*R; joy.dy = Math.sin(dirs[0])*R;
  window.__andaFim = false;
  const it = setInterval(() => {
    i++;
    if (i >= dirs.length){ clearInterval(it); joy.id = null; joy.dx = joy.dy = 0; window.__andaFim = true; return; }
    joy.dx = Math.cos(dirs[i])*R; joy.dy = Math.sin(dirs[i])*R;
  }, ms);
  return 1;
})"""

# vai até um ponto (em frações do campo: 0..1) e para lá (o adversário sai do caminho das medidas)
VAIPARA = r"""((fx, fy) => {
  const R = JOY.max*hud.joy.al; joy.id = 77; window.__para = false;
  const it = setInterval(() => {
    const tx = GL + (GR - GL)*fx, ty = GT + (GB - GT)*fy, dx = tx - P.x, dy = ty - P.y, d = Math.hypot(dx, dy);
    if (d < U(1.5)){ clearInterval(it); joy.id = null; joy.dx = joy.dy = 0; window.__para = true; return; }
    joy.dx = dx/d*R; joy.dy = dy/d*R;
  }, 16);
  setTimeout(() => { clearInterval(it); joy.id = null; joy.dx = joy.dy = 0; window.__para = true; }, 6000);
  return 1;
})"""

# vai até a bola por trás (do lado de fora do campo para o meio) e: modo 'conduz' = empurra por ms; modo 'chuta' = toca no CHUTE
VAI = r"""((modo, ms) => {
  const R = JOY.max*hud.joy.al, V = window.__vai = {fim:false, fase:'chega', t0:performance.now(), tToque:null, alvo:null};
  joy.id = 77;
  const it = setInterval(() => {
    const agora = performance.now();
    if (agora - V.t0 > 12000){ V.fim = true; V.erro = 'tempo'; clearInterval(it); joy.id = null; joy.dx = joy.dy = 0; keys.Space = keys.KeyK = false; return; }
    if (V.sy === undefined) V.sy = B.y > CY ? -1 : 1;                  // empurra na largura do campo, para o lado mais longe (nunca para um gol)
    const nx = 0, ny = V.sy;
    const off = R_JOG + B.r + U(1.6);
    let tx = B.x - nx*off, ty = B.y - ny*off;
    if (V.fase === 'chega'){ if (Math.hypot(tx - P.x, ty - P.y) < U(0.8)) { V.fase = modo; V.t1 = agora; } }
    else { tx = B.x + nx*U(4); ty = B.y + ny*U(4); }
    const dx = tx - P.x, dy = ty - P.y, d = Math.hypot(dx, dy) || 1;
    joy.dx = dx/d*R; joy.dy = dy/d*R;
    if (V.fase === 'conduz' && agora - V.t1 > ms){ V.fim = true; clearInterval(it); joy.id = null; joy.dx = joy.dy = 0; }
    // o toque quando a bola DESENHADA no último quadro da tela entra no alcance (o que quem joga vê; entre dois quadros,
    // as variáveis do jogo podem estar com o quadro do servidor que acabou de chegar)
    const D = window.__desenho || [VIS.px, VIS.py, VIS.bx, VIS.by], dT = Math.hypot(D[2] - D[0], D[3] - D[1]);
    if (V.fase === 'chuta' && V.tToque === null && dT <= ALCANCE_CHUTE - 3){
      V.tToque = performance.now(); keys.KeyK = true; BOTAO.powerL = true;
      const m = typeof V92N !== 'undefined' && V92N.on && V92N.M ? V92N.M : null;   // (v92: a distância no mundo de previsão na hora do toque)
      V.dTela = dT; V.alcance = ALCANCE_CHUTE;
      V.dMundo = m ? Math.hypot(m.B.x - m.jog[V92N.slot].x, m.B.y - m.jog[V92N.slot].y) : null;
      setTimeout(() => { keys.KeyK = false; }, 50);
      setTimeout(() => { V.fxT = typeof V92N !== 'undefined' ? V92N.fx.t : null; V.fim = true; clearInterval(it); joy.id = null; joy.dx = joy.dy = 0; }, 900);
    }
  }, 16);
  return 1;
})"""


async def sessao(pw, url, nome, ws):
    b = await pw.chromium.launch(executable_path=CHROME, args=['--no-sandbox', '--autoplay-policy=no-user-gesture-required'])
    ctx = await b.new_context(viewport={'width': 1280, 'height': 720}, has_touch=True)
    await ctx.add_init_script("document.addEventListener('DOMContentLoaded',()=>{const s=document.createElement('style');s.textContent=%s;document.head.prepend(s);});" % json.dumps(FONTES))
    await ctx.add_init_script("window.RACHA_CONFIG = Object.assign(window.RACHA_CONFIG || {}, {servidor:%s, presente:false});" % json.dumps(ws))
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


def tranco_corrida(gr, padrao_ms):
    """a 2ª diferença do desenho da própria tampinha nos trechos de direção fixa (fora os 150 ms depois de cada troca)"""
    seg = []; ult = None; t_troca = 0
    for r in gr:
        d = (round(r[5]), round(r[6]))
        if d != ult:
            ult = d; t_troca = r[0]; seg.append([])
        if r[0] - t_troca > 150 and (r[5] or r[6]):
            seg[-1].append(r)
    d2 = []; saltos = 0
    for s in seg:
        for i in range(1, len(s) - 1):
            a, b, c = s[i - 1], s[i], s[i + 1]
            dt1, dt2 = (tq(b) - tq(a)) / 1000, (tq(c) - tq(b)) / 1000
            if dt1 <= 0 or dt2 <= 0:
                continue
            v1 = ((b[1] - a[1]) / dt1, (b[2] - a[2]) / dt1); v2 = ((c[1] - b[1]) / dt2, (c[2] - b[2]) / dt2)
            acel = math.hypot(v2[0] - v1[0], v2[1] - v1[1]) * (dt1 + dt2) / 2   # px de desvio por quadro
            d2.append(acel)
            if acel > 3:
                saltos += 1
    if not d2:
        return {}
    d2s = sorted(d2)
    return {'tranco_medio_px': round(st.mean(d2), 2), 'tranco_p95_px': round(d2s[int(.95 * (len(d2s) - 1))], 2),
            'quadros_com_tranco_>3px_%': round(100 * saltos / len(d2), 1), 'quadros': len(d2)}


def tq(r):
    """o horário do quadro da tela (o do requestAnimationFrame, quando gravado; senão o da gravação)"""
    return r[9] if len(r) > 9 and r[9] is not None else r[0]


def tranco_serie(g, ix, iy):
    """a 2ª diferença do desenho (px de desvio por quadro) numa série de quadros seguidos"""
    d2 = []
    for i in range(1, len(g) - 1):
        a, b, c = g[i - 1], g[i], g[i + 1]
        dt1, dt2 = (tq(b) - tq(a)) / 1000, (tq(c) - tq(b)) / 1000
        if not (0 < dt1 < .05 and 0 < dt2 < .05):
            continue
        v1 = ((b[ix] - a[ix]) / dt1, (b[iy] - a[iy]) / dt1); v2 = ((c[ix] - b[ix]) / dt2, (c[iy] - b[iy]) / dt2)
        d2.append(math.hypot(v2[0] - v1[0], v2[1] - v1[1]) * (dt1 + dt2) / 2)
    return d2


def encaixe(gr, contato):
    g = [r for r in gr if r[7] == 'jogo']
    d = [math.hypot(r[3] - r[1], r[4] - r[2]) for r in g]
    if not d:
        return {}
    dentro = [max(0, contato - x) for x in d]
    vel = []
    for i in range(1, len(g)):
        dt = (tq(g[i]) - tq(g[i - 1])) / 1000
        ds = math.hypot(g[i][1] - g[i - 1][1], g[i][2] - g[i - 1][2])
        if 0 < dt < .05 and ds < 40:                       # (fora os saltos: gol, saída, aba parada)
            vel.append(ds / dt)
    tj = tranco_serie(g, 1, 2); tb = tranco_serie(g, 3, 4)
    p95 = lambda xs: round(sorted(xs)[int(.95 * (len(xs) - 1))], 2) if xs else None
    res = {'bola_dentro_da_tampinha_media_px': round(st.mean(dentro), 1), 'quadros_bola_dentro_>6px_%': round(100 * sum(1 for x in dentro if x > 6) / len(d), 1),
           'distancia_media_px': round(st.mean(d), 1), 'distancia_oscila_px': round(st.pstdev(d), 1), 'contato_px': round(contato, 1),
           'velocidade_tampinha_px_s': round(st.mean(vel), 1) if vel else None, 'velocidade_oscila_px_s': round(st.pstdev(vel), 1) if vel else None,
           'tranco_tampinha_medio_px': round(st.mean(tj), 2) if tj else None, 'tranco_tampinha_p95_px': p95(tj),
           'tranco_bola_medio_px': round(st.mean(tb), 2) if tb else None, 'tranco_bola_p95_px': p95(tb), 'quadros': len(d)}
    mundo = [r for r in g if len(r) > 13 and r[10] is not None]
    if mundo:                                              # (v92: quanto o desenho fica longe do mundo de previsão)
        res['desenho_x_mundo_tampinha_px'] = round(st.mean(math.hypot(r[1] - r[10], r[2] - r[11]) for r in mundo), 2)
        res['desenho_x_mundo_bola_px'] = round(st.mean(math.hypot(r[3] - r[12], r[4] - r[13]) for r in mundo), 2)
    return res


def resposta_chute(gr, t_toque):
    """do toque até a bola andar rápido NA TELA (velocidade desenhada > 300 px/s e aumentando)"""
    pos = [r for r in gr if r[0] >= t_toque - 50]
    for i in range(1, len(pos)):
        a, b = pos[i - 1], pos[i]
        dt = (b[0] - a[0]) / 1000
        if dt <= 0 or b[0] < t_toque:
            continue
        v = math.hypot(b[3] - a[3], b[4] - a[4]) / dt
        if v > 300:
            return round(b[0] - t_toque, 1)
    return None


async def principal():
    res = {'raiz': str(RAIZ), 'atraso_ms': ATRASO, 'oscila_ms': OSCILA}
    porta = porta_livre(); pproxy = porta_livre()
    srv = subprocess.Popen(['node', str(RAIZ / 'tests' / 'servidor_visitantes.cjs'), '--porta', str(porta), '--host', '127.0.0.1', '--memoria',
                            '--estaticos', str(RAIZ), '--nome', 'Medidas v92', '--sem-p2p'], stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    prx = subprocess.Popen(['node', str(AQUI / 'v92_proxy.cjs'), '--porta', str(pproxy), '--destino', str(porta), '--atraso', str(ATRASO), '--oscila', str(OSCILA)],
                           stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    time.sleep(1.0)
    url = 'http://127.0.0.1:%d/tests/build/racha_teste.html' % porta
    ws = 'ws://127.0.0.1:%d' % pproxy
    sess = []
    print('RACHA v92 · medidas do online:', RAIZ, '·', ATRASO, 'ms ±', OSCILA, 'em cada sentido')
    try:
        async with async_playwright() as pw:
            A = await sessao(pw, url, 'Ana', ws); Bp = await sessao(pw, url, 'Beto', ws); sess += [A, Bp]
            for pg in (A, Bp):
                await rt(pg, "abreTela('amigos')")
            ok = bool(await espera(A, "!!NET49.id", 10000)) and bool(await espera(Bp, "!!NET49.id", 10000))
            if not ok:
                raise RuntimeError('não conectou')
            await rt(A, "(() => { Object.assign(SX.form, {onde:'online', pub:true, n:1, map:0, jogo:'futebol', tempo:0, bots:false, nome:'Medidas'}); sxCriar(); return 1; })()")
            cod = await espera(A, "NET49.room && NET49.room.code", 8000)
            await rt(Bp, "(() => { net49Send({type:'join', code:%s, slot:1}); return 1; })()" % json.dumps(cod))
            await espera(A, "NET49.room && NET49.room.members.length === 2", 8000)
            await rt(A, "document.querySelector('.v70-sl-atalhos .entrar').click()")
            await espera(A, "NET49.room.roster.indexOf(NET49.id) >= 0 && NET49.room.roster.every(Boolean)", 8000)
            await rt(A, "slIniciar()")
            JOGA = "NET49.playing && !NET49.host && NET49.localSlot >= 0 && NET49.lastTick > 0"
            if not (await espera(A, JOGA, 10000) and await espera(Bp, JOGA, 10000)):
                raise RuntimeError('a partida não começou')
            for pg in (A, Bp):
                await rt(pg, "(() => { filaPop.length = 0; if (!LB.pop.hidden) fechaPop(); return 1; })()")
            info = await rt(A, "({v92: typeof V92N !== 'undefined' && V92N.on, nucleo: NET49.room.nucleo || null, R:R_JOG + R_BOLA})")
            res['previsao_v92'] = info['v92']; res['servidor_nucleo'] = info['nucleo']
            print('  a previsão da v92 está ligada:', info['v92'], '· núcleo no servidor:', info['nucleo'])
            await rt(A, GRAVA)
            await asyncio.sleep(1.0)
            # a saída: quem bate vai até a bola e empurra (a bola sai do meio)
            saida = await rt(A, "RQ.saidaTime"); tA = await rt(A, "P.time")
            quem = A if tA == saida else Bp
            await rt(quem, VAI + "('conduz', 400)")
            await espera(quem, "window.__vai && window.__vai.fim", 14000)
            tB = await rt(Bp, "P.time")                        # o Beto sai do caminho: vai para o canto de baixo do lado dele e fica parado
            await rt(Bp, VAIPARA + "(%r, %r)" % (0.92 if tB == 1 else 0.08, 0.92))
            await espera(Bp, "window.__para", 8000)
            await asyncio.sleep(0.6)
            # 1) a corrida em zigue-zague (a própria tampinha)
            padrao = [0, 90, 180, 270, 45, 225, 135, 315, 0, 180, 90, 270]
            await rt(A, "(() => { window.__gr.length = 0; window.__grOn = true; return 1; })()")
            await rt(A, ANDA + "(%s, %d)" % (json.dumps(padrao), 420))
            await espera(A, "window.__andaFim", 12000)
            await rt(A, "(() => { window.__grOn = false; return 1; })()")
            gr = await rt(A, "window.__gr")
            res['corrida'] = tranco_corrida(gr, 420); BRUTO['corrida'].append(gr)
            print('  corrida:', res['corrida'])
            # 2) a condução (empurrando a bola por 2,5 s), 2 vezes
            enc = []
            for _ in range(5):                                 # (até 5 tentativas para ter 2 conduções de 2,5 s)
                if len(enc) >= 2:
                    break
                await rt(A, "(() => { window.__gr.length = 0; return 1; })()")
                await rt(A, VAI + "('conduz', 2500)")
                chegou = await espera(A, "window.__vai && (window.__vai.fase === 'conduz' || window.__vai.fim)", 13000)
                await rt(A, "(() => { window.__gr.length = 0; window.__grOn = true; return 1; })()")
                await espera(A, "window.__vai && window.__vai.fim", 8000)
                await rt(A, "(() => { window.__grOn = false; return 1; })()")
                gr = await rt(A, "window.__gr")
                e = encaixe(gr, info['R'])
                if e and e.get('quadros', 0) > 60:
                    enc.append(e); BRUTO['conducao'].append(gr)
                await asyncio.sleep(0.5)
            res['conducao'] = enc
            print('  condução:', enc)
            # 3) o chute: do toque até a bola andar na tela (4 vezes)
            resp = []; toques = []
            for _ in range(6):
                await espera(A, "Math.hypot(B.vx, B.vy) < 60 ? 1 : 0", 8000)
                await rt(A, "(() => { window.__gr.length = 0; window.__grOn = true; return 1; })()")
                await rt(A, VAI + "('chuta', 0)")
                v = await espera(A, "window.__vai && window.__vai.fim ? window.__vai : null", 15000)
                await rt(A, "(() => { window.__grOn = false; return 1; })()")
                gr = await rt(A, "window.__gr")
                if v and v.get('tToque'):
                    resp.append(resposta_chute(gr, v['tToque'])); BRUTO['chute'].append({'tToque': v['tToque'], 'gr': gr})
                    toques.append({'dist_tela_px': round(v.get('dTela') or 0, 1), 'alcance_px': v.get('alcance'),
                                   'dist_mundo_px': round(v['dMundo'], 1) if v.get('dMundo') is not None else None,
                                   'fx_previsto_ms': round(v['fxT'] - v['tToque'], 1) if v.get('fxT') and v['fxT'] >= v['tToque'] else None})
                await asyncio.sleep(1.2)
            ok_r = [x for x in resp if x is not None]
            res['chute_resposta_ms'] = {'medidas': resp, 'media': round(st.mean(ok_r), 1) if ok_r else None,
                                        'mediana': round(st.median(ok_r), 1) if ok_r else None, 'toques': toques}
            print('  resposta do chute (ms):', res['chute_resposta_ms'])
            res['ping_ms'] = await rt(A, "Math.round(NET49.ping)")
            res['medidor_v92'] = await rt(A, """(() => { if (typeof V92 === 'undefined') return null; const c = V92.med.corr.slice(), s = c.slice().sort((a, b) => a - b);
              return {correcao_media_px: c.length ? +(c.reduce((a, b) => a + b, 0)/c.length).toFixed(2) : null, correcao_p95_px: s.length ? +s[Math.floor(.95*(s.length - 1))].toFixed(2) : null,
                      servidor_passos_s: +V92.med.tps.toFixed(2), fila: V92.med.fila, chutes_previstos: V92.med.chutesPrev | 0}; })()""")
            print('  ping', res['ping_ms'], 'ms · medidor:', res['medidor_v92'])
            res['erros_js'] = [e for pg in sess for e in pg.erros][:5]
    finally:
        for pg in sess:
            try:
                await pg.b.close()
            except Exception:
                pass
        srv.terminate(); prx.terminate()
    if SAIDA:
        with open(SAIDA[0], 'w', encoding='utf-8') as f:
            json.dump(res, f, ensure_ascii=False, indent=1)
        print('gravado em', SAIDA[0])
        if '--bruto' in sys.argv:
            with open(SAIDA[0][:-5] + '_bruto.json', 'w', encoding='utf-8') as f:
                json.dump(BRUTO, f)
    return 0

if __name__ == '__main__':
    sys.exit(asyncio.run(principal()))
