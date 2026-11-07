/* =====================================================================================================================
   PROTÓTIPO COLYSEUS · A SALA DO RACHA (Colyseus 0.18) EM VOLTA DO MOTOR DE SEMPRE
   O que é do Colyseus aqui: a reserva da vaga e o matchmaking (pública por modo/tamanho/jogo, privada por código,
   ranqueada só com conta), a entrada com o bilhete da plataforma (onAuth), a queda e a volta (onDrop → allowReconnection →
   onReconnect / onLeave), o estado pequeno sincronizado (Schema: a fase, o placar, quem está em cada lugar e se está
   conectado) e o transporte das mensagens.
   O que continua sendo do RACHA, sem mudar uma linha: a partida inteira — server/partida/sala.js (PartidaSala) com o
   núcleo da física (server/partida/nucleo.js, o mesmo que o jogo roda na previsão), a fila de comandos com o colchão, o
   palpite e a recuperação da v96, o balde de ritmo da v108, o relógio de 60 passos por segundo do motor (o acumulador com
   o alcance de 12 passos da v108 — o setFixedTimestep do Colyseus alcança só 5, a câmera lenta que a v108 tirou), o
   placar, o relógio da ranqueada (v80), os gols, a autoria, as estatísticas e o fim. O quadro sai no formato clássico,
   empacotado em binário sem perda (codec.mjs), e o selo do resultado sai no formato que a plataforma já confere
   (app/api/lib/selo.ts · confereSelo).
   ===================================================================================================================== */
import { Room, ServerError, ErrorCode, CloseCode } from '@colyseus/core';
import { schema, t } from '@colyseus/schema';
import { randomBytes, randomInt } from 'node:crypto';
import { createRequire } from 'node:module';
import { novoEmpacotador } from './codec.mjs';
import { novoGravador, gravando, gravaComando } from './gravador.mjs';
const require = createRequire(import.meta.url);
const { PartidaSala } = require('../../../server/partida/sala.js');
const { confere, assina, limpa, inteiro } = require('../../../server/banco.js');

// ---------------------------------------------------------------- o estado pequeno (o Schema manda só o que mudou, ~20 vezes/s)
export const Jogador = schema({ id: t.string(), nome: t.string(), time: t.uint8(), lugar: t.uint8(), conectado: t.boolean(), conta: t.boolean() }, 'Jogador');
export const Estado = schema({
  fase: t.string(), modo: t.string(), n: t.uint8(), jogo: t.string(), codigo: t.string(),
  placarA: t.uint8(), placarB: t.uint8(), rodada: t.uint16(), jogadores: t.map(Jogador),
}, 'Estado');

export const MODOS = ['casual', 'ranqueada', 'privada'];
const MODOS_SERVIDOR = [...MODOS, 'turma'];                  // 'turma': a partida de uma sala da turma (ponte.mjs) — só o servidor cria
const LETRAS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';           // (as do código das salas da turma: sem I, O, 0 e 1)
const KICK = new Set([4001, 4002, 4011]);                    // (o servidor tirou o aparelho: desligando, mensagem demais, trocado) — não guarda a vaga
const FECHA_TROCADO = 4011;                                  // a mesma conta entrou de novo por outro lugar: esta conexão sai

export function leOpcoes(o, modos = MODOS) {
  o = o && typeof o === 'object' ? o : {};
  const modo = modos.includes(o.modo) ? o.modo : null;
  const n = inteiro(o.n, 1, 4, null);
  const jogo = o.jogo == null || o.jogo === 'futebol' ? 'futebol' : o.jogo === 'curva' ? 'curva' : null;
  return { modo, n, jogo };
}
export function novoCodigo() { let s = ''; for (let i = 0; i < 6; i++) s += LETRAS[randomInt(LETRAS.length)]; return s; }

/* cfg (do servidor, nunca do aparelho):
   segredo            o RACHA_SEGREDO_SALAS (o mesmo da plataforma: o bilhete e o selo)
   visitantes         sem conta também joga a casual e a privada (o RACHA_VISITANTES de hoje)
   reconexaoS         quanto tempo a vaga fica guardada na queda (a turma dá 90 s)
   esperaBotsMs       a ranqueada que não lotou começa com bots depois disso (a fila de hoje: 8 s)
   r80                {seg, prorrog}: o relógio da partida (a regra v80 de todas as salas aqui)
   plataforma(txt, r) o resultado assinado, direto do servidor para a plataforma (opcional)
   fila               a ranqueada só pela fila (fila.mjs: o QueueRoom com o rank do bilhete) — a sala que a fila cria é
                      privada e só aceita as contas que a fila chamou; false = a ranqueada direto pelo matchmaking
   filaCiclos/filaFaixa/filaAbre   a espera da fila (ciclos de 1 s), a diferença de rank aceita e quanto ela abre por ciclo
   gravar             grava cada partida (gravador.mjs) para a prova da física
   log(txt)           o registro (os suspeitos vão nele, como na turma) */
export function criaSalaRacha(cfg) {
  const C = { visitantes: true, reconexaoS: 90, esperaBotsMs: 8000, r80: { seg: 180, prorrog: 120 }, maxMsgS: 300, fimMs: 4000, log: () => {},
    fila: true, filaCiclos: 8, filaFaixa: 200, filaAbre: 50, ...cfg };
  if (!C.segredo) throw new Error('o protótipo precisa do segredo das salas (RACHA_SEGREDO_SALAS)');
  const salas = new Set();

  // o bilhete da plataforma (jogo.bilheteSala): base64url(JSON).base64url(HMAC-SHA256), 15 min — o mesmo que a turma aceita.
  // Devolve a conta (ou null sem bilhete); bilhete inválido, vencido ou de conta barrada: recusa.
  async function contaDoBilhete(token) {
    if (!token) return null;
    const b = confere(C.segredo, token);
    if (!b || typeof b.p !== 'string' || !/^\d{1,9}$/.test(b.p)) throw new ServerError(ErrorCode.AUTH_FAILED, 'bilhete inválido ou vencido');
    if (C.contaBarrada && await C.contaBarrada(b)) throw new ServerError(ErrorCode.AUTH_FAILED, 'conta suspensa');
    // (as mesmas escritas da turma: o id da conta 'c123' e o ID público com 6 dígitos '000123', o que o selo leva e a
    //  plataforma compara com formatarIdPublico) · rk: os pontos da patente, se a plataforma assinou (a fila usa)
    return { id: 'c' + Number(b.p), publico: String(Number(b.p)).padStart(6, '0'), nome: limpa(b.n, 20) || 'Jogador', conta: true, rk: Number.isInteger(b.rk) ? b.rk : null };
  }

  class SalaRacha extends Room {
    // ------------------------------------------------------------ a entrada: roda no pedido HTTP do matchmaking, antes de reservar a vaga
    static async onAuth(token, options, context) {
      const o = leOpcoes(options);
      if (!o.modo || !o.n || !o.jogo) throw new ServerError(ErrorCode.MATCHMAKE_INVALID_CRITERIA, 'modo, tamanho ou jogo inválido');
      if (o.modo === 'ranqueada' && o.jogo !== 'futebol') throw new ServerError(ErrorCode.MATCHMAKE_INVALID_CRITERIA, 'a ranqueada é de futebol');
      let a = await contaDoBilhete(token);
      if (o.modo === 'ranqueada' && !a) throw new ServerError(ErrorCode.AUTH_FAILED, 'a ranqueada é só com a conta');
      // (a ranqueada só pela fila: a sala dela é criada pelo servidor, sem passar por aqui)
      if (o.modo === 'ranqueada' && C.fila) throw new ServerError(ErrorCode.MATCHMAKE_INVALID_CRITERIA, 'a ranqueada é pela fila');
      if (!a) {
        if (!C.visitantes) throw new ServerError(ErrorCode.AUTH_FAILED, 'entre na conta para jogar');
        a = { id: 'v' + randomBytes(6).toString('hex'), publico: null, nome: limpa(options && options.nome, 20) || 'Visitante', conta: false, rk: null };
      }
      return a;
    }

    onCreate(options) {
      const o = leOpcoes(options, MODOS_SERVIDOR);          // (o 'turma' nunca chega do aparelho: o onAuth só aceita os MODOS)
      if (!o.modo || !o.n || !o.jogo) throw new ServerError(ErrorCode.MATCHMAKE_INVALID_CRITERIA, 'modo, tamanho ou jogo inválido');
      this.modo = o.modo; this.n = o.n; this.jogo = o.modo === 'ranqueada' ? 'futebol' : o.jogo;
      this.maxClients = 2 * this.n;
      this.maxMessagesPerSecond = C.maxMsgS;                 // (o teto do Colyseus derruba; o ritmo do jogo é o balde do motor, mais fino)
      if (this.modo === 'privada') {                          // o código da sala é o id dela (só entra quem sabe: joinById)
        let cod = novoCodigo(); for (let k = 0; k < 20 && C.codigoUsado && C.codigoUsado(cod); k++) cod = novoCodigo();
        this.roomId = cod; this.setPrivate(true);
      }
      if (this.modo === 'ranqueada' && C.fila) {            // a sala que a fila criou: privada, só para as contas que ela chamou
        this.convidados = new Set(Array.isArray(options.contas) ? options.contas.map(String) : []);
        this.setPrivate(true);
      }
      if (this.modo === 'turma') {                          // a partida de uma sala da turma: os lugares que ELA decidiu
        this.lugaresFixos = new Map((Array.isArray(options.lugares) ? options.lugares : []).filter(x => x && Number.isInteger(x.lugar) && x.lugar >= 0 && x.lugar < 2 * this.n).map(x => [String(x.id), x.lugar]));
        this.convidados = new Set(this.lugaresFixos.keys());
        if (typeof options.codigo === 'string' && /^[A-HJ-NP-Z2-9]{6}$/.test(options.codigo)) this.roomId = options.codigo;   // (o mesmo código da sala da turma)
        this.setPrivate(true);
      }
      this.metadata = { ...this.metadata, modo: this.modo, n: this.n, jogo: this.jogo };   // (o filterBy mora no metadata: não apagar)
      const st = new Estado();
      st.fase = 'espera'; st.modo = this.modo; st.n = this.n; st.jogo = this.jogo; st.codigo = this.modo === 'privada' ? this.roomId : '';
      st.placarA = 0; st.placarB = 0; st.rodada = 0;
      this.state = st;
      this.lugares = new Array(2 * this.n).fill(null);     // o lugar i → a conta (0..n-1 é o time A, como no roster da turma)
      this.porConta = new Map(); this.porSessao = new Map();
      this.E = novoEmpacotador(); this.partida = null; this.encerrado = false; this.gravacao = null;
      this.medida = { quadros: 0, bytes: 0, comandos: 0, recusados: 0, estranhos: 0 };
      this.suspeitos = [];
      this.onMessage('c', (client, m) => this.comando(client, m));
      this.onMessage('*', (client, tipo) => this.estranho(client, tipo));
      // (o relógio da sala do Colyseus só anda com o setFixedTimestep dele; aqui quem anda é o motor do RACHA — então os
      //  temporizadores da sala são os do Node, desligados no onDispose)
      this.timers = new Set();
      // (a ranqueada que não lotou começa com bots; a da turma em que alguém não chegou começa com a vaga vazia)
      if ((this.modo === 'ranqueada' || this.modo === 'turma') && C.esperaBotsMs > 0) this.depois(C.esperaBotsMs, () => this.comecaSePuder(true));
      salas.add(this);
    }
    depois(ms, fn) {
      const h = setTimeout(() => { this.timers.delete(h); try { fn(); } catch (e) { C.log('erro: ' + (e && e.message)); } }, ms);
      this.timers.add(h);
      return h;
    }

    // ------------------------------------------------------------ os lugares
    lugarLivre() {
      const conta = t => this.lugares.slice(t * this.n, (t + 1) * this.n).filter(Boolean).length;
      const t0 = conta(0) <= conta(1) ? 0 : 1;            // o time com menos gente
      for (const t of [t0, 1 - t0]) for (let k = 0; k < this.n; k++) if (!this.lugares[t * this.n + k]) return t * this.n + k;
      return -1;
    }
    poeNoEstado(r) {
      let j = this.state.jogadores.get(r.id);
      if (!j) { j = new Jogador(); this.state.jogadores.set(r.id, j); }
      j.id = r.id; j.nome = r.nome; j.lugar = r.lugar; j.time = Math.floor(r.lugar / this.n); j.conectado = r.conectado; j.conta = r.conta;
    }

    onJoin(client, options, auth) {
      const a = auth || client.auth;
      if (this.convidados && !this.convidados.has(a.id)) throw new ServerError(ErrorCode.MATCHMAKE_INVALID_ROOM_ID, 'esta partida é só de quem foi chamado (pela fila ou pela sala da turma)');
      let r = this.porConta.get(a.id);
      if (r) {                                              // a mesma conta de novo (outro aparelho, a página recarregada): fica com o lugar dela
        if (r.client && r.client !== client) { this.porSessao.delete(r.client.sessionId); try { r.client.leave(FECHA_TROCADO); } catch (_) {} }
      } else {
        const lugar = this.lugaresFixos ? this.lugaresFixos.get(a.id) : this.lugarLivre();
        if (!(lugar >= 0) || this.lugares[lugar]) throw new ServerError(ErrorCode.MATCHMAKE_INVALID_ROOM_ID, 'a sala está cheia');
        r = { id: a.id, publico: a.publico, nome: a.nome, conta: a.conta, rk: a.rk, lugar, client: null, conectado: false };
        this.porConta.set(a.id, r); this.lugares[lugar] = a.id;
      }
      r.client = client; r.conectado = true; this.porSessao.set(client.sessionId, r);
      client.userData = { conta: a.id };
      this.poeNoEstado(r);
      client.send('i', { lugar: r.lugar, time: Math.floor(r.lugar / this.n), n: this.n, conta: r.id, codigo: this.modo === 'privada' ? this.roomId : null });
      if (this.partida) this.volta(r, client);
      else this.comecaSePuder(false);
    }

    // ------------------------------------------------------------ a partida (o motor do RACHA)
    comecaSePuder(forca) {
      if (this.partida || this.encerrado) return;
      const gente = [...this.porConta.values()].filter(r => r.conectado).length;
      if (gente === 0) return;
      const cheio = gente >= Math.min(2 * this.n, this.convidados && this.convidados.size ? this.convidados.size : 2 * this.n);   // (da fila: todos que ela chamou)
      if (!cheio && !(forca && (this.modo === 'ranqueada' || this.modo === 'turma')) && !(C.comecaCom && gente >= C.comecaCom)) return;
      this.comeca();
    }
    comeca() {
      this.lock();                                          // ninguém mais entra (a volta de quem caiu continua valendo)
      const jogadores = this.lugares.map(id => {
        const r = id && this.porConta.get(id);
        if (r) return { netId: r.id, nome: r.nome };
        return this.modo === 'ranqueada' ? { netId: null, nome: 'Bot', bot: 'dificil' } : { vazio: true };   // (a ranqueada completa com bots; as outras ficam com a vaga vazia, como na v103)
      });
      const inicio = Date.now();
      // (v100: os times com uma CONTA de gente, ligada, na saída — o selo diz o:1 só com contas em dois times; quem cai no
      //  meio não tira o o:1 de ninguém, como na turma)
      this.timesComConta = new Set([...this.porConta.values()].filter(r => r.conta && r.conectado).map(r => Math.floor(r.lugar / this.n)));
      let o = {
        n: this.n, jogo: this.jogo, ranked: this.modo === 'ranqueada', jogadores, semBots: this.modo !== 'ranqueada', quadros: 60,
        regra: 'v80', r80: C.r80, decorrido: () => Date.now() - inicio,
        log: txt => C.log('[' + this.roomId + '] ' + txt),
        suspeito: (id, tipo, det) => this.suspeito(id, tipo, det),
        onSnapshot: Q => this.quadro(Q), onGol: g => this.gol(g), onAviso: txt => this.broadcast('aviso', txt), onFim: res => this.fim(res),
      };
      if (C.gravar) { this.gravacao = novoGravador(); o = gravando(this.gravacao, o); }
      this.partida = new PartidaSala(o);
      this.pid = 'p' + randomBytes(5).toString('hex');
      this.inicio = inicio;
      this.state.fase = 'jogo'; this.state.rodada = this.state.rodada + 1;
      this.broadcast('comeca', { rodada: this.state.rodada, jogadores: this.lugares.map((id, i) => ({ lugar: i, id, nome: id ? this.porConta.get(id).nome : (this.modo === 'ranqueada' ? 'Bot' : '') })) });
      this.partida.ligar();                                 // o relógio do motor do RACHA (60 passos por segundo de verdade)
    }
    quadro(Q) {
      if (this.gravacao) (this.gravacao.quadros || (this.gravacao.quadros = [])).push(JSON.stringify(Q));   // (a prova da física compara um por um)
      const bytes = this.E.empacota(Q);
      this.medida.quadros++; this.medida.bytes += bytes.length;
      this.broadcast('q', bytes);                           // (um Uint8Array vai como bytes, sem o msgpack)
      if (this.state.placarA !== Q.score[0]) this.state.placarA = Q.score[0];
      if (this.state.placarB !== Q.score[1]) this.state.placarB = Q.score[1];
    }
    gol(g) { this.broadcast('gol', { placar: g.placar, autor: g.author || null, assist: g.assist || null, contra: !!g.contra }); }

    // o comando do aparelho: a mesma limpeza da turma (server/turma.js · input) e depois a fila do motor (sala.js · entrada)
    comando(client, m) {
      const r = this.porSessao.get(client.sessionId);
      if (!r || !this.partida || this.encerrado || !m || typeof m !== 'object' || Array.isArray(m)) { this.medida.recusados++; return; }
      const cmd = {
        seq: inteiro(m.seq, 0, 2e9, 0), x: Number.isFinite(m.x) ? m.x : 0, y: Number.isFinite(m.y) ? m.y : 0,
        button: [1, 2, 3].includes(m.button) ? m.button : 1, k: inteiro(m.k, 0, 7, 0),
        kc: inteiro(m.kc, 0, 2e9, undefined), pc: inteiro(m.pc, 0, 2e9, undefined),
      };
      this.medida.comandos++; r.cmds = (r.cmds | 0) + 1;
      if (this.gravacao) gravaComando(this.gravacao, this.partida, r.id, cmd);
      this.partida.entrada(r.id, cmd);
    }
    // o que o aparelho não pode mandar (o quadro, o fim, o placar…): fica registrado, sem banimento automático (a regra da turma)
    estranho(client, tipo) {
      this.medida.estranhos++;
      const r = this.porSessao.get(client.sessionId);
      this.suspeito(r ? r.id : client.sessionId, 'mensagem', String(tipo).slice(0, 20));
    }
    suspeito(id, tipo, det) {
      if (this.suspeitos.length < 500) this.suspeitos.push({ id, tipo, det: det == null ? '' : String(det), t: Date.now() });
      C.log('suspeito na sala ' + this.roomId + ': ' + id + ' ' + tipo + (det ? ' (' + det + ')' : ''));
    }

    // ------------------------------------------------------------ a queda e a volta
    onDrop(client, code) {
      const r = this.porSessao.get(client.sessionId);
      if (!r || r.client !== client) return;
      r.conectado = false; this.poeNoEstado(r);
      if (this.partida && !this.encerrado) this.partida.sai(r.id);   // um bot assume (ranqueada) ou a vaga espera (as outras): a partida não para
      if (KICK.has(code)) return;                            // (tirado pelo servidor: não guarda a vaga)
      r.token = this.roomId + ':' + client.reconnectionToken;  // (a volta pela conta, de outro aparelho: tokenDaConta)
      r.esperando = this.allowReconnection(client, C.reconexaoS);
      r.esperando.catch(() => {});                           // (a janela venceu: quem cuida é o onLeave)
    }
    onReconnect(client) {
      const r = this.porSessao.get(client.sessionId);
      if (!r) return;
      r.client = client; r.conectado = true; r.esperando = null; r.token = null; this.poeNoEstado(r);
      if (this.partida && !this.encerrado) this.volta(r, client);
    }
    volta(r, client) {                                      // a tampinha volta para quem caiu (a fila de comandos recomeça) e o quadro-chave
      const i = this.partida.entra(r.id, r.nome, r.lugar);
      client.send('i', { lugar: r.lugar, time: Math.floor(r.lugar / this.n), n: this.n, conta: r.id, volta: true, lugarMotor: i });
      client.sendBytes('q', this.E.chave(this.partida.quadro()));
    }
    onLeave(client, code) {
      const r = this.porSessao.get(client.sessionId);
      this.porSessao.delete(client.sessionId);
      if (!r || r.client !== client) return;                // (a conexão velha de quem entrou de novo)
      r.conectado = false; r.client = null; r.esperando = null; r.token = null; this.poeNoEstado(r);
      if (this.partida && !this.encerrado) this.partida.sai(r.id);
      if (!this.partida && !this.encerrado) {               // antes de começar: o lugar fica livre
        this.lugares[r.lugar] = null; this.porConta.delete(r.id); this.state.jogadores.delete(r.id);
      }
      if (this.partida && !this.encerrado && ![...this.porConta.values()].some(x => x.conectado || x.esperando)) {
        this.partida.aborta(); this.partida.desligar(); this.encerrado = true; this.state.fase = 'abortada';   // todo mundo foi embora: sem resultado
      }
    }

    // ------------------------------------------------------------ o fim: quem decide é o motor; o selo é o da plataforma
    fim(res) {
      if (this.encerrado) return;
      this.encerrado = true;
      if (this.partida) this.partida.desligar();
      this.state.fase = 'fim';
      const agora = Date.now(), dur = Math.round((agora - this.inicio) / 1000), times = this.timesComConta || new Set();
      const gols = {}, assist = {};
      for (const e of res.estat || []) if (!e.bot) { gols[e.k] = e.g | 0; assist[e.k] = e.a | 0; }
      const jogaram = this.lugares.map(id => id && this.porConta.get(id)).filter(r => r && r.conta).map(r => r.publico).slice(0, 8);   // (o g da v88: as contas na ordem do roster, até 8)
      const resumo = { sala: this.roomId, rodada: this.state.rodada, pid: this.pid, modo: this.modo, n: this.n, jogo: this.jogo, placar: res.placar, vencedor: res.vencedor, duracao: dur, prorrog: !!res.prorrog, jogadores: [...this.porConta.values()].map(r => ({ id: r.publico, nome: r.nome, conta: r.conta, time: Math.floor(r.lugar / this.n), gols: gols[r.id] | 0, assist: assist[r.id] | 0 })) };
      for (const r of this.porConta.values()) {
        if (!r.conta) continue;
        const l = Math.floor(r.lugar / this.n);
        // os campos do selo da turma (server/turma.js · encerra): a plataforma confere com o confereSelo de sempre
        const sl = { s: this.roomId, r: this.state.rodada, j: r.publico, l, p: [res.placar[l], res.placar[1 - l]], m: this.jogo, d: dur, k: this.modo === 'ranqueada' ? 1 : 0, n: this.n, g: jogaram, v: 0, t: agora, e: agora + 40 * 60e3, h: 1, pid: this.pid, gl: gols[r.id] | 0, as: assist[r.id] | 0 };
        if (times.size >= 2) sl.o = 1;
        r.selo = assina(C.segredo, sl);
        if (r.client && r.conectado) r.client.send('selo', r.selo);
      }
      // o resultado direto do servidor para a plataforma (hoje ele só chega pelo aparelho — quem perde pode não mandar)
      if (C.plataforma) { try { C.plataforma(assina(C.segredo, { tipo: 'resultado', ...resumo, t: agora, e: agora + 40 * 60e3 }), resumo); } catch (e) { C.log('plataforma: ' + (e && e.message)); } }
      this.resumo = resumo;
      this.broadcast('fim', { placar: res.placar, vencedor: res.vencedor, estat: res.estat });
      this.depois(C.fimMs, () => this.disconnect());
    }

    onDispose() {
      if (this.partida) { if (!this.encerrado) this.partida.aborta(); this.partida.desligar(); }
      for (const h of this.timers) clearTimeout(h); this.timers.clear();
      salas.delete(this);
    }
  }
  /* a volta pela conta: quem caiu e voltou por OUTRO aparelho (ou perdeu o token) pede, com o bilhete, o token da vaga que
     está guardada para a conta dele — a turma de hoje devolve a vaga pela conta, e a sala trancada do Colyseus só aceita a
     volta pelo token (o joinById numa sala trancada é recusado) */
  function tokenDaConta(id) {
    for (const sala of salas) { const r = sala.porConta && sala.porConta.get(id); if (r && r.esperando && r.token && !sala.encerrado) return r.token; }
    return null;
  }
  return { SalaRacha, salas, tokenDaConta, contaDoBilhete, C };
}
