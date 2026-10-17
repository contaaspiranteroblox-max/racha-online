"""v81 · O CHAT: a barra fixa embaixo (o menu, as telas, a sala e a partida), as abas BRASIL | SALA, o perfil pelo nome, o
"digitando" com três pontinhos em cima da tampinha e a moderação.

· A BARRA: no lobby (um bloco no vão da fileira de baixo, entre o DESAFIOS e o MODO, da altura deles: a tag BRASIL/SALA, o
  contador, a seta e NOME: a mensagem mais recente), como um chip no canto nas telas do menu (perfil, salas, amigos, clube,
  eventos, replays; não nas que têm o rodapé ocupado), na sala (embaixo, entre o CONVIDAR e o INICIAR) e na partida (menor e
  meio transparente, embaixo do campo: não cobre o placar nem os controles); toca para abrir, minimiza de novo; some com a
  chave "Chat na tela" dos Ajustes e com o OCULTAR do painel. No celular (o menu encolhido) a barra é maior em px do palco,
  para ler e tocar no tamanho real (mais de 36 px de altura e letra de 14 px ou mais).
· O PAINEL: embaixo (não em cima, como na v63), as abas 🇧🇷 BRASIL | ⚽ SALA (PARTIDA na partida), quem está online, as
  mensagens com o nome em amarelo (e o V), as frases rápidas na sala, o campo "Digite sua mensagem…" e ENVIAR; o nome abre a
  ficha (SILENCIAR, DENUNCIAR, VER PERFIL com a conta).
· OS FILTROS NO APARELHO: telefone, CPF, e-mail, link, @ e palavrão não saem (com o motivo); mensagem repetida e muitas
  seguidas também não.
· OS TRÊS PONTINHOS: o balão escuro com os três pontos em cima da tampinha de quem está digitando (não o texto).
· ONLINE DE VERDADE (o servidor da turma e duas sessões): o Chat do Brasil chega aos dois fora de qualquer sala; na sala, o
  chat da sala só para quem está nela (quem está fora não vê); na partida, o "digitando" de um aparece no outro (os pontinhos
  em cima da tampinha dele) e some quando a mensagem sai; a denúncia de dois esconde a mensagem para todos e cala o autor;
  silenciar tira as mensagens de alguém só para você; o telefone é barrado pelo servidor também.
Isto testa no Chromium de teste; não prova o teclado do celular de verdade (o painel sobe pelo VisualViewport) nem a rede móvel.

Rodar: python3 tests/v81_test.py   (--sem-online: sem o servidor · --so-online: só a parte com o servidor)
"""
import asyncio, json, subprocess, sys, time
from comum import abre, rt, roda, Placar, async_playwright, RAIZ
from online_test import porta_livre, sessao, espera

MSGS = """(() => { const t = Date.now(); BRASIL.estado = 'on'; BRASIL.online = 128; BRASIL.id = 'u1'; BRASIL.ws = {readyState:1, send(){}, close(){}};
  BRASIL.msgs = [{id:'m1', from:'u2', nome:'CRIA7', selo:'verificado', skin:'', texto:'Alguém quer jogar?', t:t - 90000}, {id:'m2', from:'u3', nome:'MTHZIN', skin:'', clube:'Brabos', texto:'Bora 2v2!', t:t - 30000},
    {id:'m3', from:'u4', nome:'SAGAZ', skin:'', texto:'Cria sala aí!', t:t - 5000}, {id:'m4', from:'u1', nome:'Jogador', skin:'', texto:'Bora!', t:t - 1000}];
  BRASIL.naoLidas = 2; cbPinta(); return 1; })()"""
BARRA = """(() => { const r = CB.el.getBoundingClientRect(), cs = getComputedStyle(CB.el.querySelector('.c81-abrir')), q = e => e ? e.getBoundingClientRect() : null, d = q(LB.missoes), m = q(LB.modo);
  const fm = getComputedStyle(CB.el.querySelector('.c81-msg')), s = CB.onde === 'jogo' ? 1 : (PALCO.s || 1);
  return {onde:CB.onde, cls:CB.el.className, hidden:CB.el.hidden, tag:CB.el.querySelector('.c81-tag').textContent.trim(), msg:CB.el.querySelector('.c81-msg').textContent, n:CB.n.hidden ? '' : CB.n.textContent,
    x:r.x, y:r.y, w:r.width, h:r.height, cx:r.x + r.width/2, bottom:r.bottom, bg:cs.backgroundColor, borda:cs.borderTopLeftRadius, selo:!!CB.el.querySelector('.c81-msg b[data-v79-selo]'),
    letra:parseFloat(fm.fontSize)*s, vao:CB.el.classList.contains('c81-vao'), desafios:d ? [d.left, d.top, d.right, d.bottom] : null, modo:m ? [m.left, m.top, m.right, m.bottom] : null}; })()"""
PAINEL = """(() => { const p = CB.pn, r = p.querySelector('.c81-caixa').getBoundingClientRect();
  return {aberto:CB.aberto, hidden:p.hidden, aba:CB.aba, abas:Array.from(CB.abas.querySelectorAll('.c81-aba')).map(b => [b.textContent.trim(), b.classList.contains('on')]),
    linhas:Array.from(CB.lista.querySelectorAll('.c81-lin')).map(d => d.textContent.trim().slice(0, 60)), nomes:Array.from(CB.lista.querySelectorAll('.c81-nome b')).map(b => [b.textContent, b.getAttribute('data-v79-selo') || '']),
    ph:CB.inp.placeholder, ok:p.querySelector('.c81-ok').textContent.trim(), online:p.querySelector('.c81-online').textContent, chips:Array.from(CB.rap.querySelectorAll('.c81-chip')).map(b => b.textContent), rapHidden:CB.rap.hidden,
    y:r.y, h:r.height, bottom:r.bottom, top:r.top, foco:document.activeElement === CB.inp}; })()"""


async def barra_painel(pw, P):
    print('\n1) a barra e o painel no menu, nas telas e na sala')
    b, pg, erros = await abre(pw, 1280, 720, config={'modo': 'producao', 'servidor': '127.0.0.1:1'})
    await rt(pg, "(() => { ONB.aberto = false; return 1; })()"); await pg.wait_for_timeout(300)
    await rt(pg, MSGS); await pg.wait_for_timeout(250)
    r = await rt(pg, BARRA)
    P.confere(r['onde'] == 'lobby' and not r['hidden'] and 'c81-lobby' in r['cls'] and r['vao'], 'no lobby a barra é um bloco no vão da fileira de baixo (a de antes, da v63, saiu)', r)
    d, m = r['desafios'], r['modo']
    P.confere(r['tag'] == 'BRASIL' and r['msg'] == 'Jogador: Bora!' and r['n'] == '2' and r['x'] > d[2] + 4 and r['x'] + r['w'] < m[0] - 4 and abs(r['y'] - min(d[1], m[1])) < 3 and abs(r['bottom'] - max(d[3], m[3])) < 3 and r['w'] > 300,
              'o bloco: a tag BRASIL, o contador de não lidas e NOME: a mensagem mais recente; entre o DESAFIOS e o MODO, da altura deles', [r['x'], r['w'], r['y'], r['bottom'], d, m])
    P.confere(r['bg'].startswith('rgba(22, 24, 29') and r['borda'] == '18px' and 44 <= r['h'] <= 120 and r['letra'] >= 18, 'grafite meio transparente, as bordas arredondadas, a letra legível (%.0f px)' % r['letra'], [r['bg'], r['borda'], r['h'], r['letra']])
    tp = await rt(pg, "(() => { x49Toast('Conectado.'); const t = document.getElementById('x49-toast').getBoundingClientRect(), r = CB.el.getBoundingClientRect(); x49Toast(''); return {t:[t.top, t.bottom], r:[r.top, r.bottom]}; })()")
    P.confere(tp['t'][1] <= tp['r'][0] + 1, 'o aviso de baixo (x49Toast) sobe para não cobrir o bloco do chat', tp)
    await rt(pg, "(() => { const m = BRASIL.msgs[0]; BRASIL.msgs.push({id:'m5', from:'u2', nome:'CRIA7', selo:'verificado', skin:'', texto:'bora!', t:Date.now()}); cbPinta(); return 1; })()")
    r = await rt(pg, BARRA)
    P.confere(r['msg'] == 'CRIA7: bora!' and r['selo'], 'a mensagem nova aparece na hora, com o V na frente do nome', r)
    # abre: o painel embaixo (não em cima), as abas, as mensagens em ordem, o campo e o ENVIAR
    await rt(pg, "CB.el.querySelector('.c81-abrir').click()"); await pg.wait_for_timeout(350)
    p = await rt(pg, PAINEL)
    P.confere(p['aberto'] and not p['hidden'] and p['aba'] == 'brasil' and p['abas'] == [['BRASIL', True]], 'tocar na barra abre o painel na aba BRASIL (sem sala, só ela)', p['abas'])
    P.confere(p['bottom'] > 650 and p['top'] > 300, 'o painel fica embaixo da tela (a v63 abria em cima)', [p['top'], p['bottom']])
    P.confere(p['nomes'][:2] == [['CRIA7', 'verificado'], ['MTHZIN', '']] and p['linhas'][-1].startswith('CRIA7') and p['ph'] == 'Digite sua mensagem…' and p['ok'] == 'ENVIAR' and p['online'] == '128 online',
              'as mensagens na ordem (a mais nova embaixo), o nome antes da mensagem (com o V), "Digite sua mensagem…", ENVIAR e quem está online', [p['nomes'][:2], p['linhas'][-1], p['online']])
    P.confere(p['foco'], 'o foco vai para o campo')
    ba = await rt(pg, "({n:CB.n.hidden, seta:CB.el.querySelector('.c81-seta').innerHTML.indexOf('M6 9.5') > 0})")
    P.confere(ba['n'] and ba['seta'], 'aberto: as não lidas zeram e a seta vira para baixo', ba)
    # a ficha pelo nome
    await rt(pg, "CB.lista.querySelector('.c81-nome').click()"); await pg.wait_for_timeout(200)
    f = await rt(pg, "(() => { const F = CB.pn.querySelector('.c81-ficha'); return {hidden:F.hidden, nome:F.querySelector('.c81-f-tx b').textContent, selo:F.querySelector('.c81-f-tx b').getAttribute('data-v79-selo'), det:F.querySelector('.c81-f-tx small').textContent, bts:Array.from(F.querySelectorAll('.c81-f-bt')).map(b => b.textContent.trim()), nota:F.querySelector('.c81-f-nota').textContent}; })()")
    P.confere(not f['hidden'] and f['nome'] == 'CRIA7' and f['selo'] == 'verificado' and f['bts'] == ['SILENCIAR', 'DENUNCIAR'] and 'Alguém quer jogar?' in f['nota'], 'o nome abre a ficha: a tampinha, o nome com o V, SILENCIAR e DENUNCIAR (sem a plataforma, sem o VER PERFIL)', f)
    await rt(pg, "Array.from(CB.pn.querySelectorAll('.c81-f-bt')).find(b => /SILENCIAR/.test(b.textContent)).click()"); await pg.wait_for_timeout(200)
    p = await rt(pg, PAINEL); mudo = await rt(pg, "({mudo:BRASIL.silenciados.has('u2'), salvo:JSON.parse(localStorage.getItem('streetball-brasil')).mudo, barra:CB.el.querySelector('.c81-msg').textContent})")
    P.confere(mudo['mudo'] and 'u2' in mudo['salvo'] and not any(n[0] == 'CRIA7' for n in p['nomes']) and mudo['barra'] == 'Jogador: Bora!', 'SILENCIAR: as mensagens dele somem para você (no painel e na barra) e fica salvo', [mudo, p['nomes']])
    await rt(pg, "(() => { BRASIL.silenciados.delete('u2'); brasilSalvarMudo(); cbPintaPainel(); return 1; })()")
    # minimiza e fecha pela seta e pelo fundo
    await rt(pg, "CB.pn.querySelector('.c81-min').click()"); await pg.wait_for_timeout(150)
    P.confere(await rt(pg, "!CB.aberto && CB.pn.hidden && !CB.el.hidden"), 'a seta minimiza: o painel fecha e a barra continua')
    await pg.keyboard.press('Enter')
    # as telas do menu: o chip no canto; nas de rodapé ocupado, nada; no CHAT DO BRASIL, nada
    tel = {}
    for t in ['amigos', 'comunidade', 'clube', 'copa', 'replays', 'perfil', 'ranking', 'loja', 'treino', 'skins', 'chat']:
        await rt(pg, "abreTela(%s); 1" % json.dumps(t)); await pg.wait_for_timeout(250)
        tel[t] = await rt(pg, "(() => { const r = CB.el.getBoundingClientRect(); return {onde:CB.onde, x:r.x, y:r.y, h:r.height, w:r.width, dentro:TELAS[%s].el.contains(CB.el)}; })()" % json.dumps(t))
        await rt(pg, "(() => { ED.saindo = true; fechaTela(); ED.saindo = false; return 1; })()"); await pg.wait_for_timeout(120)
    chips = [t for t in tel if tel[t]['onde'] == 'chip']
    P.confere(sorted(chips) == ['amigos', 'clube', 'comunidade', 'copa', 'perfil', 'replays'] and all(tel[t]['dentro'] and tel[t]['x'] < 30 and tel[t]['y'] > 640 and tel[t]['w'] < 420 for t in chips),
              'nas telas do menu (salas, amigos, clube, eventos, replays, perfil) o chat fica como um chip no canto de baixo, à esquerda', {t: tel[t] for t in chips})
    P.confere(all(tel[t]['onde'] == '' for t in ['ranking', 'loja', 'treino', 'skins', 'chat']), 'nas telas com o rodapé ocupado (ranking, loja, treino, tampinha) e no CHAT DO BRASIL a barra não entra', {t: tel[t]['onde'] for t in tel})
    P.confere(await rt(pg, "(() => ({onde:CB.onde, lobby:LB.palco.contains(CB.el)}))()") == {'onde': 'lobby', 'lobby': True}, 'de volta ao lobby, a barra volta para o lugar dela')
    # a sala neste aparelho: a barra embaixo, as duas abas, as frases rápidas; o chat da sala
    await rt(pg, "(() => { Object.assign(SX.form, {onde:'aqui', pub:true, n:1, map:4, jogo:'futebol', tempo:0, bots:true, nome:'Racha'}); sxCriar(); return 1; })()"); await pg.wait_for_timeout(600)
    r = await rt(pg, BARRA)
    P.confere(r['onde'] == 'sala' and r['tag'] == 'SALA' and 'chegou na sala' in r['msg'] and r['y'] > 640, 'na sala: a barra embaixo com a tag SALA e a mensagem de entrada', r)
    await rt(pg, "cbAbre()"); await pg.wait_for_timeout(300)
    p = await rt(pg, PAINEL)
    P.confere(p['aba'] == 'sala' and p['abas'] == [['BRASIL', False], ['SALA', True]] and not p['rapHidden'] and p['chips'][:2] == ['Bora jogar!', 'Tô pronto!'] and p['online'] == '1 na sala',
              'na sala o painel abre na aba SALA, com a BRASIL do lado, as frases rápidas e quantos estão na sala', [p['aba'], p['abas'], p['chips'][:2], p['online']])
    await rt(pg, "CB.abas.querySelector('.c81-aba').click()"); await pg.wait_for_timeout(150)
    p = await rt(pg, PAINEL)
    P.confere(p['aba'] == 'brasil' and p['rapHidden'] and p['nomes'][0][0] == 'CRIA7', 'alterna para o Chat Brasil (sem as frases rápidas) e volta', p['aba'])
    await rt(pg, "CB.abas.querySelectorAll('.c81-aba')[1].click()"); await pg.wait_for_timeout(150)
    await rt(pg, "(() => { CB.inp.value = 'Vou de laranja'; CB.pn.querySelector('.c81-form').requestSubmit(); return 1; })()"); await pg.wait_for_timeout(300)
    p = await rt(pg, PAINEL); r = await rt(pg, BARRA)
    P.confere(any('Vou de laranja' in l for l in p['linhas']) and p['linhas'][-1].startswith('Jogador') and r['msg'] == 'Jogador: Vou de laranja' and p['aberto'],
              'ENVIAR manda para a sala: a mensagem entra no painel (em verde, a sua) e na barra; o painel continua aberto', [p['linhas'][-1], r['msg']])
    # os filtros no aparelho
    fl = await rt(pg, """(() => { const r = {}; for (const [k, t] of [['tel', 'me chama no 11 99999-8888'], ['cpf', 'meu cpf 123.456.789-00'], ['mail', 'manda pra fulano@email.com'], ['link', 'entra no bit.ly/abc'], ['site', 'joga no site.com.br'], ['arroba', 'segue @fulano_ofc'], ['ofensa', 'seu merda'], ['ok', 'placar 3 x 1, bora de novo às 20h']]) r[k] = RachaChat81.motivo(t); return r; })()""")
    P.confere('telefone' in fl['tel'] and 'CPF' in fl['cpf'] and 'e-mail' in fl['mail'] and 'links' in fl['link'] and 'links' in fl['site'] and 'links' in fl['arroba'] and 'filtro' in fl['ofensa'] and fl['ok'] == '',
              'os filtros no aparelho: telefone, CPF, e-mail, link, @ e palavrão não saem (com o motivo); placar e hora passam', fl)
    env = await rt(pg, """(() => { const n = SL.chat.length, env = []; const s0 = net49Send; net49Send = m => { env.push(m); return s0(m); };
      try { CB.inp.value = 'me chama no 11 99999-8888'; CB.pn.querySelector('.c81-form').requestSubmit(); const erro = CB.pn.querySelector('.c81-erro'); return {env:env.filter(m => m.type === 'say').length, erro:erro.hidden ? '' : erro.textContent, campo:CB.inp.value}; } finally { net49Send = s0; } })()""")
    P.confere(env['env'] == 0 and 'telefone' in env['erro'] and env['campo'] != '', 'o telefone não vai (o aviso aparece no painel e o texto fica para corrigir)', env)
    rep = await rt(pg, """(() => { const env = []; const s0 = net49Send; net49Send = m => { env.push(m); return s0(m); };
      try { CB.inp.value = 'Vou de laranja'; CB.pn.querySelector('.c81-form').requestSubmit(); return {env:env.filter(m => m.type === 'say').length, erro:CB.pn.querySelector('.c81-erro').textContent}; } finally { net49Send = s0; } })()""")
    P.confere(rep['env'] == 0 and 'igual' in rep['erro'], 'a mesma mensagem de novo não vai (spam)', rep)
    # ocultar: o botão do painel e a chave dos Ajustes
    await rt(pg, "CB.pn.querySelector('.c81-ic[aria-label=\"Ocultar o chat\"]').click()"); await pg.wait_for_timeout(200)
    oc = await rt(pg, "({oculto:RachaChat81.oculto(), aberto:CB.aberto, barra:CB.el.hidden, ctx:cbContexto(), salvo:JSON.parse(localStorage.getItem(CHAVE_CONTA)).chatOculto, chave:document.getElementById('aj-chat-tela').getAttribute('aria-pressed')})")
    P.confere(oc['oculto'] and not oc['aberto'] and oc['barra'] and oc['ctx'] == '' and oc['salvo'] is True and oc['chave'] == 'false', 'OCULTAR: o painel fecha, a barra some em todo lugar, fica salvo e a chave "Chat na tela" dos Ajustes desliga', oc)
    await rt(pg, "document.getElementById('aj-chat-tela').click()"); await pg.wait_for_timeout(300)
    oc = await rt(pg, "({oculto:RachaChat81.oculto(), ctx:cbContexto(), chave:document.getElementById('aj-chat-tela').getAttribute('aria-pressed'), lin:!!document.getElementById('aj-chat-tela').closest('.aj-lin')})")
    P.confere(not oc['oculto'] and oc['ctx'] == 'sala' and oc['chave'] == 'true' and oc['lin'], 'a chave dos Ajustes traz o chat de volta', oc)
    errs = [e for e in erros if 'Failed to load resource' not in e and 'WebSocket' not in e]
    P.confere(not errs, 'nenhum erro de JavaScript (barra e painel)', errs[:3])
    await b.close()


async def celular(pw, P):
    print('\n1b) no celular (844×390, o menu encolhido): a barra maior, para ler e tocar')
    b, pg, erros = await abre(pw, 844, 390, config={'modo': 'producao', 'servidor': '127.0.0.1:1'})
    await rt(pg, "(() => { ONB.aberto = false; return 1; })()"); await pg.wait_for_timeout(300)
    await rt(pg, MSGS); await pg.wait_for_timeout(250)
    r = await rt(pg, BARRA); d, m = r['desafios'], r['modo']
    P.confere(r['onde'] == 'lobby' and r['vao'] and r['x'] > d[2] + 2 and r['x'] + r['w'] < m[0] - 2 and abs(r['y'] - min(d[1], m[1])) < 3 and abs(r['bottom'] - max(d[3], m[3])) < 3,
              'no lobby o bloco entra no vão entre o DESAFIOS e o MODO, da altura deles', [r['x'], r['w'], r['y'], r['bottom'], d, m])
    P.confere(r['h'] >= 36 and r['letra'] >= 14 and r['msg'] == 'Jogador: Bora!', 'legível e tocável no celular: %.0f px de altura, letra de %.1f px' % (r['h'], r['letra']), [r['h'], r['letra']])
    await rt(pg, "abreTela('amigos'); 1"); await pg.wait_for_timeout(300)
    c = await rt(pg, BARRA)
    P.confere(c['onde'] == 'chip' and c['h'] >= 34 and c['letra'] >= 13 and c['bottom'] <= 390 and c['x'] < 20, 'na tela SALAS o chip do canto também é maior (%.0f px, letra %.1f px)' % (c['h'], c['letra']), [c['onde'], c['h'], c['letra'], c['bottom']])
    await rt(pg, "(() => { ED.saindo = true; fechaTela(); ED.saindo = false; Object.assign(SX.form, {onde:'aqui', pub:true, n:1, map:4, jogo:'futebol', tempo:0, bots:true, nome:'Racha'}); sxCriar(); return 1; })()"); await pg.wait_for_timeout(600)
    sl = await rt(pg, BARRA + ".bottom === undefined ? null : (() => { const q = s => document.querySelector(s).getBoundingClientRect(), o = q('#sl-ops'), cv = q('#sl-convidar'), ini = q('#sl-iniciar'); return {ops:[o.left, o.top, o.right, o.bottom], convidar:[cv.left, cv.top, cv.right, cv.bottom], iniciar:[ini.left, ini.top, ini.right, ini.bottom]}; })()")
    r = await rt(pg, BARRA)
    P.confere(r['onde'] == 'sala' and r['y'] >= sl['ops'][3] - 1 and r['bottom'] <= 390 and r['x'] >= sl['convidar'][2] and r['x'] + r['w'] <= sl['iniciar'][0] and r['h'] >= 32 and r['letra'] >= 13,
              'na sala a barra fica abaixo das opções, entre o CONVIDAR e o INICIAR, sem sair da tela (%.0f px, letra %.1f px)' % (r['h'], r['letra']), [r['x'], r['y'], r['w'], r['h'], r['bottom'], sl])
    await rt(pg, "cbAbre()"); await pg.wait_for_timeout(350)
    p = await rt(pg, PAINEL)
    P.confere(p['aberto'] and p['bottom'] <= 390 and p['top'] > 120 and [x[0].rstrip('0123456789') for x in p['abas']] == ['BRASIL', 'SALA'] and p['abas'][1][1], 'o painel abre embaixo e cabe na tela do celular', [p['top'], p['bottom'], p['abas']])
    errs = [e for e in erros if 'Failed to load resource' not in e and 'WebSocket' not in e]
    P.confere(not errs, 'nenhum erro de JavaScript (celular)', errs[:3])
    await b.close()


async def partida(pw, P):
    print('\n2) na partida: a barra pequena embaixo, o painel e os três pontinhos')
    for (w, h, tag) in [(1280, 720, 'computador'), (844, 390, 'celular')]:
        b, pg, erros = await abre(pw, w, h, config={'modo': 'producao', 'servidor': '127.0.0.1:1'})
        await rt(pg, "(() => { ONB.aberto = false; Object.assign(SX.form, {onde:'aqui', pub:true, n:1, map:4, jogo:'futebol', tempo:0, bots:true, nome:'Racha'}); sxCriar(); return 1; })()"); await pg.wait_for_timeout(500)
        await rt(pg, "net49Send({type:'seat', team:0}); 1"); await pg.wait_for_timeout(200)
        await rt(pg, "slIniciar()"); await pg.wait_for_timeout(2200)
        await rt(pg, "rqVsComeca(); 1"); await pg.wait_for_timeout(500)
        g = await rt(pg, """(() => { const r = CB.el.getBoundingClientRect(), c = cv.getBoundingClientRect(), k = c.height/H, cs = getComputedStyle(CB.el.querySelector('.c81-abrir'));
          const joy = el('joy'), kick = el('kick'), power = el('power'); const vx = x => c.left + x*k, vy = y => c.top + y*k;
          return {onde:CB.onde, x:r.x, y:r.y, w:r.width, h:r.height, bottom:r.bottom, cBottom:c.bottom, placarBaixo:vy(72*HUDX.k), joyDir:vx(joy.x + joy.r), botEsq:Math.min(vx(kick.x - kick.r), vx(power.x - power.r)), bg:cs.backgroundColor, campoBaixo:vy(GB), k, hk:HUDX.k}; })()""")
        P.confere(g['onde'] == 'jogo' and g['bottom'] <= g['cBottom'] + 1 and g['y'] > g['placarBaixo'] + 40, 'na partida a barra fica embaixo do campo, longe do placar (%s)' % tag, g)
        P.confere(g['x'] > g['joyDir'] - 2 and g['x'] + g['w'] < g['botEsq'] + 2, 'entre o analógico e os botões, sem cobrir nenhum (%s)' % tag, [g['x'], g['joyDir'], g['x'] + g['w'], g['botEsq']])
        P.confere(g['bg'].startswith('rgba(16, 18, 22, 0.6') and abs(g['h'] - 56*g['k']*g['hk']) < 2 and abs(g['w'] - 520*g['k']*g['hk']) < 3, 'menor que a do menu (56 × 520, era 62 × 600), meio transparente, no tamanho do HUD (%s)' % tag, [g['bg'], g['h'], g['w'], g['k'], g['hk']])
        await rt(pg, "cbAbre()"); await pg.wait_for_timeout(300)
        p = await rt(pg, PAINEL)
        P.confere(p['aberto'] and p['abas'][-1][0] == 'PARTIDA' and p['top'] > 0.38*h and p['bottom'] <= h, 'o painel abre embaixo (a aba PARTIDA), sem cobrir o placar em cima (%s)' % tag, [p['abas'], p['top'], h])
        jogo = await rt(pg, "({parado:!!ARB_PARADO(), pausa:PAUSA.on, playing:NET49.playing})")
        P.confere(not jogo['pausa'] and jogo['playing'], 'com o chat aberto a partida não pausa (%s)' % tag, jogo)
        # os três pontinhos: um balão escuro pequeno em cima da tampinha de quem digita, sem o texto
        d = await rt(pg, """(() => { cbFecha(); const q = RQ.jog.find(o => o !== P); q.netId = 'bot1'; cbDig('bot1', true); render(0);
          const k = K, z = cam.z, a = VIS.a == null ? 1 : VIS.a, x = q.ax + (q.x - q.ax)*a, y = q.ay + (q.y - q.ay)*a, sx = W/2 + (x - cam.x)*z, sy = H/2 + (y - cam.y)*z, r = q.r*z;
          const g = ctx, p = (dx, dy) => Array.from(g.getImageData(Math.round((sx + dx)*k), Math.round((sy + dy)*k), 1, 1).data);
          const meio = p(r*.25, -r*2.0), ponto = p(0, -r*2.2), fora = p(0, -r*3.3);   // (o fundo escuro entre os pontos, o ponto do meio, o campo em cima)
          const t0 = txt, ditos = []; txt = function(g2, s){ ditos.push(String(s)); return t0.apply(this, arguments); };
          try { render(0); } finally { txt = t0; }
          cbDig('bot1', false); return {meio, ponto, fora, digitando:ditos.some(s => /digitando/i.test(s)), vis:RachaChat81.digitando('bot1')}; })()""")
        escuro = lambda c: c[0] < 90 and c[1] < 90 and c[2] < 90
        P.confere(escuro(d['meio']) and sum(d['ponto'][:3]) > sum(d['meio'][:3]) + 180 and not d['digitando'] and not d['vis'], 'o "digitando": um balão escuro com três pontos brancos em cima da tampinha, sem a palavra (e some ao desligar) (%s)' % tag, d)
        errs = [e for e in erros if 'Failed to load resource' not in e and 'WebSocket' not in e]
        P.confere(not errs, 'nenhum erro de JavaScript (partida, %s)' % tag, errs[:3])
        await b.close()


ESTADO = """(() => { const r = NET49.room; return {id:NET49.id, sala:r ? r.code : null, jogando:NET49.playing, host:NET49.host, onde:CB.onde, br:BRASIL.estado, brId:BRASIL.id}; })()"""


async def online(pw, P):
    print('\n3) online de verdade: o Chat do Brasil fora da sala, o chat da sala, o digitando, a denúncia e o silenciar')
    porta = porta_livre()
    srv = subprocess.Popen(['node', str(RAIZ / 'tests' / 'servidor_visitantes.cjs'), '--porta', str(porta), '--host', '127.0.0.1', '--memoria', '--estaticos', str(RAIZ), '--nome', 'Teste v81', '--sem-p2p'],
                           stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    time.sleep(0.8)
    url = 'http://127.0.0.1:%d/tests/build/racha_teste.html' % porta
    sess = []
    try:
        A = await sessao(pw, url, 'Ana'); B = await sessao(pw, url, 'Beto'); C = await sessao(pw, url, 'Caio'); sess += [A, B, C]
        for pg in sess:
            await rt(pg, "(() => { ONB.aberto = false; return 1; })()")
        # o Chat do Brasil: a barra do lobby liga o chat sozinha; a mensagem da Ana chega para os outros, fora de qualquer sala
        ea = await espera(A, "BRASIL.estado === 'on' && CB.onde === 'lobby' ? 1 : 0", 15000)
        eb = await espera(B, "BRASIL.estado === 'on' ? 1 : 0", 15000); await espera(C, "BRASIL.estado === 'on' ? 1 : 0", 15000)
        P.confere(bool(ea and eb), 'com o servidor: a barra do lobby liga o Chat do Brasil sozinha (os três estão nele)', [ea, eb])
        await rt(A, "(() => { cbAbre(); CB.inp.value = 'Alguém quer jogar?'; CB.pn.querySelector('.c81-form').requestSubmit(); return 1; })()")
        mb = await espera(B, "(() => { const m = BRASIL.msgs[BRASIL.msgs.length - 1]; return m && m.texto === 'Alguém quer jogar?' ? m : null; })()", 6000)
        bb = await rt(B, BARRA)
        P.confere(bool(mb) and mb['nome'] == 'Ana' and bb['msg'] == 'Ana: Alguém quer jogar?' and bb['n'] == '1', 'a mensagem da Ana chega na barra do Beto (NOME: mensagem, 1 não lida) sem nenhum dos dois estar numa sala', [mb and mb['nome'], bb['msg'], bb['n']])
        # a sala: só quem está nela vê o chat da sala; o Brasil continua para todos
        for pg in sess:                                   # (conecta no servidor das salas pela tela AMIGOS, como na etapa 5, e volta ao menu)
            await rt(pg, "abreTela('amigos')"); await espera(pg, "!!NET49.id", 8000); await rt(pg, "fechaTela()")
        await rt(A, "(() => { cbFecha(); Object.assign(SX.form, {onde:'online', pub:true, n:1, map:4, jogo:'futebol', tempo:0, bots:false, nome:'Sala v81'}); sxCriar(); return 1; })()")
        cod = await espera(A, "NET49.room && NET49.room.code", 6000)
        await rt(B, "(() => { net49Send({type:'join', code:%s, slot:1}); return 1; })()" % json.dumps(cod))
        await espera(B, "NET49.room && NET49.room.code === %s && lobby.tela === 'sala'" % json.dumps(cod), 6000)
        await espera(A, "NET49.room && NET49.room.members.length === 2", 6000)
        await rt(A, "document.querySelector('.v70-sl-atalhos .entrar').click()")   # a Ana sai dos espectadores e vai para o time vazio (1v1)
        await espera(A, "NET49.room.roster.indexOf(NET49.id) >= 0 && NET49.room.roster.every(Boolean)", 6000)
        await rt(B, "(() => { cbAbre('sala'); CB.inp.value = 'Vou de roxo.'; CB.pn.querySelector('.c81-form').requestSubmit(); return 1; })()")
        sa = await espera(A, "(() => { const m = SL.chat[SL.chat.length - 1]; return m && m.text === 'Vou de roxo.' ? m : null; })()", 6000)
        await asyncio.sleep(0.5)
        sc = await rt(C, "({sala:(SL.chat || []).some(m => m && m.text === 'Vou de roxo.'), br:(BRASIL.msgs || []).some(m => m && m.texto === 'Vou de roxo.'), onde:CB.onde})")
        ba = await rt(A, BARRA)
        P.confere(bool(sa) and sa['name'] == 'Beto' and ba['tag'] == 'SALA' and ba['msg'] == 'Beto: Vou de roxo.' and not sc['sala'] and not sc['br'] and sc['onde'] == 'lobby',
                  'o chat da sala chega só para quem está nela (o Caio, fora, não vê nada; a barra dele continua no Brasil)', [sa and sa['name'], ba['msg'], sc])
        await rt(C, "(() => { cbAbre(); CB.inp.value = 'Cria sala aí!'; CB.pn.querySelector('.c81-form').requestSubmit(); cbFecha(); return 1; })()")
        br2 = await espera(A, "(() => { const m = BRASIL.msgs[BRASIL.msgs.length - 1]; return m && m.texto === 'Cria sala aí!' ? 1 : 0; })()", 6000)
        pa = await rt(A, "(() => { cbAbre(); const abas = Array.from(CB.abas.querySelectorAll('.c81-aba')).map(b => [b.textContent.trim(), b.classList.contains('on')]); cbFecha(); return abas; })()")
        P.confere(bool(br2) and any(a[0].startswith('BRASIL') for a in pa) and any(a[0].startswith(('SALA', 'PARTIDA')) for a in pa), 'dentro da sala o Chat do Brasil continua chegando (a aba BRASIL com o contador, do lado da SALA)', [br2, pa])
        # a partida: o digitando de um aparece no outro (os pontinhos), some quando a mensagem sai
        await rt(A, "slIniciar()")
        await espera(A, "NET49.playing && RQ.on", 8000); await espera(B, "NET49.playing && RQ.on && NET49.lastTick > 0", 8000)
        await rt(B, "(() => { cbAbre('sala'); CB.inp.value = 'B'; CB.inp.dispatchEvent(new Event('input')); CB.inp.value = 'Bo'; CB.inp.dispatchEvent(new Event('input')); return 1; })()")
        dig = await espera(A, "(() => { const q = RQ.jog.find(o => o.netId && o.netId !== NET49.id); return q && RachaChat81.digitando(q.netId) ? q.netId : null; })()", 5000)
        da = await rt(A, """(() => { render(0); const q = RQ.jog.find(o => o.netId && o.netId !== NET49.id), k = K, z = cam.z, a = VIS.a == null ? 1 : VIS.a, x = q.ax + (q.x - q.ax)*a, y = q.ay + (q.y - q.ay)*a;
          const sx = W/2 + (x - cam.x)*z, sy = H/2 + (y - cam.y)*z, r = q.r*z, p = (dx, dy) => Array.from(ctx.getImageData(Math.round((sx + dx)*k), Math.round((sy + dy)*k), 1, 1).data);
          return {meio:p(r*.25, -r*2.0), ponto:p(0, -r*2.2), texto:(SL.chat || []).some(m => m && /^Bo/.test(m.text || ''))}; })()""")
        P.confere(bool(dig) and da['meio'][0] < 90 and sum(da['ponto'][:3]) > sum(da['meio'][:3]) + 180 and not da['texto'], 'o Beto digita: na tela da Ana o balão escuro com os pontinhos aparece em cima da tampinha dele (sem mostrar o texto)', [dig, da])
        await rt(B, "(() => { CB.inp.value = 'Bora!'; CB.pn.querySelector('.c81-form').requestSubmit(); return 1; })()")
        fim = await espera(A, "(() => { const q = RQ.jog.find(o => o.netId && o.netId !== NET49.id); return (SL.chat || []).some(m => m && m.text === 'Bora!') && !RachaChat81.digitando(q.netId) ? 1 : 0; })()", 5000)
        P.confere(bool(fim), 'a mensagem sai: chega na Ana e os pontinhos somem na hora')
        bj = await rt(B, "({aberto:CB.aberto, onde:CB.onde})")
        P.confere(not bj['aberto'] and bj['onde'] == 'jogo', 'na partida, depois de ENVIAR o painel fecha (a barra fica)', bj)
        await rt(B, "(() => { cbAbre('sala'); CB.inp.value = 'x'; CB.inp.dispatchEvent(new Event('input')); return 1; })()")
        await espera(A, "(() => { const q = RQ.jog.find(o => o.netId && o.netId !== NET49.id); return RachaChat81.digitando(q.netId) ? 1 : 0; })()", 5000)
        await rt(B, "cbFecha()")
        sumiu = await espera(A, "(() => { const q = RQ.jog.find(o => o.netId && o.netId !== NET49.id); return !RachaChat81.digitando(q.netId) ? 1 : 0; })()", 5000)
        P.confere(bool(sumiu), 'fechar o chat também tira os pontinhos')
        await rt(B, "(() => { cbAbre('sala'); CB.inp.value = 'y'; CB.inp.dispatchEvent(new Event('input')); return 1; })()")
        await espera(A, "(() => { const q = RQ.jog.find(o => o.netId && o.netId !== NET49.id); return RachaChat81.digitando(q.netId) ? 1 : 0; })()", 5000)
        t0 = time.time()
        par = await espera(A, "(() => { const q = RQ.jog.find(o => o.netId && o.netId !== NET49.id); return !RachaChat81.digitando(q.netId) ? 1 : 0; })()", 9000, 100)
        dt = time.time() - t0
        P.confere(bool(par) and 3 <= dt <= 7, 'parou de digitar (sem fechar): os pontinhos somem sozinhos depois de uns segundos (%.1f s)' % dt, dt)
        await rt(B, "cbFecha()")
        # o telefone é barrado pelo servidor também (sem o filtro do aparelho)
        await rt(B, "(() => { net49Send({type:'say', text:'me liga 21 98888-7777'}); return 1; })()")
        await asyncio.sleep(0.6)
        ok = await rt(A, "!(SL.chat || []).some(m => m && /98888/.test(m.text || ''))")
        P.confere(ok, 'o telefone mandado direto (sem o filtro do aparelho) é barrado pelo servidor: não chega na Ana')
        # a denúncia: a Ana e o Caio (que entra assistindo) denunciam a mensagem do Beto → some para todos e o Beto fica sem falar
        await rt(C, "(() => { net49Send({type:'join', code:%s, spectate:true}); return 1; })()" % json.dumps(cod))
        await espera(C, "NET49.room && NET49.room.code === %s" % json.dumps(cod), 6000)
        await espera(C, "(SL.chat || []).some(m => m && m.text === 'Bora!')", 6000)
        mid = await rt(A, "(() => { const m = (SL.chat || []).find(x => x && x.text === 'Bora!'); return m && m.mid; })()")
        P.confere(bool(mid), 'a mensagem da sala tem o número dela (mid)', mid)
        await rt(A, "(() => { const m = (SL.chat || []).find(x => x && x.text === 'Bora!'); cbAbre('sala'); RachaChat81.abreFicha(m, true); Array.from(CB.pn.querySelectorAll('.c81-f-bt')).find(b => /DENUNCIAR/.test(b.textContent)).click(); cbFecha(); return 1; })()")
        await asyncio.sleep(0.4)
        meio = await rt(C, "(SL.chat || []).find(x => x && x.text === 'Bora!').escondida === true")
        P.confere(not meio, 'uma denúncia só ainda não esconde')
        await rt(C, "(() => { const m = (SL.chat || []).find(x => x && x.text === 'Bora!'); cbAbre('sala'); RachaChat81.abreFicha(m, true); Array.from(CB.pn.querySelectorAll('.c81-f-bt')).find(b => /DENUNCIAR/.test(b.textContent)).click(); cbFecha(); return 1; })()")
        esc = await espera(B, "(() => { const m = (SL.chat || []).find(x => x && x.text === 'Bora!'); return m && m.escondida ? 1 : 0; })()", 5000)
        lb = await rt(B, "(() => { cbAbre('sala'); const l = Array.from(CB.lista.querySelectorAll('.c81-lin')).map(d => d.textContent); cbFecha(); return l; })()")
        P.confere(bool(esc) and any('escondida pela moderação' in l for l in lb), 'a segunda denúncia (de outra pessoa) esconde a mensagem para todos, inclusive para quem escreveu', lb[-3:])
        await rt(B, "(() => { cbAbre('sala'); CB.inp.value = 'posso falar?'; CB.pn.querySelector('.c81-form').requestSubmit(); return 1; })()")
        await asyncio.sleep(0.6)
        cal = await rt(B, "(() => { const e = CB.pn.querySelector('.c81-erro'); const r = {erro:e.hidden ? '' : e.textContent}; cbFecha(); return r; })()")
        chegou = await rt(A, "(SL.chat || []).some(m => m && m.text === 'posso falar?')")
        P.confere('silenciado' in cal['erro'] and not chegou, 'quem foi denunciado fica um tempo sem falar na sala (o aviso aparece no painel dele)', [cal, chegou])
        # silenciar alguém só para você
        ida = await rt(A, "NET49.id")
        await rt(C, "(() => { BRASIL.silenciados.add(%s); brasilSalvarMudo(); cbPintaPainel(); cbPinta(); return 1; })()" % json.dumps(ida))
        await rt(A, "(() => { cbAbre('sala'); CB.inp.value = 'oi Caio'; CB.pn.querySelector('.c81-form').requestSubmit(); cbFecha(); return 1; })()")
        await espera(B, "(SL.chat || []).some(m => m && m.text === 'oi Caio')", 5000)
        await espera(C, "(SL.chat || []).some(m => m && m.text === 'oi Caio')", 5000)   # (chega no Caio também; na máquina carregada pode levar um instante a mais)
        vc = await rt(C, "(() => { cbAbre('sala'); const l = Array.from(CB.lista.querySelectorAll('.c81-lin')).map(d => d.textContent); const b = CB.el.querySelector('.c81-msg').textContent; cbFecha(); return {l:l.some(x => /oi Caio/.test(x)), b, chegou:(SL.chat || []).some(m => m && m.text === 'oi Caio'), sala:NET49.room && NET49.room.code, id:NET49.id, playing:NET49.playing}; })()")
        P.confere(vc['chegou'] and not vc['l'] and 'oi Caio' not in vc['b'], 'silenciar alguém esconde as mensagens dele só para você (chegam, mas não aparecem)', vc)
        for pg in sess:
            errs = [e for e in pg.erros if 'Failed to load resource' not in e and 'favicon' not in e]
            P.confere(not errs, 'nenhum erro de JavaScript na sessão de ' + pg.nome, errs[:3])
    finally:
        for pg in sess:
            try: await pg.b.close()
            except Exception: pass
        srv.terminate()
        try: srv.communicate(timeout=3)
        except Exception: pass


async def principal():
    P = Placar('v81 · o chat: a barra, o painel, os três pontinhos e a moderação')
    async with async_playwright() as pw:
        if '--so-online' not in sys.argv:
            await barra_painel(pw, P)
            await celular(pw, P)
            await partida(pw, P)
        if '--sem-online' not in sys.argv:
            await online(pw, P)
    return P.fim()

if __name__ == '__main__':
    roda(principal())
