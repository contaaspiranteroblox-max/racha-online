/* ======================================================================================================================
   RACHA v104 · O RANKING ABRE ONDE TEM GENTE (o pedido: "o ranking dos jogadores também não está funcionando")
   A v103 fez o RANKING abrir em PONTOS RANQUEADOS — que só tem quem jogou a RANQUEADA. Num servidor novo (as contas do zero) e
   com a turma jogando nas salas, essa aba vem vazia e o ranking parece quebrado, mesmo com os GOLS e as ASSISTÊNCIAS das salas
   (as partidas online contra gente com conta) já contando. Agora, ao abrir, se a aba de agora vier vazia o ranking procura,
   na ordem das abas, a primeira categoria com alguém e abre nela — a não ser que a pessoa tenha escolhido a aba.
   ====================================================================================================================== */
const V104RK = {procurou:false, escolheu:false};
document.addEventListener('click', e => { if (e.target && e.target.closest && e.target.closest('.rk90-aba')) V104RK.escolheu = true; }, true);
function v104RkProcura(){
  if (V104RK.procurou || V104RK.escolheu || typeof V90RK === 'undefined') return;
  const k = v90Chave(), pac = V90RK.dados[k], r = pac && pac.r;
  if (!r || !r.temporada || (r.lista && r.lista.length)) return;     // (ainda carregando, sem temporada, ou já tem gente: fica)
  V104RK.procurou = true;
  const temp = V90RK.temp, ordem = V90_CATS.map(c => c[0]).filter(c => c !== V90RK.cat);
  (async () => {
    for (const cat of ordem){
      if (V104RK.escolheu) return;
      const kk = (temp || 'vigente') + '|' + cat;
      let d = V90RK.dados[kk] && V90RK.dados[kk].r;
      if (!d){
        const inp = {categoria:cat}; if (temp) inp.temporada = temp;
        try { d = await v88Q('ranking.top', inp); V90RK.dados[kk] = {em:Date.now(), r:d}; } catch (_) { d = null; }
      }
      if (d && d.lista && d.lista.length){
        if (!V104RK.escolheu){ V90RK.cat = cat; try { v88Repinta('ranking'); } catch (_) {} }
        return;
      }
    }
  })();
}
if (typeof v90RkRender === 'function'){
  const v90RkRenderAntes104 = v90RkRender;
  v90RkRender = function(){
    const out = v90RkRenderAntes104.apply(this, arguments);
    try { v104RkProcura(); } catch (e) { console.error('v104 ranking', e); }
    return out;
  };
}
window.RachaRanking104 = {estado:() => Object.assign({}, V104RK)};
