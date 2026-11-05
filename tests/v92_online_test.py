"""RACHA v92 · o online com a previsão do núcleo (passa/falha). Sobe o servidor da turma de verdade com um "4G de mentira"
(tests/v92_proxy.cjs: 40 ms em cada sentido, ± 8) e joga uma sala 1v1 com o jogo de verdade em dois navegadores. Confere:
  1. a sala do servidor v92 manda o núcleo e o perfil da física (o padrão: os números da v91 + o toque armado e a rede);
  2. quem joga prevê com o núcleo: a sua tampinha bate com o servidor (correção média < 1 px);
  3. o CHUTE sai na tela de quem chutou na hora do toque (< 60 ms), com o som e a piscada, e o servidor confirma;
  4. o servidor oficial (sem RACHA_EXPERIMENTAL) não aceita o perfil do admin;
  5. o servidor de testes (RACHA_EXPERIMENTAL=1) aceita: a velocidade 18 u/s e 60 quadros/s valem no servidor e na previsão;
  6. com a previsão da v91 no painel (previsao: 'v91') o jogo joga como antes no servidor v92;
  7. nenhum erro de JavaScript.
Uso: python3 tests/v92_online_test.py"""
import asyncio, json, os, subprocess, sys, time
from comum import Placar, rt, async_playwright, RAIZ
from online_test import porta_livre, espera
import v92_online_medidas as MED

JOGA = "NET49.playing && !NET49.host && NET49.localSlot >= 0 && NET49.lastTick > 0"


def sobe(experimental):
    porta = porta_livre(); pproxy = porta_livre()
    env = dict(os.environ)
    if experimental:
        env['RACHA_EXPERIMENTAL'] = '1'
    else:
        env.pop('RACHA_EXPERIMENTAL', None)
    srv = subprocess.Popen(['node', str(RAIZ / 'tests' / 'servidor_visitantes.cjs'), '--porta', str(porta), '--host', '127.0.0.1', '--memoria',
                            '--estaticos', str(RAIZ), '--nome', 'Teste v92', '--sem-p2p'], stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, env=env)
    prx = subprocess.Popen(['node', str(RAIZ / 'tests' / 'v92_proxy.cjs'), '--porta', str(pproxy), '--destino', str(porta), '--atraso', '40', '--oscila', '8'],
                           stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    time.sleep(1.0)
    return srv, prx, 'http://127.0.0.1:%d/tests/build/racha_teste.html' % porta, 'ws://127.0.0.1:%d' % pproxy


async def sala(pw, url, ws, config=None, cfg_cliente=None):
    A = await MED.sessao(pw, url, 'Ana', ws); Bp = await MED.sessao(pw, url, 'Beto', ws)
    if cfg_cliente:
        await rt(A, "(() => { V92.cfg = v92Limpa(Object.assign({}, V92.cfg, %s)); v92Aplica(); return 1; })()" % json.dumps(cfg_cliente))
    for pg in (A, Bp):
        await rt(pg, "abreTela('amigos')")
    await espera(A, "!!NET49.id", 10000); await espera(Bp, "!!NET49.id", 10000)
    await rt(A, "(() => { Object.assign(SX.form, {onde:'online', pub:true, n:1, map:0, jogo:'futebol', tempo:0, bots:false, nome:'v92'}); sxCriar(); return 1; })()")
    cod = await espera(A, "NET49.room && NET49.room.code", 8000)
    await rt(Bp, "(() => { net49Send({type:'join', code:%s, slot:1}); return 1; })()" % json.dumps(cod))
    await espera(A, "NET49.room && NET49.room.members.length === 2", 8000)
    await rt(A, "document.querySelector('.v70-sl-atalhos .entrar').click()")
    await espera(A, "NET49.room.roster.indexOf(NET49.id) >= 0 && NET49.room.roster.every(Boolean)", 8000)
    if config:
        await rt(A, "(() => { net49Send(Object.assign({type:'config'}, %s)); return 1; })()" % json.dumps(config))
        await asyncio.sleep(0.6)
    sala0 = await rt(A, "({nucleo:NET49.room.nucleo, fisica:NET49.room.fisica, quadros:NET49.room.quadros, experimental:NET49.room.experimental})")
    await rt(A, "slIniciar()")
    ok = await espera(A, JOGA, 10000) and await espera(Bp, JOGA, 10000)
    for pg in (A, Bp):
        await rt(pg, "(() => { filaPop.length = 0; if (!LB.pop.hidden) fechaPop(); return 1; })()")
    return A, Bp, sala0, ok


async def saida_e_canto(A, Bp):
    saida = await rt(A, "RQ.saidaTime"); tA = await rt(A, "P.time")
    quem = A if tA == saida else Bp
    await rt(quem, MED.VAI + "('conduz', 400)")
    await espera(quem, "window.__vai && window.__vai.fim", 14000)
    tB = await rt(Bp, "P.time")
    await rt(Bp, MED.VAIPARA + "(%r, %r)" % (0.92 if tB == 1 else 0.08, 0.92))
    await espera(Bp, "window.__para", 8000)
    await asyncio.sleep(0.5)


async def chute(A):
    """A vai até a bola e toca no CHUTE; devolve (ms até o chute previsto, ms até o servidor confirmar) ou None"""
    for _ in range(3):
        await espera(A, "Math.hypot(B.vx, B.vy) < 60 ? 1 : 0", 8000)
        c0 = await rt(A, "({ct:P.chuteT, fx:V92N.fx.t})")
        await rt(A, MED.VAI + "('chuta', 0)")
        v = await espera(A, "window.__vai && window.__vai.fim ? window.__vai : null", 15000)
        if not v or not v.get('tToque'):
            continue
        await asyncio.sleep(0.8)
        r = await rt(A, "({ct:P.chuteT, fx:V92N.fx.t, on:V92N.on})")
        prev = r['fx'] - v['tToque'] if r['fx'] != c0['fx'] else None
        return {'previsto_ms': prev, 'servidor_confirmou': r['ct'] != c0['ct'], 'previsao_ligada': r['on']}
    return None


async def principal():
    P = Placar('v92 · o online com a previsão do núcleo (servidor de verdade, 40 ms ± 8 em cada sentido)')
    async with async_playwright() as pw:
        # ---------------------------------------------------------------- o servidor oficial (sem RACHA_EXPERIMENTAL)
        srv, prx, url, ws = sobe(False)
        sess = []
        try:
            print('\n1) a sala do servidor v92')
            A, Bp, s0, ok = await sala(pw, url, ws, config={'fisica': {'velJog': 18}, 'quadros': 60})
            sess += [A, Bp]
            f = s0['fisica'] or {}
            P.confere(ok and s0['nucleo'] == 'v92.1', 'a sala manda o núcleo (v92.1) e a partida começa', s0['nucleo'])
            P.confere(f.get('velJog') == 14.1 and f.get('bufferToque') == 6 and f.get('jogRede') == 1 and s0['quadros'] == 60,
                      'o perfil da sala é o padrão (14,1 u/s, toque armado de 6 passos, a rede segura) e 60 quadros/s (a v105; eram 30)', {k: f.get(k) for k in ('velJog', 'bufferToque', 'jogRede')})
            P.confere(not s0['experimental'], 'o servidor oficial não aceita o perfil do admin (mandou 18 u/s e 60/s: ficou o padrão)', s0)
            on = await rt(A, "V92N.on")
            P.confere(on, 'quem joga prevê com o núcleo (V92N ligado)', on)
            await saida_e_canto(A, Bp)
            print('\n2) a previsão da sua tampinha')
            await rt(A, "(() => { V92.med.corr.length = 0; return 1; })()")
            await rt(A, MED.ANDA + "(%s, %d)" % (json.dumps([0, 90, 180, 270, 45, 225]), 400))
            await espera(A, "window.__andaFim", 10000)
            cm = await rt(A, "(() => { const c = V92.med.corr; return {n:c.length, media:c.reduce((a, b) => a + b, 0)/Math.max(1, c.length), max:Math.max(0, ...c)}; })()")
            P.confere(cm['n'] > 20 and cm['media'] < 1, 'correndo em 6 direções, a correção média da sua tampinha é %.2f px (máx. %.1f px) em %d quadros do servidor' % (cm['media'], cm['max'], cm['n']), cm)
            print('\n3) o CHUTE na hora do toque')
            ch = await chute(A)
            P.confere(ch and ch['previsto_ms'] is not None and ch['previsto_ms'] < 60, 'a bola sai na tela de quem chutou em %s ms depois do toque' % (ch and ch['previsto_ms'] and round(ch['previsto_ms'])), ch)
            P.confere(ch and ch['servidor_confirmou'], 'o servidor confirma o chute (o quadro dele chega com o chute)', ch)
            print('\n3b) um erro na previsão não trava o jogo (volta o caminho da v91)')
            await rt(A, "(() => { const p = V92_NUC.passo; V92_NUC.passo = function(){ V92_NUC.passo = p; throw new Error('teste v92: um erro de mentira na previsão'); };"
                        " window.__lt0 = NET49.lastTick; return 1; })()")
            await asyncio.sleep(0.5)
            caiu = await rt(A, "({on:V92N.on, py:P.y, cy:CY, px:P.x})")
            await rt(A, MED.ANDA + "(%s, %d)" % (json.dumps([270 if caiu['py'] > caiu['cy'] else 90]), 700))
            await espera(A, "window.__andaFim", 6000)
            await asyncio.sleep(0.3)
            seg = await rt(A, "({lt:NET49.lastTick - window.__lt0, playing:NET49.playing, mexeu:Math.abs(P.y - %r)/U(1)})" % caiu['py'])
            P.confere(caiu['on'] is False and seg['playing'] and seg['lt'] > 20 and seg['mexeu'] > 3,
                      'com um erro na previsão, ela desliga sozinha e a partida segue pelo caminho da v91 (a tampinha andou %.1f u depois)' % seg['mexeu'], [caiu, seg])
            erros = [e for pg in sess for e in pg.erros]
            P.confere(not erros, 'nenhum erro de JavaScript', erros[:3])
        finally:
            for pg in sess:
                try:
                    await pg.b.close()
                except Exception:
                    pass
            srv.terminate(); prx.terminate()
        # ---------------------------------------------------------------- o servidor de testes (RACHA_EXPERIMENTAL=1)
        srv, prx, url, ws = sobe(True)
        sess = []
        try:
            print('\n4) o servidor de testes aceita o perfil do admin')
            A, Bp, s0, ok = await sala(pw, url, ws, config={'fisica': {'velJog': 18}, 'quadros': 60})
            sess += [A, Bp]
            f = s0['fisica'] or {}
            P.confere(ok and s0['experimental'] and f.get('velJog') == 18 and s0['quadros'] == 60, 'a sala de testes ficou com 18 u/s e 60 quadros/s', {'velJog': f.get('velJog'), 'quadros': s0['quadros']})
            await saida_e_canto(A, Bp)
            await rt(A, "(() => { V92.med.corr.length = 0; window.__vv = []; window.__qq = []; const n0 = NET49.lastTick, t0 = performance.now();"
                        " window.__qt = () => ({ticks:NET49.lastTick - n0, s:(performance.now() - t0)/1000}); return 1; })()")
            await rt(A, MED.ANDA + "(%s, %d)" % (json.dumps([0, 180, 0]), 500))
            await asyncio.sleep(0.35)
            vel = await rt(A, "(() => { const q = RQ.jog[NET49.localSlot]; return {vs:Math.hypot(V92N.M.jog[V92N.slot].vx, V92N.M.jog[V92N.slot].vy)/U(1), C:V92N.C.VEL_JOG/U(1), velJog:VEL_JOG/U(1)}; })()")
            await espera(A, "window.__andaFim", 8000)
            qd = await rt(A, "window.__qt()")
            # (o ritmo do servidor visto daqui: numa janela de ~1,7 s a chegada dos quadros pela internet de mentira, com o
            # computador ocupado, mexe uns 10% na conta; com 8 s o erro fica abaixo de 2%)
            await asyncio.sleep(max(0, 8 - qd['s']))
            qd = await rt(A, "window.__qt()")
            cm = await rt(A, "(() => { const c = V92.med.corr; return {n:c.length, media:c.reduce((a, b) => a + b, 0)/Math.max(1, c.length)}; })()")
            P.confere(abs(vel['C'] - 18) < 1e-9 and abs(vel['velJog'] - 18) < 1e-9 and abs(vel['vs'] - 18) < .5, 'a previsão e o jogo usam os 18 u/s da sala (a tampinha corre a %.1f u/s)' % vel['vs'], vel)
            P.confere(cm['n'] > 40 and cm['media'] < 1, 'com 60 quadros/s a previsão continua batendo com o servidor (correção média %.2f px em %d quadros)' % (cm['media'], cm['n']), cm)
            hz = qd['ticks'] / max(.1, qd['s'])
            P.confere(55 <= hz <= 65, 'o servidor anda %.1f passos por segundo' % hz, qd)
            for pg in sess:
                await pg.b.close()
            sess = []
            print('\n5) com a previsão da v91 escolhida no painel')
            A, Bp, s0, ok = await sala(pw, url, ws, cfg_cliente={'previsao': 'v91'})
            sess += [A, Bp]
            on = await rt(A, "V92N.on")
            P.confere(ok and not on, 'previsao v91: o jogo usa o caminho da v91 (a previsão do núcleo desligada)', on)
            await saida_e_canto(A, Bp)
            ch = await chute(A)
            P.confere(ch and ch['servidor_confirmou'], 'e o chute continua saindo no servidor', ch)
            erros = [e for pg in sess for e in pg.erros]
            P.confere(not erros, 'nenhum erro de JavaScript', erros[:3])
        finally:
            for pg in sess:
                try:
                    await pg.b.close()
                except Exception:
                    pass
            srv.terminate(); prx.terminate()
    return P.fim()

if __name__ == '__main__':
    sys.exit(asyncio.run(principal()))
