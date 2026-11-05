"""RACHA v107 · o perfil pelo nome no chat, na sala e na partida (passa/falha, com fotos em tests/saida/), com o jogo logado na
plataforma de teste (o código de verdade de app/api com SQLite e o servidor das salas montado no mesmo endereço) e três contas
em três navegadores — a Ana (1280 × 720), o Beto (844 × 390, o celular deitado) e o Caio (1280 × 720), ninguém amigo de ninguém:
  1. a janelinha do nome: o Beto escreve no Chat do Brasil; a Ana abre o painel pela barra do lobby e toca no nome dele — a
     janelinha colada no nome (a pontinha nele), com PERFIL (azul), CONVIDAR (verde) e DENUNCIAR (vermelho) empilhados e
     SILENCIAR · BLOQUEAR embaixo, dentro da tela; tocar fora fecha (o painel fica); o mesmo no 844 × 390, com a área segura do
     iPhone, e na tela inteira do Chat do Brasil (o Esc fecha);
  2. PERFIL abre o perfil do jogo do Beto (os números, a COMPETIÇÃO e o ADICIONAR) por cima do lobby;
  3. o seu nome: só o MEU PERFIL (abre o seu perfil); quem não tem conta: o PERFIL diz "sem conta" e o CONVIDAR fica apagado com
     o motivo;
  4. DENUNCIAR pede o motivo ali mesmo (na janelinha, no mesmo lugar) e a denúncia vai para o banco; depois, DENUNCIADA;
  5. sem sala, o CONVIDAR dá o aviso de sempre e nada vai; com a sala criada, a Ana convida o Beto pelo nome no Chat do Brasil:
     o convite chega na hora (a janela de sempre, "pelo chat") e o ENTRAR põe o Beto na sala;
  6. a sala: o Beto (não é o árbitro) toca no cartão da Ana: a janelinha com o PERFIL, que abre o perfil dela; a Ana (a
     árbitra) toca no cartão do Beto: a ficha do árbitro com o VER PERFIL primeiro (o resto como antes; cabe também no 844 × 390);
  7. a partida: o nome no chat da partida abre a janelinha por cima do jogo e o PERFIL, o perfil por cima do jogo; no painel
     dos jogadores, o Beto toca no nome da Ana (a janelinha com o PERFIL) e a Ana no do Beto (a ficha com o VER PERFIL);
  8. sem estar na conta (só treinar offline): o PERFIL e o CONVIDAR dizem para entrar na conta;
  9. nenhum erro de JavaScript.
  python3 tests/v107_perfil_test.py"""
import asyncio, json, os, sys, tempfile
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from comum import Placar, rt, abre, async_playwright, RAIZ
from v88_cliente_test import Plataforma, conta, abre_logado, espera

SAIDA = RAIZ / 'tests' / 'saida'
# a janelinha aberta: os botões (o rótulo, o motivo, a cor, apagado, a altura), os links, dentro da tela (e da área segura) e
# colada no nome (a caixa encosta no lado escolhido e a pontinha fica na altura — ou na largura — do nome)
POP = """(() => { const e = window.RachaPerfil107.estado(); if (!e.aberta) return {aberta:''};
  const el = e.aberta === 'chat' ? C81.ficha : PF107.pop, q = e.caixa, a = e.ancora, s = e.seta, sa = e.area, vw = innerWidth, vh = innerHeight;
  const bts = [...el.querySelectorAll('.pf107-acoes > .pf107-bt')].map(b => ({rot:(b.querySelector('.pf107-rot') || b).textContent.trim(), sub:(b.querySelector('.pf107-sub') || {}).textContent || '',
    cor:['azul', 'verde', 'vermelho'].find(c => b.classList.contains('pf107-' + c)) || '', off:b.disabled, h:Math.round(b.getBoundingClientRect().height)}));
  const links = [...el.querySelectorAll('.pf107-link')].map(b => b.textContent.trim());
  const dentro = q.x >= sa.l - .5 && q.y >= sa.t - .5 && q.x + q.w <= vw - sa.r + .5 && q.y + q.h <= vh - sa.b + .5;
  let colada = false;
  if (a && s) colada = e.lado === 'dir' ? Math.abs(q.x - (a.x + a.w)) <= 30 && s.y >= a.y - 4 && s.y <= a.y + a.h + 4
    : e.lado === 'esq' ? Math.abs(a.x - (q.x + q.w)) <= 30 && s.y >= a.y - 4 && s.y <= a.y + a.h + 4
    : e.lado === 'baixo' ? Math.abs(q.y - (a.y + a.h)) <= 30 && s.x >= a.x - 4 && s.x <= a.x + a.w + 4
    : Math.abs(a.y - (q.y + q.h)) <= 30 && s.x >= a.x - 4 && s.x <= a.x + a.w + 4;
  const topo = document.elementFromPoint(q.x + q.w/2, q.y + Math.min(q.h - 6, 60));
  return {aberta:e.aberta, ctx:e.ctx, lado:e.lado, fora:e.fora, bts, links, dentro, colada, emCima:!!topo && el.contains(topo),
    nome:(el.querySelector('.pf107-id b') || {}).textContent || '', id:(el.querySelector('.pf107-id small') || {}).textContent || '', caixa:q, ancora:a, seta:s, vw, vh, sa}; })()"""
PERFIL = """(() => { const c = LB.popCaixa; if (LB.pop.hidden || !c.classList.contains('v88-perfil-pop')) return null;
  const t = c.textContent || '', r = c.getBoundingClientRect(), e = document.elementFromPoint(r.left + r.width/2, r.top + Math.min(r.height/2, 80));
  return {txt:t.slice(0, 400), nome:(c.querySelector('.v88-pf-id h2') || {}).textContent || '', num:[...c.querySelectorAll('.v88-pf-num small')].map(x => x.textContent),
    adicionar:[...c.querySelectorAll('button')].some(b => /ADICIONAR/.test(b.textContent)), comp:/COMPETI/i.test(t), emCima:!!e && c.contains(e),
    jogo:NET49.playing && !lobby.aberto, camada:LB.raiz.classList.contains('v103-pop-jogo')}; })()"""
NUMEROS = ['Partidas', 'Vitórias', 'Gols', 'Assistências', 'Melhor da partida', 'Tempo jogado']


async def foto(pg, nome):
    SAIDA.mkdir(parents=True, exist_ok=True)
    await pg.screenshot(path=str(SAIDA / nome))


async def fecha_pops(pg):
    await rt(pg, "(() => { if (typeof ONB !== 'undefined' && ONB.aberto) onbFim(); filaPop.length = 0; if (!LB.pop.hidden) fechaPop(); if (lobby.tela) fechaTela(); window.RachaPerfil107.fecha(); return 1; })()")


async def abre_painel(pg, aba=None):
    """Abre o painel do chat pela barra (o toque de verdade); aba: troca para BRASIL/SALA."""
    if not await rt(pg, "CB.aberto"):
        xy = await rt(pg, "(() => { const r = CB.el.getBoundingClientRect(); return r.width ? [r.left + r.width/2, r.top + r.height/2] : null; })()")
        if xy: await pg.mouse.click(xy[0], xy[1])
        await asyncio.sleep(.45)
        if not await rt(pg, "CB.aberto"):                   # (um aviso por cima da barra — o "Denúncia enviada" fica no mesmo lugar dela na sala)
            await rt(pg, "(() => { cbAbre(); return 1; })()"); await asyncio.sleep(.35)
    if aba:
        await rt(pg, "(() => { if (CB.aba !== %s){ CB.aba = %s; cbLido(); cbPintaPainel(); cbPinta(); } return 1; })()" % (json.dumps(aba), json.dumps(aba)))
        await asyncio.sleep(.2)


async def toca_nome(pg, nome):
    await pg.click('#cp .c81-lista .c81-nome:has-text("%s") >> nth=-1' % nome)
    await asyncio.sleep(.35)


def js_erros(l):
    return [e for e in l if 'Failed to load resource' not in e and 'WebSocket connection' not in e and 'ERR_UNSAFE_PORT' not in e]


async def principal():
    P = Placar('v107 · o perfil pelo nome no chat, na sala e na partida')
    banco = os.path.join(tempfile.mkdtemp(prefix='racha107p-'), 'plataforma.sqlite')
    PL = Plataforma(banco).sobe()
    erros_todos = []
    try:
        ana, beto, caio = conta(PL, 'anav107'), conta(PL, 'betov107'), conta(PL, 'caiov107')
        pubA, pubB, pubC = [str(x['pub']).zfill(6) for x in (ana, beto, caio)]
        idA, idB = 'c' + str(int(pubA)), 'c' + str(int(pubB))
        async with async_playwright() as pw:
            bA, A, eA = await abre_logado(pw, PL, 'anav107', 1280, 720)
            bB, B, eB = await abre_logado(pw, PL, 'betov107', 844, 390)
            bC, C, eC = await abre_logado(pw, PL, 'caiov107', 1280, 720)
            erros_todos += [eA, eB, eC]
            for pg in (A, B, C): await fecha_pops(pg)
            liga = [await espera(pg, "BRASIL.estado === 'on' && !!NET49.id", 20000) for pg in (A, B, C)]
            P.confere(all(liga), '0) os três no lobby com o Chat do Brasil e a conexão das salas ligados', liga)
            await rt(B, "(() => { brasilSend({type:'brasil_say', text:'bora jogar comigo'}); return 1; })()")
            await rt(C, "(() => { brasilSend({type:'brasil_say', text:'gol contra kkk'}); return 1; })()")
            chegou = await espera(A, "(BRASIL.msgs || []).some(m => /bora jogar comigo/.test(m.texto || '')) && (BRASIL.msgs || []).some(m => /gol contra/.test(m.texto || ''))", 10000)
            P.confere(bool(chegou), '0) o Beto e o Caio escrevem no Chat do Brasil; chega na Ana')

            print('\n1) a janelinha do nome (o painel que a barra do lobby abre)')
            await fecha_pops(A)
            await abre_painel(A, 'brasil')
            await toca_nome(A, 'betov107')
            p = await rt(A, POP)
            await foto(A, 'v107_chat_popup_1280x720.png')
            P.confere(p['aberta'] == 'chat' and [b['rot'] for b in p['bts']] == ['PERFIL', 'CONVIDAR', 'DENUNCIAR'] and [b['cor'] for b in p['bts']] == ['azul', 'verde', 'vermelho'],
                      '1) tocar no nome do Beto abre a janelinha: PERFIL (azul), CONVIDAR (verde) e DENUNCIAR (vermelho), nessa ordem', p.get('bts'))
            P.confere(p['links'] == ['SILENCIAR', 'BLOQUEAR'] and p['nome'] == 'betov107' and pubB in p['id'], '1) embaixo, SILENCIAR e BLOQUEAR; em cima, o nome e o ID dele', [p['links'], p['nome'], p['id']])
            P.confere(p['colada'] and p['dentro'] and p['emCima'] and all(b['h'] >= 44 for b in p['bts']) and not p['fora'],
                      '1) colada no nome (a pontinha nele, lado %s), inteira na tela de 1280 × 720, por cima do painel, botões ≥ 44 px' % p['lado'], [p['lado'], p['caixa'], p['ancora'], p['seta']])
            P.confere(p['bts'][1]['sub'] == 'crie ou entre numa sala' and not p['bts'][1]['off'], '1) sem sala, o CONVIDAR já avisa: "crie ou entre numa sala"', p['bts'][1])
            await A.click('#cp .c81-ficha .pf107-verde'); await asyncio.sleep(.6)
            av = await rt(A, "({erro:(C81.erro && !C81.erro.hidden) ? C81.erro.textContent : '', sub:(C81.ficha.querySelector('.pf107-verde .pf107-sub') || {}).textContent || '', aberta:window.RachaPerfil107.estado().aberta})")
            nada = await rt(B, "(V88.convites || []).length")
            P.confere(av['erro'] == 'Crie ou entre numa sala para convidar.' and nada == 0 and av['aberta'] == 'chat',
                      '1) tocar no CONVIDAR sem sala: o aviso de sempre ("Crie ou entre numa sala para convidar.") e nenhum convite sai', [av, nada])
            fundo = await rt(A, "(() => { const r = CB.pn.querySelector('.c81-caixa').getBoundingClientRect(); return [Math.max(4, r.left - 30), Math.max(4, r.top - 30)]; })()")
            await A.mouse.click(fundo[0], fundo[1]); await asyncio.sleep(.3)
            f = await rt(A, "({aberta:window.RachaPerfil107.estado().aberta, fichaOculta:C81.ficha.hidden, chat:CB.aberto})")
            P.confere(f['aberta'] == '' and f['fichaOculta'] and f['chat'], '1) tocar fora fecha a janelinha (o painel do chat continua aberto)', f)

            print('\n2) PERFIL: o perfil do jogo por cima do lobby')
            await toca_nome(A, 'betov107')
            await A.click('#cp .c81-ficha .pf107-azul')
            pf = await espera(A, "(() => { const p = (%s); return p && /betov107/i.test(p.nome) ? p : null; })()" % PERFIL, 10000)
            await foto(A, 'v107_chat_perfil.png')
            P.confere(pf and pf['emCima'] and all(n in pf['num'] for n in NUMEROS) and pf['adicionar'] and pubB in pf['txt'],
                      '2) o PERFIL abre o perfil do Beto (o nome, o ID, os números: partidas, vitórias, gols, assistências, melhor da partida e tempo jogado; e o ADICIONAR)', pf)
            P.confere(pf and pf['comp'], '2) com a COMPETIÇÃO', pf and pf['txt'][:200])
            await rt(A, "(() => { fechaPop(); return 1; })()"); await asyncio.sleep(.3)

            print('\n1b) no celular deitado (844 × 390), com e sem a área segura do iPhone, e na tela inteira do Chat do Brasil')
            await rt(A, "(() => { brasilSend({type:'brasil_say', text:'salve galera'}); return 1; })()")
            await espera(B, "(BRASIL.msgs || []).some(m => /salve galera/.test(m.texto || ''))", 10000)
            await fecha_pops(B); await abre_painel(B, 'brasil')
            await toca_nome(B, 'anav107')
            pb = await rt(B, POP)
            await foto(B, 'v107_chat_popup_844x390.png')
            P.confere(pb['aberta'] == 'chat' and [b['rot'] for b in pb['bts']] == ['PERFIL', 'CONVIDAR', 'DENUNCIAR'] and pb['colada'] and pb['dentro'] and pb['emCima'] and all(b['h'] >= 44 for b in pb['bts']),
                      '1b) no 844 × 390: a mesma janelinha, colada no nome e inteira na tela (botões ≥ 44 px)', [pb['lado'], pb['caixa'], pb['ancora'], [b['h'] for b in pb['bts']]])
            await rt(B, "(() => { window.RachaPerfil107.fecha(); LB.sa.style.padding = '0px 47px 21px 47px'; return 1; })()")
            await toca_nome(B, 'anav107')
            pi = await rt(B, POP)
            await foto(B, 'v107_chat_popup_844x390_iphone.png')
            P.confere(pi['aberta'] == 'chat' and pi['dentro'] and pi['sa']['l'] == 47 and pi['sa']['b'] == 21 and pi['caixa']['x'] + pi['caixa']['w'] <= 844 - 47 + .5,
                      '1b) com o entalhe e a barra do iPhone (47 px dos lados, 21 embaixo): fica dentro da área segura', [pi['caixa'], pi['sa']])
            await rt(B, "(() => { window.RachaPerfil107.fecha(); LB.sa.style.padding = ''; cbFecha(); return 1; })()")
            await fecha_pops(A)
            await rt(A, "(() => { abreTela('chat'); return 1; })()"); await asyncio.sleep(.6)
            await A.click('#br-lista .br-msg:has-text("bora jogar comigo") .br-nome')
            await asyncio.sleep(.35)
            pt = await rt(A, POP)
            await foto(A, 'v107_chat_tela.png')
            P.confere(pt['aberta'] == 'chat' and pt['ctx'] == 'tela' and pt['fora'] and [b['rot'] for b in pt['bts']] == ['PERFIL', 'CONVIDAR', 'DENUNCIAR'] and pt['colada'] and pt['dentro'] and pt['emCima'],
                      '1b) na tela inteira do Chat do Brasil (antes: só o SILENCIAR numa janela no meio), a mesma janelinha colada no nome', [pt['ctx'], pt['lado'], pt['caixa']])
            await A.keyboard.press('Escape'); await asyncio.sleep(.25)
            P.confere(await rt(A, "window.RachaPerfil107.estado().aberta") == '' and await rt(A, "lobby.tela") == 'chat', '1b) o Esc fecha a janelinha (a tela do chat fica)')
            await rt(A, "(() => { fechaTela(); return 1; })()")

            print('\n3) o seu nome e quem não tem conta')
            await abre_painel(A, 'brasil')
            await toca_nome(A, 'anav107')
            eu = await rt(A, POP)
            P.confere(eu['aberta'] == 'chat' and [b['rot'] for b in eu['bts']] == ['MEU PERFIL'] and not eu['links'], '3) o seu nome: só o MEU PERFIL (sem convidar, denunciar, silenciar nem bloquear)', eu['bts'])
            await A.click('#cp .c81-ficha .pf107-azul')
            P.confere(bool(await espera(A, "lobby.tela === 'perfil'", 6000)), '3) o MEU PERFIL abre o seu perfil')
            await fecha_pops(A)
            await rt(A, """(() => { BRASIL.msgs.push({id:'m9999999', from:'u777', nome:'visitante7', selo:'', skin:'', texto:'sou visitante', t:Date.now()}); return 1; })()""")
            await abre_painel(A, 'brasil'); await rt(A, "(() => { cbPintaPainel(); return 1; })()")
            await toca_nome(A, 'visitante7')
            vi = await rt(A, POP)
            P.confere(vi['aberta'] == 'chat' and vi['bts'][0]['rot'] == 'PERFIL' and vi['bts'][0]['off'] and vi['bts'][0]['sub'] == 'sem conta' and vi['bts'][1]['off'] and 'sem conta' in vi['bts'][1]['sub'] and not vi['bts'][2]['off'] and 'sem conta' in vi['id'],
                      '3) quem não tem conta: o PERFIL diz "sem conta", o CONVIDAR fica apagado com o motivo (o DENUNCIAR continua)', vi['bts'])
            await rt(A, "(() => { window.RachaPerfil107.fecha(); BRASIL.msgs = BRASIL.msgs.filter(m => m.id !== 'm9999999'); cbPintaPainel(); return 1; })()")

            print('\n4) DENUNCIAR: o motivo na janelinha e a denúncia no banco')
            PL.sql("UPDATE usuarios SET criado_em = criado_em - 3600000 WHERE username IN ('anav107','betov107','caiov107')")   # (conta nova não denuncia: uma hora depois)
            await toca_nome(A, 'caiov107')
            antes = await rt(A, POP)
            await A.click('#cp .c81-ficha .pf107-vermelho'); await asyncio.sleep(.35)
            den = await rt(A, """(() => { const F = C81.ficha, q = F.getBoundingClientRect(), e = window.RachaPerfil107.estado();
              return {mot:[...F.querySelectorAll('.v88-f-m')].map(b => b.textContent), on:(F.querySelector('.v88-f-m.on') || {}).dataset ? F.querySelector('.v88-f-m.on').dataset.m : '', envia:!!F.querySelector('.v88-f-envia'),
                pop:F.classList.contains('pf107-pop'), dentro:q.left >= 0 && q.top >= 0 && q.right <= innerWidth && q.bottom <= innerHeight, lado:e.lado, perto:Math.abs(q.left - %s) < 2}; })()""" % antes['caixa']['x'])
            await foto(A, 'v107_chat_denuncia.png')
            P.confere(den['pop'] and len(den['mot']) == 7 and den['on'] == 'ofensa' and den['envia'] and den['dentro'] and den['perto'],
                      '4) DENUNCIAR pede o motivo ali mesmo (os 7, OFENSA marcado), na mesma janelinha e no mesmo lugar', den)
            await rt(A, "(() => { C81.ficha.querySelector('.v88-f-m[data-m=\"toxico\"]').click(); C81.ficha.querySelector('.v88-f-envia').click(); return 1; })()")
            await asyncio.sleep(1.2)
            dbd = PL.sql("SELECT motivo, detalhes FROM denuncias WHERE motivo = 'toxico'")
            P.confere(dbd and any('gol contra' in (d['detalhes'] or '') for d in dbd), '4) ENVIAR: a denúncia (TÓXICO) vai para o banco com o texto da mensagem, para o RACHA CONTROL', dbd)
            await toca_nome(A, 'caiov107')
            dd = await rt(A, POP)
            P.confere(dd['bts'][2]['rot'] == 'DENUNCIADA' and dd['bts'][2]['off'], '4) a mesma mensagem depois: DENUNCIADA (apagado)', dd['bts'][2])
            await rt(A, "(() => { window.RachaPerfil107.fecha(); cbFecha(); return 1; })()")

            print('\n5) CONVIDAR quem não é amigo pelo Chat do Brasil: o convite chega e o ENTRAR põe na sala')
            await rt(A, "(() => { abreTela('amigos'); Object.assign(SX.form, {onde:'online', pub:false, n:1, map:0, jogo:'futebol', tempo:0, nome:'Racha da Ana'}); sxCriar(); return 1; })()")
            cod = await espera(A, "NET49.room && NET49.room.code", 10000)
            await espera(A, "lobby.tela === 'sala'", 6000)
            await abre_painel(A, 'brasil')
            await toca_nome(A, 'betov107')
            pc = await rt(A, POP)
            P.confere(cod and pc['bts'][1]['rot'] == 'CONVIDAR' and not pc['bts'][1]['off'] and pc['bts'][1]['sub'] == 'para a sua sala', '5) na sala, o CONVIDAR fica "para a sua sala"', [cod, pc['bts'][1]])
            await A.click('#cp .c81-ficha .pf107-verde')
            cv = await espera(B, "(() => { const x = (V88.convites || []).find(c => c.via === 'chat'); return x ? {de:x.de.nome, code:x.sala.code, amigo:x.amigo} : null; })()", 10000)
            pop = await espera(B, "(() => { const c = LB.popCaixa; return !LB.pop.hidden && c.classList.contains('v88-convite-pop') ? {h:(c.querySelector('h2') || {}).textContent, nota:(c.querySelector('.pf107-conv-nota') || {}).textContent || ''} : null; })()", 6000)
            env = await espera(A, "(() => { const t = (C81.erro && !C81.erro.hidden ? C81.erro.textContent : '') + ' ' + (LB.aviso.textContent || ''); return /Convite enviado para betov107/.test(t) ? t.trim() : ''; })()", 6000)
            await foto(B, 'v107_convite_recebido.png')
            P.confere(cv and cv['de'] == 'anav107' and cv['code'] == cod and cv['amigo'] is False and pop and pop['h'] == 'anav107 chamou você!' and 'pelo chat' in pop['nota'].lower(),
                      '5) o Beto (que não é amigo da Ana) recebe o convite na hora: a janela de sempre, dizendo que veio pelo chat', [cv, pop])
            P.confere(bool(env), '5) a Ana vê "Convite enviado para betov107."', env)
            await B.click('#pop-caixa .pop-acoes button:has-text("ENTRAR")')
            entrou = await espera(B, "NET49.room && NET49.room.code === %s && NET49.room.members.some(m => m.id === %s)" % (json.dumps(cod), json.dumps(idB)), 10000)
            await espera(B, "lobby.tela === 'sala'", 6000)
            P.confere(bool(entrou), '5) o ENTRAR põe o Beto na sala da Ana (fechada: só pelo convite)')
            await rt(A, "(() => { window.RachaPerfil107.fecha(); cbFecha(); return 1; })()")

            print('\n6) a sala: o cartão de quem está nela')
            await asyncio.sleep(.6)
            await B.click('#tela-sala .sl-card[data-id="%s"]' % idA); await asyncio.sleep(.35)
            sc = await rt(B, POP)
            nota = await rt(B, "(PF107.pop.querySelector('.pf107-nota') || {}).textContent || ''")
            await foto(B, 'v107_sala_cartao.png')
            P.confere(sc['aberta'] == 'membro' and sc['ctx'] == 'sala' and [b['rot'] for b in sc['bts']] == ['PERFIL'] and sc['nome'] == 'anav107' and pubA in sc['id'] and sc['dentro'] and sc['colada'] and 'árbitro' in nota,
                      '6) o Beto (não é o árbitro) toca no cartão da Ana: a janelinha com o PERFIL, colada no cartão (e diz que ela é a árbitra)', [sc['bts'], sc['id'], nota, sc['lado']])
            await B.click('.pf107-membro .pf107-azul')
            pfa = await espera(B, "(() => { const p = (%s); return p && /anav107/i.test(p.nome) ? p : null; })()" % PERFIL, 10000)
            P.confere(pfa and pfa['adicionar'] and all(n in pfa['num'] for n in NUMEROS) and pfa['emCima'], '6) o PERFIL abre o perfil da Ana (os números e o ADICIONAR) por cima da sala', pfa)
            await rt(B, "(() => { fechaPop(); return 1; })()"); await asyncio.sleep(.3)
            P.confere(await rt(B, "lobby.tela") == 'sala', '6) fechar o perfil volta para a tela da sala')
            await A.click('#tela-sala .sl-card[data-id="%s"]' % idB); await asyncio.sleep(.4)
            fa = await rt(A, """(() => { for (const a of document.getAnimations()) try { a.finish(); } catch (_) {}   // (a janela entra crescendo: mede no fim)
              const c = LB.popCaixa, bts = [...c.querySelectorAll('.v103-acoes .lb-btn')];
              return {pop:!LB.pop.hidden && c.classList.contains('v103-ficha'), bts:bts.map(b => b.textContent), vis:bts.every(b => { const r = b.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight && r.width > 40; }),
                rola:(() => { const g = c.querySelector('.v103-acoes'); return g.scrollHeight > g.clientHeight + 1; })()}; })()""")
            await foto(A, 'v107_sala_arbitro.png')
            P.confere(fa['pop'] and fa['bts'][:1] == ['VER PERFIL'] and 'PÔR NO BANCO' in fa['bts'] and 'TORNAR ÁRBITRO' in fa['bts'] and 'REMOVER DA SALA' in fa['bts'] and fa['bts'][-1] == 'CANCELAR' and fa['vis'] and not fa['rola'],
                      '6) a Ana (a árbitra) toca no cartão do Beto: a ficha do árbitro com o VER PERFIL primeiro e o resto como antes (tudo à vista, sem rolar)', fa)
            await rt(A, "(() => { [...LB.popCaixa.querySelectorAll('.lb-btn')].find(b => b.textContent === 'VER PERFIL').click(); return 1; })()")
            pfb = await espera(A, "(() => { const p = (%s); return p && /betov107/i.test(p.nome) ? p : null; })()" % PERFIL, 10000)
            P.confere(pfb and pfb['adicionar'], '6) o VER PERFIL da ficha abre o perfil do Beto', pfb)
            await rt(A, "(() => { fechaPop(); return 1; })()"); await asyncio.sleep(.3)
            await A.set_viewport_size({'width': 844, 'height': 390}); await asyncio.sleep(.8)
            await rt(A, "(() => { window.RachaArbitro103.ficha(NET49.room.members.find(m => m.id === %s)); return 1; })()" % json.dumps(idB)); await asyncio.sleep(1.0)
            fc = await rt(A, """(() => { for (const a of document.getAnimations()) try { a.finish(); } catch (_) {}
              const c = LB.popCaixa, bts = [...c.querySelectorAll('.v103-acoes .lb-btn')].filter(b => b.offsetParent), q = c.getBoundingClientRect();
              return {bts:bts.map(b => b.textContent), dentro:q.top >= -1 && q.bottom <= innerHeight + 1 && q.left >= -1 && q.right <= innerWidth + 1,
                min:Math.min(...bts.map(b => Math.round(b.getBoundingClientRect().height))), rola:c.querySelector('.v103-acoes').scrollHeight > c.querySelector('.v103-acoes').clientHeight + 1}; })()""")
            await foto(A, 'v107_sala_arbitro_844x390.png')
            P.confere(fc['bts'][:1] == ['VER PERFIL'] and fc['dentro'] and fc['min'] >= 44, '6) no 844 × 390 a ficha do árbitro com o VER PERFIL cabe na tela (botões ≥ 44 px)', fc)
            await rt(A, "(() => { fechaPop(); return 1; })()")
            await A.set_viewport_size({'width': 1280, 'height': 720}); await asyncio.sleep(.8)

            print('\n7) a partida: o chat e o painel dos jogadores')
            await espera(A, "NET49.room && NET49.room.roster.every(Boolean)", 8000)
            await rt(A, "slIniciar()")
            jogando = await espera(A, "NET49.playing && NET49.localSlot >= 0 && !lobby.aberto", 20000) and await espera(B, "NET49.playing && NET49.localSlot >= 0 && !lobby.aberto", 20000)
            for pg in (A, B): await rt(pg, "(() => { filaPop.length = 0; if (!LB.pop.hidden) fechaPop(); return 1; })()")
            P.confere(bool(jogando), '7) a partida começa (Ana × Beto)')
            await asyncio.sleep(1.0)
            await rt(B, "(() => { net49Send({type:'say', text:'passa a bola'}); return 1; })()")
            await espera(A, "(SL.chat || []).some(m => m && m.text === 'passa a bola')", 8000)
            await rt(A, "(() => { cbAbre('sala'); return 1; })()"); await asyncio.sleep(.4)
            await toca_nome(A, 'betov107')
            pj = await rt(A, POP)
            await foto(A, 'v107_partida_popup.png')
            P.confere(pj['aberta'] == 'chat' and [b['rot'] for b in pj['bts']] == ['PERFIL', 'CONVIDAR', 'DENUNCIAR'] and pj['bts'][1]['off'] and pj['bts'][1]['sub'] == 'já está na sua sala' and pj['dentro'] and pj['colada'],
                      '7) na partida, o nome no chat abre a janelinha (o CONVIDAR apagado: ele já está na sala)', [pj['bts'], pj['lado']])
            await A.click('#cp .c81-ficha .pf107-azul')
            pjp = await espera(A, "(() => { const p = (%s); return p && /betov107/i.test(p.nome) && p.jogo && p.camada ? p : null; })()" % PERFIL, 10000)
            await foto(A, 'v107_partida_perfil.png')
            P.confere(pjp and pjp['emCima'] and pjp['adicionar'] and all(n in pjp['num'] for n in NUMEROS), '7) o PERFIL abre o perfil do Beto por cima do jogo (a partida continua)', pjp)
            await rt(A, "(() => { fechaPop(); return 1; })()"); await asyncio.sleep(.7)
            volta = await rt(A, "({raiz:LB.raiz.hidden, camada:LB.raiz.classList.contains('v103-pop-jogo'), jogando:NET49.playing})")
            P.confere(volta['raiz'] and not volta['camada'] and volta['jogando'], '7) fechar o perfil volta para a partida', volta)
            await rt(B, "(() => { cbFecha(); v93PainelAlterna(true); return 1; })()")
            linha = await espera(B, "(() => { const li = V93P.el.p && !V93P.el.p.hidden && V93P.el.p.querySelector('li[data-id=%s]'); return !!li; })()" % json.dumps(idA), 8000)
            await B.click('.v93-pj li[data-id="%s"]' % idA); await asyncio.sleep(.4)
            pp = await rt(B, POP)
            await foto(B, 'v107_partida_painel.png')
            P.confere(linha and pp['aberta'] == 'membro' and pp['ctx'] == 'painel' and [b['rot'] for b in pp['bts']] == ['PERFIL'] and pp['nome'] == 'anav107' and pp['dentro'] and pp['emCima'],
                      '7) no painel dos jogadores, o Beto toca no nome da Ana: a janelinha com o PERFIL, por cima do jogo', [linha, pp['bts'], pp['caixa']])
            await B.click('.pf107-membro .pf107-azul')
            ppp = await espera(B, "(() => { const p = (%s); return p && /anav107/i.test(p.nome) && p.jogo ? p : null; })()" % PERFIL, 10000)
            P.confere(ppp and ppp['emCima'] and ppp['adicionar'], '7) e o PERFIL abre o perfil da Ana por cima do jogo', ppp)
            await rt(B, "(() => { fechaPop(); return 1; })()"); await asyncio.sleep(.5)
            await espera(B, "(() => !!(V93P.el.p && !V93P.el.p.hidden && V93P.el.p.querySelector('li[data-id=%s]')))()" % json.dumps(idB), 8000)
            await B.click('.v93-pj li[data-id="%s"]' % idB); await asyncio.sleep(.4)
            pe = await rt(B, POP)
            await B.click('.pf107-membro .pf107-azul')
            pme = await espera(B, "(() => { const p = (%s); return p && /betov107/i.test(p.nome) && p.jogo && !/carregando|Abrindo/i.test(p.txt) ? p : null; })()" % PERFIL, 10000)
            links = await rt(B, "[...LB.popCaixa.querySelectorAll('.v88-pf-mais .v88-link')].map(b => b.textContent.trim())")
            P.confere(pe['aberta'] == 'membro' and [b['rot'] for b in pe['bts']] == ['MEU PERFIL'] and pme and links == ['Fechar'],
                      '7) o seu nome no painel: MEU PERFIL abre o seu perfil por cima do jogo (sem bloquear, silenciar nem denunciar você mesmo)', [pe['bts'], links, pme and pme['nome']])
            await rt(B, "(() => { fechaPop(); v93PainelAlterna(false); return 1; })()")
            await rt(A, "(() => { cbFecha(); v93PainelAlterna(true); return 1; })()")
            await espera(A, "(() => !!(V93P.el.p && !V93P.el.p.hidden && V93P.el.p.querySelector('li[data-id=%s]')))()" % json.dumps(idB), 8000)
            await A.click('.v93-pj li[data-id="%s"]' % idB); await asyncio.sleep(.5)
            pa = await rt(A, """(() => { const c = LB.popCaixa, bts = [...c.querySelectorAll('.v103-acoes .lb-btn')], q = c.getBoundingClientRect(), e = document.elementFromPoint(q.left + q.width/2, q.top + 30);
              return {pop:!LB.pop.hidden && c.classList.contains('v103-ficha'), bts:bts.map(b => b.textContent), emCima:!!e && c.contains(e), jogo:NET49.playing && !lobby.aberto}; })()""")
            await foto(A, 'v107_partida_arbitro.png')
            P.confere(pa['pop'] and pa['bts'][:1] == ['VER PERFIL'] and 'PÔR NO BANCO' in pa['bts'] and pa['emCima'] and pa['jogo'],
                      '7) a Ana (a árbitra) toca no nome do Beto no painel: a ficha do árbitro por cima do jogo, com o VER PERFIL primeiro', pa)
            await rt(A, "(() => { fechaPop(); v93PainelAlterna(false); return 1; })()"); await asyncio.sleep(.6)
            P.confere(await rt(A, "LB.raiz.hidden && NET49.playing"), '7) fechar a ficha volta para a partida')
            await bA.close(); await bB.close(); await bC.close()

            print('\n8) sem estar na conta (só treinar offline)')
            bO, O, eO = await abre(pw, 1280, 720, config={'modo': 'producao', 'servidor': '127.0.0.1:1'})
            erros_todos.append(eO)
            await rt(O, """(() => { ONB.aberto = false; const t = Date.now(); BRASIL.estado = 'on'; BRASIL.online = 3; BRASIL.id = 'u1'; BRASIL.ws = {readyState:1, send(){}, close(){}};
              BRASIL.msgs = [{id:'m1', from:'c45', nome:'MTHZIN', skin:'', texto:'Bora 2v2!', t:t - 30000}]; cbPinta(); return 1; })()""")
            await asyncio.sleep(.3)
            await abre_painel(O, 'brasil')
            await toca_nome(O, 'MTHZIN')
            po = await rt(O, POP)
            P.confere(po['aberta'] == 'chat' and po['bts'][0]['sub'] == 'entre na conta para ver' and not po['bts'][0]['off'] and po['bts'][1]['off'] and po['bts'][1]['sub'] == 'entre na conta para convidar' and po['links'] == ['SILENCIAR'],
                      '8) sem conta: o PERFIL diz "entre na conta para ver" e o CONVIDAR fica apagado ("entre na conta para convidar")', po['bts'])
            await O.click('#cp .c81-ficha .pf107-azul'); await asyncio.sleep(.3)
            oa = await rt(O, "(C81.erro && !C81.erro.hidden) ? C81.erro.textContent : ''")
            P.confere(oa == 'Entre na sua conta para ver o perfil.', '8) tocar no PERFIL diz que precisa entrar na conta', oa)
            await bO.close()
    finally:
        PL.desce()
    erros = js_erros([e for l in erros_todos for e in l])
    P.confere(not erros, '9) nenhum erro de JavaScript (os quatro navegadores)', erros[:4])
    return P.fim()


if __name__ == '__main__':
    sys.exit(asyncio.run(principal()))
