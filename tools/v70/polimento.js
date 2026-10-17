/* ==================================================================================================================
   RACHA rua v70 · Etapa 6 — POLIMENTO E ACESSIBILIDADE (só desenho e interface: a física, os bots e as regras não mudam)
   1) em campo: o contorno de cada time além da cor (CHEIO = o time da casa, TRACEJADO = o visitante), o VOCÊ em cima
      da sua tampinha (a setinha sempre; a palavra na saída de bola) e o mesmo símbolo no placar. O contorno escuro
      também separa a tampinha dourada do chão amarelo da Arena. Na sala, o seu cartão diz VOCÊ.
   2) as janelas (camadas): o foco entra, o Tab fica dentro, o fundo não responde (inert) e o foco volta para quem abriu;
      o Escape fecha só a camada de cima (janela › menu do editor › tela › lobby)
   3) as abas das telas com aria-selected e setas; os cartões da sala com teclado; as escolhas com o estado
   4) Reduzir animações: segue o sistema (prefers-reduced-motion) até a pessoa escolher; vale também na partida
      (sem confete, a faixa do GOL sem o carimbo, o cenário parado) e em todas as animações dos menus
   5) os ajustes com palavras simples; o AMIGOS do lobby abre no cartão AMIGOS da COMUNIDADE
   ================================================================================================================== */

/* ---------------------------------------------------------------- 1) em campo */
const V70P = {raioVoce:2.02};
function v70Contorno(g, q, x, y){                       // o contorno de q: cheio (casa) ou tracejado (visitante), por fora do halo
  const t = q && q.time; if (t !== 0 && t !== 1) return;
  const r = q.r || R_JOG, rr = r*(AROV.ate + .045);
  g.save();
  g.lineWidth = r*.085; g.strokeStyle = 'rgba(12,10,22,.9)';
  if (t === 1){ const c = TAU*rr/12; g.setLineDash([c*.6, c*.4]); }   // 12 traços iguais
  g.beginPath(); g.arc(x, y, rr, 0, TAU); g.stroke();
  g.restore();
}
const aroDeAntes70p = aroDe;
aroDe = function(g, q, x, y, cor, t){
  aroDeAntes70p(g, q, x, y, cor, t);
  if (RQ.on || RP.ativo) v70Contorno(g, q, x, y);       // na partida e no replay (no treino não tem time)
};
function v70VoceVisivel(){
  if (!RQ.on || RP.ativo || !RQ.jog || RQ.jog.length < 2) return false;
  if (NET49.playing && NET49.localSlot < 0) return false;   // quem assiste não tem boneco
  return RQ.estado === 'jogo' || RQ.estado === 'saida' || RQ.estado === 'gol';
}
function v70Voce(g, x, y, r){                           // a setinha branca de contorno escuro em cima da sua tampinha (e VOCÊ na saída)
  const ponta = y - r*V70P.raioVoce, w = r*.4, h = r*.38;
  g.save(); g.lineJoin = 'round';
  g.beginPath(); g.moveTo(x, ponta); g.lineTo(x - w, ponta - h); g.lineTo(x + w, ponta - h); g.closePath();
  g.lineWidth = r*.16; g.strokeStyle = '#120a24'; g.stroke();
  g.fillStyle = '#ffffff'; g.fill();
  g.restore();
  if (RQ.estado === 'saida') txt(g, 'VOCÊ', x, ponta - h - r*.5, 22, '#ffffff', '#120a24', 6);
}
const drawDirecaoAntes70p = drawDirecao;
drawDirecao = function(g, x, y, r){
  const v = drawDirecaoAntes70p(g, x, y, r);
  if (v70VoceVisivel()) v70Voce(g, x, y, r);
  return v;
};
const placarFundoAntes70p = placarFundo;
placarFundo = function(g, x0, y, h, wt, wp){            // no placar, o mesmo símbolo do contorno: ○ cheio (casa) e ◌ tracejado (visitante)
  placarFundoAntes70p(g, x0, y, h, wt, wp);
  const cy = y + h/2, rr = 7;
  g.save(); g.lineWidth = 3.4; g.strokeStyle = '#ffffff';
  g.beginPath(); g.arc(x0 + 15, cy, rr, 0, TAU); g.stroke();
  g.setLineDash([3.6, 2.6]); g.beginPath(); g.arc(x0 + 2*wp + wt - 15, cy, rr, 0, TAU); g.stroke();
  g.restore();
};
// a identidade de cada modo também na partida: a etiqueta do modo, na cor dele (a mesma faixa do JOGAR), ao lado do CASUAL.
// Vôlei, americano e basquete já têm quadra própria; com curva e ginga (que usam o campo do futebol) é a etiqueta que avisa.
const V70_MD_COR = {curva:'#d86a38', volei:'#5a7c94', americano:'#b8473b', basquete:'#d9772e', ginga:'#f5c542'};
const rqPlacar70Antes70p = rqPlacar70;
rqPlacar70 = function(g){
  rqPlacar70Antes70p(g);
  const md = RQ.jogo, cor = V70_MD_COR[md], M = MD_MAP.get(md); if (!cor || !M) return;
  const s0 = x49ModeName() + (X49.matchMode === 'ranked' ? ' · ' + rqElo(CONTA.rq.pts).nome : '');
  const w0 = medeTxt(s0, '22px ' + FONT), w = medeTxt(M.nome, '17px ' + FONT) + 22, x = W/2 + 330 + w0/2 + 12, y = 25, claro = md === 'ginga';
  rr(g, x, y, w, 27, 13.5); g.fillStyle = cor; g.fill(); g.lineWidth = 2.5; g.strokeStyle = 'rgba(5,10,25,.9)'; g.stroke();
  txt(g, M.nome, x + w/2, y + 14.5, 17, claro ? '#2a1d00' : '#ffffff', claro ? null : 'rgba(5,10,25,.85)', 4);
};
// na sala: o seu cartão diz VOCÊ (além da borda amarela); os cartões respondem ao teclado
const slCartaoAntes70p = slCartao;
slCartao = function(m, r){
  const d = slCartaoAntes70p(m, r);
  if (m.id === NET49.id){
    const sm = d.querySelector('.sl-tx small');
    if (sm && !sm.querySelector('.sl-voce')){ const v = nodo('b', 'sl-voce', 'VOCÊ'); sm.prepend(v, ' · '); }
  }
  d.setAttribute('role', 'button'); d.tabIndex = 0;
  return d;
};
function v70SalaTeclado(){
  const el = SL.el; if (!el || el.dataset.v70Teclado) return; el.dataset.v70Teclado = '1';
  // (no teclado, o time recebe gente pelas vagas, que já são botões, e pelo menu do cartão: TIME VERMELHO, EQUIPE AZUL, ESPECTADOR)
  for (const o of el.querySelectorAll('.sl-op')) o.setAttribute('role', 'group');
  el.addEventListener('keydown', e => {                // Enter ou Espaço num cartão = o toque nele
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const t = e.target; if (!(t instanceof Element) || !t.matches('.sl-card')) return;
    e.preventDefault(); t.click();
  });
}
const slRenderAntes70p = slRender;
slRender = function(){
  const v = slRenderAntes70p.apply(this, arguments);
  v70SalaTeclado();
  if (SL.el) for (const o of SL.el.querySelectorAll('.sl-op')){ const c = o.querySelector('small'), b = o.querySelector('b'); if (c && b) o.setAttribute('aria-label', c.textContent + ': ' + b.textContent); }
  return v;
};

/* ---------------------------------------------------------------- 2) as camadas: foco, Tab, fundo e Escape */
// Da de cima para a de baixo (a ordem do z-index): o painel do chat › o COMO JOGA › os Ajustes › a primeira vez › as
// janelas › JOGAR › as janelas dentro das telas (clube) › os menus do editor › a tela do lobby › as do jogo (sala, pausa, fim).
// modal: prende o foco e deixa o resto inerte · leve: só o Escape (o resto da tela continua valendo)
const V70C_LISTA = [
  {q:'#cp', fecha:() => cbFecha(), modal:true},
  {q:'.tu-intro', fecha:() => tuIntroFecha(), modal:true},   // (z 40: por cima do lobby também)
  {q:'#pop-ajustes', fecha:() => { som.clique(); ajxFecha(); }, modal:true, propria:true},
  {q:'#onb', fecha:null, modal:true, foco:'#onb-prox, #onb-bora'},   // (o foco vai no PRÓXIMO: o Enter segue sem pular a apresentação)
  {q:'#lb-pop', fecha:() => { som.clique(); fechaPop(); }, modal:true},
  {q:'#lb-rq', fecha:() => { som.clique(); fechaRanqueada(); }, modal:true},
  {q:'.clb-modal', fecha:() => { som.clique(); CLB.modal = null; clbRender(); }, modal:true},
  {q:'.tpe-pop', fecha:() => tpeCorFecha(), leve:true},
  {q:'.tpe-menu', fecha:() => tpeMenuFecha(), leve:true},
  {tela:true, fecha:() => fechaTela(), leve:true},
  {q:'#sala-jogo', fecha:() => salaJogoFecha(), modal:true},
  {q:'#pausa', fecha:() => pausaFecha(), modal:true},
  {q:'#hp', fecha:() => fecharEdicao(false), leve:true},
  {q:'#fim', fecha:() => abrirLobby(), modal:true},
  {q:'#trfim', fecha:() => abrirLobby(), modal:true}
];
const V70F = {pilha:[], inertes:[], sync:false, hist:[], tela:null, telaVolta:null};
function v70Visivel(el){ return !!el && el.isConnected && !el.hidden && !el.closest('[hidden]'); }
// quem tinha o foco antes (o histórico curto) e o "mesmo botão" depois que a tela se redesenha (o clube refaz a lista)
document.addEventListener('focusin', e => { const t = e.target; if (t instanceof Element){ V70F.hist.push(t); if (V70F.hist.length > 8) V70F.hist.shift(); } }, true);
function v70FocoAntes(dentro){
  const a = document.activeElement;
  if (a && a !== document.body && !(dentro && dentro.contains(a))) return a;
  for (let i = V70F.hist.length - 1; i >= 0; i--){ const h = V70F.hist[i]; if (h !== document.body && !(dentro && dentro.contains(h))) return h; }   // (redesenhado: o v70Volta acha o equivalente)
  return null;
}
const v70TxtDe = el => (el.getAttribute('aria-label') || el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60);
function v70Desc(el){ return el ? {el, tag:el.tagName, cls:typeof el.className === 'string' ? el.className : '', tx:v70TxtDe(el), id:el.id || ''} : null; }
function v70Volta(d){                                   // o elemento de volta (ou o equivalente, se ele foi redesenhado)
  if (!d) return null;
  const ok = e => e && e.isConnected && v70Visivel(e) && !e.closest('[inert]');
  if (ok(d.el)) return d.el;
  if (d.id){ const e = document.getElementById(d.id); if (ok(e)) return e; }
  const c0 = d.cls.split(' ')[0]; if (!c0) return null;
  for (const e of document.getElementsByClassName(c0)) if (e.tagName === d.tag && e.className === d.cls && v70TxtDe(e) === d.tx && ok(e)) return e;
  return null;
}
function v70Devolve(d, dono){                           // devolve o foco se ele se perdeu (na página, num escondido ou na janela que fechou)
  const a = document.activeElement, perdido = !a || a === document.body || !v70Visivel(a) || (dono && dono.contains(a)) || a.closest('[inert]');
  if (!perdido) return;
  const v = v70Volta(d); if (v) try { v.focus({preventScroll:true}); } catch (_) {}
}
function v70Achar(d){
  if (d.tela) return lobby.aberto && lobby.tela && TELAS[lobby.tela] ? TELAS[lobby.tela].el : null;
  const l = document.querySelectorAll(d.q);
  for (const el of l) if (v70Visivel(el)) return el;
  return null;
}
function v70Topo(){ for (const d of V70C_LISTA){ const el = v70Achar(d); if (el) return {d, el}; } return null; }
function v70Focaveis(el){
  return Array.from(el.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"]), [contenteditable="true"]'))
    .filter(n => !n.disabled && n.tabIndex >= 0 && !n.closest('[hidden]') && !n.closest('[inert]') && n.getClientRects().length);
}
function v70Inerte(){                                   // só a janela de cima responde: o resto (subindo a árvore) fica inerte
  const quer = new Set(), topo = v70Topo();
  if (topo && topo.d.modal){
    let n = topo.el;
    while (n && n.parentElement && n !== document.body){
      for (const s of n.parentElement.children){
        if (s === n || /^(SCRIPT|STYLE|LINK|META|TEMPLATE)$/.test(s.tagName)) continue;
        if (s.inert && V70F.inertes.indexOf(s) < 0) continue;   // (inerte por outro motivo: não é nosso)
        if (s.matches('[role=status], [role=alert], [aria-live]')) continue;   // os avisos continuam sendo lidos
        quer.add(s);
      }
      n = n.parentElement;
    }
  }
  for (const el of V70F.inertes) if (!quer.has(el)) el.inert = false;   // (só mexe no que mudou: nada de recalcular a página à toa)
  for (const el of quer) if (!el.inert) el.inert = true;
  V70F.inertes = Array.from(quer);
}
function v70FocaDentro(el, d){                          // o foco entra (no primeiro botão; campo de texto só se a janela já focou nele)
  if (!v70Visivel(el) || el.contains(document.activeElement)) return;
  if (d.propria) return;                               // (os Ajustes já cuidam do foco deles)
  const pref = d.foco ? Array.from(el.querySelectorAll(d.foco)).find(n => v70Visivel(n) && !n.disabled) : null;
  const f = pref || v70Focaveis(el).find(n => !n.matches('input:not([type=button]):not([type=checkbox]):not([type=radio]):not([type=range]), textarea, [contenteditable="true"]'));
  try {
    if (f) f.focus({preventScroll:true});
    else { if (!el.hasAttribute('tabindex')) el.tabIndex = -1; el.focus({preventScroll:true}); }
  } catch (_) {}
}
function v70Sincroniza(){
  V70F.sync = false;
  const vis = [];
  for (const d of V70C_LISTA){ if (!d.modal) continue; const el = v70Achar(d); if (el) vis.push({d, el}); }
  const fechou = [], abriu = [];
  for (let i = V70F.pilha.length - 1; i >= 0; i--){
    const p = V70F.pilha[i], v = vis.find(x => x.d === p.d);
    if (!v){ V70F.pilha.splice(i, 1); fechou.push(p); }
    else p.el = v.el;                                    // a mesma janela redesenhada (o clube refaz a caixa): continua aberta
  }
  for (const v of vis) if (!V70F.pilha.some(p => p.d === v.d)){
    const p = {d:v.d, el:v.el, volta:v70Desc(v70FocoAntes(v.el))}; V70F.pilha.push(p); abriu.push(p);
    if (v.el.getAttribute('role') !== 'dialog') v.el.setAttribute('role', 'dialog');
    v.el.setAttribute('aria-modal', 'true');
    if (!v.el.hasAttribute('aria-label') && !v.el.hasAttribute('aria-labelledby')){ const h = v.el.querySelector('h2, h3'); if (h && h.textContent.trim()) v.el.setAttribute('aria-label', h.textContent.trim()); }
  }
  // as telas do lobby: quem abriu a tela recebe o foco de volta quando ela fecha (VOLTAR, Esc ou aba)
  const tela = lobby.aberto && lobby.tela ? lobby.tela : null;
  if (tela !== V70F.tela){
    if (!V70F.tela && tela) V70F.telaVolta = v70Desc(v70FocoAntes(TELAS[tela] && TELAS[tela].el));
    V70F.tela = tela;
  }
  v70Inerte();
  if (!abriu.length) for (const p of fechou) v70Devolve(p.volta, p.el);   // fechou: o foco volta para quem abriu
  if (!abriu.length && !fechou.length && !tela && lobby.aberto && V70F.telaVolta){ const d = V70F.telaVolta; V70F.telaVolta = null; v70Devolve(d, null); }
  for (const p of abriu) setTimeout(() => v70FocaDentro(p.el, p.d), 0);   // (depois do foco que a própria janela escolher)
}
function v70PedeSync(){ if (V70F.sync) return; V70F.sync = true; queueMicrotask(v70Sincroniza); }
new MutationObserver(v70PedeSync).observe(document.body, {subtree:true, childList:true, attributes:true, attributeFilter:['hidden']});
window.addEventListener('keydown', e => {               // (captura: antes dos Escapes antigos de cada tela)
  if (e.key !== 'Escape' && e.key !== 'Tab') return;
  if (e.defaultPrevented) return;                      // (o chat já tratou)
  if (typeof TECLA !== 'undefined' && TECLA.captura) return;   // trocando a tecla nos Ajustes: o Esc cancela a troca
  const c = v70Topo(); if (!c) return;
  if (e.key === 'Tab'){
    if (!c.d.modal) return;
    const f = v70Focaveis(c.el); if (!f.length){ e.preventDefault(); return; }
    const a = f[0], z = f[f.length - 1], at = document.activeElement;
    if (!c.el.contains(at)){ e.preventDefault(); (e.shiftKey ? z : a).focus(); }
    else if (e.shiftKey && at === a){ e.preventDefault(); z.focus(); }
    else if (!e.shiftKey && at === z){ e.preventDefault(); a.focus(); }
    return;
  }
  const alvo = e.target;
  if (c.d.tela && alvo instanceof Element && alvo.closest('input, textarea, select, [contenteditable="true"]')) return;   // o campo de texto da tela cancela a edição dele
  e.preventDefault(); e.stopImmediatePropagation();
  if (c.d.fecha) c.d.fecha();                          // (a primeira vez não fecha no Esc: falta o nome e a tampinha)
}, true);

/* ---------------------------------------------------------------- 3) abas, escolhas e nomes */
function v70Abas(){
  for (const nav of document.querySelectorAll('.tl-abas')){
    for (const b of nav.children){
      const id = b.dataset.tela, on = id === lobby.tela, T = TELAS[id];
      b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1;
      if (T && T.el && T.el.id) b.setAttribute('aria-controls', T.el.id);
    }
    if (!nav.dataset.v70Setas){
      nav.dataset.v70Setas = '1';
      nav.addEventListener('keydown', e => {           // as setas andam entre as abas (Home/End vão às pontas)
        const l = Array.from(nav.children), i = l.findIndex(b => b.dataset.tela === lobby.tela);
        const j = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? l.length - 1 : null;
        if (j == null) return;
        e.preventDefault();
        const alvo = l[(j + l.length) % l.length].dataset.tela; if (alvo === lobby.tela) return;
        abreTela(alvo);
        const T = TELAS[alvo]; const nb = T && T.el && T.el.querySelector('.tl-abas [data-tela="' + alvo + '"]');
        if (nb) try { nb.focus({preventScroll:true}); } catch (_) {}
      });
    }
  }
}
const marcaAbasAntes70p = marcaAbas;
marcaAbas = function(){ marcaAbasAntes70p(); v70Abas(); };
function v70Estados(){                                  // as escolhas dizem o estado (não só a cor)
  for (const b of document.querySelectorAll('.tl-seg > button')) b.setAttribute('aria-pressed', String(b.classList.contains('on')));
  for (const c of document.querySelectorAll('#lb .tr-card')){ if (c.classList.contains('on')) c.setAttribute('aria-current', 'true'); else c.removeAttribute('aria-current'); }
  for (const t of document.querySelectorAll('#pop-ajustes .aj-chave')){   // chave sem nome: o nome é o texto da linha
    if (t.hasAttribute('aria-label') || t.hasAttribute('aria-labelledby')) continue;
    const l = t.closest('.aj-lin'), s = l && (l.querySelector('.ajx-tx b') || l.querySelector('span'));
    if (s){ if (!s.id) s.id = 'v70-rot-' + (t.id || Math.random().toString(36).slice(2)); t.setAttribute('aria-labelledby', s.id); }
  }
}
const v70ComEstados = f => function(){ const v = f.apply(this, arguments); try { v70Estados(); } catch (_) {} return v; };
renderReplays = v70ComEstados(renderReplays); renderTreino = v70ComEstados(renderTreino); syncAjustes = v70ComEstados(syncAjustes);
// os Ajustes com palavras simples (o que cada coisa faz, sem sigla solta)
const V70_TERMOS = {
  'aj-mus':['Música no lobby', 'A trilha que toca nos menus'],
  'aj-graf':['Qualidade dos gráficos', 'Ultra leve e Suave rodam melhor em celular fraco; Ultra e Max ficam mais bonitos'],
  'aj-fps':['Quadros por segundo (FPS)', 'Mais quadros = mais macio, mas gasta mais bateria. Na dúvida, 60'],
  'aj-verfps':['Mostrar o contador de quadros (FPS)', 'Um número no canto da tela'],
  'aj-efx':['Efeitos na quadra', 'O respingo de tinta, o rastro da bola e o brilho do chute'],
  'aj-torc':['Mostrar a torcida', 'A galera em volta da quadra'],
  'aj-replay':['Replay do gol', 'O lance de novo depois de cada gol'],
  'aj-vibra':['Vibração no chute', 'O celular treme de leve no chute (se ele vibrar)'],
  'aj-anim':['Reduzir animações', 'Menos movimento nos menus e na partida: sem confete e com o cenário parado. Começa igual ao do aparelho'],
  'aj-chat':['Chat do Brasil', 'Ver e mandar mensagens no chat aberto a todos']
};
function v70Termos(){
  for (const id in V70_TERMOS){
    const c = document.getElementById(id), l = c && c.closest('.aj-lin'); if (!l || l.dataset.v70Termo) continue;
    const s = l.querySelector(':scope > span'); if (!s) continue;
    l.dataset.v70Termo = '1';
    const [tit, sub] = V70_TERMOS[id], tx = nodo('span', 'ajx-tx'), b = nodo('b', null, tit); b.id = 'v70-rot-' + id;
    tx.append(b, nodo('small', null, sub)); s.replaceWith(tx);
    if (c.matches('button.aj-chave')) c.setAttribute('aria-labelledby', b.id);
    else if (c.matches('.tl-seg')){ c.setAttribute('role', 'group'); c.setAttribute('aria-labelledby', b.id); }
  }
}
v70Termos(); v70Estados();
// o AMIGOS do lobby abre a COMUNIDADE no cartão AMIGOS (o mesmo nome do botão)
function v70CmFoca(k){
  setTimeout(() => {
    const c = CM.corpo && CM.corpo.querySelector('.cm-' + k); if (!c) return;
    try { c.scrollIntoView({block:'nearest', behavior:'auto'}); } catch (_) {}
    c.classList.add('v70-destaque'); setTimeout(() => c.classList.remove('v70-destaque'), 1800);
    const b = c.querySelector('button'); if (b) try { b.focus({preventScroll:true}); } catch (_) {}
  }, 30);
}
window.v70CmFoca = v70CmFoca;

/* ---------------------------------------------------------------- 4) Reduzir animações (o sistema manda até a pessoa escolher) */
const V70MOV = {mq:null};
try { V70MOV.mq = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : null; } catch (_) {}
try { const o = JSON.parse(localStorage.getItem(CHAVE_CONTA) || 'null'); if (o && o.menosAnimEscolha === true) CONTA.menosAnimEscolha = true; } catch (_) {}
function v70Calmo(){ return !!CONTA.menosAnim; }
function v70AplicaCalmo(){
  document.documentElement.classList.toggle('v70-calmo', v70Calmo());
  if (typeof lbCalmo === 'function' && LB && LB.raiz) lbCalmo();
  const b = document.getElementById('aj-anim'); if (b) b.setAttribute('aria-pressed', String(v70Calmo()));
}
function v70SegueSistema(){
  if (CONTA.menosAnimEscolha || !V70MOV.mq) return;
  CONTA.menosAnim = !!V70MOV.mq.matches;               // (não grava: é o padrão do aparelho, não uma escolha)
  v70AplicaCalmo();
}
v70SegueSistema(); v70AplicaCalmo();
if (V70MOV.mq){ const f = () => v70SegueSistema(); if (V70MOV.mq.addEventListener) V70MOV.mq.addEventListener('change', f); else if (V70MOV.mq.addListener) V70MOV.mq.addListener(f); }
{ const b = document.getElementById('aj-anim');          // tocou na chave: a escolha passa a valer (e fica salva)
  if (b) b.addEventListener('click', () => { CONTA.menosAnimEscolha = true; contaSalvar(); setTimeout(v70AplicaCalmo, 0); }); }
// na partida: sem confete, a faixa do GOL já assentada (sem o carimbo que cai e gira) e o cenário parado (torcida, pipas, ondas)
const spawnConfettiAntes70p = spawnConfetti;
spawnConfetti = function(){ if (v70Calmo()) return; return spawnConfettiAntes70p.apply(this, arguments); };
const drawBannerAntes70p = drawBanner;
drawBanner = function(){
  if (!v70Calmo() || !(goalT >= 0 && goalT < .22)) return drawBannerAntes70p();
  const g0 = goalT; goalT = .22;
  try { return drawBannerAntes70p(); } finally { goalT = g0; }
};
const drawAmbienteAntes70p = drawAmbiente;
drawAmbiente = function(dt){ return drawAmbienteAntes70p(v70Calmo() ? 0 : dt); };
{ const pulso = som.pulso; som.pulso = function(){ return v70Calmo() ? 0 : pulso.apply(this, arguments); }; }
