/* ============================================================================
   RACHA · identidade de rua — cenário do lobby (SÓ VISUAL)
   Pinta o fundo do lobby: quadra de cimento gasta, muro grafitado, casas da
   comunidade, escadaria, postes e fios, gol improvisado, luz de fim de tarde.
   Chamado por cenaQuadra() (gancho de 1 linha). Não lê nem escreve nada da
   simulação, da física ou da rede. Se algo falhar aqui, o cenário antigo volta.
   ============================================================================ */
(function () {
  'use strict';

  var FONTE_TIT = '"Anton","Impact","Arial Black",sans-serif';
  var CASAS = ['#b8643c', '#d39a5f', '#a9a393', '#6f8077', '#9b5a46', '#d8c08f', '#8a6e5a', '#c98a52'];

  function rr_(g, x, y, w, h, r) {
    g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }

  function ceu(g, w, hz, cx) {
    var c = g.createLinearGradient(0, 0, 0, hz);
    c.addColorStop(0, '#273543'); c.addColorStop(.38, '#6d5a55'); c.addColorStop(.72, '#d08a52'); c.addColorStop(1, '#f0b66a');
    g.fillStyle = c; g.fillRect(0, 0, w, hz + 2);
    var sx = cx + 360, sy = hz - 70;                                   // sol baixo, atrás do morro
    var sol = g.createRadialGradient(sx, sy, 6, sx, sy, 340);
    sol.addColorStop(0, 'rgba(255,236,190,.95)'); sol.addColorStop(.12, 'rgba(255,210,140,.55)'); sol.addColorStop(1, 'rgba(255,170,90,0)');
    g.fillStyle = sol; g.fillRect(sx - 340, sy - 340, 680, 680);
    g.fillStyle = '#fff1cf'; g.beginPath(); g.arc(sx, sy, 34, 0, Math.PI * 2); g.fill();
  }

  function nuvens(g, w, hz, R) {
    for (var i = 0; i < 5; i++) {
      var nx = R() * w, ny = hz * (.16 + R() * .42), nw = 150 + R() * 280, nh = 8 + R() * 10;
      g.fillStyle = 'rgba(255,214,168,' + (.16 + R() * .14).toFixed(2) + ')';
      g.beginPath(); g.ellipse(nx, ny, nw, nh, 0, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.ellipse(nx + nw * .3, ny - nh * .6, nw * .5, nh * .8, 0, 0, Math.PI * 2); g.fill();
    }
  }

  // uma casinha da comunidade: bloco, laje, janela, porta, às vezes caixa d'água ou antena
  function casa(g, R, x, y, cw, ch, bruma) {
    var cor = CASAS[Math.floor(R() * CASAS.length)];
    g.fillStyle = cor; g.fillRect(x, y, cw, ch);
    g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(x + cw * .72, y, cw * .28, ch);                // lado na sombra
    g.fillStyle = '#4a4540'; g.fillRect(x - 2, y - 3, cw + 4, 4);                              // laje
    if (R() < .3) { g.fillStyle = '#3d6f8a'; g.fillRect(x + cw * .2, y - 14, 10, 11); g.fillStyle = '#2a2d2f'; g.fillRect(x + cw * .2, y - 16, 10, 3); }   // caixa d'água
    if (R() < .22) { g.fillStyle = '#2a2d2f'; g.fillRect(x + cw * .62, y - 20, 2, 17); g.fillRect(x + cw * .62 - 5, y - 17, 12, 2); }               // antena
    if (ch > 16 && cw > 14) { g.fillStyle = R() < .5 ? 'rgba(255,214,120,.75)' : 'rgba(30,32,34,.7)'; g.fillRect(x + cw * .18, y + ch * .24, 5, 6); }
    if (ch > 22 && cw > 20) { g.fillStyle = 'rgba(30,32,34,.55)'; g.fillRect(x + cw * .52, y + ch * .52, 6, ch * .48); }
    if (R() < .15) { g.fillStyle = ['#e8e1cf', '#c8452f', '#2f6e55'][Math.floor(R() * 3)]; g.fillRect(x + cw * .12, y + 3, 3, ch * .5); }       // roupa no varal
    g.fillStyle = bruma; g.fillRect(x - 2, y - 22, cw + 4, ch + 26);
  }

  function morro(g, R, w, hz, cx) {
    // morro da direita e da esquerda, com casas empilhadas
    function encosta(x0, x1, topo, dir) {
      g.fillStyle = '#4d3f37'; g.beginPath(); g.moveTo(x0, hz + 6);
      g.quadraticCurveTo((x0 + x1) / 2, topo - 40, x1, topo); g.lineTo(x1, hz + 6); g.closePath(); g.fill();
      var n = Math.floor(Math.abs(x1 - x0) / 11);
      for (var i = 0; i < n; i++) {
        var u = R(), x = Math.min(x0, x1) + u * Math.abs(x1 - x0), t = (x - x0) / (x1 - x0);
        var yTopo = hz - (hz - topo) * Math.sin(Math.max(0, Math.min(1, dir > 0 ? t : t)) * Math.PI * .55);
        var y = yTopo + 8 + R() * Math.max(2, hz - yTopo - 14);
        if (y > hz - 6) continue;
        casa(g, R, x, y, 14 + R() * 24, 11 + R() * 14, 'rgba(240,170,100,.16)');
      }
    }
    encosta(cx + 300, w + 60, hz - 230, 1);
    encosta(-60, cx - 520, hz - 150, 1);
  }

  function escadaria(g, hz, cx, w) {
    // escadaria que sobe o morro (direita): degraus claros com corrimão
    var x0 = cx + 420, y0 = hz + 2, passos = 14, dx = 26, dy = 11;
    for (var i = 0; i < passos; i++) {
      var x = x0 + i * dx, y = y0 - i * dy;
      if (x > w) break;
      g.fillStyle = 'rgba(214,200,172,.55)'; g.fillRect(x, y - 3, dx + 10, 4);
      g.fillStyle = 'rgba(70,58,48,.5)'; g.fillRect(x, y + 1, dx + 10, 3);
    }
    g.strokeStyle = 'rgba(40,40,42,.7)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x0, y0 - 18); g.lineTo(x0 + passos * dx, y0 - passos * dy - 18); g.stroke();
  }

  function predios(g, R, w, hz) {
    var x = -30;
    while (x < w + 30) {
      var pw = 40 + R() * 80, ph = 36 + R() * 90;
      g.fillStyle = 'rgba(88,66,58,.62)'; g.fillRect(x, hz - ph, pw, ph + 4);
      for (var yy = hz - ph + 10; yy < hz - 8; yy += 15) for (var xx = x + 7; xx < x + pw - 9; xx += 13) if (R() < .12) { g.fillStyle = 'rgba(255,214,130,.55)'; g.fillRect(xx, yy, 5, 6); }
      x += pw + R() * 10;
    }
  }

  function posteEFios(g, R, w, hz, muro, cx) {
    var xs = [cx - 760, cx - 300, cx + 120, cx + 560, cx + 980], topos = [];
    for (var i = 0; i < xs.length; i++) {
      var x = xs[i], t = hz - 250 - R() * 40;
      g.fillStyle = '#26282a'; g.fillRect(x - 4, t, 8, muro - t + 10);
      g.fillRect(x - 34, t + 16, 68, 5); g.fillRect(x - 26, t + 44, 52, 4);
      topos.push([x, t + 18]);
      g.fillStyle = '#3a3c3e'; g.fillRect(x - 3, t + 80, 3, 10);
    }
    g.strokeStyle = 'rgba(20,20,22,.78)'; g.lineWidth = 1.6;
    for (var k = 0; k < topos.length - 1; k++) for (var f = 0; f < 3; f++) {
      var a = topos[k], b = topos[k + 1], off = (f - 1) * 22, sag = 26 + f * 8 + R() * 6;
      g.beginPath(); g.moveTo(a[0] + off * .3, a[1] + (f ? 28 : 0));
      g.quadraticCurveTo((a[0] + b[0]) / 2, Math.max(a[1], b[1]) + sag + (f ? 28 : 0), b[0] + off * .3, b[1] + (f ? 28 : 0)); g.stroke();
    }
    // um par de tênis pendurado nos fios
    var a2 = topos[1], b2 = topos[2], mx = (a2[0] + b2[0]) / 2, my = Math.max(a2[1], b2[1]) + 26 + 2;
    g.strokeStyle = '#1b1c1e'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(mx, my); g.lineTo(mx, my + 14); g.stroke();
    g.fillStyle = '#e9e4d4'; rr_(g, mx - 11, my + 13, 22, 10, 4); g.fill(); g.fillStyle = '#d86a38'; g.fillRect(mx - 11, my + 19, 22, 4);
  }

  function alambrado(g, w, cerca, muro, cx) {
    g.save(); g.beginPath(); g.rect(0, cerca, w, muro - cerca); g.clip();
    g.fillStyle = 'rgba(20,18,16,.22)'; g.fillRect(0, cerca, w, muro - cerca);
    g.strokeStyle = 'rgba(214,208,196,.17)'; g.lineWidth = 1.5; g.beginPath();
    for (var x = -400; x < w + 400; x += 22) { g.moveTo(x, cerca); g.lineTo(x + (muro - cerca), muro); g.moveTo(x, cerca); g.lineTo(x - (muro - cerca), muro); }
    g.stroke(); g.restore();
    g.fillStyle = '#2d3031'; for (var x2 = (cx % 200) - 200; x2 < w + 200; x2 += 200) g.fillRect(x2 - 5, cerca - 8, 10, muro - cerca + 8);
    g.fillStyle = '#3d4143'; g.fillRect(0, cerca - 6, w, 7);
  }

  function muroConcreto(g, R, w, muro, chao) {
    var mg = g.createLinearGradient(0, muro, 0, chao); mg.addColorStop(0, '#77746a'); mg.addColorStop(1, '#4f4d46');
    g.fillStyle = mg; g.fillRect(0, muro, w, chao - muro + 2);
    for (var i = 0; i < 34; i++) { g.fillStyle = 'rgba(0,0,0,' + (.04 + R() * .08).toFixed(2) + ')'; g.fillRect(R() * w, muro + R() * (chao - muro), 30 + R() * 140, 2 + R() * 3); }
    for (var j = 0; j < 12; j++) { g.fillStyle = 'rgba(255,240,210,' + (.03 + R() * .05).toFixed(2) + ')'; g.fillRect(R() * w, muro + R() * (chao - muro), 20 + R() * 90, 3); }
    g.fillStyle = '#8c897d'; g.fillRect(0, muro - 6, w, 9);                                   // capa do muro
    // faixa pintada na base: verde campo + amarelo
    g.fillStyle = '#347c52'; g.fillRect(0, chao - 26, w, 14); g.fillStyle = '#f5c542'; g.fillRect(0, chao - 12, w, 6);
  }

  function pichoAvulso(g, R, w, muro, chao, zonas) {
    // tags e pinturas pequenas onde o muro está livre (bola, estrela, setas) — decoração pura
    var cores = ['#f5c542', '#d86a38', '#f3efe4', '#347c52'];
    for (var i = 0; i < zonas.length && i < 3; i++) {
      var z = zonas[i], x = z[0] + 26 + R() * Math.max(10, z[1] - z[0] - 80), y = muro + 118 - 20;
      if (z[1] - z[0] < 150) continue;
      g.save(); g.translate(x, y); g.rotate((R() - .5) * .3);
      g.strokeStyle = cores[i % 4]; g.lineWidth = 5; g.lineCap = 'round';
      g.beginPath(); g.moveTo(-18, 6); g.quadraticCurveTo(0, -18, 18, 4); g.stroke();
      g.beginPath(); g.arc(30, -4, 7, 0, Math.PI * 2); g.stroke();
      g.restore();
    }
  }

  function letreiroRacha(g, R, gcx, muro, tam) {
    var kt = tam / 108, y = muro + 66;
    g.save(); g.translate(gcx, y); g.rotate(-.05);
    g.font = Math.round(tam) + 'px ' + FONTE_TIT; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
    // mancha de tinta atrás (pintura de muro)
    var tw = g.measureText('RACHA').width;
    g.fillStyle = 'rgba(245,197,66,.20)'; rr_(g, -tw * .56, -tam * .58, tw * 1.12, tam * 1.16, 22 * kt); g.fill();
    // sombra deslocada, contorno e miolo — lettering de rua, sem neon
    g.lineWidth = 18 * kt; g.strokeStyle = '#141617'; g.strokeText('RACHA', 6 * kt, 7 * kt);
    g.lineWidth = 14 * kt; g.strokeStyle = '#171a1c'; g.strokeText('RACHA', 0, 0);
    g.fillStyle = '#d86a38'; g.fillText('RACHA', 5 * kt, 6 * kt);                              // sombra tijolo
    var lg = g.createLinearGradient(0, -tam * .5, 0, tam * .5); lg.addColorStop(0, '#fff6d2'); lg.addColorStop(.5, '#f5c542'); lg.addColorStop(1, '#d9a21f');
    g.fillStyle = lg; g.fillText('RACHA', 0, 0);
    g.lineWidth = 3 * kt; g.strokeStyle = 'rgba(23,26,28,.55)'; g.strokeText('RACHA', 0, 0);
    // escorridos de tinta
    for (var i = 0; i < 6; i++) {
      var dx = -tw * .42 + R() * tw * .84, dl = 8 + R() * 22 * kt;
      g.fillStyle = '#f5c542'; g.fillRect(dx, tam * .46, 4, dl); g.beginPath(); g.arc(dx + 2, tam * .46 + dl, 3, 0, Math.PI * 2); g.fill();
    }
    g.restore();
  }

  function placaRua(g, bcx, muro, bw) {
    g.save(); g.translate(bcx, muro + 60); g.scale(bw / 300, bw / 300);
    g.fillStyle = 'rgba(0,0,0,.28)'; rr_(g, -146, -40, 300, 92, 10); g.fill();
    g.fillStyle = '#f3efe4'; rr_(g, -150, -46, 300, 92, 10); g.fill();
    g.lineWidth = 5; g.strokeStyle = '#171a1c'; rr_(g, -150, -46, 300, 92, 10); g.stroke();
    g.fillStyle = '#347c52'; g.fillRect(-142, 30, 284, 8);
    g.font = '40px ' + FONTE_TIT; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = '#d86a38'; g.fillText('A RUA', 0, -17);
    g.fillStyle = '#171a1c'; g.fillText('É NOSSA', 0, 15);
    g.restore();
  }

  function chaoQuadra(g, R, w, h, chao, cx, esq, dir) {
    var ch = g.createLinearGradient(0, chao, 0, h); ch.addColorStop(0, '#6a6a64'); ch.addColorStop(.35, '#52544f'); ch.addColorStop(1, '#3a3d3c');
    g.fillStyle = ch; g.fillRect(0, chao, w, h - chao + 2);
    g.fillStyle = 'rgba(0,0,0,.30)'; g.fillRect(0, chao, w, 9);
    // luz quente de fim de tarde riscando o chão
    g.save(); g.globalCompositeOperation = 'lighter';
    var lg = g.createLinearGradient(0, chao, 0, h); lg.addColorStop(0, 'rgba(255,190,110,.16)'); lg.addColorStop(1, 'rgba(255,190,110,0)');
    g.fillStyle = lg; g.beginPath(); g.moveTo(cx + 120, chao); g.lineTo(cx + 520, chao); g.lineTo(cx - 60, h); g.lineTo(cx - 700, h); g.closePath(); g.fill();
    g.restore();
    // desgaste: manchas, remendos, rachaduras
    for (var i = 0; i < 70; i++) { var x = R() * w, y = chao + 14 + R() * (h - chao - 14), rx = 16 + R() * 90; g.fillStyle = 'rgba(20,20,18,' + (.05 + R() * .08).toFixed(2) + ')'; g.beginPath(); g.ellipse(x, y, rx, rx * .17, 0, 0, Math.PI * 2); g.fill(); }
    for (var j = 0; j < 8; j++) { var px = R() * w, py = chao + 20 + R() * (h - chao - 20), pw = 60 + R() * 140; g.fillStyle = 'rgba(120,118,108,.28)'; g.fillRect(px, py, pw, 10 + R() * 14); }
    g.strokeStyle = 'rgba(15,15,14,.38)'; g.lineWidth = 1.6;
    for (var k = 0; k < 9; k++) { var x0 = R() * w, y0 = chao + 20 + R() * (h - chao - 24); g.beginPath(); g.moveTo(x0, y0); for (var s = 0; s < 4; s++) { x0 += (R() - .35) * 70; y0 += (R() - .4) * 14; g.lineTo(x0, y0); } g.stroke(); }
    // linhas da quadra pintadas à mão (amarelo desbotado) + círculo do meio em volta da tampinha
    var yc = Math.min(chao + 56, chao + (h - chao) * .5);
    g.lineCap = 'round'; g.lineJoin = 'round';
    g.strokeStyle = 'rgba(245,197,66,.62)'; g.lineWidth = 6;
    g.beginPath(); g.ellipse(cx, yc, 330, 66, 0, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.moveTo(0, yc); g.lineTo(w, yc); g.stroke();
    g.lineWidth = 5; g.strokeStyle = 'rgba(243,239,228,.34)';
    for (var sd = -1; sd <= 1; sd += 2) {
      g.beginPath(); g.moveTo(cx + sd * (w * .3), chao + 14); g.lineTo(cx + sd * (w * .62) + sd * 120, h + 10); g.stroke();
      g.beginPath(); g.ellipse(cx + sd * (w * .5), yc, 150, 40, 0, sd > 0 ? Math.PI * .5 : -Math.PI * .5, sd > 0 ? Math.PI * 1.5 : Math.PI * .5); g.stroke();
    }
    // desgaste na tinta das linhas
    g.save(); g.globalCompositeOperation = 'destination-out'; g.globalAlpha = .55;
    for (var q = 0; q < 70; q++) { g.fillStyle = '#000'; g.fillRect(R() * w, yc - 80 + R() * 160, 6 + R() * 22, 3 + R() * 4); }
    g.restore();
  }

  // gol improvisado: dois chinelos de trave no chão da quadra, com a linha de giz entre eles
  function chinelo(g, x, y, cor) {
    g.save(); g.translate(x, y); g.rotate(-.35);
    g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(4, 9, 30, 8, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = cor; g.beginPath(); g.ellipse(0, 0, 26, 11, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#171a1c'; g.lineWidth = 3; g.stroke();
    g.fillStyle = '#f3efe4'; g.beginPath(); g.ellipse(-2, -1, 20, 6.5, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#f3efe4'; g.lineWidth = 4; g.beginPath(); g.moveTo(-8, -2); g.lineTo(6, -9); g.moveTo(-8, 2); g.lineTo(6, 9); g.stroke();
    g.restore();
  }
  function golImprovisado(g, x, y) {
    g.save(); g.strokeStyle = 'rgba(243,239,228,.55)'; g.lineWidth = 3; g.setLineDash([10, 9]); g.beginPath(); g.moveTo(x + 22, y); g.lineTo(x + 218, y); g.stroke(); g.restore();
    chinelo(g, x, y, '#d86a38'); chinelo(g, x + 240, y, '#347c52');
  }

  function caixaDeSom(g, chao, caixa) {
    g.fillStyle = 'rgba(0,0,0,.32)'; g.beginPath(); g.ellipse(caixa, chao + 54, 86, 12, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#26292b'; rr_(g, caixa - 80, chao - 18, 160, 70, 12); g.fill();
    g.strokeStyle = '#0f1011'; g.lineWidth = 4; rr_(g, caixa - 80, chao - 18, 160, 70, 12); g.stroke();
    g.strokeStyle = '#3c4143'; g.lineWidth = 6; g.beginPath(); g.moveTo(caixa - 50, chao - 18); g.quadraticCurveTo(caixa, chao - 52, caixa + 50, chao - 18); g.stroke();
    [-42, 42].forEach(function (dx) { g.fillStyle = '#0f1011'; g.beginPath(); g.arc(caixa + dx, chao + 17, 24, 0, Math.PI * 2); g.fill(); g.strokeStyle = '#575c5e'; g.lineWidth = 3; g.beginPath(); g.arc(caixa + dx, chao + 17, 16, 0, Math.PI * 2); g.stroke(); });
    g.fillStyle = '#d86a38'; g.fillRect(caixa - 12, chao, 24, 10);
  }

  var fonteOk = false;
  window.RUA_CENA = function (g, w, h, chao, cx, esq, dir, zonas, X) {
    try {
      if (!fonteOk) { fonteOk = true; try { document.fonts.load('100px Anton').then(function () { try { X.repinta(); } catch (_) {} }); } catch (_) {} }
      var R = X.rndFixo(2050), muro = chao - 118, cerca = muro - 150, hz = muro - 30, RB = X.RB;
      if (esq == null) { esq = 0; dir = w; }
      ceu(g, w, hz, cx); nuvens(g, w, hz, R);
      predios(g, R, w, hz);
      morro(g, R, w, hz, cx); escadaria(g, hz, cx, w);
      posteEFios(g, R, w, hz, muro, cx);
      alambrado(g, w, cerca, muro, cx);
      muroConcreto(g, R, w, muro, chao);

      var zs = (zonas || [[esq + 18, Math.max(esq + 218, cx - RB - 12)], [cx + RB * .95, Math.max(cx + RB * .95 + 180, dir - 18)]]).map(function (z) { return z.slice(); });
      g.save(); g.font = '100px ' + FONTE_TIT; var w100 = Math.max(1, g.measureText('RACHA').width); g.restore();
      if (zs.length === 1 && zs[0][1] - zs[0][0] >= 760) { var a = zs[0][0], b = zs[0][1], m = a + (b - a) * .6; zs = [[a, m], [m + 20, b]]; }
      var zg = zs.length && 100 * (zs[0][1] - zs[0][0] - 30) / w100 >= 30 ? zs.shift() : null;
      var zb = zs.length && zs[0][1] - zs[0][0] >= 180 ? zs.shift() : null;
      pichoAvulso(g, R, w, muro, chao, zs);
      if (zg) letreiroRacha(g, R, (zg[0] + zg[1]) / 2, muro, Math.max(30, Math.min(108, 100 * (zg[1] - zg[0] - 30) / w100)));
      if (zb) placaRua(g, (zb[0] + zb[1]) / 2, muro, Math.min(300, zb[1] - zb[0]));

      chaoQuadra(g, R, w, h, chao, cx, esq, dir);
      if (!X.ret && cx - RB - esq > 200) caixaDeSom(g, chao + 18, (esq + cx - RB) / 2);
      if (dir - cx > 760) golImprovisado(g, cx + w * .2, Math.min(chao + 118, chao + (h - chao) * .78));

      // camada escura para os menus ficarem legíveis + vinheta
      var esc = g.createLinearGradient(0, 0, 0, h); esc.addColorStop(0, 'rgba(23,26,28,.14)'); esc.addColorStop(.55, 'rgba(23,26,28,.08)'); esc.addColorStop(1, 'rgba(23,26,28,.5)');
      g.fillStyle = esc; g.fillRect(0, 0, w, h);
      var vg = g.createRadialGradient(cx, h * .48, Math.min(w, h) * .4, cx, h * .48, Math.max(w, h) * .8); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.42)');
      g.fillStyle = vg; g.fillRect(0, 0, w, h);
      return true;
    } catch (e) { window.RUA_ERRO = String(e && e.stack); return false; }                                  // qualquer erro: o cenário antigo assume
  };

})();
