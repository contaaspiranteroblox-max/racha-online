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

   v94 · com o motor próprio (p.v94) o bot segue as regras do motor como qualquer um: o chute é um toque no botão (o motor
   decide se a bola está no alcance e respeita o intervalo); a mira do nível gira a LINHA do chute em volta da bola (antes
   girava o corpo do bot — um teleporte de alguns px, que o motor novo não aceita); a tampinha não diminui a velocidade pela
   inclinação, então o bot para a tempo (a distância de frenagem) em vez de esbarrar na bola parada; na saída cada um volta
   para o lugar da formação do motor.
   ===================================================================================================================== */
/* v99 · OS CHUTES DO RACHÃO (p.cr: a sala ligou a cavadinha, a curva e/ou o super chute): o bot usa os três como gente —
   a CAVADINHA quando tem alguém no caminho do gol (ou do passe) entre ele e o alvo, a CURVA às vezes no chute ao gol
   (entortando para dentro da boca) e o SUPER no chute de longe: segura o botão enquanto chega na bola e solta quando está
   alinhado (q.suBot é o botão; o motor carrega e chuta igual ao de quem joga — N.crTick). Desistiu do lance carregando,
   cancela sem chutar. Sem a sala ligar, nada aqui muda. */
const F = require('./fisica');
const K = p => p.C || F;                             // v92: os números do perfil da sala (o padrão é igual ao da fisica.js)

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

function vai(q, x, y, p) {
  const dx = x - q.x, dy = y - q.y, d = Math.hypot(dx, dy);
  if (d < q.r * 0.35) { q.mx = q.my = 0; return; }
  if (p && p.v94) {                                  // v94: chega sem passar do ponto (a frenagem do motor: v² ÷ 2a)
    const v2 = q.vx * q.vx + q.vy * q.vy;
    if (q.vx * dx + q.vy * dy > 0 && d <= v2 / (2 * p.C.A_PARA) + q.r * 0.05) { q.mx = q.my = 0; return; }
  }
  q.mx = dx / d; q.my = dy / d;
}

/* a bola que o bot enxerga (com o atraso da reação do nível) */
function bolaVista(p, ai) {
  const h = p.hist, nv = NIVEIS[ai.nivel], i = Math.max(0, h.length - 2 - 2 * nv.foco);
  return { x: h[i] != null ? h[i] : p.B.x, y: h[i + 1] != null ? h[i + 1] : p.B.y };
}

/* v94: há outra tampinha na linha do chute, logo à frente da bola? */
function bloqueio(p, q, ex, ey) { return folgaDe(p, q, ex, ey) < 1.1; }
// a menor folga de lado (em raios de tampinha + bola) entre a linha (ex, ey) saindo da bola e outra tampinha logo à frente
// (adversário ou companheiro: chutar em quem está encostado na bola, de qualquer time, é a bola morrer ali)
function folgaDe(p, q, ex, ey) {
  const B = p.B, ed = Math.hypot(ex, ey) || 1, ux = ex / ed, uy = ey / ed;
  let f = 99;
  for (const o of p.jog) {
    if (o === q) continue;
    const ox = o.x - B.x, oy = o.y - B.y, ao = ox * ux + oy * uy, lat = Math.abs(ox * uy - oy * ux) / (o.r + B.r);
    if (ao <= 0 || ao > (o.r + B.r) * 2.7) continue;   // (até ~1,6 m na frente da bola)
    if (lat < f) f = lat;
  }
  return f;
}

/* o chute com alvo: anda para trás da bola no lado oposto ao alvo e bate quando alinha.
   Devolve true enquanto está cuidando da jogada (o chamador não faz mais nada neste passo). */
// v99: alguém (do outro time) no caminho da bola até o alvo, longe o bastante da bola para a cavadinha passar por cima
function noCaminho(p, q, ex, ey) {
  const B = p.B, L = Math.hypot(ex, ey) || 1, ux = ex / L, uy = ey / L;
  for (const o of p.jog) {
    if (o === q || o.time === q.time) continue;
    const ox = o.x - B.x, oy = o.y - B.y, ao = ox * ux + oy * uy, lat = Math.abs(ox * uy - oy * ux);
    if (ao > (o.r + B.r) * 1.8 && ao < Math.min(L, (o.r + B.r) * 9) && lat < o.r + B.r * 2) return true;
  }
  return false;
}
function chutarEm(p, q, ai, tx, ty, forte, gol) {
  const B = p.B, nv = NIVEIS[ai.nivel], cr = !p.v94 && p.cr && q.cr ? p.cr : null;
  let ex = tx - B.x, ey = ty - B.y;
  if (p.v94) {                                       // v94: a mira do nível gira a linha do chute (uma vez por plano)
    if (ai.erroT !== ai.planoT) { ai.erroT = ai.planoT; ai.erro94 = (Math.random() * 2 - 1) * nv.mira; }
    const c = Math.cos(ai.erro94), s = Math.sin(ai.erro94), rx = ex * c - ey * s; ey = ey * c + ex * s; ex = rx;
  }
  const bx = B.x - q.x, by = B.y - q.y, bd = Math.hypot(bx, by) || 1; // a linha do corpo (corpo → bola): é por ela que a bola sai
  // v94: um adversário encostado na frente da bola, na linha por onde ela sairia. Com o motor próprio a bola que chega numa
  // tampinha parada "morre no pé" (o domínio): chutar nele é devolver a bola fraca, e dois bots de frente ficavam chutando
  // um no outro sem fim. Então o bot não chuta: dá a volta na bola até a linha do corpo passar do lado dele (a linha que
  // ele procura fica 50° para o lado em que o adversário não está).
  let travado = false;
  if (p.v94 && bloqueio(p, q, bx, by)) {
    travado = true;
    let melhor = -1;
    for (const g of [0.9, -0.9]) {
      const c2 = Math.cos(g), s2 = Math.sin(g), lx = bx * c2 - by * s2, ly = by * c2 + bx * s2, f = folgaDe(p, q, lx, ly);
      if (f > melhor) { melhor = f; ex = lx; ey = ly; }
    }
  }
  const ed = Math.hypot(ex, ey) || 1;                // a linha do chute (bola → alvo)
  let alinhado = !travado && (ex * bx + ey * by) / (ed * bd) >= ALINHA_COS;
  // v95: sem ninguém marcando (nenhum adversário a 6 raios da bola), o chute no gol só sai se vai entrar na boca (ver naBoca);
  // marcado, bate como antes (esperar o alinhamento perfeito com alguém em cima é perder a bola)
  if (alinhado && gol && !p.jog.some(o => o.time !== q.time && Math.hypot(o.x - B.x, o.y - B.y) < q.r * 6)) alinhado = naBoca(p, bx / bd, by / bd, tx);
  const perto = bd <= K(p).ALCANCE_CHUTE;
  if (cr && cr.super && gol && !travado) {           // v99: o super no chute de longe — carrega chegando, solta alinhado
    if (ai.supPlano !== ai.planoT && !q.cr.segura) {   // (carregando, a decisão fica: o plano novo não sorteia de novo)
      ai.supPlano = ai.planoT;
      const G = p.G, longe = Math.hypot(tx - B.x, ty - B.y) > (G.LX1 - G.LX0) * 0.32;
      ai.querSuper = longe && Math.random() < (ai.nivel === 'facil' ? 0.35 : 0.6); ai.supAlvo = 18 + Math.floor(Math.random() * 27);
    }
    if (ai.querSuper && (q.cr.segura || bd < (q.r + B.r) * 6)) {
      if (perto && alinhado && q.cr.cT >= ai.supAlvo && p.tick - ai.ultChute >= CHUTE_CD_TICKS) {
        extrasDoChute(p, q, cr, ex, ey, gol); ai.soltar = true; ai.querSuper = false; ai.ultChute = p.tick; ai.planoT = p.tick + nv.plano; return true;   // (soltou: o motor chuta)
      }
      q.suBot = true;                                  // segurando
      if (perto && alinhado) { q.mx = q.my = 0; return true; }
    }
  }
  if (perto && alinhado && p.tick - ai.ultChute >= CHUTE_CD_TICKS) {
    if (cr) extrasDoChute(p, q, cr, ex, ey, gol);   // v99: a cavadinha e a curva (armadas antes do chute)
    const erro = p.v94 ? 0 : (Math.random() * 2 - 1) * nv.mira;   // a mira do nível: gira um pouco o corpo em volta da bola
    if (erro) {
      const c = Math.cos(erro), s = Math.sin(erro), px = q.x - B.x, py = q.y - B.y;
      q.x = B.x + px * c - py * s; q.y = B.y + py * c + px * s;   // (deslize de mira ≤ alguns px, como o toque humano)
    }
    if (p.chuta(q, forte ? K(p).FORCA_POWER : K(p).FORCA_KICK)) { ai.ultChute = p.tick; ai.planoT = p.tick + nv.plano; return true; }
  }
  if (perto && alinhado) { q.mx = q.my = 0; return true; }        // no lugar, esperando o ritmo do chute
  const ax = B.x - (ex / ed) * (q.r + B.r) * 1.15, ay = B.y - (ey / ed) * (q.r + B.r) * 1.15;   // o ponto de mira
  // v95: parado perto do ponto de mira (o vai para a 0,35 raio dele) e ainda fora do alcance — encostado na beira, sem passar
  // do ponto —, o bot ficava ali para sempre: encosta na bola
  if (!perto && Math.hypot(ax - q.x, ay - q.y) < q.r * 0.35 + 1) { const d = bd || 1; q.mx = bx / d; q.my = by / d; return true; }
  vai(q, ax, ay, p);
  return true;
}

// v99: arma a cavadinha (alguém no caminho) e, no chute ao gol, às vezes a curva para dentro da boca
function extrasDoChute(p, q, cr, ex, ey, gol) {
  const s = q.cr, B = p.B, G = p.G;
  if (cr.lob && noCaminho(p, q, ex, ey)) s.lob = true;
  if (cr.curva && gol && !s.lob && Math.random() < 0.4) {
    const L = Math.hypot(ex, ey) || 1, ux = ex / L, uy = ey / L, cx = (ex > 0 ? G.LX1 : G.LX0) - B.x, cy = G.CY - B.y;
    const lado = Math.sign(ux * cy - uy * cx);        // (girar para o lado do meio do gol)
    if (lado) s.curva = lado;
  }
}
// v95: a linha do corpo (dx, dy, unitária) leva a bola para dentro da boca do gol da linha x = gx? (com folga de 1,3 bola das
// traves). O campo cresceu 30% e o gol voltou ao tamanho de antes: com a tolerância de ~35° do alinhado, o bot chutava de
// lado, da linha de fundo, e a bola batia na trave e voltava — às vezes sem parar.
function naBoca(p, dx, dy, gx) {
  const B = p.B, G = p.G, ux = gx - B.x;
  if (dx * ux <= 0) return false;
  const y = B.y + ux / dx * dy, m = B.r * 1.3;
  return y > G.GOL_Y0 + m && y < G.GOL_Y1 - m;
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
  let x = G.CX + s * f[0] * ((G.LX1 - G.LX0) / 2), y = G.CY + f[1] * ((G.LY1 - G.LY0) / 2);
  if (p.v94 && q.lugar94) { x = q.lugar94.x; y = q.lugar94.y; }   // v94: o lugar da formação do motor
  if (Math.hypot(x - q.x, y - q.y) > q.r) vai(q, x, y, p); else q.mx = q.my = 0;
}

function planeja(p, q, bv) {
  const G = p.G, B = p.B, rr = q.r + B.r;
  const s = q.time === 0 ? -1 : 1;                   // o lado do próprio gol
  const golX = q.time === 0 ? G.LX0 : G.LX1;         // a linha do próprio gol
  const atacaX = q.time === 0 ? G.LX1 : G.LX0;       // a linha do gol que ele ataca
  const L = (G.LX1 - G.LX0) / 2, A = (G.LY1 - G.LY0) / 2;
  const comBola = Math.hypot(B.x - q.x, B.y - q.y) <= K(p).ALCANCE_CHUTE * 1.05;
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
      // perto: bate para o canto mais livre. v95: "perto" é medido pela boca do gol (2,5 bocas = o 1,15 meio campo de antes em
      // todos os tamanhos): o campo cresceu 30% e o gol voltou ao tamanho de antes — de 1,15 meio campo o bot chutava de
      // longe demais para o gol de antes e quase não fazia gol
      if (distGolDeles < Math.min(L * 1.15, (G.GOL_Y1 - G.GOL_Y0) * 2.5)) {
        const gh = (G.GOL_Y1 - G.GOL_Y0) / 2, yAlvo = B.y > G.CY ? G.CY - gh * 0.55 : G.CY + gh * 0.55;
        return { tipo: 'chute', x: atacaX, y: yAlvo, forte: true, gol: true };
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
    const t = Math.min(1.2, Math.hypot(bv.x - q.x, bv.y - q.y) / K(p).VEL_JOG);   // corta o caminho da bola
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
  q.suBot = false; if (q.botAi) q.botAi.soltar = false;   // v99: o botão do super (só fica segurado enquanto o lance pede)
  decide1(p, q);
  if (q.cr && q.cr.segura && !q.suBot && !q.botAi.soltar) { q.cr.segura = false; q.cr.cT = 0; }   // v99: desistiu do lance: cancela sem chutar
}
function decide1(p, q) {
  const ai = q.botAi, nv = NIVEIS[ai.nivel], G = p.G, B = p.B;
  const s = q.time === 0 ? -1 : 1;
  const atacaX = q.time === 0 ? G.LX1 : G.LX0;

  /* ---- a saída: o batedor espera e toca; os outros seguram a formação ---- */
  if (p.estado === 'saida') {
    if (q.time === p.saidaTime && q.k === 0) {
      if (p.tick - p.saidaT0 < nv.saida) {           // ainda esperando: cola na bola
        if (Math.hypot(B.x - q.x, B.y - q.y) > (q.r + B.r) * 1.1) vai(q, B.x - (atacaX - B.x > 0 ? 1 : -1) * (q.r + B.r) * (p.v94 ? 1.05 : 1), B.y, p);
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
  const perto = Math.hypot(B.x - q.x, B.y - q.y) <= K(p).ALCANCE_CHUTE;
  if (perto && Math.hypot(B.vx, B.vy) < F.U(1)) {
    // v95: presa de verdade (a bola parada entre ele e a parede, sem como dar a volta nela): depois de ~1 s chuta como está,
    // pela linha do corpo — antes o bot podia ficar empurrando a bola contra a parede para sempre
    ai.presoT = (ai.presoT | 0) + 1;
    if (ai.presoT >= nv.pino * 3 && p.tick - ai.ultChute >= CHUTE_CD_TICKS && p.chuta(q, K(p).FORCA_KICK)) { ai.ultChute = p.tick; ai.presoT = 0; ai.pinoT = 0; ai.planoT = p.tick + nv.plano; return; }
    if (++ai.pinoT >= nv.pino) {
      chutarEm(p, q, ai, atacaX, G.CY + (B.y >= G.CY ? 1 : -1) * (G.LY1 - G.LY0) * 0.3, true);
      ai.pinoT = 0; return;
    }
  } else { ai.pinoT = 0; ai.presoT = 0; }

  /* ---- o plano: refeito a cada poucos ticks (com a bola vista com atraso) ---- */
  const bv = bolaVista(p, ai);
  if (p.tick >= ai.planoT || !ai.alvo) { ai.planoT = p.tick + nv.plano; ai.alvo = planeja(p, q, bv); }

  const al = ai.alvo;
  if (al.tipo === 'chute') { chutarEm(p, q, ai, al.x, al.y, al.forte, al.gol); return; }
  if (al.tipo === 'conduz') {                        // conduz: por trás da bola, empurrando com o corpo
    if (perto) { const d = Math.hypot(al.x - B.x, al.y - B.y) || 1; vai(q, B.x - (al.x - B.x) / d * B.r, B.y - (al.y - B.y) / d * B.r); return; }
    vai(q, B.x, B.y); return;
  }
  vai(q, al.x, al.y, p);
}

module.exports = { criar, decide, NIVEIS };
