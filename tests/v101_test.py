"""RACHA v101 · O LOBBY NO ESTILO DA IMAGEM DA NOITE E SÓ O CRIAR TAMPINHA (no navegador):
  1) o lobby novo em vários tamanhos de tela (o celular deitado, o computador, o tablet 4:3, a tela 21:9): as peças novas
     (o ID e a bandeira no perfil, os pontos na patente, o sinal, o cartão da OFICINA, as três vagas do grupo, o MODO, a
     coroa do JOGAR), o fundo cobrindo a tela toda (sem a faixa de cima), a tampinha no lugar do desenho, nada saindo da tela
     e nenhum botão por cima de outro;
  2) cada botão abre o que já abria: as vagas sem conta dão o aviso de entrar na conta; o MODO abre a mesma folha do campo;
     o sinal abre a conexão; as colunas, a OFICINA, o PASSE, as MISSÕES e o JOGAR continuam os mesmos botões;
  3) as telas no estilo novo (a faixa de cima escura, as abas de vidro, a escolhida no roxo);
  4) as tampinhas prontas escondidas (a loja, o cofre, a roda das favoritas, a equipada): fica só o CRIAR TAMPINHA, e o
     interruptor V101_SKINS_PRONTAS religa.
  python3 tests/v101_test.py
"""
import asyncio, json, pathlib, sys
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from comum import Placar, abre, rt, roda
from playwright.async_api import async_playwright

TAMANHOS = [(1280, 720, 'computador 16:9'), (844, 390, 'celular deitado 19,5:9'), (667, 375, 'celular pequeno'), (1024, 768, 'tablet 4:3'), (2560, 1080, 'tela 21:9')]

CAIXAS = """(() => {
  const vis = e => { if (!e) return false; const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return r.width > 2 && r.height > 2 && cs.display !== 'none' && cs.visibility !== 'hidden' && !e.closest('[hidden]'); };
  const cx = e => { const r = e.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)]; };
  const L = [];
  const poe = (nome, e) => { if (vis(e)) L.push([nome, cx(e)]); };
  poe('perfil', LB.eu); poe('patente', document.querySelector('#lb .v91-pat'));
  document.querySelectorAll('#lb .lb-topo .hm-grana').forEach((e, i) => poe('grana' + i, e));
  poe('chat', document.getElementById('lb-chat')); poe('correio', document.getElementById('lb-correio')); poe('ajustes', document.getElementById('lb-ajustes'));
  poe('sinal', document.querySelector('#lb .v101-sinal'));
  document.querySelectorAll('#rx .v71-col .rx-bt.v71-tile').forEach(e => poe('lado:' + (e.querySelector('b') || e).textContent.trim(), e));
  poe('oficina', document.getElementById('ofi-lobby'));
  document.querySelectorAll('#lb .v101-vaga').forEach((e, i) => poe('vaga' + i, e));
  poe('tampinha', LB.emblema); poe('passe', document.querySelector('#lb .v88-passe')); poe('missoes', LB.missoes); poe('campo', LB.modo);
  poe('modo', document.querySelector('#lb .v101-modo')); poe('jogar', LB.jogar);
  return {vw:innerWidth, vh:innerHeight, L};
})()"""

ESTADO = """(() => ({
  v101: LB.raiz.classList.contains('v101'), faixa: (() => { const f = document.querySelector('#lb .v91-faixa'); return !!f && getComputedStyle(f).display !== 'none'; })(),
  fundoW: V91.F && V91.F.info ? V91.F.info.w : 0, novo: typeof V101_FUNDO !== 'undefined' && !!V101_FUNDO && V91.F && V91.F.src === V101_FUNDO.src,
  cena: (() => { const r = V91.cena.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)]; })(),
  emb: (() => { const r = LB.emblema.getBoundingClientRect(); return {cx: (r.left + r.right)/2, cy: (r.top + r.bottom)/2, w: r.width}; })(),
  id: (document.querySelector('#lb-eu .v101-id') || {}).textContent || null, band: !!document.querySelector('#lb-eu .v101-band svg, #lb-eu .v101-band .sl-flag-e'),
  pts: (document.querySelector('#lb .v91-pat .v101-pts b') || {}).textContent || null,
  sinal: (() => { const s = document.querySelector('#lb .v101-sinal'); return s ? {cor: s.dataset.cor, tx: s.textContent.trim()} : null; })(),
  ofiCoroa: !!document.querySelector('#ofi-lobby .v101-ofi-coroa'), jogarCoroa: !!document.querySelector('#lb-jogar .v101-jogar-coroa'),
  vagas: document.querySelectorAll('#lb .v101-vaga').length, mais: document.querySelectorAll('#lb .v101-vaga .v101-vaga-mais').length,
  campo: (document.querySelector('#lb-modo .v101-campo') || {}).textContent || null,
  dica: (() => { const d = document.querySelector('#lb .v90-dica'); return !!d && getComputedStyle(d).display !== 'none'; })()
}))()"""


def cruzam(a, b, folga=1):
    return a[0] < b[2] - folga and a[2] > b[0] + folga and a[1] < b[3] - folga and a[3] > b[1] + folga


async def lobby_em(pw, P, w, h, nome):
    b, pg, erros = await abre(pw, w=w, h=h, dsf=1)
    try:
        await pg.wait_for_timeout(500)
        e = await rt(pg, ESTADO)
        P.confere(e['v101'], nome + ': o lobby novo (classe v101)', e)
        P.confere(not e['faixa'], nome + ': sem a faixa de cima (a cena vai até o alto)', e['faixa'])
        P.confere(e['cena'][0] <= 0 and e['cena'][1] <= 0 and e['cena'][2] >= w - 1 and e['cena'][3] >= h - 1, nome + ': o fundo cobre a tela inteira', e['cena'])
        if e['novo']:
            P.confere(abs(e['emb']['cx'] - w/2) < w*.02, nome + ': a tampinha no meio da tela (na largura)', e['emb'])
        P.confere(e['vagas'] == 3 and e['mais'] == 3, nome + ': as três vagas do grupo com o +', (e['vagas'], e['mais']))
        P.confere(e['id'] == 'SEM CONTA' and e['band'], nome + ': o perfil com a bandeira e o ID (sem conta: SEM CONTA)', (e['id'], e['band']))
        P.confere(e['pts'] == '0', nome + ': a patente com os pontos (0)', e['pts'])
        P.confere(e['sinal'] and e['sinal']['cor'] == 'cinza' and 'OFF' in e['sinal']['tx'], nome + ': o sinal (sem conta: OFF, cinza)', e['sinal'])
        P.confere(e['ofiCoroa'] and e['jogarCoroa'], nome + ': as coroas da OFICINA e do JOGAR', (e['ofiCoroa'], e['jogarCoroa']))
        P.confere(bool(e['campo']), nome + ': o nome do campo no cartão do campo', e['campo'])
        P.confere(not e['dica'], nome + ': sem a dica embaixo da tampinha (a imagem não tem)', e['dica'])
        c = await rt(pg, CAIXAS)
        fora = [n for n, r in c['L'] if r[0] < -1 or r[1] < -1 or r[2] > c['vw'] + 1 or r[3] > c['vh'] + 1]
        P.confere(not fora, nome + ': nada sai da tela (%d peças)' % len(c['L']), fora)
        cr = []
        for i in range(len(c['L'])):
            for j in range(i + 1, len(c['L'])):
                if cruzam(c['L'][i][1], c['L'][j][1]):
                    cr.append((c['L'][i][0], c['L'][j][0]))
        P.confere(not cr, nome + ': nenhum botão por cima de outro', cr)
        P.confere(len(c['L']) >= 24, nome + ': todas as peças à vista', [n for n, _ in c['L']])
        js = [x for x in erros if not x.startswith('console:')]
        P.confere(not js, nome + ': sem erro de JavaScript', js[:3])
    finally:
        await b.close()


async def principal():
    P = Placar('v101 · o lobby da imagem da noite e só o CRIAR TAMPINHA')
    async with async_playwright() as pw:
        print('1) o lobby novo nos tamanhos de tela')
        for w, h, nome in TAMANHOS:
            await lobby_em(pw, P, w, h, nome)

        print('2) os botões fazem o que já faziam')
        b, pg, erros = await abre(pw, w=1280, h=720)
        try:
            av = await rt(pg, "(() => { LB.aviso.textContent = ''; document.querySelector('#lb .v101-vaga').click(); return LB.aviso.textContent; })()")
            P.confere('Entre na sua conta' in (av or ''), 'a vaga do grupo sem conta: o aviso de entrar na conta', av)
            await rt(pg, "(() => { document.querySelector('#lb .v101-sinal').click(); return 1; })()")
            await pg.wait_for_timeout(250)
            s = await rt(pg, "(() => ({pop: !LB.pop.hidden, txt: LB.popCaixa.textContent}))()")
            P.confere(s['pop'] and 'CONEX' in s['txt'], 'o sinal abre a janela da conexão', s)
            await rt(pg, "(() => { fechaPop(); return 1; })()")
            await rt(pg, "(() => { document.getElementById('ofi-lobby').click(); return 1; })()")
            await pg.wait_for_timeout(400)
            o = await rt(pg, "(() => ({ofi: typeof OFI !== 'undefined' && !!OFI.tela}))()")
            P.confere(o['ofi'], 'a OFICINA abre a Oficina', o)
        finally:
            await b.close()

        ABERTO = "(() => ({rq: (() => { const f = document.getElementById('lb-rq'); return !!f && !f.hidden; })(), tela: lobby.tela || null, pop: !LB.pop.hidden}))()"
        res = []
        for sel in ('#lb-modo', '#lb .v101-modo'):
            b, pg, erros = await abre(pw, w=1280, h=720)
            try:
                await rt(pg, "(() => { document.querySelector(%s).click(); return 1; })()" % json.dumps(sel))
                await pg.wait_for_timeout(400)
                res.append(await rt(pg, ABERTO))
            finally:
                await b.close()
        P.confere(res[0] == res[1] and (res[0]['rq'] or res[0]['tela'] or res[0]['pop']), 'o MODO abre o mesmo que o cartão do campo', res)

        print('3) as telas no estilo novo')
        b, pg, erros = await abre(pw, w=1280, h=720)
        try:
            await rt(pg, "(() => { abreTela('loja'); return 1; })()")
            await pg.wait_for_timeout(500)
            t = await rt(pg, """(() => { const cab = document.querySelector('#lb-camada .lb-tela:not([hidden]) > .tl-cab'); const on = document.querySelector('#lb-camada .lb-tela:not([hidden]) .v88-cat.on, #lb-camada .lb-tela:not([hidden]) .v88-aba.on');
              return {cab: cab ? getComputedStyle(cab).backgroundImage : '', on: on ? getComputedStyle(on).backgroundImage : ''}; })()""")
            P.confere('122, 44, 255' in t['cab'] or '7a2cff' in t['cab'].lower(), 'a faixa de cima das telas com o fio do pôr do sol', t['cab'][:120])
            P.confere('168, 102, 255' in t['on'] or '126, 52, 240' in t['on'], 'a aba escolhida no roxo do neon', t['on'][:120])
        finally:
            await b.close()

        print('4) só o CRIAR TAMPINHA (as prontas escondidas, nada apagado)')
        SK = """(() => {
          const r = {}, pre = SK76_PRE[0].cod, modelo = tpCodigo(TP_PRE[3].d);
          r.esconde = RachaSemSkins101.esconde(); r.quantas = RachaSemSkins101.quantas();
          r.abas = TPE_ABAS.T.map(a => a[0]).join(',');
          r.pronta = [RachaSemSkins101.ehPronta(pre), RachaSemSkins101.ehPronta(modelo), RachaSemSkins101.ehPronta(TP_PADRAO_COD), RachaSemSkins101.ehPronta(TP_TIME_COD[1])];
          r.equipaPronta = tpEquipa(pre);
          const D = TP_PADRAO_D(); D.pc = ['#123456', '#abcdef', '#00ff00']; const minha = tpCodigo(tpNorm(D));
          r.criadaPronta = RachaSemSkins101.ehPronta(minha); r.equipaCriada = tpEquipa(minha); r.minha = tpMinha() === minha;
          const antes = TP.equipada; TP.equipada = pre; r.guardada = TP.equipada === pre; r.vaiInicial = tpMinha() === TP_PADRAO_COD; TP.equipada = antes;
          r.outro = tpSkin(pre).id === tpSkin(TP_PADRAO_COD).id && tpNoTime(pre, 1) === tpNoTime(TP_PADRAO_COD, 1);
          const enviados = []; const ws0 = NET49.ws; NET49.ws = {readyState:1, bufferedAmount:0, url:location.href, send:s => enviados.push(JSON.parse(s))};
          try { net49Send({type:'profile', name:'X', skin:pre}); } catch (e) { r.erroEnvio = String(e); } NET49.ws = ws0;
          r.enviou = enviados.length ? enviados[0].skin === TP_PADRAO_COD : null;
          abreTela('cofre'); let tela = document.querySelector('#lb-camada .lb-tela:not([hidden])');
          r.cofre = {exclusivas:tela.querySelectorAll('.cf90-tp.exclusiva').length, nota:!!tela.querySelector('.v101-cofre-nota'), criar:!!tela.querySelector('.cf90-criar')}; fechaTela();
          abreTela('skins', 'cofre'); tela = document.querySelector('#lb-camada .lb-tela:not([hidden])');
          r.editor = [...tela.querySelectorAll('.tpe-aba')].map(b => b.textContent.trim()).join('|'); fechaTela();
          abreTela('loja'); r.lojaExclusivas = /TAMPINHAS EXCLUSIVAS/.test(document.querySelector('#lb-camada .lb-tela:not([hidden])').textContent); fechaTela();
          return r; })()"""
        b, pg, erros = await abre(pw, w=1280, h=720)
        try:
            r = await rt(pg, SK)
            P.confere(r['esconde'] and r['quantas'] >= 60, 'as prontas fora: o jogo reconhece %d códigos de prontas' % r['quantas'], r)
            P.confere(r['pronta'] == [True, True, False, False], 'a animada e o modelo pronto são prontas; a inicial (e a do time) nunca', r['pronta'])
            P.confere(r['abas'] == 'p,b,i,inv' and 'MODELOS' not in r['editor'], 'o editor sem a aba MODELOS PRONTOS (PADRÃO, BORDA, ÍCONE, INVENTÁRIO)', (r['abas'], r['editor']))
            P.confere(r['equipaPronta'] is False, 'equipar uma pronta não vale (o aviso diz para criar a sua)', r['equipaPronta'])
            P.confere(not r['criadaPronta'] and r['equipaCriada'] and r['minha'], 'a criada no editor equipa normal', r)
            P.confere(r['guardada'] and r['vaiInicial'], 'quem estava com uma pronta: ela fica guardada e a tampinha vale a inicial', r)
            P.confere(r['outro'], 'a pronta de outro jogador aparece como a inicial (na cor do time)', r['outro'])
            P.confere(r['enviou'] is True, 'para o servidor vai a inicial no lugar da pronta', r.get('enviou'))
            P.confere(r['cofre']['exclusivas'] == 0 and r['cofre']['nota'] and r['cofre']['criar'], 'o COFRE: sem as exclusivas, com o aviso e o CRIAR TAMPINHA', r['cofre'])
            P.confere(not r['lojaExclusivas'], 'a LOJA sem as TAMPINHAS EXCLUSIVAS (as peças do editor continuam)', r['lojaExclusivas'])
        finally:
            await b.close()
        b, pg, erros = await abre(pw, w=1280, h=720, config={'skinsProntas': True})
        try:
            r = await rt(pg, "(() => ({esconde: RachaSemSkins101.esconde(), abas: TPE_ABAS.T.map(a => a[0]).join(','), equipa: tpEquipa(SK76_PRE[0].cod), minha: tpMinha() === SK76_PRE[0].cod, classe: document.documentElement.classList.contains('v101-semskins')}))()")
            P.confere(not r['esconde'] and 'pre' in r['abas'] and r['equipa'] and r['minha'] and not r['classe'], 'o interruptor (RACHA_CONFIG.skinsProntas: true) traz as prontas de volta', r)
        finally:
            await b.close()
    return P.fim()

if __name__ == '__main__':
    roda(principal())
