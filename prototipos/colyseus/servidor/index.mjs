/* =====================================================================================================================
   PROTÓTIPO COLYSEUS · O SERVIDOR
   sobe(): um servidor HTTP com o Colyseus montado nele (montagem.mjs) e a sala "racha" (sala_racha.mjs).
   Com junto: true, o MESMO servidor também roda a turma de verdade (server/turma.js) no "/" — o lobby, o chat, os amigos
   e as salas de hoje continuam ali, e as partidas do Colyseus moram ao lado, na mesma porta e no mesmo processo (a fase 1
   da migração da AVALIACAO.md). Sozinho: node prototipos/colyseus/servidor/index.mjs [--porta 2567] [--junto]
   (o segredo vem do RACHA_SEGREDO_SALAS — o mesmo da plataforma; sem ele, um segredo de teste só para esta vez).
   ===================================================================================================================== */
import http from 'node:http';
import { randomBytes } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { montaColyseus, ehSalaColyseus, origemPermitida } from './montagem.mjs';
import { criaSalaRacha } from './sala_racha.mjs';
import { criaFilaRanqueada } from './fila.mjs';
const require = createRequire(import.meta.url);

export async function sobe(o = {}) {
  const cfg = { segredo: o.segredo || process.env.RACHA_SEGREDO_SALAS || randomBytes(32).toString('base64url'), ...o.sala };
  const { SalaRacha, salas, tokenDaConta, contaDoBilhete, C } = criaSalaRacha(cfg);
  const FilaRanqueada = criaFilaRanqueada(C, contaDoBilhete);
  const { confere } = require('../../../server/banco.js');
  let col = null, turma = null;
  const servidor = http.createServer((req, res) => {
    col.matchmake(req, res, () => {
      if (req.url === '/saude') { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ ok: true, salas: salas.size, turma: !!turma })); return; }
      if (req.url === '/racha/volta') { voltaPelaConta(req, res); return; }
      res.writeHead(404, { 'content-type': 'text/plain' }); res.end('não encontrado');
    });
  });
  // POST /racha/volta (Authorization: Bearer <bilhete da plataforma>) → {token} da vaga guardada para a conta (ou 404)
  function voltaPelaConta(req, res) {
    const og = req.headers.origin, ok = origemPermitida(og, req.headers.host, o.origens || []);
    const cab = { 'content-type': 'application/json', Vary: 'Origin', ...(og && ok ? { 'Access-Control-Allow-Origin': og, 'Access-Control-Allow-Headers': 'authorization', 'Access-Control-Allow-Methods': 'POST' } : {}) };
    const responde = (st, obj) => { res.writeHead(st, cab); res.end(JSON.stringify(obj)); };
    if (!ok) return responde(403, { erro: 'origem recusada' });
    if (req.method === 'OPTIONS') return responde(204, {});
    if (req.method !== 'POST') return responde(405, { erro: 'só POST' });
    const m = /^Bearer\s+(\S+)$/.exec(req.headers.authorization || '');
    const b = m && confere(cfg.segredo, m[1]);
    if (!b || typeof b.p !== 'string' || !/^\d{1,9}$/.test(b.p)) return responde(401, { erro: 'bilhete inválido ou vencido' });
    const token = tokenDaConta('c' + Number(b.p));
    return token ? responde(200, { token }) : responde(404, { erro: 'nenhuma vaga guardada para esta conta' });
  }
  if (o.junto) {                                             // a turma de hoje no "/" (o caminho do Colyseus é outro: /<processo>/<sala>)
    const { Turma } = require('../../../server/turma.js');
    const { aceita } = require('../../../server/ws.js');
    turma = new Turma({ arquivo: null, nome: 'turma + Colyseus', segredo: cfg.segredo, exigeConta: false });
    servidor.on('upgrade', (req, sock, cabeca) => {
      if (ehSalaColyseus(req)) return;                       // (é do Colyseus: o transporte dele atende)
      if (!origemPermitida(req.headers.origin, req.headers.host, o.origens || [])) { sock.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n'); return; }
      const ws = aceita(req, sock, cabeca);
      if (ws) turma.conecta(ws, req);
    });
  }
  // (a sala do Colyseus com a origem recusada: responde 403 em vez de deixar a conexão pendurada)
  servidor.on('upgrade', (req, sock) => { if (ehSalaColyseus(req) && !origemPermitida(req.headers.origin, req.headers.host, o.origens || [])) sock.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n'); });
  col = await montaColyseus(servidor, mm => {
    mm.defineRoomType('racha', SalaRacha).filterBy(['modo', 'n', 'jogo']);
    if (C.fila) mm.defineRoomType('fila', FilaRanqueada).filterBy(['n']);   // a fila da ranqueada (uma por tamanho)
  }, { origens: o.origens || [] });
  await new Promise(ok => servidor.listen(o.porta || 0, o.host || '127.0.0.1', ok));
  const porta = servidor.address().port;
  return {
    porta, servidor, salas, turma, cfg, tokenDaConta,
    async fecha() {
      await col.fecha();
      if (turma) try { turma.fecha(); } catch (_) {}
      await new Promise(ok => servidor.close(() => ok()));
    },
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i > 0 ? process.argv[i + 1] : d; };
  const s = await sobe({ porta: +arg('porta', 2567), host: arg('host', '127.0.0.1'), junto: process.argv.includes('--junto'), sala: { log: t => console.log(t) } });
  console.log('protótipo Colyseus do RACHA no ar: http://' + (arg('host', '127.0.0.1')) + ':' + s.porta + (s.turma ? ' (com a turma no "/")' : '') + ' · as salas: ws://…/<processo>/<sala>');
  const sai = async () => { await s.fecha(); process.exit(0); };
  process.on('SIGINT', sai); process.on('SIGTERM', sai);
}
