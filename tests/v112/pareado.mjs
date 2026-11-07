// RACHA v112 · o A/B PAREADO do simulador do online (tests/v112/sim.mjs): a MESMA partida (as mesmas sementes: a mesma
// internet de mentira e os mesmos roteiros) em cada variante; para cada número, a média e o intervalo de 95% da diferença
// para a primeira variante (▼ / ▲ = a diferença passa do intervalo: não é sorte).
// Uso: node tests/v112/pareado.mjs <rede> <segundos> <quantas sementes> <n> ['colchao=0;colchao=1;colchao=1,cmax=1']
//      (o RESULTADOS da v112, docs/v112/RESULTADOS.md, saiu de: 40 sementes × 60 s, n = 1, 2 e 4, nas 4 redes)
import { simula, mede } from './sim.mjs';
const [rede = 'wifi', seg = '60', ns = '20', n = '1', vs = 'colchao=0;colchao=1;colchao=1,cmax=1'] = process.argv.slice(2);
const variantes = vs.split(';');
const CAMPOS = [
  ['eu', 'correcao_p95_px'], ['eu', 'pulos_min'], ['eu', 'deslize_p95_px'],
  ['outro', 'pulos_min'], ['outro', 'paradas_min'], ['outro', 'erro_med_px'], ['outro', 'erro_p95_px'], ['outro', 'correcao_p95_px'],
  ['bola', 'pulos_min'], ['bola', 'erro_med_px'], ['bola', 'erro_p95_px'], ['bola', 'correcao_p95_px'],
  ['verdade.outro', 'pulos_min'], ['verdade.outro', 'paradas_min'], ['verdade.eu', 'paradas_min'],
  ['fila', 'palpites_pct'], ['comando', 'p50_ms'], ['comando', 'p95_ms'], ['sobre', 'bola_dentro_pct'],
];
const pega = (m, caminho, k) => { let o = m; for (const p of caminho.split('.')) o = o && o[p]; return o && typeof o[k] === 'number' ? o[k] : NaN; };
const res = variantes.map(() => CAMPOS.map(() => []));
for (let s = 1; s <= +ns; s++) {
  variantes.forEach((v, vi) => {
    const o = { rede, dur: +seg * 1000, n: +n, cliente: 'v108', seed: s };
    for (const kv of v.split(',')) { const [k, x] = kv.split('='); if (x !== undefined) o[k] = isNaN(+x) ? x : +x; }
    const m = mede(simula(o));
    CAMPOS.forEach(([c, k], i) => res[vi][i].push(pega(m, c, k)));
  });
}
const media = a => { const b = a.filter(Number.isFinite); return b.reduce((s, x) => s + x, 0) / Math.max(1, b.length); };
const ic = d => { const b = d.filter(Number.isFinite); const m = media(b); const sd = Math.sqrt(b.reduce((s, x) => s + (x - m) ** 2, 0) / Math.max(1, b.length - 1)); return [m, 1.96 * sd / Math.sqrt(Math.max(1, b.length))]; };
const f = x => (Math.abs(x) >= 10 ? x.toFixed(1) : x.toFixed(2));
console.log(`== ${n}v${n} ${rede} · ${ns} sementes × ${seg} s`);
console.log('campo'.padEnd(30) + variantes.map((v, i) => (i ? v + ' (dif ±95%)' : v).padEnd(34)).join(''));
CAMPOS.forEach(([c, k], i) => {
  let l = (c + '.' + k).padEnd(30) + f(media(res[0][i])).padEnd(34);
  for (let vi = 1; vi < variantes.length; vi++) {
    const d = res[vi][i].map((x, j) => x - res[0][i][j]); const [m, e] = ic(d);
    const sig = Math.abs(m) > e ? (m < 0 ? ' ▼' : ' ▲') : '  ';
    l += (f(media(res[vi][i])) + ' (' + (m >= 0 ? '+' : '') + f(m) + ' ±' + f(e) + ')' + sig).padEnd(34);
  }
  console.log(l);
});
