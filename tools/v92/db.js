/* ======================================================================================================================
   RACHA v92 · O DB (PASSE + CHUTE) NO APARELHO (tools/v92/db.js) — o relógio do toque, o DB por estados no treino e o medidor.
   O DB por estados é EXPERIMENTAL: só vale com dbModo 1 no perfil da física (o painel de testes liga; a versão oficial usa
   o perfil padrão, com dbModo 0, e nada aqui muda o jogo). A regra mora no núcleo (server/partida/nucleo.js: dbComando e
   dbTick), a mesma do servidor e da previsão do online. Aqui:
     1) O RELÓGIO DO TOQUE: o instante de cada toque no PASSE e no CHUTE (event.timeStamp do toque ou da tecla). Vai no
        comando como dt (o CHUTE menos o PASSE, em décimos de ms) — só desempata a ordem quando os dois caem no mesmo passo
        da física e alimenta o modo de comparação dbRelogio. E a VARREDURA da tela de toque (de quanto em quanto tempo ela
        lê o dedo), medida pelos eventos coalescidos do dedo no analógico: é ela que limita o que o relógio do toque enxerga.
     2) NO TREINO (e contra os bots): com dbModo 1, o PASSE/CHUTE do aparelho passa pela máquina do núcleo (um comando por
        passo, igual ao online) no lugar da amostraBotoes da v91 e do toque armado da v92.
     3) O MEDIDOR DO DB (só a versão de testes mostra): cada tentativa — PASSE e CHUTE, os passos entre eles, o intervalo
        entre os dedos pelo relógio do toque, o contexto (parada, andando, parede), o que a regra decidiu e, para comparar,
        o que a regra literal de 2–5 ms decidiria. Funciona com o DB atual (dbModo 0) e com o por estados.
   ====================================================================================================================== */
const V92D = {
  tP:-1e9, tC:-1e9,                                 // o relógio do toque: o último PASSE e o último CHUTE apertados (ms)
  b:null, seq:0, kc:0, pc:0, passo:0,               // a máquina do núcleo no treino (dbModo 1) e o passo da física
  toques:[], vs:[], vsFonte:'', ultMov:{},          // os últimos toques; os intervalos da varredura da tela de toque
  ev:[], tent:[], ultChutes:[],                     // os eventos da máquina, as tentativas montadas, os chutes (DB atual)
};
function v92DbNovo(){                                // (os contadores do treino começam do zero: o primeiro toque já conta)
  V92D.b = V92_NUC.novoBotao(); V92D.b.ev = V92D.ev; V92D.kc = V92D.pc = 0; V92D.b.kc = V92D.b.pc = 0;
}
v92DbNovo();
function v92DbLigado(){ return !!(V92_FIS && V92_FIS.DB_MODO === 1); }

/* ---------------------------------------------------------------- 1) o relógio do toque */
function v92DbToque(tipo, t, origem){
  const ts = Number.isFinite(t) && t > 0 ? t : performance.now();
  if (tipo === 'p') V92D.tP = ts; else V92D.tC = ts;
  V92D.toques.push({tipo, t:ts, origem:origem || '', passo:V92D.passo}); if (V92D.toques.length > 40) V92D.toques.shift();
}
function v92DbDt(){                                 // o CHUTE menos o PASSE (décimos de ms), se os dois foram apertados perto
  const d = V92D.tC - V92D.tP;
  return Math.abs(d) <= 100 ? Math.round(d*10) : undefined;
}
cv.addEventListener('pointerdown', e => {            // (antes do controle da v91; só lê o instante, não mexe em nada)
  try {
    if (editing || RP.ativo || lobby.aberto || PAUSA.aberta) return;
    const p = vpos(e), r = botaoPerto(p[0], p[1]);
    if (r === 'kick') v92DbToque('p', e.timeStamp, e.pointerType); else if (r === 'power') v92DbToque('c', e.timeStamp, e.pointerType);
  } catch (_) {}
}, {capture:true});
window.addEventListener('keydown', e => {
  if (e.repeat || lobby.aberto) return;
  if (e.code === 'Space' || e.code === 'KeyJ') v92DbToque('p', e.timeStamp, 'teclado');
  else if (e.code === 'KeyK' || e.code === 'KeyL') v92DbToque('c', e.timeStamp, 'teclado');
}, {capture:true});
cv.addEventListener('pointermove', e => {            // a varredura da tela de toque: os eventos coalescidos do dedo que anda
  if (e.pointerType !== 'touch' && e.pointerType !== 'pen') return;
  let ts = null;
  try { const co = typeof e.getCoalescedEvents === 'function' ? e.getCoalescedEvents() : null; if (co && co.length > 0){ ts = co.map(x => x.timeStamp); V92D.vsFonte = 'coalescidos'; } } catch (_) {}
  if (!ts){ ts = [e.timeStamp]; if (V92D.vsFonte !== 'coalescidos') V92D.vsFonte = 'eventos'; }
  let u = V92D.ultMov[e.pointerId];
  for (const t of ts){ if (u != null){ const d = t - u; if (d > 0.25 && d < 40) V92D.vs.push(d); } u = t; }
  V92D.ultMov[e.pointerId] = u;
  if (V92D.vs.length > 300) V92D.vs.splice(0, V92D.vs.length - 300);
}, {capture:true, passive:true});
function v92DbVarredura(){                           // a mediana dos intervalos: de quanto em quanto tempo a tela lê o dedo
  const a = V92D.vs.slice().sort((x, y) => x - y); if (a.length < 20) return null;
  return {ms:a[Math.floor(a.length/2)], n:a.length, fonte:V92D.vsFonte};
}

/* ---------------------------------------------------------------- 2) o DB por estados no treino (dbModo 1) */
function v92DbMundo(){ return {B, G:{WALL_SEGS, NET_SEGS, POSTS, POST_R, GL, GT, GR, GB}}; }
const v92DbAmostraAntes = amostraBotoes;
amostraBotoes = function(dt){
  V92D.passo++;
  if (!v92DbLigado() || (NET49.playing && NET49.localSlot < 0)) return v92DbAmostraAntes.apply(this, arguments);
  BOTAO.t += dt;
  const hp = kickSegurado(), hc = powerSegurado(), lp = BOTAO.kickL, lc = BOTAO.powerL;
  if (lp) V92D.kc++;
  if (lc) V92D.pc++;
  BOTAO.kickL = BOTAO.powerL = false;
  const cmd = {seq:++V92D.seq, button:hc || lc ? 3 : hp || lp ? 2 : 1, kc:V92D.kc, pc:V92D.pc, bh:(hp || lp ? 1 : 0) | (hc || lc ? 2 : 0)};
  if (lp || lc){ const d = v92DbDt(); if (d != null) cmd.dt = d; V92.med.toques++; }
  const b = V92D.b;
  V92_NUC.botaoComando(b, cmd, V92_FIS);
  BOTAO.novo = lp || lc;
  const t = V92_NUC.botaoTick(v92DbMundo(), V92_FIS, P, b, (q, forca) => doKick(forca >= FORCA_POWER));
  // o desenho de sempre: BOTAO.estado = o botão apertado; "livre" = o comando dele ainda vale (o ARMADO e a vibração usam)
  BOTAO.estado = b.estado; BOTAO.livre = b.estado === 3 ? !!b.cC : b.estado === 2 ? !!b.cP : true;
  if (t){ V92.med.chutes++; vibrarChute(t === 3); ARMADO.saiu = t === 3 ? 'power' : 'kick'; ARMADO.saiuT = performance.now(); }
};
const v92DbResetAntes = resetBotoes;
resetBotoes = function(){ v92DbNovo(); V92D.seq = 0; return v92DbResetAntes.apply(this, arguments); };
// (o DB atual no treino: os chutes que saíram, para o medidor montar o DB com eles)
const v92DbDoKickAntes = doKick;
doKick = function(power){
  const ok = v92DbDoKickAntes.apply(this, arguments);
  if (ok) v92DbChuteSaiu(power ? 3 : 2, V92D.passo, 'treino');
  return ok;
};

/* ---------------------------------------------------------------- 3) o medidor do DB (a versão de testes mostra) */
// uma tentativa: o primeiro chute (ou a anulação) e o que veio até 12 passos depois
function v92DbChuteSaiu(tipo, passo, onde){
  if (v92DbLigado() && onde === 'treino') return;   // (no DB por estados os eventos da máquina contam tudo)
  const t = {passo, tipo, dP:V92D.tP, dC:V92D.tC};
  V92D.ultChutes.push(t); if (V92D.ultChutes.length > 8) V92D.ultChutes.shift();
  const a = V92D.ultChutes[V92D.ultChutes.length - 2];
  if (tipo === 3 && a && a.tipo === 2 && passo - a.passo <= 8)
    v92DbTentativa({res:'DB', k:passo - a.passo, dt:Math.abs(V92D.tC - V92D.tP) <= 100 ? V92D.tC - V92D.tP : null, modo:'atual', onde});
  else if (tipo === 2) v92DbTentativa({res:'passe', modo:'atual', onde, pend:passo});
  else v92DbTentativa({res:'chute', modo:'atual', onde, dt:Math.abs(V92D.tC - V92D.tP) <= 100 ? V92D.tC - V92D.tP : null});
}
function v92DbTentativa(o){
  o.quando = performance.now();
  const T = V92D.tent, u = T[T.length - 1];
  if (o.res === 'DB' && u && u.res === 'passe' && o.quando - u.quando < 300) T.pop();   // (o PASSE que virou DB)
  T.push(o); if (T.length > 30) T.shift();
}
function v92DbEventos(ev, onde){                     // os eventos da máquina do núcleo (dbModo 1) viram tentativas
  if (!ev || !ev.length) return;
  for (const e of ev.splice(0, ev.length)){
    if (e.e === 'passe' || e.e === 'chute') v92DbTentativa({res:e.e, ctx:e.ctx, modo:'estados', onde, espera:e.espera});
    else if (e.e === 'DB') v92DbTentativa({res:'DB', k:e.k, dt:e.dt, ctx:e.ctx, modo:'estados', onde});
    else if (e.e === 'foraDaJanela' || e.e === 'protecao' || e.e === 'anulaMesmoPasso' || e.e === 'anulaPasse')
      v92DbTentativa({res:e.e, k:e.k, dt:e.dt, ctx:e.ctx, tipo:e.tipo, modo:'estados', onde});
  }
}
setInterval(() => { try { v92DbEventos(V92D.ev, 'treino'); if (typeof V92N !== 'undefined' && V92N.evs) v92DbEventos(V92N.evs, 'online'); } catch (_) {} }, 120);
// a regra literal (para comparar): o CHUTE até 2 ms depois do PASSE é anulado, de 2 a 5 ms completa, depois a bola já saiu
function v92DbLiteral(dt){ if (dt == null) return ''; if (dt < 0) return 'o CHUTE veio antes'; if (dt < 2) return 'anulado (< 2 ms)'; if (dt <= 5) return 'DB (2–5 ms)'; if (dt <= 7) return 'no limite (5–7 ms)'; return 'a bola já saiu (> 7 ms)'; }
const V92_DB_CTX = ['bola parada', 'bola andando', 'na parede'];
function v92DbTexto(t){
  const ms = v => v92Virgula((Math.round(v*10)/10).toFixed(1)) + ' ms';
  const dedos = t.dt != null ? ' · dedos ' + ms(t.dt) : '';
  const ctx = t.ctx != null ? ' · ' + V92_DB_CTX[t.ctx] : '';
  const passos = n => n + (n === 1 ? ' passo' : ' passos');
  switch (t.res){
    case 'DB': return ['DB ✓', 'CHUTE ' + passos(t.k) + ' depois do PASSE' + dedos + ctx];
    case 'passe': return ['PASSE', 'saiu sozinho' + ctx];
    case 'chute': return ['CHUTE', 'saiu sozinho' + dedos + ctx];
    case 'anulaMesmoPasso': return ['CHUTE anulado', 'no mesmo passo do PASSE (o PASSE tem a prioridade)' + dedos];
    case 'anulaPasse': return ['PASSE anulado', 'o CHUTE veio antes no mesmo passo' + dedos];
    case 'foraDaJanela': return ['CHUTE anulado', passos(t.k) + ' depois do PASSE: fora da janela' + dedos + ctx];
    case 'protecao': return [(t.tipo === 3 ? 'CHUTE' : 'PASSE') + ' anulado', 'a mesma bola, ' + passos(t.k) + ' depois' + dedos + ctx];
  }
  return [t.res, ''];
}
