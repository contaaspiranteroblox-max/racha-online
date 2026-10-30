/* ======================================================================================================================
   RACHA v90 · A TELA DE RANKING (o botão RANKING do lobby). As regras e os dados são do servidor (app/api/racha/v90/
   ranking.ts e app/contracts/v90.ts): aqui o jogo só MOSTRA — nenhum número, nome ou tampinha é inventado no aparelho.
   · 4 categorias: GOLS, ASSISTÊNCIAS, PONTOS RANQUEADOS e CRAQUE DO JOGO, cada uma com a sua cor;
   · o pódio (TOP 1 no meio, TOP 2 à esquerda, TOP 3 à direita: ouro, prata e bronze) com a tampinha de verdade de cada um;
     no de assistências, as linhas de passe em volta do TOP 1;
   · a lista do TOP 4 ao TOP 20 (rola), com a tampinha, o nome, a patente, o número e o botão do perfil;
   · a faixa fixa embaixo com a MINHA POSIÇÃO (mesmo fora do TOP 20) e quanto falta para entrar;
   · TEMPORADAS ANTERIORES (a classificação final congelada) e PRÊMIOS DO TOP 3 (só cosméticos);
   · os estados: carregando, erro (tentar de novo), vazio, sem internet/sem a plataforma.
   Nada aqui mexe na partida, na física, nas contas ou nas moedas.
   ====================================================================================================================== */
const V90RK = {cat:'assistencias', temp:null, temporadas:null, dados:{}, carregando:{}, erro:{}, pedidoT:0};
const V90_CATS = [
  ['gols', 'GOLS', 'GOLS', 'gols'],
  ['assistencias', 'ASSISTÊNCIAS', 'ASSIST.', 'passe'],
  ['pontos', 'PONTOS RANQUEADOS', 'PTS', 'coroa'],
  ['craque', 'CRAQUE DO JOGO', 'PRÊMIOS', 'estrela'],
];
const v90Cat = id => V90_CATS.find(c => c[0] === id) || V90_CATS[1];
const V90_SVG = {
  gols:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="#f3efe6"/><path d="M12 7l3.8 2.8-1.4 4.4H9.6L8.2 9.8z" fill="#1b1b1d"/><path d="M12 7V3M15.8 9.8l3.8-1.2M14.4 14.2l2.4 3.2M9.6 14.2l-2.4 3.2M8.2 9.8L4.4 8.6" stroke="#1b1b1d" stroke-width="1.4"/></svg>',
  passe:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 17c4-8 10-10 17-9" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-dasharray="3 3.4"/><path d="M16 4.6l4.4 3.4-4 3.8" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><circle cx="5" cy="18" r="3" fill="currentColor"/></svg>',
  coroa:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 18L2 7l5 4 5-7 5 7 5-4-1 11z" fill="currentColor"/><rect x="3" y="19" width="18" height="2.4" rx="1" fill="currentColor"/></svg>',
  estrela:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.6l2.8 5.8 6.4.9-4.6 4.5 1.1 6.3L12 17.1l-5.7 3 1.1-6.3-4.6-4.5 6.4-.9z" fill="currentColor"/></svg>',
  escudo:c => '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l8 3v6c0 5-3.4 8.6-8 10.4C7.4 19.6 4 16 4 11V5z" fill="' + c + '"/></svg>',
  perfil:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4" fill="currentColor"/><path d="M4 21c0-4.6 3.6-7.4 8-7.4s8 2.8 8 7.4z" fill="currentColor"/></svg>',
  historico:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4h4" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="M12 8v4.5l3 2" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
  coroaPodio:'<svg class="rk90-coroa" viewBox="0 0 64 40" aria-hidden="true"><path d="M4 36L2 8l15 12L32 2l15 18 15-12-2 28z" fill="#f5c542" stroke="#6b4a00" stroke-width="2.5" stroke-linejoin="round"/><circle cx="32" cy="24" r="4" fill="#e2412f"/></svg>',
  passes:'<svg class="rk90-passes" viewBox="0 0 340 340" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"><path class="rk90-traco" d="M34 214 C 30 120, 100 40, 206 40" stroke-dasharray="2 12"/><path class="rk90-traco" d="M306 126 C 326 170, 322 214, 302 250" stroke-dasharray="2 12"/></g><g fill="currentColor"><path d="M206 28 l22 12 l-22 12 z"/><path d="M290 246 l18 16 l2 -24 z"/></g><circle cx="170" cy="170" r="150" fill="none" stroke="currentColor" stroke-width="2" opacity=".35"/></svg>',
};
// a cor da patente (a mesma do escudo: app/contracts/patentes.ts)
const V90_COR_PATENTE = {bronze:'#c87a4a', prata:'#c3ccd8', ouro:'#ffc928', platina:'#2fd3c4', diamante:'#3f7fff', elite:'#a64dff', mestre:'#ff3b3b', lendario:'#ffcb2e'};
const v90CorPatente = p => (p && V90_COR_PATENTE[p.id]) || '#9aa4ad';
const v90Num = n => fmtNum(Math.max(0, +n || 0));

// a tampinha de verdade de um jogador (o código T.… da conta); sem tampinha guardada, a padrão do jogo
function v90TampaEl(cod, tam, cls){
  const c = document.createElement('canvas'), px = Math.round(tam*Math.min(2, window.devicePixelRatio || 1));
  c.width = c.height = px; c.className = 'rk90-tp' + (cls ? ' ' + cls : ''); c.setAttribute('aria-hidden', 'true');
  try {
    let D = cod && typeof tpLe === 'function' ? tpLe(cod) : null;
    if (!D || D.k !== 'T') D = tpLe(TP_PADRAO_COD);
    const m = tpMiniatura(D, px); c.getContext('2d').drawImage(m, 0, 0, px, px);
  } catch (_) {}
  return c;
}
function v90Patente(p, cls){
  const s = nodo('span', 'rk90-pat' + (cls ? ' ' + cls : ''));
  s.innerHTML = V90_SVG.escudo(v90CorPatente(p));
  s.appendChild(document.createTextNode(p ? (p.nome + (p.divisao ? ' ' + p.divisao : '')).toUpperCase() : '—'));
  return s;
}

/* ---------------------------------------------------------------- os dados (do servidor) */
function v90Chave(){ return (V90RK.temp || 'vigente') + '|' + V90RK.cat; }
function v90Carrega(forca){
  const k = v90Chave(), d = V90RK.dados[k];
  if (!forca && d && Date.now() - d.em < 30000) return;
  if (V90RK.carregando[k]) return;
  if (!v88TemPlataforma()){ V90RK.erro[k] = 'sem'; v88Repinta('ranking'); return; }
  V90RK.carregando[k] = true; V90RK.erro[k] = '';
  const inp = {categoria:V90RK.cat}; if (V90RK.temp) inp.temporada = V90RK.temp;
  v88Q('ranking.top', inp).then(r => { V90RK.dados[k] = {em:Date.now(), r}; }).catch(e => { V90RK.erro[k] = (e && e.message) || 'erro'; })
    .then(() => { V90RK.carregando[k] = false; v88Repinta('ranking'); });
  if (!V90RK.temporadas) v88Q('ranking.temporadas').then(t => { V90RK.temporadas = t; v88Repinta('ranking'); }).catch(() => {});
}

/* ---------------------------------------------------------------- a tela */
const V90RK_TELA = v88Tela('ranking', {
  titulo:'RANKING', ic:'trofeu', carteira:false,
  abre:() => { v90Carrega(false); },
  render:T => v90RkRender(T),
});
V90RK_TELA.el.classList.add('rk90-tela');

function v90RkRender(T){
  const corpo = T.corpo; corpo.textContent = '';
  const cat = v90Cat(V90RK.cat), k = v90Chave(), pacote = V90RK.dados[k], r = pacote && pacote.r;
  const raiz = nodo('div', 'rk90 c-' + cat[0]);
  // a temporada e os botões de cima
  const topo = nodo('div', 'rk90-topo');
  const t = r && r.temporada;
  const chip = nodo('div', 'rk90-temp');
  if (t){
    chip.appendChild(nodo('span', 'rk90-temp-tag', t.id));
    const tx = nodo('div'); tx.appendChild(nodo('b', null, t.nome));
    tx.appendChild(nodo('small', null, t.estado === 'fechada' ? 'TEMPORADA ENCERRADA · CLASSIFICAÇÃO FINAL' : Date.now() < t.fim ? 'TERMINA EM ' + v88Falta(t.fim).toUpperCase() : 'FECHANDO A TEMPORADA…'));
    chip.appendChild(tx);
  } else chip.appendChild(nodo('b', null, 'TEMPORADA'));
  topo.appendChild(chip);
  const btHist = v88Bt('rk90-bt', null, () => v90PopTemporadas(), 'Temporadas anteriores'); btHist.innerHTML = V90_SVG.historico + '<span>TEMPORADAS</span>';
  const btPremio = v88Bt('rk90-bt', null, () => v90PopPremios(), 'Prêmios do TOP 3'); btPremio.innerHTML = V90_SVG.estrela + '<span>PRÊMIOS DO TOP 3</span>';
  topo.append(btHist, btPremio);
  raiz.appendChild(topo);
  // as abas das categorias
  const abas = nodo('nav', 'rk90-abas'); abas.setAttribute('role', 'tablist'); abas.setAttribute('aria-label', 'Categorias do ranking');
  for (const c of V90_CATS){
    const b = v88Bt('rk90-aba c-' + c[0] + (c[0] === cat[0] ? ' on' : ''), null, () => { if (V90RK.cat === c[0]) return; V90RK.cat = c[0]; v90Carrega(false); v88Repinta('ranking'); }, c[1]);
    b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', String(c[0] === cat[0]));
    b.innerHTML = V90_SVG[c[3]] + '<span>' + c[1] + '</span>';
    abas.appendChild(b);
  }
  raiz.appendChild(abas);
  // o corpo: pódio + lista, ou o estado
  const meio = nodo('div', 'rk90-meio');
  const erro = V90RK.erro[k];
  if (erro === 'sem') v90Estado(meio, 'O ranking precisa da internet', 'O TOP 20 vem do servidor do RACHA. Abra o jogo pelo endereço do RACHA (o site) e com internet.');
  else if (erro) v88Erro(meio, erro, () => v90Carrega(true));
  else if (!r){ v88Carregando(meio, 'Carregando o ranking…'); v90Carrega(false); }
  else if (!r.temporada) v90Estado(meio, 'Nenhuma temporada ainda', 'O ranking começa quando a primeira temporada abrir.');
  else if (!r.lista.length) v90Estado(meio, 'Ninguém pontuou ainda', cat[0] === 'pontos' ? 'Jogue a RANQUEADA para aparecer aqui.' : 'Só contam as partidas ONLINE (o servidor confere cada gol e cada assistência). Jogue nas salas ou na ranqueada para aparecer aqui.');
  else { meio.appendChild(v90Podio(r.lista.slice(0, 3), cat)); meio.appendChild(v90Lista(r.lista.slice(3), cat)); }
  raiz.appendChild(meio);
  // a minha posição (fixa embaixo)
  raiz.appendChild(v90Eu(r, cat));
  corpo.appendChild(raiz);
}
function v90Estado(pai, tit, txt){ v88Vazio(pai, 'trofeu', tit, txt); }

function v90Podio(top3, cat){
  const p = nodo('section', 'rk90-podio'); p.setAttribute('aria-label', 'TOP 3');
  p.appendChild(nodo('h3', null, 'TOP 3 · ' + cat[1] + ' NA TEMPORADA'));
  p.appendChild(nodo('div', 'rk90-luz'));
  const ordem = [[top3[1], 2], [top3[0], 1], [top3[2], 3]];
  for (const [x, pos] of ordem){
    const L = nodo('div', 'rk90-lugar p' + pos);
    if (!x){ L.classList.add('vago'); L.append(nodo('div', 'rk90-tpw'), nodo('div', 'rk90-nm', '—'), nodo('div', 'rk90-degrau', String(pos))); p.appendChild(L); continue; }
    const tpw = nodo('button', 'rk90-tpw'); tpw.type = 'button'; tpw.setAttribute('aria-label', 'Perfil de ' + x.nome);
    tpw.addEventListener('click', () => v88AbrePerfil(x.idPublico));
    if (pos === 1 && cat[0] === 'assistencias') tpw.insertAdjacentHTML('beforeend', V90_SVG.passes);
    tpw.appendChild(v90TampaEl(x.tampa, pos === 1 ? 200 : 146));
    if (pos === 1) tpw.insertAdjacentHTML('beforeend', V90_SVG.coroaPodio);
    const nm = v88Bt('rk90-nm', x.nome, () => v88AbrePerfil(x.idPublico), 'Perfil de ' + x.nome);
    const val = nodo('div', 'rk90-val'); val.append(nodo('b', null, v90Num(x.valor)), nodo('small', null, pos === 1 ? cat[1] : cat[2]));
    L.append(tpw, nm, v90Patente(x.patente), val, nodo('div', 'rk90-degrau', String(pos)));
    p.appendChild(L);
  }
  return p;
}

function v90Lista(resto, cat){
  const s = nodo('section', 'rk90-lista'); s.setAttribute('aria-label', 'TOP 4 ao TOP 20');
  const cab = nodo('div', 'rk90-li rk90-li-cab');
  cab.append(nodo('span', null, 'POS.'), nodo('span', null, 'JOGADOR'), nodo('span', null, 'PATENTE'), nodo('span', 'dir', cat[2]), nodo('span'));
  s.appendChild(cab);
  const rolar = nodo('div', 'rk90-rolar');
  if (!resto.length) rolar.appendChild(nodo('p', 'rk90-so3', 'Por enquanto, só o pódio pontuou nesta categoria.'));
  for (const x of resto){
    const li = nodo('div', 'rk90-li');
    const quem = nodo('button', 'rk90-quem'); quem.type = 'button'; quem.setAttribute('aria-label', 'Perfil de ' + x.nome);
    quem.addEventListener('click', () => v88AbrePerfil(x.idPublico));
    const tx = nodo('span'); tx.append(nodo('b', null, x.nome), nodo('small', null, 'NÍVEL ' + x.nivel));
    quem.append(v90TampaEl(x.tampa, 48), tx);
    const ver = v88Bt('rk90-ver', null, () => v88AbrePerfil(x.idPublico), 'Ver o perfil de ' + x.nome); ver.innerHTML = V90_SVG.perfil;
    li.append(nodo('span', 'rk90-pos', String(x.posicao)), quem, v90Patente(x.patente), nodo('span', 'rk90-v', v90Num(x.valor)), ver);
    rolar.appendChild(li);
  }
  s.appendChild(rolar);
  return s;
}

function v90Eu(r, cat){
  const f = nodo('div', 'rk90-eu');
  const eu = r && r.eu;
  if (!r) return f;
  if (!eu){
    f.classList.add('so-txt');
    f.appendChild(nodo('b', null, v88Logado() ? 'Sua posição aparece aqui depois da primeira partida que contar.' : 'Entre na sua conta para ver a sua posição.'));
    return f;
  }
  const pos = nodo('div', 'rk90-eu-pos'); pos.append(nodo('small', null, r.congelado ? 'POSIÇÃO FINAL' : 'MINHA POSIÇÃO'), nodo('b', null, eu.posicao ? '#' + v90Num(eu.posicao) : '—'));
  const cod = typeof tpMinha === 'function' ? tpMinha() : null;
  const nm = nodo('div', 'rk90-eu-nm'); nm.append(nodo('b', null, String(eu.nome || '').toUpperCase()), nodo('small', null, eu.posicao ? 'NA TEMPORADA ' + (r.temporada ? r.temporada.id : '') : eu.valor > 0 ? 'Perfil privado: você não aparece na lista pública.' : (cat[0] === 'pontos' ? 'Jogue a ranqueada para entrar.' : 'Jogue partidas online para entrar.')));
  const meta = nodo('div', 'rk90-eu-meta');
  const ult = r.lista.length >= 20 ? r.lista[19].valor : 0;
  if (eu.posicao && eu.posicao <= 20) meta.append(nodo('small', null, 'VOCÊ ESTÁ NO TOP 20'), (() => { const b = nodo('div', 'rk90-barra'); b.appendChild(nodo('i')).style.width = '100%'; return b; })());
  else if (!r.congelado){
    const meu = eu.valor || 0, falta = r.lista.length >= 20 ? Math.max(1, ult - meu + 1) : 1;   // (empate não passa: quem chegou antes fica na frente)
    const pct = r.lista.length >= 20 ? Math.max(4, Math.min(100, Math.round(100*meu/(ult + 1)))) : 0;
    const s = nodo('small'); s.append(nodo('span', null, 'ATÉ O TOP 20'), nodo('span', null, 'FALTA' + (falta > 1 ? 'M ' : ' ') + v90Num(falta)));
    const b = nodo('div', 'rk90-barra'); b.appendChild(nodo('i')).style.width = pct + '%';
    meta.append(s, b);
  }
  const v = nodo('div', 'rk90-eu-v'); v.append(nodo('b', null, v90Num(eu.valor)), nodo('small', null, cat[1]));
  f.append(pos, v90TampaEl(cod, 60), nm, meta, v);
  return f;
}

/* ---------------------------------------------------------------- as janelas */
function v90PopTemporadas(){
  const l = (V90RK.temporadas && V90RK.temporadas.lista) || [];
  abrePop(c => {
    c.classList.add('v88-pop', 'rk90-pop');
    c.appendChild(nodo('h3', 'pop-tit', 'TEMPORADAS'));
    if (!l.length){ c.appendChild(nodo('p', 'pop-txt', v88TemPlataforma() ? 'Carregando as temporadas…' : 'As temporadas vêm do servidor do RACHA.')); }
    const lista = nodo('div', 'rk90-temps');
    for (const t of l){
      const atual = (V90RK.temp || (V90RK.temporadas && V90RK.temporadas.vigente) || '') === t.id;
      const b = v88Bt('rk90-temp-item' + (atual ? ' on' : ''), null, () => { V90RK.temp = t.id === (V90RK.temporadas && V90RK.temporadas.vigente) ? null : t.id; fechaPop(); v90Carrega(false); v88Repinta('ranking'); }, t.nome);
      const d = x => new Date(x).toLocaleDateString('pt-BR');
      b.append(nodo('span', 'rk90-temp-tag', t.id), nodo('b', null, t.nome), nodo('small', null, d(t.inicio) + ' a ' + d(t.fim) + ' · ' + (t.estado === 'fechada' ? 'ENCERRADA' : 'EM ANDAMENTO')));
      lista.appendChild(b);
    }
    c.appendChild(lista);
    const a = nodo('div', 'pop-acoes'); a.appendChild(botaoPop('FECHAR', '', () => fechaPop())); c.appendChild(a);
  });
}
function v90PopPremios(){
  const cat = v90Cat(V90RK.cat);
  abrePop(c => {
    c.classList.add('v88-pop', 'rk90-pop', 'c-' + cat[0]);
    c.appendChild(nodo('h3', 'pop-tit', 'PRÊMIOS DO TOP 3 · ' + cat[1]));
    c.appendChild(nodo('p', 'pop-txt', 'No fim da temporada, os 3 primeiros de cada ranking ganham uma tampinha exclusiva, um banner e um título. São só cosméticos: o tamanho, a velocidade e o chute continuam iguais para todo mundo.'));
    const g = nodo('div', 'rk90-premios');
    const cod = cat[0] === 'assistencias' ? 'assist' : cat[0];
    for (const pos of [1, 2, 3]){
      const it = v88Item('tp_rk_' + cod + '_' + pos), ban = v88Item('banner_rk_' + cod + '_' + pos);
      const card = nodo('div', 'rk90-premio p' + pos);
      const tp = document.createElement('canvas'); tp.width = tp.height = 220; tp.className = 'rk90-tp'; tp.setAttribute('aria-hidden', 'true');
      try { if (it && it.visual && it.visual.d) tp.getContext('2d').drawImage(tpMiniatura(tpNorm(tpD(it.visual.d)), 220), 0, 0); } catch (_) {}
      card.append(nodo('span', 'rk90-premio-pos', pos + 'º'), tp, nodo('b', null, it ? it.nome : '—'), nodo('small', null, (ban ? 'Banner ' + ban.nome : '') + ' · título da temporada'));
      g.appendChild(card);
    }
    c.appendChild(g);
    const a = nodo('div', 'pop-acoes'); a.appendChild(botaoPop('FECHAR', '', () => fechaPop())); c.appendChild(a);
  });
}
