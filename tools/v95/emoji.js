/* ======================================================================================================================
   RACHA v95 · OS EMOJIS DA TAMPINHA (as folhas de emojis que o dono mandou: 102 entram, por raridade, na LOJA › EMOJIS)
   · o emoji equipado vai NO MEIO da tampinha (cobre o desenho do meio; a saia dentada e o anel continuam os da tampinha):
     na partida (treino, contra os bots, online e no replay), na tela inicial, no perfil, no fim da partida e na loja;
   · cada um vê o emoji dos outros na partida online (vem no cartão da sala, assinado pela conta: ninguém põe um emoji que
     não comprou); os bots ganham um emoji comum ou raro, sempre o mesmo para o mesmo nome;
   · com conta: comprar e equipar na conta (o servidor confere o preço e o que é seu, como os outros itens); sem conta: os 4
     de graça equipam no aparelho; sem o servidor do RACHA (a demonstração) a loja dos emojis usa as moedas do aparelho;
   · só aparência: o tamanho, a física e o toque continuam os mesmos para todo mundo.
   O atlas (176 px cada, WebP) vem embutido pelo build (a marca do atlas abaixo); tools/v95/emojis_atlas.py refaz.
   ====================================================================================================================== */
const EMJ = {atlas:/*EMJ95*/null, img:null, pronto:false, spr:new Map(), forca:'', loc:{tem:[], eq:''}, bots:null, CHAVE:'racha-emoji-v95'};
try { const o = JSON.parse(localStorage.getItem(EMJ.CHAVE) || 'null'); if (o && typeof o === 'object'){ EMJ.loc.tem = Array.isArray(o.tem) ? o.tem.filter(x => typeof x === 'string' && /^emoji_[a-z0-9_]{2,34}$/.test(x)).slice(0, 200) : []; EMJ.loc.eq = typeof o.eq === 'string' ? o.eq : ''; } } catch (_) {}
function emjSalvaLocal(){ try { localStorage.setItem(EMJ.CHAVE, JSON.stringify(EMJ.loc)); } catch (_) {} }
function emjItem(id){ const it = typeof v88Item === 'function' ? v88Item(id) : null; return it && it.tipo === 'emoji' ? it : null; }
function emjValido(id){ return typeof id === 'string' && id !== 'emoji_nenhum' && !!(EMJ.atlas && EMJ.atlas.p[id]) && !!emjItem(id) ? id : ''; }
function emjLista(){ return typeof CAT88 === 'undefined' ? [] : CAT88.itens.filter(i => i.tipo === 'emoji'); }
function emjConta(){ try { return typeof v88Logado === 'function' && v88Logado(); } catch (_) { return false; } }
function emjLojaLocal(){ try { return !emjConta() && !(typeof v88TemPlataforma === 'function' && v88TemPlataforma()); } catch (_) { return true; } }   // (a demonstração: sem o servidor do RACHA)
function emjTem(id){
  const it = emjItem(id); if (!it) return false;
  if (it.gratis) return true;
  if (emjConta()) return !!(V88.inv && V88.inv.has(id));
  return EMJ.loc.tem.indexOf(id) >= 0;
}
function emjEquipado(){ return emjConta() ? (v88Equipado('emoji') || 'emoji_nenhum') : (emjTem(EMJ.loc.eq) ? EMJ.loc.eq : 'emoji_nenhum'); }
function emjMeu(){ const e = emjEquipado(); return emjValido(e) && emjTem(e) ? e : ''; }
function emjBot(nome){                                         // o emoji de um bot: comum, raro ou de graça (metade deles tem), pelo nome
  if (!EMJ.bots) EMJ.bots = emjLista().filter(i => i.id !== 'emoji_nenhum' && (i.gratis || i.raridade === 'comum' || i.raridade === 'raro')).map(i => i.id).filter(id => EMJ.atlas && EMJ.atlas.p[id]);
  const s = String(nome || ''); if (!s || !EMJ.bots.length) return '';
  let h = 2166136261; for (let i = 0; i < s.length; i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  h >>>= 0;
  return h % 100 < 52 ? EMJ.bots[(h >>> 8) % EMJ.bots.length] : '';
}
function emjMembro(netId){ try { return netId && NET49.room && Array.isArray(NET49.room.members) ? NET49.room.members.find(x => x.id === netId) || null : null; } catch (_) { return null; } }
function emjDeMembro(m){ return m && m.cos ? emjValido(m.cos.emoji) : ''; }
function emjDe(q){                                             // o emoji de quem está na partida (você, alguém da sala ou um bot)
  if (!q) return '';
  if (q === P) return NET49.playing && NET49.localSlot < 0 ? '' : emjMeu();
  if (NET49.playing){ if (q.netId){ return emjDeMembro(emjMembro(q.netId)); } return emjBot(q.nome); }
  if (q.humano) return emjMeu();
  return emjBot(q.nome);
}
function emjDoId(id){                                          // o id do estDe: 0 = você · 1..19 = RQ.jog[id - 1] · 20..29 = o treino · 30.. = o replay
  if (!EMJ.atlas) return '';
  try {
    if (id === 0) return RQ.on && RQ.jog && RQ.jog.indexOf(P) < 0 ? '' : emjDe(P);
    if (id >= 1 && id < 20) return RQ.on ? emjDe(RQ.jog[id - 1]) : '';
    if (id >= 30 && typeof RP !== 'undefined' && RP.rep && RP.rep.ents){
      const e = RP.rep.ents[id - 30]; if (!e) return '';
      if (e.humano) return emjMeu();
      const nome = String(e.nome || '');
      if (RQ.jog) for (const q of RQ.jog) if (q !== P && q.nome === nome) return emjDe(q);
      if (NET49.room && Array.isArray(NET49.room.members)){ const m = NET49.room.members.find(x => x.name === nome); if (m) return emjDeMembro(m); }
      return /^Bot /.test(nome) ? emjBot(nome) : '';
    }
  } catch (_) {}
  return '';
}

/* ---------------------------------------------------------------- o desenho: o atlas, as imagens prontas e o emoji no meio */
function emjImg(){
  if (EMJ.img) return EMJ.pronto ? EMJ.img : null;
  if (!EMJ.atlas || typeof Image === 'undefined') return null;
  const im = new Image();
  im.onload = () => { EMJ.pronto = true; EMJ.spr.clear(); try { emjMudou(); } catch (_) {} };
  im.src = EMJ.atlas.src; EMJ.img = im;
  return null;
}
emjImg();                                                      // (começa a carregar já: no primeiro quadro ele já está pronto)
function emjMudou(){                                           // o atlas carregou ou o emoji mudou: o que guarda desenho pronto refaz
  try { if (typeof pintaEu === 'function') pintaEu(); } catch (_) {}
  try { if (typeof V91 !== 'undefined' && V91.moldes) for (const k in V91.moldes) V91.moldes[k].key = ''; } catch (_) {}
  try { if (typeof V88C !== 'undefined') for (const k of [...V88C.mini.keys()]) if (/^emoji_/.test(k)) V88C.mini.delete(k); } catch (_) {}
}
function emjSprite(id, px){                                    // o emoji redondo pronto (px de lado), do atlas, com a borda escura
  const im = emjImg(), q = EMJ.atlas && EMJ.atlas.p[id]; if (!im || !q) return null;
  px = Math.max(8, Math.min(512, Math.round(typeof tamPronto === 'function' ? tamPronto(px) : px)));
  const key = id + '|' + px; let c = EMJ.spr.get(key);
  if (c) return c;
  if (EMJ.spr.size > 160) EMJ.spr.clear();
  const L = EMJ.atlas.lado;
  let src = document.createElement('canvas'); src.width = src.height = L;
  src.getContext('2d').drawImage(im, q[0], q[1], L, L, 0, 0, L, L);
  let s = L;
  while (s/2 >= px){                                           // (diminui pela metade até perto do tamanho: fica liso, sem serrilhado)
    const h = document.createElement('canvas'); h.width = h.height = Math.round(s/2);
    const gh = h.getContext('2d'); gh.imageSmoothingQuality = 'high'; gh.drawImage(src, 0, 0, s, s, 0, 0, h.width, h.height);
    src = h; s = h.width;
  }
  c = document.createElement('canvas'); c.width = c.height = px;
  const g = c.getContext('2d'); g.imageSmoothingQuality = 'high';
  g.save(); g.beginPath(); g.arc(px/2, px/2, px/2, 0, Math.PI*2); g.clip();
  g.drawImage(src, 0, 0, s, s, 0, 0, px, px);
  const sh = g.createRadialGradient(px*.5, px*.5, px*.36, px*.5, px*.5, px*.5);   // (a borda escura por dentro: o emoji "afunda" na tampinha)
  sh.addColorStop(0, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,.42)');
  g.fillStyle = sh; g.fillRect(0, 0, px, px);
  g.restore();
  EMJ.spr.set(key, c);
  return c;
}
function emjRaio(r, D){ return r*(D && D.k === 'E' ? .6 : .74); }   // o meio da tampinha (no escudo do clube, um pouco menor)
function emjPoe(g, x, y, r, id, esc, D){                       // o emoji no meio da tampinha (r = a ponta dos dentes; esc = px da tela por unidade)
  if (!id) return false;
  const rf = emjRaio(r, D), s = emjSprite(id, 2*rf*(esc || 1)); if (!s) return false;
  g.drawImage(s, x - rf, y - rf, 2*rf, 2*rf);
  g.save(); g.lineWidth = Math.max(.6, rf*.06); g.strokeStyle = 'rgba(8,6,18,.72)'; g.beginPath(); g.arc(x, y, rf - g.lineWidth/2, 0, Math.PI*2); g.stroke(); g.restore();
  return true;
}
// a tampinha (o código "T…" do editor) com o emoji, num canvas pronto: as telas (o fim, o perfil, a loja, as fichas)
function emjMiniatura(cod, emoji, px){
  let D = null; try { D = tpEhCodigo(cod) ? tpLe(cod) : null; } catch (_) {}
  if (!D){ try { D = tpLe(tpMinha()); } catch (_) {} }
  const c = D ? tpMiniatura(D, px) : document.createElement('canvas');
  if (!D){ c.width = c.height = px; }
  if (emoji){ try { const k = c.width/px, g = c.getContext('2d'); g.setTransform(k, 0, 0, k, 0, 0); emjPoe(g, px/2, px/2, px*(D && D.k === 'E' ? .42 : .46), emoji, k, D); g.setTransform(1, 0, 0, 1, 0, 0); } catch (_) {} }
  return c;
}

/* ---------------------------------------------------------------- os ganchos do desenho */
// toda tampinha desenhada pelo botaoPronto: o emoji vem no "est" (o estDe da partida põe o de cada um; as telas põem com o EMJ.forca)
const botaoProntoAntes95 = botaoPronto;
botaoPronto = function(g, x, y, r, sk, avatar, est, esc){
  const v = botaoProntoAntes95.apply(this, arguments);
  try { const em = (est && est.emoji) || EMJ.forca; if (em) emjPoe(g, x, y, r, em, esc, sk && sk.desenho); } catch (_) {}
  return v;
};
// na partida: o estDe (o "como está" de cada tampinha, calculado logo antes de desenhar) leva o emoji de quem é
const estDeAntes95 = estDe;
estDe = function(time, id, bx, by){ const e = estDeAntes95.apply(this, arguments); try { e.emoji = emjDoId(id); } catch (_) { e.emoji = ''; } return e; };
// a tampinha grande da tela inicial e do perfil (em pé, com espessura): o seu emoji
if (typeof v91Tampa3D === 'function'){
  const v91Tampa3DAntes95 = v91Tampa3D;
  v91Tampa3D = function(){ const a = EMJ.forca; EMJ.forca = emjMeu(); try { return v91Tampa3DAntes95.apply(this, arguments); } finally { EMJ.forca = a; } };
}
if (typeof v91Molde === 'function'){
  const v91MoldeAntes95 = v91Molde;
  v91Molde = function(slot){                                   // (o molde guarda a face pronta: com outro emoji, refaz)
    const em = (EMJ.forca || '') + (EMJ.pronto ? '' : '·');
    try { const M = V91.moldes && V91.moldes[slot]; if (M && M.emj95 !== em) M.key = ''; } catch (_) {}
    const M = v91MoldeAntes95.apply(this, arguments); if (M) M.emj95 = em; return M;
  };
}
if (typeof pintaEu === 'function'){                            // a tampinha pequena do topo da tela inicial
  const pintaEuAntes95 = pintaEu;
  pintaEu = function(){
    const a = EMJ.forca; EMJ.forca = emjMeu();
    try { return pintaEuAntes95.apply(this, arguments); } finally { EMJ.forca = a; }
  };
}
if (typeof drawBotao === 'function'){                          // (o pintaEu desenha pelo drawBotao: a tampinha vai pronta pelo tpPoe)
  const drawBotaoAntes95 = drawBotao;
  drawBotao = function(g, x, y, r, sk, avatar, sombra, est){
    const v = drawBotaoAntes95.apply(this, arguments);
    try { const em = (est && est.emoji) || EMJ.forca; if (em) emjPoe(g, x, y, r, em, typeof tpEscalaDe === 'function' ? tpEscalaDe(g) : 1, sk && sk.desenho); } catch (_) {}
    return v;
  };
}

/* ---------------------------------------------------------------- a loja e o cofre: a categoria EMOJIS */
try {
  V88_IC.emojis = '<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="25" fill="#ffd23f" stroke="' + V88_K + '" stroke-width="4"/>'
    + '<circle cx="23.5" cy="27" r="4.2" fill="' + V88_K + '"/><circle cx="40.5" cy="27" r="4.2" fill="' + V88_K + '"/>'
    + '<path d="M19 37c3.5 8 22.5 8 26 0" fill="none" stroke="' + V88_K + '" stroke-width="4.4" stroke-linecap="round"/>'
    + '<path d="M44 10l3 6 6.5 1-4.7 4.5 1.1 6.5L44 25l-5.9 3 1.1-6.5-4.7-4.5 6.5-1z" fill="#ff5a4f" stroke="' + V88_K + '" stroke-width="2.6" stroke-linejoin="round"/></svg>';
} catch (_) {}
try {
  if (!V88_LOJA_CATS.some(c => c[0] === 'emojis')){ const i = V88_LOJA_CATS.findIndex(c => c[0] === 'tampinhas'); V88_LOJA_CATS.splice(i + 1, 0, ['emojis', 'EMOJIS']); }
  V88_TIPO_CAT.emojis = 'emoji'; V88_TIPO_NOME.emoji = 'EMOJI';
} catch (_) {}
try { if (!V90_COFRE_CATS.some(c => c[0] === 'emojis')){ const i = V90_COFRE_CATS.findIndex(c => c[0] === 'tampinhas'); V90_COFRE_CATS.splice(i + 1, 0, ['emojis', 'EMOJIS', 'emojis', 'emoji']); } } catch (_) {}
// a miniatura de um emoji: a SUA tampinha com o emoji no meio (o "Sem emoji": a sua tampinha limpa)
const v88PintaMiniAntes95 = v88PintaMini;
v88PintaMini = function(g, px, codigo){
  const it = emjItem(codigo);
  if (!it) return v88PintaMiniAntes95.apply(this, arguments);
  let D = null; try { D = tpLe(tpMinha()); } catch (_) {}
  if (D){ try { g.drawImage(tpMiniatura(D, px), 0, 0, px, px); } catch (_) {} }
  const em = emjValido(codigo);
  if (em && !emjPoe(g, px/2, px/2, px*.46, em, 1, D)){                // (o atlas ainda carregando: um círculo no lugar, e a miniatura refaz depois)
    g.fillStyle = 'rgba(255,255,255,.12)'; g.beginPath(); g.arc(px/2, px/2, px*.34, 0, Math.PI*2); g.fill();
  }
};
// a loja sem conta: os emojis de graça equipam no aparelho; na demonstração (sem o servidor) dá para comprar com as moedas daqui
function emjLojaGradeLocal(painel, lista){
  const g = nodo('div', 'v88-itens');
  for (const codigo of lista){
    const it = emjItem(codigo); if (!it) continue;
    const R = v88Raridade(it.raridade), tem = emjTem(codigo), eq = emjEquipado() === codigo;
    const b = novoBotao('v88-item st-' + (eq ? 'equipado' : tem ? 'seu' : 'venda'), it.nome); b.style.setProperty('--r', R.cor); b.dataset.r = it.raridade;
    const mini = nodo('span', 'v88-item-mini'); mini.appendChild(v88MiniItem(codigo, 112));
    b.append(mini, nodo('small', 'v88-item-rar', 'EMOJI · ' + (it.gratis ? 'GRÁTIS' : R.nome.toUpperCase())), nodo('b', 'v88-item-nome', it.nome));
    const pe = nodo('span', 'v88-item-pe');
    if (eq) pe.appendChild(nodo('span', 'v88-item-st on', 'EQUIPADO'));
    else if (tem) pe.appendChild(nodo('span', 'v88-item-st', 'EQUIPAR'));
    else pe.appendChild(v88Preco(it.moedas || 0, it.gemas || 0));
    b.appendChild(pe);
    b.addEventListener('click', () => { som.clique(); emjAbreItem(codigo); });
    g.appendChild(b);
  }
  painel.appendChild(g);
}
function emjAbreItem(codigo){                                  // o emoji aberto: a sua tampinha com ele, grande, e o botão certo
  const it = emjItem(codigo); if (!it) return;
  if (emjConta()) return v88ItemAbre(codigo);
  const R = v88Raridade(it.raridade), tem = emjTem(codigo), eq = emjEquipado() === codigo, local = emjLojaLocal();
  abrePop(c => {
    c.classList.add('v88-pop', 'v88-item-pop', 'v95-emj-pop'); c.style.setProperty('--r', R.cor);
    const topo = nodo('div', 'v88-item-pop-topo'), mini = nodo('div', 'v88-item-pop-mini'); mini.appendChild(v88MiniItem(codigo, 220));
    const tx = nodo('div', 'v88-item-pop-tx');
    tx.append(nodo('span', 'pop-tag', 'EMOJI · ' + R.nome.toUpperCase()), nodo('h2', null, it.nome), nodo('p', 'pop-txt', it.desc || ''));
    if (!tem){ const p = nodo('div', 'v88-item-pop-preco'); p.appendChild(v88Preco(it.moedas || 0, it.gemas || 0)); tx.appendChild(p); }
    if (!tem && !local) tx.appendChild(nodo('p', 'v88-nota', 'Os emojis que custam moedas ou gemas ficam na sua conta do RACHA (valem em qualquer aparelho e aparecem para todo mundo online). Os de graça você já pode usar.'));
    topo.append(mini, tx); c.appendChild(topo);
    const a = nodo('div', 'pop-acoes');
    a.appendChild(botaoPop('FECHAR', '', () => { som.clique(); fechaPop(); }));
    if (eq) a.appendChild(botaoPop('EQUIPADO', 'verde', () => { som.clique(); fechaPop(); }));
    else if (tem) a.appendChild(botaoPop('EQUIPAR', 'verde', () => { som.clique(); fechaPop(); emjEquipa(codigo); }));
    else if (local){
      const pode = CONTA.moedas >= (it.moedas || 0) && CONTA.gemas >= (it.gemas || 0);
      a.appendChild(botaoPop(pode ? 'COMPRAR' : 'FALTA SALDO', pode ? 'verde' : '', () => { som.clique(); if (!pode){ som.erro(); v88FaltaSaldo({moedas:it.moedas || 0, gemas:it.gemas || 0}); return; } fechaPop(); emjCompraLocal(codigo); }));
    } else if (typeof v84AbreLogin === 'function' && window.RACHA84 && !window.RACHA84.embutido) a.appendChild(botaoPop('ENTRAR PARA COMPRAR', 'amarelo', () => { som.clique(); fechaPop(); try { fechaTela(); } catch (_) {} v84AbreLogin('entrar'); }));
    c.appendChild(a);
  });
}
function emjCompraLocal(codigo){                               // (só na demonstração: as moedas e as gemas deste aparelho)
  const it = emjItem(codigo); if (!it || emjTem(codigo)) return;
  const m = it.moedas || 0, gm = it.gemas || 0;
  v88Confirma('LOJA', 'COMPRAR ' + String(it.nome).toUpperCase() + '?', 'Preço: ' + (gm ? fmtNum(gm) + ' gemas' : fmtNum(m) + ' moedas') + '. Saldo depois: ' + fmtNum(CONTA.moedas - m) + ' moedas · ' + fmtNum(CONTA.gemas - gm) + ' gemas. (Demonstração: fica neste aparelho.)', 'COMPRAR', () => {
    if (CONTA.moedas < m || CONTA.gemas < gm){ som.erro(); return v88FaltaSaldo({moedas:m, gemas:gm}); }
    CONTA.moedas -= m; CONTA.gemas -= gm; try { contaSalvar(); } catch (_) {}
    EMJ.loc.tem.push(codigo); emjSalvaLocal();
    try { som.compra(); } catch (_) {}
    try { lbCarteira(); } catch (_) {}
    abrePop(cx => {
      cx.classList.add('v88-pop'); cx.append(nodo('span', 'pop-tag', 'COMPRADO!'), nodo('h2', null, it.nome.toUpperCase()));
      const mm = nodo('div', 'v88-item-pop-mini'); mm.appendChild(v88MiniItem(codigo, 160)); cx.appendChild(mm);
      const a = nodo('div', 'pop-acoes'); a.append(botaoPop('DEPOIS', '', () => { som.clique(); fechaPop(); emjRepinta(); }), botaoPop('EQUIPAR AGORA', 'verde', () => { som.clique(); fechaPop(); emjEquipa(codigo); })); cx.appendChild(a);
    });
    emjRepinta();
  });
}
function emjEquipa(codigo){
  const it = emjItem(codigo); if (!it) return;
  if (emjConta()) return v88Equipa('emoji', codigo);
  if (!emjTem(codigo)) return;
  EMJ.loc.eq = codigo === 'emoji_nenhum' ? '' : codigo; emjSalvaLocal();
  try { som.compra(); } catch (_) {}
  try { v88Aviso(codigo === 'emoji_nenhum' ? 'A tampinha ficou sem emoji.' : it.nome + ' na sua tampinha!'); } catch (_) {}
  emjMudou(); emjRepinta();
}
function emjRepinta(){
  try { if (v88Aberta('loja')) renderLoja(); } catch (_) {}
  try { v88Repinta('cofre'); } catch (_) {}
  try { if (typeof lbRender === 'function' && lobby.aberto && !lobby.tela) lbRender(); } catch (_) {}
}
// a LOJA: a categoria EMOJIS (com conta: igual às outras, pelo servidor; sem conta: a grade daqui)
const v88LojaPintaAntes95 = v88LojaPinta;
v88LojaPinta = function(){
  if (V88S.cat !== 'emojis' || emjConta()) return v88LojaPintaAntes95.apply(this, arguments);
  const {coluna, painel} = V88S; if (!coluna) return;
  V88S.cat = 'bolas'; v88LojaPintaAntes95.apply(this, arguments); V88S.cat = 'emojis';   // (a coluna e o resto, como sempre; o painel a gente troca)
  for (const b of coluna.querySelectorAll('.v88-cat')){ const on = b.dataset.cat === 'emojis'; b.classList.toggle('on', on); b.setAttribute('aria-selected', String(on)); }
  for (const n of Array.from(painel.childNodes)) if (n !== V88S.blocoTampinhas) n.remove();
  V88S.blocoTampinhas.hidden = true;
  const cab = nodo('div', 'v88-loja-cab'); cab.appendChild(nodo('h3', 'tl-sub', 'EMOJIS'));
  cab.appendChild(nodo('small', 'v88-nota', emjLojaLocal() ? 'Demonstração: compre com as moedas deste aparelho e equipe na hora.' : 'Os 4 de graça você já pode usar. Para comprar os outros, entre na sua conta.'));
  painel.appendChild(cab);
  emjLojaGradeLocal(painel, emjOrdem());
  painel.appendChild(nodo('p', 'v88-nota v88-loja-rodape', 'O emoji vai no meio da sua tampinha, em todo lugar. Só aparência: nada muda na física, na força do chute ou na velocidade.'));
};
function emjOrdem(){                                           // de graça, comum, raro, épico, lendário (e o preço)
  const O = {comum:1, raro:2, epico:3, lendario:4};
  return emjLista().slice().sort((a, b) => (a.id === 'emoji_nenhum' ? -1 : 0) - (b.id === 'emoji_nenhum' ? -1 : 0) || (b.gratis ? 1 : 0) - (a.gratis ? 1 : 0)
    || (O[a.raridade] || 0) - (O[b.raridade] || 0) || (a.gemas || 0) - (b.gemas || 0) || (a.moedas || 0) - (b.moedas || 0)).map(i => i.id);
}
// com conta: a lista da categoria e o estado (equipado / seu / à venda) já vêm pelo tipo; o EQUIPAR é o de sempre
const v88LojaListaAntes95 = v88LojaLista;
v88LojaLista = function(cat){ if (cat === 'emojis') return emjOrdem(); return v88LojaListaAntes95.apply(this, arguments); };
// o COFRE: os seus emojis (com conta, os da conta; sem conta, os deste aparelho)
const v90CofreRenderAntes95 = v90CofreRender;
v90CofreRender = function(T){
  if (V90I.cofreCat !== 'emojis') return v90CofreRenderAntes95.apply(this, arguments);
  V90I.cofreCat = 'gols'; v90CofreRenderAntes95.apply(this, arguments); V90I.cofreCat = 'emojis';   // (a coluna e o cabeçalho de sempre)
  const corpo = T.corpo, col = corpo.querySelector('.cf90-col'), painel = corpo.querySelector('.cf90-painel'); if (!painel) return;
  if (col) for (const b of col.querySelectorAll('.v88-cat')){ const on = b.dataset.cat === 'emojis'; b.classList.toggle('on', on); b.setAttribute('aria-selected', String(on)); }
  painel.textContent = '';
  const cab = nodo('div', 'cf90-cab'); cab.append(nodo('h3', 'tl-sub', 'EMOJIS'), nodo('small', 'v88-nota', 'O emoji vai no meio da sua tampinha. Toque para equipar.'));
  painel.appendChild(cab);
  const meus = emjOrdem().filter(id => emjTem(id));
  if (emjConta()) v88LojaGrade(painel, meus); else emjLojaGradeLocal(painel, meus);
  painel.appendChild(v88Bt('lb-btn amarelo v95-emj-loja', 'VER TODOS NA LOJA', () => { fechaTela(); V88S.cat = 'emojis'; abreTela('loja'); }));
};
try { v88On('equipados', () => emjMudou()); v88On('inventario', () => emjMudou()); } catch (_) {}
// a Oficina (o TESTAR e as salas com mapa): o emoji de cada um (o seu, o da conta de quem está na sala, o do bot)
try {
  const DES = window.OFI && OFI.interno && OFI.interno.DES;
  if (DES && typeof DES.jogador === 'function'){
    const jogadorAntes95 = DES.jogador;
    DES.jogador = function(g, M, q, x, y, r, escala, eu){
      const a = EMJ.forca;
      try {
        let em = '';
        if (eu) em = emjMeu();
        else if (q && (q.nome || q.netId)){
          const ms = NET49.room && Array.isArray(NET49.room.members) ? NET49.room.members : [];
          const m = ms.find(x => (q.netId && x.id === q.netId) || (!q.netId && q.nome && x.name === q.nome && !x.bot));
          em = m ? emjDeMembro(m) : (q.bot || /^Bot /.test(String(q.nome || ''))) ? emjBot(q.nome) : '';
        }
        EMJ.forca = em;
      } catch (_) {}
      try { return jogadorAntes95.apply(this, arguments); } finally { EMJ.forca = a; }
    };
  }
} catch (_) {}
// o cartão do CRAQUE DA PARTIDA (v93): o emoji em cima da tampinha dele
if (typeof v93CraqueMonta === 'function'){
  const v93CraqueMontaAntes95 = v93CraqueMonta;
  v93CraqueMonta = function(el, c, eu){
    const v = v93CraqueMontaAntes95.apply(this, arguments);
    try {
      let em = '';
      if (eu) em = emjMeu();
      else if (c && c.k && c.k !== 'eu' && NET49.room){ const m = emjMembro(c.k); em = m ? emjDeMembro(m) : ''; }
      else if (c && c.k === 'eu') em = emjMeu();
      else if (c && /^b\d+$/.test(String(c.k || '')) && RQ.jog){ em = emjDe(RQ.jog[+String(c.k).slice(1)]); }
      else if (c && c.bot) em = emjBot(c.nome);
      const av = el.querySelector('.v93-craque-av');
      if (em && av){ let D = null; try { D = c.skin && tpLe(c.skin); } catch (_) {} emjPoe(av.getContext('2d'), 44, 44, D ? 88*.46 : 38, em, 1, D); }
    } catch (_) {}
    return v;
  };
}
window.RachaEmoji95 = {meu:emjMeu, de:emjDe, bot:emjBot, lista:emjLista, tem:emjTem, equipa:emjEquipa, sprite:emjSprite, miniatura:emjMiniatura, local:() => EMJ.loc, pronto:() => EMJ.pronto};
// o perfil público (a janela de outro jogador): o emoji dele, na fila das etiquetas
if (typeof v88PerfilPinta === 'function'){
  const v88PerfilPintaAntes95 = v88PerfilPinta;
  v88PerfilPinta = function(p){
    const r = v88PerfilPintaAntes95.apply(this, arguments);
    try {
      const em = p && emjValido(p.emoji), tags = LB.popCaixa && LB.popCaixa.querySelector('.v88-pf-tags');
      if (em && tags){
        const t = nodo('span', 'v88-tag v95-emj-tag'), cv = document.createElement('canvas'); cv.width = cv.height = 44; cv.setAttribute('aria-hidden', 'true');
        const s = emjSprite(em, 44); if (s) cv.getContext('2d').drawImage(s, 0, 0, 44, 44);
        t.append(cv, nodo('span', null, (emjItem(em) || {}).nome || 'Emoji')); tags.appendChild(t);
      }
    } catch (_) {}
    return r;
  };
}
