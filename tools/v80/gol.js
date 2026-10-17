/* ==================================================================================================================
   RACHA rua v80 · A ANIMAÇÃO DO GOL (no lugar da faixa de pixo da v61, a imagem que aparecia no gol)
   O pedido: "texto GOOOL! grande e estilizado, entrada rápida, efeitos de movimento, partículas discretas, o nome de quem
   marcou, as cores do time que marcou (Time A laranja, Time B roxo), duração curta; com cara de futebol de rua brasileiro,
   sem cara genérica e sem copiar a de outros jogos."
   · A FAIXA DE TORCIDA: um pano na cor do time, torto, com as duas listras claras, a franja nas pontas e a sombra dura,
     entra varrendo da esquerda com os riscos de velocidade.
   · O GOOOL!: letra por letra (os três Os cada vez maiores, como o grito do narrador que estica), caindo grandes e
     assentando; enquanto fica, uma onda passa pelas letras. Contorno grosso escuro e o degradê da cor do time.
   · A PLACA DO AUTOR: o nome de quem fez, e embaixo o passe, o desvio ou o gol contra (e as moedas do seu gol).
   · O PAPEL PICADO: umas poucas tiras na cor do time e brancas, saindo de trás da faixa (no lugar da chuva de confete
     da tela inteira no gol, que saiu; a do fim da partida continua).
   · Dura o mesmo 1,7 s da faixa de antes e sai para a direita. Com "Reduzir animações" só aparece e some (sem letras
     pulando, sem onda, sem papel picado). No treino o gol é do Time A (laranja) e o recado do exercício (NO ÂNGULO!,
     DE PRIMEIRA!) vai na placa. As peças viram imagens prontas uma vez por gol (o celular só cola as imagens).
   ================================================================================================================== */
const GOL80 = {d:null, k:'', img:null, part:[], semente:1, pt:-1, tUlt:Infinity};
const GOL80_COR = [                                       // o Time A (laranja) e o Time B (roxo)
  {base:'#ff6a00', claro:'#ffc58a', escuro:'#8a3300', faixa:'#ff7414', listra:'#ffb46e', fundo:'#5a2000'},
  {base:'#7a3fc4', claro:'#ddc4ff', escuro:'#2e0f59', faixa:'#8448d0', listra:'#c39cf5', fundo:'#24083f'}];
const GOL80_ESC = '#120a24';

function v80GolGuarda(I){                                // (no gol) quem fez, de que time e a linha de baixo
  const un = mdUn(I.jogo || 'futebol'), N = x => String(x || '').toUpperCase(), s = [];
  let nome = '';
  if (I.contra){ nome = un.contra; if (I.contraEu) s.push('FOI VOCÊ'); else if (I.contraDe) s.push('DE ' + N(I.contraDe)); }
  else {
    nome = N(I.autor);
    if (I.desvio) s.push('DESVIOU EM ' + N(I.desvio));
    if (I.assist) s.push('PASSE DE ' + N(I.assist));
    if (I.ginga) s.push('GOL DE GINGA · +' + (I.pts || 2));
    else if (I.jogo === 'basquete' && I.pts === 3) s.push('DE 3 PONTOS');
  }
  GOL80.d = {time:I.time ? 1 : 0, palavra:un.acao === 'GOL' ? 'GOOOL!' : un.acao + '!', nome, sub:s.join(' · '), nosso:!!I.nosso, at:performance.now()};
}
function v80GolDados(){                                  // o gol que está na tela agora
  if (RQ.on && GOL80.d) return GOL80.d;
  const tr = TR.on && TR.banner ? String(TR.banner).toUpperCase() : '';   // o treino (e o tutorial): o gol é seu, do Time A
  return {time:0, palavra:'GOOOL!', nome:String(perfil.nome || 'VOCÊ').toUpperCase(), sub:tr && !/^GOL!?$/.test(tr) ? tr : '', nosso:true, at:0};
}
// os ganchos: o gol de quem roda a partida (e contra os bots) e o gol que chega no quadro de quem joga de fora
const rqEventosAntes80 = rqEventos;
rqEventos = function(){
  const e = RQ.ev, gol = e && e.gol >= 0 ? {time:e.gol, autor:e.autor, assist:e.assist, contra:e.contra, contraDe:e.contraDe, desvio:e.desvio, pts:e.pts, ginga:e.ginga, contraH:e.contraH} : null;
  const r = rqEventosAntes80.apply(this, arguments);
  if (gol) try {
    v80GolGuarda({time:gol.time, jogo:RQ.jogo, pts:gol.pts, ginga:!!gol.ginga, contra:!!gol.contra, autor:rqNomeDe(gol.autor), assist:rqNomeDe(gol.assist),
      contraDe:rqNomeDe(gol.contraDe), desvio:rqNomeDe(gol.desvio), contraEu:!!gol.contraH, nosso:gol.time === (NET49.playing ? P.time : 0)});
  } catch (_) {}
  return r;
};
const net49SnapshotAntes80 = net49Snapshot;
net49Snapshot = function(s){
  const antes = NET49.lastScore ? NET49.lastScore.slice() : null;
  const r = net49SnapshotAntes80.apply(this, arguments);
  try {
    if (s && antes && !NET49.host && Array.isArray(s.score) && (s.score[0] !== antes[0] || s.score[1] !== antes[1]) && s.score[0] + s.score[1] > antes[0] + antes[1]){
      const t = s.score[0] > antes[0] ? 0 : 1, g = s.goal && s.goal.time === t ? s.goal : {}, esp = NET49.localSlot < 0;
      v80GolGuarda({time:t, jogo:g.jogo || RQ.jogo, pts:g.pts | 0, ginga:!!g.ginga, contra:!!g.contra, autor:g.name || '', assist:g.assistName || '',
        contraDe:g.contraName || '', desvio:g.desvioName || '', contraEu:!!g.contraBy && g.contraBy === NET49.id, nosso:!esp && P.time === t});
    }
  } catch (_) {}
  return r;
};
const spawnConfettiAntes80 = spawnConfetti;
spawnConfetti = function(){ if (goalT >= 0 && goalT < .05) return; return spawnConfettiAntes80.apply(this, arguments); };   // (no gol, o papel picado é o da animação)

/* ---------------------------------------------------------------- as peças prontas (uma vez por gol) */
function v80GolPecas(d, moedas){
  const C = GOL80_COR[d.time], k = K, fonte = n => n + 'px ' + FONT;
  const tela = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w*k)); c.height = Math.max(1, Math.ceil(h*k)); const g = c.getContext('2d'); g.scale(k, k); return {c, g, w, h}; };
  // as letras: cada uma com o contorno, a sombra dura, o degradê e o brilho (os Os crescem: o grito que estica)
  const letras = [], tam = d.palavra.length > 7 ? 132 : 172, chars = Array.from(d.palavra);
  let nO = 0;
  for (const ch of chars){
    const esc = ch === 'O' && d.palavra === 'GOOOL!' ? 1 + .09*(nO++) : 1, t = Math.round(tam*esc);
    ctx.save(); ctx.font = fonte(t); const adv = ctx.measureText(ch).width; ctx.restore();
    const L = tela(adv + 70, t*1.25 + 50), g = L.g, cx = L.w/2 - 6, cy = L.h/2 - 4;
    g.font = fonte(t); g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
    g.fillStyle = 'rgba(18,10,36,.6)'; g.strokeStyle = 'rgba(18,10,36,.6)'; g.lineWidth = t*.15; g.strokeText(ch, cx + 9, cy + 11); g.fillText(ch, cx + 9, cy + 11);   // a sombra dura
    g.strokeStyle = GOL80_ESC; g.lineWidth = t*.15; g.strokeText(ch, cx, cy);                                                                              // o contorno grosso
    const gr = g.createLinearGradient(0, cy - t*.42, 0, cy + t*.4); gr.addColorStop(0, C.claro); gr.addColorStop(.5, C.base); gr.addColorStop(1, C.escuro);
    g.fillStyle = gr; g.fillText(ch, cx, cy);
    g.save(); g.beginPath(); g.rect(0, 0, L.w, cy - t*.12); g.clip(); g.fillStyle = 'rgba(255,255,255,.3)'; g.fillText(ch, cx, cy); g.restore();   // o brilho de cima
    g.lineWidth = Math.max(2, t*.018); g.strokeStyle = 'rgba(255,255,255,.55)'; g.strokeText(ch, cx, cy);
    letras.push({c:L.c, w:L.w, h:L.h, adv:adv*.93, ox:L.w/2 - 6, oy:L.h/2 - 4});
  }
  const largura = letras.reduce((s, l) => s + l.adv, 0);
  // a faixa de torcida: o pano torto, as listras, a franja nas pontas e a sombra
  const fw = Math.max(760, largura + 250), fh = 168, F = tela(fw + 80, fh + 60), f = F.g, x0 = 40, y0 = 22, inc = 26;
  const pano = (dx, dy) => { f.beginPath(); f.moveTo(x0 + inc + dx, y0 + dy); f.lineTo(x0 + fw + dx, y0 + 8 + dy); f.lineTo(x0 + fw - inc + dx, y0 + fh + dy); f.lineTo(x0 + dx, y0 + fh - 8 + dy); f.closePath(); };
  pano(10, 12); f.fillStyle = 'rgba(18,10,36,.5)'; f.fill();
  pano(0, 0); f.fillStyle = C.faixa; f.fill();
  f.save(); pano(0, 0); f.clip();
  f.fillStyle = C.listra; f.fillRect(0, y0 + 16, F.w, 14); f.fillRect(0, y0 + fh - 30, F.w, 14);                         // as duas listras claras
  f.fillStyle = 'rgba(0,0,0,.12)'; for (let x = -fh; x < F.w; x += 46) { f.beginPath(); f.moveTo(x, y0 + fh); f.lineTo(x + 22, y0 + fh); f.lineTo(x + 22 + fh*.5, y0); f.lineTo(x + fh*.5, y0); f.closePath(); f.fill(); }   // a trama do pano
  const sombra = f.createLinearGradient(0, y0, 0, y0 + fh); sombra.addColorStop(0, 'rgba(255,255,255,.18)'); sombra.addColorStop(.5, 'rgba(255,255,255,0)'); sombra.addColorStop(1, 'rgba(0,0,0,.22)');
  f.fillStyle = sombra; f.fillRect(0, 0, F.w, F.h);
  f.restore();
  pano(0, 0); f.lineWidth = 6; f.lineJoin = 'round'; f.strokeStyle = GOL80_ESC; f.stroke();
  f.lineCap = 'round';
  for (const [xa, ya, xb, yb] of [[x0 + inc, y0, x0, y0 + fh - 8], [x0 + fw, y0 + 8, x0 + fw - inc, y0 + fh]]){   // a franja das pontas
    for (let i = 1; i < 9; i++){
      const u = i/9, x = xa + (xb - xa)*u, y = ya + (yb - ya)*u, lado = xa < x0 + fw/2 ? -1 : 1;
      f.strokeStyle = GOL80_ESC; f.lineWidth = 6; f.beginPath(); f.moveTo(x, y); f.lineTo(x + lado*18, y + 4); f.stroke();
      f.strokeStyle = C.listra; f.lineWidth = 3; f.beginPath(); f.moveTo(x, y); f.lineTo(x + lado*16, y + 4); f.stroke();
    }
  }
  // a placa do autor: o nome, a linha de baixo e as moedas do seu gol
  let placa = null;
  if (d.nome || d.sub){
    const nt = d.nome || d.sub, st = d.nome ? d.sub : '', wn = medeTxt(nt, fonte(46)), ws = st ? medeTxt(st, fonte(26)) : 0, wm = moedas > 0 ? 112 : 0;
    const pw = Math.max(wn + 60, ws + 40) + wm + 56, ph = st ? 100 : 70, Pq = tela(pw + 24, ph + 24), p = Pq.g;
    rr(p, 8, 10, pw, ph, 18); p.fillStyle = 'rgba(18,10,36,.45)'; p.fill();
    rr(p, 0, 0, pw, ph, 18); p.fillStyle = 'rgba(16,13,26,.93)'; p.fill(); p.lineWidth = 4; p.strokeStyle = GOL80_ESC; p.stroke();
    p.save(); rr(p, 0, 0, pw, ph, 18); p.clip(); p.fillStyle = C.base; p.fillRect(0, 0, 14, ph); p.restore();          // a beirada na cor do time
    const bx = 44, by = st ? 34 : ph/2;                                                                                  // a bolinha
    disco(p, bx, by, 15, '#f4f4f6'); p.lineWidth = 3; p.strokeStyle = GOL80_ESC; p.beginPath(); p.arc(bx, by, 15, 0, TAU); p.stroke();
    p.fillStyle = GOL80_ESC; p.beginPath(); for (let i = 0; i < 5; i++){ const a = -Math.PI/2 + i*TAU/5; p[i ? 'lineTo' : 'moveTo'](bx + Math.cos(a)*6, by + Math.sin(a)*6); } p.closePath(); p.fill();
    const tx = 68 + (pw - wm - 68)/2 - 10;
    txt(p, nt, tx, by + 2, 46, '#ffffff', GOL80_ESC, 6);
    if (st) txt(p, st, tx, 76, 26, C.claro, GOL80_ESC, 5);
    if (wm){ moedaIcone(p, pw - wm + 6, ph/2, 22); txt(p, '+' + moedas, pw - wm + 62, ph/2 + 2, 40, '#fff6b0', GOL80_ESC, 7); }
    placa = {c:Pq.c, w:Pq.w, h:Pq.h, pw, ph};
  }
  return {letras, largura, faixa:{c:F.c, w:F.w, h:F.h, fw, fh}, placa, tam};
}

/* ---------------------------------------------------------------- o quadro */
const v80Sai = u => 1 - Math.pow(1 - Math.max(0, Math.min(1, u)), 3);                      // (desacelera no fim)
const v80Volta = u => { u = Math.max(0, Math.min(1, u)); const c = 1.9; return 1 + (c + 1)*Math.pow(u - 1, 3) + c*Math.pow(u - 1, 2); };   // (passa um pouco e volta)
function v80GolParticulas(d){                            // o papel picado (o sorteio é só dele: o Math.random da partida fica igual)
  const C = GOL80_COR[d.time], rnd = rndFixo(++GOL80.semente*7919), cores = [C.base, C.claro, '#ffffff', C.listra];
  GOL80.part.length = 0;
  for (let i = 0; i < 18; i++){
    const a = -Math.PI/2 + (rnd() - .5)*2.6, v = 380 + rnd()*520;
    GOL80.part.push({x:(rnd() - .5)*360, y:(rnd() - .5)*60, vx:Math.cos(a)*v, vy:Math.sin(a)*v - 120, r:rnd()*6, vr:(rnd() - .5)*16, w:9 + rnd()*9, h:5 + rnd()*5, c:cores[i % 4]});
  }
}
drawBanner = function(){
  if (goalT < 0) return;
  const d = v80GolDados(), t = goalT, calmo = v70Calmo(), moedas = d.nosso && ganhoGol > 0 && !TR.banner ? ganhoGol : 0;
  const chave = [d.time, d.palavra, d.nome, d.sub, moedas, K.toFixed(4)].join('|'), novo = t < GOL80.tUlt;   // (novo: o goalT voltou para o começo)
  GOL80.tUlt = t;
  if (GOL80.k !== chave){ GOL80.k = chave; GOL80.img = v80GolPecas(d, moedas); }
  if (novo){ GOL80.pt = -1; if (!calmo && opc.efx) v80GolParticulas(d); else GOL80.part.length = 0; }
  const I = GOL80.img, u = 1/K, g = ctx, cx = W/2, cy = H/2 - 92;
  const fora = calmo ? 0 : v80Sai((t - 1.38)/.32)*W*.75, alfa = calmo ? Math.min(1, t/.12)*(t > 1.45 ? Math.max(0, 1 - (t - 1.45)/.25) : 1) : (t > 1.5 ? Math.max(0, 1 - (t - 1.5)/.2) : 1);
  g.save(); g.globalAlpha = alfa;
  // os riscos de velocidade (a entrada) e a faixa varrendo da esquerda
  if (!calmo && t < .34){
    const a0 = g.globalAlpha; g.lineCap = 'round';
    for (let i = 0; i < 6; i++){
      const yy = cy - 70 + i*28, p = v80Sai((t - i*.018)/.26), x1 = -200 + p*(W + 600), comp = 260 + (i % 3)*90;
      g.globalAlpha = a0*Math.max(0, .75 - p*.75); g.strokeStyle = i % 2 ? GOL80_COR[d.time].claro : '#ffffff'; g.lineWidth = 7 - (i % 3)*2;
      g.beginPath(); g.moveTo(x1 - comp, yy); g.lineTo(x1, yy); g.stroke();
    }
    g.globalAlpha = a0;
  }
  const pf = calmo ? 1 : v80Sai(t/.2), fx = cx + fora - (1 - pf)*W*.7, F = I.faixa;
  g.save(); g.translate(fx, cy); g.rotate(-.045); g.drawImage(F.c, -F.w/2, -F.h/2, F.c.width*u, F.c.height*u); g.restore();
  // o papel picado (de trás das letras)
  if (GOL80.part.length && t >= .1){
    const dt = GOL80.pt < 0 ? 0 : Math.max(0, Math.min(.05, t - GOL80.pt)); GOL80.pt = t;
    const a0 = g.globalAlpha;
    for (const q of GOL80.part){
      q.x += q.vx*dt; q.y += q.vy*dt; q.vy += 1100*dt; q.vx *= 1 - .9*dt; q.r += q.vr*dt;
      g.globalAlpha = a0*Math.max(0, Math.min(1, (1.35 - t)/.35));
      g.save(); g.translate(cx + fora + q.x, cy + q.y); g.rotate(q.r); g.fillStyle = q.c; g.fillRect(-q.w/2, -q.h/2, q.w, q.h); g.restore();
    }
    g.globalAlpha = a0;
  }
  // o GOOOL!: letra por letra, caindo e assentando; depois a onda
  let x = cx + fora - I.largura/2;
  for (let i = 0; i < I.letras.length; i++){
    const L = I.letras[i], lx = x + L.adv/2; x += L.adv;
    const t0 = .05 + i*.045, p = calmo ? 1 : Math.max(0, Math.min(1, (t - t0)/.17));
    if (p <= 0) continue;
    const s = calmo ? 1 : 2.1 - 1.1*v80Volta(p), rot = calmo ? 0 : (1 - v80Sai(p))*(i % 2 ? .3 : -.3), dy = calmo ? 0 : -70*(1 - v80Sai(p)) + (p >= 1 ? Math.sin(t*10 - i*.8)*5 : 0);
    g.save(); g.globalAlpha *= Math.min(1, p*3); g.translate(lx, cy + dy - 4); g.rotate(rot - .045); g.scale(s, s);
    g.drawImage(L.c, -L.ox, -L.oy, L.c.width*u, L.c.height*u); g.restore();
  }
  // a placa do autor (sobe um pouco depois das letras)
  if (I.placa){
    const p = calmo ? 1 : v80Sai((t - .28)/.18);
    if (p > 0){
      const Pq = I.placa;
      g.save(); g.globalAlpha *= p; g.translate(cx + fora + (1 - p)*60, cy + F.fh/2 + 18 + Pq.ph/2 + (1 - p)*30); g.rotate(.015);
      g.drawImage(Pq.c, -Pq.pw/2, -Pq.ph/2, Pq.c.width*u, Pq.c.height*u); g.restore();
    }
  }
  g.restore();
};

window.RachaGol80 = {dados:() => v80GolDados(), pecas:() => GOL80.img, particulas:() => GOL80.part.length, cores:GOL80_COR};
