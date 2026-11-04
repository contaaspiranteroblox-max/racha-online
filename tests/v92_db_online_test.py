"""RACHA v92 · O DB ONLINE: o servidor da turma de verdade (o de testes, RACHA_EXPERIMENTAL=1, para a sala aceitar o perfil),
uma sala 1v1 com o jogo de verdade em dois navegadores — Ana pelo "4G de mentira" (tests/v92_proxy.cjs, 40 ms e depois
150 ms em cada sentido) e Beto direto. O gancho de teste do servidor (tests/ganchos_teste.cjs: __teste_poe) põe a bola
parada encostada na tampinha de Ana; o jogo de Ana aperta o PASSE e o CHUTE em comandos escolhidos (o CHUTE no comando
seguinte, ou os dois no mesmo comando com o CHUTE 3 ms depois pelo relógio do toque). Com o DB atual e com o DB por estados
(o perfil da sala com dbModo 1), em cada atraso, confere:
  1. a previsão de Ana (a bola que ela vê na hora) e o servidor (a bola dos quadros) chegam ao mesmo resultado: por estados
     o DB sai nos dois (46,75 u/s); no DB atual só o PASSE (o servidor não aceita dois chutes em passos seguidos, e a
     previsão agora também não mostra);
  2. no mesmo comando: por estados vale o PASSE, no atual o CHUTE — igual na previsão e no servidor;
  3. a correção da bola na tela de Ana fica pequena (sem a bola sair e voltar);
  4. o mesmo resultado com 40 ms e com 150 ms de atraso em cada sentido: o ping não decide o DB;
  5. o registro de "chute_rapido" no servidor: nenhum por estados.
Uso: python3 tests/v92_db_online_test.py"""
import asyncio, json, os, subprocess, time
from comum import Placar, rt, async_playwright, RAIZ
from online_test import porta_livre, espera
import v92_online_medidas as MED
import v92_reconexao_test as REC

PERFIL = {'dbModo': 1}
# o plano: o PASSE no comando seqP e o CHUTE k comandos depois (k = 0: no mesmo comando, 3 ms depois pelo relógio do toque);
# guarda a bola da previsão de Ana a cada comando e a bola de cada quadro do servidor
PLANO = r"""((k) => {
  const base = window.__dbBase || (window.__dbBase = v92Comando);
  const D = window.__db = {seqP:NET49.seq + 12, k, prev:[], srv:[], corr:[]};
  v92Comando = function(d){
    const s = NET49.seq + 1, D = window.__db;
    if (D && s === D.seqP){ BOTAO.kickL = true; V92D.tP = performance.now(); }
    if (D && s === D.seqP + D.k){ BOTAO.powerL = true; V92D.tC = D.k === 0 ? V92D.tP + 3 : performance.now(); }
    const r = base.apply(this, arguments);
    if (D && s >= D.seqP - 2 && s <= D.seqP + 40){ const B = V92N.M.B; D.prev.push([s, +(Math.hypot(B.vx, B.vy)/U(1)).toFixed(2)]); }
    return r;
  };
  if (!window.__dbSnap){
    window.__dbSnap = true; const s0 = net49Snapshot;
    net49Snapshot = function(s){
      const r = s0.apply(this, arguments), D = window.__db;
      try { if (D && s && s.ball){ D.srv.push([s.tick, s.players[NET49.localSlot][4], +(Math.hypot(s.ball[2], s.ball[3])/U(1)).toFixed(2)]); if (V92.med.corrB && V92.med.corrB.length) D.corr.push(V92.med.corrB[V92.med.corrB.length - 1]/U(1)); } } catch (_) {}
      return r;
    };
  }
  return D.seqP;
})"""


def sobe(atraso):
    porta = porta_livre(); pproxy = porta_livre()
    env = dict(os.environ); env['RACHA_EXPERIMENTAL'] = '1'
    log = open('/tmp/v92_db_online_srv_%d.log' % porta, 'w+')
    srv = subprocess.Popen(['node', str(RAIZ / 'tests' / 'servidor_visitantes.cjs'), '--porta', str(porta), '--host', '127.0.0.1', '--memoria',
                            '--estaticos', str(RAIZ), '--nome', 'Teste DB', '--sem-p2p'], stdout=log, stderr=subprocess.STDOUT, text=True, env=env)
    prx = subprocess.Popen(['node', str(RAIZ / 'tests' / 'v92_proxy.cjs'), '--porta', str(pproxy), '--destino', str(porta), '--atraso', str(atraso), '--oscila', '0'],
                           stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, text=True)
    time.sleep(1.0)
    return srv, prx, log, 'http://127.0.0.1:%d/tests/build/racha_teste.html' % porta, 'ws://127.0.0.1:%d' % pproxy, 'ws://127.0.0.1:%d' % porta


async def sala(pw, url, ws, ws_beto, perfil):
    A = await MED.sessao(pw, url, 'Ana', ws); Bp = await MED.sessao(pw, url, 'Beto', ws_beto)
    for pg in (A, Bp):
        await rt(pg, "abreTela('amigos')")
    await espera(A, "!!NET49.id", 10000); await espera(Bp, "!!NET49.id", 10000)
    await rt(A, "(() => { Object.assign(SX.form, {onde:'online', pub:true, n:1, map:0, jogo:'futebol', tempo:0, bots:false, nome:'db'}); sxCriar(); return 1; })()")
    cod = await espera(A, "NET49.room && NET49.room.code", 8000)
    await rt(Bp, "(() => { net49Send({type:'join', code:%s, slot:1}); return 1; })()" % json.dumps(cod))
    await espera(A, "NET49.room && NET49.room.members.length === 2", 8000)
    if perfil:
        await rt(A, "(() => { net49Send({type:'config', fisica:Object.assign({}, V92_NUC.PERFIL_V92, %s)}); return 1; })()" % json.dumps(perfil))
        await espera(A, "NET49.room && NET49.room.fisica && NET49.room.fisica.dbModo === 1", 6000)
    await rt(A, "document.querySelector('.v70-sl-atalhos .entrar').click()")
    await espera(A, "NET49.room.roster.indexOf(NET49.id) >= 0 && NET49.room.roster.every(Boolean)", 8000)
    await rt(A, "slIniciar()")
    ok = await espera(A, REC.JOGA, 10000) and await espera(Bp, REC.JOGA, 10000)
    for pg in (A, Bp):
        await rt(pg, "(() => { filaPop.length = 0; if (!LB.pop.hidden) fechaPop(); return 1; })()")
        await rt(pg, REC.GANCHO)
    modo = await rt(A, "({sala:NET49.room.fisica ? NET49.room.fisica.dbModo : null, prev:V92N.C ? V92N.C.DB_MODO : null, on:V92N.on})")
    return A, Bp, ok, modo


async def tentativa(A, k):
    await rt(A, "(() => { net49Send({type:'__teste_poe', u:3.02, dx:-8, dy:6, vert:true}); return 1; })()")   # (o chute vai para a lateral de cima)
    await asyncio.sleep(0.6)                                            # (o quadro com a bola parada chega e a previsão volta para ele)
    seqP = await rt(A, PLANO + "(%d)" % k)
    await espera(A, "window.__db.srv.some(s => s[1] >= %d)" % (seqP + 30), 6000)
    await asyncio.sleep(0.2)
    D = await rt(A, "window.__db")
    pv = max([v for s, v in D['prev'] if s >= seqP] or [0])
    sv = max([v for t, a, v in D['srv'] if a >= seqP] or [0])
    corr = max(D['corr'] or [0])
    return {'prev': pv, 'srv': sv, 'corr_u': round(corr, 2), 'n_srv': len(D['srv'])}


async def principal():
    P = Placar('v92 · o DB online: a previsão de Ana × o servidor, com o DB atual e o por estados, a 40 e 150 ms')
    res = {}
    async with async_playwright() as pw:
        for atraso in (40, 150):
            for nome, perfil in (('atual', None), ('estados', PERFIL)):
                srv, prx, log, url, ws, ws_beto = sobe(atraso)
                try:
                    A, Bp, ok, modo = await sala(pw, url, ws, ws_beto, perfil)
                    try:
                        P.confere(ok and modo['on'] and modo['prev'] == (1 if perfil else 0) and (modo['sala'] or 0) == (1 if perfil else 0),
                                  '%d ms · DB %s: a sala começa com o perfil certo e a previsão da v92 ligada' % (atraso, nome), modo)
                        r = res[(atraso, nome)] = {'seguinte': await tentativa(A, 1), 'mesmo': await tentativa(A, 0)}
                        er = [e for e in A.erros + Bp.erros if 'Failed to load resource' not in e]
                        r['erros'] = er
                    finally:
                        for pg in (A, Bp):
                            try: await pg.b.close()
                            except Exception: pass
                finally:
                    for p in (prx, srv):
                        p.terminate()
                        try: p.wait(5)
                        except Exception: p.kill()
                    log.seek(0); txt = log.read(); log.close()
                    res[(atraso, nome)]['susp'] = txt.count('chute_rapido')
                print('   %d ms · DB %-7s: CHUTE no comando seguinte → previsão %.2f · servidor %.2f u/s (correção da bola %.2f u) · no mesmo comando → %.2f · %.2f · registros chute_rapido: %d'
                      % (atraso, nome, r['seguinte']['prev'], r['seguinte']['srv'], r['seguinte']['corr_u'], r['mesmo']['prev'], r['mesmo']['srv'], res[(atraso, nome)]['susp']))

        print('\n1-3) a previsão de Ana × o servidor')
        perto = lambda a, b: abs(a - b) < 1.0   # (o quadro do servidor sai a cada 2 passos: a bola já freou um passo, 1%)
        for atraso in (40, 150):
            e, a = res[(atraso, 'estados')], res[(atraso, 'atual')]
            P.confere(e['seguinte']['prev'] > 46 and perto(e['seguinte']['prev'], e['seguinte']['srv']),
                      '%d ms · por estados: o CHUTE no comando seguinte ao PASSE dá o DB na tela de Ana na hora (%.2f u/s) e no servidor (%.2f)' % (atraso, e['seguinte']['prev'], e['seguinte']['srv']), e['seguinte'])
            P.confere(perto(e['mesmo']['prev'], 21.25) and perto(e['mesmo']['srv'], 21.25),
                      '%d ms · por estados: os dois no mesmo comando (o CHUTE 3 ms depois): vale o PASSE na tela e no servidor (%.2f · %.2f)' % (atraso, e['mesmo']['prev'], e['mesmo']['srv']), e['mesmo'])
            P.confere(perto(a['seguinte']['prev'], 21.25) and perto(a['seguinte']['srv'], 21.25),
                      '%d ms · DB atual: só o PASSE, na tela e no servidor (%.2f · %.2f): a previsão não mostra mais o DB que o servidor recusava' % (atraso, a['seguinte']['prev'], a['seguinte']['srv']), a['seguinte'])
            P.confere(perto(a['mesmo']['prev'], 36) and perto(a['mesmo']['srv'], 36),   # (v103: o CHUTE 340 → 360: a bola sai a 36 u/s)
                      '%d ms · DB atual: no mesmo comando vale o CHUTE, na tela e no servidor (%.2f · %.2f)' % (atraso, a['mesmo']['prev'], a['mesmo']['srv']), a['mesmo'])
            P.confere(all(x[c]['corr_u'] < 1.0 for x in (e, a) for c in ('seguinte', 'mesmo')),
                      '%d ms: a correção da bola na tela de Ana fica abaixo de 1 u em todas (a bola não sai e volta)' % atraso,
                      {n: {c: res[(atraso, n)][c]['corr_u'] for c in ('seguinte', 'mesmo')} for n in ('atual', 'estados')})
        print('\n4-5) o ping não decide; os registros do servidor')
        P.confere(all(perto(res[(40, n)][c]['srv'], res[(150, n)][c]['srv']) for n in ('atual', 'estados') for c in ('seguinte', 'mesmo')),
                  'com 40 ms e com 150 ms em cada sentido o servidor decide o mesmo em todas as jogadas', {k: (v['seguinte']['srv'], v['mesmo']['srv']) for k, v in res.items()})
        P.confere(res[(40, 'estados')]['susp'] == 0 and res[(150, 'estados')]['susp'] == 0,
                  'por estados o servidor não registra "chute_rapido" (no DB atual: %d e %d registros — o CHUTE armado tentando no passo seguinte)' % (res[(40, 'atual')]['susp'], res[(150, 'atual')]['susp']))
        P.confere(all(not v['erros'] for v in res.values()), 'nenhum erro de JavaScript', {k: v['erros'][:2] for k, v in res.items() if v['erros']})
    return P.fim()


if __name__ == '__main__':
    raise SystemExit(asyncio.run(principal()))
