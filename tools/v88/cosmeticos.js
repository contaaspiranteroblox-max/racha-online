/* ======================================================================================================================
   RACHA v88 · OS COSMÉTICOS (só aparência: nada aqui toca na física, no tamanho, na velocidade ou no chute — a igualdade
   entre os jogadores continua). Desenhados aqui mesmo, no estilo das tampinhas (contorno grosso, cor chapada), sem imagem
   de fora:
   · a BOLA equipada (você vê a sua bola nas suas partidas e no treino; a clássica é a padrão);
   · o EFEITO do chute (as partículas quando a bola sai do pé de quem tem o efeito);
   · a COMEMORAÇÃO (em cima da tampinha de quem marcou, durante o GOL!);
   · o efeito de GOL (na boca do gol, durante o GOL!);
   · o BANNER (o fundo do cartão do perfil) e o AVATAR (o desenho redondo nas listas e no perfil);
   · as miniaturas da loja, do correio, do passe e do inventário (v88MiniItem).
   Na partida online, cada um aparece com os cosméticos que a conta dele equipou (vêm assinados no cartão da sala); os bots
   não têm. Com os Efeitos na Quadra desligados (Ajustes), os efeitos de chute, comemoração e gol não aparecem.
   ====================================================================================================================== */
const V88C = {mini:new Map(), parts:[], festas:[], rnd:null};
V88C.rnd = (() => { let s = 88123; return () => { s = (s*1664525 + 1013904223) >>> 0; return s/4294967296; }; })();   // (o sorteio só dos efeitos: o Math.random da partida fica igual)

/* ---------------------------------------------------------------- 1) a bola */
function v88BolaPadrao(){ const it = v88Item(v88Equipado('bola')); return it && it.visual && it.visual.padrao !== 'classica' ? it : null; }
function v88DesenhaBolaJogo(g, x, y, r, it){              // a bola girando (os mesmos gomos da bola do jogo, nas cores do item)
  const V = it.visual || {}, base = V.base || '#ffffff', gomo = V.gomo || '#17181c', linha = V.linha || 'rgba(60,60,70,.55)';
  g.fillStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.ellipse(x + 3, y + 5, r*1.02, r*.92, 0, 0, TAU); g.fill();
  const gr = g.createRadialGradient(x - r*.35, y - r*.4, r*.1, x, y, r);
  gr.addColorStop(0, corMix(base, '#ffffff', .55)); gr.addColorStop(.7, base); gr.addColorStop(1, corMix(base, '#000000', .35));
  g.beginPath(); g.arc(x, y, r, 0, TAU); g.fillStyle = gr; g.fill();
  g.save(); g.beginPath(); g.arc(x, y, r, 0, TAU); g.clip();
  g.strokeStyle = linha; g.lineWidth = r*(V.padrao === 'costura' ? .1 : .08);
  if (V.padrao === 'costura') g.setLineDash([r*.18, r*.12]);
  for (const L of BALL_LINKS){
    const A = rot(BALL_PEN[L[0]][L[1]]), C = rot(BALL_PEN[L[2]][L[3]]);
    if (A[2] > 0.02 && C[2] > 0.02){ g.beginPath(); g.moveTo(x + A[0]*r, y + A[1]*r); g.lineTo(x + C[0]*r, y + C[1]*r); g.stroke(); }
  }
  g.setLineDash([]);
  g.fillStyle = gomo;
  for (let i = 0; i < 12; i++){
    const c = rot(BALL_N[i]);
    if (c[2] < -0.35) continue;
    if (V.padrao === 'estrelas'){                         // estrelinhas no lugar dos gomos
      const k = Math.max(0, c[2]), s = r*(.2 + .14*k);
      g.save(); g.translate(x + c[0]*r*.86, y + c[1]*r*.86); g.beginPath();
      for (let j = 0; j < 10; j++){ const a = j*Math.PI/5 - Math.PI/2, q = j % 2 ? s*.45 : s; g.lineTo(Math.cos(a)*q, Math.sin(a)*q); }
      g.closePath(); g.fill(); g.restore(); continue;
    }
    g.beginPath();
    for (let kk = 0; kk < 5; kk++){
      const p = rot(BALL_PEN[i][kk]); let px = p[0], py = p[1];
      if (p[2] < 0){ const l = Math.hypot(px, py) || 1; px /= l; py /= l; }
      if (kk === 0) g.moveTo(x + px*r, y + py*r); else g.lineTo(x + px*r, y + py*r);
    }
    g.closePath(); g.fill();
  }
  if (V.padrao === 'brilho'){                             // o brilho que corre na bola de ouro
    const t = performance.now()/900, bx = x + Math.cos(t)*r*.9;
    const sg = g.createLinearGradient(bx - r*.5, y - r, bx + r*.5, y + r);
    sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(.5, 'rgba(255,255,240,.55)'); sg.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = sg; g.fillRect(x - r, y - r, 2*r, 2*r);
  }
  const sh = g.createRadialGradient(x - r*.3, y - r*.35, r*.2, x, y, r*1.02);
  sh.addColorStop(0, 'rgba(255,255,255,.28)'); sh.addColorStop(.6, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,.36)');
  g.fillStyle = sh; g.fillRect(x - r, y - r, 2*r, 2*r);
  g.restore();
  g.lineWidth = r*.09; g.strokeStyle = 'rgba(20,20,25,.7)'; g.beginPath(); g.arc(x, y, r, 0, TAU); g.stroke();
}
const drawBallAntes88 = drawBall;
drawBall = function(g, x, y, r){
  const it = (RQ.on || TR.on || (typeof RP !== 'undefined' && RP.ativo)) ? v88BolaPadrao() : null;
  if (!it) return drawBallAntes88.apply(this, arguments);
  try { v88DesenhaBolaJogo(g, x, y, r, it); } catch (_) { drawBallAntes88.apply(this, arguments); }
};
function v88BolaParada(g, x, y, r, it){                    // a bola da miniatura (parada, de frente)
  const V = (it && it.visual) || {padrao:'classica'}, cl = V.padrao === 'classica';
  const base = cl ? '#ffffff' : V.base, gomo = cl ? '#17181c' : V.gomo, linha = cl ? 'rgba(60,60,70,.6)' : V.linha || 'rgba(0,0,0,.4)';
  const gr = g.createRadialGradient(x - r*.35, y - r*.4, r*.1, x, y, r);
  gr.addColorStop(0, corMix(base, '#ffffff', .5)); gr.addColorStop(.72, base); gr.addColorStop(1, corMix(base, '#000000', .35));
  g.beginPath(); g.arc(x, y, r, 0, TAU); g.fillStyle = gr; g.fill();
  g.save(); g.beginPath(); g.arc(x, y, r, 0, TAU); g.clip();
  const pent = (cx, cy, s, a0) => { g.beginPath(); for (let k = 0; k < 5; k++){ const a = a0 + k*TAU/5; g.lineTo(cx + Math.cos(a)*s, cy + Math.sin(a)*s); } g.closePath(); };
  const estrela = (cx, cy, s) => { g.beginPath(); for (let j = 0; j < 10; j++){ const a = j*Math.PI/5 - Math.PI/2, q = j % 2 ? s*.45 : s; g.lineTo(cx + Math.cos(a)*q, cy + Math.sin(a)*q); } g.closePath(); };
  const pontos = [[0, 0, .3]]; for (let k = 0; k < 5; k++){ const a = -Math.PI/2 + k*TAU/5; pontos.push([Math.cos(a)*.78, Math.sin(a)*.78, .24]); }
  g.strokeStyle = linha; g.lineWidth = r*(V.padrao === 'costura' ? .09 : .07); if (V.padrao === 'costura') g.setLineDash([r*.16, r*.1]);
  for (let k = 0; k < 5; k++){ const a = -Math.PI/2 + k*TAU/5; g.beginPath(); g.moveTo(x + Math.cos(a)*r*.3, y + Math.sin(a)*r*.3); g.lineTo(x + Math.cos(a)*r*.78, y + Math.sin(a)*r*.78); g.stroke(); }
  g.setLineDash([]);
  g.fillStyle = gomo;
  for (const [px, py, s] of pontos){ if (V.padrao === 'estrelas') estrela(x + px*r, y + py*r, s*r*1.1); else pent(x + px*r, y + py*r, s*r, -Math.PI/2 + (px || py ? Math.PI : 0)); g.fill(); }
  if (V.padrao === 'brilho'){ const sg = g.createLinearGradient(x - r, y - r, x + r, y + r); sg.addColorStop(.3, 'rgba(255,255,255,0)'); sg.addColorStop(.5, 'rgba(255,255,240,.6)'); sg.addColorStop(.7, 'rgba(255,255,255,0)'); g.fillStyle = sg; g.fillRect(x - r, y - r, 2*r, 2*r); }
  const sh = g.createRadialGradient(x - r*.3, y - r*.35, r*.2, x, y, r*1.02); sh.addColorStop(0, 'rgba(255,255,255,.3)'); sh.addColorStop(.6, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,.35)');
  g.fillStyle = sh; g.fillRect(x - r, y - r, 2*r, 2*r);
  g.restore();
  g.lineWidth = Math.max(2, r*.1); g.strokeStyle = V88_K; g.beginPath(); g.arc(x, y, r, 0, TAU); g.stroke();
}

/* ---------------------------------------------------------------- 2) as partículas (efeito do chute, comemoração e gol) */
function v88Cos(q){                                       // os cosméticos de quem joga: você (o equipado) ou, online, o do cartão da sala
  if (!q) return null;
  if (q === P && !(NET49.playing && NET49.localSlot < 0)) return v88Logado() ? V88.equip : null;
  if (NET49.playing && q.netId && NET49.room && Array.isArray(NET49.room.members)){ const m = NET49.room.members.find(x => x.id === q.netId); return m && m.cos ? m.cos : null; }
  return null;
}
function v88Efeitos(){ try { return opc.efx !== false && !CONTA.menosAnim; } catch (_) { return true; } }
function v88Solta(o){ V88C.parts.push(o); if (V88C.parts.length > 140) V88C.parts.splice(0, V88C.parts.length - 140); }
const fxChuteAntes88 = fxChute;
fxChute = function(q, forte, novo, bx, by, vx, vy){
  const r = fxChuteAntes88.apply(this, arguments);
  try {
    if (!q || novo === false || !v88Efeitos()) return r;
    const cos = v88Cos(q), it = cos && cos.efeito ? v88Item(cos.efeito) : null;
    if (!it || !it.visual || it.visual.tipo === 'nenhum') return r;
    if (bx == null){ bx = B.x; by = B.y; vx = B.vx; vy = B.vy; }
    const ang = Math.atan2(vy || 0, vx || 1), rb = B.r || 6, cores = it.visual.cores || ['#ffffff'], t = performance.now()/1000, R = V88C.rnd, n = forte ? 14 : 9;
    for (let i = 0; i < n; i++){
      const a = ang + Math.PI + (R() - .5)*(it.visual.tipo === 'raio' ? 1.2 : 2.2), v = rb*(1.5 + R()*3.5);
      v88Solta({tipo:it.visual.tipo, x:bx, y:by, dx:Math.cos(a)*v, dy:Math.sin(a)*v, t0:t, vida:.45 + R()*.4, s:rb*(.25 + R()*.35), cor:cores[i % cores.length], g:R()*TAU});
    }
  } catch (_) {}
  return r;
};
// o gol (quem marcou e o time): a comemoração em cima da tampinha dele e o efeito na boca do gol
function v88Festa(q, time){
  if (!v88Efeitos()) return;
  const cos = v88Cos(q), com = cos && cos.comemoracao ? v88Item(cos.comemoracao) : null, gol = cos && cos.gol ? v88Item(cos.gol) : null;
  const t = performance.now()/1000;
  if (com && com.visual && com.visual.tipo !== 'nenhuma') V88C.festas.push({k:'com', q, it:com, t0:t, vida:2});
  if (gol && gol.visual && gol.visual.tipo !== 'padrao'){
    const gx = time === 0 ? LX1 : LX0, f = {k:'gol', it:gol, t0:t, vida:2, x:gx, y:CY, lado:time === 0 ? 1 : -1};
    V88C.festas.push(f);
    const cores = gol.visual.cores || ['#ffffff'], R = V88C.rnd, rb = B.r || 6;
    if (gol.visual.tipo === 'confete' || gol.visual.tipo === 'explosao' || gol.visual.tipo === 'fogos'){
      const n = gol.visual.tipo === 'confete' ? 46 : 36;
      for (let i = 0; i < n; i++){
        const a = (gol.visual.tipo === 'confete' ? -Math.PI/2 : 0) + (R() - .5)*(gol.visual.tipo === 'confete' ? 2.4 : TAU), v = rb*(4 + R()*9);
        v88Solta({tipo:gol.visual.tipo === 'fogos' ? 'fogo' : gol.visual.tipo === 'confete' ? 'confete' : 'faisca', x:gx - f.lado*rb*3, y:CY + (R() - .5)*rb*6, dx:Math.cos(a)*v - f.lado*rb*3, dy:Math.sin(a)*v, t0:t + (gol.visual.tipo === 'fogos' ? (i % 4)*.18 : 0), vida:1.1 + R()*.7, s:rb*(.3 + R()*.4), cor:cores[i % cores.length], g:R()*TAU});
      }
    }
  }
  if (V88C.festas.length > 8) V88C.festas.splice(0, V88C.festas.length - 8);
}
const rqGolAntes88 = rqGol;
rqGol = function(lado){
  const antes = RQ.placar[0] + RQ.placar[1];
  const r = rqGolAntes88.apply(this, arguments);
  try { if (RQ.placar[0] + RQ.placar[1] !== antes && RQ.ev && RQ.ev.autor && !(NET49.playing && !NET49.host)) v88Festa(RQ.ev.autor, RQ.golTime); } catch (_) {}
  return r;
};
const net49SnapshotAntes88 = net49Snapshot;
net49Snapshot = function(s){
  const antes = (NET49.lastScore || [0, 0]).slice();
  const r = net49SnapshotAntes88.apply(this, arguments);
  try {
    if (s && Array.isArray(s.score) && (s.score[0] !== antes[0] || s.score[1] !== antes[1]) && s.goal && s.goal.author){
      const q = RQ.jog.find(x => x.netId === s.goal.author), time = s.score[0] > antes[0] ? 0 : 1;
      if (q) v88Festa(q, time);
    }
  } catch (_) {}
  return r;
};
function v88DesenhaMundo(g){                              // (no campo, por cima da bola: com a mesma câmera)
  const t = performance.now()/1000;
  if (V88C.parts.length){
    let j = 0;
    g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
    for (const d of V88C.parts){
      const u = (t - d.t0)/d.vida;
      if (u >= 1) continue;
      V88C.parts[j++] = d;
      if (u < 0) continue;
      const k = 1 - (1 - u)*(1 - u), x = d.x + d.dx*k, y = d.y + d.dy*k + (d.tipo === 'confete' ? d.s*12*u*u : 0);
      g.globalAlpha = Math.max(0, 1 - u*u);
      if (d.tipo === 'poeira'){ g.fillStyle = d.cor; g.beginPath(); g.arc(x, y, d.s*(1 + u*1.6), 0, TAU); g.fill(); }
      else if (d.tipo === 'faisca' || d.tipo === 'fogo'){ g.strokeStyle = d.cor; g.lineWidth = d.s*.5; g.beginPath(); g.moveTo(x - d.dx*.12, y - d.dy*.12); g.lineTo(x, y); g.stroke(); if (d.tipo === 'fogo' && u > .5){ g.fillStyle = d.cor; g.beginPath(); g.arc(x, y, d.s*.6*(1 - u), 0, TAU); g.fill(); } }
      else if (d.tipo === 'spray'){ g.fillStyle = d.cor; for (let i = 0; i < 3; i++){ g.beginPath(); g.arc(x + Math.cos(d.g + i*2)*d.s*.9, y + Math.sin(d.g + i*2)*d.s*.9, d.s*.32, 0, TAU); g.fill(); } }
      else if (d.tipo === 'raio'){ g.strokeStyle = d.cor; g.lineWidth = d.s*.35; g.beginPath(); g.moveTo(x, y); g.lineTo(x + d.s*1.2, y + d.s*.4); g.lineTo(x + d.s*.4, y + d.s*.9); g.lineTo(x + d.s*1.6, y + d.s*1.6); g.stroke(); }
      else if (d.tipo === 'estrelas'){ g.fillStyle = d.cor; g.save(); g.translate(x, y); g.rotate(d.g + u*4); g.beginPath(); for (let i = 0; i < 10; i++){ const a = i*Math.PI/5, q = i % 2 ? d.s*.45 : d.s; g.lineTo(Math.cos(a)*q, Math.sin(a)*q); } g.closePath(); g.fill(); g.restore(); }
      else if (d.tipo === 'confete'){ g.fillStyle = d.cor; g.save(); g.translate(x, y); g.rotate(d.g + u*9); g.fillRect(-d.s*.6, -d.s*.25, d.s*1.2, d.s*.5); g.restore(); }
      else { g.fillStyle = d.cor; g.beginPath(); g.arc(x, y, d.s*.5, 0, TAU); g.fill(); }
    }
    V88C.parts.length = j;
    g.restore();
  }
  if (V88C.festas.length){
    let j = 0;
    for (const f of V88C.festas){
      const u = (t - f.t0)/f.vida; if (u >= 1) continue; V88C.festas[j++] = f; if (u < 0) continue;
      try { if (f.k === 'com') v88DesenhaComemoracao(g, f, u, t); else v88DesenhaGol(g, f, u, t); } catch (_) {}
    }
    V88C.festas.length = j;
  }
}
function v88DesenhaComemoracao(g, f, u, t){
  const q = f.q, r = q.r || 14, x = q.x, y = q.y, V = f.it.visual, cores = V.cores || ['#ffd23f', '#ffffff'], a = Math.min(1, (1 - u)*4);
  g.save(); g.globalAlpha = a;
  if (V.tipo === 'pulo'){ for (let i = 0; i < 2; i++){ const k = (u*3 + i*.5) % 1; g.strokeStyle = '#ffffff'; g.lineWidth = r*.12; g.beginPath(); g.arc(x, y + r*.2, r*(1.1 + k*.9), Math.PI*1.1, Math.PI*1.9); g.globalAlpha = a*(1 - k); g.stroke(); } }
  else if (V.tipo === 'giro'){ g.translate(x, y); g.rotate(u*TAU*2); g.strokeStyle = '#ffd23f'; g.lineWidth = r*.16; g.beginPath(); g.arc(0, 0, r*1.45, 0, Math.PI*1.3); g.stroke(); g.beginPath(); g.moveTo(r*1.45*Math.cos(Math.PI*1.3) + r*.3, r*1.45*Math.sin(Math.PI*1.3)); g.lineTo(r*1.45*Math.cos(Math.PI*1.3), r*1.45*Math.sin(Math.PI*1.3)); g.lineTo(r*1.45*Math.cos(Math.PI*1.3) - r*.05, r*1.45*Math.sin(Math.PI*1.3) + r*.35); g.stroke(); }
  else if (V.tipo === 'coracao' || V.tipo === 'danca'){
    for (let i = 0; i < 5; i++){
      const k = (u*1.6 + i/5) % 1, px = x + Math.sin(i*2.1 + u*6)*r*1.1, py = y - r*.6 - k*r*2.6, s = r*.42*(1 - k*.4);
      g.globalAlpha = a*(1 - k); g.fillStyle = cores[i % cores.length];
      if (V.tipo === 'coracao'){ g.beginPath(); g.moveTo(px, py + s*.3); g.bezierCurveTo(px - s, py - s*.6, px - s*.2, py - s*1.1, px, py - s*.45); g.bezierCurveTo(px + s*.2, py - s*1.1, px + s, py - s*.6, px, py + s*.3); g.fill(); }
      else { g.beginPath(); g.ellipse(px, py, s*.42, s*.3, -.4, 0, TAU); g.fill(); g.fillRect(px + s*.3, py - s*1.2, s*.14, s*1.2); g.fillRect(px + s*.3, py - s*1.2, s*.5, s*.18); }
    }
  }
  else if (V.tipo === 'aviao'){ g.translate(x, y); g.rotate(Math.sin(u*8)*.25); g.fillStyle = cores[0]; g.strokeStyle = V88_K; g.lineWidth = r*.1; for (const sx of [-1, 1]){ g.beginPath(); g.moveTo(sx*r*.7, -r*.1); g.lineTo(sx*r*2.4, -r*.5 - Math.sin(u*10)*r*.2); g.lineTo(sx*r*2.3, r*.15); g.lineTo(sx*r*.7, r*.3); g.closePath(); g.fill(); g.stroke(); } }
  else if (V.tipo === 'coroa'){ const s = r*1.1, py = y - r*1.9 - Math.sin(u*9)*r*.12; g.fillStyle = cores[0]; g.strokeStyle = V88_K; g.lineWidth = r*.12; g.beginPath(); g.moveTo(x - s, py + s*.5); g.lineTo(x - s*.9, py - s*.35); g.lineTo(x - s*.4, py + s*.05); g.lineTo(x, py - s*.55); g.lineTo(x + s*.4, py + s*.05); g.lineTo(x + s*.9, py - s*.35); g.lineTo(x + s, py + s*.5); g.closePath(); g.fill(); g.stroke(); g.globalAlpha = a*(.5 + .5*Math.sin(t*12)); g.fillStyle = cores[1] || '#fff'; g.beginPath(); g.arc(x, py - s*.2, s*.16, 0, TAU); g.fill(); }
  g.restore();
}
function v88DesenhaGol(g, f, u, t){
  const V = f.it.visual, cores = V.cores || ['#ffffff'], rb = B.r || 6, x = f.x, y = f.y, a = Math.min(1, (1 - u)*3), L = f.lado;
  g.save(); g.globalAlpha = a;
  if (V.tipo === 'rede'){ g.strokeStyle = cores[0]; g.lineWidth = rb*.3; for (let i = 0; i < 4; i++){ const k = (u*2.2 + i*.25) % 1; g.globalAlpha = a*(1 - k); g.beginPath(); g.arc(x, y, rb*(3 + k*7), L > 0 ? -Math.PI/2.4 : Math.PI - Math.PI/2.4, L > 0 ? Math.PI/2.4 : Math.PI + Math.PI/2.4); g.stroke(); } }
  else if (V.tipo === 'grafite'){
    const s = rb*6*(.8 + Math.min(1, u*5)*.2), cx = x - L*rb*9;
    g.translate(cx, y); g.rotate(-.12);
    for (let i = 0; i < 9; i++){ g.fillStyle = cores[i % cores.length]; g.globalAlpha = a*.8; g.beginPath(); g.arc(Math.cos(i*1.7)*s*.9, Math.sin(i*2.3)*s*.45, s*(.12 + (i % 3)*.05), 0, TAU); g.fill(); }
    g.globalAlpha = a; g.font = '900 ' + Math.round(s) + 'px ' + (typeof FONT !== 'undefined' ? FONT : 'sans-serif'); g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = s*.16; g.strokeStyle = cores[2] || '#111'; g.strokeText('GOL!', 0, 0); g.fillStyle = cores[0]; g.fillText('GOL!', 0, 0);
  }
  else if (V.tipo === 'explosao' || V.tipo === 'fogos'){ const k = Math.min(1, u*2.5); g.fillStyle = cores[0]; g.globalAlpha = a*(1 - k)*.6; g.beginPath(); g.arc(x - L*rb*3, y, rb*(2 + k*10), 0, TAU); g.fill(); }
  g.restore();
}
const desenhaRespingosAntes88 = desenhaRespingos;
desenhaRespingos = function(g){ const r = desenhaRespingosAntes88.apply(this, arguments); try { v88DesenhaMundo(g); } catch (_) {} return r; };

/* ---------------------------------------------------------------- 3) o avatar e o banner */
function v88DesenhaAvatar(g, px, it){
  const V = (it && it.visual) || {}, c = V.cores || ['#2b3037', '#ffffff'], m = px/2, k = V88_K, lw = Math.max(2, px*.05);
  g.save(); g.clearRect(0, 0, px, px);
  g.beginPath(); g.arc(m, m, m - lw, 0, TAU); g.fillStyle = c[0]; g.fill();
  g.save(); g.beginPath(); g.arc(m, m, m - lw, 0, TAU); g.clip();
  const gr = g.createRadialGradient(m*.7, m*.6, m*.1, m, m, m); gr.addColorStop(0, 'rgba(255,255,255,.22)'); gr.addColorStop(1, 'rgba(0,0,0,.25)'); g.fillStyle = gr; g.fillRect(0, 0, px, px);
  g.fillStyle = c[1]; g.strokeStyle = k; g.lineWidth = lw; g.lineJoin = 'round';
  const d = V.desenho;
  if (d === 'bola') v88BolaParada(g, m, m, m*.6, null);
  else if (d === 'dez'){ g.font = '900 ' + Math.round(px*.5) + 'px ' + (typeof FONT !== 'undefined' ? FONT : 'sans-serif'); g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = px*.08; g.strokeText('10', m, m*1.06); g.fillText('10', m, m*1.06); }
  else if (d === 'brasil'){ g.fillStyle = c[1]; g.beginPath(); g.moveTo(m, m*.32); g.lineTo(m*1.72, m); g.lineTo(m, m*1.68); g.lineTo(m*.28, m); g.closePath(); g.fill(); g.stroke(); g.fillStyle = '#1b3fa0'; g.beginPath(); g.arc(m, m, m*.36, 0, TAU); g.fill(); g.stroke(); }
  else if (d === 'coroa'){ const s = m*.62; g.beginPath(); g.moveTo(m - s, m + s*.5); g.lineTo(m - s*.9, m - s*.4); g.lineTo(m - s*.4, m); g.lineTo(m, m - s*.6); g.lineTo(m + s*.4, m); g.lineTo(m + s*.9, m - s*.4); g.lineTo(m + s, m + s*.5); g.closePath(); g.fill(); g.stroke(); }
  else if (d === 'raio'){ g.beginPath(); g.moveTo(m*1.12, m*.3); g.lineTo(m*.55, m*1.08); g.lineTo(m*.98, m*1.08); g.lineTo(m*.82, m*1.72); g.lineTo(m*1.46, m*.86); g.lineTo(m*1.02, m*.86); g.closePath(); g.fill(); g.stroke(); }
  else if (d === 'chuteira'){ g.beginPath(); g.moveTo(m*.42, m*.52); g.lineTo(m*.95, m*.52); g.lineTo(m*1.05, m*1.0); g.quadraticCurveTo(m*1.62, m*1.02, m*1.62, m*1.32); g.lineTo(m*.42, m*1.32); g.closePath(); g.fill(); g.stroke(); g.fillStyle = k; for (let i = 0; i < 4; i++) g.fillRect(m*(.55 + i*.27), m*1.32, m*.1, m*.16); }
  else if (d === 'cristo'){ g.fillStyle = c[1]; g.beginPath(); g.moveTo(0, px); g.quadraticCurveTo(m*.6, m*1.1, m, m*1.15); g.quadraticCurveTo(m*1.4, m*1.1, px, px); g.fill(); g.fillStyle = '#1a1a1a'; g.fillRect(m - m*.06, m*.5, m*.12, m*.68); g.fillRect(m - m*.45, m*.62, m*.9, m*.1); g.beginPath(); g.arc(m, m*.44, m*.08, 0, TAU); g.fill(); }
  else if (d === 'trofeu'){ g.beginPath(); g.moveTo(m*.6, m*.4); g.lineTo(m*1.4, m*.4); g.lineTo(m*1.35, m*.85); g.quadraticCurveTo(m, m*1.25, m*.65, m*.85); g.closePath(); g.fill(); g.stroke(); g.fillRect(m*.9, m*1.1, m*.2, m*.25); g.strokeRect(m*.9, m*1.1, m*.2, m*.25); g.beginPath(); g.rect(m*.62, m*1.35, m*.76, m*.2); g.fill(); g.stroke(); }
  else if (d === 'estrela'){ g.beginPath(); for (let i = 0; i < 10; i++){ const a = i*Math.PI/5 - Math.PI/2, q = i % 2 ? m*.3 : m*.68; g.lineTo(m + Math.cos(a)*q, m + Math.sin(a)*q); } g.closePath(); g.fill(); g.stroke(); }
  else v88BolaParada(g, m, m, m*.6, null);
  g.restore();
  g.lineWidth = lw; g.strokeStyle = k; g.beginPath(); g.arc(m, m, m - lw, 0, TAU); g.stroke();
  g.restore();
}
function v88DesenhaBanner(g, w, h, it, t){                 // as cenas do banner (desenhadas aqui: a favela, o pôr do sol, o muro, o Cristo, a torcida, o carnaval)
  const V = (it && it.visual) || {cena:'laje'}, c = V.cores || ['#101a33', '#ffcf6b'];
  const gr = g.createLinearGradient(0, 0, 0, h);
  const casas = (cor, alt, sem) => { let s = sem; const R = () => { s = (s*9301 + 49297) % 233280; return s/233280; }; g.fillStyle = cor; let x = -10; while (x < w + 10){ const cw = 24 + R()*46, ch = h*alt*(.5 + R()*.6); g.fillRect(x, h - ch, cw, ch); x += cw + 2; } };
  const janelas = (cor, alt, sem) => { let s = sem; const R = () => { s = (s*9301 + 49297) % 233280; return s/233280; }; g.fillStyle = cor; for (let i = 0; i < 70; i++){ const x = R()*w, y = h - R()*h*alt; g.fillRect(x, y, 4, 4); } };
  const cristo = (x, y, s, cor) => { g.fillStyle = cor; g.beginPath(); g.moveTo(x - s*3, y + s*4); g.quadraticCurveTo(x, y - s*.5, x + s*3, y + s*4); g.fill(); g.fillRect(x - s*.15, y - s*1.9, s*.3, s*2); g.fillRect(x - s*1.1, y - s*1.6, s*2.2, s*.24); g.beginPath(); g.arc(x, y - s*2.1, s*.22, 0, TAU); g.fill(); };
  if (V.cena === 'por_do_sol'){ gr.addColorStop(0, '#3a1c4a'); gr.addColorStop(.55, c[0]); gr.addColorStop(1, '#ffd36b'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = '#ffe9a0'; g.beginPath(); g.arc(w*.7, h*.62, h*.22, 0, TAU); g.fill(); casas(c[1], .42, 7); }
  else if (V.cena === 'grafite'){ g.fillStyle = c[0]; g.fillRect(0, 0, w, h); const cs = ['#ff4fa3', '#3bc9db', '#ffd23f', '#69db7c', '#a259f0']; for (let i = 0; i < 26; i++){ g.fillStyle = cs[i % cs.length]; g.globalAlpha = .85; g.beginPath(); g.ellipse((i*97) % w, (i*53) % h, 20 + (i*13) % 50, 8 + (i*7) % 22, (i % 5)*.6, 0, TAU); g.fill(); } g.globalAlpha = 1; g.font = '900 ' + Math.round(h*.42) + 'px ' + (typeof FONT !== 'undefined' ? FONT : 'sans-serif'); g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = h*.06; g.strokeStyle = '#111'; g.strokeText('RACHA', w*.5, h*.52); g.fillStyle = '#ffd23f'; g.fillText('RACHA', w*.5, h*.52); }
  else if (V.cena === 'cristo'){ gr.addColorStop(0, '#1c2340'); gr.addColorStop(.6, c[0]); gr.addColorStop(1, '#ffcf6b'); g.fillStyle = gr; g.fillRect(0, 0, w, h); cristo(w*.62, h*.62, h*.12, '#1c1428'); casas('#241a30', .3, 11); janelas('#ffcf6b', .3, 5); }
  else if (V.cena === 'estadio'){ gr.addColorStop(0, '#0b1220'); gr.addColorStop(1, c[0]); g.fillStyle = gr; g.fillRect(0, 0, w, h); for (let i = 0; i < 4; i++){ const x = w*(.12 + i*.25); g.fillStyle = 'rgba(232,245,208,.18)'; g.beginPath(); g.moveTo(x, h*.1); g.lineTo(x - w*.12, h); g.lineTo(x + w*.12, h); g.fill(); g.fillStyle = c[1]; g.fillRect(x - 10, h*.08, 20, 8); } g.fillStyle = '#1a2a1a'; for (let i = 0; i < 90; i++){ g.beginPath(); g.arc((i*37) % w, h*.72 + (i % 3)*h*.08, 6, 0, TAU); g.fill(); } }
  else if (V.cena === 'carnaval'){ gr.addColorStop(0, c[0]); gr.addColorStop(1, '#2a0a4a'); g.fillStyle = gr; g.fillRect(0, 0, w, h); const cs = ['#ffd23f', '#ff4fa3', '#3bc9db', '#69db7c']; g.lineWidth = 4; for (let i = 0; i < 9; i++){ g.strokeStyle = cs[i % 4]; g.beginPath(); g.moveTo(0, h*(.1 + i*.1)); for (let x = 0; x <= w; x += 20) g.lineTo(x, h*(.1 + i*.1) + Math.sin(x*.05 + i)*10); g.stroke(); } for (let i = 0; i < 80; i++){ g.fillStyle = cs[i % 4]; g.fillRect((i*71) % w, (i*41) % h, 6, 4); } }
  else { gr.addColorStop(0, c[0]); gr.addColorStop(1, '#22304f'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(255,255,255,.7)'; for (let i = 0; i < 40; i++) g.fillRect((i*83) % w, (i*29) % (h*.5), 2, 2); casas('#0b1226', .55, 3); janelas(c[1], .5, 9); }
  const vg = g.createLinearGradient(0, 0, w, 0); vg.addColorStop(0, 'rgba(0,0,0,.45)'); vg.addColorStop(.45, 'rgba(0,0,0,0)'); g.fillStyle = vg; g.fillRect(0, 0, w, h);
}

/* ---------------------------------------------------------------- 4) as miniaturas (loja, correio, passe, inventário) */
function v88MiniItem(codigo, tam){
  const px = Math.round((tam || 96)*Math.min(2, window.devicePixelRatio || 1)), k = codigo + '|' + px;
  let src = V88C.mini.get(k);
  if (!src){
    src = document.createElement('canvas'); src.width = src.height = px;
    try { v88PintaMini(src.getContext('2d'), px, codigo); } catch (e) { console.error('mini ' + codigo, e); }
    if (V88C.mini.size > 300) V88C.mini.clear();
    V88C.mini.set(k, src);
  }
  const c = document.createElement('canvas'); c.width = c.height = px; c.className = 'v88-mini'; c.setAttribute('aria-hidden', 'true');
  c.getContext('2d').drawImage(src, 0, 0);
  return c;
}
function v88PintaMini(g, px, codigo){
  const m = px/2, k = V88_K, lw = Math.max(2, px*.045);
  if (/^peca:/.test(codigo)){ const D = TP_PADRAO_D(), t = codigo.slice(5, 6), id = codigo.slice(7); if (t === 'b') D.b = id; else if (t === 'p') D.p = id; else if (t === 'i') D.i = id; g.drawImage(tpMiniatura(D, px), 0, 0, px, px); return; }
  const pac = v88Pacote(codigo);
  if (pac){ const l = pac.itens.slice(0, 4); l.forEach((c, i) => { const s = px*.5; const cc = document.createElement('canvas'); cc.width = cc.height = Math.round(s); v88PintaMini(cc.getContext('2d'), Math.round(s), c); g.drawImage(cc, (i % 2)*s, Math.floor(i/2)*s, s, s); }); return; }
  const it = v88Item(codigo); if (!it) return;
  const V = it.visual || {};
  if (it.tipo === 'bola'){ v88BolaParada(g, m, m, m*.78, it); return; }
  if (it.tipo === 'tampinha' && V.d){ try { g.drawImage(tpMiniatura(tpNorm(tpD(V.d)), px), 0, 0, px, px); } catch (_) {} return; }
  if (it.tipo === 'avatar'){ if (V.desenho === 'tampinha'){ try { g.drawImage(tpMiniatura(tpLe(tpMinha()) || TP_PADRAO_D(), px), 0, 0, px, px); } catch (_) {} } else v88DesenhaAvatar(g, px, it); return; }
  if (it.tipo === 'banner'){ g.save(); g.beginPath(); g.roundRect ? g.roundRect(lw, px*.16, px - 2*lw, px*.68, px*.08) : g.rect(lw, px*.16, px - 2*lw, px*.68); g.clip(); g.translate(lw, px*.16); v88DesenhaBanner(g, px - 2*lw, px*.68, it, 0); g.restore(); g.lineWidth = lw; g.strokeStyle = k; g.beginPath(); g.roundRect ? g.roundRect(lw, px*.16, px - 2*lw, px*.68, px*.08) : g.rect(lw, px*.16, px - 2*lw, px*.68); g.stroke(); return; }
  if (it.tipo === 'caixa'){ g.fillStyle = it.raridade === 'raro' ? '#3b8cf0' : '#c98a0b'; g.strokeStyle = k; g.lineWidth = lw; g.beginPath(); g.moveTo(px*.14, px*.36); g.lineTo(m, px*.18); g.lineTo(px*.86, px*.36); g.lineTo(px*.86, px*.74); g.lineTo(m, px*.9); g.lineTo(px*.14, px*.74); g.closePath(); g.fill(); g.stroke(); g.beginPath(); g.moveTo(px*.14, px*.36); g.lineTo(m, px*.54); g.lineTo(px*.86, px*.36); g.moveTo(m, px*.54); g.lineTo(m, px*.9); g.stroke(); g.fillStyle = '#ffd23f'; g.fillRect(m - px*.06, px*.48, px*.12, px*.12); g.strokeRect(m - px*.06, px*.48, px*.12, px*.12); return; }
  const cores = V.cores || ['#ffd23f', '#ffffff'];
  g.save();
  if (it.tipo === 'efeito'){                                // a bola e o efeito em volta
    v88BolaParada(g, px*.6, px*.6, px*.22, null);
    const R = (() => { let s = 7; return () => { s = (s*16807) % 2147483647; return s/2147483647; }; })();
    for (let i = 0; i < 14; i++){
      const a = Math.PI*.95 + (R() - .5)*1.9, d = px*(.24 + R()*.22), x = px*.6 + Math.cos(a)*d, y = px*.6 + Math.sin(a)*d, s = px*(.03 + R()*.04);
      g.fillStyle = cores[i % cores.length]; g.strokeStyle = cores[i % cores.length]; g.lineWidth = s*.8;
      if (V.tipo === 'poeira'){ g.globalAlpha = .75; g.beginPath(); g.arc(x, y, s*1.6, 0, TAU); g.fill(); }
      else if (V.tipo === 'faisca'){ g.beginPath(); g.moveTo(x, y); g.lineTo(x - Math.cos(a)*s*3, y - Math.sin(a)*s*3); g.stroke(); }
      else if (V.tipo === 'spray'){ g.beginPath(); g.arc(x, y, s*.9, 0, TAU); g.fill(); }
      else if (V.tipo === 'raio'){ g.beginPath(); g.moveTo(x, y); g.lineTo(x + s*2, y + s); g.lineTo(x + s, y + s*2); g.lineTo(x + s*3, y + s*3); g.stroke(); }
      else if (V.tipo === 'estrelas'){ g.beginPath(); for (let j = 0; j < 10; j++){ const b = j*Math.PI/5, q = j % 2 ? s*.9 : s*2; g.lineTo(x + Math.cos(b)*q, y + Math.sin(b)*q); } g.closePath(); g.fill(); }
    }
    if (V.tipo === 'nenhum'){ g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = lw; g.beginPath(); g.arc(px*.6, px*.6, px*.32, 0, TAU); g.setLineDash([px*.05, px*.05]); g.stroke(); }
  } else if (it.tipo === 'comemoracao'){                    // a tampinha e a comemoração em cima
    try { g.drawImage(tpMiniatura(tpLe(tpMinha()) || TP_PADRAO_D(), Math.round(px*.56)), px*.22, px*.36, px*.56, px*.56); } catch (_) {}
    const f = {q:{x:m, y:px*.64, r:px*.2}, it, t0:0, vida:2};
    v88DesenhaComemoracao(g, f, V.tipo === 'pulo' ? .1 : .35, 1);
  } else if (it.tipo === 'gol'){                            // a trave com o efeito
    g.strokeStyle = '#f6f3ea'; g.lineWidth = lw*1.4; g.strokeRect(px*.12, px*.28, px*.76, px*.5);
    g.strokeStyle = 'rgba(246,243,234,.35)'; g.lineWidth = lw*.5; for (let i = 1; i < 6; i++){ g.beginPath(); g.moveTo(px*(.12 + i*.127), px*.28); g.lineTo(px*(.12 + i*.127), px*.78); g.stroke(); } for (let i = 1; i < 4; i++){ g.beginPath(); g.moveTo(px*.12, px*(.28 + i*.125)); g.lineTo(px*.88, px*(.28 + i*.125)); g.stroke(); }
    if (V.tipo === 'rede'){ g.strokeStyle = cores[0]; g.lineWidth = lw; for (let i = 0; i < 3; i++){ g.beginPath(); g.arc(m, px*.53, px*(.1 + i*.1), Math.PI*1.15, Math.PI*1.85); g.stroke(); } }
    else if (V.tipo === 'confete'){ for (let i = 0; i < 26; i++){ g.fillStyle = cores[i % cores.length]; g.save(); g.translate(px*(.1 + ((i*37) % 80)/100), px*(.08 + ((i*53) % 60)/100)); g.rotate(i); g.fillRect(-px*.02, -px*.01, px*.04, px*.02); g.restore(); } }
    else if (V.tipo === 'explosao' || V.tipo === 'fogos'){ for (let i = 0; i < 16; i++){ const a = i*TAU/16; g.strokeStyle = cores[i % cores.length]; g.lineWidth = lw; g.beginPath(); g.moveTo(m + Math.cos(a)*px*.08, px*.45 + Math.sin(a)*px*.08); g.lineTo(m + Math.cos(a)*px*.3, px*.45 + Math.sin(a)*px*.3); g.stroke(); } }
    else if (V.tipo === 'grafite'){ g.font = '900 ' + Math.round(px*.3) + 'px ' + (typeof FONT !== 'undefined' ? FONT : 'sans-serif'); g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = px*.05; g.strokeStyle = '#111'; g.strokeText('GOL!', m, px*.53); g.fillStyle = cores[0]; g.fillText('GOL!', m, px*.53); }
    else { g.font = '900 ' + Math.round(px*.22) + 'px ' + (typeof FONT !== 'undefined' ? FONT : 'sans-serif'); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#ffd23f'; g.strokeStyle = '#111'; g.lineWidth = px*.04; g.strokeText('GOOOL', m, px*.53); g.fillText('GOOOL', m, px*.53); }
    v88BolaParada(g, px*.62, px*.62, px*.08, null);
  }
  g.restore();
}
