"""RACHA v97 · O RACHÃO NA OFICINA (no navegador, servido por http como no servidor: a moldura precisa do mesmo endereço).
O pedido: "adicione esse rachão na oficina de criação com várias opções de edição" (e a escolha: do jeito dele).
1) Os arquivos: o original guardado (backup/rachao.html, o sha de quando chegou), a página gerada (as fontes do pacote, a
   trava de conteúdo sem conexão para fora, a Oficina de estádios ligada e os três ganchos do motor) e o RACHA com a aba.
2) O Rachão sozinho: nada pedido para fora, as fontes locais, a placa da Oficina de estádios; os 17 campos continuam
   iguais e cada um, levado para o editor e montado de volta, dá o MESMO estádio (as paredes, as traves, os obstáculos, as
   zonas e a física); a limpeza de tudo o que entra (texto, números, listas, chaves estranhas) e o código para compartilhar.
3) O editor (celular deitado): criar a partir de um campo, as ferramentas (pôr, mover, esticar, girar, apagar), o espelho,
   desfazer e refazer, as abas (Campo, Piso, Física, Vento, Poderes, Partida), o salvamento automático, o TESTAR, o JOGAR
   (com os poderes em toda partida), a volta ao editor, o estádio depois de recarregar, apagar, colar código e o limite.
3c) Depois do teste: a aba CHUTES (a cavadinha, a curva e o super chute; SÓ O CHUTAR), o TESTAR e a preparação respeitando
   o estádio, e o MISTURAR COM O RACHA da aba Física (a bola, o jogador e o chute do RACHA; o jeito de andar).
4) A Oficina do RACHA: a aba RACHÃO, a placa, o Rachão por cima (a moldura do mesmo endereço, o "pronto", o voltar), os
   cartões dos estádios (EDITAR e JOGAR), o Esc e o celular em pé com o Rachão aberto; e o MISTURAR COM O RACHÃO da física
   do mapa e da sala.
5) As telas no celular deitado (844x390) e em pé (390x844): nada passa da largura.
Capturas em tests/saida/v97_*.png.
Rodar: python3 tests/v97_rachao_test.py"""
import asyncio, functools, hashlib, http.server, json, re, socketserver, threading
from comum import abre, rt, roda, Placar, async_playwright, RAIZ, CHROME

SAIDA = RAIZ / 'tests' / 'saida'; SAIDA.mkdir(exist_ok=True)
JOGO = RAIZ / 'app' / 'public' / 'game'
PAG = JOGO / 'rachao' / 'rachao.html'
ORIGINAIS = ['classico', 'estadio', 'golaberto', 'quadra', 'rua', 'terrao', 'praia', 'rinque', 'noturno', 'chuva', 'lua', 'fliper', 'octogono', 'coliseu', 'labirinto', 'vendaval', 'buraquinho']
REDE_OK = re.compile(r'WebSocket|/api/|favicon|ERR_|Failed to load resource')   # (o servidor de teste aqui é só de arquivos: sem salas nem plataforma)


class Quieto(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


def servidor():
    h = functools.partial(Quieto, directory=str(RAIZ))
    s = socketserver.ThreadingTCPServer(('127.0.0.1', 0), h)
    s.daemon_threads = True
    threading.Thread(target=s.serve_forever, daemon=True).start()
    return s, 'http://127.0.0.1:%d' % s.server_address[1]


# a "impressão digital" de um estádio montado pelo motor do Rachão (para comparar o original com o que volta do editor)
DIGITAL = r"""(m => { const st = buildStadium(m), r = v => v === undefined ? null : typeof v === 'number' ? Math.round(v * 1000) / 1000 : v;
  return JSON.stringify({
    segs: st.segs.map(s => [s.x1, s.y1, s.x2, s.y2, s.bounce, s.mask, s.kind, s.boost, s.minZ, s.maxZ, s.th, s.vis].map(r)),
    statics: st.statics.map(s => [s.x, s.y, s.r, s.style, s.boost, s.bounce, s.im, s.h].map(r)),
    zones: st.zones.map(z => [z.x, z.y, z.r, z.kind, z.ballDamp, z.accelMul, z.playerDamp].map(r)),
    goals: st.goals.map(g => [g.side, g.x, g.dir, g.half, g.depth].map(r)), gx: st.gx.map(r), ext: [st.ext.x, st.ext.y].map(r),
    walls: st.walls.length, phys: Object.keys(st.phys).sort().map(k => [k, r(st.phys[k])]), pc: st.playerChain ? st.playerChain.length : 0,
    topo: ['W', 'H', 'goal', 'depth', 'corner', 'cornerStyle', 'cornerBoost', 'margin', 'circle', 'surface', 'def', 'postStyle', 'netStyle', 'shape', 'goalInset', 'scoreDefault', 'wind'].map(k => [k, r(m[k])]).concat([['sizes', JSON.stringify(m.sizes)]])
  }); })"""


async def faixa(pg, rotulo, valor):
    """muda uma faixa (slider) do painel como a pessoa: o input enquanto arrasta e o change ao soltar"""
    return await pg.evaluate("""([s, v]) => { const c = [...document.querySelectorAll('.rc-ed-conteudo .rc-ctl')].find(x => { const l = x.querySelector('label'); return l && l.textContent === s; });
      const el = c && c.querySelector('input[type=range]'); if (!el) return false; el.value = String(v);
      el.dispatchEvent(new Event('input', {bubbles: true})); el.dispatchEvent(new Event('change', {bubbles: true})); return true; }""", [rotulo, valor])


async def toca(pg, x, y):
    p = await pg.evaluate('([x, y]) => RachaoEstadios.paraTela(x, y)', [x, y])
    await pg.mouse.click(p['x'], p['y'])
    await pg.wait_for_timeout(120)


async def arrasta(pg, a, b, passos=6):
    p = await pg.evaluate('([x, y]) => RachaoEstadios.paraTela(x, y)', a)
    q = await pg.evaluate('([x, y]) => RachaoEstadios.paraTela(x, y)', b)
    await pg.mouse.move(p['x'], p['y']); await pg.mouse.down()
    await pg.mouse.move(q['x'], q['y'], steps=passos); await pg.mouse.up()
    await pg.wait_for_timeout(150)


async def aba(pg, nome):
    await pg.click('.rc-ed-abas .tab:text-is("%s")' % nome); await pg.wait_for_timeout(150)


async def ed(pg):
    return await pg.evaluate('RachaoEstadios.editor()')


async def sobra_largura(pg):
    return await pg.evaluate("""(() => { const W = innerWidth; const fora = [...document.querySelectorAll('body *')].filter(e => { if (!e.getClientRects().length) return false;
      const r = e.getBoundingClientRect(); if (r.width === 0) return false; let p = e.parentElement; while (p && p !== document.body) { const o = getComputedStyle(p).overflowX; if (o === 'auto' || o === 'scroll' || o === 'hidden') return false; p = p.parentElement; }
      return r.right > W + 1 || r.left < -1; }).map(e => e.className || e.tagName).slice(0, 5);
      return {doc: document.documentElement.scrollWidth - W, fora}; })()""")


async def principal():
    P = Placar('v97 · o Rachão na Oficina')
    srv, BASE = servidor()
    URL_R = BASE + '/app/public/game/rachao/rachao.html'
    URL_J = BASE + '/tests/build/racha_teste.html'

    # ---------------------------------------------------------------- 1) os arquivos
    orig = (RAIZ / 'backup' / 'rachao.html').read_bytes()
    P.confere(hashlib.sha256(orig).hexdigest() == '2e9ec298cc4b60820f808393aa66b0672727774ce48c12a1f17c57c26027daf9', 'o original do Rachão está guardado como chegou (backup/rachao.html, o sha de 29/10/2026)')
    pag = PAG.read_text(encoding='utf-8')
    antes = hashlib.sha256(PAG.read_bytes()).hexdigest()
    import subprocess, sys
    r = subprocess.run([sys.executable, str(RAIZ / 'tools' / 'v97' / 'rachao.py')], capture_output=True, text=True)
    P.confere(r.returncode == 0 and hashlib.sha256(PAG.read_bytes()).hexdigest() == antes, 'a página do Rachão é a do build (gerar de novo não muda nada)', r.stdout + r.stderr)
    csp = re.search(r'<meta http-equiv="Content-Security-Policy" content="([^"]+)">', pag)
    P.confere(bool(csp) and "connect-src 'none'" in csp.group(1) and "default-src 'self'" in csp.group(1) and "object-src 'none'" in csp.group(1),
              'a página do Rachão tem a trava de conteúdo: só o próprio endereço e nenhuma conexão para fora', csp.group(1) if csp else '')
    P.confere('googleapis' not in pag and 'gstatic' not in pag and 'Bungee' not in pag and "url('../fontes/LilitaOne-Regular." in pag and "url('../fontes/BarlowCondensed-Bold." in pag,
              'as fontes do pacote (Lilita One e Barlow Condensed, OFL) no lugar do Google Fonts')
    P.confere('<link rel="stylesheet" href="./estadios.css">' in pag and '<script src="./ponte.js"></script>\n<script src="./quadro.js"></script>\n<script src="./estadios.js"></script>\n<script src="./rede.js"></script>\n</body>' in pag,
              'a Oficina de estádios entra depois do jogo (estadios.css, a ponte da física, o quadro das salas online, o estadios.js e o rede.js)')
    P.confere(all(s in pag for s in ["const ch = this.map.chutes;", "this.world.bolaPe = { e: this.P.ballFootBounce, peso: this.P.ballWeight }", "if (P.ballMax > 0)", "if (P.andar === 'direto' && !(p.fx.sabao > 0)", "if (m.P.andar === 'direto') {"]),
              'os ganchos de depois do teste: os chutes do estádio, o peso e o quique no pé, o teto da bola e o andar do RACHA (com os bots)')
    P.confere(all(s in pag for s in ['this.map.windDirs ||', 'w.t = this.map.windEvery || 420;', 'const k = 0.03 * (this.map.windForce || 1);', 'this.powerList = Array.isArray(this.map.powers)',
                                       'pick(this.powerList).id', 'p.powerTimer = this.powerEvery;', 'const wa = (w.a || 0) * Math.PI / 180', 'Math.min(this.map.goal * 1.6, this.map.golzaoMax || Infinity)']),
              'os ganchos do motor: a cerca inclinada, o vento do estádio, os poderes do estádio e o Golzão que cabe no estádio')
    jogo = (JOGO / 'racha.html').read_text(encoding='utf-8')
    css = (JOGO / 'oficina.css').read_text(encoding='utf-8')
    P.confere("['rachao', 'rachao', 'Estádios', 'rachao']" in jogo and "['rachao_salas', 'online', 'Salas online', 'rachao']" in jogo and "const RCH_PAGINA = './rachao/rachao.html';" in jogo and '.ofi-rch{' in css and '.ofi-modo{' in css,
              'o RACHA tem o modo RACHÃO na Oficina (as abas Estádios e Salas online, tools/oficina/rachao.js e rachao_sala.js) e o estilo dele')
    P.confere('raiz.RachaPonte = P;' in jogo and 'function misturaRachao(R, aoEscolher)' in jogo and '.ofi-mistura{' in css, 'o RACHA tem a ponte da física colada antes da Oficina e o MISTURAR COM O RACHÃO (mapa e sala)')

    async with async_playwright() as pw:
        # ---------------------------------------------------------------- 2) o Rachão sozinho
        b = await pw.chromium.launch(executable_path=CHROME, args=['--no-sandbox'])
        ctx = await b.new_context(viewport={'width': 1280, 'height': 720}, has_touch=True)
        pg = await ctx.new_page()
        erros, fora = [], []
        pg.on('pageerror', lambda e: erros.append(str(e)[:300]))
        pg.on('console', lambda m: erros.append('console: ' + m.text[:200]) if m.type == 'error' and not REDE_OK.search(m.text) else None)
        pg.on('request', lambda q: fora.append(q.url) if not q.url.startswith(BASE) and not q.url.startswith('data:') else None)
        await pg.goto(URL_R); await pg.wait_for_timeout(900)
        r = await pg.evaluate("""(async () => { await document.fonts.ready; return {lilita: document.fonts.check('40px "Lilita One"'), barlow: document.fonts.check('800 18px "Barlow Condensed"'),
          disp: getComputedStyle(document.querySelector('.logo')).fontFamily, ui: getComputedStyle(document.body).fontFamily}; })()""")
        P.confere(r['lilita'] and r['barlow'] and r['disp'].startswith('"Lilita One"') and r['ui'].startswith('"Barlow Condensed"'), 'as fontes locais carregam (o letreiro na Lilita One, o resto na Barlow Condensed)', r)
        r = await pg.evaluate("""({placa: (() => { const p = document.querySelector('.placa.rc-placa'); return p && p.previousElementSibling && p.previousElementSibling.dataset.mode === 'match' ? p.querySelector('.t').textContent : null; })(),
          volta: !!document.querySelector('.rc-volta'), mapas: MAPS.filter(m => !m.custom).map(m => m.id), api: typeof RachaoEstadios})""")
        P.confere(r['placa'] == 'Oficina de estádios' and not r['volta'] and r['mapas'] == ORIGINAIS and r['api'] == 'object',
                  'a tela inicial ganha a placa OFICINA DE ESTÁDIOS (logo abaixo do Jogar contra bots); sozinho, sem o voltar; os 17 campos continuam', r)
        await pg.screenshot(path=str(SAIDA / 'v97_rachao_inicio.png'))
        # a ida e volta: cada um dos 17 campos → editor → campo dá o MESMO estádio
        r = await pg.evaluate("""(() => { const D = %s, dif = [];
          for (const m of MAPS.filter(x => !x.custom)) { const d = RachaoEstadios.docDeMapa(m), m2 = RachaoEstadios.compila(Object.assign(d, {id: 'u_teste00'}));
            if (D(m) !== D(m2)) dif.push(m.id); }
          const n = id => RachaoEstadios.docDeMapa(MAP_BY_ID[id]).pecas.map(p => p.t + ':' + p.sim).join(',');
          return {dif, rua: n('rua'), fliper: n('fliper'), chuva: n('chuva'), jardim: n('labirinto')}; })()""" % DIGITAL)
        P.confere(r['dif'] == [], 'cada um dos 17 campos, aberto no editor e montado de volta, dá o mesmo estádio (paredes, traves, obstáculos, zonas, física e regras)', r['dif'])
        P.confere(r['rua'] == 'poste:xy' and r['fliper'] == 'bumper:xy,bumper:y' and r['chuva'] == 'poca:xy,poca:x' and r['jardim'] == 'vaso:x,cerca:xy',
                  'as cópias espelhadas viram uma peça com espelho (Rua: 1 poste nos 4 cantos; Fliperama: 4+2 para-choques; Temporal; Jardim)', r)
        # a limpeza: o que entra (do aparelho ou de um código colado) vira um estádio válido, sem nada estranho
        r = await pg.evaluate(r"""(() => { const L = RachaoEstadios.limpa;
          const nulos = [L(null), L([]), L('x'), L(7)].every(v => v === null);
          const a = L({nome: 'a‮b\u0000c   d', desc: 'x'.repeat(500), campo: {formato: 'triangulo', W: 1e9, H: -5, canto: 'oi', circulo: Infinity}, piso: 'lava',
            fisica: {gravity: 99, ballDamp: 'oi', foo: 1, accel: 0.001}, gol: {largura: 9999, trave: '<b>', rede: 'hole'},
            pecas: Array.from({length: 500}, (_, i) => ({t: i % 7 ? 'poste' : 'bomba', x: 99999, y: -99999, r: 999, sim: 'xy'})),
            vento: {on: 'sim', forca: 50, troca: 0, dir: 'tornado'}, poderes: {lista: ['turbo', 'hack', 'turbo'], cada: 999, sempre: 1}, partida: {min: 9, max: 0, padrao: -3, gols: 4}});
          const proto = L(JSON.parse('{"__proto__": {"poluiu": 1}, "campo": {"__proto__": {"W": 9999}}, "fisica": {"__proto__": {"gravity": 3}}}'));
          const vazio = L({poderes: {lista: []}});
          return {nulos, nome: a.nome, desc: a.desc.length, campo: a.campo, piso: a.piso, fisica: a.fisica, gol: [a.gol.largura, a.gol.trave, a.gol.rede], np: a.pecas.length,
            copias: a.pecas.reduce((n, p) => n + RachaoEstadios.copias(p).length, 0), p0: a.pecas[0], vento: a.vento, poderes: a.poderes, partida: a.partida,
            poluiu: ({}).poluiu === undefined && !Object.prototype.hasOwnProperty.call(proto, 'poluiu'), protoW: proto.campo.W, protoG: proto.fisica.gravity, todos: vazio.poderes.lista.length}; })()""")
        P.confere(r['nulos'] and r['nome'] == 'a b c d' and r['desc'] == 90 and r['piso'] == 'grass' and r['campo']['formato'] == 'ret' and r['campo']['W'] == 800 and r['campo']['H'] == 130
                  and r['campo']['canto'] == 30 and r['campo']['circulo'] == 72, 'a limpeza: texto sem controle nem inversão, no tamanho; números no limite; formato e piso desconhecidos viram os de sempre', r)
        P.confere(r['fisica'] == {'gravity': 0.5, 'accel': 0.05} and r['gol'] == [170, 'trave', 'hole'] and r['np'] == 40 and r['copias'] <= 160 and r['p0']['x'] == 800 and r['p0']['y'] == -130 and r['p0']['r'] == 40,
                  'a física só com as chaves conhecidas (no limite); o gol e as traves válidos; as peças desconhecidas saem, as outras no campo e no máximo 160 no campo', r)
        P.confere(r['vento'] == {'on': False, 'forca': 3, 'troca': 2, 'dir': 'livre'} and r['poderes'] == {'lista': ['turbo'], 'cada': 30, 'sempre': False} and r['partida'] == {'min': 7, 'max': 7, 'padrao': 7, 'gols': 0, 'chutes': {'cavadinha': True, 'curva': True, 'super': True}}
                  and r['poluiu'] and r['protoW'] == 430 and r['protoG'] is None and r['todos'] == 10,
                  'o vento, os poderes e a partida só com valores válidos (sem lista: os 10 poderes); o "__proto__" de um código não muda nada', r)
        # o código para compartilhar
        r = await pg.evaluate("""(() => { const R = RachaoEstadios, d = R.docDeMapa(MAP_BY_ID.fliper); d.nome = 'Pinball do Zé ✓'; const c = R.codifica(d), v = R.decodifica(c);
          const mexe = j => 'RACHAO1.' + btoa(unescape(encodeURIComponent(JSON.stringify(j)))).replace(/\\+/g, '-').replace(/\\//g, '_').replace(/=+$/, '');
          const t = R.decodifica(mexe({nome: 'x', campo: {W: 99999}, pecas: [{t: 'poste', x: 0, y: 0, r: 1}]}));
          return {pre: c.slice(0, 8), igual: JSON.stringify(v) === JSON.stringify(Object.assign(R.limpa(d), {id: ''})), lixo: [R.decodifica('lixo'), R.decodifica('RACHAO1.@@@'), R.decodifica('RACHAO1.' + 'A'.repeat(30000)), R.decodifica('RACHAO1.bm9wZQ')],
            espacos: !!R.decodifica(c.slice(0, 20) + '\\n ' + c.slice(20)), t: t && [t.campo.W, t.pecas[0].r, t.id], tam: c.length}; })()""")
        P.confere(r['pre'] == 'RACHAO1.' and r['igual'] and r['lixo'] == [None, None, None, None] and r['espacos'] and r['t'] == [800, 5, ''],
                  'o código (RACHAO1.…) volta igual; lixo, código longo demais e texto que não é estádio dão nada; colado com quebras funciona; um código mexido entra limpo', r)
        await ctx.close()

        # ---------------------------------------------------------------- 3) o editor, no celular deitado
        ctx = await b.new_context(viewport={'width': 844, 'height': 390}, has_touch=True)
        pg = await ctx.new_page()
        pg.on('pageerror', lambda e: erros.append(str(e)[:300]))
        pg.on('console', lambda m: erros.append('console: ' + m.text[:200]) if m.type == 'error' and not REDE_OK.search(m.text) else None)
        await pg.goto(URL_R); await pg.wait_for_timeout(700)
        await pg.click('.placa.rc-placa'); await pg.wait_for_timeout(300)
        r = await pg.evaluate("({tela: !document.getElementById('rc-estadios').hidden, vazio: !!document.querySelector('.rc-vazio'), home: document.getElementById('home').hidden})")
        P.confere(r['tela'] and r['vazio'] and r['home'], 'a placa abre SEUS ESTÁDIOS (vazia, com o convite para criar)', r)
        await pg.screenshot(path=str(SAIDA / 'v97_rachao_lista_vazia.png'))
        await pg.click('.rc-acoes .rc-bt.verde'); await pg.wait_for_timeout(400)
        r = await pg.evaluate("[...document.querySelectorAll('.rc-modelo b')].map(b => b.textContent)")
        P.confere(len(r) == 18 and r[0] == 'Do zero' and r[5] == 'Rua', 'CRIAR ESTÁDIO: do zero ou de um dos 17 campos (com a miniatura de cada um)', r)
        await pg.screenshot(path=str(SAIDA / 'v97_rachao_comecar.png'))
        await pg.click('.rc-modelo:has(b:text-is("Rua"))'); await pg.wait_for_timeout(500)
        e = await ed(pg)
        P.confere(e['aberto'] and e['doc']['nome'] == 'Rua 2' and e['doc']['base'] == 'rua' and e['doc']['gol']['trave'] == 'chinelo' and e['doc']['pecas'] == [{'t': 'poste', 'x': 190, 'y': 156, 'sim': 'xy', 'r': 10}]
                  and len(e['mapa']['statics']) == 4, 'o editor abre com a cópia da Rua (os chinelos, o portão e o poste nos 4 cantos)', e['doc'])
        await pg.screenshot(path=str(SAIDA / 'v97_rachao_editor.png'))
        # pôr: o para-choque com o espelho dos dois lados
        await pg.click('.rc-ferr[data-f="bumper"]')
        await toca(pg, 150, -100)
        e = await ed(pg)
        bum = [s for s in e['mapa']['statics'] if s['style'] == 'bumper']
        P.confere(len(e['doc']['pecas']) == 2 and e['sel'] == 1 and e['aba'] == 'peca' and sorted((s['x'], s['y']) for s in bum) == [(-150, -100), (150, -100)] and bum[0]['boost'] == 8.5,
                  'a ferramenta Para-choque põe onde tocou, com o espelho dos dois lados (2 no campo), e a aba Peça abre', [e['doc']['pecas'], bum])
        # o espelho: só uma
        await pg.click('.rc-ferr-espelho'); await pg.wait_for_timeout(150)
        n_pop = await pg.evaluate("document.querySelectorAll('.rc-pop-it').length")
        await pg.click('.rc-pop-it:has-text("Só uma")'); await pg.wait_for_timeout(150)
        e = await ed(pg)
        P.confere(n_pop == 5 and e['doc']['pecas'][1]['sim'] == 'n' and len([s for s in e['mapa']['statics'] if s['style'] == 'bumper']) == 1 and e['sim'] == 'n',
                  'o ESPELHO (5 escolhas) muda a peça escolhida: "só uma" deixa 1 no campo', e['doc']['pecas'][1])
        # mover e esticar
        await arrasta(pg, (150, -100), (210, -40))
        e = await ed(pg)
        p1 = e['doc']['pecas'][1]
        P.confere((p1['x'], p1['y'], p1['r']) == (210, -40, 20), 'arrastar move a peça (com o ímã, de 10 em 10)', p1)
        sc = e['vista']['sc']
        k = 20 + 12 / sc
        await arrasta(pg, (210 + 0.7071 * k, -40 - 0.7071 * k), (210 + 0.7071 * (k + 14), -40 - 0.7071 * (k + 14)))
        e = await ed(pg)
        P.confere(30 <= e['doc']['pecas'][1]['r'] <= 36, 'a bolinha branca da peça muda o tamanho', e['doc']['pecas'][1])
        # a cerca: pôr e girar pela ponta
        await pg.click('.rc-ferr[data-f="cerca"]')
        await toca(pg, -200, 0)
        await arrasta(pg, (-200 + 32, 0), (-200 + 40, 40))
        e = await ed(pg)
        c = e['doc']['pecas'][-1]
        P.confere(c['t'] == 'cerca' and c['a'] == 45 and 100 <= c['len'] <= 125 and c['sim'] == 'n' and len(e['mapa']['walls']) == 1 and e['mapa']['walls'][0]['a'] == 45,
                  'a cerca viva: a ponta estica e gira (o ímã de 15 em 15°: 45°)', c)
        # apagar, desfazer e refazer
        await pg.click('.rc-ferr[data-f="apagar"]')
        await toca(pg, 210, -40)
        n_apagou = len((await ed(pg))['doc']['pecas'])
        await pg.click('.rc-t-desfaz'); await pg.wait_for_timeout(120)
        n_desfez = len((await ed(pg))['doc']['pecas'])
        await pg.click('.rc-t-refaz'); await pg.wait_for_timeout(120)
        n_refez = len((await ed(pg))['doc']['pecas'])
        await pg.click('.rc-t-desfaz'); await pg.wait_for_timeout(120)
        P.confere((n_apagou, n_desfez, n_refez) == (2, 3, 2), 'APAGAR tira a peça tocada; DESFAZER volta e REFAZER apaga de novo', (n_apagou, n_desfez, n_refez))
        await pg.click('.rc-ferr[data-f="mover"]')
        await pg.screenshot(path=str(SAIDA / 'v97_rachao_pecas.png'))
        # as abas
        await pg.keyboard.press('Escape')
        await aba(pg, 'Campo')
        await pg.click('.rc-seg button:text-is("Oval")'); await pg.wait_for_timeout(150)
        await faixa(pg, 'Comprimento', 300); await pg.wait_for_timeout(150)
        e = await ed(pg)
        P.confere(e['mapa'].get('shape') == 'oval' and e['doc']['campo']['W'] == 300 and all(abs(p['x']) <= 300 for p in e['doc']['pecas']),
                  'Campo: o formato Oval e o comprimento (as peças voltam para dentro do campo menor)', [e['doc']['campo'], [p['x'] for p in e['doc']['pecas']]])
        await pg.click('.rc-seg button:text-is("Retângulo")'); await pg.wait_for_timeout(100)
        await faixa(pg, 'Comprimento', 460); await pg.wait_for_timeout(100)
        await aba(pg, 'Piso')
        await pg.click('.rc-piso:has(b:text-is("Gelo"))'); await pg.wait_for_timeout(150)
        n_pisos = await pg.evaluate("document.querySelectorAll('.rc-piso img').length")
        await aba(pg, 'Física')
        await pg.click('.rc-chip:text-is("Lua")'); await pg.wait_for_timeout(150)
        e = await ed(pg)
        P.confere(n_pisos == 17 and e['mapa']['surface'] == 'ice' and e['doc']['fisica'].get('gravity') == 0.085 and e['mapa']['phys'].get('gravity') == 0.085,
                  'Piso: as 17 amostras desenhadas pelo motor (Gelo); Física: as prontas (Lua: gravidade 0,085)', [e['mapa']['surface'], e['doc']['fisica']])
        await faixa(pg, 'Força do chute', 7.2); await pg.wait_for_timeout(120)
        z = await pg.evaluate("(() => { const c = [...document.querySelectorAll('.rc-ed-conteudo .rc-ctl')].find(x => x.querySelector('label').textContent === 'Força do chute'); return {val: c.querySelector('.rc-val').textContent, zera: !c.querySelector('.rc-zera').hidden}; })()")
        await pg.click('.rc-ed-conteudo .rc-ctl:has(label:text-is("Força do chute")) .rc-zera'); await pg.wait_for_timeout(120)
        e = await ed(pg)
        P.confere(z == {'val': '7.20', 'zera': True} and 'kickForce' not in e['doc']['fisica'], 'Física: cada valor na sua faixa, com o "padrão" que volta o do Clássico', [z, e['doc']['fisica']])
        await aba(pg, 'Vento')
        await pg.click('.rc-chave:has-text("Vento no estádio")'); await pg.wait_for_timeout(150)
        await pg.click('.rc-seg button:text-is("De gol a gol")'); await pg.wait_for_timeout(120)
        await faixa(pg, 'Muda a cada', 5); await pg.wait_for_timeout(120)
        e = await ed(pg)
        P.confere(e['mapa'].get('wind') is True and e['mapa'].get('windDirs') == [[1, 0], [-1, 0]] and e['mapa'].get('windEvery') == 300 and e['mapa'].get('windForce') == 1,
                  'Vento: ligado, de gol a gol, mudando a cada 5 s', {k: e['mapa'].get(k) for k in ('wind', 'windDirs', 'windEvery', 'windForce')})
        await aba(pg, 'Poderes')
        for nome in ['Canhão', 'Gigante', 'Nanico', 'Muralha', 'Ventania', 'Multibola', 'Golzão', 'Sabão', 'Congelou']:
            await pg.click('.rc-poder:has(b:text-is("%s"))' % nome); await pg.wait_for_timeout(60)
        await pg.click('.rc-poder:has(b:text-is("Turbo"))'); await pg.wait_for_timeout(100)
        aviso = await pg.evaluate("document.getElementById('rc-aviso') && document.getElementById('rc-aviso').textContent")
        await pg.click('.rc-poder:has(b:text-is("Multibola"))'); await pg.wait_for_timeout(80)
        await faixa(pg, 'Um poder novo a cada', 4); await pg.wait_for_timeout(100)
        await pg.click('.rc-chave:has-text("Poderes também no Contra bots")'); await pg.wait_for_timeout(150)
        e = await ed(pg)
        P.confere(e['mapa'].get('powers') == ['turbo', 'multibola'] and e['mapa'].get('powerEvery') == 240 and e['mapa'].get('powersAlways') is True and aviso == 'Pelo menos um poder fica ligado.',
                  'Poderes: quais aparecem (pelo menos um fica), de quanto em quanto tempo e "também no Contra bots"', [e['mapa'].get('powers'), e['mapa'].get('powerEvery'), aviso])
        await aba(pg, 'Partida')
        await pg.fill('.rc-ed-conteudo input.rc-in', 'Ventania <b>do Zé</b>'); await pg.wait_for_timeout(80)
        await pg.click('.rc-ctl:has(label:text-is("Melhor a partir de")) button:text-is("2x2")'); await pg.wait_for_timeout(80)
        await pg.click('.rc-ctl:has(label:text-is("Até")) button:text-is("5x5")'); await pg.wait_for_timeout(80)
        await pg.click('.rc-ctl:has(label:text-is("Tamanho que já vem marcado")) button:text-is("3x3")'); await pg.wait_for_timeout(80)
        await pg.click('.rc-ctl:has(label:text-is("Gols para vencer (ao escolher o estádio)")) button:text-is("3")'); await pg.wait_for_timeout(900)
        e = await ed(pg)
        topo = await pg.evaluate("document.querySelector('.rc-ed-nome').value")
        P.confere(e['doc']['nome'] == 'Ventania <b>do Zé</b>' and topo == e['doc']['nome'] and e['mapa']['sizes'] == [2, 5] and e['mapa']['def'] == 3 and e['mapa'].get('scoreDefault') == 3,
                  'Partida: o nome (o de cima acompanha), os times (2x2 a 5x5, marcado 3x3) e os gols ao escolher o estádio (3)', [e['doc']['nome'], e['mapa']['sizes'], e['mapa']['def']])
        await pg.screenshot(path=str(SAIDA / 'v97_rachao_partida.png'))
        guardado = await pg.evaluate("(() => { const o = JSON.parse(localStorage.getItem('rachao.estadios')); const r = o.lista[0]; return {v: o.v, n: o.lista.length, nome: r.doc.nome, piso: r.doc.piso, vento: r.doc.vento.on, thumb: /^data:image\\/jpeg;base64,/.test(r.thumb), tam: r.thumb.length, estado: document.querySelector('.rc-ed-estado').textContent}; })()")
        P.confere(guardado['v'] == 1 and guardado['n'] == 1 and guardado['nome'] == 'Ventania <b>do Zé</b>' and guardado['piso'] == 'ice' and guardado['vento'] and guardado['thumb'] and guardado['tam'] < 60000 and guardado['estado'] == 'Salvo',
                  'o salvamento automático: o estádio e a miniatura (JPEG pequeno) no aparelho, e o "Salvo" na barra', guardado)
        id_ = e['id']
        # TESTAR: o bate-bola e a partida rápida (com os poderes do estádio)
        await pg.click('.rc-t-testar'); await pg.wait_for_timeout(200)
        await pg.click('.rc-item:has-text("Bate-bola sozinho")'); await pg.wait_for_timeout(1200)
        r = await pg.evaluate("({jogo: !document.getElementById('game').hidden, modo: App.scene.m.mode, mapa: App.scene.m.map.id, vento: App.scene.m.map.wind, sair: document.getElementById('btnQuit').textContent})")
        await pg.screenshot(path=str(SAIDA / 'v97_rachao_testar.png'))
        await pg.evaluate("App.togglePause(true)"); await pg.wait_for_timeout(150)
        await pg.click('#btnQuit'); await pg.wait_for_timeout(400)
        e2 = await ed(pg)
        P.confere(r == {'jogo': True, 'modo': 'free', 'mapa': id_, 'vento': True, 'sair': 'Voltar ao editor'} and e2['aberto'] and e2['doc'] == e['doc'],
                  'TESTAR › Bate-bola: a partida no estádio; na pausa, VOLTAR AO EDITOR volta para o editor com tudo como estava', r)
        await pg.click('.rc-t-testar'); await pg.wait_for_timeout(200)
        await pg.click('.rc-item:has-text("1x1 contra o bot")'); await pg.wait_for_timeout(5200)
        r = await pg.evaluate("({modo: App.scene.m.mode, n: App.scene.m.players.length, poderes: App.scene.m.powerList.map(p => p.id), cada: App.scene.m.powerEvery, tem: App.scene.m.players.some(p => p.power), botao: document.getElementById('touch').dataset.power})")
        P.confere(r['modo'] == 'chaos' and r['n'] == 2 and r['poderes'] == ['turbo', 'multibola'] and r['cada'] == 240 and r['tem'] and r['botao'] == '1',
                  'TESTAR › 1x1: com "também no Contra bots", a partida tem os poderes do estádio (só Turbo e Multibola, a cada 4 s) e o botão do raio', r)
        await pg.evaluate("App.quit()"); await pg.wait_for_timeout(300)
        # JOGAR: em qual modo (Contra bots, 2 jogadores ou Caos) — a preparação abre já com o estádio
        await pg.click('.rc-t-jogar'); await pg.wait_for_timeout(250)
        modos = await pg.evaluate("[...document.querySelectorAll('.rc-folha .rc-item')].map(b => b.dataset.modo)")
        await pg.click('.rc-folha .rc-item[data-modo="match"]'); await pg.wait_for_timeout(500)
        r = await pg.evaluate("({tela: !document.getElementById('setup').hidden, mapa: App.sel.match.map, on: document.querySelector('.mapCard.on').dataset.map, selo: !!document.querySelector('.mapCard.on .rc-selo'), primeiro: document.querySelector('.mapCard').dataset.map, tam: App.sel.match.size, gols: App.sel.match.goals, criar: !!document.querySelector('.maps .rc-criar')})")
        P.confere(modos == ['match', 'duo', 'chaos'] and r['tela'] and r['mapa'] == id_ and r['on'] == id_ and r['selo'] and r['primeiro'] == id_ and 2 <= r['tam'] <= 5 and r['gols'] == 3 and r['criar'],
                  'JOGAR pergunta o modo (Contra bots, 2 jogadores, Caos) e abre a preparação com o estádio marcado (o primeiro, com o selo SEU), o tamanho dentro do dele e até 3 gols; no fim da lista, CRIAR O SEU', [modos, r])
        await pg.screenshot(path=str(SAIDA / 'v97_rachao_jogar.png'))
        await pg.click('#btnStart'); await pg.wait_for_timeout(900)
        r = await pg.evaluate("({modo: App.scene.m.mode, mapa: App.scene.m.map.id, n: App.scene.m.players.length})")
        await pg.evaluate("App.quit()"); await pg.wait_for_timeout(300)
        e2 = await ed(pg)
        P.confere(r['modo'] == 'chaos' and r['mapa'] == id_ and r['n'] >= 4 and e2['aberto'], 'COMEÇAR: a partida no estádio (Caos, porque ele pede poderes em toda partida); sair volta ao editor', r)
        await pg.click('.rc-t-jogar'); await pg.wait_for_timeout(250)
        await pg.click('.rc-folha .rc-item[data-modo="duo"]'); await pg.wait_for_timeout(400)
        r = await pg.evaluate("({tela: !document.getElementById('setup').hidden, tit: document.getElementById('setupTitle').textContent, mapa: App.sel.duo.map, on: document.querySelector('.mapCard.on').dataset.map})")
        await pg.click('#btnStart'); await pg.wait_for_timeout(900)
        r2 = await pg.evaluate("({mapa: App.scene.m.map.id, humanos: App.scene.m.players.filter(p => p.human).map(p => p.human), dual: App.scene.dual})")
        await pg.evaluate("App.quit()"); await pg.wait_for_timeout(300)
        P.confere(r == {'tela': True, 'tit': '2 jogadores', 'mapa': id_, 'on': id_} and r2 == {'mapa': id_, 'humanos': ['p1', 'p2'], 'dual': True} and (await ed(pg))['aberto'],
                  'JOGAR › 2 jogadores: vermelho contra azul no mesmo aparelho, no estádio; sair volta ao editor', [r, r2])
        # recarregar: o estádio continua (na frente dos 17)
        await pg.reload(); await pg.wait_for_timeout(800)
        r = await pg.evaluate("({lista: RachaoEstadios.lista().map(x => x.nome), primeiro: MAPS[0].id, custom: MAPS[0].custom, total: MAPS.length})")
        P.confere(r['lista'] == ['Ventania <b>do Zé</b>'] and r['primeiro'] == id_ and r['custom'] and r['total'] == 18, 'depois de recarregar a página, o estádio continua e entra na frente dos 17 campos', r)
        await pg.click('.placa.rc-placa'); await pg.wait_for_timeout(300)
        r = await pg.evaluate("(() => { const c = document.querySelector('.rc-cartao'); return {nome: c.querySelector('.mn').textContent, html: c.querySelector('.mn').children.length, md: c.querySelector('.md').textContent}; })()")
        P.confere(r['nome'] == 'Ventania <b>do Zé</b>' and r['html'] == 0, 'o nome entra na tela só como texto (o "<b>" aparece escrito, não vira negrito)', r)
        await pg.screenshot(path=str(SAIDA / 'v97_rachao_lista.png'))
        # copiar o código e colar de novo (vira outro estádio, igual)
        await pg.click('.rc-cartao .rc-bt.ic'); await pg.wait_for_timeout(200)
        await pg.click('.rc-item:has-text("Copiar código")'); await pg.wait_for_timeout(200)
        cod = await pg.evaluate("document.querySelector('.rc-folha .rc-codigo').value")
        await pg.click('.rc-folha .rc-bt:has-text("Fechar")'); await pg.wait_for_timeout(150)
        await pg.click('.rc-acoes .rc-bt:has-text("Colar código")'); await pg.wait_for_timeout(200)
        await pg.fill('.rc-folha .rc-codigo', 'RACHAO1.nao-e-um-estadio'); await pg.click('.rc-folha .rc-bt.verde'); await pg.wait_for_timeout(150)
        err = await pg.evaluate("(() => { const e = document.querySelector('.rc-folha .rc-erro'); return e && !e.hidden ? e.textContent : ''; })()")
        await pg.fill('.rc-folha .rc-codigo', cod); await pg.click('.rc-folha .rc-bt.verde'); await pg.wait_for_timeout(500)
        e3 = await ed(pg)
        orig_doc = await pg.evaluate("id => RachaoEstadios.doc(id)", id_)
        igual = {k: v for k, v in e3['doc'].items() if k not in ('id', 'nome')} == {k: v for k, v in orig_doc.items() if k not in ('id', 'nome')}
        P.confere(cod.startswith('RACHAO1.') and 'não é de um estádio' in err and e3['aberto'] and e3['id'] != id_ and igual and e3['doc']['nome'] == 'Ventania <b>do Zé</b> 2',
                  'COPIAR CÓDIGO e COLAR CÓDIGO: o código errado avisa; o certo vira um estádio novo igual (o nome ganha o 2)', [err, e3['doc']['nome']])
        # apagar (o Contra bots que estava nele volta para o Clássico)
        await pg.click('.rc-t-mais'); await pg.wait_for_timeout(150)
        await pg.click('.rc-item:has-text("Apagar")'); await pg.wait_for_timeout(150)
        await pg.click('.rc-folha .rc-bt.verm'); await pg.wait_for_timeout(300)
        await pg.evaluate("id => { App.sel.match.map = id; }", e3['id'])
        await pg.evaluate("App.openSetup('match')"); await pg.wait_for_timeout(300)
        r = await pg.evaluate("({n: RachaoEstadios.lista().length, sel: App.sel.match.map, on: document.querySelector('.mapCard.on').dataset.map})")
        P.confere(r == {'n': 1, 'sel': 'classico', 'on': 'classico'}, 'APAGAR tira o estádio; quem estava com ele marcado volta para o Clássico (nada quebra)', r)
        # o limite de 40
        r = await pg.evaluate("(() => { const ids = []; for (let i = 0; i < 45; i++) ids.push(RachaoEstadios.cria(RachaoEstadios.docNovo())); return {criados: ids.filter(Boolean).length, depois: ids.slice(-3), total: RachaoEstadios.lista().length}; })()")
        P.confere(r['criados'] == 39 and r['depois'] == [None, None, None] and r['total'] == 40, 'até 40 estádios no aparelho (o 41º avisa e não entra)', r)
        await ctx.close()

        # ---------------------------------------------------------------- 3b) os limites que protegem o jogo (a revisão do código)
        ctx = await b.new_context(viewport={'width': 1100, 'height': 620}, has_touch=True)
        pg = await ctx.new_page()
        pg.on('pageerror', lambda e: erros.append(str(e)[:300]))
        pg.on('console', lambda m: erros.append('console: ' + m.text[:200]) if m.type == 'error' and not REDE_OK.search(m.text) else None)
        await pg.goto(URL_R); await pg.wait_for_timeout(600)
        # mover uma peça espelhada para fora da linha do meio não passa do limite de 160 no campo
        id_l = await pg.evaluate("""(() => { const d = RachaoEstadios.docNovo(); d.campo.W = 700; d.campo.H = 340;
          for (let i = 0; i < 39; i++) d.pecas.push({t: 'poste', x: 60 + (i % 13) * 40, y: 40 + Math.floor(i / 13) * 80, r: 6, sim: 'xy'});
          d.pecas.push({t: 'poste', x: 0, y: 0, r: 6, sim: 'xy'}, {t: 'poste', x: 0, y: 0, r: 6, sim: 'xy'}); return RachaoEstadios.cria(d); })()""")
        await pg.evaluate("id => RachaoEstadios.abreEditor(id)", id_l); await pg.wait_for_timeout(400)
        e = await ed(pg)
        n0 = await pg.evaluate("d => d.pecas.reduce((s, p) => s + RachaoEstadios.copias(p).length, 0)", e['doc'])
        await arrasta(pg, (0, 0), (200, 150))
        e = await ed(pg)
        aviso = await pg.evaluate("document.getElementById('rc-aviso') ? document.getElementById('rc-aviso').textContent : ''")
        P.confere(len(e['doc']['pecas']) == 41 and n0 == 158 and e['doc']['pecas'][-1]['x'] == 0 and e['doc']['pecas'][-1]['y'] == 0 and 'Peças demais' in aviso,
                  'mover uma peça espelhada para fora da linha do meio não passa de 160 peças no campo (ela fica e o aviso explica)', [n0, e['doc']['pecas'][-1], aviso])
        # o campo encolheu: o desenho acompanha na hora (e as peças voltam para dentro)
        await aba(pg, 'Campo')
        await faixa(pg, 'Comprimento', 240); await pg.wait_for_timeout(200)
        e = await ed(pg)
        P.confere(all(abs(s_['x']) <= 240 for s_ in e['mapa']['statics'] if s_['style'] == 'poste') and e['mapa']['W'] == 240,
                  'o campo encolheu: as peças voltam para dentro e o campo desenhado já é o novo', max(abs(s_['x']) for s_ in e['mapa']['statics']))
        # as janelas: trocar de tela com uma aberta não deixa o Esc preso
        await pg.evaluate("RachaoEstadios.rota('importar')"); await pg.wait_for_timeout(200)
        await pg.evaluate("RachaoEstadios.rota('estadios')"); await pg.wait_for_timeout(200)
        r = await pg.evaluate("""(() => { const ev = new KeyboardEvent('keydown', {key: 'Escape', bubbles: true, cancelable: true}); document.body.dispatchEvent(ev);
          return {preso: ev.defaultPrevented, folhas: document.querySelectorAll('.rc-fundo').length}; })()""")
        P.confere(r == {'preso': False, 'folhas': 0}, 'trocar de tela com uma janela aberta fecha a janela de verdade (o Esc não fica preso)', r)
        # o círculo do meio não passa da linha do gol; o Golzão cabe; a parede não faz a bola ganhar velocidade
        r = await pg.evaluate("""(() => { const R = RachaoEstadios, d = R.docNovo(); d.id = 'u_teste09'; d.campo.formato = 'rinque'; d.campo.W = 240; d.campo.circulo = 150; d.gol.recuo = 300;
          const m = R.compila(R.limpa(d)), st = buildStadium(m), P = st.phys;
          const g = R.docNovo(); g.id = 'u_teste10'; g.gol.largura = 170; g.poderes.lista = ['golzao']; const mg = R.compila(R.limpa(g));
          const T = new TopMatch({mode: 'chaos', map: mg, teams: [1, 1], humans: []}); const p = T.players[0]; p.power = 'golzao'; T.usePower(p);
          const f = R.limpa({fisica: {ballBounce: 0.95, wallBounce: 1.5}}).fisica;
          return {gx: st.gx[1], circ: m.circle, fora: m.circle + P.playerR + 6, gol: mg.goal, golzao: Math.max(...T.goalHalf), max: mg.golzaoMax, H: mg.H, canto: mg.corner, quique: +(f.ballBounce * f.wallBounce).toFixed(3)}; })()""")
        P.confere(r['fora'] + 15 < r['gx'] and r['golzao'] <= r['max'] and r['golzao'] + r['canto'] < r['H'] and r['quique'] <= 1,
                  'os limites: o círculo do meio não passa da linha do gol (rinque estreito), o Golzão cabe no estádio e a parede não faz a bola ganhar velocidade', r)
        # duas abas: guardar aqui não apaga o que a outra aba criou; o apagado aqui não volta
        r = await pg.evaluate("""(() => { const R = RachaoEstadios, o = JSON.parse(localStorage.getItem('rachao.estadios'));
          const outro = {id: 'u_outraaba01', criado: Date.now(), editado: Date.now() + 5000, thumb: '', doc: Object.assign(R.docNovo(), {id: 'u_outraaba01', nome: 'Da outra aba'})};
          o.lista.push(outro); localStorage.setItem('rachao.estadios', JSON.stringify(o));
          const novo = R.cria(R.docNovo()); const depois = JSON.parse(localStorage.getItem('rachao.estadios')).lista.map(x => x.id);
          return {outro: depois.includes('u_outraaba01'), novo: depois.includes(novo), lista: R.lista().some(x => x.id === 'u_outraaba01')}; })()""")
        P.confere(r == {'outro': True, 'novo': True, 'lista': True}, 'duas abas abertas: guardar aqui junta com o que a outra guardou (nada some)', r)
        await ctx.close()

        # ---------------------------------------------------------------- 3c) depois do teste: os chutes do estádio e a mistura com o RACHA
        ctx = await b.new_context(viewport={'width': 1100, 'height': 700}, has_touch=True)
        pg = await ctx.new_page()
        pg.on('pageerror', lambda e: erros.append(str(e)[:300]))
        pg.on('console', lambda m: erros.append('console: ' + m.text[:200]) if m.type == 'error' and not REDE_OK.search(m.text) else None)
        await pg.goto(URL_R); await pg.wait_for_timeout(600)
        id_c = await pg.evaluate("RachaoEstadios.cria(RachaoEstadios.docNovo())")   # (sem descrição escrita: o cartão usa a automática)
        await pg.evaluate("id => RachaoEstadios.abreEditor(id)", id_c); await pg.wait_for_timeout(300)
        await aba(pg, 'Chutes')
        r = await pg.evaluate("""(() => ({abas: [...document.querySelectorAll('.rc-ed-abas .tab')].map(t => t.textContent), tit: (document.querySelector('.rc-ed-conteudo .rc-grupo h3') || {}).textContent,
          chaves: [...document.querySelectorAll('.rc-ed-conteudo .rc-chave')].map(c => [c.textContent, c.getAttribute('aria-checked')]), ch: RachaoEstadios.editor().doc.partida.chutes}))()""")
        P.confere(r['abas'][:5] == ['Campo', 'Gols', 'Piso', 'Física', 'Chutes'] and r['tit'] == 'Chutes da partida' and [c[1] for c in r['chaves']] == ['true', 'true', 'true'] and r['ch'] == {'cavadinha': True, 'curva': True, 'super': True},
                  'a aba CHUTES do editor (depois da Física): a cavadinha, a curva e o super chute, os três ligados num estádio novo', r)
        await pg.click('.rc-ed-conteudo .rc-chave:has-text("Cavadinha")'); await pg.wait_for_timeout(150)
        e = await ed(pg)
        P.confere(e['doc']['partida']['chutes'] == {'cavadinha': False, 'curva': True, 'super': True} and e['mapa']['chutes'] == {'lob': False, 'curve': True, 'superKick': True},
                  'desligar a cavadinha: o estádio sai sem ela (só ela)', [e['doc']['partida']['chutes'], e['mapa'].get('chutes')])
        await pg.click('.rc-ed-conteudo .rc-seg button:text-is("Só o Chutar")'); await pg.wait_for_timeout(150)
        e = await ed(pg)
        r = await pg.evaluate("[...document.querySelectorAll('.rc-ed-conteudo .rc-chave')].map(c => c.getAttribute('aria-checked'))")
        P.confere(e['doc']['partida']['chutes'] == {'cavadinha': False, 'curva': False, 'super': False} and e['mapa']['chutes'] == {'lob': False, 'curve': False, 'superKick': False} and r == ['false', 'false', 'false']
                  and 'só o Chutar' in (await pg.evaluate("RachaoEstadios.editor().mapa.desc")),
                  'SÓ O CHUTAR (o modo sem cavadinha, sem curva e sem super chute): os três desligam de uma vez e a descrição conta', e['mapa'].get('chutes'))
        await pg.screenshot(path=str(SAIDA / 'v97_rachao_chutes.png'))
        await pg.click('.rc-t-testar'); await pg.wait_for_timeout(300)
        await pg.click('.rc-folha .rc-item:has-text("1x1")'); await pg.wait_for_timeout(1500)
        r = await pg.evaluate("""(() => { const m = App.scene && App.scene.m, t = document.getElementById('touch').dataset; return {jogo: !document.getElementById('game').hidden, lob: m && m.allowLob, curva: m && m.allowCurve, sup: m && m.allowSuper, hud: [t.lob, t.curve, t.super]}; })()""")
        P.confere(r == {'jogo': True, 'lob': False, 'curva': False, 'sup': False, 'hud': ['0', '0', '0']}, 'TESTAR 1x1 no estádio só com o Chutar: a partida não tem cavadinha, curva nem super (os botões somem)', r)
        await pg.evaluate("App.togglePause(true)"); await pg.wait_for_timeout(200)
        await pg.click('#btnQuit'); await pg.wait_for_timeout(500)
        await pg.click('.rc-t-jogar'); await pg.wait_for_timeout(300)
        await pg.click('.rc-folha .rc-item[data-modo="match"]'); await pg.wait_for_timeout(600)
        r = await pg.evaluate("""(() => { const o = [...document.querySelectorAll('#setup .opt')].find(x => /Chutes extras/.test(x.textContent)); return o ? {bts: [...o.querySelectorAll('.seg button')].map(b => b.disabled), nota: (o.querySelector('.note') || {}).textContent,
          selo: [...document.querySelectorAll('.mapCard.rc-seu .rc-selo-chute')].map(x => x.textContent)} : null; })()""")
        P.confere(r and r['bts'] == [True, True, True] and 'só o Chutar' in r['nota'] and 'Só o Chutar' in r['selo'],
                  'JOGAR › Contra bots: a preparação trava os três chutes extras e explica; o cartão do estádio diz SÓ O CHUTAR', r)
        await pg.screenshot(path=str(SAIDA / 'v97_rachao_preparacao_chutes.png'))
        await pg.click('#btnBack'); await pg.wait_for_timeout(500)
        r = await pg.evaluate("""(() => { const trava = () => { const o = [...document.querySelectorAll('#setup .opt')].find(x => /Chutes extras/.test(x.textContent)); return o ? [...o.querySelectorAll('.seg button')].map(b => b.disabled) : null; };
          App.sel.train.map = RachaoEstadios.editor().id; App.sel.train.kind = 'free'; App.openSetup('train'); const livre = trava();
          App.sel.train.kind = 'shoot'; App.renderSetup(); const fin = trava(); App.sel.train.kind = 'keep'; App.renderSetup(); const gol = trava();
          return { livre, fin, gol }; })()""")
        P.confere(r == {'livre': [True, True, True], 'fin': [False, False, False], 'gol': [False, False, False]}, 'no Treino a trava vale só no Livre (a finalização e o goleiro são no Clássico, com os chutes que a pessoa escolher)', r)
        await pg.evaluate("id => { App.showHome(); RachaoEstadios.abreEditor(id); }", id_c); await pg.wait_for_timeout(400)
        # a Física: misturar com o RACHA
        await aba(pg, 'Física')
        r = await pg.evaluate("""(() => ({linhas: [...document.querySelectorAll('.rc-mistura-l')].map(l => [l.querySelector('b').textContent, (l.querySelector('button.on') || {}).textContent || '', l.querySelector('small').textContent])}))()""")
        P.confere([l[:2] for l in r['linhas']] == [['Bola', 'Rachão'], ['Jogador', 'Rachão'], ['Chute', 'Rachão']], 'a aba FÍSICA tem o MISTURAR COM O RACHA: bola, jogador e chute, os três do Rachão no Clássico', r)
        await pg.click('.rc-mistura button[data-parte="bola"][data-jogo="racha"]'); await pg.wait_for_timeout(200)
        e = await ed(pg); F = e['doc']['fisica']
        r = await pg.evaluate("[...document.querySelectorAll('.rc-mistura-l')].map(l => (l.querySelector('button.on') || {}).textContent || '')")
        P.confere(F.get('ballR') == 7.5 and F.get('ballWeight') == 8 and F.get('ballFootBounce') == 0 and abs(F.get('ballMax', 0) - 5.84) < 0.01 and F.get('ballBounce') == 0.65 and r == ['RACHA', 'Rachão', 'Rachão']
                  and 'kickForce' not in F and e['mapa']['phys'].get('ballWeight') == 8,
                  'a BOLA do RACHA: metade do jogador, pesa 8 no contato, gruda no pé, quica 65% e tem teto — o jogador e o chute continuam os do Rachão', [F, r])
        await faixa(pg, 'Rolar no chão', 0.98); await pg.wait_for_timeout(150)
        r1 = await pg.evaluate("[...document.querySelectorAll('.rc-mistura-l')].map(l => [(l.querySelector('button.on') || {}).textContent || '', l.querySelector('small').textContent])")
        await pg.click('.rc-mistura button[data-parte="bola"][data-jogo="racha"]'); await pg.wait_for_timeout(200)
        e = await ed(pg)
        r2 = await pg.evaluate("[...document.querySelectorAll('.rc-mistura-l')].map(l => (l.querySelector('button.on') || {}).textContent || '')")
        P.confere(r1[0] == ['', 'Ajustada nos números.'] and r1[1][0] == 'Rachão' and e['doc']['fisica'].get('ballDamp') is None and r2 == ['RACHA', 'Rachão', 'Rachão'],
                  'mexeu num número da bola (rolar no chão): o cartão diz «ajustada» na hora, e o RACHA de novo refaz a bola do RACHA', [r1, r2, e['doc']['fisica'].get('ballDamp')])
        await pg.click('.rc-mistura button[data-parte="jogador"][data-jogo="racha"]'); await pg.wait_for_timeout(200)
        e = await ed(pg); F = e['doc']['fisica']
        r = await pg.evaluate("""(() => ({andar: [...document.querySelectorAll('.rc-ed-conteudo .rc-seg button.on')].map(b => b.textContent), rot: [...document.querySelectorAll('.rc-ed-conteudo .rc-ctl label')].map(l => l.textContent)}))()""")
        P.confere(F.get('andar') == 'direto' and abs(F.get('moveMax', 0) - 1.76) < 0.011 and F.get('sprint') == 1 and 'Direto (o do RACHA)' in r['andar'] and 'Freio ao soltar' in r['rot'] and 'Deslizar' not in r['rot'] and F.get('ballFootBounce') == 0,
                  'o JOGADOR do RACHA: o jeito de andar vira Direto (arranca e para na hora, sem corrida) e a bola continua a do RACHA', [F, r['andar']])
        await pg.click('.rc-ed-conteudo .rc-seg button:text-is("Com embalo (o do Rachão)")'); await pg.wait_for_timeout(200)
        e = await ed(pg); F = e['doc']['fisica']
        P.confere('andar' not in F and 'moveMax' not in F, 'o JEITO DE ANDAR de volta para "com embalo": os números do andar direto saem do estádio', F)
        await pg.click('.rc-mistura button[data-parte="jogador"][data-jogo="racha"]'); await pg.wait_for_timeout(150)
        await pg.click('.rc-mistura button[data-parte="chute"][data-jogo="racha"]'); await pg.wait_for_timeout(200)
        e = await ed(pg)
        r = await pg.evaluate("[...document.querySelectorAll('.rc-mistura-l')].map(l => (l.querySelector('button.on') || {}).textContent || '')")
        # (v103: o CHUTE do RACHA 340 → 360: no motor do Rachão o chute do RACHA é o kickForce 4,5 — era 4,25)
        P.confere(r == ['RACHA', 'RACHA', 'RACHA'] and e['doc']['fisica'].get('kickForce') == 4.5 and e['doc']['fisica'].get('kickAccel') == 1 and 'bola, o jogador e o chute do RACHA' in e['mapa']['desc'],
                  'tudo do RACHA (bola, jogador e chute): os três reconhecidos e a descrição do estádio conta', [r, e['mapa']['desc']])
        await pg.screenshot(path=str(SAIDA / 'v97_rachao_mistura.png'))
        await pg.click('.rc-t-testar'); await pg.wait_for_timeout(300)
        await pg.click('.rc-folha .rc-item:has-text("Bate-bola")'); await pg.wait_for_timeout(1200)
        r = await pg.evaluate("(() => { const P = App.scene.m.P; return {andar: P.andar, teto: P.ballMax, peso: P.ballWeight, pe: App.scene.m.world.bolaPe}; })()")
        P.confere(r['andar'] == 'direto' and abs(r['teto'] - 5.84) < 0.01 and r['peso'] == 8 and r['pe'] == {'e': 0, 'peso': 8}, 'TESTAR com a física do RACHA: a partida roda com o andar direto, o teto da bola e o peso e o quique no pé', r)
        await pg.evaluate("App.togglePause(true)"); await pg.wait_for_timeout(150)
        await pg.click('#btnQuit'); await pg.wait_for_timeout(400)
        await ctx.close()

        # ---------------------------------------------------------------- 5) as telas no celular (deitado e em pé)
        for (w, h_) in ((844, 390), (390, 844)):
            ctx = await b.new_context(viewport={'width': w, 'height': h_}, has_touch=True)
            pg = await ctx.new_page()
            pg.on('pageerror', lambda e: erros.append(str(e)[:300]))
            await pg.goto(URL_R); await pg.wait_for_timeout(600)
            await pg.evaluate("RachaoEstadios.abreEditor(RachaoEstadios.cria(RachaoEstadios.docDeMapa(MAP_BY_ID.fliper)))"); await pg.wait_for_timeout(500)
            r = await sobra_largura(pg)
            v = await pg.evaluate("""(() => { const vis = s => { const e = document.querySelector(s); if (!e) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1 && r.left >= -1; };
              const cv = document.querySelector('.rc-ed-cv').getBoundingClientRect();
              return {cv: [Math.round(cv.width), Math.round(cv.height)], nome: vis('.rc-ed-nome'), jogar: vis('.rc-t-jogar'), testar: vis('.rc-t-testar'), mais: vis('.rc-t-mais'), desfaz: vis('.rc-t-desfaz'),
                ferr: [...document.querySelectorAll('.rc-ferr')].every(b => { const r = b.getBoundingClientRect(); return r.right <= innerWidth + 1 && r.width >= 38 && r.height >= 38; }),
                abas: [...document.querySelectorAll('.rc-ed-abas .tab')].every(t => t.getBoundingClientRect().right <= innerWidth + 1)}; })()""")
            await pg.screenshot(path=str(SAIDA / ('v97_rachao_editor_%dx%d.png' % (w, h_))))
            P.confere(r['doc'] <= 0 and not r['fora'] and v['cv'][0] >= 200 and v['cv'][1] >= 160 and all(v[k] for k in ('nome', 'jogar', 'testar', 'mais', 'desfaz', 'ferr', 'abas')),
                      'o editor em %dx%d: nada passa da largura; o campo (%dx%d), a barra, as ferramentas (toque de 38 px ou mais) e as abas cabem' % (w, h_, v['cv'][0], v['cv'][1]), [r, v])
            await ctx.close()
        await b.close()

        # ---------------------------------------------------------------- 4) a Oficina do RACHA
        b, pg, erros_j = await abre(pw, 844, 390, url=URL_J)
        await rt(pg, "OFI.abre('hub'); true"); await pg.wait_for_timeout(600)
        # v98: o RACHA e o Rachão separados — as abas do Rachão moram no modo RACHÃO (a chave no topo da central)
        r = await rt(pg, "(() => ({racha: [...document.querySelectorAll('.ofi-hub-nav .ofi-hub-aba')].filter(b => !b.hidden).map(b => b.dataset.a), modos: [...document.querySelectorAll('.ofi-modo-bt')].map(b => b.dataset.m)}))()")
        P.confere(r['modos'] == ['racha', 'rachao'] and 'rachao' not in r['racha'] and r['racha'][:2] == ['meus', 'dev'], 'v98: a central tem os dois modos; no RACHA, só as abas dos mapas (o Rachão ficou separado)', r)
        await pg.click('.ofi-modo-bt[data-m="rachao"]'); await pg.wait_for_timeout(400)
        r = await rt(pg, "[...document.querySelectorAll('.ofi-hub-nav .ofi-hub-aba')].filter(b => !b.hidden).map(b => b.dataset.a)")
        P.confere(r == ['rachao', 'rachao_salas'], 'no modo RACHÃO: a aba dos estádios (a primeira) e as salas online', r)
        await pg.click('.ofi-hub-aba[data-a="rachao"]'); await pg.wait_for_timeout(400)
        r = await rt(pg, "(() => { const p = document.querySelector('.ofi-rch-placa'); return {placa: !!p, marca: p && p.querySelector('.ofi-rch-marca').textContent, bts: p ? [...p.querySelectorAll('.ofi-rch-bts .ofi-bt')].map(b => b.textContent) : [], sep: (document.querySelector('.ofi-grade .ofi-sep') || {}).textContent, novo: !!document.querySelector('.ofi-grade .ofi-cartao-novo')}; })()")
        P.confere(r['placa'] and r['marca'] == 'Rachão' and r['bts'] == ['JOGAR O RACHÃO', 'SALA ONLINE', 'CRIAR ESTÁDIO', 'COLAR CÓDIGO'] and r['sep'] == 'SEUS ESTÁDIOS DO RACHÃO' and r['novo'],
                  'a aba RACHÃO: a placa com a cara do Rachão (JOGAR O RACHÃO, SALA ONLINE da v98, CRIAR ESTÁDIO, COLAR CÓDIGO) e os estádios do aparelho (ainda nenhum)', r)
        r = await sobra_largura(pg)
        P.confere(r['doc'] <= 0, 'a aba cabe no celular deitado (844x390)', r)
        await pg.screenshot(path=str(SAIDA / 'v97_oficina_aba.png'))
        await pg.click('.ofi-rch-bts .ofi-bt:has-text("CRIAR ESTÁDIO")'); await pg.wait_for_timeout(1600)
        fr = next((f for f in pg.frames if 'rachao.html' in f.url), None)
        r = await rt(pg, "(() => { const f = document.querySelector('#ofi-rch iframe'); return {aberto: OFI.rachao.aberto(), pronto: OFI.rachao.pronto(), dialog: document.getElementById('ofi-rch').getAttribute('role'), src: f.getAttribute('src'), carrega: document.querySelector('.ofi-rch-carrega').hidden, mesmo: f.contentWindow.location.origin === location.origin}; })()")
        r2 = await fr.evaluate("({volta: !!document.querySelector('.rc-volta'), folha: (document.querySelector('.rc-folha h2') || {}).textContent, lista: !document.getElementById('rc-estadios').hidden})") if fr else {}
        P.confere(r['aberto'] and r['pronto'] and r['dialog'] == 'dialog' and r['src'] == './rachao/rachao.html?na=oficina#novo&k=1' and r['carrega'] and r['mesmo'] and r2.get('folha') == 'Começar de onde?' and r2.get('volta'),
                  'CRIAR ESTÁDIO abre o Rachão por cima da Oficina (a moldura do mesmo endereço avisa que está pronta) já no "Começar de onde?"', [r, r2])
        await pg.screenshot(path=str(SAIDA / 'v97_oficina_rachao_novo.png'))
        f = pg.frame_locator('#ofi-rch iframe')
        await f.locator('.rc-modelo:has(b:text-is("Fliperama"))').click(); await pg.wait_for_timeout(700)
        e = await fr.evaluate('RachaoEstadios.editor()')
        await f.locator('.rc-t-voltar').click(); await pg.wait_for_timeout(700)
        r = await rt(pg, "(() => { const c = document.querySelector('.ofi-rch-cartao'); return {aberto: OFI.rachao.aberto(), aba: document.querySelector('.ofi-hub-aba.on').dataset.a, cartoes: document.querySelectorAll('.ofi-rch-cartao').length, nome: c && c.querySelector('.ofi-cartao-tx b').textContent, img: c && /^data:image\\/jpeg/.test((c.querySelector('img') || {}).src || ''), info: c && c.querySelector('.ofi-cartao-tx small').textContent, id: c && c.dataset.rch}; })()")
        P.confere(e['aberto'] and not r['aberto'] and r['aba'] == 'rachao' and r['cartoes'] == 1 and r['nome'] == 'Fliperama 2' and r['img'] and r['id'] == e['id'] and r['info'].startswith('6 peças'),
                  'o ‹ do editor volta para a Oficina, que já mostra o estádio novo (a miniatura, o nome e as 6 peças)', r)
        await pg.screenshot(path=str(SAIDA / 'v97_oficina_cartao.png'))
        await pg.click('.ofi-rch-cartao .ofi-cartao-bts .ofi-bt:has-text("EDITAR")'); await pg.wait_for_timeout(700)
        e2 = await fr.evaluate('RachaoEstadios.editor()')
        P.confere(await rt(pg, "OFI.rachao.aberto()") and e2['aberto'] and e2['id'] == e['id'], 'EDITAR no cartão abre o editor desse estádio (na moldura que já estava aberta)', [e2['id'], e['id']])
        await pg.screenshot(path=str(SAIDA / 'v97_oficina_editor.png'))
        await f.locator('.rc-t-voltar').click(); await pg.wait_for_timeout(500)
        await pg.click('.ofi-rch-cartao .ofi-cartao-bts .ofi-ic-bt'); await pg.wait_for_timeout(700)
        await f.locator('.rc-folha .rc-item[data-modo="match"]').click(); await pg.wait_for_timeout(400)
        r2 = await fr.evaluate("({setup: !document.getElementById('setup').hidden, mapa: App.sel.match.map})")
        await f.locator('#btnBack').click(); await pg.wait_for_timeout(500)
        P.confere(r2 == {'setup': True, 'mapa': e['id']} and not await rt(pg, "OFI.rachao.aberto()"), 'JOGAR no cartão pergunta o modo e abre a preparação com o estádio; o ‹ Voltar dela volta para a Oficina', r2)
        await pg.click('.ofi-rch-bts .ofi-bt:has-text("JOGAR O RACHÃO")'); await pg.wait_for_timeout(700)
        r2 = await fr.evaluate("({home: !document.getElementById('home').hidden, volta: (document.querySelector('.rc-volta') || {}).textContent})")
        await pg.screenshot(path=str(SAIDA / 'v97_oficina_rachao_inicio.png'))
        await f.locator('.rc-volta').click(); await pg.wait_for_timeout(400)
        P.confere(r2 == {'home': True, 'volta': 'Voltar para a Oficina'} and not await rt(pg, "OFI.rachao.aberto()") and await rt(pg, "OFI.aberta"),
                  'JOGAR O RACHÃO abre a tela inicial dele, com o VOLTAR PARA A OFICINA (que fecha só o Rachão: a Oficina continua)', r2)
        # o Esc (com o foco fora da moldura) e o celular em pé com o Rachão aberto
        await pg.click('.ofi-rch-bts .ofi-bt:has-text("JOGAR O RACHÃO")'); await pg.wait_for_timeout(500)
        await rt(pg, "document.activeElement.blur(); document.body.focus(); true")
        await pg.keyboard.press('Escape'); await pg.wait_for_timeout(300)
        r = await rt(pg, "({rachao: OFI.rachao.aberto(), oficina: OFI.aberta, tela: OFI.tela})")
        P.confere(r == {'rachao': False, 'oficina': True, 'tela': 'hub'}, 'o Esc fora da moldura fecha só o Rachão (a Oficina continua na central)', r)
        grosso = await rt(pg, "matchMedia('(pointer: coarse)').matches")
        await pg.click('.ofi-rch-bts .ofi-bt:has-text("JOGAR O RACHÃO")'); await pg.wait_for_timeout(500)
        await pg.set_viewport_size({'width': 390, 'height': 844}); await pg.wait_for_timeout(600)
        g1 = await rt(pg, "document.getElementById('v70-gire').hidden")
        await pg.screenshot(path=str(SAIDA / 'v97_oficina_rachao_em_pe.png'))
        await rt(pg, "OFI.rachao.fecha(); true"); await pg.wait_for_timeout(400)
        g2 = await rt(pg, "document.getElementById('v70-gire').hidden")
        await pg.set_viewport_size({'width': 844, 'height': 390}); await pg.wait_for_timeout(400)
        # (o Chromium de teste nem sempre se diz "de toque": a regra do GIRE é conferida também com o celular em pé de mentira)
        await pg.click('.ofi-rch-bts .ofi-bt:has-text("JOGAR O RACHÃO")'); await pg.wait_for_timeout(400)
        r = await rt(pg, "(() => { const mq = V70G.mq; V70G.mq = {matches: true}; const aberto = v70GireDeveAbrir(); OFI.rachao.fecha(); const fechado = v70GireDeveAbrir(); V70G.mq = mq; v70GireSync(); return {aberto, fechado}; })()")
        P.confere(g1 and (g2 is False or not grosso) and r == {'aberto': False, 'fechado': True},
                  'com o Rachão aberto, o celular pode ficar em pé (o GIRE O CELULAR não aparece); fechou, ele volta a valer', {'aberto': g1, 'fechado': g2, 'toque': grosso, 'regra': r})
        erros_j = [x for x in erros_j if not REDE_OK.search(x)]
        await pg.click('.ofi-rch-bts .ofi-bt:has-text("JOGAR O RACHÃO")'); await pg.wait_for_timeout(400)
        r = await rt(pg, "(() => { OFI.fecha(); const ev = new KeyboardEvent('keydown', {key: 'a', bubbles: true, cancelable: true}); let chegou = false; const f = () => { chegou = true; }; window.addEventListener('keydown', f); document.body.dispatchEvent(ev); window.removeEventListener('keydown', f); return {rachao: OFI.rachao.aberto(), oficina: OFI.aberta, chegou, escondido: document.getElementById('ofi-rch').hidden}; })()")
        P.confere(r == {'rachao': False, 'oficina': False, 'chegou': True, 'escondido': True}, 'a Oficina fechou por baixo: o Rachão fecha junto e o teclado do jogo volta a funcionar', r)
        # depois do teste: a física do mapa e a da sala com a do Rachão (a ponte colada no RACHA)
        r = await rt(pg, """(async () => { const I = OFI.interno; OFI.abre('hub'); const M = I.limpaModelo(I.mapaDoZero('pequeno', 'retangulo', 90, 60), 'mistura');
          const reg = await I.novoRascunho(M); await I.editorAbre(reg); await new Promise(r => setTimeout(r, 150)); I.OFE.sel.clear(); I.OFE.aba = 'fisica'; I.painelAtualiza();
          const linhas = [...I.EDU.painel.querySelectorAll('.ofi-mistura')].map(l => [l.querySelector('.ofi-f-rot').textContent, (l.querySelector('.ofi-seg-bt.on') || {}).textContent]);
          I.EDU.painel.querySelector('.ofi-mistura .ofi-seg-bt[data-parte="bola"][data-jogo="rachao"]').click();
          const F = RachaMapa.fisicaResolvida(I.OFE.M.fisica), partes = RachaPonte.PARTES.map(p => RachaPonte.qualRacha(F.perfil, F.extra, p));
          const dv = F.perfil.forcaChute * F.extra.massaChute / F.perfil.massaBola;
          I.criaSalaDialogo({ M: JSON.parse(JSON.stringify(I.OFE.M)), nome: 'mistura', volta: 'editor' }); await new Promise(r => setTimeout(r, 300));
          const jan = [...document.querySelectorAll('.ofi-jan-sala')].pop();
          jan.querySelector('.ofi-mistura .ofi-seg-bt[data-parte="jogador"][data-jogo="rachao"]').click();
          const sala = { pre: [...jan.querySelectorAll('.ofi-fis-pre .ofi-seg-bt.on')].map(b => b.textContent), on: [...jan.querySelectorAll('.ofi-mistura .ofi-seg-bt.on')].map(b => b.dataset.parte + ':' + b.dataset.jogo) };
          const lv = [...jan.querySelectorAll('.ofi-fis-gr .ofi-f')].find(x => /^Velocidade \\(/.test(x.querySelector('.ofi-f-rot').textContent) && x.closest('.ofi-fis-gr:not(.ofi-fis-mistura)')), rg = lv && lv.querySelector('input[type=range]');
          if (rg) { rg.value = String(Number(rg.max)); rg.dispatchEvent(new Event('input', { bubbles: true })); rg.dispatchEvent(new Event('change', { bubbles: true })); }
          const depois = [...jan.querySelectorAll('.ofi-mistura .ofi-seg-bt.on')].map(b => b.dataset.parte + ':' + b.dataset.jogo);
          [...jan.querySelectorAll('button')].find(b => /CANCELAR/.test(b.textContent)).click();
          I.OFE.aba = 'fisica'; I.painelAtualiza();
          const la = [...I.EDU.painel.querySelectorAll('.ofi-f')].find(x => /^Aceleração( \\(|$)/.test(x.querySelector('.ofi-f-rot').textContent)), ra = la && la.querySelector('input[type=range]');
          const acel = ra ? (ra.value = '1', Number(ra.value)) : -1;
          return { linhas, preset: I.OFE.M.fisica.preset, partes, rBola: F.perfil.rBola, dv, sala, depois, acel }; })()""")
        await pg.wait_for_timeout(300)
        P.confere(r['linhas'] == [['Bola', 'RACHA'], ['Tampinha', 'RACHA'], ['Chute', 'RACHA']] and r['preset'] == 'personalizado' and r['partes'] == ['rachao', 'racha', 'racha']
                  and abs(r['rBola'] - 4 / 3) < 0.001 and abs(r['dv'] - 36) < 0.05,
                  'na Oficina do RACHA, o MISTURAR COM O RACHÃO da física do mapa: a bola do Rachão entra (maior e leve) e o chute continua o do RACHA (36 u/s; v103: era 34)', r)
        P.confere(r['sala'] == {'pre': ['Personalizada'], 'on': ['bola:rachao', 'jogador:rachao', 'chute:racha']},
                  'e na FÍSICA DA SALA (CRIAR SALA): a tampinha do Rachão por cima da bola do mapa, a predefinição vira Personalizada', r['sala'])
        P.confere(r['depois'] == ['bola:rachao', 'chute:racha'] and r['acel'] == 1,
                  'mexeu na velocidade das tampinhas na sala: o cartão diz na hora que a tampinha ficou ajustada; e a aceleração do mapa vai até 1 (o deslizante de 0,02 em 0,01)', [r['depois'], r['acel']])
        await rt(pg, "OFI.interno.editorSai ? (OFI.interno.editorSai(), true) : true"); await pg.wait_for_timeout(200)
        erros_j = [x for x in erros_j if not REDE_OK.search(x)]
        P.confere(not erros and not erros_j, 'nenhum erro de script (o Rachão sozinho, o editor e a Oficina)', erros + erros_j)
        P.confere(not fora, 'o Rachão não pede nada para fora do próprio endereço', fora[:5])
        await b.close()
    srv.shutdown()
    return P.fim()


roda(principal())
