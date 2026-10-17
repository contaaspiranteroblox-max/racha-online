/* ==================================================================================================================
   RACHA rua v70.2 · ENXUTO (entra no fim do script do jogo, depois do celular.js; as trocas de texto em enxuto.py)
   O pedido: "remova todos os modos, deixe o normal; quero um de grama também no estádio e deixe o com curva; o resto
   dos campos remove; remove os efeitos da bola; o indicador já vem desativado".
   1) MODOS: só FUTEBOL e COM CURVA aparecem (JOGAR › CASUAL, CRIAR SALA, a sala, o perfil, as missões, o editor de
      controles e as teclas). O que estava salvo com outro modo vira FUTEBOL. VÔLEI, AMERICANO, BASQUETE e GINGA não foram
      apagados: ficam guardados no código. V702.modos é a lista do que aparece; v702Aplica() refaz tudo com ela.
   2) MAPAS: só a ARENA (a quadra da comunidade, índice 0) e o ESTÁDIO novo (o gramado, índice 4). FAVELA, ESCADÃO e
      VIADUTO ficam guardados do mesmo jeito (V702.mapas). Treino, JOGAR, CRIAR SALA, a sala, a liga e as missões só
      mostram os dois; o salvo com outro mapa vira a Arena (um replay antigo continua no mapa em que foi gravado).
      O Estádio tem as medidas, as paredes, os gols e a bola da Arena (a física é a mesma): só o desenho é outro — o
      gramado com as listras do corte e as linhas de cal, as placas em volta, a arquibancada com a torcida dividida (a
      sua cor de um lado, a do adversário do outro), o banco de reservas e as torres de luz.
   3) A BOLA SEM EFEITOS: sai o rastro neon atrás da bola (no jogo e no replay), o respingo de tinta e o estalo do chute,
      e a cor da bola em EFEITOS (Neon, Ouro, Cósmica): a bola é sempre a clássica. O resto dos Efeitos na Quadra (confete,
      nome da jogada e o brilho do chute no halo) continua na mesma chave dos Ajustes.
   4) O INDICADOR DE DIREÇÃO começa desligado (o padrão novo, no OPC_PADRAO); quem já jogava tem ele desligado uma vez e,
      depois, vale o que escolher nos Ajustes.
   Nada aqui mexe na física, nos bots, no chute ou na rede: só no que aparece e no desenho.
   ================================================================================================================== */
const V702 = {modos:['futebol', 'curva'], mapas:[0, 4], chaveDir:'racha-v702-dir'};
const V702_TODOS = {md:MD_LISTA.slice(), sala:MD_SALA.slice(), est:EST_MODOS.slice(), sl:Object.assign({}, SL_MODO), sk:SK_EFEITOS.slice()};
const v702Modo = id => V702.modos.indexOf(id) >= 0;
function v702Mapas(){ return V702.mapas.filter(i => !!CAMPOS[i]); }
function v702Mapa(i){ i = +i; return V702.mapas.indexOf(i) >= 0 && CAMPOS[i] ? i : V702.mapas[0]; }

/* ---------------------------------------------------------------- 1) os modos e os mapas que aparecem */
const V702_TEM = Map.prototype.has;
MD_MAP.has = function(k){ return v702Modo(k) && V702_TEM.call(this, k); };   // mdValida: modo guardado vira futebol
function v702Aplica(){
  const refaz = (lista, todos, ok) => { lista.length = 0; for (const x of todos) if (ok(x)) lista.push(x); };
  refaz(MD_LISTA, V702_TODOS.md, m => v702Modo(m.id));
  refaz(MD_SALA, V702_TODOS.sala, m => v702Modo(m.id));
  refaz(EST_MODOS, V702_TODOS.est, v702Modo);
  for (const k of Object.keys(SL_MODO)) delete SL_MODO[k];
  for (const k in V702_TODOS.sl) if (v702Modo(k)) SL_MODO[k] = V702_TODOS.sl[k];
  const mapas = v702Mapas();
  for (const b of RQP.modos.querySelectorAll('[data-j]')) b.classList.toggle('v702-fora', !v702Modo(b.dataset.j));
  for (const b of RQP.mapas.querySelectorAll('[data-m]')) b.classList.toggle('v702-fora', mapas.indexOf(+b.dataset.m) < 0);
  RQP.mapas.style.setProperty('--v702-n', String(mapas.length));
  for (const o of SL_OPS) if (o.k === 'map') o.vals = () => v702Mapas();       // a sala: as setas do CAMPO
  const ging = document.getElementById('hed-ginga'); if (ging) ging.classList.toggle('v702-fora', !v702Modo('ginga'));   // o editor de controles
  if (TECLA.lista) for (const b of TECLA.lista.querySelectorAll('.ajx-tbt')){   // as teclas da FINTA e do DRIBLE (só valem na ginga)
    const lin = b.closest('.ajx-tecla'); if (lin && (b.dataset.acao === 'finta' || b.dataset.acao === 'drible')) lin.classList.toggle('v702-fora', !v702Modo('ginga'));
  }
  for (const dt of document.querySelectorAll('.ajx-ajuda dt')) if (dt.textContent === 'FINTA e DRIBLE'){   // Ajustes › Controles › Como jogar no toque
    dt.classList.toggle('v702-fora', !v702Modo('ginga')); const dd = dt.nextElementSibling; if (dd) dd.classList.toggle('v702-fora', !v702Modo('ginga'));
  }
  v702Normaliza();
}
function v702Normaliza(){                                  // o que estava salvo com um modo ou mapa que não aparece mais
  let x = false;
  if (!v702Modo(X49.jogo)){ X49.jogo = 'futebol'; x = true; }
  if (v702Mapa(X49.map) !== X49.map){ X49.map = v702Mapa(X49.map); x = true; }
  if (x) try { x49Save(); } catch (_) {}
  if (v702Mapa(CONTA.rq.mapa) !== CONTA.rq.mapa){ CONTA.rq.mapa = v702Mapa(CONTA.rq.mapa); CONTA.rq.mapaId = CAMPOS[CONTA.rq.mapa].id; }
  const p = SL.pref; let ps = false;
  if (v702Mapa(p.map) !== p.map){ p.map = v702Mapa(p.map); ps = true; }
  if (!v702Modo(p.jogo)){ p.jogo = 'futebol'; ps = true; }
  if (ps) try { slPrefSalva(); } catch (_) {}
  SX.form.map = v702Mapa(SX.form.map); if (!v702Modo(SX.form.jogo)) SX.form.jogo = 'futebol';
  if (!v702Modo(RQP.jogo)) RQP.jogo = 'futebol';
  RQP.mapa = v702Mapa(RQP.mapa);
  if (!v702Modo(PX.modo) && PX.modo !== 'todos') PX.modo = 'todos';
}
// toda partida passa por aqui (casual, liga, sala neste aparelho, sala online, copa): modo e mapa sempre dos que aparecem
const rqCriaAntes702 = rqCria;
rqCria = function(n, mapa, nivel){
  if (!v702Modo(RQ.jogo || 'futebol')) RQ.jogo = 'futebol';
  return rqCriaAntes702(n, v702Mapa(mapa), nivel);
};
const rqComecaAntes702 = rqComeca;
rqComeca = function(n, mapa){ return rqComecaAntes702(n, v702Mapa(mapa)); };   // (a liga guarda o mapa que valeu)
const renderRanqueadaAntes702 = renderRanqueada;
renderRanqueada = function(){
  if (!v702Modo(RQP.jogo)) RQP.jogo = 'futebol';
  RQP.mapa = v702Mapa(RQP.mapa);
  return renderRanqueadaAntes702.apply(this, arguments);
};
// o treino: o CAMPO (as setas e a tecla C) passa só pelos dois
const novoCampoAntes702 = novoCampo;
novoCampo = function(i, c){ return novoCampoAntes702(i, v702Mapa(c === undefined ? campo : c)); };
trocaCampo = function(d){
  const L = v702Mapas(), k = Math.max(0, L.indexOf(campo));
  novoCampo(modo, L[(k + (d < 0 ? -1 : 1) + L.length) % L.length]);
};
function v702CampoTreino(){                                // o campo do treino salvo era um dos que saíram: vira a Arena
  if (v702Mapa(campo) === campo) return;
  aplicaModo(modo, v702Mapa(campo));
  try { localStorage.setItem(CHAVE_CAMPO, CAMPO.id); } catch (_) {}
  try { resetAll(); trMonta(); buildStatic(); posVisual(0); updateCamera(0, true); som.campo(CAMPO.id); } catch (_) {}
}
// as missões do dia: o mapa e o modo sorteados entre os que aparecem (a de hoje, se já tinha saído com outro, troca)
const ecoMissoesAntes702 = ecoMissoes;
ecoMissoes = function(){
  const M = ecoMissoesAntes702.apply(this, arguments);
  let mudou = false;
  for (const x of M.l){
    if (x.id === 'mapa' && v702Mapa(x.arg) !== x.arg){ const L = v702Mapas(); x.arg = L[Math.abs(+x.arg || 0) % L.length]; x.p = 0; mudou = true; }
    if (x.id === 'modo' && !v702Modo(x.arg)){ x.arg = V702.modos.find(m => m !== 'futebol') || 'futebol'; x.p = 0; mudou = true; }
  }
  if (mudou) try { contaSalvar(); } catch (_) {}
  return M;
};
MI.modo.txt = (n, a) => 'Conclua 1 partida ' + (a === 'curva' ? 'no modo Com Curva' : 'de ' + (MD_MAP.get(a) || MD_LISTA[0]).nome.toLowerCase());
MI.mapa.txt = (n, a) => 'Conclua 1 partida no mapa ' + (CAMPOS[a] || CAMPOS[0]).nome;
MI.marcar.txt = n => 'Marque ' + n + (n === 1 ? ' gol' : ' gols') + ' em partidas';
// PERFIL › estatísticas: os cartões dos modos que saíram (cestas, touchdowns, pontos) não aparecem; os totais seguem valendo
const pxEstRenderAntes702 = pxEstRender;
pxEstRender = function(){
  if (!v702Modo(PX.modo) && PX.modo !== 'todos') PX.modo = 'todos';
  const r = pxEstRenderAntes702.apply(this, arguments);
  const fora = {CESTAS:'basquete', TOUCHDOWNS:'americano', 'PONTOS NO VÔLEI':'volei', 'PONTOS NO BASQUETE':'basquete', 'PONTOS NA GINGA':'ginga'};
  for (const c of document.querySelectorAll('#tela-perfil .pf-est-grade .card')){
    const s = c.querySelector('small'), md = s && fora[s.textContent]; if (md && !v702Modo(md)) c.remove();
  }
  return r;
};
// a novidade da v59 (a salinha com seis modos) não aparece mais: segue a fila das janelas
popModosNovos = function(){ const f = filaPop.shift(); if (f) setTimeout(f, 0); };
MAPA_DESC.gramado = 'Gramado de estádio: as listras do corte, as linhas de cal, as placas em volta e a torcida dividida na arquibancada';

/* ---------------------------------------------------------------- 2) o ESTÁDIO: o gramado e a arquibancada */
const GRAMA = {claro:'#4fae4d', escuro:'#3f9744', fundo:'#1d2326', degrau:['#59616a', '#4b535b'], risco:'rgba(10,12,14,.55)', cal:'#f6f5ee',
  placas:[['#f4c51f', '#16181a', 'RACHA'], ['#1e8a4a', '#f3efe2', 'FUTEBOL DE RUA'], ['#2563b5', '#f4c51f', 'TAMPINHA'], ['#e2552f', '#f3efe2', 'GOLAÇO'],
          ['#f3efe2', '#1e8a4a', 'VÁRZEA'], ['#16181a', '#f4c51f', 'PELADA'], ['#d63d5e', '#f3efe2', 'RESENHA'], ['#33a3a0', '#16181a', 'CRAQUE']],
  pele:['#f6d3b3', '#eabf98', '#d9a273', '#b07a4c', '#7b4b2a', '#5a3620'], cabelo:['#140f0c', '#2a1a10', '#3d2a1a', '#0a0b0c', '#6a4424', '#c8a060']};
const GR_PLACA = 1.15, GR_DEGRAU = 1.6;                   // u: a altura das placas de cima (de frente) · a profundidade de cada degrau atrás do gol
function grCamisas(cor){ return [cor, cor, cor, cor, corMix(cor, '#000000', .35), corMix(cor, '#ffffff', .35), '#f2efe6', '#131516']; }
function grListras(g, x0, y0, w, h, liso){                 // o corte da grama: faixas em pé, a partir do meio (simétricas)
  const sw = (LX1 - LX0)/12;
  g.save(); g.beginPath(); g.rect(x0, y0, w, h); g.clip();
  g.fillStyle = GRAMA.escuro; g.fillRect(x0, y0, w, h);
  g.fillStyle = GRAMA.claro;
  for (let k = Math.floor((x0 - CX)/sw) - 1; CX + k*sw < x0 + w; k++) if (!(k & 1)) g.fillRect(CX + k*sw, y0, sw, h);
  if (!liso){
    const sh = (LY1 - LY0)/6;                              // o corte cruzado, bem de leve (o xadrez da grama de estádio)
    g.fillStyle = 'rgba(255,255,255,.035)';
    for (let k = Math.floor((y0 - CY)/sh) - 1; CY + k*sh < y0 + h; k++) if (k & 1) g.fillRect(x0, CY + k*sh, w, sh);
  }
  g.restore();
}
function grGrama(g, r, leve){                              // o gramado inteiro (até a placa): listras, o grão e o gasto
  const w = GR - GL, h = GB - GT;
  g.save(); g.beginPath(); g.rect(GL, GT, w, h); g.clip();
  grListras(g, GL, GT, w, h, leve);
  if (!leve){
    for (let i = 0; i < 18; i++){                           // manchas mais claras e mais escuras (a grama não é igual)
      const x = GL + r()*w, y = GT + r()*h, rx = U(2 + r()*5), ry = rx*(.3 + r()*.35);
      g.fillStyle = r() < .55 ? 'rgba(200,240,150,.03)' : 'rgba(0,30,0,.028)';
      g.beginPath(); g.ellipse(x, y, rx, ry, r()*Math.PI, 0, TAU); g.fill();
    }
    pontos(g, r, Math.min(9000, Math.round(w*h/650)), GL, GT, w, h, ['rgba(16,60,18,.22)', 'rgba(170,230,120,.14)'], .7, 1.9);   // o pé da grama
    const M = MARCAS;                                       // o gasto: a boca do gol, a marca do pênalti e o meio
    for (const [x, y, k] of [[LX0 + M.pequenaW*.45, CY, 1], [LX1 - M.pequenaW*.45, CY, 1], [LX0 + M.penalti, CY, .55], [LX1 - M.penalti, CY, .55], [CX, CY, .5]]){
      const R = U(3.2)*k, gr = g.createRadialGradient(x, y, 0, x, y, R);
      gr.addColorStop(0, 'rgba(128,122,74,.34)'); gr.addColorStop(.55, 'rgba(128,122,74,.13)'); gr.addColorStop(1, 'rgba(128,122,74,0)');
      g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, R, R*(k === 1 ? 1.35 : 1), 0, 0, TAU); g.fill();
    }
  }
  g.restore();
}
function grLinhas(g, liso){                                // as linhas de cal (a bola bate na beira de fora da linha de fora)
  const {x0, y0, x1, y1} = LINHAS, M = MARCAS, c = M.circulo, e = U(LINHA_E), m = e/2;
  const cal = liso ? GRAMA.cal : arTinta(g, GRAMA.cal, 53);
  g.save(); g.lineWidth = e; g.lineCap = 'butt'; g.lineJoin = 'miter'; g.strokeStyle = cal; g.fillStyle = cal;
  if (!liso) g.globalAlpha = .93;
  g.strokeRect(x0 + m, y0 + m, x1 - x0 - e, y1 - y0 - e);                          // a linha de fora
  g.fillRect(CX - m, y0 + e, e, y1 - y0 - 2*e);                                    // o meio-campo (atravessa o círculo)
  g.beginPath(); g.arc(CX, CY, c - m, 0, TAU); g.stroke();
  g.beginPath(); g.arc(CX, CY, U(.42), 0, TAU); g.fill();                          // a marca do meio
  for (const s of [-1, 1]){
    const xg = s < 0 ? x0 : x1;
    for (const [w, h] of [[M.areaW, M.areaH], [M.pequenaW, M.pequenaH]]){          // a grande área e a pequena
      const xf = xg - s*(w - m), ya = CY - h/2 + m, yb = CY + h/2 - m;
      g.beginPath(); g.moveTo(xg, ya); g.lineTo(xf, ya); g.lineTo(xf, yb); g.lineTo(xg, yb); g.stroke();
    }
    g.beginPath(); g.arc(xg - s*M.penalti, CY, U(.42), 0, TAU); g.fill();         // a marca do pênalti
    const rl = M.luaR - m, xc = xg - s*M.luaC, a = Math.acos(Math.max(-1, Math.min(1, (M.areaW - m - M.luaC)/rl)));   // a meia-lua (só por fora da área)
    g.beginPath(); if (s < 0) g.arc(xc, CY, rl, -a, a); else g.arc(xc, CY, rl, Math.PI - a, Math.PI + a); g.stroke();
    for (const sy of [-1, 1]){                                                     // o arco do escanteio
      const yc = sy < 0 ? y0 : y1, a0 = s < 0 ? (sy < 0 ? 0 : -Math.PI/2) : (sy < 0 ? Math.PI/2 : Math.PI);
      g.beginPath(); g.arc(xg, yc, U(1.6), a0, a0 + Math.PI/2); g.stroke();
    }
  }
  g.restore();
}
function grBandeirinhas(g){                                // as bandeirinhas de escanteio (o pau e o pano amarelo, virado para fora)
  const {x0, y0, x1, y1} = LINHAS;
  for (const [x, y, sx, sy] of [[x0, y0, -1, -1], [x1, y0, 1, -1], [x0, y1, -1, 1], [x1, y1, 1, 1]]){
    g.save(); g.translate(x, y);
    g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(U(.25), U(.32), U(.2), U(.14), 0, 0, TAU); g.fill();
    g.beginPath(); g.moveTo(0, 0); g.lineTo(sx*U(.95), sy*U(.12)); g.lineTo(sx*U(.25), sy*U(.75)); g.closePath();
    g.fillStyle = '#f4c51f'; g.fill(); g.lineWidth = U(.07); g.strokeStyle = '#16181a'; g.stroke();
    g.beginPath(); g.arc(0, 0, U(.16), 0, TAU); g.fillStyle = '#f2efe6'; g.fill(); g.stroke();
    g.restore();
  }
}
function grPlacas(g, r, leve){                             // as placas em volta do gramado: em cima de frente (com o nome), nos outros lados vistas de cima
  const mu = U(AR_MURETA), ph = U(GR_PLACA), xa = GL - mu, xb = GR + mu, P = GRAMA.placas;
  let k = Math.floor(r()*P.length), x = xa;
  g.save(); g.textAlign = 'center'; g.textBaseline = 'middle';
  while (x < xb){                                          // de frente, em cima
    const w = Math.min(xb - x, U(8.5 + r()*3)), [fundo, letra, nome] = P[k++ % P.length], y = GT - ph;
    g.fillStyle = fundo; g.fillRect(x, y, w, ph);
    if (!leve && w > U(3)){
      let fs = ph*.62; g.font = Math.round(fs) + 'px ' + FONT;
      const tw = g.measureText(nome).width; if (tw > w*.86){ fs *= w*.86/tw; g.font = Math.round(fs) + 'px ' + FONT; }
      g.fillStyle = letra; g.fillText(nome, x + w/2, y + ph*.54);
    }
    g.fillStyle = 'rgba(255,255,255,.22)'; g.fillRect(x, y, w, U(.12));             // o brilho em cima
    g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(x + w - U(.08), y, U(.08), ph);       // a emenda
    x += w;
  }
  g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(xa, GT - U(.1), xb - xa, U(.1));       // o pé da placa no gramado
  const faixa = (x0, y0, w, h, vertical) => {               // vistas de cima: a fila de placas, uma cor por placa
    let p = vertical ? y0 : x0; const fim = vertical ? y0 + h : x0 + w;
    while (p < fim){
      const L = Math.min(fim - p, U(8 + r()*3)), [fundo] = P[k++ % P.length];
      g.fillStyle = fundo; if (vertical) g.fillRect(x0, p, w, L); else g.fillRect(p, y0, L, h);
      p += L;
    }
    g.fillStyle = 'rgba(0,0,0,.32)'; if (vertical) g.fillRect(x0 + (x0 < CX ? 0 : w - U(.1)), y0, U(.1), h); else g.fillRect(x0, y0 + h - U(.1), w, U(.1));
  };
  faixa(xa, GB, xb - xa, mu, false);                        // embaixo
  faixa(xa, GT, mu, GB - GT, true); faixa(GR, GT, mu, GB - GT, true);   // atrás dos gols
  g.restore();
}
function grPessoaFrente(g, r, x, y, s, camisa, leve){      // a torcida de cima, vista de frente (o tronco e a cabeça; às vezes os braços pra cima)
  if (leve){ g.fillStyle = camisa; g.beginPath(); g.arc(x, y, s*.3, 0, TAU); g.fill(); return; }
  const pele = pick(r, GRAMA.pele);
  if (r() < .28){ g.strokeStyle = pele; g.lineWidth = s*.12; g.lineCap = 'round'; g.beginPath(); g.moveTo(x - s*.24, y); g.lineTo(x - s*.4, y - s*.55); g.moveTo(x + s*.24, y); g.lineTo(x + s*.4, y - s*.55); g.stroke(); }
  rr(g, x - s*.3, y - s*.08, s*.6, s*.5, s*.16); g.fillStyle = camisa; g.fill(); g.lineWidth = s*.05; g.strokeStyle = 'rgba(10,11,12,.75)'; g.stroke();
  g.beginPath(); g.arc(x, y - s*.26, s*.19, 0, TAU); g.fillStyle = pele; g.fill(); g.stroke();
  g.beginPath(); g.arc(x, y - s*.3, s*.19, Math.PI*1.08, Math.PI*1.92); g.fillStyle = pick(r, GRAMA.cabelo); g.fill();
}
function grPessoaCima(g, r, x, y, s, camisa, deitado, leve){   // vista de cima (de costas para a câmera): os ombros e a cabeça
  if (leve){ g.fillStyle = camisa; g.beginPath(); g.arc(x, y, s*.3, 0, TAU); g.fill(); return; }
  g.fillStyle = camisa; g.beginPath(); if (deitado) g.ellipse(x, y, s*.22, s*.42, 0, 0, TAU); else g.ellipse(x, y, s*.42, s*.22, 0, 0, TAU); g.fill();
  g.lineWidth = s*.05; g.strokeStyle = 'rgba(10,11,12,.75)'; g.stroke();
  g.beginPath(); g.arc(x, y, s*.18, 0, TAU); g.fillStyle = r() < .2 ? pick(r, GRAMA.pele) : pick(r, GRAMA.cabelo); g.fill(); g.stroke();
}
function grArquibancada(g, r, leve){                       // a arquibancada: os degraus atrás dos gols, as fileiras de cima e de baixo
  const mu = U(AR_MURETA), dg = U(GR_DEGRAU), t0 = skinDoTime(0).cor, t1 = skinDoTime(1).cor, torc = !!opc.torc;
  for (const lado of [-1, 1]){                              // atrás dos gols: os degraus de concreto (a sombra de cada um)
    const fim = lado < 0 ? 0 : MW;
    for (let d = 0, i = 0; i < 40; d += dg, i++){
      const a = arLadoX(lado, d), b = arLadoX(lado, d + dg), x = Math.max(0, Math.min(a, b)), w = Math.min(MW, Math.max(a, b)) - x;
      if (w > 0){ g.fillStyle = GRAMA.degrau[i & 1]; g.fillRect(x, 0, w, MH); }
      g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(lado < 0 ? a - U(.16) : a, 0, U(.16), MH);   // o espelho do degrau (a sombra na beira de cada um)
      if (b <= 0 || b >= MW || Math.abs(b - fim) < 1) break;
    }
  }
  const yTopo = GT - U(GR_PLACA), xa = GL - mu, xb = GR + mu;   // em cima: o concreto atrás das fileiras
  g.fillStyle = '#3c4349'; g.fillRect(xa, 0, xb - xa, yTopo);
  g.fillStyle = '#353b41'; g.fillRect(xa, GB + mu, xb - xa, MH - GB - mu);
  const cadeiras = (x0, x1, y, s, frente) => {              // sem torcedores: as cadeiras de plástico na cor de cada lado
    for (let x = x0 + s*.5; x < x1; x += s*.8){ g.fillStyle = corMix(x < CX ? t0 : t1, '#22272b', .45); rr(g, x - s*.28, y - (frente ? s*.3 : s*.18), s*.56, frente ? s*.45 : s*.36, s*.1); g.fill(); }
  };
  const s = U(.95), filas = [];
  for (let y = yTopo - s*.42; y > -s*.5; y -= s*.86) filas.push(y);
  filas.reverse().forEach((y, fila) => {                   // em cima, de frente: de trás para a frente (a de baixo fica na frente)
    g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(xa, y + s*.38, xb - xa, s*.08);   // o degrau
    if (!torc){ cadeiras(xa, xb, y, s, true); return; }
    for (let x = xa + s*(.45 + (fila & 1)*.4); x < xb - s*.2; x += s*(.7 + r()*.22)){
      if (r() < .07) continue;
      grPessoaFrente(g, r, x, y + (r() - .5)*s*.08, s*(.94 + r()*.12), pick(r, grCamisas(x < CX ? t0 : t1)), leve);
    }
  });
  for (let y = GB + mu + U(1.15), fila = 0; y < MH + s*.4; y += s*.95, fila++){   // embaixo, de cima (de costas para a câmera)
    if (!torc){ cadeiras(xa, xb, y, s, false); continue; }
    for (let x = xa + s*(.4 + (fila & 1)*.4); x < xb - s*.2; x += s*(.72 + r()*.2)){
      if (r() < .08 || (Math.abs(x - CX) < U(9.4) && y < GB + mu + U(1.9))) continue;   // (o banco de reservas fica na frente, no meio)
      grPessoaCima(g, r, x, y + (r() - .5)*s*.1, s, pick(r, grCamisas(x < CX ? t0 : t1)), false, leve);
    }
  }
  if (!torc) return;
  for (const lado of [-1, 1]){                              // atrás dos gols, lá no fundo: mais gente (perto da grade quem desenha é a arGalera)
    const cor = lado < 0 ? t0 : t1;
    for (let d = 5.85; ; d += GR_DEGRAU){
      const x = arLadoX(lado, U(d)); if (x < -U(.5) || x > MW + U(.5)) break;
      for (let y = U(1 + r()*.5); y < MH - U(.6); y += U(1.05 + r()*.25)) if (r() > .06) grPessoaCima(g, r, x + (r() - .5)*U(.3), y, s, pick(r, grCamisas(cor)), true, leve);
    }
  }
}
function grBanco(g, leve){                                 // o banco de reservas: a cobertura de acrílico e os bancos, dos dois lados do meio
  const y0 = GB + U(AR_MURETA) + U(.12), w = U(7.2), h = U(1.75);
  for (const s of [-1, 1]){
    const x0 = CX + s*U(1.6) - (s < 0 ? w : 0);
    g.fillStyle = 'rgba(0,0,0,.4)'; rr(g, x0 + U(.2), y0 + U(.25), w, h, U(.5)); g.fill();
    g.fillStyle = '#2b3136'; rr(g, x0, y0, w, h, U(.5)); g.fill();
    if (!leve) for (let i = 0; i < 6; i++){ g.fillStyle = skinDoTime(s < 0 ? 0 : 1).cor; rr(g, x0 + U(.45) + i*(w - U(.9))/6, y0 + U(.32), (w - U(.9))/6 - U(.16), U(.62), U(.12)); g.fill(); }
    g.fillStyle = 'rgba(190,225,240,.22)'; rr(g, x0, y0, w, h, U(.5)); g.fill();
    g.lineWidth = U(.1); g.strokeStyle = 'rgba(225,240,250,.6)'; g.stroke();
    g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(x0 + U(.5), y0 + U(.18), w - U(1), U(.1));
  }
}
function gramadoDesenha(g, leve){                          // o ESTÁDIO (leve = a prévia pequena do JOGAR)
  const r = estRnd(4747);
  g.fillStyle = GRAMA.fundo; g.fillRect(0, 0, MW, MH);
  grArquibancada(g, r, leve);
  if (opc.torc){ const ra = estRnd(5151); arGalera(g, ra, -1, skinDoTime(0).cor, leve); arGalera(g, ra, 1, skinDoTime(1).cor, leve); }   // a galera na grade, com o bandeirão
  grGrama(g, estRnd(9090), leve);
  grLinhas(g, leve);
  if (!mdSemGol()) for (const s of [-1, 1]) estGolChao(g, s);   // a sombra dos gols
  grPlacas(g, estRnd(3131), leve);
  grBanco(g, leve);
  if (!leve){ grBandeirinhas(g); arLuz(g); }
  arRefletores(g, leve);
}
function gramadoPlano(g){                                  // Ultra leve: as cores lisas, as listras, as linhas e a sombra dos gols
  g.fillStyle = GRAMA.fundo; g.fillRect(0, 0, MW, MH);
  grListras(g, GL, GT, GR - GL, GB - GT, true);
  grLinhas(g, true);
  if (!mdSemGol()) for (const s of [-1, 1]) estGolChao(g, s);
  const mu = U(AR_MURETA); g.fillStyle = '#e8e2d2';
  g.fillRect(GL - mu, GT - mu, GR - GL + 2*mu, mu); g.fillRect(GL - mu, GB, GR - GL + 2*mu, mu); g.fillRect(GL - mu, GT, mu, GB - GT); g.fillRect(GR, GT, mu, GB - GT);
}
const desenhaEstadioAntes702 = desenhaEstadio;
desenhaEstadio = function(g, leve){
  if (CAMPO.grama){ try { gramadoDesenha(g, !!leve); return; } catch (e) { window.RUA_GRAMADO_ERRO = String(e && e.stack); } }
  return desenhaEstadioAntes702(g, leve);
};
const campoPlanoAntes702 = campoPlano;
campoPlano = function(g){
  if (CAMPO.grama){ try { gramadoPlano(g); return; } catch (e) { window.RUA_GRAMADO_ERRO = String(e && e.stack); } }
  return campoPlanoAntes702(g);
};

/* ---------------------------------------------------------------- 3) a bola sem efeitos */
trilhaDesenha = function(){};                              // sem o rastro neon (no jogo e no replay)
desenhaRespingos = function(){ RESP.length = 0; };         // sem o respingo de tinta e o estalo do chute
X49.ball = 'classic';                                      // a bola é sempre a clássica (a cor da bola saiu de EFEITOS)
SK_EFEITOS.length = 0; for (const e of V702_TODOS.sk) if (e[0] !== 'ball') SK_EFEITOS.push(e);

/* ---------------------------------------------------------------- 4) a Seta da direção começa desligada */
try {
  if (!localStorage.getItem(V702.chaveDir)){ opc.dir = false; salvar(); localStorage.setItem(V702.chaveDir, '1'); }
} catch (_) { opc.dir = false; }
try { syncPanel(); } catch (_) {}
try { ajxSync(); } catch (_) {}

v702Aplica();
v702CampoTreino();
try { x49Save(); } catch (_) {}
