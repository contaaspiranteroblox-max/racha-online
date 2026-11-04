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

   v92 · O NÚCLEO COMPARTILHADO (server/partida/nucleo.js): a física, as batidas e os botões deste motor agora moram num
   arquivo só, que o jogo também roda na previsão de quem joga (o build cola o mesmo arquivo no racha.html). Os números vêm
   do PERFIL da sala (o padrão, PERFIL_V92, tem os MESMOS números da v91; o PERFIL_V91 reproduz este motor da v91 tique a
   tique — conferido no tests/v92_nucleo_test.mjs). O que muda no padrão da v92:
     · o toque armado: um toque no PASSE/CHUTE fica valendo por bufferToque passos (6 = 100 ms) esperando a bola entrar no
       alcance — antes, se a bola não estivesse no alcance no passo exato do toque, o chute se perdia;
     · o contador de toques (kc/pc) no comando: um toque que caiu num comando descartado ou atrasado não se perde;
     · a rede e as traves seguram a tampinha também aqui (jogRede), como sempre foi no jogo (a previsão do aparelho batia
       nelas e o servidor não: a tampinha "voltava" quando alguém entrava no gol);
     · o relógio do motor é um acumulador de 60 passos por segundo de verdade (o setInterval de 16 ms dava ~61/s: o servidor
       andava mais rápido que os aparelhos e inventava comandos — os "palpites" — várias vezes por segundo).
     · o quadro leva também o estado dos botões de cada um (players[i][7]), para a previsão do aparelho continuar dali.
   ===================================================================================================================== */
/* v99 · OS CHUTES DO RACHÃO (a CAVADINHA, a CURVA e o SUPER CHUTE, opcionais na sala de FUTEBOL: o.chutes = {lob, curva, super}):
   a física é a do núcleo (N.cr*: a bola no alto, o travessão, o giro, o super) e aqui entram os comandos (os contadores lb, ce,
   cd e o super segurado su), o super de cada um a cada passo, os bots usando os três, o quadro (bz: a bola no alto; cr: o
   estado de cada um, para a previsão do aparelho continuar dali) e a mira do "chute no gol" com a curva e a cavadinha. Sem
   nada ligado (this.cr = null) a sala é a de sempre. O motor próprio (v94) não tem os chutes: a sala com eles roda neste. */
const F = require('./fisica');
const N = require('./nucleo');
const BotSala = require('./bot');
// v94 · o motor próprio (server/partida/motor.js, ligado pelo sala94.js): só carrega numa sala que usa o motor novo
let S94m = null;
const S94 = () => S94m || (S94m = require('./sala94'));

const STEP = F.DT;                                   // 1/60 s — o passo fixo da simulação
const TPS = 60;
const ASSIST_TICKS = 600;                            // o passe vale assistência até 10 s antes do gol
const RQ_DESVIO_TK = 6, RQ_DESVIO_JANELA = 120;      // o toque curto (desvio) · o gol logo depois do desvio
const EST_POSSE_TK = 10, EST_DESARME_TK = 45;       // v93: o desarme (estatística): o outro estava com a bola (10 passos) · um a cada 0,75 s
const RQ_GOL_TICKS = 120, RQ_FIM_TICKS = 80;         // 2 s de comemoração · 1,3 s de tela de fim
const SAIDA_LIVRE_TICKS = 480;                       // ninguém deu a saída em 8 s: a bola fica livre
// (v92: a CURVA — carga de 1,2 s, 0,35 s armado, o efeito e a duração — mora no núcleo: N.curvaTick, N.cvMarca, N.curvaNoAr)
const MIN_PASSOS_CHUTE = 2;                          // 2 passos (33 ms): o mínimo entre chutes aceitos do MESMO jogador
const SILENCIO_MS = 350;                             // sem comando por mais que isso: a tampinha para (a regra do jogo)
const MAX_CMD_S = 120;                               // teto de comandos por segundo por jogador (o jogo manda ~30)
const FILA_MAX = 120;                                // o tamanho máximo da fila de comandos (o do jogo)
const SNAP_A_CADA = 2;                               // 1 quadro a cada 2 passos = 30 por segundo (o ritmo da v82) · v92: a sala de testes pode pedir 60 (o.quadros)
// v96 · a RECUPERAÇÃO da fila de comandos: os passos em que a tampinha ficou parada esperando comando (o apagão do 4G, o
// engasgo do servidor) viram crédito; quando os comandos chegam juntos, cada um que sobra no colchão anda como um passo só
// da tampinha (N.passoSolo), até pagar o crédito — antes eles eram jogados fora e a previsão do aparelho voltava para trás.
// Sem crédito (o aparelho mandando mais rápido que 60/s), sobrou é pulado como sempre. RACHA_FILA=v95 volta à fila antiga.
const RECUPERA_MAX = 30;                             // passos (0,5 s): o máximo que a fila paga depois
// o crédito vale por pouco tempo: o atraso do apagão chega logo depois dele. Guardado, viraria um "pique" para usar quando
// quisesse (ficar parado sem mandar nada e depois correr o dobro): passou disso sem ser usado, acaba.
const CREDITO_MS = 1200;
const FILA_GRANDE = 40;                              // passou disso (um apagão enorme): alcança de uma vez, como antes
const FILA_V95 = process.env.RACHA_FILA === 'v95';
const ENTRADAS_MAX = 6;                              // v102: as direções de cada um que vão no quadro (a que ele quer agora + as da fila)
const ESPERA_QUER = 12;                              // v102: parado à espera de comando até 12 passos (200 ms): o quadro diz a direção que ele quer
const CREDITO_PAGANDO = 6;                            // v102: passos — o crédito continua no quadro até 6 passos depois do último pagamento
const RQ_FORMA = { 1: [[0.22, 0]], 2: [[0.2, 0], [0.58, 0]], 3: [[0.2, -0.42], [0.2, 0.42], [0.62, 0]], 4: [[0.2, -0.43], [0.2, 0.43], [0.62, -0.43], [0.62, 0.43]] };
// (v92: o raio da barreira da saída por tamanho — 8, 10, 12 e 13,5 u — vem no campo do núcleo: G.circ)
const META_PADRAO = 3;                               // futebol e com curva: primeiro a 3

const ns1 = v => Math.round(v * 10) / 10, ns3 = v => Math.round(v * 1000) / 1000, ns4 = v => Math.round(v * 1e4) / 1e4;
const CR_CONT = ['lb', 'ce', 'cd', 'sx'];             // v99: os contadores dos chutes do Rachão no comando (a cavadinha, as curvas, o super cancelado)
const NAO_CHUTA = () => false;                       // v99: (a recuperação da fila só anda a tampinha: o chute fica para o passo de agora)

/* ---------- O motor compartilhado: um relógio de 60 Hz para TODAS as partidas de sala ----------
   (medido em v83_medida.mjs: ~0,01 ms por passo num 2v2 — um núcleo aguenta centenas de salas)
   v92: o relógio é um ACUMULADOR — o passo n acontece no instante t0 + n/60 s (o setTimeout acorda na hora do próximo
   passo e roda os que faltam). Até a v91 era um setInterval de 1000/60 ms: o Node arredonda para 16 ms e o motor dava
   ~61 passos por segundo (60,7 a 61,2 medidos; tests/v92_nucleo_test.mjs mede os dois), mais rápido que os 60 comandos por segundo dos
   aparelhos — o motor ficava sem comando e andava no palpite. Depois de um engasgo (o processo parado), alcança no
   máximo 5 passos de uma vez (o resto é perdido, como um quadro pulado). RACHA_MOTOR=v91 volta ao setInterval antigo. */
const agoraMs = () => { const t = process.hrtime(); return t[0] * 1e3 + t[1] / 1e6; };
const MOTOR = {
  set: new Set(), timer: null, modo: process.env.RACHA_MOTOR === 'v91' ? 'v91' : 'acumulador', t0: 0, feitos: 0, atrasos: 0,
  um() { for (const q of this.set) { try { q.passo(); } catch (e) { q.log('erro no passo da partida: ' + (e && e.message)); } } },
  laco() {
    this.timer = null;
    if (!this.set.size) return;
    const alvo = Math.floor((agoraMs() - this.t0) * TPS / 1000);
    if (alvo - this.feitos > 5) { this.atrasos += alvo - this.feitos - 5; this.feitos = alvo - 5; }
    while (this.feitos < alvo) { this.feitos++; this.um(); }
    const prox = this.t0 + (this.feitos + 1) * 1000 / TPS;
    this.timer = setTimeout(() => this.laco(), Math.max(0, prox - agoraMs()));
    if (this.timer.unref) this.timer.unref();
  },
  add(p) {
    this.set.add(p);
    if (this.timer) return;
    if (this.modo === 'v91') {
      this.timer = setInterval(() => this.um(), 1000 / TPS);
      if (this.timer.unref) this.timer.unref();
      return;
    }
    this.t0 = agoraMs(); this.feitos = 0;
    this.timer = setTimeout(() => this.laco(), 1000 / TPS);
    if (this.timer.unref) this.timer.unref();
  },
  del(p) {
    this.set.delete(p);
    if (!this.set.size && this.timer) { if (this.modo === 'v91') clearInterval(this.timer); else clearTimeout(this.timer); this.timer = null; }
  },
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
    // v92: o perfil da física (o padrão é o PERFIL_V92: os números da v91; a turma só passa outro com RACHA_EXPERIMENTAL=1)
    this.perfil = N.perfilLimpo(o.fisica || null, o.fisicaBase || N.PERFIL_V92);
    this.C = N.resolve(this.perfil);
    this.G = N.novoCampo(this.n);                    // ARENA e ESTÁDIO: mesma geometria e mesma bola (G.circ = a barreira da saída)
    this.cbPasso = { toques: () => this.toquesNaBola(), gol: lado => { this.gol(lado); } };
    this.chutaCb = (q, forca, carga) => this.chuta(q, forca, carga);
    this.cr = this.jogo === 'futebol' && o.motor !== 'v94' ? N.crOpcoes(o.chutes) : null;   // v99: os chutes do Rachão (null = só o chutar)
    this.snapCada = o.quadros === 60 ? 1 : SNAP_A_CADA;
    this.filaV95 = FILA_V95 || o.fila === 'v95';     // v96: a fila antiga (sem a recuperação), para comparar
    this.ent102 = o.entradas !== false && process.env.RACHA_ENTRADAS !== '0';   // v102: as direções e o crédito de cada um no quadro (Q.ent, Q.cred)
    this.agora = o.agora || (() => Date.now());
    this.decorrido = o.decorrido || null;            // v80: o relógio oficial (ms, sem as pausas)
    this.log = o.log || (() => {});
    this.suspeito = o.suspeito || (() => {});
    this.onSnapshot = o.onSnapshot || (() => {});
    this.onGol = o.onGol || (() => {});
    this.onAviso = o.onAviso || (() => {});
    this.onFim = o.onFim || (() => {});
    this.onReplay = o.onReplay || null;              // v93: depois da comemoração, o replay do gol (a turma para o motor e volta com fimReplay)
    this.est = {};                                   // v93: as estatísticas de cada um (humanos pelo id; bots pelo lugar: 'b' + i)
    this.ranked = !!o.ranked;
    // v103 · as salas personalizadas sem bots (o pedido: "quando alguém sai, o time fica com um a menos, não bote bot no lugar"):
    // a vaga sem gente (o.jogadores[i] = {vazio:true}) e a de quem sai, cai ou vai para o banco ficam VAZIAS — a tampinha sai do
    // campo (q.fora: não anda, não bate e não toca na bola; o núcleo pula) e volta quando alguém entra nela (o admin põe,
    // ou quem caiu volta). A ranqueada continua com os bots completando.
    this.semBots = !!o.semBots || (o.jogadores || []).some(j => j && j.vazio);
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
    this.B = { x: this.G.CX, y: this.G.CY, vx: 0, vy: 0, w: 0, r: this.C.R_BOLA, m: this.C.MASSA_BOLA, I: 0.5 * this.C.MASSA_BOLA * this.C.R_BOLA * this.C.R_BOLA, z: 0, vz: 0, sp: 0, teto: 0, fogo: 0 };
    this.jog = (o.jogadores || []).slice(0, 2 * this.n).map((j, i) => this.novoJogador(j, i));
    while (this.jog.length < 2 * this.n) this.jog.push(this.novoJogador(null, this.jog.length));
    // v94: o motor próprio (o.motor = 'v94'): a física, os botões, a saída e o gol passam a ser do motor (ver sala94.js);
    // a fila de comandos, os bots, os estados, a autoria e as estatísticas continuam aqui
    this.v94 = false; this.motor = 'v93';
    if (o.motor === 'v94') { S94().liga(this, o); this.motor = 'v94'; }
    for (const q of this.jog) this.spawn(q);
    this.saida(this.saidaTime);
    this.ligado = false;
  }

  novoJogador(j, i) {
    const time = Math.floor(i / this.n), k = i % this.n, vazio = !!(j && j.vazio) || (!j && this.semBots);   // v103: a vaga vazia
    const q = {
      i, netId: j && j.netId ? String(j.netId) : null, nome: vazio ? '' : (j && j.nome) || 'Bot', fora: vazio,
      bot: vazio ? null : j && j.bot ? j.bot : (j && j.netId ? null : 'dificil'),   // lugar vazio vira bot (a sala tem a opção) · v103: ou fica vazio
      time, k, papel: this.n >= 3 && k === this.n - 1 ? 'gk' : 'campo',
      x: 0, y: 0, vx: 0, vy: 0, mx: 0, my: 0, r: this.C.R_JOG, m: this.C.MASSA_JOG,
      chuteT: -99, fxT: -9, ack49: 0, ultimoChuteMs: -1e9,
      fila: null, netButton: null, cv70: null, ritmo: [], botAi: null,
      cr: this.cr ? N.crNovo() : null, suBot: false,  // v99: os chutes do Rachão (o bot também usa)
    };
    if (q.bot) q.botAi = BotSala.criar(q.bot);
    else if (!vazio) {                                // o humano já nasce com a fila de comandos pronta
      q.fila = { fila: [], chegou: this.agora(), min: 99, n: 0, ult: null, feito: 0, visto: 0 };
      q.netButton = N.novoBotao();                    // v92: a máquina dos botões do núcleo (com o toque armado e os contadores)
      q.cv70 = q.netButton.cv;
    }
    return q;
  }

  /* ---- lugares: quem sai vira bot na hora (a partida não para); quem volta reassume a tampinha ---- */
  entra(netId, nome, lugar) {                        // reconexão: acha o lugar reservado (bot com a reserva dele)
    const ja = this.jog.find(x => x.netId === String(netId));
    if (ja) {                                        // v93: já está num lugar: não pega outro (duas tampinhas da mesma pessoa) — e a fila de comandos
      ja.fila = { fila: [], chegou: 0, min: 99, n: 0, ult: null, feito: 0, visto: 0 };   //  recomeça: a conexão nova conta os comandos do zero
      ja.netButton = N.novoBotao(); ja.cv70 = ja.netButton.cv; ja.ack49 = 0; if (Array.isArray(ja.ritmo)) ja.ritmo.length = 0;
      if (this.cr) ja.cr = N.crNovo();                 // v99
      if (this.v94) S94().reiniciaJogador(this, ja);   // v94: a máquina de comandos do motor também recomeça
      return ja.i;
    }
    const L = Number.isInteger(lugar) ? this.jog[lugar] : null;   // v93: o lugar da sala (a turma sabe onde a pessoa está sentada): esse primeiro
    const livre = x => !x.netId && (x.bot || x.fora);  // (v103: a vaga vazia também é livre)
    const q = (L && !L.netId && (L.reserva === netId || livre(L)) ? L : null) || this.jog.find(x => x.reserva === netId) || this.jog.find(x => livre(x) && !x.reserva);
    if (!q) return -1;
    for (const x of this.jog) if (x !== q && x.reserva === netId) x.reserva = null;   // (nenhuma outra vaga fica guardada para quem voltou)
    if (q.fora) this.volta(q);                       // v103: a tampinha volta para o campo
    q.netId = String(netId); q.nome = nome || q.nome; q.bot = null; q.botAi = null; q.reserva = null;
    q.fila = { fila: [], chegou: 0, min: 99, n: 0, ult: null, feito: 0, visto: 0 };
    q.netButton = N.novoBotao();
    q.cv70 = q.netButton.cv;
    q.ack49 = 0;
    if (this.cr) q.cr = N.crNovo();                  // v99
    if (this.v94) S94().reiniciaJogador(this, q);
    return q.i;
  }
  sai(netId) {
    const q = this.jog.find(x => x.netId === netId);
    if (!q) return;
    q.reserva = q.netId;                             // a reserva da reconexão (a turma dá 90 s)
    if (this.semBots) { q.netId = null; this.poeFora(q); return; }   // v103: sem bots, o time fica com um a menos (a vaga espera ele voltar)
    q.netId = null; q.bot = 'dificil'; q.botAi = BotSala.criar('dificil');
    q.fila = null; q.mx = q.my = 0; q.cv70 = null;
    if (this.cr) q.cr = N.crNovo();                  // v99 (o bot começa sem nada armado)
    if (this.v94) S94().reiniciaJogador(this, q);
  }
  gente() { return this.jog.filter(q => q.netId).length; }
  /* v103 · a vaga vazia: a tampinha sai do campo (fica fora da física, longe, parada, sem bot e sem fila) e volta quando alguém
     entra nela — no lugar da formação de saída do time dela (as batidas separam se tiver alguém ali). */
  estaciona(q) { q.x = this.G.CX; q.y = this.G.LY0 - 40 * this.C.R_JOG; q.vx = q.vy = 0; q.mx = q.my = 0; }
  poeFora(q) {
    q.fora = true; q.bot = null; q.botAi = null; q.nome = ''; q.fila = null; q.cv70 = null; q.netButton = null; q.suBot = false;
    if (this.cr) q.cr = N.crNovo();
    this.estaciona(q);
    this.toques = this.toques.filter(t => t.p !== q); if (this.chuteDe && this.chuteDe.p === q) this.chuteDe = null;
  }
  volta(q) {
    q.fora = false;
    if (this.v94) return;
    const G = this.G, f = RQ_FORMA[this.n][Math.min(q.k, this.n - 1)], s = q.time === 0 ? -1 : 1;
    q.x = G.CX + s * f[0] * ((G.LX1 - G.LX0) / 2); q.y = G.CY + f[1] * ((G.LY1 - G.LY0) / 2); q.vx = q.vy = 0; q.mx = q.my = 0;
    if (this.estado === 'saida' && q.time === this.saidaTime && q.k === 0) this.spawn(q);
  }

  /* ---- v93 · Fase 3: o admin mexe nos lugares no meio da partida (a turma confere quem pode). O placar, o relógio e os números
     de cada um continuam; as tampinhas ficam onde estão no campo — muda quem joga nelas. Ninguém fica em dois lugares. ---- */
  liberaHumano(q) {                                  // o lugar volta a ser bot (sem reserva: quem saiu foi o admin que tirou)
    if (this.semBots) { q.reserva = null; q.netId = null; this.poeFora(q); return; }   // v103: ou fica vazio
    q.reserva = null; q.netId = null; q.nome = 'Bot'; q.bot = 'dificil'; q.botAi = BotSala.criar('dificil');
    q.fila = null; q.mx = q.my = 0; q.cv70 = null; q.netButton = null;
    if (this.cr) q.cr = N.crNovo();                  // v99
    if (this.v94) S94().reiniciaJogador(this, q);
  }
  poeHumano(q, netId, nome) {                        // um humano assume o lugar q (o bot sai)
    if (q.fora) this.volta(q);                       // v103: a vaga vazia ganha a tampinha de volta
    q.netId = String(netId); q.nome = nome || q.nome; q.bot = null; q.botAi = null; q.reserva = null;
    q.fila = { fila: [], chegou: 0, min: 99, n: 0, ult: null, feito: 0, visto: 0 };
    q.netButton = N.novoBotao(); q.cv70 = q.netButton.cv; q.ack49 = 0; q.mx = q.my = 0;
    if (this.cr) q.cr = N.crNovo();                  // v99
    if (this.v94) S94().reiniciaJogador(this, q);
  }
  admPoe(netId, nome, i) {                           // netId vai para o lugar i: o lugar antigo dele vira bot; quem estava em i sai (a turma diz para onde)
    const alvo = this.jog[i]; if (!alvo) return false;
    const id = String(netId);
    for (const q of this.jog) { if (q !== alvo && q.netId === id) this.liberaHumano(q); if (q.reserva === id) q.reserva = null; }
    if (alvo.netId && alvo.netId !== id && !this.semBots) this.liberaHumano(alvo);   // (v103: sem bots, a tampinha fica onde está e muda quem joga nela)
    if (alvo.netId !== id) this.poeHumano(alvo, id, nome);
    return true;
  }
  admTira(netId) { const q = this.jog.find(x => x.netId === String(netId)); if (q) this.liberaHumano(q); return !!q; }
  admTroca(i, j) {                                   // dois lugares trocam quem joga neles (cada um começa a fila e os botões do zero, como na volta)
    const a = this.jog[i], b = this.jog[j]; if (!a || !b || a === b) return false;
    const A = { netId: a.netId, nome: a.nome }, Bq = { netId: b.netId, nome: b.nome };
    const poe = (q, o) => { if (o.netId) this.poeHumano(q, o.netId, o.nome); else this.liberaHumano(q); };
    poe(a, Bq); poe(b, A);
    return true;
  }
  encerraJa() {                                      // v93: o admin encerrou: o apito final agora (o placar de agora fica)
    if (this.encerrado) return;
    this.pausado = false;
    if (this.estado !== 'fim') this.fim();
  }

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
      if (this.v94) S94().reiniciaJogador(this, q);
    }
    f.visto = seq;
    const k70 = (m.k | 0) & 7;                         // 1 = CURVA segurada (2 e 4 são da ginga, que não abre em sala)
    const c = { seq, x: Math.max(-1, Math.min(1, +m.x || 0)), y: Math.max(-1, Math.min(1, +m.y || 0)), button: [1, 2, 3].includes(m.button) ? m.button : 1, k: k70 };
    if (Number.isInteger(m.kc) && m.kc >= 0) c.kc = m.kc;   // v92: os contadores de toque do aparelho (PASSE e CHUTE)
    if (Number.isInteger(m.pc) && m.pc >= 0) c.pc = m.pc;
    // v92 · o DB por estados (só vale com dbModo 1): os botões apertados (1 PASSE, 2 CHUTE) e o relógio do toque (o CHUTE
    // menos o PASSE, em décimos de ms — do aparelho, sem garantia: só desempata a ordem e alimenta o modo de comparação)
    if (Number.isInteger(m.bh) && m.bh >= 0 && m.bh <= 3) c.bh = m.bh;
    if (Number.isInteger(m.dt) && m.dt >= -1000 && m.dt <= 1000) c.dt = m.dt;
    if (this.cr) {                                     // v99: os chutes do Rachão — os toques (contadores), o super segurado, o super
      for (const k of CR_CONT) if (Number.isInteger(m[k]) && m[k] >= 0 && m[k] < 2e9) c[k] = m[k];   // cancelado (sx) e o último
      c.su = m.su === 1 ? 1 : 0; c.cu = m.cu === -1 || m.cu === 1 ? m.cu : 0;                         // lado da curva tocado (cu)
    }
    f.fila.push(c);
    f.chegou = ag;
    if (f.fila.length > FILA_MAX) f.fila.splice(0, f.fila.length - FILA_MAX);
  }

  nsDescarta(f, q) {                                  // pula o mais velho sem perder o botão (nem os contadores, v92) que estava nele
    const v = f.fila.shift(), p = f.fila[0]; if (!v) return;
    if (q && this.C.DB_MODO === 1) {                   // v92 · DB por estados: os botões dele valem no passo dele (juntar mudaria a ordem)
      if (this.estado === 'saida' || this.estado === 'jogo') { this.nsBotao(q.netButton, v); this.nsSegura(q, q.netButton); }
      if (this.cr) N.crComando(q.cr, v, this);         // v99
      f.ult = v; f.feito = Math.max(f.feito, v.seq);
      return;
    }
    if (p && v.button > p.button) p.button = v.button;
    if (p && v.kc != null && !(p.kc >= v.kc)) p.kc = v.kc;
    if (p && v.pc != null && !(p.pc >= v.pc)) p.pc = v.pc;
    if (p) for (const k of CR_CONT) if (v[k] != null && !(p[k] >= v[k])) p[k] = v[k];   // v99: o toque não se perde
    f.feito = Math.max(f.feito, v.seq);
  }
  nsBotao(b, c) { return N.botaoComando(b, c, this.C); }        // (o botão do comando: aperta, segura, solta + o toque novo)
  nsSegura(q, b) { return N.botaoTick(this, this.C, q, b, this.chutaCb); }   // (segurado chuta quando a bola entra no alcance; o toque armado espera)

  nsCredita(f) {                                     // v96: um passo parado sem comando (para pagar logo depois, se o comando chegar)
    f.cred = Math.min(RECUPERA_MAX, (f.cred | 0) + 1); f.credAte = this.agora() + CREDITO_MS;
  }
  nsRecupera(q, f, b, porComando) {                  // v96: um comando a mais neste passo, só a tampinha (o passo que ficou para trás)
    const c = f.fila.shift(); if (!c) return;
    f.cred--; f.ult = c; f.feito = c.seq; f.recuperados = (f.recuperados | 0) + 1; f.pagou = this.tick;   // (v102: o passo do último pagamento, para o Q.cred)
    this.nsBotao(q.netButton || b, c); if (porComando) this.nsSegura(q, b);
    if (this.cr) { N.crComando(q.cr, c, this); N.crTick(this, this.C, q, q.cr, c.su === 1, true, NAO_CHUTA); }   // v99: o super carrega (e solta) no passo dele, como no aparelho; o chute sai nos passos de agora
    N.passoSolo(this, this.C, q, c);
  }

  controle(q) {                                        // (uma vez por passo para cada humano — o net49Control do jogo)
    const f = q.fila, b = q.netButton;
    if (!f || this.agora() - f.chegou > SILENCIO_MS) {   // sem notícia dele: parado
      if (f) { f.fila.length = 0; f.ult = null; if (!this.filaV95 && (this.estado === 'saida' || this.estado === 'jogo')) this.nsCredita(f); }
      q.mx = q.my = 0; b.livre = true; b.arma = 0; b.cP = b.cC = null;
      if (q.cr) { q.cr.segura = false; q.cr.cT = 0; q.cr.espera = 0; q.cr.su = false; }   // v99: a internet sumiu — o super carregando não sai sozinho
      return;
    }
    const vale = this.estado === 'saida' || this.estado === 'jogo';
    // v92 · DB por estados (dbModo 1): a máquina dos botões anda só com os comandos, cada um no passo dele (o seq) — o
    // atrasado também passa pelo tick do botão, e o palpite (sem comando) não mexe nos botões: o ping não muda a decisão
    const porComando = this.C.DB_MODO === 1;
    const recupera = !this.filaV95 && vale && !porComando;   // (o DB por estados, experimental, conta os botões comando a comando: fica na fila de antes)
    if (f.cred > 0 && !(this.agora() <= (f.credAte || 0))) f.cred = 0;   // (o crédito velho acaba: não vira pique guardado)
    if (this.filaV95 ? f.fila.length > 8 : f.fila.length > FILA_GRANDE) while (f.fila.length > (this.filaV95 ? 3 : 8)) this.nsDescarta(f, q);   // voltou de um tranco: alcança de uma vez
    while (f.fila.length && f.fila[0].seq <= f.feito) { const c = f.fila.shift(); f.ult = c; if (vale) { this.nsBotao(b, c); if (porComando) this.nsSegura(q, b); } if (this.cr) N.crComando(q.cr, c, this); }
    f.min = Math.min(f.min, f.fila.length);
    if (++f.n >= 30) {                                 // meio segundo com comando sobrando (atraso à toa): recupera (com crédito) ou pula
      if (f.min >= 2) for (let i = 1; i < f.min; i++) { if (recupera && f.cred > 0 && f.fila.length > 1) this.nsRecupera(q, f, b, porComando); else this.nsDescarta(f, q); }
      f.min = 99; f.n = 0;
    }
    if (recupera && f.cred > 0 && f.fila.length > 2) this.nsRecupera(q, f, b, porComando);   // v96: a fila passou do colchão e há passo para pagar
    const c = f.fila[0];
    let dir = null, consumiu = false;
    if (!c) {
      if (vale && f.ult && f.feito - f.ult.seq < 4) { f.feito++; dir = f.ult; }        // palpite (segue o último)
      else if (recupera) this.nsCredita(f);                                             // v96: parado sem comando — um passo para pagar depois
    }
    else if (f.feito && c.seq > f.feito + 1) { f.feito++; dir = c; }                             // uma se perdeu: anda como a próxima
    else { f.fila.shift(); f.ult = c; f.feito = c.seq; dir = c; if (vale) { this.nsBotao(b, c); consumiu = true; } if (this.cr) N.crComando(q.cr, c, this); }
    if (dir && vale) { q.mx = dir.x; q.my = dir.y; q.ack49 = f.feito; }
    else { q.mx = q.my = 0; if (dir) q.ack49 = f.feito; }
    // v99: o super (antes do PASSE/CHUTE: carregando, eles esperam). Sem comando nenhum neste passo (o buraco da internet, depois
    // dos palpites), quem estava segurando continua segurando, parado: soltar é só o comando que solta (ou o silêncio, acima)
    if (this.cr && (dir || !q.cr.segura || !vale)) N.crTick(this, this.C, q, q.cr, !!(dir && dir.su === 1), vale, this.chutaCb);
    if (vale && (!porComando || consumiu)) this.nsSegura(q, b);
    this.remotoCurva(q, f, vale, dir);                 // a CURVA de quem joga de fora (o botão do jogo)
  }

  remotoCurva(q, f, vale, dir) {                       // (o porte do v70Remoto; a ginga não abre em sala) — v92: no núcleo
    N.curvaTick(this, this.C, q, q.netButton, dir ? dir.k | 0 : 0, vale, this.chutaCb);
  }

  /* v94 · a mesma fila (seq, palpite de até 4 passos, salto de seq perdida, descarte, silêncio de 350 ms); os botões não
     passam pela máquina antiga: os contadores e os botões do comando consumido vão para a máquina de comandos do motor */
  controle94(q) {
    const f = q.fila, S = S94();
    if (!f || this.agora() - f.chegou > SILENCIO_MS) {   // sem notícia dele: parado
      if (f) { f.fila.length = 0; f.ult = null; }
      q.mx = q.my = 0; S.semComando(this, q); return;
    }
    const vale = this.estado === 'saida' || this.estado === 'jogo';
    if (f.fila.length > 8) while (f.fila.length > 3) this.nsDescarta(f, null);   // voltou de um tranco: alcança de uma vez
    while (f.fila.length && f.fila[0].seq <= f.feito) { const c = f.fila.shift(); f.ult = c; S.conta(this, q, c); }   // (atrasados: os toques valem)
    f.min = Math.min(f.min, f.fila.length);
    if (++f.n >= 30) { if (f.min >= 2) for (let i = 1; i < f.min; i++) this.nsDescarta(f, null); f.min = 99; f.n = 0; }
    const c = f.fila[0];
    let dir = null;
    if (!c) { if (vale && f.ult && f.feito - f.ult.seq < 4) { f.feito++; dir = f.ult; } }        // palpite (segue o último)
    else if (f.feito && c.seq > f.feito + 1) { f.feito++; dir = c; }                             // uma se perdeu: anda como a próxima
    else { f.fila.shift(); f.ult = c; f.feito = c.seq; dir = c; S.conta(this, q, c); }
    if (dir && vale) { q.mx = dir.x; q.my = dir.y; q.ack49 = f.feito; }
    else { q.mx = q.my = 0; if (dir) q.ack49 = f.feito; }
    S.comandoHumano(this, q, dir, vale);
  }

  /* ================== O PASSO FIXO (1/60 s) — o porte do physicsStep do jogo ================== */
  passo() {
    if (!this.on || this.pausado || this.encerrado) return;
    this.tick++;
    if (this.v94) {                                    // v94: os comandos e o passo do motor próprio (o mesmo da previsão do aparelho)
      const S = S94();
      for (const q of this.jog) { if (q.bot) { BotSala.decide(this, q); S.comandoBot(this, q); } else this.controle94(q); }
      S.passo(this);
    } else {
    // 1) as entradas: humanos pela fila de comandos; bots pela inteligência (mesmas regras e limites)
    for (const q of this.jog) {
      if (q.fora) continue;                          // v103: a vaga vazia não decide nada
      if (q.bot) { BotSala.decide(this, q); if (this.cr) N.crTick(this, this.C, q, q.cr, q.suBot, this.estado === 'saida' || this.estado === 'jogo', this.chutaCb); }   // v99: o bot também carrega o super
      else this.controle(q);
    }
    // 2–4) v92: o passo do núcleo (o mesmo que a previsão do aparelho roda): a velocidade ADITIVA com teto (rqPre), a bola
    // (o fator do campo, o giro, o teto), os subpassos dinâmicos (2 a 12) com a colisão dupla, a curva, os toques e o gol
    N.passo(this, this.C, this.cbPasso);
    }
    // 5) o fim do passo: relógio, comemoração, saída, regras de término
    this.pos();
    // 6) o quadro para os aparelhos (30 por segundo, o ritmo da v82)
    if (this.tick % this.snapCada === 0) this.onSnapshot(this.quadro());
  }

  colide() { N.colide(this, this.C); }               // (o collide/rqColide do jogo, com todos — v92: no núcleo)
  barreiraUm(q) { N.barreiraUm(this, q); }           // (o rqBarreiraUm: meio-campo segura todos; o arco segura quem espera)

  /* ---- toques, chute e autoria (os portes do rqToque/rqChuta/rqLance do jogo) ---- */
  toquesNaBola() {
    if (this.cr && N.crAlta(this, this.C)) return;   // v99: a bola passando por cima não é toque de ninguém
    const lim = this.C.R_BOLA + 2, B = this.B;
    for (const q of this.jog) if (!q.fora && Math.hypot(q.x - B.x, q.y - B.y) <= q.r + lim) this.toque(q);
  }
  toque(q) {
    const h = this.toques, u = h[h.length - 1];
    if (u && u.p === q) u.tick = this.tick;
    else { h.push({ p: q, t0: this.tick, tick: this.tick, chute: -1 }); if (h.length > 12) h.shift(); this.estToque(q, u, this.chuteDe); }   // v93: defesa, desarme, passe certo
    const cd = this.chuteDe, e = h[h.length - 1];    // o adversário ficou com a bola: o arremesso no ar perde a validade
    if (cd && cd.time !== q.time && e.tick - e.t0 > RQ_DESVIO_TK) this.chuteDe = null;
    if (this.estado === 'saida' && q.time === this.saidaTime) this.estado = 'jogo';   // a saída foi dada
  }
  chuta(q, forca, carga) {                           // (o rqChuta: centro do jogador → centro da bola, só no alcance) · v99: carga = o super
    if (this.v94) return S94().chuta(this, q, forca);  // v94: o bot toca o botão; o chute é do motor
    const B = this.B, ag = this.agora();
    let dx = B.x - q.x, dy = B.y - q.y, d = Math.hypot(dx, dy);
    if (d === 0) { dx = 1; dy = 0; d = 1; }
    if (d > this.C.ALCANCE_CHUTE) return false;
    if (this.cr && (!N.crAlcanca(this, this.C) || (q.cr && q.cr.segura && !Number.isFinite(carga)))) return false;   // v99: alta demais · carregando o super
    // v92: o mínimo entre dois chutes do mesmo jogador conta em PASSOS da partida (2 = os 33 ms de sempre). Até aqui era o
    // relógio de parede, que oscila com a carga do servidor: medido (tests/v92_db/relogio_motor_*.json), de 7 a 14% dos
    // chutes com 2 passos de distância caíam abaixo de 33 ms e eram recusados, e a previsão do aparelho (em passos) mostrava
    // o chute. No DB por estados (dbModo 1) quem conta o mínimo é a máquina do núcleo, em passos do comando.
    if (q.netId && this.C.DB_MODO !== 1 && this.tick - q.chuteT < MIN_PASSOS_CHUTE) {
      if (!(this.cr && q.chuteT === this.tick)) this.suspeito(q.netId, 'chute_rapido', '');   // (v99: o PASSE/CHUTE segurado logo depois do super no mesmo passo não é suspeito)
      return false;
    }
    q.ultimoChuteMs = ag;
    B.w = 0; const dv = F.U(forca / B.m) * (this.cr ? N.crFator(this, this.C, q) : 1); B.vx += dx / d * dv; B.vy += dy / d * dv;
    if (this.jogo === 'curva') B.cvT = 0;            // PASSE e CHUTE saem retos; a curva é só do botão CURVA
    if (this.cr) N.crDepois(this, this.C, q, carga);   // v99: a cavadinha, a cabeçada, a curva e o fogo do super
    q.chuteT = this.tick; q.fxT = ns3(this.t); this.toque(q); this.marcaChute(q, forca);
    return true;
  }
  marcaChute(q, forca) {                             // (o rqMarcaChute: marca o toque e guarda se a bola ia no gol)
    const h = this.toques, u = h[h.length - 1];
    if (u && u.p === q) u.chute = this.tick;
    let cd = this.chuteDe;
    if (!cd || (cd.p && cd.p !== q)) cd = this.chuteDe = { x: this.B.x, y: this.B.y, time: q.time };
    cd.p = q; cd.time = q.time; cd.tick = this.tick; cd.forte = forca >= this.C.FORCA_POWER; cd.alvo = this.noAlvo(q.time);
    if (cd.alvo) this.estDe(q).c++;                  // v93: chute no gol
  }
  golCruzou(x0, y0, x1, y1) { return N.golCruzou(this, this.C, x0, y0, x1, y1); }   // (o golCruzou: a bola inteira do lado de dentro da linha)
  gol(lado) {                                        // lado 1 = gol da direita = ponto do time 0 (o rqGol do jogo)
    if (this.estado !== 'jogo' && this.estado !== 'saida') return;
    if (this.v80 && !this.prorrog && this.relogioS() >= this.v80.seg) return;   // v80: depois dos 3:00 só vale o gol de ouro
    const time = lado > 0 ? 0 : 1, L = this.lance(time);
    this.placar[time] += 1;
    if (L.autor) L.autor.golsFeitos = (L.autor.golsFeitos | 0) + 1;
    this.estGol(L);                                  // v93: gol, assistência, gol contra (e a defesa que virou desvio sai)
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
      if (++this.golT >= RQ_GOL_TICKS) {
        if (this.fimPendente) this.fim();
        else if (this.onReplay && this.onReplay()) { this.estado = 'replay'; this.pausado = true; }   // v93: o replay do gol (a turma volta com fimReplay)
        else this.saida(1 - this.golTime);
      }
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
    if (this.v94) return;                            // v94: a formação é a do motor (M.saida)
    if (q.fora) return this.estaciona(q);            // v103: a vaga vazia fica fora do campo
    const G = this.G, f = RQ_FORMA[this.n][Math.min(q.k, this.n - 1)], s = q.time === 0 ? -1 : 1;
    q.x = G.CX + s * f[0] * ((G.LX1 - G.LX0) / 2); q.y = G.CY + f[1] * ((G.LY1 - G.LY0) / 2);
    if (q.time === this.saidaTime && q.k === 0) { q.x = G.CX + s * (q.r + this.C.R_BOLA + 10); q.y = G.CY; }
  }
  saida(t) {                                         // (o rqSaida: todo mundo na formação, bola no meio; o time t sai)
    this.saidaTime = t; this.estado = 'saida'; this.saidaT0 = this.tick;
    this.toques.length = 0; this.chuteDe = null;
    if (this.v94) { for (const q of this.jog) q.mx = q.my = 0; S94().saida(this, t); return; }
    for (const q of this.jog) { this.spawn(q); q.vx = q.vy = 0; q.mx = q.my = 0; }
    const B = this.B; B.x = this.G.CX; B.y = this.G.CY; B.vx = B.vy = 0; B.w = 0; B.cvT = 0; B.cv = 0;
    if (this.cr) { N.crZeraBola(B); for (const q of this.jog) { N.crZera(q.cr); q.suBot = false; } }   // v99
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
      estat: this.estatisticas(),                    // v93: os números de cada um (o craque da partida)
    });
  }
  aborta() { this.on = false; this.encerrado = true; }   // sala vazia ou encerrada pela turma: sem selo, sem resultado

  /* ---- v93: as estatísticas (o painel de jogadores e o craque da partida) — as mesmas regras no aparelho (tools/v93/partida.js) ----
     defesa: o primeiro toque de quem defende num chute que ia no gol (se o gol sai assim mesmo, pelo desvio, a defesa não conta);
     desarme: tomar a bola de quem é do outro time; passe certo: a bola chutada chega num companheiro; chute no gol: o chute que
     ia entrar; gol, assistência e gol contra pela regra de autoria de sempre (lance). */
  estDe(q) {
    const k = q.netId || ('b' + q.i);
    let e = this.est[k];
    if (!e) e = this.est[k] = { k, i: q.i, time: q.time, nome: q.nome, bot: !q.netId, g: 0, a: 0, d: 0, r: 0, c: 0, p: 0, cg: 0, def: [] };
    e.i = q.i; e.time = q.time; if (q.netId) { e.nome = q.nome; e.bot = false; }
    return e;
  }
  estToque(q, u, cd) {                               // (cada chute no gol vale uma defesa só; o desarme é tomar a bola de quem estava com ela)
    const e = this.estDe(q);
    if (cd && cd.alvo && !cd.defendida && cd.time !== q.time && cd.p && cd.p !== q) { e.d++; cd.defendida = true; e.def.push(this.tick); if (e.def.length > 8) e.def.shift(); }
    else if (u && u.p && u.p.time !== q.time && u.tick - u.t0 >= EST_POSSE_TK && this.tick - (e.rT == null ? -1e9 : e.rT) >= EST_DESARME_TK) { e.r++; e.rT = this.tick; }
    if (u && u.p && u.p !== q && u.p.time === q.time && u.chute >= 0 && this.tick - u.chute <= 180) this.estDe(u.p).p++;
  }
  estGol(L) {
    if (L.autor) this.estDe(L.autor).g++;
    if (L.assist) this.estDe(L.assist).a++;
    if (L.contraDe) this.estDe(L.contraDe).cg++;
    if (L.desvio) { const e = this.estDe(L.desvio), i = e.def.findIndex(t => this.tick - t <= RQ_DESVIO_JANELA + 10); if (i >= 0) { e.def.splice(i, 1); e.d = Math.max(0, e.d - 1); } }
  }
  estatisticas() {
    for (const q of this.jog) if (!q.fora || q.netId) this.estDe(q);   // (todo lugar aparece, mesmo sem número · v103: menos a vaga vazia)
    return Object.values(this.est).map(e => ({ k: e.k, i: e.i, time: e.time, nome: e.nome, bot: e.bot, g: e.g, a: e.a, d: e.d, r: e.r, c: e.c, p: e.p, cg: e.cg }));
  }
  fimReplay() {                                      // v93: o replay acabou (todos votaram ou o tempo passou): a saída, como depois de todo gol
    if (this.estado !== 'replay' || this.encerrado) return;
    this.pausado = false;
    this.saida(1 - this.golTime);
    for (const q of this.jog) if (q.fila) { q.fila.fila.length = 0; q.fila.ult = null; if (this.v94) S94().reiniciaJogador(this, q); }   // (o que chegou durante o replay não vale)
    this.onSnapshot(this.quadro());
  }
  soltaFilas() { for (const q of this.jog) if (q.fila) { q.fila.fila.length = 0; q.fila.ult = null; if (this.v94) S94().reiniciaJogador(this, q); } }   // v93: a contagem acabou (o que chegou antes não vale)

  /* ---- o quadro clássico (exatamente o que o convidado da v82 já recebe e renderiza) ---- */
  quadro() {
    const B = this.B;
    const Q = {
      tick: this.tick, elapsed: ns3(this.t), state: this.estado === 'replay' ? 'gol' : this.estado, kickoff: this.saidaTime, score: this.placar.slice(),
      ball: this.jogo === 'curva' ? [ns1(B.x), ns1(B.y), ns1(B.vx), ns1(B.vy), ns3(B.w), ns3(B.cv || 0), ns3(B.cvT > 0 ? B.cvT : 0)]   // v92: + o efeito da CURVA (a previsão)
        : [ns1(B.x), ns1(B.y), ns1(B.vx), ns1(B.vy), ns3(B.w)],
      players: this.jog.map(q => {
        const v = [ns1(q.x), ns1(q.y), ns1(q.vx), ns1(q.vy), q.ack49 || 0, q.chuteT || -99, ns3(q.fxT == null ? -9 : q.fxT), this.botaoQuadro(q)];
        if (this.C.DB_MODO === 1 && q.netButton) v.push(N.dbPack(q.netButton, q.ack49 || 0));   // v92 · o estado do DB por estados
        return v;
      }),
      goal: this.ultimoGol || null,
    };
    if (this.semBots) { const fora = []; for (const q of this.jog) if (q.fora) fora.push(q.i); if (fora.length) Q.fora = fora; }   // v103: as vagas vazias (o jogo não desenha)
    if (this.cr) {                                     // v99: a bola no alto (altura, subida, giro, o teto do super, o fogo) e o estado de cada um
      Q.bz = [ns3(B.z), ns3(B.vz), ns4(B.sp), ns1(B.teto), B.fogo | 0];   // (a altura com 3 casas: o quique cai no mesmo passo na previsão)
      Q.cr = this.jog.map(q => N.crPack(q.cr));
    }
    if (this.v94) S94().quadroExtra(this, Q);        // v94: + o estado do motor (m94) para a previsão do aparelho
    else if (this.ent102) {                            // v102: o que a previsão do aparelho precisa para andar os outros e o tempo do mundo
      Q.ent = this.jog.map(q => this.entradas(q));
      // (o crédito só vale se a recuperação vai pagar: não na fila da v95 nem no DB por estados, que não recuperam)
      const cr = this.filaV95 || this.C.DB_MODO === 1 ? null : this.jog.map(q => this.credito102(q));
      if (cr && cr.some(Boolean)) Q.cred = cr;
    }
    return Q;
  }
  /* v102 · as direções de cada um no quadro: [a que ele quer agora, as que estão na fila (os próximos passos)...], em 64 setores
     (0 = para a direita, 16 = para baixo; -1 = parado). "A que ele quer": a do passo do quadro; com a tampinha parada no
     servidor esperando comando (o apagão: o crédito da v96), a do último comando que chegou — ele vai andar com ela quando a
     recuperação pagar. E Q.cred (só quando alguém tem): o crédito que a recuperação vai pagar a cada um (credito102). Com os
     dois, a previsão do aparelho anda os outros com o que eles de fato apertaram (e não pela velocidade do quadro, que é zero
     na tampinha parada à espera) e não deixa o tempo do mundo previsto correr nem parar com o apagão de ninguém
     (tools/v102/liso.js). O jogo antigo ignora os dois campos. RACHA_ENTRADAS=0 (ou o.entradas: false) não manda. */
  entradas(q) {
    const cod = (x, y) => (!x && !y) ? -1 : (Math.round(Math.atan2(y, x) * 32 / Math.PI) + 64) % 64;
    // (só no buraco curto — até ESPERA_QUER passos: o pico do 4G, quando os comandos estão no caminho e vão chegar juntos; parado
    //  mais que isso é o aparelho que travou ou a internet que caiu: os comandos não vêm, e ele fica parado de verdade)
    const f = q.fila, quer = (!q.mx && !q.my && f && f.cred > 0 && f.cred <= ESPERA_QUER && f.ult) ? f.ult : { x: q.mx, y: q.my };
    const v = [cod(quer.x, quer.y)];
    if (f) for (let k = 0; k < f.fila.length && v.length < ENTRADAS_MAX; k++) { const c = f.fila[k]; if (c.seq > f.feito) v.push(cod(c.x, c.y)); }
    return v;
  }
  // v102 · o crédito que vai no quadro: o que a recuperação vai pagar quando os comandos que estão no caminho chegarem (a
  // tampinha parada esperando, depois dos palpites) ou está pagando (a fila acima do colchão, ou um pagamento há até
  // CREDITO_PAGANDO passos: a fila oscilando em volta do colchão não liga e desliga o campo). A SOBRA — os comandos chegando
  // em dia e a fila no colchão, sem pagar — não vai: a recuperação não paga isso (acaba sozinha em 1,2 s), e na previsão do
  // aparelho viraria passos só da tampinha que o servidor não faz (ela atravessando a bola, o tempo do mundo atrás). Medido:
  // com o crédito inteiro no quadro a sua tampinha piorava no navegador (o deslize p95 dobrava no 4G de mentira)
  credito102(q) {
    const f = q.fila; if (!f || !(f.cred > 0)) return 0;
    const esperando = !f.fila.length && !(f.ult && f.feito - f.ult.seq < 4);
    const pagando = f.fila.length > 2 || (f.pagou != null && this.tick - f.pagou <= CREDITO_PAGANDO);
    return esperando || pagando ? f.cred | 0 : 0;
  }

  botaoQuadro(q) {                                   // v92: o estado dos botões no quadro (a previsão do aparelho continua daqui)
    const b = q.netButton; if (!b) return 0;
    return (b.estado & 3) | (b.livre ? 4 : 0) | ((b.armaTipo & 3) << 3) | (Math.max(0, Math.min(31, b.arma | 0)) << 5);
  }

  /* ---- os caminhos da bola para a regra do desvio (os portes do rqNoAlvo/rqTrajeto/cvSimula) ---- */
  noAlvo(time) {
    if (this.v94) return S94().noAlvo(this, time);   // v94: o motor numa cópia (as mesmas batidas e o mesmo gol)
    const B = this.B, G = this.G, lado = time === 0 ? 1 : -1;
    if (this.cr && (B.sp || B.z > 0 || B.vz > 0)) return this.crNoAlvo(lado);   // v99: com a curva ou no alto
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
  crNoAlvo(lado) {                                   // v99: o caminho com o giro e a altura (sem as batidas): entra por baixo do travessão?
    const C = this.C, CR = C.CR, G = this.G, b = { x: this.B.x, y: this.B.y, vx: this.B.vx, vy: this.B.vy, z: this.B.z, vz: this.B.vz, sp: this.B.sp };
    for (let i = 0; i < 180; i++) {
      const f = b.z > 0 || b.vz > 0 ? CR.FREIO_AR : C.FATOR_BOLA; b.vx *= f; b.vy *= f;
      if (b.sp) N.crGiro(b, CR);
      if (Math.hypot(b.vx, b.vy) < F.U(1)) return false;
      const x0 = b.x, y0 = b.y; b.x += b.vx / TPS; b.y += b.vy / TPS;
      if (b.z >= CR.TRAVESSAO && b.y > G.GOL_Y0 && b.y < G.GOL_Y1 && ((x0 >= G.LX0 && b.x < G.LX0 + this.C.R_BOLA) || (x0 <= G.LX1 && b.x > G.LX1 - this.C.R_BOLA))) return false;   // (bate no travessão)
      const l = this.golCruzou(x0, y0, b.x, b.y);
      if (l) return l === lado;
      if (b.y < G.LY0 || b.y > G.LY1 || b.x < G.LX0 - G.GOL_PROF || b.x > G.LX1 + G.GOL_PROF) return false;
      N.crAltura(b, CR);
    }
    return false;
  }
  cvSimula(x, y, vx, vy, w, T, passos) {             // (o cvSimula: a conta do passo, um ponto por tick)
    const C = this.C, dt = 1 / TPS, f = C.FATOR_BOLA, v3 = F.U(3), out = [];
    for (let i = 0; i < passos; i++) {
      vx *= f; vy *= f;
      let v = Math.hypot(vx, vy); if (v > C.LIMITE_VEL_BOLA) { vx *= C.LIMITE_VEL_BOLA / v; vy *= C.LIMITE_VEL_BOLA / v; v = C.LIMITE_VEL_BOLA; }
      if (v < F.U(1)) break;
      x += vx * dt; y += vy * dt;
      if (T > 0 && v >= v3) { const a = w * v * dt, nx = -vy / v, ny = vx / v; vx += nx * a; vy += ny * a; T -= dt; }
      out.push([x, y]);
    }
    return out;
  }
  trajeto(vx, vy, passos, dt) {                      // (o rqTrajeto: paredes, traves e rede; para no gol)
    const C = this.C, G = this.G, B = { x: this.B.x, y: this.B.y, vx, vy, w: this.B.w, r: C.R_BOLA, m: C.MASSA_BOLA, I: this.B.I }, lq = C.LIMIAR_QUIQUE;
    const tk = dt * TPS, f = Math.pow(C.FATOR_BOLA, tk), fw = Math.pow(1 / (1 + C.AMORT_ANGULAR / TPS), tk);
    for (let i = 1; i <= passos; i++) {
      B.vx *= f; B.vy *= f; B.w *= fw;
      const v = Math.hypot(B.vx, B.vy); if (v > C.LIMITE_VEL_BOLA) { B.vx *= C.LIMITE_VEL_BOLA / v; B.vy *= C.LIMITE_VEL_BOLA / v; }
      for (let j = 0; j < 4; j++) {
        const x0 = B.x, y0 = B.y;
        B.x += B.vx * dt / 4; B.y += B.vy * dt / 4;
        for (const s of G.WALL_SEGS) N.hitSeg(B, s[0], s[1], s[2], s[3], C.Q_PAREDE, C.ATRITO_BOLA, lq);
        if (B.x < G.GL + B.r || B.x > G.GR - B.r || B.y < G.GT + B.r || B.y > G.GB - B.r) N.hitBox(B, G.GL, G.GT, G.GR, G.GB, C.Q_PAREDE, C.ATRITO_BOLA, lq);
        for (const p of G.POSTS) N.hitPoint(B, p[0], p[1], G.POST_R, C.Q_TRAVE, C.ATRITO_TRAVE_BOLA, lq);
        for (const s of G.NET_SEGS) N.hitSeg(B, s[0], s[1], s[2], s[3], C.Q_REDE, C.ATRITO_BOLA, lq);
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

module.exports = { PartidaSala, MOTOR, STEP, RQ_GOL_TICKS, RQ_FIM_TICKS, SAIDA_LIVRE_TICKS, SNAP_A_CADA, N };
