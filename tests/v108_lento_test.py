"""RACHA v108 · O ONLINE SEM CÂMERA LENTA — com o jogo de verdade no navegador, o servidor das salas e o 4G de mentira.

O pedido (05/11/2026): "às vezes o personagem fica lento do nada por uns segundos até clicar no pausar, aí sai o lag".
A cena: a Ana joga atrás do 4G de mentira (tests/v92_proxy.cjs --controle: 60 ms ± 15 em cada sentido) correndo para cima e
para baixo com o analógico apertado, perto da linha do próprio gol (longe da bola); a internet dela some por 2 s (o "apaga" do
proxy: nada passa, a conexão não cai) e volta. Mede, na tela da Ana, a cada quadro desenhado: onde a tampinha dela foi
desenhada (a velocidade desenhada, contra os 268 px/s da corrida) e o deslize da v96 (a distância entre a tampinha desenhada e
a prevista: a "mola"), o dela e o dos outros, e o tempo do replay de cada quadro do servidor.
  1) 1v1 numa sala (o Beto sem internet ruim, parado perto do gol dele);
  2) 4v4 contra bots com a CPU 5× mais lenta (o celular: Emulation.setCPUThrottlingRate) — o replay de cada quadro que chega
     junto pesa, e a mola dos outros também.
Cada cena roda ANTES (até 2 vezes: a câmera lenta depende de onde o apagão cai) e AGORA:
  · ANTES: o mesmo jogo com RACHA_CONFIG.lento108 = false (o cliente da v107) e o servidor com RACHA_RITMO=v107 (a janela de
    1 s com 120 comandos) e RACHA_MOTOR_ALCANCA=5 — ou, com RACHA_ANTES=<pasta>, o jogo e o servidor de outra
    cópia do repositório já montada (ex.: git worktree add --detach /tmp/antes antes-v108 && python3 tools/aplicar_rua.py);
  · AGORA: o jogo e o servidor desta cópia.
Confere: antes, depois que a internet volta, a tampinha desenhada fica atrás da prevista com a mola sumindo no teto de
velocidade da v96 (até 160 px/s) e o atraso acumulado de 70 px·s ou mais — a câmera lenta — (ou as outras tampinhas mais de
100 px atrás por mais de 1,5 s) e o servidor recusa os comandos do segundo seguinte ("ritmo"); agora a correção some sozinha (atrás por
até 1,3 s; o atraso acumulado — a soma da mola da volta até a correção da volta acabar — até 65 px·s; antes, 70 ou mais; a
correção da volta é o trecho acima de 2 u que começa até 1 s depois dela, com as ondas a menos de 0,3 s uma da outra juntas;
as correções de depois — no 4v4, os bots trombando na Ana — medidas à parte, nenhuma acima de 2 u por mais de 0,8 s), a
tampinha volta à corrida, nada é recusado e o replay da volta é um só por quadro da tela; e o jogo normal (antes do apagão) é
o mesmo ou melhor. ~3 min.
Uso: python3 tests/v108_lento_test.py [--so 1v1|4v4]      (RACHA_ANTES=<pasta> compara com outra cópia; RACHA_LINHA=1 mostra a
linha do tempo da mola, a cada 100 ms)"""
import asyncio, json, math, os, socket, subprocess, sys, time, pathlib
from comum import rt, async_playwright, FONTES, HARNESS, CHROME, Placar
from online_test import porta_livre, espera

AQUI = pathlib.Path(__file__).resolve().parent
RAIZ = AQUI.parent
ANTES = os.environ.get('RACHA_ANTES')
VEL = 14.1 * 19                      # px/s: a corrida da tampinha
U1 = 19                              # px: 1 u
JOGA = "NET49.playing && !NET49.host && NET49.localSlot >= 0 && NET49.lastTick > 0"

# a cada quadro desenhado: o instante, a tampinha desenhada (P), a mola da sua tampinha, a maior mola dos outros e o quadro
# do servidor (o tempo de cada quadro do servidor tratado: o replay)
GRAVA = r"""(() => {
  const R = window.__R = {f: [], s: []};
  const frameAntes = frame;
  frame = function(now){
    const r = frameAntes.apply(this, arguments);
    try {
      let mJ = 0; if (typeof V96R !== 'undefined') for (const d of V96R.J) if (d) mJ = Math.max(mJ, Math.hypot(d.x, d.y));
      R.f.push([performance.now(), P.x, P.y, typeof V96R !== 'undefined' ? Math.hypot(V96R.P.x, V96R.P.y) : -1, mJ, PAUSA.aberta ? 1 : 0]);
      if (R.f.length > 40000) R.f.splice(0, 10000);
    } catch (e) { R.erro = String(e && e.stack || e); }
    return r;
  };
  const snapAntes = net49Snapshot;
  net49Snapshot = function(s){
    const t0 = performance.now(), r = snapAntes.apply(this, arguments);
    try { R.s.push([t0, performance.now() - t0]); if (R.s.length > 40000) R.s.splice(0, 10000); } catch (e) {}
    return r;
  };
  return 1;
})()"""

# o dedo da Ana: primeiro vai para perto da linha do próprio gol (longe da bola e dos outros: nada de trombada no meio da
# medida) e lá corre com o analógico apertado para cima e para baixo, virando perto das linhas de fundo
CORRE = r"""(() => {
  const R = JOY.max*hud.joy.al; let s = P.y > CY ? -1 : 1;
  const alvo = P.x < CX ? LX0 + U(6) : LX1 - U(6);   // (a 6 u da linha do gol, fora das traves)
  clearInterval(window.__correT);
  window.__correT = setInterval(() => {
    if (PAUSA.aberta) return;
    if (P.y < GT + U(4) && s < 0) s = 1; else if (P.y > GB - U(4) && s > 0) s = -1;
    const dx = Math.max(-1, Math.min(1, (alvo - P.x) / U(2))), l = Math.hypot(dx, 1);
    joy.id = 77; joy.dx = dx / l * R; joy.dy = s / l * R;
  }, 16);
  return 1;
})()"""

# o dedo do Beto (na sala 1v1): vai para perto da linha do gol dele e fica parado (sem tocar na bola)
BETO = r"""(() => {
  const R = JOY.max*hud.joy.al;
  clearInterval(window.__betoT);
  window.__betoT = setInterval(() => {
    if (!NET49.playing || !RQ.on) return;
    const alvo = [P.x < CX ? LX0 + U(4) : LX1 - U(4), GT + U(4)];
    const dx = alvo[0] - P.x, dy = alvo[1] - P.y, d = Math.hypot(dx, dy);
    if (d < U(1)) { joy.id = null; joy.dx = joy.dy = 0; return; }
    joy.id = 77; joy.dx = dx/d*R; joy.dy = dy/d*R;
  }, 16);
  return 1;
})()"""


async def sessao(pw, url, nome, ws, config, pintar=True):
    b = await pw.chromium.launch(executable_path=CHROME, args=['--no-sandbox', '--autoplay-policy=no-user-gesture-required'])
    ctx = await b.new_context(viewport={'width': 1280, 'height': 720}, has_touch=True)
    await ctx.add_init_script("document.addEventListener('DOMContentLoaded',()=>{const s=document.createElement('style');s.textContent=%s;document.head.prepend(s);});" % json.dumps(FONTES))
    cfg = dict({'servidor': ws, 'presente': False}, **config)
    await ctx.add_init_script("window.RACHA_CONFIG = Object.assign(window.RACHA_CONFIG || {}, %s);" % json.dumps(cfg))
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
    if not pintar:
        await rt(pg, "(() => { render = function(){}; return 1; })()")
    pg.b = b
    return pg


def sobe(raiz, antes):
    """o servidor das salas (o servidor_visitantes de sempre) e o 4G de mentira da Ana; antes: o servidor como na v107"""
    porta, pproxy = porta_livre(), porta_livre()
    env = dict(os.environ); env.pop('RACHA_EXPERIMENTAL', None)
    for k in ('RACHA_RITMO', 'RACHA_MOTOR_ALCANCA'):
        env.pop(k, None)
    if antes and not ANTES:
        env.update(RACHA_RITMO='v107', RACHA_MOTOR_ALCANCA='5')
    srv = subprocess.Popen(['node', str(raiz / 'tests' / 'servidor_visitantes.cjs'), '--porta', str(porta), '--host', '127.0.0.1', '--memoria',
                            '--estaticos', str(raiz), '--nome', 'Lento v108', '--sem-p2p'], stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, env=env)
    prx = subprocess.Popen(['node', str(RAIZ / 'tests' / 'v92_proxy.cjs'), '--porta', str(pproxy), '--destino', str(porta), '--atraso', '60', '--oscila', '15', '--controle'],
                           stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    for _ in range(100):                             # (espera o servidor e o proxy atenderem: até 10 s)
        try:
            for pt in (porta, pproxy):
                socket.create_connection(('127.0.0.1', pt), timeout=0.5).close()
            break
        except OSError:
            time.sleep(0.1)
    time.sleep(0.3)
    return srv, prx, 'http://127.0.0.1:%d/tests/build/racha_teste.html' % porta, 'ws://127.0.0.1:%d' % pproxy, 'ws://127.0.0.1:%d' % porta


async def partida_1v1(pw, url, ws_ana, ws_beto, config):
    A = await sessao(pw, url, 'Ana', ws_ana, config); Bp = await sessao(pw, url, 'Beto', ws_beto, config, pintar=False)
    for pg in (A, Bp):
        await rt(pg, "abreTela('amigos')")
    await espera(A, "!!NET49.id", 10000); await espera(Bp, "!!NET49.id", 10000)
    await rt(A, "(() => { Object.assign(SX.form, {onde:'online', pub:true, n:1, map:0, jogo:'futebol', tempo:5, bots:false, nome:'v108'}); sxCriar(); return 1; })()")
    cod = await espera(A, "NET49.room && NET49.room.code", 8000)
    await rt(Bp, "(() => { net49Send({type:'join', code:%s, slot:1}); return 1; })()" % json.dumps(cod))
    await espera(A, "NET49.room && NET49.room.members.length === 2", 8000)
    await rt(A, "document.querySelector('.v70-sl-atalhos .entrar').click()")
    await espera(A, "NET49.room.roster.indexOf(NET49.id) >= 0 && NET49.room.roster.every(Boolean)", 8000)
    await rt(A, "slIniciar()")
    ok = await espera(A, JOGA, 10000) and await espera(Bp, JOGA, 10000)
    for pg in (A, Bp):
        await rt(pg, "(() => { filaPop.length = 0; if (!LB.pop.hidden) fechaPop(); return 1; })()")
    await rt(Bp, BETO)
    return A, [Bp], ok


async def partida_4v4(pw, url, ws_ana, config):
    A = await sessao(pw, url, 'Ana', ws_ana, config)
    await rt(A, "abreTela('amigos')")
    await espera(A, "!!NET49.id", 10000)
    await rt(A, "(() => { abrirLobby(); net49Send({type:'fila', n:4, pts:0}); return 1; })()")
    await asyncio.sleep(0.5)
    await rt(A, "(() => { net49Send({type:'fila_bots'}); return 1; })()")
    ok = await espera(A, JOGA, 15000)
    await rt(A, "(() => { filaPop.length = 0; if (!LB.pop.hidden) fechaPop(); return 1; })()")
    return A, [], ok


def mede(fr, ss, t_ap, ms_apagao):
    """t_ap: o começo do apagão (ms, o relógio da página). Devolve as medidas da cena."""
    t_volta = t_ap + ms_apagao + 60               # (a internet volta: o que ficou parado chega com o atraso do 4G)
    def vel(a, b):
        f = [x for x in fr if a <= x[0] < b]
        if len(f) < 3: return 0
        return sum(math.hypot(f[i][1] - f[i - 1][1], f[i][2] - f[i - 1][2]) for i in range(1, len(f))) / ((f[-1][0] - f[0][0]) / 1000)
    depois = [x for x in fr if x[0] >= t_volta]
    # a "câmera lenta": o tempo (s) depois da volta com a tampinha desenhada visivelmente atrás da prevista (a mola acima de 2 u).
    # A correção da volta é o trecho com a mola acima de 2 u que começa até 1 s depois da volta e vai até ela ficar abaixo de 2 u
    # por 0,3 s seguidos (as ondas da volta, mais perto que isso, contam juntas). Uma correção depois disso é outra (no 4v4 os
    # bots trombam na Ana e a previsão erra de novo, como no jogo normal): fica medida à parte, em `outras`
    i, n, ini, fim = 0, len(depois), None, None
    while i < n:                                      # 1) a correção da volta
        t, m = depois[i][0], depois[i][3]
        if ini is None:
            if t > t_volta + 1000: break
            if m > 2 * U1: ini = fim = t
        elif m > 2 * U1: fim = t
        elif t - fim >= 300: break
        i += 1
    outras, o_ini, o_fim, o_max = [], None, None, 0
    junta = lambda: [round((o_ini - t_volta) / 1000, 2), round((o_fim - o_ini) / 1000, 2), round(o_max)]
    while i < n and depois[i][0] < t_volta + 6000:    # 2) as de depois: cada trecho acima de 2 u, quando, quanto durou e até onde
        t, m = depois[i][0], depois[i][3]
        if m > 2 * U1:
            if o_ini is None: o_ini, o_max = t, 0
            o_fim, o_max = t, max(o_max, m)
        elif o_ini is not None and t - o_fim >= 300:
            outras.append(junta()); o_ini = None
        i += 1
    if o_ini is not None: outras.append(junta())
    lento_s = (fim - t_volta) / 1000 if ini is not None else 0.0
    t_fimv = fim if ini is not None else t_volta     # (o fim da correção da volta)
    some = next((x[0] for x in depois if x[0] > t_fimv and x[3] < U1), None)
    # a velocidade com que a mola some (px/s): a mediana, quadro a quadro, enquanto ela diminui acima de 2 u (a da v96 tem teto:
    # ~110 px/s; a da v108, acelerada, some o que falta em ~0,12 s)
    taxas = sorted((depois[k - 1][3] - depois[k][3]) / ((depois[k][0] - depois[k - 1][0]) / 1000) for k in range(1, len(depois))
                   if depois[k][3] > 2 * U1 and depois[k][3] < depois[k - 1][3] and depois[k][0] > depois[k - 1][0])
    escoa = taxas[len(taxas) // 2] if len(taxas) >= 3 else None
    antesJ = [x[4] for x in fr if t_ap - 2500 <= x[0] < t_ap]
    # os outros: o trecho seguido com a mola de alguém acima de 100 px que começa logo depois da volta (até 1 s) — a correção da
    # volta; os de depois são o jogo normal (no 4v4 com a CPU 5× mais lenta, os bots passam de 100 px de vez em quando)
    fimJ, ini = None, None
    for x in depois:
        if x[4] > 100:
            if ini is None:
                if x[0] > t_volta + 1000: break
                ini = x[0]
            fimJ = x[0]
        elif ini is not None:
            break
    return {
        'normal_vel': round(vel(t_ap - 2500, t_ap)),                  # px/s antes do apagão (a corrida)
        'normal_mola': round(max([x[3] for x in fr if t_ap - 2500 <= x[0] < t_ap] or [0])),
        'normal_molaJ': round(max(antesJ or [0])),
        'mola_max': round(max([x[3] for x in depois] or [0])),
        'lento_s': round(lento_s, 2),
        # o atraso acumulado (px·s): a soma da mola da sua tampinha, quadro a quadro, da volta até a correção da volta acabar
        # (abaixo de 1 u) — quanto e por quanto tempo a tampinha desenhada ficou atrás da prevista (a câmera lenta: centenas;
        # uma correção rápida: dezenas); area6: o mesmo nos 6 s depois da volta (com as outras correções)
        'area': round(sum(depois[k][3] * (depois[k][0] - depois[k - 1][0]) / 1000 for k in range(1, len(depois)) if depois[k][0] <= max(t_fimv, some or 0)), 1),
        'area6': round(sum(depois[k][3] * (depois[k][0] - depois[k - 1][0]) / 1000 for k in range(1, len(depois)) if depois[k][0] < t_volta + 6000), 1),
        'outras': outras,                             # [começo (s depois da volta), quanto durou (s), até quantos px]
        'acima100_s': round(((lambda L: (L[-1][0] - t_volta) / 1000 if L else 0.0)([x for x in depois if x[3] > 100])), 2),
        'escoa': round(escoa) if escoa is not None else None,
        'some_s': round((some - t_volta) / 1000, 2) if some else None,   # até a mola ficar abaixo de 1 u
        'vel_volta': round(vel(t_volta, t_volta + 2000)),             # px/s nos 2 s depois da volta
        'vel_depois': round(vel(t_volta + 1200, t_volta + 3200)),     # px/s de 1,2 a 3,2 s depois da volta
        'molaJ_max': round(max([x[4] for x in depois] or [0])),
        'lentoJ_s': round((fimJ - t_volta) / 1000, 2) if fimJ else 0.0,
        'replay_ms': round(sum(s[1] for s in ss if t_volta <= s[0] < t_volta + 1000), 1),   # o tempo dos quadros do servidor tratados no 1º segundo
        # (a linha do tempo: a cada 100 ms a partir do apagão, a maior mola da sua tampinha e dos outros, e os quadros desenhados)
        'linha': [[round((a - t_ap) / 1000, 1), round(max([x[3] for x in fr if a <= x[0] < a + 100] or [0])), round(max([x[4] for x in fr if a <= x[0] < a + 100] or [0])),
                   len([x for x in fr if a <= x[0] < a + 100])] for a in [t_ap + 100 * k for k in range(0, 60)]],
        'quadros': len([x for x in fr if t_volta <= x[0] < t_volta + 2000]),
    }


async def cena(pw, nome, antes, cpu=1):
    raiz = pathlib.Path(ANTES) if (antes and ANTES) else RAIZ
    config = {'lento108': False} if (antes and not ANTES) else {}
    srv, prx, url, ws_ana, ws_beto = sobe(raiz, antes)
    A, outros, out = None, [], {}
    try:
        if nome == '1v1':
            A, outros, ok = await partida_1v1(pw, url, ws_ana, ws_beto, config)
        else:
            A, outros, ok = await partida_4v4(pw, url, ws_ana, config)
        out['comecou'] = bool(ok)
        await rt(A, GRAVA); await rt(A, CORRE)
        cdp = await A.context.new_cdp_session(A)
        if cpu > 1:
            await cdp.send('Emulation.setCPUThrottlingRate', {'rate': cpu})
        await asyncio.sleep(5.0)                                           # o jogo normal (a Ana chega perto do gol e corre)
        if not antes and not ANTES:
            await rt(A, "(() => { if (window.RachaLento108Jogo) RachaLento108Jogo.zera(); return 1; })()")
        t_ap = await rt(A, "performance.now()")
        prx.stdin.write('apaga 2000\n'); prx.stdin.flush()              # a internet da Ana some por 2 s
        await asyncio.sleep(2.0 + 6.0)
        await cdp.send('Emulation.setCPUThrottlingRate', {'rate': 1})
        fr = await rt(A, "window.__R.f")
        ss = await rt(A, "window.__R.s")
        out.update(mede(fr, ss, t_ap, 2000))
        out['lento108'] = await rt(A, "window.RachaLento108Jogo ? RachaLento108Jogo.estado() : null")
        out['erros'] = A.erros[:5] + [e for o in outros for e in o.erros[:3]]
        out['grava_erro'] = await rt(A, "window.__R.erro || ''")
    finally:
        for pg in ([A] if A else []) + outros:
            try: await pg.b.close()
            except Exception: pass
        prx.terminate(); srv.terminate()
        try:
            txt = srv.communicate(timeout=3)[0]
        except Exception:
            txt = ''
        out['ritmo'] = len([l for l in txt.splitlines() if 'suspeito' in l and 'ritmo' in l])
    return out


async def principal():
    P = Placar('v108 · o online sem câmera lenta (no navegador)')
    so = sys.argv[sys.argv.index('--so') + 1] if '--so' in sys.argv else None
    print('(antes: ' + ('a cópia em ' + ANTES if ANTES else 'o mesmo jogo com lento108: false e o servidor com RACHA_RITMO=v107 e RACHA_MOTOR_ALCANCA=5') + ')')
    async with async_playwright() as pw:
        for nome, cpu in (('1v1', 1), ('4v4', 5)):
            if so and so != nome: continue
            print('\n%s) %s%s: a internet da Ana some por 2 s' % ('1' if nome == '1v1' else '2', nome, ' com a CPU %d× mais lenta (o celular)' % cpu if cpu > 1 else ''))
            # (antes: a câmera lenta depende de onde o apagão cai — os comandos recusados da volta; até 2 tentativas)
            lenta = lambda m: (m.get('area', 0) >= 70 and (m.get('escoa') or 999) <= 160) or m.get('lentoJ_s', 0) >= 1.5
            a = await cena(pw, nome, True, cpu); tent = 1
            if not lenta(a):
                a = await cena(pw, nome, True, cpu); tent = 2
            d = await cena(pw, nome, False, cpu)
            for rot, m in (('antes', a), ('agora', d)):
                print('  %-5s · o jogo normal: %4d px/s, a mola %3d px (os outros %3d) · depois da volta: a mola até %3d px, atrás (acima de 2 u) por %.2f s, abaixo de 1 u em %s s, sumindo a %s px/s, atraso acumulado %.0f px·s; %3d px/s de 1,2 a 3,2 s · os outros: até %3d px, %.2f s acima de 100 px · o replay %5.1f ms no 1º s · %d recusados' % (
                    rot, m.get('normal_vel', 0), m.get('normal_mola', 0), m.get('normal_molaJ', 0), m.get('mola_max', 0), m.get('lento_s', 0), m.get('some_s'), m.get('escoa'), m.get('area', 0), m.get('vel_depois', 0),
                    m.get('molaJ_max', 0), m.get('lentoJ_s', 0), m.get('replay_ms', 0), m.get('ritmo', 0)))
                print('          (nos 6 s depois da volta: o atraso acumulado %.0f px·s; as outras correções acima de 2 u — começo, duração (s), px: %s)' % (
                    m.get('area6', 0), json.dumps(m.get('outras', []))))
                if os.environ.get('RACHA_LINHA'):            # (a linha do tempo da mola, a cada 100 ms desde o apagão: t, sua, outros, quadros)
                    print('        ' + ' '.join('%.1f:%d/%d/%d' % tuple(x) for x in m.get('linha', [])))
            P.confere(a.get('comecou') and d.get('comecou'), nome + ': as duas partidas começaram', (a.get('comecou'), d.get('comecou')))
            # (a câmera lenta: a mola sumindo no teto da v96 — até 160 px/s — por 0,6 s ou mais; ou os outros longe por 1,5 s)
            lim_d, some_d = 1.3, 1.5                         # (a correção da volta e, às vezes, uma segunda menor logo depois)
            P.confere(lenta(a),
                      nome + ' antes: a câmera lenta — depois da volta da internet a tampinha desenhada fica %.1f s atrás da prevista (até %d px; o atraso acumulado %.0f px·s), a mola sumindo a %s px/s (o teto da v96); as outras tampinhas, %.1f s mais de 100 px atrás (até %d px)%s' % (
                          a.get('lento_s', 0), a.get('mola_max', 0), a.get('area', 0), a.get('escoa'), a.get('lentoJ_s', 0), a.get('molaJ_max', 0), ' — na 2ª tentativa' if tent > 1 else ''), a)
            if not ANTES:
                P.confere(a.get('ritmo', 0) >= 1, nome + ' antes: e o servidor recusou os comandos do segundo seguinte como "ritmo" (%d linhas)' % a.get('ritmo', 0), a.get('ritmo'))
            # (as correções que vêm depois da da volta — os bots trombando, no 4v4 — também curtas: nenhuma acima de 2 u por mais
            #  de 0,8 s; a câmera lenta de antes passava de 1 s)
            longas = [o for o in d.get('outras', []) if o[1] > 0.8]
            P.confere(d.get('lento_s', 9) <= lim_d and d.get('some_s') is not None and d['some_s'] <= some_d and d.get('area', 999) <= 65 and not longas,
                      nome + ' agora: sem câmera lenta — a correção da volta some sozinha (atrás por %.2f s, até %d px; abaixo de 1 u em %s s; o atraso acumulado %.0f px·s, antes %.0f), sem pausar; as correções de depois, curtas (%d, a mais longa %.2f s)' % (
                          d.get('lento_s', 9), d.get('mola_max', 0), d.get('some_s'), d.get('area', 0), a.get('area', 0), len(d.get('outras', [])), max([o[1] for o in d.get('outras', [])] or [0])), d)
            if nome == '1v1':                                # (no 4v4 os bots trombam e fazem gol: a velocidade desenhada não diz nada)
                P.confere(d.get('vel_depois', 0) >= 0.88 * VEL,
                          nome + ' agora: e a tampinha volta à corrida (%d px/s de 1,2 a 3,2 s depois da volta; antes %d)' % (d.get('vel_depois', 0), a.get('vel_depois', 0)), d.get('vel_depois'))
            P.confere(d.get('lentoJ_s', 9) <= 1.2,
                      nome + ' agora: as outras tampinhas também (acima de 100 px por %.2f s; antes %.2f s)' % (d.get('lentoJ_s', 9), a.get('lentoJ_s', 0)), (a.get('lentoJ_s'), d.get('lentoJ_s')))
            P.confere(d.get('ritmo', 1) == 0, nome + ' agora: o servidor não recusou nenhum comando (a rajada do apagão passa no balde)', d.get('ritmo'))
            if nome == '4v4':
                P.confere(d.get('replay_ms', 999) < max(40.0, 0.25 * a.get('replay_ms', 0)),
                          nome + ' agora: o replay da volta uma vez por quadro da tela: %.0f ms no 1º segundo (antes %.0f ms, com a CPU %d× mais lenta)' % (d.get('replay_ms', 0), a.get('replay_ms', 0), cpu), (a.get('replay_ms'), d.get('replay_ms')))
            # (no 4v4 os bots trombam na Ana: lá só a mola; no 1v1, a corrida também)
            vel_ok = nome != '1v1' or (d.get('normal_vel', 0) >= 0.92 * VEL and d.get('normal_vel', 0) >= a.get('normal_vel', 0) - 0.05 * VEL)
            P.confere(vel_ok and d.get('normal_mola', 99) <= 2 * U1 and d.get('normal_mola', 99) <= a.get('normal_mola', 0) + U1,
                      nome + ': o jogo normal (antes do apagão) igual ou melhor — a corrida %d × %d px/s, a mola %d × %d px' % (a.get('normal_vel', 0), d.get('normal_vel', 0), a.get('normal_mola', 0), d.get('normal_mola', 0)), (a.get('normal_vel'), d.get('normal_vel'), a.get('normal_mola'), d.get('normal_mola')))
            est = d.get('lento108') or {}
            P.confere(bool(est.get('ativo')) and not est.get('erro') and est.get('replays', 0) > 0,
                      nome + ' agora: as partes da v108 ligadas e sem erro (%s replays, %s quadros juntados, prazo ligado P %s / J %s / B %s quadros)' % (est.get('replays'), est.get('juntados'), (est.get('aceleradas') or {}).get('P'), (est.get('aceleradas') or {}).get('J'), (est.get('aceleradas') or {}).get('B')), est)
            P.confere(not a.get('erros') and not d.get('erros') and not d.get('grava_erro'), nome + ': nenhum erro nas páginas', (a.get('erros'), d.get('erros'), d.get('grava_erro')))
    return P.fim()

sys.exit(asyncio.run(principal()))
