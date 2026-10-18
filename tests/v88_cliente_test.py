"""v88 · o JOGO de verdade (tests/build/racha_teste.html) logado na PLATAFORMA DE TESTE (tests/plataforma: o código de app/api
com SQLite e o servidor das salas montado no mesmo endereço). Duas contas em dois navegadores, pelos botões da tela:
o login do jogo, o correio (COLETAR uma vez só, no servidor), a loja (comprar e equipar, a carteira do servidor), amigos
(buscar, pedir, aceitar, o status online de verdade), a mensagem direta, o convite para a sala, quem assiste (o SAIR e a
câmera CAMPO INTEIRO), a denúncia, as missões (COLETAR), o passe (COLETAR), os eventos, as estatísticas da conta, a
privacidade, o treino rendendo na conta, o treino com bots sem valer nada e — reiniciando o servidor com o mesmo banco —
tudo continua lá.
  python3 tests/v88_cliente_test.py
"""
import asyncio, json, os, sys, socket, subprocess, tempfile, time, urllib.request, urllib.parse, pathlib, uuid
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from comum import Placar, RAIZ, CHROME, HARNESS, FONTES, rt
from playwright.async_api import async_playwright


def porta_livre():
    s = socket.socket(); s.bind(('127.0.0.1', 0)); p = s.getsockname()[1]; s.close(); return p


class Plataforma:
    def __init__(self, banco):
        self.banco, self.p, self.porta = banco, None, None

    def sobe(self):
        self.porta = porta_livre()
        env = dict(os.environ, RACHA_PRESENTE_TESTE='1')
        self.p = subprocess.Popen(['node', str(RAIZ / 'tests' / 'plataforma' / 'servidor.mjs'), '--porta', str(self.porta), '--teste', '--banco', self.banco, '--sem-compilar'],
                                  cwd=str(RAIZ), env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
        t0 = time.time()
        while time.time() - t0 < 40:
            try:
                with urllib.request.urlopen(self.base + '/__teste/saude', timeout=1) as r:
                    if json.loads(r.read()).get('ok'): return self
            except Exception:
                time.sleep(.25)
        raise RuntimeError('a plataforma de teste não subiu')

    @property
    def base(self):
        return 'http://127.0.0.1:%d' % self.porta

    def desce(self):
        if self.p:
            self.p.terminate()
            try: self.p.wait(5)
            except Exception: self.p.kill()
            self.p = None

    def api(self, proc, inp=None, token=None, query=False):
        corpo = json.dumps({'0': {'json': inp}})
        url = self.base + '/api/trpc/' + proc + '?batch=1' + ('&input=' + urllib.parse.quote(corpo) if query else '')
        req = urllib.request.Request(url, data=None if query else corpo.encode(), method='GET' if query else 'POST',
                                     headers={'content-type': 'application/json', **({'authorization': 'Bearer ' + token} if token else {})})
        try:
            with urllib.request.urlopen(req, timeout=15) as r: l = json.loads(r.read())
        except urllib.error.HTTPError as e:
            l = json.loads(e.read())
        um = l[0]
        if 'error' in um: raise RuntimeError(um['error']['json']['message'])
        return um['result']['data']['json']

    def q(self, proc, inp=None, token=None): return self.api(proc, inp, token, True)
    def m(self, proc, inp=None, token=None): return self.api(proc, inp, token, False)

    def sql(self, sql, params=None):
        req = urllib.request.Request(self.base + '/__teste/sql', data=json.dumps({'sql': sql, 'params': params or []}).encode(), method='POST', headers={'content-type': 'application/json'})
        with urllib.request.urlopen(req, timeout=10) as r: return json.loads(r.read()).get('linhas')


def conta(PL, nome):
    r = PL.m('auth.registrar', {'username': nome, 'nomeExibicao': nome, 'senha': 'senha1234', 'confirmacaoSenha': 'senha1234', 'email': nome + '@x.com', 'aceiteTermos': True})
    return {'token': r['token'], 'pub': r['conta']['idPublico'], 'nome': nome}


async def espera(pg, js, ms=8000, passo=150):
    t0 = time.time(); v = None
    while (time.time() - t0)*1000 < ms:
        try: v = await rt(pg, js)
        except Exception: v = None
        if v: return v
        await asyncio.sleep(passo/1000)
    return v


async def abre_logado(pw, PL, usuario, w=1280, h=720):
    b = await pw.chromium.launch(executable_path=CHROME, args=['--no-sandbox', '--autoplay-policy=no-user-gesture-required'])
    ctx = await b.new_context(viewport={'width': w, 'height': h}, has_touch=True)
    await ctx.add_init_script("document.addEventListener('DOMContentLoaded',()=>{const s=document.createElement('style');s.textContent=%s;document.head.prepend(s);});" % json.dumps(FONTES))
    await ctx.add_init_script('window.RACHA_CONFIG = {presente:false};')
    pg = await ctx.new_page()
    erros = []
    pg.on('pageerror', lambda e: erros.append(str(e)[:300] + ' @ ' + str(getattr(e, 'stack', '') or '')[:400]))
    pg.on('console', lambda m: erros.append('console: ' + m.text[:200]) if m.type == 'error' and 'Failed to load resource' not in m.text else None)
    await pg.goto(PL.base + '/tests/build/racha_teste.html')
    await pg.wait_for_selector('#v84auth input[autocomplete="username"]', timeout=20000)
    await pg.fill('#v84auth input[autocomplete="username"]', usuario)
    await pg.fill('#v84auth input[type="password"]', 'senha1234')
    await pg.click('#v84auth .v84-go')
    t0 = time.time()                                        # (a primeira entrada recarrega a página: o aparelho passa a ser desta conta)
    while time.time() - t0 < 25:
        try:
            if await pg.evaluate('() => typeof window.__RT === "function" && !!window.__RT("v88Logado() && lobby.aberto")'): break
        except Exception: pass
        await asyncio.sleep(.3)
    await pg.evaluate("(() => { const o = document.getElementById('onb'); if (o) o.hidden = true; })()")
    await rt(pg, HARNESS)
    return b, pg, erros


async def clica_texto(pg, sel, texto):
    """Clica (pelo JS) no primeiro elemento de sel cujo texto contém texto; devolve se achou."""
    return await rt(pg, "(() => { const el = [...document.querySelectorAll(%s)].find(x => (x.textContent || '').indexOf(%s) >= 0 && !x.disabled && x.offsetParent !== null); if (!el) return false; el.click(); return true; })()" % (json.dumps(sel), json.dumps(texto)))


async def principal():
    P = Placar('v88 · o jogo logado na plataforma de teste (dois navegadores, pelos botões)')
    banco = os.path.join(tempfile.mkdtemp(prefix='racha88c-'), 'plataforma.sqlite')
    PL = Plataforma(banco).sobe()
    erros_todos = []
    try:
        A, B, C = conta(PL, 'kauazin7'), conta(PL, 'lucasznx'), conta(PL, 'santiagox')
        async with async_playwright() as pw:
            print('\n1) o login do jogo e o lobby da conta')
            ba, pa, ea = await abre_logado(pw, PL, 'kauazin7')
            erros_todos.append(ea)
            r = await rt(pa, "({logado:v88Logado(), pub:v88Pub(C82.conta.idPublico), carteiraOk:V88.carteiraOk, moedas:CONTA.moedas, gemas:CONTA.gemas, amg:!!document.querySelector('#lb .v88-amg'), vazio:(document.querySelector('#lb .v88-amg-vazio') || {}).textContent || ''})")
            est = PL.q('loja.estado', None, A['token'])
            P.confere(r['logado'] and r['pub'] == str(A['pub']).zfill(6) and r['carteiraOk'], 'entrou pelo formulário do jogo: a conta é a do servidor (ID ' + str(A['pub']) + ')', r)
            P.confere(r['moedas'] == est['carteira']['moedas'] and r['gemas'] == est['carteira']['gemas'], 'a carteira da tela é a do servidor (loja.estado)', [r['moedas'], r['gemas'], est['carteira']])
            P.confere(r['amg'] and 'Nenhum amigo' in r['vazio'], 'o lobby tem a lista dos amigos (vazia: "Nenhum amigo ainda")', r['vazio'])
            selo = await espera(pa, "(document.querySelector('#lb .v88-caixa .v88-selo') || {}).textContent", 6000)
            P.confere(selo and int(selo.replace('+', '')) >= 2, 'a CAIXA DE ENTRADA do topo mostra o número do que chegou (o login do dia e o presente de teste)', selo)

            print('\n2) o correio: COLETAR (o servidor entrega uma vez só)')
            await rt(pa, "(() => { document.querySelector('#lb .v88-caixa').click(); return 1; })()")
            n = await espera(pa, "v88Aberta('v88caixa') && (V88M.cartas || []).length", 6000)
            P.confere(n and n >= 2, 'o botão abre a CAIXA DE ENTRADA com as cartas do servidor', n)
            ok = await rt(pa, "(() => { const li = [...document.querySelectorAll('#tela-v88caixa .v88-cartas .v88-linha')].find(x => /Presente de teste/.test(x.textContent)); if (!li) return false; li.querySelector('.v88-linha-tx').click(); return true; })()")
            antes = await rt(pa, 'CONTA.moedas')
            ok2 = await espera(pa, "(() => { const b = [...document.querySelectorAll('#tela-v88caixa .v88-carta-ac button')].find(x => x.textContent === 'COLETAR'); if (!b) return false; b.click(); return true; })()", 3000)
            depois = await espera(pa, "CONTA.moedas > %d ? CONTA.moedas : 0" % antes, 6000)
            est = PL.q('loja.estado', None, A['token'])
            P.confere(ok and ok2 and depois == antes + 50000 and est['carteira']['moedas'] == depois, 'COLETAR o presente: +50.000 moedas na carteira do servidor e na tela', [antes, depois, est['carteira']['moedas']])
            carta = [c for c in PL.q('correio.listar', None, A['token']) if c['titulo'] == 'Presente de teste'][0]
            try:
                PL.m('correio.coletar', {'id': carta['id']}, A['token']); de_novo = None
            except Exception as e:
                de_novo = str(e)
            P.confere(carta['coletado'] and de_novo and 'coletad' in de_novo, 'coletar de novo: o servidor recusa (uma vez só)', de_novo)
            sem_bt = await rt(pa, "![...document.querySelectorAll('#tela-v88caixa .v88-carta-ac button')].some(x => x.textContent === 'COLETAR')")
            P.confere(sem_bt, 'na tela, a carta coletada não tem mais o COLETAR', sem_bt)

            print('\n3) a loja: comprar e equipar (o servidor confere preço e saldo)')
            await rt(pa, "(() => { fechaTela(); abreTela('loja'); return 1; })()")
            await espera(pa, "v88Aberta('loja') && !!V88.estado", 6000)
            await rt(pa, "(() => { document.querySelector('#tela-loja .v88-cat[data-cat=\"bolas\"]').click(); return 1; })()")
            ok = await espera(pa, "(() => { const b = [...document.querySelectorAll('#tela-loja .v88-item')].find(x => /Bola de Rua/.test(x.textContent)); if (!b) return false; b.click(); return true; })()", 3000)
            m0 = await rt(pa, 'CONTA.moedas')
            ok = ok and await espera(pa, "(() => { const b = [...document.querySelectorAll('#pop-caixa .pop-acoes button')].find(x => x.textContent === 'COMPRAR'); if (!b) return false; b.click(); return true; })()", 3000)
            await asyncio.sleep(.4)
            ok = ok and await espera(pa, "(() => { const b = [...document.querySelectorAll('#pop-caixa .pop-acoes button')].find(x => x.textContent === 'COMPRAR'); if (!b) return false; b.click(); return true; })()", 3000)
            eq = await espera(pa, "(() => { const b = [...document.querySelectorAll('#pop-caixa .pop-acoes button')].find(x => x.textContent === 'EQUIPAR AGORA'); if (!b) return false; b.click(); return true; })()", 6000)
            await asyncio.sleep(1.2)
            est = PL.q('loja.estado', None, A['token'])
            inv = [i if isinstance(i, str) else i.get('codigo') for i in est['inventario']]
            m1 = await rt(pa, 'CONTA.moedas')
            P.confere(ok and 'bola_rua' in inv and m1 == m0 - 1500 and est['carteira']['moedas'] == m1, 'COMPRAR a Bola de Rua: o item na conta e −1.500 moedas (servidor e tela iguais)', [m0, m1, est['carteira'], 'bola_rua' in inv])
            P.confere(eq and est['equipados'].get('bola') == 'bola_rua' and await rt(pa, "v88Equipado('bola') === 'bola_rua'"), 'EQUIPAR AGORA: a bola equipada é a da conta', est['equipados'])
            try:
                PL.m('loja.comprar', {'codigo': 'bola_ouro', 'preco': {'moedas': 0, 'gemas': 1}}, A['token']); preco = None
            except Exception as e:
                preco = str(e)
            P.confere(preco is not None, 'preço mandado errado pelo aparelho: o servidor recusa', preco)

            print('\n4) amigos: buscar, pedir e aceitar (dois navegadores)')
            await rt(pa, "(() => { fechaTela(); v88AbreAmigos('buscar'); return 1; })()")
            await espera(pa, "v88Aberta('v88amigos') && !!document.querySelector('#tela-v88amigos .v88-busca input')", 4000)
            await pa.fill('#tela-v88amigos .v88-busca input', 'luc')
            await rt(pa, "(() => { document.querySelector('#tela-v88amigos .v88-busca button[type=submit]').click(); return 1; })()")
            achou = await espera(pa, "(() => { const li = [...document.querySelectorAll('#tela-v88amigos .v88-linha')].find(x => /lucasznx/.test(x.textContent)); return li ? li.textContent : ''; })()", 6000)
            P.confere(achou and 'ID' in achou, 'BUSCAR "luc": acha o lucasznx (nível e ID de verdade)', achou)
            await clica_texto(pa, '#tela-v88amigos .v88-linha button', 'ADICIONAR')
            await asyncio.sleep(.8)
            ped = PL.q('amigos.pedidos', None, A['token'])
            P.confere(any(p['jogador']['idPublico'] == B['pub'] for p in ped['enviados']), 'ADICIONAR: o pedido está no servidor (enviados)', ped['enviados'])
            bb, pb, eb = await abre_logado(pw, PL, 'lucasznx')
            erros_todos.append(eb)
            nped = await espera(pb, "(V88.resumo || {}).pedidos", 6000)
            sel_amg = await rt(pb, "(document.querySelector('#lb [data-rx=\"amigos\"] .v88-selo') || document.querySelector('#lb .v77-amg .v88-selo') || {}).textContent || ''")
            P.confere(nped == 1 and sel_amg, 'no outro navegador: o pedido chega (o número vermelho no AMIGOS)', [nped, sel_amg])
            await rt(pb, "(() => { v88AbreAmigos('pedidos'); return 1; })()")
            await espera(pb, "v88Aberta('v88amigos') && V88A.pedidos && V88A.pedidos.recebidos.length", 6000)
            ok = await espera(pb, "(() => { const li = [...document.querySelectorAll('#tela-v88amigos .v88-linha')].find(x => /kauazin7/.test(x.textContent)); const b = li && li.querySelector('.v88-btic[aria-label=\"Aceitar\"]'); if (!b) return false; b.click(); return true; })()", 4000)
            await asyncio.sleep(1)
            amA = PL.q('social.amigos', None, A['token'])
            P.confere(ok and any(x['idPublico'] == B['pub'] for x in amA), 'ACEITAR: viraram amigos no servidor', [x['idPublico'] for x in amA])
            on = await espera(pa, "(() => { v88CarregaAmigos(true); const s = v88StatusDe('%s'); return s ? s.st : ''; })()" % str(B['pub']).zfill(6), 12000, 400)
            P.confere(on, 'o status do amigo é de verdade: o servidor das salas diz que ele está online', on)
            await rt(pa, "(() => { fechaTela(); v88LobbyPinta(); return 1; })()")
            linha = await espera(pa, "(document.querySelector('#lb .v88-amg-i') || {}).textContent || ''", 5000)
            P.confere('lucasznx' in (linha or '') and 'online' in (linha or ''), 'o painel dos amigos do lobby mostra o amigo online', linha)

            print('\n5) a mensagem direta (o chat dos amigos)')
            await rt(pa, "(() => { V88.dmAlvo = '%s'; abreTela('v88chat'); return 1; })()" % str(B['pub']).zfill(6))
            await espera(pa, "CB.aberto && CB.aba === 'amigos'", 4000)
            await rt(pa, "(() => { CB.inp.value = 'bora jogar?'; return cbDiz('bora jogar?'); })()")
            msg = await espera(pb, "((V88.dms.get('%s') || []).find(m => m.texto === 'bora jogar?') || {}).texto" % str(A['pub']).zfill(6), 6000)
            nl = await rt(pb, "V88.dmNaoLidas.get('%s') || 0" % str(A['pub']).zfill(6))
            P.confere(msg == 'bora jogar?' and nl >= 1, 'a mensagem chega no outro navegador (e conta como não lida)', [msg, nl])
            await rt(pa, "(() => { try { cbFecha(); } catch (_) {} return 1; })()")

            print('\n6) o convite para a sala e quem assiste')
            await rt(pa, "(() => { v88ConvidaComSala('%s', 'lucasznx'); return 1; })()" % str(B['pub']).zfill(6))
            await espera(pa, "!LB.pop.hidden", 3000)
            await clica_texto(pa, '#pop-caixa .pop-acoes button', 'CRIAR E CHAMAR')
            sala = await espera(pa, "NET49.room && NET49.room.code", 8000)
            pop = await espera(pb, "!LB.pop.hidden && LB.popCaixa.classList.contains('v88-convite-pop')", 8000)
            P.confere(sala and pop, 'CHAMAR cria a sala (fechada, com bots) e o convite aparece no outro navegador', [sala, pop])
            await clica_texto(pb, '#pop-caixa .pop-acoes button', 'ENTRAR')
            dentro = await espera(pb, "NET49.room && NET49.room.code === '%s'" % sala, 8000)
            P.confere(dentro, 'ENTRAR: o amigo está na sala de quem chamou', sala)
            # a partida começa (o amigo chamado entra no lugar de um bot); um terceiro entra ASSISTINDO pelo código da sala
            await rt(pa, "(() => { net49Send({type:'start'}); return 1; })()")
            joga = await espera(pb, "NET49.playing && NET49.localSlot >= 0", 10000)
            P.confere(joga, 'a partida da sala começa e o amigo chamado joga (no lugar de um bot)', await rt(pb, "({playing:NET49.playing, slot:NET49.localSlot})"))
            bc, pc, ec = await abre_logado(pw, PL, 'santiagox')
            erros_todos.append(ec)
            await espera(pc, "!!NET49.id", 8000)
            await rt(pc, "(() => { v88Assistir('%s'); return 1; })()" % sala)
            esp = await espera(pc, "NET49.playing && NET49.localSlot < 0", 10000)
            if esp:
                await asyncio.sleep(1)
                r = await rt(pc, "(() => { x49GameUI(); const s = document.getElementById('v88-espec-sair'), c = document.getElementById('x49-camera'); const nomes = []; for (let i = 0; i < RQ.jog.length + 2; i++) nomes.push(especTroca()); return {sair:!!s && !s.hidden, cam:!!c && !c.hidden, nomes, ctl:typeof drawControls}; })()")
                P.confere(r['sair'] and r['cam'] and 'CAMPO INTEIRO' in r['nomes'], 'assistindo: o SAIR e a CÂMERA na barra; a câmera passa pela bola, por cada jogador e pelo CAMPO INTEIRO', r)
                pl = await rt(pc, "RQ.placar.slice()")
                P.confere(isinstance(pl, list) and len(pl) == 2, 'quem assiste vê o placar e o tempo da partida (o mesmo do servidor)', pl)
                await rt(pc, "(() => { document.getElementById('v88-espec-sair').click(); return 1; })()")
                saiu = await espera(pc, "!NET49.room", 6000)
                P.confere(saiu, 'SAIR: quem assistia sai da sala', saiu)
            else:
                P.confere(False, 'o terceiro entrou assistindo a partida da sala', await rt(pc, "({playing:NET49.playing, slot:NET49.localSlot, room:!!NET49.room})"))
            await bc.close()
            await rt(pa, "(() => { net49Send({type:'leave'}); return 1; })()")
            await espera(pa, "!NET49.room", 6000)
            await rt(pa, "(() => { try { abrirLobby(); } catch (_) {} return 1; })()")

            print('\n7) a denúncia (vai para o servidor, com o motivo)')
            await rt(pa, "(() => { v88AbreDenuncia({alvo:'%s', nome:'lucasznx', origem:'perfil'}); return 1; })()" % str(B['pub']).zfill(6))
            await espera(pa, "!LB.pop.hidden && LB.popCaixa.classList.contains('v88-den')", 3000)
            await asyncio.sleep(.4)
            await rt(pa, "(() => { document.querySelector('#pop-caixa .v88-den-m[data-m=\"spam\"]').click(); return 1; })()")
            await asyncio.sleep(.3)
            await clica_texto(pa, '#pop-caixa .pop-acoes button', 'ENVIAR')
            await asyncio.sleep(1)
            den = PL.sql("SELECT motivo FROM denuncias")
            aberta = await espera(pa, "!LB.pop.hidden && LB.popCaixa.classList.contains('v88-den') && !(LB.popCaixa.querySelector('.pop-acoes .vermelho') || {}).disabled", 5000)
            P.confere(not den and aberta, 'conta criada agora: o servidor não aceita a denúncia (a janela fica aberta para tentar depois)', [den, aberta, await rt(pa, "({pop:!LB.pop.hidden, cls:LB.popCaixa.className, txt:LB.popCaixa.textContent.slice(0, 120), aviso:LB.aviso && LB.aviso.textContent})")])
            PL.sql("UPDATE usuarios SET criado_em = criado_em - 3600000 WHERE username IN ('kauazin7','lucasznx','santiagox')")
            await rt(pa, "(() => { if (!LB.pop.hidden) fechaPop(); v88AbreDenuncia({alvo:'%s', nome:'lucasznx', origem:'perfil'}); return 1; })()" % str(B['pub']).zfill(6))
            await espera(pa, "!LB.pop.hidden && LB.popCaixa.classList.contains('v88-den')", 3000)
            await rt(pa, "(() => { document.querySelector('#pop-caixa .v88-den-m[data-m=\"spam\"]').click(); return 1; })()")
            await clica_texto(pa, '#pop-caixa .pop-acoes button', 'ENVIAR')
            await asyncio.sleep(1)
            den = PL.sql("SELECT motivo FROM denuncias")
            P.confere(den and any(d['motivo'] == 'spam' for d in den), 'uma hora depois: ENVIAR põe a denúncia no banco (motivo spam), para o RACHA CONTROL', den)
            # a mensagem do Chat do Brasil: a ficha de quem escreveu (um VER PERFIL só) e a denúncia com o motivo ali mesmo, na ficha
            br = await espera(pa, "BRASIL.estado === 'on'", 8000) and await espera(pb, "BRASIL.estado === 'on'", 8000)
            await rt(pb, "(() => { brasilSend({type:'brasil_say', text:'gol de placa hoje'}); return 1; })()")
            m_ok = await espera(pa, "(BRASIL.msgs || []).some(m => m && m.texto === 'gol de placa hoje')", 6000)
            fi = await rt(pa, """(() => { const m = (BRASIL.msgs || []).find(x => x && x.texto === 'gol de placa hoje'); if (!m) return null;
              cbAbre('brasil'); RachaChat81.abreFicha(m, false);
              const n = [...CB.pn.querySelectorAll('.c81-f-bt')].filter(b => /VER PERFIL/.test(b.textContent)).length;
              [...CB.pn.querySelectorAll('.c81-f-bt')].find(b => /DENUNCIAR/.test(b.textContent)).click();
              const marcado = (CB.pn.querySelector('.v88-f-m.on') || {}).dataset.m;
              CB.pn.querySelector('.v88-f-m[data-m="toxico"]').click(); CB.pn.querySelector('.v88-f-envia').click(); cbFecha();
              return {verPerfil:n, marcado}; })()""")
            await asyncio.sleep(1)
            den2 = PL.sql("SELECT motivo, detalhes FROM denuncias WHERE motivo = 'toxico'")
            P.confere(br and m_ok and fi and fi['verPerfil'] == 1 and fi['marcado'] == 'ofensa' and den2 and 'gol de placa' in (den2[0]['detalhes'] or ''),
                      'Chat do Brasil: a ficha tem um VER PERFIL só; DENUNCIAR pede o motivo na ficha (OFENSA marcado) e o TÓXICO vai para o banco com o texto da mensagem', [br, m_ok, fi, den2])

            print('\n8) as partidas rendendo na conta: missões (COLETAR), passe (COLETAR), estatísticas')
            for _ in range(6):
                mid = str(uuid.uuid4())
                ini = PL.m('jogo.iniciarPartida', {'matchId': mid, 'modo': 'futebol', 'mapa': 'estadio', 'nivelBots': 'medio', 'ranqueada': False, 'online': False, 'tamanho': 2}, A['token'])
                PL.m('jogo.encerrarPartida', {'matchId': mid, 'matchToken': ini['matchToken'], 'placarNosso': 3, 'placarDeles': 1, 'gols': 2, 'assistencias': 1, 'duracaoSeg': 160}, A['token'])
            await rt(pa, "(() => { if (lobby.tela) fechaTela(); abreTela('v88missoes'); return 1; })()")
            pronta = await espera(pa, "v88Aberta('v88missoes') && (V88P.missoes || []).length && !!document.querySelector('#tela-v88missoes .v88-mis-i.pronta')", 6000)
            m0 = await rt(pa, 'CONTA.moedas')
            await clica_texto(pa, '#tela-v88missoes .v88-mis-i.pronta button', 'COLETAR')
            m1 = await espera(pa, "CONTA.moedas > %d ? CONTA.moedas : 0" % m0, 6000)
            est = PL.q('loja.estado', None, A['token'])
            P.confere(pronta and m1 and est['carteira']['moedas'] == m1, 'MISSÕES: a missão cumprida (as partidas válidas) tem COLETAR e o prêmio entra na carteira do servidor', [m0, m1, est['carteira']['moedas']])
            await rt(pa, "(() => { fechaTela(); abreTela('v88passe'); return 1; })()")
            pr = await espera(pa, "v88Aberta('v88passe') && V88P.passe && document.querySelector('#tela-v88passe .v88-pas-cel.pronto') ? 1 : 0", 6000)
            g0 = await rt(pa, 'CONTA.moedas + CONTA.gemas')
            if pr:
                await rt(pa, "(() => { document.querySelector('#tela-v88passe .v88-pas-cel.pronto').click(); return 1; })()")
            g1 = await espera(pa, "CONTA.moedas + CONTA.gemas > %d ? CONTA.moedas + CONTA.gemas : 0" % g0, 6000)
            ps = PL.q('passe.estado', None, A['token'])
            P.confere(pr and g1 and 1 in ps['coletadas']['g'], 'PASSE: o nível alcançado tem COLETAR e a recompensa entra na conta (servidor)', ps['coletadas'])
            await rt(pa, "(() => { fechaTela(); abreTela('v88eventos'); return 1; })()")
            ev = await espera(pa, "v88Aberta('v88eventos') && (V88P.eventos || []).length && document.querySelectorAll('#tela-v88eventos .v88-cat').length", 6000)
            P.confere(ev, 'EVENTOS: os eventos do servidor aparecem (com a coluna de cada um)', ev)
            await rt(pa, "(() => { fechaTela(); abreTela('perfil'); v77PfParte('est'); return 1; })()")
            n_est = await espera(pa, "(() => { const d = V88E.dados.get(v88EstChave()); return d ? d.r.partidas : 0; })()", 6000)
            card = await rt(pa, "(document.querySelector('#tela-perfil .v88-est-grade .card b') || {}).textContent || ''")
            P.confere(n_est == 6 and card == '6', 'ESTATÍSTICAS (DA CONTA): as 6 partidas que o servidor contou', [n_est, card])
            await rt(pa, "(() => { V88E.modo = 'ranqueada'; v88EstPinta(); v88EstCarrega(true); return 1; })()")
            n_rq = await espera(pa, "(() => { const d = V88E.dados.get(v88EstChave()); return d ? 'n' + d.r.partidas : ''; })()", 6000)
            P.confere(n_rq == 'n0', 'o filtro RANQUEADA: zero (as 6 foram contra os bots, sem patente)', n_rq)
            await rt(pa, "(() => { fechaTela(); return 1; })()")

            print('\n9) a privacidade (no servidor)')
            await rt(pa, "(() => { ajxAbre('social'); return 1; })()")
            await espera(pa, "!!document.getElementById('v88-pv-mostraOnline')", 6000)
            await rt(pa, "(() => { document.getElementById('v88-pv-mostraOnline').click(); return 1; })()")
            await asyncio.sleep(1)
            pv = PL.q('social.privacidade', None, A['token'])
            P.confere(pv['mostraOnline'] is False, 'Ajustes › Privacidade: "Aparecer online" desligado fica na conta', pv)
            await rt(pa, "(() => { document.getElementById('v88-pv-mostraOnline').click(); ajxFecha(); return 1; })()")
            await asyncio.sleep(.8)

            print('\n10) o treino na conta e o treino com bots (que não vale nada)')
            m0 = await rt(pa, 'CONTA.moedas')
            await rt(pa, "(() => { trEscolhe('goleiro'); jogar(); TR.pts = 20; trAcaba(); return 1; })()")
            res = await espera(pa, "V88T.ultimo && !V88T.ultimo.espera ? V88T.ultimo : null", 8000)
            m1 = await rt(pa, 'CONTA.moedas')
            P.confere(res and not res.get('erro') and res.get('moedas', 0) > 0 and m1 == m0 + res['moedas'], 'fim do exercício (Goleiro, 3 estrelas): o servidor paga na conta (jogo.treinoConcluido)', [m0, m1, res])
            await rt(pa, "(() => { abrirLobby(); v88BotsComeca(); return 1; })()")
            jogo = await espera(pa, "RQ.on && RQ.estado === 'jogo'", 10000)
            r = await rt(pa, "({mm:X49.matchMode, nome:x49ModeName(), ev:!!V70ON.ev, v80:RQ.v80})")
            P.confere(jogo and r['mm'] == 'treino' and r['nome'] == 'TREINO COM BOTS' and not r['ev'], 'TREINO COM BOTS: a partida roda sem abrir partida na conta (nada de patente, moedas ou missão)', r)
            await rt(pa, "(() => { abrirLobby(); return 1; })()")
            volta = await rt(pa, "X49.mode")
            P.confere(volta == 'ranked', 'de volta ao lobby, o JOGAR continua sendo a ranqueada', volta)

            for nome, e in (('A', ea), ('B', eb)):
                ruins = [x for x in e if 'WebSocket' not in x and 'net::' not in x]
                P.confere(not ruins, 'nenhum erro de JavaScript na sessão ' + nome, ruins[:4])
            await ba.close(); await bb.close()

        print('\n11) reiniciando o servidor com o mesmo banco: tudo continua lá')
        PL.desce(); PL.sobe()
        amA = PL.q('social.amigos', None, A['token'])
        est = PL.q('loja.estado', None, A['token'])
        inv = [i if isinstance(i, str) else i.get('codigo') for i in est['inventario']]
        P.confere(any(x['idPublico'] == B['pub'] for x in amA) and 'bola_rua' in inv and est['equipados'].get('bola') == 'bola_rua',
                  'depois de reiniciar: a amizade, a compra e o equipado continuam (a sessão também)', [len(amA), 'bola_rua' in inv, est['equipados'].get('bola')])
    finally:
        PL.desce()
    return P.fim()


if __name__ == '__main__':
    sys.exit(asyncio.run(principal()))
