"""RACHA v105 · AS TAMPINHAS CRIADAS NA CONTA E A BORDA BOTÃO PARA TODO MUNDO (passa/falha, no navegador):
  1) A CAUSA: a tampinha feita com a BOTÃO (a borda da v102) e a com uma cara animada (v76), equipadas e salvas, continuam
     equipadas e no inventário ao abrir o jogo de novo (na v104 sumiam: a leitura do começo recusava as peças que entram
     depois e guardava o "inválido");
  2) a borda de fábrica com a BOTÃO: a inicial (e as do time) e a criada sem mexer na borda aparecem com o aro do botão — os
     códigos de sempre não mudam —; a Clássica de outra cor continua com os dentes; no editor, a inicial abre com a BOTÃO (o
     VOLTAR não troca nada e a inicial continua a inicial), a nova nasce com a BOTÃO e a Clássica escolhida de propósito no
     cinza da inicial continua Clássica;
  3) a BOTÃO como nas imagens: o aro chapado (a mesma cor em volta toda), o contorno escuro por fora, o filete escuro entre o
     aro e o desenho, o desenho sem a luz de esmalte, nada fora do botão; nos tamanhos pequenos o aro continua aparecendo;
  4) as tampinhas dos dois lados juntam no QUAL PROGRESSO FICA? (as duas escolhas) e a apagada de propósito não volta;
  5) com a conta (a plataforma de teste: o código de verdade de app/api), a criada vai para a conta logo (sem esperar o vigia),
     o SAIR DA CONTA logo depois de criar manda antes de sair, e ela está lá ao entrar de novo no mesmo navegador e num
     navegador novo (a equipada e as salvas); a tampinha da conta que o aparelho nunca viu entra nas salvas; o envio com o app
     indo para o fundo sai com keepalive; e o QUAL PROGRESSO FICA? de verdade (a conta mais nova, com a de outro aparelho, e a
     criada aqui que não foi) › O DA CONTA: o jogo abre de novo com as duas, e as duas vão para a conta;
  6) nenhum erro de JavaScript.
  Capturas em tests/saida/v105_*.png.
  python3 tests/v105_cosmeticos_test.py
  V105_SO_CAUSA=1 (só a parte 1 — dá para rodar contra a v104 com RACHA_TESTE=<o racha_teste.html da v104>: ali ela falha)
  V105_SO_CONTA=1 (só a parte 5, com a plataforma de teste)"""
import asyncio, base64, json, os, sys, tempfile, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from comum import Placar, abre, rt, async_playwright, CHROME, FONTES, HARNESS, PAGINA, RAIZ
from v88_cliente_test import Plataforma, conta, espera

SAIDA = RAIZ / 'tests' / 'saida'; SAIDA.mkdir(exist_ok=True)
INICIAL_V104 = 'T.ACgDHm0-vPZ6fxf2oA'          # (o código da tampinha inicial na v104: não pode mudar)

# a luz de um ponto do canvas c (x, y) e a cor
PIXELS = r"""(cod, r, pontos) => { const c = document.createElement('canvas'); c.width = c.height = Math.ceil(2*r + 40); const g = c.getContext('2d'), m = c.width/2;
  tpDesenha(g, m, m, r, tpLe(cod), 7);
  return pontos.map(([k, ang]) => Array.from(g.getImageData(Math.round(m + Math.cos(ang)*k*r), Math.round(m + Math.sin(ang)*k*r), 1, 1).data)); }"""


def luz(p):
    return .2126*p[0] + .7152*p[1] + .0722*p[2]


async def reabre(pg):
    """Abre o jogo de novo no mesmo navegador (o mesmo armazenamento), como quem fecha e abre o app (sem conta)."""
    await pg.reload()
    await pg.wait_for_function('() => typeof window.__RT === "function"', polling=100, timeout=20000)
    await pg.wait_for_timeout(700)
    await pg.evaluate("(() => { const b = [...document.querySelectorAll('#v84auth button')].find(x => /TREINAR OFFLINE/.test(x.textContent || '')); if (b) b.click(); const o = document.getElementById('onb'); if (o) o.hidden = true; })()")
    await rt(pg, HARNESS)


async def pronto(pg, ms=25000):
    """Espera o jogo logado no lobby com a cópia da conta já decidida (pode recarregar no meio: a cópia da conta entra)."""
    t0 = time.time()
    while time.time() - t0 < ms/1000:
        try:
            if await pg.evaluate('() => typeof window.__RT === "function" && !!window.__RT("v88Logado() && lobby.aberto && R82.nuvem !== undefined && !C82.recarrega && !C82.bloqueio")'):
                await asyncio.sleep(1.2)
                if await pg.evaluate('() => typeof window.__RT === "function" && !!window.__RT("v88Logado() && lobby.aberto && R82.nuvem !== undefined")'):
                    break
        except Exception:
            pass
        await asyncio.sleep(.3)
    await rt(pg, "(() => { if (typeof ONB !== 'undefined' && (ONB.aberto || ONB.aquece)) onbFim(); const o = document.getElementById('onb'); if (o) o.hidden = true; return 1; })()")
    await rt(pg, HARNESS)


async def entra(pg, usuario):
    await pg.wait_for_selector('#v84auth input[autocomplete="username"]', timeout=20000)
    await pg.fill('#v84auth input[autocomplete="username"]', usuario)
    await pg.fill('#v84auth input[type="password"]', 'senha1234')
    await pg.click('#v84auth .v84-go')
    await pronto(pg)


async def navegador(pw, PL, usuario, erros):
    b = await pw.chromium.launch(executable_path=CHROME, args=['--no-sandbox', '--autoplay-policy=no-user-gesture-required'])
    ctx = await b.new_context(viewport={'width': 1280, 'height': 720}, has_touch=True)
    await ctx.add_init_script("document.addEventListener('DOMContentLoaded',()=>{const s=document.createElement('style');s.textContent=%s;document.head.prepend(s);});" % json.dumps(FONTES))
    await ctx.add_init_script('window.RACHA_CONFIG = {presente:false};')
    pg = await ctx.new_page()
    pg.on('pageerror', lambda e: erros.append(str(e)[:300]))
    pg.on('console', lambda m: erros.append('console: ' + m.text[:200]) if m.type == 'error' and 'Failed to load resource' not in m.text else None)
    await pg.goto(PL.base + '/tests/build/racha_teste.html')
    await entra(pg, usuario)
    return b, pg


async def cria(pg, cor, nome):
    """O CRIAR TAMPINHA de verdade: abre o editor (com a sua), troca o padrão e a cor, SALVAR A ATUAL e o botão de baixo."""
    await rt(pg, "(() => { if (lobby.tela) fechaTela(); abreTela('skins'); return 1; })()")
    await espera(pg, "lobby.tela === 'skins' && !!ED.el && !!ED.D", 6000)
    await rt(pg, "(() => { ED.aba = 'p'; tpeAtualiza(true); tpeEscolhe('ls'); tpePoeCor(['pc', 0, 'FUNDO'], '#ffffff'); tpePoeCor(['pc', 1, 'COR 2'], %s); return 1; })()" % json.dumps(cor))
    cod = await rt(pg, "tpCodigo(ED.D)")
    await rt(pg, "(() => { tpeSalvarInv(); const s = TP.salvas.find(x => x.c === tpCodigo(ED.D)); if (s) s.n = %s; tpSalva(); return 1; })()" % json.dumps(nome))
    await rt(pg, "(() => { document.querySelector('.tpe-ok').click(); return 1; })()")   # (EQUIPAR: as peças são grátis)
    await asyncio.sleep(.3)
    return cod


def nuvem(PL, usuario):
    l = PL.sql("SELECT p.versao, p.dados FROM progresso_jogo p JOIN usuarios u ON u.id = p.usuario_id WHERE u.username = ?", [usuario])
    if not l:
        return None
    d = json.loads(l[0]['dados']) if isinstance(l[0]['dados'], str) else l[0]['dados']
    try:
        return json.loads(d.get('chaves', {}).get('racha-tampa-v1') or 'null')
    except Exception:
        return None


async def espera_nuvem(PL, usuario, cond, ms):
    t0 = time.time(); t = None
    while time.time() - t0 < ms/1000:
        t = nuvem(PL, usuario)
        if t and cond(t):
            return t, time.time() - t0
        await asyncio.sleep(.25)
    return t, None


async def principal():
    P = Placar('v105 · as tampinhas criadas na conta e a borda BOTÃO para todo mundo')
    erros_todos = []
    async with async_playwright() as pw:
      if not os.environ.get('V105_SO_CONTA'):              # (só a parte da conta: V105_SO_CONTA=1)
        # ---------------------------------------------------------------- 1) a causa: abrir o jogo de novo (sem conta)
        print('\n1) a tampinha com a BOTÃO e a com a cara animada continuam ao abrir o jogo de novo')
        b, pg, erros = await abre(pw, 1280, 720)
        erros_todos.append(erros)
        c = await rt(pg, """(() => {
          const D = tpLe(tpMinha()); D.b = 'bt'; D.bc = ['#ffffff', '#1d1d1d']; D.p = 'ls'; D.pc = ['#e2412f', '#ffffff', '#000000']; D.i = '--';
          const bt = tpCodigo(tpNorm(D));
          const E = tpLe(tpMinha()); E.b = 'ls'; E.bc = ['#2f5bd6', '#1d1d1d']; E.p = 'me'; E.pc = ['#2f5bd6', '#f5c542', '#000000']; E.i = SK76_CARAS[0].id; E.ip = [50, 50, 50, 0];
          const cara = tpCodigo(tpNorm(E));
          TP.salvas.unshift({c:cara, n:'Cara animada'}); TP.salvas.unshift({c:bt, n:'Minha botão'}); tpEquipa(bt);
          return {bt, cara, ibt:TP_BORDAS.findIndex(x => x.id === 'bt'), icara:TP_ICONES.findIndex(x => x.id === E.i), base:TP_BORDAS.length}; })()""")
        await reabre(pg)
        r = await rt(pg, "({eq: TP.equipada, minha: tpMinha(), perfil: perfil.skin, salvas: TP.salvas.map(s => s.c), valida: [!!tpLe(%s), !!tpLe(%s)], recuperou: window.RachaCosmeticos105 ? RachaCosmeticos105.V105.recuperou || null : null, lidos: [...TP_LIDOS].filter(([k, v]) => v === null && (k === %s || k === %s)).length})"
                     % (json.dumps(c['bt']), json.dumps(c['cara']), json.dumps(c['bt']), json.dumps(c['cara'])))
        P.confere(c['ibt'] == 27 and c['icara'] > 0, '(as peças: a BOTÃO no lugar 27 e a cara animada no %d — as duas entram nas listas depois da leitura do começo)' % c['icara'], c)
        P.confere(r['eq'] == c['bt'] and r['minha'] == c['bt'] and r['perfil'] == c['bt'], 'a criada com a BOTÃO continua EQUIPADA ao abrir o jogo de novo (na v104 voltava a inicial)', r)
        P.confere(r['salvas'][:2] == [c['bt'], c['cara']], 'as duas continuam no INVENTÁRIO, na mesma ordem (a da BOTÃO e a da cara animada)', r['salvas'])
        P.confere(all(r['valida']) and r['lidos'] == 0 and r['recuperou'], 'os códigos valem (o "inválido" guardado no começo foi limpo; a v105 leu de novo no fim)', r)
        guardado = await rt(pg, "(() => { tpSalva(); return JSON.parse(localStorage.getItem('racha-tampa-v1')); })()")   # (a gravação seguinte: na v104 apagava de vez)
        P.confere(guardado.get('equipada') == c['bt'] and [s['c'] for s in guardado.get('salvas', [])][:2] == [c['bt'], c['cara']],
                  'gravadas de novo no aparelho (a gravação seguinte não apaga mais)', guardado)
        await b.close()
        if os.environ.get('V105_SO_CAUSA'):                 # (só a causa: dá para rodar contra a v104 com RACHA_TESTE=<racha_teste.html da v104>)
            js = [e for l in erros_todos for e in l if 'Failed to load resource' not in e]
            P.confere(not js, 'nenhum erro de JavaScript', js[:4])
            return P.fim()

        # ---------------------------------------------------------------- 2) a borda de fábrica com a BOTÃO
        print('\n2) a inicial e a borda de fábrica com a BOTÃO (os códigos não mudam)')
        b, pg, erros = await abre(pw, 1280, 720)
        erros_todos.append(erros)
        k = await rt(pg, """(() => { const C = RachaCosmeticos105;
          const cinza = (() => { const D = tpLe(TP_PADRAO_COD); D.p = 'ls'; D.pc = ['#2f5bd6', '#ffffff', '#000000']; return tpCodigo(tpNorm(D)); })();
          const verm = (() => { const D = tpLe(TP_PADRAO_COD); D.bc = ['#e2412f', '#000000']; return tpCodigo(tpNorm(D)); })();
          return {ini:TP_PADRAO_COD, times:TP_TIME_COD.slice(), fab:[TP_PADRAO_COD, TP_TIME_COD[0], TP_TIME_COD[1], cinza].map(x => C.deFabrica(tpLe(x))), verm, vermFab:C.deFabrica(tpLe(verm)), cinza,
            borda:tpLe(TP_PADRAO_COD).b, minha:tpMinha()}; })()""")
        P.confere(k['ini'] == INICIAL_V104 and k['borda'] == 'cl' and k['minha'] == INICIAL_V104, 'o código da inicial é o de sempre (%s): nada muda no servidor, nas salas e nas versões de antes' % INICIAL_V104, k)
        P.confere(all(k['fab']) and not k['vermFab'], 'de fábrica: a inicial, as do time e a criada sem mexer na borda; a Clássica de outra cor, não', k)
        # o desenho: o aro do botão (sem os dentes) na inicial, nas do time e na criada sem mexer na borda; os dentes na Clássica vermelha
        PONTOS = [[.9, 0], [.955, 0], [.99, -1.5707963], [.995, -1.5707963]]   # (o aro, o contorno, e fora do botão em cima — onde a Clássica tem a ponta de um dente)
        px = {}
        for nome, cod in (('inicial', k['ini']), ('timeA', k['times'][0]), ('timeB', k['times'][1]), ('cinza', k['cinza']), ('verm', k['verm'])):
            px[nome] = await pg.evaluate('([cod, r, p]) => window.__RT("(" + %s + ")")(cod, r, p)' % json.dumps(PIXELS), [cod, 90, PONTOS])
        botao = lambda p: min(p[0][:3]) > 200 and max(p[1][:3]) < 90 and p[1][3] > 200 and p[2][3] < 40 and p[3][3] < 40
        P.confere(all(botao(px[n]) for n in ('inicial', 'timeA', 'timeB', 'cinza')), 'desenhadas com a BOTÃO: o aro branco, o contorno escuro e nada fora (sem os dentes)', {n: px[n] for n in ('inicial', 'cinza')})
        P.confere(px['verm'][2][3] > 200, 'a Clássica vermelha (escolhida de propósito) continua com os dentes', px['verm'])
        # o editor: a inicial abre com a BOTÃO; o VOLTAR não troca nada; a criada nasce com a BOTÃO
        await rt(pg, "(() => { tpeAbre(); return 1; })()")
        await pg.wait_for_timeout(600)
        e = await rt(pg, "({b: ED.D.b, aro: ED.D.bc[0], mudou: tpeMudou(), acao: document.querySelector('.tpe-ok b').textContent})")
        await rt(pg, "(() => { document.querySelector('.tpe-ok').click(); return 1; })()")
        await pg.wait_for_timeout(400)
        e2 = await rt(pg, "({eq: TP.equipada, tela: lobby.tela, rasc: localStorage.getItem('racha-tampa-rascunho-v1'), noTime: tpNoTime(tpMinha(), 1) === TP_TIME_COD[1]})")
        P.confere(e['b'] == 'bt' and e['aro'] in ('#f7f7f3', '#f6f6f2', '#f7f7f2') and not e['mudou'] and e['acao'] == 'VOLTAR',
                  'no CRIAR TAMPINHA a inicial abre com a BOTÃO de aro branco, sem contar como mudança (o botão diz VOLTAR)', e)
        P.confere(e2['eq'] == '' and e2['tela'] is None and not e2['rasc'] and e2['noTime'], 'o VOLTAR não troca nada: a inicial continua a inicial (com as cores do time na partida)', e2)
        await rt(pg, "(() => { tpeAbre(); return 1; })()")
        await pg.wait_for_timeout(500)
        nova = await rt(pg, "(() => { ED.aba = 'p'; tpeAtualiza(true); tpeEscolhe('ls'); tpePoeCor(['pc', 1, 'COR 2'], '#e2412f'); const c = tpCodigo(ED.D); document.querySelector('.tpe-ok').click(); return {c, b: tpLe(c).b, eq: TP.equipada}; })()")
        P.confere(nova['b'] == 'bt' and nova['eq'] == nova['c'], 'a criada a partir da inicial nasce com a BOTÃO (no código: lugar 27)', nova)
        await rt(pg, "(() => { tpeAbre(); return 1; })()")
        await pg.wait_for_timeout(500)
        cl = await rt(pg, "(() => { ED.aba = 'b'; tpeAtualiza(true); tpeEscolhe('cl'); tpePoeCor(['bc', 0, 'METAL'], '#c7ccd2'); const c = tpCodigo(ED.D); return {b: ED.D.b, cor: ED.D.bc[0], fab: RachaCosmeticos105.deFabrica(tpLe(c)), c}; })()")
        pcl = await pg.evaluate('([cod, r, p]) => window.__RT("(" + %s + ")")(cod, r, p)' % json.dumps(PIXELS), [cl['c'], 90, PONTOS])
        P.confere(cl['b'] == 'cl' and not cl['fab'] and pcl[2][3] > 200, 'a Clássica escolhida de propósito no cinza da inicial continua Clássica (um tom acima: %s), com os dentes' % cl['cor'], [cl, pcl[2]])
        await rt(pg, "(() => { ED.descarta = true; ED.saindo = true; fechaTela(); ED.saindo = false; return 1; })()")

        # ---------------------------------------------------------------- 3) a BOTÃO como nas imagens
        print('\n3) a BOTÃO chapada, como nas imagens')
        f = await rt(pg, """(() => { const D = TP_PADRAO_D(); D.b = 'bt'; D.bc = ['#f7f7f3', '#1d1d1d']; D.p = 'tc'; D.pc = ['#f7f7f3', '#e2412f', '#e2412f']; D.i = '--';
          const cod = tpCodigo(tpNorm(D)), r = 90, c = document.createElement('canvas'); c.width = c.height = 240; const g = c.getContext('2d'), m = 120;
          tpDesenha(g, m, m, r, tpLe(cod), 7);
          const M = RachaCosmeticos105.medidas(r), p = (k, a) => Array.from(g.getImageData(Math.round(m + Math.cos(a)*k), Math.round(m + Math.sin(a)*k), 1, 1).data);
          const angs = Array.from({length:12}, (_, i) => i/12*Math.PI*2);
          const aro = angs.map(a => p((M.rt + M.wF + M.R - M.wC)/2, a)), contorno = angs.map(a => p(M.R - M.wC/2, a)), filete = angs.map(a => p(M.rt + M.wF/2, a));
          const mancha = [p(M.rt*.6, Math.PI*.8), p(M.rt*.6, Math.PI*1.2)];   // (a listra da esquerda em cima e embaixo: sem a luz de esmalte, a mesma cor)
          return {M, aro, contorno, filete, mancha, fora:p(r*.985, 0)[3], cod}; })()""")
        aros = f['aro']
        var = max(max(p[i] for p in aros) - min(p[i] for p in aros) for i in range(3))
        P.confere(all(min(p[:3]) > 225 for p in aros) and var <= 3, 'o aro chapado: o mesmo branco em volta toda (sem o degradê de relevo nem o brilho; variação %d)' % var, aros[:4])
        P.confere(all(max(p[:3]) < 60 and p[3] > 230 for p in f['contorno']), 'o contorno escuro firme por fora, em volta toda', f['contorno'][:3])
        P.confere(all(max(p[:3]) < 80 and p[3] > 220 for p in f['filete']), 'o filete escuro entre o aro e o desenho, em volta toda', f['filete'][:3])
        a, bb = f['mancha']
        P.confere(max(abs(a[i] - bb[i]) for i in range(3)) <= 2 and a[0] > 200 and a[1] < 90, 'o desenho sem a luz de esmalte (a listra igual em cima e embaixo: sem a sombra por dentro)', f['mancha'])
        M = f['M']
        P.confere(abs(M['rt']/M['R'] - .84) < .01 and abs(M['wC']/M['R'] - .035) < .005 and abs(M['wF']/M['R'] - .035) < .005 and f['fora'] < 30,
                  'as proporções das imagens: o desenho até 84% do raio, o filete e o contorno com 3,5%, o aro com 9%; nada fora do botão', M)
        peq = await rt(pg, """(() => { const out = {}; for (const r of [14, 22, 30]){ const M = RachaCosmeticos105.medidas(r), c = document.createElement('canvas'); c.width = c.height = 2*r + 20; const g = c.getContext('2d'), m = c.width/2;
            tpDesenha(g, m, m, r, tpLe(TP_PADRAO_COD), 7); let claro = 0;
            for (let k = M.rt + M.wF; k <= M.R - M.wC; k += .25){ const d = g.getImageData(Math.round(m + k), Math.round(m), 1, 1).data; if (Math.min(d[0], d[1], d[2]) > 190) claro++; }
            out[r] = {aro: M.R - M.wC - M.rt - M.wF, claro}; } return out; })()""")
        P.confere(all(v['aro'] >= 1.55 and v['claro'] > 0 for v in peq.values()), 'pequena (r = 14, 22 e 30 px): o aro continua aparecendo (≥ 1,6 px)', peq)
        # as capturas: a folha (grama e escuro, vários tamanhos) e a partida de perto
        url = await rt(pg, r"""(() => { const W = 1000, H = 420, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
          g.fillStyle = '#23a52f'; g.fillRect(0, 0, W, H/2); g.fillStyle = '#121418'; g.fillRect(0, H/2, W, H/2);
          const lis = cor => { const D = TP_PADRAO_D(); D.b = 'bt'; D.bc = ['#f7f7f3', '#1d1d1d']; D.p = 'tc'; D.pc = ['#f7f7f3', cor, cor]; D.i = '--'; return tpNorm(D); };
          const caps = [tpLe(TP_PADRAO_COD), tpLe(TP_TIME_COD[0]), lis('#e2412f'), lis('#2f5bd6')];
          for (let f = 0; f < 2; f++){ let x = 20; for (const r of [16, 22, 30, 46, 70]){ caps.forEach((D, i) => tpDesenha(g, x + r, f*H/2 + 20 + r + (i % 2)*(2*r + 8), r, D, 7)); x += 2*r + 12; caps.forEach((D, i) => i > 1 && tpDesenha(g, x + r, f*H/2 + 20 + r + (i % 2)*(2*r + 8), r, D, 7)); x += 2*r + 18; } }
          return c.toDataURL('image/png'); })()""")
        open(SAIDA / 'v105_borda_folha.png', 'wb').write(base64.b64decode(url.split(',', 1)[1]))

        # ---------------------------------------------------------------- 4) as tampinhas juntam no QUAL PROGRESSO FICA?
        print('\n4) QUAL PROGRESSO FICA?: as tampinhas dos dois lados juntam')
        j = await rt(pg, """(() => {
          if (typeof ONB !== 'undefined' && (ONB.aberto || ONB.aquece)) onbFim();   // (a pergunta da conta espera a primeira vez do jogo)
          const mk = cor => { const D = TP_PADRAO_D(); D.b = 'bt'; D.bc = ['#f7f7f3', '#1d1d1d']; D.p = 'me'; D.pc = ['#ffffff', cor, '#000000']; D.i = '--'; return tpCodigo(tpNorm(D)); };
          const aqui1 = mk('#e2412f'), aqui2 = mk('#1f9a4a'), conta1 = mk('#2f5bd6'), apagada = mk('#7a3fc4');
          TP.salvas = [{c:aqui1, n:'Aqui 1', f:false}, {c:aqui2, n:'Aqui 2', f:true}]; tpSalva(); tpEquipa(aqui1);
          // a de "Aqui 2" é apagada aqui depois de a conta ter a cópia com ela: não pode voltar
          const antes = Date.now() - 60000;
          const contaTampa = {itens:[], salvas:[{c:conta1, n:'Da outra', f:false, t:antes}, {c:aqui2, n:'Aqui 2', f:true, t:antes}, {c:apagada, n:'Velha', f:false}], equipada:conta1, te:antes};
          TP.salvas = TP.salvas.filter(s => s.c !== aqui2); tpSalva();
          const n = {versao:99, salvoEm:Date.now(), dados:{v:1, chaves:{'racha-tampa-v1':JSON.stringify(contaTampa)}}};
          c82Conflito(n);
          const daConta = JSON.parse(n.dados.chaves['racha-tampa-v1']);
          const r = {daConta:daConta.salvas.map(s => s.n), daContaEq:daConta.equipada === aqui1, aqui:TP.salvas.map(s => s.n), aquiEq:TP.equipada === aqui1,
            pop:!LB.pop.hidden && /QUAL PROGRESSO FICA/.test(LB.popCaixa.textContent)};
          fechaPop(); C82.conflitoAberto = false; C82.bloqueio = false; C82.pops.length = 0;
          return r; })()""")
        P.confere(j['pop'], 'a pergunta QUAL PROGRESSO FICA? continua aparecendo (a escolha é de quem joga)', j)
        P.confere(set(j['daConta']) == {'Aqui 1', 'Da outra', 'Velha'} and j['daContaEq'], 'O DA CONTA: a cópia da conta leva a criada aqui (equipada por último) e fica com a dela', j)
        P.confere(set(j['aqui']) == {'Aqui 1', 'Da outra', 'Velha'} and j['aquiEq'], 'O DESTE APARELHO: este aparelho fica com a da conta também (e a equipada daqui)', j)
        P.confere('Aqui 2' not in j['daConta'] and 'Aqui 2' not in j['aqui'], 'a apagada aqui de propósito depois da cópia não volta', j)
        erros_todos.append(erros)
        await b.close()

    # ---------------------------------------------------------------- 5) a conta: entrar de novo, no mesmo navegador e num novo
    print('\n5) com a conta: a criada vai logo, o SAIR manda antes de sair e ela está lá ao entrar de novo')
    banco = os.path.join(tempfile.mkdtemp(prefix='racha105-'), 'plataforma.sqlite')
    PL = Plataforma(banco).sobe()
    try:
        conta(PL, 'jadepicon')
        async with async_playwright() as pw:
            eA = []; erros_todos.append(eA)
            bA, A = await navegador(pw, PL, 'jadepicon', eA)
            c1 = await cria(A, '#e2412f', 'Vermelha')
            t, dt = await espera_nuvem(PL, 'jadepicon', lambda t: t.get('equipada') == c1 and any(s['c'] == c1 for s in t.get('salvas', [])), 6000)
            P.confere(dt is not None and dt < 5, 'criou e equipou: a cópia com a tampinha está na conta em %.1f s (antes: de 8 a 12 s, e nunca antes do SAIR)' % (dt or -1), t)
            P.confere(await rt(A, "tpLe(TP.equipada).b") == 'bt', 'a criada a partir da inicial tem a BOTÃO', await rt(A, "TP.equipada"))
            # a segunda e o SAIR DA CONTA logo em seguida (o botão da janela SUA CONTA)
            c2 = await cria(A, '#2f5bd6', 'Azul')
            await rt(A, "(() => { if (lobby.tela) fechaTela(); ajxAbre('conta'); return 1; })()")
            await asyncio.sleep(.25)
            saiu = await rt(A, "(() => { const b = document.querySelector('.v84-sair'); if (!b) return false; b.click(); return true; })()")
            await A.wait_for_selector('#v84auth input[autocomplete="username"]', timeout=20000)
            t = nuvem(PL, 'jadepicon')
            P.confere(saiu and t and t.get('equipada') == c2 and {s['c'] for s in t.get('salvas', [])} >= {c1, c2},
                      'criou e tocou em SAIR DA CONTA logo em seguida: antes de sair, a cópia com as duas foi para a conta', t)
            await entra(A, 'jadepicon')
            await asyncio.sleep(1.5)
            r = await rt(A, "({eq: TP.equipada, minha: tpMinha(), salvas: TP.salvas.map(s => s.c), nomes: TP.salvas.map(s => s.n)})")
            await A.screenshot(path=str(SAIDA / 'v105_relogou.png'))
            P.confere(r['eq'] == c2 and r['minha'] == c2, 'entrou de novo no mesmo navegador: a criada continua EQUIPADA', r)
            P.confere(r['salvas'][:2] == [c2, c1], 'e as duas continuam nas SALVAS (a mais nova primeiro)', r)
            # o envio com o app indo para o fundo: keepalive
            ka = await rt(A, """(() => { const f0 = window.fetch; window.__v105ka = null;
              window.fetch = function(url, o){ if (/progresso\\.salvar/.test(String(url))) window.__v105ka = !!(o && o.keepalive); return f0.apply(this, arguments); };
              RACHA84.manterViva = true; const s = TP.salvas[0]; s.f = !s.f; tpSalva(); setTimeout(() => { window.fetch = f0; RACHA84.manterViva = false; }, 6000); return 1; })()""")
            ka = await espera(A, "window.__v105ka !== null ? String(window.__v105ka) : ''", 6000)
            P.confere(ka == 'true', 'com o app indo para o fundo (ou fechando), o envio da cópia sai com keepalive', ka)
            await asyncio.sleep(1)
            # num navegador novo (outro aparelho)
            eB = []; erros_todos.append(eB)
            bB, B = await navegador(pw, PL, 'jadepicon', eB)
            await asyncio.sleep(1.5)
            r2 = await rt(B, "({eq: TP.equipada, minha: tpMinha(), salvas: TP.salvas.map(s => s.c)})")
            await B.screenshot(path=str(SAIDA / 'v105_outro_navegador.png'))
            P.confere(r2['eq'] == c2 and r2['minha'] == c2, 'num navegador novo (outro aparelho): a criada está EQUIPADA', r2)
            P.confere(set(r2['salvas']) >= {c1, c2}, 'e as duas estão nas SALVAS', r2)
            await bB.close()
            # a tampinha da conta (a coluna "tampa") que o aparelho nunca viu entra nas salvas
            c3 = await rt(A, "(() => { const D = TP_PADRAO_D(); D.b = 'bt'; D.bc = ['#f7f7f3', '#1d1d1d']; D.p = 'cz'; D.pc = ['#1f9a4a', '#ffffff', '#000000']; D.i = '--'; return tpCodigo(tpNorm(D)); })()")
            PL.sql("UPDATE usuarios SET tampa = ? WHERE username = ?", [c3, 'jadepicon'])
            eC = []; erros_todos.append(eC)
            bC, C = await navegador(pw, PL, 'jadepicon', eC)
            achou = await espera(C, "TP.salvas.some(s => s.c === %s && s.n === 'Da conta') ? 1 : 0" % json.dumps(c3), 9000)
            r3 = await rt(C, "({eq: TP.equipada, salvas: TP.salvas.map(s => s.n)})")
            P.confere(achou and r3['eq'] == c2, 'a tampinha da conta que este aparelho nunca viu entra nas SALVAS ("Da conta"), sem trocar a equipada', r3)
            await bC.close()
            # QUAL PROGRESSO FICA? de verdade: a conta com uma tampinha de "outro aparelho" (versão mais nova) e uma criada aqui que
            # não foi (o envio parado um instante) → O DA CONTA → o jogo abre de novo → as duas ficam aqui e vão para a conta
            await asyncio.sleep(2)
            linha = PL.sql("SELECT p.usuario_id, p.versao, p.dados FROM progresso_jogo p JOIN usuarios u ON u.id = p.usuario_id WHERE u.username = 'jadepicon'")[0]
            d = json.loads(linha['dados']) if isinstance(linha['dados'], str) else linha['dados']
            tp = json.loads(d['chaves']['racha-tampa-v1'])
            c5 = await rt(A, "(() => { const D = TP_PADRAO_D(); D.b = 'bt'; D.bc = ['#f7f7f3', '#1d1d1d']; D.p = 'bo'; D.pc = ['#7a3fc4', '#ffffff', '#000000']; D.i = '--'; return tpCodigo(tpNorm(D)); })()")
            tp['salvas'].insert(0, {'c': c5, 'n': 'Do celular', 'f': False, 't': int(time.time()*1000) - 5000})
            d['chaves']['racha-tampa-v1'] = json.dumps(tp)
            PL.sql("UPDATE progresso_jogo SET versao = ?, dados = ? WHERE usuario_id = ?", [linha['versao'] + 1, json.dumps(d), linha['usuario_id']])
            await rt(A, "(() => { window.__c82 = C82.conta; C82.conta = null; return 1; })()")
            c4 = await cria(A, '#ff6a00', 'Laranja')
            await asyncio.sleep(1.6)
            # (os navegadores B e C entraram na mesma conta: o servidor das salas avisa A do "ABERTO EM OUTRA ABA" — a janela sai da frente)
            await rt(A, "(() => { if (!LB.pop.hidden && !/QUAL PROGRESSO FICA/.test(LB.popCaixa.textContent)) fechaPop(); C82.conta = window.__c82; c82Envia(false); return 1; })()")
            pergunta = await espera(A, "(() => { if (!LB.pop.hidden && !/QUAL PROGRESSO FICA/.test(LB.popCaixa.textContent)) fechaPop(); return !LB.pop.hidden && /QUAL PROGRESSO FICA/.test(LB.popCaixa.textContent) ? 1 : 0; })()", 10000)
            await rt(A, "(() => { const b = [...document.querySelectorAll('#pop-caixa .pop-acoes button')].find(x => x.textContent === 'O DA CONTA'); if (b) b.click(); return 1; })()")
            await asyncio.sleep(2.5)
            await pronto(A)
            r4 = await rt(A, "({eq: TP.equipada, salvas: TP.salvas.map(s => s.n), c4: %s, meta: R82.meta, est: C82.estado, erro: C82.erro, bloq: C82.bloqueio, nuvem: R82.nuvem === undefined ? 'undef' : 'ok'})" % json.dumps(c4))
            t, dt = await espera_nuvem(PL, 'jadepicon', lambda t: {'Laranja', 'Do celular', 'Azul', 'Vermelha'} <= {s['n'] for s in t.get('salvas', [])} and t.get('equipada') == c4, 12000)
            P.confere(pergunta and {'Laranja', 'Do celular', 'Azul', 'Vermelha'} <= set(r4['salvas']) and r4['eq'] == c4,
                      'QUAL PROGRESSO FICA? › O DA CONTA (o jogo abre de novo): fica a criada aqui (equipada) e a do outro aparelho', r4)
            P.confere(dt is not None, 'e as duas vão para a conta logo depois', t)
            await bA.close()
    finally:
        PL.desce()

    js = [e for l in erros_todos for e in l if 'Failed to load resource' not in e]
    P.confere(not js, 'nenhum erro de JavaScript', js[:4])
    return P.fim()


if __name__ == '__main__':
    sys.exit(asyncio.run(principal()))
