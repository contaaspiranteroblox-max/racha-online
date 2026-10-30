"""RACHA · os AJUSTES FINOS (o que o painel de testes tinha, na versão oficial) e as LINHAS DA BOLA (tools/ajustes/*.js).
  1) os Ajustes continuam com as 7 abas; AJUSTES FINOS abre por cima da aba (Visual, e os atalhos em Controles e Câmera),
     com as partes FLUIDEZ, A BOLA, ONLINE, CONTROLES e CÂMERA; cada ajuste muda o cfg na hora, fica guardado no aparelho
     (volta depois de recarregar) e o VOLTAR TUDO PARA O PADRÃO volta o da versão oficial; trocar de aba e fechar a janela
     fecham os ajustes finos;
  2) no celular deitado: a página cabe na largura, rola no tamanho normal (sem encolher) e as abas continuam numa linha;
  3) A LINHA DO CHUTE na física clássica: o caminho previsto é o MESMO que a bola faz depois do chute de verdade (passo a
     passo, também com a batida na linha), termina no gol (dourada: o seu; vermelha: o contra) e o PASSE também;
  4) O CAMINHO DA BOLA andando: o mesmo da bola de verdade (com as batidas);
  5) as chaves: DESLIGADA, CHUTE, PASSE E CHUTE e o caminho desligado;
  6) o online: a linha pelo núcleo das salas é a mesma conta do núcleo (o chute e os passos), e a EXTRAPOLAÇÃO anda o desenho o
     que o mundo anda nesses ms;
  7) na Oficina (TESTAR): o 3, 2, 1, JÁ! (a física espera; dá para desligar na pausa), a linha do chute pelo motor do mapa é o
     caminho de verdade (até o gol), o cartão de quem fez o gol, o craque da partida e a bola EQUIPADA (a da loja).
Rodar:  python3 tests/ajustes_linhas_test.py
"""
import json, asyncio
from comum import Placar, abre, rt, roda, async_playwright

# o caminho previsto × o de verdade, ponto a ponto (um por passo). No passo do gol a conta das linhas para no subpasso do gol
# e a partida de verdade termina o passo (ou o contrário, na Oficina): esse último ponto fica de fora (gol = true).
COMPARA = """(pred, real, gol) => { const n = Math.min(pred.length, real.length) / 2 - (gol ? 1 : 0); let m = 0; for (let i = 0; i < n; i++) m = Math.max(m, Math.hypot(pred[2*i] - real[2*i], pred[2*i+1] - real[2*i+1])); return {n, m}; }"""

async def principal():
    P = Placar('os ajustes finos e as linhas da bola')
    async with async_playwright() as pw:
        # ---------------------------------------------------------------- 1) os ajustes finos
        print('\n1) os ajustes finos (dentro dos Ajustes de sempre)')
        b, pg, erros = await abre(pw, 1280, 720)
        r = await rt(pg, "({n: document.querySelectorAll('#pop-ajustes .ajx-abas > .ajx-aba').length, abas: AJX_ABAS.map(a => a[0]), ent: [...document.querySelectorAll('.ajf-entrada')].map(g => g.closest('.ajx-sec').id), cfg: AJF.cfg})")
        P.confere(r['n'] == 6 and 'ajf' not in r['abas'] and 'conta' not in r['abas'] and sorted(r['ent']) == ['ajx-camera', 'ajx-controles', 'ajx-visual'], 'os Ajustes continuam com as 6 abas (v96: a Conta saiu); a entrada dos ajustes finos fica em Visual, Controles e Câmera', r)
        P.confere(r['cfg'] == {'linhaChute': 'chute', 'linhaBola': True, 'linhaTam': 'media', 'extrapola': 0}, 'o padrão: a linha do CHUTE, o caminho da bola ligado, o comprimento médio e a extrapolação desligada', r['cfg'])
        await rt(pg, "ajxAbre('visual'); document.querySelector('#ajx-visual .ajf-abrir').click(); true"); await pg.wait_for_timeout(200)
        r = await rt(pg, "({aberto: AJF.aberto, sec: !AJF.sec.hidden, outras: Object.keys(AJX.secs).filter(k => !AJX.secs[k].hidden), partes: Object.keys(AJF.partes).filter(k => !AJF.partes[k].hidden), nav: [...AJF.segs.parte[0].querySelectorAll('button')].map(b => b.textContent)})")
        P.confere(r['aberto'] and r['sec'] and r['outras'] == [] and r['partes'] == ['bola'], 'ABRIR OS AJUSTES FINOS (Visual): a página abre por cima da aba, na parte A BOLA', r)
        P.confere(r['nav'] == ['FLUIDEZ', 'A BOLA', 'ONLINE', 'CONTROLES', 'CÂMERA'], 'as partes: FLUIDEZ, A BOLA, ONLINE, CONTROLES e CÂMERA', r['nav'])
        await rt(pg, "[...AJF.segs.parte[0].querySelectorAll('button')].find(b => b.dataset.v === 'fluidez').click(); AJF.segs.render[0].querySelector('[data-v=\"suave\"]').click(); AJF.chaves.med[0].click(); true")
        await rt(pg, "[...AJF.segs.parte[0].querySelectorAll('button')].find(b => b.dataset.v === 'bola').click(); AJF.segs.linha[0].querySelector('[data-v=\"ambos\"]').click(); AJF.segs.tam[0].querySelector('[data-v=\"longa\"]').click(); true")
        await rt(pg, "(() => { [...AJF.segs.parte[0].querySelectorAll('button')].find(b => b.dataset.v === 'online').click(); const i = AJF.faixas.ext[0].querySelector('input'); i.value = '120'; i.dispatchEvent(new Event('input', {bubbles: true})); AJF.segs.bola[0].querySelector('[data-v=\"misto\"]').click(); return true; })()")
        await rt(pg, "(() => { [...AJF.segs.parte[0].querySelectorAll('button')].find(b => b.dataset.v === 'controles').click(); const i = AJF.faixas.zl[0].querySelector('input'); i.value = '0.25'; i.dispatchEvent(new Event('input', {bubbles: true})); const a = AJF.faixas.area[0].querySelector('input'); a.value = '20'; a.dispatchEvent(new Event('input', {bubbles: true})); return true; })()")
        await rt(pg, "(() => { [...AJF.segs.parte[0].querySelectorAll('button')].find(b => b.dataset.v === 'camera').click(); const i = AJF.faixas.lead[0].querySelector('input'); i.value = '0.2'; i.dispatchEvent(new Event('input', {bubbles: true})); return true; })()")
        r = await rt(pg, "({v92: RachaAjustesFinos.v92(), cfg: AJF.cfg, guardado: JSON.parse(localStorage.getItem('racha-ajustes-finos-v1')), partes: Object.keys(AJF.partes).filter(k => !AJF.partes[k].hidden), seg: AJF.segs.render[0].querySelector('[aria-pressed=\"true\"]').dataset.v})")
        v = r['v92']
        P.confere(v['render'] == 'suave' and v['medidor'] and v['bolaPrev'] == 'misto' and abs(v['zonaLiga'] - .25) < 1e-9 and v['areaToque'] == 20 and abs(v['camLead'] - .2) < 1e-9 and r['seg'] == 'suave', 'cada ajuste muda o cfg do jogo na hora (o desenho, o medidor, a bola na tela, a zona morta, a área de toque, a câmera)', v)
        P.confere(r['cfg'] == {'linhaChute': 'ambos', 'linhaBola': True, 'linhaTam': 'longa', 'extrapola': 120} and r['partes'] == ['camera'], 'as linhas (PASSE E CHUTE, LONGA) e a extrapolação de 120 ms', r['cfg'])
        P.confere(r['guardado'] and r['guardado']['cfg']['extrapola'] == 120 and r['guardado']['v92']['render'] == 'suave', 'fica guardado no aparelho (racha-ajustes-finos-v1)', r['guardado'])
        await rt(pg, "[...document.querySelectorAll('#pop-ajustes .ajx-aba')].find(b => b.dataset.aba === 'audio').click(); true")
        r = await rt(pg, "({aberto: AJF.aberto, sec: AJF.sec.hidden, audio: !AJX.secs.audio.hidden})")
        P.confere(not r['aberto'] and r['sec'] and r['audio'], 'trocar de aba fecha os ajustes finos (a aba nova aparece)', r)
        await rt(pg, "ajfAbre('online'); ajxFecha(); true"); await pg.wait_for_timeout(100)
        r = await rt(pg, "({aberto: AJF.aberto, sec: AJF.sec.hidden})")
        P.confere(not r['aberto'] and r['sec'], 'fechar a janela fecha os ajustes finos', r)
        # recarregar: continua
        await pg.reload(); await pg.wait_for_function('() => typeof window.__RT === "function"', polling=100, timeout=20000); await pg.wait_for_timeout(500)
        r = await rt(pg, "({v92: RachaAjustesFinos.v92(), cfg: AJF.cfg})")
        P.confere(r['v92']['render'] == 'suave' and r['v92']['areaToque'] == 20 and r['cfg']['extrapola'] == 120 and r['cfg']['linhaChute'] == 'ambos', 'depois de recarregar a página os ajustes finos continuam', r)
        await rt(pg, "ajfAbre('bola'); document.querySelector('.ajf-padrao').click(); true")
        r = await rt(pg, "({v92: RachaAjustesFinos.v92(), cfg: AJF.cfg, padrao: (() => { const o = {}; for (const k of AJF_V92) o[k] = V92_PADRAO[k]; return o; })()})")
        P.confere(r['v92'] == r['padrao'] and r['cfg'] == {'linhaChute': 'chute', 'linhaBola': True, 'linhaTam': 'media', 'extrapola': 0}, 'VOLTAR TUDO PARA O PADRÃO: o da versão oficial', r['cfg'])
        await rt(pg, "ajxFecha(); true")
        P.confere(not [e for e in erros if 'Failed to load resource' not in e], 'sem erros no console (ajustes finos)', erros[:3])
        await b.close()

        # ---------------------------------------------------------------- 2) no celular deitado
        print('\n2) no celular deitado (844x390)')
        b, pg, erros = await abre(pw, 844, 390, toque=True)
        await rt(pg, "ajxAbre('visual'); true"); await pg.wait_for_timeout(500)
        await rt(pg, "document.querySelector('#ajx-visual .ajf-abrir').click(); true"); await pg.wait_for_timeout(600)
        r = await rt(pg, """(() => { const R = AJX.raiz, cab = R.querySelector('.ajx-abas').getBoundingClientRect(), ok = document.getElementById('aj-ok').getBoundingClientRect(), C = AJF.sec.parentElement;
          const fora = [...AJF.sec.querySelectorAll('button, input, .ajx-seg')].filter(e => e.getClientRects().length).some(e => { const q = e.getBoundingClientRect(); return q.right > innerWidth + 1 || q.left < -1; });
          return {compacto: R.classList.contains('v70-compacto'), linha: Math.abs((ok.top + ok.bottom)/2 - (cab.top + cab.bottom)/2) < 6, zoom: AJF.sec.style.zoom || '', rola: C.scrollHeight > C.clientHeight, fora, larg: document.scrollingElement.scrollWidth <= innerWidth + 1}; })()""")
        P.confere(r['compacto'] and r['linha'] and r['zoom'] == '' and not r['fora'] and r['larg'], 'os ajustes finos no celular deitado: as abas e o PRONTO numa linha, nada passa da largura e a página fica no tamanho normal (rola)', r)
        await pg.screenshot(path=str(__import__('pathlib').Path(__file__).resolve().parent / 'saida' / 'ajustes_finos_844x390.png'))
        await b.close()

        # ---------------------------------------------------------------- 3) a linha do chute (a física clássica)
        print('\n3) a linha do chute: o caminho previsto é o caminho de verdade')
        b, pg, erros = await abre(pw, 1280, 720)
        await rt(pg, "__T.comeca('futebol', 1); true")
        async def chute(desc, monta, forca='FORCA_POWER'):
            return await rt(pg, """(() => { __T.limpa(); %s
              const pred = RachaLinhas.classica.mira(%s, 240), real = [B.x, B.y];
              P.chutar = %s;
              for (let i = 0; i < 240; i++){ guardaAnterior(); physicsStep(STEP, 0, 0); real.push(B.x, B.y); if (RQ.estado === 'gol') break; }
              const c = (%s)(pred.pts, real, !!pred.gol);
              return {n: c.n, m: c.m, gol: pred.gol, bat: pred.bat.length, real: RQ.estado === 'gol' ? RQ.golTime : null, cor: lnCor(pred.gol, P.time | 0), nreal: real.length / 2, npred: pred.pts.length / 2}; })()""" % (monta, forca, forca, COMPARA))
        r = await chute('reto', "__T.poe(P, CX + U(8), CY); __T.cola(P, 1, 0);")
        P.confere(r['m'] < 0.01 and r['n'] > 20, 'CHUTE reto para o gol: o caminho previsto é o de verdade, passo a passo (diferença máxima %.4f px em %d passos)' % (r['m'], r['n']), r)
        P.confere(r['gol'] == 1 and r['real'] == 0 and r['cor'] == 'gol' and abs(r['npred'] - r['nreal']) <= 1, 'a linha termina no gol (o do adversário: dourada) — e o gol de verdade sai no mesmo passo', r)
        r = await chute('na linha', "__T.poe(P, CX - U(14), CY - U(8)); __T.cola(P, 1, -0.7);")   # (v95: o campo 30% maior — a linha de cima mais longe)
        P.confere(r['m'] < 0.01 and r['bat'] >= 1, 'CHUTE na diagonal: a batida na linha de cima e o resto do caminho iguais aos de verdade (%d batida(s), diferença %.4f px)' % (r['bat'], r['m']), r)
        r = await chute('contra', "__T.poe(P, LX0 + U(14), CY); __T.cola(P, -1, 0);")
        P.confere(r['gol'] == -1 and r['cor'] == 'contra' and r['m'] < 0.01, 'o chute para o próprio gol: a linha termina no gol e fica VERMELHA (gol contra)', r)
        r = await chute('passe', "__T.poe(P, CX - U(6), CY - U(6)); __T.cola(P, 1, 0.3);", 'FORCA_KICK')
        P.confere(r['m'] < 0.01 and r['n'] > 20, 'o PASSE: o mesmo caminho da bola de verdade (diferença %.4f px)' % r['m'], r)

        # ---------------------------------------------------------------- 4) o caminho da bola andando
        print('\n4) o caminho da bola andando')
        r = await rt(pg, """(() => { __T.limpa(); __T.bola(CX - U(4), CY - U(3), U(32), -U(26));
          const pred = RachaLinhas.classica.caminho(300), real = [B.x, B.y];
          for (let i = 0; i < 300; i++){ guardaAnterior(); physicsStep(STEP, 0, 0); real.push(B.x, B.y); if (RQ.estado === 'gol') break; }
          const c = (%s)(pred.pts, real, !!pred.gol); return {n: c.n, m: c.m, bat: pred.bat.length, gol: pred.gol, fim: [pred.fimX, pred.fimY], real: [B.x, B.y]}; })()""" % COMPARA)
        P.confere(r['m'] < 0.01 and r['bat'] >= 1 and r['n'] > 60, 'o caminho da bola andando (com %d batida(s)) é o mesmo da bola de verdade (diferença %.4f px em %d passos)' % (r['bat'], r['m'], r['n']), r)

        # ---------------------------------------------------------------- 5) as chaves
        print('\n5) as chaves das linhas')
        async def estado(cfg):
            return await rt(pg, """(() => { ajfMuda('linhaChute', %s); ajfMuda('linhaBola', %s); __T.limpa(); __T.poe(P, CX, CY); __T.cola(P, 1, 0); LN.mira = null; LN.miraK = ''; LN.miraN = -99;
              lnAtualiza(); const a = {mira: !!LN.mira, fraco: !!(LN.mira && LN.mira.fraco)};
              __T.poe(P, LX0 + 70, LY0 + 70); __T.bola(CX, CY, U(20), U(5)); LN.cam = null; lnAtualiza(); a.cam = !!LN.cam; return a; })()""" % (json.dumps(cfg[0]), json.dumps(cfg[1])))
        r1 = await estado(['chute', True]); r2 = await estado(['ambos', True]); r3 = await estado(['nao', False])
        P.confere(r1 == {'mira': True, 'fraco': False, 'cam': True} and r2['fraco'] and r3 == {'mira': False, 'fraco': False, 'cam': False}, 'CHUTE: só a forte · PASSE E CHUTE: as duas · DESLIGADA (e o caminho desligado): nada', (r1, r2, r3))
        await rt(pg, "ajfPadrao(); true")
        # no quadro do jogo de verdade (o laço da tela, sem chamar nada à mão): a linha aparece com a bola no pé
        await rt(pg, "(() => { __T.limpa(); __T.poe(P, CX - U(6), CY); __T.cola(P, 1, 0); LN.mira = null; LN.miraK = ''; LN.miraN = -99; const c0 = LN.contas; window.__lnC0 = c0; return true; })()")
        await pg.wait_for_timeout(400)
        r = await rt(pg, "({mira: RachaLinhas.estado().mira, contas: LN.contas - window.__lnC0, so: RachaLinhas.soOficina()})")
        P.confere(not r['mira'] and r['contas'] == 0 and r['so'], '(v95) no treino (o laço da tela, com a bola no pé) as linhas não aparecem: elas são só da Oficina com o RANK OFF', r)

        # ---------------------------------------------------------------- 6) o online: o núcleo das salas e a extrapolação
        print('\n6) o online: a linha pelo núcleo das salas e a extrapolação')
        r = await rt(pg, """(() => { const C = V92_NUC.resolve(V92_NUC.PERFIL_V92), G = V92_NUC.novoCampo(2), B0 = V92_NUC.novaBola(C, G.CX + U(6), G.CY);
          const eu = {i:0, x:B0.x - C.R_JOG - C.R_BOLA - 1, y:G.CY, vx:0, vy:0, r:C.R_JOG, m:C.MASSA_JOG, mx:0, my:0, time:0};
          const M = {G, B:B0, jog:[eu], estado:'jogo', saidaTime:0, jogo:'futebol', trave:0, tick:0};
          const antes = {M:V92N.M, C:V92N.C, slot:V92N.slot, inp:V92.ultInp};
          V92N.M = M; V92N.C = C; V92N.slot = 0; V92.ultInp = {mx:0, my:0};
          try {
            const pred = lnMiraNucleo(C.FORCA_POWER, 240);
            const M2 = {G, B:Object.assign({}, B0), jog:[Object.assign({}, eu)], estado:'jogo', saidaTime:0, jogo:'futebol', trave:0, tick:0};
            V92_NUC.chute(M2, C, M2.jog[0], C.FORCA_POWER);
            const real = [M2.B.x, M2.B.y]; let gol = 0;
            for (let i = 0; i < 240 && !gol; i++){ V92_NUC.passo(M2, C, {gol: l => { gol = l; return 'para'; }}); real.push(M2.B.x, M2.B.y); }
            const c = (%s)(pred.pts, real, false);          // (no núcleo as duas contas param no subpasso do gol)
            // a extrapolação: 100 ms = 6 passos do mundo (a bola andando, você parado)
            Object.assign(M.B, {x:G.CX - U(10), y:G.CY + U(3), vx:U(25), vy:-U(10)}); eu.x = G.CX - U(20); eu.y = G.CY + U(8);
            V92.cfg.bolaPrev = 'eu'; P.x = eu.x; P.y = eu.y; B.x = M.B.x; B.y = M.B.y;
            const M3 = {G, B:Object.assign({}, M.B), jog:[Object.assign({}, eu)], estado:'jogo', saidaTime:0, jogo:'futebol', trave:0, tick:0};
            for (let i = 0; i < 6; i++) V92_NUC.passo(M3, C, null);
            lnExtrapola(100);
            const ex = {dx:B.x - M.B.x, dy:B.y - M.B.y, esperado:[M3.B.x - M.B.x, M3.B.y - M.B.y], anda:B.x - M.B.x > U(1.5)};
            V92.cfg.bolaPrev = V92_PADRAO.bolaPrev;
            return {n:c.n, m:c.m, gol:pred.gol, golReal:gol, ex};
          } finally { V92N.M = antes.M; V92N.C = antes.C; V92N.slot = antes.slot; V92.ultInp = antes.inp; } })()""" % COMPARA)
        P.confere(r['m'] < 1e-6 and r['n'] > 20 and r['gol'] == r['golReal'], 'online: a linha do chute pelo núcleo das salas é a mesma conta do servidor (o chute e os passos; diferença %.2g px)' % r['m'], r)
        e = r['ex']
        P.confere(abs(e['dx'] - e['esperado'][0]) < 1e-6 and abs(e['dy'] - e['esperado'][1]) < 1e-6 and e['anda'],'a EXTRAPOLAÇÃO (100 ms): a bola na tela anda o que o mundo anda em 6 passos (%.1f px)' % e['dx'], e)
        P.confere(not [x for x in erros if 'Failed to load resource' not in x], 'sem erros no console (as linhas)', erros[:3])
        await b.close()

        # ---------------------------------------------------------------- 7) na Oficina (TESTAR)
        print('\n7) na Oficina: a contagem, a linha pelo motor do mapa, o cartão do gol, o craque e a bola equipada')
        b, pg, erros = await abre(pw, 1280, 720)
        await pg.wait_for_function('() => window.OFI && OFI.pronta', timeout=20000)
        await pg.evaluate("() => { try { localStorage.removeItem('racha-ofi-contagem'); } catch (_) {} OFI.interno.OFJ.semContagem = false; const I = OFI.interno, md = I.MODELOS[0]; I.OFJ.local(I.limpaModelo(md.faz(), md.nome), { volta: 'hub' }); return true; }")
        await pg.wait_for_timeout(1000)
        r1 = await pg.evaluate("() => ({contando: OFI.interno.OFJ.contando, tick: OFI.interno.OFJ.P.tick})")
        await pg.wait_for_timeout(2900)
        r2 = await pg.evaluate("() => ({contando: OFI.interno.OFJ.contando, tick: OFI.interno.OFJ.P.tick})")
        P.confere(r1['contando'] and r1['tick'] == 0 and not r2['contando'] and r2['tick'] > 0, 'TESTAR: o 3, 2, 1, JÁ! antes de começar (a física espera e anda depois do JÁ!)', (r1, r2))
        await pg.evaluate("() => { const J = OFI.interno.OFJ; J.abrePausa(); [...J.menu.querySelectorAll('button')].find(b => /CONTAGEM/.test(b.textContent)).click(); J.reinicia(); return true; }")
        await pg.wait_for_timeout(500)
        r = await pg.evaluate("() => ({sem: OFI.interno.OFJ.semContagem, contando: OFI.interno.OFJ.contando, tick: OFI.interno.OFJ.P.tick, ls: localStorage.getItem('racha-ofi-contagem')})")
        P.confere(r['sem'] and not r['contando'] and r['tick'] > 0 and r['ls'] == '0', 'a pausa do TESTAR desliga a contagem (fica guardado): o REINICIAR começa na hora', r)
        # a linha do chute pelo motor do mapa = o caminho de verdade (o quadro da Oficina parado: os passos são do teste)
        r = await pg.evaluate("""() => { const J = OFI.interno.OFJ, P = J.P, q = P.jog[J.eu], C = P.C;
          J.menu = { remove() {} };                                       // (o laço da Oficina não dá passos: o teste dá)
          for (const o of P.jog) if (o !== q) { o.fora = true; o.bot = null; o.ai = null; }
          P.estado = 'jogo'; q.x = (P.G.GL + P.G.GR) / 2 - 300; q.y = (P.G.GT + P.G.GB) / 2; q.vx = q.vy = 0;
          P.B.x = q.x + q.r + C.R_BOLA + 2; P.B.y = q.y + 6; P.B.vx = P.B.vy = 0; P.B.w = 0;
          J.ultInp = {mx: 0, my: 0};
          const pred = OFI.interno.ofjSimRoda(P, q, C.FORCA_POWER, 300);
          q.chuteT = -99; P.chuta(q, C.FORCA_POWER);
          const real = [P.B.x, P.B.y]; let golT = -1;
          for (let i = 0; i < 300; i++) { P.passo(o => { o.mx = o.my = 0; }); real.push(P.B.x, P.B.y); if (P.estado === 'gol') { golT = i; break; } }
          const n = Math.min(pred.pts.length, real.length) / 2 - (pred.gol ? 1 : 0); let m = 0; for (let i = 1; i < n; i++) m = Math.max(m, Math.hypot(pred.pts[2*i] - real[2*i], pred.pts[2*i+1] - real[2*i+1]));
          J.menu = null;
          return {n, m, gol: pred.gol, golC: pred.golC, golReal: golT >= 0, npred: pred.pts.length / 2, nreal: real.length / 2, card: J.golCard ? {nome: J.golCard.autor && J.golCard.autor.nome, eu: !!(J.golCard.autor && J.golCard.autor.eu)} : null, placar: P.placar.slice()}; }""")
        P.confere(r['m'] < 0.01 and r['n'] > 20, 'Oficina: a linha do chute pelo motor do mapa é o caminho de verdade (diferença %.4f px em %d passos)' % (r['m'], r['n']), r)
        P.confere(r['gol'] == 1 and r['golC'] == 'gol' and r['golReal'] and abs(r['npred'] - r['nreal']) <= 1, 'e termina no gol (dourada), no mesmo passo do gol de verdade', r)
        P.confere(r['card'] and r['card']['eu'], 'o CARTÃO DE QUEM FEZ O GOL aparece (você, com a tampinha e o nome)', r['card'])
        # (v95) o RANK OFF do TESTAR: sem ele, nada de linha; com ele, os pontinhos (e a chave fica na pausa, guardada)
        r = await pg.evaluate("""() => { const J = OFI.interno.OFJ, P = J.P, q = P.jog[J.eu], C = P.C, g = document.createElement('canvas').getContext('2d');
          J.rankOffTeste = false; J.linhas = null; J.fimRes = null; J.menu = null;
          P.estado = 'jogo'; q.fora = false; q.x = (P.G.GL + P.G.GR) / 2 - 300; q.y = (P.G.GT + P.G.GB) / 2; q.vx = q.vy = 0;
          P.B.x = q.x + q.r + C.R_BOLA + 2; P.B.y = q.y + 6; P.B.vx = P.B.vy = 0; P.B.w = 0; J.ultInp = {mx: 0, my: 0};
          OFI.interno.ofjLinhas(g, P); const sem = !!J.linhas;
          J.rankOffTeste = true; OFI.interno.ofjLinhas(g, P); const L = J.linhas;
          const r = {sem, com: !!(L && L.mira), pontos: L ? L.pontos : 0};
          J.rankOffTeste = false; J.linhas = null;
          J.abrePausa(); const bt = [...J.menu.querySelectorAll('button')].find(b => /RANK OFF/.test(b.textContent)); r.botao = bt ? bt.textContent : null;
          if (bt) bt.click(); r.depois = J.rankOffTeste; r.ls = localStorage.getItem('racha-ofi-rankoff');
          J.rankOffTeste = false; try { localStorage.setItem('racha-ofi-rankoff', '0'); } catch (_) {} J.fechaMenu();
          return r; }""")
        P.confere(not r['sem'] and r['com'] and r['pontos'] >= 5, '(v95) no TESTAR as linhas só aparecem com o RANK OFF ligado — em pontinhos (%d na tela)' % (r['pontos'] or 0), r)
        P.confere(r['botao'] and 'DESLIGADO' in r['botao'] and r['depois'] is True and r['ls'] == '1', '(v95) a pausa do TESTAR tem a chave RANK OFF (LINHAS DA BOLA), e ela fica guardada', r)
        r = await pg.evaluate("""() => { const I = OFI.interno, el = I.ofjCraque({jog: [{i: 0, nome: 'Ana', time: 0, gols: 2, assist: 1}, {i: 1, nome: 'Bot', time: 1, gols: 0, assist: 0, bot: true}]}, 0);
          return el ? el.textContent : null; }""")
        P.confere(r and 'CRAQUE DA PARTIDA' in r and '2' in r, 'o CRAQUE DA PARTIDA na tela do fim (a conta da v93 com os gols e as assistências)', r)
        # a bola equipada (Aparência › Estilo da bola › Equipada): a da loja; sem bola equipada, a branca
        r = await rt(pg, """(() => { const D = OFI.interno.DES, c = document.createElement('canvas'); c.width = c.height = 80; const g = c.getContext('2d');
          const cor = () => { const d = g.getImageData(40, 40, 1, 1).data; return [d[0], d[1], d[2]]; };
          const M = {aparencia: {bola: 'jogador'}};
          const antes = v88BolaPadrao; let sem, com;
          try { v88BolaPadrao = () => null; g.clearRect(0, 0, 80, 80); D.bola(g, 40, 40, 30, M); sem = cor();
                v88BolaPadrao = () => v88Item('bola_lisa_roxa'); g.clearRect(0, 0, 80, 80); D.bola(g, 40, 40, 30, M); com = cor(); }
          finally { v88BolaPadrao = antes; }
          return {sem, com, op: RachaMapa.BOLAS}; })()""")
        P.confere(r['sem'][0] > 240 and r['sem'][1] > 240 and r['sem'][2] > 240 and r['com'][2] > r['com'][1] + 40 and 'jogador' in r['op'], 'a bola EQUIPADA na Oficina: com a Bola Roxa equipada a bola fica roxa; sem bola equipada, a branca', r)
        P.confere(not [x for x in erros if 'Failed to load resource' not in x], 'sem erros no console (a Oficina)', erros[:3])
        await b.close()
    return P.fim()

roda(principal())
