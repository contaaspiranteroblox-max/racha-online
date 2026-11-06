"""RACHA v95 · a rodada do fim da partida, dos emojis, da ranqueada, do chat, do perfil, dos campos, da economia, do sensor e
da tampinha inicial, das linhas só na Oficina e do visual sem cara de IA (o jogo no navegador: tests/build/racha_teste.html).

1) a arte e o visual: as imagens geradas por IA saíram (a arte é desenhada em código: tools/v95/arte), os ícones, os preços,
   os botões em placa, as abas com o estado, a dica e a OFICINA na fileira do TREINO;
2) a tampinha inicial (roxo, branco e laranja; no time, a cor do time dos lados) e o sensor (o seu verde, os outros na cor
   do time);
3) os campos 30% maiores (1v1 a 4v4) e as linhas da bola só na Oficina com o RANK OFF;
4) os emojis da tampinha: o atlas, a loja por raridade, comprar e equipar (a demonstração), na partida e nos bots;
5) o fim da partida no estilo da imagem (os dois times, o título, o placar pendurado com os gols);
6) a economia (o que a partida rende, parte por parte, e a tabela COMO GANHAR);
7) a ranqueada ao vivo (online, jogando, procurando em cada tamanho; a PARTIDA ENCONTRADA);
8) o chat mais fácil (os emojis, as frases prontas, o contador) e o perfil de orgulho (o cartão do craque e a vitrine);
9) as patentes novas (cada uma com a sua forma; a divisão na fita, as asas e a coroa);
10) o placar minimalista (as três abas de vidro; o clube do lado quando o time todo é do mesmo clube — contra os bots e,
   simulado, online), o painel dos jogadores (a foto de perfil cheia no círculo, o clube embaixo do nome) e o sensor
   apertado (o branco forte: segurando fica, soltou some; o toque rápido; os outros pelo quadro do servidor; os bots no
   chute; a Oficina); no celular deitado, o painel do 4v4 entre os controles e o nome comprido que vira a sigla;
11) depois do teste, a Oficina: mexer num valor não leva o menu lá para cima (e o foco fica; o toque no campo de baixo não se
   perde), o DESLIZE da tampinha (no editor e no CRIAR SALA), a tampinha grande que chuta (o anel nunca por dentro dela) e as
   LINHAS do mapa (o criador liga em PARTIDA e valem para todos: no TESTAR, sem o RANK OFF; no CRIAR SALA, a nota).

Rodar: python3 tests/v95_test.py
"""
import base64, json, pathlib, re
from comum import abre, rt, roda, Placar, async_playwright, RAIZ, PONTINHO

SAIDA = RAIZ / 'tests' / 'saida'
SAIDA.mkdir(exist_ok=True)


def b64(p):
    return base64.b64encode((RAIZ / p).read_bytes()).decode('ascii')


async def principal():
    P = Placar('v95 · o fim da partida, os emojis, a ranqueada, o chat, o perfil, os campos, a economia e o visual')
    html = (RAIZ / 'app' / 'public' / 'game' / 'racha.html').read_text(encoding='utf-8')

    print('\n1) a arte e o visual (sem cara de IA)')
    velhas = ['tools/v91/fundo.webp', 'tools/v91/fundo_telas.webp', 'tools/v77/fundo_lobby.webp', 'tools/v75/lobby_fundo.webp', 'tools/v77/letreiro.webp',
              'tools/v77/banner_perfil.webp', 'tools/v77/icones.webp', 'tools/v91/banners.webp', 'tools/v77/quadra_kit.webp', 'tools/v74/campo_noite_kit.webp',
              'tools/v76/skins_kit.webp']
    restam = [v for v in velhas if (RAIZ / v).exists()]           # (v111: saíram também do projeto — nem o arquivo existe mais)
    fora = [v for v in restam if b64(v)[:4000] in html]
    P.confere(not fora and not restam, 'as imagens geradas por IA (fundos, letreiro, banners, ícones, kits dos mapas e as caras das tampinhas animadas) saíram do jogo e, desde a v111, do projeto', fora or restam)
    novas = ['fundo', 'letreiro', 'icones', 'banners', 'quadra_kit', 'campo_noite_kit', 'skins_kit']
    aposentadas = ['fundo_telas', 'fundo77', 'fundo75', 'banner_perfil']   # v111: as que não aparecem mais (tools/v111/enxuga.py)
    faltam = [n for n in novas if b64('tools/v95/arte/%s.webp' % n)[:4000] not in html]
    sobram = [n for n in aposentadas if b64('tools/v95/arte/%s.webp' % n)[:4000] in html]
    P.confere(not faltam and not sobram and html.count(PONTINHO) == 5,
              'no lugar delas, a arte desenhada em código (tools/v95/arte): as 7 que aparecem (as outras 4, desde a v111, o pontinho)', (faltam, sobram))
    P.confere('"cria":[0,0,300,300]' in html and '"fe_cruz":[302,604,300,300]' in html, 'o kit das tampinhas animadas novo (as 8 peças, maiores: 300 px)')

    async with async_playwright() as pw:
        b, pg, erros = await abre(pw, 1280, 720, config={'modo': 'demo'})
        await pg.wait_for_timeout(700)
        v = await rt(pg, """(() => { const s = document.getElementById('v91-sprite'), lb = LB.raiz;
          const tile = document.querySelector('#rx .rx-bt.v71-tile'), tr = document.querySelector('#rx [data-rx="treino"]'), of = document.querySelector('.ofi-lobby');
          const rt = tr && tr.getBoundingClientRect(), ro = of && of.getBoundingClientRect();
          return {html:document.documentElement.classList.contains('v95v'), lb:lb.classList.contains('v95v'), defs:!!(s && s.querySelector('defs')), textos:s ? s.querySelectorAll('symbol text').length : -1,
            simbolos:s ? s.querySelectorAll('symbol[id^="v91i-"]').length : 0, moeda:getComputedStyle(lb).getPropertyValue('--v91-moeda').slice(0, 30), gema:getComputedStyle(lb).getPropertyValue('--v91-gema').slice(0, 30),
            azul:getComputedStyle(document.documentElement).getPropertyValue('--v91-azul-f'), tile:tile ? getComputedStyle(tile).boxShadow : '',
            dica:(document.querySelector('#lb .v90-dica span') || {}).textContent, of:ro ? [Math.round(ro.top), Math.round(ro.bottom)] : null, tr:rt ? [Math.round(rt.top), Math.round(rt.bottom)] : null,
            sk:SK76_KIT.p.cria, skOk:SK76.ok, v101:document.documentElement.classList.contains('v101'), ofL:ro ? Math.round(ro.left) : null, trL:rt ? Math.round(rt.left) : null,
            v102:lb.classList.contains('v102'), doca:[...document.querySelectorAll('#lb .v102-doca-bt')].map(e => e.textContent.trim())}; })()""")
        P.confere(v['html'] and v['lb'], 'o visual da v95 está ligado (html.v95v e #lb.v95v)', v)
        # (v101: o sprite da imagem da noite tem os 22 de sempre e mais 5 — a OFICINA, a bola, as setas de trocar, o sinal e a pessoa)
        P.confere(v['defs'] and v['textos'] == 0 and v['simbolos'] == (27 if v['v101'] else 22), 'os 22 ícones do sprite no desenho novo (v101: + 5), sem letra (o $ da moeda é desenhado) e com o <defs> que a v91 usa', v)
        P.confere(v['moeda'].startswith('url(') and v['gema'].startswith('url('), 'a moeda e a gema dos preços (as imagens soltas do sprite) existem', [v['moeda'], v['gema']])
        P.confere('#2a6fe0' in v['azul'].lower() or '42, 111, 224' in v['azul'], 'as cores dos botões por papel: a face chapada (o azul sem o brilho de bala)', v['azul'])
        # (v101: os botões da tela inicial são o vidro escuro da imagem da noite — o fio de luz em cima e o contorno fino — no lugar da placa)
        P.confere(('rgba(255, 255, 255, 0.11) 0px 1px 0px 0px inset' in v['tile']) if v['v101'] else ('rgb(10, 13, 32)' in v['tile']), 'os botões da tela inicial são placas (a beirada de baixo grossa; v101: o vidro escuro)', v['tile'][:120])
        P.confere(v['dica'] == 'Toque para abrir o cofre, segure para trocar', 'a dica embaixo da tampinha, em frase', v['dica'])
        # (v101: a OFICINA é o cartão dourado logo embaixo da coluna da esquerda, debaixo do TREINO, alinhada com ela)
        # (v102: o lobby com menos coisa na tela — a OFICINA e o TREINO lado a lado na barra de atalhos de baixo)
        if v['v102']:
            P.confere(v['doca'] == ['SALAS', 'TREINO', 'OFICINA', 'COFRE'], 'a OFICINA do lado do TREINO, na barra de atalhos (v102)', v['doca'])
        elif v['v101']:
            P.confere(v['of'] and v['tr'] and 0 <= v['of'][0] - v['tr'][1] <= 30 and abs(v['ofL'] - v['trL']) <= 2, 'a OFICINA logo embaixo do TREINO (v101)', [v['of'], v['tr'], v['ofL'], v['trL']])
        else:
            P.confere(v['of'] and v['tr'] and abs(v['of'][0] - v['tr'][0]) <= 6 and abs(v['of'][1] - v['tr'][1]) <= 6, 'a OFICINA na mesma fileira do TREINO', [v['of'], v['tr']])
        P.confere(v['skOk'] and v['sk'] == [0, 0, 300, 300], 'as caras das tampinhas animadas (o kit novo) carregaram', v)
        await pg.screenshot(path=str(SAIDA / 'v95_lobby.png'))
        # os preços com a moeda e a gema (a loja)
        await rt(pg, "(() => { abreTela('loja'); return 1; })()"); await pg.wait_for_timeout(600)
        pr = await rt(pg, """(() => { const L = [...document.querySelectorAll('#lb .ic-moeda, #lb .ic-gema')].filter(e => e.offsetWidth > 0);
          return {n:L.length, sem:L.filter(e => !getComputedStyle(e).backgroundImage.startsWith('url(') && !e.querySelector('svg use')).length}; })()""")
        P.confere(pr['n'] >= 4 and pr['sem'] == 0, 'na loja, todo preço tem o desenho da moeda ou da gema', pr)
        # a aba ativa do RANKING continua marcada (a cor da categoria)
        await rt(pg, "(() => { fechaTela(); abreTela('ranking'); return 1; })()"); await pg.wait_for_timeout(600)
        ab = await rt(pg, """(() => { const L = [...document.querySelectorAll('.rk90-aba')]; const on = L.find(b => b.classList.contains('on')), off = L.find(b => !b.classList.contains('on'));
          const eu = document.querySelector('.rk90-eu');
          return {on:on ? getComputedStyle(on).backgroundImage.slice(0, 80) : null, off:off ? getComputedStyle(off).backgroundImage.slice(0, 80) : null, euVazio:eu ? (!eu.childNodes.length && getComputedStyle(eu).display === 'none') : true}; })()""")
        P.confere(ab['on'] and ab['off'] and ab['on'] != ab['off'], 'RANKING: a aba escolhida tem a cor dela (não fica igual às outras)', ab)
        P.confere(ab['euVazio'], 'RANKING: sem a sua linha (fora do ar), sem a faixa vazia embaixo', ab)
        await rt(pg, "(() => { fechaTela(); return 1; })()")

        print('\n2) a tampinha inicial e o sensor')
        t = await rt(pg, """(() => { const L = c => { const D = tpLe(c); return {p:D.p, pc:D.pc}; };
          return {ini:L(TP_PADRAO_COD), a:L(TP_TIME_COD[0]), b:L(TP_TIME_COD[1]), minha:tpMinha() === TP_PADRAO_COD, noTime:[tpNoTime(TP_PADRAO_COD, 0) === TP_TIME_COD[0], tpNoTime(TP_PADRAO_COD, 1) === TP_TIME_COD[1]],
            v80:(tpSkin(TP_PADRAO_V80COD) || {}).id === TP_PADRAO_COD, v80t:tpNoTime(TP_PADRAO_V80COD, 1) === TP_TIME_COD[1], livre:TP.livres.has(TP_PADRAO_COD) && TP.livres.has(TP_TIME_COD[0]) && TP.livres.has(TP_TIME_COD[1]),
            ofi:RachaTimes95.daCor('#21a8ff') !== TP_PADRAO_COD && tpLe(RachaTimes95.daCor('#21a8ff')).pc[1] === tpLe(RachaTimes95.daCor('#21a8ff')).pc[2]}; })()""")

        def cor(h):
            n = int(h[1:], 16)
            return n >> 16, (n >> 8) & 255, n & 255

        def branco(h):
            return min(cor(h)) > 220

        def roxo(h):
            r, g, b_ = cor(h)
            return b_ > r > g and b_ > 150

        def laranja(h):
            r, g, b_ = cor(h)
            return r > 220 and 70 < g < 140 and b_ < 60
        ini, ta, tb = t['ini'], t['a'], t['b']
        P.confere(ini['p'] == 'tc' and branco(ini['pc'][0]) and roxo(ini['pc'][1]) and laranja(ini['pc'][2]), 'a tampinha inicial: as listras em pé ROXO, BRANCO e LARANJA', ini)
        P.confere(ta['p'] == 'tc' and laranja(ta['pc'][1]) and laranja(ta['pc'][2]) and branco(ta['pc'][0]), 'no Time A: LARANJA, BRANCO e LARANJA', ta)
        P.confere(tb['p'] == 'tc' and roxo(tb['pc'][1]) and roxo(tb['pc'][2]) and branco(tb['pc'][0]), 'no Time B: ROXO, BRANCO e ROXO', tb)
        P.confere(t['minha'] and all(t['noTime']), 'quem nunca escolheu está com a inicial; na partida ela vira a do time', t)
        P.confere(t['v80'] and t['v80t'], 'a inicial antiga (metade laranja, metade roxa) que chega de um jogo antigo vira a nova', t)
        P.confere(t['livre'] and t['ofi'], 'a inicial e as do time não cobram nada; na Oficina, a cor do time do mapa dos lados', t)
        s = await rt(pg, """(() => { __T.comeca('futebol', 2, 4); const cores = [], sh = spriteHalo;
          spriteHalo = function(c, rpx, cam){ if (cam === 'p') cores.push(c); return sh.apply(this, arguments); };
          try { desenhaAros(ctx); } finally { spriteHalo = sh; }
          return {cores, quem:RQ.jog.map(q => q === P ? 'eu' : (q.time === P.time ? 'parceiro' : 'rival')), a:rqCor(P.time).base, b:rqCor(1 - P.time).base, verde:RachaTimes95.verde()}; })()""")
        ok_s = len(s['cores']) == len(s['quem']) and all((c == s['verde']) if q == 'eu' else (c == s['a']) if q == 'parceiro' else (c == s['b']) for c, q in zip(s['cores'], s['quem']))
        P.confere(ok_s and s['verde'] == '#3ee06c', 'o sensor: o SEU é verde; o do parceiro, na cor do time; o dos adversários, na cor deles', s)
        rp = await rt(pg, """(() => { const c = RachaTimes95.anel('#ff6a00', 40), g = c.getContext('2d'), w = c.width, m = w/2;
          const px = (x, y) => Array.from(g.getImageData(Math.round(x), Math.round(y), 1, 1).data);
          return {fora:px(2, 2), anel:px(m + 40*1.2, m), meio:px(m, m)}; })()""")
        P.confere(rp['fora'][3] == 0 and rp['meio'][3] == 0 and 60 < rp['anel'][3] < 255, 'o anel é limpo e translúcido (o meio vazio, o anel meio transparente)', rp)
        await pg.screenshot(path=str(SAIDA / 'v95_sensor.png'))

        print('\n3) os campos 30% maiores e as linhas da bola só na Oficina')
        c = await rt(pg, """(() => ({modos:MODOS.map(m => [m.bola, m.gol, m.jog]), marcas:MARCAS_MODO.map(m => [m.area, m.circulo, m.saida]), larg:(LX1 - LX0)/U(1), alt:(LY1 - LY0)/U(1), n:RQ.n,
          so:RachaLinhas.soOficina(), ativo:lnAtivo()}))()""")
        antes = [([56, 40], [6.6, 12.8]), ([71, 50], [6.6, 16]), ([86, 70], [7, 20.5]), ([108, 90], [7, 24.5])]
        ok_c = all(abs(m[0][0] - a[0][0] * 1.3) < .06 and abs(m[0][1] - a[0][1] * 1.3) < .06 and m[1] == list(a[1]) for m, a in zip(c['modos'], antes))
        P.confere(ok_c, 'o 1v1, o 2v2, o 3v3 e o 4v4: o campo 30% maior e o gol do tamanho de antes (a boca e a profundidade)', c['modos'])
        marcas_antes = [(13.333, 8), (16.667, 10), (20, 12.167), (25, 13.5)]
        P.confere(all(abs(m[0][0] - a[0] * 1.3) < .01 and abs(m[1] - a[1] * 1.3) < .01 for m, a in zip(c['marcas'], marcas_antes)), 'as marcas (a área e o círculo) acompanham (× 1,3)', c['marcas'])
        P.confere(c['n'] == 2 and abs(c['larg'] - 92.3) < .05 and abs(c['alt'] - 65) < .05, 'na partida 2v2: o campo da bola tem 92,3 × 65 (era 71 × 50)', c)
        P.confere(c['so'] is True and c['ativo'] is False, 'as linhas da bola não aparecem nas partidas (só na Oficina, com o RANK OFF)', c)
        al = await rt(pg, "(() => { AJF.cfg.linhaChute = 'sempre'; AJF.cfg.linhaBola = true; const a = lnAtivo(); return a; })()")
        P.confere(al is False, 'mesmo ligando as linhas nos ajustes, a partida normal fica sem elas', al)
        await rt(pg, "(() => { rqSai(); return 1; })()")

        print('\n4) os emojis da tampinha')
        e = await rt(pg, """(() => { const L = emjLista(); return {n:L.length, atlas:Object.keys(EMJ.atlas.p).length, gratis:L.filter(i => i.gratis).map(i => i.id),
          rar:L.reduce((o, i) => { const k = i.gratis ? 'gratis' : i.raridade; o[k] = (o[k] || 0) + 1; return o; }, {}),
          precos:[...new Set(L.filter(i => !i.gratis).map(i => i.raridade + ':' + (i.moedas || 0) + '/' + (i.gemas || 0)))].sort(),
          semAtlas:L.filter(i => i.id !== 'emoji_nenhum' && !EMJ.atlas.p[i.id]).map(i => i.id), pronto:EMJ.pronto, local:emjLojaLocal(), eq:emjEquipado()}; })()""")
        P.confere(e['n'] == 103 and e['atlas'] == 102 and not e['semAtlas'], '102 emojis no atlas (e o "Sem emoji"), todos com o desenho', e)
        P.confere(sorted(e['gratis']) == sorted(['emoji_nenhum', 'emoji_diabinho', 'emoji_bola_fogo', 'emoji_anjinho', 'emoji_bola8']), '4 de graça para todo mundo (e o "Sem emoji")', e['gratis'])
        P.confere(e['precos'] == ['comum:600/0', 'epico:2800/0', 'lendario:0/150', 'raro:1400/0'], 'o preço pela raridade: comum 600, raro 1.400, épico 2.800 moedas; lendário 150 gemas', e['precos'])
        P.confere(e['pronto'] and e['local'] and e['eq'] == 'emoji_nenhum', 'o atlas carregou; na demonstração a loja é a do aparelho; começa sem emoji', e)
        lj = await rt(pg, """(() => { V88S.cat = 'emojis'; abreTela('loja'); renderLoja(); const it = [...document.querySelectorAll('#lb .v88-itens .v88-item')];
          return {n:it.length, primeiro:it[0] && it[0].querySelector('.v88-item-nome').textContent, rar:it.slice(0, 8).map(x => x.dataset.r), cat:(document.querySelector('#lb .v88-cat.on') || {}).textContent,
            mini:it.slice(0, 3).every(x => !!x.querySelector('canvas'))}; })()""")
        P.confere(lj['n'] == 103 and lj['primeiro'] == 'Sem emoji' and lj['mini'] and 'EMOJIS' in (lj['cat'] or ''), 'LOJA › EMOJIS: os 103 itens, a miniatura com a sua tampinha e o emoji no meio', lj)
        await pg.screenshot(path=str(SAIDA / 'v95_loja_emojis.png'))
        m0 = await rt(pg, "CONTA.moedas")
        await rt(pg, "(() => { emjCompraLocal('emoji_mumia'); return 1; })()"); await pg.wait_for_timeout(250)
        await rt(pg, "(() => { const bt = [...document.querySelectorAll('#lb-pop button')].find(x => /COMPRAR/.test(x.textContent)); if (bt) bt.click(); return !!bt; })()")
        await pg.wait_for_timeout(250)
        cp = await rt(pg, "(() => ({m:CONTA.moedas, tem:emjTem('emoji_mumia'), loc:EMJ.loc.tem.slice(), salvo:localStorage.getItem('racha-emoji-v95')}))()")
        P.confere(cp['m'] == m0 - 600 and cp['tem'] and 'emoji_mumia' in (cp['salvo'] or ''), 'comprar a Múmia (comum): −600 moedas e ela fica sua (neste aparelho)', [m0, cp])
        await rt(pg, "(() => { try { fechaPop(); } catch (_) {} emjEquipa('emoji_mumia'); return 1; })()")
        q = await rt(pg, """(() => { const r = {meu:emjMeu()}; __T.comeca('futebol', 2, 4); r.p = emjDe(P); r.est = estDe(0, 0, P.x, P.y).emoji;
          const bots = RQ.jog.filter(q => q !== P).map(q => emjBot(q.nome)); r.bots = bots; r.botsIguais = RQ.jog.filter(q => q !== P).every(q => emjBot(q.nome) === emjBot(q.nome));
          const com = emjMiniatura(TP_PADRAO_COD, 'emoji_mumia', 104).toDataURL(), sem = emjMiniatura(TP_PADRAO_COD, '', 104).toDataURL(); r.desenha = com !== sem;
          let n = 0; for (let i = 0; i < 200; i++) if (emjBot('Bot ' + i)) n++; r.botsCom = n; return r; })()""")
        P.confere(q['meu'] == 'emoji_mumia' and q['p'] == 'emoji_mumia' and q['est'] == 'emoji_mumia', 'equipada: a Múmia vai na sua tampinha na partida', q)
        P.confere(q['botsIguais'] and 60 <= q['botsCom'] <= 140 and q['desenha'], 'os bots: metade tem um emoji (sempre o mesmo para o mesmo nome); o desenho muda com o emoji', q)
        await pg.wait_for_timeout(300)
        await pg.screenshot(path=str(SAIDA / 'v95_partida_emoji.png'))

        print('\n5) o fim da partida (os dois times, o título, o placar pendurado com os gols)')
        f = await rt(pg, """(() => { const mate = RQ.jog.find(q => q !== P && q.time === P.time); RQ.t = 42; v93GolInfo(P, mate, P.time); RQ.t = 97; v93GolInfo(mate, P, P.time);
          RQ.golsH = 1; RQ.assistH = 1; RQ.placar = [2, 0]; rqFim(); rqFechaConta(false); rqMostraFim();
          const f = fimEl('fim'), sec = [...document.querySelectorAll('.v95-fim-time')];
          return {cls:f.className, tit:(document.querySelector('.v95-fim-grande') || {}).textContent, times:sec.map(s => s.querySelectorAll('.v95-fj').length), venceu:sec.map(s => s.classList.contains('venceu')),
            gols:[...document.querySelectorAll('.v95-fim-gols li')].map(li => li.textContent), rel:(document.querySelector('.v95-relogio') || {}).textContent, voce:document.querySelectorAll('.v95-fj.eu .v95-fj-voce').length,
            emoji:RachaFim95.dados().times[P.time].jog.find(j => j.eu).emoji, c0:f.style.getPropertyValue('--c0'), c1:f.style.getPropertyValue('--c1'), cabos:!!document.querySelector('.v95-cabos'),
            meio:!!document.querySelector('.v95-meio #fim-premio')}; })()""")
        P.confere('v95-fim' in f['cls'] and f['tit'] == 'VITÓRIA DO LARANJA' and f['times'] == [2, 2] and f['venceu'] == [True, False], 'a tela do fim: os dois times (2 e 2) e VITÓRIA DO LARANJA', f)
        P.confere(len(f['gols']) == 2 and '00:42' in f['gols'][0] and '01:37' in f['gols'][1], 'o placar pendurado: os 2 gols da partida, com o minuto (e a assistência)', f['gols'])
        P.confere(re.match(r'^\d\d:\d\d$', f['rel'] or '') and f['voce'] == 1 and f['cabos'] and f['meio'], 'o relógio entre os números, o VOCÊ na sua tampinha, os cabos e o prêmio no meio do vidro', f)
        P.confere(f['emoji'] == 'emoji_mumia' and f['c0'] == '#ff6a00' and f['c1'] == '#7a3fc4', 'na fileira, a sua tampinha com o emoji; as cores dos times', f)
        await pg.wait_for_timeout(700)
        await pg.screenshot(path=str(SAIDA / 'v95_fim.png'))
        emp = await rt(pg, """(() => { fechaFim(); rqSai(); __T.comeca('futebol', 1, 4); RQ.placar = [1, 1]; rqFim(); rqFechaConta(false); rqMostraFim();
          const a = (document.querySelector('.v95-fim-grande') || {}).textContent; fechaFim(); rqSai(); __T.comeca('futebol', 1, 4); RQ.placar = [0, 3]; rqFim(); rqFechaConta(false); rqMostraFim();
          const b = (document.querySelector('.v95-fim-grande') || {}).textContent; return [a, b, document.querySelectorAll('.v95-fim-time.t0 .v95-fj').length]; })()""")
        P.confere(emp[0] == 'EMPATE' and emp[1] == 'VITÓRIA DO ROXO' and emp[2] == 1, 'o empate (EMPATE) e a vitória do Time B (VITÓRIA DO ROXO), no 1v1', emp)

        print('\n6) a economia')
        ec = await rt(pg, "RachaEconomia95.premio()")
        P.confere(ec['partida'] == 30 and ec['vitoria'] == 70 and ec['gol'] == 12 and ec['assist'] == 6 and ec['craque'] == 40 and ec['seq'] == 10 and ec['seqMax'] == 50
                  and ec['primeira'] == {'m': 150, 'g': 10} and ec['nivel'] == {'m': 150, 'g': 8} and ec['nivel5'] == 30,
                  'a tabela: partida 30, vitória 70, gol 12, assistência 6, craque 40, sequência +10 (até 50), 1ª vitória do dia 150 + 10 gemas, nível 150 + 8 gemas', ec)
        await rt(pg, "(() => { fechaFim(); rqSai(); localStorage.removeItem('racha-v95-1vit'); X49.seq = 0; return 1; })()")
        g1 = await rt(pg, """(() => { __T.comeca('futebol', 2, 4); const m0 = CONTA.moedas, g0 = CONTA.gemas; RQ.golsH = 2; RQ.assistH = 1; RQ.placar = [3, 1]; rqFim(); rqFechaConta(false); rqMostraFim();
          const box = document.getElementById('v95-premios'); return {dm:CONTA.moedas - m0, dg:CONTA.gemas - g0, det:RachaEconomia95.ultimo(), box:box ? [...box.querySelectorAll('li')].map(li => li.textContent) : null}; })()""")
        rot = [x['rot'] for x in (g1['det'] or [])]
        soma = sum(x['m'] for x in g1['det'] if x.get('cls') != 'nota')
        P.confere(rot[:4] == ['Partida', 'Vitória', '1 assistência', '1ª vitória do dia'] and g1['dm'] >= soma and g1['dg'] >= 10,
                  'a vitória com gol e assistência: partida 30 + vitória 70 + assistência 6 + 1ª vitória do dia (150 e 10 gemas)', g1)
        P.confere(g1['box'] and len(g1['box']) == len(g1['det']) and 'O QUE VOCÊ GANHOU' in await rt(pg, "document.getElementById('v95-premios').textContent"),
                  'a tela do fim mostra O QUE VOCÊ GANHOU, parte por parte', g1['box'])
        await pg.wait_for_timeout(500)
        await pg.screenshot(path=str(SAIDA / 'v95_fim_premios.png'))
        g2 = await rt(pg, """(() => { fechaFim(); rqSai(); __T.comeca('futebol', 2, 4); RQ.golsH = 0; RQ.assistH = 0; RQ.placar = [1, 0]; rqFim(); rqFechaConta(false); rqMostraFim();
          return {det:RachaEconomia95.ultimo(), seq:X49.seq}; })()""")
        r2 = [x['rot'] for x in g2['det']]
        P.confere('1ª vitória do dia' not in r2 and any(re.match(r'^\d+ vitórias seguidas$', x) for x in r2), 'a 2ª vitória seguida: sem a 1ª do dia (já foi) e com o bônus da sequência', g2)
        await rt(pg, "(() => { fechaFim(); rqSai(); return 1; })()")
        cg = await rt(pg, """(() => { V88S.cat = 'destaques'; abreTela('loja'); renderLoja(); const ul = document.querySelector('.v70-lj-ganhos');
          return ul ? {v95:ul.dataset.v95, txt:ul.textContent} : null; })()""")
        P.confere(cg is None or (cg['v95'] == '1' and 'Craque da partida' in cg['txt'] and '1ª vitória do dia' in cg['txt']), 'LOJA › COMO GANHAR: a tabela nova (o craque, a sequência, a 1ª vitória do dia)', cg)
        await rt(pg, "(() => { fechaTela(); return 1; })()")

        print('\n7) a ranqueada ao vivo')
        await rt(pg, "(() => { abrirLobby(); abreJogar('ranked'); return 1; })()"); await pg.wait_for_timeout(400)
        r0 = await rt(pg, """(() => { const v = document.querySelector('.v95-vivo'); return {aba:JG.aba, vivo:!!v, off:v && v.classList.contains('off'), txt:v && v.textContent}; })()""")
        P.confere(r0['aba'] == 'ranked' and r0['vivo'] and r0['off'] and 'bots' in (r0['txt'] or ''), 'o JOGAR da ranqueada: sem o servidor online, a faixa diz que é contra os bots', r0)
        r1 = await rt(pg, """(() => { net49Message({type:'fila_info', online:57, jogando:20, salas:6, busca:[3, 5, 0, 1]});
          const v = document.querySelector('.v95-vivo'), ts = [...RQP.times.children].map(b => ({n:+b.dataset.n, tx:(b.querySelector('.v95-tn') || {}).textContent, q:b.classList.contains('v95-quente')}));
          return {off:v.classList.contains('off'), nums:[...v.querySelectorAll('.v95-vivo-n')].map(x => x.textContent), ts, espera:RQP.buscar.dataset.espera || '', n:RQP.n, info:RachaRanqueada95.info()}; })()""")
        P.confere(not r1['off'] and r1['nums'] == ['57ONLINE', '20JOGANDO', '9PROCURANDO'], 'AO VIVO: 57 online, 20 jogando e 9 procurando (a soma dos tamanhos)', r1['nums'])
        t2 = next((x for x in r1['ts'] if x['n'] == 2), None)
        t3 = next((x for x in r1['ts'] if x['n'] == 3), None)
        P.confere(t2 and t2['tx'] == '5 PROCURAM' and t2['q'] and t3 and t3['tx'] == 'NINGUÉM' and not t3['q'], 'em cada tamanho: quantos procuram agora (o mais cheio fica em destaque)', r1['ts'])
        P.confere(r1['espera'].startswith('ESPERA: '), 'o JOGAR RANQUEADA diz quanto deve demorar', r1['espera'])
        await pg.screenshot(path=str(SAIDA / 'v95_ranqueada.png'))
        ac = await rt(pg, """(() => { RachaRanqueada95.encontrada({n:2, members:[{id:'x1', name:'Zé', skin:'', rq:820}, {id:'x2', name:'Lia', skin:'', rq:400}], roster:['x1', null, 'x2', null]});
          const el = document.getElementById('v95-achou'); return {vis:!el.hidden, tit:el.querySelector('h2').textContent, times:[...el.querySelectorAll('.v95-achou-time')].map(c => c.querySelectorAll('.v95-achou-j').length),
            nomes:[...el.querySelectorAll('.v95-achou-j b')].map(b => b.textContent)}; })()""")
        P.confere(ac['vis'] and ac['tit'] == 'PARTIDA ENCONTRADA!' and ac['times'] == [2, 2] and 'Zé' in ac['nomes'] and 'Lia' in ac['nomes'], 'PARTIDA ENCONTRADA: os dois times por cima do começo (as vagas sem gente com bots)', ac)
        await pg.wait_for_timeout(2900)
        P.confere(await rt(pg, "document.getElementById('v95-achou').hidden"), 'e some sozinha (sem segurar o começo)')
        await rt(pg, "(() => { try { fechaJogar(); } catch (_) {} try { RQP.raiz.hidden = true; } catch (_) {} return 1; })()")

        print('\n8) o chat mais fácil e o perfil de orgulho')
        await rt(pg, "(() => { abreTela('chat'); return 1; })()"); await pg.wait_for_timeout(500)
        ch = await rt(pg, """(() => { const inp = document.getElementById('br-in'), f = document.getElementById('br-form'), ok = document.getElementById('br-ok'); inp.disabled = false; inp.value = '';
          inp.dispatchEvent(new Event('input', {bubbles:true}));
          const bt = f.querySelector('.v95-emo-bt'), bd = f.querySelector('.v95-emo'), r = {bt:!!bt, emojis:bd.querySelectorAll('.v95-emo-e').length, frases:bd.querySelectorAll('.v95-emo-fr').length, apagado:ok.classList.contains('v95-apagado')};
          bt.click(); r.abriu = !bd.hidden;
          inp.value = 'gol'; inp.setSelectionRange(3, 3); bd.querySelectorAll('.v95-emo-e')[6].click(); r.v1 = inp.value; r.n1 = f.querySelector('.v95-chat-n').textContent; r.aceso = !ok.classList.contains('v95-apagado');
          bd.querySelectorAll('.v95-emo-fr')[0].click(); r.v2 = inp.value; r.fechou = bd.hidden;
          r.abas = [...document.querySelectorAll('.v95-ch-abas .v95-ch-aba')].map(b => b.textContent); return r; })()""")
        P.confere(ch['bt'] and ch['emojis'] == 32 and ch['frases'] == 10 and ch['apagado'], 'o 😀 ao lado do campo: 32 emojis e 10 frases prontas; o ENVIAR apagado sem texto', ch)
        P.confere(ch['abriu'] and ch['v1'] == 'gol⚽' and ch['n1'] == '4/120' and ch['aceso'], 'um toque no emoji põe no texto (no cursor); o contador e o ENVIAR aceso', ch)
        P.confere(ch['v2'] == 'Bora jogar!' and ch['fechou'], 'a frase pronta escreve a mensagem (o ENVIAR manda) e a bandeja fecha', ch)
        P.confere(ch['abas'][:1] == ['MUNDO'], 'as abas das conversas começam pelo MUNDO', ch['abas'])
        await pg.screenshot(path=str(SAIDA / 'v95_chat.png'))
        await rt(pg, "(() => { fechaTela(); perfil.st = Object.assign(perfil.st || {}, {partidas:0, concluidas:0, vitorias:0, gols:0, assist:0, craque:0}); abreTela('perfil'); return 1; })()"); await pg.wait_for_timeout(600)
        pf = await rt(pg, """(() => { const c = document.querySelector('.v95-pf-card'), box = document.getElementById('pf-palcobox'), rc = c.getBoundingClientRect(), rb = box.getBoundingClientRect();
          return {ovr:+c.querySelector('.v95-pf-ovr').textContent, tipo:c.className, meds:document.querySelectorAll('.v95-pf-vit .v95-pf-med').length, esq:(rc.left - rb.left)/rb.width,
            rots:[...document.querySelectorAll('.v95-pf-med small')].map(s => s.textContent)}; })()""")
        P.confere(40 <= pf['ovr'] <= 99 and 't-bronze' in pf['tipo'] and pf['meds'] == 4 and pf['esq'] < .2, 'o cartão do craque (a nota, a patente) no canto de cima à esquerda e a vitrine com 4 placas', pf)
        P.confere(pf['rots'][:3] == ['CRAQUE DA PARTIDA', 'MELHOR SEQUÊNCIA', 'MAIOR PATENTE'], 'a vitrine: craque da partida, melhor sequência, maior patente e a forma', pf['rots'])
        await pg.screenshot(path=str(SAIDA / 'v95_perfil.png'))
        ov = await rt(pg, """(() => { const a = RachaPerfil95.ovr().n; perfil.st = Object.assign(perfil.st, {partidas:40, concluidas:40, vitorias:32, gols:60, assist:25, craque:14}); const b = RachaPerfil95.ovr();
          renderPerfil(); return {a, b:b.n, tipo:b.tipo, card:document.querySelector('.v95-pf-card').className}; })()""")
        P.confere(ov['b'] > ov['a'] and ov['tipo'] in ('prata', 'ouro', 'lenda') and ('t-' + ov['tipo']) in ov['card'], 'quem joga bem sobe a nota e o cartão muda (prata, ouro, lenda)', ov)
        await rt(pg, "(() => { fechaTela(); return 1; })()")

        print('\n9) as patentes novas')
        pt = await rt(pg, """(() => PATENTES.map((p, i) => { const s0 = rqInsignia({elo:p, k:0}), s2 = rqInsignia({elo:p, k:2});
          return {id:p.id, cls:/v95-pat/.test(s0) && s0.includes('pat-' + p.id), div:s0.includes('>' + PAT_DIV[0] + '<') && s2.includes('>' + PAT_DIV[2] + '<'), asas0:s0.includes('ins-asas'), asas2:s2.includes('ins-asas'),
            coroa:s0.includes('ins-coroa'), louros:s0.includes('ins-louros'), grande:s0.includes('ins-coroa-grande'), forma:V95_PAT_FORMA[p.id]}; }))()""")
        P.confere(len(pt) == 8 and all(x['cls'] and x['div'] for x in pt), 'as 8 patentes com o desenho novo e a divisão na fita (III … I)', [x['id'] for x in pt])
        P.confere(len({x['forma'] for x in pt}) == 8, 'cada patente tem a SUA forma (não só a cor)')
        P.confere(all(not x['asas0'] and x['asas2'] for x in pt), 'a divisão: III sem asas; I com as asas', [(x['id'], x['asas0'], x['asas2']) for x in pt])
        P.confere([x['coroa'] for x in pt] == [False] * 5 + [True] * 3 and [x['louros'] for x in pt] == [False] * 7 + [True] and pt[7]['grande'], 'da Élite para cima a coroa; o Lendário com os louros e a coroa grande', [(x['id'], x['coroa'], x['louros']) for x in pt])
        await rt(pg, """(() => { const d = document.createElement('div'); d.id = 'v95-pats'; d.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#151a35;display:grid;grid-template-columns:repeat(8,1fr);gap:8px;padding:30px';
          for (let k = 0; k < 3; k++) for (const p of PATENTES){ const c = document.createElement('div'); c.innerHTML = rqInsignia({elo:p, k}); c.firstChild.style.width = '140px'; d.appendChild(c); }
          document.body.appendChild(d); return 1; })()""")
        await pg.wait_for_timeout(200)
        await pg.screenshot(path=str(SAIDA / 'v95_patentes.png'))
        await rt(pg, "(() => { document.getElementById('v95-pats').remove(); return 1; })()")

        print('\n10) o placar minimalista, o painel dos jogadores (a foto cheia e o clube embaixo do nome) e o sensor branco')
        await rt(pg, "(() => { try { CLB_LOCAL.clubes = [{id:'L95', nome:'Grota MMB', escudo:'', pais:'BR'}]; CLB_LOCAL.meu = 'L95'; } catch (_) {} return 1; })()")
        PLACAR = """(n => { __T.comeca('futebol', n, 4); RQ.estado = 'jogo'; RQ.t = 41; RQ.aviso.t = 0; V95H.clubeT = -1e9;
          const ditos = [], t0 = txt; txt = function(g, s, x, y, size){ ditos.push({s:String(s), x:Math.round(x), y:Math.round(y), size}); return t0.apply(this, arguments); };
          try { rqPlacar(ctx); } finally { txt = t0; }
          return {textos:ditos.map(d => d.s), num:ditos.filter(d => /^[0-9]+$/.test(d.s)).map(d => [d.x - W/2, d.y]), larg:v80PlacarW(), rot:v93RotuloPlacar().w,
            clube:[RachaHud95.clube(0), RachaHud95.clube(1)], placar:RachaHud95.placar()}; })"""
        p2 = await rt(pg, PLACAR + "(2)")
        P.confere(sorted(p2['textos']) == ['0', '0', '02:19'] and p2['rot'] == 0 and p2['larg'] == 304 and sorted(x for x, y in p2['num']) == [-115, 115],
                  'o placar minimalista: só os dois números (um de cada lado) e o relógio no meio — sem TIME A/TIME B nem o rótulo do modo do lado', p2)
        px = await rt(pg, """(() => { const k = K, hk = HUDX.k, p = (x, y) => Array.from(ctx.getImageData(Math.round((W/2 + (x - W/2)*hk)*k), Math.round(y*k*hk), 1, 1).data);
          const pontos = {topo:[W/2 - 60, 1], abaA:[W/2 - 140, 30], abaB:[W/2 + 140, 30], fora:[W/2 - 330, 30]}, com = {}, sem = {};
          render(0); for (const n in pontos) com[n] = p(...pontos[n]);
          const r0 = rqPlacar; rqPlacar = function(){}; try { render(0); } finally { rqPlacar = r0; }      // (o mesmo quadro sem o placar)
          for (const n in pontos) sem[n] = p(...pontos[n]);
          return {com, sem}; })()""")
        lum = lambda c: sum(c[:3])
        esc = {n: round(lum(px['com'][n]) / max(1, lum(px['sem'][n])), 2) for n in px['com']}
        P.confere(.25 < esc['topo'] < .6 and .45 < esc['abaA'] < .8 and .45 < esc['abaB'] < .8 and esc['abaA'] > esc['topo'] and .97 < esc['fora'] < 1.03,
                  'as três abas de vidro escuro penduradas na borda de cima: o relógio mais escuro, os números mais claros, translúcidas (o campo aparece por baixo); fora delas o campo fica igual', [esc, px])
        p1 = await rt(pg, PLACAR + "(1)")
        P.confere(p1['clube'][0] and p1['clube'][0]['nome'] == 'Grota MMB' and p1['clube'][1] is None and 'GROTA MMB' in p1['textos'] and p1['larg'] > 304,
                  'o time todo do mesmo clube (você sozinho no seu time, com o seu clube): o nome do clube e o escudo do lado do placar (os botões se afastam)', p1)
        P.confere(p2['clube'] == [None, None], 'com um bot no time (2v2 contra os bots), nada do lado do placar', p2['clube'])
        on = await rt(pg, """(() => { const N = {playing:NET49.playing, room:NET49.room, id:NET49.id}; const r = {};
          try {
            NET49.playing = true; NET49.id = 'a';
            const mem = [{id:'a', name:'Ana', club:{name:'Punisher FC', tag:'PNS', escudo:''}, slot:0}, {id:'b', name:'Beto', club:{name:'punisher fc'}, slot:1},
                         {id:'c', name:'Caio', club:{name:'Queimados FC', tag:'QFC'}, slot:2}, {id:'d', name:'Davi', club:{name:'Queimados FC'}, slot:3}];
            NET49.room = {n:2, round:1, roster:['a', 'b', 'c', 'd'], members:mem};
            r.dois = [v95ClubeCalc(0), v95ClubeCalc(1)].map(c => c && c.tag);
            mem[3].club = {name:'Outro Clube'}; r.misto = v95ClubeCalc(1);
            mem[3].club = null; r.semClube = v95ClubeCalc(1);
            NET49.room.roster = ['a', null, 'c', 'd']; r.bot = v95ClubeCalc(0);
          } finally { NET49.playing = N.playing; NET49.room = N.room; NET49.id = N.id; V95H.clubeT = -1e9; }
          return r; })()""")
        P.confere(on['dois'] == ['PNS', 'QFC'] and on['misto'] is None and on['semClube'] is None and on['bot'] is None,
                  'online: cada lado mostra o clube quando TODAS as vagas do time são do mesmo clube (de outro clube, sem clube ou um bot na vaga: nada)', on)
        pn = await rt(pg, """(() => { __T.comeca('futebol', 2, 4); RQ.aviso.t = 0; V93P.aberto = true; V95H.assin = ''; v93PainelPinta();
          const p = V93P.el.p, L = [...p.querySelectorAll('.v93-pj-l')];
          const cheia = c => { const g = c.getContext('2d'), w = c.width, m = w/2, d = g.getImageData(0, 0, w, w).data; let n = 0, fundo = 0;
            for (let y = 0; y < w; y++) for (let x = 0; x < w; x++){ if (Math.hypot(x + .5 - m, y + .5 - m) > m*.94) continue; n++; const i = (y*w + x)*4; if (d[i + 3] < 250 || (Math.abs(d[i] - 20) < 8 && Math.abs(d[i + 1] - 24) < 8 && Math.abs(d[i + 2] - 38) < 8)) fundo++; }
            return fundo/n; };
          return {vis:!p.hidden, n:L.length, linhas:L.map(li => { const c = li.querySelector('canvas.v95-pj-av'), r = c.getBoundingClientRect();
            return {nome:li.querySelector('.v95-pj-nm b').textContent, clube:li.querySelector('.v95-pj-cl').textContent, css:Math.round(r.width), vazio:+cheia(c).toFixed(3), fl:!!li.querySelector('.v95-pj-fl'), eu:li.classList.contains('eu')}; }),
            vs:p.querySelector('.v95-pj-vs').textContent, pe:getComputedStyle(p).pointerEvents}; })()""")
        eu = [x for x in pn['linhas'] if x['eu']]
        P.confere(pn['vis'] and pn['n'] == 4 and all(x['css'] >= 40 and x['vazio'] < .02 for x in pn['linhas']),
                  'o painel dos jogadores: a FOTO DE PERFIL cheia no círculo (44 px; o meio da tampinha com o emoji preenche tudo, sem fundo aparecendo)', pn['linhas'])
        P.confere(eu and eu[0]['clube'] == 'Grota MMB' and eu[0]['fl'] and all(x['clube'] == 'BOT' for x in pn['linhas'] if not x['eu']) and pn['pe'] == 'none',
                  'o CLUBE EMBAIXO DO NOME (o seu: Grota MMB, com a bandeira; os bots: BOT); o painel não pega o toque', pn)
        await pg.wait_for_timeout(300)
        await pg.screenshot(path=str(SAIDA / 'v95_painel.png'))
        await rt(pg, "(() => { V93P.aberto = false; v93PainelPinta(); return 1; })()")
        sn = await rt(pg, """(() => { __T.comeca('futebol', 2, 4); const r = {}, bot = __T.time(1)[0], ap = q => +RachaTimes95.aperto(q, 0).toFixed(3);
          keys.KeyK = true; r.chute = ap(P); keys.KeyK = false; keys.KeyJ = true; r.passe = ap(P); keys.KeyJ = false; r.soltou = ap(P);
          const imgs = []; const C = CanvasRenderingContext2D.prototype, di = C.drawImage;
          C.drawImage = function(img){ if (this === ctx && img && img.width) imgs.push(this.globalAlpha); return di.apply(this, arguments); };
          try { P.v95B = -1e9; desenhaAros(ctx); r.semAperto = imgs.length; imgs.length = 0; keys.KeyK = true; desenhaAros(ctx); r.comAperto = imgs.length; } finally { C.drawImage = di; keys.KeyK = false; }
          bot.v95Bt = 3; bot.v95BtT = performance.now(); r.outro = ap(bot); bot.v95Bt = 1;
          const b2 = __T.time(0).find(q => q !== P); b2.v95B = -1e9; r.chuteBot = +RachaTimes95.aperto(b2, 1).toFixed(3);
          const c = RachaTimes95.branco(40), g = c.getContext('2d'), m = c.width/2, pxl = (x, y) => Array.from(g.getImageData(Math.round(x), Math.round(y), 1, 1).data);
          r.anel = pxl(m + 40*1.16, m); r.meio = pxl(m, m);
          BOTAO.kickL = true; P.v95B = -1e9; amostraBotoes(STEP); r.toque = ap(P); amostraBotoes(STEP);   // (o passo seguinte: o botão já solto)
          window.__b2 = b2; return r; })()""")
        await pg.wait_for_timeout(320)
        sn2 = await rt(pg, "({soltou:+RachaTimes95.aperto(P, 0).toFixed(3), bot:+RachaTimes95.aperto(window.__b2, 0).toFixed(3), regra:RachaTimes95.regra()})")
        P.confere(sn['chute'] == 1 and abs(sn['passe'] - .86) < .01 and sn['soltou'] > .8 and sn2['soltou'] == 0,
                  'o sensor apertado: o BRANCO FORTE na hora (CHUTE 100%, PASSE 86%); segurando, fica; soltou, some em ~0,22 s', [sn, sn2])
        P.confere(sn['toque'] > .5, 'o toque rápido (apertou e soltou entre dois quadros) também acende', sn['toque'])
        P.confere(sn['comAperto'] == sn['semAperto'] + 1 and min(sn['anel'][:3]) > 235 and sn['anel'][3] > 180 and sn['meio'][3] == 0,
                  'no quadro: o anel branco por cima do anel do time (o meio vazio), só com o botão apertado', sn)
        P.confere(sn['outro'] == 1 and sn['chuteBot'] > .9 and sn2['bot'] == 0, 'os outros: online, o botão de cada um no quadro do servidor; os bots acendem no chute e apagam rápido', [sn, sn2])
        of = await rt(pg, "(() => ({segura:v95ApertoOfi({btn:3}, false), chute:+v95ApertoOfi({btn:1, chuteT:9, v95Ct:8}, false).toFixed(2), solto:v95ApertoOfi({btn:1}, false)}))()")
        P.confere(of['segura'] == 1 and of['chute'] > .9 and of['solto'] == 0 and 'v95ApertoOfi(q, eu)' in html, 'na Oficina, o mesmo branco (pelo botão que vem no quadro e pelo chute)', of)
        await rt(pg, "(() => { keys.KeyK = true; return 1; })()"); await pg.wait_for_timeout(250)
        await pg.screenshot(path=str(SAIDA / 'v95_sensor_branco.png'))
        await rt(pg, "(() => { keys.KeyK = false; rqSai(); return 1; })()")

        P.confere(not [x for x in erros if 'Failed to load' not in x], 'nenhum erro de JavaScript', erros[:5])
        await b.close()

        # o celular deitado: a tela inicial e o fim cabem
        b, pg, erros = await abre(pw, 844, 390, config={'modo': 'demo'})
        await pg.wait_for_timeout(600)
        cel = await rt(pg, """(() => { const vis = e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.left >= -1 && r.right <= innerWidth + 1 && r.top >= -1 && r.bottom <= innerHeight + 1; };
          if (LB.raiz.classList.contains('v102')){   // (v102: os botões dos lados e a OFICINA foram para a barra de atalhos e o MENU)
            const at = [...document.querySelectorAll('#lb .v102-doca-bt, #lb .v102-menu-bt')];
            return {tiles:at.length === 5 && at.every(vis), jogar:vis(document.getElementById('lb-jogar')), of:at.some(e => /OFICINA/.test(e.textContent) && vis(e))}; }
          return {tiles:[...document.querySelectorAll('#rx .rx-bt.v71-tile')].every(vis), jogar:vis(document.getElementById('lb-jogar')), of:vis(document.querySelector('.ofi-lobby'))}; })()""")
        P.confere(cel['tiles'] and cel['jogar'] and cel['of'], '844×390: os botões da tela inicial, o JOGAR e a OFICINA cabem na tela', cel)
        await pg.screenshot(path=str(SAIDA / 'v95_lobby_844.png'))
        fim = await rt(pg, """(() => { __T.comeca('futebol', 3, 4); RQ.placar = [2, 1]; rqFim(); rqFechaConta(false); rqMostraFim();
          const vis = e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.left >= -1 && r.right <= innerWidth + 1 && r.top >= -1 && r.bottom <= innerHeight + 1; };
          return {cards:[...document.querySelectorAll('.v95-fj')].length, cabem:[...document.querySelectorAll('.v95-fj')].every(vis), bts:[...document.querySelectorAll('#fim .fim-acoes button')].filter(x => x.offsetWidth).every(vis)}; })()""")
        await pg.wait_for_timeout(700)
        P.confere(fim['cards'] == 6 and fim['cabem'] and fim['bts'], '844×390: o fim do 3v3 (6 tampinhas) e os botões cabem', fim)
        await pg.screenshot(path=str(SAIDA / 'v95_fim_844.png'))
        await rt(pg, "(() => { try { fechaFim(); } catch (_) {} try { CLB_LOCAL.clubes = [{id:'L95', nome:'Associação Atlética Vila Esperança', escudo:'', pais:'BR'}]; CLB_LOCAL.meu = 'L95'; } catch (_) {} return 1; })()")
        cp = await rt(pg, """(() => { __T.comeca('futebol', 4, 4); RQ.aviso.t = 0; V93P.aberto = true; V95H.assin = ''; v93PainelPinta(); v93PainelLugar();
          const c = cv.getBoundingClientRect(), k = c.width/W, p = V93P.el.p.getBoundingClientRect(), sob = [];
          for (const id of HE_ORDEM){ if (!controleVisivel(id)) continue; const e = el(id), cx = c.left + e.x*k, cy = c.top + e.y*k, r = e.r*k;
            const nx = Math.max(p.left, Math.min(cx, p.right)), ny = Math.max(p.top, Math.min(cy, p.bottom)); if (Math.hypot(nx - cx, ny - cy) < r) sob.push(id); }
          const av = V93P.el.p.querySelector('canvas.v95-pj-av').getBoundingClientRect();
          return {sob, n:V93P.el.p.querySelectorAll('.v93-pj-l').length, av:Math.round(av.width), p:[Math.round(p.left), Math.round(p.top), Math.round(p.width), Math.round(p.height)], dentro:p.bottom <= innerHeight && p.left >= 0 && p.right <= innerWidth}; })()""")
        await pg.wait_for_timeout(300)
        await pg.screenshot(path=str(SAIDA / 'v95_painel_844.png'))
        P.confere(cp['n'] == 8 and not cp['sob'] and cp['av'] >= 28 and cp['dentro'], '844×390: o painel do 4v4 (8 jogadores, a foto de %d px) cabe entre os controles, sem cobrir nenhum' % cp['av'], cp)
        await rt(pg, "(() => { V93P.aberto = false; v93PainelPinta(); return 1; })()")
        lg = await rt(pg, """(() => { __T.comeca('futebol', 1, 4); RQ.aviso.t = 0; V95H.clubeT = -1e9; const ditos = [], t0 = txt;
          txt = function(g, s){ ditos.push(String(s)); return t0.apply(this, arguments); }; try { rqPlacar(ctx); } finally { txt = t0; }
          v93PainelLugar(); const c = cv.getBoundingClientRect(), k = c.width/W, b = V93P.el.bt.getBoundingClientRect(), pa = {l:c.left + BTN_PAUSA.x*k, r:c.left + (BTN_PAUSA.x + BTN_PAUSA.w)*k, t:c.top + BTN_PAUSA.y*k, b:c.top + (BTN_PAUSA.y + BTN_PAUSA.h)*k};
          return {ditos, bate:!(b.right <= pa.l || pa.r <= b.left || b.bottom <= pa.t || pa.b <= b.top), meia:v80PlacarW()/2}; })()""")
        await pg.wait_for_timeout(250)
        await pg.screenshot(path=str(SAIDA / 'v95_placar_clube_844.png'))
        P.confere('AAVE' in lg['ditos'] and not lg['bate'], '844×390: o nome comprido do clube que não cabe do lado do placar vira a sigla (AAVE); o botão do lado não encosta na pausa', lg)
        P.confere(not [x for x in erros if 'Failed to load' not in x], '844×390: nenhum erro de JavaScript', erros[:5])
        await b.close()

    print('\n11) depois do teste: a Oficina (o menu não pula, o deslize da tampinha, a tampinha grande que chuta e as linhas do mapa)')
    async with async_playwright() as pw:
        b, pg, erros = await abre(pw, 1280, 720, config={'modo': 'demo'}, toque=False)
        await pg.wait_for_timeout(500)
        await pg.evaluate("() => OFI.abre('hub')"); await pg.wait_for_timeout(300)
        await pg.evaluate("""async () => { const I = OFI.interno; const M = I.limpaModelo(I.mapaDoZero('pequeno', 'retangulo', 90, 60), 'teste v95');
          const reg = await I.novoRascunho(M); await I.editorAbre(reg); await new Promise(r => setTimeout(r, 150)); I.edAjusta();
          I.OFE.painelAberto = true; I.OFE.sel.clear(); I.OFE.aba = 'fisica'; I.edEstado(); I.painelAtualiza(); return 1; }""")
        await pg.wait_for_timeout(300)
        CORPO = "document.querySelector('.ofi-ed-painel .ofi-p-corpo')"
        tam = pg.locator('.ofi-ed-painel .ofi-p-corpo input.ofi-num[aria-label="Tamanho (raio)"]').last
        await tam.scroll_into_view_if_needed()
        antes = await pg.evaluate("() => %s.scrollTop" % CORPO)
        await tam.click(); await tam.fill('3.2'); await tam.press('Enter'); await pg.wait_for_timeout(200)
        r = await pg.evaluate("""() => { const I = OFI.interno, c = %s, a = document.activeElement;
          return {rol:c.scrollTop, rj:I.OFE.M.fisica.perfil.rJog, foco:a && a.getAttribute('aria-label'), dentro:c.contains(a), nota:(c.querySelector('.ofi-nota-alcance') || {}).textContent || ''}; }""" % CORPO)
        P.confere(antes > 300 and abs(r['rol'] - antes) <= 1 and r['rj'] == 3.2 and r['foco'] == 'Tamanho (raio)' and r['dentro'],
                  'o tamanho do jogador muda (3,2 u) e o menu NÃO volta lá para cima (a rolagem fica em %d px) — e o campo continua com o foco' % r['rol'], [antes, r])
        P.confere('Valendo 3,7 u' in r['nota'], 'o alcance do chute avisa o que vale com a tampinha grande: "%s"' % r['nota'], r['nota'])
        await tam.click(); await tam.fill('2.8')
        alc = pg.locator('.ofi-ed-painel .ofi-p-corpo input.ofi-num[aria-label="Alcance do chute"]')
        await alc.click(); await pg.wait_for_timeout(200)
        r = await pg.evaluate("() => { const I = OFI.interno, c = %s, a = document.activeElement; return {rj:I.OFE.M.fisica.perfil.rJog, foco:a && a.getAttribute('aria-label'), dentro:c.contains(a)}; }" % CORPO)
        P.confere(r['rj'] == 2.8 and r['foco'] == 'Alcance do chute' and r['dentro'], 'digitou um número e tocou no campo de baixo: o número vale e o campo tocado fica com o foco (o toque não se perde)', r)
        await tam.click(); await tam.fill('2.6')
        bt = pg.locator('.ofi-ed-painel .ofi-p-corpo button.ofi-chave[aria-label="Bate nas paredes do mapa"]')
        await bt.scroll_into_view_if_needed(); await bt.click(); await pg.wait_for_timeout(200)
        r = await pg.evaluate("() => { const I = OFI.interno; return {rj:I.OFE.M.fisica.perfil.rJog, col:I.OFE.M.fisica.colideParedes}; }")
        P.confere(r['rj'] == 2.6 and r['col'] is False, '   e o botão tocado depois de digitar funciona (o número vale e a chave muda)', r)
        sl = pg.locator('.ofi-ed-painel .ofi-p-corpo input.ofi-range[aria-label="Deslize ao soltar o analógico"]')
        await sl.scroll_into_view_if_needed()
        rol = await pg.evaluate("() => %s.scrollTop" % CORPO)
        bb = await sl.bounding_box()
        await pg.mouse.move(bb['x'] + 4, bb['y'] + bb['height'] / 2); await pg.mouse.down()
        await pg.mouse.move(bb['x'] + bb['width'] * .5, bb['y'] + bb['height'] / 2, steps=6); await pg.mouse.up(); await pg.wait_for_timeout(200)
        r = await pg.evaluate("""() => { const I = OFI.interno, c = %s, f = I.OFE.M.fisica.extra.freioJog;
          return {rol:c.scrollTop, f, pct:I.deslizeJogDe(f), nota:(c.querySelector('.ofi-nota-deslize') || {}).textContent || '', z:I.deslizeJogDe(1), cem:I.freioDoDeslizeJog(100)}; }""" % CORPO)
        await pg.screenshot(path=str(SAIDA / 'v95_oficina_fisica.png'))
        P.confere(abs(r['rol'] - rol) <= 1 and 40 <= r['pct'] <= 60 and 'a tampinha ainda anda ~' in r['nota'] and r['z'] == 0 and r['cem'] == 0.03,
                  'o DESLIZE da tampinha (0%% = para na hora, 100%% = o máximo): arrastado até %.0f%% — "%s"; a rolagem fica' % (r['pct'], r['nota']), r)
        r = await rt(pg, """(() => { const N = RachaNucleo, Mp = RachaMapa;
          const of = N.resolve(N.PERFIL_V92), g = N.resolve(Object.assign({}, N.PERFIL_V92, {rJog:3.2, raioChute:2.5}));
          const m = JSON.parse(JSON.stringify(OFI.interno.OFE.M)); m.fisica = {preset:'personalizado', perfil:{rJog:3.2, raioChute:2.5}, extra:{}, colideParedes:true};
          const L = Mp.limpa(m), P = Mp.novaPartida(L.mapa, {jogadores:[{netId:'a', nome:'A'}, {netId:'b', nome:'B'}]}), q = P.jog[0], B = P.B, C = P.C;
          P.estado = 'jogo'; B.x = q.x + C.R_JOG + C.R_BOLA + 0.5; B.y = q.y; B.vx = B.vy = 0;
          return {of:of.RAIO_CHUTE / N.U(1), anel:g.RAIO_CHUTE / N.U(1), chutou:P.chuta(q, C.FORCA_POWER), v:Math.round(Math.hypot(B.vx, B.vy))}; })()""")
        P.confere(r['of'] == 2.5 and abs(r['anel'] - 3.7) < 1e-9 and r['chutou'] and r['v'] > 100, 'a tampinha grande (3,2 u, o anel de 2,5 u) chuta no motor do jogo: o anel vale %.1f u (o oficial continua 2,5 u)' % r['anel'], r)
        # as LINHAS do mapa: o criador liga em PARTIDA e vale para todos (no TESTAR, sem o RANK OFF)
        await pg.evaluate("() => { const I = OFI.interno; I.OFE.aba = 'partida'; I.painelAtualiza(); return 1; }")
        ch = pg.locator('.ofi-ed-painel .ofi-p-corpo button.ofi-chave[aria-label="Linhas da bola para todos"]')
        await ch.scroll_into_view_if_needed(); await ch.click(); await pg.wait_for_timeout(200)
        r = await pg.evaluate("""() => { const I = OFI.interno, c = %s; const l = RachaMapa.limpa(I.OFE.M);
          return {linhas:I.OFE.M.partida.linhas, limpo:l.mapa.partida.linhas, nota:[...c.querySelectorAll('.ofi-p-nota')].map(n => n.textContent).find(t => /linhas da bola|pontilhado/.test(t)) || ''}; }""" % CORPO)
        P.confere(r['linhas'] is True and r['limpo'] is True and 'para todo mundo' in r['nota'], 'Partida › "Linhas da bola para todos": o mapa guarda (%s)' % r['nota'][:60], r)
        await pg.evaluate("() => { try { localStorage.setItem('racha-ofi-rankoff', '0'); localStorage.setItem('racha-ofi-contagem', '0'); } catch (_) {} OFI.interno.OFJ.rankOffTeste = false; OFI.interno.OFJ.semContagem = true; return 1; }")
        await pg.evaluate("() => document.querySelector('.ofi-ed-testar').click()")
        await pg.wait_for_function("() => OFI.interno.OFJ.on && OFI.interno.OFJ.P && OFI.interno.OFJ.P.tick > 5", timeout=5000)
        r = await rt(pg, """(() => { const J = OFI.interno.OFJ, P = J.P, q = P.jog[J.eu], C = P.C, g = document.createElement('canvas').getContext('2d');
          AJF.cfg.linhaChute = 'sempre'; AJF.cfg.linhaBola = true;
          J.linhas = null; J.fimRes = null; J.menu = null; P.estado = 'jogo'; q.fora = false; q.x = (P.G.GL + P.G.GR) / 2 - 300; q.y = (P.G.GT + P.G.GB) / 2; q.vx = q.vy = 0;
          P.B.x = q.x + q.r + C.R_BOLA + 2; P.B.y = q.y + 6; P.B.vx = P.B.vy = 0; J.ultInp = {mx: 0, my: 0};
          OFI.interno.ofjLinhas(g, P); const com = !!(J.linhas && J.linhas.mira);
          J.abrePausa(); const bts = [...J.menu.querySelectorAll('button')], it = bts.find(b => /LINHAS DA BOLA/.test(b.textContent));
          const r = {rankOff:J.rankOffTeste, doMapa:OFI.interno.ofjLinhasDoMapa(), com, item:it ? it.textContent : null, off:it ? it.disabled : null, rankItem:bts.some(b => /^RANK OFF/.test(b.textContent))};
          J.fechaMenu(); J.M.partida.linhas = false; J.linhas = null; OFI.interno.ofjLinhas(g, P); r.semMapa = !!J.linhas; J.M.partida.linhas = true;
          return r; })()""")
        P.confere(r['doMapa'] and not r['rankOff'] and r['com'] and not r['semMapa'], 'no TESTAR, com o mapa ligado, as linhas aparecem sem o RANK OFF (e sem o do mapa, não)', r)
        P.confere(r['item'] == 'LINHAS DA BOLA: DO MAPA (PARA TODOS)' and r['off'] and not r['rankItem'], '   a pausa do TESTAR diz "%s" (no lugar da chave do RANK OFF)' % r['item'], r)
        await pg.evaluate("() => OFI.interno.OFJ.sai()")
        # o CRIAR SALA: o deslize das tampinhas e, com o mapa que já tem as linhas, a nota no lugar do RANK OFF
        await pg.evaluate("() => { OFI.interno.criaSalaDialogo({M: OFI.interno.OFE.M}); return 1; }")
        await pg.wait_for_selector('.ofi-jan-sala .ofi-fis-sala input.ofi-range', timeout=5000)
        r = await pg.evaluate("""() => { const j = document.querySelector('.ofi-jan-sala');
          const campos = [...j.querySelectorAll('.ofi-fis-sala input.ofi-range')].map(i => i.getAttribute('aria-label'));
          const nota = [...j.querySelectorAll('.ofi-p-nota')].map(n => n.textContent).find(t => /Linhas da bola/.test(t)) || '';
          const rank = [...j.querySelectorAll('button.ofi-chave')].some(b => /RANK OFF/.test(b.getAttribute('aria-label') || ''));
          const d = j.querySelector('.ofi-fis-sala input.ofi-range[aria-label="Deslize"]');
          d.value = '50'; d.dispatchEvent(new Event('input', {bubbles:true})); d.dispatchEvent(new Event('change', {bubbles:true}));
          return {campos, nota, rank, txt:j.querySelector('.ofi-fis-txt').textContent}; }""")
        await pg.screenshot(path=str(SAIDA / 'v95_criar_sala.png'))
        P.confere('Deslize' in r['campos'] and 'solta, a tampinha desliza ~' in r['txt'], 'CRIAR SALA: o DESLIZE das tampinhas (a amostra diz: "…%s")' % r['txt'][-60:], r)
        P.confere('o mapa já mostra para todos' in r['nota'] and not r['rank'], '   o mapa já tem as linhas para todos: no lugar do RANK OFF, a nota', r)
        await pg.evaluate("() => { const b = [...document.querySelectorAll('.ofi-jan-sala button')].find(x => /CANCELAR/.test(x.textContent)); if (b) b.click(); return 1; }")
        P.confere(not [x for x in erros if 'Failed to load' not in x], 'a Oficina: nenhum erro de JavaScript', erros[:5])
        await b.close()
    return P.fim()


if __name__ == '__main__':
    roda(principal())
