/* ==================================================================================================================
   RACHA rua v70 · Etapa 4 — PERFIL, ESTATÍSTICAS, ZERAR E SALVAMENTO
   1) As estatísticas por contexto (treino, casual, liga contra bots, online) e por modo (futebol, curva, vôlei, americano,
      basquete, ginga): partidas concluídas, vitórias, derrotas, empates, abandonos, gols / cestas / touchdowns / pontos,
      assistências, gols contra, sem sofrer gol, finalizações no alvo e conversão. Os números de antes da v70 (sem modo nem
      contexto) ficam num grupo à parte, "Antes da v70".
   2) Finalização = chute ou passe seu rumo ao gol adversário: a bola ia entrar (no alvo) ou foi um CHUTE forte na direção
      do gol que saiu. Passe para o lado não conta. Conversão = gols que saíram de uma finalização sua ÷ finalizações.
   3) Os títulos: participação conta partida CONCLUÍDA (Boleiro), gols contam só em partidas, e título conquistado fica.
   4) A identidade: logado na conta do RACHA, o nome e o ID são os da conta (os mesmos do clube e dos convites); fora dela,
      o cartão diz PERFIL LOCAL e o ID é o deste aparelho.
   5) Zerar o progresso: a janela diz o que apaga e o que fica; desenhos, replays e o clube deste aparelho são escolha sua.
   6) O salvamento: aviso quando o navegador não guarda (progresso só até fechar), falha de gravação não passa calada, e o
      progresso pode ir para um arquivo (exportar) e voltar (importar).
   Nada aqui mexe na física.
   ================================================================================================================== */

/* ---------------------------------------------------------------- carregar (chamadas lá do começo do script) */
// (estas duas funções rodam antes deste arquivo: só usam o que já existe lá em cima)
function perfilCarregaV70(o){                           // o perfil salvo: as estatísticas novas e os títulos conquistados
  if (o && o.v70 === 1){
    perfil.est = {};
    const e = o.est;
    if (e && typeof e === 'object') for (const k in e){
      if (!/^(treino|casual|liga|online|antigo)\|[a-z]+$/.test(k)) continue;
      const b = e[k]; if (!b || typeof b !== 'object') continue;
      const n = {}; for (const c in b) if (/^[a-z]{1,3}$/.test(c)) n[c] = numOk(b[c]); perfil.est[k] = n;
    }
    perfil.ganhos = Array.isArray(o.ganhos) ? o.ganhos.filter(x => typeof x === 'string' && x.length < 24).slice(0, 32) : [];
  } else {                                              // perfil de antes da v70: os totais antigos viram o grupo "Antes da v70"
    const s = perfil.st; perfil.est = {}; perfil.ganhos = [];
    if (s.partidas || s.gols || s.assist || s.vitorias)
      perfil.est['antigo|todos'] = {p:s.partidas, c:s.concluidas, v:s.vitorias, d:Math.max(0, s.concluidas - s.vitorias), a:Math.max(0, s.partidas - s.concluidas),
        m:s.gols, pt:s.gols, as:s.assist, ss:s.semSofrer};
    // os títulos que as regras antigas já davam continuam seus (Boleiro contava partida iniciada; agora conta concluída)
    const velhos = [['artilheiro', s.gols >= 100], ['garcom', s.assist >= 20], ['paredao', s.semSofrer >= 10], ['dono', s.vitorias >= 25], ['boleiro', s.partidas >= 50]];
    for (const [id, ok] of velhos) if (ok) perfil.ganhos.push(id);
  }
  perfil.v70 = 1;
}

/* ---------------------------------------------------------------- 1) as estatísticas por contexto e modo */
const EST_CTX = [['tudo', 'TUDO'], ['casual', 'CASUAL'], ['liga', 'LIGA (BOTS)'], ['online', 'ONLINE'], ['treino', 'TREINO']];
const EST_PARTIDA = ['casual', 'liga', 'online', 'antigo'];          // onde tem partida (o treino não tem)
const EST_MODOS = ['futebol', 'curva', 'volei', 'americano', 'basquete', 'ginga'];
const EST_GOL = ['futebol', 'curva', 'ginga'];                       // os modos que contam GOL
const EST_FIN = ['futebol', 'curva', 'ginga', 'basquete'];           // os modos com finalização (arremesso no basquete)
const PX = {ctx:'tudo', modo:'todos', clube:undefined, clubeT:0, el:null};
function estCtx(){                                      // onde você está jogando agora
  if (NET49.playing && NET49.room) return NET49.room.local ? 'casual' : 'online';   // (a sala neste aparelho é uma casual com bots)
  if (RQ.on) return X49.matchMode === 'ranked' ? 'liga' : 'casual';
  return 'treino';
}
function estModo(){ return (RQ.on || NET49.playing) ? mdValida(RQ.jogo || 'futebol') : 'futebol'; }
function estB(ctx, modo){                               // o grupo de números (cria zerado)
  const k = ctx + '|' + modo; let b = perfil.est[k];
  if (!b) b = perfil.est[k] = {};
  return b;
}
const estAdd = (b, c, n) => { b[c] = (b[c] || 0) + (n == null ? 1 : n); };
function estMarca(pts){ estAdd(estB(estCtx(), estModo()), 'm'); estAdd(estB(estCtx(), estModo()), 'pt', Math.max(1, pts | 0)); }   // seu gol / cesta / touchdown / ponto
function estConta(c, n){ estAdd(estB(estCtx(), estModo()), c, n); }
function estTempo(dt){ if (!(dt > 0) || lobby.aberto) return; const b = estB(estCtx(), estModo()); b.t = (b.t || 0) + Math.min(dt, .25); }
function estSoma(c, ctxs, modos){                       // soma um número nos grupos escolhidos (null = todos)
  let s = 0;
  for (const k in perfil.est){
    const [cx, md] = k.split('|');
    if (ctxs && ctxs.indexOf(cx) < 0) continue;
    if (cx === 'antigo'){                              // o de antes da v70 não tem modo: entra nos totais (e os gols antigos, nos gols)
      if (modos && !(c === 'm' && modos === EST_GOL)) continue;
    } else if (modos && modos.indexOf(md) < 0) continue;
    s += perfil.est[k][c] || 0;
  }
  return s;
}
function estResultado(R, ctx, info){                     // o fim de uma partida que valeu: uma vez por partida (R.v70)
  if (!R || R.v70) return; R.v70 = true;
  const b = estB(ctx, mdValida(R.jogo || RQ.jogo || 'futebol'));
  estAdd(b, 'p');
  if (info.abandono) estAdd(b, 'a');
  else {
    estAdd(b, 'c');
    if (info.empate) estAdd(b, 'e'); else if (R.venceu) estAdd(b, 'v'); else estAdd(b, 'd');
    if (!info.sofreu) estAdd(b, 'ss');
  }
  perfilSalvar(); pxConfereTitulos();
  try { if (typeof ecoPartidaFim === 'function') ecoPartidaFim(R, ctx, info); } catch (e) { console.error(e); }
}
// os ganchos: a partida contra os bots (casual e liga), a sala (online e neste aparelho), o treino
const rqFechaContaAntes70p = rqFechaConta;
rqFechaConta = function(abandono){
  const R = RQ.resultado, ja = !!(R && R.contado);
  const r = rqFechaContaAntes70p(abandono);
  if (R && !ja && R.contado && !NET49.playing){
    const ctx = X49.matchMode === 'ranked' ? 'liga' : 'casual';
    estResultado(R, ctx, {abandono:!!abandono, empate:false, sofreu:(R.placar[1] | 0) > 0});
    if (abandono) pxHistorico(R, ctx, {abandono:true});
  }
  return r;
};
const net49ResultAntes70p = net49Result;
net49Result = function(m){
  const antes = RQ.resultado;
  const r = net49ResultAntes70p(m);
  const R = RQ.resultado;
  if (R && R !== antes && R.contado && !R.encerrada && !R.v70 && NET49.localSlot >= 0 && m){
    const ctx = NET49.room && NET49.room.local ? 'casual' : 'online', meu = P ? P.time | 0 : 0;
    estResultado(R, ctx, {abandono:false, empate:m.winner !== 0 && m.winner !== 1, sofreu:((m.score || [])[1 - meu] | 0) > 0});
  }
  return r;
};
const ecoGolAntes70p = ecoGol;
ecoGol = function(tipo){                                 // os gols do treino (o das partidas entra pelo estMarca, com os pontos)
  if (tipo === 'livre' || tipo === 'treino'){ const b = estB('treino', 'futebol'); estAdd(b, 'm'); estAdd(b, 'pt'); }
  return ecoGolAntes70p(tipo);
};
const trAcabaAntes70p = trAcaba;
trAcaba = function(){
  const r = trAcabaAntes70p();
  if (TR.fim && TR_INFO[TR.id] && TR.id !== 'livre'){ estAdd(estB('treino', 'futebol'), 'c'); perfilSalvar(); }
  return r;
};
// a finalização: seu chute ou passe rumo ao gol adversário (marcado na hora da batida, com o caminho que a bola ia fazer)
const rqMarcaChuteAntes70p = rqMarcaChute;
rqMarcaChute = function(q, forca){
  rqMarcaChuteAntes70p(q, forca);
  try {
    if (!RQ.on || q !== P || NET49.playing || EST_FIN.indexOf(RQ.jogo || 'futebol') < 0) return;
    const cd = RQ.chuteDe; if (!cd || cd.p !== q) return;
    let fin = !!cd.alvo;
    if (!fin && forca >= FORCA_POWER){                  // CHUTE forte, do campo de ataque, na direção do gol (e saiu): finalização pra fora
      const lado = q.time === 0 ? 1 : -1, gx = lado > 0 ? LX1 : LX0, v = Math.hypot(B.vx, B.vy);
      const ataque = (B.x - CX)*lado > -U(2);
      if (v > 1 && ataque && B.vx*lado > 0){
        const ang = Math.abs(Math.atan2(CY - B.y, gx - B.x) - Math.atan2(B.vy, B.vx));
        fin = Math.min(ang, Math.PI*2 - ang) < .5;   // (até uns 29°)
      }
    }
    if (!fin) return;
    cd.fin = true;
    const b = estB(estCtx(), estModo()); estAdd(b, 'f'); if (cd.alvo) estAdd(b, 'fa');
  } catch (e) { console.error(e); }
};
function estGolDeFinalizacao(){                         // (no gol seu) a bola entrou depois da sua finalização
  const cd = RQ.chuteDe; if (cd && cd.p === P && cd.fin && !NET49.playing) estConta('fg');
}

/* ---------------------------------------------------------------- 2) o histórico (com empates e abandonos) */
function pxHistorico(R, ctx, o){                         // a partida que você largou também entra nas ÚLTIMAS PARTIDAS
  X49.history.push({at:Date.now(), score:R.placar, win:false, aband:!!o.abandono, mode:x49ModeName(), n:R.n, jogo:R.jogo || RQ.jogo || 'futebol', ctx});
  X49.history = X49.history.slice(-30); x49Save();
}
const x49RecordAntes70p = x49Record;
x49Record = function(R){
  x49RecordAntes70p(R);
  const h = X49.history[X49.history.length - 1];
  if (!R || R.abandono || !h || h.at < Date.now() - 2000) return;
  h.jogo = R.jogo || RQ.jogo || 'futebol';
  h.ctx = NET49.playing && NET49.room ? (NET49.room.local ? 'casual' : 'online') : X49.matchMode === 'ranked' ? 'liga' : 'casual';
  if (NET49.playing && R.placar && R.placar[0] === R.placar[1]){ h.emp = true; X49.seq = 0; }
  x49Save();
};
const PX_CTX_NOME = {casual:'casual', liga:'liga contra bots', online:'online', treino:'treino', antigo:'antes da v70'};
renderPartidas = function(){
  const box = $('pf-rec-partidas'), hist = $('pf-hist'); if (!box || !hist) return;
  for (const c of $$('.card', box)) c.remove();
  for (const [nome, v, em] of [['MELHOR SEQUÊNCIA', X49.bestSeq, X49.bestSeq === 1 ? 'vitória seguida' : 'vitórias seguidas'], ['SEQUÊNCIA ATUAL', X49.seq, X49.seq === 1 ? 'vitória' : 'vitórias'],
    ['GOL MAIS DISTANTE', X49.longest ? X49.longest.toFixed(1).replace('.', ',') : '—', X49.longest ? 'u do chute até o gol' : 'faça um gol de longe'], ['VITÓRIA MAIS RÁPIDA', X49.fastest ? fmtTempo(X49.fastest) : '—', X49.fastest ? 'de partida' : 'ganhe uma partida']]){
    const c = nodo('div', 'card'); c.append(nodo('small', null, nome), nodo('b', null, String(v)), nodo('em', null, em)); box.appendChild(c);
  }
  hist.textContent = '';
  const l = X49.history.slice().reverse();
  for (const r of l){
    const res = r.aband ? 'ABANDONO' : r.emp ? 'EMPATE' : r.win ? 'VITÓRIA' : 'DERROTA';
    const li = nodo('li', r.win && !r.aband ? '' : r.emp ? 'e' : 'd');
    const md = MD_MAP.get(r.jogo || 'futebol'), onde = r.ctx ? PX_CTX_NOME[r.ctx] : String(r.mode || '').toLowerCase();
    li.append(nodo('b', null, res), nodo('span', null, (r.score || [0, 0]).join(' × ')),
      nodo('small', null, r.n + 'v' + r.n + ' · ' + (md ? md.nome.toLowerCase() : 'futebol') + ' · ' + onde), nodo('em', null, rpQuando(r.at)));
    hist.appendChild(li);
  }
  if (!l.length) hist.appendChild(nodo('li', 'vazio', 'A sua próxima partida começa esta lista.'));
};

/* ---------------------------------------------------------------- 3) os títulos */
const pxTit = id => TITULO_MAP.get(id);
const pxGanhou = id => perfil.ganhos.indexOf(id) >= 0;
function pxTitDef(id, valor, req, un){                  // muda a conta do título (o conquistado não volta a ficar trancado)
  const T = pxTit(id); if (!T) return;
  T.valor = () => pxGanhou(id) ? Math.max(T.meta, valor()) : valor();
  if (req) T.req = req; if (un) T.un = un;
}
pxTitDef('artilheiro', () => estSoma('m', EST_PARTIDA, EST_GOL), 'Faça 100 gols em partidas', 'gols em partidas');
pxTitDef('garcom', () => estSoma('as', EST_PARTIDA, null));
pxTitDef('paredao', () => estSoma('ss', EST_PARTIDA, null));
pxTitDef('dono', () => estSoma('v', EST_PARTIDA, null));
pxTitDef('boleiro', () => estSoma('c', EST_PARTIDA, null), 'Conclua 50 partidas (sair no meio não conta)', 'partidas concluídas');
function pxConfereTitulos(){                            // o título que acabou de chegar fica guardado
  let novo = false;
  for (const T of TITULOS){ if (!pxGanhou(T.id) && T.valor() >= T.meta){ perfil.ganhos.push(T.id); novo = true; } }
  if (novo) perfilSalvar();
}

/* ---------------------------------------------------------------- 4) a identidade (conta do RACHA × perfil local) */
function pxConta(){ try { const pl = tpePlataforma(); const c = pl && typeof pl.conta === 'function' ? pl.conta() : null; return c && c.idPublico ? c : null; } catch (_) { return null; } }
function pxIdentidade(){                                // o nome e o ID que valem (os mesmos do clube e dos convites)
  const c = pxConta();
  if (c){ const n = limpaNome(c.nome || ''); if (n && n !== perfil.nome){ perfil.nome = n; perfilSalvar(); } return {conta:true, id:String(c.idPublico), nome:perfil.nome}; }
  return {conta:false, id:perfil.uid, nome:perfil.nome};
}
const editarNomeAntes70p = editarNome;
editarNome = function(on){                              // logado: o nome é o da conta (muda na página da conta)
  if (on && pxConta()){
    abrePop(c => {
      c.append(nodo('span', 'pop-tag', 'CONTA DO RACHA'), nodo('h2', null, 'O NOME É O DA CONTA'),
        nodo('p', 'pop-txt', 'Você entrou com a sua conta do RACHA: o nome e o ID do cartão são os mesmos do clube, dos convites e das salas. Para trocar o nome, mude no perfil da conta.'));
      const a = nodo('div', 'pop-acoes');
      a.appendChild(botaoPop('FECHAR', '', () => { som.clique(); fechaPop(); }));
      if (typeof window.parent.RACHA_ABRIR === 'function') a.appendChild(botaoPop('ABRIR O PERFIL DA CONTA', 'verde', () => { som.clique(); fechaPop(); try { window.parent.RACHA_ABRIR('/perfil'); } catch (_) {} }));
      c.appendChild(a);
    });
    return;
  }
  return editarNomeAntes70p(on);
};

/* ---------------------------------------------------------------- 5) a tela do perfil */
const PX_SVG = {
  info:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M12 10.5v6.5M12 7v.2" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/></svg>',
  seta:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>'
};
const pxPct = (a, b) => b ? Math.round(100*Math.min(1, a/b)) + '%' : '—';
function pxMonta(){                                     // as partes novas da tela (montadas uma vez)
  if (PX.el) return PX.el;
  const tela = TELAS.perfil.el, corpo = tela && tela.querySelector('.pf-corpo'); if (!corpo) return null;
  // a etiqueta do cartão: CONTA DO RACHA ou PERFIL LOCAL
  const id = tela.querySelector('.pf-uid'), selo = nodo('span', 'pf-ident');
  let idTx = null;
  if (id){                                              // "ID LOCAL 123…" em cima e a etiqueta embaixo (o selo redondo do meio fica livre)
    const l = nodo('span', 'pf-uid-l'); while (id.firstChild) l.appendChild(id.firstChild);
    id.append(l, selo); idTx = l.firstChild && l.firstChild.nodeType === 3 ? l.firstChild : null;
  }
  // o lado: o clube e a próxima meta
  const lado = tela.querySelector('.pf-lado');
  const clube = novoBotao('pf-clube'); clube.addEventListener('click', () => { som.clique(); abreTela('clube', 'perfil'); });
  const meta = nodo('div', 'pf-meta'); meta.setAttribute('role', 'group'); meta.setAttribute('aria-label', 'Próxima meta');
  if (lado){ lado.append(clube, meta); }
  // as estatísticas por contexto e modo
  const sec = nodo('section', 'pf-est'); sec.setAttribute('aria-label', 'Estatísticas');
  const cab = nodo('div', 'pf-est-cab'); cab.appendChild(nodo('h3', 'lb-sub', 'ESTATÍSTICAS'));
  const ctx = nodo('div', 'pf-est-ctx tl-seg'); ctx.setAttribute('role', 'tablist'); ctx.setAttribute('aria-label', 'Onde você jogou');
  const modo = nodo('div', 'pf-est-modo tl-seg'); modo.setAttribute('role', 'group'); modo.setAttribute('aria-label', 'Modo de jogo');
  const grade = nodo('div', 'lb-stats pf-est-grade'), nota = nodo('p', 'tl-nota pf-est-nota');
  sec.append(cab, ctx, modo, grade, nota);
  const recs = tela.querySelector('.pf-recs'); corpo.insertBefore(sec, recs || null);
  ctx.addEventListener('click', e => { const b = e.target.closest('[data-ctx]'); if (!b || b.dataset.ctx === PX.ctx) return; som.clique(); PX.ctx = b.dataset.ctx; pxEstRender(); });
  modo.addEventListener('click', e => { const b = e.target.closest('[data-modo]'); if (!b || b.dataset.modo === PX.modo) return; som.clique(); PX.modo = b.dataset.modo; pxEstRender(); });
  ctx.addEventListener('keydown', e => {                // as setas andam entre as abas
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const l = Array.from(ctx.children), i = l.findIndex(b => b.dataset.ctx === PX.ctx), j = (i + (e.key === 'ArrowRight' ? 1 : -1) + l.length) % l.length;
    e.preventDefault(); PX.ctx = l[j].dataset.ctx; pxEstRender(); try { ctx.children[j].focus(); } catch (_) {}
  });
  return PX.el = {selo, id, idTx, clube, meta, sec, ctx, modo, grade, nota};
}
function pxCard(nome, valor, em, cls){ const c = nodo('div', 'card' + (cls ? ' ' + cls : '')); c.append(nodo('small', null, nome), nodo('b', null, String(valor)), nodo('em', null, em || '')); return c; }
function pxEstRender(){
  const E = pxMonta(); if (!E) return;
  const temAntigo = Object.keys(perfil.est).some(k => k.indexOf('antigo|') === 0);
  const ctxs = EST_CTX.concat(temAntigo ? [['antigo', 'ANTES DA v70']] : []);
  if (!ctxs.some(c => c[0] === PX.ctx)) PX.ctx = 'tudo';
  E.ctx.textContent = '';
  for (const [k, nome] of ctxs){ const b = novoBotao('', nome); b.textContent = nome; b.dataset.ctx = k; b.setAttribute('role', 'tab'); const on = k === PX.ctx; b.classList.toggle('on', on); b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; E.ctx.appendChild(b); }
  const treino = PX.ctx === 'treino', antigo = PX.ctx === 'antigo';
  E.modo.hidden = treino || antigo;
  if (!E.modo.hidden){
    E.modo.textContent = '';
    const modos = [['todos', 'TODOS']].concat(EST_MODOS.map(id => [id, MD_MAP.get(id).nome]));
    if (PX.ctx === 'liga' && PX.modo !== 'todos' && PX.modo !== 'futebol') PX.modo = 'todos';
    for (const [k, nome] of modos){
      if (PX.ctx === 'liga' && k !== 'todos' && k !== 'futebol') continue;   // (a liga é sempre futebol)
      const b = novoBotao('', nome); b.textContent = nome; b.dataset.modo = k; const on = k === PX.modo; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); E.modo.appendChild(b);
    }
  }
  const G = E.grade; G.textContent = '';
  const C = PX.ctx === 'tudo' ? EST_PARTIDA : [PX.ctx], M = PX.modo === 'todos' ? null : [PX.modo];
  const s = c => estSoma(c, C, M);
  const notas = [];
  if (treino){
    const b = perfil.est['treino|futebol'] || {};
    G.append(pxCard('GOLS NO TREINO', fmtNum(b.m || 0), 'treino livre e exercícios'), pxCard('EXERCÍCIOS', fmtNum(b.c || 0), 'terminados'),
      pxCard('TREINOS 3 ★', Math.min(TRES_TOTAL, CONTA.tres.filter(k => k.indexOf('arcade:') === 0).length) + '/' + TRES_TOTAL, 'exercícios com 3 estrelas'),
      pxCard('DOMÍNIOS', fmtNum(perfil.st.dominios), 'no treino de Domínio'), pxCard('TEMPO DE TREINO', fmtTempo(b.t || 0), 'com a bola rolando'));
    notas.push('O treino não conta partida, vitória nem finalização: aqui ficam os gols, os exercícios e as estrelas.');
  } else if (antigo){
    const b = perfil.est['antigo|todos'] || {};
    G.append(pxCard('PARTIDAS', fmtNum(b.c || 0), 'concluídas'), pxCard('VITÓRIAS', fmtNum(b.v || 0), pxPct(b.v || 0, b.c || 0) + ' das concluídas'),
      pxCard('ABANDONOS', fmtNum(b.a || 0), 'saiu no meio'), pxCard('GOLS', fmtNum(b.m || 0), 'partidas e treinos juntos'),
      pxCard('ASSISTÊNCIAS', fmtNum(b.as || 0)), pxCard('SEM SOFRER GOL', fmtNum(b.ss || 0), 'partidas'));
    notas.push('Antes da v70 o jogo guardava só os totais, sem separar modo, contexto, gols de treino e de partida. Eles continuam valendo nos títulos.');
  } else {
    const c = s('c'), v = s('v'), d = s('d'), e = s('e'), a = s('a');
    G.append(pxCard('PARTIDAS', fmtNum(c), a ? 'concluídas · +' + fmtNum(a) + (a === 1 ? ' abandono' : ' abandonos') : 'concluídas', 'top'),
      pxCard('VITÓRIAS', fmtNum(v), pxPct(v, c) + ' das concluídas', 'top'), pxCard('DERROTAS', fmtNum(d), 'concluídas'));
    if (e || PX.ctx === 'online' || PX.ctx === 'tudo') G.appendChild(pxCard('EMPATES', fmtNum(e), 'só nas salas com tempo'));
    G.appendChild(pxCard('ABANDONOS', fmtNum(a), PX.ctx === 'liga' ? 'saiu no meio: conta derrota na liga' : 'saiu no meio'));
    // o que se marca em cada modo: gol, cesta, touchdown, ponto
    const um = (modos, nome, campo, em) => { const n = estSoma(campo, C, modos); return pxCard(nome, fmtNum(n), em); };
    if (!M){
      G.appendChild(um(EST_GOL, 'GOLS', 'm', 'futebol, curva e ginga'));
      for (const [md, nome, em] of [['basquete', 'CESTAS', 'no basquete'], ['americano', 'TOUCHDOWNS', 'no americano'], ['volei', 'PONTOS NO VÔLEI', 'bola no fundo deles']]){
        const n = estSoma('m', C, [md]); if (n) G.appendChild(pxCard(nome, fmtNum(n), em));
      }
      const pb = estSoma('pt', C, ['basquete']), pg = estSoma('pt', C, ['ginga']);
      if (pb) G.appendChild(pxCard('PONTOS NO BASQUETE', fmtNum(pb), 'cesta vale 2; de fora do arco, 3'));
      if (pg) G.appendChild(pxCard('PONTOS NA GINGA', fmtNum(pg), 'gol de ginga vale 2'));
    } else {
      const md = M[0], U2 = MD_UN[md] || MD_UN.futebol;
      G.appendChild(pxCard(U2.varios.toUpperCase(), fmtNum(s('m')), md === 'americano' ? 'cruzando o fundo com a bola' : md === 'volei' ? 'bola no fundo deles' : 'seus'));
      if (md === 'basquete' || md === 'ginga') G.appendChild(pxCard('PONTOS', fmtNum(s('pt')), md === 'basquete' ? 'cesta vale 2; de fora do arco, 3' : 'gol de ginga vale 2'));
    }
    G.append(pxCard('ASSISTÊNCIAS', fmtNum(s('as')), 'o último passe do gol'), pxCard('GOLS CONTRA', fmtNum(s('gc')), 'no próprio gol'),
      pxCard('SEM SOFRER', fmtNum(s('ss')), 'concluídas sem levar'));
    const finOk = PX.ctx !== 'online' && (!M || EST_FIN.indexOf(M[0]) >= 0);
    if (finOk){
      const f = estSoma('f', C, M || EST_FIN), fa = estSoma('fa', C, M || EST_FIN), fg = estSoma('fg', C, M || EST_FIN);
      G.append(pxCard('NO ALVO', pxPct(fa, f), fmtNum(fa) + ' de ' + fmtNum(f) + (f === 1 ? ' finalização' : ' finalizações'), 'fin'),
        pxCard('CONVERSÃO', pxPct(fg, f), fmtNum(fg) + (fg === 1 ? ' gol' : ' gols') + ' de finalização', 'fin'));
      notas.push('Finalização = chute ou passe seu rumo ao gol adversário: a bola ia entrar (NO ALVO) ou foi um CHUTE forte na direção do gol que saiu. Passe para o lado não conta. CONVERSÃO = gols que saíram das suas finalizações.');
    } else if (PX.ctx === 'online') notas.push('Na sala online o jogo do anfitrião decide os lances: finalizações não são medidas lá.');
    G.appendChild(pxCard('TEMPO EM CAMPO', fmtTempo(s('t')), 'com a bola rolando'));
    if (PX.ctx === 'tudo' && Object.keys(perfil.est).some(k => k.indexOf('antigo|') === 0)) notas.push('TUDO inclui os números de antes da v70 (sem modo).');
    if (PX.ctx === 'casual') notas.push('CASUAL inclui a sala neste aparelho (você e os bots).');
  }
  E.nota.textContent = notas.join(' ');
}
function pxMeta(){                                      // a próxima meta: o título mais perto e o próximo nível
  const E = pxMonta(); if (!E) return;
  const falta = TITULOS.filter(T => !tituloGanho(T)).sort((a, b) => b.valor()/b.meta - a.valor()/a.meta)[0];
  const nv = nivelInfo(CONTA.xp), prox = nv.n + 1, gem = PREMIO.nivel.g + (prox % 5 ? 0 : PREMIO.nivel5.g);
  E.meta.textContent = '';
  E.meta.appendChild(nodo('small', 'pf-meta-rot', 'PRÓXIMA META'));
  if (falta){
    const v = Math.min(falta.meta, Math.floor(falta.valor()));
    E.meta.append(nodo('b', null, falta.nome), nodo('em', null, falta.req + ' · ' + (falta.id === 'craque' ? 'nível ' + v + '/' + falta.meta : fmtNum(v) + '/' + fmtNum(falta.meta))));
    E.meta.appendChild(barraDe(falta));
  } else E.meta.append(nodo('b', null, 'Todos os títulos!'), nodo('em', null, 'Você conquistou os ' + TITULOS.length + '.'));
  E.meta.appendChild(nodo('p', 'pf-meta-nv', 'Nível ' + prox + ' em ' + fmtNum(nv.prox - nv.atual) + ' XP: +' + fmtNum(PREMIO.nivel.m) + ' moedas e +' + gem + ' gemas'));
}
function pxClube(){                                     // o atalho do clube (o seu, ou o convite para criar/entrar)
  const E = pxMonta(); if (!E) return;
  const pinta = c => {
    E.clube.textContent = '';
    const i = nodo('span', 'pf-clube-esc'); i.appendChild(clbEscudo(c && c.escudo, 64));
    const t = nodo('span', 'pf-clube-tx'); t.append(nodo('small', null, 'CLUBE'), nodo('b', null, c ? c.nome : 'Ainda sem clube'), nodo('em', null, c ? (clbApi().tipo === 'local' ? 'neste aparelho' : 'na sua conta') : 'criar ou entrar'));
    const s = nodo('span', 'pf-clube-seta'); s.innerHTML = PX_SVG.seta;
    E.clube.append(i, t, s); E.clube.setAttribute('aria-label', c ? 'Seu clube: ' + c.nome : 'Clube: criar ou entrar num clube');
  };
  pinta(PX.clube || null);
  if (Date.now() - PX.clubeT < 8000) return;
  PX.clubeT = Date.now();
  Promise.resolve().then(() => clbApi().meu()).then(c => { PX.clube = c || null; if (lobby.tela === 'perfil') pinta(PX.clube); }).catch(() => {});
}
const renderPerfilAntes70p = renderPerfil;
renderPerfil = function(){
  const idt = pxIdentidade();
  renderPerfilAntes70p();
  const E = pxMonta(); if (!E) return;
  E.selo.textContent = idt.conta ? 'CONTA DO RACHA' : 'PERFIL LOCAL · SÓ NESTE APARELHO';
  E.selo.classList.toggle('conta', idt.conta);
  E.selo.title = idt.conta ? 'O nome e o ID são os da sua conta (os mesmos do clube e dos convites)' : 'Perfil e ID só deste aparelho (sem conta do RACHA)';
  if (E.idTx) E.idTx.textContent = idt.conta ? 'ID DA CONTA ' : 'ID LOCAL ';
  PF.uid.textContent = idt.id;
  LB.lapis.setAttribute('aria-label', idt.conta ? 'O nome é o da conta do RACHA' : 'Editar nome');
  // o cartão: os totais (partidas concluídas, gols de partida)
  const c = estSoma('c', EST_PARTIDA, null), v = estSoma('v', EST_PARTIDA, null);
  $('st-gols').textContent = fmtNum(estSoma('m', EST_PARTIDA, EST_GOL)); $('st-assist').textContent = fmtNum(estSoma('as', EST_PARTIDA, null));
  $('st-partidas').textContent = fmtNum(c); $('st-vitorias').textContent = fmtNum(v);
  $('st-aprov').textContent = pxPct(v, c); $('st-semsofrer').textContent = fmtNum(estSoma('ss', EST_PARTIDA, null));
  const lg = $('st-gols').nextElementSibling; if (lg) lg.textContent = 'GOLS EM PARTIDAS';
  const lp = $('st-partidas').nextElementSibling; if (lp) lp.textContent = 'PARTIDAS CONCLUÍDAS';
  // a caixa de baixo: no lugar da "precisão" (que contava passe como chute), as finalizações no alvo
  const f = estSoma('f', EST_PARTIDA.filter(x => x !== 'online'), EST_FIN), fa = estSoma('fa', EST_PARTIDA.filter(x => x !== 'online'), EST_FIN);
  const rot = PF.precA && PF.precA.previousElementSibling; if (rot) rot.textContent = 'FINALIZAÇÕES NO ALVO';
  PF.precA.textContent = f ? pxPct(fa, f) : '—';
  PF.precA2.textContent = f ? fmtNum(fa) + ' de ' + fmtNum(f) + ' · chute ou passe rumo ao gol' : 'chute ou passe rumo ao gol: ainda nenhum';
  pxEstRender(); pxMeta(); pxClube();
};

/* ---------------------------------------------------------------- 6) zerar o progresso */
let pxZerarT = 0;
function pxZerar(op){                                   // op.desenhos / op.replays / op.clube: true = apagar também
  op = op || {};
  const ident = {nome:perfil.nome, uid:perfil.uid, avatar:Object.assign({}, perfil.avatar), bio:perfil.bio};
  Object.assign(perfil, perfilPadrao(), ident);       // estatísticas (todas), títulos e os escolhidos do cartão
  const manter = {musica:CONTA.musica, faixa:CONTA.faixa, chatBrasil:CONTA.chatBrasil, menosAnim:CONTA.menosAnim, vibrar:CONTA.vibrar, onb:CONTA.onb,
    presentes:CONTA.presentes.slice(), vistos:Array.isArray(CONTA.vistos) ? CONTA.vistos.slice() : []};
  const rqPref = {n:CONTA.rq.n, mapa:CONTA.rq.mapa, mapaId:CONTA.rq.mapaId};
  Object.assign(CONTA, contaPadrao(), manter);        // moedas, gemas, XP, peças, missões, Top, liga
  Object.assign(CONTA.rq, rqPref);
  for (const k in TR.recs) delete TR.recs[k]; trSalvaRecs();   // os recordes dos treinos
  X49.seq = 0; X49.bestSeq = 0; X49.longest = 0; X49.fastest = 0; X49.history = []; X49.niveis = []; x49Save();   // sequências, recordes e histórico das partidas
  TP.itens.clear(); TP.equipada = ''; if (op.desenhos) TP.salvas = []; tpSalva();   // as peças compradas e a equipada (os desenhos: se pedir)
  try { localStorage.removeItem(TPE_RASCUNHO); } catch (_) {}
  if (op.replays){ try { localStorage.removeItem(CHAVE_REPLAYS); localStorage.removeItem(CHAVE_REPLAYS_REC); } catch (_) {} RP.cache = null; }
  if (op.clube && CLB_LOCAL.meu){ CLB_LOCAL.clubes = []; CLB_LOCAL.meu = null; clbLocalSalva(); CLB.meu = null; PX.clube = null; }
  semanaChecar(); contaSalvar();
  perfil.skin = tpMinha(); perfilSalvar();
  CONT.m = CONTA.moedas; CONT.g = CONTA.gemas; lbMusica();
  EMB.pop = 1; EMB.leveFeito = false; PFP.feito = false; PX.clubeT = 0;
  aviso('Progresso zerado'); lbRender();
}
zerarPerfil = function(){ pxZerar({}); };               // (quem chamava pelo nome antigo)
function pxOpcao(txt, nota){                            // uma escolha liga/desliga dentro da janela
  const b = novoBotao('v70-op'); b.setAttribute('aria-pressed', 'false');
  const t = nodo('span', 'v70-op-tx'); t.append(nodo('b', null, txt)); if (nota) t.append(nodo('small', null, nota));
  b.append(nodo('i', 'v70-op-ch'), t);
  b.addEventListener('click', () => { som.clique(); b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true')); });
  return b;
}
function pxZerarPop(){
  som.clique(); LB.aj.hidden = true;
  const nDes = TP.salvas.length, rp = rpLe(), nRp = rp.salvos.length + rp.recentes.length, clubeLocal = clbApi().tipo === 'local' && CLB_LOCAL.meu ? CLB_LOCAL.clubes.find(c => c.id === CLB_LOCAL.meu) : null;
  abrePop(c => {
    c.classList.add('v70-zerar');
    c.append(nodo('span', 'pop-tag', 'CONTA'), nodo('h2', null, 'ZERAR O PROGRESSO?'));
    const dois = nodo('div', 'v70-zerar-l');
    const apaga = nodo('div', 'v70-zerar-a'), fica = nodo('div', 'v70-zerar-m');
    apaga.append(nodo('b', null, 'APAGA'));
    const ua = nodo('ul'); for (const t of ['Moedas e gemas', 'Nível e XP', 'Estatísticas e títulos', 'Recordes dos treinos e das partidas', 'Histórico e sequências de vitórias', 'Liga contra bots, Top semanal e missões', 'Peças compradas (a tampinha volta para a Clássica)']) ua.appendChild(nodo('li', null, t));
    apaga.appendChild(ua);
    fica.append(nodo('b', null, 'FICA'));
    const uf = nodo('ul'); for (const t of ['Nome, ID, avatar e bio', 'Configurações: som, câmera, controles, teclas e tamanho da interface', 'O que você marcar abaixo para manter']) uf.appendChild(nodo('li', null, t));
    fica.appendChild(uf);
    dois.append(apaga, fica); c.appendChild(dois);
    const ops = nodo('div', 'v70-ops');
    const oD = pxOpcao('Apagar também os desenhos salvos', nDes ? nDes + (nDes === 1 ? ' tampinha salva' : ' tampinhas salvas') + ' no inventário' : 'nenhum salvo agora');
    const oR = pxOpcao('Apagar também os replays', nRp ? nRp + (nRp === 1 ? ' replay' : ' replays') + ' (salvos e últimos gols)' : 'nenhum agora');
    ops.append(oD, oR);
    let oC = null;
    if (clubeLocal){ oC = pxOpcao('Apagar também o clube deste aparelho', '«' + clubeLocal.nome + '»'); ops.appendChild(oC); }
    c.appendChild(ops);
    if (pxConta()) c.appendChild(nodo('p', 'pop-txt v70-zerar-nota', 'A sua conta do RACHA (nível da conta, conquistas e o clube da conta) não muda: isto só zera o que fica neste aparelho.'));
    c.appendChild(nodo('p', 'pop-txt v70-zerar-nota', 'Não dá para desfazer. Se quiser guardar uma cópia antes, use EXPORTAR PROGRESSO em Ajustes › Conta.'));
    const a = nodo('div', 'pop-acoes'), sim = botaoPop('ZERAR', 'vermelho', () => {
      if (!pxZerarT){ sim.textContent = 'TOQUE DE NOVO PARA ZERAR'; pxZerarT = setTimeout(() => { pxZerarT = 0; sim.textContent = 'ZERAR'; }, 3000); return; }
      clearTimeout(pxZerarT); pxZerarT = 0;
      const op = {desenhos:oD.getAttribute('aria-pressed') === 'true', replays:oR.getAttribute('aria-pressed') === 'true', clube:!!oC && oC.getAttribute('aria-pressed') === 'true'};
      fechaPop(); pxZerar(op);
    });
    a.append(botaoPop('CANCELAR', '', () => { som.clique(); clearTimeout(pxZerarT); pxZerarT = 0; fechaPop(); }), sim); c.appendChild(a);
  });
}
(function pxZerarBotao(){                               // o botão de Ajustes › Conta abre a janela nova (sem a confirmação antiga)
  const v = LB.zerar; if (!v) return;
  const n = v.cloneNode(true); v.replaceWith(n); LB.zerar = n;
  n.textContent = 'Zerar progresso';
  n.addEventListener('click', pxZerarPop);
  const tx = n.closest('.aj-lin') && n.closest('.aj-lin').querySelector('span');
  if (tx) tx.textContent = 'Zerar progresso: a janela mostra o que apaga e o que fica antes de confirmar';
})();

/* ---------------------------------------------------------------- 7) salvamento: o aviso, a falha e o arquivo */
const PX_SAVE = {memoria:window.RACHA_SEM_SALVAR === 'memoria', falhas:0, ultima:'', visto:false, el:null};
(function pxVigia(){                                    // falha de gravação (sem espaço, bloqueado): avisa, não fica calado
  try {                                                 // (no protótipo: atribuir no próprio localStorage viraria um item salvo)
    const SP = window.Storage && Storage.prototype, orig = SP && SP.setItem;
    if (!orig || orig.__v70) return;
    const novo = function(k, v){
      try { return orig.call(this, k, v); }
      catch (e){ PX_SAVE.falhas++; PX_SAVE.ultima = String(k); setTimeout(pxSalvaAviso, 0); throw e; }
    };
    novo.__v70 = true; SP.setItem = novo;
  } catch (_) {}
})();
function pxSalvaAviso(){                                // a faixa do lobby: o progresso não está ficando salvo
  if (!PX_SAVE.memoria && !PX_SAVE.falhas) return;
  let el = PX_SAVE.el;
  if (!el){
    el = PX_SAVE.el = nodo('div', 'v70-salva'); el.setAttribute('role', 'alert');
    const tx = nodo('span', 'v70-salva-tx'), bt = novoBotao('v70-salva-bt'), x = novoBotao('v70-salva-x');
    bt.textContent = 'EXPORTAR'; x.textContent = '✕'; x.setAttribute('aria-label', 'Fechar o aviso');
    bt.addEventListener('click', () => { som.clique(); pxExporta(); });
    x.addEventListener('click', () => { som.clique(); el.hidden = true; PX_SAVE.visto = true; });
    el.append(tx, bt, x); (document.getElementById('wrap') || document.body).appendChild(el);
  }
  el.querySelector('.v70-salva-tx').textContent = PX_SAVE.memoria
    ? 'Este navegador não deixa o jogo guardar nada: o progresso vale só até fechar a página. Exporte para não perder.'
    : 'Não deu para salvar o progresso (o armazenamento do navegador está cheio ou bloqueado). Exporte uma cópia.';
  if (PX_SAVE.falhas && PX_SAVE.visto && PX_SAVE.falhas < 3) return;
  el.hidden = false;
}
const PX_CHAVES = /^(streetball-|racha-)/;     // o que é do jogo no armazenamento do navegador
function pxExporta(){                                   // um arquivo com todo o progresso deste aparelho
  const dados = {};
  try { for (let i = 0; i < localStorage.length; i++){ const k = localStorage.key(i); if (k && PX_CHAVES.test(k) && k.indexOf('streetball-online-token') < 0) dados[k] = localStorage.getItem(k); } } catch (_) {}
  const arq = {jogo:'RACHA · Futebol de Rua', tipo:'progresso', versao:70, data:new Date().toISOString(), dados};
  try {
    const blob = new Blob([JSON.stringify(arq)], {type:'application/json'}), url = URL.createObjectURL(blob), a = document.createElement('a');
    const d = new Date(), dd = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    a.href = url; a.download = 'racha-progresso-' + dd + '.json'; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    aviso('Progresso exportado');
  } catch (e) { aviso('Não deu para exportar neste navegador'); }
  return arq;
}
function pxImportaTexto(txt){                           // confere o arquivo; devolve as chaves ou o motivo do erro
  let o = null; try { o = JSON.parse(txt); } catch (_) { return {erro:'O arquivo não é um progresso do RACHA.'}; }
  if (!o || o.tipo !== 'progresso' || !o.dados || typeof o.dados !== 'object') return {erro:'O arquivo não é um progresso do RACHA.'};
  const dados = {}; let n = 0;
  for (const k in o.dados){ if (PX_CHAVES.test(k) && typeof o.dados[k] === 'string' && o.dados[k].length < 4e6){ dados[k] = o.dados[k]; n++; } }
  if (!n) return {erro:'O arquivo está vazio.'};
  return {dados, n, data:o.data};
}
function pxImporta(){
  const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'application/json,.json';
  inp.addEventListener('change', () => {
    const f = inp.files && inp.files[0]; if (!f) return;
    const rd = new FileReader();
    rd.onload = () => {
      const r = pxImportaTexto(String(rd.result || ''));
      if (r.erro){ som.erro(); aviso(r.erro); return; }
      LB.aj.hidden = true;
      abrePop(c => {
        const quando = r.data ? new Date(r.data).toLocaleString('pt-BR') : '';
        c.append(nodo('span', 'pop-tag', 'CONTA'), nodo('h2', null, 'TROCAR PELO ARQUIVO?'),
          nodo('p', 'pop-txt', 'O progresso deste aparelho vira o do arquivo' + (quando ? ' (salvo em ' + quando + ')' : '') + '. O jogo recarrega em seguida.'));
        const a = nodo('div', 'pop-acoes');
        a.append(botaoPop('CANCELAR', '', () => { som.clique(); fechaPop(); }), botaoPop('IMPORTAR', 'verde', () => {
          try {
            const velhas = []; for (let i = 0; i < localStorage.length; i++){ const k = localStorage.key(i); if (k && PX_CHAVES.test(k) && k.indexOf('streetball-online-token') < 0) velhas.push(k); }
            for (const k of velhas) localStorage.removeItem(k);
            for (const k in r.dados) localStorage.setItem(k, r.dados[k]);
          } catch (e) { som.erro(); aviso('Não deu para gravar o progresso'); return; }
          fechaPop(); aviso('Progresso importado'); setTimeout(() => location.reload(), 500);
        }));
        c.appendChild(a);
      });
    };
    rd.readAsText(f);
  });
  inp.click();
}
(function pxContaAba(){                                 // Ajustes › Conta: o estado do salvamento, exportar e importar
  const sec = typeof AJX !== 'undefined' && AJX.secs && AJX.secs.conta; if (!sec) return;
  const g = nodo('div', 'ajx-grupo'); g.appendChild(nodo('h3', 'ajx-h', 'PROGRESSO NESTE APARELHO'));
  const st = nodo('p', 'ajx-nota v70-salva-st'); g.appendChild(st);
  const lin = nodo('div', 'aj-lin ajx-lin v70-arq'), e = novoBotao('lb-btn verde'), i = novoBotao('lb-btn');
  e.id = 'aj-exporta'; e.textContent = 'EXPORTAR PROGRESSO'; i.id = 'aj-importa'; i.textContent = 'IMPORTAR';
  e.addEventListener('click', () => { som.clique(); pxExporta(); });
  i.addEventListener('click', () => { som.clique(); pxImporta(); });
  lin.append(e, i); g.appendChild(lin);
  g.appendChild(nodo('p', 'ajx-nota', 'O arquivo leva moedas, gemas, nível, estatísticas, peças, desenhos, replays, recordes e configurações. Serve de cópia e para levar o progresso para outro navegador.'));
  const zl = LB.zerar && LB.zerar.closest('.aj-lin');
  if (zl && zl.parentNode === sec) sec.insertBefore(g, zl); else sec.appendChild(g);
  PX_SAVE.st = st;
})();
const ajxSyncAntes70p = typeof ajxSync === 'function' ? ajxSync : null;
if (ajxSyncAntes70p) ajxSync = function(){
  const r = ajxSyncAntes70p.apply(this, arguments);
  if (PX_SAVE.st) PX_SAVE.st.textContent = PX_SAVE.memoria ? '⚠ Este navegador não está guardando nada: o progresso some ao fechar a página.'
    : PX_SAVE.falhas ? '⚠ A última gravação falhou (armazenamento cheio ou bloqueado). Exporte uma cópia.' : '✓ Salvando neste aparelho (neste navegador).';
  return r;
};
pxSalvaAviso();
