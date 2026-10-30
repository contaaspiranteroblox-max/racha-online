/* =====================================================================================================================
   RACHA v92 · OFICINA — O DESENHO DOS MAPAS (tools/oficina/desenho.js)
   Um desenho só para o editor, o TESTAR, a partida online e as miniaturas: o fundo, o piso (cor, textura), as linhas do
   campo, os objetos (por camada, com o estado da partida: ligado, aberto, apertado, a posição de quem se move) e a luz.
   Tudo em px do mundo (o mesmo do jogo); quem chama põe a transformação da câmera no contexto.
   O que não muda na partida (o fundo, o piso, as linhas e os objetos parados) vira uma imagem pronta (DES.pronto), do
   tamanho da tela: por quadro só os objetos que mudam, as tampinhas e a bola.
   ===================================================================================================================== */
const PISOS = {
  grama: { nome: 'Grama tradicional', cor1: '#2f8f4e', cor2: '#2a8045', textura: 'listras', escala: 6 },
  grama_escura: { nome: 'Grama escura', cor1: '#1f6b3a', cor2: '#1a5f33', textura: 'listras', escala: 6 },
  grama_clara: { nome: 'Grama clara', cor1: '#4cb36a', cor2: '#44a35f', textura: 'listras', escala: 5 },
  sintetica: { nome: 'Grama sintética', cor1: '#2fae5a', cor2: '#29a052', textura: 'grade', escala: 4 },
  concreto: { nome: 'Concreto', cor1: '#8f8b80', cor2: '#7f7b72', textura: 'ruido', escala: 5 },
  asfalto: { nome: 'Asfalto', cor1: '#3d3f45', cor2: '#2f3136', textura: 'ruido', escala: 4 },
  quadra: { nome: 'Quadra (madeira)', cor1: '#c98a4b', cor2: '#b9783d', textura: 'listras', escala: 2 },
  areia: { nome: 'Areia', cor1: '#e3c98d', cor2: '#d2b679', textura: 'ruido', escala: 3 },
  neon: { nome: 'Neon', cor1: '#120a2e', cor2: '#2a1466', textura: 'grade', escala: 5 },
  futurista: { nome: 'Futurista', cor1: '#0d1b3d', cor2: '#1c3474', textura: 'hexagonos', escala: 5 },
  personalizado: { nome: 'Personalizado' },
};
const NOMES_TEXTURA = { listras: 'Listras', xadrez: 'Xadrez', liso: 'Liso', ruido: 'Granulado', grade: 'Grade', ondas: 'Ondas', hexagonos: 'Hexágonos', circulos: 'Círculos' };
const NOMES_FUNDO = { liso: 'Liso', gradiente: 'Degradê', arquibancada: 'Arquibancada', rua: 'Rua', noite: 'Noite estrelada', neon: 'Neon' };
const NOMES_LUZ = { dia: 'Dia', tarde: 'Fim de tarde', noite: 'Noite (refletores)', neon: 'Neon' };

/* ---------------------------------------------------------------- as cores */
function rgb(hex) { const n = parseInt(String(hex || '#ffffff').slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
const rgba = (hex, a) => { const c = rgb(hex); return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; };
function mistura(hex, alvo, f) { const a = rgb(hex), b = rgb(alvo); return '#' + a.map((v, i) => Math.round(v + (b[i] - v) * f).toString(16).padStart(2, '0')).join(''); }
const clareia = (hex, f) => mistura(hex, '#ffffff', f), escurece = (hex, f) => mistura(hex, '#000000', f);
const corTime = (M, t) => t >= 0 && M.partida.times[t] ? M.partida.times[t].cor : '#f5c542';

/* ---------------------------------------------------------------- as texturas (um ladrilho pronto vira padrão) */
const LADRILHOS = new Map();
function ladrilho(tex, c1, c2, lado) {               // o desenho repetido do piso: lado = o tamanho do ladrilho em px da tela
  const k = tex + c1 + c2 + (lado | 0);
  if (LADRILHOS.has(k)) return LADRILHOS.get(k);
  const L = Math.max(4, Math.min(512, Math.round(lado))), cv = document.createElement('canvas'); cv.width = cv.height = L * 2;
  const g = cv.getContext('2d'); g.fillStyle = c1; g.fillRect(0, 0, L * 2, L * 2); g.fillStyle = c2; g.strokeStyle = c2;
  switch (tex) {
    case 'listras': g.fillRect(L, 0, L, L * 2); break;
    case 'xadrez': g.fillRect(L, 0, L, L); g.fillRect(0, L, L, L); break;
    case 'grade': g.lineWidth = Math.max(1, L * .06); g.strokeRect(0, 0, L, L); g.strokeRect(L, 0, L, L); g.strokeRect(0, L, L, L); g.strokeRect(L, L, L, L); break;
    case 'ruido': { let s = 1234567; const r = () => (s = (s * 16807) % 2147483647) / 2147483647; for (let i = 0; i < L * 1.6; i++) { g.globalAlpha = .25 + r() * .5; g.fillRect(r() * L * 2, r() * L * 2, 1 + r() * L * .08, 1 + r() * L * .08); } g.globalAlpha = 1; break; }
    case 'ondas': g.lineWidth = L * .34; g.beginPath(); for (let x = 0; x <= L * 2; x += 2) g.lineTo(x, L * .5 + Math.sin(x / L * Math.PI) * L * .25); g.stroke(); g.beginPath(); for (let x = 0; x <= L * 2; x += 2) g.lineTo(x, L * 1.5 + Math.sin(x / L * Math.PI) * L * .25); g.stroke(); break;
    case 'hexagonos': { g.lineWidth = Math.max(1, L * .07); const r = L / 1.732; const hx = (cx, cy) => { g.beginPath(); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + Math.PI / 6; g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); } g.closePath(); g.stroke(); }; for (const [x, y] of [[0, 0], [L, 0], [2 * L, 0], [L / 2, L], [1.5 * L, L], [0, 2 * L], [L, 2 * L], [2 * L, 2 * L]]) hx(x, y); break; }
    case 'circulos': g.lineWidth = Math.max(1, L * .12); for (const [x, y] of [[L / 2, L / 2], [1.5 * L, L / 2], [L / 2, 1.5 * L], [1.5 * L, 1.5 * L]]) { g.beginPath(); g.arc(x, y, L * .32, 0, TAU); g.stroke(); } break;
  }
  if (LADRILHOS.size > 40) LADRILHOS.clear();
  LADRILHOS.set(k, cv);
  return cv;
}

/* ---------------------------------------------------------------- os pedaços do desenho */
const DES = {};
function caminhoPoli(g, pts) { g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath(); }
DES.fundo = function (g, M, G) {
  const A = M.aparencia, c = A.corFundo || '#1d2326';
  g.fillStyle = c; g.fillRect(-G.MW, -G.MH, G.MW * 3, G.MH * 3);
  if (A.fundo === 'gradiente') { const gr = g.createLinearGradient(0, 0, 0, G.MH); gr.addColorStop(0, clareia(c, .18)); gr.addColorStop(1, escurece(c, .45)); g.fillStyle = gr; g.fillRect(-G.MW, -G.MH, G.MW * 3, G.MH * 3); }
  else if (A.fundo === 'noite') { let s = 99; const r = () => (s = (s * 16807) % 2147483647) / 2147483647; g.fillStyle = '#ffffff'; for (let i = 0; i < 140; i++) { g.globalAlpha = .2 + r() * .6; const x = r() * G.MW, y = r() * G.MH, t = 1 + r() * 3; g.fillRect(x, y, t, t); } g.globalAlpha = 1; }
  else if (A.fundo === 'neon') { g.strokeStyle = 'rgba(54,242,255,.16)'; g.lineWidth = 3; for (let x = 0; x < G.MW; x += U(4)) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, G.MH); g.stroke(); } for (let y = 0; y < G.MH; y += U(4)) { g.beginPath(); g.moveTo(0, y); g.lineTo(G.MW, y); g.stroke(); } }
  else if (A.fundo === 'arquibancada' || A.fundo === 'rua') {
    const torc = A.fundo === 'arquibancada', faixa = U(3.2), cores = torc ? [corTime(M, 0), corTime(M, 1), '#f3efe4', '#2a2f3a', '#d9d3c4'] : ['#6b5a4a', '#8c7b66', '#a8977e', '#4d4339'];
    let s = 7; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
    const borda = (x0, y0, x1, y1) => {              // os degraus (ou as casas) em volta da área do jogo
      for (let y = y0; y < y1; y += faixa) for (let x = x0; x < x1; x += torc ? U(1.4) : U(5 + r() * 4)) {
        g.fillStyle = cores[Math.floor(r() * cores.length)];
        if (torc) { g.beginPath(); g.arc(x + U(.7), y + faixa * .55, U(.5), 0, TAU); g.fill(); }
        else g.fillRect(x, y, U(4 + r() * 3), faixa * .9);
      }
    };
    const m = U(1.5);
    borda(0, 0, G.MW, G.GT - m); borda(0, G.GB + m, G.MW, G.MH); borda(0, G.GT - m, G.GL - m, G.GB + m); borda(G.GR + m, G.GT - m, G.MW, G.GB + m);
  }
};
DES.piso = function (g, M, G, escala) {
  const A = M.aparencia, x0 = G.GL, y0 = G.GT, w = G.GR - G.GL, hh = G.GB - G.GT;
  const lado = Math.max(4, U(A.escala) * (escala || 1));
  g.save();
  g.beginPath(); g.rect(x0, y0, w, hh); g.clip();
  if (A.textura === 'liso') { g.fillStyle = A.cor1; g.fillRect(x0, y0, w, hh); }
  else {
    const lad = ladrilho(A.textura, A.cor1, A.cor2, lado), pat = g.createPattern(lad, 'repeat');
    if (pat && pat.setTransform && typeof DOMMatrix === 'function') { const s = 1 / (escala || 1); pat.setTransform(new DOMMatrix([s, 0, 0, s, G.CX, G.CY])); }
    g.fillStyle = pat || A.cor1; g.fillRect(x0, y0, w, hh);
  }
  if (A.piso === 'neon' || A.piso === 'futurista') { const gr = g.createRadialGradient(G.CX, G.CY, 0, G.CX, G.CY, Math.max(w, hh) * .6); gr.addColorStop(0, rgba(A.piso === 'neon' ? '#ff3df2' : '#36a8ff', .16)); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x0, y0, w, hh); }
  if (A.piso === 'areia') { let s = 3; const r = () => (s = (s * 16807) % 2147483647) / 2147483647; g.fillStyle = 'rgba(120,90,40,.12)'; for (let i = 0; i < 260; i++) { g.beginPath(); g.arc(x0 + r() * w, y0 + r() * hh, U(.15 + r() * .4), 0, TAU); g.fill(); } }
  // fora do contorno (o campo redondo, octogonal, livre…): a área do jogador fica mais escura
  if (G.contorno && !(M.campo.forma === 'retangulo' || M.campo.forma === 'quadrado')) {
    g.beginPath(); g.rect(x0, y0, w, hh); caminhoPoli(g, G.contorno.slice().reverse()); g.fillStyle = 'rgba(0,0,0,.28)'; g.fill('evenodd');
  }
  g.restore();
};
function areaGol(g, gl) {                            // a área do goleiro: a mesma caixa que as regras do goleiro usam (gl.area, do motor)
  const A = gl.area, ux = gl.ux, uy = gl.uy, nx = -gl.nx, ny = -gl.ny, c = [gl.cx, gl.cy];
  const a = [c[0] - ux * A.meia, c[1] - uy * A.meia], b = [c[0] + ux * A.meia, c[1] + uy * A.meia];
  g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(a[0] + nx * A.prof, a[1] + ny * A.prof); g.lineTo(b[0] + nx * A.prof, b[1] + ny * A.prof); g.lineTo(b[0], b[1]); g.stroke();
}
DES.linhas = function (g, M, G) {
  const L = M.aparencia.linhas, P = M.partida, regra = P.areaGol && P.areaGol !== 'livre' || !!P.goleiroPreso;   // (com as regras do goleiro, a área aparece sempre)
  if (!L.on && !regra) return;
  const esp = U(L.esp);
  g.save(); g.strokeStyle = L.cor; g.fillStyle = L.cor; g.lineWidth = esp; g.lineJoin = 'round'; g.lineCap = 'round';
  if (M.aparencia.piso === 'neon') { g.shadowColor = L.cor; g.shadowBlur = esp * 3; }
  if (!L.on) { for (const gl of G.gols) if (gl.dono >= 0 && gl.area) areaGol(g, gl); g.restore(); return; }
  if (L.laterais && G.contorno) { caminhoPoli(g, G.contorno); g.stroke(); }
  if (L.meio && P.equipes === 2 && G.contorno && M.campo.forma !== 'livre') {
    g.save(); caminhoPoli(g, G.contorno); g.clip(); g.beginPath(); g.moveTo(G.bola0.x, G.GT - 50); g.lineTo(G.bola0.x, G.GB + 50); g.stroke(); g.restore();
  }
  if (L.centro && M.campo.forma !== 'livre') { g.beginPath(); g.arc(G.bola0.x, G.bola0.y, Math.max(U(2), U(P.raioSaida)), 0, TAU); g.stroke(); g.beginPath(); g.arc(G.bola0.x, G.bola0.y, esp * 1.3, 0, TAU); g.fill(); }
  // as áreas na frente de cada gol (a do goleiro e a grande, com a marca do pênalti)
  for (const gl of G.gols) {
    const fundo = (prof, larg) => { const ux = gl.ux, uy = gl.uy, nx = -gl.nx, ny = -gl.ny, c = [gl.cx, gl.cy];
      const a = [c[0] - ux * larg / 2, c[1] - uy * larg / 2], b = [c[0] + ux * larg / 2, c[1] + uy * larg / 2];
      g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(a[0] + nx * prof, a[1] + ny * prof); g.lineTo(b[0] + nx * prof, b[1] + ny * prof); g.lineTo(b[0], b[1]); g.stroke(); };
    if (L.areas || (regra && gl.dono >= 0)) { if (gl.area) areaGol(g, gl); else fundo(Math.min(U(5), G.w * .08), gl.larg + U(6)); }
    if (L.penalti) { const pr = Math.min(U(11), G.w * .16); fundo(pr, gl.larg + U(16)); g.beginPath(); g.arc(gl.cx - gl.nx * pr * .72, gl.cy - gl.ny * pr * .72, esp * 1.2, 0, TAU); g.fill(); }
  }
  g.restore();
};
DES.luz = function (g, M, G) {
  const l = M.aparencia.luz; if (l === 'dia') return;
  g.save();
  if (l === 'tarde') { g.fillStyle = 'rgba(255,140,40,.13)'; g.fillRect(-G.MW, -G.MH, G.MW * 3, G.MH * 3); }
  else if (l === 'noite') { const gr = g.createRadialGradient(G.CX, G.CY, Math.min(G.w, G.h) * .25, G.CX, G.CY, Math.max(G.MW, G.MH) * .75); gr.addColorStop(0, 'rgba(0,0,20,0)'); gr.addColorStop(1, 'rgba(0,0,20,.55)'); g.fillStyle = gr; g.fillRect(-G.MW, -G.MH, G.MW * 3, G.MH * 3); }
  else if (l === 'neon') { const gr = g.createRadialGradient(G.CX, G.CY, 0, G.CX, G.CY, Math.max(G.MW, G.MH) * .7); gr.addColorStop(0, 'rgba(60,0,90,0)'); gr.addColorStop(1, 'rgba(20,0,50,.5)'); g.fillStyle = gr; g.fillRect(-G.MW, -G.MH, G.MW * 3, G.MH * 3); }
  g.restore();
};

/* ---------------------------------------------------------------- os objetos */
const ORDEM_CAMADA = id => { const i = RM.CAMADAS.findIndex(c => c.id === id); return i < 0 ? 5 : i; };
function camadasDoMapa(M) {                          // a ordem e o estado das camadas (a ordem do mapa manda)
  const l = (M.camadas && M.camadas.length ? M.camadas : RM.CAMADAS.map(c => ({ id: c.id, visivel: true, bloqueada: false })));
  const pos = new Map(l.map((c, i) => [c.id, i]));
  return { pos, vis: new Map(l.map(c => [c.id, c.visivel])), bloq: new Map(l.map(c => [c.id, c.bloqueada])) };
}
function objetosEmOrdem(M) {
  const cm = camadasDoMapa(M);
  return M.objetos.map((o, i) => ({ o, i, k: (cm.pos.has(o.camada) ? cm.pos.get(o.camada) : 5) * 10000 + i })).sort((a, b) => a.k - b.k);
}
const SIMBOLO_ZONA = { velocidade: '»', lentidao: '≈', impulso: '➜', gravidade: '◎', esteira: '⇉', rampa: '⟋', pontos: '+', reinicio: '↺', elimina: '✖', nada: '' };
function icDecor(g, icone, r) {                        // os ícones da decoração (desenhados, sem imagem de fora)
  g.beginPath();
  switch (icone) {
    case 'estrela': for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * .45 : r; g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } g.closePath(); break;
    case 'coracao': g.moveTo(0, r * .9); g.bezierCurveTo(-r * 1.3, 0, -r * .7, -r * 1.1, 0, -r * .35); g.bezierCurveTo(r * .7, -r * 1.1, r * 1.3, 0, 0, r * .9); break;
    case 'raio': g.moveTo(r * .2, -r); g.lineTo(-r * .6, r * .15); g.lineTo(-r * .05, r * .15); g.lineTo(-r * .25, r); g.lineTo(r * .6, -r * .2); g.lineTo(r * .05, -r * .2); g.closePath(); break;
    case 'coroa': g.moveTo(-r, r * .6); g.lineTo(-r, -r * .5); g.lineTo(-r * .45, 0); g.lineTo(0, -r * .8); g.lineTo(r * .45, 0); g.lineTo(r, -r * .5); g.lineTo(r, r * .6); g.closePath(); break;
    case 'bola': g.arc(0, 0, r, 0, TAU); break;
    case 'seta': g.moveTo(-r, -r * .3); g.lineTo(r * .2, -r * .3); g.lineTo(r * .2, -r * .8); g.lineTo(r, 0); g.lineTo(r * .2, r * .8); g.lineTo(r * .2, r * .3); g.lineTo(-r, r * .3); g.closePath(); break;
    case 'chama': g.moveTo(0, -r); g.bezierCurveTo(r * .9, -r * .2, r * .8, r * .9, 0, r); g.bezierCurveTo(-r * .8, r * .9, -r * .9, -r * .1, -r * .1, -r * .3); g.bezierCurveTo(0, -r * .5, -r * .1, -r * .8, 0, -r); break;
    case 'caveira': g.arc(0, -r * .1, r * .8, Math.PI * .9, Math.PI * 2.1); g.lineTo(r * .45, r * .9); g.lineTo(-r * .45, r * .9); g.closePath(); break;
    case 'trofeu': g.moveTo(-r * .7, -r); g.lineTo(r * .7, -r); g.lineTo(r * .5, -r * .1); g.lineTo(r * .15, r * .2); g.lineTo(r * .15, r * .6); g.lineTo(r * .5, r * .6); g.lineTo(r * .5, r); g.lineTo(-r * .5, r); g.lineTo(-r * .5, r * .6); g.lineTo(-r * .15, r * .6); g.lineTo(-r * .15, r * .2); g.lineTo(-r * .5, -r * .1); g.closePath(); break;
    case 'nota': g.arc(-r * .35, r * .55, r * .38, 0, TAU); g.moveTo(-r * .02, r * .55); g.lineTo(-r * .02, -r); g.lineTo(r * .7, -r * .6); g.lineTo(r * .7, -r * .3); g.lineTo(r * .05, -r * .65); break;
    case 'flor': for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; g.moveTo(Math.cos(a) * r * .55 + r * .38, Math.sin(a) * r * .55); g.arc(Math.cos(a) * r * .55, Math.sin(a) * r * .55, r * .38, 0, TAU); } break;
    case 'lua': g.arc(0, 0, r, Math.PI * .3, Math.PI * 1.7); g.arc(r * .4, 0, r * .75, Math.PI * 1.55, Math.PI * .45, true); g.closePath(); break;
    default: g.arc(0, 0, r, 0, TAU);
  }
}
// o estado de um objeto para desenhar: o do mapa (no editor) ou o da partida
function estadoDe(P, i, o) {
  if (!P) return { on: o.ativo, vis: true, aberto: !!o.aberto, ligado: !!o.ligado, press: false, T: null, cor: '' };
  return RM.estadoObjeto(P, i);
}
// a sombra das peças sólidas: dura e deslocada como as do jogo (o sol do alto, à esquerda: cai para a direita e para baixo)
function sombraPeca(g, rot, desenha) {
  const sx = U(.24), sy = U(.34), c = Math.cos(rot), s = Math.sin(rot);
  g.save(); g.translate(sx * c + sy * s, -sx * s + sy * c); g.globalAlpha *= .32; g.fillStyle = g.strokeStyle = '#05060c'; g.setLineDash([]); desenha(); g.restore();
}
DES.objeto = function (g, M, G, o, i, est, opc) {
  opc = opc || {};
  const T = est.T && (est.T.dx || est.T.dy || est.T.da) ? est.T : null;
  if (!est.vis && !opc.editor) return;
  if (!est.on && !opc.editor && ['parede', 'arco', 'linha', 'obstaculo', 'portao', 'gol', 'portal', 'botao', 'interruptor'].indexOf(o.tipo) >= 0) return;
  const cx = G.CX + U(o.x) + (T ? T.dx : 0), cy = G.CY + U(o.y) + (T ? T.dy : 0), rot = o.rot * RAD + (T ? T.da : 0);
  const cor = est.cor || o.cor, fantasma = opc.editor && (!est.vis || !o.visivel);
  const sombra = !fantasma && est.on && o.colide !== 'nenhum' && !(M.aparencia && M.aparencia.sombras === false) && opc.sombras !== false;
  g.save();
  const some = est.temp > 0 && est.temp < 90 ? .45 + .55 * Math.abs(Math.sin(est.temp / 6)) : 1;   // (a barreira temporária pisca antes de sumir)
  g.globalAlpha = (o.opac == null ? 1 : o.opac) * (fantasma ? .4 : 1) * (!est.on && opc.editor ? .35 : 1) * some * (opc.alfa == null ? 1 : opc.alfa);
  g.translate(cx, cy); g.rotate(rot);
  const contorno = (lw) => { g.lineWidth = lw; g.strokeStyle = escurece(cor, .55); };
  switch (o.tipo) {
    case 'parede': case 'portao': {
      const L = U(o.comp), e = Math.max(U(o.esp), 3), aberto = o.tipo === 'portao' && est.aberto;
      g.lineCap = 'round';
      if (sombra && !aberto) sombraPeca(g, rot, () => { g.lineWidth = e + 4; g.beginPath(); g.moveTo(-L / 2, 0); g.lineTo(L / 2, 0); g.stroke(); });
      if (aberto) { g.setLineDash([e * 1.2, e * 1.4]); g.globalAlpha *= .45; }
      g.strokeStyle = escurece(cor, .55); g.lineWidth = e + 4; g.beginPath(); g.moveTo(-L / 2, 0); g.lineTo(L / 2, 0); g.stroke();
      g.strokeStyle = cor; g.lineWidth = e; g.stroke();
      if (o.tipo === 'portao' && !aberto) { g.strokeStyle = escurece(cor, .4); g.lineWidth = Math.max(2, e * .25); for (let x = -L / 2 + e; x < L / 2 - e * .5; x += e * 1.6) { g.beginPath(); g.moveTo(x, -e * .45); g.lineTo(x, e * .45); g.stroke(); } }
      if (o.colide === 'bola' || o.colide === 'jogadores' || o.colide === 'nenhum') { g.setLineDash([]); g.fillStyle = '#ffffff'; g.globalAlpha *= .8; g.font = '700 ' + Math.max(10, e * 1.6) + 'px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; if (opc.editor) g.fillText(o.colide === 'bola' ? '●' : o.colide === 'jogadores' ? '◆' : '∅', 0, 0); }
      break;
    }
    case 'arco': {
      const R = U(o.raio), e = Math.max(U(o.esp), 3), a0 = -o.abertura / 2 * RAD, a1 = o.abertura / 2 * RAD;
      if (sombra) sombraPeca(g, rot, () => { g.lineCap = 'round'; g.lineWidth = e + 4; g.beginPath(); g.arc(0, 0, R, a0, a1); g.stroke(); });
      g.lineCap = 'round'; g.beginPath(); g.arc(0, 0, R, a0, a1); g.strokeStyle = escurece(cor, .55); g.lineWidth = e + 4; g.stroke(); g.strokeStyle = cor; g.lineWidth = e; g.stroke();
      break;
    }
    case 'linha': {
      const e = Math.max(U(o.esp), 3); g.lineCap = 'round'; g.lineJoin = 'round';
      if (sombra) sombraPeca(g, rot, () => { g.lineWidth = e + 4; g.beginPath(); o.pontos.forEach((p, k) => k ? g.lineTo(U(p[0]), U(p[1])) : g.moveTo(U(p[0]), U(p[1]))); if (o.fechada) g.closePath(); g.stroke(); });
      g.beginPath(); o.pontos.forEach((p, k) => k ? g.lineTo(U(p[0]), U(p[1])) : g.moveTo(U(p[0]), U(p[1]))); if (o.fechada) g.closePath();
      g.strokeStyle = escurece(cor, .55); g.lineWidth = e + 4; g.stroke(); g.strokeStyle = cor; g.lineWidth = e; g.stroke();
      break;
    }
    case 'obstaculo': case 'decoracao': {
      if (o.tipo === 'decoracao' && o.forma === 'icone') { const r = U(Math.min(o.w, o.h) / 2); icDecor(g, o.icone, r); g.fillStyle = cor; g.fill(); if (o.contorno > 0) { g.lineWidth = U(o.contorno * .4); g.strokeStyle = o.cor2; g.stroke(); } break; }
      const pts = RM.poligonoDaForma(o.forma, o.w, o.h, o.pontos).map(p => [U(p[0]), U(p[1])]);
      if (o.tipo === 'obstaculo' && sombra) sombraPeca(g, rot, () => { caminhoPoli(g, pts); g.fill(); g.lineWidth = 4; g.stroke(); });
      caminhoPoli(g, pts);
      if (o.tipo === 'obstaculo') { const gr = g.createLinearGradient(0, -U(o.h / 2), 0, U(o.h / 2)); gr.addColorStop(0, clareia(cor, .18)); gr.addColorStop(1, escurece(cor, .22)); g.fillStyle = gr; }
      else g.fillStyle = cor;
      g.fill();
      if (o.textura === 'listras' || o.textura === 'pontos') {
        g.save(); g.clip(); g.fillStyle = o.tipo === 'decoracao' ? o.cor2 : 'rgba(255,255,255,.18)';
        const bb = RM.poligonoDaForma(o.forma, o.w, o.h, o.pontos).reduce((m, p) => Math.max(m, Math.abs(p[0]), Math.abs(p[1])), 1) * 19;
        if (o.textura === 'listras') for (let x = -bb; x < bb; x += U(1.2)) { g.save(); g.translate(x, 0); g.rotate(.6); g.fillRect(0, -bb * 2, U(.5), bb * 4); g.restore(); }
        else for (let x = -bb; x < bb; x += U(1)) for (let y = -bb; y < bb; y += U(1)) { g.beginPath(); g.arc(x, y, U(.18), 0, TAU); g.fill(); }
        g.restore();
      }
      if (o.tipo === 'obstaculo') { caminhoPoli(g, pts); contorno(4); g.stroke(); if (o.quique > 1) { g.strokeStyle = '#ffffff'; g.globalAlpha *= .7; g.lineWidth = 2; g.setLineDash([6, 5]); g.stroke(); } }
      else if (o.contorno > 0) { caminhoPoli(g, pts); g.lineWidth = U(o.contorno * .4); g.strokeStyle = o.cor2; g.stroke(); }
      break;
    }
    case 'marcacao': {
      g.strokeStyle = cor; g.fillStyle = cor; g.lineWidth = Math.max(2, U(o.esp)); g.lineCap = 'round';
      if (o.tracejada) g.setLineDash([U(1.2), U(.9)]);
      g.beginPath();
      if (o.forma === 'linha') { g.moveTo(-U(o.w / 2), 0); g.lineTo(U(o.w / 2), 0); g.stroke(); }
      else if (o.forma === 'circulo') { g.ellipse(0, 0, U(o.w / 2), U(o.h / 2), 0, 0, TAU); g.stroke(); }
      else if (o.forma === 'arco') { g.ellipse(0, 0, U(o.w / 2), U(o.h / 2), 0, -o.abertura / 2 * RAD, o.abertura / 2 * RAD); g.stroke(); }
      else if (o.forma === 'retangulo') { g.rect(-U(o.w / 2), -U(o.h / 2), U(o.w), U(o.h)); g.stroke(); }
      else { g.arc(0, 0, Math.max(3, U(o.esp) * 1.4), 0, TAU); g.fill(); }
      break;
    }
    case 'texto': {
      const t = U(o.tam); g.font = '400 ' + t + 'px "Lilita One","Anton",Impact,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.lineJoin = 'round'; g.lineWidth = Math.max(2, t * .16); g.strokeStyle = o.cor2; g.strokeText(o.texto, 0, 0); g.fillStyle = cor; g.fillText(o.texto, 0, 0);
      break;
    }
    case 'zona': {
      const pts = o.forma === 'poligono' ? o.pontos.map(p => [U(p[0]), U(p[1])]) : null;
      const forma = () => { if (pts) caminhoPoli(g, pts); else if (o.forma === 'circulo') { g.beginPath(); g.ellipse(0, 0, U(o.w / 2), U(o.h / 2), 0, 0, TAU); } else { g.beginPath(); g.rect(-U(o.w / 2), -U(o.h / 2), U(o.w), U(o.h)); } };
      const desligada = !est.on;
      forma(); g.fillStyle = rgba(cor, desligada ? .08 : .3); g.fill();
      g.setLineDash([10, 8]); g.lineWidth = 3; g.strokeStyle = rgba(cor, desligada ? .35 : .85); g.stroke(); g.setLineDash([]);
      const s = SIMBOLO_ZONA[o.efeito] || '', tam = Math.min(U(Math.min(o.w, o.h)) * .5, U(4));
      if (o.efeito === 'impulso' || o.efeito === 'esteira' || o.efeito === 'rampa') {   // as setas andando na direção
        g.save(); forma(); g.clip(); g.rotate(o.dir * RAD - rot); g.strokeStyle = rgba('#ffffff', .55); g.lineWidth = Math.max(2, tam * .12); g.lineCap = 'round'; g.lineJoin = 'round';
        const passo = Math.max(U(2.2), tam * 1.1), raio = Math.hypot(U(o.w), U(o.h)), off = ((opc.t || 0) * U(o.efeito === 'esteira' ? Math.abs(o.forca) : 6) * (o.forca < 0 ? -1 : 1)) % passo;
        for (let x = -raio + off; x < raio; x += passo) for (let y = -raio; y < raio; y += passo) { g.beginPath(); g.moveTo(x - tam * .25, y - tam * .3); g.lineTo(x + tam * .1, y); g.lineTo(x - tam * .25, y + tam * .3); g.stroke(); }
        g.restore();
      } else if (s) { g.fillStyle = rgba('#ffffff', .8); g.font = '700 ' + tam + 'px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.rotate(-rot); g.fillText(o.efeito === 'pontos' ? '+' + o.pontosZ : s, 0, 0); }
      if (o.efeito === 'gravidade') { g.strokeStyle = rgba('#ffffff', .4); g.lineWidth = 2; const k = ((opc.t || 0) * .8) % 1; for (let j = 0; j < 3; j++) { const rr = Math.min(U(o.w), U(o.h)) * .5 * (1 - ((j / 3 + k) % 1)); g.beginPath(); g.arc(0, 0, Math.max(2, rr), 0, TAU); g.stroke(); } }
      break;
    }
    case 'portal': {
      const R = U(o.raio), t = opc.t || 0;
      g.rotate(-rot);
      const gr = g.createRadialGradient(0, 0, R * .1, 0, 0, R); gr.addColorStop(0, '#ffffff'); gr.addColorStop(.35, cor); gr.addColorStop(1, rgba(cor, 0)); g.fillStyle = gr;
      g.beginPath(); g.arc(0, 0, R * 1.15, 0, TAU); g.fill();
      g.strokeStyle = clareia(cor, .4); g.lineWidth = Math.max(2, R * .12);
      for (let j = 0; j < 3; j++) { g.beginPath(); g.arc(0, 0, R * (.45 + j * .22), t * 3 + j * 2, t * 3 + j * 2 + Math.PI * 1.2); g.stroke(); }
      if (o.saida === 'angulo') { g.rotate(o.dir * RAD); g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(R * 1.25, 0); g.lineTo(R * .95, -R * .2); g.lineTo(R * .95, R * .2); g.closePath(); g.fill(); }
      break;
    }
    case 'botao': case 'interruptor': {
      const R = U(o.raio), lig = est.ligado, ap = est.press;
      g.rotate(-rot);
      g.fillStyle = escurece(cor, .55); g.beginPath(); g.ellipse(0, R * .18, R, R * .82, 0, 0, TAU); g.fill();
      g.fillStyle = o.tipo === 'interruptor' ? (lig ? cor : '#6d6f7a') : (ap ? escurece(cor, .25) : cor);
      g.beginPath(); g.ellipse(0, ap ? R * .1 : -R * .02, R * .78, R * .62, 0, 0, TAU); g.fill();
      g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = Math.max(2, R * .1); g.beginPath(); g.ellipse(-R * .12, -R * .14, R * .36, R * .2, -.3, Math.PI, TAU); g.stroke();
      if (o.tipo === 'interruptor') { g.fillStyle = '#ffffff'; g.font = '700 ' + R * .55 + 'px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(lig ? 'ON' : 'OFF', 0, 0); }
      break;
    }
    case 'gol': {
      const Lr = U(o.largura), Pr = U(o.prof), pr = Math.max(3, U(o.raioTrave)), dono = opc.P ? RM.timeDoLado(opc.P, o.dono) : o.dono, ct = o.dono >= 0 ? corTime(M, dono) : (o.cor || '#f5c542');
      // (o gol olha para +x: a boca em x = 0, o fundo em x = prof)
      if (o.rede) {
        g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(0, -Lr / 2, Pr, Lr);
        g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 1.5;
        for (let x = U(1); x < Pr; x += U(1)) { g.beginPath(); g.moveTo(x, -Lr / 2); g.lineTo(x, Lr / 2); g.stroke(); }
        for (let y = -Lr / 2 + U(1); y < Lr / 2; y += U(1)) { g.beginPath(); g.moveTo(0, y); g.lineTo(Pr, y); g.stroke(); }
        g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, -Lr / 2); g.lineTo(Pr, -Lr / 2); g.lineTo(Pr, Lr / 2); g.lineTo(0, Lr / 2); g.stroke();
      }
      if (o.det === 'area' && opc.editor) { g.setLineDash([6, 6]); g.strokeStyle = rgba(ct, .8); g.lineWidth = 2; g.strokeRect(0, -Lr / 2, Pr, Lr); g.setLineDash([]); }
      g.strokeStyle = rgba(ct, .9); g.lineWidth = Math.max(3, U(.35)); g.setLineDash([U(.8), U(.6)]); g.beginPath(); g.moveTo(0, -Lr / 2 + pr); g.lineTo(0, Lr / 2 - pr); g.stroke(); g.setLineDash([]);   // (a linha do gol)
      if (o.traves) for (const y of [-Lr / 2, Lr / 2]) { g.fillStyle = '#05060c'; g.beginPath(); g.arc(0, y, pr + 2.5, 0, TAU); g.fill(); g.fillStyle = ct; g.beginPath(); g.arc(0, y, pr, 0, TAU); g.fill(); g.fillStyle = 'rgba(255,255,255,.75)'; g.beginPath(); g.arc(-pr * .3, y - pr * .3, pr * .35, 0, TAU); g.fill(); }
      if (o.pontos > 1) { g.rotate(-rot); g.fillStyle = '#ffffff'; g.font = '700 ' + U(2) + 'px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('×' + o.pontos, Math.cos(rot) * Pr * .5, Math.sin(rot) * Pr * .5); }
      break;
    }
    case 'cronometro': if (opc.editor) { g.rotate(-rot); g.fillStyle = 'rgba(14,20,56,.85)'; g.beginPath(); g.arc(0, 0, U(1.6), 0, TAU); g.fill(); g.strokeStyle = cor; g.lineWidth = 3; g.stroke(); g.fillStyle = '#ffffff'; g.font = '700 ' + U(1.1) + 'px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(Math.round(o.seg) + 's', 0, 0); } break;
    case 'spawn': if (opc.editor || opc.spawns) {
      g.rotate(-rot); const ct = corTime(M, o.equipe), R = U(2);
      g.globalAlpha *= .9; g.fillStyle = rgba(ct, .35); g.beginPath(); g.arc(0, 0, R, 0, TAU); g.fill(); g.strokeStyle = ct; g.lineWidth = 3; g.setLineDash([5, 4]); g.stroke(); g.setLineDash([]);
      g.fillStyle = '#ffffff'; g.font = '700 ' + U(1.3) + 'px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String.fromCharCode(65 + o.equipe) + (o.ordem + 1), 0, 0);
    } break;
    case 'spawnBola': if (opc.editor || opc.spawns) {   // (a bola do mapa, no tamanho de verdade, com o anel tracejado de "nasce aqui")
      g.rotate(-rot); const rb = (G.C && G.C.R_BOLA) || U(1);
      DES.bola(g, 0, 0, rb, M);
      if (opc.editor) { g.globalAlpha *= .85; g.setLineDash([4, 4]); g.lineWidth = 2.5; g.strokeStyle = '#05060c'; g.beginPath(); g.arc(0, 0, rb * 1.8, 0, TAU); g.stroke(); g.setLineDash([]); }
    } break;
  }
  g.restore();
};
// os objetos parados (vão na imagem pronta) e os que mudam (por quadro)
DES.objetos = function (g, M, G, opc) {
  opc = opc || {};
  const cm = camadasDoMapa(M), P = opc.P;
  for (const { o, i } of objetosEmOrdem(M)) {
    if (opc.editor && (o.oculto || cm.vis.get(o.camada) === false)) continue;
    if (!opc.editor && !opc.spawns && (o.tipo === 'spawn' || o.tipo === 'spawnBola')) continue;
    const din = G.ehDin[i];
    if (opc.so === 'parados' && din) continue;
    if (opc.so === 'dinamicos' && !din) continue;
    DES.objeto(g, M, G, o, i, estadoDe(P, i, o), opc);
  }
};
// a imagem pronta do que não muda na partida (o fundo, o piso, as linhas e os objetos parados), no tamanho da tela
DES.pronto = function (M, G, s, cache) {
  const area = G.MW * G.MH * s * s, lim = 9e6, sc = area > lim ? s * Math.sqrt(lim / area) : s;
  const W = Math.max(1, Math.ceil(G.MW * sc)), H = Math.max(1, Math.ceil(G.MH * sc));
  if (cache && cache.mapa === M && cache.W === W && cache.H === H) return cache;
  const cv = (cache && cache.cv) || document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d'); g.setTransform(sc, 0, 0, sc, 0, 0);
  DES.fundo(g, M, G); DES.piso(g, M, G, sc); DES.linhas(g, M, G);
  DES.objetos(g, M, G, { so: 'parados' });
  return { cv, W, H, s: sc, mapa: M };
};
// a miniatura (para o catálogo): o campo inteiro numa imagem pequena (jpeg)
DES.miniatura = function (M, larg, alt) {
  try {
    const G = M.__G || RM.compila(M), w = larg || 192, hh = alt || 108;
    const cv = document.createElement('canvas'); cv.width = w; cv.height = hh; const g = cv.getContext('2d');
    const bx0 = G.GL - U(2), by0 = G.GT - U(2), bw = G.GR - G.GL + U(4), bh = G.GB - G.GT + U(4), s = Math.min(w / bw, hh / bh);
    g.fillStyle = M.aparencia.corFundo || '#1d2326'; g.fillRect(0, 0, w, hh);
    g.setTransform(s, 0, 0, s, (w - bw * s) / 2 - bx0 * s, (hh - bh * s) / 2 - by0 * s);
    DES.fundo(g, M, G); DES.piso(g, M, G, s); DES.linhas(g, M, G); DES.objetos(g, M, G, {}); DES.luz(g, M, G);
    let url = cv.toDataURL('image/jpeg', .72);
    if (url.length > 38000) url = cv.toDataURL('image/jpeg', .5);
    return url.length <= 38000 ? url : '';
  } catch (e) { console.error('Oficina (miniatura):', e); return ''; }
};
// a tampinha de cada time (o desenho do jogo, com a cor do time no aro) · e a bola (a do jogo)
const SKIN_TIME = new Map();
function skinDoTimeOfi(M, t, skinId) {
  const ct = corTime(M, t);
  let id = skinId;                                   // v95: a tampinha inicial (e a dos bots) com as listras na cor do time do mapa: cor, branco, cor
  try { if (typeof v95EhInicial === 'function' && v95EhInicial(skinId)) id = v95TampaDaCor(ct); } catch (_) {}
  const k = t + '|' + (id || '') + '|' + ct;
  if (SKIN_TIME.has(k)) return SKIN_TIME.get(k);
  let sk = null;
  try { sk = Object.assign({}, skinPorId(id || (typeof SKIN_INICIAL === 'string' ? SKIN_INICIAL : 'tampinha')), { cor: ct }); } catch (_) { sk = null; }
  if (SKIN_TIME.size > 64) SKIN_TIME.clear();
  SKIN_TIME.set(k, sk);
  return sk;
}
const OFI_VERDE = '#3ee06c';                         // v95: o sensor de quem você controla (o mesmo do jogo)
DES.jogador = function (g, M, q, x, y, r, escala, eu, skinId) {
  const ct = corTime(M, q.time), ca = eu ? OFI_VERDE : ct;
  g.save();
  g.fillStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.ellipse(x + r * .12, y + r * .22, r * 1.02, r * .9, 0, 0, TAU); g.fill();
  // v95: o sensor limpo e translúcido (o seu verde; o dos outros na cor do time), com a borda de fora mais viva
  const re = r * 1.22, ri = r * 1.04, w = Math.max(1, r * .05);
  g.beginPath(); g.arc(x, y, re, 0, TAU); g.arc(x, y, ri, 0, TAU, true); g.fillStyle = rgba(ca, .42); g.fill();
  g.lineWidth = w; g.strokeStyle = rgba(mistura(ca, '#ffffff', .32), .9); g.beginPath(); g.arc(x, y, re - w / 2, 0, TAU); g.stroke();
  g.lineWidth = Math.max(.75, r * .026); g.strokeStyle = rgba(ca, .5); g.beginPath(); g.arc(x, y, ri + g.lineWidth / 2, 0, TAU); g.stroke();
  // v95: apertou o PASSE ou o CHUTE, o anel acende num branco forte (segurando, fica; soltou ou foi só um toque, some rápido)
  const wb = typeof v95ApertoOfi === 'function' ? v95ApertoOfi(q, eu) : 0;
  if (wb > .01) {
    let luz = 1; try { luz = V95S.luz || 1; } catch (_) {}   // (v96: o branco com opacidade baixa — V95S.luz, tools/v96/conta.js)
    g.globalAlpha = Math.min(1, wb) * luz;
    g.save(); g.shadowColor = 'rgba(255,255,255,.85)'; g.shadowBlur = Math.max(2, r * escala * .22);
    g.beginPath(); g.arc(x, y, re, 0, TAU); g.arc(x, y, ri, 0, TAU, true); g.fillStyle = 'rgba(255,255,255,.84)'; g.fill(); g.restore();
    g.lineWidth = w * 1.2; g.strokeStyle = '#ffffff'; g.beginPath(); g.arc(x, y, re - w * .6, 0, TAU); g.stroke();
    g.globalAlpha = 1;
  }
  g.restore();
  const sk = skinDoTimeOfi(M, q.time, skinId);
  let foi = false;
  if (sk && typeof drawPlayer === 'function') {
    const z0 = cam.z;
    try { cam.z = escala / (K || 1); drawPlayer(g, x, y, r, sk, '', null, true, null); foi = true; } catch (_) { foi = false; } finally { cam.z = z0; }
  }
  if (!foi) {                                        // (sem o desenho do jogo: a tampinha simples)
    g.fillStyle = ct; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); g.strokeStyle = '#05060c'; g.lineWidth = Math.max(2, r * .12); g.stroke();
    g.fillStyle = clareia(ct, .45); g.beginPath(); g.arc(x - r * .25, y - r * .3, r * .32, 0, TAU); g.fill();
  }
  if (eu) { g.save(); g.fillStyle = '#ffd21f'; g.strokeStyle = '#05060c'; g.lineWidth = 3; g.beginPath(); g.moveTo(x, y - r * 1.35); g.lineTo(x - r * .38, y - r * 1.95); g.lineTo(x + r * .38, y - r * 1.95); g.closePath(); g.fill(); g.stroke(); g.restore(); }
};
// a bola: a da Oficina é branca, lisa e com o contorno preto (a de sempre dos jogos de bolinha), do tamanho exato da colisão
// (o contorno fica do lado de dentro: o que se vê é o que bate). A aparência do mapa pode trocar pela do RACHA, por uma cor
// ou pela EQUIPADA (cada um vê a bola que equipou na loja — v93: as bolas lisas e a Clássica Lisa; só o desenho).
DES.estiloBola = M => (M && M.aparencia && M.aparencia.bola) || 'branca';
DES.bola = function (g, x, y, r, M) {
  const est = DES.estiloBola(M);
  if (est === 'racha') { try { if (typeof drawBall === 'function') { drawBall(g, x, y, r); return; } } catch (_) {} }
  if (est === 'jogador') {                           // v93: a bola que cada um equipou na loja (as lisas, a Clássica Lisa…); sem bola equipada, a branca
    try { const it = typeof v88BolaPadrao === 'function' ? v88BolaPadrao() : null; if (it && typeof v88DesenhaBolaJogo === 'function') { v88DesenhaBolaJogo(g, x, y, r, it); return; } } catch (_) {}
  }
  const lw = Math.max(1, r * .2);
  g.save(); g.setLineDash([]);
  g.beginPath(); g.arc(x, y, Math.max(1, r - lw / 2), 0, TAU);
  g.fillStyle = est === 'cor' ? (M.aparencia.corBola || '#ffd23f') : '#ffffff'; g.fill();
  g.lineWidth = lw; g.strokeStyle = '#000000'; g.stroke();
  g.restore();
};
