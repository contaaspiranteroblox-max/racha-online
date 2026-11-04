/* ======================================================================================================================
   RACHA v103 · AS SALAS PERSONALIZADAS SEM BOTS — o lado do jogo (tools/v103/salas.js)
   O pedido: "tire os bots das salas personalizadas e quando alguém sai fica com um a menos, não bote bot no lugar; crie uma
   função de poder pôr pessoas nas salas sem reiniciar a sala".
   O servidor (server/turma.js e server/partida/sala.js) não põe mais bot nas salas personalizadas: a vaga sem gente, e a de
   quem sai, cai ou vai para o banco, fica VAZIA — a tampinha sai do campo (o núcleo da física pula a vaga vazia, no servidor
   e na previsão deste aparelho) e o quadro diz quais estão vazias (Q.fora). Aqui:
     1) o QUADRO: as vagas vazias ficam marcadas (q.fora) na partida e no mundo da previsão; a tampinha que volta (o árbitro
        pôs alguém, ou quem caiu voltou) aparece direto no lugar dela, sem escorregar de longe;
     2) o que se desenha por cima: a setinha de quem está fora da tela e a câmera de quem assiste pulam a vaga vazia;
     3) a SALA: começa com pelo menos uma pessoa em cada time (o mesmo motivo do servidor); o quadro das regras sem os BOTS;
        o CRIAR SALA online sem a escolha dos bots (a sala NESTE APARELHO continua com os bots: é o treino com bots).
   A ranqueada continua com os bots completando os times.
   ====================================================================================================================== */
const v103SalaSrv = r => !!(r && r.servidor && !r.local && !r.ranked && !r.tournament && !r.custom && !r.rachao);   // (as do mapa da Oficina e as do Rachão têm as telas delas)

/* ---------------------------------------------------------------- 1) o quadro: as vagas vazias */
function v103MarcaFora(s){
  const fora = s && Array.isArray(s.fora) ? s.fora : null, volta = [];
  if (Array.isArray(RQ.jog)) for (let i = 0; i < RQ.jog.length; i++){
    const q = RQ.jog[i]; if (!q) continue;
    const f = !!(fora && fora.indexOf(i) >= 0);
    if (q.fora && !f) volta.push(i);
    q.fora = f;
  }
  const M = typeof V92N !== 'undefined' && V92N.M;
  if (M && Array.isArray(M.jog)) for (let i = 0; i < M.jog.length; i++){ const q = M.jog[i]; if (q) q.fora = !!(fora && fora.indexOf(i) >= 0); }
  return volta;
}
if (typeof net49Snapshot === 'function'){
  const net49SnapshotAntes103 = net49Snapshot;
  net49Snapshot = function(s){
    const volta = v103MarcaFora(s);
    const r = net49SnapshotAntes103.apply(this, arguments);
    for (const i of volta){                                // (a tampinha que voltou ao campo aparece no lugar dela, sem o deslize de longe)
      const q = RQ.jog[i]; if (!q) continue;
      q.ax = q.x; q.ay = q.y; q.ex = q.ey = 0;
      try { if (typeof V92N !== 'undefined' && V92N.ofJ && V92N.ofJ[i]) V92N.ofJ[i] = [0, 0]; } catch (_) {}
    }
    return r;
  };
}
const v103SemFora = () => Array.isArray(RQ.jog) && RQ.jog.some(q => q && q.fora);
function v103ComPresentes(fn, self, args){                 // (a lista de quem está no campo, só durante o desenho)
  if (!v103SemFora()) return fn.apply(self, args);
  const todos = RQ.jog; RQ.jog = todos.filter(q => !q.fora);
  try { return fn.apply(self, args); } finally { RQ.jog = todos; }
}

/* ---------------------------------------------------------------- 2) por cima: a setinha e a câmera de quem assiste */
if (typeof desenhaForaDaTela === 'function'){
  const desenhaForaDaTelaAntes103 = desenhaForaDaTela;
  desenhaForaDaTela = function(){ return v103ComPresentes(desenhaForaDaTelaAntes103, this, arguments); };
}
if (typeof especTroca === 'function'){
  const especTrocaAntes103 = especTroca;
  especTroca = function(){                                 // a câmera de quem assiste pula a vaga vazia
    let r = especTrocaAntes103.apply(this, arguments);
    for (let k = 0; k < 9 && ESPEC.alvo >= 0 && RQ.jog[ESPEC.alvo] && RQ.jog[ESPEC.alvo].fora; k++) r = especTrocaAntes103.apply(this, arguments);
    return r;
  };
}

/* ---------------------------------------------------------------- 3) a sala: o motivo, as regras e o CRIAR SALA */
if (typeof slMotivo === 'function'){
  const slMotivoAntes103 = slMotivo;
  slMotivo = function(r){                                  // (o mesmo do servidor: sem bots, cada time precisa de alguém)
    if (!r || r.bots || r.local || r.tournament || r.custom || r.rachao || r.oficial) return slMotivoAntes103.apply(this, arguments);
    if (!r.roster.some(Boolean)) return 'Ninguém está nos times. Toque no Time A ou no Time B para entrar.';
    if (!r.roster.slice(0, r.n).some(Boolean) || !r.roster.slice(r.n).some(Boolean)) return 'Cada time precisa de pelo menos uma pessoa. Chame a galera em CONVIDAR.';
    return '';
  };
}
function v103SalaArruma(){
  const r = NET49.room, el = SL.el; if (!el || el.hidden || !r) return;
  const ops = el.querySelector('#sl-ops');
  if (r.local){ if (ops) ops.classList.remove('v103-5'); return; }
  const b = el.querySelector('#sl-ops .sl-op[data-k="bots"]'); if (b) b.remove();          // (as salas online não têm bots)
  const mb = el.querySelector('.v70-sl-at.bots'); if (mb) mb.hidden = true;                // (o MONTAR COM BOTS da v70)
  if (!ops) return;
  // sem o quadro BOTS ficam 5 quadros: a grade de 5 (a dos 6 da v99 deixava os quadros estreitos e cortava "Futebol" e
  // "Só chutar") e o texto de cada um no maior tamanho que cabe
  ops.classList.toggle('v103-5', ops.querySelectorAll('.sl-op').length === 5);
  for (const v of ops.querySelectorAll('.sl-op b')){ v.style.fontSize = ''; let fs = 27; while (v.scrollWidth > v.clientWidth + 1 && fs > 15){ fs--; v.style.fontSize = fs + 'px'; } }
}
if (typeof slRender === 'function'){
  const slRenderAntes103 = slRender;
  slRender = function(){ const r = slRenderAntes103.apply(this, arguments); try { v103SalaArruma(); } catch (e) { console.error('v103 sala', e); } return r; };
}
if (typeof sxForm === 'function'){
  const sxFormAntes103 = sxForm;
  sxForm = function(){                                     // o CRIAR SALA: a escolha dos bots só na sala neste aparelho
    const box = sxFormAntes103.apply(this, arguments);
    try {
      if (box && SX.form.onde === 'online'){
        SX.form.bots = false;
        for (const s of box.querySelectorAll('.sx-grade2 > *')) if (/^\s*BOTS\b/.test(s.textContent || '')) s.hidden = true;
      }
    } catch (e) { console.error('v103 criar sala', e); }
    return box;
  };
}
window.RachaSalas103 = {fora:() => (RQ.jog || []).map((q, i) => q && q.fora ? i : -1).filter(i => i >= 0)};
