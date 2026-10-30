/* ======================================================================================================================
   RACHA v99 · OS CHUTES DO RACHÃO NAS SALAS PERSONALIZADAS — no jogo (tools/v99/chutes.js; o estilo em app/public/game/v99.css)
   O pedido (29/10/2026): "crie um modo com cavadinha e curva igual do Rachão que dê pra jogar nas salas personalizadas; o
   cara pode escolher sem nada, com cavadinha e curva, e super chute". A física é a do núcleo (server/partida/nucleo.js, a
   parte v99: N.cr*), a mesma no servidor e na previsão deste aparelho. Aqui:
     1) os BOTÕES na tela — CAVADINHA, CURVA ESQUERDA, CURVA DIREITA e SUPER CHUTE — no HUD de sempre (aparecem só na sala
        que ligou cada um; o editor arrasta, os moldes e os layouts guardam) e as TECLAS (Q, Z, X e V; Ajustes › Controles
        › Teclado troca). A cavadinha e as curvas: um toque arma, outro desarma (o próximo chute sai assim). O super: segure
        para carregar e solte para chutar;
     2) o COMANDO de cada passo leva os toques (os contadores lb, ce e cd: um toque nunca se perde) e o super segurado (su);
     3) a PREVISÃO (v92) com os chutes: os toques, o super e o chute com a cavadinha e a curva, na ordem do servidor; o
        quadro do servidor traz a bola no alto (bz) e o estado de cada um (cr), e a previsão continua dali;
     4) o DESENHO: a bola no alto (a sombra fica no chão, a bola sobe e cresce), o fogo do super, o que cada um armou (o
        arco da cavadinha, a seta da curva) e a carga do super em volta da tampinha e no botão; os sons;
     5) o CARTÃO de como joga, nas três primeiras partidas com os chutes.
   Sem os chutes ligados na sala, nada aqui roda: o jogo, a ranqueada e as outras salas são os de sempre.
   ====================================================================================================================== */
const CR99_N = window.RachaNucleo;
const CR99_BTNS = ['cav', 'cve', 'cvd', 'sup'];
const CR99_DE = {cav:'lob', cve:'curva', cvd:'curva', sup:'super'};
const CR99 = {
  lb:0, ce:0, cd:0, sx:0, cu:0,                        // os toques deste aparelho nesta partida (só sobem; sx = o super cancelado) e o último lado da curva
  ackLb:0, ackCe:0, ackCd:0, ackSx:0, ack:false,       // os do último comando que o servidor já usou (a previsão conta a partir deles)
  suTecla:false, suToque:null, ptr:new Map(),          // o super segurado (tecla e dedo) e os dedos nos botões
  srv:{bz:null, cr:null, t:0}, CRsala:null,            // o último quadro do servidor (quem assiste e o desenho sem a previsão) · as medidas da sala
  outros:[],                                           // o estado de cada um (do quadro), para desenhar o que armaram
  vis:{z:0, fogo:0}, somT:{trave:0, quique:0, sup:0}, cartaoT:0, grupo:false, arrumou:false, erro:null
};
const cr99Op = () => { const r = NET49.room; return NET49.playing && r && r.chutes && (r.jogo || 'futebol') === 'futebol' ? r.chutes : null; };
const cr99Joga = () => !!cr99Op() && !NET49.host && NET49.localSlot >= 0;   // jogando (não só assistindo) numa sala com os chutes
const cr99Prev = () => { try { return typeof v92RedeAtiva === 'function' && v92RedeAtiva() && V92N.M && V92N.M.cr ? V92N.M : null; } catch (_) { return null; } };
function cr99Meu(){                                    // o seu estado (lob, curva, super): o da previsão (na hora) ou o do quadro
  const M = cr99Prev(); if (M){ const q = M.jog[V92N.slot]; if (q && q.cr) return q.cr; }
  return CR99.outros[NET49.localSlot] || null;
}
function cr99Texto(o){                                 // o nome da combinação (a sala, a lista, o quadro de regras)
  o = CR99_N.crOpcoes(o);
  if (!o) return 'Só o chutar';
  const L = [o.lob && 'cavadinha', o.curva && 'curva', o.super && 'super chute'].filter(Boolean);
  const t = L.length === 1 ? L[0] : L.slice(0, -1).join(', ') + ' e ' + L[L.length - 1];
  return t.charAt(0).toUpperCase() + t.slice(1);
}
function cr99Curto(o){                                 // (no quadro pequeno das regras da sala)
  o = CR99_N.crOpcoes(o);
  if (!o) return 'Só chutar';
  if (o.lob && o.curva && o.super) return 'Os três';
  const L = [o.lob && 'Cavadinha', o.curva && 'Curva', o.super && 'Super'].filter(Boolean);
  return L.length === 1 ? L[0] : L.join('+').replace('Cavadinha+', 'Cav+');
}
const cr99Tecla = id => { try { const c = (TECLA.acoes[id] || [])[0]; return c ? teclaNome(c) : ''; } catch (_) { return ''; } };

/* ---------------------------------------------------------------- 1) os botões no HUD */
const controleVisivelAntes99 = controleVisivel;
controleVisivel = function(k){
  if (CR99_DE[k]){ if (editing) return hudEditVisivel(k); const o = cr99Op(); return !!o && !!o[CR99_DE[k]] && cr99Joga(); }
  return controleVisivelAntes99.apply(this, arguments);
};
const hudEditVisivelAntes99 = hudEditVisivel;
hudEditVisivel = function(k){
  if (CR99_DE[k]){ if (HUDM.atual === 'ginga') return false; if (HUDM.todos) return true; const o = cr99Op(); return !!o && !!o[CR99_DE[k]]; }
  return hudEditVisivelAntes99.apply(this, arguments);
};
// encostar: os botões dos chutes contam junto com o PASSE, o CHUTE e o analógico (nunca com a CURVA do COM CURVA, que não
// aparece junto) — só os que aparecem (os da sala com os chutes, ou os quatro com "Mostrar todos" no editor): escondido, o
// ARRUMAR não mexe em ninguém por causa dele
const hudGruposAntes99 = hudGrupos;
hudGrupos = function(conj){
  const g = hudGruposAntes99.apply(this, arguments);
  if (conj === 'ginga') return g;
  const o = cr99Op(), ks = CR99.grupo || HUDM.todos ? CR99_BTNS : o ? CR99_BTNS.filter(k => o[CR99_DE[k]]) : [];
  return ks.length ? g.concat([['joy', 'kick', 'power'].concat(ks)]) : g;
};
try { for (const k of CR99_BTNS) if (HE_ORDEM.indexOf(k) < 0) HE_ORDEM.splice(Math.max(0, HE_ORDEM.indexOf('reset')), 0, k); } catch (_) {}
// os moldes: o lugar dos quatro em cada um (sem encostar no PASSE, no CHUTE e no analógico do molde; conferido no teste)
const CR99_MOLDES = {
  destro:  {cav:[1440, 215, 1],   cve:[1330, 700, 1],   cvd:[1500, 790, 1],   sup:[1560, 455, 1]},
  canhoto: {cav:[480, 215, 1],    cve:[420, 790, 1],    cvd:[590, 700, 1],    sup:[425, 520, 1]},
  polegar: {cav:[1505, 520, .85], cve:[1330, 650, .8],  cvd:[1360, 820, .78], sup:[1710, 385, .82]},
  compacto:{cav:[1560, 245, .78], cve:[1450, 720, .72], cvd:[1590, 805, .7],  sup:[1640, 478, .78]},
  grande:  {cav:[1395, 200, 1.05],cve:[1160, 690, 1],   cvd:[1360, 800, .95], sup:[1450, 470, 1.2]}
};
try { for (const id in CR99_MOLDES) if (HUD_MOLDES[id]) Object.assign(HUD_MOLDES[id].base, CR99_MOLDES[id]); } catch (_) {}
function cr99NoMolde(alvo, molde){                     // os quatro no lugar do molde (alvo: {cav:{x,y,s}, …})
  const M = CR99_MOLDES[molde] || CR99_MOLDES.destro;
  for (const k of CR99_BTNS){ const v = M[k], e = alvo[k]; if (e){ e.x = v[0]; e.y = v[1]; e.s = v[2]; } }
}
function cr99Arruma(){                                 // (afasta só os quatro de quem eles encostam; os outros botões não mexem)
  CR99.grupo = true;
  try { for (const k of CR99_BTNS) hudArruma('base', k); } catch (_) {} finally { CR99.grupo = false; }
}
// o HUD e os layouts guardados antes da v99 (sem os quatro): os quatro vão para o lugar do molde de cada um. Os layouts que
// chegam depois (da conta, de outro aparelho) passam pela mesma limpeza (heLimpaEstado)
try {
  const heLimpaEstadoAntes99 = heLimpaEstado;
  heLimpaEstado = function(o){
    const st = heLimpaEstadoAntes99.apply(this, arguments);
    try { if (!(o && o.base && o.base.cav)) cr99NoMolde(st.base, st.molde); } catch (_) {}
    return st;
  };
  let velho = false; try { const o = JSON.parse(localStorage.getItem(CHAVE) || 'null'); velho = !!(o && o.hud && !o.hud.cav); } catch (_) {}
  const S = HE.store, cru = heLe(HE_CHAVE_LAYOUTS), P0 = HUD_PADRAO.cav;
  let mudou = false;
  if (S && Array.isArray(S.lista)) for (const L of S.lista){   // (a lista já aberta pela v92, antes desta troca)
    const b = L.estado && L.estado.base; if (!b) continue;
    const c = cru && Array.isArray(cru.lista) ? cru.lista.find(x => x && x.id === L.id) : null;
    const antigo = c && !(c.estado && c.estado.base && c.estado.base.cav);                                     // guardado antes da v99
    const montado = velho && L.id === S.ativo && b.cav && b.cav.x === P0.x && b.cav.y === P0.y;                // montado agora com o HUD antigo
    if (antigo || montado){ cr99NoMolde(b, L.estado.molde); mudou = true; }
  }
  if (velho){                                          // o HUD deste aparelho: os quatro do layout em uso (ou do molde) e fora de cima dos botões dele
    const b = S && Array.isArray(S.lista) ? (heAtivo().estado || {}).base : null;
    if (b && b.cav) for (const k of CR99_BTNS){ const e = b[k]; if (e){ hud[k].x = e.x; hud[k].y = e.y; hud[k].s = e.s; } }
    else cr99NoMolde(hud, HUDM.molde);
    cr99Arruma();
    if (b) for (const k of CR99_BTNS) Object.assign(b[k] || (b[k] = {}), {x:hud[k].x, y:hud[k].y, s:hud[k].s});
    try { heSalvarBase(); } catch (_) {}
    mudou = true;
  }
  if (mudou && S) heGravaStore();
} catch (_) {}

// o desenho de cada botão (a imagem pronta, no jeito dos botões da v61: o disco neon, o aro de pixo e o ícone) + o estado
const CR99_COR = {
  cav:{cols:['rgba(146,112,214,.64)', 'rgba(104,78,168,.56)', 'rgba(36,22,66,.72)'], fill:'#f4efff', stroke:'rgba(22,12,42,.92)', pixo:'#f5c542', tam:25, txt:'CAVADINHA'},
  cve:{cols:['rgba(120,162,186,.62)', 'rgba(78,118,142,.55)', 'rgba(39,46,49,.70)'], fill:'#f6f4ef', stroke:'rgba(22,26,28,.92)', pixo:'#f5c542', tam:25, txt:'CURVA'},
  cvd:{cols:['rgba(120,162,186,.62)', 'rgba(78,118,142,.55)', 'rgba(39,46,49,.70)'], fill:'#f6f4ef', stroke:'rgba(22,26,28,.92)', pixo:'#f5c542', tam:25, txt:'CURVA'},
  sup:{cols:['rgba(230,82,40,.70)', 'rgba(180,48,22,.60)', 'rgba(70,14,6,.74)'], fill:'#fff3e6', stroke:'rgba(48,10,4,.92)', pixo:'#ffd23f', tam:30, txt:'SUPER'}
};
function cr99Icone(g, k, r, cor, lw){
  g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = cor; g.fillStyle = cor; g.lineWidth = lw;
  const s = r*.36, y = -r*.2;
  if (k === 'cav'){                                    // o arco por cima de quem está na frente
    g.beginPath(); g.moveTo(-s*1.05, y + s*.62); g.quadraticCurveTo(0, y - s*1.35, s*1.05, y + s*.62); g.stroke();
    g.beginPath(); g.moveTo(0, y + s*.68); g.lineTo(0, y + s*.05); g.stroke();             // (o adversário)
    g.beginPath(); g.arc(s*1.05, y + s*.62, lw*.95, 0, TAU); g.fill();                       // (a bola caindo)
  } else if (k === 'cve' || k === 'cvd'){              // a bola que sai e entorta para o lado
    const d = k === 'cve' ? -1 : 1;
    g.beginPath(); g.moveTo(0, y + s*.8); g.quadraticCurveTo(0, y - s*.55, d*s*.95, y - s*.72); g.stroke();
    if (typeof v61Seta === 'function') v61Seta(g, d*s*.55, y - s*.6, d*s*1.02, y - s*.73, lw, cor);
    g.beginPath(); g.arc(0, y + s*.85, lw*.95, 0, TAU); g.fill();
  } else {                                             // o raio do super
    g.beginPath(); g.moveTo(s*.25, y - s*1.05); g.lineTo(-s*.45, y + s*.12); g.lineTo(s*.05, y + s*.12); g.lineTo(-s*.25, y + s*1.05); g.lineTo(s*.5, y - s*.18); g.lineTo(0, y - s*.18); g.closePath();
    g.stroke(); g.fill();
  }
}
function cr99Corpo(g, k, r){
  const C = CR99_COR[k], cols = C.cols;
  g.fillStyle = 'rgba(0,0,0,.32)'; g.beginPath(); g.arc(5, 9, r, 0, TAU); g.fill();
  g.fillStyle = cols[0]; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill();
  g.lineWidth = 6; g.strokeStyle = cols[2]; g.stroke();
  g.fillStyle = cols[1]; g.beginPath(); g.arc(0, 0, r*.8, 0, TAU); g.fill();
  const gl = g.createLinearGradient(0, -r, 0, r);
  gl.addColorStop(0, 'rgba(255,255,255,.26)'); gl.addColorStop(.55, 'rgba(255,255,255,0)');
  g.fillStyle = gl; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill();
  g.lineCap = 'butt'; g.lineWidth = 4; g.strokeStyle = C.pixo;
  for (const [a0, a1] of [[-2.55, -1.75], [-1.45, -1.18], [.35, 1.05], [1.32, 1.5]]){ g.beginPath(); g.arc(0, 0, r - 3, a0, a1); g.stroke(); }
  cr99Icone(g, k, r, C.stroke, 13); cr99Icone(g, k, r, C.fill, 7);
  let size = C.tam; g.font = size + 'px ' + FONT;
  const w = g.measureText(C.txt).width; if (w > r*1.5) size *= r*1.5/w;
  txt(g, C.txt, 0, r*.42, size, C.fill, C.stroke, size*.16);
  if (k === 'cve' || k === 'cvd'){                     // (as duas CURVAS: a setinha do lado no nome — para qual lado a bola vai)
    g.font = size + 'px ' + FONT;
    const d = k === 'cve' ? -1 : 1, x0 = d*(Math.min(w, r*1.5)/2 + 6), y0 = r*.42;
    g.beginPath(); g.moveTo(x0 + d*10, y0); g.lineTo(x0, y0 - 7.5); g.lineTo(x0, y0 + 7.5); g.closePath();
    g.lineJoin = 'round'; g.lineWidth = 5; g.strokeStyle = C.stroke; g.stroke(); g.fillStyle = C.pixo; g.fill();
  }
}
function cr99Aceso(k, s){ return k === 'cav' ? s.lob : k === 'cve' ? s.curva === -1 : k === 'cvd' ? s.curva === 1 : s.segura; }
function cr99Botao(k){
  const e = hud[k], r = BASE[k].r, g = ctx, va = ctlVis[k] == null ? 1 : ctlVis[k];
  if (va <= .004) return;
  g.save(); g.globalAlpha = e.a*va; g.translate(e.x, e.y); g.scale(e.s, e.s);
  if (pressed(k) && e.fx !== false) g.scale(.92, .92);
  pintaHud(g, sprHud('v99|' + k + '|' + r, escHud(e.s), r + 8, r + 8, r + 12, r + 16, h => cr99Corpo(h, k, r)));
  const s = !editing && cr99Meu();
  if (s && cr99Aceso(k, s)){                           // armado: o aro aceso (o super: a carga enchendo do topo)
    const R = r + 12, t = performance.now(), mexe = e.fx !== false;
    g.lineCap = 'round'; g.lineWidth = 12; g.strokeStyle = 'rgba(10,6,24,.55)'; g.beginPath(); g.arc(0, 0, R, 0, TAU); g.stroke();
    if (k === 'sup'){
      const c = Math.min(1, s.cT/45), cheia = c >= 1;
      g.lineWidth = 9; g.strokeStyle = cheia ? '#ffe14d' : '#ff7a2f';
      if (cheia && mexe) g.globalAlpha *= .7 + .3*Math.sin(t/60);
      g.beginPath(); g.arc(0, 0, R, -Math.PI/2, -Math.PI/2 + TAU*Math.max(.03, c)); g.stroke();
    } else {
      g.lineWidth = 9; g.strokeStyle = k === 'cav' ? '#c9a8ff' : '#7fe8ff'; if (mexe) g.globalAlpha *= .75 + .25*Math.sin(t/110);
      g.beginPath(); g.arc(0, 0, R, 0, TAU); g.stroke();
    }
  }
  g.restore();
  if (s && k === 'sup' && s.segura && typeof v93Rotulo === 'function'){   // a carga em porcentagem (e o CHEIO · SOLTE), do lado livre
    const c = Math.min(1, s.cT/45);
    v93Rotulo(ctx, c >= 1 ? 'CHEIO · SOLTE!' : 'CARGA ' + Math.round(c*100) + '%', e.x, e.y, r*e.s, 24, c >= 1 ? '#ffe14d' : '#ffb27a', 'rgba(8,10,28,.84)');
  }
}
const drawControlsAntes99 = drawControls;
drawControls = function(dt){
  const r = drawControlsAntes99.apply(this, arguments);
  try { for (const k of CR99_BTNS) if (controleVisivel(k)) cr99Botao(k); } catch (e) { CR99.erro = String(e && e.stack || e); }
  return r;
};

/* ---------------------------------------------------------------- 2) o toque e as teclas */
function cr99BotaoPerto(x, y){
  const extra = (typeof V92 !== 'undefined' && V92.cfg && V92.cfg.areaToque) | 0;
  let best = null, bd = Infinity;
  for (const k of CR99_BTNS){
    if (!controleVisivel(k)) continue;
    const c = el(k); if (!hit(x, y, c, 10 + extra)) continue;
    const d = Math.hypot(x - c.x, y - c.y)/c.r; if (d < bd){ bd = d; best = k; }
  }
  return best;
}
function cr99Toca(k){                                   // um toque num botão (ou tecla): conta, soa e vibra
  if (k === 'cav') CR99.lb++; else if (k === 'cve'){ CR99.ce++; CR99.cu = -1; } else if (k === 'cvd'){ CR99.cd++; CR99.cu = 1; }
  try { som.clique(); } catch (_) {}
  try { if (navigator.vibrate && !(typeof CONTA !== 'undefined' && CONTA.vibrar === false)) navigator.vibrate(8); } catch (_) {}
}
const cr99Livre = () => !editing && !RP.ativo && !lobby.aberto && !PAUSA.aberta && !fimAberto() && cr99Joga();
cv.addEventListener('pointerdown', e => {              // (antes do controle de sempre: o toque num dos quatro não vira PASSE nem analógico)
  if (!cr99Livre()) return;
  const p = vpos(e), k = cr99BotaoPerto(p[0], p[1]); if (!k) return;
  const base = botaoPerto(p[0], p[1]);                 // (encostado no PASSE/CHUTE: vale o mais perto do centro, como entre eles)
  if (base){ const a = el(base), b = el(k); if (Math.hypot(p[0] - a.x, p[1] - a.y)/a.r < Math.hypot(p[0] - b.x, p[1] - b.y)/b.r) return; }
  e.stopImmediatePropagation(); e.preventDefault();
  try { cv.focus({preventScroll:true}); cv.setPointerCapture(e.pointerId); } catch (_) {}
  ptrs.set(e.pointerId, k); CR99.ptr.set(e.pointerId, k);
  if (k === 'sup') CR99.suToque = e.pointerId; else cr99Toca(k);
}, {capture:true});
function cr99Solta(e){                                // soltar o dedo chuta; o toque que o sistema cancelou não (como na CURVA): o sx avisa
  const k = CR99.ptr.get(e.pointerId); if (!k) return;
  CR99.ptr.delete(e.pointerId); ptrs.delete(e.pointerId);
  if (k === 'sup' && CR99.suToque === e.pointerId){ CR99.suToque = null; if (e.type !== 'pointerup' && !CR99.suTecla) CR99.sx++; }
}
['pointerup', 'pointercancel', 'lostpointercapture'].forEach(n => cv.addEventListener(n, cr99Solta));
function cr99Cancela(){                                // a janela perdeu o foco segurando o super: a carga cai e nada sai
  if (CR99.suTecla || CR99.suToque != null) CR99.sx++;
  CR99.suTecla = false; CR99.suToque = null;
}
window.addEventListener('blur', cr99Cancela);
document.addEventListener('visibilitychange', () => { if (document.hidden) cr99Cancela(); });
window.addEventListener('keydown', e => {
  if (e.repeat || e.ctrlKey || e.metaKey || e.altKey || !cr99Livre()) return;
  const t = e.target; if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;   // (o chat da sala: escreve normal)
  const tc = teclaCanon(e.code), o = cr99Op();
  if (tc === 'KeyQ' && o.lob) cr99Toca('cav');
  else if (tc === 'KeyZ' && o.curva) cr99Toca('cve');
  else if (tc === 'KeyX' && o.curva) cr99Toca('cvd');
  else if (tc === 'KeyV' && o.super) CR99.suTecla = true;
  else return;
  e.preventDefault(); e.stopImmediatePropagation();
}, {capture:true});
window.addEventListener('keyup', e => { if (teclaCanon(e.code) === 'KeyV') CR99.suTecla = false; }, {capture:true});

// as teclas novas (Q, Z, X e V) não tiram a tecla que o jogador já escolheu para outra ação (Ajustes › Controles › Teclado):
// a dele continua valendo em todo lugar (o treino, a ranqueada, as salas) e a ação nova fica sem tecla até ele escolher uma
(function(){
  let o = null; try { o = JSON.parse(localStorage.getItem(TECLA.chave) || 'null'); } catch (_) {}
  if (!o || typeof o !== 'object') return;
  const novas = CR99_BTNS.filter(id => !(Array.isArray(o[id]) && o[id].length)), usadas = new Set();
  if (!novas.length) return;
  for (const [id] of TECLAS_ACOES) if (novas.indexOf(id) < 0) for (const c of TECLA.acoes[id] || []) usadas.add(c);
  let mudou = false;
  for (const id of novas){ const l = TECLA.acoes[id] || [], f = l.filter(c => !usadas.has(c)); if (f.length !== l.length){ TECLA.acoes[id] = f; mudou = true; } }
  if (mudou) teclaMonta();
})();

/* ---------------------------------------------------------------- 3) o comando e a previsão */
const net49SendAntes99 = net49Send;
net49Send = function(m){                                 // (o comando de cada passo leva os toques e o super segurado)
  if (m && m.type === 'input' && cr99Joga()){ m.lb = CR99.lb; m.ce = CR99.ce; m.cd = CR99.cd; m.sx = CR99.sx; m.cu = CR99.cu; m.su = CR99.suTecla || CR99.suToque != null ? 1 : 0; }
  return net49SendAntes99.apply(this, arguments);
};
const v70HelloExtraAntes99 = v70HelloExtra;              // (o servidor só põe este aparelho nas salas com os chutes porque ele conhece)
v70HelloExtra = function(){ const o = v70HelloExtraAntes99.apply(this, arguments) || {}; o.cr = 1; return o; };

const v92RedeIniciaAntes99 = v92RedeInicia;
v92RedeInicia = function(room){
  const r = v92RedeIniciaAntes99.apply(this, arguments);
  CR99.lb = CR99.ce = CR99.cd = CR99.sx = CR99.cu = 0; CR99.ackLb = CR99.ackCe = CR99.ackCd = CR99.ackSx = 0; CR99.ack = false;
  CR99.suTecla = false; CR99.suToque = null; CR99.srv = {bz:null, cr:null, t:0}; CR99.outros = []; CR99.vis = {z:0, fogo:0};
  const M = V92N.M;
  if (V92N.on && M){
    M.cr = room && (room.jogo || 'futebol') === 'futebol' ? CR99_N.crOpcoes(room.chutes) : null;
    for (const q of M.jog) q.cr = M.cr ? CR99_N.crNovo() : null;
    CR99_N.crZeraBola(M.B); M.quique = 0; M.travessao = 0;
    if (M.cr && V92N.cb && !V92N.cb.cr99){              // (a bola passando por cima não é o toque da saída)
      const t0 = V92N.cb.toques;
      V92N.cb.toques = function(){ const M2 = V92N.M; if (M2 && M2.cr && CR99_N.crAlta(M2, V92N.C)) return; return t0.apply(this, arguments); };
      V92N.cb.cr99 = true;
    }
  }
  return r;
};
const v92PrevChutaAntes99 = v92PrevChuta;
v92PrevChuta = function(q, forca, carga){               // (o chute previsto com os chutes do Rachão: a carga do super, a cavadinha e a curva)
  const M = V92N.M; if (!M || !M.cr) return v92PrevChutaAntes99.apply(this, arguments);
  const tk = M.tick + 1;
  if (V92N.C.DB_MODO !== 1 && tk - V92N.ultChute < 2) return false;
  const ok = CR99_N.chute(M, V92N.C, q, forca, carga);
  if (ok) V92N.ultChute = tk;
  return ok;
};
const v92PrevPassoAntes99 = v92PrevPasso;
v92PrevPasso = function(cmd, efeitos){                  // (a ordem do servidor: o botão, os toques, o super, o PASSE/CHUTE e o passo)
  const M = V92N.M; if (!M || !M.cr) return v92PrevPassoAntes99.apply(this, arguments);
  const C = V92N.C, eu = M.jog[V92N.slot], vale = M.estado === 'saida' || M.estado === 'jogo';
  if (eu){
    if (vale){
      V92N.bt.ev = efeitos ? V92N.evs : null;
      V92_NUC.botaoComando(V92N.bt, cmd, C);
      CR99_N.crComando(eu.cr, cmd, M);
      eu.mx = cmd.x; eu.my = cmd.y;
      const cur = eu.cr ? eu.cr.curva : 0;
      if (CR99_N.crTick(M, C, eu, eu.cr, cmd.su === 1, vale, v92PrevChuta)){ v92ChuteFx(true, cmd.seq, efeitos); cr99SomChute(true, cur, efeitos); }
      const cur2 = eu.cr ? eu.cr.curva : 0;
      const t = V92_NUC.botaoTick(M, C, eu, V92N.bt, v92PrevChuta);
      V92N.bt.ev = null;
      if (t){ v92ChuteFx(t === 3, cmd.seq, efeitos); cr99SomChute(false, cur2, efeitos); if (efeitos && typeof v92DbChuteSaiu === 'function' && C.DB_MODO !== 1) v92DbChuteSaiu(t, cmd.seq, 'online'); }
    } else { eu.mx = eu.my = 0; CR99_N.crComando(eu.cr, cmd, M); CR99_N.crTick(M, C, eu, eu.cr, false, false, v92PrevChuta); }
  }
  const trv = M.travessao | 0, vAntes = Math.hypot(M.B.vx, M.B.vy);
  V92_NUC.passo(M, C, V92N.cb);
  M.tick++;
  if (efeitos){                                         // (os sons da bola no alto: só no passo de agora, não no replay da previsão)
    const agora = performance.now();
    if ((M.travessao | 0) > trv && agora - CR99.somT.trave > 250){ CR99.somT.trave = agora; try { som.trave(vAntes); } catch (_) {} }
    if (M.quique > 0 && agora - CR99.somT.quique > 160){ CR99.somT.quique = agora; try { som.toque(Math.min(1, M.quique/U(20))); } catch (_) {} }
  }
  M.quique = 0;
};
function cr99SomChute(sup, cur, efeitos){              // (por cima do som do chute: o fiu da curva e o do super)
  if (!efeitos || (!sup && !cur)) return;
  const agora = performance.now(); if (agora - CR99.somT.sup < 120) return; CR99.somT.sup = agora;
  try { som.curva(cur ? .6 : 1); } catch (_) {}
}
const v92BaseAntes99 = v92Base;
v92Base = function(s){                                   // (o quadro do servidor: a bola no alto e o estado de cada um)
  const r = v92BaseAntes99.apply(this, arguments);
  const M = V92N.M; if (!M || !M.cr) return r;
  const z = Array.isArray(s.bz) ? s.bz : null, B = M.B, num = v => typeof v === 'number' && isFinite(v) ? v : 0;
  if (z){ B.z = Math.max(0, num(z[0])); B.vz = num(z[1]); B.sp = num(z[2]); B.teto = Math.max(0, num(z[3])); B.fogo = Math.max(0, Math.min(60, z[4] | 0)); } else CR99_N.crZeraBola(B);
  if (Array.isArray(s.cr)) for (let i = 0; i < M.jog.length; i++){ const q = M.jog[i]; if (!q.cr) q.cr = CR99_N.crNovo(); CR99_N.crUnpack(q.cr, s.cr[i] | 0); }
  const eu = M.jog[V92N.slot];
  if (eu && eu.cr){ eu.cr.lbN = CR99.ack ? CR99.ackLb : -1; eu.cr.ceN = CR99.ack ? CR99.ackCe : -1; eu.cr.cdN = CR99.ack ? CR99.ackCd : -1; eu.cr.sxN = CR99.ack ? CR99.ackSx : -1; eu.cr.cancela = false; }
  return r;
};
const net49SnapshotAntes99 = net49Snapshot;
net49Snapshot = function(s){                             // (antes da previsão: os contadores do último comando confirmado e o quadro para o desenho)
  try {
    if (s && cr99Op() && s.tick > NET49.lastTick){
      CR99.srv = {bz:Array.isArray(s.bz) ? s.bz : null, cr:Array.isArray(s.cr) ? s.cr : null, t:performance.now()};
      CR99.outros = (Array.isArray(s.cr) ? s.cr : []).slice(0, 16).map(n => { const o = CR99_N.crNovo(); CR99_N.crUnpack(o, n | 0); return o; });
      const pl = Array.isArray(s.players) ? s.players[NET49.localSlot] : null, ack = Array.isArray(pl) ? pl[4] | 0 : 0;
      if (typeof V92N !== 'undefined') for (const c of V92N.pend) if (c.seq <= ack){ CR99.ackLb = c.lb | 0; CR99.ackCe = c.ce | 0; CR99.ackCd = c.cd | 0; CR99.ackSx = c.sx | 0; CR99.ack = true; }
    }
  } catch (e) { CR99.erro = String(e && e.stack || e); }
  return net49SnapshotAntes99.apply(this, arguments);
};

/* ---------------------------------------------------------------- 4) o desenho: a bola no alto, o fogo e o que cada um armou */
const v92MostraAntes99 = v92Mostra;
v92Mostra = function(){
  const r = v92MostraAntes99.apply(this, arguments);
  try {
    const M = V92N.M;
    if (M && M.cr && V92.cfg.bolaPrev === 'eu'){        // a altura prevista + o pedaço do passo que ainda não andou (como a bola)
      const t = Math.max(0, Math.min(STEP, acc)), Bm = M.B, g = V92N.C.CR.G;
      CR99.vis.z = Bm.z > 0 || Bm.vz > 0 ? Math.max(0, Bm.z + Bm.vz*t - g*t*t/2) : 0;
      CR99.vis.fogo = Bm.fogo | 0;
    } else cr99VisDoQuadro();
  } catch (e) { CR99.erro = String(e && e.stack || e); }
  return r;
};
function cr99VisDoQuadro(){                             // (quem assiste, ou a bola do servidor): o último quadro andando no tempo
  const z = CR99.srv.bz, CRm = CR99.CRsala; if (!z || !CRm){ CR99.vis.z = 0; CR99.vis.fogo = 0; return; }
  const t = Math.min(.12, (performance.now() - CR99.srv.t)/1000), z0 = +z[0] || 0, vz = +z[1] || 0;
  CR99.vis.z = z0 > 0 || vz > 0 ? Math.max(0, z0 + vz*t - CRm.G*t*t/2) : 0;
  CR99.vis.fogo = z[4] | 0;
}
function cr99Desenha(){ return !!cr99Op() && !RP.ativo; }
const drawBallAntes99 = drawBall;
drawBall = function(g, x, y, r){
  if (g !== ctx || x !== VIS.bx || y !== VIS.by || !cr99Desenha()) return drawBallAntes99.apply(this, arguments);
  if (!cr99Prev()) cr99VisDoQuadro();
  const z = Math.min(R_JOG*8, CR99.vis.z), fogo = CR99.vis.fogo;
  if (fogo > 0) cr99Fogo(g, x, y - z*.85, r, fogo);
  if (z < .5) return drawBallAntes99.apply(this, arguments);
  const k = Math.min(1, z/(R_JOG*3));                     // a sombra fica no chão, menor e mais clara quanto mais alto
  g.save(); g.fillStyle = 'rgba(0,0,0,' + (0.3*(1 - .55*k)).toFixed(3) + ')';
  g.beginPath(); g.ellipse(x + 2 + z*.12, y + 4 + z*.06, r*(1 - .3*k), r*(.88 - .25*k), 0, 0, TAU); g.fill(); g.restore();
  return drawBallAntes99.call(this, g, x, y - z*.85, r*(1 + z/(R_JOG*7)));   // a bola sobe (para cima na tela) e cresce um pouco
};
function cr99Fogo(g, x, y, r, f){                       // o rastro de fogo do super (atrás da bola, de onde ela vem)
  const v = Math.hypot(B.vx, B.vy); if (v < 1) return;
  const ux = -B.vx/v, uy = -B.vy/v, a = Math.min(1, f/30), t = performance.now()/90;
  g.save(); g.globalCompositeOperation = 'lighter';
  for (let i = 5; i >= 1; i--){
    const d = i*r*.62, rr = r*(1.05 - i*.12)*(.9 + .1*Math.sin(t + i)), cx = x + ux*d, cy = y + uy*d;
    const gr = g.createRadialGradient(cx, cy, 0, cx, cy, rr*1.4);
    gr.addColorStop(0, 'rgba(255,240,170,' + (.55*a).toFixed(3) + ')'); gr.addColorStop(.45, 'rgba(255,140,40,' + (.4*a).toFixed(3) + ')'); gr.addColorStop(1, 'rgba(255,60,20,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, rr*1.4, 0, TAU); g.fill();
  }
  g.restore();
}
// o que cada um armou, em cima da tampinha: o arco da cavadinha, a seta da curva e a carga do super (o anel em volta)
function cr99Marca(g, x, y, r, s, eu){
  if (!s || (!s.lob && !s.curva && !s.segura)) return;
  const t = performance.now(), yy = y - r - 16;
  g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
  if (s.segura){
    const c = Math.min(1, s.cT/45);
    g.lineWidth = 6; g.strokeStyle = 'rgba(10,6,24,.5)'; g.beginPath(); g.arc(x, y, r + 9, 0, TAU); g.stroke();
    g.lineWidth = 5; g.strokeStyle = c >= 1 ? '#ffe14d' : '#ff7a2f'; if (c >= 1) g.globalAlpha = .7 + .3*Math.sin(t/60);
    g.beginPath(); g.arc(x, y, r + 9, -Math.PI/2, -Math.PI/2 + TAU*Math.max(.04, c)); g.stroke(); g.globalAlpha = 1;
  }
  const marcas = [];
  if (s.lob) marcas.push('cav');
  if (s.curva) marcas.push(s.curva < 0 ? 'cve' : 'cvd');
  marcas.forEach((k, i) => {
    const cx = x + (i - (marcas.length - 1)/2)*28, sc = eu ? 1 : .85;
    g.save(); g.translate(cx, yy); g.scale(sc, sc);
    g.fillStyle = 'rgba(8,10,28,.78)'; g.beginPath(); g.arc(0, 0, 13, 0, TAU); g.fill();
    g.lineWidth = 2.5; g.strokeStyle = k === 'cav' ? '#c9a8ff' : '#7fe8ff'; g.stroke();
    cr99Icone(g, k, 30, k === 'cav' ? '#e9ddff' : '#d7f7ff', 3.2);
    g.restore();
  });
  g.restore();
}
const desenhaRespingosAntes99 = desenhaRespingos;       // (o render chama logo depois da bola: o lugar das marcas)
desenhaRespingos = function(g){
  const r = desenhaRespingosAntes99.apply(this, arguments);
  try {
    if (g === ctx && cr99Desenha()){
      if (NET49.localSlot >= 0) cr99Marca(g, VIS.px, VIS.py, P.r, cr99Meu(), true);
      for (let i = 0; i < RQ.jog.length; i++){
        if (i === NET49.localSlot) continue;
        const q = RQ.jog[i]; if (!q || q === P) continue;
        cr99Marca(g, q.ax != null ? q.ax : q.x, q.ay != null ? q.ay : q.y, q.r || R_JOG, CR99.outros[i], false);
      }
    }
  } catch (e) { CR99.erro = String(e && e.stack || e); }
  return r;
};

/* ---------------------------------------------------------------- 5) o cartão de como joga (nas três primeiras partidas com os chutes) */
const CR99_CARTAO = 'racha-v99-cartao';
function cr99Cartao(){
  const o = cr99Op(); if (!o || !cr99Joga()) return;
  let vistos = 0; try { vistos = +localStorage.getItem(CR99_CARTAO) || 0; } catch (_) {}
  if (vistos >= 3) return;
  try { localStorage.setItem(CR99_CARTAO, String(vistos + 1)); } catch (_) {}
  const linhas = [];                                   // [ícone, nome, o texto, o texto curto (celular deitado), a tecla]
  if (o.lob) linhas.push(['cav', 'CAVADINHA', 'Toque para armar: o próximo chute sobe por cima de quem está na frente. O travessão segura a bola alta.', 'toque arma: o chute sobe por cima', cr99Tecla('cav')]);
  if (o.curva) linhas.push(['cvd', 'CURVA', 'Toque na seta do lado: o próximo chute sai entortando para lá. Outro toque desarma.', 'toque na seta: o chute entorta', [cr99Tecla('cve'), cr99Tecla('cvd')].filter(Boolean).join(' · ')]);
  if (o.super) linhas.push(['sup', 'SUPER CHUTE', 'Segure para carregar e solte com a bola no pé. Quanto mais carga, mais forte (e pega fogo).', 'segure e solte: forte, com fogo', cr99Tecla('sup') ? 'segure ' + cr99Tecla('sup') : '']);
  let el = document.getElementById('v99-cartao'); if (el) el.remove();
  el = document.createElement('div'); el.id = 'v99-cartao'; el.className = 'v99-cartao'; el.setAttribute('role', 'status');
  const tit = document.createElement('b'); tit.className = 'v99-cartao-tit'; tit.textContent = 'Chutes do Rachão nesta sala'; el.appendChild(tit);
  for (const [k, nome, tx, curto, tc] of linhas){
    const lin = document.createElement('div'); lin.className = 'v99-cartao-lin';
    const c = document.createElement('canvas'); c.width = c.height = 64; c.className = 'v99-cartao-ic'; c.setAttribute('aria-hidden', 'true');
    const g = c.getContext('2d'); g.translate(32, 36); cr99Icone(g, k, 70, '#1d1b16', 8); cr99Icone(g, k, 70, '#fff6df', 4);
    const sp = document.createElement('span'), b = document.createElement('b'); b.textContent = nome;
    sp.appendChild(b);
    if (tc){ const kb = document.createElement('kbd'); kb.textContent = tc; sp.appendChild(kb); }
    const lg = document.createElement('i'), ct = document.createElement('i'); lg.className = 'longo'; ct.className = 'curto';
    lg.textContent = ' ' + tx; ct.textContent = ' ' + curto; sp.append(lg, ct);
    lin.append(c, sp); el.appendChild(lin);
  }
  (document.getElementById('wrap') || document.body).appendChild(el);   // (na tela do jogo: a pausa, o fim e o lobby ficam por cima)
  cr99CartaoLugar(el);
  const muda = () => { if (!el.isConnected) return removeEventListener('resize', muda); cr99CartaoLugar(el); };   // (o celular girou)
  addEventListener('resize', muda);
  const sai = ms => { el.classList.add('sai'); setTimeout(() => el.remove(), ms); };
  clearTimeout(CR99.cartaoT); CR99.cartaoT = setTimeout(() => sai(600), 7500);
  el.addEventListener('pointerdown', () => { clearTimeout(CR99.cartaoT); sai(350); });
}
// o lugar do cartão: o maior vão livre embaixo da pausa e do placar, sem cobrir nenhum botão do HUD (os do molde, os do
// editor, o analógico); a largura muda a altura (o texto quebra), então mede de novo. Sem vão que preste, fica no meio (o CSS).
function cr99CartaoLugar(el){
  try {
    const css = HUDX.css || 1, r0 = cv.getBoundingClientRect(), w0 = (document.getElementById('wrap') || document.body).getBoundingClientRect();
    if (r0.width < 50) return;
    const topo = r0.top + (BTN_PAUSA.y + BTN_PAUSA.h + 14)*css, m = 12*css;
    const obst = (y0, y1) => {                           // os pedaços [x0, x1] ocupados entre y0 e y1 (px da tela)
      const l = [];
      for (const k of ORDEM_TOQUE.concat(['joy'])){
        const e = hud[k]; if (!e) continue;
        let vis = true; try { vis = controleVisivel(k); } catch (_) {}
        if (!vis) continue;
        const r = (k === 'joy' ? JOY.aro*(e.al || 1) + JOY.knob*(e.km || 1) : (BASE[k] ? BASE[k].r : 80))*(e.s || 1);
        l.push([r0.left + (e.x - r)*css - m, r0.left + (e.x + r)*css + m, r0.top + (e.y - r)*css - m, r0.top + (e.y + r)*css + m]);
      }
      return l.filter(o => o[3] > y0 && o[2] < y1).map(o => [o[0], o[1]]).sort((a, b) => a[0] - b[0]);
    };
    const vao = (y0, y1) => {                            // o maior vão horizontal livre nessa faixa
      let x = Math.max(r0.left, w0.left) + 8, melhor = [0, 0];
      for (const [a, b] of obst(y0, y1).concat([[Math.min(r0.right, w0.right) - 8, 1e9]])){ if (a - x > melhor[1] - melhor[0]) melhor = [x, a]; x = Math.max(x, b); }
      return melhor;
    };
    let alt = el.offsetHeight || 150, v = vao(topo, topo + alt);
    for (let i = 0; i < 3; i++){
      const larg = Math.min(620, v[1] - v[0]);
      if (larg < 240){ el.style.left = el.style.top = el.style.width = ''; return; }
      Object.assign(el.style, {left:((v[0] + v[1])/2 - w0.left) + 'px', top:(topo - w0.top) + 'px', width:larg + 'px'});
      const a2 = el.offsetHeight; if (a2 <= alt + 1 && i) break;
      alt = Math.max(alt, a2); v = vao(topo, topo + alt);
    }
    if (el.offsetHeight > r0.height*.36 && !el.classList.contains('curto')){ el.classList.add('curto'); cr99CartaoLugar(el); }   // (o vão é estreito: a dica curta)
  } catch (_) {}
}
// depois do 3, 2, 1: a contagem chega logo depois do começo (espera um instante por ela) e o cartão só aparece depois do JÁ!
function cr99CartaoDepois(ate, desde){
  clearTimeout(CR99.cartaoT);
  const agora = Date.now(); if (!desde) desde = agora;
  let contando = false;
  try { const c = typeof V93P !== 'undefined' ? V93P.contagem : null; contando = !!c && (c.espera || performance.now() < c.fim); } catch (_) {}
  if (agora < ate && (contando || agora - desde < 1200)){ CR99.cartaoT = setTimeout(() => cr99CartaoDepois(ate, desde), 200); return; }
  CR99.cartaoT = setTimeout(cr99Cartao, 400);
}
const net49BeginAntes99 = net49Begin;
net49Begin = function(room){
  const r = net49BeginAntes99.apply(this, arguments);
  try {
    const o = room && (room.jogo || 'futebol') === 'futebol' ? CR99_N.crOpcoes(room.chutes) : null;
    CR99.CRsala = o ? CR99_N.resolve(room.fisica || CR99_N.PERFIL_V92).CR : null;
    if (!o){ CR99.srv = {bz:null, cr:null, t:0}; CR99.outros = []; }
    if (o && NET49.localSlot >= 0){
      if (!CR99.arrumou){ CR99.arrumou = true; cr99Arruma(); }   // (a primeira vez que os quatro aparecem: saem de cima dos seus botões)
      cr99CartaoDepois(Date.now() + 9000);               // (depois do 3, 2, 1: o cartão não cobre a contagem)
    }
  } catch (e) { CR99.erro = String(e && e.stack || e); }
  return r;
};
const x49NetStopAntes99 = x49NetStop;
x49NetStop = function(){
  CR99.suTecla = false; CR99.suToque = null; CR99.ptr.clear(); clearTimeout(CR99.cartaoT);
  const el = document.getElementById('v99-cartao'); if (el) el.remove();
  return x49NetStopAntes99.apply(this, arguments);
};

window.RachaChutes99 = {                                // (os testes olham por aqui)
  estado: () => ({op:cr99Op(), joga:cr99Joga(), lb:CR99.lb, ce:CR99.ce, cd:CR99.cd, su:CR99.suTecla || CR99.suToque != null, meu:cr99Meu() && Object.assign({}, cr99Meu()),
    vis:Object.assign({}, CR99.vis), prev:!!cr99Prev(), bola:cr99Prev() ? Object.assign({}, V92N.M.B) : null, outros:CR99.outros.map(o => Object.assign({}, o)), erro:CR99.erro}),
  texto: cr99Texto, curto: cr99Curto, toca: cr99Toca, moldes: CR99_MOLDES, CR99
};
