/* ======================================================================================================================
   RACHA rua v77 · O MAPA PRINCIPAL (a ARENA) virou a quadra da imagem enviada (tools/v77/quadra_original.png): a quadra da
   favela vista de cima, de dia — o verde com as áreas amarelas e o círculo azul no meio, o piso de placas em volta, o muro de
   cima grafitado (o RACHA com a coroa, os bancos cobertos, os jogadores pintados com a bandeira do Brasil e o BRASIL), os muros
   pintados e as escadas dos lados, o alambrado embaixo com as lixeiras e, em volta, as casas e as árvores.
   O TAMANHO E OS GOLS SÃO OS DO JOGO (de 1v1 a 4v4): as linhas, as traves, as redes e a área do jogador continuam as da Arena,
   sem mudar nada (a física é a mesma). É o desenho que se ajusta a cada tamanho: o verde pinta de uma linha à outra, as áreas
   amarelas e o círculo azul seguem as marcas de cada tamanho, o piso vai até onde o jogador para, o muro de cima e o alambrado
   ficam na margem de cima e de baixo do mapa e as escadas atrás dos gols.
   Qual implementação valia: o desenhaEstadio (jogo-base) chama o window.RUA_ARENA do arena.js (a quadra da comunidade da v61)
   pelo gancho que o build põe, e o campoPlano (Ultra leve) chama o RUA_ARENA_PLANO; a v74 desvia os dois só para o Estádio.
   A v77 embrulha o RUA_ARENA e o RUA_ARENA_PLANO: na Arena, desenha a quadra nova; se der erro, o desenho da v61 continua.
   Da imagem vêm só as peças (o kit tools/v77/quadra_kit.webp, feito por tools/v77/quadra_kit.py e embutido pelo build): os
   pedaços do muro, as escadas, as casas, as lixeiras, o grão da tinta e os pedaços gastos. O resto é desenhado aqui.
   Nada aqui mexe na física, nas medidas, nos gols, na câmera nem na rede.
   ====================================================================================================================== */
const QD_KIT = /*KIT77*/null;                               // {src:'data:image/webp;base64,…', p:{peça:[x, y, w, h], _esc:{peça:px do kit por px da imagem}}}
const QD = {
  verde:'#356c3c', verde2:'#3d7643', amarelo:'#d3962a', azul:'#2a5375', cal:'#eceadb',          // as cores medidas na imagem
  piso:'#9d846d', piso2:'#8a7360', junta:'rgba(58,44,34,.24)', muro:'#6f6457', coroa:'#25221c',
  rua:'#6c5e52', fora:'#4b3d35', telha:'#8a4a33',
  E:1.0, EC:1.35,                                            // px do mundo por px da imagem: as escadas dos lados · as casas
  img:null, ok:false
};
if (QD_KIT && QD_KIT.src){
  const im = new Image();
  im.onload = () => { QD.ok = true; qdRefaz(); };
  im.onerror = () => { QD.ok = false; window.RUA_QUADRA77_KIT = 'a imagem do kit não abriu'; };
  im.src = QD_KIT.src; QD.img = im;
  if (im.complete && im.naturalWidth) QD.ok = true;
}
function qdRefaz(){                                          // o kit chegou: refaz o mapa (se é a Arena) e as prévias da Arena no JOGAR
  try {
    for (const k of [...PREV_MORRO.keys()]) if (k.startsWith('0-')) PREV_MORRO.delete(k);
    if (CAMPO.id === 'estadio' && stat) buildStatic();
    if (RQP.raiz && !RQP.raiz.hidden) pintaMapas();
  } catch (_) {}
}
const qdP = nome => QD.ok && QD_KIT && QD_KIT.p[nome] || null;
const qdEsc = nome => (QD_KIT && QD_KIT.p._esc && QD_KIT.p._esc[nome]) || 1;   // (px do kit por px da imagem)
function qdPeca(g, nome, x, y, w, h, viraX, viraY){          // uma peça do kit no retângulo (x, y, w, h), virada se pedir
  const p = qdP(nome); if (!p) return false;
  g.save(); g.translate(x + (viraX ? w : 0), y + (viraY ? h : 0)); if (viraX || viraY) g.scale(viraX ? -1 : 1, viraY ? -1 : 1);
  g.drawImage(QD.img, p[0], p[1], p[2], p[3], 0, 0, w, h);
  g.restore(); return true;
}
const QD_TILE = new Map();
function qdPadrao(g, nome, L){                               // a peça vira um ladrilho de L px do mundo, repetido (o grão da tinta)
  const p = qdP(nome); if (!p) return null;
  let c = QD_TILE.get(nome);
  if (!c){ c = document.createElement('canvas'); c.width = p[2]; c.height = p[3]; c.getContext('2d').drawImage(QD.img, p[0], p[1], p[2], p[3], 0, 0, p[2], p[3]); QD_TILE.set(nome, c); }
  let pt = null;
  try { pt = g.createPattern(c, 'repeat'); if (pt && pt.setTransform && typeof DOMMatrix !== 'undefined') pt.setTransform(new DOMMatrix([L/p[2], 0, 0, L/p[3], 0, 0])); } catch (_) {}
  return pt;
}

/* ---- o piso de placas em volta da quadra (até onde o jogador para) ---- */
function qdPiso(g, r, leve){
  const w = GR - GL, h = GB - GT;
  g.save(); g.beginPath(); g.rect(GL, GT, w, h); g.clip();
  g.fillStyle = QD.piso; g.fillRect(GL, GT, w, h);
  if (!leve){
    const L = U(2.75), ox = GL + ((CX - GL) % L) - L, oy = GT + ((CY - GT) % L) - L;   // as placas (a junta passa pelo meio do campo)
    for (let y = oy; y < GB; y += L) for (let x = ox; x < GR; x += L){
      const v = r();
      g.fillStyle = v < .33 ? 'rgba(255,240,215,.07)' : v < .66 ? 'rgba(40,28,18,.07)' : 'rgba(120,112,104,.08)';
      g.fillRect(x, y, L, L);
    }
    g.strokeStyle = QD.junta; g.lineWidth = U(.08);
    g.beginPath();
    for (let x = ox; x <= GR; x += L){ g.moveTo(x, GT); g.lineTo(x, GB); }
    for (let y = oy; y <= GB; y += L){ g.moveTo(GL, y); g.lineTo(GR, y); }
    g.stroke();
    for (let i = 0; i < 14; i++){                             // as manchas grandes (o sol e a sombra do dia, a terra)
      const x = GL + r()*w, y = GT + r()*h, rx = U(4 + r()*8), ry = rx*(.4 + r()*.4);
      g.fillStyle = r() < .5 ? 'rgba(255,236,200,.06)' : 'rgba(70,58,50,.08)';
      g.beginPath(); g.ellipse(x, y, rx, ry, r()*Math.PI, 0, TAU); g.fill();
    }
    for (let i = 0; i < 40; i++){                             // as manchas (a chuva, a poeira, o óleo)
      const x = GL + r()*w, y = GT + r()*h, rx = U(.8 + r()*3), ry = rx*(.4 + r()*.5);
      g.fillStyle = r() < .6 ? 'rgba(52,38,28,.07)' : 'rgba(255,245,225,.06)';
      g.beginPath(); g.ellipse(x, y, rx, ry, r()*Math.PI, 0, TAU); g.fill();
    }
    pontos(g, r, Math.min(9000, Math.round(w*h/700)), GL, GT, w, h, ['rgba(40,28,20,.22)', 'rgba(255,240,220,.16)'], .7, 1.8);   // o grão do cimento
  }
  g.restore();
}

/* ---- a quadra: o verde, as áreas amarelas, o círculo azul, o grão da tinta, os pedaços gastos e as linhas ---- */
function qdAreas(g){                                         // o amarelo das duas áreas (a grande e a meia-lua por fora dela) e o círculo do meio
  const {x0, x1} = LINHAS, M = MARCAS;
  g.fillStyle = QD.amarelo;
  for (const s of [-1, 1]){
    const xg = s < 0 ? x0 : x1, xa = s < 0 ? xg : xg - M.areaW;
    g.fillRect(xa, CY - M.areaH/2, M.areaW, M.areaH);
    const xc = xg - s*M.luaC, xf = xg - s*M.areaW;
    g.save(); g.beginPath(); if (s < 0) g.rect(xf, CY - M.luaR, M.luaR*2, M.luaR*2); else g.rect(xf - M.luaR*2, CY - M.luaR, M.luaR*2, M.luaR*2); g.clip();
    g.beginPath(); g.arc(xc, CY, M.luaR, 0, TAU); g.fill(); g.restore();
  }
  const c = M.circulo;
  g.beginPath(); g.arc(CX, CY, c, 0, TAU); g.fill();
  g.fillStyle = QD.azul; g.beginPath(); g.arc(CX, CY, c*.8, 0, TAU); g.fill();
}
function qdQuadra(g, r, leve){
  const {x0, y0, x1, y1} = LINHAS, w = x1 - x0, h = y1 - y0;
  g.save(); g.beginPath(); g.rect(x0, y0, w, h); g.clip();
  g.fillStyle = QD.verde; g.fillRect(x0, y0, w, h);
  qdAreas(g);
  if (!leve){
    const pt = qdPadrao(g, 'tx_det', U(13.5));                // o grão da tinta (a imagem: 128 = sem mudança)
    if (pt){ g.save(); g.globalCompositeOperation = 'overlay'; g.globalAlpha = .7; g.fillStyle = pt; g.fillRect(x0, y0, w, h); g.restore(); }
    for (let i = 0; i < 22; i++){                             // a tinta não é igual: manchas mais claras e mais escuras
      const x = x0 + r()*w, y = y0 + r()*h, rx = U(2 + r()*6), ry = rx*(.4 + r()*.4);
      g.fillStyle = r() < .5 ? 'rgba(220,240,200,.04)' : 'rgba(0,20,6,.06)';
      g.beginPath(); g.ellipse(x, y, rx, ry, r()*Math.PI, 0, TAU); g.fill();
    }
    const nomes = ['gasto0', 'gasto1', 'gasto2', 'gasto3', 'gasto4', 'gasto5', 'gasto6'].filter(qdP);   // os pedaços gastos, espalhados e girados
    const n = Math.round(w*h/95000) + 3;
    for (let i = 0; i < n && nomes.length; i++){
      const nome = nomes[i % nomes.length], p = QD_KIT.p[nome], k = 1.15 + r()*.45, pw = p[2]*k, ph = p[3]*k;
      const x = x0 + U(1) + r()*(w - U(2)), y = y0 + U(1) + r()*(h - U(2)), a = Math.floor(r()*4)*Math.PI/2 + (r() - .5)*.4;
      g.save(); g.translate(x, y); g.rotate(a); if (r() < .5) g.scale(-1, 1);
      g.globalAlpha = .85; g.drawImage(QD.img, p[0], p[1], p[2], p[3], -pw/2, -ph/2, pw, ph); g.restore();
    }
  }
  g.restore();
  const cal = GRAMA.cal; GRAMA.cal = QD.cal;                  // as linhas de cal: as do jogo (as marcas de cada tamanho), no branco da imagem
  try { grLinhas(g, leve); } finally { GRAMA.cal = cal; }
}

/* ---- a luz do dia: a sombra do muro e das árvores em cima, e o lado direito na sombra ---- */
function qdSombras(g, r){
  const w = GR - GL;
  g.save(); g.beginPath(); g.rect(GL, GT, w, GB - GT); g.clip();
  let gr = g.createLinearGradient(0, GT, 0, GT + U(2.2)); gr.addColorStop(0, 'rgba(18,22,16,.42)'); gr.addColorStop(1, 'rgba(18,22,16,0)');
  g.fillStyle = gr; g.fillRect(GL, GT, w, U(2.2));                                  // o pé do muro de cima
  gr = g.createLinearGradient(GR, 0, GR - U(4), 0); gr.addColorStop(0, 'rgba(24,26,30,.3)'); gr.addColorStop(1, 'rgba(24,26,30,0)');
  g.fillStyle = gr; g.fillRect(GR - U(4), GT, U(4), GB - GT);                       // o lado direito, na sombra das casas
  gr = g.createLinearGradient(GL, 0, GL + U(1.4), 0); gr.addColorStop(0, 'rgba(24,26,30,.22)'); gr.addColorStop(1, 'rgba(24,26,30,0)');
  g.fillStyle = gr; g.fillRect(GL, GT, U(1.4), GB - GT);
  const fundo = LINHAS.y0 + (LINHAS.y1 - LINHAS.y0)*.22, hb = fundo - GT, q = .14;   // a sombra das árvores de cima, salpicada (como na imagem)
  const c = document.createElement('canvas'); c.width = Math.max(2, Math.round((w + U(4))*q)); c.height = Math.max(2, Math.round(hb*q));
  const o = c.getContext('2d'); o.scale(q, q); o.translate(-(GL - U(2)), -GT);
  for (let x = GL - U(2); x < GR + U(2); x += U(2.5 + r()*4.5)){
    if (r() < .28) continue;
    const n = 10 + Math.floor(r()*16), cy = GT + r()*hb*.5, rx0 = U(2.2 + r()*4.5);
    for (let i = 0; i < n; i++){
      const a = r()*TAU, d = Math.sqrt(r())*rx0, ex = U(.5 + r()*1.5);
      o.fillStyle = 'rgba(10,18,8,' + (.18 + r()*.2).toFixed(3) + ')';
      o.beginPath(); o.ellipse(x + Math.cos(a)*d*1.6, cy + Math.sin(a)*d*.7, ex, ex*(.5 + r()*.45), r()*Math.PI, 0, TAU); o.fill();
    }
  }
  const sombra = o.createLinearGradient(0, GT, 0, fundo); sombra.addColorStop(0, 'rgba(0,0,0,1)'); sombra.addColorStop(.6, 'rgba(0,0,0,.7)'); sombra.addColorStop(1, 'rgba(0,0,0,0)');
  o.globalCompositeOperation = 'destination-in'; o.fillStyle = sombra; o.fillRect(GL - U(2), GT, w + U(4), hb);   // (vai sumindo para baixo)
  try { g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; } catch (_) {}
  g.globalAlpha = .8; g.drawImage(c, GL - U(2), GT, w + U(4), hb); g.globalAlpha = 1;
  g.restore();
}

/* ---- o muro de cima (na margem de cima do mapa): os pedaços grafitados da imagem e o muro liso entre eles ---- */
const QD_MURO = ['mr_racha', 'mr_banco', 'mr_meio', 'mr_banco2', 'mr_brasil'];
function qdMuroCima(g, r, leve){
  const x0 = GL - U(.6), x1 = GR + U(.6), h = GT, k = h/95;  // (os pedaços da imagem têm 95 px: da coroa do muro ao chão)
  g.save(); g.beginPath(); g.rect(x0, 0, x1 - x0, h); g.clip();
  let gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#5f574d'); gr.addColorStop(.12, '#7a6e60'); gr.addColorStop(.85, '#6c6154'); gr.addColorStop(1, '#4d463d');
  g.fillStyle = gr; g.fillRect(x0, 0, x1 - x0, h);
  if (!leve){
    for (let i = 0, n = Math.round((x1 - x0)/U(1.6)); i < n; i++){                // a tinta descascada, a sujeira e as manchas de umidade
      const x = x0 + r()*(x1 - x0), y = h*(.15 + r()*.7), rx = U(.4 + r()*1.4), ry = rx*(.5 + r()*.6);
      g.fillStyle = pick(r, ['rgba(150,138,120,.38)', 'rgba(52,46,38,.32)', 'rgba(180,170,150,.26)', 'rgba(60,92,140,.22)', 'rgba(200,160,60,.18)']);
      g.beginPath(); g.ellipse(x, y, rx, ry, r()*Math.PI, 0, TAU); g.fill();
    }
    g.fillStyle = 'rgba(60,80,30,.32)';                                               // o limo no pé do muro
    for (let x = x0; x < x1; x += U(.5 + r()*1.4)){ g.beginPath(); g.ellipse(x, h - k*10, U(.3 + r()*.6), k*(4 + r()*5), 0, 0, TAU); g.fill(); }
  }
  g.fillStyle = QD.coroa; g.fillRect(x0, 0, x1 - x0, k*5);                           // a coroa do muro
  g.fillStyle = 'rgba(255,255,255,.16)'; g.fillRect(x0, k*5, x1 - x0, k*1.4);
  g.fillStyle = 'rgba(30,26,20,.55)'; g.fillRect(x0, h - k*9, x1 - x0, k*9);         // o chão em frente ao muro (a sombra)
  // os pedaços da imagem: o meio (os jogadores e a bandeira) no meio do campo; os bancos dos lados; o RACHA e o BRASIL nas pontas
  const P = QD_MURO.map(n => qdP(n));
  if (P.every(Boolean)){
    const W2 = (x1 - x0)/2, larg = P.map(p => p[2]*k), [wr, wb, wm, wb2, wbr] = larg;
    const folga = Math.max(U(.4), (W2 - wm/2 - Math.max(wb, wb2) - Math.max(wr, wbr) - U(2.5))/2);
    const xm = CX - wm/2, xb = xm - folga - wb, xr = xb - folga - wr, xb2 = CX + wm/2 + folga, xbr = xb2 + wb2 + folga;
    for (const [nome, x, wd] of [['mr_racha', xr, wr], ['mr_banco', xb, wb], ['mr_meio', xm, wm], ['mr_banco2', xb2, wb2], ['mr_brasil', xbr, wbr]]) qdPeca(g, nome, x, 0, wd, h);
  }
  g.restore();
}

/* ---- embaixo (na margem de baixo do mapa): o alambrado e, do outro lado, a calçada com as lixeiras ---- */
function qdAlambrado(g, r, leve){
  const x0 = GL - U(.6), x1 = GR + U(.6), y0 = GB, k = .62;
  g.save(); g.beginPath(); g.rect(x0, y0, x1 - x0, MH - y0 + 1); g.clip();
  g.fillStyle = QD.rua; g.fillRect(x0, y0, x1 - x0, MH - y0 + 1);
  const p = qdP('fora_baixo');
  if (p){                                                    // a faixa de baixo da imagem (a mureta, as lixeiras, a rua e as árvores), repetida
    const e = qdEsc('fora_baixo'), wd = p[2]/e*k, hd = p[3]/e*k;
    let i = 0; for (let x = CX - wd/2 - Math.ceil((CX - wd/2 - x0)/wd)*wd; x < x1; x += wd, i++) qdPeca(g, 'fora_baixo', x, y0 + U(.5), wd, hd, i % 2 !== 0, false);
  }
  // o alambrado: a mureta e a tela, com os canos
  g.fillStyle = '#8f877b'; g.fillRect(x0, y0, x1 - x0, U(.42));
  g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(x0, y0 + U(.42), x1 - x0, U(.16));
  if (!leve){
    g.strokeStyle = 'rgba(28,30,32,.55)'; g.lineWidth = U(.05); g.beginPath();
    for (let x = x0; x < x1; x += U(.42)){ g.moveTo(x, y0); g.lineTo(x + U(.21), y0 + U(.42)); g.moveTo(x + U(.21), y0); g.lineTo(x, y0 + U(.42)); }
    g.stroke();
  }
  g.fillStyle = '#3a3c3e';
  for (let x = x0 + U(1); x < x1; x += U(4.2)) g.fillRect(x - U(.12), y0 - U(.05), U(.24), U(.55));
  g.restore();
}

/* ---- atrás dos gols: o muro pintado e a escada (da imagem), e as casas ---- */
function qdLado(g, lado, leve){
  const nome = lado < 0 ? 'lado_e' : 'lado_d', p = qdP(nome);
  const larg = (p ? p[2] : 125)*QD.E, xi = lado < 0 ? GL - larg : GR;
  g.save(); g.beginPath(); g.rect(lado < 0 ? 0 : GR, 0, lado < 0 ? GL : MW - GR, MH); g.clip();
  g.fillStyle = QD.fora; g.fillRect(lado < 0 ? 0 : GR, 0, lado < 0 ? GL : MW - GR, MH);
  const pc = qdP(lado < 0 ? 'casas_e' : 'casas_d');
  if (pc){                                                   // as casas (de cima a baixo, viradas uma sim, outra não)
    const e = qdEsc(lado < 0 ? 'casas_e' : 'casas_d'), wd = pc[2]/e*QD.EC, hd = pc[3]/e*QD.EC;
    for (let col = 0; col < 3; col++){
      const xc = lado < 0 ? xi - (col + 1)*wd : xi + larg + col*wd, nm = (col % 2 === 0) === (lado < 0) ? 'casas_e' : 'casas_d';
      if (lado < 0 ? xc + wd < 0 : xc > MW) break;
      for (let y = -hd*.3*col, i = col; y < MH; y += hd, i++) qdPeca(g, nm, xc, y, wd, hd, (nm === 'casas_e') !== (lado < 0), i % 2 !== 0);
    }
  }
  if (p){                                                    // o muro pintado e a escada
    const hd = p[3]*QD.E;
    for (let y = 0, i = 0; y < MH; y += hd - 2, i++) qdPeca(g, nome, xi, y, larg, hd, false, i % 2 !== 0);
  } else { g.fillStyle = '#b08f62'; g.fillRect(lado < 0 ? GL - U(2) : GR, 0, U(2), MH); }
  g.restore();
}

/* ---- a galera (Galera na arquibancada): em pé nas escadas dos lados, na cor de cada time ---- */
function qdTorcida(g, r, leve){
  if (!opc.torc) return;
  const t0 = skinDoTime(0).cor, t1 = skinDoTime(1).cor, p = U(1.9);
  for (const lado of [-1, 1]){
    const pe = qdP(lado < 0 ? 'lado_e' : 'lado_d'), larg = (pe ? pe[2] : 125)*QD.E;
    const xe = lado < 0 ? GL - larg + larg*.32 : GR + larg*.62, cor = lado < 0 ? t0 : t1, ang = lado < 0 ? 0 : Math.PI;
    for (let y = GT + U(2 + r()*3); y < GB - U(2); ){
      if (Math.abs(y - CY) < U(3) || r() < .4){ y += U(2 + r()*3); continue; }
      const n = 1 + Math.floor(r()*3);
      for (let i = 0; i < n && y < GB - U(2); i++, y += p*(1 + r()*.3)) cnPessoa(g, r, xe + (r() - .5)*U(.8), y, ang, pick(r, grCamisas(cor)), leve, r() < .4);
      y += U(5 + r()*7);
    }
  }
}

/* ---- o mapa inteiro (leve = a prévia pequena do JOGAR) e o Ultra leve ---- */
function quadra77(g, leve, X){
  g.save();
  try {
    try { g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; } catch (_) {}
    g.fillStyle = QD.fora; g.fillRect(0, 0, MW, MH);
    for (const lado of [-1, 1]) qdLado(g, lado, leve);
    qdMuroCima(g, estRnd(7711), leve);
    qdAlambrado(g, estRnd(7712), leve);
    qdPiso(g, estRnd(7713), leve);
    qdQuadra(g, estRnd(7714), leve);
    if (!leve) qdSombras(g, estRnd(7715));
    if (!mdSemGol()) for (const s of [-1, 1]) estGolChao(g, s);   // a sombra dos gols (o gol vai por cima da bola)
    qdTorcida(g, estRnd(7716), leve);
  } finally { g.restore(); }
  return true;
}
function quadra77Plano(g){                                   // Ultra leve: as cores lisas, as áreas, as linhas e a sombra dos gols
  g.fillStyle = QD.fora; g.fillRect(0, 0, MW, MH);
  g.fillStyle = '#b08f62'; g.fillRect(GL - U(2), 0, U(2), MH); g.fillRect(GR, 0, U(2), MH);
  g.fillStyle = QD.muro; g.fillRect(GL, 0, GR - GL, GT);
  g.fillStyle = QD.rua; g.fillRect(GL, GB, GR - GL, MH - GB);
  g.fillStyle = QD.piso; g.fillRect(GL, GT, GR - GL, GB - GT);
  const {x0, y0, x1, y1} = LINHAS;
  g.fillStyle = QD.verde; g.fillRect(x0, y0, x1 - x0, y1 - y0);
  g.save(); g.beginPath(); g.rect(x0, y0, x1 - x0, y1 - y0); g.clip(); qdAreas(g); g.restore();
  const cal = GRAMA.cal; GRAMA.cal = QD.cal; try { grLinhas(g, true); } finally { GRAMA.cal = cal; }
  if (!mdSemGol()) for (const s of [-1, 1]) estGolChao(g, s);
  return true;
}

/* ---- fora do mundo (Tela parada): as casas dos lados, as de cima e as árvores e a rua de baixo, numa imagem só ---- */
const QD_FORA = {c:null, pad:0, q:0, chave:''};
function qdForaLibera(){ if (QD_FORA.c){ QD_FORA.c.width = QD_FORA.c.height = 1; QD_FORA.c = null; } QD_FORA.chave = ''; }
function qdForaMonta(qs){
  qdForaLibera();
  if (CAMPO.id !== 'estadio' || G().plano || !QD.ok) return;
  const pad = 520, q = Math.max(.15, Math.min(.8, qs*.55)), W2 = MW + 2*pad, H2 = MH + 2*pad;
  if (W2*H2*q*q > 5e6) return;                               // (memória: nunca uma imagem grande demais)
  const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(W2*q)); c.height = Math.max(1, Math.round(H2*q));
  const g = c.getContext('2d'); g.scale(q, q); g.translate(pad, pad);
  try { g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; } catch (_) {}
  g.fillStyle = QD.fora; g.fillRect(-pad, -pad, W2, H2);
  for (const lado of [-1, 1]){                               // as casas dos lados, em colunas (alternando os dois lados da imagem)
    const p = qdP('casas_e'); if (!p) continue;
    const e = qdEsc('casas_e'), wd = p[2]/e*QD.EC, hd = p[3]/e*QD.EC, larg = (qdP(lado < 0 ? 'lado_e' : 'lado_d') || [0, 0, 125])[2]*QD.E;
    for (let col = 0; col < 8; col++){
      const xc = lado < 0 ? GL - larg - (col + 1)*wd : GR + larg + col*wd, nm = (col % 2 === 0) === (lado < 0) ? 'casas_e' : 'casas_d';
      if (lado < 0 ? xc + wd < -pad : xc > MW + pad) break;
      for (let y = -pad - hd*.37*col, i = col; y < MH + pad; y += hd, i++) qdPeca(g, nm, xc, y, wd, hd, (nm === 'casas_e') !== (lado < 0), i % 2 !== 0);
    }
  }
  const pc = qdP('fora_cima');                               // em cima do muro: o alambrado, as árvores e as casas (a faixa de cima da imagem)
  if (pc){
    const e = qdEsc('fora_cima'), k = GT/95*1.25, wd = pc[2]/e*k, hd = pc[3]/e*k;
    for (let fila = 0; fila < 4; fila++){
      const y = -hd*(fila + 1);
      if (y + hd < -pad) break;
      let i = fila; for (let x = CX - wd/2 - Math.ceil((CX - wd/2 + pad)/wd)*wd + fila*wd*.31; x < MW + pad; x += wd, i++) qdPeca(g, 'fora_cima', x, y, wd, hd, i % 2 !== 0, fila % 2 !== 0);
    }
  }
  const pb = qdP('fora_baixo');                              // embaixo: a continuação da faixa de baixo (a mesma do mapa) e mais casas
  if (pb){
    const e = qdEsc('fora_baixo'), k = .62, wd = pb[2]/e*k, hd = pb[3]/e*k;
    for (let fila = 0; fila < 6; fila++){
      const y = GB + U(.5) + hd*fila;
      if (y > MH + pad) break;
      let i = 0; for (let x = CX - wd/2 - Math.ceil((CX - wd/2 + pad)/wd)*wd; x < MW + pad; x += wd, i++) qdPeca(g, 'fora_baixo', x, y, wd, hd, i % 2 !== 0, fila % 2 !== 0);
    }
  }
  for (const [ax, ay, bx, by, x, y, w, h] of [[0, 0, -pad, 0, -pad, -pad, pad, H2], [MW, 0, MW + pad, 0, MW, -pad, pad, H2], [0, 0, 0, -pad, 0, -pad, MW, pad], [0, MH, 0, MH + pad, 0, MH, MW, pad]]){
    const gr = g.createLinearGradient(ax, ay, bx, by); gr.addColorStop(0, 'rgba(8,6,4,.18)'); gr.addColorStop(1, 'rgba(8,6,4,.5)');
    g.fillStyle = gr; g.fillRect(x, y, w, h);                 // (longe da quadra, mais escuro: o olho fica no jogo)
  }
  QD_FORA.c = c; QD_FORA.pad = pad; QD_FORA.q = q; QD_FORA.chave = MW + 'x' + MH + '@' + qs.toFixed(3);
}

/* ---- as trocas: o desenho da Arena (com a reserva da v61), a imagem de fora do mundo, a cor de fundo e a descrição ---- */
(function(){
  const arenaAntes77 = window.RUA_ARENA, planoAntes77 = window.RUA_ARENA_PLANO;
  window.RUA_ARENA = function(g, leve, X){
    if (CAMPO.id === 'estadio' && !CAMPO.grama && !window.RUA_QUADRA77_DESLIGA){ try { return quadra77(g, !!leve, X); } catch (e) { window.RUA_QUADRA77_ERRO = String(e && e.stack); } }
    return arenaAntes77 ? arenaAntes77.apply(this, arguments) : false;
  };
  window.RUA_ARENA_PLANO = function(g, X){
    if (CAMPO.id === 'estadio' && !CAMPO.grama && !window.RUA_QUADRA77_DESLIGA){ try { return quadra77Plano(g, X); } catch (e) { window.RUA_QUADRA77_ERRO = String(e && e.stack); } }
    return planoAntes77 ? planoAntes77.apply(this, arguments) : false;
  };
})();
const buildStaticAntes77 = buildStatic;
buildStatic = function(){
  const r = buildStaticAntes77.apply(this, arguments);
  qdForaLibera(); QD_FORA.q = CAMPO.id === 'estadio' && !G().plano ? qsBuilt : 0;   // (a imagem de fora do mundo é refeita quando precisar)
  return r;
};
const desenhaStatAntes77 = desenhaStat;
desenhaStat = function(g, s, tx, ty){
  if (CAMPO.id === 'estadio' && !CAMPO.grama && QD_FORA.q > 0 && QD.ok && !window.RUA_QUADRA77_DESLIGA){
    try {
      const cw = g.canvas ? g.canvas.width : 0, ch = g.canvas ? g.canvas.height : 0;
      const vx0 = -tx/s, vy0 = -ty/s, vx1 = (cw - tx)/s, vy1 = (ch - ty)/s;          // o pedaço do mundo que aparece na tela
      if (vx0 < 0 || vy0 < 0 || vx1 > MW || vy1 > MH){
        if (!QD_FORA.c) qdForaMonta(QD_FORA.q);
        const F = QD_FORA.c;
        if (F) g.drawImage(F, -QD_FORA.pad, -QD_FORA.pad, MW + 2*QD_FORA.pad, MH + 2*QD_FORA.pad);
      }
    } catch (e) { qdForaLibera(); QD_FORA.q = 0; window.RUA_QUADRA77_ERRO = String(e && e.stack); }
  }
  return desenhaStatAntes77.apply(this, arguments);
};
CAMPOS[0].fundo = QD.fora;                                   // onde o mundo acaba: as casas (o desenho de fora do mundo começa nelas)
MAPA_DESC.estadio = 'A quadra da favela vista de cima: o verde com as áreas amarelas e o círculo azul, o muro grafitado, as escadas pintadas e as casas em volta';
try { if (CAMPO.id === 'estadio' && stat) buildStatic(); } catch (_) {}   // (se o jogo abriu na Arena, já com o desenho novo)
