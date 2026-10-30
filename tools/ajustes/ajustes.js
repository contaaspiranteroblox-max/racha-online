/* ======================================================================================================================
   RACHA · OS AJUSTES FINOS (tools/ajustes/ajustes.js — colado depois da v94, antes da Oficina)
   O que o painel AJUSTES › TESTES v92 tinha, agora na versão OFICIAL, dentro dos Ajustes de sempre: Ajustes › Visual ›
   AJUSTES FINOS (e os atalhos em Controles e em Câmera). A janela é a mesma (as mesmas letras, cores e botões); as 7 abas
   continuam as mesmas (os ajustes finos abrem por cima da aba, com o ‹ VOLTAR).
     · FLUIDEZ: o desenho entre os passos da física (o último passo, suave ou prever — o padrão), a cadência dos quadros, o
       limite de FPS em passo inteiro e o medidor na tela (FPS, passos por quadro, ping e as correções);
     · A BOLA: a LINHA DO CHUTE (para onde a bola vai se você chutar agora, com as batidas e o gol — tools/ajustes/linhas.js;
       v95: só na Oficina, nas salas com o RANK OFF, em pontinhos),
       o CAMINHO DA BOLA andando (até onde ela vai sozinha), o comprimento das linhas e o aro mais justo;
     · ONLINE: a EXTRAPOLAÇÃO (o jogo desenhado uns ms à frente, como no Haxball: a bola e os outros andam pela física até
       lá), a bola na tela (a do servidor, mista ou a prevista — o padrão), o deslize das correções e a previsão (v91/v92);
     · CONTROLES: a zona morta do analógico (quando começa a andar e quando para), a folga para trocar de direção e a área de
       toque a mais nos botões;
     · CÂMERA: o tempo da mola e o quanto ela olha à frente da corrida.
   A FÍSICA não está aqui: a das partidas e das salas é a oficial do RACHA (a física da sala se ajusta só na Oficina, no CRIAR
   SALA). Os ajustes ficam no aparelho (AJF_CHAVE) e valem na hora. Na versão de testes (experimental: true) o painel de
   testes continua e os dois mexem no mesmo cfg (o do painel guarda do jeito dele).
   ====================================================================================================================== */
const AJF_CHAVE = 'racha-ajustes-finos-v1';
// os do cfg da v92 que valem aqui (os do cliente: a física e o DB ficam de fora)
const AJF_V92 = ['render', 'dtSnap', 'fpsInteiro', 'previsao', 'bolaPrev', 'tauCorr', 'zonaLiga', 'zonaDesliga', 'folgaDir', 'areaToque', 'camMola', 'camLead', 'aroJusto', 'medidor'];
// os novos (as linhas da bola e a extrapolação do online)
const AJF_PADRAO = Object.freeze({ linhaChute: 'chute', linhaBola: true, linhaTam: 'media', extrapola: 0 });
const AJF_ESCOLHAS = { linhaChute: ['nao', 'chute', 'ambos'], linhaTam: ['curta', 'media', 'longa'] };
const AJF_FAIXAS = { extrapola: [0, 200] };
const AJF = { cfg: Object.assign({}, AJF_PADRAO), sec: null, partes: {}, faixas: {}, segs: {}, chaves: {}, parte: 'fluidez', aberto: false };

function ajfLimpa(o) {                                           // o que veio do aparelho: só o conhecido, nos limites
  const c = {};
  for (const k in AJF_PADRAO) {
    let v = o && Object.prototype.hasOwnProperty.call(o, k) ? o[k] : AJF_PADRAO[k];
    if (typeof AJF_PADRAO[k] === 'boolean') v = !!v;
    else if (typeof AJF_PADRAO[k] === 'number') { v = Number(v); if (!Number.isFinite(v)) v = AJF_PADRAO[k]; const f = AJF_FAIXAS[k]; if (f) v = Math.max(f[0], Math.min(f[1], Math.round(v))); }
    else if (AJF_ESCOLHAS[k] && AJF_ESCOLHAS[k].indexOf(v) < 0) v = AJF_PADRAO[k];
    c[k] = v;
  }
  return c;
}
function ajfCarrega() {
  let o = null;
  try { o = JSON.parse(localStorage.getItem(AJF_CHAVE) || 'null'); } catch (_) { o = null; }
  AJF.cfg = ajfLimpa(o && o.cfg);
  // (na versão oficial os do cfg da v92 vêm daqui; na de testes, do painel de testes — que guarda do jeito dele)
  if (!V92.exp && o && o.v92 && typeof o.v92 === 'object') {
    const c = Object.assign({}, V92.cfg);
    for (const k of AJF_V92) if (Object.prototype.hasOwnProperty.call(o.v92, k)) c[k] = o.v92[k];
    V92.cfg = v92Limpa(c, V92_PADRAO);
  }
}
function ajfSalva() {
  const v = {}; for (const k of AJF_V92) v[k] = V92.cfg[k];
  try { localStorage.setItem(AJF_CHAVE, JSON.stringify({ v: 1, cfg: AJF.cfg, v92: v })); } catch (_) {}
  if (V92.exp) { V92.slot = ''; try { v92Salva(); } catch (_) {} }
}
function ajfAplica() {                                           // (a física nunca: só a câmera, o aro e a previsão; o resto é lido a cada quadro)
  try { v92AplicaCamera(); } catch (_) {}
  try { v92AplicaAro(); } catch (_) {}
  try { if (typeof v92RedeAplica === 'function') v92RedeAplica(); } catch (_) {}
  try { if (typeof v92PainelSync === 'function') v92PainelSync(); } catch (_) {}
  try { if (typeof lnLimpa === 'function') lnLimpa(); } catch (_) {}
}
function ajfMuda92(k, v) {
  const c = Object.assign({}, V92.cfg); c[k] = v;
  if (k === 'zonaLiga' && c.zonaDesliga > v) c.zonaDesliga = v;
  V92.cfg = v92Limpa(c, V92_PADRAO);
  ajfSalva(); ajfAplica(); ajfSync();
}
function ajfMuda(k, v) { const c = Object.assign({}, AJF.cfg); c[k] = v; AJF.cfg = ajfLimpa(c); ajfSalva(); ajfAplica(); ajfSync(); }
function ajfPadrao() {                                           // VOLTAR TUDO PARA O PADRÃO (o da versão oficial)
  const c = Object.assign({}, V92.cfg); for (const k of AJF_V92) c[k] = V92_PADRAO[k];
  V92.cfg = v92Limpa(c, V92_PADRAO); AJF.cfg = ajfLimpa(null);
  ajfSalva(); ajfAplica(); ajfSync();
  try { x49Toast('Os ajustes finos voltaram para o padrão.'); } catch (_) {}
}
ajfCarrega();

/* ---------------------------------------------------------------- as peças (as de sempre dos Ajustes) */
const ajfVirgula = t => String(t).replace(/(\d)\.(\d)/g, '$1,$2');
function ajfFaixa(id, titulo, nota, min, max, passo, ler, fmt, fn) {
  const lin = v88AjFaixa('ajf-' + id, titulo, min, max, passo, ler(), v => ajfVirgula(fmt(v)), fn);
  lin.classList.add('ajf-faixa');
  const sp = lin.querySelector('span');
  if (sp && nota) { sp.textContent = ''; sp.append(nodo('b', null, titulo), nodo('small', 'ajf-nota', nota)); }
  AJF.faixas[id] = [lin, ler];
  return lin;
}
function ajfChave(id, titulo, nota, ler, fn) {
  const lin = ajxChave('ajf-' + id, titulo, nota), b = lin.querySelector('button');
  b.addEventListener('click', () => { som.clique(); fn(b.getAttribute('aria-pressed') !== 'true'); });
  AJF.chaves[id] = [b, ler];
  return lin;
}
function ajfSeg(id, rotulo, itens, ler, fn) {                     // itens: [[valor, texto, nota?]]
  const g = nodo('div', 'ajx-seg ajf-seg'); g.setAttribute('role', 'group'); g.setAttribute('aria-label', rotulo);
  for (const [v, t, n] of itens) {
    const b = novoBotao(n ? 'ajx-pre' : ''); b.dataset.v = String(v); b.setAttribute('aria-pressed', 'false');
    if (n) b.append(nodo('b', null, t), nodo('small', null, n)); else b.textContent = t;
    g.appendChild(b);
  }
  g.addEventListener('click', e => { const b = e.target.closest('button[data-v]'); if (!b) return; som.clique(); fn(b.dataset.v); });
  AJF.segs[id] = [g, ler];
  return g;
}
function ajfRotulo(t, n) { const p = nodo('p', 'ajf-rot'); p.append(nodo('b', null, t)); if (n) p.append(nodo('small', null, n)); return p; }
function ajfAcao(texto, fn, cls) { const b = novoBotao('ajx-acao' + (cls ? ' ' + cls : '')); b.textContent = texto; b.addEventListener('click', () => { som.clique(); fn(b); }); return b; }

/* ---------------------------------------------------------------- as partes */
function ajfParteFluidez(sec) {
  const g1 = ajxGrupo('O desenho entre os passos', 'A física anda em passos de 1/60 s; a tela, em 60, 90 ou 120 quadros. PREVER desenha onde cada um está agora (sem atraso a mais).');
  g1.appendChild(ajfSeg('render', 'O desenho entre os passos da física', [['v91', 'ÚLTIMO PASSO', 'como era'], ['suave', 'SUAVE', 'entre passos (+16 ms)'], ['prever', 'PREVER', 'onde está agora']], () => V92.cfg.render, v => ajfMuda92('render', v)));
  const g2 = ajxGrupo('O ritmo da tela');
  g2.append(ajfChave('dt', 'Acertar a cadência dos quadros', 'sem engasgo quando o relógio da tela oscila', () => V92.cfg.dtSnap, on => ajfMuda92('dtSnap', on)),
            ajfChave('fpsi', 'Limite de FPS em passo inteiro', 'numa tela de 90 Hz desenha 90 por segundo; numa de 120, 60 iguais', () => V92.cfg.fpsInteiro, on => ajfMuda92('fpsInteiro', on)),
            ajfChave('med', 'Medidor na tela', 'FPS, passos por quadro, o ping e as correções, embaixo no meio', () => V92.cfg.medidor, on => ajfMuda92('medidor', on)));
  sec.append(g1, g2);
}
function ajfParteBola(sec) {
  const g1 = ajxGrupo('A linha do chute', 'Os pontinhos de para onde a bola vai se você chutar AGORA: a mesma conta da física (as batidas nas linhas, na trave e na rede). Dourados quando entra no gol; vermelhos no gol contra. Só na Oficina, nas salas com o RANK OFF.');
  g1.appendChild(ajfSeg('linha', 'A linha do chute', [['nao', 'DESLIGADA'], ['chute', 'CHUTE', 'o forte'], ['ambos', 'PASSE E CHUTE', 'as duas']], () => AJF.cfg.linhaChute, v => ajfMuda('linhaChute', v)));
  const g2 = ajxGrupo('O caminho da bola');
  g2.append(ajfChave('cam', 'O caminho da bola andando', 'até onde ela vai sozinha (se ninguém tocar), com as batidas', () => AJF.cfg.linhaBola, on => ajfMuda('linhaBola', on)),
            ajfRotulo('O comprimento das linhas'),
            ajfSeg('tam', 'O comprimento das linhas', [['curta', 'CURTA', '1,5 s'], ['media', 'MÉDIA', '3 s'], ['longa', 'LONGA', 'até parar']], () => AJF.cfg.linhaTam, v => ajfMuda('linhaTam', v)),
            ajfChave('aro', 'Aro mais justo na tampinha', 'o anel do alcance mais perto do corpo (só o desenho: o alcance é o mesmo)', () => V92.cfg.aroJusto, on => ajfMuda92('aroJusto', on)));
  g2.appendChild(nodo('p', 'ajx-nota', 'As linhas aparecem só nas partidas da Oficina com o RANK OFF ligado pelo criador da sala (no CRIAR SALA ou nos AJUSTES da sala) e no TESTAR com o RANK OFF da pausa. No treino, contra os bots, nas salas e na ranqueada, não. Elas não contam com os outros jogadores (eles podem tocar na bola no caminho).'));
  sec.append(g1, g2);
}
function ajfParteOnline(sec) {
  const g1 = ajxGrupo('A extrapolação', 'Desenha o jogo uns milissegundos À FRENTE (como no Haxball): a bola e os outros jogadores andam pela física até lá. Ajuda com a internet lenta; alto demais, a bola "pula" quando alguém toca nela. 0 = desligada.');
  g1.appendChild(ajfFaixa('ext', 'Extrapolação', 'só no online', 0, 200, 10, () => AJF.cfg.extrapola, v => (v ? v + ' ms' : 'desligada'), v => ajfMuda('extrapola', v)));
  const g2 = ajxGrupo('A bola e os outros na tela');
  g2.appendChild(ajfSeg('bola', 'A bola na tela', [['servidor', 'SERVIDOR', 'a do servidor'], ['misto', 'MISTO', 'prevista perto de você'], ['eu', 'PREVISTA', 'tudo na hora']], () => V92.cfg.bolaPrev, v => ajfMuda92('bolaPrev', v)));
  g2.appendChild(ajfFaixa('tau', 'Deslize das correções', 'quando a previsão erra, a diferença some em', 30, 250, 5, () => V92.cfg.tauCorr, v => Math.round(v) + ' ms', v => ajfMuda92('tauCorr', v)));
  const g3 = ajxGrupo('A previsão', 'Vale a partir da próxima partida.');
  g3.appendChild(ajfSeg('prev', 'A previsão', [['v91', 'v91', 'só a sua tampinha'], ['v92', 'v92', 'a conta do servidor']], () => V92.cfg.previsao, v => ajfMuda92('previsao', v)));
  sec.append(g1, g2, g3);
}
function ajfParteControles(sec) {
  const g1 = ajxGrupo('O analógico', 'A zona morta: quanto o dedo precisa ir para a tampinha andar (e parar). A velocidade e as direções são as mesmas para todos.');
  g1.append(ajfFaixa('zl', 'Começa a andar com o dedo a', 'do curso do analógico', .04, .45, .01, () => V92.cfg.zonaLiga, v => Math.round(v * 100) + '%', v => ajfMuda92('zonaLiga', v)),
            ajfFaixa('zd', 'Para com o dedo abaixo de', '', .02, .4, .01, () => V92.cfg.zonaDesliga, v => Math.round(v * 100) + '%', v => ajfMuda92('zonaDesliga', Math.min(v, V92.cfg.zonaLiga))),
            ajfFaixa('fd', 'Folga para trocar de direção', 'quanto o dedo passa da divisa antes de trocar (menos = mais solto)', 0, .12, .005, () => V92.cfg.folgaDir, v => (v * 180 / Math.PI).toFixed(1) + '°', v => ajfMuda92('folgaDir', v)));
  const g2 = ajxGrupo('Os botões');
  g2.appendChild(ajfFaixa('area', 'Área de toque a mais', 'em volta do PASSE e do CHUTE (px da tela)', 0, 60, 2, () => V92.cfg.areaToque, v => '+' + v + ' px', v => ajfMuda92('areaToque', v)));
  g2.appendChild(ajfAcao('EDITAR CONTROLES DA TELA', () => { try { ajxFecha(); if (lobby.aberto) return x49Toast('Abra um treino e use EDITAR CONTROLES na pausa.'); abrirEdicao(); } catch (_) {} }));
  sec.append(g1, g2);
}
function ajfParteCamera(sec) {
  const g = ajxGrupo('O movimento da câmera', 'O modo, o enquadramento e a câmera firme continuam na aba Câmera.');
  g.append(ajfFaixa('mola', 'Tempo da mola da câmera', '0 = o de cada estilo', 0, .6, .01, () => V92.cfg.camMola, v => v ? v.toFixed(2) + ' s' : 'padrão', v => ajfMuda92('camMola', v)),
           ajfFaixa('lead', 'A câmera olha à frente da corrida', 'no Seguir jogador', 0, .4, .01, () => V92.cfg.camLead, v => Math.round(v * 100) + '%', v => ajfMuda92('camLead', v)));
  sec.append(g);
}
const AJF_PARTES = [['fluidez', 'FLUIDEZ', ajfParteFluidez], ['bola', 'A BOLA', ajfParteBola], ['online', 'ONLINE', ajfParteOnline], ['controles', 'CONTROLES', ajfParteControles], ['camera', 'CÂMERA', ajfParteCamera]];

/* ---------------------------------------------------------------- a página dos ajustes finos (por cima da aba) */
(function ajfMonta() {
  if (typeof AJX === 'undefined' || !AJX.raiz || !AJX.secs || !AJX.secs.visual) return;
  const corpo = AJX.raiz.querySelector('.ajx-corpo'); if (!corpo) return;
  const s = nodo('section', 'ajx-sec ajf'); s.id = 'ajx-ajf'; s.hidden = true; s.setAttribute('role', 'region'); s.setAttribute('aria-label', 'Ajustes finos');
  const topo = nodo('div', 'ajf-topo'), volta = novoBotao('ajf-volta', 'Voltar para os ajustes'); volta.textContent = '‹ VOLTAR';
  volta.addEventListener('click', () => { som.clique(); ajfFecha(true); });
  topo.append(volta, nodo('b', 'ajf-tit', 'AJUSTES FINOS'), nodo('span', 'ajf-sub', 'O que a versão de testes tinha, agora para todo mundo.'));
  const nav = ajfSeg('parte', 'Partes dos ajustes finos', AJF_PARTES.map(([id, t]) => [id, t]), () => AJF.parte, v => { AJF.parte = v; ajfSync(); try { s.scrollTop = 0; corpo.scrollTop = 0; } catch (_) {} });
  nav.classList.add('ajf-nav');
  s.append(topo, nav);
  for (const [id, , fn] of AJF_PARTES) { const d = nodo('div', 'ajf-parte'); d.dataset.parte = id; fn(d); s.appendChild(d); AJF.partes[id] = d; }
  s.appendChild(ajfAcao('VOLTAR TUDO PARA O PADRÃO', () => ajfPadrao(), 'ajf-padrao'));
  corpo.appendChild(s); AJF.sec = s;
  // (comprido de propósito: fica no tamanho normal e rola — como o painel de testes; o encolher da v70.1 não pega nele)
  new MutationObserver(() => { if (s.style.zoom) { s.style.zoom = ''; const c = s.parentElement; if (c && c.dataset.v70z) delete c.dataset.v70z; } }).observe(s, { attributes: true, attributeFilter: ['style'] });
  // as entradas: Visual (o botão), Controles e Câmera (o atalho para a parte deles)
  const entrada = (sec, titulo, nota, parte, rot) => {
    const g = ajxGrupo(titulo, nota); g.classList.add('ajf-entrada');
    g.appendChild(ajfAcao(rot, () => ajfAbre(parte), 'ajf-abrir'));
    AJX.secs[sec].appendChild(g);
  };
  entrada('visual', 'Ajustes finos', 'A linha do chute, o caminho da bola, a fluidez, a extrapolação do online e o resto da versão de testes.', 'bola', 'ABRIR OS AJUSTES FINOS');
  entrada('controles', null, null, 'controles', 'AJUSTE FINO DO ANALÓGICO ›');
  entrada('camera', null, null, 'camera', 'AJUSTE FINO DA CÂMERA ›');
})();
function ajfAbre(parte) {
  if (!AJF.sec) return;
  if (parte) AJF.parte = parte;
  if (AJX.raiz.hidden) { try { ajxAbre('visual'); } catch (_) {} }
  for (const k in AJX.secs) AJX.secs[k].hidden = true;
  AJF.sec.hidden = false; AJF.aberto = true;
  AJX.raiz.classList.add('ajf-on');
  ajfSync();
  try { AJF.sec.scrollTop = 0; AJF.sec.parentElement.scrollTop = 0; } catch (_) {}
  try { (AJF.segs.parte[0].querySelector('[aria-pressed="true"]') || AJF.sec.querySelector('button')).focus({ preventScroll: true }); } catch (_) {}
}
function ajfFecha(volta) {
  if (!AJF.sec || !AJF.aberto) return;
  AJF.aberto = false; AJF.sec.hidden = true; AJX.raiz.classList.remove('ajf-on');
  if (volta) { try { ajxAba(AJX.aba || 'visual', true); } catch (_) {} }
}
// (trocar de aba ou fechar a janela fecha os ajustes finos; abrir a janela de novo volta para a aba)
const ajfAbaAntes = ajxAba;
ajxAba = function () { if (AJF.aberto) ajfFecha(false); return ajfAbaAntes.apply(this, arguments); };
try { new MutationObserver(() => { if (AJX.raiz.hidden && AJF.aberto) ajfFecha(false); }).observe(AJX.raiz, { attributes: true, attributeFilter: ['hidden'] }); } catch (_) {}

function ajfPinta(seg, valor) { if (!seg) return; for (const b of seg.querySelectorAll('button[data-v]')) { const on = b.dataset.v === String(valor); b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); } }
function ajfSync() {
  if (!AJF.sec) return;
  for (const id in AJF.segs) { const [g, ler] = AJF.segs[id]; ajfPinta(g, ler()); }
  for (const id in AJF.chaves) { const [b, ler] = AJF.chaves[id]; ligado(b, ler()); }
  for (const id in AJF.faixas) { const [lin, ler] = AJF.faixas[id]; try { lin.v88Pinta(ler()); } catch (_) {} }
  for (const id in AJF.partes) AJF.partes[id].hidden = id !== AJF.parte;
  // (a linha do chute desligada: o comprimento e o caminho continuam; com o motor próprio da v94, as linhas ainda não aparecem)
  const m94 = typeof v94Ligado === 'function' && v94Ligado();
  AJF.sec.classList.toggle('ajf-m94', !!m94);
}
const ajfSyncAntes = ajxSync;
ajxSync = function () { const r = ajfSyncAntes.apply(this, arguments); try { ajfSync(); } catch (_) {} return r; };
window.RachaAjustesFinos = { cfg: () => Object.assign({}, AJF.cfg), v92: () => { const o = {}; for (const k of AJF_V92) o[k] = V92.cfg[k]; return o; }, abre: ajfAbre, fecha: () => ajfFecha(true), padrao: ajfPadrao };
