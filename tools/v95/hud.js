/* ======================================================================================================================
   RACHA v95 · O PLACAR MINIMALISTA E O PAINEL DOS JOGADORES (o pedido, com os dois prints: "quero um placar igual esse
   minimalista; quando todos os jogadores forem do mesmo clube, aparece ali do lado do placar o nome do time; a foto de perfil
   do player está muito pequena, tem que preencher tudo; e o clube embaixo do nome ali no negócio de ver os players").
   · O PLACAR: três abas penduradas na borda de cima da tela, de vidro escuro e translúcido — o relógio no meio (a aba mais
     escura e mais funda) e os dois números de lado, cada um na cor do seu time. Sem caixa, sem TIME A/TIME B e sem o rótulo
     do modo do lado (o modo continua no aviso do começo e no painel dos jogadores). O símbolo do contorno do time (○ cheio
     no Time A, ◌ tracejado no Time B — o mesmo de em campo) fica pequeno embaixo de cada número: os times continuam se
     separando além da cor.
     QUANDO O TIME TODO É DO MESMO CLUBE (online: todas as vagas do time com gente do mesmo clube, sem bot; contra os bots,
     quando você joga sozinho no seu time), o nome do clube e o escudo aparecem do lado de fora do número daquele time — como
     no print. Os botões do lado do placar (o painel e as falas) se afastam para dar lugar.
   · O PAINEL DOS JOGADORES (o botão do lado do placar): os dois times em placas na cor de cada um, cada jogador numa linha
     com a FOTO DE PERFIL CHEIA no círculo (o avatar equipado; sem avatar, a tampinha dele com o emoji — o meio da tampinha
     preenchendo o círculo, como uma foto), o nome com a bandeira e a bolinha de conectado (verde, amarela ou vermelha pelo
     ping), e o CLUBE EMBAIXO DO NOME (o bot: BOT; quem caiu: o aviso). Em cima, o confronto (o clube de cada time, quando o
     time é de um clube só; senão, a cor do time) e o modo da partida. Os números (gols, assistências e defesas) continuam.
   Só desenho e tela: a física, o placar, o relógio e as regras não mudam.
   ====================================================================================================================== */
const V95H = {clube:[null, null], clubeT:-1e9, esc:new Map(), fotos:new Map(), assin:'', abas:null};
const V95PL = {tw:156, th:58, sw:74, sh:50, gap:12, esc:46, fn:27, fnMin:18, nomeMax:230};

/* ---------------------------------------------------------------- o clube de cada um e o do time */
function v95Sigla(nome){
  const p = String(nome || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/\s+/).filter(Boolean);
  return (p.length > 1 ? p.map(x => x[0]).join('') : String(nome || '').slice(0, 3)).toUpperCase().slice(0, 4);
}
function v95ClubeNorm(c){                                     // {nome, tag, escudo, chave} de qualquer formato (o cartão da sala, a conta, a tela do clube)
  if (!c || typeof c !== 'object') return null;
  const nome = String(c.name || c.nome || '').replace(/\s+/g, ' ').trim().slice(0, 30); if (!nome) return null;
  const tag = String(c.tag || c.sigla || '').trim().slice(0, 5).toUpperCase() || v95Sigla(nome);
  const chave = nome.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();   // (o nome é a chave do clube: dois clubes não têm o mesmo)
  return {nome, tag, escudo:typeof c.escudo === 'string' ? c.escudo : '', chave};
}
function v95MeuClube(){                                       // o seu clube: o da conta, o da tela do clube ou o deste aparelho
  try { if (V70ON.clubeConta && V70ON.clubeConta.nome) return v95ClubeNorm(V70ON.clubeConta); } catch (_) {}
  try { if (CLB.meu && CLB.meu.nome) return v95ClubeNorm(CLB.meu); } catch (_) {}
  try { if (CLB_LOCAL.meu){ const c = CLB_LOCAL.clubes.find(x => x.id === CLB_LOCAL.meu); if (c) return v95ClubeNorm(c); } } catch (_) {}
  return null;
}
function v95MembroSala(id){ try { return id && NET49.room && Array.isArray(NET49.room.members) ? NET49.room.members.find(x => x.id === id) || null : null; } catch (_) { return null; } }
function v95ClubeCalc(t){
  if (!RQ.on) return null;
  if (NET49.playing && NET49.room){                          // online: todas as vagas do time com gente do mesmo clube (um bot na vaga: não)
    const r = NET49.room, n = r.n | 0; if (!n || !Array.isArray(r.roster)) return null;
    let c0 = null;
    for (let k = 0; k < n; k++){
      const id = r.roster[t*n + k]; if (!id) return null;
      const m = v95MembroSala(id); if (!m) return null;
      const c = v95ClubeNorm(m.club);                          // (online, só o clube que a sala conhece: todo mundo vê o mesmo)
      if (!c || (c0 && c0.chave !== c.chave)) return null;
      c0 = c0 || c;
    }
    return c0;
  }
  const L = (RQ.jog || []).filter(q => q && q.time === t);    // contra os bots: só você é gente — o time é "do seu clube" quando é só você
  if (!L.length || L.some(q => q !== P)) return null;
  return v95MeuClube();
}
function v95ClubeDoTime(t){
  const agora = performance.now();
  if (agora - V95H.clubeT > 500){ V95H.clubeT = agora; try { V95H.clube = [v95ClubeCalc(0), v95ClubeCalc(1)]; } catch (_) { V95H.clube = [null, null]; } }
  return V95H.clube[t ? 1 : 0];
}
function v95EscudoImg(cod, px){                               // o escudo do clube pronto (um por código e tamanho)
  px = Math.max(8, Math.min(256, Math.round(px)));
  const k = (cod || '-') + '|' + px; let c = V95H.esc.get(k);
  if (!c){
    if (V95H.esc.size > 24) V95H.esc.clear();
    c = document.createElement('canvas'); c.width = c.height = px;
    try { const D = clbEscudoD(cod); tpDesenha(c.getContext('2d'), px/2, px/2, px*.43, D, tpSemente(tpCodigo(D))); } catch (_) {}
    V95H.esc.set(k, c);
  }
  return c;
}

/* ---------------------------------------------------------------- o placar */
function v95CorNumero(c){                                     // o número na cor do time, claro o bastante para ler no vidro escuro
  try {
    const [r, g, b] = corRgb(c.base), l = (.2126*r + .7152*g + .0722*b)/255;
    return l < .5 ? corMix(c.base, '#ffffff', Math.min(.55, (.5 - l)*1.4)) : c.base;
  } catch (_) { return c && c.base || '#ffffff'; }
}
function v95Aba(g, x0, x1, h, ie, id, r){                     // uma aba pendurada (o contorno, no caminho que já está aberto): o topo colado na borda; ie/id = o quanto cada lado entra embaixo
  g.moveTo(x0, -8); g.lineTo(x1, -8);
  g.arcTo(x1 - id, h, x0 + ie, h, r); g.arcTo(x0 + ie, h, x0, -8, r);
  g.closePath();
}
function v95AbasDesenha(g){                                   // (em volta do (0, 0) = o meio da borda de cima)
  const Z = V95PL, tx = Z.tw/2, sx = tx + Z.sw;
  g.save();
  g.beginPath(); g.rect(-sx - 30, -12, 2*sx + 60, Z.th + 30); v95Aba(g, -tx, tx, Z.th, 7, 7, 14); g.clip('evenodd');   // (os números por trás do relógio)
  g.fillStyle = 'rgba(4,12,8,.36)';
  g.beginPath(); v95Aba(g, -sx, -tx + 20, Z.sh, 7, 0, 13); g.fill();
  g.beginPath(); v95Aba(g, tx - 20, sx, Z.sh, 0, 7, 13); g.fill();
  g.restore();
  g.fillStyle = 'rgba(4,12,8,.52)'; g.beginPath(); v95Aba(g, -tx, tx, Z.th, 7, 7, 14); g.fill();
  g.strokeStyle = 'rgba(255,255,255,.07)'; g.lineWidth = 1.5;                       // (a beirada de baixo do vidro, quase nada)
  g.beginPath(); g.moveTo(-tx + 22, Z.th - .75); g.lineTo(tx - 22, Z.th - .75); g.stroke();
}
function v95Contorno(g, x, y, t){                             // ○ cheio (Time A) · ◌ tracejado (Time B): o mesmo contorno de em campo
  g.save(); g.lineWidth = 2.2; g.strokeStyle = 'rgba(255,255,255,.55)';
  if (t) g.setLineDash([2.6, 2]);
  g.beginPath(); g.arc(x, y, 4.6, 0, TAU); g.stroke(); g.restore();
}
function v95NomeCabe(s, max, tag){                            // o tamanho da letra para o nome caber (sem caber nem pequeno: a sigla; e, se nem assim, cortado com …)
  const Z = V95PL; let fs = Z.fn, w = medeTxt(s, fs + 'px ' + FONT);
  if (w > max){ fs = Math.max(Z.fnMin, Math.floor(fs*max/w)); w = medeTxt(s, fs + 'px ' + FONT); }
  if (w > max && tag){ s = tag; fs = Z.fn; w = medeTxt(s, fs + 'px ' + FONT); if (w > max){ fs = Math.max(Z.fnMin, Math.floor(fs*max/w)); w = medeTxt(s, fs + 'px ' + FONT); } }
  let base = s;
  while (w > max && base.length > 2){ base = base.slice(0, -1); s = base.trimEnd() + '…'; w = medeTxt(s, fs + 'px ' + FONT); }
  return {s, fs, w};
}
const V95LIM = {t:-1e9, dir:Infinity};
function v95LimiteDireita(){                                  // até onde o lado direito pode ir (no placar, antes da escala do HUD): a barra da sala online fica lá
  const agora = performance.now(); if (agora - V95LIM.t < 500) return V95LIM.dir;
  V95LIM.t = agora; V95LIM.dir = Infinity;
  try {
    const b = X49UI.onlinebar; if (!NET49.playing || !b || b.hidden) return Infinity;
    const r = b.getBoundingClientRect(); if (!r.width) return Infinity;
    const c = cv.getBoundingClientRect(), k = c.width/W, hk = HUDX.k || 1;
    if (r.top > c.top + (PLACAR80.y + PLACAR80.h)*hk*k) return Infinity;   // (a barra embaixo do placar não atrapalha)
    V95LIM.dir = W/2 + ((r.left - c.left)/k - W/2)/hk - 12;
  } catch (_) {}
  return V95LIM.dir;
}
function v95MeiaMax(){                                        // a meia largura máxima do placar (antes da escala do HUD): sobra lugar para a pausa e um botão do lado
  const hk = HUDX.k || 1; let pr = 0;
  try { pr = BTN_PAUSA.x + BTN_PAUSA.w; } catch (_) {}
  return Math.max(V95PL.tw/2 + V95PL.sw, (W/2 - pr - 14)/hk - 80);
}
function v95ClubeLado(g, c, t, borda, lim){                   // o escudo e o nome do clube do lado de fora do número do time t (lim = até onde pode ir); devolve até onde foi
  const Z = V95PL, lado = t ? 1 : -1, y = 27;
  const ex = borda + lado*(Z.gap + Z.esc/2);
  if (Math.abs(lim - borda) < Z.gap + Z.esc) return Math.abs(borda - W/2);   // (nem o escudo cabe: fica só o número)
  try {
    const T = g.getTransform(), q = Math.max(.2, Math.hypot(T.a, T.b));
    const img = v95EscudoImg(c.escudo, Z.esc*q);
    g.drawImage(img, ex - Z.esc/2, y - Z.esc/2, Z.esc, Z.esc);
  } catch (_) {}
  const max = Math.min(Z.nomeMax, Math.abs(lim - borda) - Z.gap - Z.esc - 10);
  if (max < 26) return Math.abs(ex - W/2) + Z.esc/2;           // (só o escudo)
  const N = v95NomeCabe(c.nome.toUpperCase(), max, c.tag);
  const x = ex + lado*(Z.esc/2 + 10 + N.w/2);
  txt(g, N.s, x, y + 1, N.fs, '#ffffff', 'rgba(6,10,8,.62)', Math.max(4, N.fs*.2));
  return Math.abs(x - W/2) + N.w/2;
}
function v95Placar(g){
  const Z = V95PL, cx = W/2, tx = Z.tw/2, sx = tx + Z.sw, c0 = rqCor(0), c1 = rqCor(1), T = v80TempoTela();
  g.save(); g.translate(cx, 0);
  try {
    const Tf = g.getTransform(), q = tamPronto(Math.max(.05, Math.hypot(Tf.a, Tf.b))*100)/100;
    pintaHud(g, sprHud('placar95', q, sx + 34, 12, sx + 34, Z.th + 18, v95AbasDesenha));
  } catch (_) {}
  g.restore();
  // os números (na cor de cada time) e o relógio
  const xa = cx - tx - Z.sw/2, xb = cx + tx + Z.sw/2;
  txt(g, String(RQ.placar[0]), xa, 22, 44, v95CorNumero(c0), 'rgba(8,6,4,.62)', 6);
  txt(g, String(RQ.placar[1]), xb, 22, 44, v95CorNumero(c1), 'rgba(8,6,4,.62)', 6);
  v95Contorno(g, xa, Z.sh - 6, 0); v95Contorno(g, xb, Z.sh - 6, 1);
  const md = RQ.jogo, corM = V70_MD_COR[md], M = MD_MAP.get(md), modo = !!(corM && M);   // (o modo que muda o jogo — COM CURVA — numa etiqueta pequena no pé do relógio)
  if (T.un){ txt(g, T.s, cx, modo ? 20 : 23, modo ? 28 : 32, T.cor, 'rgba(0,0,0,.5)', 5); if (!modo) txt(g, T.un, cx, Z.th - 12, 15, '#ffe9a8', 'rgba(0,0,0,.6)', 3); }
  else { const m0 = modo ? 36 : 42, tam = Math.min(m0, m0*(Z.tw - 26)/Math.max(1, medeTxt(T.s, m0 + 'px ' + FONT))); txt(g, T.s, cx, modo ? 24 : 29, tam, T.cor, 'rgba(0,0,0,.5)', 5); }
  if (modo){
    const s = T.un ? M.nome + ' · ' + T.un : M.nome, wm = medeTxt(s, '12px ' + FONT) + 14, claro = md === 'ginga';
    rr(g, cx - wm/2, Z.th - 18, wm, 15, 7.5); g.fillStyle = corM; g.fill();
    txt(g, s, cx, Z.th - 10.2, 12, claro ? '#2a1d00' : '#ffffff', claro ? null : 'rgba(5,10,25,.55)', 2.5);
  }
  // o clube do lado de fora do número (quando o time todo é do mesmo clube)
  let ext = sx;
  const meia = v95MeiaMax(), limD = Math.min(cx + meia, v95LimiteDireita());
  for (const t of [0, 1]){
    const c = v95ClubeDoTime(t); if (!c) continue;
    try { ext = Math.max(ext, v95ClubeLado(g, c, t, t ? cx + sx : cx - sx, t ? limD : cx - meia)); } catch (_) {}
  }
  const wl = Math.max(Z.sw, ext - Z.tw/2);                     // (os botões do lado do placar e o que desvia dele usam esta largura)
  PLACAR80.wc = Z.tw;
  if (Math.abs(wl - PLACAR80.wl) > .5){                       // mudou (o clube apareceu ou saiu): os dois botões do lado vão para o lugar novo já
    PLACAR80.wl = wl;
    if (!V95H.lugarPedido){ V95H.lugarPedido = true; requestAnimationFrame(() => { V95H.lugarPedido = false; try { v93PainelLugar(); } catch (_) {} try { v93FalaLugar(); } catch (_) {} }); }
  }
  // a faixa embaixo (o aviso, a saída de bola, a prorrogação) e a janela da GINGA: as de sempre
  let linha = '', cor = '#fff';
  const meu = NET49.playing ? (NET49.localSlot < 0 ? -1 : P.time) : 0;
  if (RQ.aviso.t > 0){ linha = RQ.aviso.txt; cor = RQ.aviso.cor; }
  else if (RQ.estado === 'saida'){ linha = meu < 0 ? 'SAÍDA DO ' + (RQ.saidaTime ? 'TIME B' : 'TIME A') : RQ.saidaTime === meu ? 'SAÍDA DO SEU TIME' : 'SAÍDA DO ADVERSÁRIO'; cor = rqCor(RQ.saidaTime).claro; }
  else if (T.ot && RQ.estado !== 'fim'){ linha = RQ.v80 ? 'PRORROGAÇÃO · GOL DE OURO' : 'GOL DE OURO'; cor = '#ff8a7e'; }
  else if (RQ.prorrog && !RQ.v80 && RQ.estado !== 'fim'){ linha = 'MORTE SÚBITA'; cor = '#ffd23f'; }
  if (linha){
    g.save(); g.font = '24px ' + FONT; const lw = g.measureText(linha).width + 36;
    rr(g, cx - lw/2, 72, lw, 38, 19); g.fillStyle = T.ot && !RQ.aviso.t ? 'rgba(40,8,10,.72)' : 'rgba(8,10,28,.62)'; g.fill(); g.restore();
    txt(g, linha, cx, 91, 24, cor, 'rgba(5,10,25,.95)', 6);
  }
  if (RQ.jogo === 'ginga' && (RQ.estado === 'jogo' || RQ.estado === 'saida')) v80Ginga(g, linha ? 118 : 74);
}
Object.assign(PLACAR80, {y:6, h:56, wc:V95PL.tw, wl:V95PL.sw});
v80Placar = function(g){ return v95Placar(g); };
// o rótulo do modo do lado do placar saiu: os botões do lado não precisam mais desviar dele
v93RotuloPlacar = function(){ return {x:-1e5, y:-1e5, w:0, h:0}; };

/* ---------------------------------------------------------------- a foto de perfil (cheia no círculo) */
function v95SkinDe(q, m, eu, t){                              // a tampinha como ela aparece em campo (a inicial na cor do time)
  let s = '';
  try { s = eu ? (skinAtual().id || perfil.skin) : m ? m.skin : (NET49.playing ? (q && q.netSkin) || '' : '') || ((q && skinDoBot(q)) || {}).id || ''; } catch (_) {}
  try { if (s && tpEhCodigo(s) && (t === 0 || t === 1)) s = tpNoTime(s, t); } catch (_) {}
  return s || '';
}
function v95MeuAvatar(){ try { return typeof v88Equipado === 'function' ? v88Equipado('avatar') || '' : ''; } catch (_) { return ''; } }
function v95FotoPinta(o, px){                                 // {c, pronta}: o avatar equipado ou o meio da tampinha (com o emoji) preenchendo o círculo
  const c = document.createElement('canvas'); c.width = c.height = px;
  const g = c.getContext('2d'), m = px/2;
  let pronta = true;
  g.save(); g.beginPath(); g.arc(m, m, m, 0, TAU); g.clip();
  g.fillStyle = '#141826'; g.fillRect(0, 0, px, px);
  const it = o.avatar && o.avatar !== 'av_tampinha' && typeof v88Item === 'function' ? v88Item(o.avatar) : null;
  if (it && it.tipo === 'avatar' && !(it.visual && it.visual.desenho === 'tampinha') && typeof v88DesenhaAvatar === 'function'){
    const t = document.createElement('canvas'); t.width = t.height = Math.round(px*1.12);   // (o contorno escuro do avatar fica para fora do círculo)
    try { v88DesenhaAvatar(t.getContext('2d'), t.width, it); g.drawImage(t, m - t.width/2, m - t.height/2); } catch (_) {}
  } else {
    const R = m/.7;                                           // (o meio da tampinha — 0,74 do raio — passa um pouco do círculo)
    let sk = null;
    try { sk = tpEhCodigo(o.skin) ? tpSkin(o.skin) : (SKIN_MAP.get(o.skin) || null); } catch (_) {}
    if (!sk){ try { sk = skinDoBot({nome:o.nome, time:o.time === 1 ? 1 : 0}); } catch (_) {} }
    if (sk){ try { botaoPronto(g, m, m, R, sk, null, {t:0, bx:null, by:null, id:99, humor:'', emoji:''}, 1); } catch (_) {} }
    if (o.emoji){ try { if (!emjPoe(g, m, m, R, o.emoji, 1, sk && sk.desenho)) pronta = false; } catch (_) { pronta = false; } }
  }
  g.restore();
  return {c, pronta};
}
function v95Foto(o, css){                                     // o canvas da foto (pronto e guardado; cada linha leva uma cópia)
  const px = Math.max(16, Math.round(css*Math.min(2, window.devicePixelRatio || 1)));
  const k = [o.skin || '', o.emoji || '', o.avatar || '', o.nome || '', o.time | 0, px].join('|');
  let f = V95H.fotos.get(k);
  if (!f){ f = v95FotoPinta(o, px); if (f.pronta){ if (V95H.fotos.size > 48) V95H.fotos.clear(); V95H.fotos.set(k, f); } else V95H.refaz = true; }
  const c = document.createElement('canvas'); c.width = c.height = px; c.className = 'v93-pj-av v95-pj-av'; c.setAttribute('aria-hidden', 'true');
  c.getContext('2d').drawImage(f.c, 0, 0);
  return c;
}

/* ---------------------------------------------------------------- o painel */
const V95_IC_PJ = {
  g:'<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6.4" fill="#fff" stroke="#0b0d14" stroke-width="1.6"/><path d="M8 4.7l2.5 1.8-.95 2.9h-3.1l-.95-2.9z" fill="#0b0d14"/></svg>',
  a:'<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2.6 3.6h4.2l.7 4c2.5.1 5.3.7 6 2.4.3.8-.2 1.6-1 1.6H3.4c-.5 0-.9-.4-.9-.9z" fill="#fff" stroke="#0b0d14" stroke-width="1.4" stroke-linejoin="round"/><path d="M4.4 11.8v1.6M7.4 11.8v1.6M10.4 11.8v1.6" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/></svg>',
  d:'<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4.4 14.6V9L3 6.4c-.5-1 .9-1.7 1.5-.8l1 1.6V3.3c0-1.1 1.6-1.1 1.6 0v3.4V2.4c0-1.1 1.6-1.1 1.6 0v4.3V3.1c0-1.1 1.6-1.1 1.6 0v3.8V4.6c0-1.1 1.5-1.1 1.5 0v5.5c0 2.6-1.6 4.5-4.1 4.5z" fill="#fff" stroke="#0b0d14" stroke-width="1.2" stroke-linejoin="round"/></svg>'
};
function v95PainelDados(){                                    // os dois times, quem está fora e, de cada um: a foto, a bandeira, o clube e o ping
  const out = {times:[[], []], fora:[]};
  if (NET49.playing && NET49.room){
    const r = NET49.room, Pn = V93P.painel && V93P.painel.round === r.round ? V93P.painel : null, n = r.n | 0;
    for (let i = 0; i < 2*n; i++){
      const t = Math.floor(i/n), J = Pn && Pn.j ? Pn.j[i] : null, id = J ? J.id : r.roster[i], m = v95MembroSala(id), eu = !!id && id === NET49.id;
      const q = (RQ.jog || []).find(x => x && x.id === i) || (RQ.jog || [])[i] || null;
      const st = J ? J.st : m ? 'ativo' : 'bot';
      const clube = m ? v95ClubeNorm(m.club) : null;
      let emoji = ''; try { emoji = q ? emjDe(q) : m ? emjDeMembro(m) : ''; } catch (_) {}
      out.times[t].push({nome:m ? m.name : J ? J.nome : (q && q.nome) || 'Bot', skin:v95SkinDe(q, m, eu && !!q && q === P, t), emoji, avatar:m && m.cos ? m.cos.avatar || '' : '',
        time:t, st, eu, e:J && J.e, ms:J && J.ms != null ? J.ms | 0 : eu ? Math.round(NET49.ping || 0) : null, ate:J && J.ate, clube, flag:m ? m.flag || '' : '', bot:st === 'bot'});
    }
    for (const x of (Pn && Pn.fora) || (r.members || []).filter(x => x.slot < 0).map(x => ({id:x.id, nome:x.name, skin:x.skin, banco:!!x.banco}))){
      const m = v95MembroSala(x.id);
      let emoji = ''; try { emoji = m ? emjDeMembro(m) : ''; } catch (_) {}
      out.fora.push({nome:x.nome, skin:x.skin || (m && m.skin) || '', emoji, avatar:m && m.cos ? m.cos.avatar || '' : '', time:-1, st:x.banco ? 'banco' : 'espec', eu:x.id === NET49.id,
        clube:m ? v95ClubeNorm(m.club) : null, flag:m ? m.flag || '' : ''});
    }
  } else if (RQ.on){
    (RQ.jog || []).forEach((q, i) => {
      const t = q.time | 0, eu = q === P, e = V93P.estat.get(eu ? 'eu' : 'b' + i) || null;
      let emoji = ''; try { emoji = emjDe(q); } catch (_) {}
      out.times[t].push({nome:eu ? perfil.nome : q.nome || 'Bot', skin:v95SkinDe(q, null, eu, t), emoji, avatar:eu ? v95MeuAvatar() : '', time:t, st:eu ? 'ativo' : 'bot', eu, e,
        clube:eu ? v95MeuClube() : null, flag:eu ? slPais() : '', bot:!eu});
    });
  }
  return out;
}
function v95PingCor(ms){ return ms == null ? 'ok' : ms < 90 ? 'ok' : ms < 180 ? 'meio' : 'ruim'; }
function v95Linha(o, css){
  const li = nodo('li', 'v93-pj-l v95-pj-l' + (o.st ? ' st-' + o.st : '') + (o.eu ? ' eu' : ''));
  li.appendChild(v95Foto(o, css));
  const tx = nodo('span', 'v93-pj-tx v95-pj-tx');
  const nm = nodo('span', 'v95-pj-nm');
  nm.appendChild(nodo('b', null, o.nome || 'Jogador'));
  if (o.flag){ const f = nodo('span', 'v95-pj-fl'); f.innerHTML = slBandeira(o.flag); nm.appendChild(f); }
  if (o.st === 'ativo' || o.st === 'banco' || o.st === 'espec' || o.st === 'caiu'){
    const d = nodo('i', 'v95-pj-on ' + (o.st === 'caiu' ? 'caiu' : v95PingCor(o.ms)));
    d.setAttribute('aria-label', o.st === 'caiu' ? 'caiu' : o.ms != null ? o.ms + ' ms' : 'conectado'); nm.appendChild(d);
  }
  let sub = o.clube ? o.clube.nome : '', cls = 'v95-pj-cl';
  if (o.st === 'caiu'){ sub = 'CAIU · O BOT SEGURA' + (o.ate ? ' (' + o.ate + ' s)' : ''); cls += ' aviso'; }
  else if (o.st === 'bot'){ sub = 'BOT'; cls += ' fraco'; }
  else if (!sub){ sub = o.st === 'banco' ? 'RESERVA' : o.st === 'espec' ? 'ASSISTINDO' : o.eu ? 'VOCÊ · SEM CLUBE' : 'SEM CLUBE'; cls += ' fraco'; }
  tx.append(nm, nodo('small', cls, sub));
  li.appendChild(tx);
  const e = o.e || (o.time === 0 || o.time === 1 ? {g:0, a:0, d:0} : null);
  if (e){
    const n = nodo('span', 'v93-pj-n v95-pj-n');
    for (const [k, v] of [['g', e.g], ['a', e.a], ['d', e.d]]){ const s = nodo('em'); s.innerHTML = V95_IC_PJ[k]; s.appendChild(document.createTextNode(String(v | 0))); n.appendChild(s); }
    li.appendChild(n);
  }
  return li;
}
function v95PainelCss(){ try { return innerHeight <= 430 || innerWidth <= 700 ? 30 : 44; } catch (_) { return 44; } }
function v95LadoCab(t, cor){                                  // um lado do confronto: o clube do time (o escudo e a sigla) ou a cor do time
  const s = nodo('span', 'v95-pj-lado'); s.style.setProperty('--c3', cor.claro);
  const c = v95ClubeDoTime(t);
  if (c){
    const e = v95EscudoImg(c.escudo, 24*Math.min(2, window.devicePixelRatio || 1)), k = document.createElement('canvas');
    k.width = e.width; k.height = e.height; k.getContext('2d').drawImage(e, 0, 0); k.setAttribute('aria-hidden', 'true');
    const b = nodo('b', null, c.tag); b.title = c.nome;
    if (t) s.append(b, k); else s.append(k, b);
  } else s.appendChild(nodo('b', null, typeof v95NomeTime === 'function' ? v95NomeTime(t) : t ? 'TIME B' : 'TIME A'));
  return s;
}
v93PainelPinta = function(){
  const p = V93P.el.p, bt = V93P.el.bt; if (!p) return;
  const vis = v93NaPartida() && !PAUSA.aberta;
  bt.hidden = !vis; bt.setAttribute('aria-pressed', String(!!V93P.aberto));
  p.hidden = !(vis && V93P.aberto);
  if (p.hidden){ V95H.assin = ''; return; }
  p.classList.add('v95-pj');
  const D = v95PainelDados(), cores = [rqCor(0), rqCor(1)], css = v95PainelCss();
  const modo = NET49.playing ? (NET49.room && NET49.room.ranked ? 'RANQUEADA' : 'SALA ' + (NET49.room ? NET49.room.code : '')) : (X49.matchMode === 'ranked' ? 'RANQUEADA' : 'CONTRA OS BOTS');
  const cl = [v95ClubeDoTime(0), v95ClubeDoTime(1)];
  const assin = JSON.stringify([D, cores.map(c => c.base), css, modo, cl, EMJ && !!EMJ.atlas]);
  if (assin === V95H.assin && p.firstChild){ v93PainelLugar(); return; }   // (nada mudou: a mesma lista, só o lugar)
  V95H.assin = assin;
  p.textContent = '';
  const cab = nodo('div', 'v93-pj-cab v95-pj-cab');
  const vs = nodo('div', 'v95-pj-vs'); vs.append(v95LadoCab(0, cores[0]), nodo('i', null, '×'), v95LadoCab(1, cores[1]));
  cab.append(vs, nodo('small', null, modo));
  p.appendChild(cab);
  const cols = nodo('div', 'v93-pj-cols');
  D.times.forEach((L, t) => {
    const col = nodo('div', 'v93-pj-time v95-pj-t'); col.style.setProperty('--c', cores[t].base); col.style.setProperty('--c2', cores[t].escuro); col.style.setProperty('--c3', cores[t].claro);
    const ul = nodo('ul'); for (const o of L) ul.appendChild(v95Linha(o, css)); col.appendChild(ul);
    cols.appendChild(col);
  });
  p.appendChild(cols);
  if (D.fora.length){
    const f = nodo('div', 'v93-pj-fora v95-pj-fora'); f.appendChild(nodo('h4', null, 'BANCO E QUEM ASSISTE'));
    const ul = nodo('ul'); for (const o of D.fora) ul.appendChild(v95Linha(o, css)); f.appendChild(ul);
    p.appendChild(f);
  }
  const leg = nodo('p', 'v93-pj-leg v95-pj-leg');
  leg.innerHTML = '<span>' + V95_IC_PJ.g + 'gols</span><span>' + V95_IC_PJ.a + 'assistências</span><span>' + V95_IC_PJ.d + 'defesas</span>';
  p.appendChild(leg);
  if (V95H.refaz){ V95H.refaz = false; V95H.assin = ''; }        // (uma foto ainda sem o emoji: refaz na próxima volta)
  v93PainelLugar();
};
v93PainelLugar = function(){                                  // o botão do lado do placar e o painel embaixo dele, sem cobrir nenhum controle
  const bt = V93P.el.bt, p = V93P.el.p; if (!bt) return;
  const c = cv.getBoundingClientRect(), wr = (bt.offsetParent || document.body).getBoundingClientRect(), k = c.width/W, hk = HUDX.k || 1;
  const L = v93LadoPlacar(), lado = L.lado;
  let x = L.xs[0], ok = false;
  for (const x0 of L.xs){
    const R = {x:x0, y:L.y - lado/2, w:lado, h:lado}; let livre = x0 > 0 && x0 + lado < W;
    for (const id of HE_ORDEM){ if (!livre) break; if (!controleVisivel(id)) continue; const e = el(id); if (heSobra(R, {x:e.x, y:e.y, r:e.r + 10})) livre = false; }
    if (livre){ x = x0; ok = true; break; }
  }
  V93P.ladoX = x;
  const px = Math.max(36, Math.round(lado*k));
  bt.style.width = bt.style.height = px + 'px';
  bt.style.left = Math.round(c.left - wr.left + x*k + (lado*k - px)/2) + 'px';
  bt.style.top = Math.round(c.top - wr.top + L.y*k - px/2) + 'px';
  bt.classList.toggle('v93-pj-sem-lugar', !ok);
  if (!p.hidden){
    const larg = c.width >= 1000 ? 620 : c.width >= 900 ? 520 : 440;   // (no celular deitado, estreito: entre o analógico e os botões)
    const pw = Math.min(larg, c.width - 24); p.style.width = pw + 'px';
    const yv = (PLACAR80.y + PLACAR80.h + 40)*hk, ph = p.offsetHeight, y0 = c.top - wr.top + yv*k;
    let melhor = null;
    for (const xc of [(c.width - pw)/2, 12, c.width - pw - 12]){
      const Rr = {x:c.left + xc, y:c.top + yv*k, w:pw, h:ph}; let custo = Math.abs(xc - (c.width - pw)/2)*.1;
      for (const id of HE_ORDEM){ if (!controleVisivel(id)) continue; const e = el(id); if (heSobra(Rr, {x:c.left + e.x*k, y:c.top + e.y*k, r:e.r*k + 8})) custo += 1000; }
      if (!melhor || custo < melhor.c) melhor = {c:custo, x:xc};
    }
    p.style.left = Math.round(c.left - wr.left + melhor.x) + 'px'; p.style.top = Math.round(y0) + 'px';
  }
};
window.RachaHud95 = {
  clube:t => v95ClubeDoTime(t), meuClube:() => v95MeuClube(), norm:c => v95ClubeNorm(c), dados:() => v95PainelDados(),
  foto:(o, css) => v95Foto(o, css), placar:() => ({wc:PLACAR80.wc, wl:PLACAR80.wl, y:PLACAR80.y, h:PLACAR80.h, w:v80PlacarW()})
};
