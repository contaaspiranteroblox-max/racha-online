/* ======================================================================================================================
   RACHA v96 · AS TAMPINHAS ANIMADAS NOVAS E A DOS 30 PRIMEIROS (tools/v96/skins.js, colado depois da v95).
   O pedido: "crie skins animadas; skin ultra rara para os 30 primeiros players que entrarem no jogo — deve ser muito
   bonita essa skin".
   Tudo desenhado em código, como as da v76 (nenhuma imagem pronta): cada CARA é um ícone novo que ocupa a tampinha inteira
   (TP_ICONES, no fim da lista — os códigos de tampinha de antes não mudam) e cada BORDA ACESA é uma borda nova (TP_BORDAS).
     · as caras (lendárias, 100 gemas): PIPA NO CÉU (a pipa dançando no vento em cima da laje, no pôr do sol), BAILE (a caixa
       de som batendo, o equalizador e os lasers), MARÉ (as ondas, o brilho do sol na água e o calçadão de ondas), TEMPESTADE
       (os raios, a chuva e o refletor do campinho), IPÊ AMARELO (as flores caindo) e LAVA (a lava correndo nas rachaduras);
     · as bordas acesas (épicas, 40 gemas): ARCO-ÍRIS VIVO, OURO LÍQUIDO e COMETA;
     · a dos FUNDADORES (ultra rara, não está à venda): a CARA FUNDADOR (o medalhão de ouro com a coroa e as pedras, o sol de
       raios girando, o céu de estrelas e o brilho holográfico passando) e a borda AURA DOS FUNDADORES (o ouro com os três
       brilhos dando a volta e o pulso de luz). Só as 30 primeiras contas que entram no jogo ganham (a plataforma entrega —
       app/api/racha/fundador.ts — e numera: "Fundador nº 7 de 30"); no editor ela só aparece para quem tem, a loja não vende
       e o servidor das salas tira as peças de quem não é fundador (server/fundador96.js): ninguém mais vê a tampinha falsa.
   Na partida, no treino, no replay, no lobby, no perfil e no editor elas mexem (o desenho de sempre da v76: tpPoe/tpTampa);
   nas listas e miniaturas ficam paradas (um quadro bonito de cada); com Reduzir animações ou o Ultra leve, paradas em todo
   lugar. Os bots não pegam as animadas. Só aparência: o tamanho, o aro do time e a física são os de todo mundo.
   ====================================================================================================================== */
const SK96_TAU = Math.PI * 2;
const SK96_FUNDADOR = Object.freeze({ item: 'tp_fundador', cara: 'zw', borda: 'vw', vagas: 30 });
const V96F = { numero: 0, vagas: SK96_FUNDADOR.vagas, pendente: false, demo: false };   // (o número desta conta, quando a plataforma avisa)
const SK96_PRECO = { cara: 'lendario', aro: 'epico', fundador: 'fundador' };
if (!TP_PRECO.fundador) TP_PRECO.fundador = { m: 0, g: 0, nome: 'Fundador' };   // (a raridade que não se compra: a plataforma entrega)
const sk96Rgba = (rgb, a) => 'rgba(' + rgb + ',' + Math.max(0, Math.min(1, a)).toFixed(3) + ')';
const sk96Mod = (a, b) => ((a % b) + b) % b;
function sk96Grad(g, x0, y0, x1, y1, pares) { const gr = g.createLinearGradient(x0, y0, x1, y1); for (const [s, c] of pares) gr.addColorStop(s, c); return gr; }
function sk96Rad(g, x, y, r0, r1, pares) { const gr = g.createRadialGradient(x, y, r0, x, y, r1); for (const [s, c] of pares) gr.addColorStop(s, c); return gr; }
function sk96Estrela(g, x, y, R, r, n, a0) { g.beginPath(); for (let i = 0; i < n * 2; i++) { const a = a0 + i * Math.PI / n, q = i & 1 ? r : R; g.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); } g.closePath(); }
function sk96Pontos(seed, n, f) { const r = estRnd(seed), l = []; for (let i = 0; i < n; i++) l.push(f(r, i)); return l; }

/* ---------------------------------------------------------------- 1) PIPA NO CÉU · a pipa dançando no vento em cima da laje */
const SK96_PIPA_NUVEM = [[-.2, -.62, .34], [.75, -.2, .26], [1.6, -.7, .3]];
let SK96_PIPA_JAN = [];
function skPipaFundo(g, W) {
  const R = W / 2; g.translate(R, R);
  g.fillStyle = sk96Grad(g, 0, -R, 0, R * .45, [[0, '#211348'], [.42, '#6c2a73'], [.72, '#d8506a'], [1, '#ffab58']]);
  g.fillRect(-R, -R, W, W);
  g.fillStyle = sk96Rad(g, -R * .34, R * .3, R * .05, R * .8, [[0, 'rgba(255,240,190,.95)'], [.18, 'rgba(255,196,96,.75)'], [.5, 'rgba(255,140,80,.25)'], [1, 'rgba(255,120,80,0)']]);
  g.fillRect(-R, -R, W, W);
  g.beginPath(); g.arc(-R * .34, R * .3, R * .17, 0, SK96_TAU); g.fillStyle = '#ffe9a6'; g.fill();
  const r = estRnd(7130), jan = [];
  const casas = (y0, cor, hMin, hMax, wMin, wMax, luz, caixa) => {   // uma fileira de casas (a laje reta, a caixa d'água, os ferros)
    let x = -R * 1.05;
    while (x < R * 1.05) {
      const w = R * (wMin + r() * (wMax - wMin)), h = R * (hMin + r() * (hMax - hMin)), top = y0 - h;
      g.fillStyle = cor; g.fillRect(x, top, w + 1, R * 2);
      if (caixa && r() < .35) { const cw = w * .34, cx = x + w * (.15 + r() * .45); g.fillRect(cx, top - cw * .62, cw, cw * .62); g.fillRect(cx - cw * .08, top - cw * .7, cw * 1.16, cw * .12); }
      if (caixa && r() < .3) { g.strokeStyle = cor; g.lineWidth = Math.max(1, R * .012); for (let k = 0; k < 3; k++) { const fx = x + w * (.2 + .25 * k); g.beginPath(); g.moveTo(fx, top); g.lineTo(fx + R * .01, top - R * (.05 + r() * .05)); g.stroke(); } }
      if (luz) for (let yy = top + R * .05; yy < R * .98; yy += R * .085) for (let xx = x + R * .03; xx < x + w - R * .04; xx += R * .07) if (r() < .33) jan.push([xx / R, yy / R, r() * 6, r() < .5]);
      x += w + R * (.005 + r() * .02);
    }
  };
  casas(R * .5, '#3d1b4a', .08, .26, .12, .24, false, false);
  casas(R * .74, '#1c0d26', .12, .36, .14, .3, true, true);
  SK96_PIPA_JAN = jan;
  for (const [u, v, , on] of jan) { g.fillStyle = on ? 'rgba(255,196,110,.85)' : 'rgba(255,170,90,.18)'; g.fillRect(u * R, v * R, R * .034, R * .042); }
}
function skPipa(g, R, t, px) {
  const W = sk76Lado(px * 2);
  g.drawImage(sk76Cache('pipa|' + W, W, skPipaFundo), -R, -R, 2 * R, 2 * R);
  g.save(); g.globalCompositeOperation = 'lighter';
  for (const [x0, y, s] of SK96_PIPA_NUVEM) {                 // as nuvens passando devagar
    const x = sk96Mod(x0 - t * .035 + 1.3, 2.6) - 1.3;
    for (const [dx, dy, k] of [[0, 0, 1], [s * .7, s * .12, .7], [-s * .6, s * .15, .65]]) sk76Luz(g, (x + dx) * R, (y + dy) * R, s * k * R, '255,190,200', .16);
  }
  if (px > 18) SK96_PIPA_JAN.forEach(([u, v, ph], i) => {      // umas janelas acendendo e apagando
    if (i % 3) return; const a = .5 + .5 * Math.sin(t * (.7 + (i % 5) * .23) + ph); if (a < .55) return;
    sk76Luz(g, (u + .017) * R, (v + .02) * R, R * .07, '255,190,100', .4 * (a - .5));
  });
  g.restore();
  // a pipa: o vento balança e gira um pouco; a linha desce até a laje; a rabiola ondula
  const ax = R * (.36 + .06 * Math.sin(t * 1.3)), ay = R * (-.4 + .045 * Math.sin(t * 1.9 + 1)), rot = .2 * Math.sin(t * 1.1) - .12;
  const mao = [-R * .58, R * .52];
  g.beginPath(); g.moveTo(ax, ay + R * .02); g.quadraticCurveTo((ax + mao[0]) * .5 + R * .12, (ay + mao[1]) * .5 + R * .16, mao[0], mao[1]);
  g.strokeStyle = 'rgba(250,240,225,.55)'; g.lineWidth = Math.max(.8, R * .009); g.stroke();
  g.save(); g.translate(ax, ay); g.rotate(rot);
  const s = R * .24, top = [0, -s], dir = [s * .78, -s * .1], bai = [0, s * 1.15], esq = [-s * .78, -s * .1], meio = [0, -s * .1];
  const tri = (a, b, cor) => { g.beginPath(); g.moveTo(meio[0], meio[1]); g.lineTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.closePath(); g.fillStyle = cor; g.fill(); };
  tri(top, dir, '#ffd23f'); tri(dir, bai, '#1d63e0'); tri(bai, esq, '#ffd23f'); tri(esq, top, '#1d63e0');
  g.beginPath(); g.moveTo(top[0], top[1]); g.lineTo(dir[0], dir[1]); g.lineTo(bai[0], bai[1]); g.lineTo(esq[0], esq[1]); g.closePath();
  g.lineWidth = Math.max(1, R * .016); g.strokeStyle = '#20122a'; g.stroke();
  g.beginPath(); g.moveTo(top[0], top[1]); g.lineTo(bai[0], bai[1]); g.moveTo(esq[0], esq[1]); g.quadraticCurveTo(0, -s * .32, dir[0], dir[1]);
  g.lineWidth = Math.max(.8, R * .01); g.strokeStyle = 'rgba(32,18,42,.8)'; g.stroke();
  g.fillStyle = sk96Rad(g, -s * .2, -s * .4, 0, s * 1.2, [[0, 'rgba(255,255,255,.28)'], [1, 'rgba(255,255,255,0)']]); g.fill();
  g.restore();
  const n = 13, base = [ax + Math.sin(rot) * -s * 1.15, ay + Math.cos(rot) * s * 1.15], pts = [];   // a rabiola
  for (let i = 0; i <= n; i++) { const k = i / n, w = Math.sin(t * 5.4 - i * .62) * R * .07 * k; pts.push([base[0] - k * R * .32 + w * .5, base[1] + k * R * .62 + w]); }
  g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.strokeStyle = 'rgba(250,240,225,.7)'; g.lineWidth = Math.max(.8, R * .008); g.stroke();
  for (let i = 2; i <= n; i += 2) { const p = pts[i], q = pts[i - 1], a = Math.atan2(p[1] - q[1], p[0] - q[0]) + Math.PI / 2, b = R * .035; g.fillStyle = i % 4 ? '#ff4f6d' : '#ffd23f'; g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(p[0] + Math.cos(a + .5) * b, p[1] + Math.sin(a + .5) * b); g.lineTo(p[0] + Math.cos(a - .5) * b, p[1] + Math.sin(a - .5) * b); g.closePath(); g.fill(); g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(p[0] - Math.cos(a + .5) * b, p[1] - Math.sin(a + .5) * b); g.lineTo(p[0] - Math.cos(a - .5) * b, p[1] - Math.sin(a - .5) * b); g.closePath(); g.fill(); }
}

/* ---------------------------------------------------------------- 2) BAILE · a caixa de som batendo, o equalizador e os lasers */
const SK96_BPM = 128;
function skBaileFundo(g, W) {
  const R = W / 2; g.translate(R, R);
  g.fillStyle = sk96Rad(g, 0, 0, R * .1, R * 1.1, [[0, '#24123a'], [.6, '#120a20'], [1, '#05030a']]); g.fillRect(-R, -R, W, W);
  g.fillStyle = 'rgba(255,255,255,.05)'; for (let y = -R; y < R; y += R * .09) for (let x = -R + (y / R * 10 & 1 ? R * .045 : 0); x < R; x += R * .09) g.fillRect(x, y, R * .012, R * .012);
  const cx = 0, cy = R * .08, w = R * 1.22, h = R * 1.52, rr = R * .12;   // a caixa: madeira preta, a tela e os parafusos
  g.beginPath(); g.moveTo(cx - w / 2 + rr, cy - h / 2); g.arcTo(cx + w / 2, cy - h / 2, cx + w / 2, cy + h / 2, rr); g.arcTo(cx + w / 2, cy + h / 2, cx - w / 2, cy + h / 2, rr); g.arcTo(cx - w / 2, cy + h / 2, cx - w / 2, cy - h / 2, rr); g.arcTo(cx - w / 2, cy - h / 2, cx + w / 2, cy - h / 2, rr); g.closePath();
  g.fillStyle = sk96Grad(g, 0, cy - h / 2, 0, cy + h / 2, [[0, '#2c2734'], [1, '#141119']]); g.fill();
  g.lineWidth = R * .03; g.strokeStyle = '#3d3647'; g.stroke();
  for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { g.beginPath(); g.arc(cx + sx * (w / 2 - R * .1), cy + sy * (h / 2 - R * .1), R * .028, 0, SK96_TAU); g.fillStyle = '#6d6577'; g.fill(); }
  const anel = (x, y, r1, r2) => { g.beginPath(); g.arc(x, y, r1, 0, SK96_TAU); g.fillStyle = sk96Grad(g, x - r1, y - r1, x + r1, y + r1, [[0, '#8b8496'], [.5, '#3a3442'], [1, '#9c95a6']]); g.fill(); g.beginPath(); g.arc(x, y, r2, 0, SK96_TAU); g.fillStyle = '#09070c'; g.fill(); };
  anel(cx, cy + R * .2, R * .5, R * .44);                     // o grave
  anel(cx, cy - R * .5, R * .15, R * .11);                    // o agudo
}
function skBaile(g, R, t, px) {
  const W = sk76Lado(px * 2), cy = R * .28;
  g.drawImage(sk76Cache('baile|' + W, W, skBaileFundo), -R, -R, 2 * R, 2 * R);
  const fase = (t * SK96_BPM / 60) % 1, b = Math.exp(-fase * 5.5), b2 = Math.exp(-sk96Mod(t * SK96_BPM / 30, 1) * 7);
  // o cone do grave empurrando o ar
  const rc = R * (.42 + .035 * b);
  g.beginPath(); g.arc(0, cy, rc, 0, SK96_TAU);
  g.fillStyle = sk96Rad(g, -rc * .25, cy - rc * .3, rc * .05, rc, [[0, '#4a4256'], [.55, '#1d1823'], [1, '#0d0a11']]); g.fill();
  for (const k of [.78, .56]) { g.beginPath(); g.arc(0, cy, rc * k, 0, SK96_TAU); g.lineWidth = R * .012; g.strokeStyle = 'rgba(255,255,255,.07)'; g.stroke(); }
  g.beginPath(); g.arc(0, cy, rc * .3, 0, SK96_TAU); g.fillStyle = sk96Rad(g, -rc * .08, cy - rc * .1, 0, rc * .3, [[0, '#ff7bd5'], [.6, '#b0249a'], [1, '#4a0d42']]); g.fill();
  g.beginPath(); g.arc(0, -R * .42, R * (.075 + .012 * b2), 0, SK96_TAU); g.fillStyle = '#2b2533'; g.fill();
  g.save(); g.globalCompositeOperation = 'lighter';
  sk76Luz(g, 0, cy, rc * .9, '255,70,200', .25 + .55 * b);
  sk76Luz(g, 0, -R * .42, R * .16, '90,220,255', .2 + .5 * b2);
  // o equalizador em volta do grave (as cores do baile: rosa, roxo e azul)
  const nb = px > 22 ? 28 : 16;
  for (let i = 0; i < nb; i++) {
    const a = -Math.PI / 2 + i * SK96_TAU / nb, k = i / nb;
    const v = .35 + .35 * Math.abs(Math.sin(t * (2.1 + (i % 7) * .41) + i * 1.7)) + .3 * b * (1 - Math.abs(Math.sin(i * .9)));
    const r0 = R * .58, r1 = r0 + R * .26 * v, hue = 300 - 110 * Math.abs(Math.sin(k * Math.PI));
    g.beginPath(); g.moveTo(Math.cos(a) * r0, cy + Math.sin(a) * r0); g.lineTo(Math.cos(a) * r1, cy + Math.sin(a) * r1);
    g.strokeStyle = 'hsla(' + hue.toFixed(0) + ',100%,62%,.82)'; g.lineWidth = R * .045; g.lineCap = 'round'; g.stroke();
  }
  // os lasers varrendo
  for (const [x0, cor, v, f] of [[-R, '90,255,170', .9, 0], [R, '255,80,220', -.75, 2]]) {
    const a = Math.PI / 2 + Math.sin(t * v + f) * .9 + (x0 < 0 ? -.45 : .45), y0 = -R * .95;
    g.beginPath(); g.moveTo(x0, y0); g.lineTo(x0 + Math.cos(a) * R * 3, y0 + Math.sin(a) * R * 3);
    g.strokeStyle = sk96Rgba(cor, .18); g.lineWidth = R * .06; g.stroke(); g.strokeStyle = sk96Rgba(cor, .7); g.lineWidth = R * .012; g.stroke();
  }
  if (b > .5) { g.fillStyle = sk96Rgba('255,255,255', (b - .5) * .3); g.fillRect(-R, -R, 2 * R, 2 * R); }   // o estrobo na batida
  g.restore();
}

/* ---------------------------------------------------------------- 3) MARÉ · as ondas, o sol na água e o calçadão de ondas */
function skMareFundo(g, W) {
  const R = W / 2; g.translate(R, R);
  g.fillStyle = sk96Grad(g, 0, -R, 0, 0, [[0, '#3b9cf0'], [1, '#d3f0ff']]); g.fillRect(-R, -R, W, R + 1);
  g.fillStyle = sk96Rad(g, R * .34, -R * .5, R * .05, R * .6, [[0, 'rgba(255,255,235,1)'], [.2, 'rgba(255,245,200,.85)'], [1, 'rgba(255,240,190,0)']]); g.fillRect(-R, -R, W, R);
  g.beginPath(); g.arc(R * .34, -R * .5, R * .1, 0, SK96_TAU); g.fillStyle = '#fffbe6'; g.fill();
  g.beginPath(); g.moveTo(-R, -R * .02);                       // os morros do outro lado da baía
  g.bezierCurveTo(-R * .82, -R * .2, -R * .64, -R * .28, -R * .55, -R * .3); g.bezierCurveTo(-R * .5, -R * .42, -R * .4, -R * .44, -R * .35, -R * .24);
  g.bezierCurveTo(-R * .2, -R * .12, -R * .05, -R * .14, R * .1, -R * .08); g.bezierCurveTo(R * .4, -R * .16, R * .7, -R * .1, R, -R * .04); g.lineTo(R, 0); g.lineTo(-R, 0); g.closePath();
  g.fillStyle = sk96Grad(g, 0, -R * .44, 0, 0, [[0, '#4f7fae'], [1, '#7aa6cf']]); g.fill();
  g.fillStyle = sk96Grad(g, 0, 0, 0, R * .62, [[0, '#2f97d6'], [1, '#0d4f8e']]); g.fillRect(-R, -R * .005, W, R * .63);
  // o calçadão: as ondas pretas e brancas (desenho de pedra portuguesa, sem marca de ninguém)
  g.fillStyle = '#f2ecdd'; g.fillRect(-R, R * .62, W, R * .4);
  g.fillStyle = '#1d1b1f';
  for (let k = 0; k < 3; k++) {
    const y = R * (.7 + k * .12);
    g.beginPath(); g.moveTo(-R, y);
    for (let x = -R; x <= R; x += R * .04) g.lineTo(x, y + Math.sin(x / R * 6.5 + k * 1.2) * R * .035);
    for (let x = R; x >= -R; x -= R * .04) g.lineTo(x, y + R * .055 + Math.sin(x / R * 6.5 + k * 1.2) * R * .035);
    g.closePath(); g.fill();
  }
  g.fillStyle = sk96Grad(g, 0, R * .6, 0, R * .66, [[0, '#e9d7aa'], [1, '#d9c38d']]); g.fillRect(-R, R * .6, W, R * .045);   // a areia
}
function skMare(g, R, t, px) {
  const W = sk76Lado(px * 2);
  g.drawImage(sk76Cache('mare|' + W, W, skMareFundo), -R, -R, 2 * R, 2 * R);
  g.save(); g.beginPath(); g.rect(-R, -R * .01, 2 * R, R * .62); g.clip();
  const n = px > 20 ? 6 : 4;
  for (let k = 0; k < n; k++) {                               // as ondas: uma faixa sobre a outra, mais perto = maior e mais rápida
    const f = k / (n - 1), y = R * (.06 + f * .46), A = R * (.012 + f * .03), L = 3.2 - f * 1.4, v = .35 + f * .6;
    const onda = x => y + Math.sin(x / R * L * Math.PI + t * v * 2.4 + k * 1.7) * A + Math.sin(x / R * L * 2.1 - t * v * 1.3 + k) * A * .35;
    g.beginPath(); g.moveTo(-R, R);
    for (let x = -R; x <= R + 1; x += R * .05) g.lineTo(x, onda(x));
    g.lineTo(R, R); g.closePath();
    g.fillStyle = 'hsla(' + (204 - f * 8).toFixed(0) + ',72%,' + (40 - f * 10).toFixed(0) + '%,.55)'; g.fill();
    g.beginPath(); for (let x = -R; x <= R + 1; x += R * .05) { const yy = onda(x) - A * .2; x === -R ? g.moveTo(x, yy) : g.lineTo(x, yy); }
    g.strokeStyle = 'rgba(235,250,255,' + (.35 + .4 * f).toFixed(2) + ')'; g.lineWidth = R * (.008 + f * .014); g.stroke();
  }
  g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 16; i++) {                              // o brilho do sol na água, piscando
    const y = R * (.03 + (i / 16) * .5), x = R * .34 + Math.sin(i * 7.31) * R * (.05 + i * .012), a = Math.pow(Math.max(0, Math.sin(t * 3.1 + i * 2.3)), 6);
    if (a > .05) sk76Brilho(g, x, y, R * (.035 + i * .002), a);
  }
  g.restore();
  for (let i = 0; i < 2; i++) {                               // as gaivotas
    const s = sk96Mod(t * .06 + i * .5, 1), x = R * (-1.15 + 2.3 * s), y = R * (-.62 + i * .14 + Math.sin(t * .8 + i) * .03), w = R * (.07 - i * .015), bat = Math.sin(t * 7 + i * 2) * .5;
    g.beginPath(); g.moveTo(x - w, y - w * (.25 + bat * .4)); g.quadraticCurveTo(x - w * .4, y - w * .55, x, y); g.quadraticCurveTo(x + w * .4, y - w * .55, x + w, y - w * (.25 + bat * .4));
    g.strokeStyle = 'rgba(40,52,70,.85)'; g.lineWidth = Math.max(1, R * .016); g.lineCap = 'round'; g.stroke();
  }
}

/* ---------------------------------------------------------------- 4) TEMPESTADE · os raios, a chuva e o refletor do campinho */
const SK96_CHUVA = sk96Pontos(5521, 64, r => [r() * 2.4 - 1.2, r() * 2, .6 + r() * .6]);
function skTempFundo(g, W) {
  const R = W / 2; g.translate(R, R);
  g.fillStyle = sk96Grad(g, 0, -R, 0, R, [[0, '#0f1424'], [.55, '#232c42'], [1, '#121a14']]); g.fillRect(-R, -R, W, W);
  const r = estRnd(8811);
  for (let i = 0; i < 46; i++) {                              // as nuvens pesadas (a parte de cima mais clara)
    const x = (r() * 2.4 - 1.2) * R, y = (-1 + r() * .75) * R, s = (.14 + r() * .26) * R;
    g.fillStyle = sk96Rad(g, x, y - s * .3, s * .1, s, [[0, 'rgba(128,140,172,.6)'], [.6, 'rgba(66,76,104,.48)'], [1, 'rgba(30,36,52,0)']]);
    g.beginPath(); g.arc(x, y, s, 0, SK96_TAU); g.fill();
  }
  g.fillStyle = sk96Grad(g, 0, R * .5, 0, R, [[0, '#183626'], [1, '#0b1a12']]); g.fillRect(-R, R * .5, W, R * .5);
  g.strokeStyle = 'rgba(255,255,255,.18)'; g.lineWidth = R * .01; g.beginPath(); g.moveTo(-R, R * .74); g.lineTo(R, R * .74); g.stroke();
  // o gol do campinho e o poste do refletor
  g.strokeStyle = '#e9eef3'; g.lineWidth = R * .022; g.lineJoin = 'round';
  g.beginPath(); g.moveTo(-R * .28, R * .62); g.lineTo(-R * .28, R * .42); g.lineTo(R * .1, R * .42); g.lineTo(R * .1, R * .62); g.stroke();
  g.strokeStyle = 'rgba(233,238,243,.25)'; g.lineWidth = R * .006; for (let x = -R * .26; x < R * .1; x += R * .045) { g.beginPath(); g.moveTo(x, R * .43); g.lineTo(x + R * .03, R * .58); g.stroke(); }
  g.strokeStyle = '#2b3138'; g.lineWidth = R * .03; g.beginPath(); g.moveTo(R * .6, R * .66); g.lineTo(R * .6, -R * .12); g.stroke();
  g.fillStyle = '#3b434c'; g.fillRect(R * .48, -R * .2, R * .24, R * .1);
}
function skTempestade(g, R, t, px) {
  const W = sk76Lado(px * 2);
  g.drawImage(sk76Cache('temp|' + W, W, skTempFundo), -R, -R, 2 * R, 2 * R);
  const ciclo = 2.6, k = Math.floor(t / ciclo), f = (t % ciclo) / ciclo;
  const flash = f < .03 ? 1 : f < .06 ? .25 : f < .1 ? .8 : Math.max(0, 1 - (f - .1) * 9);
  g.save(); g.globalCompositeOperation = 'lighter';
  const fl = .75 + .25 * Math.sin(t * 23) * Math.sin(t * 7);   // o refletor (com o chiado da lâmpada)
  sk76Luz(g, R * .6, -R * .15, R * .32, '255,236,190', .35 * fl);
  g.fillStyle = sk96Grad(g, R * .6, -R * .1, R * .1, R * .6, [[0, sk96Rgba('255,236,190', .18 * fl)], [1, 'rgba(255,236,190,0)']]);
  g.beginPath(); g.moveTo(R * .5, -R * .1); g.lineTo(R * .7, -R * .1); g.lineTo(R * .3, R * .7); g.lineTo(-R * .45, R * .7); g.closePath(); g.fill();
  if (flash > .02) {                                          // o raio: um caminho que racha o céu, com a luz nas nuvens
    const rr = estRnd(3001 + (k % 97) * 7919), x0 = (rr() - .5) * R * 1.1, x1 = x0 + (rr() - .5) * R * .7;
    sk76Luz(g, x0, -R * .55, R * 1.1, '170,190,255', .5 * flash);
    const pts = [[x0, -R * .8]]; let x = x0, y = -R * .8; const passos = 9;
    for (let i = 1; i <= passos; i++) { y = -R * .8 + (R * 1.32) * i / passos; x = x0 + (x1 - x0) * i / passos + (rr() - .5) * R * .16; pts.push([x, y]); }
    for (const [lw, cor] of [[.07, 'rgba(140,170,255,.25)'], [.03, 'rgba(200,215,255,.6)'], [.012, 'rgba(255,255,255,.95)']]) {
      g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.strokeStyle = cor; g.lineWidth = R * lw * (.6 + .4 * flash); g.lineJoin = 'round'; g.stroke();
    }
    const m = pts[4]; g.beginPath(); g.moveTo(m[0], m[1]); g.lineTo(m[0] + R * .22, m[1] + R * .18); g.lineTo(m[0] + R * .3, m[1] + R * .34); g.strokeStyle = 'rgba(220,230,255,' + (.7 * flash).toFixed(2) + ')'; g.lineWidth = R * .012; g.stroke();
  }
  g.restore();
  g.strokeStyle = 'rgba(170,200,255,.42)'; g.lineWidth = Math.max(.7, R * .008); g.lineCap = 'round';
  g.beginPath();                                              // a chuva caindo de lado
  for (const [x0, y0, v] of (px > 20 ? SK96_CHUVA : SK96_CHUVA.slice(0, 30))) {
    const y = sk96Mod(y0 + t * 1.7 * v, 2) - 1, x = x0 + y * .28 - .1;
    g.moveTo(x * R, y * R); g.lineTo((x + .025) * R, (y + .09) * R);
  }
  g.stroke();
  for (let i = 0; i < 5; i++) {                               // os pingos no chão
    const s = sk96Mod(t * 1.3 + i * .37, 1), x = R * (-.7 + ((i * .61) % 1) * 1.4), y = R * (.8 + (i % 3) * .05);
    g.beginPath(); g.ellipse(x, y, R * .08 * s, R * .02 * s, 0, 0, SK96_TAU); g.strokeStyle = 'rgba(190,210,255,' + (.6 * (1 - s)).toFixed(2) + ')'; g.lineWidth = R * .008; g.stroke();
  }
}

/* ---------------------------------------------------------------- 5) IPÊ AMARELO · as flores caindo */
let SK96_IPE_COPA = [];
const SK96_IPE_PETALA = sk96Pontos(4410, 18, r => [r() * 2.2 - 1.1, r(), .5 + r() * .5, r() * 6]);
function skIpeFundo(g, W) {
  const R = W / 2; g.translate(R, R);
  g.fillStyle = sk96Grad(g, 0, -R, 0, R, [[0, '#3f97ea'], [.7, '#a9dcff'], [1, '#d5f0ff']]); g.fillRect(-R, -R, W, W);
  for (const [x, y, s] of [[-.6, -.62, .25], [.55, -.7, .2], [.1, -.45, .16]]) { g.fillStyle = sk96Rad(g, x * R, y * R, 0, s * R, [[0, 'rgba(255,255,255,.55)'], [1, 'rgba(255,255,255,0)']]); g.beginPath(); g.arc(x * R, y * R, s * R, 0, SK96_TAU); g.fill(); }
  g.fillStyle = '#6aa65a'; g.beginPath(); g.moveTo(-R, R * .62); g.quadraticCurveTo(-R * .3, R * .42, R * .2, R * .6); g.quadraticCurveTo(R * .6, R * .52, R, R * .58); g.lineTo(R, R); g.lineTo(-R, R); g.closePath(); g.fill();
  g.fillStyle = '#4c8c43'; g.fillRect(-R, R * .8, W, R * .2);
  const r = estRnd(612), pontas = [];
  const galho = (x, y, a, L, w, n) => {                       // o tronco e os galhos (cada um se divide em dois)
    const x2 = x + Math.cos(a) * L, y2 = y + Math.sin(a) * L;
    g.strokeStyle = '#4b2e1c'; g.lineWidth = w; g.lineCap = 'round'; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a + .25) * L * .5, y + Math.sin(a + .25) * L * .5, x2, y2); g.stroke();
    if (n <= 0) { pontas.push([x2, y2]); return; }
    galho(x2, y2, a - .38 - r() * .25, L * (.68 + r() * .12), w * .66, n - 1);
    galho(x2, y2, a + .34 + r() * .25, L * (.66 + r() * .12), w * .66, n - 1);
    if (n > 2 && r() < .5) galho(x2, y2, a + (r() - .5) * .3, L * .6, w * .6, n - 2);
  };
  galho(R * .02, R * 1.02, -Math.PI / 2 - .04, R * .5, R * .1, 4);
  const copa = [];                                            // as flores: os cachos amarelos em volta das pontas
  for (const [x, y] of pontas) for (let i = 0; i < 9; i++) { const a = r() * SK96_TAU, d = r() * R * .16; copa.push([x + Math.cos(a) * d, y + Math.sin(a) * d * .8, R * (.035 + r() * .045), r()]); }
  copa.sort((a, b) => a[1] - b[1]);
  for (const [x, y, s, k] of copa) { g.fillStyle = k < .25 ? '#d99410' : k < .6 ? '#ffc51c' : '#ffdc3a'; g.beginPath(); g.arc(x, y, s, 0, SK96_TAU); g.fill(); }
  for (const [x, y, s, k] of copa) if (k > .7) { g.fillStyle = 'rgba(255,248,190,.8)'; g.beginPath(); g.arc(x - s * .3, y - s * .3, s * .38, 0, SK96_TAU); g.fill(); }
  SK96_IPE_COPA = copa.filter((_, i) => i % 7 === 0).map(([x, y]) => [x / R, y / R]);
  for (let i = 0; i < 26; i++) { g.fillStyle = 'rgba(255,205,40,.9)'; g.beginPath(); g.ellipse((r() * 2 - 1) * R, R * (.84 + r() * .14), R * .022, R * .012, r() * 3, 0, SK96_TAU); g.fill(); }   // as flores no chão
}
function skIpe(g, R, t, px) {
  const W = sk76Lado(px * 2);
  g.drawImage(sk76Cache('ipe|' + W, W, skIpeFundo), -R, -R, 2 * R, 2 * R);
  g.save(); g.globalCompositeOperation = 'lighter';
  if (px > 18) SK96_IPE_COPA.forEach(([u, v], i) => { const a = Math.pow(Math.max(0, Math.sin(t * 1.6 + i * 2.4)), 8); if (a > .05) sk76Luz(g, u * R, v * R, R * .1, '255,240,150', .45 * a); });
  g.restore();
  for (const [x0, y0, v, ph] of (px > 20 ? SK96_IPE_PETALA : SK96_IPE_PETALA.slice(0, 9))) {   // as flores caindo com o vento
    const s = sk96Mod(y0 + t * .16 * v, 1), y = -.55 + s * 1.5, x = x0 + Math.sin(t * 1.4 + ph) * .1 + s * .25, rot = t * 2.2 * v + ph;
    g.save(); g.translate(x * R, y * R); g.rotate(rot); g.scale(1, .45 + .4 * Math.abs(Math.sin(t * 3 * v + ph)));
    g.fillStyle = '#ffcf24'; g.beginPath(); g.ellipse(0, 0, R * .045, R * .028, 0, 0, SK96_TAU); g.fill();
    g.fillStyle = 'rgba(190,110,10,.5)'; g.fillRect(-R * .03, -R * .003, R * .06, R * .006);
    g.restore();
  }
}

/* ---------------------------------------------------------------- 6) LAVA · a lava correndo nas rachaduras */
let SK96_LAVA_RACHA = [];
function skLavaFundo(g, W) {
  const R = W / 2; g.translate(R, R);
  g.fillStyle = sk96Rad(g, 0, 0, R * .1, R * 1.1, [[0, '#2a1410'], [1, '#100806']]); g.fillRect(-R, -R, W, W);
  const r = estRnd(2207);
  for (let i = 0; i < 70; i++) { const x = (r() * 2 - 1) * R, y = (r() * 2 - 1) * R, s = R * (.08 + r() * .2); g.fillStyle = r() < .5 ? 'rgba(60,34,26,.35)' : 'rgba(8,4,3,.35)'; g.beginPath(); g.ellipse(x, y, s, s * (.5 + r() * .5), r() * 3, 0, SK96_TAU); g.fill(); }
  const linhas = [];                                          // as rachaduras: caminhos tortos que saem do meio e se dividem
  const anda = (x, y, a, n, lw) => {
    const l = [[x, y]];
    for (let i = 0; i < n; i++) { a += (r() - .5) * .9; x += Math.cos(a) * R * .09; y += Math.sin(a) * R * .09; l.push([x, y]); if (Math.hypot(x, y) > R * 1.05) break; if (r() < .18 && lw > .02) anda(x, y, a + (r() < .5 ? .9 : -.9), n - i - 2, lw * .6); }
    linhas.push({ l, lw });
  };
  for (let k = 0; k < 6; k++) anda(Math.cos(k) * R * .1, Math.sin(k) * R * .1, k * SK96_TAU / 6 + r() * .4, 12, .05);
  SK96_LAVA_RACHA = linhas.map(o => ({ l: o.l.map(([x, y]) => [x / R, y / R]), lw: o.lw }));
  g.lineJoin = 'round'; g.lineCap = 'round';
  for (const o of linhas) { g.beginPath(); o.l.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.strokeStyle = '#3a0c04'; g.lineWidth = R * o.lw * 1.6; g.stroke(); g.strokeStyle = '#ff5a14'; g.lineWidth = R * o.lw * .55; g.stroke(); }
}
function skLava(g, R, t, px) {
  const W = sk76Lado(px * 2);
  g.drawImage(sk76Cache('lava|' + W, W, skLavaFundo), -R, -R, 2 * R, 2 * R);
  g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round'; g.lineJoin = 'round';
  const pulso = .5 + .5 * Math.sin(t * 1.7);
  sk76Luz(g, 0, 0, R * .55, '255,110,30', .35 + .25 * pulso);
  for (const o of SK96_LAVA_RACHA) {                          // a luz correndo nas rachaduras (do meio para fora)
    const l = o.l; let s = 0;
    for (let i = 1; i < l.length; i++) {
      const a = l[i - 1], b = l[i]; s += Math.hypot(b[0] - a[0], b[1] - a[1]);
      const v = .5 + .5 * Math.sin(t * 2.6 - s * 9);
      g.beginPath(); g.moveTo(a[0] * R, a[1] * R); g.lineTo(b[0] * R, b[1] * R);
      g.strokeStyle = 'rgba(255,' + (150 + 90 * v | 0) + ',60,' + (.25 + .5 * v).toFixed(2) + ')'; g.lineWidth = R * o.lw * (.9 + .9 * v); g.stroke();
    }
  }
  g.restore();
  g.beginPath(); g.ellipse(0, R * .02, R * .26, R * .2, 0, 0, SK96_TAU);   // a poça do meio, borbulhando
  g.fillStyle = sk96Rad(g, -R * .05, -R * .03, R * .02, R * .28, [[0, '#fff1a6'], [.35, '#ffb22e'], [.8, '#ff4a12'], [1, '#7a1205']]); g.fill();
  for (let i = 0; i < 4; i++) {
    const s = sk96Mod(t * .9 + i * .27, 1), a = i * 1.9 + 1, x = Math.cos(a) * R * .12, y = R * .02 + Math.sin(a) * R * .09, r0 = R * (.015 + .045 * s);
    g.beginPath(); g.arc(x, y, r0, 0, SK96_TAU); g.strokeStyle = 'rgba(255,240,170,' + (.9 * (1 - s)).toFixed(2) + ')'; g.lineWidth = R * .01; g.stroke();
  }
  g.save(); g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 12; i++) {                              // as brasas subindo
    const s = sk96Mod(t * .28 + i * .131, 1), x = R * (-.6 + ((i * .577) % 1) * 1.2) + Math.sin(t * 1.8 + i) * R * .05, y = R * (.55 - 1.4 * s), a = Math.sin(s * Math.PI);
    g.fillStyle = 'rgba(255,190,80,' + (.85 * a).toFixed(3) + ')'; g.fillRect(x - R * .012, y - R * .012, R * .024, R * .024);
  }
  g.restore();
}

/* ---------------------------------------------------------------- 7) FUNDADOR · a dos 30 primeiros (ultra rara) */
// o céu violeta de estrelas, o sol de raios de ouro girando devagar, o medalhão de ouro com o louro, a coroa com as pedras
// acendendo uma de cada vez, a faixa FUNDADOR e o brilho holográfico passando de tempos em tempos
const SK96_FD_ESTRELA = sk96Pontos(30, 40, r => [r() * 2 - 1, r() * 2 - 1, .4 + r() * .9, r() * 6]);
function skFundCeu(g, W) {
  const R = W / 2; g.translate(R, R);
  g.fillStyle = sk96Rad(g, 0, -R * .1, R * .05, R * 1.08, [[0, '#3a1a6e'], [.5, '#1d0b3f'], [1, '#08031a']]); g.fillRect(-R, -R, W, W);
  g.globalCompositeOperation = 'lighter';
  for (const [x, y, s, c, a] of [[-.6, -.5, .55, '120,60,255', .22], [.65, .45, .5, '255,90,200', .14], [.55, -.6, .4, '60,120,255', .18]]) sk76Luz(g, x * R, y * R, s * R, c, a);
}
function skFundRaios(g, W) {                                  // o sol de raios (gira inteiro)
  const R = W / 2; g.translate(R, R);
  const n = 36;
  for (let i = 0; i < n; i++) {
    const a = i * SK96_TAU / n, L = i % 2 ? .82 : 1.0, w = i % 2 ? .035 : .055;
    g.beginPath(); g.moveTo(Math.cos(a - w * .5) * R * .38, Math.sin(a - w * .5) * R * .38); g.lineTo(Math.cos(a) * R * L, Math.sin(a) * R * L); g.lineTo(Math.cos(a + w * .5) * R * .38, Math.sin(a + w * .5) * R * .38); g.closePath();
    g.fillStyle = sk96Grad(g, 0, 0, Math.cos(a) * R, Math.sin(a) * R, [[0, 'rgba(255,214,110,.75)'], [.6, 'rgba(242,170,60,.45)'], [1, 'rgba(200,120,30,0)']]); g.fill();
  }
  for (let i = 0; i < 18; i++) { const a = i * SK96_TAU / 18 + SK96_TAU / 36, d = R * .86; sk96Estrela(g, Math.cos(a) * d, Math.sin(a) * d, R * .028, R * .011, 4, a); g.fillStyle = 'rgba(255,236,170,.85)'; g.fill(); }
}
function skFundMedalha(g, W) {                                // o medalhão de ouro: as bordas, o louro, a coroa e a faixa
  const R = W / 2; g.translate(R, R);
  const ouro = (x0, y0, x1, y1) => sk96Grad(g, x0, y0, x1, y1, [[0, '#fff3c0'], [.25, '#ffd45e'], [.5, '#e4a12c'], [.75, '#ffe08a'], [1, '#a8641a']]);
  const rm = R * .6;
  g.beginPath(); g.arc(0, 0, rm + R * .05, 0, SK96_TAU); g.fillStyle = 'rgba(0,0,0,.35)'; g.fill();
  g.beginPath(); g.arc(0, 0, rm, 0, SK96_TAU); g.fillStyle = ouro(-rm, -rm, rm, rm); g.fill();
  g.beginPath(); g.arc(0, 0, rm * .86, 0, SK96_TAU); g.fillStyle = sk96Rad(g, -rm * .25, -rm * .35, rm * .05, rm * .95, [[0, '#4a1f86'], [.7, '#2a0f55'], [1, '#160636']]); g.fill();
  g.lineWidth = R * .018; g.strokeStyle = '#8a4f12'; g.stroke();
  for (let i = 0; i < 48; i++) { const a = i * SK96_TAU / 48; g.beginPath(); g.arc(Math.cos(a) * rm * .93, Math.sin(a) * rm * .93, R * .009, 0, SK96_TAU); g.fillStyle = i % 2 ? '#fff0b8' : '#b87522'; g.fill(); }   // o serrilhado
  const folha = (x, y, a, s) => { g.save(); g.translate(x, y); g.rotate(a); g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(s * .5, -s * .35, s, 0); g.quadraticCurveTo(s * .5, s * .35, 0, 0); g.closePath(); g.fillStyle = ouro(0, -s * .3, s, s * .3); g.fill(); g.lineWidth = s * .06; g.strokeStyle = 'rgba(120,64,10,.7)'; g.stroke(); g.restore(); };
  for (const lado of [-1, 1]) for (let i = 0; i < 9; i++) {   // o louro: dois ramos subindo pelos lados
    const a = Math.PI / 2 + lado * (.35 + i * .2), d = rm * .74, x = Math.cos(a) * d, y = Math.sin(a) * d;
    folha(x, y, a + lado * (Math.PI / 2 + .55), R * (.11 - i * .004));
  }
  // a coroa
  const cy = -R * .06, cw = R * .62, ch = R * .34;
  g.beginPath(); g.moveTo(-cw / 2, cy + ch * .45);
  const picos = [[-cw / 2, cy - ch * .45], [-cw / 4, cy - ch * .05], [0, cy - ch * .7], [cw / 4, cy - ch * .05], [cw / 2, cy - ch * .45]];
  g.lineTo(picos[0][0], picos[0][1]); for (let i = 1; i < picos.length; i++) { const p = picos[i - 1], q = picos[i]; g.quadraticCurveTo((p[0] + q[0]) / 2, Math.max(p[1], q[1]) + ch * .2, q[0], q[1]); }
  g.lineTo(cw / 2, cy + ch * .45); g.closePath();
  g.fillStyle = ouro(-cw / 2, cy - ch, cw / 2, cy + ch); g.fill(); g.lineWidth = R * .02; g.strokeStyle = '#7a4410'; g.stroke();
  g.fillStyle = ouro(-cw / 2, cy + ch * .3, cw / 2, cy + ch * .6); g.fillRect(-cw / 2 - R * .02, cy + ch * .35, cw + R * .04, ch * .28);
  g.strokeRect(-cw / 2 - R * .02, cy + ch * .35, cw + R * .04, ch * .28);
  for (const [x, y] of picos) { g.beginPath(); g.arc(x, y - R * .025, R * .032, 0, SK96_TAU); g.fillStyle = sk96Rad(g, x - R * .01, y - R * .035, 0, R * .035, [[0, '#ffffff'], [1, '#e9c46a']]); g.fill(); g.lineWidth = R * .008; g.strokeStyle = '#8a5212'; g.stroke(); }
  // as pedras no aro da coroa: rubi, safira e esmeralda (lapidadas: a luz de cima e a faceta escura embaixo)
  for (const [u, c0, c1] of [[-.155, '#ff6b8a', '#9c0f2e'], [0, '#7cc4ff', '#123f9e'], [.155, '#6bf2a8', '#0b6b3e']]) {
    const x = u * R, y = cy + ch * .49, rr = R * .042;
    g.beginPath(); g.moveTo(x, y - rr); g.lineTo(x + rr * .9, y); g.lineTo(x, y + rr); g.lineTo(x - rr * .9, y); g.closePath();
    g.fillStyle = sk96Grad(g, x - rr, y - rr, x + rr, y + rr, [[0, c0], [1, c1]]); g.fill(); g.lineWidth = R * .008; g.strokeStyle = '#6b3b0c'; g.stroke();
    g.beginPath(); g.moveTo(x - rr * .45, y - rr * .1); g.lineTo(x, y - rr * .62); g.lineTo(x + rr * .2, y - rr * .2); g.closePath(); g.fillStyle = 'rgba(255,255,255,.75)'; g.fill();
  }
  g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.ellipse(-cw * .18, cy - ch * .1, cw * .12, ch * .08, -.5, 0, SK96_TAU); g.fill();   // o reflexo no ouro
  // a faixa FUNDADOR embaixo
  const fy = R * .36, fw = R * .9, fh = R * .17;
  g.beginPath(); g.moveTo(-fw / 2, fy - fh / 2); g.quadraticCurveTo(0, fy - fh * .1 - fh / 2, fw / 2, fy - fh / 2); g.lineTo(fw / 2 - fh * .3, fy); g.lineTo(fw / 2, fy + fh / 2); g.quadraticCurveTo(0, fy - fh * .1 + fh / 2, -fw / 2, fy + fh / 2); g.lineTo(-fw / 2 + fh * .3, fy); g.closePath();
  g.fillStyle = sk96Grad(g, 0, fy - fh / 2, 0, fy + fh / 2, [[0, '#d8262f'], [1, '#8a0f1a']]); g.fill(); g.lineWidth = R * .014; g.strokeStyle = '#ffd45e'; g.stroke();
  g.fillStyle = '#ffe9a0'; g.font = '900 ' + (fh * .62).toFixed(1) + 'px "Arial Black", Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('FUNDADOR', 0, fy - fh * .05);
}
const SK96_FD_PEDRA = [[-.155, '255,70,110'], [0, '110,180,255'], [.155, '70,240,150']];
function skFundador(g, R, t, px) {
  const W = sk76Lado(px * 2);
  g.drawImage(sk76Cache('fd-ceu|' + W, W, skFundCeu), -R, -R, 2 * R, 2 * R);
  g.save(); g.globalCompositeOperation = 'lighter';
  for (const [u, v, s, ph] of SK96_FD_ESTRELA) { const a = .3 + .7 * Math.pow(.5 + .5 * Math.sin(t * 2.1 + ph), 3); g.fillStyle = 'rgba(255,245,220,' + (a * .85).toFixed(3) + ')'; g.fillRect(u * R, v * R, R * .011 * s, R * .011 * s); }
  g.restore();
  g.save(); g.rotate(t * .12); g.drawImage(sk76Cache('fd-raios|' + W, W, skFundRaios), -R, -R, 2 * R, 2 * R); g.restore();
  g.save(); g.globalCompositeOperation = 'lighter'; g.rotate(-t * .2); g.globalAlpha = .45; g.drawImage(sk76Cache('fd-raios|' + W, W, skFundRaios), -R * .78, -R * .78, R * 1.56, R * 1.56); g.restore();
  const pulso = .5 + .5 * Math.sin(t * 1.6);
  g.save(); g.globalCompositeOperation = 'lighter'; sk76Luz(g, 0, 0, R * .85, '255,200,90', .18 + .14 * pulso); g.restore();
  g.drawImage(sk76Cache('fd-med|' + W, W, skFundMedalha), -R, -R, 2 * R, 2 * R);
  g.save(); g.globalCompositeOperation = 'lighter';
  SK96_FD_PEDRA.forEach(([u, rgb], i) => {                    // as pedras da coroa acendendo uma de cada vez
    const a = Math.pow(Math.max(0, Math.sin(t * 1.9 - i * 1.05)), 4), x = u * R, y = -R * .06 + R * .34 * .49;
    sk76Luz(g, x, y, R * (.06 + .07 * a), rgb, .15 + .6 * a);
    if (a > .5) sk76Brilho(g, x + R * .012, y - R * .02, R * .07, (a - .5) * 2);
  });
  const ph = sk96Mod(t / 3.6, 1);                             // o brilho holográfico atravessando a tampinha
  if (ph < .42) {
    const s = ph / .42, x = -R * 1.6 + s * R * 3.2;
    const gr = g.createLinearGradient(x - R * .4, -R, x + R * .4, R);
    gr.addColorStop(0, 'rgba(255,80,200,0)'); gr.addColorStop(.3, 'rgba(255,90,210,.16)'); gr.addColorStop(.45, 'rgba(120,220,255,.26)'); gr.addColorStop(.55, 'rgba(255,255,200,.32)'); gr.addColorStop(.7, 'rgba(120,255,170,.16)'); gr.addColorStop(1, 'rgba(120,255,170,0)');
    g.fillStyle = gr; g.fillRect(-R, -R, 2 * R, 2 * R);
  }
  for (let i = 0; i < 5; i++) {                               // as estrelinhas no ouro
    const a = Math.pow(Math.max(0, Math.sin(t * 2.4 + i * 1.7)), 12); if (a < .05) continue;
    const b = i * 1.31 + 2.2, d = R * (.42 + (i % 3) * .07);
    sk76Brilho(g, Math.cos(b) * d, Math.sin(b) * d - R * .02, R * .1, a);
  }
  g.restore();
}

/* ---------------------------------------------------------------- 8) as bordas acesas novas (e a AURA DOS FUNDADORES) */
const sk96AroAntes = sk76Aro;
sk76Aro = function (g, x, y, r, D, t) {
  const B = TP_MAPA.b.get(D.b);
  if (!B || !B.anim || !SK96_ANIM_ARO.has(B.anim)) return sk96AroAntes.apply(this, arguments);
  const rgb = sk76Rgb(D.bc[1]);
  g.save(); g.translate(x, y); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
  if (B.anim === 'arco') {                                    // as cores do arco-íris dando a volta
    const n = 36;
    for (let i = 0; i < n; i++) {
      const a0 = i * SK96_TAU / n, hue = sk96Mod(i * 360 / n + t * 140, 360);
      g.beginPath(); g.arc(0, 0, r * .965, a0, a0 + SK96_TAU / n + .01); g.strokeStyle = 'hsla(' + hue.toFixed(0) + ',100%,62%,.6)'; g.lineWidth = r * .085; g.stroke();
    }
    g.beginPath(); g.arc(0, 0, r * 1.02, 0, SK96_TAU); g.strokeStyle = 'hsla(' + sk96Mod(t * 140, 360).toFixed(0) + ',100%,70%,.18)'; g.lineWidth = r * .06; g.stroke();
  } else if (B.anim === 'ouro') {                             // o ouro escorrendo: três luzes correndo pela beira e o brilho por cima
    g.beginPath(); g.arc(0, 0, r * .96, 0, SK96_TAU); g.strokeStyle = 'rgba(255,196,80,.28)'; g.lineWidth = r * .08; g.stroke();
    for (const [v, f, L] of [[.9, 0, .9], [-.6, 2.1, .6], [1.4, 4, .45]]) {
      const a = t * v + f;
      for (let k = 0; k < 6; k++) { const s = k / 6; g.beginPath(); g.arc(0, 0, r * .96, a - L * (s + 1 / 6) * Math.sign(v), a - L * s * Math.sign(v), v < 0); g.strokeStyle = 'rgba(255,' + (226 - k * 14) + ',' + (150 - k * 20) + ',' + (.7 * (1 - s)).toFixed(2) + ')'; g.lineWidth = r * (.07 - k * .006); g.stroke(); }
      sk76Brilho(g, Math.cos(a) * r * .96, Math.sin(a) * r * .96, r * .12, .9);
    }
  } else if (B.anim === 'cometa') {                           // o cometa dando a volta com a cauda e as faíscas que ficam
    const a = t * 2.1;
    for (let k = 0; k < 14; k++) { const s = k / 14; g.beginPath(); g.arc(0, 0, r * .97, a - 1.4 * (s + 1 / 14), a - 1.4 * s); g.strokeStyle = sk96Rgba(rgb, .75 * Math.pow(1 - s, 1.6)); g.lineWidth = r * (.1 * (1 - s) + .015); g.stroke(); }
    sk76Luz(g, Math.cos(a) * r * .95, Math.sin(a) * r * .95, r * .21, rgb, .95); sk76Brilho(g, Math.cos(a) * r * .97, Math.sin(a) * r * .97, r * .11, 1);   // (até 1,16 × o raio)
    for (let i = 0; i < 5; i++) { const s = sk96Mod(t * 1.3 + i / 5, 1), b = a - 1.6 - i * .5, d = r * (.97 + .08 * s); g.fillStyle = 'rgba(255,250,230,' + (.8 * (1 - s)).toFixed(2) + ')'; g.fillRect(Math.cos(b) * d - r * .012, Math.sin(b) * d - r * .012, r * .024, r * .024); }
  } else if (B.anim === 'fundador') {                         // a AURA DOS FUNDADORES: o ouro respirando, os três brilhos e o pulso
    const p = .5 + .5 * Math.sin(t * 2);
    g.globalCompositeOperation = 'source-over';               // (o halo pintado em ouro: somando luz, no gramado verde ele ficava verde-limão)
    // (tudo dentro de 1,15 × o raio: o aro do time e a bola ficam livres, como nas animadas da v76)
    const halo = g.createRadialGradient(0, 0, r * .95, 0, 0, r * 1.15);
    halo.addColorStop(0, 'rgba(255,214,110,' + (.4 + .25 * p).toFixed(3) + ')'); halo.addColorStop(.45, 'rgba(240,170,60,' + (.18 + .12 * p).toFixed(3) + ')'); halo.addColorStop(1, 'rgba(200,120,30,0)');
    g.fillStyle = halo; g.beginPath(); g.arc(0, 0, r * 1.15, 0, SK96_TAU); g.arc(0, 0, r * .95, 0, SK96_TAU, true); g.fill('evenodd');
    g.globalCompositeOperation = 'lighter';
    g.beginPath(); g.arc(0, 0, r * .96, 0, SK96_TAU); g.strokeStyle = 'rgba(255,226,140,' + (.35 + .25 * p).toFixed(3) + ')'; g.lineWidth = r * .03; g.stroke();
    const hl = t * .8; g.beginPath(); g.arc(0, 0, r * .96, hl, hl + .9); g.strokeStyle = 'rgba(255,255,230,.7)'; g.lineWidth = r * .045; g.stroke();
    for (const [v, f, rgb2, d] of [[1.5, 0, '255,214,110', .97], [-1.1, 2.1, '200,140,255', .93], [.8, 4.2, '255,255,255', .97]]) {
      const a = t * v + f;
      for (let k = 1; k <= 6; k++) { const b = a - Math.sign(v) * k * .06; g.beginPath(); g.arc(Math.cos(b) * r * d, Math.sin(b) * r * d, r * (.035 - k * .004), 0, SK96_TAU); g.fillStyle = sk96Rgba(rgb2, .5 * (1 - k / 7)); g.fill(); }
      sk76Luz(g, Math.cos(a) * r * d, Math.sin(a) * r * d, r * .18, rgb2, .85); sk76Brilho(g, Math.cos(a) * r * d, Math.sin(a) * r * d, r * .09, 1);
    }
    const s = sk96Mod(t / 2.4, 1);                            // o pulso de luz saindo da borda (em ouro, por cima; até 1,13 × o raio)
    g.globalCompositeOperation = 'source-over';
    g.beginPath(); g.arc(0, 0, r * (1 + .12 * s), 0, SK96_TAU); g.strokeStyle = 'rgba(255,214,120,' + (.55 * (1 - s)).toFixed(3) + ')'; g.lineWidth = r * .03 * (1 - s) + r * .006; g.stroke();
  }
  g.restore();
};
const SK96_ANIM_ARO = new Set(['arco', 'ouro', 'cometa', 'fundador']);

/* ---------------------------------------------------------------- 9) as peças novas na lista (no fim: os códigos de antes não mudam) */
const SK96_CARAS = [
  { id: 'zk', nome: 'Pipa no céu', anim: 'A pipa dançando no vento', t0: .5, pinta: skPipa, pr: SK96_PRECO.cara },
  { id: 'zn', nome: 'Baile', anim: 'A caixa de som batendo', t0: .05, pinta: skBaile, pr: SK96_PRECO.cara },
  { id: 'zm', nome: 'Maré', anim: 'As ondas do mar', t0: 1.2, pinta: skMare, pr: SK96_PRECO.cara },
  { id: 'zt', nome: 'Tempestade', anim: 'Raios e chuva', t0: .07, pinta: skTempestade, pr: SK96_PRECO.cara },
  { id: 'zi', nome: 'Ipê amarelo', anim: 'As flores caindo', t0: 1.5, pinta: skIpe, pr: SK96_PRECO.cara },
  { id: 'zv', nome: 'Lava', anim: 'A lava correndo nas rachaduras', t0: .8, pinta: skLava, pr: SK96_PRECO.cara },
  { id: SK96_FUNDADOR.cara, nome: 'Fundador', anim: 'A coroa de ouro e o brilho holográfico', t0: .6, pinta: skFundador, pr: SK96_PRECO.fundador, fundador: true },
];
const SK96_AROS = [
  { id: 'va', nome: 'Arco-íris vivo', n: 21, forma: 'onda', pinta: 'alterna', anim: 'arco', pr: SK96_PRECO.aro },
  { id: 'vo', nome: 'Ouro líquido', n: 21, forma: 'onda', pinta: 'metal', anim: 'ouro', pr: SK96_PRECO.aro },
  { id: 'vc', nome: 'Cometa', n: 21, forma: 'onda', pinta: 'metal', anim: 'cometa', pr: SK96_PRECO.aro },
  { id: SK96_FUNDADOR.borda, nome: 'Aura dos Fundadores', n: 24, forma: 'onda', pinta: 'metal', anim: 'fundador', pr: SK96_PRECO.fundador, fundador: true },
];
for (const c of SK96_CARAS) {
  SK76_CARAS.push(c); SK76_CARA.set(c.id, c);
  const it = { id: c.id, nome: c.nome, pr: c.pr, cores: 0, cara: true }; if (c.fundador) it.fundador = true;
  TP_ICONES.push(it); TP_MAPA.i.set(it.id, it);
}
for (const a of SK96_AROS) { const it = Object.assign({ cores: 2 }, a); TP_BORDAS.push(it); TP_MAPA.b.set(it.id, it); }

// os modelos prontos da coleção (no PRÉ-PROJETADO, depois dos da v76; o dos fundadores só para quem tem)
SK76_PRE.push(
  { nome: 'Pipa no céu', d: sk76D('zk', 'va', ['#ffd23f', '#ff7a2a']) },
  { nome: 'Baile', d: sk76D('zn', 'vp', ['#2b2533', '#ff44d4']) },
  { nome: 'Maré', d: sk76D('zm', 'vb', ['#1d6fb8', '#bff0ff']) },
  { nome: 'Tempestade', d: sk76D('zt', 've', ['#3b4a6b', '#9fc3ff']) },
  { nome: 'Ipê amarelo', d: sk76D('zi', 'vo', ['#c98a16', '#ffe07a']) },
  { nome: 'Lava', d: sk76D('zv', 'vc', ['#3a0c04', '#ff7a2a']) },
);
const SK96_PRE_FUNDADOR = { nome: 'Fundador', d: sk76D(SK96_FUNDADOR.cara, SK96_FUNDADOR.borda, ['#ffd45e', '#ffe9a0']), fundador: true };
for (const x of [...SK76_PRE, SK96_PRE_FUNDADOR]) if (!x.cod) { x.cod = tpCodigo(x.d); x.anim = SK76_CARA.get(x.d.i).anim; }   // (o código e o que mexe, como os da v76)

/* ---------------------------------------------------------------- 10) a dos fundadores: só para quem tem */
const sk96EhPecaFund = (tipo, id) => { const it = tpMapaDe(tipo).get(id); return !!(it && it.fundador); };
function sk96TemFundador() {                                  // a CONTA é fundadora? (o inventário da plataforma ou o aviso dela)
  try { if (typeof V88 !== 'undefined' && V88.inv && V88.inv.has(SK96_FUNDADOR.item)) return true; } catch (_) {}
  return V96F.numero > 0;                                     // (o aparelho sozinho nunca é: só conta tem número)
}
const SK96_PECAS = ['i:' + SK96_FUNDADOR.cara, 'b:' + SK96_FUNDADOR.borda];
const sk96CodTemFund = cod => { const D = tpLe(cod); return !!D && D.k === 'T' && (sk96EhPecaFund('i', D.i) || sk96EhPecaFund('b', D.b)); };
// a tampinha dos fundadores (tp_fundador do catálogo) vem com as duas peças: ter o item é ter as peças
const tpTemAntes96 = tpTem;
tpTem = function (tipo, id) {
  if (sk96EhPecaFund(tipo, id)) return sk96TemFundador();
  return tpTemAntes96.apply(this, arguments);
};
// as peças dos fundadores não se compram: o que falta delas trava a compra (o editor diz por quê)
const tpFaltamAntes96 = tpFaltam;
tpFaltam = function (D) {
  const L = tpFaltamAntes96.apply(this, arguments);
  for (const x of L) if (x.it && x.it.fundador) { x.fundador = true; x.pr = { m: 0, g: 0, nome: 'Fundador' }; }
  return L;
};
const tpCustoAntes96 = tpCusto;
tpCusto = function (D) { const c = tpCustoAntes96.apply(this, arguments); if (tpFaltam(D).some(x => x.fundador)) c.fundador = true; return c; };
const tpCompraAntes96 = tpCompra;
tpCompra = function (D) { if (tpFaltam(D).some(x => x.fundador)) { try { som.erro(); aviso('A tampinha dos FUNDADORES não está à venda: só as 30 primeiras contas ganharam.'); } catch (_) {} return false; } return tpCompraAntes96.apply(this, arguments); };
const tpEquipaAntes96 = tpEquipa;
tpEquipa = function (cod) {                                   // (equipar por código colado ou salvo: sem ser fundador, não vale)
  if (sk96CodTemFund(cod) && !sk96TemFundador()) { try { som.erro(); aviso('Essa é a tampinha dos FUNDADORES: só as 30 primeiras contas têm.'); } catch (_) {} return false; }
  return tpEquipaAntes96.apply(this, arguments);
};
if (typeof tpeConcluir === 'function') {
  const tpeConcluirAntes96 = tpeConcluir;
  tpeConcluir = function () {
    try {
      if (ED.D && tpFaltam(ED.D).some(x => x.fundador)) {
        som.clique();
        abrePop(cx => {
          cx.classList.add('sk96-fund-pop');
          cx.append(nodo('span', 'pop-tag', 'ULTRA RARA'), nodo('h2', null, 'A TAMPINHA DOS FUNDADORES'));
          const cvs = tpMiniatura(SK96_PRE_FUNDADOR.d, 120); cvs.classList.add('sk96-fund-mini'); cx.appendChild(cvs);
          cx.appendChild(nodo('p', 'pop-txt', 'Só as ' + SK96_FUNDADOR.vagas + ' primeiras contas que entraram no RACHA ganharam esta tampinha (a cara Fundador e a borda Aura dos Fundadores). Ela não está à venda e não volta.'));
          const a = nodo('div', 'pop-acoes'); a.append(botaoPop('ENTENDI', 'verde', () => { som.clique(); fechaPop(); })); cx.appendChild(a);
        });
        return;
      }
    } catch (e) { console.error(e); }
    return tpeConcluirAntes96.apply(this, arguments);
  };
}
// no editor, as peças e o modelo dos fundadores só aparecem para quem tem
if (typeof tpeFaixa === 'function') {
  const tpeFaixaAntes96 = tpeFaixa;
  tpeFaixa = function () {
    const r = tpeFaixaAntes96.apply(this, arguments);
    try {
      const tipo = tpeTipo(ED.aba), tem = sk96TemFundador();
      for (const b of [...ED.el.faixa.children]) if (sk96EhPecaFund(tipo, b.dataset.id)) { if (!tem) b.remove(); else b.classList.add('sk96-fund'); }
    } catch (_) {}
    return r;
  };
}
if (typeof tpePreProjetados === 'function') {
  const tpePreAntes96 = tpePreProjetados;
  tpePreProjetados = function () {
    const i = SK76_PRE.indexOf(SK96_PRE_FUNDADOR), tem = sk96TemFundador();
    if (tem && i < 0) SK76_PRE.unshift(SK96_PRE_FUNDADOR); else if (!tem && i >= 0) SK76_PRE.splice(i, 1);
    return tpePreAntes96.apply(this, arguments);
  };
}
if (typeof tpeRaridade === 'function') {                     // (a raridade do desenho: com uma peça dos fundadores, FUNDADOR)
  const tpeRaridadeAntes96 = tpeRaridade;
  tpeRaridade = function (D) { try { if (D && (sk96EhPecaFund('i', D.i) || (D.k !== 'E' && sk96EhPecaFund('b', D.b)))) return 'fundador'; } catch (_) {} return tpeRaridadeAntes96.apply(this, arguments); };
}
if (typeof ecoPecas === 'function') {                        // (a loja de peças nunca lista as dos fundadores: não estão à venda)
  const ecoPecasAntes96 = ecoPecas;
  ecoPecas = function () { return ecoPecasAntes96.apply(this, arguments).filter(x => !(x.it && x.it.fundador)); };
}
if (typeof tpeAleatoria === 'function') {                     // (a sorteada nunca cai na dos fundadores)
  const tpeAleatoriaAntes96 = tpeAleatoria;
  tpeAleatoria = function () { const r = tpeAleatoriaAntes96.apply(this, arguments); try { if (ED.D && !sk96TemFundador()) { if (sk96EhPecaFund('i', ED.D.i)) ED.D.i = 'zk'; if (sk96EhPecaFund('b', ED.D.b)) ED.D.b = 'va'; tpeAtualiza(true); } } catch (_) {} return r; };
}

/* ---------------------------------------------------------------- 11) "você é um FUNDADOR" (a plataforma avisou: a primeira vez) */
const SK96_AVISO_CHAVE = 'racha96-fundador-visto';
function sk96Fundador(info) {                                 // info = {numero, vagas, novo} (do loja.estado da plataforma)
  if (!info || !(info.numero > 0)) return;
  V96F.numero = info.numero | 0; V96F.vagas = info.vagas | 0 || SK96_FUNDADOR.vagas;
  for (const k of ['i:' + SK96_FUNDADOR.cara, 'b:' + SK96_FUNDADOR.borda]) TP.itens.add(k);
  try {                                                       // (o aparelho não guarda a dos fundadores: a da conta volta aqui)
    const pl = tpePlataforma(), c = pl && typeof pl.conta === 'function' ? pl.conta() : null;
    if (c && c.tampa && !TP.equipada && sk96CodTemFund(c.tampa)) tpEquipa(c.tampa);
  } catch (_) {}
  V96F.demo = !!info.demo;
  let visto = false; try { visto = localStorage.getItem(SK96_AVISO_CHAVE) === String(V96F.numero); } catch (_) {}
  if (visto) return;
  try { localStorage.setItem(SK96_AVISO_CHAVE, String(V96F.numero)); } catch (_) {}
  V96F.pendente = true;                                       // (a janela entra na fila do lobby: não passa por cima de outra)
  setTimeout(() => { try { filaPops(); } catch (_) {} }, 900);
}
function sk96PopGanhou() {
  abrePop(cx => {
    cx.classList.add('sk96-fund-pop', 'sk96-fund-ganhou');
    cx.append(nodo('span', 'pop-tag', 'ULTRA RARA · FUNDADOR Nº ' + V96F.numero + ' DE ' + V96F.vagas + (V96F.demo ? ' · DEMONSTRAÇÃO' : '')), nodo('h2', null, 'VOCÊ É UM DOS ' + V96F.vagas + ' PRIMEIROS!'));
    const cvs = tpMiniatura(SK96_PRE_FUNDADOR.d, 168); cvs.classList.add('sk96-fund-mini'); cx.appendChild(cvs);
    cx.appendChild(nodo('p', 'pop-txt', V96F.demo
      ? 'Na demonstração, a tampinha dos FUNDADORES fica com você para conferir: a cara Fundador e a borda Aura dos Fundadores. No jogo de verdade, só as ' + V96F.vagas + ' primeiras contas ganham.'
      : 'A tampinha dos FUNDADORES é sua: a cara Fundador e a borda Aura dos Fundadores. Ela não está à venda e ninguém mais vai ganhar.'));
    const a = nodo('div', 'pop-acoes');
    a.append(botaoPop('DEPOIS', '', () => { som.clique(); fechaPop(); }), botaoPop('EQUIPAR AGORA', 'verde', () => { som.compra(); fechaPop(); try { tpEquipa(tpCodigo(SK96_PRE_FUNDADOR.d)); aviso('Tampinha dos FUNDADORES equipada!'); } catch (_) {} }));
    cx.appendChild(a);
  });
}
const sk96FilaVolta = () => filaPops();
const sk96FilaAntes = filaPops;
filaPops = function () {                                      // (no lobby, quando não há outra janela aberta: depois dela)
  const r = sk96FilaAntes.apply(this, arguments);
  try {
    if (V96F.pendente && lobby.aberto) {
      const livre = LB.pop.hidden && !(typeof ONB !== 'undefined' && (ONB.aberto || ONB.aquece)) && !(window.RachaContas82 && RachaContas82.C82 && RachaContas82.C82.popAberto);
      if (livre) { V96F.pendente = false; sk96PopGanhou(); }
      else if (filaPop.indexOf(sk96FilaVolta) < 0) filaPop.push(sk96FilaVolta);
    }
  } catch (_) {}
  return r;
};
// o artefato de teste do dono (o config.js da demonstração com demoFundador: true, que só o artefato põe): a dos fundadores
// fica com o aparelho para conferir, marcada DEMONSTRAÇÃO. No jogo de verdade (sem a chave, ou fora da demonstração), nunca.
try {
  const cfg96 = window.RACHA_CONFIG || {};
  if (cfg96.demoFundador === true && cfg96.modo === 'demo') setTimeout(() => { try { if (!(typeof v88Logado === 'function' && v88Logado())) sk96Fundador({ numero: 1, vagas: SK96_FUNDADOR.vagas, novo: true, demo: true }); } catch (_) {} }, 1500);
} catch (_) {}
// as peças dos fundadores são da CONTA: nunca ficam guardadas no aparelho (quem usar o aparelho depois, sem a conta, não
// fica com elas) e, ao sair da conta, saem da tela junto com o resto dela
const tpSalvaAntes96 = tpSalva;
tpSalva = function () {
  const tinha = SK96_PECAS.filter(k => TP.itens.has(k)), eq = TP.equipada, tiraEq = !!eq && sk96CodTemFund(eq);
  if (!tinha.length && !tiraEq) return tpSalvaAntes96.apply(this, arguments);
  for (const k of tinha) TP.itens.delete(k); if (tiraEq) TP.equipada = '';
  try { return tpSalvaAntes96.apply(this, arguments); } finally { for (const k of tinha) TP.itens.add(k); if (tiraEq) TP.equipada = eq; }
};
if (typeof v88Esquece === 'function') {
  const v88EsqueceAntes96 = v88Esquece;
  v88Esquece = function () {
    const r = v88EsqueceAntes96.apply(this, arguments);
    try {
      if (!V96F.demo) {                                       // (a da demonstração é do aparelho de teste, não de uma conta)
        V96F.numero = 0; V96F.pendente = false; for (const k of SK96_PECAS) TP.itens.delete(k);
        if (TP.equipada && sk96CodTemFund(TP.equipada)) { TP.equipada = ''; tpSalva(); }
      }
    } catch (_) {}
    return r;
  };
}
if (typeof v88PoeInventario === 'function') {                 // (o inventário da conta chegou: as peças dos fundadores valem no editor)
  const v88PoeInvAntes96 = v88PoeInventario;
  v88PoeInventario = function (lista) {
    const r = v88PoeInvAntes96.apply(this, arguments);
    try { if (V88.inv.has(SK96_FUNDADOR.item)) for (const k of ['i:' + SK96_FUNDADOR.cara, 'b:' + SK96_FUNDADOR.borda]) TP.itens.add(k); } catch (_) {}
    return r;
  };
}
if (typeof v88Estado === 'function') {
  const v88EstadoAntes96 = v88Estado;
  v88Estado = function () { return v88EstadoAntes96.apply(this, arguments).then(e => { try { if (e && e.fundador) sk96Fundador(e.fundador); } catch (_) {} return e; }); };
}
/* ---------------------------------------------------------------- 11) a tela do lobby nunca anda de lado
   (as peças novas ficam no fim da faixa do editor; escolher a última fazia a tela inteira andar para o lado — corrigido na
   faixa, tools/editor_rua.js; e aqui a garantia: o lobby não tem rolagem de lado, nada de dentro o empurra) */
try { const lb96 = document.getElementById('lb'); if (lb96) lb96.addEventListener('scroll', () => { if (lb96.scrollLeft) lb96.scrollLeft = 0; }, { passive: true }); } catch (_) {}

window.RachaSkins96 = { caras: SK96_CARAS.map(c => c.id), aros: SK96_AROS.map(a => a.id), fundador: SK96_FUNDADOR, temFundador: sk96TemFundador, codigoFundador: () => tpCodigo(SK96_PRE_FUNDADOR.d), info: () => Object.assign({}, V96F) };
