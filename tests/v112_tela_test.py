"""RACHA v112 · O ONLINE SEM TRAVAR A TELA E O MEDIDOR DA PARTIDA — passa/falha, com o jogo de verdade no navegador, o
servidor das salas (tests/servidor_visitantes.cjs) e o 4G de mentira (tests/v92_proxy.cjs).
  1) o treino 4×4 e a partida online 4×4 contra bots (a fila da ranqueada com bots, como nas medidas):
     · a página não muda à toa: em 3 s, só o que mudou de verdade (antes: ~1500 mudanças — a barra da sala reescrita até 4
       vezes por quadro, o hidden dos botões dela, o do chat — e o observador das janelas da v70 refazendo a busca a cada uma);
     · a barra da sala mostra o texto certo (SALA … · ping) e roda uma vez por quadro (o segundo laço da v49 pula);
     · a sincronização das janelas da v70 roda poucas vezes (não mais em todo quadro), e a pausa aberta continua virando
       janela (role=dialog, aria-modal) com o resto inerte, e volta ao normal fechada;
     · o placar mede o texto da faixa (SAÍDA DO SEU TIME) uma vez, não a cada quadro (measureText);
  2) o medidor (window.RachaDiag e Ajustes › Visual › Medidor da partida): os números da tela (FPS, o tempo do quadro), da
     rede (o ping, a variação, os quadros do servidor por segundo, o tempo de confirmação do comando) e das correções; a
     caixinha aparece na partida, não pega o toque e some quando desliga;
  3) nenhum erro de JavaScript. ~1,5 min.
  python3 tests/v112_tela_test.py          (RACHA_TESTE=<outro .html> roda contra outra versão do jogo)"""
import asyncio, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.argv = [sys.argv[0]]                                # (o v112_fps_medidas lê os argumentos dele ao importar)
import v112_fps_medidas as F
from comum import Placar, rt, async_playwright
from online_test import espera

SONDA = r"""(() => {
  const C = window.__MUT = {n: 0, alvos: {}};
  const nome = n => { if (!n || !n.tagName) return n && n.nodeName || '?'; return (n.id ? '#' + n.id : n.tagName.toLowerCase()) + (n.parentElement && n.parentElement.id ? ' < #' + n.parentElement.id : ''); };
  window.__MUTO = new MutationObserver(l => { for (const m of l) { C.n++; const k = m.type + ' ' + nome(m.target); C.alvos[k] = (C.alvos[k] || 0) + 1; } });
  window.__MUTO.observe(document.body, {subtree:true, childList:true, attributes:true, characterData:true});
  const S = window.__SYNC = {n: 0, q0: window.RachaTela112 ? RachaTela112.estado() : null};
  const antes = v70Sincroniza; v70Sincroniza = function(){ S.n++; return antes.apply(this, arguments); };
  const M = window.__MED = {n: 0}; const mt = CanvasRenderingContext2D.prototype.measureText;
  CanvasRenderingContext2D.prototype.measureText = function(){ M.n++; return mt.apply(this, arguments); };
  const Q = window.__Q = {n: 0}; const fa = frame; frame = function(){ Q.n++; return fa.apply(this, arguments); };
  return 1;
})()"""
LE = r"""(() => { window.__MUTO.disconnect(); return {mut: window.__MUT, sync: window.__SYNC.n, med: window.__MED.n, quadros: window.__Q.n,
  tela: window.RachaTela112 ? RachaTela112.estado() : null, q0: window.__SYNC.q0}; })()"""


async def sonda(pg, seg=3.0):
    await rt(pg, SONDA)
    await asyncio.sleep(seg)
    return await rt(pg, LE)


async def principal():
    P = Placar('v112 · o online sem travar a tela e o medidor da partida')
    srv, prx, url, ws = F.sobe()
    try:
        async with async_playwright() as pw:
            # ---------------------------------------------------------------- 1) o treino
            pg = await F.sessao(pw, url, ws)
            tem = await rt(pg, "({diag: typeof window.RachaDiag === 'object' && typeof RachaDiag.estado === 'function', tela: !!window.RachaTela112, aj: !!document.getElementById('aj-medidor112'), vis: !!(AJX.secs.visual && AJX.secs.visual.contains(document.getElementById('aj-medidor112')))})")
            P.confere(tem['diag'] and tem['tela'], 'o jogo tem o medidor (window.RachaDiag) e a tela da v112', str(tem))
            P.confere(tem['aj'] and tem['vis'], 'Ajustes › Visual tem a chave Medidor da partida', str(tem))
            await rt(pg, "(() => { try { if (fimAberto()) fechaFim(); } catch (_) {} x49Start(4, 0); try { rqVsFecha(); } catch (_) {} RQ.estado = 'jogo'; return 1; })()")
            await rt(pg, F.DEDO); await asyncio.sleep(1.5)
            await rt(pg, "RachaDiag.zera()"); await asyncio.sleep(0.2)
            s = await sonda(pg)
            ruins = {k: v for k, v in s['mut']['alvos'].items() if any(x in k for x in ('x49-onlinebar', 'x49-camera', 'v88-espec-sair', 'x49-chat'))}
            P.confere(s['mut']['n'] < 90, 'treino: a página quase não muda em 3 s (só o que muda de verdade)', '%d mudanças · %s' % (s['mut']['n'], sorted(s['mut']['alvos'].items(), key=lambda kv: -kv[1])[:4]))
            P.confere(not ruins, 'treino: nada na barra da sala, nos botões dela nem no chat', str(ruins))
            P.confere(s['sync'] <= 12, 'treino: a sincronização das janelas da v70 roda poucas vezes (não a cada quadro)', '%d em 3 s, %d quadros' % (s['sync'], s['quadros']))
            e = await rt(pg, "RachaDiag.estado()")
            P.confere(e['tela']['fps'] and e['tela']['fps'] > 15 and e['tela']['quadros'] > 40 and e['tela']['js_p50_ms'] is not None,
                      'treino: o medidor conta os quadros (FPS, o tempo do quadro)', str(e['tela']))
            P.confere(not e['rede']['online'], 'treino: o medidor sabe que não é online', str(e['rede']))
            P.confere(not pg.erros, 'treino: nenhum erro de JavaScript', str(pg.erros[:2]))
            await pg.b.close()

            # ---------------------------------------------------------------- 2) a partida online 4×4
            pg = await F.sessao(pw, url, ws)
            await rt(pg, "abreTela('amigos')")
            await espera(pg, "!!NET49.id", 10000)
            await rt(pg, "(() => { abrirLobby(); net49Send({type:'fila', n:4, pts:0}); return 1; })()")
            await asyncio.sleep(0.5)
            await rt(pg, "(() => { net49Send({type:'fila_bots'}); return 1; })()")
            ok = await espera(pg, F.JOGA, 15000)
            P.confere(ok, 'a partida online 4×4 começou', str(pg.erros[:2]))
            await rt(pg, "(() => { filaPop.length = 0; if (!LB.pop.hidden) fechaPop(); return 1; })()")
            await rt(pg, F.DEDO); await asyncio.sleep(3.5)       # (o pong do ping chega a cada 3 s)
            await rt(pg, "RachaDiag.zera()"); await asyncio.sleep(0.2)
            s = await sonda(pg)
            barra = sum(v for k, v in s['mut']['alvos'].items() if 'x49-onlinebar' in k)
            ruins = {k: v for k, v in s['mut']['alvos'].items() if any(x in k for x in ('x49-camera', 'v88-espec-sair', 'x49-chat'))}
            P.confere(s['mut']['n'] < 120, 'online: a página quase não muda em 3 s (antes: ~1500 mudanças)', '%d mudanças · %s' % (s['mut']['n'], sorted(s['mut']['alvos'].items(), key=lambda kv: -kv[1])[:4]))
            P.confere(barra <= 4, 'online: a barra da sala só muda quando o texto muda (o ping a cada 3 s)', '%d mudanças na barra' % barra)
            P.confere(not ruins, 'online: os botões da barra e o chat não recebem hidden de novo', str(ruins))
            P.confere(s['sync'] <= 12, 'online: a sincronização das janelas da v70 roda poucas vezes', '%d em 3 s, %d quadros' % (s['sync'], s['quadros']))
            t0, t1 = s['q0'] or {}, s['tela'] or {}
            pul = (t1.get('uiPuladas', 0) - t0.get('uiPuladas', 0))
            P.confere(pul >= 0.8 * s['quadros'], 'online: a barra da partida roda uma vez por quadro (o segundo laço pula)', '%d puladas em %d quadros' % (pul, s['quadros']))
            txt = await rt(pg, "({txt: X49UI.netText.textContent, dom: Node.prototype.__lookupGetter__ ? Object.getOwnPropertyDescriptor(Node.prototype, 'textContent').get.call(X49UI.netText) : X49UI.netText.textContent, vis: !X49UI.onlinebar.hidden})")
            P.confere(txt['vis'] and txt['txt'] == txt['dom'] and (txt['txt'].startswith('SALA ') or 'RANQUEADA' in txt['txt'].upper()) and ('ms' in txt['txt'] or 'RANQUEADA' in txt['txt'].upper()),
                      'online: a barra da sala mostra o texto de sempre (e é o que está na página)', str(txt))
            # o placar na saída: a faixa SAÍDA DO … medida uma vez
            await rt(pg, "(() => { RQ.estado = 'saida'; return 1; })()")
            m = await rt(pg, r"""(async () => { const M = {n: 0}; const mt = CanvasRenderingContext2D.prototype.measureText;
              CanvasRenderingContext2D.prototype.measureText = function(){ M.n++; return mt.apply(this, arguments); };
              const q0 = window.__Q.n; await new Promise(r => setTimeout(r, 1000)); CanvasRenderingContext2D.prototype.measureText = mt;
              return {n: M.n, quadros: window.__Q.n - q0}; })()""")
            P.confere(m['n'] <= max(10, 0.2 * m['quadros']), 'online: o placar não mede o texto da faixa a cada quadro (measureText)', '%d medidas em %d quadros' % (m['n'], m['quadros']))
            e = await rt(pg, "RachaDiag.estado()")
            r, c = e['rede'], e['correcoes']
            P.confere(r['online'] and r['quadros_s'] and 40 <= r['quadros_s'] <= 80, 'medidor: os quadros do servidor por segundo (~60)', str(r))
            P.confere(r['ping_ms'] and r['ping_ms'] > 20 and r['jitter_ms'] is not None and r['jitter_ms'] >= 0, 'medidor: o ping (o 4G de mentira: ~90 ms) e a variação', str(r))
            P.confere(r['resposta_p50_ms'] and 20 < r['resposta_p50_ms'] < 1500, 'medidor: o tempo até o comando voltar confirmado', str(r))
            P.confere(all(k in c for k in ('eu_p95_px', 'bola_p95_px', 'outros_p95_px', 'visiveis_min', 'pulos', 'recomecos')) and c['quadros_servidor'] > 30,
                      'medidor: as correções (a divergência cliente × servidor, os pulos e os recomeços)', str(c))
            # a caixinha: liga pelos Ajustes
            await rt(pg, "(() => { ajxAbre('visual'); return 1; })()"); await asyncio.sleep(0.3)
            await rt(pg, "(() => { document.getElementById('aj-medidor112').click(); return 1; })()")
            await rt(pg, "(() => { ajxFecha(); return 1; })()"); await asyncio.sleep(1.3)
            cx = await rt(pg, "(() => { const el = document.querySelector('.v112-medidor'); return el ? {vis: !el.hidden, txt: el.textContent, pe: getComputedStyle(el).pointerEvents, ls: localStorage.getItem('racha-medidor112'), on: document.getElementById('aj-medidor112').getAttribute('aria-pressed')} : null; })()")
            P.confere(cx and cx['vis'] and 'FPS' in cx['txt'] and 'Ping' in cx['txt'] and 'Correções' in cx['txt'] and cx['ls'] == '1' and cx['on'] == 'true',
                      'a caixinha do medidor aparece na partida (FPS, ping, correções) e fica guardada ligada', str(cx))
            P.confere(cx and cx['pe'] == 'none', 'a caixinha não pega o toque', str(cx and cx['pe']))
            await rt(pg, "(() => { ajxAbre('visual'); document.getElementById('aj-medidor112').click(); ajxFecha(); return 1; })()"); await asyncio.sleep(0.8)
            cx = await rt(pg, "(() => { const el = document.querySelector('.v112-medidor'); return {vis: !!el && !el.hidden, ls: localStorage.getItem('racha-medidor112')}; })()")
            P.confere(not cx['vis'] and cx['ls'] == '0', 'desligada, a caixinha some', str(cx))
            # a pausa continua virando janela (a sincronização da v70 pela mudança do hidden)
            await rt(pg, "(() => { RQ.estado = 'jogo'; pausaAbre(); return 1; })()"); await asyncio.sleep(0.4)
            pz = await rt(pg, "(() => { const p = document.getElementById('pausa'); const w = document.getElementById('wrap'); return {aberta: !!p && !p.hidden, role: p && p.getAttribute('role'), modal: p && p.getAttribute('aria-modal'), inertes: V70F.inertes.length, foco: !!(p && p.contains(document.activeElement))}; })()")
            P.confere(pz['aberta'] and pz['role'] == 'dialog' and pz['modal'] == 'true' and pz['inertes'] > 0, 'a pausa aberta vira janela (role=dialog, aria-modal, o resto inerte)', str(pz))
            await rt(pg, "(() => { pausaFecha(); return 1; })()"); await asyncio.sleep(0.4)
            pz = await rt(pg, "(() => { const p = document.getElementById('pausa'); return {aberta: !!p && !p.hidden, inertes: V70F.inertes.length, pilha: V70F.pilha.length}; })()")
            P.confere(not pz['aberta'] and pz['inertes'] == 0 and pz['pilha'] == 0, 'fechada, o resto volta a responder', str(pz))
            P.confere(not pg.erros, 'online: nenhum erro de JavaScript', str(pg.erros[:2]))
            await pg.b.close()
    finally:
        for p in (prx, srv):
            if p:
                p.terminate()
    return P.fim()


if __name__ == '__main__':
    sys.exit(asyncio.run(principal()))
