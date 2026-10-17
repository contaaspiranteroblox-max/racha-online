'use strict';
/* =====================================================================================================================
   RACHA · NÚCLEO DA FÍSICA (FR-85) — um arquivo só, para o jogo e para o servidor.

   O build (tools/aplicar_rua.py) cola este arquivo no racha.html antes do script do jogo (vira window.RACHA_FISICA) e o
   servidor faz require dele (server/partida/fisica.js e sala.js): o aparelho e o servidor calculam a MESMA física, com o
   mesmo texto de código. A especificação — as metas de jogo, de onde sai cada número e o que foi testado — está em
   tools/v85/FISICA_RACHA.md. As fórmulas são de física de livro-texto (impulso com coeficiente de restituição e atrito de
   Coulomb, amortecimento exponencial, aceleração limitada) e cada função diz o que faz.

   Unidades: posições em px da tela virtual, 1 u (unidade de quadra) = 19 px; tempo em s; velocidades em px/s.
   ===================================================================================================================== */
(function (raiz, fabrica) {
  const N = fabrica();
  if (typeof module === 'object' && module && module.exports) module.exports = N;
  else raiz.RACHA_FISICA = N;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const PX_POR_U = 19;                                   // escala do desenho: a tampinha (raio 1,8 u) fica com ~34 px de raio
  const U = v => v * PX_POR_U;
  const TICKS_POR_S = 60, DT = 1 / TICKS_POR_S;           // passo fixo de 60 Hz (a taxa de tela mais comum)

  // A tampinha (todo mundo igual: cosmético não muda nada aqui)
  const TAMPINHA = Object.freeze({
    raio: U(1.8),                                         // u: o corpo
    massa: 1,                                             // a referência das massas
    vmax: U(13),                                          // u/s: a velocidade de corrida (M1: atravessa a quadra do 1v1 em ~4 s)
    arrancada: 0.06,                                      // s: de parada até a velocidade de corrida, com o analógico apontado
    freio: 0.045,                                         // s: da corrida até parar, com o analógico solto
  });
  // A bola
  const BOLA = Object.freeze({
    raio: U(1.15),                                        // u: um pouco mais que a metade da tampinha (fácil de ver no celular)
    massa: 1.6,                                           // mais pesada que a tampinha: encostar empurra, não arremessa (condução)
    teto: U(48),                                          // u/s: limite de segurança (acima do chute mais forte com embalo)
    parada: U(0.08),                                      // u/s: abaixo disso a bola para de vez
  });
  // O chute: define a velocidade de SAÍDA da bola (não soma com a que ela tinha)
  const CHUTE = Object.freeze({
    folga: U(0.75),                                       // u: o quanto a bola pode estar longe da borda da tampinha para o chute pegar
    passe: U(26.5),                                       // u/s: o passe (botão PASSE) — ~2× a corrida
    forte: U(40.5),                                       // u/s: o chute (botão CHUTE) — ~3,1× a corrida
    embalo: 0.35,                                         // fração da velocidade da tampinha na direção do chute que vai para a bola
    raspao: 0.2,                                          // fração da velocidade de lado que a bola tinha e que fica depois do chute
  });
  const ALCANCE = TAMPINHA.raio + BOLA.raio + CHUTE.folga;   // distância máxima entre os centros para o chute pegar

  // O piso: em quanto tempo a bola perde metade da velocidade (meia-vida, s)
  const MEIA_VIDA = Object.freeze({ quadra: 0.95, rua: 1.1 });   // quadra = Arena e Estádio; rua = cimento gasto (campos guardados)
  const fatorPiso = t => Math.pow(0.5, 1 / (TICKS_POR_S * t));   // quanto da velocidade fica a cada passo de 1/60 s

  // As batidas, par a par: e = restituição (quanto da velocidade de frente volta), mu = atrito de Coulomb (sem giro)
  const PAR = Object.freeze({
    bolaLinha: Object.freeze({ e: 0.55, mu: 0.2 }),       // a bola nas linhas da quadra (a parede invisível da bola)
    bolaTrave: Object.freeze({ e: 0.5, mu: 0.1 }),        // a bola na trave de ferro
    bolaRede: Object.freeze({ e: 0.1, mu: 0.4 }),         // a bola na rede de corda (segura)
    bolaTampinha: Object.freeze({ e: 0.12, mu: 0.15 }),   // a bola na tampinha
    tampinhaTampinha: Object.freeze({ e: 0.2, mu: 0 }),   // uma tampinha na outra
    tampinhaParede: Object.freeze({ e: 0.15, mu: 0 }),    // a tampinha no alambrado, na rede e nas traves
    bolaParedao: Object.freeze({ e: 0.8, mu: 0.2 }),      // o paredão do treino (rebatedor)
    bolaChinelo: Object.freeze({ e: 0.3, mu: 0.3 }),      // o gol de chinelos (campo antigo, guardado)
  });
  const LIMIAR_QUIQUE = U(0.25);                          // batida mais lenta que isso não quica (a bola não fica tremendo encostada)

  // O analógico: 256 direções (1 byte na rede); a força do dedo não muda a velocidade (é corrida ou parado)
  const DIRECOES = 256, PASSO_ANG = (2 * Math.PI) / DIRECOES, EPS_DIR = 1e-5;
  function direcao(mx, my) {
    if (!Number.isFinite(mx) || !Number.isFinite(my) || Math.hypot(mx, my) <= EPS_DIR) return { mx: 0, my: 0, k: -1 };
    const k = Math.round(Math.atan2(my, mx) / PASSO_ANG), a = k * PASSO_ANG;
    return { mx: Math.cos(a), my: Math.sin(a), k: ((k % DIRECOES) + DIRECOES) % DIRECOES };
  }

  // Movimento com aceleração limitada: a velocidade vai até a do analógico (dx, dy unitário ou zero) sem passar de
  // vmax/arrancada (apontando) ou vmax/freio (solto) de mudança por segundo. Depois, nunca acima de vmax: o empurrão de
  // uma batida não vira corrida (ninguém passa da velocidade de corrida pelas próprias pernas — bots também).
  function anda(q, dx, dy, vmax, dt) {
    const ativo = dx !== 0 || dy !== 0;
    const ax = dx * vmax - q.vx, ay = dy * vmax - q.vy, d = Math.hypot(ax, ay);
    const lim = (vmax / (ativo ? TAMPINHA.arrancada : TAMPINHA.freio)) * dt;
    if (d <= lim) { q.vx += ax; q.vy += ay; }
    else { q.vx += (ax * lim) / d; q.vy += (ay * lim) / d; }
    const v = Math.hypot(q.vx, q.vy);
    if (v > vmax) { q.vx *= vmax / v; q.vy *= vmax / v; }
  }

  // Batida de um corpo numa superfície parada; (nx, ny) = normal unitária da superfície para o corpo.
  // Impulso normal com restituição e impulso tangencial limitado pelo atrito de Coulomb (|jt| <= mu·jn). Sem giro.
  function bate(o, nx, ny, e, mu) {
    const vn = o.vx * nx + o.vy * ny;
    if (vn >= 0) return false;
    const ef = -vn < LIMIAR_QUIQUE ? 0 : e;
    const jn = -(1 + ef) * vn;
    o.vx += nx * jn; o.vy += ny * jn;
    if (mu > 0) {
      const tx = -ny, ty = nx, vt = o.vx * tx + o.vy * ty, lim = mu * jn;
      const jt = vt > lim ? -lim : vt < -lim ? lim : -vt;
      o.vx += tx * jt; o.vy += ty * jt;
    }
    return true;
  }
  // Círculo (o) contra um ponto/círculo parado de raio pr: separa e bate. Devolve se encostou.
  function batePonto(o, px, py, pr, e, mu) {
    let dx = o.x - px, dy = o.y - py;
    const rs = o.r + pr, d2 = dx * dx + dy * dy;
    if (d2 >= rs * rs) return false;
    let d = Math.sqrt(d2);
    if (d < 1e-9) { const v = Math.hypot(o.vx, o.vy); dx = v > 1e-9 ? -o.vx / v : 1; dy = v > 1e-9 ? -o.vy / v : 0; d = 1; }
    const nx = dx / d, ny = dy / d;
    o.x = px + nx * rs; o.y = py + ny * rs;
    bate(o, nx, ny, e, mu);
    return true;
  }
  // Círculo contra um segmento (parede fina): o ponto do segmento mais perto do centro.
  function bateSegmento(o, ax, ay, bx, by, e, mu) {
    const abx = bx - ax, aby = by - ay, l2 = abx * abx + aby * aby;
    const t = l2 > 0 ? Math.max(0, Math.min(1, ((o.x - ax) * abx + (o.y - ay) * aby) / l2)) : 0;
    return batePonto(o, ax + abx * t, ay + aby * t, 0, e, mu);
  }
  // Círculo preso DENTRO de uma caixa (a área onde a tampinha anda, a rede de segurança da bola).
  function bateCaixa(o, x0, y0, x1, y1, e, mu) {
    if (o.x < x0 + o.r) { o.x = x0 + o.r; bate(o, 1, 0, e, mu); }
    else if (o.x > x1 - o.r) { o.x = x1 - o.r; bate(o, -1, 0, e, mu); }
    if (o.y < y0 + o.r) { o.y = y0 + o.r; bate(o, 0, 1, e, mu); }
    else if (o.y > y1 - o.r) { o.y = y1 - o.r; bate(o, 0, -1, e, mu); }
  }
  // Círculo FORA de um retângulo sólido (o gol fechado, quando a tampinha não entra nele).
  function bateRetangulo(o, x0, y0, x1, y1, e, mu) {
    const cx = Math.max(x0, Math.min(o.x, x1)), cy = Math.max(y0, Math.min(o.y, y1));
    const dx = o.x - cx, dy = o.y - cy, d2 = dx * dx + dy * dy;
    if (d2 >= o.r * o.r) return false;
    if (d2 < 1e-9) {                                      // o centro entrou no retângulo: sai pelo lado mais perto
      const l = o.x - x0, r = x1 - o.x, t = o.y - y0, b = y1 - o.y, m = Math.min(l, r, t, b);
      if (m === l) { o.x = x0 - o.r; bate(o, -1, 0, e, mu); }
      else if (m === r) { o.x = x1 + o.r; bate(o, 1, 0, e, mu); }
      else if (m === t) { o.y = y0 - o.r; bate(o, 0, -1, e, mu); }
      else { o.y = y1 + o.r; bate(o, 0, 1, e, mu); }
      return true;
    }
    const d = Math.sqrt(d2), nx = dx / d, ny = dy / d;
    o.x = cx + nx * o.r; o.y = cy + ny * o.r;
    bate(o, nx, ny, e, mu);
    return true;
  }
  // Dois círculos com massa (tampinha × bola, tampinha × tampinha): separa na proporção das massas (deixando uma folga
  // pequena de 0,25 px e corrigindo 80% da sobra) e troca impulso normal com restituição e tangencial com atrito.
  const FOLGA_CONTATO = 0.25, CORRECAO = 0.8;
  function batemCorpos(a, b, e, mu) {
    let dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
    const rs = a.r + b.r;
    if (d >= rs) return false;
    if (d < 1e-6) {
      dx = a.vx - b.vx; dy = a.vy - b.vy; d = Math.hypot(dx, dy);
      if (d < 1e-6) { dx = 1; dy = 0; d = 1; }
      dx /= d; dy /= d; d = 1e-6; dx *= d; dy *= d;
    }
    const nx = dx / d, ny = dy / d;
    const ia = 1 / a.m, ib = 1 / b.m, is = ia + ib;
    const pen = Math.max(0, rs - d - FOLGA_CONTATO) * CORRECAO;
    a.x -= (nx * pen * ia) / is; a.y -= (ny * pen * ia) / is;
    b.x += (nx * pen * ib) / is; b.y += (ny * pen * ib) / is;
    const vn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
    if (vn >= 0) return true;
    const ef = -vn < LIMIAR_QUIQUE ? 0 : e;
    const j = (-(1 + ef) * vn) / is;
    a.vx -= j * ia * nx; a.vy -= j * ia * ny;
    b.vx += j * ib * nx; b.vy += j * ib * ny;
    if (mu > 0) {
      const tx = -ny, ty = nx, vt = (b.vx - a.vx) * tx + (b.vy - a.vy) * ty, lim = mu * j;
      let jt = -vt / is;
      if (jt > lim) jt = lim; else if (jt < -lim) jt = -lim;
      a.vx -= jt * ia * tx; a.vy -= jt * ia * ty;
      b.vx += jt * ib * tx; b.vy += jt * ib * ty;
    }
    return true;
  }

  // O chute: só pega com a bola no alcance; a bola sai na direção centro da tampinha → centro da bola com a velocidade do
  // botão + o embalo da tampinha nessa direção, e guarda só um pouco do que tinha de lado. Devolve se pegou.
  function chuta(q, b, forca, alcance) {
    let dx = b.x - q.x, dy = b.y - q.y, d = Math.hypot(dx, dy);
    if (d === 0) { dx = 1; dy = 0; d = 1; }
    if (d > (alcance === undefined ? ALCANCE : alcance)) return false;
    const ux = dx / d, uy = dy / d;
    const vq = Math.max(0, (q.vx || 0) * ux + (q.vy || 0) * uy);
    const vbn = b.vx * ux + b.vy * uy, px = b.vx - vbn * ux, py = b.vy - vbn * uy;
    const s = forca + CHUTE.embalo * vq;
    b.vx = ux * s + CHUTE.raspao * px; b.vy = uy * s + CHUTE.raspao * py;
    return true;
  }
  // O gatilho do chute: cada passo lê o que está apertado em bits (GATILHO.PASSE = 1, GATILHO.CHUTE = 2). Apertar arma o
  // chute daquele botão — o último apertado vale; os dois no mesmo passo, o CHUTE —; segurando, ele fica armado até a bola
  // entrar no alcance; depois que chutou, só um aperto novo arma de novo (um aperto = um chute).
  const GATILHO = Object.freeze({ PASSE: 1, CHUTE: 2 });
  const novoGatilho = () => ({ ant: 0, armado: 0, gasto: false });
  function gatilho(g, bits) {                             // devolve o que está armado agora (0, PASSE ou CHUTE)
    bits &= 3;
    const desceu = bits & ~g.ant; g.ant = bits;
    if (desceu & GATILHO.CHUTE) { g.armado = GATILHO.CHUTE; g.gasto = false; }
    else if (desceu & GATILHO.PASSE) { g.armado = GATILHO.PASSE; g.gasto = false; }
    if (!bits) { g.armado = 0; g.gasto = false; }        // tudo solto: zera
    else if (!(bits & g.armado)) g.armado = 0;           // soltou o que estava armado: só um aperto novo arma
    return g.gasto ? 0 : g.armado;
  }
  const gastaGatilho = g => { g.gasto = true; };          // o chute saiu: até um aperto novo, não arma mais

  // A velocidade de saída de um chute parado (para quem precisa prever: bots, treino, prévia)
  const saidaDoChute = forca => forca;

  // A bola perde velocidade pelo piso (fator por passo f, tk passos), respeita o teto e, devagar demais, para.
  function amortece(b, f, tk) {
    const k = Math.pow(f, tk);
    b.vx *= k; b.vy *= k;
    const v = Math.hypot(b.vx, b.vy);
    if (v > BOLA.teto) { b.vx *= BOLA.teto / v; b.vy *= BOLA.teto / v; }
    else if (v > 0 && v < BOLA.parada) { b.vx = 0; b.vy = 0; }
  }
  // Quantos subpassos neste passo: nada anda mais que 30% do raio da bola por subpasso (de 2 a 12).
  const subpassos = (vRef, dt) => Math.max(2, Math.min(12, Math.ceil((vRef * dt) / (BOLA.raio * 0.3))));

  // As quadras do RACHA (u). Regra própria: comprimento × largura por tamanho de time; a boca do gol cresce com a largura;
  // as marcas pintadas são frações da quadra (ver FISICA_RACHA.md, "Quadras").
  const DIM = [[52, 36], [64, 44], [78, 56], [92, 68]];
  const MARGEM_TAMPINHA = 6;                              // u: a tampinha pode sair da linha até aqui para buscar a bola
  function quadra(n) {
    const i = Math.min(4, Math.max(1, n | 0)) - 1, L = DIM[i][0], W = DIM[i][1];
    const boca = Math.round((0.24 * W + 3.8) * 100) / 100;
    const r2 = v => Math.round(v * 1000) / 1000;
    return Object.freeze({
      nome: (i + 1) + 'v' + (i + 1),
      bola: [L, W],                                       // dentro das linhas (as paredes da bola, com a boca dos gols aberta)
      jog: [L + 2 * MARGEM_TAMPINHA, W + 2 * MARGEM_TAMPINHA],   // onde a tampinha anda
      gol: [4.2, boca],                                   // [profundidade, boca entre os centros das traves]
      trave: 0.64,                                        // espessura (diâmetro) da trave
      rede: 0.3,                                          // espessura da rede
      marcas: Object.freeze({
        area: [r2(0.17 * L), r2(boca + 0.4 * W)],         // [fundo, altura]
        pequena: [r2(0.075 * L), r2(boca + 4)],
        penalti: r2(0.12 * L),                            // da linha do gol até a marca
        circulo: r2(0.14 * W),                            // o raio do círculo do meio
        saida: r2(0.14 * W),                              // o raio da barreira da saída (o próprio círculo)
        meiaLua: [r2(0.12 * L), r2(0.1 * W)],             // [centro (da linha do gol), raio]: só o pedaço de fora da área aparece
      }),
      saida: r2(0.21 * L),                                // u: do centro até onde a tampinha começa (treino livre e saída)
    });
  }

  return Object.freeze({
    VERSAO: 'FR-85', PX_POR_U, U, TICKS_POR_S, DT, TAMPINHA, BOLA, CHUTE, ALCANCE, MEIA_VIDA, fatorPiso, PAR, LIMIAR_QUIQUE,
    DIRECOES, direcao, anda, GATILHO, novoGatilho, gatilho, gastaGatilho, bate, batePonto, bateSegmento, bateCaixa, bateRetangulo, batemCorpos, chuta, saidaDoChute,
    amortece, subpassos, quadra, MARGEM_TAMPINHA,
  });
});
