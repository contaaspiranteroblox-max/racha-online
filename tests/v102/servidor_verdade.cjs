'use strict';
/* RACHA v102 · (só nos testes) o servidor das salas de verdade — o tests/servidor_visitantes.cjs, com as mesmas opções — gravando
   a VERDADE num arquivo (RACHA_VERDADE=<arquivo.jsonl>): a cada passo do motor das salas (server/partida/sala.js), uma linha com
   o instante (ms desde 1970, com fração: o mesmo relógio do performance.timeOrigin + performance.now() do navegador nesta
   máquina), o passo, o estado, se saiu um quadro neste passo, a bola e cada tampinha (x, y, o último comando usado, o tamanho da
   fila de comandos, o último comando de verdade e o crédito da recuperação). As medidas do online liso
   (tests/v102_rede_medidas.py) comparam com o que a tela desenhou. Sem RACHA_VERDADE é o servidor_visitantes de sempre.
   Uso: RACHA_VERDADE=/tmp/v.jsonl node tests/v102/servidor_verdade.cjs --porta N --memoria ...   (as opções do servidor.js) */
const fs = require('fs');
const { performance } = require('perf_hooks');
const ARQ = process.env.RACHA_VERDADE;
if (ARQ) {
  const { PartidaSala } = require('../../server/partida/sala');
  const fd = fs.openSync(ARQ, 'w'); let buf = [];
  const descarrega = () => { if (buf.length) { try { fs.writeSync(fd, buf.join('')); } catch (_) {} buf = []; } };   // (síncrono: nada se perde na saída)
  const out = { write: t => { buf.push(t); if (buf.length >= 120) descarrega(); } };
  const tq = setInterval(descarrega, 500); if (tq.unref) tq.unref();
  const agora = () => performance.timeOrigin + performance.now();
  const r2 = v => Math.round(v * 100) / 100;
  const passo = PartidaSala.prototype.passo;
  PartidaSala.prototype.passo = function () {
    const k0 = this.tick;
    const r = passo.apply(this, arguments);
    if (this.tick !== k0) {
      const B = this.B;
      out.write(JSON.stringify({ t: r2(agora()), k: this.tick, e: this.estado, s: this.tick % this.snapCada === 0 ? 1 : 0, b: [r2(B.x), r2(B.y)],
        j: this.jog.map(q => { const f = q.fila; return [r2(q.x), r2(q.y), f ? f.feito : -1, f ? f.fila.length : -1, f && f.ult ? f.ult.seq : -1, f ? (f.cred | 0) : 0]; }) }) + '\n');
    }
    return r;
  };
  process.on('exit', descarrega);
}
require('../servidor_visitantes.cjs');
