"""RACHA v105 · O TAMANHO DA BORDA DA TAMPINHA (SEM · FINA · NORMAL · GROSSA) — passa/falha, no navegador:
  1) o código: o tamanho vai e volta (as quatro, em tampinhas variadas: a BOTÃO, as de dentes, o texto, as posições, a cara
     animada); a NORMAL não muda o código (200 tampinhas sorteadas: o código é o mesmo do codificador de antes); o leitor de
     antes lê o código novo como a mesma tampinha com a borda normal; o escudo do clube não leva tamanho; o código mais
     comprido continua cabendo (até 44 letras: a regra do jogo, do servidor e da plataforma);
  2) o desenho, medido nos pixels: na BOTÃO o aro (v110: de metal) fica mais fino ou mais grosso e o desenho do meio cresce ou diminui;
     na de dentes o meio vai a 80% (fina) ou 66% (grossa) do raio; SEM BORDA só o desenho, cheio até a beirada (sem os dentes,
     o aro, o contorno e o fundo da cara animada — também na imagem pronta da cara que mexe); o emoji cobre o meio de cada um;
  3) o editor: na aba BORDA o TAMANHO DA BORDA com SEM · FINA · NORMAL · GROSSA (a NORMAL acesa), tocar troca a tampinha
     grande e o nome falado, SEM BORDA avisa embaixo e a faixa mostra cada borda no tamanho normal, o DESFAZER volta, trocar de
     aba não perde, o escudo do clube não tem; EQUIPAR e abrir o jogo de novo: continua sem borda;
  4) o servidor das salas e a plataforma: o código com o tamanho passa na regra (TAMPA_RE), as peças lidas do começo são as
     mesmas e a tampinha não é tirada (a conferência da peça dos fundadores);
  5) nenhum erro de JavaScript. Capturas em tests/saida/v105_borda_*.png.
  python3 tests/v105_borda_test.py"""
import asyncio, json, os, subprocess, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from comum import Placar, abre, rt, async_playwright, HARNESS, RAIZ

SAIDA = RAIZ / 'tests' / 'saida'; SAIDA.mkdir(exist_ok=True)

# a cor de pontos do desenho (k = a fração do raio, ang = o ângulo): [r, g, b, a]
PIXELS = r"""((D, r, pontos) => { const c = document.createElement('canvas'); c.width = c.height = Math.ceil(2*r + 40); const g = c.getContext('2d'), m = c.width/2;
  tpDesenha(g, m, m, r, D, 7);
  return pontos.map(([k, ang]) => Array.from(g.getImageData(Math.round(m + Math.cos(ang)*k*r), Math.round(m + Math.sin(ang)*k*r), 1, 1).data)); })"""
# uma tampinha com o desenho vermelho liso (sem ícone) e a borda b
VERMELHA = "((b, k, i) => { const D = tpLe(TP_PADRAO_COD); D.b = b; D.bc = ['#ffffff', '#1d1d1d']; D.p = 'li'; D.pc = ['#e01010', '#ffffff', '#000000']; D.i = i || '--'; D.ip = [50, 50, 50, 0]; D.bt = k; return D; })"


def eh(p, tipo):
    r, g, b, a = p
    if tipo == 'vermelho': return a > 200 and r > 120 and r > 2*g and r > 2*b
    if tipo == 'branco': return a > 200 and min(r, g, b) > 200
    if tipo == 'escuro': return a > 200 and .2126*r + .7152*g + .0722*b < 70
    if tipo == 'vazio': return a < 12
    if tipo == 'nao_vermelho': return not (a > 200 and r > 120 and r > 2*g and r > 2*b)
    # v110: o aro da BOTÃO é de metal (claro e sem cor, mais escuro na beira de fora) e o desenho tem a sombra por dentro
    # (rente ao aro o vermelho fica escuro, mas continua vermelho)
    if tipo == 'metal': return a > 200 and max(r, g, b) - min(r, g, b) < 16 and 110 < .2126*r + .7152*g + .0722*b < 245
    if tipo == 'vermelho_sombra': return a > 200 and r > 60 and r > 2.5*g and r > 2.5*b
    return False


async def reabre(pg):
    await pg.reload()
    await pg.wait_for_function('() => typeof window.__RT === "function"', polling=100, timeout=20000)
    await pg.wait_for_timeout(700)
    await pg.evaluate("(() => { const b = [...document.querySelectorAll('#v84auth button')].find(x => /TREINAR OFFLINE/.test(x.textContent || '')); if (b) b.click(); const o = document.getElementById('onb'); if (o) o.hidden = true; })()")
    await rt(pg, HARNESS)


async def principal():
    P = Placar('v105 · o tamanho da borda da tampinha (sem · fina · normal · grossa)')
    erros_todos = []
    async with async_playwright() as pw:
        b, pg, erros = await abre(pw, 1280, 720)
        erros_todos.append(erros)

        # ---------------------------------------------------------------- 1) o código
        print('\n1) o código da tampinha leva o tamanho no fim')
        c = await rt(pg, r"""(() => {
          const base = () => tpLe(TP_PADRAO_COD);
          const casos = [];
          { const D = base(); D.b = 'bt'; D.bc = ['#ffffff', '#1d1d1d']; D.p = 'ls'; D.pc = ['#e2412f', '#ffffff', '#000000']; D.i = '--'; casos.push(D); }
          { const D = base(); D.b = 'bc'; D.bc = ['#2f5bd6', '#ffd23f']; D.p = TP_PADROES.filter(x => x.cores === 2)[1].id; D.pc = ['#101010', '#ff6a1a', '#ffd23f']; D.pp = [30, 70, 64, 12]; D.i = 'tx'; D.t = 'R10'; D.ic = ['#ffffff', '#000000']; D.ip = [60, 40, 55, 25]; casos.push(D); }
          { const D = base(); D.b = 'dt'; D.i = SK76_CARAS[0].id; D.ip = [50, 50, 50, 0]; casos.push(D); }
          { const D = base(); casos.push(D); }
          const vaiVolta = [];
          for (const D0 of casos) for (const k of [0, 1, 2, 3]){
            const D = tpCopia(D0); D.bt = k; const cod = tpCodigo(D), L = tpLe(cod), D00 = tpCopia(D0); D00.bt = 0; const L0 = tpCopia(L); L0.bt = 0;
            vaiVolta.push({k, ok:!!L && L.bt === k && tpCodigo(L0) === tpCodigo(D00), cod});
          }
          // o codificador e o leitor de antes (o mesmo texto sem a linha do tamanho; o leitor com a memória dele)
          const fc = tpCodigo.toString(), fl = tpLe.toString();
          const fcV = fc.replace(/\n\s*if \(D\.k === 'T' && \(\(D\.bt \| 0\) & 3\)\) put\(\(D\.bt \| 0\) & 3, 2\);[^\n]*/, '');
          const flV = fl.replace(/\n\s*D\.bt = k === 'T' && at \+ 2 <= bits\.length \? get\(2\) : 0;[^\n]*/, '').replace(/TP_LIDOS/g, 'LIDOS_V');
          const codV = eval('(' + fcV + ')'), leV = (() => { const LIDOS_V = new Map(); return eval('(' + flV + ')'); })();
          // 200 tampinhas sorteadas (sempre as mesmas)
          let s = 12345; const rnd = () => (s = (s*16807) % 2147483647)/2147483647, esc = a => a[Math.floor(rnd()*a.length)];
          const cor = () => '#' + Math.floor(rnd()*16777215).toString(16).padStart(6, '0');
          let iguais = 0, antesLe = 0, n = 0, maior = 0;
          for (let j = 0; j < 200; j++){
            const D = base(); D.b = esc(TP_BORDAS).id; D.bc = [cor(), cor()]; D.p = esc(TP_PADROES).id; D.pc = [cor(), cor(), cor()];
            D.pp = rnd() < .5 ? [50, 50, 50, 0] : [Math.floor(rnd()*101), Math.floor(rnd()*101), Math.floor(rnd()*101), Math.floor(rnd()*101)];
            D.i = esc(TP_ICONES).id; D.ic = [cor(), cor()]; D.ip = rnd() < .5 ? [50, 50, 50, 0] : [Math.floor(rnd()*101), Math.floor(rnd()*101), Math.floor(rnd()*101), Math.floor(rnd()*101)];
            D.ie = Math.floor(rnd()*4); D.t = D.i === 'tx' ? esc(['A', 'RJ', 'R10', '★♥!']) : '';
            n++;
            D.bt = 0; if (tpCodigo(D) === codV(D)) iguais++;
            D.bt = 1 + Math.floor(rnd()*3); const cod = tpCodigo(D), V = leV(cod), N = tpLe(cod);
            if (V && N && (V.bt | 0) === 0 && N.bt === D.bt){ const a = tpCopia(N); a.bt = 0; if (tpCodigo(a) === tpCodigo(V)) antesLe++; }
            maior = Math.max(maior, cod.length - 2);
          }
          // a mais comprida que dá para fazer: a borda de 2 cores, o padrão de 3 cores e o ícone de 2 cores fora do lugar, sem borda
          const M = base(); M.b = 'bc'; M.bc = ['#123456', '#abcdef']; M.p = TP_PADROES.filter(x => x.cores === 2)[0].id; M.pc = ['#111111', '#222222', '#333333']; M.pp = [1, 99, 77, 33];
          M.i = TP_ICONES.filter(x => x.cores === 2 && !x.texto && !x.cara)[0].id; M.ic = ['#444444', '#555555']; M.ip = [99, 1, 88, 44]; M.bt = 3;
          const longa = tpCodigo(M);
          const T = tpLe(longa.replace(/^T/, 'T')), E = TP_ESCUDO_D(); E.bt = 3; const codE = tpCodigo(E), LE = tpLe(codE);
          return {vaiVolta, iguais, antesLe, n, maior, longa, longaOk:TP_RE.test(longa) && !!tpLe(longa) && tpLe(longa).bt === 3,
                  troquei:[fc !== fcV, fl !== flV], escudo:{bt:LE ? LE.bt : -1, igual:codE === tpCodigo(TP_ESCUDO_D())},
                  inicial:tpCodigo(tpLe(TP_PADRAO_COD)) === TP_PADRAO_COD};
        })()""")
        vv = c['vaiVolta']
        P.confere(all(x['ok'] for x in vv) and len(vv) == 16, 'o tamanho vai e volta no código (as 4 em 4 tampinhas: a BOTÃO, a de 2 cores com texto e posições, a cara animada, a inicial)', [x for x in vv if not x['ok']][:3])
        P.confere(c['troquei'] == [True, True], '(o codificador e o leitor de antes: o mesmo texto sem a linha do tamanho)', c['troquei'])
        P.confere(c['iguais'] == c['n'] == 200 and c['inicial'], 'com a borda NORMAL o código é o mesmo de antes (200 tampinhas sorteadas; a inicial também)', [c['iguais'], c['n']])
        P.confere(c['antesLe'] == 200, 'o jogo de antes lê o código novo: a mesma tampinha, com a borda normal (200 de 200)', c['antesLe'])
        P.confere(c['escudo'] == {'bt': 0, 'igual': True}, 'o escudo do clube não leva tamanho (o código é o de sempre)', c['escudo'])
        P.confere(c['longaOk'] and len(c['longa']) - 2 <= 44 and c['maior'] <= 44, 'o código mais comprido, sem borda, cabe na regra (%d letras; até 44)' % (len(c['longa']) - 2), [c['longa'], c['maior']])

        # ---------------------------------------------------------------- 2) o desenho, nos pixels
        print('\n2) o desenho, medido nos pixels (raio de 100 px)')
        pts = [[k, 0] for k in (.62, .70, .755, .76, .78, .83, .875, .89, .915, .95, .985)]
        bt = {}
        for k in (0, 1, 2, 3):
            px = await rt(pg, '%s(%s("bt", %d), 100, %s)' % (PIXELS, VERMELHA, k, json.dumps(pts)))
            bt[k] = dict(zip([p[0] for p in pts], px))
        P.confere(eh(bt[0][.78], 'vermelho_sombra') and eh(bt[0][.83], 'escuro') and eh(bt[0][.89], 'metal') and eh(bt[0][.95], 'escuro') and eh(bt[0][.985], 'vazio'),
                  'BOTÃO NORMAL (a de sempre): o desenho até 81%, o filete, o aro (v110: de metal) de 85% a 94%, o contorno e nada fora', [bt[0][k] for k in (.78, .83, .89, .95, .985)])
        P.confere(eh(bt[1][.83], 'vermelho_sombra') and eh(bt[1][.875], 'escuro') and eh(bt[1][.915], 'metal') and eh(bt[1][.95], 'escuro'),
                  'BOTÃO FINA: o desenho cresce (até 86%) e o aro (v110: de metal) fica fino (de 89% a 94%)', [bt[1][k] for k in (.83, .875, .915, .95)])
        P.confere(eh(bt[2][.70], 'vermelho_sombra') and eh(bt[2][.755], 'escuro') and eh(bt[2][.83], 'metal') and eh(bt[2][.89], 'metal'),
                  'BOTÃO GROSSA: o desenho diminui (até 74%) e o aro (v110: de metal) fica grosso (de 77% a 94%)', [bt[2][k] for k in (.70, .755, .83, .89)])
        P.confere(eh(bt[3][.83], 'vermelho') and eh(bt[3][.95], 'vermelho_sombra') and eh(bt[3][.985], 'vazio'),
                  'BOTÃO SEM BORDA: só o desenho, cheio até a beirada (97% do raio), sem aro nem contorno (v110: com a sombra por dentro rente à beirada)', [bt[3][k] for k in (.83, .95, .985)])
        dt = {}
        for k in (0, 1, 2, 3):
            px = await rt(pg, '%s(%s("dt", %d), 100, %s)' % (PIXELS, VERMELHA, k, json.dumps(pts)))
            dt[k] = dict(zip([p[0] for p in pts], px))
        P.confere(eh(dt[0][.70], 'vermelho') and eh(dt[0][.76], 'nao_vermelho') and eh(dt[1][.76], 'vermelho') and eh(dt[2][.62], 'vermelho') and eh(dt[2][.70], 'nao_vermelho'),
                  'a de dentes (Dentada): o meio com 74% do raio na normal, 80% na fina e 66% na grossa', [dt[0][.70], dt[0][.76], dt[1][.76], dt[2][.62], dt[2][.70]])
        P.confere(eh(dt[3][.95], 'vermelho_sombra') and eh(dt[3][.985], 'vazio'), 'a de dentes SEM BORDA: sem a saia e sem os dentes (só o desenho; v110: com a sombra por dentro)', [dt[3][.95], dt[3][.985]])
        voltas = [[.995, a/36*6.2832] for a in range(36)]   # (a 99,5% do raio: as pontas dos dentes; a cara sem borda acaba em 97%)
        cara = {}
        for k in (0, 3):
            px = await rt(pg, '%s(%s("dt", %d, SK76_CARAS[0].id), 100, %s)' % (PIXELS, VERMELHA, k, json.dumps(voltas)))
            cara[k] = sum(1 for p in px if not eh(p, 'vazio'))
        base = await rt(pg, """(() => { const r = []; for (const k of [0, 3]){ const D = %s('dt', k, SK76_CARAS[0].id), c = sk76Base(D, tpCodigo(D), 60), g = c.getContext('2d');
            const d = g.getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 12) n++; r.push(n); } return r; })()""" % VERMELHA)
        P.confere(cara[0] > 4 and cara[3] == 0 and base[0] > 500 and base[1] == 0,
                  'com a cara animada: SEM BORDA a cara ocupa a tampinha (sem os dentes) — parada e na imagem pronta da que mexe (sem a saia e o fundo escuro)', [cara, base])
        emj = await rt(pg, """(() => [0, 1, 2, 3].map(k => [+emjRaio(100, %s('bt', k)).toFixed(2), +emjRaio(100, %s('dt', k)).toFixed(2)]))()""" % (VERMELHA, VERMELHA))
        P.confere([abs(emj[0][0] - 81.48) < .05, abs(emj[1][0] - 85.85) < .05, abs(emj[2][0] - 73.72) < .05, emj[3][0] == 97, [e[1] for e in emj] == [74, 80, 66, 97]] == [True]*5,
                  'o emoji cobre o meio de cada uma (BOTÃO: 81, 86, 74 e 97 px; dentes: 74, 80, 66 e 97 px)', emj)

        # ---------------------------------------------------------------- 3) o editor
        print('\n3) o editor: TAMANHO DA BORDA na aba BORDA')
        await rt(pg, "(() => { if (lobby.tela) fechaTela(); abreTela('skins'); return 1; })()")
        await pg.wait_for_timeout(900)
        await pg.click('.tpe-aba[data-aba="b"]'); await pg.wait_for_timeout(500)
        e0 = await rt(pg, """(() => { const bl = ED.el.ctl.querySelector('.tpe-btam'); if (!bl) return null; const bs = [...bl.querySelectorAll('[data-bt]')];
          return {rot:bl.querySelector('.tpe-rot').textContent.trim(), bts:bs.map(b => b.textContent.trim()), on:bs.filter(b => b.classList.contains('on')).map(b => b.textContent.trim()), bt:ED.D.bt | 0,
                  depoisCores:bl.previousElementSibling && bl.previousElementSibling.classList.contains('tpe-cores')}; })()""")
        P.confere(e0 and e0['rot'] == 'TAMANHO DA BORDA' and e0['bts'] == ['SEM', 'FINA', 'NORMAL', 'GROSSA'] and e0['on'] == ['NORMAL'] and e0['bt'] == 0 and e0['depoisCores'],
                  'na aba BORDA: o TAMANHO DA BORDA embaixo das cores, com SEM · FINA · NORMAL · GROSSA (a NORMAL acesa)', e0)
        await pg.click('.tpe-btam [data-bt="2"]'); await pg.wait_for_timeout(400)
        e1 = await rt(pg, "({bt:ED.D.bt, on:[...ED.el.ctl.querySelectorAll('.tpe-btam [aria-pressed=\"true\"]')].map(b => b.textContent.trim()), fala:ED.el.cv.getAttribute('aria-label')})")
        P.confere(e1['bt'] == 2 and e1['on'] == ['GROSSA'] and e1['fala'].endswith('· borda grossa'), 'tocar em GROSSA: a tampinha grande muda e o nome falado diz "borda grossa"', e1)
        await pg.screenshot(path=str(SAIDA / 'v105_borda_grossa_1280x720.png'))
        await pg.click('.tpe-btam [data-bt="3"]'); await pg.wait_for_timeout(900)
        e2 = await rt(pg, """(() => { const minis = [...ED.el.faixa.querySelectorAll('.tpe-item canvas')].slice(0, 8).map(c => c.toDataURL());
          return {bt:ED.D.bt, nota:ED.el.semGeo.textContent, notaVis:!ED.el.semGeo.hidden, minisDiferentes:new Set(minis).size, n:minis.length}; })()""")
        P.confere(e2['bt'] == 3 and e2['nota'].startswith('Sem borda: a tampinha fica só com o desenho') and e2['notaVis'],
                  'tocar em SEM: a tampinha fica só com o desenho e o aviso embaixo diz como a borda volta', e2)
        P.confere(e2['n'] >= 6 and e2['minisDiferentes'] >= 4, 'SEM BORDA, a faixa mostra cada borda no tamanho normal (as miniaturas não ficam todas iguais)', e2)
        await pg.screenshot(path=str(SAIDA / 'v105_borda_sem_1280x720.png'))
        await pg.click('.tpe-mini[aria-label="Desfazer"]'); await pg.wait_for_timeout(400)
        e3 = await rt(pg, "({bt:ED.D.bt, on:[...ED.el.ctl.querySelectorAll('.tpe-btam .on')].map(b => b.textContent.trim())})")
        P.confere(e3 == {'bt': 2, 'on': ['GROSSA']}, 'o DESFAZER volta para a GROSSA', e3)
        await pg.click('.tpe-aba[data-aba="p"]'); await pg.wait_for_timeout(300)
        semBloco = await rt(pg, "!ED.el.ctl.querySelector('.tpe-btam')")
        await pg.click('.tpe-aba[data-aba="b"]'); await pg.wait_for_timeout(300)
        e4 = await rt(pg, "({bt:ED.D.bt, on:[...ED.el.ctl.querySelectorAll('.tpe-btam .on')].map(b => b.textContent.trim())})")
        P.confere(semBloco and e4 == {'bt': 2, 'on': ['GROSSA']}, 'trocar de aba não perde o tamanho (o controle só aparece na aba BORDA)', [semBloco, e4])
        esc = await rt(pg, """(() => { tpeTroca(tpLe(tpMinha())); tpeApagaRascunho(); fechaTela(); if (!LB.pop.hidden) fechaPop();   // (volta à equipada: sai sem perguntar)
          tpeAbre({modo:'E', D:TP_ESCUDO_D(), ok:() => {}, titulo:'ESCUDO'}); ED.aba = 'b'; tpeAtualiza(true);
          const r = {modo:ED.modo, bloco:!!ED.el.ctl.querySelector('.tpe-btam')}; fechaTela(); return r; })()""")
        P.confere(esc == {'modo': 'E', 'bloco': False}, 'o escudo do clube não tem o tamanho da borda', esc)
        await pg.wait_for_timeout(400)
        # SEM BORDA e EQUIPAR (na sua tampinha), e abrir o jogo de novo
        await rt(pg, "(() => { if (lobby.tela) fechaTela(); abreTela('skins'); return 1; })()"); await pg.wait_for_timeout(900)
        await pg.click('.tpe-aba[data-aba="b"]'); await pg.wait_for_timeout(300)
        await pg.click('.tpe-btam [data-bt="3"]'); await pg.wait_for_timeout(500)
        await pg.click('.tpe-ok'); await pg.wait_for_timeout(1200)
        q = await rt(pg, "(() => { const D = tpLe(tpMinha()); return {bt:D ? D.bt : -1, cod:tpMinha(), eq:TP.equipada, tela:lobby.tela || ''}; })()")
        P.confere(q['bt'] == 3 and q['eq'] == q['cod'], 'EQUIPAR: a sua tampinha fica sem borda (o código leva o tamanho)', q)
        await reabre(pg)
        q2 = await rt(pg, "(() => { const D = tpLe(tpMinha()); return {bt:D ? D.bt : -1, cod:tpMinha(), perfil:perfil.skin}; })()")
        P.confere(q2['bt'] == 3 and q2['cod'] == q['cod'] and q2['perfil'] == q['cod'], 'abrir o jogo de novo: continua sem borda (no aparelho e no perfil, que vai para as salas)', q2)
        await pg.screenshot(path=str(SAIDA / 'v105_borda_lobby_sem_1280x720.png'))
        await b.close()

        b2, pg2, erros2 = await abre(pw, 844, 390)
        erros_todos.append(erros2)
        await rt(pg2, "(() => { if (lobby.tela) fechaTela(); abreTela('skins'); return 1; })()"); await pg2.wait_for_timeout(900)
        await pg2.click('.tpe-aba[data-aba="b"]'); await pg2.wait_for_timeout(400)
        cabe = await rt(pg2, """(() => { const bl = ED.el.ctl.querySelector('.tpe-btam'), c = ED.el.ctl.getBoundingClientRect(), r = bl.getBoundingClientRect();
          const bs = [...bl.querySelectorAll('[data-bt]')].map(b => b.getBoundingClientRect());
          return {dentro:r.top >= c.top - 1 && r.bottom <= c.bottom + 1 && r.left >= c.left - 1 && r.right <= c.right + 1, alt:Math.round(Math.min(...bs.map(x => x.height))), larg:Math.round(Math.min(...bs.map(x => x.width)))}; })()""")
        P.confere(cabe['dentro'] and cabe['alt'] >= 18 and cabe['larg'] >= 60, 'no celular deitado (844 × 390) o TAMANHO DA BORDA cabe na tela, com os 4 botões inteiros (%d × %d px)' % (cabe['larg'], cabe['alt']), cabe)
        for v, nome in ((1, 'fina'), (3, 'sem')):
            await pg2.click('.tpe-btam [data-bt="%d"]' % v); await pg2.wait_for_timeout(500)
            await pg2.screenshot(path=str(SAIDA / ('v105_borda_%s_844x390.png' % nome)))
        await b2.close()

    # ---------------------------------------------------------------- 4) o servidor das salas e a plataforma
    print('\n4) o servidor das salas e a plataforma')
    normal = vv[0]['cod']; sem = vv[3]['cod']
    s = subprocess.run(['node', '-e', "const F = require('./server/fundador96.js'), C = require('./server/clubes.js'); const [a, b] = process.argv.slice(1);"
                        " console.log(JSON.stringify({re:[C.TAMPA_RE.test(a), C.TAMPA_RE.test(b)], pec:[F.pecasDoCodigo(a), F.pecasDoCodigo(b)], valida:F.skinValida({}, b) === b}))", normal, sem],
                       cwd=str(RAIZ), capture_output=True, text=True, timeout=30)
    try: sv = json.loads(s.stdout.strip().splitlines()[-1])
    except Exception: sv = {'erro': s.stdout[-300:] + s.stderr[-300:]}
    P.confere(sv.get('re') == [True, True] and sv.get('pec', [1, 2])[0] == sv.get('pec', [1, 2])[1] and sv.get('valida') is True,
              'o código sem borda passa na regra das salas e da plataforma, com as mesmas peças lidas do começo, e a tampinha não é tirada', sv)

    js = [e for l in erros_todos for e in l if 'Failed to load resource' not in e]
    P.confere(not js, 'nenhum erro de JavaScript', js[:4])
    return P.fim()


if __name__ == '__main__':
    sys.exit(asyncio.run(principal()))
