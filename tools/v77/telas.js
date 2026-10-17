/* ======================================================================================================================
   RACHA rua v77 · AS TELAS COMO NAS IMAGENS (o pedido: "quero todo jogo parecido com essas imagens do perfil e do lobby …
   você viu que no perfil só tem o perfil: quero tudo assim, ranking do ranking, porque quando clica num botão tem vários
   botões; quero tudo em ordem").
   Qual implementação valia: as telas do jogo-base (TELAS, abreTela/fechaTela, o cabeçalho .tl-cab de cada <section>) com as
   abas de grupo (GRUPOS + montaAbas, chamado no fim do script): PERFIL · RANKING · REPLAYS numa tela e, desde a v70
   (tools/v70/comunidade.js), INÍCIO · SALAS · CLUBE · COPA · CHAT DO BRASIL debaixo de COMUNIDADE; o visual da v71.1
   (v71.css) e o PERFIL em partes da v70/v71 (CARTÃO · ESTATÍSTICAS · RECORDES · PARTIDAS, renderPerfil da v70).
   O que muda:
   · CADA BOTÃO ABRE SÓ A SUA TELA: sem as abas que levavam para as outras telas; cada uma com o próprio título (PERFIL,
     RANKING, SALAS, CLUBE, EVENTOS, AMIGOS, LOJA, TREINO…). A COMUNIDADE virou a tela AMIGOS (os amigos e o chat); a COPA
     virou EVENTOS; os REPLAYS ficam dentro do PERFIL (aba PARTIDAS).
   · A MESMA BARRA EM CIMA em todas: o VOLTAR, o título com o desenho, as moedas e as gemas com o +, o chat, os amigos e os
     ajustes (como no perfil da imagem). Atrás das telas, a quadra do lobby escurecida (as telas não são mais um fundo liso).
   · O PERFIL DA IMAGEM: a tampinha reta (como no lobby) na quadra, à esquerda; à direita o cartão com o banner do morro e o
     letreiro, a sua tampinha no aro com o nível no hexágono, o nome com a bandeira, o ID (com o botão de copiar), o XP e as
     abas VISÃO GERAL · ESTATÍSTICAS · CONQUISTAS · PARTIDAS. Os números são os de verdade (os mesmos da v70); o "melhor da
     partida" da imagem virou a MELHOR SEQUÊNCIA de vitórias (o jogo não elege craque da partida: não tem esse número).
   São os mesmos elementos (os mesmos ids e cliques: o nome, a bio, os títulos, as estatísticas) mudados de lugar; o visual
   mora no v77.css. Nada aqui mexe em partida, física, rede, conta ou economia.
   ====================================================================================================================== */
const V77T = {parte:'geral', pf:null};
const V77_TELAS = {perfil:['PERFIL', 'coroa'], ranking:['RANKING', 'ranking'], replays:['REPLAYS', 'bola'], amigos:['SALAS', 'salas'], clube:['CLUBE', 'clube'],
  copa:['EVENTOS', 'eventos'], chat:['CHAT DO BRASIL', 'amigos_topo'], comunidade:['AMIGOS', 'amigos'], loja:['LOJA', 'loja'], treino:['TREINO', 'treino'], skins:['SUA TAMPINHA', 'tampinha']};
const V77T_SVG = {
  chat:'<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M11 11h42a5 5 0 0 1 5 5v23a5 5 0 0 1-5 5H29L17 55V44h-6a5 5 0 0 1-5-5V16a5 5 0 0 1 5-5z" fill="#f6f3ea" stroke="#0b0c0e" stroke-width="4" stroke-linejoin="round"/><circle cx="21" cy="27.5" r="3.6" fill="#0b0c0e"/><circle cx="32" cy="27.5" r="3.6" fill="#0b0c0e"/><circle cx="43" cy="27.5" r="3.6" fill="#0b0c0e"/></svg>',
  pessoa:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="7.6" r="4.6" fill="currentColor"/><path d="M3.4 21.5c0-5.3 3.8-8.4 8.6-8.4s8.6 3.1 8.6 8.4z" fill="currentColor"/></svg>',
  barras:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="12" width="4.4" height="9" rx="1" fill="currentColor"/><rect x="9.8" y="4" width="4.4" height="17" rx="1" fill="currentColor"/><rect x="16.6" y="8.5" width="4.4" height="12.5" rx="1" fill="currentColor"/></svg>',
  trofeu:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h10v5.4a5 5 0 0 1-10 0z" fill="currentColor"/><path d="M7 4.6H3.6v1.6A3.6 3.6 0 0 0 7.2 9.8M17 4.6h3.4v1.6a3.6 3.6 0 0 1-3.6 3.6" fill="none" stroke="currentColor" stroke-width="2"/><rect x="10.7" y="13" width="2.6" height="4" fill="currentColor"/><rect x="7.4" y="17.2" width="9.2" height="3.4" rx="1" fill="currentColor"/></svg>',
  lista:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="6" r="2" fill="currentColor"/><circle cx="5" cy="12" r="2" fill="currentColor"/><circle cx="5" cy="18" r="2" fill="currentColor"/><rect x="9" y="4.6" width="12" height="2.8" rx="1.4" fill="currentColor"/><rect x="9" y="10.6" width="12" height="2.8" rx="1.4" fill="currentColor"/><rect x="9" y="16.6" width="12" height="2.8" rx="1.4" fill="currentColor"/></svg>',
  copia:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="12" height="13" rx="2.4" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M5.5 15.5H5a1.6 1.6 0 0 1-1.6-1.6V4.6A1.6 1.6 0 0 1 5 3h8.6a1.6 1.6 0 0 1 1.6 1.6v.6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
  ok:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.6 4.6L19 7.5" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  replay:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/><path d="M3.6 3.8v4.6h4.6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M10 8.6v6.8l5.4-3.4z" fill="currentColor"/></svg>'
};

/* ---------------------------------------------------------------- 1) cada botão abre só a sua tela (sem as abas de grupo) */
const montaAbasAntes77 = montaAbas;
montaAbas = function(){
  if (V77L.on){ delete GRUPOS.perfil; delete GRUPOS.galera; }
  const r = montaAbasAntes77.apply(this, arguments);
  if (V77L.on) try { v77Cabecalhos(); } catch (e) { window.RUA_TELAS77_ERRO = String(e && e.stack); }
  return r;
};
const CARTEIRA77 = '<button type="button" class="lb-grana" data-loja="1" aria-label="Moedas: abrir a loja"><i class="ic-moeda"></i><b class="n-moedas">0</b></button><button type="button" class="lb-grana" data-loja="1" aria-label="Gemas: abrir a loja"><i class="ic-gema"></i><b class="n-gemas">0</b></button>';
function v77Cabecalhos(){                                    // o título de cada tela (com o desenho), as moedas e os 3 ícones
  for (const id in V77_TELAS){
    const T = TELAS[id], cab = T && T.el && (T.el.querySelector(':scope > .tl-cab') || T.el.querySelector(':scope > .br-painel > .tl-cab')); if (!cab || cab.classList.contains('v77-cab')) continue;
    const [nome, ic] = V77_TELAS[id], h2 = cab.querySelector('h2'); if (!h2) continue;
    cab.classList.add('v77-cab'); T.el.classList.add('v77-tl');
    h2.textContent = nome; T.el.setAttribute('aria-label', nome.charAt(0) + nome.slice(1).toLowerCase());
    const tit = nodo('div', 'v77-tit'); h2.replaceWith(tit); tit.appendChild(h2); if (ic) tit.appendChild(v77Ic(ic, 64, 58, 'v77-tit-ic'));
    let cart = cab.querySelector('.tl-carteira');
    if (!cart){ cart = nodo('div', 'tl-carteira'); cart.innerHTML = CARTEIRA77; cab.appendChild(cart); }
    const ics = nodo('div', 'v77-cab-ic');
    const bt = (cls, rot, conteudo, fn) => { const b = novoBotao('v77-cab-bt ' + cls, rot); if (typeof conteudo === 'string') b.innerHTML = conteudo; else b.appendChild(conteudo); b.addEventListener('click', () => { som.clique(); fn(); }); return b; };
    ics.append(bt('v77-cab-chat', 'Chat do Brasil', V77T_SVG.chat, () => { if (lobby.tela !== 'chat') abreTela('chat'); }),
      bt('v77-cab-amg', 'Amigos', v77Ic('amigos_topo', 50, 42), () => { if (lobby.tela !== 'comunidade') v77AbreAmigos(); }),
      bt('v77-cab-aj', 'Ajustes', v77Ic('ajustes_topo', 48, 48), () => { try { LB.ajustes.click(); } catch (_) {} }));
    cab.appendChild(ics);
  }
  try { lbCarteira(); } catch (_) {}
}
// a tela aberta esconde o lobby (fica só a quadra no fundo, escurecida pela tela); o perfil tem a quadra dele (a tampinha à esquerda)
const lbMarcaTelaAntes77 = lbMarcaTela;
lbMarcaTela = function(){
  const r = lbMarcaTelaAntes77.apply(this, arguments);
  if (V77L.on){
    const antes = LB.raiz.dataset.v77tela || '', agora = lobby.tela || '';
    LB.raiz.classList.toggle('v77-tela', !!lobby.tela);
    if (antes !== agora){ LB.raiz.dataset.v77tela = agora; if ((antes === 'perfil') !== (agora === 'perfil')) try { LB.fundo.dataset.k = ''; pintaFundoLobby(); } catch (_) {} }
  }
  return r;
};
// o fundo do perfil: a mesma imagem, com o meio da quadra embaixo da tampinha do perfil (à esquerda do cartão)
(function(){
  const cenaAntes77t = window.RUA_CENA;
  window.RUA_CENA = function(g, w, h, chao, cx, esq, dir, zonas, X){
    if (V77L.on && lobby.tela === 'perfil' && V77P.fundo && V77.ok.fundo && !(X && X.ret) && !window.RUA_FUNDO77_DESLIGA){
      try {
        const F = V77P.fundo, s = Math.max(h/F.h, w/F.w)*1.1, C = v77PfCena(w, h);   // (o meio da quadra embaixo do chão da tampinha do perfil)
        const x = Math.min(0, C.x - 915*s), y = Math.min(0, Math.max(h - F.h*s, C.chao - 640*s));
        g.fillStyle = '#0d0e10'; g.fillRect(0, 0, w, h);
        try { g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; } catch (_) {}
        g.drawImage(V77.img.fundo, x, y, F.w*s, F.h*s);
        const gt = g.createLinearGradient(0, 0, 0, 170); gt.addColorStop(0, 'rgba(6,8,12,.45)'); gt.addColorStop(1, 'rgba(6,8,12,0)'); g.fillStyle = gt; g.fillRect(0, 0, w, 170);
        return true;
      } catch (e) { window.RUA_TELAS77_ERRO = String(e && e.stack); }
    }
    return cenaAntes77t.apply(this, arguments);
  };
})();
// a área da tampinha do perfil (px do palco): à esquerda do cartão, embaixo do cabeçalho (as mesmas medidas do v77.css)
V77T.cab = 116; V77T.largura = w => Math.round(Math.min(800, Math.max(720, w*.41)));
function v77PfCena(w, h){
  const L = 34, Rt = w - 27 - V77T.largura(w) - 20, T = V77T.cab, B = h - 20, lw = Rt - L, lh = B - T;
  const R = Math.min(lw*.3, lh*.25, 150), x = L + lw/2, y = T + lh*.6;
  return {x, y, R, chao:y + R*.97};
}

/* ---------------------------------------------------------------- 2) AMIGOS (era a COMUNIDADE) e EVENTOS (a Copa) */
const cmRenderAntes77 = cmRender;
cmRender = function(){
  if (!V77L.on) return cmRenderAntes77.apply(this, arguments);
  cmRenderAntes77.apply(this, arguments);                   // (a v70 monta tudo; a tela AMIGOS fica só com os amigos e o chat)
  try {
    const raiz = CM.corpo; if (!raiz) return;
    const tit = raiz.querySelector('.sx-tit'); if (tit){ tit.textContent = ''; tit.append('AMIGOS'); }
    for (const c of raiz.querySelectorAll('.cm-card.cm-salas, .cm-card.cm-copa, .cm-clube')) c.remove();
    const grade = raiz.querySelector('.cm-grade'); if (grade) grade.classList.add('v77-amg-grade');
  } catch (_) {}
};
if (typeof window.v70CmFoca === 'function'){ const focaAntes77 = window.v70CmFoca; window.v70CmFoca = function(k){ try { return focaAntes77(k === 'salas' || k === 'copa' ? 'amigos' : k); } catch (_) {} }; }

/* ---------------------------------------------------------------- 3) o PERFIL da imagem */
const V77PF_PARTES = [['geral', 'VISÃO GERAL', 'pessoa'], ['est', 'ESTATÍSTICAS', 'barras'], ['conq', 'CONQUISTAS', 'trofeu'], ['hist', 'PARTIDAS', 'lista']];
function v77FmtTempo(s){                                    // 124h 36min · 12min · 40s
  s = Math.max(0, Math.round(s || 0));
  const h = Math.floor(s/3600), m = Math.floor((s % 3600)/60);
  return h ? h + 'h ' + String(m).padStart(2, '0') + 'min' : m ? m + 'min' : s + 's';
}
function v77PfMonta(){
  if (V77T.pf) return V77T.pf;
  const tela = TELAS.perfil && TELAS.perfil.el, corpo = tela && tela.querySelector('.pf-corpo'); if (!corpo || !V77L.on) return null;
  const E = pxMonta(); if (!E) return null;
  corpo.classList.add('v77-pf');
  const painel = nodo('section', 'v77-pf-painel'); painel.setAttribute('aria-label', 'Cartão do jogador');
  // o banner: as casas do morro no escuro e o letreiro
  const ban = nodo('div', 'v77-pf-banner');
  if (V77P.banner) ban.style.backgroundImage = 'url("' + V77P.banner.src + '")';
  if (V77P.letreiro){ const im = nodo('img', 'v77-pf-letreiro'); im.src = V77P.letreiro.src; im.alt = ''; im.draggable = false; ban.appendChild(im); }
  // você: a tampinha no aro, o nível no hexágono, o nome com a bandeira, o ID (copiar) e o XP
  const id = nodo('div', 'v77-pf-id');
  const av = novoBotao('v77-pf-av', 'A sua tampinha: personalizar'); const avc = document.createElement('canvas'); avc.className = 'v77-pf-avc'; avc.setAttribute('aria-hidden', 'true'); av.appendChild(avc);
  av.addEventListener('click', () => abreTela('skins', 'perfil'));
  const nv = nodo('div', 'v77-pf-nv');
  nv.innerHTML = '<svg viewBox="0 0 100 112" aria-hidden="true"><path d="M50 4l42 24v56L50 108 8 84V28z" fill="#151618" stroke="#e9b10c" stroke-width="7" stroke-linejoin="round"/><path d="M50 13l34 19.6v46.8L50 99 16 79.4V32.6z" fill="none" stroke="rgba(255,226,120,.35)" stroke-width="2"/></svg><small>NV</small><b>1</b>';
  const info = nodo('div', 'v77-pf-info');
  const nomeL = nodo('div', 'v77-pf-nome'), nomew = tela.querySelector('.lb-nomew'); if (nomew) nomeL.appendChild(nomew);
  const pais = nodo('span', 'v77-pf-pais'); try { pais.innerHTML = slBandeira(slPais()); } catch (_) {} nomeL.appendChild(pais);
  const idL = nodo('div', 'v77-pf-idl'), idR = nodo('span', 'v77-pf-idrot', 'ID:');
  idL.append(idR, PF.uid);
  const cp = novoBotao('v77-pf-copia', 'Copiar o ID'); cp.innerHTML = V77T_SVG.copia;
  cp.addEventListener('click', () => {
    som.clique(); const t = PF.uid.textContent || '';
    const ok = () => { cp.innerHTML = V77T_SVG.ok; cp.classList.add('ok'); aviso('ID copiado: ' + t); setTimeout(() => { cp.innerHTML = V77T_SVG.copia; cp.classList.remove('ok'); }, 1400); };
    try { navigator.clipboard.writeText(t).then(ok, () => aviso('ID: ' + t)); } catch (_) { aviso('ID: ' + t); }
  });
  idL.appendChild(cp); if (E.selo) idL.appendChild(E.selo);
  info.append(nomeL, idL);
  const xpL = nodo('div', 'v77-pf-xpl'), xpBar = tela.querySelector('.pf-xp'), xpTx = $('pf-xp-tx');
  if (xpBar) xpL.appendChild(xpBar); if (xpTx) xpL.appendChild(xpTx);
  id.append(av, nv, info, xpL);
  // as abas
  const abas = nodo('nav', 'v77-pf-abas'); abas.setAttribute('role', 'tablist'); abas.setAttribute('aria-label', 'Perfil');
  for (const [k, nome, ic] of V77PF_PARTES){
    const b = novoBotao('v77-pf-aba', null); b.dataset.parte = k; b.setAttribute('role', 'tab'); b.id = 'v77-pf-t-' + k;
    b.innerHTML = V77T_SVG[ic]; b.appendChild(nodo('span', null, nome)); abas.appendChild(b);
  }
  abas.addEventListener('click', e => { const b = e.target.closest('[data-parte]'); if (!b || b.dataset.parte === V77T.parte) return; som.clique(); v77PfParte(b.dataset.parte); });
  abas.addEventListener('keydown', e => {
    const l = Array.from(abas.children), i = l.findIndex(b => b.dataset.parte === V77T.parte);
    const j = e.key === 'ArrowRight' ? (i + 1) % l.length : e.key === 'ArrowLeft' ? (i - 1 + l.length) % l.length : e.key === 'Home' ? 0 : e.key === 'End' ? l.length - 1 : -1;
    if (j < 0) return; e.preventDefault(); v77PfParte(l[j].dataset.parte); try { l[j].focus(); } catch (_) {}
  });
  // VISÃO GERAL: o tempo em campo, a melhor sequência, a bio e os 5 números
  const geral = nodo('div', 'v77-pf-parte v77-pf-geral'); geral.setAttribute('role', 'tabpanel');
  const cards = nodo('div', 'v77-pf-cards');
  const card = (cls, ic, rot) => { const c = nodo('div', 'v77-pf-card ' + cls), cab = nodo('div', 'v77-pf-card-cab'); cab.append(v77Ic(ic, 48, 48), nodo('small', null, rot)); c.appendChild(cab); return c; };
  const cTempo = card('v77-pf-tempo', 'relogio', 'TEMPO JOGADO EM CAMPO'); const tTempo = nodo('b', 'v77-pf-v'); cTempo.appendChild(tTempo);
  const cSeq = card('v77-pf-seq', 'estrela', 'MELHOR SEQUÊNCIA'); const tSeq = nodo('b', 'v77-pf-v'); cSeq.appendChild(tSeq);
  const cBio = card('v77-pf-bio', 'bio', 'BIO'); const bio = tela.querySelector('.pf-bio'); if (bio){ const tag = bio.querySelector('.pf-tag'); if (tag) tag.remove(); cBio.appendChild(bio); }
  cards.append(cTempo, cSeq, cBio);
  const nums = nodo('div', 'v77-pf-nums');
  for (const [sid, ic] of [['st-gols', 'bola'], ['st-assist', 'chuteira'], ['st-vitorias', 'trofeu'], ['st-partidas', 'controle'], ['st-aprov', 'porcento']]){
    const b = $(sid), st = b && b.closest('.pf-st'); if (!st) continue;
    const i = st.querySelector(':scope > i'); if (i){ i.textContent = ''; i.appendChild(v77Ic(ic, 40, 40)); i.classList.add('v77-st-ic'); }
    st.classList.add('v77-st'); nums.appendChild(st);
  }
  const lg = $('st-gols') && $('st-gols').nextElementSibling; if (lg) lg.textContent = 'GOLS';
  const lp = $('st-partidas') && $('st-partidas').nextElementSibling; if (lp) lp.textContent = 'PARTIDAS';
  geral.append(cards, nums);
  // ESTATÍSTICAS: as da v70 (onde jogou × modo)
  const est = nodo('div', 'v77-pf-parte v77-pf-est'); est.setAttribute('role', 'tabpanel'); est.appendChild(E.sec);
  // CONQUISTAS: as insígnias, os títulos (com a conta de cada um), os 2 do cartão e a próxima meta
  const conq = nodo('div', 'v77-pf-parte v77-pf-conq'); conq.setAttribute('role', 'tabpanel');
  const emb = tela.querySelector('.pf-emblemas'); const topo = nodo('div', 'v77-pf-conq-topo'); if (emb) topo.appendChild(emb); topo.appendChild(E.meta);
  const tits = nodo('div', 'v77-pf-tits'); tits.setAttribute('role', 'list'); tits.setAttribute('aria-label', 'Títulos');
  const noCartao = nodo('div', 'v77-pf-nocartao'); noCartao.appendChild(nodo('small', null, 'NO SEU CARTÃO'));
  for (const b of PF.tits || []) noCartao.appendChild(b);
  const recs = tela.querySelector('.pf-recs');
  conq.append(topo, nodo('h3', 'lb-sub v77-pf-h', 'TÍTULOS'), tits, noCartao);
  if (recs) conq.appendChild(recs);
  // PARTIDAS: os recordes das partidas, as últimas partidas e os REPLAYS dos gols
  const hist = nodo('div', 'v77-pf-parte v77-pf-hist'); hist.setAttribute('role', 'tabpanel');
  const part = tela.querySelector('.pf-partidas'); if (part) hist.appendChild(part);
  const rp = novoBotao('lb-btn azul v77-pf-replays', 'Replays dos seus gols'); rp.innerHTML = V77T_SVG.replay + '<span>REPLAYS</span>';
  rp.addEventListener('click', () => abreTela('replays', 'perfil'));
  hist.appendChild(rp);
  painel.append(ban, id, abas, geral, est, conq, hist);
  corpo.insertBefore(painel, tela.querySelector('.pf-cartao') || null);   // (antes do cartão antigo, que fica escondido: a ordem do documento é a da tela)
  const lado = tela.querySelector('.pf-lado'); if (lado) lado.classList.add('v77-pf-lado');
  V77T.pf = {painel, ban, id, av, avc, nv, abas, geral, est, conq, hist, tTempo, tSeq, tits, pais, corpo, lado};
  v77PfParte(V77T.parte);
  return V77T.pf;
}
const V77PF_V70 = {geral:'cartao', est:'est', conq:'rec', hist:'hist'}, V70PF_V77 = {cartao:'geral', est:'est', rec:'conq', hist:'hist'};
function v77PfParte(k){
  const P = V77T.pf; if (!P) return;
  if (!V77PF_PARTES.some(p => p[0] === k)) k = 'geral';
  V77T.parte = k;
  try { V70PF.parte = V77T.v70 = V77PF_V70[k]; } catch (_) {}   // (quem abre o perfil numa parte pelo jeito antigo continua funcionando)
  for (const b of P.abas.children){ const on = b.dataset.parte === k; b.classList.toggle('on', on); b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; }
  for (const [q] of V77PF_PARTES){ const el = P[q]; el.hidden = q !== k; el.setAttribute('aria-labelledby', 'v77-pf-t-' + q); }
  P.corpo.classList.toggle('v77-pf-largo', k !== 'geral');   // (fora da VISÃO GERAL o cartão abre para a tela toda: as listas cabem sem rolar)
  try { PFP.feito = false; } catch (_) {}
}
function v77PfTitulos(){                                    // os 7 títulos com a conta de cada um (o conquistado fica dourado)
  const P = V77T.pf; if (!P) return;
  P.tits.textContent = '';
  for (const T of TITULOS){
    const v = Math.min(T.meta, Math.floor(T.valor())), ok = tituloGanho(T);
    const c = nodo('div', 'v77-pf-tit' + (ok ? ' ok' : '')); c.setAttribute('role', 'listitem'); c.style.setProperty('--c1', T.cor[0]); c.style.setProperty('--c2', T.cor[1]);
    const bar = nodo('span', 'v77-pf-tit-bar'), i = nodo('i'); i.style.width = (100*v/T.meta).toFixed(1) + '%'; bar.appendChild(i);
    c.append(nodo('b', null, T.nome), nodo('small', null, ok ? 'CONQUISTADO' : T.req), bar, nodo('em', null, (T.id === 'craque' ? 'nível ' + v + '/' + T.meta : fmtNum(v) + '/' + fmtNum(T.meta))));
    c.setAttribute('aria-label', T.nome + ': ' + (ok ? 'conquistado' : T.req + ', ' + v + ' de ' + T.meta));
    P.tits.appendChild(c);
  }
}
function v77PfAvatar(){                                     // a sua tampinha no aro do cartão
  const P = V77T.pf; if (!P) return;
  const c = P.avc, r = P.av.getBoundingClientRect(); if (r.width < 4) return;
  const k = Math.min(window.devicePixelRatio || 1, 2), w = Math.round(r.width*k), h = Math.round(r.height*k);
  if (c.width !== w || c.height !== h){ c.width = w; c.height = h; }
  const g = c.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, w, h);
  try { drawBotao(g, w/2, h/2, w*.43, skinAtual(), perfil.avatar, false, EST0); } catch (_) {}
}
const renderPerfilAntes77 = renderPerfil;
renderPerfil = function(){
  const r = renderPerfilAntes77.apply(this, arguments);
  if (!V77L.on) return r;
  try {
    const P = v77PfMonta(); if (!P) return r;
    const nv = nivelInfo(CONTA.xp), b = P.nv.querySelector('b'); if (b) b.textContent = nv.n;
    P.nv.classList.toggle('dois', nv.n >= 10); P.nv.classList.toggle('tres', nv.n >= 100);
    P.tTempo.textContent = v77FmtTempo(estSoma('t', null, null));
    P.tSeq.textContent = ''; P.tSeq.append(String(X49.bestSeq || 0), nodo('small', null, (X49.bestSeq || 0) === 1 ? ' vitória' : ' vitórias'));
    const xt = $('pf-xp-tx'); if (xt) xt.textContent = fmtNum(nv.atual) + ' / ' + fmtNum(nv.prox) + ' XP';
    for (const [sid, nome] of [['st-gols', 'GOLS'], ['st-assist', 'ASSIS\u00adTÊNCIAS'], ['st-vitorias', 'VITÓRIAS'], ['st-partidas', 'PARTIDAS'], ['st-aprov', 'APROVEI\u00adTAMENTO']]){   // (os nomes curtos dos 5 números, como na imagem)
      const el = $(sid) && $(sid).nextElementSibling; if (el && el.textContent !== nome) el.textContent = nome;
    }
    const sel = P.id.querySelector('.pf-ident'); if (sel){ const conta = sel.classList.contains('conta'); sel.textContent = conta ? 'CONTA' : 'LOCAL'; }
    v77PfTitulos(); v77PfAvatar(); v77PfParte(V77T.parte);
  } catch (e) { window.RUA_TELAS77_ERRO = String(e && e.stack); }
  return r;
};
// a tampinha do perfil: reta, como no lobby, grande, com a sombra no chão (sem os raios e os brilhos)
const pintaPalcoPerfilAntes77 = pintaPalcoPerfil;
pintaPalcoPerfil = function(t){
  if (!V77L.on || !V77T.pf) return pintaPalcoPerfilAntes77.apply(this, arguments);
  const box = PF.palcoBox, c = PF.palco, w = box.clientWidth, h = box.clientHeight;
  if (w < 20 || h < 20) return;
  const k = (PALCO.sc || PALCO.s)*(G().plano ? 0.75 : Math.min(window.devicePixelRatio || 1, 2)), key = w + 'x' + h + '@' + k.toFixed(3);   // (a escala da v70: PALCO.sc)
  if (c.dataset.k !== key){ c.style.width = w + 'px'; c.style.height = h + 'px'; c.width = Math.max(1, Math.round(w*k)); c.height = Math.max(1, Math.round(h*k)); c.dataset.k = key; }
  const g = c.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, c.width, c.height); g.setTransform(k, 0, 0, k, 0, 0);
  if (V77T.parte !== 'geral') return;                       // (nas outras abas o cartão cobre a tampinha)
  const sk = skinAtual(), R = Math.min(w*.3, h*.25, 150), x = w/2, y0 = h*.6, bob = Math.sin(t*1.7)*3, y = y0 + bob;   // (as medidas do v77PfCena)
  let gr = g.createRadialGradient(x, y0 + R*.9, 6, x, y0 + R*.9, R*2.2);
  gr.addColorStop(0, 'rgba(255,196,110,.16)'); gr.addColorStop(1, 'rgba(255,196,110,0)');
  g.fillStyle = gr; g.beginPath(); g.ellipse(x, y0 + R*.9, R*2.2, R*.55, 0, 0, TAU); g.fill();
  g.save(); g.translate(x + R*.06, y0 + R*.97); g.scale(1 - bob*.006, .2);
  gr = g.createRadialGradient(0, 0, 6, 0, 0, R*1.18); gr.addColorStop(0, 'rgba(4,4,8,.72)'); gr.addColorStop(.6, 'rgba(4,4,8,.42)'); gr.addColorStop(1, 'rgba(4,4,8,0)');
  g.fillStyle = gr; g.beginPath(); g.arc(0, 0, R*1.18, 0, TAU); g.fill(); g.restore();
  botaoPronto(g, x, y, R, sk, perfil.avatar, {t, bx:null, by:null, id:0, humor:''}, k);
};
// a tampinha grande também leva para a TAMPINHA (era o botão PERSONALIZAR, que saiu do lado)
(function(){ const box = PF.palcoBox; if (!box || !V77L.on) return; box.setAttribute('role', 'button'); box.tabIndex = 0; box.setAttribute('aria-label', 'A sua tampinha: personalizar');
  const vai = () => { som.clique(); abreTela('skins', 'perfil'); };
  box.addEventListener('click', vai); box.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); vai(); } }); })();
// as sub-abas antigas (v70/v71: CARTÃO · ESTATÍSTICAS · RECORDES · PARTIDAS) levam às novas (o botão antigo fica escondido; quem muda V70PF.parte cai na aba certa)
const v70PfAplicaAntes77 = v70PfAplica;
v70PfAplica = function(){
  const r = v70PfAplicaAntes77.apply(this, arguments);
  try { if (V77T.pf && V70PF.parte !== V77T.v70 && V70PF_V77[V70PF.parte]) v77PfParte(V70PF_V77[V70PF.parte]); } catch (_) {}
  return r;
};
