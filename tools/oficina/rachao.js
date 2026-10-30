/* =====================================================================================================================
   RACHA v97 · O RACHÃO NA OFICINA (tools/oficina/rachao.js)
   O pedido: "adicione esse rachão na oficina de criação com várias opções de edição" — e a escolha: do jeito dele (o
   Rachão com o motor dele, o editor de estádios com várias opções, contra bots ou em 2, sem online).
     · a aba RACHÃO na central da Oficina: a placa de entrada (JOGAR O RACHÃO, CRIAR ESTÁDIO, COLAR CÓDIGO) e os estádios
       deste aparelho (a miniatura, o nome, EDITAR e JOGAR), lidos do mesmo armazenamento que o Rachão usa;
     · o Rachão abre por cima da Oficina, numa moldura do mesmo endereço (app/public/game/rachao/rachao.html?na=oficina):
       a Oficina pede a tela pela âncora (#inicio, #estadios, #novo, #importar, #editar=ID, #jogar=ID) e o Rachão avisa
       quando está pronto, quando os estádios mudam e quando a pessoa toca em VOLTAR PARA A OFICINA (postMessage, só
       desta moldura e deste endereço);
     · com o Rachão aberto o celular pode ficar em pé (o Rachão funciona assim); fechou, o GIRE O CELULAR volta a valer;
     · se a moldura não abrir (um navegador que bloqueia), a Oficina oferece abrir o Rachão nesta aba (e ele volta para o
       RACHA pelo mesmo botão).
   O motor, os 17 campos e os 8 modos do Rachão não mudam; nada aqui vai para o servidor.
   v98: a aba é do MODO RACHÃO da Oficina (o RACHA e o Rachão separados, a escolha no topo da central) e a placa ganha a
   SALA ONLINE (a tela do Rachão para criar a sala; a sala e a partida online ficam no rachao_sala.js). O rachaoMostra abre
   a moldura sem mexer na âncora (a partida online não pode ser interrompida por uma troca de tela).
   ===================================================================================================================== */
IC.rachao = '<circle cx="14.6" cy="12" r="7.2" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M14.6 8.3l3.1 2.3-1.2 3.6h-3.8l-1.2-3.6z" fill="currentColor"/><path d="M2.6 8.4h4.2M1.6 12h4.6M2.6 15.6h4.2" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>';
IC.colar = '<path d="M8.5 7L3.5 12l5 5M15.5 7l5 5-5 5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>';
const RCH = { el: null, fr: null, carrega: null, falha: null, pronto: false, aberto: false, rota: 'inicio', n: 0, t: 0, foco: null, mudou: false };
const RCH_PAGINA = './rachao/rachao.html';
const RCH_MAX_NOME = 28;
// os estádios do aparelho (o Rachão guarda em 'rachao.estadios'): só o que a central mostra, tudo conferido
function rachaoEstadios() {
  let lista = [];
  try { const o = JSON.parse(localStorage.getItem('rachao.estadios') || 'null'); if (o && Array.isArray(o.lista)) lista = o.lista; } catch (_) {}
  const out = [], vistos = new Set();
  for (const r of lista.slice(0, 40)) {
    if (!r || typeof r !== 'object' || typeof r.id !== 'string' || !/^u_[a-z0-9]{6,24}$/.test(r.id) || vistos.has(r.id)) continue;
    const d = r.doc && typeof r.doc === 'object' ? r.doc : {};
    const nome = typeof d.nome === 'string' ? d.nome.replace(/[\u0000-\u001f\u007f-\u009f]/g, ' ').trim().slice(0, RCH_MAX_NOME) : '';
    vistos.add(r.id);
    out.push({ id: r.id, nome: nome || 'Estádio', editado: Number(r.editado) || 0, pecas: Array.isArray(d.pecas) ? Math.min(d.pecas.slice(0, 48).reduce((n, p) => n + rachaoCopias(p), 0), 999) : 0,
      thumb: typeof r.thumb === 'string' && /^data:image\/jpeg;base64,/.test(r.thumb) ? thumbSegura(r.thumb) : '' });
  }
  return out.sort((a, b) => b.editado - a.editado);
}
// quantas peças a peça vira no campo, com o espelho (a mesma conta do Rachão: as cópias que caem no mesmo lugar contam uma vez)
function rachaoCopias(p) {
  if (!p || typeof p !== 'object') return 0;
  const x = Number(p.x) || 0, y = Number(p.y) || 0, s = p.sim;
  let n = 1;
  if ((s === 'x' || s === 'xy') && x) n++;
  if ((s === 'y' || s === 'xy') && y) n++;
  if (s === 'xy' && x && y) n++;
  if (s === 'c' && (x || y)) n++;
  return n;
}
// a arte da placa: um rachão visto de cima, desenhado aqui (as cores do Rachão: o gramado, os dois times, o para-choque e a cerca)
const RCH_ARTE = '<svg viewBox="0 0 240 150" aria-hidden="true" focusable="false">'
  + '<rect x="6" y="8" width="228" height="134" rx="16" fill="#2f7639" stroke="#1d1b16" stroke-width="4"/>'
  + '<rect x="22" y="22" width="196" height="106" rx="8" fill="#3d9248"/>'
  + '<path d="M50 22v106M78 22v106M106 22v106M134 22v106M162 22v106M190 22v106" stroke="#368541" stroke-width="14"/>'
  + '<rect x="22" y="22" width="196" height="106" rx="8" fill="none" stroke="#f3f6ec" stroke-width="3"/>'
  + '<path d="M120 22v106" stroke="#f3f6ec" stroke-width="3"/><circle cx="120" cy="75" r="19" fill="none" stroke="#f3f6ec" stroke-width="3"/>'
  + '<path d="M22 55h14v40H22M218 55h-14v40h14" fill="none" stroke="#f3f6ec" stroke-width="3"/>'
  + '<path d="M22 62h-10v26h10M218 62h10v26h-10" fill="rgba(255,255,255,.18)" stroke="#f6f6f0" stroke-width="2.5"/>'
  + '<path d="M70 44h26" stroke="#1d1b16" stroke-width="12" stroke-linecap="round"/><path d="M70 44h26" stroke="#2e6b2f" stroke-width="7.5" stroke-linecap="round"/>'
  + '<path d="M144 106h26" stroke="#1d1b16" stroke-width="12" stroke-linecap="round"/><path d="M144 106h26" stroke="#2e6b2f" stroke-width="7.5" stroke-linecap="round"/>'
  + '<circle cx="165" cy="45" r="9" fill="#1d1b16"/><circle cx="165" cy="45" r="6.6" fill="#ff4fbf"/><circle cx="165" cy="45" r="3.3" fill="#2ef2ff"/>'
  + '<circle cx="75" cy="105" r="9" fill="#1d1b16"/><circle cx="75" cy="105" r="6.6" fill="#ff4fbf"/><circle cx="75" cy="105" r="3.3" fill="#2ef2ff"/>'
  + '<circle cx="98" cy="80" r="9.5" fill="#e23d28" stroke="#1d1b16" stroke-width="2.6"/><circle cx="148" cy="66" r="9.5" fill="#2563c9" stroke="#1d1b16" stroke-width="2.6"/>'
  + '<circle cx="111" cy="76" r="5.2" fill="#fff" stroke="#1d1b16" stroke-width="2"/>'
  + '<path d="M100 92c6 9 18 12 30 8" fill="none" stroke="#fff" stroke-width="2" stroke-dasharray="4 4" stroke-linecap="round"/></svg>';
function rachaoPlaca() {
  const arte = h('div.ofi-rch-arte'); arte.innerHTML = RCH_ARTE;            // (um desenho fixo, escrito aqui)
  return h('section.ofi-rch-placa', { 'aria-label': 'Rachão' },
    h('div.ofi-rch-tx',
      h('b.ofi-rch-marca', { texto: 'Rachão' }),
      h('p', { texto: 'O futebol de física do jeito dele: 17 campos, contra bots, caos, 2 jogadores, treino, pênaltis, cabeçada, vôlei e minigolfe. A oficina de estádios (formato, gols, piso, física, obstáculos, lama, vento e poderes) e as salas online com a galera.' }),
      h('div.ofi-rch-bts',
        botao('JOGAR O RACHÃO', () => rachaoAbre('inicio'), 'ama', 'play', 'Abrir o Rachão'),
        botao('SALA ONLINE', () => rachaoAbre('online'), 'escuro', 'online', 'Criar uma sala online do Rachão'),   // v98
        botao('CRIAR ESTÁDIO', () => rachaoAbre('novo'), 'escuro', 'novo', 'Criar um estádio na oficina do Rachão'),
        botao('COLAR CÓDIGO', () => rachaoAbre('importar'), 'escuro', 'colar', 'Colar o código de um estádio'))),
    arte);
}
function abaRachao(vivo) {
  cabecalho('Estádios do Rachão', 'Os estádios ficam guardados neste aparelho (para levar a outro, copie o código). Para jogar com a galera, abra uma sala em SALA ONLINE.');
  HU.grade.appendChild(rachaoPlaca());
  const L = rachaoEstadios();
  if (!vivo()) return;
  HU.grade.appendChild(h('div.ofi-sep', { texto: 'SEUS ESTÁDIOS DO RACHÃO' + (L.length ? ' · ' + L.length : '') }));
  HU.grade.appendChild(h('button.ofi-cartao.ofi-cartao-novo', { type: 'button', on: { click: () => { try { som.clique(); } catch (_) {} rachaoAbre('novo'); } } },
    h('div.ofi-cartao-img', icone('adicionar')), h('div.ofi-cartao-tx', h('b', { texto: 'CRIAR ESTÁDIO' }), h('small', { texto: 'Do zero ou de um dos 17 campos' }))));
  for (const e of L) HU.grade.appendChild(h('div.ofi-cartao.ofi-rch-cartao', { role: 'group', 'aria-label': e.nome, dados: { rch: e.id } },
    h('button.ofi-cartao-img', { type: 'button', title: 'Editar', on: { click: () => { try { som.clique(); } catch (_) {} rachaoAbre('editar=' + e.id); } } }, imgMapa(e.thumb)),
    h('div.ofi-cartao-tx', h('b', { texto: e.nome }), h('small', { texto: (e.pecas ? e.pecas + (e.pecas === 1 ? ' peça' : ' peças') + ' · ' : '') + 'editado ' + quando(e.editado) }),
      h('div.ofi-selos', h('em.ofi-selo.ama', { texto: 'RACHÃO' }))),
    h('div.ofi-cartao-bts', botao('EDITAR', () => rachaoAbre('editar=' + e.id), 'ama', 'lapis'), botao('', () => rachaoAbre('jogar=' + e.id), 'ofi-ic-bt', 'play', 'Jogar neste estádio'))));
}

/* ---------------------------------------------------------------- o Rachão por cima da Oficina */
function rachaoMonta() {
  if (RCH.el) return;
  RCH.carrega = h('div.ofi-rch-carrega', { role: 'status' }, h('i'), h('b', { texto: 'Abrindo o Rachão…' }));
  RCH.falha = h('div.ofi-rch-falha', { hidden: true, role: 'alert' },
    h('b', { texto: 'O Rachão não abriu aqui dentro.' }),
    h('p', { texto: 'Este navegador não deixou abrir a página do Rachão por cima da Oficina. Dá para abrir nesta aba (ele tem o botão de voltar para o RACHA).' }),
    h('div.ofi-rch-bts', botao('ABRIR NESTA ABA', () => { location.assign(RCH_PAGINA + '?volta=racha#' + RCH.rota); }, 'ama', 'play'), botao('VOLTAR', () => rachaoFecha(), 'escuro', 'voltar')));
  RCH.el = h('div#ofi-rch.ofi-rch', { hidden: true, role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Rachão' }, RCH.carrega, RCH.falha);
  OFI.raiz.appendChild(RCH.el);
}
function rachaoAbre(rota) {
  if (!OFI.raiz) return;
  rachaoMonta();
  RCH.rota = String(rota || 'inicio');
  RCH.foco = document.activeElement;
  const url = RCH_PAGINA + '?na=oficina#' + RCH.rota + '&k=' + (++RCH.n);   // (o &k muda a âncora toda vez: a mesma rota pedida de novo também vale)
  if (!RCH.fr) {
    RCH.pronto = false;
    RCH.fr = h('iframe.ofi-rch-fr', { title: 'Rachão', src: url, allow: 'gamepad; fullscreen; clipboard-write' });
    RCH.el.appendChild(RCH.fr);
  } else RCH.fr.src = url;                             // (só a âncora muda: a página não recarrega, o Rachão troca de tela)
  if (!RCH.pronto) {                                   // (ainda não avisou que está pronto: o "abrindo" e, depois de 9 s, a outra saída)
    RCH.carrega.hidden = false; RCH.falha.hidden = true; clearTimeout(RCH.t);
    RCH.t = setTimeout(() => { if (!RCH.pronto && RCH.aberto) { RCH.carrega.hidden = true; RCH.falha.hidden = false; } }, 9000);
  }
  RCH.el.hidden = false; RCH.aberto = true;
  try { joy.id = null; ptrs.clear(); resetBotoes(); } catch (_) {}
  try { v70GireSync(); } catch (_) {}
  setTimeout(() => { try { RCH.fr.focus(); } catch (_) {} }, 60);
}
// v98: mostra o Rachão sem mexer na âncora quando a moldura já está aberta (a partida online e os ajustes chegam por mensagem);
// sem moldura ainda, abre com a rota (a 'partida' não faz nada lá dentro: só carrega)
function rachaoMostra(rota) {
  if (!OFI.raiz) return;
  if (!RCH.fr) return rachaoAbre(rota || 'partida');
  rachaoMonta();
  if (!RCH.aberto) RCH.foco = document.activeElement;
  RCH.el.hidden = false; RCH.aberto = true;
  if (!RCH.pronto) { RCH.carrega.hidden = false; RCH.falha.hidden = true; }
  try { joy.id = null; ptrs.clear(); resetBotoes(); } catch (_) {}
  try { v70GireSync(); } catch (_) {}
  setTimeout(() => { try { RCH.fr.focus(); } catch (_) {} }, 60);
}
function rachaoFecha() {
  if (!RCH.el || !RCH.aberto) return;
  RCH.aberto = false; RCH.el.hidden = true;
  try { RCH.fr.contentWindow.postMessage({ oficina: 'fechou' }, location.origin && location.origin !== 'null' ? location.origin : '*'); } catch (_) {}
  try { v70GireSync(); } catch (_) {}
  if (OFI.tela === 'hub' && HUB.aba === 'rachao') carregaAba(true);
  const f = RCH.foco; RCH.foco = null;
  setTimeout(() => { try { if (f && f.isConnected) f.focus({ preventScroll: true }); } catch (_) {} }, 30);
}
window.addEventListener('message', e => {                // (só a moldura do Rachão, do mesmo endereço, fala com a Oficina)
  if (!RCH.fr || e.source !== RCH.fr.contentWindow) return;
  if (location.origin !== 'null' && e.origin !== location.origin) return;
  const d = e.data; if (!d || typeof d !== 'object' || typeof d.rachao !== 'string') return;
  if (d.rachao === 'pronto') { RCH.pronto = true; clearTimeout(RCH.t); RCH.carrega.hidden = true; RCH.falha.hidden = true; }
  else if (d.rachao === 'sair') rachaoFecha();
  else if (d.rachao === 'mudou') { RCH.mudou = true; if (!RCH.aberto && OFI.tela === 'hub' && HUB.aba === 'rachao') carregaAba(true); }   // (salvou depois de fechar: o cartão em dia)
});
// aberto de verdade: a Oficina pode ter fechado por baixo (a sala, o jogo) sem passar pelo fecha daqui
function rachaoVisivel() {
  if (!RCH.aberto) return false;
  if (OFI.aberta && OFI.raiz && !OFI.raiz.hidden && RCH.el && !RCH.el.hidden) return true;
  RCH.aberto = false; if (RCH.el) RCH.el.hidden = true;
  try { RCH.fr.contentWindow.postMessage({ oficina: 'fechou' }, location.origin && location.origin !== 'null' ? location.origin : '*'); } catch (_) {}   // (a partida do Rachão pausa)
  return false;
}
window.addEventListener('keydown', e => {                 // (a Oficina por baixo não ouve o teclado; o Esc fora da moldura fecha o Rachão)
  if (!rachaoVisivel()) return;
  if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); rachaoFecha(); return; }
  e.stopImmediatePropagation();
}, true);
try {                                                     // com o Rachão aberto, o celular pode ficar em pé (o Rachão funciona assim)
  const gireAntes = v70GireDeveAbrir;
  v70GireDeveAbrir = function () { if (rachaoVisivel()) return false; return gireAntes.apply(this, arguments); };
} catch (_) {}
{ const fechaAntes = OFI.fecha; OFI.fecha = function () { try { rachaoFecha(); } catch (_) {} return fechaAntes.apply(this, arguments); }; }   // (a Oficina fechou: o Rachão junto)
OFI.rachao = { abre: rachaoAbre, mostra: rachaoMostra, fecha: rachaoFecha, aberto: () => rachaoVisivel(), pronto: () => RCH.pronto, estadios: rachaoEstadios };
