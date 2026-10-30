/* ======================================================================================================================
   RACHA v99 · OS CHUTES DO RACHÃO NAS SALAS PERSONALIZADAS — as telas e a sala neste aparelho (tools/v99/salas.js)
     1) o CRIAR SALA: no modo FUTEBOL, os três chutes (CAVADINHA, CURVA e SUPER CHUTE), cada um liga e desliga; nenhum
        ligado = só o chutar, como sempre. Na sala online, só quando o servidor tem os chutes (o hello dele diz cr: 1);
     2) a SALA: o sexto quadro das regras (CHUTES), que o admin troca nas setas como os outros; o nome dos chutes ligados na
        linha de baixo do nome da sala; na lista das salas, a etiqueta CHUTES;
     3) a SALA NESTE APARELHO com os chutes: a partida roda no motor das salas do servidor (window.RachaSalaLocal — os
        arquivos server/partida/fisica.js, bot.js e sala.js, colados pelo build), e o jogo entra nela como numa sala
        online: os comandos, a previsão, o quadro de 30 por segundo, o 3, 2, 1 e o resultado. O que se testa aqui é o que
        o servidor roda. O árbitro (você) pausa e encerra como sempre.
   Sem os chutes, nada aqui muda: o CRIAR SALA, a sala e a sala neste aparelho de sempre.
   ====================================================================================================================== */
const CR99S = {srv:false, criando:false, pend:null, letras:['', 'l', 'c', 's', 'lc', 'ls', 'cs', 'lcs']};
const CR99L = {p:null, round:0, contando:false, pausa:false, contT:0};
const CR99L_CONTAGEM = 3000;                            // o 3, 2, 1, JÁ! (o mesmo do servidor)
const cr99sLetras = o => CR99_N.crLetras(CR99_N.crOpcoes(o));

/* ---------------------------------------------------------------- o servidor tem os chutes? (o hello dele) */
const net49MessageAntes99 = net49Message;
net49Message = function(m){
  if (m && m.type === 'hello') CR99S.srv = m.cr === 1;
  return net49MessageAntes99.apply(this, arguments);
};

/* ---------------------------------------------------------------- 1) o CRIAR SALA */
try {
  const o = JSON.parse(localStorage.getItem('racha-sala-pref') || 'null'), ch = CR99_N.crOpcoes(o && o.chutes);
  SX.form.chutes = Object.assign({lob:false, curva:false, super:false}, ch || {});
  SL.pref.chutes = CR99_N.crLetras(ch);
} catch (_) { SX.form.chutes = {lob:false, curva:false, super:false}; }
const slPrefSalvaAntes99 = slPrefSalva;                  // (a escolha dos chutes fica guardada com as outras regras da sala)
slPrefSalva = function(r){
  const ch = r ? cr99sLetras(r.chutes) : CR99S.criando ? CR99_N.crLetras(CR99S.pend) : (SL.pref.chutes || '');
  const out = slPrefSalvaAntes99.apply(this, arguments);
  SL.pref.chutes = ch;
  try { localStorage.setItem('racha-sala-pref', JSON.stringify(Object.assign({}, SL.pref, {privada:SL.privada}))); } catch (_) {}
  return out;
};
const CR99S_OPS = [
  ['lob', 'cav', 'CAVADINHA', 'por cima de quem está na frente'],
  ['curva', 'cvd', 'CURVA', 'a bola entorta para o lado'],
  ['super', 'sup', 'SUPER CHUTE', 'segura, carrega e solta']
];
function cr99sPodeForm(F){                              // '' = pode · senão, o porquê (na nota embaixo dos três)
  if ((F.jogo || 'futebol') !== 'futebol') return 'Os chutes do Rachão são do modo Futebol (o Com Curva tem a curva dele).';
  if (F.onde === 'online' && !CR99S.srv) return 'Este servidor ainda não tem os chutes do Rachão: ele precisa ser atualizado.';
  if (F.onde !== 'online' && !window.RachaSalaLocal) return 'A sala neste aparelho não tem os chutes nesta versão.';
  return '';
}
function cr99sIcone(k, on){                             // o ícone do chute (o mesmo dos botões da partida)
  const c = document.createElement('canvas'); c.width = c.height = 80; c.setAttribute('aria-hidden', 'true');
  const g = c.getContext('2d'); g.translate(40, 46);
  cr99Icone(g, k, 86, on ? '#3b2a00' : '#05060c', 10); cr99Icone(g, k, 86, on ? '#fff6d6' : '#e8ecff', 5);
  return c;
}
const sxFormAntes99 = sxForm;
sxForm = function(){
  const box = sxFormAntes99.apply(this, arguments);
  try { cr99sForm(box); } catch (e) { console.error('v99 · o CRIAR SALA com os chutes:', e); }
  return box;
};
function cr99sForm(box){
  const F = SX.form, corpo = box.querySelector('.sx-form'); if (!corpo) return;
  if (!F.chutes) F.chutes = {lob:false, curva:false, super:false};
  const nota = corpo.querySelector(':scope > .sx-nota'), motivo = cr99sPodeForm(F), o = motivo ? null : CR99_N.crOpcoes(F.chutes);
  const rot = nodo('span', 'sx-rot v99-rot' + (motivo ? ' apagado' : ''));
  rot.append('CHUTES DO RACHÃO ', nodo('small', null, '(ligue quantos quiser)'));
  const grade = nodo('div', 'v99-chutes' + (motivo ? ' travado' : ''));
  grade.setAttribute('role', 'group'); grade.setAttribute('aria-label', 'Chutes do Rachão');
  for (const [k, ic, tt, sub] of CR99S_OPS){
    const on = !motivo && !!F.chutes[k];
    const b = sxBt('sx-op v99-op' + (on ? ' on' : ''), '<i class="v99-op-ic"></i><b>' + tt + '</b><small>' + sub + '</small>', () => { if (cr99sPodeForm(F)) return; F.chutes[k] = !F.chutes[k]; amigosRender(); }, tt + (on ? ': ligado' : ': desligado'));
    b.setAttribute('aria-pressed', String(on)); b.disabled = !!motivo;
    b.querySelector('.v99-op-ic').appendChild(cr99sIcone(ic, on));
    grade.appendChild(b);
  }
  const resumo = nodo('p', 'v99-resumo');
  if (motivo) resumo.textContent = motivo;
  else if (!o) resumo.append(nodo('b', null, 'Só o chutar. '), 'Nada ligado: o PASSE e o CHUTE de sempre.');
  else resumo.append(nodo('b', null, cr99Texto(o) + '. '), 'Os botões aparecem na partida, perto do PASSE e do CHUTE.');
  corpo.insertBefore(rot, nota || null); corpo.insertBefore(grade, nota || null); corpo.insertBefore(resumo, nota || null);
}
const sxCriarAntes99 = sxCriar;
sxCriar = function(){
  const F = SX.form;
  CR99S.criando = true; CR99S.pend = cr99sPodeForm(F) ? null : CR99_N.crOpcoes(F.chutes);
  try { return sxCriarAntes99.apply(this, arguments); } finally { CR99S.criando = false; CR99S.pend = null; }
};
const net49SendAntes99s = net49Send;                    // (a sala online nasce com os chutes escolhidos)
net49Send = function(m){
  if (m && m.type === 'create' && CR99S.criando && CR99S.pend && !m.mapa && !m.mapaDados && !m.rachao) m = Object.assign({}, m, {chutes:CR99S.pend});
  return net49SendAntes99s.call(this, m);
};
const slocCriaAntes99 = slocCria;                       // (e a sala neste aparelho também)
slocCria = function(o){
  const r = slocCriaAntes99.apply(this, arguments);
  try {
    const ch = CR99S.criando ? CR99S.pend : CR99_N.crOpcoes(o && o.chutes);
    if (SLOC.room && ch && SLOC.room.jogo === 'futebol' && window.RachaSalaLocal){ SLOC.room.chutes = ch; slocSala(); }
  } catch (e) { console.error('v99 · a sala neste aparelho com os chutes:', e); }
  return r;
};

/* ---------------------------------------------------------------- 2) a sala: o quadro CHUTES, a linha do nome e a lista */
SLI.chutes = '<svg viewBox="0 0 96 72"><path d="M10 62Q42-2 74 40" fill="none" stroke="#141a33" stroke-width="9" stroke-linecap="round"/><path d="M10 62Q42-2 74 40" fill="none" stroke="#ffd23f" stroke-width="4.2" stroke-linecap="round" stroke-dasharray="7 6"/><rect x="35" y="40" width="17" height="27" rx="7" fill="#3b8dff" stroke="#141a33" stroke-width="4"/><circle cx="43.5" cy="34" r="7.2" fill="#ffcf9e" stroke="#141a33" stroke-width="3.6"/><circle cx="75" cy="47" r="13.5" fill="#fff" stroke="#141a33" stroke-width="4.4"/><path d="M75 40.2l6.4 4.7-2.5 7.6h-7.8l-2.5-7.6z" fill="#141a33"/><path d="M84 18l-6 11h6l-5 10" fill="none" stroke="#141a33" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M84 18l-6 11h6l-5 10" fill="none" stroke="#ff7a2f" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
function cr99sMostraSala(r){                            // o quadro CHUTES aparece na sala de futebol de sempre (não no mapa, na ranqueada nem na oficial)
  if (!r || (r.jogo || 'futebol') !== 'futebol' || r.mapa || r.ranked || r.oficial || r.rachao) return false;
  return r.local ? !!window.RachaSalaLocal : CR99S.srv;
}
SL_OPS.push({k:'chutes', cap:'CHUTES', ic:'chutes', vals:() => CR99S.letras, txt:v => cr99Curto(v), trava:r => !cr99sMostraSala(r)});
const slOpAntes99 = slOp;
slOp = function(k, d){
  if (k !== 'chutes') return slOpAntes99.apply(this, arguments);
  const r = NET49.room; if (!r || !slDono(r) || r.oficial || r.state === 'playing' || !cr99sMostraSala(r)) return;
  const vals = CR99S.letras, i = Math.max(0, vals.indexOf(cr99sLetras(r.chutes))), v = vals[(i + d + vals.length) % vals.length];
  som.clique(); net49Send({type:'config', chutes:v});
  SL.pref.chutes = v; slPrefSalva();
};
const slRenderAntes99 = slRender;
slRender = function(){
  const out = slRenderAntes99.apply(this, arguments);
  try { cr99sSalaPinta(); } catch (e) { console.error('v99 · a sala com os chutes:', e); }
  return out;
};
function cr99sSalaPinta(){
  const el = SL.el, r = NET49.room; if (!el || el.hidden || !r) return;
  const ops = document.getElementById('sl-ops'); if (!ops) return;
  const mostra = cr99sMostraSala(r), d = ops.querySelector('.sl-op[data-k="chutes"]');
  if (d && !mostra) d.remove();
  if (ops.classList.contains('v99-6') !== mostra){
    ops.classList.toggle('v99-6', mostra);
    for (const b of ops.querySelectorAll('.sl-op b')){ b.style.fontSize = ''; let fs = 27; while (b.scrollWidth > b.clientWidth + 1 && fs > 15){ fs--; b.style.fontSize = fs + 'px'; } }
  }
  if (d && mostra) d.title = cr99Texto(r.chutes);
  const sub = document.getElementById('sl-sub'), o = CR99_N.crOpcoes(r.chutes);
  if (sub && o && mostra) sub.textContent += ' · ' + cr99Texto(o);
}
const sxLinhaAntes99 = sxLinha;
sxLinha = function(s){
  const d = sxLinhaAntes99.apply(this, arguments);
  try {
    const o = s && CR99_N.crOpcoes(s.chutes), nm = o && d && d.querySelector('.sx-nm');
    if (nm){ const t = nodo('i', 'v99-tag', 'CHUTES'); t.title = cr99Texto(o); nm.appendChild(t); d.setAttribute('aria-label', (d.getAttribute('aria-label') || '') + ' · ' + cr99Texto(o)); }
  } catch (_) {}
  return d;
};

/* ---------------------------------------------------------------- 3) a sala neste aparelho com os chutes: o motor das salas aqui */
function cr99lLimpa(r){ if (r) for (const k of ['servidor', 'nucleo', 'fisica', 'quadros', 'motor', 'motorRodada']) delete r[k]; }
function cr99lPara(){                                   // (desliga o motor da partida daqui, se tem um)
  clearTimeout(CR99L.contT); CR99L.contando = false;
  const p = CR99L.p; CR99L.p = null;
  if (p){ try { p.aborta(); } catch (_) {} try { p.desligar(); } catch (_) {} }
}
function cr99lComeca(r){
  const motivo = slMotivo(r); if (motivo) return slocEnvia({type:'error', message:motivo});
  cr99lPara();
  const perfil = (typeof V92 !== 'undefined' && V92.cfg && V92.cfg.fisica) || V92_NUC.PERFIL_V92, round = r.round + 1;
  const jogadores = [];
  for (let i = 0; i < 2*r.n; i++){                      // (você no seu lugar; os bots da sala com o nome deles; a vaga vira bot)
    const id = r.roster[i], m = id ? r.members.find(x => x.id === id) : null;
    jogadores.push(m && !m.bot ? {netId:m.id, nome:m.name} : {netId:null, nome:m ? m.name : 'Bot', bot:'dificil'});
  }
  let p = null;
  try {
    p = new window.RachaSalaLocal.PartidaSala({n:r.n, jogo:'futebol', map:r.map, tempo:r.tempo, regra:'', ranked:false, jogadores,
      fisica:perfil, fisicaBase:V92_NUC.PERFIL_V92, quadros:30, motor:'v93', chutes:r.chutes,
      agora:() => Date.now(), log:() => {}, suspeito:() => {},
      onSnapshot:data => { if (CR99L.p === p) slocEnvia({type:'snapshot', round, data}); },
      onGol:() => {}, onAviso:t => slocSys(t), onFim:res => cr99lFim(p, round, res)});
  } catch (e) {
    console.error('v99 · o motor da sala neste aparelho:', e);
    return slocEnvia({type:'error', message:'Os chutes do Rachão não abriram neste aparelho. Troque para Só chutar e comece de novo.'});
  }
  r.state = 'playing'; r.round = round;
  for (const x of r.members){ x.ready = !!x.bot; x.rematch = false; }
  Object.assign(r, {servidor:true, nucleo:V92_NUC.VERSAO, fisica:perfil, quadros:30, motor:'v93', motorRodada:'v93'});   // (o jogo entra como numa sala online)
  CR99L.p = p; CR99L.round = round; CR99L.pausa = false; CR99L.contando = true;
  p.pausado = true;                                     // 3, 2, 1, JÁ!: o motor espera (como no servidor)
  slocEnvia({type:'start', room:slocCopia()});
  slocSala();
  slocEnvia({type:'snapshot', round, data:p.quadro()});
  slocEnvia({type:'contagem', round, ms:CR99L_CONTAGEM});
  CR99L.contT = setTimeout(() => { if (CR99L.p !== p) return; CR99L.contando = false; p.soltaFilas(); p.pausado = CR99L.pausa; }, CR99L_CONTAGEM);
  p.ligar();
}
function cr99lFim(p, round, res){                       // o motor acabou a partida: o resultado (como o do servidor)
  if (CR99L.p !== p) return;
  cr99lPara();
  const r = SLOC.room; if (!r || r.round !== round || r.state !== 'playing') return;
  r.state = 'ended'; cr99lLimpa(r);
  const s = Array.isArray(res && res.placar) ? res.placar.slice(0, 2).map(v => Math.max(0, v | 0)) : [0, 0];
  slocEnvia({type:'result', round, score:s, winner:s[0] > s[1] ? 0 : s[1] > s[0] ? 1 : -1});
  slocSala();
}
function cr99lPausa(on){
  const p = CR99L.p; if (!p) return;
  CR99L.pausa = on; p.pausado = on || CR99L.contando;
  slocEnvia({type:'pause', paused:on, local:true});
}
const slocRecebeAntes99 = slocRecebe;
slocRecebe = function(m){
  const r = SLOC.room;
  if (r && m){
    const host = r.host === SLOC.eu;
    if (m.type === 'input'){ if (CR99L.p && CR99L.round === r.round && r.state === 'playing') CR99L.p.entrada(SLOC.eu, m); return; }
    if (m.type === 'config' && host && r.state !== 'playing'){
      if ('chutes' in m) r.chutes = window.RachaSalaLocal ? CR99_N.crOpcoes(m.chutes) : null;
      const jogo = typeof m.jogo === 'string' && SL_MODO[m.jogo] ? m.jogo : r.jogo;   // (o modo que a sala vai ter)
      if ((jogo || 'futebol') !== 'futebol') r.chutes = null;
    }
    if ((m.type === 'start' || m.type === 'rematch') && host && r.state !== 'playing' && r.chutes && (r.jogo || 'futebol') === 'futebol' && window.RachaSalaLocal) return cr99lComeca(r);
    if (m.type === 'leave') cr99lPara();
  }
  return slocRecebeAntes99.apply(this, arguments);
};
const slocFechaAntes99 = slocFecha;
slocFecha = function(){ cr99lPara(); return slocFechaAntes99.apply(this, arguments); };
// o árbitro (você) na sala daqui com os chutes: a pausa e o encerrar vão para o motor daqui (a partida "do servidor" é a deste aparelho)
const cr99lArb = () => { const r = NET49.room; return !!(CR99L.p && r && r.local && NET49.playing && arbEuPrincipal(r)); };
const arbPausaAntes99 = arbPausa;
arbPausa = function(on, quem){
  if (!cr99lArb()) return arbPausaAntes99.apply(this, arguments);
  if (RQ.estado === 'fim' || ARB.pausado === !!on) return;
  ARB.pausado = ARB.pausaVista = !!on;
  cr99lPausa(!!on);
  acc = 0; last = performance.now(); limparEntrada(); arbFaixa(); som.apito('curto');
  if (quem) x49Toast(quem + (on ? ' pediu a pausa: partida pausada.' : ' pediu para voltar: valendo!'));
};
const arbEncerraAntes99 = arbEncerra;
arbEncerra = function(quem){
  if (!cr99lArb()) return arbEncerraAntes99.apply(this, arguments);
  const r = NET49.room; if (RQ.estado === 'fim') return;
  ARB.encerrada = r.round;
  if (ARB.pausado){ ARB.pausado = ARB.pausaVista = false; cr99lPausa(false); }
  try { CR99L.p.encerraJa(); } catch (_) {}
  rqAvisa('ENCERRADA PELO ÁRBITRO', '#ffd23f'); arbFaixa();
  if (quem) x49Toast(quem + ' encerrou a partida.');
};
// (o aviso da pausa: na sala daqui quem pausa é você — não "o anfitrião")
const net49MessageAntes99b = net49Message;
net49Message = function(m){
  if (m && m.type === 'pause' && m.local === true){ NET49.paused = !!m.paused; NET49.pending = []; return; }
  return net49MessageAntes99b.apply(this, arguments);
};

window.RachaSalas99 = {                                 // (os testes olham por aqui)
  estado: () => ({srv:CR99S.srv, form:Object.assign({}, SX.form.chutes), local:!!CR99L.p, round:CR99L.round, contando:CR99L.contando, pausa:CR99L.pausa,
    tick:CR99L.p ? CR99L.p.tick : -1, sala:SLOC.room ? {chutes:SLOC.room.chutes || null, state:SLOC.room.state, servidor:!!SLOC.room.servidor} : null}),
  partida: () => CR99L.p, motivo: cr99sPodeForm
};
