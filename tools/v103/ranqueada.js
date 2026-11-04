/* ======================================================================================================================
   RACHA v103 · A RANQUEADA E O RANKING FUNCIONANDO (o pedido: "deixe a ranqueada e o ranking funcional")
   O que travava: desde a revisão de segurança (v100), só vale na conta o resultado que o SERVIDOR simulou — e, quando
   ninguém aparecia na busca (o normal com pouca gente online), a ranqueada ia contra os bots NO APARELHO: a partida não valia
   pontos, nem XP, nem moedas, e o ranking da temporada ficava vazio. Agora:
     · ninguém apareceu em 20 s (ou o JOGAR CONTRA BOTS AGORA): a partida contra os bots roda NO SERVIDOR (server/turma.js:
       filaBots; o mesmo motor das salas) — o resultado vem com o selo e vale pontos de patente com o teto do dia contra os
       bots (app/api/racha/jogoRouter.ts), XP e moedas, como as outras partidas online;
     · sem servidor (ou sem internet), continua a partida no aparelho, e a busca diz que ela não vale pontos na conta;
     · o RANKING abre em PONTOS RANQUEADOS (a patente de todo mundo que joga a ranqueada); GOLS, ASSISTÊNCIAS e CRAQUE DO JOGO
       continuam só com as partidas contra gente (cada gol conferido pelo servidor), e a tela diz isso.
   O servidor antigo (sem o fila_bots) responde nada: em 6 s a partida vai para o aparelho, como antes.
   ====================================================================================================================== */
const V103R = {ate:6000};
if (typeof v79Bots === 'function'){
  const v79BotsAntes103 = v79Bots;
  v79Bots = function(motivo){
    const B = V79R.busca;
    const pode = B && B.fase === 'fila' && !B.nada103 && (motivo === 'ninguem' || motivo === 'escolheu') && NET49.ws && NET49.ws.readyState === 1 && NET49.id;
    if (!pode) return v79BotsAntes103.apply(this, arguments);
    B.fase = 'bots_srv'; B.ate = performance.now() + V103R.ate; B.motivo103 = motivo;
    net49Send({type:'fila_bots'});                        // (o servidor monta a ranqueada com os bots e manda o start)
    try { v79BuscaPinta(); } catch (_) {}
  };
  if (typeof v79BuscaTique === 'function'){
    const v79BuscaTiqueAntes103 = v79BuscaTique;
    v79BuscaTique = function(){
      const B = V79R.busca;
      if (B && B.fase === 'bots_srv'){
        const caiu = !NET49.ws || NET49.ws.readyState > 1;
        if (!lobby.aberto){ v79BuscaCancela(); return; }
        if (caiu || performance.now() > B.ate){ B.fase = 'local'; return v79BotsAntes103(B.motivo103 || 'ninguem'); }   // (o servidor não respondeu: no aparelho, como antes)
        try { v79BuscaPinta(); } catch (_) {}
        return;
      }
      return v79BuscaTiqueAntes103.apply(this, arguments);
    };
  }
}
if (typeof v79BuscaPinta === 'function'){
  const v79BuscaPintaAntes103 = v79BuscaPinta;
  v79BuscaPinta = function(){
    const out = v79BuscaPintaAntes103.apply(this, arguments);
    try {
      const B = V79R.busca, el = V79R.el; if (!B || !el) return out;
      const st = el.querySelector('.v79-busca-st'), h = el.querySelector('.v79-busca-tit'), bts = el.querySelector('.v79-busca-bots');
      const resta = Math.max(0, Math.ceil((B.t0 + B.espera - performance.now())/1000));
      let tx = null;
      if (B.fase === 'fila') tx = 'Procurando jogadores do seu tamanho de time' + (B.gente > 1 ? ' (' + B.gente + ' pessoas no servidor)' : '') + '. Se ninguém aparecer em ' + resta + ' s, você joga contra bots no servidor — vale pontos na conta.';
      else if (B.fase === 'bots_srv'){ tx = 'Montando a partida contra os bots no servidor (vale pontos na conta)…'; if (h.textContent !== 'CONTRA BOTS') h.textContent = 'CONTRA BOTS'; }
      else if (B.fase === 'sem') tx = (window.RACHA_SEM_REDE ? 'Esta versão não tem o servidor das partidas online' : 'Sem servidor online aqui') + ': a partida é contra bots, só neste aparelho (não vale pontos na conta).';
      if (tx != null && st.textContent !== tx) st.textContent = tx;
      if (bts) bts.disabled = B.fase === 'bots_srv';
    } catch (_) {}
    return out;
  };
}

// (o servidor antigo manda fila_nada: ele não monta a partida com os bots — vai para o aparelho na hora, como antes)
// e o começo da ranqueada contra os bots no servidor: por quê (ninguém apareceu ou você escolheu), para a faixa do começo
if (typeof net49Message === 'function'){
  const net49MessageAntes103r = net49Message;
  net49Message = function(m){
    try {
      const B = V79R.busca;
      if (m && m.type === 'fila_nada' && B) B.nada103 = true;
      if (m && m.type === 'start' && m.room && m.room.ranked && B)
        V103R.motivo = B.fase === 'bots_srv' ? (B.motivo103 || '') : (performance.now() - B.t0 >= (B.espera || 20000) - 1500 ? 'ninguem' : '');
    } catch (_) {}
    return net49MessageAntes103r.apply(this, arguments);
  };
}
// a faixa do começo da ranqueada contra os bots no servidor (a mesma da partida contra os bots no aparelho)
function v103ContraBotsOnline(){
  const r = NET49.room; if (!NET49.playing || !r || !r.ranked || !Array.isArray(r.roster) || NET49.localSlot < 0) return false;
  const n = r.n | 0, meu = Math.floor(NET49.localSlot/n), outro = r.roster.slice((1 - meu)*n, (2 - meu)*n);
  return !outro.some(Boolean);
}
if (typeof net49Begin === 'function'){
  const net49BeginAntes103 = net49Begin;
  net49Begin = function(){
    const out = net49BeginAntes103.apply(this, arguments);
    try {
      if (v103ContraBotsOnline()){
        const t = V103R.motivo === 'ninguem' ? 'NINGUÉM ONLINE AGORA · RANQUEADA CONTRA BOTS' : 'RANQUEADA CONTRA BOTS · VALE PONTOS';
        rqAvisa(t, '#ffd23f'); setTimeout(() => { try { if (v103ContraBotsOnline() && RQ.aviso && RQ.aviso.txt !== t && RQ.estado === 'saida') rqAvisa(t, '#ffd23f'); } catch (_) {} }, 80);
      }
    } catch (_) {}
    V103R.motivo = '';
    return out;
  };
}

/* ---------------------------------------------------------------- o RANKING abre nos PONTOS RANQUEADOS */
try { if (typeof V90RK !== 'undefined' && V90RK.cat === 'assistencias') V90RK.cat = 'pontos'; } catch (_) {}
if (typeof v90Estado === 'function'){
  const v90EstadoAntes103 = v90Estado;
  v90Estado = function(el, tit, txt){                      // (o vazio dos gols e assistências: só contam as partidas contra gente)
    if (typeof txt === 'string' && /^Só contam as partidas ONLINE/.test(txt))
      txt = 'Só contam as partidas online contra gente com conta (o servidor confere cada gol). As partidas contra os bots contam nos PONTOS RANQUEADOS.';
    return v90EstadoAntes103.call(this, el, tit, txt);
  };
}
window.RachaRanqueada103 = {fase:() => V79R.busca && V79R.busca.fase};
