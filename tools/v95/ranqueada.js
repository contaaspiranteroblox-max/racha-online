/* ======================================================================================================================
   RACHA v95 · A RANQUEADA MAIS DAORA NA HORA DE JOGAR
   · no JOGAR (a folha da ranqueada): a faixa AO VIVO — quantos estão ONLINE, quantos JOGANDO e quantos PROCURANDO —, em cada
     tamanho de time (1v1 a 4v4) quantos procuram aquele tamanho agora (o mais cheio ganha o RÁPIDO) e, no JOGAR RANQUEADA,
     quanto deve demorar; a sua sequência de vitórias e a melhor patente; a insígnia com o brilho que pulsa;
   · a BUSCA: o radar em volta da insígnia, as contagens ao vivo e as dicas; e, quando acha gente online, a tela PARTIDA
     ENCONTRADA com os dois times (as tampinhas com o emoji de cada um), por cima do começo — sem atrasar nada;
   · as contagens vêm do servidor das salas (server/fila95.js: só números, nenhum nome); sem servidor ou sem conta, a faixa
     diz que a ranqueada é contra os bots.
   ====================================================================================================================== */
const V95R = {info:null, infoT:0, achou:null, achouT:0, dica:0};
const V95_DICAS = ['O passe vale assistência até 10 s antes do gol.', 'Vitória contra o Difícil vale +6 pontos.', '3 vitórias seguidas: +4 pontos por partida.',
  'Sair no meio conta derrota (−25).', 'Uma derrota tira da divisão, nunca da patente.', 'Quanto mais gente procurando o mesmo tamanho, mais rápido acha.'];
function v95Online(){ try { return typeof v79OnlinePode === 'function' && v79OnlinePode(); } catch (_) { return false; } }
function v95PrecisaConta(){ try { return typeof v88TemPlataforma === 'function' && v88TemPlataforma() && !v88Logado(); } catch (_) { return false; } }
function v95Conectado(){ try { return !!(NET49.ws && NET49.ws.readyState === 1 && NET49.id); } catch (_) { return false; } }
function v95PedeInfo(){ if (v95Conectado()) try { net49Send({type:'fila_info'}); } catch (_) {} }
function v95InfoFresca(){ return V95R.info && performance.now() - V95R.infoT < 12000 ? V95R.info : null; }
function v95FolhaAberta(){ return !!(RQP.raiz && !RQP.raiz.hidden); }
function v95BuscaAberta(){ return !!(V79R.el && !V79R.el.hidden && V79R.busca); }
setInterval(() => { if (v95FolhaAberta() || v95BuscaAberta()) v95PedeInfo(); }, 3000);
function v95Espera(n, I){                                       // quanto deve demorar (pelo que está na fila agora)
  if (!I) return '';
  const b = I.busca[n - 1] | 0;
  if (b >= 2*n - 1) return 'NA HORA';
  if (n >= 2 && b >= 1) return '~8 S';
  return 'ATÉ 20 S';
}

/* ---------------------------------------------------------------- a folha do JOGAR */
function v95FolhaMonta(){
  const cx = RQP.raiz && RQP.raiz.querySelector('.rq-caixa'); if (!cx) return null;
  let viva = cx.querySelector('.v95-vivo');
  if (!viva){
    viva = nodo('div', 'v95-vivo'); viva.setAttribute('role', 'status'); viva.setAttribute('aria-live', 'polite');
    const cab = document.getElementById('rq-cab-rq'); if (cab) cab.after(viva); else cx.insertBefore(viva, cx.firstChild);
    const ins = document.getElementById('rq-ins'); if (ins) ins.classList.add('v95-ins-brilho');
  }
  return viva;
}
function v95Num(n, rot, cls){ const s = nodo('span', 'v95-vivo-n ' + (cls || '')); s.append(nodo('i', null), nodo('b', null, fmtNum(n | 0)), nodo('small', null, rot)); return s; }
function v95PintaFolha(){
  if (!RQP.raiz) return;
  const viva = v95FolhaMonta(); if (!viva) return;
  const rq = JG.aba === 'ranked', I = v95InfoFresca();
  viva.hidden = !rq; if (!rq) return;
  viva.textContent = '';
  const tag = nodo('span', 'v95-vivo-tag', 'AO VIVO');
  if (I){
    viva.classList.remove('off');
    viva.append(tag, v95Num(I.online, 'ONLINE', 'on'), v95Num(I.jogando, 'JOGANDO', 'jo'), v95Num((I.busca || []).reduce((a, b) => a + (b | 0), 0), 'PROCURANDO', 'pr'));
  } else {
    viva.classList.add('off');
    const tx = !v95Online() ? (window.RACHA_SEM_REDE ? 'Esta versão não tem o servidor online: a ranqueada é contra bots (vale patente igual).' : 'Sem servidor online aqui: a ranqueada é contra bots (vale patente igual).')
      : v95PrecisaConta() ? 'Entre na sua conta para jogar online. Sem conta, a ranqueada é contra bots.'
      : 'Conectando ao servidor para ver quem está online…';
    viva.append(nodo('span', 'v95-vivo-tag off', v95Online() && !v95PrecisaConta() ? 'AO VIVO' : 'OFFLINE'), nodo('small', 'v95-vivo-tx', tx));
  }
  // em cada tamanho de time: quantos procuram agora (o mais cheio é o RÁPIDO)
  let max = 0; if (I) for (const b of I.busca || []) max = Math.max(max, b | 0);
  for (const b of RQP.times.children){
    const n = +b.dataset.n; let em = b.querySelector('.v95-tn');
    if (!em){ em = nodo('em', 'v95-tn'); b.appendChild(em); }
    const k = I ? (I.busca[n - 1] | 0) : 0;
    em.hidden = !I; em.textContent = I ? (k ? k + (k === 1 ? ' PROCURA' : ' PROCURAM') : 'NINGUÉM') : '';
    b.classList.toggle('v95-quente', !!I && k > 0 && k === max);
    b.setAttribute('aria-label', b.textContent.replace(/\s+/g, ' ').trim());
  }
  // o JOGAR RANQUEADA: quanto deve demorar
  const bt = RQP.buscar; if (bt){                              // (no data-espera: o texto do botão continua só JOGAR RANQUEADA)
    const esp = I ? v95Espera(RQP.n, I) : '';
    if (esp) bt.dataset.espera = 'ESPERA: ' + esp; else delete bt.dataset.espera;
    bt.classList.add('v95-brilha');
  }
  // a sequência e a melhor patente (embaixo do nome da patente)
  const elo = document.querySelector('#rq-cab-rq .rq-elo'); if (elo){
    let ex = elo.querySelector('.v95-rq-extra'); if (!ex){ ex = nodo('span', 'v95-rq-extra'); elo.appendChild(ex); }
    ex.textContent = '';
    const C = CONTA.rq, seq = C.seq | 0, melhor = C.melhor | 0;
    if (seq >= 2) ex.appendChild(nodo('em', 'v95-seq', '🔥 ' + seq + ' VITÓRIAS SEGUIDAS'));
    if (melhor > (C.pts | 0)) ex.appendChild(nodo('em', 'v95-melhor', 'MELHOR: ' + rqElo(melhor).nome));
    ex.hidden = !ex.childNodes.length;
  }
}
const renderRanqueadaAntes95 = renderRanqueada;
renderRanqueada = function(){
  const r = renderRanqueadaAntes95.apply(this, arguments);
  try { v95PintaFolha(); if (!V95R.pedidoT || performance.now() - V95R.pedidoT > 2500){ V95R.pedidoT = performance.now(); v95PedeInfo(); } } catch (e) { console.error('v95 jogar', e); }
  return r;
};

/* ---------------------------------------------------------------- a busca: o radar, as contagens e as dicas */
const v79BuscaMontaAntes95 = v79BuscaMonta;
v79BuscaMonta = function(){
  const novo = !V79R.el, el = v79BuscaMontaAntes95.apply(this, arguments);
  if (novo && el){
    const ins = el.querySelector('.v79-busca-ins');
    if (ins){ const radar = nodo('span', 'v95-radar'); radar.setAttribute('aria-hidden', 'true'); radar.append(nodo('i'), nodo('i'), nodo('i'), nodo('b')); ins.before(radar); radar.appendChild(ins); }
    const st = el.querySelector('.v79-busca-st');
    const viva = nodo('div', 'v95-busca-vivo'); viva.setAttribute('aria-live', 'polite');
    const dica = nodo('p', 'v95-busca-dica');
    if (st){ st.before(viva); st.after(dica); }
  }
  return el;
};
const v79BuscaPintaAntes95 = v79BuscaPinta;
v79BuscaPinta = function(){
  const r = v79BuscaPintaAntes95.apply(this, arguments);
  try {
    const B = V79R.busca, el = V79R.el; if (!B || !el) return r;
    const viva = el.querySelector('.v95-busca-vivo'), I = v95InfoFresca(), n = B.n;
    if (viva){
      viva.textContent = '';
      if (I && B.fase !== 'sem'){
        viva.append(v95Num(I.busca[n - 1] | 0, 'PROCURANDO ' + n + 'V' + n, 'pr'), v95Num(I.online, 'ONLINE', 'on'), v95Num(I.jogando, 'JOGANDO', 'jo'));
      }
      viva.hidden = !viva.childNodes.length;
    }
    const d = el.querySelector('.v95-busca-dica');
    if (d){ const s = Math.floor((performance.now() - B.t0)/4000); const t = 'DICA: ' + V95_DICAS[(V95R.dica + s) % V95_DICAS.length]; if (d.textContent !== t) d.textContent = t; }
    el.classList.toggle('v95-busca', true);
  } catch (_) {}
  return r;
};
const v79BuscaAbreAntes95 = v79BuscaAbre;
v79BuscaAbre = function(){ V95R.dica = Math.floor(Math.random()*V95_DICAS.length); const r = v79BuscaAbreAntes95.apply(this, arguments); v95PedeInfo(); return r; };

/* ---------------------------------------------------------------- o servidor: as contagens e a PARTIDA ENCONTRADA */
const net49MessageAntes95r = net49Message;
net49Message = function(m){
  if (m && m.type === 'fila_info'){
    const b = Array.isArray(m.busca) ? m.busca.slice(0, 4).map(x => Math.max(0, x | 0)) : [0, 0, 0, 0];
    while (b.length < 4) b.push(0);
    V95R.info = {online:Math.max(0, m.online | 0), jogando:Math.max(0, m.jogando | 0), salas:Math.max(0, m.salas | 0), busca:b}; V95R.infoT = performance.now();
    try { v95PintaFolha(); if (v95BuscaAberta()) v79BuscaPinta(); } catch (_) {}
    return;
  }
  const buscando = !!V79R.busca;
  const r = net49MessageAntes95r.apply(this, arguments);
  try { if (m && m.type === 'start' && m.room && m.room.ranked && buscando) v95Encontrada(m.room); } catch (e) { console.error('v95 encontrada', e); }
  return r;
};
function v95Encontrada(room){                                   // os dois times por cima do começo (2,4 s, sem segurar nada)
  let el = document.getElementById('v95-achou');
  if (!el){ el = nodo('div', 'v95-achou'); el.id = 'v95-achou'; el.setAttribute('role', 'status'); el.setAttribute('aria-live', 'assertive'); (document.getElementById('wrap') || document.body).appendChild(el); }
  el.textContent = '';
  const n = Math.max(1, room.n | 0), ms = Array.isArray(room.members) ? room.members : [], ros = Array.isArray(room.roster) ? room.roster : [];
  const time = t => {
    const col = nodo('div', 'v95-achou-time t' + t);
    for (let k = 0; k < n; k++){
      const id = ros[t*n + k], m = id ? ms.find(x => x.id === id) : null;
      const d = nodo('div', 'v95-achou-j' + (id && id === NET49.id ? ' eu' : ''));
      let cv = null;
      const emoji = m ? (id === NET49.id ? emjMeu() : emjDeMembro(m)) : emjBot('Bot ' + (t*n + k + 1));
      try { cv = emjMiniatura(m ? m.skin : '', emoji, 64); } catch (_) {}
      if (cv) d.appendChild(cv);
      d.appendChild(nodo('b', null, m ? m.name : 'Bot ' + (t*n + k + 1)));
      if (m && !m.bot && m.rq != null) d.appendChild(nodo('small', null, rqElo(m.rq | 0).nome));
      col.appendChild(d);
    }
    return col;
  };
  const meio = nodo('div', 'v95-achou-meio'); meio.append(nodo('span', 'v95-achou-tag', 'RANQUEADA · ' + n + 'V' + n), nodo('h2', null, 'PARTIDA ENCONTRADA!'), nodo('b', 'v95-achou-vs', 'VS'));
  el.append(time(0), meio, time(1));
  el.hidden = false; el.classList.remove('sai'); void el.offsetWidth; el.classList.add('entra');
  try { som.nivel(); } catch (_) {}
  clearTimeout(V95R.achouT); V95R.achouT = setTimeout(() => { el.classList.add('sai'); setTimeout(() => { el.hidden = true; el.classList.remove('entra', 'sai'); }, 450); }, 2400);
}
window.RachaRanqueada95 = {info:() => V95R.info, pinta:v95PintaFolha, encontrada:v95Encontrada, espera:v95Espera};
