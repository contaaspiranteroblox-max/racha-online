'use strict';
/* RACHA v94 · a tabela "o motor de antes × o motor próprio × o que os vídeos mostram" (docs/v94/COMPARACAO.md).
   Uso: node tools/v94/compara.js <medidas_atual.json> <medidas_novo.json> [> docs/v94/COMPARACAO.md]
   (as medidas saem de: node tests/v94/cenarios.js atual --json A.json · node tests/v94/cenarios.js novo --json N.json)
   Os números observados vêm de docs/v94/OBSERVACOES_VIDEOS.md (com a confiança de lá); "—" = os vídeos não mostram. */
const fs = require('fs');
const [fa, fn] = process.argv.slice(2);
if (!fa || !fn) { console.error('uso: node tools/v94/compara.js atual.json novo.json'); process.exit(2); }
const A = JSON.parse(fs.readFileSync(fa, 'utf8')).medidas, N = JSON.parse(fs.readFileSync(fn, 'utf8')).medidas;
const v = (o, p) => p.split('.').reduce((x, k) => (x == null ? x : x[k]), o);
const f = (x, c = 2) => x == null ? '—' : typeof x === 'boolean' ? (x ? 'sim' : 'não') : typeof x === 'number' ? x.toFixed(c).replace('.', ',') : String(x);
const ms = x => x == null ? '—' : Math.round(x * 1000) + ' ms';
// [o quê, caminho, formato, observado, confiança]
const L = [
  ['Velocidade máxima da tampinha (d/s)', 'arrancada.vmax_d_s', f, '3,5–3,9 (O3)', 'média'],
  ['Arrancada: 90% da máxima', 'arrancada.t90_s', ms, '≤ 33–67 ms (O4)', 'média'],
  ['Parada: da máxima até parar', 'frenagem.t_parar_s', ms, '≤ 67 ms (O4)', 'média'],
  ['Distância da parada (d)', 'frenagem.dist_parar_d', f, '—', ''],
  ['Inversão: até 90% do outro lado', 'inversao.t90_s', ms, 'a mais rápida ≈ 67 ms (O5)', 'baixa'],
  ['Virada de 90°: direção a 10°', 'virada90.t_direcao10_s', ms, '—', ''],
  ['Analógico: meia inclinação ÷ toda', 'analogico.meia_0_5', f, '—', ''],
  ['PASSE parado: velocidade de saída (d/s)', 'passe_parado.v0_d_s', f, '≈ 6,1 (O6, um caso)', 'baixa'],
  ['CHUTE parado: velocidade de saída (d/s)', 'chute_parado.v0_d_s', f, '9,4–10,2 (O6)', 'média'],
  ['A bola rolando: fator por segundo', 'chute_parado.fator_por_s', f, '≈ 0,55 (O7)', 'média-baixa'],
  ['CHUTE parado: até parar (d)', 'chute_parado.dist_d', f, '—', ''],
  ['CHUTE parado: tempo até parar', 'chute_parado.t_parar_s', x => x == null ? '—' : f(x, 1) + ' s', '—', ''],
  ['CHUTE correndo (d/s)', 'chute_correndo.v_d_s', f, '—', ''],
  ['CHUTE na bola vindo a 3 d/s (d/s)', 'chute_bola_vindo_3.v_d_s', f, '—', ''],
  ['CHUTE na bola indo a 3 d/s (d/s)', 'chute_bola_indo_3.v_d_s', f, '—', ''],
  ['Alcance: centro a centro (d)', 'alcance.centro_a_centro_d', f, '—', ''],
  ['Alcance além do contato (d)', 'alcance.folga_alem_do_contato_d', f, 'o anel desenhado: 1,25–1,32 d (O2, é desenho)', ''],
  ['Raio da bola ÷ raio da tampinha', 'alcance.raio_bola_sobre_tampinha', f, '0,47–0,50 (O1)', 'alta'],
  ['Lateral a 90°, 8 d/s: quique', 'rebote_parede_90_8.e_normal', f, '—', ''],
  ['Lateral a 45°, 8 d/s: o que fica de lado', 'rebote_parede_45_8.retem_tangente', f, '—', ''],
  ['Trave a 8 d/s: quique', 'rebote_trave_8.e_normal', f, '—', ''],
  ['Condução: vão mediano (d)', 'conducao.vao_mediano_d', f, '≈ 0,55 (24 quadros: pouco para concluir)', 'baixa'],
  ['Condução: toques em 1,5 s', 'conducao.toques_em_1_5s', x => f(x, 0), '—', ''],
  ['Disputa de frente: a bola andou (d)', 'disputa.bola_deslocou_d', f, '—', ''],
  ['PASSE → CHUTE, bola parada, no passo seguinte', 'combo_parada.k1.chutes', f, '—', ''],
  ['PASSE → CHUTE, bola parada, 2 passos depois', 'combo_parada.k2.chutes', f, '—', ''],
  ['PASSE → CHUTE, bola vindo, 2 passos depois', 'combo_vindo_3.k2.chutes', f, '—', ''],
  ['PASSE → CHUTE, bola vindo, 3 passos depois', 'combo_vindo_3.k3.chutes', f, '—', ''],
  ['Segurando o CHUTE até a bola chegar: chutes', 'segurando_chega.chutes', x => f(x, 0), '—', ''],
  ['Toque 100 ms antes de a bola chegar vale?', 'toque_antecipado.antes_100ms', f, '—', ''],
  ['Toque 150 ms antes vale?', 'toque_antecipado.antes_150ms', f, '—', ''],
  ['Chutes em 1 s apertando sem parar', 'intervalo_chutes.chutes_em_1s', x => f(x, 0), '—', ''],
  ['Menor intervalo entre chutes', 'intervalo_chutes.menor_intervalo_s', ms, '—', ''],
];
const out = [];
out.push('| medida | o motor de antes | o motor próprio | o que os vídeos mostram | confiança |');
out.push('|---|---|---|---|---|');
for (const [t, p, fmt, obs, conf] of L) out.push('| ' + t + ' | ' + fmt(v(A, p)) + ' | ' + fmt(v(N, p)) + ' | ' + obs + ' | ' + conf + ' |');
console.log(out.join('\n'));
