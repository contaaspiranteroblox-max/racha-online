"""RACHA v92 · O ONLINE QUANDO A INTERNET FALHA: reconexão, correções e a consistência do servidor (passa/falha, com as
medidas impressas). Sobe o servidor da turma de verdade e um "4G de mentira" com controle (tests/v92_proxy.cjs --controle:
40 ms ± 8 em cada sentido, e o teste manda apagar a internet ou derrubar a conexão) e joga uma sala 1v1 com o jogo de
verdade em dois navegadores (Ana, a medida, e Beto). Ana corre para cima e para baixo no campo dela o tempo todo.
Duas rodadas: Ana com a v92 (o padrão) e Ana com o perfil v91 do A ⇄ B (a previsão, o desenho e a cadência da v91), no
mesmo servidor v92. As falhas da internet começam 0,3 s depois de Ana virar numa ponta do campo (o mesmo ponto da corrida
nas duas rodadas). Em cada uma:
  1. um soluço de 0,5 s (nada passa, depois chega tudo): a partida segue na mesma conexão, sem travar, e volta a bater com
     o servidor; o maior pulo da tampinha na tela (na v92 a correção desliza; a v91 pula);
  2. um apagão de 3 s: o mesmo (o jogo espera o servidor depois de 2 s sem notícia; o servidor para a tampinha de quem
     sumiu depois de 0,35 s — a regra de sempre —, então a correção na volta é grande);
  3. a conexão cai (como trocar do Wi-Fi para o 4G): o jogo volta sozinho para a mesma sala e o mesmo lugar, o bot que
     assumiu sai e a tampinha volta a obedecer; o placar continua;
  4. o app em segundo plano por 5 s (a página congelada, como o celular faz): volta e a tampinha obedece de novo;
  5. 24 s de internet ruim (± 30 ms e um soluço de 250 ms a cada 4 s): as correções da previsão e o ritmo do servidor;
  6. a consistência: com todo mundo parado, a tampinha de Ana, a de Beto e a bola no mesmo lugar na tela de Ana, na de
     Beto e no servidor; o mesmo placar.
Uso: python3 tests/v92_reconexao_test.py"""
import asyncio, json, math, os, subprocess, sys, time
from comum import Placar, rt, async_playwright, RAIZ
from online_test import porta_livre, espera
import v92_online_medidas as MED

JOGA = "NET49.playing && !NET49.host && NET49.localSlot >= 0 && NET49.lastTick > 0"
# guarda o último quadro do servidor (por cima de tudo) e o que a previsão corrigiu em cada um
GANCHO = r"""(() => {
  window.__snap = null; window.__nsnap = 0; window.__corr = [];
  const s0 = net49Snapshot;
  net49Snapshot = function(s){
    const antes = [P.x, P.y];
    const r = s0.apply(this, arguments);
    if (s && s.tick){ window.__snap = s; window.__nsnap++; }
    try {
      if (typeof V92N !== 'undefined' && V92N.on && V92.med.corr.length) window.__corr.push(V92.med.corr[V92.med.corr.length - 1]);
      else window.__corr.push(Math.hypot(P.x - antes[0], P.y - antes[1]));   // (a v91: a tampinha vai para o lugar novo na hora)
    } catch (_) {}
    return r;
  };
  return 1;
})()"""
ESTADO = r"""(() => ({playing:NET49.playing, ws:!!NET49.ws && NET49.ws.readyState === 1, slot:NET49.localSlot, id:NET49.id,
  roster:NET49.room ? NET49.room.roster.slice() : null, estado:RQ.estado, placar:RQ.placar.slice(), on:typeof V92N !== 'undefined' && V92N.on,
  snapIdade:Math.round(performance.now() - NET49.snapshotAt), tick:NET49.lastTick, tps:typeof V92 !== 'undefined' ? +(V92.med.tps || 0).toFixed(2) : null}))()"""
CORRE = r"""(() => {                          // para cima e para baixo no campo dela, de uma ponta à outra (~3 s cada), até mandarem parar
  const R = JOY.max*hud.joy.al; window.__corre = true; joy.id = 77; window.__flip = window.__flip || 0;
  let s = P.y > CY ? -1 : 1;
  clearInterval(window.__correT);
  window.__correT = setInterval(() => {
    if (!window.__corre){ clearInterval(window.__correT); joy.id = null; joy.dx = joy.dy = 0; return; }
    if (P.y < GT + U(4) && s < 0){ s = 1; window.__flip = performance.now(); } else if (P.y > GB - U(4) && s > 0){ s = -1; window.__flip = performance.now(); }
    joy.id = 77; joy.dx = 0; joy.dy = s*R;
  }, 16);
  return 1;
})()"""
PARA = "(() => { window.__corre = false; joy.id = null; joy.dx = joy.dy = 0; return 1; })()"


def sobe():
    porta = porta_livre(); pproxy = porta_livre()
    env = dict(os.environ); env.pop('RACHA_EXPERIMENTAL', None)
    srv = subprocess.Popen(['node', str(RAIZ / 'tests' / 'servidor_visitantes.cjs'), '--porta', str(porta), '--host', '127.0.0.1', '--memoria',
                            '--estaticos', str(RAIZ), '--nome', 'Teste v92', '--sem-p2p'], stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, env=env)
    prx = subprocess.Popen(['node', str(RAIZ / 'tests' / 'v92_proxy.cjs'), '--porta', str(pproxy), '--destino', str(porta), '--atraso', '40', '--oscila', '8', '--controle'],
                           stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    time.sleep(1.0)
    # (Ana passa pelo "4G de mentira"; Beto vai direto ao servidor: o que o teste faz com a internet só pega Ana)
    return srv, prx, 'http://127.0.0.1:%d/tests/build/racha_teste.html' % porta, 'ws://127.0.0.1:%d' % pproxy, 'ws://127.0.0.1:%d' % porta


def manda(prx, cmd):
    prx.stdin.write(cmd + '\n'); prx.stdin.flush()


async def sala(pw, url, ws, ws_beto, cfg_cliente=None):
    A = await MED.sessao(pw, url, 'Ana', ws); Bp = await MED.sessao(pw, url, 'Beto', ws_beto)
    if cfg_cliente:
        await rt(A, "(() => { V92.cfg = v92Limpa(Object.assign({}, V92.cfg, %s)); v92Aplica(); return 1; })()" % json.dumps(cfg_cliente))
    for pg in (A, Bp):
        await rt(pg, "abreTela('amigos')")
    await espera(A, "!!NET49.id", 10000); await espera(Bp, "!!NET49.id", 10000)
    await rt(A, "(() => { Object.assign(SX.form, {onde:'online', pub:true, n:1, map:0, jogo:'futebol', tempo:0, bots:false, nome:'v92r'}); sxCriar(); return 1; })()")
    cod = await espera(A, "NET49.room && NET49.room.code", 8000)
    await rt(Bp, "(() => { net49Send({type:'join', code:%s, slot:1}); return 1; })()" % json.dumps(cod))
    await espera(A, "NET49.room && NET49.room.members.length === 2", 8000)
    await rt(A, "document.querySelector('.v70-sl-atalhos .entrar').click()")
    await espera(A, "NET49.room.roster.indexOf(NET49.id) >= 0 && NET49.room.roster.every(Boolean)", 8000)
    await rt(A, "slIniciar()")
    ok = await espera(A, JOGA, 10000) and await espera(Bp, JOGA, 10000)
    for pg in (A, Bp):
        await rt(pg, "(() => { filaPop.length = 0; if (!LB.pop.hidden) fechaPop(); return 1; })()")
        await rt(pg, GANCHO)
    await rt(A, MED.GRAVA)
    return A, Bp, cod, ok


async def janela(A, segundos):
    """grava os quadros desenhados de Ana por um tempo e devolve [t, x, y] da tampinha dela"""
    await rt(A, "(() => { window.__gr = []; window.__grOn = true; return 1; })()")
    await asyncio.sleep(segundos)
    gr = await rt(A, "(() => { window.__grOn = false; return window.__gr.map(r => [r[0], r[1], r[2]]); })()")
    return gr


def pulo(gr, vel):
    """o maior pulo da tampinha na tela além do que a corrida anda naquele quadro (px do mundo)"""
    pior = 0.0
    for a, b in zip(gr, gr[1:]):
        dt = (b[0] - a[0]) / 1000
        if dt <= 0:
            continue
        pior = max(pior, math.hypot(b[1] - a[1], b[2] - a[2]) - vel * dt * 1.05)
    return round(pior, 1)


async def depois_da_virada(A, atraso=0.3):
    """espera Ana virar numa ponta do campo e mais um pouco: a falha começa no mesmo ponto da corrida nas duas versões"""
    f0 = await rt(A, "window.__flip")
    for _ in range(80):
        await asyncio.sleep(0.05)
        if (await rt(A, "window.__flip")) != f0:
            break
    await asyncio.sleep(atraso)


async def convergiu(A, n=15):
    c = await rt(A, "window.__corr.slice(-%d)" % n)
    return c, (sorted(c)[len(c) // 2] if c else None)


async def rodada(pw, P, url, ws, ws_beto, prx, nome, cfg_cliente=None):
    print('\n=== Ana com %s ===' % nome)
    A, Bp, cod, ok = await sala(pw, url, ws, ws_beto, cfg_cliente)
    out = {}
    try:
        P.confere(ok, '%s: a sala 1v1 no servidor começa (Ana e Beto jogando)' % nome)
        e0 = await rt(A, ESTADO)
        vel = await rt(A, "VEL_JOG"); u = await rt(A, "U(1)")
        await rt(A, CORRE); await asyncio.sleep(2.5)

        # 1) o soluço de 0,5 s
        ws0 = await rt(A, "(() => { window.__ws0 = NET49.ws; return 1; })()")
        await depois_da_virada(A)
        manda(prx, 'apaga 500')
        gr = await janela(A, 3.0)
        e1 = await rt(A, ESTADO); mesma = await rt(A, "NET49.ws === window.__ws0")
        c1, md1 = await convergiu(A)
        out['soluco'] = {'pulo': pulo(gr, vel), 'mediana_corr': md1, 'mesma_conexao': mesma}
        P.confere(e1['playing'] and e1['ws'] and mesma and e1['snapIdade'] < 300 and md1 is not None and md1 < 1.5 and e1['on'] == e0['on'],
                  '%s · soluço de 0,5 s: a partida segue na mesma conexão e a previsão volta a bater com o servidor (correção típica %.2f px; maior pulo na tela %.0f px do mundo)'
                  % (nome, md1 or -1, out['soluco']['pulo']), [e1, c1])
        if e0['on']:
            # O agendador do host de CI varia alguns pixels no instante do quadro.
            # 35 ainda distingue a correção suave do salto de ~90 da v91.
            P.confere(out['soluco']['pulo'] < 35, '%s · depois do soluço a tampinha DESLIZA para onde o servidor diz (o maior pulo num quadro: %.0f px do mundo; a v91 pula ~90)'
                      % (nome, out['soluco']['pulo']), out['soluco'])

        # 2) o apagão de 3 s
        await depois_da_virada(A)
        manda(prx, 'apaga 3000')
        gr = await janela(A, 6.0)
        e2 = await rt(A, ESTADO); mesma = await rt(A, "NET49.ws === window.__ws0")
        c2, md2 = await convergiu(A)
        out['apagao'] = {'pulo': pulo(gr, vel), 'mediana_corr': md2, 'mesma_conexao': mesma}
        P.confere(e2['playing'] and e2['ws'] and mesma and e2['snapIdade'] < 300 and md2 is not None and md2 < 1.5,
                  '%s · apagão de 3 s: a partida segue na mesma conexão e volta a bater com o servidor (correção típica %.2f px; maior pulo na tela %.0f px do mundo — o servidor parou a tampinha enquanto não tinha notícia)'
                  % (nome, md2 or -1, out['apagao']['pulo']), [e2, c2])

        # 3) a conexão cai
        antes = await rt(A, ESTADO)
        t0 = time.time()
        manda(prx, 'corta')
        volta = None
        for _ in range(120):
            await asyncio.sleep(0.1)
            e = await rt(A, ESTADO)
            if e['playing'] and e['ws'] and e['slot'] == antes['slot'] and e['snapIdade'] < 300 and (e['on'] or not antes['on']):
                volta = round(time.time() - t0, 2); break
        await asyncio.sleep(1.5)
        e3 = await rt(A, ESTADO); vB = await rt(Bp, ESTADO)
        # a tampinha obedece de novo: Ana corre e o servidor mostra ela andando
        # (v95: o campo maior muda o ritmo da ida e volta — no meio de 1 s ela pode virar; vale o quanto andou: a faixa das posições)
        ys = []
        for _ in range(6):
            ys.append(await rt(A, "window.__snap.players[NET49.localSlot][1]"))
            await asyncio.sleep(.2)
        y0, y1 = min(ys), max(ys)
        nomeB = await rt(Bp, "(() => { const q = RQ.jog[%d]; return q ? q.nome : null; })()" % antes['slot'])
        out['queda'] = {'voltou_s': volta}
        P.confere(volta is not None and volta < 6 and e3['id'] == antes['id'] and e3['roster'] == antes['roster'] and e3['placar'] == antes['placar'],
                  '%s · a conexão cai: o jogo volta sozinho para a mesma sala e o mesmo lugar em %s s, com o mesmo placar' % (nome, volta), [antes, e3])
        P.confere(abs(y1 - y0) > u * 3 and vB['playing'] and nomeB and '(bot)' not in nomeB and (e3['on'] or not antes['on']),
                  '%s · depois de voltar a tampinha obedece de novo (o servidor mostra Ana correndo: %.0f px em 1 s), o bot saiu e a previsão %s'
                  % (nome, abs(y1 - y0), 'voltou ligada' if e3['on'] else 'é a da v91'), {'y0': y0, 'y1': y1, 'nome_na_tela_de_Beto': nomeB, 'B': vB})

        # 4) o app em segundo plano (a página congelada) por 5 s
        cdp = await A.context.new_cdp_session(A)
        try:
            await cdp.send('Page.enable')
            await cdp.send('Page.setWebLifecycleState', {'state': 'frozen'})
            congelou = True
        except Exception as ex:
            congelou = str(ex)[:120]
        await asyncio.sleep(5.0)
        try:
            await cdp.send('Page.setWebLifecycleState', {'state': 'active'})
        except Exception:
            pass
        await asyncio.sleep(2.5)
        e4 = await rt(A, ESTADO)
        await rt(A, CORRE)
        y0 = await rt(A, "window.__snap.players[NET49.localSlot][1]"); await asyncio.sleep(1.0)
        y1 = await rt(A, "window.__snap.players[NET49.localSlot][1]")
        c4, md4 = await convergiu(A)
        out['segundo_plano'] = {'congelou': congelou, 'mediana_corr': md4}
        P.confere(congelou is True and e4['playing'] and e4['ws'] and e4['snapIdade'] < 300 and abs(y1 - y0) > u * 3 and md4 is not None and md4 < 1.5,
                  '%s · 5 s em segundo plano (a página congelada): volta jogando, a tampinha obedece e a previsão bate com o servidor (%.2f px)' % (nome, md4 or -1), [congelou, e4, c4])

        # 5) 24 s de internet ruim
        await rt(A, "(() => { window.__corr = []; return 1; })()")
        k0 = await rt(A, "[NET49.lastTick, performance.now()]")      # (o ritmo do servidor: os passos do quadro em 25 s, com a internet calma nas duas pontas)
        manda(prx, 'oscila 30')
        for i in range(6):
            manda(prx, 'apaga 250')
            await asyncio.sleep(4.0)
        manda(prx, 'oscila 8')
        await asyncio.sleep(1.5)
        k1 = await rt(A, "[NET49.lastTick, performance.now()]")
        cs = sorted(await rt(A, "window.__corr"))
        e5 = await rt(A, ESTADO)
        p = lambda q: round(cs[min(len(cs) - 1, int(q * len(cs)))], 2) if cs else None
        taxa = (k1[0] - k0[0]) * 1000 / (k1[1] - k0[1])
        out['ruim'] = {'quadros': len(cs), 'p50': p(.5), 'p95': p(.95), 'max': round(cs[-1], 1) if cs else None, 'servidor_passos_s': round(taxa, 2)}
        P.confere(e5['playing'] and e5['ws'] and len(cs) > 300 and p(.5) < 1.5,
                  '%s · 24 s de internet ruim (± 30 ms, um soluço de 250 ms a cada 4 s): a partida segue sem cair; correção da previsão p50 %.2f px, p95 %.1f px, a maior %.0f px'
                  % (nome, p(.5), p(.95), cs[-1] if cs else -1), out['ruim'])
        # (o servidor da v92 anda 60 passos/s; depois de um engasgo do processo de mais de 5 passos ele pula o resto, como um
        # quadro perdido — num computador de teste carregado isso tira alguns décimos; a v91 andava 60,7 a 61,2)
        P.confere(58 <= taxa <= 60.5, '%s · o servidor andou %.2f passos/s nesses 25 s (visto do aparelho, pelo número do passo de cada quadro; o certo é 60)' % (nome, taxa), [k0, k1])

        # 6) a consistência: todo mundo parado
        await rt(A, PARA)
        await rt(Bp, "(() => { joy.id = null; joy.dx = joy.dy = 0; return 1; })()")
        await asyncio.sleep(2.5)
        vA = await rt(A, r"""(() => { const s = window.__snap, eu = NET49.localSlot;
          return {tick:s.tick, srv:s.players.map(v => [v[0], v[1]]), bola:[s.ball[0], s.ball[1]], placar:s.score.slice(),
                  tela:{eu:[VIS.px, VIS.py], bola:[VIS.bx, VIS.by], outros:RQ.jog.map(q => [q.x, q.y])},
                  prev:typeof V92N !== 'undefined' && V92N.on ? {eu:[V92N.M.jog[eu].x, V92N.M.jog[eu].y], bola:[V92N.M.B.x, V92N.M.B.y]} : null, eu}; })()""")
        vB = await rt(Bp, r"""(() => { const s = window.__snap; return {tick:s.tick, srv:s.players.map(v => [v[0], v[1]]), bola:[s.ball[0], s.ball[1]], placar:s.score.slice(),
                  tela:{eu:[VIS.px, VIS.py], bola:[VIS.bx, VIS.by], outros:RQ.jog.map(q => [q.x, q.y])}, eu:NET49.localSlot}; })()""")
        d = lambda a, b: math.hypot(a[0] - b[0], a[1] - b[1])
        dif = {
            'Ana: a tampinha dela na tela × o servidor': d(vA['tela']['eu'], vA['srv'][vA['eu']]),
            'Ana: a bola na tela × o servidor': d(vA['tela']['bola'], vA['bola']),
            'Beto: a tampinha de Ana na tela × o servidor': d(vB['tela']['outros'][vA['eu']], vB['srv'][vA['eu']]),
            'Beto: a tampinha dele na tela × o servidor': d(vB['tela']['eu'], vB['srv'][vB['eu']]),
            'servidor visto por Ana × por Beto (as tampinhas)': max(d(a, b) for a, b in zip(vA['srv'], vB['srv'])),
            'servidor visto por Ana × por Beto (a bola)': d(vA['bola'], vB['bola']),
        }
        if vA['prev']:
            dif['Ana: o mundo da previsão × o servidor (a tampinha)'] = d(vA['prev']['eu'], vA['srv'][vA['eu']])
            dif['Ana: o mundo da previsão × o servidor (a bola)'] = d(vA['prev']['bola'], vA['bola'])
        out['consistencia'] = {k: round(v, 3) for k, v in dif.items()}
        P.confere(all(v < 0.5 for v in dif.values()) and vA['placar'] == vB['placar'],
                  '%s · com todo mundo parado, Ana, Beto e o servidor veem as tampinhas e a bola no mesmo lugar (a maior diferença %.3f px) e o mesmo placar %s'
                  % (nome, max(dif.values()), vA['placar']), out['consistencia'])
        for pg, quem in ((A, 'Ana'), (Bp, 'Beto')):
            er = [e for e in pg.erros if 'Failed to load resource' not in e]
            P.confere(not er, '%s · nenhum erro de JavaScript na sessão de %s' % (nome, quem), er[:3])
    finally:
        for pg in (A, Bp):
            try: await pg.b.close()
            except Exception: pass
    return out


async def principal():
    P = Placar('v92 · o online quando a internet falha (reconexão, correções e a consistência do servidor)')
    srv, prx, url, ws, ws_beto = sobe()
    res = {}
    try:
        async with async_playwright() as pw:
            res['v92'] = await rodada(pw, P, url, ws, ws_beto, prx, 'v92')
            manda(prx, 'oscila 8')
            res['v91'] = await rodada(pw, P, url, ws, ws_beto, prx, 'perfil v91', {'render': 'v91', 'dtSnap': False, 'fpsInteiro': False, 'previsao': 'v91', 'bolaPrev': 'servidor', 'zonaLiga': .2, 'zonaDesliga': .12, 'folgaDir': .05})
    finally:
        for p in (prx, srv):
            p.terminate()
            try: p.wait(5)
            except Exception: p.kill()
    print('\nas medidas (px do mundo; 1 u = 19 px; na tela do celular deitado ~0,5 px por px do mundo):')
    for k in ('soluco', 'apagao', 'queda', 'segundo_plano', 'ruim', 'consistencia'):
        print('  %-14s v92: %s\n  %-14s v91: %s' % (k, res.get('v92', {}).get(k), '', res.get('v91', {}).get(k)))
    return P.fim()


if __name__ == '__main__':
    sys.exit(asyncio.run(principal()))
