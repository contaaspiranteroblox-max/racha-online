"""RACHA v93 · FASE 4 — O GRUPO COM LÍDER NA TELA INICIAL (passa/falha, com as medidas impressas).
Na plataforma de teste (tests/plataforma: o app/api de verdade com o servidor das salas montado), duas contas amigas — a
Ana (num celular deitado de 844 × 390) e o Beto — usando os botões do jogo:
  1. o botão CRIAR GRUPO em cima do JOGAR (≥ 44 px, sem encostar em nada do lobby);
  2. criar o grupo, CHAMAR o Beto (o convite chega como um cartão pequeno em cima, com ACEITAR/RECUSAR) e aceitar;
  3. os membros ao lado da tampinha (a tampinha, o nome, o status DISPONÍVEL; a coroa na líder) sem cobrir nada do lobby;
  4. o JOGAR de quem não é o líder avisa que é o líder quem começa;
  5. o JOGAR da líder leva os dois para a ranqueada (a busca abre nos dois) e eles caem no MESMO time;
  6. depois da partida o grupo continua (de volta ao lobby, os dois no grupo);
  7. SAIR DO GRUPO: o outro fica sabendo e o grupo fecha.
  python3 tests/v93_fase4_test.py"""
import asyncio, json, os, sys, tempfile, time
from comum import Placar, rt, async_playwright
from v88_cliente_test import Plataforma, conta, abre_logado, espera, clica_texto

CAIXAS = """(() => {                                                  // o que o grupo desenha × o resto do lobby (botões e rótulos)
  const meus = [...document.querySelectorAll('#v93-grupo .v93-gm, #v93-grupo .v93-grupo-bt, #lb .v101-vaga')].filter(e => e.offsetParent && getComputedStyle(e).display !== 'none').map(e => e.getBoundingClientRect());   // (v101: + as vagas do lado da tampinha)
  const outros = [...document.querySelectorAll('#lb button, #lb .hm-skin, #lb .v90-dica')].filter(e => !e.closest('#v93-grupo') && !e.classList.contains('v101-vaga') && !e.closest('#lb-camada') && e.id !== 'lb-emblema' && e.offsetParent && getComputedStyle(e).visibility !== 'hidden')
    .map(e => ({r:e.getBoundingClientRect(), n:(e.getAttribute('aria-label') || e.textContent || e.className || '').trim().slice(0, 24)})).filter(o => o.r.width > 4 && o.r.height > 4);
  const cruza = (a, b) => a.left < b.right - 1 && a.right > b.left + 1 && a.top < b.bottom - 1 && a.bottom > b.top + 1;
  const bate = []; for (const m of meus) for (const o of outros) if (cruza(m, o.r)) bate.push(o.n);
  const fora = meus.filter(r => r.left < 0 || r.top < 0 || r.right > innerWidth || r.bottom > innerHeight).length;
  return {n:meus.length, bate, fora};
})()"""


async def principal():
    P = Placar('v93 · Fase 4 · o grupo com líder na tela inicial')
    banco = os.path.join(tempfile.mkdtemp(prefix='racha93g_'), 'p.sqlite')
    PL = Plataforma(banco).sobe()
    try:
        A = conta(PL, 'anagrupo'); B = conta(PL, 'betogrupo')
        PL.m('amigos.enviarPedido', {'termo': 'betogrupo'}, A['token'])
        ped = PL.q('amigos.pedidos', None, B['token'])['recebidos'][0]
        PL.m('amigos.responderPedido', {'pedidoId': ped['pedidoId'], 'aceitar': True}, B['token'])
        async with async_playwright() as pw:
            ba, pa, ea = await abre_logado(pw, PL, 'anagrupo', 844, 390)
            bb, pb, eb = await abre_logado(pw, PL, 'betogrupo')
            for pg in (pa, pb):
                await espera(pg, "!!NET49.id && NET49.ws && NET49.ws.readyState === 1", 15000, 300)
            on = await espera(pa, "(() => { v88CarregaAmigos(true); return !!v88StatusDe('%s'); })()" % str(B['pub']).zfill(6), 15000, 400)
            print('\n1) o botão')
            await rt(pa, "(() => { v93GrupoPinta(); return 1; })()"); await asyncio.sleep(.4)
            # (v101: o CRIAR GRUPO saiu da tela; as três vagas (+) do lado da tampinha fazem o papel dele — tocar numa cria o grupo)
            bt = await rt(pa, "(() => { if (LB.raiz.classList.contains('v101')){ const vs = [...document.querySelectorAll('#lb .v101-vaga')].filter(e => e.offsetParent); if (!vs.length) return null; const q = vs.map(e => e.getBoundingClientRect()); return {t:'+', n:vs.length, h:Math.round(Math.min(...q.map(x => x.height))), w:Math.round(Math.min(...q.map(x => x.width))), v101:true}; } const b = document.querySelector('#v93-grupo .v93-grupo-bt'), j = LB.jogar.getBoundingClientRect(); if (!b || document.getElementById('v93-grupo').hidden) return null; const r = b.getBoundingClientRect(); return {t:b.textContent.trim(), h:Math.round(r.height), w:Math.round(r.width), em_cima:r.bottom <= j.top + 1 && r.bottom >= j.top - 40 && r.right > j.left + 20 && r.left < j.right, inteiro:b.querySelector('b').scrollWidth <= b.querySelector('b').clientWidth + 1}; })()")
            cx = await rt(pa, CAIXAS)
            await pa.screenshot(path='tests/saida/v93_grupo_botao.png')
            if bt and bt.get('v101'):
                P.confere(on and bt['n'] == 3 and bt['h'] >= 44 and bt['w'] >= 44 and not cx['bate'] and not cx['fora'],
                          '1) v101: as três vagas (+) do lado da tampinha no lugar do CRIAR GRUPO (%s × %s px), sem encostar em nada do lobby' % (bt['w'], bt['h']), [on, bt, cx])
            else:
                P.confere(on and bt and bt['t'] == 'CRIAR GRUPO' and bt['h'] >= 44 and bt['em_cima'] and bt['inteiro'] and not cx['bate'] and not cx['fora'],
                          '1) CRIAR GRUPO em cima do JOGAR (%s × %s px, o texto inteiro), sem encostar em nada do lobby' % (bt and bt['w'], bt and bt['h']), [on, bt, cx])
            print('\n2) criar, chamar, aceitar')
            await rt(pa, "(document.querySelector('#lb.v101 .v101-vaga') || document.querySelector('#v93-grupo .v93-grupo-bt')).click()")   # (v101: o + da vaga)
            g = await espera(pa, "V93G.g && !document.querySelector('#v93-grupo .v93-gp').hidden ? V93G.g.membros.length : 0", 6000)
            await asyncio.sleep(.6); await pa.screenshot(path='tests/saida/v93_grupo_painel.png')
            pn = await rt(pa, """(() => { const p = document.querySelector('#v93-grupo .v93-gp'), r = p.getBoundingClientRect(), j = LB.jogar.getBoundingClientRect(), e = LB.emblema.getBoundingClientRect(); const topo = [...document.querySelectorAll('#lb button')].filter(x => !p.contains(x) && x.offsetParent && x.getBoundingClientRect().bottom < innerHeight*.15).map(x => x.getBoundingClientRect()).filter(q => q.right > r.left && q.left < r.right && q.bottom > r.top);
              return {w:Math.round(r.width), h:Math.round(r.height), jogar:r.bottom <= j.top + 1 || r.right <= j.left || r.left >= j.right, tampinha:r.left >= e.right - e.width*.15, barra:topo.length, dentro:r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight, cabe:p.scrollHeight <= p.clientHeight + 1}; })()""")
            P.confere(pn['jogar'] and pn['tampinha'] and pn['dentro'] and not pn['barra'] and pn['cabe'], '   o painel do grupo abre do lado (%s × %s px, sem rolar): não cobre o JOGAR, a tampinha nem a barra de cima' % (pn['w'], pn['h']), pn)
            ok = await espera(pa, "(() => { const li = [...document.querySelectorAll('#v93-grupo .v93-gp .v93-gp-lista.amigos li')].find(l => /betogrupo/.test(l.textContent)); const b = li && [...li.querySelectorAll('button')].find(x => /CHAMAR/.test(x.textContent)); if (!b) return false; b.click(); return true; })()", 8000, 300)
            cv = await espera(pb, "(() => { const c = document.querySelector('.v93-gc'); if (!c || c.hidden) return null; const r = c.getBoundingClientRect(); return {t:c.textContent, w:Math.round(r.width), top:Math.round(r.top), h:Math.round(r.height), vh:innerHeight}; })()", 8000)
            await pb.screenshot(path='tests/saida/v93_grupo_convite.png')
            P.confere(g == 1 and ok and cv and 'anagrupo chamou você' in cv['t'] and cv['w'] <= 560 and cv['top'] < cv['vh']*.35,
                      '2) a Ana cria o grupo e CHAMA o Beto: o convite chega como um cartão pequeno em cima (%s px de largura)' % (cv and cv['w']), [g, ok, cv])
            await rt(pb, "(() => { const b = [...document.querySelectorAll('.v93-gc button')].find(x => /ACEITAR/.test(x.textContent)); if (b) b.click(); return !!b; })()")
            dois = await espera(pa, "V93G.g && V93G.g.membros.length === 2 && V93G.g.membros.every(m => m.st === 'disponivel') ? V93G.g.membros.map(m => m.nome + (m.lider ? '*' : '')).join(' ') : ''", 8000)
            P.confere(dois and 'anagrupo*' in dois and 'betogrupo' in dois, '   ACEITAR: os dois no grupo, disponíveis, a coroa na Ana (%s)' % dois, dois)
            print('\n3) os membros ao lado da tampinha')
            await rt(pa, "(() => { V93G.painel = false; v93GrupoPinta(); return 1; })()"); await asyncio.sleep(.5)
            mb = await rt(pa, "(() => { const m = LB.raiz.classList.contains('v101') ? [...document.querySelectorAll('#lb .v101-vaga.cheia')].filter(e => e.offsetParent) : [...document.querySelectorAll('#v93-grupo .v93-gm:not(.vaga)')].filter(e => getComputedStyle(e).display !== 'none'); return m.map(e => ({t:e.textContent, cap:!!e.querySelector('canvas'), r:Math.round(e.getBoundingClientRect().width)})); })()")   # (v101: nas vagas do lado da tampinha)
            lider = await rt(pa, "LB.raiz.classList.contains('v93-lider')")
            cx = await rt(pa, CAIXAS)
            await pa.screenshot(path='tests/saida/v93_grupo_lobby.png')
            mbB = await rt(pb, "(() => { v93GrupoPinta(); const m = [...document.querySelectorAll('#v93-grupo .v93-gm.lider')]; return m.map(e => e.textContent); })()")
            gbt = await rt(pa, "(() => { const b = document.querySelector('#v93-grupo .v93-grupo-bt b'); return {t:b.textContent, inteiro:b.scrollWidth <= b.clientWidth + 1}; })()")
            P.confere(gbt['t'] == 'GRUPO 2/4' and gbt['inteiro'], '   o botão vira "%s" (o texto inteiro)' % gbt['t'], gbt)
            P.confere(mb and any('betogrupo' in x['t'] and 'DISPONÍVEL' in x['t'] and x['cap'] for x in mb) and lider and mbB and 'anagrupo' in mbB[0] and not cx['bate'] and not cx['fora'],
                      '3) o Beto aparece ao lado da tampinha da Ana (a tampinha, o nome, DISPONÍVEL); a coroa na Ana (no lobby dela e no do Beto); nada cobre o lobby', [mb, lider, mbB, cx])
            await pb.screenshot(path='tests/saida/v93_grupo_lobby_beto.png')
            print('\n4) e 5) a busca')
            await rt(pb, "(() => { X49UI.toast.textContent = ''; LB.jogar.click(); return 1; })()"); await asyncio.sleep(.4)
            tb = await rt(pb, "({t:X49UI.toast.textContent, busca:!!V79R.busca})")
            P.confere('líder' in tb['t'] and not tb['busca'], '4) o JOGAR do Beto avisa: "%s"' % tb['t'], tb)
            await rt(pa, "(() => { CONTA.rq.n = 2; contaSalvar(); LB.jogar.click(); return 1; })()")
            ba_ = await espera(pa, "V79R.busca && V79R.busca.grupo ? 1 : 0", 5000)
            bb_ = await espera(pb, "V79R.busca && V79R.busca.grupo ? 1 : 0", 5000)
            await pb.screenshot(path='tests/saida/v93_grupo_busca.png')
            jA = await espera(pa, "NET49.playing && NET49.room && NET49.room.ranked ? 1 : 0", 20000, 300)
            jB = await espera(pb, "NET49.playing && NET49.room && NET49.room.ranked ? 1 : 0", 20000, 300)
            times = [await rt(pg, "Math.floor(NET49.localSlot/NET49.room.n)") for pg in (pa, pb)]
            P.confere(ba_ and bb_ and jA and jB and times[0] == times[1], '5) o JOGAR da Ana abre a busca nos dois e a ranqueada começa com os dois no MESMO time (time %s)' % times, [ba_, bb_, jA, jB, times])
            print('\n6) depois da partida')
            for i in range(3):
                await rt(pa, "(() => { net49Send({type:'__teste_gol', time:P.time}); return 1; })()"); await asyncio.sleep(2.6)
            fim = await espera(pa, "fimAberto() ? 1 : 0", 15000, 300) and await espera(pb, "fimAberto() ? 1 : 0", 15000, 300)
            for pg in (pa, pb):
                await rt(pg, "(() => { const b = fimEl('fim-lobby'); if (b) b.click(); return 1; })()")
            volta = await espera(pa, "lobby.aberto && !NET49.room && V93G.g && V93G.g.membros.length === 2 && V93G.g.membros.every(m => m.st === 'disponivel') ? 1 : 0", 12000, 300)
            vis = await espera(pa, "(() => { v93GrupoPinta(); return [...document.querySelectorAll('#v93-grupo .v93-gm:not(.vaga)')].some(e => /betogrupo/.test(e.textContent) && getComputedStyle(e).display !== 'none'); })()", 4000)
            P.confere(fim and volta and vis, '6) a partida acaba (3 × 0); de volta ao lobby, o grupo continua (os dois, disponíveis)', [fim, volta, vis])
            print('\n7) sair do grupo')
            await rt(pb, "(() => { V93G.painel = true; v93GrupoPinta(); const b = [...document.querySelectorAll('#v93-grupo .v93-gp button')].find(x => /^SAIR$/.test(x.textContent.trim())); if (b) b.click(); return !!b; })()")
            saiu = await espera(pb, "V93G.g === null ? 1 : 0", 6000) and await espera(pa, "V93G.g && V93G.g.membros.length === 1 ? 1 : 0", 6000)
            P.confere(saiu, '7) SAIR DO GRUPO: o Beto sai e a Ana fica sabendo (o grupo dela fica só com ela)', saiu)
            print('\n8) o grupo velho no aparelho, depois de uma queda')
            # (o Beto, já sem grupo, com um grupo velho no aparelho — como quem foi tirado do grupo com o celular bloqueado):
            # a conexão cai e volta; o aparelho pergunta o grupo e limpa o velho
            await rt(pb, "(() => { V93G.g = {id:'gvelho', lider:'c999', modo:2, max:4, membros:[{id:'c999', p:'000999', nome:'Velho', st:'disponivel', lider:true}, {id:NET49.id, p:'0', nome:'eu', st:'disponivel', lider:false}], convites:[]}; try { NET49.ws.close(); } catch (_) {} return 1; })()")
            limpo = await espera(pb, "V93G.g === null && !!NET49.id && NET49.ws && NET49.ws.readyState === 1 ? 1 : 0", 20000, 300)
            P.confere(limpo, '8) a conexão volta: o aparelho pergunta o grupo ao servidor e limpa o grupo velho', limpo)
            erros = [e for e in ea + eb if 'WebSocket' not in e]
            P.confere(not erros, 'nenhum erro de JavaScript', erros[:3])
            await ba.close(); await bb.close()
    finally:
        PL.desce()
    return P.fim()


if __name__ == '__main__':
    sys.exit(asyncio.run(principal()))
