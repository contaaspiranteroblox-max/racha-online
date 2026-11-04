"""RACHA v103 · os sons do online (passa/falha). Uma sala 1v1 no servidor de verdade (tests/servidor_visitantes.cjs, com o
4G de mentira de 40 ms ± 8), a Ana e o Beto em dois navegadores, contando cada som que toca em cada um (o som.* embrulhado):
  1. o CHUTE da Ana toca na hora para ela (a previsão) e uma vez só, e toca também para o Beto (como CHUTE);
  2. o PASSE do Beto toca para a Ana (como PASSE);
  3. a bola na TRAVE toca a trave para quem chutou (o mundo previsto), uma vez;
  4. o gol: o som do gol para cada um e, na saída depois do gol, o APITO curto (uma vez para cada um);
  5. o fim (o 3º gol): o APITO FINAL, uma vez para cada um;
  6. nenhum erro de JavaScript.
  python3 tests/v103_sons_test.py"""
import asyncio, json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from comum import Placar, rt, async_playwright
from v92_online_test import sobe, sala

GANCHO = r"""(() => { if (window.__sons) return 1; window.__sons = []; const t0 = performance.now();
  for (const k of Object.keys(som)) if (typeof som[k] === 'function' && /^(chute|trave|chinelo|apito|gol|golContra|contagem)$/.test(k)){
    const f = som[k]; som[k] = function(){ try { window.__sons.push([Math.round(performance.now() - t0), k, [...arguments].map(a => typeof a === 'number' ? Math.round(a) : a)]); } catch (_) {} return f.apply(this, arguments); }; }
  return 1; })()"""
LIMPA = "(window.__sons.length = 0, 1)"
LE = "JSON.stringify(window.__sons)"


async def sons(pg):
    return json.loads(await rt(pg, LE))


async def principal():
    P = Placar('v103 · os sons do online')
    srv, prx, url, ws = sobe(False)
    try:
        async with async_playwright() as pw:
            A, Bp, sala0, ok = await sala(pw, url, ws)
            P.confere(ok, 'a sala 1v1 começa (Ana × Beto)')
            for pg in (A, Bp): await rt(pg, GANCHO)
            await asyncio.sleep(1.2)
            # 1) o CHUTE da Ana
            for pg in (A, Bp): await rt(pg, LIMPA)
            await rt(A, "(() => { net49Send({type:'__teste_poe', u:3.0, dx:-6, vert:true}); return 1; })()"); await asyncio.sleep(.6)
            await A.keyboard.down('KeyK'); await asyncio.sleep(.15); await A.keyboard.up('KeyK'); await asyncio.sleep(1.6)
            sa, sb = await sons(A), await sons(Bp)
            ca, cb = [x for x in sa if x[1] == 'chute'], [x for x in sb if x[1] == 'chute']
            P.confere(len(ca) == 1 and ca[0][2] == [True], '1) o CHUTE da Ana toca para ela na hora, uma vez (sem repetir quando o servidor confirma)', sa)
            P.confere(len(cb) == 1 and cb[0][2] == [True], '1) e toca para o Beto (o chute do outro, como CHUTE)', sb)
            # 2) o PASSE do Beto
            for pg in (A, Bp): await rt(pg, LIMPA)
            await rt(Bp, "(() => { net49Send({type:'__teste_poe', u:3.0, dx:6, vert:true}); return 1; })()"); await asyncio.sleep(.6)
            await Bp.keyboard.down('KeyJ'); await asyncio.sleep(.15); await Bp.keyboard.up('KeyJ'); await asyncio.sleep(1.6)
            sa, sb = await sons(A), await sons(Bp)
            ca, cb = [x for x in sa if x[1] == 'chute'], [x for x in sb if x[1] == 'chute']
            P.confere(len(ca) == 1 and ca[0][2] == [False] and len(cb) == 1, '2) o PASSE do Beto toca para a Ana (como PASSE) e uma vez para ele', [sa, sb])
            # 3) a trave: a bola na frente da trave de cima do gol da direita, o CHUTE da Ana na direção dela
            for pg in (A, Bp): await rt(pg, LIMPA)
            G = await rt(A, "(() => { const G = V92N.M.G; return {cx:G.CX, cy:G.CY, lx1:G.LX1, y0:G.GOL_Y0}; })()")
            dx = (G['lx1'] - G['cx'])/19 - 9; dy = (G['y0'] - G['cy'])/19
            await rt(A, "(() => { net49Send({type:'__teste_poe', u:3.0, dx:%r, dy:%r}); return 1; })()" % (dx, dy)); await asyncio.sleep(.7)
            await A.keyboard.down('KeyK'); await asyncio.sleep(.15); await A.keyboard.up('KeyK'); await asyncio.sleep(1.5)
            sa = await sons(A)
            tv = [x for x in sa if x[1] in ('trave', 'chinelo')]
            P.confere(len(tv) == 1, '3) a bola na trave: a trave toca uma vez para quem chutou (o mundo previsto)', sa)
            # 4) o gol e o apito da saída
            for pg in (A, Bp): await rt(pg, LIMPA)
            await rt(A, "(() => { net49Send({type:'__teste_gol', time:P.time}); return 1; })()"); await asyncio.sleep(4.5)
            sa, sb = await sons(A), await sons(Bp)
            ga = [x for x in sa if x[1] in ('gol', 'golContra')]; gb = [x for x in sb if x[1] in ('gol', 'golContra')]
            aa = [x for x in sa if x[1] == 'apito' and x[2] == ['curto']]; ab = [x for x in sb if x[1] == 'apito' and x[2] == ['curto']]
            P.confere(len(ga) == 1 and len(gb) == 1 and len(aa) == 1 and len(ab) == 1, '4) o gol: o som do gol e, na saída depois dele, o apito curto — uma vez para cada um', [sa, sb])
            # 5) o fim
            for pg in (A, Bp): await rt(pg, LIMPA)
            for _ in range(2):
                await rt(A, "(() => { net49Send({type:'__teste_gol', time:P.time}); return 1; })()"); await asyncio.sleep(3.4)
            await asyncio.sleep(1.5)
            sa, sb = await sons(A), await sons(Bp)
            fa = [x for x in sa if x[1] == 'apito' and x[2] == ['fim']]; fb = [x for x in sb if x[1] == 'apito' and x[2] == ['fim']]
            P.confere(len(fa) == 1 and len(fb) == 1, '5) o fim (3 × 0): o apito final, uma vez para cada um', [fa, fb])
            erros = [e for pg in (A, Bp) for e in getattr(pg, 'erros', []) if 'Failed to load resource' not in e]
            P.confere(not erros, '6) nenhum erro de JavaScript', erros[:3])
    finally:
        srv.terminate(); prx.terminate()
    return P.fim()


if __name__ == '__main__':
    sys.exit(asyncio.run(principal()))
