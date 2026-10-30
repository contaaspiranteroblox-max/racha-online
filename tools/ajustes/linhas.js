/* ======================================================================================================================
   RACHA · AS LINHAS DA BOLA (tools/ajustes/linhas.js)
   Duas linhas no chão, por baixo de todo mundo (no lugar do rastro da bola, na mesma camada):
     · A LINHA DO CHUTE: para onde a bola vai se você chutar AGORA (o CHUTE e, se quiser, o PASSE). A conta é a da física de
       verdade, rodada à frente só com a bola (e com o seu corpo nos primeiros passos, andando com o analógico de agora): o
       impulso do chute (centro da tampinha → centro da bola, somado ao que a bola já tinha), o freio do campo, o teto, os
       subpassos, as linhas, as traves (e os chinelos), a rede, o paredão e os cones do treino, e a curva no ar. Termina no
       gol (dourada: é seu; vermelha: gol contra) ou onde a bola para. Aparece com a bola perto do pé (no alcance: forte; um
       pouco antes: fraca).
     · O CAMINHO DA BOLA: com a bola andando solta, até onde ela vai sozinha (com as batidas). Rodado uma vez por lance e
       reaproveitado enquanto a bola segue o caminho (um toque, uma batida em alguém ou o gol refazem).
   No treino e contra os bots: a física clássica do jogo (o bloco PHYS, lido e nunca mexido). No online: o núcleo das salas
   (o mesmo do servidor), a partir do mundo da previsão. Na Oficina: o motor dos mapas (tools/oficina/jogo.js usa as funções
   de desenho daqui). Os outros jogadores não entram na conta (eles podem tocar na bola no caminho). Com o motor próprio da
   v94 (em testes) as linhas ainda não aparecem. Liga e desliga em Ajustes › Visual › AJUSTES FINOS › A BOLA.
   v95: as linhas só aparecem na Oficina, nas salas em que o criador ligou o RANK OFF (e no TESTAR com o RANK OFF), no
   estilo dos pontinhos brancos (lnDesenhaPontos); no treino, contra os bots, nas salas e na ranqueada elas não aparecem.
   ====================================================================================================================== */
const LN_TEMPO = { curta: 1.5, media: 3, longa: 8 };            // s de caminho (a longa vai até parar, no máximo 8 s)
const LN = { cam: null, mira: null, miraK: '', miraN: -99, contas: 0 };
const LNB = { x: 0, y: 0, vx: 0, vy: 0, w: 0, r: 1, m: 1, I: 1, cv: 0, cvT: 0, cvUx: null, cvUy: null };   // a bola de mentira
const LNK = { x: 0, y: 0, vx: 0, vy: 0, r: 1, m: 1, mx: 0, my: 0, time: 0 };                             // quem chuta (o seu corpo)
const LN_CORPO_PASSOS = 12;                                     // (o seu corpo entra na conta nos primeiros 0,2 s: o empurrão logo depois do chute)
function lnLimpa() { LN.cam = null; LN.mira = null; LN.miraK = ''; }
// v95: as linhas só aparecem nas partidas da Oficina com o RANK OFF ligado pelo criador da sala (e no TESTAR com o RANK OFF):
// no treino, contra os bots, nas salas e na ranqueada, não. As contas daqui continuam (a Oficina usa as funções de desenho).
const LN_SO_OFICINA = true;
function lnAtivo() {
  if (LN_SO_OFICINA) return false;
  const c = AJF.cfg;
  if (c.linhaChute === 'nao' && !c.linhaBola) return false;
  if (typeof v94Ligado === 'function' && v94Ligado()) return false;   // (o motor próprio da v94: ainda não)
  if (typeof V94 !== 'undefined' && V94.sala === 'v94') return false;
  if (lobby.aberto || editing || RP.ativo) return false;
  return true;
}
const lnPassos = () => Math.round((LN_TEMPO[AJF.cfg.linhaTam] || 3) * TICKS_POR_S);

/* ---------------------------------------------------------------- 1) a física clássica (treino, bots, jogar livre) */
function lnColideClassica(o, k) {                               // as batidas da bola (a mesma ordem do collide; o corpo primeiro)
  if (k) { hitBodies(k, o, QUIQUE_BOLA, ATRITO_JOG_BOLA); hitBox(k, JOG_X0, JOG_Y0, JOG_X1, JOG_Y1, V92_QJP, 0); }
  for (let i = 0; i < WALL_SEGS.length; i++) { const w = WALL_SEGS[i]; hitSeg(o, w[0], w[1], w[2], w[3], Q_PAREDE, ATRITO_BOLA); }
  hitBox(o, GL, GT, GR, GB, Q_PAREDE, ATRITO_BOLA);
  let trave = false;
  for (let i = 0; i < POSTS.length; i++) {
    const q = POSTS[i]; let px = q[0], py = q[1];
    if (q.length === 4) { const ax = q[2] - q[0], ay = q[3] - q[1], t = Math.max(0, Math.min(1, ((o.x - q[0]) * ax + (o.y - q[1]) * ay) / (ax * ax + ay * ay))); px = q[0] + ax * t; py = q[1] + ay * t; }
    if (hitPoint(o, px, py, POST_R, Q_POSTE, ATRITO_POSTE)) trave = true;
  }
  for (let i = 0; i < NET_SEGS.length; i++) { const s = NET_SEGS[i]; hitSeg(o, s[0], s[1], s[2], s[3], Q_REDE, ATRITO_BOLA); }
  if (TR.on) {                                                  // o treino: o paredão e os cones (os companheiros e o goleiro andam: ficam de fora)
    for (const w of TR.paredes) {
      const ax = CX + w.x0, ay = CY + w.y0, ex = w.x1 - w.x0, ey = w.y1 - w.y0, L2 = ex * ex + ey * ey || 1;
      const t = Math.max(0, Math.min(1, ((o.x - ax) * ex + (o.y - ay) * ey) / L2));
      if (hitPoint(o, ax + ex * t, ay + ey * t, w.e, TR_QUIQUE_PAREDAO, ATRITO_BOLA)) trave = true;
    }
    for (const c of TR.cones) if (hitPoint(o, CX + c.x, CY + c.y, c.r, .45, ATRITO_BOLA)) trave = true;
  }
  return trave;
}
function lnCurvaClassica(o, sub) {                              // a curva no ar (o mdCurva, na bola de mentira)
  if (!(o.cvT > 0)) return;
  o.cvT -= sub;
  const v = Math.hypot(o.vx, o.vy);
  if (v < U(3)) { o.cvT = 0; return; }
  if (o.cvUx != null && (o.vx * o.cvUx + o.vy * o.cvUy) / v < .94) { o.cvT = 0; return; }
  const a = (o.cv || 0) * v * sub, nx = -o.vy / v, ny = o.vx / v;
  o.vx += nx * a; o.vy += ny * a;
  const l = Math.hypot(o.vx, o.vy) || 1; o.cvUx = o.vx / l; o.cvUy = o.vy / l;
}
function lnGolClassico(x0, y0, x1, y1) {                        // o lado do gol (-1 esquerda, 1 direita) ou 0 — o que vale ponto
  if (RQ.on && typeof mdSemGol === 'function' && mdSemGol()) return 0;   // (vôlei, americano, basquete: outras regras)
  return golCruzou(x0, y0, x1, y1);
}
function lnPassoClassico(o, k, d) {                             // um passo de 1/60 s (a ordem do physicsStep, só com a bola e o corpo)
  const dt = STEP, tk = dt * TICKS_POR_S;
  if (k) {
    if (d && (d.mx || d.my)) { k.vx += d.mx * VEL_JOG; k.vy += d.my * VEL_JOG; const s = Math.hypot(k.vx, k.vy); if (s > VEL_JOG) { k.vx *= VEL_JOG / s; k.vy *= VEL_JOG / s; } }
    else { k.vx = 0; k.vy = 0; }
  }
  o.vy += U(GRAVIDADE_BOLA) * dt;
  const al = Math.pow(1 / (1 + AMORT_LINEAR / TICKS_POR_S), tk); o.vx *= al; o.vy *= al;
  o.w *= Math.pow(1 / (1 + AMORT_ANGULAR / TICKS_POR_S), tk);
  const damping = Math.pow(CAMPO.fatorBola, tk); o.vx *= damping; o.vy *= damping;
  const speed = Math.hypot(o.vx, o.vy);
  if (speed > LIMITE_VEL_BOLA) { o.vx *= LIMITE_VEL_BOLA / speed; o.vy *= LIMITE_VEL_BOLA / speed; }
  const relative = k ? Math.hypot(o.vx - k.vx, o.vy - k.vy) : speed;
  const steps = Math.max(2, Math.min(12, Math.ceil(Math.max(speed, relative) * dt / (R_BOLA * .3))));
  const sub = dt / steps;
  const r = { gol: 0, trave: false };
  for (let i = 0; i < steps; i++) {
    const bx0 = o.x, by0 = o.y;
    if (k) { k.x += k.vx * sub; k.y += k.vy * sub; }
    o.x += o.vx * sub; o.y += o.vy * sub;
    if (RQ.on && RQ.jogo === 'curva') lnCurvaClassica(o, sub);
    if (lnColideClassica(o, k)) r.trave = true;
    if (lnColideClassica(o, k)) r.trave = true;
    const g = lnGolClassico(bx0, by0, o.x, o.y); if (g) { r.gol = g; r.gx = o.x; r.gy = o.y; break; }
  }
  return r;
}
function lnBolaDe(src) {                                        // a bola de mentira com o estado de agora
  const o = LNB;
  o.x = src.x; o.y = src.y; o.vx = src.vx; o.vy = src.vy; o.w = src.w || 0; o.r = src.r; o.m = src.m; o.I = src.I || (0.5 * src.m * src.r * src.r);
  o.cv = src.cv || 0; o.cvT = src.cvT || 0; o.cvUx = src.cvUx == null ? null : src.cvUx; o.cvUy = src.cvUy == null ? null : src.cvUy;
  return o;
}
function lnMiraImpulso(o, kx, ky, forca, curva) {               // o chute na bola de mentira (o kickBall: zera o giro, soma o impulso)
  let dx = o.x - kx, dy = o.y - ky, d = Math.hypot(dx, dy);
  if (d === 0) { dx = 1; dy = 0; d = 1; }
  o.w = 0; const dv = U(forca / o.m); o.vx += dx / d * dv; o.vy += dy / d * dv;
  if (curva) o.cvT = 0;                                         // (PASSE e CHUTE saem retos)
}
const lnVirou = (vx0, vy0, vx1, vy1) => { const a = Math.hypot(vx0, vy0), b = Math.hypot(vx1, vy1); return a > U(2) && b > U(.4) && vx0 * vx1 + vy0 * vy1 < .9 * a * b; };
// roda o caminho: passo(o) → {gol, trave}; devolve {pts:[x, y, …] (um por passo), bat:[[x, y]], gol, fimX, fimY}
function lnRoda(o, passo, n) {
  const pts = [o.x, o.y], bat = [];
  let gol = 0, vx = o.vx, vy = o.vy;
  for (let i = 0; i < n; i++) {
    const r = passo(i);
    pts.push(o.x, o.y);
    if (r.trave || lnVirou(vx, vy, o.vx, o.vy)) bat.push([o.x, o.y, i + 1]);   // (o índice: o desenho pula as que já passaram)
    vx = o.vx; vy = o.vy;
    if (r.gol) { gol = r.gol; break; }
    if (Math.abs(o.vx) + Math.abs(o.vy) < U(.5) && i > 2) break;   // (parou)
  }
  return { pts, bat, gol, fimX: o.x, fimY: o.y };
}
function lnCaminhoClassico(n) {                                 // a bola andando, sozinha
  const o = lnBolaDe(B);
  return lnRoda(o, () => lnPassoClassico(o, null, null), n);
}
function lnMiraClassica(forca, n) {                             // se você chutar agora (no próximo passo da física)
  const o = lnBolaDe(B), k = LNK, d = direcaoOriginal(V92.ultInp.mx, V92.ultInp.my);
  k.x = P.x; k.y = P.y; k.vx = P.vx; k.vy = P.vy; k.r = P.r; k.m = P.m;
  lnMiraImpulso(o, P.x, P.y, forca, RQ.on && RQ.jogo === 'curva');
  return lnRoda(o, i => lnPassoClassico(o, i < LN_CORPO_PASSOS ? k : null, d), n);
}

/* ---------------------------------------------------------------- 2) o online: o núcleo das salas, no mundo da previsão */
function lnMundoNucleo(M, comCorpo) {                           // o mundo de mentira: a mesma geometria, a bola e (talvez) o seu corpo
  const W = LN.wN || (LN.wN = { G: null, B: Object.assign({}, LNB), jog: [], estado: 'jogo', saidaTime: 0, jogo: 'futebol', trave: 0, tick: 0 });
  W.G = M.G; W.jogo = M.jogo; W.estado = 'jogo'; W.trave = 0; W.tick = M.tick;
  Object.assign(W.B, M.B);
  W.jog.length = 0;
  if (comCorpo) { const eu = M.jog[V92N.slot]; Object.assign(LNK, { x: eu.x, y: eu.y, vx: eu.vx, vy: eu.vy, r: eu.r, m: eu.m, mx: 0, my: 0, time: eu.time }); W.jog.push(LNK); }
  return W;
}
function lnPassoNucleo(W, C, corpo, d) {
  if (corpo && W.jog.length) { const k = W.jog[0]; k.mx = d.mx; k.my = d.my; }
  else W.jog.length = 0;
  W.trave = 0;
  const r = { gol: 0, trave: false };
  V92_NUC.passo(W, C, { gol: lado => { r.gol = lado; return 'para'; } });
  W.tick++;
  if (W.trave > 0) r.trave = true;
  return r;
}
function lnCaminhoNucleo(n) {
  const M = V92N.M, C = V92N.C, W = lnMundoNucleo(M, false);
  return lnRoda(W.B, () => lnPassoNucleo(W, C, false, null), n);
}
function lnMiraNucleo(forca, n) {
  const M = V92N.M, C = V92N.C, W = lnMundoNucleo(M, true), eu = M.jog[V92N.slot];
  const d = V92_NUC.direcao(V92.ultInp.mx, V92.ultInp.my, C.DIRECOES);
  let dx = W.B.x - eu.x, dy = W.B.y - eu.y, dd = Math.hypot(dx, dy); if (dd === 0) { dx = 1; dy = 0; dd = 1; }
  W.B.w = 0; const dv = U(forca / W.B.m); W.B.vx += dx / dd * dv; W.B.vy += dy / dd * dv; if (W.jogo === 'curva') W.B.cvT = 0;
  return lnRoda(W.B, i => lnPassoNucleo(W, C, i < LN_CORPO_PASSOS, d), n);
}

/* ---------------------------------------------------------------- 3) quando refazer e o que desenhar */
function lnFonte() {                                            // de onde vem a conta agora: 'nucleo' (online com a previsão) ou 'classica'
  if (NET49.playing && !NET49.host) return typeof v92RedeAtiva === 'function' && v92RedeAtiva() && V92N.M ? 'nucleo' : '';
  return 'classica';
}
function lnEstado(f) {                                          // a bola, o seu corpo, o passo e quem é você agora
  if (f === 'nucleo') { const M = V92N.M, eu = M.jog[V92N.slot]; return { b: M.B, eu, tick: M.tick, alc: V92N.C.ALCANCE_CHUTE, rj: V92N.C.R_JOG, rb: V92N.C.R_BOLA, kick: V92N.C.FORCA_KICK, power: V92N.C.FORCA_POWER, time: eu ? eu.time : 0, vale: M.estado === 'jogo' || M.estado === 'saida' }; }
  const vale = !RQ.on || RQ.estado === 'jogo' || RQ.estado === 'saida';
  return { b: B, eu: P, tick: V92.med.np | 0, alc: ALCANCE_CHUTE, rj: R_JOG, rb: R_BOLA, kick: FORCA_KICK, power: FORCA_POWER, time: RQ.on ? (P.time | 0) : (NET49.playing && NET49.localSlot >= 0 ? Math.floor(NET49.localSlot / Math.max(1, (NET49.room && NET49.room.n) || 1)) : 0), vale };
}
function lnCor(gol, time) {                                     // o gol é seu (dourado) ou contra (vermelho)?  lado 1 = o gol da direita = ponto do time 0
  if (!gol) return null;
  if (!RQ.on && !NET49.playing) return 'gol';
  const marca = gol > 0 ? 0 : 1;
  return marca === (time | 0) ? 'gol' : 'contra';
}
function lnAtualiza() {
  const f = lnFonte(); if (!f) { LN.cam = LN.mira = null; return null; }
  const E = lnEstado(f); if (!E.eu || !E.vale) { LN.cam = LN.mira = null; return null; }
  const n = lnPassos(), b = E.b, c = AJF.cfg, spec = NET49.playing && NET49.localSlot < 0;
  const dist = Math.hypot(b.x - E.eu.x, b.y - E.eu.y), perto = !spec && c.linhaChute !== 'nao' && dist <= E.alc * 1.6;
  // a linha do chute: refaz a cada 3 passos ou quando algo mexeu de verdade (no celular fraco a conta não pesa)
  if (perto) {
    const k = f + '|' + c.linhaChute + '|' + n + '|' + Math.round(b.x) + ',' + Math.round(b.y) + '|' + Math.round(E.eu.x) + ',' + Math.round(E.eu.y) + '|' + Math.round(b.vx / 8) + ',' + Math.round(b.vy / 8) + '|' + (V92.ultInp.mx || 0).toFixed(2) + ',' + (V92.ultInp.my || 0).toFixed(2);
    if (k !== LN.miraK && (Math.abs(E.tick - LN.miraN) >= 3 || !LN.mira)) {
      const forte = f === 'nucleo' ? lnMiraNucleo(E.power, n) : lnMiraClassica(E.power, n);
      const fraco = c.linhaChute === 'ambos' ? (f === 'nucleo' ? lnMiraNucleo(E.kick, n) : lnMiraClassica(E.kick, n)) : null;
      LN.mira = { forte, fraco, no: dist <= E.alc, time: E.time }; LN.miraK = k; LN.miraN = E.tick; LN.contas++;
    } else if (LN.mira) LN.mira.no = dist <= E.alc;
  } else LN.mira = null;
  // o caminho da bola andando: o mesmo enquanto a bola segue por ele
  const anda = Math.hypot(b.vx, b.vy) > U(2.5), colado = dist <= E.rj + E.rb + 3;
  if (c.linhaBola && anda && !colado && !perto) {
    const C0 = LN.cam;
    let ok = C0 && C0.fonte === f && C0.n === n;
    if (ok) { const i = E.tick - C0.t0; ok = i >= 0 && 2 * i + 1 < C0.pts.length && Math.hypot(C0.pts[2 * i] - b.x, C0.pts[2 * i + 1] - b.y) < 1.5; }
    if (!ok) { const r = f === 'nucleo' ? lnCaminhoNucleo(n) : lnCaminhoClassico(n); LN.cam = Object.assign(r, { fonte: f, n, t0: E.tick, time: E.time }); LN.contas++; }
  } else LN.cam = null;
  return E;
}

/* ---------------------------------------------------------------- 4) o desenho (no chão, por baixo de todo mundo) */
// pts: [x0, y0, x1, y1, …] · o: {cor, larg (px do mundo), traco:[a, b] | null, alfa, some (o fim vai sumindo), de (o índice de começo), bat, gol, fim, rb}
function lnDesenhaCaminho(g, R, o) {
  const pts = R.pts, n = pts.length / 2; if (n < 2) return;
  const de = Math.max(0, Math.min(n - 2, o.de | 0));
  const golC = o.golC !== undefined ? o.golC : lnCor(R.gol, o.time), cor = golC === 'gol' ? '#ffd23f' : golC === 'contra' ? '#ff5a5a' : o.cor;   // (a Oficina diz o dela)
  g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
  const passa = (alfa, larg, c) => {
    g.strokeStyle = c; g.lineWidth = larg;
    if (o.traco) g.setLineDash(o.traco); else g.setLineDash([]);
    if (!o.some) { g.globalAlpha = alfa; g.beginPath(); g.moveTo(pts[2 * de], pts[2 * de + 1]); for (let i = de + 1; i < n; i++) g.lineTo(pts[2 * i], pts[2 * i + 1]); g.stroke(); return; }
    const total = n - 1 - de, partes = Math.min(12, Math.max(1, total));   // (o fim vai sumindo: em pedaços, do forte ao fraco)
    for (let p = 0; p < partes; p++) {
      const a = de + Math.floor(total * p / partes), b2 = de + Math.floor(total * (p + 1) / partes); if (b2 <= a) continue;
      g.globalAlpha = alfa * (1 - p / partes * .85); g.beginPath(); g.moveTo(pts[2 * a], pts[2 * a + 1]); for (let i = a + 1; i <= b2; i++) g.lineTo(pts[2 * i], pts[2 * i + 1]); g.stroke();
    }
  };
  passa(o.alfa * .55, o.larg * 1.9, 'rgba(5,6,12,.55)');          // (o contorno escuro: aparece em qualquer piso)
  passa(o.alfa, o.larg, cor);
  g.setLineDash([]);
  // as batidas (um anel pequeno) e o fim: o gol (uma estrela) ou onde a bola para (o anel do tamanho da bola)
  g.globalAlpha = o.alfa; g.lineWidth = Math.max(1.5, o.larg * .7);
  for (const p of R.bat || []) { if (p[2] != null && p[2] < de) continue; g.strokeStyle = 'rgba(5,6,12,.6)'; g.beginPath(); g.arc(p[0], p[1], o.rb * .55 + 1.5, 0, TAU); g.stroke(); g.strokeStyle = cor; g.beginPath(); g.arc(p[0], p[1], o.rb * .55, 0, TAU); g.stroke(); }
  if (o.fim) {
    const fx = R.fimX, fy = R.fimY;
    if (golC) {
      g.fillStyle = cor; g.strokeStyle = 'rgba(5,6,12,.8)'; g.lineWidth = Math.max(1.5, o.larg * .6);
      g.beginPath(); for (let j = 0; j < 10; j++) { const a = j * Math.PI / 5 - Math.PI / 2, q = j % 2 ? o.rb * .55 : o.rb * 1.25; g.lineTo(fx + Math.cos(a) * q, fy + Math.sin(a) * q); } g.closePath(); g.fill(); g.stroke();
    } else { g.setLineDash([o.rb * .5, o.rb * .4]); g.strokeStyle = cor; g.lineWidth = Math.max(1.5, o.larg * .6); g.beginPath(); g.arc(fx, fy, o.rb, 0, TAU); g.stroke(); g.setLineDash([]); }
  }
  g.restore();
}
// v95: as linhas no estilo da imagem: pontinhos saindo da bola, cada vez menores e mais fracos até o fim do caminho (brancos;
// dourados quando o caminho termina no gol do adversário, vermelhos no gol contra). o: {cor, alfa, some, de, rb, golC|time,
// raio (o primeiro ponto, px do mundo), esp (o espaço entre eles)}. No máximo 90 pontos (no caminho comprido eles se afastam).
function lnDesenhaPontos(g, R, o) {
  const pts = R.pts, n = pts.length / 2; if (n < 2) return 0;
  const de = Math.max(0, Math.min(n - 2, o.de | 0));
  const golC = o.golC !== undefined ? o.golC : lnCor(R.gol, o.time), cor = golC === 'gol' ? '#ffd23f' : golC === 'contra' ? '#ff5a5a' : (o.cor || '#ffffff');
  let total = 0;
  for (let i = de + 1; i < n; i++) total += Math.hypot(pts[2 * i] - pts[2 * i - 2], pts[2 * i + 1] - pts[2 * i - 1]);
  const rb = o.rb || 1, r0 = o.raio || rb * .3, pula = o.pula != null ? o.pula : rb * 1.7;
  let esp = o.esp || rb * 1.55;
  if (total <= pula) return 0;
  if ((total - pula) / esp > 90) esp = (total - pula) / 90;
  const P = [];
  let s = 0, alvo = pula, i = de + 1, ax = pts[2 * de], ay = pts[2 * de + 1];
  while (i < n && alvo <= total + 1e-6) {
    const bx = pts[2 * i], by = pts[2 * i + 1], L = Math.hypot(bx - ax, by - ay);
    if (L > 0 && s + L >= alvo) { const k = (alvo - s) / L; P.push(ax + (bx - ax) * k, ay + (by - ay) * k, alvo / total); alvo += esp; continue; }
    s += L; ax = bx; ay = by; i++;
  }
  g.save();
  for (let j = 0; j < P.length; j += 3) {                       // (a sombra embaixo de cada ponto: aparece em qualquer piso)
    const u = P[j + 2], rr = r0 * (1 - .5 * u), a = o.alfa * (o.some ? 1 - .78 * u : 1 - .3 * u);
    g.globalAlpha = a * .42; g.fillStyle = '#04060c'; g.beginPath(); g.arc(P[j], P[j + 1] + rr * .22, rr * 1.32, 0, TAU); g.fill();
    g.globalAlpha = a; g.fillStyle = cor; g.beginPath(); g.arc(P[j], P[j + 1], rr, 0, TAU); g.fill();
  }
  if (golC && P.length) {                                       // (o gol: um anel no último ponto)
    const j = P.length - 3, rr = r0 * 1.25;
    g.globalAlpha = o.alfa * .9; g.lineWidth = Math.max(1, rr * .45); g.strokeStyle = cor; g.beginPath(); g.arc(P[j], P[j + 1], rr * 1.6, 0, TAU); g.stroke();
  }
  g.restore();
  return P.length / 3;
}
function lnDesenha(g) {
  if (!lnAtivo()) { LN.cam = LN.mira = null; return; }
  let E; try { E = lnAtualiza(); } catch (e) { LN.cam = LN.mira = null; try { console.error('linhas da bola:', e); } catch (_) {} return; }
  if (!E) return;
  const rb = E.rb, larg = U(.26);
  if (LN.cam) {                                                 // (começa onde a bola está agora: o pedaço que ela já andou some)
    const i = Math.max(0, (E.tick - LN.cam.t0) | 0);
    lnDesenhaCaminho(g, LN.cam, { cor: '#ffffff', larg: U(.2), traco: null, alfa: .4, some: true, de: i, bat: true, fim: true, rb, time: LN.cam.time });
  }
  if (LN.mira) {
    const a = LN.mira.no ? .92 : .42;
    if (LN.mira.fraco) lnDesenhaCaminho(g, LN.mira.fraco, { cor: '#8fd3ff', larg: larg * .8, traco: [U(.55), U(.55)], alfa: a * .85, some: true, de: 0, fim: true, rb, time: LN.mira.time });
    lnDesenhaCaminho(g, LN.mira.forte, { cor: '#ffffff', larg, traco: [U(.9), U(.6)], alfa: a, some: false, de: 0, fim: true, rb, time: LN.mira.time });
  }
}
// (o desenho entra no quadro do jogo logo depois do rastro da bola — no chão, por baixo de todo mundo; o da partida, não o do
//  replay: a etapa tools/ajustes/ajustes.py põe a chamada lnDesenha(ctx) ali. O rastro em si continua o que era.)
window.RachaLinhas = { estado: () => ({ cam: LN.cam ? { pts: LN.cam.pts.length / 2, bat: LN.cam.bat.length, gol: LN.cam.gol, fim: [LN.cam.fimX, LN.cam.fimY] } : null,
  mira: LN.mira ? { no: LN.mira.no, forte: { pts: LN.mira.forte.pts.length / 2, bat: LN.mira.forte.bat.length, gol: LN.mira.forte.gol, fim: [LN.mira.forte.fimX, LN.mira.forte.fimY] }, fraco: !!LN.mira.fraco } : null, contas: LN.contas }),
  classica: { caminho: n => lnCaminhoClassico(n), mira: (f, n) => lnMiraClassica(f, n) }, desenhaCaminho: lnDesenhaCaminho, desenhaPontos: lnDesenhaPontos, limpa: lnLimpa,
  soOficina: () => LN_SO_OFICINA };

/* ---------------------------------------------------------------- 5) a EXTRAPOLAÇÃO do online (Ajustes finos › ONLINE)
   O jogo desenhado uns ms à frente, como no Haxball: o mundo da previsão roda mais esses passos (a bola e todo mundo pela
   física do núcleo: a sua tampinha com o analógico de agora, os outros na direção deles; ninguém chuta) e o desenho anda o
   que o mundo andou. Com a bola na tela do SERVIDOR, a bola do servidor anda sozinha pela física até lá. 0 = desligada. */
function lnMundoTodo(M) {
  const W = LN.wX || (LN.wX = { G: null, B: Object.assign({}, LNB), jog: [], estado: 'jogo', saidaTime: 0, jogo: 'futebol', trave: 0, tick: 0 });
  W.G = M.G; W.jogo = M.jogo; W.estado = M.estado; W.saidaTime = M.saidaTime; W.trave = 0; W.tick = M.tick;
  Object.assign(W.B, M.B);
  while (W.jog.length < M.jog.length) W.jog.push({});
  W.jog.length = M.jog.length;
  for (let i = 0; i < M.jog.length; i++) Object.assign(W.jog[i], M.jog[i]);
  return W;
}
function lnExtrapola(ms) {
  const M = V92N.M, C = V92N.C; if (!M || !(ms > 0)) return;
  if (M.estado !== 'jogo' && M.estado !== 'saida') return;      // (no gol e no fim todo mundo vai para o lugar: nada a prever)
  const n = Math.max(1, Math.min(12, Math.round(ms * TICKS_POR_S / 1000))), slot = V92N.slot;
  const W = lnMundoTodo(M), eu = W.jog[slot], d = V92_NUC.direcao(V92.ultInp.mx, V92.ultInp.my, C.DIRECOES);
  for (let i = 0; i < n; i++) { if (eu) { eu.mx = d.mx; eu.my = d.my; } V92_NUC.passo(W, C, null); }
  const modo = V92.cfg.bolaPrev;
  if (eu && M.jog[slot]) { P.x += W.jog[slot].x - M.jog[slot].x; P.y += W.jog[slot].y - M.jog[slot].y; P.ax = P.x; P.ay = P.y; }
  if (modo === 'eu') {                                          // a bola e os outros: o quanto andaram no mundo à frente
    B.x += W.B.x - M.B.x; B.y += W.B.y - M.B.y;
    for (let i = 0; i < M.jog.length; i++) { if (i === slot) continue; const o = RQ.jog[i]; if (!o) continue; const dx = W.jog[i].x - M.jog[i].x, dy = W.jog[i].y - M.jog[i].y; o.x += dx; o.y += dy; o.ax = o.x; o.ay = o.y; }
  } else {                                                      // a bola do servidor (e a mista): ela anda sozinha até lá
    const Wb = lnMundoNucleo(M, false); Object.assign(Wb.B, { x: B.x, y: B.y, vx: B.vx, vy: B.vy, w: B.w || 0 });
    for (let i = 0; i < n; i++) { Wb.trave = 0; V92_NUC.passo(Wb, C, null); }
    B.x = Wb.B.x; B.y = Wb.B.y;
    for (let i = 0; i < RQ.jog.length; i++) { if (i === slot) continue; const o = RQ.jog[i]; if (!o || !(Math.abs(o.vx) + Math.abs(o.vy) > 0)) continue; o.x += o.vx * n / TICKS_POR_S; o.y += o.vy * n / TICKS_POR_S; o.ax = o.x; o.ay = o.y; }
  }
}
if (typeof v92Mostra === 'function') {
  const v92MostraAntesLn = v92Mostra;
  v92Mostra = function () {
    const r = v92MostraAntesLn.apply(this, arguments);
    const ms = AJF.cfg.extrapola | 0;
    if (ms > 0) { try { lnExtrapola(ms); } catch (e) { try { console.error('extrapolação:', e); } catch (_) {} } }
    return r;
  };
}
