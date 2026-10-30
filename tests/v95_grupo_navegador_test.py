"""RACHA v95 · O GRUPO NA RANQUEADA no navegador (passa/falha, com as medidas impressas).
Na plataforma de teste (tests/plataforma: o app/api de verdade com o servidor das salas montado), duas contas amigas — a
Ana (a dona do grupo, num celular deitado de 844 × 390) e o Beto — usando os botões do jogo:
  1. no lobby, com grupo: o JOGAR do Beto vira PRONTO (a etiqueta "O LÍDER COMEÇA A BUSCA"); o JOGAR da Ana mostra que falta
     o pronto e avisa quem não está pronto;
  2. o Beto toca em PRONTO: fica PRONTO ✓ (verde); a Ana vê o Beto PRONTO ✓ ao lado da tampinha e "O GRUPO ESTÁ PRONTO";
  3. o JOGAR da Ana leva os dois para a ranqueada (o mesmo time);
  4. no fim: o JOGAR DE NOVO é do grupo — o Beto toca, os dois veem quem já tocou (✓) e o relógio de 10 s; a Ana toca e a
     busca do grupo abre nos dois sozinha (e a partida seguinte começa);
  5. no fim da segunda: só o Beto toca; em 10 s os dois voltam para o lobby (o aviso de quem não confirmou);
  6. no fim da terceira: a Ana toca e o Beto vai para o LOBBY: os dois voltam para o lobby na hora.
  python3 tests/v95_grupo_navegador_test.py"""
import asyncio, json, os, sys, tempfile, time
from comum import Placar, rt, async_playwright
from v88_cliente_test import Plataforma, conta, abre_logado, espera

JOGAR = """(() => { const J = LB.jogar, t = J.querySelector('.lb-jogar-tit'), e = J.querySelector('.v95-jogar-pr'), r = J.getBoundingClientRect(), tr = t.getBoundingClientRect();
  const bg = getComputedStyle(J, '::before').backgroundImage;
  return {t:t.textContent, e:e && !e.hidden ? e.textContent : '', pronto:J.classList.contains('v95-pronto'), on:J.classList.contains('v95-pronto-on'), espera:J.classList.contains('v95-lider-espera'),
    cabe:tr.left >= r.left - 2 && tr.right <= r.right + 2, verde:/rgb\\(82, 224, 131\\)|rgb\\(37, 181, 88\\)/.test(bg)}; })()"""
DENOVO = """(() => { const el = document.getElementById('v95-denovo'), b = fimEl('fim-denovo');
  if (!el) return {aberto:false, bt:b && b.textContent};
  const cabe = !!b && b.scrollWidth <= b.clientWidth + 1 && (() => { const l = fimEl('fim-lobby').getBoundingClientRect(), r = b.getBoundingClientRect(); return r.right <= l.left + 1; })();
  return {aberto:!el.hidden, bt:b && b.textContent, cabe, t:(el.querySelector('.v95-dn-t') || {}).textContent, sim:[...el.querySelectorAll('.v95-dn-m.sim .v95-dn-nome')].map(x => x.textContent),
    nao:[...el.querySelectorAll('.v95-dn-m:not(.sim) .v95-dn-nome')].map(x => x.textContent), nota:(el.querySelector('.v95-dn-nota') || {}).textContent}; })()"""


async def joga_ate_o_fim(pa, pb):
    """Os gols do teste (o servidor de teste aceita __teste_gol) até o fim; os dois na tela do fim."""
    for i in range(3):
        await rt(pa, "(() => { net49Send({type:'__teste_gol', time:P.time}); return 1; })()"); await asyncio.sleep(2.6)
    return (await espera(pa, "fimAberto() ? 1 : 0", 15000, 300)) and (await espera(pb, "fimAberto() ? 1 : 0", 15000, 300))


async def principal():
    P = Placar('v95 · o grupo na ranqueada (o PRONTO, o JOGAR do dono e o JOGAR DE NOVO com 10 s)')
    banco = os.path.join(tempfile.mkdtemp(prefix='racha95g_'), 'p.sqlite')
    PL = Plataforma(banco).sobe()
    try:
        A = conta(PL, 'anapronta'); B = conta(PL, 'betopronto')
        PL.m('amigos.enviarPedido', {'termo': 'betopronto'}, A['token'])
        ped = PL.q('amigos.pedidos', None, B['token'])['recebidos'][0]
        PL.m('amigos.responderPedido', {'pedidoId': ped['pedidoId'], 'aceitar': True}, B['token'])
        async with async_playwright() as pw:
            ba, pa, ea = await abre_logado(pw, PL, 'anapronta', 844, 390)
            bb, pb, eb = await abre_logado(pw, PL, 'betopronto')
            for pg in (pa, pb):
                await espera(pg, "!!NET49.id && NET49.ws && NET49.ws.readyState === 1", 15000, 300)
            await espera(pa, "(() => { v88CarregaAmigos(true); return !!v88StatusDe('%s'); })()" % str(B['pub']).zfill(6), 15000, 400)
            # o grupo: a Ana cria e chama o Beto; o Beto aceita
            await rt(pa, "(() => { v93GrupoManda('grupo_cria', {n:2, pts:0}); return 1; })()")
            await espera(pa, "V93G.g ? 1 : 0", 6000)
            await rt(pa, "(() => { v93GrupoManda('grupo_convida', {para:'%s', n:2, pts:0}); return 1; })()" % str(B['pub']).zfill(6))
            await espera(pb, "V93G.convites.length ? 1 : 0", 8000)
            await rt(pb, "(() => { v93GrupoResponde(V93G.convites[0].id, true); return 1; })()")
            dois = await espera(pa, "V93G.g && V93G.g.membros.length === 2 && V93G.g.membros.every(m => m.st === 'disponivel') ? 1 : 0", 8000)
            await rt(pa, "(() => { V93G.painel = false; CONTA.rq.n = 2; contaSalvar(); v93GrupoPinta(); return 1; })()"); await rt(pb, "(() => { V93G.painel = false; v93GrupoPinta(); return 1; })()")
            await asyncio.sleep(.8)

            print('\n1) o PRONTO no lobby')
            jb = await rt(pb, JOGAR); ja = await rt(pa, JOGAR)
            await pb.screenshot(path='tests/saida/v95_grupo_pronto_beto.png'); await pa.screenshot(path='tests/saida/v95_grupo_lider_ana.png')
            P.confere(dois and jb['t'] == 'PRONTO' and jb['pronto'] and not jb['on'] and jb['e'] == 'O LÍDER COMEÇA A BUSCA' and jb['cabe'],
                      '1) com grupo, o JOGAR do Beto vira "%s" (a etiqueta: "%s")' % (jb['t'], jb['e']), [dois, jb])
            P.confere(ja['t'] == 'JOGAR' and ja['espera'] and ja['e'] == 'ESPERANDO O PRONTO', '   o JOGAR da Ana (a dona) mostra "%s"' % ja['e'], ja)
            await rt(pa, "(() => { X49UI.toast.textContent = ''; LB.jogar.click(); return 1; })()"); await asyncio.sleep(.5)
            ta = await rt(pa, "({t:X49UI.toast.textContent, busca:!!V79R.busca})")
            P.confere('Beto' in ta['t'].replace('betopronto', 'Beto') and 'pronto' in ta['t'] and not ta['busca'], '   o JOGAR da Ana sem o pronto avisa: "%s" (a busca não abre)' % ta['t'], ta)

            print('\n2) o Beto toca em PRONTO')
            await rt(pb, "(() => { LB.jogar.click(); return 1; })()")
            on = await espera(pa, "V93G.g && V93G.g.membros.some(m => !m.lider && m.pronto) ? 1 : 0", 6000)
            await asyncio.sleep(.9)
            jb = await rt(pb, JOGAR); ja = await rt(pa, JOGAR)
            chip = await rt(pa, "(() => { v93GrupoPinta(); const m = [...document.querySelectorAll('#v93-grupo .v93-gm.st-pronto')].filter(e => getComputedStyle(e).display !== 'none'); return m.map(e => e.textContent); })()")
            await pb.screenshot(path='tests/saida/v95_grupo_pronto_on.png'); await pa.screenshot(path='tests/saida/v95_grupo_lider_pronto.png')
            P.confere(on and jb['t'] == 'PRONTO ✓' and jb['on'] and jb['verde'] and jb['e'] == 'ESPERANDO O LÍDER', '2) o Beto fica "%s", verde ("%s")' % (jb['t'], jb['e']), jb)
            P.confere(chip and any('PRONTO' in c for c in chip) and not ja['espera'] and ja['e'] == 'O GRUPO ESTÁ PRONTO', '   a Ana vê o Beto PRONTO ✓ ao lado da tampinha e "%s"' % ja['e'], [chip, ja])

            print('\n3) o JOGAR da Ana')
            await rt(pa, "(() => { LB.jogar.click(); return 1; })()")
            ba_ = await espera(pa, "V79R.busca && V79R.busca.grupo ? 1 : 0", 6000); bb_ = await espera(pb, "V79R.busca && V79R.busca.grupo ? 1 : 0", 6000)
            jA = await espera(pa, "NET49.playing && NET49.room && NET49.room.ranked ? 1 : 0", 25000, 300)
            jB = await espera(pb, "NET49.playing && NET49.room && NET49.room.ranked ? 1 : 0", 25000, 300)
            times = [await rt(pg, "Math.floor(NET49.localSlot/NET49.room.n)") for pg in (pa, pb)]
            P.confere(ba_ and bb_ and jA and jB and times[0] == times[1], '3) a busca abre nos dois e a ranqueada começa com os dois no mesmo time (time %s)' % times, [ba_, bb_, jA, jB, times])

            print('\n4) o JOGAR DE NOVO do grupo: os dois tocam')
            fim = await joga_ate_o_fim(pa, pb)
            await asyncio.sleep(.6)
            d0 = await rt(pb, DENOVO)
            await rt(pb, "(() => { fimEl('fim-denovo').click(); return 1; })()")
            vb = await espera(pb, "(() => { const g = V93G.g; return g && g.denovo && g.denovo.votos.length === 1 ? 1 : 0; })()", 5000)
            va = await espera(pa, "(() => { const g = V93G.g; return g && g.denovo && g.denovo.votos.length === 1 ? 1 : 0; })()", 5000)
            await asyncio.sleep(1.2)
            db = await rt(pb, DENOVO); da = await rt(pa, DENOVO)
            await pa.screenshot(path='tests/saida/v95_grupo_denovo_ana.png'); await pb.screenshot(path='tests/saida/v95_grupo_denovo_beto.png')
            P.confere(fim and d0['bt'] == 'JOGAR DE NOVO' and not d0['aberto'], '4) no fim, o botão do Beto diz "%s" (o quadro do grupo aparece quando alguém toca)' % d0['bt'], [fim, d0])
            P.confere(vb and va and db['aberto'] and db['bt'] == 'ESPERANDO…' and db['sim'] == ['VOCÊ'] and da['aberto'] and da['sim'] == ['betopronto'] and da['nao'] == ['VOCÊ']
                      and da['t'] and 6 <= int(da['t']) <= 10 and da['bt'] == 'JOGAR DE NOVO' and db['cabe'] and da['cabe'],
                      '   o Beto toca: os dois veem a votação — na Ana: "%s" ✓, falta ela, o relógio em %s s, o botão "%s"' % (da.get('sim'), da.get('t'), da.get('bt')), [db, da])
            await rt(pa, "(() => { fimEl('fim-denovo').click(); return 1; })()")
            ba2 = await espera(pa, "V79R.busca && V79R.busca.grupo && lobby.aberto && !fimAberto() ? 1 : 0", 8000)
            bb2 = await espera(pb, "V79R.busca && V79R.busca.grupo && lobby.aberto && !fimAberto() ? 1 : 0", 8000)
            await pa.screenshot(path='tests/saida/v95_grupo_denovo_busca.png')
            jA = await espera(pa, "NET49.playing && NET49.room && NET49.room.ranked && !fimAberto() ? 1 : 0", 25000, 300)
            jB = await espera(pb, "NET49.playing && NET49.room && NET49.room.ranked && !fimAberto() ? 1 : 0", 25000, 300)
            P.confere(ba2 and bb2 and jA and jB, '   a Ana toca também: a busca do grupo abre nos dois sozinha e a partida seguinte começa', [ba2, bb2, jA, jB])

            print('\n5) só o Beto toca: em 10 s, todo mundo no lobby')
            fim = await joga_ate_o_fim(pa, pb)
            await asyncio.sleep(.5)
            await rt(pb, "(() => { fimEl('fim-denovo').click(); return 1; })()")
            t0 = time.time()
            volta = await espera(pa, "lobby.aberto && !fimAberto() && !NET49.room ? 1 : 0", 16000, 200) and await espera(pb, "lobby.aberto && !fimAberto() && !NET49.room ? 1 : 0", 4000, 200)
            dt = time.time() - t0
            tb = await rt(pb, "X49UI.toast.textContent")
            await pb.screenshot(path='tests/saida/v95_grupo_denovo_tempo.png')
            P.confere(fim and volta and 8.5 <= dt <= 13 and 'não confirmou a tempo' in tb, '5) a Ana não tocou: em %.1f s os dois voltam para o lobby ("%s")' % (dt, tb), [fim, volta, dt, tb])
            jb = await rt(pb, JOGAR)
            P.confere(jb['t'] == 'PRONTO' and not jb['on'], '   no lobby, o Beto toca em PRONTO de novo ("%s")' % jb['t'], jb)

            print('\n6) o LOBBY durante a votação')
            await rt(pb, "(() => { LB.jogar.click(); return 1; })()")
            await espera(pa, "V93G.g && V93G.g.membros.some(m => !m.lider && m.pronto) ? 1 : 0", 6000)
            await rt(pa, "(() => { LB.jogar.click(); return 1; })()")
            jA = await espera(pa, "NET49.playing && NET49.room && NET49.room.ranked && !fimAberto() ? 1 : 0", 25000, 300)
            fim = jA and await joga_ate_o_fim(pa, pb)
            await asyncio.sleep(.5)
            await rt(pa, "(() => { fimEl('fim-denovo').click(); return 1; })()")
            await espera(pb, "(() => { const g = V93G.g; return g && g.denovo ? 1 : 0; })()", 5000)
            await rt(pb, "(() => { fimEl('fim-lobby').click(); return 1; })()")
            t0 = time.time()
            volta = await espera(pa, "lobby.aberto && !fimAberto() && !NET49.room ? 1 : 0", 5000, 150) and await espera(pb, "lobby.aberto && !fimAberto() && !NET49.room ? 1 : 0", 3000, 150)
            dt = time.time() - t0
            ta = await rt(pa, "X49UI.toast.textContent")
            P.confere(fim and volta and dt < 3 and 'voltou para o lobby' in ta, '6) a Ana toca e o Beto vai para o LOBBY: os dois no lobby na hora (%.1f s, "%s")' % (dt, ta), [fim, volta, dt, ta])

            erros = [e for e in ea + eb if 'WebSocket' not in e]
            P.confere(not erros, 'nenhum erro de JavaScript', erros[:3])
            await ba.close(); await bb.close()
    finally:
        PL.desce()
    return P.fim()


if __name__ == '__main__':
    sys.exit(asyncio.run(principal()))
