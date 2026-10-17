"""Etapa 5 · ONLINE DE VERDADE: o servidor da turma (server/servidor.js) e sessões independentes do jogo no navegador.

Sobe o servidor numa porta livre (só na memória), entregando a pasta do projeto, e abre a cópia de teste do jogo por
http://127.0.0.1:PORTA/tests/build/racha_teste.html em contextos separados do Chromium (cada um com o seu armazenamento:
são jogadores diferentes). O jogo conecta sozinho no mesmo endereço (como no lançamento). Confere: JOGAR AGORA com lugar,
ENTRAR NO TIME, a partida (comandos, quadros), COM CURVA no ESTÁDIO com os mesmos controles para o convidado (v70.2: a sala
só abre FUTEBOL/COM CURVA e a ARENA/o ESTÁDIO; o servidor recusa o resto), o resultado conferido pelo servidor (vale e não vale), os eventos de começo/fim uma vez, a pausa do árbitro, o chat, o nome que muda
no cartão, a reconexão no meio da partida, o espectador e o abandono.

Rodar:  python3 tests/online_test.py            (p2p desligado: tudo passa pelo servidor)
        python3 tests/online_test.py --p2p      (com a conexão direta ligada, como no lançamento)
"""
import sys, json, asyncio, socket, subprocess, time
from comum import Placar, rt, roda, async_playwright, RAIZ, CHROME, HARNESS, FONTES

P2P = '--p2p' in sys.argv

def porta_livre():
    s = socket.socket(); s.bind(('127.0.0.1', 0)); p = s.getsockname()[1]; s.close(); return p

EVENTOS = """(() => { window.__ev = []; const f = () => { window.RACHA_EVT = {inicio:d => window.__ev.push(['inicio', d]), fim:d => window.__ev.push(['fim', d]), treino:() => {}}; };
  f(); window.addEventListener('load', () => setTimeout(f, 0)); })();"""

async def sessao(pw, url, nome, w=1280, h=720):
    b = await pw.chromium.launch(executable_path=CHROME, args=['--no-sandbox', '--autoplay-policy=no-user-gesture-required'])
    ctx = await b.new_context(viewport={'width': w, 'height': h}, has_touch=True)
    await ctx.add_init_script("document.addEventListener('DOMContentLoaded',()=>{const s=document.createElement('style');s.textContent=%s;document.head.prepend(s);});" % json.dumps(FONTES))
    await ctx.add_init_script("try{if(!localStorage.getItem('racha-treino-perfil-v1'))localStorage.setItem('racha-treino-perfil-v1', JSON.stringify({nome:%s, st:{partidas:3, concluidas:3}}));}catch(e){}" % json.dumps(nome))
    await ctx.add_init_script(EVENTOS)
    pg = await ctx.new_page()
    pg.erros = []
    pg.on('pageerror', lambda e: pg.erros.append(str(e)[:300]))
    pg.on('console', lambda m: pg.erros.append('console: ' + m.text[:200]) if m.type == 'error' else None)
    await pg.goto(url)
    await pg.wait_for_function('() => typeof window.__RT === "function"', polling=100, timeout=20000)
    await pg.wait_for_timeout(700)
    await pg.evaluate("(() => { const o = document.getElementById('onb'); if (o) o.hidden = true; })()")
    await rt(pg, "(() => { if (typeof v84Fecha === 'function') v84Fecha(); return 1; })()")   # (arnês v84: sem conta, como antes do login obrigatório)
    await rt(pg, HARNESS)
    await rt(pg, "(() => { filaPop.length = 0; if (!LB.pop.hidden) fechaPop(); return true; })()")
    pg.b, pg.nome = b, nome
    return pg

async def espera(pg, js, ms=6000, passo=100):
    t0 = time.time()
    while True:
        try:
            v = await rt(pg, js)
        except Exception as e:
            v = None
        if v:
            return v
        if (time.time() - t0)*1000 > ms:
            return v
        await asyncio.sleep(passo/1000)

ESTADO = """(() => { const r = NET49.room; return {id:NET49.id, sala:r ? r.code : null, estado:r ? r.state : null, rodada:r ? r.round : null, roster:r ? r.roster : null,
  dono:r ? r.host : null, jogando:NET49.playing, host:NET49.host, slot:NET49.localSlot, rq:RQ.on ? RQ.estado : null, placar:RQ.placar.slice(), tick:RQ.tick}; })()"""

async def principal():
    P = Placar('Etapa 5 · online de verdade (servidor + sessões no navegador)' + (' · com P2P' if P2P else ''))
    porta = porta_livre()
    args = ['node', str(RAIZ / 'tests' / 'servidor_visitantes.cjs'), '--porta', str(porta), '--host', '127.0.0.1', '--memoria', '--estaticos', str(RAIZ), '--nome', 'Teste da turma']
    if not P2P: args.append('--sem-p2p')
    srv = subprocess.Popen(args, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    time.sleep(0.8)
    url = 'http://127.0.0.1:%d/tests/build/racha_teste.html' % porta
    sess = []
    try:
        async with async_playwright() as pw:
            A = await sessao(pw, url, 'Ana'); B = await sessao(pw, url, 'Beto'); sess += [A, B]
            # ---------------------------------------------------------------- conectar e criar a sala
            print('\n1) conectar sozinho (o mesmo endereço do jogo) e criar uma sala pública')
            for pg in (A, B):
                await rt(pg, "abreTela('amigos')")
            okA = await espera(A, "!!NET49.id"); okB = await espera(B, "!!NET49.id")
            P.confere(okA and okB, 'as duas sessões conectam sozinhas no servidor do mesmo endereço (ws://127.0.0.1)')
            st = await rt(A, "({srv:SL.server && SL.server.name, sx:(document.querySelector('.sx-st span')||{}).textContent})")
            P.confere(st['srv'] == 'Teste da turma' and 'ONLINE' in (st['sx'] or ''), 'a lista mostra ONLINE e o nome do servidor', st)
            await rt(A, "(() => { Object.assign(SX.form, {onde:'online', pub:true, n:1, map:0, jogo:'curva', tempo:0, bots:false, nome:'Racha de Teste'}); sxCriar(); return true; })()")
            sA = await espera(A, "NET49.room && NET49.room.roster.every(x => !x) && NET49.room.code")
            P.confere(bool(sA), 'criar sala online: o árbitro começa nos espectadores (como a v68)', await rt(A, ESTADO))
            tit = await rt(A, "document.getElementById('sl-sub').textContent")
            P.confere(tit.startswith('Pública · código'), 'o título diz SALA PÚBLICA (Pública · código …)', tit)
            # ---------------------------------------------------------------- JOGAR AGORA e ENTRAR NO TIME
            print('\n2) JOGAR AGORA com lugar no time · ENTRAR NO TIME perto do INICIAR')
            await rt(B, "slJogarAgora()")
            eB = await espera(B, "NET49.room && NET49.room.roster.indexOf(NET49.id) >= 0")
            P.confere(bool(eB), 'JOGAR AGORA: o Beto entra na sala pública com lugar num time (não como espectador)', await rt(B, ESTADO))
            at = await rt(A, "(() => { const b = document.querySelector('.v70-sl-atalhos'); return b ? {bar:!b.hidden, entrar:!b.querySelector('.entrar').hidden, bots:!b.querySelector('.bots').hidden} : null; })()")
            P.confere(at and at['bar'] and at['entrar'] and not at['bots'], 'o árbitro (espectador) vê ENTRAR NO TIME perto do INICIAR (sem MONTAR COM BOTS: é online)', at)
            await rt(A, "document.querySelector('.v70-sl-atalhos .entrar').click()")
            eA = await espera(A, "NET49.room.roster.indexOf(NET49.id) >= 0 && NET49.room.roster.every(Boolean)")
            P.confere(bool(eA), 'ENTRAR NO TIME: a Ana vai para o time vazio (1v1 completo)', await rt(A, ESTADO))
            # ---------------------------------------------------------------- a partida
            print('\n3) a partida: começo, comandos e quadros')
            await rt(A, "slIniciar()")
            jA = await espera(A, "NET49.playing && NET49.host"); jB = await espera(B, "NET49.playing && !NET49.host && NET49.localSlot >= 0 && NET49.lastTick > 0")
            P.confere(bool(jA and jB), 'começou: a Ana roda a partida (anfitriã) e o Beto recebe os quadros', [await rt(A, ESTADO), await rt(B, ESTADO)])
            evA = await rt(A, "window.__ev.map(e => e[0])"); evB = await rt(B, "window.__ev.map(e => e[0])")
            P.confere(evA == ['inicio'] and evB == ['inicio'], 'evento de começo uma vez em cada sessão', [evA, evB])
            vis = await rt(B, "({curva:controleVisivel('curva'), joga:v70Joga(), finta:controleVisivel('finta')})")
            P.confere(vis['curva'] and vis['joga'] and not vis['finta'], 'COM CURVA: o convidado tem o botão CURVA (antes não tinha)', vis)
            slotB = await rt(B, "NET49.localSlot")
            # o convidado fica colado na bola, parado, e segura a CURVA (a tecla U) por 0,7 s
            prep = """((s) => { const q = RQ.jog[s]; RQ.estado = 'jogo'; RQ.saidaT0 = -9999;
              q.x = q.ax = CX - U(3); q.y = q.ay = CY; q.vx = q.vy = 0; B.x = q.x + q.r + B.r + .5; B.y = q.y; B.vx = B.vy = 0; B.w = 0; B.cvT = 0; B.cv = 0;
              P.x = P.ax = LX1 - U(6); P.y = P.ay = LY0 + U(6); P.vx = P.vy = 0; q.chuteT = -99; window.__antes = RQ.tick; return q.netId; })"""
            nid = await rt(A, prep + "(%d)" % slotB)
            P.confere(nid == await rt(B, "NET49.id"), 'o anfitrião tem o boneco do convidado ligado ao id dele', nid)
            await rt(B, "keys.KeyU = true; true")
            await asyncio.sleep(0.35)
            car = await rt(B, "({seg:CV.segura, carga:CV.carga})")
            await asyncio.sleep(0.4)
            meio = await rt(A, "(s => { const q = RQ.jog[s]; return {seg:!!(q.cv70 && q.cv70.segura), carga:q.cv70 ? q.cv70.carga : 0, cvT:B.cvT}; })(%d)" % slotB)
            await rt(A, prep + "(%d)" % slotB)
            await rt(B, "keys.KeyU = false; true")
            chute = await espera(A, "(s => { const q = RQ.jog[s]; return q.chuteT > window.__antes ? {cvT:B.cvT, cv:B.cv, v:Math.hypot(B.vx, B.vy), forca:Math.hypot(B.vx, B.vy)} : null; })(%d)" % slotB, 3000, 30)
            P.confere(car['seg'] and car['carga'] > .1, 'na tela do convidado a carga da CURVA sobe enquanto ele segura', car)
            P.confere(meio['seg'] and meio['carga'] > .2, 'no anfitrião, a CURVA do convidado carrega pelo comando (k)', meio)
            P.confere(bool(chute) and chute['cvT'] > .3 and abs(chute['cv']) > .3, 'soltou: o anfitrião bate o chute de curva do convidado (efeito pela carga)', chute)
            # o CHUTE comum do convidado sai reto (antes: curva automática invisível)
            await rt(A, prep + "(%d)" % slotB)
            await rt(B, "keys.KeyK = true; true"); await asyncio.sleep(0.25); await rt(B, "keys.KeyK = false; true")
            reto = await espera(A, "(s => { const q = RQ.jog[s]; return q.chuteT > window.__antes ? {cvT:B.cvT, v:Math.hypot(B.vx, B.vy)} : null; })(%d)" % slotB, 3000, 30)
            P.confere(bool(reto) and reto['cvT'] == 0 and reto['v'] > 100, 'o CHUTE do convidado sai reto, como o do anfitrião (sem a curva automática)', reto)
            # ---------------------------------------------------------------- o resultado (vale)
            print('\n4) o fim da partida: o servidor confere e os dois recebem')
            await asyncio.sleep(max(0, 11.5 - 3.0))
            await rt(A, "(() => { RQ.placar = [1, 3]; RQ.estado = 'jogo'; rqFim(); return true; })()")
            rA = await espera(A, "fimAberto() && RQ.resultado && RQ.resultado.contado"); rB = await espera(B, "fimAberto() && RQ.resultado && RQ.resultado.contado")
            titA = await rt(A, "fimEl('fim-titulo').textContent"); titB = await rt(B, "fimEl('fim-titulo').textContent")
            P.confere(bool(rA and rB) and titA != 'NÃO VALEU' and titB != 'NÃO VALEU', 'resultado conferido pelo servidor (vale): a tela de fim nas duas sessões', [titA, titB])
            evA = await rt(A, "window.__ev.map(e => e[0] + (e[1].abandonada ? ':ab' : '') + (e[1].valida === false ? ':nv' : ''))"); evB = await rt(B, "window.__ev.map(e => e[0] + (e[1].abandonada ? ':ab' : '') + (e[1].valida === false ? ':nv' : ''))")
            P.confere(evA == ['inicio', 'fim'] and evB == ['inicio', 'fim'], 'evento de fim uma vez em cada sessão (válido)', [evA, evB])
            fimB = await rt(B, "window.__ev[1][1]")
            P.confere(fimB['online'] and fimB['placarNosso'] + fimB['placarDeles'] == 4, 'o evento do convidado traz o placar do lado dele e online', fimB)
            est = await rt(B, "(() => { const b = perfil.est['online|curva'] || {}; return {p:b.p | 0, c:b.c | 0}; })()")
            P.confere(est['c'] == 1, 'as estatísticas do convidado contam a partida online (COM CURVA)', est)
            # ---------------------------------------------------------------- o resultado que não vale
            print('\n5) revanche e um fim impossível: NÃO VALEU')
            await rt(A, "fimEl('fim-denovo').click()")
            r2 = await espera(B, "NET49.playing && NET49.room.round === 2 && NET49.lastTick > 0")
            P.confere(bool(r2), 'PEDIR REVANCHE (dono): começa a rodada 2 para os dois')
            await rt(A, "(() => { RQ.placar = [3, 0]; RQ.estado = 'jogo'; rqFim(); return true; })()")
            nv = await espera(B, "fimAberto() && fimEl('fim-titulo').textContent === 'NÃO VALEU' && fimEl('fim-info').textContent")
            P.confere(bool(nv) and 'curta' in nv, 'fim depressa demais: o servidor não valida e a tela diz NÃO VALEU (sem prêmio)', nv)
            evB = await rt(B, "window.__ev.map(e => e[0] + (e[1].valida === false ? ':nv' : ''))")
            P.confere(evB == ['inicio', 'fim', 'inicio', 'fim:nv'], 'eventos: um começo e um fim por partida (o que não valeu vai marcado)', evB)
            # ---------------------------------------------------------------- v70.2: só os modos e os mapas que ficaram
            print('\n6) a sala só abre FUTEBOL/COM CURVA e a ARENA/o ESTÁDIO; COM CURVA no ESTÁDIO para os dois')
            await rt(A, "net49Send({type:'config', jogo:'ginga', map:3})")
            await A.wait_for_timeout(600)
            r6 = await rt(B, "({jogo:NET49.room.jogo, map:NET49.room.map})")
            P.confere(r6 == {'jogo': 'curva', 'map': 0}, 'o servidor não aceita a GINGA nem o VIADUTO (a sala continua COM CURVA, na Arena)', r6)
            await rt(A, "net49Send({type:'config', map:4})")
            await espera(B, "NET49.room && NET49.room.map === 4")
            await rt(A, "slIniciar()")
            await espera(B, "NET49.playing && NET49.room.round === 3 && NET49.lastTick > 0")
            vis = await rt(B, "({campo:CAMPO.id, jogo:RQ.jogo, curva:controleVisivel('curva'), finta:controleVisivel('finta')})")
            hostCampo = await rt(A, "CAMPO.id")
            P.confere(vis == {'campo': 'gramado', 'jogo': 'curva', 'curva': True, 'finta': False} and hostCampo == 'gramado', 'COM CURVA no ESTÁDIO: os dois no gramado e o convidado com o botão CURVA', [vis, hostCampo])
            # ---------------------------------------------------------------- pausa do árbitro e chat e nome
            print('\n7) pausa do árbitro, chat da sala e o nome que muda no cartão')
            await rt(A, "arbPausa(true)")
            pz = await espera(B, "NET49.paused === true && !document.getElementById('arb-faixa').hidden")
            P.confere(bool(pz), 'o árbitro pausa: a faixa PARTIDA PAUSADA aparece para o convidado')
            await rt(A, "arbPausa(false)")
            await espera(B, "NET49.paused === false")
            await rt(B, "slDiz('boa jogada!')")
            ch = await espera(A, "SL.chat.some(m => m.text === 'boa jogada!')")
            P.confere(bool(ch), 'o chat da sala chega do convidado para a anfitriã')
            await rt(B, "(() => { editarNome(true); LB.nomeIn.value = 'Betão'; confirmaNome(); return perfil.nome; })()")
            nm = await espera(A, "NET49.room.members.some(m => m.name === 'Betão')")
            P.confere(bool(nm), 'o convidado mudou o nome: o cartão da sala atualiza para a anfitriã')
            # ---------------------------------------------------------------- reconexão no meio da partida
            print('\n8) o convidado cai e volta no meio da partida')
            await rt(B, "NET49.ws.close()")
            bot = await espera(A, "(s => !RQ.jog[s].remote && /\\(bot\\)$/.test(RQ.jog[s].nome))(%d)" % slotB, 4000)
            P.confere(bool(bot), 'caiu: o anfitrião põe um bot no lugar (o time não fica com um a menos)')
            volta = await espera(B, "NET49.playing && NET49.localSlot >= 0 && NET49.room.round === 3", 12000)
            reat = await espera(A, "(s => RQ.jog[s].remote && RQ.jog[s].netId === %s)(%d)" % (json.dumps(await rt(B, "NET49.id")), slotB), 6000)
            P.confere(bool(volta) and bool(reat), 'voltou sozinho para a mesma partida e o anfitrião devolve o boneco (o bot sai)', [await rt(B, ESTADO)])
            evB = await rt(B, "window.__ev.map(e => e[0])")
            P.confere(evB.count('inicio') == 3, 'a volta não manda um segundo começo da mesma partida', evB)
            # ---------------------------------------------------------------- espectador
            print('\n9) um espectador entra pelo código')
            C = await sessao(pw, url, 'Caio'); sess.append(C)
            await rt(C, "abreTela('amigos')"); await espera(C, "!!NET49.id")
            await rt(C, "net49Send({type:'join', code:%s, spectate:true})" % json.dumps(sA))
            esp = await espera(C, "NET49.playing && NET49.localSlot < 0 && NET49.lastTick > 0", 8000)
            P.confere(bool(esp), 'o espectador entra no meio e assiste (recebe os quadros, sem boneco)', await rt(C, ESTADO))
            # ---------------------------------------------------------------- abandono
            print('\n10) o convidado sai no meio: abandono')
            ab0 = await rt(B, "(perfil.est['online|curva'] || {}).a | 0")
            await rt(B, "net49Send({type:'leave'})")
            ab = await espera(B, "!NET49.room && ((perfil.est['online|curva'] || {}).a | 0) > %d" % ab0)
            evB = await rt(B, "window.__ev.map(e => e[0] + (e[1].abandonada ? ':ab' : ''))")
            P.confere(bool(ab) and evB[-1] == 'fim:ab', 'saiu no meio: abandono nas estatísticas e o fim (abandonada) para a plataforma', evB)
            # ---------------------------------------------------------------- o clube da turma (a mesma tela do clube) e a tela AMIGOS (era a COMUNIDADE)
            print('\n11) o clube da turma (membros de verdade) e a tela AMIGOS')
            await rt(A, "abreTela('clube')")
            tag = await espera(A, "(document.querySelector('#cl-corpo .clb-onde') || {}).textContent")
            P.confere(tag == 'NA TURMA', 'conectado, o CLUBE é o da turma (o lugar aparece no título)', tag)
            gemas = await rt(A, "CONTA.gemas")
            await rt(A, "(() => { clbCriarAbre(); Object.assign(CLB.form, {nome:'Craques da Laje', descricao:'Bora!', tipo:'publico', trofeuMinimo:0, pais:'BR'}); clbCriar(); return true; })()")
            meu = await espera(A, "CLB.vista === 'clube' && CLB.clube && CLB.clube.nome === 'Craques da Laje' && CLB.clube.souDono && CLB.clube.lista.length")
            P.confere(bool(meu) and await rt(A, "CONTA.gemas") == gemas, 'criar o clube na turma (grátis, nenhuma gema cobrada): a Ana é a dona', await rt(A, "CLB.clube && {nome:CLB.clube.nome, membros:CLB.clube.membros}"))
            card = await espera(C, "(() => { const r = NET49.room, a = r && r.members.find(m => m.id === r.host); return a && a.club && a.club.name === 'Craques da Laje' && /^E\\./.test(a.club.escudo || '') ? a.club.name : null; })()")
            P.confere(bool(card), 'o escudo do clube novo aparece no cartão da sala para quem está nela (o espectador)', card)
            await rt(B, "abreTela('clube')")
            lista = await espera(B, "CLB.lista && CLB.lista.length && CLB.lista[0].nome")
            P.confere(lista == 'Craques da Laje', 'a outra sessão vê o clube na lista da turma', lista)
            await rt(B, "clbEntrar(CLB.lista[0])")
            ent = await espera(B, "CLB.clube && CLB.clube.souMembro && CLB.clube.lista.length === 2")
            P.confere(bool(ent), 'o Beto entra no clube público: dois membros de verdade', await rt(B, "CLB.clube && CLB.clube.lista.map(m => m.nome)"))
            como = await rt(B, "(() => { clbComoConta(clbApi()); const t = document.querySelector('#lb-pop .pop-txt').textContent; fechaPop(); return t; })()")
            P.confere('servidor da turma conferiu' in como, 'COMO OS TROFÉUS CONTAM explica a regra do lugar (a turma)', como[:90])
            await rt(A, "abreTela('comunidade')")
            # v77: cada botão abre só a tela dele: a COMUNIDADE virou a tela AMIGOS (os amigos e o chat); SALAS e EVENTOS (a copa) têm botão próprio
            hub = await espera(A, "(() => { const t = [...document.querySelectorAll('#cm-corpo .cm-card h3')].map(h => h.textContent); return t.length === 2 && document.querySelector('#cm-corpo .sx-st').textContent.indexOf('ONLINE') >= 0 ? t : null; })()")
            P.confere(hub == ['AMIGOS', 'CHAT DO BRASIL'], 'AMIGOS (era a COMUNIDADE): os amigos e o chat, com o estado ONLINE', hub)
            amg = await rt(A, "document.querySelector('#cm-corpo .cm-amigos').textContent")
            P.confere('Seu ID na turma' in amg, 'AMIGOS (sem conta): o ID da turma para convites e o caminho pela sala', amg[:120])
            # ---------------------------------------------------------------- erros
            for pg in sess:
                erros = [e for e in pg.erros if 'Failed to load resource' not in e and 'favicon' not in e]
                P.confere(not erros, 'nenhum erro de JavaScript na sessão de ' + pg.nome, erros[:3])
            for pg in sess: await pg.b.close()
    finally:
        srv.terminate()
        try: log = srv.communicate(timeout=3)[0]
        except Exception: log = ''
        if '--log' in sys.argv: print(log)
    return P.fim()

if __name__ == '__main__':
    roda(principal())
