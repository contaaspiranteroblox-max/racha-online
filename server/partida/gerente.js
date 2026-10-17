'use strict';
/* =====================================================================================================================
   RACHA v83 · O GERENTE DAS PARTIDAS AUTORITATIVAS — a ponte entre o servidor da turma e a simulação.

   As salas autoritativas são SEPARADAS das salas de sempre (as do anfitrião): uma não enxerga a outra,
   e cada partida roda na sua própria simulação — nada de uma sala interferir em outra (o item 9 do plano).

   O PROTOCOLO (mensagens de texto JSON, o mesmo canal das salas; prefixo auto_):
     → auto_entrar {n, ranked}        entra numa sala autoritativa do tamanho n (cria se não tiver); a conta
                                      vem do bilhete de sempre (o da plataforma — nada muda no login)
     → auto_cmd {seq, x, y, k}        o comando: a direção (x, y em −1..1) e o botão (k: 1 passe, 2 chute)
     → auto_sair                      sai da partida (na ranqueada, sumir de vez = desistência)
     ← auto_bemvindo {sala, lugar, time, n, campo}   o seu lugar e a geometria do campo (para desenhar)
     ← auto_comeca {relogio}          a bola vai rolar
     ← auto_q {t, b, p}               o quadro (20/s): tick, bola [x,y,vx,vy,w], tampinhas [[x,y]…]
     ← auto_gol {lado, time, placar, relogio, prorrogacao}
     ← auto_fim {placar, winner, motivo, ranked, selo?}   o resultado DO SERVIDOR + o selo da conta (k:1 na
                                      ranqueada): a plataforma confere como sempre conferiu — nada muda lá
     ← auto_erro {msg}

   O SELO: assinado com o mesmo segredo das salas (RACHA_SEGREDO_SALAS), no mesmo formato do servidor da
   turma (banco.assina), com k:1 (ranqueada) e n (o tamanho) — o jogoRouter da plataforma aceita sem mudança.
   ===================================================================================================================== */
const { PartidaAutoritativa } = require('./partida');
const F = require('./fisica');

const LIMPA_VAZIA_MS = 10000;        // sala vazia: some em 10 s
const LIMPA_FIM_MS = 30000;          // depois do fim: o resultado fica 30 s no ar e a sala é desfeita
const MAX_SALAS_AUTO = 100;          // teto de partidas simultâneas neste processo (o item 12: proteger a RAM)

class GerenteAuto {
  /* opcoes: segredo (o da plataforma) · agora() · log(txt) · regra {seg, prorrog} · assina(segredo, obj) */
  constructor(o) {
    o = o || {};
    this.segredo = o.segredo || '';
    this.agora = typeof o.agora === 'function' ? o.agora : Date.now;
    this.log = typeof o.log === 'function' ? o.log : () => {};
    this.regra = o.regra || {};
    this.assina = o.assina;                            // vem do banco.js (o mesmo selo das salas)
    this.salas = new Map();                            // codigo → {p: PartidaAutoritativa, vaziaMs, fimMs}
    this.porJogador = new Map();                       // id → codigo
    this.suspeitos = [];                               // o registro do processo (as partidas também guardam o seu)
    this._vigia = setInterval(() => this.limpa(), 5000);
    if (this._vigia.unref) this._vigia.unref();
  }

  manda(c, msg) { try { if (c && c.ws) c.ws.send(JSON.stringify(msg)); } catch (_) {} }
  todos(p, msg, excetoId) {
    for (const s of p.slots) if (s && s.c && s.id !== excetoId) this.manda(s.c, msg);
  }

  // ---------- as mensagens ----------
  recebe(c, m) {                                       // devolve true se a mensagem era do autoritativo
    if (!m || typeof m.type !== 'string' || !m.type.startsWith('auto_')) return false;
    try {
      if (m.type === 'auto_entrar') this.entrar(c, m);
      else if (m.type === 'auto_cmd') this.cmd(c, m);
      else if (m.type === 'auto_sair') this.sair(c);
      else if (m.type === 'auto_status') this.manda(c, { type: 'auto_status', salas: this.status() });
    } catch (e) { this.log('erro no autoritativo: ' + (e && e.stack || e)); }
    return true;
  }

  entrar(c, m) {
    if (!c.id) return this.manda(c, { type: 'auto_erro', msg: 'Apresente-se primeiro (a mensagem hello de sempre).' });
    if (!c.conta) return this.manda(c, { type: 'auto_erro', msg: 'A partida autoritativa pede a conta do RACHA (o bilhete).' });
    if (this.porJogador.has(c.id)) {                    // já está numa partida: reconecta nela
      const s = this.salas.get(this.porJogador.get(c.id));
      if (s) return this.ocupa(s, c);
      this.porJogador.delete(c.id);
    }
    const n = Math.min(4, Math.max(1, m.n | 0 || 2)), ranked = m.ranked !== false;
    let alvo = null;
    for (const s of this.salas.values()) {
      if (s.p.estado === 'esperando' && s.p.n === n && s.p.ranked === ranked && s.p.gente() < 2 * n) { alvo = s; break; }
    }
    if (!alvo) {
      if (this.salas.size >= MAX_SALAS_AUTO) return this.manda(c, { type: 'auto_erro', msg: 'O servidor está cheio. Tente daqui a pouco.' });
      alvo = this.cria(n, ranked);
    }
    this.ocupa(alvo, c);
  }

  ocupa(s, c) {
    const p = s.p;
    const lugar = p.entra({ id: c.id, nome: c.nome, conta: c.conta, token: c.token || '', c });
    if (lugar < 0) return this.manda(c, { type: 'auto_erro', msg: 'Essa partida está lotada.' });
    this.porJogador.set(c.id, p.codigo);
    s.vaziaMs = 0;
    const G = p.sim.campo;
    this.manda(c, {
      type: 'auto_bemvindo', sala: p.codigo, lugar, time: p.timeDe(lugar), n: p.n, ranked: p.ranked,
      campo: { MW: G.MW, MH: G.MH, CX: G.CX, CY: G.CY, LX0: G.LX0, LX1: G.LX1, LY0: G.LY0, LY1: G.LY1, GOL_Y0: G.GOL_Y0, GOL_Y1: G.GOL_Y1, GOL_PROF: G.GOL_PROF },
      relogio: p.regra.seg, meta: p.regra.meta,
    });
    this.todos(p, { type: 'auto_gente', gente: p.gente(), presentes: p.presentes() });
    if (p.estado === 'esperando' && p.gente() >= 2 * p.n) {   // lotou: a bola rola
      this.log('partida ' + p.codigo + ': começando (' + p.n + 'v' + p.n + (p.ranked ? ', ranqueada' : '') + ')');
      p.comeca(); p.ligar();
      this.todos(p, { type: 'auto_comeca', relogio: p.regra.seg, prorrog: p.regra.prorrog });
    } else if (p.estado !== 'esperando') {
      p.ligar();                                        // a reconexão no meio: garante o motor de pé
    }
  }

  cmd(c, m) {
    const cod = this.porJogador.get(c.id); if (!cod) return;
    const s = this.salas.get(cod); if (!s) return;
    s.p.comando(c.id, m);
  }

  sair(c, derrubada) {
    const cod = this.porJogador.get(c.id); if (!cod) return;
    const s = this.salas.get(cod);
    if (s) {
      s.p.sai(c.id, derrubada ? 'conexão' : 'saiu');
      this.todos(s.p, { type: 'auto_gente', gente: s.p.gente(), presentes: s.p.presentes() });
      if (!s.p.presentes()) s.vaziaMs = this.agora();   // todo mundo fora: a limpeza vem buscar
    }
    this.porJogador.delete(c.id);
  }

  cria(n, ranked) {
    const self = this;
    const p = new PartidaAutoritativa({
      tamanho: n, ranked, regra: this.regra, agora: this.agora, log: this.log,
      suspeito: reg => { self.suspeitos.push(reg); if (self.suspeitos.length > 5000) self.suspeitos.splice(0, 1000); },
      aoQuadro: q => self.todos(p, { type: 'auto_q', t: q.t, b: q.b, p: q.p }),
      aoGol: g => self.todos(p, { type: 'auto_gol', lado: g.lado, time: g.time, placar: g.placar, relogio: Math.round(g.relogio * 10) / 10, prorrogacao: g.prorrogacao }),
      aoFim: r => self.finaliza(p, r),
    });
    const s = { p, vaziaMs: this.agora(), fimMs: 0 };
    this.salas.set(p.codigo, s);
    return s;
  }

  finaliza(p, r) {                                      // o resultado DO SERVIDOR + o selo de cada conta
    const s = this.salas.get(p.codigo);
    if (s) s.fimMs = this.agora();
    for (const j of r.jogadores) {
      const slot = p.slots[j.lugar];
      if (!slot || !slot.c) continue;
      const msg = {
        type: 'auto_fim', placar: r.placar, winner: r.winner, motivo: r.motivo, ranked: r.ranked,
        seuTime: j.time, duracaoSeg: r.duracaoSeg, desistiu: j.desistiu,
      };
      // o selo: o mesmo formato do servidor da turma (k:1 = ranqueada; n = o tamanho) — a plataforma confere igual
      if (this.segredo && j.conta && r.ranked && !j.desistiu && typeof this.assina === 'function') {
        const agora = Date.now();
        msg.selo = this.assina(this.segredo, {
          s: p.codigo, r: 1, j: j.conta, l: j.time, p: [r.placar[j.time], r.placar[1 - j.time]],
          m: 'futebol', d: r.duracaoSeg, k: 1, n: r.n, t: agora, e: agora + 40 * 60e3,
        });
      }
      this.manda(slot.c, msg);
    }
    for (const j of r.jogadores) this.porJogador.delete(j.id);
    this.log('partida ' + p.codigo + ': resultado entregue (' + r.jogadores.length + ' jogadores, ' + r.suspeitos + ' registros suspeitos)');
  }

  // ---------- a limpeza (o item 12: nada vaza memória) ----------
  limpa() {
    const agora = this.agora();
    for (const [cod, s] of this.salas) {
      const p = s.p;
      if (p.estado === 'fim') { if (!s.fimMs) s.fimMs = agora; if (agora - s.fimMs > LIMPA_FIM_MS) this.desfaz(cod, 'fim limpo'); }
      else if (!p.presentes() && agora - s.vaziaMs > LIMPA_VAZIA_MS) { p.termina('sala_vazia'); this.desfaz(cod, 'vazia'); }
      else if (p.presentes()) s.vaziaMs = agora;
    }
  }
  desfaz(cod, motivo) {
    const s = this.salas.get(cod); if (!s) return;
    s.p.para();
    for (const slot of s.p.slots) if (slot) this.porJogador.delete(slot.id);
    this.salas.delete(cod);
    this.log('partida ' + cod + ': sala desfeita (' + motivo + ')');
  }

  status() {
    return [...this.salas.values()].map(s => s.p.status());
  }
  resumo() {
    let jogando = 0, gente = 0;
    for (const s of this.salas.values()) { if (s.p.estado === 'rolando' || s.p.estado === 'comemoracao') jogando++; gente += s.p.gente(); }
    return { salas: this.salas.size, jogando, gente, suspeitos: this.suspeitos.length };
  }
  fecha() {
    clearInterval(this._vigia);
    for (const cod of [...this.salas.keys()]) this.desfaz(cod, 'servidor fechando');
  }
}

module.exports = { GerenteAuto, LIMPA_VAZIA_MS, LIMPA_FIM_MS, MAX_SALAS_AUTO };
