/* ======================================================================================================================
   RACHA v106 · AS MASCOTES (o desenho): seis cabeças de bichos do Brasil em medalhão, no jeito de escudo de time — o
   contorno grosso por fora, as cores fortes, a luz e a sombra chapadas e o olhar bravo. Tudo desenhado aqui, em código
   (nenhuma imagem de fora, nenhum personagem nem escudo de ninguém):
     ar · ARARA INVOCADA      a arara-azul de perfil, com o bico preto em gancho, o anel amarelo do olho e a crista
     op · ONÇA-PRETA          de frente: as rosetas escondidas no preto, os olhos verde-limão e as presas
     mi · MICO-LEÃO BOLADO    o mico-leão-dourado de frente: a juba de fogo, a cara escura e os dentes trincados
     lg · GUARÁ DA VÁRZEA     o lobo-guará de frente: as orelhas enormes, o focinho preto e a crina preta
     tu · TUCANO MARRENTO     o tucano de perfil, com o bicão laranja da ponta preta
     jc · JACARÉ PAPO-AMARELO de frente, de boca aberta: os dentes, os olhos de fenda e o papo amarelo
   Cada uma vira uma imagem pronta por tamanho (sk76Cache: o desenho é feito uma vez e só colado depois) — duas, na verdade:
   o olho aberto e o olho fechado (a piscada, de vez em quando: a única coisa que mexe).
   IMPORTANTE: estas são declarações (function e var): o tools/v105/cosmeticos.js chama o ct106Pecas (tools/v106/conteudo.js)
   antes deste arquivo rodar, e o desenho pode ser pedido logo depois — nada aqui usa const ou let fora das funções.
   ====================================================================================================================== */
var MSC106_CAM;                                              // (os caminhos prontos: um Path2D por texto, feito na primeira vez)
function msc106K(){ return '#140a12'; }                     // (a tinta do contorno: função, e não var — vale antes de este arquivo rodar)
// um caminho no quadrado -100..100 (só M L C Q Z, maiúsculos), já no -1..1 do desenho
function msc106C(d){
  const M = MSC106_CAM || (MSC106_CAM = new Map());
  let p = M.get(d); if (p) return p;
  p = new Path2D();
  const t = d.match(/[MLCQZ]|-?\d*\.?\d+/g) || [];
  let i = 0, cmd = '';
  const n = () => parseFloat(t[i++])/100;
  while (i < t.length){
    const s = t[i];
    if (s === 'M' || s === 'L' || s === 'C' || s === 'Q' || s === 'Z'){ cmd = s; i++; if (s === 'Z') p.closePath(); continue; }
    if (cmd === 'M'){ const x = n(), y = n(); p.moveTo(x, y); cmd = 'L'; }
    else if (cmd === 'L'){ const x = n(), y = n(); p.lineTo(x, y); }
    else if (cmd === 'C'){ const a = n(), b = n(), c = n(), e = n(), f = n(), h = n(); p.bezierCurveTo(a, b, c, e, f, h); }
    else if (cmd === 'Q'){ const a = n(), b = n(), c = n(), e = n(); p.quadraticCurveTo(a, b, c, e); }
    else i++;
  }
  M.set(d, p); return p;
}
// pintar: o preenchimento (cor ou degradê) e o contorno (lw no -1..1: .05 = 5% do raio)
function msc106F(g, d, cor, lw, linha){
  const p = typeof d === 'string' ? msc106C(d) : d;
  if (cor){ g.fillStyle = cor; g.fill(p); }
  if (lw){ g.lineWidth = lw; g.strokeStyle = linha || msc106K(); g.lineJoin = 'round'; g.lineCap = 'round'; g.stroke(p); }
}
// o contorno grosso por fora (o "adesivo"): primeiro todos os traços grossos, depois as tintas por cima (só sobra o de fora)
function msc106Borda(g, lista, lw, cor){
  g.lineJoin = 'round'; g.lineCap = 'round'; g.lineWidth = lw; g.strokeStyle = cor || msc106K();
  for (const d of lista) g.stroke(typeof d === 'string' ? msc106C(d) : d);
}
// a luz e a sombra chapadas (no recorte do caminho): a sombra é um círculo grande deslocado; a luz, uma mancha clara
function msc106Cel(g, d, base, sombra, luz, sx, sy, sr, lx, ly, lr){
  const p = typeof d === 'string' ? msc106C(d) : d;
  g.fillStyle = base; g.fill(p);
  g.save(); g.clip(p);
  if (sombra){ g.fillStyle = sombra; g.beginPath(); g.arc(sx/100, sy/100, sr/100, 0, Math.PI*2); g.rect(-2, -2, 4, 4); g.fill('evenodd'); }
  if (luz){ g.fillStyle = luz; g.beginPath(); g.arc(lx/100, ly/100, lr/100, 0, Math.PI*2); g.fill(); }
  g.restore();
}
function msc106Circ(g, x, y, r, cor, lw){ g.beginPath(); g.arc(x/100, y/100, r/100, 0, Math.PI*2); if (cor){ g.fillStyle = cor; g.fill(); } if (lw){ g.lineWidth = lw; g.strokeStyle = msc106K(); g.stroke(); } }
// uma pena (ou um tufo): da base (x0, y0) até a ponta (x1, y1), com a barriga w para os dois lados e a curva k (para o lado)
function msc106Pena(x0, y0, x1, y1, w, k){
  const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1, nx = -dy/L, ny = dx/L, f = n => n.toFixed(1);
  const mx = x0 + dx*.45 + nx*(k || 0), my = y0 + dy*.45 + ny*(k || 0);
  return 'M ' + f(x0 - nx*w*.6) + ' ' + f(y0 - ny*w*.6) + ' Q ' + f(mx - nx*w) + ' ' + f(my - ny*w) + ' ' + f(x1) + ' ' + f(y1)
    + ' Q ' + f(mx + nx*w) + ' ' + f(my + ny*w) + ' ' + f(x0 + nx*w*.6) + ' ' + f(y0 + ny*w*.6) + ' Z';
}
// os tufos em volta de um centro (a juba, a crina): n tufos, o comprimento de cada um por ângulo e a curva para o lado
function msc106Tufos(cx, cy, n, r0, comp, larg, curva, a0){
  let d = '';
  for (let i = 0; i < n; i++){
    const a = (a0 || 0) + i/n*Math.PI*2, L = comp(a, i), c = Math.cos(a), s = Math.sin(a);
    d += msc106Pena(cx + c*r0, cy + s*r0, cx + c*(r0 + L), cy + s*(r0 + L), larg, (i & 1 ? 1 : -1)*curva) + ' ';
  }
  return d;
}
function msc106Espelho(g, fn){ fn(); g.save(); g.scale(-1, 1); fn(); g.restore(); }
function msc106Rad(g, x, y, r0, r1, pares){ const gr = g.createRadialGradient(x/100, y/100, r0/100, x/100, y/100, r1/100); for (const [s, c] of pares) gr.addColorStop(s, c); return gr; }
function msc106Lin(g, x0, y0, x1, y1, pares){ const gr = g.createLinearGradient(x0/100, y0/100, x1/100, y1/100); for (const [s, c] of pares) gr.addColorStop(s, c); return gr; }

// o fundo do medalhão: o degradê redondo na cor do time, os raios de escudo e a luz atrás da cabeça
function msc106Fundo(g, c0, c1, c2, raio){
  g.fillStyle = msc106Rad(g, 0, -12, 4, 118, [[0, c0], [.55, c1], [1, c2]]); g.fillRect(-1.2, -1.2, 2.4, 2.4);
  g.save(); g.globalAlpha = .13; g.fillStyle = raio || '#ffffff';
  const n = 18;
  for (let i = 0; i < n; i += 2){ const a0 = i/n*Math.PI*2 - Math.PI/2, a1 = (i + 1)/n*Math.PI*2 - Math.PI/2; g.beginPath(); g.moveTo(0, -.12); g.arc(0, -.12, 1.6, a0, a1); g.closePath(); g.fill(); }
  g.restore();
  g.fillStyle = msc106Rad(g, 0, -8, 0, 92, [[0, 'rgba(255,255,255,.38)'], [.5, 'rgba(255,255,255,.1)'], [1, 'rgba(255,255,255,0)']]); g.fillRect(-1.2, -1.2, 2.4, 2.4);
}
// o olho bravo: o branco (ou a íris inteira), a pupila e o brilho; a sobrancelha corta em cima, descendo para dentro.
// olho = 1: fechado (a pálpebra no lugar)
function msc106Olho(g, o, olho){
  if (olho){
    msc106F(g, o.forma, o.palpebra || msc106K(), .045);
    g.lineWidth = .05; g.strokeStyle = msc106K(); g.lineCap = 'round'; g.beginPath(); g.moveTo(o.fecha[0]/100, o.fecha[1]/100); g.quadraticCurveTo(o.fecha[2]/100, o.fecha[3]/100, o.fecha[4]/100, o.fecha[5]/100); g.stroke();
  } else {
    msc106F(g, o.forma, o.cor, 0);
    g.save(); g.clip(msc106C(o.forma));
    if (o.fenda) msc106F(g, o.fenda, msc106K(), 0); else msc106Circ(g, o.px, o.py, o.pr, msc106K());
    msc106Circ(g, o.bx, o.by, o.br, '#ffffff');
    g.restore();
    msc106F(g, o.forma, null, .045);
  }
  if (o.sobrancelha) msc106F(g, o.sobrancelha, o.corSob || msc106K(), .045);
}

/* ---------------------------------------------------------------- 1) ARARA INVOCADA (de perfil, olhando para a direita) */
function msc106Arara(g, olho){
  msc106Fundo(g, '#ff9a5c', '#dc3a26', '#4a0c08', '#ffe2cc');
  // a crista: as penas da nuca arrepiadas para trás e para cima
  const crista = msc106Pena(-40, -44, -96, -62, 13, -8) + ' ' + msc106Pena(-34, -54, -82, -94, 13, -6) + ' ' + msc106Pena(-24, -60, -54, -110, 12, -4) + ' ' + msc106Pena(-12, -62, -18, -112, 11, 3);
  const cabeca = 'M -60 44 C -84 6 -70 -54 -18 -70 C 22 -82 54 -58 58 -22 C 62 12 46 40 22 58 C -2 76 -44 76 -60 44 Z';
  const peito = 'M -100 110 L -84 52 C -62 80 -20 88 14 70 L 30 110 Z';
  const bicoC = 'M 24 -30 C 52 -46 92 -30 96 12 C 98 40 88 58 72 66 C 78 46 74 26 60 16 C 48 6 32 4 16 8 Z';
  const bicoB = 'M 16 12 C 34 10 52 18 60 34 C 58 52 42 62 24 58 C 12 48 8 28 16 12 Z';
  msc106Borda(g, [crista, cabeca, peito, bicoC, bicoB], .15);
  msc106Cel(g, peito, '#2a55e8', '#1a36a6', null, 40, 140, 70);
  msc106F(g, peito, null, .045);
  // as penas do peito (as escamas de pena, claras em cima)
  g.save(); g.clip(msc106C(peito));
  for (const [x, y] of [[-70, 84], [-46, 90], [-22, 92], [2, 90], [-58, 104], [-34, 108], [-10, 108], [14, 104]]) msc106F(g, 'M ' + (x - 12) + ' ' + y + ' Q ' + x + ' ' + (y + 16) + ' ' + (x + 12) + ' ' + y, null, .035, '#13277a');
  g.restore();
  msc106Cel(g, crista, '#4677ff', '#2347c8', '#8eaeff', 30, 20, 90, -60, -90, 22);
  msc106F(g, crista, null, .045);
  msc106Cel(g, cabeca, '#3d70ff', '#2347c8', '#86a8ff', 40, 50, 66, -30, -46, 26);
  msc106F(g, cabeca, null, .045);
  // as penas da nuca (traços)
  for (const d of ['M -58 -6 Q -46 -14 -34 -10', 'M -62 14 Q -50 6 -38 10', 'M -54 32 Q -42 24 -30 28']) msc106F(g, d, null, .035, '#16307e');
  // a pele amarela na base do bico (o sorriso amarelo da arara-azul)
  msc106F(g, 'M 10 4 C 22 -2 34 6 36 18 C 30 30 18 36 8 34 C 12 24 12 14 10 4 Z', '#ffd23f', .04);
  // o bico: em cima o gancho, embaixo a mandíbula (o preto com o brilho)
  msc106Cel(g, bicoB, '#30303c', '#1b1b23', null, 40, 80, 40);
  msc106F(g, bicoB, null, .045);
  msc106Cel(g, bicoC, '#3a3a48', '#20202a', '#6c6c80', 70, 60, 50, 50, -30, 22);
  msc106F(g, bicoC, null, .045);
  msc106F(g, 'M 36 -26 C 58 -32 80 -20 84 2', null, .03, 'rgba(255,255,255,.38)');
  // o olho: o anel amarelo, a íris escura e a sobrancelha descendo para o bico
  msc106Circ(g, 6, -22, 17, '#ffd23f', .045);
  msc106Olho(g, {forma:'M -6 -22 C -6 -30 0 -36 8 -36 C 16 -36 20 -30 20 -22 C 20 -14 14 -10 8 -10 C 0 -10 -6 -14 -6 -22 Z', cor:'#1a1420', px:9, py:-21, pr:5, bx:12, by:-26, br:3.2,
    fecha:[-8, -20, 6, -14, 22, -22], palpebra:'#ffd23f',
    sobrancelha:'M -22 -40 C -6 -46 20 -40 34 -26 L 26 -18 C 14 -28 -4 -32 -18 -30 Z', corSob:'#1f3fb8'}, olho);
}

/* ---------------------------------------------------------------- 2) ONÇA-PRETA (de frente) */
function msc106Onca(g, olho){
  msc106Fundo(g, '#c27dff', '#5c22ad', '#170533', '#f0e2ff');
  const orelha = 'M 24 -50 C 36 -74 54 -90 72 -90 C 82 -72 80 -50 64 -30 Z';
  const cabeca = 'M 0 -62 C 36 -62 64 -46 72 -16 C 78 4 76 26 64 42 C 52 60 30 74 0 76 C -30 74 -52 60 -64 42 C -76 26 -78 4 -72 -16 C -64 -46 -36 -62 0 -62 Z';
  const tufo = 'M 60 14 L 96 22 L 72 34 L 92 48 L 66 52 L 80 66 L 52 62 Z';
  msc106Borda(g, [orelha, cabeca, tufo], .15);
  g.save(); g.scale(-1, 1); msc106Borda(g, [orelha, tufo], .15); g.restore();
  msc106Espelho(g, () => {
    msc106Cel(g, orelha, '#2a2336', '#18131f', null, 80, 0, 50);
    msc106F(g, orelha, null, .045);
    msc106F(g, 'M 36 -50 C 44 -66 56 -78 66 -78 C 72 -64 70 -52 60 -40 Z', '#5a3b5e', .035);
    msc106Cel(g, tufo, '#221c2c', '#15111b', null, 70, 80, 30);
    msc106F(g, tufo, null, .045);
  });
  msc106Cel(g, cabeca, '#30283f', '#1c1727', '#4d4268', 40, 70, 70, -20, -58, 40);
  // a luz violeta na beira de cima (o fundo refletindo no pelo)
  g.save(); g.clip(msc106C(cabeca)); g.fillStyle = msc106Rad(g, 0, -96, 30, 86, [[0, 'rgba(205,155,255,.6)'], [1, 'rgba(205,155,255,0)']]); g.fillRect(-1, -1, 2, 2);
  g.fillStyle = msc106Rad(g, -70, 10, 4, 40, [[0, 'rgba(190,140,255,.35)'], [1, 'rgba(190,140,255,0)']]); g.fillRect(-1, -1, 2, 2);
  g.fillStyle = msc106Rad(g, 70, 10, 4, 40, [[0, 'rgba(190,140,255,.35)'], [1, 'rgba(190,140,255,0)']]); g.fillRect(-1, -1, 2, 2);
  // as rosetas escondidas no preto (só de perto)
  g.globalAlpha = .7; g.lineWidth = .04; g.strokeStyle = '#100c15';
  for (const [x, y, r] of [[-22, -42, 7], [0, -50, 6], [22, -42, 7], [-46, -22, 6], [46, -22, 6], [-56, 6, 6], [56, 6, 6], [-40, 30, 5], [40, 30, 5]]){ g.beginPath(); g.arc(x/100, y/100, r/100, .4, Math.PI*2 - .3); g.stroke(); }
  // a beira acesa de lilás por dentro do contorno (o pelo preto pegando a luz: de longe, a silhueta da onça lê no escuro)
  g.globalAlpha = 1; g.lineWidth = .12; g.strokeStyle = msc106Lin(g, -60, -70, 60, 70, [[0, 'rgba(225,190,255,.85)'], [.55, 'rgba(200,150,255,.35)'], [1, 'rgba(200,150,255,.08)']]); g.stroke(msc106C(cabeca));
  g.restore();
  msc106F(g, cabeca, null, .045);
  // a ponte do focinho e o focinho (mais claro)
  msc106F(g, 'M -10 -24 C -6 -30 6 -30 10 -24 L 14 14 L -14 14 Z', '#3a3149', 0);
  msc106Cel(g, 'M 0 12 C 22 12 38 24 38 42 C 38 60 22 72 0 72 C -22 72 -38 60 -38 42 C -38 24 -22 12 0 12 Z', '#4c4160', '#30283f', '#6a5c84', 0, 110, 50, -10, 20, 14);
  // a boca aberta (rosnando) e as presas
  const boca = 'M -26 40 C -14 34 -6 38 0 36 C 6 38 14 34 26 40 C 22 58 12 66 0 66 C -12 66 -22 58 -26 40 Z';
  msc106F(g, boca, '#a8174a', .045);
  g.save(); g.clip(msc106C(boca)); msc106Circ(g, 0, 70, 16, '#e0507a'); g.restore();
  msc106Espelho(g, () => {
    msc106F(g, 'M 8 37 L 23 40 L 15 60 Z', '#fbf8ee', .03);
    msc106F(g, 'M 7 64 L 15 61 L 11 52 Z', '#fbf8ee', .025);
  });
  // o nariz
  msc106F(g, 'M -13 12 L 13 12 C 13 21 6 28 0 30 C -6 28 -13 21 -13 12 Z', '#4e3247', .04);
  msc106F(g, 'M -6 15 L 6 15', null, .03, 'rgba(255,255,255,.35)');
  // os bigodes (pontinhos)
  msc106Espelho(g, () => { for (const [x, y] of [[16, 34], [24, 30], [22, 40]]) msc106Circ(g, x, y, 1.8, '#0e0a12'); });
  // os olhos verde-limão de fenda, bravos
  msc106Espelho(g, () => { g.fillStyle = msc106Rad(g, 34, -10, 2, 30, [[0, 'rgba(214,255,58,.45)'], [1, 'rgba(214,255,58,0)']]); g.fillRect(0, -.45, .7, .5); });
  msc106Espelho(g, () => msc106Olho(g, {forma:'M 10 -6 C 20 -24 44 -30 58 -18 C 52 -2 30 6 14 2 Z', cor:'#ddff3e', fenda:'M 34 -23 C 38 -15 38 -5 34 3 C 30 -5 30 -15 34 -23 Z', bx:40, by:-14, br:3.4,
    fecha:[10, -4, 32, 2, 58, -16], palpebra:'#30283f',
    sobrancelha:'M 2 -14 C 20 -28 46 -38 66 -32 L 64 -22 C 46 -26 26 -14 10 0 Z', corSob:'#120e18'}, olho));
}

/* ---------------------------------------------------------------- 3) MICO-LEÃO BOLADO (de frente) */
function msc106Mico(g, olho){
  msc106Fundo(g, '#5fd46a', '#1f7a33', '#052412', '#d8ffd2');
  // a juba: os tufos compridos em cima e dos lados (soprados para fora), mais curtos embaixo — duas camadas
  const comp = (k, l) => (a, i) => { const s = Math.sin(a); return (s < 0 ? k - s*12 : k - s*l) + ((i*37) % 7) - 3; };
  const juba = msc106Tufos(0, -6, 19, 50, comp(40, 24), 21, 14, -Math.PI/2 + .2) + 'M 0 -70 C 46 -70 70 -36 70 0 C 70 38 40 62 0 62 C -40 62 -70 38 -70 0 C -70 -36 -46 -70 0 -70 Z';
  const juba2 = msc106Tufos(0, -4, 16, 40, comp(28, 18), 16, 10, -Math.PI/2 - .05) + 'M 0 -54 C 36 -54 54 -28 54 0 C 54 30 32 50 0 50 C -32 50 -54 30 -54 0 C -54 -28 -36 -54 0 -54 Z';
  const cara = 'M 0 -38 C 24 -38 40 -24 42 -4 C 44 18 32 40 16 50 C 8 56 -8 56 -16 50 C -32 40 -44 18 -42 -4 C -40 -24 -24 -38 0 -38 Z';
  msc106Borda(g, [juba], .15);
  msc106Cel(g, juba, '#f08a10', '#c2560a', '#ffb02e', 30, 76, 74, -30, -70, 40);
  msc106Borda(g, [juba2], .04);                               // (só o contorno de fora da camada de cima: sem os riscos de dentro)
  msc106Cel(g, juba2, '#ffb428', '#ec8a14', '#ffd866', 24, 64, 56, -26, -46, 30);
  for (const d of ['M -26 -52 Q -16 -44 -18 -34', 'M 26 -52 Q 16 -44 18 -34', 'M -46 -30 Q -36 -26 -36 -16', 'M 46 -30 Q 36 -26 36 -16', 'M -50 14 Q -42 14 -38 22', 'M 50 14 Q 42 14 38 22']) msc106F(g, d, null, .03, '#c4600c');
  msc106F(g, cara, null, .13);
  msc106Cel(g, cara, '#5a3324', '#3c2018', '#7a4a36', 30, 60, 50, -12, -30, 22);
  msc106F(g, cara, null, .045);
  // o focinho e o nariz
  msc106Cel(g, 'M 0 4 C 14 4 24 14 24 28 C 24 42 14 50 0 50 C -14 50 -24 42 -24 28 C -24 14 -14 4 0 4 Z', '#6e4230', '#4c2a1e', null, 0, 70, 30);
  msc106Espelho(g, () => msc106F(g, 'M 3 14 C 6 10 11 11 11 15 C 11 18 7 20 4 18 Z', '#24120c', 0));
  // os dentes trincados (bolado: a boca de lado a lado, os cantos para baixo)
  const boca = 'M -18 30 C -8 26 8 26 18 30 C 18 38 10 44 0 44 C -10 44 -18 38 -18 30 Z';
  msc106F(g, boca, '#fdf7ea', .04);
  g.save(); g.clip(msc106C(boca)); g.lineWidth = .025; g.strokeStyle = '#3a2016'; g.beginPath(); g.moveTo(-.18, .355); g.lineTo(.18, .355);
  for (const x of [-10, -3.5, 3.5, 10]){ g.moveTo(x/100, .26); g.lineTo(x/100, .46); } g.stroke(); g.restore();
  msc106F(g, 'M -22 26 Q -20 32 -16 34', null, .03); msc106F(g, 'M 22 26 Q 20 32 16 34', null, .03);
  // os olhos: pequenos, cor de mel, com o topete da juba fazendo a sobrancelha brava
  msc106Espelho(g, () => msc106Olho(g, {forma:'M 8 -10 C 14 -18 28 -20 34 -12 C 30 -4 20 -2 10 -4 Z', cor:'#ffb000', px:22, py:-10, pr:4.2, bx:25, by:-13, br:2.2,
    fecha:[8, -8, 22, -4, 34, -11], palpebra:'#5a3324',
    sobrancelha:'M 0 -20 C 14 -34 34 -40 50 -34 L 46 -24 C 32 -26 18 -18 8 -6 Z', corSob:'#ffb428'}, olho));
}

/* ---------------------------------------------------------------- 4) GUARÁ DA VÁRZEA (o lobo-guará, de frente) */
function msc106Guara(g, olho){
  msc106Fundo(g, '#47a8f0', '#1b4f9a', '#06142e', '#d4ecff');
  // a crina preta arrepiada atrás da cabeça (do pescoço para os ombros) e o peito laranja com o babador branco
  const crina = msc106Tufos(0, 58, 13, 26, (a, i) => 34 + ((i*29) % 9), 11, 6, -Math.PI) + 'M -64 58 C -64 30 64 30 64 58 L 64 110 L -64 110 Z';
  const peito = 'M -52 110 C -52 74 -36 56 0 56 C 36 56 52 74 52 110 Z';
  const orelha = 'M 4 -36 C 12 -68 40 -102 70 -104 C 82 -76 74 -40 52 -14 Z';
  const cabeca = 'M 0 -46 C 28 -46 50 -34 56 -10 C 60 8 52 26 38 36 L 24 70 C 18 84 -18 84 -24 70 L -38 36 C -52 26 -60 8 -56 -10 C -50 -34 -28 -46 0 -46 Z';
  msc106Borda(g, [crina, orelha, cabeca], .15);
  g.save(); g.scale(-1, 1); msc106Borda(g, [orelha], .15); g.restore();
  msc106Cel(g, crina, '#2a1a14', '#160d0a', '#4a3226', 0, 150, 70, -30, 40, 20);
  msc106F(g, crina, null, .045);
  msc106Cel(g, peito, '#d95418', '#a8400e', null, 30, 140, 50);
  msc106F(g, peito, null, .045);
  msc106F(g, 'M -26 110 C -24 86 -14 70 0 66 C 14 70 24 86 26 110 Z', '#fff2e0', .035);
  msc106Espelho(g, () => {
    msc106Cel(g, orelha, '#e8601c', '#b63f0e', '#ff8a45', 96, -30, 46, 30, -90, 18);
    g.save(); g.clip(msc106C(orelha)); msc106Circ(g, 70, -104, 13, '#1e120e'); g.restore();
    msc106F(g, orelha, null, .045);
    msc106F(g, 'M 18 -38 C 26 -64 44 -88 64 -92 C 70 -70 64 -46 48 -26 Z', '#fff1de', .035);
    msc106F(g, 'M 28 -42 Q 40 -60 56 -80', null, .03, '#e0b896');
    msc106F(g, 'M 38 -36 Q 48 -52 60 -64', null, .03, '#e0b896');
  });
  msc106Cel(g, cabeca, '#e65d1c', '#b8420e', '#ff8f45', 40, 60, 60, -16, -40, 30);
  msc106F(g, cabeca, null, .045);
  // o branco da garganta e das bochechas
  msc106Espelho(g, () => msc106F(g, 'M 38 34 C 46 44 44 58 32 64 L 26 50 Z', '#fff2e0', .035));
  // o focinho preto, o nariz e a boca rosnando (os dentes dos lados)
  const focinho = 'M -18 34 C -10 28 10 28 18 34 L 24 70 C 18 84 -18 84 -24 70 Z';
  msc106Cel(g, focinho, '#24160f', '#140c08', '#3c2a20', 30, 90, 30, -6, 30, 12);
  msc106F(g, focinho, null, .045);
  msc106Espelho(g, () => { msc106F(g, 'M 14 54 L 25 58 L 23 64 L 26 68 L 16 70 Z', '#fbf6ea', .03); });
  msc106F(g, 'M -11 68 C -11 60 11 60 11 68 C 11 75 6 80 0 80 C -6 80 -11 75 -11 68 Z', '#0d0806', .035);
  msc106F(g, 'M -5 64 L 4 64', null, .03, 'rgba(255,255,255,.4)');
  // as marcas pretas da sobrancelha e os olhos cor de âmbar
  msc106Espelho(g, () => msc106Olho(g, {forma:'M 9 -12 C 17 -22 33 -24 42 -16 C 38 -6 26 -2 13 -4 Z', cor:'#ffcc33', px:27, py:-13, pr:5, bx:31, by:-16, br:2.4,
    fecha:[9, -10, 26, -4, 42, -15], palpebra:'#e65d1c',
    sobrancelha:'M 2 -16 C 16 -30 38 -36 52 -30 L 50 -20 C 36 -22 22 -14 12 -2 Z', corSob:'#20130e'}, olho));
}

/* ---------------------------------------------------------------- 5) TUCANO MARRENTO (de perfil, olhando para a esquerda) */
function msc106Tucano(g, olho){
  msc106Fundo(g, '#33e0c2', '#0e7f78', '#03282a', '#d6fff6');
  // a cabeça à direita, o bicão atravessando o medalhão para a esquerda (a ponta para baixo) e o babador branco embaixo
  const corpo = 'M 18 26 C 52 34 80 60 88 110 L -16 110 C -12 72 -4 42 18 26 Z';
  const cabeca = 'M 2 -46 C 26 -70 72 -64 82 -30 C 90 0 74 28 46 36 C 28 40 10 34 0 20 Z';
  const bicoC = 'M 4 -50 C -40 -68 -86 -48 -100 -6 C -104 10 -102 26 -96 36 C -84 10 -48 -6 6 -6 Z';
  const bicoB = 'M 6 -4 C -48 -4 -84 12 -96 36 C -76 40 -38 30 6 14 Z';
  const papo = 'M 2 12 C 14 30 30 38 46 36 C 42 62 26 86 -4 110 L -42 110 C -20 82 -8 50 2 12 Z';
  msc106Borda(g, [corpo, cabeca, bicoC, bicoB, papo], .15);
  msc106Cel(g, corpo, '#1d1d26', '#101016', '#34344a', 80, 80, 50, 20, 40, 18);
  msc106F(g, corpo, null, .045);
  msc106Cel(g, papo, '#fff6de', '#e6d6b0', '#ffffff', 40, 100, 50, -6, 40, 14);
  g.save(); g.clip(msc106C(papo)); g.fillStyle = msc106Lin(g, 0, 10, 0, 50, [[0, 'rgba(255,200,50,.9)'], [1, 'rgba(255,210,63,0)']]); g.fillRect(-1, -1, 2, 2); g.restore();
  msc106F(g, papo, null, .045);
  msc106Cel(g, cabeca, '#1f1f29', '#111117', '#3a3a52', 70, 40, 50, 30, -56, 22);
  msc106F(g, cabeca, null, .045);
  // o bicão: laranja com a luz em cima, a ponta preta e a faixa escura na base
  msc106Cel(g, bicoB, '#ff7412', '#d24c08', null, -40, 60, 40);
  msc106F(g, bicoB, null, .045);
  msc106Cel(g, bicoC, '#ff9420', '#e3620c', '#ffc95e', -30, 40, 52, -40, -52, 30);
  g.save(); g.clip(msc106C(bicoC)); g.fillStyle = '#17121c'; g.beginPath(); g.ellipse(-.9, .12, .17, .3, -.35, 0, Math.PI*2); g.fill(); g.restore();
  msc106F(g, bicoC, null, .045);
  msc106F(g, 'M -16 -54 C -46 -58 -76 -42 -88 -18', null, .035, 'rgba(255,255,255,.5)');
  msc106F(g, 'M 4 -50 C 0 -32 0 -18 6 -6', null, .05, '#17121c');
  // a pele laranja em volta do olho, o anel azul e o olho marrento (a sobrancelha descendo para o bico)
  msc106F(g, 'M 14 -30 C 12 -46 26 -54 40 -50 C 52 -46 56 -30 48 -20 C 38 -10 16 -14 14 -30 Z', '#ffb02e', .04);
  msc106Circ(g, 33, -32, 12, '#3b8bff', .04);
  msc106Olho(g, {forma:'M 24 -32 C 24 -38 28 -42 33 -42 C 38 -42 42 -38 42 -32 C 42 -27 38 -23 33 -23 C 28 -23 24 -27 24 -32 Z', cor:'#15101a', px:31, py:-32, pr:4, bx:36, by:-36, br:2.6,
    fecha:[22, -30, 33, -25, 44, -31], palpebra:'#3b8bff',
    sobrancelha:'M 10 -40 C 22 -56 48 -60 62 -50 L 58 -40 C 46 -46 30 -44 18 -32 Z', corSob:'#101016'}, olho);
}

/* ---------------------------------------------------------------- 6) JACARÉ PAPO-AMARELO (de frente, de boca aberta) */
function msc106Jacare(g, olho){
  msc106Fundo(g, '#ffd84a', '#e07a14', '#3a1405', '#fff4c8');
  // de três quartos, olhando para a direita: o focinho comprido aberto, os dentes, a bossa do olho e o papo amarelo
  const papo = 'M -100 110 L -84 34 C -60 60 -10 70 40 58 L 60 110 Z';
  const crista = msc106Tufos(-60, -10, 9, 34, (a, i) => (Math.sin(a) < -.2 ? 20 : 4) + (i % 2)*6, 9, 0, -Math.PI*.95);
  const queixo = 'M -66 18 C -46 40 -6 48 34 40 L 88 24 C 98 22 100 36 90 40 L 34 60 C -6 72 -50 62 -72 40 Z';
  const cabeca = 'M -78 -10 C -72 -48 -34 -64 2 -56 L 86 -32 C 100 -28 102 -10 92 -4 L 30 4 C -8 10 -52 16 -78 -10 Z';
  const bossa = 'M -46 -50 C -46 -82 -6 -90 4 -60 Z';
  msc106Borda(g, [papo, crista, queixo, cabeca, bossa], .15);
  msc106Cel(g, papo, '#f4d63e', '#d6a91a', '#fff08a', 30, 150, 80, -40, 60, 20);
  msc106F(g, papo, null, .045);
  for (const y of [70, 86, 102]) msc106F(g, 'M -80 ' + y + ' Q -20 ' + (y + 12) + ' 44 ' + (y - 4), null, .03, '#b8870e');
  msc106Cel(g, crista, '#2f7a22', '#1f5a16', null, 0, 60, 60);
  msc106F(g, crista, null, .04);
  // a boca aberta: o vermelho de dentro, os dentes de baixo e o queixo
  const boca = 'M -60 0 C -30 10 10 6 40 0 L 92 -6 L 90 32 L 36 46 C 0 54 -40 46 -62 26 Z';
  msc106F(g, boca, '#8a1530', 0);
  g.save(); g.clip(msc106C(boca)); g.fillStyle = msc106Rad(g, 20, 30, 4, 50, [[0, '#d23a58'], [1, 'rgba(210,58,88,0)']]); g.fillRect(-1, -1, 2, 2); g.restore();
  for (let i = 0; i < 8; i++){ const x = -34 + i*15, y = 46 - i*2.4; msc106F(g, 'M ' + (x - 5) + ' ' + y + ' L ' + (x + 1) + ' ' + (y - 14) + ' L ' + (x + 6) + ' ' + y + ' Z', '#fffbea', .025); }
  msc106Cel(g, queixo, '#44982d', '#2a661c', '#6cbc40', 20, 110, 66, 60, 26, 14);
  msc106F(g, queixo, null, .045);
  // a cabeça com as escamas, os dentes de cima, a bossa do olho e a narina na ponta
  msc106Cel(g, cabeca, '#48a02f', '#2c6a1d', '#7ccc4a', 20, 50, 60, 0, -52, 30);
  g.save(); g.clip(msc106C(cabeca));
  for (const [x, y, r] of [[-58, -30, 7], [-40, -40, 7], [-22, -44, 6], [-58, -10, 6], [-38, -22, 6], [10, -40, 5], [26, -36, 5], [42, -32, 5], [58, -28, 4.5], [72, -24, 4]]) msc106Circ(g, x, y, r, '#37862a');
  g.restore();
  msc106F(g, cabeca, null, .045);
  for (let i = 0; i < 8; i++){ const x = -30 + i*15, y = 8 - i*1.6; msc106F(g, 'M ' + (x - 5) + ' ' + y + ' L ' + (x + 1) + ' ' + (y + 14) + ' L ' + (x + 6) + ' ' + y + ' Z', '#fffbea', .025); }
  msc106F(g, 'M 76 -38 C 80 -48 94 -46 94 -36 Z', '#48a02f', .04);
  msc106F(g, 'M 83 -38 C 85 -42 89 -42 90 -38 Z', '#173d10', 0);
  msc106Cel(g, bossa, '#4ea834', '#2f6e1e', '#86d652', 30, -30, 30, -26, -82, 12);
  msc106F(g, bossa, null, .045);
  // o olho de fenda com a crista brava (descendo para o focinho)
  msc106Olho(g, {forma:'M -32 -62 C -28 -74 -6 -74 -2 -62 C -6 -52 -26 -50 -32 -62 Z', cor:'#ffe14a', fenda:'M -17 -74 C -14 -68 -14 -56 -17 -50 C -20 -56 -20 -68 -17 -74 Z', bx:-12, by:-66, br:2.6,
    fecha:[-33, -61, -17, -55, -1, -61], palpebra:'#4ea834',
    sobrancelha:'M -44 -70 C -32 -86 -10 -86 6 -70 L 0 -62 C -12 -70 -26 -70 -36 -60 Z', corSob:'#2c6a1d'}, olho);
}

/* ---------------------------------------------------------------- a mascote inteira (o quadrado W × W da imagem pronta) */
function msc106DesenhoDe(id){
  switch (id){
    case 'ar': return msc106Arara; case 'op': return msc106Onca; case 'mi': return msc106Mico;
    case 'lg': return msc106Guara; case 'tu': return msc106Tucano; case 'jc': return msc106Jacare;
  }
  return null;
}
function msc106Mascote(g, id, W, olho){
  const fn = msc106DesenhoDe(id); if (!fn) return false;
  g.save(); g.translate(W/2, W/2); g.scale(W/2, W/2);
  try { fn(g, olho ? 1 : 0); } finally { g.restore(); }
  return true;
}
// a piscada: de vez em quando (cada mascote no seu tempo), um instante com o olho fechado
function msc106Pisca(id, t){
  if (!(t >= 2.5)) return 0;                              // (os quadros parados das miniaturas e do editor: sempre de olho aberto)
  const k = (id.charCodeAt(0)*7 + id.charCodeAt(1)*3) % 11, per = 3.4 + k*.23, f = (t + k*.61) % per;
  return f < .13 ? 1 : 0;
}
