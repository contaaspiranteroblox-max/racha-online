'use strict';
/* =====================================================================================================================
   RACHA v83 · OS BOTS DAS SALAS — agora no servidor.

   Até a v82 os bots das salas online eram calculados no aparelho do anfitrião. Com as salas 100%
   hospedadas, eles rodam aqui: mesmas regras, mesmos limites, mesmo alcance de chute dos humanos
   (o chute do bot passa pela MESMA validação do motor — o bot não tem privilégio nenhum).

   A inteligência segue o espírito dos bots do jogo (quem vai na bola, o goleiro com 3 ou mais,
   o apoio na formação, a saída ensaiada, o anti-pino), numa versão enxuta para o servidor:
   reação com atraso (o bot vê a bola de alguns ticks atrás), plano refeito a cada poucos ticks,
   mira com erro conforme o nível. Como no jogo, o chute sai na direção centro do corpo → centro
   da bola: para mirar, o bot se posiciona atrás da bola, do lado oposto ao alvo, e só bate quando
   está alinhado. Não usa tabela na parede nem chute de curva planejado (limitação registrada no
   relatório — no COM CURVA o bot chuta reto).
   ===================================================================================================================== */
const F = require('./fisica');

const NIVEIS = {
  facil:   { plano: 16, foco: 12, mira: 0.14, saida: 75, pino: 24 },
  dificil: { plano: 8,  foco: 5,  mira: 0.04, saida: 45, pino: 18 },
};
const CHUTE_CD_TICKS = 6;                            // o mínimo entre um chute e outro do mesmo bot
const ALINHA_COS = 0.82;                             // alinhado o bastante para bater (~35°)
const RQ_FORMA_F = { 1: [[0.22, 0]], 2: [[0.2, 0], [0.58, 0]], 3: [[0.2, -0.42], [0.2, 0.42], [0.62, 0]], 4: [[0.2, -0.43], [0.2, 0.43], [0.62, -0.43], [0.62, 0.43]] };

function criar(nivel) {
  return { nivel: NIVEIS[nivel] ? nivel : 'dificil', planoT: 0, alvo: null, pinoT: 0, ultChute: -99 };
}
const cl = (v, a, b) => Math.max(a, Math.min(b, v));

function vai(q, x, y) {
  const dx = x - q.x, dy = y - q.y, d = Math.hypot(dx, dy);
  if (d < q.r * 0.35) { q.mx = q.my = 0; return; }
  q.mx = dx / d; q.my = dy / d;
}

/* a bola que o bot enxerga (com o atraso da reação do nível) */
function bolaVista(p, ai) {
  const h = p.hist, nv = NIVEIS[ai.nivel], i = Math.max(0, h.length - 2 - 2 * nv.foco);
  return { x: h[i] != null ? h[i] : p.B.x, y: h[i + 1] != null ? h[i + 1] : p.B.y };
}

/* o chute com alvo: anda para trás da bola no lado oposto ao alvo e bate quando alinha.
   Devolve true enquanto está cuidando da jogada (o chamador não faz mais nada neste passo). */
function chutarEm(p, q, ai, tx, ty, forte) {
  const B = p.B, nv = NIVEIS[ai.nivel];
  const ex = tx - B.x, ey = ty - B.y, ed = Math.hypot(ex, ey) || 1;   // a linha do chute (bola → alvo)
  const bx = B.x - q.x, by = B.y - q.y, bd = Math.hypot(bx, by) || 1; // a linha do corpo (corpo → bola)
  const alinhado = (ex * bx + ey * by) / (ed * bd) >= ALINHA_COS;
  const perto = bd <= F.ALCANCE_CHUTE;
  if (perto && alinhado && p.tick - ai.ultChute >= CHUTE_CD_TICKS) {
    const erro = (Math.random() * 2 - 1) * nv.mira;   // a mira do nível: gira um pouco o corpo em volta da bola
    if (erro) {
      const c = Math.cos(erro), s = Math.sin(erro), px = q.x - B.x, py = q.y - B.y;
      q.x = B.x + px * c - py * s; q.y = B.y + py * c + px * s;   // (deslize de mira ≤ alguns px, como o toque humano)
    }
    if (p.chuta(q, forte ? F.FORCA_POWER : F.FORCA_KICK)) { ai.ultChute = p.tick; ai.planoT = p.tick + nv.plano; return true; }
  }
  if (perto && alinhado) { q.mx = q.my = 0; return true; }        // no lugar, esperando o ritmo do chute
  const ax = B.x - (ex / ed) * (q.r + B.r) * 1.15, ay = B.y - (ey / ed) * (q.r + B.r) * 1.15;   // o ponto de mira
  vai(q, ax, ay);
  return true;
}

function livre(p, time, alvo) {                      // nenhum adversário na linha do passe
  const B = p.B, ex = alvo.x - B.x, ey = alvo.y - B.y, L2 = ex * ex + ey * ey || 1;
  for (const o of p.jog) {
    if (o.time === time) continue;
    const t = ((o.x - B.x) * ex + (o.y - B.y) * ey) / L2;
    if (t <= 0 || t > 1.05) continue;
    if (Math.hypot(B.x + ex * t - o.x, B.y + ey * t - o.y) < o.r + B.r + F.U(1)) return false;
  }
  return true;
}

function seguraFormacao(p, q, s) {                   // na saída: volta para o lugar e para
  const G = p.G, f = RQ_FORMA_F[p.n][Math.min(q.k, p.n - 1)];
  const x = G.CX + s * f[0] * ((G.LX1 - G.LX0) / 2), y = G.CY + f[1] * ((G.LY1 - G.LY0) / 2);
  if (Math.hypot(x - q.x, y - q.y) > q.r) vai(q, x, y); else q.mx = q.my = 0;
}

function planeja(p, q, bv) {
  const G = p.G, B = p.B, rr = q.r + B.r;
  const s = q.time === 0 ? -1 : 1;                   // o lado do próprio gol
  const golX = q.time === 0 ? G.LX0 : G.LX1;         // a linha do próprio gol
  const atacaX = q.time === 0 ? G.LX1 : G.LX0;       // a linha do gol que ele ataca
  const L = (G.LX1 - G.LX0) / 2, A = (G.LY1 - G.LY0) / 2;
  const comBola = Math.hypot(B.x - q.x, B.y - q.y) <= F.ALCANCE_CHUTE * 1.05;
  const distGolDeles = Math.hypot(atacaX - B.x, G.CY - B.y);

  /* o goleiro (3v3 e 4v4): na linha do gol, acompanhando a bola; sai para cortar e afastar */
  if (q.papel === 'gk') {
    const gx = golX + (q.time === 0 ? 1 : -1) * rr * 2.2, gh = (G.GOL_Y1 - G.GOL_Y0) / 2;
    const vindo = (golX - B.x) * B.vx < 0 && Math.abs(B.vx) > F.U(6) &&
      Math.abs(B.y + B.vy * ((golX - B.x) / (B.vx || 1)) - G.CY) < gh + B.r * 2;
    if (vindo) {
      const t = Math.abs((golX - B.x) / (B.vx || 1));
      return { tipo: 'move', x: gx, y: G.CY + cl(B.y + B.vy * t - G.CY, -gh, gh) };
    }
    if (comBola) {                                   // a bola chegou: afasta pelo lado, para a frente
      const sy = B.y >= G.CY ? 1 : -1;
      return { tipo: 'chute', x: atacaX * 0.7 + golX * 0.3, y: G.CY + sy * A * 0.8, forte: true };
    }
    if (Math.abs(B.x - golX) < L * 0.35) return { tipo: 'move', x: B.x, y: B.y };   // vai buscar na área
    return { tipo: 'move', x: gx, y: G.CY + cl(bv.y - G.CY, -A * 0.5, A * 0.5) };
  }

  /* quem vai na bola: o mais perto do time (fora o goleiro, que já tem a dele) */
  let chaser = null, md = 1e9;
  for (const o of p.jog) {
    if (o.time !== q.time || o.papel === 'gk') continue;
    const d = Math.hypot(bv.x - o.x, bv.y - o.y);
    if (d < md) { md = d; chaser = o; }
  }
  if (chaser === q) {
    if (comBola) {
      if (distGolDeles < L * 1.15) {                 // perto: bate para o canto mais livre
        const gh = (G.GOL_Y1 - G.GOL_Y0) / 2, yAlvo = B.y > G.CY ? G.CY - gh * 0.55 : G.CY + gh * 0.55;
        return { tipo: 'chute', x: atacaX, y: yAlvo, forte: true };
      }
      let melhor = null, nota = -1e9;                // o passe: o companheiro mais à frente e livre
      for (const o of p.jog) {
        if (o === q || o.time !== q.time || o.papel === 'gk') continue;
        const frente = (B.x - o.x) * s;              // > 0: ele está mais perto do gol deles que a bola
        const notaO = frente / L + (livre(p, q.time, o) ? 1 : 0) - Math.hypot(o.x - B.x, o.y - B.y) / (L * 4);
        if (notaO > nota) { nota = notaO; melhor = o; }
      }
      if (melhor && nota > -0.4) return { tipo: 'chute', x: melhor.x + melhor.vx * 0.25, y: melhor.y + melhor.vy * 0.25 };
      return { tipo: 'conduz', x: atacaX, y: G.CY }; // sem opção: conduz para o meio do ataque
    }
    const t = Math.min(1.2, Math.hypot(bv.x - q.x, bv.y - q.y) / F.VEL_JOG);   // corta o caminho da bola
    return { tipo: 'move', x: B.x + B.vx * t * 0.5, y: B.y + B.vy * t * 0.5 };
  }

  /* o apoio: a formação deslocada para o lado da bola */
  const f = RQ_FORMA_F[p.n][Math.min(q.k, p.n - 1)];
  return {
    tipo: 'move',
    x: cl(G.CX + s * f[0] * L + (bv.x - G.CX) * 0.3, G.GL + q.r, G.GR - q.r),
    y: cl(G.CY + f[1] * A + (bv.y - G.CY) * 0.35, G.GT + q.r, G.GB - q.r),
  };
}

function decide(p, q) {                              // (uma vez por passo, para cada bot — chamado pelo motor)
  const ai = q.botAi, nv = NIVEIS[ai.nivel], G = p.G, B = p.B;
  const s = q.time === 0 ? -1 : 1;
  const atacaX = q.time === 0 ? G.LX1 : G.LX0;

  /* ---- a saída: o batedor espera e toca; os outros seguram a formação ---- */
  if (p.estado === 'saida') {
    if (q.time === p.saidaTime && q.k === 0) {
      if (p.tick - p.saidaT0 < nv.saida) {           // ainda esperando: cola na bola
        if (Math.hypot(B.x - q.x, B.y - q.y) > (q.r + B.r) * 1.1) vai(q, B.x - (atacaX - B.x > 0 ? 1 : -1) * (q.r + B.r), B.y);
        else q.mx = q.my = 0;
        return;
      }
      let melhor = null, md = 1e9;                   // toca no companheiro mais à frente; sozinho, para a frente
      for (const o of p.jog) {
        if (o === q || o.time !== q.time) continue;
        const d = Math.hypot(o.x - B.x, o.y - B.y);
        if (d < md) { md = d; melhor = o; }
      }
      const alvo = melhor && (B.x - melhor.x) * s > 0 ? melhor : { x: atacaX, y: G.CY + (Math.random() - 0.5) * (G.GOL_Y1 - G.GOL_Y0) };
      chutarEm(p, q, ai, alvo.x + (alvo.vx || 0) * 0.3, alvo.y + (alvo.vy || 0) * 0.3, false);
      return;
    }
    seguraFormacao(p, q, s); return;
  }
  if (p.estado !== 'jogo') { q.mx = q.my = 0; return; }

  /* ---- o anti-pino: a bola parada do lado por muito tempo, tira de lá ---- */
  const perto = Math.hypot(B.x - q.x, B.y - q.y) <= F.ALCANCE_CHUTE;
  if (perto && Math.hypot(B.vx, B.vy) < F.U(1)) {
    if (++ai.pinoT >= nv.pino) {
      chutarEm(p, q, ai, atacaX, G.CY + (B.y >= G.CY ? 1 : -1) * (G.LY1 - G.LY0) * 0.3, true);
      ai.pinoT = 0; return;
    }
  } else ai.pinoT = 0;

  /* ---- o plano: refeito a cada poucos ticks (com a bola vista com atraso) ---- */
  const bv = bolaVista(p, ai);
  if (p.tick >= ai.planoT || !ai.alvo) { ai.planoT = p.tick + nv.plano; ai.alvo = planeja(p, q, bv); }

  const al = ai.alvo;
  if (al.tipo === 'chute') { chutarEm(p, q, ai, al.x, al.y, al.forte); return; }
  if (al.tipo === 'conduz') {                        // conduz: por trás da bola, empurrando com o corpo
    if (perto) { const d = Math.hypot(al.x - B.x, al.y - B.y) || 1; vai(q, B.x - (al.x - B.x) / d * B.r, B.y - (al.y - B.y) / d * B.r); return; }
    vai(q, B.x, B.y); return;
  }
  vai(q, al.x, al.y);
}

module.exports = { criar, decide, NIVEIS };
