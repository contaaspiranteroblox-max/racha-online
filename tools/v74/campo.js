/* ======================================================================================================================
   RACHA rua v74 · o ESTÁDIO (o mapa de grama) virou o society da imagem enviada (tools/v74/campo_noite_original.png):
   a grama listrada à noite, o alambrado em volta, o calçamento de bloquinho, o meio-fio laranja e cinza, o estacionamento
   com os carros, os bancos dos dois times, os postes de luz, as pedras atrás dos gols, as árvores dos cantos e o morro.
   O TAMANHO E OS GOLS SÃO OS DO JOGO. As linhas, as traves, as redes e a área do jogador de cada tamanho (1v1 a 4v4) são as
   da Arena, sem mudar nada: a física e as medidas continuam iguais às da Arena. É o desenho que se ajusta a cada tamanho:
   as 13 faixas do corte vão de uma linha de fundo à outra (a do meio clara, como na imagem), o alambrado fica na beira da
   área do jogador (onde o jogador para), o calçamento e o estacionamento ficam na margem do mapa, e o gol é o gol do jogo
   (a armação branca e a rede na cor do time), atrás da linha de fundo, com a boca e a profundidade de cada tamanho.
   Da imagem vêm só as peças que não dá para desenhar bem (os carros, as árvores e as casas): o kit tools/v74/campo_noite_kit
   (feito por tools/v74/campo_kit.py), embutido aqui pelo build (CN_KIT). Sem o kit (se a imagem não abrir), o campo sai
   igual, só sem essas peças. Na Tela parada sobra tela dos lados do mundo: lá entram o resto do estacionamento e as casas
   (CN_FORA, uma imagem de cada lado, por baixo do campo).
   Quem desenha: desenhaEstadio e campoPlano com CAMPO.grama. A v70.2 já trocava os dois (gramadoDesenha, gramadoPlano):
   eles ficam de reserva, se algo aqui der erro (window.RUA_CAMPO74_ERRO guarda o erro).
   ====================================================================================================================== */
const CN_KIT = /*KIT74*/null;                               // {src:'data:image/webp;base64,…', p:{peça:[x, y, w, h]}} (o build põe)
const CN = {
  D:2.2,                                                    // px do mundo por px da imagem: o tamanho das peças do kit (um carro ≈ 2 tampinhas)
  cerca:U(.55), piso:U(5.2), guia:U(.6), vagas:U(11.2),     // o alambrado · o calçamento atrás dos gols · o meio-fio · o fundo do estacionamento
  faixas:13,                                                // as faixas do corte, de uma linha de fundo à outra (ímpar: a do meio fica no meio)
  claro:'#578d25', escuro:'#215915', cal:'#eef1e4',         // as cores medidas na imagem (a grama clara e a escura, à noite)
  fundo:'#161b21', asfalto:'#28303a', laranja:'#f39a0b', cinza:'#78756f',
  pedra:['#c9c2b1', '#25272b'], onda:[U(.82), U(.5), U(5.6)],   // v76: a calçada de Copacabana: a pedra branca e a preta · a largura de cada onda, a altura e o comprimento
  ferro:'#8f98a2', faixa:'rgba(232,236,240,.78)', amarelo:'#f2b318',
  luz:'228,240,255'                                         // a luz dos refletores (branca, um pouco azul, como na imagem)
};
const SK76_TAU_C = Math.PI*2;
const CN_IMG = {el:null, ok:false};
if (CN_KIT && CN_KIT.src){
  const im = new Image();
  im.onload = () => { CN_IMG.ok = true; cnRefaz(); };
  im.onerror = () => { CN_IMG.ok = false; window.RUA_CAMPO74_KIT = 'a imagem do kit não abriu'; };
  im.src = CN_KIT.src; CN_IMG.el = im;
}
function cnRefaz(){                                         // o kit chegou: refaz o campo (se é o Estádio) e as prévias do Estádio no JOGAR
  try {
    const i = CAMPOS.findIndex(c => c.grama);
    for (const k of [...PREV_MORRO.keys()]) if (k.startsWith(i + '-')) PREV_MORRO.delete(k);
    if (CAMPO.grama && stat) buildStatic();
    if (RQP.raiz && !RQP.raiz.hidden) pintaMapas();
  } catch (_) {}
}
function cnPeca(g, nome, x, y, ang, esc, viraX, viraY){     // uma peça do kit com o meio em (x, y), girada (ang) e na escala esc (px do mundo por px da imagem)
  const p = CN_IMG.ok && CN_KIT && CN_KIT.p[nome]; if (!p) return false;
  const k = esc || CN.D, w = p[2]*k, h = p[3]*k;
  g.save(); g.translate(x, y); if (ang) g.rotate(ang); if (viraX || viraY) g.scale(viraX ? -1 : 1, viraY ? -1 : 1);
  g.drawImage(CN_IMG.el, p[0], p[1], p[2], p[3], -w/2, -h/2, w, h);
  g.restore(); return true;
}
const CN_PADROES = new Map();
function cnPadrao(g, nome, L, desenha){                     // um ladrilho pequeno (L px do mundo) na resolução da imagem do cenário, para repetir
  const T = g.getTransform ? g.getTransform() : null, s = T ? Math.max(.2, Math.hypot(T.a, T.b)) : 1, n = Math.max(6, Math.min(256, Math.ceil(L*s)));
  const key = nome + '|' + n; let c = CN_PADROES.get(key);
  if (!c){ if (CN_PADROES.size > 24) CN_PADROES.clear(); c = document.createElement('canvas'); c.width = c.height = n; const o = c.getContext('2d'); o.scale(n/L, n/L); desenha(o, L); CN_PADROES.set(key, c); }
  let p = null;
  try { p = g.createPattern(c, 'repeat'); if (p && p.setTransform && typeof DOMMatrix !== 'undefined') p.setTransform(new DOMMatrix([L/n, 0, 0, L/n, 0, 0])); } catch (_) {}
  return p;
}
function cnLuzes(){                                         // de onde vem a luz (como na imagem): os refletores nas 4 quinas do alambrado e no meio, em cima e embaixo
  const dx = Math.max((LX1 - LX0)*.176, U(15.3)), c = CN.cerca, yt = GT - c, yb = GB + c;   // (os postes da rua ficam a 32% e 68% do campo; no campo pequeno, depois dos bancos)
  return {quinas:[[GL - c, yt], [GR + c, yt], [GL - c, yb], [GR + c, yb]],
          meio:[[CX, yt, 1], [CX, yb, -1]],                 // (1 = a luz desce para o campo · -1 = sobe)
          postes:[[CX - dx, yt, -1], [CX + dx, yt, -1], [CX - dx, yb, 1], [CX + dx, yb, 1]],
          cantos:[[GL - c - CN.piso*.3, yt - U(1.15)], [GR + c + CN.piso*.3, yb + U(1.15)]],   // os holofotes de losango: em cima à esquerda e embaixo à direita
          arvores:[[GR + c + U(5.6), GT + U(3), 'arvore1'], [GL - c - U(5.6), GB - U(3), 'arvore2']]};   // e as árvores nos outros dois cantos, do lado de fora
}

/* ---- a grama: as 13 faixas do corte (a do meio clara, no meio do campo), o grão e as manchas ---- */
function cnFaixas(g){                                       // as faixas claras, só entre as linhas (de uma linha de fundo à outra, de uma lateral à outra)
  const sw = (LX1 - LX0)/CN.faixas;
  g.save(); g.beginPath(); g.rect(LX0, LY0, LX1 - LX0, LY1 - LY0); g.clip();
  g.fillStyle = CN.claro;
  for (let k = -(CN.faixas >> 1); k <= CN.faixas >> 1; k++) if (!(k & 1)) g.fillRect(CX + (k - .5)*sw, LY0, sw, LY1 - LY0);
  g.restore();
}
function cnGrama(g, r, leve){
  const w = GR - GL, h = GB - GT, sw = (LX1 - LX0)/CN.faixas;
  g.save(); g.beginPath(); g.rect(GL, GT, w, h); g.clip();
  g.fillStyle = CN.escuro; g.fillRect(GL, GT, w, h);       // v76: fora das linhas, toda a grama no verde escuro (as faixas claras só dentro do campo)
  cnFaixas(g);
  if (!leve){
    for (let i = 0; i < 26; i++){                           // a grama não é igual: manchas mais claras e mais escuras
      const x = GL + r()*w, y = GT + r()*h, rx = U(1.5 + r()*5), ry = rx*(.35 + r()*.4);
      g.fillStyle = r() < .5 ? 'rgba(210,245,160,.035)' : 'rgba(0,24,0,.05)';
      g.beginPath(); g.ellipse(x, y, rx, ry, r()*Math.PI, 0, TAU); g.fill();
    }
    pontos(g, r, Math.min(12000, Math.round(w*h/520)), GL, GT, w, h, ['rgba(8,40,6,.26)', 'rgba(185,232,120,.11)'], .7, 2);   // o pé da grama
    const M = MARCAS;                                       // o gasto: a boca do gol, a marca do pênalti e o meio
    for (const [x, y, k] of [[LX0 + M.pequenaW*.4, CY, 1], [LX1 - M.pequenaW*.4, CY, 1], [LX0 + M.penalti, CY, .55], [LX1 - M.penalti, CY, .55], [CX, CY, .5]]){
      const R = U(3)*k, gr = g.createRadialGradient(x, y, 0, x, y, R);
      gr.addColorStop(0, 'rgba(112,104,62,.3)'); gr.addColorStop(.6, 'rgba(112,104,62,.1)'); gr.addColorStop(1, 'rgba(112,104,62,0)');
      g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, R, R*(k === 1 ? 1.35 : 1), 0, 0, TAU); g.fill();
    }
  }
  g.restore();
}
function cnLinhas(g, liso){                                 // as linhas de cal: as do jogo (grLinhas, as marcas de cada tamanho), no branco da imagem
  const cal = GRAMA.cal; GRAMA.cal = CN.cal;
  try { grLinhas(g, liso); } finally { GRAMA.cal = cal; }
}

/* ---- a luz: o escuro chegando nas beiradas e os fachos dos refletores na grama ---- */
function cnFacho(g, x, y, ang, abre, R, a, cor){            // um facho no chão: o leque que sai de (x, y) na direção ang, abrindo ±abre
  const gr = g.createRadialGradient(x, y, 0, x, y, R), c = cor || CN.luz;
  gr.addColorStop(0, 'rgba(' + c + ',' + a + ')'); gr.addColorStop(.5, 'rgba(' + c + ',' + (a*.55).toFixed(3) + ')'); gr.addColorStop(1, 'rgba(' + c + ',0)');
  g.save(); g.beginPath(); g.moveTo(x, y);
  for (let i = 0; i <= 14; i++){ const t = ang - abre + 2*abre*i/14; g.lineTo(x + Math.cos(t)*R*1.1, y + Math.sin(t)*R*1.1); }
  g.closePath(); g.clip(); g.fillStyle = gr; g.fillRect(x - R, y - R, 2*R, 2*R); g.restore();
}
function cnLuz(g){
  const w = GR - GL, h = GB - GT, Lz = cnLuzes();
  g.save(); g.beginPath(); g.rect(GL, GT, w, h); g.clip();
  g.save(); g.translate(CX, CY); g.scale(w/2, h/2);
  const v = g.createRadialGradient(0, 0, .25, 0, 0, 1.45);
  v.addColorStop(0, 'rgba(3,8,5,0)'); v.addColorStop(.62, 'rgba(3,8,5,.06)'); v.addColorStop(1, 'rgba(3,8,5,.3)');
  g.fillStyle = v; g.fillRect(-1, -1, 2, 2); g.restore();
  g.globalCompositeOperation = 'lighter';
  for (const [x, y] of Lz.quinas){ const a = Math.atan2(CY - y, CX - x); cnFacho(g, x, y, a, .5, h*.44, .1); cnFacho(g, x, y, a, .3, h*.4, .13); }   // os fachos fortes (como na imagem)
  for (const [x, y, s] of Lz.meio){ const a = s > 0 ? Math.PI/2 : -Math.PI/2; cnFacho(g, x, y, a, .42, h*.34, .1); cnFacho(g, x, y, a, .24, h*.3, .12); }
  for (const [x, y, s] of Lz.postes){ const a = s < 0 ? Math.PI/2 : -Math.PI/2; cnFacho(g, x, y, a, .7, h*.62, .03); }   // e a luz geral, de leve
  g.restore();
}

/* ---- o alambrado na beira da área do jogador: a tela em losango, os canos e os postes ---- */
function cnCerca(g, leve){
  const c = CN.cerca, x0 = GL - c, x1 = GR + c, y0 = GT - c, y1 = GB + c, s = U(.75);
  const sombra = (x, y, w, h, ax, ay, bx, by) => {          // a sombra do alambrado na grama (a luz vem de dentro do campo)
    const gr = g.createLinearGradient(ax, ay, bx, by); gr.addColorStop(0, 'rgba(0,0,0,.45)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(x, y, w, h);
  };
  g.save(); g.beginPath(); g.rect(GL, GT, GR - GL, GB - GT); g.clip();
  sombra(GL, GT, GR - GL, s, 0, GT, 0, GT + s); sombra(GL, GB - s, GR - GL, s, 0, GB, 0, GB - s);
  sombra(GL, GT, s, GB - GT, GL, 0, GL + s, 0); sombra(GR - s, GT, s, GB - GT, GR, 0, GR - s, 0);
  g.restore();
  g.save(); g.beginPath(); g.rect(x0, y0, x1 - x0, y1 - y0); g.rect(GL, GT, GR - GL, GB - GT); g.clip('evenodd');
  g.fillStyle = 'rgba(16,20,26,.5)'; g.fillRect(x0, y0, x1 - x0, y1 - y0);
  if (!leve){                                               // a tela em losango
    const p = cnPadrao(g, 'tela', U(.42), (o, L) => {
      o.strokeStyle = 'rgba(186,198,214,.55)'; o.lineWidth = L*.11;
      o.beginPath(); o.moveTo(0, 0); o.lineTo(L, L); o.moveTo(L, 0); o.lineTo(0, L); o.moveTo(-L, 0); o.lineTo(L, 2*L); o.moveTo(2*L, 0); o.lineTo(0, 2*L); o.stroke();
    });
    if (p){ g.fillStyle = p; g.fillRect(x0, y0, x1 - x0, y1 - y0); }
  }
  g.lineWidth = U(.11); g.strokeStyle = 'rgba(8,10,12,.75)';   // os canos de cima e de baixo (o de fora e o de dentro)
  g.strokeRect(x0 + U(.06), y0 + U(.06), x1 - x0 - U(.12), y1 - y0 - U(.12)); g.strokeRect(GL - U(.06), GT - U(.06), GR - GL + U(.12), GB - GT + U(.12));
  g.lineWidth = U(.06); g.strokeStyle = CN.ferro;
  g.strokeRect(x0 + U(.06), y0 + U(.06), x1 - x0 - U(.12), y1 - y0 - U(.12)); g.strokeRect(GL - U(.06), GT - U(.06), GR - GL + U(.12), GB - GT + U(.12));
  g.restore();
  const poste = (x, y) => {                                 // os postes do alambrado (vistos de cima: o cano e o brilho)
    const e = U(.3);
    g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(x - e/2 + U(.08), y - e/2 + U(.1), e, e);
    g.fillStyle = '#a7b0ba'; g.fillRect(x - e/2, y - e/2, e, e);
    g.fillStyle = 'rgba(255,255,255,.45)'; g.fillRect(x - e/2, y - e/2, e, e*.3);
    g.lineWidth = U(.05); g.strokeStyle = 'rgba(8,10,12,.8)'; g.strokeRect(x - e/2, y - e/2, e, e);
  };
  const m = c/2, passo = U(4.6);
  for (const [a, b, fixo, horiz] of [[x0, x1, y0 + m, true], [x0, x1, y1 - m, true], [y0, y1, x0 + m, false], [y0, y1, x1 - m, false]]){
    const n = Math.max(1, Math.round((b - a)/passo));
    for (let i = 0; i <= n; i++){ const t = a + m + (b - a - 2*m)*i/n; if (horiz) poste(t, fixo); else poste(fixo, t); }
  }
}

/* ---- v76: a calçada em volta é a de Copacabana: as ondas de pedra portuguesa, preta e branca, correndo junto do alambrado
   (como no calçadão, as ondas vão no sentido da calçada); o meio-fio laranja e cinza e as pedras atrás dos gols ficam ---- */
function cnCalcadao(g, liso){
  const c = CN.cerca, P = CN.piso, xa = GL - c - P, xb = GR + c + P, x0 = GL - c, x1 = GR + c, yt = GT - c, yb = GB + c;
  const B = CN.onda[0], A = CN.onda[1], L = CN.onda[2], k = SK76_TAU_C/L, passo = Math.max(4, L/18);
  // as quatro faixas (em cima, embaixo e atrás dos gols), cortadas em diagonal nos cantos; d = a distância a partir do alambrado
  const faixas = [
    {poli:[[xa, 0], [xb, 0], [x1, yt], [x0, yt]], ao:(s, d) => [s, yt - d], de:xa, ate:xb, fundo:yt},
    {poli:[[xa, MH], [xb, MH], [x1, yb], [x0, yb]], ao:(s, d) => [s, yb + d], de:xa, ate:xb, fundo:MH - yb},
    {poli:[[xa, 0], [x0, yt], [x0, yb], [xa, MH]], ao:(s, d) => [x0 - d, s], de:0, ate:MH, fundo:P},
    {poli:[[xb, 0], [x1, yt], [x1, yb], [xb, MH]], ao:(s, d) => [x1 + d, s], de:0, ate:MH, fundo:P}];
  for (const F of faixas){
    g.save(); g.beginPath(); F.poli.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); g.clip();
    g.fillStyle = CN.pedra[0]; g.fillRect(xa - 2, 0, xb - xa + 4, MH);
    g.beginPath();                                          // as ondas pretas: entre as curvas d = B·(2j + 1) e B·(2j + 2), cada uma com a mesma ondulação
    for (let d = B*.5; d < F.fundo + A + B; d += 2*B){
      for (let s = F.de - L; s <= F.ate + L; s += passo){ const [x, y] = F.ao(s, d + A*Math.sin(k*s)); s === F.de - L ? g.moveTo(x, y) : g.lineTo(x, y); }
      for (let s = F.ate + L; s >= F.de - L; s -= passo){ const [x, y] = F.ao(s, d + B + A*Math.sin(k*s)); g.lineTo(x, y); }
      g.closePath();
    }
    g.fillStyle = CN.pedra[1]; g.fill();
    if (!liso){
      const p = cnPadrao(g, 'pedrinha', U(.62), (o, Lp) => {   // as pedrinhas: cada uma de um tom, com a junta escura entre elas
        const r = estRnd(4321), n = 4, q = Lp/n;
        for (let a = 0; a < n; a++) for (let b = 0; b < n; b++){
          const x = a*q, y = b*q, j = () => (r() - .5)*q*.2;   // (uma grade torta: cada pedrinha com os cantos mexidos)
          o.fillStyle = r() < .5 ? 'rgba(255,255,255,.08)' : 'rgba(0,0,0,.1)';
          o.beginPath(); o.moveTo(x + q*.1 + j(), y + q*.1 + j()); o.lineTo(x + q*.9 + j(), y + q*.1 + j()); o.lineTo(x + q*.9 + j(), y + q*.9 + j()); o.lineTo(x + q*.1 + j(), y + q*.9 + j()); o.closePath(); o.fill();
          o.strokeStyle = 'rgba(8,8,10,.3)'; o.lineWidth = q*.12; o.stroke();
        }
      });
      if (p){ g.fillStyle = p; g.fillRect(xa - 2, 0, xb - xa + 4, MH); }
    }
    g.restore();
  }
  if (!liso){                                               // a luz do campo some aos poucos na calçada (mais clara junto do alambrado)
    const esc = (ax, ay, bx, by, x, y, w, h) => { const gr = g.createLinearGradient(ax, ay, bx, by); gr.addColorStop(0, 'rgba(8,10,16,0)'); gr.addColorStop(1, 'rgba(8,10,16,.42)'); g.fillStyle = gr; g.fillRect(x, y, w, h); };
    esc(0, yt, 0, 0, xa, 0, xb - xa, yt); esc(0, yb, 0, MH, xa, yb, xb - xa, MH - yb);
    esc(x0, 0, xa, 0, xa, 0, x0 - xa, MH); esc(x1, 0, xb, 0, x1, 0, xb - x1, MH);
  }
}
function cnPiso(g, leve){
  const c = CN.cerca, P = CN.piso, xa = GL - c - P, xb = GR + c + P;
  cnCalcadao(g, leve);
  for (const lado of [-1, 1]){                              // o meio-fio (laranja e cinza), do lado de fora da calçada
    const x = lado < 0 ? xa - CN.guia : xb, w = CN.guia, per = U(13.9), lar = U(5.2);
    g.fillStyle = CN.cinza; g.fillRect(x, 0, w, MH);
    g.fillStyle = CN.laranja;
    for (let y = CY - per*Math.ceil(CY/per) - lar/2; y < MH; y += per) g.fillRect(x, y, w, lar);
    g.fillStyle = 'rgba(255,255,255,.22)'; g.fillRect(lado < 0 ? x + w - U(.12) : x, 0, U(.12), MH);   // a quina de cima (do lado da calçada)
    g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(lado < 0 ? x : x + w - U(.14), 0, U(.14), MH);         // e a sombra na rua
  }
}
function cnPedras(g, lado){                                 // as três pedras de concreto atrás do gol (com os riscos de pixo)
  const x = lado < 0 ? GL - CN.cerca - CN.piso*.5 : GR + CN.cerca + CN.piso*.5, w = U(2.05), h = U(2.95), gap = U(.4), r = estRnd(lado < 0 ? 811 : 977);
  for (let i = -1; i <= 1; i++){
    const y = CY + i*(h + gap) - h/2;
    g.fillStyle = 'rgba(0,0,0,.42)'; rr(g, x - w/2 + U(.18), y + U(.24), w, h, U(.3)); g.fill();
    const gr = g.createLinearGradient(x - w/2, y, x + w/2, y + h); gr.addColorStop(0, '#9a9c9c'); gr.addColorStop(1, '#6c6e70');
    g.fillStyle = gr; rr(g, x - w/2, y, w, h, U(.3)); g.fill();
    g.lineWidth = U(.08); g.strokeStyle = 'rgba(12,13,15,.85)'; g.stroke();
    g.fillStyle = 'rgba(255,255,255,.16)'; rr(g, x - w/2 + U(.2), y + U(.18), w - U(.4), U(.25), U(.12)); g.fill();
    g.strokeStyle = 'rgba(20,22,26,.6)'; g.lineWidth = U(.09); g.lineCap = 'round'; g.lineJoin = 'round';   // o pixo
    g.beginPath(); let px = x - w*.3, py = y + h*.25; g.moveTo(px, py);
    for (let k = 0; k < 6; k++){ px = x - w*.32 + r()*w*.64; py = y + h*(.2 + k*.12) + (r() - .5)*U(.3); g.lineTo(px, py); }
    g.stroke();
  }
}
function cnBicicletario(g){                                 // o paraciclo do lado direito (os arcos de ferro vistos de cima)
  const x = GR + CN.cerca + CN.piso*.32, y0 = CY - (GB - GT)*.36, n = 5, p = U(.95);
  g.save(); g.lineCap = 'round';
  for (let i = 0; i < n; i++){
    const y = y0 + i*p;
    g.strokeStyle = 'rgba(0,0,0,.4)'; g.lineWidth = U(.24); g.beginPath(); g.moveTo(x - U(.75) + U(.1), y + U(.14)); g.lineTo(x + U(.75) + U(.1), y + U(.14)); g.stroke();
    g.strokeStyle = 'rgba(8,10,12,.9)'; g.lineWidth = U(.26); g.beginPath(); g.moveTo(x - U(.75), y); g.lineTo(x + U(.75), y); g.stroke();
    g.strokeStyle = '#c3cad2'; g.lineWidth = U(.14); g.stroke();
    g.fillStyle = '#5c646d'; for (const sx of [-1, 1]){ g.beginPath(); g.arc(x + sx*U(.75), y, U(.15), 0, TAU); g.fill(); }
  }
  g.restore();
}

/* ---- o estacionamento dos lados (as vagas de lado, o batente amarelo e os carros) e, fora do mundo, a calçada e as casas ---- */
function cnLado(g, lado, leve, fora){
  const s = lado < 0 ? -1 : 1, xc = lado < 0 ? GL - CN.cerca - CN.piso - CN.guia : GR + CN.cerca + CN.piso + CN.guia;   // xc = a beira da rua, junto do meio-fio
  const xf = xc + s*CN.vagas, r = estRnd(lado < 0 ? 4141 : 5757), th = .62, dx = s*Math.cos(th), dy = s*Math.sin(th);   // as vagas de lado (35°), como na imagem
  const x0 = Math.min(xc, xf), wl = Math.abs(xf - xc);
  if (!leve) pontos(g, r, Math.round(wl*MH/420), x0, 0, wl, MH, ['rgba(255,255,255,.035)', 'rgba(0,0,0,.16)'], .8, 2.2);   // o grão do asfalto
  const esp = U(5.4), Lf = (CN.vagas - U(.9))/Math.cos(th), ox = xc + s*U(.35);
  const yIni = CY - esp*Math.ceil((CY + esp)/esp), carros = ['carro_vermelho', 'carro_branco', 'carro_preto', 'carro_preto2', 'carro_amarelo', 'carro_branco2'];
  g.save(); g.lineCap = 'butt';
  g.strokeStyle = CN.faixa; g.lineWidth = U(.2); g.beginPath();   // as faixas brancas das vagas
  for (let y = yIni; y < MH + esp; y += esp){ g.moveTo(ox, y); g.lineTo(ox + dx*Lf, y + dy*Lf); }
  g.stroke();
  const ang = Math.atan2(-dx, dy);                          // a peça em pé (o comprimento no y) girada para o lado da vaga
  for (let y = yIni; y < MH + esp; y += esp){
    const ym = y + esp/2, bx = ox + dx*U(.85), by = ym + dy*U(.85);   // o batente amarelo, de través na vaga
    g.save(); g.translate(bx, by); g.rotate(ang);
    g.fillStyle = 'rgba(0,0,0,.4)'; rr(g, -U(1.1) + U(.1), -U(.19) + U(.12), U(2.2), U(.38), U(.12)); g.fill();
    g.fillStyle = CN.amarelo; rr(g, -U(1.1), -U(.19), U(2.2), U(.38), U(.12)); g.fill();
    g.lineWidth = U(.06); g.strokeStyle = 'rgba(30,20,0,.7)'; g.stroke();
    g.restore();
    const q = r(), nome = carros[Math.floor(r()*carros.length) % carros.length], vira = r() < .5;
    if (q < .58){                                           // o carro (nem toda vaga tem)
      const k = CN_KIT && CN_KIT.p[nome], L = k ? k[3]*CN.D : U(7.4), cx = ox + dx*(U(1.35) + L/2), cy = ym + dy*(U(1.35) + L/2);
      g.save(); g.translate(cx + U(.25), cy + U(.35)); g.rotate(ang); g.fillStyle = 'rgba(0,0,0,.5)'; rr(g, -U(1.75), -L/2, U(3.5), L, U(1)); g.fill(); g.restore();   // a sombra
      if (!cnPeca(g, nome, cx, cy, ang, CN.D, false, vira)){ g.save(); g.translate(cx, cy); g.rotate(ang); g.fillStyle = '#4b5562'; rr(g, -U(1.6), -L/2, U(3.2), L, U(.9)); g.fill(); g.restore(); }   // (sem o kit: o carro liso)
    }
  }
  g.restore();
  if (!fora) return;                                        // (o resto só aparece fora do mundo, na Tela parada)
  g.fillStyle = CN.cinza; g.fillRect(lado < 0 ? xf - CN.guia : xf, 0, CN.guia, MH);   // o meio-fio do outro lado da rua
  const casa = lado < 0 ? 'casas_esq' : 'casas_dir', outra = lado < 0 ? 'casas_dir' : 'casas_esq', p = CN_KIT && CN_KIT.p[casa], p2 = CN_KIT && CN_KIT.p[outra];
  const largura = p ? p[2]*CN.D : U(10), largura2 = p2 ? p2[2]*CN.D : U(10);
  const xh = lado < 0 ? xf - CN.guia - largura/2 : xf + CN.guia + largura/2, xh2 = xh + s*(largura/2 + largura2/2);
  const coluna = (nome, x, pp, viraX) => {                 // a faixa de casas da imagem, repetida na altura (uma de cabeça para baixo, outra não: sem emenda)
    if (!pp) return;
    const hh = pp[3]*CN.D; let j = Math.floor((0 - (CY - hh/2))/hh) - 1;
    for (let y = CY - hh/2 + j*hh; y < MH; y += hh, j++) cnPeca(g, nome, x, y + hh/2, 0, CN.D, viraX, j & 1);
  };
  coluna(outra, xh2, p2, true);
  coluna(casa, xh, p, false);
  const xi = xh2 - s*largura2/2, xg = xh2 + s*(largura2/2 + U(2.5)), gr = g.createLinearGradient(xi, 0, xg, 0);   // e o morro some no escuro (a 2ª fila de casas vai apagando)
  gr.addColorStop(0, 'rgba(22,27,33,0)'); gr.addColorStop(.6, 'rgba(22,27,33,.72)'); gr.addColorStop(1, CN.fundo);
  g.fillStyle = gr; g.fillRect(Math.min(xi, xg), 0, Math.abs(xg - xi), MH);
  g.fillStyle = CN.fundo; g.fillRect(lado < 0 ? xg - U(60) : xg, 0, U(60), MH);
}

/* ---- os bancos dos times (o seu à esquerda, o do adversário à direita), os postes de luz, os holofotes e as árvores ---- */
function cnBancos(g, leve){
  const yt = GT - CN.cerca, yb = GB + CN.cerca, h = Math.min(U(1.85), yt - U(.5)), e = U(.3);
  for (const [lado, a, b] of [[0, CX - U(13.1), CX - U(3.1)], [1, CX + U(3.1), CX + U(13.1)]]){
    const cor = skinDoTime(lado).cor;
    for (const [y, cima] of [[yt - e - h, true], [yb + e, false]]){
      g.fillStyle = 'rgba(0,0,0,.45)'; rr(g, a + U(.2), y + U(.25), b - a, h, U(.3)); g.fill();
      g.fillStyle = '#14171c'; rr(g, a, y, b - a, h, U(.3)); g.fill();
      const n = Math.max(3, Math.round((b - a)/U(2))), gap = U(.16), sw = (b - a - U(.3) - gap*(n - 1))/n;
      for (let i = 0; i < n; i++){
        const x = a + U(.15) + i*(sw + gap), yy = y + (cima ? U(.38) : U(.15)), hh = h - U(.53);
        g.fillStyle = cor; rr(g, x, yy, sw, hh, U(.18)); g.fill();
        if (!leve){
          g.fillStyle = 'rgba(255,255,255,.22)'; g.fillRect(x + U(.15), yy + U(.1), sw - U(.3), U(.12));
          g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(x + U(.1), yy + hh - U(.16), sw - U(.2), U(.12));
        }
      }
      g.fillStyle = corMix(cor, '#000000', .45); g.fillRect(a + U(.15), cima ? y + U(.1) : y + h - U(.28), b - a - U(.3), U(.18));   // o encosto (do lado de fora)
    }
  }
}
function cnBrilho(g, x, y, R, a, cor){                      // o brilho em volta de uma lâmpada
  g.save(); g.globalCompositeOperation = 'lighter';
  const gr = g.createRadialGradient(x, y, 0, x, y, R);
  gr.addColorStop(0, 'rgba(' + cor + ',' + a + ')'); gr.addColorStop(.25, 'rgba(' + cor + ',' + (a*.35).toFixed(3) + ')'); gr.addColorStop(1, 'rgba(' + cor + ',0)');
  g.fillStyle = gr; g.fillRect(x - R, y - R, 2*R, 2*R); g.restore();
}
function cnPostes(g, leve){
  const Lz = cnLuzes(), comp = Math.min(U(1.9), GT - CN.cerca - U(.45));
  for (const [x, y, s] of Lz.postes){                      // o poste sai do alambrado para fora e a cabeça (com as lâmpadas) olha para o campo
    const y0 = y + s*U(.2), y1 = y + s*comp;
    g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(x - U(.2) + U(.12), Math.min(y0, y1) + U(.12), U(.4), Math.abs(y1 - y0));
    g.lineCap = 'round'; g.strokeStyle = 'rgba(8,10,12,.9)'; g.lineWidth = U(.36); g.beginPath(); g.moveTo(x, y0); g.lineTo(x, y1); g.stroke();
    g.strokeStyle = '#6d757e'; g.lineWidth = U(.22); g.stroke();
    const hw = U(1.3), hh = U(.62);
    g.fillStyle = '#121418'; rr(g, x - hw/2, y1 - hh/2, hw, hh, U(.12)); g.fill();
    g.fillStyle = '#f4f8ff'; rr(g, x - hw/2 + U(.12), s < 0 ? y1 + U(.02) : y1 - hh/2 + U(.1), hw - U(.24), hh/2 - U(.12), U(.06)); g.fill();
    if (!leve) cnBrilho(g, x, y1 - s*U(.2), U(3.4), .5, CN.luz);
  }
  const refletor = (x, y, a) => {                           // o refletor preso no alambrado (a caixa e a lâmpada viradas para o campo)
    g.save(); g.translate(x, y); g.rotate(a);
    g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(-U(.35) + U(.1), -U(.55) + U(.12), U(.7), U(1.1));
    g.fillStyle = '#121418'; rr(g, -U(.35), -U(.55), U(.7), U(1.1), U(.1)); g.fill();
    g.fillStyle = '#f4f8ff'; rr(g, U(.02), -U(.42), U(.24), U(.84), U(.06)); g.fill();
    g.restore();
    if (!leve) cnBrilho(g, x + Math.cos(a)*U(.3), y + Math.sin(a)*U(.3), U(2.6), .6, CN.luz);
  };
  for (const [x, y] of Lz.quinas) refletor(x, y, Math.atan2(CY - y, CX - x));
  for (const [x, y, s] of Lz.meio) refletor(x, y, s > 0 ? Math.PI/2 : -Math.PI/2);
  for (const [x, y] of Lz.cantos){                         // o holofote do canto: o poste e as três lâmpadas em losango viradas para o campo
    const a = Math.atan2(CY - y, CX - x);
    g.save(); g.translate(x, y); g.rotate(a);
    g.fillStyle = 'rgba(0,0,0,.45)'; g.beginPath(); g.arc(U(.15), U(.15), U(.42), 0, TAU); g.fill();
    g.fillStyle = '#5d656e'; g.beginPath(); g.arc(0, 0, U(.36), 0, TAU); g.fill(); g.lineWidth = U(.07); g.strokeStyle = 'rgba(8,10,12,.85)'; g.stroke();
    g.fillStyle = '#121418'; g.fillRect(U(.3), -U(1.75), U(.4), U(3.5));
    for (const t of [-1, 0, 1]){
      g.save(); g.translate(U(.95), t*U(1.2)); g.rotate(Math.PI/4);
      g.fillStyle = '#121418'; g.fillRect(-U(.5), -U(.5), U(1), U(1));
      g.fillStyle = '#f4f8ff'; g.fillRect(-U(.34), -U(.34), U(.68), U(.68));
      g.restore();
    }
    g.restore();
    if (!leve) cnBrilho(g, x + Math.cos(a)*U(.9), y + Math.sin(a)*U(.9), U(4.2), .55, CN.luz);
  }
}
function cnArvores(g){                                      // as árvores dos dois outros cantos (da imagem), com a sombra
  for (const [x, y, nome] of cnLuzes().arvores){
    const p = CN_IMG.ok && CN_KIT && CN_KIT.p[nome]; if (!p) continue;
    const R = p[2]*CN.D*.42;
    g.fillStyle = 'rgba(0,0,0,.38)'; g.beginPath(); g.ellipse(x + U(.6), y + U(.8), R, R*.92, 0, 0, TAU); g.fill();
    cnPeca(g, nome, x, y, 0, CN.D*.9);
  }
}
function cnPessoa(g, r, x, y, ang, camisa, leve, bracos){   // alguém em pé visto de cima, olhando para o campo (ang = para onde olha)
  if (leve){ g.fillStyle = camisa; g.beginPath(); g.arc(x, y, U(.6), 0, TAU); g.fill(); return; }
  const pele = pick(r, GRAMA.pele), cabelo = pick(r, GRAMA.cabelo), bone = r() < .3 ? pick(r, ['#131516', '#f2efe6', '#d96f45', '#2f6fe0', camisa]) : null;
  g.save(); g.translate(x, y); g.rotate(ang);              // (aqui o +x é para o campo e os ombros ficam no y)
  g.fillStyle = 'rgba(0,0,0,.42)'; rr(g, -U(.42) + U(.16), -U(.96) + U(.22), U(.84), U(1.92), U(.4)); g.fill();   // a sombra
  if (bracos){                                              // os braços no alambrado
    g.lineCap = 'round'; g.strokeStyle = 'rgba(10,11,12,.8)'; g.lineWidth = U(.38);
    g.beginPath(); g.moveTo(0, -U(.6)); g.lineTo(U(.82), -U(.74)); g.moveTo(0, U(.6)); g.lineTo(U(.82), U(.74)); g.stroke();
    g.strokeStyle = pele; g.lineWidth = U(.24); g.stroke();
  }
  g.fillStyle = camisa; rr(g, -U(.42), -U(.96), U(.84), U(1.92), U(.4)); g.fill();   // os ombros (a camisa)
  g.lineWidth = U(.08); g.strokeStyle = 'rgba(10,11,12,.85)'; g.stroke();
  g.fillStyle = 'rgba(255,255,255,.14)'; rr(g, -U(.3), -U(.8), U(.22), U(1.6), U(.1)); g.fill();   // (a luz do campo nas costas)
  if (bone){ g.fillStyle = bone; g.beginPath(); g.ellipse(U(.42), 0, U(.22), U(.3), 0, 0, TAU); g.fill(); g.stroke(); g.beginPath(); g.arc(U(.1), 0, U(.37), 0, TAU); g.fill(); g.stroke(); }
  else {
    g.fillStyle = pele; g.beginPath(); g.arc(U(.12), 0, U(.37), 0, TAU); g.fill(); g.stroke();   // a cabeça (de cima: a nuca e o cabelo)
    g.fillStyle = cabelo; g.beginPath(); g.arc(U(.06), 0, U(.33), Math.PI*.5, Math.PI*1.5); g.closePath(); g.fill();
  }
  g.restore();
}
function cnTorcida(g, r, leve){                             // Galera na arquibancada: a galera em pé no calçamento, encostada no alambrado, em rodinhas
  if (!opc.torc) return;
  const t0 = skinDoTime(0).cor, t1 = skinDoTime(1).cor, Lz = cnLuzes(), p = U(1.95);
  const livre = x => Math.abs(x - CX) > U(14) && Lz.postes.every(q => Math.abs(x - q[0]) > U(1.8));   // (fora dos bancos e dos postes)
  for (const [y, ang] of [[GT - CN.cerca - U(.95), Math.PI/2], [GB + CN.cerca + U(.95), -Math.PI/2]]){
    for (let x = LX0 + U(1 + r()*3); x < LX1 - U(1); ){
      if (!livre(x) || r() < .35){ x += U(2 + r()*3); continue; }
      const n = 2 + Math.floor(r()*4);                      // uma rodinha de 2 a 5
      for (let i = 0; i < n && x < LX1 - U(1) && livre(x); i++, x += p*(.95 + r()*.15)) cnPessoa(g, r, x, y + (r() - .5)*U(.2), ang, pick(r, grCamisas(x < CX ? t0 : t1)), leve, r() < .6);
      x += U(4 + r()*6);
    }
  }
  const yRack = CY - (GB - GT)*.36 + U(1.9);
  for (const lado of [-1, 1]){                              // atrás dos gols (longe das pedras e do paraciclo)
    const x = lado < 0 ? GL - CN.cerca - U(.95) : GR + CN.cerca + U(.95), cor = lado < 0 ? t0 : t1, ang = lado < 0 ? 0 : Math.PI;
    const livreY = y => Math.abs(y - CY) > U(6) && !(lado > 0 && Math.abs(y - yRack) < U(3.8)) && y > GT + U(4.5) && y < GB - U(4.5);
    for (let y = GT + U(4.5 + r()*2); y < GB - U(4.5); ){
      if (!livreY(y) || r() < .35){ y += U(2 + r()*3); continue; }
      const n = 2 + Math.floor(r()*3);
      for (let i = 0; i < n && livreY(y); i++, y += p*(.95 + r()*.15)) cnPessoa(g, r, x + (r() - .5)*U(.2), y, ang, pick(r, grCamisas(cor)), leve, r() < .6);
      y += U(4 + r()*6);
    }
  }
}

/* ---- o campo inteiro (leve = a prévia pequena do JOGAR) e o Ultra leve ---- */
function campoNoite(g, leve){
  g.save();
  try {
    try { g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; } catch (_) {}
    g.fillStyle = CN.asfalto; g.fillRect(0, 0, MW, MH);
    for (const lado of [-1, 1]) cnLado(g, lado, leve, false);   // o estacionamento dos lados (a parte que fica dentro do mundo)
    cnPiso(g, leve);                                        // o calçamento em volta e o meio-fio
    for (const lado of [-1, 1]) cnPedras(g, lado);
    cnBicicletario(g);
    cnGrama(g, estRnd(9191), leve);
    cnLinhas(g, leve);
    if (!mdSemGol()) for (const s of [-1, 1]) estGolChao(g, s);   // a sombra dos gols (o gol vai por cima da bola: golEstadio)
    if (!leve) cnLuz(g);
    cnCerca(g, leve);
    cnBancos(g, leve);
    cnTorcida(g, estRnd(2626), leve);
    cnPostes(g, leve);
    cnArvores(g);
  } finally { g.restore(); }
}
function campoNoitePlano(g){                                // Ultra leve: as cores lisas, as faixas, as linhas, a sombra dos gols e o alambrado
  const c = CN.cerca, xa = GL - c - CN.piso, xb = GR + c + CN.piso;
  g.fillStyle = CN.asfalto; g.fillRect(0, 0, MW, MH);
  g.fillStyle = CN.laranja; g.fillRect(xa - CN.guia, 0, CN.guia, MH); g.fillRect(xb, 0, CN.guia, MH);
  cnCalcadao(g, true);                                      // v76: a calçada de Copacabana, lisa (sem as pedrinhas)
  g.fillStyle = CN.escuro; g.fillRect(GL, GT, GR - GL, GB - GT);
  cnFaixas(g);
  cnLinhas(g, true);
  if (!mdSemGol()) for (const s of [-1, 1]) estGolChao(g, s);
  g.fillStyle = '#5c646d';
  g.fillRect(GL - c, GT - c, GR - GL + 2*c, c); g.fillRect(GL - c, GB, GR - GL + 2*c, c); g.fillRect(GL - c, GT, c, GB - GT); g.fillRect(GR, GT, c, GB - GT);
}

/* ---- fora do mundo (Tela parada): o resto do estacionamento, a calçada e as casas, uma imagem de cada lado ---- */
const CN_FORA = {esq:null, dir:null, ex:0, pad:4, qs:0};    // (feita só quando a tela mostra além do mapa pela primeira vez: quem joga seguindo o jogador nem gasta a memória)
function cnForaLibera(){ for (const k of ['esq', 'dir']) if (CN_FORA[k]){ CN_FORA[k].width = CN_FORA[k].height = 1; CN_FORA[k] = null; } CN_FORA.ex = 0; }
function cnForaMonta(qs){
  cnForaLibera(); CN_FORA.qs = 0;
  if (!CAMPO.grama || G().plano) return;
  const pc = CN_KIT && CN_KIT.p.casas_esq, larg = (pc ? pc[2]*CN.D : U(10))*2;
  const ex = Math.ceil(CN.cerca + CN.piso + CN.guia + CN.vagas + CN.guia + larg + U(8) - (GL - 0)) + 8, pad = 4;   // até o morro sumir no escuro
  if (ex <= 0) return;
  const q = Math.max(.2, Math.min(1, qs*.6)), w = Math.max(1, Math.round((ex + pad)*q)), h = Math.max(1, Math.round(MH*q));   // (é a beira da tela: mais leve que o campo)
  if (w*h > 6e6) return;                                    // (memória: nunca uma imagem grande demais)
  for (const lado of [-1, 1]){
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d'); g.scale(w/(ex + pad), h/MH); g.translate(lado < 0 ? ex : -(MW - pad), 0);
    const xi = lado < 0 ? -ex : MW - pad;
    g.fillStyle = CN.asfalto; g.fillRect(xi, 0, ex + pad, MH);
    cnLado(g, lado, false, true);
    cnArvores(g);
    CN_FORA[lado < 0 ? 'esq' : 'dir'] = c;
  }
  CN_FORA.ex = ex; CN_FORA.pad = pad; CN_FORA.qs = qs;
}

/* ---- as trocas: o desenho (com a reserva da v70.2), a imagem de fora do mundo, a cor de fundo e a descrição ---- */
const desenhaEstadioAntes74 = desenhaEstadio;
desenhaEstadio = function(g, leve){
  if (CAMPO.grama){ try { campoNoite(g, !!leve); return; } catch (e) { window.RUA_CAMPO74_ERRO = String(e && e.stack); } }
  return desenhaEstadioAntes74.apply(this, arguments);
};
const campoPlanoAntes74 = campoPlano;
campoPlano = function(g){
  if (CAMPO.grama){ try { campoNoitePlano(g); return; } catch (e) { window.RUA_CAMPO74_ERRO = String(e && e.stack); } }
  return campoPlanoAntes74.apply(this, arguments);
};
const buildStaticAntes74 = buildStatic;
buildStatic = function(){
  const r = buildStaticAntes74.apply(this, arguments);
  cnForaLibera(); CN_FORA.qs = CAMPO.grama && !G().plano ? qsBuilt : 0;   // (a imagem de fora do mundo é refeita quando precisar, na resolução nova)
  return r;
};
const desenhaStatAntes74 = desenhaStat;
desenhaStat = function(g, s, tx, ty){
  if (CAMPO.grama && (CN_FORA.esq || CN_FORA.qs > 0)){
    const hw = W/(2*Math.max(1e-6, cam.z)), esq = cam.x - hw < 0, dir = cam.x + hw > MW;
    if ((esq || dir) && !CN_FORA.esq){ try { cnForaMonta(CN_FORA.qs); } catch (e) { cnForaLibera(); CN_FORA.qs = 0; window.RUA_CAMPO74_ERRO = String(e && e.stack); } }
    if (CN_FORA.esq){
      const e = CN_FORA.ex + CN_FORA.pad;
      if (esq) g.drawImage(CN_FORA.esq, -CN_FORA.ex, 0, e, MH);
      if (dir) g.drawImage(CN_FORA.dir, MW - CN_FORA.pad, 0, e, MH);
    }
  }
  return desenhaStatAntes74.apply(this, arguments);
};
for (const c of CAMPOS) if (c.grama) c.fundo = CN.fundo;   // onde o mundo acaba: a noite (o desenho de fora do mundo some nela)
MAPA_DESC.gramado = 'Gramado society à noite no meio do morro: as listras do corte, o alambrado, o calçamento e o estacionamento com os carros';
try { if (CAMPO.grama && stat) buildStatic(); } catch (_) {}   // (se o jogo abriu no Estádio, já com o desenho novo)
