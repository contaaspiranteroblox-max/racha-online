"""RACHA v96 · AS TAMPINHAS ANIMADAS NOVAS E A DOS FUNDADORES no jogo de verdade (no navegador).

· As peças: as 7 caras novas (PIPA NO CÉU, BAILE, MARÉ, TEMPESTADE, IPÊ AMARELO, LAVA e a FUNDADOR) e as 4 bordas acesas
  (ARCO-ÍRIS VIVO, OURO LÍQUIDO, COMETA e a AURA DOS FUNDADORES) entram no FIM das listas: os códigos das tampinhas de antes não
  mudam; a cara Fundador é o ícone 86 e a Aura a borda 26 — os mesmos lugares que o servidor das salas confere
  (server/fundador96.js).
· O desenho: cada uma desenha sem erro em vários tamanhos (12, 40 e 120 px) e muda com o tempo (dois instantes, dois desenhos);
  a miniatura sai sempre igual; nada passa de 1,2 × o raio (o aro do time fica livre); o código vai e volta igual; os bots
  nunca pegam as animadas (400 sorteios).
· A dos fundadores: sem ela, não aparece no editor (nem a cara, nem a borda, nem o modelo pronto), não se compra (a janela
  diz por quê), não se equipa por código colado e a sorteada nunca cai nela; a loja de peças não lista; com ela (a conta
  ganhou), aparece no editor com o selo FUNDADOR, equipa, e a janela "VOCÊ É UM DOS 30 PRIMEIROS" (Fundador nº 7 de 30) abre
  uma vez, com o EQUIPAR AGORA.
· Na partida: a dos fundadores equipada mexe no campo (dois quadros diferentes com a tampinha parada no lugar); o custo de 8
  iguais na tela, por quadro (como na v76: menos de 25 ms no Chromium de teste sem placa de vídeo).
· A faixa do editor: escolher a última peça (Lava, Cometa) mostra a peça e não empurra a tela inteira para o lado.
Capturas em tests/saida/v96_*.png.
Rodar: python3 tests/v96_skins_test.py"""
import json, re
from comum import abre, rt, roda, Placar, async_playwright, RAIZ
import comum; comum.SKINS_PRONTAS = True   # v101: este teste confere as tampinhas prontas (o interruptor as traz de volta)

SAIDA = RAIZ / 'tests' / 'saida'; SAIDA.mkdir(exist_ok=True)
NOVAS_I = ['zk', 'zn', 'zm', 'zt', 'zi', 'zv', 'zw']
NOVAS_B = ['va', 'vo', 'vc', 'vw']

PECAS = r"""(() => {
  const hash = c => { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let h = 0; for (let i = 0; i < d.length; i += 4) h = (Math.imul(h ^ (d[i] | d[i + 1] << 8 | d[i + 2] << 16 | d[i + 3] << 24), 2654435761) + 0x9e3779b9) | 0; return h; };
  const D0 = (i, b) => tpNorm(Object.assign(TP_PADRAO_D(), {b, bc:['#ffd45e', '#ff7a2a'], p:'li', pc:['#0b0a10', '#ffffff', '#1d1d1d'], pp:[50, 50, 50, 0], i, ic:['#ffffff', '#1d1d1d'], ip:[50, 50, 50, 0], ie:0, t:''}));
  const quadro = (D, t, lado) => { const c = document.createElement('canvas'); c.width = c.height = lado || 200; const g = c.getContext('2d'); sk76Desenha(g, c.width / 2, c.height / 2, c.width * .35, D, t, 1); return c; };
  const fora = c => { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data, R = c.width * .35, m0 = c.width / 2; let n = 0; for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++){ if (Math.hypot(x + .5 - m0, y + .5 - m0) > R * 1.2 && d[(y * c.width + x) * 4 + 3] > 8) n++; } return n; };
  const erros = [], caras = [];
  for (const id of %s) {
    const b = id === 'zw' ? 'vw' : 'dt', D = D0(id, b), cod = tpCodigo(D);
    let a = 0, z = 0, f = 0, mini1 = 0, mini2 = 0;
    try { for (const lado of [34, 114, 342]) for (const t of [0, .4, 1.3, 2.9, 5.1]) quadro(D, t, lado); a = hash(quadro(D, .7)); z = hash(quadro(D, 1.9)); for (const t of [.2, 1.4, 2.3, 3.1, 4.4]) f += fora(quadro(D, t)); mini1 = hash(tpMiniatura(D, 96)); mini2 = hash(tpMiniatura(D, 96)); } catch (e) { erros.push(id + ': ' + e.message); }
    const L = tpLe(cod);
    caras.push({id, mexe: a !== z, fora: f, mini: mini1 === mini2, ida: tpCodigo(L) === cod && L.i === id, anim: !!(sk76Anim(L) || {}).cara});
  }
  const aros = [];
  for (const id of %s) {
    const D = D0('--', id), cod = tpCodigo(D);
    let a = 0, z = 0, f = 0; try { a = hash(quadro(D, .6)); z = hash(quadro(D, 1.7)); for (const t of [.2, 1.1, 1.9, 2.3, 3.1, 4.4]) f += fora(quadro(D, t)); } catch (e) { erros.push(id + ': ' + e.message); }
    const L = tpLe(cod); aros.push({id, mexe: a !== z, fora: f, ida: tpCodigo(L) === cod && L.b === id, anim: !!(sk76Anim(L) || {}).aro});
  }
  let bots = 0; for (let i = 0; i < 400; i++) { const L = tpLe(tpDoBot('bot-v96-' + i)); if (L && sk76Anim(L)) bots++; }
  return {erros, caras, aros, bots, nI: TP_ICONES.length, nB: TP_BORDAS.length, iZw: TP_ICONES.findIndex(x => x.id === 'zw'), iVw: TP_BORDAS.findIndex(x => x.id === 'vw'),
    ultI: TP_ICONES.slice(-7).map(x => x.id + ':' + x.pr), ultB: TP_BORDAS.slice(-4).map(x => x.id + ':' + x.pr + ':' + x.anim), erroKit: window.RUA_SKINS76_ERRO || null,
    codFund: window.RachaSkins96.codigoFundador(), velhos: TP_PRE.map(x => tpCodigo(x.d))};
})()""" % (json.dumps(NOVAS_I), json.dumps(NOVAS_B))


async def principal():
    P = Placar('v96 · as tampinhas animadas novas e a dos fundadores')
    srv = (RAIZ / 'server' / 'fundador96.js').read_text(encoding='utf-8')
    m = re.search(r"FUNDADOR = Object\.freeze\(\{ item: 'tp_fundador', borda: (\d+), icone: (\d+) \}\)", srv)
    async with async_playwright() as pw:
        b, pg, erros = await abre(pw, 1280, 720)
        await pg.wait_for_function('() => window.__RT("typeof RachaSkins96 === \'object\' && SK76.ok")', polling=100, timeout=10000)
        s = await rt(pg, PECAS)
        print('    ', json.dumps({k: s[k] for k in ('nI', 'nB', 'iZw', 'iVw', 'ultI', 'ultB', 'bots', 'codFund')}, ensure_ascii=False))
        P.confere(not s['erros'] and not s['erroKit'], 'as 11 peças novas desenham sem erro (34, 114 e 342 px; cinco instantes)', s['erros'][:3] or s['erroKit'])
        P.confere(s['ultI'] == [x + (':fundador' if x == 'zw' else ':lendario') for x in NOVAS_I] and s['ultB'] == ['va:epico:arco', 'vo:epico:ouro', 'vc:epico:cometa', 'vw:fundador:fundador'],
                  'no fim das listas: 6 caras lendárias e a Fundador; 3 bordas épicas e a Aura dos Fundadores', [s['ultI'], s['ultB']])
        P.confere(s['nI'] == 87 and s['nB'] == 27 and s['iZw'] == 86 and s['iVw'] == 26, 'a cara Fundador é o ícone 86 e a Aura a borda 26 (87 ícones e 27 bordas)', [s['nI'], s['nB'], s['iZw'], s['iVw']])
        P.confere(bool(m) and int(m.group(1)) == s['iVw'] and int(m.group(2)) == s['iZw'], 'os mesmos lugares que o servidor das salas confere (server/fundador96.js)', m and m.groups())
        c = s['caras']
        P.confere(all(x['mexe'] for x in c), 'as 7 caras mudam com o tempo (dois instantes, dois desenhos)', [x['id'] for x in c if not x['mexe']])
        P.confere(all(x['mini'] for x in c) and all(x['fora'] == 0 for x in c + s['aros']), 'a miniatura sai sempre igual e nada passa de 1,2 × o raio (as caras e as bordas, em vários instantes: o aro do time e a bola ficam livres)', [(x['id'], x['fora']) for x in c + s['aros'] if x['fora'] or not x.get('mini', True)])
        P.confere(all(x['ida'] and x['anim'] for x in c) and all(x['ida'] and x['anim'] and x['mexe'] for x in s['aros']), 'o código vai e volta igual e é reconhecida como animada (as caras e as 4 bordas, que também mexem)', [c, s['aros']])
        P.confere(s['bots'] == 0, 'os bots nunca pegam as animadas (400 sorteios)', s['bots'])
        P.confere(len(s['velhos']) >= 44, 'as tampinhas prontas de antes continuam com o mesmo código (as peças novas entraram no fim)')
        cod = s['codFund']

        # ---------------------------------------------------------------- sem ser fundador
        r = await rt(pg, """(cod => {
          const D = tpLe(cod), r = {tem: [tpTem('i', 'zw'), tpTem('b', 'vw')], equipa: tpEquipa(cod), equipada: tpMinha() === cod, compra: tpCompra(D), faltam: tpFaltam(D).map(x => x.id + ':' + !!x.fundador),
            loja: ecoPecas().filter(x => x.it.fundador).length, raridade: tpeRaridade(D)};
          return r; })(%s)""" % json.dumps(cod))
        P.confere(r['tem'] == [False, False] and not r['equipa'] and not r['equipada'] and not r['compra'], 'sem ser fundador: não tem as peças, não equipa (nem pelo código colado) e não compra', r)
        P.confere(sorted(r['faltam']) == ['vw:true', 'zw:true'] and r['loja'] == 0 and r['raridade'] == 'fundador', 'o editor diz que faltam as duas peças dos fundadores; a loja de peças não lista; a raridade é FUNDADOR', r)
        await rt(pg, "(() => { abreTela('skins'); return true; })()"); await pg.wait_for_timeout(600)
        r = await rt(pg, """(() => { const ids = aba => { ED.aba = aba; tpeAtualiza(true); return [...ED.el.faixa.children].map(b => b.dataset.id); };
          const i = ids('i'), bb = ids('b'); ED.aba = 'pre'; tpeAtualiza(true);
          const nomes = [...ED.el.ctl.querySelectorAll('.tpe-card')].map(c => (c.querySelector('.tpe-card-n') || {}).textContent);
          return {i: i.filter(x => ['zk', 'zn', 'zm', 'zt', 'zi', 'zv', 'zw'].includes(x)), b: bb.filter(x => ['va', 'vo', 'vc', 'vw'].includes(x)), pre: nomes.slice(0, 16)}; })()""")
        P.confere(r['i'] == NOVAS_I[:6] and r['b'] == NOVAS_B[:3] and 'Fundador' not in r['pre'] and r['pre'][8:14] == ['Pipa no céu', 'Baile', 'Maré', 'Tempestade', 'Ipê amarelo', 'Lava'],
                  'no editor: as 6 caras e as 3 bordas novas (com os modelos prontos); a dos fundadores não aparece', r)
        # (as peças novas ficam no fim da faixa: escolher a última não pode empurrar a tela inteira para o lado)
        lado = []
        for aba, pid in (('i', 'zv'), ('b', 'vc')):
            await rt(pg, "((aba, id) => { ED.aba = aba; ED.D[aba] = id; tpeAtualiza(true); return true; })(%s, %s)" % (json.dumps(aba), json.dumps(pid))); await pg.wait_for_timeout(500)
            lado.append(await rt(pg, """(() => { const f = ED.el.faixa, on = f.querySelector('.tpe-item.on'), a = on.getBoundingClientRect(), c = f.getBoundingClientRect();
              return {id: on.dataset.id, lb: document.getElementById('lb').scrollLeft, doc: document.scrollingElement.scrollLeft, visivel: a.left >= c.left - 1 && a.right <= c.right + 1}; })()"""))
        P.confere(all(x['lb'] == 0 and x['doc'] == 0 and x['visivel'] for x in lado), 'escolher a última peça da faixa (Lava, Cometa) mostra a peça e não empurra a tela para o lado', lado)
        await rt(pg, "(() => { ED.D = tpLe(tpMinha()); ED.aba = 'pre'; tpeAtualiza(true); LB.aviso.classList.remove('on'); return true; })()"); await pg.wait_for_timeout(250)
        await pg.screenshot(path=str(SAIDA / 'v96_editor_colecao.png'))
        r = await rt(pg, """(cod => { ED.hist.push(tpCopia(ED.D)); ED.D = tpLe(cod); tpeAtualiza(true); tpeConcluir(); const t = LB.pop.hidden ? '' : LB.popCaixa.textContent; const cls = LB.popCaixa.className; fechaPop(); return {t, cls}; })(%s)""" % json.dumps(cod))
        P.confere('não está à venda' in r['t'] and 'sk96-fund-pop' in r['cls'], 'o CONCLUÍDO com a dos fundadores (sem ser fundador) abre a janela que explica: não está à venda', r)
        r = await rt(pg, """(() => { let n = 0; for (let k = 0; k < 60; k++) { tpeAleatoria(); if (ED.D.i === 'zw' || ED.D.b === 'vw') n++; } return n; })()""")
        P.confere(r == 0, 'a tampinha sorteada nunca cai na dos fundadores (60 sorteios)', r)
        await rt(pg, "(() => { fechaTela(); const b = [...LB.popCaixa.querySelectorAll('button')].find(b => /DESCARTAR/.test(b.textContent)); if (!LB.pop.hidden && b) b.click(); return true; })()")

        # ---------------------------------------------------------------- a conta ganhou (a plataforma avisou no loja.estado)
        # (a janela dos fundadores entra na fila do lobby: com outra aberta, espera ela fechar — não passa por cima; e espera a
        # primeira vez acabar — o harness esconde a tela da primeira vez sem fechar: o onbFim fecha)
        await rt(pg, "(() => { onbFim(); try { localStorage.removeItem('racha96-fundador-visto'); } catch (_) {} abrePop(cx => { cx.append(nodo('h2', null, 'OUTRA JANELA')); cx.appendChild(botaoPop('OK', 'verde', () => fechaPop())); }); sk96Fundador({numero: 7, vagas: 30, novo: true}); return true; })()")
        await pg.wait_for_timeout(1300)
        r = await rt(pg, "(() => ({t: LB.pop.hidden ? '' : LB.popCaixa.textContent, cls: LB.popCaixa.className}))()")
        P.confere('OUTRA JANELA' in r['t'] and 'sk96-fund-pop' not in r['cls'], 'com outra janela aberta, a dos fundadores espera (não passa por cima)', r)
        await rt(pg, "(() => { fechaPop(); return true; })()")
        await pg.wait_for_timeout(1300)
        r = await rt(pg, "(() => ({aberta: !LB.pop.hidden, t: LB.popCaixa.textContent, cls: LB.popCaixa.className, tem: [tpTem('i', 'zw'), tpTem('b', 'vw')], info: RachaSkins96.info()}))()")
        P.confere(r['aberta'] and 'FUNDADOR Nº 7 DE 30' in r['t'] and 'sk96-fund-ganhou' in r['cls'] and r['tem'] == [True, True], 'a fundadora: a janela "VOCÊ É UM DOS 30 PRIMEIROS" (Fundador nº 7 de 30) e as duas peças são dela', r)
        await pg.screenshot(path=str(SAIDA / 'v96_fundador_janela.png'))
        await rt(pg, "(() => { [...LB.popCaixa.querySelectorAll('button')].find(b => /EQUIPAR AGORA/.test(b.textContent)).click(); return true; })()")
        await pg.wait_for_timeout(300)
        r = await rt(pg, "(cod => ({equipada: tpMinha() === cod, fechou: LB.pop.hidden}))(%s)" % json.dumps(cod))
        P.confere(r['equipada'] and r['fechou'], 'EQUIPAR AGORA: a dos fundadores equipada', r)
        await rt(pg, "(() => { sk96Fundador({numero: 7, vagas: 30, novo: false}); return true; })()"); await pg.wait_for_timeout(1300)
        P.confere(await rt(pg, "LB.pop.hidden"), 'a janela aparece uma vez só (entrar de novo não abre de novo)')
        r = await rt(pg, "(() => { tpSalva(); const g = JSON.parse(localStorage.getItem(TP_CHAVE) || '{}'); return {itens: (g.itens || []).filter(k => k === 'i:zw' || k === 'b:vw'), equipada: g.equipada === RachaSkins96.codigoFundador(), naTela: tpMinha() === RachaSkins96.codigoFundador()}; })()")
        P.confere(r == {'itens': [], 'equipada': False, 'naTela': True}, 'as peças dos fundadores são da conta: equipada na tela, mas nunca guardadas no aparelho', r)
        await rt(pg, "(() => { abreTela('skins'); ED.aba = 'i'; tpeAtualiza(true); return true; })()"); await pg.wait_for_timeout(500)
        r = await rt(pg, "(() => { const b = ED.el.faixa.querySelector('.tpe-item[data-id=\"zw\"]'); const r = {cara: !!b, selo: !!(b && b.classList.contains('sk96-fund'))}; ED.aba = 'b'; tpeAtualiza(true); r.borda = !!ED.el.faixa.querySelector('.tpe-item[data-id=\"vw\"].sk96-fund'); ED.aba = 'pre'; tpeAtualiza(true); r.pre = [...ED.el.ctl.querySelectorAll('.tpe-card')].some(c => (c.querySelector('.tpe-card-n') || {}).textContent === 'Fundador'); return r; })()")
        P.confere(r == {'cara': True, 'selo': True, 'borda': True, 'pre': True}, 'com ela: a cara, a borda (com o selo FUNDADOR) e o modelo pronto aparecem no editor', r)
        await rt(pg, "(cod => { ED.hist.push(tpCopia(ED.D)); ED.D = tpLe(cod); ED.aba = 'i'; tpeAtualiza(true); const b = ED.el.faixa.querySelector('.tpe-item[data-id=\"zw\"]'); const f = ED.el.faixa; if (b) f.scrollLeft = b.offsetLeft - f.clientWidth / 2 + b.offsetWidth / 2; return true; })(%s)" % json.dumps(cod)); await pg.wait_for_timeout(700)
        await pg.screenshot(path=str(SAIDA / 'v96_editor_fundador.png'))
        await rt(pg, "(() => { fechaTela(); return true; })()")
        # (sair da conta: a dos fundadores sai da tela junto com o resto da conta; quem usar o aparelho depois não fica com ela)
        r = await rt(pg, """(() => { const cod = RachaSkins96.codigoFundador(); v88Esquece(); const r = {tem: RachaSkins96.temFundador(), pecas: [tpTem('i', 'zw'), tpTem('b', 'vw')], equipada: tpMinha() === cod, equipa: tpEquipa(cod)};
          sk96Fundador({numero: 7, vagas: 30, novo: false}); r.volta = tpEquipa(cod) && tpMinha() === cod; return r; })()""")
        P.confere(r == {'tem': False, 'pecas': [False, False], 'equipada': False, 'equipa': False, 'volta': True}, 'saiu da conta: a dos fundadores sai junto (não fica equipada nem equipa); a conta entrando de novo, volta', r)
        r = await rt(pg, """(() => { const cod = RachaSkins96.codigoFundador(), antes = tpePlataforma; v88Esquece(); TP.equipada = '';   // (o jogo aberto de novo: nada equipado no aparelho)
          tpePlataforma = () => ({conta: () => ({tampa: cod})}); let ok = false;
          try { sk96Fundador({numero: 7, vagas: 30, novo: false}); ok = tpMinha() === cod; } finally { tpePlataforma = antes; } return ok; })()""")
        P.confere(r is True, 'o jogo aberto de novo (o aparelho não guardou): a da conta volta equipada quando a plataforma avisa que é fundadora', r)

        # ---------------------------------------------------------------- na partida: mexe
        pos = await rt(pg, """(() => { __T.comeca('futebol', 2, 4); __T.limpa(); __T.poe(P, CX - U(10), CY + U(6)); __T.bola(CX + U(10), CY - U(8));
          posVisual(0); cam.mode = 'fixa'; updateCamera(0, true); buildStatic(); const r = cv.getBoundingClientRect(), z = cam.z;
          return {x: (W / 2 + (P.x - cam.x) * z) * r.width / W + r.left, y: (H / 2 + (P.y - cam.y) * z) * r.height / H + r.top, r: R_JOG * z * r.width / W}; })()""")
        regiao = """([x, y, r]) => { const c = document.getElementById('c'), b = c.getBoundingClientRect(), k = c.width / b.width, g = c.getContext('2d');
          const d = g.getImageData(Math.round((x - b.left - r) * k), Math.round((y - b.top - r) * k), Math.round(2 * r * k), Math.round(2 * r * k)).data; let h = 0;
          for (let i = 0; i < d.length; i += 4) h = (Math.imul(h ^ (d[i] | d[i + 1] << 8 | d[i + 2] << 16), 2654435761) + 0x9e3779b9) | 0; return h; }"""
        await pg.wait_for_timeout(400); h1 = await pg.evaluate(regiao, [pos['x'], pos['y'], pos['r'] * .7])
        await pg.wait_for_timeout(650); h2 = await pg.evaluate(regiao, [pos['x'], pos['y'], pos['r'] * .7])
        P.confere(h1 != h2, 'na partida: a dos fundadores mexe (dois quadros diferentes com a tampinha parada no lugar)', [h1, h2])
        await pg.screenshot(path=str(SAIDA / 'v96_partida_fundador.png'))
        await rt(pg, 'rqSai(); true')

        # ---------------------------------------------------------------- o custo: 8 iguais na tela, como na v76
        c = await rt(pg, """(() => { const z = K * cam.z, out = {};
          for (const x of [...SK76_PRE.filter(x => !x.fundador && RachaSkins96.caras.includes(x.d.i)), {nome: 'Fundador', cod: RachaSkins96.codigoFundador()}]) { const sk = tpSkin(x.cod); let t0 = performance.now();
            for (let f = 0; f < 60; f++) { ctx.save(); ctx.setTransform(z, 0, 0, z, 0, 0); for (let i = 0; i < 8; i++) botaoPronto(ctx, 60 + i * 90, 80, R_JOG, sk, null, EST0, z); ctx.restore(); }
            out[x.nome] = +((performance.now() - t0) / 60).toFixed(2); }
          return out; })()""")
        print('     ms por quadro, 8 tampinhas iguais na tela:', json.dumps(c, ensure_ascii=False))
        P.confere(len(c) == 7 and max(c.values()) < 25, 'o custo: 8 tampinhas animadas por quadro, no pior caso %.1f ms (Chromium de teste, sem placa de vídeo)' % max(c.values()), c)
        rede = [e for e in erros if 'Failed to load resource' in e]
        P.confere(not [e for e in erros if e not in rede], 'nenhum erro de JavaScript', [e for e in erros if e not in rede][:3])
        await b.close()
    return P.fim()


roda(principal())
