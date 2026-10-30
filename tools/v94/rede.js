/* ======================================================================================================================
   RACHA v94 · O ONLINE COM O MOTOR PRÓPRIO (tools/v94/rede.js)
   Numa sala do servidor cuja rodada usa o motor próprio (room.motorRodada === 'v94'):
     · o campo, os tamanhos e os números do jogo são os do perfil que a SALA mandou (room.fisica94, já resolvido no
       servidor: o aparelho não recalcula nada) — o painel do aparelho volta a valer na saída da sala;
     · quem joga roda o MESMO motor (window.RachaMotor) num mundo de previsão: os seus comandos na hora (a mesma máquina de
       comandos do servidor: os contadores de toque, o segurar, a combinação PASSE → CHUTE), os outros seguindo o último
       comando que o servidor guardou para eles;
     · a cada quadro o mundo volta EXATAMENTE para o estado do servidor (o m94 do quadro) e os comandos que o servidor ainda
       não usou são refeitos. O que a previsão errou vira um deslize curto (tauCorr ms), sem pulo;
     · o chute previsto toca o som, pisca e vibra na hora; quando o servidor confirma, nada se repete.
   Sala de motor antigo (ou aparelho sem o motor): o caminho da v92, sem mudança nenhuma (o motor do painel fica de lado
   durante a sala, para as medidas do campo serem as do servidor).
   ====================================================================================================================== */
const V94N = {on:false, W:null, slot:-1, pend:[], kc:0, pc:0, est:'saida', ofP:[0, 0], ofB:[0, 0], ofJ:[], tDraw:0,
  serv:{t0:0, k0:-1, tps:0}, eu:{x:0, y:0}};

function v94RedeAtiva(){ return V94N.on && NET49.playing && !NET49.host && NET49.localSlot >= 0; }
const v94Mpx = (W, x) => CX + x*V94_PX, v94Mpy = (W, y) => CY + y*V94_PX;

/* ---------------------------------------------------------------- a sala: o motor da rodada vale no lugar do do painel */
function v94SalaEntra(room){
  const nova = !!(room && room.servidor && room.motorRodada === 'v94' && room.fisica94 && V94M);
  V94.sala = room && room.servidor ? (nova ? 'v94' : 'v93') : null;
  if (!V94.sala) return;
  V94.motor = nova ? 'v94' : 'v93';
  V94.R = nova ? room.fisica94 : null;
  if (nova) v94Compat();
}
function v94RedeInicia(room){
  V94N.on = false;
  if (V94.sala !== 'v94') return;
  v94Compat();                                                   // (a v92 pôs os números dela depois do começo: valem os da sala)
  try { aplicaModo(modo, campo); buildStatic(); } catch (_) {}
  V92N.on = false;                                               // (a previsão da v92 é do motor de antes)
  if (NET49.host || NET49.localSlot < 0 || NET49.localSlot >= room.n*2) return;   // (quem assiste: os quadros do servidor)
  V94N.W = V94M.mundo({n:room.n, jogo:room.jogo === 'curva' ? 'curva' : 'futebol', jogadores:Array.from({length:room.n*2}, (_, i) => ({time:Math.floor(i/room.n)})), R:V94.R});
  V94N.slot = NET49.localSlot; V94N.pend = []; V94N.kc = V94N.pc = 0; V94N.est = 'saida';
  V94N.ofP = [0, 0]; V94N.ofB = [0, 0]; V94N.ofJ = V94N.W.jog.map(() => [0, 0]); V94N.tDraw = 0; V94N.serv = {t0:0, k0:-1, tps:0};
  V94N.base = false;                                             // (ainda sem o primeiro quadro: a previsão começa nele)
  V94N.on = true;
}

/* ---------------------------------------------------------------- 1) o comando de cada passo */
function v94CmdMotor(c){                                         // o comando da rede → o comando do motor (a mesma conta do servidor)
  const bh = c.bh | 0, o = {mx:c.x, my:c.y, passe:bh & 1, chute:(bh >> 1) & 1, curva:(c.k | 0) & 1, np:c.kc | 0, nc:c.pc | 0};
  if (Number.isFinite(c.dt)) o.ordem = c.dt/10;
  return o;
}
function v94PrevPasso(c, efeitos){                               // um passo do mundo de previsão (a ordem do controle94 + passo do servidor)
  const W = V94N.W, j = V94N.slot;
  if (V94N.est === 'saida' || V94N.est === 'jogo') V94M.comando(W, j, v94CmdMotor(c));
  else { V94M.reiniciaComandos(W, j); V94M.comando(W, j, {mx:0, my:0, passe:0, chute:0, curva:0, np:c.kc | 0, nc:c.pc | 0}); }
  const ev = V94M.passo(W);
  for (const e of ev){
    if (e.t === 'chute' && e.j === j) v92ChuteFx(e.b !== 'passe', c.seq, efeitos);
    else if (e.t === 'anulado' && e.j === j && efeitos && e.motivo === 'expirou') V92.med.perdidos++;
    else if (e.t === 'gol') V94N.est = 'gol';
    else if (e.t === 'saida' && V94N.est === 'saida') V94N.est = 'jogo';
  }
}
function v94ComandoRede(d){
  const lp = BOTAO.kickL, lc = BOTAO.powerL, hp = kickSegurado(), hc = powerSegurado();
  if (lp) V94N.kc++;
  if (lc) V94N.pc++;
  const button = hc || lc ? 3 : hp || lp ? 2 : 1;
  BOTAO.kickL = BOTAO.powerL = false;
  const cmd = {type:'input', seq:++NET49.seq, x:d.mx, y:d.my, button, k:v70ConvidadoK(d.mx, d.my), kc:V94N.kc, pc:V94N.pc,
    bh:(hp || lp ? 1 : 0) | (hc || lc ? 2 : 0)};
  if (lp && lc && typeof v92DbDt === 'function'){ const dt = v92DbDt(); if (dt != null) cmd.dt = dt; }   // (os dois no mesmo comando: quem veio antes)
  if (lp || lc) V92.med.toques++;
  net49Send(cmd);
  V94N.pend.push(cmd); if (V94N.pend.length > 120) V94N.pend.shift();
  if (V94N.base) v94PrevPasso(cmd, true);
}
function v94RedeFalhou(e){                                       // (um erro na previsão nunca trava o jogo: volta para o caminho de antes)
  V94N.on = false;
  try { console.error('v94 · a previsão do online parou (o jogo segue com os quadros do servidor):', e); } catch (_) {}
}
const v94RemoteAntes = net49RemoteFrame;
net49RemoteFrame = function(dt, now){
  if (!v94RedeAtiva()) return v94RemoteAntes.apply(this, arguments);
  try { return v94RemoteFrame(dt, now); } catch (e) { v94RedeFalhou(e); return v94RemoteAntes.apply(this, arguments); }
};
function v94RemoteFrame(dt, now){
  if (NET49.paused || now - NET49.snapshotAt > 2000){ net49Draw(0); x49GameUI(); return; }
  if (!fimAberto() && !X49UI.open){
    acc += dt; const d = getInput(); dirSegue(dt, d.mx, d.my);
    while (acc + 1e-9 >= STEP){ v94ComandoRede(d); acc = Math.max(0, acc - STEP); rpGrava(); }
  } else { acc += dt; while (acc >= STEP){ acc -= STEP; rpGrava(); } }
  if (goalT >= 0){ goalT += dt; if (goalT > 1.7) goalT = -1; }
  if (RP.golN >= 0 && RP.n - RP.golN >= TICKS_POR_S){ const rep = rpMonta(); RP.golN = -1; if (rep) rpGuardaRecente(rep); }
  net49Draw(dt); x49GameUI();
}
const v94PredictAntes = net49Predict;
net49Predict = function(cmd){ if (v94RedeAtiva()) return; return v94PredictAntes.apply(this, arguments); };
window.addEventListener('blur', () => {                          // (ao sair da aba vai um comando parado: entra na previsão também)
  if (!v94RedeAtiva()) return;
  const c = {seq:NET49.seq, x:0, y:0, button:1, k:0, kc:V94N.kc, pc:V94N.pc, bh:0};
  if (!V94N.pend.length || V94N.pend[V94N.pend.length - 1].seq < c.seq) V94N.pend.push(c);
});
const v94HelloAntes = v70HelloExtra;                            // o servidor só roda o motor próprio se todos em campo têm ele
v70HelloExtra = function(){ const o = v94HelloAntes.apply(this, arguments) || {}; if (V94M) o.v94 = 1; return o; };

/* ---------------------------------------------------------------- 2) o quadro do servidor: volta para ele e refaz os comandos */
function v94Fotos(){                                             // (onde a previsão estava, em px: para o deslize)
  const W = V94N.W;
  return {j:W.jog.map(q => [v94Mpx(W, q.x), v94Mpy(W, q.y)]), b:[v94Mpx(W, W.bola.x), v94Mpy(W, W.bola.y)]};
}
// o m94 em texto (server/partida/sala94.js: codificaM94): os números do empacotamento; vazio = o "nunca" do motor; '~' + 11
// letras = os 8 bytes do double em base 64 (sem perder nenhuma casa)
const V94_B64I = (() => { const t = new Int16Array(128).fill(-1), A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'; for (let i = 0; i < 64; i++) t[A.charCodeAt(i)] = i; return t; })();
const V94_DV = new DataView(new ArrayBuffer(8));
function v94F64(t){
  let acc = 0, nb = 0, k = 0;
  for (let i = 1; i < t.length; i++){ acc = (acc << 6) | V94_B64I[t.charCodeAt(i)]; nb += 6; if (nb >= 8){ nb -= 8; V94_DV.setUint8(k++, (acc >> nb) & 255); acc &= (1 << nb) - 1; } }
  return V94_DV.getFloat64(0);
}
function v94DesfazM94(t){
  if (Array.isArray(t)) return t;
  const a = String(t).split(',');
  for (let i = 0; i < a.length; i++){ const x = a[i]; a[i] = x === '' ? -1000000000 : x[0] === '~' ? v94F64(x) : Number(x); }
  return a;
}
function v94SnapPrev(s){
  const W = V94N.W, j = V94N.slot, ja = V94N.base, antes = ja ? v94Fotos() : null, estAntes = V94N.est;
  const ack = s.players[j] ? s.players[j][4] | 0 : 0;
  while (V94N.pend.length && V94N.pend[0].seq <= ack) V94N.pend.shift();
  V94M.desempacota(W, v94DesfazM94(s.m94));
  V94N.est = s.state; V94N.base = true;
  for (const c of V94N.pend) v94PrevPasso(c, false);
  const S = V94N.serv, t = performance.now();                    // o ritmo do servidor visto daqui (passos por segundo)
  if (S.k0 < 0 || t - S.t0 > 4000){ S.k0 = s.tick; S.t0 = t; } else if (t - S.t0 > 1000) S.tps = (s.tick - S.k0)*1000/(t - S.t0);
  V92.med.fila = V94N.pend.length; V92.med.tps = S.tps;
  if (!ja) return;
  // o que mudou na previsão vira um deslize curto; a sua tampinha só pula no teleporte de verdade (a saída depois do gol, o
  // fim) ou numa correção de mais de 1,2 m (a internet sumiu por segundos)
  const agora = v94Fotos(), reinicio = s.state !== estAntes && (s.state === 'saida' || s.state === 'fim');
  const teleP = reinicio ? 0 : 1.2*V94_PX, tele = 0.5*V94_PX;
  const dP = [antes.j[j][0] - agora.j[j][0], antes.j[j][1] - agora.j[j][1]], dB = [antes.b[0] - agora.b[0], antes.b[1] - agora.b[1]];
  const nP = Math.hypot(dP[0], dP[1]), nB = Math.hypot(dB[0], dB[1]);
  V92.med.corr.push(nP); if (V92.med.corr.length > 180) V92.med.corr.shift();
  V92.med.corrB = V92.med.corrB || []; V92.med.corrB.push(nB); if (V92.med.corrB.length > 180) V92.med.corrB.shift();
  if (nP < teleP){ V94N.ofP[0] += dP[0]; V94N.ofP[1] += dP[1]; } else V94N.ofP = [0, 0];
  if (nB < tele*1.6 && !reinicio){ V94N.ofB[0] += dB[0]; V94N.ofB[1] += dB[1]; } else V94N.ofB = [0, 0];
  W.jog.forEach((q, i) => { if (i === j) return; const d = [antes.j[i][0] - agora.j[i][0], antes.j[i][1] - agora.j[i][1]];
    if (Math.hypot(d[0], d[1]) < tele && !reinicio){ V94N.ofJ[i][0] += d[0]; V94N.ofJ[i][1] += d[1]; } else V94N.ofJ[i] = [0, 0]; });
}
const v94SnapAntes = net49Snapshot;
net49Snapshot = function(s){
  if (!v94RedeAtiva() || !s || s.m94 == null || !(s.tick > NET49.lastTick)) return v94SnapAntes.apply(this, arguments);
  const tela = [P.x, P.y, P.vx, P.vy, B.x, B.y, B.vx, B.vy, VIS.px, VIS.py, VIS.bx, VIS.by];   // (a tampinha e a bola como estão desenhadas)
  NET49.pending = [];                                            // (o replay da v91 não roda: o daqui é o do motor)
  const r = v94SnapAntes.apply(this, arguments);                 // o resto de sempre: placar, gol, sons, a suavização dos outros…
  if (V94N.base){                                                // (até o primeiro quadro, vale a posição do servidor)
    P.x = tela[0]; P.y = tela[1]; P.vx = tela[2]; P.vy = tela[3]; B.x = tela[4]; B.y = tela[5]; B.vx = tela[6]; B.vy = tela[7];
    VIS.px = tela[8]; VIS.py = tela[9]; VIS.bx = tela[10]; VIS.by = tela[11];
  }
  try { v94SnapPrev(s); } catch (e) { v94RedeFalhou(e); }
  return r;
};
// (o quadro do servidor confirmando um chute que a previsão já mostrou não pisca de novo)
const v94FxChuteAntes = fxChute;
fxChute = function(q, forte, novo){
  if (q === P && !novo && v94RedeAtiva() && performance.now() - V92N.fx.t < 700) return;
  return v94FxChuteAntes.apply(this, arguments);
};

/* ---------------------------------------------------------------- 3) o desenho: a previsão + os deslizes */
function v94Mostra(){
  const W = V94N.W, R = V94.R, S = V94_PX, eu = W.jog[V94N.slot], agora = performance.now();
  const dt = V94N.tDraw ? Math.min(.1, (agora - V94N.tDraw)/1000) : 0; V94N.tDraw = agora;
  const k = Math.exp(-dt*1000/V92.cfg.tauCorr);                  // os deslizes somem em tauCorr ms
  V94N.ofP[0] *= k; V94N.ofP[1] *= k; V94N.ofB[0] *= k; V94N.ofB[1] *= k;
  for (const o of V94N.ofJ){ o[0] *= k; o[1] *= k; }
  const t = Math.max(0, Math.min(STEP, acc));                    // (o tempo desde o último passo previsto)
  // a sua tampinha: a previsão + a velocidade do próximo passo pela regra do motor (o analógico de agora) + o deslize
  const inp = V92.ultInp || {mx:0, my:0}, vale = V94N.est === 'saida' || V94N.est === 'jogo';
  const a = Math.hypot(inp.mx || 0, inp.my || 0), alvo = !vale || a < R.zonaMorta ? [0, 0] : [inp.mx/a*R.vMax, inp.my/a*R.vMax];
  const dvx = alvo[0] - eu.vx, dvy = alvo[1] - eu.vy, dv = Math.hypot(dvx, dvy);
  const ac = (alvo[0] === 0 && alvo[1] === 0 ? R.aPara : eu.vx*alvo[0] + eu.vy*alvo[1] < 0 ? R.aVira : R.aAcel)*STEP;
  const vx = dv <= ac ? alvo[0] : eu.vx + dvx/dv*ac, vy = dv <= ac ? alvo[1] : eu.vy + dvy/dv*ac;
  P.x = Math.max(GL + P.r, Math.min(GR - P.r, CX + (eu.x + vx*t)*S)) + V94N.ofP[0];
  P.y = Math.max(GT + P.r, Math.min(GB - P.r, CY + (eu.y + vy*t)*S)) + V94N.ofP[1];
  P.vx = eu.vx*S; P.vy = eu.vy*S; P.ax = P.x; P.ay = P.y;
  // a bola (anda reto até o próximo passo; para na linha) e os outros
  const b = W.bola;
  const bx = Math.max(GL + B.r, Math.min(GR - B.r, CX + (b.x + b.vx*t)*S)) + V94N.ofB[0];
  const by = Math.max(LY0 + B.r, Math.min(LY1 - B.r, CY + (b.y + b.vy*t)*S)) + V94N.ofB[1];
  const modo = V92.cfg.bolaPrev;
  if (modo === 'eu'){
    B.x = bx; B.y = by; B.vx = b.vx*S; B.vy = b.vy*S;
    W.jog.forEach((q, i) => {                                    // os outros também na hora da previsão
      if (i === V94N.slot) return; const o = RQ.jog[i]; if (!o) return;
      o.x = o.ax = CX + (q.x + q.vx*t)*S + V94N.ofJ[i][0]; o.y = o.ay = CY + (q.y + q.vy*t)*S + V94N.ofJ[i][1]; o.vx = q.vx*S; o.vy = q.vy*S;
    });
  } else if (modo === 'misto'){
    const dEu = Math.hypot(b.x - eu.x, b.y - eu.y);             // quem está mais perto da bola NA PREVISÃO
    let dOut = 1e9; W.jog.forEach((q, i) => { if (i !== V94N.slot) dOut = Math.min(dOut, Math.hypot(b.x - q.x, b.y - q.y)); });
    const w = Math.max(0, Math.min(1, .5 + (dOut - dEu)/0.6));
    V94N.w = (V94N.w == null ? 1 : V94N.w) + (w - (V94N.w == null ? 1 : V94N.w))*(1 - Math.exp(-dt/.15));
    B.x += (bx - B.x)*V94N.w; B.y += (by - B.y)*V94N.w;
  }
  // ('servidor': a bola fica a do netSuaviza)
}
const v94DrawAntes = net49Draw;
net49Draw = function(dt){
  if (!v94RedeAtiva() || !V94N.base) return v94DrawAntes.apply(this, arguments);
  netSuaviza();                                                  // a bola do servidor e os outros jogadores, lisos entre os quadros
  try { v94Mostra(); } catch (e) { v94RedeFalhou(e); }
  posVisual(1);
  VIS.px = P.x; VIS.py = P.y; VIS.bx = B.x; VIS.by = B.y;
  updateCamera(dt, false);
  spinBall(dt); render(dt);
};

/* ---------------------------------------------------------------- começo e fim da partida online */
const v94BeginAntes = net49Begin;
net49Begin = function(room){
  try { v94SalaEntra(room); } catch (e) { V94.sala = null; console.error('v94 sala', e); }
  const r = v94BeginAntes.apply(this, arguments);
  try { v94RedeInicia(room); } catch (e) { V94N.on = false; console.error('v94 rede', e); }
  return r;
};
const v94NetStopAntes = x49NetStop;
x49NetStop = function(){
  const r = v94NetStopAntes.apply(this, arguments);
  V94N.on = false; V94N.W = null;
  if (V94.sala){ V94.sala = null; try { v94AplicaMotor(); } catch (_) {} }   // (o treino volta ao motor e aos números do painel)
  return r;
};
