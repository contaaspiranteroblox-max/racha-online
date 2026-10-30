/* =====================================================================================================================
   RACHA v92 · OFICINA — AS FERRAMENTAS A MAIS DO EDITOR (tools/oficina/ferramentas.js)
   · LANÇAR A BOLA (B): arraste na tela para onde a bola vai (quanto mais longe, mais forte, até a força do CHUTE). Antes
     de soltar, a linha pontilhada mostra o caminho com as batidas; solta, a bola corre de verdade no motor do mapa (o MESMO
     da partida: paredes, curvas, obstáculos, zonas, portais, portões, botões, a lógica, os objetos que andam e os gols).
     Só a bola: as vagas ficam vazias e as regras de fim (tempo, meta) não contam. Mudou o mapa, a bola de teste some.
   · COPIAR PARA O OUTRO LADO: a cópia espelhada da seleção do outro lado do campo (x → −x) com os times trocados (A ⇄ B):
     o gol, o spawn, a zona e o botão do time A viram do B (e as cores dos times trocam junto).
   · REPETIR: cópias da seleção em fila (o passo em x e em y) ou em círculo (em volta do centro do campo, girando junto).
   · AS MEDIDAS: o comprimento, o tamanho, o raio, o ângulo e a posição enquanto desenha, mexe, gira ou estica uma peça.
   · AS GUIAS: ao mover (com o ímã ligado), a peça encaixa no meio do campo, no alinhamento de outra peça e no lugar
     espelhado dela (as linhas aparecem e o celular dá um toque).
   · A VIBRAÇÃO (a mesma chave do jogo: Ajustes › Vibração): ao criar, apagar, pegar uma alça, encaixar, chutar e no gol.
   ===================================================================================================================== */
/* ---------------------------------------------------------------- a vibração e os números */
function tremeu(ms) {
  try { if (navigator.vibrate && !(typeof CONTA !== 'undefined' && CONTA && CONTA.vibrar === false)) navigator.vibrate(ms); } catch (_) {}
}
const nU = v => { const r = Math.round(v * 10) / 10; return String(r === 0 ? 0 : r).replace('.', ','); };   // (uma casa, com vírgula)
const nG = v => Math.round(((v % 360) + 360) % 360) % 360 + '°';

/* ---------------------------------------------------------------- LANÇAR A BOLA */
const MIRA_MAX = 190;                                 // px da tela: arrastar isso (ou mais) = a força toda do CHUTE
const LANCA_MAX_S = 12, LANCA_PARADA = 0.35, PREVIA_PASSOS = 360;   // (a prévia: até 6 s de caminho)
function simNova() {                                   // a partida do mapa sem ninguém (todas as vagas vazias): só a bola e o mapa
  const M = OFE.M, G = OFE.G; if (!M || !G || !G.C) return null;
  const mm = Object.assign({}, M, { __G: G, partida: Object.assign({}, M.partida, { vitoria: 'gols', tempo: 0, meta: 0, prorrogacao: 0 }) });
  const P = RM.novaPartida(mm, { jogadores: Array.from({ length: RM.LIM.totalJog }, () => ({ vazio: true })), seed: 7 });
  P.estado = 'jogo';
  return P;
}
function miraVel(A) {                                  // a direção e a força da mira (px/s do mundo); k = a fração da força do CHUTE
  const G = OFE.G; if (!G || !G.C) return { vx: 0, vy: 0, v: 0, k: 0 };
  const C = G.C, dx = A.w1[0] - A.w0[0], dy = A.w1[1] - A.w0[1], d = Math.hypot(dx, dy);
  if (d * OFE.cam.z < 10) return { vx: 0, vy: 0, v: 0, k: 0 };
  const k = clamp(d * OFE.cam.z / MIRA_MAX, 0, 1), vChute = U(C.FORCA_POWER * ((C.EXTRA && C.EXTRA.massaChute) || 1) / C.MASSA_BOLA);
  const v = Math.min(C.LIMITE_VEL_BOLA, vChute * k);
  return { vx: dx / d * v, vy: dy / d * v, v, k };
}
function poeBola(P, x, y, vx, vy) {
  const G = OFE.G, R = P.C.R_BOLA, B = P.B;
  B.x = clamp(x, G.GL + R, G.GR - R); B.y = clamp(y, G.GT + R, G.GB - R); B.vx = vx; B.vy = vy; B.w = 0;
}
const FIM_LANCE = { fora: 1, lateral: 1, reinicio: 1 };   // (a bola volta para outro lugar: o lance acabou ali)
const virou = (vx0, vy0, vx1, vy1) => { const a = Math.hypot(vx0, vy0), b = Math.hypot(vx1, vy1); return a > U(3) && b > U(0.5) && vx0 * vx1 + vy0 * vy1 < 0.82 * a * b; };
function miraPrevia(A) {                               // o caminho da bola, rodado no motor antes de soltar (até 6 s)
  const chave = A.w0.join(',') + '|' + A.w1.join(',') + '|' + OFE.rev + '|' + OFE.cam.z, agora = performance.now();
  if (A.pv && A.pv.k === chave) return A.pv;
  if (A.pv && agora - A.pv.t0 < 30) { OFE.sujo = true; return A.pv; }   // (no máximo ~30 vezes por segundo: no celular fraco o dedo não engasga; o quadro seguinte refaz)
  const v = miraVel(A), out = { k: chave, t0: agora, pts: [], batidas: [], fim: null };
  const P = v.v > 0 ? simNova() : null;
  if (P) {
    const B = P.B, evs = []; P.onEvento = e => evs.push(e);
    poeBola(P, A.w0[0], A.w0[1], v.vx, v.vy); out.pts.push([B.x, B.y]);
    for (let i = 0; i < PREVIA_PASSOS; i++) {
      const vx0 = B.vx, vy0 = B.vy;
      try { P.passo(null); } catch (e) { console.error('Oficina (prévia da bola):', e); break; }
      const fe = evs.find(e => e.t === 'gol' || e.t === 'semgol' || FIM_LANCE[e.t]);
      if (fe && FIM_LANCE[fe.t]) { const u = out.pts.filter(Boolean).pop(); out.fim = { t: fe.t, x: u[0], y: u[1], ev: fe }; break; }
      if (evs.some(e => e.t === 'portal')) out.pts.push(null);
      out.pts.push([B.x, B.y]);
      if (virou(vx0, vy0, B.vx, B.vy)) out.batidas.push([B.x, B.y]);
      if (fe) { out.fim = { t: fe.t, x: B.x, y: B.y, ev: fe }; break; }
      evs.length = 0;
      if (Math.hypot(B.vx, B.vy) < U(LANCA_PARADA)) break;
    }
  }
  A.pv = out; return out;
}
function lancaPara() { if (OFE.lanca) { OFE.lanca = null; OFE.sujo = true; } }
function lancaBola(x, y, vx, vy) {                     // a bola de teste correndo de verdade (x, y, vx, vy em px do mundo)
  const P = simNova(); if (!P) return null;
  poeBola(P, x, y, vx, vy);
  const L = OFE.lanca = { P, rev: OFE.rev, trilha: [[P.B.x, P.B.y]], aneis: [], ev: [], t: 0, acc: 0, ult: 0, parada: 0, acabou: 0, golT: -1, batidaT: -1, msg: '', sub: '', msgCor: '#ffffff', msgT0: 0, batidas: 0 };
  P.onEvento = e => L.ev.push(e);
  OFE.sujo = true;
  return L;
}
function lancaSolta(A) {                               // (o fim do arraste com a ferramenta da bola)
  const v = miraVel(A);
  if (!v.v) { aviso('Arraste para onde a bola vai: quanto mais longe, mais forte. A linha mostra o caminho.'); OFE.sujo = true; return; }
  if (lancaBola(A.w0[0], A.w0[1], v.vx, v.vy)) { tremeu(v.k > 0.7 ? 28 : 14); try { som.chute(v.k > 0.7); } catch (_) {} }
}
function lancaMsg(L, msg, sub, cor) { L.msg = msg; L.sub = sub || ''; L.msgCor = cor || '#ffffff'; L.msgT0 = performance.now(); }
function lancaEvento(L, e) {
  const M = OFE.M;
  if (e.t === 'gol' || e.t === 'semgol') {
    if (L.golT >= 0) return;
    L.golT = L.t;
    const o = e.gol ? porId(e.gol) : null, dono = o && o.tipo === 'gol' ? o.dono : -1;
    if (e.zona) lancaMsg(L, '+' + (e.pts || 1), e.time >= 0 && M.partida.times[e.time] ? 'ponto para o ' + M.partida.times[e.time].nome : 'zona de pontos', e.time >= 0 ? corTime(M, e.time) : '#ffd23f');
    else lancaMsg(L, 'GOL!', dono >= 0 && M.partida.times[dono] ? 'entrou no gol do ' + M.partida.times[dono].nome : 'entrou no gol', dono >= 0 ? corTime(M, dono) : '#ffd23f');
    tremeu([40, 60, 40]); try { som.gol(); } catch (_) {}
    return;
  }
  if (FIM_LANCE[e.t]) { lancaMsg(L, e.t === 'fora' ? 'FORA!' : e.t === 'lateral' ? 'LATERAL' : 'REINÍCIO', e.t === 'reinicio' ? 'a bola caiu numa zona de reinício' : 'a bola saiu do campo'); L.acabou = 1e-6; return; }
  if (e.t === 'portal' || e.t === 'botao') tremeu(8);
}
function lancaPasso(agora) {                           // (uma vez por quadro, no laço do editor)
  const L = OFE.lanca; if (!L) return;
  if (L.rev !== OFE.rev || !OFE.G) { OFE.lanca = null; OFE.sujo = true; return; }   // (o mapa mudou: a bola de teste some)
  const dt = L.ult ? Math.min(0.1, Math.max(0, (agora - L.ult) / 1000)) : 1 / 60; L.ult = agora;
  OFE.sujo = true;
  if (L.acabou) { L.acabou += dt; if (L.acabou > 2.4) OFE.lanca = null; return; }
  const P = L.P, B = P.B, TPS = RM.TPS;
  L.acc += dt;
  for (let n = 0; L.acc >= 1 / TPS && n < 6 && !L.acabou; n++) {
    L.acc -= 1 / TPS;
    const vx0 = B.vx, vy0 = B.vy;
    try { P.passo(null); } catch (e) { console.error('Oficina (bola de teste):', e); OFE.lanca = null; return; }
    L.t += 1 / TPS;
    const evs = L.ev.splice(0);
    if (evs.some(e => FIM_LANCE[e.t])) { for (const e of evs) lancaEvento(L, e); break; }   // (a bola foi recolocada: não entra na trilha)
    if (evs.some(e => e.t === 'portal')) L.trilha.push(null);
    L.trilha.push([B.x, B.y]); if (L.trilha.length > 900) L.trilha.splice(0, L.trilha.length - 900);
    if (virou(vx0, vy0, B.vx, B.vy)) { L.batidas++; L.aneis.push({ x: B.x, y: B.y, t0: performance.now() }); if (L.t - L.batidaT > 0.09) { tremeu(6); L.batidaT = L.t; } }
    for (const e of evs) lancaEvento(L, e);
    if (Math.hypot(B.vx, B.vy) < U(LANCA_PARADA)) L.parada += 1 / TPS; else L.parada = 0;
    const depoisGol = L.golT >= 0 && (L.t - L.golT > 0.9 || P.estado !== 'gol');
    if (depoisGol || L.parada > 0.5 || L.t > LANCA_MAX_S || P.estado === 'fim' || P.encerrado) L.acabou = 1e-6;
  }
  if (L.aneis.length > 40) L.aneis.splice(0, L.aneis.length - 40);
}
function desenhaLanca(g, z) {                          // a bola de teste, a trilha e os anéis das batidas (no mundo)
  const L = OFE.lanca; if (!L) return;
  const P = L.P, B = P.B, R = P.C.R_BOLA, a = L.acabou ? clamp(1 - (L.acabou - 1.4), 0, 1) : 1, agora = performance.now();
  g.save(); g.lineCap = 'round'; g.lineJoin = 'round'; g.globalAlpha = .5 * a; g.strokeStyle = '#ffffff'; g.lineWidth = Math.max(R * .45, 2 / z);
  g.beginPath(); let novo = true;
  for (const p of L.trilha) { if (!p) { novo = true; continue; } if (novo) { g.moveTo(p[0], p[1]); novo = false; } else g.lineTo(p[0], p[1]); }
  g.stroke(); g.restore();
  for (const r of L.aneis) {
    const k = (agora - r.t0) / 450; if (k < 0 || k > 1) continue;
    g.save(); g.globalAlpha = (1 - k) * .9 * a; g.strokeStyle = '#ffffff'; g.lineWidth = 3 / z; g.beginPath(); g.arc(r.x, r.y, R * (1.2 + k * 2.4), 0, TAU); g.stroke(); g.restore();
  }
  g.save(); g.globalAlpha = a; DES.bola(g, B.x, B.y, R, OFE.M); g.restore();
}
function desenhaMira(g, A, z) {                        // a mira: o caminho previsto (pontos), as batidas, a seta e a bola no começo
  const G = OFE.G; if (!G || !G.C) return;
  const R = G.C.R_BOLA, v = miraVel(A), pv = miraPrevia(A);
  if (v.v) {
    const esp = U(1.15), tot = pv.pts.length;
    let acc = 0, ant = null;
    g.save(); g.fillStyle = '#ffffff';
    pv.pts.forEach((p, i) => {
      if (!p) { ant = null; return; }
      if (ant) acc += Math.hypot(p[0] - ant[0], p[1] - ant[1]);
      if (!ant || acc >= esp) { acc = 0; g.globalAlpha = .95 - .6 * i / Math.max(1, tot); g.beginPath(); g.arc(p[0], p[1], Math.max(R * .26, 2.2 / z), 0, TAU); g.fill(); }
      ant = p;
    });
    g.restore();
    g.save(); g.strokeStyle = '#ffffff'; g.lineWidth = 2.5 / z;
    for (const b of pv.batidas) { g.globalAlpha = .9; g.beginPath(); g.arc(b[0], b[1], R * 1.15, 0, TAU); g.stroke(); }
    if (pv.fim) {
      const gol = pv.fim.t === 'gol' || pv.fim.t === 'semgol', o = gol && pv.fim.ev.gol ? porId(pv.fim.ev.gol) : null;
      const cor = gol ? (o && o.dono >= 0 ? corTime(OFE.M, o.dono) : '#ffd23f') : '#ff3b3b';
      g.globalAlpha = 1; g.strokeStyle = cor; g.lineWidth = 4 / z; g.beginPath(); g.arc(pv.fim.x, pv.fim.y, R * 1.6, 0, TAU); g.stroke();
      g.font = '400 ' + Math.max(14 / z, R * 1.6) + 'px "Lilita One","Anton",Impact,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'bottom'; g.lineJoin = 'round';
      const t = gol ? (pv.fim.ev.zona ? '+' + (pv.fim.ev.pts || 1) : 'GOL') : pv.fim.t === 'reinicio' ? 'REINÍCIO' : pv.fim.t === 'lateral' ? 'LATERAL' : 'FORA', ty = pv.fim.y - R * 2;
      g.lineWidth = 5 / z; g.strokeStyle = '#05060c'; g.strokeText(t, pv.fim.x, ty); g.fillStyle = cor; g.fillText(t, pv.fim.x, ty);
    }
    g.restore();
    // a seta da mira (do começo até o dedo), mais grossa quanto mais forte
    const [x0, y0] = A.w0, ang = Math.atan2(A.w1[1] - y0, A.w1[0] - x0), L = Math.hypot(A.w1[0] - x0, A.w1[1] - y0), cab = Math.min(L * .4, 16 / z);
    g.save(); g.strokeStyle = '#ffd21f'; g.fillStyle = '#ffd21f'; g.lineCap = 'round'; g.lineWidth = (2.5 + 3 * v.k) / z;
    g.beginPath(); g.moveTo(x0, y0); g.lineTo(A.w1[0] - Math.cos(ang) * cab * .6, A.w1[1] - Math.sin(ang) * cab * .6); g.stroke();
    g.beginPath(); g.moveTo(A.w1[0], A.w1[1]); g.lineTo(A.w1[0] - Math.cos(ang - .45) * cab, A.w1[1] - Math.sin(ang - .45) * cab); g.lineTo(A.w1[0] - Math.cos(ang + .45) * cab, A.w1[1] - Math.sin(ang + .45) * cab); g.closePath(); g.fill();
    g.globalAlpha = .9; g.lineWidth = 4 / z; g.beginPath(); g.arc(x0, y0, R + 7 / z, -Math.PI / 2, -Math.PI / 2 + TAU * v.k); g.stroke();   // (o anel da força)
    g.restore();
  }
  DES.bola(g, A.w0[0], A.w0[1], R, OFE.M);
}
function desenhaAvisoLanca(g) {                        // o GOL!, o FORA!… e a mensagem da lógica (na tela)
  const L = OFE.lanca; if (!L) return;
  const larg = Math.max(120, OFE.w - painelCobre());
  if (L.P.mensagem && L.P.mensagem.texto) {
    g.save(); g.font = '700 17px "Barlow Condensed","Barlow",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    const t = L.P.mensagem.texto, w = g.measureText(t).width + 28;
    g.fillStyle = 'rgba(5,6,12,.82)'; g.beginPath(); if (g.roundRect) g.roundRect(larg / 2 - w / 2, 14, w, 32, 16); else g.rect(larg / 2 - w / 2, 14, w, 32); g.fill();
    g.fillStyle = L.P.mensagem.cor || '#ffffff'; g.fillText(t, larg / 2, 31); g.restore();
  }
  if (!L.msg) return;
  const k = (performance.now() - L.msgT0) / 1000; if (k > 2.3) return;
  const a = k < .15 ? k / .15 : k > 1.8 ? Math.max(0, (2.3 - k) / .5) : 1, esc = k < .15 ? .6 + .4 * k / .15 : 1;
  g.save(); g.globalAlpha = a; g.translate(larg / 2, OFE.h * .3); g.scale(esc, esc); g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
  g.font = '400 56px "Lilita One","Anton",Impact,sans-serif'; g.lineWidth = 10; g.strokeStyle = '#05060c'; g.strokeText(L.msg, 0, 0); g.fillStyle = L.msgCor; g.fillText(L.msg, 0, 0);
  if (L.sub) { g.font = '700 19px "Barlow Condensed","Barlow",sans-serif'; g.lineWidth = 6; g.strokeText(L.sub, 0, 42); g.fillStyle = '#ffffff'; g.fillText(L.sub, 0, 42); }
  g.restore();
}

/* ---------------------------------------------------------------- AS MEDIDAS (enquanto o dedo mexe) */
function medidaTexto(A) {
  if (!A || !OFE.M || !OFE.G) return '';
  if (A.tipo === 'mira') { const v = miraVel(A); return v.v ? Math.round(v.k * 100) + '% do chute · ' + nU(v.v / RN.PX_POR_U) + ' u/s' : ''; }
  if (A.tipo === 'cria') {
    const [x0, y0] = mundoParaU(A.w0[0], A.w0[1]), [x1, y1] = mundoParaU(A.w1[0], A.w1[1]);
    const a = [enc(x0), enc(y0)], b = [enc(x1), enc(y1)], dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy);
    if (d < 0.8) return '';
    switch (OFE.ferr) {
      case 'parede': return nU(d) + ' u · ' + nG(Math.atan2(dy, dx) / RAD);
      case 'arco': return 'raio ' + nU(d) + ' u';
      case 'circ': return 'Ø ' + nU(d * 2) + ' u';
      default: return nU(Math.abs(dx)) + ' × ' + nU(Math.abs(dy)) + ' u';
    }
  }
  if (A.tipo === 'move' && A.mexeu && A.orig && A.orig.length) {
    const o = porId(A.orig[0].id); if (!o) return '';
    const Gd = A.guia, onde = !Gd ? '' : Gd.tx === 'espelho' ? ' · espelhado' : [Gd.x != null ? (Gd.tx === 'centro' ? 'no meio' : 'alinhado') : '', Gd.y != null ? (Gd.ty === 'centro' ? 'no meio' : 'alinhado') : ''].filter(Boolean).map(t => ' · ' + t).filter((t, i, l) => l.indexOf(t) === i).join('');
    if (A.orig.length > 1) return A.orig.length + ' peças · Δ ' + nU(o.x - A.orig[0].x) + ', ' + nU(o.y - A.orig[0].y) + ' u' + onde;
    return 'x ' + nU(o.x) + ' · y ' + nU(o.y) + onde;
  }
  if (A.tipo === 'alca' && A.mexeu) {
    if (A.a.tipo === 'girarG') return 'giro ' + nG(A.dg || 0);
    const o = porId(A.id); if (!o) return '';
    switch (A.a.tipo) {
      case 'girar': return nG(o.rot);
      case 'ponta': return nU(o.comp) + ' u · ' + nG(o.rot);
      case 'raio': case 'raioP': return 'raio ' + nU(o.raio) + ' u';
      case 'abertura': return 'abertura ' + Math.round(o.abertura) + '°';
      case 'raioC': return 'Ø ' + nU(o.w) + ' u';
      case 'canto': return nU(o.w) + ' × ' + nU(o.h) + ' u';
      case 'largura': return 'largura ' + nU(o.largura) + ' u';
      case 'prof': return 'fundo ' + nU(o.prof) + ' u';
      case 'tam': return 'tamanho ' + nU(o.tam);
      case 'vert': { const p = o.pontos && o.pontos[A.a.k]; return p ? 'ponto ' + (A.a.k + 1) + ' · ' + nU(p[0]) + ', ' + nU(p[1]) : ''; }
    }
  }
  return '';
}
function desenhaMedida(g) {                            // a etiqueta perto do dedo (em cima dele no toque; do lado no mouse)
  const A = OFE.arr, t = medidaTexto(A); if (!t) return;
  const p = A.ult || [A.sx, A.sy]; if (!p || p[0] == null) return;
  g.save(); g.font = '700 15px "Barlow Condensed","Barlow",sans-serif';
  const w = g.measureText(t).width + 20, hh = 28, larg = Math.max(120, OFE.w - painelCobre());
  const x = clamp(p[0] + (A.toque ? -w / 2 : 18), 6, Math.max(6, larg - w - 6)), y = clamp(p[1] + (A.toque ? -86 : -42), 6, Math.max(6, OFE.h - hh - 6));
  g.fillStyle = 'rgba(5,6,12,.88)'; g.strokeStyle = '#ffd21f'; g.lineWidth = 2;
  g.beginPath(); if (g.roundRect) g.roundRect(x, y, w, hh, 14); else g.rect(x, y, w, hh); g.fill(); g.stroke();
  g.fillStyle = '#ffffff'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(t, x + 10, y + hh / 2 + 1);
  g.restore();
}

/* ---------------------------------------------------------------- AS GUIAS (o meio do campo, o alinhamento e o lugar espelhado) */
function guiasDoMove(A, ddx, ddy) {                    // devolve [ddx, ddy, encaixou em x, encaixou em y] e deixa A.guia para o desenho
  A.guia = null;
  if (!OFE.encaixa || !A.orig || !A.orig.length) return [ddx, ddy, false, false];
  const n = A.orig.length, mx = A.orig.reduce((s, p) => s + p.x, 0) / n, my = A.orig.reduce((s, p) => s + p.y, 0) / n;
  const nx = mx + ddx, ny = my + ddy, lim = 9 / (OFE.cam.z * RN.PX_POR_U);
  const ids = new Set(A.orig.map(p => p.id)), cm = camadasDoMapa(OFE.M);
  const bx = { d: lim, v: null, tipo: '' }, by = { d: lim, v: null, tipo: '' };
  const tenta = (b, v, alvo, tipo) => { const d = Math.abs(v - alvo); if (d < b.d) { b.d = d; b.v = alvo; b.tipo = tipo; } };
  tenta(bx, nx, 0, 'centro'); tenta(by, ny, 0, 'centro');
  let esp = null, de = lim * 1.4;
  for (const o of OFE.M.objetos) {
    if (ids.has(o.id) || o.oculto || cm.vis.get(o.camada) === false) continue;
    tenta(bx, nx, o.x, 'alinha'); tenta(by, ny, o.y, 'alinha');
    if (Math.abs(o.x) > 0.3) { const d = Math.hypot(nx + o.x, ny - o.y); if (d < de) { de = d; esp = o; } }
  }
  let gx = bx.v, gy = by.v, tx = bx.tipo, ty = by.tipo;
  if (esp) { gx = -esp.x; gy = esp.y; tx = ty = 'espelho'; }
  if (gx == null && gy == null) return [ddx, ddy, false, false];
  A.guia = { x: gx, y: gy, tx, ty, esp };
  return [gx != null ? gx - mx : ddx, gy != null ? gy - my : ddy, gx != null, gy != null];
}
function desenhaGuias(g, A, z) {
  const Gd = A && A.guia, G = OFE.G; if (!Gd || !G) return;
  const x0 = OFE.cam.x - OFE.w / 2 / z, x1 = OFE.cam.x + OFE.w / 2 / z, y0 = OFE.cam.y - OFE.h / 2 / z, y1 = OFE.cam.y + OFE.h / 2 / z;
  g.save(); g.strokeStyle = '#ff3df2'; g.fillStyle = '#ff3df2'; g.lineWidth = 1.6 / z; g.setLineDash([7 / z, 5 / z]);
  if (Gd.tx === 'espelho' && Gd.esp) {
    const a = uParaMundo(Gd.x, Gd.y), b = uParaMundo(Gd.esp.x, Gd.esp.y), m = uParaMundo(0, Gd.y), r = 7 / z;
    g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
    g.globalAlpha = .55; g.setLineDash([3 / z, 5 / z]); g.beginPath(); g.moveTo(G.CX, y0); g.lineTo(G.CX, y1); g.stroke();
    g.globalAlpha = 1; g.setLineDash([]); g.beginPath(); g.moveTo(m[0], m[1] - r); g.lineTo(m[0] + r, m[1]); g.lineTo(m[0], m[1] + r); g.lineTo(m[0] - r, m[1]); g.closePath(); g.fill();
  } else {
    if (Gd.x != null) { const wx = G.CX + U(Gd.x); g.beginPath(); g.moveTo(wx, y0); g.lineTo(wx, y1); g.stroke(); }
    if (Gd.y != null) { const wy = G.CY + U(Gd.y); g.beginPath(); g.moveTo(x0, wy); g.lineTo(x1, wy); g.stroke(); }
  }
  g.restore();
}

/* ---------------------------------------------------------------- as cópias (o outro lado e o repetir) */
const espelhaMov = m => { if (!m) return; if (m.tipo === 'vaivem') m.dx = -m.dx; else if (m.tipo === 'circular') m.fase = arred((((0.5 - (m.fase || 0)) % 1) + 1) % 1, 1000); else if (m.tipo === 'girar') m.fase = arred((1 - (m.fase || 0)) % 1, 1000); };
function espelhaObjX(o, cx) {                          // vira a peça na horizontal em volta da linha vertical x = cx (u)
  o.x = arred(2 * cx - o.x);
  const temPts = o.pontos && (o.tipo === 'linha' || o.forma === 'poligono');
  if (temPts) { o.pontos = o.pontos.map(p => [-p[0], p[1]]); o.rot = (360 - o.rot) % 360; }
  else o.rot = SIM_Y[o.tipo] ? (540 - o.rot) % 360 : (360 - o.rot) % 360;
  if (o.dir != null) o.dir = (540 - o.dir) % 360;
  espelhaMov(o.mov);
}
function cabeNoMapa(lista, vezes) {                    // as cópias cabem nos limites do mapa? (avisa o que estoura)
  const M = OFE.M, L = RM.LIM, conta = f => M.objetos.filter(f).length + lista.filter(f).length * vezes;
  const testes = [[() => true, L.objetos, 'objetos'], [o => o.tipo === 'gol', L.gols, 'gols'], [o => o.tipo === 'portal', L.portais, 'portais'],
    [o => o.tipo === 'zona', L.zonas, 'zonas'], [o => o.tipo === 'spawn', L.spawns, 'pontos de nascimento'], [o => !!o.mov, L.moveis, 'peças que se movem']];
  for (const [f, max, nome] of testes) if (conta(f) > max) { aviso('Não cabe: o mapa passaria de ' + max + ' ' + nome + '.', 'erro'); return false; }
  return true;
}
function copiasEm(M, lista, vezes, faz) {              // (dentro do muda) as cópias com ids novos, os grupos novos e os pares dos portais entre elas
  const novos = [];
  for (let k = 1; k <= vezes; k++) {
    const ids = new Map(), grupos = new Map(), daVez = [];
    for (const o of lista) {
      const c = JSON.parse(JSON.stringify(o)); c.id = novoId(c.tipo); ids.set(o.id, c.id);
      if (c.grupo) { if (!grupos.has(c.grupo)) grupos.set(c.grupo, ('g' + Date.now().toString(36).slice(-4) + k.toString(36) + grupos.size).slice(0, 16)); c.grupo = grupos.get(c.grupo); }
      c.bloqueado = false; c.oculto = false;
      faz(c, o, k);
      M.objetos.push(c); daVez.push(c); novos.push(c.id);
    }
    for (const c of daVez) if (c.tipo === 'portal' && c.par) c.par = ids.get(c.par) || '';
  }
  return novos;
}
function copiaOutroLado() {
  const l = selObjs().filter(o => o.tipo !== 'spawnBola');
  if (!l.length) return aviso('Selecione o que vai para o outro lado.');
  const vai = l.filter(o => Math.abs(o.x) >= 0.05), meio = l.length - vai.length;
  if (!vai.length) return aviso('Essas peças estão no meio do campo: já valem para os dois lados (para virar, use o ESPELHAR).');
  if (!cabeNoMapa(vai, 1)) return;
  const M = OFE.M, E = M.partida.equipes, T = M.partida.times;
  const troca = t => E >= 2 && (t === 0 || t === 1) ? 1 - t : t;
  const pares = E >= 2 ? [[T[0].cor, T[1].cor], [RM.CORES_EQUIPE[0], RM.CORES_EQUIPE[1]]] : [];
  const trocaCor = c => { const k = String(c || '').toLowerCase(); for (const [a, b] of pares) { if (k === String(a).toLowerCase()) return b; if (k === String(b).toLowerCase()) return a; } return c; };
  let novos = [];
  muda(M2 => {
    novos = copiasEm(M2, vai, 1, c => {
      espelhaObjX(c, 0);
      if (c.tipo === 'gol' && c.dono >= 0) c.dono = troca(c.dono);
      if ((c.tipo === 'zona' || c.tipo === 'botao' || c.tipo === 'interruptor' || c.tipo === 'spawn') && c.equipe >= 0) c.equipe = troca(c.equipe);
      c.cor = trocaCor(c.cor); if (c.cor2) c.cor2 = trocaCor(c.cor2);
    });
  });
  OFE.sel = new Set(novos.filter(id => OFE.M.objetos.some(o => o.id === id))); edEstado(); painelAtualiza(); OFE.sujo = true; tremeu(14);
  aviso(novos.length + (novos.length > 1 ? ' peças copiadas' : ' peça copiada') + ' para o outro lado' + (E >= 2 ? ' (time A ⇄ B)' : '') + (meio ? ' · ' + meio + ' do meio ficou como estava' : '') + '. Desfazer volta.');
  return novos;
}
function repeteSel(modo, op) {                         // modo 'fila' {n, dx, dy} · 'circulo' {n (no total), raio, gira} — devolve os ids novos
  const l = selObjs().filter(o => o.tipo !== 'spawnBola'); if (!l.length) { aviso('Selecione o que vai ser repetido.'); return null; }
  op = op || {};
  if (modo !== 'circulo') {
    const n = clamp(Math.round(op.n || 1), 1, 40), dx = +op.dx || 0, dy = +op.dy || 0;
    if (Math.hypot(dx, dy) < 0.05) { aviso('O passo não pode ser zero: as cópias ficariam uma em cima da outra.', 'erro'); return null; }
    if (!cabeNoMapa(l, n)) return null;
    let novos = [];
    muda(M => { novos = copiasEm(M, l, n, (c, o, k) => { c.x = arred(o.x + dx * k); c.y = arred(o.y + dy * k); }); });
    return novos;
  }
  const n = clamp(Math.round(op.n || 2), 2, 36), mx = l.reduce((s, o) => s + o.x, 0) / l.length, my = l.reduce((s, o) => s + o.y, 0) / l.length;
  const d0 = Math.hypot(mx, my), R = op.raio > 0 ? +op.raio : d0 > 0.5 ? d0 : 10, a0 = d0 > 0.5 ? Math.atan2(my, mx) : 0, gira = op.gira !== false;
  const ox = Math.cos(a0) * R - mx, oy = Math.sin(a0) * R - my;   // (a seleção vai para o raio pedido, no mesmo ângulo)
  if (!cabeNoMapa(l, n - 1)) return null;
  let novos = [];
  const ids = l.map(o => o.id);
  muda(M => {
    for (const id of ids) { const o = M.objetos.find(x => x.id === id); if (o) { o.x = arred(o.x + ox); o.y = arred(o.y + oy); } }
    const base = ids.map(id => M.objetos.find(x => x.id === id)).filter(Boolean);
    novos = copiasEm(M, base, n - 1, (c, o, k) => {
      const th = k * TAU / n, cs = Math.cos(th), sn = Math.sin(th);
      c.x = arred(o.x * cs - o.y * sn); c.y = arred(o.x * sn + o.y * cs);
      if (gira) {
        c.rot = arred((((o.rot + th / RAD) % 360) + 360) % 360, 10);
        if (c.dir != null) c.dir = arred((((o.dir + th / RAD) % 360) + 360) % 360, 10);
        if (c.mov && c.mov.tipo === 'vaivem') { const dx = c.mov.dx, dy = c.mov.dy; c.mov.dx = arred(dx * cs - dy * sn); c.mov.dy = arred(dx * sn + dy * cs); }
      }
    });
  });
  return novos;
}
async function repeteDialogo() {
  const l = selObjs().filter(o => o.tipo !== 'spawnBola'); if (!l.length) return aviso('Selecione o que vai ser repetido.');
  const b = caixaSel(), [x0] = mundoParaU(b[0], b[1]), [x1] = mundoParaU(b[2], b[3]);
  const cx = l.reduce((s, o) => s + o.x, 0) / l.length, cy = l.reduce((s, o) => s + o.y, 0) / l.length, d0 = Math.hypot(cx, cy);
  const st = { modo: 'fila', n: 3, dx: arred(Math.max(1, x1 - x0) + 2, 10), dy: 0, nc: 8, raio: arred(d0 > 0.5 ? d0 : 10, 10), gira: true };
  const ok = await janela('Repetir', c => {
    const fila = h('div.ofi-rep'), circ = h('div.ofi-rep', { hidden: true });
    poe(fila, fNum('Cópias', st.n, { min: 1, max: 40, passo: 1, casas: 0 }, v => { st.n = Math.round(v); }),
      fNum('Passo para o lado (x)', st.dx, { min: -100, max: 100, passo: 0.5, un: 'u' }, v => { st.dx = v; }),
      fNum('Passo para baixo (y)', st.dy, { min: -80, max: 80, passo: 0.5, un: 'u' }, v => { st.dy = v; }),
      fNota('Cada cópia fica um passo depois da anterior (negativo: para a esquerda ou para cima).'));
    poe(circ, fNum('Peças no círculo (com esta)', st.nc, { min: 2, max: 36, passo: 1, casas: 0 }, v => { st.nc = Math.round(v); }),
      fNum('Raio', st.raio, { min: 1, max: 120, passo: 0.5, un: 'u' }, v => { st.raio = v; }),
      fBool('Girar junto', st.gira, v => { st.gira = v; }),
      fNota('Em volta do centro do campo, espaçadas por igual (girando junto, cada uma fica virada para o centro do mesmo jeito).'));
    poe(c, h('p.ofi-jan-tx', { texto: l.length > 1 ? l.length + ' peças selecionadas: as cópias vão juntas.' : 'Uma peça selecionada.' }),
      fSel('Como', 'fila', [['fila', 'Em fila'], ['circulo', 'Em círculo']], v => { st.modo = v; fila.hidden = v !== 'fila'; circ.hidden = v === 'fila'; }), fila, circ);
  }, [{ rot: 'CANCELAR', v: null, cls: 'escuro' }, { rot: 'REPETIR', cls: 'ama', ic: 'repetir', valor: () => true }]);
  if (!ok) return;
  const antes = selObjs().map(o => o.id);
  const novos = st.modo === 'fila' ? repeteSel('fila', { n: st.n, dx: st.dx, dy: st.dy }) : repeteSel('circulo', { n: st.nc, raio: st.raio, gira: st.gira });
  if (!novos) return;
  OFE.sel = new Set(antes.concat(novos).filter(id => OFE.M.objetos.some(o => o.id === id))); edEstado(); painelAtualiza(); OFE.sujo = true; tremeu(14);
  aviso(novos.length + (novos.length > 1 ? ' cópias' : ' cópia') + (st.modo === 'fila' ? ' em fila' : ' em círculo') + '. Desfazer volta.');
}
