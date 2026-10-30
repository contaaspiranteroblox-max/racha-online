/* ==================================================================================================================
   RACHA v93 · Fase 3 — O PAINEL DO ADMIN DA SALA (salas personalizadas; nunca na ranqueada)
   Um painel lateral compacto, com a lista de quem está na sala (TIME A, TIME B e o BANCO/quem assiste) e botões pequenos:
     · MOVER: para o outro time (com o time cheio, escolhe com quem troca de lugar);
     · RESERVA: tira um jogador do time para o banco (na partida, o bot segura o lugar);
     · ENTRAR: quem está no banco (ou assistindo) entra no lugar de um jogador — ou numa vaga de bot — na partida também;
     · ADMIN: passa a administração para outro jogador;
     · ENCERRAR (com confirmação): acaba a partida agora (o placar fica; o resultado não vale prêmio, como sempre que o
       árbitro encerra) · REINICIAR (com confirmação): começa de novo, 0 × 0, com os mesmos times e a contagem.
   Cada ação vai para o servidor (adm {acao, id, slot}), que confere tudo (só o admin, só sala personalizada, o lugar
   certo, ninguém em dois lugares), muda a sala e a partida (o placar, o relógio e os números de cada um continuam) e manda
   para todos; o servidor registra as ações no log e no chat da sala. Abre pela PAUSA (ADMIN DA SALA) e na tela da sala.
   Quando o admin move você no meio da partida, a sua tampinha passa a ser a do lugar novo (o jogo acompanha na hora).
   ================================================================================================================== */
const V93A = {el:null, aberto:false, escolhe:null, conf:null, k:''};

function v93SouAdmin(){ const r = NET49.room; return !!(r && r.servidor && !r.ranked && !r.tournament && r.admin && r.admin === NET49.id); }
function v93AdmManda(acao, o){ net49Send(Object.assign({type:'adm', acao}, o || {})); }

/* ---------------------------------------------------------------- 1) o painel */
function v93AdmMonta(){
  if (V93A.el) return V93A.el;
  const el = V93A.el = nodo('aside', 'v93-adm'); el.hidden = true; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Admin da sala');
  document.body.appendChild(el);                               // (por cima da partida e da tela da sala)
  el.addEventListener('pointerdown', e => e.stopPropagation());
  return el;
}
function v93AdmAbre(){ if (!v93SouAdmin()) return; v93AdmMonta(); V93A.aberto = true; V93A.escolhe = null; V93A.conf = null; V93A.k = ''; v93AdmPinta(); }
function v93AdmFecha(){ V93A.aberto = false; V93A.escolhe = null; V93A.conf = null; V93A.k = ''; if (V93A.el) V93A.el.hidden = true; }
function v93AdmChave(r){                                     // (o painel só é refeito quando muda o que ele mostra: o toque num botão nunca se perde)
  return JSON.stringify([r.code, r.state, r.n, r.admin, r.bots, r.roster, (r.members || []).map(x => [x.id, x.name, x.slot, !!x.banco, !!x.bot]),
    V93A.escolhe && V93A.escolhe.id, V93A.conf && V93A.conf.tit, NET49.id]);
}
function v93AdmBt(txt, cls, fn, rot){ const b = novoBotao('v93-adm-bt' + (cls ? ' ' + cls : ''), rot || txt); b.textContent = txt; b.addEventListener('click', e => { e.stopPropagation(); som.clique(); fn(); }); return b; }
function v93AdmPinta(){
  const el = V93A.el; if (!el) return;
  const r = NET49.room;
  if (!V93A.aberto || !r || !v93SouAdmin()){ el.hidden = true; V93A.k = ''; return; }
  const k = v93AdmChave(r); if (k === V93A.k && !el.hidden){ v93AdmTopo(el); return; }
  V93A.k = k; el.hidden = false; el.textContent = '';
  const n = r.n | 0, jogando = r.state === 'playing', mem = id => (r.members || []).find(x => x.id === id);
  const cab = nodo('div', 'v93-adm-cab');
  cab.append(nodo('b', null, 'ADMIN DA SALA'), nodo('small', null, (jogando ? 'PARTIDA ROLANDO · ' : 'ANTES DE COMEÇAR · ') + 'SALA ' + r.code));
  cab.appendChild(v93AdmBt('✕', 'v93-adm-x', v93AdmFecha, 'Fechar o painel do admin'));
  el.appendChild(cab);
  if (V93A.escolhe){                                           // escolhendo o lugar (ou com quem trocar)
    const E = V93A.escolhe, quem = mem(E.id);
    el.appendChild(nodo('p', 'v93-adm-nota', 'Onde ' + (quem ? quem.name : 'ele') + ' entra? Toque num lugar' + (jogando ? ' (o bot sai; quem está lá vai para o banco).' : '.')));
  }
  for (let t = 0; t < 2; t++){
    const box = nodo('div', 'v93-adm-time'); box.style.setProperty('--c', rqCor(t).base);
    box.appendChild(nodo('h4', null, t ? 'TIME B' : 'TIME A'));
    const ul = nodo('ul');
    for (let k = 0; k < n; k++){
      const i = t*n + k, id = r.roster[i], m = id && mem(id), li = nodo('li', 'v93-adm-l' + (m ? '' : ' vaga'));
      li.append(nodo('i', 'v93-adm-pos', String(k + 1)), nodo('span', 'v93-adm-nome', m ? m.name + (id === NET49.id ? ' (você)' : '') : (jogando || r.bots ? 'Bot' : 'vaga')));
      const ac = nodo('span', 'v93-adm-ac');
      if (V93A.escolhe){
        if (!m || m.id !== V93A.escolhe.id) ac.appendChild(v93AdmBt(m ? 'TROCAR' : 'AQUI', 'verde', () => { v93AdmManda('mover', {id:V93A.escolhe.id, slot:i}); V93A.escolhe = null; v93AdmPinta(); }, 'Colocar aqui'));
      } else if (m){
        ac.appendChild(v93AdmBt('MOVER', '', () => v93AdmMover(m, 1 - t), 'Mover ' + m.name + ' para o outro time'));
        ac.appendChild(v93AdmBt('RESERVA', '', () => v93AdmManda('reserva', {id:m.id}), 'Mandar ' + m.name + ' para o banco'));
        if (m.id !== NET49.id) ac.appendChild(v93AdmBt('ADMIN', 'amarelo', () => v93AdmConfirma('PASSAR O ADMIN PARA ' + m.name.toUpperCase() + '?', 'Você continua na sala, mas quem manda passa a ser ' + m.name + '.', 'PASSAR', () => v93AdmManda('admin', {id:m.id})), 'Passar o admin para ' + m.name));
      }
      li.appendChild(ac); ul.appendChild(li);
    }
    box.appendChild(ul); el.appendChild(box);
  }
  const fora = (r.members || []).filter(x => x.slot < 0 && !x.bot);
  const fb = nodo('div', 'v93-adm-fora'); fb.appendChild(nodo('h4', null, 'BANCO E QUEM ASSISTE'));
  if (!fora.length) fb.appendChild(nodo('p', 'v93-adm-nota', 'Ninguém no banco. Quem entra pelo código da sala aparece aqui.'));
  else {
    const ul = nodo('ul');
    for (const m of fora){
      const li = nodo('li', 'v93-adm-l'); li.append(nodo('i', 'v93-adm-pos', m.banco ? 'R' : '·'), nodo('span', 'v93-adm-nome', m.name + (m.banco ? ' · reserva' : '')));
      const ac = nodo('span', 'v93-adm-ac');
      ac.appendChild(v93AdmBt(V93A.escolhe && V93A.escolhe.id === m.id ? 'CANCELAR' : 'ENTRAR', 'verde', () => { V93A.escolhe = V93A.escolhe && V93A.escolhe.id === m.id ? null : {id:m.id}; v93AdmPinta(); }, 'Colocar ' + m.name + ' num time'));
      if (m.id !== NET49.id) ac.appendChild(v93AdmBt('ADMIN', 'amarelo', () => v93AdmManda('admin', {id:m.id}), 'Passar o admin para ' + m.name));
      li.appendChild(ac); ul.appendChild(li);
    }
    fb.appendChild(ul);
  }
  el.appendChild(fb);
  const pe = nodo('div', 'v93-adm-pe');
  if (jogando){
    pe.appendChild(v93AdmBt('REINICIAR', '', () => v93AdmConfirma('REINICIAR A PARTIDA?', 'O placar volta a 0 × 0, com os mesmos times, e a contagem começa de novo.', 'REINICIAR', () => v93AdmManda('reiniciar')), 'Reiniciar a partida'));
    pe.appendChild(v93AdmBt('ENCERRAR', 'vermelho', () => v93AdmConfirma('ENCERRAR A PARTIDA AGORA?', 'O placar de agora fica no fim. A partida encerrada pelo admin não vale prêmio nem patente.', 'ENCERRAR', () => v93AdmManda('encerrar')), 'Encerrar a partida'));
  }
  el.appendChild(pe);
  if (V93A.conf){
    const C = V93A.conf, cx = nodo('div', 'v93-adm-conf');
    cx.append(nodo('b', null, C.tit), nodo('p', null, C.txt));
    const ac = nodo('div', 'v93-adm-conf-ac');
    ac.append(v93AdmBt('CANCELAR', '', () => { V93A.conf = null; v93AdmPinta(); }), v93AdmBt(C.ok, 'vermelho', () => { const f = C.fn; V93A.conf = null; f(); v93AdmPinta(); }));
    cx.appendChild(ac); el.appendChild(cx);
  }
  v93AdmTopo(el);
}
function v93AdmTopo(el){                                      // por cima do placar (e dos botões do lado dele), não: o painel começa embaixo
  try {
    const c = cv.getBoundingClientRect(), k = c.width/W, L = v93LadoPlacar(), dir = c.left + (L.xs[3] + L.lado)*k, baixo = c.top + (L.y + L.lado/2)*k + 6;
    el.style.setProperty('--v93-adm-top', (innerWidth - el.offsetWidth - 8 < dir ? Math.round(baixo) : 0) + 'px');
  } catch (_) {}
  let fim = 0;                                                // na tela da sala: o painel termina em cima do INICIAR e dos atalhos (o ADMIN)
  try {
    if (lobby.aberto && SL.el && !SL.el.hidden){
      const esq = innerWidth - el.offsetWidth - 16;
      const tops = [document.getElementById('sl-iniciar'), SL.el.querySelector('.v70-sl-atalhos')].filter(x => x && !x.hidden && x.offsetParent)
        .map(x => x.getBoundingClientRect()).filter(r => r.width > 4 && r.right > esq).map(r => r.top);
      if (tops.length) fim = Math.max(0, Math.round(innerHeight - Math.min(...tops) + 6));
    }
  } catch (_) {}
  el.style.setProperty('--v93-adm-fim', fim + 'px');
}
addEventListener('resize', () => { try { if (V93A.aberto && V93A.el) v93AdmTopo(V93A.el); } catch (_) {} });
function v93AdmMover(m, t){
  const r = NET49.room, n = r.n | 0, livre = r.roster.slice(t*n, t*n + n).some(x => !x);
  if (livre) return v93AdmManda('mover', {id:m.id, time:t});   // (a vaga livre — na partida, a do bot — o servidor acha)
  V93A.escolhe = {id:m.id}; v93AdmPinta();                     // (o time está cheio: com quem ele troca?)
}
function v93AdmConfirma(tit, txt, ok, fn){ V93A.conf = {tit, txt, ok, fn}; v93AdmPinta(); }

/* ---------------------------------------------------------------- 2) por onde abre: a pausa e a tela da sala */
(function(){
  try {
    const ref = document.getElementById('pa-ajustes'); if (!ref) return;
    const b = novoBotao('pa-bt v93-pa-adm', 'Admin da sala: times, banco, encerrar'); b.id = 'pa-adm';
    const ic = nodo('i', 'v71-ic'); ic.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l8 3v6.2c0 4.8-3.4 8.4-8 9.8-4.6-1.4-8-5-8-9.8V5.5z" fill="currentColor"/><path d="M8.3 12.2l2.6 2.6 4.8-5" fill="none" stroke="#1b2236" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    b.append(ic, document.createTextNode('ADMIN DA SALA'));
    b.addEventListener('click', () => { som.clique(); pausaFecha(); v93AdmAbre(); });
    const poe = () => { const quer = NET49.playing && v93SouAdmin(); if (quer && !b.isConnected) ref.parentNode.insertBefore(b, ref); else if (!quer && b.isConnected) b.remove(); };
    const antes = pausaAbre;
    pausaAbre = function(){ try { poe(); } catch (_) {} const r = antes.apply(this, arguments); try { v93PausaColunas(); } catch (_) {} return r; };
    const ac = ref.parentNode; if (ac) new MutationObserver(() => { try { v93PausaColunas(); } catch (_) {} }).observe(ac, {childList:true, subtree:true, attributes:true, attributeFilter:['hidden']});
  } catch (_) {}
})();
// com 5 botões ou mais na pausa (o ADMIN DA SALA, o LAYOUT ⇄…), no celular deitado eles vão para duas colunas: cabe sem rolar
// (com um número ímpar de botões, o CONTINUAR fica com a linha inteira)
function v93PausaColunas(){
  const ac = document.querySelector('#pausa .pa-acoes'), cx = document.querySelector('#pausa .pa-caixa'); if (!ac || !cx) return;
  const vis = [...ac.children].filter(b => b.classList.contains('pa-bt') && !b.hidden), duas = vis.length >= 5;
  if (ac.classList.contains('v93-duas') !== duas){ ac.classList.toggle('v93-duas', duas); cx.classList.toggle('v93-duas', duas); }
  for (const b of ac.children){ const larga = duas && vis.length % 2 === 1 && b === vis[0]; if (b.classList.contains('v93-larga') !== larga) b.classList.toggle('v93-larga', larga); }
}

// e na tela da sala (antes de começar e com a partida rolando): o botão ADMIN junto dos atalhos de sempre (ENTRAR NO TIME,
// MONTAR COM BOTS: em cima do INICIAR no computador; no celular deitado, a linha logo acima das regras)
const slRenderAntes93a = slRender;
slRender = function(){
  const r0 = slRenderAntes93a.apply(this, arguments);
  try {
    const el = SL.el; if (!el || el.hidden) return r0;
    const bar = el.querySelector('.v70-sl-atalhos'); if (!bar) return r0;
    let b = bar.querySelector('.v93-sl-adm');
    const quer = v93SouAdmin();
    if (!b && quer){
      b = novoBotao('sl-botao v70-sl-at v93-sl-adm', 'Admin da sala: times, banco, encerrar'); b.innerHTML = '<b>ADMIN</b><small>times e banco</small>';
      b.addEventListener('click', e => { e.stopPropagation(); som.clique(); v93AdmAbre(); });
      bar.appendChild(b);
    }
    if (b){ b.hidden = !quer; try { b.style.setProperty('--v93-palco', String(Math.max(.2, PALCO.s || 1))); } catch (_) {} }   // (a escala do palco: o piso de 44 px)
    bar.hidden = [...bar.children].every(x => x.hidden);
  } catch (_) {}
  return r0;
};

/* ---------------------------------------------------------------- 3) a sala mudou: o painel e — se o admin mexeu em você — a sua tampinha */
function v93AdmLugares(room){                                 // na partida, os lugares mudaram: cada tampinha com quem joga nela agora
  if (!NET49.playing || !room || !Array.isArray(room.roster) || !Array.isArray(RQ.jog) || RQ.jog.length !== room.roster.length) return;
  const novo = room.roster.indexOf(NET49.id), velho = NET49.localSlot, n = room.n | 0;
  if (novo !== velho){                                         // o admin mexeu em você: a sua tampinha passa a ser a do lugar novo
    const alvo = novo >= 0 ? novo : (velho >= 0 ? velho : 0), jog = RQ.jog.slice(), eu = jog.indexOf(P);
    if (alvo !== eu){                                          // (só a sua tampinha e a do lugar novo trocam de posição na lista)
      const o = jog[alvo], pos = {x:P.x, y:P.y, ax:P.ax, ay:P.ay, vx:P.vx, vy:P.vy};
      Object.assign(P, {x:o.x, y:o.y, ax:o.ax, ay:o.ay, vx:o.vx, vy:o.vy}); Object.assign(o, pos);
      jog[eu] = o; jog[alvo] = P;
    }
    jog.forEach((q, i) => { q.id = i; q.time = Math.floor(i/n); q.k = i % n; });
    RQ.jog = jog; RQ.bots = jog.filter(q => q !== P);
    NET49.localSlot = novo; NET49.pending = [];
    try { if (typeof v92RedeInicia === 'function') v92RedeInicia(room); } catch (e) { try { V92N.on = false; } catch (_) {} }   // (a previsão do aparelho recomeça no lugar novo)
    try { X49UI.chat.hidden = NET49.localSlot < 0; } catch (_) {}
    try { resetBotoes(); joy.id = null; joy.dx = joy.dy = 0; joy.ativo = false; ptrs.clear(); } catch (_) {}
    try { x49Toast(novo < 0 ? 'O admin te mandou para o banco: você está assistindo.' : 'O admin te colocou no ' + (Math.floor(novo/n) ? 'Time B' : 'Time A') + '.'); } catch (_) {}
  }
  for (let i = 0; i < RQ.jog.length; i++){                      // os nomes e as tampinhas de cada lugar
    const q = RQ.jog[i], id = room.roster[i], m = id && (room.members || []).find(x => x.id === id);
    q.netId = id || null; q.remote = !!id && id !== NET49.id; q.humano = i === NET49.localSlot;
    q.nome = m ? m.name : 'Bot ' + (i + 1); q.netSkin = m ? m.skin : (typeof net49BotSkin === 'function' ? net49BotSkin(room, i) : q.netSkin);
  }
}
const net49MessageAntes93a = net49Message;
net49Message = function(m){
  const r = net49MessageAntes93a.apply(this, arguments);
  try {
    if (m && m.type === 'room' && m.room){ if (m.room.state === 'playing') v93AdmLugares(m.room); if (V93A.aberto) v93AdmPinta(); }
    if (m && m.type === 'error' && m.codigo === 'adm') x49Toast(m.message || 'O servidor recusou a ação do admin.');
  } catch (e) { console.error('v93 admin', e); }
  return r;
};
// o ENCERRAR do árbitro na sala hospedada: agora vai para o servidor (antes: "daqui não dá para encerrar")
const arbEncerraAntes93 = arbEncerra;
arbEncerra = function(quem){
  const r = NET49.room;
  if (r && r.servidor && NET49.playing && v93SouAdmin()){ v93AdmAbre(); v93AdmConfirma('ENCERRAR A PARTIDA AGORA?', 'O placar de agora fica no fim. A partida encerrada pelo admin não vale prêmio nem patente.', 'ENCERRAR', () => v93AdmManda('encerrar')); return; }
  return arbEncerraAntes93.apply(this, arguments);
};
setInterval(() => { try { if (V93A.aberto && (!NET49.room || !v93SouAdmin())) v93AdmFecha(); } catch (_) {} }, 1000);
