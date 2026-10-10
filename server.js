'use strict';
/* =====================================================================================
   RACHA — o servidor do jogo online
   Salas (Time Vermelho, Espectadores e Equipe Azul), Copa dos Amigos, clubes e o Chat do Brasil.

   Não precisa instalar nada: só o Node.js 18 ou mais novo.
       node server.js
   O mesmo endereço entrega o jogo (public/index.html) e a conexão das salas (WebSocket).
   Abriu http://SEU-ENDERECO no celular → o jogo já conecta sozinho no servidor.

   Variáveis (opcionais):
     PORT          porta (a hospedagem costuma definir sozinha). Padrão: 8080
     SERVER_NAME   o nome que aparece em "Servidor: ..." na sala.  Padrão: South America
     DATA_DIR      pasta onde ficam clubes, duelos e campeões.      Padrão: ./data
   ===================================================================================== */
const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');

const PORT = Number(process.env.PORT) || 8080;
const SERVER_NAME = String(process.env.SERVER_NAME || 'South America').slice(0, 32);
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const PUBLIC_DIR = path.join(__dirname, 'public');
const VERSAO = '1.1.0';

/* ---- regras das salas (mexa à vontade) ---- */
const NUM_MAPAS = 4;                       // Arena, Favela, Escadão e Viaduto (o índice vai de 0 a NUM_MAPAS - 1)
const MODOS = ['futebol', 'curva', 'volei', 'americano', 'basquete'];   // os modos de jogo da sala (a GINGA fica de fora no online)
const TEMPOS = [0, 2, 3, 5];               // minutos (0 = sem tempo: primeiro a fazer 3 gols)
const MAX_NA_SALA = 16;                    // jogadores + espectadores
const MAX_POR_IP = Number(process.env.MAX_POR_IP) || 150;   // conexões abertas do mesmo endereço (alto: no 4G muita gente sai pelo mesmo IP)
const MAX_MSG = 256*1024;                  // tamanho máximo de uma mensagem (bytes)
const SEM_SNAPSHOT_MS = 45000;             // o dono da sala parou de mandar a partida por 45 s: a partida é encerrada
const BAN_MS = 2*60*1000;                  // quem é removido da sala não volta por 2 minutos
const FRASES_RAPIDAS = ['Bora jogar!', 'Tô pronto!', 'Boa sorte!', 'Começa aí!', 'Boa partida!', 'Revanche?'];

/* =====================================================================================
   Banco de dados simples (um arquivo JSON): jogadores, clubes, duelos e campeões
   ===================================================================================== */
const db = {users:{}, clubs:{}, duels:{}, champions:[]};
const usersById = new Map();
const DB_FILE = path.join(DATA_DIR, 'db.json');
function dbLoad(){
  try {
    const o = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    if (o && typeof o === 'object'){
      for (const k of ['users', 'clubs', 'duels']) if (o[k] && typeof o[k] === 'object') db[k] = o[k];
      if (Array.isArray(o.champions)) db.champions = o.champions.slice(0, 40);
    }
  } catch (e) { if (e.code !== 'ENOENT') console.warn('[db] não deu para ler', DB_FILE, '-', e.message); }
  for (const t in db.users) usersById.set(db.users[t].id, db.users[t]);
  console.log('[db] %d jogadores, %d clubes', usersById.size, Object.keys(db.clubs).length);
}
let dbTimer = null;
function dbSave(agora){
  if (agora){ clearTimeout(dbTimer); dbTimer = null; return dbWrite(); }
  if (!dbTimer) dbTimer = setTimeout(() => { dbTimer = null; dbWrite(); }, 2500);
}
function dbWrite(){
  try {
    fs.mkdirSync(DATA_DIR, {recursive:true});
    const tmp = DB_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(db));
    fs.renameSync(tmp, DB_FILE);
  } catch (e) { console.warn('[db] não deu para salvar:', e.message); }
}

/* =====================================================================================
   Utilidades
   ===================================================================================== */
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';     // sem 0/O e 1/I, para ninguém errar o código
function genCode(n){ const b = crypto.randomBytes(n); let s = ''; for (let i = 0; i < n; i++) s += CODE_CHARS[b[i] % CODE_CHARS.length]; return s; }
function rid(prefix){ return prefix + crypto.randomBytes(6).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 8); }
const semLixo = s => String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f<>]/g, '');
const limpa = (s, max) => Array.from(semLixo(s).replace(/\s+/g, ' ')).slice(0, max).join('').trim();
const int = (v, min, max, pad) => { v = Number(v); return Number.isInteger(v) && v >= min && v <= max ? v : pad; };
const num = (v, min, max) => { v = Number(v); return Number.isFinite(v) ? Math.max(min, Math.min(max, v)) : 0; };
const COR_RE = /^#[0-9a-f]{6}$/i;
function limpaSkin(s){ s = String(s || ''); return /^[a-z0-9_-]{1,40}$/i.test(s) ? s : ''; }
function limpaAvatar(a){
  if (!a || typeof a !== 'object') return null;
  return {t:limpa(a.t, 3), e:/^[a-z0-9_-]{0,24}$/i.test(String(a.e || '')) ? String(a.e || '') : '', cor:COR_RE.test(a.cor || '') ? a.cor : '#ffffff'};
}
function limpaBandeira(f){ f = String(f || '').toUpperCase(); return /^[A-Z]{2}$/.test(f) ? f : ''; }
function usuarioDoToken(t){                          // (só tokens no formato que o servidor cria)
  return typeof t === 'string' && /^[a-f0-9]{36}$/.test(t) && Object.prototype.hasOwnProperty.call(db.users, t) ? db.users[t] : null;
}
function embaralha(a){ for (let i = a.length - 1; i > 0; i--){ const j = crypto.randomInt(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; }

/* o filtro do chat (o mesmo do jogo; aqui é quem decide de verdade) */
const FILTRO = [
  /p[o0]+rr+a|p\*+a|put[4@]|c[4a]r[4a]lh|buc[3e]t|f[0o]d[4a]|cuz[4aã]o|v[14]g[14]nd|p[3e]n[1i]s|m[3e]rd[4a]|arromb|viad[o0]|desgra[cç]/i,
  /https?:|www\.|\.com|\.net|\.gg\b|discord\.|t\.me\//i,      // link
  /@[a-z0-9_.]{3,}/i,                                           // @ de rede social
  /(\(?\d{2}\)?\s?)?9?\s?\d{4}[-.\s]?\d{4}/,                    // telefone
  /\b\S+@\S+\.\S+\b/,                                           // e-mail
  /\d{3}[.\s]?\d{3}[.\s]?\d{3}[-.\s]?\d{2}/                     // número tipo CPF
];
const bloqueado = txt => FILTRO.some(r => r.test(txt));
const nomeOk = s => { const n = limpa(s, 12); return n && !bloqueado(n) ? n : ''; };   // o apelido que aparece na sala e na lista

/* =====================================================================================
   WebSocket (RFC 6455) feito à mão: sem pacote nenhum para instalar
   ===================================================================================== */
const WS_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
class Sock {
  constructor(socket, ip){
    this.socket = socket; this.ip = ip; this.open = true; this.buf = null; this.frag = null; this.fragLen = 0; this.fragOp = 0;
    this.lastSeen = Date.now(); this.onmessage = null; this.onclose = null;
    socket.setNoDelay(true); socket.setTimeout(0); socket.setKeepAlive(true, 30000);
    socket.on('data', d => this.feed(d));
    socket.on('close', () => this.fim());
    socket.on('error', () => this.fim());
    socket.on('end', () => this.fim());
  }
  feed(chunk){
    this.lastSeen = Date.now();
    this.buf = this.buf && this.buf.length ? Buffer.concat([this.buf, chunk]) : chunk;
    while (this.open && this.buf){
      const b = this.buf; if (b.length < 2) return;
      const fin = (b[0] & 0x80) !== 0, op = b[0] & 0x0f, masked = (b[1] & 0x80) !== 0;
      let len = b[1] & 0x7f, off = 2;
      if (len === 126){ if (b.length < 4) return; len = b.readUInt16BE(2); off = 4; }
      else if (len === 127){ if (b.length < 10) return; if (b.readUInt32BE(2) !== 0) return this.close(1009); len = b.readUInt32BE(6); off = 10; }
      if (len > MAX_MSG) return this.close(1009);
      if (!masked) return this.close(1002);                    // o navegador sempre manda mascarado
      if (b.length < off + 4 + len) return;
      const m0 = b[off], m1 = b[off + 1], m2 = b[off + 2], m3 = b[off + 3]; off += 4;
      const data = Buffer.allocUnsafe(len), mask = [m0, m1, m2, m3];
      for (let i = 0; i < len; i++) data[i] = b[off + i] ^ mask[i & 3];
      this.buf = b.length > off + len ? b.subarray(off + len) : null;
      this.frame(fin, op, data);
    }
  }
  frame(fin, op, data){
    if (op === 0x8){ this.close(1000); return; }                                  // close: responde e fecha
    if (op === 0x9){ this.raw(0xA, data); return; }                                // ping → pong
    if (op === 0xA) return;                                                        // pong (o lastSeen já andou)
    if (op === 0x0){                                                               // continuação
      if (!this.frag) return this.close(1002);
      this.frag.push(data); this.fragLen += data.length; if (this.fragLen > MAX_MSG) return this.close(1009);
      if (fin){ const tudo = Buffer.concat(this.frag), o = this.fragOp; this.frag = null; if (o === 0x1) this.msg(tudo); }
      return;
    }
    if (op === 0x1 || op === 0x2){
      if (!fin){ this.frag = [data]; this.fragLen = data.length; this.fragOp = op; return; }
      if (op === 0x1) this.msg(data);
      return;
    }
    this.close(1002);
  }
  msg(buf){ if (this.onmessage) try { this.onmessage(buf.toString('utf8')); } catch (e) { console.error('[ws] erro tratando mensagem:', e); } }
  raw(op, data){
    if (!this.open || this.socket.destroyed) return;
    const len = data.length; let h;
    if (len < 126){ h = Buffer.allocUnsafe(2); h[1] = len; }
    else if (len < 65536){ h = Buffer.allocUnsafe(4); h[1] = 126; h.writeUInt16BE(len, 2); }
    else { h = Buffer.allocUnsafe(10); h[1] = 127; h.writeUInt32BE(0, 2); h.writeUInt32BE(len, 6); }
    h[0] = 0x80 | op;
    this.socket.cork(); this.socket.write(h); this.socket.write(data); this.socket.uncork();
  }
  send(str){ this.raw(0x1, Buffer.from(str, 'utf8')); }
  get buffered(){ return this.socket.writableLength || 0; }
  ping(){ this.raw(0x9, Buffer.alloc(0)); }
  close(code){
    if (!this.open) return;
    const p = Buffer.alloc(2); p.writeUInt16BE(code || 1000, 0);
    try { this.raw(0x8, p); } catch (_) {}
    this.fim(); try { this.socket.end(); } catch (_) {}
    setTimeout(() => { try { this.socket.destroy(); } catch (_) {} }, 1500).unref();
  }
  fim(){ if (!this.open) return; this.open = false; this.buf = null; this.frag = null; if (this.onclose) try { this.onclose(); } catch (e) { console.error('[ws] erro ao fechar:', e); } }
}

/* =====================================================================================
   Conexões
   ===================================================================================== */
const conns = new Set();
const porIp = new Map();
let seqSessao = 0;

function send(c, obj){ if (c.ws.open) c.ws.send(JSON.stringify(obj)); }
function sendRaw(c, str){ if (c.ws.open) c.ws.send(str); }
function erro(c, message){ send(c, {type:'error', message}); }
function permite(c, chave, porSeg, rajada){            // limite de mensagens por segundo (balde de fichas)
  const agora = Date.now(), b = c.baldes[chave] || (c.baldes[chave] = {f:rajada, t:agora});
  b.f = Math.min(rajada, b.f + (agora - b.t)/1000*porSeg); b.t = agora;
  if (b.f < 1) return false; b.f -= 1; return true;
}

function onConexao(ws){
  const c = {ws, ip:ws.ip, id:null, user:null, name:'Jogador', skin:'', avatar:null, flag:'',
    room:null, slot:-1, ready:false, rematch:false, brasil:false, bfrom:'', lastSay:0, lastText:'', sayAt:0, baldes:{}};
  conns.add(c);
  ws.onmessage = txt => {
    if (!permite(c, 'tudo', 260, 400)) return;           // ninguém precisa de mais que isso (a partida manda ~90 por segundo)
    let m; try { m = JSON.parse(txt); } catch (_) { return; }
    if (!m || typeof m !== 'object' || typeof m.type !== 'string') return;
    if (!Object.prototype.hasOwnProperty.call(HANDLERS, m.type)) return;
    HANDLERS[m.type](c, m, txt);
  };
  ws.onclose = () => {
    conns.delete(c);
    const n = (porIp.get(c.ip) || 1) - 1; if (n > 0) porIp.set(c.ip, n); else porIp.delete(c.ip);
    if (c.room) saiDaSala(c, 'caiu');
    if (c.brasil){ BR.conns.delete(c); brOnline(); }
    if (c.id) listaMudou();
  };
}

/* =====================================================================================
   Salas
   ===================================================================================== */
const rooms = new Map();

function novaSala(dono, o){
  let code; do code = genCode(6); while (rooms.has(code));
  const n = int(o.n, 1, 4, 1);
  let nome = limpa(o.name, 24); if (bloqueado(nome)) nome = '';
  const r = {code, name:nome || ('Sala de ' + dono.name), autoNome:!nome || nome === 'Sala de ' + dono.name, pub:o.pub !== false && o.pub !== 0,
    host:dono.id, n, map:int(o.map, 0, NUM_MAPAS - 1, 0), jogo:MODOS.includes(o.jogo) ? o.jogo : 'futebol',
    bots:o.bots === true, tempo:TEMPOS.includes(Number(o.tempo)) ? Number(o.tempo) : 0,
    roster:new Array(n*2).fill(null), members:[], state:'waiting', round:0, tournament:null,
    chat:[], ban:new Map(), lastSnap:0, created:Date.now()};
  rooms.set(code, r);
  return r;
}
function nomeDe(r, id){ const m = r.members.find(x => x.id === id); return m ? m.name : 'Jogador'; }
function clubeDe(c){
  const cl = c.user && c.user.club && db.clubs[c.user.club];
  return cl ? {name:cl.name, tag:cl.tag, color:cl.color, badge:cl.badge} : null;
}
function salaView(r){
  const t = r.tournament;
  return {code:r.code, name:r.name, pub:r.pub, host:r.host, n:r.n, map:r.map, jogo:r.jogo, bots:r.bots, tempo:r.tempo,
    state:r.state, round:r.round, roster:r.roster.slice(),
    members:r.members.map(m => ({id:m.id, name:m.name, skin:m.skin, avatar:m.avatar, flag:m.flag, club:clubeDe(m),
      slot:m.slot, ready:!!m.ready, rematch:!!m.rematch})),
    tournament:t ? {name:t.name, rounds:t.rounds, matches:t.matches, champion:t.champion} : null};
}
function mandaSala(r){
  const s = JSON.stringify({type:'room', room:salaView(r)});
  for (const m of r.members) sendRaw(m, s);
}
function aviso(r, text, who){                          // a mensagem do sistema no chat da sala ("Fulano entrou na sala")
  const msg = {type:'say', sys:true, text, t:Date.now()}; if (who) msg.who = who;
  r.chat.push(msg); if (r.chat.length > 30) r.chat.shift();
  const s = JSON.stringify(msg); for (const m of r.members) sendRaw(m, s);
}
function vagaLivre(r, time){ for (let k = 0; k < r.n; k++){ const i = time*r.n + k; if (!r.roster[i]) return i; } return -1; }
function humanosNoTime(r, time){ let n = 0; for (let k = 0; k < r.n; k++) if (r.roster[time*r.n + k]) n++; return n; }
function vagaEquilibrada(r){                            // entra no time com menos gente (o vermelho, se empatar)
  const a = humanosNoTime(r, 0), b = humanosNoTime(r, 1);
  const pri = a <= b ? 0 : 1, v = vagaLivre(r, pri);
  return v >= 0 ? v : vagaLivre(r, 1 - pri);
}
function poeNaVaga(r, m, slot){
  if (m.slot >= 0 && r.roster[m.slot] === m.id) r.roster[m.slot] = null;
  m.slot = slot; m.ready = false;
  if (slot >= 0) r.roster[slot] = m.id;
}
function ehDono(c){ return c.room && c.room.host === c.id; }
function trocaDono(r, novo){                           // a sala com o nome automático ("Sala de Fulano") acompanha o dono
  r.host = novo.id;
  if (r.autoNome) r.name = 'Sala de ' + novo.name;
}

/* a lista de salas abertas (públicas), para quem está procurando uma */
function listaSalas(){
  const L = [];
  for (const r of rooms.values()){
    if (!r.pub) continue;
    const dono = r.members.find(m => m.id === r.host);
    L.push({code:r.code, name:r.name, host:dono ? dono.name : '', flag:dono ? dono.flag : '', n:r.n, map:r.map, jogo:r.jogo, tempo:r.tempo, bots:r.bots,
      players:r.roster.filter(Boolean).length, people:r.members.length, max:r.n*2, state:r.state, cup:!!r.tournament});
  }
  L.sort((a, b) => (a.state === 'playing') - (b.state === 'playing') || (b.max - b.players > 0) - (a.max - a.players > 0) || b.people - a.people);
  return L.slice(0, 60);
}
let listaTimer = null;
function listaMudou(){                                 // avisa (de leve) quem está na tela de salas
  if (listaTimer) return;
  listaTimer = setTimeout(() => {
    listaTimer = null;
    const s = JSON.stringify({type:'rooms', list:listaSalas(), online:contaOnline()});
    for (const c of conns) if (c.id && !c.room) sendRaw(c, s);
  }, 400);
}
function contaOnline(){ let n = 0; for (const c of conns) if (c.id) n++; return n; }

function entraNaSala(c, r, assistir, slotPedido){
  if (c.room) saiDaSala(c, 'trocou');
  c.room = r; c.slot = -1; c.ready = false; c.rematch = false;
  r.members.push(c);
  if (!assistir && r.state !== 'playing' && !r.tournament){
    const v = Number.isInteger(slotPedido) && slotPedido >= 0 && slotPedido < r.roster.length && !r.roster[slotPedido] ? slotPedido : vagaEquilibrada(r);
    if (v >= 0) poeNaVaga(r, c, v);
  }
  send(c, {type:'sayHistory', list:r.chat.slice(-20)});
  aviso(r, c.name + ' entrou na sala', c.id);
  mandaSala(r);
  if (r.state === 'playing') send(c, {type:'start', room:salaView(r)});   // a partida já está rolando: assiste
  listaMudou();
}

function saiDaSala(c, motivo){
  const r = c.room; if (!r) return;
  const eraDono = r.host === c.id, slot = c.slot, time = slot >= 0 ? Math.floor(slot/r.n) : -1;
  r.members = r.members.filter(m => m !== c);
  if (slot >= 0 && r.roster[slot] === c.id) r.roster[slot] = null;
  { const s = JSON.stringify({type:'typing', id:c.id, on:false}); for (const m of r.members) sendRaw(m, s); }   // (saiu: some o "digitando" dele)
  c.room = null; c.slot = -1; c.ready = false; c.rematch = false;
  if (!r.members.length){ rooms.delete(r.code); listaMudou(); return; }
  if (eraDono) trocaDono(r, r.members.find(m => m.slot >= 0) || r.members[0]);
  if (r.tournament) copaWO(r, c.id);
  aviso(r, c.name + (motivo === 'removido' ? ' foi removido da sala' : ' saiu da sala') + (eraDono ? ' · ' + nomeDe(r, r.host) + ' agora é o dono' : ''));
  if (r.state === 'playing'){
    let fim = '';
    if (eraDono) fim = 'O dono da sala saiu. A partida foi encerrada.';
    else if (time >= 0 && humanosNoTime(r, time) === 0 && !r.bots) fim = c.name + ' saiu e o time ficou vazio. Partida encerrada.';
    if (fim){
      r.state = 'waiting';
      if (r.tournament){ if (r.tournament.champion) r.state = 'ended'; else copaSenta(r); }   // na copa: o próximo duelo já fica na quadra
      const s = JSON.stringify({type:'interrupted', message:fim});
      for (const m of r.members) sendRaw(m, s);
    }
  }
  mandaSala(r);
  listaMudou();
}

function comecaPartida(r){
  r.state = 'playing'; r.round++; r.lastSnap = Date.now();
  for (const m of r.members){ m.ready = false; m.rematch = false; }
  const s = JSON.stringify({type:'start', room:salaView(r)});
  for (const m of r.members) sendRaw(m, s);
  listaMudou();
}
function podeComecar(r){                               // devolve o motivo de não poder (ou '' se pode)
  const gente = r.roster.filter(Boolean).length;
  if (!gente) return 'Ninguém está nos times. Toque no Time Vermelho ou na Equipe Azul para entrar.';
  if (!r.bots){
    const falta = r.roster.length - gente;
    if (falta) return 'Falta' + (falta > 1 ? 'm ' + falta + ' jogadores' : ' 1 jogador') + '. Complete os times ou ligue os BOTS.';
  }
  return '';
}
function reorganiza(r, n){                              // mudou o formato (1v1 → 3v3): cada um fica no seu time
  const velho = r.roster, nv = r.n, novo = new Array(n*2).fill(null), sobra = [];
  for (let i = 0; i < velho.length; i++){
    const id = velho[i]; if (!id) continue;
    const t = Math.floor(i/nv), k = i % nv;
    if (k < n) novo[t*n + k] = id; else sobra.push([id, t]);
  }
  r.n = n; r.roster = novo;
  for (const [id, t] of sobra){
    let v = -1; for (let k = 0; k < n; k++) if (!novo[t*n + k]){ v = t*n + k; break; }
    if (v >= 0) novo[v] = id;
  }
  for (const m of r.members){ const i = novo.indexOf(m.id); m.slot = i; if (i < 0) m.ready = false; }
}

/* ---- a Copa dos Amigos (mata-mata 1v1 com 4 ou 8 pessoas da sala) ---- */
function pares(ids){ const M = []; for (let i = 0; i + 1 < ids.length; i += 2) M.push({a:ids[i], b:ids[i + 1], score:null, winner:null}); return M; }
function copaSenta(r){                                 // põe o próximo duelo na quadra
  const t = r.tournament, mt = t.matches.find(x => !x.winner);
  if (!mt) return false;
  r.n = 1; r.roster = [mt.a, mt.b];
  for (const m of r.members){ m.slot = r.roster.indexOf(m.id); m.ready = false; m.rematch = false; }
  return true;
}
function copaAvanca(r){                                // fechou a rodada: a próxima (ou o campeão)
  const t = r.tournament, presente = id => r.members.some(m => m.id === id);
  for (;;){
    if (!t.matches.every(x => x.winner)) return;
    if (t.matches.length === 1){
      t.champion = t.matches[0].winner;
      db.champions.unshift({name:t.name, champion:{name:nomeDe(r, t.champion)}, date:Date.now()});
      db.champions = db.champions.slice(0, 40); dbSave();
      aviso(r, '🏆 ' + nomeDe(r, t.champion) + ' é o campeão da ' + t.name + '!');
      for (const m of r.members) mandaSocial(m);
      return;
    }
    t.rounds.push(t.matches);
    t.matches = pares(t.matches.map(x => x.winner));
    for (const mt of t.matches){                        // quem já foi embora perde por W.O.
      const a = presente(mt.a), b = presente(mt.b);
      if (a && b) continue;
      mt.winner = a ? mt.a : mt.b; mt.score = a ? [3, 0] : [0, 3]; mt.wo = true;
    }
  }
}
function copaWO(r, id){                                // alguém saiu no meio da copa: o adversário passa (W.O.)
  const t = r.tournament; if (!t || t.champion) return;
  for (const mt of t.matches){
    if (mt.winner || (mt.a !== id && mt.b !== id)) continue;
    mt.winner = mt.a === id ? mt.b : mt.a; mt.score = mt.a === id ? [0, 3] : [3, 0]; mt.wo = true;
  }
  copaAvanca(r);
  if (r.state !== 'playing'){ if (!t.champion && copaSenta(r)) r.state = 'waiting'; else r.state = 'ended'; }
}

/* ---- o fim da partida: placar, duelos 1v1 e pontos dos clubes ---- */
function registraResultado(r, score, winner){
  const ids = r.roster, humanos = id => r.members.find(m => m.id === id && m.user);
  // duelo 1v1 entre duas pessoas
  if (r.n === 1 && winner >= 0){
    const a = humanos(ids[0]), b = humanos(ids[1]);
    if (a && b && a.user.id !== b.user.id){
      const par = [a.user.id, b.user.id].sort(), key = par.join('|');
      const d = db.duels[key] || (db.duels[key] = {players:par, wins:[0, 0], played:0, last:0});
      const vencedor = winner === 0 ? a.user.id : b.user.id;
      d.wins[par.indexOf(vencedor)]++; d.played++; d.last = Date.now();
      dbSave();
    }
  }
  // clubes: dois times completos, cada um de um clube só (e clubes diferentes) → 3 pontos para quem ganhou
  if (winner >= 0){
    const clubeDoTime = t => {
      let cid = null;
      for (let k = 0; k < r.n; k++){
        const m = humanos(ids[t*r.n + k]); const c = m && m.user.club;
        if (!c || (cid && c !== cid)) return null; cid = c;
      }
      return cid;
    };
    const c0 = clubeDoTime(0), c1 = clubeDoTime(1);
    if (c0 && c1 && c0 !== c1 && db.clubs[c0] && db.clubs[c1]){
      const cv = db.clubs[winner === 0 ? c0 : c1];
      db.clubs[c0].played++; db.clubs[c1].played++; cv.wins++; cv.points += 3; dbSave();
      aviso(r, 'Clássico de clubes: +3 pontos para ' + cv.name + '!');
    }
  }
  // copa
  const t = r.tournament;
  if (t && !t.champion && winner >= 0){
    const mt = t.matches.find(x => !x.winner && ((x.a === ids[0] && x.b === ids[1]) || (x.a === ids[1] && x.b === ids[0])));
    if (mt){
      mt.winner = ids[winner];
      mt.score = mt.a === ids[0] ? [score[0], score[1]] : [score[1], score[0]];
      copaAvanca(r);
    }
  }
  for (const m of r.members) if (m.slot >= 0) mandaSocial(m);
}

/* =====================================================================================
   Social: o seu clube, o ranking dos clubes, os seus duelos e a galeria de campeões
   ===================================================================================== */
function socialDe(c){
  const u = c.user, cl = u && u.club && db.clubs[u.club];
  const club = cl ? {name:cl.name, tag:cl.tag, color:cl.color, badge:cl.badge, points:cl.points, wins:cl.wins, played:cl.played,
    owner:cl.owner, invite:cl.invite, members:cl.members.map(id => ({id, name:(usersById.get(id) || {}).name || 'Jogador'}))} : null;
  const ranking = Object.values(db.clubs).filter(x => x.points > 0 || x.played > 0)
    .sort((a, b) => b.points - a.points || b.wins - a.wins).slice(0, 20).map(x => ({tag:x.tag, name:x.name, points:x.points, wins:x.wins}));
  const duels = !u ? [] : Object.values(db.duels).filter(d => d.players.includes(u.id)).sort((a, b) => b.last - a.last).slice(0, 8)
    .map(d => ({players:d.players.map(id => ({name:(usersById.get(id) || {}).name || 'Jogador'})), wins:d.wins, played:d.played}));
  return {type:'social', club, ranking, duels, champions:db.champions.slice(0, 12)};
}
function mandaSocial(c){ if (c.id) send(c, socialDe(c)); }
function mandaSocialDoClube(cid){ for (const c of conns) if (c.id && c.user && c.user.club === cid) mandaSocial(c); }
function atualizaSalasDe(c){ if (c.room) mandaSala(c.room); }

/* =====================================================================================
   Chat do Brasil (o canal público)
   ===================================================================================== */
const BR = {hist:[], conns:new Set(), mutes:new Map(), seq:0, onlineT:null};
function brOnline(){
  if (BR.onlineT) return;
  BR.onlineT = setTimeout(() => {
    BR.onlineT = null;
    const s = JSON.stringify({type:'brasil_online', count:BR.conns.size});
    for (const c of BR.conns) sendRaw(c, s);
  }, 500);
}

/* =====================================================================================
   As mensagens
   ===================================================================================== */
const HANDLERS = {
  hello(c, m){
    let u = usuarioDoToken(m.token);
    if (!u){
      const token = crypto.randomBytes(18).toString('hex');
      u = {id:rid('u'), token, name:'Jogador', skin:'', club:null, created:Date.now(), seen:Date.now()};
      db.users[token] = u; usersById.set(u.id, u);
    }
    c.user = u; c.id = c.id || rid('p') + (++seqSessao).toString(36);
    c.name = nomeOk(m.name) || u.name || 'Jogador'; c.skin = limpaSkin(m.skin) || u.skin;
    c.avatar = limpaAvatar(m.avatar); c.flag = limpaBandeira(m.flag);
    u.name = c.name; u.skin = c.skin; u.seen = Date.now(); dbSave();
    send(c, {type:'hello', id:c.id, token:u.token, server:{name:SERVER_NAME, version:VERSAO, online:contaOnline()}});
    mandaSocial(c);
    send(c, {type:'rooms', list:listaSalas(), online:contaOnline()});
    listaMudou();
  },
  profile(c, m){
    if (!c.id) return;
    const n = nomeOk(m.name); if (n) c.name = n;
    const s = limpaSkin(m.skin); if (s) c.skin = s;
    if (m.avatar) c.avatar = limpaAvatar(m.avatar);
    if (m.flag) c.flag = limpaBandeira(m.flag);
    if (c.user){ c.user.name = c.name; c.user.skin = c.skin; dbSave(); }
    atualizaSalasDe(c);
  },
  ping(c, m){ send(c, {type:'pong', time:Number(m.time) || 0}); },
  social(c){ mandaSocial(c); },
  list(c){ if (c.id) send(c, {type:'rooms', list:listaSalas(), online:contaOnline()}); },

  /* ---- sala ---- */
  create(c, m){
    if (!c.id) return;
    if (!permite(c, 'create', .5, 3)) return erro(c, 'Calma: espere um pouco para criar outra sala.');
    if (c.room) saiDaSala(c, 'trocou');
    const r = novaSala(c, m);
    entraNaSala(c, r, false, 0);
  },
  join(c, m){
    if (!c.id) return;
    const code = String(m.code || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    const r = rooms.get(code);
    if (!r) return erro(c, code ? 'Sala ' + code + ' não encontrada. Confira o código.' : 'Digite o código da sala.');
    if (c.room === r){ mandaSala(r); return; }
    const ban = c.user && r.ban.get(c.user.id);
    if (ban && ban > Date.now()) return erro(c, 'O dono da sala removeu você. Tente de novo daqui a pouco.');
    if (r.members.length >= MAX_NA_SALA) return erro(c, 'A sala está cheia.');
    entraNaSala(c, r, !!m.spectate, Number.isInteger(m.slot) ? m.slot : undefined);
  },
  leave(c){
    if (!c.room) return send(c, {type:'left'});
    saiDaSala(c, 'saiu'); send(c, {type:'left'});
    send(c, {type:'rooms', list:listaSalas(), online:contaOnline()});
  },
  seat(c, m){
    const r = c.room; if (!r) return;
    if (r.state === 'playing') return erro(c, 'Espere a partida acabar para trocar de lugar.');
    if (r.tournament) return erro(c, 'Na copa os lugares são do chaveamento.');
    const alvo = m.id != null && m.id !== c.id ? r.members.find(x => x.id === m.id) : c;
    if (!alvo) return;
    if (alvo !== c && !ehDono(c)) return erro(c, 'Só o dono da sala troca os outros de lugar.');
    let slot;
    if (m.team === 0 || m.team === 1){
      if (alvo.slot >= 0 && Math.floor(alvo.slot/r.n) === m.team) return;
      slot = vagaLivre(r, m.team);
      if (slot < 0) return erro(c, (m.team ? 'A Equipe Azul' : 'O Time Vermelho') + ' está completo.');
    } else slot = int(m.slot, -1, r.roster.length - 1, null);
    if (slot === null || slot === alvo.slot) return;
    if (slot >= 0 && r.roster[slot]){
      if (alvo === c && !ehDono(c)) return erro(c, 'Esse lugar já está ocupado.');
      const outro = r.members.find(x => x.id === r.roster[slot]);   // o dono trocou dois de lugar: eles trocam
      const velho = alvo.slot;
      if (outro){ r.roster[slot] = null; poeNaVaga(r, alvo, slot); poeNaVaga(r, outro, velho); }
    } else poeNaVaga(r, alvo, slot);
    const onde = s => s < 0 ? 'os Espectadores' : Math.floor(s/r.n) ? 'a Equipe Azul' : 'o Time Vermelho';
    aviso(r, alvo.name + ' foi para ' + onde(alvo.slot));
    mandaSala(r); listaMudou();
  },
  config(c, m){
    const r = c.room; if (!r) return;
    if (!ehDono(c)) return erro(c, 'Só o dono da sala muda as regras.');
    if (r.state === 'playing') return erro(c, 'Espere a partida acabar.');
    const copa = !!r.tournament;
    if (m.n != null && !copa){ const n = int(m.n, 1, 4, r.n); if (n !== r.n) reorganiza(r, n); }
    if (m.map != null) r.map = int(m.map, 0, NUM_MAPAS - 1, r.map);
    if (m.jogo != null && MODOS.includes(m.jogo)) r.jogo = m.jogo;
    if (m.bots != null) r.bots = !!m.bots;
    if (m.tempo != null && TEMPOS.includes(Number(m.tempo))) r.tempo = Number(m.tempo);
    if (m.name != null){ const nm = limpa(m.name, 24); if (nm && nm !== r.name && !bloqueado(nm)){ r.name = nm; r.autoNome = false; } }
    if (m.pub != null) r.pub = !!m.pub;
    mandaSala(r); listaMudou();
  },
  ready(c, m){
    const r = c.room; if (!r || c.slot < 0 || r.state === 'playing') return;
    c.ready = typeof m.on === 'boolean' ? m.on : !c.ready; mandaSala(r);
  },
  start(c){
    const r = c.room; if (!r) return;
    if (!ehDono(c)) return erro(c, 'Só o dono da sala inicia a partida.');
    if (r.state === 'playing') return;
    if (r.tournament){
      const t = r.tournament;
      if (t.champion) return erro(c, 'A copa acabou. Encerre a copa para jogar de novo.');
      if (!r.roster[0] || !r.roster[1]) return erro(c, 'Esse duelo está sem jogador. Toque em PRÓXIMO DUELO.');
    } else {
      const motivo = podeComecar(r); if (motivo) return erro(c, motivo);
    }
    comecaPartida(r);
  },
  kick(c, m){
    const r = c.room; if (!r || !ehDono(c) || m.id === c.id) return;
    const alvo = r.members.find(x => x.id === m.id); if (!alvo) return;
    if (alvo.user) r.ban.set(alvo.user.id, Date.now() + BAN_MS);
    saiDaSala(alvo, 'removido');
    send(alvo, {type:'left'}); erro(alvo, 'O dono da sala removeu você.');
  },
  promote(c, m){
    const r = c.room; if (!r || !ehDono(c)) return;
    const alvo = r.members.find(x => x.id === m.id); if (!alvo || alvo === c) return;
    trocaDono(r, alvo); aviso(r, alvo.name + ' agora é o dono da sala'); mandaSala(r); listaMudou();
  },
  typing(c, m){                                        // v63: "digitando…" em cima da cabeça (quem está com o chat aberto)
    const r = c.room; if (!r || !permite(c, 'typing', 2, 6)) return;
    const s = JSON.stringify({type:'typing', id:c.id, on:!!m.on});
    for (const x of r.members) if (x !== c) sendRaw(x, s);
  },
  say(c, m){
    const r = c.room; if (!r) return;
    const text = limpa(m.text, 120); if (!text) return;
    if (Date.now() - c.sayAt < 900) return erro(c, 'Calma: uma mensagem por segundo.');
    if (bloqueado(text) && !FRASES_RAPIDAS.includes(text)) return erro(c, 'O filtro do chat bloqueou essa mensagem.');
    c.sayAt = Date.now();
    const msg = {type:'say', id:c.id, name:c.name, text, t:Date.now()};
    r.chat.push(msg); if (r.chat.length > 30) r.chat.shift();
    const s = JSON.stringify(msg); for (const x of r.members) sendRaw(x, s);
  },

  /* ---- a partida (quem simula é o celular do dono da sala; o servidor só repassa) ---- */
  snapshot(c, m, txt){
    const r = c.room; if (!r || r.host !== c.id || r.state !== 'playing' || m.round !== r.round) return;
    if (!permite(c, 'snap', 70, 90)) return;
    r.lastSnap = Date.now();
    const d = m.data; if (d && Array.isArray(d.score)) r.score = d.score.slice(0, 2);
    for (const x of r.members) if (x !== c && x.ws.buffered < 384*1024) sendRaw(x, txt);   // (quem está com a internet lenta pula um quadro)
  },
  input(c, m){
    const r = c.room; if (!r || r.state !== 'playing' || c.slot < 0 || r.host === c.id) return;
    if (!permite(c, 'input', 130, 200)) return;
    const dono = r.members.find(x => x.id === r.host); if (!dono) return;
    sendRaw(dono, JSON.stringify({type:'input', id:c.id, seq:int(m.seq, 0, 1e9, 0), x:num(m.x, -1, 1), y:num(m.y, -1, 1), button:int(m.button, 1, 3, 1)}));
  },
  pause(c, m){
    const r = c.room; if (!r || r.host !== c.id || r.state !== 'playing') return;
    r.lastSnap = Date.now();
    const s = JSON.stringify({type:'pause', paused:!!m.paused});
    for (const x of r.members) if (x !== c) sendRaw(x, s);
  },
  finish(c, m){
    const r = c.room; if (!r || r.host !== c.id || r.state !== 'playing' || m.round !== r.round) return;
    const sc = Array.isArray(m.score) ? [int(m.score[0], 0, 999, 0), int(m.score[1], 0, 999, 0)] : [0, 0];
    const winner = sc[0] > sc[1] ? 0 : sc[1] > sc[0] ? 1 : -1;
    r.state = 'ended';
    const s = JSON.stringify({type:'result', round:r.round, score:sc, winner});
    for (const x of r.members) sendRaw(x, s);
    registraResultado(r, sc, winner);
    mandaSala(r); listaMudou();
  },
  rematch(c, m){
    const r = c.room; if (!r || r.state !== 'ended' || r.tournament || c.slot < 0) return;
    c.rematch = typeof m.on === 'boolean' ? m.on : true;          // (o botão do fim de jogo só pede; o da sala liga e desliga)
    const seated = r.members.filter(x => x.slot >= 0);
    if (seated.length && seated.every(x => x.rematch) && !podeComecar(r)){ aviso(r, 'Revanche! Todo mundo topou.'); comecaPartida(r); return; }
    mandaSala(r);
  },

  /* ---- copa ---- */
  cupCreate(c, m){
    const r = c.room; if (!r) return;
    if (!ehDono(c)) return erro(c, 'Quem é o dono da sala sorteia a copa.');
    if (r.state === 'playing') return erro(c, 'Espere a partida acabar.');
    if (r.tournament && !r.tournament.champion) return erro(c, 'Já tem uma copa rolando nesta sala.');
    const qtd = r.members.length;
    if (qtd !== 4 && qtd !== 8) return erro(c, 'A copa precisa de 4 ou 8 pessoas na sala (agora: ' + qtd + ').');
    r.tournament = {name:limpa(m.name, 28) || 'Copa dos amigos', rounds:[], matches:pares(embaralha(r.members.map(x => x.id))), champion:null};
    copaSenta(r); r.state = 'waiting';
    const mt = r.tournament.matches[0];
    aviso(r, 'Copa sorteada! Primeiro duelo: ' + nomeDe(r, mt.a) + ' × ' + nomeDe(r, mt.b));
    mandaSala(r); listaMudou();
  },
  cupNext(c){
    const r = c.room; if (!r || !ehDono(c) || !r.tournament || r.tournament.champion || r.state === 'playing') return;
    if (copaSenta(r)){ r.state = 'waiting'; aviso(r, 'Próximo duelo: ' + nomeDe(r, r.roster[0]) + ' × ' + nomeDe(r, r.roster[1])); }
    mandaSala(r);
  },
  cupEnd(c){
    const r = c.room; if (!r || !ehDono(c) || !r.tournament || r.state === 'playing') return;
    r.tournament = null; r.state = 'waiting';
    aviso(r, 'A copa foi encerrada.');
    mandaSala(r); listaMudou();
  },

  /* ---- clubes ---- */
  clubCreate(c, m){
    const u = c.user; if (!u) return;
    if (u.club && db.clubs[u.club]) return erro(c, 'Saia do seu clube antes de criar outro.');
    const name = limpa(m.name, 24), tag = String(m.tag || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
    if (name.length < 3) return erro(c, 'O nome do clube precisa de pelo menos 3 letras.');
    if (tag.length < 2) return erro(c, 'A sigla precisa de 2 a 4 letras.');
    if (bloqueado(name) || bloqueado(tag)) return erro(c, 'Esse nome não passou no filtro.');
    if (Object.values(db.clubs).some(x => x.tag === tag)) return erro(c, 'Já existe um clube com a sigla ' + tag + '.');
    let invite; do invite = genCode(7); while (Object.values(db.clubs).some(x => x.invite === invite));
    const id = rid('c');
    db.clubs[id] = {id, name, tag, color:COR_RE.test(m.color || '') ? m.color : '#8d63ff', badge:['coroa', 'raio', 'estrela', 'diamante'].includes(m.badge) ? m.badge : 'estrela',
      owner:u.id, members:[u.id], invite, points:0, wins:0, played:0, created:Date.now()};
    u.club = id; dbSave();
    mandaSocial(c); atualizaSalasDe(c);
  },
  clubJoin(c, m){
    const u = c.user; if (!u) return;
    if (u.club && db.clubs[u.club]) return erro(c, 'Você já está num clube. Saia dele primeiro.');
    const code = String(m.code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const cl = Object.values(db.clubs).find(x => x.invite === code);
    if (!cl) return erro(c, 'Convite não encontrado. Peça o código certo para o capitão.');
    if (cl.members.length >= 30) return erro(c, 'Esse clube está cheio (30 pessoas).');
    if (!cl.members.includes(u.id)) cl.members.push(u.id);
    u.club = cl.id; dbSave();
    mandaSocialDoClube(cl.id); atualizaSalasDe(c);
  },
  clubLeave(c){
    const u = c.user; if (!u || !u.club) return;
    const cl = db.clubs[u.club]; u.club = null;
    if (cl){
      cl.members = cl.members.filter(id => id !== u.id);
      if (!cl.members.length) delete db.clubs[cl.id];
      else { if (cl.owner === u.id) cl.owner = cl.members[0]; mandaSocialDoClube(cl.id); }
    }
    dbSave(); mandaSocial(c); atualizaSalasDe(c);
  },

  /* ---- Chat do Brasil ---- */
  brasil_join(c, m){
    const u = usuarioDoToken(m.token);
    if (u && !c.user) c.user = u;
    c.brasil = true; BR.conns.add(c);
    c.bfrom = u ? u.id : (c.bfrom || rid('g'));
    c.bname = nomeOk(m.name) || (u && u.name) || 'Jogador';
    c.bskin = limpaSkin(m.skin); c.bavatar = limpaAvatar(m.avatar);
    send(c, {type:'brasil_hello', id:c.bfrom});
    send(c, {type:'brasil_history', messages:BR.hist.slice(-50).map(({den, ...x}) => x.escondida ? {...x, texto:''} : x)});
    brOnline();
  },
  brasil_say(c, m){
    if (!c.brasil) return;
    const raw = String(m.text == null ? '' : m.text).trim();
    if (!raw) return;
    if (Array.from(raw).length > 120) return send(c, {type:'brasil_error', reason:'longa'});
    const text = limpa(raw, 120), agora = Date.now();
    const mute = BR.mutes.get(c.bfrom); if (mute && mute > agora) return send(c, {type:'brasil_error', reason:'silenciado'});
    if (agora - c.lastSay < 2900) return send(c, {type:'brasil_error', reason:'ritmo'});
    if (text.toLowerCase() === c.lastText) return send(c, {type:'brasil_error', reason:'repetida'});
    if (bloqueado(text)) return send(c, {type:'brasil_error', reason:'filtro'});
    c.lastSay = agora; c.lastText = text.toLowerCase();
    const u = c.user, cl = u && u.club && db.clubs[u.club];
    const msg = {id:'b' + (++BR.seq).toString(36) + genCode(2), from:c.bfrom, nome:c.bname, skin:c.bskin, avatar:c.bavatar, clube:cl ? cl.tag : '', texto:text, t:agora};
    BR.hist.push(msg); if (BR.hist.length > 120) BR.hist.shift();
    const s = JSON.stringify({type:'brasil_message', message:msg});
    for (const x of BR.conns) sendRaw(x, s);
  },
  brasil_report(c, m){
    if (!c.brasil) return;
    const msg = BR.hist.find(x => x.id === m.id); if (!msg || msg.from === c.bfrom) return;
    msg.den = msg.den || []; if (msg.den.includes(c.bfrom)) return;
    msg.den.push(c.bfrom);
    if (msg.den.length >= 3 && !msg.escondida){
      msg.escondida = true;
      BR.mutes.set(msg.from, Date.now() + 10*60*1000);              // 3 denúncias: some a mensagem e a pessoa fica 10 min calada
      const s = JSON.stringify({type:'brasil_hide', id:msg.id});
      for (const x of BR.conns) sendRaw(x, s);
    }
  }
};

/* =====================================================================================
   O site: entrega o jogo (comprimido) e um /health para a hospedagem
   ===================================================================================== */
const TIPOS = {'.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.json':'application/json',
  '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.webp':'image/webp', '.svg':'image/svg+xml', '.ico':'image/x-icon',
  '.mp3':'audio/mpeg', '.ogg':'audio/ogg', '.wav':'audio/wav', '.woff2':'font/woff2', '.webmanifest':'application/manifest+json'};
const cacheArq = new Map();                                 // arquivo → {mtime, raw, gz, br, etag}
function carrega(file){
  const st = fs.statSync(file);
  const c = cacheArq.get(file);
  if (c && c.mtime === st.mtimeMs) return c;
  const raw = fs.readFileSync(file);
  const comprime = /\.(html|js|css|json|svg|webmanifest)$/.test(file);
  const nv = {mtime:st.mtimeMs, raw, etag:'"' + crypto.createHash('sha1').update(raw).digest('base64').slice(0, 16) + '"',
    gz:comprime ? zlib.gzipSync(raw, {level:9}) : null,
    br:comprime ? zlib.brotliCompressSync(raw, {params:{[zlib.constants.BROTLI_PARAM_QUALITY]:9}}) : null};
  cacheArq.set(file, nv);
  return nv;
}
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/health'){
    res.writeHead(200, {'Content-Type':'application/json', 'Cache-Control':'no-store'});
    return res.end(JSON.stringify({ok:true, server:SERVER_NAME, version:VERSAO, online:contaOnline(), rooms:rooms.size}));
  }
  if (req.method !== 'GET' && req.method !== 'HEAD'){ res.writeHead(405); return res.end(); }
  let rel; try { rel = decodeURIComponent(url.pathname); } catch (_) { res.writeHead(400); return res.end(); }
  if (rel === '/' || rel === '') rel = '/index.html';
  const file = path.normalize(path.join(PUBLIC_DIR, rel));
  if (!file.startsWith(PUBLIC_DIR + path.sep)){ res.writeHead(403); return res.end(); }
  let a; try { a = carrega(file); } catch (_) {
    if (rel === '/favicon.ico'){ res.writeHead(204); return res.end(); }
    res.writeHead(404, {'Content-Type':'text/plain; charset=utf-8'}); return res.end('Não encontrado');
  }
  const h = {'Content-Type':TIPOS[path.extname(file).toLowerCase()] || 'application/octet-stream', 'ETag':a.etag, 'Cache-Control':'no-cache', 'Vary':'Accept-Encoding'};
  if (req.headers['if-none-match'] === a.etag){ res.writeHead(304, h); return res.end(); }
  const ae = String(req.headers['accept-encoding'] || '');
  let corpo = a.raw;
  if (a.br && /\bbr\b/.test(ae)){ corpo = a.br; h['Content-Encoding'] = 'br'; }
  else if (a.gz && /\bgzip\b/.test(ae)){ corpo = a.gz; h['Content-Encoding'] = 'gzip'; }
  h['Content-Length'] = corpo.length;
  res.writeHead(200, h);
  res.end(req.method === 'HEAD' ? undefined : corpo);
});

server.on('upgrade', (req, socket, head) => {
  const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
  const key = req.headers['sec-websocket-key'];
  if (String(req.headers.upgrade || '').toLowerCase() !== 'websocket' || !key){ socket.destroy(); return; }
  if ((porIp.get(ip) || 0) >= MAX_POR_IP){ socket.end('HTTP/1.1 429 Too Many Requests\r\n\r\n'); return; }
  const accept = crypto.createHash('sha1').update(key + WS_GUID).digest('base64');
  socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ' + accept + '\r\n\r\n');
  porIp.set(ip, (porIp.get(ip) || 0) + 1);
  const ws = new Sock(socket, ip);
  onConexao(ws);
  if (head && head.length) ws.feed(head);
});

/* ---- de tempos em tempos: conexões mortas, partidas paradas ---- */
setInterval(() => {
  const agora = Date.now();
  for (const c of conns){
    if (agora - c.ws.lastSeen > 70000){ c.ws.close(1001); continue; }
    c.ws.ping();                                        // o navegador responde sozinho (e a hospedagem não derruba a conexão parada)
  }
}, 25000).unref();
setInterval(() => {
  const agora = Date.now();
  for (const r of rooms.values()){
    if (r.state === 'playing' && agora - r.lastSnap > SEM_SNAPSHOT_MS){
      r.state = 'waiting';
      const s = JSON.stringify({type:'interrupted', message:'A partida parou: o jogo do dono da sala ficou fechado. Volte para a sala e comece de novo.'});
      for (const m of r.members) sendRaw(m, s);
      mandaSala(r); listaMudou();
    }
    for (const [k, v] of r.ban) if (v < agora) r.ban.delete(k);
  }
  for (const [k, v] of BR.mutes) if (v < agora) BR.mutes.delete(k);
}, 5000).unref();

function desliga(){
  console.log('\n[racha] desligando: salvando os dados…');
  dbSave(true);
  for (const c of conns) c.ws.close(1001);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 1500).unref();
}
process.on('SIGTERM', desliga);
process.on('SIGINT', desliga);

process.on('uncaughtException', e => console.error('[racha] erro inesperado (o servidor continua no ar):', e));
server.on('error', e => {
  if (e.code === 'EADDRINUSE') console.error('[racha] a porta %d já está em uso. Feche o outro servidor ou rode com outra porta, ex.: PORT=8081 node server.js', PORT);
  else console.error('[racha] não deu para abrir o servidor:', e.message);
  process.exit(1);
});
dbLoad();
server.listen(PORT, () => {
  const ips = [];
  for (const lista of Object.values(require('os').networkInterfaces())) for (const i of lista || []) if (i.family === 'IPv4' && !i.internal) ips.push(i.address);
  console.log('[racha] servidor "%s" no ar na porta %d', SERVER_NAME, PORT);
  console.log('[racha] neste computador:  http://localhost:%d', PORT);
  for (const ip of ips) console.log('[racha] no celular (mesma rede Wi-Fi):  http://%s:%d', ip, PORT);
});
