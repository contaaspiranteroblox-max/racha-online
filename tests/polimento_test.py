"""Etapa 6 · polimento e acessibilidade: as cores por papel, os nomes iguais entre o botão e o destino, o contorno dos
times e o VOCÊ em campo, as janelas (foco, Tab, fundo inerte, Escape por camada, foco de volta), as abas e os cartões
no teclado, as escolhas com estado e o Reduzir animações seguindo o sistema.
v77: cada botão abre só a tela dele (o título igual ao botão: TREINO, CLUBE, SALAS, AMIGOS) e os desenhos são os da imagem enviada.

Rodar: python3 tests/polimento_test.py
"""
import pathlib, re
from comum import abre, rt, roda, Placar, async_playwright, RAIZ, HARNESS

FOCO = """(() => { const a = document.activeElement; if (!a || a === document.body) return 'body';
  return (a.id ? '#' + a.id : '') + '.' + String(a.className).split(' ').slice(0, 2).join('.') + ' ' + (a.getAttribute('aria-label') || a.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 30); })()"""
# a cor do meio do degradê (onde fica o texto) e o contraste com o branco
COR = """(sel => { const el = document.querySelector(sel); if (!el) return null; const s = getComputedStyle(el);
  const l = (s.backgroundImage.match(/rgba?\\([^)]+\\)/g) || []).map(c => c.match(/[\\d.]+/g).slice(0, 3).map(Number));
  const lum = ([r, g, b]) => { const f = v => { v /= 255; return v <= .03928 ? v/12.92 : Math.pow((v + .055)/1.055, 2.4); }; return .2126*f(r) + .7152*f(g) + .0722*f(b); };
  const meio = l.length ? l[Math.floor(l.length/2)] : s.backgroundColor.match(/[\\d.]+/g).slice(0, 3).map(Number);
  const tx = s.color.match(/[\\d.]+/g).slice(0, 3).map(Number), a = lum(meio), b = lum(tx);
  return {meio, tx, cr:+((Math.max(a, b) + .05)/(Math.min(a, b) + .05)).toFixed(2)}; })"""


async def principal():
    P = Placar('Etapa 6 · polimento e acessibilidade')
    async with async_playwright() as pw:
        b, pg, erros = await abre(pw, 1280, 720)
        await pg.wait_for_timeout(300)

        print('\n1) cores por papel e contraste')
        cor = lambda sel: pg.evaluate(COR + '(%r)' % sel)
        await rt(pg, "abreTela('amigos'); true"); await pg.wait_for_timeout(300)
        c = await cor('#tela-amigos .sx-cria .sx-criar')
        P.confere(c and c['meio'][0] > 240 and c['meio'][1] > 180 and c['meio'][2] < 90 and c['cr'] >= 7, 'CRIAR SALA (abre o formulário) = amarelo, texto escuro', c)
        await rt(pg, "sxNovaSala(); true"); await pg.wait_for_timeout(300)
        c = await cor('#tela-amigos .sx-pe .sx-criar')
        P.confere(c and c['meio'][1] > c['meio'][0] and c['meio'][1] > c['meio'][2] and c['cr'] >= 4, 'CRIAR SALA do formulário = confirmar (verde escuro, texto branco ≥ 4:1)', c)
        c = await cor('#tela-amigos .sx-pe .sx-cancela')
        P.confere(c and c['cr'] >= 4, 'CANCELAR = neutro, legível', c)
        await rt(pg, "abreTela('clube'); clbCriarAbre(); true"); await pg.wait_for_timeout(300)
        c = await cor('.clb-ok')
        P.confere(c and c['meio'][1] > c['meio'][0] and c['cr'] >= 4, 'CRIAR GRÁTIS do clube = confirmar (verde escuro)', c)
        c = await cor('.clb-esc-bt')
        P.confere(c and c['meio'][2] > c['meio'][0] and c['cr'] >= 4.5, 'ESCUDO = azul mais escuro (branco ≥ 4,5:1)', c)
        await rt(pg, "(() => { CLB.modal = null; clbRender(); abreTela('comunidade'); return true; })()"); await pg.wait_for_timeout(300)
        c = await cor('#tela-comunidade .cm-chat .sx-bt')
        P.confere(c and c['meio'][0] > 240 and c['cr'] >= 7, 'AMIGOS (era a COMUNIDADE): ABRIR O CHAT = ação principal (amarelo)', c)
        await rt(pg, "abreTela('skins'); true"); await pg.wait_for_timeout(400)
        c = await pg.evaluate("(() => { const b = document.querySelector('.tpe-ok'); const s = getComputedStyle(b); return {volta:b.classList.contains('volta'), bg:s.backgroundImage.slice(0, 60)}; })()")
        P.confere(c['volta'] and ('rgb(58, 63, 67)' in c['bg'] or 'rgb(90, 95, 99)' in c['bg']), 'editor sem mudança: VOLTAR = neutro (grafite), não verde', c)
        await rt(pg, "(() => { ED.saindo = true; fechaTela(); ED.saindo = false; abreTela('amigos'); slocCria({n:2, map:0, jogo:'futebol', tempo:0, name:'T'}); return true; })()"); await pg.wait_for_timeout(400)
        await rt(pg, "slSair(); true"); await pg.wait_for_timeout(300)
        c = await cor('#lb-pop .lb-btn.vermelho')
        P.confere(c and c['meio'][0] > 180 and c['meio'][1] < 80 and c['cr'] >= 4, 'SAIR da sala = vermelho de verdade (era laranja)', c)
        await rt(pg, "(() => { fechaPop(); net49Send({type:'leave'}); fechaTela(); abrirLobby(); return true; })()"); await pg.wait_for_timeout(300)
        # v71: a LOJA e os DESAFIOS são botões escuros com o desenho colorido (a barraca amarela, a medalha amarela) e a palavra branca
        ic = await pg.evaluate("""(() => { const l = document.querySelector('#rx [data-loja]'), m = document.querySelector('#lb-missoes .v77-mi-ic');
          const f = getComputedStyle(l).backgroundImage, rgb = (f.match(/rgb\\(\\d+, \\d+, \\d+\\)/g) || []).map(c => c.match(/\\d+/g).reduce((a, x) => a + +x, 0));
          return {tile:l.classList.contains('v71-tile'), desenho:!!l.querySelector('i .v77-ic[data-ic=loja]') && getComputedStyle(l.querySelector('i .v77-ic')).backgroundImage.indexOf('data:image/webp') >= 0,
            rotulo:getComputedStyle(l.querySelector('b')).color, fundo:rgb.length > 0 && Math.max(...rgb) < 200, medalha:!!m && m.dataset.ic === 'desafios'}; })()""")
        P.confere(ic['tile'] and ic['desenho'] and ic['rotulo'] == 'rgb(255, 255, 255)' and ic['fundo'] and ic['medalha'], 'LOJA e DESAFIOS: o desenho da imagem no botão escuro, a palavra branca (v77)', ic)
        css = (RAIZ / 'app' / 'public' / 'game' / 'v70.css').read_text(encoding='utf-8')
        P.confere(':focus-visible' in css and 'outline:4px solid var(--v70-foco)' in css, 'foco visível: o mesmo anel em todo o jogo')

        print('\n2) nomes iguais entre o botão e o destino')
        async def destino(sel):
            await rt(pg, "(() => { if (LB.pop && !LB.pop.hidden) fechaPop(); if (lobby.tela){ ED.saindo = true; fechaTela(); ED.saindo = false; } abrirLobby(); return true; })()")
            await pg.wait_for_timeout(200)
            await pg.click(sel); await pg.wait_for_timeout(450)
            return await rt(pg, "(() => { const T = lobby.tela && TELAS[lobby.tela]; const h = T && T.el.querySelector('.tl-cab h2'); const a = T && T.el.querySelector('.tl-aba[aria-selected=true]'); return {tela:lobby.tela, h2:h && h.textContent, aba:a && a.textContent.replace(/\\d+$/, '')}; })()")
        tile = await pg.evaluate("document.querySelector('#rx [data-rx=\"skins\"] b').textContent")
        d = await destino('#rx [data-rx="skins"]')
        P.confere(tile == 'TAMPINHA' and d['h2'] == 'SUA TAMPINHA', 'TAMPINHA → SUA TAMPINHA (era SKINS)', [tile, d])
        tile = await pg.evaluate("document.querySelector('#rx [data-rx=\"treino\"] b').textContent")
        d = await destino('#rx [data-rx="treino"]')
        P.confere(tile == 'TREINO' and d['h2'] == 'TREINO', 'TREINO → TREINO (v77: o mesmo nome do botão; era EXERCÍCIOS, depois TREINAMENTO)', [tile, d])
        d = await destino('#rx [data-rx="ranking"]')
        P.confere(d['h2'] == 'RANKING' or d['aba'] == 'RANKING', 'RANKING → RANKING (era TOP SEMANAL)', d)
        d = await destino('#rx [data-rx="clube"]')
        P.confere(d['h2'] == 'CLUBE' and not d['aba'], 'CLUBE → a tela CLUBE (v77: só ela, sem abas de outras telas)', d)
        d = await destino('#rx [data-rx="salas"]')
        P.confere(d['h2'] == 'SALAS' and not d['aba'], 'SALAS → a tela SALAS (v77: só ela)', d)
        d = await destino('#rx [data-rx="amigos"]')
        await pg.wait_for_timeout(200)
        am = await pg.evaluate("(() => { const c = document.querySelector('#tela-comunidade .cm-amigos'); return {foco:!!c && c.contains(document.activeElement), destaque:!!c && c.classList.contains('v70-destaque'), h3:c && c.querySelector('h3').textContent}; })()")
        P.confere(d['tela'] == 'comunidade' and d['h2'] == 'AMIGOS' and am['foco'] and am['h3'] == 'AMIGOS', 'AMIGOS → a tela AMIGOS (era a COMUNIDADE), no cartão AMIGOS (foco nele)', [d, am])
        txt = await pg.evaluate("document.body.innerText")
        await rt(pg, "(() => { fechaTela(); abrirLobby(); return true; })()")
        visiveis = []
        for t in ['amigos', 'clube', 'copa', 'chat', 'loja', 'treino', 'perfil', 'skins']:
            await rt(pg, "(() => { if (lobby.tela){ ED.saindo = true; fechaTela(); ED.saindo = false; } abreTela('%s'); return true; })()" % t); await pg.wait_for_timeout(250)
            visiveis.append(await pg.evaluate("document.body.innerText"))
        tudo = '\n'.join(visiveis)
        P.confere(not re.search(r'\bSKINS?\b|VESTIÁRIO|Pré-projet', tudo), 'nenhuma tela mostra SKINS, VESTIÁRIO ou Pré-projetado', re.findall(r'.{0,30}(?:\bSKINS?\b|VESTIÁRIO|Pré-projet).{0,30}', tudo)[:3])
        P.confere('MODELOS PRONTOS' in tudo, 'o editor diz MODELOS PRONTOS')
        await rt(pg, "(() => { ED.saindo = true; fechaTela(); ED.saindo = false; ajxAbre('visual'); return true; })()"); await pg.wait_for_timeout(250)
        aj = await pg.evaluate("document.getElementById('pop-ajustes').innerText")
        P.confere('Quadros por segundo (FPS)' in aj and 'Qualidade dos gráficos' in aj, 'Ajustes com palavras simples (quadros por segundo, qualidade dos gráficos)', aj[:120])
        await rt(pg, "ajxAbre('camera'); true"); await pg.wait_for_timeout(200)
        aj = await pg.evaluate("document.getElementById('pop-ajustes').innerText")
        P.confere('Suavizar movimento' in aj and 'entre um passo e outro' not in aj and 'Deslocamento' not in aj, 'Câmera: Suavizar movimento e "olha à frente" sem termo técnico', '')
        await rt(pg, "ajxFecha(); true")
        html = (RAIZ / 'app' / 'public' / 'game' / 'racha.html').read_text(encoding='utf-8')
        P.confere('#ff3fd0' not in html and html.count('<head>') == 1 and html.count('<body>') == 1 and html.count('</html>') == 1, 'uma só gema (sem o cristal rosa) e um documento com um head e um body')
        idx = (RAIZ / 'app' / 'index.html').read_text(encoding='utf-8')
        P.confere('lang="pt-BR"' in idx, 'a plataforma em pt-BR (era en)')

        print('\n3) em campo: o contorno dos times, o VOCÊ e o símbolo no placar')
        r = await rt(pg, """(() => {
          const T = window.__T; abrirLobby(); T.comeca('futebol', 2, 0);
          const log = []; let dash = [];
          const g = new Proxy({}, {get:(t, k) => k === 'stroke' ? () => log.push(['stroke', dash.length]) : k === 'setLineDash' ? d => { dash = d; } : () => {}, set:() => true});
          for (const q of RQ.jog){ dash = []; v70Contorno(g, q, q.x, q.y); }
          const t0 = RQ.jog.filter(q => q.time === 0).length;
          return {log, t0, n:RQ.jog.length};
        })()""")
        cheios = [x for x in r['log'] if x[1] == 0]; trac = [x for x in r['log'] if x[1] > 0]
        P.confere(len(r['log']) == r['n'] and len(cheios) == r['t0'] and len(trac) == r['n'] - r['t0'], 'cada jogador ganha o contorno: cheio no time da casa, tracejado no visitante', r)
        r = await rt(pg, """(() => {
          const ditos = []; const txt0 = txt; txt = function(g, s){ ditos.push(s); return txt0.apply(this, arguments); };
          const g = cv.getContext('2d');
          RQ.estado = 'saida'; drawDirecao(g, P.x, P.y, P.r); const saida = ditos.slice();
          ditos.length = 0; RQ.estado = 'jogo'; const v1 = v70VoceVisivel(); drawDirecao(g, P.x, P.y, P.r); const jogo = ditos.slice();
          NET49.playing = true; const ls = NET49.localSlot; NET49.localSlot = -1; const esp = v70VoceVisivel(); NET49.playing = false; NET49.localSlot = ls;
          txt = txt0;
          return {saida, jogo, v1, esp};
        })()""")
        P.confere('VOCÊ' in r['saida'] and r['v1'] and 'VOCÊ' not in r['jogo'], 'VOCÊ: a setinha sempre na partida e a palavra na saída de bola', r)
        P.confere(r['esp'] is False, 'quem assiste não ganha o VOCÊ', r)
        r = await rt(pg, """(() => { const l = [];
          const g = new Proxy({}, {get:(t, k) => k === 'arc' ? x => l.push(x) : k === 'setLineDash' ? d => { if (d && d.length) l.push('dash'); } : k === 'createLinearGradient' ? () => ({addColorStop(){}}) : () => {}, set:() => true});
          try { v80PlacarCaixa(g, RachaPartida80.placarW(), 54, rqCor(0), rqCor(1), false); } catch (e) { return String(e); } return l; })()""")   # v80: o placar novo
        P.confere(isinstance(r, list) and r.count('dash') == 1 and len([x for x in r if x != 'dash']) >= 2, 'o placar mostra o mesmo símbolo (cheio e tracejado) — v80: no placar novo, do lado do TIME A e do TIME B', r)
        r = await rt(pg, """(() => {
          const ditos = []; const txt0 = txt; txt = function(g, s){ ditos.push(s); return txt0.apply(this, arguments); };
          const T = window.__T, g = cv.getContext('2d'), saida = {};
          for (const md of ['futebol', 'curva']){ T.comeca(md, 1, 0); ditos.length = 0; rqPlacar70(g); saida[md] = ditos.filter(x => MD_LISTA.some(m => m.nome === x)); }   // v70.2: só os dois modos que ficaram
          txt = txt0; return saida;
        })()""")
        P.confere(r['futebol'] == [] and r['curva'] == ['COM CURVA'],
                  'o COM CURVA mostra a etiqueta dele na cor do modo (o futebol não precisa)', r)
        await rt(pg, "(() => { RQ.on && rqSai(); abrirLobby(); return true; })()")

        print('\n4) a sala: o seu cartão diz VOCÊ e os cartões respondem ao teclado')
        await rt(pg, "(() => { abreTela('amigos'); slocCria({n:2, map:0, jogo:'futebol', tempo:0, name:'T'}); return true; })()"); await pg.wait_for_timeout(400)
        s = await pg.evaluate("(() => { const c = document.querySelector('.sl-card.eu'); return c && {voce:!!c.querySelector('.sl-voce'), role:c.getAttribute('role'), tab:c.tabIndex, nome:c.getAttribute('aria-label')}; })()")
        P.confere(s and s['voce'] and s['role'] == 'button' and s['tab'] == 0, 'o seu cartão: VOCÊ escrito, papel de botão e Tab', s)
        await pg.focus('.sl-card.eu'); await pg.keyboard.press('Enter'); await pg.wait_for_timeout(300)
        ab = await rt(pg, "!LB.pop.hidden")
        dentro = await pg.evaluate("document.getElementById('lb-pop').contains(document.activeElement)")
        P.confere(ab and dentro, 'Enter no cartão abre o menu do árbitro (com o foco nele)', [ab, dentro])
        await pg.keyboard.press('Escape'); await pg.wait_for_timeout(300)
        P.confere(await rt(pg, "LB.pop.hidden") and (await pg.evaluate(FOCO)).find('sl-card') >= 0, 'Esc fecha o menu e o foco volta para o cartão', await pg.evaluate(FOCO))
        await pg.focus('.sl-azul .sl-vaga'); await pg.keyboard.press(' '); await pg.wait_for_timeout(300)
        h2 = await pg.evaluate("(document.querySelector('#lb-pop h2') || {}).textContent")
        P.confere(h2 == 'QUEM VAI PARA O TIME B?', 'Espaço numa vaga do time: o árbitro escolhe quem vai (sem precisar tocar)', h2)   # v71: preto × branco · v80: Time A × Time B
        await pg.keyboard.press('Escape'); await pg.wait_for_timeout(250)
        await rt(pg, "(() => { net49Send({type:'leave'}); return true; })()"); await pg.wait_for_timeout(250)

        print('\n5) as janelas: foco, Tab, fundo inerte, Esc por camada e o foco de volta')
        await rt(pg, "(() => { if (lobby.tela){ ED.saindo = true; fechaTela(); ED.saindo = false; } abrirLobby(); return true; })()"); await pg.wait_for_timeout(250)
        await pg.focus('#lb-missoes'); await pg.keyboard.press('Enter'); await pg.wait_for_timeout(300)   # v71: o PASSE saiu do lobby; os DESAFIOS abrem a mesma janela
        j = await pg.evaluate("(() => ({aberta:!document.getElementById('lb-pop').hidden, dentro:document.getElementById('lb-pop').contains(document.activeElement), fundo:!!document.getElementById('rx').closest('[inert]'), jogo:!!document.getElementById('wrap').inert, aviso:!document.getElementById('lb-aviso').closest('[inert]')}))()")
        P.confere(j['aberta'] and j['dentro'], 'a janela abre com o foco dentro', j)
        P.confere(j['fundo'] and j['jogo'] and j['aviso'], 'o fundo fica inerte (o lobby e o jogo); o aviso continua sendo lido', j)
        sai = False
        for i in range(6):
            await pg.keyboard.press('Tab')
            if not await pg.evaluate("document.getElementById('lb-pop').contains(document.activeElement)"): sai = True
        await pg.keyboard.press('Shift+Tab')
        if not await pg.evaluate("document.getElementById('lb-pop').contains(document.activeElement)"): sai = True
        P.confere(not sai, 'Tab e Shift+Tab ficam dentro da janela')
        await pg.keyboard.press('Escape'); await pg.wait_for_timeout(300)
        f = await pg.evaluate(FOCO)
        P.confere(await rt(pg, "LB.pop.hidden") and ('lb-missoes' in f or 'Desafios' in f) and not await pg.evaluate("!!document.querySelector('[inert]')"), 'Esc fecha; o foco volta ao botão que abriu e nada fica inerte', f)
        await pg.focus('#rx [data-rx="clube"]'); await pg.keyboard.press('Enter'); await pg.wait_for_timeout(350)
        await pg.focus('.clb-criar-bt'); await pg.keyboard.press('Enter'); await pg.wait_for_timeout(350)
        m = await pg.evaluate("(() => { const m = document.querySelector('.clb-modal'); return m && {role:m.getAttribute('role'), modal:m.getAttribute('aria-modal'), nome:m.getAttribute('aria-label'), dentro:m.contains(document.activeElement)}; })()")
        P.confere(m and m['role'] == 'dialog' and m['modal'] == 'true' and m['dentro'], 'a janela do clube (dentro da tela) é um diálogo com o foco dentro', m)
        await pg.keyboard.press('Escape'); await pg.wait_for_timeout(300)
        e = await rt(pg, "({modal:!!document.querySelector('.clb-modal'), tela:lobby.tela})")
        P.confere(not e['modal'] and e['tela'] == 'clube' and 'CRIAR CLUBE' in await pg.evaluate(FOCO), 'Esc fecha só a janela do clube (a tela fica) e o foco volta ao CRIAR CLUBE', [e, await pg.evaluate(FOCO)])
        await pg.keyboard.press('Escape'); await pg.wait_for_timeout(300)
        f = await pg.evaluate(FOCO)
        P.confere(await rt(pg, "lobby.tela") is None and 'Clube' in f, 'o segundo Esc fecha a tela e o foco volta ao CLUBE do lobby', f)
        await pg.focus('#lb-ajustes'); await pg.keyboard.press('Enter'); await pg.wait_for_timeout(300)
        await pg.keyboard.press('Escape'); await pg.wait_for_timeout(300)
        f = await pg.evaluate(FOCO)
        P.confere(await pg.evaluate("document.getElementById('pop-ajustes').hidden") and '#lb-ajustes' in f, 'Ajustes: Esc fecha e o foco volta para a engrenagem', f)
        await rt(pg, "abreTela('skins'); true"); await pg.wait_for_timeout(400)
        await pg.click('.tpe-menu-bt'); await pg.wait_for_timeout(200)
        await pg.keyboard.press('Escape'); await pg.wait_for_timeout(200)
        e = await rt(pg, "({menu:!ED.el.menu.hidden, tela:lobby.tela})")
        P.confere(not e['menu'] and e['tela'] == 'skins', 'editor: o primeiro Esc fecha o menu (a tela fica)', e)
        # v79: o JOGAR é só a ranqueada (o COMO JOGA era da CASUAL); a janela por cima dele agora é a das PATENTES
        await rt(pg, "(() => { ED.saindo = true; fechaTela(); ED.saindo = false; abreJogar('casual'); return true; })()"); await pg.wait_for_timeout(350)
        await pg.click('#lb-rq .v79-ver-pat'); await pg.wait_for_timeout(300)
        t = await pg.evaluate("(() => { const e = document.getElementById('v79-pat'); const r = e.getBoundingClientRect(); const x = document.elementFromPoint(r.left + r.width/2, r.top + r.height/2); return {vis:!e.hidden, topo:!!x && e.contains(x), foco:e.contains(document.activeElement), jogarInerte:!!document.getElementById('lb-rq').closest('[inert]') || !!document.getElementById('lb-rq').inert}; })()")
        P.confere(t['vis'] and t['topo'] and t['foco'] and t['jogarInerte'], 'as PATENTES aparecem por cima do JOGAR, com o foco dentro e o JOGAR inerte atrás (v79)', t)
        await pg.keyboard.press('Escape'); await pg.wait_for_timeout(250)
        e = await pg.evaluate("({pat:!document.getElementById('v79-pat').hidden, jogar:!document.getElementById('lb-rq').hidden, foco:(document.activeElement || {}).className || ''})")
        P.confere(not e['pat'] and e['jogar'] and 'v79-ver-pat' in e['foco'], 'Esc fecha só as PATENTES (o JOGAR continua) e o foco volta para o VER PATENTES', e)
        await pg.keyboard.press('Escape'); await pg.wait_for_timeout(250)
        P.confere(await pg.evaluate("document.getElementById('lb-rq').hidden"), 'o segundo Esc fecha o JOGAR')
        # na partida: Esc abre a pausa; dentro dela o foco e o Tab; Esc fecha
        await rt(pg, "(() => { const T = window.__T; T.comeca('futebol', 1, 0); return true; })()"); await pg.wait_for_timeout(200)
        await pg.focus('#c'); await pg.keyboard.press('Escape'); await pg.wait_for_timeout(300)
        pz = await pg.evaluate("(() => ({aberta:!document.getElementById('pausa').hidden, dentro:document.getElementById('pausa').contains(document.activeElement)}))()")
        P.confere(pz['aberta'] and pz['dentro'], 'na partida: Esc abre a pausa com o foco dentro', pz)
        await pg.keyboard.press('Escape'); await pg.wait_for_timeout(300)
        P.confere(await pg.evaluate("document.getElementById('pausa').hidden") and not await pg.evaluate("!!document.querySelector('[inert]')"), 'Esc fecha a pausa e o jogo volta a responder')
        await rt(pg, "(() => { rqSai(); abrirLobby(); return true; })()"); await pg.wait_for_timeout(200)

        print('\n6) abas e escolhas com estado')
        await rt(pg, "abreTela('perfil'); true"); await pg.wait_for_timeout(300)
        a = await pg.evaluate("[...document.querySelectorAll('#tela-perfil .v77-pf-aba')].map(b => b.textContent + ':' + b.getAttribute('aria-selected') + ':' + b.tabIndex)")
        P.confere(a == ['VISÃO GERAL:true:0', 'ESTATÍSTICAS:false:-1', 'CONQUISTAS:false:-1', 'PARTIDAS:false:-1'], 'as abas do perfil (v77) dizem qual está escolhida (aria-selected) e só ela entra no Tab', a)
        await pg.focus('#tela-perfil .v77-pf-aba[aria-selected=true]'); await pg.keyboard.press('End'); await pg.wait_for_timeout(300)
        r = await rt(pg, "V77T.parte")
        f = await pg.evaluate(FOCO)
        P.confere(r == 'hist' and 'PARTIDAS' in f, 'End (e as setas) trocam de aba pelo teclado', [r, f])
        await rt(pg, "(() => { fechaTela(); abreTela('replays'); return true; })()"); await pg.wait_for_timeout(300)
        st = await pg.evaluate("[...document.querySelectorAll('#tela-replays .tl-seg > button')].map(b => b.getAttribute('aria-pressed'))")
        P.confere(st and all(x in ('true', 'false') for x in st) and st.count('true') == 1, 'as abas dos replays dizem qual está ligada (aria-pressed)', st)
        await rt(pg, "abreTela('treino'); true"); await pg.wait_for_timeout(300)
        tc = await pg.evaluate("[...document.querySelectorAll('#lb .tr-card')].filter(c => c.getAttribute('aria-current') === 'true').length")
        P.confere(tc == 1, 'o treino escolhido tem aria-current', tc)
        await rt(pg, "(() => { fechaTela(); ajxAbre('audio'); return true; })()"); await pg.wait_for_timeout(250)
        n = await pg.evaluate("(() => { const b = document.getElementById('aj-mus'); const id = b.getAttribute('aria-labelledby'); return id ? document.getElementById(id).textContent : b.getAttribute('aria-label'); })()")
        P.confere(n == 'Música no lobby', 'a chave da música tem nome (era muda para o leitor de tela)', n)
        await rt(pg, "ajxFecha(); true")
        P.confere(not [e for e in erros if 'Failed to load' not in e], 'nenhum erro de JavaScript', erros[:3])
        await b.close()

        print('\n7) Reduzir animações: o sistema manda até a pessoa escolher; vale na partida')
        b, pg, erros = await abre(pw, 1280, 720, movimento='reduce')
        r = await rt(pg, "({anim:CONTA.menosAnim, html:document.documentElement.classList.contains('v70-calmo'), calmo:LB.raiz.classList.contains('calmo'), chave:document.getElementById('aj-anim').getAttribute('aria-pressed')})")
        P.confere(r['anim'] and r['html'] and r['calmo'] and r['chave'] == 'true', 'sistema com "reduzir movimento": o jogo já começa com Reduzir animações', r)
        d = await pg.evaluate("getComputedStyle(document.querySelector('#lb .rx-bt')).transitionDuration")
        P.confere(d in ('1e-05s', '0.00001s', '0s'), 'as transições dos menus assentam na hora', d)
        r = await rt(pg, """(() => {
          const T = window.__T; T.comeca('futebol', 1, 0);
          conf.length = 0; spawnConfetti(); const c = conf.length;
          const t0 = tAmb; drawAmbiente(.5); const t1 = tAmb;
          return {conf:c, cenario:t1 - t0};
        })()""")
        P.confere(r['conf'] == 0 and r['cenario'] == 0, 'na partida: sem confete e o cenário parado', r)
        await rt(pg, "(() => { rqSai(); abrirLobby(); ajxAbre('acess'); return true; })()"); await pg.wait_for_timeout(200)
        await pg.click('#aj-anim'); await pg.wait_for_timeout(200)
        r = await rt(pg, "({anim:CONTA.menosAnim, esc:CONTA.menosAnimEscolha, html:document.documentElement.classList.contains('v70-calmo'), salvo:JSON.parse(localStorage.getItem(CHAVE_CONTA)).menosAnimEscolha})")
        P.confere(r['anim'] is False and r['esc'] and not r['html'] and r['salvo'] is True, 'a pessoa desligou: vale a escolha dela (e fica salva)', r)
        await pg.reload(); await pg.wait_for_function('() => typeof window.__RT === "function"', polling=100, timeout=20000); await pg.wait_for_timeout(500)
        await pg.evaluate("(() => { const o = document.getElementById('onb'); if (o) o.hidden = true; })()"); await rt(pg, HARNESS)
        r = await rt(pg, "({anim:CONTA.menosAnim, esc:CONTA.menosAnimEscolha})")
        P.confere(r['anim'] is False and r['esc'], 'abrindo de novo: a escolha continua valendo mesmo com o sistema pedindo menos movimento', r)
        r = await rt(pg, """(() => { const T = window.__T; T.comeca('futebol', 1, 0); conf.length = 0; spawnConfetti(); const c = conf.length; rqSai(); abrirLobby(); return c; })()""")
        P.confere(r > 0, 'com as animações ligadas o confete volta', r)
        P.confere(not [e for e in erros if 'Failed to load' not in e], 'nenhum erro de JavaScript', erros[:3])
        await b.close()

        print('\n7b) a primeira vez (apresentação): o foco no PRÓXIMO, o Tab fica dentro, o Esc não pula')
        b, pg, erros = await abre(pw, 1280, 720, sem_onb=False)
        await pg.wait_for_timeout(400)
        o = await pg.evaluate("(() => ({vis:!document.getElementById('onb').hidden, foco:document.activeElement && document.activeElement.id}))()")
        P.confere(o['vis'] and o['foco'] == 'onb-prox', 'a apresentação abre com o foco no PRÓXIMO (o Enter segue sem pular)', o)
        dentro = True
        for i in range(5):
            await pg.keyboard.press('Tab')
            dentro = dentro and await pg.evaluate("document.getElementById('onb').contains(document.activeElement)")
        await pg.keyboard.press('Escape'); await pg.wait_for_timeout(200)
        P.confere(dentro and await pg.evaluate("!document.getElementById('onb').hidden"), 'o Tab fica na apresentação e o Esc não fecha (falta o nome e a tampinha)')
        await b.close()

        print('\n8) navegador que não deixa guardar nada: o aviso de progresso temporário')
        b = await pw.chromium.launch(executable_path=__import__('comum').CHROME, args=['--no-sandbox'])
        ctx = await b.new_context(viewport={'width': 1280, 'height': 720})
        await ctx.add_init_script("Object.defineProperty(window, 'localStorage', {get(){ throw new Error('bloqueado'); }});")
        pg = await ctx.new_page(); erros = []
        pg.on('pageerror', lambda e: erros.append(str(e)[:200]))
        await pg.goto(__import__('comum').PAGINA.resolve().as_uri())
        await pg.wait_for_function('() => typeof window.__RT === "function"', polling=100, timeout=20000); await pg.wait_for_timeout(800)
        r = await pg.evaluate("(() => { const e = document.querySelector('.v70-salva'); return {modo:window.RACHA_SEM_SALVAR, aviso:!!e && !e.hidden, tx:e && e.textContent, papel:e && e.getAttribute('role')}; })()")
        P.confere(r['modo'] == 'memoria' and r['aviso'] and 'só até fechar' in (r['tx'] or '') and r['papel'] == 'alert', 'sem armazenamento: o jogo avisa que o progresso vale só até fechar (e oferece exportar)', r)
        P.confere(not erros, 'e o jogo abre sem erro', erros[:2])
        await b.close()

        print('\n9) sem internet: o que o jogo pede de fora e se ele roda sem')
        b = await pw.chromium.launch(executable_path=__import__('comum').CHROME, args=['--no-sandbox'])
        ctx = await b.new_context(viewport={'width': 1280, 'height': 720})
        fora = []
        async def corta(rota):
            fora.append(rota.request.url); await rota.abort()
        await ctx.route(re.compile(r'^https?://'), corta)
        pg = await ctx.new_page(); erros = []
        pg.on('pageerror', lambda e: erros.append(str(e)[:200]))
        await pg.goto(__import__('comum').PAGINA.resolve().as_uri())
        await pg.wait_for_function('() => typeof window.__RT === "function"', polling=100, timeout=20000); await pg.wait_for_timeout(600)
        await pg.evaluate("(() => { const o = document.getElementById('onb'); if (o) o.hidden = true; })()")
        await rt(pg, "(() => { X49.mode = 'casual'; X49.jogo = 'futebol'; x49Start(2, 1); rqVsComeca(); return true; })()")
        await pg.wait_for_timeout(1500)
        t = await rt(pg, "({tick:RQ.tick, on:RQ.on})")
        hosts = sorted(set(re.sub(r'^https?://([^/]+)/.*$', r'\1', u) for u in fora))
        P.confere(set(hosts) <= {'fonts.googleapis.com', 'fonts.gstatic.com'}, 'de fora, o jogo só pede as fontes (Google Fonts)', hosts)
        P.confere(t['on'] and t['tick'] > 30 and not erros, 'sem internet o jogo abre e a partida roda (as letras caem nas fontes do sistema)', [t, erros[:2]])
        await b.close()
    return P.fim()


if __name__ == '__main__':
    roda(principal())
