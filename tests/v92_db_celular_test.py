"""RACHA v92 · O DB (PASSE + CHUTE) COM TOQUES DE VERDADE NO CELULAR DE MENTIRA (passa/falha).
O Chromium faz de conta que é um Android deitado (915 × 412, toque) e os dedos chegam pelo caminho de um dedo de verdade
(CDP Input.dispatchTouchEvent → pointerdown no canvas do jogo), COM O RELÓGIO DO TOQUE: cada toque leva o instante que o
teste manda (o event.timeStamp do jogo), então dá para pôr o CHUTE 3 ms depois do PASSE no mesmo quadro. O relógio dos
quadros é o de mentira dos testes da v92 (1 quadro = 1 passo da física a 60 Hz). No treino, com o DB atual e com o DB por
estados (o perfil com dbModo 1), confere:
  1. de pé, a bola encostada: PASSE e o CHUTE no quadro seguinte — o DB atual não sai (o intervalo de 20 ms entre trocas de
     botão engole o CHUTE); por estados sai, com a bola no teto;
  2. por estados, no mesmo quadro: o PASSE 3 ms antes → vale o PASSE e o CHUTE é anulado; o CHUTE 3 ms antes → vale o
     CHUTE e o PASSE é anulado; segurando o PASSE (já saiu) e tocando o CHUTE no quadro seguinte → DB; o CHUTE 2 quadros
     depois → não pega (a bola parada já saiu do alcance);
  3. chegando correndo na bola parada (o analógico com outro dedo): PASSE e CHUTE 2 quadros depois — o DB atual sai, por
     estados não (a proteção da bola parada); na parede o DB 3 quadros depois sai nos dois;
  4. o medidor do DB: as tentativas com o intervalo entre os dedos pelo relógio do toque, e a varredura da tela de toque
     medida pelos eventos do dedo no analógico (o teste manda o dedo a 120 Hz);
  5. a versão de testes: a parte DB do painel e o botão DB: ATUAL ⇄ POR ESTADOS na pausa;
  6. a versão oficial (sem experimental): sem nada disso, o DB atual mesmo com um ajuste guardado no aparelho.
Uso: python3 tests/v92_db_celular_test.py"""
import asyncio, json, math, time
from comum import Placar, rt, async_playwright, PAGINA
import v92_celular_test as CEL
from v92_celular_test import abre_cel, quadros, POE, GEO

MODO = r"""(m => { V92.cfg.fisica = V92_NUC.perfilLimpo(Object.assign({}, V92.cfg.fisica, {dbModo:m})); v92Aplica(); resetBotoes(); return V92_FIS.DB_MODO; })"""
# de pé, a bola parada encostada (3,02 u entre os centros), longe das linhas
PARADO = POE + "(CX, CY, CX + R_JOG + R_BOLA + U(.02), CY, 0, 0)"
CHUTES = "window.__nk.map(k => ({forte:k.forte, np:k.np, v:+(k.v/U(1)).toFixed(2)}))"


class Relogio:
    """o relógio do toque que o teste dá a cada dedo (segundos, como o CDP quer)"""
    def __init__(self):
        self.t = time.time()

    def agora(self, mais_ms=0.0):
        self.t += 0.05 + mais_ms / 1000
        return self.t


class Dedos(CEL.Dedos):
    async def _manda(self, tipo, ts=None):
        pts = [{'x': x, 'y': y, 'id': i, 'radiusX': 9, 'radiusY': 9, 'force': 1} for i, (x, y) in self.vivos.items()]
        m = {'type': tipo, 'touchPoints': pts}
        if ts is not None:
            m['timestamp'] = ts
        await self.cdp.send('Input.dispatchTouchEvent', m)

    async def poe(self, i, x, y, ts=None):
        self.vivos[i] = (x, y); await self._manda('touchStart', ts)

    async def move(self, i, x, y, ts=None):
        self.vivos[i] = (x, y); await self._manda('touchMove', ts)

    async def tira(self, i, ts=None):
        x, y = self.vivos.pop(i)
        m = {'type': 'touchEnd', 'touchPoints': [{'x': x, 'y': y, 'id': i, 'radiusX': 9, 'radiusY': 9, 'force': 1}]}
        if ts is not None:
            m['timestamp'] = ts
        await self.cdp.send('Input.dispatchTouchEvent', m)


async def novos_chutes(pg, n0):
    return (await rt(pg, CHUTES))[n0:]


async def par(pg, d, g, rel, dt_ms, quadros_entre, primeiro='p', segura_p=False):
    """PASSE e CHUTE (ou o contrário) com dt_ms entre os dedos; quadros_entre = 0 no mesmo quadro, 1 no seguinte..."""
    n0 = len(await rt(pg, CHUTES))
    a, b = ('kick', 'power') if primeiro == 'p' else ('power', 'kick')
    t1 = rel.agora()
    await d.poe(5, g[a]['x'], g[a]['y'], ts=t1)
    if quadros_entre:
        await quadros(pg, quadros_entre)
    await d.poe(6, g[b]['x'], g[b]['y'], ts=t1 + dt_ms / 1000)
    await quadros(pg, 1)
    if not segura_p:
        await d.tira(5, ts=t1 + (dt_ms + 30) / 1000)
    await d.tira(6, ts=t1 + (dt_ms + 40) / 1000)
    await quadros(pg, 2)
    if segura_p:
        await d.tira(5, ts=t1 + (dt_ms + 60) / 1000)
    await quadros(pg, 8)
    return await novos_chutes(pg, n0)


def db(ks):
    return len(ks) >= 2 and not ks[0]['forte'] and ks[1]['forte']


async def correndo(pg, d, g, rel, quadros_c, parede=False):
    """o analógico segurado (dedo 1) para a bola parada; ao entrar no alcance, 3 quadros empurrando, PASSE e o CHUTE
    quadros_c quadros depois. parede: a bola encostada na linha de cima e a tampinha embaixo, subindo."""
    if parede:
        await rt(pg, POE + "(CX + U(6), LY0 + R_BOLA + R_JOG + R_BOLA + U(3.5), CX + U(6), LY0 + R_BOLA, 0, 0)")
        ang = -math.pi / 2
    else:
        await rt(pg, POE + "(CX - U(4) - R_JOG - R_BOLA, CY, CX, CY, 0, 0)")
        ang = 0.0
    n0 = len(await rt(pg, CHUTES))
    x0, y0, R = g['joy']['x'], g['joy']['y'], g['joyR'] * .92
    await d.poe(1, x0, y0, ts=rel.agora()); await quadros(pg, 1)
    await d.move(1, x0 + R * math.cos(ang), y0 + R * math.sin(ang), ts=rel.agora()); await quadros(pg, 1)
    for _ in range(80):
        if await rt(pg, "Math.hypot(B.x - P.x, B.y - P.y) <= ALCANCE_CHUTE"):
            break
        await quadros(pg, 1)
    await quadros(pg, 3)
    t1 = rel.agora()
    await d.poe(5, g['kick']['x'], g['kick']['y'], ts=t1); await quadros(pg, 1)
    await d.tira(5, ts=t1 + .02)
    if quadros_c > 1:
        await quadros(pg, quadros_c - 1)
    await d.poe(6, g['power']['x'], g['power']['y'], ts=t1 + quadros_c / 60); await quadros(pg, 1)
    await d.tira(6, ts=t1 + quadros_c / 60 + .02)
    await quadros(pg, 8)
    await d.tira(1, ts=rel.agora()); await quadros(pg, 4)
    return await novos_chutes(pg, n0)


async def principal():
    P = Placar('v92 · o DB (PASSE + CHUTE) com toques de verdade: o DB atual × o DB por estados')
    async with async_playwright() as pw:
        b, pg, d0, erros = await abre_cel(pw, PAGINA, 'Android', config={'experimental': True})
        d = Dedos(d0.cdp)
        rel = Relogio()
        try:
            g = await rt(pg, GEO)
            r = {}
            for modo in (0, 1):
                await rt(pg, MODO + "(%d)" % modo)
                await rt(pg, "(() => { V92D.tent.length = 0; return 1; })()")
                await rt(pg, PARADO); r[(modo, 'seguinte')] = await par(pg, d, g, rel, 16, 1)
                await rt(pg, PARADO); r[(modo, 'mesmo_p')] = await par(pg, d, g, rel, 3, 0)
                await rt(pg, PARADO); r[(modo, 'mesmo_c')] = await par(pg, d, g, rel, 3, 0, primeiro='c')
                await rt(pg, PARADO); r[(modo, 'segura')] = await par(pg, d, g, rel, 16, 1, segura_p=True)
                await rt(pg, PARADO); r[(modo, 'dois')] = await par(pg, d, g, rel, 33, 2)
                r[(modo, 'correndo')] = await correndo(pg, d, g, rel, 2)
                r[(modo, 'parede')] = await correndo(pg, d, g, rel, 3, parede=True)
                r[(modo, 'tent')] = await rt(pg, "V92D.tent.map(t => ({res:t.res, k:t.k, dt:t.dt == null ? null : +t.dt.toFixed(2), ctx:t.ctx, modo:t.modo}))")
            fmt = lambda ks: ' '.join(('C' if k['forte'] else 'P') + '%.1f' % k['v'] for k in ks) or '—'
            for k in ('seguinte', 'mesmo_p', 'mesmo_c', 'segura', 'dois', 'correndo', 'parede'):
                print('   %-9s atual: %-16s por estados: %s' % (k, fmt(r[(0, k)]), fmt(r[(1, k)])))

            print('\n1) de pé, a bola encostada: PASSE e o CHUTE no quadro seguinte (16 ms)')
            P.confere(not db(r[(0, 'seguinte')]) and len(r[(0, 'seguinte')]) == 1, 'DB atual: só o PASSE sai (o intervalo de 20 ms entre trocas de botão engole o CHUTE)', r[(0, 'seguinte')])
            s1 = r[(1, 'seguinte')]
            P.confere(db(s1) and s1[1]['np'] - s1[0]['np'] == 1 and s1[1]['v'] > 46.75, 'por estados: o DB sai — o CHUTE no passo seguinte ao PASSE; os dois impulsos somam %.1f u/s e a bola sai no teto (46,75)' % (s1[1]['v'] if len(s1) > 1 else 0), s1)

            print('\n2) por estados: a ordem, o consumo e a janela')
            P.confere(len(r[(1, 'mesmo_p')]) == 1 and not r[(1, 'mesmo_p')][0]['forte'], 'no mesmo quadro, o PASSE 3 ms antes: vale o PASSE, o CHUTE é anulado', r[(1, 'mesmo_p')])
            P.confere(len(r[(1, 'mesmo_c')]) == 1 and r[(1, 'mesmo_c')][0]['forte'], 'no mesmo quadro, o CHUTE 3 ms antes: vale o CHUTE (a prioridade é dele), o PASSE é anulado', r[(1, 'mesmo_c')])
            P.confere(len(r[(0, 'mesmo_p')]) == 1 and r[(0, 'mesmo_p')][0]['forte'], '   (no DB atual, no mesmo quadro vale sempre o CHUTE)', r[(0, 'mesmo_p')])
            P.confere(db(r[(1, 'segura')]), 'segurando o PASSE (ele já saiu e não vale mais) e tocando o CHUTE no quadro seguinte: DB', r[(1, 'segura')])
            P.confere(len(r[(1, 'dois')]) == 1, 'o CHUTE 2 quadros depois do PASSE: não pega (a bola parada já saiu do alcance)', r[(1, 'dois')])

            print('\n3) chegando correndo na bola parada, e na parede (o analógico com outro dedo)')
            P.confere(db(r[(0, 'correndo')]), 'DB atual: PASSE e o CHUTE 2 quadros depois, correndo atrás da bola: o DB sai (o fácil de hoje)', r[(0, 'correndo')])
            P.confere(len(r[(1, 'correndo')]) == 1 and not r[(1, 'correndo')][0]['forte'], 'por estados: o mesmo lance não dá DB (a proteção da bola parada: o CHUTE fora da janela é anulado)', r[(1, 'correndo')])
            P.confere(db(r[(0, 'parede')]) and db(r[(1, 'parede')]), 'na parede, o CHUTE 3 quadros depois: o DB sai nos dois (a parede segue a física)', [r[(0, 'parede')], r[(1, 'parede')]])

            print('\n4) o medidor do DB e a varredura da tela de toque')
            t1 = r[(1, 'tent')]
            dbs = [t for t in t1 if t['res'] == 'DB']
            anul = {t['res'] for t in t1}
            P.confere(dbs and all(t['k'] == 1 for t in dbs if t['ctx'] == 0) and any(t['dt'] is not None and abs(t['dt'] - 16) < .2 for t in dbs) and any(t['ctx'] == 2 for t in dbs),
                      'por estados: o medidor registra os DBs — de pé, o CHUTE 1 passo depois com os dedos a 16 ms pelo relógio do toque; na parede, 3 passos depois', dbs)
            P.confere({'anulaMesmoPasso', 'anulaPasse', 'foraDaJanela'} <= anul, 'e as anulações: no mesmo passo (o CHUTE e o PASSE) e fora da janela', sorted(anul))
            P.confere(any(t['res'] == 'DB' and t['modo'] == 'atual' for t in r[(0, 'tent')]), 'no DB atual o medidor também mostra o DB que saiu', r[(0, 'tent')])
            # o dedo no analógico a 120 Hz (8,33 ms entre as leituras)
            await rt(pg, "(() => { V92D.vs.length = 0; return 1; })()")
            x0, y0 = g['joy']['x'], g['joy']['y']; tb = rel.agora()
            await d.poe(1, x0, y0, ts=tb)
            for i in range(1, 61):
                await d.move(1, x0 + 30 * math.cos(i / 6), y0 + 30 * math.sin(i / 6), ts=tb + i / 120)
                if i % 8 == 0:
                    await quadros(pg, 1)
            await d.tira(1, ts=tb + .6); await quadros(pg, 2)
            v = await rt(pg, "v92DbVarredura()")
            P.confere(v and abs(v['ms'] - 1000 / 120) < .3, 'a varredura da tela de toque medida pelos eventos do dedo: %.2f ms (o teste mandou 120 Hz = 8,33 ms)' % (v['ms'] if v else -1), v)

            print('\n5) a versão de testes: o painel e a pausa')
            await rt(pg, "(() => { ajxAbre('v92'); V92P.sub = 'db'; v92PainelSync(); return 1; })()")
            pn = await rt(pg, r"""(() => { const p = V92P.partes.db; return {existe:!!p, visivel:!!p && !p.hidden, linhas:p ? p.querySelectorAll('.v92p-dbl').length : 0,
                  texto:p ? (p.querySelector('.v92p-dbmed') || {}).textContent : '', varredura:V92P.dbVar ? V92P.dbVar.textContent : '',
                  faixas:Object.keys(V92P.faixas).filter(k => k.slice(0, 3) === 'db-').length, modo:(V92P.segs.dbm.querySelector('.on') || {}).textContent}; })()""")
            P.confere(pn['existe'] and pn['visivel'] and pn['linhas'] >= 5 and 'DB ✓' in pn['texto'] and '120 Hz' in pn['varredura'] and pn['faixas'] == 9,
                      'a parte DB do painel: a mecânica (%s), 9 ajustes, o medidor com %d tentativas e a varredura (≈ 120 Hz)' % (pn['modo'], pn['linhas']), pn)
            await rt(pg, "(() => { ajxFecha(); return 1; })()")
            pz = g['pausa']
            await d.poe(7, pz[0], pz[1], ts=rel.agora()); await quadros(pg, 1); await d.tira(7, ts=rel.agora()); await quadros(pg, 1)
            await quadros(pg, 32)
            antes = await rt(pg, "({aberta:PAUSA.aberta, modo:V92.cfg.fisica.dbModo, botao:(document.getElementById('pa-v92db') || {}).textContent})")
            bt = await pg.evaluate("(() => { const b = document.getElementById('pa-v92db'); if (!b || b.hidden) return null; const q = b.getBoundingClientRect(); return [q.left + q.width/2, q.top + q.height/2]; })()")
            if bt:
                await d.poe(8, bt[0], bt[1], ts=rel.agora()); await d.tira(8, ts=rel.agora())
                await pg.wait_for_timeout(80); await quadros(pg, 1)
            depois = await rt(pg, "({modo:V92.cfg.fisica.dbModo, fis:V92_FIS.DB_MODO, botao:document.getElementById('pa-v92db').textContent, curto:v92Curto(V92.cfg)})")
            P.confere(antes['aberta'] and bt and antes['modo'] != depois['modo'] and depois['fis'] == depois['modo'] and ('POR ESTADOS' in depois['botao']) == (depois['modo'] == 1),
                      'na pausa, DB: ATUAL ⇄ POR ESTADOS troca a mecânica na hora (%s → %s · "%s")' % (antes['botao'], depois['botao'], depois['curto']), [antes, depois])
            er = [e for e in erros if 'Failed to load resource' not in e]
            P.confere(not er, 'nenhum erro de JavaScript', er[:3])
        finally:
            await b.close()

        print('\n6) a versão oficial (sem experimental no config.js)')
        guardado = json.dumps({'cfg': {'fisica': {'dbModo': 1}}, 'slots': {}, 'slot': 'A', 'versao': 'v92.1'})
        b, pg, d0, erros = await abre_cel(pw, PAGINA, 'Android', config={})
        d = Dedos(d0.cdp)
        try:
            await pg.evaluate("(s) => { localStorage.setItem('racha-v92-testes', s); }", guardado)
            o = await rt(pg, "({exp:V92.exp, modo:V92_FIS.DB_MODO, botao:!!document.getElementById('pa-v92db'), parte:!!(typeof V92P !== 'undefined' && V92P.partes && V92P.partes.db)})")
            await rt(pg, "(() => { v92Carrega(); v92Aplica(); return 1; })()")
            o2 = await rt(pg, "({modo:V92_FIS.DB_MODO})")
            g = await rt(pg, GEO)
            await rt(pg, PARADO); ks = await par(pg, d, g, Relogio(), 16, 1)
            P.confere(not o['exp'] and o['modo'] == 0 and o2['modo'] == 0 and not o['botao'] and not o['parte'] and len(ks) == 1,
                      'a versão oficial: sem a parte DB e sem o botão na pausa, o DB atual (dbModo 0) mesmo com um ajuste "por estados" guardado no aparelho; o PASSE e o CHUTE no quadro seguinte dão só o PASSE', [o, o2, ks])
            er = [e for e in erros if 'Failed to load resource' not in e]
            P.confere(not er, 'nenhum erro de JavaScript na versão oficial', er[:3])
        finally:
            await b.close()
    return P.fim()


if __name__ == '__main__':
    raise SystemExit(asyncio.run(principal()))
