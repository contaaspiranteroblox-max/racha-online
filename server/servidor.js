#!/usr/bin/env node
'use strict';
/* =====================================================================================================================
   RACHA · o servidor da turma em um comando: entrega o jogo (os arquivos de app/public) e as salas no mesmo endereço.
   O jogo, aberto por este endereço, já conecta sozinho (ws://o-mesmo-endereço/), sem configurar nada.

     node server/servidor.js                       → http://localhost:8080  (jogo em /game/racha.html)
     node server/servidor.js --porta 3001 --dados ./dados/turma.json --nome "Racha da Laje"

   Opções (ou as variáveis de ambiente entre parênteses):
     --porta N        (PORT)                 porta HTTP · padrão 8080
     --host H         (HOST)                 endereço para escutar · padrão 0.0.0.0 (a rede toda); 127.0.0.1 = só este computador
     --estaticos DIR  (RACHA_ESTATICOS)      a pasta entregue por HTTP · padrão app/public (o jogo fica em /game/)
     --dados ARQ      (RACHA_DADOS)          o arquivo JSON com contas da turma, troféus, clubes, duelos e campeões · padrão server/dados/turma.json
     --origens LISTA  (RACHA_ORIGENS)        outras páginas que podem conectar (ex.: https://meusite.com,https://outro.com); o mesmo endereço e localhost sempre podem
     --nome TXT       (RACHA_SALAS_NOME)     o nome do servidor (aparece na sala)
     --segredo TXT    (RACHA_SEGREDO_SALAS)  o mesmo segredo da plataforma: bilhete da conta e selo do resultado (opcional)
     --sem-p2p        (RACHA_P2P=0)          sem a conexão direta entre os aparelhos (tudo passa pelo servidor)
     --memoria                               não grava nada em arquivo (testes)
     --tempo-normal S (RACHA_TEMPO_NORMAL)   v80: os segundos da partida normal (a ranqueada) · padrão 180 (3:00); para testes e demonstrações
     --prorrogacao S  (RACHA_PRORROGACAO)    v80: os segundos da prorrogação do 0 × 0 · padrão 120 (até -2:00)
   ===================================================================================================================== */
const http = require('http');
const fs = require('fs');
const path = require('path');
const {aceita} = require('./ws');
const {Turma, origemPermitida} = require('./turma');

function argumentos(argv){
  const o = {};
  for (let i = 0; i < argv.length; i++){
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const k = a.slice(2), prox = argv[i + 1];
    if (prox === undefined || prox.startsWith('--')) o[k] = true; else { o[k] = prox; i++; }
  }
  return o;
}
const A = argumentos(process.argv.slice(2));
const RAIZ = path.resolve(__dirname, '..');
const CFG = {
  porta: Number(A.porta || process.env.PORT || 8080),
  host: String(A.host || process.env.HOST || '0.0.0.0'),
  estaticos: path.resolve(String(A.estaticos || process.env.RACHA_ESTATICOS || path.join(RAIZ, 'app', 'public'))),
  dados: A.memoria ? null : path.resolve(String(A.dados || process.env.RACHA_DADOS || path.join(__dirname, 'dados', 'turma.json'))),
  origens: String(A.origens || process.env.RACHA_ORIGENS || '').split(',').map(s => s.trim()).filter(Boolean),
  nome: String(A.nome || process.env.RACHA_SALAS_NOME || 'Servidor da turma'),
  segredo: String(A.segredo || process.env.RACHA_SEGREDO_SALAS || ''),
  p2p: !(A['sem-p2p'] || process.env.RACHA_P2P === '0'),
  regra80: {seg:Number(A['tempo-normal'] || process.env.RACHA_TEMPO_NORMAL || 0), prorrog:Number(A.prorrogacao || process.env.RACHA_PRORROGACAO || 0)}   // (0 = o padrão)
};

const TIPOS = {'.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.json':'application/json; charset=utf-8',
  '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.webp':'image/webp', '.svg':'image/svg+xml', '.ico':'image/x-icon', '.mp3':'audio/mpeg',
  '.ogg':'audio/ogg', '.wav':'audio/wav', '.woff':'font/woff', '.woff2':'font/woff2', '.ttf':'font/ttf', '.txt':'text/plain; charset=utf-8', '.map':'application/json'};

function entrega(req, res){
  const u = new URL(req.url, 'http://x');
  if (u.pathname === '/saude'){ res.writeHead(200, {'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store'}); return res.end(JSON.stringify(turma.status())); }
  if (u.pathname === '/' || u.pathname === '/index.html' && !fs.existsSync(path.join(CFG.estaticos, 'index.html'))){
    res.writeHead(302, {Location:'/game/racha.html' + u.search}); return res.end();
  }
  if (req.method !== 'GET' && req.method !== 'HEAD'){ res.writeHead(405, {Allow:'GET, HEAD'}); return res.end(); }
  let rel; try { rel = decodeURIComponent(u.pathname); } catch (_) { res.writeHead(400); return res.end(); }
  const arq = path.resolve(CFG.estaticos, '.' + rel);
  if (!arq.startsWith(CFG.estaticos + path.sep) && arq !== CFG.estaticos){ res.writeHead(403); return res.end(); }   // (nada fora da pasta)
  fs.stat(arq, (e, st) => {
    let alvo = arq;
    if (!e && st.isDirectory()) alvo = path.join(arq, 'index.html');
    fs.readFile(alvo, (e2, buf) => {
      if (e2){ res.writeHead(404, {'Content-Type':'text/plain; charset=utf-8'}); return res.end('não encontrado'); }
      const ext = path.extname(alvo).toLowerCase();
      res.writeHead(200, {'Content-Type':TIPOS[ext] || 'application/octet-stream', 'Content-Length':buf.length,
        'Cache-Control':ext === '.html' || ext === '.js' || ext === '.css' ? 'no-cache' : 'public, max-age=3600', 'X-Content-Type-Options':'nosniff'});
      res.end(req.method === 'HEAD' ? undefined : buf);
    });
  });
}

const turma = new Turma({arquivo:CFG.dados, nome:CFG.nome, segredo:CFG.segredo, p2p:CFG.p2p, regra80:CFG.regra80});
const servidor = http.createServer(entrega);
servidor.on('upgrade', (req, sock, cabeca) => {
  const origem = req.headers.origin;
  if (!origemPermitida(origem, req.headers.host, CFG.origens)){
    turma.log('conexão recusada da origem ' + origem + ' (ponha em --origens se for sua)');
    sock.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n'); return;
  }
  const ws = aceita(req, sock, cabeca);
  if (ws) turma.conecta(ws, req);
});
servidor.on('clientError', (e, sock) => { try { sock.end('HTTP/1.1 400 Bad Request\r\n\r\n'); } catch (_) {} });
servidor.listen(CFG.porta, CFG.host, () => {
  const ende = (CFG.host === '0.0.0.0' ? 'localhost' : CFG.host) + ':' + servidor.address().port;
  turma.log('RACHA · ' + CFG.nome + ' no ar: http://' + ende + '/game/racha.html (salas em ws://' + ende + '/)');
  turma.log('arquivos: ' + CFG.estaticos + ' · dados: ' + (CFG.dados || 'só na memória') + (CFG.segredo ? ' · com o segredo da plataforma' : '') + (CFG.p2p ? '' : ' · sem conexão direta'));
  if (process.send) process.send({pronto:true, porta:servidor.address().port});
});
function desliga(){ turma.log('desligando…'); turma.fecha(); servidor.close(() => process.exit(0)); setTimeout(() => process.exit(0), 1500).unref(); }
process.on('SIGINT', desliga); process.on('SIGTERM', desliga);
module.exports = {servidor, turma};
