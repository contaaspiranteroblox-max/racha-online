/* =====================================================================================================================
   RACHA v92 · O NÚCLEO DA FÍSICA DAS SALAS — um arquivo só para o servidor e para o aparelho.

   Por que existe: até a v91 a física das salas morava em dois lugares diferentes — o motor do servidor
   (server/partida/sala.js, o "porte fiel") e a previsão do aparelho (net49Predict no racha.html, com 2 subpassos fixos,
   uma cópia da bola que não reagia e paredes diferentes). Cada diferença virava correção (tranco) na tela. Agora o
   servidor (require) e o jogo (o build cola este arquivo no racha.html) rodam EXATAMENTE o mesmo código:
     · as batidas (reflect, hitSeg, hitBox, hitPoint, hitBodies) — as mesmas fórmulas de sempre;
     · o passo da física das salas (velocidade aditiva com teto, bola com freio e teto, subpassos 2–12 com colisão dupla,
       a barreira da saída, o efeito da CURVA, o cruzamento do gol);
     · os botões PASSE/CHUTE (a máquina aperta/segura/solta de sempre + o toque que fica armado por alguns ticks e o
       contador de toques no comando, que não deixa um toque se perder na rede).
   Os números vêm de um PERFIL (em u, as unidades do jogo; 1 u = 19 px). PERFIL_V91 reproduz a v91 exatamente;
   PERFIL_V92 é o padrão novo (os mesmos números de física + o toque armado e a rede do gol segurando a tampinha também
   no servidor, como no jogo offline). O painel de testes da versão experimental troca o perfil; a versão oficial usa o
   padrão e o servidor só aceita perfil de fora com RACHA_EXPERIMENTAL=1.
   Determinístico: nada de Math.random aqui (o servidor e a previsão precisam dar o mesmo resultado).
   ===================================================================================================================== */
(function (raiz, fabrica) {
  'use strict';
  const N = fabrica();
  if (typeof module === 'object' && module.exports) module.exports = N;
  if (raiz) raiz.RachaNucleo = N;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null), function () {
  'use strict';

  const PX_POR_U = 19;
  const U = v => v * PX_POR_U;
  const TPS = 60;
  const DT = 1 / TPS;

  /* ---------- os perfis (u, u/s, massas e coeficientes) ---------- */
  // v91: os números do jogo (a mecânica clássica da v84 com o chute da v87.1) e o comportamento do servidor da v91.
  const PERFIL_V91 = Object.freeze({
    rJog: 2.0,            // raio do corpo da tampinha (u)
    raioChute: 2.5,       // o anel de chute (u): alcance = raioChute + rBola entre os centros
    massaJog: 1.25,
    velJog: 14.1,         // velocidade máxima da tampinha (u/s)
    forcaPasse: 212.5,    // PASSE: Δv = força ÷ massa da bola (u/s)
    forcaChute: 340,      // CHUTE
    rBola: 1.0,
    massaBola: 10,
    limiteBola: 46.75,    // teto da bola (u/s)
    fatorBola: 0.99,      // a bola guarda isso da velocidade a cada tick (o freio)
    amortAngular: 0.5,    // o giro da bola diminui sozinho
    atritoBola: 0.5,      // atrito da bola (o da tampinha × bola e o da trave × bola saem dele pela média geométrica)
    atritoJog: 0.3,
    atritoTrave: 0.1,
    quiqueBola: 0,        // tampinha × bola (o quique da bola)
    quiqueParede: 0.65,   // bola × linhas
    quiqueTrave: 0.6,     // bola × trave
    quiqueRede: 0.15,     // bola × rede
    quiqueJogJog: 0.3,    // tampinha × tampinha
    quiqueJogParede: 0.65,// tampinha × muro da área
    limiarQuique: 1,      // u/s: batida mais lenta que isso não quica
    direcoes: 32,         // setores do analógico (0 = livre)
    bufferToque: 0,       // ticks que um toque fica armado esperando a bola (0 = só o passo seguinte, como até a v91)
    jogRede: 0,           // 1 = a rede e as traves seguram a tampinha também no servidor (o jogo offline sempre segurou)
    cooldownBotao: 0.02,  // s entre trocas de botão
  });
  // v92: o padrão novo — a física de números é a MESMA; só o toque armado (100 ms) e a rede do gol igual ao offline.
  const PERFIL_V92 = Object.freeze(Object.assign({}, PERFIL_V91, { bufferToque: 6, jogRede: 1 }));

  // os limites que o painel e o servidor aceitam (o servidor corta qualquer coisa fora disto)
  const LIMITES = Object.freeze({
    rJog: [1.2, 3.2], raioChute: [1.4, 4.2], massaJog: [0.3, 6], velJog: [7, 24],
    forcaPasse: [80, 500], forcaChute: [120, 700], rBola: [0.5, 1.8], massaBola: [2, 30], limiteBola: [20, 90],
    fatorBola: [0.97, 0.998], amortAngular: [0, 4], atritoBola: [0, 1], atritoJog: [0, 1], atritoTrave: [0, 1],
    quiqueBola: [0, 0.9], quiqueParede: [0, 1], quiqueTrave: [0, 1], quiqueRede: [0, 0.8], quiqueJogJog: [0, 1],
    quiqueJogParede: [0, 1], limiarQuique: [0, 4], direcoes: [0, 64], bufferToque: [0, 15], jogRede: [0, 1],
    cooldownBotao: [0, 0.1],
  });

  function perfilLimpo(p, base) {                     // um perfil de fora (do painel ou da rede): só os campos conhecidos, cortados
    const b = base || PERFIL_V92, o = {};
    for (const k in b) {
      let v = p && Object.prototype.hasOwnProperty.call(p, k) ? Number(p[k]) : b[k];
      if (!Number.isFinite(v)) v = b[k];
      const L = LIMITES[k];
      if (L) v = Math.max(L[0], Math.min(L[1], v));
      if (k === 'direcoes') v = v <= 0 ? 0 : v <= 8 ? 8 : v <= 16 ? 16 : v <= 32 ? 32 : 64;   // 8, 16, 32, 64 ou livre
      if (k === 'bufferToque') v = Math.round(v);
      if (k === 'jogRede') v = v >= 0.5 ? 1 : 0;
      o[k] = v;
    }
    return o;
  }

  // o perfil vira as constantes em px (os mesmos nomes do jogo, para o código ler igual)
  function resolve(perfil) {
    const p = perfilLimpo(perfil, PERFIL_V92);
    const C = {
      perfil: p,
      R_JOG: U(p.rJog), RAIO_CHUTE: U(p.raioChute), MASSA_JOG: p.massaJog, VEL_JOG: U(p.velJog),
      FORCA_KICK: p.forcaPasse, FORCA_POWER: p.forcaChute,
      R_BOLA: U(p.rBola), MASSA_BOLA: p.massaBola, LIMITE_VEL_BOLA: U(p.limiteBola), FATOR_BOLA: p.fatorBola,
      AMORT_ANGULAR: p.amortAngular, ATRITO_BOLA: p.atritoBola,
      ATRITO_JOG_BOLA: Math.sqrt(p.atritoJog * p.atritoBola), ATRITO_TRAVE_BOLA: Math.sqrt(p.atritoTrave * p.atritoBola),
      QUIQUE_BOLA: p.quiqueBola,
      Q_PAREDE: Math.max(p.quiqueBola, p.quiqueParede), Q_TRAVE: Math.max(p.quiqueBola, p.quiqueTrave), Q_REDE: Math.max(p.quiqueBola, p.quiqueRede),
      Q_JOG_JOG: p.quiqueJogJog, Q_JOG_PAREDE: p.quiqueJogParede,
      LIMIAR_QUIQUE: U(p.limiarQuique),
      DIRECOES: p.direcoes, BUFFER_TOQUE: p.bufferToque, JOG_REDE: !!p.jogRede, COOLDOWN_BOTAO: p.cooldownBotao,
    };
    C.ALCANCE_CHUTE = C.RAIO_CHUTE + C.R_BOLA;
    return C;
  }

  /* ---------- as batidas (as mesmas fórmulas do jogo e da v83) ---------- */
  // (nx, ny) = a normal da superfície para o corpo; e = quique; mu = atrito; lq = limiar do quique (px/s)
  function reflect(o, nx, ny, e, mu, lq) {
    const vn = o.vx * nx + o.vy * ny;
    if (vn >= 0) return;
    const eff = (-vn < lq) ? 0 : e;
    const jn = -(1 + eff) * vn;
    o.vx += nx * jn; o.vy += ny * jn;
    if (mu > 0) {
      const tx = -ny, ty = nx, R = o.r, w = o.w || 0;
      const vt = o.vx * tx + o.vy * ty - w * R;
      const k = 1 + (o.I ? (o.m * R * R) / o.I : 0);
      let jt = -vt / k;
      const lim = mu * jn;
      if (jt > lim) jt = lim; else if (jt < -lim) jt = -lim;
      o.vx += tx * jt; o.vy += ty * jt;
      if (o.I) o.w = w - (R * jt * o.m) / o.I;
    }
  }
  function hitPoint(o, px, py, pr, e, mu, lq) {
    let dx = o.x - px, dy = o.y - py;
    const rs = o.r + pr, d2 = dx * dx + dy * dy;
    if (d2 >= rs * rs) return false;
    let d = Math.sqrt(d2);
    if (d < 1e-9) { const v = Math.hypot(o.vx, o.vy); dx = v > 1e-9 ? -o.vx / v : 1; dy = v > 1e-9 ? -o.vy / v : 0; d = 1; }
    const nx = dx / d, ny = dy / d;
    o.x = px + nx * rs; o.y = py + ny * rs;
    reflect(o, nx, ny, e, mu, lq);
    return true;
  }
  function hitSeg(o, ax, ay, bx, by, e, mu, lq) {
    const abx = bx - ax, aby = by - ay;
    const t = Math.max(0, Math.min(1, ((o.x - ax) * abx + (o.y - ay) * aby) / (abx * abx + aby * aby)));
    return hitPoint(o, ax + abx * t, ay + aby * t, 0, e, mu, lq);
  }
  function hitBox(o, x0, y0, x1, y1, e, mu, lq) {
    if (o.x < x0 + o.r) { o.x = x0 + o.r; reflect(o, 1, 0, e, mu, lq); }
    else if (o.x > x1 - o.r) { o.x = x1 - o.r; reflect(o, -1, 0, e, mu, lq); }
    if (o.y < y0 + o.r) { o.y = y0 + o.r; reflect(o, 0, 1, e, mu, lq); }
    else if (o.y > y1 - o.r) { o.y = y1 - o.r; reflect(o, 0, -1, e, mu, lq); }
  }
  // círculo × círculo com massas; o atrito gira a bola (b)
  function hitBodies(a, b, e, mu) {
    let dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
    const rs = a.r + b.r;
    if (d >= rs) return;
    if (d < 1e-6) {
      dx = a.vx - b.vx; dy = a.vy - b.vy; d = Math.hypot(dx, dy);
      if (d < 1e-6) { dx = 1; dy = 0; d = 1; }
      dx /= d; dy /= d; d = 1e-6; dx *= d; dy *= d;
    }
    const nx = dx / d, ny = dy / d;
    const ia = a.cinematico ? 0 : 1 / a.m, ib = b.cinematico ? 0 : 1 / b.m, is = ia + ib;   // (v92: cinemático = não é empurrado)
    if (is <= 0) return;
    const pen = Math.max(0, rs - d - 0.2) * 0.9;
    a.x -= nx * pen * ia / is; a.y -= ny * pen * ia / is;
    b.x += nx * pen * ib / is; b.y += ny * pen * ib / is;
    const vn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
    if (vn < 0) {
      const j = -(1 + e) * vn / is;
      a.vx -= j * ia * nx; a.vy -= j * ia * ny;
      b.vx += j * ib * nx; b.vy += j * ib * ny;
      if (mu > 0) {
        const tx = -ny, ty = nx, R = b.r, w = b.w || 0;
        const vt = (b.vx - a.vx) * tx + (b.vy - a.vy) * ty - w * R;
        let jt = -vt / (is + (b.I ? (R * R) / b.I : 0));
        const lim = mu * j;
        if (jt > lim) jt = lim; else if (jt < -lim) jt = -lim;
        a.vx -= jt * ia * tx; a.vy -= jt * ia * ty;
        b.vx += jt * ib * tx; b.vy += jt * ib * ty;
        if (b.I) b.w = w - (R * jt) / b.I;
      }
    }
  }

  /* ---------- o campo das salas (Arena e Estádio: a mesma geometria) ---------- */
  const MODOS = [
    { nome: '1v1', jog: [87.8, 62],   bola: [72.8, 52],   gol: [6.6, 12.8], trave: 0.5, rede: 0.4 },
    { nome: '2v2', jog: [107.3, 75],  bola: [92.3, 65],   gol: [6.6, 16],   trave: 0.5, rede: 0.4 },
    { nome: '3v3', jog: [126.8, 101], bola: [111.8, 91],  gol: [7, 20.5],   trave: 0.5, rede: 0.4 },
    { nome: '4v4', jog: [156.4, 127], bola: [140.4, 117], gol: [7, 24.5],   trave: 0.5, rede: 0.4 },
  ];
  const MARGEM_X = 206, MARGEM_Y = 59;
  const SAIDA_U = [10.4, 13, 15.6, 17.55];          // (v95: × 1,3, com o campo — a cópia compara o motor, não o tamanho)
  // o raio da barreira da saída por tamanho
  function novoCampo(tamanho) {
    const n = Math.min(4, Math.max(1, tamanho | 0)), m = MODOS[n - 1];
    const pw = U(m.jog[0]), ph = U(m.jog[1]), bw = U(m.bola[0]), bh = U(m.bola[1]);
    const MW = Math.round(pw + 2 * MARGEM_X), MH = Math.round(ph + 2 * MARGEM_Y);
    const CX = MW / 2, CY = MH / 2;
    const G = {
      nome: m.nome, n, MW, MH, CX, CY,
      GL: CX - pw / 2, GR: CX + pw / 2, GT: CY - ph / 2, GB: CY + ph / 2,
      LX0: CX - bw / 2, LX1: CX + bw / 2, LY0: CY - bh / 2, LY1: CY + bh / 2,
    };
    G.GOL_PROF = U(m.gol[0]);
    G.GOL_Y0 = CY - U(m.gol[1]) / 2; G.GOL_Y1 = CY + U(m.gol[1]) / 2;
    G.POST_R = U(m.trave) / 2;
    G.REDE_E = U(m.rede);
    G.POSTS = [[G.LX0, G.GOL_Y0], [G.LX0, G.GOL_Y1], [G.LX1, G.GOL_Y0], [G.LX1, G.GOL_Y1]];
    const PL = { x0: G.LX0 - G.GOL_PROF, x1: G.LX0 }, PR = { x0: G.LX1, x1: G.LX1 + G.GOL_PROF };
    G.NET_SEGS = [
      [PL.x0, G.GOL_Y0, PL.x1, G.GOL_Y0], [PL.x0, G.GOL_Y1, PL.x1, G.GOL_Y1], [PL.x0, G.GOL_Y0, PL.x0, G.GOL_Y1],
      [PR.x0, G.GOL_Y0, PR.x1, G.GOL_Y0], [PR.x0, G.GOL_Y1, PR.x1, G.GOL_Y1], [PR.x1, G.GOL_Y0, PR.x1, G.GOL_Y1],
    ];
    G.WALL_SEGS = [
      [G.LX0, G.LY0, G.LX1, G.LY0], [G.LX0, G.LY1, G.LX1, G.LY1],
      [G.LX0, G.LY0, G.LX0, G.GOL_Y0], [G.LX0, G.GOL_Y1, G.LX0, G.LY1],
      [G.LX1, G.LY0, G.LX1, G.GOL_Y0], [G.LX1, G.GOL_Y1, G.LX1, G.LY1],
    ];
    G.circ = U(SAIDA_U[n - 1]);
    return G;
  }

  /* ---------- o analógico: n setores (0 = livre); a amplitude não muda a velocidade ---------- */
  const ZONA_MORTA = 0.00001;
  function direcao(mx, my, n) {
    if (!Number.isFinite(mx) || !Number.isFinite(my) || Math.hypot(mx, my) <= ZONA_MORTA) return { mx: 0, my: 0 };
    if (!n) { const l = Math.hypot(mx, my); return { mx: mx / l, my: my / l }; }
    const setor = (Math.PI * 2) / n, ang = Math.round(Math.atan2(my, mx) / setor) * setor;
    return { mx: Math.cos(ang), my: Math.sin(ang) };
  }

  /* ---------- a CURVA (o efeito no ar e o chute de curva) ---------- */
  const CV_CARGA_S = 1.2, CV_ARMA_S = 0.35, CV_W = [0.2, 1], CV_T = [0.45, 0.9];
  const cvW = c => CV_W[0] + (CV_W[1] - CV_W[0]) * c, cvT = c => CV_T[0] + (CV_T[1] - CV_T[0]) * c;
  function curvaNoAr(B, sub) {                        // a bola entorta no ar
    if (!(B.cvT > 0)) return;
    B.cvT -= sub;
    const v = Math.hypot(B.vx, B.vy);
    if (v < U(3)) { B.cvT = 0; return; }
    if (B.cvUx != null && (B.vx * B.cvUx + B.vy * B.cvUy) / v < 0.94) { B.cvT = 0; return; }   // bateu: o efeito acaba
    const a = (B.cv || 0) * v * sub, nx = -B.vy / v, ny = B.vx / v;
    B.vx += nx * a; B.vy += ny * a;
    const l = Math.hypot(B.vx, B.vy) || 1; B.cvUx = B.vx / l; B.cvUy = B.vy / l;
  }
  function cvSinal(M, ux, uy, mx, my) {
    const l = Math.hypot(mx, my);
    if (l > 0.1) { const x = (ux * my - uy * mx) / l; if (Math.abs(x) > 0.26) return x > 0 ? 1 : -1; }
    return Math.sign((M.G.CY - M.B.y) * ux) || 1;
  }
  function cvMarca(B, s, c) { B.cv = s * cvW(c); B.cvT = cvT(c); B.w = B.cv * 9; B.cvUx = null; }

  /* ---------- o chute (centro da tampinha → centro da bola, só no alcance) ---------- */
  // devolve true se chutou. Quem chama marca autoria, efeito e som (o servidor e o aparelho fazem coisas diferentes).
  function chute(M, C, q, forca) {
    const B = M.B;
    let dx = B.x - q.x, dy = B.y - q.y, d = Math.hypot(dx, dy);
    if (d === 0) { dx = 1; dy = 0; d = 1; }
    if (d > C.ALCANCE_CHUTE) return false;
    B.w = 0; const dv = U(forca / B.m); B.vx += dx / d * dv; B.vy += dy / d * dv;
    if (M.jogo === 'curva') B.cvT = 0;               // PASSE e CHUTE saem retos; a curva é só do botão CURVA
    return true;
  }

  /* ---------- os botões PASSE/CHUTE de um jogador ----------
     b = {estado:1|2|3, livre, t, ultimo, kc, pc, arma, armaTipo, cv:{carga,segura,arma,armaC}}
     · comando(b, c): um comando consumido (cada um, na ordem; os atrasados também) — a máquina de sempre + o toque novo
       (pelo contador kc/pc do comando; sem contador, pela passagem de solto para apertado);
     · tick(M, C, q, b, chuta): uma vez por passo — segurando: chuta quando a bola entra no alcance (como sempre);
       o toque armado: chuta se a bola chegar no alcance dentro de C.BUFFER_TOQUE ticks. Um chute por toque. */
  function novoBotao() { return { estado: 1, livre: true, t: 0, ultimo: -1e9, kc: -1, pc: -1, arma: 0, armaTipo: 0, cv: { carga: 0, segura: false, arma: 0, armaC: 0 } }; }
  function botaoComando(b, c, C) {
    b.t += DT;
    const bt = c.button === 2 || c.button === 3 ? c.button : 1;
    const antes = b.estado;
    const aceito = bt !== 1 && (b.t - b.ultimo > C.COOLDOWN_BOTAO || b.estado === bt);
    b.estado = aceito ? bt : 1; if (aceito) b.ultimo = b.t;
    // o toque novo: pelo contador (não se perde) ou, sem contador, pela borda solto → apertado
    let novo = 0;
    const kc = Number.isFinite(c.kc) ? c.kc : null, pc = Number.isFinite(c.pc) ? c.pc : null;
    if (kc != null || pc != null) {
      if (pc != null && b.pc >= 0 && pc > b.pc) novo = 3;
      else if (kc != null && b.kc >= 0 && kc > b.kc) novo = 2;
      if (pc != null) b.pc = Math.max(b.pc, pc);
      if (kc != null) b.kc = Math.max(b.kc, kc);
    } else if (b.estado !== 1 && antes !== b.estado) novo = b.estado;
    if (novo && C.BUFFER_TOQUE > 0) { b.arma = C.BUFFER_TOQUE + 1; b.armaTipo = novo; }
    return novo;
  }
  function botaoTick(M, C, q, b, chuta) {             // chuta(q, forca) faz o chute de verdade (e o registro de quem chamou)
    const B = M.B;
    const perto = Math.hypot(B.x - q.x, B.y - q.y) <= C.ALCANCE_CHUTE;
    if (b.estado === 1) b.livre = true;
    else if (b.livre && perto) {
      if (chuta(q, b.estado === 3 ? C.FORCA_POWER : C.FORCA_KICK)) { b.livre = false; b.arma = 0; return b.estado; }
    }
    if (b.arma > 0) {
      b.arma--;
      if (b.arma > 0 && perto && chuta(q, b.armaTipo === 3 ? C.FORCA_POWER : C.FORCA_KICK)) {
        const t = b.armaTipo; b.arma = 0; if (b.estado !== 1) b.livre = false; return t;
      }
    }
    return 0;
  }
  // a CURVA de quem joga (o bit 1 do k): segura carrega, solta arma por 0,35 s
  function curvaTick(M, C, q, b, k, vale, chuta) {
    if (M.jogo !== 'curva') return false;
    const s = b.cv;
    if (!vale) { s.carga = 0; s.segura = false; s.arma = 0; return false; }
    if (k & 1) { s.segura = true; s.carga = Math.min(1, s.carga + DT / CV_CARGA_S); s.arma = 0; return false; }
    if (s.segura) { s.segura = false; s.armaC = Math.max(s.carga, DT / CV_CARGA_S); s.carga = 0; s.arma = CV_ARMA_S; }
    if (s.arma > 0) {
      const B = M.B;
      let dx = B.x - q.x, dy = B.y - q.y, d = Math.hypot(dx, dy);
      if (d <= C.ALCANCE_CHUTE) {
        if (d === 0) { dx = 1; dy = 0; d = 1; }
        if (chuta(q, C.FORCA_POWER)) { cvMarca(B, cvSinal(M, dx / d, dy / d, q.mx, q.my), s.armaC); s.arma = 0; return true; }
      }
      s.arma = Math.max(0, s.arma - DT);
    }
    return false;
  }

  /* ---------- a barreira da saída (o meio-campo segura todos; o arco segura quem espera) ---------- */
  function barreiraUm(M, q) {
    const G = M.G, s = q.time === 0 ? -1 : 1;
    if (q.time !== M.saidaTime) {
      if (s < 0 && q.x > G.CX) { q.x = G.CX; if (q.vx > 0) q.vx = 0; }
      else if (s > 0 && q.x < G.CX) { q.x = G.CX; if (q.vx < 0) q.vx = 0; }
      const dx = q.x - G.CX, dy = q.y - G.CY, d = Math.hypot(dx, dy), m = G.circ + q.r;
      if (d < m) { if (d > 1e-6) { q.x = G.CX + dx * m / d; q.y = G.CY + dy * m / d; } else q.x = G.CX + s * m; }
      return;
    }
    if (s < 0 ? q.x <= G.CX : q.x >= G.CX) return;
    const dx = q.x - G.CX, dy = q.y - G.CY, d = Math.hypot(dx, dy), lim = G.circ - q.r;
    if (d <= lim) return;
    if (lim > 0 && d - lim < Math.abs(dx)) { q.x = G.CX + dx * lim / d; q.y = G.CY + dy * lim / d; }
    else { q.x = G.CX; if (s < 0 ? q.vx > 0 : q.vx < 0) q.vx = 0; }
  }

  /* ---------- as colisões de um subpasso (a ordem do motor das salas) ---------- */
  function colide(M, C) {
    const B = M.B, G = M.G, J = M.jog, lq = C.LIMIAR_QUIQUE;
    for (const q of J) {
      hitBodies(q, B, C.QUIQUE_BOLA, C.ATRITO_JOG_BOLA);
      hitBox(q, G.GL, G.GT, G.GR, G.GB, C.Q_JOG_PAREDE, 0, lq);
      if (C.JOG_REDE) {                              // v92: como no jogo offline (rqParedes): a rede segura e a trave bate
        for (const s of G.NET_SEGS) hitSeg(q, s[0], s[1], s[2], s[3], 0.6, 0, lq);
        for (const p of G.POSTS) hitPoint(q, p[0], p[1], G.POST_R, 0.3, 0, lq);
      }
    }
    for (let i = 0; i < J.length; i++) for (let k = i + 1; k < J.length; k++) hitBodies(J[i], J[k], C.Q_JOG_JOG, 0);
    if (M.estado === 'saida') for (const q of J) barreiraUm(M, q);
    for (const s of G.WALL_SEGS) hitSeg(B, s[0], s[1], s[2], s[3], C.Q_PAREDE, C.ATRITO_BOLA, lq);
    hitBox(B, G.GL, G.GT, G.GR, G.GB, C.Q_PAREDE, C.ATRITO_BOLA, lq);
    let trave = 0;
    for (const p of G.POSTS) {
      const d = Math.hypot(B.x - p[0], B.y - p[1]) || 1, vn = -(B.vx * (B.x - p[0]) + B.vy * (B.y - p[1])) / d;
      if (hitPoint(B, p[0], p[1], G.POST_R, C.Q_TRAVE, C.ATRITO_TRAVE_BOLA, lq) && vn > trave) trave = vn;
    }
    for (const s of G.NET_SEGS) hitSeg(B, s[0], s[1], s[2], s[3], C.Q_REDE, C.ATRITO_BOLA, lq);
    if (trave > (M.trave || 0)) M.trave = trave;
  }

  // o gol: a bola INTEIRA do lado de dentro da linha, na altura da boca (lado -1 = gol da esquerda, 1 = da direita)
  function golCruzou(M, C, x0, y0, x1, y1) {
    const G = M.G, m = C.R_BOLA, xa = G.LX0 - m, xb = G.LX1 + m;
    if (x0 >= xa && x1 < xa) { const yc = y0 + (y1 - y0) * (x0 - xa) / (x0 - x1); if (yc > G.GOL_Y0 && yc < G.GOL_Y1) return -1; }
    if (x0 <= xb && x1 > xb) { const yc = y0 + (y1 - y0) * (xb - x0) / (x1 - x0); if (yc > G.GOL_Y0 && yc < G.GOL_Y1) return 1; }
    return 0;
  }

  /* ---------- O PASSO (1/60 s) ----------
     M = {G, B:{x,y,vx,vy,w,r,m,I,cv,cvT,cvUx,cvUy}, jog:[{x,y,vx,vy,r,m,mx,my,time,cinematico?}], estado, saidaTime, jogo}
     As entradas (mx, my e os chutes) já foram aplicadas por quem chama. cb (opcional):
       cb.toques()              — depois de cada subpasso (autoria);
       cb.gol(lado) → 'para'?   — a bola cruzou a linha num subpasso (devolver 'para' interrompe o passo).
     Tampinha cinemática (a previsão do aparelho para os outros jogadores): não usa entrada nem é empurrada. */
  function passo(M, C, cb) {
    const B = M.B;
    for (const q of M.jog) {
      if (q.cinematico) continue;
      const d = direcao(q.mx, q.my, C.DIRECOES);
      if (d.mx || d.my) {
        q.vx += d.mx * C.VEL_JOG; q.vy += d.my * C.VEL_JOG;
        const v = Math.hypot(q.vx, q.vy);
        if (v > C.VEL_JOG) { q.vx *= C.VEL_JOG / v; q.vy *= C.VEL_JOG / v; }
      } else { q.vx = 0; q.vy = 0; }
    }
    B.vx *= C.FATOR_BOLA; B.vy *= C.FATOR_BOLA;
    B.w *= 1 / (1 + C.AMORT_ANGULAR / TPS);
    const speed = Math.hypot(B.vx, B.vy);
    if (speed > C.LIMITE_VEL_BOLA) { B.vx *= C.LIMITE_VEL_BOLA / speed; B.vy *= C.LIMITE_VEL_BOLA / speed; }
    let relative = 0;
    for (const q of M.jog) { const r = Math.hypot(B.vx - q.vx, B.vy - q.vy); if (r > relative) relative = r; }
    const steps = Math.max(2, Math.min(12, Math.ceil(Math.max(speed, relative) * DT / (C.R_BOLA * 0.3))));
    const sub = DT / steps;
    for (let i = 0; i < steps; i++) {
      const bx0 = B.x, by0 = B.y;
      for (const q of M.jog) { q.x += q.vx * sub; q.y += q.vy * sub; }
      B.x += B.vx * sub; B.y += B.vy * sub;
      if (M.jogo === 'curva') curvaNoAr(B, sub);
      colide(M, C); colide(M, C);
      if (cb && cb.toques) cb.toques();
      const lado = golCruzou(M, C, bx0, by0, B.x, B.y);
      if (lado && cb && cb.gol && cb.gol(lado) === 'para') break;
      if (M.estado === 'fim') break;                 // (o motor das salas: o gol de ouro ou o da meta encerra na hora)
    }
  }

  function novaBola(C, x, y) { return { x, y, vx: 0, vy: 0, w: 0, r: C.R_BOLA, m: C.MASSA_BOLA, I: 0.5 * C.MASSA_BOLA * C.R_BOLA * C.R_BOLA, cv: 0, cvT: 0, cvUx: null, cvUy: null }; }
  function ajustaCorpos(M, C) {                       // o perfil mudou: os raios e as massas de todo mundo seguem
    const B = M.B; B.r = C.R_BOLA; B.m = C.MASSA_BOLA; B.I = 0.5 * C.MASSA_BOLA * C.R_BOLA * C.R_BOLA;
    for (const q of M.jog) { q.r = C.R_JOG; q.m = C.MASSA_JOG; }
  }

  return {
    VERSAO: 'v92.1', PX_POR_U, U, TPS, DT, PERFIL_V91, PERFIL_V92, LIMITES, perfilLimpo, resolve,
    reflect, hitPoint, hitSeg, hitBox, hitBodies, MODOS, MARGEM_X, MARGEM_Y, novoCampo, direcao,
    chute, novoBotao, botaoComando, botaoTick, curvaTick, curvaNoAr, cvSinal, cvMarca, CV_CARGA_S, CV_ARMA_S,
    barreiraUm, colide, golCruzou, passo, novaBola, ajustaCorpos,
  };
});
