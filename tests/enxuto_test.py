"""v70.2 · ENXUTO: só FUTEBOL e COM CURVA, só a ARENA e o ESTÁDIO (o gramado novo), a bola sem efeitos e o Indicador de
Direção começando desligado.

Confere no jogo de verdade (a cópia de teste do build):
  · as listas e as telas: JOGAR › CASUAL (modos e mapas), CRIAR SALA (CAMPO e MODO), as setas da sala, o treino (C e as setas
    do CAMPO), o perfil (os filtros e os cartões), as missões, o editor de controles, as teclas e a ajuda do toque;
  · o ESTÁDIO tem a mesma física da Arena: as mesmas medidas, paredes, traves, redes e o mesmo fator da bola em 1v1 a 4v4, e o
    mesmo chute dá exatamente o mesmo caminho da bola nos dois mapas; o desenho sai sem erro (normal, prévia e Ultra leve) e é
    grama de verdade (verde no meio; em volta, desde a v74, o calçamento e o estacionamento do society — ver v74_test.py);
  · a bola sem efeitos: o rastro não desenha nada, o chute não deixa respingo, a bola é sempre a clássica e a cor da bola
    saiu de EFEITOS; os textos dos Efeitos na Quadra dizem o que sobrou;
  · a Seta da direção: desligada no aparelho novo; quem já jogava com ele ligado tem ele desligado UMA vez (depois vale
    o que a pessoa escolher);
  · o que estava salvo com modo/mapa que saiu (casual, treino, sala, liga, missões) vira futebol e a Arena, sem erro.
v79: o Estádio passou a ser o mapa padrão (o primeiro da lista: o que saiu e é pedido de novo vira o Estádio) e o JOGAR só
tem a ranqueada, no Estádio (a escolha de modo e de mapa ficou nas SALAS); as missões de mapa viram a do Estádio e as de
modo, a do treino. Onde a v79 mudou o que se espera, o teste diz (v79).
Isto não prova equilíbrio, desempenho em celular nem como o gramado fica em cada tela: é a inspeção do que abre e responde.
Rodar: python3 tests/enxuto_test.py
"""
import json
from comum import abre, rt, roda, Placar, async_playwright

GEO = """(() => {                                   // a geometria que a física usa, em cada tamanho, num mapa
  const out = [];
  for (let n = 1; n <= 4; n++){
    __T.comeca('futebol', n, %d);
    out.push({campo:CAMPO.id, MW, MH, GL, GR, GT, GB, LX0, LX1, LY0, LY1, CX, CY, GOL_PROF, GOL_Y0, GOL_Y1, REDE_E, POST_R,
      fator:CAMPO.fatorBola, rede:!!CAMPO.rede, entra:!!CAMPO.entraGol, extra:CAMPO.quadroExtra || 0, QUADRO_W, QUADRO_H,
      posts:JSON.stringify(POSTS), wall:JSON.stringify(WALL_SEGS), net:JSON.stringify(NET_SEGS), jog:JSON.stringify(JOG_SEGS), obst:JSON.stringify(OBST),
      marcas:JSON.stringify(MARCAS)});
    rqSai();
  }
  return out;
})()"""

CHUTE = """(() => {                                 // o mesmo chute no mesmo lugar: o caminho da bola, passo a passo
  const T = __T; T.comeca('futebol', 2, %d); T.limpa();
  T.poe(P, CX - U(14), CY + U(3)); T.cola(P, 1, -.35); P.chutar = FORCA_POWER;
  const cam = [];
  T.passos(240, i => { if (i > 0) P.chutar = 0; cam.push(Math.round(B.x*1000)/1000, Math.round(B.y*1000)/1000); });
  const r = {campo:CAMPO.id, cam:cam.join(','), placar:RQ.placar.slice()};
  rqSai(); return r;
})()"""

PIXEL = """(() => {                                 // a cor média de um quadradinho da imagem do cenário (em coordenadas do mundo)
  const g = stat.getContext('2d'), sx = stat.width/MW, sy = stat.height/MH;
  const amostra = (x, y) => { const d = g.getImageData(Math.round(x*sx) - 3, Math.round(y*sy) - 3, 6, 6).data; let r = 0, gg = 0, b = 0;
    for (let i = 0; i < d.length; i += 4){ r += d[i]; gg += d[i + 1]; b += d[i + 2]; } const n = d.length/4; return [r/n, gg/n, b/n].map(Math.round); };
  return {meio:amostra(CX + U(6), CY + U(5)), fora:amostra(GL + U(2), CY + U(9)), topo:amostra(CX + U(7), GT - U(2.2)), lado:amostra(GL - U(9), CY), err:window.RUA_GRAMADO_ERRO || window.RUA_CAMPO74_ERRO || null};
})()"""


async def principal():
    P = Placar('v70.2 · enxuto: 2 modos, a Arena e o Estádio, a bola sem efeitos, o indicador desligado')
    async with async_playwright() as pw:
        b, pg, erros = await abre(pw, 1280, 720)

        print('\n· o que aparece')
        r = await rt(pg, """({md:MD_LISTA.map(m => m.id), sala:MD_SALA.map(m => m.id), est:EST_MODOS.slice(), sl:Object.keys(SL_MODO),
          valida:['volei', 'americano', 'basquete', 'ginga', 'curva', 'futebol'].map(mdValida), mapas:v702Mapas(),
          campos:CAMPOS.map(c => c.id + ':' + c.nome), opsMapa:SL_OPS.find(o => o.k === 'map').vals(), opsJogo:SL_OPS.find(o => o.k === 'jogo').vals(),
          guardados:V702_TODOS.md.map(m => m.id)})""")
        print('   ', json.dumps(r, ensure_ascii=False))
        P.confere(r['md'] == ['futebol', 'curva'] and r['sala'] == ['futebol', 'curva'] and r['est'] == ['futebol', 'curva'] and r['sl'] == ['futebol', 'curva'], 'só FUTEBOL e COM CURVA nas listas de modo (casual, sala, perfil)', r)
        P.confere(r['valida'] == ['futebol'] * 4 + ['curva', 'futebol'], 'vôlei, americano, basquete e ginga viram futebol se chegarem de algum lugar', r['valida'])
        P.confere(r['guardados'] == ['futebol', 'curva', 'volei', 'americano', 'basquete', 'ginga'], 'os modos que saíram continuam guardados no código (para voltar um dia)')
        P.confere(r['mapas'] == [4, 0] and r['campos'][4] == 'gramado:Estádio' and r['campos'][0] == 'estadio:Arena', 'os mapas: o Estádio de grama (4, o padrão desde a v79) e a Arena (0)', [r['mapas'], r['campos']])
        P.confere(sorted(r['opsMapa']) == [0, 4] and r['opsJogo'] == ['futebol', 'curva'], 'a sala: as setas do CAMPO e do MODO só passam pelos que aparecem', [r['opsMapa'], r['opsJogo']])

        await rt(pg, "abreJogar('casual'); true"); await pg.wait_for_timeout(900)
        r = await rt(pg, """(() => { const vis = e => !!(e.offsetWidth || e.offsetHeight || e.getClientRects().length);
          return {modos:[...RQP.modos.children].filter(vis).map(b => b.textContent), mapas:[...RQP.mapas.children].filter(vis).map(b => b.textContent),
          cols:getComputedStyle(RQP.mapas).gridTemplateColumns.split(' ').length, aba:JG.aba}; })()""")
        # v88: os dois campos aparecem com os modos de cada um; a ranqueada continua só no Estádio
        P.confere(r['modos'] == [] and sorted(r['mapas']) == ['ARENASALAS · TREINO', 'ESTÁDIORANQUEADA · SALAS · TREINO'] and r['aba'] == 'ranked',
                  'JOGAR (v79: só a ranqueada, mesmo pedindo a casual): sem os chips de modo; (v88) a Arena e o Estádio com os modos de cada um, a ranqueada só no Estádio', r)
        await rt(pg, "RQP.mapas.querySelector('[data-m=\"4\"]').click(); true"); await pg.wait_for_timeout(600)
        r = await rt(pg, """(() => { const c = RQP.mapas.querySelector('[data-m="4"] canvas'), g = c.getContext('2d'), d = g.getImageData(Math.round(c.width*.32), Math.round(c.height*.3), 4, 4).data;
          return {x49:X49.map, desc:RQP.desc.textContent, px:[d[0], d[1], d[2]], on:RQP.mapas.querySelector('[data-m="4"]').classList.contains('on')}; })()""")
        P.confere(r['x49'] == 4 and r['on'] and 'Gramado' in r['desc'], 'tocar no ESTÁDIO escolhe ele (e a descrição fala do gramado)', r)
        P.confere(r['px'][1] > r['px'][0] + 20 and r['px'][1] > r['px'][2] + 20, 'a prévia do ESTÁDIO no JOGAR é verde (o gramado desenhado)', r['px'])
        await rt(pg, "fechaRanqueada(); true")

        print('\n· o Estádio tem a física da Arena')
        a = await rt(pg, GEO % 0); e = await rt(pg, GEO % 4)
        difs = []
        for i in range(4):
            for k in a[i]:
                if k != 'campo' and a[i][k] != e[i][k]: difs.append('%dv%d %s: %s ≠ %s' % (i + 1, i + 1, k, str(a[i][k])[:40], str(e[i][k])[:40]))
        P.confere(a[0]['campo'] == 'estadio' and e[0]['campo'] == 'gramado', 'as partidas abriram na Arena e no Estádio', [a[0]['campo'], e[0]['campo']])
        P.confere(not difs, '1v1 a 4v4: as mesmas medidas, paredes, traves, redes, marcas e o mesmo fator da bola', difs[:4])
        ca = await rt(pg, CHUTE % 0); ce = await rt(pg, CHUTE % 4)
        P.confere(ca['campo'] == 'estadio' and ce['campo'] == 'gramado' and ca['cam'] == ce['cam'] and len(ca['cam']) > 100, 'o mesmo chute dá exatamente o mesmo caminho da bola (240 passos) nos dois mapas', [ca['cam'][:60], ce['cam'][:60]])

        print('\n· o desenho do Estádio')
        for nome, pre in [('normal', ''), ('sem torcedores', 'opc.torc = false;'), ('Ultra leve', "graf = Object.keys(GRAFICOS).find(k => GRAFICOS[k].plano) || graf; aplicaGraficos();")]:
            e0 = len(erros)
            r = await rt(pg, "(() => { %s X49.mode = 'casual'; X49.jogo = 'futebol'; x49Start(2, 4); rqVsComeca(); buildStatic(); return true; })()" % pre)
            await pg.wait_for_timeout(300)
            px = await rt(pg, PIXEL)
            print('    %-15s %s' % (nome, px))
            verde = px['meio'][1] > px['meio'][0] + 30 and px['meio'][1] > px['meio'][2] + 30
            P.confere(not px['err'] and verde and not erros[e0:], 'Estádio (%s): desenha sem erro e o meio é grama' % nome, [px, erros[e0:][:1]])
            if nome == 'normal':
                P.confere(px['lado'][1] < px['lado'][0] + 25 and px['topo'] != px['meio'], 'em volta do gramado: o alambrado, o calçamento e o estacionamento (não é grama · v74)', px)
            await rt(pg, "(() => { rqSai(); opc.torc = true; graf = 'padrao'; aplicaGraficos(); return true; })()")
        r = await rt(pg, "(() => { X49.jogo = 'curva'; x49Start(2, 4); rqVsComeca(); RQ.autoH = false; return {jogo:RQ.jogo, campo:CAMPO.id, curva:controleVisivel('curva')}; })()")   # (o __T.comeca de cima deixou o RQ.autoH ligado)
        P.confere(r == {'jogo': 'curva', 'campo': 'gramado', 'curva': True}, 'COM CURVA no Estádio: abre com o botão CURVA', r)
        await rt(pg, "(() => { rqSai(); abrirLobby(); X49.jogo = 'futebol'; return true; })()")

        print('\n· a bola sem efeitos')
        r = await rt(pg, """(() => {
          const T = __T; T.comeca('futebol', 2, 0); T.limpa(); opc.efx = true;
          T.poe(P, CX - U(10), CY); T.cola(P, 1, 0); P.chutar = FORCA_POWER; T.passos(6, i => { if (i > 0) P.chutar = 0; });
          fxChute(P, true, true); const resp = RESP.length;
          for (let i = 0; i < 8; i++) trilhaPoe(TRILHA, B.x - i*U(.5), B.y, agoraFx() + i*.01);
          let fills = 0; const f0 = ctx.fill, s0 = ctx.stroke; ctx.fill = function(){ fills++; return f0.apply(this, arguments); }; ctx.stroke = function(){ fills++; return s0.apply(this, arguments); };
          trilhaDesenha(ctx, TRILHA); desenhaRespingos(ctx); ctx.fill = f0; ctx.stroke = s0;
          const r = {respAntes:resp, respDepois:RESP.length, desenhos:fills, bola:X49.ball, efeitos:SK_EFEITOS.map(e => e[0]), vel:Math.round(Math.hypot(B.vx, B.vy))};
          rqSai(); return r; })()""")
        print('   ', r)
        P.confere(r['vel'] > 0 and r['desenhos'] == 0 and r['respDepois'] == 0, 'chute de verdade com os Efeitos ligados: o rastro e o respingo não desenham nada', r)
        P.confere(r['bola'] == 'classic' and 'ball' not in r['efeitos'] and r['efeitos'] == ['border', 'celebration', 'uniform'], 'a bola é sempre a clássica; a cor da bola saiu de EFEITOS (borda, comemoração e uniforme ficam)', r)
        r = await rt(pg, """(() => { abreTela('skins'); skCat('efeitos'); const t = [...document.querySelectorAll('#sk-efeitos h3')].map(h => h.firstChild.textContent); fechaTela(); return t; })()""")
        P.confere('BOLA' not in r and len(r) == 3, 'a tela EFEITOS não oferece mais a cor da bola', r)
        r = await rt(pg, "({hp:document.querySelector('#hp-efx small').textContent, aj:(V70_TERMOS['aj-efx'] || [])[1] || ''})")
        P.confere(all('rastro' not in x and 'respingo' not in x for x in r.values()) and 'confete' in r['aj'].lower(), 'os textos dos Efeitos na Quadra não prometem mais rastro nem respingo (EDITAR HUD e Ajustes)', r)

        print('\n· o resto da tela')
        r = await rt(pg, """(() => { abreTela('perfil'); PX.ctx = 'tudo'; PX.modo = 'basquete'; perfil.est['casual|basquete'] = {c:2, v:1, m:5, pt:11};
          pxEstRender(); const chips = [...document.querySelectorAll('#tela-perfil .pf-est-modo button')].map(b => b.textContent);
          const cards = [...document.querySelectorAll('#tela-perfil .pf-est-grade .card small')].map(s => s.textContent);
          const r = {chips, cards, modo:PX.modo}; delete perfil.est['casual|basquete']; fechaTela(); return r; })()""")
        P.confere(r['chips'] == ['TODOS', 'FUTEBOL', 'COM CURVA'] and r['modo'] == 'todos', 'perfil: os filtros TODOS, FUTEBOL e COM CURVA (um filtro salvo de modo que saiu volta para TODOS)', r)
        P.confere('CESTAS' not in r['cards'] and 'PONTOS NO BASQUETE' not in r['cards'] and 'PARTIDAS' in r['cards'], 'perfil: os cartões de cesta e pontos dos modos que saíram não aparecem (os totais seguem)', r['cards'])
        r = await rt(pg, """(() => { CONTA.missoes = {dia:diaId(), bonus:false, l:[{id:'mapa', alvo:1, arg:2, p:0, ok:false}, {id:'modo', alvo:1, arg:'volei', p:0, ok:false}, {id:'marcar', alvo:3, arg:null, p:0, ok:false}]};
          const M = ecoMissoes(); return {args:M.l.map(x => x.arg), txt:M.l.map(miTexto)}; })()""")
        P.confere(r['args'] == [4, None, None] and r['txt'] == ['Conclua 1 partida no mapa Estádio', 'Termine 2 exercícios do treino', 'Marque 3 gols em partidas'], 'missões: o mapa que saiu vira o Estádio e o modo vira o treino (v79: as da ranqueada); "marque gols"', r)
        r = await rt(pg, """(() => { abrirEdicao(); const g = document.getElementById('hed-ginga'); const r = {ginga:g ? getComputedStyle(g).display : 'sem'}; fecharEdicao(false);
          r.teclas = [...document.querySelectorAll('.ajx-tecla')].filter(l => getComputedStyle(l).display !== 'none').map(l => l.querySelector('b').textContent);
          r.ajuda = [...document.querySelectorAll('.ajx-ajuda dt')].filter(d => !d.classList.contains('v702-fora')).map(d => d.textContent); return r; })()""")
        P.confere(r['ginga'] in ('none', 'sem') and not any('FINTA' in t or 'DRIBLE' in t for t in r['teclas']) and 'FINTA e DRIBLE' not in r['ajuda'] and 'CURVA' in r['ajuda'],
                  'editor de controles, teclas e ajuda do toque: sem GINGA, FINTA e DRIBLE (a CURVA fica)', r)
        await rt(pg, "(() => { if (RQ.on) rqSai(); abrirLobby(); abreTela('amigos'); SX.criando = true; SX.form.onde = 'aqui'; amigosRender(); return true; })()")
        await pg.wait_for_timeout(400)                       # (o lobby ignora toques nos primeiros 300 ms depois de abrir)
        r = await rt(pg, """(() => {
          const sel = nome => [...document.querySelectorAll('#am-corpo .sx-criarform .sx-campo-sel')].find(w => w.querySelector('.sx-rot').textContent === nome);
          const vals = nome => { const out = []; for (let i = 0; i < 3; i++){ const w = sel(nome); out.push(w.querySelector('.sx-val').textContent); w.querySelector('.sx-seta.dir').click(); } return out; };
          const r = {campo:vals('CAMPO'), modo:vals('MODO')}; SX.criando = false; fechaTela(); return r; })()""")
        print('   ', r)
        P.confere(r['campo'][0] != r['campo'][1] and r['campo'][0] == r['campo'][2] and {r['campo'][0], r['campo'][1]} == {'Arena', 'Estádio'}, 'CRIAR SALA: o CAMPO vai e volta entre Arena e Estádio', r['campo'])
        P.confere({r['modo'][0], r['modo'][1]} == {'Futebol', 'Com curva'} and r['modo'][0] == r['modo'][2], 'CRIAR SALA: o MODO vai e volta entre Futebol e Com curva', r['modo'])
        r = await rt(pg, """(() => { abrirLobby(); if (RQ.on) rqSai(); trocaCampo(1); const a = CAMPO.id; trocaCampo(1); const b = CAMPO.id; trocaCampo(-1); const c = CAMPO.id; novoCampo(modo, 2); const d = CAMPO.id;
          return [a, b, c, d, localStorage.getItem(CHAVE_CAMPO)]; })()""")
        P.confere(r == ['estadio', 'gramado', 'estadio', 'gramado', 'gramado'], 'treino: as setas do CAMPO passam só pela Arena e pelo Estádio (um mapa que saiu vira o Estádio · v79: o treino começa no Estádio)', r)
        r = await rt(pg, "(() => { X49.mode = 'casual'; X49.jogo = 'ginga'; x49Start(2, 3); rqVsComeca(); const r = {jogo:RQ.jogo, mapa:RQ.mapa, campo:CAMPO.id}; rqSai(); abrirLobby(); return r; })()")
        P.confere(r == {'jogo': 'futebol', 'mapa': 4, 'campo': 'gramado'}, 'uma partida pedida com modo e mapa que saíram abre no futebol, no Estádio (v79)', r)
        await rt(pg, "(() => { fechaPop(); filaPop.length = 0; window.__seguiu = 0; filaPop.push(() => { window.__seguiu++; }); popModosNovos(); return true; })()")
        await pg.wait_for_timeout(200)
        r = await rt(pg, "({seguiu:window.__seguiu, aberta:!LB.pop.hidden, txt:LB.popCaixa.textContent})")
        P.confere(r['seguiu'] == 1 and not r['aberta'] and 'MODOS DE JOGO' not in r['txt'], 'a novidade antiga dos seis modos não aparece mais (a fila das janelas segue)', r)
        r = await rt(pg, "({dir:opc.dir, chave:localStorage.getItem(V702.chaveDir), hp:document.getElementById('hp-dir').getAttribute('aria-pressed')})")
        P.confere(r['dir'] is False and r['chave'] == '1' and r['hp'] == 'false', 'aparelho novo: a Seta da direção começa desligada', r)
        novos = [e for e in erros if 'Failed to load' not in e]
        P.confere(not novos, 'nenhum erro de JavaScript (aparelho novo)', novos[:3])
        await b.close()

        print('\n· quem já jogava (o salvo de antes da v70.2)')
        salvo = {
            'streetball-v49': json.dumps({'jogo': 'volei', 'map': 2, 'n': 3, 'mode': 'casual', 'ball': 'gold'}),
            'racha-treino-campo-v1': 'viaduto',
            'racha-sala-pref': json.dumps({'n': 2, 'map': 3, 'jogo': 'basquete', 'tempo': 0, 'bots': False}),
            'streetball-conta-v1': json.dumps({'moedas': 900, 'rq': {'pts': 40, 'jogos': 3, 'vit': 2, 'n': 2, 'mapaId': 'favela'}}),
            'racha-treino-hud-v11': json.dumps({'opc': {'lag': True, 'torc': True, 'efx': True, 'dir': True, 'verFps': False, 'replay': True}}),
        }
        b, pg, erros = await abre(pw, 1280, 720, armazenamento=salvo)
        r = await rt(pg, """({jogo:X49.jogo, map:X49.map, n:X49.n, ball:X49.ball, campo:CAMPO.id, sala:[SL.pref.map, SL.pref.jogo], form:[SX.form.map, SX.form.jogo],
          rq:[CONTA.rq.mapa, CONTA.rq.mapaId], moedas:CONTA.moedas, dir:opc.dir, chave:localStorage.getItem(V702.chaveDir), salvo:JSON.parse(localStorage.getItem('racha-treino-hud-v11')).opc.dir})""")
        print('   ', r)
        P.confere(r['jogo'] == 'futebol' and r['map'] == 4 and r['n'] == 2, 'casual salvo no vôlei, no Escadão: volta no futebol (v79: a casual saiu; vale a ranqueada, no Estádio, com o tamanho da ranqueada salvo)', r)
        P.confere(r['campo'] == 'estadio' and r['sala'] == [0, 'futebol'] and r['form'] == [0, 'futebol'] and r['rq'] == [4, 'gramado'] and r['moedas'] == 900, 'treino no Viaduto e sala no Viaduto/basquete viram Arena e futebol; a liga na Favela vira a ranqueada no Estádio (v79); o resto do salvo fica', r)
        P.confere(r['ball'] == 'classic', 'a bola Ouro salva vira a clássica', r['ball'])
        P.confere(r['dir'] is False and r['salvo'] is False and r['chave'] == '1', 'quem jogava com o Indicador ligado: desligado uma vez (e salvo assim)', r)
        await rt(pg, "(() => { opc.dir = true; salvar(); return true; })()")
        await pg.reload(); await pg.wait_for_function('() => typeof window.__RT === "function"', polling=100, timeout=20000); await pg.wait_for_timeout(600)
        r = await rt(pg, "({dir:opc.dir, chave:localStorage.getItem(V702.chaveDir)})")
        P.confere(r['dir'] is True, 'depois disso vale o que a pessoa escolher: ligou de novo, continua ligado ao reabrir', r)
        novos = [e for e in erros if 'Failed to load' not in e]
        P.confere(not novos, 'nenhum erro de JavaScript (salvo antigo)', novos[:3])
        await b.close()
    return P.fim()


if __name__ == '__main__':
    roda(principal())
