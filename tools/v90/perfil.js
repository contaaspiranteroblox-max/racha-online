/* ======================================================================================================================
   RACHA v90 · O RANKING NO PERFIL (o público, que abre tocando num jogador, e o seu): as melhores colocações das
   temporadas (TOP 1 — Assistências, Temporada 1…), os números VALIDADOS pelo servidor (gols, assistências e Craque do
   Jogo das partidas online), os pontos ranqueados de agora, a melhor classificação e as tampinhas exclusivas ganhas.
   Tudo vem do ranking.historico (a classificação final congelada de cada temporada) — o aparelho não inventa nada.
   E o BANNER DO PÓDIO (as recompensas do TOP 3): desenhado aqui, atrás do nome e do ID, como os outros banners.
   ====================================================================================================================== */
const V90PF = {cache:new Map()};
const V90_NOME_CAT = {gols:'GOLS', assistencias:'ASSISTÊNCIAS', pontos:'PONTOS RANQUEADOS', craque:'CRAQUE DO JOGO'};
const V90_COR_CAT = {gols:['#ff9a1a', '#ffd36b'], assistencias:['#22c7b8', '#7ff2e4'], pontos:['#9d6bff', '#cdb4ff'], craque:['#c9a2ff', '#f5c542']};
const V90_COR_POS = {1:'#f5c542', 2:'#d4d9e0', 3:'#d98a4e'};

function v90Historico(pub){
  const k = v88Pub(pub), c = V90PF.cache.get(k);
  if (c && Date.now() - c.em < 60000) return Promise.resolve(c.h);
  return v88Q('ranking.historico', {idPublico:k}).then(h => { V90PF.cache.set(k, {em:Date.now(), h}); return h; });
}

// o bloco COMPETIÇÃO (o mesmo no perfil público e no seu)
function v90BlocoCompeticao(pub, extra){
  const box = nodo('section', 'v90-pf-rk'); box.setAttribute('aria-label', 'Competição');
  box.appendChild(nodo('h3', null, 'COMPETIÇÃO'));
  const corpo = nodo('div', 'v90-pf-rk-corpo'); box.appendChild(corpo);
  if (!v88TemPlataforma()){ corpo.appendChild(nodo('p', 'v88-nota', 'As colocações vêm do servidor do RACHA.')); return box; }
  corpo.appendChild(nodo('p', 'v88-nota', 'Carregando as colocações…'));
  v90Historico(pub).then(h => { corpo.textContent = ''; v90PintaCompeticao(corpo, h, extra || {}); })
    .catch(() => { corpo.textContent = ''; corpo.appendChild(nodo('p', 'v88-nota', 'Não deu para carregar as colocações agora.')); });
  return box;
}
function v90PintaCompeticao(corpo, h, extra){
  // as melhores colocações
  const col = nodo('div', 'v90-pf-col');
  const melhores = (h.colocacoes || []).filter(c => c.posicao <= 20).slice(0, 4);
  if (!melhores.length) col.appendChild(nodo('p', 'v88-nota', 'Ainda sem colocação no TOP 20 de uma temporada encerrada.'));
  for (const c of melhores){
    const d = nodo('div', 'v90-pf-chip p' + Math.min(4, c.posicao));
    d.style.setProperty('--c', (V90_COR_CAT[c.categoria] || ['#888'])[0]);
    d.append(nodo('b', null, 'TOP ' + c.posicao), nodo('span', null, (V90_NOME_CAT[c.categoria] || c.categoria) + ' · ' + (c.temporadaNome || c.temporada)));
    col.appendChild(d);
  }
  corpo.appendChild(col);
  // os números (os de sempre ficam em cima, no cartão; aqui o que é do ranking) e as tampinhas exclusivas ganhas
  const V = h.validados || {}, premios = h.premios || [], g = nodo('div', 'v90-pf-num');
  const n = (rot, v) => { const d = nodo('div'); d.append(nodo('b', null, v), nodo('small', null, rot)); g.appendChild(d); };
  n('Melhor colocação', h.melhor ? '#' + h.melhor : '—');
  n(extra.pts != null ? 'Pontos ranqueados' : 'Patente atual', extra.pts != null ? fmtNum(extra.pts) : (extra.patente || '—'));
  n('Gols validados', fmtNum(V.gols || 0)); n('Assist. validadas', fmtNum(V.assistencias || 0)); n('Craque do Jogo', fmtNum(V.craques || 0));
  corpo.appendChild(g);
  if (premios.length){
    const p = nodo('div', 'v90-pf-premios');
    p.appendChild(nodo('small', 'v90-pf-premios-tit', 'EXCLUSIVAS GANHAS'));
    for (const pr of premios){
      const tp = (pr.itens || []).find(c => /^tp_rk_/.test(c)), it = tp && v88Item(tp);
      const card = nodo('span', 'v90-pf-premio'); card.title = pr.titulo; card.setAttribute('aria-label', pr.titulo);
      if (it && it.visual && it.visual.d){ try { card.appendChild(tpMiniatura(tpNorm(tpD(it.visual.d)), 48)); } catch (_) {} }
      p.appendChild(card);
    }
    corpo.appendChild(p);
    corpo.appendChild(nodo('p', 'v90-pf-titulos', premios.map(x => x.titulo).join(' · ')));
  }
}

// o perfil público (a janela): o bloco entra antes dos botões
const v88PerfilPintaAntes90 = v88PerfilPinta;
v88PerfilPinta = function(p){
  const r = v88PerfilPintaAntes90.apply(this, arguments);
  try {
    const c = LB.popCaixa, ac = c.querySelector('.v88-pf-ac');
    const bloco = v90BlocoCompeticao(p.idPublico, {patente:p.patente});
    if (ac) c.insertBefore(bloco, ac); else c.appendChild(bloco);
  } catch (e) { console.error('v90 perfil', e); }
  return r;
};

// o seu perfil (a tela PERFIL): o bloco no fim
if (TELAS.perfil){
  const renderAntes90 = TELAS.perfil.render;
  TELAS.perfil.render = function(){
    const r = renderAntes90.apply(this, arguments);
    try {
      const corpo = TELAS.perfil.el.querySelector('.tl-corpo'); if (!corpo || !v88Logado() || !V88.eu) return r;
      const velho = corpo.querySelector('.v90-pf-rk'); if (velho) velho.remove();
      corpo.appendChild(v90BlocoCompeticao(V88.eu, {}));
    } catch (e) { console.error('v90 meu perfil', e); }
    return r;
  };
}

// o BANNER DO PÓDIO (as recompensas do TOP 3 de cada ranking)
const v88DesenhaBannerAntes90 = v88DesenhaBanner;
v88DesenhaBanner = function(g, w, h, it, t){
  const V = it && it.visual;
  if (!V || V.cena !== 'podio') return v88DesenhaBannerAntes90.apply(this, arguments);
  const cor = V.cores || ['#7a3fc4', '#160b2a', '#f5c542'], pos = V.posicao || 1, med = V90_COR_POS[pos] || cor[2];
  const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, cor[1]); gr.addColorStop(.55, '#0e0f12'); gr.addColorStop(1, cor[1]);
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  // os raios do pódio, bem discretos
  g.save(); g.globalAlpha = .16; g.fillStyle = cor[0];
  for (let i = 0; i < 9; i++){ const a = -Math.PI/2 + (i - 4)*.19; g.beginPath(); g.moveTo(w*.78, h*1.05); g.lineTo(w*.78 + Math.cos(a - .05)*w, h*1.05 + Math.sin(a - .05)*w); g.lineTo(w*.78 + Math.cos(a + .05)*w, h*1.05 + Math.sin(a + .05)*w); g.closePath(); g.fill(); }
  g.restore();
  // a faixa da cor da categoria e o número da posição, grande, com os louros
  g.fillStyle = cor[0]; g.globalAlpha = .9; g.fillRect(0, h*.84, w, h*.16); g.globalAlpha = 1;
  const cx = w*.78, cy = h*.46, R = h*.3;
  g.strokeStyle = med; g.lineWidth = h*.035; g.lineCap = 'round';
  for (const lado of [-1, 1]){ for (let i = 0; i < 6; i++){ const a = Math.PI/2 + lado*(.5 + i*.32); const x = cx + Math.cos(a)*R*1.25, y = cy + Math.sin(a)*R*1.25; g.beginPath(); g.ellipse(x, y, R*.2, R*.09, a + lado*1.2, 0, Math.PI*2); g.fillStyle = med; g.fill(); } }
  g.beginPath(); g.arc(cx, cy, R, 0, Math.PI*2); g.fillStyle = 'rgba(0,0,0,.55)'; g.fill(); g.lineWidth = h*.03; g.strokeStyle = med; g.stroke();
  g.fillStyle = med; g.font = '400 ' + Math.round(R*1.25) + 'px Anton, Impact, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(String(pos), cx, cy + R*.05);
  const vg = g.createLinearGradient(0, 0, w, 0); vg.addColorStop(0, 'rgba(0,0,0,.5)'); vg.addColorStop(.5, 'rgba(0,0,0,0)'); g.fillStyle = vg; g.fillRect(0, 0, w, h);
};
