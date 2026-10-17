/* =====================================================================
   RACHA rua · v70 — Etapa 5: ONLINE (entra no fim do script do jogo, depois do tutorial.js; as trocas de texto
   estão em tools/v70/online.py). O servidor da turma está em server/ (node server/servidor.js).
   1) A conta do RACHA no servidor: o bilhete assinado pela plataforma vai no hello (o servidor reconhece a conta e
      assina o resultado de cada um: o selo, que a plataforma confere antes de dar XP da partida online).
   2) Os mesmos controles para anfitrião e convidado: o comando do convidado leva k (1 = CURVA segurada · 2 = FINTA ·
      4 = DRIBLE); o anfitrião roda para ele as mesmas regras do botão dele (carga, lado pelo analógico, armado ao soltar;
      espera da finta e do drible; quem cai na finta). A carga e a espera aparecem na tela do convidado.
   3) Demonstração sem servidor (RACHA_SEM_REDE), endereço do config.js, a mesma conta aberta em outra aba,
      quem volta no meio da partida (o placar certo, o lugar de volta, o anfitrião devolve o boneco).
   4) O resultado conferido pelo servidor: o que não vale aparece como NÃO VALEU (sem prêmio).
   5) Os eventos para a plataforma (RACHA_EVT): começo e fim UMA vez por partida — contra os bots (o começo é quando a
      bola rola) e nas salas (sair no meio = abandono; a partida parada pelo servidor fecha sem prêmio).
   6) A sala: ENTRAR NO TIME e MONTAR COM BOTS perto do INICIAR.
   ===================================================================== */
const V70ON = {bilhete:null, bilheteT:0, clubeConta:null, pub:'', conta:false, outraAba:false, ev:null, evSeq:0, saindo:false,
  cai:[], caiSaida:-1, gingaConv:0};

/* ---------------------------------------------------------------- 1) a conta do RACHA e o clube da conta */
function v70Plataforma(){ try { return typeof tpePlataforma === 'function' ? tpePlataforma() : null; } catch (_) { return null; } }
function v70ContaLogada(){ const pl = v70Plataforma(); try { return !!(pl && typeof pl.conta === 'function' && pl.conta()); } catch (_) { return false; } }
function v70PedeBilhete(){                                 // o bilhete da conta (curto, assinado pela plataforma); sem conta ou sem segredo: nada
  const pl = v70Plataforma(); if (!pl || typeof pl.bilheteSala !== 'function' || !v70ContaLogada()) return;
  Promise.resolve().then(() => pl.bilheteSala()).then(b => { if (typeof b === 'string' && b.length > 20 && b.length < 600){ V70ON.bilhete = b; V70ON.bilheteT = Date.now(); } }).catch(() => {});
}
function v70ClubeDaConta(){                                // o clube da conta (para o cartão da sala mostrar o escudo certo)
  const pl = v70Plataforma(); if (!pl || !pl.clubes || !v70ContaLogada()) return;
  Promise.resolve().then(() => pl.clubes.meu()).then(c => {
    const novo = c && c.nome ? {nome:String(c.nome), escudo:String(c.escudo || '')} : null;
    if (JSON.stringify(novo) === JSON.stringify(V70ON.clubeConta)) return;
    V70ON.clubeConta = novo; v70Perfil();
  }).catch(() => {});
}
function v70HelloExtra(){
  const o = {};
  if (V70ON.bilhete && Date.now() - V70ON.bilheteT < 25*60e3) o.conta = V70ON.bilhete;
  if (V70ON.clubeConta) o.clube = V70ON.clubeConta;
  return o;
}
function v70Perfil(){ if (NET49.id && !SLOC.on) net49Send({type:'profile', name:perfil.nome, skin:perfil.skin, avatar:perfil.avatar, clube:V70ON.clubeConta}); }
setTimeout(() => { v70PedeBilhete(); v70ClubeDaConta(); }, 1200);
setInterval(v70PedeBilhete, 9*60e3);

/* ---------------------------------------------------------------- 2) os mesmos controles para quem joga de fora */
function v70Joga(){ return v61Humano() || (NET49.playing && !NET49.host && NET49.localSlot >= 0 && RQ.on); }   // (CURVA, FINTA e DRIBLE na tela)
function v70ConvidadoK(mx, my){                            // (o convidado, a cada passo) o que vai no comando · e a carga/espera na tela dele
  let k = 0;
  if (!RQ.on) return 0;
  const vale = RQ.estado === 'jogo' || RQ.estado === 'saida';
  if (RQ.jogo === 'curva'){
    const seg = cvSegurada() || CV.toque; CV.toque = false;
    if (seg && vale) k |= 1;
    if (!vale){ CV.carga = 0; CV.segura = false; CV.arma = 0; }
    else {                                                 // (a mesma conta do cvAmostra, só para mostrar: quem chuta é o anfitrião)
      CV.mx = mx; CV.my = my;
      if (seg){ CV.segura = true; CV.carga = Math.min(1, CV.carga + STEP/CV_CARGA_S); CV.arma = 0; }
      else {
        if (CV.segura){ CV.segura = false; CV.armaC = Math.max(CV.carga, STEP/CV_CARGA_S); CV.carga = 0; CV.arma = CV_ARMA_S; }
        if (CV.arma > 0) CV.arma = Math.max(0, CV.arma - STEP);
      }
    }
  } else if (RQ.jogo === 'ginga'){
    if (GN.pedeF && vale && RQ.tick >= (P.gnCdF || 0)){ k |= 2; P.gnCdF = RQ.tick + gnTk(GN_FINTA_CD); }    // (a espera na tela; quem decide é o anfitrião)
    if (GN.pedeD && vale && RQ.tick >= (P.gnCdD || 0)){ k |= 4; P.gnCdD = RQ.tick + gnTk(GN_DRIBLE_CD); }
    GN.pedeF = GN.pedeD = false;
  }
  return k;
}
function v70ComoGente(q, fn){ const h = q.humano; q.humano = true; try { fn(); } finally { q.humano = h; } }   // (as esperas e o toque de gente, não de bot)
function v70CvChuta(q, c, mx, my){                         // o chute de curva de quem joga de fora: o mesmo do botão do anfitrião (cvChuta)
  let dx = B.x - q.x, dy = B.y - q.y, d = Math.hypot(dx, dy);
  if (d > ALCANCE_CHUTE) return false;
  if (d === 0){ dx = 1; dy = 0; d = 1; }
  if (!rqChuta(q, CV_FORCA)) return false;               // (a força do CHUTE; o rqChuta conta o toque, o lance e o efeito no aro)
  cvMarca(cvSinal(dx/d, dy/d, mx, my), c);               // o efeito pela carga e o lado pelo analógico dele
  try { som.curva(c); } catch (_) {}
  return true;
}
function v70Remoto(q, f, vale, dir){                       // (o anfitrião, a cada passo, para cada convidado) depois do PASSE/CHUTE dele
  if (!RQ.on || !q || !f) return;
  if (RQ.jogo === 'curva'){
    const s = q.cv70 || (q.cv70 = {carga:0, segura:false, arma:0, armaC:0});
    if (!vale){ s.carga = 0; s.segura = false; s.arma = 0; return; }
    if (dir && (dir.k & 1)){ s.segura = true; s.carga = Math.min(1, s.carga + STEP/CV_CARGA_S); s.arma = 0; return; }
    if (s.segura){ s.segura = false; s.armaC = Math.max(s.carga, STEP/CV_CARGA_S); s.carga = 0; s.arma = CV_ARMA_S; }
    if (s.arma > 0){ if (v70CvChuta(q, s.armaC, q.mx, q.my)) s.arma = 0; else s.arma = Math.max(0, s.arma - STEP); }
  } else if (RQ.jogo === 'ginga'){
    if (!vale){ f.pedeF = false; f.pedeD = null; return; }
    if (f.pedeF){ f.pedeF = false; if (RQ.tick >= (q.gnCdF || 0)) v70ComoGente(q, () => gnFinta(q)); }
    if (f.pedeD){
      const p = f.pedeD; f.pedeD = null;
      if (RQ.tick >= (q.gnCdD || 0)){
        let ux = p.x, uy = p.y;                            // (como o do anfitrião: o analógico; solto, para onde estava virado; sem nada, para a bola)
        if (!ux && !uy){ ux = q.gnFx || 0; uy = q.gnFy || 0; }
        if (!ux && !uy){ const dx = B.x - q.x, dy = B.y - q.y, d = Math.hypot(dx, dy) || 1; ux = dx/d; uy = dy/d; }
        const l = Math.hypot(ux, uy) || 1; v70ComoGente(q, () => gnDrible(q, ux/l, uy/l));
      }
    }
    if ((q.mx || q.my) && !(q.gnB > RQ.tick)){ q.gnFx = q.mx; q.gnFy = q.my; }
  }
}
// quem joga de fora também cai na finta (a mesma conta do anfitrião: foi para o lado do lance falso)
const gnFintaAntes70o = gnFinta;
gnFinta = function(q){
  gnFintaAntes70o(q);
  try {
    if (!NET49.playing || !NET49.host || !RQ.on) return;
    let dx = B.x - q.x, dy = B.y - q.y, d = Math.hypot(dx, dy);
    if (d > ALCANCE_CHUTE*1.5) return;
    if (d === 0){ dx = 1; dy = 0; d = 1; }
    const ux = dx/d, uy = dy/d;
    for (const o of RQ.jog){
      if (o.time === q.time || !o.remote) continue;
      const gk = o.papel === 'gk', dq = Math.min(Math.hypot(o.x - q.x, o.y - q.y), Math.hypot(o.x - B.x, o.y - B.y));
      if (dq > (gk ? U(16) : U(9))) continue;
      const t = Math.max(0, (o.x - B.x)*ux + (o.y - B.y)*uy), px = B.x + ux*t - o.x, py = B.y + uy*t - o.y, pl = Math.hypot(px, py);
      if (pl > o.r*.5) V70ON.cai.push({q, o, t0:RQ.tick, x:o.x, y:o.y, nx:px/pl, ny:py/pl});
    }
  } catch (e) { console.error(e); }
};
const gnAvaliaAntes70o = gnAvalia;
gnAvalia = function(){
  gnAvaliaAntes70o();
  if (V70ON.caiSaida !== GN.saidaT0){ V70ON.caiSaida = GN.saidaT0; V70ON.cai.length = 0; }
  const L = V70ON.cai;
  for (let i = L.length - 1; i >= 0; i--){
    const c = L[i];
    if (RQ.jog.indexOf(c.o) < 0 || RQ.jog.indexOf(c.q) < 0){ L.splice(i, 1); continue; }
    if ((c.o.x - c.x)*c.nx + (c.o.y - c.y)*c.ny > U(1.2)){ L.splice(i, 1); gnFez(c.q, 'finta'); }
    else if (RQ.tick - c.t0 > 27) L.splice(i, 1);
  }
};
function v70GingaJanela(){                                 // (o anfitrião, no quadro) quando começou a janela do GOL DE GINGA de cada time (-1 = fechada)
  if (RQ.jogo !== 'ginga') return null;
  return [0, 1].map(t => { const m = GN.mov[t]; return m && RQ.tick - m.tick <= gnTk(GN_JANELA) && !gnTocou(1 - t, m.tick) ? m.tick : -1; });
}
const net49SnapshotAntes70o = net49Snapshot;
net49Snapshot = function(s){
  const antes = NET49.lastScore ? NET49.lastScore.slice() : [0, 0];
  const r = net49SnapshotAntes70o(s);
  try {
    if (s && !NET49.host){
      if (Array.isArray(s.gm)) GN.mov = s.gm.map(t => typeof t === 'number' && t >= 0 ? {tick:t} : null);
      const g = s.goal;                                    // o seu gol de ginga (para o evento da plataforma)
      if (g && Array.isArray(s.score) && (s.score[0] !== antes[0] || s.score[1] !== antes[1]) && g.author === NET49.id && g.ginga) V70ON.gingaConv++;
    }
  } catch (_) {}
  return r;
};

/* ---------------------------------------------------------------- 3) o servidor: demonstração, outra aba, quem volta */
const servidorEnderecoAntes70o = servidorEndereco;
servidorEndereco = function(){ return window.RACHA_SEM_REDE ? '' : servidorEnderecoAntes70o(); };
const net49ConnectAntes70o = net49Connect;
net49Connect = function(endpoint){
  if (window.RACHA_SEM_REDE){ v70DemoSemRede(); return; }
  if (V70ON.outraAba && !endpoint && !V70ON.querDeNovo) return;   // (a outra aba ficou com o perfil: não briga com ela sozinho)
  V70ON.querDeNovo = false; V70ON.outraAba = false;
  return net49ConnectAntes70o(endpoint);
};
function v70DemoSemRede(){
  if (!LB.pop.hidden) return;
  abrePop(c => {
    c.classList.add('sl-pop', 'sx-pop');
    c.append(nodo('span', 'pop-tag', 'DEMONSTRAÇÃO'), nodo('h2', null, 'SALAS ONLINE DESLIGADAS'),
      nodo('p', 'pop-txt', 'Esta demonstração não tem o servidor da turma: as salas online, o Chat do Brasil e os clubes da turma ficam desligados. A sala NESTE APARELHO (você e os bots) funciona normalmente.'),
      nodo('p', 'pop-txt sx-como', 'Para jogar online de verdade: rode o servidor (node server/servidor.js) e abra o jogo pelo endereço que ele mostrar.'));
    const a = nodo('div', 'pop-acoes'); a.appendChild(botaoPop('ENTENDI', 'verde', () => { som.clique(); fechaPop(); })); c.appendChild(a);
  });
}
const sxConectarAntes70o = sxConectar;
sxConectar = function(){ if (window.RACHA_SEM_REDE && !SLOC.on) return v70DemoSemRede(); V70ON.querDeNovo = true; return sxConectarAntes70o(); };
const sxStatusAntes70o = sxStatus;
sxStatus = function(){
  const b = sxStatusAntes70o();
  if (window.RACHA_SEM_REDE && !SLOC.on){ const s = b.querySelector('span'); if (s) s.textContent = 'DEMONSTRAÇÃO · SEM SALAS ONLINE'; b.setAttribute('aria-label', 'Demonstração: salas online desligadas'); }
  else if (V70ON.outraAba && !NET49.ws){ const s = b.querySelector('span'); if (s) s.textContent = 'ABERTO EM OUTRA ABA · TOQUE PARA VOLTAR'; }
  return b;
};
function v70Reanexa(){                                     // (anfitrião) quem caiu e voltou no meio da partida ganha o boneco de volta (o bot sai)
  const r = NET49.room; if (!NET49.playing || !NET49.host || !r || r.local || !RQ.on || RQ.estado === 'fim') return;
  r.roster.forEach((id, i) => {
    const q = RQ.jog[i]; if (!q || !id || id === NET49.id || i === NET49.localSlot || (q.netId === id && q.remote)) return;
    const m = r.members.find(x => x.id === id);
    Object.assign(q, {netId:id, remote:true, mx:0, my:0, chutar:0, ack49:0, netButton49:NF.novoGatilho(), cv70:null, nsA:null});
    q.nome = m && m.name ? m.name : String(q.nome || 'Jogador').replace(/ \(bot\)$/, '');
    if (m && m.skin) q.netSkin = m.skin;
    NET49.inputs.delete(id);
    x49Toast(q.nome + ' voltou para a partida.');
  });
}
const net49MessageAntes70o = net49Message;
net49Message = function(m){
  if (!m) return;
  if (m.type === 'error' && m.codigo === 'outra_aba'){     // o mesmo perfil abriu em outra aba ou aparelho: esta para de tentar
    V70ON.outraAba = true; SL.quer = null; clearTimeout(SL.tentT); SL.tent = 0;
    setTimeout(() => {
      abrePop(c => {
        c.classList.add('sl-pop');
        c.append(nodo('span', 'pop-tag', 'SERVIDOR DA TURMA'), nodo('h2', null, 'ABERTO EM OUTRA ABA'),
          nodo('p', 'pop-txt', 'O seu perfil entrou no servidor por outra aba ou aparelho, e ela ficou com a conexão (e com a sala). Esta aba continua funcionando sem o online.'));
        const a = nodo('div', 'pop-acoes');
        a.append(botaoPop('USAR AQUI', 'verde', () => { som.clique(); fechaPop(); V70ON.querDeNovo = true; net49Connect(); }), botaoPop('OK', '', () => { som.clique(); fechaPop(); }));
        c.appendChild(a);
      });
    }, 80);
    return;
  }
  if (m.type === 'hello'){ V70ON.pub = m.pub || ''; V70ON.conta = !!m.conta; }
  if (m.type === 'interrupted') v70SalaParou('parada');
  else if (m.type === 'left') v70SalaParou(V70ON.saindo ? 'saiu' : 'removido');
  if (m.type === 'left' || m.type === 'interrupted') V70ON.saindo = false;
  const r = net49MessageAntes70o(m);
  if (m.type === 'start' && m.resume && NET49.playing && Array.isArray(m.resume.score)){   // voltou no meio: o placar de agora (sem festa de gol de mentira)
    NET49.lastScore = m.resume.score.slice(0, 2); RQ.placar = m.resume.score.slice(0, 2);
  }
  if (m.type === 'room') v70Reanexa();
  return r;
};
const net49SendAntes70o = net49Send;
net49Send = function(m){
  if (m && m.type === 'leave' && NET49.playing && RQ.on && RQ.estado !== 'fim') V70ON.saindo = true;   // saiu no meio da partida: abandono
  return net49SendAntes70o(m);
};

/* ---------------------------------------------------------------- 4) o resultado que o servidor não validou */
function v70ResultadoInvalido(m){
  if (NET49.lastResult === m.round) return;
  NET49.lastResult = m.round; RQ.estado = 'fim'; RQ.fimT = RQ_FIM_TICKS;
  const r = NET49.room, placar = Array.isArray(m.score) ? m.score.slice(0, 2) : RQ.placar.slice(), motivo = String(m.motivo || 'resultado impossível');
  if (NET49.localSlot < 0){ x49Toast('Fim: ' + placar.join(' × ') + ' · não valeu (' + motivo + ')'); x49Open(r && r.tournament ? 'cup' : 'online'); return; }
  const won = P.time === m.winner;
  RQ.resultado = {placar, venceu:won, golsH:NET49.host ? RQ.golsH : NET49.onlineGols, assistH:NET49.host ? RQ.assistH : NET49.onlineAssist,
    n:RQ.n, mapa:RQ.mapa, nivel:'dificil', contado:true, encerrada:true, invalida:true, jogo:RQ.jogo};
  rqMostraFim();
  const f = fimEl('fim'); if (f) f.classList.remove('perdeu');
  fimEl('fim-titulo').textContent = 'NÃO VALEU';
  fimEl('fim-info').textContent = 'O servidor não validou o resultado (' + motivo + ') · sem prêmio e sem troféu · ' + (r && r.pub ? 'sala pública ' : 'sala privada ') + (r ? r.code : '');
  fimEl('fim-denovo').textContent = r && r.tournament ? 'VER CHAVEAMENTO' : 'PEDIR REVANCHE';
  v70EvFimSala(m, false);
}
const net49ResultAntes70o = net49Result;
net49Result = function(m){
  const r = NET49.room;
  if (m && m.valida === false && !(ARB.encerrada === m.round && r && arbAtivo(r))) return v70ResultadoInvalido(m);
  const antes = RQ.resultado;
  const v = net49ResultAntes70o(m);
  if (NET49.localSlot >= 0 && RQ.resultado && RQ.resultado !== antes) v70EvFimSala(m, !RQ.resultado.encerrada);
  return v;
};

/* ---------------------------------------------------------------- 5) os eventos da plataforma: uma vez por partida */
function v70EvInicio(d, chave){
  if (V70ON.ev && V70ON.ev.chave === chave) return;      // (voltou para a mesma partida: o começo já foi)
  if (V70ON.ev) v70EvFim(Object.assign({}, V70ON.ev.vazio, {abandonada:true, duracaoSeg:Math.round((performance.now() - V70ON.ev.t0)/1000)}));   // (a anterior ficou aberta: fecha como abandono)
  V70ON.ev = {chave, t0:performance.now(), vazio:{placarNosso:0, placarDeles:0, gols:0, assistencias:0, golsGinga:0, modo:d.modo, pontos:0, golsContra:0, duracaoSeg:0, online:!!d.online}};
  V70ON.gingaConv = 0;
  try { if (window.RACHA_EVT && window.RACHA_EVT.inicio) window.RACHA_EVT.inicio(d); } catch (_) {}
}
function v70EvFim(d){
  if (!V70ON.ev) return;                                  // fim sem começo (ou repetido): não manda
  V70ON.ev = null;
  try { if (window.RACHA_EVT && window.RACHA_EVT.fim) window.RACHA_EVT.fim(d); } catch (_) {}
}
function v70EvFimSala(m, valida, abandono){                // o fim da partida da sala (o resultado, ou você saiu)
  if (!V70ON.ev || V70ON.ev.chave.indexOf('sala:') !== 0) return;
  const t = P ? P.time | 0 : 0, s = m && Array.isArray(m.score) ? m.score : RQ.placar, local = !!(NET49.room && NET49.room.local);
  v70EvFim({placarNosso:s[t] | 0, placarDeles:s[1 - t] | 0, gols:(NET49.host ? RQ.golsH : NET49.onlineGols) | 0, assistencias:(NET49.host ? RQ.assistH : NET49.onlineAssist) | 0,
    golsGinga:(NET49.host ? window.__rachaGingaH : V70ON.gingaConv) | 0, modo:String(RQ.jogo || 'futebol'), pontos:(NET49.host ? RQ.ptsH : NET49.onlinePts) | 0,
    golsContra:(NET49.host ? RQ.contraH : NET49.onlineContra) | 0, duracaoSeg:Math.max(0, Math.round(RQ.t || 0)), abandonada:!!abandono, online:!local,
    valida:!!valida && !abandono, selo:valida && m && typeof m.selo === 'string' ? m.selo : ''});
}
const rqVsComecaAntes70o = rqVsComeca;
rqVsComeca = function(){                                    // contra os bots: o começo vale quando a bola rola (não na apresentação dos times)
  const ia = RQ.on && RQ.estado === 'intro' && !NET49.playing;
  const r = rqVsComecaAntes70o.apply(this, arguments);
  if (ia && RQ.on && RQ.estado !== 'intro'){
    try { window.__rachaGingaH = 0; } catch (_) {}
    v70EvInicio({modo:String(RQ.jogo || 'futebol'), mapa:CAMPOS[RQ.mapa] ? CAMPOS[RQ.mapa].id : '', nivelBots:String(RQ.nivel || ''), tamanho:RQ.n | 0}, 'bot:' + (++V70ON.evSeq));
  }
  return r;
};
const rqSaiAntes70o = rqSai;
rqSai = function(){                                         // saiu de uma partida contra os bots sem fechar a conta: fecha o evento como abandono
  if (V70ON.ev && V70ON.ev.chave.indexOf('bot:') === 0 && RQ.on && !NET49.playing && RQ.estado !== 'fim' && RQ.estado !== 'intro')
    v70EvFim(Object.assign({}, V70ON.ev.vazio, {placarNosso:RQ.placar[0] | 0, placarDeles:RQ.placar[1] | 0, duracaoSeg:Math.round(RQ.t || 0), abandonada:true}));
  return rqSaiAntes70o.apply(this, arguments);
};
const net49BeginAntes70o = net49Begin;
net49Begin = function(room){
  const r = net49BeginAntes70o(room);
  if (NET49.playing && NET49.localSlot >= 0 && room)
    v70EvInicio({modo:String(RQ.jogo || 'futebol'), mapa:CAMPOS[RQ.mapa] ? CAMPOS[RQ.mapa].id : '', nivelBots:room.local ? 'dificil' : '', tamanho:RQ.n | 0, online:!room.local},
      'sala:' + (room.local ? 'aqui' : room.code) + ':' + room.round + (room.local ? ':' + Date.now() : ''));
  return r;
};
function v70SalaParou(motivo){                             // a partida da sala parou para você no meio (antes do jogo largar a partida)
  try {
    if (!(NET49.playing && NET49.localSlot >= 0 && RQ.on && RQ.estado !== 'fim' && V70ON.ev && V70ON.ev.chave.indexOf('sala:') === 0)) return;
    if (motivo === 'saiu'){                                 // você saiu: abandono (nas estatísticas, no histórico e para a plataforma)
      const ctx = NET49.room && NET49.room.local ? 'casual' : 'online';
      const R = {placar:RQ.placar.slice(), venceu:false, golsH:NET49.host ? RQ.golsH : NET49.onlineGols, assistH:NET49.host ? RQ.assistH : NET49.onlineAssist, n:RQ.n, mapa:RQ.mapa, jogo:RQ.jogo || 'futebol', abandono:true};
      perfil.st.partidas++; estResultado(R, ctx, {abandono:true}); pxHistorico(R, ctx, {abandono:true});
      X49.seq = 0; x49Save();
    }
    v70EvFimSala(null, false, true);                        // (parada pelo servidor ou removido: fecha sem prêmio e sem abandono nas estatísticas)
  } catch (e) { console.error(e); }
}
// (caiu a sua internet: o evento fica aberto; se você voltar para a mesma partida, ela continua; se começar outra, a velha fecha como abandono)

/* ---------------------------------------------------------------- 6) a sala: ENTRAR NO TIME e MONTAR COM BOTS perto do INICIAR */
function v70SlTimeVazio(r){ const a = r.roster.slice(0, r.n).filter(Boolean).length, b = r.roster.slice(r.n).filter(Boolean).length; return a <= b ? 0 : 1; }
function v70SlEntrar(){
  const r = NET49.room; if (!r || r.state === 'playing') return;
  let t = v70SlTimeVazio(r); if (!r.roster.slice(t*r.n, t*r.n + r.n).some(x => !x)) t = 1 - t;
  som.clique(); net49Send({type:'seat', team:t});
}
function v70SlMontaComBots(){                               // (sala neste aparelho) você num time e os bots nas vagas: é só INICIAR
  const r = SLOC.room; if (!SLOC.on || !r || r.state === 'playing') return;
  som.clique();
  const eu = slocMembro(SLOC.eu);
  if (eu && eu.slot < 0){ const t = v70SlTimeVazio(r), s = slocLivre(r, t) >= 0 ? slocLivre(r, t) : slocLivre(r, 1 - t); if (s >= 0) slocSenta(eu, s); }
  for (let i = 0; i < 2*r.n; i++){
    if (r.roster[i]) continue;
    let b = r.members.find(m => m.bot && m.slot < 0);
    if (!b){ if (r.members.length >= SLOC_MAX) break; slocChamaBot(); b = r.members[r.members.length - 1]; }
    if (b && b.bot && b.slot < 0) slocSenta(b, i);
  }
  slocSala();
}
const slRenderAntes70o = slRender;
slRender = function(){
  slRenderAntes70o();
  const r = NET49.room, el = SL.el; if (!el || el.hidden) return;
  let bar = el.querySelector('.v70-sl-atalhos');
  const ini = $('sl-iniciar');
  if (!r || !ini){ if (bar) bar.hidden = true; return; }
  const eu = r.members.find(m => m.id === NET49.id), pode = r.state !== 'playing' && !r.tournament;
  const livre = r.roster.some(x => !x), euFora = !eu || eu.slot < 0;
  const entrar = pode && euFora && livre && (r.local || slDono(r));
  const bots = pode && !!r.local && livre;
  if (!bar){
    bar = nodo('div', 'v70-sl-atalhos');
    const b1 = novoBotao('sl-botao v70-sl-at entrar', 'Entrar no time'); b1.innerHTML = '<b>ENTRAR NO TIME</b><small>você joga</small>'; b1.addEventListener('click', v70SlEntrar);
    const b2 = novoBotao('sl-botao v70-sl-at bots', 'Montar com bots'); b2.innerHTML = '<b>MONTAR COM BOTS</b><small>você e bots nas vagas</small>'; b2.addEventListener('click', v70SlMontaComBots);
    bar.append(b1, b2);
  }
  const curto = LB.raiz.classList.contains('v70-baixo'), base = el.querySelector('.sl-base');   // (v70.1: no celular deitado a sala cabe inteira, como na v69)   // (celular deitado: uma linha acima das regras)
  if (curto && base){ if (bar.nextSibling !== base) base.parentElement.insertBefore(bar, base); }
  else if (bar.parentElement !== ini.parentElement || bar.nextSibling !== ini) ini.parentElement.insertBefore(bar, ini);
  bar.querySelector('.entrar').hidden = !entrar;
  bar.querySelector('.bots').hidden = !bots;
  bar.hidden = !entrar && !bots;
};
