"""v78 · nada escrito em cima da cabeça dos jogadores, os BOTS NOVOS (mais divertidos) e o PERFIL mais fácil de entender, com a
tampinha maior no lobby e no perfil (na partida o tamanho é o de sempre).

· EM CIMA DA CABEÇA: os nomes das jogadas (FINTA!, DRIBLE!, TABELA!, DOUBLE SHOT!) não são mais desenhados — mesmo com uma
  etiqueta na fila, nada sai no quadro; o balão "digitando" da sala online continua.
· OS BOTS NOVOS: a cabeça nova está ligada (a antiga não joga); cada bot tem um jeito (Fominha, Garçom, Matador, Paredão,
  Raçudo, Malandro), sem repetir no time; no 3v3 e no 4v4 cada time tem um goleiro-linha (o Paredão); os seus companheiros
  jogam no nível bom (o nível escolhido é o dos adversários); a escalação aparece na faixa de cima no começo.
  Na apresentação dos times (a da LIGA), o jeito de cada bot e o nível em que ele joga de verdade.
  O mesmo corpo de todo mundo: em 45 s de 4v4 nenhum bot passa da velocidade do jogador e todo chute é PASSE ou CHUTE com a
  bola no alcance. Com você na bola, o companheiro não toma ela de você; com você livre na frente, ele toca para você; na
  saída, o bot dá a saída e espera você dar a sua (depois de 5 s um companheiro dá); na comemoração quem fez corre para a
  bandeirinha e quem levou para; o placar mexe no jogo só na casual contra você (quem abre vantagem relaxa, quem perde de 2 aperta).
  Partidas inteiras (com sorteio fixo): todas acabam, sem bola presa mais de 6 s e sem gol contra demais; o custo por quadro.
· O PERFIL: a VISÃO GERAL com o nível por extenso (NÍVEL 1 · FALTAM 100 XP PARA O 2), 4 números grandes com o nome inteiro,
  uma frase com os números de verdade (ou o convite para jogar) e a sua bio inteira; as abas com o nome inteiro em 4 telas;
  nada rola; a tampinha do perfil 1,4× maior.
· O LOBBY: a tampinha do meio 1,4× maior, sem encostar no letreiro nem nos botões de baixo, em 5 tamanhos.
· NA PARTIDA nada muda de tamanho: o raio do jogador é o da física (e, com RACHA_REF, igual ao da v71.1).
Isto mede comportamento e desenho no Chromium de teste; se os bots ficaram divertidos é com quem joga.

Rodar: python3 tests/v78_test.py            (RACHA_REF=<racha_teste.html da v71.1> compara as medidas da física)
"""
import json, os, re, pathlib
from comum import abre, rt, roda, Placar, async_playwright, RAIZ

SAIDA = RAIZ / 'tests' / 'saida'; SAIDA.mkdir(exist_ok=True)
REF = os.environ.get('RACHA_REF')

# o laboratório: partidas de verdade (os bots pensam), com o quadro parado e o sorteio fixo
LAB = r"""(() => {
  const L = {rnd0:Math.random};
  L.semente = s => { let a = s >>> 0; Math.random = function(){ a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0)/4294967296; }; };
  L.solta = () => { Math.random = L.rnd0; };
  L.comeca = (n, nivel, gente, modo) => {
    try { if (fimAberto()) fechaFim(); } catch (_) {}
    if (lobby.aberto){ lobby.aberto = false; LB.raiz.hidden = true; }
    if (lobby.tela){ try { TELAS[lobby.tela].el.hidden = true; } catch (_) {} lobby.tela = null; }
    opc.replay = false; X49.mode = modo || 'casual'; X49.jogo = 'futebol'; RQ.forcaNivel = nivel || 'dificil';
    RQ.autoH = !gente; rqComeca(n, 0); rqVsComeca(); ARB_PARADO = function(){ return true; };
    P.mx = P.my = 0; P.chutar = 0;
    return RachaBots78.estado();
  };
  L.passo = (mx, my, chute) => {
    guardaAnterior();
    if (chute && !RQ.autoH){ if (kickBall(chute)){ rqToque(P); P.chuteT = RQ.tick; rqHmChute(P, chute); } }
    physicsStep(STEP, mx || 0, my || 0);
  };
  L.poe = (q, x, y) => { q.x = q.ax = x; q.y = q.ay = y; q.vx = q.vy = 0; q.mx = q.my = 0; q.chutar = 0; if (q.b78){ q.b78.plano = null; q.b78.prox = RQ.tick; } };
  L.bola = (x, y, vx, vy) => { B.x = x; B.y = y; B.vx = vx || 0; B.vy = vy || 0; B.w = 0; B.cvT = 0; };
  // uma partida inteira: devolve o placar, o tempo, os gols contra sem ninguém do outro time e a maior bola presa
  L.inteira = (n, nivel, semente, maxS) => {
    L.semente(semente); L.comeca(n, nivel, false);
    const M = {gols:[], contraTolo:0, presoMax:0, ticks:0}; let preso = 0, est = RQ.estado;
    const rr = RQ.geo.rr;
    try {
      for (let i = 0; i < maxS*60; i++){
        L.passo(); M.ticks++;
        if (RQ.estado === 'jogo'){
          let a = 0, b = 0; if (Math.hypot(B.vx, B.vy) < U(3)) for (const q of RQ.jog) if (Math.hypot(q.x - B.x, q.y - B.y) < rr*1.7){ if (q.time) b++; else a++; }
          preso = a && b ? preso + 1 : 0; M.presoMax = Math.max(M.presoMax, preso);
        }
        if (RQ.estado === 'gol' && est !== 'gol'){
          const e = RQ.ev, h = RQ.toques, t = e.gol;
          let doTime = false; for (let k = h.length - 1; k >= 0 && RQ.tick - h[k].tick < 150; k--) if (h[k].p.time === t){ doTime = true; break; }
          if (e.contra && !doTime) M.contraTolo++;
          M.gols.push([t, e.contra ? 'contra' : 'gol']);
        }
        est = RQ.estado;
        if (RQ.estado === 'fim') break;
      }
    } finally { L.solta(); }
    M.placar = RQ.placar.slice(); M.fim = RQ.estado === 'fim'; M.s = Math.round(RQ.t);
    return M;
  };
  window.__V78 = L; return true;
})()"""

# nada em cima da cabeça: uma etiqueta na fila (a de sempre: FINTA!) e o quadro não desenha nada; o balão "digitando" da sala continua
TAGS = r"""(() => {
  const L = __V78; L.comeca(2, 'dificil', true);
  const q = RQ.bots[0], c = document.createElement('canvas'); c.width = MW; c.height = MH; const g = c.getContext('2d');
  const tinta = () => { const d = g.getImageData(Math.max(0, Math.round(q.x) - 160), Math.max(0, Math.round(q.y) - 170), 320, 170).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i]) n++; return n; };
  RQ_HM.tags.push({q, txt:'FINTA!', t:RQ.tick}); RQ_HM.tags.push({q, txt:'DOUBLE SHOT!', t:RQ.tick}); gnFez(q, 'drible');
  const antes = RQ_HM.tags.length; rqHmDesenhaTags(g); const semNada = tinta(), depois = RQ_HM.tags.length;
  // o balão "digitando" (sala online) continua: ele não é um nome de jogada
  const net0 = NET49.playing; q.netId = 'teste78'; CB.dig.set('teste78', performance.now() + 5000); NET49.playing = true;
  let balao = 0; try { rqHmDesenhaTags(g); balao = tinta(); } finally { NET49.playing = net0; CB.dig.delete('teste78'); q.netId = undefined; }
  // e numa partida inteira de 4v4 (30 s, com os bots jogando de verdade) nenhuma etiqueta fica na fila
  L.semente(7); L.comeca(4, 'dificil', false); let max = 0;
  try { for (let i = 0; i < 1800; i++){ L.passo(); rqHmDesenhaTags(g); max = Math.max(max, RQ_HM.tags.length); } } finally { L.solta(); }
  return {antes, depois, semNada, balao, max};
})()"""

BOTS = r"""((n, nivel) => {
  const E = __V78.comeca(n, nivel, true), J = Object.keys(RachaBots78.jeitos);
  const porTime = [0, 1].map(t => E.jogadores.filter(j => j.time === t && !j.humano));
  const nv = RQ.jog.filter(q => q !== P && q.b78).map(q => [q.time, q.b78.nv]);
  return {on:E.on, jeitos:porTime.map(L => L.map(j => j.jeito)), validos:E.jogadores.filter(j => !j.humano).every(j => J.indexOf(j.jeito) >= 0),
    goleiros:[0, 1].map(t => E.jogadores.filter(j => j.time === t && j.goleiro).map(j => j.jeito)), nv, nivel:RQ.nivel, papelGk:RQ.jog.filter(q => q.papel === 'gk').length};
})"""

ESCALACAO = r"""(() => {
  const L = __V78; L.semente(3); L.comeca(2, 'facil', true); const vistos = [];
  try { for (let i = 0; i < 60*6; i++){ L.passo(); if (RQ.aviso.t > 0 && vistos[vistos.length - 1] !== RQ.aviso.txt) vistos.push(RQ.aviso.txt); } } finally { L.solta(); }
  const deles = RQ.jog.filter(q => q.time === 1).map(q => q.b78.J.nome.toUpperCase()), meu = RQ.jog.filter(q => q.time === 0 && q !== P).map(q => q.b78.J.nome.toUpperCase());
  return {vistos, deles, meu};
})()"""

# a apresentação dos times (a da LIGA): o jeito de cada bot e o nível em que ele joga de verdade
APRESENTA = r"""(() => {
  const L = __V78; L.comeca(2, 'facil', true); rqVsAbre();
  const lado = id => Array.from(document.querySelectorAll(id + ' li')).map(li => [li.classList.contains('eu'), (li.querySelector('small') || {}).textContent || '']);
  const r = {meu:lado('#vs-v'), deles:lado('#vs-a'), jeitos:RQ.jog.filter(q => q !== P).map(q => [q.time, q.b78.J.nome.toUpperCase(), q.b78.nv])};
  rqVsFecha(); return r;
})()"""

# o mesmo corpo: velocidade e chutes de 45 s de 4v4 com os bots jogando
CORPO = r"""(() => {
  const L = __V78; L.semente(11); L.comeca(4, 'dificil', false);
  let vmax = 0, forcas = {}, longe = 0, chutes = 0; const ant = rqChuta, pre = rqPre;
  rqChuta = function(q, f){ const d = Math.hypot(B.x - q.x, B.y - q.y), r = ant.apply(this, arguments); if (r){ chutes++; forcas[f] = (forcas[f] || 0) + 1; if (d > ALCANCE_CHUTE + .01) longe++; } return r; };
  rqPre = function(){ const r = pre.apply(this, arguments); for (const q of RQ.bots) vmax = Math.max(vmax, Math.hypot(q.vx, q.vy)); return r; };   // (a velocidade que o analógico do bot dá; trombadas e boladas empurram todo mundo igual, como você)
  try { for (let i = 0; i < 2700; i++) L.passo(); } finally { rqChuta = ant; rqPre = pre; L.solta(); }
  return {vmax:+vmax.toFixed(3), vjog:+VEL_JOG.toFixed(3), forcas, longe, chutes, kick:FORCA_KICK, power:FORCA_POWER, vel:[RQ_NIVEIS.facil.vel, RQ_NIVEIS.dificil.vel]};
})()"""

# com você na bola o companheiro não toma ela de você
NAO_ROUBA = r"""(() => {
  const L = __V78; L.semente(5); L.comeca(2, 'dificil', true);
  const amigo = RQ.jog.find(q => q.time === 0 && q !== P), rr = RQ.geo.rr;
  for (const q of RQ.jog.filter(o => o.time === 1)) L.poe(q, LX1 - rr*2, q.k ? LY1 - rr*2 : LY0 + rr*2);   // os de lá longe, no fundo
  L.poe(P, CX - rr*9, CY); L.poe(amigo, CX - rr*8.2, CY + rr*2.4); L.bola(P.x + rr + 1, P.y);
  RQ.estado = 'jogo'; RQ.toques.length = 0;
  let toques = 0, ult = null, papeis = {};
  for (let i = 0; i < 100; i++){
    L.passo(1, 0);
    const u = RQ.toques[RQ.toques.length - 1]; if (u && u !== ult){ ult = u; if (u.p === amigo) toques++; }
    papeis[amigo.b78.papel] = (papeis[amigo.b78.papel] || 0) + 1;
  }
  return {toques, papeis, comVoce:Math.hypot(B.x - P.x, B.y - P.y) < rr*2.5};
})()"""

# você livre na frente: o companheiro (o Garçom) toca para você
PASSA = r"""((semente) => {
  const L = __V78; L.semente(semente); L.comeca(2, 'dificil', true);
  const amigo = RQ.jog.find(q => q.time === 0 && q !== P), rr = RQ.geo.rr;
  amigo.b78.jeito = 'garcom'; amigo.b78.J = RachaBots78.jeitos.garcom;
  for (const q of RQ.jog.filter(o => o.time === 1)) L.poe(q, LX0 + rr*2.5, q.k ? CY + rr*6 : CY - rr*6);   // os de lá voltando, atrás
  L.poe(amigo, CX - rr*3, CY + rr*4); L.poe(P, CX + rr*6, CY - rr*3); L.bola(amigo.x + rr + 1, amigo.y);
  RQ.estado = 'jogo'; RQ.toques.length = 0; const p0 = B78.dbg.passesVoce;
  let recebeu = false;
  for (let i = 0; i < 240; i++){ L.passo(); const u = RQ.toques[RQ.toques.length - 1]; if (u && u.p === P){ recebeu = true; break; } }
  L.solta();
  return {passou:B78.dbg.passesVoce - p0, recebeu};
})"""

SAIDA_JS = r"""(() => {
  const L = __V78, out = {};
  L.semente(9); L.comeca(2, 'dificil', true); rqSaida(1);                      // a saída do time de lá (bots)
  let t = 0; for (; t < 300 && RQ.estado === 'saida'; t++) L.passo(); out.bots = t;
  L.comeca(2, 'dificil', true); rqSaida(0);                                   // a sua: você parado
  t = 0; for (; t < 600 && RQ.estado === 'saida'; t++) L.passo(); out.sua = t;
  const u = RQ.toques[RQ.toques.length - 1]; out.quem = u ? (u.p === P ? 'voce' : u.p.time === 0 ? 'companheiro' : 'adversario') : null;
  L.solta(); return out;
})()"""

FESTA = r"""(() => {
  const L = __V78; L.semente(13); L.comeca(2, 'dificil', true);
  const autor = RQ.jog.find(q => q.time === 1), outro = RQ.jog.find(q => q.time === 1 && q !== autor), meu = RQ.jog.find(q => q.time === 0 && q !== P), rr = RQ.geo.rr;
  RQ.estado = 'jogo'; L.poe(autor, LX0 + rr*4, CY - rr*2); L.bola(LX0 + B.r*2, CY, -U(20), 0); RQ.toques.length = 0; rqToque(autor); RQ.ultPor[1] = {p:autor, tick:RQ.tick};
  RQ.chuteDe = {x:B.x + U(6), y:CY, time:1, p:autor, tick:RQ.tick, forte:true, alvo:true};   // (como um chute dele que ia no gol)
  let t = 0; for (; t < 120 && RQ.estado !== 'gol'; t++) L.passo();
  const gol = RQ.estado === 'gol', a0 = {x:autor.x, y:autor.y};
  let paradoMeu = 0, n = 0;
  for (let i = 0; i < 70 && RQ.estado === 'gol'; i++){ L.passo(); n++; if (!meu.mx && !meu.my) paradoMeu++; }
  const f = autor.b78.festa, d0 = f ? Math.hypot(f.x - a0.x, f.y - a0.y) : null, d1 = f ? Math.hypot(f.x - autor.x, f.y - autor.y) : null;
  L.solta();
  return {gol, autorGol:RQ.golAutor === autor, festa:!!f, d0:d0 && Math.round(d0), d1:d1 && Math.round(d1), paradoMeu, n, outroAnda:Math.hypot(outro.vx, outro.vy) > 0 || n > 0};
})()"""

TERMO = r"""(() => {
  const L = __V78; L.comeca(2, 'dificil', true); const out = {};
  const bot = RQ.jog.find(q => q.time === 1), base = b78Nv(bot).reacao.slice();
  for (const [p, nome] of [[[0, 0], 'igual'], [[0, 1], 'deles+1'], [[0, 2], 'deles+2'], [[0, 3], 'deles+3'], [[2, 0], 'seu+2']]){ RQ.placar = p.slice(); b78Termometro(); out[nome] = [B78.times[1].termo, b78Nv(bot).reacao[0]]; }
  out.meu = B78.times[0].termo;
  L.comeca(2, 'dificil', true, 'ranked'); RQ.placar = [0, 2]; b78Termometro(); out.liga = B78.times[1].termo;
  X49.mode = 'casual'; out.base = base;
  return out;
})()"""

# o perfil: injeta números de verdade e mede a VISÃO GERAL
DADOS = r"""(() => {
  perfil.est = {'casual|futebol':{p:6, c:5, v:4, d:1, a:1, m:9, pt:9, as:3, ss:2, t:3725}, 'liga|futebol':{p:2, c:2, v:1, d:1, m:2, pt:2, as:1, t:600}};   // (o mesmo jogo de números do teste da v77)
  X49.bestSeq = 3; perfilSalvar();
  abrirLobby(); abreTela('perfil'); v77PfParte('geral'); renderPerfil(); return true;
})()"""
PERFIL = r"""(() => {
  const g = V77T.pf && V77T.pf.geral, vis = e => !!e && !e.hidden && getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().width > 2;
  const tiles = g ? [...g.querySelectorAll('.v78-pf-num4 .pf-st')].map(s => [s.querySelector('small').textContent, s.querySelector('b').textContent, s.querySelector('small').scrollWidth <= s.querySelector('small').clientWidth + 1]) : [];
  const abas = [...document.querySelectorAll('.v77-pf-aba span')].map(s => [s.textContent, s.scrollWidth <= s.clientWidth + 1]);
  const painel = V77T.pf && V77T.pf.painel, partes = [...painel.querySelectorAll('.v77-pf-parte')].filter(vis);
  return {tiles, frase:(V78P.frase || {}).textContent, xp:($('pf-xp-tx') || {}).textContent, bio:(g.querySelector('.v78-pf-bio .v77-pf-card-cab small') || {}).textContent,
    escondidos:[...g.querySelectorAll('.v77-pf-tempo, .v77-pf-seq, .v77-pf-nums')].every(e => !vis(e)), aprov:vis($('st-aprov')), abas,
    rola:partes.some(e => e.scrollHeight > e.clientHeight + 1) || painel.scrollHeight > painel.clientHeight + 1, R:V78P.R, palco:[PF.palcoBox.clientWidth, PF.palcoBox.clientHeight],
    erro:window.RUA_PERFIL78_ERRO || null};
})()"""

LOBBY = r"""(() => {
  const c = LB.brilho.getBoundingClientRect(), k = c.width/EMB.w, cx = c.x + EMB.w/2*k, cy = c.y + EMB.oy*k, R = EMB.R*V77L.esc*k;
  const l = document.querySelector('#lb .v77-letreiro'), lr = l && l.offsetParent ? l.getBoundingClientRect() : null;
  const bate = r => { const x = Math.max(r.left, Math.min(cx, r.right)), y = Math.max(r.top, Math.min(cy, r.bottom)); return Math.hypot(x - cx, y - cy) < R - 2; };
  const caixas = [LB.jogar, LB.modo, LB.missoes, ...document.querySelectorAll('#rx .v71-tile')].filter(e => e && e.offsetParent).map(e => e.getBoundingClientRect());
  return {esc:V77L.esc, R:Math.round(R), topo:Math.round(cy - R), letreiroBase:lr ? Math.round(lr.bottom) : null, bate:caixas.some(bate), retrato:LB.raiz.classList.contains('retrato'), dentro:cy + R <= innerHeight && cx - R >= 0 && cx + R <= innerWidth};
})()"""

async def principal():
    P = Placar('v78 · nada em cima da cabeça, os bots novos, o perfil mais claro e a tampinha maior no lobby')
    html = (RAIZ / 'app' / 'public' / 'game' / 'racha.html').read_text(encoding='utf-8')
    P.confere('window.RachaBots78 = {' in html and 'function v78PfMonta()' in html and '<link rel="stylesheet" href="./v78.css">' in html and (RAIZ / 'app' / 'public' / 'game' / 'v78.css').exists(),
              'os bots novos (tools/v78/bots.js), o perfil (tools/v78/perfil.js) e o v78.css vão no jogo pelo build')
    async with async_playwright() as pw:
        b, pg, erros = await abre(pw, 1280, 720)
        await rt(pg, LAB)
        # ---------------------------------------------------------------- em cima da cabeça
        r = await rt(pg, TAGS)
        P.confere(r['antes'] >= 3 and r['depois'] == 0 and r['semNada'] == 0, 'nenhum nome de jogada em cima da cabeça: com FINTA!, DOUBLE SHOT! e DRIBLE! na fila, o quadro não desenha nada (e a fila esvazia)', r)
        P.confere(r['balao'] > 200, 'o balão "digitando" da sala online continua (ele não é nome de jogada)', r)
        P.confere(r['max'] == 0, '30 s de 4v4 com os bots jogando: nenhuma etiqueta de jogada', r)
        # ---------------------------------------------------------------- os bots: a cabeça nova, os jeitos, o goleiro-linha e o nível
        for n, nv in [(1, 'dificil'), (2, 'facil'), (3, 'dificil'), (4, 'facil')]:
            r = await rt(pg, BOTS + '(%d, %s)' % (n, json.dumps(nv)))
            ok = r['on'] and r['validos'] and all(len(set(j)) == len(j) for j in r['jeitos'])
            if n >= 3: ok = ok and r['goleiros'] == [['paredao'], ['paredao']] and r['papelGk'] == 2
            else: ok = ok and r['goleiros'] == [[], []] and r['papelGk'] == 0
            ok = ok and all(v == 'dificil' for t, v in r['nv'] if t == 0) and all(v == nv for t, v in r['nv'] if t == 1)
            P.confere(ok, '%dv%d (%s): a cabeça nova ligada, um jeito para cada bot sem repetir no time%s; os seus companheiros no nível bom e os de lá no escolhido'
                      % (n, n, nv, ', um goleiro-linha (o Paredão) em cada time' if n >= 3 else ''), r)
        r = await rt(pg, ESCALACAO)
        txt = [v for v in r['vistos'] if v.startswith('COM VOCÊ:')]
        P.confere(bool(txt) and all(j in txt[0] for j in r['deles']) and all(j in txt[0] for j in r['meu']) and ' · CONTRA: ' in txt[0],
                  'a escalação na faixa de cima, depois do sorteio: "COM VOCÊ: … · CONTRA: …" com o jeito de cada bot', r)
        r = await rt(pg, APRESENTA)
        bots_meu = [s for eu, s in r['meu'] if not eu]
        todos = bots_meu + [s for eu, s in r['deles']]      # v79: o nível dos bots não aparece mais na partida (o pedido: sem "Bot Fácil/Difícil")
        P.confere(len(bots_meu) == 1 and len(r['deles']) == 2 and all(s.startswith('BOT · ') and 'FÁCIL' not in s and 'DIFÍCIL' not in s for s in todos)
                  and all(any(s.endswith(j) for s in todos) for t, j, nv in r['jeitos']) and [nv for t, j, nv in r['jeitos'] if t == 0] == ['dificil'],
                  'na apresentação dos times: o jeito de cada bot (v79: sem o nível escrito; o seu companheiro continua jogando no Difícil)', r)
        # ---------------------------------------------------------------- o mesmo corpo
        r = await rt(pg, CORPO)
        P.confere(r['vmax'] <= r['vjog']*1.001 and r['vel'] == [1, 1] and r['longe'] == 0 and set(float(k) for k in r['forcas']) <= {float(r['kick']), float(r['power'])} and r['chutes'] > 10,
                  'o mesmo corpo de todo mundo: em 45 s de 4v4 nenhum bot passa da velocidade do jogador e todo chute é PASSE ou CHUTE com a bola no alcance', r)
        # ---------------------------------------------------------------- jogar com você
        r = await rt(pg, NAO_ROUBA)
        P.confere(r['toques'] == 0 and r['comVoce'] and not r['papeis'].get('bola'), 'com você levando a bola, o companheiro não toma ela de você (abre para receber)', r)
        passes = [await rt(pg, PASSA + '(%d)' % s) for s in (21, 22, 23)]
        P.confere(sum(1 for x in passes if x['passou'] >= 1 and x['recebeu']) >= 2, 'com você livre na frente, o companheiro toca para você (em 2 de 3 lances sorteados, ou mais)', passes)
        r = await rt(pg, SAIDA_JS)
        P.confere(r['bots'] < 150 and 300 <= r['sua'] < 600 and r['quem'] == 'companheiro', 'a saída: o bot dá a dele em menos de 2,5 s; na sua, ele espera você (5 s) e então um companheiro dá', r)
        r = await rt(pg, FESTA)
        P.confere(r['gol'] and r['autorGol'] and r['festa'] and r['d1'] < r['d0'] and r['paradoMeu'] >= r['n'] - 1, 'o gol do bot: quem fez corre para a bandeirinha e quem levou fica parado', r)
        r = await rt(pg, TERMO)
        P.confere(r['igual'][0] == 1 and r['deles+1'][0] > 1 and r['deles+2'][0] > r['deles+1'][0] and r['deles+3'][0] > r['deles+2'][0] and r['seu+2'][0] < 1
                  and r['deles+2'][1] > r['base'][0] and r['seu+2'][1] < r['base'][0] and r['meu'] == 1 and r['liga'] == 1,
                  'o placar mexe no jogo (só na casual, só nos bots contra você): quem abre vantagem relaxa (reage mais devagar), quem perde de 2 aperta; na liga não', r)
        # ---------------------------------------------------------------- partidas inteiras
        jogos = []
        for (n, nv, s) in [(1, 'facil', 101), (2, 'dificil', 102), (2, 'facil', 103), (3, 'dificil', 104), (3, 'facil', 105), (4, 'dificil', 106)]:
            m = await rt(pg, "__V78.inteira(%d, %s, %d, 480)" % (n, json.dumps(nv), s))
            m['n'] = n; m['nivel'] = nv; jogos.append(m)
            print('    %dv%d %-7s placar %s em %3d s · gols %s · presa no máximo %.1f s' % (n, n, nv, m['placar'], m['s'], m['gols'], m['presoMax']/60))
        P.confere(all(m['fim'] for m in jogos), 'partidas inteiras com o sorteio fixo (1v1 a 4v4): todas acabam (alguém chega a 3) em até 8 min de jogo', [(m['n'], m['placar'], m['s']) for m in jogos])
        P.confere(max(m['presoMax'] for m in jogos) < 6*60 and sum(m['contraTolo'] for m in jogos) <= 2,
                  'nenhuma bola presa por mais de 6 s; gol contra sem ninguém do outro time por perto: no máximo 2 em 6 partidas', [(m['presoMax'], m['contraTolo']) for m in jogos])
        custo = await rt(pg, r"""(() => { const L = __V78; L.semente(31); L.comeca(4, 'dificil', false); const t0 = performance.now(); try { for (let i = 0; i < 3000; i++) L.passo(); } finally { L.solta(); } const novo = (performance.now() - t0)/3000;
          B78.on = false; L.semente(31); L.comeca(4, 'dificil', false); const t1 = performance.now(); try { for (let i = 0; i < 3000; i++) L.passo(); } finally { L.solta(); B78.on = true; } return {novo:+novo.toFixed(3), antigo:+((performance.now() - t1)/3000).toFixed(3)}; })()""")
        print('    custo por passo da física (4v4, com os bots pensando): novo %.3f ms · antigo %.3f ms' % (custo['novo'], custo['antigo']))
        P.confere(custo['novo'] < 1.5, 'o custo por quadro dos bots novos no 4v4 (menos de 1,5 ms por passo neste computador)', custo)
        P.confere(not [e for e in erros if 'Failed to load' not in e], 'nenhum erro de JavaScript nas partidas', erros[:3])
        await b.close()
        # ---------------------------------------------------------------- o perfil
        R77 = lambda w, h: min(w*.3, h*.25, 150)
        for (w, h, d) in [(844, 390, 2.185), (1280, 720, 1), (1024, 768, 1), (1920, 888, 1)]:
            nome = '%dx%d' % (w, h)
            b, pg, erros = await abre(pw, w, h, dsf=d)
            await rt(pg, DADOS); await pg.wait_for_timeout(600)
            r = await rt(pg, PERFIL)
            await pg.screenshot(path=str(SAIDA / ('v78_perfil_%s.png' % nome)))
            if (w, h) == (844, 390):
                P.confere([t[0] for t in r['tiles']] == ['PARTIDAS', 'VITÓRIAS', 'GOLS', 'ASSISTÊNCIAS'] and [t[1] for t in r['tiles']] == ['7', '5', '11', '4'],
                          'PERFIL › VISÃO GERAL: 4 números grandes com o nome inteiro (PARTIDAS, VITÓRIAS, GOLS, ASSISTÊNCIAS) e os números de verdade', r['tiles'])
                P.confere(r['frase'] == 'Você ganhou 5 de 7 partidas (71%) e fez 11 gols. Melhor sequência: 3 vitórias seguidas.', 'uma frase que explica: "Você ganhou 5 de 7 partidas (71%) e fez 11 gols…"', r['frase'])
                P.confere(r['xp'] == 'NÍVEL 1 · FALTAM 100 XP PARA O 2' and r['bio'] == 'SUA BIO' and r['escondidos'] and not r['aprov'],
                          'o nível por extenso (NÍVEL 1 · FALTAM 100 XP PARA O 2), a SUA BIO inteira; o tempo, a sequência, o aproveitamento e os 5 números pequenos saíram da visão geral', r)
            P.confere(all(t[2] for t in r['tiles']) and all(a[1] for a in r['abas']) and not r['rola'] and not r['erro'],
                      '%s: nenhum nome cortado (nem os 4 números nem as abas) e nada rola' % nome, {'abas':r['abas'], 'rola':r['rola'], 'erro':r['erro']})
            pw0, ph0 = r['palco']
            P.confere(r['R'] and r['R'] >= R77(pw0, ph0)*1.35, '%s: a tampinha do perfil maior (raio %.0f; era %.0f)' % (nome, r['R'] or 0, R77(pw0, ph0)), r['palco'])
            await b.close()
        # o jogador novo: o convite para jogar
        b, pg, erros = await abre(pw, 844, 390, dsf=2.185)
        await rt(pg, "(() => { abrirLobby(); abreTela('perfil'); v77PfParte('geral'); renderPerfil(); return true; })()"); await pg.wait_for_timeout(400)
        f = await rt(pg, "V78P.frase.textContent")
        P.confere(f.startswith('Você ainda não jogou. Toque em JOGAR'), 'sem partidas, a frase convida: "Você ainda não jogou. Toque em JOGAR…"', f)
        await b.close()
        # ---------------------------------------------------------------- o lobby: a tampinha maior
        for (w, h, d) in [(1280, 720, 1), (1920, 888, 1), (844, 390, 2), (667, 375, 2), (700, 900, 1)]:
            nome = '%dx%d' % (w, h)
            b, pg, erros = await abre(pw, w, h, dsf=d)
            await rt(pg, "abrirLobby(); true"); await pg.wait_for_timeout(600)
            r = await rt(pg, LOBBY)
            await pg.screenshot(path=str(SAIDA / ('v78_lobby_%s.png' % nome)))
            ok = r['esc'] == 1.15 and not r['bate'] and r['dentro'] and (r['retrato'] or (r['letreiroBase'] is not None and r['topo'] >= r['letreiroBase'] - 6))
            P.confere(ok, '%s: a tampinha do lobby 1,4× maior (raio %d), sem encostar no letreiro nem nos botões' % (nome, r['R']), r)
            await b.close()
        # ---------------------------------------------------------------- na partida, o tamanho de sempre
        b, pg, erros = await abre(pw, 1280, 720)
        await rt(pg, LAB)
        r = await rt(pg, "(() => { __V78.comeca(2, 'dificil', true); return {R:R_JOG, rs:RQ.jog.map(q => q.r), esc:V77L.esc}; })()")
        ref = None
        if REF:
            b2, pg2, _ = await abre(pw, 1280, 720, pagina=pathlib.Path(REF))
            ref = await rt(pg2, "R_JOG"); await b2.close()
        P.confere(all(x == r['R'] for x in r['rs']) and abs(r['R'] - 1.8*19) < 1e-9,
                  'na partida a tampinha tem o tamanho da física (v85, FR-85: raio 1,8 u = 34,2 px; todo mundo igual)', {'agora':r, 'v71.1':ref})
        await b.close()
    return P.fim()

roda(principal())
