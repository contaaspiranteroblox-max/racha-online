'use strict';
/* =====================================================================================================================
   RACHA v83 · SALAS 100% HOSPEDADAS — o motor autoritativo das salas (pública, privada e ranqueada).

   Este arquivo é um PORTE FIEL da simulação que o aparelho do anfitrião rodava até a v82
   (app/public/game/racha.html: physicsStep, rqPre/rqMove/rqParedes/rqColide, rqToque/rqChuta/rqGol/rqLance,
   a máquina de estados saida/jogo/gol/fim, o modo COM CURVA e a fila de comandos net49Control).
   A intenção é preservar a jogabilidade original do RACHA: quem jogava na v82 não sente diferença —
   só que agora NINGUÉM é anfitrião: todos os aparelhos mandam comandos e recebem quadros do servidor.

   O que muda em relação à v82 (o plano "SALAS 100% HOSPEDADAS NO SERVIDOR"):
     · o criador da sala NÃO simula mais nada: ele é um jogador comum durante a partida
       (a função de administrar a sala — configurar, expulsar, começar — continua com ele e pode ser
       transferida, mas a SIMULAÇÃO nunca sai do servidor);
     · se o criador ficar sem internet, só ele cai: um bot assume a tampinha dele e a partida segue;
     · placar, relógio, gols, autoria, prorrogação e fim nascem aqui — o servidor não aceita
       snapshot nem finish de aparelho nenhum (quem mandar vira registro de suspeito, sem banimento
       automático);
     · passo fixo de 1/60 s (o mesmo TIME_STEP do jogo), independente do FPS de cada celular;
     · quadros no formato clássico (o que o convidado da v82 já renderiza: predição local,
       reconciliação, interpolação e suavização já existem no cliente) a 30 por segundo.

   Fidelidade ao jogo (conferida função a função contra o racha.html):
     · velocidade da tampinha ADITIVA com teto (rqPre), direção quantizada em 32 setores;
     · subdivisão dinâmica do passo (2 a 12 subpassos) com colisão dupla por subpasso;
     · bola: desaceleração do campo, o teto de velocidade (46,75 u/s desde a v87.1), giro com amortecimento angular, atrito que gira;
     · gol: a bola INTEIRA cruzando a linha na altura da boca, avaliado a cada subpasso (golCruzou);
     · saída: formações RQ_FORMA, barreira do meio/círculo (REGRA55), relógio livre após 8 s;
     · autoria: o último toque decide; desvio em chute que ia no gol não é gol contra (RQ_DESVIO_*);
       assistência até ASSIST_TICKS antes, sem adversário no meio;
     · fila de comandos do convidado: seq, palpite de até 4 passos, salto de seq perdida, descarte
       de atrasados sem perder o chute, congelamento após 350 ms de silêncio;
     · botões PASSE/CHUTE com a máquina aperta/segura/solta (COOLDOWN_BOTAO) e o chute ao segurar
       quando a bola entra no alcance; COM CURVA: carga de 1,2 s, chute ao soltar, 0,35 s armado.

   Limitações honestas (também constam no relatório):
     · as salas só abrem FUTEBOL e COM CURVA (MODOS_SALA da turma): vôlei/americano/basquete/ginga
       não existem em sala nem aqui;
     · o número de subpassos usa o jogador mais veloz como referência (no aparelho era a tampinha
       local do anfitrião): igual ou mais cuidadoso, nunca menos;
     · os mapas de sala são a ARENA e o ESTÁDIO, que têm a mesma geometria e a mesma bola (0,99).
   ===================================================================================================================== */
const F = require('./fisica');
const BotSala = require('./bot');

const STEP = F.DT;                                   // 1/60 s — o passo fixo da simulação
const TPS = 60;
const COOLDOWN_BOTAO = 0.02;                         // s: o mínimo entre trocas de estado dos botões (o do jogo)
const ASSIST_TICKS = 600;                            // o passe vale assistência até 10 s antes do gol
const RQ_DESVIO_TK = 6, RQ_DESVIO_JANELA = 120;      // o toque curto (desvio) · o gol logo depois do desvio
const RQ_GOL_TICKS = 120, RQ_FIM_TICKS = 80;         // 2 s de comemoração · 1,3 s de tela de fim
const SAIDA_LIVRE_TICKS = 480;                       // ninguém deu a saída em 8 s: a bola fica livre
const CV_CARGA_S = 1.2, CV_ARMA_S = 0.35;            // curva: s para carregar tudo · s armado sem a bola no alcance
const CV_FORCA = F.FORCA_POWER;                      // a força do chute de curva (a mesma do CHUTE)
const CV_W = [0.2, 1], CV_T = [0.45, 0.9];           // efeito (rad/s) e duração (s): do toque leve à carga cheia
const cvW = c => CV_W[0] + (CV_W[1] - CV_W[0]) * c, cvT = c => CV_T[0] + (CV_T[1] - CV_T[0]) * c;
const FORCA_MINIMA_MS = 33;                          // 2 passos: o mínimo entre chutes aceitos do MESMO jogador
const SILENCIO_MS = 350;                             // sem comando por mais que isso: a tampinha para (a regra do jogo)
const MAX_CMD_S = 120;                               // teto de comandos por segundo por jogador (o jogo manda ~30)
const FILA_MAX = 120;                                // o tamanho máximo da fila de comandos (o do jogo)
const SNAP_A_CADA = 2;                               // 1 quadro a cada 2 passos = 30 por segundo (o ritmo da v82)
const RQ_FORMA = { 1: [[0.22, 0]], 2: [[0.2, 0], [0.58, 0]], 3: [[0.2, -0.42], [0.2, 0.42], [0.62, 0]], 4: [[0.2, -0.43], [0.2, 0.43], [0.62, -0.43], [0.62, 0.43]] };
const MARCAS_SAIDA_U = [8, 10, 12, 13.5];            // o raio da barreira da saída por tamanho (MARCAS_MODO.saida)
const META_PADRAO = 3;                               // futebol e com curva: primeiro a 3

const ns1 = v => Math.round(v * 10) / 10, ns3 = v => Math.round(v * 1000) / 1000;

/* ---------- O motor compartilhado: um relógio de 60 Hz para TODAS as partidas de sala ----------
   (medido em v83_medida.mjs: ~0,01 ms por passo num 2v2 — um núcleo aguenta centenas de salas) */
const MOTOR = {
  set: new Set(), timer: null,
  add(p) {
    this.set.add(p);
    if (!this.timer) {
      this.timer = setInterval(() => {
        for (const q of this.set) { try { q.passo(); } catch (e) { q.log('erro no passo da partida: ' + (e && e.message)); } }
      }, 1000 / TPS);
      if (this.timer.unref) this.timer.unref();
    }
  },
  del(p) { this.set.delete(p); if (!this.set.size && this.timer) { clearInterval(this.timer); this.timer = null; } },
};

class PartidaSala {
  /* o = {n, jogo, map, tempo, regra, ranked, r80:{seg,prorrog}, bots,
          jogadores:[{netId|null, nome, bot}] (2n, na ordem do roster: 0..n-1 time 0),
          agora(), decorrido(), log, suspeito(id, tipo, det),
          onSnapshot(data), onGol(info), onAviso(txt), onFim(resultado)} */
  constructor(o) {
    this.n = Math.min(4, Math.max(1, o.n | 0));
    this.jogo = o.jogo === 'curva' ? 'curva' : 'futebol';
    this.map = o.map | 0;
    this.G = F.novoCampo(this.n);                    // ARENA e ESTÁDIO: mesma geometria e mesma bola
    this.G.circ = F.U(MARCAS_SAIDA_U[this.n - 1]);   // o círculo da barreira da saída
    this.agora = o.agora || (() => Date.now());
    this.decorrido = o.decorrido || null;            // v80: o relógio oficial (ms, sem as pausas)
    this.log = o.log || (() => {});
    this.suspeito = o.suspeito || (() => {});
    this.onSnapshot = o.onSnapshot || (() => {});
    this.onGol = o.onGol || (() => {});
    this.onAviso = o.onAviso || (() => {});
    this.onFim = o.onFim || (() => {});
    this.ranked = !!o.ranked;
    this.v80 = o.regra === 'v80' ? { seg: (o.r80 && o.r80.seg) || 180, prorrog: (o.r80 && o.r80.prorrog) || 120 } : null;
    this.tempoLim = !this.v80 && o.tempo ? o.tempo * 60 : 0;    // sala por tempo: o relógio da partida (s de jogo)
    this.meta = this.v80 ? 3 : (this.tempoLim ? 999 : META_PADRAO);   // por tempo: sem limite de gols (como o jogo)
    this.placar = [0, 0];
    this.tick = 0; this.t = 0;
    this.estado = 'saida'; this.saidaTime = this.agora() % 2; this.saidaT0 = 0;
    this.golT = 0; this.golTime = -1; this.fimPendente = false; this.fimT = 0;
    this.prorrog = false;                            // gol de ouro (sala por tempo ou 0x0 da v80)
    this.ultimoGol = null;                           // o gol que vai no quadro (o convidado lê quando o placar muda)
    this.toques = []; this.chuteDe = null;
    this.hist = [];                                  // onde a bola esteve (o goleiro bot vê com atraso)
    this.pausado = false; this.on = true; this.encerrado = false;
    this.B = { x: this.G.CX, y: this.G.CY, vx: 0, vy: 0, w: 0, r: F.R_BOLA, m: F.MASSA_BOLA, I: 0.5 * F.MASSA_BOLA * F.R_BOLA * F.R_BOLA };
    this.jog = (o.jogadores || []).slice(0, 2 * this.n).map((j, i) => this.novoJogador(j, i));
    while (this.jog.length < 2 * this.n) this.jog.push(this.novoJogador(null, this.jog.length));
    for (const q of this.jog) this.spawn(q);
    this.saida(this.saidaTime);
    this.ligado = false;
  }

  novoJogador(j, i) {
    const time = Math.floor(i / this.n), k = i % this.n;
    const q = {
      i, netId: j && j.netId ? String(j.netId) : null, nome: (j && j.nome) || 'Bot',
      bot: j && j.bot ? j.bot : (j && j.netId ? null : 'dificil'),   // lugar vazio vira bot (a sala tem a opção)
      time, k, papel: this.n >= 3 && k === this.n - 1 ? 'gk' : 'campo',
      x: 0, y: 0, vx: 0, vy: 0, mx: 0, my: 0, r: F.R_JOG, m: F.MASSA_JOG,
      chuteT: -99, fxT: -9, ack49: 0, ultimoChuteMs: -1e9,
      fila: null, netButton: null, cv70: null, ritmo: [], botAi: null,
    };
    if (q.bot) q.botAi = BotSala.criar(q.bot);
    else {                                            // o humano já nasce com a fila de comandos pronta
      q.fila = { fila: [], chegou: this.agora(), min: 99, n: 0, ult: null, feito: 0, visto: 0 };
      q.netButton = { estado: 1, livre: true, t: 0, ultimo: -1e9 };
      q.cv70 = { carga: 0, segura: false, arma: 0, armaC: 0 };
    }
    return q;
  }

  /* ---- lugares: quem sai vira bot na hora (a partida não para); quem volta reassume a tampinha ---- */
  entra(netId, nome) {                               // reconexão: acha o lugar reservado (bot com a reserva dele)
    const q = this.jog.find(x => x.reserva === netId) || this.jog.find(x => x.bot && !x.reserva && !x.netId);
    if (!q) return -1;
    q.netId = String(netId); q.nome = nome || q.nome; q.bot = null; q.botAi = null; q.reserva = null;
    q.fila = { fila: [], chegou: 0, min: 99, n: 0, ult: null, feito: 0, visto: 0 };
    q.netButton = { estado: 1, livre: true, t: 0, ultimo: -1e9 };
    q.cv70 = { carga: 0, segura: false, arma: 0, armaC: 0 };
    q.ack49 = 0;
    return q.i;
  }
  sai(netId) {
    const q = this.jog.find(x => x.netId === netId);
    if (!q) return;
    q.reserva = q.netId;                             // a reserva da reconexão (a turma dá 90 s)
    q.netId = null; q.bot = 'dificil'; q.botAi = BotSala.criar('dificil');
    q.fila = null; q.mx = q.my = 0; q.cv70 = null;
  }
  gente() { return this.jog.filter(q => q.netId).length; }

  /* ---- a fila de comandos (o porte do net49Message/net49Control do jogo) ---- */
  entrada(netId, m) {
    const q = this.jog.find(x => x.netId === netId);
    if (!q || !q.fila || this.encerrado) return;
    const ag = this.agora();
    q.ritmo.push(ag); while (q.ritmo.length && ag - q.ritmo[0] > 1000) q.ritmo.shift();
    if (q.ritmo.length > MAX_CMD_S) { this.suspeito(netId, 'ritmo', q.ritmo.length + ' cmd/s'); return; }
    const f = q.fila, seq = m.seq | 0;
    if (seq <= f.visto) {
      if (seq > f.visto - 600) return;               // repetido ou fora de ordem
      f.fila.length = 0; f.ult = null; f.feito = 0;  // os números recomeçaram (partida nova)
    }
    f.visto = seq;
    const k70 = (m.k | 0) & 7;                         // 1 = CURVA segurada (2 e 4 são da ginga, que não abre em sala)
    f.fila.push({ seq, x: Math.max(-1, Math.min(1, +m.x || 0)), y: Math.max(-1, Math.min(1, +m.y || 0)), button: [1, 2, 3].includes(m.button) ? m.button : 1, k: k70 });
    f.chegou = ag;
    if (f.fila.length > FILA_MAX) f.fila.splice(0, f.fila.length - FILA_MAX);
  }

  nsDescarta(f) { const v = f.fila.shift(), p = f.fila[0]; if (!v) return; if (p && v.button > p.button) p.button = v.button; f.feito = Math.max(f.feito, v.seq); }
  nsBotao(b, bt) {
    b.t += STEP;
    const aceito = bt !== 1 && (b.t - b.ultimo > COOLDOWN_BOTAO || b.estado === bt);
    b.estado = aceito ? bt : 1; if (aceito) b.ultimo = b.t;
  }
  nsSegura(q, b) {                                     // o botão segurado chuta quando a bola entra no alcance
    if (b.estado === 1) b.livre = true;
    else if (b.livre && Math.hypot(this.B.x - q.x, this.B.y - q.y) <= F.ALCANCE_CHUTE) {
      if (this.chuta(q, b.estado === 3 ? F.FORCA_POWER : F.FORCA_KICK)) b.livre = false;
    }
  }

  controle(q) {                                        // (uma vez por passo para cada humano — o net49Control do jogo)
    const f = q.fila, b = q.netButton;
    if (!f || this.agora() - f.chegou > SILENCIO_MS) {   // sem notícia dele: parado
      if (f) { f.fila.length = 0; f.ult = null; }
      q.mx = q.my = 0; b.livre = true; return;
    }
    const vale = this.estado === 'saida' || this.estado === 'jogo';
    if (f.fila.length > 8) while (f.fila.length > 3) this.nsDescarta(f);   // voltou de um tranco: alcança de uma vez
    while (f.fila.length && f.fila[0].seq <= f.feito) { const c = f.fila.shift(); f.ult = c; if (vale) this.nsBotao(b, c.button); }
    f.min = Math.min(f.min, f.fila.length);
    if (++f.n >= 30) { if (f.min >= 2) for (let i = 1; i < f.min; i++) this.nsDescarta(f); f.min = 99; f.n = 0; }
    const c = f.fila[0];
    let dir = null;
    if (!c) { if (vale && f.ult && f.feito - f.ult.seq < 4) { f.feito++; dir = f.ult; } }        // palpite (segue o último)
    else if (f.feito && c.seq > f.feito + 1) { f.feito++; dir = c; }                             // uma se perdeu: anda como a próxima
    else { f.fila.shift(); f.ult = c; f.feito = c.seq; dir = c; if (vale) this.nsBotao(b, c.button); }
    if (dir && vale) { q.mx = dir.x; q.my = dir.y; q.ack49 = f.feito; }
    else { q.mx = q.my = 0; if (dir) q.ack49 = f.feito; }
    if (vale) this.nsSegura(q, b);
    this.remotoCurva(q, f, vale, dir);                 // a CURVA de quem joga de fora (o botão do jogo)
  }

  remotoCurva(q, f, vale, dir) {                       // (o porte do v70Remoto; a ginga não abre em sala)
    if (this.jogo !== 'curva') return;
    const s = q.cv70;
    if (!vale) { s.carga = 0; s.segura = false; s.arma = 0; return; }
    if (dir && (dir.k & 1)) { s.segura = true; s.carga = Math.min(1, s.carga + STEP / CV_CARGA_S); s.arma = 0; return; }
    if (s.segura) { s.segura = false; s.armaC = Math.max(s.carga, STEP / CV_CARGA_S); s.carga = 0; s.arma = CV_ARMA_S; }
    if (s.arma > 0) { if (this.cvChuta(q, s.armaC, q.mx, q.my)) s.arma = 0; else s.arma = Math.max(0, s.arma - STEP); }
  }
  cvChuta(q, c, mx, my) {                              // o chute de curva (o v70CvChuta do jogo)
    const B = this.B;
    let dx = B.x - q.x, dy = B.y - q.y, d = Math.hypot(dx, dy);
    if (d > F.ALCANCE_CHUTE) return false;
    if (d === 0) { dx = 1; dy = 0; d = 1; }
    if (!this.chuta(q, CV_FORCA)) return false;
    this.cvMarca(this.cvSinal(dx / d, dy / d, mx, my), c);
    return true;
  }
  cvMarca(s, c) { const B = this.B; B.cv = s * cvW(c); B.cvT = cvT(c); B.w = B.cv * 9; B.cvUx = null; }
  cvSinal(ux, uy, mx, my) {
    const l = Math.hypot(mx, my);
    if (l > 0.1) { const x = (ux * my - uy * mx) / l; if (Math.abs(x) > 0.26) return x > 0 ? 1 : -1; }
    return Math.sign((this.G.CY - this.B.y) * ux) || 1;
  }
  mdCurva(sub) {                                       // a bola entorta no ar (o mdCurva do jogo)
    const B = this.B;
    if (!(B.cvT > 0)) return;
    B.cvT -= sub;
    const v = Math.hypot(B.vx, B.vy);
    if (v < F.U(3)) { B.cvT = 0; return; }
    if (B.cvUx != null && (B.vx * B.cvUx + B.vy * B.cvUy) / v < 0.94) { B.cvT = 0; return; }   // bateu: o efeito acaba
    const a = (B.cv || 0) * v * sub, nx = -B.vy / v, ny = B.vx / v;
    B.vx += nx * a; B.vy += ny * a;
    const l = Math.hypot(B.vx, B.vy) || 1; B.cvUx = B.vx / l; B.cvUy = B.vy / l;
  }

  /* ================== O PASSO FIXO (1/60 s) — o porte do physicsStep do jogo ================== */
  passo() {
    if (!this.on || this.pausado || this.encerrado) return;
    const B = this.B, G = this.G;
    this.tick++;
    // 1) as entradas: humanos pela fila de comandos; bots pela inteligência (mesmas regras e limites)
    for (const q of this.jog) { if (q.bot) BotSala.decide(this, q); else this.controle(q); }
    // 2) a velocidade é ADITIVA com teto (o rqPre do jogo); entrada neutra zera
    for (const q of this.jog) {
      const d = F.direcaoOriginal(q.mx, q.my);
      if (d.mx || d.my) {
        q.vx += d.mx * F.VEL_JOG; q.vy += d.my * F.VEL_JOG;
        const v = Math.hypot(q.vx, q.vy);
        if (v > F.VEL_JOG) { q.vx *= F.VEL_JOG / v; q.vy *= F.VEL_JOG / v; }
      } else { q.vx = 0; q.vy = 0; }
    }
    // 3) a bola: desacelera no fator do campo, o giro diminui sozinho, o teto é F.LIMITE_VEL_BOLA (46,75 u/s desde a v87.1)
    B.vx *= F.FATOR_BOLA; B.vy *= F.FATOR_BOLA;
    B.w *= 1 / (1 + F.AMORT_ANGULAR / TPS);
    const speed = Math.hypot(B.vx, B.vy);
    if (speed > F.LIMITE_VEL_BOLA) { B.vx *= F.LIMITE_VEL_BOLA / speed; B.vy *= F.LIMITE_VEL_BOLA / speed; }
    // 4) os subpassos dinâmicos (2 a 12): posições, curva, colisão dupla, toques e o cruzamento do gol
    let relative = 0;
    for (const q of this.jog) { const r = Math.hypot(B.vx - q.vx, B.vy - q.vy); if (r > relative) relative = r; }
    const steps = Math.max(2, Math.min(12, Math.ceil(Math.max(speed, relative) * STEP / (F.R_BOLA * 0.3))));
    const sub = STEP / steps;
    for (let i = 0; i < steps; i++) {
      const bx0 = B.x, by0 = B.y;
      for (const q of this.jog) { q.x += q.vx * sub; q.y += q.vy * sub; }
      B.x += B.vx * sub; B.y += B.vy * sub;
      if (this.jogo === 'curva') this.mdCurva(sub);
      this.colide(); this.colide();
      this.toquesNaBola();
      const lado = this.golCruzou(bx0, by0, B.x, B.y);
      if (lado) this.gol(lado);
      if (this.estado === 'fim') break;              // o gol de ouro (ou da meta) encerra na hora
    }
    // 5) o fim do passo: relógio, comemoração, saída, regras de término
    this.pos();
    // 6) o quadro para os aparelhos (30 por segundo, o ritmo da v82)
    if (this.tick % SNAP_A_CADA === 0) this.onSnapshot(this.quadro());
  }

  colide() {                                         // (o collide/rqColide do jogo, com todos os jogadores remotos)
    const B = this.B, G = this.G, J = this.jog;
    for (const q of J) { F.hitBodies(q, B, F.QUIQUE_BOLA, F.ATRITO_JOG_BOLA); this.paredes(q); }
    for (let i = 0; i < J.length; i++) for (let k = i + 1; k < J.length; k++) F.hitBodies(J[i], J[k], 0.3, 0);
    if (this.estado === 'saida') for (const q of J) this.barreiraUm(q);
    for (const s of G.WALL_SEGS) F.hitSeg(B, s[0], s[1], s[2], s[3], F.Q_PAREDE, F.ATRITO_BOLA);   // as linhas (a boca aberta)
    F.hitBox(B, G.GL, G.GT, G.GR, G.GB, F.Q_PAREDE, F.ATRITO_BOLA);                                // a rede de segurança
    for (const p of G.POSTS) F.hitPoint(B, p[0], p[1], G.POST_R, F.Q_TRAVE, F.ATRITO_TRAVE_BOLA);  // as traves
    for (const s of G.NET_SEGS) F.hitSeg(B, s[0], s[1], s[2], s[3], F.Q_REDE, F.ATRITO_BOLA);      // a rede do gol
  }
  paredes(q) {                                       // (o rqParedes do jogo: ARENA/ESTÁDIO = só os muros da área)
    const G = this.G;
    F.hitBox(q, G.GL, G.GT, G.GR, G.GB, 0.65, 0);
  }
  barreiraUm(q) {                                    // (o rqBarreiraUm: meio-campo segura todos; o arco segura quem espera)
    const G = this.G, s = q.time === 0 ? -1 : 1;
    if (q.time !== this.saidaTime) {                 // quem espera: no seu campo e fora do círculo
      if (s < 0 && q.x > G.CX) { q.x = G.CX; if (q.vx > 0) q.vx = 0; }
      else if (s > 0 && q.x < G.CX) { q.x = G.CX; if (q.vx < 0) q.vx = 0; }
      const dx = q.x - G.CX, dy = q.y - G.CY, d = Math.hypot(dx, dy), m = G.circ + q.r;
      if (d < m) { if (d > 1e-6) { q.x = G.CX + dx * m / d; q.y = G.CY + dy * m / d; } else q.x = G.CX + s * m; }
      return;
    }
    if (s < 0 ? q.x <= G.CX : q.x >= G.CX) return;   // quem bate, no seu campo: livre
    const dx = q.x - G.CX, dy = q.y - G.CY, d = Math.hypot(dx, dy), lim = G.circ - q.r;
    if (d <= lim) return;
    if (lim > 0 && d - lim < Math.abs(dx)) { q.x = G.CX + dx * lim / d; q.y = G.CY + dy * lim / d; }
    else { q.x = G.CX; if (s < 0 ? q.vx > 0 : q.vx < 0) q.vx = 0; }
  }

  /* ---- toques, chute e autoria (os portes do rqToque/rqChuta/rqLance do jogo) ---- */
  toquesNaBola() {
    const lim = F.R_BOLA + 2, B = this.B;
    for (const q of this.jog) if (Math.hypot(q.x - B.x, q.y - B.y) <= q.r + lim) this.toque(q);
  }
  toque(q) {
    const h = this.toques, u = h[h.length - 1];
    if (u && u.p === q) u.tick = this.tick;
    else { h.push({ p: q, t0: this.tick, tick: this.tick, chute: -1 }); if (h.length > 12) h.shift(); }
    const cd = this.chuteDe, e = h[h.length - 1];    // o adversário ficou com a bola: o arremesso no ar perde a validade
    if (cd && cd.time !== q.time && e.tick - e.t0 > RQ_DESVIO_TK) this.chuteDe = null;
    if (this.estado === 'saida' && q.time === this.saidaTime) this.estado = 'jogo';   // a saída foi dada
  }
  chuta(q, forca) {                                  // (o rqChuta: centro do jogador → centro da bola, só no alcance)
    const B = this.B, ag = this.agora();
    let dx = B.x - q.x, dy = B.y - q.y, d = Math.hypot(dx, dy);
    if (d === 0) { dx = 1; dy = 0; d = 1; }
    if (d > F.ALCANCE_CHUTE) return false;
    if (q.netId && ag - q.ultimoChuteMs < FORCA_MINIMA_MS) { this.suspeito(q.netId, 'chute_rapido', ''); return false; }
    q.ultimoChuteMs = ag;
    B.w = 0; const dv = F.U(forca / B.m); B.vx += dx / d * dv; B.vy += dy / d * dv;
    if (this.jogo === 'curva') B.cvT = 0;            // PASSE e CHUTE saem retos; a curva é só do botão CURVA
    q.chuteT = this.tick; q.fxT = ns3(this.t); this.toque(q); this.marcaChute(q, forca);
    return true;
  }
  marcaChute(q, forca) {                             // (o rqMarcaChute: marca o toque e guarda se a bola ia no gol)
    const h = this.toques, u = h[h.length - 1];
    if (u && u.p === q) u.chute = this.tick;
    let cd = this.chuteDe;
    if (!cd || (cd.p && cd.p !== q)) cd = this.chuteDe = { x: this.B.x, y: this.B.y, time: q.time };
    cd.p = q; cd.time = q.time; cd.tick = this.tick; cd.forte = forca >= F.FORCA_POWER; cd.alvo = this.noAlvo(q.time);
  }
  golCruzou(x0, y0, x1, y1) {                        // (o golCruzou: a bola inteira do lado de dentro da linha)
    const G = this.G, m = F.R_BOLA, xa = G.LX0 - m, xb = G.LX1 + m;
    if (x0 >= xa && x1 < xa) { const yc = y0 + (y1 - y0) * (x0 - xa) / (x0 - x1); if (yc > G.GOL_Y0 && yc < G.GOL_Y1) return -1; }
    if (x0 <= xb && x1 > xb) { const yc = y0 + (y1 - y0) * (xb - x0) / (x1 - x0); if (yc > G.GOL_Y0 && yc < G.GOL_Y1) return 1; }
    return 0;
  }
  gol(lado) {                                        // lado 1 = gol da direita = ponto do time 0 (o rqGol do jogo)
    if (this.estado !== 'jogo' && this.estado !== 'saida') return;
    if (this.v80 && !this.prorrog && this.relogioS() >= this.v80.seg) return;   // v80: depois dos 3:00 só vale o gol de ouro
    const time = lado > 0 ? 0 : 1, L = this.lance(time);
    this.placar[time] += 1;
    if (L.autor) L.autor.golsFeitos = (L.autor.golsFeitos | 0) + 1;
    this.estado = 'gol'; this.golT = 0; this.golTime = time;
    if (this.placar[time] >= this.meta) this.fimPendente = true;      // a meta (3, ou a da v80)
    if (this.prorrog) this.fimPendente = true;                        // GOL DE OURO
    const nome = q => q ? q.nome : '', net = q => q && q.netId ? q.netId : null;
    this.ultimoGol = {
      time, jogo: this.jogo, pts: 1, ginga: false, contra: !!L.contra,
      author: net(L.autor), assist: net(L.assist), contraBy: net(L.contraDe),
      name: nome(L.autor), assistName: nome(L.assist), contraName: nome(L.contraDe), desvioName: nome(L.desvio),
    };
    this.onGol(Object.assign({ placar: this.placar.slice(), tick: this.tick, t: this.t, el: this.relogioS() }, this.ultimoGol));
  }
  lance(time) {                                      // (o rqLance: a regra única de autoria — ver o cabeçalho do arquivo)
    const h = this.toques, n = h.length, L = { autor: null, assist: null, contra: false, contraDe: null, desvio: null, i: -1 };
    if (!n) return L;
    let i = n - 1;
    if (h[i].p.time !== time) {                      // o último toque foi de quem sofreu: desvio ou gol contra
      let j = i; while (j >= 0 && h[j].p.time !== time && h[j].tick - h[j].t0 <= RQ_DESVIO_TK) j--;
      const k = j >= 0 ? h[j] : null, cd = this.chuteDe;
      if (k && k.p.time === time && cd && cd.p === k.p && cd.alvo && cd.tick >= k.t0 && k.tick - cd.tick <= 4 && this.tick - h[i].tick <= RQ_DESVIO_JANELA) { L.desvio = h[i].p; i = j; }
      else { L.contra = true; L.contraDe = h[i].p; return L; }
    }
    L.autor = h[i].p; L.i = i;
    const a = L.i > 0 ? h[L.i - 1] : null;           // a assistência: o toque antes do autor, de companheiro, limpo
    if (a && a.p !== L.autor && a.p.time === time && this.tick - a.tick <= ASSIST_TICKS) L.assist = a.p;
    return L;
  }

  /* ---- a máquina de estados e as regras de término (o rqPos do jogo + as regras da sala) ---- */
  pos() {
    if (this.estado === 'jogo') {
      this.t += STEP;
      this.regraTempo();
    } else if (this.estado === 'gol') {
      if (++this.golT >= RQ_GOL_TICKS) { if (this.fimPendente) this.fim(); else this.saida(1 - this.golTime); }
    } else if (this.estado === 'saida') {
      if (this.tick - this.saidaT0 > SAIDA_LIVRE_TICKS) this.estado = 'jogo';   // 8 s sem saída: bola livre
    } else if (this.estado === 'fim') {
      if (++this.fimT >= RQ_FIM_TICKS) { this.on = false; this.encerra(); }
    }
    const h = this.hist; h.push(this.B.x, this.B.y); if (h.length > 64) h.splice(0, 2);
  }
  relogioS() {                                       // o relógio oficial em segundos (v80: o do servidor, sem pausas)
    return this.v80 && this.decorrido ? this.decorrido() / 1000 : this.t;
  }
  regraTempo() {
    if (this.v80) {                                  // a regra da ranqueada v80 (3:00, 1×1/2×2 acabam, 0×0 tem gol de ouro)
      const t = this.relogioS(), L = this.v80;
      if (t < L.seg) return;
      if (this.placar[0] === 0 && this.placar[1] === 0) {
        if (!this.prorrog) { this.prorrog = true; this.onAviso('PRORROGAÇÃO — GOL DE OURO!'); }
        if (t >= L.seg + L.prorrog) this.fim();      // −2:00 sem gol: empate
      } else this.fim();                             // 1×0, 1×1, 2×2... no 00:00: acabou
      return;
    }
    if (this.tempoLim > 0 && this.t >= this.tempoLim && !this.prorrog) {   // a sala por tempo do jogo
      if (this.placar[0] !== this.placar[1]) this.fim();
      else { this.prorrog = true; this.onAviso('GOL DE OURO!'); }
    }
  }
  spawn(q) {                                         // (o rqSpawn: a formação de saída; quem bate fica atrás da bola)
    const G = this.G, f = RQ_FORMA[this.n][Math.min(q.k, this.n - 1)], s = q.time === 0 ? -1 : 1;
    q.x = G.CX + s * f[0] * ((G.LX1 - G.LX0) / 2); q.y = G.CY + f[1] * ((G.LY1 - G.LY0) / 2);
    if (q.time === this.saidaTime && q.k === 0) { q.x = G.CX + s * (q.r + F.R_BOLA + 10); q.y = G.CY; }
  }
  saida(t) {                                         // (o rqSaida: todo mundo na formação, bola no meio; o time t sai)
    this.saidaTime = t; this.estado = 'saida'; this.saidaT0 = this.tick;
    this.toques.length = 0; this.chuteDe = null;
    for (const q of this.jog) { this.spawn(q); q.vx = q.vy = 0; q.mx = q.my = 0; }
    const B = this.B; B.x = this.G.CX; B.y = this.G.CY; B.vx = B.vy = 0; B.w = 0; B.cvT = 0; B.cv = 0;
  }
  fim() {
    if (this.estado === 'fim') return;
    this.estado = 'fim'; this.fimT = 0;
    this.onSnapshot(this.quadro());                  // o quadro do apito final sai na hora
  }
  encerra() {
    if (this.encerrado) return;
    this.encerrado = true;
    const gols = {};
    for (const q of this.jog) if (q.golsFeitos && q.netId) gols[q.netId] = q.golsFeitos;
    this.onFim({
      placar: this.placar.slice(),
      vencedor: this.placar[0] > this.placar[1] ? 0 : (this.placar[1] > this.placar[0] ? 1 : -1),
      duracao: this.relogioS(), jogo: this.jogo, prorrog: this.prorrog, tick: this.tick,
    });
  }
  aborta() { this.on = false; this.encerrado = true; }   // sala vazia ou encerrada pela turma: sem selo, sem resultado

  /* ---- o quadro clássico (exatamente o que o convidado da v82 já recebe e renderiza) ---- */
  quadro() {
    const B = this.B;
    return {
      tick: this.tick, elapsed: ns3(this.t), state: this.estado, kickoff: this.saidaTime, score: this.placar.slice(),
      ball: [ns1(B.x), ns1(B.y), ns1(B.vx), ns1(B.vy), ns3(B.w)],
      players: this.jog.map(q => [ns1(q.x), ns1(q.y), ns1(q.vx), ns1(q.vy), q.ack49 || 0, q.chuteT || -99, ns3(q.fxT == null ? -9 : q.fxT)]),
      goal: this.ultimoGol || null,
    };
  }

  /* ---- os caminhos da bola para a regra do desvio (os portes do rqNoAlvo/rqTrajeto/cvSimula) ---- */
  noAlvo(time) {
    const B = this.B, G = this.G, lado = time === 0 ? 1 : -1;
    if (this.jogo === 'curva' && B.cvT > 0) {        // com efeito: o caminho curvo, sem batidas
      const pts = this.cvSimula(B.x, B.y, B.vx, B.vy, B.cv || 0, B.cvT, 180);
      let x0 = B.x, y0 = B.y;
      for (const p of pts) {
        const l = this.golCruzou(x0, y0, p[0], p[1]);
        if (l) return l === lado;
        if (p[1] < G.LY0 || p[1] > G.LY1 || p[0] < G.LX0 - G.GOL_PROF || p[0] > G.LX1 + G.GOL_PROF) return false;
        x0 = p[0]; y0 = p[1];
      }
      return false;
    }
    const u = this.trajeto(B.vx, B.vy, 90, 2 / TPS);
    return !!u && (u.x > G.CX ? 1 : -1) === lado;
  }
  cvSimula(x, y, vx, vy, w, T, passos) {             // (o cvSimula: a conta do passo, um ponto por tick)
    const dt = 1 / TPS, f = F.FATOR_BOLA, v3 = F.U(3), out = [];
    for (let i = 0; i < passos; i++) {
      vx *= f; vy *= f;
      let v = Math.hypot(vx, vy); if (v > F.LIMITE_VEL_BOLA) { vx *= F.LIMITE_VEL_BOLA / v; vy *= F.LIMITE_VEL_BOLA / v; v = F.LIMITE_VEL_BOLA; }
      if (v < F.U(1)) break;
      x += vx * dt; y += vy * dt;
      if (T > 0 && v >= v3) { const a = w * v * dt, nx = -vy / v, ny = vx / v; vx += nx * a; vy += ny * a; T -= dt; }
      out.push([x, y]);
    }
    return out;
  }
  trajeto(vx, vy, passos, dt) {                      // (o rqTrajeto: paredes, traves e rede; para no gol)
    const G = this.G, B = { x: this.B.x, y: this.B.y, vx, vy, w: this.B.w, r: F.R_BOLA, m: F.MASSA_BOLA, I: this.B.I };
    const tk = dt * TPS, f = Math.pow(F.FATOR_BOLA, tk), fw = Math.pow(1 / (1 + F.AMORT_ANGULAR / TPS), tk);
    for (let i = 1; i <= passos; i++) {
      B.vx *= f; B.vy *= f; B.w *= fw;
      const v = Math.hypot(B.vx, B.vy); if (v > F.LIMITE_VEL_BOLA) { B.vx *= F.LIMITE_VEL_BOLA / v; B.vy *= F.LIMITE_VEL_BOLA / v; }
      for (let j = 0; j < 4; j++) {
        const x0 = B.x, y0 = B.y;
        B.x += B.vx * dt / 4; B.y += B.vy * dt / 4;
        for (const s of G.WALL_SEGS) F.hitSeg(B, s[0], s[1], s[2], s[3], F.Q_PAREDE, F.ATRITO_BOLA);
        if (B.x < G.GL + B.r || B.x > G.GR - B.r || B.y < G.GT + B.r || B.y > G.GB - B.r) F.hitBox(B, G.GL, G.GT, G.GR, G.GB, F.Q_PAREDE, F.ATRITO_BOLA);
        for (const p of G.POSTS) F.hitPoint(B, p[0], p[1], G.POST_R, F.Q_TRAVE, F.ATRITO_TRAVE_BOLA);
        for (const s of G.NET_SEGS) F.hitSeg(B, s[0], s[1], s[2], s[3], F.Q_REDE, F.ATRITO_BOLA);
        if (this.golCruzou(x0, y0, B.x, B.y)) return { x: B.x, y: B.y, gol: true };
      }
    }
    return null;
  }

  /* ---- o motor: liga/desliga no relógio de 60 Hz (os testes usam rodar()) ---- */
  ligar() { if (!this.ligado) { this.ligado = true; MOTOR.add(this); } }
  desligar() { if (this.ligado) { this.ligado = false; MOTOR.del(this); } }
  rodar(ticks) { for (let i = 0; i < ticks && !this.encerrado; i++) this.passo(); }
}

module.exports = { PartidaSala, MOTOR, STEP, RQ_GOL_TICKS, RQ_FIM_TICKS, SAIDA_LIVRE_TICKS, SNAP_A_CADA };
