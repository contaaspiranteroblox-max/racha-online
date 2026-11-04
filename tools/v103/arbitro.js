/* ======================================================================================================================
   RACHA v103 · O ÁRBITRO MAIS SIMPLES (o pedido: "deixe mais clean as configurações de árbitros, mais funcional e simples")
   Nas salas online (as do servidor) havia dois jeitos de mexer nos times, um por cima do outro: o ÁRBITRO dos cartões (o
   apito, o apito principal, banir — e nada disso valia com a partida rolando) e o ADMIN da v93 (o painel do lado). Agora é
   um jeito só, o do servidor, que vale antes E durante a partida (sem reiniciar nada):
     · tocar no CARTÃO de alguém abre a ficha dele: MUDAR PARA O TIME B (ou A; com o time cheio, TROCAR COM quem está lá),
       PÔR NO BANCO, TORNAR ÁRBITRO e REMOVER DA SALA (os dois últimos pedem confirmação); quem está assistindo: PÔR NO
       TIME A / PÔR NO TIME B;
     · tocar numa VAGA LIVRE (ou no time) pergunta QUEM ENTRA ali (quem assiste ou o outro time);
     · o APITO dos ajudantes saiu (era um segundo árbitro que só pedia); o árbitro é um só e passa com TORNAR ÁRBITRO;
     · na PAUSA, a parte do árbitro junta tudo: TIMES E JOGADORES (o painel do lado, com os nomes novos), PAUSAR PARA TODOS
       e ENCERRAR PARTIDA; o botão ADMIN da tela da sala saiu (os cartões fazem o mesmo);
     · os textos: "árbitro" em todo lugar (era admin, apito, apito principal), "vaga livre" no lugar do bot.
   A sala NESTE APARELHO continua como era (você é o árbitro e chama os bots).
   ====================================================================================================================== */
const V103A = {};
const v103Arb = r => v103SalaSrv(r) && typeof v93SouAdmin === 'function' && v93SouAdmin();
const v103NomeT = t => (typeof TIME80 !== 'undefined' && TIME80[t] ? TIME80[t].nome : (t ? 'Time B' : 'Time A')).toUpperCase();
const v103TimeDe = (m, r) => m && m.slot >= 0 ? Math.floor(m.slot/r.n) : -1;
function v103Manda(acao, o){ v93AdmManda(acao, o); }
function v103Ocupantes(r, t){ const out = []; for (let k = 0; k < r.n; k++){ const i = t*r.n + k, id = r.roster[i], m = id && r.members.find(x => x.id === id); if (m) out.push({m, i}); } return out; }
const v103TemVaga = (r, t) => r.roster.slice(t*r.n, t*r.n + r.n).some(x => !x);

// (as janelas ficam na camada escalada das telas: no celular deitado ela encolhe — o piso de toque de 44 px vem desta escala)
function v103Escala(c){ try { c.style.setProperty('--v103-sc', String(Math.max(.2, PALCO.sc || 1))); } catch (_) {} }

/* ---------------------------------------------------------------- a ficha de alguém (o árbitro tocou no cartão) */
function v103Ficha(m){
  const r = NET49.room; if (!r || !m) return;
  const t = v103TimeDe(m, r), eu = m.id === NET49.id, jogando = r.state === 'playing', arb = m.id === (r.admin || r.host);
  abrePop(c => {
    c.classList.add('sl-pop', 'arb-pop', 'v103-ficha'); v103Escala(c);
    c.append(nodo('span', 'pop-tag', (t < 0 ? (m.banco ? 'NO BANCO' : 'ASSISTINDO') : v103NomeT(t)) + (arb ? ' · ÁRBITRO' : '')),
      nodo('h2', null, String(m.name || 'Jogador').toUpperCase() + (eu ? ' (VOCÊ)' : '')));
    const a = nodo('div', 'pop-acoes sl-menu v103-acoes');
    const vai = (txt, cls, fn) => { const b = botaoPop(txt, cls, () => { som.clique(); fechaPop(); fn(); }); a.appendChild(b); return b; };
    const paraTime = (tt, txt) => {                            // para o time tt: na vaga livre, ou trocando com quem está lá
      if (v103TemVaga(r, tt)) return vai(txt, tt ? 'azul' : 'vermelho', () => v103Manda('mover', {id:m.id, time:tt}));
      for (const o of v103Ocupantes(r, tt)) vai('TROCAR COM ' + String(o.m.name || 'Jogador').toUpperCase(), tt ? 'azul' : 'vermelho', () => v103Manda('mover', {id:m.id, slot:o.i}));
    };
    if (t >= 0){
      paraTime(1 - t, 'MUDAR PARA O ' + v103NomeT(1 - t));
      vai(eu ? 'IR PARA O BANCO' : 'PÔR NO BANCO', '', () => v103Manda('reserva', {id:m.id}));
    } else {
      paraTime(0, 'PÔR NO ' + v103NomeT(0));
      paraTime(1, 'PÔR NO ' + v103NomeT(1));
    }
    if (!eu){
      vai('TORNAR ÁRBITRO', 'amarelo', () => v103Confirma('TORNAR ' + String(m.name || 'Jogador').toUpperCase() + ' O ÁRBITRO?', 'Você continua na sala, mas quem monta os times, pausa e encerra passa a ser ' + (m.name || 'ele') + '.', 'TORNAR ÁRBITRO', () => v103Manda('admin', {id:m.id})));
      vai('REMOVER DA SALA', 'vermelho', () => v103Confirma('REMOVER ' + String(m.name || 'Jogador').toUpperCase() + ' DA SALA?', 'Ele sai agora e só pode voltar daqui a pouco.' + (jogando && t >= 0 ? ' A vaga dele fica livre.' : ''), 'REMOVER', () => v103Manda('expulsar', {id:m.id})));
    }
    a.appendChild(botaoPop('CANCELAR', '', () => { som.clique(); fechaPop(); }));
    c.appendChild(a);
    if (jogando) c.appendChild(nodo('p', 'pop-txt v103-nota', 'Vale na hora, sem parar a partida: o placar e o tempo continuam.'));
  });
}
function v103Confirma(tit, txt, ok, fn){
  abrePop(c => {
    c.classList.add('sl-pop', 'arb-pop', 'v103-ficha'); v103Escala(c);
    c.append(nodo('span', 'pop-tag', 'ÁRBITRO'), nodo('h2', null, tit), nodo('p', 'pop-txt', txt));
    const a = nodo('div', 'pop-acoes sl-menu v103-acoes');
    a.append(botaoPop(ok, 'vermelho', () => { som.clique(); fechaPop(); fn(); }), botaoPop('CANCELAR', '', () => { som.clique(); fechaPop(); }));
    c.appendChild(a);
  });
}
/* ---------------------------------------------------------------- quem entra aqui (o árbitro tocou numa vaga ou num time) */
function v103QuemEntra(t, slot){
  const r = NET49.room; if (!r) return;
  const cand = r.members.filter(m => !m.bot && (m.slot < 0 || v103TimeDe(m, r) !== t));
  abrePop(c => {
    c.classList.add('sl-pop', 'arb-pop', 'v103-ficha'); v103Escala(c);
    c.append(nodo('span', 'pop-tag', 'ÁRBITRO'), nodo('h2', null, 'QUEM ENTRA NO ' + v103NomeT(t) + '?'));
    const a = nodo('div', 'pop-acoes sl-menu v103-acoes');
    const cheio = !v103TemVaga(r, t);
    if (cheio && !Number.isInteger(slot)) c.appendChild(nodo('p', 'pop-txt', 'O ' + v103NomeT(t) + ' está cheio: toque no cartão de quem vai sair (TROCAR COM).'));
    else if (!cand.length) c.appendChild(nodo('p', 'pop-txt', 'Ninguém para pôr aqui agora. Chame a galera em CONVIDAR: quem entra pelo código aparece em ESPECTADORES.'));
    else for (const m of cand){
      const sub = m.slot < 0 ? (m.banco ? ' · banco' : ' · assistindo') : ' · ' + v103NomeT(v103TimeDe(m, r)).toLowerCase();
      a.appendChild(botaoPop(String(m.name || 'Jogador') + (m.id === NET49.id ? ' (você)' : '') + sub, t ? 'azul' : 'vermelho', () => {
        som.clique(); fechaPop(); v103Manda('mover', Number.isInteger(slot) ? {id:m.id, slot} : {id:m.id, time:t});
      }));
    }
    a.appendChild(botaoPop('CANCELAR', '', () => { som.clique(); fechaPop(); }));
    c.appendChild(a);
    if (r.state === 'playing') c.appendChild(nodo('p', 'pop-txt v103-nota', 'Entra na hora, sem reiniciar: a tampinha aparece no campo do time.'));
  });
}

/* ---------------------------------------------------------------- os toques na tela da sala */
if (typeof arbMenu === 'function'){
  const arbMenuAntes103 = arbMenu;
  arbMenu = function(m){ const r = NET49.room; if (!v103Arb(r)) return arbMenuAntes103.apply(this, arguments); return v103Ficha(m); };
}
if (typeof arbEscolhe === 'function'){
  const arbEscolheAntes103 = arbEscolhe;
  arbEscolhe = function(t){ const r = NET49.room; if (!v103Arb(r) || t < 0) return arbEscolheAntes103.apply(this, arguments); return v103QuemEntra(t); };
}
if (typeof slClique === 'function'){
  const slCliqueAntes103 = slClique;
  slClique = function(e){
    const r = NET49.room;
    if (!v103SalaSrv(r)) return slCliqueAntes103.apply(this, arguments);
    const card = e.target.closest && e.target.closest('.sl-card');
    if (card){
      const m = r.members.find(x => x.id === card.dataset.id); if (!m) return;
      if (v103Arb(r)){ som.clique(); return v103Ficha(m); }
      return x49Toast(m.id === NET49.id ? 'Só o árbitro escolhe os times. Peça para ele te colocar.' : m.id === (r.admin || r.host) ? m.name + ' é o árbitro da sala.' : 'Só o árbitro mexe nos times.');
    }
    const vaga = e.target.closest && e.target.closest('.sl-vaga'), col = e.target.closest && e.target.closest('.sl-col');
    if (!vaga && !col) return slCliqueAntes103.apply(this, arguments);
    const t = vaga ? Math.floor((+vaga.dataset.slot)/r.n) : +col.dataset.time;
    if (!(t === 0 || t === 1)) return slCliqueAntes103.apply(this, arguments);
    if (!v103Arb(r)) return x49Toast('Só o árbitro escolhe os times. Peça para ele te colocar.');
    som.clique(); return v103QuemEntra(t, vaga ? +vaga.dataset.slot : undefined);
  };
}

/* ---------------------------------------------------------------- a tela da sala: o árbitro é um só (sem o apito) */
function v103SalaArbitro(){
  const r = NET49.room, el = SL.el; if (!el || el.hidden || !v103SalaSrv(r)) return;
  try { if (typeof ARB !== 'undefined' && ARB.assist && ARB.assist.length) ARB.assist = []; } catch (_) {}   // (o apito dos ajudantes saiu)
  for (const s of el.querySelectorAll('.sl-card .sl-arb:not(.p)')) s.remove();
  for (const c of el.querySelectorAll('.sl-card.arb-a')) c.classList.remove('arb-a');
  const adm = el.querySelector('.v93-sl-adm'); if (adm) adm.hidden = true;                // (os cartões fazem o mesmo)
  const leg = el.querySelector('.sl-legenda');
  if (leg && !leg.hidden){
    const pr = r.admin || r.host, nm = (r.members.find(x => x.id === pr) || {}).name || '—', eu = pr === NET49.id;
    const ic = nodo('i'); ic.innerHTML = typeof SX_APITO === 'string' ? SX_APITO : '';
    leg.textContent = '';
    leg.append(ic, nodo('b', null, 'ÁRBITRO: '), document.createTextNode(nm),
      nodo('span', 'sl-leg-dica', eu ? ' · toque num jogador para trocar de time, pôr no banco ou remover — vale também com a partida rolando' : ' · só o árbitro mexe nos times'));
  }
}
if (typeof slRender === 'function'){
  const slRenderAntes103a = slRender;
  slRender = function(){ const r = slRenderAntes103a.apply(this, arguments); try { v103SalaArbitro(); } catch (e) { console.error('v103 árbitro', e); } return r; };
}

/* ---------------------------------------------------------------- na partida: a faixa de cima e a pausa */
if (typeof x49GameUI === 'function'){
  const x49GameUIAntes103 = x49GameUI;
  x49GameUI = function(){
    const out = x49GameUIAntes103.apply(this, arguments);
    try {
      const r = NET49.room;
      if (NET49.playing && v103SalaSrv(r) && X49UI.netText && !/PAUSADA/.test(X49UI.netText.textContent || ''))
        X49UI.netText.textContent = 'SALA ' + r.code + (v103Arb(r) ? ' · árbitro' : '');
    } catch (_) {}
    return out;
  };
}
if (typeof pausaAbre === 'function'){
  const pausaAbreAntes103 = pausaAbre;
  pausaAbre = function(){
    const out = pausaAbreAntes103.apply(this, arguments);
    try { v103PausaArbitro(); } catch (e) { console.error('v103 pausa', e); }
    return out;
  };
}
function v103PausaArbitro(){
  const r = NET49.room, box = document.getElementById('pa-arb'), adm = document.getElementById('pa-adm');
  if (!box || box.hidden || !v103Arb(r)) return;
  const tit = box.querySelector('.pa-arb-tit');
  if (tit){ tit.textContent = ''; const ic = nodo('i'); ic.innerHTML = typeof SX_APITO === 'string' ? SX_APITO : ''; tit.append(ic, document.createTextNode('VOCÊ É O ÁRBITRO')); }
  if (adm){                                                       // o painel dos times entra na parte do árbitro (os três numa linha)
    adm.classList.add('v103-pa-times'); box.classList.add('v103-tres');
    const ic = adm.querySelector('.v71-ic'); adm.textContent = ''; if (ic) adm.appendChild(ic); adm.appendChild(document.createTextNode('TIMES E JOGADORES'));
    adm.setAttribute('aria-label', 'Times e jogadores: trocar de time, pôr no banco, pôr quem assiste');
    const t0 = box.querySelector('.pa-arb-tit'); if (t0) t0.insertAdjacentElement('afterend', adm); else box.insertBefore(adm, box.firstChild);
  }
}

/* ---------------------------------------------------------------- o painel dos times (o da v93) com os nomes de agora */
const V103A_TROCA = new Map([
  ['ADMIN DA SALA', 'ÁRBITRO · TIMES E JOGADORES'], ['MOVER', 'OUTRO TIME'], ['RESERVA', 'BANCO'], ['ADMIN', 'ÁRBITRO'],
  ['BANCO E QUEM ASSISTE', 'BANCO E QUEM ASSISTE'], ['Bot', 'vaga livre'], ['vaga', 'vaga livre']
]);
if (typeof v93AdmPinta === 'function'){
  const v93AdmPintaAntes103 = v93AdmPinta;
  v93AdmPinta = function(){
    const out = v93AdmPintaAntes103.apply(this, arguments);
    try { v103PainelNomes(); } catch (e) { console.error('v103 painel', e); }
    return out;
  };
}
function v103PainelNomes(){
  const el = V93A && V93A.el, r = NET49.room; if (!el || el.hidden || !r) return;
  for (const x of el.querySelectorAll('.v93-adm-cab b, .v93-adm-bt, .v93-adm-nome, h4')){
    const t = (x.textContent || '').trim();
    if (V103A_TROCA.has(t) && !(t === 'Bot' && r.bots)) x.textContent = V103A_TROCA.get(t);
  }
  const conf = el.querySelector('.v93-adm-conf b');
  if (conf && /^PASSAR O ADMIN PARA /.test(conf.textContent)) conf.textContent = conf.textContent.replace(/^PASSAR O ADMIN PARA (.*)\?$/, 'TORNAR $1 O ÁRBITRO?');
  const cp = el.querySelector('.v93-adm-conf p'); if (cp) cp.textContent = cp.textContent.replace(/pelo admin/g, 'pelo árbitro');
  for (const b of el.querySelectorAll('.v93-adm-conf .v93-adm-bt')) if (b.textContent === 'PASSAR') b.textContent = 'TORNAR ÁRBITRO';
  const nota = el.querySelector('.v93-adm-nota');
  if (nota) nota.textContent = nota.textContent.replace(' (o bot sai; quem está lá vai para o banco).', ' (quem está lá vai para o banco).');
}
window.RachaArbitro103 = {ficha:v103Ficha, quemEntra:v103QuemEntra};
