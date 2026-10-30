'use strict';
const assert = require('node:assert/strict');
const {EventEmitter} = require('node:events');
const {Conexao} = require('../server/ws');

class Soquete extends EventEmitter {
  setNoDelay() {}
  write(d) { this.ultimo = Buffer.from(d); }
  destroy() { this.emit('close'); }
}
function quadro(op, fin, texto = '') {
  const dados = Buffer.from(texto);
  assert.ok(dados.length < 126);
  return Buffer.concat([Buffer.from([(fin ? 0x80 : 0) | op, 0x80 | dados.length, 0, 0, 0, 0]), dados]);
}

{
  const s = new Soquete(), ws = new Conexao(s);
  ws._recebe(quadro(1, false));
  for (let i = 0; i < 256 && ws.readyState === 1; i++) ws._recebe(quadro(0, false));
  assert.equal(ws.readyState, 2, 'fragmentos vazios também precisam de limite');
  assert.equal(ws.partes, null);
  assert.equal(ws.timerPartes, null);
  s.destroy();
}
{
  const s = new Soquete(), ws = new Conexao(s);
  let mensagem = '';
  ws.on('message', (t) => { mensagem = t; });
  ws._recebe(quadro(1, false, 'RA'));
  ws._recebe(quadro(0, true, 'CHA'));
  assert.equal(mensagem, 'RACHA', 'mensagens fragmentadas válidas seguem funcionando');
  assert.equal(ws.timerPartes, null);
  ws._recebe(quadro(0, true, 'sem começo'));
  assert.equal(ws.readyState, 2, 'continuação solta deve ser recusada');
  s.destroy();
}
console.log('WebSocket: limite de fragmentos, limpeza e montagem válida — 3/3');
