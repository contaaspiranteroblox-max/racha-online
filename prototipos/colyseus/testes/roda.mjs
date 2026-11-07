/* PROTÓTIPO COLYSEUS · roda os 6 testes, um processo para cada (o matchMaker do Colyseus é um só por processo)
   node prototipos/colyseus/testes/roda.mjs [1 3 5]   (sem números: todos) */
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const TODOS = ['t1_fisica', 't2_salas', 't3_reconexao', 't4_trapaca', 't5_rede', 't6_integracao'];
const pedidos = process.argv.slice(2).map(Number).filter(n => n >= 1 && n <= TODOS.length);
const lista = pedidos.length ? pedidos.map(n => TODOS[n - 1]) : TODOS;
const t0 = Date.now(), resumo = [];
for (const nome of lista) {
  const saida = await new Promise(ok => {
    let txt = '';
    const p = spawn(process.execPath, [path.join(AQUI, nome + '.mjs')], { cwd: path.join(AQUI, '..'), stdio: ['ignore', 'pipe', 'pipe'] });
    const passa = b => { const s = b.toString(); txt += s; process.stdout.write(s.split('\n').filter(l => !/^\s+at /.test(l)).join('\n')); };
    p.stdout.on('data', passa); p.stderr.on('data', passa);
    const morto = setTimeout(() => { txt += '\n(passou de 5 min: parado)'; p.kill('SIGKILL'); }, 5 * 60e3);
    p.on('exit', code => { clearTimeout(morto); ok({ code, txt }); });
  });
  const m = /: (\d+)\/(\d+) verificações ok/.exec(saida.txt);
  resumo.push({ nome, ok: saida.code === 0, conta: m ? m[1] + '/' + m[2] : 'sem placar (código ' + saida.code + ')' });
}
console.log('\n================ protótipo Colyseus do RACHA ================');
for (const r of resumo) console.log('  ' + (r.ok ? 'OK     ' : 'FALHOU ') + ' ' + r.nome.padEnd(15) + ' ' + r.conta);
const tudo = resumo.every(r => r.ok);
console.log('  ' + (tudo ? 'tudo certo' : 'ALGO FALHOU') + ' em ' + ((Date.now() - t0) / 1000).toFixed(0) + ' s');
process.exit(tudo ? 0 : 1);
