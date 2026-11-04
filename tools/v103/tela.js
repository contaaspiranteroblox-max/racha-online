/* ======================================================================================================================
   RACHA v103 · TELA CHEIA NO NAVEGADOR (ANDROID E IPHONE), O APP INSTALÁVEL E O CAMPO ATÉ A BEIRADA
   O pedido (03/11/2026): "Faça o RACHA funcionar em tela cheia no navegador, tanto no Android quanto no iPhone. Remova
   margens e barras quando permitido, adicione suporte a PWA e um botão de tela cheia. Adapte automaticamente a interface à
   resolução do dispositivo, sem cortar botões, alterar o HUD ou prejudicar a jogabilidade. Mantenha compatibilidade com
   Chrome e Safari."
   · o botão TELA CHEIA (os quatro cantinhos): o quadrado da barra de cima do lobby (antes do MENU), o cantinho da PAUSA e a
     linha Tela cheia em AJUSTES › Visual (a chave também sai da tela cheia); em pé no Android, a tela GIRE O CELULAR ganha o
     JOGAR EM TELA CHEIA (um toque: tela cheia e a tela travada deitada). Os botões somem quando o jogo já está em tela cheia
     ou foi aberto pelo ícone (o app instalado). Nada entra em tela cheia sozinho: só quando a pessoa toca.
     - Android (Chrome), iPad e computador: a tela cheia do navegador (a Fullscreen API, com o prefixo webkit do Safari) e,
       no celular, a tela travada deitada (screen.orientation.lock — se o aparelho não deixar, segue sem travar);
     - iPhone: o Safari do iPhone não deixa uma página entrar em tela cheia — o botão abre o GUIA curto (Compartilhar ›
       Adicionar à Tela de Início): aberto pelo ícone, o RACHA fica sem as barras do Safari;
   · o app instalável (PWA): o manifest.webmanifest (tela cheia, deitado, os ícones feitos com o grafite do jogo por
     tools/v103/icones.py), as etiquetas do iPhone e o sw.js (sempre a rede primeiro: a cópia só serve sem internet — o
     online depende do jogo e do servidor na mesma versão). O registro só acontece por https (ou no localhost), nunca em
     file://, e RACHA_CONFIG.sw = false desliga (e tira o que já estava registrado);
   · o campo até a beirada: o jogo e o HUD continuam dentro da área segura (o entalhe e a barrinha do iPhone ficam de fora,
     como sempre: o :root com as env(safe-area-inset-*) e o lobby com o PALCO.sa), mas as faixas em volta deixam de ser
     pretas — a MOLDURA (um canvas atrás de tudo) desenha ali o mesmo campo, mais escuro, na mesma câmera. Só o cenário (o
     chão, as linhas, as traves): os jogadores e a bola continuam só na área do jogo, e o escuro deixa claro onde ela acaba.
     No Ultra leve (ou se algo der errado), as faixas ficam na cor do fundo do mapa;
   · a interface se ajeita sozinha ao entrar e sair da tela cheia, ao girar e ao mudar o tamanho (o lobby, o canvas e o HUD
     já se medem pela área segura: aqui só garante o aviso de mudança, com duas conferências depois).
   Nada aqui mexe na física, nos controles, no tamanho ou no lugar do HUD, na rede ou na conta.
   ====================================================================================================================== */
const V103T = {bt:null, pa:null, aj:null, guia:null, modo:null, sw:'', swErro:'', rzT:[], volta:null, pedidos:0, saidas:0, travas:0};
const V103M = {cv:null, g:null, vis:false, sujo:true, r:null, cw:0, ch:0, k:'', geo:'', grads:[], stat:null, cor:null, erros:0, desligada:false, n:0, chave:'', tu:null, pintadas:0};   // (a moldura: o item 5)
const V103_CANTOS = 'M16 38V16h22M62 16h22v22M84 62v22H62M38 84H16V62';
const V103_TELA_SVG = '<svg class="v91-ic" viewBox="0 0 100 100" aria-hidden="true" focusable="false"><g fill="none" stroke-linecap="round" stroke-linejoin="round">'
  + '<path d="' + V103_CANTOS + '" stroke="#0d0a24" stroke-width="22"/><path d="' + V103_CANTOS + '" stroke="#f6f3ea" stroke-width="10"/></g></svg>';
const V103_TELA_SVG2 = '<svg viewBox="0 0 100 100" aria-hidden="true" focusable="false"><path d="' + V103_CANTOS + '" fill="none" stroke="currentColor" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const V103_FECHA_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/></svg>';
// (o Compartilhar do Safari: o quadrado aberto com a seta para cima; e o Adicionar à Tela de Início: o quadrado com o +)
const V103_COMPARTILHA_SVG = '<svg viewBox="0 0 48 48" aria-hidden="true" focusable="false"><g fill="none" stroke="#7fb2ff" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round">'
  + '<path d="M17 18h-5a3 3 0 0 0-3 3v19a3 3 0 0 0 3 3h24a3 3 0 0 0 3-3V21a3 3 0 0 0-3-3h-5"/><path d="M24 30V5M16.5 12.5L24 5l7.5 7.5"/></g></svg>';
const V103_ADICIONA_SVG = '<svg viewBox="0 0 48 48" aria-hidden="true" focusable="false"><rect x="7" y="7" width="34" height="34" rx="8" fill="none" stroke="#f6f3ea" stroke-width="3.6"/>'
  + '<path d="M24 15v18M15 24h18" stroke="#f6f3ea" stroke-width="3.6" stroke-linecap="round"/></svg>';

/* ---------------------------------------------------------------- 1) o que este navegador deixa */
function v103EmTela(){ return !!(document.fullscreenElement || document.webkitFullscreenElement); }
function v103ApiTela(){                                  // a tela cheia de página (Android, iPad, computador)? O iPhone diz que não
  const el = document.documentElement;
  const tem = typeof el.requestFullscreen === 'function' || typeof el.webkitRequestFullscreen === 'function';
  return tem && (document.fullscreenEnabled === true || document.webkitFullscreenEnabled === true);
}
function v103App(){                                      // aberto pelo ícone (o app instalado) ou o navegador já em tela cheia
  try { if (navigator.standalone === true) return true; } catch (_) {}
  try { return matchMedia('(display-mode: fullscreen)').matches || matchMedia('(display-mode: standalone)').matches; } catch (_) { return false; }
}
function v103iOS(){ const ua = navigator.userAgent || ''; return /iP(hone|od|ad)/.test(ua) || (/Macintosh/.test(ua) && (navigator.maxTouchPoints || 0) > 1); }
function v103iPad(){ const ua = navigator.userAgent || ''; return /iPad/.test(ua) || (/Macintosh/.test(ua) && (navigator.maxTouchPoints || 0) > 1); }
function v103NaMoldura(){ try { return window.top !== window.self; } catch (_) { return true; } }   // (o jogo dentro de outra página)
// 'tela' (já em tela cheia) · 'app' (aberto pelo ícone) · 'api' (o botão entra em tela cheia) · 'guia' (o iPhone: o guia) · null
function v103Modo(){
  if (v103EmTela()) return 'tela';
  if (v103App()) return 'app';
  if (v103ApiTela()) return 'api';
  if (v103iOS() && !v103NaMoldura()) return 'guia';
  return null;
}

/* ---------------------------------------------------------------- 2) entrar e sair (só com o toque da pessoa) */
function v103Avisa(t){                                   // (uma vez só: a promessa recusada e o aviso com prefixo podem chegar juntos)
  const ag = Date.now(); if (ag - (V103T.avisoT || 0) < 1500) return; V103T.avisoT = ag;
  try { v88Nota(t); } catch (_) { try { x49Toast(t); } catch (_) {} }
}
function v103Trava(){                                    // o celular deitado (só em tela cheia; quem não deixa, segue sem travar)
  if (!v103EmTela()) return;
  try {
    const o = screen.orientation;
    if (o && typeof o.lock === 'function'){ V103T.travas++; const p = o.lock('landscape'); if (p && typeof p.catch === 'function') p.catch(() => {}); }
  } catch (_) {}
}
function v103Entra(){
  const el = document.documentElement;
  V103T.pedidos++;
  let p;
  try {
    if (typeof el.requestFullscreen === 'function') p = el.requestFullscreen({navigationUI:'hide'});
    else if (typeof el.webkitRequestFullscreen === 'function') p = el.webkitRequestFullscreen();   // (o Safari antigo e o iPad: sem promessa — o aviso de mudança confirma)
  } catch (e) { p = Promise.reject(e); }
  return Promise.resolve(p).then(() => { v103Sync(); v103Relayout(); return true; }, () => {   // (a tela travada deitada vem no aviso de mudança: v103MudouTela)
    v103Sync();
    if (!v103EmTela()) v103Avisa('O navegador não deixou entrar em tela cheia agora. Tente de novo no botão.');
    return false;
  });
}
function v103Sai(){
  V103T.saidas++;
  try { const o = screen.orientation; if (o && typeof o.unlock === 'function') o.unlock(); } catch (_) {}
  let p = null;
  try {
    if (document.fullscreenElement && typeof document.exitFullscreen === 'function') p = document.exitFullscreen();
    else if (document.webkitFullscreenElement && typeof document.webkitExitFullscreen === 'function') p = document.webkitExitFullscreen();
  } catch (_) {}
  return Promise.resolve(p).catch(() => {}).then(() => { v103Sync(); v103Relayout(); return true; });
}
function v103Toca(quem){                                 // o toque no botão (o do lobby, o da pausa ou a chave dos Ajustes)
  try { som.clique(); } catch (_) {}
  const m = v103Modo();
  if (m === 'tela') return v103Sai();
  if (m === 'api') return v103Entra();                  // (na mesma hora do toque: o navegador só deixa assim)
  if (m === 'guia'){ v103GuiaAbre(quem); return Promise.resolve(true); }
  return Promise.resolve(false);
}
// entrou ou saiu da tela cheia, girou, mudou de tamanho: o lobby, o canvas, o HUD e as telas se medem de novo (o jogo já
// ouve o resize; aqui o aviso vai também um pouco depois, quando o celular termina de mudar a tela)
function v103Relayout(){
  for (const t of V103T.rzT) clearTimeout(t);
  const vai = () => { V103M.sujo = true; try { window.dispatchEvent(new Event('resize')); } catch (_) {} };
  V103T.rzT = [setTimeout(vai, 0), setTimeout(vai, 180), setTimeout(vai, 520)];
}
function v103MudouTela(){
  if (v103EmTela()) v103Trava(); else { try { const o = screen.orientation; if (o && typeof o.unlock === 'function') o.unlock(); } catch (_) {} }
  v103Sync(); v103Relayout();
}
function v103ErroTela(){                                 // (o Safari com prefixo não tem promessa: o recusado chega por este aviso)
  v103Sync();
  if (!v103EmTela()) v103Avisa('O navegador não deixou entrar em tela cheia agora. Tente de novo no botão.');
}

/* ---------------------------------------------------------------- 3) os botões: o do lobby, o da pausa e a linha dos Ajustes */
function v103LobbyMonta(){                               // (depois da v102: o quadrado entra antes do MENU, que fica na ponta)
  if (V103T.bt || typeof LB === 'undefined' || !LB.palco) return;
  const dir = LB.palco.querySelector('.lb-topo .tp-dir'); if (!dir) return;
  const b = novoBotao('tp-ic v91-quad v103-tela-bt', 'Tela cheia');
  const ic = nodo('i', 'v91-ico v91-tp-ic'); ic.innerHTML = V103_TELA_SVG; b.appendChild(ic);
  b.title = 'Tela cheia';
  b.addEventListener('click', e => { e.stopPropagation(); v103Toca(b); });
  const menu = typeof V102L !== 'undefined' && V102L.menu && V102L.menu.parentNode === dir ? V102L.menu : null;
  dir.insertBefore(b, menu);
  V103T.bt = b;
  v103Sync();
}
function v103PausaMonta(){                               // o cantinho da PAUSA (fora da grade dos botões: a pausa continua igual)
  if (V103T.pa) return;
  const cx = document.querySelector('#pausa .pa-caixa'); if (!cx) return;
  const b = novoBotao('v103-pa-tela', 'Tela cheia'); b.id = 'pa-tela'; b.title = 'Tela cheia';
  b.innerHTML = V103_TELA_SVG2;
  b.addEventListener('click', e => { e.stopPropagation(); v103Toca(b); });
  cx.appendChild(b);
  V103T.pa = b;
}
// na tela GIRE O CELULAR (em pé, no Android): um toque e o jogo entra em tela cheia já deitado (a tela travada deitada gira
// sozinha). A tela de girar continua como era: o foco fica nela (este botão não entra no Tab) e nenhum outro toque passa
function v103GireMonta(){
  if (V103T.gire) return;
  const el = document.getElementById('v70-gire'); if (!el) return;
  const b = novoBotao('v103-gire-bt'); b.id = 'v70-gire-tela'; b.tabIndex = -1; b.hidden = true;
  b.innerHTML = V103_TELA_SVG2 + '<span>JOGAR EM TELA CHEIA</span>';
  for (const ev of ['pointerdown', 'pointerup', 'touchstart', 'touchend', 'mousedown', 'mouseup']) b.addEventListener(ev, e => e.stopPropagation());   // (a tela de girar segura os toques: este responde antes)
  b.addEventListener('click', e => { e.stopPropagation(); v103Toca(b); });
  const st = el.querySelector('.v70-gire-st');
  if (st) el.insertBefore(b, st); else el.appendChild(b);
  V103T.gire = b;
}
function v103GireQuer(m){                                // (só onde o toque resolve: a tela cheia de página e a tela travada deitada, num aparelho de toque)
  if (m !== 'api') return false;
  try { if (!matchMedia('(pointer: coarse)').matches) return false; } catch (_) { return false; }
  try { return !!screen.orientation && typeof screen.orientation.lock === 'function'; } catch (_) { return false; }
}
function v103AjMonta(){                                  // AJUSTES › Visual: a linha Tela cheia (a chave entra e sai; no iPhone, COMO FAZER)
  if (V103T.aj || typeof AJX === 'undefined' || !AJX.secs || !AJX.secs.visual || typeof ajxChave !== 'function') return;
  const lin = ajxChave('aj-tela', 'Tela cheia', '');
  lin.classList.add('v103-aj-tela');
  const chave = lin.querySelector('.aj-chave'), tx = lin.querySelector('.ajx-tx');
  let nota = tx.querySelector('small'); if (!nota){ nota = nodo('small'); tx.appendChild(nota); }
  chave.addEventListener('click', () => { if (!chave.disabled) v103Toca(chave); });
  const como = novoBotao('lb-btn v103-aj-como'); como.id = 'aj-tela-como'; como.textContent = 'COMO FAZER'; como.hidden = true;
  como.addEventListener('click', () => v103Toca(como));
  lin.appendChild(como);
  const dir = document.getElementById('aj-dir'), ref = dir && dir.closest('.aj-lin');
  if (ref && ref.parentNode === AJX.secs.visual) ref.after(lin); else AJX.secs.visual.appendChild(lin);
  V103T.aj = {lin, chave, como, tit:tx.querySelector('b'), nota};
}
const V103_AJ_TXT = {
  api:['Tela cheia', 'Esconde as barras do navegador e deixa o celular deitado'],
  tela:['Tela cheia', 'Ligada. Toque para sair (ou use o voltar do celular; no computador, o Esc)'],
  guia:['Tela cheia no iPhone', 'Ponha o RACHA na Tela de Início: pelo ícone, ele abre sem as barras do Safari'],
  app:['Tela cheia', 'Já está em tela cheia: aberto pelo ícone (o app) ou com o navegador em tela cheia']
};
function v103AjSync(m){
  const A = V103T.aj; if (!A) return;
  const txt = V103_AJ_TXT[m];
  if (A.lin.hidden !== !txt) A.lin.hidden = !txt;
  if (!txt) return;
  const tit = m === 'guia' && v103iPad() ? 'Tela cheia no iPad' : txt[0];
  if (A.tit.textContent !== tit) A.tit.textContent = tit;
  if (A.nota.textContent !== txt[1]) A.nota.textContent = txt[1];
  const guia = m === 'guia', on = m === 'tela' || m === 'app';
  A.chave.hidden = guia; A.como.hidden = !guia;
  A.chave.setAttribute('aria-pressed', String(on));
  A.chave.disabled = m === 'app';
  A.chave.setAttribute('aria-label', m === 'app' ? 'Tela cheia (o app já abre assim)' : 'Tela cheia');
  A.como.setAttribute('aria-label', 'Como jogar em tela cheia no ' + (v103iPad() ? 'iPad' : 'iPhone'));
}
function v103Sync(){                                     // o estado de agora em todos os botões
  const m = v103Modo(); V103T.modo = m;
  const html = document.documentElement;
  html.classList.toggle('v103-tela', m === 'tela'); html.classList.toggle('v103-app', m === 'app');
  const mostra = m === 'api' || m === 'guia';
  const rot = m === 'guia' ? 'Tela cheia: como jogar sem as barras do Safari' : 'Tela cheia';
  for (const b of [V103T.bt, V103T.pa]){
    if (!b) continue;
    if (b.hidden !== !mostra) b.hidden = !mostra;
    if (b.getAttribute('aria-label') !== rot) b.setAttribute('aria-label', rot);
  }
  if (V103T.pa && V103T.pa.parentElement) V103T.pa.parentElement.classList.toggle('v103-com-tela', mostra);
  if (V103T.gire){ const q = v103GireQuer(m); if (V103T.gire.hidden !== !q) V103T.gire.hidden = !q; }
  v103AjSync(m);
}

/* ---------------------------------------------------------------- 4) o GUIA do iPhone (Compartilhar › Adicionar à Tela de Início) */
function v103GuiaMonta(){
  if (V103T.guia) return V103T.guia;
  const g = nodo('div', 'v103-guia'); g.id = 'v103-guia'; g.hidden = true;
  g.setAttribute('role', 'dialog'); g.setAttribute('aria-modal', 'true'); g.setAttribute('aria-labelledby', 'v103-guia-t'); g.setAttribute('aria-describedby', 'v103-guia-d');
  const onde = v103iPad() ? 'IPAD' : 'IPHONE';
  g.innerHTML = '<div class="v103-guia-caixa">'
    + '<h2 id="v103-guia-t">TELA CHEIA NO ' + onde + '</h2>'
    + '<p class="v103-guia-tx" id="v103-guia-d">O Safari não deixa o jogo esconder as barras. O jeito é pôr o RACHA na <b>Tela de Início</b>: pelo ícone, ele abre como app, sem barra nenhuma.</p>'
    + '<ol class="v103-guia-passos">'
    + '<li><i class="v103-guia-n" aria-hidden="true">1</i><span class="v103-guia-ic">' + V103_COMPARTILHA_SVG + '</span><span><b>Toque em Compartilhar</b><small>o quadrado com a setinha para cima (no iOS 26, ele fica no menu •••)</small></span></li>'
    + '<li><i class="v103-guia-n" aria-hidden="true">2</i><span class="v103-guia-ic">' + V103_ADICIONA_SVG + '</span><span><b>Adicionar à Tela de Início</b><small>se não aparecer, role a lista para baixo</small></span></li>'
    + '<li><i class="v103-guia-n" aria-hidden="true">3</i><span class="v103-guia-ic"><img alt="" src="./icones/racha-192.png" width="52" height="52" decoding="async"></span><span><b>Abra pelo ícone do RACHA</b><small>em tela cheia, sem as barras do Safari</small></span></li>'
    + '</ol>'
    + '<div class="v103-guia-acoes"><button type="button" class="v103-guia-ok">ENTENDI</button></div>'
    + '<button type="button" class="v103-guia-x" aria-label="Fechar">' + V103_FECHA_SVG + '</button>'
    + '</div>';
  g.querySelector('.v103-guia-ok').addEventListener('click', e => { e.stopPropagation(); try { som.clique(); } catch (_) {} v103GuiaFecha(); });
  g.querySelector('.v103-guia-x').addEventListener('click', e => { e.stopPropagation(); try { som.clique(); } catch (_) {} v103GuiaFecha(); });
  g.addEventListener('click', e => { if (e.target === g) v103GuiaFecha(); });   // (tocar fora da caixa também fecha)
  for (const ev of ['pointerdown', 'touchstart', 'mousedown']) g.addEventListener(ev, e => e.stopPropagation());   // (nada passa para o jogo por baixo)
  document.body.appendChild(g);
  V103T.guia = g;
  return g;
}
function v103GuiaAbre(quem){
  const g = v103GuiaMonta();
  V103T.volta = quem || document.activeElement || null;
  g.hidden = false;
  setTimeout(() => { try { if (!g.hidden && !g.contains(document.activeElement)) g.querySelector('.v103-guia-ok').focus({preventScroll:true}); } catch (_) {} }, 0);
}
function v103GuiaFecha(){
  const g = V103T.guia; if (!g || g.hidden) return;
  g.hidden = true;
  const v = V103T.volta; V103T.volta = null;
  setTimeout(() => { try { if (v && v.isConnected && !v.hidden && !v.closest('[hidden]') && !v.closest('[inert]') && (document.activeElement === document.body || !document.activeElement)) v.focus({preventScroll:true}); } catch (_) {} }, 0);
}
try {                                                    // na pilha das janelas do v70: prende o foco, o resto fica inerte e o Esc fecha (abaixo só do GIRE O CELULAR)
  if (typeof V70C_LISTA !== 'undefined') V70C_LISTA.splice(1, 0, {q:'#v103-guia', fecha:() => { try { som.clique(); } catch (_) {} v103GuiaFecha(); }, modal:true, foco:'.v103-guia-ok'});
} catch (_) {}

/* ---------------------------------------------------------------- 5) a MOLDURA: o campo nas faixas em volta da área do jogo */
function v103MolduraMonta(){
  if (V103M.cv || !document.body) return;
  const c = document.createElement('canvas'); c.id = 'v103-moldura'; c.setAttribute('aria-hidden', 'true'); c.hidden = true; c.width = c.height = 1;
  document.body.insertBefore(c, document.body.firstChild);
  V103M.cv = c;
  try { V103M.g = c.getContext('2d', {alpha:false}); } catch (_) { V103M.g = null; }
  if (!V103M.g) V103M.g = c.getContext('2d');
}
function v103MolduraEsconde(){ if (V103M.vis){ V103M.vis = false; V103M.cv.hidden = true; } }
function v103CorFundo(cor){ if (V103M.cor === cor) return; V103M.cor = cor; try { document.body.style.backgroundColor = cor || ''; } catch (_) {} }
function v103Capa(){                                     // uma janela do jogo por cima (pausa, fim, apresentação, COMO JOGA): as faixas mais escuras também
  for (const id of ['pausa', 'fim', 'trfim', 'rq-vs']){ const el = document.getElementById(id); if (el && !el.hidden) return true; }
  if (!V103M.tu || !V103M.tu.isConnected) V103M.tu = document.querySelector('.tu-intro');
  return !!(V103M.tu && !V103M.tu.hidden && !V103M.tu.closest('[hidden]'));
}
function v103MolduraPinta(){
  const M = V103M; if (!M.cv || !M.g) return;
  const ofj = typeof OFJ !== 'undefined' && OFJ.on;     // (a partida da Oficina tem o mundo dela: as faixas ficam lisas)
  v103CorFundo(ofj || (typeof lobby !== 'undefined' && lobby.aberto) ? '' : (CAMPO && CAMPO.fundo) || '');
  let quer = !M.desligada && !ofj && !document.hidden && !!stat && !(typeof lobby !== 'undefined' && lobby.aberto);
  if (quer){ try { if (G().plano) quer = false; } catch (_) {} }   // (Ultra leve: nada a mais para desenhar)
  if (!quer){ v103MolduraEsconde(); return; }
  // onde está a área do jogo (o canvas): de novo quando a tela muda e, por garantia, a cada meio segundo
  const chave = cv.style.width + 'x' + cv.style.height + '|' + innerWidth + 'x' + innerHeight;
  if (M.sujo || !M.r || chave !== M.chave || ++M.n >= 30){
    const r = cv.getBoundingClientRect(), f = M.cv.getBoundingClientRect();
    M.r = {l:r.left - f.left, t:r.top - f.top, w:r.width, h:r.height};
    M.cw = f.width || innerWidth; M.ch = f.height || innerHeight; M.sujo = false; M.chave = chave; M.n = 0;
  }
  const r = M.r, cw = M.cw, ch = M.ch;
  if (r.w < 2 || r.h < 2 || !(r.l > .5 || r.t > .5 || r.l + r.w < cw - .5 || r.t + r.h < ch - .5)){ v103MolduraEsconde(); return; }   // (sem faixa nenhuma)
  let q = .75; try { q = Math.min(1.5, Math.max(.5, G().dpr(window.devicePixelRatio || 1)*.75)); } catch (_) {}   // (as faixas são escuras e de lado: menos pixels que o jogo, na qualidade escolhida)
  const c = M.cv, g = M.g, W2 = Math.max(1, Math.round(cw*q)), H2 = Math.max(1, Math.round(ch*q));
  if (c.width !== W2 || c.height !== H2){ c.width = W2; c.height = H2; M.k = ''; M.geo = ''; }
  const capa = v103Capa(), z = cam.z;
  // (o desenho das faixas custa um quadro a mais de pintura: com a câmera andando, no máximo 10 vezes por segundo — medido: a
  //  cada quadro, ele atrasava o laço do jogo o bastante para mudar em que comando o CHUTE chegava no servidor, no v92_db_online;
  //  a tela, o tamanho, a janela por cima ou o campo mudando: na hora)
  const kEst = [Math.round(z*2000), r.l, r.t, r.w, r.h, W2, H2, CAMPO.fundo, capa ? 1 : 0, nets.length].join('|');
  const k = kEst + '|' + Math.round(cam.x*4) + '|' + Math.round(cam.y*4), agoraM = performance.now();
  if (k !== M.k && kEst === M.kEst && M.stat === stat && agoraM - (M.ultT || 0) < 100) { if (!M.vis){ M.vis = true; c.hidden = false; } return; }
  if (k !== M.k || M.stat !== stat){                    // (a câmera parada: nada a refazer)
    M.k = k; M.kEst = kEst; M.stat = stat; M.ultT = agoraM;
    const qx = W2/cw, qy = H2/ch, sx = r.w/W, sy = r.h/H;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.save();
    g.beginPath(); g.rect(0, 0, W2, H2); g.rect((r.l + 1)*qx, (r.t + 1)*qy, Math.max(0, r.w - 2)*qx, Math.max(0, r.h - 2)*qy); g.clip('evenodd');
    g.fillStyle = CAMPO.fundo || '#121212'; g.fillRect(0, 0, W2, H2);
    // a mesma câmera do render: o ponto (cam.x, cam.y) do mundo no meio da área do jogo, no mesmo zoom
    g.setTransform(qx*sx*z, 0, 0, qy*sy*z, qx*(r.l + sx*(W/2 - cam.x*z)), qy*(r.t + sy*(H/2 - cam.y*z)));
    try { g.imageSmoothingEnabled = true; } catch (_) {}
    g.drawImage(stat, 0, 0, MW, MH);
    for (const n of nets) g.drawImage(n.c, n.x, n.y, n.w, n.h);
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = capa ? 'rgba(5,6,10,.74)' : 'rgba(5,6,10,.4)'; g.fillRect(0, 0, W2, H2);   // (fora da área do jogo: mais escuro)
    // e mais escuro quanto mais longe da área do jogo: perto dela o campo continua; longe (as faixas grandes do tablet), some
    const geo = [r.l, r.t, r.w, r.h, W2, H2].join('|');
    if (M.geo !== geo){                                 // (os degradês só mudam quando a tela muda)
      M.geo = geo; M.grads = [];
      const D = 110, x0 = r.l*qx, y0 = r.t*qy, x1 = (r.l + r.w)*qx, y1 = (r.t + r.h)*qy;
      for (const [ax, ay, bx, by, rx, ry, rw, rh, tem] of [[x0, 0, x0 - D*qx, 0, 0, 0, x0, H2, r.l > .5], [x1, 0, x1 + D*qx, 0, x1, 0, W2 - x1, H2, x1 < W2 - .5],
                                                           [0, y0, 0, y0 - D*qy, 0, 0, W2, y0, r.t > .5], [0, y1, 0, y1 + D*qy, 0, y1, W2, H2 - y1, y1 < H2 - .5]]){
        if (!tem) continue;
        const gr = g.createLinearGradient(ax, ay, bx, by); gr.addColorStop(0, 'rgba(5,6,10,0)'); gr.addColorStop(1, 'rgba(5,6,10,.6)');
        M.grads.push([gr, rx, ry, rw, rh]);
      }
    }
    for (const [gr, rx, ry, rw, rh] of M.grads){ g.fillStyle = gr; g.fillRect(rx, ry, rw, rh); }
    g.restore();
    M.pintadas++;
  }
  if (!M.vis){ M.vis = true; c.hidden = false; }
}

/* ---------------------------------------------------------------- 6) o app instalável: o service worker (só por https ou no localhost) */
function v103RegistraSW(){
  const C = window.RACHA_CONFIG || {};
  if (!('serviceWorker' in navigator)) return (V103T.sw = 'sem-suporte');
  const local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  if (!(location.protocol === 'https:' || (location.protocol === 'http:' && local))) return (V103T.sw = 'inseguro');   // (file://, http de fora: nada)
  if (v103NaMoldura()) return (V103T.sw = 'moldura');
  let url, escopo;
  try { url = new URL('./sw.js', document.baseURI).href; escopo = new URL('./', url).href; } catch (_) { return (V103T.sw = 'sem-endereco'); }
  const depois = (f, ms) => { if (document.readyState === 'complete') setTimeout(f, ms); else window.addEventListener('load', () => setTimeout(f, ms), {once:true}); };
  if (C.sw === false){                                  // a publicação pediu sem: tira o registro que já existia (e a cópia vai junto)
    V103T.swSaiu = null;
    depois(() => {                                      // (depois de a página abrir, como o registro; o navegador põe o pedido na fila dele)
      V103T.swSaiu = 'pedindo';
      navigator.serviceWorker.getRegistrations()
        .then(rs => Promise.all(rs.filter(r => r.scope === escopo).map(r => r.unregister())))
        .then(res => { V103T.swSaiu = res.length; }, () => { V103T.swSaiu = -1; });
      try { if (window.caches) caches.keys().then(ks => ks.filter(k => k.indexOf('racha-jogo-') === 0).forEach(k => caches.delete(k))).catch(() => {}); } catch (_) {}
    }, 0);
    return (V103T.sw = 'desligado');
  }
  depois(() => {                                        // (o jogo abre primeiro; o registro vem um pouco depois)
    navigator.serviceWorker.register(url, {scope:escopo, updateViaCache:'none'})
      .then(r => { V103T.sw = 'registrado'; V103T.reg = r; })   // (o navegador confere o sw.js de novo a cada abertura: updateViaCache 'none')
      .catch(e => { V103T.sw = 'erro'; V103T.swErro = String(e && e.message || e).slice(0, 200); });
  }, 1200);
  return (V103T.sw = 'registrando');
}

/* ---------------------------------------------------------------- 7) os ganchos */
const renderAntes103 = render;
render = function(){
  const r = renderAntes103.apply(this, arguments);
  try { v103MolduraPinta(); } catch (e) { if (++V103M.erros > 3){ V103M.desligada = true; try { v103MolduraEsconde(); } catch (_) {} } }
  return r;
};
const abrirLobbyAntes103 = abrirLobby;
abrirLobby = function(){ try { v103MolduraEsconde(); v103CorFundo(''); } catch (_) {} return abrirLobbyAntes103.apply(this, arguments); };
const lbRenderAntes103 = lbRender;
lbRender = function(){ const r = lbRenderAntes103.apply(this, arguments); try { v103LobbyMonta(); } catch (e) { console.error('v103', e); } return r; };
const pausaAbreAntes103 = pausaAbre;
pausaAbre = function(){ try { v103PausaMonta(); v103Sync(); } catch (_) {} return pausaAbreAntes103.apply(this, arguments); };
if (typeof ajxSync === 'function'){ const ajxSyncAntes103 = ajxSync; ajxSync = function(){ const r = ajxSyncAntes103.apply(this, arguments); try { v103AjMonta(); v103Sync(); } catch (_) {} return r; }; }
document.addEventListener('fullscreenchange', v103MudouTela);
document.addEventListener('webkitfullscreenchange', v103MudouTela);
document.addEventListener('webkitfullscreenerror', v103ErroTela);   // (o com prefixo; o sem prefixo já avisa pela promessa recusada)
for (const q of ['(display-mode: fullscreen)', '(display-mode: standalone)']){
  try { const mq = matchMedia(q), f = () => v103Sync(); if (mq.addEventListener) mq.addEventListener('change', f); else if (mq.addListener) mq.addListener(f); } catch (_) {}
}
window.addEventListener('resize', () => { V103M.sujo = true; try { v103Sync(); } catch (_) {} });
window.addEventListener('orientationchange', () => { V103M.sujo = true; v103Relayout(); });
try { if (screen.orientation && screen.orientation.addEventListener) screen.orientation.addEventListener('change', () => { V103M.sujo = true; }); } catch (_) {}
try { if (window.visualViewport) window.visualViewport.addEventListener('resize', () => { V103M.sujo = true; }); } catch (_) {}
try { v103MolduraMonta(); } catch (e) { console.error('v103 moldura', e); }
try { v103LobbyMonta(); v103PausaMonta(); v103AjMonta(); v103GireMonta(); v103Sync(); } catch (e) { console.error('v103', e); }
try { v103RegistraSW(); } catch (e) { V103T.sw = 'erro'; V103T.swErro = String(e && e.message || e).slice(0, 200); }
window.RachaTela103 = {
  estado:() => ({modo:V103T.modo || v103Modo(), emTela:v103EmTela(), app:v103App(), api:v103ApiTela(), ios:v103iOS(), sw:V103T.sw, swErro:V103T.swErro, swSaiu:V103T.swSaiu,
    botao:!!V103T.bt && !V103T.bt.hidden, pausa:!!V103T.pa && !V103T.pa.hidden, gire:!!V103T.gire && !V103T.gire.hidden, guia:!!V103T.guia && !V103T.guia.hidden,
    moldura:V103M.vis, molduraPintadas:V103M.pintadas, molduraDesligada:V103M.desligada, pedidos:V103T.pedidos, saidas:V103T.saidas, travas:V103T.travas}),
  toca:v103Toca, entra:v103Entra, sai:v103Sai, sync:v103Sync, guia:{abre:v103GuiaAbre, fecha:v103GuiaFecha}
};
