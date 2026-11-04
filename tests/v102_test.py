"""RACHA v102 · A BORDA BOTÃO, O ANEL DA TAMPINHA E O LOBBY COM MENOS COISA NA TELA (no navegador):
  1) o lobby nos tamanhos de tela (o computador, o celular deitado, o celular pequeno, o tablet 4:3, a tela 21:9): à vista só
     o perfil, as moedas, as gemas, o correio, o MENU, a tampinha, a vaga do grupo, a barra de atalhos (SALAS, TREINO, OFICINA,
     COFRE), o MODO e o JOGAR; o resto escondido (e guardado no MENU); nada sai da tela e nenhum botão fica por cima de outro
     (v103: e o quadrado TELA CHEIA, antes do MENU, enquanto o jogo não está em tela cheia nem aberto como app);
  2) cada atalho e cada item do MENU abre o mesmo que o botão de sempre; o MENU abre e fecha (o X, o fundo, o Esc); os
     números e os pontos vermelhos dos botões de sempre aparecem no item e no botão do MENU;
  3) a borda BOTÃO: no fim da lista (os códigos de sempre não mudam), grátis, logo depois da Lisa na faixa do editor, a cor
     chamada ARO, o desenho (o aro claro, o contorno escuro, o desenho no meio) e a cara animada com o aro do botão;
  4) o anel em volta da tampinha (o desenho novo, encostado na tampinha, com a borda de fora no alcance do chute);
  5) o cabeçalho do CRIAR TAMPINHA com os 3 ícones (antes: 3 quadrados vazios).
  python3 tests/v102_test.py
"""
import asyncio, json, pathlib, sys
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from comum import Placar, abre, rt, roda
from playwright.async_api import async_playwright

TAMANHOS = [(1280, 720, 'computador 16:9'), (844, 390, 'celular deitado 19,5:9'), (667, 375, 'celular pequeno'), (1024, 768, 'tablet 4:3'), (2560, 1080, 'tela 21:9')]

CAIXAS = """(() => {
  const vis = e => { if (!e) return false; const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return r.width > 2 && r.height > 2 && cs.display !== 'none' && cs.visibility !== 'hidden' && !e.closest('[hidden]'); };
  const cx = e => { const r = e.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)]; };
  const L = [], E = [];
  const poe = (nome, e) => { if (vis(e)) L.push([nome, cx(e)]); };
  const some = (nome, e) => { if (vis(e)) E.push(nome); };
  poe('perfil', LB.eu);
  document.querySelectorAll('#lb .lb-topo .hm-grana').forEach((e, i) => poe('grana' + i, e));
  poe('correio', document.getElementById('lb-correio')); poe('menu', document.querySelector('#lb .v102-menu-bt'));
  poe('telacheia', document.querySelector('#lb .v103-tela-bt'));   // v103: o TELA CHEIA (antes do MENU; some em tela cheia e no app instalado)
  poe('tampinha', LB.emblema);
  document.querySelectorAll('#lb .v101-vaga').forEach((e, i) => poe('vaga' + i, e));
  document.querySelectorAll('#lb .v102-doca-bt').forEach(e => poe('atalho:' + e.textContent.trim(), e));
  poe('modo', LB.modo); poe('jogar', LB.jogar);
  some('patente', document.querySelector('#lb .v91-pat')); some('chat', document.getElementById('lb-chat')); some('ajustes', document.getElementById('lb-ajustes'));
  some('sinal', document.querySelector('#lb .v101-sinal')); some('oficina', document.getElementById('ofi-lobby')); some('passe', document.querySelector('#lb .v88-passe'));
  some('missoes', LB.missoes); some('modo101', document.querySelector('#lb .v101-modo'));
  document.querySelectorAll('#rx .v71-col .rx-bt.v71-tile').forEach(e => some('lado:' + (e.querySelector('b') || e).textContent.trim(), e));
  some('gaveta', document.querySelector('#lb .v102-gaveta'));
  // tudo o que dá para tocar no lobby (fora as telas e as janelas): para contar
  const toques = [...LB.palco.querySelectorAll('button, [role=button]')].filter(e => vis(e) && !e.closest('.v102-gaveta')).length;
  return {vw:innerWidth, vh:innerHeight, L, E, toques, v102: LB.raiz.classList.contains('v102'), sub: (LB.modo.querySelector('.v102-sub') || {}).textContent || ''};
})()"""


def cruzam(a, b, folga=1):
    return a[0] < b[2] - folga and a[2] > b[0] + folga and a[1] < b[3] - folga and a[3] > b[1] + folga


async def lobby_em(pw, P, w, h, nome):
    b, pg, erros = await abre(pw, w=w, h=h, dsf=1)
    try:
        await pg.wait_for_timeout(500)
        c = await rt(pg, CAIXAS)
        P.confere(c['v102'], nome + ': o lobby da v102 (classe v102)', c['v102'])
        nomes = [n for n, _ in c['L']]
        quer = ['perfil', 'grana0', 'grana1', 'correio', 'menu', 'tampinha', 'vaga1', 'atalho:SALAS', 'atalho:TREINO', 'atalho:OFICINA', 'atalho:COFRE', 'modo', 'jogar']
        P.confere(all(n in nomes for n in quer), nome + ': à vista o perfil, o dinheiro, o correio, o MENU, a tampinha, a vaga, os 4 atalhos, o MODO e o JOGAR', nomes)
        P.confere('vaga0' not in nomes and 'vaga2' not in nomes, nome + ': sem grupo, uma vaga só (o + com GRUPO)', nomes)
        P.confere(not c['E'], nome + ': o resto fora da tela inicial (no MENU)', c['E'])
        # v103: o pedido da tela cheia pôs UM botão a mais na barra de cima (o quadrado TELA CHEIA, antes do MENU). Ele só aparece
        # quando dá para usar e ainda não está em tela cheia: em tela cheia e no app instalado a conta volta para 13
        tela = 1 if 'telacheia' in nomes else 0
        P.confere(c['toques'] <= 13 + tela, nome + ': no máximo 13 coisas para tocar (eram 26)' + (' + o TELA CHEIA da v103' if tela else ''), c['toques'])
        P.confere(c['sub'].startswith('RANQUEADA · '), nome + ': o MODO diz RANQUEADA e o campo', c['sub'])
        fora = [n for n, r in c['L'] if r[0] < -1 or r[1] < -1 or r[2] > c['vw'] + 1 or r[3] > c['vh'] + 1]
        P.confere(not fora, nome + ': nada sai da tela (%d peças)' % len(c['L']), fora)
        cr = []
        for i in range(len(c['L'])):
            for j in range(i + 1, len(c['L'])):
                if cruzam(c['L'][i][1], c['L'][j][1]):
                    cr.append((c['L'][i][0], c['L'][j][0]))
        P.confere(not cr, nome + ': nenhum botão por cima de outro', cr)
        # o MENU por cima: a gaveta dentro da tela, os 10 itens à vista e sem um por cima do outro
        await rt(pg, "(() => { document.querySelector('#lb .v102-menu-bt').click(); return 1; })()")
        await pg.wait_for_timeout(350)
        g = await rt(pg, """(() => { const r = e => { const x = e.getBoundingClientRect(); return [Math.round(x.left), Math.round(x.top), Math.round(x.right), Math.round(x.bottom)]; };
          const gv = document.querySelector('#lb .v102-gaveta'), pt = gv.querySelector('.v102-pat');
          return {g: r(gv), itens: [...gv.querySelectorAll('.v102-item')].filter(e => !e.hidden).map(e => [e.textContent.trim(), r(e)]), vw: innerWidth, vh: innerHeight,
            pat: pt && !pt.hidden ? [pt.querySelector('.v102-pat-tx b').textContent, r(pt)] : null}; })()""")
        dentro = all(x[1][0] >= g['g'][0] - 1 and x[1][2] <= min(g['g'][2], g['vw']) + 1 and x[1][1] >= -1 and x[1][3] <= g['vh'] + 1 for x in g['itens'])
        P.confere(len(g['itens']) == 10 and dentro, nome + ': o MENU com os 10 itens dentro da tela', g)
        pt = g['pat']
        P.confere(pt and pt[0] and pt[1][0] >= g['g'][0] - 1 and pt[1][1] >= -1 and all(pt[1][3] <= x[1][1] + 1 for x in g['itens']), nome + ': a PATENTE no alto do MENU (o nome dela)', pt)
        g['itens'].append(['PATENTE', pt[1]] if pt else ['PATENTE', [0, 0, 0, 0]])
        cr = [(g['itens'][i][0], g['itens'][j][0]) for i in range(len(g['itens'])) for j in range(i + 1, len(g['itens'])) if cruzam(g['itens'][i][1], g['itens'][j][1])]
        P.confere(not cr, nome + ': os itens do MENU sem um por cima do outro', cr)
        js = [x for x in erros if not x.startswith('console:')]
        P.confere(not js, nome + ': sem erro de JavaScript', js[:3])
    finally:
        await b.close()


# o que um botão abriu (a tela, a janela, a Oficina, a folha do JOGAR, a conexão)
ABERTO = """(() => ({tela: lobby.tela || null, pop: !LB.pop.hidden ? (LB.popCaixa.textContent || '').slice(0, 20) : null,   // (só o título: as missões do dia mudam)
  aj: !LB.aj.hidden, ofi: typeof OFI !== 'undefined' && !!OFI.tela, rq: (() => { const f = document.getElementById('lb-rq'); return !!f && !f.hidden; })(),
  pat: typeof V79P !== 'undefined' && !!V79P.el && !V79P.el.hidden}))()"""


async def abre_por(pw, js):
    b, pg, erros = await abre(pw, w=1280, h=720)
    try:
        await rt(pg, "(() => { %s; return 1; })()" % js)
        await pg.wait_for_timeout(450)
        return await rt(pg, ABERTO), [x for x in erros if not x.startswith('console:')]
    finally:
        await b.close()


async def principal():
    P = Placar('v102 · a borda BOTÃO, o anel e o lobby mais limpo')
    async with async_playwright() as pw:
        print('1) o lobby nos tamanhos de tela')
        for w, h, nome in TAMANHOS:
            await lobby_em(pw, P, w, h, nome)

        print('2) os atalhos e o MENU abrem o mesmo que os botões de sempre')
        PARES = [('SALAS', "document.querySelector('#rx .rx-bt.v71-tile[data-rx=\"salas\"]').click()"),
                 ('TREINO', "document.querySelector('#rx .rx-bt.v71-tile[data-rx=\"treino\"]').click()"),
                 ('OFICINA', "document.getElementById('ofi-lobby').click()"),
                 ('COFRE', "document.querySelector('#rx .rx-bt.v71-tile[data-rx=\"cofre\"], #rx .rx-bt.v71-tile[data-rx=\"skins\"]').click()")]
        for nome, orig in PARES:
            a, ea = await abre_por(pw, orig)
            n, en = await abre_por(pw, "[...document.querySelectorAll('#lb .v102-doca-bt')].find(b => b.textContent.trim() === %s).click()" % json.dumps(nome))
            P.confere(a == n and (n['tela'] or n['ofi'] or n['pop'] or n['aj']) and not ea and not en, 'o atalho %s abre o mesmo que o botão de sempre' % nome, (a, n, ea, en))
        MENU = [('LOJA', "document.querySelector('#rx .rx-bt.v71-tile[data-loja]').click()"),
                ('CLUBE', "document.querySelector('#rx .rx-bt.v71-tile[data-rx=\"clube\"]').click()"),
                ('AMIGOS', "document.querySelector('#rx .rx-bt.v71-tile[data-rx=\"amigos\"]').click()"),
                ('RANKING', "document.querySelector('#rx .rx-bt.v71-tile[data-rx=\"ranking\"]').click()"),
                ('EVENTOS', "document.querySelector('#rx .rx-bt.v71-tile.v77-eventos').click()"),
                ('PASSE RACHA', "document.querySelector('#lb .v88-passe').click()"),
                ('MISSÕES', "LB.missoes.click()"),
                ('CHAT', "document.getElementById('lb-chat').click()"),
                ('AJUSTES', "document.getElementById('lb-ajustes').click()"),
                ('CONEXÃO', "document.querySelector('#lb .v101-sinal').click()")]
        for nome, orig in MENU:
            a, ea = await abre_por(pw, orig)
            n, en = await abre_por(pw, "document.querySelector('#lb .v102-menu-bt').click(); [...document.querySelectorAll('#lb .v102-item')].find(b => b.textContent.trim() === %s).click()" % json.dumps(nome))
            P.confere(a == n and (n['tela'] or n['ofi'] or n['pop'] or n['aj'] or n['rq']) and not ea and not en, 'MENU › %s abre o mesmo que o botão de sempre' % nome, (a, n, ea, en))
        a, ea = await abre_por(pw, "document.querySelector('#lb .v91-pat').click()")
        n, en = await abre_por(pw, "document.querySelector('#lb .v102-menu-bt').click(); document.querySelector('#lb .v102-pat').click()")
        P.confere(a == n and n['pat'] and not ea and not en, 'MENU › PATENTE (a linha de cima, que saiu da barra) abre as patentes, como o cartão de sempre', (a, n, ea, en))

        b, pg, erros = await abre(pw, w=1280, h=720)
        try:
            ESTADO = "(() => ({aberta: RachaLobby102.estado().aberta, gav: !document.querySelector('#lb .v102-gaveta').hidden, exp: document.querySelector('#lb .v102-menu-bt').getAttribute('aria-expanded')}))()"
            await rt(pg, "(() => { document.querySelector('#lb .v102-menu-bt').click(); return 1; })()")
            e1 = await rt(pg, ESTADO)
            await rt(pg, "(() => { document.querySelector('#lb .v102-gav-x').click(); return 1; })()")
            await pg.wait_for_timeout(300)
            e2 = await rt(pg, ESTADO)
            await rt(pg, "(() => { document.querySelector('#lb .v102-menu-bt').click(); return 1; })()")
            await rt(pg, "(() => { document.querySelector('#lb .v102-fundo').click(); return 1; })()")
            await pg.wait_for_timeout(300)
            e3 = await rt(pg, ESTADO)
            await rt(pg, "(() => { document.querySelector('#lb .v102-menu-bt').click(); return 1; })()")
            await pg.keyboard.press('Escape')
            await pg.wait_for_timeout(300)
            e4 = await rt(pg, "(() => ({aberta: RachaLobby102.estado().aberta, gav: !document.querySelector('#lb .v102-gaveta').hidden, lobby: lobby.aberto, tela: lobby.tela}))()")
            P.confere(e1['aberta'] and e1['gav'] and e1['exp'] == 'true', 'o MENU abre (aria-expanded)', e1)
            P.confere(not e2['aberta'] and not e2['gav'] and e2['exp'] == 'false', 'o X fecha o MENU', e2)
            P.confere(not e3['aberta'] and not e3['gav'], 'tocar fora (no escuro) fecha o MENU', e3)
            P.confere(not e4['aberta'] and not e4['gav'] and e4['lobby'] and not e4['tela'], 'o Esc fecha só o MENU (o lobby fica)', e4)
            # os números e os pontos: os mesmos dos botões de sempre
            m = await rt(pg, """(() => {
              v88Selo(document.querySelector('#rx .rx-bt.v71-tile[data-rx="amigos"]'), 3);
              LB.missoes.classList.add('pronta');
              v88Selo(document.querySelector('#rx .rx-bt.v71-tile[data-rx="salas"]'), 2);
              lbLayout();
              const it = n => [...document.querySelectorAll('#lb .v102-item, #lb .v102-doca-bt')].find(b => b.textContent.replace(/[0-9+]/g, '').trim() === n);
              const selo = e => { const s = e && e.querySelector('.v102-selo'); return s ? (s.classList.contains('ponto') ? 'ponto' : s.textContent) : null; };
              const r = {amigos: selo(it('AMIGOS')), missoes: selo(it('MISSÕES')), salas: selo(it('SALAS')), menu: selo(document.querySelector('#lb .v102-menu-bt')),
                         rotulo: document.querySelector('#lb .v102-menu-bt').getAttribute('aria-label')};
              v88Selo(document.querySelector('#rx .rx-bt.v71-tile[data-rx="amigos"]'), 0); LB.missoes.classList.remove('pronta'); lbLayout();
              r.depois = selo(document.querySelector('#lb .v102-menu-bt')) || 'nada';
              return r; })()""")
            P.confere(m['amigos'] == '3' and m['missoes'] == 'ponto' and m['salas'] == '2', 'os números e os pontos aparecem no item e no atalho', m)
            P.confere(m['menu'] == '3' and '3 novidades' in (m['rotulo'] or ''), 'o botão do MENU soma os números de dentro dele (o rótulo de voz também)', m)
            P.confere(m['depois'] == 'ponto' or m['depois'] == 'nada', 'lido, o número some do botão do MENU', m['depois'])
            js = [x for x in erros if not x.startswith('console:')]
            P.confere(not js, 'o MENU sem erro de JavaScript', js[:3])
        finally:
            await b.close()

        print('3) a borda BOTÃO')
        b, pg, erros = await abre(pw, w=1280, h=720)
        try:
            r = await rt(pg, """(() => {
              const r = {}, B = TP_MAPA.b.get('bt');
              r.existe = !!B; r.indice = TP_BORDAS.indexOf(B); r.ultima = r.indice === TP_BORDAS.length - 1; r.gratis = B && B.pr === 'gratis' && tpTem('b', 'bt');
              const D = TP_PADRAO_D(); D.b = 'bt'; D.bc = ['#ffffff', '#1d1d1d']; D.p = 'ls'; D.pc = ['#ffffff', '#e0262c', '#1d1d1d']; D.i = '--'; D.ie = 0;
              const cod = tpCodigo(D); r.volta = tpLe(cod).b === 'bt'; r.cod = cod;
              // os códigos de sempre continuam iguais (a inicial e uma com a borda do lugar 26, a última de antes)
              const D26 = tpLe(TP_PADRAO_COD); D26.b = TP_BORDAS[26].id; const c26 = tpCodigo(D26);
              r.padraoIgual = tpCodigo(tpLe(TP_PADRAO_COD)) === TP_PADRAO_COD && TP_MAPA.b.has(tpLe(TP_PADRAO_COD).b) && tpLe(c26).b === TP_BORDAS[26].id && tpCodigo(tpLe(c26)) === c26;
              // o desenho: o aro claro (na cor 1), o contorno escuro por fora e o desenho no meio
              const c = document.createElement('canvas'); c.width = c.height = 200; const g = c.getContext('2d');
              tpDesenha(g, 100, 100, 90, tpLe(cod), 7);
              const px = (x, y) => Array.from(g.getImageData(x, y, 1, 1).data);
              r.aro = px(100 + Math.round(90*.9), 100);       // (no aro, à direita)
              r.contorno = px(100 + Math.round(90*.955), 100); // (o contorno)
              r.meio = px(100, 100);                            // (o meio: a listra)
              r.fora = px(100 + Math.round(90*1.02), 100);      // (fora: nada)
              // a cara animada com a BOTÃO: o aro do botão no lugar dos dentes
              const D2 = tpLe(cod); D2.i = SK76_CARAS[0].id; const c2 = document.createElement('canvas'); c2.width = c2.height = 200; const g2 = c2.getContext('2d');
              tpDesenha(g2, 100, 100, 90, D2, 7); r.caraAro = Array.from(g2.getImageData(100 + Math.round(90*.9), 100, 1, 1).data);
              return r; })()""")
            P.confere(r['existe'] and r['ultima'] and r['indice'] == 27, 'a BOTÃO no fim da lista (lugar 27: os códigos de sempre não mudam)', r)
            P.confere(r['gratis'], 'a BOTÃO é grátis (já é sua)', r['gratis'])
            P.confere(r['volta'] and r['padraoIgual'], 'o código guarda a BOTÃO e a tampinha inicial continua com o mesmo código', r)
            a, k, m2, f = r['aro'], r['contorno'], r['meio'], r['fora']
            P.confere(min(a[:3]) > 200 and a[3] > 240, 'o aro claro (branco, a cor 1)', a)
            P.confere(max(k[:3]) < 90 and k[3] > 200, 'o contorno escuro por fora', k)
            P.confere(m2[0] > 180 and m2[1] < 90 and m2[3] > 240, 'o desenho no meio (a listra vermelha)', m2)
            P.confere(f[3] < 40, 'nada fora do botão (sem dentes)', f)
            P.confere(min(r['caraAro'][:3]) > 200, 'com a cara animada: o aro do botão no lugar dos dentes', r['caraAro'])
            # o editor: a faixa (BOTÃO logo depois da Lisa), o nome da cor (ARO) e o cabeçalho com os 3 ícones
            await rt(pg, "(() => { tpeAbre(); return 1; })()")
            await pg.wait_for_timeout(600)
            await rt(pg, "(() => { [...document.querySelectorAll('.tpe-aba')].find(x => /BORDA/.test(x.textContent)).click(); return 1; })()")
            await pg.wait_for_timeout(300)
            await rt(pg, "(() => { tpeEscolhe('bt'); return 1; })()")
            await pg.wait_for_timeout(400)
            e = await rt(pg, """(() => { const t = document.querySelector('#lb-camada .lb-tela:not([hidden])');
              const ids = [...t.querySelectorAll('.tpe-item')].map(b => b.dataset.id);
              const rot = [...t.querySelectorAll('.tpe-slot-rot')].map(x => x.textContent.trim());
              const ics = [...t.querySelectorAll('.tl-cab .v77-cab-bt')].map(b => { const i = b.querySelector('.v91-tp-ic'); if (!i) return 0; const r = i.getBoundingClientRect(); return r.width > 10 && getComputedStyle(i).display !== 'none' ? 1 : 0; });
              return {ids: ids.slice(0, 5), equipada: ED.D.b, rot, ics}; })()""")
            P.confere(e['ids'][:4] == ['cl', 'dt', 'ls', 'bt'], 'na faixa do editor a BOTÃO vem logo depois da Lisa', e['ids'])
            P.confere(e['equipada'] == 'bt' and 'ARO' in e['rot'], 'escolhida no editor, a cor dela se chama ARO', e)
            P.confere(len(e['ics']) == 3 and all(e['ics']), 'o cabeçalho do CRIAR TAMPINHA com os 3 ícones (o chat, os amigos, os ajustes)', e['ics'])
            js = [x for x in erros if not x.startswith('console:')]
            P.confere(not js, 'a borda e o editor sem erro de JavaScript', js[:3])
        finally:
            await b.close()

        print('4) o anel em volta da tampinha')
        b, pg, erros = await abre(pw, w=1280, h=720)
        try:
            r = await rt(pg, """(() => {
              const rpx = 60, c = spriteHalo('#3ee06c', rpx, 'p'), g = c.getContext('2d'), m = c.width/2;
              const a = d => g.getImageData(Math.round(m + d), Math.round(m), 1, 1).data;
              const re = rpx*AROV.ate;
              return {novo: v95SpriteAnel === v102SpriteAnel, encosta: a(rpx*1.02)[3], meio: Array.from(a(rpx*1.12)), borda: Array.from(a(re - rpx*.03)), fora: a(re + rpx*.3)[3], lado: c.width}; })()""")
            P.confere(r['novo'], 'o anel novo no lugar do da v95 (o mesmo cache e o mesmo tamanho de alcance)', r)
            P.confere(r['encosta'] > 120, 'o anel encosta na tampinha (forte perto dela)', r['encosta'])
            P.confere(r['meio'][3] > 60 and r['meio'][1] > r['meio'][0], 'o meio do anel na cor dele (verde), transparente', r['meio'])
            P.confere(r['borda'][3] > 200 and min(r['borda'][:3]) > 150, 'a borda de fora (o alcance do chute) clara e firme', r['borda'])
            P.confere(r['fora'] < 60, 'por fora, só a luz leve no chão', r['fora'])
        finally:
            await b.close()
    return P.fim()

if __name__ == '__main__':
    roda(principal())
