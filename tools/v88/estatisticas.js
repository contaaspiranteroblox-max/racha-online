/* ======================================================================================================================
   RACHA v88 · AS ESTATÍSTICAS DA CONTA (na aba ESTATÍSTICAS do PERFIL de sempre)
   Logado, em cima da aba aparece DA CONTA | DESTE APARELHO. DA CONTA mostra os números de verdade que o servidor contou
   (estat.resumo: só as partidas que a plataforma encerrou), com os filtros de TEMPORADA (todas ou a atual) e de MODO
   (tudo, futebol, com curva, ranqueada, online, contra os bots) e as últimas partidas. Sem partida, tudo fica em zero:
   nada é estimado. DESTE APARELHO é a aba de antes, igual (o que este aparelho guardou, também sem conta).
   ====================================================================================================================== */
const V88E = {fonte:'conta', temporada:'tudo', modo:'tudo', dados:new Map(), carregando:'', erro:'', temporadas:null, el:null};
const V88_EST_MODOS = [['tudo', 'TUDO'], ['futebol', 'FUTEBOL'], ['curva', 'COM CURVA'], ['ranqueada', 'RANQUEADA'], ['online', 'ONLINE'], ['bots', 'CONTRA BOTS']];
function v88EstChave(){ return V88E.temporada + '|' + V88E.modo; }
function v88EstCarrega(forca){
  if (!v88Logado()) return;
  const k = v88EstChave(), d = V88E.dados.get(k);
  if (!forca && d && Date.now() - d.t < 30000) return;
  if (V88E.carregando === k) return;
  V88E.carregando = k; V88E.erro = '';
  if (!V88E.temporadas) v88Q('estat.temporadas').then(l => { if (Array.isArray(l)) { V88E.temporadas = l; v88EstPinta(); } }).catch(() => {});
  v88Q('estat.resumo', {temporada:V88E.temporada, modo:V88E.modo}).then(r => {
    V88E.dados.set(k, {t:Date.now(), r}); if (V88E.carregando === k) V88E.carregando = '';
    v88EstPinta();
  }).catch(e => { if (V88E.carregando === k) V88E.carregando = ''; V88E.erro = e.message || 'sem conexão'; v88EstPinta(); });
}
function v88EstPinta(){
  const E = typeof PX !== 'undefined' && PX.el; if (!E || !E.sec) return;
  const logado = v88Logado();
  let sw = E.sec.querySelector('.v88-est-fonte');
  if (logado && !sw){ sw = nodo('div', 'v88-est-fonte tl-seg'); sw.setAttribute('role', 'group'); sw.setAttribute('aria-label', 'De onde vêm os números'); E.sec.insertBefore(sw, E.ctx); }
  if (sw){
    sw.hidden = !logado; sw.textContent = '';
    for (const [k, t] of [['conta', 'DA CONTA'], ['aparelho', 'DESTE APARELHO']]){
      const b = novoBotao(V88E.fonte === k ? 'on' : '', t); b.textContent = t; b.setAttribute('aria-pressed', String(V88E.fonte === k));
      b.addEventListener('click', () => { if (V88E.fonte === k) return; som.clique(); V88E.fonte = k; pxEstRender(); }); sw.appendChild(b);
    }
  }
  const conta = logado && V88E.fonte === 'conta';
  for (const el of [E.ctx, E.grade, E.nota]) if (el) el.classList.toggle('v88-oculto', conta);
  if (E.modo) E.modo.classList.toggle('v88-oculto', conta);
  let box = V88E.el && E.sec.contains(V88E.el) ? V88E.el : null;
  if (!conta){ if (box) box.hidden = true; return; }
  if (!box){ box = V88E.el = nodo('div', 'v88-est'); E.sec.appendChild(box); }
  box.hidden = false; box.textContent = '';
  // os filtros
  const fil = nodo('div', 'v88-est-fil');
  const temps = V88E.temporadas || [{id:'tudo', nome:'TODAS'}, {id:CAT88.temporada.id, nome:CAT88.temporada.nome}];
  const t = nodo('div', 'tl-seg v88-est-temp'); t.setAttribute('role', 'group'); t.setAttribute('aria-label', 'Temporada');
  for (const x of temps){ const nm = x.id === 'tudo' ? 'TODAS AS TEMPORADAS' : 'TEMPORADA ' + String(x.id).replace(/\D/g, ''); const b = novoBotao(V88E.temporada === x.id ? 'on' : '', nm); b.textContent = nm; b.setAttribute('aria-pressed', String(V88E.temporada === x.id)); b.addEventListener('click', () => { if (V88E.temporada === x.id) return; som.clique(); V88E.temporada = x.id; v88EstPinta(); v88EstCarrega(); }); t.appendChild(b); }
  const m = nodo('div', 'tl-seg v88-est-modo'); m.setAttribute('role', 'group'); m.setAttribute('aria-label', 'Modo');
  for (const [k, nm] of V88_EST_MODOS){ const b = novoBotao(V88E.modo === k ? 'on' : '', nm); b.textContent = nm; b.setAttribute('aria-pressed', String(V88E.modo === k)); b.addEventListener('click', () => { if (V88E.modo === k) return; som.clique(); V88E.modo = k; v88EstPinta(); v88EstCarrega(); }); m.appendChild(b); }
  fil.append(t, m); box.appendChild(fil);
  const d = V88E.dados.get(v88EstChave());
  if (!d){
    if (V88E.erro) v88Erro(box, 'Não deu para carregar as estatísticas (' + V88E.erro + ').', () => v88EstCarrega(true));
    else { v88Carregando(box, 'Carregando os números da conta…'); v88EstCarrega(); }
    return;
  }
  const r = d.r || {}, G = nodo('div', 'lb-stats v88-est-grade');
  const n = v => fmtNum(v | 0);
  G.append(pxCard('PARTIDAS', n(r.partidas), 'encerradas pela plataforma', 'top'), pxCard('VITÓRIAS', n(r.vitorias), (r.taxaVitoria | 0) + '% de vitórias', 'top'),
    pxCard('DERROTAS', n(r.derrotas)), pxCard('EMPATES', n(r.empates)), pxCard('GOLS', n(r.gols), r.partidas ? (r.gols/r.partidas).toFixed(1).replace('.', ',') + ' por partida' : ''),
    pxCard('ASSISTÊNCIAS', n(r.assistencias)), pxCard('APROVEITAMENTO', (r.aproveitamento | 0) + '%', '3 pontos a vitória, 1 o empate'),
    pxCard('MELHOR SEQUÊNCIA', n(r.melhorSequencia), 'vitórias seguidas'), pxCard('MELHOR DA PARTIDA', n(r.mvp), 'vezes'), pxCard('TEMPO EM CAMPO', v88Dur(r.tempoSeg | 0)));
  box.appendChild(G);
  const h = nodo('h3', 'lb-sub v88-est-h', 'ÚLTIMAS PARTIDAS DA CONTA'); box.appendChild(h);
  const L = Array.isArray(r.historico) ? r.historico : [];
  if (!L.length){ v88Vazio(box, 'estat', 'NENHUMA PARTIDA AQUI', V88E.modo === 'tudo' && V88E.temporada === 'tudo' ? 'Jogue uma partida com a conta: os números aparecem aqui.' : 'Nada com esse filtro. Tente outro modo ou todas as temporadas.'); }
  else {
    const ul = nodo('ul', 'v88-est-hist');
    for (const p of L){
      const li = nodo('li', 'v88-est-p ' + (p.resultado || ''));
      const res = p.resultado === 'vitoria' ? 'VITÓRIA' : p.resultado === 'derrota' ? 'DERROTA' : 'EMPATE';
      const onde = p.ranqueada ? 'RANQUEADA' + (p.online ? ' ONLINE' : '') : p.online ? 'SALA ONLINE' : 'CONTRA BOTS';
      const pl = Array.isArray(p.placar) ? p.placar : [0, 0];
      li.append(nodo('b', 'v88-est-res', res), nodo('span', 'v88-est-pl', pl[0] + ' × ' + pl[1]),
        nodo('span', 'v88-est-tx', onde + (p.tamanho ? ' · ' + p.tamanho + 'v' + p.tamanho : '') + (p.modo === 'curva' ? ' · COM CURVA' : '') + ' · ' + (p.gols | 0) + (p.gols === 1 ? ' gol' : ' gols') + (p.assistencias ? ' · ' + p.assistencias + ' assist.' : '')),
        nodo('small', 'v88-est-qd', v88Quando(p.quando)));
      if (p.mvp) li.appendChild(nodo('em', 'v88-est-mvp', 'MELHOR DA PARTIDA'));
      if (p.ranqueada && Number.isFinite(p.rqDelta)) li.appendChild(nodo('em', 'v88-est-rq' + (p.rqDelta < 0 ? ' neg' : ''), (p.rqDelta > 0 ? '+' : '') + p.rqDelta));
      ul.appendChild(li);
    }
    box.appendChild(ul);
  }
  box.appendChild(nodo('p', 'tl-nota v88-est-nota', 'Contam só as partidas que a plataforma encerrou na sua conta (contra os bots e online). O treino e as partidas sem conta ficam em DESTE APARELHO.'));
}
const pxEstRenderAntes88 = pxEstRender;
pxEstRender = function(){
  const r = pxEstRenderAntes88.apply(this, arguments);
  try { v88EstPinta(); } catch (e) { console.error(e); }
  return r;
};
v88On('resumo', () => { try { if (v88Aberta('perfil')) v88EstPinta(); } catch (_) {} });
// depois de uma partida que valeu na conta, os números mudam: esquece o que estava guardado
function v88EstEsquece(){ V88E.dados.clear(); }
