"""RACHA v112 · AS MUDANÇAS NA PÁGINA POR QUADRO — medida (não é passa/falha), antes × depois.
O jogo de verdade no navegador (tests/build/racha_teste.html, ou RACHA_TESTE=<outro .html>), o servidor das salas e o 4G de
mentira, como no tests/v112_fps_medidas.py. Em cada cena (o treino 4×4 e a partida online 4×4 contra bots), por 3 s:
  · quantas mudanças a página teve (MutationObserver: childList, atributos, texto) e em quais elementos;
  · quantas vezes o observador das janelas da v70 rodou a sincronização (v70Sincroniza: a busca de todas as janelas);
  · quantas vezes a barra da partida rodou (x49GameUI, por fora de tudo) e quantos quadros a tela desenhou;
  · quantas medidas de texto o canvas fez (measureText) com a faixa SAÍDA DO SEU TIME no placar.
Uso: python3 tests/v112_pagina_medidas.py [saida.json]     (RACHA_TESTE=tests/build/<antes>.html mede outra versão)"""
import asyncio, json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
SAIDA = sys.argv[1] if len(sys.argv) > 1 and not sys.argv[1].startswith('--') else None
sys.argv = [sys.argv[0]]
import v112_fps_medidas as F
from comum import rt, async_playwright
from online_test import espera

SONDA = r"""(() => {
  const C = window.__MUT = {n: 0, alvos: {}};
  const nome = n => { if (!n || !n.tagName) return n && n.nodeName || '?'; return (n.id ? '#' + n.id : n.tagName.toLowerCase() + (typeof n.className === 'string' && n.className ? '.' + n.className.split(' ')[0] : '')) + (n.parentElement && n.parentElement.id ? ' < #' + n.parentElement.id : ''); };
  window.__MUTO = new MutationObserver(l => { for (const m of l) { C.n++; const k = m.type + (m.attributeName ? '[' + m.attributeName + ']' : '') + ' ' + nome(m.target); C.alvos[k] = (C.alvos[k] || 0) + 1; } });
  window.__MUTO.observe(document.body, {subtree:true, childList:true, attributes:true, characterData:true});
  const S = window.__CONTA = {sync: 0, ui: 0, quadros: 0, desenhos: 0, medidas: 0, pul0: window.RachaTela112 ? RachaTela112.estado().uiPuladas : 0};
  const a = v70Sincroniza; v70Sincroniza = function(){ S.sync++; return a.apply(this, arguments); };
  const b = x49GameUI; x49GameUI = function(){ S.ui++; return b.apply(this, arguments); };
  const c = frame; frame = function(){ S.quadros++; return c.apply(this, arguments); };
  const d = render; render = function(){ S.desenhos++; return d.apply(this, arguments); };
  const mt = CanvasRenderingContext2D.prototype.measureText;
  CanvasRenderingContext2D.prototype.measureText = function(){ S.medidas++; return mt.apply(this, arguments); };
  window.__MT = mt;
  return 1;
})()"""
LE = r"""(() => { window.__MUTO.disconnect(); CanvasRenderingContext2D.prototype.measureText = window.__MT; const S = window.__CONTA;
  S.puladas = window.RachaTela112 ? RachaTela112.estado().uiPuladas - S.pul0 : 0; S.ui_rodou = S.ui - S.puladas; return {mut: window.__MUT, conta: S}; })()"""


async def mede(pg, saida=False):
    if saida:
        await rt(pg, "(() => { RQ.estado = 'saida'; return 1; })()")
    await rt(pg, SONDA)
    await asyncio.sleep(3.0)
    r = await rt(pg, LE)
    top = sorted(r['mut']['alvos'].items(), key=lambda kv: -kv[1])[:8]
    return {'mudancas_3s': r['mut']['n'], 'onde': top, **r['conta']}


async def principal():
    srv, prx, url, ws = F.sobe()
    out = {'pagina': F.PAGINA or 'tests/build/racha_teste.html'}
    try:
        async with async_playwright() as pw:
            pg = await F.sessao(pw, url, ws)
            await rt(pg, "(() => { try { if (fimAberto()) fechaFim(); } catch (_) {} x49Start(4, 0); try { rqVsFecha(); } catch (_) {} RQ.estado = 'jogo'; return 1; })()")
            await rt(pg, F.DEDO); await asyncio.sleep(1.5)
            out['treino'] = await mede(pg)
            out['treino_saida'] = await mede(pg, saida=True)
            await pg.b.close()
            pg = await F.sessao(pw, url, ws)
            await rt(pg, "abreTela('amigos')"); await espera(pg, "!!NET49.id", 10000)
            await rt(pg, "(() => { abrirLobby(); net49Send({type:'fila', n:4, pts:0}); return 1; })()"); await asyncio.sleep(0.5)
            await rt(pg, "(() => { net49Send({type:'fila_bots'}); return 1; })()"); await espera(pg, F.JOGA, 15000)
            await rt(pg, "(() => { filaPop.length = 0; if (!LB.pop.hidden) fechaPop(); return 1; })()")
            await rt(pg, F.DEDO); await asyncio.sleep(3.0)
            out['online_4v4'] = await mede(pg)
            out['online_4v4_saida'] = await mede(pg, saida=True)
            out['erros'] = pg.erros[:3]
            await pg.b.close()
    finally:
        for p in (prx, srv):
            if p:
                p.terminate()
    for k in ('treino', 'treino_saida', 'online_4v4', 'online_4v4_saida'):
        v = out[k]
        print('%-18s %5d mudanças em 3 s · v70Sincroniza %4d · a barra rodou %4d · quadros %4d (desenhados %4d) · measureText %4d' % (k, v['mudancas_3s'], v['sync'], v['ui_rodou'], v['quadros'], v['desenhos'], v['medidas']))
        for o, n in v['onde'][:4]:
            print('        %5d  %s' % (n, o))
    if SAIDA:
        open(SAIDA, 'w').write(json.dumps(out, indent=1, ensure_ascii=False))


if __name__ == '__main__':
    asyncio.run(principal())
