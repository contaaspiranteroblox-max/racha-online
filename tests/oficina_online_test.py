"""v92 · OFICINA — o online de verdade: o servidor das salas (server/servidor.js, com a pasta dos mapas) e três sessões
do jogo no navegador (Ana, Beto e Caio: cada uma com o seu armazenamento).
  1) PUBLICAR pela janela do editor (o código de 7 letras); a comunidade (populares, busca por nome e por código);
     CURTIR, FAVORITAR (a aba Favoritos), DENUNCIAR (uma vez por pessoa; o criador vê a contagem);
  2) a SALA com o mapa publicado (4 times): entrar pelo código, pela lista de salas da Oficina e pela lista do GALERA
     (com a etiqueta OFICINA); o admin muda alguém de time; o chat; o JOGAR AGORA continua só nas salas comuns;
  3) a PARTIDA no servidor: os três recebem os quadros, os comandos de cada um mexem a tampinha certa (o servidor é a
     autoridade; a previsão de cada aparelho anda junto), a pausa do admin, a queda e a volta automática no mesmo lugar,
     quem assiste, o ENCERRAR do admin (não vale) e o fim natural (o gol de um mapa feito para isso: o resultado vale);
  4) as PERMISSÕES: editar e publicar só o criador e os colaboradores (a versão nova guarda a antiga), o "permitir copiar",
     o mapa privado fora da busca;
  5) o servidor REINICIA com a mesma pasta: os mapas, as versões, as curtidas, os favoritos e as denúncias continuam; a
     MODERAÇÃO (com --moderadores): a fila, marcar como oficial (a aba Oficiais), ocultar e restaurar;
  6) a sala comum continua a de sempre (a tela de sempre, sem passar pela Oficina).
Rodar:  python3 tests/oficina_online_test.py
"""
import sys, json, asyncio, socket, subprocess, time, tempfile, shutil, os
from comum import Placar, rt, roda, async_playwright, RAIZ, CHROME, HARNESS, FONTES

def porta_livre():
    s = socket.socket(); s.bind(('127.0.0.1', 0)); p = s.getsockname()[1]; s.close(); return p

def sobe(porta, pasta, moderadores=''):
    # (a turma também em arquivo: quem joga sem conta é reconhecido pelo token depois do reinício, como no servidor de verdade)
    args = ['node', str(RAIZ / 'tests' / 'servidor_visitantes.cjs'), '--porta', str(porta), '--host', '127.0.0.1', '--dados', os.path.join(pasta, 'turma.json'), '--mapas', os.path.join(pasta, 'mapas'), '--estaticos', str(RAIZ), '--nome', 'Teste da Oficina', '--sem-p2p']
    if moderadores: args += ['--moderadores', moderadores]
    p = subprocess.Popen(args, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    t0 = time.time()
    while time.time() - t0 < 8:
        try:
            s = socket.create_connection(('127.0.0.1', porta), timeout=.3); s.close(); return p
        except OSError:
            time.sleep(.1)
    return p

async def sessao(pw, url, nome, w=844, h=390):
    b = await pw.chromium.launch(executable_path=CHROME, args=['--no-sandbox', '--autoplay-policy=no-user-gesture-required'])
    ctx = await b.new_context(viewport={'width': w, 'height': h}, has_touch=True)
    await ctx.add_init_script("document.addEventListener('DOMContentLoaded',()=>{const s=document.createElement('style');s.textContent=%s;document.head.prepend(s);});" % json.dumps(FONTES))
    await ctx.add_init_script("try{if(!localStorage.getItem('racha-treino-perfil-v1'))localStorage.setItem('racha-treino-perfil-v1', JSON.stringify({nome:%s, st:{partidas:3, concluidas:3}}));}catch(e){}" % json.dumps(nome))
    pg = await ctx.new_page()
    pg.erros = []
    pg.on('pageerror', lambda e: pg.erros.append(str(e)[:300]))
    pg.on('console', lambda m: pg.erros.append('console: ' + m.text[:200]) if m.type == 'error' and '404' not in m.text else None)
    await pg.goto(url)
    await pg.wait_for_function('() => typeof window.__RT === "function" && window.OFI && OFI.pronta', polling=100, timeout=20000)
    await pg.wait_for_timeout(600)
    await pg.evaluate("(() => { const o = document.getElementById('onb'); if (o) o.hidden = true; })()")
    await rt(pg, "(() => { if (typeof v84Fecha === 'function') v84Fecha(); return 1; })()")
    await rt(pg, HARNESS)
    await rt(pg, "(() => { filaPop.length = 0; if (!LB.pop.hidden) fechaPop(); return true; })()")
    pg.b, pg.nome = b, nome
    return pg

async def espera(pg, js, ms=6000):
    """espera a expressão (avaliada dentro do script do jogo: enxerga o OFI e também o NET49, o SL…) ficar verdadeira"""
    t0 = time.time()
    while True:
        try:
            v = await pg.evaluate('s => window.__RT(s)', js)
        except Exception:
            v = None
        if v:
            return v
        if (time.time() - t0) * 1000 > ms:
            return v
        await asyncio.sleep(.1)

async def pede(pg, op, args=None, ms=8000):
    return await pg.evaluate("async ([op, a, ms]) => OFI.interno.pede(op, a, ms)", [op, args or {}, ms])

async def clica(pg, rotulo, onde='.ofi-jan button, .ofi-item, .ofi-bt'):
    return await pg.evaluate("([r, onde]) => { const re = new RegExp(r); const b = [...document.querySelectorAll(onde)].filter(x => x.offsetParent !== null || x.closest('.ofi-jan')).find(x => re.test(x.textContent || '')); if (!b) return false; b.click(); return true; }", [rotulo, onde])

async def publica(pg, modelo, nome, vis='publico', ajusta=None):
    """abre o modelo no editor e publica pela janela de PUBLICAR → o código"""
    falta = 16 - (time.time() - getattr(pg, 'ult_pub', 0))   # (o servidor deixa cada pessoa publicar uma vez a cada 15 s)
    if falta > 0:
        await asyncio.sleep(falta)
    pg.ult_pub = time.time()
    await pg.evaluate("""async ([modelo, nome, ajusta]) => { const I = OFI.interno; const md = I.MODELOS.find(m => m.id === modelo); const M = I.limpaModelo(md.faz(), nome);
      M.nome = nome; if (ajusta) (new Function('M', ajusta))(M); const l = RachaMapa.limpa(M); const reg = await I.novoRascunho(l.mapa); await I.editorAbre(reg); }""", [modelo, nome, ajusta])
    await pg.wait_for_timeout(300)
    await pg.evaluate("() => { OFI.interno.publicaDialogo(OFI.interno.OFE.reg, OFI.interno.OFE.M); return true; }")   # (sem esperar: a promessa só termina com a janela fechada)
    await espera(pg, "!!document.querySelector('.ofi-pub')", 6000)
    if vis != 'publico':   # (a visibilidade são 3 botões: Público, Não listado, Privado)
        rot = {'naoListado': 'Não listado', 'privado': 'Privado'}[vis]
        await pg.evaluate("(r) => [...document.querySelectorAll('.ofi-jan .ofi-seg-bt')].find(b => b.textContent === r).click()", rot)
    await clica(pg, '^PUBLICAR')
    ok = await espera(pg, "(() => { const b = document.querySelector('.ofi-codigo.grande b'); return b && b.textContent; })()", 10000)
    await pg.evaluate("() => [...document.querySelectorAll('.ofi-jan-fundo .ofi-jan-tit .ofi-x')].reverse().forEach(b => b.click())")
    return ok

ESTADO_REDE = """() => { const J = OFI.interno.OFJ, R = J.rede; if (!J.on || !R) return null; const P = R.P;
  return { tick: R.tick, slot: R.slot, pausado: R.pausado, estado: P.estado, placar: P.placar.slice(), jog: P.jog.map(q => [Math.round(q.x), Math.round(q.y), q.fora ? 1 : 0]), menu: !!J.menu }; }"""

async def principal():
    P = Placar('Oficina · o online de verdade (servidor + 3 sessões)')
    porta = porta_livre()
    pasta = tempfile.mkdtemp(prefix='racha-mapas-')
    srv = sobe(porta, pasta)
    url = 'http://127.0.0.1:%d/tests/build/racha_teste.html' % porta
    sess = []
    try:
        async with async_playwright() as pw:
            A = await sessao(pw, url, 'Ana'); B = await sessao(pw, url, 'Beto'); C = await sessao(pw, url, 'Caio'); sess += [A, B, C]
            for pg in (A, B, C):
                await pg.evaluate("() => OFI.abre('hub')")
            ok = [await espera(pg, "(async () => (await OFI.interno.conecta(6000)) && !!NET49.id)()", 9000) for pg in (A, B, C)]
            P.confere(all(ok), 'as três sessões abrem a Oficina e conectam no servidor das salas (o mesmo endereço do jogo)', ok)
            eu = {}
            for pg in (A, B, C):
                r = await pede(pg, 'eu')
                eu[pg.nome] = r
            P.confere(all(eu[n]['ok'] for n in eu), 'cada um sabe quem é no servidor (o id e o ID público)', {n: eu[n].get('pub') for n in eu})

            # ---------------------------------------------------------------- 1) publicar e a comunidade
            print('\n1) publicar, a comunidade, curtir, favoritar e denunciar')
            cod = await publica(A, 'quatro', 'Arena da Ana')
            P.confere(cod and len(cod) == 7, 'PUBLICAR (a janela do editor) devolve o código de 7 letras do mapa', cod)
            r = await pede(A, 'lista', {'aba': 'meus'})
            P.confere(r['ok'] and r['total'] == 1 and r['itens'][0]['codigo'] == cod and r['itens'][0]['meu']['dono'], 'o mapa aparece em Meus mapas (no servidor) como seu', r.get('itens'))
            reg = await A.evaluate("() => OFI.interno.OFE.reg.remoto")
            P.confere(reg and reg['codigo'] == cod and reg['versao'] == 1, 'o rascunho do aparelho fica ligado ao publicado (código e versão 1)', reg)
            await B.evaluate("() => OFI.interno.mudaAba('comunidade')")
            await espera(B, "document.querySelectorAll('.ofi-grade .ofi-cartao').length > 0", 6000)
            nomes = await B.evaluate("() => [...document.querySelectorAll('.ofi-grade .ofi-cartao')].map(c => c.getAttribute('aria-label'))")
            P.confere('Arena da Ana' in nomes, 'o Beto vê o mapa na COMUNIDADE (mais jogados)', nomes)
            for termo in [cod, 'arena da', 'ANA']:
                r = await pede(B, 'lista', {'aba': 'busca', 'busca': termo})
                P.confere(r['ok'] and any(x['codigo'] == cod for x in r['itens']), 'BUSCAR por "%s" acha o mapa (nome, criador ou código)' % termo)
            await B.evaluate("(c) => { OFI.interno.HU.busca.value = c; [...document.querySelectorAll('.ofi-hub-busca .ofi-bt')][0].click(); }", cod)
            abriu = await espera(B, "!!document.querySelector('.ofi-jan-det')", 6000)
            P.confere(abriu, 'a busca pelo código abre direto a página do mapa')
            await clica(B, '^CURTIR$')
            ok = await espera(B, "/CURTIDO/.test(document.querySelector('.ofi-jan-det').innerText)", 5000)
            await clica(B, '^FAVORITAR$')
            ok2 = await espera(B, "/FAVORITO/.test(document.querySelector('.ofi-jan-det').innerText)", 5000)
            P.confere(ok and ok2, 'CURTIR e FAVORITAR na página do mapa (o botão muda na hora)')
            await B.evaluate("() => [...document.querySelectorAll('.ofi-jan-fundo .ofi-jan-tit .ofi-x')].reverse().forEach(b => b.click())")
            r = await pede(B, 'lista', {'aba': 'favoritos'})
            P.confere(r['ok'] and r['total'] == 1 and r['itens'][0]['curtidas'] == 1 and r['itens'][0]['meu']['curti'] and r['itens'][0]['meu']['favorito'], 'a aba FAVORITOS tem o mapa (1 curtida, curtido e favorito pelo Beto)', r.get('itens'))
            r1 = await pede(B, 'denunciar', {'codigo': cod, 'motivo': 'quebrado', 'texto': 'o gol do canto não funciona'})
            r2 = await pede(B, 'denunciar', {'codigo': cod, 'motivo': 'quebrado', 'texto': 'de novo'})
            r3 = await pede(A, 'denunciar', {'codigo': cod, 'motivo': 'spam'})
            P.confere(r1['ok'] and r1['nova'] and r2['ok'] and not r2['nova'] and not r3['ok'], 'DENUNCIAR: uma vez por pessoa (a segunda não conta) e o criador não denuncia o próprio mapa', (r1, r2, r3))
            r = await pede(A, 'abrir', {'codigo': cod})
            P.confere(r['ok'] and r['meta'].get('denuncias') == 1, 'o criador vê quantas denúncias o mapa tem', r['meta'].get('denuncias'))
            r = await pede(B, 'abrir', {'codigo': cod})
            P.confere(r['ok'] and 'denuncias' not in r['meta'] and 'dono' not in r['meta'], 'quem não é o criador não vê as denúncias nem os dados internos do mapa')

            # ---------------------------------------------------------------- 2) a sala com o mapa publicado
            print('\n2) a sala com o mapa publicado (4 times): entrar, os times, o chat e a lista de salas')
            mid = r['meta']['id']
            await A.evaluate("(id) => OFI.interno.OFS.criaSala({ mapa: { id }, pub: true, bots: true, n: 1, name: 'Sala da Arena' }, 'hub')", mid)
            ok = await espera(A, "OFI.interno.OFS.code && OFI.tela === 'sala' && !!OFI.interno.OFS.mapa", 8000)
            sala = await A.evaluate("() => OFI.interno.OFS.code")
            r = await rt(A, "(() => { const r = OFI.interno.OFS.sala; return [r.E, r.n, r.roster.length, r.mapa && r.mapa.codigo, r.admin === NET49.id, document.querySelectorAll('.ofi-time-c').length]; })()")
            P.confere(ok and r[0] == 4 and r[2] == 4 and r[3] == cod and r[4] and r[5] == 4, 'JOGAR abre a sala com o mapa: 4 times, quem criou é o admin, a tela da sala mostra os 4 times', r)
            # o Caio entra pelo código da sala (o botão SALA da central)
            await C.evaluate("() => { OFI.mostra('hub'); }")
            await C.evaluate("(s) => { setTimeout(() => { const i = document.querySelector('.ofi-jan input'); i.value = s; [...document.querySelectorAll('.ofi-jan-pe button')].find(b => b.textContent === 'OK').click(); }, 60); document.querySelector('.ofi-hub-sala').click(); }", sala)
            ok = await espera(C, "OFI.interno.OFS.code === " + json.dumps(sala) + " && OFI.tela === 'sala'", 8000)
            P.confere(ok, 'o Caio entra pelo código da sala (o botão SALA da central) e a tela da sala abre')
            # o Beto acha a sala na lista da Comunidade (SALAS ABERTAS COM MAPA) e entra
            await B.evaluate("() => { OFI.mostra('hub'); OFI.interno.mudaAba('comunidade'); }")
            ok = await espera(B, "[...document.querySelectorAll('.ofi-sala-l')].some(l => /Sala da Arena/.test(l.textContent))", 8000)
            P.confere(ok, 'a Comunidade mostra a sala aberta com o mapa (SALAS ABERTAS COM MAPA DA OFICINA)')
            await B.evaluate("() => [...document.querySelectorAll('.ofi-sala-l')].find(l => /Sala da Arena/.test(l.textContent)).querySelector('.ofi-bt').click()")
            ok = await espera(B, "OFI.interno.OFS.code === " + json.dumps(sala) + " && OFI.tela === 'sala'", 8000)
            r = await espera(A, "(() => { const r = OFI.interno.OFS.sala; return r.roster.filter(Boolean).length === 3 && r.roster; })()", 6000)
            P.confere(ok and r, 'o Beto entra pela lista (JOGAR AGORA na sala com vaga): os três estão nos times', r)
            # a lista do GALERA (a do jogo de sempre) mostra a sala com a etiqueta
            await rt(C, "(() => { net49Send({ type: 'list' }); return 1; })()")
            tem = await espera(C, "(() => { const l = (SL.lista || []).find(s => s.code === " + json.dumps(sala) + "); if (!l || !l.mapa) return false; const d = sbLinha(l); return /OFICINA/.test(d.textContent) && /MAPA «Arena da Ana»/.test(d.textContent); })()", 6000)
            P.confere(tem, 'na lista de salas do GALERA a sala aparece com a etiqueta OFICINA e o nome do mapa')
            r = await rt(C, "(() => { const antes = net49Send; let mandou = null; net49Send = m => { mandou = m; }; try { slRapido(); } finally { net49Send = antes; } return mandou; })()")
            P.confere(r and r.get('type') == 'create', 'o JOGAR AGORA do jogo de sempre não cai na sala da Oficina (abre uma sala comum)', r)
            # o admin muda o Caio de time
            cid = await rt(C, "NET49.id")
            await A.evaluate("(id) => OFI.interno.mandaSala({ type: 'seat', id, team: 3 })", cid)
            ok = await espera(C, "OFI.interno.OFS.sala.roster[3] === NET49.id", 5000)
            P.confere(ok, 'o admin muda o Caio para o TIME D (a tela de todos atualiza)')
            await C.evaluate("() => { const i = OFI.interno.SU.chatIn; i.value = 'cheguei no time D'; i.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); }")
            ok = await espera(A, "OFI.interno.OFS.chat.some(m => m.text === 'cheguei no time D')", 5000) and await espera(B, "[...document.querySelectorAll('.ofi-chat-m')].some(m => /cheguei no time D/.test(m.textContent))", 5000)
            P.confere(ok, 'o CHAT DA SALA: a mensagem do Caio chega na Ana e aparece na tela do Beto')

            # ---------------------------------------------------------------- 3) a partida no servidor
            print('\n3) a partida no servidor: os quadros, os comandos, a pausa, a queda e a volta, quem assiste e o fim')
            await A.evaluate("() => document.querySelector('.ofi-sala-comecar').click()")
            ok = [await espera(pg, "OFI.interno.OFJ.on && OFI.interno.OFJ.modo === 'rede' && OFI.interno.OFJ.rede && !OFI.interno.OFJ.rede.semSnap", 8000) for pg in (A, B, C)]
            P.confere(all(ok), 'COMEÇAR: os três entram na partida e recebem os quadros do servidor', ok)
            e = [await pg.evaluate(ESTADO_REDE) for pg in (A, B, C)]
            P.confere(len(set(x['slot'] for x in e)) == 3 and all(len(x['jog']) == 4 for x in e), 'cada um controla a sua vaga (3 vagas diferentes) e todos veem as 4 tampinhas', [x['slot'] for x in e])
            await A.wait_for_timeout(600)
            sB = e[1]['slot']
            x0 = (await A.evaluate(ESTADO_REDE))['jog'][sB][0]
            await B.keyboard.down('ArrowRight'); await B.wait_for_timeout(900); await B.keyboard.up('ArrowRight')
            await A.wait_for_timeout(300)
            x1 = (await A.evaluate(ESTADO_REDE))['jog'][sB][0]
            xb = (await B.evaluate(ESTADO_REDE))['jog'][sB][0]
            P.confere(x1 > x0 + 60 and abs(xb - x1) < 40, 'o comando do Beto (a seta) mexe a tampinha dele no servidor: a Ana vê, e a previsão do Beto anda junto', (x0, x1, xb))
            # a pausa do admin
            await A.evaluate("() => { OFI.interno.mandaSala({ type: 'pause', paused: true }); OFI.interno.OFJ.pausaRede(true); }")
            await B.wait_for_timeout(400)
            t1 = (await B.evaluate(ESTADO_REDE)); await B.wait_for_timeout(500); t2 = (await B.evaluate(ESTADO_REDE))
            P.confere(t1['pausado'] and t1['tick'] == t2['tick'], 'PAUSAR (o admin): para todos, o servidor para o relógio', (t1['tick'], t2['tick']))
            await A.evaluate("() => { OFI.interno.mandaSala({ type: 'pause', paused: false }); OFI.interno.OFJ.pausaRede(false); }")
            ok = await espera(B, "(() => { const R = OFI.interno.OFJ.rede; return R && !R.pausado; })()", 4000)
            t3 = await espera(B, "(() => { const R = OFI.interno.OFJ.rede; return R && R.tick > " + str(t2['tick'] + 20) + "; })()", 4000)
            P.confere(ok and t3, 'RETOMAR: a partida volta para todos')
            # a queda do Caio e a volta automática
            sC = (await C.evaluate(ESTADO_REDE))['slot']
            await rt(C, "(() => { NET49.ws.close(); return 1; })()")
            caiu = await espera(C, "!!OFI.interno.OFS.quer", 4000)
            bot = await espera(A, "(() => { const R = OFI.interno.OFJ.rede; return R && R.P.jog[" + str(sC) + "].ehBot; })()", 5000)
            voltou = await espera(C, "(() => { const J = OFI.interno.OFJ, R = J.rede; return J.on && R && R.slot === " + str(sC) + " && !OFI.interno.OFS.quer && R.tick > 0 && !R.semSnap && !!NET49.ws && NET49.ws.readyState === 1; })()", 15000)
            humano = await espera(A, "(() => { const R = OFI.interno.OFJ.rede; return R && !R.P.jog[" + str(sC) + "].ehBot; })()", 6000)
            # (se a conexão nova chega antes de o servidor ver a velha cair, ele continua direto na mesma tampinha, sem o bot no meio:
            #  o bot segurando a vaga é conferido sem corrida no tests/oficina_servidor_test.js)
            P.confere(voltou and humano, 'A INTERNET DO CAIO CAI: ele volta sozinho para a mesma vaga e reassume a tampinha (enquanto estava fora, um bot segurou a vaga: %s)' % ('visto' if bot else 'a volta foi antes'), (caiu, bot, voltou, humano))
            # o admin encerra (não vale)
            await A.evaluate("() => OFI.interno.mandaSala({ type: 'mapa_encerrar' })")
            ok = [await espera(pg, "(() => { const J = OFI.interno.OFJ; return J.menu && /PARTIDA ENCERRADA/.test(J.menu.innerText) && /não vale/.test(J.menu.innerText); })()", 6000) for pg in (A, B, C)]
            P.confere(all(ok), 'ENCERRAR (o admin): todos veem o resultado que não vale', ok)
            for pg in (A, B, C):
                await pg.evaluate("() => [...OFI.interno.OFJ.menu.querySelectorAll('button')].find(b => /VOLTAR PARA A SALA/.test(b.textContent)).click()")
            ok = [await espera(pg, "OFI.tela === 'sala' && !OFI.interno.OFJ.on && !OFI.raiz.hidden", 4000) for pg in (A, B, C)]
            P.confere(all(ok), 'VOLTAR PARA A SALA: todos de volta na tela da sala', ok)
            # o Beto só assiste; o fim natural num mapa feito para isso (a bola nasce com um impulso para dentro do gol do Time B)
            await B.evaluate("() => OFI.interno.mandaSala({ type: 'seat', slot: -1 })")
            await espera(A, "OFI.interno.OFS.sala.members.some(m => m.slot < 0)", 4000)
            # (o mapa: a bola nasce dentro de uma zona de impulso que a leva para baixo, para dentro do gol do Time B; sem bots, só a
            #  Ana no Time A — a formação dela fica do lado esquerdo da bola, fora do caminho)
            ajusta = ("M.partida.meta = 1; M.partida.equipes = 2; M.partida.porTime = 1; M.partida.porMin = 1; M.partida.porMax = 2; M.partida.times = M.partida.times.slice(0, 2); M.partida.bots = false;"
                      "M.objetos = M.objetos.filter(o => o.tipo !== 'gol' && o.tipo !== 'spawnBola');"
                      "M.objetos.push({ id: 'gA', tipo: 'gol', x: -M.campo.w / 2, y: 0, rot: 180, largura: 14, prof: 6.6, dono: 0 }, { id: 'gB', tipo: 'gol', x: 0, y: M.campo.h / 2, rot: 90, largura: 14, prof: 6.6, dono: 1 },"
                      "{ id: 'zi', tipo: 'zona', efeito: 'impulso', forca: 160, dir: 90, x: 0, y: 14, w: 10, h: 24, afeta: 'bola' }, { id: 'sb', tipo: 'spawnBola', x: 0, y: 6 });")
            cod2 = await publica(A, 'vazio', 'Gol Automático', 'naoListado', ajusta)
            P.confere(cod2 and len(cod2) == 7, 'um segundo mapa (não listado) publicado: "Gol Automático"', cod2)
            r = await pede(A, 'abrir', {'codigo': cod2})
            await A.evaluate("(id) => OFI.interno.mandaSala({ type: 'config', mapa: { id }, bots: false })", r['meta']['id'])
            ok = [await espera(pg, "(() => { const r = OFI.interno.OFS.sala; return r && r.mapa && r.mapa.codigo === " + json.dumps(cod2) + " && OFI.interno.OFS.mapa && OFI.interno.OFS.mapa.info.codigo === " + json.dumps(cod2) + "; })()", 6000) for pg in (A, B, C)]
            P.confere(all(ok), 'TROCAR O MAPA (o admin): a sala passa para o novo mapa e o mapa chega em todos (o mesmo hash)', ok)
            r = await A.evaluate("() => { const r = OFI.interno.OFS.sala; return [r.E, r.roster.length, r.members.filter(m => m.slot >= 0).length]; }")
            P.confere(r[0] == 2, 'com o mapa de 2 times a sala vira 2 times (quem não cabe vai assistir)', r)
            await rt(A, "(() => { const r = OFI.interno.OFS.sala; if (!r.roster.includes(NET49.id)) OFI.interno.mandaSala({ type: 'seat', team: 0 }); return 1; })()")
            await A.wait_for_timeout(400)
            await A.evaluate("() => document.querySelector('.ofi-sala-comecar').click()")
            vendo = await espera(B, "(() => { const J = OFI.interno.OFJ; return J.on && J.rede && J.rede.slot === -1 && !J.rede.semSnap; })()", 8000)
            P.confere(vendo, 'quem só assiste entra na partida como espectador (recebe os quadros, sem vaga)')
            fim = [await espera(pg, "(() => { const J = OFI.interno.OFJ; return J.menu && /VITÓRIA|DERROTA|EMPATE/.test(J.menu.innerText) && J.fimRes && J.fimRes.valida !== false && J.fimRes.score; })()", 15000) for pg in (A, B, C)]
            P.confere(all(fim) and fim[0][0] + fim[0][1] == 1, 'o FIM NATURAL: o gol (o impulso leva a bola para o gol do Time B), a meta de 1 e o resultado que vale chegam em todos', fim)
            ban = [await pg.evaluate("() => { const b = OFI.interno.OFJ.banner; return b ? b.t : ''; }") for pg in (A, B, C)]
            P.confere(all('GOL DO' in b for b in ban), 'o letreiro GOL DO TIME… aparece em todos, também em quem assiste (o evento do gol chega pela rede)', ban)
            for pg in (A, B, C):
                await pg.evaluate("() => { const J = OFI.interno.OFJ; if (J.menu) [...J.menu.querySelectorAll('button')].find(b => /VOLTAR PARA A SALA/.test(b.textContent)).click(); }")
            await espera(A, "OFI.tela === 'sala'", 4000)

            # ---------------------------------------------------------------- 4) as permissões
            print('\n4) as permissões: colaborador, versão nova, permitir copiar e o mapa privado')
            r = await pede(B, 'abrir', {'codigo': cod})
            P.confere(r['ok'] and not r['meta']['meu']['editar'] and r['meta']['meu']['duplicar'], 'o Beto não edita o mapa da Ana (pode jogar e duplicar: a Ana deixou copiar)', r['meta']['meu'])
            r = await pede(B, 'publicar', {'id': r['meta']['id'], 'mapa': r['mapa']})
            P.confere(not r['ok'], 'o servidor recusa a versão nova de quem não tem permissão', r.get('erro'))
            r = await pede(A, 'colab', {'codigo': cod, 'pub': eu['Beto']['pub'], 'perms': {'editar': True, 'testar': True, 'publicar': True, 'duplicar': False}})
            P.confere(r['ok'] and any(c['nome'] == 'Beto' for c in r['meta']['colaboradores']), 'a Ana põe o Beto como COLABORADOR pelo ID público (editar e publicar)', r.get('erro') or r['meta'].get('colaboradores'))
            r = await pede(B, 'abrir', {'codigo': cod})
            mapa = r['mapa']; mapa['descricao'] = 'versão do Beto'
            r2 = await pede(B, 'publicar', {'id': r['meta']['id'], 'mapa': mapa, 'nota': 'ajustes do Beto'})
            v = await pede(A, 'versoes', {'codigo': cod})
            P.confere(r2['ok'] and r2['meta']['versao'] == 2 and v['ok'] and [x['versao'] for x in v['versoes']] == [2, 1], 'o colaborador publica a VERSÃO 2 e a versão 1 continua guardada', (r2.get('erro'), v.get('versoes')))
            r = await pede(A, 'abrir', {'codigo': cod, 'versao': 1})
            P.confere(r['ok'] and r['versao'] == 1, 'o criador abre a versão antiga (para voltar nela)', r.get('erro'))
            await pede(A, 'config', {'codigo': cod, 'campos': {'permiteCopiar': False}})
            r = await pede(C, 'abrir', {'codigo': cod})
            P.confere(r['ok'] and not r['meta']['meu']['duplicar'], 'PERMITIR COPIAR desligado: o Caio não duplica mais', r['meta']['meu'])
            await C.evaluate("(m) => { OFI.interno.detalhesMapa(m); return true; }", r['meta'])
            await C.wait_for_timeout(300)
            bts = await C.evaluate("() => [...document.querySelectorAll('.ofi-jan-det .ofi-bt')].map(b => b.textContent)")
            P.confere(not any('DUPLICAR' in x for x in bts) and not any('EDITAR' in x for x in bts) and any('CRIAR SALA' in x for x in bts), 'a página do mapa não mostra DUPLICAR nem EDITAR para o Caio (mostra CRIAR SALA)', bts)
            await C.evaluate("() => [...document.querySelectorAll('.ofi-jan-fundo .ofi-jan-tit .ofi-x')].reverse().forEach(b => b.click())")
            cod3 = await publica(C, 'x1', 'Segredo do Caio', 'privado')   # (o Caio: a Ana acabou de publicar — uma publicação a cada 15 s por pessoa)
            r = await pede(B, 'lista', {'aba': 'busca', 'busca': cod3})
            r2 = await pede(B, 'abrir', {'codigo': cod3})
            P.confere(cod3 and r['ok'] and not r['itens'] and not r2['ok'], 'o mapa PRIVADO não aparece na busca nem abre para os outros', (r.get('itens'), r2.get('erro')))

            # ---------------------------------------------------------------- 5) reinício do servidor e a moderação
            print('\n5) o servidor reinicia com a mesma pasta; a moderação')
            for pg in (A, B, C):
                await pg.evaluate("() => { if (OFI.interno.OFS.code) OFI.interno.OFS.sai(); }")
            await A.wait_for_timeout(500)
            srv.terminate(); srv.communicate(timeout=8)
            srv = sobe(porta, pasta, moderadores=eu['Caio']['id'])
            for pg in (A, B, C):
                await rt(pg, "(() => { try { if (NET49.ws) NET49.ws.close(); } catch (_) {} return 1; })()")
            ok = [await espera(pg, "(async () => (await OFI.interno.conecta(8000)) && !!NET49.id)()", 12000) for pg in (A, B, C)]
            P.confere(all(ok), 'o servidor reiniciou e as três sessões conectam de novo', ok)
            r = await pede(B, 'lista', {'aba': 'favoritos'})
            m = r['itens'][0] if r.get('ok') and r['itens'] else {}
            P.confere(m.get('codigo') == cod and m.get('curtidas') == 1 and m['meu']['curti'] and m['meu']['favorito'] and m.get('versao') == 2, 'depois do reinício: o mapa, a versão 2, a curtida e o favorito do Beto continuam (gravados em disco)', m)
            r = await pede(A, 'abrir', {'codigo': cod})
            P.confere(r['ok'] and r['meta'].get('denuncias') == 1, 'e a denúncia também', r['meta'].get('denuncias'))
            r = await pede(C, 'eu')
            P.confere(r['ok'] and r['staff'], 'o Caio (em --moderadores) é da equipe que modera', r)
            await C.evaluate("() => { if (OFI.interno.OFE.aberto) OFI.interno.editorSai(); OFI.mostra('hub'); OFI.interno.HUB.eu = null; setTimeout(() => OFI.interno.mudaAba('moderacao'), 300); }")   # (o Caio estava no editor: publicou o mapa privado)
            ok = await espera(C, "[...document.querySelectorAll('.ofi-hub-aba')].some(b => b.dataset.a === 'moderacao' && !b.hidden) && /Arena da Ana/.test(document.querySelector('.ofi-grade').innerText) && /quebrado|Mapa quebrado/.test(document.querySelector('.ofi-grade').innerText)", 6000)
            P.confere(ok, 'a aba MODERAÇÃO (só para a equipe) mostra o mapa denunciado com o motivo')
            nao = await A.evaluate("() => [...document.querySelectorAll('.ofi-hub-aba')].find(b => b.dataset.a === 'moderacao').hidden")
            P.confere(nao, 'quem não é da equipe não vê a aba Moderação')
            r = await pede(C, 'moderar', {'codigo': cod, 'acao': 'oficial'})
            l = await pede(B, 'lista', {'aba': 'oficiais'})
            P.confere(r['ok'] and any(x['codigo'] == cod for x in l['itens']), 'MARCAR COMO OFICIAL: o mapa entra na aba Oficiais', r.get('erro'))
            r = await pede(C, 'moderar', {'codigo': cod, 'acao': 'ocultar'})
            l = await pede(B, 'lista', {'aba': 'populares'})
            l2 = await pede(A, 'abrir', {'codigo': cod})
            P.confere(r['ok'] and not any(x['codigo'] == cod for x in l['itens']) and l2['ok'] and l2['meta']['estado'] == 'oculto', 'OCULTAR: sai da comunidade (o criador ainda vê, com o aviso)', l2['meta'].get('estado'))
            r = await pede(C, 'moderar', {'codigo': cod, 'acao': 'restaurar'})
            l = await pede(B, 'lista', {'aba': 'populares'})
            P.confere(r['ok'] and any(x['codigo'] == cod for x in l['itens']), 'RESTAURAR: volta para a comunidade')
            r = await pede(B, 'moderar', {'codigo': cod, 'acao': 'remover'})
            P.confere(not r['ok'], 'quem não é da equipe não modera (o servidor recusa)')

            # ---------------------------------------------------------------- 6) a sala comum continua a de sempre
            print('\n6) a sala comum continua a de sempre')
            await B.evaluate("() => OFI.fecha()")
            await rt(B, "(() => { abreTela('amigos'); slCriar(false); return 1; })()")
            ok = await espera(B, "!!(NET49.room && NET49.room.code)", 6000)
            st = await rt(B, "JSON.stringify({ sala: !!NET49.room, mapa: NET49.room ? NET49.room.mapa : 'x', tela: lobby.tela, ofi: OFI.aberta, E: NET49.room ? NET49.room.E : 0 })")
            st = json.loads(st)
            P.confere(ok and st['sala'] and st['mapa'] is None and st['tela'] == 'sala' and not st['ofi'] and st['E'] == 2, 'criar uma sala comum abre a tela de sempre (2 times, sem passar pela Oficina)', st)
            await rt(B, "(() => { net49Send({type:'leave'}); return 1; })()")
            for pg in (A, B, C):
                erros = [e for e in pg.erros if 'Failed to load resource' not in e]
                P.confere(not erros, pg.nome + ': sem erros no console', erros[:4])
            for pg in sess:
                await pg.b.close()
    finally:
        try:
            srv.terminate(); out = srv.communicate(timeout=8)[0]
            erros = [l for l in out.splitlines() if 'erro nos mapas' in l or 'Error' in l]
            if erros: print('servidor:', '\n'.join(erros[:10]))
        except Exception:
            pass
        shutil.rmtree(pasta, ignore_errors=True)
    return P.fim()

if __name__ == '__main__':
    roda(principal())
