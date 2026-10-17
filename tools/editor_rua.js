/* =====================================================================
   RACHA rua · v69 — O EDITOR DA TAMPINHA (e do escudo do clube) — entra depois do tampa_rua.js
   Na tela SKINS (o botão SKINS do lobby, a tampinha do meio e o TROCAR do perfil):
     abas PADRÃO · BORDA · ÍCONE · PRÉ-PROJETADO · INVENTÁRIO
     cores (com conta-gotas e a paleta), posição, tamanho, ângulo, o estilo e o texto do ícone
     a faixa com cada peça e o preço (moedas ou gemas deste aparelho) e o CONCLUÍDO (compra o que falta e equipa)
   O escudo do clube abre o mesmo editor no modo 'E' (FORMA · PADRÃO · ÍCONE · PRÉ-PROJETADO): o CONCLUÍDO devolve o código.
   ===================================================================== */
const TPE_PALETA = ['#ffffff', '#f3efe4', '#c7ccd2', '#8d8f93', '#5b636c', '#3a3f45', '#171a1c', '#000000',
  '#fff3bf', '#ffd23f', '#f5c542', '#e0a41c', '#ff8a1c', '#ff6a1a', '#e2412f', '#b8212a',
  '#ff9ff0', '#ff5c8a', '#ff2bd6', '#b197fc', '#7a3fc4', '#3d1f6a', '#7f9cff', '#2f5bd6',
  '#1f4fb8', '#0c1030', '#9ad0ff', '#62b6ec', '#14d4f0', '#0b7285', '#a6e36b', '#3cff6a',
  '#3cb44b', '#1f9a4a', '#0d4a2b', '#f0d2b0', '#e8a23a', '#c4592c', '#6b3f22', '#55663a'];
const TPE_SVG = {
  gota:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19.6 4.4a2.6 2.6 0 0 0-3.7 0l-2.4 2.4-1-1-1.6 1.6 1 1-6.7 6.7c-.4.4-.6.9-.6 1.4V19h2.5c.5 0 1-.2 1.4-.6l6.7-6.7 1 1 1.6-1.6-1-1 2.4-2.4a2.6 2.6 0 0 0 0-3.7zM7.9 17.4H6.6v-1.3l6.6-6.6 1.3 1.3z" fill="currentColor"/></svg>',
  mais:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="5" r="2.4" fill="currentColor"/><circle cx="12" cy="12" r="2.4" fill="currentColor"/><circle cx="12" cy="19" r="2.4" fill="currentColor"/></svg>',
  desfaz:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 7H5V3" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M5.4 7A8 8 0 1 1 4 13" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>',
  refaz:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 7h4V3" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M18.6 7A8 8 0 1 0 20 13" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>',
  dado:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="4" fill="currentColor"/><g fill="#1b2557"><circle cx="8" cy="8" r="1.7"/><circle cx="16" cy="8" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="8" cy="16" r="1.7"/><circle cx="16" cy="16" r="1.7"/></g></svg>',
  salva:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h12l4 4v12H4z" fill="currentColor"/><rect x="7" y="4" width="8" height="5" fill="#1b2557"/><rect x="7" y="13" width="10" height="7" rx="1" fill="#1b2557"/></svg>',
  copia:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M16 5V4H4v12h1" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
  cola:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="4" width="14" height="17" rx="2" fill="none" stroke="currentColor" stroke-width="2.4"/><rect x="8.5" y="2.5" width="7" height="4" rx="1" fill="currentColor"/><path d="M9 12h6M9 16h4" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
  volta:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="2.4"/><circle cx="12" cy="12" r="3.4" fill="currentColor"/></svg>',
  certo:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 12.5l5 5 10-11" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  x:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>',
  cadeado:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10.5" width="14" height="10" rx="2.5" fill="currentColor"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" fill="none" stroke="currentColor" stroke-width="2.6"/></svg>'
};
const TPE_ABAS = {T:[['p', 'PADRÃO'], ['b', 'BORDA'], ['i', 'ÍCONE'], ['pre', 'MODELOS PRONTOS'], ['inv', 'INVENTÁRIO']],   // v70: Modelos prontos (era Pré-projetado)
  E:[['b', 'FORMA'], ['p', 'PADRÃO'], ['i', 'ÍCONE'], ['pre', 'MODELOS PRONTOS']]};
const ED = {modo:'T', D:null, base:'', aba:'p', slot:0, hist:[], fut:[], gota:false, alvo:null, pend:null, el:null, ok:false,
  rafP:0, miniT:0, miniTok:0, junta:false, nomeDe:'', contaT:0};

function tpePlataforma(){ try { const p = window.parent; return p && p !== window && p.RACHA_JOGO ? p.RACHA_JOGO : null; } catch (_) { return null; } }
function tpeContaSkins(){                               // as skins da sua conta do RACHA (uma vez por minuto): equipar não custa nada
  const pl = tpePlataforma(); if (!pl || !pl.inventario || Date.now() - ED.contaT < 60000) return;
  ED.contaT = Date.now();
  Promise.resolve(pl.inventario()).then(lista => {
    const cods = (Array.isArray(lista) ? lista : []).filter(c => typeof c === 'string' && TP_CONTA[c]);
    TP.conta = cods; for (const c of cods) TP.livres.add(tpCodigo(TP_CONTA[c].d));   // v70: soma (a tampinha da conta, restaurada no começo, não volta a ser cobrada)
    if (lobby.tela === 'skins' && ED.el) tpeAtualiza(true);
  }).catch(() => { ED.contaT = 0; });
}

/* ---------------------------------------------------------------- abrir */
function tpeAbre(o){                                     // o = {modo:'E', D, ok(cod), titulo, volta} · sem nada: a sua tampinha
  ED.pend = o || null;
  abreTelaAntes67('skins', (o && o.volta) || lobby.tela || null);
}
function tpeComeca(){
  const o = ED.pend; ED.pend = null;
  if (!o && ED.manter && ED.D){ ED.manter = false; if (ED.voltaSalva) lobby.volta = ED.voltaSalva; ED.novo = true; return; }   // voltando da LOJA: continua de onde parou
  ED.manter = false; ED.voltaSalva = lobby.volta; ED.novo = true;
  ED.modo = o && o.modo === 'E' ? 'E' : 'T';
  ED.alvo = o || null;
  ED.D = ED.modo === 'E' ? (o.D ? tpCopia(o.D) : TP_ESCUDO_D()) : (tpLe(tpMinha()) || TP_PADRAO_D());
  ED.base = tpCodigo(ED.D); ED.hist = []; ED.fut = []; ED.gota = false; ED.ok = false; ED.slot = 0;
  ED.aba = ED.modo === 'E' ? 'b' : 'p'; ED.nomeDe = ''; ED.rasc = false;
  if (ED.modo === 'T'){
    const x = ED.experimenta; ED.experimenta = null;
    if (x && x.D){ ED.D = tpCopia(x.D); ED.aba = x.aba || 'p'; }   // v70: da LOJA: a peça em destaque na sua tampinha (o preço aparece no botão)
    else { const r = tpeLeRascunho(); if (r){ ED.D = tpLe(r.c); ED.rasc = true; } }   // v70: o rascunho de quando você saiu sem equipar
  }
  if (ED.modo === 'T') tpeContaSkins();
}
TELAS.skins.abre = () => tpeComeca();
TELAS.skins.render = () => tpeRender();
TELAS.skins.fecha = () => { tpeCorFecha(); tpeMenuFecha(); ED.gota = false; if (ED.descarta){ ED.descarta = false; tpeApagaRascunho(); } else tpeGuardaRascunho(); };

/* ---------------------------------------------------------------- v70: o rascunho e o aviso de sair sem equipar */
const TPE_RASCUNHO = 'racha-tampa-rascunho-v1';
function tpeMudou(){                                      // tem mudança que não foi equipada (ou, no escudo, usada no clube)?
  if (!ED.D) return false;
  const cod = tpCodigo(ED.D);
  return ED.modo === 'T' ? cod !== tpMinha() : (!ED.ok && cod !== ED.base);
}
function tpeGuardaRascunho(){                            // saiu do editor sem equipar: o desenho fica guardado (volta no próximo abrir)
  if (ED.modo !== 'T' || !ED.D) return;
  try { if (tpeMudou()) localStorage.setItem(TPE_RASCUNHO, JSON.stringify({c:tpCodigo(ED.D), t:Date.now()})); else localStorage.removeItem(TPE_RASCUNHO); } catch (_) {}
}
function tpeLeRascunho(){
  try { const o = JSON.parse(localStorage.getItem(TPE_RASCUNHO) || 'null'); if (o && tpEhCodigo(o.c) && o.c[0] === 'T' && tpLe(o.c) && o.c !== tpMinha()) return o; } catch (_) {}
  return null;
}
function tpeApagaRascunho(){ ED.rasc = false; try { localStorage.removeItem(TPE_RASCUNHO); } catch (_) {} }
function tpeSairPop(sair){                                // VOLTAR com mudança que não foi equipada
  const T = ED.modo === 'T';
  abrePop(c => {
    c.append(nodo('span', 'pop-tag', T ? 'SUA TAMPINHA' : 'ESCUDO DO CLUBE'), nodo('h2', null, T ? 'SAIR SEM EQUIPAR?' : 'SAIR SEM USAR NO CLUBE?'),
      nodo('p', 'pop-txt', T ? 'As mudanças ainda não estão na sua tampinha. Se sair, elas ficam guardadas como rascunho: o editor abre de onde parou na próxima vez.'
        : 'As mudanças do escudo ainda não foram para o clube. Se sair agora, elas se perdem.'));
    const a = nodo('div', 'pop-acoes');
    a.append(botaoPop('CONTINUAR EDITANDO', '', () => { som.clique(); fechaPop(); }));
    a.append(botaoPop(T ? 'DESCARTAR' : 'SAIR SEM SALVAR', 'vermelho', () => { som.clique(); fechaPop(); ED.descarta = true; ED.saindo = true; sair(); ED.saindo = false; }));
    if (T) a.append(botaoPop('SAIR E GUARDAR', 'verde', () => { som.clique(); fechaPop(); ED.saindo = true; sair(); ED.saindo = false; }));
    c.appendChild(a);
  });
}
const fechaTelaAntes70e = fechaTela;
fechaTela = function(){                                   // (Esc e os outros caminhos que fecham pelo nome)
  if (lobby.tela === 'skins' && !ED.saindo && LB.pop.hidden && tpeMudou()){ som.clique(); tpeSairPop(() => fechaTelaAntes70e()); return; }
  return fechaTelaAntes70e();
};
(function tpeVoltarGuarda(){                              // o VOLTAR do editor (ele chama o fechaTela antigo direto): avisa antes
  const v = TELAS.skins.el && TELAS.skins.el.querySelector('.tl-voltar'); if (!v) return;
  v.addEventListener('click', e => {
    if (lobby.tela !== 'skins' || ED.saindo || !tpeMudou()) return;
    e.stopImmediatePropagation(); e.preventDefault(); som.clique(); tpeSairPop(() => fechaTelaAntes70e());
  }, true);
})();

/* ---------------------------------------------------------------- a tela (montada uma vez) */
function tpeMonta(){
  const sec = TELAS.skins.el; if (!sec) return null;
  const velho = sec.querySelector('.sk-corpo'); if (velho) velho.hidden = true;
  sec.classList.add('tpe-tela');
  const corpo = nodo('div', 'tl-corpo tpe-corpo'), fd = nodo('canvas', 'tpe-favela'); fd.setAttribute('aria-hidden', 'true');
  const raiz = nodo('div', 'tpe'), abas = nodo('nav', 'tpe-abas'); abas.setAttribute('role', 'tablist'); abas.setAttribute('aria-label', 'Partes da tampinha');
  const meio = nodo('div', 'tpe-meio'), prev = nodo('div', 'tpe-prev'), cv = nodo('canvas', 'tpe-cv');
  cv.setAttribute('role', 'img');
  const menuBt = novoBotao('tpe-menu-bt', 'Mais opções'); menuBt.innerHTML = TPE_SVG.mais;
  const menu = nodo('div', 'tpe-menu'); menu.hidden = true; menu.setAttribute('role', 'menu');
  const dica = nodo('p', 'tpe-dica', 'Toque na tampinha para pegar a cor'); dica.hidden = true;
  const nome = nodo('div', 'tpe-nome'), hist = nodo('div', 'tpe-hist');
  const bDes = novoBotao('tpe-mini', 'Desfazer'), bRef = novoBotao('tpe-mini', 'Refazer'), bAle = novoBotao('tpe-mini', 'Tampinha aleatória');
  bDes.innerHTML = TPE_SVG.desfaz; bRef.innerHTML = TPE_SVG.refaz; bAle.innerHTML = TPE_SVG.dado;
  hist.append(bDes, bRef, bAle);
  const rasc = nodo('div', 'tpe-rasc'); rasc.hidden = true; rasc.setAttribute('role', 'status');
  const rascB = novoBotao('tpe-rasc-bt'); rascB.textContent = 'DESCARTAR'; rasc.append(nodo('span', null, 'Rascunho de antes (ainda não equipado)'), rascB);
  rascB.addEventListener('click', () => { som.clique(); const D = tpLe(tpMinha()); tpeApagaRascunho(); if (D){ ED.hist.push(tpCopia(ED.D)); ED.fut = []; tpeTroca(D); tpeBotoesHist(); } });   // v70
  prev.append(cv, menuBt, menu, dica, nome, hist, rasc);
  const ctl = nodo('div', 'tpe-ctl');
  meio.append(prev, ctl);
  const baixo = nodo('div', 'tpe-baixo'), faixa = nodo('div', 'tpe-faixa'), rod = nodo('div', 'tpe-rodape');
  const falta = nodo('p', 'tpe-falta'), ok = novoBotao('tpe-ok'); ok.innerHTML = '<b>CONCLUÍDO</b><span class="tpe-ok-preco"></span>';
  rod.append(falta, ok); baixo.append(faixa, rod);
  const cor = nodo('div', 'tpe-pop'); cor.hidden = true;
  raiz.append(abas, meio, baixo, cor);
  corpo.append(fd, raiz); sec.appendChild(corpo);
  ED.el = {sec, corpo, fd, raiz, abas, meio, prev, cv, menuBt, menu, dica, nome, bDes, bRef, bAle, ctl, faixa, falta, ok, cor, rasc, fundoK:''};
  // os eventos (uma vez)
  abas.addEventListener('click', e => { const b = e.target.closest('[data-aba]'); if (!b || b.dataset.aba === ED.aba) return; som.clique(); ED.aba = b.dataset.aba; ED.slot = 0; ED.gota = false; tpeCorFecha(); tpeAtualiza(true); });
  menuBt.addEventListener('click', e => { e.stopPropagation(); som.clique(); if (menu.hidden) tpeMenuAbre(); else tpeMenuFecha(); });
  bDes.addEventListener('click', () => tpeDesfaz()); bRef.addEventListener('click', () => tpeRefaz()); bAle.addEventListener('click', () => tpeAleatoria());
  cv.addEventListener('pointerdown', e => { if (!ED.gota) return; e.preventDefault(); tpeConta(e); });
  faixa.addEventListener('click', e => { const b = e.target.closest('.tpe-item'); if (b) tpeEscolhe(b.dataset.id); });
  ok.addEventListener('click', () => tpeConcluir());
  raiz.addEventListener('pointerdown', e => {
    if (!ED.el.cor.hidden && !e.target.closest('.tpe-pop') && !e.target.closest('.tpe-cor')) tpeCorFecha();
    if (!ED.el.menu.hidden && !e.target.closest('.tpe-menu') && !e.target.closest('.tpe-menu-bt')) tpeMenuFecha();
  });
  window.addEventListener('resize', () => { if (lobby.tela === 'skins') setTimeout(() => { ED.el.fundoK = ''; tpeFundo(); tpePinta(); }, 160); });
  return ED.el;
}
function tpeFundo(){                                     // a favela atrás (a mesma da sala)
  const E = ED.el, c = E.fd, w = E.corpo.clientWidth, h = E.corpo.clientHeight; if (w < 10 || h < 10 || !window.RUA_FAVELA) return;
  const k = Math.min(2.5, (PALCO.s || 1)*dprL()), key = w + 'x' + h + '@' + k.toFixed(3);
  if (E.fundoK === key) return; E.fundoK = key;
  c.width = Math.round(w*k); c.height = Math.round(h*k);
  const g = c.getContext('2d'); g.setTransform(k, 0, 0, k, 0, 0);
  E.corpo.classList.toggle('favela', !!window.RUA_FAVELA(g, w, h));
}
function tpeRender(){
  if (!ED.D) tpeComeca();
  if (!ED.el && !tpeMonta()) return;
  const tudo = ED.novo || ED.el.abaFeita !== ED.aba + ED.modo; ED.novo = false;
  tpeAtualiza(tudo);
  setTimeout(tpeFundo, 30);
}

/* ---------------------------------------------------------------- o estado na tela */
const tpeTipo = aba => aba === 'b' ? (ED.modo === 'E' ? 'f' : 'b') : aba;   // b / f / p / i
const tpeLista = aba => aba === 'b' ? (ED.modo === 'E' ? TP_FORMAS : TP_BORDAS) : aba === 'p' ? TP_PADROES : aba === 'i' ? TP_ICONES : [];
const tpeAtual = aba => aba === 'b' ? ED.D.b : aba === 'p' ? ED.D.p : aba === 'i' ? ED.D.i : '';
function tpeAtualiza(tudo){
  const E = ED.el; if (!E) return;
  const titulo = E.sec.querySelector('.tl-cab h2'); if (titulo) titulo.textContent = ED.modo === 'E' ? 'ESCUDO DO CLUBE' : 'SUA TAMPINHA';
  E.raiz.dataset.modo = ED.modo; E.raiz.dataset.aba = ED.aba;
  if (tudo || !E.abas.childNodes.length || E.abas.dataset.m !== ED.modo){
    E.abas.textContent = ''; E.abas.dataset.m = ED.modo;
    for (const [id, rot] of TPE_ABAS[ED.modo]){ const b = novoBotao('tpe-aba', rot); b.dataset.aba = id; b.setAttribute('role', 'tab'); b.textContent = rot; E.abas.appendChild(b); }
  }
  for (const b of E.abas.children){ const on = b.dataset.aba === ED.aba; b.classList.toggle('on', on); b.setAttribute('aria-selected', String(on)); }
  if (tudo){ E.abaFeita = ED.aba + ED.modo; tpeControles(); tpeFaixa(); }
  else { tpeSincroniza(); tpeFaixaMarca(); }
  tpePinta(); tpeRodape();
}
function tpePinta(){                                     // a tampinha grande (no próximo quadro)
  if (ED.rafP) return;
  ED.rafP = requestAnimationFrame(() => {
    ED.rafP = 0; const E = ED.el; if (!E || !ED.D) return;
    const cv = E.cv, r = cv.getBoundingClientRect(); if (r.width < 4) return;
    const k = Math.min(3, dprL()), W = Math.round(r.width*k), H = Math.round(r.height*k);
    if (cv.width !== W || cv.height !== H){ cv.width = W; cv.height = H; }
    const g = cv.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H);
    const s = Math.min(W, H), x = W/2, y = H/2 - s*.02, R = s*(ED.modo === 'E' ? .4 : .42);
    if (ED.modo === 'T'){                                // a sombra no chão
      g.save(); g.translate(x, y + R*1.02); g.scale(1, .2); const gr = g.createRadialGradient(0, 0, R*.2, 0, 0, R*1.1);
      gr.addColorStop(0, 'rgba(0,0,0,.5)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, R*1.1, 0, TP_TAU); g.fill(); g.restore();
    }
    tpDesenha(g, x, y, R, ED.D, tpSemente(tpCodigo(ED.D)));
    cv.setAttribute('aria-label', (ED.modo === 'E' ? 'Escudo: ' : 'Tampinha: ') + tpeDescreve(ED.D));
  });
}
function tpeDescreve(D){
  const B = (D.k === 'E' ? TP_MAPA.f : TP_MAPA.b).get(D.b), P = TP_MAPA.p.get(D.p), I = TP_MAPA.i.get(D.i);
  return [B && B.nome, P && P.nome, I && I.id !== '--' ? (I.texto ? 'texto ' + (tpTexto(D.t) || 'R') : I.nome) : 'sem ícone'].filter(Boolean).join(' · ');
}
function tpeRaridade(D){                                 // a peça mais rara do desenho
  const ord = ['gratis', 'comum', 'raro', 'epico', 'lendario'];
  let m = 0; for (const it of [(D.k === 'E' ? TP_MAPA.f : TP_MAPA.b).get(D.b), TP_MAPA.p.get(D.p), TP_MAPA.i.get(D.i)]) if (it) m = Math.max(m, ord.indexOf(it.pr));
  return ord[m];
}
function tpeNomeDe(D){                                   // o nome que aparece: o pré-projetado, a skin da conta ou "personalizada"
  const cod = tpCodigo(D), lista = D.k === 'E' ? TP_PRE_ESCUDO : TP_PRE;
  const pre = lista.find(x => tpCodigo(x.d) === cod); if (pre) return pre.nome;
  for (const k of TP.conta) if (tpCodigo(TP_CONTA[k].d) === cod) return TP_CONTA[k].nome;
  const sv = D.k === 'T' && TP.salvas.find(s => s.c === cod); if (sv) return sv.n;
  return D.k === 'E' ? 'Escudo personalizado' : 'Personalizada';
}

/* ---------------------------------------------------------------- os controles da aba */
function tpeSlots(){                                     // as cores que a aba mexe: [campo, índice, rótulo]
  const D = ED.D, a = ED.aba;
  if (a === 'b'){
    if (ED.modo === 'E') return [['bc', 0, 'FORA'], ['bc', 1, 'FILETE']];
    const B = TP_MAPA.b.get(D.b), n = B ? B.cores : 1; return [['bc', 0, n > 1 ? 'COR 1' : 'METAL'], ['bc', 1, 'COR 2']].slice(0, n);
  }
  if (a === 'p'){ const P = TP_MAPA.p.get(D.p), n = P ? P.cores : 0; return [['pc', 0, 'FUNDO'], ['pc', 1, 'COR 2'], ['pc', 2, 'COR 3']].slice(0, 1 + n); }
  if (a === 'i'){ const I = TP_MAPA.i.get(D.i); if (!I || I.id === '--') return []; const n = I.texto ? 1 : I.cores; return [['ic', 0, 'COR 1'], ['ic', 1, 'COR 2']].slice(0, n); }
  return [];
}
const tpePrm = () => ED.aba === 'p' ? (ED.D.p !== 'li' ? ED.D.pp : null) : ED.aba === 'i' ? (ED.D.i !== '--' ? ED.D.ip : null) : null;
function tpeBloco(cls, rot){ const d = nodo('div', 'tpe-bloco ' + cls), h = nodo('b', 'tpe-rot', rot); d.appendChild(h); return d; }
function tpeControles(){
  const E = ED.el, c = E.ctl; c.textContent = ''; c.className = 'tpe-ctl';
  if (ED.aba === 'pre' || ED.aba === 'inv'){ c.classList.add('grade'); if (ED.aba === 'pre') tpePreProjetados(c); else tpeInventario(c); return; }
  // as cores
  const bc = tpeBloco('tpe-cores', 'CORES'), sl = nodo('div', 'tpe-slots'); bc.appendChild(sl);
  E.slotsEl = sl; E.notaCor = nodo('p', 'tpe-nota'); bc.appendChild(E.notaCor);
  c.appendChild(bc);
  // a posição, o tamanho e o ângulo
  const bp = tpeBloco('tpe-pos', 'POSIÇÃO'), pad = nodo('div', 'tpe-pad'), ponto = nodo('i', 'tpe-ponto'), zera = novoBotao('tpe-zera', 'Voltar ao centro');
  E.posVal = nodo('small', 'tpe-pad-xy', '(0, 0)');
  zera.innerHTML = TPE_SVG.volta; pad.setAttribute('role', 'slider'); pad.setAttribute('aria-label', 'Posição'); pad.tabIndex = 0;
  pad.append(nodo('i', 'tpe-pad-h'), nodo('i', 'tpe-pad-v'), ponto, E.posVal, zera); bp.appendChild(pad);
  E.pad = pad; E.ponto = ponto;
  const bt = tpeBloco('tpe-tam', 'TAMANHO'), it = nodo('input', 'tpe-rng'); it.type = 'range'; it.min = 0; it.max = 100; it.step = 1; it.setAttribute('aria-label', 'Tamanho');
  E.tamVal = nodo('small', null, '50'); bt.firstChild.appendChild(E.tamVal); bt.appendChild(it); E.tam = it;
  const ba = tpeBloco('tpe-ang', 'ÂNGULO'), ia = nodo('input', 'tpe-rng'); ia.type = 'range'; ia.min = 0; ia.max = 100; ia.step = 1; ia.setAttribute('aria-label', 'Ângulo');
  E.angVal = nodo('small', null, '0°'); ba.firstChild.appendChild(E.angVal); ba.appendChild(ia); E.ang = ia;
  const geo = nodo('div', 'tpe-geo'), sl2 = nodo('div', 'tpe-sl2'); sl2.append(bt, ba); geo.append(bp, sl2);
  E.semGeo = nodo('p', 'tpe-nota tpe-semgeo'); c.appendChild(E.semGeo);
  E.geo = geo; c.appendChild(geo);
  // o ícone: o estilo (junto do tamanho e do ângulo) e o texto (junto das cores)
  if (ED.aba === 'i'){
    const be = tpeBloco('tpe-est', 'ESTILO'), seg = nodo('div', 'tpe-seg');
    TP_ESTILOS.forEach(([n, d], k) => { const b = novoBotao('tpe-op', n + ': ' + d); b.dataset.e = String(k); b.textContent = n.toUpperCase(); seg.appendChild(b); });
    be.appendChild(seg); E.estSeg = seg; sl2.appendChild(be);
    seg.addEventListener('click', e => { const b = e.target.closest('[data-e]'); if (!b) return; som.clique(); tpeMuda(D => { D.ie = +b.dataset.e; }); tpeSincroniza(); });
    const bx = tpeBloco('tpe-txt', 'TEXTO'), inp = nodo('input', 'tpe-txt-in'); inp.type = 'text'; inp.maxLength = 3; inp.autocomplete = 'off'; inp.spellcheck = false;
    inp.setAttribute('aria-label', 'Texto da tampinha (até 3 letras)'); inp.placeholder = 'ATÉ 3';
    bx.append(inp, nodo('small', 'tpe-txt-dica', 'Letras, números e ★ ♥ ! ?')); E.txtBloco = bx; E.txtIn = inp; bc.insertAdjacentElement('afterend', bx);
    inp.addEventListener('input', () => { const t = tpTexto(inp.value); tpeMuda(D => { D.t = t; }, ED.junta === 'txt'); ED.junta = 'txt'; });
    inp.addEventListener('blur', () => { ED.junta = false; inp.value = ED.D.t; });
  } else { E.estSeg = null; E.txtBloco = null; E.txtIn = null; }
  // os eventos dos controles
  sl.addEventListener('click', e => {
    const s = e.target.closest('.tpe-slot'); if (!s) return;
    const k = +s.dataset.n;
    if (e.target.closest('.tpe-gota')){ som.clique(); ED.slot = k; ED.gota = !ED.gota; tpeCorFecha(); tpeSincroniza(); return; }
    if (e.target.closest('.tpe-cor')){ som.clique(); ED.slot = k; ED.gota = false; tpeSincroniza(); tpeCorAbre(); return; }
    if (ED.slot !== k){ ED.slot = k; tpeSincroniza(); }
  });
  sl.addEventListener('change', e => { const inp = e.target.closest('.tpe-hex'); if (!inp) return; const v = inp.value.trim().replace(/^#?/, '#').toLowerCase(); const s = inp.closest('.tpe-slot'), sx = tpeSlots()[+s.dataset.n]; if (TP_HEX.test(v) && sx) tpePoeCor(sx, v); else inp.value = ED.D[sx[0]][sx[1]]; });
  const doPad = (e, junta) => { const p = tpePrm(); if (!p) return; const r = pad.getBoundingClientRect(); const x = tpLim((e.clientX - r.left)/r.width*100, 0, 100), y = tpLim((e.clientY - r.top)/r.height*100, 0, 100); tpeMuda(D => { const q = ED.aba === 'p' ? D.pp : D.ip; q[0] = Math.abs(x - 50) < 3 ? 50 : x; q[1] = Math.abs(y - 50) < 3 ? 50 : y; }, junta); tpeSincroniza(); };
  pad.addEventListener('pointerdown', e => { if (!tpePrm() || e.target.closest('.tpe-zera')) return; e.preventDefault(); pad.setPointerCapture(e.pointerId); pad.classList.add('ativo'); doPad(e, false); });
  pad.addEventListener('pointermove', e => { if (pad.classList.contains('ativo')) doPad(e, true); });
  const solta = () => pad.classList.remove('ativo');
  pad.addEventListener('pointerup', solta); pad.addEventListener('pointercancel', solta);
  pad.addEventListener('dblclick', () => { if (!tpePrm()) return; tpeMuda(D => { const q = ED.aba === 'p' ? D.pp : D.ip; q[0] = q[1] = 50; }); tpeSincroniza(); });
  pad.addEventListener('keydown', e => { const p = tpePrm(); if (!p) return; const d = {ArrowLeft:[-2, 0], ArrowRight:[2, 0], ArrowUp:[0, -2], ArrowDown:[0, 2]}[e.key]; if (!d) return; e.preventDefault(); tpeMuda(D => { const q = ED.aba === 'p' ? D.pp : D.ip; q[0] = tpLim(q[0] + d[0], 0, 100); q[1] = tpLim(q[1] + d[1], 0, 100); }, ED.junta === 'pad'); ED.junta = 'pad'; tpeSincroniza(); });
  zera.addEventListener('click', () => { if (!tpePrm()) return; som.clique(); tpeMuda(D => { const q = ED.aba === 'p' ? D.pp : D.ip; q[0] = q[1] = 50; q[2] = ED.aba === 'i' && D.k === 'T' && D.i === 'es' && q[2] === 40 ? 40 : 50; q[3] = 0; }); tpeSincroniza(); });
  for (const [inp, k] of [[it, 2], [ia, 3]]){
    inp.addEventListener('pointerdown', () => { ED.junta = false; });
    inp.addEventListener('input', () => { const p = tpePrm(); if (!p) return; const v = +inp.value; tpeMuda(D => { (ED.aba === 'p' ? D.pp : D.ip)[k] = v; }, ED.junta === 'rng' + k); ED.junta = 'rng' + k; tpeSincroniza(); });
    inp.addEventListener('change', () => { ED.junta = false; });
  }
  tpeSincroniza();
}
function tpeSincroniza(){                                // os valores nos controles (sem refazer nada)
  const E = ED.el; if (!E || ED.aba === 'pre' || ED.aba === 'inv'){ tpeDicaGota(); return; }
  const D = ED.D, slots = tpeSlots();
  if (ED.slot >= slots.length) ED.slot = 0;
  // as cores: refaz os slots só quando muda a quantidade
  if (E.slotsEl.childNodes.length !== slots.length || E.slotsEl.dataset.k !== slots.map(s => s[0] + s[1]).join()){
    E.slotsEl.textContent = ''; E.slotsEl.dataset.k = slots.map(s => s[0] + s[1]).join();
    slots.forEach(([k, j, rot], n) => {
      const s = nodo('div', 'tpe-slot'); s.dataset.n = String(n);
      const sw = novoBotao('tpe-cor', 'Escolher ' + rot.toLowerCase()), hx = nodo('input', 'tpe-hex'), gt = novoBotao('tpe-gota', 'Conta-gotas: pegar ' + rot.toLowerCase() + ' da tampinha');
      hx.type = 'text'; hx.maxLength = 7; hx.spellcheck = false; hx.autocomplete = 'off'; hx.setAttribute('aria-label', rot + ' em hexadecimal');
      gt.innerHTML = TPE_SVG.gota;
      s.append(nodo('span', 'tpe-slot-rot', rot), sw, hx, gt); E.slotsEl.appendChild(s);
    });
  }
  slots.forEach(([k, j], n) => {
    const s = E.slotsEl.children[n], c = D[k][j]; if (!s) return;
    s.classList.toggle('on', n === ED.slot); s.querySelector('.tpe-cor').style.setProperty('--c', c);
    const hx = s.querySelector('.tpe-hex'); if (document.activeElement !== hx) hx.value = c;
    s.querySelector('.tpe-gota').classList.toggle('on', ED.gota && n === ED.slot);
  });
  const B = TP_MAPA.b.get(D.b);
  E.notaCor.textContent = slots.length ? '' : ED.aba === 'b' ? (B ? 'A borda ' + B.nome + ' tem as cores dela.' : '') : ED.aba === 'i' ? 'Escolha um ícone na faixa embaixo.' : '';
  E.notaCor.hidden = !!slots.length;
  // a posição, o tamanho e o ângulo
  const p = tpePrm();
  E.geo.classList.toggle('off', !p); E.geo.hidden = ED.aba === 'b';
  E.semGeo.hidden = !(ED.aba === 'b' || !p);
  E.semGeo.textContent = ED.aba === 'b' ? (ED.modo === 'E' ? 'A forma do escudo é a parte de fora: escolha embaixo e pinte aqui em cima.' : 'A borda é a saia da tampinha, com os dentes: escolha embaixo e pinte aqui em cima.')
    : ED.aba === 'p' ? 'O Liso não tem desenho para mexer: escolha um padrão embaixo.' : 'Sem ícone: escolha um embaixo.';
  const q = p || [50, 50, 50, 0];
  E.ponto.style.left = q[0] + '%'; E.ponto.style.top = q[1] + '%';
  E.posVal.textContent = '(' + (q[0] - 50) + ', ' + (50 - q[1]) + ')';
  E.pad.setAttribute('aria-valuetext', 'x ' + (q[0] - 50) + ', y ' + (50 - q[1]));
  if (document.activeElement !== E.tam) E.tam.value = q[2]; if (document.activeElement !== E.ang) E.ang.value = q[3];
  E.tam.disabled = E.ang.disabled = !p;
  E.tamVal.textContent = String(q[2]); E.angVal.textContent = Math.round(q[3]*3.6) + '°';
  if (E.estSeg){ for (const b of E.estSeg.children){ const on = +b.dataset.e === (D.ie | 0); b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); } E.estSeg.parentNode.hidden = D.i === '--'; }
  if (E.txtBloco){ E.txtBloco.hidden = D.i !== 'tx'; if (document.activeElement !== E.txtIn) E.txtIn.value = D.t || ''; }
  E.ctl.classList.toggle('com-txt', !!E.txtBloco && D.i === 'tx');
  tpeDicaGota();
}
function tpeDicaGota(){ const E = ED.el; if (!E) return; E.prev.classList.toggle('gota', !!ED.gota); E.dica.hidden = !ED.gota; }

/* ---------------------------------------------------------------- a faixa de peças */
function tpeFaixa(){
  const E = ED.el, f = E.faixa; f.textContent = '';
  const lista = tpeLista(ED.aba); E.baixoVazio = !lista.length;
  E.raiz.classList.toggle('sem-faixa', !lista.length);
  if (!lista.length){ tpeRodape(); return; }
  const tipo = tpeTipo(ED.aba);
  for (const it of lista){
    const b = novoBotao('tpe-item', it.nome); b.dataset.id = it.id; b.dataset.r = it.pr;
    const box = nodo('span', 'tpe-mini-cv'), nm = nodo('span', 'tpe-item-n', it.nome), pr = nodo('em', 'tpe-preco');
    b.append(box, nm, pr); f.appendChild(b);
  }
  tpeFaixaMarca(); tpeMinis(true);
  const on = f.querySelector('.tpe-item.on'); if (on) requestAnimationFrame(() => { try { on.scrollIntoView({block:'nearest', inline:'center'}); } catch (_) {} });
}
function tpeFaixaMarca(){                                // a escolhida, os preços e o que já é seu
  const E = ED.el; if (!E) return;
  const tipo = tpeTipo(ED.aba), atual = tpeAtual(ED.aba);
  for (const b of E.faixa.children){
    const id = b.dataset.id, it = tpMapaDe(tipo).get(id), tem = tpTem(tipo, id), on = id === atual;
    b.classList.toggle('on', on); b.classList.toggle('tem', tem); b.setAttribute('aria-pressed', String(on));
    const pr = b.querySelector('.tpe-preco'), k = (tem ? (it.pr === 'gratis' ? 'g' : 's') : it.pr);
    if (pr.dataset.k === k) continue; pr.dataset.k = k;
    if (tem) pr.textContent = it.pr === 'gratis' ? 'GRÁTIS' : 'SUA';
    else { const P = TP_PRECO[it.pr]; pr.innerHTML = P.g ? '<i class="ic-gema"></i>' + P.g : '<i class="ic-moeda"></i>' + fmtNum(P.m); }
  }
}
function tpeMinis(agora){                                // as miniaturas da faixa com as suas cores (aos poucos, sem travar)
  clearTimeout(ED.miniT);
  const vai = () => {
    const E = ED.el; if (!E) return;
    const tok = ++ED.miniTok, itens = [...E.faixa.children], tipo = tpeTipo(ED.aba);
    let i = 0;
    const lote = () => {
      if (tok !== ED.miniTok || lobby.tela !== 'skins') return;
      const t0 = performance.now();
      while (i < itens.length && performance.now() - t0 < 10){
        const b = itens[i++], D = tpCopia(ED.D), id = b.dataset.id;
        if (tipo === 'p'){ D.p = id; D.pp = [50, 50, 50, 0]; D.i = '--'; }
        else if (tipo === 'i'){ D.i = id; D.ip = [50, 50, 50, 0]; if (id === 'tx' && !D.t) D.t = 'R'; }
        else D.b = id;
        const box = b.querySelector('.tpe-mini-cv'); box.textContent = ''; box.appendChild(tpMiniatura(D, 92));
      }
      if (i < itens.length) requestAnimationFrame(lote);
    };
    lote();
  };
  if (agora) vai(); else ED.miniT = setTimeout(vai, 320);
}
function tpeEscolhe(id){
  const aba = ED.aba, tipo = tpeTipo(aba); if (!tpMapaDe(tipo).has(id) || tpeAtual(aba) === id) return;
  som.clique();
  const coresAntes = tpeSlots().length;
  tpeMuda(D => {
    if (aba === 'b') D.b = id; else if (aba === 'p') D.p = id;
    else { const antes = D.i; D.i = id; if (antes === '--' && id !== '--'){ D.ip = [50, 50, D.k === 'T' ? 46 : 50, 0]; } if (id === 'tx' && !D.t) D.t = 'R'; }
  });
  ED.gota = false;
  if (tpeSlots().length !== coresAntes) ED.slot = 0;
  tpeSincroniza(); tpeFaixaMarca();
  if (aba !== 'p') tpeMinis();                           // (a borda e o ícone aparecem nas miniaturas das outras abas)
}

/* ---------------------------------------------------------------- mudar, desfazer, refazer */
function tpeMuda(fn, junta){
  if (!junta){ ED.hist.push(tpCopia(ED.D)); if (ED.hist.length > 80) ED.hist.shift(); ED.fut = []; }
  fn(ED.D); tpePinta(); tpeRodape(); tpeBotoesHist();
}
function tpeBotoesHist(){ const E = ED.el; if (!E) return; E.bDes.disabled = !ED.hist.length; E.bRef.disabled = !ED.fut.length; }
function tpeTroca(D){ ED.D = tpCopia(D); ED.slot = 0; ED.gota = false; tpeAtualiza(true); }
function tpeDesfaz(){ if (!ED.hist.length) return; som.clique(); ED.fut.push(tpCopia(ED.D)); tpeTroca(ED.hist.pop()); tpeBotoesHist(); }
function tpeRefaz(){ if (!ED.fut.length) return; som.clique(); ED.hist.push(tpCopia(ED.D)); tpeTroca(ED.fut.pop()); tpeBotoesHist(); }
function tpeCarrega(D){ ED.hist.push(tpCopia(ED.D)); if (ED.hist.length > 80) ED.hist.shift(); ED.fut = []; ED.D = tpCopia(D); ED.slot = 0; ED.gota = false; tpePinta(); tpeRodape(); tpeBotoesHist(); tpeMarcaGrade(); }
function tpeAleatoria(){                                 // uma tampinha sorteada (com as peças de todo o catálogo: o CONCLUÍDO mostra o preço)
  som.clique();
  const r = Math.random, esc = a => a[Math.floor(r()*a.length)], cor = () => esc(TPE_PALETA);
  const D = ED.modo === 'E' ? TP_ESCUDO_D() : TP_PADRAO_D();
  D.b = esc(ED.modo === 'E' ? TP_FORMAS : TP_BORDAS).id; D.bc = [cor(), cor()];
  D.p = esc(TP_PADROES).id; D.pc = [cor(), cor(), cor()]; D.pp = [50, 50, 35 + Math.floor(r()*35), Math.floor(r()*8)*12.5 | 0];
  if (r() < .75){ D.i = esc(TP_ICONES.filter(x => x.id !== '--' && !x.texto)).id; D.ic = [cor(), cor()]; D.ip = [50, 50, 38 + Math.floor(r()*20), 0]; D.ie = Math.floor(r()*4); } else { D.i = '--'; D.ie = 0; }
  ED.hist.push(tpCopia(ED.D)); ED.fut = []; ED.D = D; ED.slot = 0; ED.gota = false; tpeAtualiza(true); tpeBotoesHist();
}

/* ---------------------------------------------------------------- as cores: a paleta e o conta-gotas */
function tpePoeCor(sx, c, junta){ if (!sx || !TP_HEX.test(c)) return; tpeMuda(D => { D[sx[0]][sx[1]] = c.toLowerCase(); }, junta); tpeSincroniza(); tpeMinis(); }
function tpeConta(e){                                    // o conta-gotas: a cor da tampinha no ponto tocado
  const cv = ED.el.cv, r = cv.getBoundingClientRect(), x = Math.round((e.clientX - r.left)/r.width*cv.width), y = Math.round((e.clientY - r.top)/r.height*cv.height);
  let px; try { px = cv.getContext('2d').getImageData(Math.max(0, Math.min(cv.width - 1, x)), Math.max(0, Math.min(cv.height - 1, y)), 1, 1).data; } catch (_) { return; }
  ED.gota = false;
  if (px[3] < 128){ tpeDicaGota(); aviso('Toque em cima da tampinha'); tpeSincroniza(); return; }
  const hex = '#' + [px[0], px[1], px[2]].map(v => v.toString(16).padStart(2, '0')).join('');
  som.clique(); tpePoeCor(tpeSlots()[ED.slot], hex);
}
function tpeCorAbre(){
  const E = ED.el, p = E.cor, sx = tpeSlots()[ED.slot]; if (!sx) return;
  p.textContent = ''; p.hidden = false;
  const atual = ED.D[sx[0]][sx[1]];
  const cab = nodo('div', 'tpe-pop-cab'); cab.append(nodo('b', null, sx[2]), (() => { const x = novoBotao('tpe-pop-x', 'Fechar'); x.innerHTML = TPE_SVG.x; x.addEventListener('click', () => { som.clique(); tpeCorFecha(); }); return x; })());
  const gr = nodo('div', 'tpe-pal');
  for (const c of TPE_PALETA){ const b = novoBotao('tpe-pal-c', c); b.style.setProperty('--c', c); b.dataset.c = c; b.classList.toggle('on', c === atual); gr.appendChild(b); }
  const usadas = [...new Set([...ED.D.bc, ...ED.D.pc, ...ED.D.ic].filter(c => TP_HEX.test(c)))].slice(0, 8);
  const rec = nodo('div', 'tpe-pal tpe-pal-usadas'); for (const c of usadas){ const b = novoBotao('tpe-pal-c', c); b.style.setProperty('--c', c); b.dataset.c = c; rec.appendChild(b); }
  const lin = nodo('div', 'tpe-pop-lin'), nat = nodo('input', 'tpe-nativo'); nat.type = 'color'; nat.value = atual; nat.setAttribute('aria-label', 'Mais cores');
  const rot = nodo('label', 'tpe-mais'); rot.append(nat, nodo('span', null, 'MAIS CORES'));
  lin.append(rot, (() => { const b = novoBotao('tpe-gota tpe-gota2', 'Conta-gotas'); b.innerHTML = TPE_SVG.gota + '<span>CONTA-GOTAS</span>'; b.addEventListener('click', () => { som.clique(); tpeCorFecha(); ED.gota = true; tpeSincroniza(); }); return b; })());
  p.append(cab, gr, nodo('small', 'tpe-pop-sub', 'USADAS NESTA TAMPINHA'), rec, lin);
  const pega = e => { const b = e.target.closest('.tpe-pal-c'); if (!b) return; som.clique(); tpePoeCor(tpeSlots()[ED.slot], b.dataset.c); for (const x of p.querySelectorAll('.tpe-pal-c')) x.classList.toggle('on', x.dataset.c === b.dataset.c); };
  gr.addEventListener('click', pega); rec.addEventListener('click', pega);
  let primeira = true;
  nat.addEventListener('input', () => { tpePoeCor(tpeSlots()[ED.slot], nat.value, !primeira); primeira = false; });
  nat.addEventListener('change', () => { primeira = true; });
}
function tpeCorFecha(){ if (ED.el) ED.el.cor.hidden = true; }

/* ---------------------------------------------------------------- o menu ⋮ */
function tpeMenuAbre(){
  const m = ED.el.menu; m.textContent = ''; m.hidden = false;
  const it = (svg, txt, fn, off) => { const b = novoBotao('tpe-menu-it'); b.setAttribute('role', 'menuitem'); b.innerHTML = svg + '<span></span>'; b.lastChild.textContent = txt; b.disabled = !!off; b.addEventListener('click', () => { som.clique(); tpeMenuFecha(); fn(); }); m.appendChild(b); };
  it(TPE_SVG.dado, 'Aleatória', () => tpeAleatoria());
  it(TPE_SVG.desfaz, 'Desfazer', () => tpeDesfaz(), !ED.hist.length);
  it(TPE_SVG.refaz, 'Refazer', () => tpeRefaz(), !ED.fut.length);
  if (ED.modo === 'T') it(TPE_SVG.salva, 'Salvar no inventário', () => tpeSalvarInv());
  it(TPE_SVG.copia, 'Copiar o código', () => x49Copy(tpCodigo(ED.D)));
  it(TPE_SVG.cola, 'Colar um código', () => tpeColar());
  it(TPE_SVG.volta, ED.modo === 'E' ? 'Voltar ao escudo do clube' : 'Voltar à equipada', () => { const D = tpLe(ED.base); if (D){ ED.hist.push(tpCopia(ED.D)); ED.fut = []; tpeTroca(D); tpeBotoesHist(); } });
}
function tpeMenuFecha(){ if (ED.el) ED.el.menu.hidden = true; }
function tpeColar(){                                     // o código de outra tampinha (copiado de um amigo)
  const usa = t => { const c = String(t || '').trim(), D = tpLe(c); if (!D || D.k !== ED.modo){ aviso(ED.modo === 'E' ? 'Esse código não é de um escudo' : 'Esse código não é de uma tampinha'); return; } tpeCarrega(D); tpeAtualiza(true); aviso('Código colado'); };
  if (navigator.clipboard && navigator.clipboard.readText) navigator.clipboard.readText().then(usa).catch(() => tpeColarPop(usa));
  else tpeColarPop(usa);
}
function tpeColarPop(usa){
  abrePop(c => {
    c.append(nodo('span', 'pop-tag', 'CÓDIGO'), nodo('h2', null, 'COLAR UM CÓDIGO'), nodo('p', 'pop-txt', 'Cole aqui o código que começa com ' + (ED.modo === 'E' ? 'E.' : 'T.')));
    const i = nodo('input', 'tpe-cola-in'); i.type = 'text'; i.maxLength = 48; i.spellcheck = false; i.autocomplete = 'off'; c.appendChild(i);
    const a = nodo('div', 'pop-acoes'); a.append(botaoPop('CANCELAR', '', () => { som.clique(); fechaPop(); }), botaoPop('USAR', 'verde', () => { som.clique(); fechaPop(); usa(i.value); })); c.appendChild(a);
    setTimeout(() => { try { i.focus(); } catch (_) {} }, 60);
  });
}

/* ---------------------------------------------------------------- PRÉ-PROJETADO e INVENTÁRIO */
function tpeEnche(pares){                               // as miniaturas dos cartões aos poucos (sem travar a tela)
  const tok = ++ED.miniTok; let i = 0;
  const lote = () => {
    if (tok !== ED.miniTok || lobby.tela !== 'skins') return;
    const t0 = performance.now();
    while (i < pares.length && performance.now() - t0 < 12){ const [box, D, px] = pares[i++]; box.textContent = ''; box.appendChild(tpMiniatura(D, px)); }
    if (i < pares.length) requestAnimationFrame(lote);
  };
  lote();
}
function tpeCartao(D, nome, extra, fila){
  const b = novoBotao('tpe-card', nome), box = nodo('span', 'tpe-mini-cv'); b.appendChild(box); b.appendChild(nodo('span', 'tpe-card-n', nome));
  if (fila) fila.push([box, D, 112]); else box.appendChild(tpMiniatura(D, 112));
  const c = tpCusto(D), pr = nodo('em', 'tpe-preco');
  if (!c.m && !c.g) pr.textContent = 'SUA'; else pr.innerHTML = (c.m ? '<i class="ic-moeda"></i>' + fmtNum(c.m) : '') + (c.m && c.g ? ' ' : '') + (c.g ? '<i class="ic-gema"></i>' + c.g : '');
  b.appendChild(pr); b.dataset.cod = tpCodigo(D);
  if (extra) b.appendChild(extra);
  b.addEventListener('click', e => { if (e.target.closest('.tpe-card-x')) return; som.clique(); tpeCarrega(D); });
  return b;
}
function tpeMarcaGrade(){ const E = ED.el; if (!E) return; const cod = tpCodigo(ED.D); for (const b of E.ctl.querySelectorAll('.tpe-card')) b.classList.toggle('on', b.dataset.cod === cod); }
function tpePreProjetados(c){
  const lista = ED.modo === 'E' ? TP_PRE_ESCUDO : TP_PRE, g = nodo('div', 'tpe-cards'), fila = [];
  c.appendChild(nodo('p', 'tpe-nota tpe-nota-topo', lista.length + (ED.modo === 'E' ? ' escudos prontos' : ' tampinhas prontas') + ': toque para experimentar e mude o que quiser. O preço é o das peças que você ainda não tem.'));
  for (const x of lista) g.appendChild(tpeCartao(x.d, x.nome, null, fila));
  c.appendChild(g); tpeMarcaGrade(); tpeEnche(fila);
}
function tpeInventario(c){
  const sal = nodo('div', 'tpe-inv-cab'), bt = novoBotao('sx-bt verde tpe-salvar'); bt.innerHTML = TPE_SVG.salva + '<span>SALVAR A ATUAL</span>';
  bt.addEventListener('click', () => { som.clique(); tpeSalvarInv(); });
  sal.append(nodo('b', 'tpe-rot', 'SALVAS NESTE APARELHO'), nodo('small', 'tpe-inv-n', TP.salvas.length + '/24'), bt);
  c.appendChild(sal);
  if (TP.salvas.length > 1){                                 // v70: buscar pelo nome
    const bx = nodo('label', 'tpe-busca'), i = nodo('input', 'tpe-busca-in'); i.type = 'search'; i.placeholder = 'Buscar pelo nome'; i.autocomplete = 'off'; i.spellcheck = false; i.maxLength = 20;
    i.setAttribute('aria-label', 'Buscar tampinha salva pelo nome'); i.value = ED.busca || '';
    i.addEventListener('input', () => { ED.busca = i.value; tpeInvGrade(); });
    bx.appendChild(i); c.appendChild(bx);
  }
  const g = nodo('div', 'tpe-cards tpe-salvas'); ED.el.invGrade = g; c.appendChild(g);
  tpeInvGrade();
  const fila = [];
  const pl = tpePlataforma();
  const cab2 = nodo('div', 'tpe-inv-cab'); cab2.appendChild(nodo('b', 'tpe-rot', 'DA SUA CONTA DO RACHA')); c.appendChild(cab2);
  if (!pl) c.appendChild(nodo('p', 'tpe-nota', 'As tampinhas que você ganha na sua conta do RACHA (por nível, conquistas e eventos) aparecem aqui quando o jogo é aberto pelo site do RACHA, com login.'));
  else if (!TP.conta.length) c.appendChild(nodo('p', 'tpe-nota', 'Nenhuma tampinha da conta ainda (ou ainda carregando). Elas chegam subindo de nível e em eventos.'));
  else { const g2 = nodo('div', 'tpe-cards'); for (const k of TP.conta) g2.appendChild(tpeCartao(TP_CONTA[k].d, TP_CONTA[k].nome, null, fila)); c.appendChild(g2); }
  const n = TP.itens.size, tot = TP_BORDAS.length + TP_PADROES.length + TP_ICONES.length + TP_FORMAS.length;
  const gr = [...TP_BORDAS, ...TP_PADROES, ...TP_ICONES, ...TP_FORMAS].filter(x => x.pr === 'gratis').length;
  c.appendChild(nodo('p', 'tpe-nota tpe-pecas', 'Peças liberadas: ' + (gr + n) + ' de ' + tot + ' (' + gr + ' grátis + ' + n + ' compradas neste aparelho).'));
  tpeMarcaGrade(); tpeEnche(fila);
}
const tpeSemAcento = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
function tpeInvGrade(){                                   // v70: as salvas (favoritas primeiro), com o menu de cada uma
  const g = ED.el && ED.el.invGrade; if (!g) return;
  g.textContent = ''; const fila = [], b = tpeSemAcento(ED.busca).trim();
  const l = TP.salvas.map((s, i) => [s, i]).filter(([s]) => !b || tpeSemAcento(s.n).includes(b)).sort(([a, i], [c, j]) => (c.f ? 1 : 0) - (a.f ? 1 : 0) || i - j);
  for (const [s] of l){
    const D = tpLe(s.c); if (!D) continue;
    const w = nodo('div', 'tpe-salva' + (s.f ? ' fav' : ''));
    const card = tpeCartao(D, s.n, null, fila);
    if (s.f) card.insertAdjacentHTML('beforeend', '<span class="tpe-fav" aria-hidden="true">★</span>');
    card.setAttribute('aria-label', (s.f ? 'Favorita: ' : '') + s.n + ' (toque para usar no editor)');
    const mais = novoBotao('tpe-card-mais', 'Opções de ' + s.n); mais.innerHTML = TPE_SVG.mais;
    mais.addEventListener('click', e => { e.stopPropagation(); som.clique(); tpeSalvaMenu(s); });
    w.append(card, mais); g.appendChild(w);
  }
  if (!TP.salvas.length) g.appendChild(nodo('p', 'tpe-nota', 'Nenhuma tampinha salva ainda. Monte uma e toque em SALVAR A ATUAL (ou no menu ⋮).'));
  else if (!l.length) g.appendChild(nodo('p', 'tpe-nota', 'Nenhuma salva com esse nome.'));
  tpeMarcaGrade(); tpeEnche(fila);
}
function tpeInvAtualiza(){ tpSalva(); if (ED.aba === 'inv'){ const n = ED.el && ED.el.ctl.querySelector('.tpe-inv-n'); if (n) n.textContent = TP.salvas.length + '/24'; tpeInvGrade(); } }
function tpeSalvaMenu(s){                                 // v70: renomear, duplicar, favoritar, trocar pelo atual e apagar (com DESFAZER)
  abrePop(c => {
    c.classList.add('tpe-salva-pop');
    const D = tpLe(s.c), cv = D ? tpMiniatura(D, 96) : null;
    c.append(nodo('span', 'pop-tag', 'TAMPINHA SALVA'), nodo('h2', null, s.n));
    if (cv){ cv.classList.add('tpe-salva-mini'); cv.setAttribute('aria-hidden', 'true'); c.appendChild(cv); }
    const l = nodo('div', 'tpe-salva-acoes');
    const ac = (txt, cls, fn) => { const b = botaoPop(txt, cls, () => { som.clique(); fn(); }); l.appendChild(b); return b; };
    ac('USAR NO EDITOR', 'amarelo', () => { fechaPop(); if (D){ tpeCarrega(D); tpeAtualiza(true); } });
    ac('RENOMEAR', '', () => { fechaPop(); setTimeout(() => tpeRenomeia(s), 130); });
    ac(s.f ? 'TIRAR DOS FAVORITOS' : 'FAVORITAR ★', '', () => { s.f = !s.f; fechaPop(); tpeInvAtualiza(); aviso(s.f ? 'Favoritada' : 'Saiu dos favoritos'); });
    ac('DUPLICAR', '', () => {
      fechaPop();
      if (TP.salvas.length >= 24){ aviso('Inventário cheio (24): apague uma'); return; }
      const i = TP.salvas.indexOf(s), nome = Array.from(s.n.replace(/ \(cópia( \d+)?\)$/, '') + ' (cópia)').slice(0, 20).join('');
      TP.salvas.splice(i + 1, 0, {c:s.c, n:nome, f:false}); tpeInvAtualiza(); aviso('Cópia salva');
    });
    const atual = tpCodigo(ED.D);
    if (atual !== s.c) ac('TROCAR PELO DESENHO ATUAL', '', () => { s.c = atual; fechaPop(); tpeInvAtualiza(); aviso('«' + s.n + '» agora tem o desenho do editor'); });
    ac('APAGAR', 'vermelho', () => {
      fechaPop();
      const i = TP.salvas.indexOf(s); if (i < 0) return;
      TP.salvas.splice(i, 1); tpeInvAtualiza();
      const desfaz = () => { if (TP.salvas.length >= 24 || TP.salvas.indexOf(s) >= 0) return; TP.salvas.splice(Math.min(i, TP.salvas.length), 0, s); tpeInvAtualiza(); aviso('Voltou para o inventário'); };
      if (typeof v70Desfazer === 'function') v70Desfazer('«' + s.n + '» apagada', desfaz, 9000); else aviso('Apagada');
    });
    c.appendChild(l);
    const a = nodo('div', 'pop-acoes'); a.appendChild(botaoPop('FECHAR', '', () => { som.clique(); fechaPop(); })); c.appendChild(a);
  });
}
function tpeRenomeia(s){
  abrePop(c => {
    c.append(nodo('span', 'pop-tag', 'TAMPINHA SALVA'), nodo('h2', null, 'NOVO NOME'));
    const i = nodo('input', 'tpe-cola-in'); i.type = 'text'; i.maxLength = 20; i.value = s.n; i.autocomplete = 'off'; i.spellcheck = false; i.setAttribute('aria-label', 'Nome da tampinha (até 20 letras)');
    c.appendChild(i);
    const ok = () => { const n = Array.from(semLixo(i.value)).slice(0, 20).join('').trim(); if (!n){ som.erro(); return; } s.n = n; som.clique(); fechaPop(); tpeInvAtualiza(); aviso('Nome trocado'); };
    i.addEventListener('keydown', e => { if (e.key === 'Enter'){ e.preventDefault(); ok(); } });
    const a = nodo('div', 'pop-acoes'); a.append(botaoPop('CANCELAR', '', () => { som.clique(); fechaPop(); }), botaoPop('SALVAR', 'verde', ok)); c.appendChild(a);
    setTimeout(() => { try { i.focus(); i.select(); } catch (_) {} }, 60);
  });
}
function tpeSalvarInv(){
  const cod = tpCodigo(ED.D);
  if (TP.salvas.some(s => s.c === cod)){ aviso('Essa já está salva'); return; }
  if (TP.salvas.length >= 24){ aviso('Inventário cheio (24): apague uma'); return; }
  const nome = tpeNomeDe(ED.D), n = nome === 'Personalizada' ? 'Minha tampinha ' + (TP.salvas.length + 1) : nome;
  TP.salvas.unshift({c:cod, n}); tpSalva(); aviso('Salva no inventário');
  if (ED.aba === 'inv') tpeControles();
}

/* ---------------------------------------------------------------- o rodapé e o CONCLUÍDO */
function tpeRodape(){
  const E = ED.el; if (!E || !ED.D) return;
  const L = tpFaltam(ED.D), c = tpCusto(ED.D), igual = tpCodigo(ED.D) === ED.base, pode = tpPode(c);
  const preco = E.ok.querySelector('.tpe-ok-preco');
  preco.innerHTML = (c.m ? '<i class="ic-moeda"></i><b>' + fmtNum(c.m) + '</b>' : '') + (c.g ? '<i class="ic-gema"></i><b>' + c.g + '</b>' : '') || (igual ? '' : '<i class="tpe-ok-ic">' + TPE_SVG.certo + '</i>');
  E.ok.classList.toggle('caro', !pode); E.ok.classList.toggle('pago', !!(c.m || c.g));
  const acao = tpeAcao(igual, !!(c.m || c.g)); E.ok.querySelector('b').textContent = acao;   // v70: o botão diz o que faz (e o preço, quando tem)
  E.ok.classList.toggle('volta', acao === 'VOLTAR');
  E.ok.setAttribute('aria-label', acao.charAt(0) + acao.slice(1).toLowerCase() + (c.m || c.g ? ': ' + (c.m ? fmtNum(c.m) + ' moedas' : '') + (c.m && c.g ? ' e ' : '') + (c.g ? c.g + ' gemas' : '') : ''));
  if (E.rasc) E.rasc.hidden = !(ED.rasc && ED.modo === 'T' && tpeMudou());
  const nome = tpeNomeDe(ED.D), rar = TP_PRECO[tpeRaridade(ED.D)].nome;
  E.nome.innerHTML = ''; E.nome.append(nodo('b', null, nome.toUpperCase()), nodo('small', 'tpe-r-' + tpeRaridade(ED.D), rar.toUpperCase()));
  if (!L.length) E.falta.textContent = igual ? (ED.modo === 'E' ? 'Esse é o escudo do clube.' : 'Essa é a que você está usando.') : (ED.modo === 'E' ? 'Tudo liberado: toque em USAR NO CLUBE.' : 'Tudo liberado: toque em EQUIPAR.');
  else E.falta.textContent = 'Falta' + (L.length > 1 ? 'm ' : ' ') + L.map(x => x.it.nome).join(', ') + ' · você tem ' + fmtNum(CONTA.moedas) + ' moedas e ' + fmtNum(CONTA.gemas) + ' gemas' + (pode ? '' : ' (não dá)');
  tpeBotoesHist();
}
function tpeAcao(igual, pago){ return igual ? 'VOLTAR' : ED.modo === 'E' ? (pago ? 'COMPRAR E USAR' : 'USAR NO CLUBE') : (pago ? 'COMPRAR E EQUIPAR' : 'EQUIPAR'); }
function tpeConcluir(){
  som.clique();
  const D = ED.D, cod = tpCodigo(D), L = tpFaltam(D), c = tpCusto(D);
  if (!L.length) return tpeAplica(cod);
  abrePop(cx => {
    cx.classList.add('tpe-compra');
    cx.append(nodo('span', 'pop-tag', 'LOJA DE PEÇAS'), nodo('h2', null, (ED.modo === 'E' ? 'COMPRAR E USAR' : 'COMPRAR E EQUIPAR') + (L.length > 1 ? ' (' + L.length + ' PEÇAS)?' : '?')));
    const ul = nodo('ul', 'tpe-compra-lista');
    for (const x of L){
      const d2 = tpCopia(D);                             // a miniatura mostra só a peça (o resto liso)
      if (x.tipo === 'b' || x.tipo === 'f'){ d2.p = 'li'; d2.i = '--'; }
      else if (x.tipo === 'p'){ d2.i = '--'; d2.pp = [50, 50, 50, 0]; }
      else { d2.p = 'li'; d2.ip = [50, 50, 56, 0]; }
      const li = nodo('li'), cvs = tpMiniatura(d2, 64);
      const tipo = {b:'Borda', f:'Forma', p:'Padrão', i:'Ícone'}[x.tipo];
      li.append(cvs, nodo('span', null, tipo + ': ' + x.it.nome), (() => { const e = nodo('em'); e.innerHTML = x.pr.g ? '<i class="ic-gema"></i>' + x.pr.g : '<i class="ic-moeda"></i>' + fmtNum(x.pr.m); return e; })());
      ul.appendChild(li);
    }
    cx.appendChild(ul);
    const tot = nodo('p', 'pop-txt'); tot.innerHTML = 'Total: ' + (c.m ? '<i class="ic-moeda"></i> ' + fmtNum(c.m) + ' moedas' : '') + (c.m && c.g ? ' e ' : '') + (c.g ? '<i class="ic-gema"></i> ' + c.g + ' gemas' : '') + '. As peças ficam suas neste aparelho: dá para usar em outras tampinhas' + (ED.modo === 'E' ? ' e escudos.' : ' e no escudo do clube.');
    cx.appendChild(tot);
    const a = nodo('div', 'pop-acoes');
    if (tpPode(c)){
      const dep = nodo('p', 'pop-txt tpe-saldo'); dep.innerHTML = 'Saldo depois: <i class="ic-moeda"></i> ' + fmtNum(CONTA.moedas - c.m) + ' · <i class="ic-gema"></i> ' + fmtNum(CONTA.gemas - c.g);   // v70: o saldo de depois
      cx.appendChild(dep);
      a.append(botaoPop('AGORA NÃO', '', () => { som.clique(); fechaPop(); }), botaoPop(ED.modo === 'E' ? 'COMPRAR E USAR' : 'COMPRAR E EQUIPAR', 'verde', () => { if (!tpCompra(D)){ som.clique(); fechaPop(); return; } fechaPop(); tpeAplica(cod); }));
    }
    else {
      const fm = Math.max(0, c.m - CONTA.moedas), fg = Math.max(0, c.g - CONTA.gemas);
      cx.appendChild(nodo('p', 'pop-txt tpe-falta-din', 'Faltam ' + [fm ? fmtNum(fm) + ' moedas' : '', fg ? fg + ' gemas' : ''].filter(Boolean).join(' e ') + '. Jogue partidas e suba de nível, ou troque gemas por moedas na LOJA.'));
      a.append(botaoPop('VOLTAR', '', () => { som.clique(); fechaPop(); }), botaoPop('IR PARA A LOJA', 'verde', () => { som.clique(); fechaPop(); ED.manter = true; abreTela('loja', 'skins'); }));
    }
    cx.appendChild(a);
  });
}
function tpeAplica(cod){                                 // equipa a tampinha ou devolve o escudo para o clube
  if (ED.modo === 'E'){
    const alvo = ED.alvo; ED.ok = true;
    if (alvo && typeof alvo.ok === 'function'){ try { alvo.ok(cod); } catch (e) { console.error(e); } }
    fechaTela(); return;
  }
  if (cod === tpMinha()){ tpeApagaRascunho(); fechaTela(); return; }
  tpEquipa(cod); tpeApagaRascunho(); som.compra(); aviso('Tampinha equipada!');
  fechaTela();
}

/* ---------------------------------------------------------------- o nome e a raridade da sua tampinha no perfil e no lobby */
const tpSkinAntes69e = tpSkin;
tpSkin = function(cod){                                  // (o objeto ganha o nome do desenho e a raridade da peça mais rara)
  const s = tpSkinAntes69e(cod); if (!s || s.nomeFeito) return s;
  s.nomeFeito = true; s.nome = tpeNomeDe(s.desenho); s.r = {gratis:'inicial', comum:'comum', raro:'raro', epico:'epico', lendario:'lendario'}[tpeRaridade(s.desenho)] || 'inicial';
  return s;
};

/* ---------------------------------------------------------------- quem abre o editor */
const abreTelaAntes69 = abreTela;
abreTela = function(id, volta){                         // (a v67 mandava SKINS para o PERFIL: agora é o editor)
  if (id === 'skins' || id === 'botoes') return abreTelaAntes67('skins', volta);
  if (id === 'vestiario') id = 'loja';
  return abreTelaAntes69(id, volta);
};
if (PF.trocar){ PF.trocar.textContent = 'PERSONALIZAR'; PF.trocar.setAttribute('aria-label', 'Personalizar a sua tampinha'); }
LB.emblema.setAttribute('aria-label', 'Sua tampinha: personalizar');
