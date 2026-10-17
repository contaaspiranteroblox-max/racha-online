// Etapa 5 · o servidor da turma MONTADO NA PLATAFORMA (app/api/lib/salas.ts) e o selo conferido (app/api/lib/selo.ts).
// O banco da plataforma não roda aqui (MySQL), então a sessão do site é trocada por uma de mentira (só neste teste):
// o cookie racha_sessao=conta123 vira a conta 000123 "Craque". O resto é o código de verdade, empacotado com o esbuild
// (o mesmo do npm run build). Confere: a origem, a conta pela sessão (sem bilhete), o selo do resultado e a conferência
// do selo pela plataforma (conta, placar, assinatura; adulterado não passa).
// Rodar: node tests/plataforma_salas_test.mjs   (precisa do esbuild: app/node_modules ou /opt/npm-tools/node_modules)
import { createRequire } from 'module';
import { fileURLToPath, pathToFileURL } from 'url';
import path from 'path';
import fs from 'fs';
import os from 'os';
import http from 'http';
const require = createRequire(import.meta.url);
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let esbuild;
for (const p of [path.join(RAIZ, 'app', 'node_modules', 'esbuild'), '/opt/npm-tools/node_modules/esbuild']) { try { esbuild = require(p); break; } catch (_) {} }
if (!esbuild) { console.log('sem o esbuild: rode npm install em app/ (ou use o esbuild do sistema)'); process.exit(2); }

let ok = 0, falhou = 0;
const confira = (c, t, x) => { if (c) { ok++; console.log('  ok   ' + t); } else { falhou++; console.log('  FALHOU ' + t + (x !== undefined ? '  → ' + JSON.stringify(x).slice(0, 300) : '')); } };
const espera = ms => new Promise(r => setTimeout(r, ms));

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'racha-plat-'));
const stub = path.join(tmp, 'guard_stub.mjs');
fs.writeFileSync(stub, `export async function sessaoDaRequisicao(req){ const c = req.headers.get('cookie') || ''; return /racha_sessao=conta123/.test(c) ? {usuario:{id:7, idPublico:123, nomeExibicao:'Craque'}, sessao:{}} : /racha_sessao=conta456/.test(c) ? {usuario:{id:8, idPublico:456, nomeExibicao:'Parceira'}, sessao:{}} : null; }\n`);
const entrada = path.join(tmp, 'entrada.ts');
fs.writeFileSync(entrada, `export { ligaSalas } from ${JSON.stringify(path.join(RAIZ, 'app/api/lib/salas.ts'))};\nexport { confereSelo, segredoSalas } from ${JSON.stringify(path.join(RAIZ, 'app/api/lib/selo.ts'))};\n`);
const saida = path.join(tmp, 'pacote.mjs');
await esbuild.build({ entryPoints:[entrada], bundle:true, platform:'node', format:'esm', outfile:saida, logLevel:'silent',
  banner:{js:"import { createRequire } from 'module';const require = createRequire(import.meta.url);"},
  plugins:[{name:'sessao-de-teste', setup(b){ b.onResolve({filter:/racha\/guard$/}, () => ({path:stub})); }}] });
const {ligaSalas, confereSelo, segredoSalas} = await import(pathToFileURL(saida).href);

console.log('\nO servidor da turma montado na plataforma (o mesmo endereço do site)');
delete process.env.RACHA_SEGREDO_SALAS;
const srv = http.createServer((q, r) => { r.writeHead(200); r.end('site'); });
let pediuSelos = [];
ligaSalas(srv, {selosDe:async id => { pediuSelos.push(id); return id === 7 ? ['parceiro', 'verificado'] : []; }});   // v79: os selos vêm do banco (aqui, de mentira)
await new Promise(r => srv.listen(0, '127.0.0.1', r));
const porta = srv.address().port;
confira(segredoSalas().length > 20, 'sem RACHA_SEGREDO_SALAS, um segredo é sorteado (os dois lados estão no mesmo processo)');
function socket(headers){
  return new Promise((res, rej) => {
    const ws = new WebSocket('ws://127.0.0.1:' + porta + '/', {headers});
    const k = {ws, caixa:[], manda:m => ws.send(JSON.stringify(m)),
      espera:async (tipo, cond, ms) => { const t0 = Date.now(); for (;;){ const m = k.caixa.find(x => x.type === tipo && (!cond || cond(x))); if (m) return m; if (Date.now() - t0 > (ms || 3000)) return null; await espera(25); } }};
    ws.onmessage = e => k.caixa.push(JSON.parse(e.data)); ws.onopen = () => res(k); ws.onerror = () => rej(new Error('não conectou'));
  });
}
let recusou = false; try { await socket({Origin:'https://outro-site.example'}); } catch (_) { recusou = true; }
confira(recusou, 'página de outra origem não conecta (403)');
const A = await socket({Origin:'http://127.0.0.1:' + porta, Cookie:'racha_sessao=conta123'}), B = await socket({Origin:'http://localhost', Cookie:'racha_sessao=conta456'});
const V = await socket({Origin:'http://localhost'});   // (arnês v84: sem login)
A.manda({type:'hello', name:'Nome Qualquer', skin:'T.AAAA1111'}); B.manda({type:'hello', name:'Outro Nome', skin:'T.BBBB2222'}); V.manda({type:'hello', name:'Visitante', skin:'T.CCCC3333'});
const hA = await A.espera('hello'), hB = await B.espera('hello'), eV = await V.espera('error', x => x.codigo === 'sem_conta');
confira(hA && hA.conta === true && hA.id === 'c123' && hA.pub === '000123', 'logado no site: entra com a conta (a sessão do cookie, sem bilhete)', hA);
confira(!!eV && !V.caixa.some(x => x.type === 'hello'), 'v84: sem login não entra (o hello é recusado: sem_conta)', eV);
confira(hB && hB.conta === true && hB.id === 'c456', 'a segunda conta também entra pela sessão do site', hB);
confira(hA && hA.selo === 'verificado' && hB && hB.selo === '' && pediuSelos.slice().sort().join() === '7,8', 'v79: o selo da conta vem do banco (selosDe), só para quem está logado: o hello traz o V (verificado vem antes de parceiro)', [hA && hA.selo, hB && hB.selo, pediuSelos]);
A.manda({type:'create', n:1, map:0, jogo:'futebol', tempo:0, bots:false, pub:true});
const sala = (await A.espera('room')).room;
confira(sala.members[0].name === 'Craque', 'o nome na sala é o da conta (não o do aparelho)', sala.members[0].name);
confira(sala.members[0].selo === 'verificado', 'v79: no cartão da sala, o selo da conta (o V na frente do nome)', sala.members[0]);
B.manda({type:'join', code:sala.code, slot:1});
await A.espera('room', x => x.room.roster[1] === hB.id);
A.manda({type:'start'}); await B.espera('start');
A.manda({type:'snapshot', round:1, data:{tick:1, elapsed:0, state:'jogo', score:[0, 0], ball:[0, 0, 0, 0, 0], players:[]}});
console.log('  (esperando 11 s de partida de verdade: o servidor confere o tempo)');
await espera(11000);
A.manda({type:'snapshot', round:1, data:{tick:600, elapsed:9.5, state:'fim', score:[3, 1], ball:[0, 0, 0, 0, 0], players:[]}});
A.manda({type:'finish', round:1, score:[3, 1]});
const rA = await A.espera('result'), rB = await B.espera('result');
confira(rA && rA.valida && typeof rA.selo === 'string' && rB && rB.valida && typeof rB.selo === 'string', 'resultado conferido: cada conta recebe o seu selo', [rA && !!rA.selo, rB && !!rB.selo]);
const sB = rB && rB.selo ? confereSelo(rB.selo) : null;
confira(sB && sB.j === '000456' && sB.l === 1, 'o selo da segunda conta é dela e do lado dela', sB);
const s = confereSelo(rA.selo);
confira(s && s.j === '000123' && s.l === 0 && s.p.join() === '3,1' && s.m === 'futebol' && s.s === sala.code, 'a plataforma confere o selo: a conta, o lado e o placar', s);
confira(confereSelo(rA.selo.slice(0, -2) + (rA.selo.endsWith('AA') ? 'BB' : 'AA')) === null, 'selo adulterado não confere');
A.ws.close(); B.ws.close(); V.ws.close(); srv.close();
fs.rmSync(tmp, {recursive:true, force:true});
console.log('\nservidor montado na plataforma: ' + ok + ' ok, ' + falhou + ' falharam');
process.exit(falhou ? 1 : 0);
