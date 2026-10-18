/* ======================================================================================================================
   RACHA v88 · O QUE A PARTIDA E O TREINO RENDERAM NA CONTA (logado: a carteira é a do servidor)
   · Toda resposta da plataforma que traz a carteira atualiza as moedas e as gemas da tela (a partida, o gol do treino, o
     exercício, a loja, o correio, as missões, o passe).
   · No fim da partida: as moedas que a conta recebeu (com o teto do dia), as missões que completaram, o nível do passe,
     os prêmios de nível e o MELHOR DA PARTIDA (online: o do servidor das salas; contra os bots: o jogo diz quem foi, pelos
     gols e assistências de cada um, e o servidor só aceita se for possível).
   · Logado, a tela do fim não mostra mais as moedas "do aparelho" (que não entram na conta): mostra as da conta, quando
     a resposta chega.
   ====================================================================================================================== */
const V88R = {ultimo:null};
// quem fez e quem deu a assistência, de cada um (para o melhor da partida contra os bots)
const rqCriaAntes88 = rqCria;
rqCria = function(){ RQ.v88G = new Map(); return rqCriaAntes88.apply(this, arguments); };
const rqGolAntes88r = rqGol;
rqGol = function(){
  const antes = RQ.placar ? RQ.placar[0] + RQ.placar[1] : 0;
  const r = rqGolAntes88r.apply(this, arguments);
  try {
    if (RQ.placar && RQ.placar[0] + RQ.placar[1] > antes && RQ.ultLance && !NET49.playing){
      const G = RQ.v88G || (RQ.v88G = new Map()), L = RQ.ultLance, um = q => { if (!G.has(q)) G.set(q, {g:0, a:0}); return G.get(q); };
      if (L.autor && !L.contra) um(L.autor).g++;
      if (L.assist && !L.contra) um(L.assist).a++;
    }
  } catch (_) {}
  return r;
};
function v88MvpBots(placarNosso, placarDeles){            // você foi o melhor da partida contra os bots?
  const G = RQ.v88G; if (!G || !P) return false;
  const nota = x => x ? x.g*2 + x.a : 0, eu = nota(G.get(P));
  if (eu <= 0) return false;
  for (const [q, x] of G) if (q !== P && nota(x) > eu) return false;
  return placarNosso > placarDeles || (G.get(P) || {}).g >= 2;
}

/* ---- a resposta da plataforma: a carteira e o que mudou ---- */
(function v88ApiGancho(){
  const R = window.RACHA84; if (!R || R.v88) return;
  const api0 = R.api;
  R.api = function(proc, input, ehQuery){
    if (proc === 'jogo.encerrarPartida' && input && !input.online && input.mvp === undefined && !input.abandonada){
      try { input = Object.assign({}, input, {mvp:v88MvpBots(input.placarNosso | 0, input.placarDeles | 0)}); } catch (_) {}
    }
    const p = api0.call(this, proc, input, ehQuery);
    if (ehQuery) return p;
    return p.then(r => { try { v88DepoisDe(proc, r); } catch (e) { console.error('v88 resposta', e); } return r; });
  };
  R.v88 = true;
})();
function v88DepoisDe(proc, r){
  if (!r || typeof r !== 'object') return;
  if (r.carteira) v88PoeCarteira(r.carteira);
  if (proc === 'jogo.encerrarPartida'){
    V88R.ultimo = r;
    try { v88EstEsquece(); } catch (_) {}
    v88FimConta(r);
    setTimeout(() => { try { if (v88Logado()) v88LobbyDados(); } catch (_) {} }, 400);
  } else if (proc === 'jogo.golTreino'){
    for (const m of r.missoesCompletas || []) v88Nota('Missão cumprida: ' + (m.nome || m.id), 'recompensas');
    if (r.passe && r.passe.subiu) v88Nota('PASSE RACHA: nível ' + r.passe.nivel + '!', 'recompensas');
  }
}
function v88FimConta(r){                                    // o que a conta recebeu, na tela do fim da partida
  const notas = [];
  for (const m of r.missoesCompletas || []) notas.push('Missão cumprida: ' + (m.nome || m.id));
  if (r.passe && r.passe.subiu) notas.push('PASSE RACHA: nível ' + r.passe.nivel + '!');
  for (const n of r.niveisPremiados || []) notas.push('Nível ' + n.n + ' da conta: +' + fmtNum(n.moedas) + ' moedas' + (n.gemas ? ' e +' + n.gemas + ' gemas' : ''));
  const pinta = () => {
    const el = typeof fimEl === 'function' ? fimEl('fim-premio') : null;
    if (!el || !fimAberto()) return false;
    for (const x of el.querySelectorAll('.v88-fim')) x.remove();
    if (r.moedasGanhas > 0){ const s = nodo('span', 'pm v88-fim'); s.append(nodo('i', 'ic-moeda'), '+' + fmtNum(r.moedasGanhas)); el.appendChild(s); }
    else if (r.tetoMoedas) el.appendChild(nodo('span', 'v88-fim v88-fim-nota', 'Moedas de partida: o teto de hoje acabou'));
    if (r.mvp) el.appendChild(nodo('span', 'v88-fim v88-fim-mvp', 'MELHOR DA PARTIDA'));
    if (r.comAmigo) el.appendChild(nodo('span', 'v88-fim v88-fim-nota', 'Jogou com amigo'));
    if (notas.length) el.appendChild(nodo('span', 'v88-fim v88-fim-nota', notas.join(' · ')));
    return true;
  };
  if (!pinta()){ for (const n of notas) v88Nota(n, 'recompensas'); if (r.mvp) v88Nota('Você foi o MELHOR DA PARTIDA!', 'recompensas'); }
}
// logado: as moedas "do aparelho" não aparecem no fim (elas não entram na conta; as da conta chegam com a resposta)
const ecoPartidaAntes88r = ecoPartida;
ecoPartida = function(){
  const r = ecoPartidaAntes88r.apply(this, arguments);
  if (r && v88Carteira()) return {p:{m:0, g:0, xp:0}, subiu:[]};
  return r;
};
const ecoGolAntes88r = ecoGol;
ecoGol = function(){ const r = ecoGolAntes88r.apply(this, arguments); if (v88Carteira()) ganhoGol = 0; return r; };
// no site (o jogo dentro da página da conta) a resposta da partida chega pelo c82Resultado: a carteira vem junto (ou é buscada)
const c82ResultadoAntes88 = c82Resultado;
c82Resultado = function(ev){
  const r = c82ResultadoAntes88.apply(this, arguments);
  try {
    const x = ev && ev.resultado;
    if (x && v88Logado() && !(window.RACHA84 && !window.RACHA84.embutido && V88R.ultimo === x)){
      if (x.carteira) v88PoeCarteira(x.carteira); else v88Estado(true).catch(() => {});
      if (V88R.ultimo !== x){ V88R.ultimo = x; try { v88EstEsquece(); } catch (_) {} v88FimConta(x); }
    }
  } catch (e) { console.error(e); }
  return r;
};
