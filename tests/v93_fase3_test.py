"""RACHA v93 · FASE 3 — O PAINEL DO ADMIN DA SALA (passa/falha, com as medidas impressas).
Com o servidor da turma de verdade (tests/servidor_visitantes.cjs) e três navegadores — a Ana (a admin, num celular deitado
de 844 × 390), o Beto (jogador) e o Caio (assistindo) — numa sala personalizada 1v1 hospedada:
  1. na pausa da Ana aparece ADMIN DA SALA (com o desenho, ≥ 44 px); na do Beto, não;
  2. o painel abre do lado (compacto: não ocupa o meio da tela, botões ≥ 36 px com a área de toque de 44), com os dois times
     e o banco;
  3. RESERVA: o Beto vai para o banco no meio da partida (o aparelho dele passa a assistir, com o aviso) e o bot segura o lugar;
  4. ENTRAR: o Caio (do banco) entra na vaga, o aparelho dele vira jogador e a tampinha anda com o analógico dele no servidor;
  5. o placar continua (1 × 0 antes e depois das trocas) e ninguém aparece em dois lugares;
  6. ENCERRAR pede confirmação no próprio painel; confirmado, a partida acaba para todos (o resultado não vale prêmio);
  7. o Beto (que não é admin) não consegue mandar a ação (o servidor recusa).
  python3 tests/v93_fase3_test.py"""
import asyncio, json, math, os, sys, time
from comum import Placar, rt, async_playwright, HARNESS, FONTES, CHROME
from v92_hud_test import espera

JOGA = "NET49.playing && NET49.localSlot >= 0 && NET49.lastTick > 0"


async def sessao(pw, url, nome, ws, w=1280, h=720):
    b = await pw.chromium.launch(executable_path=CHROME, args=['--no-sandbox', '--autoplay-policy=no-user-gesture-required'])
    ctx = await b.new_context(viewport={'width': w, 'height': h}, has_touch=True, device_scale_factor=2 if w < 1000 else 1)
    await ctx.add_init_script("document.addEventListener('DOMContentLoaded',()=>{const s=document.createElement('style');s.textContent=%s;document.head.prepend(s);});" % json.dumps(FONTES))
    await ctx.add_init_script("window.RACHA_CONFIG = Object.assign(window.RACHA_CONFIG || {}, {servidor:%s, presente:false});" % json.dumps(ws))
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
    pg.b = b
    return pg


async def principal():
    P = Placar('v93 · Fase 3 · o painel do admin da sala')
    from v92_online_test import sobe
    srv, prx, url, ws = sobe(False)
    A = Bp = Cp = None
    try:
        async with async_playwright() as pw:
            A = await sessao(pw, url, 'Ana', ws, 844, 390); Bp = await sessao(pw, url, 'Beto', ws); Cp = await sessao(pw, url, 'Caio', ws)
            for pg in (A, Bp, Cp):
                await rt(pg, "abreTela('amigos')")
            for pg in (A, Bp, Cp):
                await espera(pg, "!!NET49.id", 10000)
            await rt(A, "(() => { Object.assign(SX.form, {onde:'online', pub:false, n:1, map:0, jogo:'futebol', tempo:0, bots:true, nome:'v93 admin'}); sxCriar(); return 1; })()")
            cod = await espera(A, "NET49.room && NET49.room.code", 8000)
            await rt(Bp, "(() => { net49Send({type:'join', code:%s, slot:1}); return 1; })()" % json.dumps(cod))
            await espera(A, "NET49.room && NET49.room.members.length === 2", 8000)
            await rt(A, "(() => { const b = document.querySelector('.v70-sl-atalhos .entrar'); if (b && !b.hidden) b.click(); return 1; })()")
            await espera(A, "NET49.room.roster.indexOf(NET49.id) >= 0 && NET49.room.roster.every(Boolean)", 8000)
            adm0 = await rt(A, "(() => { const b = document.querySelector('#tela-sala .v93-sl-adm'); return b ? {vis:!b.hidden && b.getBoundingClientRect().height >= 44} : null; })()")
            # o painel aberto pela tela da sala (antes de começar): do lado, sem cobrir o COMEÇAR
            await rt(A, "(() => { const b = document.querySelector('#tela-sala .v93-sl-adm'); if (b) b.click(); return 1; })()"); await asyncio.sleep(.4)
            sl = await rt(A, """(() => { const p = document.querySelector('.v93-adm'), i = document.getElementById('sl-iniciar'); if (!p || p.hidden || !i) return null;
              const a = p.getBoundingClientRect(), b = i.getBoundingClientRect(), ad = document.querySelector('#tela-sala .v93-sl-adm').getBoundingClientRect();
              const cruza = (x, y) => x.left < y.right - 1 && x.right > y.left + 1 && x.top < y.bottom - 1 && x.bottom > y.top + 1;
              const outros = [...document.querySelectorAll('#tela-sala button')].filter(x => !x.classList.contains('v93-sl-adm') && x.offsetParent && getComputedStyle(x).visibility !== 'hidden').map(x => x.getBoundingClientRect()).filter(r => r.width > 4);
              return {txt:p.querySelector('.v93-adm-cab small').textContent, cobre:cruza(a, b), w:Math.round(a.width), bt:{h:Math.round(ad.height), bate:outros.filter(r => cruza(ad, r)).length, dentro:ad.left >= 0 && ad.right <= innerWidth && ad.bottom <= innerHeight}}; })()""")
            await A.screenshot(path='tests/saida/v93_admin_sala.png')
            await rt(A, "(() => { v93AdmFecha(); return 1; })()")
            await rt(A, "slIniciar()")
            ok = await espera(A, JOGA, 12000) and await espera(Bp, JOGA, 12000)
            await rt(Cp, "(() => { net49Send({type:'join', code:%s, spectate:true}); return 1; })()" % json.dumps(cod))
            await espera(Cp, "NET49.playing && NET49.localSlot < 0", 10000)
            for pg in (A, Bp, Cp):
                await rt(pg, "(() => { filaPop.length = 0; if (!LB.pop.hidden) fechaPop(); return 1; })()")
            P.confere(ok and adm0 and adm0['vis'] and sl and 'ANTES DE COMEÇAR' in sl['txt'] and not sl['cobre'] and sl['bt']['h'] >= 44 and not sl['bt']['bate'] and sl['bt']['dentro'], '0) na tela da sala a Ana tem o botão ADMIN (o painel abre do lado, sem cobrir o COMEÇAR) e a sala 1v1 hospedada começa (Ana × Beto; o Caio assiste)', [adm0, sl])
            # o gol: 1 × 0
            await rt(A, "(() => { net49Send({type:'__teste_gol', time:P.time}); return 1; })()")
            pl = await espera(A, "RQ.placar[0] + RQ.placar[1] === 1 ? RQ.placar.join('×') : ''", 6000)

            print('\n1) a pausa')
            await rt(A, "pausaAbre(); 1"); await asyncio.sleep(.3)
            pa = await rt(A, "(() => { const b = document.getElementById('pa-adm'); if (!b || !b.isConnected) return null; const r = b.getBoundingClientRect(); return {h:Math.round(r.height), ic:!!b.querySelector('.v71-ic svg'), t:b.textContent.trim()}; })()")
            # a pausa como na versão oficial (sem os botões A ⇄ B e DB, que só existem na versão de testes): com 5 botões e,
            # com dois layouts (o LAYOUT ⇄ da Fase 1), com 6 — mais o bloco do árbitro; tem que caber sem rolar
            MEDE = "(() => { document.querySelectorAll('#pa-v92ab, #pa-v92db').forEach(b => b.remove()); v93PausaColunas(); const cx = document.querySelector('#pausa .pa-caixa'), bts = [...document.querySelectorAll('#pausa .pa-acoes > .pa-bt, #pausa .pa-arb .pa-bt')].filter(x => !x.hidden && x.offsetParent); return {n:[...document.querySelectorAll('#pausa .pa-acoes > .pa-bt')].filter(x => !x.hidden).length, duas:cx.classList.contains('v93-duas'), cabe:cx.scrollHeight <= cx.clientHeight + 1 && bts.every(x => { const q = x.getBoundingClientRect(); return q.top >= 0 && q.bottom <= innerHeight; }), min:Math.min(...bts.map(x => Math.round(x.getBoundingClientRect().height)))}; })()"
            pa5 = await rt(A, MEDE)
            await A.screenshot(path='tests/saida/v93_admin_pausa.png')
            await rt(A, "(() => { HE.store.lista.push(heNovoLayout('Segundo', heAtivo().estado)); pausaFecha(); pausaAbre(); return 1; })()"); await asyncio.sleep(.3)
            pa6 = await rt(A, MEDE)
            await A.screenshot(path='tests/saida/v93_admin_pausa6.png')
            await rt(A, "(() => { HE.store.lista.pop(); pausaFecha(); pausaAbre(); return 1; })()"); await asyncio.sleep(.2)
            await rt(Bp, "pausaAbre(); 1"); await asyncio.sleep(.3)
            pb = await rt(Bp, "(() => { const b = document.getElementById('pa-adm'); return !!(b && b.isConnected); })()")
            await rt(Bp, "pausaFecha(); 1")
            P.confere(pa and pa['h'] >= 44 and pa['ic'] and not pb, '1) na pausa da Ana: ADMIN DA SALA (%s px, com o desenho); na do Beto, não' % (pa and pa['h']), [pa, pb])
            P.confere(pa5['cabe'] and pa6['cabe'] and pa5['duas'] and pa6['duas'] and min(pa5['min'], pa6['min']) >= 44,
                      '   a pausa da admin cabe no celular deitado sem rolar, com %s e com %s botões (duas colunas) e o bloco do árbitro; botões ≥ %s px' % (pa5['n'], pa6['n'], min(pa5['min'], pa6['min'])), [pa5, pa6])
            await pg_click(A, '#pa-adm'); await asyncio.sleep(.4)
            pn = await rt(A, """(() => { const p = document.querySelector('.v93-adm'); if (!p || p.hidden) return null; const r = p.getBoundingClientRect();
              const bts = [...p.querySelectorAll('.v93-adm-bt')].filter(b => b.offsetParent).map(b => Math.round(b.getBoundingClientRect().height));
              return {x:Math.round(r.left), w:Math.round(r.width), h:Math.round(r.height), vw:innerWidth, vh:innerHeight, bts, nomes:[...p.querySelectorAll('.v93-adm-nome')].map(x => x.textContent)}; })()""")
            await A.screenshot(path='tests/saida/v93_admin_painel.png')
            P.confere(pn and pn['w'] <= pn['vw']*.5 and pn['x'] >= pn['vw']*.45 and min(pn['bts']) >= 34 and any('Beto' in n for n in pn['nomes']),
                      '2) o painel abre do lado direito (%s px de %s: não ocupa o meio), com os times e o banco; botões ≥ 34 px' % (pn and pn['w'], pn and pn['vw']), pn)

            print('\n2) as trocas no meio da partida')
            await rt(A, "(() => { const li = [...document.querySelectorAll('.v93-adm .v93-adm-l')].find(l => /Beto/.test(l.textContent)); const b = li && [...li.querySelectorAll('button')].find(x => /RESERVA/.test(x.textContent)); if (b) b.click(); return !!b; })()")
            bb = await espera(Bp, "NET49.playing && NET49.localSlot < 0 ? 1 : 0", 5000)
            P.confere(bb, '3) RESERVA: o Beto vai para o banco no meio da partida (o aparelho dele passa a assistir)', bb)
            await asyncio.sleep(.6)
            await rt(A, "(() => { const li = [...document.querySelectorAll('.v93-adm .v93-adm-fora .v93-adm-l')].find(l => /Caio/.test(l.textContent)); const b = li && [...li.querySelectorAll('button')].find(x => /ENTRAR/.test(x.textContent)); if (b) b.click(); return !!b; })()")
            await asyncio.sleep(.3)
            aqui = await rt(A, "(() => { const b = [...document.querySelectorAll('.v93-adm .v93-adm-time button')].find(x => x.textContent.trim() === 'AQUI'); if (b) b.click(); return b ? b.textContent : ''; })()")   # (a vaga do bot; TROCAR mandaria a Ana para o banco)
            cc = await espera(Cp, "NET49.playing && NET49.localSlot >= 0 ? 'lugar ' + NET49.localSlot : ''", 6000)
            await asyncio.sleep(.5)
            p0 = await rt(Cp, "[P.x, P.y]")
            await rt(Cp, "(() => { window.__dedo = setInterval(() => { joy.id = 77; joy.ativo = true; joy.dx = P.time ? -60 : 60; joy.dy = 0; }, 30); return 1; })()")
            await asyncio.sleep(1.4)
            p1 = await rt(Cp, "[P.x, P.y]")
            await rt(Cp, "(() => { clearInterval(window.__dedo); joy.id = null; joy.ativo = false; joy.dx = joy.dy = 0; return 1; })()")
            sv = await rt(A, "(() => { const r = NET49.room; return {roster:r.roster.slice(), placar:RQ.placar.join('×')}; })()")
            idC = await rt(Cp, "NET49.id"); idB = await rt(Bp, "NET49.id")
            P.confere(aqui and cc == 'lugar 1' and math.hypot(p1[0] - p0[0], p1[1] - p0[1]) > 30, '4) ENTRAR (%s): o Caio entra no lugar 2 e a tampinha dele anda com o analógico (%.0f px)' % (aqui, math.hypot(p1[0] - p0[0], p1[1] - p0[1])), [aqui, cc, p0, p1])
            P.confere(pl == '1×0' and sv['placar'] == '1×0' and sv['roster'].count(idC) == 1 and idB not in sv['roster'], '5) o placar continua (%s → %s) e ninguém aparece em dois lugares' % (pl, sv['placar']), sv)

            print('\n3) o Beto tenta e o ENCERRAR')
            await rt(Bp, "(() => { net49Send({type:'adm', acao:'encerrar'}); return 1; })()")
            await asyncio.sleep(.6)
            bt = await rt(Bp, "X49UI.toast ? X49UI.toast.textContent : ''")
            ainda = await rt(A, "NET49.playing && RQ.estado !== 'fim'")
            P.confere('admin' in (bt or '').lower() and ainda, '7) o Beto manda ENCERRAR sem ser admin: o servidor recusa ("%s") e a partida continua' % bt, [bt, ainda])
            await rt(A, "(() => { const b = [...document.querySelectorAll('.v93-adm .v93-adm-pe button')].find(x => /ENCERRAR/.test(x.textContent)); if (b) b.click(); return !!b; })()")
            await asyncio.sleep(.3)
            cf = await rt(A, "(() => { const c = document.querySelector('.v93-adm .v93-adm-conf'); return c ? c.textContent : ''; })()")
            vivo = await rt(A, "NET49.playing && RQ.estado !== 'fim'")
            await rt(A, "(() => { const b = [...document.querySelectorAll('.v93-adm .v93-adm-conf button')].find(x => /ENCERRAR/.test(x.textContent)); if (b) b.click(); return !!b; })()")
            fimA = await espera(A, "RQ.estado === 'fim' || fimAberto() ? 1 : 0", 8000)
            fimC = await espera(Cp, "RQ.estado === 'fim' || fimAberto() ? 1 : 0", 8000)
            await A.screenshot(path='tests/saida/v93_admin_fim.png')
            P.confere('ENCERRAR A PARTIDA' in (cf or '') and vivo and fimA and fimC, '6) ENCERRAR pede confirmação no painel (a partida segue até confirmar); confirmado, acaba para todos', [cf[:60] if cf else cf, vivo, fimA, fimC])
            erros = [e for pg in (A, Bp, Cp) for e in pg.erros if 'WebSocket' not in e]
            P.confere(not erros, 'nenhum erro de JavaScript', erros[:3])
    finally:
        for pg in (A, Bp, Cp):
            if pg:
                try: await pg.b.close()
                except Exception: pass
        srv.terminate(); prx.terminate()
    return P.fim()


async def pg_click(pg, sel):
    await pg.evaluate("s => { const b = document.querySelector(s); if (b) b.click(); }", sel)


if __name__ == '__main__':
    sys.exit(asyncio.run(principal()))
