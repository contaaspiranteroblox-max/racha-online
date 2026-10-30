/* =====================================================================================================================
   RACHA v95 · O GRUPO NA RANQUEADA: o PRONTO no lobby, o JOGAR do dono do grupo e o JOGAR DE NOVO com 10 s
   (o servidor: server/grupo93.js). O pedido: "quando o jogador estiver em equipe e clicar jogar de novo, aparece se todos da
   equipe botaram jogar de novo; se todos não botarem em 10 segundos, volta automaticamente para o lobby; jogadores põem
   pronto e o dono da equipe joga".
   · No lobby, com grupo: quem não é o líder vê o JOGAR virar PRONTO (toca e fica PRONTO ✓; toca de novo e sai); o líder vê
     embaixo do JOGAR quantos estão prontos, e o JOGAR dele só procura com todos prontos. Os amigos ao lado da sua tampinha e
     o painel do grupo mostram quem está PRONTO.
   · No fim da ranqueada, com grupo: o JOGAR DE NOVO é do grupo — aparece quem já tocou (✓), quem falta e o relógio de 10 s;
     todos tocaram, a busca do grupo começa sozinha (o mesmo tamanho); senão, todo mundo volta para o lobby (e lá, PRONTO e o
     líder joga). O LOBBY com a votação aberta leva todo mundo para o lobby.
   Sozinho (ou sem o grupo no servidor) nada muda: o JOGAR DE NOVO procura outra partida, como sempre.
   ===================================================================================================================== */
const V95G = {votei:false, sala:'', relT:0, chave:'', ultJogar:''};
const V95G_DENOVO_MS = 10000;
V93G_ST.pronto = ['PRONTO ✓', 'pronto'];

function v95GrupoAtivo(){ try { return !!V93G.g && V93G.g.membros.length > 1 && v93GrupoPode(); } catch (_) { return false; } }
function v95GrupoEu(){ const g = V93G.g; return g && NET49.id ? g.membros.find(m => m.id === NET49.id) || null : null; }
function v95GrupoProntos(){                                    // quem precisa tocar em PRONTO: todos menos o líder
  const g = V93G.g, outros = g ? g.membros.filter(m => m.id !== g.lider) : [], falta = outros.filter(m => !m.pronto);
  return {ok:outros.length - falta.length, tot:outros.length, falta};
}
const v95NomesE = l => l.length < 2 ? (l[0] || '') : l.slice(0, -1).join(', ') + ' e ' + l[l.length - 1];
const v95ProntoDe = m => !!m && !!m.pronto && !m.lider && m.st === 'disponivel';   // (no lobby: o status vira PRONTO)

/* ---------------------------------------------------------------- 1) o JOGAR no lobby: PRONTO (quem não é o líder) e os prontos (o líder) */
const v79JogarAntes95g = v79Jogar;
v79Jogar = function(n){
  try {
    if (v95GrupoAtivo()){
      if (!v93GrupoLider()){                                     // o JOGAR vira o PRONTO
        const eu = v95GrupoEu(), on = !(eu && eu.pronto);
        if (v93GrupoManda('grupo_pronto', {on})){
          if (eu) eu.pronto = on;
          x49Toast(on ? 'PRONTO! O líder (' + v93GrupoNomeLider() + ') começa a busca quando todos estiverem prontos.' : 'Você não está mais pronto.');
          try { som.clique(); } catch (_) {}
          V93G.painelK = ''; v93GrupoPinta();
        }
        return;
      }
      const p = v95GrupoProntos();
      if (p.falta.length){
        const nm = p.falta.map(m => m.nome);
        x49Toast(v95NomesE(nm) + (nm.length > 1 ? ' ainda não estão prontos' : ' ainda não está pronto') + ': cada um toca em PRONTO (no JOGAR) e aí você joga.');
        try { som.erro(); } catch (_) {}
        return;
      }
    }
  } catch (e) { console.error('v95 grupo', e); }
  return v79JogarAntes95g.apply(this, arguments);
};
// embaixo do JOGAR (a segunda linha): o que falta para jogar com o grupo
const rapidoTextoAntes95g = rapidoTexto;
rapidoTexto = function(){
  try {
    if (v95GrupoAtivo()){
      const g = V93G.g, n = v93GrupoLider() ? (CONTA.rq.n | 0 || 2) : (g.modo | 0 || 2);
      if (!v93GrupoLider()){ const eu = v95GrupoEu(); return 'GRUPO · ' + n + 'v' + n + '\n' + (eu && eu.pronto ? 'ESPERANDO O LÍDER · TOQUE PARA SAIR' : 'TOQUE QUANDO ESTIVER PRONTO'); }
      const p = v95GrupoProntos();
      return 'GRUPO · ' + n + 'v' + n + '\n' + (p.ok >= p.tot ? (p.tot > 1 ? 'TODOS PRONTOS' : 'PRONTO') + ' · TOQUE PARA JOGAR' : p.ok + ' DE ' + p.tot + ' PRONTO' + (p.tot > 1 ? 'S' : ''));
    }
  } catch (_) {}
  return rapidoTextoAntes95g.apply(this, arguments);
};
function v95GrupoJogarPinta(){
  const J = LB.jogar; if (!J) return;
  const tit = J.querySelector('.lb-jogar-tit'), ativo = v95GrupoAtivo(), lider = ativo && v93GrupoLider(), eu = ativo ? v95GrupoEu() : null;
  const p = lider ? v95GrupoProntos() : null;
  const t = ativo && !lider ? (eu && eu.pronto ? 'PRONTO ✓' : 'PRONTO') : 'JOGAR';
  if (tit && tit.textContent !== t) tit.textContent = t;
  J.classList.toggle('v95-pronto', ativo && !lider);
  J.classList.toggle('v95-pronto-on', ativo && !lider && !!(eu && eu.pronto));
  J.classList.toggle('v95-lider-espera', !!p && p.ok < p.tot);
  // a etiqueta em cima do JOGAR (a linha de baixo do botão não aparece no lobby novo): os prontos ou o que falta
  let pr = J.querySelector('.v95-jogar-pr');
  if (!pr && ativo){ pr = nodo('span', 'v95-jogar-pr'); pr.setAttribute('aria-hidden', 'true'); J.appendChild(pr); }
  if (pr){
    pr.hidden = !ativo;
    const e = !ativo ? '' : !lider ? (eu && eu.pronto ? 'ESPERANDO O LÍDER' : 'O LÍDER COMEÇA A BUSCA')
      : p.tot === 1 ? (p.ok ? 'O GRUPO ESTÁ PRONTO' : 'ESPERANDO O PRONTO') : (p.ok >= p.tot ? 'TODOS PRONTOS' : p.ok + ' DE ' + p.tot + ' PRONTOS');
    if (pr.textContent !== e) pr.textContent = e;
  }
  const k = t + '|' + (p ? p.ok + '/' + p.tot : '') + '|' + (eu && eu.pronto ? 1 : 0);
  if (k !== V95G.ultJogar){
    V95G.ultJogar = k;
    try { if (LB.rapidoSub){ const s = rapidoTexto(); if (LB.rapidoSub.textContent !== s) LB.rapidoSub.textContent = s; } } catch (_) {}
    if (ativo) J.setAttribute('aria-label', lider ? 'Jogar a ranqueada com o grupo' + (p.ok < p.tot ? ' (' + p.ok + ' de ' + p.tot + ' prontos)' : ' (todos prontos)')
      : (eu && eu.pronto ? 'Pronto (toque para sair)' : 'Ficar pronto para o líder começar a busca'));
    else try { v79LbSync(); } catch (_) {}
  }
}

/* ---------------------------------------------------------------- 2) PRONTO nos amigos ao lado da tampinha e no painel do grupo */
function v95GrupoPosPinta(){
  const E = V93G.el, g = V93G.g; if (!E) return;
  v95GrupoJogarPinta();
  if (!g) return;
  const outros = g.membros.filter(m => m.id !== NET49.id), itens = [...E.lista.children].filter(x => !x.classList.contains('vaga'));
  itens.forEach((it, i) => {
    const m = outros[i], on = v95ProntoDe(m); if (!m) return;
    it.classList.toggle('st-pronto', on);
    const s = it.querySelector('.v93-gm-st'), st = on ? V93G_ST.pronto : (V93G_ST[m.st] || V93G_ST.offline);
    if (s && s.lastChild && s.lastChild.nodeType === 3 && s.lastChild.textContent !== st[0]) s.lastChild.textContent = st[0];
  });
  if (!E.pn.hidden){
    const lis = [...E.pn.querySelectorAll('.v93-gp-lista:not(.amigos) > li.v93-gp-l:not(.conv)')];
    lis.forEach((li, i) => {
      const m = g.membros[i], on = v95ProntoDe(m); if (!m) return;
      li.classList.toggle('st-pronto', on);
      const s = li.querySelector('.v93-gp-tx small'), st = on ? V93G_ST.pronto : (V93G_ST[m.st] || V93G_ST.offline);
      if (s && s.lastChild && s.lastChild.nodeType === 3 && s.lastChild.textContent !== st[0]) s.lastChild.textContent = st[0];
    });
    const md = E.pn.querySelector('.v93-gp-modo');
    if (md && md.lastChild && md.lastChild.nodeType === 3){
      const lider = v93GrupoLider(), nm = lider ? (CONTA.rq.n | 0 || 2) : (g.modo | 0 || 2), n = g.membros.length;
      let t = md.lastChild.textContent;
      if (!(lider && n > nm)){
        const p = v95GrupoProntos(), eu = v95GrupoEu();
        t = lider ? (p.ok >= p.tot ? ' · todos prontos: toque em JOGAR' : ' · ' + p.ok + ' de ' + p.tot + ' prontos (cada um toca em PRONTO)')
          : (eu && eu.pronto ? ' · você está PRONTO: o líder começa a busca' : ' · toque em PRONTO (no JOGAR) e o líder começa');
      }
      if (md.lastChild.textContent !== t) md.lastChild.textContent = t;
    }
  }
}
const v93GrupoPintaAntes95 = v93GrupoPinta;
v93GrupoPinta = function(){ const r = v93GrupoPintaAntes95.apply(this, arguments); try { v95GrupoPosPinta(); v95DenovoPinta(); } catch (e) { console.error('v95 grupo', e); } return r; };
const v93GrupoPainelChaveAntes95 = v93GrupoPainelChave;
v93GrupoPainelChave = function(){ const g = V93G.g; return v93GrupoPainelChaveAntes95.apply(this, arguments) + (g ? '|' + g.membros.map(m => m.pronto ? 1 : 0).join('') : ''); };

/* ---------------------------------------------------------------- 3) o JOGAR DE NOVO do grupo (no fim da ranqueada) */
function v95FimDoGrupo(){ const r = NET49.room; return !!(r && r.ranked && NET49.playing && v95GrupoAtivo()); }
window.addEventListener('click', e => {                          // (antes do JOGAR DE NOVO de sempre — a v79 escuta no document)
  const de = e.target.closest && e.target.closest('#fim-denovo'), lo = e.target.closest && e.target.closest('#fim-lobby');
  if ((!de && !lo) || !v95FimDoGrupo()) return;
  if (lo){                                                        // o LOBBY: com a votação aberta, todo mundo para o lobby
    if (!(V93G.g && V93G.g.denovo)) return;                       // (sem votação: sai da sala, como sempre)
    e.preventDefault(); e.stopPropagation(); try { som.clique(); } catch (_) {}
    v93GrupoManda('grupo_denovo', {sim:false});
    return;
  }
  e.preventDefault(); e.stopPropagation();
  if (V95G.votei && V95G.sala === NET49.room.code) return;
  try { som.clique(); } catch (_) {}
  if (v93GrupoManda('grupo_denovo', {sim:true})){ V95G.votei = true; V95G.sala = NET49.room.code; v95DenovoPinta(); }
}, true);
function v95DenovoEl(){
  let el = document.getElementById('v95-denovo'); if (el) return el;
  const f = fimEl('fim'); if (!f) return null;
  el = nodo('div', 'v95-denovo'); el.id = 'v95-denovo'; el.hidden = true; el.setAttribute('role', 'status'); el.setAttribute('aria-live', 'polite');
  const cab = nodo('div', 'v95-dn-cab'); cab.append(nodo('b', 'v95-dn-tit', 'JOGAR DE NOVO COM O GRUPO'), nodo('span', 'v95-dn-t ct', '10'));
  const barra = nodo('span', 'v95-dn-barra'); barra.appendChild(nodo('i'));
  el.append(cab, nodo('ul', 'v95-dn-l'), barra, nodo('small', 'v95-dn-nota', ''));
  const ac = f.querySelector('.fim-acoes');
  if (ac && ac.parentNode) ac.parentNode.insertBefore(el, ac); else (f.querySelector('.fim-caixa') || f).appendChild(el);
  return el;
}
function v95DenovoPinta(){
  const bt = fimEl('fim-denovo'), vale = v95FimDoGrupo() && fimAberto();
  const el = vale || document.getElementById('v95-denovo') ? v95DenovoEl() : null;
  if (!vale){ if (el) el.hidden = true; clearInterval(V95G.relT); V95G.relT = 0; return; }
  const r = NET49.room, g = V93G.g, D = g.denovo;
  if (V95G.sala !== r.code){ V95G.sala = r.code; V95G.votei = false; }
  const votos = new Set(D ? D.votos : []), votei = V95G.votei || votos.has(NET49.id), tot = g.membros.length;
  if (bt){                                                      // (o texto curto: quem já tocou e o relógio ficam no quadro em cima)
    const t = votei ? 'ESPERANDO…' : 'JOGAR DE NOVO';
    if (bt.textContent !== t) bt.textContent = t;
    bt.classList.toggle('v95-votei', votei); bt.setAttribute('aria-disabled', String(votei));
    bt.setAttribute('aria-label', votei ? 'Esperando o grupo (' + Math.max(1, votos.size) + ' de ' + tot + ' tocaram)' : 'Jogar de novo com o grupo' + (D ? ' (' + votos.size + ' de ' + tot + ' já tocaram)' : ''));
  }
  if (!el) return;
  if (!D && !votei){ el.hidden = true; clearInterval(V95G.relT); V95G.relT = 0; return; }
  el.hidden = false;
  // quem já tocou (✓) e quem falta (…): refeito só quando muda
  const k = g.membros.map(m => m.id + (votos.has(m.id) || (m.id === NET49.id && votei) ? '+' : '-') + m.nome).join(',');
  if (k !== V95G.chave){
    V95G.chave = k;
    const ul = el.querySelector('.v95-dn-l'); ul.textContent = '';
    for (const m of g.membros){
      const sim = votos.has(m.id) || (m.id === NET49.id && votei);
      const li = nodo('li', 'v95-dn-m' + (sim ? ' sim' : '') + (m.id === NET49.id ? ' eu' : ''));
      const c = document.createElement('canvas'); c.width = c.height = 56; c.className = 'v95-dn-cap'; c.setAttribute('aria-hidden', 'true');
      try { v93GrupoCap(c, m.skin); } catch (_) {}
      const marca = nodo('i', 'v95-dn-ok', sim ? '✓' : '…'); marca.setAttribute('aria-hidden', 'true');
      li.append(c, marca, nodo('span', 'v95-dn-nome', m.id === NET49.id ? 'VOCÊ' : m.nome));
      li.setAttribute('aria-label', (m.id === NET49.id ? 'Você' : m.nome) + (sim ? ': quer jogar de novo' : ': ainda não tocou'));
      ul.appendChild(li);
    }
    const falta = g.membros.filter(m => !(votos.has(m.id) || (m.id === NET49.id && votei)));
    el.querySelector('.v95-dn-nota').textContent = !falta.length ? 'Todo mundo topou: procurando…'
      : (votei ? 'Esperando ' + v95NomesE(falta.map(m => m.id === NET49.id ? 'você' : m.nome)) + '. Se não tocarem a tempo, todo mundo volta para o lobby.'
        : 'O grupo quer jogar de novo: toque em JOGAR DE NOVO. Senão, todo mundo volta para o lobby.');
  }
  v95DenovoRelogio();
  if (!V95G.relT) V95G.relT = setInterval(v95DenovoRelogio, 200);
}
function v95DenovoRelogio(){
  const el = document.getElementById('v95-denovo'), g = V93G.g, D = g && g.denovo;
  if (!el || el.hidden || !fimAberto()){ clearInterval(V95G.relT); V95G.relT = 0; return; }
  const resta = D ? Math.max(0, D.ate - Date.now()) : V95G_DENOVO_MS, s = String(Math.ceil(resta/1000));
  const t = el.querySelector('.v95-dn-t'); if (t.textContent !== s) t.textContent = s;
  el.querySelector('.v95-dn-barra i').style.transform = 'scaleX(' + (resta/V95G_DENOVO_MS).toFixed(3) + ')';
  el.classList.toggle('acabando', resta < 3500);
}

/* ---------------------------------------------------------------- 4) o que o servidor manda */
const net49MessageAntes95g = net49Message;
net49Message = function(m){
  try {
    if (m && m.type === 'grupo' && m.g && m.g.denovo) m.g.denovo.ate = Date.now() + (m.g.denovo.resta | 0);
    if (m && m.type === 'grupo_denovo_fim'){
      const votou = V95G.votei; V95G.votei = false; V95G.chave = '';
      if (m.sozinho){                                             // (o servidor não vê grupo: o JOGAR DE NOVO de sempre, procurando sozinho)
        const r = NET49.room;
        if (votou && r && r.ranked && NET49.playing){ V79R.denovo = r.n || CONTA.rq.n; net49Send({type:'leave'}); }
        return;
      }
      if (m.motivo) x49Toast(m.motivo);
      try { if (fimAberto() && !(NET49.playing && NET49.room)){ fechaFim(); if (RQ.on) rqSai(); if (!lobby.aberto) abrirLobby(); } } catch (_) {}
      try { v93GrupoPinta(); } catch (_) {}
      return;
    }
  } catch (e) { console.error('v95 grupo', e); }
  const r = net49MessageAntes95g.apply(this, arguments);
  try {
    // a votação fechou: a busca do grupo começou no servidor — no aparelho do líder também (o de quem não é líder a v93 já abre)
    if (m && m.type === 'fila' && m.grupo && m.on && !V79R.busca) v93GrupoBuscaAbre(m.n | 0 || 2);
    if (m && (m.type === 'result' || m.type === 'left' || m.type === 'start')){ if (m.type !== 'result') V95G.votei = false; setTimeout(() => { try { v95DenovoPinta(); } catch (_) {} }, 0); }
  } catch (e) { console.error('v95 grupo', e); }
  return r;
};
window.RachaGrupo95 = {prontos:v95GrupoProntos, ativo:v95GrupoAtivo, votei:() => V95G.votei, pinta:() => { v93GrupoPinta(); v95DenovoPinta(); }};
