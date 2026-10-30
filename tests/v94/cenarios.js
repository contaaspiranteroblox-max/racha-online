'use strict';
/* RACHA v94 · OS CENÁRIOS DE MEDIDA — reproduzíveis, sem navegador: cada um cria um mundo novo pelo adaptador do motor
   (tests/v94/adaptador_*.js), comanda a tampinha passo a passo e mede. Régua comum: d = o diâmetro da tampinha, s = segundo.
   Uso: node tests/v94/cenarios.js [atual|novo] [--json saida.json]
   As medidas não são aprovadas nem reprovadas aqui (isso é dos testes de cada etapa): este arquivo só mede. */
const path = require('path');

function cenarios(A0) {
  const novo = o => A0.criar(o);
  const R = {};
  const vel = q => Math.hypot(q.vx, q.vy);
  const roda = (A, n, f) => { const ev = []; for (let k = 0; k < n; k++) { if (f) f(k); for (const e of A.passo()) ev.push(Object.assign({ k }, e)); } return ev; };
  const dt = novo().dt;
  const T = s => Math.round(s / dt);

  // 1) a arrancada: parado, o analógico todo para a direita
  {
    const A = novo(); A.poeJog(0, -10, 0); A.entrada(0, { mx: 1, my: 0 });
    const vs = []; for (let k = 0; k < T(1); k++) { A.passo(); vs.push(A.jog(0).vx); }
    const vmax = Math.max(...vs), t = f => { const i = vs.findIndex(v => v >= f * vmax); return i < 0 ? null : (i + 1) * dt; };
    let x05 = null; { const B = novo(); B.poeJog(0, -10, 0); B.entrada(0, { mx: 1, my: 0 }); roda(B, T(0.5)); x05 = B.jog(0).x + 10; }
    R.arrancada = { vmax_d_s: vmax, t50_s: t(0.5), t90_s: t(0.9), t99_s: t(0.99), dist_05s_d: x05 };
  }
  // 2) a frenagem: na velocidade máxima, solta
  {
    const A = novo(); A.poeJog(0, -15, 0); A.entrada(0, { mx: 1, my: 0 }); roda(A, T(1));
    const x0 = A.jog(0).x, v0 = A.jog(0).vx; A.entrada(0, { mx: 0, my: 0 });
    let k = 0; while (k < T(2) && vel(A.jog(0)) > 0.01 * v0) { A.passo(); k++; }
    R.frenagem = { v0_d_s: v0, t_parar_s: k * dt, dist_parar_d: A.jog(0).x - x0 };
  }
  // 3) a inversão: correndo para a direita, o analógico todo para a esquerda
  {
    const A = novo(); A.poeJog(0, -10, 0); A.entrada(0, { mx: 1, my: 0 }); roda(A, T(1));
    const x0 = A.jog(0).x, v0 = A.jog(0).vx; A.entrada(0, { mx: -1, my: 0 });
    let tz = null, t90 = null, xm = x0;
    for (let k = 1; k <= T(1); k++) { A.passo(); const q = A.jog(0); xm = Math.max(xm, q.x); if (tz == null && q.vx <= 0) tz = k * dt; if (t90 == null && q.vx <= -0.9 * v0) t90 = k * dt; }
    R.inversao = { t_zero_s: tz, t90_s: t90, deslize_d: xm - x0 };
  }
  // 4) a virada de 90°: correndo para a direita, o analógico todo para cima
  {
    const A = novo(); A.poeJog(0, -10, 5); A.entrada(0, { mx: 1, my: 0 }); roda(A, T(1));
    const p0 = A.jog(0); A.entrada(0, { mx: 0, my: -1 });
    let t10 = null, avanco = 0;
    for (let k = 1; k <= T(1); k++) { A.passo(); const q = A.jog(0); const ang = Math.atan2(-q.vy, q.vx) * 180 / Math.PI; if (t10 == null && Math.abs(90 - ang) <= 10 && vel(q) > 0) t10 = k * dt; avanco = Math.max(avanco, q.x - p0.x); }
    R.virada90 = { t_direcao10_s: t10, avanco_lateral_d: avanco };
  }
  // 5) a diagonal e o analógico pela metade
  {
    const med = (mx, my) => { const A = novo(); A.poeJog(0, -10, 0); A.entrada(0, { mx, my }); roda(A, T(1)); return vel(A.jog(0)); };
    const v1 = med(1, 0);
    R.analogico = { diagonal_sobre_reta: med(Math.SQRT1_2, Math.SQRT1_2) / v1, meia_0_5: med(0.5, 0) / v1, pouco_0_15: med(0.15, 0) / v1, quase_nada_0_02: med(0.02, 0) / v1 };
  }
  // chute com a bola parada encostada (a superfície a 0,02 d): toque de 1 passo
  const chuteParado = (botao, opc) => {
    const A = novo(opc); const c = A.campo();
    A.poeJog(0, -6, 0); A.poeBola(-6 + c.rJog + c.rBola + 0.02, 0);
    const e = {}; e[botao] = true; A.entrada(0, e); const ev = roda(A, 1); A.entrada(0, {});
    const b0 = A.bola(), v0 = vel(b0), x0 = b0.x;
    let k = 0, pico = v0; while (k < T(8) && vel(A.bola()) > 0.02) { A.passo(); k++; pico = Math.max(pico, vel(A.bola())); }
    const B = novo(opc); B.poeJog(0, -6, 0); B.poeBola(-6 + c.rJog + c.rBola + 0.02, 0); B.entrada(0, e); roda(B, 1); B.entrada(0, {});
    roda(B, T(1)); const v1s = vel(B.bola());
    return { chutou: ev.some(x => x.tipo === 'chute'), v0_d_s: v0, v_1s_d_s: v1s, fator_por_s: v0 ? v1s / v0 : null, dist_d: A.bola().x - x0, t_parar_s: k * dt };
  };
  R.passe_parado = chuteParado('passe', { tamanho: 4 });
  R.chute_parado = chuteParado('chute', { tamanho: 4 });
  // o chute correndo: a tampinha a toda velocidade, a bola parada na frente; toque quando entra no alcance
  {
    const A = novo({ tamanho: 4 }); const c = A.campo();
    A.poeJog(0, -12, 0); A.poeBola(-6, 0); A.entrada(0, { mx: 1, my: 0 }); roda(A, T(0.3));
    let ev = []; for (let k = 0; k < T(2) && !ev.length; k++) { const q = A.jog(0), b = A.bola(); const dist = Math.hypot(b.x - q.x, b.y - q.y); A.entrada(0, { mx: 1, my: 0, chute: dist <= c.alcance }); ev = A.passo().filter(x => x.tipo === 'chute'); }
    R.chute_correndo = { chutou: !!ev.length, v_d_s: vel(A.bola()), v_jog_d_s: A.jog(0).vx };
  }
  // a bola vindo e indo (3 d/s), chute de 1 toque quando encosta
  const chuteMovel = (vb) => {
    const A = novo({ tamanho: 4 }); const c = A.campo();
    A.poeJog(0, -6, 0); A.poeBola(-6 + c.rJog + c.rBola + 0.02, 0, vb, 0); A.entrada(0, { chute: true }); const ev = roda(A, 1); A.entrada(0, {});
    return { chutou: ev.some(x => x.tipo === 'chute'), v_d_s: vel(A.bola()) };
  };
  R.chute_bola_vindo_3 = chuteMovel(-3); R.chute_bola_indo_3 = chuteMovel(3);
  // o alcance: a maior distância entre os centros em que o toque ainda chuta
  {
    let maior = null;
    for (let g = 0; g <= 1.0; g += 0.005) {
      const A = novo(); const c = A.campo(); A.poeJog(0, -6, 0); A.poeBola(-6 + c.rJog + c.rBola + g, 0);
      A.entrada(0, { chute: true }); const ev = roda(A, 1);
      if (ev.some(x => x.tipo === 'chute')) maior = c.rJog + c.rBola + g; else if (maior != null) break;
    }
    const c = novo().campo();
    R.alcance = { centro_a_centro_d: maior, folga_alem_do_contato_d: maior == null ? null : maior - c.rJog - c.rBola, raio_bola_sobre_tampinha: c.rBola / c.rJog };
  }
  // a direção do chute com a bola de lado (30° e 60° fora da linha do analógico)
  {
    const dir = ang => {
      const A = novo(); const c = A.campo(), r = c.rJog + c.rBola + 0.02, a = ang * Math.PI / 180;
      A.poeJog(0, -6, 0); A.poeBola(-6 + r * Math.cos(a), r * Math.sin(a)); A.entrada(0, { mx: 1, my: 0, chute: true }); roda(A, 1);
      const b = A.bola(); return Math.atan2(b.vy, b.vx) * 180 / Math.PI;
    };
    R.direcao_chute = { bola_a_30_graus: dir(30), bola_a_60_graus: dir(60) };
  }
  // o rebote na linha lateral (a 90° e a 45°) e na trave
  const rebote = (angulo, vel0) => {
    const A = novo({ tamanho: 4 }); const c = A.campo(), a = angulo * Math.PI / 180;
    const y0 = c.linhaY - c.rBola - 1.0;
    A.poeBola(0, y0, vel0 * Math.cos(a), vel0 * Math.sin(a));
    let antes = null, depois = null;
    for (let k = 0; k < T(1); k++) { const b0 = A.bola(); A.passo(); const b1 = A.bola(); if (antes == null && b1.vy < 0 && b0.vy > 0) { antes = b0; depois = b1; break; } }
    if (!antes) return null;
    return { e_normal: -depois.vy / antes.vy, retem_tangente: antes.vx ? depois.vx / antes.vx : null };
  };
  R.rebote_parede_90_8 = rebote(90, 8); R.rebote_parede_45_8 = rebote(45, 8); R.rebote_parede_90_3 = rebote(90, 3);
  {
    const A = novo({ tamanho: 4 }); const c = A.campo(), t = c.traves[2];   // uma trave da direita
    A.poeBola(t[0] - c.trave - c.rBola - 1.0, t[1], 8, 0);
    let antes = null, depois = null;
    for (let k = 0; k < T(1); k++) { const b0 = A.bola(); A.passo(); const b1 = A.bola(); if (b0.vx > 0 && b1.vx < 0) { antes = b0; depois = b1; break; } }
    R.rebote_trave_8 = antes ? { e_normal: -depois.vx / antes.vx } : null;
  }
  // a condução: a bola encostada na frente, o analógico todo para a frente por 2 s
  {
    const A = novo({ tamanho: 4 }); const c = A.campo();
    A.poeJog(0, -12, 0); A.poeBola(-12 + c.rJog + c.rBola + 0.01, 0); A.entrada(0, { mx: 1, my: 0 });
    const vaos = []; let toques = 0, perto = true;
    for (let k = 0; k < T(2); k++) {
      A.passo(); const q = A.jog(0), b = A.bola(); const vao = Math.hypot(b.x - q.x, b.y - q.y) - c.rJog - c.rBola; vaos.push(vao);
      const enc = vao < 0.01; if (enc && !perto) toques++; perto = enc;
    }
    const v = vaos.slice(T(0.5)); v.sort((a, b) => a - b);
    R.conducao = { vao_mediano_d: v[Math.floor(v.length / 2)], vao_max_d: v[v.length - 1], toques_em_1_5s: toques, bola_sobre_jog: A.bola().vx / A.jog(0).vx };
  }
  // a disputa: dois empurrando a bola um contra o outro por 1 s
  {
    const A = novo({ tamanho: 4, jogadores: 2 }); const c = A.campo(), s = c.rJog + c.rBola + 0.01;
    A.poeBola(0, 0); A.poeJog(0, -s, 0); A.poeJog(1, s, 0); A.entrada(0, { mx: 1, my: 0 }); A.entrada(1, { mx: -1, my: 0 });
    roda(A, T(1));
    R.disputa = { bola_deslocou_d: Math.hypot(A.bola().x, A.bola().y), jogadores_d: [A.jog(0).x, A.jog(1).x] };
  }
  // PASSE e depois CHUTE (o DB): k passos depois, com a bola parada e com ela vindo a 3 d/s
  const combo = (k, vb) => {
    const A = novo({ tamanho: 4 }); const c = A.campo();
    A.poeJog(0, -6, 0); A.poeBola(-6 + c.rJog + c.rBola + 0.02, 0, vb || 0, 0);
    const ev = [];
    for (let t = 0; t <= Math.max(k, 0) + 1; t++) {
      A.entrada(0, { passe: t === 0, chute: t === k });
      for (const e of A.passo()) ev.push(Object.assign({ t }, e));
    }
    return { chutes: ev.filter(e => e.tipo === 'chute').map(e => e.forca + '@' + e.t).join(' '), v_d_s: vel(A.bola()) };
  };
  R.combo_parada = {}; R.combo_vindo_3 = {};
  for (const k of [0, 1, 2, 3, 5]) { R.combo_parada['k' + k] = combo(k, 0); R.combo_vindo_3['k' + k] = combo(k, -3); }
  // segurando o CHUTE chegando na bola: chuta quando entra no alcance
  {
    const A = novo({ tamanho: 4 }); A.poeJog(0, -12, 0); A.poeBola(-8, 0); A.entrada(0, { mx: 1, my: 0, chute: true });
    const ev = roda(A, T(1.5)).filter(e => e.tipo === 'chute');
    R.segurando_chega = { chutes: ev.length, primeiro_s: ev.length ? (ev[0].k + 1) * dt : null };
  }
  // o toque antes de chegar: o CHUTE tocado t antes de a bola entrar no alcance
  {
    const c = novo().campo(); const out = {};
    for (const ms of [0, 33, 67, 100, 150, 200]) {
      const A = novo({ tamanho: 4 }); A.poeJog(0, -12, 0); A.poeBola(-8, 0); A.entrada(0, { mx: 1, my: 0 });
      // quando entra no alcance (sem tocar) — de outro mundo igual
      const B = novo({ tamanho: 4 }); B.poeJog(0, -12, 0); B.poeBola(-8, 0); B.entrada(0, { mx: 1, my: 0 });
      let kAl = null; for (let k = 0; k < T(1.5); k++) { const q = B.jog(0), b = B.bola(); if (Math.hypot(b.x - q.x, b.y - q.y) <= c.alcance) { kAl = k; break; } B.passo(); }
      const kT = Math.max(0, kAl - Math.round(ms / 1000 / dt));
      let chutou = false;
      for (let k = 0; k < kAl + T(0.4); k++) { A.entrada(0, { mx: 1, my: 0, chute: k === kT }); if (A.passo().some(e => e.tipo === 'chute')) { chutou = true; break; } }
      out['antes_' + ms + 'ms'] = chutou;
    }
    R.toque_antecipado = out;
  }
  // o intervalo entre chutes: segurando e tocando de novo com a bola sempre no alcance
  {
    const A = novo({ tamanho: 4 }); const c = A.campo(); A.poeJog(0, -6, 0);
    const ks = [];
    for (let k = 0; k < T(1); k++) { A.poeBola(-6 + c.rJog + c.rBola + 0.02, 0); A.entrada(0, { chute: k % 2 === 0 }); if (A.passo().some(e => e.tipo === 'chute')) ks.push(k); }
    const gaps = ks.slice(1).map((v, i) => v - ks[i]);
    R.intervalo_chutes = { chutes_em_1s: ks.length, menor_intervalo_s: gaps.length ? Math.min(...gaps) * dt : null };
  }
  return R;
}

if (require.main === module) {
  const qual = process.argv[2] || 'atual';
  const A0 = require(path.join(__dirname, 'adaptador_' + qual + '.js'));
  const R = cenarios(A0);
  const j = process.argv.indexOf('--json');
  if (j > 0) require('fs').writeFileSync(process.argv[j + 1], JSON.stringify({ motor: qual, medidas: R }, null, 1));
  const fmt = v => typeof v === 'number' ? (Math.abs(v) >= 100 ? v.toFixed(0) : Math.abs(v) >= 10 ? v.toFixed(1) : v.toFixed(3)) : JSON.stringify(v);
  console.log('RACHA v94 · cenários de medida · motor: ' + qual + ' (d = diâmetro da tampinha, s = segundos)');
  for (const k in R) {
    const v = R[k];
    if (v && typeof v === 'object') console.log('  ' + k.padEnd(22) + Object.entries(v).map(([a, b]) => a + '=' + (b && typeof b === 'object' ? JSON.stringify(b) : fmt(b))).join('  '));
    else console.log('  ' + k.padEnd(22) + fmt(v));
  }
}
module.exports = { cenarios };
