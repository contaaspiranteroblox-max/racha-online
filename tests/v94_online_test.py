"""RACHA v94 · O ONLINE COM O MOTOR PRÓPRIO: o servidor da turma de verdade com o motor próprio (RACHA_MOTOR_JOGO=v94), uma
sala 1v1 com o jogo de verdade em dois navegadores — Ana pelo "4G de mentira" (tests/v92_proxy.cjs: 40 ms e depois 150 ms em
cada sentido) e Beto direto. O gancho de teste do servidor (__teste_poe) põe a bola parada encostada na tampinha de Ana; o
jogo de Ana toca os botões em comandos escolhidos. Em cada atraso confere:
  1. a rodada vai no motor próprio nos dois aparelhos (o perfil resolvido da sala) e a previsão da v94 liga (a da v92 não);
  2. o CHUTE: a bola sai na hora na tela de Ana (a previsão) e o servidor chega na MESMA velocidade (vChute);
  3. o PASSE e o CHUTE no comando seguinte: a combinação na previsão e no servidor, com a mesma velocidade;
  4. a correção da bola e da tampinha de Ana na tela fica pequena (a previsão é a mesma conta do servidor);
  5. o ping não decide: com 40 ms e com 150 ms o servidor dá o mesmo;
  6. nenhum erro de JavaScript.
Uso: python3 tests/v94_online_test.py"""
import asyncio, json, os, subprocess, time
from comum import Placar, rt, async_playwright, RAIZ
from online_test import porta_livre, espera
import v92_online_medidas as MED
import v92_reconexao_test as REC

# o plano: o PASSE no comando seqP (k < 0: sem PASSE) e o CHUTE k comandos depois; guarda a bola da previsão a cada comando e
# a bola de cada quadro do servidor (em m/s)
PLANO = r"""((k, soChute) => {
  const base = window.__pBase || (window.__pBase = v94ComandoRede);
  const D = window.__p = {seqP:NET49.seq + 12, k, soChute, prev:[], srv:[], corrB:[], corrP:[]};
  v94ComandoRede = function(d){
    const s = NET49.seq + 1, D = window.__p;
    if (D && !D.soChute && s === D.seqP) BOTAO.kickL = true;
    if (D && s === D.seqP + D.k) BOTAO.powerL = true;
    const r = base.apply(this, arguments);
    if (D && V94N.W && s >= D.seqP - 2 && s <= D.seqP + 40){ const b = V94N.W.bola; D.prev.push([s, +Math.sqrt(b.vx*b.vx + b.vy*b.vy).toFixed(3)]); }
    return r;
  };
  if (!window.__pSnap){
    window.__pSnap = true; const s0 = net49Snapshot;
    net49Snapshot = function(s){
      const r = s0.apply(this, arguments), D = window.__p;
      try { if (D && s && s.ball){ D.srv.push([s.tick, s.players[NET49.localSlot][4], +(Math.hypot(s.ball[2], s.ball[3])/V94_PX).toFixed(3)]);
        if (V92.med.corrB && V92.med.corrB.length) D.corrB.push(V92.med.corrB[V92.med.corrB.length - 1]/V94_PX);
        if (V92.med.corr && V92.med.corr.length) D.corrP.push(V92.med.corr[V92.med.corr.length - 1]/V94_PX); } } catch (_) {}
      return r;
    };
  }
  return D.seqP;
})"""


def sobe(atraso):
    porta = porta_livre(); pproxy = porta_livre()
    env = dict(os.environ); env['RACHA_EXPERIMENTAL'] = '1'; env['RACHA_MOTOR_JOGO'] = 'v94'
    log = open('/tmp/v94_online_srv_%d.log' % porta, 'w+')
    srv = subprocess.Popen(['node', str(RAIZ / 'tests' / 'servidor_visitantes.cjs'), '--porta', str(porta), '--host', '127.0.0.1', '--memoria',
                            '--estaticos', str(RAIZ), '--nome', 'Teste v94', '--sem-p2p'], stdout=log, stderr=subprocess.STDOUT, text=True, env=env)
    prx = subprocess.Popen(['node', str(RAIZ / 'tests' / 'v92_proxy.cjs'), '--porta', str(pproxy), '--destino', str(porta), '--atraso', str(atraso), '--oscila', '0'],
                           stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, text=True)
    time.sleep(1.0)
    return srv, prx, log, 'http://127.0.0.1:%d/tests/build/racha_teste.html' % porta, 'ws://127.0.0.1:%d' % pproxy, 'ws://127.0.0.1:%d' % porta


async def sala(pw, url, ws, ws_beto):
    A = await MED.sessao(pw, url, 'Ana', ws); Bp = await MED.sessao(pw, url, 'Beto', ws_beto)
    for pg in (A, Bp):
        await rt(pg, "abreTela('amigos')")
    await espera(A, "!!NET49.id", 10000); await espera(Bp, "!!NET49.id", 10000)
    await rt(A, "(() => { Object.assign(SX.form, {onde:'online', pub:true, n:1, map:0, jogo:'futebol', tempo:0, bots:false, nome:'v94'}); sxCriar(); return 1; })()")
    cod = await espera(A, "NET49.room && NET49.room.code", 8000)
    await rt(Bp, "(() => { net49Send({type:'join', code:%s, slot:1}); return 1; })()" % json.dumps(cod))
    await espera(A, "NET49.room && NET49.room.members.length === 2", 8000)
    await rt(A, "document.querySelector('.v70-sl-atalhos .entrar').click()")
    await espera(A, "NET49.room.roster.indexOf(NET49.id) >= 0 && NET49.room.roster.every(Boolean)", 8000)
    await rt(A, "slIniciar()")
    ok = await espera(A, REC.JOGA, 10000) and await espera(Bp, REC.JOGA, 10000)
    for pg in (A, Bp):
        await rt(pg, "(() => { filaPop.length = 0; if (!LB.pop.hidden) fechaPop(); return 1; })()")
    await espera(A, "V94N.base === true", 6000)
    est = await rt(A, "({rodada:NET49.room.motorRodada, sala:V94.sala, motor:V94.motor, v94:V94N.on, v92:V92N.on, R:!!NET49.room.fisica94, igual:JSON.stringify(NET49.room.fisica94) === JSON.stringify(V94.R), rj:R_JOG})")
    estB = await rt(Bp, "({rodada:NET49.room.motorRodada, motor:V94.motor, v94:V94N.on})")
    return A, Bp, ok, est, estB


async def tentativa(A, k, so_chute=False):
    await rt(A, "(() => { net49Send({type:'__teste_poe', u:3.1, dx:-8, dy:6, vert:true}); return 1; })()")   # (o chute vai para a lateral de cima)
    await asyncio.sleep(0.6)
    seqP = await rt(A, PLANO + "(%d, %s)" % (k, 'true' if so_chute else 'false'))
    await espera(A, "window.__p.srv.some(s => s[1] >= %d)" % (seqP + 30), 6000)
    await asyncio.sleep(0.2)
    D = await rt(A, "window.__p")
    pv = max([v for s, v in D['prev'] if s >= seqP] or [0])
    sv = max([v for t, a, v in D['srv'] if a >= seqP] or [0])
    return {'prev': pv, 'srv': sv, 'corrB': round(max(D['corrB'] or [0]), 3), 'corrP': round(max(D['corrP'] or [0]), 3), 'n': len(D['srv'])}


async def principal():
    P = Placar('v94 · o online com o motor próprio: a previsão de Ana × o servidor, a 40 e a 150 ms')
    res = {}
    async with async_playwright() as pw:
        for atraso in (40, 150):
            srv, prx, log, url, ws, ws_beto = sobe(atraso)
            try:
                A, Bp, ok, est, estB = await sala(pw, url, ws, ws_beto)
                try:
                    P.confere(ok and est['rodada'] == 'v94' and est['sala'] == 'v94' and est['motor'] == 'v94' and est['v94'] and not est['v92'] and est['igual'] and abs(est['rj'] - 38) < 1e-9,
                              '%d ms: a rodada vai no motor próprio, com o perfil da sala, e a previsão da v94 liga (a da v92 não)' % atraso, est)
                    P.confere(estB['rodada'] == 'v94' and estB['motor'] == 'v94', '%d ms: o Beto também está no motor próprio' % atraso, estB)
                    R = await rt(A, "({vChute:V94.R.vChute, vPasse:V94.R.vPasse, fRol:V94.R.fRol, freio:V94.R.freioPasso})")
                    r = res[atraso] = {'chute': await tentativa(A, 0, True), 'combo': await tentativa(A, 1), 'R': R}
                    r['erros'] = [e for e in A.erros + Bp.erros if 'Failed to load resource' not in e]
                finally:
                    for pg in (A, Bp):
                        try: await pg.b.close()
                        except Exception: pass
            finally:
                for p in (prx, srv):
                    p.terminate()
                    try: p.wait(5)
                    except Exception: p.kill()
                log.close()
            print('   %d ms: CHUTE → previsão %.3f · servidor %.3f m/s · PASSE → CHUTE → %.3f · %.3f · correções: bola %.3f m, tampinha %.3f m'
                  % (atraso, r['chute']['prev'], r['chute']['srv'], r['combo']['prev'], r['combo']['srv'], max(r['chute']['corrB'], r['combo']['corrB']), max(r['chute']['corrP'], r['combo']['corrP'])))
        R0 = res[40]['R']
        um = lambda v: v*R0['fRol'] - R0['freio']                 # (um passo de freio)
        # o quadro do servidor sai a cada 2 passos: a bola que ele mostra pode ter um passo de freio a mais que a da previsão
        igual = lambda a, b: min(abs(a - b), abs(um(a) - b), abs(a - um(b))) < 0.005
        for atraso in (40, 150):
            r = res[atraso]; vC = r['R']['vChute']
            P.confere(abs(r['chute']['prev'] - um(vC)) < 0.005 and igual(r['chute']['prev'], r['chute']['srv']), '%d ms: o CHUTE sai na hora na tela de Ana (%.3f m/s) e o servidor dá o mesmo (%.3f)' % (atraso, r['chute']['prev'], r['chute']['srv']), r['chute'])
            P.confere(r['combo']['prev'] > vC + 0.5 and igual(r['combo']['prev'], r['combo']['srv']), '%d ms: o PASSE → CHUTE combina na tela e no servidor (%.3f · %.3f)' % (atraso, r['combo']['prev'], r['combo']['srv']), r['combo'])
            P.confere(max(r['chute']['corrB'], r['combo']['corrB']) < 0.2 and max(r['chute']['corrP'], r['combo']['corrP']) < 0.2, '%d ms: a correção na tela de Ana fica abaixo de 0,2 m (a bola e a tampinha; o mesmo limite de 1 u do teste do DB online da v92)' % atraso, r)
        P.confere(igual(res[40]['chute']['srv'], res[150]['chute']['srv']) and igual(res[40]['combo']['srv'], res[150]['combo']['srv']), 'com 40 ms e com 150 ms o servidor decide o mesmo', {k: (v['chute']['srv'], v['combo']['srv']) for k, v in res.items()})
        P.confere(all(not v['erros'] for v in res.values()), 'nenhum erro de JavaScript', {k: v['erros'][:2] for k, v in res.items() if v['erros']})
    return P.fim()


if __name__ == '__main__':
    raise SystemExit(asyncio.run(principal()))
