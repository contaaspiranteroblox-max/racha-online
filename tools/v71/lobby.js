/* ==================================================================================================================
   RACHA rua v71 · O LOBBY NOVO (entra no fim do script do jogo, depois do times.js; o visual mora em v71.css)
   O pedido: "crie um layout do game que não pareça de IA, bem de game mesmo, que jogadores gostam; melhore o layout,
   porque está muito confuso".
   O que era: 12 cartões iguais em lista (ícone, título, legenda e setinha), 3 ícones soltos, o logo, o "Pronto, fulano!"
   e o JOGAR com duas linhas de letra miúda — tudo com o mesmo peso, nada chamava o olho.
   O que fica (deitado, como o jogo é jogado):
   · EM CIMA, À ESQUERDA: você (a sua tampinha, o nível num selo, o nome e a barra de XP) e a sua LIGA (a insígnia e o elo).
     EM CIMA, À DIREITA: moedas e gemas (abrem a loja), o chat (com o número de mensagens) e os ajustes.
   · DOS LADOS, botões quadrados de jogo (um desenho grande e uma palavra só):
     à esquerda LOJA, TAMPINHA, CLUBE e TREINO; à direita SALAS, AMIGOS e RANKING.
   · NO MEIO: a sua tampinha na quadra, com o RACHA em cima.
   · EMBAIXO: os DESAFIOS do dia (à esquerda) e, à direita, o MODO (o que vai ser jogado: modo, tamanho e campo — toque
     para trocar) colado no JOGAR grande, a única coisa amarela forte da tela.
   · Saíram da tela (continuam no jogo, por outro caminho): o PASSE (em breve, sem temporada), a COMUNIDADE (o AMIGOS
     abre ela), o CHAT grande (fica o ícone em cima, com o número) e o ícone repetido das SALAS no topo.
   São os MESMOS botões do lobby (os mesmos ids e data-rx, os mesmos cliques): só mudam de lugar e de cara. Nada aqui
   mexe em partida, física, rede, conta ou economia.
   ================================================================================================================== */
const V71L = {pronto:false};
const V71_K = '#0b0c0e';
function v71Serra(cx, cy, r, n, f){                     // a borda serrilhada da tampinha (n dentes; f = o fundo do dente)
  let d = '';
  for (let i = 0; i < n*2; i++){ const a = i*Math.PI/n - Math.PI/2, q = i % 2 ? r*(f || .86) : r; d += (i ? 'L' : 'M') + (cx + Math.cos(a)*q).toFixed(1) + ' ' + (cy + Math.sin(a)*q).toFixed(1); }
  return d + 'Z';
}
function v71Tampa(cx, cy, r, saia, face, metade){       // uma tampinha de desenho: a saia serrilhada, a face e (se tiver) a metade branca
  const k = V71_K;
  let s = '<path d="' + v71Serra(cx, cy, r, 16) + '" fill="' + saia + '" stroke="' + k + '" stroke-width="3.4" stroke-linejoin="round"/>'
    + '<circle cx="' + cx + '" cy="' + cy + '" r="' + (r*.7).toFixed(1) + '" fill="' + face + '" stroke="' + k + '" stroke-width="2.6"/>';
  if (metade) s += '<path d="M' + cx + ' ' + (cy - r*.7).toFixed(1) + 'a' + (r*.7).toFixed(1) + ' ' + (r*.7).toFixed(1) + ' 0 0 1 0 ' + (r*1.4).toFixed(1) + 'z" fill="' + metade + '"/>'
    + '<circle cx="' + cx + '" cy="' + cy + '" r="' + (r*.7).toFixed(1) + '" fill="none" stroke="' + k + '" stroke-width="2.6"/>';
  return s + '<path d="M' + (cx - r*.42).toFixed(1) + ' ' + (cy - r*.3).toFixed(1) + 'a' + (r*.5).toFixed(1) + ' ' + (r*.5).toFixed(1) + ' 0 0 1 ' + (r*.36).toFixed(1) + ' -' + (r*.2).toFixed(1) + '" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="2.4" stroke-linecap="round"/>';
}
const V71_SVG = (() => {
  const k = V71_K, sv = c => '<svg viewBox="0 0 64 64" aria-hidden="true">' + c + '</svg>';
  const listras = [0, 1, 2, 3].map(i => {             // o toldo da barraca: 4 listras (vermelho e branco) com a franja redonda
    const c = i % 2 ? '#f6f3ea' : '#e8452c', t0 = 14 + 9*i, t1 = t0 + 9, b0 = 8 + 12*i, b1 = b0 + 12;
    return '<path d="M' + t0 + ' 8L' + t1 + ' 8L' + b1 + ' 21A6 6 0 0 1 ' + b0 + ' 21Z" fill="' + c + '"/>';
  }).join('');
  return {
    loja:sv('<path d="M12 25h40v27a4 4 0 0 1-4 4H16a4 4 0 0 1-4-4z" fill="#ffd23f" stroke="' + k + '" stroke-width="4" stroke-linejoin="round"/>'
      + '<path d="M26 56V41a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v15" fill="#8a5a2b" stroke="' + k + '" stroke-width="4" stroke-linejoin="round"/>'
      + listras + '<path d="M14 8h36l6 13a6 6 0 0 1-12 0a6 6 0 0 1-12 0a6 6 0 0 1-12 0a6 6 0 0 1-12 0z" fill="none" stroke="' + k + '" stroke-width="4" stroke-linejoin="round"/>'),
    tampinha:sv(v71Tampa(29, 29, 25, '#c9ced6', '#17191c', '#f6f3ea')
      + '<circle cx="49" cy="49" r="12.5" fill="#ffd23f" stroke="' + k + '" stroke-width="3.6"/>'
      + '<path d="M42.6 55.4l1.5-5.4 8.2-8.2 3.9 3.9-8.2 8.2z" fill="#17191c"/><path d="M44.4 50.3l3.7 3.7" stroke="#ffd23f" stroke-width="1.7"/>'),
    clube:sv('<path d="M32 6l22 8v15c0 13-9 22-22 28C19 51 10 42 10 29V14z" fill="#3f8cff"/><path d="M32 6l22 8v15c0 13-9 22-22 28z" fill="#2a6fe0"/>'
      + '<path d="M32 6l22 8v15c0 13-9 22-22 28C19 51 10 42 10 29V14z" fill="none" stroke="' + k + '" stroke-width="4" stroke-linejoin="round"/>'
      + '<path d="M32 18.5l3.9 7.9 8.7 1.3-6.3 6.1 1.5 8.7L32 38.4l-7.8 4.1 1.5-8.7-6.3-6.1 8.7-1.3z" fill="#f6f3ea" stroke="' + k + '" stroke-width="3" stroke-linejoin="round"/>'),
    treino:sv('<path d="M27 7h10l12 41H15z" fill="#ff8a2a"/><path d="M23.5 19h17l2.4 8H21.1z" fill="#f6f3ea"/><path d="M20 31h24l2.4 8H17.6z" fill="#f6f3ea"/>'
      + '<path d="M27 7h10l12 41H15z" fill="none" stroke="' + k + '" stroke-width="4" stroke-linejoin="round"/>'
      + '<rect x="8" y="47" width="48" height="9" rx="3" fill="#ff8a2a" stroke="' + k + '" stroke-width="4"/>'),
    salas:sv('<circle cx="15" cy="21" r="8" fill="#c9ced6" stroke="' + k + '" stroke-width="4"/><path d="M2 49c0-10 6-15 13-15s13 5 13 15z" fill="#c9ced6" stroke="' + k + '" stroke-width="4" stroke-linejoin="round"/>'
      + '<circle cx="49" cy="21" r="8" fill="#c9ced6" stroke="' + k + '" stroke-width="4"/><path d="M36 49c0-10 6-15 13-15s13 5 13 15z" fill="#c9ced6" stroke="' + k + '" stroke-width="4" stroke-linejoin="round"/>'
      + '<circle cx="32" cy="25" r="10.5" fill="#f6f3ea" stroke="' + k + '" stroke-width="4"/><path d="M14 59c0-12 8-19 18-19s18 7 18 19z" fill="#3f8cff" stroke="' + k + '" stroke-width="4" stroke-linejoin="round"/>'),
    amigos:sv('<circle cx="25" cy="21" r="10" fill="#f6f3ea" stroke="' + k + '" stroke-width="4"/>'
      + '<path d="M7 56c0-12 8-19 18-19s18 7 18 19z" fill="#f6f3ea" stroke="' + k + '" stroke-width="4" stroke-linejoin="round"/>'
      + '<circle cx="47" cy="20" r="11" fill="#2fbf5b" stroke="' + k + '" stroke-width="4"/><path d="M47 14v12M41 20h12" stroke="#f6f3ea" stroke-width="4.5" stroke-linecap="round"/>'),
    ranking:sv('<path d="M18 12H9v5c0 6 4 10 10 10M46 12h9v5c0 6-4 10-10 10" fill="none" stroke="' + k + '" stroke-width="4" stroke-linecap="round"/>'
      + '<path d="M18 7h28v15c0 9-6 16-14 16S18 31 18 22z" fill="#ffd23f" stroke="' + k + '" stroke-width="4" stroke-linejoin="round"/>'
      + '<path d="M25 13v8" stroke="#fff6c2" stroke-width="4" stroke-linecap="round"/>'
      + '<path d="M28 38h8v8h-8z" fill="#f2a813" stroke="' + k + '" stroke-width="4" stroke-linejoin="round"/>'
      + '<rect x="17" y="46" width="30" height="10" rx="3" fill="#8a5a2b" stroke="' + k + '" stroke-width="4"/>'),
    desafios:sv('<circle cx="32" cy="32" r="25" fill="#ffd23f" stroke="' + k + '" stroke-width="4"/><circle cx="32" cy="32" r="18" fill="none" stroke="#f2a813" stroke-width="3"/>'
      + '<path d="M32 17l4.6 9.4 10.4 1.5-7.5 7.3 1.8 10.3L32 40.6l-9.3 4.9 1.8-10.3-7.5-7.3 10.4-1.5z" fill="#f6f3ea" stroke="' + k + '" stroke-width="3" stroke-linejoin="round"/>'),
    chat:sv('<path d="M11 11h42a5 5 0 0 1 5 5v23a5 5 0 0 1-5 5H29L17 55V44h-6a5 5 0 0 1-5-5V16a5 5 0 0 1 5-5z" fill="#f6f3ea" stroke="' + k + '" stroke-width="4" stroke-linejoin="round"/>'
      + '<circle cx="21" cy="27.5" r="3.6" fill="' + k + '"/><circle cx="32" cy="27.5" r="3.6" fill="' + k + '"/><circle cx="43" cy="27.5" r="3.6" fill="' + k + '"/>'),
    bola:sv('<circle cx="32" cy="32" r="25" fill="#f6f3ea" stroke="' + k + '" stroke-width="4"/><path d="M32 21.5l9.6 7-3.7 11.3H26.1l-3.7-11.3z" fill="#17191c"/>'
      + '<path d="M32 21.5V10M41.6 28.5l10.4-3.4M37.9 39.8l6.3 8.6M26.1 39.8l-6.3 8.6M22.4 28.5L12 25.1" stroke="#17191c" stroke-width="3.6" stroke-linecap="round"/>'),
    curva:sv('<path d="M9 55C10 33 21 19 37 16" fill="none" stroke="' + k + '" stroke-width="11" stroke-linecap="round"/><path d="M9 55C10 33 21 19 37 16" fill="none" stroke="#ff8a2a" stroke-width="5" stroke-linecap="round"/>'
      + '<circle cx="45" cy="19" r="13" fill="#f6f3ea" stroke="' + k + '" stroke-width="4"/><path d="M45 13l5.2 3.8-2 6.1h-6.4l-2-6.1z" fill="#17191c"/>'),
    troca:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8.5h13.5l-3.6-3.6M20 15.5H6.5l3.6 3.6" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  };
})();

(function v71Lobby(){
  const rx = document.getElementById('rx'), topo = LB.palco && LB.palco.querySelector('.lb-topo');
  if (!rx || !topo || !LB.jogar || !LB.modo) return;
  LB.raiz.classList.add('v71');
  const q = s => rx.querySelector(s);
  const tile = (b, nome, svg, cor) => {               // o botão de lista vira o botão quadrado (o mesmo elemento: o mesmo clique)
    if (!b) return null;
    const i = b.querySelector(':scope > i'), t = b.querySelector(':scope > b');
    if (i) i.innerHTML = svg;
    if (t) t.textContent = nome;
    b.classList.add('v71-tile'); b.style.setProperty('--c', cor);
    const rot = b.getAttribute('aria-label') || '';      // o nome lido tem que conter a palavra que aparece (TREINO, não "Treinamento")
    if (rot.toUpperCase().indexOf(nome) < 0) b.setAttribute('aria-label', nome.charAt(0) + nome.slice(1).toLowerCase());
    return b;
  };
  const esq = nodo('nav', 'v71-col v71-esq'), dir = nodo('nav', 'v71-col v71-dir');
  esq.setAttribute('aria-label', 'Menu'); dir.setAttribute('aria-label', 'Galera');
  [tile(q('.rx-bt[data-loja]'), 'LOJA', V71_SVG.loja, '#ffd23f'), tile(q('[data-rx="skins"]'), 'TAMPINHA', V71_SVG.tampinha, '#f6f3ea'),
   tile(q('[data-rx="clube"]'), 'CLUBE', V71_SVG.clube, '#3f8cff'), tile(q('[data-rx="treino"]'), 'TREINO', V71_SVG.treino, '#ff8a2a')].forEach(b => b && esq.appendChild(b));
  [tile(q('.rx-bt[data-rx="salas"]'), 'SALAS', V71_SVG.salas, '#f6f3ea'), tile(q('[data-rx="amigos"]'), 'AMIGOS', V71_SVG.amigos, '#2fbf5b'),
   tile(q('[data-rx="ranking"]'), 'RANKING', V71_SVG.ranking, '#ffd23f')].forEach(b => b && dir.appendChild(b));
  const marca = rx.querySelector('.rx-marca');
  rx.insertBefore(esq, marca ? marca.nextSibling : rx.firstChild); esq.insertAdjacentElement('afterend', dir);
  for (const sel of ['[data-rx="passe"]', '[data-rx="comunidade"]', '.rx-bt[data-rx="chat"]']){   // saíram da tela (o caminho continua: ver o cabeçalho)
    const b = q(sel); if (b){ b.classList.add('v71-fora'); b.tabIndex = -1; b.setAttribute('aria-hidden', 'true'); }
  }
  const amg = topo.querySelector('.rx-amg'); if (amg){ amg.classList.add('v71-fora'); amg.tabIndex = -1; amg.setAttribute('aria-hidden', 'true'); }

  // a LIGA vai para o topo, do lado do seu cartão: a insígnia, "LIGA" e o elo
  const liga = q('[data-rx="ranqueada"]');
  if (liga){
    const sm = liga.querySelector('small'), elo = document.getElementById('lb-rq-elo'), t = liga.querySelector(':scope > b');
    if (sm && elo){ sm.textContent = ''; sm.appendChild(elo); }
    if (t) t.textContent = 'LIGA';
    liga.classList.add('v71-liga');
    LB.eu.insertAdjacentElement('afterend', liga);
  }
  // o chat do topo com o balão de desenho (o número de mensagens continua no selo)
  if (LB.chat){ const s = LB.chat.querySelector('svg'); if (s) s.outerHTML = V71_SVG.chat; }
  // o seu cartão: o nível vira um selo em cima da tampinha (o número; o resto fica para o leitor de tela)
  if (LB.euNv){ const av = $('lb-eu-av'); if (av){ const selo = nodo('b', 'v71-nv'); selo.id = 'v71-nv'; selo.setAttribute('aria-hidden', 'true'); av.insertAdjacentElement('afterend', selo); } }

  // DESAFIOS: a estrela de medalha no lugar da estrelinha
  if (LB.missoes){ const s = LB.missoes.querySelector('svg'); if (s) s.outerHTML = V71_SVG.desafios; LB.missoes.classList.add('v71-desafios'); }
  // o MODO: o desenho do modo, o nome, o tamanho e o campo, e as setinhas de trocar (abre o JOGAR na aba CASUAL)
  LB.modo.classList.add('v71-modo');
  LB.modo.innerHTML = '<i class="v71-modo-ic"></i><span class="v71-modo-tx"><b></b><small></small></span><em class="v71-modo-tr">' + V71_SVG.troca + '<span>TROCAR</span></em>';
  LB.jogar.classList.add('v71-jogar');
  // JOGAR › MODO: o desenho de cada modo no botão (a bola; a bola com a curva)
  if (RQP && RQP.modos) for (const b of RQP.modos.querySelectorAll('.rq-modo[data-j]')){
    if (b.querySelector('.v71-md-ic')) continue;
    const i = nodo('i', 'v71-md-ic'); i.innerHTML = b.dataset.j === 'curva' ? V71_SVG.curva : V71_SVG.bola; b.insertBefore(i, b.firstChild);
  }
  V71L.pronto = true;
  v71LbSync();
})();

if (typeof window.RUA_CENA === 'function'){             // o cenário: um véu escuro nas bordas (onde ficam os botões) e embaixo; o meio fica aceso
  const cenaAntes71 = window.RUA_CENA;
  window.RUA_CENA = function(g, w, h, chao, cx, esq, dir, zonas, X){
    const ok = cenaAntes71.apply(this, arguments);
    if (ok && LB.raiz.classList.contains('v71')) try {
      g.save();
      if (!(X && X.ret)){
        const lado = Math.min(560, w*.32);
        for (const [x0, x1] of [[0, lado], [w, w - lado]]){ const gr = g.createLinearGradient(x0, 0, x1, 0); gr.addColorStop(0, 'rgba(8,10,14,.5)'); gr.addColorStop(1, 'rgba(8,10,14,0)'); g.fillStyle = gr; g.fillRect(Math.min(x0, x1), 0, lado, h); }
      }
      const gb = g.createLinearGradient(0, h, 0, h - 280); gb.addColorStop(0, 'rgba(8,10,14,.5)'); gb.addColorStop(1, 'rgba(8,10,14,0)'); g.fillStyle = gb; g.fillRect(0, h - 280, w, 280);
      const gt = g.createLinearGradient(0, 0, 0, 150); gt.addColorStop(0, 'rgba(8,10,14,.32)'); gt.addColorStop(1, 'rgba(8,10,14,0)'); g.fillStyle = gt; g.fillRect(0, 0, w, 150);
      g.restore();
    } catch (_) {}
    return ok;
  };
  try { LB.fundo.dataset.k = ''; pintaFundoLobby(); } catch (_) {}   // (se o lobby já foi pintado antes daqui)
}
function v71LbSync(){                                   // o que muda com a conta e com a escolha do JOGAR (depois de cada lbRender)
  if (!V71L.pronto) return;
  try {
    const id = mdValida(X49.jogo), md = MD_MAP.get(id) || {nome:'Futebol'}, n = X49.n || 2, campo = CAMPOS[X49.map] || CAMPOS[0];
    const ic = LB.modo.querySelector('.v71-modo-ic'), b = LB.modo.querySelector('.v71-modo-tx b'), s = LB.modo.querySelector('.v71-modo-tx small');
    const svg = id === 'curva' ? V71_SVG.curva : V71_SVG.bola;
    if (ic && ic.dataset.j !== id){ ic.innerHTML = svg; ic.dataset.j = id; }
    const nome = md.nome.toUpperCase(), sub = n + 'v' + n + ' · ' + campo.nome.toUpperCase();
    if (b && b.textContent !== nome) b.textContent = nome;
    if (s && s.textContent !== sub) s.textContent = sub;
    const desc = ((typeof SL_MODO !== 'undefined' && SL_MODO[id]) || md.nome) + ', ' + n + ' contra ' + n + ', ' + campo.nome;
    LB.modo.setAttribute('aria-label', 'Trocar o que jogar (agora: ' + desc + ')');
    LB.jogar.setAttribute('aria-label', 'Jogar: ' + desc + ', ' + String(rqNivelCurto()).toLowerCase());
    const nv = nivelInfo(CONTA.xp).n, selo = document.getElementById('v71-nv');
    if (selo && selo.textContent !== String(nv)) selo.textContent = String(nv);
    if (LB.eu) LB.eu.setAttribute('aria-label', 'Abrir o seu perfil (' + perfil.nome + ', nível ' + nv + ')');
  } catch (_) {}
}
const lbRenderAntes71 = lbRender;
lbRender = function(){ const r = lbRenderAntes71.apply(this, arguments); v71LbSync(); return r; };
const renderRanqueadaAntes71 = renderRanqueada;
renderRanqueada = function(){
  const r = renderRanqueadaAntes71.apply(this, arguments);
  try { const cx = RQP.raiz.querySelector('.rq-caixa'); if (cx) cx.classList.toggle('v71-rq', JG.aba === 'ranked'); } catch (_) {}
  v71LbSync(); return r;
};
