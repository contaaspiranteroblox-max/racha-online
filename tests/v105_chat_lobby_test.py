"""RACHA v105 · o chat na tela do lobby (passa/falha): "quero um chat visível na tela do lobby igual o dentro da partida lá em
baixo". A barra do chat da partida (a da v81: a etiqueta, NOME: a última mensagem, as não lidas e o ^) volta para a tela
inicial com o Chat do Brasil, embaixo, entre a barra de atalhos e o JOGAR.
  1) o lugar, nos tamanhos de tela (1920×888, 1280×720, 1440×900, o celular deitado 844×390 e 667×375, o tablet 1180×820,
     e os do v102: 1024×768 e 2560×1080): a barra aparece no lobby, embaixo, no meio (entre a barra de atalhos e o JOGAR,
     abaixo da tampinha), com a cara da da partida (o grafite meio transparente) e a última mensagem com o nome, inteira
     dentro da tela, sem encostar em nenhum botão do lobby (a barra de cima, o perfil, o dinheiro, o correio, a TELA CHEIA,
     o MENU, a tampinha, a vaga do grupo, a barra de atalhos, o MODO e o JOGAR), com no mínimo 36 px de verdade de altura e
     letra de 13 px; um botão a mais na conta do lobby (13 + a TELA CHEIA + o chat). Nos apertados (o 844×390 com as áreas
     seguras do iPhone e o 800×336), sem lugar debaixo da tampinha, ela fica logo em cima da barra de atalhos (e, com o grupo
     cheio, encurta antes do amigo do lado). As cópias de tela: tests/saida/v105_chat_lobby_1280x720.png e _844x390.png (e o
     painel aberto: v105_chat_painel_*.png; o iPhone: v105_chat_lobby_844x390_iphone*.png);
  2) tocar abre o painel de sempre (as mensagens, o campo, o ENVIAR; o quadrado que abre o Chat do Brasil inteiro) e
     minimizar volta para a barra (no computador e no celular); as janelas do lobby (o MENU, as janelas, a folha do JOGAR,
     a busca da ranqueada, as telas) ficam por cima da barra;
  3) sem servidor, com o Chat do Brasil desligado nos Ajustes ou com a chave "Chat na tela" desligada, a barra não aparece (e
     o lobby volta às 13 coisas para tocar); com o servidor fora do ar, a barra diz "Chat do Brasil fora do ar";
  4) na partida: no treino a barra some (o lobby fechado leva junto: nada por cima do HUD); na partida da sala é a barra da
     partida (embaixo do campo), não a do lobby; de volta ao lobby, ela volta para o mesmo lugar;
  5) nada por quadro: parada no lobby, nenhuma medida e nenhuma mudança na barra (nem a medida de 1 em 1 s da v81); a
     mensagem nova muda só o texto da barra (sem medir de novo);
  6) com a plataforma de teste (o código de verdade de app/api e o servidor das salas, duas contas em dois navegadores): o
     Chat do Brasil liga sozinho no lobby; o Beto escreve pela barra dele e a mensagem aparece na barra da Ana (com o nome);
     a Ana toca na barra (o clique de verdade), escreve e manda — chega no Beto; o nome do Beto abre a ficha com o VER PERFIL,
     que abre o perfil por cima (o painel do chat fecha antes, senão o perfil ficava atrás dele); fechar volta para a barra;
  7) nenhum erro de JavaScript.
  python3 tests/v105_chat_lobby_test.py   (--sem-plataforma: sem a parte 6)
"""
import asyncio, json, os, sys, tempfile
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from comum import Placar, abre, rt, async_playwright, RAIZ
from v88_cliente_test import Plataforma, conta, abre_logado, espera

SAIDA = RAIZ / 'tests' / 'saida'; SAIDA.mkdir(exist_ok=True)
TAMANHOS = [(1920, 888, 'tela larga 1920×888'), (1280, 720, 'computador 1280×720'), (1440, 900, 'computador 1440×900'),
            (844, 390, 'celular deitado 844×390'), (667, 375, 'celular pequeno 667×375'), (1180, 820, 'tablet 1180×820'),
            (1024, 768, 'tablet 4:3 1024×768'), (2560, 1080, 'tela 21:9 2560×1080')]
IPHONE = {'top': 0, 'right': 47, 'bottom': 21, 'left': 47}   # (o iPhone deitado: o entalhe dos lados e a barra de baixo)
SERVIDOR = {'modo': 'producao', 'servidor': '127.0.0.1:1'}   # (um endereço que não responde: o Chat do Brasil "fora do ar")

# o Chat do Brasil de mentira (como no v81_test): ligado, com duas mensagens e duas não lidas
MSGS = """(() => { const t = Date.now(); BRASIL.estado = 'on'; BRASIL.online = 128; BRASIL.id = 'u1'; BRASIL.ws = {readyState:1, send(){}, close(){}};
  BRASIL.msgs = [{id:'m1', from:'u2', nome:'CRIA7', selo:'verificado', skin:'', texto:'Alguém quer jogar?', t:t - 90000},
    {id:'m2', from:'u3', nome:'MTHZIN', skin:'', clube:'Brabos', texto:'Bora 2v2 na quadra do Seu Zé, quem topa?', t:t - 30000}];
  BRASIL.naoLidas = 2; cbPinta(); return 1; })()"""
# o grupo com 3 amigos (as 3 vagas cheias, com o nome e o estado embaixo); sem a conta, a v93 desfaria o grupo: aqui ela deixa
GRUPO = """(() => { v93GrupoPode = () => true; NET49.id = NET49.id || 'eu';
  V93G.g = {lider:'a', max:4, membros:[{id:NET49.id, nome:'Eu'}, {id:'a', nome:'AnaRacha', skin:'', st:'disponivel', lider:true}, {id:'b', nome:'Betinho10', skin:'', st:'ocupado'}, {id:'c', nome:'Cria', skin:'', st:'partida'}]};
  V101.vagasK = ''; v101VagasPinta(); return 1; })()"""
# o lobby: as peças que se tocam (como no v102_test) e a barra
LOBBY = """(() => {
  const vis = e => { if (!e) return false; const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return r.width > 2 && r.height > 2 && cs.display !== 'none' && cs.visibility !== 'hidden' && !e.closest('[hidden]'); };
  const cx = e => { const r = e.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)]; };
  const L = [], poe = (nome, e) => { if (vis(e)) L.push([nome, cx(e)]); };
  poe('perfil', LB.eu);
  document.querySelectorAll('#lb .lb-topo .hm-grana').forEach((e, i) => poe('grana' + i, e));
  poe('correio', document.getElementById('lb-correio')); poe('menu', document.querySelector('#lb .v102-menu-bt'));
  poe('telacheia', document.querySelector('#lb .v103-tela-bt')); poe('topo', LB.palco.querySelector('.lb-topo'));
  poe('tampinha', LB.emblema);
  document.querySelectorAll('#lb .v101-vaga').forEach((e, i) => {      // (a vaga com o nome e o estado do amigo embaixo dela)
    if (!vis(e)) return; const rs = [e, ...e.querySelectorAll('*')].filter(vis).map(cx);
    L.push(['vaga' + i, [Math.min(...rs.map(r => r[0])), Math.min(...rs.map(r => r[1])), Math.max(...rs.map(r => r[2])), Math.max(...rs.map(r => r[3]))]]); });
  poe('atalhos', document.querySelector('#lb .v102-doca'));
  document.querySelectorAll('#lb .v102-doca-bt').forEach(e => poe('atalho:' + e.textContent.trim(), e));
  poe('modo', LB.modo); poe('jogar', LB.jogar);
  const el = CB.el, ab = el && el.querySelector('.c81-abrir'), msg = el && el.querySelector('.c81-msg'), tag = el && el.querySelector('.c81-tag');
  const barra = vis(el) && el.classList.contains('c81-lobby') ? cx(el) : null;
  const toques = [...LB.palco.querySelectorAll('button, [role=button]')].filter(e => vis(e) && !e.closest('.v102-gaveta')).length;
  return {vw:innerWidth, vh:innerHeight, s:PALCO.s, sa:PALCO.sa, L, barra, toques, onde:CB.onde, ctx:cbContexto(), est:RachaChatLobby105.estado(),
    msg:msg ? msg.textContent : '', n:CB.n.hidden ? '' : CB.n.textContent, tag:tag ? tag.textContent.trim() : '', tagTxt:tag && tag.lastChild && getComputedStyle(tag.lastChild).display !== 'none',
    bg:ab ? getComputedStyle(ab).backgroundColor : '', letra:msg ? parseFloat(getComputedStyle(msg).fontSize)*PALCO.s : 0, noPalco:!!el && LB.palco.contains(el)};
})()"""
PAINEL = """(() => { const p = CB.pn, cx = p.querySelector('.c81-caixa'), r = cx.getBoundingClientRect(), tudo = p.querySelector('.c81-ic[aria-label="Abrir o Chat do Brasil completo"]');
  return {aberto:CB.aberto, vis:!p.hidden && getComputedStyle(p).display !== 'none', aba:CB.aba, caixa:[Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)], vw:innerWidth, vh:innerHeight,
    linhas:[...CB.lista.querySelectorAll('.c81-lin')].map(d => d.textContent.trim().slice(0, 60)), foco:document.activeElement === CB.inp, campo:!!CB.inp && !CB.inp.disabled,
    ok:(p.querySelector('.c81-ok') || {}).textContent || '', tudo:!!tudo && !tudo.hidden, barraAberta:CB.el.classList.contains('aberto')}; })()"""


def cruzam(a, b, folga=1):
    return a[0] < b[2] - folga and a[2] > b[0] + folga and a[1] < b[3] - folga and a[3] > b[1] + folga


def js_erros(erros):
    return [e for e in erros if 'Failed to load resource' not in e and 'WebSocket' not in e]


async def com_insets(pg, ins):
    cdp = await pg.context.new_cdp_session(pg)
    await cdp.send('Emulation.setSafeAreaInsetsOverride', {'insets': ins})
    await rt(pg, "(() => { lbLayout(); return 1; })()")
    await pg.wait_for_timeout(300)


# ---------------------------------------------------------------------------------------------------------------- 1) e 2)
async def lugar_em(pw, P, w, h, nome, ins=None, grupo=False):
    b, pg, erros = await abre(pw, w=w, h=h, config=SERVIDOR)
    try:
        if ins:
            await com_insets(pg, ins)
        await rt(pg, "(() => { onbFim(); return 1; })()")            # (a primeira vez já passou: pulou a apresentação)
        await pg.wait_for_timeout(250)
        if grupo:                                                     # (o grupo com 3 amigos: as 3 vagas com o nome e o estado)
            await rt(pg, GRUPO)
        await rt(pg, MSGS)
        await pg.wait_for_timeout(450 if grupo else 250)
        c = await rt(pg, LOBBY)
        br = c['barra']
        P.confere(c['onde'] == 'lobby' and br is not None and c['noPalco'] and c['est']['pos'] and c['est']['pos'].get('lugar'), nome + ': a barra do chat aparece no lobby', [c['onde'], br, c['est']])
        if not br:
            return
        sa = c['sa'] or {'t': 0, 'r': 0, 'b': 0, 'l': 0}
        P.confere(br[0] >= sa['l'] - 1 and br[2] <= c['vw'] - sa['r'] + 1 and br[1] >= sa['t'] - 1 and br[3] <= c['vh'] - sa['b'] + 1, nome + ': inteira dentro da tela' + (' (e da área segura)' if ins else ''), [br, c['vw'], c['vh'], sa])
        cr = [n for n, r in c['L'] if cruzam(br, r)]
        P.confere(not cr, nome + ': sem encostar em nenhum botão do lobby (%d peças: a barra de cima, o perfil, o dinheiro, o correio, a TELA CHEIA, o MENU, a tampinha, a vaga, os atalhos, o MODO e o JOGAR)' % len(c['L']), cr)
        d = dict(c['L'])
        emb, doca, jogar = d.get('tampinha'), d.get('atalhos'), d.get('jogar')
        onde = c['est']['pos'].get('onde')
        meio = onde == 'meio' and emb and doca and jogar and br[1] >= emb[3] and br[0] >= doca[2] and br[2] <= jogar[0] and abs(br[3] - doca[3]) <= 2
        if not ins and (w, h) != (800, 336):
            P.confere(meio, nome + ': embaixo, no meio — entre a barra de atalhos e o JOGAR, abaixo da tampinha (na linha de baixo dos atalhos)', [onde, br, emb, doca, jogar])
        else:                                                   # (apertado: sem lugar debaixo da tampinha, logo em cima da barra de atalhos)
            P.confere(meio or (onde == 'atalhos' and emb and doca and br[3] <= doca[1] and br[0] >= doca[0] - 1 and br[2] <= min(doca[2], emb[0]) + 1 and br[3] >= c['vh']*.6),
                      nome + ': embaixo — sem lugar debaixo da tampinha, logo em cima da barra de atalhos (da largura dela)', [onde, br, emb, doca])
        alto = br[3] - br[1]
        P.confere(alto >= 36 and c['letra'] >= 13, nome + ': %d px de altura de verdade e letra de %.1f px (o dedo e a leitura)' % (alto, c['letra']), [alto, c['letra']])
        P.confere(c['msg'] == 'MTHZIN: Bora 2v2 na quadra do Seu Zé, quem topa?' and c['n'] == '2' and c['tag'] == 'BRASIL',
                  nome + ': a última mensagem com o nome, as 2 não lidas e a etiqueta BRASIL' + ('' if c['tagTxt'] else ' (estreita: só a bandeira à vista)'), [c['msg'], c['n'], c['tag'], c['tagTxt']])
        P.confere(c['bg'] == 'rgba(16, 18, 22, 0.62)', nome + ': a cara da barra da partida (o grafite meio transparente)', c['bg'])
        tela, amigos = 1 if 'telacheia' in d else 0, 2 if grupo else 0      # (com o grupo, as duas vagas dos lados também)
        P.confere(c['toques'] <= 13 + tela + amigos + 1, nome + ': um botão a mais no lobby (o chat): %d ≤ 13%s%s + 1' % (c['toques'], ' + a TELA CHEIA' if tela else '', ' + as 2 vagas do grupo' if grupo else ''), c['toques'])
        tag = '%dx%d' % (w, h) + ('_iphone' if ins else '') + ('_grupo' if grupo else '')
        if ins or ((w, h) in ((1280, 720), (844, 390)) and not grupo):
            await pg.screenshot(path=str(SAIDA / ('v105_chat_lobby_%s.png' % tag)))
        # 2) tocar abre o painel (o clique de verdade no meio da barra) e minimizar volta
        await pg.mouse.click((br[0] + br[2])/2, (br[1] + br[3])/2)
        await pg.wait_for_timeout(400)
        p = await rt(pg, PAINEL)
        dentro = p['caixa'][0] >= -1 and p['caixa'][1] >= -1 and p['caixa'][2] <= p['vw'] + 1 and p['caixa'][3] <= p['vh'] + 1
        P.confere(p['aberto'] and p['vis'] and p['aba'] == 'brasil' and dentro and any('Bora 2v2' in x for x in p['linhas']) and p['campo'] and 'ENVIAR' in p['ok'] and p['tudo'] and p['barraAberta'],
                  nome + ': tocar abre o painel (BRASIL: as mensagens, o campo e o ENVIAR; o quadrado do Chat do Brasil inteiro), dentro da tela', p)
        if (w, h) in ((1280, 720), (844, 390)) and not ins and not grupo:
            await pg.screenshot(path=str(SAIDA / ('v105_chat_painel_%s.png' % tag)))
        await rt(pg, "(() => { CB.pn.querySelector('.c81-min').click(); return 1; })()")
        await pg.wait_for_timeout(250)
        f = await rt(pg, "({aberto:CB.aberto, pn:CB.pn.hidden, barra:!CB.el.hidden && getComputedStyle(CB.el).display !== 'none', naoLidas:CB.n.hidden})")
        P.confere(not f['aberto'] and f['pn'] and f['barra'] and f['naoLidas'], nome + ': minimizar fecha o painel e volta para a barra (as não lidas zeradas)', f)
        js = js_erros(erros)
        P.confere(not js, nome + ': sem erro de JavaScript', js[:3])
    finally:
        await b.close()


# ---------------------------------------------------------------------------------------------------------------- 2b)
async def por_baixo(pw, P):
    print('\n2b) as janelas do lobby ficam por cima da barra')
    b, pg, erros = await abre(pw, 1280, 720, config=SERVIDOR)
    try:
        await rt(pg, "(() => { onbFim(); return 1; })()"); await pg.wait_for_timeout(250)
        await rt(pg, MSGS); await pg.wait_for_timeout(250)
        # (o que está no meio da barra do lobby: ela mesma; com uma janela aberta, a janela. Numa tela do menu a barra vira o chip
        # do canto da v81 — outro lugar, de propósito — e a do lobby sai)
        topo = """(() => { if (CB.el.hidden || !CB.el.classList.contains('c81-lobby')) return false;
          const r = CB.el.getBoundingClientRect(), e = document.elementFromPoint(r.left + r.width/2, r.top + r.height/2); return !!e && CB.el.contains(e); })()"""
        P.confere(await rt(pg, topo), 'no lobby, o meio da barra é a própria barra (dá para tocar)')
        JANELAS = [('o MENU', "document.querySelector('#lb .v102-menu-bt').click()", "RachaLobby102.fecha(true)"),
                   ('uma janela (abrePop)', "abrePop(c => c.appendChild(nodo('p', 'pop-txt', 'teste')))", "fechaPop()"),
                   ('a folha do JOGAR (a ranqueada)', "abreJogar('ranked')", "fechaRanqueada()"),
                   # (a folha da busca da ranqueada, a de verdade, sem começar a busca: aqui o servidor de mentira cai na hora e a
                   # busca iria direto para a partida contra os bots)
                   ('a busca da ranqueada', "v79BuscaMonta().hidden = false", "V79R.el.hidden = true"),
                   ('uma tela (o PERFIL)', "abreTela('perfil')", "fechaTela()")]
        for nome, abre_js, fecha_js in JANELAS:
            await rt(pg, "(() => { %s; return 1; })()" % abre_js); await pg.wait_for_timeout(450)
            em_cima = await rt(pg, topo)
            await rt(pg, "(() => { try { %s; } catch (_) {} return 1; })()" % fecha_js); await pg.wait_for_timeout(350)
            P.confere(not em_cima, 'com %s aberto(a), a barra fica por baixo (não aparece por cima)' % nome, em_cima)
        volta = await rt(pg, "({onde:CB.onde, vis:RachaChatLobby105.estado().visivel, lobby:lobby.aberto, tela:lobby.tela})")
        P.confere(volta['onde'] == 'lobby' and volta['vis'] and volta['lobby'] and not volta['tela'], 'fechadas as janelas, a barra continua no lobby', volta)
        js = js_erros(erros)
        P.confere(not js, '2b) sem erro de JavaScript', js[:3])
    finally:
        await b.close()


# ---------------------------------------------------------------------------------------------------------------- 3)
async def sem_chat(pw, P):
    print('\n3) sem servidor, desligado, oculto e fora do ar')
    b, pg, erros = await abre(pw, 1280, 720)                       # (o arquivo, sem o servidor do jogo)
    try:
        await rt(pg, "(() => { onbFim(); return 1; })()"); await pg.wait_for_timeout(250)
        c = await rt(pg, LOBBY)
        tela = 1 if any(n == 'telacheia' for n, _ in c['L']) else 0
        P.confere(c['ctx'] == '' and c['barra'] is None and c['toques'] <= 13 + tela, 'sem servidor: a barra não aparece (o lobby continua com as %d coisas para tocar)' % c['toques'], [c['ctx'], c['barra'], c['toques']])
        P.confere(not js_erros(erros), 'sem servidor: sem erro de JavaScript', js_erros(erros)[:3])
    finally:
        await b.close()
    b, pg, erros = await abre(pw, 1280, 720, config=SERVIDOR)
    try:
        await rt(pg, "(() => { onbFim(); return 1; })()")
        ok = await espera(pg, "BRASIL.estado === 'fora' && CB.onde === 'lobby'", 6000)
        c = await rt(pg, LOBBY)
        P.confere(bool(ok) and c['barra'] is not None and c['msg'] == 'Chat do Brasil fora do ar', 'com o servidor fora do ar: a barra diz "Chat do Brasil fora do ar"', [ok, c['barra'], c['msg']])
        await rt(pg, "(() => { c81Oculta(true); return 1; })()"); await pg.wait_for_timeout(200)
        c = await rt(pg, LOBBY)
        P.confere(c['barra'] is None and c['ctx'] == '', 'a chave "Chat na tela" desligada (Ajustes ou o OCULTAR do painel): a barra sai do lobby', [c['barra'], c['ctx']])
        await rt(pg, "(() => { c81Oculta(false); return 1; })()"); await pg.wait_for_timeout(200)
        c = await rt(pg, LOBBY)
        P.confere(c['barra'] is not None, 'ligada de novo: a barra volta', c['barra'])
        await rt(pg, "(() => { CONTA.chatBrasil = false; contaSalvar(); return 1; })()"); await pg.wait_for_timeout(200)
        c = await rt(pg, LOBBY)
        P.confere(c['barra'] is None and c['ctx'] == '', 'o Chat do Brasil desligado nos Ajustes (sem conta): a barra não aparece', [c['barra'], c['ctx']])
        await rt(pg, "(() => { CONTA.chatBrasil = true; contaSalvar(); return 1; })()")
        P.confere(not js_erros(erros), 'desligado e fora do ar: sem erro de JavaScript', js_erros(erros)[:3])
    finally:
        await b.close()


# ---------------------------------------------------------------------------------------------------------------- 4) e 5)
async def partida_e_quadros(pw, P):
    print('\n4) na partida e 5) nada por quadro')
    b, pg, erros = await abre(pw, 1280, 720, config=SERVIDOR)
    try:
        await rt(pg, "(() => { onbFim(); return 1; })()"); await pg.wait_for_timeout(250)
        await rt(pg, MSGS); await pg.wait_for_timeout(250)
        c0 = await rt(pg, LOBBY)
        # 5) parada no lobby: nada muda na barra, ninguém mede o palco (nem a v81 de 1 em 1 s)
        q = await rt(pg, """(() => new Promise(fim => {
          const est0 = RachaChatLobby105.estado().medidas; let mut = 0, rects = 0;
          const ob = new MutationObserver(r => { mut += r.length; }); ob.observe(CB.el, {subtree:true, childList:true, attributes:true, characterData:true});
          const ob2 = new MutationObserver(r => { mut += r.length; }); ob2.observe(LB.palco, {attributes:true, attributeFilter:['style', 'class']});
          const g0 = Element.prototype.getBoundingClientRect;
          Element.prototype.getBoundingClientRect = function(){ if (this === LB.palco || this === CB.el || (CB.el && CB.el.contains(this))) rects++; return g0.apply(this, arguments); };
          setTimeout(() => { ob.disconnect(); ob2.disconnect(); Element.prototype.getBoundingClientRect = g0; fim({mut, rects, medidas:RachaChatLobby105.estado().medidas - est0}); }, 2600);
        }))()""")
        P.confere(q['mut'] == 0 and q['rects'] == 0 and q['medidas'] == 0, '5) parada no lobby por 2,6 s: nenhuma mudança na barra, nenhuma medida do palco (nem a de 1 em 1 s da v81)', q)
        m = await rt(pg, """(() => { const m0 = RachaChatLobby105.estado().medidas, t0 = performance.now();
          brasilMsg({type:'brasil_message', message:{id:'m9', from:'u4', nome:'SAGAZ', skin:'', texto:'Cria sala aí!', t:Date.now()}});
          return {msg:CB.msg.textContent, n:CB.n.textContent, medidas:RachaChatLobby105.estado().medidas - m0, ms:performance.now() - t0}; })()""")
        await pg.wait_for_timeout(200)
        m2 = await rt(pg, "RachaChatLobby105.estado().medidas")
        P.confere(m['msg'] == 'SAGAZ: Cria sala aí!' and m['n'] == '3' and m['medidas'] == 0 and m2 == c0['est']['medidas'], '5) a mensagem nova troca na hora o texto da barra (e o número), sem medir nada de novo', [m, m2, c0['est']['medidas']])
        # 4) o treino: o lobby fecha e leva a barra (nada por cima do HUD)
        await rt(pg, "(() => { jogar(); return 1; })()"); await pg.wait_for_timeout(900)
        t = await rt(pg, """(() => { const el = CB.el, vis = !!el && !el.hidden && getComputedStyle(el).display !== 'none' && el.getBoundingClientRect().width > 2;
          return {lobby:lobby.aberto, onde:CB.onde, vis, raiz:LB.raiz.hidden}; })()""")
        P.confere(not t['lobby'] and t['onde'] == '' and not t['vis'] and t['raiz'], '4) no treino a barra some (o lobby fechado leva junto): nada por cima do HUD', t)
        await rt(pg, "(() => { abrirLobby(); return 1; })()"); await pg.wait_for_timeout(500)
        c = await rt(pg, LOBBY)
        P.confere(c['barra'] == c0['barra'] and c['onde'] == 'lobby', '4) de volta ao lobby, a barra volta para o mesmo lugar', [c['barra'], c0['barra']])
        # 4) a partida da sala (neste aparelho): a barra da partida, embaixo do campo — a do lobby não fica na tela
        await rt(pg, "(() => { Object.assign(SX.form, {onde:'aqui', pub:true, n:1, map:4, jogo:'futebol', tempo:0, bots:true, nome:'Racha'}); sxCriar(); return 1; })()"); await pg.wait_for_timeout(500)
        await rt(pg, "(() => { net49Send({type:'seat', team:0}); return 1; })()"); await pg.wait_for_timeout(200)
        await rt(pg, "slIniciar()"); await pg.wait_for_timeout(2200)
        await rt(pg, "(() => { rqVsComeca(); return 1; })()"); await pg.wait_for_timeout(500)
        j = await rt(pg, """(() => { const r = CB.el.getBoundingClientRect(), c = cv.getBoundingClientRect();
          return {onde:CB.onde, cls:CB.el.className, wrap:document.getElementById('wrap').contains(CB.el), palco:LB.palco.contains(CB.el), lobby:lobby.aberto, raiz:LB.raiz.hidden,
            emb:r.bottom <= c.bottom + 1, lobbyBarra:!!document.querySelector('#lb-palco .c81.c81-lobby:not([hidden])')}; })()""")
        await pg.screenshot(path=str(SAIDA / 'v105_chat_partida_1280x720.png'))
        P.confere(j['onde'] == 'jogo' and 'c81-jogo' in j['cls'] and j['wrap'] and not j['palco'] and not j['lobby'] and j['raiz'] and not j['lobbyBarra'] and j['emb'],
                  '4) na partida da sala é a barra da partida (embaixo do campo, a de sempre), não a do lobby', j)
        js = js_erros(erros)
        P.confere(not js, '4) e 5): sem erro de JavaScript', js[:3])
    finally:
        await b.close()


# ---------------------------------------------------------------------------------------------------------------- 6)
async def plataforma(pw, P):
    print('\n6) com a plataforma de teste: duas contas, o Chat do Brasil de verdade')
    banco = os.path.join(tempfile.mkdtemp(prefix='racha105c-'), 'plataforma.sqlite')
    PL = Plataforma(banco).sobe()
    try:
        ana, beto = conta(PL, 'anav105'), conta(PL, 'betov105')
        bA, A, eA = await abre_logado(pw, PL, 'anav105', 1280, 720)
        bB, B, eB = await abre_logado(pw, PL, 'betov105', 844, 390)
        try:
            for pg in (A, B):                                           # (a primeira vez já passou e as janelas da entrada fecharam)
                await rt(pg, "(() => { if (ONB.aberto) onbFim(); filaPop.length = 0; if (!LB.pop.hidden) fechaPop(); if (lobby.tela) fechaTela(); return 1; })()")
            liga = [await espera(pg, "BRASIL.estado === 'on' && CB.onde === 'lobby' && RachaChatLobby105.estado().visivel", 15000) for pg in (A, B)]
            P.confere(all(liga), 'o Chat do Brasil liga sozinho no lobby e a barra aparece (nos dois)', liga)
            # o Beto escreve pela barra dele (o clique de verdade, o campo e o ENVIAR)
            bb = await rt(B, "(() => { const r = CB.el.getBoundingClientRect(); return [r.left + r.width/2, r.top + r.height/2]; })()")
            await B.mouse.click(bb[0], bb[1]); await asyncio.sleep(.4)
            await B.fill('#cp .c81-in', 'bora racha no lobby')
            await B.click('#cp .c81-ok'); await asyncio.sleep(.3)
            await rt(B, "(() => { CB.pn.querySelector('.c81-min').click(); return 1; })()")
            msg = await espera(A, "(() => { const t = CB.msg.textContent; return /bora racha no lobby/.test(t) ? t : ''; })()", 10000)
            n = await rt(A, "CB.n.hidden ? '' : CB.n.textContent")
            await A.screenshot(path=str(SAIDA / 'v105_chat_real_1280x720.png'))
            P.confere(msg == 'betov105: bora racha no lobby' and n == '1', 'a mensagem que o Beto mandou pela barra dele aparece na barra da Ana na hora, com o nome (e 1 não lida)', [msg, n])
            # a Ana toca na barra, escreve e manda
            ba = await rt(A, "(() => { const r = CB.el.getBoundingClientRect(); return [r.left + r.width/2, r.top + r.height/2]; })()")
            await A.mouse.click(ba[0], ba[1]); await asyncio.sleep(.4)
            p = await rt(A, PAINEL)
            P.confere(p['aberto'] and p['vis'] and any('bora racha no lobby' in x for x in p['linhas']) and p['foco'], 'a Ana toca na barra: o painel abre com a mensagem do Beto e o campo pronto', p)
            await A.screenshot(path=str(SAIDA / 'v105_chat_real_painel_1280x720.png'))
            await A.keyboard.type('salve beto')
            await A.click('#cp .c81-ok')
            chegou = await espera(B, "(() => { const m = BRASIL.msgs.find(x => /salve beto/.test(x.texto || '')); return m ? m.nome + ': ' + m.texto : ''; })()", 10000)
            barB = await espera(B, "(() => { const t = CB.msg.textContent; return /salve beto/.test(t) ? t : ''; })()", 5000)
            P.confere(chegou == 'anav105: salve beto' and barB == 'anav105: salve beto', 'a Ana escreve e manda pelo painel: chega no Beto (e aparece na barra dele)', [chegou, barB])
            # o nome do Beto abre a ficha com o VER PERFIL; o perfil abre por cima (o painel do chat fecha antes)
            await A.click('#cp .c81-lista .c81-nome:has-text("betov105")'); await asyncio.sleep(.3)
            fic = await rt(A, "(() => { const F = C81.ficha; return {vis:!!F && !F.hidden, bts:[...F.querySelectorAll('.c81-f-bt span')].map(s => s.textContent), id:(F.querySelector('.c81-f-tx small') || {}).textContent || ''}; })()")
            P.confere(fic['vis'] and fic['bts'] and fic['bts'][0] == 'VER PERFIL' and beto['pub'] in fic['id'], 'o nome do Beto no painel abre a ficha dele, com o VER PERFIL primeiro', fic)
            await A.click('#cp .c81-ficha .c81-f-bt:has-text("VER PERFIL")')
            pf = await espera(A, """(() => { const c = LB.popCaixa; if (LB.pop.hidden || !c.classList.contains('v88-perfil-pop') || !/betov105/i.test(c.textContent || '')) return '';
              const r = c.getBoundingClientRect(), e = document.elementFromPoint(r.left + r.width/2, r.top + Math.min(r.height/2, 60));
              return JSON.stringify({emCima:!!e && c.contains(e), chat:CB.aberto, pn:CB.pn.hidden}); })()""", 10000)
            pf = json.loads(pf) if pf else {}
            await A.screenshot(path=str(SAIDA / 'v105_chat_real_perfil_1280x720.png'))
            P.confere(pf.get('emCima') and not pf.get('chat') and pf.get('pn'), 'o VER PERFIL abre o perfil do Beto por cima do lobby (o painel do chat fecha antes: antes o perfil ficava atrás dele)', pf)
            await rt(A, "(() => { fechaPop(); return 1; })()"); await asyncio.sleep(.3)
            v = await rt(A, "({onde:CB.onde, aberto:CB.aberto, vis:RachaChatLobby105.estado().visivel, msg:CB.msg.textContent})")
            P.confere(v['onde'] == 'lobby' and not v['aberto'] and v['vis'], 'fechar o perfil volta para o lobby com a barra do chat', v)
            # logado, com o Chat do Brasil desligado nos Ajustes, a barra fica (os amigos e o clube) e diz isso; ligado de novo, volta
            await rt(A, "(() => { document.getElementById('aj-chat').click(); return 1; })()"); await asyncio.sleep(.3)
            dl = await rt(A, "({onde:CB.onde, vis:RachaChatLobby105.estado().visivel, msg:CB.msg.textContent, ligado:brasilLigado()})")
            P.confere(not dl['ligado'] and dl['onde'] == 'lobby' and dl['vis'] and dl['msg'] == 'Chat do Brasil desligado nos Ajustes',
                      'logado, o Chat do Brasil desligado nos Ajustes: a barra fica (amigos e clube) e diz "Chat do Brasil desligado nos Ajustes"', dl)
            await rt(A, "(() => { document.getElementById('aj-chat').click(); LB.aj.hidden = true; return 1; })()")
            volta = await espera(A, "BRASIL.estado === 'on' && /salve beto/.test(CB.msg.textContent) ? CB.msg.textContent : ''", 15000)
            P.confere(volta == 'anav105: salve beto', 'ligado de novo: o Chat do Brasil reconecta sozinho e a barra mostra a última mensagem', volta)
            erros = [e for e in eA + eB if 'Failed to load resource' not in e]
            P.confere(not erros, '7) nenhum erro de JavaScript (os dois navegadores)', erros[:3])
        finally:
            await bA.close(); await bB.close()
    finally:
        PL.desce()


async def principal():
    P = Placar('v105 · o chat na tela do lobby')
    async with async_playwright() as pw:
        print('1) e 2) o lugar nos tamanhos de tela, tocar abre e minimizar volta')
        for w, h, nome in TAMANHOS:
            await lugar_em(pw, P, w, h, nome)
        await lugar_em(pw, P, 844, 390, 'iPhone deitado 844×390 (as áreas seguras)', ins=IPHONE)
        await lugar_em(pw, P, 800, 336, 'app do iPhone deitado 800×336')
        await lugar_em(pw, P, 1280, 720, 'computador 1280×720 com o grupo cheio', grupo=True)
        await lugar_em(pw, P, 844, 390, 'iPhone deitado 844×390 com o grupo cheio', ins=IPHONE, grupo=True)
        await por_baixo(pw, P)
        await sem_chat(pw, P)
        await partida_e_quadros(pw, P)
        if '--sem-plataforma' not in sys.argv:
            await plataforma(pw, P)
    return P.fim()


if __name__ == '__main__':
    sys.exit(asyncio.run(principal()))
