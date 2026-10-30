/* =====================================================================================================================
   RACHA v92 · OFICINA — A SALA COM MAPA (tools/oficina/sala.js)
   A sala do servidor das salas jogando um mapa da Oficina (até 4 times): a tela da sala (os times, quem assiste, o chat,
   os ajustes do admin, trocar o mapa), as mensagens do servidor que são dela (o mapa, a sala, o começo, os quadros, o
   fim, o chat, a saída) e a volta automática quando a internet cai (o mesmo lugar, por 90 s).
   As salas comuns continuam com a tela delas: só as que têm mapa (room.mapa) passam por aqui. Na lista de salas do
   GALERA as salas com mapa aparecem com o nome do mapa; o JOGAR AGORA continua só nas salas comuns.
   CRIAR SALA (o JOGAR dos mapas): a janela com o nome, os jogadores por time, os bots, aberta ou fechada e a FÍSICA DA
   SALA — o tamanho e a velocidade da bola, o deslize, o peso, o quique, os chutes e as tampinhas, por cima da física do
   mapa (vale só nesta sala; o admin muda de novo nos AJUSTES antes da partida).
   ===================================================================================================================== */
const OFS = { code: '', sala: null, mapa: null, mapas: new Map(), chat: [], volta: 'hub', quer: null, tentaT: 0, ultimoResultado: null, entrando: 0 };
const ARB_TXT = /^⁣?ARB:/;

/* ---------------------------------------------------------------- as mensagens do servidor */
OFS.recebeMapa = function (m) {
  if (!m || typeof m.code !== 'string' || !m.mapa) return;
  const l = RM.limpa(m.mapa);
  if (!l.ok) { aviso('O mapa da sala não abriu neste aparelho: ' + (l.erros || []).slice(0, 2).join(' · '), 'erro'); return; }
  OFS.mapas.set(m.code, { hash: String(m.hash || ''), info: m.info || {}, mapa: l.mapa });
  while (OFS.mapas.size > 4) OFS.mapas.delete(OFS.mapas.keys().next().value);
  if (OFS.code === m.code) { OFS.mapa = OFS.mapas.get(m.code); if (OFI.tela === 'sala') pintaSala(); }
};
OFS.trata = function (m) {                             // true = a mensagem é da sala com mapa (o jogo de sempre não vê)
  if (!m || typeof m.type !== 'string') return false;
  const t = m.type;
  try { OFS.tinhaSalaComum = typeof NET49 !== 'undefined' && !!NET49.room; } catch (_) { OFS.tinhaSalaComum = false; }
  if (t === 'room') {
    const r = m.room;
    if (r && r.mapa) { assumeSala(r); return true; }
    if (r && OFS.code && r.code === OFS.code) { soltaSala(); return false; }   // (o admin voltou a sala para os campos do RACHA: a tela de sempre)
    return false;
  }
  if (!OFS.code) {
    if (t === 'error' && (OFI.aberta || OFJ.on)) { aviso(m.message || 'Não deu certo.', 'erro'); OFS.entrando = 0; return !(m.codigo === 'outra_aba' || m.codigo === 'sem_conta'); }
    return false;
  }
  switch (t) {
    case 'start': if (m.room && m.room.mapa) { OFS.sala = m.room; comecaPartida(m.room, m.resume); return true; } return false;
    case 'snapshot': if (OFJ.on && OFJ.modo === 'rede') OFJ.snap(m); return true;
    case 'pause': if (OFJ.on && OFJ.modo === 'rede') OFJ.pausaRede(!!m.paused); return true;
    case 'result': OFJ.resultado(m); return true;
    case 'say': addChat(m); return true;
    case 'say_hide': OFS.chat = OFS.chat.filter(x => x.mid !== m.mid); if (OFI.tela === 'sala') pintaChat(); return true;
    case 'sayHistory': OFS.chat = Array.isArray(m.list) ? m.list.filter(x => x && !ARB_TXT.test(x.text || '')).slice(-40) : []; if (OFI.tela === 'sala') pintaChat(); return true;
    case 'typing': return true;
    // v93 nas salas com mapa: a contagem 3, 2, 1, JÁ! (o servidor segura e solta junto), os balões de fala rápida; o painel de
    // jogadores e o replay do gol do servidor são das salas comuns (a tela da partida da Oficina tem o placar e o cartão dela)
    case 'contagem': if (OFJ.on && OFJ.modo === 'rede') OFJ.contagemRede(m); else OFS.contagemPend = { ms: m.ms | 0, em: performance.now(), round: m.round }; return true;
    case 'fala': if (OFJ.on && OFJ.modo === 'rede') OFJ.falaRede(m); return true;
    case 'painel': OFS.painel = m; return true;
    case 'replay': case 'replay_votos': case 'replay_fim': return true;
    case 'left': saiuDaSala(); return true;
    case 'interrupted': return true;
    case 'error': aviso(m.message || 'Não deu certo.', 'erro'); return !(m.codigo === 'outra_aba' || m.codigo === 'sem_conta');
  }
  return false;
};
OFS.depois = function (m) {                             // (depois do jogo de sempre: o hello e a lista das salas)
  if (!m) return;
  if (m.type === 'hello') {
    HUB.eu = null;
    if (OFS.quer) {
      if (Date.now() < OFS.quer.ate) mandaSala(OFS.quer.slot >= 0 ? { type: 'join', code: OFS.quer.code, slot: OFS.quer.slot } : { type: 'join', code: OFS.quer.code, spectate: true });
      else { aviso('Não deu para voltar para a sala.', 'erro'); saiuDaSala(); }
    }
  }
  if (m.type === 'rooms' && OFI.aberta && OFI.tela === 'hub' && HUB.aba === 'comunidade' && HU.salas) { try { HU.salas(); } catch (_) {} }
  // (entrou numa sala COMUM com a Oficina aberta — o código digitado no SALA era de uma sala de sempre: a tela dela aparece)
  if (m.type === 'room' && m.room && !m.room.mapa && !OFS.tinhaSalaComum && !OFS.code && OFI.aberta && !OFJ.on) { try { if (NET49.room) { OFI.fecha(); slEntrou(); } } catch (_) {} }
};
function assumeSala(r) {
  const novo = OFS.code !== r.code;
  try { if (typeof NET49 !== 'undefined' && NET49.room) { NET49.room = null; try { slSaiu(); } catch (_) {} } } catch (_) {}   // (a sala de sempre que estava aberta saiu de cena)
  if (novo) {
    OFS.chat = (typeof SL !== 'undefined' && Array.isArray(SL.chat) ? SL.chat : []).filter(x => x && !ARB_TXT.test(x.text || '')).slice(-30);
    if (!OFI.aberta && !OFJ.on) OFS.volta = 'jogo';
    OFS.ultimoResultado = null;
  }
  OFS.code = r.code; OFS.sala = r; OFS.quer = null; OFS.entrando = 0;
  OFS.mapa = OFS.mapas.get(r.code) || null;
  if (r.rachao) { if (!rchTemCampo(r)) pedeMapaDeNovo(r.code); }   // v98: a sala do Rachão (o campo chega no rachao_sala: rachao_sala.js)
  else if (!OFS.mapa || (r.mapa && r.mapa.hash && OFS.mapa.hash !== r.mapa.hash)) pedeMapaDeNovo(r.code);
  if (OFJ.on && OFJ.modo === 'rede') { OFJ.salaMudou(r); return; }
  if (!OFI.aberta) OFI.abre('sala');
  else if (OFI.tela !== 'sala') OFI.mostra('sala');
  else pintaSala();
}
function pedeMapaDeNovo(code) {                        // (o mapa não chegou ou mudou: entrar de novo faz o servidor mandar)
  const k = 'pede:' + code; if (OFS[k] && Date.now() - OFS[k] < 4000) return; OFS[k] = Date.now();
  const r = OFS.sala, eu = r && r.members.find(x => x.id === NET49.id);
  mandaSala(eu && eu.slot >= 0 ? { type: 'join', code, slot: eu.slot } : { type: 'join', code });
}
function soltaSala() {                                 // a sala deixou de ter mapa: a tela de sempre assume (o jogo recebe a mesma mensagem)
  OFS.code = ''; OFS.sala = null; OFS.mapa = null; OFS.quer = null;
  if (OFJ.on) OFJ.sai('jogo');
  if (OFI.aberta) { OFI.aberta = false; if (OFI.raiz) OFI.raiz.hidden = true; OFI.tela = ''; try { if (!lobby.aberto) abrirLobby(); } catch (_) {} }
}
function saiuDaSala() {
  const volta = OFS.volta;
  OFS.code = ''; OFS.sala = null; OFS.mapa = null; OFS.quer = null; OFS.chat = [];
  if (OFJ.on) OFJ.sai(volta === 'editor' ? 'editor' : volta === 'jogo' ? 'jogo' : 'hub');
  else if (OFI.aberta && OFI.tela === 'sala') { if (volta === 'jogo') OFI.fecha(); else OFI.mostra(volta === 'editor' && OFE.reg ? 'editor' : 'hub'); }
}
function comecaPartida(room, resume) {
  const mp = OFS.mapas.get(room.code);
  if (!mp || (room.mapa && room.mapa.hash && mp.hash !== room.mapa.hash)) { pedeMapaDeNovo(room.code); aviso('Carregando o mapa da sala…'); return; }
  OFS.mapa = mp;
  try { OFJ.online(room, mp, resume); } catch (e) { console.error('Oficina (começar):', e); aviso('A partida não abriu neste aparelho: ' + (e && e.message || e), 'erro'); }
}
function addChat(m) {
  if (!m || ARB_TXT.test(m.text || '')) return;
  if (m.sys && m.who && m.who === NET49.id && /chegou na sala$/.test(m.text || '')) m = Object.assign({}, m, { text: 'Você chegou na sala' });
  OFS.chat.push(m); if (OFS.chat.length > 60) OFS.chat.shift();
  if (OFJ.on) OFJ.recado(m);
  if (OFI.aberta && OFI.tela === 'sala') pintaChat();
}

/* ---------------------------------------------------------------- criar, entrar e sair */
OFS.criaSala = async function (opc, volta) {
  if (OFJ.on && OFJ.modo === 'local') OFJ.sai(volta);
  if (!(await conecta())) return aviso('Sem conexão com o servidor das salas agora: jogar online precisa dele ligado.', 'erro');
  if (OFS.code && !(await confirma('Sair da sala ' + OFS.code + '?', 'Você está numa sala. Sair dela e abrir outra com este mapa?', 'ABRIR OUTRA'))) return;
  if (OFS.entrando && Date.now() - OFS.entrando < 4000) return;
  OFS.volta = volta || OFI.tela || 'hub'; OFS.entrando = Date.now();
  const m = Object.assign({ type: 'create' }, opc);    // ("type" primeiro: o servidor deixa a mensagem grande passar só assim)
  if (m.name) m.name = RM.texto(m.name, 24);
  if (!mandaSala(m)) { OFS.entrando = 0; return aviso('Não deu para falar com o servidor.', 'erro'); }
  aviso('Abrindo a sala…');
};
OFS.sai = function (sem) {
  if (!OFS.code) return saiuDaSala();
  if (conectado()) mandaSala({ type: 'leave' });
  else saiuDaSala();
  setTimeout(() => { if (OFS.code && !conectado()) saiuDaSala(); }, 2500);
};
OFS.limpa = saiuDaSala;
// a volta quando a internet cai (o servidor guarda o lugar por 90 s)
setInterval(() => {
  try {
    if (!OFS.code) return;
    if (conectado()) { if (OFS.quer && OFS.quer.pediu && Date.now() - OFS.quer.pediu > 6000) { OFS.quer.pediu = 0; } return; }
    if (!OFS.quer) {
      const r = OFS.sala, eu = r && r.members.find(x => x.id === NET49.id || x.id === OFS.euId);
      OFS.quer = { code: OFS.code, slot: eu ? eu.slot : -1, ate: Date.now() + 90000 };
      if (OFI.tela === 'sala') pintaSala();
    }
    if (Date.now() > OFS.quer.ate) { aviso('Não deu para voltar para a sala. Confira a internet.', 'erro'); saiuDaSala(); return; }
    if (typeof NET49 !== 'undefined' && !NET49.ws && Date.now() - OFS.tentaT > 3000) { OFS.tentaT = Date.now(); try { net49Connect(); } catch (_) {} }
  } catch (e) { console.error('Oficina (volta):', e); }
}, 700);
// (quem sou eu nesta sala, para a volta: o id não muda, ele vem do token)
setInterval(() => { try { if (typeof NET49 !== 'undefined' && NET49.id) OFS.euId = NET49.id; } catch (_) {} }, 1000);
// (fechar a Oficina com a sala aberta: sai da sala)
{ const fechaAntes = OFI.fecha; OFI.fecha = function () { if (OFS.code && !OFJ.on) { if (conectado()) mandaSala({ type: 'leave' }); OFS.code = ''; OFS.sala = null; OFS.mapa = null; OFS.quer = null; } return fechaAntes.apply(this, arguments); }; }

/* ---------------------------------------------------------------- a tela da sala */
const SU = {};
OFI.telas.sala = {
  monta() {
    const el = h('div.ofi-tela.ofi-sala');
    SU.nome = h('b.ofi-sala-nome'); SU.cod = h('button.ofi-codigo', { type: 'button', title: 'Copiar o código da sala', on: { click: () => { if (OFS.code) copiaAviso(OFS.code, 'Código da sala copiado'); } } }, icone('copiar'), h('b'));
    SU.mapa = h('small.ofi-sala-mapa'); SU.ajustes = botao('AJUSTES', () => ajustesSala(), 'escuro', 'campo', 'Ajustes da sala (admin)');
    SU.rankTag = h('span.ofi-rankoff-tag', { title: 'RANK OFF: as linhas da bola aparecem para todos e a partida não conta nas jogadas do mapa' }, icone('pontos'), h('b', { texto: 'RANK OFF' }));   // v95
    el.appendChild(h('div.ofi-sala-topo', botao('', () => OFI.volta(), 'ofi-voltar', 'voltar', 'Sair da sala'), h('div.ofi-sala-tit', SU.nome, SU.mapa), SU.cod, SU.rankTag, h('span.ofi-esp'), SU.ajustes,
      botao('CONVIDAR', () => convidaSala(), 'escuro', 'compartilhar', 'Mandar o código para a galera')));
    SU.times = h('div.ofi-sala-times'); SU.assiste = h('div.ofi-sala-assiste');
    SU.chatL = h('div.ofi-chat-l', { role: 'log', 'aria-live': 'polite' });
    SU.chatIn = h('input.ofi-in', { type: 'text', maxLength: 120, placeholder: 'Mensagem para a sala', autocomplete: 'off', enterKeyHint: 'send', 'aria-label': 'Mensagem para a sala' });
    SU.chatIn.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); mandaChat(); } });
    el.appendChild(h('div.ofi-sala-meio', h('div.ofi-sala-esq', SU.times, SU.assiste), h('div.ofi-sala-chat', h('div.ofi-p-tit', icone('pessoas'), h('b', { texto: 'CHAT DA SALA' })), SU.chatL, h('div.ofi-chat-in', SU.chatIn, botao('', mandaChat, 'ofi-ic-bt', 'subir', 'Mandar')))));
    SU.status = h('span.ofi-sala-status'); SU.comecar = botao('COMEÇAR', () => mandaSala({ type: 'start' }), 'ama ofi-sala-comecar', 'play');
    SU.bots = botao('', () => { const r = OFS.sala; if (r) mandaSala({ type: 'config', bots: !r.bots }); }, 'escuro', 'bot');
    SU.rank = botao('', () => { const r = OFS.sala; if (r) mandaSala({ type: 'config', rankOff: !r.rankOff }); }, 'escuro ofi-rankoff', 'pontos', 'RANK OFF: as linhas da bola para todos (só o admin muda, fora da partida)');   // v95
    el.appendChild(h('div.ofi-sala-base', SU.status, h('span.ofi-esp'), SU.rank, SU.bots, SU.comecar));
    return el;
  },
  abre() { pintaSala(); },
  async volta() {
    if (!OFS.code) { OFI.mostra(OFS.volta === 'editor' && OFE.reg ? 'editor' : 'hub'); return; }
    if (await confirma('Sair da sala?', 'Você sai da sala ' + OFS.code + (OFS.sala && OFS.sala.admin === NET49.id ? ' (o admin passa para outra pessoa).' : '.'), 'SAIR', 'verm')) OFS.sai();
  },
};
function pintaSala() {
  if (!SU.times) return;
  const r = OFS.sala, eu = NET49.id;
  if (!r) { SU.nome.textContent = OFS.entrando ? 'Abrindo a sala…' : 'Sem sala'; limpaFilhos(SU.times); return; }
  const mp = OFS.mapa, M = mp && mp.mapa, info = r.mapa || {}, E = r.E || 2, n = r.n, admin = r.admin === eu, meu = r.roster.indexOf(eu);
  const T = M ? M.partida.times : Array.from({ length: E }, (_, t) => ({ nome: NOME_TIME(t), cor: RM.CORES_EQUIPE[t] }));
  SU.nome.textContent = r.name; SU.cod.querySelector('b').textContent = r.code;
  const fis = resumoFisicaSala(info);
  const linhasMapa = !!(M && M.partida && M.partida.linhas);   // v95: o criador do mapa ligou as linhas para todos
  SU.mapa.textContent = '«' + (info.nome || (M && M.nome) || 'mapa') + '»' + (info.autor ? ' por ' + info.autor : '') + (info.codigo ? ' · ' + info.codigo : info.rascunho ? ' · rascunho' : '') + ' · ' + E + ' times de ' + n + (r.pub ? ' · aberta' : ' · fechada') + (fis ? ' · física da sala: ' + fis : '') + (linhasMapa ? ' · linhas da bola do mapa' : r.rankOff ? ' · RANK OFF' : '');
  if (SU.rankTag) {                                     // v95: RANK OFF (o curador ligou) ou LINHAS (o mapa já tem, para todos)
    SU.rankTag.hidden = !r.rankOff && !linhasMapa;
    SU.rankTag.querySelector('b').textContent = linhasMapa ? 'LINHAS' : 'RANK OFF';
    SU.rankTag.title = linhasMapa ? 'As linhas da bola aparecem para todos: o criador do mapa ligou (a partida conta normal)' : 'RANK OFF: as linhas da bola aparecem para todos e a partida não conta nas jogadas do mapa';
  }
  SU.mapa.title = SU.mapa.textContent;
  SU.ajustes.hidden = !admin;
  limpaFilhos(SU.times);
  SU.times.style.setProperty('--n', String(E)); SU.times.classList.toggle('muitos', E > 2);
  const jogando = r.state === 'playing';
  for (let t = 0; t < E; t++) {
    const lista = h('div.ofi-time-l');
    for (let k = 0; k < n; k++) {
      const id = r.roster[t * n + k], m = id && r.members.find(x => x.id === id);
      const el = m ? chipMembro(m, r, admin) : h('div.ofi-vaga' + (r.bots ? '.bot' : ''), icone(r.bots ? 'bot' : 'adicionar'), h('span', { texto: r.bots ? 'BOT' : 'vaga livre' }));
      if (M && M.partida.goleiro && n >= 3 && k === n - 1) el.appendChild(h('span.ofi-gk', { texto: 'GOLEIRO', title: 'Esta vaga joga no gol (as regras do goleiro do mapa valem para ela)' }));
      lista.appendChild(el);
    }
    const dentro = meu >= 0 && Math.floor(meu / n) === t;
    SU.times.appendChild(h('div.ofi-time-c' + (dentro ? '.meu' : ''), { style: { '--c': T[t] ? T[t].cor : '#fff' } },
      h('div.ofi-time-cab', h('i'), h('b', { texto: T[t] ? T[t].nome : NOME_TIME(t) }), h('small', { texto: r.roster.slice(t * n, t * n + n).filter(Boolean).length + '/' + n }),
        !dentro && !jogando ? botao('ENTRAR', () => mandaSala({ type: 'seat', team: t }), 'ama') : null), lista));
  }
  const vendo = r.members.filter(x => x.slot < 0);
  limpaFilhos(SU.assiste);
  poe(SU.assiste, h('div.ofi-p-tit', icone('olho'), h('b', { texto: 'ASSISTINDO (' + vendo.length + ')' })), h('div.ofi-assiste-l', ...vendo.map(m => chipMembro(m, r, admin))),
    meu >= 0 && !jogando ? botao('SÓ ASSISTIR', () => mandaSala({ type: 'seat', slot: -1 }), 'escuro', 'olho') : null);
  // a base: começar (o admin) ou esperar
  const ninguem = !r.roster.some(Boolean);
  SU.comecar.hidden = !admin || jogando; SU.comecar.disabled = ninguem || !M;
  SU.bots.hidden = !admin || jogando;
  let sp = SU.bots.querySelector('span'); if (!sp) { sp = h('span'); SU.bots.appendChild(sp); }
  sp.textContent = r.bots ? 'BOTS: SIM' : 'BOTS: NÃO'; SU.bots.classList.toggle('on', !!r.bots);
  if (SU.rank) {                                       // v95: o RANK OFF (as linhas da bola para todos) — só o curador (o admin) muda; o mapa com as linhas já ligadas não precisa
    SU.rank.hidden = !admin || jogando || !!(M && M.partida && M.partida.linhas);
    let sr = SU.rank.querySelector('span'); if (!sr) { sr = h('span'); SU.rank.appendChild(sr); }
    sr.textContent = r.rankOff ? 'RANK OFF: SIM' : 'RANK OFF: NÃO'; SU.rank.classList.toggle('on', !!r.rankOff); SU.rank.setAttribute('aria-pressed', String(!!r.rankOff));
  }
  SU.status.textContent = OFS.quer ? 'Reconectando…' : !M ? 'Carregando o mapa…' : jogando ? 'A partida está rolando.' : admin ? (ninguem ? 'Entre num time (ou chame a galera) para começar.' : r.bots ? 'As vagas vazias viram bots.' : 'As vagas vazias ficam vazias (bots desligados).') : 'Esperando o admin começar.';
  if (r.state === 'ended' && OFS.ultimoResultado) SU.status.textContent += ' Última: ' + (OFS.ultimoResultado.score || []).join(' × ');
  pintaChat();
}
function chipMembro(m, r, admin) {
  const eu = m.id === NET49.id, adm = r.admin === m.id;
  const b = h('button.ofi-membro' + (eu ? '.eu' : ''), { type: 'button', title: m.name, on: { click: () => { if (admin && !eu) acoesMembro(m, r); } } },
    adm ? icone('trofeu', 'ofi-coroa') : null, h('span', { texto: m.name + (eu ? ' (você)' : '') }));
  if (!admin || eu) b.classList.add('so-ver');
  return b;
}
function acoesMembro(m, r) {
  const M = OFS.mapa && OFS.mapa.mapa, E = r.E || 2;
  janela(m.name, (c, ctx) => {
    const it = (ic, t, f, cls) => c.appendChild(h('button.ofi-item' + (cls ? '.' + cls : ''), { type: 'button', on: { click: () => { ctx.fecha(null); f(); } } }, icone(ic), h('span', h('b', { texto: t }))));
    if (r.state !== 'playing') for (let t = 0; t < E; t++) it('pessoas', 'MOVER PARA ' + String(M ? M.partida.times[t].nome : NOME_TIME(t)).toUpperCase(), () => mandaSala({ type: 'seat', id: m.id, team: t }));
    if (r.state !== 'playing' && m.slot >= 0) it('olho', 'SÓ ASSISTIR', () => mandaSala({ type: 'seat', id: m.id, slot: -1 }));
    it('trofeu', 'PASSAR O ADMIN', () => mandaSala({ type: 'promote', id: m.id }));
    it('fechar', 'TIRAR DA SALA', () => mandaSala({ type: 'kick', id: m.id }), 'perigo');
  }, [], 'ofi-menu');
}
function pintaChat() {
  if (!SU.chatL) return;
  limpaFilhos(SU.chatL);
  for (const m of OFS.chat.slice(-40)) SU.chatL.appendChild(m.sys ? h('div.ofi-chat-m.sys', { texto: m.text }) : h('div.ofi-chat-m' + (m.id === NET49.id ? '.eu' : ''), h('b', { texto: (m.name || 'Jogador') + ': ' }), h('span', { texto: m.text })));
  SU.chatL.scrollTop = SU.chatL.scrollHeight;
}
function mandaChat() {
  const t = SU.chatIn.value.trim(); if (!t) return;
  if (!mandaSala({ type: 'say', text: t.slice(0, 120) })) return aviso('Sem conexão agora.', 'erro');
  SU.chatIn.value = '';
}
async function convidaSala() {
  if (!OFS.code) return;
  let link = '';
  try { const u = new URL(location.href); u.search = ''; u.hash = ''; u.searchParams.set('sala', OFS.code); link = u.href; } catch (_) {}
  const t = 'Bora jogar no meu mapa da Oficina do RACHA! Sala ' + OFS.code + (link ? ': ' + link : '');
  if (navigator.share) { try { await navigator.share({ title: 'RACHA · sala ' + OFS.code, text: t, url: link || undefined }); return; } catch (_) {} }
  copiaAviso(OFS.code, 'Código da sala copiado');
}
function ajustesSala() {
  const r = OFS.sala; if (!r || r.admin !== NET49.id) return;
  const info = r.mapa || {}, M = OFS.mapa && OFS.mapa.mapa, jogando = r.state === 'playing';
  let n = r.n, bots = r.bots, pub = r.pub, nome, rankOff = !!r.rankOff;
  const est = { f: info.fisicaSala ? JSON.parse(JSON.stringify(info.fisicaSala)) : null, base: info.fisicaMapa || (M && M.fisica) || { preset: 'classico', perfil: {}, extra: {}, colideParedes: true } };
  janela('Ajustes da sala', (c, ctx) => {
    nome = h('input.ofi-in', { type: 'text', maxLength: 24, value: r.name });
    const por = []; for (let i = info.porMin || 1; i <= (info.porMax || r.n); i++) por.push([i, String(i)]);
    poe(c, fLinha('Nome da sala', nome), por.length > 1 ? fSel('Jogadores por time', n, por, v => { n = v; }) : null,
      fBool('Bots completam as vagas', bots, v => { bots = v; }),
      info.privado ? fNota('O mapa é privado (ou um rascunho): a sala fica fechada, só entra quem tem o código.') : fBool('Sala aberta (aparece na lista de salas)', pub, v => { pub = v; }),
      M && M.partida && M.partida.linhas ? fNota('Linhas da bola: o mapa já mostra para todos (o criador ligou no editor; a partida conta normal).')
        : jogando ? fNota('RANK OFF: ' + (rankOff ? 'ligado' : 'desligado') + ' (muda só entre as partidas).') : fBool('RANK OFF · as linhas da bola para todos (não conta nas jogadas do mapa)', rankOff, v => { rankOff = v; }));   // v95
    const fc = h('div.ofi-fis-sala'); c.appendChild(fc);
    if (jogando) poe(fc, fTit('Física da sala', 'fisica'), fNota('A física muda só entre as partidas (agora: ' + (resumoFisicaSala(info) || 'a do mapa') + ').'));
    else fisicaSalaCampos(fc, est, M);
    poe(c, fBotoes(botao('TROCAR O MAPA', () => { ctx.fecha(null); trocaMapa(); }, 'escuro', 'mapa'),
      botao('VOLTAR PARA OS CAMPOS DO RACHA', async () => { ctx.fecha(null); if (await confirma('Voltar para os campos do RACHA?', 'A sala deixa o mapa da Oficina e volta a ser uma sala comum (2 times).', 'VOLTAR')) mandaSala({ type: 'config', semMapa: true }); }, 'escuro', 'campo')));
  }, [{ rot: 'CANCELAR', v: null, cls: 'escuro' }, { rot: 'SALVAR', cls: 'ama', valor: () => true }], 'ofi-jan-larga ofi-jan-sala').then(ok => {
    if (!ok) return;
    const m = { type: 'config', bots, name: nome.value };
    if (n !== r.n) m.n = n; if (!info.privado) m.pub = pub;
    if (!jogando && rankOff !== !!r.rankOff) m.rankOff = rankOff;   // v95
    if (!jogando && JSON.stringify(est.f || null) !== JSON.stringify(info.fisicaSala || null)) m.fisicaSala = est.f;   // (só quando mudou: o mapa vai de novo para todo mundo)
    mandaSala(m);
  });
}
async function trocaMapa() {
  const regs = (await GAVETA.todos('mapas')).sort((a, b) => (b.editado || 0) - (a.editado || 0)).slice(0, 30);
  const x = await janela('Trocar o mapa da sala', (c, ctx) => {
    const cod = h('input.ofi-in', { type: 'text', maxLength: 9, placeholder: 'Código de um mapa publicado (7 letras)', autocomplete: 'off' });
    poe(c, h('div.ofi-f', h('label.ofi-f-rot', { texto: 'Publicado' }), h('div.ofi-f-val', cod, botao('USAR', () => { const v = cod.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); if (v.length !== 7) return aviso('O código do mapa tem 7 letras e números.'); ctx.fecha({ mapa: { codigo: v } }); }, 'ama'))),
      h('div.ofi-sep', { texto: 'DOS SEUS MAPAS (A SALA FICA FECHADA COM UM RASCUNHO)' }));
    for (const reg of regs) c.appendChild(h('button.ofi-item', { type: 'button', on: { click: () => ctx.fecha(reg.remoto && !reg.sujo ? { mapa: { id: reg.remoto.id } } : { mapaDados: reg.mapa }) } }, icone(reg.remoto ? 'nuvem' : 'lapis'),
      h('span', h('b', { texto: reg.nome }), h('small', { texto: (reg.remoto ? 'publicado ' + reg.remoto.codigo + (reg.sujo ? ' (vai o rascunho, com as mudanças)' : '') : 'rascunho') + ' · ' + reg.mapa.partida.equipes + ' times' }))));
  }, [{ rot: 'CANCELAR', v: null, cls: 'escuro' }]);
  if (!x) return;
  if (x.mapaDados) { const l = RM.limpa(x.mapaDados); if (!l.ok) return aviso('O mapa tem problemas: ' + (l.erros || []).slice(0, 2).join(' · '), 'erro'); x.mapaDados = l.mapa; x.n = l.mapa.partida.porTime; }
  mandaSala(Object.assign({ type: 'config' }, x));
}

/* ---------------------------------------------------------------- a FÍSICA DA SALA (no CRIAR SALA e nos AJUSTES do admin)
   Os números aparecem em % do RACHA de sempre (100% = o Clássico, a física oficial) e vão cortados nos limites do núcleo
   (o servidor corta de novo). est = {f: a física da sala (null = a do mapa), base: a física do mapa}. */
const FIS_SALA = [
  ['Bola', 'bola', [['rBola', 'Tamanho da bola'], ['limiteBola', 'Velocidade máxima'], ['fatorBola', 'Deslize no chão'], ['massaBola', 'Peso da bola'], ['quiqueParede', 'Quique nas paredes']]],
  ['Chute', 'raio', [['forcaChute', 'Força do chute'], ['forcaPasse', 'Força do passe'], ['raioChute', 'Alcance do chute'], ['giroCurva', 'Efeito da curva', 1]]],
  ['Tampinhas', 'pessoas', [['velJog', 'Velocidade'], ['acelJog', 'Aceleração', 1], ['freioJog', 'Deslize', 1], ['rJog', 'Tamanho'], ['massaJog', 'Peso']]]];
const N_FIS_CURTO = { rBola: 'bola', limiteBola: 'velocidade da bola', fatorBola: 'deslize', massaBola: 'peso da bola', quiqueParede: 'quique', forcaChute: 'chute', forcaPasse: 'passe',
  raioChute: 'alcance', giroCurva: 'curva', velJog: 'tampinhas', acelJog: 'aceleração', freioJog: 'deslize das tampinhas', rJog: 'tamanho das tampinhas', massaJog: 'peso das tampinhas' };
const fisPadrao = (k, extra) => extra ? RM.EXTRA_PADRAO[k] : RN.PERFIL_V92[k];
const deslizeDe = f => (1 - RN.PERFIL_V92.fatorBola) / Math.max(1e-6, 1 - f) * 100;   // (quanto a bola anda solta, em % da do RACHA)
const fatorDoDeslize = p => 1 - (1 - RN.PERFIL_V92.fatorBola) * 100 / Math.max(1e-6, p);
// (o deslize das tampinhas não tem "% do RACHA": o de sempre é 0, para na hora — vai de 0% a 100%, ver deslizeJogDe)
const pctFisica = (R, k, extra) => k === 'fatorBola' ? deslizeDe(R.perfil.fatorBola) : k === 'freioJog' ? deslizeJogDe(R.extra.freioJog)
  : (extra ? R.extra[k] : R.perfil[k]) / fisPadrao(k, extra) * 100;
// u: quanto a bola anda solta depois de um CHUTE forte (sem bater em nada) — a mesma conta do motor (o alcance com o freio do campo)
function alcanceChute(R) { const v = Math.min(R.perfil.forcaChute * (R.extra.massaChute || 1) / R.perfil.massaBola, R.perfil.limiteBola); return v / (1 - R.perfil.fatorBola) / RN.TPS; }
// "Rápido" ou "bola 150%, chute 120%" (o que a sala mudou em relação ao mapa) — '' = a do mapa
function resumoFisicaSala(info) {
  const f = info && info.fisicaSala; if (!f) return '';
  if (f.preset !== 'personalizado' && RM.PRESETS[f.preset]) return RM.PRESETS[f.preset].nome;
  const R = RM.fisicaResolvida(f), B = RM.fisicaResolvida(info.fisicaMapa || {}), dif = [];
  if (PONTE) {                                          // v97: as partes do Rachão ("bola do Rachão", "a do Rachão")
    const ps = PONTE.PARTES.filter(p => PONTE.qualRacha(R.perfil, R.extra, p) === 'rachao');
    if (ps.length === 3) return 'a do Rachão';
    if (ps.length) return listaPartes(ps.map(p => ({ bola: 'bola', jogador: 'tampinha', chute: 'chute' })[p])) + ' do Rachão';
  }
  for (const [k, , extra] of FIS_SALA.flatMap(g => g[2])) if (Math.abs(pctFisica(R, k, extra) - pctFisica(B, k, extra)) >= 0.5) dif.push(N_FIS_CURTO[k] + ' ' + Math.round(pctFisica(R, k, extra)) + '%');
  return dif.length ? dif.slice(0, 4).join(', ') + (dif.length > 4 ? '…' : '') : 'personalizada';
}
function fisicaSalaCampos(c, est, M) {
  const pinta = () => {
    limpaFilhos(c);
    const R = RM.fisicaResolvida(est.f || est.base);
    const seg = h('div.ofi-seg.quebra.ofi-fis-pre', { role: 'group', 'aria-label': 'Predefinição da física da sala' });
    const marca = () => { const id = est.f ? est.f.preset : ''; for (const b of seg.children) { b.classList.toggle('on', b.dataset.p === id); if (b.dataset.p === 'personalizado') b.hidden = id !== 'personalizado'; } };
    seg.appendChild(comDados(botao('Do mapa', () => { est.f = null; pinta(); }, 'ofi-seg-bt'), { p: '' }));
    for (const [id, p] of Object.entries(RM.PRESETS)) if (id !== 'personalizado') seg.appendChild(comDados(botao(p.nome, () => { est.f = { preset: id, perfil: {}, extra: {}, colideParedes: R.colideParedes }; pinta(); }, 'ofi-seg-bt'), { p: id }));
    seg.appendChild(comDados(h('span.ofi-seg-bt.so', { texto: 'Personalizada', title: 'Mexa nos números abaixo' }), { p: 'personalizado' }));
    // como fica: a tampinha e a bola no tamanho da sala, e até onde vai um chute forte
    const tela = h('canvas.ofi-fis-amostra', { width: 240, height: 84, 'aria-hidden': 'true' }), txt = h('small.ofi-fis-txt');
    const amostra = () => {
      const Rx = RM.fisicaResolvida(est.f || est.base);
      try {
        const g = tela.getContext('2d'), A = (M && M.aparencia) || {}, k = 9;
        g.clearRect(0, 0, 240, 84); g.fillStyle = A.cor1 || '#2f8f4e'; g.fillRect(0, 0, 240, 84); g.fillStyle = A.cor2 || '#2a8045'; for (let x = 0; x < 240; x += 40) g.fillRect(x, 0, 20, 84);
        const rj = Rx.perfil.rJog * k, rb = Rx.perfil.rBola * k, cx = 18 + rj * 1.2, cy = 46;
        DES.jogador(g, M || { partida: { times: [{ cor: RM.CORES_EQUIPE[0] }] } }, { time: 0, i: 0 }, cx, cy, rj, k, false);
        DES.bola(g, cx + rj + rb + 2, cy, rb, M || {});
        // o alcance do chute (pontilhado: até onde a bola vai solta, na mesma escala dos 240 px = 26 u)
        const d = alcanceChute(Rx), x0 = cx + rj + rb * 2 + 6, x1 = Math.min(236, x0 + d * k * 0.25);
        g.save(); g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 2.5; g.setLineDash([5, 5]); g.beginPath(); g.moveTo(x0, cy); g.lineTo(x1, cy); g.stroke(); g.restore();
      } catch (_) {}
      const campo = M && M.campo ? Math.round(M.campo.w) : 0, d = alcanceChute(Rx), dz = deslizeJogU(Rx), ef = alcanceValendo(Rx);
      txt.textContent = 'Tampinha Ø ' + fmtU(Rx.perfil.rJog * 2) + ' u · bola Ø ' + fmtU(Rx.perfil.rBola * 2) + ' u · o chute forte anda ~' + Math.round(d) + ' u solto' + (campo ? ' (o campo tem ' + campo + ' u)' : '') + ' (o pontilhado: ¼ da escala)'
        + (dz > 0.05 ? ' · solta, a tampinha desliza ~' + fmtU(dz) + ' u' : '')
        + (ef > Rx.perfil.raioChute + 1e-6 ? ' · o alcance acompanha o tamanho (' + fmtU(ef) + ' u)' : '');
      marca();
    };
    let mist = null;                                  // v97: o MISTURAR COM O RACHÃO (refeito no lugar quando um número muda)
    const misturaGr = () => { const gr = h('div.ofi-fis-gr.ofi-fis-mistura'); poe(gr, fTit('Misturar com o Rachão', 'rachao'), ...misturaRachao(RM.fisicaResolvida(est.f || est.base), (parte, jogo) => { est.f = fisicaMisturada(est.f || est.base, parte, jogo); pinta(); }), fNota(NOTA_MISTURA)); return gr; };
    const set = (k, extra) => (v, final) => {
      if (!est.f || est.f.preset !== 'personalizado') { const Rr = RM.fisicaResolvida(est.f || est.base); est.f = { preset: 'personalizado', perfil: Object.fromEntries(RM.PERFIL_CAMPOS.map(x => [x, Rr.perfil[x]])), extra: Object.assign({}, Rr.extra), colideParedes: Rr.colideParedes }; }
      if (extra) est.f.extra[k] = arred(v, 1e4); else est.f.perfil[k] = arred(v, 1e4);
      amostra();
      if (final) { try { som.clique(); } catch (_) {} if (mist) { const n = misturaGr(); mist.replaceWith(n); mist = n; } }
    };
    const linha = ([k, nome, extra]) => {
      if (k === 'fatorBola') {
        const L = RN.LIMITES.fatorBola;
        return fNum(nome, deslizeDe(R.perfil.fatorBola), { min: deslizeDe(L[0]), max: deslizeDe(L[1]), passo: 1, un: '%', casas: 0 }, (v, f) => set('fatorBola')(clamp(fatorDoDeslize(v), L[0], L[1]), f));
      }
      if (k === 'freioJog')                           // v95: 0% = para na hora (o RACHA de sempre) · 100% = desliza o máximo
        return fNum(nome, deslizeJogDe(R.extra.freioJog), { min: 0, max: 100, passo: 1, un: '%', casas: 0 }, (v, f) => set('freioJog', 1)(freioDoDeslizeJog(v), f));
      const L = extra ? RM.EXTRA_LIM[k] : RN.LIMITES[k], base = fisPadrao(k, extra);
      return fNum(nome, extra ? R.extra[k] : R.perfil[k], { min: L[0], max: L[1], passo: base / 100, un: '%', fator: 100 / base, casas: 0 }, set(k, extra));
    };
    poe(c, fTit('Física da sala', 'fisica'), fNota('Vale só nesta sala (o mapa não muda). 100% = o RACHA de sempre (no deslize das tampinhas, 0% = param na hora, como sempre). A ranqueada e as salas comuns continuam com a física oficial.'),
      fLinha('Predefinição', seg), h('div.ofi-fis-ver', tela, txt));
    if (PONTE) { mist = misturaGr(); c.appendChild(mist); }   // v97
    for (const [tit, ic, campos] of FIS_SALA) { const gr = h('div.ofi-fis-gr'); poe(gr, fTit(tit, ic), ...campos.map(linha)); c.appendChild(gr); }
    if (est.f) c.appendChild(fBotoes(botao('VOLTAR PARA A DO MAPA', () => { est.f = null; pinta(); }, 'escuro', 'girar')));
    amostra();
  };
  pinta();
  return pinta;
}
const fmtU = v => String(Math.round(v * 10) / 10).replace('.', ',');
const listaPartes = l => l.length < 2 ? l.join('') : l.slice(0, -1).join(', ') + ' e ' + l[l.length - 1];   // v97

/* ---------------------------------------------------------------- CRIAR SALA (o JOGAR dos mapas: os ajustes antes de abrir)
   o = {ref: {id}|{codigo} (publicado) | M (o rascunho, vai inteiro: sala fechada), meta (do catálogo), nome, volta} */
async function criaSalaDialogo(o) {
  o = o || {};
  let M = o.M || null, meta = o.meta || null;
  if (!M && o.ref) { aviso('Abrindo o mapa…'); const b = await baixaMapa(o.ref); if (!b) return; M = b.mapa; meta = Object.assign({}, b.meta, meta && meta.thumb ? { thumb: meta.thumb } : {}); }
  if (!M) return;
  const P = M.partida, rascunho = !o.ref, privado = rascunho || (meta && (meta.visibilidade === 'privado' || meta.estado !== 'ok'));
  let n = P.porTime, bots = P.bots !== false, pub = !privado && (!meta || meta.visibilidade === 'publico'), nome, rankOff = false;
  const est = { f: null, base: M.fisica };
  const ok = await janela('Criar sala', c => {
    nome = h('input.ofi-in', { type: 'text', maxLength: 24, value: RM.texto(o.nome || (meta && meta.nome) || M.nome, 24), autocomplete: 'off', 'aria-label': 'Nome da sala' });
    const dir = h('div.ofi-cria-sala-dir.ofi-fis-sala');
    const por = []; for (let i = P.porMin || 1; i <= (P.porMax || P.porTime); i++) por.push([i, String(i)]);
    const thumb = (meta && meta.thumb) || DES.miniatura(M, 320, 180);
    poe(c, h('div.ofi-cria-sala',
      h('div.ofi-cria-sala-esq', h('div.ofi-pub-img', imgMapa(thumb)),
        h('div.ofi-cria-sala-mapa', h('b', { texto: M.nome }), h('small', { texto: (meta ? 'por ' + meta.autor + ' · ' + meta.codigo : 'rascunho deste aparelho') + ' · ' + P.equipes + ' times' })),
        meta ? h('div.ofi-stats', h('span', icone('play'), fmt(meta.jogos)), h('span', icone('coracao'), fmt(meta.curtidas)), h('span', icone('estrela'), fmt(meta.favoritos))) : null,
        fLinha('Nome da sala', nome), por.length > 1 ? fSel('Jogadores por time', n, por, v => { n = v; }) : null,
        fBool('Bots completam as vagas', bots, v => { bots = v; }),
        privado ? fNota(rascunho ? 'Rascunho: a sala fica fechada (só entra quem tem o código).' : 'O mapa é privado: a sala fica fechada (só entra quem tem o código).') : fBool('Sala aberta (aparece na lista de salas)', pub, v => { pub = v; }),
        P.linhas ? fNota('Linhas da bola: o mapa já mostra para todos (o criador ligou no editor; a partida conta normal).')
          : fBool('RANK OFF · as linhas da bola para todos (não conta nas jogadas do mapa)', rankOff, v => { rankOff = v; })),   // v95
      dir));
    fisicaSalaCampos(dir, est, M);                    // (a física da sala: do lado direito, no celular embaixo)
  }, [{ rot: 'CANCELAR', v: null, cls: 'escuro' }, { rot: 'CRIAR SALA', cls: 'ama', ic: 'play', valor: () => true }], 'ofi-jan-larga ofi-jan-sala');
  if (!ok) return;
  const m = Object.assign(o.ref ? { mapa: o.ref } : { mapaDados: M }, { pub: !privado && pub, bots, n, name: nome.value });
  if (est.f) m.fisicaSala = est.f;
  if (rankOff) m.rankOff = true;                      // v95: as linhas da bola (pontinhos) para todos na sala
  return OFS.criaSala(m, o.volta || OFI.tela || 'hub');
}

/* ---------------------------------------------------------------- a lista de salas do GALERA (as salas com mapa) */
try {
  const linhaAntes = sbLinha;
  sbLinha = function (s) {
    const d = linhaAntes.apply(this, arguments);
    try {
      if (s && s.mapa) {
        const sm = d.querySelector('small'); if (sm) sm.textContent = 'MAPA «' + s.mapa.nome + '» por ' + s.mapa.autor + ' · ' + (s.E || 2) + ' times de ' + s.n + (s.bots ? ' · com bots' : '') + (s.mapa.fisica ? ' · física da sala' : '') + (s.rankOff ? ' · RANK OFF' : '');
        const h2 = d.querySelector('b'); if (h2) h2.appendChild(Object.assign(document.createElement('i'), { className: 'sb-ofi ofi-tag-lista', textContent: 'OFICINA' }));
      }
    } catch (_) {}
    return d;
  };
} catch (e) { console.error('Oficina: sbLinha', e); }
try {
  const rapidoAntes = slRapido;
  slRapido = function () { const l = SL.lista; SL.lista = (l || []).filter(s => !s.mapa); try { return rapidoAntes.apply(this, arguments); } finally { SL.lista = l; } };
} catch (e) { console.error('Oficina: slRapido', e); }

/* ---------------------------------------------------------------- tudo carregou: os ganchos no jogo (base.js) */
// (as peças por dentro, para os testes automáticos e para depurar no console: OFI.interno)
OFI.interno = { OFE, OFJ, OFS, HUB, GAVETA, DES, MODELOS, TAMANHOS, FORMATOS, REDE, EDU, SU, HU, novoRascunho, editorAbre, editorSai, salvaRascunho, recompila, muda, desfaz, refaz,
  poeObjeto, usaBiblioteca, BIBLIOTECA, escolheFerr, duplica, exclui, copia, cola, gira, espelha, agrupa, desagrupa, bloqueia, oculta, alinha, distribui, ordem, geraSpawns, painelAtualiza,
  publicaDialogo, duplicaRascunho, mapaDoZero, limpaModelo, mudaAba, carregaAba, pede, conecta, mandaSala, janela, telaParaMundo, mundoParaTela, uParaMundo, porId,
  edAjusta, zoomEm, contornoMundo, caixaObj, objetoNoPonto, alcas, criaDialogo, detalhesMapa, quemSou, ofjResultado,
  edEstado, simNova, lancaBola, lancaPara, miraVel, miraPrevia, medidaTexto, guiasDoMove, copiaOutroLado, repeteSel, repeteDialogo, espelhaObjX, tremeu,
  criaSalaDialogo, fisicaSalaCampos, resumoFisicaSala, alcanceChute, deslizeDe, fatorDoDeslize, FIS_SALA, ajustesSala, jogaPublicado, configuraDialogo, cartaoRemoto, abaLocais,
  ofjSimRoda, ofjLinhas, ofjExtrapola, ofjCraque, ofjPessoa, ofjCartaoNovo, ofjContagem, statsMapa, cotaPublicos, limitePublicosCheio,
  ofjRankOff, ofjLinhasDoMapa, ofjComLinhas, painelRefaz, OFP, deslizeJogDe, freioDoDeslizeJog, deslizeJogU, alcanceValendo, pctFisica };   // (v95)
ofiLigaGanchos();
