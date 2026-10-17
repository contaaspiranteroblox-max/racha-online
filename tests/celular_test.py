"""v70.1 · celular: o jogo é na horizontal e tudo cabe na tela.

· Em pé (aparelho de toque): GIRE O CELULAR cobre tudo, prende o foco e deixa o resto inerte; o Esc não fecha. Na partida
  contra os bots (ou no treino) a pausa abre; deitando de novo a pausa continua aberta, com o foco no CONTINUAR. No
  computador com a janela em pé nada disso aparece (o lobby em pé continua valendo).
· Deitado — 800×336 (o tamanho do app do Claude no iPhone deitado), 844×390, 740×360 e 667×375: cada tela, janela e aba dos
  Ajustes cabe sem rolar (fora a conversa do chat e as faixas que arrastam de lado) e nenhum botão fica fora da tela; o
  lobby tem o JOGAR inteiro e (v71) o MODO colado à esquerda dele, sem se cobrirem; o perfil fica em sub-abas (v71.1: no computador também;
  v77: VISÃO GERAL · ESTATÍSTICAS · CONQUISTAS · PARTIDAS);
  os Ajustes ficam compactos (o cabeçalho numa linha e as opções em duas colunas).
· Com o Tamanho da interface em 130% nada encolhe (a tela rola). No computador (1280×720) nada disso muda o que já havia.

Isto mede o desenho no Chromium de teste: não prova a leitura do texto miúdo num celular de verdade (ver LEIA-ME).
Rodar:  python3 tests/celular_test.py            (as cópias de tela ficam em tests/saida/cel_*.png)
"""
import json
from comum import abre, rt, roda, Placar, async_playwright, RAIZ

CABE = (RAIZ / 'tests' / 'cabe.js').read_text(encoding='utf-8')
SAIDA = RAIZ / 'tests' / 'saida'; SAIDA.mkdir(exist_ok=True)
RAIZES = '#lb, #pop-ajustes, #cp'
DEITADO = [(800, 336), (844, 390), (740, 360), (667, 375)]
TELAS = [
  ('lobby', "abrirLobby(); true"),
  ('perfil', "abreTela('perfil'); true"),
  ('perfil-est', "document.getElementById('v70-pf-est').click(); true"),
  ('perfil-rec', "document.getElementById('v70-pf-rec').click(); true"),
  ('perfil-partidas', "document.getElementById('v70-pf-hist').click(); true"),
  ('ranking', "abreTela('ranking'); true"),
  ('replays', "abreTela('replays'); true"),
  ('loja', "abreTela('loja'); true"),
  ('treino', "abreTela('treino'); true"),
  ('tampinha', "abreTela('skins'); true"),
  ('tampinha-modelos', "(() => { const t = [...document.querySelectorAll('.tpe-aba')].find(b => /MODELOS/.test(b.textContent)); t.click(); return true; })()"),
  ('tampinha-inventario', "(() => { const t = [...document.querySelectorAll('.tpe-aba')].find(b => /INVENT/.test(b.textContent)); t.click(); return true; })()"),
  ('comunidade', "ED.saindo = true; fechaTela(); ED.saindo = false; abreTela('comunidade'); true"),
  ('salas', "abreTela('amigos'); true"),
  ('criar-sala', "sxNovaSala(); true"),
  ('clube', "abreTela('clube'); true"),
  ('clube-criar', "clbCriarAbre(); true"),
  ('clube-pagina', "(() => { CLB.form.nome = 'Os Brabos da Laje'; clbCriar(); return true; })()"),
  ('copa', "abreTela('copa'); true"),
  ('chat', "abreTela('chat'); true"),
  ('sala', "abreTela('amigos'); slocCria({n:2, map:0, jogo:'futebol', tempo:0, name:'T'}); true"),
  ('sala-ajustes', "slAjustes(); true"),
  ('sala-bots', "fechaPop(); v70SlMontaComBots(); true"),
  ('jogar-casual', "net49Send({type:'leave'}); fechaTela(); abreJogar('casual'); true"),
  ('jogar-liga', "abreJogar('ranked'); true"),
  ('missoes', "fechaRanqueada(); document.getElementById('lb-missoes').click(); true"),
  ('ajustes-audio', "fechaPop(); ajxAbre('audio'); true"),
  ('ajustes-visual', "ajxAbre('visual'); true"),
  ('ajustes-controles', "ajxAbre('controles'); true"),
  ('ajustes-camera', "ajxAbre('camera'); true"),
  ('ajustes-acess', "ajxAbre('acess'); true"),
  ('ajustes-conta', "ajxAbre('conta'); true"),
  ('primeira-vez', "ajxFecha(); onbAbre(); true"),
  ('chat-painel', "document.getElementById('onb').hidden = true; cbAbre(); true"),
]
# v71: o JOGAR e o MODO (o modo, o tamanho e o campo; toque para trocar) colado à esquerda dele, na mesma linha de baixo, sem se
# cobrirem; o título do JOGAR sem nada por cima · v77: as medidas da imagem enviada (o JOGAR 344 × 124 a 34 da borda, o MODO 292 × 118)
JOGAR = """(() => { const J = document.getElementById('lb-jogar'), j = J.getBoundingClientRect(), M = document.getElementById('lb-modo'), m = M.getBoundingClientRect(), sc = PALCO.s;
  const rg = document.createRange(); rg.selectNodeContents(J.querySelector('.lb-jogar-tit')); const tr = rg.getBoundingClientRect();
  const pts = [.1, .3, .5, .7, .9].map(f => document.elementFromPoint(tr.left + tr.width*f, tr.top + tr.height*.5));
  return {jw:Math.round(j.width/sc), jh:Math.round(j.height/sc), dir:Math.round((innerWidth - PALCO.sa.r - j.right)/sc), livre:pts.every(p => p && J.contains(p)),
    mw:Math.round(m.width/sc), mh:Math.round(m.height/sc), esq:m.right <= j.left - 4, linha:Math.abs(m.bottom - j.bottom) < 2, mReal:Math.round(m.height), jReal:Math.round(j.height)}; })()"""
# 30 partidas no histórico (a aba PARTIDAS cheia)
HIST = """(() => { for (let i = 0; i < 30; i++) X49.history.push({at:Date.now() - i*3600e3, win:i%3 !== 0, emp:i%7 === 0, score:[3, i%4], n:2, jogo:['futebol', 'curva', 'ginga'][i%3], ctx:['casual', 'liga', 'online'][i%3]});
  X49.history = X49.history.slice(-30); renderPartidas(); return X49.history.length; })()"""


async def deitado(P, pw, w, h):
    b, pg, erros = await abre(pw, w, h)
    print('\n· %dx%d (deitado)' % (w, h))
    await rt(pg, HIST)
    r = await rt(pg, "({cabe:LB.raiz.classList.contains('v70-cabe'), s:+PALCO.s.toFixed(3), sc:+PALCO.sc.toFixed(3), gire:!V70G.el.hidden})")
    P.confere(r['cabe'] and not r['gire'], 'o lobby entra no modo em que tudo cabe (escala do palco %.3f, como na v69)' % r['s'], r)
    j = await rt(pg, JOGAR)
    P.confere(j['jw'] == 344 and j['jh'] == 124 and j['dir'] == 34 and j['livre'] and j['mw'] == 292 and j['mh'] == 118 and j['esq'] and j['linha'] and min(j['mReal'], j['jReal']) >= 44,
              'o JOGAR inteiro e o MODO colado à esquerda dele, sem se cobrirem (v77; os dois com mais de 44 px de altura)', j)
    for nome, js in TELAS:
        await rt(pg, js); await pg.wait_for_timeout(420)
        m = await pg.evaluate(CABE + '(%s)' % json.dumps(RAIZES))
        await pg.screenshot(path=str(SAIDA / ('cel_%s_%dx%d.png' % (nome, w, h))))
        z = ', '.join('%s %.2f' % (x['alvo'], x['z']) for x in m['zoom'])
        P.confere(not m['rola'] and not m['fora'], '%-19s cabe sem rolar%s' % (nome, (' (encolheu: ' + z + ')') if z else ''), m)
        if nome == 'perfil':
            p = await rt(pg, """(() => { const nav = document.querySelector('#tela-perfil .v77-pf-abas'), c = document.querySelector('#tela-perfil .pf-corpo');
              const vis = s => { const e = c.querySelector(s); return !!e && !e.hidden && getComputedStyle(e).display !== 'none'; };
              return {nav:!!nav && getComputedStyle(nav).display !== 'none', abas:nav ? nav.children.length : 0, sel:nav && nav.querySelector('[aria-selected=true]').textContent,
                geral:vis('.v77-pf-geral'), est:vis('.v77-pf-est'), conq:vis('.v77-pf-conq'), hist:vis('.v77-pf-hist'), lado:vis('.pf-lado')}; })()""")
            P.confere(p['nav'] and p['abas'] == 4 and p['sel'] == 'VISÃO GERAL' and p['geral'] and p['lado'] and not p['est'] and not p['conq'] and not p['hist'],
                      'perfil (v77): VISÃO GERAL · ESTATÍSTICAS · CONQUISTAS · PARTIDAS, uma parte por vez, com a tampinha ao lado', p)
        if nome == 'perfil-partidas':
            n = await rt(pg, "document.querySelectorAll('#pf-hist li:not(.vazio)').length")
            P.confere(n == 30, 'perfil › PARTIDAS: as 30 últimas partidas à vista (três colunas)', n)
        if nome == 'ajustes-camera':
            a = await rt(pg, """(() => { const R = AJX.raiz, cab = R.querySelector('.ajx-abas').getBoundingClientRect(), ok = document.getElementById('aj-ok').getBoundingClientRect(),
                x = R.querySelector('.ajx-fechar').getBoundingClientRect(), sec = AJX.secs.camera;
              return {compacto:R.classList.contains('v70-compacto'), linha:Math.abs((ok.top + ok.bottom)/2 - (cab.top + cab.bottom)/2) < 6 && Math.abs((x.top + x.bottom)/2 - (cab.top + cab.bottom)/2) < 6,
                colunas:getComputedStyle(sec).columnCount}; })()""")
            P.confere(a['compacto'] and a['linha'] and a['colunas'] == '2', 'Ajustes: as abas, o PRONTO e o ✕ numa linha; as opções em duas colunas', a)
        if nome == 'ajustes-controles':
            t = await rt(pg, """(() => { const R = AJX.raiz, g = R.querySelector('.v70-teclado'), n = R.querySelector('.v70-teclado-nota');
              return {toque:R.classList.contains('v70-toque'), teclado:!!g && getComputedStyle(g).display !== 'none', nota:!!n && getComputedStyle(n).display !== 'none'}; })()""")
            P.confere(t['toque'] and not t['teclado'] and t['nota'], 'Ajustes › Controles: no aparelho só de toque o teclado físico sai (fica a nota)', t)
    # na partida: a pausa, os Ajustes da pausa, o editor dos controles e o COMO JOGA (no tamanho real da tela)
    await rt(pg, "cbFecha(); jogar(); true"); await pg.wait_for_timeout(900)
    for nome, js, raiz in [('pausa', "pausaAbre(); true", '#pausa'), ('pausa-ajustes', "ajxAbre('camera'); true", '#pop-ajustes'),
                           ('editor', "ajxFecha(); pausaFecha(); abrirEdicao(); true", '#hp'), ('como-joga', "fecharEdicao(false); tuIntroAbre('curva'); true", '.tu-intro')]:
        await rt(pg, js); await pg.wait_for_timeout(420)
        m = await pg.evaluate(CABE + '(%s)' % json.dumps(raiz))
        await pg.screenshot(path=str(SAIDA / ('cel_%s_%dx%d.png' % (nome, w, h))))
        z = ', '.join('%s %.2f' % (x['alvo'], x['z']) for x in m['zoom'])
        P.confere(not m['rola'] and not m['fora'], 'na partida: %-14s cabe sem rolar%s' % (nome, (' (encolheu: ' + z + ')') if z else ''), m)
    await rt(pg, "tuIntroFecha(); true")
    rede = [e for e in erros if 'Failed to load resource' in e]
    P.confere(not [e for e in erros if e not in rede], 'nenhum erro de JavaScript', [e for e in erros if e not in rede][:3])
    await b.close()


async def principal():
    P = Placar('v70.1 · celular: só na horizontal e tudo cabe na tela')
    async with async_playwright() as pw:
        # ---------------------------------------------------------------- em pé
        print('\n· em pé (390x844, toque)')
        b, pg, erros = await abre(pw, 390, 844)
        await pg.wait_for_timeout(200)
        r = await rt(pg, """(() => { const g = V70G.el, rc = g.getBoundingClientRect(), rot = document.getElementById('rot');
          return {vis:!g.hidden, cobre:rc.left <= 0 && rc.top <= 0 && rc.right >= innerWidth && rc.bottom >= innerHeight, foco:document.activeElement === g,
            inerte:document.getElementById('wrap').inert, rot:!rot || getComputedStyle(rot).display === 'none', msg:V70G.st.textContent, pausa:PAUSA.aberta,
            tit:document.getElementById('v70-gire-t').textContent, modal:g.getAttribute('aria-modal'), z:+getComputedStyle(g).zIndex}; })()""")
        await pg.screenshot(path=str(SAIDA / 'cel_gire_lobby.png'))
        P.confere(r['vis'] and r['cobre'] and r['tit'] == 'GIRE O CELULAR' and r['modal'] == 'true', 'em pé: GIRE O CELULAR cobre a tela inteira', r)
        P.confere(r['foco'] and r['inerte'], 'em pé: o foco fica nela e o jogo por baixo fica inerte', r)
        P.confere(r['rot'] and not r['pausa'] and r['msg'] == '', 'em pé no lobby: sem a etiqueta antiga e sem pausar nada', r)
        await pg.keyboard.press('Escape'); await pg.wait_for_timeout(150)
        P.confere(await rt(pg, "!V70G.el.hidden"), 'o Esc não fecha a tela de girar')
        await pg.set_viewport_size({'width': 844, 'height': 390}); await pg.wait_for_timeout(400)
        r = await rt(pg, "({vis:!V70G.el.hidden, inerte:document.getElementById('wrap').inert, cabe:LB.raiz.classList.contains('v70-cabe')})")
        P.confere(not r['vis'] and not r['inerte'] and r['cabe'], 'deitou: a tela some e o lobby volta (no modo em que tudo cabe)', r)
        await rt(pg, "jogar(); true"); await pg.wait_for_timeout(900)
        await pg.set_viewport_size({'width': 390, 'height': 844}); await pg.wait_for_timeout(400)
        r = await rt(pg, "({vis:!V70G.el.hidden, pausa:PAUSA.aberta, parado:PAUSA.on, msg:V70G.st.textContent})")
        await pg.screenshot(path=str(SAIDA / 'cel_gire_partida.png'))
        P.confere(r['vis'] and r['pausa'] and r['parado'] and 'pausada' in r['msg'], 'em pé no meio do treino: o jogo pausa e a tela avisa', r)
        await pg.set_viewport_size({'width': 844, 'height': 390}); await pg.wait_for_timeout(400)
        r = await rt(pg, "({vis:!V70G.el.hidden, pausa:PAUSA.aberta, foco:document.activeElement && document.activeElement.id})")
        await pg.screenshot(path=str(SAIDA / 'cel_gire_volta.png'))
        P.confere(not r['vis'] and r['pausa'] and r['foco'] == 'pa-continuar', 'deitou de novo: a pausa continua aberta, com o foco no CONTINUAR', r)
        rede = [e for e in erros if 'Failed to load resource' in e]
        P.confere(not [e for e in erros if e not in rede], 'nenhum erro de JavaScript', [e for e in erros if e not in rede][:3])
        await b.close()
        b, pg, erros = await abre(pw, 390, 844, toque=False)
        r = await rt(pg, "({vis:!V70G.el.hidden, ret:LB.raiz.classList.contains('retrato')})")
        P.confere(not r['vis'] and r['ret'], 'no computador com a janela em pé: sem a tela de girar (o lobby em pé continua)', r)
        await b.close()
        # ---------------------------------------------------------------- deitado
        for (w, h) in DEITADO:
            await deitado(P, pw, w, h)
        # ---------------------------------------------------------------- 130%: rola em vez de encolher
        print('\n· 800x336 com o Tamanho da interface em 130%')
        b, pg, erros = await abre(pw, 800, 336)
        await rt(pg, "uiMudaTamanho(1.3); abreTela('loja'); true"); await pg.wait_for_timeout(450)
        r = await rt(pg, "({z:document.querySelectorAll('[data-v70z]').length, rola:(c => c.scrollHeight > c.clientHeight + 2)(document.querySelector('#tela-loja .tl-corpo')), sc:+PALCO.sc.toFixed(3), s:+PALCO.s.toFixed(3)})")
        P.confere(r['z'] == 0 and r['rola'] and abs(r['sc'] - r['s']*1.3) < .01, 'em 130% as telas crescem e rolam (nada encolhe de volta)', r)
        await rt(pg, "uiMudaTamanho(1); true"); await pg.wait_for_timeout(450)
        r = await rt(pg, "({z:document.querySelectorAll('[data-v70z]').length, rola:(c => c.scrollHeight > c.clientHeight + 2)(document.querySelector('#tela-loja .tl-corpo'))})")
        P.confere(r['z'] >= 1 and not r['rola'], 'de volta em 100%: a loja cabe de novo', r)
        await b.close()
        # ---------------------------------------------------------------- computador: nada muda
        print('\n· 1280x720 (computador)')
        b, pg, erros = await abre(pw, 1280, 720, toque=False)
        j = await rt(pg, JOGAR)
        P.confere(j['jw'] == 344 and j['dir'] == 34 and j['livre'] and j['esq'] and j['linha'] and min(j['mReal'], j['jReal']) >= 44, 'no computador também: o JOGAR e o MODO colado nele (v77)', j)
        await rt(pg, "abreTela('perfil'); true"); await pg.wait_for_timeout(400)
        r = await rt(pg, """({cabe:LB.raiz.classList.contains('v70-cabe'), z:document.querySelectorAll('[data-v70z]').length,
          nav:getComputedStyle(document.querySelector('#tela-perfil .v77-pf-abas')).display, est:document.querySelector('#tela-perfil .v77-pf-est').hidden})""")
        P.confere(not r['cabe'] and r['z'] == 0 and r['nav'] == 'grid' and r['est'], 'no computador o perfil também em partes (v77: VISÃO GERAL, ESTATÍSTICAS, CONQUISTAS e PARTIDAS) e nada encolhe', r)
        await rt(pg, "fechaTela(); ajxAbre('camera'); true"); await pg.wait_for_timeout(300)
        r = await rt(pg, "({compacto:AJX.raiz.classList.contains('v70-compacto'), toque:AJX.raiz.classList.contains('v70-toque'), gire:!V70G.el.hidden})")
        P.confere(not r['compacto'] and not r['toque'] and not r['gire'], 'no computador os Ajustes ficam como estavam (e o teclado aparece)', r)
        rede = [e for e in erros if 'Failed to load resource' in e]
        P.confere(not [e for e in erros if e not in rede], 'nenhum erro de JavaScript', [e for e in erros if e not in rede][:3])
        await b.close()
    return P.fim()


if __name__ == '__main__':
    roda(principal())
