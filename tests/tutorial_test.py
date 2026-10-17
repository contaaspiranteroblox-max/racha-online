"""Etapa 4 · primeiros toques (o tutorial), o Domínio explicado, o COMO JOGA dos modos e os indicadores dos controles especiais.

  · o tutorial roda os 5 passos com a entrada de verdade (teclado): andar, ficar atrás da bola, CHUTE (gol), PASSE (chega no
    companheiro aceso) e o botão ARMADO (segurou longe da bola; a batida sai ao encostar); erros repetem o passo
  · PULAR marca como visto e volta para o treino de antes; o fim dá o prêmio só na primeira vez
  · a primeira vez (nome → tampinha → BORA TREINAR) abre o tutorial no lugar do aquecimento
  · o treino de Domínio diz que o PASSE domina enquanto a bola vem
  · a primeira partida do COM CURVA mostra o COMO JOGA e a apresentação espera; os bots aparecem como BOT
  · CURVA mostra a carga em %; (modo guardado na v70.2, ligado só no teste) FINTA/DRIBLE a espera em segundos e GINGA a
    janela do gol de ginga (vale 2)

Rodar:  python3 tests/tutorial_test.py
"""
from comum import abre, rt, roda, Placar, async_playwright, RAIZ

SAIDA = RAIZ / 'tests' / 'saida'; SAIDA.mkdir(exist_ok=True)


async def espera(pg, cond, ms=8000):
    """Espera uma condição (JS do jogo) virar verdade, com o jogo rodando de verdade."""
    for _ in range(ms // 50):
        if await rt(pg, cond): return True
        await pg.wait_for_timeout(50)
    return False


async def principal():
    P = Placar('Etapa 4 · tutorial, Domínio, modos e indicadores')
    async with async_playwright() as pw:
        b, pg, erros = await abre(pw, 1280, 720, toque=False)
        print('\n· primeiros toques')
        await rt(pg, "CONTA.vistos = CONTA.vistos.filter(x => x !== 'tut'); TR.id = 'cruz'; trSalvaId(); tutComeca(); TR.ft = TR_INTRO - 2; true")
        ok = await espera(pg, "TR.id === 'tut' && TR.fase === 'jogo' && TR.rod === 1")
        r = await rt(pg, "({painel:!TU.el.hidden, tx:TU.el.textContent, zona:TR.zonas.length, lobby:lobby.aberto})")
        P.confere(ok and r['painel'] and 'PASSO 1 DE 5' in r['tx'] and r['zona'] == 1 and not r['lobby'], 'abre no passo 1 (ANDAR) com o painel e o círculo', r['tx'][:60])
        await pg.screenshot(path=str(SAIDA / 'e4_tut_1_1280x720.png'))
        # passo 1: anda de verdade (tecla segurada) e depois chega no círculo
        x0 = await rt(pg, "P.x")
        await pg.keyboard.down('KeyD'); await pg.wait_for_timeout(500); await pg.keyboard.up('KeyD')
        x1 = await rt(pg, "P.x")
        P.confere(x1 > x0 + 30, 'a tecla de andar move a tampinha (%.0f → %.0f)' % (x0, x1))
        await rt(pg, "const z = TR.zonas[0]; TR.motor.poeJog(z.x, z.y); true")
        ok = await espera(pg, "TR.rod === 2 && TR.fase === 'jogo'")
        P.confere(ok, 'chegou no círculo: passa para o passo 2 (FIQUE ATRÁS DA BOLA)')
        # passo 2: chutar antes da hora não vale (a bola volta); no círculo de trás, passa
        await rt(pg, "const b = TR.r.bola; TR.motor.poeJog(b.x - TR.G.rp*3, b.y); true")
        await pg.wait_for_timeout(200)
        await rt(pg, "const z = TR.zonas[0]; TR.motor.poeJog(z.x, z.y); true")
        ok = await espera(pg, "TR.rod === 3 && TR.fase === 'jogo'")
        P.confere(ok, 'atrás da bola: passa para o passo 3 (CHUTE)')
        await pg.screenshot(path=str(SAIDA / 'e4_tut_3_1280x720.png'))
        # passo 3: o PASSE não conta como chute; o CHUTE de frente faz o gol
        await rt(pg, "const b = TR.bola, G = TR.G; TR.motor.poeJog(b.x - (G.rp + G.rb + 1), b.y); true")
        await pg.keyboard.press('KeyK')
        ok = await espera(pg, "TR.rod === 4 && TR.fase === 'jogo'", 9000)
        P.confere(ok, 'CHUTE (tecla K) de trás da bola: gol, passa para o passo 4 (PASSE)')
        # passo 4: o passe que erra repete; o passe na linha do companheiro passa
        r = await rt(pg, """(() => { const n = TR.tuComp, b = TR.bola, G = TR.G, dx = n.x - b.x, dy = n.y - b.y, d = Math.hypot(dx, dy);
          TR.motor.poeJog(b.x - dx/d*(G.rp + G.rb + 1), b.y - dy/d*(G.rp + G.rb + 1)); return {aceso:!!n.aceso}; })()""")
        await pg.keyboard.press('Space')
        ok = await espera(pg, "TR.rod === 5 && TR.fase === 'jogo'", 9000)
        P.confere(r['aceso'] and ok, 'PASSE (Espaço) mirando no companheiro aceso: chega nele e passa para o passo 5 (ARMADO)', r)
        # passo 5: segura o CHUTE longe da bola (ARMADO) e encosta: a batida sai sozinha
        await pg.keyboard.down('KeyK'); await pg.wait_for_timeout(450)
        r = await rt(pg, "({armado:!!ARMADO.desde, aviso:TR.aviso.txt})")
        await rt(pg, "const b = TR.bola, G = TR.G; TR.motor.poeJog(b.x - (G.rp + G.rb + 1), b.y); true")
        ok = await espera(pg, "TR.fase === 'fim' || TR.rod > 5 || !!TR.fim", 6000)
        await pg.keyboard.up('KeyK')
        P.confere(r['armado'] and ok, 'segurou o CHUTE longe (ARMADO) e encostou: a batida saiu sozinha e o tutorial acaba', r)
        ok = await espera(pg, "!TRF.raiz.hidden", 4000)
        r = await rt(pg, "({titulo:TRF.titulo.textContent, pts:TRF.pts.textContent, prox:TRF.prox.textContent, premio:TRF.premio.textContent, visto:CONTA.vistos.indexOf('tut') >= 0, painel:TU.el.hidden})")
        P.confere(ok and r['pts'] == '5/5' and 'PARTIDA' in r['prox'] and '+100' in r['premio'] and r['visto'] and r['painel'], 'o fim: 5/5, prêmio de primeira vez (+100), JOGAR UMA PARTIDA', r)
        await pg.screenshot(path=str(SAIDA / 'e4_tut_fim_1280x720.png'))
        await pg.click('#trf-prox'); await pg.wait_for_timeout(300)
        bu = await rt(pg, "({lobby:lobby.aberto, busca:!!RachaRanqueada79.busca()})")
        await espera(pg, "RQ.on && !lobby.aberto", 4000)
        r = await rt(pg, "({rq:RQ.on, modo:X49.matchMode, mapa:RQ.mapa, tr:TR.id})")
        P.confere(bu['lobby'] and bu['busca'] and r['rq'] and r['modo'] == 'ranked' and r['mapa'] == 4 and r['tr'] == 'cruz',
                  'JOGAR UMA PARTIDA (v79): a busca da ranqueada e, sem servidor, a ranqueada contra bots no Estádio (e o treino escolhido antes volta a ser o Cruzamento)', [bu, r])
        await rt(pg, "abrirLobby(); true"); await pg.wait_for_timeout(200)
        # de novo: sem prêmio; PULAR volta ao treino de antes
        await rt(pg, "tutComeca(); TR.ft = TR_INTRO - 2; true")
        await espera(pg, "TR.id === 'tut' && TR.fase === 'jogo'")
        await pg.click('.tu-pular'); await pg.wait_for_timeout(300)
        r = await rt(pg, "({lobby:lobby.aberto, tr:TR.id, painel:TU.el.hidden})")
        P.confere(r['lobby'] and r['tr'] == 'cruz' and r['painel'], 'PULAR: volta para o lobby e o treino escolhido continua o de antes', r)
        r = await rt(pg, "(() => { abreTela('treino'); const c = document.querySelector('.tu-card'); return {tem:!!c, tx:c ? c.textContent : '', primeiro:LB.trGrade.firstElementChild === c}; })()")
        P.confere(r['tem'] and r['primeiro'] and 'feito' in r['tx'], 'TREINAMENTO tem o cartão Primeiros toques (o primeiro da lista, com "feito")', r['tx'][:80])
        r = await rt(pg, "Array.from(LB.trGrade.querySelectorAll('.tr-card')).find(c => c.dataset.tr === 'dom').textContent")
        P.confere('PASSE DOMINA' in r, 'o cartão do Domínio explica que o PASSE domina enquanto a bola vem', r[:120])
        await rt(pg, "fechaTela(); true")
        rede = [e for e in erros if 'Failed to load resource' in e]
        P.confere(not [e for e in erros if e not in rede], 'nenhum erro de JavaScript (tutorial)', [e for e in erros if e not in rede][:3])
        await b.close()

        print('\n· a primeira vez')
        b, pg, erros = await abre(pw, 1280, 720, sem_onb=False)
        r = await rt(pg, "({onb:!ONB.el.hidden})")
        await pg.fill('#onb-nome', 'Duda'); await pg.click('#onb-prox'); await pg.wait_for_timeout(250)
        tx = await pg.evaluate("document.querySelector('#onb-2 p.pop-txt').textContent + ' | ' + document.getElementById('onb-bora').textContent")
        await pg.click('#onb-bora'); await pg.wait_for_timeout(500)
        r2 = await rt(pg, "({tr:TR.id, lobby:lobby.aberto, onb:CONTA.onb, nome:perfil.nome})")
        P.confere(r['onb'] and 'primeiros toques' in tx and 'BORA TREINAR' in tx and r2['tr'] == 'tut' and not r2['lobby'] and r2['onb'] and r2['nome'] == 'Duda', 'primeira vez: nome, tampinha e BORA TREINAR abre o tutorial', [tx, r2])
        await rt(pg, "TR.ft = TR_INTRO - 2; true"); await espera(pg, "TR.fase === 'jogo'")
        await pg.click('.tu-pular'); await pg.wait_for_timeout(400)
        r = await rt(pg, "({lobby:lobby.aberto, pop:!LB.pop.hidden, tx:LB.popCaixa.textContent})")
        P.confere(r['lobby'] and r['pop'] and 'AGORA É JOGAR' in r['tx'], 'pulou na primeira vez: lobby com o convite AGORA É JOGAR', r['tx'][:60])
        await b.close()

        print('\n· os modos: COMO JOGA e a apresentação')
        b, pg, erros = await abre(pw, 1280, 720)
        await rt(pg, "CONTA.vistos = []; X49.mode = 'casual'; X49.jogo = 'curva'; x49Start(2, 4); true")   # v70.2: o COM CURVA, no Estádio
        await pg.wait_for_timeout(400)
        r = await rt(pg, "({intro:!TUI.el.hidden, tit:TUI.el.querySelector('h2').textContent, tx:TUI.el.textContent, tick:RQ.tick})")
        await pg.wait_for_timeout(1500)
        r2 = await rt(pg, "({tick:RQ.tick, parado:ARB_PARADO()})")
        P.confere(r['intro'] and r['tit'] == 'COM CURVA' and 'Segure CURVA' in r['tx'] and r2['tick'] == r['tick'] and r2['parado'], 'primeira partida COM CURVA: o COMO JOGA aparece e a partida espera (a física não anda)', [r['tit'], r['tick'], r2])
        await pg.screenshot(path=str(SAIDA / 'e4_comojoga_1280x720.png'))
        await pg.click('.tu-intro-ok'); await pg.wait_for_timeout(500)
        r2 = await rt(pg, "({tick:RQ.tick})")
        P.confere(r2['tick'] > r['tick'], 'BORA! fecha o cartão e a partida segue', r2)
        r = await rt(pg, "Array.from(document.querySelectorAll('#vs-a li small')).map(s => s.textContent)")
        P.confere(r and all(s.startswith('BOT · ') and 'FÁCIL' not in s and 'DIFÍCIL' not in s for s in r), 'na apresentação dos times os bots aparecem como BOT (v79: sem o nível escrito)', r)
        await rt(pg, "rqSai(); abrirLobby(); X49.jogo = 'curva'; x49Start(2, 0); true"); await pg.wait_for_timeout(300)
        r = await rt(pg, "({intro:!TUI.el.hidden})")
        P.confere(not r['intro'], 'na segunda partida do modo o cartão não aparece de novo')
        # v79: o JOGAR é só a ranqueada (sempre futebol): o COMO JOGA do modo ficou para a primeira partida de cada modo (nas salas)
        await rt(pg, "rqSai(); abrirLobby(); abreJogar('casual'); tuIntroAbre('curva'); true"); await pg.wait_for_timeout(300)
        r = await rt(pg, "({intro:!TUI.el.hidden, tit:TUI.el.querySelector('h2').textContent, tx:TUI.el.textContent, botao:!document.querySelector('.tu-como-joga') || document.querySelector('.tu-como-joga').hidden})")
        P.confere(r['intro'] and r['tit'] == 'COM CURVA' and 'Primeiro a 3' in r['tx'] and r['botao'], 'o cartão COMO JOGA do COM CURVA abre por cima do JOGAR (v79: o JOGAR da ranqueada não tem o botão COMO JOGA)', r['tit'])
        await pg.keyboard.press('Escape'); await pg.wait_for_timeout(150)
        await rt(pg, "RQP.jogo = 'ginga'; renderRanqueada(); tuIntroAbre(RQP.jogo); true"); await pg.wait_for_timeout(300)
        r = await rt(pg, "({tit:TUI.el.querySelector('h2').textContent, jogo:RQP.jogo})")
        P.confere(r['tit'] == 'FUTEBOL' and r['jogo'] == 'futebol', 'um modo que saiu (ginga) não chega ao JOGAR: vira FUTEBOL', r)
        await pg.keyboard.press('Escape'); await pg.wait_for_timeout(150)
        r = await rt(pg, "({intro:!TUI.el.hidden})")
        P.confere(not r['intro'], 'Escape fecha o cartão')
        await rt(pg, "fechaRanqueada(); true")

        print('\n· os indicadores dos controles especiais')
        r = await rt(pg, """(() => { const T = window.__T;
          T.comeca('curva', 1, 0); CV.segura = true; CV.carga = .4;
          const frases = []; const o = txt; txt = function(g, s){ frases.push(String(s)); return o.apply(this, arguments); };
          try { v61Btn('curva'); CV.carga = 1; v61Btn('curva'); } finally { txt = o; }
          CV.segura = false; CV.carga = 0;
          return frases;
        })()""")
        P.confere('CARGA 40%' in r and any('CHEIA' in s for s in r), 'CURVA: a carga aparece em porcentagem e CHEIA · SOLTE!', r)
        r = await rt(pg, """(() => { const T = window.__T; T.guardados();   // (v70.2: a ginga saiu do jogo; o código ficou guardado e o teste liga ela só aqui)
          rqSai(); T.comeca('ginga', 2, 0); P.gnCdD = RQ.tick + Math.round(.6*TICKS_POR_S);
          const frases = []; const o = txt; txt = function(g, s){ frases.push(String(s)); return o.apply(this, arguments); };
          try { v61Btn('drible'); GN.mov[0] = {tick:RQ.tick - 60, q:P}; rqPlacar(ctx); } finally { txt = o; }
          rqSai(); T.enxuto();
          return frases;
        })()""")
        P.confere('0,6' in r, '(guardado) DRIBLE: a espera aparece em segundos no botão', [s for s in r if ',' in s][:4])
        P.confere(any(s.startswith('GOL DE GINGA VALE 2') for s in r), '(guardado) GINGA: embaixo do placar, a janela do gol de ginga com o tempo que falta', [s for s in r if 'GINGA' in s])
        rede = [e for e in erros if 'Failed to load resource' in e]
        P.confere(not [e for e in erros if e not in rede], 'nenhum erro de JavaScript (modos e indicadores)', [e for e in erros if e not in rede][:3])
        await b.close()
    return P.fim()


if __name__ == '__main__':
    roda(principal())
