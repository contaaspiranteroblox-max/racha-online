/* ============================================================================
   RACHA · lobby novo (SÓ INTERFACE)
   1) O fundo do lobby em desenho: o Cristo Redentor no alto do Corcovado, o
      morro com as casas coloridas da comunidade, o muro grafitado e a quadra
      verde com as áreas amarelas e o chão pintado de ondas.
   2) O layout no modelo de colunas: cartão do jogador, moedas/gemas e ícones em
      cima; CLUBE, REPLAYS, TREINAMENTO, LOJA, COMUNIDADE à esquerda; PASSE,
      RANQUEADA, RANKING, SALAS e o JOGAR grande à direita; DESAFIOS, CHAT e
      AMIGOS embaixo; a tampinha no meio com o RACHA carimbado em cima.
   Cada botão abre uma tela que já existe no jogo (pela ponte RUA_LOBBY_API).
   v71: a ARRUMAÇÃO e a cara dos botões mudaram (tools/v71/lobby.js e v71.css: botões quadrados, a LIGA no topo, o MODO
   colado no JOGAR); o fundo, as ações dos botões e o layout da tampinha no meio continuam aqui.
   Nada aqui mexe em partida, física, rede ou conta.
   ============================================================================ */
(function () {
  'use strict';
  var TAU = Math.PI * 2, TR = '#241d1a';

  function rnd(seed) { var s = seed >>> 0; return function () { s = (s + 0x6D2B79F5) >>> 0; var t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function pk(r, a) { return a[Math.floor(r() * a.length) % a.length]; }
  function contorno(g, lw, cor) { g.lineJoin = 'round'; g.lineCap = 'round'; g.strokeStyle = cor || TR; g.lineWidth = lw; g.stroke(); }
  function circ(g, x, y, R) { g.beginPath(); g.arc(x, y, R, 0, TAU); }
  function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

  /* ---------------------------------------------------------------- céu */
  function ceu(g, w, hz, cxC, topoC) {
    var c = g.createLinearGradient(0, 0, 0, hz);
    c.addColorStop(0, '#2d7fd0'); c.addColorStop(.45, '#62b6ec'); c.addColorStop(.8, '#bfe3f2'); c.addColorStop(1, '#ffe2ae');
    g.fillStyle = c; g.fillRect(0, 0, w, hz + 4);
    // a luz quente atrás do Cristo (fim de tarde)
    var gl = g.createRadialGradient(cxC, topoC + 40, 10, cxC, topoC + 40, 420);
    gl.addColorStop(0, 'rgba(255,236,190,.85)'); gl.addColorStop(.35, 'rgba(255,214,150,.35)'); gl.addColorStop(1, 'rgba(255,214,150,0)');
    g.fillStyle = gl; g.fillRect(cxC - 420, topoC - 380, 840, 840);
  }
  function nuvem(g, x, y, k) {
    var B = [[0, 0, 34], [36, -14, 30], [70, 0, 32], [36, 10, 30], [-30, 6, 24], [100, 8, 22]];
    g.save(); g.translate(x, y); g.scale(k, k);
    g.fillStyle = 'rgba(40,90,140,.18)'; B.forEach(function (b) { circ(g, b[0] + 6, b[1] + 8, b[2]); g.fill(); });
    g.beginPath(); B.forEach(function (b) { g.moveTo(b[0] + b[2], b[1]); g.arc(b[0], b[1], b[2], 0, TAU); });
    g.fillStyle = '#ffffff'; g.fill();
    g.fillStyle = 'rgba(150,195,230,.45)'; g.beginPath(); g.ellipse(36, 22, 80, 12, 0, 0, TAU); g.fill();
    g.restore();
  }
  function passaros(g, x, y, k) {
    g.save(); g.strokeStyle = 'rgba(30,40,55,.7)'; g.lineWidth = 2.2; g.lineCap = 'round';
    [[0, 0, 1], [26, -12, .8], [48, 4, .7]].forEach(function (p) {
      var s = 9 * p[2] * k; g.beginPath(); g.moveTo(x + p[0] - s, y + p[1] - s * .5); g.quadraticCurveTo(x + p[0] - s * .4, y + p[1] - s * .9, x + p[0], y + p[1]);
      g.quadraticCurveTo(x + p[0] + s * .4, y + p[1] - s * .9, x + p[0] + s, y + p[1] - s * .5); g.stroke();
    });
    g.restore();
  }

  /* ---------------------------------------------- o Corcovado e o Cristo */
  function corcovado(g, cx, pico, hz, larg) {
    var P = [[cx - larg, hz + 10], [cx - larg * .62, hz - (hz - pico) * .32], [cx - larg * .3, hz - (hz - pico) * .62], [cx - 70, pico + 46], [cx - 26, pico + 10],
      [cx + 20, pico + 4], [cx + 58, pico + 30], [cx + 120, pico + 104], [cx + larg * .42, hz - (hz - pico) * .46], [cx + larg * .7, hz - (hz - pico) * .2], [cx + larg, hz + 10]];
    var gr = g.createLinearGradient(0, pico, 0, hz);
    gr.addColorStop(0, '#3c6e5c'); gr.addColorStop(1, '#5b8f72');
    g.beginPath(); P.forEach(function (p, i) { if (i) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]); }); g.closePath();
    g.fillStyle = gr; g.fill(); contorno(g, 2.4);
    // a pedra exposta (o paredão do Corcovado) e a mata
    g.save(); g.clip();
    g.fillStyle = '#7f9a8a'; g.beginPath(); g.moveTo(cx - 60, pico + 40); g.lineTo(cx + 36, pico + 22); g.lineTo(cx + 96, pico + 120); g.lineTo(cx + 20, pico + 190); g.lineTo(cx - 40, pico + 140); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,255,255,.18)'; g.beginPath(); g.moveTo(cx - 60, pico + 40); g.lineTo(cx - 10, pico + 30); g.lineTo(cx - 8, pico + 150); g.lineTo(cx - 40, pico + 140); g.closePath(); g.fill();
    var r = rnd(77);
    for (var i = 0; i < 70; i++) { var x = cx - larg + r() * larg * 2, y = pico + 60 + r() * (hz - pico); g.fillStyle = r() < .5 ? 'rgba(30,70,45,.35)' : 'rgba(140,190,120,.25)'; circ(g, x, y, 6 + r() * 12); g.fill(); }
    g.fillStyle = 'rgba(200,230,240,.22)'; g.fillRect(cx - larg, pico, larg * 2, hz - pico);   // a névoa da distância
    g.restore();
  }
  function cristo(g, x, base, alt) {
    // o Cristo em silhueta de desenho: braços abertos com as mangas caindo, o manto abrindo para baixo,
    // a cabeça um pouco acima dos ombros; luz da esquerda e sombra na direita
    var k = alt / 100;
    g.save(); g.translate(x, base); g.scale(k, k);
    var hl = g.createRadialGradient(0, -64, 6, 0, -64, 104); hl.addColorStop(0, 'rgba(255,248,225,.8)'); hl.addColorStop(1, 'rgba(255,248,225,0)');
    g.fillStyle = hl; g.fillRect(-112, -172, 224, 224);
    // o mirante e o pedestal
    g.beginPath(); g.moveTo(-27, 5); g.lineTo(27, 5); g.lineTo(23, -1); g.lineTo(-23, -1); g.closePath(); g.fillStyle = '#c9c1b0'; g.fill(); contorno(g, 2);
    g.beginPath(); g.rect(-13, -16, 26, 15); g.fillStyle = '#ddd5c4'; g.fill();
    g.fillStyle = '#bdb3a1'; g.fillRect(4, -16, 9, 15);
    g.beginPath(); g.rect(-13, -16, 26, 15); contorno(g, 2.2);
    g.beginPath(); g.moveTo(-15, -16); g.lineTo(15, -16); contorno(g, 3);
    // a silhueta: braços, mangas e manto num traço só
    var S = [[-3, -86], [-8, -83.5], [-50, -80.5], [-55.5, -79], [-55, -75.5], [-45, -74.5], [-29, -70.5], [-16, -62.5], [-9.5, -55.5], [-9, -42], [-11, -25], [-12.5, -16.5]];
    var path = function () {
      g.beginPath(); S.forEach(function (p, i) { if (i) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]); });
      for (var i = S.length - 1; i >= 0; i--) g.lineTo(-S[i][0], S[i][1]);
      g.closePath();
    };
    var gr = g.createLinearGradient(-26, 0, 26, 0); gr.addColorStop(0, '#fbf8f0'); gr.addColorStop(.48, '#ece6d9'); gr.addColorStop(.56, '#cfc6b4'); gr.addColorStop(1, '#b7ad9a');
    path(); g.fillStyle = gr; g.fill();
    // as dobras: a manga caindo do braço, o cordão na cintura e o pano do manto
    g.save(); path(); g.clip();
    g.strokeStyle = 'rgba(70,58,45,.42)'; g.lineWidth = 1.3; g.lineCap = 'round';
    [-1, 1].forEach(function (sx) {
      g.beginPath(); g.moveTo(sx * 13, -66); g.quadraticCurveTo(sx * 26, -71.5, sx * 42, -76); g.stroke();
      g.beginPath(); g.moveTo(sx * 10, -73); g.quadraticCurveTo(sx * 20, -76, sx * 30, -77.5); g.stroke();
    });
    g.beginPath(); g.moveTo(-8.5, -51); g.quadraticCurveTo(0, -48.5, 8.5, -51); g.lineWidth = 1.6; g.stroke();
    g.lineWidth = 1.2; [[-4, -47, -6, -19], [1, -46, 1.5, -18], [5.5, -47, 8, -20]].forEach(function (d) { g.beginPath(); g.moveTo(d[0], d[1]); g.lineTo(d[2], d[3]); g.stroke(); });
    g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(-55, -80.5, 50, 1.6);   // o brilho em cima do braço
    g.restore();
    path(); contorno(g, 2.4);
    // a cabeça (um pouco inclinada) com a sombra do cabelo
    g.beginPath(); g.moveTo(-3.2, -86.5); g.lineTo(3.2, -86.5); g.lineTo(2.6, -83); g.lineTo(-2.6, -83); g.closePath(); g.fillStyle = '#d8d0bf'; g.fill();
    circ(g, .6, -92, 6.4); g.fillStyle = '#f1ece1'; g.fill();
    g.save(); circ(g, .6, -92, 6.4); g.clip(); g.fillStyle = '#c3baa8'; circ(g, 5.4, -92.5, 6.4); g.fill(); g.fillStyle = 'rgba(95,80,62,.45)'; g.fillRect(-6, -99, 13, 3.4); g.restore();
    circ(g, .6, -92, 6.4); contorno(g, 2.2);
    g.restore();
  }

  /* ------------------------------------------------------- a comunidade */
  var PAREDES = ['#e07a43', '#d0663a', '#3d8fd4', '#f2ede2', '#e88fb0', '#f2c74e', '#5fb07a', '#c9503b', '#3fb8b0', '#e9a35b', '#8fb7e0', '#f0d7a4'];
  function casa(g, r, x, y, w, h, k) {
    var cor = pk(r, PAREDES), tijolo = r() < .3;
    g.fillStyle = tijolo ? '#c8693b' : cor; g.fillRect(x, y, w, h);
    if (tijolo) { g.strokeStyle = 'rgba(110,45,20,.45)'; g.lineWidth = 1; g.beginPath(); for (var yy = y + 5 * k; yy < y + h; yy += 5 * k) { g.moveTo(x, yy); g.lineTo(x + w, yy); } g.stroke(); }
    g.fillStyle = 'rgba(0,0,0,.14)'; g.fillRect(x + w * .78, y, w * .22, h);                       // o lado na sombra
    g.fillStyle = '#8f8a80'; g.fillRect(x - 1.5 * k, y - 4 * k, w + 3 * k, 4.5 * k);                   // a laje
    g.beginPath(); g.rect(x - 1.5 * k, y - 4 * k, w + 3 * k, h + 4 * k); contorno(g, 1.6 * Math.max(.8, k));
    var n = Math.max(1, Math.floor(w / (13 * k))), jw = 6 * k, jh = 7 * k;
    for (var i = 0; i < n; i++) {
      var jx = x + (i + .5) * w / n - jw / 2, jy = y + h * .28;
      if (jy + jh > y + h - 2) continue;
      g.fillStyle = r() < .25 ? '#ffd98a' : '#2b3a4c'; g.fillRect(jx, jy, jw, jh);
      g.strokeStyle = '#f3efe2'; g.lineWidth = 1 * k; g.strokeRect(jx, jy, jw, jh);
    }
    if (h > 16 * k && r() < .5) { g.fillStyle = pk(r, ['#5a3a22', '#2f4f7f', '#7d8a8f', '#8c2f2f']); g.fillRect(x + w * .55, y + h - 10 * k, 6 * k, 10 * k); }
    if (r() < .32) {                                                                                   // a caixa d'água azul
      var cx = x + w * (.25 + r() * .5), cy = y - 4 * k;
      g.fillStyle = '#2f72d0'; g.fillRect(cx - 5 * k, cy - 7 * k, 10 * k, 7 * k); g.beginPath(); g.ellipse(cx, cy - 7 * k, 5 * k, 2 * k, 0, 0, TAU); g.fillStyle = '#5f9ff0'; g.fill();
      g.beginPath(); g.rect(cx - 5 * k, cy - 7 * k, 10 * k, 7 * k); contorno(g, 1.1);
    }
    if (r() < .14) { var vx = x + 2 * k, vy = y + h * .6; g.strokeStyle = 'rgba(30,30,30,.6)'; g.lineWidth = .8; g.beginPath(); g.moveTo(vx, vy); g.lineTo(vx + w * .6, vy); g.stroke();
      for (var q = 0; q < 3; q++) { g.fillStyle = pk(r, ['#e63946', '#f1faee', '#ffb703', '#2f73c4']); g.fillRect(vx + 3 * k + q * w * .18, vy, 4 * k, 5 * k); } }   // o varal
  }
  function morro(g, r, x0, x1, topo, hz, picoX, k0) {
    // a encosta: a terra e o mato, depois as casas em fileiras (de cima para baixo: as de baixo ficam na frente)
    var alt = function (x) { var t = (x - picoX) / ((x < picoX ? picoX - x0 : x1 - picoX) || 1); return hz - (hz - topo) * Math.max(0, 1 - t * t); };
    g.beginPath(); g.moveTo(x0, hz + 4); for (var x = x0; x <= x1; x += 8) g.lineTo(x, alt(x)); g.lineTo(x1, hz + 4); g.closePath();
    g.fillStyle = '#7d5a3f'; g.fill(); contorno(g, 2);
    for (var y = topo + 6; y < hz + 6; y += 15 * k0) {
      var p = (y - topo) / (hz - topo), k = k0 * (.55 + .6 * p), xx = x0 - 10;
      while (xx < x1) {
        var w = (16 + r() * 22) * k;
        if (alt(xx + w / 2) < y - 4 && xx + w > x0) casa(g, r, xx, y - (14 + r() * 8) * k, w, (16 + r() * 10) * k, k);
        xx += w + r() * 2;
      }
    }
  }
  function bandeirinhas(g, x0, y0, x1, y1, cai) {
    var n = Math.floor((x1 - x0) / 26), cores = ['#f4c51f', '#22924b', '#2f73c4', '#f3efe2', '#e2552f'];
    g.strokeStyle = 'rgba(36,29,26,.8)'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo((x0 + x1) / 2, Math.max(y0, y1) + cai, x1, y1); g.stroke();
    for (var i = 1; i < n; i++) {
      var t = i / n, x = (1 - t) * (1 - t) * x0 + 2 * t * (1 - t) * ((x0 + x1) / 2) + t * t * x1, y = (1 - t) * (1 - t) * y0 + 2 * t * (1 - t) * (Math.max(y0, y1) + cai) + t * t * y1;
      g.beginPath(); g.moveTo(x - 8, y); g.lineTo(x + 8, y); g.lineTo(x, y + 16); g.closePath(); g.fillStyle = cores[i % cores.length]; g.fill(); contorno(g, 1.1);
    }
  }

  /* ---------------------------------------------------- o muro grafitado */
  var MURAL = ['#2f7fc9', '#f4c51f', '#1e8a4a', '#e2552f', '#33a3a0', '#f08a2c', '#d63d5e', '#8fc93a'];
  function rosto(g, r, x, y, s) {
    var R = s * .4, c1 = pk(r, MURAL), c2 = pk(r, MURAL);
    for (var i = 0; i <= 10; i++) { var a = Math.PI * (1.02 + i * .096), L = R * (1.45 + (i % 2) * .25);
      g.beginPath(); g.moveTo(x + Math.cos(a - .14) * R * .9, y + Math.sin(a - .14) * R * .9); g.lineTo(x + Math.cos(a) * L, y + Math.sin(a) * L); g.lineTo(x + Math.cos(a + .14) * R * .9, y + Math.sin(a + .14) * R * .9); g.closePath();
      g.fillStyle = i % 2 ? c2 : '#f4c51f'; g.fill(); contorno(g, 1.4); }
    circ(g, x, y, R); g.fillStyle = c1; g.fill(); contorno(g, 2.2);
    [-1, 1].forEach(function (e) { g.beginPath(); g.ellipse(x + e * R * .38, y - R * .1, R * .25, R * .19, 0, 0, TAU); g.fillStyle = '#fff'; g.fill(); contorno(g, 1.4); circ(g, x + e * R * .38 + R * .05, y - R * .08, R * .1); g.fillStyle = TR; g.fill(); });
    g.beginPath(); g.arc(x, y + R * .22, R * .38, .2 * Math.PI, .8 * Math.PI); contorno(g, 2.4, '#b3261e');
  }
  function sol(g, r, x, y, s) {
    var R = s * .27;
    for (var i = 0; i < 14; i++) { var a = i * TAU / 14, L = R * (1.7 + (i % 2) * .35);
      g.beginPath(); g.moveTo(x + Math.cos(a - .18) * R, y + Math.sin(a - .18) * R); g.lineTo(x + Math.cos(a) * L, y + Math.sin(a) * L); g.lineTo(x + Math.cos(a + .18) * R, y + Math.sin(a + .18) * R); g.closePath();
      g.fillStyle = i % 2 ? '#e2552f' : '#f4c51f'; g.fill(); contorno(g, 1.2); }
    circ(g, x, y, R); g.fillStyle = '#f8d23a'; g.fill(); contorno(g, 2);
  }
  function bandeira(g, r, x, y, s) {
    var w = s * 1.4, h = s * .92;
    g.save(); g.translate(x, y); g.rotate((r() - .5) * .12);
    g.beginPath(); g.rect(-w / 2, -h / 2, w, h); g.fillStyle = '#1e8a4a'; g.fill(); contorno(g, 2.2);
    g.beginPath(); g.moveTo(0, -h * .4); g.lineTo(w * .42, 0); g.lineTo(0, h * .4); g.lineTo(-w * .42, 0); g.closePath(); g.fillStyle = '#f4c51f'; g.fill(); contorno(g, 1.4);
    circ(g, 0, 0, h * .25); g.fillStyle = '#2563b5'; g.fill(); contorno(g, 1.4);
    g.restore();
  }
  function espiral(g, r, x, y, s) {
    var R = s * .4; circ(g, x, y, R); g.fillStyle = pk(r, MURAL); g.fill(); contorno(g, 2);
    g.beginPath(); for (var t = 0; t < 3.2 * TAU; t += .25) { var q = R * .9 * t / (3.2 * TAU); if (!t) g.moveTo(x, y); else g.lineTo(x + Math.cos(t) * q, y + Math.sin(t) * q); }
    contorno(g, s * .07, '#f3efe2');
  }
  function muro(g, r, w, y0, y1) {
    var h = y1 - y0, x = -10;
    while (x < w + 10) { var bw = 70 + r() * 110; g.fillStyle = pk(r, MURAL); g.fillRect(x, y0, bw + 1, h); x += bw; }
    // as ondas grandes pintadas atravessando o muro
    [['#f3efe2', .32, .16, 190], ['#f4c51f', .66, .18, 230], ['#1e8a4a', .88, .1, 150]].forEach(function (o, i) {
      g.beginPath();
      for (var xx = -10; xx <= w + 10; xx += 8) { var yy = y0 + h * o[1] + h * o[2] * Math.sin(xx / o[3] + i * 2) - h * .08; if (xx === -10) g.moveTo(xx, yy); else g.lineTo(xx, yy); }
      for (xx = w + 10; xx >= -10; xx -= 8) g.lineTo(xx, y0 + h * o[1] + h * o[2] * Math.sin(xx / o[3] + i * 2 + .6) + h * .08);
      g.closePath(); g.fillStyle = o[0]; g.fill(); contorno(g, 1.6);
    });
    var M = [rosto, sol, bandeira, espiral, rosto, sol], s0 = h * .7, xm = 30 + r() * 40, k = 0;
    while (xm < w - 40) { var f = M[k++ % M.length], s = s0 * (.85 + r() * .25), lg = f === bandeira ? s * 1.4 : s; f(g, r, xm + lg / 2, y0 + h * .52, s); xm += lg + 40 + r() * 70; }
    g.fillStyle = '#c9c2b2'; g.fillRect(-10, y0 - 9, w + 20, 10); g.beginPath(); g.rect(-10, y0 - 9, w + 20, 10); contorno(g, 1.8);   // o topo do muro
    var gs = g.createLinearGradient(0, y1 - 26, 0, y1); gs.addColorStop(0, 'rgba(30,20,10,0)'); gs.addColorStop(1, 'rgba(30,20,10,.4)'); g.fillStyle = gs; g.fillRect(-10, y1 - 26, w + 20, 26);
  }

  /* ------------------------------------------------------------ a quadra */
  function quadra(g, w, h, y1, cx, yc, retrato) {
    // o chão pintado de ondas entre o muro e a quadra
    var faixa = 46;
    g.fillStyle = '#22924b'; g.fillRect(0, y1, w, faixa);
    [['#f4c51f', 14, 11, 90], ['#f3efe2', 24, 6, 120], ['#2f73c4', 31, 7, 100], ['#f4c51f', 40, 8, 80]].forEach(function (o, i) {
      g.beginPath();
      for (var x = -10; x <= w + 10; x += 8) { var y = y1 + o[1] + o[2] * Math.sin(x / o[3] + i * 1.7) - 4; if (x === -10) g.moveTo(x, y); else g.lineTo(x, y); }
      for (x = w + 10; x >= -10; x -= 8) g.lineTo(x, y1 + o[1] + o[2] * Math.sin(x / o[3] + i * 1.7 + .5) + 4);
      g.closePath(); g.fillStyle = o[0]; g.fill();
    });
    // a quadra verde
    var q0 = y1 + faixa;
    var gq = g.createLinearGradient(0, q0, 0, h); gq.addColorStop(0, '#2f8f58'); gq.addColorStop(1, '#25784a');
    g.fillStyle = gq; g.fillRect(0, q0, w, h - q0);
    g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(0, q0, w, 6);
    // as áreas amarelas nas pontas (em perspectiva)
    g.fillStyle = '#f2c12e';
    [[-1, 0], [1, w]].forEach(function (s) {
      var xb = s[1], larg0 = retrato ? w * .1 : Math.min(360, w * .2), larg1 = larg0 * (retrato ? 1.25 : 1.6);
      g.beginPath(); g.moveTo(xb, q0 + 8); g.lineTo(xb - s[0] * larg0, q0 + 8); g.lineTo(xb - s[0] * larg1, h); g.lineTo(xb, h); g.closePath(); g.fill();
    });
    // as linhas brancas
    g.strokeStyle = 'rgba(246,244,236,.92)'; g.lineWidth = 5; g.lineCap = 'round';
    g.beginPath(); g.moveTo(0, q0 + 8); g.lineTo(w, q0 + 8); g.stroke();
    g.beginPath(); g.moveTo(cx, q0 + 8); g.lineTo(cx, h); g.stroke();
    g.beginPath(); g.ellipse(cx, yc, 320, 70, 0, 0, TAU); g.stroke();
    [[-1, 0], [1, w]].forEach(function (s) {
      var xb = s[1], larg0 = retrato ? w * .1 : Math.min(360, w * .2);
      g.beginPath(); g.moveTo(xb - s[0] * larg0, q0 + 8); g.lineTo(xb - s[0] * larg0 * (retrato ? 1.25 : 1.6), h); g.stroke();
      g.beginPath(); g.ellipse(xb - s[0] * larg0 * 1.25, yc + 30, 90, 46, 0, s[0] < 0 ? -Math.PI / 2 : Math.PI / 2, s[0] < 0 ? Math.PI / 2 : Math.PI * 1.5); g.stroke();
    });
    // desgaste da tinta e a luz
    var r = rnd(9);
    for (var i = 0; i < 40; i++) { g.fillStyle = 'rgba(255,255,255,.05)'; g.beginPath(); g.ellipse(r() * w, q0 + 20 + r() * (h - q0), 20 + r() * 70, 6 + r() * 10, 0, 0, TAU); g.fill(); }
    var luz = g.createRadialGradient(cx, yc, 40, cx, yc, 520); luz.addColorStop(0, 'rgba(255,240,200,.22)'); luz.addColorStop(1, 'rgba(255,240,200,0)');
    g.fillStyle = luz; g.fillRect(cx - 520, yc - 520, 1040, 1040);
  }

  /* ------------------------------------------------------- o fundo todo */
  window.RUA_CENA = function (g, w, h, chao, cx, esq, dir, zonas, X) {
    try {
      var cy = chao - 92, retrato = !!(X && X.ret) || h > w * 1.05;   // o centro da tampinha; em pé o desenho se ajeita
      var y1 = chao - 52, y0 = chao - 177;                 // o muro: do topo (y0) ao pé (y1)
      var oy = (X && X.oy) || 0;                           // a área segura de cima (o entalhe do celular)
      var col = w < 1640 ? 424 : 468, off = Math.max(222, Math.min(330, (w / 2 - col) * .62));   // o Cristo à direita do RACHA, sem encostar na coluna
      var xC, pico, alto;
      if (retrato) {
        // em pé, o céu livre é o canto de cima à direita do cartão do jogador: o Cristo fica ali,
        // com o pé do Corcovado escondido atrás da fileira das moedas e descendo até o muro
        xC = cx + 250; alto = 124; pico = oy + 136;
      } else { xC = cx + off; alto = Math.min(170, Math.max(110, (cy - 120) * .4)); pico = cy - 230; }
      ceu(g, w, y0, xC, pico - alto);
      if (retrato) { nuvem(g, cx + 92, oy + 50, .6); nuvem(g, cx + 372, oy + 92, .5); nuvem(g, cx - 330, oy + 150, .8); passaros(g, xC + 92, pico - alto + 22, .8); }
      else {
        nuvem(g, cx - w * .33, h * .1, 1.1); nuvem(g, cx + w * .3, h * .07, .8); nuvem(g, cx - w * .06, h * .17, .6); nuvem(g, cx + w * .44, h * .22, .9);
        passaros(g, xC - 150, pico - alto + 30, 1);
      }
      corcovado(g, xC, pico, y0 + 10, retrato ? 300 : Math.min(430, w * .23));
      cristo(g, xC, pico + 4, alto);
      var r = rnd(2026);
      var picoF = retrato ? y0 - 150 : y0 - 220;
      morro(g, r, -40, cx + 60, picoF, y0 + 4, retrato ? cx - w * .28 : cx - off, 1.35);           // o morro da favela (à esquerda do meio)
      morro(g, r, cx - 30, w + 40, y0 - (retrato ? 70 : 80), y0 + 4, xC + off * 1.15, 1.3);      // o morro da direita, na frente do pé do Corcovado
      morro(g, r, cx - 260, cx + 260, y0 - 54, y0 + 4, cx, 1.15);                                  // as casas baixas atrás do muro
      bandeirinhas(g, cx - w * .46, y0 - 92, cx + w * .46, y0 - 104, 48);
      muro(g, r, w, y0, y1);
      quadra(g, w, h, y1, cx, Math.min(chao + 56, chao + (h - chao) * .5), retrato);
      var vg = g.createRadialGradient(cx, h * .5, Math.min(w, h) * .45, cx, h * .5, Math.max(w, h) * .85);
      vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(10,14,30,.35)');
      g.fillStyle = vg; g.fillRect(0, 0, w, h);
      return true;
    } catch (e) { window.RUA_ERRO = String(e && e.stack); return false; }
  };

  /* ------------------------------------------- o fundo da SALA (v68) */
  // A sala da partida (Time Preto · Espectadores · Time Branco) em cima da favela: o céu de fim de tarde, o Cristo no
  // Corcovado à direita e os morros com as casas coloridas descendo até embaixo. w × h em px do palco.
  window.RUA_FAVELA = function (g, w, h) {
    try {
      var xC = w * .74, alto = Math.max(120, Math.min(220, h * .26)), pico = h * .4;
      ceu(g, w, h, xC, pico - alto);
      nuvem(g, w * .1, h * .12, 1.2); nuvem(g, w * .42, h * .07, .9); nuvem(g, w * .9, h * .16, 1);
      passaros(g, xC - 200, pico - alto + 40, 1.2);
      corcovado(g, xC, pico, h * .74, Math.min(560, w * .27));
      cristo(g, xC, pico + 4, alto);
      var r = rnd(68);
      morro(g, r, -60, w * .6, h * .3, h + 30, w * .2, 1.7);          // o morro grande da favela, à esquerda
      morro(g, r, w * .5, w + 60, h * .64, h + 30, w * .93, 1.6);      // o da direita, na frente do pé do Corcovado
      morro(g, r, -60, w + 60, h * .84, h + 30, w * .52, 1.9);         // as casas de baixo
      bandeirinhas(g, w * .03, h * .56, w * .97, h * .5, 46);
      var vg = g.createLinearGradient(0, 0, 0, h);                     // um véu escuro: o texto e os quadros por cima ficam legíveis
      vg.addColorStop(0, 'rgba(12,16,30,.18)'); vg.addColorStop(.5, 'rgba(12,16,30,.12)'); vg.addColorStop(1, 'rgba(12,16,30,.5)');
      g.fillStyle = vg; g.fillRect(0, 0, w, h);
      return true;
    } catch (e) { window.RUA_ERRO = String(e && e.stack); return false; }
  };

  /* --------------------------------------------- layout: a tampinha no meio */
  window.RUA_LOBBY = {
    layout: function (P, palco) {
      P.cx = Math.round(P.w / 2);
      P.cy = Math.round(152 + (P.h - 296) * .64);
      palco.style.setProperty('--rx-cy', P.cy + 'px');
      palco.style.setProperty('--hm-cx', P.cx + 'px');
    },
    depois: function () { marcaPlataforma(); ajustaLegendas(); }   // depois de cada arrumação do lobby (deitado ou em pé)
  };

  /* as legendas dos botões numa linha só: se a fonte do aparelho for larga, a letra diminui um pouco */
  function ajustaLegendas() {
    [].forEach.call(document.querySelectorAll('#lb .rx-bt > small'), function (el) {
      if (!el.offsetParent) return;
      el.style.fontSize = '';
      var fs = parseFloat(getComputedStyle(el).fontSize) || 20, min = Math.round(fs * .72);
      while (el.scrollWidth > el.clientWidth + 1 && fs > min) { fs -= 1; el.style.fontSize = fs + 'px'; }
    });
  }

  /* ------------------------------------------------- os botões do lobby */
  function api() { return window.RUA_LOBBY_API || null; }
  // Dentro da plataforma do RACHA (o jogo num iframe do site, com as contas), a página-mãe expõe
  // RACHA_ABRIR(rota): o AMIGOS abre a lista de amigos de verdade. Fora dela (o jogo solto), não existe.
  function plataforma() { try { var p = window.parent; return p && p !== window && typeof p.RACHA_ABRIR === 'function' ? p : null; } catch (_) { return null; } }
  function abrePlataforma(rota) { var p = plataforma(); try { return !!(p && p.RACHA_ABRIR(rota)); } catch (_) { return false; } }
  function marcaPlataforma() {
    var el = document.querySelector('#lb .rx-bt[data-rx="amigos"] > small'); if (!el) return;
    var t = plataforma() ? 'SUA LISTA DE AMIGOS' : 'DUELOS E CONVITES';
    if (el.textContent !== t) el.textContent = t;
  }
  var ACOES = {
    clube: function (a) { a.abre('clube'); },
    skins: function (a) { a.abre('skins'); },             // v69: as tampinhas personalizadas (o editor)
    replays: function (a) { a.abre('replays'); },         // (os replays dos gols ficam no PERFIL)
    treino: function (a) { a.abre('treino'); },
    comunidade: function (a) { a.abre('comunidade'); },     // v70: a COMUNIDADE (início: salas, amigos, chat do Brasil, copa e clube)
    passe: function (a) { a.emBreve('PASSE', 'Ainda não tem temporada ativa. Quando a primeira começar, as recompensas do passe aparecem aqui.'); },
    ranqueada: function (a) { a.jogar('ranked'); },
    ranking: function (a) { a.abre('ranking'); },
    salas: function (a) { a.abre('amigos'); },
    chat: function (a) { a.abre('chat'); },
    amigos: function (a) {                                // v70: com a conta, a lista de amigos da plataforma; sem ela, a COMUNIDADE (duelos e o link da sala)
      if (abrePlataforma('/amigos')) return;
      a.abre('comunidade');
      if (typeof window.v70CmFoca === 'function') window.v70CmFoca('amigos');   // v70 · Etapa 6: abre no cartão AMIGOS (o mesmo nome do botão)
    }
  };
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-rx]'); if (!b) return;
    var a = api(), f = ACOES[b.getAttribute('data-rx')];
    if (a && f) { e.preventDefault(); f(a); }
  });
  function nomeAtual() {
    var el = document.getElementById('rx-nome'), a = api(); if (!el) return;
    var n = (a && a.nome && a.nome()) || 'Jogador';
    n = n.length > 16 ? n.slice(0, 15) + '…' : n;
    if (el.textContent !== n) el.textContent = n;
  }
  function espelhaPonto(id, sel) {                     // o menu antigo some; o pontinho dele aparece no botão novo
    var o = document.getElementById(id); if (!o) return;
    var f = function () { var on = !o.hidden; [].forEach.call(document.querySelectorAll(sel), function (b) { b.classList.toggle('rx-ponto', on); }); };
    if (window.MutationObserver) new MutationObserver(f).observe(o, {attributes: true, attributeFilter: ['hidden']});
    f();
  }
  document.addEventListener('DOMContentLoaded', function () {
    espelhaPonto('lb-ponto-amigos', '#lb [data-rx="salas"]');
    var elo = document.getElementById('lb-rq-elo');      // o elo da ranqueada muda o tamanho da legenda
    if (elo && window.MutationObserver) new MutationObserver(ajustaLegendas).observe(elo, {childList: true, characterData: true, subtree: true});
    var alvo = document.getElementById('lb-eu-nome');
    if (alvo && window.MutationObserver) new MutationObserver(nomeAtual).observe(alvo, {childList: true, characterData: true, subtree: true});
    setTimeout(nomeAtual, 50);
    marcaPlataforma(); setTimeout(function () { marcaPlataforma(); ajustaLegendas(); }, 1500);
  });
})();
