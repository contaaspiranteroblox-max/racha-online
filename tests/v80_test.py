"""v80 · A PARTIDA: TIME A (LARANJA) × TIME B (ROXO), A TAMPINHA LISTRAS, O PLACAR COM 3:00, A PRORROGAÇÃO, O EMPATE, OS
ADVERSÁRIOS SEM OS INDICADORES A MAIS, A ANIMAÇÃO GOOOL! E OS CONTROLES NOVOS DO TREINO.

· OS TIMES: Time A #FF6A00 (o 0, à esquerda) e Time B #7A3FC4 (o 1) no halo, no placar, na sala e na tela do fim; os nomes
  novos nas telas e nas mensagens (nada de preto × branco).
· A TAMPINHA: a padrão é o modelo Listras, metade laranja (esquerda) e metade roxa (direita), divisão vertical no meio, sem
  branco, com a borda de sempre; no Time A toda laranja, no Time B toda roxa; sem time (lobby, treino, assistindo) metade/
  metade; as outras tampinhas não mudam; quem estava com a padrão da v71 passa para a nova (uma vez).
· O PLACAR: o Time A à esquerda (laranja), o Time B à direita (roxo), os gols e o relógio no meio (pixels conferidos); cabe no
  mesmo espaço do de antes.
· AS REGRAS (contra os bots): 03:00 desde a saída; o relógio corre na saída e na festa do gol; 2 × 1 no fim vence; 1 × 1 empata
  (sem prorrogação); 0 × 0 vai para a prorrogação (vermelho, -00:01 … -02:00), o gol de ouro vence na hora e 0 × 0 até -02:00
  empata; 3 gols acabam na hora; a bola que entra depois do tempo não vale; depois do fim nada muda; o empate dá 0 ponto,
  zera a sequência e aparece como EMPATE. Os outros modos (guardados) e as salas personalizadas ficam com as regras deles.
· OS ADVERSÁRIOS: sem a ponta do halo e sem a gota fora da tela; os companheiros, o nome, a cor e a sua setinha continuam.
· O GOL: GOOOL! na cor de quem marcou, com o nome do autor e o passe; papel picado só na animação (a chuva de confete da tela
  inteira no gol saiu); com Reduzir animações, sem papel picado; no treino o recado do exercício vai na placa.
· O TREINO: os três seletores sem as setas verdes (pixels), maiores, com os ícones e as bolinhas; trocam como antes (toques de
  verdade no canvas); o editor da tampinha com as 5 abas de sempre.
· ONLINE DE VERDADE (o servidor da turma, com a partida normal encurtada para 14 s + 8 s): os dois jogadores veem o mesmo
  relógio (o do servidor); 0 × 0 vai para a prorrogação nos dois; o gol de ouro de quem roda a partida vale (o servidor confere);
  1 × 1 no fim é empate conferido (EMPATE e ±0 nos dois); na sala personalizada, trocar de time muda a tampinha na tela do
  outro jogador na hora.
Isto testa no Chromium de teste (e com um servidor local); não prova o desempenho num celular de verdade nem a rede móvel.

Rodar: python3 tests/v80_test.py
"""
import asyncio, colorsys, json, math, subprocess, sys, time
from comum import abre, rt, roda, Placar, async_playwright, RAIZ
from online_test import porta_livre, sessao, espera

LARANJA, ROXO = (255, 106, 0), (122, 63, 196)


def perto(c, alvo, tol=60):
    return c is not None and all(abs(a - b) <= tol for a, b in zip(c[:3], alvo))


def matiz(c):
    """'laranja', 'roxo' ou 'outro' pela cor (o matiz), com o brilho e a sombra da tampinha em cima."""
    h, s, v = colorsys.rgb_to_hsv(*(x/255 for x in c[:3]))
    h *= 360
    if s < .3 or v < .3: return 'outro'
    return 'laranja' if 12 <= h <= 40 else 'roxo' if 250 <= h <= 285 else 'outro'


async def times_tampinha(pw, P):
    print('\n1) os times laranja × roxo e a tampinha Listras')
    b, pg, erros = await abre(pw, 1280, 720)
    c = await rt(pg, "({c:[0, 1].map(t => [rqCor(t).base, rqCor(t).nome]), sk:[skinDoTime(0).cor, skinDoTime(1).cor], sala:SALA_COR.map(s => s.nome + ' ' + s.cor)})")
    P.confere(c['c'] == [['#ff6a00', 'Time A'], ['#7a3fc4', 'Time B']] and c['sk'] == ['#ff6a00', '#7a3fc4'] and c['sala'] == ['Time A #ff6a00', 'Time B #7a3fc4'],
              'as cores oficiais: Time A #FF6A00 e Time B #7A3FC4 (halo, placar, sala)', c)
    d = await rt(pg, """(() => { const L = c => { const D = tpLe(c); return {p:D.p, pc:D.pc.slice(0, 2), pp:D.pp, b:D.b, bc:D.bc[0], i:D.i}; };
      return {padrao:L(TP_PADRAO_COD), a:L(TP_TIME_COD[0]), b:L(TP_TIME_COD[1]), velha:L(RachaTimes80.antiga()), lista:TP_PADROES.find(x => x.id === 'ls').nome, gratis:TP_PADROES.find(x => x.id === 'ls').pr}; })()""")
    pd = d['padrao']
    P.confere(pd['p'] == 'ls' and d['lista'] == 'Listras' and d['gratis'] == 'gratis' and pd['pc'][0] == '#ff6a00' and pd['pc'][1] in ('#7a3ec5', '#7a3fc4') and pd['pp'] == [76, 50, 84, 0],
              'a padrão é o modelo Listras (grátis): fundo laranja e a listra roxa, uma só, do meio para a direita', d['padrao'])
    P.confere(pd['b'] == d['velha']['b'] and pd['bc'] == d['velha']['bc'] and pd['i'] == '--', 'a borda e os detalhes são os de sempre (a mesma saia da padrão de antes, sem ícone)', [pd, d['velha']])
    P.confere(d['a']['pc'] == ['#ff6a00', '#ff6a00'] and d['b']['pc'][0] == d['b']['pc'][1] and d['b']['pc'][0] in ('#7a3ec5', '#7a3fc4') and d['a']['b'] == pd['b'],
              'no time ela fica de uma cor só: toda laranja (A) e toda roxa (B), com a mesma borda', [d['a'], d['b']])
    # o desenho: metade/metade na vertical, no meio, sem branco; toda laranja; toda roxa
    px = await rt(pg, """(() => { const r = 60, f = cod => { const c = document.createElement('canvas'); c.width = c.height = 160; const g = c.getContext('2d');
        drawBotao(g, 80, 80, r, tpSkin(cod), null, false, EST0);
        const p = (x, y) => Array.from(g.getImageData(80 + x*r, 80 + y*r, 1, 1).data);
        let branco = 0, n = 0; for (let y = -26; y <= 26; y += 2) for (let x = -26; x <= 26; x += 2){ if (x*x + y*y > 26*26) continue; const q = g.getImageData(80 + x, 80 + y, 1, 1).data; n++; if (q[0] > 225 && q[1] > 225 && q[2] > 225) branco++; }
        return {ec:p(-.4, -.4), eb:p(-.4, .4), dc:p(.4, -.4), db:p(.4, .4), me:p(-.06, 0), md:p(.06, 0), branco:branco/n}; };
      return {padrao:f(TP_PADRAO_COD), a:f(TP_TIME_COD[0]), b:f(TP_TIME_COD[1]), velha:f(RachaTimes80.antiga())}; })()""")
    pp = px['padrao']
    P.confere([matiz(pp[k]) for k in ('ec', 'eb', 'dc', 'db')] == ['laranja', 'laranja', 'roxo', 'roxo'],
              'desenhada: a metade da esquerda laranja e a da direita roxa, em cima e embaixo (a divisão é vertical)', pp)
    P.confere(matiz(pp['me']) == 'laranja' and matiz(pp['md']) == 'roxo' and pp['branco'] < .03, 'a divisão fica no meio (logo à esquerda do centro é laranja, logo à direita é roxo) e não tem branco', pp)
    P.confere(all(matiz(px['a'][k]) == 'laranja' for k in ('ec', 'eb', 'dc', 'db', 'me', 'md')) and all(matiz(px['b'][k]) == 'roxo' for k in ('ec', 'eb', 'dc', 'db', 'me', 'md')),
              'no Time A ela fica toda laranja; no Time B, toda roxa', [px['a'], px['b']])
    P.confere(px['velha'] == pp, 'a padrão da v71 (de um jogo antigo de outra pessoa) aparece como a nova', [px['velha']['ec'], pp['ec']])
    t = await rt(pg, """(() => { const outra = tpCodigo(Object.assign(tpLe(TP_PADRAO_COD), {pc:['#22aa44', '#ffffff', '#000000'], p:'me'}));
      return {a:tpNoTime(TP_PADRAO_COD, 0) === TP_TIME_COD[0], b:tpNoTime(TP_PADRAO_COD, 1) === TP_TIME_COD[1], sem:tpNoTime(TP_PADRAO_COD, -1) === TP_PADRAO_COD && tpNoTime(TP_PADRAO_COD, undefined) === TP_PADRAO_COD,
        outra:[0, 1, -1].every(k => tpNoTime(outra, k) === outra), velhaA:tpNoTime(RachaTimes80.antiga(), 0) === TP_TIME_COD[0],
        minha:tpMinha() === TP_PADRAO_COD, perfil:perfil.skin === TP_PADRAO_COD, treino:tpNoTimeSk(skinAtual(), -1).id === TP_PADRAO_COD}; })()""")
    P.confere(t['a'] and t['b'] and t['sem'] and t['velhaA'], 'a troca: no Time A a do A, no Time B a do B, sem time a metade/metade (a da v71 também segue o time)', t)
    P.confere(t['outra'], 'uma tampinha personalizada (ou comprada, ou modelo pronto) não muda com o time', t)
    P.confere(t['minha'] and t['perfil'], 'quem não escolheu nenhuma joga com a padrão nova (lobby, perfil e o que vai para a sala)', t)
    P.confere(t['treino'], 'no treino você não está num time: a tampinha fica metade/metade', t)
    # na partida: você e os bots com a do time; o seu modelo pronto continua o seu
    m = await rt(pg, """(() => { __T.comeca('futebol', 2, 4); const r = {eu:tpNoTimeSk(skinAtual(), P.time).id === TP_TIME_COD[P.time], bots:RQ.jog.filter(q => q !== P).map(q => skinDoBot(q).id === TP_TIME_COD[q.time ? 1 : 0])};
      const zebra = tpCodigo(Object.assign(tpLe(TP_PADRAO_COD), {p:'ze', pc:['#f3efe4', '#171a1c', '#000000']})); const eq = TP.equipada; TP.equipada = zebra; perfil.skin = tpMinha();
      r.zebra = tpNoTimeSk(skinAtual(), P.time).id === zebra; TP.equipada = eq; perfil.skin = tpMinha(); rqSai(); return r; })()""")
    P.confere(m['eu'] and all(m['bots']) and m['zebra'], 'na partida: a sua e a dos bots na cor do time; com outra tampinha equipada, ela continua a sua', m)
    # os nomes: nada de preto × branco nas telas
    nomes = await rt(pg, """(() => { const h = document.documentElement.innerHTML; return {fitas:Array.from(document.querySelectorAll('#lb .sl-fita')).map(e => e.textContent),
      velhos:['Time Preto', 'Time Branco', 'TIME PRETO', 'TIME BRANCO'].filter(s => h.indexOf(s) >= 0), onb:(document.getElementById('onb') || {}).innerHTML ? 1 : 0, motivo:slMotivo({roster:[null, null], bots:true})}; })()""")
    P.confere(nomes['fitas'][:2] == ['Time A', 'Time B'] and not nomes['velhos'] and 'Time A ou no Time B' in nomes['motivo'], 'os nomes novos nas telas e nas mensagens (nenhum "Time Preto/Branco" na página)', nomes)
    errs = [e for e in erros if 'Failed to load resource' not in e]
    P.confere(not errs, 'nenhum erro de JavaScript (times)', errs[:3])
    await b.close()
    # a troca da padrão da v71 (quem estava com ela equipada)
    b0, pg0, _ = await abre(pw, 1280, 720)
    velha = await rt(pg0, "RachaTimes80.antiga()")
    await b0.close()
    b, pg, erros = await abre(pw, 1280, 720, armazenamento={'racha-tampa-v1': json.dumps({'itens': [], 'salvas': [], 'equipada': velha})})
    mg = await rt(pg, "({eq:TP.equipada, skin:perfil.skin === TP_PADRAO_COD, flag:localStorage.getItem('racha-v80-padrao'), salvo:JSON.parse(localStorage.getItem('racha-tampa-v1')).equipada})")
    P.confere(mg['eq'] == '' and mg['skin'] and mg['flag'] == '1' and mg['salvo'] == '', 'quem estava com a padrão da v71 equipada passa para a nova (uma vez, e fica salvo)', mg)
    await b.close()


async def placar_regras(pw, P):
    print('\n2) o placar, o relógio de 3:00, a prorrogação, o empate e o limite de 3 gols (contra os bots)')
    b, pg, erros = await abre(pw, 1280, 720)
    ini = await rt(pg, "(() => { const r = __T.comeca('futebol', 2, 4); return {v80:RachaPartida80.regra(), meta:RQ.meta, lim:RQ.tempoLim, txt:r.metaTxt, tela:RachaPartida80.tela(), w:RachaPartida80.placarW(), zona:hudZonas()[1]}; })()")
    P.confere(ini['v80'] == {'seg': 180, 'ot': 120} and ini['meta'] == 3 and ini['lim'] == 0 and ini['tela']['s'] == '03:00', 'a partida normal contra os bots: 03:00 no relógio, até 3 gols', ini)
    P.confere(ini['txt'].startswith('3 MINUTOS') and ini['txt'].endswith('PRIMEIRO A 3 GOLS'), 'a apresentação diz 3 MINUTOS · PRIMEIRO A 3 GOLS', ini['txt'])
    P.confere(ini['w'] <= 410 and ini['zona']['x1'] - ini['zona']['x0'] >= ini['w'], 'o placar cabe no espaço de antes (o HUD não precisa mudar de lugar)', [ini['w'], ini['zona']])
    # o relógio corre na saída e na festa do gol; desce de segundo em segundo
    rel = await rt(pg, """(() => { const r = {}; RQ.estado = 'saida'; RQ.saidaT0 = RQ.tick; RQ.t = 0; __T.passos(60); r.saida = Math.round(RQ.t*100)/100; r.tela1 = RachaPartida80.tela().s;
      RQ.estado = 'jogo'; __T.passos(61); r.jogo = Math.round(RQ.t*100)/100; r.tela2 = RachaPartida80.tela().s; return r; })()""")
    P.confere(abs(rel['saida'] - 1) < .05 and abs(rel['jogo'] - 121/60) < .05 and rel['tela1'] == '02:59' and rel['tela2'] == '02:58', 'o relógio corre na saída de bola e no jogo, segundo a segundo (02:59 com 1 s, 02:58 com 2 s)', rel)
    # pixels do placar: o laranja à esquerda, o roxo à direita, o relógio no meio
    pix = await rt(pg, """(() => { RQ.estado = 'jogo'; RQ.t = 41; render(0); const k = K, g = ctx, hk = HUDX.k, y = (10 + 27)*k*hk, p = x => Array.from(g.getImageData(Math.round((W/2 + (x - W/2)*hk)*k), Math.round(y), 1, 1).data);
      return {a:p(W/2 - 190), b:p(W/2 + 190), meio:p(W/2 - 52), tela:RachaPartida80.tela()}; })()""")
    P.confere(perto(pix['a'], LARANJA, 70) and perto(pix['b'], ROXO, 70) and sum(pix['meio'][:3]) < 200 and pix['tela']['s'] == '02:19',
              'o placar desenhado: o Time A em laranja à esquerda, o Time B em roxo à direita, o relógio no meio (02:19)', pix)
    t10 = await rt(pg, "(() => { RQ.t = 171.4; return RachaPartida80.tela(); })()")
    P.confere(t10['s'] == '00:09' and t10['cor'] == '#ffd23f', 'os 10 últimos segundos em amarelo', t10)
    # 2 × 1 no fim: vence; 1 × 1: empate (sem prorrogação)
    fim = await rt(pg, """(() => { const r = {}; const vai = (pl) => { __T.comeca('futebol', 2, 4); RQ.placar = pl.slice(); RQ.estado = 'jogo'; RQ.t = 179.97; __T.passos(3); return {est:RQ.estado, R:RQ.resultado && {venceu:RQ.resultado.venceu, empate:RQ.resultado.empate}, prorrog:RQ.prorrog}; };
      r.v21 = vai([2, 1]); r.e11 = vai([1, 1]); r.e22 = vai([2, 2]); r.d01 = vai([0, 1]); return r; })()""")
    P.confere(fim['v21']['est'] == 'fim' and fim['v21']['R'] == {'venceu': True, 'empate': False}, '00:00 com 2 × 1: acaba e vence quem tem mais gols', fim['v21'])
    P.confere(fim['d01']['est'] == 'fim' and fim['d01']['R'] == {'venceu': False, 'empate': False}, '00:00 com 0 × 1: acaba (derrota)', fim['d01'])
    P.confere(all(fim[k]['est'] == 'fim' and fim[k]['R'] == {'venceu': False, 'empate': True} and not fim[k]['prorrog'] for k in ('e11', 'e22')), '1 × 1 e 2 × 2 no fim: EMPATE, sem prorrogação', [fim['e11'], fim['e22']])
    # o empate: 0 ponto, a sequência zera, a tela do fim diz EMPATE (sem a cara de derrota), o histórico guarda E
    emp = await rt(pg, """(() => { fechaFim(); const C = CONTA.rq, salvo = JSON.stringify(C); C.pts = 1000; C.seq = 2; X49.matchMode = 'ranked';
      __T.comeca('futebol', 2, 4); X49.matchMode = 'ranked'; RQ.placar = [1, 1]; RQ.estado = 'jogo'; RQ.t = 179.97; __T.passos(3); rqFechaConta(false); rqMostraFim();
      const r = {pts:C.pts, seq:C.seq, delta:RQ.resultado.pr && RQ.resultado.pr.delta, tit:fimEl('fim-titulo').textContent, cls:fimEl('fim').className, d:fimEl('fim-rq-d').textContent, h:X49.history[X49.history.length - 1]};
      Object.assign(C, JSON.parse(salvo)); contaSalvar(); fechaFim(); return r; })()""")
    P.confere(emp['pts'] == 1000 and emp['seq'] == 0 and emp['delta'] == 0 and emp['d'] == '±0 PONTOS', 'o empate na ranqueada: ±0 pontos e a sequência de vitórias zera', emp)
    P.confere(emp['tit'] == 'EMPATE' and 'empate' in emp['cls'] and 'perdeu' not in emp['cls'] and emp['h'] and emp['h'].get('emp') and not emp['h'].get('win'),
              'a tela do fim diz EMPATE (sem a cara de derrota) e o histórico guarda o empate', emp)
    # 0 × 0: a prorrogação (vermelho, negativo), o gol de ouro vence na hora; 0 × 0 até -02:00 empata
    ot = await rt(pg, """(() => { const r = {}; __T.comeca('futebol', 2, 4); RQ.placar = [0, 0]; RQ.estado = 'jogo'; RQ.t = 179.97; __T.passos(3);
      r.a = {est:RQ.estado, prorrog:RQ.prorrog, aviso:__T.aviso(), tela:RachaPartida80.tela()};
      RQ.t = 200.2; r.b = RachaPartida80.tela(); RQ.t = 299.6; r.c = RachaPartida80.tela();
      RQ.t = 299.98; __T.passos(3); r.d = {est:RQ.estado, empate:RQ.resultado && RQ.resultado.empate};
      __T.comeca('futebol', 2, 4); RQ.placar = [0, 0]; RQ.estado = 'jogo'; RQ.t = 185; __T.passos(2);
      RQ.toques.length = 0; RQ.toques.push({p:P, t0:RQ.tick - 3, tick:RQ.tick - 1, chute:RQ.tick - 1}); rqGol(1);
      r.e = {placar:RQ.placar.slice(), pend:RQ.fimPendente, est:RQ.estado}; for (let i = 0; i < RQ_GOL_TICKS + 2 && RQ.estado !== 'fim'; i++){ guardaAnterior(); physicsStep(STEP, 0, 0); }
      r.f = {est:RQ.estado, venceu:RQ.resultado && RQ.resultado.venceu, ouro:RQ.resultado && RQ.resultado.ouro, tela:RachaPartida80.tela().s}; return r; })()""")
    P.confere(ot['a']['est'] == 'jogo' and ot['a']['prorrog'] and ot['a']['aviso'] == 'PRORROGAÇÃO · GOL DE OURO' and ot['a']['tela']['ot'] and ot['a']['tela']['cor'] == '#ff5a4f',
              '00:00 com 0 × 0: PRORROGAÇÃO (o relógio fica vermelho e o aviso diz GOL DE OURO)', ot['a'])
    P.confere(ot['b']['s'] == '-00:21' and ot['c']['s'] == '-02:00' and ot['b']['ot'], 'na prorrogação o relógio continua negativo: -00:21 … -02:00', [ot['b'], ot['c']])
    P.confere(ot['d']['est'] == 'fim' and ot['d']['empate'], '0 × 0 até -02:00: empate', ot['d'])
    P.confere(ot['e']['placar'] == [1, 0] and ot['e']['pend'] and ot['f']['est'] == 'fim' and ot['f']['venceu'] and ot['f']['ouro'], 'o gol na prorrogação é GOL DE OURO: vence na hora (depois da festa do gol)', [ot['e'], ot['f']])
    # 3 gols acabam na hora; a bola que entra depois do tempo não vale; depois do fim nada muda; o tempo acaba na festa do gol
    lim = await rt(pg, """(() => { const r = {}, anda = n => { for (let i = 0; i < n && RQ.estado !== 'fim'; i++){ guardaAnterior(); physicsStep(STEP, 0, 0); } }, gol = (lado) => { RQ.estado = 'jogo'; RQ.toques.length = 0; RQ.toques.push({p:P, t0:RQ.tick - 3, tick:RQ.tick - 1, chute:RQ.tick - 1}); rqGol(lado); };
      __T.comeca('futebol', 2, 4); RQ.placar = [2, 0]; RQ.t = 60; gol(1); r.tres = {placar:RQ.placar.slice(), pend:RQ.fimPendente}; anda(RQ_GOL_TICKS + 2); r.tresFim = RQ.estado;
      __T.comeca('futebol', 2, 4); RQ.placar = [1, 1]; RQ.t = 180.01; gol(1); r.tarde = {placar:RQ.placar.slice(), est:RQ.estado, empate:RQ.resultado && RQ.resultado.empate};
      gol(-1); r.depois = RQ.placar.slice();
      __T.comeca('futebol', 2, 4); RQ.placar = [1, 0]; RQ.t = 179.4; gol(1); r.festa0 = RQ.estado; anda(RQ_GOL_TICKS + 2);
      r.festa = {est:RQ.estado, placar:RQ.placar.slice(), venceu:RQ.resultado && RQ.resultado.venceu, saida:false}; return r; })()""")
    P.confere(lim['tres']['placar'] == [3, 0] and lim['tres']['pend'] and lim['tresFim'] == 'fim', 'o limite de 3 gols continua: o 3º gol acaba a partida na hora', lim)
    P.confere(lim['tarde']['placar'] == [1, 1] and lim['tarde']['est'] == 'fim' and lim['tarde']['empate'], 'a bola que entra depois de 00:00 (1 × 1) não vale: a partida acaba empatada', lim['tarde'])
    P.confere(lim['depois'] == [1, 1], 'depois do fim nada muda o resultado', lim['depois'])
    P.confere(lim['festa0'] == 'gol' and lim['festa']['est'] == 'fim' and lim['festa']['placar'] == [2, 0] and lim['festa']['venceu'], 'o tempo que acaba na festa do gol (2 × 0 aos 2:59): acaba depois da festa, sem nova saída', lim['festa'])
    # os modos guardados e as salas personalizadas ficam como eram
    out = await rt(pg, """(() => { const r = {}; __T.guardados(); __T.comeca('volei', 2, 0); r.volei = RachaPartida80.regra(); __T.enxuto();
      __T.comeca('curva', 2, 4); r.curva = RachaPartida80.regra(); rqSai(); return r; })()""")
    P.confere(out['volei'] is None and out['curva'] == {'seg': 180, 'ot': 120}, 'COM CURVA também é a partida normal; os modos guardados (vôlei) ficam sem o relógio novo', out)
    errs = [e for e in erros if 'Failed to load resource' not in e]
    P.confere(not errs, 'nenhum erro de JavaScript (regras)', errs[:3])
    await b.close()


async def sala_local(pw, P):
    print('\n3) a sala personalizada (neste aparelho): as regras dela, o placar novo e as cores na sala')
    b, pg, erros = await abre(pw, 1280, 720)
    await rt(pg, "(() => { Object.assign(SX.form, {onde:'aqui', pub:true, n:1, map:4, jogo:'futebol', tempo:3, bots:true, nome:'Racha da Laje'}); sxCriar(); return 1; })()")
    await pg.wait_for_timeout(700)
    s = await rt(pg, """(() => { const cx = id => getComputedStyle(document.querySelector('#lb ' + id + ' .sl-caixa')).backgroundImage;
      const op = Array.from(document.querySelectorAll('#sl-ops .sl-op')).map(o => o.textContent.replace(/\\s+/g, ' ').trim());
      return {a:cx('.sl-verm'), b:cx('.sl-azul'), op:op.filter(t => /TEMPO/.test(t)), tampa:(() => { const r = NET49.room, m = r.members[0]; return m.skin === TP_PADRAO_COD && m.slot < 0; })()}; })()""")
    P.confere('255, 138, 51' in s['a'] and '149, 96, 218' in s['b'], 'a sala: a coluna do Time A laranja e a do Time B roxa', [s['a'][-90:], s['b'][-90:]])
    P.confere(any('3 min' in t for t in s['op']) and s['tampa'], 'o TEMPO da sala cabe no quadro (3 min) e quem assiste fica com a metade/metade', s)
    # entra no Time A e começa: o placar novo com a contagem da sala (3:00), o GOL DE OURO dela no empate (sem limite)
    await rt(pg, "(() => { slocEnvia ? 0 : 0; net49Send({type:'seat', team:0}); return 1; })()")
    await pg.wait_for_timeout(300)
    await rt(pg, "slIniciar()")
    await pg.wait_for_timeout(900)
    r = await rt(pg, """(() => { const r = {jogando:NET49.playing, local:!!(NET49.room && NET49.room.local), v80:RachaPartida80.regra(), lim:RQ.tempoLim, meta:RQ.meta, tela:RachaPartida80.tela()};
      ARB_PARADO = () => true; RQ.estado = 'jogo'; RQ.placar = [1, 1]; RQ.t = 181; RQ.prorrog = true; r.ouro = RachaPartida80.tela(); RQ.t = 600; r.longo = RachaPartida80.tela().s; return r; })()""")
    P.confere(r['jogando'] and r['local'] and r['v80'] is None and r['lim'] == 180 and r['meta'] == 999 and r['tela']['s'] == '03:00', 'a sala com 3 minutos fica com as regras dela (sem a regra nova: sem limite de 3 gols)', r)
    P.confere(r['ouro']['ot'] and r['ouro']['s'] == '-00:01' and r['longo'] == '-07:00', 'o empate da sala vai para o GOL DE OURO dela (sem limite), no relógio vermelho do placar novo', r)
    errs = [e for e in erros if 'Failed to load resource' not in e]
    P.confere(not errs, 'nenhum erro de JavaScript (sala)', errs[:3])
    await b.close()


async def indicadores(pw, P):
    print('\n4) os adversários sem os indicadores a mais')
    b, pg, erros = await abre(pw, 1280, 720)
    r = await rt(pg, """(() => { __T.comeca('futebol', 3, 4); const r = {};
      const conta = q => { let n = 0; const g = document.createElement('canvas').getContext('2d'), d0 = g.drawImage.bind(g); g.drawImage = function(){ n++; return d0.apply(null, arguments); }; aroDe(g, q, q.x, q.y, rqCor(q.time).base, 0); return n; };
      r.adv = RQ.jog.filter(q => q.time !== P.time).map(conta); r.comp = RQ.jog.filter(q => q.time === P.time && q !== P).map(conta); r.eu = conta(P);
      RQ.jog.forEach(q => { if (q !== P){ q.x = q.ax = q.time === P.time ? LX0 - 2000 : LX1 + 2000; q.y = q.ay = CY; } });
      const f0 = marcadorFora, cores = []; marcadorFora = function(g, x, y, ang, cor, bola){ cores.push(bola ? 'bola' : cor); };
      B.x = LX1 + 3000; VIS.bx = B.x; cam.z = cam.z || 1;
      try { const c = document.createElement('canvas').getContext('2d'); desenhaForaDaTela(c); } finally { marcadorFora = f0; }
      r.gotas = cores; r.voce = v70VoceVisivel(); r.n = RQ.jog.length;
      const nomes = []; const t0 = txt; txt = function(g, s){ nomes.push(s); }; try { rqDesenhaJog(document.createElement('canvas').getContext('2d')); } finally { txt = t0; }
      r.nomes = RQ.jog.filter(q => q !== P).every(q => nomes.indexOf(q.nome) >= 0); return r; })()""")
    P.confere(all(n == 1 for n in r['adv']) and all(n == 2 for n in r['comp']) and r['eu'] == 1, 'o halo dos adversários sem a ponta (a setinha); os companheiros continuam com ela; a sua usa a setinha branca', r)
    P.confere(r['gotas'].count('#ff6a00') == 2 and '#7a3fc4' not in r['gotas'] and 'bola' in r['gotas'], 'fora da tela: as gotas dos companheiros e da bola continuam; a dos adversários sai', r['gotas'])
    P.confere(r['voce'] and r['nomes'], 'ficam o nome de todo mundo e a sua setinha (VOCÊ)', r)
    rp = await rt(pg, "(() => { RP.ativo = true; const q = RQ.jog.find(o => o.time !== P.time); const v = RachaPartida80.adversario(q); RP.ativo = false; return v; })()")
    P.confere(rp is False, 'no replay a setinha de todos continua (para entender o lance)')
    errs = [e for e in erros if 'Failed to load resource' not in e]
    P.confere(not errs, 'nenhum erro de JavaScript (indicadores)', errs[:3])
    await b.close()


async def gol(pw, P):
    print('\n5) a animação GOOOL!')
    for mov in (None, 'reduce'):
        b, pg, erros = await abre(pw, 1280, 720, movimento=mov)
        r = await rt(pg, """(() => { __T.comeca('futebol', 2, 4); const A2 = __T.bot(0, 0); conf.length = 0;
          RQ.estado = 'jogo'; RQ.toques.length = 0; RQ.toques.push({p:A2, t0:RQ.tick - 30, tick:RQ.tick - 20, chute:RQ.tick - 20}, {p:P, t0:RQ.tick - 3, tick:RQ.tick - 1, chute:RQ.tick - 1}); rqGol(1); rqEventos();
          const d = RachaGol80.dados(); goalT = .55; render(0); const I = RachaGol80.pecas(), k = K, g = ctx;
          let lar = 0, rox = 0; for (let x = 700; x <= 1220; x += 8){ const q = g.getImageData(Math.round(x*k), Math.round((H/2 - 92)*k), 1, 1).data; if (Math.abs(q[0] - 255) < 40 && Math.abs(q[1] - 110) < 60 && q[2] < 80) lar++; if (Math.abs(q[0] - 125) < 50 && q[1] < 110 && q[2] > 150) rox++; }
          const r = {d, letras:I.letras.length, placa:!!I.placa, part:RachaGol80.particulas(), conf:conf.length, lar, rox, calmo:v70Calmo(), sub:bannerSub, txt:bannerTxt};
          // o gol deles: roxo
          RQ.estado = 'jogo'; const D = __T.bot(1, 0); RQ.toques.length = 0; RQ.toques.push({p:D, t0:RQ.tick - 3, tick:RQ.tick - 1, chute:RQ.tick - 1}); rqGol(-1); rqEventos();
          r.d2 = RachaGol80.dados(); goalT = .55; render(0); let rox2 = 0; for (let x = 700; x <= 1220; x += 8){ const q = g.getImageData(Math.round(x*k), Math.round((H/2 - 92)*k), 1, 1).data; if (Math.abs(q[0] - 125) < 50 && q[1] < 110 && q[2] > 150) rox2++; } r.rox2 = rox2;
          // a vitória ainda solta o confete da tela do fim
          rqSai(); goalT = -1; conf.length = 0; __T.comeca('futebol', 2, 4); RQ.placar = [3, 0]; rqFim(); rqFechaConta(false); rqMostraFim(); r.confFim = conf.length; fechaFim(); rqSai();
          // no treino: o gol é do Time A, o recado do exercício vai na placa
          TR.banner = 'NO ÂNGULO!'; const on = TR.on; TR.on = true; r.treino = RachaGol80.dados(); TR.on = on; TR.banner = '';
          return r; })()""")
        tag = ' (com Reduzir animações)' if mov else ''
        if not mov:
            P.confere(r['d']['palavra'] == 'GOOOL!' and r['d']['time'] == 0 and r['d']['nome'] == 'JOGADOR' and r['d']['sub'].startswith('PASSE DE ') and r['letras'] == 6 and r['placa'],
                      'o gol do Time A: GOOOL! (6 letras), o nome de quem marcou e o passe na placa', r['d'])
            P.confere(r['lar'] >= 12 and r['rox'] == 0 and r['d2']['time'] == 1 and r['rox2'] >= 12 and not r['d2']['nosso'], 'as cores do time que marcou: laranja no gol do Time A, roxo no do Time B (pixels)', [r['lar'], r['rox'], r['rox2']])
            P.confere(r['part'] >= 12 and r['conf'] == 0 and r['confFim'] > 0, 'o papel picado é da animação (poucas tiras); a chuva de confete da tela inteira saiu do gol e continua na vitória', [r['part'], r['conf'], r['confFim']])
            P.confere(r['txt'] == 'GOL!' and r['sub'].startswith('PASSE DE'), 'o texto do lance (o replay, a sala, a plataforma) continua o mesmo', [r['txt'], r['sub']])
            P.confere(r['treino']['time'] == 0 and r['treino']['sub'] == 'NO ÂNGULO!' and r['treino']['palavra'] == 'GOOOL!', 'no treino: GOOOL! do Time A e o recado do exercício na placa', r['treino'])
        else:
            P.confere(r['calmo'] and r['part'] == 0 and r['lar'] >= 12, 'com Reduzir animações: GOOOL! aparece e some, sem papel picado' + tag, [r['calmo'], r['part'], r['lar']])
        errs = [e for e in erros if 'Failed to load resource' not in e]
        P.confere(not errs, 'nenhum erro de JavaScript (gol' + tag + ')', errs[:3])
        await b.close()
    # dura o mesmo tempo da de antes
    b, pg, erros = await abre(pw, 1280, 720)
    d = await rt(pg, "(() => { const t = Array.from(document.scripts).map(x => x.text).join('\\n'); return {jogo:t.indexOf('if (goalT > 1.7){ goalT = -1;') >= 0, online:t.indexOf('if(goalT>1.7)goalT=-1;') >= 0}; })()")
    P.confere(d['jogo'] and d['online'], 'a animação dura o mesmo 1,7 s da faixa de antes (curta: não atrapalha a partida)', d)
    await b.close()


async def treino(pw, P):
    print('\n6) os controles do treino')
    for (w, h, tag) in [(1280, 720, 'computador'), (844, 390, 'celular')]:
        b, pg, erros = await abre(pw, w, h)
        await rt(pg, "(() => { if (lobby.tela) fechaTela(); jogar(); return 1; })()")
        await pg.wait_for_timeout(700)
        g = await rt(pg, """(() => { render(0); const k = K, g = ctx, r = {sels:RachaTreino80.sels(), verde:0, amarelo:0};
          for (const s of ARC_SELS) for (let y = s.y - s.h/2; y <= s.y + s.h/2; y += 3) for (let x = s.x - s.w/2 - 40; x <= s.x + s.w/2 + 40; x += 3){
            const q = g.getImageData(Math.round(x*k), Math.round(y*k), 1, 1).data; if (q[1] > 170 && q[0] < 160 && q[2] < 60 && q[1] - q[0] > 60) r.verde++; if (q[0] > 220 && q[1] > 180 && q[2] < 90) r.amarelo++; }
          return r; })()""")
        P.confere(g['verde'] == 0, 'sem as setas verdes (' + tag + ')', g['verde'])
        P.confere(g['amarelo'] > 20 and all(s['w'] == 272 and s['h'] == 80 for s in g['sels']), 'os cartões novos: maiores (272 × 80), com o ícone e o nome em amarelo (' + tag + ')', [g['amarelo'], g['sels'][0]])
        # toques de verdade: a metade da esquerda volta, a da direita avança (troca quando o dedo sobe)
        toca = """(async (id, lado) => { const s = ARC_SELS.find(x => x.id === id), r = cv.getBoundingClientRect(), x = r.left + (s.x + lado*s.w*.3)/W*r.width, y = r.top + s.y/H*r.height;
          const ev = (t) => cv.dispatchEvent(new PointerEvent(t, {pointerId:7, clientX:x, clientY:y, bubbles:true, pointerType:'touch', isPrimary:true}));
          ev('pointerdown'); await new Promise(f => setTimeout(f, 60)); const meio = {modo, campo, tr:TR.id}; ev('pointerup'); await new Promise(f => setTimeout(f, 60)); return meio; })"""
        antes = await rt(pg, "({modo, campo, tr:TR.id})")
        m1 = await pg.evaluate("([f, id, l]) => window.__RT(f)(id, l)", [toca, 'modo', 1])
        d1 = await rt(pg, "({modo, campo, tr:TR.id})")
        await pg.evaluate("([f, id, l]) => window.__RT(f)(id, l)", [toca, 'modo', -1])
        d2 = await rt(pg, "({modo, campo, tr:TR.id})")
        await pg.evaluate("([f, id, l]) => window.__RT(f)(id, l)", [toca, 'campo', 1])
        d3 = await rt(pg, "({modo, campo, tr:TR.id})")
        await pg.evaluate("([f, id, l]) => window.__RT(f)(id, l)", [toca, 'treino', 1])
        d4 = await rt(pg, "({modo, campo, tr:TR.id})")
        P.confere(m1['modo'] == antes['modo'] and d1['modo'] == (antes['modo'] + 1) % 4 and d2['modo'] == antes['modo'], 'TAMANHO: a direita avança e a esquerda volta, na hora em que o dedo sobe (' + tag + ')', [antes, m1, d1, d2])
        P.confere(d3['campo'] != d2['campo'] and d4['tr'] != d3['tr'], 'CAMPO e TREINO trocam como antes (' + tag + ')', [d2, d3, d4])
        ap = await rt(pg, """(() => { const s = ARC_SELS[0], x0 = s.x - s.w/2, y0 = s.y - s.h/2, f = (pm) => { const c = document.createElement('canvas'); c.width = s.w + 20; c.height = s.h + 20; const g = c.getContext('2d'); g.translate(10 - x0, 10 - y0);
            if (pm) ptrs.set(99, 'arc-modo-'); try { selCorpo(g, s, '1v1', 'arc-modo', x0, y0); } finally { ptrs.delete(99); } let n = 0; const d = g.getImageData(0, 0, c.width/2, c.height).data; for (let i = 0; i < d.length; i += 4) if (d[i] > 220 && d[i + 1] > 180 && d[i + 2] < 90) n++; return n; };
          return {solto:f(false), apertado:f(true)}; })()""")
        P.confere(ap['apertado'] > ap['solto'] + 30, 'ao apertar, a metade tocada acende de leve e a tampinha dela ganha a borda amarela (' + tag + ')', ap)
        errs = [e for e in erros if 'Failed to load resource' not in e]
        P.confere(not errs, 'nenhum erro de JavaScript (treino, ' + tag + ')', errs[:3])
        await b.close()
    b, pg, erros = await abre(pw, 1280, 720)
    ed = await rt(pg, "(() => { abreTela('tampinha'); const t = document.querySelector('.tpe-abas'); return t ? Array.from(t.querySelectorAll('[role=tab]')).map(x => x.textContent.trim()) : TPE_ABAS.T.map(a => a[1]); })()")
    P.confere(ed == ['PADRÃO', 'BORDA', 'ÍCONE', 'MODELOS PRONTOS', 'INVENTÁRIO'], 'o editor da tampinha com as 5 abas de sempre (Padrão, Borda, Ícone, Modelos Prontos, Inventário)', ed)
    await b.close()


ESTADO = """(() => { const r = NET49.room; return {sala:r ? r.code : null, regra:r ? r.regra : null, ranked:!!(r && r.ranked), host:NET49.host, slot:NET49.localSlot, jogando:NET49.playing,
  est:RQ.on ? RQ.estado : null, placar:RQ.placar.slice(), srv:RachaPartida80.servidor(), tela:RachaPartida80.tela(), prorrog:RQ.prorrog, v80:RachaPartida80.regra()}; })()"""
GOL_HOST = "(() => { RQ.estado = 'jogo'; RQ.toques.length = 0; RQ.toques.push({p:P, t0:RQ.tick - 3, tick:RQ.tick - 1, chute:RQ.tick - 1}); rqGol(P.time === 0 ? 1 : -1); return RQ.placar.slice(); })()"
GOL_OUTRO = "(() => { RQ.estado = 'jogo'; const q = RQ.jog.find(o => o.time !== P.time); RQ.toques.length = 0; RQ.toques.push({p:q, t0:RQ.tick - 3, tick:RQ.tick - 1, chute:RQ.tick - 1}); rqGol(P.time === 0 ? -1 : 1); return RQ.placar.slice(); })()"


async def online(pw, P):
    print('\n7) online de verdade: o relógio do servidor (a partida normal encurtada para 14 s + 8 s), o gol de ouro, o empate e a troca de time na sala')
    porta = porta_livre()
    srv = subprocess.Popen(['node', str(RAIZ / 'tests' / 'servidor_visitantes.cjs'), '--porta', str(porta), '--host', '127.0.0.1', '--memoria', '--estaticos', str(RAIZ), '--nome', 'Teste v80', '--sem-p2p',
                            '--tempo-normal', '14', '--prorrogacao', '8'], stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    time.sleep(0.8)
    url = 'http://127.0.0.1:%d/tests/build/racha_teste.html' % porta
    sess = []
    try:
        A = await sessao(pw, url, 'Ana'); B = await sessao(pw, url, 'Beto'); sess += [A, B]
        for pg in (A, B):
            await rt(pg, "(() => { CONTA.rq.pts = 1000; CONTA.rq.seq = 0; CONTA.rq.n = 1; contaSalvar(); lbRender(); return 1; })()")
        JOGA = "NET49.playing && NET49.room && NET49.room.ranked && (NET49.host || NET49.lastTick > 0)"
        # partida 1: 0 × 0 → prorrogação nos dois → o gol de ouro de quem roda a partida
        await rt(A, "LB.jogar.click()"); await espera(A, "(() => { const b = RachaRanqueada79.busca(); return b && b.fase === 'fila'; })()", 6000)
        await rt(B, "LB.jogar.click()")
        await espera(A, JOGA, 8000); await espera(B, JOGA, 8000)
        ea = await rt(A, ESTADO); eb = await rt(B, ESTADO)
        P.confere(ea['regra'] == 'v80' and ea['v80'] == {'seg': 14, 'ot': 8} and eb['v80'] == {'seg': 14, 'ot': 8}, 'a ranqueada online é a partida normal: a regra e o tempo vêm do servidor', [ea['v80'], eb['v80']])
        host, conv = (A, B) if ea['host'] else (B, A)
        await asyncio.sleep(3)
        sa, sb = await asyncio.gather(rt(A, "RachaPartida80.servidor()"), rt(B, "RachaPartida80.servidor()"))
        ta = await rt(host, "RQ.t")
        P.confere(sa is not None and sb is not None and abs(sa - sb) < .6 and abs(ta - sa) < .8 and 2 <= sa <= 6, 'os dois veem o mesmo relógio (o do servidor; quem roda a partida também usa ele)', [sa, sb, ta])
        tl = await rt(conv, "(() => { const t = RachaPartida80.tela(); return {s:RachaPartida80.servidor(), txt:t.s, ot:t.ot}; })()")
        esp = '%02d:%02d' % divmod(max(0, math.ceil(14 - tl['s'] - 1e-6)), 60)
        P.confere(tl['txt'] == esp and not tl['ot'] and tl['s'] > 1, 'o placar de quem joga de fora mostra o relógio do servidor descendo (%s com %.1f s de jogo)' % (tl['txt'], tl['s']), tl)
        ot = await espera(conv, "(() => { const t = RachaPartida80.tela(); return t.ot && t.s.indexOf('-') === 0 ? t : null; })()", 16000, 100)
        oh = await espera(host, "RQ.prorrog && RQ.estado !== 'fim' ? RachaPartida80.tela() : null", 4000)
        P.confere(bool(ot) and bool(oh) and ot['cor'] == '#ff5a4f', '0 × 0 no fim dos 14 s: a prorrogação nos dois (o relógio negativo, em vermelho)', [ot, oh])
        await rt(host, GOL_HOST)
        fh = await espera(host, "fimAberto() && RQ.resultado && RQ.resultado.pr ? {tit:fimEl('fim-titulo').textContent, d:RQ.resultado.pr.delta} : null", 9000)
        fc = await espera(conv, "fimAberto() && RQ.resultado && RQ.resultado.pr ? {tit:fimEl('fim-titulo').textContent, d:RQ.resultado.pr.delta, gol:RachaGol80.dados()} : null", 9000)
        P.confere(bool(fh) and bool(fc) and fh['tit'] == 'VITÓRIA!' and fh['d'] > 0 and fc['tit'] == 'DERROTA' and fc['d'] < 0,
                  'o gol de ouro de quem roda a partida acaba o jogo e o servidor confere (vitória de um, derrota do outro)', [fh, fc])
        nh = await rt(host, "({t:P.time, nome:String(perfil.nome).toUpperCase()})")
        P.confere(bool(fc) and fc['gol']['time'] == nh['t'] and fc['gol']['nome'] == nh['nome'] and fc['gol']['palavra'] == 'GOOOL!' and not fc['gol']['nosso'],
                  'quem joga de fora viu o GOOOL! na cor do time de quem marcou, com o nome dele', [fc and fc['gol'], nh])
        # partida 2: 1 × 1 no fim → empate conferido
        await rt(host, "fimEl('fim-denovo').click()"); await asyncio.sleep(0.5); await rt(conv, "fimEl('fim-denovo').click()")
        await espera(A, JOGA, 10000); await espera(B, JOGA, 10000)
        ea = await rt(A, ESTADO)
        host, conv = (A, B) if ea['host'] else (B, A)
        await espera(host, "RQ.estado === 'jogo' || RQ.estado === 'saida'", 3000)
        await rt(host, GOL_HOST)
        await espera(host, "RQ.estado === 'saida' || RQ.estado === 'jogo'", 4000, 50)
        await asyncio.sleep(0.2)
        await rt(host, GOL_OUTRO)
        pl = await espera(conv, "RQ.placar[0] === 1 && RQ.placar[1] === 1 ? RQ.placar.slice() : null", 4000)
        fh = await espera(host, "fimAberto() && RQ.resultado && RQ.resultado.pr ? {tit:fimEl('fim-titulo').textContent, d:RQ.resultado.pr.delta, cls:fimEl('fim').className} : null", 20000)
        fc = await espera(conv, "fimAberto() && RQ.resultado && RQ.resultado.pr ? {tit:fimEl('fim-titulo').textContent, d:RQ.resultado.pr.delta, cls:fimEl('fim').className} : null", 9000)
        P.confere(pl == [1, 1] and bool(fh) and bool(fc) and fh['tit'] == 'EMPATE' == fc['tit'] and fh['d'] == 0 == fc['d'] and 'empate' in fh['cls'],
                  '1 × 1 no fim dos 14 s: EMPATE conferido pelo servidor nos dois (±0 pontos, sem prorrogação)', [pl, fh, fc])
        for pg in (A, B):
            await rt(pg, "fimEl('fim-lobby').click()")
        await asyncio.sleep(0.6)
        # a sala personalizada: trocar de time muda a tampinha na tela do outro na hora
        await rt(A, "(() => { abrirLobby(); Object.assign(SX.form, {onde:'online', pub:true, n:1, map:4, jogo:'futebol', tempo:0, bots:true, nome:'Sala v80'}); sxCriar(); return 1; })()")
        cod = await espera(A, "NET49.room && NET49.room.code", 6000)
        await rt(A, "net49Send({type:'seat', slot:-1})")                 # (quem criou vai assistir: os dois times livres)
        await rt(B, "(() => { abrirLobby(); net49Send({type:'join', code:%s, spectate:true}); return 1; })()" % json.dumps(cod))
        await espera(A, "NET49.room && NET49.room.members.length === 2", 6000)
        await rt(A, """(() => { window.__tampaB = function(){ const r = NET49.room, m = r && r.members.find(x => x.id !== NET49.id); if (!m) return null; const t = m.slot >= 0 ? Math.floor(m.slot/r.n) : -1, c = tpNoTime(m.skin, t);
          return {t, cod:c === TP_TIME_COD[0] ? 'A' : c === TP_TIME_COD[1] ? 'B' : c === TP_PADRAO_COD ? 'metade' : 'outra', carta:!!document.querySelector('#lb .sl-card[data-id="' + m.id + '"] canvas')}; }; return 1; })()""")
        r0 = await rt(A, "window.__tampaB()")
        await rt(B, "net49Send({type:'seat', team:1})")
        r1 = await espera(A, "(() => { const v = window.__tampaB(); return v && v.t === 1 ? v : null; })()", 5000)
        await rt(B, "net49Send({type:'seat', team:0})")
        r2 = await espera(A, "(() => { const v = window.__tampaB(); return v && v.t === 0 ? v : null; })()", 5000)
        P.confere(r0 and r0['cod'] == 'metade' and r1 and r1['cod'] == 'B' and r1['carta'] and r2 and r2['cod'] == 'A',
                  'na sala: quem assiste aparece com a metade/metade; foi para o Time B, toda roxa; para o Time A, toda laranja (na tela do outro, na hora)', [r0, r1, r2])
        for pg in sess:
            errs = [e for e in pg.erros if 'Failed to load resource' not in e and 'favicon' not in e]
            P.confere(not errs, 'nenhum erro de JavaScript na sessão de ' + pg.nome, errs[:3])
    finally:
        for pg in sess:
            try: await pg.b.close()
            except Exception: pass
        srv.terminate()
        try: srv.communicate(timeout=3)
        except Exception: pass


async def principal():
    P = Placar('v80 · laranja × roxo, a tampinha Listras, o placar com 3:00, a prorrogação, o GOOOL! e o treino')
    async with async_playwright() as pw:
        if '--so-online' not in sys.argv:                   # (--so-online: só a parte com o servidor)
            await times_tampinha(pw, P)
            await placar_regras(pw, P)
            await sala_local(pw, P)
            await indicadores(pw, P)
            await gol(pw, P)
            await treino(pw, P)
        if '--sem-online' not in sys.argv:                  # (--sem-online: só as partes sem o servidor)
            await online(pw, P)
    return P.fim()

if __name__ == '__main__':
    roda(principal())
