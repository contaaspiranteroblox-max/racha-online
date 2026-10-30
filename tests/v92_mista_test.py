"""RACHA v92 · UMA SALA MISTA: um celular com a v92 e outro ainda com a v91 (a página antiga guardada no aparelho) no
servidor v92 (passa/falha). Sobe o servidor da turma de verdade (com um "4G de mentira" de 40 ms ± 8 em cada sentido), abre
Ana com a v92 e Beto com a v91 ORIGINAL (o racha_teste.html da v91, servido por outro endereço, como uma página velha) e
confere: a partida começa para os dois; os dois andam e o outro vê; o chute de Beto (v91) sai no servidor; o de Ana (v92)
sai na hora na tela dela e Beto vê a bola andar; parados, os dois e o servidor veem tudo no mesmo lugar; nenhum erro.
Uso: python3 tests/v92_mista_test.py <racha_teste.html da v91 original>"""
import asyncio, json, math, os, pathlib, subprocess, sys, time
from comum import Placar, rt, async_playwright
from online_test import porta_livre, espera
import v92_online_medidas as MED
import v92_reconexao_test as REC
import v92_online_test as ON


async def principal(v91):
    P = Placar('v92 · a sala mista (Ana com a v92, Beto com a v91 original, no servidor v92)')
    v91 = pathlib.Path(v91).resolve()
    raiz91 = v91.parent.parent.parent                          # (a árvore da v91: tests/build/racha_teste.html)
    porta91 = porta_livre()
    est = subprocess.Popen([sys.executable, '-m', 'http.server', str(porta91), '--bind', '127.0.0.1'], cwd=str(raiz91), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    srv, prx, url, ws, ws_direto = REC.sobe()
    url91 = 'http://127.0.0.1:%d/%s' % (porta91, v91.relative_to(raiz91).as_posix())
    try:
        async with async_playwright() as pw:
            A = await MED.sessao(pw, url, 'Ana', ws); Bp = await MED.sessao(pw, url91, 'Beto', ws)
            try:
                versoes = [await rt(A, "typeof V92N !== 'undefined'"), await rt(Bp, "typeof V92N !== 'undefined'")]
                P.confere(versoes == [True, False], 'Ana abriu a v92 e Beto a v91 original', versoes)
                for pg in (A, Bp):
                    await rt(pg, "abreTela('amigos')")
                await espera(A, "!!NET49.id", 10000); await espera(Bp, "!!NET49.id", 10000)
                await rt(A, "(() => { Object.assign(SX.form, {onde:'online', pub:true, n:1, map:0, jogo:'futebol', tempo:0, bots:false, nome:'mista'}); sxCriar(); return 1; })()")
                cod = await espera(A, "NET49.room && NET49.room.code", 8000)
                await rt(Bp, "(() => { net49Send({type:'join', code:%s, slot:1}); return 1; })()" % json.dumps(cod))
                await espera(A, "NET49.room && NET49.room.members.length === 2", 8000)
                await rt(A, "document.querySelector('.v70-sl-atalhos .entrar').click()")
                await espera(A, "NET49.room.roster.indexOf(NET49.id) >= 0 && NET49.room.roster.every(Boolean)", 8000)
                await rt(A, "slIniciar()")
                ok = await espera(A, REC.JOGA, 10000) and await espera(Bp, REC.JOGA, 10000)
                for pg in (A, Bp):
                    await rt(pg, "(() => { filaPop.length = 0; if (!LB.pop.hidden) fechaPop(); return 1; })()")
                    await rt(pg, REC.GANCHO)
                on = await rt(A, "V92N.on")
                P.confere(ok and on, 'a partida começa para os dois (Ana com a previsão da v92 ligada)', [ok, on])
                # os dois andam e o outro vê
                sa = await rt(A, "NET49.localSlot"); sb = await rt(Bp, "NET49.localSlot")
                xa0 = await rt(Bp, "RQ.jog[%d].y" % sa); xb0 = await rt(A, "RQ.jog[%d].y" % sb)
                for pg in (A, Bp):
                    await rt(pg, "(() => { const R = JOY.max*hud.joy.al; joy.id = 77; joy.dx = 0; joy.dy = (P.y > CY ? -1 : 1)*R; return 1; })()")
                await asyncio.sleep(1.0)
                for pg in (A, Bp):
                    await rt(pg, "(() => { joy.id = null; joy.dx = joy.dy = 0; return 1; })()")
                await asyncio.sleep(0.6)
                xa1 = await rt(Bp, "RQ.jog[%d].y" % sa); xb1 = await rt(A, "RQ.jog[%d].y" % sb)
                u = await rt(A, "U(1)")
                P.confere(abs(xa1 - xa0) > 5 * u and abs(xb1 - xb0) > 5 * u, 'os dois andam e cada um vê o outro andar (%.0f e %.0f px em 1 s)' % (abs(xa1 - xa0), abs(xb1 - xb0)), [xa0, xa1, xb0, xb1])
                # Beto chuta na saída (a bola no meio do campo): se a saída for do time de Ana, um gol de teste para ela dá a
                # saída seguinte ao time de Beto (o gancho de teste do servidor: tests/ganchos_teste.cjs)
                if await rt(Bp, "RQ.saidaTime") != await rt(Bp, "P.time"):
                    await rt(A, "(() => { net49Send({type:'__teste_gol', time:P.time}); return 1; })()")
                    await espera(Bp, "RQ.estado === 'saida' && RQ.saidaTime === P.time && RQ.placar[0] + RQ.placar[1] === 1 ? 1 : 0", 10000)
                    await asyncio.sleep(0.5)
                c0 = await rt(Bp, "P.chuteT")
                await rt(Bp, MED.VAI + "('chuta', 0)")
                v = await espera(Bp, "window.__vai && window.__vai.fim ? window.__vai : null", 15000)
                await asyncio.sleep(0.8)
                c1 = await rt(Bp, "P.chuteT"); va_bola = await rt(A, "Math.hypot(window.__snap.ball[2], window.__snap.ball[3])")
                P.confere(bool(v and v.get('tToque')) and c1 != c0, 'Beto (v91) chuta na saída e o servidor registra o chute (Ana vê a bola andando)', [v, c0, c1, va_bola])
                await asyncio.sleep(1.5)
                ch = await ON.chute(A)
                bola_b = await rt(Bp, "Math.hypot(B.vx, B.vy)")
                P.confere(ch and ch['previsto_ms'] is not None and ch['previsto_ms'] < 60 and ch['servidor_confirmou'],
                          'Ana (v92) chuta: a bola sai na tela dela em %s ms e o servidor confirma' % (ch and ch['previsto_ms'] and round(ch['previsto_ms'])), ch)
                # parados: o mesmo lugar para os dois e o servidor
                for pg in (A, Bp):
                    await rt(pg, "(() => { joy.id = null; joy.dx = joy.dy = 0; return 1; })()")
                await espera(A, "Math.hypot(window.__snap.ball[2], window.__snap.ball[3]) < 1 ? 1 : 0", 15000)
                await asyncio.sleep(1.5)
                ver = r"""(() => { const s = window.__snap; return {srv:s.players.map(v => [v[0], v[1]]), bola:[s.ball[0], s.ball[1]], placar:s.score.slice(),
                           tela:{eu:[VIS.px, VIS.py], bola:[VIS.bx, VIS.by], jog:RQ.jog.map(q => [q.x, q.y])}, eu:NET49.localSlot}; })()"""
                va = await rt(A, ver); vb = await rt(Bp, ver)
                d = lambda a, b: math.hypot(a[0] - b[0], a[1] - b[1])
                dif = {'Ana: ela × servidor': d(va['tela']['eu'], va['srv'][sa]), 'Beto: ele × servidor': d(vb['tela']['eu'], vb['srv'][sb]),
                       'Ana vê Beto × servidor': d(va['tela']['jog'][sb], va['srv'][sb]), 'Beto vê Ana × servidor': d(vb['tela']['jog'][sa], vb['srv'][sa]),
                       'a bola: Ana × Beto': d(va['tela']['bola'], vb['tela']['bola']), 'o servidor visto por Ana × por Beto': max(d(x, y) for x, y in zip(va['srv'], vb['srv']))}
                P.confere(all(x < .5 for x in dif.values()) and va['placar'] == vb['placar'],
                          'parados, Ana (v92), Beto (v91) e o servidor veem as tampinhas e a bola no mesmo lugar (a maior diferença %.3f px) e o mesmo placar %s' % (max(dif.values()), va['placar']),
                          {k: round(x, 3) for k, x in dif.items()})
                for pg, quem in ((A, 'Ana (v92)'), (Bp, 'Beto (v91)')):
                    er = [e for e in pg.erros if 'Failed to load resource' not in e]
                    P.confere(not er, 'nenhum erro de JavaScript na sessão de %s' % quem, er[:3])
            finally:
                for pg in (A, Bp):
                    try: await pg.b.close()
                    except Exception: pass
    finally:
        for p in (prx, srv, est):
            p.terminate()
            try: p.wait(5)
            except Exception: p.kill()
    return P.fim()


if __name__ == '__main__':
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    sys.exit(asyncio.run(principal(sys.argv[1])))
