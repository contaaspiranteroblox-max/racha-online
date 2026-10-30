"""RACHA v93 · FASE 2 — PARTIDAS, PLACAR E CRAQUE DA PARTIDA (passa/falha, com as medidas impressas).
Contra os bots (um iPhone de mentira, toques de verdade pelo CDP):
  1. a CONTAGEM 3, 2, 1, JÁ! quando a partida começa (depois da apresentação dos times, quando ela aparece): a partida não
     anda e a tampinha não sai do lugar com o dedo no analógico; no JÁ! a partida começa;
  2. o PAINEL DE JOGADORES pelo botão do lado do placar (com o dedo): os dois times, o nome, a posição, os números; o painel
     não fica em cima de nenhum controle e não pega o toque (o jogo continua por baixo);
  3. um gol seu: o número do painel sobe, o REPLAY passa com o CARTÃO de quem marcou (o seu nome);
  4. o fim (3 × 0): o CRAQUE DA PARTIDA na tela do fim (VOCÊ É O CRAQUE DA PARTIDA) e a conquista no perfil.
Online, com o servidor da turma de verdade (tests/servidor_visitantes.cjs com a contagem e o replay ligados) e dois navegadores
numa sala 1v1 (e um terceiro assistindo):
  5. a CONTAGEM chega aos dois juntos; durante ela o servidor não anda a tampinha de quem segura o analógico;
  6. o PAINEL que o servidor manda: os dois ativos, o ping de cada um, os gols; quem assiste no banco (e desenhado nele);
  7. o REPLAY do gol para os dois: PULAR é um voto (1/2 no outro), com os dois votos o servidor encerra para os dois ao mesmo
     tempo; numa queda no meio do replay, a votação não trava (quem caiu sai da conta) e o painel mostra "caiu";
  8. o fim: o CRAQUE calculado pelo servidor chega a todos (o cartão na tela do fim).
  python3 tests/v93_fase2_test.py [--sem-online]"""
import asyncio, json, math, os, sys, time
from comum import Placar, rt, async_playwright, HARNESS
from v92_hud_test import CELULARES, Dedos, abre_cel, espera, geo, cobre

COMECA_BOTS = "(() => { if (!lobby.aberto) abrirLobby(); X49.mode = 'casual'; x49Save(); x49Start(1, 0); return 1; })()"


async def bots(P, pw):
    b, ctx, pg, d, cdp, erros = await abre_cel(pw, 'iPhone')
    try:
        await rt(pg, COMECA_BOTS)
        ok = await espera(pg, "RQ.on && !!V93P.contagem && ARB_PARADO()", 8000, 40)   # (a contagem começa com a partida: depois da apresentação, quando tem)
        cont = await rt(pg, "({c:!!V93P.contagem, para:ARB_PARADO(), est:RQ.estado, falta:Math.round(V93P.contagem.fim - performance.now())})")
        t0 = await rt(pg, "[RQ.tick, P.x, P.y]")
        g = await geo(pg); j = g['ctl']['joy']
        await d.poe(3, j['x'], j['y']); await d.move(3, j['x'] + 60, j['y'] - 10); await asyncio.sleep(1.6)
        t1 = await rt(pg, "[RQ.tick, P.x, P.y, !!V93P.contagem]")
        await d.tira(3)
        P.confere(ok and cont['c'] and cont['para'] and t1[0] == t0[0] and abs(t1[1] - t0[1]) < .01 and t1[3],
                  '1) contra os bots: a CONTAGEM (%s ms) começa com a partida; ela não anda (o relógio e a tampinha parados, mesmo com o dedo no analógico)' % cont.get('falta'), [cont, t0, t1])
        await espera(pg, "!V93P.contagem || V93P.contagem.fim < performance.now()", 5000)
        await asyncio.sleep(.3)
        await d.poe(3, j['x'], j['y']); await d.move(3, j['x'] + 60, j['y'] - 10); await asyncio.sleep(.8)
        t2 = await rt(pg, "[RQ.tick, P.x, P.y]")
        await d.tira(3)
        P.confere(t2[0] > t1[0] + 20 and math.hypot(t2[1] - t1[1], t2[2] - t1[2]) > 20, '   no JÁ! a partida começa e a tampinha anda com o dedo', [t1, t2])
        # 2) o painel de jogadores pelo botão do lado do placar
        btr = await rt(pg, "(() => { const r = V93P.el.bt.getBoundingClientRect(); return V93P.el.bt.hidden ? null : {x:r.left + r.width/2, y:r.top + r.height/2, w:r.width}; })()")
        if btr:
            await d.toca(btr['x'], btr['y']); await asyncio.sleep(.5)
        pn = await rt(pg, """(() => { const p = V93P.el.p, r = p.getBoundingClientRect();
          return {vis:!p.hidden, n:p.querySelectorAll('.v93-pj-l').length, nomes:[...p.querySelectorAll('.v93-pj-l b')].map(x => x.textContent), x:r.left, y:r.top, w:r.width, h:r.height, pe:getComputedStyle(p).pointerEvents}; })()""")
        g = await geo(pg)
        sobre = [k for k, c in g['ctl'].items() if cobre(pn, c, 1)] if pn['vis'] else []
        P.confere(btr and btr['w'] >= 36 and pn['vis'] and pn['n'] == 2 and not sobre and pn['pe'] == 'none',
                  '2) o botão do lado do placar (com o dedo) abre o PAINEL DE JOGADORES: os dois times (%s), em cima de nenhum controle, sem pegar o toque' % ' × '.join(pn['nomes']), [btr, pn, sobre])
        # 3) um gol seu: o painel conta e o replay passa com o cartão de quem marcou
        await rt(pg, """(() => { window.__cartao = []; const c0 = v93CartaoGol; v93CartaoGol = function(g, R, T, I){ window.__cartao.push(V93P.gol && V93P.gol.autor ? V93P.gol.autor.nome : ''); return c0.apply(this, arguments); };
          RQ.placar = [0, 0]; P.x = P.ax = LX1 - U(7); P.y = P.ay = CY; P.vx = P.vy = 0; B.x = LX1 - U(4.2); B.y = CY; B.vx = B.vy = 0; for (const q of RQ.jog) if (q !== P){ q.x = LX0 + U(6); q.y = CY + U(8); q.vx = q.vy = 0; } return 1; })()""")
        await rt(pg, "(() => { P.x = P.ax = B.x - (P.r + B.r + 1); doKick(true); return 1; })()")
        golou = await espera(pg, "RQ.placar[0] === 1", 5000)
        gl = await rt(pg, "(V93P.estat.get('eu') || {}).g | 0")
        rp = await espera(pg, "RP.ativo && window.__cartao.length > 3", 9000)
        nome = await rt(pg, "[perfil.nome, window.__cartao[window.__cartao.length - 1]]")
        await rt(pg, "(() => { V93P.aberto = true; v93PainelPinta(); return 1; })()")
        P.confere(golou and gl == 1 and rp and nome[1] == nome[0], '3) o seu gol: o número sobe (1 gol) e o REPLAY passa com o CARTÃO de quem marcou ("%s")' % nome[1], [golou, gl, rp, nome])
        await rt(pg, "rpFim(); 1"); await asyncio.sleep(.6)
        # 4) o fim: o craque da partida
        cq0 = await rt(pg, "perfil.st.craque | 0")
        for i in range(2):
            await espera(pg, "RQ.estado === 'saida' || RQ.estado === 'jogo'", 6000)
            await rt(pg, """(() => { RQ.estado = 'jogo'; P.x = P.ax = LX1 - U(7); P.y = P.ay = CY; P.vx = P.vy = 0; B.x = LX1 - U(4.2); B.y = CY; B.vx = B.vy = 0;
              for (const q of RQ.jog) if (q !== P){ q.x = LX0 + U(6); q.y = CY + U(8); q.vx = q.vy = 0; } P.x = P.ax = B.x - (P.r + B.r + 1); doKick(true); return 1; })()""")
            await espera(pg, "RQ.placar[0] === %d" % (i + 2), 5000)
            if i == 0:
                await espera(pg, "RP.ativo", 8000); await rt(pg, "rpFim(); 1")
        fim = await espera(pg, "(() => { const e = document.getElementById('v93-craque'); return e && !e.hidden && !fimEl('fim').hidden ? e.textContent : ''; })()", 12000)
        cq1 = await rt(pg, "perfil.st.craque | 0")
        await pg.screenshot(path='tests/saida/v93_craque_bots.png')
        P.confere(fim and 'VOCÊ É O CRAQUE' in fim and cq1 == cq0 + 1, '4) 3 × 0: o CRAQUE DA PARTIDA na tela do fim ("%s") e a conquista no perfil (%d → %d)' % ((fim or '')[:60], cq0, cq1), fim)
        P.confere(not [e for e in erros if 'Failed to load' not in e], '   nenhum erro de JavaScript (contra os bots)', erros[:3])
    finally:
        await b.close()


async def sala_contagem(pw, url, ws):
    """a sala 1v1 do v92_online_test.sala, com o dedo de Ana no analógico desde ANTES de começar (e as amostras da tampinha)"""
    from v92_online_test import JOGA
    import v92_online_medidas as MED
    A = await MED.sessao(pw, url, 'Ana', ws); Bp = await MED.sessao(pw, url, 'Beto', ws)
    for pg in (A, Bp):
        await rt(pg, "abreTela('amigos')")
    await espera(A, "!!NET49.id", 10000); await espera(Bp, "!!NET49.id", 10000)
    await rt(A, "(() => { Object.assign(SX.form, {onde:'online', pub:true, n:1, map:0, jogo:'futebol', tempo:0, bots:false, nome:'v93'}); sxCriar(); return 1; })()")
    cod = await espera(A, "NET49.room && NET49.room.code", 8000)
    await rt(Bp, "(() => { net49Send({type:'join', code:%s, slot:1}); return 1; })()" % json.dumps(cod))
    await espera(A, "NET49.room && NET49.room.members.length === 2", 8000)
    await rt(A, "document.querySelector('.v70-sl-atalhos .entrar').click()")
    await espera(A, "NET49.room.roster.indexOf(NET49.id) >= 0 && NET49.room.roster.every(Boolean)", 8000)
    await rt(A, """(() => { window.__am = []; window.__dedo = setInterval(() => { if (!NET49.playing || !RQ.on) return; joy.id = 77; joy.ativo = true; joy.dx = 60; joy.dy = 0;
      window.__am.push({c:!!V93P.contagem && V93P.contagem.fim > performance.now(), x:P.x, y:P.y, t:Date.now()}); }, 50); return 1; })()""")
    await rt(A, "slIniciar()")
    ok = await espera(A, JOGA, 14000) and await espera(Bp, JOGA, 14000)
    await asyncio.sleep(1.5)
    am = await rt(A, "(() => { clearInterval(window.__dedo); joy.id = null; joy.ativo = false; joy.dx = joy.dy = 0; return window.__am; })()")
    for pg in (A, Bp):
        await rt(pg, "(() => { filaPop.length = 0; if (!LB.pop.hidden) fechaPop(); return 1; })()")
    return A, Bp, ok, am


async def online(P, pw):
    os.environ['RACHA_CONTAGEM_MS'] = '3000'; os.environ['RACHA_REPLAY'] = '1'; os.environ['RACHA_REPLAY_MS'] = '7000'
    from v92_online_test import sobe
    import v92_online_medidas as MED
    srv, prx, url, ws = sobe(False)
    A = Bp = Cp = None
    try:
        A, Bp, ok, am = await sala_contagem(pw, url, ws)
        cm = [await rt(pg, "V93P.contagemMsg") for pg in (A, Bp)]
        durante = [x for x in am if x['c']]; depois = [x for x in am if not x['c']]
        firme = [x for x in durante if x['t'] - durante[0]['t'] >= 400] if durante else []   # (o primeiro quadro da contagem põe a formação da saída)
        mexeu = max((math.hypot(x['x'] - firme[0]['x'], x['y'] - firme[0]['y']) for x in firme), default=99) if firme else 99
        andou = math.hypot(depois[-1]['x'] - durante[-1]['x'], depois[-1]['y'] - durante[-1]['y']) if durante and depois else 0
        juntos = cm[0] and cm[1] and abs(cm[0]['em'] - cm[1]['em']) < 400
        # (o tempo do aviso da contagem ao primeiro quadro andando, em cada aparelho: o servidor segura 3 s; o aparelho lê o aviso
        #  só depois de montar a partida — que chega junto —, então a medida daqui fica um pouco abaixo; sem a contagem seria ~0)
        seg = [x['anda'] - x['em'] for x in cm if x and x.get('anda')]
        segura = len(seg) == 2 and max(seg) >= 2300 and min(seg) >= 1900
        P.confere(ok and juntos and segura and len(firme) > 15 and mexeu < 2 and andou > 30,
                  '5) online: a CONTAGEM chega aos dois juntos (%s ms de diferença) e o servidor segura a partida até o JÁ! (%s ms); com o dedo no analógico desde antes, a tampinha fica parada (%.1f px em %d amostras) e depois anda (%.0f px)'
                  % (abs(cm[0]['em'] - cm[1]['em']) if juntos else '?', max(seg) if seg else '?', mexeu, len(firme), andou), [cm, len(firme), mexeu, andou])
        # 6) o painel do servidor (o ping chega a cada 3 s)
        await asyncio.sleep(3.5)
        pa = await espera(A, "V93P.painel && V93P.painel.j.every(x => x.st === 'ativo' && x.ms != null) ? V93P.painel.j.map(x => [x.nome, x.st, x.ms]) : null", 8000, 200)
        P.confere(pa and len(pa) == 2, '6) o PAINEL que o servidor manda: os dois ativos, com o ping de cada um (%s)' % pa, pa)
        Cp = await MED.sessao(pw, url, 'Caio', ws)
        await rt(Cp, "abreTela('amigos')")
        await espera(Cp, "!!NET49.id", 10000)
        cod = await rt(A, "NET49.room.code")
        await rt(Cp, "(() => { net49Send({type:'join', code:%s, spectate:true}); return 1; })()" % json.dumps(cod))
        await espera(Cp, "NET49.playing && NET49.localSlot < 0", 10000)
        await rt(Cp, "(() => { net49Send({type:'banco', on:true}); return 1; })()")
        fora = await espera(A, "V93P.painel && V93P.painel.fora && V93P.painel.fora.find(x => x.nome === 'Caio' && x.banco) ? V93P.painel.fora.map(x => x.nome + (x.banco ? ' (reserva)' : '')) : null", 6000, 150)
        await rt(A, "(() => { window.__banco = 0; const b0 = v93Banco; v93Banco = function(){ window.__banco++; return b0.apply(this, arguments); }; return 1; })()")
        await asyncio.sleep(.6)
        nb = await rt(A, "window.__banco")
        await A.screenshot(path='tests/saida/v93_banco.png')
        P.confere(fora and nb > 5, '   quem assiste entra no BANCO (reserva) e aparece no painel e no banco ao lado do campo (%s; %d desenhos)' % (fora, nb), [fora, nb])
        # 7) o replay do gol para todos, com a votação
        for pg in (A, Bp): await rt(pg, "(() => { window.__rfim = 0; const f0 = v93ReplayOnlineFim; v93ReplayOnlineFim = function(m){ window.__rfim = Date.now(); return f0.apply(this, arguments); }; return 1; })()")
        await rt(A, "(() => { net49Send({type:'__teste_gol', time:P.time}); return 1; })()")
        rep = [await espera(pg, "V93P.replay && RP.ativo", 6000, 60) for pg in (A, Bp)]
        await asyncio.sleep(.8)
        await rt(A, "v93VotaPular(); 1")
        v1 = await espera(Bp, "V93P.replay && V93P.replay.votos === 1 ? v93RotuloPular() : ''", 3000, 60)
        await rt(Bp, "v93VotaPular(); 1")
        fins = [await espera(pg, "window.__rfim", 3000, 30) for pg in (A, Bp)]
        ativo = [await rt(pg, "RP.ativo") for pg in (A, Bp)]
        P.confere(all(rep) and v1 and '1/2' in v1 and all(fins) and abs(fins[0] - fins[1]) < 400 and not any(ativo),
                  '7) o REPLAY do gol passa para os dois; PULAR é um voto ("%s" no outro) e com os dois votos o servidor encerra para os dois juntos (%d ms de diferença)' % (v1, abs((fins[0] or 0) - (fins[1] or 0))), [rep, v1, fins, ativo])
        gA = await espera(A, "(() => { const j = V93P.painel && V93P.painel.j.find(x => x.id === NET49.id); return j && j.e && j.e.g; })()", 5000, 150)
        P.confere(gA == 1, '   o painel conta o gol de quem marcou (pelo servidor)', gA)
        # a queda no meio do replay: a votação não trava
        await espera(A, "!RP.ativo && (RQ.estado === 'saida' || RQ.estado === 'jogo')", 5000)
        await asyncio.sleep(1.0)
        await rt(A, "(() => { window.__rfim = 0; net49Send({type:'__teste_gol', time:P.time}); return 1; })()")
        await espera(A, "V93P.replay && RP.ativo", 6000, 60)
        await Bp.b.close(); Bp = None
        await asyncio.sleep(.6)
        await rt(A, "v93VotaPular(); 1")
        fim2 = await espera(A, "window.__rfim", 3000, 30)
        caiu = await espera(A, "(() => { const j = V93P.painel && V93P.painel.j.find(x => x.st === 'caiu'); return j ? j.nome : ''; })()", 5000, 150)
        P.confere(fim2 and caiu == 'Beto', '   o Beto cai no meio do replay: com o voto de quem ficou o replay acaba (não trava) e o painel mostra "caiu" (o bot segura o lugar)', [fim2, caiu])
        # 8) o fim: o craque do servidor
        await espera(A, "!RP.ativo && (RQ.estado === 'saida' || RQ.estado === 'jogo')", 5000)
        await asyncio.sleep(.8)
        await rt(A, "(() => { net49Send({type:'__teste_gol', time:P.time}); return 1; })()")
        cqA = await espera(A, "(() => { const e = document.getElementById('v93-craque'); return e && !e.hidden ? e.textContent : ''; })()", 15000, 200)
        cqC = await espera(Cp, "(() => { const e = document.getElementById('v93-craque-flut'); return e && !e.hidden ? e.textContent : ''; })()", 8000, 200)   # (quem assiste: o cartão em cima)
        await A.screenshot(path='tests/saida/v93_craque_online.png')
        P.confere(cqA and 'VOCÊ É O CRAQUE' in cqA and cqC and 'Ana' in cqC, '8) o fim (3 × 0): o CRAQUE calculado pelo servidor chega a todos (quem jogou: "%s"; quem assistiu: "%s")' % ((cqA or '')[:40], (cqC or '')[:40]), [cqA, cqC])
        erros = [e for pg in (A, Cp) for e in pg.erros if 'WebSocket' not in e]
        P.confere(not erros, '   nenhum erro de JavaScript (online)', erros[:3])
    finally:
        for pg in (A, Bp, Cp):
            if pg:
                try: await pg.b.close()
                except Exception: pass
        srv.terminate(); prx.terminate()


async def principal():
    P = Placar('v93 · Fase 2 · partidas, placar e craque da partida')
    async with async_playwright() as pw:
        print('\n· contra os bots (iPhone)')
        await bots(P, pw)
        if '--sem-online' not in sys.argv:
            print('\n· online (o servidor de verdade, sala 1v1 + quem assiste)')
            await online(P, pw)
    return P.fim()


if __name__ == '__main__':
    sys.exit(asyncio.run(principal()))
