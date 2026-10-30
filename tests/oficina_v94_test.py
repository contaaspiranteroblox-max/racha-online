"""RACHA · a OFICINA desta versão no online de verdade: o servidor das salas (server/servidor.js, com a pasta dos mapas) e
duas sessões do jogo no navegador (a Ana no computador, o Beto no celular deitado).
  1) as CURTIDAS e os FAVORITOS no cartão da comunidade (o coração e a estrela: na hora, e tocar de novo tira);
  2) CRIAR SALA (o JOGAR dos mapas): a janela com a FÍSICA DA SALA — o tamanho da bola em 150% — e a sala nasce com ela
     (o mapa da sala chega com a física nova, a lista de salas avisa e o mapa publicado não muda); o servidor corta o que
     passa dos limites; nos AJUSTES da sala o admin troca para a predefinição Rápido;
  3) no máximo 3 mapas PÚBLICOS por criador: PÚBLICOS 3 DE 3 em Meus mapas, a janela de publicar sem o Público (publica como
     não listado), o CONFIGURAR que tenta deixar o 4º público é recusado — e com um não listado a vaga abre;
  4) a partida da sala com mapa, com o que veio da v93: o 3, 2, 1, JÁ! nos dois (o servidor segura e solta junto), os
     BALÕES DE FALA (a tecla T) de um aparecendo no outro, o GOL com o CARTÃO DE QUEM FEZ (a Ana, nos dois aparelhos) e o
     CRAQUE DA PARTIDA na tela do fim; a física da sala vale na partida (a mesma nos dois).
Rodar:  python3 tests/oficina_v94_test.py
"""
import json, asyncio, time, tempfile, shutil, os
from comum import Placar, rt, roda, async_playwright
from oficina_online_test import porta_livre, sobe, sessao, espera, pede, publica

# o mapa do gol da Ana: a Mini Arena X1 com a meta de 1 gol, a saída livre, a Ana nascendo à esquerda da bola, o Beto
# embaixo (fora do caminho) e uma zona de impulso à direita da bola que leva para o gol do Time B quem empurrar a bola nela
GOL_DA_ANA = ("M.partida.meta = 1; M.partida.saida = 'livre'; M.partida.bots = false;"
              "M.objetos = M.objetos.filter(o => o.tipo !== 'spawn' && o.tipo !== 'spawnBola');"
              "M.objetos.push({ id: 's0', tipo: 'spawn', equipe: 0, x: -4, y: 0 }, { id: 's1', tipo: 'spawn', equipe: 1, x: 0, y: 10 },"
              "{ id: 'sb', tipo: 'spawnBola', x: 0, y: 0 }, { id: 'zi', tipo: 'zona', efeito: 'impulso', forca: 160, dir: 0, x: 12, y: 0, w: 19, h: 10, afeta: 'bola' });")

CARTAO = "[...document.querySelectorAll('.ofi-grade .ofi-cartao')].find(c => c.getAttribute('aria-label') === %s)"
FECHA_JANELAS = "() => [...document.querySelectorAll('.ofi-jan-fundo .ofi-jan-tit .ofi-x')].reverse().forEach(b => b.click())"
BOTAO_PE = "(r) => { const b = [...document.querySelectorAll('.ofi-jan-pe button')].reverse().find(x => new RegExp(r).test(x.textContent || '')); if (!b) return false; b.click(); return true; }"

async def principal():
    P = Placar('Oficina desta versão no online (servidor + 2 sessões)')
    porta = porta_livre()
    pasta = tempfile.mkdtemp(prefix='racha-mapas94-')
    os.environ['RACHA_CONTAGEM_MS'] = '3000'; os.environ['RACHA_REPLAY'] = '1'   # (como no servidor de verdade: a contagem e o replay ligados)
    srv = sobe(porta, pasta)
    url = 'http://127.0.0.1:%d/tests/build/racha_teste.html' % porta
    sess = []
    try:
        async with async_playwright() as pw:
            A = await sessao(pw, url, 'Ana', 1280, 720); B = await sessao(pw, url, 'Beto'); sess += [A, B]
            for pg in (A, B):
                await pg.evaluate("() => OFI.abre('hub')")
            ok = [await espera(pg, "(async () => (await OFI.interno.conecta(6000)) && !!NET49.id)()", 9000) for pg in (A, B)]
            P.confere(all(ok), 'as duas sessões abrem a Oficina e conectam no servidor das salas', ok)
            eu = {pg.nome: await pede(pg, 'eu') for pg in (A, B)}
            P.confere(all(eu[n]['ok'] for n in eu) and eu['Ana'].get('maxPublicos') == 3 and eu['Ana'].get('publicos') == 0,
                      'o servidor diz o limite de mapas públicos de cada um (3; a Ana tem 0)', {n: (eu[n].get('publicos'), eu[n].get('maxPublicos')) for n in eu})

            # ---------------------------------------------------------------- 1) as curtidas e os favoritos no cartão
            print('\n1) curtir e favoritar no cartão da comunidade')
            cod1 = await publica(A, 'x1', 'Gol da Ana', 'publico', GOL_DA_ANA)
            P.confere(cod1 and len(cod1) == 7, 'a Ana publica o mapa «Gol da Ana» (público)', cod1)
            await B.evaluate("() => OFI.interno.mudaAba('comunidade')")
            achou = await espera(B, "!!" + CARTAO % json.dumps('Gol da Ana'), 8000)
            P.confere(achou, 'o Beto vê o cartão do mapa na COMUNIDADE')
            estado_cartao = "(() => { const c = %s; const b = [...c.querySelectorAll('.ofi-stat-bt')]; return b.map(x => [x.classList.contains('on'), x.textContent.trim()]); })()" % (CARTAO % json.dumps('Gol da Ana'))
            r0 = await rt(B, estado_cartao)
            clica_cartao = "(() => { const c = %s; c.querySelectorAll('.ofi-stat-bt')[%%d].click(); return true; })()" % (CARTAO % json.dumps('Gol da Ana'))
            await rt(B, clica_cartao % 0)
            r1 = await espera(B, "(() => { const r = %s; return r[0][0] && r[0][1] === '1' && r; })()" % estado_cartao, 5000)
            await rt(B, clica_cartao % 0)
            r2 = await espera(B, "(() => { const r = %s; return !r[0][0] && r[0][1] === '0' && r; })()" % estado_cartao, 5000)
            await rt(B, clica_cartao % 0)
            await espera(B, "(() => { const r = %s; return r[0][0] && r[0][1] === '1'; })()" % estado_cartao, 5000)
            await rt(B, clica_cartao % 1)
            r3 = await espera(B, "(() => { const r = %s; return r[1][0] && r[1][1] === '1' && r; })()" % estado_cartao, 5000)
            P.confere(r0 == [[False, '0'], [False, '0']] and r1 and r2 and r3, 'o CORAÇÃO e a ESTRELA do cartão curtem e favoritam na hora (tocar de novo tira a curtida)', (r0, r1, r2, r3))
            fav = await pede(B, 'lista', {'aba': 'favoritos'})
            m = fav['itens'][0] if fav.get('ok') and fav['itens'] else {}
            P.confere(fav.get('total') == 1 and m.get('codigo') == cod1 and m.get('curtidas') == 1 and m.get('favoritos') == 1 and m['meu']['curti'] and m['meu']['favorito'],
                      'no servidor: 1 curtida, 1 favorito e o mapa na aba FAVORITOS do Beto', m)

            # ---------------------------------------------------------------- 2) CRIAR SALA com a física da sala
            print('\n2) CRIAR SALA com a física da sala (o Beto, no celular)')
            await rt(B, "(() => { %s.querySelector('.ofi-cartao-bts button').click(); return true; })()" % (CARTAO % json.dumps('Gol da Ana')))
            ok = await espera(B, "!!document.querySelector('.ofi-jan-sala .ofi-fis-sala input.ofi-range[aria-label=\"Tamanho da bola\"]')", 8000)
            jan = await B.evaluate("""() => { const j = document.querySelector('.ofi-jan-sala'), pre = [...j.querySelectorAll('.ofi-fis-pre .ofi-seg-bt')];
              return { tit: j.querySelector('.ofi-jan-tit').textContent, pre: pre.filter(b => !b.hidden).map(b => b.textContent), on: (pre.find(b => b.classList.contains('on')) || {}).textContent,
                campos: [...j.querySelectorAll('.ofi-fis-sala input.ofi-range')].map(i => i.getAttribute('aria-label')), amostra: !!j.querySelector('canvas.ofi-fis-amostra'),
                txt: (j.querySelector('.ofi-fis-txt') || {}).textContent || '', nome: (j.querySelector('input.ofi-in[aria-label="Nome da sala"]') || {}).value }; }""")
            P.confere(ok and 'Criar sala' in jan['tit'] and jan['on'] == 'Do mapa' and {'Do mapa', 'Clássico', 'Rápido', 'Técnico'} <= set(jan['pre']) and jan['amostra'] and 'bola Ø' in jan['txt'] and jan['nome'] == 'Gol da Ana',
                      'a janela CRIAR SALA: o nome, as predefinições da física (começa na do mapa), a amostra e o alcance do chute', jan)
            P.confere({'Tamanho da bola', 'Velocidade máxima', 'Deslize no chão', 'Força do chute', 'Velocidade'} <= set(jan['campos']), 'os números da física da sala: a bola, o chute e as tampinhas', jan['campos'])
            r = await B.evaluate("""() => { const i = document.querySelector('.ofi-jan-sala input.ofi-range[aria-label="Tamanho da bola"]');
              i.value = '150'; i.dispatchEvent(new Event('input', { bubbles: true })); i.dispatchEvent(new Event('change', { bubbles: true }));
              const pre = [...document.querySelectorAll('.ofi-jan-sala .ofi-fis-pre .ofi-seg-bt')], on = pre.find(b => b.classList.contains('on'));
              return { on: on && on.textContent, txt: document.querySelector('.ofi-jan-sala .ofi-fis-txt').textContent }; }""")
            P.confere(r['on'] == 'Personalizada', 'mexer no tamanho da bola vira a física PERSONALIZADA (a amostra acompanha)', r)
            await B.evaluate(BOTAO_PE, '^CRIAR SALA')
            ok = await espera(B, "(() => { const S = OFI.interno.OFS; return S.code && OFI.tela === 'sala' && S.mapa && S.mapa.info && S.mapa.info.fisicaSala; })()", 9000)
            sala = await B.evaluate("() => OFI.interno.OFS.code")
            f = await rt(B, """(() => { const S = OFI.interno.OFS, base = RachaMapa.fisicaResolvida(S.mapa.info.fisicaMapa).perfil.rBola;
              return { base, sala: S.mapa.info.fisicaSala.perfil.rBola, mapa: S.mapa.mapa.fisica.perfil.rBola, preset: S.mapa.info.fisicaSala.preset, hash: S.mapa.hash, texto: OFI.interno.SU.mapa.textContent,
                admin: S.sala.admin === NET49.id }; })()""")
            P.confere(ok and f['admin'] and abs(f['sala'] - 1.5 * f['base']) < 1e-3 and abs(f['mapa'] - f['sala']) < 1e-9 and f['preset'] == 'personalizado',
                      'a sala nasce com a física da sala: a bola em 150%% (%.2f u → %.2f u) no mapa que o servidor mandou' % (f['base'], f['sala']), f)
            P.confere('física da sala: bola 150%' in f['texto'], 'a tela da sala mostra a física da sala («bola 150%»)', f['texto'])
            await rt(B, "(() => { net49Send({ type: 'list' }); return 1; })()")
            item = await espera(B, "(() => { const l = (SL.lista || []).find(s => s.code === %s); return l && l.mapa && l.mapa.fisica && sbLinha(l).textContent; })()" % json.dumps(sala), 6000)
            P.confere(item and 'física da sala' in item, 'na lista de salas do GALERA a sala avisa: «física da sala»', item)
            pub = await pede(B, 'abrir', {'codigo': cod1})
            rb_pub = pub['mapa']['fisica'].get('perfil', {}).get('rBola') if pub.get('ok') else 'x'
            P.confere(pub.get('ok') and (rb_pub is None or abs(rb_pub - f['base']) < 1e-9), 'o mapa publicado não muda (a física da sala vale só nesta sala)', rb_pub)
            # o servidor corta o que passa dos limites (a mensagem feita à mão)
            await B.evaluate("() => OFI.interno.mandaSala({ type: 'config', fisicaSala: { preset: 'personalizado', perfil: { rBola: 99, velJog: -5, forcaChute: 'muito' }, extra: { recuo: 7 } } })")
            c = await espera(B, "(() => { const f = OFI.interno.OFS.mapa.info.fisicaSala; return f && f.perfil.rBola === 1.8 && f; })()", 6000)
            P.confere(c and c['perfil']['rBola'] == 1.8 and c['perfil']['velJog'] == 7 and c['extra']['recuo'] == 1 and isinstance(c['perfil']['forcaChute'], (int, float)),
                      'o SERVIDOR corta a física fora dos limites (bola 99 → 1,8; velocidade -5 → 7; recuo 7 → 1; texto → o padrão)', c and (c['perfil'].get('rBola'), c['perfil'].get('velJog'), c['extra'].get('recuo'), c['perfil'].get('forcaChute')))
            # os AJUSTES da sala (o admin): a predefinição Rápido
            await B.evaluate("() => { OFI.interno.SU.ajustes.click(); return true; }")
            ok = await espera(B, "(() => { const j = [...document.querySelectorAll('.ofi-jan-sala')].pop(); return j && /Ajustes da sala/.test(j.querySelector('.ofi-jan-tit').textContent) && !!j.querySelector('.ofi-fis-pre'); })()", 5000)
            await B.evaluate("() => { const j = [...document.querySelectorAll('.ofi-jan-sala')].pop(); [...j.querySelectorAll('.ofi-fis-pre .ofi-seg-bt')].find(b => b.textContent === 'Rápido').click(); return true; }")
            await B.evaluate(BOTAO_PE, '^SALVAR')
            # (o mapa novo e a sala nova chegam em mensagens separadas: espera as duas — o texto da sala vem do estado da sala)
            RAP = "(() => { const S = OFI.interno.OFS, f = S.mapa.info.fisicaSala; return f && f.preset === 'rapido' && %s{ velJog: RachaMapa.fisicaResolvida(S.mapa.mapa.fisica).perfil.velJog, texto: OFI.interno.SU.mapa.textContent, hash: S.mapa.hash }; })()"
            rap = await espera(B, RAP % "/física da sala: Rápido/.test(OFI.interno.SU.mapa.textContent) && ", 6000) or await rt(B, RAP % '')
            P.confere(ok and rap and rap['velJog'] == 17 and 'física da sala: Rápido' in rap['texto'], 'os AJUSTES da sala (o admin): a predefinição RÁPIDO vale na sala (o mapa vai de novo para quem está nela)', rap)

            # ---------------------------------------------------------------- 3) o limite de 3 públicos
            print('\n3) no máximo 3 mapas públicos por criador')
            cod2 = await publica(A, 'x1', 'Arena Dois')
            cod3 = await publica(A, 'futsal', 'Arena Três')
            P.confere(cod2 and cod3, 'a Ana publica mais dois mapas públicos (3 no total)', (cod2, cod3))
            await A.evaluate("() => { if (OFI.interno.OFE.aberto) OFI.interno.editorSai(); OFI.mostra('hub'); setTimeout(() => OFI.interno.mudaAba('meus'), 200); }")
            cota = await espera(A, "(() => { const c = document.querySelector('.ofi-cota'); return c && { txt: c.textContent, cheio: c.classList.contains('cheio') }; })()", 8000)
            P.confere(cota and 'PÚBLICOS 3 DE 3' in cota['txt'] and cota['cheio'], 'MEUS MAPAS: «PÚBLICOS 3 DE 3», cheio', cota)
            # o quarto: a janela de publicar já não oferece o Público
            await A.evaluate("""async () => { const I = OFI.interno, md = I.MODELOS.find(m => m.id === 'x1'), M = I.limpaModelo(md.faz(), 'Quarto Mapa');
              const reg = await I.novoRascunho(M); await I.editorAbre(reg); }""")
            await A.wait_for_timeout(300)
            await A.evaluate("() => { OFI.interno.publicaDialogo(OFI.interno.OFE.reg, OFI.interno.OFE.M); return true; }")
            await espera(A, "!!document.querySelector('.ofi-pub')", 6000)
            d = await A.evaluate("""() => { const j = document.querySelector('.ofi-pub').closest('.ofi-jan'), seg = [...j.querySelectorAll('.ofi-seg[aria-label="Visibilidade"] .ofi-seg-bt')];
              return { vis: seg.map(b => b.textContent), on: (seg.find(b => b.classList.contains('on')) || {}).textContent, nota: j.textContent }; }""")
            P.confere(d['vis'] == ['Não listado', 'Privado'] and d['on'] == 'Não listado' and 'Você já tem 3 mapas públicos' in d['nota'],
                      'com 3 públicos a janela de PUBLICAR só oferece Não listado e Privado (e explica)', (d['vis'], d['on']))
            falta = 16 - (time.time() - A.ult_pub)                # (uma publicação a cada 15 s por pessoa)
            if falta > 0:
                await asyncio.sleep(falta)
            A.ult_pub = time.time()
            await A.evaluate(BOTAO_PE, '^PUBLICAR')
            cod4 = await espera(A, "(() => { const b = document.querySelector('.ofi-codigo.grande b'); return b && b.textContent; })()", 10000)
            await A.evaluate(FECHA_JANELAS)
            r4 = await pede(A, 'abrir', {'codigo': cod4}) if cod4 else {}
            P.confere(cod4 and r4.get('ok') and r4['meta']['visibilidade'] == 'naoListado', 'o quarto sai como NÃO LISTADO (só quem tem o código)', cod4 and r4.get('meta', {}).get('visibilidade'))
            x = await pede(A, 'config', {'codigo': cod4, 'campos': {'visibilidade': 'publico'}})
            P.confere(not x['ok'] and x.get('codigo') == 'publicos' and x.get('publicos') == 3, 'o CONFIGURAR que tenta deixar o quarto público: o servidor recusa (3 de 3)', (x.get('ok'), x.get('erro')))
            y = await pede(A, 'config', {'codigo': cod2, 'campos': {'visibilidade': 'naoListado'}})
            z = await pede(A, 'config', {'codigo': cod4, 'campos': {'visibilidade': 'publico'}})
            P.confere(y['ok'] and y.get('publicos') == 2 and z['ok'] and z.get('publicos') == 3, 'com um deles não listado a vaga abre: o quarto vira público (os não listados não contam)', (y.get('publicos'), z.get('ok'), z.get('publicos')))

            # ---------------------------------------------------------------- 4) a partida: a contagem, as falas, o gol e o craque
            print('\n4) a partida: 3, 2, 1, JÁ!, os balões de fala, o cartão do gol e o craque')
            await A.evaluate("() => { if (OFI.interno.OFE.aberto) OFI.interno.editorSai(); OFI.mostra('hub'); }")
            await A.wait_for_timeout(300)
            await A.evaluate("(s) => OFI.interno.mandaSala({ type: 'join', code: s, spectate: true })", sala)
            ok = await espera(A, "(() => { const S = OFI.interno.OFS; return S.code === %s && OFI.tela === 'sala' && S.mapa && S.mapa.hash; })()" % json.dumps(sala), 8000)
            ha = await A.evaluate("() => { const S = OFI.interno.OFS; return { hash: S.mapa.hash, preset: S.mapa.mapa.fisica.preset }; }")
            P.confere(ok and ha['hash'] == rap['hash'] and ha['preset'] == 'rapido', 'a Ana entra na sala pelo código: o mapa chega com a física da sala (o mesmo hash do Beto)', ha)
            aid = await rt(A, "NET49.id"); bid = await rt(B, "NET49.id")
            await B.evaluate("() => OFI.interno.mandaSala({ type: 'seat', team: 1 })")
            await espera(B, "(() => { const r = OFI.interno.OFS.sala; return r.roster[1] === NET49.id; })()", 5000)
            await A.evaluate("() => OFI.interno.mandaSala({ type: 'seat', team: 0 })")
            ok = await espera(B, "(() => { const r = OFI.interno.OFS.sala; return r.roster[0] === %s && r.roster[1] === NET49.id; })()" % json.dumps(aid), 5000)
            P.confere(ok, 'a Ana no Time A e o Beto no Time B')
            await B.evaluate("() => document.querySelector('.ofi-sala-comecar').click()")
            cont = [await espera(pg, "(() => { const J = OFI.interno.OFJ; return J.on && J.modo === 'rede' && J.contando && J.rede && { tick: J.rede.tick }; })()", 6000) for pg in (A, B)]
            P.confere(all(cont) and all(c['tick'] <= 1 for c in cont), 'COMEÇAR: o 3, 2, 1… nos dois aparelhos (o servidor segura a partida: o relógio da física não anda)', cont)
            # a fala da Ana (a tecla T) no Beto, durante a contagem (a partida já é "jogando")
            await A.keyboard.press('KeyT')
            ok = await espera(A, "(() => { const J = OFI.interno.OFJ; return J.menu && /FALAS RÁPIDAS/.test(J.menu.innerText) && J.menu.querySelectorAll('.ofj-rapidas button').length === 8; })()", 3000)
            await A.evaluate("() => { OFI.interno.OFJ.menu.querySelectorAll('.ofj-rapidas button')[2].click(); return true; }")
            sa = await A.evaluate("() => OFI.interno.OFJ.eu")
            bal = await espera(B, "(() => { const b = OFI.interno.OFJ.baloes.get(%d); return b && b.i; })()" % sa, 4000)
            P.confere(ok and bal == 2, 'FALAS RÁPIDAS (T): a Ana escolhe «Passa!» e o balão aparece em cima da tampinha dela no aparelho do Beto', (ok, bal))
            await asyncio.sleep(1.8)
            sb_ = await B.evaluate("() => OFI.interno.OFJ.eu")
            await B.evaluate("() => OFI.interno.OFJ.fala(3)")
            bal = await espera(A, "(() => { const b = OFI.interno.OFJ.baloes.get(%d); return b && b.i; })()" % sb_, 4000)
            P.confere(bal == 3, 'e a fala do Beto («Boa!») aparece no aparelho da Ana', bal)
            ja = [await espera(pg, "(() => { const J = OFI.interno.OFJ; return !J.contando && J.rede && J.rede.tick > 20 && J.rede.tick; })()", 7000) for pg in (A, B)]
            P.confere(all(ja), 'JÁ!: a partida começa junto nos dois (o relógio da física anda)', ja)
            fis = [await pg.evaluate("() => OFI.interno.OFJ.rede.P.C.VEL_JOG") for pg in (A, B)]
            P.confere(fis[0] == fis[1] and fis[0] > 0, 'a física da sala (Rápido) é a da partida nos dois aparelhos (a mesma velocidade das tampinhas)', fis)
            # o gol da Ana: ela empurra a bola para a zona de impulso, que leva a bola para o gol do Time B
            await A.evaluate("() => { const J = OFI.interno.OFJ; if (J.menu) J.fechaMenu(); }")
            await A.keyboard.down('ArrowRight'); await A.wait_for_timeout(1300); await A.keyboard.up('ArrowRight')
            cartoes = [await espera(pg, "(() => { const C = OFI.interno.OFJ.golCard; return C && C.autor && { nome: C.autor.nome, eu: !!C.autor.eu, time: C.time, contra: C.contra }; })()", 7000) for pg in (A, B)]
            P.confere(cartoes[0] and cartoes[0]['nome'] == 'Ana' and cartoes[0]['eu'] and not cartoes[0]['contra'], 'o GOL: o CARTÃO DE QUEM FEZ aparece para a Ana (é ela, com a tampinha e o nome)', cartoes[0])
            P.confere(cartoes[1] and cartoes[1]['nome'] == 'Ana' and not cartoes[1]['eu'] and cartoes[1]['time'] == 0, 'e no aparelho do Beto o cartão mostra a Ana (o evento do gol chega pela rede com quem fez)', cartoes[1])
            craque = [await espera(pg, "(() => { const J = OFI.interno.OFJ, c = J.menu && J.menu.querySelector('.ofj-craque'); return c && c.innerText; })()", 12000) for pg in (A, B)]
            P.confere(craque[0] and 'VOCÊ É O CRAQUE DA PARTIDA' in craque[0] and 'Ana' in craque[0], 'o fim (meta de 1 gol): o CRAQUE DA PARTIDA na tela da Ana — «VOCÊ É O CRAQUE»', craque[0])
            P.confere(craque[1] and 'CRAQUE DA PARTIDA' in craque[1] and 'Ana' in craque[1] and 'VOCÊ' not in craque[1], 'e no Beto: o craque é a Ana', craque[1])
            res = await A.evaluate("() => { const J = OFI.interno.OFJ; return J.fimRes && { score: J.fimRes.score, winner: J.fimRes.winner, valida: J.fimRes.valida }; }")
            P.confere(res and res['score'] == [1, 0] and res['winner'] == 0 and res['valida'] is not False, 'o resultado que vale: 1 × 0 para o Time A', res)
            for pg in (A, B):
                await pg.evaluate("() => { const J = OFI.interno.OFJ; if (J.menu) { const b = [...J.menu.querySelectorAll('button')].find(b => /VOLTAR PARA A SALA/.test(b.textContent)); if (b) b.click(); } }")
            ok = [await espera(pg, "OFI.tela === 'sala' && !OFI.interno.OFJ.on", 5000) for pg in (A, B)]
            P.confere(all(ok), 'VOLTAR PARA A SALA: os dois de volta na tela da sala', ok)
            for pg in (A, B):
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
