'use strict';
/* =====================================================================================================================
   RACHA v83 · A PARTIDA AUTORITATIVA — o servidor roda a simulação; os aparelhos só mandam comandos.

   O fluxo (o item 2 do plano v83):
     1) o jogador movimenta a tampinha no aparelho;
     2) o aparelho manda o comando {seq, x, y, k} (a DIREÇÃO e o botão — nunca a posição nem a velocidade);
     3) o servidor valida o comando (sequência, ritmo, alcance do chute, força);
     4) o servidor calcula a física em passos fixos de 1/60 s (fisica.js);
     5) o servidor atualiza a bola e as tampinhas — ele é a única autoridade;
     6) os quadros saem para todos num ritmo fixo (padrão 20/s; mensagens compactas em arrays);
     7) o placar, o relógio e o fim são calculados aqui — o anfitrião não existe mais.

   O RELÓGIO (as regras da v80, agora sem depender de ninguém):
     · 3:00 de jogo (para nas comemorações de gol — 2 s);
     · 3 gols acabam na hora;
     · 1 × 1 e 2 × 2 terminam empatados no 00:00;
     · só o 0 × 0 vai para a prorrogação: até −2:00, o primeiro gol vence (GOL DE OURO); sem gol, empate.

   ANTITRAPAÇA (o item 6): o que o servidor valida e o que ele registra para investigação.
     · comandos fora de ordem ou repetidos são descartados (sequência por jogador);
     · comandos em frequência anormal são descartados e contados (teto por segundo, janela deslizante);
     · chute fora do alcance ou rápido demais não vale — e vira evento suspeito;
     · direção maior que 1 é cortada (a velocidade máxima é do servidor, não do aparelho);
     · placar, relógio e resultado não aceitam comando nenhum: nascem aqui (não existe o que manipular);
     · tudo que é recusado entra no registro de suspeitos da partida (para a equipe olhar).
     NINGUÉM é banido automaticamente por uma única detecção incerta: o registro é para investigação.

   O relógio é injetável (agora()) e o passo pode ser rodado na mão (rodar(ticks)): os testes dirigem a
   partida inteira sem esperar o tempo de verdade.
   ===================================================================================================================== */
const F = require('./fisica');

const REGRA = { seg: 180, prorrog: 120, meta: 3, golTicks: 120 };   // 3:00 · prorrogação de 2:00 · até 3 gols · 2 s de comemoração
const SNAP_A_CADA = 3;                       // 1 quadro a cada 3 passos = 20 por segundo
const MAX_CMD_S = 120;                       // teto de comandos por segundo por jogador (o jogo manda ~30)
const MIN_CHUTE_MS = 33;                     // 2 passos: o mínimo entre um chute aceito e outro (o botão do jogo: 0,02 s)
const MAX_JOG = 8;                           // 4v4 lotado
const DESCONEXAO_DESISTE_MS = 45000;         // sumiu na ranqueada por mais que isso: desistência

let PROX_SALA = 1;

class PartidaAutoritativa {
  /* opcoes: tamanho (1-4) · ranked · regra {seg, prorrog, meta} · agora() · log(txt) · suspeito(reg)
     · aoQuadro(quadro) · aoGol(info) · aoFim(resultado) · codigo */
  constructor(o) {
    o = o || {};
    this.codigo = o.codigo || ('A' + String(PROX_SALA++).padStart(5, '0'));
    this.ranked = !!o.ranked;
    const r = o.regra || {};
    this.regra = {
      seg: r.seg > 0 ? Math.min(3600, +r.seg) : REGRA.seg,
      prorrog: r.prorrog > 0 ? Math.min(3600, +r.prorrog) : REGRA.prorrog,
      meta: REGRA.meta,
    };
    this.agora = typeof o.agora === 'function' ? o.agora : Date.now;
    this.log = typeof o.log === 'function' ? o.log : () => {};
    this.aoQuadro = o.aoQuadro || (() => {});
    this.aoGol = o.aoGol || (() => {});
    this.aoFim = o.aoFim || (() => {});
    this.regSuspeito = typeof o.suspeito === 'function' ? o.suspeito : () => {};

    this.sim = F.novaSimulacao(Math.min(4, Math.max(1, o.tamanho || 2)));
    this.n = this.sim.n;
    this.slots = new Array(this.n * 2).fill(null);   // i → {id, nome, conta, token, c} (o dono do lugar)
    this.estado = 'esperando';                       // esperando · rolando · comemoracao · fim
    this.placar = [0, 0];
    this.relogioSeg = this.regra.seg;                // o relógio oficial (positivo: o normal; negativo: a prorrogação)
    this.tickBase = 0;                               // o tick em que o trecho atual do relógio começou
    this.golTicks = 0;                               // a comemoração que falta
    this.prorrogacao = false;
    this.inicioMs = 0;
    this.linha = [];                                 // a linha do tempo dos gols: {tick, relogio, lado, placar}
    this.suspeitos = [];                             // o registro para investigação (ver o cabeçalho)
    this.stats = { comandos: 0, recusados: 0, chutes: 0, quadros: 0 };
    this._timer = null;
    this._ultimoTickMs = 0;
  }

  // ---------- quem joga ----------
  entra(j) {                                          // j: {id, nome, conta, token, c} → o lugar (0..2n-1) ou -1
    if (this.estado === 'fim') return -1;
    for (let i = 0; i < this.slots.length; i++) if (this.slots[i] && this.slots[i].id === j.id) {
      this.slots[i].c = j.c; this.slots[i].caidoMs = 0; this.slots[i].desistiu = false;   // a RECONEXÃO: o lugar é dele
      return i;
    }
    for (let i = 0; i < this.slots.length; i++) if (!this.slots[i]) {
      this.slots[i] = { id: j.id, nome: j.nome || 'Jogador', conta: j.conta || null, token: j.token || '', c: j.c, ultimoSeq: 0, janela: [], ultimoChuteMs: 0, caidoMs: 0, desistiu: false };
      return i;
    }
    return -1;                                       // lotada
  }
  sai(id, motivo) {
    const i = this.slots.findIndex(s => s && s.id === id);
    if (i < 0) return;
    const s = this.slots[i];
    if (this.estado === 'rolando' || this.estado === 'comemoracao') {
      s.c = null; s.caidoMs = this.agora();          // na partida: o lugar fica guardado para a reconexão
      if (this.ranked) this.log('partida ' + this.codigo + ': ' + s.nome + ' caiu (' + (motivo || 'conexão') + ')');
    } else this.slots[i] = null;                     // na espera: o lugar vaga
  }
  gente() { return this.slots.filter(Boolean).length; }
  presentes() { return this.slots.filter(s => s && s.c).length; }
  timeDe(i) { return Math.floor(i / this.n); }       // lugar 0..n-1: time 0 (ataca →) · n..2n-1: time 1

  // ---------- os comandos (a única coisa que o aparelho manda) ----------
  comando(id, m) {
    const i = this.slots.findIndex(s => s && s.id === id);
    if (i < 0 || this.estado !== 'rolando') return false;
    const s = this.slots[i], agora = this.agora();
    this.stats.comandos++;
    // 1) a sequência: fora de ordem ou repetido, fora (pacotes atrasados da rede chegam assim também)
    const seq = Math.floor(+m.seq) || 0;
    if (seq <= s.ultimoSeq) { this.stats.recusados++; return false; }
    // 2) o ritmo: frequência anormal de comandos (janela deslizante de 1 s)
    s.janela = s.janela.filter(t => agora - t < 1000);
    if (s.janela.length >= MAX_CMD_S) {
      this.stats.recusados++;
      this.marcaSuspeito(id, 'taxa_comandos_anormal', { seq, porSegundo: s.janela.length });
      return false;
    }
    s.janela.push(agora);
    s.ultimoSeq = seq;
    // 3) a direção: cortada em 1 (a velocidade é do servidor)
    const x = Math.max(-1, Math.min(1, +m.x || 0)), y = Math.max(-1, Math.min(1, +m.y || 0));
    if (Math.hypot(+m.x || 0, +m.y || 0) > 1.05) this.marcaSuspeito(id, 'direcao_acima_de_1', { x: +m.x || 0, y: +m.y || 0 });
    F.entrada(this.sim, i, x, y);
    // 4) o chute: o ritmo mínimo e o alcance são conferidos aqui (a força é sempre a do jogo)
    const k = m.k | 0;
    if (k === 1 || k === 2) {
      if (agora - s.ultimoChuteMs < MIN_CHUTE_MS) {
        this.stats.recusados++;
        this.marcaSuspeito(id, 'chute_rapido_demais', { intervaloMs: agora - s.ultimoChuteMs });
      } else {
        const forca = k === 2 ? F.FORCA_POWER : F.FORCA_KICK;
        if (F.chute(this.sim, i, forca)) { s.ultimoChuteMs = agora; this.stats.chutes++; }
        else {
          this.stats.recusados++;
          this.marcaSuspeito(id, 'chute_fora_do_alcance', { seq });
        }
      }
    }
    return true;
  }

  marcaSuspeito(id, tipo, det) {
    const s = this.slots.find(x => x && x.id === id);
    const reg = { t: new Date(this.agora()).toISOString(), partida: this.codigo, id, conta: s && s.conta ? s.conta.idPublico : null, tipo, det: det || {}, tick: this.sim.tick };
    // não afoga o registro: um tipo por jogador a cada 5 s
    const ja = this.suspeitos.find(x => x.id === id && x.tipo === tipo && this.agora() - Date.parse(x.t) < 5000);
    if (ja) return;
    this.suspeitos.push(reg);
    this.regSuspeito(reg);
    this.log('partida ' + this.codigo + ' · SUSPEITO: ' + tipo + ' (' + (s ? s.nome : id) + ')');
  }

  // ---------- o relógio e o fim (a autoridade) ----------
  comeca() {
    if (this.estado !== 'esperando') return;
    this.estado = 'rolando';
    this.inicioMs = this.agora();
    this.tickBase = this.sim.tick;
    this._ultimoTickMs = this.agora();
  }
  relogioAgora() {                                     // o relógio oficial neste instante (s; negativo = prorrogação)
    if (this.estado === 'esperando') return this.regra.seg;
    if (this.estado === 'comemoracao' || this.estado === 'fim') return this.relogioSeg;
    return this.relogioSeg - (this.sim.tick - this.tickBase) / F.TICKS_POR_S;
  }
  fimDoTempo() {
    const s = this.relogioAgora();
    if (this.prorrogacao) return s <= -this.regra.prorrog;
    return s <= 0;
  }

  passo() {                                            // um passo fixo: física, gols, relógio, quadros
    if (this.estado === 'comemoracao') {
      if (--this.golTicks <= 0) { F.reiniciaSaida(this.sim); this.estado = 'rolando'; this.tickBase = this.sim.tick; }
      return;
    }
    if (this.estado !== 'rolando') return;
    const gols = F.passo(this.sim);
    for (const g of gols) this.marcaGol(g.lado);
    if (this.estado !== 'rolando') return;             // o gol mudou o estado
    if (this.fimDoTempo()) {
      if (!this.prorrogacao && this.placar[0] === 0 && this.placar[1] === 0) {
        this.prorrogacao = true;                       // só o 0 × 0 vai para a prorrogação (o gol de ouro)
        this.relogioSeg = 0; this.tickBase = this.sim.tick;
        this.log('partida ' + this.codigo + ': prorrogação (0 × 0)');
      } else this.termina(this.placar[0] === this.placar[1] ? 'empate' : 'tempo');
    }
    if (this.sim.tick % SNAP_A_CADA === 0) { this.stats.quadros++; this.aoQuadro(F.quadro(this.sim)); }
  }

  marcaGol(lado) {                                     // lado 0 = gol na esquerda = ponto do time 1
    const time = 1 - lado;
    this.placar[time]++;
    this.relogioSeg = this.relogioAgora();             // o relógio para na comemoração
    this.linha.push({ tick: this.sim.tick, relogio: Math.round(this.relogioSeg * 100) / 100, lado, placar: [...this.placar] });
    this.aoGol({ lado, time, placar: [...this.placar], relogio: this.relogioSeg, prorrogacao: this.prorrogacao });
    this.log('partida ' + this.codigo + ': gol do time ' + (time ? 'B (roxo)' : 'A (laranja)') + ' — ' + this.placar.join(' × '));
    if (this.placar[time] >= this.regra.meta) return this.termina('meta');        // 3 gols acabam na hora
    if (this.prorrogacao) return this.termina('gol_de_ouro');                     // o primeiro gol da prorrogação vence
    this.estado = 'comemoracao'; this.golTicks = REGRA.golTicks;
  }

  // quem sumiu na ranqueada por tempo demais desiste (o lugar continua dele para voltar; a partida segue)
  vigiaQuedas() {
    if (!this.ranked || this.estado === 'fim') return;
    const agora = this.agora();
    for (const s of this.slots) {
      if (s && !s.c && !s.desistiu && s.caidoMs && agora - s.caidoMs > DESCONEXAO_DESISTE_MS) {
        s.desistiu = true;
        this.log('partida ' + this.codigo + ': ' + s.nome + ' não voltou — desistência');
        if (!this.slots.some(x => x && x.c)) this.termina('todos_cairam');
      }
    }
  }

  termina(motivo) {
    if (this.estado === 'fim') return;
    this.estado = 'fim';
    this.relogioSeg = this.relogioAgora();
    this.para();
    const [a, b] = this.placar;
    const dur = Math.round((this.agora() - this.inicioMs) / 1000);
    const resultado = {
      codigo: this.codigo, ranked: this.ranked, motivo, placar: [a, b],
      winner: a > b ? 0 : b > a ? 1 : -1,
      duracaoSeg: dur, n: this.n, linha: this.linha,
      jogadores: this.slots.map((s, i) => s && {
        lugar: i, time: this.timeDe(i), id: s.id, nome: s.nome,
        conta: s.conta ? s.conta.idPublico : null,
        desistiu: !!s.desistiu, presente: !!(s.c),
      }).filter(Boolean),
      suspeitos: this.suspeitos.length, stats: { ...this.stats },
    };
    this.log('partida ' + this.codigo + ': fim ' + this.placar.join(' × ') + ' (' + motivo + (this.ranked ? ', ranqueada' : '') + ')');
    this.aoFim(resultado);
    return resultado;
  }

  // ---------- o motor (tempo real; os testes rodam na mão com rodar) ----------
  ligar() {
    if (this._timer) return;
    this._ultimoTickMs = this.agora();
    this._timer = setInterval(() => {
      const agora = this.agora();
      let passos = Math.floor((agora - this._ultimoTickMs) / (1000 / F.TICKS_POR_S));
      this._ultimoTickMs += passos * (1000 / F.TICKS_POR_S);
      if (passos > F.TICKS_POR_S) passos = F.TICKS_POR_S;   // travou o processo: no máximo 1 s por vez (nada de espiral)
      while (passos-- > 0) this.passo();
      this.vigiaQuedas();
    }, 1000 / F.TICKS_POR_S);
    if (this._timer.unref) this._timer.unref();
  }
  rodar(ticks) { for (let i = 0; i < ticks; i++) this.passo(); }   // os testes: a partida inteira sem esperar
  para() { if (this._timer) { clearInterval(this._timer); this._timer = null; } }

  status() {
    return {
      codigo: this.codigo, estado: this.estado, ranked: this.ranked, n: this.n,
      gente: this.gente(), presentes: this.presentes(), placar: [...this.placar],
      relogio: Math.round(this.relogioAgora() * 10) / 10, prorrogacao: this.prorrogacao,
      suspeitos: this.suspeitos.length, stats: { ...this.stats },
    };
  }
}

module.exports = { PartidaAutoritativa, REGRA, SNAP_A_CADA, MAX_CMD_S, MIN_CHUTE_MS, DESCONEXAO_DESISTE_MS, MAX_JOG };
