/* =====================================================================================================================
   PROTÓTIPO COLYSEUS · O QUADRO EM BINÁRIO (sem perda)
   O quadro clássico do RACHA (server/partida/sala.js · quadro(): tick, elapsed, state, kickoff, score, ball, players, goal,
   ent e os campos raros) empacotado em bytes, e desempacotado EXATAMENTE no mesmo objeto — o jogo de hoje continuaria lendo
   o mesmo quadro, só que ele viaja menor. Os números do quadro já saem arredondados do motor (0,1 nas posições e
   velocidades, 0,001 no giro e nos tempos): aqui eles viram inteiros (×10 e ×1000), então ida e volta dão o mesmo número.
   · posições e velocidades em 2 bytes (×10, até ±3276,7); se algum número do quadro não couber, o quadro inteiro vai com 4
     bytes nesses campos (a marca LARGO) — nunca corta;
   · o gol (um objeto com nomes) só vai quando muda e num quadro-chave a cada CHAVE_A_CADA quadros (quem entra no meio pega
     em até 1 s); o resto que for raro (fora, cred, bz, cr, m94, um estado desconhecido) vai num pedacinho de JSON.
   O empacotador e o desempacotador guardam o último gol (cada sala tem o seu par; cada aparelho, o seu desempacotador).
   ===================================================================================================================== */
const VERSAO = 1;
const F_CURVA = 1, F_LARGO = 2, F_GOL = 4, F_ENT = 8, F_EXTRA = 16, F_SEM_GOL = 32;
const ESTADOS = ['saida', 'jogo', 'gol', 'fim'];
export const CHAVE_A_CADA = 30;
const NATIVOS = new Set(['tick', 'elapsed', 'state', 'kickoff', 'score', 'ball', 'players', 'goal', 'ent']);
const cabe16 = v => Number.isFinite(v) && Math.abs(Math.round(v * 10)) <= 32767;
const i10 = v => Math.round(v * 10), i1000 = v => Math.round(v * 1000);
const enc = new TextEncoder(), dec = new TextDecoder();

class Escreve {
  constructor() { this.b = new ArrayBuffer(512); this.v = new DataView(this.b); this.n = 0; }
  cabe(k) { if (this.n + k <= this.b.byteLength) return; const nb = new ArrayBuffer(Math.max(this.b.byteLength * 2, this.n + k)); new Uint8Array(nb).set(new Uint8Array(this.b, 0, this.n)); this.b = nb; this.v = new DataView(nb); }
  u8(x) { this.cabe(1); this.v.setUint8(this.n, x); this.n += 1; }
  i8(x) { this.cabe(1); this.v.setInt8(this.n, x); this.n += 1; }
  u16(x) { this.cabe(2); this.v.setUint16(this.n, x); this.n += 2; }
  i16(x) { this.cabe(2); this.v.setInt16(this.n, x); this.n += 2; }
  u32(x) { this.cabe(4); this.v.setUint32(this.n, x); this.n += 4; }
  i32(x) { this.cabe(4); this.v.setInt32(this.n, x); this.n += 4; }
  txt(s) { const u = enc.encode(s); this.u16(u.length); this.cabe(u.length); new Uint8Array(this.b, this.n, u.length).set(u); this.n += u.length; }
  pronto() { return new Uint8Array(this.b, 0, this.n).slice(); }
}
class Le {
  constructor(u8) { this.v = new DataView(u8.buffer, u8.byteOffset, u8.byteLength); this.u = u8; this.n = 0; }
  u8() { const x = this.v.getUint8(this.n); this.n += 1; return x; }
  i8() { const x = this.v.getInt8(this.n); this.n += 1; return x; }
  u16() { const x = this.v.getUint16(this.n); this.n += 2; return x; }
  i16() { const x = this.v.getInt16(this.n); this.n += 2; return x; }
  u32() { const x = this.v.getUint32(this.n); this.n += 4; return x; }
  i32() { const x = this.v.getInt32(this.n); this.n += 4; return x; }
  txt() { const k = this.u16(); const s = dec.decode(this.u.subarray(this.n, this.n + k)); this.n += k; return s; }
}

// o empacotador de uma sala: lembra o último gol que mandou (o gol vai quando muda e nos quadros-chave)
export function novoEmpacotador() {
  let golTxt = null, n = 0;
  // empacota(Q): o quadro do fluxo da sala (para todos). chave(Q): um quadro-chave avulso, para UM aparelho que acabou de
  // entrar ou voltar (com o gol; não mexe na memória do fluxo de todos)
  const faz = (Q, chave, avulso) => {
      const w = new Escreve(), b = Q.ball || [], ps = Q.players || [];
      const curva = b.length >= 7;
      const nums = [b[0], b[1], b[2], b[3]];
      for (const p of ps) nums.push(p[0], p[1], p[2], p[3]);
      const largo = !nums.every(cabe16);
      const gt = Q.goal ? JSON.stringify(Q.goal) : null;
      const k = !!chave || avulso || (n++ % CHAVE_A_CADA === 0);
      const manda = gt !== null && (k || gt !== golTxt);
      const semGol = gt === null && (avulso || golTxt !== null);   // (o gol sumiu do quadro: avisa)
      if (!avulso) golTxt = gt;
      const extra = {};
      for (const key of Object.keys(Q)) if (!NATIVOS.has(key)) extra[key] = Q[key];
      if (ps.some(p => p.length > 8)) extra.__p9 = ps.map(p => p.length > 8 ? p.slice(8) : null);   // (o 9º número do DB por estados)
      let st = ESTADOS.indexOf(Q.state);
      if (st < 0) { st = 255; extra.state = Q.state; }
      const sc = Q.score || [0, 0];
      if (!(sc[0] >= 0 && sc[0] <= 255 && sc[1] >= 0 && sc[1] <= 255)) extra.score = sc;
      const temExtra = Object.keys(extra).length > 0;
      const ent = Array.isArray(Q.ent) && Q.ent.length === ps.length && Q.ent.every(e => Array.isArray(e) && e.length <= 255 && e.every(x => Number.isInteger(x) && x >= -128 && x <= 127));
      if (Q.ent && !ent) extra.ent = Q.ent;
      w.u8(VERSAO);
      w.u8((curva ? F_CURVA : 0) | (largo ? F_LARGO : 0) | (manda ? F_GOL : 0) | (ent ? F_ENT : 0) | (temExtra || (Q.ent && !ent) ? F_EXTRA : 0) | (semGol ? F_SEM_GOL : 0));
      w.u32(Q.tick >>> 0); w.u32(Math.max(0, i1000(Q.elapsed || 0)) >>> 0); w.u8(st); w.u8(Q.kickoff | 0);
      w.u8(sc[0] >= 0 && sc[0] <= 255 ? sc[0] : 0); w.u8(sc[1] >= 0 && sc[1] <= 255 ? sc[1] : 0);
      const pos = v => largo ? w.i32(i10(v)) : w.i16(i10(v));
      pos(b[0]); pos(b[1]); pos(b[2]); pos(b[3]); w.i32(i1000(b[4] || 0));
      if (curva) { w.i32(i1000(b[5])); w.i32(i1000(b[6])); }
      w.u8(ps.length);
      for (const p of ps) {
        pos(p[0]); pos(p[1]); pos(p[2]); pos(p[3]);
        w.u32((p[4] || 0) >>> 0); w.i32(p[5] | 0); w.i32(i1000(p[6])); w.u16((p[7] | 0) & 0xffff);
      }
      if (ent) for (const e of Q.ent) { w.u8(e.length); for (const x of e) w.i8(x); }
      if (manda) w.txt(gt);
      if (temExtra || (Q.ent && !ent)) w.txt(JSON.stringify(extra));
      return w.pronto();
  };
  return { empacota: (Q, chave) => faz(Q, chave, false), chave: Q => faz(Q, true, true) };
}

// o desempacotador de um aparelho: devolve o mesmo objeto que o motor fez (com o último gol guardado)
export function novoDesempacotador() {
  let gol = null;
  return {
    desempacota(u8) {
      const r = new Le(u8);
      const ver = r.u8(); if (ver !== VERSAO) throw new Error('quadro de outra versão: ' + ver);
      const fl = r.u8(), largo = fl & F_LARGO;
      const Q = { tick: r.u32(), elapsed: r.u32() / 1000 };
      const st = r.u8(); Q.state = ESTADOS[st]; Q.kickoff = r.u8(); Q.score = [r.u8(), r.u8()];
      const pos = () => (largo ? r.i32() : r.i16()) / 10;
      const b = [pos(), pos(), pos(), pos(), r.i32() / 1000];
      if (fl & F_CURVA) b.push(r.i32() / 1000, r.i32() / 1000);
      Q.ball = b;
      const np = r.u8(); Q.players = [];
      for (let i = 0; i < np; i++) Q.players.push([pos(), pos(), pos(), pos(), r.u32(), r.i32(), r.i32() / 1000, r.u16()]);
      let ent = null;
      if (fl & F_ENT) { ent = []; for (let i = 0; i < np; i++) { const k = r.u8(), e = []; for (let j = 0; j < k; j++) e.push(r.i8()); ent.push(e); } }
      if (fl & F_GOL) gol = JSON.parse(r.txt());
      else if (fl & F_SEM_GOL) gol = null;
      Q.goal = gol;
      if (ent) Q.ent = ent;
      if (fl & F_EXTRA) {
        const x = JSON.parse(r.txt());
        if (x.__p9) { x.__p9.forEach((v, i) => { if (v && Q.players[i]) Q.players[i].push(...v); }); delete x.__p9; }
        Object.assign(Q, x);
      }
      if (Q.state === undefined) Q.state = null;
      return Q;
    },
  };
}
