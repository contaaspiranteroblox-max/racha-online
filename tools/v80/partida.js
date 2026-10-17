/* ==================================================================================================================
   RACHA rua v80 · A PARTIDA (entra no fim do script, depois do times.js)
   1) A PARTIDA NORMAL (a ranqueada, contra os bots e online; futebol e com curva): o relógio começa em 03:00 na saída de
      bola e corre segundo a segundo (na saída, no jogo e na festa do gol; não corre na pausa nem no replay). Em 00:00:
      quem tiver mais gols vence; 1 × 1 e 2 × 2 terminam EMPATADOS; só o 0 × 0 vai para a PRORROGAÇÃO: o relógio continua
      negativo, em vermelho (-00:01 … -02:00), e o primeiro gol vence na hora (GOL DE OURO); sem gol até -02:00, empate.
      Os 3 gols continuam: quem chega no 3º vence na hora. Depois do fim nada muda: a bola que entra depois do tempo não vale.
      Na partida online, O RELÓGIO É DO SERVIDOR: ele manda o tempo a cada segundo (relogio) e todo mundo mostra o mesmo; quem
      roda a partida decide o fim por esse relógio, cada gol leva a hora dele (goal.el) e o servidor confere tudo pela linha
      do tempo dele (server/turma.js: gol depois do fim não vale; se o fim não chega, o servidor encerra sozinho).
      As salas personalizadas ficam com as regras delas (sem tempo; ou 2, 3 ou 5 minutos com GOL DE OURO no empate).
   2) O PLACAR NOVO: o Time A à esquerda (laranja), o Time B à direita (roxo), os gols grandes e o relógio no meio (03:00;
      nos 10 últimos segundos em amarelo; na prorrogação em vermelho, com a faixa PRORROGAÇÃO · GOL DE OURO embaixo).
      Compacto (o mesmo espaço do de antes: nada do HUD precisa mudar de lugar), na partida normal e nas salas.
   3) O EMPATE: a tela do fim (EMPATE, sem a cara de derrota), os pontos da ranqueada (0; a sequência de vitórias zera), as
      estatísticas e o histórico (E).
   4) OS ADVERSÁRIOS SEM OS INDICADORES A MAIS: sem a ponta do halo (a setinha para onde ele está virado) e sem a gota na
      beira da tela quando ele está fora dela. Ficam o nome, a cor do time (o halo e o contorno), a sua setinha branca e as
      gotas dos companheiros e da bola. (No replay continua tudo, para entender o lance.)
   Nada aqui mexe na física: só o relógio, o fim da partida, o desenho e o que conta no resultado.
   ================================================================================================================== */
const V80 = {seg:180, ot:120};                                       // a partida normal: 3:00 e até 2:00 de prorrogação
const V80R = {round:-1, ms:0, at:0, pausado:false, vis:0};          // o relógio do servidor (online): o último que chegou e o que está na tela

/* ---------------------------------------------------------------- 1) o relógio */
function v80RelogioRecebe(o, round){                    // (o servidor manda {ms, pausado}; a metade do ping é o atraso da rede)
  if (!o || typeof o.ms !== 'number' || !isFinite(o.ms)) return;
  V80R.round = round; V80R.ms = o.ms + (o.pausado ? 0 : Math.min(300, Math.max(0, (NET49.ping || 0)/2)));
  V80R.at = performance.now(); V80R.pausado = !!o.pausado;
}
function v80Servidor(){                                 // o relógio do servidor agora (s), na partida normal online; fora dela, null
  const r = NET49.room;
  if (!NET49.playing || !r || r.regra !== 'v80' || V80R.round !== r.round) return null;
  let s = (V80R.ms + (V80R.pausado ? 0 : performance.now() - V80R.at))/1000;
  if (s < V80R.vis && V80R.vis - s < 1.5) s = V80R.vis;    // (a mensagem que atrasou na rede não faz o relógio voltar)
  return V80R.vis = s;
}
function v80Relogio(){ const s = v80Servidor(); return s == null ? RQ.t : s; }

const v80Normal = () => RQ.jogo === 'futebol' || RQ.jogo === 'curva';   // (os modos de gol; os outros, guardados, ficam como eram)
const rqCriaAntes80 = rqCria;
rqCria = function(){ RQ.v80 = null; V80R.vis = 0; return rqCriaAntes80.apply(this, arguments); };
const rqComecaAntes80 = rqComeca;
rqComeca = function(){                                   // contra os bots: a partida normal
  const r = rqComecaAntes80.apply(this, arguments);
  if (RQ.on && !NET49.playing && v80Normal()){ RQ.v80 = {seg:V80.seg, ot:V80.ot}; RQ.tempoLim = 0; RQ.prorrog = false; }
  return r;
};
const net49BeginAntes80 = net49Begin;
net49Begin = function(room){                             // online: a regra vem da sala (a ranqueada é a partida normal)
  V80R.round = -1; V80R.vis = 0;
  const r = net49BeginAntes80.apply(this, arguments);
  if (NET49.playing && room && room.regra === 'v80'){
    const o = room.relogio || {};
    RQ.v80 = {seg:o.seg > 0 ? o.seg : V80.seg, ot:o.prorrog > 0 ? o.prorrog : V80.ot};
    RQ.tempoLim = 0; RQ.meta = 3; RQ.prorrog = false;      // (a sala diz 3 minutos: a regra é esta, não a do GOL DE OURO das salas)
    if (room.relogio) v80RelogioRecebe(room.relogio, room.round);
  }
  return r;
};
const net49MessageAntes80 = net49Message;
net49Message = function(m){
  if (m && m.type === 'relogio'){ const r = NET49.room; if (r && m.round === r.round) v80RelogioRecebe(m, m.round); return; }
  const v = net49MessageAntes80.apply(this, arguments);
  try {
    const r = NET49.room;
    if (m && m.type === 'room' && m.room && m.room.relogio && r && NET49.playing && m.room.round === r.round) v80RelogioRecebe(m.room.relogio, m.room.round);
  } catch (_) {}
  return v;
};
const rqPosAntes80 = rqPos;
rqPos = function(){
  const r = rqPosAntes80.apply(this, arguments);
  if (RQ.on && RQ.v80) v80Tempo();
  return r;
};
function v80Tempo(){                                    // (a cada passo, em quem roda a partida) o relógio e o fim pelo tempo
  const st = RQ.estado;
  if (st === 'intro' || st === 'fim') return;
  const srv = v80Servidor();
  if (srv != null) RQ.t = srv;                           // online: o relógio do servidor
  else if (st !== 'jogo') RQ.t += 1/TICKS_POR_S;        // (no jogo o rqPos de sempre já contou; na saída e na festa do gol também corre)
  if (RQ.fimPendente) return;
  const L = RQ.v80, a = RQ.placar[0], b = RQ.placar[1];
  if (!RQ.prorrog){
    if (RQ.t < L.seg) return;
    if (!a && !b){ RQ.prorrog = true; rqAvisa('PRORROGAÇÃO · GOL DE OURO', '#ff7a6e'); RQ.ev.apito = 'saida'; return; }   // só o 0 × 0
    v80Acaba(st);                                        // quem tem mais gols vence; 1 × 1 e 2 × 2: empate
  } else if (RQ.t >= L.seg + L.ot) v80Acaba(st);       // -02:00 sem gol: empate
}
function v80Acaba(st){ if (st === 'gol') RQ.fimPendente = true; else rqFim(); }   // (acabou durante a festa do gol: acaba depois dela)
const rqGolAntes80 = rqGol;
rqGol = function(lado){
  const vale = RQ.on && RQ.v80 && (RQ.estado === 'jogo' || RQ.estado === 'saida') && !(NET49.playing && !NET49.host);
  let t = 0;
  if (vale){
    t = v80Relogio(); const L = RQ.v80, a = RQ.placar[0], b = RQ.placar[1];
    if ((t >= L.seg && (a || b)) || t >= L.seg + L.ot){ if (!RQ.fimPendente) v80Acaba(RQ.estado); return; }   // o tempo acabou antes da bola entrar: não vale
  }
  const antes = RQ.placar[0] + RQ.placar[1];
  const r = rqGolAntes80.apply(this, arguments);
  if (vale && RQ.placar[0] + RQ.placar[1] !== antes){
    if (RQ.prorrog || t >= RQ.v80.seg){ RQ.prorrog = true; RQ.fimPendente = true; }   // GOL DE OURO: acaba depois da festa
    if (NET49.playing && NET49.goal) NET49.goal.el = Math.round(t*1000)/1000;        // a hora do gol (a linha do tempo do servidor)
  }
  return r;
};
const rqFimAntes80 = rqFim;
rqFim = function(){
  const r = rqFimAntes80.apply(this, arguments);
  const R = RQ.resultado;
  if (R && Array.isArray(R.placar)){ R.empate = R.placar[0] === R.placar[1]; if (RQ.v80){ R.v80 = true; R.ouro = !!RQ.prorrog && !R.empate; } }
  return r;
};
const mdMetaTxtAntes80 = mdMetaTxt;
mdMetaTxt = function(){ const s = mdMetaTxtAntes80.apply(this, arguments); return RQ.v80 ? '3 MINUTOS · ' + s : s; };   // (a apresentação dos times)

/* ---------------------------------------------------------------- 2) o placar */
const PLACAR80 = {y:10, h:54, wl:148, wc:112, raio:15};
const v80PlacarW = () => 2*PLACAR80.wl + PLACAR80.wc;
const v80Mmss = s => String(Math.floor(s/60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
function v80TempoTela(){                                // o relógio do placar: {s, cor, ot, un}
  const st = RQ.estado, parado = st === 'intro' || st === 'fim';
  if (RQ.v80){
    const L = RQ.v80, srv = parado ? null : v80Servidor(), t = st === 'intro' ? 0 : srv != null ? srv : RQ.t;
    if (!RQ.prorrog && !parado && t >= L.seg && !RQ.placar[0] && !RQ.placar[1]) RQ.prorrog = true;   // (quem não roda a partida também vê a prorrogação)
    if (RQ.prorrog && t >= L.seg) return {s:(t > L.seg ? '-' : '') + v80Mmss(Math.min(L.ot, Math.ceil(t - L.seg - 1e-6))), cor:'#ff5a4f', ot:true};
    const resta = Math.max(0, Math.ceil(L.seg - t - 1e-6));
    return {s:v80Mmss(resta), cor:resta > 0 && resta <= 10 && !parado ? '#ffd23f' : '#ffffff', ot:false};
  }
  const lim = RQ.tempoLim || 0, t = RQ.t || 0;
  if (lim > 0){                                          // a sala com tempo: contagem regressiva; no empate, GOL DE OURO (sem limite)
    if (t >= lim && (RQ.prorrog || RQ.placar[0] === RQ.placar[1])) return {s:(t > lim ? '-' : '') + v80Mmss(Math.ceil(t - lim - 1e-6)), cor:'#ff5a4f', ot:true};
    return {s:v80Mmss(Math.max(0, Math.ceil(lim - t - 1e-6))), cor:'#ffffff', ot:false};
  }
  return {s:v80Mmss(Math.floor(t)), cor:'#ffffff', ot:false, un:'ATÉ ' + (RQ.meta || 3)};   // a sala sem tempo: o tempo de jogo e a meta
}
function v80PlacarCaixa(g, w, h, c0, c1, ot){           // (imagem pronta) a caixa: o Time A laranja | o relógio | o Time B roxo
  const P = PLACAR80, wl = P.wl, wc = P.wc, R = P.raio;
  rr(g, 0, 4, w, h, R); g.fillStyle = 'rgba(0,0,0,.32)'; g.fill();
  g.save(); rr(g, 0, 0, w, h, R); g.clip();
  let gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, corMix(c0.base, '#ffffff', .14)); gr.addColorStop(1, corMix(c0.base, '#000000', .12));
  g.fillStyle = gr; g.fillRect(0, 0, wl, h);
  gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, corMix(c1.base, '#ffffff', .14)); gr.addColorStop(1, corMix(c1.base, '#000000', .14));
  g.fillStyle = gr; g.fillRect(wl + wc, 0, wl, h);
  gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, ot ? '#3b1517' : '#2a2e35'); gr.addColorStop(1, ot ? '#220a0b' : '#16181c');
  g.fillStyle = gr; g.fillRect(wl, 0, wc, h);
  g.fillStyle = 'rgba(255,255,255,.17)'; g.fillRect(0, 0, w, 3);                       // o brilho de cima
  g.fillStyle = 'rgba(10,8,18,.35)'; g.fillRect(wl - 1, 0, 2, h); g.fillRect(wl + wc - 1, 0, 2, h);   // as divisões
  g.restore();
  rr(g, 0, 0, w, h, R); g.lineWidth = 3; g.strokeStyle = 'rgba(12,10,20,.88)'; g.stroke();   // a borda discreta
  rr(g, 1.5, 1.5, w - 3, h - 3, R - 1.5); g.lineWidth = 1.2; g.strokeStyle = 'rgba(255,255,255,.14)'; g.stroke();
  g.save(); g.lineWidth = 3; g.strokeStyle = '#ffffff';                                    // o símbolo do contorno em campo (v70: os times além da cor):
  g.beginPath(); g.arc(15, h/2, 6.5, 0, TAU); g.stroke();                                   // ○ cheio no Time A
  g.setLineDash([3.4, 2.4]); g.beginPath(); g.arc(w - 15, h/2, 6.5, 0, TAU); g.stroke();    // ◌ tracejado no Time B
  g.restore();
}
function v80Placar(g){
  const P = PLACAR80, w = v80PlacarW(), x0 = W/2 - w/2, y = P.y, h = P.h, c0 = rqCor(0), c1 = rqCor(1), T = v80TempoTela();
  g.save(); g.translate(x0, y);
  pintaHud(g, sprHud('placar80|' + c0.base + '|' + c1.base + '|' + (T.ot ? 1 : 0), escHud(1), 6, 6, w + 6, h + 12, k => v80PlacarCaixa(k, w, h, c0, c1, T.ot)));
  g.restore();
  const cy = y + h/2 + 2;
  txt(g, 'TIME A', x0 + 63, cy, 18, '#ffffff', corMix(c0.base, '#000000', .55), 4);
  txt(g, String(RQ.placar[0]), x0 + P.wl - 28, cy, 44, '#ffffff', corMix(c0.base, '#000000', .6), 6);
  txt(g, String(RQ.placar[1]), x0 + P.wl + P.wc + 28, cy, 44, '#ffffff', corMix(c1.base, '#000000', .6), 6);
  txt(g, 'TIME B', x0 + w - 63, cy, 18, '#ffffff', corMix(c1.base, '#000000', .55), 4);
  if (T.un){ txt(g, T.s, W/2, y + 22, 28, T.cor, 'rgba(0,0,0,.6)', 5); txt(g, T.un, W/2, y + h - 11, 15, '#ffe9a8', 'rgba(0,0,0,.7)', 3); }
  else { const tam = Math.min(33, 33*(P.wc - 14)/Math.max(1, medeTxt(T.s, '33px ' + FONT))); txt(g, T.s, W/2, cy, tam, T.cor, 'rgba(0,0,0,.62)', 5); }
  // a faixa embaixo: o aviso, a saída de bola ou a prorrogação
  let linha = '', cor = '#fff';
  const meu = NET49.playing ? (NET49.localSlot < 0 ? -1 : P.time) : 0;
  if (RQ.aviso.t > 0){ linha = RQ.aviso.txt; cor = RQ.aviso.cor; }
  else if (RQ.estado === 'saida'){ linha = meu < 0 ? 'SAÍDA DO ' + (RQ.saidaTime ? 'TIME B' : 'TIME A') : RQ.saidaTime === meu ? 'SAÍDA DO SEU TIME' : 'SAÍDA DO ADVERSÁRIO'; cor = rqCor(RQ.saidaTime).claro; }
  else if (T.ot && RQ.estado !== 'fim'){ linha = RQ.v80 ? 'PRORROGAÇÃO · GOL DE OURO' : 'GOL DE OURO'; cor = '#ff8a7e'; }
  else if (RQ.prorrog && !RQ.v80 && RQ.estado !== 'fim'){ linha = 'MORTE SÚBITA'; cor = '#ffd23f'; }
  if (linha){
    g.save(); g.font = '24px ' + FONT; const lw = g.measureText(linha).width + 36;
    rr(g, W/2 - lw/2, 72, lw, 38, 19); g.fillStyle = T.ot && !RQ.aviso.t ? 'rgba(40,8,10,.72)' : 'rgba(8,10,28,.62)'; g.fill(); g.restore();
    txt(g, linha, W/2, 91, 24, cor, 'rgba(5,10,25,.95)', 6);
  }
  // do lado: o modo (e a patente) e a etiqueta do modo de jogo
  const e = rqElo(CONTA.rq.pts), s0 = x49ModeName() + (X49.matchMode === 'ranked' ? ' · ' + e.nome : ''), w0 = medeTxt(s0, '22px ' + FONT), xl = W/2 + w/2 + 16 + w0/2;
  txt(g, s0, xl, 38, 22, e.elo.cor[1], 'rgba(5,10,25,.95)', 5);
  const md = RQ.jogo, corM = V70_MD_COR[md], M = MD_MAP.get(md);
  if (corM && M){
    const wm = medeTxt(M.nome, '17px ' + FONT) + 22, x = xl + w0/2 + 12, yy = 25, claro = md === 'ginga';
    rr(g, x, yy, wm, 27, 13.5); g.fillStyle = corM; g.fill(); g.lineWidth = 2.5; g.strokeStyle = 'rgba(5,10,25,.9)'; g.stroke();
    txt(g, M.nome, x + wm/2, yy + 14.5, 17, claro ? '#2a1d00' : '#ffffff', claro ? null : 'rgba(5,10,25,.85)', 4);
  }
  if (md === 'ginga' && (RQ.estado === 'jogo' || RQ.estado === 'saida')) v80Ginga(g, linha ? 118 : 74);
}
function v80Ginga(g, y0){                               // (o modo GINGA, guardado) a janela do GOL DE GINGA embaixo do placar, como na v70
  const meu = NET49.playing ? (NET49.localSlot < 0 ? 0 : P.time) : 0;
  let y = y0;
  for (const t of [meu, 1 - meu]){
    const m = GN.mov[t]; if (!m) continue;
    const resta = gnTk(GN_JANELA) - (RQ.tick - m.tick); if (resta <= 0 || gnTocou(1 - t, m.tick)) continue;
    const s = resta/TICKS_POR_S, nosso = t === meu, frac = Math.max(0, Math.min(1, resta/gnTk(GN_JANELA)));
    const tx = (nosso ? 'GOL DE GINGA VALE 2 · ' : 'GINGA DELES · ') + s.toFixed(1).replace('.', ',') + ' s', w = 380;
    rr(g, W/2 - w/2, y, w, 40, 20); g.fillStyle = 'rgba(8,10,28,.74)'; g.fill();
    rr(g, W/2 - w/2 + 8, y + 31, (w - 16)*frac, 5, 2.5); g.fillStyle = nosso ? '#ffd23f' : '#ff8a7a'; g.fill();
    txt(g, tx, W/2, y + 17, 21, nosso ? '#ffe45e' : '#ffb4a8', 'rgba(5,10,25,.95)', 5);
    y += 46;
  }
}
rqPlacar70 = function(g){                               // o placar novo no lugar do de antes (e do que as camadas desenhavam do lado dele)
  V79R.curto = true;                                     // (do lado do placar cabe só RANQUEADA)
  try { v80Placar(g); } finally { V79R.curto = false; }
};
const foraObstaculosAntes80 = foraObstaculos;
foraObstaculos = function(){                             // a gota de quem está fora da tela não fica embaixo do placar novo
  const o = foraObstaculosAntes80.apply(this, arguments), hk = HUDX.k, m = v80PlacarW()/2 + 8;
  for (const b of o) if (!b.c && b.y0 === 0 && Math.abs(b.x0 + b.x1 - W) < 1) { b.x0 = W/2 - m*hk; b.x1 = W/2 + m*hk; b.y1 = Math.max(b.y1, 72*hk); }
  return o;
};

/* ---------------------------------------------------------------- 3) o empate: os pontos, a tela do fim, as estatísticas, o histórico */
const v80Empate = R => !!R && !R.abandono && Array.isArray(R.placar) && R.placar[0] === R.placar[1];
const rqPontuaAntes80 = rqPontua;
rqPontua = function(R){                                  // empate: 0 ponto (sem a proteção nem o bônus); a sequência de vitórias zera
  if (!v80Empate(R)) return rqPontuaAntes80.apply(this, arguments);
  const C = CONTA.rq, antes = C.pts, e = rqElo(antes);
  C.seq = 0; C.jogos++; C.emp = (C.emp | 0) + 1; contaSalvar();
  return {antes, depois:antes, delta:0, eloAntes:e, eloDepois:e, subiu:false, caiu:false, empate:true};
};
const estResultadoAntes80 = estResultado;
estResultado = function(R, ctx, info){ return estResultadoAntes80.call(this, R, ctx, v80Empate(R) && info ? Object.assign({}, info, {empate:true}) : info); };
const x49RecordAntes80 = x49Record;
x49Record = function(R){
  const v = x49RecordAntes80.apply(this, arguments);
  try {
    if (v80Empate(R)){
      const h = X49.history[X49.history.length - 1];
      if (h && h.at >= Date.now() - 2000){ h.emp = true; h.win = false; }
      X49.seq = 0; x49Save();
    }
  } catch (_) {}
  return v;
};
const rqMostraFimAntes80 = rqMostraFim;
rqMostraFim = function(){
  const r = rqMostraFimAntes80.apply(this, arguments);
  try {
    const R = RQ.resultado, f = fimEl('fim');
    if (R && f){
      const emp = v80Empate(R);
      f.classList.toggle('empate', emp); if (emp) f.classList.remove('perdeu');
      if (R.ouro && !NET49.playing){ const i = fimEl('fim-info'); if (i && i.textContent.indexOf('GOL DE OURO') < 0) i.textContent += ' · GOL DE OURO na prorrogação'; }
    }
  } catch (_) {}
  return r;
};
const net49ResultAntes80 = net49Result;
net49Result = function(m){
  const antes = RQ.resultado, r = net49ResultAntes80.apply(this, arguments);
  try {
    if (m && RQ.resultado && RQ.resultado !== antes){
      if (Array.isArray(m.score) && m.score[0] === m.score[1]){ const f = fimEl('fim'); if (f){ f.classList.add('empate'); f.classList.remove('perdeu'); } }
      const i = fimEl('fim-info');
      if (m.servidor && i && i.textContent.indexOf('relógio do servidor') < 0) i.textContent += ' · encerrada pelo relógio do servidor';
    }
  } catch (_) {}
  return r;
};

/* ---------------------------------------------------------------- 4) os adversários sem a setinha do halo e sem a gota fora da tela */
const V80I = {q:null};
function v80Adversario(q){                               // na partida (não no replay), q é do outro time? (quem assiste não tem adversário)
  if (!RQ.on || RP.ativo || !q || q === P || (NET49.playing && NET49.localSlot < 0)) return false;
  return (q.time === 0 || q.time === 1) && q.time !== P.time;
}
const aroDeAntes80 = aroDe;
aroDe = function(g, q){ V80I.q = q; try { return aroDeAntes80.apply(this, arguments); } finally { V80I.q = null; } };
const aroJogAntes80 = aroJog;
aroJog = function(g, x, y, r, cor, ang, luz, giro, semTag){
  return aroJogAntes80.call(this, g, x, y, r, cor, ang, luz, giro, semTag || v80Adversario(V80I.q));
};
const desenhaForaDaTelaAntes80 = desenhaForaDaTela;
desenhaForaDaTela = function(g){
  if (!RQ.on || !Array.isArray(RQ.jog) || (NET49.playing && NET49.localSlot < 0)) return desenhaForaDaTelaAntes80.apply(this, arguments);
  const todos = RQ.jog;
  RQ.jog = todos.filter(q => !v80Adversario(q));         // (só para este desenho: os companheiros, você e a bola)
  try { return desenhaForaDaTelaAntes80.apply(this, arguments); } finally { RQ.jog = todos; }
};

/* ---------------------------------------------------------------- a sala: o TEMPO cabe no quadro ("3 min"; antes "3 minutos" saía cortado) */
try { const o = SL_OPS.find(x => x.k === 'tempo'); if (o) o.txt = (v, r) => v ? v + ' min' : '1º a ' + slMeta(r && r.jogo); } catch (_) {}

window.RachaPartida80 = {
  regra:() => RQ.v80 ? Object.assign({}, RQ.v80) : null, relogio:() => v80Relogio(), servidor:() => v80Servidor(), tela:() => v80TempoTela(),
  placarW:() => v80PlacarW(), adversario:q => v80Adversario(q)
};
