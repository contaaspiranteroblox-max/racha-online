"""RACHA v106 · O COFRE NO ESTILO DAS FOTOS (tools/v106/cofre.js) — passa/falha, no navegador:
  1) a tela: as 6 abas (CARTÕES · SKIN · EMOJI · ESCUDO DO CLUBE · BOLA · MAIS, com o papel de aba e a escolhida acesa), o
     pedestal de cada uma (a peça grande, o botão de cima e a placa do nome; o SEM CLUBE no escudo), as sub-abas do MAIS, o
     teclado (as setas trocam de aba e o foco fica à vista) e os caminhos de sempre abrindo o COFRE novo (o atalho do lobby, o
     toque na tampinha grande, o "+ FAVORITA" da RODA, o v90AbreCofre com a categoria antiga e o abreTela);
  2) a SKIN sem conta: o CRIAR PERSONALIZADO abre o editor e o VOLTAR volta ao COFRE; equipar uma tampinha salva (o check e o
     pedestal mudam, nos pixels); a ★ das favoritas da RODA; o aviso das prontas escondidas; o EMOJI NA TAMPINHA (equipar um
     de graça); a tampinha do catálogo À VENDA aparece sozinha (com o cadeado e o preço), mesmo com as prontas escondidas, e
     não conta como pronta; a janelinha do bloqueado sem conta explica que precisa entrar (sem COMPRAR);
  3) a aba EMOJI: sem a window.RachaEmotes106, o aviso "chegam na próxima versão" (sem erro); com a API de verdade, quando ela
     já veio na junção (a grade, a cruz, pôr um emoji e o PADRÃO); com uma API falsa (20 círculos coloridos), a cruz dos 5
     lugares, escolher o lugar, pôr um emoji, o mudou() refazendo a cruz e o PADRÃO;
  4) o ESCUDO DO CLUBE neste aparelho: sem clube (SEM CLUBE, o IR PARA O CLUBE e a volta ao COFRE) e com o clube pessoal (o
     escudo no pedestal, VOCÊ É O DONO, trocar por um de graça, o bloqueado com as peças: FALTA e depois COMPRAR E USAR);
  5) tudo cabe e é tocável em 1280×720, 1920×1080, 844×390, 667×375, 568×320 e no iPhone com o entalhe (844×390 com as áreas
     seguras): nada fora da tela, as abas inteiras, a página sem rolar (só a grade rola), nenhum cartão em cima de outro e o
     meio de cada cartão à vista é dele; as capturas de cada aba em 1280×720 e 844×390 (tests/saida/v106_cofre_<aba>_<tamanho>.png;
     a EMOJI também sem a API — emoji_sem_api — e, no ramo sem os emojis da partida, com a falsa — emoji_api_falsa);
  6) com a conta (a plataforma de teste): comprar uma bola pela janelinha (o servidor tira as moedas e entrega; o cadeado sai),
     equipar (o check, o pedestal e o servidor), equipar uma tampinha salva, o escudo do clube da conta trocado pelo dono (no
     servidor) e, noutro navegador, o membro que não é dono vendo quem pode;
  7) nenhum erro de JavaScript.
  python3 tests/v106_cofre_test.py"""
import asyncio, json, os, sys, tempfile, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from comum import Placar, abre, rt, async_playwright, HARNESS, RAIZ, CHROME, FONTES, PAGINA, clica_lobby
from v88_cliente_test import Plataforma, conta, espera

SAIDA = RAIZ / 'tests' / 'saida'; SAIDA.mkdir(exist_ok=True)
ABAS = ['cartoes', 'skin', 'emoji', 'escudo', 'bola', 'mais']
ROTULOS = ['CARTÕES', 'SKIN', 'EMOJI', 'ESCUDO DO CLUBE', 'BOLA', 'MAIS']

ESTADO = r"""(() => {
  const T = document.getElementById('tela-cofre'), lado = T.querySelector('.cf106-lado');
  const tx = (sel, raiz) => { const e = (raiz || T).querySelector(sel); return e ? e.textContent.trim() : ''; };
  return {aberta:lobby.tela === 'cofre' && !T.hidden, aba:RachaCofre106.aba(), sub:RachaCofre106.sub(),
    abas:[...T.querySelectorAll('.cf106-aba')].map(b => ({id:b.dataset.aba, t:b.textContent.trim(), on:b.getAttribute('aria-selected') === 'true', role:b.getAttribute('role'), tab:b.tabIndex})),
    lista:(T.querySelector('.cf106-abas') || {}).getAttribute ? T.querySelector('.cf106-abas').getAttribute('role') : '',
    topo:tx('.cf106-topo-bt', lado), peca:!!lado.querySelector('.cf106-peca > canvas, .cf106-peca > .cf106-cartao, .cf106-peca > .cf106-cruz'),
    cartao:!!lado.querySelector('.cf106-cartao'), cruz:lado.querySelectorAll('.cf106-lugar').length, pedestal:!!lado.querySelector('.cf106-pedestal'),
    placa:tx('.cf106-placa b', lado), placaSub:tx('.cf106-placa small', lado), vazio:tx('.cf106-vazio', lado),
    cartas:T.querySelectorAll('.cf106-card').length, cad:T.querySelectorAll('.cf106-card > .cf106-cad').length, check:T.querySelectorAll('.cf106-card > .cf106-check').length,
    criar:!!T.querySelector('.cf106-criar'), dica:tx('.cf106-dica'), subs:[...T.querySelectorAll('.cf106-sub-bt')].map(b => b.textContent.trim()),
    secoes:[...T.querySelectorAll('.cf106-secao h3')].map(h => h.textContent.trim()), aviso:tx('.cf106-aviso b'), nota:!!T.querySelector('.v101-cofre-nota'),
    exclusivas:T.querySelectorAll('.cf106-card.exclusiva').length, cf90:T.querySelectorAll('.cf90, .cf90-tp').length};
})()"""

# tudo cabe e é tocável (sa = as áreas seguras): o que sai da tela, as abas cortadas, a página rolando, o lado cortado, os
# cartões cobertos ou um em cima do outro e os tamanhos de verdade (px) do menor cartão, da menor aba e dos botões do lado
CABE = r"""((sa) => {
  const T = document.getElementById('tela-cofre'), vw = innerWidth, vh = innerHeight, R = e => e.getBoundingClientRect();
  const corpo = T.querySelector('.tl-corpo'), base = T.querySelector('.cf106'), lado = T.querySelector('.cf106-lado'), dir = T.querySelector('.cf106-dir');
  const rola = T.querySelector('.cf106-rola'), abas = T.querySelector('.cf106-abas');
  const fora = [], dentro = (r, nome) => { if (r.width < 1) return; if (r.left < sa.l - 1 || r.top < sa.t - 1 || r.right > vw - sa.r + 1 || r.bottom > vh - sa.b + 1) fora.push(nome + ' ' + [r.left, r.top, r.right, r.bottom].map(Math.round).join(',')); };
  dentro(R(T.querySelector('.tl-cab')), 'faixa'); dentro(R(abas), 'abas'); dentro(R(rola), 'grade');
  for (const el of lado.querySelectorAll('.cf106-topo-bt, .cf106-peca, .cf106-pedestal, .cf106-placa, .cf106-vazio, .cf106-lugar')) dentro(R(el), 'lado:' + el.className.split(' ')[0]);
  for (const el of T.querySelectorAll('.cf106-sub-bt, .cf106-dica')) dentro(R(el), el.className.split(' ')[0]);
  const ra = R(abas), cortadas = [...abas.querySelectorAll('.cf106-aba')].filter(b => { const rb = R(b), s = b.querySelector('span'); return rb.left < ra.left - 1 || rb.right > ra.right + 1 || (s && s.getBoundingClientRect().width > rb.width + 1); }).map(b => b.dataset.aba);
  const rolam = [corpo, base, lado, dir].filter(e => e.scrollHeight > e.clientHeight + 2 || e.scrollWidth > e.clientWidth + 2).map(e => e.className.split(' ')[0] + ' ' + e.clientWidth + 'x' + e.clientHeight + '→' + e.scrollWidth + 'x' + e.scrollHeight);
  const rl = R(lado), ladoCorta = [...lado.children].filter(e => { const r = R(e); return r.height > 1 && (r.top < rl.top - 2 || r.bottom > rl.bottom + 2 || r.left < rl.left - 2 || r.right > rl.right + 2); }).map(e => e.className.split(' ')[0]);
  const rr = R(rola), bts = [...T.querySelectorAll('.cf106-card-bt')], cobertos = []; let tocaveis = 0, vistos = 0;
  for (const b of bts){
    const r = R(b); if (r.bottom < rr.top + 6 || r.top > rr.bottom - 6) continue;
    vistos++;
    const cx = r.left + r.width/2, cy = Math.max(rr.top + 3, Math.min(rr.bottom - 3, r.top + r.height/2)), e = document.elementFromPoint(cx, cy);
    if (e && (e === b || b.contains(e))) tocaveis++; else cobertos.push((b.getAttribute('aria-label') || '').slice(0, 30) + ' @' + Math.round(cx) + ',' + Math.round(cy) + ' → ' + (e ? (e.className || e.tagName) : 'nada'));
  }
  const outros = [...T.querySelectorAll('.cf106-aba, .cf106-sub-bt, .cf106-topo-bt, .cf106-lugar:not(:disabled), .tl-voltar')].filter(b => R(b).width > 1);
  for (const b of outros){
    const r = R(b), e = document.elementFromPoint(r.left + r.width/2, r.top + r.height/2);
    if (!(e && (e === b || b.contains(e)))) cobertos.push((b.getAttribute('aria-label') || b.className).slice(0, 30) + ' → ' + (e ? (e.className || e.tagName) : 'nada'));
  }
  const cs = bts.map(R); let sobre = 0;
  for (let i = 0; i < cs.length; i++) for (let j = i + 1; j < cs.length; j++){ const a = cs[i], c = cs[j]; if (a.left < c.right - 1 && a.right > c.left + 1 && a.top < c.bottom - 1 && a.bottom > c.top + 1) sobre++; }
  const menor = l => l.length ? Math.round(Math.min(...l)) : 0;
  return {fora:fora.slice(0, 6), cortadas, rolam, ladoCorta, cobertos:cobertos.slice(0, 5), sobre, vistos, tocaveis, rolaGrade:rola.scrollHeight > rola.clientHeight + 2,
    oy:getComputedStyle(rola).overflowY, cartaPx:menor(bts.map(b => R(b).width)), abaPx:menor([...abas.querySelectorAll('.cf106-aba')].map(b => R(b).height)),
    ladoPx:menor([...lado.querySelectorAll('.cf106-topo-bt, .cf106-lugar:not(:disabled)')].map(b => Math.min(R(b).width, R(b).height)))};
})"""

# a API falsa dos emojis da partida (20 círculos coloridos com o número): a mesma forma da que vem na junção
FALSO = r"""(() => {
  const cores = ['#ff5a4f','#ffd23f','#3bc9db','#69db7c','#a259f0','#ff8a2a','#3f8cff','#f06595','#94d82d','#ffa94d','#748ffc','#20c997','#e64980','#fab005','#15aabf','#82c91e','#be4bdb','#fd7e14','#4c6ef5','#12b886'];
  const L = []; for (let i = 0; i < 20; i++) L.push({id:'e' + i, nome:'Emoji ' + (i + 1)});
  const PAD = ['e0', 'e1', 'e2', 'e3', 'e4']; let S = PAD.slice(); const ouv = [];
  window.__emo = {desenhos:0, avisos:0};
  window.RachaEmotes106 = {
    lista:() => L.map(x => Object.assign({}, x)),
    desenha:(g, id, cx, cy, r) => { window.__emo.desenhos++; const i = +String(id).slice(1); g.fillStyle = cores[i % cores.length]; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI*2); g.fill();
      g.fillStyle = '#111'; g.font = 'bold ' + Math.round(r) + 'px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(i + 1), cx, cy); },
    slots:() => S.slice(), poeSlot:(i, id) => { S[i] = id; for (const f of ouv){ window.__emo.avisos++; f(); } },
    padrao:() => { S = PAD.slice(); for (const f of ouv){ window.__emo.avisos++; f(); } return S.slice(); }, mudou:fn => { ouv.push(fn); }};
  return true; })()"""

# tirar a API um instante (a EMOJI sem os emojis da partida) e devolver a de verdade, se houver (depois da junção ela existe)
SEM_API = "(() => { if (window.RachaEmotes106 && !window.__emoGuardada) window.__emoGuardada = window.RachaEmotes106; delete window.RachaEmotes106; return 1; })()"
VOLTA_API = "(() => { if (window.__emoGuardada) window.RachaEmotes106 = window.__emoGuardada; window.__emoGuardada = null; return !!window.RachaEmotes106; })()"
# uma tampinha lisa de uma cor só (sem ícone): o meio do desenho é a cor
LISA = "((cor) => { const D = TP_PADRAO_D(); D.p = 'li'; D.pc = [cor, '#ffffff', '#000000']; D.i = '--'; return tpCodigo(tpNorm(D)); })"
# a cor do meio da peça do pedestal
MEIO = "(() => { const c = document.querySelector('#tela-cofre .cf106-lado .cf106-peca > canvas'); if (!c) return null; const g = c.getContext('2d'); return Array.from(g.getImageData(Math.round(c.width/2), Math.round(c.height/2), 1, 1).data); })()"


def perto(p, cor, tol=60):
    if not p: return False
    alvo = [int(cor[i:i + 2], 16) for i in (1, 3, 5)]
    return p[3] > 200 and all(abs(p[i] - alvo[i]) <= tol for i in range(3))


async def clica(pg, k):
    """Clica (o Playwright, de verdade) no botão do COFRE com o data-k (rola até ele antes)."""
    sel = '#tela-cofre [data-k=%s]' % json.dumps(k)
    await pg.locator(sel).first.scroll_into_view_if_needed(timeout=3000)
    await pg.click(sel, timeout=3000)
    await asyncio.sleep(.25)


async def pop(pg):
    return await rt(pg, "({aberto:!LB.pop.hidden, cls:LB.popCaixa.className, tx:LB.popCaixa.textContent.replace(/\\s+/g, ' ').trim(), bts:[...LB.popCaixa.querySelectorAll('.pop-acoes button')].map(b => ({t:b.textContent.trim(), d:b.disabled}))})")


async def abre_ins(pw, w, h, ins):
    """O jogo com as áreas seguras de um iPhone (o entalhe), como no tests/v103_tela_test.py."""
    b = await pw.chromium.launch(executable_path=CHROME, args=['--no-sandbox', '--autoplay-policy=no-user-gesture-required'])
    ctx = await b.new_context(viewport={'width': w, 'height': h}, has_touch=True)
    await ctx.add_init_script("document.addEventListener('DOMContentLoaded',()=>{const s=document.createElement('style');s.textContent=%s;document.head.prepend(s);});" % json.dumps(FONTES))
    await ctx.add_init_script('window.RACHA_CONFIG = {presente:false};')
    pg = await ctx.new_page()
    erros = []
    pg.on('pageerror', lambda e: erros.append(str(e)[:300]))
    pg.on('console', lambda m: erros.append('console: ' + m.text[:200]) if m.type == 'error' else None)
    cdp = await ctx.new_cdp_session(pg)
    await cdp.send('Emulation.setSafeAreaInsetsOverride', {'insets': ins})
    await pg.goto(PAGINA.resolve().as_uri())
    await pg.wait_for_function('() => typeof window.__RT === "function"', polling=100, timeout=20000)
    await pg.wait_for_timeout(600)
    await pg.evaluate("(() => { const o = document.getElementById('onb'); if (o) o.hidden = true; })()")
    await pg.evaluate("(() => { const b = [...document.querySelectorAll('#v84auth button')].find(x => /TREINAR OFFLINE/.test(x.textContent || '')); if (b) b.click(); })()")
    await pg.wait_for_timeout(150)
    await rt(pg, HARNESS)
    return b, pg, erros


async def navegador(pw, PL, usuario, erros, w=1280, h=720):
    b = await pw.chromium.launch(executable_path=CHROME, args=['--no-sandbox', '--autoplay-policy=no-user-gesture-required'])
    ctx = await b.new_context(viewport={'width': w, 'height': h}, has_touch=True)
    await ctx.add_init_script("document.addEventListener('DOMContentLoaded',()=>{const s=document.createElement('style');s.textContent=%s;document.head.prepend(s);});" % json.dumps(FONTES))
    await ctx.add_init_script('window.RACHA_CONFIG = {presente:false};')
    pg = await ctx.new_page()
    pg.on('pageerror', lambda e: erros.append(str(e)[:300]))
    pg.on('console', lambda m: erros.append('console: ' + m.text[:200]) if m.type == 'error' and 'Failed to load resource' not in m.text else None)
    await pg.goto(PL.base + '/tests/build/racha_teste.html')
    await pg.wait_for_selector('#v84auth input[autocomplete="username"]', timeout=20000)
    await pg.fill('#v84auth input[autocomplete="username"]', usuario)
    await pg.fill('#v84auth input[type="password"]', 'senha1234')
    await pg.click('#v84auth .v84-go')
    t0 = time.time()                                        # (a primeira entrada recarrega a página: o aparelho passa a ser desta conta)
    while time.time() - t0 < 25:
        try:
            if await pg.evaluate('() => typeof window.__RT === "function" && !!window.__RT("v88Logado() && lobby.aberto && V88.carteiraOk && !C82.recarrega && !C82.bloqueio")'): break
        except Exception: pass
        await asyncio.sleep(.3)
    await asyncio.sleep(1)
    await rt(pg, "(() => { if (typeof ONB !== 'undefined' && (ONB.aberto || ONB.aquece)) onbFim(); const o = document.getElementById('onb'); if (o) o.hidden = true; if (!LB.pop.hidden) fechaPop(); return 1; })()")
    await rt(pg, HARNESS)
    return b, pg


async def principal():
    P = Placar('v106 · o COFRE no estilo das fotos')
    erros_todos = []
    async with async_playwright() as pw:
        # ---------------------------------------------------------------- 1) a tela, as abas e os caminhos de sempre
        print('\n1) a tela nova: as 6 abas, o pedestal de cada uma e os caminhos que abrem o COFRE')
        b, pg, erros = await abre(pw, 1280, 720)
        erros_todos.append(erros)
        await clica_lobby(pg, '#rx [data-rx="cofre"]')
        await asyncio.sleep(.5)
        e = await rt(pg, ESTADO)
        P.confere(e['aberta'] and e['aba'] == 'skin', 'o atalho COFRE do lobby abre o COFRE novo na aba SKIN', e)
        P.confere([a['t'] for a in e['abas']] == ROTULOS and [a['id'] for a in e['abas']] == ABAS, 'as 6 abas, nesta ordem: ' + ' · '.join(ROTULOS), [a['t'] for a in e['abas']])
        P.confere(e['lista'] == 'tablist' and all(a['role'] == 'tab' for a in e['abas']) and [a['on'] for a in e['abas']] == [x == 'skin' for x in ABAS]
                  and [a['tab'] for a in e['abas']] == [0 if x == 'skin' else -1 for x in ABAS], 'as abas com o papel de aba (tablist/tab, a escolhida com aria-selected e o Tab)', e['abas'])
        P.confere(e['cf90'] == 0, 'o desenho antigo da v90 (a coluna de categorias) não aparece mais', e['cf90'])
        ped = {}
        for a in ABAS:
            if a == 'emoji': await rt(pg, SEM_API)                   # (a EMOJI sem a API: como no ramo sem os emojis da partida)
            await clica(pg, 'aba:' + a)
            ped[a] = await rt(pg, ESTADO)
            if a == 'emoji': await rt(pg, VOLTA_API)
        s, c, em, es, bo, ma = (ped[x] for x in ABAS)
        P.confere(all(ped[x]['aba'] == x and [t['on'] for t in ped[x]['abas']] == [y == x for y in ABAS] for x in ABAS), 'tocar em cada aba troca a aba (e só ela fica acesa)', {x: ped[x]['aba'] for x in ABAS})
        P.confere(s['cartao'] and s['pedestal'] and s['placa'] == 'Laje Noturna' and 'CARTÃO' in s['placaSub'] and s['check'] >= 1 and s['cartas'] >= 10,
                  'CARTÕES: o cartão equipado (o banner com a tampinha e o nome) no pedestal, a placa e a grade dos banners', s)
        P.confere(c['topo'] == 'ALTERAR AVATAR' and c['peca'] and c['pedestal'] and c['placa'] == await rt(pg, 'perfil.nome') and c['criar'],
                  'SKIN: a tampinha grande no pedestal, o ALTERAR AVATAR em cima, o nome do jogador na placa e o CRIAR PERSONALIZADO', c)
        P.confere('EMOJI NA TAMPINHA' in c['secoes'] and c['nota'] and c['exclusivas'] == 0, 'SKIN: a parte EMOJI NA TAMPINHA, o aviso das prontas escondidas e nenhuma exclusiva', c['secoes'])
        P.confere(em['cruz'] == 5 and not em['pedestal'] and 'próxima versão' in em['aviso'], 'EMOJI sem a API: a cruz dos 5 lugares (apagada) e o aviso "chegam na próxima versão"', em)
        P.confere(es['vazio'] == 'SEM CLUBE' and es['topo'] == 'IR PARA O CLUBE' and es['cartas'] == await rt(pg, 'TP_PRE_ESCUDO.length'),
                  'ESCUDO DO CLUBE sem clube: SEM CLUBE, o IR PARA O CLUBE e os escudos prontos', es)
        P.confere(bo['peca'] and bo['pedestal'] and bo['placa'] == 'Clássica' and bo['cartas'] == await rt(pg, "CAT88.itens.filter(i => i.tipo === 'bola').length") and bo['check'] == 1,
                  'BOLA: a bola equipada no pedestal (Clássica) e todas as bolas do catálogo, com o check na equipada', bo)
        P.confere(ma['subs'] == ['AVATARES', 'EFEITOS', 'COMEMORAÇÕES', 'GOLS'] and ma['peca'] and ma['placa'] == 'Minha tampinha', 'MAIS: as sub-abas AVATARES · EFEITOS · COMEMORAÇÕES · GOLS e o avatar no pedestal', ma)
        subs = []
        for sb in ['efeitos', 'comemoracoes', 'gols', 'avatares']:
            await clica(pg, 'sub:' + sb)
            x = await rt(pg, ESTADO); subs.append((sb, x['sub'], x['placa'], x['cartas'], x['check']))
        tipos = await rt(pg, "['efeito', 'comemoracao', 'gol', 'avatar'].map(t => CAT88.itens.filter(i => i.tipo === t).length)")
        P.confere(all(x[0] == x[1] and x[3] == n and x[4] == 1 for x, n in zip(subs, tipos)), 'cada sub-aba do MAIS com os itens dela e o check no equipado (o padrão)', subs)
        # o cadeado no que não é seu (sem conta) e o preço no cartão
        await clica(pg, 'aba:bola')
        cad = await rt(pg, "(() => { const c = document.querySelector('#tela-cofre [data-k=\"it:bola_rua\"]').closest('.cf106-card'); return {cad:!!c.querySelector(':scope > .cf106-cad'), preco:(c.querySelector('.v88-preco') || {}).textContent || '', rar:c.dataset.r, cor:getComputedStyle(c).getPropertyValue('--r').trim()}; })()")
        P.confere(cad['cad'] and '1.500' in cad['preco'] and cad['rar'] == 'comum' and cad['cor'], 'o bloqueado com o CADEADO no canto, o preço embaixo e a faixinha da raridade', cad)
        # o teclado: as setas andam pelas abas e o foco fica à vista
        await pg.focus('#cf106-aba-bola')
        await pg.keyboard.press('ArrowRight'); await asyncio.sleep(.25)
        k1 = await rt(pg, "({aba:RachaCofre106.aba(), foco:document.activeElement && document.activeElement.id, contorno:getComputedStyle(document.activeElement).outlineStyle, w:getComputedStyle(document.activeElement).outlineWidth})")
        await pg.keyboard.press('ArrowLeft'); await pg.keyboard.press('ArrowLeft'); await asyncio.sleep(.25)
        k2 = await rt(pg, "({aba:RachaCofre106.aba(), foco:document.activeElement && document.activeElement.id})")
        await pg.keyboard.press('Tab'); await asyncio.sleep(.15)
        k3 = await rt(pg, "(() => { const a = document.activeElement; return {k:a && a.dataset.k, contorno:getComputedStyle(a).outlineStyle, rot:a && a.getAttribute('aria-label')}; })()")
        P.confere(k1['aba'] == 'mais' and k1['foco'] == 'cf106-aba-mais' and k1['contorno'] != 'none' and k2['aba'] == 'escudo' and k2['foco'] == 'cf106-aba-escudo',
                  'o teclado: a seta → e ← trocam de aba e o foco vai junto (com o contorno à vista)', [k1, k2])
        P.confere(bool(k3['k']) and k3['contorno'] != 'none' and bool(k3['rot']), 'o Tab sai das abas para os botões da tela (com aria-label e o contorno à vista)', k3)
        # os caminhos de sempre
        cam = await rt(pg, r"""(() => { const r = {};
          fechaTela(); v90AbreCofre('bolas'); r.bolas = [lobby.tela, RachaCofre106.aba()];
          fechaTela(); v90AbreCofre('avatares'); r.avatares = [lobby.tela, RachaCofre106.aba(), RachaCofre106.sub()];
          fechaTela(); v90AbreCofre('banners'); r.banners = [lobby.tela, RachaCofre106.aba()];
          fechaTela(); v90AbreCofre('emotes'); r.emotes = [lobby.tela, RachaCofre106.aba()];
          fechaTela(); abreTela('cofre'); r.direto = [lobby.tela, RachaCofre106.aba()];
          fechaTela(); v90RodaEscolhe(null); r.roda = [lobby.tela, RachaCofre106.aba()];
          fechaTela(); RachaCofre106.vai('bola'); return r; })()""")
        await rt(pg, "(() => { if (lobby.tela) fechaTela(); return 1; })()")
        await asyncio.sleep(.2)
        await pg.click('#lb-emblema'); await asyncio.sleep(.4)
        cam['tampinha'] = await rt(pg, "[lobby.tela, RachaCofre106.aba()]")
        P.confere(cam['bolas'] == ['cofre', 'bola'] and cam['avatares'] == ['cofre', 'mais', 'avatares'] and cam['banners'] == ['cofre', 'cartoes'] and cam['emotes'] == ['cofre', 'emoji'],
                  'o v90AbreCofre(categoria antiga) abre a aba nova (bolas → BOLA, avatares → MAIS › AVATARES, banners → CARTÕES, emotes → EMOJI)', cam)
        P.confere(cam['direto'][0] == 'cofre' and cam['roda'] == ['cofre', 'skin'] and cam['tampinha'] == ['cofre', 'skin'],
                  'o abreTela(\'cofre\'), o "+ FAVORITA" da RODA e o toque na tampinha grande do lobby abrem o COFRE novo (a RODA e a tampinha na SKIN)', cam)

        # ---------------------------------------------------------------- 2) a SKIN sem conta
        print('\n2) a SKIN sem conta: criar, equipar, favoritas, o emoji na tampinha e as tampinhas à venda')
        await clica(pg, 'criar')
        await asyncio.sleep(.4)
        ed = await rt(pg, "({tela:lobby.tela, volta:lobby.volta})")
        await rt(pg, "(() => { ED.saindo = true; fechaTela(); ED.saindo = false; return 1; })()")
        await asyncio.sleep(.4)
        ed2 = await rt(pg, "({tela:lobby.tela, aba:RachaCofre106.aba()})")
        P.confere(ed['tela'] == 'skins' and ed['volta'] == 'cofre' and ed2 == {'tela': 'cofre', 'aba': 'skin'}, 'o CRIAR PERSONALIZADO abre o editor da tampinha e o VOLTAR volta ao COFRE (na SKIN)', [ed, ed2])
        c1 = await rt(pg, LISA + "('#ff6a00')"); c2 = await rt(pg, LISA + "('#16a34a')")
        await rt(pg, "(() => { TP.salvas = [{c:%s, n:'Laranja Teste', f:false}, {c:%s, n:'Verde Teste', f:false}].concat(TP.salvas || []); tpSalva(); v88Repinta('cofre'); return 1; })()" % (json.dumps(c1), json.dumps(c2)))
        await asyncio.sleep(.3)
        antes = await rt(pg, MEIO)
        await clica(pg, 'tp:' + c1)
        depois = await rt(pg, MEIO)
        q = await rt(pg, "(() => { const b = document.querySelector('#tela-cofre [data-k=\"tp:%s\"]'); return {minha:tpMinha(), atual:b.getAttribute('aria-current'), check:!!b.closest('.cf106-card').querySelector(':scope > .cf106-check'), placa:document.querySelector('#tela-cofre .cf106-placa small').textContent, checks:document.querySelectorAll('#tela-cofre .cf106-grade-tp .cf106-card > .cf106-check').length}; })()" % c1)
        P.confere(q['minha'] == c1 and q['atual'] == 'true' and q['check'] and q['checks'] == 1 and 'LARANJA TESTE' in q['placa'], 'tocar numa tampinha salva: equipa na hora (o check vai para ela e a placa diz o nome)', q)
        P.confere(perto(depois, '#ff6a00') and not perto(antes, '#ff6a00'), 'o pedestal muda: o meio da tampinha grande fica laranja (nos pixels)', [antes, depois])
        await clica(pg, 'fav:' + c2)
        f = await rt(pg, "({f:TP.salvas.find(s => s.c === %s).f, n:v90Favoritas().length, dica:document.querySelector('#tela-cofre .cf106-dica').textContent, on:document.querySelector('#tela-cofre [data-k=\"fav:%s\"]').getAttribute('aria-pressed')})" % (json.dumps(c2), c2))
        P.confere(f['f'] is True and f['n'] == 1 and '1/3' in f['dica'] and f['on'] == 'true', 'a ★ marca a favorita da RODA (a mesma lista de sempre: 1/3)', f)
        # o EMOJI NA TAMPINHA (os da v95): equipar um de graça sem conta
        gid = await rt(pg, "emjOrdem().find(id => id !== 'emoji_nenhum' && emjItem(id).gratis)")
        await clica(pg, 'it:' + gid)
        g = await rt(pg, "({eq:emjEquipado(), check:!!document.querySelector('#tela-cofre [data-k=\"it:%s\"]').closest('.cf106-card').querySelector(':scope > .cf106-check')})" % gid)
        P.confere(g['eq'] == gid and g['check'], 'EMOJI NA TAMPINHA: um de graça equipa sem conta (o check nele; vai no meio da tampinha)', [gid, g])
        # (aberto do arquivo, sem o servidor do RACHA: é a demonstração — os emojis da tampinha com as moedas do aparelho, como na v95)
        trava = await rt(pg, "emjOrdem().find(id => !emjTem(id) && (emjItem(id).moedas | 0) > 500 && !(emjItem(id).gemas | 0))")
        await clica(pg, 'it:' + trava)
        j = await pop(pg)
        P.confere(j['aberto'] and 'cf106-pop' in j['cls'] and 'Faltam' in j['tx'] and any(x['t'] == 'COMPRAR' and x['d'] for x in j['bts']),
                  'o emoji bloqueado na demonstração (sem servidor): a janelinha com o preço e o COMPRAR desligado (faltam moedas do aparelho)', j)
        await rt(pg, "(() => { fechaPop(); CONTA.moedas = 5000; contaSalvar(); v88Repinta('cofre'); return 1; })()")
        await clica(pg, 'it:' + trava)
        await rt(pg, "(() => { [...LB.popCaixa.querySelectorAll('.pop-acoes button')].find(x => x.textContent === 'COMPRAR').click(); return 1; })()")
        await asyncio.sleep(.3)
        cmp = await rt(pg, "({tem:emjTem(%s), moedas:CONTA.moedas, preco:emjItem(%s).moedas, pop:!LB.pop.hidden && /COMPRADO/.test(LB.popCaixa.textContent)})" % (json.dumps(trava), json.dumps(trava)))
        await rt(pg, "(() => { const b = [...LB.popCaixa.querySelectorAll('.pop-acoes button')].find(x => x.textContent === 'EQUIPAR AGORA'); if (b) b.click(); return 1; })()")
        await asyncio.sleep(.3)
        cmp['eq'] = await rt(pg, "emjEquipado() === %s && !!document.querySelector('#tela-cofre [data-k=\"it:%s\"]').closest('.cf106-card').querySelector(':scope > .cf106-check')" % (json.dumps(trava), trava))
        P.confere(cmp['tem'] and cmp['pop'] and cmp['moedas'] == 5000 - cmp['preco'] and cmp['eq'], 'na demonstração: COMPRAR com as moedas do aparelho (a compra da v95, sem a segunda pergunta) e EQUIPAR AGORA (o check)', cmp)
        # a tampinha do catálogo À VENDA (como as skins novas que entram no catalogo88.json): aparece sozinha
        venda = await rt(pg, r"""(() => {
          CAT88.itens.push({id:'tp_v106_teste', tipo:'tampinha', nome:'Skin de Teste', raridade:'raro', moedas:900, gemas:0, desc:'Só para o teste.',
            visual:{d:{p:'li', pc:['#2255ff', '#ffffff', '#000000'], b:'dt', bc:['#ffffff', '#000000'], i:'--'}}});
          v88Repinta('cofre');
          const cod = tpCodigo(tpNorm(tpD(CAT88.itens[CAT88.itens.length - 1].visual.d))), b = document.querySelector('#tela-cofre [data-k="it:tp_v106_teste"]'), card = b && b.closest('.cf106-card');
          // (a lista das prontas da v101 refeita com o catálogo novo: a de antes, sozinha, chamaria a à venda de "pronta")
          V101S.set = null; if (V101S.memo) V101S.memo.clear();
          const excl = tpCodigo(tpNorm(tpD(v88Item('tp_t1_rua').visual.d))), antes = TP.equipada;
          const r = {esconde:RachaSemSkins101.esconde(), secao:[...document.querySelectorAll('#tela-cofre .cf106-secao h3')].map(h => h.textContent), card:!!card, cad:!!(card && card.querySelector(':scope > .cf106-cad')),
            preco:card ? (card.querySelector('.v88-preco') || {}).textContent : '', original:RachaSemSkins101.ehPronta(cod), pronta:v101EhPronta(cod), escondida:v101Esconde(cod),
            exclusivaEscondida:v101Esconde(excl), lista:RachaCofre106.aVenda(),
            // (todas as tampinhas do catálogo à venda — a de teste e as que vierem no catalogo88.json — e os cartões delas na parte À VENDA)
            catalogo:CAT88.itens.filter(i => i.tipo === 'tampinha' && i.venda !== false && (i.gratis || (i.moedas | 0) > 0 || (i.gemas | 0) > 0)).map(i => i.id),
            cartoes:[...document.querySelectorAll('#tela-cofre .cf106-secao + .cf106-grade-tp .cf106-card-bt')].map(b => b.dataset.k.slice(3))};
          r.equipa = tpEquipa(cod) && tpMinha() === cod && tpSkin(cod).id === cod;     // (a v101 deixa equipar e desenhar a à venda)
          TP.equipada = antes; tpSalva(); v88Repinta('cofre');
          return r; })()""")
        P.confere(venda['esconde'] and 'À VENDA' in venda['secao'] and venda['card'] and venda['cad'] and venda['preco'] == '900' and 'tp_v106_teste' in venda['lista'] and sorted(venda['lista']) == sorted(venda['catalogo']) == sorted(venda['cartoes']),
                  'a tampinha do catálogo à venda aparece sozinha na SKIN (À VENDA, com o cadeado e o preço), mesmo com as prontas escondidas', venda)
        P.confere(venda['original'] is True and venda['pronta'] is False and venda['escondida'] is False and venda['equipa'] and venda['exclusivaEscondida'] is True,
                  'a tampinha à venda não conta como "pronta" (a lista da v101 a pegaria; ela equipa e é desenhada); a exclusiva do passe continua escondida', venda)
        await clica(pg, 'it:tp_v106_teste')
        j = await pop(pg)
        P.confere(j['aberto'] and 'Skin de Teste' in j['tx'] and '900' in j['tx'] and 'entre na sua conta' in j['tx'] and not any(x['t'] == 'COMPRAR' for x in j['bts']),
                  'tocar na tampinha à venda sem conta: a janelinha com a peça, o preço e o aviso de entrar na conta', j)
        await rt(pg, "(() => { fechaPop(); return 1; })()")
        await clica(pg, 'aba:bola')
        await clica(pg, 'it:bola_rua')
        j = await pop(pg)
        P.confere(j['aberto'] and 'Bola de Rua' in j['tx'] and '1.500' in j['tx'] and 'entre na sua conta' in j['tx'] and [x['t'] for x in j['bts']][:1] in (['FECHAR'], ['CANCELAR']),
                  'a bola bloqueada sem conta: a janelinha com a peça, o preço e o aviso de entrar na conta', j)
        await rt(pg, "(() => { fechaPop(); return 1; })()")
        await clica(pg, 'it:bola_classica_lisa')
        j = await pop(pg)
        P.confere(j['aberto'] and 'Clássica Lisa' in j['tx'] and 'entre na sua conta' in j['tx'] and await rt(pg, "v88Equipado('bola')") == 'bola_classica',
                  'a de graça sem conta: a janelinha explica que trocar é na conta (a bola continua a de sempre)', j)
        await rt(pg, "(() => { fechaPop(); return 1; })()")

        # ---------------------------------------------------------------- 3) a aba EMOJI (com a API de verdade, se já veio na junção, e com a falsa)
        if await rt(pg, "!!window.RachaEmotes106"):
            print('\n3a) a aba EMOJI com a API de verdade (window.RachaEmotes106 da junção)')
            await clica(pg, 'aba:emoji')
            r0 = await rt(pg, "(() => { const A = RachaEmotes106, T = document.getElementById('tela-cofre'); return {slots:A.slots(), n:A.lista().length, padrao:A.padrao(), cartas:T.querySelectorAll('.cf106-grade-emo .cf106-card').length, lugares:[...T.querySelectorAll('.cf106-lugar')].filter(b => b.querySelector('canvas')).length, aviso:!!T.querySelector('.cf106-aviso')}; })()")
            P.confere(r0['n'] > 0 and r0['cartas'] == r0['n'] and r0['lugares'] == 5 and not r0['aviso'], 'com a API de verdade: a grade com todos os emojis da partida e a cruz com os 5 lugares desenhados', r0)
            novo = await rt(pg, "RachaEmotes106.lista().map(e => e.id).find(id => RachaEmotes106.slots().indexOf(id) < 0)")
            await clica(pg, 'lugar:1')
            await clica(pg, 'emo:' + novo)
            r1 = await rt(pg, "RachaEmotes106.slots()")
            await clica(pg, 'topo:padrao')
            r2 = await rt(pg, "RachaEmotes106.slots()")
            P.confere(r1[1] == novo and r2 == r0['padrao'], 'com a API de verdade: o lugar da esquerda recebe o emoji tocado (poeSlot) e o PADRÃO volta os 5 de fábrica', [novo, r1, r2])
        print('\n3) a aba EMOJI (os emojis de reação da partida) com uma API falsa')
        await rt(pg, FALSO)
        await rt(pg, "(() => { RachaCofre106.vai('emoji'); return 1; })()")   # (a aba pode já estar aberta: a tela refaz com a API nova)
        await asyncio.sleep(.25)
        x = await rt(pg, "(() => { const T = document.getElementById('tela-cofre'); return {lugares:[...T.querySelectorAll('.cf106-lugar')].map(b => ({on:b.getAttribute('aria-pressed'), cv:!!b.querySelector('canvas'), d:b.disabled})), setas:T.querySelectorAll('.cf106-seta').length, cartas:T.querySelectorAll('.cf106-grade-emo .cf106-card').length, checks:T.querySelectorAll('.cf106-grade-emo .cf106-card > .cf106-check').length, aviso:!!T.querySelector('.cf106-aviso'), topo:(T.querySelector('.cf106-topo-bt') || {}).textContent, desenhos:window.__emo.desenhos}; })()")
        P.confere(len(x['lugares']) == 5 and all(l['cv'] and not l['d'] for l in x['lugares']) and x['setas'] == 4 and x['cartas'] == 20 and x['checks'] == 5 and not x['aviso'] and x['topo'] == 'PADRÃO' and x['desenhos'] >= 25,
                  'com a API: a cruz dos 5 lugares com os emojis (desenhados pela API), as 4 setas, a grade dos 20 (o check nos 5 da cruz) e o PADRÃO', x)
        await clica(pg, 'lugar:3')
        l3 = await rt(pg, "({slot:RachaCofre106.slot(), on:[...document.querySelectorAll('#tela-cofre .cf106-lugar')].map(b => b.getAttribute('aria-pressed')), placa:document.querySelector('#tela-cofre .cf106-placa b').textContent})")
        avisos0 = await rt(pg, 'window.__emo.avisos')
        await clica(pg, 'emo:e10')
        l3b = await rt(pg, "({slots:RachaEmotes106.slots(), placa:document.querySelector('#tela-cofre .cf106-placa b').textContent, avisos:window.__emo.avisos, check:!!document.querySelector('#tela-cofre [data-k=\"emo:e10\"]').closest('.cf106-card').querySelector(':scope > .cf106-check')})")
        P.confere(l3['slot'] == 3 and l3['on'] == ['false', 'false', 'false', 'true', 'false'] and 'DIREITA' in l3['placa'], 'tocar num lugar acende o lugar (o da direita)', l3)
        P.confere(l3b['slots'][3] == 'e10' and l3b['slots'][:3] == ['e0', 'e1', 'e2'] and 'Emoji 11' in l3b['placa'] and l3b['check'] and l3b['avisos'] > avisos0,
                  'tocar num emoji da grade põe ele no lugar aceso (poeSlot), a placa diz qual e a cruz se refaz', l3b)
        await rt(pg, "RachaEmotes106.poeSlot(0, 'e19')"); await asyncio.sleep(.2)
        mud = await rt(pg, "!!document.querySelector('#tela-cofre [data-k=\"emo:e19\"]').closest('.cf106-card').querySelector(':scope > .cf106-check')")
        P.confere(mud, 'a troca feita por fora (o mudou() da API) refaz a cruz e a grade', mud)
        await clica(pg, 'topo:padrao')
        P.confere(await rt(pg, "RachaEmotes106.slots().join(',')") == 'e0,e1,e2,e3,e4', 'o PADRÃO volta os 5 lugares de fábrica (o padrao() da API)', await rt(pg, "RachaEmotes106.slots()"))

        # ---------------------------------------------------------------- 4) o ESCUDO DO CLUBE neste aparelho
        print('\n4) o ESCUDO DO CLUBE: sem clube e com o clube pessoal deste aparelho')
        await clica(pg, 'aba:escudo')
        await asyncio.sleep(.3)
        await clica(pg, 'topo:clube')
        await asyncio.sleep(.4)
        foi = await rt(pg, "[lobby.tela, lobby.volta]")
        await rt(pg, "(() => { fechaTela(); return 1; })()"); await asyncio.sleep(.4)
        volta = await rt(pg, "[lobby.tela, RachaCofre106.aba()]")
        P.confere(foi == ['clube', 'cofre'] and volta == ['cofre', 'escudo'], 'sem clube: o IR PARA O CLUBE abre o CLUBE e o VOLTAR volta ao COFRE (no escudo)', [foi, volta])
        await clica(pg, 'esc:estrelado')
        j = await pop(pg)
        P.confere(j['aberto'] and 'não tem clube' in j['tx'] and any(x['t'] == 'IR PARA O CLUBE' for x in j['bts']), 'sem clube, tocar num escudo explica (entre ou crie um clube)', j)
        await rt(pg, "(() => { fechaPop(); return 1; })()")
        await rt(pg, "(() => { CLB_API_LOCAL.criar({nome:'Os Testes da Laje', descricao:'teste', pais:'BR', tipo:'publico', trofeuMinimo:0, escudo:tpCodigo(TP_ESCUDO_D())}); clbMudouMeu(); v88Repinta('cofre'); return 1; })()")
        ok = await espera(pg, "(() => { const c = RachaCofre106.clube(); return c.estado === 'ok' && c.c && c.c.nome === 'Os Testes da Laje' ? 1 : 0; })()", 5000)
        await asyncio.sleep(.3)
        x = await rt(pg, ESTADO)
        P.confere(ok and x['peca'] and x['pedestal'] and x['placa'] == 'Os Testes da Laje' and x['placaSub'] == 'VOCÊ É O DONO' and x['topo'] == 'VER O CLUBE' and x['criar'] and x['check'] == 1,
                  'com o clube pessoal: o escudo dele no pedestal, o nome na placa, VOCÊ É O DONO, o CRIAR PERSONALIZADO e o check no escudo atual', x)
        await clica(pg, 'criar:escudo')
        await asyncio.sleep(.4)
        ed = await rt(pg, "({tela:lobby.tela, modo:ED.modo, volta:lobby.volta})")
        await rt(pg, "(() => { ED.saindo = true; fechaTela(); ED.saindo = false; return 1; })()")
        await asyncio.sleep(.4)
        ed2 = await rt(pg, "[lobby.tela, RachaCofre106.aba()]")
        P.confere(ed == {'tela': 'skins', 'modo': 'E', 'volta': 'cofre'} and ed2 == ['cofre', 'escudo'], 'o CRIAR PERSONALIZADO do dono abre o editor no modo ESCUDO e o VOLTAR volta ao COFRE (no escudo)', [ed, ed2])
        est = await rt(pg, "tpCodigo(TP_PRE_ESCUDO.find(x => x.id === 'estrelado').d)")
        await clica(pg, 'esc:estrelado')
        await asyncio.sleep(.4)
        x = await rt(pg, "({esc:CLB_LOCAL.clubes[0].escudo, check:!!document.querySelector('#tela-cofre [data-k=\"esc:estrelado\"]').closest('.cf106-card').querySelector(':scope > .cf106-check')})")
        P.confere(x['esc'] == est and x['check'], 'o dono toca num escudo de graça: troca no clube (clbApi().editar) e o check vai para ele', x)
        await rt(pg, "(() => { CONTA.moedas = 500; v88Repinta('cofre'); return 1; })()")
        await clica(pg, 'esc:realeza')
        j = await pop(pg)
        P.confere(j['aberto'] and 'PEÇAS' in j['tx'] and 'Faltam' in j['tx'] and any(x['t'] == 'COMPRAR E USAR' and x['d'] for x in j['bts']), 'o escudo com peças que faltam: a janelinha com as peças e o preço (sem saldo: FALTA e o COMPRAR desligado)', j)
        await rt(pg, "(() => { fechaPop(); CONTA.moedas = 5000; contaSalvar(); v88Repinta('cofre'); return 1; })()")
        await clica(pg, 'esc:realeza')
        await rt(pg, "(() => { const b = [...LB.popCaixa.querySelectorAll('.pop-acoes button')].find(x => x.textContent === 'COMPRAR E USAR'); b.click(); return 1; })()")
        await asyncio.sleep(.5)
        x = await rt(pg, "({esc:CLB_LOCAL.clubes[0].escudo, real:tpCodigo(TP_PRE_ESCUDO.find(x => x.id === 'realeza').d), moedas:CONTA.moedas, falta:tpFaltam(TP_PRE_ESCUDO.find(x => x.id === 'realeza').d).length})")
        P.confere(x['esc'] == x['real'] and x['moedas'] == 5000 - 1900 and x['falta'] == 0, 'COMPRAR E USAR: as peças compradas (−1.900 moedas do aparelho) e o escudo novo no clube', x)
        await rt(pg, "(() => { CLB_API_LOCAL.sair(); clbMudouMeu(); fechaTela(); return 1; })()")
        js = [x for x in erros if 'Failed to load resource' not in x]
        P.confere(not js, 'sem erro de JavaScript (partes 1 a 4)', js[:4])
        await b.close()

        # as da conta (TP_CONTA que são suas): com as prontas de volta (o interruptor da v101) elas aparecem; escondidas, não
        tc = {}
        for prontas in (True, False):
            b, pg, erros = await abre(pw, 1280, 720, config={'skinsProntas': True} if prontas else None)
            erros_todos.append(erros)
            tc[prontas] = await rt(pg, """(() => { TP.conta = ['skin_artilheiro']; abreTela('cofre'); RachaCofre106.vai('skin');
              const cod = tpCodigo(TP_CONTA.skin_artilheiro.d), b = document.querySelector('#tela-cofre [data-k="tp:' + cod + '"]');
              return {tem:!!b, exclusiva:!!(b && b.closest('.cf106-card').classList.contains('exclusiva')), nota:!!document.querySelector('#tela-cofre .v101-cofre-nota')}; })()""")
            await b.close()
        P.confere(tc[True]['tem'] and tc[True]['exclusiva'] and not tc[True]['nota'] and not tc[False]['tem'] and tc[False]['nota'],
                  'as tampinhas da conta que são suas aparecem na SKIN com as prontas ligadas (RACHA_CONFIG.skinsProntas) e somem com elas escondidas (o aviso no lugar)', tc)

        # ---------------------------------------------------------------- 5) tudo cabe e é tocável; as capturas
        print('\n5) tudo cabe e é tocável nos tamanhos (e as capturas)')
        TAMANHOS = [(1280, 720, None), (1920, 1080, None), (844, 390, None), (667, 375, None), (568, 320, None), (844, 390, {'top': 0, 'left': 47, 'right': 47, 'bottom': 21})]
        for (w, h, ins) in TAMANHOS:
            nome = '%dx%d' % (w, h) + (' iPhone com o entalhe' if ins else '')
            if ins: b, pg, erros = await abre_ins(pw, w, h, ins)
            else: b, pg, erros = await abre(pw, w, h)
            erros_todos.append(erros)
            sa = {'t': 0, 'r': 0, 'b': 0, 'l': 0}
            if ins: sa = {'t': ins['top'], 'r': ins['right'], 'b': ins['bottom'], 'l': ins['left']}
            await rt(pg, "(() => { abreTela('cofre'); return 1; })()")
            await asyncio.sleep(.4)
            ruins = {}
            medidas = []
            # (a EMOJI sem a API, como no ramo sem os emojis da partida: o aviso; depois a API de verdade, se veio na junção — senão, a
            #  falsa, como vai ficar com os emojis da partida)
            await rt(pg, SEM_API)
            await rt(pg, "RachaCofre106.vai('emoji')"); await asyncio.sleep(.35)
            m = await rt(pg, CABE + '(%s)' % json.dumps(sa))
            prob = {k: m[k] for k in ('fora', 'cortadas', 'rolam', 'ladoCorta') if m[k]}
            if prob: ruins['emoji sem a API'] = prob
            if not ins and (w, h) in ((1280, 720), (844, 390)):
                await pg.screenshot(path=str(SAIDA / ('v106_cofre_emoji_sem_api_%dx%d.png' % (w, h))))
            real = await rt(pg, VOLTA_API)
            if not real: await rt(pg, FALSO)
            for a in ABAS + ['mais:comemoracoes']:
                await rt(pg, "RachaCofre106.vai(%s)" % json.dumps(a))
                await asyncio.sleep(.35)
                m = await rt(pg, CABE + '(%s)' % json.dumps(sa))
                medidas.append((a, m['cartaPx'], m['abaPx'], m['ladoPx']))
                prob = {k: m[k] for k in ('fora', 'cortadas', 'rolam', 'ladoCorta', 'cobertos') if m[k]}
                if m['sobre']: prob['sobre'] = m['sobre']
                if m['vistos'] and m['tocaveis'] < m['vistos']: prob['tocaveis'] = '%d/%d' % (m['tocaveis'], m['vistos'])
                if m['oy'] != 'auto': prob['oy'] = m['oy']
                if a == 'skin' and not m['rolaGrade']: prob['grade'] = 'a SKIN (com os emojis) não rola'
                if prob: ruins[a] = prob
                if not ins and (w, h) in ((1280, 720), (844, 390)) and a in ABAS:
                    await pg.screenshot(path=str(SAIDA / ('v106_cofre_%s%s_%dx%d.png' % (a, '_api_falsa' if a == 'emoji' and not real else '', w, h))))
            P.confere(not ruins, nome + ': em cada aba nada sai da tela, as abas inteiras, a página sem rolar (só a grade), nada em cima de nada e cada cartão tocável', ruins)
            menorc = min(x[1] for x in medidas); menora = min(x[2] for x in medidas); menorl = min(x[3] for x in medidas if x[3]) if any(x[3] for x in medidas) else 0
            P.confere(menorc >= 40 and menora >= 28 and menorl >= 26, nome + ': os tamanhos de verdade — o menor cartão %d px, a aba %d px, os botões do lado %d px' % (menorc, menora, menorl), medidas)
            if ins:
                await rt(pg, "RachaCofre106.vai('skin')"); await asyncio.sleep(.3)
                await pg.screenshot(path=str(SAIDA / 'v106_cofre_skin_iphone_844x390.png'))
            js = [x for x in erros if 'Failed to load resource' not in x]
            P.confere(not js, nome + ': sem erro de JavaScript', js[:3])
            await b.close()

    # ---------------------------------------------------------------- 6) com a conta (a plataforma de teste)
    print('\n6) com a conta: comprar e equipar a bola, a tampinha salva e o escudo do clube da conta')
    banco = os.path.join(tempfile.mkdtemp(prefix='racha106-'), 'plataforma.sqlite')
    PL = Plataforma(banco).sobe()
    try:
        A, B = conta(PL, 'cofredono'), conta(PL, 'cofremembro')
        carta = [c for c in PL.q('correio.listar', None, A['token']) if c['titulo'] == 'Presente de teste'][0]
        PL.m('correio.coletar', {'id': carta['id']}, A['token'])
        m0 = PL.q('loja.estado', None, A['token'])['carteira']['moedas']
        clube = PL.m('clubes.criar', {'nome': 'Clube do Cofre', 'descricao': 'teste', 'pais': 'BR', 'tipo': 'publico', 'trofeuMinimo': 0}, A['token'])
        PL.m('clubes.entrar', {'id': clube['id']}, B['token'])
        async with async_playwright() as pw:
            eA = []; erros_todos.append(eA)
            bA, pa = await navegador(pw, PL, 'cofredono', eA)
            await rt(pa, "(() => { abreTela('cofre'); RachaCofre106.vai('bola'); return 1; })()")
            await espera(pa, "V88.carteiraOk && CONTA.moedas > 10000 ? 1 : 0", 8000)
            await asyncio.sleep(.4)
            d0 = await rt(pa, "(() => { const c = document.querySelector('#tela-cofre [data-k=\"it:bola_rua\"]').closest('.cf106-card'); return {cad:!!c.querySelector(':scope > .cf106-cad'), dica:document.querySelector('#tela-cofre .cf106-dica').textContent, moedas:CONTA.moedas}; })()")
            await clica(pa, 'it:bola_rua')
            j = await pop(pa)
            P.confere(d0['cad'] and j['aberto'] and '1.500' in j['tx'] and 'Saldo depois' in j['tx'] and [x['t'] for x in j['bts']] == ['CANCELAR', 'COMPRAR'] and not j['bts'][1]['d'],
                      'com a conta: a bola bloqueada abre a janelinha com a peça, o preço, o saldo de depois e COMPRAR / CANCELAR', [d0, j])
            await rt(pa, "(() => { [...LB.popCaixa.querySelectorAll('.pop-acoes button')].find(x => x.textContent === 'COMPRAR').click(); return 1; })()")
            comprado = await espera(pa, "V88.inv.has('bola_rua') && !LB.pop.hidden && /COMPRADO/.test(LB.popCaixa.textContent) ? 1 : 0", 8000)
            est = PL.q('loja.estado', None, A['token'])
            inv = [i if isinstance(i, str) else i.get('codigo') for i in est['inventario']]
            P.confere(comprado and 'bola_rua' in inv and est['carteira']['moedas'] == m0 - 1500, 'COMPRAR: o servidor tira 1.500 moedas e entrega a bola (a compra da loja, sem a segunda pergunta)', [comprado, est['carteira'], 'bola_rua' in inv])
            await rt(pa, "(() => { if (!LB.pop.hidden) fechaPop(); return 1; })()")
            await asyncio.sleep(.6)
            d1 = await rt(pa, "(() => { const c = document.querySelector('#tela-cofre [data-k=\"it:bola_rua\"]').closest('.cf106-card'); return {cad:!!c.querySelector(':scope > .cf106-cad'), nome:(c.querySelector('.cf106-card-nome') || {}).textContent}; })()")
            P.confere(not d1['cad'] and d1['nome'] == 'Bola de Rua', 'comprou: o cadeado sai do cartão (a bola é sua)', d1)
            await clica(pa, 'it:bola_rua')
            eq = await espera(pa, "v88Equipado('bola') === 'bola_rua' ? 1 : 0", 5000)
            await asyncio.sleep(1.2)
            est = PL.q('loja.estado', None, A['token'])
            d2 = await rt(pa, "(() => { const c = document.querySelector('#tela-cofre [data-k=\"it:bola_rua\"]').closest('.cf106-card'); return {check:!!c.querySelector(':scope > .cf106-check'), checks:document.querySelectorAll('#tela-cofre .cf106-card > .cf106-check').length, placa:document.querySelector('#tela-cofre .cf106-placa b').textContent}; })()")
            P.confere(eq and d2['check'] and d2['checks'] == 1 and d2['placa'] == 'Bola de Rua' and est['equipados'].get('bola') == 'bola_rua',
                      'tocar na bola comprada: equipa (o check nela, o pedestal com a Bola de Rua e o servidor com a equipada)', [d2, est['equipados']])
            await pa.screenshot(path=str(SAIDA / 'v106_cofre_bola_conta_1280x720.png'))
            await clica(pa, 'it:bola_classica_lisa')
            eq2 = await espera(pa, "v88Equipado('bola') === 'bola_classica_lisa' ? 1 : 0", 5000)
            P.confere(eq2, 'com a conta, a de graça (Clássica Lisa) equipa na hora', eq2)
            # a tampinha salva com a conta
            c3 = await rt(pa, LISA + "('#7a3fc4')")
            await rt(pa, "(() => { TP.salvas = [{c:%s, n:'Roxa da Conta', f:false}].concat(TP.salvas || []); tpSalva(); RachaCofre106.vai('skin'); return 1; })()" % json.dumps(c3))
            await asyncio.sleep(.3)
            await clica(pa, 'tp:' + c3)
            t = await rt(pa, "({minha:tpMinha(), check:!!document.querySelector('#tela-cofre [data-k=\"tp:%s\"]').closest('.cf106-card').querySelector(':scope > .cf106-check')})" % c3)
            P.confere(t['minha'] == c3 and t['check'], 'com a conta, tocar na tampinha salva equipa (o check nela)', t)
            # o escudo do clube da conta: o dono troca (no servidor)
            await rt(pa, "RachaCofre106.vai('escudo')")
            ok = await espera(pa, "(() => { const c = RachaCofre106.clube(); return c.estado === 'ok' && c.c && c.c.nome === 'Clube do Cofre' ? 1 : 0; })()", 8000)
            await asyncio.sleep(.3)
            x = await rt(pa, ESTADO)
            P.confere(ok and x['placa'] == 'Clube do Cofre' and x['placaSub'] == 'VOCÊ É O DONO' and x['peca'], 'o escudo do clube da conta no pedestal (VOCÊ É O DONO)', x)
            est2 = await rt(pa, "tpCodigo(TP_PRE_ESCUDO.find(x => x.id === 'estrelado').d)")
            await clica(pa, 'esc:estrelado')
            novo = None
            for _ in range(30):
                novo = (PL.q('clubes.meu', None, A['token']) or {}).get('escudo')
                if novo == est2: break
                await asyncio.sleep(.25)
            P.confere(novo == est2, 'o dono toca no escudo: o clube da conta fica com ele (no servidor)', [novo, est2])
            await pa.screenshot(path=str(SAIDA / 'v106_cofre_escudo_dono_1280x720.png'))
            # o membro que não é dono (outro navegador)
            eB = []; erros_todos.append(eB)
            bB, pb = await navegador(pw, PL, 'cofremembro', eB)
            await rt(pb, "(() => { abreTela('cofre'); RachaCofre106.vai('escudo'); return 1; })()")
            ok = await espera(pb, "(() => { const c = RachaCofre106.clube(); return c.estado === 'ok' && c.c && c.c.nome === 'Clube do Cofre' ? 1 : 0; })()", 8000)
            await asyncio.sleep(.3)
            y = await rt(pb, ESTADO)
            await clica(pb, 'esc:classico')
            j = await pop(pb)
            antes_m = (PL.q('clubes.meu', None, B['token']) or {}).get('escudo')
            P.confere(ok and 'DONO: COFREDONO' in y['placaSub'] and 'Só o dono' in y['dica'] and not y['criar'] and j['aberto'] and 'Só o dono do clube troca o escudo' in j['tx'] and 'cofredono' in j['tx'] and antes_m == est2,
                      'o membro que não é o dono vê o escudo do clube e, ao tocar, quem pode trocar (o escudo não muda)', [y['placaSub'], y['dica'], j['tx'][:160], antes_m])
            await pb.screenshot(path=str(SAIDA / 'v106_cofre_escudo_membro_1280x720.png'))
            await bB.close()
            await bA.close()
    finally:
        PL.desce()

    js = [x for l in erros_todos for x in l if 'Failed to load resource' not in x]
    P.confere(not js, 'nenhum erro de JavaScript (todas as partes)', js[:5])
    return P.fim()


if __name__ == '__main__':
    sys.exit(asyncio.run(principal()))
