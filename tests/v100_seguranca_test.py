"""RACHA v100 · A REVISÃO DE SEGURANÇA — o lado do jogo (no navegador; o servidor e a plataforma estão em
tests/v100_seguranca_test.mjs):
  1) o convite com OUTRO servidor (?servidor= no link): antes o jogo trocava de servidor sozinho, guardava a troca e mandava
     o bilhete da conta (que abre as salas como a conta) para aquele endereço. Agora ele pergunta antes (OUTRO SERVIDOR), diz
     que a conta não vai junto quando o servidor não é do RACHA, FICAR AQUI esquece o convite e TROCAR DE SERVIDOR guarda a
     troca e abre de novo com o código da sala; o convite do próprio servidor entra direto, sem pergunta;
  2) o bilhete da conta só vai no hello para o servidor do jogo (o do config.js, os de servidoresConfiaveis, o mesmo endereço
     da página) e só o de até 12 minutos (o bilhete vale 15);
  3) a página aberta pelo servidor (http): o próprio endereço é o servidor do jogo.
  python3 tests/v100_seguranca_test.py
"""
import asyncio, functools, http.server, json, pathlib, sys, threading, time
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from comum import Placar, PAGINA, RAIZ, abre, rt, roda
from playwright.async_api import async_playwright

CFG = {'servidor': 'jogo.racha.test', 'servidoresConfiaveis': ['outro.racha.test']}
POP = """(() => ({aberto: !LB.pop.hidden, txt: LB.pop.hidden ? '' : LB.popCaixa.textContent,
  botoes: [...LB.popCaixa.querySelectorAll('button')].map(b => b.textContent)}))()"""


def url_convite(sala, servidor):
    return PAGINA.resolve().as_uri() + '?sala=' + sala + '&servidor=' + servidor


async def chama_convite(pg):
    """O convite que esperava a primeira vez (a tela de boas-vindas) fechar: o jogo chama de novo quando ela fecha."""
    return await rt(pg, """(() => { if (LB.pop.hidden){ ONB.aberto = false; ONB.aquece = false; slEntrarConvite(); }
      return {aberto: !LB.pop.hidden}; })()""")


async def clica(pg, texto):
    return await rt(pg, "(() => { const b = [...LB.popCaixa.querySelectorAll('button')].find(x => x.textContent === %s); if (!b) return false; b.click(); return true; })()" % json.dumps(texto))


def so_erros_de_js(erros):
    return [e for e in erros if not e.startswith('console:')]   # (as tentativas de conexão sem internet aparecem no console)


async def principal():
    P = Placar('v100 · a revisão de segurança (o jogo)')
    async with async_playwright() as pw:
        # ------------------------------------------------------------------ 1) o convite com um servidor de fora
        print('1) o convite com um servidor que não é do RACHA (?servidor=evil.example.com)')
        b, pg, erros = await abre(pw, config=CFG, url=url_convite('ABC123', 'evil.example.com'))
        try:
            await pg.wait_for_timeout(700)
            e0 = await rt(pg, """(() => ({salvo: localStorage.getItem('streetball-server'), busca: location.search, convite: SL.convite,
              espera: SL.servidorConvite, ws: NET49.ws ? NET49.ws.url : null, onb: ONB.aberto}))()""")
            P.confere(e0['salvo'] is None, 'o endereço do link NÃO fica guardado sozinho (antes: localStorage na hora)', e0)
            P.confere(e0['busca'] == '', 'o link sai da barra de endereço (como antes: ?sala e ?servidor)', e0)
            P.confere(not (e0['ws'] or '').startswith('wss://evil'), 'e o jogo não conectou no servidor do link', e0)
            await chama_convite(pg)
            p1 = await rt(pg, POP)
            P.confere(p1['aberto'] and 'OUTRO SERVIDOR' in p1['txt'] and 'evil.example.com' in p1['txt'],
                      'a janela OUTRO SERVIDOR, com o endereço do link', p1)
            P.confere('não é o servidor do RACHA' in p1['txt'] and 'A sua conta não vai junto' in p1['txt'],
                      'o aviso: não é o servidor do RACHA e a conta não vai junto', p1['txt'])
            P.confere(p1['botoes'] == ['FICAR AQUI', 'TROCAR DE SERVIDOR'], 'os botões FICAR AQUI e TROCAR DE SERVIDOR', p1['botoes'])
            await clica(pg, 'FICAR AQUI')
            await pg.wait_for_timeout(300)
            e1 = await rt(pg, """(() => ({aberto: !LB.pop.hidden, salvo: localStorage.getItem('streetball-server'), convite: SL.convite,
              espera: SL.servidorConvite, srv: servidorEndereco(), ws: NET49.ws ? NET49.ws.url : null}))()""")
            P.confere(not e1['aberto'] and e1['salvo'] is None and e1['convite'] == '' and e1['espera'] is None and e1['srv'] == 'wss://jogo.racha.test/'
                      and not (e1['ws'] or '').startswith('wss://evil'), 'FICAR AQUI: o convite some, o servidor continua o do jogo e nada fica guardado', e1)

            # ------------------------------------------------------------------ 2) o bilhete da conta só para o servidor do jogo
            print('\n2) o bilhete da conta (no hello) só para o servidor do jogo')
            h = await rt(pg, """(() => {
              const ws0 = NET49.ws, r = {};
              V70ON.bilhete = 'corpo.assinatura'; V70ON.bilheteT = Date.now();
              const com = u => { NET49.ws = u ? {url:u} : null; try { return v70HelloExtra(); } finally { NET49.ws = ws0; } };
              r.semWs = com(null); r.fora = com('wss://evil.example.com/'); r.jogo = com('wss://jogo.racha.test/');
              r.confiavel = com('wss://outro.racha.test/'); r.parecido = com('wss://jogo.racha.test.evil.example.com/');
              V70ON.bilheteT = Date.now() - 13*60e3; r.velho = com('wss://jogo.racha.test/');
              V70ON.bilhete = null; V70ON.bilheteT = 0;
              r.oficiais = RachaSeguranca100.oficiais(); r.erro = RachaSeguranca100.estado().erro;
              return r; })()""")
            P.confere(h['jogo'].get('conta') == 'corpo.assinatura' and h['confiavel'].get('conta') == 'corpo.assinatura',
                      'o servidor do jogo (o do config.js) e o de servidoresConfiaveis recebem o bilhete', h)
            P.confere('conta' not in h['fora'] and 'conta' not in h['parecido'] and 'conta' not in h['semWs'],
                      'o servidor de fora (e o que só começa igual: jogo.racha.test.evil…) não recebe', h)
            P.confere('conta' not in h['velho'], 'o bilhete de mais de 12 minutos não vai (vale 15 no servidor; o jogo pede outro)', h['velho'])
            P.confere(h['jogo'].get('v93') == 1 and h['jogo'].get('cr') == 1 and h['jogo'].get('rch') == 1 and h['fora'].get('cr') == 1,
                      'o resto do hello continua igual (v93, rch, cr: as versões de antes)', h['jogo'])
            P.confere(h['oficiais'] == ['jogo.racha.test', 'outro.racha.test'] and not h['erro'], 'os servidores do jogo: o do config.js e os confiáveis (aberto do arquivo)', h)
            # (qualquer mensagem com a conta: a troca de amigos/bloqueios/cosméticos — "relacoes" — e o Chat do Brasil)
            env = await rt(pg, """(() => {
              const cap = [], ws0 = NET49.ws, b0 = BRASIL.ws;
              const falso = u => ({url:u, readyState:1, bufferedAmount:0, send:t => cap.push([u, JSON.parse(t)])});
              V70ON.bilhete = 'corpo.assinatura'; V70ON.bilheteT = Date.now();
              try {
                NET49.ws = falso('wss://jogo.racha.test/'); net49Send({type:'relacoes', conta:'corpo.assinatura'});
                NET49.ws = falso('wss://evil.example.com/'); net49Send({type:'qualquer', conta:'corpo.assinatura'});   // (a relacoes tem ritmo: 1 a cada 5 s)
                BRASIL.ws = falso('wss://jogo.racha.test/'); brasilSend({type:'brasil_join', name:'Ana'});
                BRASIL.ws = falso('wss://evil.example.com/'); brasilSend({type:'brasil_join', name:'Ana', conta:'corpo.assinatura'});
              } finally { NET49.ws = ws0; BRASIL.ws = b0; V70ON.bilhete = null; V70ON.bilheteT = 0; }
              return cap.map(([u, m]) => [u.indexOf('evil') >= 0 ? 'fora' : 'jogo', m.type, m.conta || null]); })()""")
            P.confere(env == [['jogo', 'relacoes', 'corpo.assinatura'], ['fora', 'qualquer', None], ['jogo', 'brasil_join', 'corpo.assinatura'], ['fora', 'brasil_join', None]],
                      'a troca de amigos/bloqueios (relacoes) e o Chat do Brasil: a conta só vai para o servidor do jogo (o jogo tira de qualquer mensagem para outro)', env)
            dem = await rt(pg, """(async () => {
              const cap = [], ws0 = NET49.ws, log0 = v88Logado, pede0 = v70PedeBilhete;
              const falso = u => ({url:u, readyState:1, bufferedAmount:0, send:t => cap.push(JSON.parse(t))});
              V70ON.bilhete = 'velho.bilhete'; V70ON.bilheteT = Date.now() - 11*60e3;
              v88Logado = () => true;
              v70PedeBilhete = () => new Promise(r => setTimeout(() => { V70ON.bilhete = 'novo.bilhete'; V70ON.bilheteT = Date.now(); r('novo.bilhete'); }, 300));
              try {
                NET49.ws = falso('wss://jogo.racha.test/');
                net49Send({type:'hello', name:'Ana', token:'t'});
                const logo = cap.length;
                await new Promise(r => setTimeout(r, 700));
                return {logo, depois:cap.map(m => [m.type, m.conta || null])};
              } finally { NET49.ws = ws0; v88Logado = log0; v70PedeBilhete = pede0; V70ON.bilhete = null; V70ON.bilheteT = 0; }
            })()""")
            P.confere(dem['logo'] == 0 and dem['depois'] == [['hello', 'novo.bilhete']],
                      'o bilhete de 11 minutos (o celular que voltou do segundo plano): o jogo pede outro antes do hello e volta com a conta', dem)
            je = so_erros_de_js(erros)
            P.confere(not je, 'sem erro de JavaScript', je)
        finally:
            await b.close()

        # ------------------------------------------------------------------ 1b) TROCAR DE SERVIDOR
        print('\n1b) TROCAR DE SERVIDOR: guarda a troca e abre de novo com o código da sala')
        b, pg, erros = await abre(pw, config=CFG, url=PAGINA.resolve().as_uri() + '?x=1&sala=XYZ789&servidor=evil.example.com')
        try:
            navs = []
            pg.on('framenavigated', lambda f: navs.append(f.url) if f == pg.main_frame else None)
            await pg.wait_for_timeout(500)
            await chama_convite(pg)
            p2 = await rt(pg, POP)
            P.confere(p2['aberto'] and 'OUTRO SERVIDOR' in p2['txt'], 'a janela aparece de novo para o outro link', p2)
            cv = await rt(pg, "SL.convite")
            P.confere(cv == '', 'com a janela aberta, o código da sala fica só nela (a conexão daqui não entra numa sala com esse código)', cv)
            async with pg.expect_navigation(timeout=15000):
                await clica(pg, 'TROCAR DE SERVIDOR')
            await pg.wait_for_function('() => typeof window.__RT === "function"', polling=100, timeout=20000)
            await pg.wait_for_timeout(500)
            e2 = await rt(pg, "(() => ({salvo: localStorage.getItem('streetball-server'), srv: servidorEndereco(), espera: SL.servidorConvite}))()")
            reab = [u for u in navs if 'racha_teste.html?' in u and 'sala=XYZ789' in u and 'x=1' in u and 'servidor=' not in u]
            P.confere(e2['salvo'] == 'wss://evil.example.com/' and e2['srv'] == 'wss://evil.example.com/' and e2['espera'] is None,
                      'a troca ficou guardada (só porque a pessoa quis)', e2)
            P.confere(bool(reab), 'e o jogo abriu de novo com ?sala=XYZ789 e o resto do endereço (sem o ?servidor: não pergunta de novo)', navs)
            je = so_erros_de_js(erros)
            P.confere(not je, 'sem erro de JavaScript', je)
        finally:
            await b.close()

        # ------------------------------------------------------------------ 1c) os servidores do RACHA
        print('\n1c) o convite de um servidor do RACHA')
        b, pg, erros = await abre(pw, config=CFG, url=url_convite('OUT001', 'outro.racha.test'))
        try:
            await pg.wait_for_timeout(500)
            await chama_convite(pg)
            p3 = await rt(pg, POP)
            P.confere(p3['aberto'] and 'outro servidor do RACHA (outro.racha.test)' in p3['txt'] and 'não vai junto' not in p3['txt'],
                      'outro servidor do RACHA (servidoresConfiaveis): pergunta, sem o aviso da conta', p3['txt'])
        finally:
            await b.close()
        b, pg, erros = await abre(pw, config=CFG, url=url_convite('MSM001', 'jogo.racha.test'))
        try:
            await pg.wait_for_timeout(500)
            r = await chama_convite(pg)
            e4 = await rt(pg, "(() => ({pop: LB.pop.hidden ? '' : LB.popCaixa.textContent, codigo: ONF.codigo, espera: SL.servidorConvite, salvo: localStorage.getItem('streetball-server'), lobby: lobby.aberto}))()")
            # (o salvo: o net49Connect de sempre guarda o endereço em que conectou — aqui, o do próprio jogo)
            P.confere(not r['aberto'] and 'OUTRO SERVIDOR' not in e4['pop'] and e4['codigo'] == 'MSM001' and e4['espera'] is None and e4['salvo'] in (None, 'wss://jogo.racha.test/') and e4['lobby'],
                      'o convite do próprio servidor do jogo: entra direto na sala, sem pergunta (e o endereço continua o do jogo)', e4)
        finally:
            await b.close()

        # ------------------------------------------------------------------ 3) a página aberta pelo servidor (http)
        print('\n3) a página aberta pelo servidor do jogo (http): o mesmo endereço é o servidor do jogo')
        class Quieto(http.server.SimpleHTTPRequestHandler):
            def log_message(self, *a):
                pass
        srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Quieto, directory=str(RAIZ)))
        threading.Thread(target=srv.serve_forever, daemon=True).start()
        porta = srv.server_address[1]
        base = 'http://127.0.0.1:%d/tests/build/racha_teste.html' % porta
        b, pg, erros = await abre(pw, url=base + '?sala=LOC001&servidor=127.0.0.1:%d' % porta)
        try:
            await pg.wait_for_timeout(500)
            r = await chama_convite(pg)
            e5 = await rt(pg, """(() => { const ws0 = NET49.ws; V70ON.bilhete = 'corpo.assinatura'; V70ON.bilheteT = Date.now();
              NET49.ws = {url: servidorEndereco()}; const o = v70HelloExtra(); NET49.ws = {url:'wss://evil.example.com/'}; const f = v70HelloExtra();
              NET49.ws = ws0; V70ON.bilhete = null;
              return {oficiais: RachaSeguranca100.oficiais(), srv: servidorEndereco(), conta: o.conta || null, fora: f.conta || null, codigo: ONF.codigo,
                pop: LB.pop.hidden ? '' : LB.popCaixa.textContent}; })()""")
            P.confere(e5['oficiais'] == ['127.0.0.1:%d' % porta] and e5['srv'] == 'ws://127.0.0.1:%d/' % porta,
                      'o servidor do jogo é o próprio endereço da página (sem config.js)', e5)
            P.confere(e5['conta'] == 'corpo.assinatura' and e5['fora'] is None, 'o bilhete vai para ele e não para o de fora', e5)
            P.confere(not r['aberto'] and 'OUTRO SERVIDOR' not in e5['pop'] and e5['codigo'] == 'LOC001', 'o convite com o mesmo endereço entra direto', e5)
        finally:
            await b.close()
            srv.shutdown()
    return P.fim()


if __name__ == '__main__':
    roda(principal())
