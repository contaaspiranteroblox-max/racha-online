/* ============================================================================
   RACHA · Arena da comunidade  (SÓ VISUAL)
   O campo principal (id 'estadio', nome "Arena") redesenhado como a quadra no
   meio da favela: piso verde com as áreas pintadas de amarelo, linhas brancas,
   o chão em volta pintado de ondas (amarelo, verde, azul e branco), os murais
   grafitados no muro de cima, os telhados embaixo e as casas da comunidade
   atrás dos gols, com postes, fios e uma pipa enroscada.

   Chamado por desenhaEstadio() / campoPlano() (gancho de 1 linha cada). Recebe
   a geometria pronta (X): não muda medida, parede, trave, rede, bola, jogador,
   câmera nem rede de internet. Tudo vai para a imagem estática do cenário.
   Se algo falhar aqui, o desenho antigo da Arena assume.
   ============================================================================ */
(function () {
  'use strict';
  var TAU = Math.PI * 2;
  var TRACO = '#1d1b19';                                  // o contorno escuro do grafite e das coisas

  var COR = {
    fundo: '#3e3029',
    quadra: '#2f8f58', quadraClaro: 'rgba(120,200,140,', quadraEsc: 'rgba(10,40,22,',
    area: '#f2c12e', linha: '#f6f4ec',
    azul: '#2563b5', azul2: '#2f73c4', amarelo: '#f4c51f', verde: '#22924b', verdeEsc: '#15683a', branco: '#f3efe2',
    mureta: '#ece6d6', calcada: '#a39b8b'
  };
  var MURAL = ['#2f7fc9', '#f4c51f', '#1e8a4a', '#e2552f', '#f3efe2', '#f08a2c', '#d63d5e', '#33a3a0', '#2563b5', '#8fc93a'];

  /* ------------------------------------------------------------ utilidades */
  function contorno(g, lw, cor) { g.lineJoin = 'round'; g.lineCap = 'round'; g.strokeStyle = cor || TRACO; g.lineWidth = lw; g.stroke(); }
  function circ(g, x, y, R) { g.beginPath(); g.arc(x, y, R, 0, TAU); }
  function pk(r, a) { return a[Math.floor(r() * a.length) % a.length]; }

  /* ---------------------------------------------- 1. o chão pintado de ondas
     Laços ondulados em volta da quadra (do maior para o menor, cada um de uma
     cor): a distância até a linha muda em onda ao longo do contorno. O
     comprimento de onda é ajustado para fechar sem emenda no canto. */
  function laco(g, X, d0, A, lam, ph, passo) {
    var U = X.U, x0 = X.LX0, y0 = X.LY0, x1 = X.LX1, y1 = X.LY1, D = U(d0);
    var W = x1 - x0, H = y1 - y0, P = 2 * (W + H) + TAU * D;
    var n1 = Math.max(1, Math.round(P / U(lam))), n2 = Math.max(1, Math.round(P / U(lam * .43)));
    var off = function (s) { return D + U(A) * Math.sin(TAU * n1 * s / P + ph) + U(A * .18) * Math.sin(TAU * n2 * s / P + ph * 1.7); };
    var lados = [[x0, y0, x1, y0, 0, -1], [x1, y0, x1, y1, 1, 0], [x1, y1, x0, y1, 0, 1], [x0, y1, x0, y0, -1, 0]];
    var cantos = [[x1, y0, -Math.PI / 2], [x1, y1, 0], [x0, y1, Math.PI / 2], [x0, y0, Math.PI]];
    var s = 0, primeiro = true;
    g.beginPath();
    for (var i = 0; i < 4; i++) {
      var L = lados[i], comp = Math.hypot(L[2] - L[0], L[3] - L[1]), n = Math.max(2, Math.ceil(comp / passo));
      for (var k = 0; k <= n; k++) {
        var t = k / n, o = off(s + comp * t), px = L[0] + (L[2] - L[0]) * t + L[4] * o, py = L[1] + (L[3] - L[1]) * t + L[5] * o;
        if (primeiro) { g.moveTo(px, py); primeiro = false; } else g.lineTo(px, py);
      }
      s += comp;
      var c = cantos[i], m = 8, arco = D * Math.PI / 2;
      for (var j = 1; j < m; j++) { var a = c[2] + (Math.PI / 2) * j / m, oc = off(s + arco * j / m); g.lineTo(c[0] + Math.cos(a) * oc, c[1] + Math.sin(a) * oc); }
      s += arco;
    }
    g.closePath();
  }
  var FAIXAS = [                                          // [distância da linha (u), amplitude (u), onda (u), fase, cor] — de fora para dentro
    [4.3, .6, 17, .2, 'amarelo'], [3.5, .62, 20, 1.3, 'branco'], [3.22, .7, 18, 1.0, 'azul2'], [2.7, .66, 16, 2.1, 'verde'],
    [2.05, .7, 19, .5, 'amarelo'], [1.25, .5, 17, 2.8, 'branco'], [1.02, .55, 15, 1.7, 'verde'], [.42, .1, 10, .9, 'verdeEsc']
  ];
  function chaoOndas(g, X, leve) {
    g.save(); g.beginPath(); g.rect(X.GL, X.GT, X.GR - X.GL, X.GB - X.GT); g.clip();
    g.fillStyle = COR.verde; g.fillRect(X.GL, X.GT, X.GR - X.GL, X.GB - X.GT);
    var passo = leve ? X.U(1.2) : X.U(.3);
    for (var i = 0; i < FAIXAS.length; i++) {
      var f = FAIXAS[i]; laco(g, X, f[0], f[1], f[2], f[3], passo); g.fillStyle = COR[f[4]]; g.fill();
      if (!leve) { g.lineWidth = X.U(.06); g.strokeStyle = 'rgba(20,30,25,.18)'; g.stroke(); }   // a beirada da tinta
    }
    g.restore();
  }

  /* -------------------------------------------------------- 2. a quadra verde */
  function quadra(g, X, r, leve) {
    var x0 = X.LX0, y0 = X.LY0, w = X.LX1 - x0, h = X.LY1 - y0, U = X.U, M = X.M;
    g.fillStyle = COR.quadra; g.fillRect(x0, y0, w, h);
    g.save(); g.beginPath(); g.rect(x0, y0, w, h); g.clip();
    for (var i = 0, n = leve ? 6 : 30; i < n; i++) {       // a tinta verde mais clara e mais escura aqui e ali
      var x = x0 + r() * w, y = y0 + r() * h, rx = U(1.5 + r() * 5), ry = rx * (.35 + r() * .55);
      g.fillStyle = r() < .55 ? COR.quadraClaro + '.04)' : COR.quadraEsc + '.045)';
      g.beginPath(); g.ellipse(x, y, rx, ry, r() * Math.PI, 0, TAU); g.fill();
    }
    var gastos = [[x0 + M.penalti, X.CY, 1], [x0 + w - M.penalti, X.CY, 1], [X.CX, X.CY, .9], [x0 + U(2), X.CY, 1.1], [x0 + w - U(2), X.CY, 1.1]];
    for (var k = 0; k < gastos.length; k++) {               // onde mais se pisa, a tinta clareia
      var q = gastos[k], R = U(4.4) * q[2], gr = g.createRadialGradient(q[0], q[1], 0, q[0], q[1], R);
      gr.addColorStop(0, 'rgba(206,228,196,.2)'); gr.addColorStop(1, 'rgba(206,228,196,0)');
      g.fillStyle = gr; g.fillRect(q[0] - R, q[1] - R, 2 * R, 2 * R);
    }
    if (!leve) {
      for (var c = 0; c < 2; c++) X.rachadura(r, x0 + r() * w, y0 + r() * h, U(2 + r() * 5), r() * TAU, 1);
      X.pontos(g, r, Math.min(7000, Math.round(w * h / 900)), x0, y0, w, h, ['rgba(255,255,255,.05)', 'rgba(0,0,0,.08)'], .8, 2.2);
    }
    g.restore();
  }

  /* ---------------------------------------------- 3. linhas e áreas amarelas */
  function linhas(g, X, liso) {
    var U = X.U, M = X.M, x0 = X.LX0, y0 = X.LY0, x1 = X.LX1, y1 = X.LY1, CX = X.CX, CY = X.CY;
    var c = M.circulo, e = U(X.LINHA_E), m = e / 2;
    var branco = liso ? COR.linha : X.tinta(COR.linha, 31);
    g.save();
    // as áreas pintadas de amarelo (como o garrafão da quadra da comunidade)
    for (var s = -1; s <= 1; s += 2) {
      var xg = s < 0 ? x0 : x1, ax = Math.min(xg, xg - s * M.areaW), ay = CY - M.areaH / 2;
      g.fillStyle = COR.area; g.fillRect(ax, ay, M.areaW, M.areaH);
      var rl = M.luaR, xc = xg - s * M.luaC, a = Math.acos(Math.max(-1, Math.min(1, (M.areaW - M.luaC) / rl)));   // a meia-lua também, por fora da área
      g.beginPath(); if (s < 0) g.arc(xc, CY, rl, -a, a); else g.arc(xc, CY, rl, Math.PI - a, Math.PI + a); g.closePath(); g.fill();
      if (!liso) {                                          // a tinta amarela gasta onde mais se pisa (manchas largas e suaves)
        g.save(); g.beginPath(); g.rect(ax, ay, M.areaW, M.areaH); g.clip();
        var pts = [[xg - s * M.penalti, CY, 1], [xg - s * U(2.2), CY - M.areaH * .18, .7], [xg - s * U(3), CY + M.areaH * .22, .8]];
        for (var k = 0; k < pts.length; k++) {
          var R = U(4) * pts[k][2], gr = g.createRadialGradient(pts[k][0], pts[k][1], 0, pts[k][0], pts[k][1], R);
          gr.addColorStop(0, 'rgba(255,240,190,.22)'); gr.addColorStop(1, 'rgba(255,240,190,0)'); g.fillStyle = gr; g.fillRect(pts[k][0] - R, pts[k][1] - R, 2 * R, 2 * R);
        }
        g.fillStyle = 'rgba(120,80,0,.08)'; g.fillRect(ax, ay, M.areaW, U(.5)); g.fillRect(ax, ay + M.areaH - U(.5), M.areaW, U(.5));
        g.restore();
      }
    }
    // o círculo do meio com um verde mais fechado e o RACHA pintado bem de leve
    g.beginPath(); g.arc(CX, CY, c, 0, TAU); g.fillStyle = 'rgba(16,70,40,.18)'; g.fill();
    if (!liso) {
      var fs = Math.round(c * .26); g.font = fs + 'px ' + X.FONT; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = 'rgba(244,197,31,.2)'; g.fillText('RACHA', CX, CY + c * .56);
    }
    // as linhas brancas
    g.lineWidth = e; g.lineCap = 'butt'; g.lineJoin = 'miter'; g.strokeStyle = branco; g.fillStyle = branco;
    g.fillRect(CX - m, y0 + e, e, CY - c + m - (y0 + e)); g.fillRect(CX - m, CY + c - m, e, y1 - e - (CY + c - m));   // o meio-campo, fora do círculo
    g.beginPath(); g.arc(CX, CY, c - m, 0, TAU); g.stroke();
    g.strokeRect(x0 + m, y0 + m, x1 - x0 - e, y1 - y0 - e);                                                         // a linha de fora
    for (s = -1; s <= 1; s += 2) {
      xg = s < 0 ? x0 : x1;
      var med = [[M.areaW, M.areaH], [M.pequenaW, M.pequenaH]];
      for (var i = 0; i < 2; i++) {
        var ww = med[i][0], hh = med[i][1], xf = xg - s * (ww - m), ya = CY - hh / 2 + m, yb = CY + hh / 2 - m;
        g.beginPath(); g.moveTo(xg, ya); g.lineTo(xf, ya); g.lineTo(xf, yb); g.lineTo(xg, yb); g.stroke();
      }
      g.beginPath(); g.arc(xg - s * M.penalti, CY, U(.42), 0, TAU); g.fill();                                       // a marca do pênalti
      rl = M.luaR - m; xc = xg - s * M.luaC; a = Math.acos(Math.max(-1, Math.min(1, (M.areaW - m - M.luaC) / rl)));
      g.beginPath(); if (s < 0) g.arc(xc, CY, rl, -a, a); else g.arc(xc, CY, rl, Math.PI - a, Math.PI + a); g.stroke();
      for (var sy = -1; sy <= 1; sy += 2) {                                                                      // o arco do escanteio
        g.beginPath(); g.arc(xg, sy < 0 ? y0 : y1, U(1.6), s < 0 ? (sy < 0 ? 0 : -Math.PI / 2) : (sy < 0 ? Math.PI / 2 : Math.PI), s < 0 ? (sy < 0 ? Math.PI / 2 : 0) : (sy < 0 ? Math.PI : Math.PI * 1.5)); g.stroke();
      }
    }
    g.beginPath(); g.arc(CX, CY, U(.42), 0, TAU); g.fill();                                                          // a marca do meio
    g.restore();
  }

  /* --------------------------------------------- 4. o muro de cima: os murais */
  function swoosh(g, x0, x1, yc, amp, lam, ph, esp, cor, contornar) {
    g.beginPath();
    for (var x = x0; x <= x1; x += 6) { var y = yc + amp * Math.sin(TAU * x / lam + ph) - esp / 2; if (x === x0) g.moveTo(x, y); else g.lineTo(x, y); }
    for (x = x1; x >= x0; x -= 6) g.lineTo(x, yc + amp * Math.sin(TAU * x / lam + ph + .6) + esp / 2);
    g.closePath(); g.fillStyle = cor; g.fill();
    if (contornar) contorno(g, 1.6);
  }
  function mRosto(g, r, x, y, s) {                        // a máscara colorida (rosto grande, olhos arregalados)
    var R = s * .4, c1 = pk(r, MURAL), c2 = pk(r, MURAL), c3 = pk(r, MURAL);
    for (var i = 0; i <= 10; i++) {                       // o cabelo em raios
      var a = Math.PI * (1.02 + i * .096), L = R * (1.45 + (i % 2) * .25);
      g.beginPath(); g.moveTo(x + Math.cos(a - .14) * R * .9, y + Math.sin(a - .14) * R * .9); g.lineTo(x + Math.cos(a) * L, y + Math.sin(a) * L);
      g.lineTo(x + Math.cos(a + .14) * R * .9, y + Math.sin(a + .14) * R * .9); g.closePath(); g.fillStyle = i % 2 ? c2 : c3; g.fill(); contorno(g, 1.3);
    }
    circ(g, x, y, R); g.fillStyle = c1; g.fill(); contorno(g, 2.2);
    for (var e = -1; e <= 1; e += 2) {
      g.beginPath(); g.ellipse(x + e * R * .38, y - R * .1, R * .25, R * .19, 0, 0, TAU); g.fillStyle = '#ffffff'; g.fill(); contorno(g, 1.4);
      circ(g, x + e * R * .38 + R * .05, y - R * .08, R * .1); g.fillStyle = TRACO; g.fill();
    }
    g.beginPath(); g.arc(x, y + R * .22, R * .38, .2 * Math.PI, .8 * Math.PI); contorno(g, 2.4, '#b3261e');
    circ(g, x - R * .62, y + R * .28, R * .12); g.fillStyle = c2; g.fill(); circ(g, x + R * .62, y + R * .28, R * .12); g.fill();
  }
  function mSol(g, r, x, y, s) {                          // o sol de raios alternados
    var R = s * .27;
    for (var i = 0; i < 14; i++) {
      var a = i * TAU / 14, L = R * (1.7 + (i % 2) * .35);
      g.beginPath(); g.moveTo(x + Math.cos(a - .18) * R, y + Math.sin(a - .18) * R); g.lineTo(x + Math.cos(a) * L, y + Math.sin(a) * L);
      g.lineTo(x + Math.cos(a + .18) * R, y + Math.sin(a + .18) * R); g.closePath(); g.fillStyle = i % 2 ? '#e2552f' : '#f4c51f'; g.fill(); contorno(g, 1.2);
    }
    circ(g, x, y, R); g.fillStyle = '#f8d23a'; g.fill(); contorno(g, 2);
    circ(g, x - R * .33, y - R * .15, R * .1); g.fillStyle = TRACO; g.fill(); circ(g, x + R * .33, y - R * .15, R * .1); g.fill();
    g.beginPath(); g.arc(x, y + R * .05, R * .45, .2 * Math.PI, .8 * Math.PI); contorno(g, 1.6);
  }
  function mBandeira(g, r, x, y, s) {                     // a bandeira pintada à mão, meio torta
    var w = s * 1.4, h = s * .92;
    g.save(); g.translate(x, y); g.rotate((r() - .5) * .14);
    g.beginPath(); g.rect(-w / 2, -h / 2, w, h); g.fillStyle = '#1e8a4a'; g.fill(); contorno(g, 2.2);
    g.beginPath(); g.moveTo(0, -h * .4); g.lineTo(w * .42, 0); g.lineTo(0, h * .4); g.lineTo(-w * .42, 0); g.closePath(); g.fillStyle = '#f4c51f'; g.fill(); contorno(g, 1.4);
    circ(g, 0, 0, h * .25); g.fillStyle = '#2563b5'; g.fill(); contorno(g, 1.4);
    g.save(); circ(g, 0, 0, h * .25); g.clip(); g.beginPath(); g.arc(-h * .1, h * .55, h * .62, -Math.PI * .78, -Math.PI * .22); g.lineWidth = h * .07; g.strokeStyle = '#f3efe2'; g.stroke(); g.restore();
    g.restore();
  }
  function mEspiral(g, r, x, y, s) {                      // o redemoinho
    var R = s * .4; circ(g, x, y, R); g.fillStyle = pk(r, MURAL); g.fill(); contorno(g, 2);
    g.beginPath();
    for (var t = 0; t < 3.2 * TAU; t += .25) { var rr = R * .9 * t / (3.2 * TAU); if (t === 0) g.moveTo(x, y); else g.lineTo(x + Math.cos(t) * rr, y + Math.sin(t) * rr); }
    contorno(g, s * .07, pk(r, ['#f3efe2', '#f4c51f', '#1d1b19']));
  }
  function mBola(g, r, x, y, s) {                         // a bola com o risco de velocidade
    var R = s * .3;
    for (var i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(x - R * 1.2, y + i * R * .45); g.lineTo(x - R * 2.3, y + i * R * .45); contorno(g, 2.4, '#f3efe2'); }
    circ(g, x, y, R); g.fillStyle = '#ffffff'; g.fill(); contorno(g, 2);
    g.beginPath(); for (var k = 0; k < 5; k++) { var a = -Math.PI / 2 + k * TAU / 5; g.lineTo(x + Math.cos(a) * R * .38, y + Math.sin(a) * R * .38); } g.closePath(); g.fillStyle = TRACO; g.fill();
  }
  function mFlor(g, r, x, y, s) {                         // a flor de seis pétalas
    var R = s * .2, c = pk(r, MURAL);
    for (var i = 0; i < 6; i++) { var a = i * TAU / 6; g.beginPath(); g.ellipse(x + Math.cos(a) * R * 1.1, y + Math.sin(a) * R * 1.1, R * .85, R * .55, a, 0, TAU); g.fillStyle = c; g.fill(); contorno(g, 1.3); }
    circ(g, x, y, R * .7); g.fillStyle = '#f4c51f'; g.fill(); contorno(g, 1.5);
  }
  function mEstrela(g, r, x, y, s) {
    var R = s * .36, ri = R * .45;
    g.beginPath(); for (var i = 0; i < 10; i++) { var a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? ri : R; g.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); } g.closePath();
    g.fillStyle = pk(r, ['#f4c51f', '#f3efe2', '#e2552f']); g.fill(); contorno(g, 1.8);
  }
  function mCoracao(g, r, x, y, s) {
    var k = s * .34;
    g.beginPath(); g.moveTo(x, y + k * .9); g.bezierCurveTo(x - k * 1.4, y, x - k * .9, y - k * 1.1, x, y - k * .35); g.bezierCurveTo(x + k * .9, y - k * 1.1, x + k * 1.4, y, x, y + k * .9);
    g.fillStyle = pk(r, ['#d63d5e', '#e2552f']); g.fill(); contorno(g, 1.8);
  }
  function mOlho(g, r, x, y, s) {                         // o olho grande
    var w = s * .55, h = s * .3;
    g.beginPath(); g.moveTo(x - w, y); g.quadraticCurveTo(x, y - h * 1.9, x + w, y); g.quadraticCurveTo(x, y + h * 1.9, x - w, y); g.closePath(); g.fillStyle = '#ffffff'; g.fill(); contorno(g, 2);
    circ(g, x, y, h * .8); g.fillStyle = pk(r, ['#2f7fc9', '#1e8a4a', '#f08a2c']); g.fill(); contorno(g, 1.4);
    circ(g, x, y, h * .35); g.fillStyle = TRACO; g.fill(); circ(g, x - h * .25, y - h * .25, h * .14); g.fillStyle = '#ffffff'; g.fill();
    for (var i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(x + i * w * .3, y - h * .95); g.lineTo(x + i * w * .36, y - h * 1.45); contorno(g, 1.4); }
  }
  var MOTIVOS = [mRosto, mSol, mBandeira, mEspiral, mRosto, mBola, mFlor, mOlho, mEstrela, mCoracao, mRosto, mSol];

  function muralCima(g, X, r, leve) {
    var x0 = X.GL - X.mu, x1 = X.GR + X.mu, y1 = X.GT - X.mu, h = y1, U = X.U;
    if (h <= 4) return;
    g.save(); g.beginPath(); g.rect(x0, 0, x1 - x0, h); g.clip();
    for (var x = x0; x < x1;) { var w = U(5 + r() * 7); g.fillStyle = pk(r, MURAL); g.fillRect(x, 0, w + 1, h); x += w; }   // o muro inteiro pintado, em blocos
    if (!leve) {
      swoosh(g, x0, x1, h * .32, h * .16, U(19), r() * TAU, h * .2, '#f3efe2', true);
      swoosh(g, x0, x1, h * .66, h * .18, U(23), r() * TAU, h * .24, '#f4c51f', true);
      swoosh(g, x0, x1, h * .86, h * .1, U(15), r() * TAU, h * .14, '#1e8a4a', true);
      for (var i = 0, n = Math.round((x1 - x0) / 9); i < n; i++) {   // as bolinhas e tracinhos do fundo
        g.fillStyle = pk(r, ['rgba(255,255,255,.6)', 'rgba(29,27,25,.45)', 'rgba(244,197,31,.7)']);
        circ(g, x0 + r() * (x1 - x0), r() * h, 1 + r() * 2.2); g.fill();
      }
    }
    // os desenhos: rostos, sol, bandeira, redemoinho, bola, flor, olho, estrela, coração
    var s0 = h * .82, xm = x0 + U(1.5) + r() * U(2), k = Math.floor(r() * MOTIVOS.length);
    while (xm < x1 - U(1)) {
      var f = MOTIVOS[k++ % MOTIVOS.length], s = s0 * (.86 + r() * .2), larg = f === mBandeira ? s * 1.4 : f === mBola ? s * 1.3 : s;
      if (xm + larg > x1) break;
      if (leve) { circ(g, xm + larg / 2, h * .52, s * .36); g.fillStyle = pk(r, MURAL); g.fill(); contorno(g, 3); }
      else f(g, r, xm + (f === mBola ? larg * .62 : larg / 2), h * .54, s);
      xm += larg + U(1.4 + r() * 3.2);
    }
    // o pé do muro: a sujeira e a sombra que a laje de cima joga no alto do muro
    var gs = g.createLinearGradient(0, h - U(1.1), 0, h); gs.addColorStop(0, 'rgba(40,32,22,0)'); gs.addColorStop(1, 'rgba(40,32,22,.42)');
    g.fillStyle = gs; g.fillRect(x0, h - U(1.1), x1 - x0, U(1.1));
    var gt = g.createLinearGradient(0, 0, 0, U(.9)); gt.addColorStop(0, 'rgba(20,16,12,.38)'); gt.addColorStop(1, 'rgba(20,16,12,0)');
    g.fillStyle = gt; g.fillRect(x0, 0, x1 - x0, U(.9));
    g.restore();
  }

  /* ------------------------------------------ 5. embaixo: os telhados do morro */
  function telhadosBaixo(g, X, r, leve) {
    var x0 = X.GL - X.mu, x1 = X.GR + X.mu, y0 = X.GB + X.mu, y1 = X.MH + 10, U = X.U;
    if (y1 - y0 <= 4) return;
    g.save(); g.beginPath(); g.rect(x0, y0, x1 - x0, X.MH - y0); g.clip();
    for (var x = x0 - U(2); x < x1;) {
      var q = r(), w = q < .1 ? U(1.6 + r() * .6) : U(4.5 + r() * 5.5);
      if (q < .1) { X.beco(g, r, x, y0, y1, w); x += w; continue; }
      var t = r(), yy = y0 + r() * U(.6);
      if (t < .5) {
        X.laje(g, r, x, yy, w, y1 - yy, {tijolo: r() < .35});
        if (r() < .75) X.caixa(g, x + w * (.3 + r() * .4), yy + U(1.5), U(.8 + r() * .25), r() < .2);
        else if (r() < .6) X.varal(g, r, x + U(.6), yy + U(1.8), x + w - U(.6), yy + U(1.8) + (r() - .5) * 8);
      } else if (t < .72) { X.ondulado(g, r, x, yy, w, y1 - yy, '#b3b4ae', false); g.beginPath(); g.rect(x, yy, w, y1 - yy); X.traco(g, 2); }
      else if (t < .86) { X.ondulado(g, r, x, yy, w, y1 - yy, '#8d7867', true); g.beginPath(); g.rect(x, yy, w, y1 - yy); X.traco(g, 2); }
      else { X.barro(g, r, x, yy, w, y1 - yy); g.beginPath(); g.rect(x, yy, w, y1 - yy); X.traco(g, 2); }
      x += w;
    }
    var gs = g.createLinearGradient(0, y0, 0, y0 + U(1)); gs.addColorStop(0, 'rgba(14,9,5,.35)'); gs.addColorStop(1, 'rgba(14,9,5,0)');   // a sombra do muro da quadra
    g.fillStyle = gs; g.fillRect(x0, y0, x1 - x0, U(1));
    g.restore();
  }

  /* ---------------------------- 6. atrás dos gols: a calçada e as casas empilhadas */
  function ladoX(X, lado, d) { return lado < 0 ? X.GL - X.mu - d : X.GR + X.mu + d; }
  function calcada(g, X, r, lado, leve) {
    var xa = ladoX(X, lado, 0), xb = ladoX(X, lado, X.calcada), x = Math.min(xa, xb), w = Math.abs(xb - xa), U = X.U;
    X.chao(g, r, x, -10, w, X.MH + 20, COR.calcada, {grao: leve ? 400 : 40, rachaA: 26000});
    // a faixa pintada no pé do muro (as ondas continuam por fora, mais gastas)
    g.save(); g.beginPath(); g.rect(x, 0, w, X.MH); g.clip(); g.globalAlpha = .55;
    var cores = [COR.amarelo, COR.verde, COR.azul2];
    for (var i = 0; i < 3; i++) {
      var d = U(.55 + i * .9), esp = U(.62);
      g.beginPath();
      for (var y = -10; y <= X.MH + 10; y += 8) { var xx = ladoX(X, lado, d + U(.25) * Math.sin(y / U(3.2) + i * 1.7)); if (y === -10) g.moveTo(xx, y); else g.lineTo(xx, y); }
      g.lineWidth = esp; g.strokeStyle = cores[i]; g.stroke();
    }
    g.restore();
    // o degrau entre a calçada e as casas
    g.fillStyle = 'rgba(14,9,5,.4)'; g.fillRect(lado < 0 ? xb - U(.22) : xb, -10, U(.22), X.MH + 20);
  }
  function casasLado(g, X, r, lado, leve) {
    var U = X.U, xb = ladoX(X, lado, X.calcada + .02 * U(1)), borda = lado < 0 ? -U(3) : X.MW + U(3);
    var xa = Math.min(xb, borda), larg = Math.abs(borda - xb);
    X.chao(g, r, xa, -10, larg, X.MH + 20, '#8e897e', {grao: leve ? 400 : 40});
    var C = [];
    for (var y = -U(3) - r() * U(4); y < X.MH + U(2);) {
      var q = r(), h = q < .14 ? U(1.8 + r() * .6) : U(6.5 + r() * 4.5);
      if (q < .14) { y += h; continue; }                  // o beco (fica o chão de cimento)
      var H = 50 + Math.floor(r() * 2) * 24, recuo = r() * U(.5), prof = larg + U(1 + r() * 4);
      var x0 = lado < 0 ? xb - recuo - prof : xb + recuo;
      var b = X.novaCasa(r, x0, y + H, y + h, prof, H); b.y0 = Math.min(b.y0, b.y1 - 40); b.vazia = leve;
      C.push(b); y += h;
    }
    for (var i = 0; i < C.length; i++) { var c = C[i]; X.sombraRet(g, c.x, c.y0 - c.H, c.w, c.y1 - c.y0 + c.H, c.H * .42, c.H * .22, .28); }
    C.sort(function (a, b) { return a.y1 - b.y1; });
    for (i = 0; i < C.length; i++) X.casa(g, X.sem(C[i].s), C[i]);
  }

  /* --------------------------------------------- 7. a mureta em volta da quadra */
  function mureta(g, X) {
    var mu = X.mu, U = X.U, GL = X.GL, GR = X.GR, GT = X.GT, GB = X.GB, xa = GL - mu, xb = GR + mu;
    // a sombra do muro de cima e do da esquerda no chão (o sol vem do alto, à esquerda)
    var gs = g.createLinearGradient(0, GT, 0, GT + U(1.4)); gs.addColorStop(0, 'rgba(10,20,30,.34)'); gs.addColorStop(1, 'rgba(10,20,30,0)');
    g.fillStyle = gs; g.fillRect(GL, GT, GR - GL, U(1.4));
    var gl = g.createLinearGradient(GL, 0, GL + U(1), 0); gl.addColorStop(0, 'rgba(10,20,30,.26)'); gl.addColorStop(1, 'rgba(10,20,30,0)');
    g.fillStyle = gl; g.fillRect(GL, GT, U(1), GB - GT);
    g.fillStyle = COR.mureta;
    g.fillRect(xa, GT - mu, xb - xa, mu); g.fillRect(xa, GB, xb - xa, mu); g.fillRect(xa, GT, mu, GB - GT); g.fillRect(GR, GT, mu, GB - GT);
    g.fillStyle = 'rgba(255,255,255,.55)';
    g.fillRect(xa, GT - mu, xb - xa, U(.09)); g.fillRect(xa, GB, xb - xa, U(.09)); g.fillRect(xa, GT, U(.09), GB - GT); g.fillRect(GR, GT, U(.09), GB - GT);
    g.fillStyle = 'rgba(29,27,25,.55)';
    g.fillRect(xa, GT - U(.08), xb - xa, U(.08)); g.fillRect(xa, GB + mu - U(.08), xb - xa, U(.08));
    g.fillRect(GL - U(.08), GT, U(.08), GB - GT); g.fillRect(GR + mu - U(.08), GT, U(.08), GB - GT);
  }

  /* --------------------------------------------------- 8. postes, fios e a pipa */
  function poste(g, x, y, U) {
    g.fillStyle = 'rgba(14,9,5,.3)'; g.beginPath(); g.ellipse(x + U(.5), y + U(.55), U(.75), U(.55), 0, 0, TAU); g.fill();
    circ(g, x, y, U(.62)); g.fillStyle = '#8f8b82'; g.fill(); contorno(g, 1.8);
    circ(g, x - U(.15), y - U(.15), U(.32)); g.fillStyle = '#b4afa5'; g.fill();
    g.save(); g.translate(x, y); g.rotate(-.12);
    g.beginPath(); g.rect(-U(1.6), -U(.16), U(3.2), U(.32)); g.fillStyle = '#4a4744'; g.fill(); contorno(g, 1.2);
    for (var i = -1; i <= 1; i++) { circ(g, i * U(1.2), 0, U(.17)); g.fillStyle = '#e9e5da'; g.fill(); contorno(g, 1); }
    g.restore();
  }
  function fio(g, ax, ay, bx, by, sag, U) {
    var mx = (ax + bx) / 2, my = (ay + by) / 2;
    var nx = by - ay, ny = -(bx - ax), nl = Math.hypot(nx, ny) || 1; if (ny < 0) { nx = -nx; ny = -ny; }   // a barriga do fio cai para baixo na tela
    var cx = mx + nx / nl * sag, cy = my + ny / nl * sag;
    g.beginPath(); g.moveTo(ax + U(.35), ay + U(.45)); g.quadraticCurveTo(cx + U(.35), cy + U(.45), bx + U(.35), by + U(.45)); g.lineWidth = 1.6; g.strokeStyle = 'rgba(14,9,5,.16)'; g.stroke();
    g.beginPath(); g.moveTo(ax, ay); g.quadraticCurveTo(cx, cy, bx, by); g.lineWidth = 1.5; g.strokeStyle = 'rgba(22,20,18,.85)'; g.stroke();
    return [cx, cy];
  }
  function pipa(g, x, y, U, cor) {                         // a pipa enroscada no fio, com a rabiola caindo
    g.save(); g.translate(x, y); g.rotate(.5);
    g.beginPath(); g.moveTo(0, -U(.9)); g.lineTo(U(.7), 0); g.lineTo(0, U(1.05)); g.lineTo(-U(.7), 0); g.closePath(); g.fillStyle = cor; g.fill(); contorno(g, 1.4);
    g.beginPath(); g.moveTo(0, -U(.9)); g.lineTo(0, U(1.05)); g.moveTo(-U(.7), 0); g.lineTo(U(.7), 0); contorno(g, .9, 'rgba(29,27,25,.6)');
    g.beginPath(); g.moveTo(0, U(1.05)); for (var i = 1; i <= 6; i++) g.lineTo(Math.sin(i * 1.3) * U(.35), U(1.05) + i * U(.45)); contorno(g, 1.1, 'rgba(29,27,25,.7)');
    for (i = 1; i <= 5; i += 2) { g.fillStyle = i % 4 === 1 ? '#f3efe2' : '#e2552f'; g.fillRect(Math.sin(i * 1.3) * U(.35) - 2, U(1.05) + i * U(.45) - 2, 4, 4); }
    g.restore();
  }
  function postesEFios(g, X, r) {
    var U = X.U, P = [];
    for (var lado = -1; lado <= 1; lado += 2) {
      var x = ladoX(X, lado, X.calcada - U(1.1));
      P.push([x, U(1.4)], [x, X.MH - U(1.4)]);
    }
    // os fios: atravessando o muro de cima e descendo pelas casas dos lados
    fio(g, P[0][0], P[0][1], P[2][0], P[2][1], U(.9), U);
    var naCurva = function (x) { var t = (x - P[0][0]) / (P[2][0] - P[0][0]); return P[0][1] + 2 * t * (1 - t) * U(.9); };
    fio(g, P[0][0], P[0][1] + U(.35), P[2][0], P[2][1] + U(.35), U(1.4), U);
    fio(g, P[0][0], P[0][1], P[1][0], P[1][1], U(.6), U);
    fio(g, P[2][0], P[2][1], P[3][0], P[3][1], U(.6), U);
    fio(g, P[1][0], P[1][1], P[3][0], P[3][1], U(.7), U);
    for (var i = 0; i < P.length; i++) poste(g, P[i][0], P[i][1], U);
    var xp1 = X.CX - (X.GR - X.GL) * .22, xp2 = X.CX + (X.GR - X.GL) * .31;
    pipa(g, xp1, naCurva(xp1), U, '#2f7fc9');
    pipa(g, xp2, naCurva(xp2), U, '#e2552f');
  }

  /* ------------------------------------------------------------ desenho todo */
  window.RUA_ARENA = function (g, leve, X) {
    var antes = X.getLeve();
    try {
      X.setLeve(!!leve);
      var r = X.rnd(6161);
      g.fillStyle = COR.fundo; g.fillRect(0, 0, X.MW, X.MH);
      for (var lado = -1; lado <= 1; lado += 2) { calcada(g, X, X.rnd(lado < 0 ? 5501 : 5519), lado, leve); casasLado(g, X, X.rnd(lado < 0 ? 4401 : 4419), lado, leve); }
      telhadosBaixo(g, X, X.rnd(7707), leve);
      muralCima(g, X, X.rnd(2026), leve);
      chaoOndas(g, X, leve);
      quadra(g, X, r, leve);
      mureta(g, X);
      linhas(g, X, leve);
      if (!X.semGol) { X.golChao(-1); X.golChao(1); }
      if (X.torc) { X.galera(X.rnd(6161), -1, X.t0); X.galera(X.rnd(6163), 1, X.t1); }
      if (!leve) postesEFios(g, X, X.rnd(8808));
      return true;
    } catch (e) { window.RUA_ARENA_ERRO = String(e && e.stack); return false; }
    finally { X.setLeve(antes); }
  };

  /* Ultra leve: cores lisas, sem textura nem cenário (serve para todos os mapas) */
  window.RUA_ARENA_PLANO = function (g, X) {
    try {
      g.fillStyle = COR.fundo; g.fillRect(0, 0, X.MW, X.MH);
      g.fillStyle = COR.verde; g.fillRect(X.GL, X.GT, X.GR - X.GL, X.GB - X.GT);
      var U = X.U, faixas = [[4.2, COR.amarelo], [3.3, COR.azul2], [2.8, COR.verde], [2.1, COR.amarelo], [1.1, COR.verde], [.45, COR.verdeEsc]];
      g.save(); g.beginPath(); g.rect(X.GL, X.GT, X.GR - X.GL, X.GB - X.GT); g.clip();
      for (var i = 0; i < faixas.length; i++) {
        var d = U(faixas[i][0]); g.fillStyle = faixas[i][1];
        X.rr(g, X.LX0 - d, X.LY0 - d, X.LX1 - X.LX0 + 2 * d, X.LY1 - X.LY0 + 2 * d, d); g.fill();
      }
      g.restore();
      g.fillStyle = COR.quadra; g.fillRect(X.LX0, X.LY0, X.LX1 - X.LX0, X.LY1 - X.LY0);
      if (!X.semGol) { X.golChao(-1); X.golChao(1); }
      linhas(g, X, true);
      if (X.golRua) { X.golRua(-1); X.golRua(1); }
      return true;
    } catch (e) { window.RUA_ARENA_ERRO = String(e && e.stack); return false; }
  };
})();
