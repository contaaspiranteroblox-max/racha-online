/* ======================================================================================================================
   RACHA v96 · O ONLINE COM A SENSAÇÃO DO TREINO (tools/v96/rede.js, colado depois da v95; o núcleo das correções é o
   tools/v96/liso.js — window.RachaLiso — o mesmo arquivo que os testes do Node rodam).
   O pedido: "deixar o online com a mesma sensação que no treino — online é tudo bugado, lag, parece pesado, bola e
   personagem teleportam (ou dá a sensação); as traves: quando está perto delas realmente atravessa e dá um bug de
   teleporte na trave".
   O que estava acontecendo (medido no tests/v96/rede_sim.mjs: o motor das salas de verdade + a previsão da v92, ligados por
   uma internet de mentira com o atraso do Brasil até o servidor da Virgínia, a oscilação do 4G e os apagões):
     1) A CORREÇÃO QUE PULAVA: quando a previsão errava, a diferença sumia num deslize exponencial de 90 ms, que começa na
        velocidade máxima (50 px viram 550 px/s: um pulo), e acima de 5 u (os outros), 8 u (a bola) ou 12 u (você) ia
        direto. Com ~160 ms de ida e volta, o outro jogador e a bola pulavam dezenas de vezes por minuto.
     2) A SAÍDA QUE PARECIA RECOMEÇO: a previsão passa a partida para "jogo" no seu toque da saída, antes de o servidor
        confirmar; cada quadro do servidor que ainda dizia "saída" era tratado como recomeço (o depois do gol) — e o
        recomeço põe tudo no lugar NA HORA, sem deslize. Agora o recomeço é o do SERVIDOR: o quadro anterior dele não era
        saída (o gol, a comemoração) e este é.
     3) O DESENHO DENTRO DA TRAVE: o deslize da correção era somado ao lugar do mundo sem bater em nada — a tampinha
        aparecia dentro da trave ou do outro lado da rede e voltava.
     4) (no servidor, server/partida/sala.js) OS COMANDOS JOGADOS FORA: depois de um apagão do 4G os comandos chegam todos
        juntos e o servidor descartava os que sobravam — a tampinha "voltava" no seu aparelho. Agora eles andam (a
        recuperação, N.passoSolo).
   Aqui: cada correção vira um deslize com mola crítica e teto de velocidade (RachaLiso.anda); a GUARDA (nada desenhado anda
   mais que o possível num quadro; o que sobra vira deslize) e a BATIDA (do lugar no mundo até o desenhado, batendo nas
   traves, na rede e nas paredes). Os números ficam em RachaLiso.PADRAO; o "Deslize das correções" dos Ajustes finos continua
   valendo (é o tempo da mola). A física, a previsão (o mundo, o rollback e o replay) e o servidor são os mesmos.
   ====================================================================================================================== */
const V96L = window.RachaLiso;
// (RACHA_CONFIG.rede96 = false: o online de antes — as correções da v92 — para comparar nos testes)
const V96_REDE = !(window.RACHA_CONFIG && window.RACHA_CONFIG.rede96 === false);
const V96R = { P: V96L.novo(), B: V96L.novo(), J: [], ant: null, saltoP: true, saltoB: true, saltoJ: [], ultEst: null, tDraw: 0,
  medidas: { snaps: 0, recomecos: 0, pulosP: 0, pulosB: 0, pulosJ: 0, guardas: 0, batidas: 0 }, erro: null };

function v96Zera() {
  V96L.zera(V96R.P); V96L.zera(V96R.B); V96R.J = []; V96R.ant = null; V96R.saltoP = V96R.saltoB = true; V96R.saltoJ = [];
  V96R.ultEst = null; V96R.tDraw = 0;
}
function v96Deslize(i) { return V96R.J[i] || (V96R.J[i] = V96L.novo()); }

/* ---------------------------------------------------------------- 1) o quadro do servidor (no lugar do v92SnapPrev) */
const v96SnapPrevAntes = v92SnapPrev;
v92SnapPrev = function (s, antesP, antesB, antesJ) {
  if (!V96_REDE) return v96SnapPrevAntes.apply(this, arguments);
  const M = V92N.M, eu = M.jog[V92N.slot], p = V96L.PADRAO;
  const ack = s.players[V92N.slot] ? s.players[V92N.slot][4] | 0 : 0;
  while (V92N.pend.length && V92N.pend[0].seq <= ack) { const c = V92N.pend.shift(); V92N.ackKc = c.kc | 0; V92N.ackPc = c.pc | 0; V92N.ackBh = c.bh | 0; }
  v92Base(s);
  for (const c of V92N.pend) v92PrevPasso(c, false);
  // o recomeço de verdade é o do servidor (o quadro de antes não era saída/fim e este é) — não o estado previsto
  const ant = V96R.ultEst; V96R.ultEst = s.state;
  const reinicio = ant == null || (s.state !== ant && (s.state === 'saida' || s.state === 'fim'));
  const dP = [antesP[0] - eu.x, antesP[1] - eu.y], dB = [antesB[0] - M.B.x, antesB[1] - M.B.y];
  const nP = Math.hypot(dP[0], dP[1]), nB = Math.hypot(dB[0], dB[1]);
  V92.med.corr.push(nP); if (V92.med.corr.length > 180) V92.med.corr.shift();
  V92.med.corrB = V92.med.corrB || []; V92.med.corrB.push(nB); if (V92.med.corrB.length > 180) V92.med.corrB.shift();
  V96R.medidas.snaps++;
  if (reinicio) {
    V96L.zera(V96R.P); V96L.zera(V96R.B); V96R.J.forEach(V96L.zera);
    V96R.saltoP = V96R.saltoB = true; V96R.saltoJ = M.jog.map(() => true); V96R.medidas.recomecos++;
  } else {
    if (nP < U(p.teleP)) V96L.soma(V96R.P, dP[0], dP[1]); else { V96L.zera(V96R.P); V96R.saltoP = true; V96R.medidas.pulosP++; }
    if (nB < U(p.teleB)) V96L.soma(V96R.B, dB[0], dB[1]); else { V96L.zera(V96R.B); V96R.saltoB = true; V96R.medidas.pulosB++; }
    M.jog.forEach((q, i) => {
      if (i === V92N.slot) return;
      const d = [antesJ[i][0] - q.x, antesJ[i][1] - q.y];
      if (Math.hypot(d[0], d[1]) < U(p.teleJ)) V96L.soma(v96Deslize(i), d[0], d[1]); else { V96L.zera(v96Deslize(i)); V96R.saltoJ[i] = true; V96R.medidas.pulosJ++; }
    });
  }
  V92N.ofP = [0, 0]; V92N.ofB = [0, 0]; V92N.ofJ = M.jog.map(() => [0, 0]);   // (o desenho da v92 não soma mais nada: os deslizes são estes)
  const S = V92N.serv, t = performance.now();                    // o ritmo do servidor visto daqui (passos por segundo), como na v92
  if (S.k0 < 0 || t - S.t0 > 4000) { S.k0 = s.tick; S.t0 = t; } else if (t - S.t0 > 1000) S.tps = (s.tick - S.k0) * 1000 / (t - S.t0);
  V92.med.fila = V92N.pend.length; V92.med.tps = S.tps;
};

/* ---------------------------------------------------------------- 2) o desenho (por fora do v92Mostra e da extrapolação) */
const v96MostraAntes = v92Mostra;
v92Mostra = function () {
  const r = v96MostraAntes.apply(this, arguments);
  try { v96Desenha(); } catch (e) { V96R.erro = String(e && e.stack || e); try { console.error('v96 · o desenho liso do online parou:', e); } catch (_) {} }
  return r;
};
function v96Desenha() {
  if (!V96_REDE || !v92RedeAtiva() || !V92N.M || !V92N.C) return;
  const M = V92N.M, C = V92N.C, G = M.G, p = V96L.PADRAO, eu = M.jog[V92N.slot]; if (!eu) return;
  const agora = performance.now(), dt = V96R.tDraw ? Math.min(0.1, (agora - V96R.tDraw) / 1000) : 0; V96R.tDraw = agora;
  const tau = Math.max(0.03, (V92.cfg.tauCorr || 90) / 1000);
  V96L.anda(V96R.P, dt, tau, V96L.tetoJ(C, p));
  const vb = Math.hypot(M.B.vx, M.B.vy), dEu = Math.hypot(M.B.x - eu.x, M.B.y - eu.y);
  V96L.anda(V96R.B, dt, tau * 0.9, V96L.tetoB(C, p, vb, dEu, U), p.gB, U(p.livreB));
  for (let i = 0; i < M.jog.length; i++) if (i !== V92N.slot) V96L.anda(v96Deslize(i), dt, tau, V96L.tetoJ(C, p));
  const A = V96R.ant || {}, vJ = V96L.guardaJ(C, p), vB = V96L.guardaB(C, p);
  const poe = (pos, ant, d, vmax, salto, x0, y0, r, bola) => {   // o deslize + a guarda + a batida
    let q = [pos[0] + d.x, pos[1] + d.y];
    if (!salto && ant) { const g = V96L.guarda(q, ant, d, vmax, dt); if (g !== q) V96R.medidas.guardas++; q = g; }
    const b = V96L.varre(V92_NUC, G, x0, y0, q[0], q[1], r, bola);
    if (Math.abs(b[0] - q[0]) + Math.abs(b[1] - q[1]) > 0.5) V96R.medidas.batidas++;
    return b;
  };
  // a sua tampinha
  const pp = poe([P.x, P.y], A.P, V96R.P, vJ, V96R.saltoP, eu.x, eu.y, eu.r, false);
  P.x = P.ax = pp[0]; P.y = P.ay = pp[1];
  const J = [];
  if (V92.cfg.bolaPrev === 'eu') {                                // (com a bola do servidor ou a mista, a bola e os outros são os da v91)
    const bp = poe([B.x, B.y], A.B, V96R.B, vB, V96R.saltoB, M.B.x, M.B.y, M.B.r, true);
    B.x = bp[0]; B.y = bp[1];
    for (let i = 0; i < M.jog.length; i++) {
      if (i === V92N.slot) continue;
      const o = RQ.jog[i], q = M.jog[i]; if (!o || !q) continue;
      const jp = poe([o.x, o.y], A.J && A.J[i], v96Deslize(i), vJ, !!V96R.saltoJ[i], q.x, q.y, q.r, false);
      o.x = o.ax = jp[0]; o.y = o.ay = jp[1]; J[i] = jp;
    }
  }
  V96R.ant = { P: pp, B: [B.x, B.y], J };
  V96R.saltoP = V96R.saltoB = false; V96R.saltoJ = [];
}

/* ---------------------------------------------------------------- 3) o começo e o fim da partida */
const v96BeginAntes = net49Begin;
net49Begin = function () { v96Zera(); return v96BeginAntes.apply(this, arguments); };
const v96StopAntes = x49NetStop;
x49NetStop = function () { v96Zera(); return v96StopAntes.apply(this, arguments); };

window.RachaRede96 = {
  PADRAO: V96L.PADRAO,
  estado: () => ({ ativo: V96_REDE && v92RedeAtiva(), desliza: { P: [V96R.P.x, V96R.P.y], B: [V96R.B.x, V96R.B.y], J: V96R.J.map(d => d ? [d.x, d.y] : null) }, medidas: Object.assign({}, V96R.medidas), erro: V96R.erro }),
};
