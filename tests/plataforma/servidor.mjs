// RACHA · v88 — a PLATAFORMA DE TESTE: o código de verdade da plataforma (app/api: as rotas tRPC, a sessão, as regras e o
// servidor das salas montado no mesmo endereço) rodando em cima de um SQLite (node:sqlite), sem MySQL e sem npm.
//   node tests/plataforma/servidor.mjs [--porta 0] [--banco arquivo.sqlite] [--teste] [--segredo X] [--sem-compilar]
// --banco: o arquivo do banco (sem ele, só na memória). Com o mesmo arquivo, reiniciar o servidor mantém as contas, os
//          amigos, o correio… (é assim que os testes conferem a "persistência depois de reiniciar").
// --teste: entrega a pasta do projeto inteira (para a cópia de teste tests/build/racha_teste.html) e liga as rotas de
//          ajuda dos testes (/__teste/*). Sem ele, entrega app/public (como a plataforma: / leva a /game/racha.html).
// O que é igual à produção: as rotas, as regras, as validações, as sessões (cookie e Bearer), o bilhete e o selo das salas
// e o servidor das salas. O que muda: o banco (SQLite no lugar do MySQL, pelo tests/plataforma/drizzle_lite.mjs) e o
// tRPC/Hono (tests/plataforma/trpc_lite.mjs + este arquivo). Só para testar: não use para hospedar o jogo.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

process.removeAllListeners('warning');
process.on('warning', (w) => { if (!/SQLite is an experimental/.test(String(w && w.message))) console.warn(w); });
const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(AQUI, '..', '..');
const req = createRequire(import.meta.url);

function argumentos() {
  const a = process.argv.slice(2), o = {};
  for (let i = 0; i < a.length; i++) if (a[i].startsWith('--')) { const k = a[i].slice(2); const v = a[i + 1] && !a[i + 1].startsWith('--') ? a[++i] : true; o[k] = v; }
  return o;
}
const ARG = argumentos();
const TESTE = !!ARG.teste;
const PORTA = ARG.porta !== undefined ? Number(ARG.porta) : 8790;
globalThis.__RACHA_SQLITE = ARG.banco && ARG.banco !== true ? path.resolve(String(ARG.banco)) : ':memory:';
process.env.RACHA_SEGREDO_SALAS = ARG.segredo && ARG.segredo !== true ? String(ARG.segredo) : (process.env.RACHA_SEGREDO_SALAS || 'segredo-da-plataforma-de-teste');
process.env.RACHA_SALAS_NOME = process.env.RACHA_SALAS_NOME || 'Plataforma de teste';
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
if (ARG['tempo-normal']) process.env.RACHA_TEMPO_NORMAL = String(ARG['tempo-normal']);
if (ARG.prorrogacao) process.env.RACHA_PRORROGACAO = String(ARG.prorrogacao);

const { compila, SAIDA } = req('./compila.cjs');
if (!ARG['sem-compilar'] || !fs.existsSync(SAIDA)) await compila();
const P = await import(pathToFileURL(SAIDA).href + '?t=' + Date.now());
const db = P.getDb();
const S = P.schema;

// ---------------------------------------------------------------- o seed (o mesmo do app/db/seed.ts: o Dono com o ID 000001)
async function semeia() {
  const { eq } = P;
  const cont = await db.query.contadores.findFirst({ where: eq(S.contadores.nome, 'id_publico') });
  if (!cont) await db.insert(S.contadores).values({ nome: 'id_publico', valor: 1 });
  const username = (process.env.RACHA_OWNER_USERNAME || 'dono').toLowerCase();
  const ja = await db.query.usuarios.findFirst({ where: eq(S.usuarios.username, username) });
  if (ja) return;
  const [res] = await db.insert(S.usuarios).values({
    uuid: '00000000-0000-4000-8000-000000000001', idPublico: 1, username, nomeExibicao: 'Criador do RACHA',
    senhaHash: P.hashSenha(process.env.RACHA_OWNER_PASSWORD || 'Racha@Dono1'), email: 'dono@racha.teste', xp: 0, nivel: 1,
  });
  const donoId = Number(res.insertId);
  await db.insert(S.cargos).values({ usuarioId: donoId, cargo: 'dono', concedidoPor: donoId });
  await db.insert(S.estatisticas).values({ usuarioId: donoId, modos: {} });
  await db.insert(S.selos).values([{ usuarioId: donoId, selo: 'criador', concedidoPor: donoId }, { usuarioId: donoId, selo: 'verificado', concedidoPor: donoId }]);
}
await semeia();
// v88.1: o mesmo que o boot da plataforma faz (app/api/boot.ts): a conta do Dono com a senha de RACHA_OWNER_PASSWORD
await P.garanteDono(TESTE ? () => {} : (t) => console.log(t));

// ---------------------------------------------------------------- HTTP
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.txt': 'text/plain; charset=utf-8' };
const ESTATICOS = TESTE ? RAIZ : path.join(RAIZ, 'app', 'public');
const INICIO = TESTE ? '/app/public/game/racha.html' : '/game/racha.html';

async function corpoDe(r) {
  const partes = [];
  for await (const p of r) partes.push(p);
  return Buffer.concat(partes);
}
async function api(r, res) {
  const cab = new Headers();
  for (const [k, v] of Object.entries(r.headers)) if (typeof v === 'string') cab.set(k, v); else if (Array.isArray(v)) cab.set(k, v.join(', '));
  if (!cab.get('x-forwarded-for')) cab.set('x-forwarded-for', r.socket.remoteAddress || '127.0.0.1');
  const corpo = r.method === 'GET' || r.method === 'HEAD' ? undefined : await corpoDe(r);
  const pedido = new Request('http://' + (r.headers.host || 'localhost') + r.url, { method: r.method, headers: cab, body: corpo });
  const resp = await P.fetchRequestHandler({ endpoint: '/api/trpc', req: pedido, router: P.appRouter, createContext: P.createContext });
  const h = {};
  resp.headers.forEach((v, k) => { if (k !== 'set-cookie') h[k] = v; });
  const cookies = typeof resp.headers.getSetCookie === 'function' ? resp.headers.getSetCookie() : [];
  if (cookies.length) h['set-cookie'] = cookies;
  h['cache-control'] = 'no-store';
  res.writeHead(resp.status, h);
  res.end(Buffer.from(await resp.arrayBuffer()));
}

async function ajudaTeste(r, res, u) {                         // (só com --teste: o teste lê e mexe no banco direto)
  const resp = (st, o) => { res.writeHead(st, { 'content-type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(o)); };
  if (u.pathname === '/__teste/sql' && r.method === 'POST') {
    const o = JSON.parse((await corpoDe(r)).toString() || '{}');
    const sq = P._bancoDeTeste().sqlite;
    try {
      const st = sq.prepare(String(o.sql));
      const linhas = /^\s*(select|with|pragma)/i.test(o.sql) ? st.all(...(o.params || [])) : [st.run(...(o.params || []))];
      return resp(200, { ok: true, linhas: JSON.parse(JSON.stringify(linhas, (k, v) => (typeof v === 'bigint' ? Number(v) : v))) });
    } catch (e) { return resp(400, { ok: false, erro: e.message }); }
  }
  if (u.pathname === '/__teste/saude') return resp(200, { ok: true, banco: globalThis.__RACHA_SQLITE });
  return resp(404, { ok: false });
}

function estatico(r, res, u) {
  if (u.pathname === '/' || u.pathname === '/index.html') { res.writeHead(302, { Location: INICIO + u.search }); return res.end(); }
  if (r.method !== 'GET' && r.method !== 'HEAD') { res.writeHead(405); return res.end(); }
  let rel; try { rel = decodeURIComponent(u.pathname); } catch (_) { res.writeHead(400); return res.end(); }
  const arq = path.resolve(ESTATICOS, '.' + rel);
  if (!arq.startsWith(ESTATICOS + path.sep)) { res.writeHead(403); return res.end(); }
  fs.readFile(arq, (e, buf) => {
    if (e) { res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }); return res.end('não encontrado'); }
    res.writeHead(200, { 'content-type': TIPOS[path.extname(arq).toLowerCase()] || 'application/octet-stream', 'cache-control': 'no-cache' });
    res.end(r.method === 'HEAD' ? undefined : buf);
  });
}

const servidor = http.createServer((r, res) => {
  const u = new URL(r.url, 'http://x');
  if (u.pathname.startsWith('/api/trpc')) return api(r, res).catch((e) => { console.error(e); try { res.writeHead(500); res.end(); } catch (_) {} });
  if (u.pathname === '/api' || u.pathname.startsWith('/api/')) { res.writeHead(404, { 'content-type': 'application/json' }); return res.end('{"error":"Not Found"}'); }
  if (TESTE && u.pathname.startsWith('/__teste/')) return ajudaTeste(r, res, u).catch((e) => { res.writeHead(500); res.end(String(e)); });
  if (u.pathname === '/saude' || u.pathname === '/health') { res.writeHead(200, { 'content-type': 'application/json' }); return res.end(JSON.stringify({ ok: true, plataforma: 'teste' })); }
  return estatico(r, res, u);
});
// o servidor das salas montado na plataforma, como no app/api/boot.ts (com os selos da conta vindo do banco)
const { eq } = P;
const turma = P.ligaSalas(servidor, { selosDe: async (usuarioId) => (await db.query.selos.findMany({ where: eq(S.selos.usuarioId, usuarioId) })).map((x) => x.selo), relacoesDe: P.relacoesPorPub, denuncia: P.denunciaDoChat });
if (TESTE) req('../ganchos_teste.cjs').liga(turma);   // (só nos testes: o gol pedido ao motor)
P.marcaContasZeradas(await P.contasZeradasEm());          // v88.1: o bilhete de antes do ZERAR CONTAS não vale (nem depois de reiniciar)
globalThis.__turma = turma;
servidor.listen(PORTA, ARG.host && ARG.host !== true ? String(ARG.host) : '127.0.0.1', () => {
  const porta = servidor.address().port;
  console.log('RACHA · plataforma de teste (SQLite: ' + globalThis.__RACHA_SQLITE + ') em http://127.0.0.1:' + porta + INICIO);
  if (process.send) process.send({ pronto: true, porta });
});
function desliga() { try { turma.fecha(); } catch (_) {} servidor.close(() => process.exit(0)); setTimeout(() => process.exit(0), 800).unref(); }
process.on('SIGINT', desliga); process.on('SIGTERM', desliga);
