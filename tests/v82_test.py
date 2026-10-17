"""v82 · AS CONTAS: o jogo dentro da plataforma (de mentira: tests/plataforma82_falsa.mjs + tests/v82_plataforma.html, que fazem o
papel do servidor da plataforma e do app/src/lib/ponteJogo.ts, com AS MESMAS regras: app/contracts/patentes.ts, partida.ts e
progresso.ts) — o que a conta passa a ter, de ponta a ponta, pelo jogo de verdade (tests/build/racha_teste.html no iframe):

· SEM CONTA (a plataforma aberta, ninguém logado): o jogo é o de sempre; Ajustes › Conta mostra SEM CONTA com ENTRAR e CRIAR
  CONTA (abrem /entrar e /entrar?aba=criar da plataforma), o "NESTE APARELHO" do perfil também, o RANKING tem PATENTES | LIGA DA
  SEMANA; os empates da ranqueada (rq.emp) não somem mais ao abrir de novo.
· A PRIMEIRA VEZ DE UMA CONTA: o progresso de quem jogava sem conta vai para a conta (LEVAR PARA A CONTA: as moedas, o nome, a
  patente até Prata I, 799) ou fica no aparelho (COMEÇAR DO ZERO: a conta começa nova e a primeira vez do jogo aparece); a
  pergunta vem antes da primeira vez e das novidades do jogo.
· O NÍVEL DA CONTA: o lobby e o perfil mostram o nível e o XP da conta (uma curva só); cada nível novo da conta dá as moedas e
  gemas de sempre, uma vez; com a conta, as missões não mostram o XP do aparelho.
· A RANQUEADA NA CONTA: a vitória contra os bots (a conta do servidor = a prévia do jogo; a tela do fim mostra +N XP DA CONTA), o
  teto do dia contra os bots (a tela do fim troca a prévia pelo que valeu e explica), a resposta que chega antes da tela do fim,
  a desistência (−25), o fim que chega antes da resposta do começo, a ranqueada que ficou aberta (fechar o jogo no meio) e passou
  da validade: desistência quando a próxima partida começa; a partida casual não mexe na patente.
· O PROGRESSO EM OUTRO APARELHO: o aparelho B abre com a cópia da conta; os dois mudaram: QUAL PROGRESSO FICA? (na hora de salvar
  e ao abrir; O DA CONTA e O DESTE APARELHO); sair da conta guarda o progresso dela no aparelho e volta o de quem joga sem conta;
  entrar de novo traz a versão mais nova da conta; exportar não leva as gavetas das contas.
· RANKING › PATENTES: as contas pela patente, a sua linha marcada (você); a LIGA DA SEMANA continua.
· AS REGRAS SÃO AS MESMAS: o rqPontua do jogo (com o empate da v80) × o pontuaRanqueada do servidor, caso a caso.
· NO CELULAR (844 × 390): as abas do RANKING e as janelas da conta cabem.
O que isto NÃO prova: o servidor de verdade da plataforma (MySQL, sessão, tRPC — não rodam aqui; a mesma lógica está nos
contratos testados e o código do app/api é conferido pelo tsc), a assinatura do selo online (servidor_test.js), a rede móvel.

Rodar: python3 tests/v82_test.py
"""
import asyncio, json, subprocess, time
from comum import roda, Placar, async_playwright, RAIZ, CHROME, FONTES
from online_test import porta_livre

PRONTO = '() => { try { return typeof window.__RT === "function" && typeof window.RachaContas82 === "object" && !window.__marca82; } catch (e) { return false; } }'
LIMPA = """(() => { try { if (ONB.aberto) onbFim(); } catch (_) {}
  for (const k of ['v59', 'v61', 'v46']) if (CONTA.presentes.indexOf(k) < 0) CONTA.presentes.push(k);
  CONTA.onb = true; CONTA.niveis.length = 0; contaSalvar();
  if (!LB.pop.hidden){ fechaPop(); return false; } return !ONB.aberto; })()"""
POP = """(() => { const c = LB.popCaixa, h = c.querySelector('h2');
  return {aberto:!LB.pop.hidden, c82:c.classList.contains('c82-pop'), h2:h ? h.textContent : '', lados:Array.from(c.querySelectorAll('.c82-lado')).map(d => ({t:d.querySelector('b').textContent, li:Array.from(d.querySelectorAll('li')).map(l => l.textContent)})),
    obs:(c.querySelector('.c82-obs') || {}).textContent || '', bts:Array.from(c.querySelectorAll('.pop-acoes button')).map(b => b.textContent), onb:!!ONB.aberto}; })()"""
RQ_COMECA = """(() => { try { if (fimAberto()) fechaFim(); } catch (_) {}
  if (lobby.aberto){ lobby.aberto = false; LB.raiz.hidden = true; }
  X49.mode = '%s'; X49.jogo = 'futebol'; RQ.forcaNivel = 'facil';
  rqComeca(%d, %s); rqVsComeca();
  ARB_PARADO = function(){ return true; }; rqBots = function(){};
  RQ.estado = 'jogo';
  return {on:RQ.on, mm:X49.matchMode, ev:!!V70ON.ev, nivel:RQ.nivel, evRq:C82.evRq, evTam:C82.evTam}; })()"""
FIM = """(() => { const R = RQ.resultado, d = fimEl('fim-rq-d'), n = fimEl('fim-rq').querySelector('.c82-nota'), x = fimEl('fim-premio').querySelectorAll('.c82-xp');
  return {aberto:c82FimAberto(), pr:R && R.pr ? {antes:R.pr.antes, depois:R.pr.depois, delta:R.pr.delta, conta:!!R.pr.conta} : null, d:d.textContent, rqHidden:fimEl('fim-rq').hidden,
    nota:n && !n.hidden ? n.textContent : '', xp:Array.from(x).map(e => e.textContent), pts:CONTA.rq.pts, temEv:!!(C82.fim && C82.fim.ev)}; })()"""


class Plataforma:
    def __init__(self):
        self.porta = porta_livre()
        self.proc = subprocess.Popen(['node', str(RAIZ / 'tests' / 'plataforma82_falsa.mjs'), str(self.porta)], stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
        linha = self.proc.stdout.readline()
        if 'plataforma falsa' not in linha:
            raise RuntimeError('a plataforma falsa não subiu: ' + linha + (self.proc.stdout.read() or ''))
        self.url = 'http://127.0.0.1:%d/tests/v82_plataforma.html' % self.porta

    def fecha(self):
        try:
            self.proc.terminate(); self.proc.wait(5)
        except Exception:
            self.proc.kill()


class Aparelho:
    """Um navegador (um aparelho) com a página-mãe da plataforma; o jogo é o iframe dela."""
    async def abre(self, pw, plat, w=1280, h=720):
        self.b = await pw.chromium.launch(executable_path=CHROME, args=['--no-sandbox', '--autoplay-policy=no-user-gesture-required'])
        self.ctx = await self.b.new_context(viewport={'width': w, 'height': h}, has_touch=True, accept_downloads=True)
        await self.ctx.add_init_script("document.addEventListener('DOMContentLoaded',()=>{const s=document.createElement('style');s.textContent=%s;document.head.prepend(s);});" % json.dumps(FONTES))
        await self.ctx.add_init_script("window.RACHA_CONFIG = {modo:'demo', presente:false};")   # (demonstração sem servidor das salas: sem WebSocket)
        self.pg = await self.ctx.new_page()
        self.erros = []
        self.pg.on('pageerror', lambda e: self.erros.append(str(e)[:300]))
        self.pg.on('console', lambda m: self.erros.append('console: ' + m.text[:200]) if m.type == 'error' else None)
        await self.pg.goto(plat.url)
        await self.pg.wait_for_function('() => typeof window.monta === "function"', timeout=15000)
        self.f = None
        return self

    def quadro(self):
        for f in self.pg.frames:
            if f.url.endswith('/tests/build/racha_teste.html'):
                return f
        return None

    async def pronto(self, ms=25000):
        """Espera o jogo (o iframe) abrir de novo: o que estava antes tem a marca; o novo não."""
        t0 = time.time()
        while time.time() - t0 < ms / 1000:
            f = self.quadro()
            if f:
                try:
                    if await f.evaluate(PRONTO):
                        await asyncio.sleep(0.8)
                        self.f = f
                        return f
                except Exception:
                    pass
            await asyncio.sleep(0.15)
        raise RuntimeError('o jogo não abriu')

    async def marca(self):
        f = self.quadro()
        if f:
            try:
                await f.evaluate('() => { window.__marca82 = 1; }')
            except Exception:
                pass

    async def monta(self, conta):
        await self.marca()
        await self.pg.evaluate('c => monta(c)', conta)
        return await self.pronto()

    async def sair(self):
        await self.marca()
        await self.pg.evaluate('() => sair()')
        return await self.pronto()

    async def rt(self, js):
        return await self.f.evaluate('s => window.__RT(s)', js)

    async def mae(self, js, arg=None):
        return await self.pg.evaluate(js, arg)

    async def api(self, rota, corpo=None):
        return await self.pg.evaluate('([r, o]) => fetch("/api82/" + r, {method:"POST", body:JSON.stringify(o || {})}).then(x => x.json())', [rota, corpo or {}])

    async def espera(self, js, ms=8000, passo=120, mae=False):
        t0 = time.time(); v = None
        while True:
            try:
                v = await (self.mae(js) if mae else self.rt(js))
            except Exception:
                v = None
            if v:
                return v
            if (time.time() - t0) * 1000 > ms:
                return v
            await asyncio.sleep(passo / 1000)

    async def limpa(self):
        ok = 0
        for _ in range(16):
            r = await self.rt(LIMPA)
            ok = ok + 1 if r else 0
            if ok >= 2:
                return True
            await asyncio.sleep(0.3)
        return False

    async def clica_pop(self, texto):
        return await self.rt("(() => { const b = Array.from(LB.popCaixa.querySelectorAll('.pop-acoes button')).find(x => x.textContent === %s); if (!b) return false; b.click(); return true; })()" % json.dumps(texto))

    async def fecha(self):
        try:
            await self.b.close()
        except Exception:
            pass


async def conta_srv(A, id_):
    e = await A.api('teste/estado')
    for c in e['contas']:
        if c['id'] == id_:
            return c
    return None


async def comeca(A, modo='ranked', n=1, mapa='MAPA_RQ', espera_inicio=True):
    k = await A.mae('() => P.iniciadas.length')
    r = await A.rt(RQ_COMECA % (modo, n, mapa))
    if espera_inicio:
        await A.espera('() => P.iniciadas.length > %d' % k, mae=True)
    return r


async def termina(A, placar, gols=0, mostra=True, t=60, pts=None, contra=0):
    k = await A.mae('() => P.resultados.length + P.erros.length')
    await A.rt("(() => { RQ.placar = %s; RQ.golsH = %d; RQ.assistH = 0; RQ.ptsH = %d; RQ.contraH = %d; RQ.t = %d; RQ.estado = 'jogo'; rqFim(); rqFechaConta(false); %s return 1; })()"
               % (json.dumps(placar), gols, gols if pts is None else pts, contra, t, 'rqMostraFim();' if mostra else ''))
    await A.espera('() => P.resultados.length + P.erros.length > %d' % k, mae=True)
    await A.espera('() => !!(C82.fim && C82.fim.ev)', ms=3000)
    return await A.mae('() => P.resultados[P.resultados.length - 1] || null')


async def principal():
    P = Placar('v82 · as contas')
    plat = Plataforma()
    A = B = C = None
    try:
        async with async_playwright() as pw:
            A = await Aparelho().abre(pw, plat)

            # ---------------------------------------------------------------------------------------------------- 1) sem conta
            print('\n1) sem conta, dentro da plataforma')
            await A.monta(None)
            g = await A.rt("({logado:RachaContas82.logado(), dono:R82.dono, pl:!!c82Pl(), site:c82TemSite()})")
            P.confere(not g['logado'] and g['dono'] == '' and g['pl'] and g['site'], 'a plataforma aberta sem ninguém logado: o jogo roda sem conta (a ponte v82 está lá)', g)
            await A.limpa()
            card = await A.rt("""(() => { ajxAbre('conta'); const el = AJX.secs.conta.firstElementChild;
              return {card:el.classList.contains('c82-card'), h:(el.querySelector('h3') || {}).textContent, bts:Array.from(el.querySelectorAll('button')).map(b => b.textContent)}; })()""")
            P.confere(card['card'] and card['h'] == 'SEM CONTA' and card['bts'] == ['ENTRAR', 'CRIAR CONTA'], 'Ajustes › Conta começa com o cartão SEM CONTA: ENTRAR e CRIAR CONTA', card)
            await A.rt("AJX.secs.conta.querySelector('.c82-entrar').click()")
            await A.rt("AJX.secs.conta.querySelector('.c82-criar').click()")
            rotas = await A.mae('() => P.rotas.slice()')
            P.confere(rotas[-2:] == ['/entrar', '/entrar?aba=criar'], 'ENTRAR abre /entrar e CRIAR CONTA abre /entrar?aba=criar da plataforma', rotas)
            await A.rt("ajxFecha()")
            pf = await A.rt("""(() => { abreTela('perfil'); const s = document.querySelector('#tela-perfil .pf-ident');
              return {role:s.getAttribute('role'), cls:s.classList.contains('c82-entrar'), conta:s.classList.contains('conta')}; })()""")
            await A.rt("document.querySelector('#tela-perfil .pf-ident').click()")
            pp = await A.rt(POP)
            await A.clica_pop('ENTRAR')
            rotas = await A.mae('() => P.rotas.slice()')
            P.confere(pf['role'] == 'button' and pf['cls'] and not pf['conta'] and pp['h2'] == 'ENTRE NA SUA CONTA' and pp['bts'] == ['ENTRAR', 'CRIAR CONTA'] and rotas[-1] == '/entrar',
                      'sem conta, o "NESTE APARELHO" do perfil abre ENTRE NA SUA CONTA (ENTRAR → /entrar)', [pf, pp['h2'], rotas[-1:]])
            mi = await A.rt("(() => { missoesAbre(); const t = Array.from(LB.popCaixa.querySelectorAll('.v70-mi-pr')).slice(0, 3).map(e => e.textContent); fechaPop(); return t; })()")
            P.confere(len(mi) == 3 and all(' XP' in t for t in mi), 'sem conta, as missões mostram o XP do aparelho (como sempre)', mi)
            rk = await A.rt("""(() => { abreTela('ranking'); const s = document.querySelector('#tela-ranking .c82-rk-abas'), box = document.querySelector('#tela-ranking .c82-rk');
              return {abas:s ? Array.from(s.querySelectorAll('button')).map(b => [b.textContent, b.classList.contains('on')]) : null, box:box ? box.hidden : null}; })()""")
            P.confere(rk['abas'] == [['PATENTES', False], ['LIGA DA SEMANA', True]] and rk['box'], 'o RANKING tem PATENTES | LIGA DA SEMANA; sem conta, abre na LIGA DA SEMANA (a de sempre)', rk)
            await A.rt("document.querySelector('#tela-ranking .c82-rk-abas [data-aba=patentes]').click()")
            await A.espera("!!C82.rk.dados")
            rk = await A.rt("(() => { const box = document.querySelector('#tela-ranking .c82-rk'); return {box:box.hidden, txt:Array.from(box.querySelectorAll('.c82-rk-txt')).map(p => p.textContent), bt:(box.querySelector('.c82-rk-btn') || {}).textContent}; })()")
            P.confere(not rk['box'] and any('Ninguém jogou' in t for t in rk['txt']) and any('sem conta' in t for t in rk['txt']) and rk['bt'] == 'ENTRAR NA CONTA',
                      'RANKING › PATENTES sem conta: a lista da plataforma (vazia ainda), "você está sem conta" e ENTRAR NA CONTA', rk)
            await A.rt("fechaTela()")
            # o progresso de quem joga sem conta (como se tivesse jogado) e o empate da ranqueada, que sumia
            prog = await A.rt("""(() => { abrirLobby(); CONTA.moedas = 4321; CONTA.gemas = 21; Object.assign(CONTA.rq, {pts:950, melhor:950, jogos:12, vit:8, emp:3, seq:0}); contaSalvar();
              perfil.nome = 'ZECA'; perfil.st.partidas = 14; perfil.st.treinos = 3; perfilSalvar(); return {m:CONTA.moedas, nm:perfil.nome}; })()""")
            await A.marca(); await A.rt("location.reload()"); await A.pronto()
            v = await A.rt("({emp:CONTA.rq.emp, pts:CONTA.rq.pts, m:CONTA.moedas, nm:perfil.nome})")
            P.confere(v == {'emp': 3, 'pts': 950, 'm': 4321, 'nm': 'ZECA'}, 'abrir de novo: os empates da ranqueada ficam (rq.emp sumia ao recarregar) e o resto também', v)
            m0 = v['m']

            # ---------------------------------------------------------------------------------------------------- 2) conta nova: LEVAR
            print('\n2) a primeira vez de uma conta: levar o progresso do aparelho')
            await A.monta(123)
            pp = await A.espera(POP.replace("return {aberto", "if (LB.pop.hidden) return null; return {aberto"), ms=6000)
            g = await A.rt("({dono:R82.dono, primeira:!!R82.primeira, logado:RachaContas82.logado(), onb:!!ONB.aberto, onbEl:document.getElementById('onb').hidden, keys:Object.keys(R82.copia()).length})")
            esp = await A.rt("[fmtNum(4321) + ' moedas · ' + fmtNum(21) + ' gemas', '14 partidas', 'ranqueada: ' + rqElo(950).nome + ' (' + fmtNum(950) + ')']")
            li = pp['lados'][0]['li'] if pp and pp['lados'] else []
            P.confere(g['dono'] == 'c123' and g['primeira'] and g['logado'], 'entrou na conta 000123: as chaves do aparelho são da conta (o progresso sem conta foi para a gaveta)', g)
            P.confere(pp and pp['c82'] and pp['h2'] == 'LEVAR O PROGRESSO PARA A CONTA?' and pp['bts'] == ['LEVAR PARA A CONTA', 'COMEÇAR DO ZERO'],
                      'a conta não tem cópia e o aparelho tem progresso sem conta: LEVAR O PROGRESSO PARA A CONTA?', pp)
            P.confere(li[:2] == esp[:2] and li[3] == esp[2] and '799' in pp['obs'], 'a janela mostra o que vai (moedas, gemas, partidas, a patente) e que a patente entra até 799', [li, esp, pp['obs']])
            P.confere(not g['onb'] and g['onbEl'], 'a pergunta vem antes da primeira vez do jogo (ela não abre por cima)', g)
            await A.marca()
            P.confere(await A.clica_pop('LEVAR PARA A CONTA'), 'LEVAR PARA A CONTA')
            await A.pronto()
            v = await A.espera("(() => CONTA.rq.pts === 799 ? {m:CONTA.moedas, nm:perfil.nome, pts:CONTA.rq.pts, emp:CONTA.rq.emp, partidas:perfil.st.partidas, conv:localStorage.getItem('racha-guarda:convidado'), preparou:!!R82.preparou} : null)()")
            srv = await conta_srv(A, 123)
            P.confere(v and v['m'] == m0 and v['nm'] == 'ZECA' and v['partidas'] == 14 and v['preparou'], 'o jogo abriu de novo com o progresso que era do aparelho (moedas, nome, partidas)', v)
            P.confere(v and v['pts'] == 799 and srv['rq']['pts'] == 799 and srv['importado'], 'a patente foi para a conta até 799 (950 no aparelho, sem conferência): a conta e o jogo dizem 799', [v and v['pts'], srv['rq'], srv['importado']])
            P.confere(v and v['conv'] is None, 'o progresso sem conta saiu do aparelho (foi para a conta)', v and v['conv'])
            av = await A.espera("LB.aviso.textContent === 'O progresso deste aparelho foi para a sua conta.' && LB.aviso.classList.contains('on')", ms=4000, passo=80)
            P.confere(av, 'o aviso: "O progresso deste aparelho foi para a sua conta."')
            nv = await A.espera("(() => C82.estado === 'salvo' && R82.meta.versao > 0 ? {v:R82.meta.versao, h:R82.meta.hash === R82.hash(R82.copia())} : null)()", ms=9000)
            srv = await conta_srv(A, 123)
            nuvem = srv['nuvem'] or {}
            P.confere(nv and nuvem.get('versao') == nv['v'] and nv['h'] and 'ZECA' in nuvem.get('dados', {}).get('chaves', {}).get('racha-treino-perfil-v1', ''),
                      'a cópia do progresso foi para a conta sozinha (versão %s)' % (nv and nv['v']), [nv, nuvem.get('versao')])
            card = await A.rt("""(() => { ajxAbre('conta'); const el = AJX.secs.conta.querySelector('.c82-card'); const r = {top:el === AJX.secs.conta.firstElementChild, small:el.querySelector('small').textContent,
              b:el.querySelector('b').textContent, s:el.querySelector('.c82-card-tx span').textContent, est:el.querySelector('.c82-est').textContent, bt:el.querySelector('.c82-salvar').textContent}; ajxFecha(); return r; })()""")
            P.confere(card['top'] and card['small'] == 'CONTA DO RACHA · ID 000123' and card['b'] == 'Conta123' and card['s'].startswith('Nível 1 · ') and '799 pontos' in card['s']
                      and card['est'].startswith('Progresso salvo na conta') and card['bt'] == 'SALVAR AGORA', 'Ajustes › Conta: a conta (ID, nome, nível, patente) e o progresso salvo na conta', card)
            mi = await A.rt("(() => { missoesAbre(); const t = Array.from(LB.popCaixa.querySelectorAll('.v70-mi-pr')).slice(0, 3).map(e => e.textContent); fechaPop(); return t; })()")
            P.confere(len(mi) == 3 and not any('XP' in t for t in mi), 'com a conta, as missões não mostram o XP do aparelho (quem dá XP da conta é o servidor)', mi)
            pf = await A.rt("(() => { abreTela('perfil'); const s = document.querySelector('#tela-perfil .pf-ident'); const r = {role:s.getAttribute('role'), cls:s.classList.contains('c82-entrar')}; fechaTela(); return r; })()")
            P.confere(pf['role'] is None and not pf['cls'], 'com a conta, o perfil não oferece ENTRAR', pf)

            # ---------------------------------------------------------------------------------------------------- 3) o nível da conta
            print('\n3) o nível e o XP da conta')
            await A.limpa()
            a0 = await A.rt("({m:CONTA.moedas, g:CONTA.gemas, nc:CONTA.nivelConta})")
            await A.api('teste/ajusta', {'conta': 123, 'campos': {'xp': 1234}}); await A.mae('() => recarrega()')
            n5 = await A.espera("(() => { const n = nivelInfo(CONTA.xp); return n.n === 5 ? {n:n.n, atual:n.atual, prox:n.prox, conta:!!n.conta, nv:document.getElementById('v71-nv').textContent, xp:document.getElementById('v77-xp').textContent, m:CONTA.moedas, g:CONTA.gemas, nc:CONTA.nivelConta} : null; })()")
            P.confere(n5 and n5['atual'] == 234 and n5['prox'] == 500 and n5['conta'] and n5['nv'] == '5' and n5['xp'] == '234 / 500',
                      'o lobby mostra o nível 5 da conta e o XP dentro dele (234 / 500: a curva da conta, 50·n·(n−1))', n5)
            P.confere(a0['nc'] == 1 and n5 and n5['m'] - a0['m'] == 400 and n5['g'] - a0['g'] == 45 and n5['nc'] == 5,
                      'os níveis 2 a 5 da conta deram os prêmios de sempre (4 × 100 moedas; 4 × 5 + 25 gemas no 5), uma vez', [a0, n5])
            await A.api('teste/ajusta', {'conta': 123, 'campos': {'xp': 3100}}); await A.mae('() => recarrega()')
            n8 = await A.espera("(() => nivelInfo(CONTA.xp).n === 8 ? {m:CONTA.moedas, g:CONTA.gemas, nc:CONTA.nivelConta, pf:(abreTela('perfil'), (document.querySelector('#tela-perfil .v77-pf-nv b') || {}).textContent)} : null)()")
            await A.rt("fechaTela()")
            P.confere(n8 and n8['m'] - n5['m'] == 300 and n8['g'] - n5['g'] == 15 and n8['nc'] == 8, 'do 5 ao 8: +300 moedas e +15 gemas, uma vez', [n5, n8])
            P.confere(n8 and n8['pf'] == '8', 'o perfil mostra o nível da conta (8)', n8 and n8['pf'])
            await A.mae('() => recarrega()'); await asyncio.sleep(0.6)
            n8b = await A.rt("({m:CONTA.moedas, nc:CONTA.nivelConta})")
            P.confere(n8 and n8b['m'] == n8['m'], 'a conta chegou de novo com o mesmo nível: sem prêmio repetido', [n8, n8b])
            await A.limpa()

            # ---------------------------------------------------------------------------------------------------- 4) a ranqueada
            print('\n4) a ranqueada na conta')
            k0 = await A.mae('() => P.eventos.length')
            st = await comeca(A, 'ranked', 1)
            ini = await A.mae("k => P.eventos.slice(k).filter(e => e.racha === 'partida_inicio')", k0)
            P.confere(st['on'] and st['mm'] == 'ranked' and st['ev'] and st['evRq'] and ini and ini[-1]['ranqueada'] and ini[-1]['tamanho'] == 1,
                      'a ranqueada contra os bots começa: o começo vai para a plataforma dizendo ranqueada e o tamanho (1)', [st, ini[-1:] if ini else None])
            res = await termina(A, [3, 0], gols=2, pts=2, contra=1)
            fim = await A.rt(FIM)
            srv = await conta_srv(A, 123)
            P.confere(res and res['rq'] and res['rq']['delta'] == 31 and res['rq']['depois'] == 830 and srv['rq']['pts'] == 830, 'a plataforma fez a conta: 3 × 0 = +31 (22 + 3 × 3), de 799 para 830 (Ouro)', res and res['rq'])
            P.confere(fim['aberto'] and fim['pr'] == {'antes': 799, 'depois': 830, 'delta': 31, 'conta': False} and fim['d'] == '+31 PONTOS' and fim['nota'] == '' and fim['pts'] == 830,
                      'a tela do fim: a prévia do jogo era igual à da conta (+31 PONTOS, sem nota)', fim)
            P.confere(fim['xp'] == ['+80 XP DA CONTA'] and res['xpConcedido'] == 80, 'a tela do fim mostra o XP que a conta ganhou: +80 XP DA CONTA (20 + 2 gols × 10 + 40)', [fim['xp'], res.get('xpConcedido')])
            fev = await A.mae("() => P.eventos.filter(e => e.racha === 'partida_fim').pop()")
            log = [x[1] for x in (await A.api('teste/estado'))['log'] if x[0] == 'encerrar'][-1]
            P.confere(fev['ranqueada'] and fev['tamanho'] == 1 and fev['pontos'] == 2 and fev['golsContra'] == 1 and log['pontos'] == 2 and log['golsContra'] == 1,
                      'o fim leva ranqueada, tamanho, pontos e gols contra até a plataforma (os pontos e os gols contra eram jogados fora)', [fev, {k: log.get(k) for k in ('pontos', 'golsContra')}])
            await A.rt("abrirLobby()"); await A.limpa()

            # o teto do dia contra os bots; a resposta chega antes da tela do fim
            await A.api('teste/ajusta', {'conta': 123, 'campos': {'botsDia': 'hoje', 'botsGanho': 245}})
            await comeca(A, 'ranked', 1)
            res = await termina(A, [3, 0], gols=1, mostra=False)
            antes = await A.rt("({aberto:c82FimAberto(), pr:RQ.resultado.pr ? RQ.resultado.pr.delta : null})")
            await A.rt("rqMostraFim()")
            fim = await A.rt(FIM)
            P.confere(res['rq'] and res['rq']['limitado'] and res['rq']['delta'] == 5 and not antes['aberto'] and antes['pr'] == 31,
                      'o teto do dia: a conta deu só +5 (245 de 250 já ganhos hoje contra os bots); a resposta chegou antes da tela do fim (a prévia era +31)', [res['rq'], antes])
            P.confere(fim['pr'] and fim['pr']['delta'] == 5 and fim['pr']['conta'] and fim['d'] == '+5 PONTOS' and 'os pontos de hoje contra os bots acabaram' in fim['nota'] and fim['pts'] == 835,
                      'a tela do fim abriu depois e mostra o que valeu na conta (+5 PONTOS) com o porquê', fim)
            await A.rt("rqMostraFim()")
            fim2 = await A.rt(FIM)
            P.confere(fim2['d'] == '+5 PONTOS' and fim2['nota'] == fim['nota'] and fim2['xp'] == fim['xp'], 'pintada de novo, a tela do fim continua igual (a nota e o XP da conta não somem nem dobram)', fim2)
            await A.rt("abrirLobby()"); await A.limpa()

            # a desistência (de 1000: longe do piso do Ouro, 800 — a derrota e a desistência não descem da patente)
            await A.api('teste/ajusta', {'conta': 123, 'rq': {'pts': 1000, 'melhor': 1000}}); await A.mae('() => recarrega()')
            await A.espera("CONTA.rq.pts === 1000")
            await comeca(A, 'ranked', 1)
            k = await A.mae('() => P.resultados.length')
            await A.rt("rqAbandona()")
            await A.espera('() => P.resultados.length > %d' % k, mae=True)
            res = await A.mae('() => P.resultados[P.resultados.length - 1]')
            srv = await conta_srv(A, 123)
            v = await A.espera("CONTA.rq.pts === 975 && !C82.pendente")
            P.confere(res['rq'] and res['rq']['delta'] == -25 and srv['rq']['pts'] == 975 and srv['rq']['desist'] == 1 and v, 'desistir da ranqueada: −25 na conta (1000 → 975) e no jogo', [res.get('rq'), srv['rq']])
            await A.rt("abrirLobby()"); await A.limpa()

            # o fim chega antes da resposta do começo (a rede lenta): o fim espera, não se perde
            await A.api('teste/atraso', {'atraso': {'iniciar': 1500}})
            k = await A.mae('() => P.resultados.length')
            await comeca(A, 'ranked', 1, espera_inicio=False)
            await A.rt("rqAbandona()")
            await A.espera('() => P.resultados.length > %d' % k, ms=8000, mae=True)
            await A.api('teste/atraso', {'atraso': {}})
            srv = await conta_srv(A, 123)
            P.confere(srv['rq']['pts'] == 950 and srv['rq']['desist'] == 2, 'a desistência que saiu antes da resposta do começo (1,5 s de atraso) esperou o começo e valeu: 950', srv['rq'])
            await A.rt("abrirLobby()"); await A.limpa()

            # a ranqueada que ficou aberta (o jogo fechou no meio) e passou da validade: desistência quando a próxima partida começa
            await comeca(A, 'ranked', 1)
            await A.monta(123)                      # (fechou o jogo no meio: a partida ficou aberta na plataforma)
            await A.limpa()
            env = await A.api('teste/envelhece', {'conta': 123})
            k0 = await A.mae('() => P.eventos.length')
            st = await comeca(A, 'casual', 1, '0')
            d = await A.espera("C82.ultimaDesistencia ? {t:C82.ultimaDesistencia, aviso:RQ.aviso.t > 0 ? RQ.aviso.txt : '', pts:CONTA.rq.pts} : null")
            srv = await conta_srv(A, 123)
            ini = await A.mae("k => P.eventos.slice(k).filter(e => e.racha === 'partida_inicio')", k0)
            P.confere(env['n'] >= 1 and srv['rq']['pts'] == 925 and srv['rq']['desist'] == 3 and d and d['pts'] == 925,
                      'a ranqueada aberta e vencida contou como desistência quando a próxima partida começou (950 → 925, na conta e no jogo)', [env, srv['rq'], d])
            P.confere(d and d['aviso'] == 'A RANQUEADA DE ANTES FICOU ABERTA: DESISTÊNCIA (−25)', 'o jogo avisa no campo: A RANQUEADA DE ANTES FICOU ABERTA: DESISTÊNCIA (−25)', d)
            res = await termina(A, [2, 1], gols=1, t=45)
            fim = await A.rt(FIM)
            P.confere(ini and not ini[-1]['ranqueada'] and res['rq'] is None and fim['rqHidden'] and fim['xp'] == ['+70 XP DA CONTA'] and fim['nota'] == '' and (await conta_srv(A, 123))['rq']['pts'] == 925,
                      'a partida casual não é da ranqueada: a patente não muda; a tela do fim mostra +70 XP DA CONTA', [ini[-1:] if ini else None, res.get('rq'), fim])
            await A.rt("abrirLobby()"); await A.limpa()

            # ---------------------------------------------------------------------------------------------------- 5) outro aparelho
            print('\n5) o progresso em outro aparelho')
            sinc = await A.espera("(() => { if (C82.enviando) return null; if (R82.hash(R82.copia()) !== R82.meta.hash){ RachaContas82.envia(true); return null; } return C82.estado === 'salvo' ? R82.meta.versao : null; })()", ms=12000, passo=400)
            a1 = await A.rt("({m:CONTA.moedas, g:CONTA.gemas, nm:perfil.nome, pts:CONTA.rq.pts})")
            B = await Aparelho().abre(pw, plat)
            await B.monta(123)
            b1 = await B.rt("({m:CONTA.moedas, g:CONTA.gemas, nm:perfil.nome, pts:CONTA.rq.pts, aplicou:R82.aplicou, v:R82.meta.versao, pop:!LB.pop.hidden && LB.popCaixa.classList.contains('c82-pop')})")
            P.confere(sinc and b1['aplicou'] and b1['v'] == sinc and [b1['m'], b1['g'], b1['nm'], b1['pts']] == [a1['m'], a1['g'], a1['nm'], a1['pts']] and not b1['pop'],
                      'o aparelho B (sem nada da conta) abre com a cópia da conta: as mesmas moedas, gemas, nome e patente, sem perguntar', [sinc, a1, b1])
            await B.limpa()
            # os dois mudaram: na hora de salvar (B escolhe O DA CONTA)
            v0 = (await conta_srv(A, 123))['nuvem']['versao']
            await A.rt("(() => { CONTA.moedas = 5555; contaSalvar(); RachaContas82.envia(true); return 1; })()")
            await A.espera("C82.estado === 'salvo' && R82.meta.versao === %d" % (v0 + 1))
            await B.rt("(() => { CONTA.gemas = 77; contaSalvar(); RachaContas82.envia(true); return 1; })()")
            pp = await B.espera(POP.replace("return {aberto", "if (LB.pop.hidden || C82.estado !== 'conflito') return null; return {aberto"), ms=6000)
            esp = await B.rt("[fmtNum(5555) + ' moedas', ' · 77 gemas']")
            P.confere(pp and pp['h2'] == 'QUAL PROGRESSO FICA?' and [x['t'] for x in pp['lados']] == ['O DA CONTA', 'O DESTE APARELHO'] and pp['bts'] == ['O DA CONTA', 'O DESTE APARELHO'],
                      'B mudou, mas a conta já tinha uma versão mais nova (de A): QUAL PROGRESSO FICA?', pp)
            P.confere(pp and pp['lados'][0]['li'][0].startswith(esp[0]) and pp['lados'][1]['li'][0].endswith(esp[1]), 'os dois lados: o da conta (5555 moedas, de A) e o deste aparelho (77 gemas)', pp and [l['li'][0] for l in pp['lados']])
            await B.marca()
            if await B.clica_pop('O DA CONTA'):
                await B.pronto()
            b2 = await B.rt("({m:CONTA.moedas, g:CONTA.gemas, v:R82.meta.versao, h:R82.meta.hash === R82.hash(R82.copia()), pop:!LB.pop.hidden && LB.popCaixa.classList.contains('c82-pop')})")
            a2 = await A.rt("({g:CONTA.gemas})")
            P.confere(b2['m'] == 5555 and b2['g'] == a2['g'] and b2['v'] == v0 + 1 and b2['h'] and not b2['pop'], 'O DA CONTA: B abre de novo com a versão da conta (5555 moedas; as 77 gemas saíram)', [b2, a2])
            await asyncio.sleep(6)
            vv = (await conta_srv(A, 123))['nuvem']['versao']
            P.confere(vv == v0 + 1 and await B.rt("R82.meta.hash === R82.hash(R82.copia())"), 'abrir o jogo não "muda" o progresso: B não manda versão nova à toa (o que é só da partida de agora e a ordem dos campos não contam)', vv)
            await B.limpa()
            # os dois mudaram: ao abrir (B escolhe O DESTE APARELHO)
            await B.rt("(() => { C82.bloqueio = true; CONTA.gemas = 99; contaSalvar(); return 1; })()")   # (B não consegue salvar agora: a mudança fica só nele)
            await A.rt("(() => { CONTA.moedas = 6666; contaSalvar(); RachaContas82.envia(true); return 1; })()")
            await A.espera("C82.estado === 'salvo' && R82.meta.versao === %d" % (v0 + 2))
            await B.monta(123)
            pp = await B.espera(POP.replace("return {aberto", "if (LB.pop.hidden) return null; return {aberto"), ms=6000)
            P.confere(pp and pp['h2'] == 'QUAL PROGRESSO FICA?' and pp['lados'][0]['li'][0].startswith(await B.rt("fmtNum(6666) + ' moedas'")) and pp['lados'][1]['li'][0].endswith(' · 99 gemas'),
                      'B abre: a conta mudou (6666, de A) e B também (99 gemas, sem salvar): a pergunta vem ao abrir', pp and [l['li'][0] for l in pp['lados']])
            await B.clica_pop('O DESTE APARELHO')
            v = await B.espera("C82.estado === 'salvo' && R82.meta.versao === %d" % (v0 + 3))
            ch = (await conta_srv(A, 123))['nuvem']['dados']['chaves']
            cc = json.loads(ch['streetball-conta-v1'])
            P.confere(v and cc['gemas'] == 99 and cc['moedas'] == 5555, 'O DESTE APARELHO: a cópia de B vai para a conta (99 gemas, 5555 moedas)', [v, cc['moedas'], cc['gemas']])
            await B.limpa()
            # sair da conta e entrar de novo (A)
            await A.sair()
            s = await A.rt("({dono:R82.dono, logado:RachaContas82.logado(), m:CONTA.moedas, nm:perfil.nome, guarda:JSON.parse(JSON.parse(localStorage.getItem('racha-guarda:c123') || '{}')['streetball-conta-v1'] || '{}').moedas, rd:localStorage.getItem('racha-dono'), onb:!!ONB.aberto})")
            P.confere(s['dono'] == '' and not s['logado'] and s['m'] != 6666 and s['nm'] == 'Jogador' and s['guarda'] == 6666 and s['rd'] == '',
                      'saiu da conta: o progresso dela fica guardado no aparelho (6666) e o jogo volta para quem joga sem conta (que começa do zero: o dele foi para a conta)', s)
            await A.limpa()
            async with A.pg.expect_download() as dl:
                await A.rt("pxExporta()")
            arq = json.loads(open(await (await dl.value).path(), encoding='utf-8').read())
            ks = sorted(arq['dados'].keys())
            rx = await A.rt("['racha-guarda:c123', 'racha-guarda:convidado', 'racha-nuvem:c123', 'racha-dono', 'racha-aparelho', 'racha-82-entra:c1', 'racha-tampa-v1', 'streetball-conta-v1', 'racha-v80-padrao'].map(k => PX_CHAVES.test(k))")
            P.confere('streetball-conta-v1' in ks and not any(k.startswith(('racha-guarda:', 'racha-nuvem:', 'racha-82-')) or k in ('racha-dono', 'racha-aparelho') for k in ks) and rx == [False] * 6 + [True] * 3,
                      'exportar o progresso (Ajustes › Conta) leva o do jogo e não as gavetas das contas, as cópias da conta nem o id do aparelho', [ks, rx])
            await A.monta(123)
            a3 = await A.rt("({m:CONTA.moedas, g:CONTA.gemas, aplicou:R82.aplicou, v:R82.meta.versao, pop:!LB.pop.hidden && LB.popCaixa.classList.contains('c82-pop')})")
            P.confere(a3['aplicou'] and a3['g'] == 99 and a3['m'] == 5555 and a3['v'] == v0 + 3 and not a3['pop'], 'entrou de novo em A: a gaveta da conta volta e a versão mais nova da conta (a de B) entra, sem perguntar', a3)
            await A.limpa()
            # conta nova: COMEÇAR DO ZERO (o progresso sem conta fica no aparelho)
            await A.sair(); await A.limpa()
            await A.rt("(() => { perfil.nome = 'VISITA'; perfil.st.partidas = 2; perfilSalvar(); CONTA.moedas = 300; contaSalvar(); return 1; })()")
            await A.monta(124)
            pp = await A.espera(POP.replace("return {aberto", "if (LB.pop.hidden) return null; return {aberto"), ms=6000)
            P.confere(pp and pp['h2'] == 'LEVAR O PROGRESSO PARA A CONTA?' and pp['lados'][0]['li'][1] == '2 partidas' and not pp['obs'], 'a conta 000124 é nova e o aparelho tem o progresso de VISITA: a mesma pergunta (sem a nota da patente)', pp)
            await A.clica_pop('COMEÇAR DO ZERO')
            o = await A.espera("ONB.aberto && LB.pop.hidden ? {onb:true, nm:perfil.nome, m:CONTA.moedas} : null", ms=3000)
            srv = await conta_srv(A, 124)
            await A.espera("C82.estado === 'salvo'", ms=6000)
            srv = await conta_srv(A, 124)
            conv = await A.rt("JSON.parse(JSON.parse(localStorage.getItem('racha-guarda:convidado') || '{}')['racha-treino-perfil-v1'] || '{}').nome")
            P.confere(o and o['nm'] == 'Jogador' and srv['nuvem'] and srv['nuvem']['versao'] == 1 and conv == 'VISITA',
                      'COMEÇAR DO ZERO: a conta começa nova (a primeira vez do jogo aparece), a cópia dela vai para a conta e o progresso de VISITA fica no aparelho, sem conta', [o, srv['nuvem'] and srv['nuvem']['versao'], conv])
            await A.limpa()
            await A.monta(124)
            await asyncio.sleep(1.2)
            g = await A.rt("({primeira:!!R82.primeira, pop:!LB.pop.hidden && LB.popCaixa.classList.contains('c82-pop')})")
            P.confere(not g['primeira'] and not g['pop'], 'abrir de novo na conta 000124: a pergunta não volta', g)

            # ---------------------------------------------------------------------------------------------------- 6) o ranking das patentes
            print('\n6) RANKING › PATENTES')
            await A.api('teste/ajusta', {'conta': 125, 'rq': {'pts': 1500, 'melhor': 1500, 'jogos': 10, 'vit': 9}})
            await A.api('teste/ajusta', {'conta': 126, 'rq': {'pts': 300, 'melhor': 300, 'jogos': 5, 'vit': 2}})
            await A.monta(123); await A.limpa()
            await A.rt("(() => { C82.rk.dados = null; C82.rk.aba = ''; abreTela('ranking'); return 1; })()")
            await A.espera("!!C82.rk.dados")
            rk = await A.rt("""(() => { const t = document.querySelector('#tela-ranking'), box = t.querySelector('.c82-rk');
              return {abas:Array.from(t.querySelectorAll('.c82-rk-abas button')).map(b => [b.textContent, b.classList.contains('on')]), box:box.hidden,
                lin:Array.from(box.querySelectorAll('.c82-rk-lin')).map(l => [l.querySelector('.lb-pos').textContent, l.querySelector('.nm-t').textContent, l.querySelector('.c82-pts b').textContent, l.classList.contains('voce'), l.querySelector('small').textContent]),
                esc:Array.from(t.querySelectorAll('.rk-corpo > [data-c82-escondido]')).length, timer:LB.rkT.hidden,
                corPts:(() => { const v = box.querySelector('.c82-rk-lin.voce .c82-pts b'); return v ? getComputedStyle(v).color : ''; })()}; })()""")
            esp = await A.rt("[rqElo(1500).nome, rqElo(925).nome + ' · você', rqElo(300).nome, fmtNum(1500)]")
            P.confere(rk['abas'] == [['PATENTES', True], ['LIGA DA SEMANA', False]] and not rk['box'] and rk['esc'] > 0 and rk['timer'], 'com a conta, o RANKING abre em PATENTES (a liga e o "termina em" dela ficam escondidos)', rk)
            P.confere(rk['corPts'] == 'rgb(23, 25, 28)', 'na sua linha (amarela) os pontos ficam escuros, para ler', rk['corPts'])
            P.confere([x[:4] for x in rk['lin']] == [['1', 'Conta125', esp[3], False], ['2', 'CONTA123', '925', True], ['3', 'Conta126', '300', False]] and [x[4] for x in rk['lin']] == esp[:3],
                      'as contas pela patente (1500, 925, 300); a sua linha marcada (você); a conta sem pontos (000124) fica de fora', rk['lin'])
            await A.rt("document.querySelector('#tela-ranking .c82-rk-abas [data-aba=liga]').click()")
            rk2 = await A.rt("(() => { const t = document.querySelector('#tela-ranking'); return {box:t.querySelector('.c82-rk').hidden, esc:t.querySelectorAll('.rk-corpo > [data-c82-escondido]').length, vis:Array.from(t.querySelectorAll('.rk-corpo > :not(.c82-rk-abas):not(.c82-rk)')).some(e => !e.hidden), timer:LB.rkT.hidden}; })()")
            P.confere(rk2['box'] and rk2['esc'] == 0 and rk2['vis'] and not rk2['timer'], 'LIGA DA SEMANA: a liga de sempre volta, com o "termina em" (e a lista das patentes sai)', rk2)
            await A.rt("fechaTela()")

            # ---------------------------------------------------------------------------------------------------- 7) as regras
            print('\n7) as regras: o jogo × a plataforma')
            casos = [
                ({'pts': 100, 'melhor': 100, 'jogos': 3, 'vit': 1, 'seq': 0, 'emp': 0}, (3, 0, False), 'facil'),
                ({'pts': 100, 'melhor': 120, 'jogos': 3, 'vit': 1, 'seq': 1, 'emp': 0}, (0, 2, False), 'facil'),
                ({'pts': 10, 'melhor': 40, 'jogos': 3, 'vit': 1, 'seq': 0, 'emp': 0}, (0, 5, False), 'dificil'),
                ({'pts': 405, 'melhor': 405, 'jogos': 9, 'vit': 5, 'seq': 2, 'emp': 1}, (0, 1, False), 'facil'),
                ({'pts': 500, 'melhor': 520, 'jogos': 9, 'vit': 5, 'seq': 2, 'emp': 1}, (4, 1, False), 'dificil'),
                ({'pts': 900, 'melhor': 900, 'jogos': 20, 'vit': 12, 'seq': 4, 'emp': 2}, (1, 1, False), 'dificil'),
                ({'pts': 900, 'melhor': 900, 'jogos': 20, 'vit': 12, 'seq': 4, 'emp': 2}, (0, 0, True), 'facil'),
                ({'pts': 805, 'melhor': 900, 'jogos': 20, 'vit': 12, 'seq': 0, 'emp': 2}, (2, 3, True), 'dificil'),
                ({'pts': 4950, 'melhor': 4950, 'jogos': 300, 'vit': 200, 'seq': 2, 'emp': 9}, (1, 0, False), 'facil'),
                ({'pts': 1290, 'melhor': 1290, 'jogos': 30, 'vit': 20, 'seq': 0, 'emp': 0}, (2, 0, False), 'online'),
                ({'pts': 0, 'melhor': 0, 'jogos': 0, 'vit': 0, 'seq': 0, 'emp': 0}, (0, 3, False), 'facil'),
            ]
            jogo = await A.rt("""((casos) => { const salvo = JSON.parse(JSON.stringify(CONTA.rq)), out = [];
              for (const k of casos){
                Object.assign(CONTA.rq, k.e);
                const pr = rqPontua({placar:[k.p[0], k.p[1]], venceu:k.p[0] > k.p[1], abandono:k.p[2], nivel:k.nv});
                out.push({antes:pr.antes, depois:pr.depois, delta:pr.delta, seq:CONTA.rq.seq, vit:CONTA.rq.vit, jogos:CONTA.rq.jogos, emp:CONTA.rq.emp | 0, melhor:CONTA.rq.melhor});
              }
              for (const x of Object.keys(CONTA.rq)) delete CONTA.rq[x]; Object.assign(CONTA.rq, salvo); contaSalvar(); return out; })(%s)""" % json.dumps([{'e': e, 'p': list(p), 'nv': nv} for e, p, nv in casos]))
            srv = (await A.api('teste/regras', {'casos': [{'estado': dict(e, der=0, desist=0), 'partida': {'placarNosso': p[0], 'placarDeles': p[1], 'abandono': p[2], 'contraBots': nv != 'online', 'nivelBots': None if nv == 'online' else nv}} for e, p, nv in casos]}))['r']
            difs = []
            for i, (j, s) in enumerate(zip(jogo, srv)):
                e = s['estado']
                ss = {'antes': s['antes'], 'depois': s['depois'], 'delta': s['delta'], 'seq': e['seq'], 'vit': e['vit'], 'jogos': e['jogos'], 'emp': e['emp'], 'melhor': e['melhor']}
                if ss != j:
                    difs.append([i, casos[i], j, ss])
            P.confere(len(jogo) == len(casos) and not difs, 'os %d casos (vitória, derrota no Bronze pela metade, o piso da patente, bônus do difícil e da sequência, empate, desistência, online, o topo): o jogo e a plataforma dão o mesmo' % len(casos), difs or [j['delta'] for j in jogo])
            v = await A.rt("({pts:CONTA.rq.pts, jogos:CONTA.rq.jogos})")
            P.confere(v['pts'] == 925, 'a patente da conta voltou depois da conta de teste', v)

            # ---------------------------------------------------------------------------------------------------- 8) no celular
            print('\n8) no celular (844 × 390)')
            C = await Aparelho().abre(pw, plat, 844, 390)
            await C.monta(126); await C.limpa()
            await C.rt("(() => { C82.rk.dados = null; C82.rk.aba = ''; abreTela('ranking'); return 1; })()")
            await C.espera("!!C82.rk.dados")
            m = await C.rt("""(() => { const s = document.querySelector('#tela-ranking .c82-rk-abas').getBoundingClientRect(), l = Array.from(document.querySelectorAll('#tela-ranking .c82-rk-lin')).map(e => e.getBoundingClientRect());
              return {W:innerWidth, H:innerHeight, s:[s.left, s.top, s.right, s.bottom], l:l.map(r => [r.left, r.right, r.height]), sw:document.documentElement.scrollWidth}; })()""")
            P.confere(m['s'][0] >= 0 and m['s'][2] <= m['W'] and m['s'][1] >= 0 and all(x[0] >= 0 and x[1] <= m['W'] + 0.5 and x[2] > 20 for x in m['l']) and len(m['l']) == 3 and m['sw'] <= m['W'],
                      'as abas e as linhas do RANKING › PATENTES cabem na tela do celular', m)
            await C.rt("fechaTela()")
            await C.sair(); await C.limpa()
            await C.rt("(() => { perfil.st.partidas = 4; perfilSalvar(); CONTA.rq.pts = 1200; contaSalvar(); return 1; })()")
            await C.monta(127)
            pp = await C.espera("""(() => { if (LB.pop.hidden) return null; const r = LB.popCaixa.getBoundingClientRect(), bs = Array.from(LB.popCaixa.querySelectorAll('.pop-acoes button')).map(b => b.getBoundingClientRect());
              return {W:innerWidth, H:innerHeight, r:[r.left, r.top, r.right, r.bottom], bs:bs.map(b => [b.left, b.top, b.right, b.bottom, b.height]), h2:LB.popCaixa.querySelector('h2').textContent}; })()""", ms=6000)
            P.confere(pp and pp['h2'] == 'LEVAR O PROGRESSO PARA A CONTA?' and pp['r'][0] >= -1 and pp['r'][2] <= pp['W'] + 1 and all(b[1] >= 0 and b[3] <= pp['H'] + 1 and b[4] >= 36 for b in pp['bs']) and len(pp['bs']) == 2,
                      'a janela da conta (com a nota da patente) cabe no celular e os dois botões ficam na tela, com altura para o dedo', pp)

            # ---------------------------------------------------------------------------------------------------- erros
            for nome, ap in (('A', A), ('B', B), ('C', C)):
                errs = [e for e in ap.erros if 'Failed to load resource' not in e and 'favicon' not in e]
                gancho = await ap.rt("[window.RUA_CONTA82_ERRO || '', window.RUA_RK82_ERRO || '']") if ap.f else ['', '']
                P.confere(not errs and gancho == ['', ''], 'aparelho %s: sem erros de JavaScript (no jogo e na página-mãe)' % nome, errs[:5] + gancho)
    finally:
        for ap in (A, B, C):
            if ap:
                await ap.fecha()
        plat.fecha()
    return P.fim()


if __name__ == '__main__':
    roda(principal())
