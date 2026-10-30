/* ======================================================================================================================
   RACHA v92 · A PREVISÃO DO ONLINE COM O NÚCLEO DO SERVIDOR (tools/v92/rede.js)

   Na v91, quem joga numa sala prevê só a própria tampinha, com uma conta diferente da do servidor (2 subpassos, uma cópia
   da bola que não reage ao empurrão, os outros parados), e a bola só reage depois da ida e volta até o servidor: encostar
   na bola ou chutar só aparecia na tela uns 100–250 ms depois (o "atraso da bola"), sem som na hora do toque.
   Agora (salas de servidor v92, que mandam o perfil da física e o núcleo):
     · o aparelho roda o MESMO passo do servidor (RachaNucleo.passo) num mundo de previsão: a sua tampinha com os seus
       comandos, a bola com as batidas de verdade (empurrão, chute, paredes, traves, rede) e os outros seguindo a última
       direção que o servidor mostrou;
     · o PASSE/CHUTE é previsto na hora (a mesma máquina de botões do servidor, com o toque armado e os contadores kc/pc):
       a bola sai no quadro do toque, com o som, a piscada e a vibração; quando o servidor confirma, nada se repete;
     · a cada quadro do servidor o mundo volta para o estado dele e os comandos que ainda não chegaram lá são refeitos
       (rollback + replay). A diferença que sobra (a previsão errou: alguém mudou de direção, um palpite do servidor) vira
       um deslize curto (tauCorr ms), sem pulo;
     · a bola na tela (bolaPrev): 'eu' (padrão) = tudo na hora da previsão — a bola e os outros jogadores (o seu toque na
       hora; o toque e a virada dos outros chegam com um deslize curto); 'misto' = a bola prevista quando ela está mais
       perto de você e a do servidor quando está mais perto de outro (os outros onde o servidor mostra); 'servidor' = a
       bola como na v91 (só a sua tampinha prevista).
   Sala de servidor antigo (sem o núcleo) ou previsao:'v91' no painel: o caminho da v91, sem nenhuma mudança.
   ====================================================================================================================== */
const V92N = {on:false, aplicouSala:false, C:null, M:null, slot:-1, pend:[], bt:null, kc:0, pc:0, ackKc:0, ackPc:0, ackBh:0, evs:[], ultChute:-99,
  ofP:[0, 0], ofB:[0, 0], ofJ:[], w:1, tDraw:0, fx:{seq:-1, t:-1e9}, cb:null, B2:{x:0, y:0, vx:0, vy:0, w:0, r:1, m:1, I:1},
  serv:{t0:0, k0:-1, tps:0}, ultSnapT:0};

function v92RedeAtiva(){ return V92N.on && NET49.playing && !NET49.host && NET49.localSlot >= 0; }
function v92RedeAplica(){                                        // (o painel mudou algo: a previsão nova vale na próxima partida)
  if (V92N.on && V92.cfg.previsao !== 'v92') V92N.on = false;
}

/* ---------------------------------------------------------------- o mundo de previsão */
function v92RedeInicia(room){
  V92N.on = false;
  if (room && room.servidor){                                    // os números da sala valem no desenho e nas regras do aparelho
    v92AplicaFisica(room.fisica || V92_NUC.PERFIL_V91); V92N.aplicouSala = true;
  }
  if (!room || !room.servidor || !room.nucleo || V92.cfg.previsao !== 'v92' || NET49.host || NET49.localSlot < 0) return;
  const C = V92N.C = V92_NUC.resolve(room.fisica || V92_NUC.PERFIL_V92);
  const G = V92_NUC.novoCampo(room.n);
  const M = V92N.M = {G, B:V92_NUC.novaBola(C, G.CX, G.CY), jog:[], estado:'saida', saidaTime:0, jogo:room.jogo === 'curva' ? 'curva' : 'futebol', trave:0, tick:0};
  for (let i = 0; i < room.n*2; i++){
    const q = RQ.jog[i];
    M.jog.push({i, x:q ? q.x : G.CX, y:q ? q.y : G.CY, vx:0, vy:0, r:C.R_JOG, m:C.MASSA_JOG, mx:0, my:0, time:Math.floor(i/room.n)});
  }
  V92N.slot = NET49.localSlot;
  if (!(V92N.slot >= 0 && V92N.slot < M.jog.length)) return;     // (a vaga não existe nesta sala: fica o caminho da v91)
  V92N.pend = []; V92N.bt = V92_NUC.novoBotao(); V92N.kc = V92N.pc = V92N.ackKc = V92N.ackPc = V92N.ackBh = 0; V92N.evs.length = 0; V92N.ultChute = -99;
  V92N.ofP = [0, 0]; V92N.ofB = [0, 0]; V92N.ofJ = M.jog.map(() => [0, 0]); V92N.w = 1; V92N.tDraw = 0;
  V92N.fx = {seq:-1, t:-1e9}; V92N.serv = {t0:0, k0:-1, tps:0};
  V92N.cb = {toques(){                                           // (a saída: quem bate tocou na bola → o jogo começou)
    const M = V92N.M; if (M.estado !== 'saida') return;
    const B = M.B, lim = V92N.C.R_BOLA + 2;
    for (const q of M.jog) if (q.time === M.saidaTime && Math.hypot(q.x - B.x, q.y - B.y) <= q.r + lim){ M.estado = 'jogo'; return; }
  }};
  V92N.on = true;
}
function v92PrevChuta(q, forca){
  // o mínimo do servidor entre dois chutes seus: 2 passos (no DB por estados quem conta é a máquina do núcleo). Sem isto a
  // previsão mostrava um chute no passo seguinte ao outro — o DB do PASSE e logo o CHUTE — que o servidor recusava: a bola
  // saía na tela e voltava (tests/v92_db_test.cjs mede)
  const M = V92N.M, tk = M.tick + 1;
  if (V92N.C.DB_MODO !== 1 && tk - V92N.ultChute < 2) return false;
  const ok = V92_NUC.chute(M, V92N.C, q, forca);
  if (ok) V92N.ultChute = tk;
  return ok;
}
function v92PrevPasso(cmd, efeitos){                             // um passo do mundo de previsão (a ordem do controle() + passo() do servidor)
  const M = V92N.M, C = V92N.C, eu = M.jog[V92N.slot];
  const vale = M.estado === 'saida' || M.estado === 'jogo';
  if (eu){
    if (vale){
      V92N.bt.ev = efeitos ? V92N.evs : null;                      // (o medidor do DB: só a previsão na hora, não o replay)
      V92_NUC.botaoComando(V92N.bt, cmd, C);
      eu.mx = cmd.x; eu.my = cmd.y;
      const t = V92_NUC.botaoTick(M, C, eu, V92N.bt, v92PrevChuta);
      V92N.bt.ev = null;
      if (t){ v92ChuteFx(t === 3, cmd.seq, efeitos); if (efeitos && typeof v92DbChuteSaiu === 'function' && C.DB_MODO !== 1) v92DbChuteSaiu(t, cmd.seq, 'online'); }
    } else { eu.mx = eu.my = 0; }
    if (M.jogo === 'curva' && V92_NUC.curvaTick(M, C, eu, V92N.bt, cmd.k | 0, vale, v92PrevChuta)) v92ChuteFx(true, cmd.seq, efeitos);
  }
  V92_NUC.passo(M, C, V92N.cb);
  M.tick++;
}
function v92ChuteFx(forte, seq, agoraMesmo){                     // o chute previsto: o som, a piscada e a vibração NA HORA (uma vez por toque)
  const t = performance.now();
  if (seq <= V92N.fx.seq || t - V92N.fx.t < 200) return;
  V92N.fx.seq = seq; V92N.fx.t = t;
  V92.med.chutesPrev = (V92.med.chutesPrev | 0) + 1;
  if (!agoraMesmo && seq < NET49.seq - 1) return;                 // (refeito no replay e já velho: só marca)
  try { fxChute(P, forte, true); } catch (_) {}
  try { som.chute(forte); } catch (_) {}
  try { vibrarChute(forte); } catch (_) {}
  try { ARMADO.saiu = forte ? 'power' : 'kick'; ARMADO.saiuT = t; RP.toque = Math.max(RP.toque, forte ? 2 : 1); } catch (_) {}
}
// (o quadro do servidor confirmando um chute que a previsão já mostrou não pisca de novo)
const v92FxChuteAntes = fxChute;
fxChute = function(q, forte, novo){
  if (q === P && !novo && v92RedeAtiva() && performance.now() - V92N.fx.t < 700) return;
  return v92FxChuteAntes.apply(this, arguments);
};

/* ---------------------------------------------------------------- 1) o comando de cada passo (no lugar do da v91) */
function v92Comando(d){
  const lp = BOTAO.kickL, lc = BOTAO.powerL, hp = kickSegurado(), hc = powerSegurado();
  if (lp) V92N.kc++;
  if (lc) V92N.pc++;
  const button = hc || lc ? 3 : hp || lp ? 2 : 1;
  BOTAO.kickL = BOTAO.powerL = false;
  const cmd = {type:'input', seq:++NET49.seq, x:d.mx, y:d.my, button, k:v70ConvidadoK(d.mx, d.my), kc:V92N.kc, pc:V92N.pc,
    bh:(hp || lp ? 1 : 0) | (hc || lc ? 2 : 0)};                    // (o DB por estados: os botões apertados e, num toque novo, o relógio do toque)
  if ((lp || lc) && typeof v92DbDt === 'function'){ const dt = v92DbDt(); if (dt != null) cmd.dt = dt; }
  if (button !== 1 && V92N.bt && V92N.bt.estado === 1) V92.med.toques++;
  net49Send(cmd);
  V92N.pend.push(cmd); if (V92N.pend.length > 120) V92N.pend.shift();
  v92PrevPasso(cmd, true);
}
const v92RemoteAntes = net49RemoteFrame;
function v92RedeFalhou(e){                                       // (um erro na previsão nunca trava o jogo: volta para o caminho da v91)
  V92N.on = false;
  try { console.error('v92 · a previsão do online parou (o jogo segue com a da v91):', e); } catch (_) {}
}
net49RemoteFrame = function(dt, now){
  if (!v92RedeAtiva()) return v92RemoteAntes.apply(this, arguments);
  try { return v92RemoteFrame(dt, now); } catch (e) { v92RedeFalhou(e); return v92RemoteAntes.apply(this, arguments); }
};
function v92RemoteFrame(dt, now){
  if (NET49.paused || now - NET49.snapshotAt > 2000){ net49Draw(0); x49GameUI(); return; }
  if (!fimAberto() && !X49UI.open){
    acc += dt; const d = getInput(); dirSegue(dt, d.mx, d.my);
    while (acc + 1e-9 >= STEP){ v92Comando(d); acc = Math.max(0, acc - STEP); rpGrava(); }
  } else { acc += dt; while (acc >= STEP){ acc -= STEP; rpGrava(); } }
  if (goalT >= 0){ goalT += dt; if (goalT > 1.7) goalT = -1; }
  if (RP.golN >= 0 && RP.n - RP.golN >= TICKS_POR_S){ const rep = rpMonta(); RP.golN = -1; if (rep) rpGuardaRecente(rep); }
  net49Draw(dt); x49GameUI();
}
const v92PredictAntes = net49Predict;
net49Predict = function(cmd){ if (v92RedeAtiva()) return; return v92PredictAntes.apply(this, arguments); };
window.addEventListener('blur', () => {                          // (a v91 manda um comando parado ao sair da aba: entra na previsão também)
  if (!v92RedeAtiva()) return;
  const c = {seq:NET49.seq, x:0, y:0, button:1, k:0, kc:V92N.kc, pc:V92N.pc};
  if (!V92N.pend.length || V92N.pend[V92N.pend.length - 1].seq < c.seq) V92N.pend.push(c);
});

/* ---------------------------------------------------------------- 2) o quadro do servidor: volta para ele e refaz os comandos */
function v92Base(s){
  const M = V92N.M, C = V92N.C, b = s.ball;
  M.tick = s.tick; M.estado = s.state; M.saidaTime = s.kickoff === 1 ? 1 : 0;
  Object.assign(M.B, {x:b[0], y:b[1], vx:b[2], vy:b[3], w:b[4] || 0, cv:b[5] || 0, cvT:b[6] || 0, cvUx:null, cvUy:null});
  for (let i = 0; i < M.jog.length; i++){
    const v = s.players[i], q = M.jog[i]; if (!v) continue;
    q.x = v[0]; q.y = v[1]; q.vx = v[2]; q.vy = v[3];
    if (i !== V92N.slot){                                        // os outros: seguem a direção do quadro (o palpite de sempre)
      const sp = Math.hypot(v[2], v[3]);
      if (sp > C.VEL_JOG*.3){ q.mx = v[2]/sp; q.my = v[3]/sp; } else q.mx = q.my = 0;
    }
  }
  const pl = s.players[V92N.slot], bt = pl ? pl[7] : null, m = V92N.bt;
  if (typeof bt === 'number'){ m.estado = (bt & 3) || 1; m.livre = !!(bt & 4); m.armaTipo = (bt >> 3) & 3; m.arma = (bt >> 5) & 31; }
  m.kc = V92N.ackKc; m.pc = V92N.ackPc;
  if (pl && Number.isFinite(pl[5])) V92N.ultChute = pl[5];       // (o passo do seu último chute no servidor: o mínimo de 2 passos)
  if (C.DB_MODO === 1 && pl && typeof pl[8] === 'number'){       // o DB por estados: a máquina continua do estado do servidor
    V92_NUC.dbUnpack(m, pl[8], pl[4] | 0);
    m.hp = (V92N.ackBh & 1) === 1; m.hc = (V92N.ackBh & 2) === 2;
  }
}
const v92SnapAntes = net49Snapshot;
net49Snapshot = function(s){
  if (!v92RedeAtiva() || !s || !(s.tick > NET49.lastTick)) return v92SnapAntes.apply(this, arguments);
  const M = V92N.M, eu = M.jog[V92N.slot];
  const antesP = [eu.x, eu.y], antesB = [M.B.x, M.B.y], antesJ = M.jog.map(q => [q.x, q.y]);
  const tela = [P.x, P.y, P.vx, P.vy, B.x, B.y, B.vx, B.vy, VIS.px, VIS.py, VIS.bx, VIS.by];   // (a tampinha e a bola como estão desenhadas)
  NET49.pending = [];                                            // (o replay da v91 não roda: o daqui é o do núcleo)
  const r = v92SnapAntes.apply(this, arguments);                 // o resto da v91: placar, gol, sons, a suavização dos outros…
  // a v91 põe na sua tampinha e na bola (e no desenho) a posição do servidor, de uns 100 ms atrás, até o próximo quadro;
  // aqui elas continuam onde estão desenhadas (o próximo desenho da previsão já vem daqui a pouco): quem olhar entre dois
  // quadros vê o mesmo que a tela
  P.x = tela[0]; P.y = tela[1]; P.vx = tela[2]; P.vy = tela[3]; B.x = tela[4]; B.y = tela[5]; B.vx = tela[6]; B.vy = tela[7];
  VIS.px = tela[8]; VIS.py = tela[9]; VIS.bx = tela[10]; VIS.by = tela[11];
  try {
    v92SnapPrev(s, antesP, antesB, antesJ);
  } catch (e) { v92RedeFalhou(e); }
  return r;
};
function v92SnapPrev(s, antesP, antesB, antesJ){
  const M = V92N.M, eu = M.jog[V92N.slot], estAntes = M.estado;
  const ack = s.players[V92N.slot] ? s.players[V92N.slot][4] | 0 : 0;
  while (V92N.pend.length && V92N.pend[0].seq <= ack){ const c = V92N.pend.shift(); V92N.ackKc = c.kc | 0; V92N.ackPc = c.pc | 0; V92N.ackBh = c.bh | 0; }
  v92Base(s);
  for (const c of V92N.pend) v92PrevPasso(c, false);
  // o que mudou na previsão vira um deslize curto. A sua tampinha só pula no teleporte de verdade — a saída depois do gol e o
  // fim, quando o servidor põe todo mundo no lugar — ou numa correção de mais de 12 u (a internet sumiu por segundos). A
  // correção de um soluço de meio segundo (o servidor para a tampinha de quem fica sem mandar comando e descarta os comandos
  // velhos que chegam juntos: ~5 a 10 u) desliza em vez de pular. (A bola e os outros: como antes.)
  const reinicio = s.state !== estAntes && (s.state === 'saida' || s.state === 'fim');
  const tele = U(5), teleP = reinicio ? 0 : U(12);
  const dP = [antesP[0] - eu.x, antesP[1] - eu.y], dB = [antesB[0] - M.B.x, antesB[1] - M.B.y];
  const nP = Math.hypot(dP[0], dP[1]), nB = Math.hypot(dB[0], dB[1]);
  V92.med.corr.push(nP); if (V92.med.corr.length > 180) V92.med.corr.shift();
  V92.med.corrB = V92.med.corrB || []; V92.med.corrB.push(nB); if (V92.med.corrB.length > 180) V92.med.corrB.shift();
  if (nP < teleP){ V92N.ofP[0] += dP[0]; V92N.ofP[1] += dP[1]; } else V92N.ofP = [0, 0];
  if (nB < tele*1.6){ V92N.ofB[0] += dB[0]; V92N.ofB[1] += dB[1]; } else V92N.ofB = [0, 0];
  M.jog.forEach((q, i) => { const d = [antesJ[i][0] - q.x, antesJ[i][1] - q.y]; if (Math.hypot(d[0], d[1]) < tele) { V92N.ofJ[i][0] += d[0]; V92N.ofJ[i][1] += d[1]; } else V92N.ofJ[i] = [0, 0]; });
  const S = V92N.serv, t = performance.now();                    // o ritmo do servidor visto daqui (passos por segundo)
  if (S.k0 < 0 || t - S.t0 > 4000){ S.k0 = s.tick; S.t0 = t; } else if (t - S.t0 > 1000) S.tps = (s.tick - S.k0)*1000/(t - S.t0);
  V92.med.fila = V92N.pend.length; V92.med.tps = S.tps;
}

/* ---------------------------------------------------------------- 3) o desenho: a previsão + os deslizes */
function v92BolaPrevAgora(t){                                    // a bola da previsão daqui a t s (com as paredes, traves e rede da sala)
  const o = V92N.B2, b = V92N.M.B, C = V92N.C, G = V92N.M.G, lq = C.LIMIAR_QUIQUE;
  o.x = b.x; o.y = b.y; o.vx = b.vx; o.vy = b.vy; o.w = 0; o.r = b.r; o.m = b.m; o.I = b.I;
  if (!(t > 0) || Math.abs(o.vx) + Math.abs(o.vy) < 1) return o;
  o.x += o.vx*t; o.y += o.vy*t;
  for (const s of G.WALL_SEGS) V92_NUC.hitSeg(o, s[0], s[1], s[2], s[3], C.Q_PAREDE, 0, lq);
  V92_NUC.hitBox(o, G.GL, G.GT, G.GR, G.GB, C.Q_PAREDE, 0, lq);
  for (const p of G.POSTS) V92_NUC.hitPoint(o, p[0], p[1], G.POST_R, C.Q_TRAVE, 0, lq);
  for (const s of G.NET_SEGS) V92_NUC.hitSeg(o, s[0], s[1], s[2], s[3], C.Q_REDE, 0, lq);
  return o;
}
function v92Mostra(){
  const M = V92N.M, C = V92N.C, G = M.G, eu = M.jog[V92N.slot], agora = performance.now();
  const dt = V92N.tDraw ? Math.min(.1, (agora - V92N.tDraw)/1000) : 0; V92N.tDraw = agora;
  const k = Math.exp(-dt*1000/V92.cfg.tauCorr);                  // os deslizes somem em tauCorr ms
  V92N.ofP[0] *= k; V92N.ofP[1] *= k; V92N.ofB[0] *= k; V92N.ofB[1] *= k;
  for (const o of V92N.ofJ){ o[0] *= k; o[1] *= k; }
  const t = Math.max(0, Math.min(STEP, acc));                    // (o tempo desde o último passo previsto)
  // a sua tampinha: a previsão + a velocidade do próximo passo (o analógico de agora) + o deslize
  const d = V92_NUC.direcao(V92.ultInp.mx, V92.ultInp.my, C.DIRECOES), vale = M.estado === 'saida' || M.estado === 'jogo';
  let vx = 0, vy = 0;
  if (vale && (d.mx || d.my)){ vx = eu.vx + d.mx*C.VEL_JOG; vy = eu.vy + d.my*C.VEL_JOG; const v = Math.hypot(vx, vy); if (v > C.VEL_JOG){ vx *= C.VEL_JOG/v; vy *= C.VEL_JOG/v; } }
  P.x = Math.max(G.GL + eu.r, Math.min(G.GR - eu.r, eu.x + vx*t)) + V92N.ofP[0];
  P.y = Math.max(G.GT + eu.r, Math.min(G.GB - eu.r, eu.y + vy*t)) + V92N.ofP[1];
  P.vx = eu.vx; P.vy = eu.vy; P.ax = P.x; P.ay = P.y;
  // a bola
  const bp = v92BolaPrevAgora(t), px = bp.x + V92N.ofB[0], py = bp.y + V92N.ofB[1];
  const modo = V92.cfg.bolaPrev;
  if (modo === 'eu'){
    B.x = px; B.y = py; B.vx = M.B.vx; B.vy = M.B.vy;
    M.jog.forEach((q, i) => {                                    // os outros também na hora da previsão
      if (i === V92N.slot) return; const o = RQ.jog[i]; if (!o) return;
      o.x = o.ax = q.x + q.vx*t + V92N.ofJ[i][0]; o.y = o.ay = q.y + q.vy*t + V92N.ofJ[i][1]; o.vx = q.vx; o.vy = q.vy;
    });
    V92N.w = 1;
  } else if (modo === 'misto'){
    const sx = B.x, sy = B.y;                                    // (a bola do servidor, que o netSuaviza da v64 acabou de pôr no B)
    const b0 = M.B, dEu = Math.hypot(b0.x - eu.x, b0.y - eu.y);   // quem está mais perto da bola NA PREVISÃO (o mesmo tempo para todos)
    let dOut = 1e9; M.jog.forEach((q, i) => { if (i !== V92N.slot) dOut = Math.min(dOut, Math.hypot(b0.x - q.x, b0.y - q.y)); });
    const alvo = Math.max(0, Math.min(1, .5 + (dOut - dEu)/U(3)));
    V92N.w += (alvo - V92N.w)*(1 - Math.exp(-dt/.15));
    B.x = sx + (px - sx)*V92N.w; B.y = sy + (py - sy)*V92N.w;
  }
  // ('servidor': a bola fica a do netSuaviza, como na v91)
}
const v92DrawAntes = net49Draw;
net49Draw = function(dt){
  if (!v92RedeAtiva()) return v92DrawAntes.apply(this, arguments);
  if (!V92N.M || !V92N.M.jog[V92N.slot]){ V92N.on = false; return v92DrawAntes.apply(this, arguments); }   // (segurança: sem o mundo, o desenho da v91)
  netSuaviza();                                                  // (v64) a bola do servidor e os outros jogadores, lisos entre os quadros
  try { v92Mostra(); } catch (e) { v92RedeFalhou(e); }
  posVisual(1);
  VIS.px = P.x; VIS.py = P.y; VIS.bx = B.x; VIS.by = B.y;
  updateCamera(dt, false);
  spinBall(dt); render(dt);
};

/* ---------------------------------------------------------------- começo e fim da partida online */
const v92BeginAntes = net49Begin;
net49Begin = function(room){
  const r = v92BeginAntes.apply(this, arguments);
  try { v92RedeInicia(room); } catch (e) { V92N.on = false; console.error('v92 rede', e); }
  return r;
};
const v92NetStopAntes = x49NetStop;
x49NetStop = function(){
  const r = v92NetStopAntes.apply(this, arguments);
  V92N.on = false;
  if (V92N.aplicouSala){ V92N.aplicouSala = false; v92AplicaFisica(V92.cfg.fisica); }   // (o treino volta aos números do aparelho)
  return r;
};
