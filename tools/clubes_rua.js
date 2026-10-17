/* =====================================================================
   RACHA rua · v69 — OS CLUBES (COMUNIDADE › CLUBE e o botão CLUBE do lobby) — entra depois do editor_rua.js
   Lista (CLUBES · CONVITES, busca, MEU PAÍS), CRIAR CLUBE (nome, descrição, pontos mínimos, país, tipo, escudo — grátis),
   a página do clube (troféus, ranking, tipo, troféu necessário, SAIR, MAIS CLUBES, convidar, os membros) e o escudo
   no editor da tampinha (modo escudo).
   v70: UM SISTEMA DE CLUBE SÓ (a mesma tela), em um destes lugares, nesta ordem:
     · NA SUA CONTA do RACHA (o jogo aberto pelo site, com login): com a galera da plataforma (window.parent.RACHA_JOGO.clubes)
     · NA TURMA: no servidor da turma (as salas online; server/clubes.js tem as mesmas regras da plataforma) — membros de
       verdade, busca, convites pelo ID da turma, entrar/sair, dono, troféus conferidos pelo servidor
     · NESTE APARELHO: o clube PESSOAL (só você). Grátis, sem ranking e sem tipo/pontos mínimos (não tem mais ninguém).
   O antigo CLUBE DA TURMA (clubCreate / clubJoin) saiu: o clube da turma agora é este mesmo.
   Troféus = vitórias que o lugar do clube conferiu (a conta: as partidas validadas pela plataforma · a turma: as salas
   online conferidas pelo servidor · o aparelho: as suas vitórias aqui); os do clube = a soma dos membros. Até 30 por clube.
   ===================================================================== */
const CLB_MAX = 30;
const CLB_TROFEUS = [0, 5, 10, 25, 50, 100, 200, 300, 500, 1000];
const CLB_PAISES = [['BR', 'Brasil'], ['PT', 'Portugal'], ['AO', 'Angola'], ['MZ', 'Moçambique'], ['CV', 'Cabo Verde'], ['AR', 'Argentina'], ['UY', 'Uruguai'],
  ['PY', 'Paraguai'], ['CL', 'Chile'], ['BO', 'Bolívia'], ['PE', 'Peru'], ['CO', 'Colômbia'], ['VE', 'Venezuela'], ['EC', 'Equador'], ['MX', 'México'],
  ['US', 'Estados Unidos'], ['CA', 'Canadá'], ['ES', 'Espanha'], ['FR', 'França'], ['IT', 'Itália'], ['DE', 'Alemanha'], ['GB', 'Reino Unido'], ['JP', 'Japão'], ['NG', 'Nigéria']];
const CLB_TIPOS = [['publico', 'Público', 'Quem tiver os troféus entra direto'], ['convite', 'Só convite', 'Só entra quem for convidado']];
const CLB_SVG = {
  mega:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 10v4a1.5 1.5 0 0 0 1.5 1.5H6l1.4 4.6a1 1 0 0 0 1 .7h1.5a1 1 0 0 0 .9-1.3L9.6 15.5H10l8 4.2V4.3L10 8.5H4.5A1.5 1.5 0 0 0 3 10z" fill="currentColor"/><path d="M20.5 9.2a3.4 3.4 0 0 1 0 5.6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  trofeu:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3.5h10v5a5 5 0 0 1-10 0z" fill="currentColor"/><path d="M7 5H3.5v1.5A3.5 3.5 0 0 0 7 10M17 5h3.5v1.5A3.5 3.5 0 0 1 17 10" fill="none" stroke="currentColor" stroke-width="2"/><rect x="10.8" y="13" width="2.4" height="4" fill="currentColor"/><rect x="7.5" y="17" width="9" height="3.2" rx="1" fill="currentColor"/></svg>',
  gente:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="8.5" cy="8" r="3.6" fill="currentColor"/><path d="M1.8 20c0-4.4 3-6.9 6.7-6.9s6.7 2.5 6.7 6.9z" fill="currentColor"/><circle cx="16.6" cy="9" r="3" fill="currentColor"/><path d="M15.8 13.4c3.6-.3 6.4 1.9 6.4 6.6h-5.3" fill="currentColor"/></svg>',
  podio:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2.5" y="12.5" width="6" height="8.5" rx="1" fill="currentColor"/><rect x="9" y="8.5" width="6" height="12.5" rx="1" fill="currentColor"/><rect x="15.5" y="15" width="6" height="6" rx="1" fill="currentColor"/></svg>',
  lupa:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" stroke-width="2.8"/><path d="M15.5 15.5l5 5" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/></svg>',
  gira:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/><path d="M19.8 3.6v4.6h-4.6" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  lapis:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 16.5V20h3.5L18.3 9.2l-3.5-3.5zM20.7 6.8a1 1 0 0 0 0-1.4l-2.1-2.1a1 1 0 0 0-1.4 0l-1.6 1.6 3.5 3.5z" fill="currentColor"/></svg>',
  mais:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v16M4 12h16" stroke="currentColor" stroke-width="3.6" stroke-linecap="round"/></svg>',
  seta:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  cadeado:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10.5" width="14" height="10" rx="2.5" fill="currentColor"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" fill="none" stroke="currentColor" stroke-width="2.6"/></svg>',
  coroa:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 18h18l1-11-6 4.5L12 4l-4 7.5L2 7z" fill="currentColor"/></svg>'
};
const CLB = {vista:'lista', aba:'clubes', busca:'', soPais:false, lista:null, carregando:0, erro:'', clubeId:null, clube:null, meu:undefined, convites:[],
  modal:null, form:null, pedidoT:0, tok:0, ult:{}, voltaClube:false, voltaForm:false, trofeusTurma:0};
const clbFmt = n => fmtNum(Math.max(0, n | 0));
const clbPais = c => CLB_PAISES.find(p => p[0] === c) || [c || 'BR', c || 'BR'];
const clbLimpa = (s, n) => Array.from(semLixo(String(s || '')).replace(/\s+/g, ' ')).slice(0, n).join('').trim();
const clbEscudoD = cod => (tpEhCodigo(cod) && cod[0] === 'E' && tpLe(cod)) || TP_ESCUDO_D();
const CLB_MINI = new Map();
function clbMini(D, px){                                 // o desenho pequeno, feito uma vez e copiado (a tela refaz a lista sem redesenhar cada escudo)
  const k = tpCodigo(D) + '|' + px; let c = CLB_MINI.get(k);
  if (!c){ if (CLB_MINI.size > 160) CLB_MINI.clear(); c = tpMiniatura(D, px); CLB_MINI.set(k, c); }
  const n = document.createElement('canvas'); n.width = c.width; n.height = c.height; n.setAttribute('aria-hidden', 'true'); n.getContext('2d').drawImage(c, 0, 0); return n;
}
function clbEscudo(cod, px){ return clbMini(clbEscudoD(cod), px); }
function clbTampa(cod, px){ return clbMini((tpEhCodigo(cod) && cod[0] === 'T' && tpLe(cod)) || TP_PADRAO_D(), px); }

/* ---------------------------------------------------------------- 1) onde o clube mora: na conta (plataforma) ou neste aparelho */
const CLB_CHAVE = 'racha-clubes-v1';
const CLB_LOCAL = {clubes:[], meu:null};
try {
  const o = JSON.parse(localStorage.getItem(CLB_CHAVE) || 'null');
  if (o && Array.isArray(o.clubes)){
    CLB_LOCAL.clubes = o.clubes.filter(c => c && typeof c.id === 'string' && typeof c.nome === 'string').slice(0, 5).map(c => ({id:c.id, nome:clbLimpa(c.nome, 24), descricao:clbLimpa(c.descricao, 60),
      pais:/^[A-Z]{2}$/.test(c.pais) ? c.pais : 'BR', tipo:c.tipo === 'convite' ? 'convite' : 'publico', trofeuMinimo:CLB_TROFEUS.includes(c.trofeuMinimo) ? c.trofeuMinimo : 0,
      escudo:tpEhCodigo(c.escudo) && c.escudo[0] === 'E' ? c.escudo : tpCodigo(TP_ESCUDO_D()), criadoEm:+c.criadoEm || Date.now()}));
    CLB_LOCAL.meu = CLB_LOCAL.clubes.some(c => c.id === o.meu) ? o.meu : null;
  }
} catch (_) {}
const clbLocalSalva = () => { try { localStorage.setItem(CLB_CHAVE, JSON.stringify(CLB_LOCAL)); } catch (_) {} };
const clbMeusTrofeus = () => perfil.st.vitorias | 0;
const CLB_API_LOCAL = {                                   // NESTE APARELHO: o clube PESSOAL (só você; grátis; sem ranking: não é competição entre clubes)
  tipo:'local',
  eu:() => ({id:'eu', nome:perfil.nome, trofeus:clbMeusTrofeus(), pais:slPais()}),
  resumo(c){ const sou = CLB_LOCAL.meu === c.id; return {...c, tipo:'pessoal', trofeuMinimo:0, membros:sou ? 1 : 0, trofeus:sou ? clbMeusTrofeus() : 0, ranking:null, donoNome:sou ? perfil.nome : ''}; },
  async listar(busca){ const b = String(busca || '').toLowerCase(); return CLB_LOCAL.clubes.filter(c => !b || c.nome.toLowerCase().includes(b)).map(c => this.resumo(c)); },
  async meu(){ const c = CLB_LOCAL.clubes.find(x => x.id === CLB_LOCAL.meu); return c ? this.resumo(c) : null; },
  async ver(id){
    const c = CLB_LOCAL.clubes.find(x => x.id === id); if (!c) throw new Error('Clube não encontrado.');
    const sou = CLB_LOCAL.meu === id;
    return {...this.resumo(c), souMembro:sou, souDono:sou, membros:sou ? 1 : 0, eu:this.eu(),
      lista:sou ? [{id:'eu', nome:perfil.nome, pais:slPais(), papel:'dono', trofeus:clbMeusTrofeus(), tampa:tpMinha(), eu:true}] : []};   // (o nome e a tampinha de agora)
  },
  async criar(f){
    if (CLB_LOCAL.meu) throw new Error('Saia do seu clube antes de criar outro.');
    const c = {id:'L' + Date.now().toString(36), nome:f.nome, descricao:f.descricao, pais:f.pais, tipo:f.tipo, trofeuMinimo:f.trofeuMinimo, escudo:f.escudo, criadoEm:Date.now()};
    CLB_LOCAL.clubes = [c]; CLB_LOCAL.meu = c.id; clbLocalSalva(); return {id:c.id};
  },
  async editar(id, f){ const c = CLB_LOCAL.clubes.find(x => x.id === id); if (!c || CLB_LOCAL.meu !== id) throw new Error('Só o dono edita o clube.'); Object.assign(c, f); clbLocalSalva(); return {ok:true}; },
  async entrar(){ throw new Error('Neste aparelho não tem mais clubes para entrar.'); },
  async sair(){ CLB_LOCAL.clubes = CLB_LOCAL.clubes.filter(c => c.id !== CLB_LOCAL.meu); CLB_LOCAL.meu = null; clbLocalSalva(); return {ok:true, fechou:true}; },
  async convidar(){ throw new Error('Convites só na sua conta do RACHA: abra o jogo pelo site e entre na conta.'); },
  async convites(){ return []; },
  async responder(){ throw new Error('Sem convites neste aparelho.'); },
  async expulsar(){ throw new Error('Neste aparelho o clube só tem você.'); },
  async passarDono(){ throw new Error('Neste aparelho o clube só tem você.'); }
};
function clbPlataformaApi(){                              // NA SUA CONTA: as chamadas vão para a página-mãe (a plataforma do RACHA, com login)
  const pl = tpePlataforma(); if (!pl || !pl.clubes || typeof pl.conta !== 'function') return null;
  let conta = null; try { conta = pl.conta(); } catch (_) {}
  if (!conta) return null;
  const c = pl.clubes, chama = (fn, ...a) => Promise.resolve().then(() => fn(...a)).catch(e => { throw new Error((e && e.message) || 'Não deu certo. Tente de novo.'); });
  return {
    tipo:'plataforma',
    eu:() => ({id:conta.idPublico, nome:conta.nome || perfil.nome, trofeus:conta.trofeus | 0, pais:slPais()}),
    listar:busca => chama(c.listar, busca || ''), meu:() => chama(c.meu), ver:id => chama(c.ver, id),
    criar:f => chama(c.criar, f), editar:(id, f) => chama(c.editar, id, f), entrar:id => chama(c.entrar, id), sair:() => chama(c.sair),
    convidar:t => chama(c.convidar, t), convites:() => chama(c.convites), responder:(id, s) => chama(c.responder, id, s),
    expulsar:id => chama(c.expulsar, id), passarDono:id => chama(c.passarDono, id)
  };
}
/* NA TURMA: as mesmas operações pelo servidor das salas (club_req → club_res; server/clubes.js) */
const CLB_TURMA = {rid:0, pend:new Map()};
const clbTurmaOn = () => !SLOC.on && !!NET49.id && !!NET49.ws && NET49.ws.readyState === 1;
function clbTurmaPede(op, args){
  return new Promise((ok, falha) => {
    if (!clbTurmaOn()) return falha(new Error('Sem conexão com o servidor da turma agora.'));
    const rid = ++CLB_TURMA.rid;
    const t = setTimeout(() => { CLB_TURMA.pend.delete(rid); falha(new Error('O servidor da turma não respondeu. Tente de novo.')); }, 8000);
    CLB_TURMA.pend.set(rid, {ok, falha, t});
    net49Send({type:'club_req', rid, op, args:args || {}});
  });
}
function clbTurmaApi(){
  if (!clbTurmaOn()) return null;
  const p = (op, args) => clbTurmaPede(op, args);
  return {
    tipo:'turma',
    eu:() => ({id:NET49.id, nome:perfil.nome, trofeus:CLB.trofeusTurma | 0, pais:slPais()}),
    listar:busca => p('listar', {busca:busca || ''}), meu:() => p('meu'), ver:id => p('ver', {id}),
    criar:f => p('criar', f), editar:(id, f) => p('editar', {id, f}), entrar:id => p('entrar', {id}), sair:() => p('sair'),
    convidar:t => p('convidar', {termo:t}), convites:() => p('convites'), responder:(id, s) => p('responder', {id, aceitar:s}),
    expulsar:id => p('expulsar', {id}), passarDono:id => p('passarDono', {id})
  };
}
const net49MessageAntes70c = net49Message;
net49Message = function(m){
  if (m && m.type === 'club_res'){
    const x = CLB_TURMA.pend.get(m.rid); if (!x) return;
    clearTimeout(x.t); CLB_TURMA.pend.delete(m.rid);
    if (m.ok) x.ok(m.data); else x.falha(new Error(m.erro || 'Não deu certo. Tente de novo.'));
    return;
  }
  if (m && m.type === 'social' && m.eu) CLB.trofeusTurma = m.eu.trofeus | 0;
  const r = net49MessageAntes70c(m);
  if (m && m.type === 'hello' && lobby.aberto && lobby.tela === 'clube') setTimeout(clbAbre, 0);   // conectou com o CLUBE aberto: os clubes da turma
  return r;
};
const clbApi = () => clbPlataformaApi() || clbTurmaApi() || CLB_API_LOCAL;
const CLB_ONDE = {plataforma:'NA SUA CONTA', turma:'NA TURMA', local:'NESTE APARELHO · PESSOAL'};
const CLB_COMO = {                                         // como os troféus são contados (em cada lugar)
  plataforma:'Troféus = vitórias registradas na sua conta do RACHA (partidas que o servidor da plataforma validou). Os do clube são a soma dos membros; o ranking é pelos troféus.',
  turma:'Troféus = vitórias em salas online que o servidor da turma conferiu (o resultado mandado por quem roda a partida, da rodada certa, com placar e tempo possíveis). Partidas contra bots e encerradas pelo árbitro não contam. Os do clube são a soma dos membros; o ranking é pelos troféus.',
  local:'Clube pessoal, salvo só neste aparelho: os troféus são as suas vitórias aqui (contra os bots também). Não tem ranking nem tipo: ninguém mais entra. Para um clube com a galera, conecte no servidor da turma (salas online) ou entre na sua conta do RACHA.'
};
function clbComoConta(api){
  abrePop(c => {
    c.append(nodo('span', 'pop-tag', 'CLUBE · ' + CLB_ONDE[api.tipo]), nodo('h2', null, 'COMO OS TROFÉUS CONTAM'), nodo('p', 'pop-txt', CLB_COMO[api.tipo]));
    if (api.tipo !== 'local') c.appendChild(nodo('p', 'pop-txt', 'Tipo PÚBLICO: entra quem tem os pontos mínimos. SÓ CONVITE: só entra quem recebeu convite (o convite passa por cima dos pontos mínimos). O país aparece no clube e o filtro MEU PAÍS mostra os do seu país.'));
    const a = nodo('div', 'pop-acoes'); a.appendChild(botaoPop('ENTENDI', 'verde', () => { som.clique(); fechaPop(); })); c.appendChild(a);
  });
}
function clbMudouMeu(){ try { if (typeof v70ClubeDaConta === 'function') v70ClubeDaConta(); } catch (_) {} }   // (o escudo no cartão da sala online)

/* ---------------------------------------------------------------- 2) buscar (com o carregando e o erro na tela) */
function clbPede(fn, depois, chave){                     // chave: só a resposta do último pedido daquele tipo vale (a busca digitando)
  const tok = ++CLB.tok; if (chave) CLB.ult[chave] = tok;
  CLB.carregando++; CLB.erro = ''; clbRender();
  return Promise.resolve().then(fn).then(r => { if (!chave || CLB.ult[chave] === tok) depois && depois(r); }).catch(e => { CLB.erro = (e && e.message) || 'Não deu certo.'; aviso(CLB.erro); })
    .finally(() => { CLB.carregando = Math.max(0, CLB.carregando - 1); clbRender(); });
}
function clbAtualiza(tudo){                               // a lista, o seu clube e os convites
  const api = clbApi();
  clbPede(async () => {
    const [meu, lista, conv] = await Promise.all([api.meu().catch(() => null), api.listar(CLB.busca).catch(e => { throw e; }), tudo === false ? Promise.resolve(CLB.convites) : api.convites().catch(() => [])]);
    return {meu, lista, conv};
  }, r => { CLB.meu = r.meu; CLB.lista = r.lista; CLB.convites = Array.isArray(r.conv) ? r.conv : []; CLB.pedidoT = Date.now(); }, 'lista');
}
function clbAbreClube(id){ CLB.vista = 'clube'; CLB.clubeId = id; if (!CLB.clube || CLB.clube.id !== id) CLB.clube = null; clbPede(() => clbApi().ver(id), r => { CLB.clube = r; }, 'ver'); }
function clbAbre(){                                       // abrir a aba CLUBE: o seu clube direto (se tiver), senão a lista
  if (CLB.voltaForm){ CLB.voltaForm = false; if (CLB.modal) return; }   // voltando do editor do escudo com o CRIAR aberto
  CLB.modal = null;
  const api = clbApi();
  clbPede(async () => ({meu:await api.meu().catch(() => null), conv:await api.convites().catch(() => [])}), r => {
    CLB.meu = r.meu; CLB.convites = Array.isArray(r.conv) ? r.conv : [];
    if (CLB.voltaClube && CLB.clubeId){ CLB.voltaClube = false; return clbAbreClube(CLB.clubeId); }
    if (r.meu) clbAbreClube(r.meu.id); else { CLB.vista = 'lista'; clbAtualiza(false); }
  });
}
TELAS.clube.abre = () => clbAbre();
const clubesRenderAntes69 = clubesRender;
clubesRender = function(){ clbRender(); };
TELAS.clube.render = () => clbRender();

/* ---------------------------------------------------------------- 3) a tela */
function clbRender(){
  const box = $('cl-corpo'); if (!box) return;
  const tela = $('tela-clubes'); if (tela) tela.classList.add('sx-tela', 'clb-tela');
  const rol = box.querySelector('.clb-rolar'), rolTop = rol ? [rol.dataset.v, rol.scrollTop] : null;
  const foco = onFoco(box); box.textContent = ''; onStatus($('cl-st'));
  box.classList.add('sx-corpo');
  const api = clbApi(), p = nodo('div', 'sx clb'), cab = nodo('header', 'sx-cab clb-cab');
  const tit = nodo('h3', 'sx-tit', CLB.vista === 'clube' ? 'CLUBE' : 'CLUBES');
  tit.appendChild(nodo('span', 'sx-tag clb-onde clb-onde-' + api.tipo, CLB_ONDE[api.tipo]));
  cab.appendChild(tit);
  if (CLB.carregando) cab.appendChild((() => { const s = nodo('span', 'sx-st liga'); s.append(nodo('i'), 'CARREGANDO'); return s; })());
  p.appendChild(cab);
  p.appendChild(CLB.vista === 'clube' ? clbPagina(api) : clbLista(api));
  box.appendChild(p);
  if (CLB.modal) box.appendChild(clbModal(api));
  if (rolTop){ const r2 = box.querySelector('.clb-rolar[data-v="' + rolTop[0] + '"]'); if (r2) r2.scrollTop = rolTop[1]; }
  onRefoca(box, foco);
}
function clbBt(cls, html, fn, rot){ const b = novoBotao(cls, rot); b.innerHTML = html; b.addEventListener('click', e => { e.stopPropagation(); som.clique(); fn(e); }); return b; }

/* a lista: criar ou ver o seu clube · ou · CLUBES / CONVITES */
function clbLista(api){
  const w = nodo('div', 'clb-lista-wrap');
  // à esquerda: criar (ou o seu clube)
  const ca = nodo('aside', 'clb-criar-card');
  if (CLB.meu){
    ca.classList.add('tem');
    const e = nodo('span', 'clb-esc-g'); e.appendChild(clbEscudo(CLB.meu.escudo, 150)); ca.appendChild(e);
    ca.append(nodo('p', 'clb-criar-tx', 'SEU CLUBE'), nodo('b', 'clb-criar-nome', CLB.meu.nome));
    ca.appendChild(clbBt('sx-criar clb-criar-bt', '<span>VER MEU CLUBE</span>', () => clbAbreClube(CLB.meu.id)));
  } else {
    const e = nodo('span', 'clb-esc-g'); e.appendChild(tpMiniatura(TP_PRE_ESCUDO[2].d, 150)); ca.appendChild(e);
    ca.appendChild(nodo('p', 'clb-criar-tx', api.tipo === 'local' ? 'Crie o seu clube pessoal (só neste aparelho).' : 'Que tal montar o seu clube?'));
    const bt = clbBt('sx-criar clb-criar-bt', CLB_SVG.mais + '<span>CRIAR CLUBE</span>', () => clbCriarAbre());
    ca.appendChild(bt);
    ca.appendChild(nodo('small', 'clb-criar-preco', 'Criar é grátis'));
  }
  if (api.tipo === 'local' && !SLOC.on && servidorEndereco() && !NET49.ws){   // tem servidor: o clube com a galera fica a um toque
    const t = clbBt('clb-turma', '<span>CLUBES DA TURMA</span><small>conectar no servidor das salas</small>', () => { galeraConecta(); clbRender(); }, 'Conectar para ver os clubes da turma');
    ca.appendChild(t);
  }
  ca.appendChild(clbBt('clb-como', '<span>COMO OS TROFÉUS CONTAM?</span>', () => clbComoConta(api), 'Como os troféus contam'));
  w.appendChild(ca);
  w.appendChild((() => { const o = nodo('div', 'clb-ou'); o.appendChild(nodo('span', null, 'OU')); return o; })());
  // à direita: as abas, a busca e a lista
  const col = nodo('section', 'clb-col');
  const abas = nodo('nav', 'clb-abas'); abas.setAttribute('role', 'tablist');
  for (const [id, rot] of [['clubes', 'CLUBES'], ['convites', 'CONVITES']]){
    const b = clbBt('clb-aba' + (CLB.aba === id ? ' on' : ''), rot, () => { if (CLB.aba === id) return; CLB.aba = id; clbRender(); }); b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', String(CLB.aba === id));
    if (id === 'convites' && CLB.convites.length) b.appendChild(nodo('b', 'clb-aba-n', String(CLB.convites.length)));
    abas.appendChild(b);
  }
  col.appendChild(abas);
  if (CLB.aba === 'convites') col.appendChild(clbConvites(api));
  else {
    const bus = nodo('div', 'sx-busca clb-busca'), lb = nodo('label', 'sx-in'), inp = nodo('input'); inp.type = 'search'; inp.placeholder = 'Procurar clube'; inp.value = CLB.busca; inp.maxLength = 24; inp.setAttribute('aria-label', 'Procurar clube'); inp.dataset.foco = 'clb-busca';
    lb.innerHTML = CLB_SVG.lupa; lb.appendChild(inp);
    let tm = 0; inp.addEventListener('input', () => { CLB.busca = inp.value; clearTimeout(tm); tm = setTimeout(() => clbAtualiza(false), 380); });
    inp.addEventListener('keydown', e => { if (e.key === 'Enter'){ e.preventDefault(); clearTimeout(tm); clbAtualiza(false); } });
    const pais = clbBt('sx-fil clb-pais' + (CLB.soPais ? ' on' : ''), '<i></i><span>' + slBandeira(slPais()) + ' MEU PAÍS</span>', () => { CLB.soPais = !CLB.soPais; clbRender(); }, 'Só os clubes do seu país');
    pais.setAttribute('aria-pressed', String(CLB.soPais));
    bus.append(lb, pais, clbBt('sx-fil sx-gira', CLB_SVG.gira, () => clbAtualiza(), 'Atualizar a lista'));
    col.appendChild(bus);
    const comRank = api.tipo !== 'local';
    const cols = nodo('div', 'clb-cols' + (comRank ? '' : ' sem-rank')); for (const t of comRank ? ['CLUBE', 'MEMBROS', 'TROFÉUS', 'RANKING'] : ['CLUBE', 'MEMBROS', 'TROFÉUS']) cols.appendChild(nodo('span', null, t)); col.appendChild(cols);
    const rows = nodo('div', 'clb-rows clb-rolar' + (comRank ? '' : ' sem-rank')); rows.dataset.v = 'lista';
    const L = (CLB.lista || []).filter(c => !CLB.soPais || c.pais === slPais());
    if (!CLB.lista && CLB.carregando) rows.appendChild(nodo('p', 'clb-vazio', 'Carregando os clubes…'));
    else if (!L.length){
      const v = nodo('div', 'clb-vazio');
      v.append(nodo('b', null, CLB.busca ? 'NENHUM CLUBE COM ESSE NOME' : CLB.soPais && (CLB.lista || []).length ? 'NENHUM CLUBE DO SEU PAÍS' : 'NENHUM CLUBE AINDA'),
        nodo('p', null, api.tipo === 'local' ? 'Neste aparelho só aparece o seu clube pessoal. Os clubes com a galera ficam no servidor da turma (as salas online) ou na sua conta do RACHA.'
          : CLB.busca ? 'Tente outro nome (ou a sigla do país, como BR).' : CLB.soPais && (CLB.lista || []).length ? 'Tire o filtro MEU PAÍS para ver os outros.' : 'Seja o primeiro: toque em CRIAR CLUBE (é grátis).'));
      rows.appendChild(v);
    }
    for (const c of L) rows.appendChild(clbLinha(c));
    col.appendChild(rows);
  }
  w.appendChild(col);
  return w;
}
function clbLinha(c){
  const b = novoBotao('clb-row' + (CLB.meu && CLB.meu.id === c.id ? ' meu' : ''), 'Clube ' + c.nome);
  const e = nodo('span', 'clb-row-esc'); e.appendChild(clbEscudo(c.escudo, 70));
  const id = nodo('span', 'clb-row-id'), nm = nodo('b', 'clb-row-nome'); nm.textContent = c.nome; nm.insertAdjacentHTML('beforeend', slBandeira(c.pais));
  if (c.tipo === 'convite') nm.insertAdjacentHTML('beforeend', '<i class="clb-cad" title="Só convite">' + CLB_SVG.cadeado + '</i>');
  id.append(nm, nodo('small', null, c.descricao || 'Chega mais e joga com a gente!'));
  const mem = nodo('span', 'clb-row-n'); mem.innerHTML = CLB_SVG.gente; mem.append(c.membros + '/' + CLB_MAX);
  const tr = nodo('span', 'clb-row-n clb-tr'); tr.innerHTML = CLB_SVG.trofeu; tr.append(clbFmt(c.trofeus));
  b.append(e, id, mem, tr);
  if (c.ranking != null){ const rk = nodo('span', 'clb-row-n clb-rk'); rk.innerHTML = CLB_SVG.podio; rk.append('#' + clbFmt(c.ranking)); b.appendChild(rk); }
  b.addEventListener('click', () => { som.clique(); clbAbreClube(c.id); });
  return b;
}
function clbConvites(api){
  const rows = nodo('div', 'clb-rows clb-rolar clb-conv'); rows.dataset.v = 'conv';
  if (!CLB.convites.length){
    const v = nodo('div', 'clb-vazio'); v.append(nodo('b', null, 'NENHUM CONVITE'), nodo('p', null, api.tipo === 'local' ? 'O clube pessoal não tem convites. Eles chegam nos clubes da turma (servidor das salas) e na sua conta do RACHA.'
      : 'Quando um clube te convidar, o convite aparece aqui.' + (api.tipo === 'turma' && V70ON.pub ? ' Seu ID na turma (para te convidarem): ' + V70ON.pub + '.' : ''))); rows.appendChild(v);
  }
  for (const cv of CLB.convites){
    const r = nodo('div', 'clb-row clb-row-conv'), e = nodo('span', 'clb-row-esc'); e.appendChild(clbEscudo(cv.clube.escudo, 70));
    const id = nodo('span', 'clb-row-id'), nm = nodo('b', 'clb-row-nome'); nm.textContent = cv.clube.nome; nm.insertAdjacentHTML('beforeend', slBandeira(cv.clube.pais));
    id.append(nm, nodo('small', null, 'Convite de ' + (cv.de && cv.de.nome || 'um membro') + ' · ' + cv.clube.membros + '/' + CLB_MAX + ' · ' + clbFmt(cv.clube.trofeus) + ' troféus'));
    const ac = nodo('span', 'clb-conv-ac');
    ac.append(clbBt('sx-bt verde', 'ACEITAR', () => clbAceita(cv, true)), clbBt('sx-bt verm', 'RECUSAR', () => clbAceita(cv, false)));
    r.append(e, id, ac); rows.appendChild(r);
  }
  return rows;
}
function clbAceita(cv, sim){
  const api = clbApi();
  const vai = () => clbPede(() => api.responder(cv.id, sim), () => { CLB.convites = CLB.convites.filter(x => x !== cv); if (sim){ aviso('Bem-vindo ao ' + cv.clube.nome + '!'); som.nivel(); clbMudouMeu(); clbAbreClube(cv.clube.id); } else clbAtualiza(); });
  if (sim && CLB.meu && CLB.meu.id !== cv.clube.id){
    abrePop(c => {
      c.append(nodo('span', 'pop-tag', 'CLUBE'), nodo('h2', null, 'TROCAR DE CLUBE?'), nodo('p', 'pop-txt', 'Para entrar no ' + cv.clube.nome + ' você sai do ' + CLB.meu.nome + '.'));
      const a = nodo('div', 'pop-acoes'); a.append(botaoPop('FICAR', '', () => { som.clique(); fechaPop(); }), botaoPop('TROCAR', 'verde', () => { som.clique(); fechaPop(); clbPede(() => api.sair(), () => vai()); })); c.appendChild(a);
    });
    return;
  }
  vai();
}

/* a página do clube */
function clbPagina(api){
  const c = CLB.clube, w = nodo('div', 'clb-pag');
  if (!c){ w.appendChild(nodo('p', 'clb-vazio', CLB.carregando ? 'Carregando o clube…' : (CLB.erro || 'Clube não encontrado.'))); w.appendChild(clbBt('sx-bt azul', 'MAIS CLUBES', () => { CLB.vista = 'lista'; CLB.aba = 'clubes'; clbAtualiza(); })); return w; }
  const esq = nodo('section', 'clb-pag-esq'), topo = nodo('div', 'clb-topo');
  const esc = nodo('span', 'clb-esc-g'); esc.appendChild(clbEscudo(c.escudo, 170));
  if (c.souDono){ const ed = clbBt('clb-esc-ed', CLB_SVG.lapis, () => clbEditaEscudo(c), 'Editar o escudo'); esc.appendChild(ed); }
  const id = nodo('div', 'clb-topo-id'), h = nodo('h3', 'clb-nome'); h.textContent = c.nome; h.insertAdjacentHTML('beforeend', slBandeira(c.pais));
  id.append(h, nodo('p', 'clb-desc', c.descricao || 'Chega mais e joga com a gente!'));
  if (c.donoNome) id.appendChild(nodo('small', 'clb-dono', 'Dono: ' + c.donoNome));
  const mega = clbBt('clb-mega', CLB_SVG.mega, () => { CLB.modal = {tipo:'convidar', termo:'', msg:''}; clbRender(); }, 'Convidar para o clube');
  mega.disabled = !c.souMembro; mega.hidden = api.tipo === 'local';
  topo.append(esc, id, mega);
  esq.appendChild(topo);
  const st = nodo('div', 'clb-stats'), box = (rot, val, ic) => { const d = nodo('div', 'clb-stat'); d.append(nodo('small', null, rot)); const v = nodo('b'); v.innerHTML = ic || ''; v.append(val); d.appendChild(v); return d; };
  if (api.tipo === 'local') st.append(box('TROFÉUS', clbFmt(c.trofeus), CLB_SVG.trofeu), box('CLUBE', 'Pessoal'), box('MEMBROS', '1 (você)'));
  else st.append(box('TROFÉUS', clbFmt(c.trofeus), CLB_SVG.trofeu), box('RANKING', '#' + clbFmt(c.ranking), CLB_SVG.podio), box('TIPO', c.tipo === 'convite' ? 'Só convite' : 'Público'), box('TROFÉU NECESSÁRIO', clbFmt(c.trofeuMinimo), CLB_SVG.trofeu));
  esq.appendChild(st);
  const ac = nodo('div', 'clb-acoes');
  if (c.souMembro) ac.appendChild(clbBt('sx-bt verm', 'SAIR', () => clbSair(c)));
  else {
    const eu = c.eu || api.eu(), pode = c.tipo === 'publico' && eu.trofeus >= c.trofeuMinimo && c.membros < CLB_MAX;
    const en = clbBt('sx-bt verde', 'ENTRAR', () => clbEntrar(c));
    en.disabled = !pode; ac.appendChild(en);
    const motivo = c.membros >= CLB_MAX ? 'Clube cheio (' + CLB_MAX + ').' : c.tipo !== 'publico' ? 'Só entra quem for convidado (peça um convite para alguém do clube).' : eu.trofeus < c.trofeuMinimo ? 'Precisa de ' + clbFmt(c.trofeuMinimo) + ' troféus (você tem ' + clbFmt(eu.trofeus) + ').' : '';
    if (motivo) esq.appendChild(nodo('p', 'clb-motivo', motivo));
  }
  if (c.souDono) ac.appendChild(clbBt('sx-bt cinza', CLB_SVG.lapis + '<span>EDITAR</span>', () => clbEditarAbre(c)));
  ac.appendChild(clbBt('sx-bt azul', 'MAIS CLUBES', () => { CLB.vista = 'lista'; CLB.aba = 'clubes'; clbAtualiza(); }));
  esq.appendChild(ac);
  const nota = nodo('p', 'clb-nota', api.tipo === 'local' ? 'Clube pessoal, salvo neste aparelho · troféus = as suas vitórias aqui · sem ranking ' : api.tipo === 'turma' ? '1 troféu por vitória em sala online conferida pelo servidor · o do clube é a soma dos membros ' : '1 troféu por vitória validada na sua conta · o do clube é a soma dos membros ');
  nota.appendChild(clbBt('clb-como-lk', 'COMO CONTA?', () => clbComoConta(api), 'Como os troféus contam'));
  esq.appendChild(nota);
  // os membros
  const dir = nodo('section', 'clb-pag-dir'), hd = nodo('h4', 'clb-mem-tit'); hd.innerHTML = CLB_SVG.gente; hd.append('MEMBROS (' + (c.lista || []).length + ')');
  dir.appendChild(hd);
  const ul = nodo('div', 'clb-mem clb-rolar'); ul.dataset.v = 'mem';
  for (const m of c.lista || []){
    const r = nodo(c.souDono && !m.eu ? 'button' : 'div', 'clb-membro' + (m.eu ? ' eu' : ''));
    if (r.tagName === 'BUTTON'){ r.type = 'button'; r.addEventListener('click', () => { som.clique(); CLB.modal = {tipo:'membro', m}; clbRender(); }); }
    const av = nodo('span', 'clb-av'); av.appendChild(clbTampa(m.tampa, 64));
    const nm = nodo('span', 'clb-mem-id'), n = nodo('b'); n.textContent = m.nome + (m.eu ? ' (você)' : ''); n.insertAdjacentHTML('beforeend', slBandeira(m.pais));
    nm.append(n, (() => { const s = nodo('small', m.papel === 'dono' ? 'dono' : ''); s.innerHTML = m.papel === 'dono' ? CLB_SVG.coroa : ''; s.append(m.papel === 'dono' ? 'Proprietário' : 'Membro'); return s; })());
    const tr = nodo('span', 'clb-mem-tr'); tr.innerHTML = CLB_SVG.trofeu; tr.append(clbFmt(m.trofeus));
    r.append(av, nm, tr); ul.appendChild(r);
  }
  dir.appendChild(ul);
  w.append(esq, dir);
  return w;
}
function clbEntrar(c){
  const api = clbApi();
  const vai = () => clbPede(() => api.entrar(c.id), () => { aviso('Você entrou no ' + c.nome + '!'); som.nivel(); clbMudouMeu(); clbAbreClube(c.id); });
  if (CLB.meu && CLB.meu.id !== c.id){
    abrePop(x => {
      x.append(nodo('span', 'pop-tag', 'CLUBE'), nodo('h2', null, 'TROCAR DE CLUBE?'), nodo('p', 'pop-txt', 'Para entrar no ' + c.nome + ' você sai do ' + CLB.meu.nome + '.'));
      const a = nodo('div', 'pop-acoes'); a.append(botaoPop('FICAR', '', () => { som.clique(); fechaPop(); }), botaoPop('TROCAR', 'verde', () => { som.clique(); fechaPop(); clbPede(() => api.sair(), () => vai()); })); x.appendChild(a);
    });
    return;
  }
  vai();
}
function clbSair(c){
  const api = clbApi(), so = (c.lista || []).length <= 1;
  abrePop(x => {
    x.append(nodo('span', 'pop-tag', 'CLUBE'), nodo('h2', null, 'SAIR DO CLUBE?'),
      nodo('p', 'pop-txt', so ? 'Você é o único membro: o ' + c.nome + ' deixa de existir.' : c.souDono ? 'Você é o dono: o membro com mais troféus vira o novo dono.' : 'Você sai do ' + c.nome + '. Dá para voltar depois, se ele for público.'));
    const a = nodo('div', 'pop-acoes');
    a.append(botaoPop('FICAR', '', () => { som.clique(); fechaPop(); }), botaoPop('SAIR', 'vermelho', () => { som.clique(); fechaPop(); clbPede(() => api.sair(), () => { CLB.meu = null; aviso('Você saiu do clube'); clbMudouMeu(); CLB.vista = 'lista'; clbAtualiza(); }); }));
    x.appendChild(a);
  });
}

/* ---------------------------------------------------------------- 4) as janelas: criar, editar, convidar, o membro */
function clbCriarAbre(){
  if (CLB.meu){ aviso('Saia do seu clube antes de criar outro'); return; }
  CLB.form = {modo:'criar', nome:'', descricao:'', trofeuMinimo:0, pais:slPais(), tipo:'publico', escudo:tpCodigo(TP_ESCUDO_D()), erro:''};
  CLB.modal = {tipo:'form'}; clbRender();
  setTimeout(() => { const i = document.querySelector('.clb-form input[data-campo="nome"]'); if (i) try { i.focus({preventScroll:true}); } catch (_) {} }, 80);
}
function clbEditarAbre(c){
  CLB.form = {modo:'editar', id:c.id, nome:c.nome, descricao:c.descricao, trofeuMinimo:c.trofeuMinimo, pais:c.pais, tipo:c.tipo, escudo:c.escudo, erro:''};
  CLB.modal = {tipo:'form'}; clbRender();
}
function clbEditaEscudo(c){                               // o lápis no escudo: o editor no modo escudo (salva direto no clube)
  CLB.voltaClube = true; CLB.clubeId = c.id;
  tpeAbre({modo:'E', D:clbEscudoD(c.escudo), volta:'clube', ok:cod => {
    clbPede(() => clbApi().editar(c.id, {escudo:cod}), () => { aviso('Escudo novo no clube!'); if (lobby.tela === 'clube' && CLB.vista === 'clube') clbAbreClube(c.id); });
  }});
}
function clbModal(api){
  const fundo = nodo('div', 'clb-modal'), M = CLB.modal;
  fundo.addEventListener('pointerdown', e => { if (e.target === fundo){ CLB.modal = null; clbRender(); } });
  const caixa = nodo('div', 'sx clb-form'), cab = nodo('header', 'clb-form-cab'), x = clbBt('tpe-pop-x', TPE_SVG.x, () => { CLB.modal = null; clbRender(); }, 'Fechar');
  caixa.appendChild(cab);
  if (M.tipo === 'form'){
    const f = CLB.form, novo = f.modo === 'criar';
    cab.append(nodo('h3', null, novo ? 'CRIAR CLUBE' : 'EDITAR CLUBE'), x);
    const corpo = nodo('div', 'clb-form-corpo clb-rolar'); corpo.dataset.v = 'form';
    const esc = nodo('div', 'clb-form-esc'), ev = nodo('span', 'clb-esc-g'); ev.appendChild(clbEscudo(f.escudo, 150));
    esc.append(ev, clbBt('sx-bt azul clb-esc-bt', CLB_SVG.lapis + '<span>ESCUDO</span>', () => {
      CLB.voltaForm = true;                                // (a janela continua aberta na volta, com tudo que já foi escrito)
      tpeAbre({modo:'E', D:clbEscudoD(f.escudo), volta:'clube', ok:cod => { f.escudo = cod; }});
    }));
    const campos = nodo('div', 'clb-campos');
    const campo = (rot, k, max, ph, dis) => { const l = nodo('label', 'clb-campo'); l.appendChild(nodo('span', 'sx-rot', rot)); const i = nodo('input', 'sx-campo'); i.type = 'text'; i.maxLength = max; i.value = f[k]; i.placeholder = ph || ''; i.dataset.campo = k; i.dataset.foco = 'clb-' + k; i.disabled = !!dis; i.autocomplete = 'off'; i.addEventListener('input', () => { f[k] = i.value; }); l.appendChild(i); return l; };
    const sel = (rot, valor, ant, prox) => { const d = nodo('div', 'sx-campo-sel'); d.appendChild(nodo('span', 'sx-rot', rot)); const s = nodo('div', 'sx-sel'); s.append(clbBt('sx-seta', CLB_SVG.seta, ant, rot + ': anterior'), (() => { const v = nodo('span', 'sx-val'); v.innerHTML = valor; return v; })(), clbBt('sx-seta dir', CLB_SVG.seta, prox, rot + ': próximo')); d.appendChild(s); return d; };
    campos.append(campo('NOME DO SEU CLUBE', 'nome', 24, 'Ex.: Craques da Laje', !novo), campo('DESCRIÇÃO', 'descricao', 60, 'Chega mais e joga com a gente!'));
    const g2 = nodo('div', 'clb-grade3');
    const iT = CLB_TROFEUS.indexOf(f.trofeuMinimo), iP = CLB_PAISES.findIndex(p => p[0] === f.pais), iTp = CLB_TIPOS.findIndex(t => t[0] === f.tipo);
    const anda = (lista, i, d) => lista[(Math.max(0, i) + d + lista.length) % lista.length];
    const selPais = sel('PAÍS', slBandeira(f.pais) + '<b>' + clbPais(f.pais)[1] + '</b>', () => { f.pais = anda(CLB_PAISES, iP, -1)[0]; clbRender(); }, () => { f.pais = anda(CLB_PAISES, iP, 1)[0]; clbRender(); });
    if (api.tipo === 'local'){ g2.append(selPais); g2.classList.add('um'); }   // (no pessoal não tem tipo nem pontos mínimos: ninguém mais entra)
    else g2.append(sel('PONTOS MÍNIMOS', CLB_SVG.trofeu + '<b>' + clbFmt(f.trofeuMinimo) + '</b>', () => { f.trofeuMinimo = anda(CLB_TROFEUS, iT, -1); clbRender(); }, () => { f.trofeuMinimo = anda(CLB_TROFEUS, iT, 1); clbRender(); }),
      selPais, sel('TIPO', '<b>' + (CLB_TIPOS[Math.max(0, iTp)][1]) + '</b>', () => { f.tipo = anda(CLB_TIPOS, iTp, -1)[0]; clbRender(); }, () => { f.tipo = anda(CLB_TIPOS, iTp, 1)[0]; clbRender(); }));
    campos.appendChild(g2);
    campos.appendChild(nodo('p', 'clb-nota', api.tipo === 'local' ? 'Clube PESSOAL: fica salvo só neste aparelho, só com você (sem ranking, tipo ou pontos mínimos). Criar é grátis.'
      : CLB_TIPOS[Math.max(0, iTp)][2] + ' (pontos mínimos: ' + clbFmt(f.trofeuMinimo) + '). Máximo de ' + CLB_MAX + ' membros. Criar é grátis.' + (api.tipo === 'turma' ? ' O clube fica no servidor da turma.' : '')));
    if (f.erro) campos.appendChild(nodo('p', 'clb-erro', f.erro));
    corpo.append(esc, campos);
    caixa.appendChild(corpo);
    const pe = nodo('footer', 'clb-form-pe');
    if (novo){
      const ok = clbBt('sx-criar clb-ok', '<span>CRIAR</span><em>GRÁTIS</em>', () => clbCriar());
      ok.disabled = !!CLB.carregando; pe.appendChild(ok);
    } else pe.appendChild(clbBt('sx-criar clb-ok', '<span>SALVAR</span>', () => clbSalvarEdicao()));
    caixa.appendChild(pe);
  } else if (M.tipo === 'convidar'){
    cab.append(nodo('h3', null, 'CONVIDAR'), x);
    const corpo = nodo('div', 'clb-form-corpo clb-conv-form');
    if (api.tipo === 'local') corpo.appendChild(nodo('p', 'clb-nota', 'O clube pessoal é só seu. Para convidar a galera, use um clube da turma (servidor das salas) ou da sua conta do RACHA.'));
    else {
      const turma = api.tipo === 'turma';
      const l = nodo('label', 'clb-campo'); l.appendChild(nodo('span', 'sx-rot', turma ? 'ID NA TURMA OU NOME DO JOGADOR' : 'ID OU USUÁRIO DO JOGADOR'));
      const i = nodo('input', 'sx-campo'); i.type = 'text'; i.maxLength = 40; i.value = M.termo; i.placeholder = turma ? 'Ex.: 500123 ou o nome exato' : 'Ex.: 000123 ou craque10'; i.dataset.foco = 'clb-conv'; i.autocomplete = 'off';
      i.addEventListener('input', () => { M.termo = i.value; }); i.addEventListener('keydown', e => { if (e.key === 'Enter'){ e.preventDefault(); clbConvidar(); } });
      l.appendChild(i); corpo.append(l, nodo('p', 'clb-nota', 'O convite aparece em CLUBE › CONVITES para a pessoa. Clube só convite: só entra assim.' + (turma && V70ON.pub ? ' Seu ID na turma: ' + V70ON.pub + '.' : '')));
      if (M.msg) corpo.appendChild(nodo('p', M.ok ? 'clb-ok-msg' : 'clb-erro', M.msg));
      const pe = nodo('footer', 'clb-form-pe'); pe.appendChild(clbBt('sx-criar clb-ok', CLB_SVG.mega + '<span>ENVIAR CONVITE</span>', () => clbConvidar())); caixa.append(corpo, pe);
      setTimeout(() => { if (document.activeElement !== i) try { i.focus({preventScroll:true}); } catch (_) {} }, 60);
      fundo.appendChild(caixa); return fundo;
    }
    caixa.appendChild(corpo);
  } else if (M.tipo === 'membro'){
    const m = M.m; cab.append(nodo('h3', null, m.nome), x);
    const corpo = nodo('div', 'clb-form-corpo clb-mem-menu');
    corpo.append(nodo('p', 'clb-nota', (m.papel === 'dono' ? 'Proprietário' : 'Membro') + ' · ' + clbFmt(m.trofeus) + ' troféus'),
      clbBt('sx-bt azul', CLB_SVG.coroa + '<span>PASSAR A DONO</span>', () => clbMembroAcao('passarDono', m)),
      clbBt('sx-bt verm', '<span>TIRAR DO CLUBE</span>', () => clbMembroAcao('expulsar', m)));
    caixa.appendChild(corpo);
  }
  fundo.appendChild(caixa);
  return fundo;
}
function clbCriar(){                                       // v70: criar é grátis (em qualquer lugar)
  const f = CLB.form, api = clbApi();
  f.nome = clbLimpa(f.nome, 24); f.descricao = clbLimpa(f.descricao, 60);
  if (f.nome.length < 3){ f.erro = 'O nome precisa de 3 letras ou mais.'; clbRender(); return; }
  f.erro = '';
  const local = api.tipo === 'local';
  clbPede(() => api.criar({nome:f.nome, descricao:f.descricao || 'Chega mais e joga com a gente!', pais:f.pais, tipo:local ? 'publico' : f.tipo, trofeuMinimo:local ? 0 : f.trofeuMinimo, escudo:f.escudo}).catch(e => { f.erro = e.message; throw e; }),
    r => { CLB.modal = null; CLB.form = null; som.compra(); aviso(local ? 'Clube pessoal criado!' : 'Clube criado!'); clbMudouMeu(); clbAbreClube(r.id); });
}
function clbSalvarEdicao(){
  const f = CLB.form; f.descricao = clbLimpa(f.descricao, 60);
  clbPede(() => clbApi().editar(f.id, {descricao:f.descricao || 'Chega mais e joga com a gente!', pais:f.pais, tipo:f.tipo, trofeuMinimo:f.trofeuMinimo, escudo:f.escudo}), () => { CLB.modal = null; CLB.form = null; aviso('Clube atualizado'); clbAbreClube(f.id); });
}
function clbConvidar(){
  const M = CLB.modal; const t = clbLimpa(M.termo, 40); if (!t){ M.msg = 'Escreva o ID ou o usuário.'; M.ok = false; clbRender(); return; }
  clbPede(() => clbApi().convidar(t), () => { M.msg = 'Convite enviado para ' + t + '!'; M.ok = true; M.termo = ''; }).then(() => { if (CLB.erro && CLB.modal === M){ M.msg = CLB.erro; M.ok = false; clbRender(); } });
}
function clbMembroAcao(acao, m){
  const c = CLB.clube, txt = acao === 'expulsar' ? 'Tirar ' + m.nome + ' do clube?' : 'Passar o clube para ' + m.nome + '? Você continua como membro.';
  abrePop(x => {
    x.append(nodo('span', 'pop-tag', 'CLUBE'), nodo('h2', null, acao === 'expulsar' ? 'TIRAR DO CLUBE?' : 'NOVO DONO?'), nodo('p', 'pop-txt', txt));
    const a = nodo('div', 'pop-acoes');
    a.append(botaoPop('CANCELAR', '', () => { som.clique(); fechaPop(); }), botaoPop('CONFIRMAR', acao === 'expulsar' ? 'vermelho' : 'verde', () => { som.clique(); fechaPop(); CLB.modal = null; clbPede(() => clbApi()[acao](m.id), () => { aviso(acao === 'expulsar' ? m.nome + ' saiu do clube' : m.nome + ' é o novo dono'); clbMudouMeu(); clbAbreClube(c.id); }); }));
    x.appendChild(a);
  });
}

/* ---------------------------------------------------------------- 5) a sua tampinha também na conta (para os membros verem e para outros aparelhos) */
const tpEquipaAntes69c = tpEquipa;
tpEquipa = function(cod){
  const ok = tpEquipaAntes69c(cod);
  if (ok){ const pl = tpePlataforma(); if (pl && typeof pl.tampa === 'function') Promise.resolve().then(() => pl.tampa(cod)).catch(() => {}); }
  return ok;
};
(function clbTampaDaConta(){                              // aparelho novo (nenhuma equipada aqui): usa a da conta, sem pagar de novo
  const pl = tpePlataforma(); if (!pl || typeof pl.conta !== 'function') return;
  let c = null; try { c = pl.conta(); } catch (_) {}
  if (!c || !tpEhCodigo(c.tampa) || c.tampa[0] !== 'T' || !tpLe(c.tampa)) return;
  TP.livres.add(c.tampa);
  if (!TP.equipada) tpEquipaAntes69c(c.tampa);
})();
