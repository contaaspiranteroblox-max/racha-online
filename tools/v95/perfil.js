/* ======================================================================================================================
   RACHA v95 · O PERFIL DE ORGULHO (o pedido: "um perfil que os caras olhem e sintam orgulho de ver"). No palco da tampinha
   (a grande, em pé, agora com o emoji):
   · o CARTÃO DO CRAQUE no canto: a nota geral (OVR, de 40 a 99 — o nível, o aproveitamento, os gols e as assistências por
     partida, as vezes de craque da partida e a patente), a insígnia da patente, o nome dela e o tipo do cartão (BRONZE,
     PRATA, OURO ou LENDA, pela nota), com o brilho que passa;
   · a VITRINE embaixo: CRAQUE DA PARTIDA (quantas vezes), a MELHOR SEQUÊNCIA de vitórias, a MAIOR PATENTE e a FORMA (as 5
     últimas partidas: V, E, D).
   Os números são os do aparelho (os mesmos das ESTATÍSTICAS); a conta da nota é só para mostrar — nada muda no jogo.
   ====================================================================================================================== */
function v95Ovr(){
  const st = perfil.st || {}, J = Math.max(st.concluidas | 0, st.partidas | 0), V = st.vitorias | 0, G = st.gols | 0, A = st.assist | 0, C = st.craque | 0;
  let nv = 1; try { nv = nivelInfo(CONTA.xp).n; } catch (_) {}
  let ordem = 1; try { ordem = rqElo(Math.max(CONTA.rq.pts | 0, 0)).ordem; } catch (_) {}
  const peso = Math.min(1, J/8);                                // (com poucas partidas, o aproveitamento pesa menos)
  let n = 46 + Math.min(16, nv*.55) + (J ? V/J : 0)*18*peso + Math.min(12, J ? (G + A*.6)/J*7 : 0)*peso + Math.min(9, J ? C/J*28 : 0)*peso + ordem*.42;
  n = Math.max(40, Math.min(99, Math.round(n)));
  return {n, tipo:n >= 85 ? 'lenda' : n >= 75 ? 'ouro' : n >= 62 ? 'prata' : 'bronze'};
}
function v95Forma(){
  const H = (typeof X49 !== 'undefined' && Array.isArray(X49.history)) ? X49.history.slice(-5) : [];
  return H.map(h => { const s = Array.isArray(h.score) ? h.score : [0, 0]; return s[0] === s[1] && !h.win ? 'E' : h.win ? 'V' : 'D'; });
}
function v95PerfilPinta(){
  const box = document.getElementById('pf-palcobox'); if (!box) return;
  let O = box.querySelector('.v95-pf-org');
  if (!O){ O = nodo('div', 'v95-pf-org'); O.setAttribute('aria-hidden', 'false'); box.appendChild(O); }
  const geral = typeof V77T === 'undefined' || !V77T.parte || V77T.parte === 'geral';
  O.hidden = !geral; if (!geral) return;
  O.textContent = '';
  const ovr = v95Ovr(), C = CONTA.rq || {}, e = rqElo(C.pts | 0);
  // o cartão do craque (o canto de cima, à direita)
  const card = nodo('div', 'v95-pf-card t-' + ovr.tipo); card.setAttribute('role', 'img');
  card.setAttribute('aria-label', 'Cartão do craque: nota ' + ovr.n + ', patente ' + e.nome);
  const topo = nodo('div', 'v95-pf-card-topo'); topo.append(nodo('b', 'v95-pf-ovr', String(ovr.n)), nodo('small', null, 'OVR'));
  const ins = nodo('span', 'v95-pf-card-ins'); ins.innerHTML = rqInsignia(e);
  card.append(topo, ins, nodo('span', 'v95-pf-card-pat', e.nome), nodo('em', 'v95-pf-card-tipo', ({bronze:'CARTÃO BRONZE', prata:'CARTÃO PRATA', ouro:'CARTÃO OURO', lenda:'CARTÃO LENDA'})[ovr.tipo]));
  O.appendChild(card);
  // a vitrine (embaixo)
  const vit = nodo('div', 'v95-pf-vit');
  const st = perfil.st || {}, best = (typeof X49 !== 'undefined' && X49.bestSeq) | 0, melhor = Math.max(C.melhor | 0, C.pts | 0);
  const med = (cls, ic, n, rot) => { const d = nodo('div', 'v95-pf-med ' + cls); const i = nodo('i', 'v95-pf-med-ic'); i.innerHTML = ic; d.append(i, nodo('b', null, n), nodo('small', null, rot)); return d; };
  const coroa = '<svg viewBox="0 0 64 48" aria-hidden="true"><path d="M5 44L2 10l16 13L32 2l14 21L62 10l-3 34z" fill="#ffd23f" stroke="#2a1a00" stroke-width="4" stroke-linejoin="round"/><circle cx="32" cy="32" r="5" fill="#ff4a3d" stroke="#2a1a00" stroke-width="3"/></svg>';
  const fogo = '<svg viewBox="0 0 48 56" aria-hidden="true"><path d="M24 3c4 10 17 14 17 31 0 11-8 19-17 19S7 45 7 34c0-9 6-13 8-20 3 5 5 7 7 7-1-7 0-13 2-18z" fill="#ff6a1f" stroke="#2a0d00" stroke-width="4" stroke-linejoin="round"/><path d="M24 26c3 5 8 7 8 14 0 5-4 8-8 8s-8-3-8-8c0-5 5-8 8-14z" fill="#ffd23f"/></svg>';
  vit.append(med('craque', coroa, fmtNum(st.craque | 0), 'CRAQUE DA PARTIDA'), med('seq', fogo, fmtNum(best), 'MELHOR SEQUÊNCIA'));
  const mp = nodo('div', 'v95-pf-med pat'); const mi = nodo('i', 'v95-pf-med-ic'); mi.innerHTML = rqInsignia(rqElo(melhor)); mp.append(mi, nodo('b', null, rqElo(melhor).patente), nodo('small', null, 'MAIOR PATENTE')); vit.appendChild(mp);
  const F = v95Forma(), fm = nodo('div', 'v95-pf-med forma');
  const fl = nodo('span', 'v95-pf-forma'); if (!F.length) fl.appendChild(nodo('em', 'z', '—'));
  for (const r of F) fl.appendChild(nodo('em', r === 'V' ? 'v' : r === 'D' ? 'd' : 'e', r));
  fm.append(fl, nodo('small', null, 'FORMA · ÚLTIMAS ' + Math.max(1, F.length)));
  vit.appendChild(fm);
  O.appendChild(vit);
}
const renderPerfilAntes95 = renderPerfil;
renderPerfil = function(){ const r = renderPerfilAntes95.apply(this, arguments); try { v95PerfilPinta(); } catch (e) { console.error('v95 perfil', e); } return r; };
window.RachaPerfil95 = {ovr:v95Ovr, forma:v95Forma, pinta:v95PerfilPinta};
if (typeof v77PfParte === 'function'){                          // (trocou de aba: o cartão e a vitrine só na VISÃO GERAL)
  const v77PfParteAntes95 = v77PfParte;
  v77PfParte = function(){ const r = v77PfParteAntes95.apply(this, arguments); try { v95PerfilPinta(); } catch (_) {} return r; };
}
