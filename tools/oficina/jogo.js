/* =====================================================================================================================
   RACHA v92 · OFICINA — A PARTIDA NO MAPA (tools/oficina/jogo.js)
   Roda no canvas do jogo, com os controles do jogo (o analógico, PASSE, CHUTE, CURVA, o teclado e o controle), com a
   física, os gols, as zonas, os objetos e a lógica do mapa (RachaMapa: o mesmo código do servidor):
     · TESTAR (local): a partida inteira neste aparelho, você e os bots — reiniciar, trocar de time, ver as colisões;
     · ONLINE (a sala com mapa): o servidor é a autoridade; o aparelho manda os comandos (os mesmos da sala comum: seq,
       os contadores de toque kc/pc, a curva) e prevê a própria tampinha e a bola num mundo de previsão (o mesmo motor,
       sem a lógica nem os gols), refaz os comandos que o servidor ainda não confirmou a cada quadro e suaviza a correção.
   O jogo de sempre dorme enquanto isso (o laço do quadro é da Oficina: ver base.js).
   Da v93, também aqui: a contagem 3, 2, 1, JÁ! (no TESTAR, antes de cada partida — dá para desligar na pausa; online, o
   servidor segura a partida e solta junto para todos), o CARTÃO DE QUEM FEZ O GOL (a tampinha ou o avatar, o nome, o banner
   equipado e a assistência), os BALÕES DE FALA RÁPIDA (as 8 frases da v93, na pausa ou na tecla T), o CRAQUE DA PARTIDA na
   tela do fim e a bola EQUIPADA (quando o mapa deixa: Aparência › Estilo da bola).
   ===================================================================================================================== */
const OFJ = { on: false, modo: '', M: null, G: null, P: null, eu: -1, cfg: null, rede: null, acc: 0, last: 0, t: 0, z: 1, cx: 0, cy: 0, pronto: null, prontoK: 0,
  bt: null, seq: 0, kc: 0, pc: 0, fx: [], confete: [], banner: null, flash: 0, flashCor: '#ffffff', tremor: 0, brilho: 0, colisoes: false, menu: null, fimRes: null, nomes: [], skins: [] };
const DT_OFJ = RM.DT, MAX_PASSOS_QUADRO = 8;
const OFJ_CONTAGEM_CHAVE = 'racha-ofi-contagem';
try { OFJ.semContagem = localStorage.getItem(OFJ_CONTAGEM_CHAVE) === '0'; } catch (_) { OFJ.semContagem = false; }
const OFJ_RANKOFF_CHAVE = 'racha-ofi-rankoff';          // v95: o RANK OFF do TESTAR (as linhas da bola no teste; desligado de começo)
try { OFJ.rankOffTeste = localStorage.getItem(OFJ_RANKOFF_CHAVE) === '1'; } catch (_) { OFJ.rankOffTeste = false; }
// v95: as linhas da bola só com o RANK OFF: o da sala (o curador liga no CRIAR SALA ou nos AJUSTES) ou o do TESTAR
function ofjRankOff() { return OFJ.modo === 'rede' ? !!(OFJ.rede && OFJ.rede.room && OFJ.rede.room.rankOff) : !!OFJ.rankOffTeste; }
// …ou quando o criador do mapa ligou "Linhas da bola para todos" no editor (vale em toda sala com o mapa e no TESTAR)
function ofjLinhasDoMapa() { return !!(OFJ.M && OFJ.M.partida && OFJ.M.partida.linhas); }
function ofjComLinhas() { return ofjLinhasDoMapa() || ofjRankOff(); }

/* ---------------------------------------------------------------- os ganchos nos controles do jogo (só durante a partida da Oficina) */
try { const antes = controleVisivel; controleVisivel = function (k) { if (OFJ.on && !editing) { if (k === 'reset' || k === 'finta' || k === 'drible') return false; if (k === 'curva') return OFJ.joga() && OFJ.M.partida.jogo === 'curva'; return OFJ.joga(); } return antes.apply(this, arguments); }; } catch (e) { console.error('Oficina: controleVisivel', e); }
try { const antes = arcHitSel; arcHitSel = function () { if (OFJ.on) return null; return antes.apply(this, arguments); }; } catch (e) { console.error('Oficina: arcHitSel', e); }
try { const antes = pausaAbre; pausaAbre = function () { if (OFJ.on) return OFJ.abrePausa(); return antes.apply(this, arguments); }; } catch (e) { console.error('Oficina: pausaAbre', e); }
window.addEventListener('keydown', e => {                // (as teclas do jogo que mexem no modo clássico não valem aqui)
  if (!OFJ.on) return;
  const tc = typeof teclaCanon === 'function' ? teclaCanon(e.code) : e.code;
  const classico = /^(KeyR|KeyT|KeyC|KeyH|KeyF|KeyG|ShiftLeft|ShiftRight|Digit[0-9])$/.test(tc);
  if (OFJ.menu) {                                      // (com um menu da Oficina aberto, a tecla é do menu: não chega ao jogo de sempre)
    if (e.code === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); OFJ.fechaMenu(); return; }
    const t = e.target, edita = !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);   // (o campo de texto da mensagem: escreve normal)
    if (!edita) { e.stopImmediatePropagation(); if (classico) e.preventDefault(); }
    return;
  }
  if (e.code === 'Escape' || tc === 'KeyP') { e.preventDefault(); e.stopImmediatePropagation(); OFJ.abrePausa(); return; }
  if (classico) {
    e.preventDefault(); e.stopImmediatePropagation();
    if (tc === 'KeyR' && OFJ.modo === 'local' && !e.repeat) OFJ.reinicia();
    if (tc === 'KeyT' && OFJ.modo === 'rede' && !e.repeat) OFJ.falasMenu();   // (as falas são para a sala: no TESTAR o T não faz nada)
  }
}, true);
OFJ.joga = () => OFJ.on && OFJ.eu >= 0 && !!OFJ.mundo() && !!OFJ.mundo().jog[OFJ.eu];
OFJ.mundo = () => OFJ.modo === 'rede' ? (OFJ.rede && OFJ.rede.P) : OFJ.P;

/* ---------------------------------------------------------------- começar e sair */
function ofjComeca(modo, M) {
  OFJ.modo = modo; OFJ.M = M; OFJ.G = RM.compila(M); OFJ.pronto = null; OFJ.fx = []; OFJ.confete = []; OFJ.banner = null; OFJ.flash = 0; OFJ.tremor = 0; OFJ.brilho = 0; OFJ.fimRes = null;
  OFJ.on = true; OFJ.t = 0; OFJ.acc = 0; OFJ.last = performance.now(); OFJ.camOk = false;
  if (OFI.raiz) OFI.raiz.hidden = true;
  try { if (lobby.aberto) { if (lobby.tela) { TELAS[lobby.tela].el.hidden = true; lobby.tela = null; try { lbMarcaTela(); } catch (_) {} } lobby.aberto = false; LB.raiz.hidden = true; LB.pop.hidden = true; } } catch (e) { console.error('Oficina: lobby', e); }
  try { limparEntrada(); resetBotoes(); cvCancela(); } catch (_) {}
  try { som.lobby(false); som.iniciar(); som.campo(M.aparencia.piso === 'grama' || M.aparencia.piso === 'grama_escura' || M.aparencia.piso === 'grama_clara' || M.aparencia.piso === 'sintetica' ? 'estadio' : 'favela'); som.ambiente(true); } catch (_) {}
  try { resize(); } catch (_) {}
  OFJ.camada().hidden = false; OFJ.fechaMenu(); ofjHud();
  try { cv.focus({ preventScroll: true }); } catch (_) {}
  try { cbLugar(); } catch (_) {}
}
OFJ.sai = function (destino) {
  if (!OFJ.on) return;
  OFJ.on = false; OFJ.fechaMenu(); OFJ.camada().hidden = true; OFJ.linhas = null; OFJ.simL = null;
  const modo = OFJ.modo; OFJ.modo = ''; OFJ.P = null; OFJ.rede = null; OFJ.golCard = null; OFJ.baloes = new Map(); OFJ.contando = false;
  try { if (typeof V93P !== 'undefined') V93P.contagem = null; } catch (_) {}
  try { limparEntrada(); cvCancela(); som.ambiente(false); } catch (_) {}
  const d = destino || (modo === 'rede' ? (OFS.code ? 'sala' : OFS.volta || 'hub') : (OFJ.cfg && OFJ.cfg.volta) || 'hub');
  if (d === 'jogo') { try { if (!lobby.aberto) abrirLobby(); } catch (_) {} OFI.aberta = false; return; }
  OFI.abre(d === 'editor' && OFE.reg ? 'editor' : d === 'sala' ? 'sala' : 'hub');
};
OFJ.falhou = function (e) {                            // (um erro no meio da partida nunca trava o jogo: volta para a Oficina com o aviso)
  OFJ.erros = (OFJ.erros | 0) + 1;
  if (OFJ.erros > 3) { aviso('A partida da Oficina deu erro e parou: ' + (e && e.message || e), 'erro'); const m = OFJ.modo; OFJ.sai(m === 'rede' ? 'sala' : null); OFJ.erros = 0; }
};

/* ---------------------------------------------------------------- TESTAR (a partida neste aparelho) */
OFJ.local = function (mapa, opc) {
  const l = RM.limpa(mapa);
  if (!l.ok) return aviso('O mapa tem problemas: ' + (l.erros || []).slice(0, 2).join(' · '), 'erro');
  if (OFS.code) return aviso('Saia da sala online antes de testar sozinho.', 'erro');
  OFJ.cfg = Object.assign({ time: 0, bots: true, volta: 'hub' }, OFJ.cfg && OFJ.cfg.mapa === l.mapa.nome ? { time: OFJ.cfg.time, bots: OFJ.cfg.bots } : {}, opc || {}, { mapa: l.mapa.nome });
  OFJ.cfg.time = Math.min(OFJ.cfg.time | 0, l.mapa.partida.equipes - 1);
  ofjComeca('local', l.mapa);
  OFJ.reinicia();
};
OFJ.reinicia = function () {
  const M = OFJ.M, Pm = M.partida, n = Pm.porTime, E = Pm.equipes, meu = OFJ.cfg.time * n;
  const jog = [];
  for (let i = 0; i < E * n; i++) jog.push(i === meu ? { humano: true, nome: (perfil && perfil.nome) || 'Você' } : OFJ.cfg.bots ? { bot: 'dificil', nome: 'Bot ' + String.fromCharCode(65 + Math.floor(i / n)) + (i % n + 1) } : { vazio: true });
  OFJ.P = RM.novaPartida(M, { jogadores: jog, porTime: n, seed: (Math.random() * 2147483646 | 0) + 1, saida0: 0,
    onEvento: e => ofjEvento(e, false), onAviso: t => ofjBanner(t, '#ffd23f', 1.6), onFim: res => ofjFimLocal(res) });
  OFJ.eu = meu; OFJ.bt = RN.novoBotao(); OFJ.seq = 0; OFJ.kc = 0; OFJ.pc = 0; OFJ.acc = 0; OFJ.fimRes = null; OFJ.camOk = false;
  OFJ.nomes = OFJ.P.jog.map(q => q.nome); OFJ.skins = OFJ.P.jog.map((q, i) => i === meu ? (perfil && perfil.skin) : null);
  OFJ.chutaCb = (q, f) => OFJ.P.chuta(q, f);
  try { limparEntrada(); cvCancela(); } catch (_) {}
  OFJ.fechaMenu(); ofjHud(); OFJ.golCard = null; OFJ.baloes = new Map();
  if (!ofjContagem(typeof V93P_CONTAGEM_MS === 'number' ? V93P_CONTAGEM_MS : 3000, false)) try { som.apito('saida'); } catch (_) {}   // (com a contagem, o apito sai no JÁ!)
};
// v93: a contagem 3, 2, 1, JÁ! (o desenho, os bips e o JÁ! são os da partida de sempre: tools/v93/partida.js)
function ofjContagem(ms, online) {
  if (typeof v93ContagemComeca !== 'function' || typeof V93P === 'undefined' || !(ms > 0)) return false;
  if (!online && OFJ.semContagem) return false;
  v93ContagemComeca(ms, online); OFJ.contando = true; return true;
}
function ofjContando() { try { return typeof V93P !== 'undefined' && !!V93P.contagem && typeof v93Contando === 'function' && v93Contando(); } catch (_) { return false; } }
OFJ.contagemRede = function (m) {                       // (o servidor manda: ele segura a partida e solta junto; cada aparelho desconta metade do ping)
  const ms = Math.max(0, (m && m.ms | 0) - Math.min(400, (typeof NET49 !== 'undefined' && NET49.ping || 0) / 2));
  if (ofjContagem(ms, true) && OFJ.rede) { OFJ.rede.pend = []; OFJ.acc = 0; }
};
function ofjComando(d, vale) {                         // o comando deste passo (o mesmo da sala online: os botões, os contadores, a curva)
  OFJ.ultInp = { mx: d.mx, my: d.my };                 // (as linhas da bola: o analógico de agora)
  const lp = BOTAO.kickL, lc = BOTAO.powerL, hp = kickSegurado(), hc = powerSegurado();
  if (lp) OFJ.kc++; if (lc) OFJ.pc++;
  BOTAO.kickL = BOTAO.powerL = false;
  let k = 0;
  if (OFJ.M.partida.jogo === 'curva') {               // a curva: segurar carrega, soltar chuta (a carga aparece no botão)
    const seg = cvSegurada() || CV.toque; CV.toque = false;
    if (seg && vale) k |= 1;
    if (!vale) { CV.carga = 0; CV.segura = false; CV.arma = 0; }
    else if (seg) { CV.segura = true; CV.carga = Math.min(1, CV.carga + DT_OFJ / CV_CARGA_S); CV.arma = 0; }
    else { if (CV.segura) { CV.segura = false; CV.carga = 0; CV.arma = CV_ARMA_S; } if (CV.arma > 0) CV.arma = Math.max(0, CV.arma - DT_OFJ); }
  }
  return { seq: ++OFJ.seq, x: d.mx, y: d.my, button: hc || lc ? 3 : hp || lp ? 2 : 1, k, kc: OFJ.kc, pc: OFJ.pc };
}
function ofjControleEu(P, q, b, cmd, chuta) {         // a mesma ordem do controle() do servidor (partida/sala_mapa.js)
  const C = P.C, vale = P.estado === 'saida' || P.estado === 'jogo';
  let t = 0;
  if (vale) { RN.botaoComando(b, cmd, C); q.mx = cmd.x; q.my = cmd.y; t = RN.botaoTick(P, C, q, b, chuta); }
  else { q.mx = q.my = 0; }
  if (RN.curvaTick(P, C, q, b, cmd.k | 0, vale, chuta)) t = 3;
  return t;
}
function ofjPassoLocal() {
  const P = OFJ.P; if (!P || !P.on || OFJ.menu) return;
  const vale = P.estado === 'saida' || P.estado === 'jogo';
  const cmd = ofjComando(OFJ.joga() ? getInput() : { mx: 0, my: 0 }, vale);
  P.passo(q => { if (q.i === OFJ.eu) { if (ofjControleEu(P, q, OFJ.bt, cmd, OFJ.chutaCb)) try { vibrarChute(cmd.button === 3); } catch (_) {} } else { q.mx = q.my = 0; } });
}
function ofjFimLocal(res) {
  OFJ.fimRes = res;
  setTimeout(() => { if (OFJ.on && OFJ.modo === 'local' && OFJ.fimRes === res) ofjResultado({ score: res.placar, winner: res.vencedor, jog: res.jog.map(j => Object.assign({}, j, { id: j.i === OFJ.eu ? 'eu' : null })), duracao: Math.round(res.duracao), local: true }); }, 300);
}

/* ---------------------------------------------------------------- ONLINE (a sala com mapa: o servidor manda) */
OFJ.online = function (room, mp, resume) {
  const M = mp.mapa, E = room.E || 2, n = room.n;
  if (OFJ.on && OFJ.modo !== 'rede') OFJ.sai('sala');
  if (!OFJ.on) ofjComeca('rede', M); else { OFJ.M = M; OFJ.G = RM.compila(M); OFJ.pronto = null; OFJ.fimRes = null; OFJ.fechaMenu(); }
  const slot = room.roster.indexOf(NET49.id);
  const jog = [];
  for (let i = 0; i < E * n; i++) { const id = room.roster[i]; jog.push(id || room.bots ? { humano: true, nome: ofsNome(room, id) || 'Bot' } : { vazio: true }); }
  const P = RM.novaPartida(M, { jogadores: jog, porTime: n, previsao: true, seed: 1 });
  OFJ.rede = { room, slot, P, pend: [], ackKc: -1, ackPc: -1, ack: 0, snapAt: 0, tick: -1, pausado: false, round: room.round, off: { b: [0, 0], j: P.jog.map(() => [0, 0]) },
    fxSeq: 0, fxT: 0, extra: 0, bt: RN.novoBotao(), semSnap: true };
  OFJ.eu = slot; OFJ.seq = 0; OFJ.kc = 0; OFJ.pc = 0; OFJ.acc = 0; OFJ.camOk = false; OFJ.golCard = null; OFJ.baloes = new Map();
  const cp = OFS.contagemPend; OFS.contagemPend = null;   // (a contagem chegou antes do mapa: o que falta dela)
  if (cp && cp.round === room.round && !resume) { const falta = cp.ms - (performance.now() - cp.em); if (falta > 150) OFJ.contagemRede({ ms: falta }); }
  OFJ.nomes = room.roster.map(id => id ? ofsNome(room, id) : 'Bot');
  OFJ.skins = room.roster.map(id => { const m = id && room.members.find(x => x.id === id); return m ? m.skin : null; });
  OFJ.rede.chuta = (q, f) => OFJ.rede.P.chuta(q, f);
  try { limparEntrada(); cvCancela(); } catch (_) {}
  ofjHud();
  if (!resume) try { som.apito('saida'); } catch (_) {}
};
function ofsNome(room, id) { const m = id && room.members.find(x => x.id === id); return m ? m.name : ''; }
OFJ.salaMudou = function (room) {                    // (a sala mudou no meio da partida: quem entrou para assistir, quem virou admin, quem caiu)
  const R = OFJ.rede; if (!R) return;
  R.room = room;
  room.roster.forEach((id, i) => { if (id) OFJ.nomes[i] = ofsNome(room, id) || OFJ.nomes[i]; });
  const s = room.roster.indexOf(NET49.id); if (s !== R.slot && s >= 0 && R.P.jog[s]) { R.slot = s; OFJ.eu = s; R.pend = []; }
  ofjHud();
};
function ofjPrevisto(cmd, efeitos) {                 // um passo do mundo de previsão (o controle() + o passo() do servidor, sem a lógica nem os gols)
  const R = OFJ.rede, P = R.P;
  P.passo(q => {
    if (q.i === R.slot && cmd) {
      cmd.b0 = { t: R.bt.t, ultimo: R.bt.ultimo, cv: Object.assign({}, R.bt.cv) };
      const t = ofjControleEu(P, q, R.bt, cmd, R.chuta);
      if (t && efeitos && cmd.seq > R.fxSeq) { R.fxSeq = cmd.seq; R.fxT = performance.now(); try { som.chute(t === 3); vibrarChute(t === 3); } catch (_) {} ofjAnel(q.x, q.y, t === 3); }
    } else {                                          // os outros: seguem a direção do último quadro (o palpite de sempre)
      const sp = Math.hypot(q.vx, q.vy);
      if (sp > P.C.VEL_JOG * 0.3) { q.mx = q.vx / sp; q.my = q.vy / sp; } else q.mx = q.my = 0;
    }
  });
}
function ofjPassosRede(dt, now) {
  const R = OFJ.rede; if (!R) return;
  if (R.pausado || R.semSnap || !conectado() || OFJ.contando) { OFJ.acc = 0; return; }   // (v93: na contagem o servidor segura a partida: nada sai daqui)
  OFJ.acc += dt; let n = 0;
  while (OFJ.acc + 1e-9 >= DT_OFJ && n < MAX_PASSOS_QUADRO) {
    OFJ.acc -= DT_OFJ; n++;
    if (R.slot >= 0 && !OFJ.fimRes) {
      const P = R.P, vale = P.estado === 'saida' || P.estado === 'jogo';
      const cmd = ofjComando(OFJ.menu ? { mx: 0, my: 0 } : getInput(), vale);
      if (OFJ.menu) { cmd.button = 1; cmd.k = 0; }
      mandaSala({ type: 'input', seq: cmd.seq, x: cmd.x, y: cmd.y, button: cmd.button, k: cmd.k, kc: cmd.kc, pc: cmd.pc });
      R.pend.push(cmd); if (R.pend.length > 120) R.pend.shift();
      ofjPrevisto(cmd, true);
    } else if (R.extra < 4) { R.extra++; ofjPrevisto(null, false); }   // (quem assiste: um pouco à frente do último quadro, no máximo 4 passos)
  }
  if (OFJ.acc > DT_OFJ * 4) OFJ.acc = 0;
}
OFJ.snap = function (m) {
  const R = OFJ.rede; if (!R || !m || m.round !== R.round) return;
  const s = m.data; if (!s || !(s.tick > R.tick)) return;
  const P = R.P, off = R.off;
  const antesB = [P.B.x + off.b[0], P.B.y + off.b[1]], antesJ = P.jog.map((q, i) => [q.x + off.j[i][0], q.y + off.j[i][1]]);
  RM.aplicaQuadro(P, s);
  R.tick = s.tick; R.snapAt = performance.now(); R.extra = 0;
  try { const c = typeof V93P !== 'undefined' ? V93P.contagem : null; if (c && c.espera && s.tick > 0) { c.espera = false; c.fim = Math.min(c.fim, performance.now()); } } catch (_) {}   // (v93: o JÁ! na hora em que o servidor solta)
  if (R.slot >= 0) {
    const v = s.p[R.slot], ack = v ? v[4] | 0 : 0;
    while (R.pend.length && R.pend[0].seq <= ack) { const c = R.pend.shift(); R.ackKc = c.kc; R.ackPc = c.pc; }
    R.ack = ack;
    const b = R.bt, bt = v ? v[7] | 0 : 0;
    b.estado = (bt & 3) || 1; b.livre = !!(bt & 4); b.armaTipo = (bt >> 3) & 3; b.arma = (bt >> 5) & 31; b.kc = R.ackKc; b.pc = R.ackPc;
    if (R.pend.length && R.pend[0].b0) { b.t = R.pend[0].b0.t; b.ultimo = R.pend[0].b0.ultimo; b.cv = Object.assign({}, R.pend[0].b0.cv); }
    for (const c of R.pend) ofjPrevisto(c, false);   // (refaz o que o servidor ainda não viu)
  }
  // a suavização: o que estava desenhado menos o novo; um salto grande demais vai direto
  const L = window.RachaLiso, evs = s.ev || [];
  if (L) {                                             // v96 · o deslize liso das salas (tools/v96/liso.js): a mola e o teto de velocidade
    // (pula direto só no teleporte de verdade: o portal daquela tampinha ou da bola, a eliminação, a volta, a saída, o reinício,
    //  o gol, o fim — e na diferença enorme, 12 u a tampinha e 14 u a bola)
    const pulaTudo = evs.some(e => e && ['eliminado', 'volta', 'saida', 'lateral', 'fora', 'reinicio', 'gol', 'fim', 'some'].indexOf(e.t) >= 0);
    const portal = i => evs.some(e => e && e.t === 'portal' && (i < 0 ? !!e.bola : e.j === i));
    if (!R.dz || R.dz.j.length !== P.jog.length) R.dz = { b: L.novo(), j: P.jog.map(() => L.novo()) };
    const poe = (d, a, x, y, lim, pula) => { const dx = a[0] - x, dy = a[1] - y; if (pula || !(Math.hypot(dx, dy) <= lim)) L.zera(d); else { d.x = dx; d.y = dy; } return [d.x, d.y]; };
    off.b = poe(R.dz.b, antesB, P.B.x, P.B.y, U(L.PADRAO.teleP), pulaTudo || portal(-1));
    P.jog.forEach((q, i) => { off.j[i] = poe(R.dz.j[i], antesJ[i], q.x, q.y, U(12), pulaTudo || portal(i) || q.fora); });
  } else {
    const lim = U(5), cola = (a, x, y) => { const dx = a[0] - x, dy = a[1] - y; return Math.hypot(dx, dy) > lim ? [0, 0] : [dx, dy]; };
    off.b = cola(antesB, P.B.x, P.B.y);
    P.jog.forEach((q, i) => { off.j[i] = cola(antesJ[i], q.x, q.y); });
  }
  if (R.semSnap) { R.semSnap = false; off.b = [0, 0]; off.j = P.jog.map(() => [0, 0]); if (R.dz) { L.zera(R.dz.b); R.dz.j.forEach(L.zera); } OFJ.camOk = false; }
  for (const e of s.ev || []) ofjEvento(e, true);
};
OFJ.pausaRede = function (on) { const R = OFJ.rede; if (!R) return; R.pausado = !!on; R.pend = []; if (on) ofjBanner('PARTIDA PAUSADA', '#ffd23f', 1.2); ofjHud(); };
OFJ.resultado = function (m) {
  if (!OFJ.on || OFJ.modo !== 'rede') { OFS.ultimoResultado = m; return; }
  OFJ.fimRes = m; setTimeout(() => { if (OFJ.on && OFJ.fimRes === m) ofjResultado(m); }, 400);
};

/* ---------------------------------------------------------------- os eventos (os sons, o banner e os efeitos) */
function ofjEvento(e, rede) {
  const P = OFJ.mundo(); if (!e || !P) return;
  const M = OFJ.M, nomeT = t => (M.partida.times[t] || {}).nome || NOME_TIME(t), corT = t => (M.partida.times[t] || {}).cor || '#ffd23f';
  switch (e.t) {
    case 'chute': {
      if (rede && e.j === OFJ.eu && performance.now() - OFJ.rede.fxT < 700) break;   // (o seu chute já tocou na hora)
      const q = P.jog[e.j]; try { som.chute(!!e.forte); } catch (_) {}
      if (q) ofjAnel(q.x, q.y, !!e.forte);
      break;
    }
    case 'gol': {
      const meu = OFJ.eu >= 0 && P.jog[OFJ.eu] ? P.jog[OFJ.eu].time : -1;
      if (e.time >= 0) {
        try { if (meu < 0 || meu === e.time) som.gol(); else som.golContra(); } catch (_) {}
        const card = ofjCartaoNovo(e);                  // v93: o cartão de quem marcou (com a assistência) — as linhas de texto do banner saem
        ofjBanner(e.contra ? 'GOL CONTRA!' : (e.pts > 1 ? '+' + e.pts + ' ' : '') + 'GOL DO ' + nomeT(e.time).toUpperCase() + '!', corT(e.time), 2, card ? '' : e.contra ? (e.contraName || '') : (e.name ? e.name + (e.assistName ? ' · assistência de ' + e.assistName : '') : ''));
        ofjConfete(corT(e.time), 90);
      } else { try { som.golContra(); } catch (_) {} ofjBanner('GOL CONTRA (NÃO VALE)', '#ffffff', 1.6); }
      break;
    }
    case 'fim': try { som.apito('fim'); } catch (_) {} break;
    case 'saida': if (P.tick > 5) try { som.apito('saida'); } catch (_) {} break;
    case 'troca': ofjBanner('TROCA DE LADO!', '#ffd23f', 1.8); try { som.apito(); } catch (_) {} break;
    case 'aviso': ofjBanner(String(e.texto || ''), '#ffd23f', 1.8); break;
    case 'fora': ofjBanner('FORA!', '#ffffff', 1); try { som.apito(); } catch (_) {} break;
    case 'lateral': ofjBanner('LATERAL', '#ffffff', .8); break;
    case 'eliminado': if (e.j === OFJ.eu) ofjBanner('ELIMINADO!', '#ff3b3b', 1.6, 'você volta na próxima saída'); { const q = P.jog[e.j]; if (q) ofjAnel(q.x, q.y, true, '#ff3b3b'); } break;
    case 'portal': { const q = e.j != null ? P.jog[e.j] : null; const x = q ? q.x : P.B.x, y = q ? q.y : P.B.y; ofjAnel(x, y, false, '#b197fc'); break; }
    case 'botao': try { som.clique(); } catch (_) {} break;
    case 'efeito': ofjEfeito(e.efeito, e.cor || '#ffd23f'); break;
    case 'reinicio': case 'volta': ofjAnel(P.B.x, P.B.y, false, '#56b4ff'); break;
  }
}
function ofjEfeito(tipo, cor) {
  if (tipo === 'confete') ofjConfete(cor, 120);
  else if (tipo === 'flash') { OFJ.flash = 1; OFJ.flashCor = cor; }
  else if (tipo === 'tremor') OFJ.tremor = 0.6;
  else if (tipo === 'brilho') { OFJ.brilho = 1; OFJ.flashCor = cor; }
}
function ofjBanner(t, cor, seg, sub) { OFJ.banner = { t: String(t || '').slice(0, 60), cor: cor || '#ffd23f', ate: OFJ.t + (seg || 1.5), de: OFJ.t, sub: sub ? String(sub).slice(0, 70) : '' }; }
function ofjAnel(x, y, forte, cor) { OFJ.fx.push({ x, y, t0: OFJ.t, d: forte ? .45 : .32, r: forte ? U(4) : U(2.6), cor: cor || (forte ? '#ffd23f' : '#ffffff') }); if (OFJ.fx.length > 24) OFJ.fx.shift(); }
function ofjConfete(cor, n) {
  const cores = [cor, '#ffffff', '#ffd23f', clareia(cor, .4)];
  for (let i = 0; i < n; i++) OFJ.confete.push({ x: W / 2 + (Math.random() - .5) * W * .6, y: -20 - Math.random() * 120, vx: (Math.random() - .5) * 260, vy: 120 + Math.random() * 260, r: 5 + Math.random() * 7, c: cores[i % cores.length], a: Math.random() * TAU, va: (Math.random() - .5) * 12, vida: 2.4 + Math.random() });
  if (OFJ.confete.length > 400) OFJ.confete.splice(0, OFJ.confete.length - 400);
}

/* ---------------------------------------------------------------- o laço do quadro (no lugar do frame do jogo) */
OFJ.quadro = function (now) {
  let dt = (now - OFJ.last) / 1000; OFJ.last = now; if (!(dt > 0)) dt = 0; dt = Math.min(dt, .25);
  try { fpsTela(now); } catch (_) {}
  OFJ.contando = ofjContando();                        // (v93: 3, 2, 1… a física espera, como na pausa)
  if (OFJ.modo === 'local') {
    if (!OFJ.menu && OFJ.P && OFJ.P.on && !OFJ.contando) { OFJ.acc += dt; let n = 0; while (OFJ.acc + 1e-9 >= DT_OFJ && n < MAX_PASSOS_QUADRO) { OFJ.acc -= DT_OFJ; n++; ofjPassoLocal(); } if (OFJ.acc > DT_OFJ * 4) OFJ.acc = 0; }
    else OFJ.acc = 0;
  } else ofjPassosRede(dt, now);
  OFJ.t += dt;
  ofjDesenha(dt);
  OFJ.erros = 0;
};
function ofjZoom() {
  const G = OFJ.G, P = OFJ.mundo(), n = P ? P.n : 2;
  const base = (100 / 85) * [1, .92, .86, .8, .76][Math.max(0, Math.min(4, n - 1))];
  const fit = Math.min(W / (G.GR - G.GL + U(3)), H / (G.GB - G.GT + U(3)));
  let z = base;
  try { if (cam.preset === 'perto') z = base * 1.18; else if (cam.preset === 'campo') z = fit; else if (cam.preset === 'pers' && cam.zoom > 0) z = base * cam.zoom / 100; } catch (_) {}
  if (OFJ.eu < 0) z = Math.max(fit, z * .8);          // (quem assiste vê mais do campo)
  return clamp(z, .25, 2.4);
}
function ofjCamera(dt, P) {
  const G = OFJ.G, z = OFJ.z, hw = W / (2 * z), hh = H / (2 * z), R = OFJ.rede, off = R ? R.off : null;
  const eu = OFJ.eu >= 0 ? P.jog[OFJ.eu] : null, bx = P.B.x + (off ? off.b[0] : 0), by = P.B.y + (off ? off.b[1] : 0);
  let tx = bx, ty = by;
  if (eu && !eu.fora) { const ex = eu.x + (off ? off.j[OFJ.eu][0] : 0), ey = eu.y + (off ? off.j[OFJ.eu][1] : 0); tx = ex + (bx - ex) * .3; ty = ey + (by - ey) * .3; const mx = hw * .55, my = hh * .5; tx = clamp(tx, ex - mx, ex + mx); ty = clamp(ty, ey - my, ey + my); }
  const lim = (c, h2, M) => 2 * h2 >= M ? M / 2 : clamp(c, h2, M - h2);
  tx = lim(tx, hw, G.MW); ty = lim(ty, hh, G.MH);
  if (!OFJ.camOk) { OFJ.cx = tx; OFJ.cy = ty; OFJ.camOk = true; }
  else { const k = 1 - Math.exp(-dt / .16); OFJ.cx += (tx - OFJ.cx) * k; OFJ.cy += (ty - OFJ.cy) * k; }
  OFJ.cx = lim(OFJ.cx, hw, G.MW); OFJ.cy = lim(OFJ.cy, hh, G.MH);
}
const ofjTela = (x, y) => [(x - OFJ.cx) * OFJ.z + W / 2, (y - OFJ.cy) * OFJ.z + H / 2];
function ofjDesenha(dt) {
  const P = OFJ.mundo(), M = OFJ.M, G = OFJ.G, g = ctx; if (!P || !M) return;
  const R = OFJ.rede, off = R ? R.off : null;
  if (off) {
    const L = window.RachaLiso;
    if (L && R.dz) {                                   // v96 · o deslize liso (a mola crítica com o teto de velocidade, como nas salas)
      const p = L.PADRAO, C = P.C, tau = .09, eu = OFJ.eu >= 0 ? P.jog[OFJ.eu] : null;
      L.anda(R.dz.b, dt, tau * .9, L.tetoB(C, p, Math.hypot(P.B.vx, P.B.vy), eu ? Math.hypot(P.B.x - eu.x, P.B.y - eu.y) : null, U), p.gB, U(p.livreB));
      R.dz.j.forEach(d => L.anda(d, dt, tau, L.tetoJ(C, p)));
      off.b = [R.dz.b.x, R.dz.b.y]; off.j = R.dz.j.map(d => [d.x, d.y]);
    } else { const k = Math.exp(-dt / .09); off.b[0] *= k; off.b[1] *= k; for (const o of off.j) { o[0] *= k; o[1] *= k; } }
  }
  const z = OFJ.z = ofjZoom();
  ofjCamera(dt, P);
  let sx = 0, sy = 0;
  if (OFJ.tremor > 0) { OFJ.tremor = Math.max(0, OFJ.tremor - dt); const a = OFJ.tremor * 22; sx = (Math.random() - .5) * a; sy = (Math.random() - .5) * a; }
  g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = M.aparencia.corFundo || '#1d2326'; g.fillRect(0, 0, cv.width, cv.height);
  const s = K * z, ox = K * (W / 2 - OFJ.cx * z + sx), oy = K * (H / 2 - OFJ.cy * z + sy);
  if (!OFJ.pronto || OFJ.prontoK !== s) { OFJ.pronto = DES.pronto(M, G, s, OFJ.pronto && OFJ.pronto.mapa === M ? OFJ.pronto : null); OFJ.prontoK = s; }
  g.setTransform(s, 0, 0, s, ox, oy); g.imageSmoothingEnabled = true;
  g.drawImage(OFJ.pronto.cv, 0, 0, G.MW, G.MH);
  DES.objetos(g, M, G, { so: 'dinamicos', P, t: OFJ.t });
  if (OFJ.colisoes) ofjColisoes(g, P, z);
  try { ofjLinhas(g, P); } catch (e) { OFJ.linhas = null; }   // (os ajustes finos: a linha do chute e o caminho da bola, pelo motor do mapa)
  // os anéis dos chutes (no chão)
  OFJ.fx = OFJ.fx.filter(f => OFJ.t - f.t0 < f.d);
  for (const f of OFJ.fx) { const k = (OFJ.t - f.t0) / f.d; g.save(); g.globalAlpha = (1 - k) * .8; g.strokeStyle = f.cor; g.lineWidth = Math.max(2, 6 * (1 - k)) / z * 1.2; g.beginPath(); g.arc(f.x, f.y, f.r * (.4 + k), 0, TAU); g.stroke(); g.restore(); }
  // as tampinhas e a bola (online, com a extrapolação dos ajustes finos: uns ms à frente)
  const ex = OFJ.modo === 'rede' ? ofjExtrapola(P) : null;
  const jx = (q, i) => q.x + (off ? off.j[i][0] : 0) + (ex ? ex.j[i][0] : 0), jy = (q, i) => q.y + (off ? off.j[i][1] : 0) + (ex ? ex.j[i][1] : 0);
  P.jog.forEach((q, i) => { if (q.fora || q.vazio) return; try { DES.jogador(g, M, q, jx(q, i), jy(q, i), q.r, s, i === OFJ.eu, OFJ.skins[i]); } catch (_) {} });
  const bx = P.B.x + (off ? off.b[0] : 0) + (ex ? ex.b[0] : 0), by = P.B.y + (off ? off.b[1] : 0) + (ex ? ex.b[1] : 0);
  if (DES.estiloBola(M) === 'racha') { g.save(); g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(bx + P.C.R_BOLA * .2, by + P.C.R_BOLA * .35, P.C.R_BOLA, P.C.R_BOLA * .7, 0, 0, TAU); g.fill(); g.restore(); }
  DES.bola(g, bx, by, P.C.R_BOLA, M);   // (a branca é lisa, sem sombra: a de sempre dos jogos de bolinha)
  DES.luz(g, M, G);
  // a tela (HUD)
  g.setTransform(K, 0, 0, K, 0, 0);
  if (OFJ.brilho > 0) { OFJ.brilho = Math.max(0, OFJ.brilho - dt * .8); const [px, py] = ofjTela(bx, by); const gr = g.createRadialGradient(px, py, 0, px, py, 420); gr.addColorStop(0, rgba(OFJ.flashCor, .5 * OFJ.brilho)); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, W, H); }
  ofjNomes(g, P, jx, jy);
  ofjPlacar(g, P, M);
  ofjMensagens(g, P, M);
  try { ofjBaloes(g, P, jx, jy); } catch (_) {}
  try { ofjCartaoGol(g); } catch (_) {}
  ofjConfeteDesenha(g, dt);
  try { if (typeof V93P !== 'undefined' && V93P.contagem && typeof v93DesenhaContagem === 'function') v93DesenhaContagem(g); } catch (_) {}
  if (OFJ.flash > 0) { OFJ.flash = Math.max(0, OFJ.flash - dt * 2.2); g.fillStyle = rgba(OFJ.flashCor, OFJ.flash * .7); g.fillRect(0, 0, W, H); }
  if (!OFJ.menu) { try { drawControls(dt); } catch (_) {} try { drawPausaBtn(); } catch (_) {} }
}
function ofjNomes(g, P, jx, jy) {
  const rede = OFJ.modo === 'rede';
  g.save(); g.textAlign = 'center'; g.textBaseline = 'bottom'; g.font = '700 26px "Barlow Condensed","Barlow",sans-serif'; g.lineJoin = 'round';
  P.jog.forEach((q, i) => {
    if (q.fora || q.vazio || !rede || i === OFJ.eu) return;   // (a sua tampinha tem a setinha; os nomes são dos outros, no online)
    const [x, y] = ofjTela(jx(q, i), jy(q, i)), nome = q.ehBot ? 'BOT' : (OFJ.nomes[i] || 'Jogador');
    const yy = y - q.r * OFJ.z * 1.25 - (i === OFJ.eu ? 30 : 6);
    g.lineWidth = 6; g.strokeStyle = 'rgba(5,6,12,.85)'; g.strokeText(nome, x, yy); g.fillStyle = i === OFJ.eu ? '#ffd23f' : '#ffffff'; g.fillText(nome, x, yy);
  });
  g.restore();
}
const ofjRelogio = s => { s = Math.max(0, Math.floor(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
function ofjPilula(g, x, y, w, hh, cor, borda) { g.beginPath(); g.roundRect ? g.roundRect(x, y, w, hh, hh / 2) : g.rect(x, y, w, hh); g.fillStyle = cor; g.fill(); if (borda) { g.lineWidth = 3; g.strokeStyle = borda; g.stroke(); } }
function ofjPlacar(g, P, M) {
  const E = P.E, T = M.partida.times, tl = P.tempoLim;
  const tempo = tl > 0 ? (P.prorrog ? '+' + ofjRelogio(P.t - tl) : ofjRelogio(tl - P.t)) : ofjRelogio(P.t);
  g.save(); g.textBaseline = 'middle'; g.textAlign = 'center';
  const largo = E <= 2, larg = largo ? 236 : 128, alto = largo ? 66 : 60, esp = 10, tw = 150, total = E * larg + (E - 1) * esp + tw + esp, x0 = W / 2 - total / 2, y0 = 16;
  let x = x0;
  const time = (t) => {
    const cor = T[t] ? T[t].cor : '#fff', r = alto / 2 - 9;
    ofjPilula(g, x, y0, larg, alto, 'rgba(10,14,40,.82)', cor);
    g.fillStyle = cor; g.beginPath(); g.arc(x + alto / 2, y0 + alto / 2, r, 0, TAU); g.fill(); g.lineWidth = 3; g.strokeStyle = '#05060c'; g.stroke();
    if (largo) {
      g.font = '400 30px "Lilita One","Anton",sans-serif'; g.fillStyle = '#ffffff'; g.textAlign = 'left';
      g.fillText(String((T[t] || {}).nome || NOME_TIME(t)).toUpperCase().slice(0, 10), x + alto + 4, y0 + alto / 2 + 1);
    } else {                                           // (3 ou 4 times: a letra do time na bolinha)
      g.font = '400 26px "Lilita One","Anton",sans-serif'; g.textAlign = 'center'; g.lineWidth = 5; g.strokeStyle = 'rgba(5,6,12,.8)'; g.lineJoin = 'round';
      const l = String.fromCharCode(65 + t); g.strokeText(l, x + alto / 2, y0 + alto / 2 + 1); g.fillStyle = '#ffffff'; g.fillText(l, x + alto / 2, y0 + alto / 2 + 1);
    }
    g.textAlign = 'right'; g.font = '800 ' + (largo ? 50 : 44) + 'px "Barlow Condensed","Barlow",sans-serif'; g.fillStyle = '#ffd23f';
    g.fillText(String(P.placar[t] | 0), x + larg - (largo ? 18 : 16), y0 + alto / 2 + 2);
    if (P.estado === 'saida' && P.saidaTime === t) { g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(x + larg - 8, y0 + 8, 6, 0, TAU); g.fill(); }
    x += larg + esp;
  };
  const meio = Math.ceil(E / 2);
  for (let t = 0; t < meio; t++) time(t);
  ofjPilula(g, x, y0 + 6, tw, alto - 12, P.prorrog ? 'rgba(255,59,59,.88)' : 'rgba(5,6,12,.86)', 'rgba(255,255,255,.25)');
  g.textAlign = 'center'; g.fillStyle = '#ffffff'; g.font = '800 40px "Barlow Condensed","Barlow",sans-serif'; g.fillText(tempo, x + tw / 2, y0 + alto / 2 + 2);
  x += tw + esp;
  for (let t = meio; t < E; t++) time(t);
  // os cronômetros que o mapa mostra
  let cy = y0 + alto + 46;
  P.G.cronos.forEach((c, k) => {
    const o = M.objetos[c.obj]; if (!o || !o.mostra) return;
    const resto = RM.restoCronometro(P, k), rod = P.cron[k] && P.cron[k].rodando;
    ofjPilula(g, W / 2 - 110, cy - 22, 220, 44, 'rgba(10,14,40,.8)', o.cor || '#ffffff');
    g.fillStyle = rod ? '#ffffff' : 'rgba(255,255,255,.55)'; g.font = '700 28px "Barlow Condensed","Barlow",sans-serif'; g.textAlign = 'center';
    g.fillText((o.nome ? o.nome.toUpperCase().slice(0, 12) + '  ' : '⏱ ') + resto.toFixed(resto < 10 ? 1 : 0) + 's', W / 2, cy + 1);
    cy += 52;
  });
  g.restore();
}
function ofjTextoGrande(g, t, x, y, tam, cor, sub) {
  g.save(); g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
  g.font = '400 ' + tam + 'px "Lilita One","Anton",Impact,sans-serif'; g.lineWidth = tam * .16; g.strokeStyle = 'rgba(5,6,12,.92)'; g.strokeText(t, x, y); g.fillStyle = cor; g.fillText(t, x, y);
  if (sub) { g.font = '700 ' + Math.round(tam * .36) + 'px "Barlow Condensed","Barlow",sans-serif'; g.lineWidth = 7; g.strokeText(sub, x, y + tam * .72); g.fillStyle = '#ffffff'; g.fillText(sub, x, y + tam * .72); }
  g.restore();
}
function ofjMensagens(g, P, M) {
  const R = OFJ.rede, eu = OFJ.eu >= 0 ? P.jog[OFJ.eu] : null;
  if (P.mensagem && P.mensagem.texto) ofjTextoGrande(g, P.mensagem.texto, W / 2, H * .3, 54, P.mensagem.cor || '#ffd23f');
  const b = OFJ.banner;
  if (b && OFJ.t < b.ate) { const k = Math.min(1, (OFJ.t - b.de) * 6), sc = .6 + .4 * k; g.save(); g.translate(W / 2, H * .44); g.scale(sc, sc); g.globalAlpha = Math.min(1, (b.ate - OFJ.t) * 3); ofjTextoGrande(g, b.t, 0, 0, 92, b.cor, b.sub); g.restore(); }
  if (P.estado === 'saida' && !(b && OFJ.t < b.ate)) { const t = P.saidaTime, T = M.partida.times[t]; g.save(); g.font = '700 30px "Barlow Condensed","Barlow",sans-serif'; g.textAlign = 'center'; g.lineWidth = 7; g.lineJoin = 'round'; g.strokeStyle = 'rgba(5,6,12,.85)'; const tx = 'SAÍDA: ' + String(T ? T.nome : NOME_TIME(t)).toUpperCase(); g.strokeText(tx, W / 2, H - 46); g.fillStyle = T ? T.cor : '#fff'; g.fillText(tx, W / 2, H - 46); g.restore(); }
  if (eu && eu.fora && !eu.vazio && P.estado !== 'fim') ofjTextoGrande(g, 'ELIMINADO', W / 2, H * .62, 46, '#ff3b3b', 'você volta na próxima saída');
  if (OFJ.modo === 'rede') {
    if (R && R.pausado) ofjTextoGrande(g, 'PAUSADO', W / 2, H * .52, 70, '#ffd23f', 'esperando o admin continuar');
    else if (!conectado()) ofjTextoGrande(g, 'RECONECTANDO…', W / 2, H * .52, 62, '#ffffff', 'a partida segue no servidor');
    else if (R && R.semSnap) ofjTextoGrande(g, 'CARREGANDO…', W / 2, H * .52, 56, '#ffffff');
    if (OFJ.eu < 0) { g.save(); g.font = '700 26px "Barlow Condensed","Barlow",sans-serif'; g.textAlign = 'left'; g.fillStyle = 'rgba(255,255,255,.85)'; g.fillText('ASSISTINDO', 240, 64); g.restore(); }
  } else if (OFJ.colisoes) { g.save(); g.font = '700 24px "Barlow Condensed","Barlow",sans-serif'; g.textAlign = 'left'; g.fillStyle = '#56b4ff'; g.fillText('COLISÕES: AZUL = SÓ A BOLA · ROSA = SÓ JOGADOR · BRANCO = TODOS', 240, H - 18); g.restore(); }
  if (P.estado === 'fim' && !OFJ.menu) ofjTextoGrande(g, 'FIM DE JOGO', W / 2, H * .44, 96, '#ffd23f');
}
function ofjConfeteDesenha(g, dt) {
  if (!OFJ.confete.length) return;
  g.save();
  OFJ.confete = OFJ.confete.filter(c => (c.vida -= dt) > 0 && c.y < H + 40);
  for (const c of OFJ.confete) { c.vy += 260 * dt; c.vx *= .99; c.x += c.vx * dt; c.y += c.vy * dt; c.a += c.va * dt; g.save(); g.translate(c.x, c.y); g.rotate(c.a); g.globalAlpha = Math.min(1, c.vida); g.fillStyle = c.c; g.fillRect(-c.r, -c.r * .45, c.r * 2, c.r * .9); g.restore(); }
  g.restore();
}
function ofjColisoes(g, P, z) {                         // TESTAR › VER COLISÕES: as peças que batem (do mapa e as que se movem)
  const cor = s => (s.modo & 3) === 1 ? '#56b4ff' : (s.modo & 3) === 2 ? '#ff3df2' : '#ffffff';
  const lw = 4 / z;
  const um = s => {
    if (!(s.modo & 3)) return;
    g.strokeStyle = cor(s); g.fillStyle = rgba(cor(s), .22);
    if (s.k === 's') { g.lineWidth = Math.max(lw, (s.r || 0) * 2); g.beginPath(); g.moveTo(s.ax, s.ay); g.lineTo(s.bx, s.by); g.stroke(); }
    else if (s.k === 'c') { g.lineWidth = lw; g.beginPath(); g.arc(s.x, s.y, s.r, 0, TAU); g.fill(); g.stroke(); }
    else if (s.k === 'p') { g.lineWidth = lw; caminhoPoli(g, s.pts); g.fill(); g.stroke(); }
  };
  g.save(); g.globalAlpha = .9; g.lineCap = 'round'; g.lineJoin = 'round';
  for (const s of P.G.col) um(s);
  for (const D of P.dyn || []) for (const s of D.cols || []) um(s);
  g.globalAlpha = .5; g.setLineDash([6 / z, 6 / z]); g.strokeStyle = '#ffd23f'; g.lineWidth = 2 / z; g.strokeRect(P.G.GL, P.G.GT, P.G.GR - P.G.GL, P.G.GB - P.G.GT);
  g.restore();
}

/* ---------------------------------------------------------------- a camada de cima (DOM): o menu da pausa e o resultado */
OFJ.camada = function () {
  if (OFJ.ui) return OFJ.ui;
  OFJ.ui = h('div#ofj.ofj', { hidden: true });
  OFJ.uiHud = h('div.ofj-hud');
  OFJ.ui.appendChild(OFJ.uiHud);
  document.body.appendChild(OFJ.ui);
  return OFJ.ui;
};
function ofjHud() { const el = OFJ.uiHud; if (el) limpaFilhos(el); }   // (o que é da tela fica no canvas; o chat da sala mora no menu da pausa)
OFJ.fechaMenu = function () { if (OFJ.menu) { OFJ.menu.remove(); OFJ.menu = null; } try { limparEntrada(); } catch (_) {} };
function ofjMenu(titulo, monta) {
  OFJ.fechaMenu();
  const caixa = h('div.ofj-menu-caixa'), fundo = h('div.ofj-menu', { role: 'dialog', 'aria-modal': 'true', 'aria-label': titulo }, caixa);
  caixa.appendChild(h('div.ofj-menu-tit', h('b', { texto: titulo })));
  monta(caixa);
  OFJ.camada().appendChild(fundo); OFJ.menu = fundo;
  const b = caixa.querySelector('button'); if (b) setTimeout(() => { try { b.focus(); } catch (_) {} }, 30);
  return caixa;
}
OFJ.abrePausa = function () {
  if (!OFJ.on || OFJ.menu) return;
  try { som.clique(); } catch (_) {}
  const R = OFJ.rede, admin = R && R.room && R.room.admin === NET49.id;
  ofjMenu(OFJ.modo === 'local' ? 'TESTE PAUSADO' : 'MENU DA PARTIDA', c => {
    const it = (rot, f, cls, ic) => c.appendChild(botao(rot, f, 'ofj-item ' + (cls || 'escuro'), ic));
    it('CONTINUAR', () => OFJ.fechaMenu(), 'ama', 'play');
    if (OFJ.modo === 'local') {
      it('REINICIAR', () => OFJ.reinicia(), '', 'girar');
      if (OFJ.M.partida.equipes > 1) it('TROCAR DE TIME (agora: ' + ((OFJ.M.partida.times[OFJ.cfg.time] || {}).nome || NOME_TIME(OFJ.cfg.time)) + ')', () => { OFJ.cfg.time = (OFJ.cfg.time + 1) % OFJ.M.partida.equipes; OFJ.reinicia(); }, '', 'pessoas');
      it(OFJ.cfg.bots ? 'BOTS: LIGADOS' : 'BOTS: DESLIGADOS', () => { OFJ.cfg.bots = !OFJ.cfg.bots; OFJ.reinicia(); }, '', 'bot');
      it(OFJ.colisoes ? 'ESCONDER AS COLISÕES' : 'VER AS COLISÕES', () => { OFJ.colisoes = !OFJ.colisoes; OFJ.fechaMenu(); }, '', 'fisica');
      it(OFJ.semContagem ? 'CONTAGEM 3, 2, 1: DESLIGADA' : 'CONTAGEM 3, 2, 1: LIGADA', () => { OFJ.semContagem = !OFJ.semContagem; try { localStorage.setItem(OFJ_CONTAGEM_CHAVE, OFJ.semContagem ? '0' : '1'); } catch (_) {} OFJ.fechaMenu(); }, '', 'relogio');
      if (ofjLinhasDoMapa()) { const b = botao('LINHAS DA BOLA: DO MAPA (PARA TODOS)', () => {}, 'ofj-item escuro', 'pontos'); b.disabled = true; b.title = 'O criador ligou as linhas no mapa (Editor › Partida)'; c.appendChild(b); }   // v95
      else it(OFJ.rankOffTeste ? 'RANK OFF (LINHAS DA BOLA): LIGADO' : 'RANK OFF (LINHAS DA BOLA): DESLIGADO', () => { OFJ.rankOffTeste = !OFJ.rankOffTeste; OFJ.linhas = null; try { localStorage.setItem(OFJ_RANKOFF_CHAVE, OFJ.rankOffTeste ? '1' : '0'); } catch (_) {} OFJ.fechaMenu(); }, '', 'pontos');
      it(OFJ.cfg.volta === 'editor' ? 'VOLTAR AO EDITOR' : 'SAIR DO TESTE', () => OFJ.sai(), 'verm', 'voltar');
    } else {
      if (admin) it(R.pausado ? 'RETOMAR A PARTIDA (PARA TODOS)' : 'PAUSAR A PARTIDA (PARA TODOS)', () => { const on = !R.pausado; mandaSala({ type: 'pause', paused: on }); OFJ.pausaRede(on); OFJ.fechaMenu(); }, '', 'relogio');
      if (admin) it('ENCERRAR A PARTIDA (NÃO VALE)', async () => { OFJ.fechaMenu(); if (await ofjConfirma('Encerrar a partida?', 'O resultado não vale. Todos voltam para a sala.')) mandaSala({ type: 'mapa_encerrar' }); }, '', 'fechar');
      if (OFJ.eu >= 0) it('FALAS RÁPIDAS (T)', () => OFJ.falasMenu(), '', 'pessoas');
      it('MENSAGEM PARA A SALA', () => OFJ.chatRapido(), '', 'pessoas');
      it('SAIR DA SALA', async () => { OFJ.fechaMenu(); if (await ofjConfirma('Sair da sala?', OFJ.eu >= 0 ? 'Um bot assume a sua tampinha até a partida acabar.' : 'Você para de assistir.')) { OFS.sai(true); } }, 'verm', 'voltar');
    }
  });
};
function ofjConfirma(tit, tx) {
  return new Promise(res => {
    ofjMenu(tit, c => {
      c.appendChild(h('p.ofj-tx', { texto: tx }));
      c.appendChild(h('div.ofj-lado', botao('CANCELAR', () => { OFJ.fechaMenu(); res(false); }, 'ofj-item escuro'), botao('SIM', () => { OFJ.fechaMenu(); res(true); }, 'ofj-item verm')));
    });
  });
}
OFJ.chatRapido = function () {
  const R = OFJ.rede; if (!R) return;
  const fr = ['Boa!', 'Toca!', 'Tô livre!', 'Foi mal', 'Que golaço!', 'Bora!', 'Segura aí', 'GG'];
  ofjMenu('MENSAGEM PARA A SALA', c => {
    const g = h('div.ofj-rapidas');
    for (const t of fr) g.appendChild(botao(t, () => { mandaSala({ type: 'say', text: t }); OFJ.fechaMenu(); }, 'ofj-item escuro'));
    const i = h('input.ofi-in', { type: 'text', maxLength: 120, placeholder: 'Escreva…', autocomplete: 'off' });
    i.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter' && i.value.trim()) { mandaSala({ type: 'say', text: i.value.trim() }); OFJ.fechaMenu(); } });
    poe(c, g, h('div.ofj-lado', i, botao('MANDAR', () => { if (i.value.trim()) mandaSala({ type: 'say', text: i.value.trim() }); OFJ.fechaMenu(); }, 'ofj-item ama')), botao('FECHAR', () => OFJ.fechaMenu(), 'ofj-item escuro'));
  });
};
OFJ.recado = function (m) {                            // (a mensagem da sala no meio da partida: um balão pequeno em cima)
  if (!OFJ.on || !m || !m.text) return;
  const el = OFJ.camada(), b = h('div.ofj-recado', h('b', { texto: (m.sys ? '' : (m.name || 'Jogador') + ': ') }), h('span', { texto: m.text }));
  el.appendChild(b); setTimeout(() => b.classList.add('sai'), 3800); setTimeout(() => b.remove(), 4400);
  const l = el.querySelectorAll('.ofj-recado'); if (l.length > 3) l[0].remove();
};
function ofjResultado(m) {
  const M = OFJ.M, T = M.partida.times, E = M.partida.equipes, sc = Array.isArray(m.score) ? m.score : [];
  const venc = Number.isInteger(m.winner) ? m.winner : -1, P = OFJ.mundo(), meuT = OFJ.eu >= 0 && P && P.jog[OFJ.eu] ? P.jog[OFJ.eu].time : -1;
  const tit = m.valida === false ? 'PARTIDA ENCERRADA' : venc < 0 ? 'EMPATE!' : meuT >= 0 ? (meuT === venc ? 'VITÓRIA!' : 'DERROTA') : 'VITÓRIA DO ' + String((T[venc] || {}).nome || NOME_TIME(venc)).toUpperCase();
  try { if (meuT >= 0 && venc === meuT) ofjConfete(T[venc] ? T[venc].cor : '#ffd23f', 160); } catch (_) {}
  ofjMenu(tit, c => {
    c.classList.add('ofj-fim');
    const placar = h('div.ofj-placar');
    for (let t = 0; t < E; t++) placar.appendChild(h('div.ofj-pl-time' + (t === venc ? '.venc' : ''), { style: { '--c': (T[t] || {}).cor || '#fff' } }, h('i'), h('span', { texto: (T[t] || {}).nome || NOME_TIME(t) }), h('b', { texto: String(sc[t] | 0) })));
    c.appendChild(placar);
    if (m.valida === false && m.motivo) c.appendChild(h('p.ofj-tx', { texto: 'O resultado não vale: ' + m.motivo + '.' }));
    try { const cq = ofjCraque(m, venc); if (cq) c.appendChild(cq); } catch (_) {}
    const jog = (m.jog || []).filter(j => !j.vazio).sort((a, b) => (b.gols - a.gols) || (b.assist - a.assist));
    if (jog.length) {
      const l = h('div.ofj-jog');
      for (const j of jog.slice(0, 16)) l.appendChild(h('div.ofj-jog-l' + ((j.id && (j.id === NET49.id || j.id === 'eu')) ? '.eu' : ''), h('i', { style: { background: (T[j.time] || {}).cor || '#fff' } }), h('span', { texto: (j.nome || 'Bot') + (j.bot ? ' (bot)' : '') }), h('b', { texto: (j.gols | 0) + ' G · ' + (j.assist | 0) + ' A' })));
      c.appendChild(l);
    }
    c.appendChild(h('p.ofj-tx.peq', { texto: (m.duracao ? 'Duração: ' + ofjRelogio(m.duracao) + ' · ' : '') + 'Partida da Oficina: não conta para a ranqueada, o XP nem os troféus.' }));
    const bts = h('div.ofj-lado');
    if (m.local) poe(bts, botao('JOGAR DE NOVO', () => OFJ.reinicia(), 'ofj-item ama', 'girar'), botao(OFJ.cfg.volta === 'editor' ? 'VOLTAR AO EDITOR' : 'SAIR', () => OFJ.sai(), 'ofj-item escuro', 'voltar'));
    else poe(bts, botao('VOLTAR PARA A SALA', () => OFJ.sai('sala'), 'ofj-item ama', 'pessoas'), botao('SAIR DA SALA', () => { OFS.sai(true); }, 'ofj-item escuro', 'voltar'));
    c.appendChild(bts);
  });
}

/* ---------------------------------------------------------------- v93 na Oficina: o cartão de quem fez o gol, os balões e o craque */
// quem é (para o cartão e o craque): o nome, a tampinha, o avatar e o banner equipados — você, alguém da sala ou um bot
function ofjPessoa(i) {
  const W0 = OFJ.mundo(), q = W0 && i >= 0 ? W0.jog[i] : null; if (!q) return null;
  const T = (OFJ.M.partida.times[q.time] || {});
  if (OFJ.modo === 'rede') {
    const R = OFJ.rede, id = R && R.room ? R.room.roster[i] : null, mem = id && R.room.members.find(x => x.id === id), cos = mem && mem.cos || null;
    if (mem) return { nome: mem.name, skin: mem.skin || '', avatar: cos && cos.avatar || '', banner: cos && cos.banner || '', time: q.time, cor: T.cor, bot: false, eu: id === NET49.id };
    return { nome: q.nome || 'Bot', skin: '', time: q.time, cor: T.cor, bot: true };
  }
  if (i === OFJ.eu) { let cos = null; try { cos = typeof v88Cos === 'function' ? v88Cos(P) : null; } catch (_) {} return { nome: (perfil && perfil.nome) || 'Você', skin: (perfil && perfil.skin) || '', avatar: cos && cos.avatar || '', banner: cos && cos.banner || '', time: q.time, cor: T.cor, eu: true }; }
  return { nome: q.nome || 'Bot', skin: '', time: q.time, cor: T.cor, bot: true };
}
function ofjCartaoNovo(e) {
  if (!e || e.time < 0) { OFJ.golCard = null; return null; }
  const autor = e.contra ? null : ofjPessoa(e.j), assist = e.contra ? null : ofjPessoa(e.ja);
  if (!autor && !e.contra) { OFJ.golCard = null; return null; }
  OFJ.golCard = { autor, assist: assist && assist !== autor ? assist : null, time: e.time, contra: !!e.contra, contraNome: e.contraName || '', pts: e.pts | 0, t0: OFJ.t };
  return OFJ.golCard;
}
function ofjAvatar(g, p, x, y, r) {                    // o avatar equipado; sem ele, a tampinha; sem ela (bot), a tampinha do bot na cor do time
  try {
    const it = p.avatar && p.avatar !== 'av_tampinha' && typeof v88Item === 'function' ? v88Item(p.avatar) : null;
    if (it && typeof v88DesenhaAvatar === 'function' && typeof v93MiniAvatar === 'function') { const c = v93MiniAvatar(it); if (c) { g.drawImage(c, x - r, y - r, 2 * r, 2 * r); return; } }
    if (p.skin && typeof tpLe === 'function' && tpLe(p.skin) && typeof tpMiniatura === 'function') { g.drawImage(tpMiniatura(tpLe(p.skin), 96), x - r, y - r, 2 * r, 2 * r); return; }
  } catch (_) {}
  g.fillStyle = p.cor || '#ffffff'; g.beginPath(); g.arc(x, y, r * .86, 0, TAU); g.fill(); g.lineWidth = Math.max(2, r * .12); g.strokeStyle = '#05060c'; g.stroke();
  g.fillStyle = clareia(p.cor || '#ffffff', .45); g.beginPath(); g.arc(x - r * .22, y - r * .28, r * .26, 0, TAU); g.fill();
}
const OFJ_CARTAO_S = 3.2;
function ofjCartaoGol(g) {                             // o cartão num canto (entra e sai rápido), como o do replay da v93
  const C = OFJ.golCard; if (!C) return;
  const t = OFJ.t - C.t0; if (t > OFJ_CARTAO_S) { OFJ.golCard = null; return; }
  const ent = Math.min(1, t / .28), sai = Math.min(1, (OFJ_CARTAO_S - t) / .3), a = Math.max(0, Math.min(ent, sai)); if (a <= 0) return;
  const autor = C.autor, assist = C.assist, cor = (OFJ.M.partida.times[C.time] || {}).cor || '#ffd23f';
  const w = 470, hh = assist ? 128 : 104, x = 34 - (1 - ent) * 120, y = 112;
  const caixa = () => { g.beginPath(); g.roundRect ? g.roundRect(x, y, w, hh, 22) : g.rect(x, y, w, hh); };
  g.save(); g.globalAlpha = a;
  g.save(); g.translate(0, 5); caixa(); g.fillStyle = 'rgba(0,0,0,.32)'; g.fill(); g.restore();
  g.save(); caixa(); g.clip();
  const ban = autor && autor.banner && typeof v88Item === 'function' ? v88Item(autor.banner) : null;
  if (ban && typeof v88DesenhaBanner === 'function') { g.save(); g.translate(x, y); try { v88DesenhaBanner(g, w, hh, ban, 0); } catch (_) {} g.restore(); }
  else { const gr = g.createLinearGradient(x, y, x + w, y + hh); gr.addColorStop(0, cor); gr.addColorStop(1, '#0b0820'); g.fillStyle = gr; g.fillRect(x, y, w, hh); }
  const sombra = g.createLinearGradient(x, 0, x + w, 0); sombra.addColorStop(0, 'rgba(6,8,26,.25)'); sombra.addColorStop(.55, 'rgba(6,8,26,.72)'); sombra.addColorStop(1, 'rgba(6,8,26,.86)');
  g.fillStyle = sombra; g.fillRect(x, y, w, hh); g.fillStyle = cor; g.fillRect(x, y, 10, hh);
  g.restore();
  caixa(); g.lineWidth = 4; g.strokeStyle = 'rgba(255,255,255,.85)'; g.stroke();
  const ax = x + 64, ay = y + (assist ? 56 : hh / 2), ar = 40;
  g.fillStyle = '#0b0820'; g.beginPath(); g.arc(ax, ay, ar + 5, 0, TAU); g.fill();
  if (autor) ofjAvatar(g, autor, ax, ay, ar);
  else { g.save(); g.font = '400 44px "Lilita One","Anton",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#ff6b6b'; g.fillText('!', ax, ay + 2); g.restore(); }
  g.lineWidth = 4; g.strokeStyle = cor; g.beginPath(); g.arc(ax, ay, ar + 3, 0, TAU); g.stroke();
  const tx = x + 124, esq = (s, yy, tam, c, lw) => {   // (o texto alinhado à esquerda, cabendo na caixa)
    g.font = '400 ' + tam + 'px "Lilita One","Anton",sans-serif'; const mw = g.measureText(s).width, k = Math.min(1, (w - 140) / Math.max(1, mw));
    g.font = '400 ' + Math.floor(tam * k) + 'px "Lilita One","Anton",sans-serif'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.lineJoin = 'round';
    g.lineWidth = lw; g.strokeStyle = 'rgba(5,10,25,.95)'; g.strokeText(s, tx, yy); g.fillStyle = c; g.fillText(s, tx, yy);
  };
  esq(C.contra ? 'GOL CONTRA' : C.pts > 1 ? '+' + C.pts + ' PONTOS!' : 'GOL!', y + 30, 26, '#ffd23f', 5);
  esq(autor ? String(autor.nome || '').toUpperCase() + (autor.bot ? ' · BOT' : '') : String(C.contraNome || 'CONTRA').toUpperCase(), y + 68, 40, '#ffffff', 7);
  if (assist) esq('ASSISTÊNCIA · ' + String(assist.nome || '').toUpperCase(), y + 104, 22, '#cfe0ff', 5);
  g.restore();
}
// os balões de fala rápida (as frases da v93: só as prontas; online o servidor confere o ritmo e quem bloqueou não recebe)
const OFJ_FRASES = typeof V93F_FRASES !== 'undefined' ? V93F_FRASES : ['Golaço!', 'Que defesa!', 'Passa!', 'Boa!', 'Foi mal!', 'Obrigado!', 'Sem problemas!', 'Minha culpa!'];
OFJ.baloes = new Map(); OFJ.falaUlt = 0;
OFJ.falasMenu = function () {
  if (!OFJ.on || OFJ.eu < 0) return;
  ofjMenu('FALAS RÁPIDAS', c => {
    const g = h('div.ofj-rapidas');
    OFJ_FRASES.forEach((t, i) => g.appendChild(botao(t, () => { OFJ.fechaMenu(); OFJ.fala(i); }, 'ofj-item escuro')));
    const desl = typeof V93F !== 'undefined' && V93F.desl;
    poe(c, g, botao(desl ? 'BALÕES: DESLIGADOS' : 'BALÕES: LIGADOS', () => { try { V93F.desl = !V93F.desl; v93FalaGuarda(); } catch (_) {} OFJ.fechaMenu(); }, 'ofj-item escuro', 'olho'), botao('FECHAR', () => OFJ.fechaMenu(), 'ofj-item escuro'));
  });
};
OFJ.fala = function (i) {
  if (!(i >= 0 && i < OFJ_FRASES.length) || OFJ.eu < 0) return false;
  const agora = performance.now(); if (agora - OFJ.falaUlt < 1600) { try { som.erro(); } catch (_) {} return false; }
  OFJ.falaUlt = agora;
  OFJ.baloes.set(OFJ.eu, { i, t0: agora });
  if (OFJ.modo === 'rede') mandaSala({ type: 'fala', i });
  try { som.clique(); } catch (_) {}
  return true;
};
OFJ.falaRede = function (m) { if (!m || !Number.isInteger(m.i) || !Number.isInteger(m.slot) || m.id === NET49.id) return; OFJ.baloes.set(m.slot, { i: m.i, t0: performance.now() }); };
function ofjBaloes(g, P, jx, jy) {
  if (!OFJ.baloes.size) return;
  const agora = performance.now(); for (const [k, b] of OFJ.baloes) if (agora - b.t0 > 2600) OFJ.baloes.delete(k);
  if (typeof V93F !== 'undefined' && V93F.desl) return;
  g.save(); g.font = '400 26px "Lilita One","Anton",sans-serif'; g.textBaseline = 'middle'; g.textAlign = 'center';
  for (const [i, b] of OFJ.baloes) {
    const q = P.jog[i]; if (!q || q.fora || q.vazio) continue;
    const [sx, sy] = ofjTela(jx(q, i), jy(q, i)), r0 = q.r * OFJ.z, s = OFJ_FRASES[b.i] || '';
    const w = Math.ceil(g.measureText(s).width) + 34, hh = 46, t = agora - b.t0, ent = Math.min(1, t / 140), sai = Math.min(1, (2600 - t) / 320), al = Math.max(0, Math.min(ent, sai));
    let x = sx - w / 2, y = sy - r0 - 18 - hh - 22; const embaixo = y < 96; if (embaixo) y = sy + r0 + 18;   // (sem lugar em cima — o placar —, embaixo da tampinha)
    x = Math.max(8, Math.min(W - 8 - w, x)); y = Math.max(8, Math.min(H - 8 - hh, y));
    const cor = (OFJ.M.partida.times[q.time] || {}).cor || '#ffd23f', ca = Math.max(x + 16, Math.min(x + w - 16, sx));
    g.save(); g.globalAlpha = al;
    const caixa = () => { g.beginPath(); g.roundRect ? g.roundRect(x, y, w, hh, 18) : g.rect(x, y, w, hh); };
    g.save(); g.translate(3, 5); caixa(); g.fillStyle = 'rgba(8,4,24,.3)'; g.fill(); g.restore();
    caixa(); g.fillStyle = '#ffffff'; g.fill(); g.lineWidth = 3.5; g.strokeStyle = '#14102e'; g.stroke();
    const by = embaixo ? y : y + hh, ty = embaixo ? sy + r0 + 4 : sy - r0 - 4;
    g.beginPath(); g.moveTo(ca - 11, by); g.lineTo(sx, ty); g.lineTo(ca + 11, by); g.closePath(); g.fillStyle = '#ffffff'; g.fill(); g.stroke();
    g.fillStyle = '#ffffff'; g.fillRect(ca - 10, embaixo ? by : by - 3, 20, 4);
    g.fillStyle = cor; g.fillRect(x + 7, y + 7, 6, hh - 14);
    g.fillStyle = '#1b1530'; g.fillText(s, x + w / 2 + 3, y + hh / 2 + 1);
    g.restore();
  }
  g.restore();
}
// o craque da partida (a conta da v93 com o que a partida no mapa conta: gols, assistências, gols contra e o resultado)
function ofjCraque(m, venc) {
  const L = (m.jog || []).filter(j => !j.vazio).map(j => ({ k: j.id || null, i: j.i, nome: j.nome || 'Bot', bot: !!j.bot, time: j.time | 0, g: j.gols | 0, a: j.assist | 0, d: 0, r: 0, c: 0, p: 0, cg: 0 }));
  const c = typeof v93Craque === 'function' ? v93Craque(L, venc) : null; if (!c) return null;
  const p = ofjPessoa(c.i) || { nome: c.nome, time: c.time, bot: c.bot }, eu = !!(p && p.eu), T = OFJ.M.partida.times[c.time] || {};
  const av = h('canvas.ofj-craque-av', { width: 88, height: 88, 'aria-hidden': 'true' });
  try { ofjAvatar(av.getContext('2d'), Object.assign({ cor: T.cor }, p), 44, 44, 40); } catch (_) {}
  const nums = h('div.ofj-craque-n', ...[[c.g, 'GOLS'], [c.a, 'ASSIST.']].map(([v, r]) => h('span', h('b', { texto: String(v | 0) }), h('small', { texto: r }))));
  return h('div.ofj-craque' + (eu ? '.eu' : ''), { style: { '--c': T.cor || '#ffd23f' } }, av,
    h('div.ofj-craque-tx', h('span.ofj-craque-tag', { texto: eu ? 'VOCÊ É O CRAQUE DA PARTIDA' : 'CRAQUE DA PARTIDA' }), h('b', { texto: (p && p.nome || c.nome) + (c.bot ? ' · BOT' : '') }), nums));
}

/* ---------------------------------------------------------------- os ajustes finos na Oficina: as linhas da bola e a extrapolação
   A mesma ideia do jogo (tools/ajustes/linhas.js), com o motor do mapa: uma partida de mentira do mesmo mapa (sem ninguém,
   sem a lógica nem os gols — o modo previsão), com os objetos que mexem no mesmo estado da partida de verdade, roda a bola
   à frente. Os portais, as paredes que andam, os portões e as zonas que empurram entram; os outros jogadores, não. */
function ofjSimL() {
  if (OFJ.simL && OFJ.simL.mapa === OFJ.M) return OFJ.simL.P;
  const M = OFJ.M, mm = Object.assign({}, M, { __G: OFJ.G });
  const S = RM.novaPartida(mm, { jogadores: Array.from({ length: M.partida.equipes * M.partida.porTime }, () => ({ vazio: true })), previsao: true, seed: 3 });
  OFJ.simL = { mapa: M, P: S };
  return S;
}
function ofjSimSync(S, V) {                            // a partida de mentira no estado da de verdade (o relógio, os objetos, a bola)
  S.tick = V.tick; S.tj = V.tj; S.t = V.t; S.estado = 'jogo'; S.pausado = false; S.on = true; S.encerrado = false;
  for (const i of S.G.dinamicos) {
    const a = V.D[i], d = S.D[i]; if (!a || !d) continue;
    d.on = a.on; d.vis = a.vis; d.aberto = a.aberto; d.ligado = a.ligado; d.press = a.press; d.ax = a.ax; d.ox = a.ox; d.oy = a.oy;
    d.tw = a.tw ? Object.assign({}, a.tw) : null; d.temp = a.temp; d.T = a.T ? Object.assign({}, a.T) : d.T; d.vx = a.vx; d.vy = a.vy; d.va = a.va;
  }
  Object.assign(S.B, { x: V.B.x, y: V.B.y, vx: V.B.vx, vy: V.B.vy, w: V.B.w || 0, cv: V.B.cv || 0, cvT: V.B.cvT || 0, cvUx: V.B.cvUx == null ? null : V.B.cvUx, cvUy: V.B.cvUy == null ? null : V.B.cvUy });
  for (const q of S.jog) { q.fora = true; q.vazio = true; q.mx = q.my = 0; }
}
// roda a bola: forca > 0 = o chute agora (com o seu corpo andando com o analógico de agora nos primeiros passos)
function ofjSimRoda(V, eu, forca, n) {
  const S = ofjSimL(); ofjSimSync(S, V);
  const B = S.B, C = S.C, q = eu ? S.jog[eu.i] : null, d = eu ? RN.direcao(OFJ.ultInp ? OFJ.ultInp.mx : 0, OFJ.ultInp ? OFJ.ultInp.my : 0, C.DIRECOES) : null;
  if (q && eu) {
    Object.assign(q, { fora: false, vazio: false, bot: null, ai: null, cinematico: false, x: eu.x, y: eu.y, vx: eu.vx, vy: eu.vy, r: eu.r, m: eu.m, time: eu.time, chuteT: -99 });
    if (forca > 0) {                                  // (o chute do motor do mapa: o impulso, o giro zerado, o recuo; um pouco fora do alcance, a mesma conta)
      let dx = B.x - q.x, dy = B.y - q.y, dd = Math.hypot(dx, dy); if (dd === 0) { dx = 1; dy = 0; dd = 1; }
      B.w = 0; const dv = U(forca * ((C.EXTRA && C.EXTRA.massaChute) || 1) / B.m); B.vx += dx / dd * dv; B.vy += dy / dd * dv;
      if (S.jogo === 'curva') B.cvT = 0;
      if (C.EXTRA && C.EXTRA.recuo > 0) { const r = dv * C.EXTRA.recuo * 0.35; q.vx -= dx / dd * r; q.vy -= dy / dd * r; }
    }
  }
  const pts = [B.x, B.y], bat = [], golCr = RM.__interno.golCruzou;
  let gol = -1, vx = B.vx, vy = B.vy;
  for (let i = 0; i < n; i++) {
    if (q && i === LN_CORPO_PASSOS) q.fora = true;
    const x0 = B.x, y0 = B.y;
    S.passo(qq => { if (qq === q && d) { qq.mx = d.mx; qq.my = d.my; } else { qq.mx = qq.my = 0; } });
    pts.push(B.x, B.y);
    if (lnVirou(vx, vy, B.vx, B.vy)) bat.push([B.x, B.y, i + 1]);
    vx = B.vx; vy = B.vy;
    const k = golCr(S, x0, y0, B.x, B.y); if (k >= 0) { gol = k; break; }
    if (Math.abs(B.vx) + Math.abs(B.vy) < U(.5) && i > 2) break;
  }
  let golC = null;
  if (gol >= 0) { const g = RM.golAtual(S, gol), dono = RM.timeDoLado(S, g.dono); golC = eu && dono >= 0 && dono === eu.time ? 'contra' : 'gol'; }
  return { pts, bat, gol: gol >= 0 ? 1 : 0, golC, fimX: B.x, fimY: B.y };
}
function ofjLinhas(g, P) {
  OFJ.ultInp = OFJ.ultInp || { mx: 0, my: 0 };
  const c = typeof AJF !== 'undefined' ? AJF.cfg : null;
  if (!c || !ofjComLinhas() || (c.linhaChute === 'nao' && !c.linhaBola) || OFJ.menu || OFJ.fimRes || !(P.estado === 'jogo' || P.estado === 'saida')) { OFJ.linhas = null; return; }
  const n = Math.round((LN_TEMPO[c.linhaTam] || 3) * RM.TPS), eu = OFJ.eu >= 0 ? P.jog[OFJ.eu] : null, B = P.B, C = P.C;
  const L = OFJ.linhas || (OFJ.linhas = { mira: null, miraK: '', miraN: -99, cam: null });
  const dist = eu && !eu.fora ? Math.hypot(B.x - eu.x, B.y - eu.y) : 1e9, perto = c.linhaChute !== 'nao' && dist <= C.ALCANCE_CHUTE * 1.6;
  if (perto) {
    const k = c.linhaChute + '|' + n + '|' + Math.round(B.x) + ',' + Math.round(B.y) + '|' + Math.round(eu.x) + ',' + Math.round(eu.y) + '|' + Math.round(B.vx / 8) + ',' + Math.round(B.vy / 8) + '|' + OFJ.ultInp.mx.toFixed(2) + ',' + OFJ.ultInp.my.toFixed(2);
    if (k !== L.miraK && (Math.abs(P.tick - L.miraN) >= 3 || !L.mira)) {
      L.mira = { forte: ofjSimRoda(P, eu, C.FORCA_POWER, n), fraco: c.linhaChute === 'ambos' ? ofjSimRoda(P, eu, C.FORCA_KICK, n) : null };
      L.miraK = k; L.miraN = P.tick;
    }
    L.mira.no = dist <= C.ALCANCE_CHUTE;
  } else L.mira = null;
  const anda = Math.hypot(B.vx, B.vy) > U(2.5), colado = eu && dist <= eu.r + C.R_BOLA + 3;
  if (c.linhaBola && anda && !colado && !perto) {
    let ok = L.cam && L.cam.n === n;
    if (ok) { const i = P.tick - L.cam.t0; ok = i >= 0 && 2 * i + 1 < L.cam.pts.length && Math.hypot(L.cam.pts[2 * i] - B.x, L.cam.pts[2 * i + 1] - B.y) < 1.5; }
    if (!ok) L.cam = Object.assign(ofjSimRoda(P, null, 0, n), { n, t0: P.tick });
  } else L.cam = null;
  const rb = C.R_BOLA;                                  // v95: os pontinhos (o caminho da bola mais fraco; o PASSE, azul e menor)
  L.pontos = 0;
  if (L.cam) L.pontos += lnDesenhaPontos(g, L.cam, { cor: '#ffffff', alfa: .62, some: true, de: Math.max(0, P.tick - L.cam.t0), rb, golC: L.cam.golC });
  if (L.mira) {
    const a = L.mira.no ? .95 : .45;
    if (L.mira.fraco) L.pontos += lnDesenhaPontos(g, L.mira.fraco, { cor: '#8fd3ff', alfa: a * .85, some: true, de: 0, rb, golC: L.mira.fraco.golC, raio: rb * .24 });
    L.pontos += lnDesenhaPontos(g, L.mira.forte, { cor: '#ffffff', alfa: a, some: true, de: 0, rb, golC: L.mira.forte.golC });
  }
}
function ofjExtrapola(P) {                             // (os ajustes finos › ONLINE: o jogo uns ms à frente — a bola pelo motor do mapa, as tampinhas na direção delas)
  const ms = typeof AJF !== 'undefined' ? AJF.cfg.extrapola | 0 : 0;
  if (!(ms > 0) || !(P.estado === 'jogo' || P.estado === 'saida')) return null;
  const n = Math.max(1, Math.min(12, Math.round(ms * RM.TPS / 1000))), t = n / RM.TPS, G = P.G;
  const S = ofjSimL(); ofjSimSync(S, P);
  const B = S.B, x0 = B.x, y0 = B.y;
  for (let i = 0; i < n; i++) S.passo(null);
  const ex = { b: [B.x - x0, B.y - y0], j: P.jog.map(q => { if (q.fora || q.vazio) return [0, 0]; const nx = Math.max(G.GL + q.r, Math.min(G.GR - q.r, q.x + q.vx * t)), ny = Math.max(G.GT + q.r, Math.min(G.GB - q.r, q.y + q.vy * t)); return [nx - q.x, ny - q.y]; }) };
  return ex;
}
