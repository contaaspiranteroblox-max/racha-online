// RACHA v92 · um lance roteirizado da física do aparelho (o treino contra bots), para comparar a v92 com a v91 tique a tique.
// Avaliado dentro do jogo (window.__RT), depois do tests/harness.js. Devolve a posição de todo mundo a cada 15 passos.
(function(){
  // v95: os campos ficaram 30% maiores — o lance roda no 2v2 de antes (as medidas da v91; o bloco da física é o mesmo), para
  // comparar a FÍSICA tique a tique com o gravado na v91; no fim, as medidas de agora voltam
  const M = typeof MODOS !== 'undefined' ? MODOS[1] : null, K = typeof MARCAS_MODO !== 'undefined' ? MARCAS_MODO[1] : null;
  const m0 = M && JSON.stringify(M), k0 = K && JSON.stringify(K);
  if (M) Object.assign(M, {jog:[86, 60], bola:[71, 50], gol:[6.6, 16], pressao:[21.3, 50], penalti:[31.7, 31.7]});
  if (K) Object.assign(K, {area:[16.667, 33.333], pequena:[10, 23.333], penalti:13, circulo:10, saida:10, meiaLua:[10.8, 8.333]});
  try {
  const T = __T; T.comeca('futebol', 2, 0);
  T.limpa();
  let s = 12345;
  const rnd = () => { s = (s*1103515245 + 12345) & 0x7fffffff; return s/0x7fffffff; };
  const out = [];
  const J = RQ.jog;
  T.poe(P, CX - U(14), CY + U(3)); T.bola(CX - U(9), CY + U(2), 0, 0);
  for (let i = 0; i < 900; i++){
    // o humano: corre em direções que mudam, chuta às vezes (P.chutar: o caminho dos testes, sem os botões da tela)
    const a = Math.floor(i/37)*1.3 + (i % 37 < 18 ? 0 : .4);
    P.mx = i % 97 < 80 ? Math.cos(a) : 0; P.my = i % 97 < 80 ? Math.sin(a) : 0;
    if (i % 53 === 20) P.chutar = FORCA_POWER; else if (i % 41 === 7) P.chutar = FORCA_KICK;
    // os bots: vão na bola, com um desvio sorteado (sempre o mesmo sorteio)
    for (const q of J){ if (q === P) continue; const dx = B.x - q.x + (rnd() - .5)*60, dy = B.y - q.y + (rnd() - .5)*60, d = Math.hypot(dx, dy) || 1; q.mx = dx/d; q.my = dy/d; if (rnd() < .02) q.chutar = rnd() < .5 ? FORCA_KICK : FORCA_POWER; }
    guardaAnterior(); physicsStep(STEP, 0, 0);
    if (RQ.estado === 'gol'){ RQ.estado = 'jogo'; T.bola(CX, CY, 0, 0); }
    if (i % 15 === 14) out.push([i, +P.x.toFixed(6), +P.y.toFixed(6), +B.x.toFixed(6), +B.y.toFixed(6), +B.vx.toFixed(6), +B.vy.toFixed(6), ...J.filter(q => q !== P).map(q => [+q.x.toFixed(6), +q.y.toFixed(6)]).flat()]);
  }
  return out;
  } finally { if (M) Object.assign(M, JSON.parse(m0)); if (K) Object.assign(K, JSON.parse(k0)); }
})()
