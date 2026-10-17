// RACHA v87 · uma PLATAFORMA DE MENTIRA do jeito que o site novo funciona: a raiz leva ao jogo (/game/racha.html, o
// arquivo de verdade do build), a API tRPC (/api/trpc/<procedimento>?batch=1, o mesmo formato do httpBatchLink) com a
// sessão por token (Authorization: Bearer) OU pelo cookie racha_sessao (o mesmo nome e o mesmo jeito do authRouter), e as
// páginas da conta (/amigos, /perfil, /jogador/N…) como páginas simples que conferem a sessão pelo cookie e, no "JOGAR",
// pedem ao jogo para fechar o painel (o que o IrParaOJogo do App.tsx faz dentro do painel). Tudo na memória.
//   node tests/v87_plataforma_falsa.mjs <porta> [--sem-api] [--lento-ms N] [--teste]
//   --sem-api: /api/* responde 404 (um servidor sem a plataforma: o server/servidor.js, o GitHub Pages)
//   --lento-ms: o auth.eu demora N ms (para o teste escolher o SÓ TREINAR OFFLINE enquanto o jogo confere a sessão)
//   --teste: o /game/racha.html é a cópia de teste do build (tests/build/racha_teste.html: o mesmo jogo + window.__RT)
// Rotas do teste: /__entrar_site?u=<usuário> faz o login do SITE (só o cookie, como a página /entrar) e volta para a raiz ·
// /__log devolve as chamadas da API.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const JOGO = path.join(RAIZ, 'app', 'public', 'game');
const PORTA = Number(process.argv[2] || 8787);
const SEM_API = process.argv.includes('--sem-api');
const iL = process.argv.indexOf('--lento-ms'); const LENTO = iL > 0 ? Number(process.argv[iL + 1]) || 0 : 0;
const TESTE = process.argv.includes('--teste');
const USUARIOS = {
  croy: { id: 7, idPublico: '000007', username: 'croy', nomeExibicao: 'CROY', senha: 'racha123', xp: 120, nivel: 2, cargo: null },
  dono: { id: 1, idPublico: '000001', username: 'dono', nomeExibicao: 'Dono', senha: 'racha123', xp: 5000, nivel: 10, cargo: 'dono' },
};
const SESSOES = new Map();                                   // token → username
const LOG = [];
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.ttf': 'font/ttf', '.txt': 'text/plain; charset=utf-8', '.woff2': 'font/woff2' };

function publico(u){ return { idPublico: u.idPublico, nomeExibicao: u.nomeExibicao, username: u.username, nivel: u.nivel, tituloCarreira: 'Cria da Quebrada',
  tituloEquipado: null, avatarEmoji: '⚽', corDestaque: '#ffd23f', skinEquipada: 'padrao', tampa: null, bannerEquipado: 'padrao', molduraEquipada: null, selos: [], criadoEm: new Date(0).toISOString() }; }
function sessao(req){
  let token = '';
  const auth = req.headers['authorization'] || '';
  if (auth.startsWith('Bearer ')) token = auth.slice(7).trim();
  if (!token){ const m = (req.headers['cookie'] || '').match(/(?:^|;\s*)racha_sessao=([^;]+)/); if (m) token = decodeURIComponent(m[1]); }
  const u = token && SESSOES.get(token);
  return u ? { token, u: USUARIOS[u] } : null;
}
const cookie = (token, max) => `racha_sessao=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${max}`;
function novaSessao(u){ const t = crypto.randomBytes(18).toString('hex'); SESSOES.set(t, u.username); return t; }
class Erro extends Error { constructor(st, msg){ super(msg); this.st = st; } }

const API = {
  'auth.eu': (s) => s ? { logado: true, conta: { ...publico(s.u), xp: s.u.xp, rq: { pts: 0, melhor: 0, jogos: 0, vit: 0, der: 0, emp: 0, seq: 0, desist: 0, importado: false },
    email: null, perfilPublico: true, aceitaPedidos: true, cargo: s.u.cargo } } : { logado: false },
  'auth.entrar': (s, inp, res) => {
    const u = USUARIOS[String(inp && inp.identificador || '').toLowerCase()];
    if (!u || u.senha !== (inp && inp.senha)) throw new Erro(401, 'E-mail/usuário ou senha incorretos.');
    const token = novaSessao(u); res.setHeader('set-cookie', cookie(token, 30 * 86400));
    return { token, conta: publico(u) };
  },
  'auth.sair': (s, inp, res) => { if (!s) throw new Erro(401, 'Faça login.'); SESSOES.delete(s.token); res.setHeader('set-cookie', cookie('', 0)); return { ok: true }; },
  'progresso.carregar': (s) => { if (!s) throw new Erro(401, 'Faça login.'); return null; },
  'progresso.salvar': (s, inp) => { if (!s) throw new Erro(401, 'Faça login.'); return { ok: true, versao: ((inp && inp.versaoBase) | 0) + 1 }; },
  'perfil.meuInventario': (s) => { if (!s) throw new Erro(401, 'Faça login.'); return []; },
  'perfil.minhaPatente': (s) => { if (!s) throw new Erro(401, 'Faça login.'); return { pts: 0, melhor: 0, jogos: 0, vit: 0, der: 0, emp: 0, seq: 0, desist: 0, importado: false }; },
  'perfil.rankingPatentes': () => [],
  'jogo.bilheteSala': (s) => ({ bilhete: null }),
  'jogo.iniciarPartida': (s) => { if (!s) throw new Erro(401, 'Faça login.'); return { matchToken: 'tok-' + Date.now(), desistencias: 0 }; },
  'jogo.encerrarPartida': (s) => { if (!s) throw new Erro(401, 'Faça login.'); return { xpConcedido: 10, subiuNivel: false, nivel: s.u.nivel, itensNovos: [], conquistasNovas: [] }; },
  'jogo.golTreino': (s) => { if (!s) throw new Erro(401, 'Faça login.'); return { xpConcedido: 0, subiuNivel: false, nivel: s.u.nivel, itensNovos: [], conquistasNovas: [] }; },
  'clubes.meu': () => null, 'clubes.listar': () => [], 'clubes.convites': () => [],
};

function corpo(req){ return new Promise(ok => { let b = ''; req.on('data', d => { b += d; }); req.on('end', () => ok(b)); }); }
function paginaConta(rota, s){
  const nome = s ? s.u.nomeExibicao : '(sem sessão)';
  return `<!doctype html><html><head><meta charset="utf-8"><title>Conta</title></head><body style="background:#0d0b1e;color:#fff;font-family:sans-serif">
<h1 id="pg">PÁGINA ${rota}</h1><p id="quem">${nome}</p><button id="jogar" type="button">JOGAR</button>
<script>document.getElementById('jogar').onclick = function(){ window.parent.postMessage({racha:'site_fechar'}, location.origin); };</script></body></html>`;
}

http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x');
  let p = u.pathname;
  if (p === '/__log'){ res.writeHead(200, { 'content-type': 'application/json' }); return res.end(JSON.stringify(LOG)); }
  if (p === '/__entrar_site'){                               // o login do SITE: só o cookie (a página /entrar do site)
    const us = USUARIOS[u.searchParams.get('u') || 'croy'];
    const token = novaSessao(us);
    res.writeHead(302, { location: '/', 'set-cookie': cookie(token, 30 * 86400) }); return res.end();
  }
  if (p === '/'){ res.writeHead(302, { location: '/game/racha.html' + u.search }); return res.end(); }   // o servidor da v87
  if (p.startsWith('/api/')){
    if (SEM_API){ res.writeHead(404, { 'content-type': 'application/json' }); return res.end('{"error":"Not Found"}'); }
    const proc = p.replace(/^\/api\/trpc\//, '');
    let input = null;
    try {
      const txt = req.method === 'GET' ? (u.searchParams.get('input') || 'null') : await corpo(req);
      const j = JSON.parse(txt || 'null'); input = j && j[0] ? j[0].json : null;
    } catch (_) {}
    const s = sessao(req);
    LOG.push({ proc, metodo: req.method, via: (req.headers['authorization'] || '').startsWith('Bearer ') ? 'token' : s ? 'cookie' : 'nada', conta: s ? s.u.username : null });
    if (proc === 'auth.eu' && LENTO) await new Promise(r => setTimeout(r, LENTO));
    const fn = API[proc];
    try {
      if (!fn) throw new Erro(404, 'No procedure found on path "' + proc + '"');
      const out = fn(s, input, res);
      res.writeHead(200, { 'content-type': 'application/json' }); return res.end(JSON.stringify([{ result: { data: { json: out } } }]));
    } catch (e) {
      const st = e.st || 500;
      res.writeHead(st, { 'content-type': 'application/json' });
      return res.end(JSON.stringify([{ error: { json: { message: e.message, code: -32001, data: { httpStatus: st, path: proc } } } }]));
    }
  }
  if (/^\/(amigos|ranking|perfil|conquistas|inventario|carreira|estatisticas|admin)$/.test(p) || /^\/jogador\/\d{1,9}$/.test(p)){
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); return res.end(paginaConta(p, sessao(req)));
  }
  // (a cópia de teste tem <base href="../../app/public/game/"> para abrir do disco; servida em /game/racha.html, os arquivos
  // ao lado dela — o config.js, o rua.js, o lobby.js, as imagens — são pedidos em /app/public/game/...)
  if (TESTE && p.startsWith('/app/public/game/')) p = '/game/' + p.slice('/app/public/game/'.length);
  if (p.startsWith('/game/')){
    const f = TESTE && p === '/game/racha.html' ? path.join(RAIZ, 'tests', 'build', 'racha_teste.html') : path.join(JOGO, decodeURIComponent(p.slice(6)));
    if ((f.startsWith(JOGO) || (TESTE && p === '/game/racha.html')) && fs.existsSync(f) && fs.statSync(f).isFile()){
      res.writeHead(200, { 'content-type': TIPOS[path.extname(f)] || 'application/octet-stream' }); return res.end(fs.readFileSync(f));
    }
  }
  res.writeHead(404, { 'content-type': 'text/plain' }); res.end('não achei');
}).listen(PORTA, '127.0.0.1', () => console.log('plataforma de mentira v87 em http://127.0.0.1:' + PORTA + (SEM_API ? ' (sem API)' : '') + (LENTO ? ' (auth.eu lento: ' + LENTO + ' ms)' : '')));
