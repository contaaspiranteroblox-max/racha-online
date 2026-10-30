/* =====================================================================================================================
   RACHÃO · O QUADRO DA PARTIDA ONLINE (app/public/game/rachao/quadro.js · RACHA v98)
   O pedido: "da pra criar sala de rachão também on-line". Nas salas online do Rachão quem joga a partida é o SERVIDOR
   das salas, com o motor do Rachão (o mesmo código da página: server/partida/rachao_motor.js é gerado dela). Este arquivo
   é a língua que os dois falam, e é o MESMO nas duas pontas (a página carrega ./quadro.js; o servidor recebe uma cópia
   colada no motor gerado):
     · o COMANDO de quem joga (aparelho → servidor): a direção, os botões segurados e os contadores dos toques (cavadinha,
       curvas, poder, chute e super chute rápidos) — um toque nunca se perde, mesmo se um comando se perder no caminho;
     · o QUADRO (servidor → aparelhos, 30 por segundo): o estado inteiro da partida que importa para desenhar e para a
       previsão do aparelho (as tampinhas, as bolas, a fase, o relógio, o placar, o vento, a muralha, o golzão, a faixa
       do GOL!) e os eventos desde o quadro anterior (os sons, os confetes, os poderes);
     · o APLICA: o aparelho põe o quadro dentro de uma partida do próprio motor (para desenhar com o desenho do Rachão e
       prever a sua tampinha e a bola com a mesma física do servidor).
   Só números e textos curtos: nada de código, nada de HTML (os nomes vêm da sala; os textos da faixa saem do motor).
   ===================================================================================================================== */
(function (raiz, fabrica) {
  'use strict';
  const Q = fabrica();
  if (typeof module === 'object' && module.exports) module.exports = Q;
  if (raiz) raiz.RachaoQuadro = Q;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null), function () {
  'use strict';
  const VERSAO = 1;
  const FASES = ['kickoff', 'play', 'goal', 'end'];
  const EFEITOS = ['turbo', 'canhao', 'gigante', 'nanico', 'sabao', 'frozen'];
  const PODERES = ['turbo', 'canhao', 'gigante', 'nanico', 'muralha', 'ventania', 'multibola', 'golzao', 'sabao', 'congelou'];   // (a ordem do POWERS do motor)
  const MAX_BOLAS = 8, MAX_EVENTOS = 48, MAX_TEXTO = 60;
  const n2 = v => Math.round(v * 100) / 100, n3 = v => Math.round(v * 1000) / 1000, n4 = v => Math.round(v * 10000) / 10000;
  const fin = (v, d) => typeof v === 'number' && Number.isFinite(v) ? v : d;
  const lim = (v, a, b, d) => { v = fin(v, d); return v < a ? a : v > b ? b : v; };   // (só número de verdade: texto ou objeto vira o padrão)
  const lista = v => Array.isArray(v) ? v : null;
  const cont = v => Number.isInteger(v) && v >= 0 && v < 2e9 ? v : 0;
  const txt = v => typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2066-\u2069\ufeff]/g, ' ').slice(0, MAX_TEXTO) : '';

  /* ---------------------------------------------------------------- o comando (aparelho → servidor)
     {seq, x, y, f, kn, lb, cl, cr, pw, st}: x, y = a direção NO CAMPO (−1 a 1; o aparelho já desvirou a tela em pé);
     f = os botões segurados (1 chutar, 2 correr, 4 super chute); os contadores só sobem: kn = toque rápido no chutar,
     st = toque rápido no super, lb = cavadinha, cl/cr = curva para a esquerda/direita, pw = usar o poder. */
  const CONTADORES = ['kn', 'st', 'lb', 'cl', 'cr', 'pw'];
  function comando(m) {
    if (!m || typeof m !== 'object') return null;
    const seq = m.seq;
    if (!Number.isInteger(seq) || seq < 0 || seq >= 2e9) return null;
    const c = { seq, x: n3(lim(m.x, -1, 1, 0)), y: n3(lim(m.y, -1, 1, 0)), f: Number.isInteger(m.f) ? m.f & 7 : 0 };
    const h = Math.hypot(c.x, c.y); if (h > 1) { c.x = n3(c.x / h); c.y = n3(c.y / h); }
    for (const k of CONTADORES) c[k] = cont(m[k]);
    return c;
  }

  /* ---------------------------------------------------------------- o quadro (servidor → aparelhos) */
  const bits = p => (p.armed ? 1 : 0) | (p.kickHeld ? 2 : 0) | (p.superHeld ? 4 : 0) | (p.sprinting ? 8 : 0) | (p.exhausted ? 16 : 0)
    | (p.lobArm ? 32 : 0) | (p.diveMode ? 64 : 0) | (p.human ? 0 : 128) | (p.input.kick ? 256 : 0) | (p.input.sprint ? 512 : 0) | (p.input.superKick ? 1024 : 0);
  function jogador(T, p) {
    const d = p.disc, inp = p.input;
    const a = [n2(d.x), n2(d.y), n3(d.vx), n3(d.vy), n2(d.r), bits(p), n3(p.stamina), n3(p.superCharge), p.superBuf | 0, n3(p.superPow || 0), p.kickFlash | 0, p.dashCool | 0,
      p.lastKickT === undefined ? 99 : Math.min(99, T.tick - p.lastKickT), n3(fin(inp.mx, 0)), n3(fin(inp.my, 0)), p.curveArm | 0, n2(fin(p.aimX, 0)), n2(fin(p.aimY, 0)),
      p.power ? PODERES.indexOf(p.power) : -1, p.powerTimer | 0, p.goals | 0, p.assists | 0];
    if (T.mode === 'chaos') a.push(EFEITOS.map(k => p.fx[k] | 0));
    return a;
  }
  const bola = b => [n2(b.x), n2(b.y), n3(b.vx), n3(b.vy), n2(b.z), n3(b.vz), n4(b.spin || 0), b.fire | 0, b.extra ? Math.max(1, b.life | 0) : 0];
  // o estado da partida agora (acks: o último comando de cada um que o servidor já usou; ev: os eventos desde o anterior)
  function quadro(T, acks, ev) {
    const d = { v: VERSAO, t: T.tick, f: Math.max(0, FASES.indexOf(T.phase)), p: T.phaseT | 0, tm: n3(T.time), s: [T.score[0] | 0, T.score[1] | 0],
      o: T.overtime ? 1 : 0, e: T.endPending ? 1 : 0, w: T.winner | 0, k: T.kickoffTeam | 0, g: [n2(T.goalHalf[0]), n2(T.goalHalf[1])], z: [T.golzao[0] | 0, T.golzao[1] | 0],
      m: [T.muralha[0] ? T.muralha[0].t | 0 : 0, T.muralha[1] ? T.muralha[1].t | 0 : 0],
      j: T.players.map(p => jogador(T, p)), b: T.balls.slice(0, MAX_BOLAS).map(bola), a: acks || [] };
    if (T.map.wind) { const w = T.wind; d.vt = [n4(w.x), n4(w.y), fin(w.dx, 0), fin(w.dy, 0), w.t | 0]; }
    if (T.windFx) d.vf = [T.windFx.dir, T.windFx.t | 0, T.windFx.team | 0];
    if (T.banner) { const B = T.banner; d.bn = [txt(B.text), txt(B.sub), B.t | 0, B.max | 0, B.color === 0 || B.color === 1 ? B.color : -1]; }
    if (ev && ev.length) d.ev = ev.slice(-MAX_EVENTOS);
    return d;
  }
  // um evento do motor → o que vai na rede (null = não vai: os do treino, dos pênaltis…)
  function evento(T, e) {
    const i = q => q ? T.players.indexOf(q) : -1;
    switch (e.t) {
      case 'kick': return ['k', i(e.p), n2(e.power), n2(e.x), n2(e.y), (e.header ? 1 : 0) | (e.lob ? 2 : 0) | (e.canhao ? 4 : 0) | (e.superKick ? 8 : 0)];
      case 'touch': return ['t', n2(e.imp)];
      case 'post': return ['po', n2(e.imp), n2(e.x), n2(e.y), e.bar ? 1 : 0];
      case 'net': return ['n', n2(e.imp)];
      case 'wall': return ['wa', n2(e.imp)];
      case 'bounce': return ['bo', n2(e.imp)];
      case 'bumper': return ['bu', n2(e.imp), n2(e.x), n2(e.y)];
      case 'whistle': return ['wh', e.long ? 1 : 0, e.end ? 1 : 0];
      case 'goal': return ['g', e.team | 0, i(e.scorer), e.own ? 1 : 0, i(e.assist), e.extra ? 1 : 0, e.minor ? 1 : 0];
      case 'power': return ['pw', i(e.p), PODERES.indexOf(e.id)];
      case 'gotPower': return ['gp', i(e.p), PODERES.indexOf(e.id)];
      case 'arm': return ['ar', i(e.p)];
      case 'dive': return ['dv', i(e.p)];
      case 'wind': return ['wi'];
      case 'pop': return ['pp'];
      case 'end': return ['en', e.winner | 0];
    }
    return null;
  }
  // os efeitos que o motor desenha (os confetes do gol, as faíscas do poder): no servidor viram eventos com o lugar
  const confete = (x, y, team) => ['fc', n2(x), n2(y), team === 1 ? 1 : 0];
  const faisca = (x, y, cor, n) => ['fb', n2(x), n2(y), /^#[0-9a-f]{6}$/i.test(cor) ? cor : '#ffffff', Math.max(1, Math.min(24, n | 0))];

  /* ---------------------------------------------------------------- o aplica (no aparelho) */
  // a muralha do poder (a mesma conta do usePower do motor): um segmento na frente do gol
  function poeMuralha(T, t, ticks, mkSeg, M_BALL) {
    tiraMuralha(T, t);
    const g = T.stadium.goals[t]; if (!g) return;
    const x = g.x - g.dir * 30, h = T.goalHalf[t] + 14;
    const seg = mkSeg(x, -h, x, h, { bounce: 0.7, mask: M_BALL, kind: 'muralha', th: 5 });
    T.dynSegs.push(seg); T.muralha[t] = { seg, t: ticks }; T.applyGeometry();
  }
  function tiraMuralha(T, t) {
    const mw = T.muralha[t]; if (!mw) return;
    const k = T.dynSegs.indexOf(mw.seg); if (k >= 0) T.dynSegs.splice(k, 1);
    T.muralha[t] = null; T.applyGeometry();
  }
  // põe o quadro d na partida T do aparelho (a mesma montagem do servidor: os mesmos jogadores, na mesma ordem)
  // o = {mkSeg, M_BALL} (do motor da página)
  function aplica(T, d, o) {                             // (o quadro fora do formato não entra: nada pela metade)
    if (!d || d.v !== VERSAO || !Array.isArray(d.j) || !Array.isArray(d.b) || !Array.isArray(d.s) || !Array.isArray(d.g) || !Array.isArray(d.z) || !Array.isArray(d.m)) return false;
    T.tick = d.t | 0; T.phase = FASES[d.f] || 'play'; T.phaseT = d.p | 0; T.time = fin(d.tm, 0);
    T.score[0] = d.s[0] | 0; T.score[1] = d.s[1] | 0; T.overtime = !!d.o; T.endPending = !!d.e; T.winner = d.w | 0; T.kickoffTeam = d.k === 1 ? 1 : 0;
    // o gol (o Golzão muda o tamanho: o estádio é refeito, como no motor) e a muralha
    const g0 = lim(d.g[0], 4, 400, T.map.goal), g1 = lim(d.g[1], 4, 400, T.map.goal);
    if (Math.abs(g0 - T.goalHalf[0]) > 1e-6 || Math.abs(g1 - T.goalHalf[1]) > 1e-6) {
      const mu = [T.muralha[0] && T.muralha[0].t, T.muralha[1] && T.muralha[1].t];
      tiraMuralha(T, 0); tiraMuralha(T, 1);
      T.goalHalf[0] = g0; T.goalHalf[1] = g1; T.buildGeometry();
      for (let t = 0; t < 2; t++) if (mu[t]) poeMuralha(T, t, mu[t], o.mkSeg, o.M_BALL);
    }
    T.golzao[0] = d.z[0] | 0; T.golzao[1] = d.z[1] | 0;
    for (let t = 0; t < 2; t++) {
      const m = d.m[t] | 0;
      if (m > 0 && !T.muralha[t]) poeMuralha(T, t, m, o.mkSeg, o.M_BALL);
      else if (m <= 0 && T.muralha[t]) tiraMuralha(T, t);
      else if (m > 0) T.muralha[t].t = m;
    }
    const vt = lista(d.vt), vf = lista(d.vf);
    if (vt && T.map.wind) { const w = T.wind; w.x = fin(vt[0], 0); w.y = fin(vt[1], 0); w.dx = fin(vt[2], 0); w.dy = fin(vt[3], 0); w.t = vt[4] | 0; }
    T.windFx = vf ? { dir: vf[0] < 0 ? -1 : 1, t: vf[1] | 0, team: vf[2] === 1 ? 1 : 0 } : null;
    if (lista(d.bn)) {                                  // (a faixa: a mesma enquanto o texto não muda; o tempo dela vem do servidor)
      const B = T.banner, cor = d.bn[4] === 0 || d.bn[4] === 1 ? d.bn[4] : null;
      if (B && B.text === txt(d.bn[0]) && B.sub === txt(d.bn[1]) && B.color === cor && B.max === (d.bn[3] | 0)) B.t = d.bn[2] | 0;
      else T.banner = { text: txt(d.bn[0]), sub: txt(d.bn[1]), t: d.bn[2] | 0, max: d.bn[3] | 0, color: cor };
    } else T.banner = null;
    const n = Math.min(T.players.length, d.j.length);
    for (let i = 0; i < n; i++) {
      const p = T.players[i], a = d.j[i]; if (!Array.isArray(a)) continue;
      const dc = p.disc, f = a[5] | 0, inp = p.input;
      dc.x = fin(a[0], dc.x); dc.y = fin(a[1], dc.y); dc.vx = fin(a[2], 0); dc.vy = fin(a[3], 0); dc.r = lim(a[4], 2, 80, dc.r);
      p.armed = !!(f & 1); p.kickHeld = !!(f & 2); p.superHeld = !!(f & 4); p.sprinting = !!(f & 8); p.exhausted = !!(f & 16); p.lobArm = !!(f & 32); p.diveMode = !!(f & 64);
      p.rcBot = !!(f & 128);
      p.stamina = lim(a[6], 0, 1, 1); p.superCharge = lim(a[7], 0, 1, 0); p.superBuf = a[8] | 0; p.superPow = lim(a[9], 0, 1, 0); p.kickFlash = a[10] | 0; p.dashCool = a[11] | 0;
      const idade = a[12] | 0; p.lastKickT = idade >= 99 ? undefined : T.tick - idade;
      inp.mx = lim(a[13], -1, 1, 0); inp.my = lim(a[14], -1, 1, 0); inp.kick = !!(f & 256); inp.sprint = !!(f & 512); inp.superKick = !!(f & 1024);
      inp.lob = inp.curveL = inp.curveR = inp.power = inp.cancel = inp.superCancel = inp.kickNew = false;
      p.curveArm = a[15] < 0 ? -1 : a[15] > 0 ? 1 : 0; p.aimX = fin(a[16], 0); p.aimY = fin(a[17], 0);
      p.power = Number.isInteger(a[18]) && a[18] >= 0 && a[18] < PODERES.length ? PODERES[a[18]] : null; p.powerTimer = a[19] | 0; p.goals = a[20] | 0; p.assists = a[21] | 0;
      if (Array.isArray(a[22])) EFEITOS.forEach((k, j) => { p.fx[k] = a[22][j] | 0; });
      else for (const k of EFEITOS) p.fx[k] = 0;
    }
    // as bolas (o Multibola põe e tira as extras)
    const nb = Math.max(1, Math.min(MAX_BOLAS, d.b.length));
    while (T.balls.length < nb) T.addBall(0, 0, true);
    while (T.balls.length > nb) T.removeBall(T.balls[T.balls.length - 1]);
    for (let i = 0; i < nb; i++) {
      const b = T.balls[i], a = d.b[i]; if (!Array.isArray(a)) continue;
      b.x = fin(a[0], 0); b.y = fin(a[1], 0); b.vx = fin(a[2], 0); b.vy = fin(a[3], 0); b.z = Math.max(0, fin(a[4], 0)); b.vz = fin(a[5], 0); b.spin = fin(a[6], 0); b.fire = a[7] | 0;
      b.extra = i > 0 && a[8] > 0; b.life = b.extra ? a[8] | 0 : 0;
    }
    return true;
  }
  // um evento da rede → o evento no formato do motor (com o jogador do aparelho), para os sons e os avisos
  function deEvento(T, a) {
    if (!Array.isArray(a) || typeof a[0] !== 'string') return null;
    const P = i => Number.isInteger(i) && i >= 0 ? T.players[i] || null : null;
    const pod = i => Number.isInteger(i) && i >= 0 && i < PODERES.length;
    switch (a[0]) {
      case 'k': return { t: 'kick', p: P(a[1]), power: fin(a[2], 5), x: fin(a[3], 0), y: fin(a[4], 0), header: !!(a[5] & 1), lob: !!(a[5] & 2), canhao: !!(a[5] & 4), superKick: !!(a[5] & 8) };
      case 't': return { t: 'touch', imp: fin(a[1], 0) };
      case 'po': return { t: 'post', imp: fin(a[1], 0), x: fin(a[2], 0), y: fin(a[3], 0), bar: !!a[4] };
      case 'n': return { t: 'net', imp: fin(a[1], 0) };
      case 'wa': return { t: 'wall', imp: fin(a[1], 0) };
      case 'bo': return { t: 'bounce', imp: fin(a[1], 0) };
      case 'bu': return { t: 'bumper', imp: fin(a[1], 0), x: fin(a[2], 0), y: fin(a[3], 0) };
      case 'wh': return { t: 'whistle', long: !!a[1], end: !!a[2] };
      case 'g': return { t: 'goal', team: a[1] === 1 ? 1 : 0, scorer: P(a[2]), own: !!a[3], assist: P(a[4]), extra: !!a[5], minor: !!a[6] };
      case 'pw': return pod(a[2]) && P(a[1]) ? { t: 'power', p: P(a[1]), id: PODERES[a[2]] } : null;
      case 'gp': return pod(a[2]) && P(a[1]) ? { t: 'gotPower', p: P(a[1]), id: PODERES[a[2]] } : null;
      case 'ar': return P(a[1]) ? { t: 'arm', p: P(a[1]) } : null;
      case 'dv': return P(a[1]) ? { t: 'dive', p: P(a[1]) } : null;
      case 'wi': return { t: 'wind' };
      case 'pp': return { t: 'pop' };
      case 'en': return { t: 'end', winner: a[1] | 0 };
      case 'fc': return { t: 'fx', confete: true, x: fin(a[1], 0), y: fin(a[2], 0), team: a[3] === 1 ? 1 : 0 };
      case 'fb': return { t: 'fx', x: fin(a[1], 0), y: fin(a[2], 0), cor: /^#[0-9a-f]{6}$/i.test(a[3]) ? a[3] : '#ffffff', n: Math.max(1, Math.min(24, a[4] | 0)) };
    }
    return null;
  }

  /* ---------------------------------------------------------------- a montagem e o passo previsto (as duas pontas) */
  // a partida da sala, montada IGUAL no servidor e em cada aparelho: o modo e as opções da sala, os jogadores na ordem dos
  // lugares (lugar s → time s ÷ n, camisa s mod n + 1). humano(s) → o controle do lugar (null = bot).
  function cria(TopMatch, mapa, opc, n, lugares, humano) {
    const T = new TopMatch({ mode: opc.modo === 'chaos' ? 'chaos' : 'match', map: mapa, teams: [0, 0], humans: [], diff: opc.nivel, time: opc.tempo, goals: opc.gols, run: opc.corrida,
      lob: opc.chutes.lob !== false, curve: opc.chutes.curve !== false, superKick: opc.chutes.superKick !== false });
    for (const s of lugares) {
      const h = humano ? humano(s) : null;
      const p = T.addPlayer(Math.floor(s / n) ? 1 : 0, { human: h || null, num: s % n + 1 });
      p.lugar = s;
    }
    T.resetPositions();
    T.events.length = 0;
    return T;
  }
  // um passo do motor no aparelho (a previsão): a física de sempre, sem a lógica da partida (os gols, o relógio do fim, os
  // poderes, os bots) — essa é do servidor e chega no quadro. eu = o jogador do aparelho (ou null) e c = o comando dele
  // neste passo ({x, y, f} e os toques que subiram: {kn, st, lb, cl, cr}); os outros andam com o último comando do quadro.
  function preve(T, eu, c) {
    T.tick++;
    if (T.banner) { T.banner.t--; if (T.banner.t <= 0) T.banner = null; }
    for (const d of T.world.discs) { d.px = d.x; d.py = d.y; d.pz = d.z; }
    if (eu && c) {
      const inp = eu.input;
      inp.mx = c.x; inp.my = c.y; inp.kick = !!(c.f & 1); inp.sprint = !!(c.f & 2); inp.superKick = !!(c.f & 4);
      if (c.kn) { inp.kickNew = true; inp.kick = true; }
      if (c.st) inp.superKick = true;
      if (c.lb) inp.lob = true;
      if (c.cl) inp.curveL = true;
      if (c.cr) inp.curveR = true;
      inp.power = false;                                   // (o poder é do servidor: ele mexe nos outros e no campo)
    }
    for (const p of T.players) T.controlPlayer(p);
    if (T.map.wind && T.wind.t <= 0) T.wind.t = 1;         // (a troca do vento é sorteada no servidor: aqui ele só sopra)
    T.applyEnvironment();
    T.world.step(true);
    for (const b of T.balls) T.integrateBall(b);          // (como no motor: a bola extra que estoura sai no meio da volta)
    for (const p of T.players) T.dampPlayer(p);
    T.world.contactsClassic();
    T.processTouches();
    if (T.phase === 'kickoff') T.kickoffBarrier();
    if (T.phase === 'play') T.time += 1 / 60;
  }

  return Object.freeze({ VERSAO, FASES, EFEITOS, PODERES, CONTADORES, MAX_BOLAS, MAX_EVENTOS, comando, quadro, evento, confete, faisca, aplica, deEvento, poeMuralha, tiraMuralha, cria, preve });
});
