// RACHA v83 · a medida de CPU e de rede da partida autoritativa (o plano da v83 manda medir o custo do passo
// ANTES de fixar a frequência). Não é teste (não passa/falha): imprime os números.  node tests/v83_medida.mjs
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { PartidaAutoritativa } = require('../server/partida/partida.js');

function criaPartida(n){
  let agora = 1_000_000;
  let ultimo = null;
  const p = new PartidaAutoritativa({
    codigo: 'MEDIDA', n, ranked: true,
    agora: () => agora,
    regra: { seg: 180, prorrog: 120 },
    log: () => {},
    aoQuadro: q => { ultimo = JSON.stringify({ type: 'auto_q', t: q.t, b: q.b, p: q.p }); },
    aoGol: () => {}, aoFim: () => {},
  });
  const js = [];
  for (let i = 0; i < n * 2; i++) js.push({ id: 'j' + i, conta: '00000' + i, nome: 'J' + i });
  for (const j of js) p.entra(j);
  p.comeca();
  return { p, js, quadro: () => ultimo };
}

// aquecimento (tira o JIT do caminho)
{
  const { p, js } = criaPartida(2);
  for (let t = 0; t < 600; t++){ p.comando(js[t % 4].id, { seq: t + 1, mx: 1, my: 0 }); p.passo(); }
}

console.log('CPU · o custo de um passo de 60 Hz por partida (2v2, todos mandando comando a 60/s, como o jogo real)');
for (const N of [1, 10, 50, 100]){
  const partidas = [];
  for (let i = 0; i < N; i++) partidas.push(criaPartida(2));
  const t0 = process.hrtime.bigint();
  let passos = 0;
  for (let t = 0; t < 600; t++){
    for (const { p, js } of partidas){
      for (let j = 0; j < 4; j++) p.comando(js[j].id, { seq: t + 1, mx: Math.cos(t / 20), my: Math.sin(t / 20), k: t % 50 === 0 ? 2 : undefined });
      p.passo();
      passos++;
    }
  }
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  const porPasso = ms / passos;
  console.log(`  ${String(N).padStart(3)} partidas: ${porPasso.toFixed(4)} ms por passo (${(porPasso / 16.67 * 100).toFixed(2)}% do orçamento de 16,7 ms) → ~${Math.floor(16.67 / porPasso)} partidas por núcleo`);
}

console.log('\nREDE · o tamanho do quadro que sai a 20/s');
for (const n of [1, 2, 4]){
  const { p, quadro } = (() => { const r = criaPartida(n); for (let t = 0; t < 600; t++) r.p.passo(); return r; })();
  const bytes = Buffer.byteLength(quadro());
  const porJogador = bytes * 20 / 1024;
  console.log(`  ${n}v${n}: ${bytes} B/quadro · ${porJogador.toFixed(1)} KB/s por jogador · ${(porJogador * n * 2).toFixed(1)} KB/s por partida cheia`);
}
console.log('\nLeitura: a simulação a 60 Hz custa centésimos de milissegundo por partida — o gargalo de escala é a saída de\nrede (KB/s por jogador), não o processador. A frequência de 60 Hz fica mantida (é a do jogo, preserva o controle).');
