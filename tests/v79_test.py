"""v79 · AS PATENTES DA RANQUEADA, SÓ RANQUEADA (no Estádio, com a busca online e os bots de reserva) e o SELO V.

· AS PATENTES: as 8 da imagem (Bronze 0–399 … Lendário 4.300+), cada uma com III, II e I; os pontos viram a patente certa nas
  bordas; as 24 insígnias são diferentes; a conta dos pontos é a de antes (e a derrota não tira da patente); a tela PATENTES
  RANQUEADAS abre pela sua patente no lobby e pelo VER PATENTES do JOGAR, com a sua marcada, e fecha no X e no Esc.
· SÓ RANQUEADA: o JOGAR e o MODO só têm a ranqueada (sem a aba CASUAL), no Estádio; o tamanho do time escolhido vale na hora;
  o JOGAR abre a BUSCA; sem servidor a partida é contra bots (ranqueada, no Estádio); nada de "LIGA" nem do nível dos bots
  escrito na partida (a faixa, a pílula, a pausa, a apresentação, o fim); o fim do tutorial leva para a busca; as missões
  que pediam outro mapa/modo viram as da ranqueada; o Estádio é o campo padrão de quem nunca escolheu.
· ONLINE DE VERDADE (o servidor da turma e sessões no navegador): dois na fila do 1v1 jogam juntos (sala ranqueada, fora da
  lista); o resultado conferido dá os pontos da ranqueada (sem o bônus dos bots); JOGAR DE NOVO procura outra; quem sai no
  meio perde 25 e o outro vê A PARTIDA PAROU sem perder nada; dois no 2v2 jogam com 2 bots depois de 8 s; sozinho, depois de
  20 s, a partida é contra bots; CANCELAR e JOGAR CONTRA BOTS AGORA.
· O SELO V: o seu (da conta) no lobby, no perfil e na partida; o dos outros (do servidor) nos cartões da sala, na lista das
  salas e nos chats; selo inválido não aparece; o hello do servidor traz o seu selo (vazio sem conta).
Isto testa o fluxo no Chromium de teste, com um servidor local; não prova a fila com muita gente nem a rede de celular.

Rodar: python3 tests/v79_test.py
"""
import asyncio, json, re, subprocess, sys, time
from comum import abre, rt, roda, Placar, async_playwright, RAIZ
from online_test import porta_livre, sessao, espera

SEM_NIVEL = re.compile(r'F[ÁA]CIL|DIF[ÍI]CIL|LIGA', re.I)


async def patentes(pw, P):
    print('\n1) as patentes')
    b, pg, erros = await abre(pw, 1280, 720)
    tab = await rt(pg, "RachaPatentes79.patentes.map(p => [p.nome, p.min, p.max, p.cortes])")
    P.confere([t[0] for t in tab] == ['Bronze', 'Prata', 'Ouro', 'Platina', 'Diamante', 'Élite', 'Mestre', 'Lendário'], 'as 8 patentes da imagem, na ordem', [t[0] for t in tab])
    faixas = [(t[1], t[2]) for t in tab]
    P.confere(faixas == [(0, 399), (400, 799), (800, 1299), (1300, 1899), (1900, 2599), (2600, 3399), (3400, 4299), (4300, None)], 'as faixas de pontos da imagem (Lendário: 4.300+)', faixas)
    bordas = await rt(pg, "[0, 129, 130, 269, 270, 399, 400, 799, 800, 1299, 1300, 1899, 1900, 2599, 2600, 3399, 3400, 4299, 4300, 4599, 4600, 4899, 4900, 99999].map(p => rqElo(p).nome)")
    esperado = ['BRONZE III', 'BRONZE III', 'BRONZE II', 'BRONZE II', 'BRONZE I', 'BRONZE I', 'PRATA III', 'PRATA I', 'OURO III', 'OURO I', 'PLATINA III', 'PLATINA I',
                'DIAMANTE III', 'DIAMANTE I', 'ÉLITE III', 'ÉLITE I', 'MESTRE III', 'MESTRE I', 'LENDÁRIO III', 'LENDÁRIO III', 'LENDÁRIO II', 'LENDÁRIO II', 'LENDÁRIO I', 'LENDÁRIO I']
    P.confere(bordas == esperado, 'os pontos viram a patente e a divisão certas nas bordas (III → II → I)', [x for x in zip(bordas, esperado) if x[0] != x[1]])
    ordens = await rt(pg, "Array.from({length:24}, (_, i) => rqEloDaOrdem(i + 1).ordem)")
    P.confere(ordens == list(range(1, 25)), 'as 24 divisões em ordem (1 = Bronze III … 24 = Lendário I)', ordens)
    ins = await rt(pg, """(() => { const L = []; for (let o = 1; o <= 24; o++) L.push(rqInsignia(rqEloDaOrdem(o)).replace(/(p[gaiblc])\\d+/g, '$1'));
      return {n:new Set(L).size, coroaL:L[23].indexOf('cy="4.5"') >= 0, semCoroaB:L[0].indexOf('cy="4.5"') < 0 && L[0].indexOf('cy="8.5"') < 0, svg:L.every(s => s.indexOf('<svg') === 0)}; })()""")
    P.confere(ins['n'] == 24 and ins['svg'] and ins['coroaL'] and ins['semCoroaB'], 'as 24 insígnias são desenhos diferentes (o Lendário com a coroa grande, o Bronze sem coroa)', ins)
    conta = await rt(pg, """(() => { const C = CONTA.rq, salvo = JSON.stringify(C), r = [];
      const vai = (pts, R) => { C.pts = pts; C.seq = 0; const pr = rqPontua(Object.assign({n:2}, R)); return pr.depois; };
      r.push(vai(400, {placar:[0, 3], venceu:false}));                       // perder na Prata III: não cai para o Bronze
      r.push(vai(1000, {placar:[3, 1], venceu:true, nivel:'facil'}));         // vitória por 2: +22 +6
      r.push(vai(1000, {placar:[3, 0], venceu:true, nivel:'dificil'}));       // por 3, contra o Difícil: +22 +9 +6
      r.push(vai(1000, {placar:[1, 3], venceu:false}));                       // derrota por 2: −14 −4
      r.push(vai(100, {placar:[0, 3], venceu:false}));                        // no Bronze, a metade: −(14+6)/2
      r.push(vai(1000, {abandono:true, placar:[0, 0], venceu:false}));        // saiu no meio: −25
      Object.assign(C, JSON.parse(salvo)); contaSalvar(); return r; })()""")
    P.confere(conta == [400, 1028, 1037, 982, 90, 975], 'a conta dos pontos é a de antes (vitória, diferença, Difícil, derrota, Bronze, abandono) e a derrota não tira da patente', conta)
    # a tela das patentes: pela sua patente no lobby
    await rt(pg, "(() => { CONTA.rq.pts = 1450; contaSalvar(); lbRender(); document.querySelector('#lb [data-rx=\"ranqueada\"]').click(); return 1; })()")
    await pg.wait_for_timeout(300)
    v = await rt(pg, """(() => { const el = document.getElementById('v79-pat'); if (!el || el.hidden) return null;
      return {cols:el.querySelectorAll('.v79-pat-col').length, divs:el.querySelectorAll('.v79-pat-div').length, minha:(el.querySelector('.v79-pat-col.minha .v79-pat-nome') || {}).textContent,
        eu:el.querySelectorAll('.v79-pat-div.eu').length, euNome:(el.querySelector('.v79-pat-div.eu') || {getAttribute(){ return ''; }}).getAttribute('aria-label'),
        sub:el.querySelector('.v79-pat-sub').textContent, nota:el.querySelector('.v79-pat-nota').textContent, faixa:el.querySelector('.v79-pat-col:nth-child(4) .v79-pat-faixa').textContent,
        foco:document.activeElement && document.activeElement.classList.contains('v79-pat-fecha'), jogar:!RQP.raiz.hidden}; })()""")
    P.confere(bool(v) and v['cols'] == 8 and v['divs'] == 24 and not v['jogar'], 'a sua patente (em cima, no lobby) abre a tela PATENTES RANQUEADAS: 8 colunas, 24 divisões (não abre o JOGAR)', v)
    P.confere(bool(v) and v['minha'] == 'PLATINA' and v['eu'] == 1 and 'Platina III' in v['euNome'] and 'PLATINA III' in v['sub'] and v['faixa'] == '1.300 - 1.899',
              'a sua marcada (1.450 pontos = Platina III) e as faixas escritas como na imagem', v)
    P.confere(bool(v) and v['foco'] and '−25' in v['nota'] and 'não da patente' in v['nota'], 'o foco vai para o X e embaixo as regras dos pontos', v and v['nota'][:80])
    await pg.keyboard.press('Escape')
    fechou = await rt(pg, "document.getElementById('v79-pat').hidden")
    P.confere(fechou, 'o Esc fecha as patentes')
    lb = await rt(pg, "(() => { const l = document.querySelector('#lb .v71-liga'); return {b:l.querySelector(':scope > b').textContent, aria:l.getAttribute('aria-label')}; })()")
    P.confere(lb['b'] == 'RANQUEADA' and 'PLATINA III' in lb['aria'], 'no lobby: RANQUEADA e a sua patente (sem LIGA)', lb)
    await rt(pg, "(() => { LB.modo.click(); document.querySelector('#lb-rq .v79-ver-pat').click(); return 1; })()")
    await pg.wait_for_timeout(250)
    vp = await rt(pg, "!document.getElementById('v79-pat').hidden")
    await rt(pg, "(() => { document.querySelector('#v79-pat .v79-pat-fecha').click(); fechaRanqueada(); return 1; })()")
    P.confere(vp and await rt(pg, "document.getElementById('v79-pat').hidden"), 'o VER PATENTES do JOGAR abre as patentes e o X fecha')
    errs = [e for e in erros if 'Failed to load resource' not in e]
    P.confere(not errs, 'nenhum erro de JavaScript (patentes)', errs[:3])
    await b.close()


async def so_ranqueada(pw, P):
    print('\n2) só ranqueada, no Estádio, com a busca e os bots de reserva (sem servidor)')
    velho = json.dumps({'mode': 'casual', 'n': 3, 'map': 0, 'jogo': 'curva', 'nivelCas': 'facil'})
    b, pg, erros = await abre(pw, 1280, 720, armazenamento={'streetball-v49': velho})
    ini = await rt(pg, "({mode:X49.mode, map:X49.map, jogo:X49.jogo, campo:CAMPO.id, mapas:V702.mapas.slice(), rqMapa:CONTA.rq.mapa, sala:SL.pref.map, form:SX.form.map})")
    P.confere(ini['mode'] == 'ranked' and ini['map'] == 4 and ini['jogo'] == 'futebol' and ini['rqMapa'] == 4, 'quem tinha a CASUAL salva: agora é a ranqueada, no Estádio (futebol)', ini)
    P.confere(ini['campo'] == 'gramado' and ini['mapas'][0] == 4 and ini['sala'] == 4 and ini['form'] == 4, 'o Estádio é o campo padrão (o treino de quem nunca escolheu, as salas de quem nunca criou uma)', ini)
    modo = await rt(pg, "({b:LB.modo.querySelector('.v71-modo-tx b').textContent, nm:LB.modo.querySelector('.v77-modo-nm').textContent, aria:LB.jogar.getAttribute('aria-label')})")
    P.confere(modo['nm'] == 'RANQUEADA · ESTÁDIO' and re.match(r'\d VS \d', modo['b']) and 'ranqueada' in modo['aria'], 'o MODO do lobby: o tamanho do time e RANQUEADA · ESTÁDIO', modo)
    await rt(pg, "LB.modo.click()")
    await pg.wait_for_timeout(300)
    f = await rt(pg, """(() => { const vis = e => !!e && !!(e.offsetWidth || e.offsetHeight || e.getClientRects().length);
      return {aba:JG.aba, abas:vis(RQP.abas), casual:vis(RQP.cabCas), mapas:Array.from(RQP.mapas.children).filter(vis).map(b => +b.dataset.m), buscar:RQP.buscar.textContent,
        tit:RQP.cabRq.querySelector('.rq-tit').textContent, nota:RQP.nota.textContent, como:vis(document.querySelector('#lb-rq .v79-como')), bots:vis(ECO.bots && ECO.bots.box),
        txt:document.querySelector('#lb-rq .rq-caixa').innerText}; })()""")
    P.confere(f['aba'] == 'ranked' and not f['abas'] and not f['casual'] and 'CASUAL' not in f['txt'], 'o MODO abre o JOGAR só com a ranqueada (sem a aba CASUAL)', {k: f[k] for k in ('aba', 'abas', 'casual')})
    P.confere(f['mapas'] == [4] and f['buscar'] == 'JOGAR RANQUEADA' and f['tit'].startswith('RANQUEADA') and f['como'] and not f['bots'], 'só o Estádio, o JOGAR RANQUEADA, o COMO É e sem a escolha dos bots', f)
    P.confere(not SEM_NIVEL.search(f['txt']), 'a folha não fala em LIGA nem em FÁCIL/DIFÍCIL', [m.group(0) for m in SEM_NIVEL.finditer(f['txt'])][:3])
    await rt(pg, "document.querySelector('#rq-times [data-n=\"3\"]').click()")
    await rt(pg, "fechaRanqueada()")
    n3 = await rt(pg, "({n:CONTA.rq.n, b:LB.modo.querySelector('.v71-modo-tx b').textContent})")
    P.confere(n3 == {'n': 3, 'b': '3 VS 3'}, 'trocar o tamanho do time vale na hora (o lobby mostra 3 VS 3)', n3)
    await rt(pg, "abreJogar('casual')")
    P.confere(await rt(pg, "JG.aba === 'ranked' && RQP.n === 3"), 'mesmo pedindo a casual (caminho antigo), abre a ranqueada')
    await rt(pg, "fechaRanqueada()")
    # o JOGAR: a busca e, sem servidor, os bots
    await rt(pg, "LB.jogar.click()")
    await pg.wait_for_timeout(200)
    bs = await rt(pg, "(() => { const el = document.getElementById('v79-busca'); return {vis:!el.hidden, b:RachaRanqueada79.busca(), tag:el.querySelector('.v79-busca-tag').textContent, st:el.querySelector('.v79-busca-st').textContent, lb:lobby.aberto}; })()")
    P.confere(bs['vis'] and bs['b'] and bs['b']['fase'] == 'sem' and bs['b']['n'] == 3 and 'RANQUEADA · 3 VS 3 · ESTÁDIO' in bs['tag'], 'o JOGAR abre a BUSCA (3 VS 3, no Estádio, com a sua patente)', bs)
    P.confere('contra bots' in bs['st'], 'sem servidor: a busca avisa que a partida é contra bots', bs['st'])
    ok = await espera(pg, "RQ.on && !lobby.aberto && RQ.estado !== 'intro'", 4000)
    m = await rt(pg, "({on:RQ.on, mm:X49.matchMode, mapa:RQ.mapa, n:RQ.n, campo:CAMPO.id, jogo:RQ.jogo, nome:x49ModeName(), aviso:RQ.aviso.txt, busca:document.getElementById('v79-busca').hidden})")
    P.confere(bool(ok) and m['mm'] == 'ranked' and m['mapa'] == 4 and m['n'] == 3 and m['campo'] == 'gramado' and m['jogo'] == 'futebol' and m['busca'],
              'em ~1,5 s começa a ranqueada contra bots: 3v3, no Estádio, futebol', m)
    P.confere(m['nome'] == 'RANQUEADA' and m['aviso'] == 'RANQUEADA CONTRA BOTS', 'a faixa do começo: RANQUEADA CONTRA BOTS (sem o nível)', m)
    txts = await rt(pg, """(() => { const L = []; const s0 = sprHud; sprHud = function(k){ if (String(k).indexOf('info|') === 0) L.push(String(k).slice(5)); return s0.apply(this, arguments); };
      try { rqInfoPilula(); } finally { sprHud = s0; }
      const pausa = pausaRotulo(); rqVsAbre(); rqIntro(3); const vs = [VS.nivel.textContent].concat(Array.from(document.querySelectorAll('#rq-vs small')).map(s => s.textContent)); rqVsComeca();
      return {pilula:L[0] || '', pausa, vs}; })()""")
    tudo = ' | '.join([txts['pilula'], txts['pausa']] + txts['vs'])
    P.confere(txts['pilula'].startswith('RANQUEADA · 3v3 · ESTÁDIO') and 'CONTRA BOTS' in txts['pausa'], 'a pílula de baixo e a pausa: RANQUEADA … CONTRA BOTS', txts)
    P.confere(txts['vs'][0].startswith('RANQUEADA') and not SEM_NIVEL.search(tudo), 'a apresentação dos times, a pausa e a pílula sem LIGA e sem FÁCIL/DIFÍCIL', tudo[:240])
    # o fim (vitória por 2): os pontos e o texto
    antes = await rt(pg, "CONTA.rq.pts")
    await rt(pg, "(() => { RQ.placar = [3, 1]; RQ.estado = 'jogo'; rqFim(); return 1; })()")
    fim = await espera(pg, "fimAberto() && RQ.resultado && RQ.resultado.contado && fimEl('fim-info').textContent", 6000)
    pr = await rt(pg, "(() => { const R = RQ.resultado; return {pr:R.pr && R.pr.delta, nivel:R.nivel, pts:CONTA.rq.pts, box:!fimEl('fim-rq').hidden, d:fimEl('fim-rq-d').textContent, bt:fimEl('fim-denovo').textContent}; })()")
    esp = 22 + 3*2 + (6 if pr['nivel'] == 'dificil' else 0)
    P.confere(bool(fim) and 'RANQUEADA' in fim and 'contra bots' in fim and not SEM_NIVEL.search(fim), 'o fim: RANQUEADA … contra bots (sem o nível)', fim)
    P.confere(pr['pr'] == esp and pr['pts'] == antes + esp and pr['box'] and pr['d'] == '+%d PONTOS' % esp, 'a vitória por 2 dá os pontos da ranqueada (com o bônus se os bots eram os mais fortes)', [pr, antes, esp])
    # JOGAR DE NOVO sem servidor: outra contra bots na hora
    await rt(pg, "fimEl('fim-denovo').click()")
    nova = await espera(pg, "RQ.on && !fimAberto() && RQ.placar[0] + RQ.placar[1] === 0 && X49.matchMode === 'ranked' && RQ.mapa === 4", 3000)
    P.confere(bool(nova), 'JOGAR DE NOVO (sem servidor): outra ranqueada contra bots, no Estádio')
    vs2 = await rt(pg, "(() => { rqIntro(3); return [VS.nivel.textContent].concat(Array.from(document.querySelectorAll('#rq-vs small')).map(s => s.textContent)).join(' | '); })()")
    P.confere(not SEM_NIVEL.search(vs2), 'a apresentação do JOGAR DE NOVO sem o nível dos bots', vs2[:200])
    await rt(pg, "rqVsComeca()")
    # sair no meio: −25 (a mesma regra)
    p0 = await rt(pg, "(() => { RQ.estado = 'jogo'; CONTA.rq.pts = 1000; contaSalvar(); rqPedeSaida(); rqPedeSaida(); return CONTA.rq.pts; })()")
    P.confere(p0 == 975, 'desistir no meio: −25 pontos', p0)
    await rt(pg, "abrirLobby()")
    # as missões do dia
    mi = await rt(pg, """(() => { const M = ecoMissoes(); M.l[0] = {id:'liga', alvo:1, arg:null, p:0, ok:false}; M.l[1] = {id:'mapa', alvo:1, arg:0, p:0, ok:false}; M.l[2] = {id:'modo', alvo:1, arg:'curva', p:0, ok:false};
      const N = ecoMissoes(); return {l:N.l.map(x => [x.id, x.arg]), txt:N.l.map(x => MI[x.id].txt(x.alvo, x.arg))}; })()""")
    P.confere(mi['l'][0] == ['liga', None] and mi['txt'][0] == 'Conclua 1 partida ranqueada' and mi['l'][1] == ['mapa', 4] and mi['l'][2][0] == 'treino',
              'as missões: "Conclua 1 partida ranqueada"; a do mapa vira o Estádio e a do modo vira a do treino', mi)
    est = await rt(pg, "({ctx:EST_CTX.find(x => x[0] === 'liga')[1], nome:PX_CTX_NOME.liga})")
    P.confere(est == {'ctx': 'RANQUEADA', 'nome': 'ranqueada'}, 'as estatísticas do perfil chamam a liga de RANQUEADA', est)
    # o fim do tutorial: a primeira partida é a ranqueada (com a busca)
    await rt(pg, "(() => { fechaFim(); tutComeca({onb:true}); return TR.id; })()")
    await rt(pg, "document.getElementById('trf-prox').click()")
    tu = await espera(pg, "lobby.aberto && RachaRanqueada79.busca() || (RQ.on && X49.matchMode === 'ranked' && RQ.mapa === 4)", 3000)
    P.confere(bool(tu) and await rt(pg, "TR.id !== 'tut'"), 'o fim do tutorial (JOGAR A PRIMEIRA PARTIDA) abre a busca da ranqueada', tu)
    errs = [e for e in erros if 'Failed to load resource' not in e]
    P.confere(not errs, 'nenhum erro de JavaScript (só ranqueada)', errs[:3])
    await b.close()
    # quem já escolheu um campo no treino continua com ele
    b, pg, erros = await abre(pw, 1280, 720, armazenamento={'racha-treino-campo-v1': 'estadio', 'racha-sala-pref': json.dumps({'n': 2, 'map': 0, 'jogo': 'futebol', 'tempo': 0, 'bots': True})})
    c = await rt(pg, "({campo:CAMPO.id, sala:SL.pref.map})")
    P.confere(c == {'campo': 'estadio', 'sala': 0}, 'quem já tinha escolhido a Arena (no treino e nas salas) continua com ela', c)
    await b.close()


async def selo_offline(pw, P):
    print('\n3) o selo V (o seu e o dos outros)')
    b, pg, erros = await abre(pw, 1280, 720)
    r = await rt(pg, """(() => { NET49.selo = 'verificado'; v79SeloSync(); lbRender();
      const bg = el => el ? getComputedStyle(el, '::before').backgroundImage : '';
      const nm = document.getElementById('lb-eu-nome'), pf = document.getElementById('lb-nome-txt');
      return {lb:nm.dataset.v79Selo, pf:pf.dataset.v79Selo, svg:bg(nm).indexOf('data:image/svg+xml') >= 0, larg:parseFloat(getComputedStyle(nm, '::before').width), eu:v79SeloEu(), titulo:nm.title}; })()""")
    P.confere(r['lb'] == 'verificado' and r['pf'] == 'verificado' and r['svg'] and r['larg'] > 8, 'o seu V (VERIFICADO) na frente do nome no lobby e no perfil (o desenho do V)', r)
    await rt(pg, "abreTela('perfil')")
    await pg.wait_for_timeout(400)
    pf = await rt(pg, "(() => { const e = document.getElementById('lb-nome-txt'), b = e.getBoundingClientRect(); return {vis:b.width > 0, selo:e.dataset.v79Selo, bg:getComputedStyle(e, '::before').backgroundImage.indexOf('svg') >= 0}; })()")
    P.confere(pf['vis'] and pf['selo'] == 'verificado' and pf['bg'], 'no PERFIL o nome aparece com o V', pf)
    await rt(pg, "fechaTela()")
    inval = await rt(pg, """(() => { const out = [];
      for (const s of ['admin', '__proto__', 'constructor', '', null]){ NET49.selo = s; v79SeloSync(); out.push(document.getElementById('lb-eu-nome').dataset.v79Selo || ''); }
      NET49.selo = ''; v79SeloSync(); return out; })()""")
    P.confere(inval == ['', '', '', '', ''], 'selo que não existe (admin, __proto__…) não aparece', inval)
    sala = await rt(pg, """(() => { const r = {code:'ABCD', host:'a', admin:null, n:1, roster:['a', 'b'], state:'waiting', members:[]};
      const c1 = slCartao({id:'a', name:'Ana', selo:'parceiro', slot:0, flag:'BR'}, r), c2 = slCartao({id:'b', name:'Beto', selo:'hacker', slot:1, flag:'BR'}, r);
      const l1 = sxLinha({code:'ABCD', name:'Racha da Ana', selo:'equipe', n:1, jogo:'futebol', map:4, tempo:0, players:1, max:2, state:'waiting', flag:'BR'});
      return {c1:c1.querySelector('.sl-nm-t').dataset.v79Selo || '', c2:c2.querySelector('.sl-nm-t').dataset.v79Selo || '', l1:l1.querySelector('.sx-nm > span').dataset.v79Selo || ''}; })()""")
    P.confere(sala == {'c1': 'parceiro', 'c2': '', 'l1': 'equipe'}, 'na sala: o V do PARCEIRO no cartão; na lista das salas, o V da EQUIPE no dono (o selo errado não aparece)', sala)
    br = await rt(pg, """(() => { BRASIL.msgs = [{id:'m1', from:'x1', nome:'Ana', selo:'verificado', texto:'salve', t:Date.now()}, {id:'m2', from:'x2', nome:'Beto', selo:'', texto:'opa', t:Date.now()},
      {id:'m3', from:'x3', nome:'Caio', selo:'criador', texto:'boa', t:Date.now()}]; BRASIL.silenciados.add('x2'); brasilRenderLista(true);
      const L = Array.from(document.querySelectorAll('#br-lista .br-nome')).map(e => [e.textContent, e.dataset.v79Selo || '']);
      BRASIL.silenciados.delete('x2'); return L; })()""")
    P.confere(br == [['Ana', 'verificado'], ['Caio', 'criador']], 'no CHAT DO BRASIL: o V de cada um (do servidor), na mensagem certa (o silenciado não conta)', br)
    cb = await rt(pg, """(() => { const sala0 = NET49.room; NET49.room = {code:'ABCD', members:[{id:'x9', name:'Duda', selo:'verificado'}, {id:'x8', name:'Edu', selo:''}], roster:['x9', 'x8'], n:1};
      SL.chat = [{id:'x9', name:'Duda', text:'oi'}, {sys:true, text:'Edu chegou na sala'}, {id:'x8', name:'Edu', text:'bora'}];
      CB.aberto = true; CB.aba = 'sala'; let L = [];
      try { cbPintaPainel(); L = Array.from(CB.lista.querySelectorAll('.c81-lin:not(.sys) .c81-nome b')).map(b => [b.textContent, b.dataset.v79Selo || '']); }   // v81: o painel novo (.c81-lin, em ordem de chegada)
      finally { CB.aberto = false; NET49.room = sala0; SL.chat = []; }
      return L; })()""")
    P.confere(cb == [['Duda', 'verificado'], ['Edu', '']], 'no chat de baixo (a sala): o V de quem tem, pelo membro da sala', cb)
    # na partida: o V desenhado embaixo da tampinha, antes do nome
    cv = await rt(pg, """(() => { let n = 0; const d0 = v79SeloDesenha; v79SeloDesenha = function(){ n++; return d0.apply(this, arguments); };
      try { NET49.selo = 'verificado'; T.comeca('futebol', 2, 4); render(0); const com = n; n = 0; NET49.selo = ''; render(0); return {com, sem:n}; } finally { v79SeloDesenha = d0; } })()""".replace('T.comeca', '__T.comeca'))
    P.confere(cv['com'] >= 1 and cv['sem'] == 0, 'na partida: o seu V é desenhado antes do nome (e some sem selo)', cv)
    errs = [e for e in erros if 'Failed to load resource' not in e]
    P.confere(not errs, 'nenhum erro de JavaScript (selo)', errs[:3])
    await b.close()


ESTADO = """(() => { const r = NET49.room; return {id:NET49.id, sala:r ? r.code : null, ranked:!!(r && r.ranked), map:r ? r.map : null, n:r ? r.n : null, jogando:NET49.playing,
  host:NET49.host, slot:NET49.localSlot, rq:RQ.on ? RQ.estado : null, mm:X49.matchMode, nome:x49ModeName(), aviso:RQ.aviso.txt, busca:RachaRanqueada79.busca(), lobby:lobby.aberto,
  pts:CONTA.rq.pts, selo:NET49.selo}; })()"""


async def online(pw, P):
    print('\n4) a ranqueada online (o servidor da turma e sessões no navegador)')
    porta = porta_livre()
    srv = subprocess.Popen(['node', str(RAIZ / 'tests' / 'servidor_visitantes.cjs'), '--porta', str(porta), '--host', '127.0.0.1', '--memoria', '--estaticos', str(RAIZ), '--nome', 'Teste da ranqueada', '--sem-p2p'],
                           stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    time.sleep(0.8)
    url = 'http://127.0.0.1:%d/tests/build/racha_teste.html' % porta
    sess = []
    try:
        A = await sessao(pw, url, 'Ana'); B = await sessao(pw, url, 'Beto'); C = await sessao(pw, url, 'Caio'); sess += [A, B, C]
        for pg in (A, B):
            await rt(pg, "(() => { CONTA.rq.pts = 1000; CONTA.rq.seq = 0; CONTA.rq.n = 1; contaSalvar(); lbRender(); return 1; })()")
        # 1v1: os dois na fila
        await rt(A, "LB.jogar.click()")
        fa = await espera(A, "(() => { const b = RachaRanqueada79.busca(); return b && b.fase === 'fila' ? b : null; })()", 6000)
        P.confere(bool(fa) and fa['online'], 'com o servidor: a BUSCA conecta e entra na fila do 1v1', fa)
        st = await rt(A, "document.querySelector('#v79-busca .v79-busca-st').textContent")
        toast = await rt(A, "X49UI.toast.textContent")
        P.confere('Procurando jogadores' in st and 'contra bots' in st and 'Crie ou entre' not in toast, 'a busca diz o que está fazendo e quando vira contra bots (sem o aviso das salas embaixo)', [st, toast])
        P.confere(await rt(A, "NET49.selo === ''"), 'o hello do servidor traz o seu selo (sem conta: nenhum)')
        await rt(B, "LB.jogar.click()")
        JOGA = "NET49.playing && NET49.room && NET49.room.ranked && (NET49.host || NET49.lastTick > 0)"   # (quem roda a partida não recebe quadros: manda)
        ja = await espera(A, JOGA, 8000)
        jb = await espera(B, JOGA, 8000)
        ea = await rt(A, ESTADO); eb = await rt(B, ESTADO)
        P.confere(bool(ja and jb) and ea['sala'] == eb['sala'] and ea['map'] == 4 and ea['n'] == 1 and ea['host'] != eb['host'], 'os dois da fila jogam juntos: a sala ranqueada 1v1 no Estádio (um roda a partida)', [ea, eb])
        P.confere(not ea['busca'] and not eb['busca'] and not ea['lobby'] and ea['mm'] == 'ranked' and ea['nome'] == 'RANQUEADA ONLINE' and ea['aviso'] == 'RANQUEADA ONLINE',
                  'a busca fecha, o lobby sai e a faixa diz RANQUEADA ONLINE', ea)
        tela = await rt(A, "lobby.tela")
        P.confere(tela is None, 'a sala da ranqueada não abre a tela da sala (a partida vem direto)', tela)
        await rt(C, "abreTela('amigos')")
        await espera(C, "!!NET49.id && SL.lista !== null", 6000)
        await rt(C, "net49Send({type:'list'})")
        await C.wait_for_timeout(700)
        lista = await rt(C, "(SL.lista || []).map(s => s.name)")
        P.confere('Ranqueada' not in lista, 'a sala da ranqueada não aparece na lista das salas', lista)
        host, conv = (A, B) if ea['host'] else (B, A)
        pausa = await rt(conv, "pausaRotulo()")
        P.confere('RANQUEADA ONLINE' in pausa and 'SALA' not in pausa, 'a pausa da ranqueada online (sem o código da sala)', pausa)
        # o fim: o anfitrião ganha por 3 (depois de 11 s, para o servidor validar)
        mi = "(() => { const M = ecoMissoes(); M.l[0] = {id:'liga', alvo:1, arg:null, p:0, ok:false}; return 1; })()"
        await rt(A, mi); await rt(B, mi)
        await asyncio.sleep(11.5)
        await rt(host, "(() => { RQ.placar = [P.time === 0 ? 3 : 0, P.time === 0 ? 0 : 3]; RQ.estado = 'jogo'; rqFim(); return 1; })()")
        fh = await espera(host, "fimAberto() && RQ.resultado && RQ.resultado.pr && fimEl('fim-info').textContent", 8000)
        fc = await espera(conv, "fimAberto() && RQ.resultado && RQ.resultado.pr && fimEl('fim-info').textContent", 8000)
        rh = await rt(host, "({pts:CONTA.rq.pts, d:RQ.resultado.pr.delta, nivel:RQ.resultado.nivel, tit:fimEl('fim-titulo').textContent, bt:fimEl('fim-denovo').textContent, liga:ecoMissoes().l[0].p})")
        rc = await rt(conv, "({pts:CONTA.rq.pts, d:RQ.resultado.pr.delta, tit:fimEl('fim-titulo').textContent, liga:ecoMissoes().l[0].p})")
        P.confere(bool(fh and fc) and 'RANQUEADA ONLINE · 1v1 · Estádio · só gente' in fh, 'o fim conferido pelo servidor: RANQUEADA ONLINE · 1v1 · Estádio · só gente', [fh, fc])
        P.confere(rh['d'] == 31 and rh['pts'] == 1031 and rh['nivel'] == 'online' and rc['d'] == -20 and rc['pts'] == 980,
                  'os pontos da ranqueada: quem ganhou por 3 leva +31 (sem o bônus dos bots), quem perdeu −20', [rh, rc])
        P.confere(rh['bt'] == 'JOGAR DE NOVO' and rh['liga'] == 1 and rc['liga'] == 1, 'JOGAR DE NOVO (sem revanche) e a missão da ranqueada conta a partida online', [rh, rc])
        # JOGAR DE NOVO: sai da sala e procura outra; LOBBY: sai da sala
        await rt(host, "fimEl('fim-denovo').click()")
        await rt(conv, "fimEl('fim-lobby').click()")
        dh = await espera(host, "(() => { const b = RachaRanqueada79.busca(); return lobby.aberto && !NET49.room && b && b.fase === 'fila' ? b : null; })()", 6000)
        dc = await espera(conv, "lobby.aberto && !NET49.room && !RachaRanqueada79.busca() && !lobby.tela", 6000)
        P.confere(bool(dh) and bool(dc), 'JOGAR DE NOVO sai da sala e já procura outra; LOBBY volta para o lobby', [dh, dc])
        # outra partida; quem roda a partida sai no meio: ele perde 25 e o outro não perde nada
        await asyncio.sleep(0.4)
        await rt(conv, "LB.jogar.click()")
        await espera(host, JOGA, 8000)
        await espera(conv, JOGA, 8000)
        quem = await rt(host, "NET49.host")
        dono, outro = (host, conv) if quem else (conv, host)
        p_dono = await rt(dono, "CONTA.rq.pts"); p_outro = await rt(outro, "CONTA.rq.pts")
        barra = await rt(dono, "(() => { x49GameUI(); return {txt:X49UI.netText.textContent, bt:X49UI.onlinebar.querySelector('button').textContent}; })()")
        await rt(dono, "(() => { salaJogoAbre(); window.__arb = !!SJ.caixa.querySelector('.sj-arb'); window.__tag = (SJ.caixa.querySelector('.sj-tag') || {}).textContent; const b = Array.from(SJ.caixa.querySelectorAll('.sj-acoes button')).find(x => /DESISTIR/.test(x.textContent)); window.__btDes = b ? b.textContent : ''; if (b) b.click(); return 1; })()")
        btd = await rt(dono, "window.__btDes")
        sj = await rt(dono, "({arb:window.__arb, tag:window.__tag})")
        P.confere(barra == {'txt': 'RANQUEADA ONLINE · você roda a partida', 'bt': 'MENU'} and sj == {'arb': False, 'tag': 'RANQUEADA ONLINE'},
                  'na partida: a barrinha diz RANQUEADA ONLINE (sem código de sala) e o MENU não tem o apito do árbitro (ninguém pausa para todos nem encerra)', [barra, sj])
        pd = await espera(dono, "!NET49.room && lobby.aberto && CONTA.rq.pts", 6000)
        po = await espera(outro, "!LB.pop.hidden && LB.popCaixa.textContent.indexOf('A PARTIDA PAROU') >= 0", 6000)
        p_outro2 = await rt(outro, "CONTA.rq.pts")
        P.confere(btd == 'DESISTIR (−25 PONTOS)' and pd == p_dono - 25, 'no meio, o SAIR da sala da ranqueada é DESISTIR (−25 PONTOS): quem sai perde 25', [btd, p_dono, pd])
        P.confere(bool(po) and p_outro2 == p_outro and await rt(outro, "!NET49.room && lobby.aberto"), 'o outro vê A PARTIDA PAROU e não perde nem ganha pontos', [p_outro, p_outro2])
        await rt(outro, "fechaPop()")
        # 2v2: dois na fila, depois de 8 s jogam com 2 bots
        for pg in (A, B):
            await rt(pg, "(() => { CONTA.rq.n = 2; contaSalvar(); lbRender(); filaPop.length = 0; if (!LB.pop.hidden) fechaPop(); return 1; })()")
        await asyncio.sleep(0.4)                                  # (o lobby ignora o toque dos primeiros 300 ms depois de abrir: o clique fantasma)
        t0 = time.time()
        await rt(A, "LB.jogar.click()"); await rt(B, "LB.jogar.click()")
        m2 = await espera(A, JOGA + " && NET49.room.n === 2", 14000)
        dt = time.time() - t0
        e2 = await rt(A, ESTADO); g2 = await rt(A, "NET49.room.roster.filter(Boolean).length")
        P.confere(bool(m2) and g2 == 2 and 7 <= dt <= 13 and e2['aviso'] == 'RANQUEADA ONLINE · 2 PESSOAS E 2 BOTS', 'no 2v2, dois na fila jogam juntos depois de ~8 s, com 2 bots completando', [dt, g2, e2['aviso']])
        for pg in (A, B):
            await rt(pg, "net49Send({type:'leave'})")
        await espera(A, "!NET49.room && lobby.aberto", 6000); await espera(B, "!NET49.room && lobby.aberto", 6000)
        for pg in (A, B):
            await rt(pg, "(() => { filaPop.length = 0; if (!LB.pop.hidden) fechaPop(); return 1; })()")
        # sozinho: CANCELAR, JOGAR CONTRA BOTS AGORA e, esperando, ninguém aparece → contra bots
        await rt(C, "(() => { CONTA.rq.n = 3; contaSalvar(); fechaTela(); window.__env = []; const s0 = net49Send; net49Send = function(m){ window.__env.push(m && m.type); return s0.apply(this, arguments); }; return 1; })()")
        await rt(C, "LB.jogar.click()")
        await espera(C, "(() => { const b = RachaRanqueada79.busca(); return b && b.fase === 'fila'; })()", 6000)
        await rt(C, "document.querySelector('#v79-busca .v79-busca-cancela').click()")
        cc = await rt(C, "({busca:RachaRanqueada79.busca(), vis:!document.getElementById('v79-busca').hidden, env:window.__env.slice(window.__env.lastIndexOf('fila'))})")
        P.confere(not cc['busca'] and not cc['vis'] and 'fila_sai' in cc['env'], 'CANCELAR fecha a busca e tira você da fila (fila_sai)', cc)
        await rt(C, "LB.jogar.click()")
        await espera(C, "(() => { const b = RachaRanqueada79.busca(); return b && b.fase === 'fila'; })()", 6000)
        await rt(C, "document.querySelector('#v79-busca .v79-busca-bots').click()")
        jb2 = await espera(C, "RQ.on && !NET49.playing && X49.matchMode === 'ranked' && RQ.mapa === 4 && RQ.n === 3", 3000)
        P.confere(bool(jb2) and await rt(C, "window.__env.slice(window.__env.lastIndexOf('fila')).indexOf('fila_sai') > 0"), 'JOGAR CONTRA BOTS AGORA: sai da fila e a ranqueada contra bots começa na hora')
        await rt(C, "(() => { rqSai(); abrirLobby(); filaPop.length = 0; if (!LB.pop.hidden) fechaPop(); return 1; })()")
        await asyncio.sleep(0.4)                                  # (o clique fantasma: o lobby ignora os primeiros 300 ms)
        t1 = time.time()
        await rt(C, "LB.jogar.click()")
        so = await espera(C, "RQ.on && !NET49.playing && X49.matchMode === 'ranked' && RQ.mapa === 4 && !lobby.aberto && RQ.aviso.txt", 30000, 200)
        dt2 = time.time() - t1
        P.confere(so == 'NINGUÉM ONLINE AGORA · RANQUEADA CONTRA BOTS' and 19 <= dt2 <= 27, 'sozinho na fila: depois de ~20 s, a ranqueada é contra bots (e a faixa avisa)', [so, round(dt2, 1)])
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
    P = Placar('v79 · patentes, só ranqueada (online + bots) e o selo V')
    async with async_playwright() as pw:
        await patentes(pw, P)
        await so_ranqueada(pw, P)
        await selo_offline(pw, P)
        await online(pw, P)
    return P.fim()

if __name__ == '__main__':
    roda(principal())
