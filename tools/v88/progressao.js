/* ======================================================================================================================
   RACHA v88 · MISSÕES, EVENTOS e o PASSE RACHA (tudo contado pelo servidor: o progresso só anda com partida válida e com
   os gols do treino que contam; COLETAR é conferido e entregue uma vez, na conta).
   · MISSÕES: diárias, semanais, da temporada e as especiais dos eventos — a barra, o prêmio e o COLETAR (ou o IR, que leva
     para onde se cumpre);
   · EVENTOS: os ativos (configurados no servidor / RACHA CONTROL): o nome, o desenho, a duração, as regras e as
     recompensas — o login diário, os desafios, a copa dos amigos (o torneio que já existia), a temporada e os temporários;
   · PASSE RACHA (o botão que estava "em breve"): a temporada, os 30 níveis, o XP, a trilha GRÁTIS e a PREMIUM (com gemas),
     o que está bloqueado, o que dá para coletar e o que já foi coletado.
   ====================================================================================================================== */
const V88P = {missoes:null, mAba:'diarias', eventos:null, eSel:'', passe:null, carregando:{}, erro:{}};

function v88PremioEl(p){                                   // o prêmio de uma missão ({moedas, gemas, xp_passe, item})
  const d = nodo('span', 'v88-premio');
  if (!p) return d;
  if (p.moedas) d.append(nodo('i', 'ic-moeda'), nodo('b', null, fmtNum(p.moedas)));
  if (p.gemas) d.append(nodo('i', 'ic-gema'), nodo('b', null, fmtNum(p.gemas)));
  if (p.xp_passe){ const i = v88IcEl('passe', 'v88-premio-ic'); d.append(i, nodo('b', null, fmtNum(p.xp_passe) + ' XP')); }
  if (p.item){ const it = v88Item(p.item); d.append(v88MiniItem(p.item, 34), nodo('b', null, it ? it.nome : p.item)); }
  return d;
}
function v88Barra(v, max){ const b = nodo('span', 'v88-barra'), i = nodo('i'); i.style.width = (100*Math.max(0, Math.min(1, v/Math.max(1, max)))).toFixed(1) + '%'; b.appendChild(i); return b; }
function v88Carga(chave, proc, input, tela){
  V88P.carregando[chave] = true; V88P.erro[chave] = ''; v88Repinta(tela);
  return v88Q(proc, input).then(r => { V88P[chave] = r; return r; }).catch(e => { V88P.erro[chave] = e.message; }).then(r => { V88P.carregando[chave] = false; v88Repinta(tela); return r; });
}
function v88Estados(c, chave, tela, refaz){                // (carregando / erro / sem conta) → true se já pintou o estado
  if (!v88Logado()){ v88PrecisaConta(c, tela === 'v88passe' ? 'O seu passe' : tela === 'v88eventos' ? 'Os eventos e as recompensas' : 'As suas missões'); return true; }
  if (V88P.carregando[chave] && !V88P[chave]){ v88Carregando(c); return true; }
  if (V88P.erro[chave] && !V88P[chave]){ v88Erro(c, V88P.erro[chave], refaz); return true; }
  return false;
}

/* ---------------------------------------------------------------- MISSÕES */
const V88_GRUPOS = [['diarias', 'DIÁRIAS'], ['semanais', 'SEMANAIS'], ['temporada', 'DA TEMPORADA'], ['especiais', 'ESPECIAIS']];
const V88_IR = {partidas:'jogar', vitorias:'jogar', gols:'jogar', assistencias:'jogar', ranqueadas:'jogar', amigo:'amigos', treino_gols:'treino'};
v88Tela('v88missoes', {titulo:'MISSÕES', ic:'missoes', abre:() => { if (v88Logado()) v88MissoesCarrega(); }, render:T => v88MissoesRender(T)});
function v88MissoesCarrega(){ return v88Carga('missoes', 'missoes.listar', undefined, 'v88missoes').then(r => { if (Array.isArray(r)){ v88MissoesResumo(r); v88Numeros(); } }); }
function v88MissoesRender(T){
  const c = T.corpo; c.textContent = '';
  if (v88Estados(c, 'missoes', 'v88missoes', v88MissoesCarrega)) return;
  const G = V88P.missoes || [];
  const n = id => G.filter(g => g.grupo === id).reduce((s, g) => s + g.missoes.filter(m => m.pronta).length, 0);
  v88Abas(c, V88_GRUPOS.filter(([id]) => id !== 'temporada' || G.some(g => g.grupo === 'temporada')).map(([id, rot]) => ({id, rot, n:n(id)})), V88P.mAba, a => { V88P.mAba = a; v88Repinta('v88missoes'); });
  const box = nodo('div', 'v88-mis-corpo'); c.appendChild(box);
  const grupos = G.filter(g => g.grupo === V88P.mAba);
  if (!grupos.length) return v88Vazio(box, 'missoes', 'Nenhuma missão especial agora', 'As especiais chegam com os eventos (veja EVENTOS).');
  for (const g of grupos){
    const cab = nodo('div', 'v88-mis-cab');
    cab.append(nodo('b', null, g.evento ? g.evento.nome : (V88_GRUPOS.find(x => x[0] === g.grupo) || ['', ''])[1]), nodo('small', null, 'Renova em ' + v88Falta(g.fim)));
    box.appendChild(cab);
    const ul = nodo('ul', 'v88-lista v88-mis');
    for (const m of g.missoes){
      const li = nodo('li', 'v88-mis-i' + (m.coletada ? ' feita' : m.pronta ? ' pronta' : ''));
      const tx = nodo('div', 'v88-mis-tx'); tx.append(nodo('b', null, m.nome), v88Barra(m.progresso, m.meta), nodo('small', null, Math.min(m.progresso, m.meta) + '/' + m.meta));
      const ac = nodo('div', 'v88-mis-ac');
      if (m.coletada) ac.appendChild(nodo('span', 'v88-tag verde', 'COLETADO'));
      else if (m.pronta) ac.appendChild(v88Bt('lb-btn verde', 'COLETAR', e => v88MissaoColeta(m, g, e.currentTarget)));
      else ac.appendChild(v88Bt('lb-btn v88-bt-p', 'IR', () => v88MissaoIr(m.tipo)));
      li.append(v88IcEl(m.tipo === 'amigo' ? 'amigos' : m.tipo === 'treino_gols' ? 'treino' : m.tipo === 'ranqueadas' ? 'trofeu' : 'bolas', 'v88-mis-ic'), tx, v88PremioEl(m.premio), ac);
      ul.appendChild(li);
    }
    box.appendChild(ul);
  }
  box.appendChild(nodo('p', 'v88-nota', 'Contam as partidas válidas (contra os bots ou online, até o fim) e os gols do treino livre, conferidos pelo servidor. Jogar com um amigo vale quando os dois estão na mesma partida online.'));
}
function v88MissaoColeta(m, g, bt){
  if (bt) bt.disabled = true;
  v88M('missoes.coletar', {missao:m.id, periodo:g.periodo}).then(r => { m.coletada = true; m.pronta = false; v88Entregou(r, 'Missão'); v88MissoesResumo(V88P.missoes || []); v88Numeros(); v88Repinta('v88missoes'); })
    .catch(e => { if (bt) bt.disabled = false; som.erro(); v88Aviso(e.message); if (/já foi coletado/.test(e.message)){ m.coletada = true; v88Repinta('v88missoes'); } });
}
function v88MissaoIr(tipo){
  const ir = V88_IR[tipo] || 'jogar';
  try { fechaTela(); } catch (_) {}
  if (ir === 'amigos') return v88AbreAmigos();
  if (ir === 'treino') return abreTela('treino');
  try { abreJogar(); } catch (_) {}
}

/* ---------------------------------------------------------------- EVENTOS */
const V88_EV_TIPO = {login:'LOGIN DIÁRIO', desafio:'DESAFIO', torneio:'TORNEIO', temporada:'TEMPORADA', temporario:'POR TEMPO LIMITADO'};
const V88_EV_IC = {login:'login', desafio:'desafio', torneio:'torneio', temporada:'temporada', temporario:'presente'};
const V88_EV_CENA = {favela:'banner_laje_noturna', quadra:'banner_arquibancada', copa:'banner_carnaval', passe:'banner_cristo', loja:'banner_grafite'};
v88Tela('v88eventos', {titulo:'EVENTOS', ic:'eventos', abre:() => { if (v88Logado()) v88Carga('eventos', 'eventos.listar', undefined, 'v88eventos'); }, render:T => v88EventosRender(T)});
function v88EventosRender(T){
  const c = T.corpo; c.textContent = '';
  if (v88Estados(c, 'eventos', 'v88eventos', () => v88Carga('eventos', 'eventos.listar', undefined, 'v88eventos'))){
    if (!v88Logado()){                                      // sem conta, a Copa dos Amigos (que é da turma, não da conta) continua aqui
      const b = v88Bt('lb-btn amarelo', 'COPA DOS AMIGOS', () => abreTela('copa'));
      c.appendChild(nodo('p', 'v88-nota', 'A Copa dos Amigos (o mata-mata 1v1 nas salas) funciona sem conta:')); c.appendChild(b);
    }
    return;
  }
  const L = V88P.eventos || [];
  if (!L.length) return v88Vazio(c, 'eventos', 'Nenhum evento agora', 'Quando a equipe do RACHA abrir um evento, ele aparece aqui.');
  if (!L.some(e => e.slug === V88P.eSel)) V88P.eSel = (L.find(v88EventoPronto) || L[0]).slug;
  const grade = nodo('div', 'v88-ev-grade');
  v88Coluna(grade, L.map(e => ({id:e.slug, rot:e.nome, ic:V88_EV_IC[e.tipo] || 'eventos', n:v88EventoPronto(e) ? 1 : 0})), V88P.eSel, s => { V88P.eSel = s; v88Repinta('v88eventos'); });
  const ev = L.find(e => e.slug === V88P.eSel), d = nodo('div', 'v88-ev');
  const capa = nodo('div', 'v88-ev-capa'), cv = document.createElement('canvas'); cv.width = 960; cv.height = 300; cv.setAttribute('aria-hidden', 'true');
  try { v88DesenhaBanner(cv.getContext('2d'), 960, 300, v88Item(V88_EV_CENA[ev.imagem] || 'banner_laje_noturna'), 0); } catch (_) {}
  capa.append(cv, v88IcEl(V88_EV_IC[ev.tipo] || 'eventos', 'v88-ev-capa-ic'), nodo('span', 'v88-tag amarelo', V88_EV_TIPO[ev.tipo] || 'EVENTO'), nodo('h3', null, ev.nome), nodo('small', 'v88-ev-tempo', 'Termina em ' + v88Falta(ev.fim)));
  d.appendChild(capa);
  if (ev.descricao) d.appendChild(nodo('p', 'v88-ev-desc', ev.descricao));
  const P = ev.progresso || {}, cfg = ev.config || {};
  if (ev.tipo === 'login' && Array.isArray(cfg.dias)){
    d.appendChild(nodo('b', 'v88-sub', 'OS 7 DIAS'));
    const g = nodo('div', 'v88-ev-dias'), recebidos = (P.dias | 0) % cfg.dias.length, volta = Math.floor((P.dias | 0)/cfg.dias.length);
    cfg.dias.forEach((p, i) => { const b = nodo('div', 'v88-ev-dia' + (i < recebidos || (volta && !recebidos) ? ' ok' : i === recebidos ? ' hoje' : '')); b.append(nodo('small', null, 'DIA ' + (i + 1)), v88PremioEl(p)); g.appendChild(b); });
    d.appendChild(g);
    d.appendChild(nodo('p', 'v88-nota', 'O prêmio de cada dia chega no CORREIO quando você entra (' + (P.coletados | 0) + ' de ' + (P.dias | 0) + ' coletados).'));
    d.appendChild(v88Bt('lb-btn verde', 'ABRIR O CORREIO', () => { V88M.aba = 'correio'; abreTela('v88caixa'); }));
  }
  if (Array.isArray(P.missoes) && P.missoes.length){
    d.appendChild(nodo('b', 'v88-sub', 'DESAFIOS'));
    const ul = nodo('ul', 'v88-lista v88-mis');
    for (const m of P.missoes){
      const pronta = m.progresso >= m.meta && !m.coletada, li = nodo('li', 'v88-mis-i' + (m.coletada ? ' feita' : pronta ? ' pronta' : ''));
      const tx = nodo('div', 'v88-mis-tx'); tx.append(nodo('b', null, m.nome), v88Barra(m.progresso, m.meta), nodo('small', null, Math.min(m.progresso, m.meta) + '/' + m.meta));
      const ac = nodo('div', 'v88-mis-ac');
      if (m.coletada) ac.appendChild(nodo('span', 'v88-tag verde', 'COLETADO'));
      else if (pronta) ac.appendChild(v88Bt('lb-btn verde', 'COLETAR', e => v88MissaoColeta(Object.assign(m, {id:m.id}), {periodo:'E:' + ev.slug}, e.currentTarget)));
      else ac.appendChild(v88Bt('lb-btn v88-bt-p', 'IR', () => v88MissaoIr(m.tipo || 'partidas')));
      li.append(v88IcEl('desafio', 'v88-mis-ic'), tx, v88PremioEl(m.premio), ac); ul.appendChild(li);
    }
    d.appendChild(ul);
  }
  if (Array.isArray(cfg.presente) && cfg.presente.length){
    d.appendChild(nodo('b', 'v88-sub', 'PRESENTE DO EVENTO'));
    d.appendChild(v88AnexosEl(cfg.presente));
    if (P.presentePego) d.appendChild(nodo('span', 'v88-tag verde', 'JÁ PEGOU · VEJA NO CORREIO'));
    else d.appendChild(v88Bt('lb-btn verde', 'PEGAR O PRESENTE', e => { e.currentTarget.disabled = true; v88M('eventos.pegarPresente', {slug:ev.slug}).then(() => { P.presentePego = true; v88Aviso('O presente foi para o seu CORREIO: abra e colete.'); v88Resumo(); v88Repinta('v88eventos'); v88LobbyDados(); }).catch(er => { som.erro(); v88Aviso(er.message); v88Repinta('v88eventos'); }); }));
  }
  if (cfg.acao === 'copa') d.appendChild(v88Bt('lb-btn amarelo', 'IR PARA A COPA DOS AMIGOS', () => abreTela('copa')));
  if (cfg.acao === 'passe') d.appendChild(v88Bt('lb-btn amarelo', 'ABRIR O PASSE RACHA', () => abreTela('v88passe')));
  if (cfg.ofertas && Object.keys(cfg.ofertas).length) d.appendChild(v88Bt('lb-btn', 'VER AS OFERTAS NA LOJA', () => { V88S.cat = 'ofertas'; abreTela('loja'); }));
  if (ev.regras){ d.appendChild(nodo('b', 'v88-sub', 'REGRAS')); d.appendChild(nodo('p', 'v88-ev-regras', ev.regras)); }
  d.appendChild(nodo('p', 'v88-nota', 'De ' + new Date(ev.inicio).toLocaleDateString('pt-BR') + ' até ' + new Date(ev.fim).toLocaleDateString('pt-BR') + '.'));
  grade.appendChild(d); c.appendChild(grade);
}

/* ---------------------------------------------------------------- PASSE RACHA */
v88Tela('v88passe', {titulo:'PASSE RACHA', ic:'passe', abre:() => { if (v88Logado()) v88Carga('passe', 'passe.estado', undefined, 'v88passe'); }, render:T => v88PasseRender(T)});
function v88RecEl(rec){                                    // a recompensa de um nível (moedas, gemas ou um item)
  const d = nodo('span', 'v88-rec');
  if (!rec) return d;
  if (rec.tipo === 'item'){ d.appendChild(v88MiniItem(rec.codigo, 84)); const it = v88Item(rec.codigo); d.title = it ? it.nome : rec.codigo; d.appendChild(nodo('small', null, it ? it.nome : rec.codigo)); if (it) d.style.setProperty('--r', v88Raridade(it.raridade).cor); }
  else { d.append(nodo('i', rec.tipo === 'gemas' ? 'ic-gema' : 'ic-moeda'), nodo('b', null, 'x' + fmtNum(rec.qtd))); }
  return d;
}
function v88PasseRender(T){
  const c = T.corpo; c.textContent = '';
  if (v88Estados(c, 'passe', 'v88passe', () => v88Carga('passe', 'passe.estado', undefined, 'v88passe'))) return;
  const P = V88P.passe, S = P.temporada;
  V88.passeLobby = {nivel:P.nivel, atual:P.atual, prox:P.prox, max:P.max, premium:P.premium}; V88.prontas = Object.assign(V88.prontas || {}, {passe:v88PasseProntas(P)});
  const topo = nodo('div', 'v88-pas-topo');
  const info = nodo('div', 'v88-pas-info');
  info.append(nodo('span', 'v88-tag amarelo', S.ativa ? 'TEMPORADA ATIVA' : 'FORA DA TEMPORADA'), nodo('h3', 'v88-pas-nome', S.nome),
    nodo('small', null, new Date(S.inicio).toLocaleDateString('pt-BR') + ' – ' + new Date(S.fim).toLocaleDateString('pt-BR') + (S.ativa ? ' · termina em ' + v88Falta(S.fim) : '')));
  const nv = nodo('div', 'v88-pas-nv'); nv.append(nodo('b', null, 'NV. ' + P.nivel), v88Barra(P.max ? 1 : P.atual, P.max ? 1 : P.prox), nodo('small', null, P.max ? 'NÍVEL MÁXIMO!' : fmtNum(P.atual) + ' / ' + fmtNum(P.prox) + ' XP'));
  info.appendChild(nv);
  info.appendChild(nodo('p', 'v88-nota', 'XP do passe: partida válida +' + ((CAT88.temporada.xp || {}).partida || 60) + ' (vitória +' + ((CAT88.temporada.xp || {}).vitoria || 40) + '), gols do treino e as missões. Contado pelo servidor.'));
  const pr = v88PasseProntas(P);
  if (pr) info.appendChild(v88Bt('lb-btn verde', 'COLETAR TUDO (' + pr + ')', e => { e.currentTarget.disabled = true; v88M('passe.coletarTudo').then(r => { v88Entregou(r, (r.recompensas || 0) + ' recompensas'); v88Carga('passe', 'passe.estado', undefined, 'v88passe'); v88LobbyDados(); }).catch(er => { som.erro(); v88Aviso(er.message); v88Repinta('v88passe'); }); }));
  const prem = nodo('div', 'v88-pas-prem' + (P.premium ? ' ativo' : ''));
  prem.append(v88IcEl('coroa', 'v88-pas-prem-ic'), nodo('b', null, P.premium ? 'PREMIUM ATIVO' : 'PASSE PREMIUM'));
  const ul = nodo('ul', 'v88-pas-prem-l');
  for (const t of ['Tampinhas exclusivas', 'Bolas e efeitos de gol', 'Comemorações e banners', 'Avatares e mais recompensas']) ul.appendChild(nodo('li', null, t));
  prem.appendChild(ul);
  if (!P.premium){
    const b = v88Bt('lb-btn amarelo v88-pas-comprar', null, () => {
      if (CONTA.gemas < S.premiumGemas){ som.erro(); return v88Aviso('Faltam ' + (S.premiumGemas - CONTA.gemas) + ' gemas. Ganhe nas missões, no passe grátis e nos eventos (ou troque na LOJA).'); }
      v88Confirma('PASSE RACHA', 'DESBLOQUEAR O PREMIUM?', 'Custa ' + S.premiumGemas + ' gemas (da sua carteira) e vale até o fim desta temporada. As recompensas premium dos níveis que você já alcançou ficam liberadas na hora.', 'DESBLOQUEAR', () => {
        v88M('passe.comprarPremium').then(r => { if (r && r.carteira) v88PoeCarteira(r.carteira); som.compra(); v88Aviso('Passe premium liberado!'); v88Carga('passe', 'passe.estado', undefined, 'v88passe'); v88LobbyDados(); }).catch(er => { som.erro(); v88Aviso(er.message); });
      });
    });
    b.append(nodo('span', null, 'DESBLOQUEAR'), v88Preco(0, S.premiumGemas));
    if (!S.ativa) b.disabled = true;
    prem.appendChild(b);
  }
  topo.append(info, prem); c.appendChild(topo);
  // a trilha (role para o lado): cada nível com o grátis em cima e o premium embaixo
  const tri = nodo('div', 'v88-pas-trilha'), lin = nodo('div', 'v88-pas-linhas');
  const rotG = nodo('div', 'v88-pas-rot'); rotG.append(v88IcEl('passe'), nodo('b', null, 'GRÁTIS'));
  const rotP = nodo('div', 'v88-pas-rot prem'); rotP.append(v88IcEl('coroa'), nodo('b', null, 'PREMIUM'));
  const cols = nodo('div', 'v88-pas-cols');
  const col = P.coletadas || {g:[], p:[]};
  for (const l of P.trilha){
    const n = l.n, chegou = P.nivel >= n, cl = nodo('div', 'v88-pas-col' + (chegou ? ' chegou' : '') + (n === P.nivel ? ' atual' : ''));
    cl.appendChild(nodo('b', 'v88-pas-n', 'Nv.' + n));
    for (const tr of ['g', 'p']){
      const pego = (col[tr] || []).indexOf(n) >= 0, travado = tr === 'p' && !P.premium, pronto = chegou && !pego && !travado;
      const cel = novoBotao('v88-pas-cel ' + (tr === 'p' ? 'prem' : 'gratis') + (pego ? ' pego' : pronto ? ' pronto' : chegou && !travado ? '' : ' bloq'), 'Nível ' + n + ' ' + (tr === 'p' ? 'premium' : 'grátis'));
      cel.appendChild(v88RecEl(l[tr]));
      if (pego) cel.appendChild(nodo('i', 'v88-pas-ok', '✓')); else if (!chegou || travado) cel.appendChild(v88IcEl('cadeado', 'v88-pas-cad'));
      if (pronto) cel.appendChild(nodo('em', 'v88-pas-col-bt', 'COLETAR'));
      cel.addEventListener('click', () => {
        som.clique();
        if (pronto){ cel.disabled = true; v88M('passe.coletar', {nivel:n, trilha:tr}).then(r => { (col[tr] || (col[tr] = [])).push(n); v88Entregou(r, 'Passe nível ' + n); v88Repinta('v88passe'); v88Numeros(); }).catch(er => { cel.disabled = false; som.erro(); v88Aviso(er.message); }); return; }
        const rec = l[tr]; if (rec && rec.tipo === 'item') v88ItemAbre(rec.codigo);
        else v88Aviso(travado ? 'Recompensa da trilha PREMIUM.' : !chegou ? 'Chegue ao nível ' + n + ' do passe para liberar.' : 'Já coletado.');
      });
      cl.appendChild(cel);
    }
    cols.appendChild(cl);
  }
  lin.append(rotG, rotP); tri.append(lin, cols); c.appendChild(tri);
  setTimeout(() => { try { const at = cols.querySelector('.atual') || cols.querySelector('.pronto'); if (at) cols.scrollLeft = Math.max(0, at.offsetLeft - cols.clientWidth/3); } catch (_) {} }, 30);
}
