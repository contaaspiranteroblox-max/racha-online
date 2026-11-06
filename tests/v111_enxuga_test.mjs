// RACHA v111 · o jogo enxuto é o MESMO programa do completo.
//
// O build (tools/aplicar_rua.py → tools/v111/enxuga.py) grava dois arquivos:
//   app/public/game/racha.html          o que vai para o jogador: sem comentários, sem recuo e com as imagens aposentadas
//   tests/build/racha_completo.html     o mesmo jogo com os comentários e o recuo (as imagens aposentadas já trocadas)
// Aqui o esbuild (o mesmo da plataforma) reescreve cada <script> e cada <style> dos dois sem espaços e sem comentários: as
// duas saídas precisam ser idênticas, letra por letra. O HTML de fora dos blocos precisa ser igual, o bloco da física igual
// byte a byte, e o enxuto bem menor. Rodar depois do build: node tests/v111_enxuga_test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
let esbuild;
for (const p of [path.join(RAIZ, 'app/node_modules/esbuild'), '/opt/npm-tools/node_modules/esbuild']) { try { esbuild = require(p); break; } catch (_) {} }
if (!esbuild) { console.error('sem o esbuild: rode npm install em app/'); process.exit(2); }

const ENXUTO = path.join(RAIZ, 'app/public/game/racha.html'), COMPLETO = path.join(RAIZ, 'tests/build/racha_completo.html');
if (!fs.existsSync(COMPLETO)) { console.error('sem a cópia completa: rode python3 tools/aplicar_rua.py antes'); process.exit(2); }
const enx = fs.readFileSync(ENXUTO, 'utf8'), comp = fs.readFileSync(COMPLETO, 'utf8');

let ok = 0; const falhas = [];
const confere = (cond, oque, detalhe) => { if (cond) { ok++; console.log('  OK      ' + oque); } else { falhas.push(oque); console.log('  FALHOU  ' + oque + (detalhe ? '  ·  ' + detalhe : '')); } };
const kb = s => Math.round(Buffer.byteLength(s) / 1024);

console.log('v111 · o jogo enxuto × o completo');
const BLOCO = /(<script>|<style>)([\s\S]*?)(<\/script>|<\/style>)/g;
const blocos = h => [...h.matchAll(BLOCO)].map(m => ({ tipo: m[1], corpo: m[2] }));
const be = blocos(enx), bc = blocos(comp);
confere(be.length === bc.length && be.length >= 6, 'os mesmos blocos nos dois (' + be.length + ' <script>/<style>)', bc.length + ' × ' + be.length);
const fora = h => h.replace(BLOCO, '$1$3');
confere(fora(enx) === fora(comp), 'o HTML fora dos blocos é o mesmo');

const diferenca = (a, b) => { let k = 0; while (k < a.length && a[k] === b[k]) k++; return '…' + a.slice(Math.max(0, k - 80), k + 80) + '…  ×  …' + b.slice(Math.max(0, k - 80), k + 80) + '…'; };
let js = 0, css = 0, iguaisJs = 0, iguaisCss = 0, primeira = '';
for (let i = 0; i < Math.min(be.length, bc.length); i++) {
  const a = bc[i].corpo, b = be[i].corpo;
  if (bc[i].tipo === '<script>') {
    js++;
    const op = { loader: 'js', minifyWhitespace: true, legalComments: 'none', target: 'esnext' };
    let ea, eb;
    try { ea = esbuild.transformSync(a, op).code; eb = esbuild.transformSync(b, op).code; } catch (e) { primeira = primeira || 'script ' + i + ': ' + String(e.message).slice(0, 300); continue; }
    if (ea === eb) iguaisJs++; else primeira = primeira || 'script ' + i + ': ' + diferenca(ea, eb);
  } else {
    css++;
    const op = { loader: 'css', minify: true };
    const ea = esbuild.transformSync(a, op).code, eb = esbuild.transformSync(b, op).code;
    if (ea === eb) iguaisCss++; else primeira = primeira || 'style ' + i + ': ' + diferenca(ea, eb);
  }
}
confere(js > 0 && iguaisJs === js, 'cada <script> do enxuto é o mesmo programa do completo (o esbuild reescreve os dois igual: ' + iguaisJs + ' de ' + js + ')', primeira);
confere(css > 0 && iguaisCss === css, 'cada <style> do enxuto é o mesmo estilo do completo (' + iguaisCss + ' de ' + css + ')', primeira);

const fis = h => { const a = h.indexOf('/*PHYS_START*/'), b = h.indexOf('/*PHYS_END*/'); return a > 0 && b > a ? h.slice(a, b) : null; };
confere(fis(enx) !== null && fis(enx) === fis(comp), 'o bloco da física é o mesmo, byte a byte (com as marcas PHYS_START e PHYS_END)');

// as imagens aposentadas (tools/v111/enxuga.py, APOSENTADAS): o pontinho nos dois, o mesmo número de vezes
const PONTINHO = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
const n = h => h.split(PONTINHO).length - 1;
confere(n(enx) === 5 && n(comp) === 5, 'as 5 imagens aposentadas viraram o pontinho transparente nos dois (' + n(enx) + ' e ' + n(comp) + ')');
// as que continuam valendo continuam inteiras (a tela de entrar, o lobby, os emojis, os banners, os campos e as tampinhas)
for (const c of ['const V91_FUNDO = {src:"data:image/webp', 'const V101_FUNDO = {src:"data:image/webp', 'const EMJ = {atlas:{src:"data:image/webp',
  'const V91_BANNERS = {src:"data:image/webp', 'const QD_KIT = {src:"data:image/webp', 'const CN_KIT = {src:"data:image/webp', 'const SK76_KIT = {src:"data:image/webp']) {
  confere(enx.includes(c), 'continua no jogo: ' + c.slice(6, c.indexOf(' =')));
}

const ganho = kb(comp) - kb(enx);
confere(ganho > 900, 'o enxuto é bem menor: ' + kb(comp) + ' KB → ' + kb(enx) + ' KB (−' + ganho + ' KB)');
confere(!/<\/script/i.test(be.map(x => x.corpo).join('')), 'nenhum </script> apareceu dentro do código');

console.log('\nv111 · o jogo enxuto: ' + ok + '/' + (ok + falhas.length) + ' verificações ok');
if (falhas.length) { falhas.forEach(f => console.log('  - falhou: ' + f)); process.exit(1); }
