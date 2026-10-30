/* ==================================================================================================================
   RACHA v93 · Fase 2 — PARTIDAS, PLACAR E CRAQUE DA PARTIDA
   1) A CONTAGEM 3, 2, 1, JÁ! antes de começar: contra os bots, depois da apresentação dos times (a física espera, como na
      pausa: ninguém sai antes); online, o SERVIDOR segura a partida (o motor parado e os comandos de antes descartados) e
      manda a contagem a todos ao mesmo tempo (cada aparelho desconta metade do ping).
   2) O PAINEL DE JOGADORES: um botão discreto do lado do placar abre (e fecha) um painel pequeno com os dois
      times nas cores do RACHA — o avatar (a tampinha), o nome, a posição no time, o ping, quem está ativo, quem caiu (o bot
      segura o lugar), os bots, os reservas e quem assiste, e os gols, as assistências e as defesas de cada um, ao vivo.
      Ele não pega o toque (o jogo continua por baixo) e nunca fica em cima de um controle.
   3) O CRAQUE DA PARTIDA: a mesma conta no aparelho (contra os bots) e no servidor (online): gol 10, assistência 6, defesa 4,
      desarme 2, chute no gol 1,5, passe certo 0,5, gol contra −5 e o resultado (vitória 3, empate 1) — quem só faz gol não
      ganha sempre (uma partida de 3 defesas e 2 desarmes vale tanto quanto 2 gols). O cartão na tela do fim (o avatar, o nome,
      a tampinha e os números) e a conquista no perfil (e na conta, pelo selo do servidor).
   4) O REPLAY DO GOL: o cartão de quem marcou (e de quem deu o passe) — o avatar, o nome e o banner equipado — num canto,
      entrando e saindo rápido. Online o replay agora passa para todos: o servidor para a partida, cada aparelho passa o
      lance e PULAR é um voto (PULAR · 1/3): pula quando todos os que estão jogando votam; quem cai sai da conta; o servidor
      encerra para todos ao mesmo tempo (ou no fim do tempo).
   5) O BANCO DE RESERVAS: quem assiste a sala aparece no banco ao lado do campo (a sua tampinha), fora da quadra: não toca na
      bola nem nos jogadores. Atualiza quando alguém entra, sai ou vira jogador.
   Nada aqui mexe na física, no chute, no passe ou na movimentação: só o desenho, as telas e as pausas de antes do jogo e do
   replay (na contagem e no replay o relógio da partida para, como na pausa).
   ================================================================================================================== */
const V93P = {contagem:null, estat:new Map(), painel:null, painelT:0, aberto:false, el:{}, replay:null, ultimoRep:null, gol:null, craque:null, golsLocais:new Map()};
const V93P_CONTAGEM_MS = 3000;

/* ---------------------------------------------------------------- 0) o craque (a mesma conta do servidor: server/partida/sala.js) */
function v93PtsCraque(e, venc){ return 10*(e.g | 0) + 6*(e.a | 0) + 4*(e.d | 0) + 2*(e.r | 0) + 1.5*(e.c | 0) + .5*(e.p | 0) - 5*(e.cg | 0) + (venc < 0 ? 1 : e.time === venc ? 3 : 0); }
function v93Craque(lista, venc){
  let m = null;
  for (const e of lista || []){
    const pts = Math.round(v93PtsCraque(e, venc)*10)/10; if (pts < 1) continue;
    const x = Object.assign({}, e, {pts});
    if (!m || x.pts > m.pts || (x.pts === m.pts && (x.g > m.g || (x.g === m.g && (x.a > m.a || (x.a === m.a && x.d > m.d)))))) m = x;
  }
  return m;
}

/* ---------------------------------------------------------------- 1) a contagem 3, 2, 1, JÁ! */
function v93ContagemComeca(ms, online){ V93P.contagem = {ini:performance.now(), fim:performance.now() + ms, visto:null, online:!!online, espera:!!online}; }
function v93Contando(){
  const c = V93P.contagem; if (!c) return false;
  const agora = performance.now();
  if (c.espera && agora > c.fim + 1500) c.espera = false;   // (online: o JÁ! é o primeiro quadro andando do servidor; sem ele, 1,5 s depois)
  const falta = c.espera ? Math.max(1, c.fim - agora) : c.fim - agora;
  if (falta <= 0){                                         // JÁ!
    if (c.visto !== 0){ c.visto = 0; try { if (typeof som.contagem === 'function') som.contagem(0); else som.apito('saida'); } catch (_) {} }   // (Fase 7: o JÁ! com o apito)
    if (falta < -700) V93P.contagem = null;                // (o JÁ! fica um instante na tela, com o jogo já andando)
    return false;
  }
  const n = Math.ceil(falta/1000);
  if (c.visto !== n){ c.visto = n; try { if (typeof som.contagem === 'function') som.contagem(n); else som.clique(); } catch (_) {} }   // (Fase 7: o bip de cada número)
  return true;
}
function v93DesenhaContagem(g){                               // o número grande no meio, com o anel do segundo (o visual do placar: branco e amarelo, contorno escuro)
  const c = V93P.contagem; if (!c) return;
  const agora = performance.now(), falta = c.espera ? Math.max(1, c.fim - agora) : c.fim - agora, ja = falta <= 0;
  const n = Math.max(1, Math.ceil(falta/1000)), fr = ja ? Math.min(1, -falta/700) : 1 - (falta/1000 - Math.floor(falta/1000));   // (fr: 0 → 1 em cada número)
  const pop = ja ? 1 + .35*fr : 1 + .55*Math.pow(1 - Math.min(1, fr*4.5), 2), a = ja ? 1 - fr*fr : Math.min(1, fr*10, (1 - fr)*6 + .35);
  const cx = W/2, cy = H*.40, R = 118;
  g.save(); g.setTransform(K, 0, 0, K, 0, 0); g.globalAlpha = Math.max(0, Math.min(1, a));
  if (!ja){                                                    // o anel: a volta do segundo
    g.lineCap = 'round';
    g.lineWidth = 14; g.strokeStyle = 'rgba(8,10,28,.55)'; g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.stroke();
    g.lineWidth = 9; g.strokeStyle = '#ffd23f'; g.beginPath(); g.arc(cx, cy, R, -Math.PI/2, -Math.PI/2 + TAU*(1 - fr)); g.stroke();
  }
  const s = ja ? 'JÁ!' : String(n), tam = (ja ? 150 : 190)*pop;
  g.font = tam + 'px ' + FONT; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
  const y = cy + tam*.04;
  g.lineWidth = tam*.12; g.strokeStyle = 'rgba(6,8,22,.96)'; g.strokeText(s, cx, y + tam*.05);   // (a sombra dura de baixo)
  g.strokeText(s, cx, y);
  const gr = g.createLinearGradient(0, y - tam*.42, 0, y + tam*.42);
  if (ja){ gr.addColorStop(0, '#fff6b0'); gr.addColorStop(.5, '#ffd23f'); gr.addColorStop(1, '#ff8a1a'); }
  else { gr.addColorStop(0, '#ffffff'); gr.addColorStop(.62, '#ffffff'); gr.addColorStop(1, '#ffe9a8'); }
  g.fillStyle = gr; g.fillText(s, cx, y);
  if (!ja) txt(g, 'PREPARA', cx, cy - R - 38, 30, '#fff2b0', 'rgba(5,10,25,.95)', 7);
  g.restore();
}
// contra os bots: a contagem começa quando a apresentação dos times fecha (o apito sai no JÁ!)
const rqVsComecaAntes93 = rqVsComeca;
rqVsComeca = function(){
  const antes = RQ.on && RQ.estado === 'intro', ap = som.apito;
  if (antes) som.apito = function(){};                     // (o apito da saída fica para o JÁ!)
  try { rqVsComecaAntes93.apply(this, arguments); } finally { som.apito = ap; }
  if (antes && RQ.on && !NET49.playing) v93ContagemComeca(V93P_CONTAGEM_MS);
  else if (antes && NET49.playing){                        // online: o apito vem no JÁ! da contagem do servidor (chega junto com o começo);
    const rd = NET49.room && NET49.room.round;             // sem contagem (o servidor com ela desligada), o apito de sempre
    setTimeout(() => { try { if (NET49.playing && !V93P.contagem && (!NET49.room || NET49.room.round === rd)) som.apito('saida'); } catch (_) {} }, 700);
  }
};
const ARB_PARADOAntes93 = ARB_PARADO;
ARB_PARADO = function(){ return (RQ.on && !NET49.playing && v93Contando()) || ARB_PARADOAntes93(); };   // (a física espera a contagem, como na pausa)

/* ---------------------------------------------------------------- 2) as estatísticas contra os bots (as mesmas regras do servidor) */
function v93Est(q){
  const k = q === P ? 'eu' : 'b' + (RQ.jog.indexOf(q));
  let e = V93P.estat.get(k);
  if (!e){ e = {k, nome:q === P ? perfil.nome : (q.nome || 'Bot'), bot:q !== P, time:q.time | 0, g:0, a:0, d:0, r:0, c:0, p:0, cg:0, def:[]}; V93P.estat.set(k, e); }
  return e;
}
function v93EstZera(){ V93P.estat.clear(); V93P.craque = null; }
const rqCriaAntes93 = rqCria;
rqCria = function(){ v93EstZera(); return rqCriaAntes93.apply(this, arguments); };
const rqToqueAntes93 = rqToque;
rqToque = function(q){
  const h = RQ.toques, u = h && h[h.length - 1], cd = RQ.chuteDe, n0 = h ? h.length : 0;
  const r = rqToqueAntes93.apply(this, arguments);
  try {
    if (RQ.on && !NET49.playing && q && (!u || u.p !== q)){
      const e = v93Est(q);
      if (cd && cd.alvo && !cd.v93Def && cd.time !== q.time && cd.p && cd.p !== q){ e.d++; cd.v93Def = true; e.def.push(RQ.tick); }   // (uma defesa por chute)
      else if (u && u.p && u.p.time !== q.time && u.tick - u.t0 >= 10 && RQ.tick - (e.rT == null ? -1e9 : e.rT) >= 45){ e.r++; e.rT = RQ.tick; }   // (tomou a bola de quem estava com ela)
      if (u && u.p && u.p !== q && u.p.time === q.time && u.chute >= 0 && RQ.tick - u.chute <= 180) v93Est(u.p).p++;
    }
  } catch (_) {}
  return r;
};
const rqMarcaChuteAntes93 = rqMarcaChute;
rqMarcaChute = function(q){
  const r = rqMarcaChuteAntes93.apply(this, arguments);
  try { if (RQ.on && !NET49.playing && q && RQ.chuteDe && RQ.chuteDe.alvo) v93Est(q).c++; } catch (_) {}
  return r;
};
const rqGolAntes93 = rqGol;
rqGol = function(lado){
  const antes = RQ.placar[0] + RQ.placar[1];
  const r = rqGolAntes93.apply(this, arguments);
  try {
    if (RQ.placar[0] + RQ.placar[1] !== antes && RQ.ev){
      const E = RQ.ev;
      if (!NET49.playing){
        if (E.autor) v93Est(E.autor).g++;
        if (E.assist) v93Est(E.assist).a++;
        if (E.contraDe) v93Est(E.contraDe).cg++;
        if (E.desvio){ const e = v93Est(E.desvio), i = e.def.findIndex(t => RQ.tick - t <= 130); if (i >= 0){ e.def.splice(i, 1); e.d = Math.max(0, e.d - 1); } }
      }
      V93P.gol = v93GolInfo(E.autor, E.assist, RQ.golTime);   // (o cartão do replay)
    }
  } catch (_) {}
  return r;
};
function v93Pessoa(q){                                        // nome, tampinha, avatar e banner de quem joga (você, um bot ou alguém da sala)
  if (!q) return null;
  const eu = q === P && !(NET49.playing && NET49.localSlot < 0);
  const m = NET49.playing && q.netId && NET49.room && Array.isArray(NET49.room.members) ? NET49.room.members.find(x => x.id === q.netId) : null;
  const cos = eu ? (typeof v88Cos === 'function' ? v88Cos(P) : null) : m && m.cos ? m.cos : null;
  let skin = eu ? perfil.skin : m ? m.skin : q.netSkin || '';
  try { if (skin && typeof tpNoTime === 'function' && (q.time === 0 || q.time === 1)) skin = tpNoTime(skin, q.time); } catch (_) {}   // v95: a inicial na cor do time (como na partida)
  return {nome:eu ? perfil.nome : (m ? m.name : q.nome) || 'Bot', bot:!eu && !m && !q.netId, time:q.time | 0, skin,
    banner:cos && cos.banner || '', avatar:cos && cos.avatar || '',
    emoji:typeof emjDe === 'function' && (q === P || (RQ.jog && RQ.jog.indexOf(q) >= 0)) ? emjDe(q) : ''};   // v95: o emoji da tampinha
}
function v93GolInfo(autor, assist, time){ return {autor:v93Pessoa(autor), assist:v93Pessoa(assist), time:time | 0, t:performance.now()}; }

/* ---------------------------------------------------------------- 3) online: a contagem, o replay e o painel que o servidor manda */
// o hello da v93: o servidor fica sabendo que este aparelho conhece a contagem e o replay (numa sala com alguém que ainda tem
// a página antiga guardada no aparelho, o replay não espera pelo voto de quem não tem o PULAR)
const v70HelloExtraAntes93 = v70HelloExtra;
v70HelloExtra = function(){ const o = v70HelloExtraAntes93.apply(this, arguments) || {}; o.v93 = 1; return o; };
const net49MessageAntes93 = net49Message;
net49Message = function(m){
  try {
    if (m && m.type === 'contagem'){ V93P.contagemMsg = {ms:m.ms | 0, em:Date.now(), jogando:!!NET49.playing}; if (NET49.playing) v93ContagemComeca(Math.max(0, (m.ms | 0) - Math.min(400, (NET49.ping || 0)/2)), true); return; }
    if (m && m.type === 'painel'){ V93P.painel = m; V93P.painelT = performance.now(); v93PainelPinta(); return; }
    if (m && m.type === 'replay'){ v93ReplayOnline(m); return; }
    if (m && m.type === 'replay_votos'){ if (V93P.replay && m.round === V93P.replay.round){ V93P.replay.votos = m.votos | 0; V93P.replay.precisa = m.precisa | 0; } return; }
    if (m && m.type === 'replay_fim'){ v93ReplayOnlineFim(m); return; }
    if (m && (m.type === 'left' || m.type === 'interrupted' || m.type === 'start' || m.type === 'result')){   // (a partida acabou, parou ou recomeçou: o replay do servidor acabou junto)
      V93P.replay = null; if (m.type !== 'start') V93P.contagem = null;
      if (RP.ativo && RP.origem === 'vivo') try { rpFimAntes93(); } catch (_) {}
    }
    if (m && m.type === 'snapshot' && m.data && m.data.tick > 0){   // o primeiro quadro andando: o servidor começou — o JÁ! na hora, em todos os aparelhos
      if (V93P.contagemMsg && !V93P.contagemMsg.anda) V93P.contagemMsg.anda = Date.now();
      const c = V93P.contagem; if (c && c.espera){ c.espera = false; c.fim = Math.min(c.fim, performance.now()); }
    }
    if (m && m.type === 'snapshot' && m.data && m.data.goal && Array.isArray(m.data.score)){
      const s = m.data.score, a = NET49.lastScore || [0, 0];
      if (s[0] !== a[0] || s[1] !== a[1]){
        const G = m.data.goal, quem = id => id && RQ.jog.find(q => q.netId === id);
        V93P.gol = v93GolInfo(quem(G.author) || (G.name ? {nome:G.name, time:G.time} : null), quem(G.assist) || (G.assistName ? {nome:G.assistName, time:G.time} : null), G.time);
      }
    }
  } catch (e) { console.error('v93 rede', e); }
  return net49MessageAntes93.apply(this, arguments);
};
const net49RemoteFrameAntes93 = net49RemoteFrame;
net49RemoteFrame = function(dt, now){
  if (RP.ativo && RP.origem === 'vivo' && (V93P.replay ? performance.now() > V93P.replay.ate + 3000 : RP.parado)){ try { rpFimAntes93(); } catch (_) {} }   // (parado no último quadro sem o fim do servidor: acaba aqui)
  if (RP.ativo){ rpFrame(Math.max(0, dt)); return; }        // o replay do gol online (o servidor segura a partida)
  if (v93Contando()){ acc = 0; net49Draw(dt); x49GameUI(); return; }   // a contagem: ninguém anda (nem na previsão do aparelho)
  return net49RemoteFrameAntes93.apply(this, arguments);
};
const rpGuardaRecenteAntes93 = rpGuardaRecente;
rpGuardaRecente = function(rep){ V93P.ultimoRep = rep; return rpGuardaRecenteAntes93.apply(this, arguments); };
function v93ReplayOnline(m){
  if (!NET49.playing || RP.ativo) return;
  let rep = V93P.ultimoRep;
  if (!rep && RP.golN >= 0){ try { rep = rpMonta(); RP.golN = -1; if (rep) rpGuardaRecenteAntes93(rep); } catch (_) {} }
  const semLance = !rep || Date.now() - (rep.quando || 0) > 15000 || !opc.replay;
  V93P.replay = {round:m.round, votos:m.votos | 0, precisa:m.precisa | 0, votei:false, ate:performance.now() + (m.ms | 0)};
  if (semLance){                                            // (sem o lance aqui — ou o replay desligado nos Ajustes —: o voto de pular vai na hora,
    V93P.ultimoRep = null; v93VotaPular(true);              //  para ninguém esperar por este aparelho; o jogo volta quando o servidor encerrar)
    try { x49Toast('Replay do gol…'); } catch (_) {}
    return;
  }
  rep = v93RepCorta(rep, (m.ms | 0) - 400);                // (o lance cabe no tempo que o servidor dá)
  V93P.ultimoRep = null;
  RP.rep = rep; RP.depois = null; RP.origem = 'vivo'; RP.pedido = false;
  rpInicia();
}
function v93RepCorta(rep, ms){                              // tira do começo do lance o que não cabe em ms (a câmera lenta no gol fica)
  try {
    const hz = rep.hz, lento = (RP_LENTO + RP_LENTO_FIM)*hz, dur = f => ((rep.nf - f) - lento)/hz + lento/(hz*RP_VEL_LENTA);
    let ini = 0; while (ini < rep.golF - hz && dur(ini)*1000 > ms) ini += Math.round(hz/4);
    if (!ini) return rep;
    const fs = rep.fs, nf = rep.nf - ini, F = rep.frames.slice(ini*fs);
    return Object.assign({}, rep, {nf, golF:rep.golF - ini, frames:F});
  } catch (_) { return rep; }
}
function v93ReplayOnlineFim(m){
  if (!V93P.replay && !(RP.ativo && RP.origem === 'vivo' && NET49.playing)) return;
  V93P.replay = null;                                         // (sem o replay pendente, o rpFim encerra de verdade)
  if (RP.ativo) rpFim();
}
function v93RotuloPular(){
  const R = V93P.replay; if (!R) return 'PULAR';
  return (R.votei ? 'VOTOU · ' : 'PULAR · ') + Math.min(R.votos, R.precisa) + '/' + Math.max(1, R.precisa);
}
function v93VotaPular(mudo){
  const R = V93P.replay; if (!R || R.votei) return;
  if (NET49.localSlot < 0) return;                          // (quem assiste não vota)
  R.votei = true; R.votos = Math.min(R.precisa, R.votos + 1);
  if (!mudo) try { som.clique(); } catch (_) {}
  net49Send({type:'replay_pula', round:R.round});
}
// o replay mora dentro do bloco PHYS (que o build confere byte a byte): as mudanças dele vêm por fora, trocando as funções
const rpHudAntes93 = rpHud;                                  // o cartão de quem marcou no lugar das duas linhas de texto do meio
rpHud = function(){
  const R = RP.rep, I = (R && R.info) || {};
  let T = null; try { T = rpTitulo(R); } catch (_) {}
  const tit = T ? (T.s ? T.t + ' · ' + T.s : T.t) : null, pas = I.assist ? 'PASSE DE ' + String(I.assist).toUpperCase() : null;
  const txt0 = txt;
  txt = function(g, s){ if (s != null && (s === tit || (pas && s === pas))) return; return txt0.apply(this, arguments); };
  try { rpHudAntes93.apply(this, arguments); } finally { txt = txt0; }
  try { v93CartaoGol(ctx, R, T || {}, I); } catch (_) {}
};
const rpBotaoAntes93 = rpBotao;                              // online, PULAR é um voto (PULAR · 1/3)
rpBotao = function(b, rot, c, ic){ if (ic === 'pular' && V93P.replay) rot = v93RotuloPular(); return rpBotaoAntes93.call(this, b, rot, c, ic); };
const rpFimAntes93 = rpFim;                                  // online, o lance que acaba antes do servidor fica parado no último quadro
rpFim = function(){
  const R = V93P.replay;
  if (R && RP.ativo && RP.origem === 'vivo' && NET49.playing && RP.rep && RP.fr >= RP.rep.nf - 1 && performance.now() < R.ate + 3000){ RP.parado = true; return; }
  return rpFimAntes93.apply(this, arguments);
};
const rpToqueAntes93 = rpToque;
rpToque = function(x, y){
  if (V93P.replay && RP.origem === 'vivo' && rpDentro(RP_BTN.pular, x, y)){ v93VotaPular(); return; }
  return rpToqueAntes93.apply(this, arguments);
};
const rpTeclaAntes93 = rpTecla;
rpTecla = function(e){
  const c = e && e.code;
  if (V93P.replay && (c === 'Space' || c === 'Enter' || c === 'Escape' || c === 'KeyP')){ e.preventDefault(); if (!e.repeat && RP.t > .35) v93VotaPular(); return; }
  return rpTeclaAntes93.apply(this, arguments);
};

/* ---------------------------------------------------------------- 4) o cartão de quem marcou (no replay) */
function v93CartaoGol(g, R, T, I){
  if (!RP.ativo) return;
  const G = V93P.gol && performance.now() - V93P.gol.t < 30000 && RP.origem === 'vivo' ? V93P.gol : null;
  const autor = G && G.autor ? G.autor : I.autor ? {nome:String(I.autor), time:I.time | 0} : null;
  const assist = G && G.assist ? G.assist : I.assist ? {nome:String(I.assist), time:I.time | 0} : null;
  const t = RP.t, ent = Math.min(1, t/.28), sai = RP.rep && RP.rep.nf ? Math.max(0, Math.min(1, (RP.rep.nf - 1 - RP.fr)/(R.hz*.25 || 15))) : 1;
  const a = Math.min(ent, sai); if (a <= 0) return;
  const w = 470, h = assist ? 128 : 104, x = 34 - (1 - ent)*120, y = 112;
  const cor = rqCor((autor ? autor.time : I.time) | 0);
  g.save(); g.globalAlpha = a;
  rr(g, x, y + 5, w, h, 22); g.fillStyle = 'rgba(0,0,0,.32)'; g.fill();
  g.save(); rr(g, x, y, w, h, 22); g.clip();
  const ban = autor && autor.banner && typeof v88Item === 'function' ? v88Item(autor.banner) : null;
  if (ban && typeof v88DesenhaBanner === 'function'){ g.save(); g.translate(x, y); try { v88DesenhaBanner(g, w, h, ban, 0); } catch (_) {} g.restore(); }
  else { const gr = g.createLinearGradient(x, y, x + w, y + h); gr.addColorStop(0, cor.base); gr.addColorStop(1, '#0b0820'); g.fillStyle = gr; g.fillRect(x, y, w, h); }
  const sombra = g.createLinearGradient(x, 0, x + w, 0); sombra.addColorStop(0, 'rgba(6,8,26,.25)'); sombra.addColorStop(.55, 'rgba(6,8,26,.72)'); sombra.addColorStop(1, 'rgba(6,8,26,.86)');
  g.fillStyle = sombra; g.fillRect(x, y, w, h);
  g.fillStyle = cor.base; g.fillRect(x, y, 10, h);
  g.restore();
  rr(g, x, y, w, h, 22); g.lineWidth = 4; g.strokeStyle = 'rgba(255,255,255,.85)'; g.stroke();
  // o avatar (o equipado; sem ele, a tampinha)
  const ax = x + 64, ay = y + (assist ? 56 : h/2), ar = 40;
  g.fillStyle = '#0b0820'; g.beginPath(); g.arc(ax, ay, ar + 5, 0, TAU); g.fill();
  try {
    const it = autor && autor.avatar && autor.avatar !== 'av_tampinha' && typeof v88Item === 'function' ? v88Item(autor.avatar) : null;
    if (it && typeof v88DesenhaAvatar === 'function'){ const c = v93MiniAvatar(it); if (c) g.drawImage(c, ax - ar, ay - ar, 2*ar, 2*ar); }
    else if (autor && autor.skin && typeof tpLe === 'function' && tpLe(autor.skin)){ const c = tpMiniatura(tpLe(autor.skin), 96); g.drawImage(c, ax - ar, ay - ar, 2*ar, 2*ar);
      if (autor.emoji && typeof emjPoe === 'function') emjPoe(g, ax, ay, ar*.92, autor.emoji, typeof tpEscalaDe === 'function' ? tpEscalaDe(g) : 1, tpLe(autor.skin)); }   // v95: o emoji de quem marcou
    else if (autor){ const sb = skinDoBot({nome:autor.nome, time:autor.time | 0}); botaoJogo(g, ax, ay, ar, sb, null, false, null);
      if (autor.emoji && typeof emjPoe === 'function') emjPoe(g, ax, ay, ar, autor.emoji, typeof tpEscalaDe === 'function' ? tpEscalaDe(g) : 1, sb && sb.desenho); }
  } catch (_) {}
  g.lineWidth = 4; g.strokeStyle = cor.claro || '#ffffff'; g.beginPath(); g.arc(ax, ay, ar + 3, 0, TAU); g.stroke();
  const tx = x + 124, contra = !autor && I.contra;
  v93TxtEsq(g, contra ? 'GOL CONTRA' : (T && T.nosso === false ? 'GOL DELES' : 'GOL!'), tx + 2, y + 30, 26, '#ffd23f', 'rgba(5,10,25,.95)', 5);
  const nome = autor ? String(autor.nome || '').toUpperCase() : contra ? 'CONTRA' : '';
  const nw = medeTxt(nome, '40px ' + FONT);
  v93TxtEsq(g, nome, tx, y + 68, Math.min(40, 40*(w - 140)/Math.max(1, nw)), '#ffffff', 'rgba(5,10,25,.95)', 7);
  if (assist){ const sa = 'ASSISTÊNCIA · ' + String(assist.nome || '').toUpperCase(), wa = medeTxt(sa, '22px ' + FONT); v93TxtEsq(g, sa, tx, y + 104, Math.min(22, 22*(w - 140)/Math.max(1, wa)), '#cfe0ff', 'rgba(5,10,25,.95)', 5); }
  g.restore();
}
function v93TxtEsq(g, s, x, y, tam, cor, contorno, lw){ const w = medeTxt(s, tam + 'px ' + FONT); txt(g, s, x + w/2, y, tam, cor, contorno, lw); }   // (o txt do jogo é sempre centrado)
const V93P_AV = new Map();
function v93MiniAvatar(it){
  let c = V93P_AV.get(it.id); if (c) return c;
  c = document.createElement('canvas'); c.width = c.height = 96;
  try { v88DesenhaAvatar(c.getContext('2d'), 96, it); } catch (_) { return null; }
  if (V93P_AV.size > 30) V93P_AV.clear(); V93P_AV.set(it.id, c); return c;
}

/* ---------------------------------------------------------------- 5) o painel de jogadores */
function v93PainelMonta(){
  if (V93P.el.bt) return;
  const wrap = document.getElementById('wrap') || document.body;
  const bt = V93P.el.bt = novoBotao('v93-pj-bt', 'Jogadores da partida');
  bt.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="8.5" cy="8" r="3.6" fill="currentColor"/><path d="M1.8 20c0-4.4 3-6.9 6.7-6.9s6.7 2.5 6.7 6.9z" fill="currentColor"/><circle cx="16.6" cy="9" r="3" fill="currentColor"/><path d="M15.8 13.4c3.6-.3 6.4 1.9 6.4 6.6h-5.3" fill="currentColor"/></svg>';
  bt.hidden = true;
  bt.addEventListener('pointerdown', e => e.stopPropagation());
  bt.addEventListener('click', e => { e.stopPropagation(); som.clique(); v93PainelAlterna(); });
  const p = V93P.el.p = nodo('div', 'v93-pj'); p.hidden = true; p.setAttribute('role', 'region'); p.setAttribute('aria-label', 'Jogadores da partida'); p.setAttribute('aria-live', 'off');
  wrap.append(bt, p);
}
function v93PainelAlterna(on){ V93P.aberto = on == null ? !V93P.aberto : !!on; v93PainelPinta(); v93PainelLugar(); }
function v93NaPartida(){ return RQ.on && !lobby.aberto && !editing && !RP.ativo && !fimAberto() && RQ.estado !== 'fim' && !(typeof HE !== 'undefined' && HE.aberto); }   // (na tela do fim, nada por cima)
function v93PainelLugar(){
  const bt = V93P.el.bt, p = V93P.el.p; if (!bt) return;
  const c = cv.getBoundingClientRect(), wr = (bt.offsetParent || document.body).getBoundingClientRect(), k = c.width/W, hk = HUDX.k || 1;
  const L = v93LadoPlacar(), lado = L.lado;               // (do lado do placar — que cresce com o HUD —: à esquerda; se cobrir um controle, à direita)
  let x = L.xs[0], ok = false;
  for (const rot of [true, false]){                         // (primeiro, longe também do rótulo do modo — CASUAL, SALA PRIVADA… —; sem lugar assim, só dos controles)
    for (const x0 of L.xs){
      const R = {x:x0, y:L.y - lado/2, w:lado, h:lado}; let livre = true;
      for (const id of HE_ORDEM){ if (!controleVisivel(id)) continue; const e = el(id); if (heSobra(R, {x:e.x, y:e.y, r:e.r + 10})){ livre = false; break; } }
      if (livre && rot){ try { if (v93RotuloCusto(R)) livre = false; } catch (_) {} }
      if (livre){ x = x0; ok = true; break; }
    }
    if (ok) break;
  }
  V93P.ladoX = x;
  const px = Math.max(36, Math.round(lado*k));
  bt.style.width = bt.style.height = px + 'px';
  bt.style.left = Math.round(c.left - wr.left + x*k + (lado*k - px)/2) + 'px';
  bt.style.top = Math.round(c.top - wr.top + L.y*k - px/2) + 'px';
  bt.classList.toggle('v93-pj-sem-lugar', !ok);
  if (!p.hidden){                                           // o painel embaixo do placar, sem ficar em cima de nenhum controle
    const pw = Math.min(460, c.width - 24); p.style.width = pw + 'px';
    const yv = (PLACAR80.y + PLACAR80.h + 40)*hk, ph = p.offsetHeight, y0 = c.top - wr.top + yv*k;
    let melhor = null;
    for (const xc of [(c.width - pw)/2, 12, c.width - pw - 12]){
      const Rr = {x:c.left + xc, y:c.top + yv*k, w:pw, h:ph}; let custo = Math.abs(xc - (c.width - pw)/2)*.1;
      for (const id of HE_ORDEM){ if (!controleVisivel(id)) continue; const e = el(id); if (heSobra(Rr, {x:c.left + e.x*k, y:c.top + e.y*k, r:e.r*k + 8})) custo += 1000; }
      if (!melhor || custo < melhor.c) melhor = {c:custo, x:xc};
    }
    p.style.left = Math.round(c.left - wr.left + melhor.x) + 'px'; p.style.top = Math.round(y0) + 'px';
  }
}
function v93LadoPlacar(){                                     // os lugares do lado do placar (na tela virtual; o placar cresce com o HUD a partir do meio de cima)
  const hk = HUDX.k || 1, pw = v80PlacarW()*hk, lado = 64*hk, gap = 14*hk, y = (PLACAR80.y + PLACAR80.h/2)*hk;
  return {lado, y, xs:[W/2 - pw/2 - gap - lado, W/2 + pw/2 + gap, W/2 - pw/2 - 2*gap - 2*lado, W/2 + pw/2 + 2*gap + lado]};
}
function v93Linha(o){                                         // uma pessoa no painel: a tampinha, o nome, a posição, o ping e os números
  const li = nodo('li', 'v93-pj-l' + (o.st ? ' st-' + o.st : '') + (o.eu ? ' eu' : ''));
  const av = document.createElement('canvas'); av.width = av.height = 52; av.className = 'v93-pj-av';
  try { const D = o.skin && tpLe(o.skin); if (D) av.getContext('2d').drawImage(tpMiniatura(D, 52), 0, 0, 52, 52); else { const g = av.getContext('2d'); botaoJogo(g, 26, 26, 22, skinDoBot({nome:o.nome, time:o.time | 0}), null, false, null); } } catch (_) {}
  const tx = nodo('span', 'v93-pj-tx');
  const n1 = nodo('b', null, o.nome || 'Jogador'); if (o.pos) n1.prepend(nodo('i', 'v93-pj-pos', o.pos));
  tx.append(n1, nodo('small', null, o.sub || ''));
  li.append(av, tx);
  if (o.e){ const n = nodo('span', 'v93-pj-n'); n.append(nodo('em', null, '⚽ ' + (o.e.g | 0)), nodo('em', null, '👟 ' + (o.e.a | 0)), nodo('em', null, '🧤 ' + (o.e.d | 0))); li.appendChild(n); }
  return li;
}
function v93PainelDados(){                                    // {times:[[...], [...]], fora:[...]} — online pelo servidor, contra os bots pelo aparelho
  const out = {times:[[], []], fora:[]};
  if (NET49.playing && NET49.room){
    const r = NET49.room, Pn = V93P.painel && V93P.painel.round === r.round ? V93P.painel : null, n = r.n | 0;
    const mem = id => (r.members || []).find(x => x.id === id);
    for (let i = 0; i < 2*n; i++){
      const t = Math.floor(i/n), k = i % n, J = Pn && Pn.j ? Pn.j[i] : null, id = J ? J.id : r.roster[i], m = id && mem(id);
      const st = J ? J.st : m ? 'ativo' : 'bot';
      const sub = st === 'caiu' ? 'caiu · o bot segura o lugar' + (J.ate ? ' (' + J.ate + ' s)' : '') : st === 'bot' ? 'bot' : (J && J.ms != null ? J.ms + ' ms' : id === NET49.id ? Math.round(NET49.ping || 0) + ' ms' : 'ativo');
      out.times[t].push({nome:m ? m.name : J ? J.nome : 'Bot', skin:m ? m.skin : '', time:t, pos:String(k + 1), st, sub, eu:id && id === NET49.id, e:J && J.e});
    }
    for (const x of (Pn && Pn.fora) || (r.members || []).filter(x => x.slot < 0).map(x => ({id:x.id, nome:x.name, skin:x.skin, banco:!!x.banco})))
      out.fora.push({nome:x.nome, skin:x.skin, time:0, st:x.banco ? 'banco' : 'espec', sub:x.banco ? 'reserva' : 'assistindo', eu:x.id === NET49.id});
  } else if (RQ.on){
    RQ.jog.forEach((q, i) => {
      const t = q.time | 0, e = V93P.estat.get(q === P ? 'eu' : 'b' + i) || null;
      out.times[t].push({nome:q === P ? perfil.nome : q.nome || 'Bot', skin:q === P ? perfil.skin : q.netSkin || '', time:t, pos:String((q.k | 0) + 1), st:q === P ? 'ativo' : 'bot', sub:q === P ? 'você' : 'bot', eu:q === P, e});
    });
  }
  return out;
}
function v93PainelPinta(){
  const p = V93P.el.p, bt = V93P.el.bt; if (!p) return;
  const vis = v93NaPartida() && !PAUSA.aberta;
  bt.hidden = !vis; bt.setAttribute('aria-pressed', String(!!V93P.aberto));
  p.hidden = !(vis && V93P.aberto);
  if (p.hidden) return;
  const D = v93PainelDados(), cores = [rqCor(0), rqCor(1)];
  p.textContent = '';
  const cab = nodo('div', 'v93-pj-cab'); cab.append(nodo('b', null, 'JOGADORES'), nodo('small', null, NET49.playing ? (NET49.room && NET49.room.ranked ? 'RANQUEADA' : 'SALA ' + (NET49.room ? NET49.room.code : '')) : 'CONTRA OS BOTS'));
  p.appendChild(cab);
  const cols = nodo('div', 'v93-pj-cols');
  D.times.forEach((L, t) => {
    const col = nodo('div', 'v93-pj-time'); col.style.setProperty('--c', cores[t].base);
    col.appendChild(nodo('h4', null, t ? 'TIME B' : 'TIME A'));
    const ul = nodo('ul'); for (const o of L) ul.appendChild(v93Linha(o)); col.appendChild(ul);
    cols.appendChild(col);
  });
  p.appendChild(cols);
  if (D.fora.length){
    const f = nodo('div', 'v93-pj-fora'); f.appendChild(nodo('h4', null, 'BANCO E QUEM ASSISTE'));
    const ul = nodo('ul'); for (const o of D.fora) ul.appendChild(v93Linha(o)); f.appendChild(ul);
    p.appendChild(f);
  }
  p.appendChild(nodo('p', 'v93-pj-leg', '⚽ gols · 👟 assistências · 🧤 defesas'));
  v93PainelLugar();
}
setInterval(() => { try { v93PainelPinta(); if (V93P.el.bt && !V93P.el.bt.hidden) v93PainelLugar(); } catch (_) {} }, 600);
addEventListener('resize', () => { try { v93PainelLugar(); } catch (_) {} });
v93PainelMonta();

/* ---------------------------------------------------------------- 6) o craque da partida na tela do fim */
function v93CraqueEl(){
  let el = document.getElementById('v93-craque');
  if (!el){
    const caixa = document.querySelector('#fim .fim-caixa'), st = document.getElementById('fim-stats'); if (!caixa) return null;
    el = nodo('div', 'v93-craque'); el.id = 'v93-craque'; el.hidden = true;
    if (st && st.parentNode === caixa) caixa.insertBefore(el, st.nextSibling); else caixa.appendChild(el);
  }
  return el;
}
function v93CraqueMonta(el, c, eu){                           // o avatar (a tampinha), o nome, a faixa e os números
  try { if (c && c.skin && typeof tpNoTime === 'function' && (c.time === 0 || c.time === 1)) c = Object.assign({}, c, {skin:tpNoTime(c.skin, c.time)}); } catch (_) {}   // v95: a inicial na cor do time
  el.textContent = '';
  el.classList.toggle('v93-eu', !!eu);
  const av = document.createElement('canvas'); av.width = av.height = 88; av.className = 'v93-craque-av';
  try { const D = c.skin && tpLe(c.skin); if (D) av.getContext('2d').drawImage(tpMiniatura(D, 88), 0, 0, 88, 88); else botaoJogo(av.getContext('2d'), 44, 44, 38, skinDoBot({nome:c.nome, time:c.time | 0}), null, false, null); } catch (_) {}
  const tx = nodo('div', 'v93-craque-tx');
  tx.append(nodo('span', 'v93-craque-tag', eu ? 'VOCÊ É O CRAQUE DA PARTIDA' : 'CRAQUE DA PARTIDA'), nodo('b', null, c.nome + (c.bot ? ' · BOT' : '')));
  const n = nodo('div', 'v93-craque-n');
  for (const [v, r] of [[c.g, 'GOLS'], [c.a, 'ASSIST.'], [c.d, 'DEFESAS'], [c.r, 'DESARMES']]) { const s = nodo('span'); s.append(nodo('b', null, String(v | 0)), nodo('small', null, r)); n.appendChild(s); }
  tx.appendChild(n);
  el.append(av, tx);
}
function v93CraqueMostra(c, eu){
  const el = v93CraqueEl(); if (!el) return;
  el.hidden = !c; if (c) v93CraqueMonta(el, c, eu); else el.textContent = '';
}
function v93CraqueFlutua(c){                                  // quem assistiu não tem a tela do fim: o cartão aparece em cima, por uns segundos
  let el = document.getElementById('v93-craque-flut');
  if (!el){ el = nodo('div', 'v93-craque v93-craque-flut'); el.id = 'v93-craque-flut'; el.setAttribute('role', 'status'); el.hidden = true; (document.getElementById('wrap') || document.body).appendChild(el); }
  v93CraqueMonta(el, c, false); el.hidden = false;
  clearTimeout(V93P.flutT); V93P.flutT = setTimeout(() => { el.hidden = true; }, 7000);
}
function v93CraqueConta(eu){                                  // a conquista no perfil (do aparelho; a da conta vem pelo selo do servidor)
  if (!eu) return;
  try { perfil.st.craque = (perfil.st.craque | 0) + 1; perfilSalvar(); } catch (_) {}
}
const rqMostraFimAntes93 = rqMostraFim;
rqMostraFim = function(){
  const r = rqMostraFimAntes93.apply(this, arguments);
  try {
    if (!NET49.playing && RQ.resultado){
      const R = RQ.resultado, venc = R.placar[0] > R.placar[1] ? 0 : R.placar[1] > R.placar[0] ? 1 : -1;
      const lista = [...V93P.estat.values()].map(e => Object.assign({}, e, {skin:e.k === 'eu' ? perfil.skin : (RQ.jog[+e.k.slice(1)] || {}).netSkin || ''}));
      const c = v93Craque(lista, venc); V93P.craque = c;
      const eu = !!c && c.k === 'eu';
      v93CraqueMostra(c, eu);
      if (eu && !R.v93Craque){ R.v93Craque = true; v93CraqueConta(true); }
    }
  } catch (e) { console.error('v93 craque', e); }
  return r;
};
const net49ResultAntes93 = net49Result;
net49Result = function(m){
  V93P.replay = null; V93P.contagem = null;                    // (a partida acabou: nada de replay nem contagem pendurados)
  const espec = NET49.localSlot < 0, nova = !!m && NET49.lastResult !== m.round;
  const r = net49ResultAntes93.apply(this, arguments);
  try {
    const c = m && m.craque;
    if (c && nova){
      const mem = c.id && NET49.room && (NET49.room.members || []).find(x => x.id === c.id);
      const eu = !!c.id && c.id === NET49.id, d = Object.assign({}, c, {skin:c.skin || (mem ? mem.skin : '')});
      if (espec) v93CraqueFlutua(d); else v93CraqueMostra(d, eu);
      if (eu && m.valida) v93CraqueConta(true);
    } else if (nova) v93CraqueMostra(null);
  } catch (e) { console.error('v93 craque', e); }
  return r;
};

/* ---------------------------------------------------------------- 7) o banco de reservas: quem assiste, ao lado do campo */
function v93Banco(g){
  if (!NET49.playing || !NET49.room || RP.ativo) return;
  const fora = (NET49.room.members || []).filter(x => x.slot < 0 && !x.bot).slice(0, 12);
  if (!fora.length) return;
  const y = GB + U(AR_MURETA) + U(.12) + U(.85), r = U(.5), passo = U(1.1);
  fora.forEach((m, i) => {
    const lado = i % 2 ? 1 : -1, j = Math.floor(i/2), x = CX + lado*(U(2.2) + j*passo) + (lado < 0 ? -U(.25) : U(.25));
    try { botaoJogo(g, x, y, r, tpEhCodigo(m.skin) ? tpSkin(m.skin) : skinPorId(m.skin), null, true, null); } catch (_) {}
    try { if (m.banco) txt(g, 'RESERVA', x, y + r + U(.45), U(.42), '#ffe9a8', 'rgba(5,10,25,.9)', U(.1)); } catch (_) {}
  });
}
const v88DesenhaMundoAntes93 = v88DesenhaMundo;
v88DesenhaMundo = function(g){ const r = v88DesenhaMundoAntes93.apply(this, arguments); try { v93Banco(g); } catch (_) {} return r; };

/* ---------------------------------------------------------------- 8) o desenho por cima de tudo: a contagem */
const desenhaArmadoAntes93 = desenhaArmado;
desenhaArmado = function(){ const r = desenhaArmadoAntes93.apply(this, arguments); try { if (V93P.contagem && RQ.on) v93DesenhaContagem(ctx); } catch (_) {} return r; };
