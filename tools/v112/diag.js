/* =====================================================================================================================
   RACHA v112 · O MEDIDOR DA PARTIDA (tools/v112/diag.js — o build cola depois do tools/v112/tela.js).

   O que dá para acompanhar, na partida (online e treino) — Ajustes › Visual › Medidor da partida liga a caixinha na tela;
   window.RachaDiag.estado() devolve os mesmos números (os testes e as medidas usam):
     · a tela: os quadros desenhados por segundo, as quedas (o quadro que demorou mais que 1,5 quadro da tela) e as travadas
       (mais de 50 ms), o tempo de processamento de cada quadro (o JavaScript do quadro: a física, a rede e o desenho);
     · a rede: o ping (o pong do servidor, a cada 3 s), a variação (o jitter: quanto a chegada de cada quadro do servidor
       foge do ritmo dele, como no RTP), os quadros do servidor que não vieram (o passo pulou) e os apagões (mais de 150 ms
       sem nada — é assim que a perda de pacote aparece no WebSocket: o TCP reenvia e tudo chega junto depois);
     · os comandos: quanto o seu comando leva do aparelho até voltar confirmado no quadro do servidor (na sua tela ele já
       vale no mesmo quadro: a previsão);
     · as correções: cada vez que o quadro do servidor desmente a previsão (a sua tampinha, a bola, os outros), o tamanho da
       diferença (a divergência cliente × servidor no mesmo passo), quantas passaram de 2 px por minuto, os pulos (a
       correção grande demais para deslizar) e os recomeços (a saída depois do gol: o pulo de verdade, sem deslize).
   Tudo em vetores fixos (nada novo a cada quadro); a caixinha só é escrita duas vezes por segundo, e só com ela ligada.
   ===================================================================================================================== */
const V112D = {
  on: false, el: null, pintaT: 0, chave: null,
  // a tela
  qi: new Float32Array(600), qj: new Float32Array(600), qk: 0, qn: 0, ultDesenho: 0, desenhou: false,
  quedas: 0, travadas: 0, desenhos: 0,
  // o servidor
  si: new Float32Array(300), sk: 0, sn: 0, ultSnap: 0, ultTick: -1, jitter: 0, passoMin: 0, passoN: 0,
  recebidos: 0, pulados: 0, apagoes: 0, maiorBuraco: 0,
  // os comandos
  env: new Float64Array(1024), ri: new Float32Array(300), rk: 0, rn: 0, ultAck: 0,
  // as correções (o tamanho de cada uma, em px do campo)
  cP: new Float32Array(300), cB: new Float32Array(300), cJ: new Float32Array(600), kP: 0, kB: 0, kJ: 0, nP: 0, nB: 0, nJ: 0,
  vis: { P: 0, B: 0, J: 0 },
  zeroT: performance.now(), base96: null, base108: 0
};
const V112D_ORD = new Float32Array(600);
function v112DPct(buf, n, p) {                            // o percentil p (0..1) dos n primeiros (cópia ordenada, sem criar vetor)
  if (!n) return null;
  const o = V112D_ORD.subarray(0, n); o.set(buf.subarray(0, n)); o.sort();
  return o[Math.min(n - 1, Math.floor(p * n))];
}
function v112DMedia(buf, n) { if (!n) return null; let s = 0; for (let i = 0; i < n; i++) s += buf[i]; return s / n; }

/* ---------------------------------------------------------------- a tela: os quadros desenhados */
if (typeof render === 'function') {
  const renderAntes112d = render;
  render = function () { V112D.desenhou = true; return renderAntes112d.apply(this, arguments); };
}
if (typeof frame === 'function') {
  const frameAntes112d = frame;
  frame = function () {
    const t0 = performance.now(); V112D.desenhou = false;
    try { return frameAntes112d.apply(this, arguments); }
    finally { if (V112D.desenhou) v112DQuadro(t0, performance.now()); }
  };
}
function v112DQuadro(t0, t1) {
  const D = V112D, k = D.qk;
  if (D.ultDesenho > 0) {
    const iv = t0 - D.ultDesenho;
    if (iv > 0 && iv < 1000) {
      D.qi[k] = iv; D.qj[k] = t1 - t0; D.qk = (k + 1) % D.qi.length; if (D.qn < D.qi.length) D.qn++;
      const tela = (typeof FPS === 'object' && FPS.tela > 3) ? FPS.tela : 1000 / 60;
      if (iv > 1.5 * Math.max(tela, (typeof FPS === 'object' && FPS.alvo > 0) ? 1000 / FPS.alvo : 0)) D.quedas++;
      if (iv > 50) D.travadas++;
      D.desenhos++;
    }
  }
  D.ultDesenho = t0;
}

/* ---------------------------------------------------------------- a rede: os quadros do servidor e os comandos */
if (typeof net49Send === 'function') {
  const net49SendAntes112d = net49Send;
  net49Send = function (m) {
    if (m && m.type === 'input' && m.seq > 0) V112D.env[m.seq & 1023] = performance.now();
    return net49SendAntes112d.apply(this, arguments);
  };
}
if (typeof net49Snapshot === 'function') {
  const net49SnapshotAntes112d = net49Snapshot;
  net49Snapshot = function (s) {
    const agora = performance.now();
    const r = net49SnapshotAntes112d.apply(this, arguments);
    try { v112DSnap(s, agora); } catch (_) {}
    return r;
  };
}
function v112DSnap(s, agora) {
  const D = V112D; if (!s || !Number.isFinite(s.tick)) return;
  D.recebidos++;
  if (D.ultTick >= 0 && s.tick > D.ultTick && D.ultSnap > 0) {
    const gap = s.tick - D.ultTick, iv = agora - D.ultSnap;
    // o passo dos quadros (1 = os 60 por segundo; 2 = os 30): o menor visto nos últimos 120
    if (!D.passoMin || gap < D.passoMin || D.passoN > 120) { D.passoMin = gap; D.passoN = 0; } else D.passoN++;
    if (gap > D.passoMin) D.pulados += Math.round((gap - D.passoMin) / D.passoMin);
    const esperado = gap * 1000 / 60;
    D.jitter += (Math.abs(iv - esperado) - D.jitter) / 16;           // (como o jitter do RTP, RFC 3550)
    D.si[D.sk] = iv; D.sk = (D.sk + 1) % D.si.length; if (D.sn < D.si.length) D.sn++;
    if (iv > 150) D.apagoes++;
    if (iv > D.maiorBuraco) D.maiorBuraco = iv;
  } else if (D.ultTick >= 0 && s.tick < D.ultTick - 600) { D.passoMin = 0; }   // (outra partida)
  D.ultTick = s.tick; D.ultSnap = agora;
  // o comando confirmado mais novo: do envio até voltar no quadro do servidor
  const eu = typeof NET49 === 'object' && NET49.localSlot >= 0 && s.players ? s.players[NET49.localSlot] : null;
  const ack = eu ? eu[4] | 0 : 0;
  if (ack > D.ultAck) {
    const t0 = D.env[ack & 1023];
    if (t0 > 0 && agora - t0 < 5000 && typeof NET49 === 'object' && NET49.seq - ack < 1000) {
      D.ri[D.rk] = agora - t0; D.rk = (D.rk + 1) % D.ri.length; if (D.rn < D.ri.length) D.rn++;
    }
    D.ultAck = ack;
  } else if (ack < D.ultAck - 1000) D.ultAck = ack;                 // (outra partida: o seq recomeçou)
}

/* ---------------------------------------------------------------- as correções (o deslize da v96: cada uma passa por ele) */
if (window.RachaLiso && typeof window.RachaLiso.soma === 'function') {
  try {
    const somaAntes112d = window.RachaLiso.soma;
    window.RachaLiso.soma = function (d, dx, dy) {
      try { v112DCorr(d, dx, dy); } catch (_) {}
      return somaAntes112d.apply(this, arguments);
    };
  } catch (_) {}
}
function v112DCorr(d, dx, dy) {
  if (!Number.isFinite(dx) || !Number.isFinite(dy) || typeof V96R !== 'object') return;
  const D = V112D, n = Math.hypot(dx, dy);
  if (d === V96R.P) { D.cP[D.kP] = n; D.kP = (D.kP + 1) % D.cP.length; if (D.nP < D.cP.length) D.nP++; if (n > 2) D.vis.P++; }
  else if (d === V96R.B) { D.cB[D.kB] = n; D.kB = (D.kB + 1) % D.cB.length; if (D.nB < D.cB.length) D.nB++; if (n > 2) D.vis.B++; }
  else { D.cJ[D.kJ] = n; D.kJ = (D.kJ + 1) % D.cJ.length; if (D.nJ < D.cJ.length) D.nJ++; if (n > 2) D.vis.J++; }
}
function v112DMedidas96() { try { return typeof V96R === 'object' ? V96R.medidas : null; } catch (_) { return null; } }

/* ---------------------------------------------------------------- os números */
function v112DEstado() {
  const D = V112D, agora = performance.now(), min = Math.max(1 / 60, (agora - D.zeroT) / 60000);
  const r1 = v => v == null ? null : Math.round(v * 10) / 10;
  const ivMed = v112DMedia(D.qi, D.qn), m96 = v112DMedidas96(), b96 = D.base96 || {};
  const d96 = k => m96 ? (m96[k] | 0) - (b96[k] | 0) : 0;
  let pulos108 = 0; try { pulos108 = (window.RachaLento108Jogo ? window.RachaLento108Jogo.estado().pulos | 0 : 0) - D.base108; } catch (_) {}
  return {
    tela: {
      fps: ivMed ? r1(1000 / ivMed) : null, hz: (typeof FPS === 'object' && FPS.tela > 3) ? Math.round(1000 / FPS.tela) : null,
      quadro_p50_ms: r1(v112DPct(D.qi, D.qn, 0.5)), quadro_p95_ms: r1(v112DPct(D.qi, D.qn, 0.95)),
      js_p50_ms: r1(v112DPct(D.qj, D.qn, 0.5)), js_p95_ms: r1(v112DPct(D.qj, D.qn, 0.95)), js_max_ms: r1(D.qn ? Math.max.apply(null, D.qj.subarray(0, D.qn)) : null),
      quedas: D.quedas, quedas_min: r1(D.quedas / min), travadas: D.travadas, travadas_min: r1(D.travadas / min), quadros: D.desenhos
    },
    rede: {
      online: typeof NET49 === 'object' && !!NET49.playing,
      ping_ms: typeof NET49 === 'object' && NET49.ping ? Math.round(NET49.ping) : null,
      jitter_ms: D.sn ? r1(D.jitter) : null,
      quadros_s: D.sn ? r1(1000 / v112DMedia(D.si, D.sn)) : null,
      chegada_p95_ms: r1(v112DPct(D.si, D.sn, 0.95)), maior_buraco_ms: Math.round(D.maiorBuraco),
      recebidos: D.recebidos, pulados: D.pulados, apagoes: D.apagoes,
      resposta_p50_ms: r1(v112DPct(D.ri, D.rn, 0.5)), resposta_p95_ms: r1(v112DPct(D.ri, D.rn, 0.95))
    },
    correcoes: {
      eu_p95_px: r1(v112DPct(D.cP, D.nP, 0.95)), eu_max_px: r1(D.nP ? Math.max.apply(null, D.cP.subarray(0, D.nP)) : null),
      bola_p95_px: r1(v112DPct(D.cB, D.nB, 0.95)), bola_max_px: r1(D.nB ? Math.max.apply(null, D.cB.subarray(0, D.nB)) : null),
      outros_p95_px: r1(v112DPct(D.cJ, D.nJ, 0.95)), outros_max_px: r1(D.nJ ? Math.max.apply(null, D.cJ.subarray(0, D.nJ)) : null),
      visiveis_min: { eu: r1(D.vis.P / min), bola: r1(D.vis.B / min), outros: r1(D.vis.J / min),
        cada_outro: r1(D.vis.J / min / Math.max(1, ((typeof RQ === 'object' && RQ.jog) ? RQ.jog.length : 2) - 1)) },
      pulos: { eu: d96('pulosP'), bola: d96('pulosB'), outros: d96('pulosJ'), somados: pulos108 },
      recomecos: d96('recomecos'), quadros_servidor: d96('snaps')
    },
    minutos: r1(min),
    tela112: window.RachaTela112 ? window.RachaTela112.estado() : null
  };
}
function v112DZera() {
  const D = V112D;
  D.qk = D.qn = 0; D.ultDesenho = 0; D.quedas = D.travadas = D.desenhos = 0;
  D.sk = D.sn = 0; D.jitter = 0; D.recebidos = D.pulados = D.apagoes = 0; D.maiorBuraco = 0;
  D.rk = D.rn = 0;
  D.kP = D.kB = D.kJ = D.nP = D.nB = D.nJ = 0; D.vis.P = D.vis.B = D.vis.J = 0;
  const m = v112DMedidas96(); D.base96 = m ? Object.assign({}, m) : null;
  try { D.base108 = window.RachaLento108Jogo ? window.RachaLento108Jogo.estado().pulos | 0 : 0; } catch (_) { D.base108 = 0; }
  D.zeroT = performance.now();
}

/* ---------------------------------------------------------------- a caixinha na tela (Ajustes › Visual) */
const V112D_CHAVE = 'racha-medidor112';
function v112DCaixa() {
  if (V112D.el) return V112D.el;
  const st = document.createElement('style');
  st.textContent = '.v112-medidor{position:fixed;left:calc(env(safe-area-inset-left, 0px) + 8px);top:calc(env(safe-area-inset-top, 0px) + 70px);z-index:41;' +
    'max-width:calc(100vw - 16px);overflow:hidden;padding:4px 8px;border:2px solid #05060c;border-radius:9px;background:rgba(11,16,54,.8);color:#dfe5ff;' +
    'font:700 10.5px/1.3 "Barlow Condensed","Roboto Condensed","Arial Narrow",system-ui,sans-serif;letter-spacing:.2px;white-space:pre;pointer-events:none}' +
    '.v112-medidor[hidden]{display:none!important}';
  document.head.appendChild(st);
  const el = document.createElement('div'); el.className = 'v112-medidor'; el.setAttribute('aria-hidden', 'true'); el.hidden = true;
  (document.getElementById('wrap') || document.body).appendChild(el);
  return (V112D.el = el);
}
function v112DTexto() {
  const e = v112DEstado(), t = e.tela, r = e.rede, c = e.correcoes;
  const n = (v, d) => v == null ? '—' : (d ? (Math.round(v * 10) / 10).toFixed(1).replace('.', ',') : String(Math.round(v)));
  const linhas = [
    'FPS ' + n(t.fps) + (t.hz ? ' · tela ' + t.hz + ' Hz' : '') + ' · quedas ' + n(t.quedas_min) + '/min · travadas ' + t.travadas,
    'Quadro ' + n(t.js_p50_ms, 1) + ' ms (95%: ' + n(t.js_p95_ms, 1) + ') · intervalo 95%: ' + n(t.quadro_p95_ms, 1) + ' ms'
  ];
  if (r.online) {
    linhas.push('Ping ' + n(r.ping_ms) + ' ms · variação ' + n(r.jitter_ms, 1) + ' ms · ' + n(r.quadros_s) + ' quadros/s');
    linhas.push('Apagões ' + r.apagoes + ' (maior espera ' + r.maior_buraco_ms + ' ms) · passos sem quadro ' + r.pulados);
    linhas.push('Comando confirmado em ' + n(r.resposta_p50_ms) + ' ms (95%: ' + n(r.resposta_p95_ms) + ')');
    linhas.push('Correções > 2 px por min: você ' + n(c.visiveis_min.eu) + ' · bola ' + n(c.visiveis_min.bola) + ' · cada outro ' + n(c.visiveis_min.cada_outro));
    linhas.push('Pulos ' + (c.pulos.eu + c.pulos.bola + c.pulos.outros) + ' · recomeços ' + c.recomecos + ' · diferença 95%: você ' + n(c.eu_p95_px, 1) + ' · bola ' + n(c.bola_p95_px, 1) + ' · outros ' + n(c.outros_p95_px) + ' px');
  }
  return linhas.join('\n');
}
function v112DPinta() {
  const el = v112DCaixa();
  const quer = V112D.on && !(typeof lobby === 'object' && lobby.aberto);
  el.hidden = !quer;
  if (!quer) return;
  const s = v112DTexto();
  if (el.textContent !== s) el.textContent = s;
}
function v112DLiga(on, guarda) {
  V112D.on = !!on;
  if (guarda !== false) { try { localStorage.setItem(V112D_CHAVE, on ? '1' : '0'); } catch (_) {} }
  if (V112D.on) v112DZera();
  try { v112DPinta(); } catch (_) {}
  try { if (V112D.chave) ligado(V112D.chave, V112D.on); } catch (_) {}
}
try { V112D.on = localStorage.getItem(V112D_CHAVE) === '1'; } catch (_) {}
setInterval(() => { if (V112D.on || (V112D.el && !V112D.el.hidden)) { try { v112DPinta(); } catch (_) {} } }, 500);   // (duas vezes por segundo, só ligada)
(function v112DAjustes() {                                  // Ajustes › Visual: a chave (depois da Tela cheia / da seta)
  try {
    if (typeof AJX !== 'object' || !AJX.secs || !AJX.secs.visual || typeof ajxChave !== 'function') return;
    const lin = ajxChave('aj-medidor112', 'Medidor da partida', 'FPS, ping, variação, perda e as correções da rede, num cantinho da tela');
    const b = lin.querySelector('button'); V112D.chave = b;
    try { ligado(b, V112D.on); } catch (_) {}
    b.addEventListener('click', () => { try { som.clique(); } catch (_) {} v112DLiga(b.getAttribute('aria-pressed') !== 'true'); });
    AJX.secs.visual.appendChild(lin);
  } catch (e) { console.error('v112 medidor (ajustes)', e); }
})();
if (typeof net49Begin === 'function') {                     // a partida online nova começa as contas do zero
  const net49BeginAntes112d = net49Begin;
  net49Begin = function () { const r = net49BeginAntes112d.apply(this, arguments); try { v112DZera(); } catch (_) {} return r; };
}
window.RachaDiag = { estado: v112DEstado, zera: v112DZera, liga: on => v112DLiga(on, false), texto: v112DTexto };
