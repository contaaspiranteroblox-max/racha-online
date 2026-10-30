"""RACHA v93 · FASE 5 — OS BALÕES DE FALA RÁPIDA (passa/falha, com as medidas impressas).
Contra os bots num iPhone de mentira (toques de verdade pelo CDP) e online com o servidor da turma de verdade (dois navegadores):
  1. o botão das falas do lado do placar (≥ 36 px, sem cobrir controle nem o botão dos jogadores) abre um menu compacto com as
     8 frases e o BALÕES: LIGADOS, fora dos controles;
  2. tocar numa frase: o balão aparece perto da sua tampinha, legível (26 px no HUD), sem cobrir a bola, os controles nem o
     placar, e some sozinho (2,6 s);
  3. o ritmo: a segunda fala logo em seguida não vai (no máximo uma a cada 1,6 s);
  4. BALÕES: DESLIGADOS (guardado no aparelho): nenhum balão aparece;
  5. online: a fala da Ana chega ao Beto e aparece perto da tampinha DELA na tela dele.
  python3 tests/v93_fase5_test.py [--sem-online]"""
import asyncio, json, math, os, sys
from comum import Placar, rt, async_playwright
from v92_hud_test import abre_cel, espera, geo, cobre

COMECA = "(() => { if (!lobby.aberto) abrirLobby(); X49.mode = 'casual'; x49Save(); x49Start(1, 0); return 1; })()"
SOBRA = """(() => {                                                         // o balão desenhado × a bola, os controles e o placar (tela virtual)
  const L = V93F.desenhados || [], z = cam.z, bx = W/2 + (VIS.bx - cam.x)*z, by = H/2 + (VIS.by - cam.y)*z, br = B.r*z;
  const hk = HUDX.k || 1, pw = v80PlacarW()*hk, placar = {x:W/2 - pw/2, y:0, w:pw, h:(PLACAR80.y + PLACAR80.h)*hk};
  return L.map(R => {
    const perto = (cx, cy, r) => { const nx = Math.max(R.x, Math.min(cx, R.x + R.w)), ny = Math.max(R.y, Math.min(cy, R.y + R.h)); return Math.hypot(nx - cx, ny - cy) < r; };
    const ctl = HE_ORDEM.filter(id => controleVisivel(id) && perto(el(id).x, el(id).y, el(id).r));
    const pl = R.x < placar.x + placar.w && R.x + R.w > placar.x && R.y < placar.y + placar.h && R.y + R.h > placar.y;
    return {k:R.k, i:R.i, lado:R.lado, bola:perto(bx, by, br + 4), ctl, placar:pl, w:Math.round(R.w), h:Math.round(R.h)};
  });
})()"""

ROTULO = """(() => { V93R.t = 0; v93RotuloEscondido(); const Q = v93RotuloPlacar(), c = cv.getBoundingClientRect(), k = c.width/W, q = {left:c.left + Q.x*k, right:c.left + (Q.x + Q.w)*k, top:c.top + Q.y*k, bottom:c.top + (Q.y + Q.h)*k};
  const bate = b => { if (!b || b.hidden) return false; const r = b.getBoundingClientRect(); return r.left < q.right && r.right > q.left && r.top < q.bottom && r.bottom > q.top; };
  return {txt:x49ModeName(), esc:V93R.esc, falas:bate(V93F.el.bt), jog:bate(V93P.el.bt)}; })()"""


async def bots(P, pw):
    b, ctx, pg, d, cdp, erros = await abre_cel(pw, 'iPhone')
    try:
        await rt(pg, COMECA)
        await espera(pg, "RQ.on && !V93P.contagem", 8000)
        await asyncio.sleep(.8)
        bt = await rt(pg, """(() => { const b = V93F.el.bt, p = V93P.el.bt; if (!b || b.hidden) return null; const r = b.getBoundingClientRect(), q = p && !p.hidden ? p.getBoundingClientRect() : null;
          return {x:r.left + r.width/2, y:r.top + r.height/2, w:r.width, junto:!!q && !(r.right <= q.left || q.right <= r.left || r.bottom <= q.top || q.bottom <= r.top)}; })()""")
        g = await geo(pg)
        sob_bt = [k for k, c in g['ctl'].items() if bt and cobre({'x': bt['x'] - bt['w']/2, 'y': bt['y'] - bt['w']/2, 'w': bt['w'], 'h': bt['w'], 'vis': True}, c, 1)]
        rot = await rt(pg, ROTULO)
        if bt:
            await d.toca(bt['x'], bt['y']); await asyncio.sleep(.4)
        mn = await rt(pg, "(() => { const m = V93F.el.menu, r = m.getBoundingClientRect(); return {vis:!m.hidden, n:m.querySelectorAll('.v93-fl-fr').length, lig:V93F.el.lig.textContent, x:r.left, y:r.top, w:r.width, h:r.height, frases:[...m.querySelectorAll('.v93-fl-fr')].map(x => x.textContent.slice(1))}; })()")
        sob_mn = [k for k, c in g['ctl'].items() if mn['vis'] and cobre(mn, c, 1)]
        await pg.screenshot(path='tests/saida/v93_falas_menu.png')
        P.confere(bt and bt['w'] >= 36 and not bt['junto'] and not sob_bt and mn['vis'] and mn['n'] == 8 and 'LIGADOS' in mn['lig'] and not sob_mn,
                  '1) o botão das falas do lado do placar (%d px) abre o menu com as 8 frases e o BALÕES: LIGADOS, fora dos controles' % (bt and bt['w'] or 0), [bt, sob_bt, mn, sob_mn])
        P.confere(not rot['falas'] and not rot['jog'], '   os dois botões do lado do placar não ficam em cima do rótulo do modo (%s; v95: o placar minimalista não tem mais o rótulo do lado)' % rot['txt'], rot)
        fr = await rt(pg, "(() => { const b = [...V93F.el.menu.querySelectorAll('.v93-fl-fr')].find(x => /Boa!/.test(x.textContent)); const r = b.getBoundingClientRect(); return {x:r.left + r.width/2, y:r.top + r.height/2}; })()")
        await d.toca(fr['x'], fr['y']); await asyncio.sleep(.35)
        dois = await rt(pg, "(() => { const desde = performance.now() - V93F.ult; return {desde:Math.round(desde), foi:v93FalaManda(0)}; })()")   # (logo em seguida: antes das medidas e da foto)
        dz = await rt(pg, SOBRA)
        fechou = await rt(pg, "V93F.el.menu.hidden")
        await pg.screenshot(path='tests/saida/v93_falas_balao.png')
        ok1 = dz and len(dz) == 1 and dz[0]['k'] == 'eu' and dz[0]['i'] == 3 and not dz[0]['bola'] and not dz[0]['ctl'] and not dz[0]['placar']
        P.confere(ok1 and fechou, '2) "Boa!": o balão aparece perto da sua tampinha (%s, %s × %s) sem cobrir a bola, os controles nem o placar; o menu fecha' % (dz and dz[0]['lado'], dz and dz[0]['w'], dz and dz[0]['h']), dz)
        P.confere(dois['foi'] is False and dois['desde'] < 1600, '3) o ritmo: a segunda fala logo em seguida (%s ms depois) não vai' % dois['desde'], dois)
        await asyncio.sleep(2.8)
        sumiu = await rt(pg, "(V93F.desenhados || []).length === 0 && V93F.baloes.size === 0")
        P.confere(sumiu, '   o balão some sozinho (2,6 s)', sumiu)
        await rt(pg, "(() => { v93FalaMenu(true); V93F.el.lig.click(); return 1; })()"); await asyncio.sleep(.2)
        lig = await rt(pg, "({t:V93F.el.lig.textContent, guardado:localStorage.getItem('racha-falas-v1')})")
        await rt(pg, "(() => { V93F.ult = 0; v93FalaManda(1); return 1; })()"); await asyncio.sleep(.3)
        nada = await rt(pg, "(V93F.desenhados || []).length")
        await rt(pg, "(() => { v93FalaMenu(true); V93F.el.lig.click(); v93FalaMenu(false); return 1; })()")
        P.confere('DESLIGADOS' in lig['t'] and '"desl":true' in (lig['guardado'] or '') and nada == 0, '4) BALÕES: DESLIGADOS (guardado no aparelho): nenhum balão aparece', [lig, nada])
        P.confere(not [e for e in erros if 'Failed to load' not in e], '   nenhum erro de JavaScript (contra os bots)', erros[:3])
    finally:
        await b.close()


async def online(P, pw):
    from v92_online_test import sobe, sala
    srv, prx, url, ws = sobe(False)
    A = Bp = None
    try:
        A, Bp, s0, ok = await sala(pw, url, ws)
        await asyncio.sleep(.8)
        await rt(A, "(() => { V93F.ult = 0; v93FalaManda(0); return 1; })()")
        idA = await rt(A, "NET49.id")
        chegou = await espera(Bp, "(() => { const b = V93F.baloes.get(%s); return b ? b.i + 1 : 0; })()" % json.dumps(idA), 4000, 50)
        await asyncio.sleep(.2)
        dz = await rt(Bp, SOBRA)
        perto = await rt(Bp, """(() => { const R = (V93F.desenhados || [])[0]; if (!R) return null; const q = RQ.jog.find(x => x.netId === %s); const z = cam.z, sx = W/2 + (q.x - cam.x)*z, sy = H/2 + (q.y - cam.y)*z;
          const nx = Math.max(R.x, Math.min(sx, R.x + R.w)), ny = Math.max(R.y, Math.min(sy, R.y + R.h)); return Math.round(Math.hypot(nx - sx, ny - sy)); })()""" % json.dumps(idA))
        P.confere(ok and chegou == 1 and dz and dz[0]['k'] == idA and perto is not None and perto < 140, '5) online: o "Golaço!" da Ana chega ao Beto e aparece perto da tampinha DELA na tela dele (%s px)' % perto, [chegou, dz, perto])
        # no celular deitado, online: a barra da sala (SALA XXXX · 40 ms) fica por cima do rótulo do modo: ele sai, e os botões
        # do lado do placar não ficam em cima da barra
        await A.set_viewport_size({'width': 844, 'height': 390}); await asyncio.sleep(1.4)
        cel = await rt(A, """(() => { V93R.t = 0; const esc = v93RotuloEscondido(), b = X49UI.onlinebar.getBoundingClientRect();
          const bate = e => { if (!e || e.hidden) return false; const r = e.getBoundingClientRect(); return r.left < b.right && r.right > b.left && r.top < b.bottom && r.bottom > b.top; };
          return {esc, barra:!X49UI.onlinebar.hidden, falas:bate(V93F.el.bt), jog:bate(V93P.el.bt)}; })()""")
        await A.screenshot(path='tests/saida/v93_falas_celular_online.png')
        P.confere(cel['barra'] and not cel['falas'] and not cel['jog'], '6) no celular, online: os botões do lado do placar não encostam na barra da sala (v95: o rótulo do modo saiu do lado do placar — nada mais se encavala com a barra)', cel)
        erros = [e for pg in (A, Bp) for e in pg.erros if 'WebSocket' not in e]
        P.confere(not erros, '   nenhum erro de JavaScript (online)', erros[:3])
    finally:
        for pg in (A, Bp):
            if pg:
                try: await pg.b.close()
                except Exception: pass
        srv.terminate(); prx.terminate()


async def principal():
    P = Placar('v93 · Fase 5 · os balões de fala rápida')
    async with async_playwright() as pw:
        print('\n· contra os bots (iPhone)')
        await bots(P, pw)
        if '--sem-online' not in sys.argv:
            print('\n· online (o servidor de verdade, sala 1v1)')
            await online(P, pw)
    return P.fim()


if __name__ == '__main__':
    sys.exit(asyncio.run(principal()))
