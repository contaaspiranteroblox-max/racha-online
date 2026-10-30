/* =====================================================================================================================
   RACHA v98 · A SALA ONLINE DO RACHÃO NA OFICINA (tools/oficina/rachao_sala.js)
   O pedido: "Deixe separado o racha e o rachão, os caras podem escolher criar modo racha ou rachão, porém dá pra criar sala
   de rachão também on-line". A sala do Rachão é uma sala do servidor das salas (como as salas com mapa): o servidor joga a
   partida com o motor do Rachão (server/partida/rachao.js) e a Oficina faz a ponte com a página do Rachão (a moldura):
     · o hello diz que este aparelho conhece as salas do Rachão (rch: 1): a página antiga guardada num aparelho não entra;
     · CRIAR SALA, ENTRAR COM O CÓDIGO e os AJUSTES do admin vêm da tela do Rachão (o campo com a miniatura, as opções) e
       viram as mensagens de sempre da sala (create, join, config) pela conexão do jogo (NET49);
     · a TELA DA SALA é a da Oficina (os times Vermelho × Azul, quem assiste, o chat, convidar, os bots, começar), com o
       campo e as opções do Rachão;
     · no COMEÇAR, a moldura do Rachão abre por cima com a partida: os quadros do servidor (rq) e a contagem vão para ela, e
       os comandos dela vão para o servidor (input). VOLTAR PARA A SALA, no fim, fecha a moldura; fechada no meio, a tela da
       sala oferece VOLTAR PARA A PARTIDA;
     · a aba SALAS ONLINE do modo RACHÃO (as salas abertas do Rachão, criar e entrar) e a etiqueta RACHÃO na lista de salas.
   Toda mensagem da moldura passa por aqui conferida (só a moldura do Rachão, do mesmo endereço; só os campos esperados).
   ===================================================================================================================== */
IC.tampinha = '<circle cx="12" cy="12" r="8.4" fill="none" stroke="currentColor" stroke-width="2.4"/><circle cx="12" cy="12" r="8.4" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="1.6 1.9"/><circle cx="12" cy="12" r="3.6" fill="currentColor"/>';
IC.online = '<circle cx="12" cy="12" r="8.6" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M3.5 12h17M12 3.4c-3.2 3.4-3.2 13.8 0 17.2M12 3.4c3.2 3.4 3.2 13.8 0 17.2" fill="none" stroke="currentColor" stroke-width="1.8"/>';
const RSL = { campos: new Map(), fila: [], partida: null, pendente: null, ultimo: null, esperando: 0, srv: false, ult: null };   // (ult: o último comando que foi para o servidor nesta partida)   // (esperando: a tela do Rachão pediu para criar ou entrar; srv: o servidor conectado tem as salas do Rachão)
const TIMES_RCH = [{ nome: 'Vermelho', cor: '#e23d28' }, { nome: 'Azul', cor: '#2563c9' }];
const ehRachao = r => !!(r && r.rachao && r.rachao.info);

/* ---------------------------------------------------------------- 1) o hello e a moldura */
try { const antes = v70HelloExtra; v70HelloExtra = function () { const o = antes.apply(this, arguments) || {}; o.rch = 1; return o; }; }
catch (e) { console.error('Oficina: o hello do Rachão', e); }
const ALVO_RCH = () => location.origin && location.origin !== 'null' ? location.origin : '*';
function rchManda(o) {                                 // para a página do Rachão (com fila até a moldura avisar que está pronta)
  if (RCH.fr && RCH.pronto) { try { RCH.fr.contentWindow.postMessage(Object.assign({ oficina: 'rede' }, o), ALVO_RCH()); return true; } catch (_) { return false; } }
  if (o.t === 'q') return false;                       // (os quadros não esperam: o próximo chega em 33 ms)
  RSL.fila.push(o); if (RSL.fila.length > 12) RSL.fila.shift();
  return false;
}
window.addEventListener('message', e => {              // (só a moldura do Rachão, do mesmo endereço)
  if (!RCH.fr || e.source !== RCH.fr.contentWindow) return;
  if (location.origin !== 'null' && e.origin !== location.origin) return;
  const d = e.data; if (!d || typeof d !== 'object') return;
  if (d.rachao === 'pronto') { const f = RSL.fila.splice(0); for (const o of f) rchManda(o); return; }
  if (d.rachao !== 'rede' || typeof d.t !== 'string') return;
  try {
    switch (d.t) {
      case 'cmd': return rchComando(d.c);
      case 'criar': return rchCria(d);
      case 'ajustes': return rchAjusta(d);
      case 'entrar': return rchEntra(d.code);
      case 'sala': return rchVoltaSala();
      case 'sair': return rchSai();
      case 'erro': return aviso(String(d.msg || 'Não deu certo.').slice(0, 140), 'erro');
    }
  } catch (err) { console.error('Oficina (sala do Rachão):', err); }
});
const semServidorTx = () => temServidor() ? 'Sem conexão com o servidor das salas agora. Tente de novo daqui a pouco.'
  : 'O online do Rachão precisa do servidor das salas: nesta versão ele está desligado (o resto do Rachão funciona).';
const SRV_VELHO_TX = 'O servidor das salas ainda não tem as salas do Rachão: ele precisa ser atualizado (o resto do Rachão funciona).';

/* ---------------------------------------------------------------- 2) os pedidos da tela do Rachão */
function rchComando(c) {                               // o comando de cada passo da partida → o servidor (só números)
  const r = OFS.sala; if (!c || typeof c !== 'object' || !ehRachao(r) || r.state !== 'playing' || !RSL.partida) return;
  const nu = v => typeof v === 'number' && Number.isFinite(v) ? Math.max(-1, Math.min(1, v)) : 0, ct = v => Number.isInteger(v) && v >= 0 && v < 2e9 ? v : 0;
  const m = { type: 'input', seq: ct(c.seq), x: nu(c.x), y: nu(c.y), f: ct(c.f) & 7, kn: ct(c.kn), st: ct(c.st), lb: ct(c.lb), cl: ct(c.cl), cr: ct(c.cr), pw: ct(c.pw) };
  mandaSala(m);
  RSL.ult = { code: r.code, round: r.round, seq: m.seq, kn: m.kn, st: m.st, lb: m.lb, cl: m.cl, cr: m.cr, pw: m.pw };   // (a moldura que reabre a partida continua daqui)
}
function rchPedido(d) {                                // o campo (um dos 17 ou o estádio inteiro) e as opções, como o servidor confere
  const o = d && d.rachao && typeof d.rachao === 'object' ? d.rachao : null; if (!o) return null;
  const r = { modo: o.modo === 'chaos' ? 'chaos' : 'match', tempo: +o.tempo || 0, gols: +o.gols || 0, corrida: String(o.corrida || ''), nivel: String(o.nivel || ''),
    chutes: { lob: !(o.chutes && o.chutes.lob === false), curve: !(o.chutes && o.chutes.curve === false), superKick: !(o.chutes && o.chutes.superKick === false) } };
  if (typeof o.campo === 'string' && /^[a-z]{2,20}$/.test(o.campo)) r.campo = o.campo;
  else if (o.estadio && typeof o.estadio === 'object') r.estadio = o.estadio;
  else return null;
  return { rachao: r, n: Math.max(1, Math.min(7, d.n | 0 || 2)), bots: d.bots !== false, pub: d.pub !== false };
}
async function rchCria(d) {
  const p = rchPedido(d && d.pedido); if (!p) return rchManda({ t: 'erro', msg: 'Escolha o campo da sala.' });
  if (!(await conecta())) return rchManda({ t: 'erro', msg: semServidorTx() });
  if (!RSL.srv) return rchManda({ t: 'erro', msg: SRV_VELHO_TX });   // (o servidor antigo faria uma sala comum do RACHA)
  if (OFS.code) rachaoFecha();                         // (já está numa sala: a Oficina pergunta se sai dela)
  rchManda({ t: 'ok' });
  RSL.esperando = Date.now();
  OFS.criaSala(p, 'rachao');
}
function rchAjusta(d) {
  const r = OFS.sala, p = rchPedido(d && d.pedido);
  if (!ehRachao(r) || !p) return;
  if (r.admin !== NET49.id) return rchManda({ t: 'erro', msg: 'Só o admin da sala muda os ajustes.' });
  if (r.state === 'playing') return rchManda({ t: 'erro', msg: 'A partida está rolando: os ajustes mudam entre as partidas.' });
  if (!mandaSala(Object.assign({ type: 'config' }, p))) return rchManda({ t: 'erro', msg: semServidorTx() });
  rchManda({ t: 'ok' });
  rachaoFecha(); aviso('Ajustes da sala enviados.');
}
async function rchEntra(code) {
  code = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
  if (code.length < 4) return rchManda({ t: 'erro', msg: 'Confira o código da sala (6 letras e números).' });
  if (!(await conecta())) return rchManda({ t: 'erro', msg: semServidorTx() });
  rchManda({ t: 'ok' });
  if (OFS.code === code) { rachaoFecha(); if (OFI.tela !== 'sala') OFI.mostra('sala'); return; }
  OFS.volta = 'rachao'; RSL.esperando = Date.now();
  mandaSala({ type: 'join', code, rapido: true });     // (entra num time com vaga; a resposta abre a tela da sala)
}
function rchVoltaSala() {                              // VOLTAR PARA A SALA (o fim da partida) ou o ‹ dos ajustes
  RSL.partida = null;
  rachaoFecha();
  if (OFS.code) { if (OFI.tela !== 'sala') OFI.mostra('sala'); else pintaSala(); }
}
function rchSai() { RSL.partida = null; rachaoFecha(); if (OFS.code) OFS.sai(); }

/* ---------------------------------------------------------------- 3) as mensagens do servidor (as da sala do Rachão) */
function rchGuardaCampo(m) {                           // rachao_sala: o campo da sala (um dos 17 pelo id, ou o estádio inteiro)
  if (!m || typeof m.code !== 'string' || typeof m.hash !== 'string') return;
  RSL.campos.set(m.code, { hash: m.hash, info: m.info || {}, campo: typeof m.campo === 'string' ? m.campo : '', estadio: m.estadio && typeof m.estadio === 'object' ? m.estadio : null });
  while (RSL.campos.size > 4) RSL.campos.delete(RSL.campos.keys().next().value);
  const r = OFS.sala;
  if (ehRachao(r) && r.code === m.code) {
    if (RSL.pendente && RSL.pendente.room.code === m.code) { const p = RSL.pendente; RSL.pendente = null; rchComeca(p.room, p.resume); }
    else if (OFI.tela === 'sala') pintaSala();
  }
}
function rchTemCampo(r) { const c = ehRachao(r) && RSL.campos.get(r.code); return !!(c && c.hash === r.rachao.info.hash); }
function rchNomes(r) { const o = {}; r.roster.forEach((id, s) => { if (!id) return; const m = r.members.find(x => x.id === id); if (m) o[s] = m.name; }); return o; }
function rchComeca(r, resume) {                        // a partida: a moldura do Rachão por cima, com o campo, os lugares e as opções
  if (!ehRachao(r)) return;
  if (!rchTemCampo(r)) { RSL.pendente = { room: r, resume }; pedeMapaDeNovo(r.code); aviso('Carregando o campo da sala…'); return; }
  const c = RSL.campos.get(r.code), eu = r.roster.indexOf(NET49.id);
  RSL.partida = { code: r.code, round: r.round, eu };
  rachaoMostra('partida');
  const u = RSL.ult && RSL.ult.code === r.code && RSL.ult.round === r.round ? RSL.ult : null;
  rchManda({ t: 'comeca', code: r.code, round: r.round, n: r.n, lugares: Array.isArray(r.rachao.lugares) ? r.rachao.lugares : [], opc: r.rachao.opc,
    campo: c.campo, estadio: c.estadio, eu, nomes: rchNomes(r), resume: !!resume, ult: u });
  if (OFI.tela === 'sala') pintaSala();
}
function rchSalaMudou(r, antes) {                      // a sala mudou: no meio da partida, os nomes (e o meu lugar) vão para a moldura
  if (RSL.partida && r.state === 'playing' && RSL.partida.code === r.code && RSL.partida.round === r.round) {
    const eu = r.roster.indexOf(NET49.id);
    if (eu !== RSL.partida.eu && RCH.aberto) rchComeca(r, true);   // (o admin me mudou de lugar: a partida de novo, no lugar novo)
    else rchManda({ t: 'nomes', code: r.code, nomes: rchNomes(r) });
  } else if (RSL.esperando && Date.now() - RSL.esperando < 20000 && RCH.aberto && !RSL.partida) { RSL.esperando = 0; rachaoFecha(); }   // (a sala que a tela do Rachão pediu abriu: a tela da sala aparece)
  if (antes && antes.code === r.code && antes.state === 'playing' && r.state !== 'playing' && RSL.partida && !RCH.aberto) RSL.partida = null;
}
{
  const trataAntes = OFS.trata;
  OFS.trata = function (m) {
    if (!m || typeof m.type !== 'string') return trataAntes.apply(this, arguments);
    const t = m.type;
    if (t === 'rachao_sala') { rchGuardaCampo(m); return true; }
    if (t === 'room' && m.room && ehRachao(m.room)) {
      const antes = OFS.sala;
      assumeSala(m.room);
      rchSalaMudou(m.room, antes);
      return true;
    }
    if (t === 'room' && RSL.esperando && RCH.aberto && !RSL.partida) { RSL.esperando = 0; try { rachaoFecha(); } catch (_) {} }   // (entrou por código numa sala que não é do Rachão)
    if (OFS.code && ehRachao(OFS.sala)) {
      switch (t) {
        case 'start':
          if (m.room && ehRachao(m.room)) { OFS.sala = m.room; OFS.ultimoResultado = null; rchComeca(m.room, !!m.resume); return true; }
          break;
        case 'rq': if (RSL.partida && m.round === RSL.partida.round) rchManda({ t: 'q', code: OFS.code, round: m.round, d: m.d }); return true;
        case 'contagem': rchManda({ t: 'contagem', code: OFS.code, round: m.round, ms: m.ms }); return true;
        case 'result':
          if (m.rachao) { OFS.ultimoResultado = m; RSL.ultimo = m; rchManda({ t: 'fim', code: OFS.code, round: m.round, res: m }); if (OFI.tela === 'sala') pintaSala(); return true; }
          break;
        case 'say': if (RCH.aberto && RSL.partida && m.text && !ARB_TXT.test(m.text)) rchManda({ t: 'chat', nome: m.sys ? '' : String(m.name || ''), texto: String(m.text) }); break;   // (o ARB: é do árbitro do jogo de sempre: não é fala de ninguém)
        case 'pause': return true;                        // (a sala do Rachão não pausa: a partida é do servidor)
      }
    }
    if (t === 'error' && RCH.aberto) { RSL.esperando = 0; rchManda({ t: 'erro', msg: m.message || 'Não deu certo.' }); }
    return trataAntes.apply(this, arguments);
  };
}
{
  const depoisAntes = OFS.depois;                      // (a lista de salas chegou: a aba SALAS ONLINE se refaz)
  OFS.depois = function (m) {
    if (m && m.type === 'hello') RSL.srv = m.rch === 1;   // (o servidor diz se tem as salas do Rachão; o antigo não diz)
    const r = depoisAntes.apply(this, arguments);
    try { if (m && (m.type === 'rooms' || m.type === 'hello') && OFI.aberta && OFI.tela === 'hub' && HUB.aba === 'rachao_salas' && HU.salasRch) HU.salasRch(); } catch (_) {}
    return r;
  };
}
{
  const saiuAntes = saiuDaSala;                        // saiu da sala: a partida do Rachão (se estava aberta) fecha junto
  saiuDaSala = function () {
    const eraRachao = ehRachao(OFS.sala) || OFS.volta === 'rachao';
    if (RSL.partida || (RCH.aberto && eraRachao)) { RSL.partida = null; rchManda({ t: 'fecha' }); try { rachaoFecha(); } catch (_) {} }
    RSL.pendente = null;
    if (OFS.volta === 'rachao') OFS.volta = 'hub';
    const r = saiuAntes.apply(this, arguments);
    if (eraRachao && OFI.aberta && OFI.tela === 'hub') { try { mudaAba('rachao_salas'); } catch (_) {} }
    return r;
  };
  OFS.limpa = saiuDaSala;
}

/* ---------------------------------------------------------------- 4) a tela da sala do Rachão */
{
  const pintaAntes = pintaSala;
  pintaSala = function () {
    if (ehRachao(OFS.sala)) return pintaSalaRachao();
    if (SU.rchJogo) SU.rchJogo.hidden = true;
    if (SU.base) SU.base.classList.remove('rch');
    return pintaAntes.apply(this, arguments);
  };
  const ajustesAntes = ajustesSala;
  ajustesSala = function () { if (ehRachao(OFS.sala)) return rchAbreAjustes(); return ajustesAntes.apply(this, arguments); };
}
function pintaSalaRachao() {
  if (!SU.times) return;
  const r = OFS.sala, eu = NET49.id, rc = r.rachao, info = rc.info || {}, n = r.n, admin = r.admin === eu, meu = r.roster.indexOf(eu), jogando = r.state === 'playing';
  SU.nome.textContent = r.name; SU.cod.querySelector('b').textContent = r.code;
  SU.mapa.textContent = 'RACHÃO · «' + (info.nome || 'campo') + '»' + (info.estadio ? ' (estádio)' : '') + (rc.resumo ? ' · ' + rc.resumo : '') + (r.pub ? ' · aberta' : ' · fechada') + (r.bots ? '' : ' · sem bots');
  SU.mapa.title = SU.mapa.textContent;
  if (SU.rankTag) SU.rankTag.hidden = true;
  SU.ajustes.hidden = !admin;
  limpaFilhos(SU.times);
  SU.times.style.setProperty('--n', '2'); SU.times.classList.remove('muitos');
  for (let t = 0; t < 2; t++) {
    const lista = h('div.ofi-time-l');
    for (let k = 0; k < n; k++) {
      const id = r.roster[t * n + k], m = id && r.members.find(x => x.id === id);
      lista.appendChild(m ? chipRachao(m, r, admin) : h('div.ofi-vaga' + (r.bots ? '.bot' : ''), icone(r.bots ? 'bot' : 'adicionar'), h('span', { texto: r.bots ? 'BOT' : 'vaga livre' })));
    }
    const dentro = meu >= 0 && Math.floor(meu / n) === t;
    SU.times.appendChild(h('div.ofi-time-c.ofi-time-rch' + (dentro ? '.meu' : ''), { style: { '--c': TIMES_RCH[t].cor } },
      h('div.ofi-time-cab', h('i'), h('b', { texto: TIMES_RCH[t].nome }), h('small', { texto: r.roster.slice(t * n, t * n + n).filter(Boolean).length + '/' + n }),
        !dentro && !jogando ? botao('ENTRAR', () => mandaSala({ type: 'seat', team: t }), 'ama') : null), lista));
  }
  const vendo = r.members.filter(x => x.slot < 0);
  limpaFilhos(SU.assiste);
  poe(SU.assiste, h('div.ofi-p-tit', icone('olho'), h('b', { texto: 'ASSISTINDO (' + vendo.length + ')' })), h('div.ofi-assiste-l', ...vendo.map(m => chipRachao(m, r, admin))),
    meu >= 0 && !jogando ? botao('SÓ ASSISTIR', () => mandaSala({ type: 'seat', slot: -1 }), 'escuro', 'olho') : null);
  const ninguem = !r.roster.some(Boolean), campoOk = rchTemCampo(r);
  if (!SU.rchJogo) { SU.rchJogo = botao('VOLTAR PARA A PARTIDA', () => rchComeca(OFS.sala, true), 'ama ofi-rch-volta', 'play'); SU.comecar.before(SU.rchJogo); }
  SU.base = SU.base || SU.comecar.parentNode; SU.base.classList.add('rch');
  SU.rchJogo.hidden = !jogando || !campoOk;
  SU.comecar.hidden = !admin || jogando; SU.comecar.disabled = ninguem || !campoOk;
  SU.bots.hidden = !admin || jogando;
  let sp = SU.bots.querySelector('span'); if (!sp) { sp = h('span'); SU.bots.appendChild(sp); }
  sp.textContent = r.bots ? 'BOTS: SIM' : 'BOTS: NÃO'; SU.bots.classList.toggle('on', !!r.bots);
  if (SU.rank) SU.rank.hidden = true;
  SU.status.textContent = OFS.quer ? 'Reconectando…' : !campoOk ? 'Carregando o campo…' : jogando ? 'A partida está rolando.'
    : admin ? (ninguem ? 'Entre num time (ou chame a galera) para começar.' : r.bots ? 'As vagas vazias viram bots.' : 'Sem bots: cada time precisa de pelo menos uma pessoa.') : 'Esperando o admin começar.';
  const u = OFS.ultimoResultado;
  if (r.state === 'ended' && u && Array.isArray(u.score)) SU.status.textContent += ' Última: ' + u.score.join(' × ') + (u.motivo ? ' (encerrada)' : '');
  pintaChat();
}
function chipRachao(m, r, admin) {
  const eu = m.id === NET49.id, adm = r.admin === m.id;
  const b = h('button.ofi-membro' + (eu ? '.eu' : ''), { type: 'button', title: m.name, on: { click: () => { if (admin && !eu) acoesRachao(m, r); } } },
    adm ? icone('trofeu', 'ofi-coroa') : null, h('span', { texto: m.name + (eu ? ' (você)' : '') }));
  if (!admin || eu) b.classList.add('so-ver');
  return b;
}
function acoesRachao(m, r) {
  janela(m.name, (c, ctx) => {
    const it = (ic, t, f, cls) => c.appendChild(h('button.ofi-item' + (cls ? '.' + cls : ''), { type: 'button', on: { click: () => { ctx.fecha(null); f(); } } }, icone(ic), h('span', h('b', { texto: t }))));
    if (r.state !== 'playing') for (let t = 0; t < 2; t++) it('pessoas', 'MOVER PARA O ' + TIMES_RCH[t].nome.toUpperCase(), () => mandaSala({ type: 'seat', id: m.id, team: t }));
    if (r.state !== 'playing' && m.slot >= 0) it('olho', 'SÓ ASSISTIR', () => mandaSala({ type: 'seat', id: m.id, slot: -1 }));
    it('trofeu', 'PASSAR O ADMIN', () => mandaSala({ type: 'promote', id: m.id }));
    it('fechar', 'TIRAR DA SALA', () => mandaSala({ type: 'kick', id: m.id }), 'perigo');
  }, [], 'ofi-menu');
}
function rchAbreAjustes() {                            // AJUSTES (o admin): a tela do Rachão, com o que a sala tem agora
  const r = OFS.sala; if (!ehRachao(r) || r.admin !== NET49.id) return;
  if (r.state === 'playing') return aviso('A partida está rolando: os ajustes mudam entre as partidas.');
  const c = RSL.campos.get(r.code) || {};
  rachaoMostra('partida');
  rchManda({ t: 'ajustes', sala: { code: r.code, campo: c.campo || '', estadio: c.estadio || null, opc: r.rachao.opc, n: r.n, bots: !!r.bots, pub: !!r.pub } });
}

/* ---------------------------------------------------------------- 5) a aba SALAS ONLINE (o modo RACHÃO da central) */
function abaRachaoSalas(vivo) {
  cabecalho('Salas online do Rachão', 'Cada um joga do seu aparelho; a partida roda no servidor das salas, com o motor do Rachão.');
  const arte = h('div.ofi-rch-arte'); arte.innerHTML = RCH_ARTE;   // (o desenho fixo da placa do Rachão)
  HU.grade.appendChild(h('section.ofi-rch-placa.ofi-rch-online', { 'aria-label': 'Salas online do Rachão' },
    h('div.ofi-rch-tx', h('b.ofi-rch-marca', { texto: 'Rachão online' }),
      h('p', { texto: 'Crie a sala com um dos 17 campos ou com um estádio seu, escolha Partida ou Caos, os times e os bots, e mande o código para a galera.' }),
      h('div.ofi-rch-bts', botao('CRIAR SALA', () => rachaoAbre('online'), 'ama', 'adicionar', 'Criar uma sala online do Rachão'),
        botao('ENTRAR COM CÓDIGO', () => entraSalaCodigo(), 'escuro', 'pessoas', 'Entrar numa sala pelo código'))), arte));
  HU.grade.appendChild(h('div.ofi-sep', { texto: 'SALAS ABERTAS DO RACHÃO' }));
  const caixa = h('div.ofi-salas.ofi-rch-salas'); HU.grade.appendChild(caixa);
  const pinta = () => {
    if (!vivo()) return;
    limpaFilhos(caixa);
    const L = (typeof SL !== 'undefined' && Array.isArray(SL.lista) ? SL.lista : []).filter(s => s && s.rachao);
    if (!L.length) {
      const velho = conectado() && !RSL.srv;
      caixa.appendChild(h('div.ofi-vazio', icone('online'), h('b', { texto: velho ? 'O servidor das salas ainda não tem o Rachão.' : conectado() ? 'Nenhuma sala do Rachão aberta agora.' : 'Sem conexão com o servidor das salas.' }),
        h('small', { texto: velho ? SRV_VELHO_TX : conectado() ? 'Crie a sua e mande o código para a galera (as salas fechadas só entram pelo código).' : semServidorTx() })));
      return;
    }
    for (const s of L.slice(0, 30)) {
      const cheia = s.players >= s.max, rolando = s.state === 'playing';
      caixa.appendChild(h('div.ofi-sala-l.ofi-rch-sala', h('b', { texto: s.name }),
        h('small', { texto: '«' + (s.rachao.nome || 'campo') + '»' + (s.rachao.estadio ? ' (estádio)' : '') + ' · ' + (s.rachao.resumo || '') + ' · ' + s.players + '/' + s.max + (rolando ? ' · rolando' + (Array.isArray(s.placar) ? ' ' + s.placar.join(' × ') : '') : '') }),
        !rolando && !cheia ? botao('ENTRAR', () => rchEntraLista(s.code, false), 'ama') : null,
        botao('ASSISTIR', () => rchEntraLista(s.code, true), 'escuro')));
    }
  };
  HU.salasRch = pinta; pinta();
  conecta(4000).then(ok => { if (ok && vivo()) mandaSala({ type: 'list' }); pinta(); }).catch(() => {});
}
async function rchEntraLista(code, assistir) {
  if (!(await conecta())) return aviso(semServidorTx(), 'erro');
  OFS.volta = 'rachao';
  mandaSala(assistir ? { type: 'join', code, spectate: true } : { type: 'join', code, rapido: true });
}

/* ---------------------------------------------------------------- 6) a lista de salas do GALERA: a etiqueta RACHÃO */
try {
  const linhaAntes = sbLinha;
  sbLinha = function (s) {
    const d = linhaAntes.apply(this, arguments);
    try {
      if (s && s.rachao) {
        const sm = d.querySelector('small'); if (sm) sm.textContent = 'RACHÃO «' + s.rachao.nome + '» · ' + (s.rachao.resumo || '') + (s.bots ? ' · com bots' : '');
        const b = d.querySelector('b'); if (b) b.appendChild(Object.assign(document.createElement('i'), { className: 'sb-ofi ofi-tag-lista ofi-tag-rch', textContent: 'RACHÃO' }));
      }
    } catch (_) {}
    return d;
  };
} catch (e) { console.error('Oficina: sbLinha (Rachão)', e); }
try {
  const rapidoAntes = slRapido;                         // (o JOGAR AGORA continua só nas salas comuns)
  slRapido = function () { const l = SL.lista; SL.lista = (l || []).filter(s => !s.rachao); try { return rapidoAntes.apply(this, arguments); } finally { SL.lista = l; } };
} catch (e) { console.error('Oficina: slRapido (Rachão)', e); }

// (as peças por dentro, para os testes)
Object.assign(OFI.interno, { RSL, rchComeca, rchTemCampo, abaRachaoSalas, pintaSalaRachao, rchAbreAjustes, criaEscolha, mudaModo, modoDaAba });
