/* ======================================================================================================================
   RACHA v95 · A ECONOMIA MELHOR (o pedido: "melhore a economia do jogo"). A partida rende mais e premia o que dá orgulho:
     · PARTIDA concluída +30 moedas (era 25) · VITÓRIA +70 (era 60) · cada GOL seu +12 (era 10) · cada ASSISTÊNCIA +6 (nova);
     · CRAQUE DA PARTIDA +40 (novo: a coroa da tela do fim);
     · VITÓRIAS SEGUIDAS: +10 por vitória a mais na sequência (2 seguidas +10, 3 seguidas +20… até +50);
     · 1ª VITÓRIA DO DIA: +150 moedas e +10 gemas (uma vez por dia);
     · cada NÍVEL novo +150 moedas e +8 gemas (era 100 e 5); a cada 5 níveis +30 gemas (era 25).
   Os números são os mesmos da plataforma (app/contracts/v88.ts · PREMIO): com a conta, quem paga é o servidor (com o teto do
   dia e sem pagar duas vezes) e a resposta traz o que cada parte rendeu; sem a conta (visitante, demonstração), é a carteira
   do aparelho. A tela do fim mostra a conta parte por parte ("O QUE VOCÊ GANHOU") e a LOJA › COMO GANHAR, a tabela nova.
   O treino contra os bots continua sem prêmio de partida (como era); os exercícios, as missões e o Top semanal, iguais.
   ====================================================================================================================== */
const V95E = {DIA:'racha-v95-1vit', ultimo:null};
const PREMIO95 = {assist:6, craque:40, seq:10, seqMax:50, primeira:{m:150, g:10}};
PREMIO.partida.m = 30; PREMIO.vitoria.m = 70; PREMIO.golPartida.m = 12;
PREMIO.nivel.m = 150; PREMIO.nivel.g = 8; PREMIO.nivel5.g = 30;

function v95PrimeiraHoje(){ try { return localStorage.getItem(V95E.DIA) !== String(diaId()); } catch (_) { return false; } }
function v95MarcaPrimeira(){ try { localStorage.setItem(V95E.DIA, String(diaId())); } catch (_) {} }
function v95EuCraque(R, online){                         // você foi o craque da partida? (a mesma conta da coroa da tela do fim)
  try {
    if (online){ const c = typeof EMF !== 'undefined' ? EMF.craque : null; return !!(c && c.k && c.k === NET49.id); }
    if (typeof v93Craque !== 'function' || typeof V93P === 'undefined' || !R) return false;
    const venc = R.placar[0] > R.placar[1] ? 0 : R.placar[1] > R.placar[0] ? 1 : -1;
    const c = v93Craque([...V93P.estat.values()], venc);
    return !!(c && c.k === 'eu');
  } catch (_) { return false; }
}
function v95Seguidas(R, online){                         // as vitórias seguidas, contando esta (fora do online o x49Record já contou)
  if (!R || !R.venceu) return 0;
  const s = typeof X49 !== 'undefined' ? X49.seq | 0 : 0;
  return online ? s + 1 : s;
}
const ecoPartidaAntes95 = ecoPartida;
ecoPartida = function(venceu){
  const r = ecoPartidaAntes95.apply(this, arguments);
  V95E.ultimo = null;
  try {
    if (!r || !r.p || (typeof v88Carteira === 'function' && v88Carteira())) return r;   // (com a conta, o servidor paga e manda o detalhe)
    const R = RQ.resultado, online = !!(typeof NET49 !== 'undefined' && NET49.playing);
    const det = [{rot:'Partida', m:PREMIO.partida.m}];
    if (venceu) det.push({rot:'Vitória', m:PREMIO.vitoria.m});
    const extra = {m:0, g:0, xp:0};
    const as = R ? Math.max(0, Math.min(10, R.assistH | 0)) : 0;
    if (as){ extra.m += as*PREMIO95.assist; det.push({rot:as === 1 ? '1 assistência' : as + ' assistências', m:as*PREMIO95.assist}); }
    if (v95EuCraque(R, online)){ extra.m += PREMIO95.craque; det.push({rot:'Craque da partida', m:PREMIO95.craque, cls:'craque'}); }
    const s = v95Seguidas(R, online);
    if (venceu && s >= 2){ const b = Math.min(PREMIO95.seqMax, (s - 1)*PREMIO95.seq); extra.m += b; det.push({rot:s + ' vitórias seguidas', m:b, cls:'seq'}); }
    if (venceu && v95PrimeiraHoje()){ extra.m += PREMIO95.primeira.m; extra.g += PREMIO95.primeira.g; det.push({rot:'1ª vitória do dia', m:PREMIO95.primeira.m, g:PREMIO95.primeira.g, cls:'dia'}); v95MarcaPrimeira(); }
    const gols = R ? Math.max(0, R.golsH | 0) : 0;
    if (gols) det.push({rot:(gols === 1 ? '1 gol' : gols + ' gols') + ' (na hora)', m:gols*PREMIO.golPartida.m, cls:'nota'});   // (já entraram no gol: não somam de novo)
    if (extra.m || extra.g){
      const sub = ganha(extra);
      r.p = {m:(r.p.m | 0) + extra.m, g:(r.p.g | 0) + extra.g, xp:r.p.xp | 0};
      r.subiu = (r.subiu || []).concat(sub);
    }
    V95E.ultimo = {R, det};
  } catch (e) { console.error('v95 economia', e); }
  return r;
};

/* ---------------------------------------------------------------- a tela do fim: O QUE VOCÊ GANHOU (parte por parte) */
function v95PremiosPinta(det, primeira){
  const pr = fimEl('fim-premio'); if (!pr || !pr.parentNode) return null;
  let box = document.getElementById('v95-premios');
  if (!det || !det.length){ if (box) box.remove(); return null; }
  if (!box){ box = nodo('div', 'v95-premios'); box.id = 'v95-premios'; }
  if (box.previousElementSibling !== pr) pr.after(box);
  box.textContent = '';
  box.appendChild(nodo('b', 'v95-pr-tit', 'O QUE VOCÊ GANHOU'));
  const ul = nodo('ul', 'v95-pr-l');
  for (const x of det){
    const li = nodo('li', 'v95-pr-i' + (x.cls ? ' ' + x.cls : ''));
    const v = nodo('em');
    if (x.m){ v.append(nodo('i', 'ic-moeda'), '+' + fmtNum(x.m)); }
    if (x.g){ if (x.m) v.append(' '); v.append(nodo('i', 'ic-gema'), '+' + fmtNum(x.g)); }
    li.append(nodo('span', null, x.rot), v);
    ul.appendChild(li);
  }
  box.appendChild(ul);
  return box;
}
const rqMostraFimAntes95e = rqMostraFim;
rqMostraFim = function(){
  const r = rqMostraFimAntes95e.apply(this, arguments);
  try {
    const U = V95E.ultimo;
    if (U && U.R === RQ.resultado && RQ.resultado && RQ.resultado.premio) v95PremiosPinta(U.det);
    else if (!(typeof v88Carteira === 'function' && v88Carteira())) v95PremiosPinta(null);
  } catch (e) { console.error('v95 prêmios', e); }
  return r;
};
if (typeof v88FimConta === 'function'){                   // com a conta: o detalhe que o servidor mandou (o que ele pagou de verdade)
  const v88FimContaAntes95 = v88FimConta;
  v88FimConta = function(r){
    const out = v88FimContaAntes95.apply(this, arguments);
    try {
      if (r && Array.isArray(r.moedasDetalhe) && fimAberto()){
        const det = r.moedasDetalhe.filter(x => x && typeof x.rot === 'string' && x.moedas > 0).slice(0, 8)
          .map(x => ({rot:x.rot, m:x.moedas | 0, cls:/craque/i.test(x.rot) ? 'craque' : /seguidas/.test(x.rot) ? 'seq' : ''}));
        const pv = r.primeiraVitoria;
        if (pv && (pv.moedas > 0 || pv.gemas > 0)) det.push({rot:'1ª vitória do dia', m:pv.moedas | 0, g:pv.gemas | 0, cls:'dia'});
        if (r.tetoMoedas && det.length) det.push({rot:'O teto de moedas de partida de hoje chegou', m:0, cls:'nota'});
        v95PremiosPinta(det);
      }
    } catch (e) { console.error('v95 prêmios (conta)', e); }
    return out;
  };
}

/* ---------------------------------------------------------------- a LOJA › COMO GANHAR (a tabela nova) */
function v95ComoGanhar(){
  const ul = document.querySelector('.v70-lj-ganhos'); if (!ul || ul.dataset.v95) return;
  ul.dataset.v95 = '1'; ul.textContent = '';
  const it = (html, cls) => { const li = nodo('li', cls || null); li.innerHTML = html; ul.appendChild(li); };
  const mo = n => '<i class="ic-moeda"></i>' + fmtNum(n), ge = n => '<i class="ic-gema"></i>' + fmtNum(n);
  it('<b>Partida concluída</b> ' + mo(PREMIO.partida.m) + ' · vitória +' + PREMIO.vitoria.m + ' · cada gol seu +' + PREMIO.golPartida.m + ' · cada assistência +' + PREMIO95.assist);
  it('<b>Craque da partida</b> +' + mo(PREMIO95.craque) + ' · <b>vitórias seguidas</b> +' + PREMIO95.seq + ' por vitória a mais (até +' + PREMIO95.seqMax + ')', 'v95-novo');
  it('<b>1ª vitória do dia</b> ' + mo(PREMIO95.primeira.m) + ' e ' + ge(PREMIO95.primeira.g), 'v95-novo');
  it('<b>Missões do dia</b> ' + mo(70) + ' a 120 cada · as 3: ' + ge(ECO_BONUS.g) + ' · série de ' + ECO_SERIE.n + ' partidas: ' + mo(ECO_SERIE.m));
  it('<b>Exercícios</b> até ' + mo(PREMIO.treino[3].m) + ' por 3 estrelas (cheio 3× por dia) · 3 estrelas pela 1ª vez: ' + ge(PREMIO.tres.g));
  it('<b>Cada nível novo</b> ' + mo(PREMIO.nivel.m) + ' e ' + ge(PREMIO.nivel.g) + ' · a cada 5 níveis +' + PREMIO.nivel5.g + ' gemas');
  it('<b>Top semanal</b> prêmio pela posição na virada de domingo para segunda (liga contra bots)');
  it('<b>Treino livre</b> ' + mo(PREMIO.golLivre.m) + ' por gol, até ' + ECO_CAP.golLivre + ' gols por dia');
  it('Com a conta, as moedas das partidas têm um teto por dia; os prêmios são os mesmos e o servidor confere tudo.', 'v95-nota');
}
const renderLojaAntes95e = renderLoja;
renderLoja = function(){ const r = renderLojaAntes95e.apply(this, arguments); try { v95ComoGanhar(); } catch (e) { console.error('v95 como ganhar', e); } return r; };
window.RachaEconomia95 = {premio:() => ({partida:PREMIO.partida.m, vitoria:PREMIO.vitoria.m, gol:PREMIO.golPartida.m, nivel:Object.assign({}, PREMIO.nivel), nivel5:PREMIO.nivel5.g, ...PREMIO95, primeira:Object.assign({}, PREMIO95.primeira)}),
  ultimo:() => V95E.ultimo ? V95E.ultimo.det.slice() : null, primeiraHoje:v95PrimeiraHoje, pinta:v95PremiosPinta};
