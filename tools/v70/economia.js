/* ==================================================================================================================
   RACHA rua v70 · Etapa 4 — ECONOMIA, LOJA, MISSÕES, LIGA E DIFICULDADE
   1) Demonstração × produção: o presente de teste (50.000 moedas e 5.000 gemas) só existe na demonstração
      (window.RACHA_CONFIG.modo = 'demo', no config.js, ou ?demo=1 sem config). No lançamento (o padrão) ele não vem.
   2) Os ganhos: o treino livre paga moedas e XP só nos primeiros 15 gols do dia; cada exercício paga o prêmio cheio 3 vezes
      por dia (depois, 20% das moedas e metade do XP). O Top semanal conta: partidas (todos os gols), exercícios (até 20 gols
      por dia) e treino livre (até 10 por dia).
   3) As missões do dia (3, sorteadas para o dia: partidas concluídas, vitórias, liga, assistências, gols, mapa, modo,
      exercícios, estrelas) + o bônus das 3 + a série de 5 partidas concluídas. Só partida CONCLUÍDA conta.
   4) A loja num fluxo só: as peças da tampinha (o preço, o saldo, o que é seu, experimentar, comprar e equipar no editor),
      como ganhar moedas e gemas, a troca de gemas por moedas com confirmação e DESFAZER. Pacotes, caixas e passe: em breve,
      sem destaque e sem oferta de dinheiro.
   5) A ranqueada de hoje é a LIGA CONTRA BOTS (elo local): o nome diz isso, e o desafio cresce com o elo (mais partidas
      contra o Difícil). Na casual você escolhe os bots: Fácil, Difícil ou Aleatória.
   Nada aqui mexe na física nem nos atributos dos jogadores (tampinha é só aparência).
   ================================================================================================================== */

var ECO_PRONTO = false;                                  // (o lobby chama a faixa das missões no começo: ela espera este arquivo rodar)
/* ---------------------------------------------------------------- carregar (chamadas lá do começo do script) */
function contaCarregaV70(o){                            // os campos novos da conta (rodam antes deste arquivo: só usam o que já existe lá em cima)
  CONTA.pecas = Array.isArray(o.pecas) ? o.pecas.filter(x => typeof x === 'string' && /^[bfpi]:[a-z0-9-]{2}$/.test(x)).slice(0, 600) : [];
  const c = o.cap;
  CONTA.cap = c && typeof c === 'object' && Number.isInteger(c.dia) ? {dia:c.dia, livre:numOk(c.livre), topEx:numOk(c.topEx), avisou:!!c.avisou,
    ex:c.ex && typeof c.ex === 'object' ? Object.fromEntries(Object.entries(c.ex).filter(([k, v]) => typeof k === 'string' && k.length < 24).slice(0, 16).map(([k, v]) => [k, numOk(v)])) : {}} : null;
  const m = o.missoes;
  CONTA.missoes = m && typeof m === 'object' && Number.isInteger(m.dia) && Array.isArray(m.l) ? {dia:m.dia, bonus:!!m.bonus,
    l:m.l.filter(x => x && typeof x.id === 'string').slice(0, 3).map(x => ({id:String(x.id).slice(0, 12), alvo:Math.max(1, numOk(x.alvo) | 0), arg:typeof x.arg === 'string' || Number.isInteger(x.arg) ? x.arg : null,
      p:numOk(x.p), ok:!!x.ok}))} : null;
  CONTA.vistos = Array.isArray(o.vistos) ? o.vistos.filter(x => typeof x === 'string').slice(0, 40) : [];
}
function contaNovaV70(){                                // conta nova de verdade: as janelas de "novidade" de versões antigas não aparecem
  for (const k of ['v59', 'v61']) if (CONTA.presentes.indexOf(k) < 0) CONTA.presentes.push(k);
}

/* ---------------------------------------------------------------- 1) demonstração × produção */
const ECO = {demo:window.RACHA_MODO === 'demo', troca:null, trocaT:0, cumpridas:[]};
const ECO_CAP = {golLivre:15, exCheio:3, exResto:.2, topLivre:LIVRE_DIA_TOP, topEx:20};
const ECO_SERIE = {n:5, m:300};                          // a série: a cada 5 partidas concluídas (era 500 a cada 5)
const ECO_BONUS = {g:5};                                 // as 3 missões do dia
(function ecoDemo(){                                     // o selo DEMONSTRAÇÃO (o presente de teste só existe aqui)
  if (!ECO.demo) return;
  const m = document.querySelector('#rx .rx-marca'); if (!m) return;
  const s = nodo('span', 'v70-demo', 'DEMONSTRAÇÃO'); s.title = 'Versão de demonstração' + (window.RACHA_CONFIG && window.RACHA_CONFIG.presente === false ? '' : ': vem com o presente de teste (moedas e gemas)') + (window.RACHA_SEM_REDE ? ' · sem salas online (não tem servidor)' : ''); m.appendChild(s);
})();
const popPresenteAntes70e = popPresente;
popPresente = function(p){
  popPresenteAntes70e(p);
  const t = LB.popCaixa.querySelector('.pop-txt'); if (t) t.textContent = 'Presente de teste da DEMONSTRAÇÃO, para experimentar a loja à vontade. Na versão de lançamento ele não existe.';
};

/* ---------------------------------------------------------------- 2) os ganhos do dia (treino livre e exercícios) */
function ecoDia(){ const d = diaId(); if (!CONTA.cap || CONTA.cap.dia !== d) CONTA.cap = {dia:d, livre:0, topEx:0, ex:{}, avisou:false}; return CONTA.cap; }
ecoGol = function(tipo){                                // tipo: 'livre' (treino livre) · 'partida' · 'treino' (exercício: o prêmio vem no fim)
  try { window.RACHA_EVT && window.RACHA_EVT.treino(String(tipo)); } catch (_) {}
  semanaChecar();
  const cap = ecoDia();
  if (tipo === 'livre'){                               // o Top: até 10 gols do treino livre por dia
    const d = diaId(); if (CONTA.livre.dia !== d) CONTA.livre = {dia:d, n:0};
    if (CONTA.livre.n < ECO_CAP.topLivre){ CONTA.livre.n++; CONTA.semana.gols++; }
  } else if (tipo === 'treino'){ if (cap.topEx < ECO_CAP.topEx){ cap.topEx++; CONTA.semana.gols++; } }   // exercícios: até 20 por dia
  else CONTA.semana.gols++;                            // partidas: todos
  let p = null;
  if (tipo === 'livre'){
    if (cap.livre < ECO_CAP.golLivre){ cap.livre++; p = PREMIO.golLivre; }
    else if (!cap.avisou){ cap.avisou = true; aviso('Treino livre: as moedas de hoje acabaram (15 gols). Os gols seguem valendo para treinar.'); }
  } else if (tipo === 'partida') p = PREMIO.golPartida;
  ganhoGol = p ? p.m : 0;
  if (p) ganha(p); else contaSalvar();
};
ecoTreino = function(est, novo, chave){                 // o fim do exercício: cheio nas 3 primeiras do dia, depois reduzido
  const cap = ecoDia(), n = (cap.ex[chave] || 0) + 1; cap.ex[chave] = n;
  const cheio = n <= ECO_CAP.exCheio, b = PREMIO.treino[Math.max(0, Math.min(3, est | 0))];
  const p = {m:cheio ? b.m : Math.round(b.m*ECO_CAP.exResto), xp:cheio ? b.xp : Math.round(b.xp/2), g:0};
  if (novo) p.m += PREMIO.recorde.m;
  if (est >= 3 && CONTA.tres.indexOf(chave) < 0){ CONTA.tres.push(chave); p.g += PREMIO.tres.g; }
  const r = {p, subiu:ganha(p), nota:cheio ? '' : 'Prêmio reduzido: este exercício já pagou cheio ' + ECO_CAP.exCheio + ' vezes hoje.'};
  ecoMissao('treino', 1); if (est >= 2) ecoMissao('estrelas', 1);
  if (ECO.cumpridas.length){ r.nota = (r.nota ? r.nota + ' ' : '') + ecoCumpridasTxt(); }
  return r;
};
const premioNosAntes70e = premioNos;
premioNos = function(elm, pr){
  premioNosAntes70e(elm, pr);
  if (elm && pr && pr.nota){ const s = nodo('span', 'v70-premio-nota', pr.nota); elm.appendChild(s); }
};

/* ---------------------------------------------------------------- 3) as missões do dia e a série */
const MI = {
  concluir: {txt:n => 'Conclua ' + n + ' partidas', alvo:[2, 3], m:80, xp:25},
  vencer:   {txt:n => n === 1 ? 'Vença 1 partida' : 'Vença ' + n + ' partidas', alvo:[1, 2], m:90, xp:30},
  liga:     {txt:() => 'Conclua 1 partida da Liga contra bots', alvo:[1, 1], m:80, xp:25},
  assist:   {txt:n => 'Dê ' + n + (n === 1 ? ' assistência' : ' assistências') + ' em partidas', alvo:[1, 2], m:90, xp:30},
  marcar:   {txt:n => 'Marque ' + n + ' vezes em partidas (gol, cesta, touchdown ou ponto)', alvo:[2, 4], m:80, xp:25},
  semSofrer:{txt:() => 'Conclua 1 partida sem sofrer', alvo:[1, 1], m:120, xp:35},
  mapa:     {txt:(n, a) => 'Conclua 1 partida no mapa ' + (CAMPOS[a] || CAMPOS[0]).nome, alvo:[1, 1], m:80, xp:25},
  modo:     {txt:(n, a) => 'Conclua 1 partida de ' + (MD_MAP.get(a) || MD_LISTA[0]).nome.toLowerCase(), alvo:[1, 1], m:90, xp:30},
  treino:   {txt:n => 'Termine ' + n + ' exercícios do treino', alvo:[2, 2], m:70, xp:25},
  estrelas: {txt:() => 'Tire 2 estrelas ou mais num exercício', alvo:[1, 1], m:80, xp:25}
};
const MI_GRUPOS = [['concluir', 'vencer', 'liga'], ['assist', 'marcar', 'semSofrer'], ['mapa', 'modo', 'treino', 'estrelas']];
function ecoMissoes(){                                  // as 3 de hoje (sorteadas pelo dia: as mesmas o dia todo, neste aparelho)
  const d = diaId(), M = CONTA.missoes;
  if (M && M.dia === d && M.l.length === 3 && M.l.every(x => MI[x.id])) return M;
  const r = rndDe('missoes|' + d + '|' + perfil.uid), esc = a => a[Math.floor(r()*a.length) % a.length];
  const l = MI_GRUPOS.map(g => {
    const id = esc(g), D = MI[id], alvo = D.alvo[0] + Math.floor(r()*(D.alvo[1] - D.alvo[0] + 1));
    const arg = id === 'mapa' ? Math.floor(r()*CAMPOS.length) : id === 'modo' ? esc(MD_LISTA.filter(x => x.id !== 'futebol')).id : null;
    return {id, alvo, arg, p:0, ok:false};
  });
  return CONTA.missoes = {dia:d, l, bonus:false};
}
const miTexto = x => MI[x.id].txt(x.alvo, x.arg);
const miPronta = x => !x.ok && x.p >= x.alvo;
function ecoMissao(tipo, n, filtro){                    // um evento: soma nas missões do dia que contam ele
  const M = ecoMissoes(); let mudou = false;
  for (const x of M.l){
    if (x.id !== tipo || x.ok || x.p >= x.alvo) continue;
    if (filtro && !filtro(x)) continue;
    x.p = Math.min(x.alvo, x.p + (n || 1)); mudou = true;
    if (x.p >= x.alvo){ if (lobby.aberto) setTimeout(() => { try { aviso('Missão cumprida: ' + miTexto(x)); } catch (_) {} }, 400); else ECO.cumpridas.push(miTexto(x)); }   // (na partida: aparece na tela do fim)
  }
  if (mudou){ contaSalvar(); if (lobby.aberto) missoesWidget(); }
}
function ecoPartidaFim(R, ctx, info){                   // (estResultado) o fim de uma partida que valeu
  if (info.abandono) return;                           // missão é de partida concluída
  ecoMissao('concluir', 1);
  if (R.venceu && !info.empate) ecoMissao('vencer', 1);
  if (ctx === 'liga') ecoMissao('liga', 1);
  if (!info.sofreu) ecoMissao('semSofrer', 1);
  if ((R.golsH | 0) > 0) ecoMissao('marcar', R.golsH | 0);
  if ((R.assistH | 0) > 0) ecoMissao('assist', R.assistH | 0);
  ecoMissao('mapa', 1, x => x.arg === R.mapa);
  ecoMissao('modo', 1, x => x.arg === (R.jogo || 'futebol'));
}
function ecoCumpridasTxt(){ const l = ECO.cumpridas.splice(0); return l.length ? (l.length === 1 ? 'Missão cumprida: ' : 'Missões cumpridas: ') + l.join(' · ') + ' (pegue o prêmio em DESAFIOS).' : ''; }
const rqMostraFimAntes70e = rqMostraFim;
rqMostraFim = function(){                                  // a missão cumprida na partida aparece na tela do fim
  const r = rqMostraFimAntes70e.apply(this, arguments);
  try { const el = fimEl('fim-premio'); if (el && ECO.cumpridas.length){ el.appendChild(nodo('span', 'v70-premio-nota', ecoCumpridasTxt())); } } catch (_) {}
  return r;
};
function ecoSerie(){ const c = perfil.st.concluidas || 0; return {livres:Math.max(0, Math.floor(c/ECO_SERIE.n) - (CONTA.missaoPagas || 0)), feitas:c % ECO_SERIE.n}; }
function missoesWidget(){                               // a faixa DESAFIOS do lobby
  const el = LB.missoes; if (!el || !ECO_PRONTO) return;
  const M = ecoMissoes(), S = ecoSerie(), prontas = M.l.filter(miPronta).length + S.livres + (ecoBonusPronto() ? 1 : 0), feitas = M.l.filter(x => x.ok || x.p >= x.alvo).length;
  const resta = M.l.filter(x => !x.ok).reduce((s, x) => s + MI[x.id].m, 0);
  el.classList.toggle('pronta', prontas > 0);
  const tx = el.querySelector('.mi-tx'); if (tx) tx.textContent = prontas ? (prontas === 1 ? 'Pegar prêmio!' : 'Pegar ' + prontas + ' prêmios!') : 'Missões do dia';
  if (LB.miN) LB.miN.textContent = feitas + '/3';
  if (LB.miBarra) LB.miBarra.style.width = (100*feitas/3) + '%';
  const pr = el.querySelector('.mi-premio b'); if (pr) pr.textContent = fmtNum(resta || 0);
  el.setAttribute('aria-label', 'Desafios: ' + feitas + ' de 3 missões do dia' + (prontas ? ', ' + prontas + ' prêmio para pegar' : ''));
}
const ecoBonusPronto = () => { const M = ecoMissoes(); return !M.bonus && M.l.every(x => x.ok); };
function ecoPega(o){                                    // pegar um prêmio (missão, bônus ou série)
  const p = {m:o.m || 0, g:o.g || 0, xp:o.xp || 0};
  const subiu = ganha(p); som.moeda();
  aviso('+' + [p.m ? fmtNum(p.m) + ' moedas' : '', p.g ? p.g + ' gemas' : '', p.xp ? p.xp + ' XP' : ''].filter(Boolean).join(' · '));
  if (subiu.length) filaPop.push(() => filaPops());
  lbRender();
}
function missoesAbre(){
  abrePop(c => {
    c.classList.add('v70-mi');
    const M = ecoMissoes(), S = ecoSerie();
    c.append(nodo('span', 'pop-tag', 'DESAFIOS'), nodo('h2', null, 'MISSÕES DE HOJE'));
    const ul = nodo('ul', 'v70-mi-l');
    const linha = (txt, p, alvo, premio, pronta, feita, pega) => {
      const li = nodo('li', 'v70-mi-i' + (feita ? ' feita' : pronta ? ' pronta' : ''));
      const t = nodo('div', 'v70-mi-t'); t.append(nodo('b', null, txt));
      const bar = nodo('span', 'v70-mi-bar'), i = nodo('i'); i.style.width = (100*Math.min(1, p/alvo)) + '%'; bar.appendChild(i);
      t.append(bar, nodo('small', null, Math.min(p, alvo) + '/' + alvo));
      const pr = nodo('span', 'v70-mi-pr'); pr.innerHTML = premio;
      li.append(t, pr);
      if (feita) li.appendChild(nodo('span', 'v70-mi-ok', 'PAGO'));
      else if (pronta){ const b = botaoPop('PEGAR', 'verde', () => { pega(); missoesAbre(); }); li.appendChild(b); }
      ul.appendChild(li);
    };
    for (const x of M.l){ const D = MI[x.id]; linha(miTexto(x), x.p, x.alvo, '<i class="ic-moeda"></i>' + D.m + ' · ' + D.xp + ' XP', miPronta(x), x.ok, () => { x.ok = true; contaSalvar(); ecoPega({m:D.m, xp:D.xp}); }); }
    const todas = M.l.every(x => x.ok);
    linha('As 3 missões de hoje', M.l.filter(x => x.ok).length, 3, '<i class="ic-gema"></i>' + ECO_BONUS.g, todas && !M.bonus, M.bonus, () => { M.bonus = true; contaSalvar(); ecoPega({g:ECO_BONUS.g}); });
    linha('Série: a cada ' + ECO_SERIE.n + ' partidas concluídas', S.livres ? ECO_SERIE.n : S.feitas, ECO_SERIE.n, '<i class="ic-moeda"></i>' + ECO_SERIE.m, S.livres > 0, false,
      () => { CONTA.missaoPagas = (CONTA.missaoPagas || 0) + 1; contaSalvar(); ecoPega({m:ECO_SERIE.m}); });
    c.appendChild(ul);
    c.appendChild(nodo('p', 'pop-txt v70-mi-nota', 'Só partida concluída conta (sair no meio não vale). As missões mudam à meia-noite.'));
    const a = nodo('div', 'pop-acoes'); a.appendChild(botaoPop('FECHAR', '', () => { som.clique(); fechaPop(); })); c.appendChild(a);
  });
}

/* ---------------------------------------------------------------- 4) a loja: peças, como ganhar, troca de gemas */
const ECO_RAR = [['comum', 'Comum'], ['raro', 'Raro'], ['epico', 'Épico'], ['lendario', 'Lendário']];
const ecoPrecoHtml = pr => pr.g ? '<i class="ic-gema"></i>' + pr.g + ' gemas' : pr.m ? '<i class="ic-moeda"></i>' + fmtNum(pr.m) + ' moedas' : 'grátis';
function ecoPecas(){                                    // todas as peças à venda: tipo, item, preço e se já é sua
  const l = [];
  for (const [tipo, lista] of [['b', TP_BORDAS], ['p', TP_PADROES], ['i', TP_ICONES], ['f', TP_FORMAS]])
    for (const it of lista) if (it.pr !== 'gratis') l.push({tipo, it, pr:TP_PRECO[it.pr], tem:TP.itens.has(tpChave(tipo, it.id))});
  return l;
}
function ecoDestaques(){                                // 4 peças do dia que ainda não são suas (as mesmas o dia todo)
  const r = rndDe('loja|' + diaId()), l = ecoPecas().filter(x => !x.tem && x.tipo !== 'f');
  const out = [];
  for (const rar of ['comum', 'raro', 'epico', 'lendario']){ const c = l.filter(x => x.it.pr === rar); if (c.length) out.push(c[Math.floor(r()*c.length) % c.length]); }
  return out;
}
function ecoExperimenta(x){                             // abre o editor com a peça na sua tampinha (a compra é lá, com o preço)
  const D = tpLe(tpMinha()) || TP_PADRAO_D();
  if (x.tipo === 'b') D.b = x.it.id; else if (x.tipo === 'p'){ D.p = x.it.id; if (!D.pp) D.pp = [50, 50, 50, 0]; } else if (x.tipo === 'i'){ D.i = x.it.id; if (x.it.texto && !D.t) D.t = 'RACHA'; }
  ED.experimenta = {D, aba:x.tipo === 'b' ? 'b' : x.tipo === 'p' ? 'p' : 'i'};
  abreTela('skins', 'loja');
}
let ecoLojaMontada = false;
function ecoLojaMonta(){
  const corpo = TELAS.loja.el && TELAS.loja.el.querySelector('.lj-corpo'); if (!corpo || ecoLojaMontada) return corpo;
  ecoLojaMontada = true;
  // os pacotes (em breve) saem do topo: viram uma linha discreta no fim, sem oferta de dinheiro
  const subPac = corpo.querySelector('h3.tl-sub'); if (subPac && /PACOTES/.test(subPac.textContent)) subPac.hidden = true;
  if (LB.ljPacotes) LB.ljPacotes.hidden = true;
  if (LB.ljDiscos) LB.ljDiscos.hidden = true;
  const pecas = nodo('section', 'v70-lj-pecas'); pecas.setAttribute('aria-label', 'Peças da tampinha');
  const como = nodo('section', 'v70-lj-como'); como.setAttribute('aria-label', 'Como ganhar moedas e gemas');
  const breve = nodo('p', 'tl-nota v70-lj-breve', 'Em breve: pacotes e caixas. Nesta versão nada é vendido por dinheiro: moedas e gemas vêm só de jogar.');
  corpo.insertBefore(pecas, corpo.firstChild);
  const trocaSub = Array.from(corpo.querySelectorAll('h3.tl-sub')).find(h => /TROCAR/.test(h.textContent));
  corpo.insertBefore(como, trocaSub || null);
  corpo.appendChild(breve);
  return corpo;
}
const renderLojaAntes70e = renderLoja;
renderLoja = function(){
  renderLojaAntes70e();
  const corpo = ecoLojaMonta(); if (!corpo) return;
  const sec = corpo.querySelector('.v70-lj-pecas'), como = corpo.querySelector('.v70-lj-como');
  const todas = ecoPecas(), tem = todas.filter(x => x.tem).length;
  sec.textContent = '';
  const cab = nodo('div', 'v70-lj-cab');
  cab.append(nodo('h3', 'tl-sub', 'PEÇAS DA TAMPINHA'), nodo('span', 'v70-lj-tem', 'Suas: ' + tem + ' de ' + todas.length + ' à venda (fora as grátis)'));
  sec.appendChild(cab);
  const tab = nodo('div', 'v70-lj-precos');
  for (const [k, nome] of ECO_RAR){ const s = nodo('span', 'v70-lj-pr tpe-r-' + k); s.innerHTML = '<b>' + nome + '</b>' + ecoPrecoHtml(TP_PRECO[k]); tab.appendChild(s); }
  sec.appendChild(tab);
  sec.appendChild(nodo('p', 'tl-nota', 'Cada peça é sua para sempre e vale em todas as tampinhas (as formas, nos escudos). Escolha, veja o preço, compre e equipe no editor da tampinha. Só aparência: nenhuma peça muda o jogo.'));
  const dq = ecoDestaques();
  if (dq.length){
    sec.appendChild(nodo('b', 'v70-lj-dest-t', 'EM DESTAQUE HOJE'));
    const g = nodo('div', 'v70-lj-dest');
    for (const x of dq){
      const D = tpLe(tpMinha()) || TP_PADRAO_D();
      if (x.tipo === 'b') D.b = x.it.id; else if (x.tipo === 'p'){ D.p = x.it.id; } else if (x.tipo === 'i'){ D.i = x.it.id; if (x.it.texto && !D.t) D.t = 'RACHA'; }
      const b = novoBotao('v70-lj-peca'); b.setAttribute('aria-label', 'Experimentar ' + x.it.nome);
      const cvs = tpMiniatura(D, 96); cvs.setAttribute('aria-hidden', 'true');
      const t = nodo('span', 'v70-lj-peca-t'); t.append(nodo('small', null, {b:'BORDA', p:'PADRÃO', i:'ÍCONE', f:'FORMA'}[x.tipo] + ' · ' + TP_PRECO[x.it.pr].nome.toUpperCase()), nodo('b', null, x.it.nome));
      const pr = nodo('em', 'v70-lj-peca-pr'); pr.innerHTML = ecoPrecoHtml(x.pr);
      b.append(cvs, t, pr, nodo('span', 'v70-lj-peca-x', 'EXPERIMENTAR'));
      b.addEventListener('click', () => { som.clique(); ecoExperimenta(x); });
      g.appendChild(b);
    }
    sec.appendChild(g);
  }
  const ir = novoBotao('lb-btn amarelo v70-lj-ir'); ir.textContent = 'PERSONALIZAR A TAMPINHA';
  ir.addEventListener('click', () => { som.clique(); abreTela('skins', 'loja'); });
  sec.appendChild(ir);
  como.textContent = '';
  como.appendChild(nodo('h3', 'tl-sub', 'COMO GANHAR'));
  const ul = nodo('ul', 'v70-lj-ganhos');
  const it = (html) => { const li = nodo('li'); li.innerHTML = html; ul.appendChild(li); };
  it('<b>Partida concluída</b> <i class="ic-moeda"></i>' + PREMIO.partida.m + ' · vitória +' + PREMIO.vitoria.m + ' · cada gol seu +' + PREMIO.golPartida.m);
  it('<b>Missões do dia</b> <i class="ic-moeda"></i>70 a 120 cada · as 3: <i class="ic-gema"></i>' + ECO_BONUS.g + ' · série de ' + ECO_SERIE.n + ' partidas: <i class="ic-moeda"></i>' + ECO_SERIE.m);
  it('<b>Exercícios</b> até <i class="ic-moeda"></i>' + PREMIO.treino[3].m + ' por 3 estrelas (cheio 3× por dia) · 3 estrelas pela 1ª vez: <i class="ic-gema"></i>' + PREMIO.tres.g);
  it('<b>Cada nível novo</b> <i class="ic-moeda"></i>' + PREMIO.nivel.m + ' e <i class="ic-gema"></i>' + PREMIO.nivel.g + ' · a cada 5 níveis +' + PREMIO.nivel5.g + ' gemas');
  it('<b>Top semanal</b> prêmio pela posição na virada de domingo para segunda (liga contra bots)');
  it('<b>Treino livre</b> <i class="ic-moeda"></i>' + PREMIO.golLivre.m + ' por gol, até ' + ECO_CAP.golLivre + ' gols por dia');
  como.appendChild(ul);
};
LB.ljTrocas && LB.ljTrocas.addEventListener('click', e => {   // (a troca direta saiu: o clique abre a confirmação)
  const b = e.target.closest('.lj-troca'); if (!b || b.disabled) return;
  e.stopImmediatePropagation(); ecoTrocaPede(+b.dataset.g, +b.dataset.m);
}, true);
function ecoTrocaPede(g, m){
  if (CONTA.gemas < g){ som.erro(); return; }
  som.clique();
  abrePop(c => {
    c.append(nodo('span', 'pop-tag', 'LOJA'), nodo('h2', null, 'TROCAR GEMAS POR MOEDAS?'));
    const p = nodo('p', 'pop-txt'); p.innerHTML = 'Você dá <i class="ic-gema"></i> <b>' + g + ' gemas</b> e recebe <i class="ic-moeda"></i> <b>' + fmtNum(m) + ' moedas</b>.<br>Depois: ' + fmtNum(CONTA.gemas - g) + ' gemas · ' + fmtNum(CONTA.moedas + m) + ' moedas. Dá para desfazer logo em seguida.';
    c.appendChild(p);
    const a = nodo('div', 'pop-acoes');
    a.append(botaoPop('CANCELAR', '', () => { som.clique(); fechaPop(); }), botaoPop('TROCAR', 'verde', () => { fechaPop(); ecoTroca(g, m); }));
    c.appendChild(a);
  });
}
function ecoTroca(g, m){
  if (CONTA.gemas < g) return;
  CONTA.gemas -= g; CONTA.moedas += m; contaSalvar(); som.moeda(); renderLoja(); lbCarteira();
  ECO.troca = {g, m, t:Date.now()};
  v70Desfazer('Troca feita: +' + fmtNum(m) + ' moedas', () => {
    const t = ECO.troca; if (!t) return;
    if (CONTA.moedas < t.m){ som.erro(); aviso('Não dá para desfazer: as moedas já foram usadas'); return; }
    CONTA.moedas -= t.m; CONTA.gemas += t.g; ECO.troca = null; contaSalvar(); som.clique(); aviso('Troca desfeita'); renderLoja(); lbCarteira();
  }, 10000, () => { ECO.troca = null; });
}
const V70D = {el:null, t:0, fim:null};
function v70Desfazer(txt, desfaz, ms, acabou){           // a faixa de baixo com DESFAZER (troca de gemas, desenho apagado…)
  if (V70D.fim){ const f = V70D.fim; V70D.fim = null; try { f(); } catch (_) {} }
  let el = V70D.el;
  if (!el){
    el = V70D.el = nodo('div', 'v70-desfaz'); el.setAttribute('role', 'status'); el.setAttribute('aria-live', 'polite');
    el.append(nodo('span', 'v70-desfaz-tx'), novoBotao('v70-desfaz-bt'));
    (document.getElementById('wrap') || document.body).appendChild(el);
  }
  el.querySelector('.v70-desfaz-tx').textContent = txt;
  const bt = el.querySelector('.v70-desfaz-bt'), nb = bt.cloneNode(false); nb.textContent = 'DESFAZER'; bt.replaceWith(nb);
  nb.addEventListener('click', () => { clearTimeout(V70D.t); el.hidden = true; V70D.fim = null; desfaz(); });
  el.hidden = false; clearTimeout(V70D.t); V70D.fim = acabou || null;
  V70D.t = setTimeout(() => { el.hidden = true; const f = V70D.fim; V70D.fim = null; if (f) f(); }, ms || 8000);
}
delete GRUPOS.vestiario;                                 // a loja sem a aba CAIXAS (em breve: fica só a linha discreta)

/* ---------------------------------------------------------------- 5) liga contra bots e a dificuldade */
const ECO_LIGA_DIF = {bronze:.25, prata:.4, ouro:.55, platina:.7, diamante:.85, mestre:.9, lenda:.95};   // chance de pegar o Difícil, pelo elo
const NIVEL_CAS = [['facil', 'FÁCIL'], ['dificil', 'DIFÍCIL'], ['aleatoria', 'ALEATÓRIA']];
try { const o = JSON.parse(localStorage.getItem(X49_KEY) || 'null'); if (o && NIVEL_CAS.some(n => n[0] === o.nivelCas)) X49.nivelCas = o.nivelCas; } catch (_) {}
if (!X49.nivelCas) X49.nivelCas = 'aleatoria';
const rqSorteiaNivelAntes70e = rqSorteiaNivel;
rqSorteiaNivel = function(){
  if (RQ.forcaNivel && RQ_NIVEIS[RQ.forcaNivel]) return RQ.forcaNivel;   // (testes)
  if (X49.mode === 'ranked'){                           // a liga: o desafio cresce com o elo
    const p = ECO_LIGA_DIF[rqElo(CONTA.rq.pts).elo.id]; return Math.random() < (p == null ? .5 : p) ? 'dificil' : 'facil';
  }
  if (X49.nivelCas === 'facil' || X49.nivelCas === 'dificil') return X49.nivelCas;
  return rqSorteiaNivelAntes70e();                       // aleatória: meio a meio, nunca 3 iguais seguidas
};
function rqNivelTexto(){ return X49.mode === 'ranked' ? 'LIGA: BOTS ' : X49.nivelCas === 'aleatoria' ? 'SORTEIO: BOTS ' : 'BOTS '; }
function rqNivelCurto(){ return X49.nivelCas === 'facil' ? 'BOTS FÁCEIS' : X49.nivelCas === 'dificil' ? 'BOTS DIFÍCEIS' : 'BOTS SORTEADOS'; }
function rqNivelDesc(){ return X49.nivelCas === 'facil' ? 'Bots no Fácil.' : X49.nivelCas === 'dificil' ? 'Bots no Difícil.' : 'Bots: o jogo sorteia Fácil ou Difícil em cada partida.'; }
function ligaNota(){
  const e = rqElo(CONTA.rq.pts), p = Math.round(100*(ECO_LIGA_DIF[e.elo.id] == null ? .5 : ECO_LIGA_DIF[e.elo.id]));
  return 'Liga contra bots, com elo deste aparelho (não é competição online). Primeiro a 3 gols vence · vitória +25 a +41 pontos (contra o Difícil, +6) · derrota −16 a −20 (no Bronze, a metade) · sair no meio conta derrota (−25). '
    + 'O desafio cresce com o elo: no ' + e.elo.nome + ', ' + p + '% das partidas são contra o Difícil.';
}
(function ecoBotsEscolha(){                              // JOGAR › CASUAL: a escolha dos bots (Fácil, Difícil, Aleatória)
  const velho = document.querySelector('#lb-rq .rq-sorteio'); if (!velho) return;
  const box = nodo('div', 'v70-bots'), seg = nodo('div', 'tl-seg v70-bots-seg'), nota = nodo('p', 'v70-bots-nota');
  seg.setAttribute('role', 'radiogroup'); seg.setAttribute('aria-label', 'Nível dos bots');
  for (const [k, nome] of NIVEL_CAS){ const b = novoBotao('', nome); b.textContent = nome; b.dataset.nv = k; b.setAttribute('role', 'radio'); seg.appendChild(b); }
  seg.addEventListener('click', e => { const b = e.target.closest('[data-nv]'); if (!b) return; som.clique(); X49.nivelCas = b.dataset.nv; x49Save(); renderRanqueada(); try { LB.rapidoSub.textContent = rapidoTexto(); } catch (_) {} });
  box.append(seg, nota); velho.replaceWith(box);
  ECO.bots = {box, seg, nota};
})();
const renderRanqueadaAntes70e = renderRanqueada;
renderRanqueada = function(){
  renderRanqueadaAntes70e();
  const B2 = ECO.bots, rq = JG.aba === 'ranked';
  if (B2){
    B2.seg.hidden = rq;
    for (const b of B2.seg.children){ const on = b.dataset.nv === X49.nivelCas; b.classList.toggle('on', on); b.setAttribute('aria-checked', String(on)); b.tabIndex = on ? 0 : -1; }
    const e = rqElo(CONTA.rq.pts), p = Math.round(100*(ECO_LIGA_DIF[e.elo.id] == null ? .5 : ECO_LIGA_DIF[e.elo.id]));
    B2.nota.textContent = rq ? 'O desafio cresce com o seu elo: no ' + e.elo.nome + ', ' + p + '% das partidas são contra o Difícil (vale +6 pontos).'
      : X49.nivelCas === 'aleatoria' ? 'O jogo sorteia em cada partida (nunca 3 iguais seguidas).' : X49.nivelCas === 'facil' ? 'Bots mais lentos para decidir e chutar: bom para aprender.' : 'Bots rápidos, que tabelam, marcam de perto e chutam bem.';
  }
  const ab = RQP.abas && RQP.abas.querySelector('[data-aba="ranked"] span'); if (ab) ab.textContent = 'LIGA (BOTS)';
  const tit = RQP.cabRq && RQP.cabRq.querySelector('.rq-tit'); if (tit && tit.firstChild && tit.firstChild.nodeType === 3) tit.firstChild.textContent = 'LIGA CONTRA BOTS';
  if (rq && RQP.buscar) RQP.buscar.textContent = 'JOGAR NA LIGA';
};
(function ecoLigaLobby(){                                 // o botão do lobby: LIGA contra bots (e o PASSE, em breve, vai para o fim e sem destaque)
  const rq = document.querySelector('#rx [data-rx="ranqueada"]');
  if (rq){ const b = rq.querySelector('b'), s = rq.querySelector('small'); if (b) b.textContent = 'LIGA';
    if (s){ const elo = s.querySelector('#lb-rq-elo'); s.textContent = 'CONTRA BOTS · '; if (elo) s.appendChild(elo); }
    rq.setAttribute('aria-label', 'Liga contra bots (elo local)'); }
  const pa = document.querySelector('#rx [data-rx="passe"]');
  if (pa){ pa.classList.add('v70-mudo'); const s = pa.querySelector('small'); if (s) s.textContent = 'EM BREVE · SEM TEMPORADA'; pa.setAttribute('aria-label', 'Passe: em breve, sem temporada ativa'); pa.parentNode.appendChild(pa); }
  const emb = document.querySelector('#tela-perfil .e-rq small'); if (emb) emb.textContent = 'LIGA (BOTS)';
})();

/* ---------------------------------------------------------------- 6) o Top semanal: as regras na tela */
const renderRankingAntes70e = renderRanking;
renderRanking = function(){
  renderRankingAntes70e();
  const nota = TELAS.ranking.el && TELAS.ranking.el.querySelector('.rk-corpo > .tl-nota');
  if (nota) nota.textContent = 'Liga semanal contra ' + RIVAIS.length + ' bots (BOT na lista: o placar deles é simulado, não são pessoas). Contam os seus gols: em partidas, todos; nos exercícios, até '
    + ECO_CAP.topEx + ' por dia; no treino livre, até ' + ECO_CAP.topLivre + ' por dia. A semana vira toda segunda-feira à meia-noite e o prêmio sai pela posição.';
};
const renderTreinoAntes70e = renderTreino;
renderTreino = function(){                               // o Treino livre diz o limite de moedas do dia (e o do Top)
  renderTreinoAntes70e();
  const c = trCards.get('livre'); if (!c) return;
  const cap = ecoDia(), resta = Math.max(0, ECO_CAP.golLivre - cap.livre);
  c.rec.textContent = ''; c.rec.append(nodo('i', null, resta ? 'moedas nos ' + ECO_CAP.golLivre + ' primeiros gols do dia (faltam ' + resta + ') · no Top, até ' + ECO_CAP.topLivre : 'as moedas de hoje acabaram · gols seguem valendo para treinar'));
};
const montaAbasAntes70e = montaAbas;
montaAbas = function(){                                  // o título de cada tela diz onde você está (o RANKING não diz mais PERFIL)
  montaAbasAntes70e();
  const tit = {ranking:'RANKING', replays:'REPLAYS', loja:'LOJA', caixas:'CAIXAS', treino:'TREINAMENTO'};   // v70 · Etapa 6: o mesmo nome do botão do lobby
  for (const id in tit){ const T = TELAS[id]; const h = T && T.el && T.el.querySelector('.tl-cab h2'); if (h) h.textContent = tit[id]; }
};

ECO_PRONTO = true;
missoesWidget();
