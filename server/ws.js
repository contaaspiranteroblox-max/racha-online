'use strict';
/* RACHA · servidor da turma — WebSocket sem dependências (RFC 6455, só o que o jogo usa: texto, ping/pong e fechar).
   Uso: const {aceita} = require('./ws'); servidor.on('upgrade', (req, sock, cabeca) => { const ws = aceita(req, sock, cabeca); ... })
   ws.on('message', texto => …) · ws.on('close', () => …) · ws.send(texto) · ws.close(codigo, motivo) · ws.readyState (1 aberto, 3 fechado)
   Limites: quadro de no máximo 1 MiB (o snapshot do jogo tem poucos KB); sem extensões; o cliente precisa mascarar (o navegador mascara). */
const crypto = require('crypto');
const EventEmitter = require('events');

const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const MAX_QUADRO = 1 << 20;

class Conexao extends EventEmitter {
  constructor(sock){
    super();
    this.sock = sock; this.readyState = 1; this.buf = Buffer.alloc(0); this.partes = null; this.vivo = true;
    sock.setNoDelay(true);
    sock.on('data', d => this._recebe(d));
    sock.on('close', () => this._fechou());
    sock.on('error', () => this._fechou());
    sock.on('end', () => this._fechou());
  }
  get bufferedAmount(){ return this.sock.writableLength || 0; }
  send(texto){
    if (this.readyState !== 1) return false;
    const dados = Buffer.from(String(texto), 'utf8');
    this.sock.write(Buffer.concat([Conexao.cabecalho(0x1, dados.length), dados]));
    return true;
  }
  ping(){ if (this.readyState === 1) this.sock.write(Conexao.cabecalho(0x9, 0)); }
  close(codigo, motivo){
    if (this.readyState !== 1) return;
    const m = Buffer.from(String(motivo || '').slice(0, 100), 'utf8'), d = Buffer.alloc(2 + m.length);
    d.writeUInt16BE(codigo || 1000, 0); m.copy(d, 2);
    try { this.sock.write(Buffer.concat([Conexao.cabecalho(0x8, d.length), d])); } catch (_) {}
    this.readyState = 2;
    setTimeout(() => { try { this.sock.destroy(); } catch (_) {} }, 200);
  }
  terminate(){ try { this.sock.destroy(); } catch (_) {} this._fechou(); }
  static cabecalho(op, n){                              // FIN + opcode, tamanho (o servidor não mascara)
    if (n < 126) return Buffer.from([0x80 | op, n]);
    if (n < 65536){ const b = Buffer.alloc(4); b[0] = 0x80 | op; b[1] = 126; b.writeUInt16BE(n, 2); return b; }
    const b = Buffer.alloc(10); b[0] = 0x80 | op; b[1] = 127; b.writeUInt32BE(Math.floor(n / 2 ** 32), 2); b.writeUInt32BE(n >>> 0, 6); return b;
  }
  _fechou(){
    if (this.readyState === 3) return;
    this.readyState = 3;
    this.emit('close');
  }
  _recebe(d){
    this.buf = this.buf.length ? Buffer.concat([this.buf, d]) : d;
    for (;;){
      const b = this.buf; if (b.length < 2) return;
      const fin = (b[0] & 0x80) !== 0, op = b[0] & 0x0f, mascara = (b[1] & 0x80) !== 0;
      let n = b[1] & 0x7f, i = 2;
      if (n === 126){ if (b.length < 4) return; n = b.readUInt16BE(2); i = 4; }
      else if (n === 127){ if (b.length < 10) return; const alto = b.readUInt32BE(2); n = b.readUInt32BE(6); i = 10; if (alto) return this.close(1009, 'grande demais'); }
      if (n > MAX_QUADRO) return this.close(1009, 'grande demais');
      if (!mascara) return this.close(1002, 'quadro sem máscara');
      if (b.length < i + 4 + n) return;
      const chave = b.subarray(i, i + 4), dados = Buffer.from(b.subarray(i + 4, i + 4 + n));
      for (let k = 0; k < n; k++) dados[k] ^= chave[k & 3];
      this.buf = b.subarray(i + 4 + n);
      if (op === 0x8){ this.close(1000, ''); return; }
      if (op === 0x9){ if (this.readyState === 1) this.sock.write(Buffer.concat([Conexao.cabecalho(0xA, dados.length), dados])); continue; }
      if (op === 0xA){ this.vivo = true; continue; }
      if (op === 0x1 || op === 0x2){ this.partes = {op, l:[dados], n}; }
      else if (op === 0x0 && this.partes){ this.partes.l.push(dados); this.partes.n += n; if (this.partes.n > MAX_QUADRO) return this.close(1009, 'grande demais'); }
      else continue;
      if (fin && this.partes){
        const p = this.partes; this.partes = null;
        if (p.op === 0x1) this.emit('message', Buffer.concat(p.l).toString('utf8'));
      }
    }
  }
}

function aceita(req, sock, cabeca){                     // o aperto de mão: devolve a conexão (ou null, se o pedido não é de WebSocket)
  const chave = req.headers['sec-websocket-key'], versao = req.headers['sec-websocket-version'];
  if (!chave || String(req.headers.upgrade || '').toLowerCase() !== 'websocket' || versao !== '13'){
    sock.end('HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n'); return null;
  }
  const aceite = crypto.createHash('sha1').update(chave + GUID).digest('base64');
  sock.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ' + aceite + '\r\n\r\n');
  const ws = new Conexao(sock);
  if (cabeca && cabeca.length) ws._recebe(cabeca);
  return ws;
}

module.exports = {aceita, Conexao};
