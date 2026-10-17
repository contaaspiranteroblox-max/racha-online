"""Etapa 1 · regras e resultados: autoria, gol contra, assistência, touchdown, basquete, metas e unidades, e a mesma
classificação no placar, na faixa, no replay, nas estatísticas, no prêmio e no evento da plataforma.
(v70.2: touchdown, basquete, vôlei e ginga são os modos GUARDADOS — fora do jogo, com o código mantido; o teste liga eles
de novo só na página de teste, com __T.guardados(), para a regra continuar conferida.)

Rodar:  python3 tests/regras_test.py            (a cópia de teste do build atual)
        RACHA_TESTE=<outra cópia>.html python3 tests/regras_test.py --so-fisica   (compara cenários de física com outra versão)
"""
import sys, json
from comum import abre, rt, roda, Placar, async_playwright

SO_FISICA = '--so-fisica' in sys.argv

# ---------------------------------------------------------------------------------------------------- cenários de física
GOL_CONTRA = r"""(() => {                 // o atacante toca; o defensor domina perto do próprio gol e conduz para dentro
  const T = __T; T.comeca('futebol', 2, 0); T.limpa();
  const A = P, D = T.bot(1, 0);
  T.poe(A, CX + 120, CY); T.cola(A, 1, 0);
  T.passos(3, () => { P.mx = 1; P.my = 0; });
  const tocouA = RQ.toques.some(t => t.p === A);
  T.poe(A, CX - 300, LY0 + 80); P.mx = 0;
  T.poe(D, LX1 - 170, CY); T.cola(D, 1, 0);
  const g = T.passos(600, () => { D.mx = 1; D.my = 0; });
  return {tocouA, g, D:D.nome, faixa:g ? T.faixa() : null};
})()"""

ASSIST_CONTRA = r"""(() => {                  // companheiro → você → o defensor domina e faz contra: sem autor e sem assistência
  const T = __T; T.comeca('futebol', 2, 0); T.limpa();
  const C = T.bot(0, 0), D = T.bot(1, 0);
  T.poe(C, CX - 100, CY); T.cola(C, 1, 0);
  T.passos(3, () => { C.mx = 1; C.my = 0; }); C.mx = 0; T.poe(C, CX - 100, LY1 - 80);
  T.poe(P, CX + 60, CY); T.cola(P, 1, 0);
  T.passos(3, () => { P.mx = 1; P.my = 0; }); P.mx = 0; T.poe(P, CX - 300, LY0 + 80);
  T.poe(D, LX1 - 170, CY); T.cola(D, 1, 0);
  const g = T.passos(600, () => { D.mx = 1; D.my = 0; });
  return {g, C:C.nome, D:D.nome};
})()"""

GOL_COM_PASSE = r"""(() => {                  // companheiro toca, você conduz e marca: seu gol, assistência dele
  const T = __T; T.comeca('futebol', 2, 0); T.limpa();
  const C = T.bot(0, 0);
  T.poe(C, LX1 - 260, CY); T.cola(C, 1, 0);
  T.passos(3, () => { C.mx = 1; C.my = 0; }); C.mx = 0; T.poe(C, CX, LY1 - 80);
  T.poe(P, LX1 - 170, CY); T.cola(P, 1, 0);
  const g = T.passos(600, () => { P.mx = 1; P.my = 0; });
  return {g, C:C.nome, faixa:g ? T.faixa() : null};
})()"""

TD_PORTADOR = r"""(() => {                    // americano: você carrega a bola pela linha de fundo
  const T = __T; const m = T.comeca('americano', 2, 0); T.limpa();
  T.poe(P, LX1 - 150, CY); T.cola(P, 1, 0);
  const g = T.passos(600, () => { P.mx = 1; P.my = 0; });
  return {m, g};
})()"""

TD_CHUTAO = r"""(() => {                     // americano: chutão de longe; um defensor parado colado à linha, perto da bola, sem tocar
  const T = __T; T.comeca('americano', 2, 0); T.limpa();
  const D = T.bot(1, 0);
  T.poe(P, LX1 - 520, CY); T.cola(P, 1, 0);
  T.poe(D, LX1 + R_BOLA, CY + D.r + B.r + 4);            // no ponto onde a bola cruza, a 4 px da linha dela: "perto", mas sem encostar
  let cruzou = false, dCruz = null, dMin = 1e9;
  const mc = mdCruzou;                                     // (mede a folga no instante exato em que a bola cruza a linha)
  mdCruzou = function(x0, y0, x1, y1){ if (!cruzou && golCruzou(x0, y0, x1, y1)){ cruzou = true; dCruz = Math.hypot(D.x - B.x, D.y - B.y) - D.r - B.r; } return mc(x0, y0, x1, y1); };
  P.chutar = FORCA_POWER;
  const g = T.passos(240, i => { if (i > 0) P.chutar = 0; P.mx = P.my = 0; D.mx = D.my = 0;
    dMin = Math.min(dMin, Math.hypot(D.x - B.x, D.y - B.y) - D.r - B.r); });
  mdCruzou = mc;
  const tocouD = RQ.toques.some(t => t.p === D);
  return {g, cruzou, tocouD, folgaNaLinha:dCruz, folgaMin:dMin, placar:RQ.placar.slice(), dx:D.x - LX1};
})()"""

CESTA_3 = r"""(() => {                       // basquete: arremesso de fora do arco, direto no aro
  const T = __T; const m = T.comeca('basquete', 2, 0); T.limpa();
  const hx = LX1, d = (RQ.tres || 0) + 90;
  T.poe(P, hx - d - P.r - B.r - 1, CY); T.cola(P, 1, 0);
  P.chutar = FORCA_POWER;
  const g = T.passos(300, i => { if (i > 0) P.chutar = 0; });
  return {m, g};
})()"""

CESTA_HERDADA = r"""(() => {                  // basquete: um arremesso de 3 erra; vem a saída; depois você empurra a bola para dentro, sem chutar
  const T = __T; T.comeca('basquete', 2, 0); T.limpa();
  const hx = LX1, d = (RQ.tres || 0) + 90;
  T.poe(P, hx - d, CY - 160); T.cola(P, 1, -1);           // chuta para a parede de cima: erra
  P.chutar = FORCA_POWER; T.passos(4, i => { if (i > 0) P.chutar = 0; });
  const origem = RQ.chuteDe ? {time:RQ.chuteDe.time, longe:Math.hypot(RQ.chuteDe.x - hx, RQ.chuteDe.y - CY) > (RQ.tres || 0)} : null;
  rqSaida(1); RQ.estado = 'jogo';                         // a saída (sem limpar nada à mão: só o que o jogo faz)
  const depois = !!RQ.chuteDe;
  RQ.jog.forEach((q, i) => { if (q !== P) T.poe(q, CX - 250, LY0 + 80 + i*70); });
  T.poe(P, hx - 120, CY); T.cola(P, 1, 0);
  const g = T.passos(600, () => { P.mx = 1; P.my = 0; });
  return {origem, depois, g};
})()"""

CESTA_POSSE = r"""(() => {                    // basquete: você arremessa de 3 e erra; o adversário domina; você recupera e empurra para dentro
  const T = __T; T.comeca('basquete', 2, 0); T.limpa();
  const hx = LX1, d = (RQ.tres || 0) + 90, D = T.bot(1, 0);
  T.poe(P, hx - d, CY - 160); T.cola(P, 1, -1);
  P.chutar = FORCA_POWER; T.passos(4, i => { if (i > 0) P.chutar = 0; });
  const antes = !!RQ.chuteDe;
  T.poe(P, CX - 300, LY1 - 80);
  T.poe(D, CX + 100, CY); T.cola(D, -1, 0);
  T.passos(30, () => { D.mx = -1; D.my = 0; }); D.mx = 0; T.poe(D, CX - 200, LY0 + 80);
  const depoisPosse = !!RQ.chuteDe;
  T.poe(P, hx - 120, CY); T.cola(P, 1, 0);
  const g = T.passos(600, () => { P.mx = 1; P.my = 0; });
  return {antes, depoisPosse, g};
})()"""

# ---------------------------------------------------------------------------------------------------- a regra (rqLance), com sequências montadas
REGRA = r"""(() => {
  const T = __T; T.comeca('futebol', 2, 0); T.limpa();
  const A = P, A2 = T.bot(0, 0), D = T.bot(1, 0), D2 = T.bot(1, 1) || D;
  const caso = (seq, cd, tick, time) => { RQ.toques.length = 0; seq.forEach(s => RQ.toques.push(Object.assign({chute:-1}, s))); RQ.chuteDe = cd; RQ.tick = tick; RQ.tdPortador = null;
    const L = rqLance(time === undefined ? 0 : time); return {autor:T.nome(L.autor), assist:T.nome(L.assist), contra:L.contra, contraDe:T.nome(L.contraDe), desvio:T.nome(L.desvio), tres:L.tres}; };
  const r = {};
  r.simples = caso([{p:A, t0:90, tick:100, chute:100}], {p:A, time:0, tick:100, alvo:true, x:CX, y:CY}, 150);
  r.passe = caso([{p:A2, t0:40, tick:50, chute:50}, {p:A, t0:90, tick:100, chute:100}], {p:A, time:0, tick:100, alvo:true, x:CX, y:CY}, 150);
  r.passeVelho = caso([{p:A2, t0:40, tick:50, chute:50}, {p:A, t0:90, tick:800, chute:800}], {p:A, time:0, tick:800, alvo:true, x:CX, y:CY}, 820);
  r.interceptado = caso([{p:A2, t0:40, tick:50, chute:50}, {p:D, t0:60, tick:90}, {p:A, t0:110, tick:120, chute:120}], {p:A, time:0, tick:120, alvo:true, x:CX, y:CY}, 150);
  r.desvioNoCaminho = caso([{p:A2, t0:40, tick:50, chute:50}, {p:D, t0:60, tick:61}, {p:A, t0:110, tick:120, chute:120}], {p:A, time:0, tick:120, alvo:true, x:CX, y:CY}, 150);
  r.contraDominado = caso([{p:A, t0:90, tick:100, chute:100}, {p:D, t0:110, tick:160}], null, 170);
  r.desvioNoAlvo = caso([{p:A2, t0:40, tick:50, chute:50}, {p:A, t0:90, tick:100, chute:100}, {p:D, t0:120, tick:121}], {p:A, time:0, tick:100, alvo:true, x:CX, y:CY}, 140);
  r.desvioFora = caso([{p:A, t0:90, tick:100, chute:100}, {p:D, t0:120, tick:121}], {p:A, time:0, tick:100, alvo:false, x:CX, y:CY}, 140);
  r.desvioDuplo = caso([{p:A, t0:90, tick:100, chute:100}, {p:D, t0:120, tick:121}, {p:D2, t0:125, tick:127}], {p:A, time:0, tick:100, alvo:true, x:CX, y:CY}, 140);
  r.desvioTarde = caso([{p:A, t0:90, tick:100, chute:100}, {p:D, t0:120, tick:121}], {p:A, time:0, tick:100, alvo:true, x:CX, y:CY}, 400);
  r.chutouDeNovo = caso([{p:A, t0:90, tick:130, chute:100}, {p:D, t0:140, tick:141}], {p:A, time:0, tick:100, alvo:true, x:CX, y:CY}, 160);
  r.contraDoSeuTime = caso([{p:D, t0:90, tick:100, chute:100}, {p:A, t0:110, tick:150}], null, 160, 1);
  r.ninguem = caso([], null, 10);
  // alvo: a conta do caminho no momento do chute
  T.limpa(); T.poe(P, LX1 - 300, CY); T.cola(P, 1, 0); P.chutar = FORCA_POWER; T.passos(2, i => { if (i > 0) P.chutar = 0; });
  r.alvoNoGol = RQ.chuteDe ? !!RQ.chuteDe.alvo : null;
  T.limpa(); T.poe(P, LX1 - 300, CY); T.cola(P, 1, -1.2); P.chutar = FORCA_POWER; T.passos(2, i => { if (i > 0) P.chutar = 0; });
  r.alvoNaParede = RQ.chuteDe ? !!RQ.chuteDe.alvo : null;
  T.limpa(); T.poe(P, CX - 200, CY); T.cola(P, -1, 0); P.chutar = FORCA_POWER; T.passos(2, i => { if (i > 0) P.chutar = 0; });
  r.alvoNoProprio = RQ.chuteDe ? !!RQ.chuteDe.alvo : null;
  return r;
})()"""

METAS = r"""(() => {
  const out = {};
  for (const md of ['futebol', 'curva', 'volei', 'americano', 'basquete', 'ginga']){
    X49.mode = 'casual'; X49.jogo = md; rqComeca(2, 0);
    rqIntro(0.05);                                      // a apresentação escreve o "SORTEIO · PRIMEIRO A ..."
    out[md] = {meta:RQ.meta, vs:VS.nivel.textContent, metaTxt:mdMetaTxt(), un:mdUn(md).placar, acao:mdUn(md).acao};
    rqVsComeca(); rqSai();
  }
  return out;
})()"""

CONSUMIDORES = r"""(() => {                   // placar, faixa, replay, estatística, prêmio e evento da plataforma: a mesma classificação
  const T = __T; T.comeca('futebol', 2, 0); T.limpa();
  const A2 = T.bot(0, 0), D = T.bot(1, 0);
  let fim = null, moedas = 0; window.RACHA_EVT = {inicio(){}, treino(){}, fim(d){ fim = d; }};
  const eco0 = ecoGol; ecoGol = function(){ moedas++; return eco0.apply(this, arguments); };
  const st0 = perfil.st.gols, as0 = perfil.st.assist;
  const gol = (seq, cd, lado) => { RQ.estado = 'jogo'; RQ.toques.length = 0; seq.forEach(s => RQ.toques.push(Object.assign({chute:-1}, s))); RQ.chuteDe = cd; RQ.tick += 50;
    rqGol(lado); const L = T.lance(); const f = T.faixa(); return {L, f}; };
  const t = () => RQ.tick;
  const r = {};
  r.g1 = gol([{p:A2, t0:t()+1, tick:t()+2, chute:t()+2}, {p:P, t0:t()+20, tick:t()+21, chute:t()+21}], {p:P, time:0, tick:RQ.tick+21, alvo:true, x:CX, y:CY}, 1);   // seu gol, passe dele
  r.g2 = gol([{p:P, t0:t()+1, tick:t()+2, chute:t()+2}, {p:D, t0:t()+5, tick:t()+40}], null, 1);   // contra deles
  r.g3 = gol([{p:P, t0:t()+1, tick:t()+40}], null, -1);                                               // contra seu (o deles marca)
  r.g4 = gol([{p:P, t0:t()+1, tick:t()+3, chute:t()+3}], {p:P, time:0, tick:RQ.tick+3, alvo:true, x:CX, y:CY}, 1);   // seu gol: 3 × 1
  r.fimPendente = RQ.fimPendente;
  rqFim(); rqFechaConta(false);
  r.fim = fim; r.moedas = moedas; r.golsPerfil = perfil.st.gols - st0; r.assistPerfil = perfil.st.assist - as0;
  r.resultado = {golsH:RQ.resultado.golsH, assistH:RQ.resultado.assistH, contraH:RQ.resultado.contraH, ptsH:RQ.resultado.ptsH, jogo:RQ.resultado.jogo};
  ecoGol = eco0;
  return r;
})()"""


async def principal():
    P = Placar('Etapa 1 · regras e resultados' + (' (só física, outra versão)' if SO_FISICA else ''))
    async with async_playwright() as pw:
        b, pg, erros = await abre(pw)
        # v70.2: vôlei, americano, basquete e ginga saíram do jogo (só FUTEBOL e COM CURVA aparecem), mas o código deles ficou
        # guardado. Aqui eles são ligados de novo só nesta página de teste, para a regra deles continuar conferida.
        await rt(pg, "__T.guardados()")

        print('\n· gol contra depois do domínio do defensor (o caso da auditoria)')
        r = await rt(pg, GOL_CONTRA)
        g = r['g'] or {}
        print('   ', json.dumps(r, ensure_ascii=False)[:400])
        P.confere(r['tocouA'], 'o atacante tocou antes do defensor')
        P.confere(bool(g), 'saiu o ponto')
        P.confere(g.get('contra') is True and g.get('autor') is None, 'é gol contra, sem autor no time que marcou', g)
        P.confere(g.get('placar') == [1, 0], 'o placar vai para o time que atacava', g.get('placar'))
        P.confere(g.get('golH') is False and g.get('golsH') == 0, 'o atacante não ganha o gol (nem moedas/estatística)', g)
        if not SO_FISICA:
            P.confere(g.get('contraDe') == r['D'], 'o gol contra fica no nome do defensor', g.get('contraDe'))
            P.confere((g.get('info') or {}).get('contra') is True and (g.get('info') or {}).get('autor') == '', 'o replay recebe a mesma classificação', g.get('info'))
            P.confere((r.get('faixa') or {}).get('s', '').startswith('GOL CONTRA DE'), 'a faixa explica: GOL CONTRA DE ...', r.get('faixa'))

        print('\n· assistência não sobrevive ao gol contra')
        r = await rt(pg, ASSIST_CONTRA)
        g = r['g'] or {}
        print('   ', json.dumps(r, ensure_ascii=False)[:300])
        P.confere(g.get('contra') is True and g.get('assist') is None and g.get('assistH') is False, 'sem autor e sem assistência', g)

        print('\n· gol com passe do companheiro')
        r = await rt(pg, GOL_COM_PASSE)
        g = r['g'] or {}
        print('   ', json.dumps(r, ensure_ascii=False)[:300])
        P.confere(g.get('autor') == 'EU' and g.get('assist') == r['C'] and g.get('contra') is False, 'seu gol, assistência do companheiro', g)

        print('\n· touchdown só com o portador do time que ataca')
        r = await rt(pg, TD_PORTADOR)
        g = r['g'] or {}
        print('   ', json.dumps(r, ensure_ascii=False)[:300])
        P.confere(g.get('placar') == [1, 0] and g.get('autor') == 'EU', 'quem conduz pela linha faz o touchdown', g)
        r = await rt(pg, TD_CHUTAO)
        print('   ', json.dumps(r, ensure_ascii=False)[:300])
        P.confere(r['cruzou'] and not r['tocouD'] and r['folgaNaLinha'] is not None and r['folgaNaLinha'] <= 8, 'o chutão chegou à linha com o defensor a menos de 8 px, sem encostar', r)
        P.confere(r['g'] is None and r['placar'] == [0, 0], 'chutão com defensor perto não vale touchdown', r)

        print('\n· basquete: os pontos da tentativa atual')
        r = await rt(pg, CESTA_3)
        g = r['g'] or {}
        print('   ', json.dumps(r, ensure_ascii=False)[:300])
        P.confere(g.get('pts') == 3 and g.get('placar') == [3, 0], 'arremesso de fora do arco vale 3', g)
        r = await rt(pg, CESTA_HERDADA)
        g = r['g'] or {}
        print('   ', json.dumps(r, ensure_ascii=False)[:300])
        P.confere(bool(r['origem']) and r['origem']['longe'], 'a tentativa anterior foi de fora do arco')
        P.confere(g.get('pts') == 2, 'depois da saída, a cesta empurrada vale 2 (não herda os 3)', g)
        r = await rt(pg, CESTA_POSSE)
        g = r['g'] or {}
        print('   ', json.dumps(r, ensure_ascii=False)[:300])
        P.confere(g.get('pts') == 2, 'depois que o adversário domina, a cesta empurrada vale 2', g)
        if not SO_FISICA:
            P.confere(r['antes'] and not r['depoisPosse'], 'o domínio do adversário apaga a origem do arremesso', r)

        if not SO_FISICA:
            print('\n· a regra, caso a caso (sequências montadas)')
            r = await rt(pg, REGRA)
            for k, v in r.items():
                print('    %-16s %s' % (k, json.dumps(v, ensure_ascii=False)))
            P.confere(r['simples']['autor'] == 'EU' and not r['simples']['contra'], 'gol simples: do último que tocou')
            P.confere(r['passe']['assist'] is not None, 'passe do companheiro logo antes: assistência')
            P.confere(r['passeVelho']['assist'] is None, 'passe de mais de 10 s antes: sem assistência')
            P.confere(r['interceptado']['assist'] is None and r['interceptado']['autor'] == 'EU', 'interceptação no meio: sem assistência')
            P.confere(r['desvioNoCaminho']['assist'] is None, 'qualquer toque adversário entre o passe e o autor acaba com a assistência')
            P.confere(r['contraDominado']['contra'] and r['contraDominado']['autor'] is None, 'o defensor domina e manda para dentro: gol contra')
            P.confere(r['desvioNoAlvo']['autor'] == 'EU' and r['desvioNoAlvo']['desvio'] is not None and r['desvioNoAlvo']['assist'] is not None, 'desvio curto num chute que ia no gol: gol de quem chutou (e a assistência fica)')
            P.confere(r['desvioFora']['contra'], 'desvio num chute que não ia no gol: gol contra')
            P.confere(r['desvioDuplo']['autor'] == 'EU', 'dois desvios curtos no chute que ia no gol: ainda de quem chutou')
            P.confere(r['desvioTarde']['contra'], 'gol muito depois do desvio: gol contra')
            P.confere(r['chutouDeNovo']['contra'], 'o chute que valia não foi o último toque do atacante: gol contra no desvio')
            P.confere(r['contraDoSeuTime']['contra'] and r['contraDoSeuTime']['contraDe'] == 'EU', 'você domina e manda para o seu gol: gol contra seu')
            P.confere(r['ninguem']['autor'] is None and not r['ninguem']['contra'], 'sem toque nenhum: ponto sem autor (não é contra)')
            P.confere(r['alvoNoGol'] is True, 'chute reto para o gol: ia no gol')
            P.confere(r['alvoNaParede'] is False, 'chute para a parede: não ia no gol')
            P.confere(r['alvoNoProprio'] is False, 'chute para o próprio gol não conta como no alvo do ataque')

            print('\n· metas e unidades de cada modo')
            r = await rt(pg, METAS)
            for k, v in r.items():
                print('    %-10s %s' % (k, json.dumps(v, ensure_ascii=False)))
            esperado = {'futebol': (3, 'GOLS'), 'curva': (3, 'GOLS'), 'volei': (3, 'PONTOS'), 'americano': (3, 'TOUCHDOWNS'), 'basquete': (12, 'PONTOS'), 'ginga': (5, 'PONTOS')}
            for md, (meta, un) in esperado.items():
                P.confere(r[md]['meta'] == meta, '%s vai a %d' % (md, meta), r[md]['meta'])
                P.confere(r[md]['vs'].endswith('PRIMEIRO A %d %s' % (meta, un)), '%s: a apresentação diz PRIMEIRO A %d %s' % (md, meta, un), r[md]['vs'])

            print('\n· placar, faixa, replay, estatística, prêmio e plataforma usam a mesma classificação')
            r = await rt(pg, CONSUMIDORES)
            print('   ', json.dumps(r, ensure_ascii=False)[:900])
            P.confere(r['g1']['L']['autor'] == 'EU' and r['g1']['L']['assist'] is not None, 'gol 1: seu, com passe')
            P.confere(r['g1']['f']['t'] == 'GOL!' and r['g1']['f']['s'].startswith('PASSE DE'), 'faixa do gol 1: GOL! · PASSE DE ...', r['g1']['f'])
            P.confere(r['g2']['L']['contra'] and r['g2']['f']['s'].startswith('GOL CONTRA DE'), 'gol 2: contra deles, faixa explica', r['g2']['f'])
            P.confere(r['g3']['L']['contra'] and r['g3']['L']['contraDe'] == 'EU' and r['g3']['f']['s'] == 'GOL CONTRA (VOCÊ)' and r['g3']['f']['azul'], 'gol 3: contra seu, faixa deles explica', r['g3']['f'])
            P.confere(r['g1']['L']['info']['assist'] != '' and r['g2']['L']['info']['contra'] is True, 'o replay guarda autor, passe e gol contra')
            P.confere(r['fimPendente'], 'o 3º gol do time encerra a partida (meta 3)')
            P.confere(r['moedas'] == 2 and r['golsPerfil'] == 2 and r['assistPerfil'] == 0, 'moedas e estatística só nos 2 gols seus', r)
            f = r['fim'] or {}
            P.confere(f.get('gols') == 2 and f.get('assistencias') == 0 and f.get('golsContra') == 1 and f.get('modo') == 'futebol' and f.get('pontos') == 2, 'o evento da plataforma leva gols, assistências, gols contra, modo e pontos', f)
            P.confere(f.get('placarNosso') == 3 and f.get('placarDeles') == 1, 'o evento leva o placar 3 × 1', f)

        rede = [e for e in erros if 'Failed to load resource' in e]
        P.confere(not [e for e in erros if e not in rede], 'nenhum erro de JavaScript', [e for e in erros if e not in rede][:4])
        if rede: print('  (aviso: %d recurso(s) externo(s) não carregaram sem internet — ver as fontes na Etapa 6)' % len(rede))
        await b.close()
    return P.fim()

roda(principal())
