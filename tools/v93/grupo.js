/* ==================================================================================================================
   RACHA v93 · Fase 4 — O GRUPO COM LÍDER NA TELA INICIAL (o servidor: server/grupo93.js)
   · CRIAR GRUPO, um botão pequeno colado no JOGAR (com o grupo: GRUPO 2/4). Ele abre o painel do grupo: quem está nele (a
     coroa no líder, o status de cada um), CHAMAR os amigos online (os convites vão pelo servidor: só amigos, sem bloqueio),
     SAIR DO GRUPO e, para o líder, PASSAR A LIDERANÇA e TIRAR alguém.
   · Os membros aparecem no lobby, ao lado da sua tampinha (as tampinhas e os nomes, a coroa no líder, o status: DISPONÍVEL,
     OCUPADO, PROCURANDO, EM PARTIDA, OFFLINE) — sem substituir nada do lobby: eles procuram o espaço livre ao lado da tampinha.
   · O LÍDER escolhe o modo (o 2 VS 2 de sempre) e o JOGAR dele leva o grupo inteiro para a ranqueada (o mesmo time); quem não é
     o líder vê a busca abrir junto e pode cancelar (para todos). O grupo continua depois da partida.
   · O CONVITE que chega é um cartão pequeno em cima (ACEITAR / RECUSAR, vale 60 s); no meio de uma partida ele espera.
   Sem conta (ou sem o servidor das salas) o botão não aparece: o grupo é dos amigos da conta.
   ================================================================================================================== */
const V93G = {g:null, convites:[], el:null, painel:false, ultModo:0, ultPts:-1, lugarK:'', painelK:'', aviso:null};
const V93G_ST = {disponivel:['DISPONÍVEL', 'ok'], ocupado:['OCUPADO', 'ocup'], buscando:['PROCURANDO', 'busca'], partida:['EM PARTIDA', 'jogo'], offline:['OFFLINE', 'off']};
const V93G_COROA = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.6 8.2l5 3.6L12 4.4l4.4 7.4 5-3.6-2 10.6H4.6z" fill="#ffd23f" stroke="#2a1d00" stroke-width="1.6" stroke-linejoin="round"/><rect x="4.4" y="19.4" width="15.2" height="2.6" rx="1" fill="#ffd23f" stroke="#2a1d00" stroke-width="1.2"/></svg>';
const V93G_GENTE = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="8.5" cy="8" r="3.6" fill="currentColor"/><path d="M1.8 20c0-4.4 3-6.9 6.7-6.9s6.7 2.5 6.7 6.9z" fill="currentColor"/><circle cx="16.6" cy="9" r="3" fill="currentColor"/><path d="M15.8 13.4c3.6-.3 6.4 1.9 6.4 6.6h-5.3" fill="currentColor"/></svg>';

function v93GrupoPode(){ try { return v88Logado() && v88PodeConectar(); } catch (_) { return false; } }
function v93GrupoN(){ return V93G.g ? V93G.g.membros.length : 0; }
function v93GrupoLider(){ return !!V93G.g && !!NET49.id && V93G.g.lider === NET49.id; }
function v93GrupoNomeLider(){ const g = V93G.g, m = g && g.membros.find(x => x.id === g.lider); return m ? m.nome : 'o líder'; }
function v93GrupoManda(type, o){
  if (!NET49.id || !NET49.ws || NET49.ws.readyState !== 1){ v88Aviso('Conectando ao servidor das salas… tente de novo em um instante.'); try { v88Conecta(); } catch (_) {} return false; }
  net49Send(Object.assign({type}, o || {})); return true;
}

/* ---------------------------------------------------------------- 1) os elementos (no lobby, por cima do palco e embaixo das telas) */
function v93GrupoMonta(){
  if (V93G.el) return V93G.el;
  const raiz = nodo('div', 'v93-grupo'); raiz.id = 'v93-grupo';
  const lista = nodo('div', 'v93-gm-lista');
  const bt = novoBotao('v93-grupo-bt', 'Criar um grupo para jogar com os amigos');
  bt.innerHTML = '<i>' + V93G_GENTE + '</i><b>CRIAR GRUPO</b>';
  bt.addEventListener('click', e => { e.stopPropagation(); som.clique(); v93GrupoBotao(); });
  const pn = nodo('aside', 'v93-gp'); pn.hidden = true; pn.setAttribute('role', 'dialog'); pn.setAttribute('aria-label', 'O seu grupo');
  pn.addEventListener('pointerdown', e => e.stopPropagation());
  const cv = nodo('div', 'v93-gc'); cv.hidden = true; cv.setAttribute('role', 'alertdialog'); cv.setAttribute('aria-live', 'assertive');
  cv.addEventListener('pointerdown', e => e.stopPropagation());
  raiz.append(lista, bt, pn);
  document.body.appendChild(cv);                                  // (o convite aparece também com uma tela do lobby aberta: fica por cima)
  const antes = LB.camada && LB.camada.parentNode === LB.raiz ? LB.camada : null;
  LB.raiz.insertBefore(raiz, antes);
  V93G.el = {raiz, lista, bt, pn, cv};
  return V93G.el;
}
function v93GrupoBotao(){
  if (!v93GrupoPode()) return v88Aviso('Entre na sua conta para jogar em grupo com os amigos.');
  if (!V93G.g){ if (v93GrupoManda('grupo_cria', {n:CONTA.rq.n | 0 || 2, pts:CONTA.rq.pts | 0})){ V93G.painel = true; V93G.abrirAoChegar = true; } return; }
  V93G.painel = !V93G.painel; v93GrupoPinta();
}
function v93GrupoVisivel(){                                    // o lobby aberto, sem tela nem janela por cima
  try {
    return lobby.aberto && !lobby.tela && LB.pop.hidden && !(V79R && V79R.busca) && !NET49.playing && !LB.raiz.classList.contains('retrato')
      && !(typeof HE !== 'undefined' && HE.aberto) && (!LB.aj || LB.aj.hidden);
  } catch (_) { return false; }
}

/* ---------------------------------------------------------------- 2) onde fica cada coisa (o espaço livre ao lado da tampinha e em cima do JOGAR) */
function v93GrupoObstaculos(){                                  // tudo que se toca no lobby (menos o que é do grupo)
  const L = [], fora = V93G.el.raiz;
  for (const e of LB.raiz.querySelectorAll('button, .hm-skin, .lb-rot, .rx-marca, .v90-dica')){
    if (fora.contains(e) || e.closest('#lb-camada') || e === LB.emblema) continue;
    const r = e.getBoundingClientRect(); if (r.width < 4 || r.height < 4) continue;
    const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < .1 || e.closest('[hidden]')) continue;
    L.push(r);
  }
  return L;
}
function v93GrupoBtLargura(bt){                                 // a largura do botão com o texto inteiro numa linha
  const w0 = bt.style.width, d = bt.classList.contains('duas'); bt.style.width = 'auto'; if (d) bt.classList.remove('duas');
  const w = Math.ceil(bt.getBoundingClientRect().width) + 2; bt.style.width = w0; if (d) bt.classList.add('duas'); return w;
}
const v93Cruza = (a, b, m) => a.left < b.right + m && a.right > b.left - m && a.top < b.bottom + m && a.bottom > b.top - m;
function v93GrupoLugar(){
  const E = V93G.el; if (!E || E.raiz.hidden) return;
  const base = LB.raiz.getBoundingClientRect(), emb = LB.emblema.getBoundingClientRect(), J = LB.jogar.getBoundingClientRect();
  const vw = innerWidth, vh = innerHeight, obst = v93GrupoObstaculos();
  // o botão CRIAR GRUPO: em cima do JOGAR, encostado na direita dele (ou no que estiver à direita, o EVENTOS), com a largura do
  // texto inteiro; sem a largura toda, o texto em duas linhas (nunca cortado); sem lugar em cima, à esquerda do JOGAR
  const bh = Math.max(44, Math.round(J.height*.5)), fs = Math.round(Math.min(20, Math.max(13, bh*.34)));
  E.bt.style.fontSize = fs + 'px'; E.bt.style.height = bh + 'px';
  const nat = v93GrupoBtLargura(E.bt), by0 = J.top - bh - Math.max(5, J.height*.07), faixa = o => o.bottom > by0 - 2 && o.top < by0 + bh + 2;
  let dir = J.right;
  for (const o of obst) if (faixa(o) && o.left > J.left - 4 && o.left < dir) dir = o.left - 8;
  let esq = dir - nat;
  for (const o of obst) if (faixa(o) && o.right > esq && o.left < dir) esq = Math.max(esq, o.right + 8);
  let bx = esq, by = by0, bw = dir - esq;
  const duas = bw < nat - 1;
  if (by < 4 || bw < Math.min(nat, 96) || obst.some(o => v93Cruza({left:bx, right:bx + bw, top:by, bottom:by + bh}, o, 2))){ bw = Math.min(nat, 180); bx = J.left - bw - 8; by = J.top + (J.height - bh)/2; }
  E.bt.classList.toggle('duas', duas && bw >= 96);
  Object.assign(E.bt.style, {left:Math.round(bx - base.left) + 'px', top:Math.round(by - base.top) + 'px', width:Math.round(bw) + 'px'});
  // os membros: ao lado da tampinha (um à direita, um à esquerda, o próximo à direita…), do tamanho que couber
  const cx = emb.left + emb.width/2, cy = emb.top + emb.height/2, R = emb.width/2/1.04;
  const itens = E.lista.children, n = itens.length;
  let r = Math.max(26, Math.round(R*.42)), lugares = [];
  for (let tenta = 0; tenta < 4; tenta++){
    const nomeH = Math.max(30, Math.round(r*.95)), gap = Math.max(12, r*.4), passo = 2*r + Math.max(16, r*.55), y = cy + R*.16;
    const livre = x => {
      const q = {left:x - r - 8, right:x + r + 8, top:y - r - 16, bottom:y + r + nomeH};
      if (q.left < 4 || q.right > vw - 4 || q.top < 4 || q.bottom > vh - 4) return false;
      return !obst.some(o => v93Cruza(q, o, 3));
    };
    lugares = [];
    for (let k = 0; k < 4 && lugares.length < n; k++) for (const lado of [1, -1]){
      if (lugares.length >= n) break;
      const x = cx + lado*(R + gap + r + k*passo);
      if (livre(x)) lugares.push({x, y});
    }
    if (lugares.length >= n || r <= 22) break;
    r = Math.max(22, Math.round(r*.84));
  }
  for (let i = 0; i < n; i++){
    const it = itens[i], p = lugares[i];
    if (!p){ it.style.display = 'none'; continue; }
    it.style.display = '';
    Object.assign(it.style, {left:Math.round(p.x - base.left - r - 4) + 'px', top:Math.round(p.y - base.top - r - 4) + 'px', width:(2*r + 8) + 'px'});
    it.style.setProperty('--r', r + 'px');
  }
  // o painel do grupo: do lado direito da tela, embaixo da barra de cima e em cima do JOGAR (sem cobrir nenhum dos dois)
  if (!E.pn.hidden){
    const pw = Math.min(360, Math.max(280, vw*.36)), px = Math.min(vw - pw - 8, Math.max(J.right - pw, cx + R + 8));
    let top = 8;
    for (const o of obst) if (o.bottom < vh*.15 && o.right > px && o.left < px + pw) top = Math.max(top, o.bottom + 6);   // (a barra de cima: as moedas, o correio, os ajustes)
    Object.assign(E.pn.style, {width:Math.round(pw) + 'px', left:Math.round(px - base.left) + 'px', top:Math.round(top - base.top) + 'px',
      maxHeight:Math.round(Math.max(160, J.top - top - 8)) + 'px'});
  }
}

/* ---------------------------------------------------------------- 3) o desenho: os membros, o botão e o painel */
function v93GrupoCap(c, skin){ try { miniCanvas(c, skinPorId(skin || ''), null); } catch (_) {} }
function v93GrupoPinta(){
  const E = v93GrupoMonta();
  const pode = v93GrupoPode(), vis = pode && v93GrupoVisivel();
  E.raiz.hidden = !vis;
  const g = V93G.g;
  // o botão
  const n = v93GrupoN();
  const rot = g ? 'GRUPO ' + n + '/' + (g.max || 4) : 'CRIAR GRUPO';
  const b = E.bt.querySelector('b'); if (b.textContent !== rot) b.textContent = rot;
  E.bt.classList.toggle('com', !!g); E.bt.setAttribute('aria-expanded', String(!!V93G.painel && !!g));
  E.bt.setAttribute('aria-label', g ? 'O seu grupo: ' + n + ' de ' + (g.max || 4) : 'Criar um grupo para jogar com os amigos');
  // os membros ao lado da tampinha
  const outros = g ? g.membros.filter(m => m.id !== NET49.id) : [], vaga = g && n < (g.max || 4);
  const chave = JSON.stringify([outros.map(m => [m.id, m.nome, m.skin, m.st, m.lider]), vaga, g && g.lider === NET49.id]);
  if (chave !== V93G.lugarK){
    V93G.lugarK = chave; E.lista.textContent = '';
    for (const m of outros){
      const st = V93G_ST[m.st] || V93G_ST.offline;
      const it = novoBotao('v93-gm st-' + st[1] + (m.lider ? ' lider' : ''), m.nome + (m.lider ? ' (líder)' : '') + ': ' + st[0].toLowerCase());
      const c = document.createElement('canvas'); c.width = c.height = 120; c.className = 'v93-gm-cap'; v93GrupoCap(c, m.skin);
      it.appendChild(c);
      if (m.lider){ const k = nodo('i', 'v93-gm-coroa'); k.innerHTML = V93G_COROA; it.appendChild(k); }
      const nm = nodo('span', 'v93-gm-nome', m.nome); const s = nodo('span', 'v93-gm-st'); s.append(nodo('i'), document.createTextNode(st[0]));
      it.append(nm, s);
      it.addEventListener('click', e => { e.stopPropagation(); som.clique(); V93G.painel = true; v93GrupoPinta(); });
      E.lista.appendChild(it);
    }
    if (vaga){
      const it = novoBotao('v93-gm vaga', 'Chamar um amigo para o grupo');
      const c = nodo('span', 'v93-gm-mais', '+'); it.append(c, nodo('span', 'v93-gm-nome', 'CHAMAR'));
      it.addEventListener('click', e => { e.stopPropagation(); som.clique(); V93G.painel = true; v93GrupoPinta(); });
      E.lista.appendChild(it);
    }
  }
  // a coroa em cima da sua tampinha (você é o líder)
  LB.raiz.classList.toggle('v93-lider', !!g && g.lider === NET49.id && n > 1);
  // o painel (refeito só quando muda: o toque num botão dele nunca se perde)
  E.pn.hidden = !(vis && V93G.painel && g);
  if (!E.pn.hidden){
    const k = v93GrupoPainelChave();
    if (k !== V93G.painelK){ V93G.painelK = k; v93GrupoPainel(E.pn); }
    for (const x of E.pn.querySelectorAll('[data-ate]')){ const t = 'CONVIDADO · ' + Math.max(1, Math.ceil((+x.dataset.ate - Date.now())/1000)) + ' S'; if (x.textContent !== t) x.textContent = t; }
  } else V93G.painelK = '';
  if (vis) v93GrupoLugar();
  v93GrupoConvitePinta();
}
function v93GrupoPainelChave(){
  const g = V93G.g; if (!g) return '';
  let amg = []; try { amg = v88AmigosOrdenados().map(c => { const st = v88StatusDe(c.idPublico); return v88Pub(c.idPublico) + ':' + (st ? st.st : '-'); }); } catch (_) {}
  return JSON.stringify([g.lider, g.modo, g.membros.map(m => [m.id, m.nome, m.st, m.skin]), (g.convites || []).map(c => c.p), CONTA.rq.n | 0, NET49.id, amg]);
}
function v93GpBt(txt, cls, fn, rot){ const b = novoBotao('v93-gp-bt' + (cls ? ' ' + cls : ''), rot || txt); b.textContent = txt; b.addEventListener('click', e => { e.stopPropagation(); som.clique(); fn(); }); return b; }
function v93GrupoPainel(pn){
  const g = V93G.g; if (!g) return;
  const lider = v93GrupoLider(), n = g.membros.length;
  pn.textContent = '';
  const cab = nodo('div', 'v93-gp-cab');
  cab.append(nodo('b', null, 'GRUPO ' + n + '/' + (g.max || 4)), nodo('small', null, lider ? 'VOCÊ É O LÍDER' : 'LÍDER: ' + v93GrupoNomeLider().toUpperCase()));
  const fx = nodo('span', 'v93-gp-cab-ac');                  // (SAIR em cima, ao lado do fechar: o painel cabe no celular deitado)
  fx.append(v93GpBt('SAIR', 'vermelho v93-gp-sair', () => { V93G.painel = false; v93GrupoManda('grupo_sai'); }, 'Sair do grupo'),
    v93GpBt('✕', 'v93-gp-x', () => { V93G.painel = false; v93GrupoPinta(); }, 'Fechar o painel do grupo'));
  cab.appendChild(fx);
  pn.appendChild(cab);
  const modo = nodo('p', 'v93-gp-modo');
  const nm = lider ? (CONTA.rq.n | 0 || 2) : (g.modo | 0 || 2);
  modo.append(nodo('b', null, nm + ' VS ' + nm + ' · RANQUEADA'), document.createTextNode(lider ? (n > nm ? ' · o grupo não cabe: escolha ' + n + ' VS ' + n + ' ou maior' : ' · toque em JOGAR para procurar com o grupo') : ' · o líder escolhe e começa a busca'));
  modo.classList.toggle('alerta', lider && n > nm);
  pn.appendChild(modo);
  const ul = nodo('ul', 'v93-gp-lista');
  for (const m of g.membros){
    const st = V93G_ST[m.st] || V93G_ST.offline, eu = m.id === NET49.id;
    const li = nodo('li', 'v93-gp-l st-' + st[1]);
    const c = document.createElement('canvas'); c.width = c.height = 72; c.className = 'v93-gp-cap'; v93GrupoCap(c, m.skin);
    const tx = nodo('span', 'v93-gp-tx'), nome = nodo('b', null, m.nome + (eu ? ' (você)' : ''));
    if (m.lider){ const k = nodo('i', 'v93-gp-coroa'); k.innerHTML = V93G_COROA; nome.prepend(k); }
    const s = nodo('small'); s.append(nodo('i'), document.createTextNode(st[0])); tx.append(nome, s);
    const ac = nodo('span', 'v93-gp-ac');
    if (lider && !eu){
      ac.appendChild(v93GpBt('LÍDER', 'amarelo', () => v93GrupoManda('grupo_lider', {id:m.id}), 'Passar a liderança para ' + m.nome));
      ac.appendChild(v93GpBt('TIRAR', 'vermelho', () => v93GrupoManda('grupo_expulsa', {id:m.id}), 'Tirar ' + m.nome + ' do grupo'));
    }
    li.append(c, tx, ac); ul.appendChild(li);
  }
  for (const cv of g.convites || []){
    const li = nodo('li', 'v93-gp-l conv');
    const sm = nodo('small', null, ''); sm.dataset.ate = String(cv.ate || (Date.now() + (cv.resta || 0)));
    li.append(nodo('span', 'v93-gp-cap vazio', '…'), (() => { const tx = nodo('span', 'v93-gp-tx'); tx.append(nodo('b', null, cv.nome), sm); return tx; })());
    ul.appendChild(li);
  }
  pn.appendChild(ul);
  if (n < (g.max || 4)){                                     // chamar os amigos online
    pn.appendChild(nodo('h4', 'v93-gp-sub', 'CHAMAR AMIGOS ONLINE'));
    const lst = nodo('ul', 'v93-gp-lista amigos');
    const no = new Set(g.membros.map(m => m.p)), conv = new Set((g.convites || []).map(c => c.p));
    const on = v88AmigosOrdenados().filter(c => v88StatusDe(c.idPublico) && !no.has(v88Pub(c.idPublico)));
    if (!on.length) lst.appendChild(nodo('li', 'v93-gp-vazio', V88.amigos.length ? 'Nenhum amigo online agora.' : 'Adicione amigos em AMIGOS para chamar para o grupo.'));
    for (const c of on.slice(0, 12)){
      const pub = v88Pub(c.idPublico), s = v88StatusDe(pub), li = nodo('li', 'v93-gp-l');
      let av; try { av = v88AvatarEl(c, 36); av.classList.add('v93-gp-cap'); } catch (_) { av = nodo('span', 'v93-gp-cap vazio'); }
      const tx = nodo('span', 'v93-gp-tx'); tx.append(nodo('b', null, c.nome), nodo('small', null, v88StatusTxt(s)));
      const ac = nodo('span', 'v93-gp-ac');
      ac.appendChild(conv.has(pub) ? nodo('em', 'v93-gp-ok', 'CHAMADO') : v93GpBt('CHAMAR', 'verde', () => v93GrupoManda('grupo_convida', {para:pub, n:CONTA.rq.n | 0 || 2, pts:CONTA.rq.pts | 0}), 'Chamar ' + c.nome + ' para o grupo'));
      li.append(av, tx, ac); lst.appendChild(li);
    }
    pn.appendChild(lst);
  }
}

/* ---------------------------------------------------------------- 4) o convite que chega (um cartão pequeno em cima) */
function v93GrupoConvitePinta(){
  const E = V93G.el; if (!E) return;
  const agora = Date.now(); V93G.convites = V93G.convites.filter(x => x.ate > agora);
  const c = V93G.convites[0], pode = c && lobby.aberto && !NET49.playing && v93GrupoPode();
  E.cv.hidden = !pode;
  if (!pode){ E.cv.dataset.id = ''; return; }
  const resta = Math.max(1, Math.ceil((c.ate - agora)/1000));
  if (E.cv.dataset.id !== c.id){
    E.cv.dataset.id = c.id; E.cv.textContent = '';
    const ic = nodo('i', 'v93-gc-ic'); ic.innerHTML = V93G_GENTE;
    const tx = nodo('span', 'v93-gc-tx'); tx.append(nodo('b', null, (c.de && c.de.nome || 'Um amigo') + ' chamou você para o grupo'), nodo('small', 'v93-gc-t', ''));
    const ac = nodo('span', 'v93-gc-ac');
    ac.append(v93GpBt('RECUSAR', '', () => v93GrupoResponde(c.id, false), 'Recusar o convite'), v93GpBt('ACEITAR', 'verde', () => v93GrupoResponde(c.id, true), 'Entrar no grupo'));
    E.cv.append(ic, tx, ac);
  }
  const t = E.cv.querySelector('.v93-gc-t'), s = (c.gente | 0) + '/' + (c.max || 4) + ' no grupo · vale por ' + resta + ' s';
  if (t.textContent !== s) t.textContent = s;
}
function v93GrupoResponde(id, aceita){
  V93G.convites = V93G.convites.filter(x => x.id !== id);   // (o servidor para a sua busca sozinho, se aceitar: nada sai antes dele concordar)
  v93GrupoManda('grupo_resposta', {id, aceita:!!aceita, pts:CONTA.rq.pts | 0});
  v93GrupoPinta();
}

/* ---------------------------------------------------------------- 5) a busca do grupo (a ranqueada de sempre, pelo líder) */
const v79JogarAntes93 = v79Jogar;
v79Jogar = function(n){
  const g = V93G.g;
  if (g && g.membros.length > 1 && v93GrupoPode()){
    if (!v93GrupoLider()){ x49Toast('Quem começa a busca é o líder do grupo (' + v93GrupoNomeLider() + ').'); try { som.erro(); } catch (_) {} return; }
    const k = g.membros.length, nn = [1, 2, 3, 4].indexOf(+n) >= 0 ? +n : CONTA.rq.n | 0 || 2;
    if (k > nn){ x49Toast('O grupo tem ' + k + ' pessoas: escolha ' + k + ' VS ' + k + (k < 4 ? ' ou maior' : '') + '.'); try { som.erro(); } catch (_) {} return; }
    const fora = g.membros.filter(m => m.st !== 'disponivel' && m.id !== NET49.id && !(m.st === 'ocupado'));
    if (fora.length){ x49Toast(fora[0].nome + (fora[0].st === 'partida' ? ' ainda está numa partida.' : ' está offline agora.')); return; }
  }
  const r = v79JogarAntes93.apply(this, arguments);
  try { if (V79R.busca && g && g.membros.length > 1){ V79R.busca.grupo = true; V79R.busca.ate = V79R.busca.t0 + 60000; if (V79R.el) V79R.el.classList.add('v93-grupo-busca'); } } catch (_) {}
  return r;
};
function v93GrupoBuscaAbre(n){                                  // (quem não é o líder: a busca abre junto, sem pedir de novo)
  if (V79R.busca) return;
  try { if (!lobby.aberto){ if (typeof fimAberto === 'function' && fimAberto()) fechaFim(); if (RQ.on) rqSai(); abrirLobby(); } } catch (_) {}
  try { if (lobby.tela){ TELAS[lobby.tela].el.hidden = true; lobby.tela = null; lbMarcaTela(); } if (!LB.pop.hidden){ LB.pop.hidden = true; filaPop.length = 0; } } catch (_) {}
  CONTA.rq.n = n; contaSalvar();
  X49.mode = 'ranked'; X49.n = n; X49.map = MAPA_RQ; X49.jogo = 'futebol'; x49Save();
  const el = v79BuscaMonta(), agora = performance.now(), e = rqElo(CONTA.rq.pts);
  V79R.busca = {n, t0:agora, online:true, fase:'fila', ate:agora + 60000, espera:20000, gente:0, grupo:true};
  el.querySelector('.v79-busca-ins').innerHTML = rqInsignia(e);
  el.querySelector('.v79-busca-tag').textContent = 'RANQUEADA EM GRUPO · ' + n + ' VS ' + n + ' · ' + CAMPOS[MAPA_RQ].nome.toUpperCase();
  el.classList.add('v93-grupo-busca'); el.hidden = false;
  clearInterval(V79R.intT); V79R.intT = setInterval(v79BuscaTique, 250);
  v79BuscaPinta();
}
const v79BotsAntes93 = v79Bots;
v79Bots = function(motivo){                                       // (na busca do grupo, a partida contra os bots não existe: cancela)
  const B = V79R.busca;
  if (B && B.grupo){ if (B.fase === 'fila') net49Send({type:'fila_sai'}); v79BuscaFecha(); if (motivo !== 'escolheu') x49Toast('A busca do grupo parou (' + (motivo === 'caiu' ? 'a conexão caiu' : 'sem resposta do servidor') + ').'); return; }
  return v79BotsAntes93.apply(this, arguments);
};
const v79BuscaFechaAntes93 = v79BuscaFecha;
v79BuscaFecha = function(){ try { if (V79R.el) V79R.el.classList.remove('v93-grupo-busca'); } catch (_) {} return v79BuscaFechaAntes93.apply(this, arguments); };

/* ---------------------------------------------------------------- 6) o que o servidor manda */
const net49MessageAntes93g = net49Message;
net49Message = function(m){
  try {
    if (m && m.type === 'grupo'){
      const antes = V93G.g;
      V93G.g = m.g || null;
      if (V93G.g && Array.isArray(V93G.g.convites)) for (const cv of V93G.g.convites) cv.ate = Date.now() + (cv.resta || 0);
      if (!m.g){ V93G.painel = false; if (antes && m.motivo === 'expulso') v88Aviso('O líder tirou você do grupo.'); else if (antes && m.motivo === 'caiu') v88Aviso('Você ficou fora do grupo (a conexão caiu).'); }
      else if (V93G.abrirAoChegar){ V93G.abrirAoChegar = false; V93G.painel = true; }
      V93G.lugarK = ''; v93GrupoPinta(); return;
    }
    if (m && m.type === 'grupo_convite'){
      V93G.convites = V93G.convites.filter(x => x.id !== m.id && !(x.de && m.de && x.de.p === m.de.p));
      V93G.convites.push(Object.assign({}, m, {ate:Date.now() + (m.expira || 60000)}));
      if (NET49.playing){ try { v88Nota((m.de && m.de.nome || 'Um amigo') + ' chamou você para o grupo (aparece no lobby depois da partida).', 'convites'); } catch (_) {} }
      else { try { som.clique(); } catch (_) {} }
      v93GrupoPinta(); return;
    }
    if (m && m.type === 'grupo_aviso'){ v88Aviso(m.txt || ''); return; }
    if (m && m.type === 'grupo_erro'){ try { som.erro(); } catch (_) {} v88Aviso(m.motivo || 'Não deu certo.'); return; }
    if (m && m.type === 'fila' && m.grupo){
      if (m.on && !m.lider) v93GrupoBuscaAbre(m.n | 0 || 2);
      else if (m.on && V79R.busca){ V79R.busca.grupo = true; V79R.busca.ate = V79R.busca.t0 + 60000; }
      if (!m.on){ if (V79R.busca) v79BuscaFecha(); if (m.motivo) x49Toast(m.motivo); }
      if (!m.on) return;
    }
    if (m && m.type === 'error' && m.codigo === 'fila_grupo'){ if (V79R.busca) v79BuscaFecha(); x49Toast(m.message || 'A busca do grupo não começou.'); try { som.erro(); } catch (_) {} return; }
  } catch (e) { console.error('v93 grupo', e); }
  const r = net49MessageAntes93g.apply(this, arguments);
  try { if (m && m.type === 'hello'){ V93G.lugarK = ''; if (V93G.g) setTimeout(() => { try { if (NET49.id && NET49.ws && NET49.ws.readyState === 1) net49Send({type:'grupo_estado'}); } catch (_) {} }, 400); } } catch (_) {}
  return r;
};

/* ---------------------------------------------------------------- 7) o ritmo: o modo do líder, os pontos e o desenho */
setInterval(() => {
  try {
    const g = V93G.g;
    if (g && NET49.id){
      if (v93GrupoLider() && (CONTA.rq.n | 0) && (CONTA.rq.n | 0) !== g.modo && !g.busca && V93G.ultModo !== CONTA.rq.n){ V93G.ultModo = CONTA.rq.n | 0; net49Send({type:'grupo_modo', n:CONTA.rq.n | 0}); }
      if ((CONTA.rq.pts | 0) !== V93G.ultPts){ V93G.ultPts = CONTA.rq.pts | 0; net49Send({type:'grupo_pts', pts:CONTA.rq.pts | 0}); }
    }
    if (!v93GrupoPode() && V93G.g){ V93G.g = null; V93G.painel = false; }
    v93GrupoPinta();
  } catch (_) {}
}, 700);
addEventListener('resize', () => { try { V93G.lugarK = ''; setTimeout(v93GrupoPinta, 60); } catch (_) {} });
const lbLayoutAntes93 = lbLayout;
lbLayout = function(){ const r = lbLayoutAntes93.apply(this, arguments); try { if (V93G.el) setTimeout(v93GrupoPinta, 0); } catch (_) {} return r; };
document.addEventListener('pointerdown', e => {                     // tocar fora do painel fecha (o painel não fica no caminho)
  try { if (V93G.painel && V93G.el && !V93G.el.pn.hidden && !V93G.el.pn.contains(e.target) && !V93G.el.bt.contains(e.target) && !V93G.el.lista.contains(e.target)){ V93G.painel = false; v93GrupoPinta(); } } catch (_) {}
}, true);
try { v93GrupoMonta(); } catch (e) { console.error('v93 grupo', e); }
window.RachaGrupo93 = {estado:() => V93G.g ? JSON.parse(JSON.stringify(V93G.g)) : null, convites:() => V93G.convites.slice()};
