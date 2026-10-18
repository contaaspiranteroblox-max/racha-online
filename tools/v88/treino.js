/* ======================================================================================================================
   RACHA v88 · O TREINO COMPLETO (a tela TREINO de sempre, com os mesmos exercícios e a MESMA física; entram os que faltavam)
   Já existiam e continuam: Primeiros toques, Treino livre, Cruzamento, Domínio, Passe, Tabela, Finalização e Condução (o
   DRIBLE nos cones). Entram, com o motor do treino que já existe (os companheiros, o goleiro, os círculos e a bola presa):
   · POSICIONAMENTO: corra para o espaço aceso; chegou, o companheiro passa e você finaliza;
   · DEFESA: o atacante vem driblando para o seu gol: desarme (encoste na bola) ou bloqueie o chute;
   · GOLEIRO: você fica no gol e defende os chutes com a sua tampinha (ela é o goleiro: o mesmo corpo, a mesma física);
   · TREINO COM BOTS: uma partida contra os bots que não vale nada (nem patente, nem moedas, nem missão): o tamanho, o campo,
     o nível dos bots e o tempo.
   Em cima, as escolhas: o CAMPO e o TAMANHO (os do treino), a DIFICULDADE (o goleiro e os atacantes dos exercícios; o
   recorde só conta no Normal) e o RELÓGIO do treino livre. Os exercícios têm rodadas fixas.
   Os prêmios: sem conta, os do aparelho (como antes); com conta, o servidor confere e paga (jogo.treinoConcluido, com o teto
   do dia do treino). Nada de patente nem de prêmio de partida no treino.
   ====================================================================================================================== */
const V88T = {dif:'normal', dur:0, botsN:2, botsNivel:'aleatoria', botsDur:3, botsMapa:4, livre:null, botsAntes:null, ultimo:null};
try {
  const o = JSON.parse(localStorage.getItem('racha88-treino') || 'null');
  if (o && typeof o === 'object') Object.assign(V88T, {
    dif:['facil', 'normal', 'dificil'].indexOf(o.dif) >= 0 ? o.dif : 'normal', dur:[0, 2, 5, 10].indexOf(o.dur) >= 0 ? o.dur : 0,
    botsN:[1, 2, 3, 4].indexOf(o.botsN) >= 0 ? o.botsN : 2, botsNivel:['facil', 'dificil', 'aleatoria'].indexOf(o.botsNivel) >= 0 ? o.botsNivel : 'aleatoria',
    botsDur:[2, 3, 5].indexOf(o.botsDur) >= 0 ? o.botsDur : 3, botsMapa:Number.isInteger(o.botsMapa) ? o.botsMapa : 4});
} catch (_) {}
function v88TreinoSalva(){ try { localStorage.setItem('racha88-treino', JSON.stringify({dif:V88T.dif, dur:V88T.dur, botsN:V88T.botsN, botsNivel:V88T.botsNivel, botsDur:V88T.botsDur, botsMapa:V88T.botsMapa})); } catch (_) {} }
const V88_DIF = {facil:{nome:'FÁCIL', d:-.3}, normal:{nome:'NORMAL', d:0}, dificil:{nome:'DIFÍCIL', d:.3}};
const v88Dif = () => (V88_DIF[V88T.dif] || V88_DIF.normal).d;
const v88TrD = () => { const k = Math.max(1, TR.rod); return (k - 1)/Math.max(1, TR.nRod - 1); };   // 0 → 1 ao longo das rodadas
const v88TrDD = () => trLim(v88TrD() + v88Dif(), 0, 1.15);                                         // (com a dificuldade escolhida)

/* ---------------------------------------------------------------- 1) os exercícios novos (o motor de sempre) */
TR_INFO.posic = {nome:'Posicionamento', rod:10, est:[10, 18, 26],
  obj:'Corra para o círculo aceso (o espaço vazio). Chegou, o companheiro passa: finalize no gol.',
  dica:() => 'Chegou rápido: 2 · chegou: 1 · gol: +2 · goleiro a partir da ' + (TR.gkDesde || 4) + 'ª bola'};
TR_INFO.defesa = {nome:'Defesa', rod:10, est:[6, 11, 16],
  obj:'O atacante vem driblando para o seu gol. Encoste na bola para desarmar antes do chute — ou bloqueie o chute.',
  dica:'Desarme: 2 · chute bloqueado: 1 · gol dele: 0'};
TR_INFO.goleiro = {nome:'Goleiro', rod:10, est:[8, 13, 18],
  obj:'Fique no gol: o atacante chuta e você defende com a sua tampinha (ela é o goleiro, com o mesmo corpo de sempre).',
  dica:'Defesa: 2 · defesa no canto: 3 · gol: 0'};
for (const id of ['posic', 'defesa', 'goleiro']) if (TR_LISTA.indexOf(id) < 0) TR_LISTA.push(id);
// (os recordes e o exercício escolhido foram lidos antes de estes existirem: lê de novo os deles)
try {
  const o = JSON.parse(localStorage.getItem(CHAVE_RECORDES) || 'null');
  if (o && typeof o === 'object') for (const id of ['posic', 'defesa', 'goleiro']){
    const v = o[trChave(id)];
    if (v && typeof v.pts === 'number' && isFinite(v.pts) && v.pts >= 0) TR.recs[trChave(id)] = {pts:v.pts, est:Math.max(0, Math.min(3, v.est | 0))};
  }
  const s = localStorage.getItem(CHAVE_TREINO); if (['posic', 'defesa', 'goleiro'].indexOf(s) >= 0) TR.id = s;
} catch (_) {}

TR_X.posic = {
  monta(){
    TR.pas = trNpc({funcao:'pas', time:0, txt:'10'});
    TR.zonas.push({x:0, y:0, r:TR.G.rp*2.4});
    TR.gkDesde = trGolAberto() < .5 ? 7 : 4;
    TR.st = {lugar:0, rapido:0, gols:0};
    TR.rod = 1; this.prep(); TR.rod = 0;               // já mostra a 1ª jogada durante a abertura
  },
  prep(){
    const G = TR.G, r = TR.r, k = Math.max(1, TR.rod), d = v88TrDD(), z = TR.zonas[0];
    z.x = G.L*trLerp(.12, .55, trRnd()); z.y = (trRnd()*2 - 1)*(G.A - G.rp*2.6)*.75;
    const px = -G.L*trLerp(.15, .4, trRnd()), py = trLim(-z.y*.5 + (trRnd() - .5)*G.rp*4, -G.A + G.rp*1.6, G.A - G.rp*1.6);
    trNpcPoe(TR.pas, px, py); trSegura(TR.pas, z.x, z.y);
    const jx = trLim(z.x - G.L*trLerp(.42, .62, trRnd()), -G.L*.85, G.L*.3), jy = trLim(-z.y*.8, -G.A + G.rp*1.4, G.A - G.rp*1.4);
    TR.motor.poeJog(jx, jy);
    if (k >= TR.gkDesde && !TR.gk){ TR.gk = trNpc({funcao:'gk', time:1, txt:'GK', movel:true}); if (TR.fase !== 'intro') trAviso('AGORA COM GOLEIRO!', '#8fc4ff'); }
    if (TR.gk){ trNpcPoe(TR.gk, G.L - G.rp*1.05, 0); trGkNivel(TR.gk, (k - TR.gkDesde)/Math.max(1, TR.nRod - TR.gkDesde)); }
    const corrida = Math.max(0, Math.hypot(z.x - jx, z.y - jy) - z.r)/(G.vJog*TICKS_POR_S);   // segundos na velocidade máxima
    r.limite = .45 + corrida*trLerp(1.6, 1.2, trLim(d, 0, 1)); r.max = r.limite*2 + 1;
    r.va = G.vJog*trLerp(1.1, 1.6, trLim(d, 0, 1)); r.etapa = 'espera';
    r.prepT = k === 1 ? 30 : 50; r.pausaT = 70;
    if (TR.fase !== 'intro') trAviso('CORRA PARA O CÍRCULO!', '#ffe45e');
  },
  vai(){ const r = TR.r; r.etapa = 'vem'; r.t0 = TR.tk; },   // ('vem': o círculo pisca enquanto você corre)
  jogo(){
    const G = TR.G, r = TR.r, b = TR.bola, j = TR.jog, ev = TR.ev, z = TR.zonas[0], gk = TR.gk;
    if (r.etapa === 'vem'){
      const t = (TR.tk - r.t0)/TICKS_POR_S;
      if (Math.hypot(j.x - z.x, j.y - z.y) <= z.r){
        const p = t <= r.limite ? 2 : 1; TR.st.lugar++; if (p === 2) TR.st.rapido++;
        trPonto(p, p === 2 ? 'NO LUGAR CERTO!' : 'CHEGOU', z.x, z.y - G.rp*1.2);
        trToca(TR.pas, j.x + (G.L - j.x)*.12, j.y*.88, r.va); r.etapa = 'passe'; r.t1 = TR.tk; return;
      }
      if (t > r.max) return trFim(0, 'DEMOROU: A JOGADA PASSOU');
      return;
    }
    if (r.etapa !== 'passe') return;
    trToques();
    if (gk && ev.npc === gk && r.gkT < 0) r.gkT = TR.tk;
    if (ev.trave && r.chutes && !r.trave){ r.trave = true; trAviso('NA TRAVE!', '#ffe45e'); }
    if (ev.gol > 0){
      if (!r.toques) return trFim(0, 'SEM TOQUE NÃO VALE');
      TR.st.gols++; trGolFesta('GOL!'); trPonto(2, 'GOL!', G.L, ev.golY); return trFimRodada();
    }
    if (ev.gol < 0) return trFim(0, 'GOL CONTRA!');
    if (gk && trGkPega()) return trFim(0, 'O GOLEIRO PEGOU');
    if (r.gkT >= 0 && TR.tk - r.gkT > 40) return trFim(0, 'DEFENDEU!');
    if (r.chutes && b.x > G.L - G.rb*1.8 && Math.abs(b.y) > G.gy + G.rb) return trFim(0, 'PRA FORA!');
    if (r.chutes && trVel(b) < G.vJog*.05){ if (++r.parada > 30) return trFim(0, 'A BOLA PAROU'); } else r.parada = 0;
    if (!r.toques && TR.tk - r.t1 > 3*TICKS_POR_S && trVel(b) < G.vJog*.08) return trFim(0, 'NÃO PEGOU O PASSE');
    if (TR.tk - r.t1 > 7*TICKS_POR_S) return trFim(0, 'TEMPO!');
  },
  resumo(){ const s = TR.st; return s.lugar + ' de ' + TR.nRod + ' no lugar certo (' + s.rapido + ' rápido) · ' + s.gols + (s.gols === 1 ? ' gol' : ' gols'); }
};

function v88PrendeNaFrente(n, tx, ty, v){                  // a bola no pé de quem conduz, um pouco à frente (ele anda sem chutar a bola)
  const G = TR.G, dx = tx - n.x, dy = ty - n.y, d = Math.hypot(dx, dy) || 1, k = n.r + G.rb + 1.5 + (v || 0)*1.6;
  const x = n.x + dx/d*k, y = n.y + dy/d*k;
  TR.presa = {x, y, n}; TR.motor.prende(x, y);
  const b = TR.bola; b.x = x; b.y = y; b.vx = b.vy = 0;
}
TR_X.defesa = {
  monta(){
    TR.atac = trNpc({funcao:'atac', time:1, txt:'9', movel:true});
    TR.st = {desarmes:0, bloqueios:0, gols:0};
    TR.rod = 1; this.prep(); TR.rod = 0;
  },
  prep(){
    const G = TR.G, r = TR.r, k = Math.max(1, TR.rod), d = v88TrDD(), a = TR.atac;
    const ay = (trRnd()*2 - 1)*(G.A - G.rp*2.5)*.55;
    trNpcPoe(a, G.L*trLerp(.3, .5, trRnd()), ay); a.vmax = 0; a.tx = a.x; a.ty = a.y;
    trSegura(a, -G.L, ay*.4);
    const jy = trLim(ay + (ay >= 0 ? -1 : 1)*G.rp*trLerp(3.5, 5, trRnd()), -G.A + G.rp*1.5, G.A - G.rp*1.5);   // (fora do caminho dele: parado não desarma)
    TR.motor.poeJog(-G.L*trLerp(.3, .45, trRnd()), jy);
    r.vel = G.vJog*trLerp(.5, .85, trLim(d, 0, 1.1)); r.zig = d > .45 ? Math.min(G.areaH, G.A - G.rp*2)*trLerp(.25, .55, trLim(d, 0, 1)) : 0;
    r.fintaD = G.rp*trLerp(2.6, 4.6, trLim(d, 0, 1)); r.fintaL = G.rp*trLerp(2.2, 3.2, trLim(d, 0, 1));   // (quanto antes ele corta e quanto)
    r.tiro = -G.L + G.areaD*trLerp(1.3, 1.65, trRnd()); r.fase0 = trRnd()*Math.PI*2;
    r.etapa = 'espera'; r.prepT = k === 1 ? 30 : 55; r.pausaT = 70;
    if (TR.fase !== 'intro') trAviso('DEFENDA O SEU GOL!', '#8fc4ff');
  },
  vai(){ const r = TR.r; r.etapa = 'conduz'; r.t0 = TR.tk; },
  jogo(){
    const G = TR.G, r = TR.r, b = TR.bola, j = TR.jog, ev = TR.ev, a = TR.atac;
    if (r.etapa === 'conduz'){
      if (ev.toqueH){                                   // encostou na bola: desarmou (ela espirra para longe de você) e o atacante para
        TR.presa = null; TR.motor.solta(); a.vmax = 0; a.tx = a.x; a.ty = a.y;
        let dx = b.x - j.x, dy = b.y - j.y; const dd = Math.hypot(dx, dy) || 1; dx /= dd; dy /= dd;
        TR.motor.poeBola(b.x, b.y, dx*G.vJog*1.3, dy*G.vJog*1.3);
        TR.st.desarmes++; return trFim(2, 'DESARMOU!');
      }
      if (a.x <= r.tiro){                                // chegou na entrada da área: chuta num canto
        a.vmax = 0; a.tx = a.x; a.ty = a.y;
        const lim = G.gy - G.postR - G.rb, gy = (trRnd() < .5 ? -1 : 1)*lim*trLerp(.35, .85, trRnd());
        trToca(a, -G.L - G.gp*.6, gy, G.vJog*trLerp(1.3, 1.9, trLim(r.vel/G.vJog, 0, 1)));
        r.etapa = 'chute'; r.t1 = TR.tk; return;
      }
      const t = (TR.tk - r.t0)/TICKS_POR_S;
      let ty = r.zig ? Math.sin(t*2.2 + r.fase0)*r.zig : a.y, vel = r.vel;
      if (j.x < a.x && a.x - j.x < r.fintaD && Math.abs(j.y - a.y) < G.rp*2.2){   // você na frente: ele corta para o lado (o drible)
        ty = a.y + (a.y >= j.y ? 1 : -1)*r.fintaL; vel *= 1.15;
      }
      a.ty = trLim(ty, -G.A + G.rp*1.5, G.A - G.rp*1.5); a.tx = -G.L; a.vmax = vel;
      v88PrendeNaFrente(a, a.x - G.rp*3, a.ty, vel);
      if (TR.tk - r.t0 > 14*TICKS_POR_S) return trFim(0, 'TEMPO!');
      return;
    }
    if (r.etapa === 'chute'){
      if (ev.toqueH && !r.bloq){ r.bloq = TR.tk; return; }
      if (ev.gol < 0){ TR.st.gols++; return trFim(0, r.bloq ? 'DESVIOU, MAS ENTROU' : 'GOL DELE'); }
      if (r.bloq && (TR.tk - r.bloq > 35 || (b.vx > 0 && b.x > -G.L + G.areaD*.4))){ TR.st.bloqueios++; return trFim(1, 'BLOQUEOU O CHUTE!'); }
      if (ev.gol > 0) return trFim(0, 'A BOLA FOI LONGE');
      if (!r.bloq && b.vx > 0 && TR.tk - r.t1 > 10) return trFim(0, 'NA TRAVE! (SORTE)');
      if (trVel(b) < G.vJog*.05){ if (++r.parada > 25) return trFim(r.bloq ? 1 : 0, r.bloq ? 'BLOQUEOU!' : 'A BOLA PAROU'); } else r.parada = 0;
      if (TR.tk - r.t1 > 4*TICKS_POR_S) return trFim(0, 'TEMPO!');
    }
  },
  resumo(){ const s = TR.st; return s.desarmes + (s.desarmes === 1 ? ' desarme · ' : ' desarmes · ') + s.bloqueios + (s.bloqueios === 1 ? ' chute bloqueado · ' : ' chutes bloqueados · ') + s.gols + (s.gols === 1 ? ' gol sofrido' : ' gols sofridos'); }
};

TR_X.goleiro = {
  monta(){
    TR.chu = trNpc({funcao:'chu', time:1, txt:'9'});
    TR.st = {defesas:0, cantos:0, gols:0};
    TR.rod = 1; this.prep(); TR.rod = 0;
  },
  prep(){
    const G = TR.G, r = TR.r, k = Math.max(1, TR.rod), d = trLim(v88TrDD(), 0, 1);
    const dist = Math.min(G.L*.9, G.pen*trLerp(1.6, 1, d)*trLerp(.92, 1.08, trRnd()));
    const lado = (trRnd()*2 - 1)*Math.min(G.A - G.rp*2, G.areaH*trLerp(.3, 1.1, d));
    const lim = G.gy - G.postR - G.rb, gy = (trRnd() < .5 ? -1 : 1)*lim*trLerp(.35, .95, Math.min(1, d*.7 + trRnd()*.5));
    const sx = -G.L + dist;
    trNpcPoe(TR.chu, sx + G.rp*2.4, lado); trSegura(TR.chu, -G.L, 0);   // (a bola aponta para o meio do gol: não entrega o canto)
    TR.motor.poeJog(-G.L + G.rp*2.6, 0);
    r.alvo = {x:-G.L - G.gp*.6, y:gy}; r.canto = Math.abs(gy) > lim*.6;
    r.va = G.vJog*trLerp(.8, 2.1, d); r.etapa = 'espera';
    r.prepT = k === 1 ? 40 : 65; r.pausaT = 70;
    if (TR.fase !== 'intro') trAviso('NO GOL!', '#8fc4ff');
  },
  vai(){ const r = TR.r; trToca(TR.chu, r.alvo.x, r.alvo.y, r.va); r.etapa = 'chute'; r.t0 = TR.tk; },
  jogo(){
    const G = TR.G, r = TR.r, b = TR.bola, ev = TR.ev;
    if (r.etapa !== 'chute') return;
    if (ev.toqueH && !r.def) r.def = TR.tk;            // encostou: espera para ver se ela não entra mesmo assim
    if (ev.gol < 0){ TR.st.gols++; return trFim(0, r.def ? 'ENTROU MESMO ASSIM' : 'GOL!'); }
    if (r.def && (TR.tk - r.def > 35 || (b.vx > 0 && b.x > -G.L + G.areaD*.35) || trVel(b) < G.vJog*.1)){
      TR.st.defesas++; if (r.canto) TR.st.cantos++;
      return trFim(r.canto ? 3 : 2, r.canto ? 'DEFESAÇA NO CANTO!' : 'DEFENDEU!');
    }
    if (ev.gol > 0) return trFim(0, 'A BOLA FOI LONGE');
    if (!r.def && b.vx > 0 && TR.tk - r.t0 > 10) return trFim(0, 'NA TRAVE! (SORTE)');
    if (trVel(b) < G.vJog*.05){ if (++r.parada > 25) return trFim(0, 'A BOLA MORREU'); } else r.parada = 0;
    if (TR.tk - r.t0 > 4*TICKS_POR_S) return trFim(0, 'TEMPO!');
  },
  resumo(){ const s = TR.st; return s.defesas + (s.defesas === 1 ? ' defesa' : ' defesas') + ' (' + s.cantos + ' no canto) · ' + s.gols + (s.gols === 1 ? ' gol sofrido' : ' gols sofridos'); }
};
// os adversários do treino (o atacante e o chutador) com o aro do outro time, como o goleiro (antes: só o goleiro era do outro time)
const desenhaArosAntes88 = desenhaAros;
desenhaAros = function(g){
  if (RQ.on || !TR.on || !TR.npcs.some(n => n.time === 1 && n.funcao !== 'gk')) return desenhaArosAntes88.apply(this, arguments);
  const t = agoraFx();
  g.save(); g.translate(CX, CY);
  for (const n of TR.npcs){ const v = trNpcVis(n); aroDe(g, n, v.x, v.y, skinDoTime(tp71Time(n)).cor, t); }
  g.restore();
  aroDe(g, P, VIS.px, VIS.py, skinDoTime(0).cor, t);
};
// a dificuldade escolhida vale no goleiro de todos os exercícios (no Normal, o de sempre)
const trGkNivelAntes88 = trGkNivel;
trGkNivel = function(n, d){ return trGkNivelAntes88.call(this, n, trLim((d || 0) + v88Dif(), 0, 1)); };

/* ---------------------------------------------------------------- 2) o fim: o recorde (só no Normal) e o prêmio da conta */
const trAcabaAntes88 = trAcaba;
trAcaba = function(){
  const id = TR.id, inf = TR_INFO[id] || {}, key = trChave(), fora = id !== 'tut' && V88T.dif !== 'normal';
  const tinha = Object.prototype.hasOwnProperty.call(TR.recs, key), rec = TR.recs[key];
  if (fora) TR.recs[key] = {pts:inf.menor ? -Infinity : Infinity, est:0};   // (fora do Normal não tem recorde novo nem o prêmio dele)
  let r;
  try { r = trAcabaAntes88.apply(this, arguments); }
  finally {
    if (fora){
      if (tinha) TR.recs[key] = rec; else delete TR.recs[key];
      trSalvaRecs();
      if (TR.fim){ TR.fim.novo = false; TR.fim.ant = rec ? rec.pts : null; TR.fim.txt = (TR.fim.txt || '') + ' · no ' + V88_DIF[V88T.dif].nome.toLowerCase() + ' (o recorde só conta no Normal)'; }
    }
  }
  try {
    V88T.ultimo = null;
    if (id !== 'tut' && TR.fim && v88Logado()){                    // com conta: o servidor confere e paga (o mesmo teto do dia do treino)
      const f = TR.fim; f.premio = null; V88T.ultimo = {espera:true};
      v88M('jogo.treinoConcluido', {exercicio:id, estrelas:Math.max(0, Math.min(3, f.est | 0)), recorde:!!f.novo, nonce:v88Nonce()}).then(res => {
        if (res && res.carteira) v88PoeCarteira(res.carteira);
        V88T.ultimo = res || {erro:'sem resposta'}; v88TreinoNota();
      }).catch(e => { V88T.ultimo = {erro:e && e.message || 'sem conexão'}; v88TreinoNota(); });
    }
  } catch (e) { console.error(e); }
  return r;
};
function v88TreinoNota(){                                   // a linha da conta na tela do fim do exercício
  try {
    if (!trFimAberto() || !TRF.premio) return;
    const res = V88T.ultimo; let n = TRF.raiz.querySelector('.v88-tr-nota');
    if (!res){ if (n) n.remove(); return; }
    if (!n){ n = nodo('p', 'v88-tr-nota'); TRF.premio.insertAdjacentElement('afterend', n); }
    if (res.espera){ n.textContent = 'Registrando na sua conta…'; return; }
    if (res.erro){ n.textContent = 'A conta não registrou este treino (' + String(res.erro).slice(0, 80) + ').'; return; }
    premioNos(TRF.premio, {p:{m:res.moedas | 0, g:res.gemas | 0, xp:0}});
    n.textContent = (res.moedas || res.gemas ? 'Na sua conta.' : 'Sem moedas agora: o treino de hoje já pagou o teto do dia.') + (res.nota ? ' ' + res.nota : '');
  } catch (_) {}
}
const trUiMostraAntes88 = trUiMostra;
trUiMostra = function(){ const r = trUiMostraAntes88.apply(this, arguments); v88TreinoNota(); return r; };

/* ---------------------------------------------------------------- 3) os cartões novos e as escolhas em cima da tela TREINO */
const V88_TR_IC = {
  posic:'<circle cx="42" cy="22" r="13" fill="none" stroke="#fff" stroke-width="4" stroke-dasharray="5 4"/><circle cx="16" cy="48" r="8" fill="#fff"/><path d="M23 42l10-11" stroke="#fff" stroke-width="5" stroke-linecap="round"/><path d="M28 29l7-1-1 7" fill="none" stroke="#fff" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>',
  defesa:'<path d="M30 6l20 7v14c0 12-8 20-20 26C18 47 10 39 10 27V13z" fill="none" stroke="#fff" stroke-width="5" stroke-linejoin="round"/><circle cx="48" cy="48" r="9" fill="#fff" stroke="#1b1b28" stroke-width="2.5"/><path d="M22 29l6 6 9-11" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>',
  goleiro:'<path d="M6 52V16h52v36" fill="none" stroke="#fff" stroke-width="5" stroke-linejoin="round"/><path d="M12 24h40M12 32h40M12 40h40M20 16v36M32 16v36M44 16v36" stroke="rgba(255,255,255,.35)" stroke-width="2"/><path d="M18 38c5-9 10-13 14-13s9 4 14 13" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round"/><circle cx="32" cy="20" r="6" fill="#fff"/>',
  bots:'<circle cx="20" cy="30" r="12" fill="#fff"/><circle cx="44" cy="30" r="12" fill="none" stroke="#fff" stroke-width="4"/><rect x="38" y="27" width="12" height="5" rx="2" fill="#fff"/><path d="M14 52h36" stroke="#fff" stroke-width="4" stroke-linecap="round"/>'
};
const V88_TR_COR = {posic:'#2fbf5b', defesa:'#3f8cff', goleiro:'#a259f0', bots:'#ff5a4f'};
(function v88TreinoCartoes(){
  if (!LB.trGrade) return;
  for (const id of ['posic', 'defesa', 'goleiro']){
    if (trCards.has(id)) continue;
    const b = novoBotao('tr-card'); b.dataset.tr = id;
    const ic = nodo('span', 'tr-ic'); ic.style.setProperty('--c', V88_TR_COR[id]); ic.innerHTML = '<svg viewBox="0 0 64 64" aria-hidden="true">' + V88_TR_IC[id] + '</svg>';
    const nome = nodo('b', null, TR_INFO[id].nome), desc = nodo('span'), rec = nodo('em');
    b.append(ic, nome, desc, rec); LB.trGrade.appendChild(b); trCards.set(id, {b, desc, rec});
  }
  const b = novoBotao('tr-card v88-tr-bots'); b.dataset.v88bots = '1';        // TREINO COM BOTS: a partida de treino (abre as escolhas)
  const ic = nodo('span', 'tr-ic'); ic.style.setProperty('--c', V88_TR_COR.bots); ic.innerHTML = '<svg viewBox="0 0 64 64" aria-hidden="true">' + V88_TR_IC.bots + '</svg>';
  b.append(ic, nodo('b', null, 'Treino com bots'), nodo('span', null, 'Uma partida contra os bots que não vale patente nem prêmio: escolha o tamanho, o campo, o nível e o tempo.'), nodo('em'));
  b.addEventListener('click', e => { e.stopPropagation(); som.clique(); v88BotsPop(); });
  LB.trGrade.appendChild(b);
  const ops = nodo('div', 'v88-tr-ops'); ops.id = 'v88-tr-ops';               // as escolhas em cima: CAMPO, TAMANHO, DIFICULDADE e RELÓGIO
  LB.trGrade.parentNode.insertBefore(ops, LB.trGrade);
  const box = document.getElementById('lb-stats');                           // os recordes dos novos no perfil
  if (box) for (const id of ['posic', 'defesa', 'goleiro']){
    if (LB_REC.cards.has(id)) continue;
    const c = nodo('div', 'card rec'); c.append(nodo('small', null, TR_INFO[id].nome.toUpperCase()), nodo('b'), nodo('em'));
    box.appendChild(c); LB_REC.cards.set(id, c);
  }
})();
function v88Seg(rot, opcoes, atual, fn, cls){               // um seletor de botões (o atual aceso)
  const d = nodo('div', 'v88-seg' + (cls ? ' ' + cls : '')); d.appendChild(nodo('b', 'v88-seg-rot', rot));
  const g = nodo('div', 'v88-seg-g tl-seg'); g.setAttribute('role', 'radiogroup'); g.setAttribute('aria-label', rot);
  for (const [v, t] of opcoes){
    const b = novoBotao('v88-seg-b' + (v === atual ? ' on' : ''), rot + ': ' + t); b.textContent = t; b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', String(v === atual));
    b.addEventListener('click', e => { e.stopPropagation(); som.clique(); fn(v); }); g.appendChild(b);
  }
  d.appendChild(g); return d;
}
function v88CamposTreino(){ try { const L = v702Mapas(); return Array.isArray(L) && L.length ? L : [campo]; } catch (_) { return [campo]; } }
function v88TreinoOps(){
  const ops = document.getElementById('v88-tr-ops'); if (!ops) return;
  ops.textContent = '';
  const L = v88CamposTreino();
  ops.appendChild(v88Seg('CAMPO', L.map(i => [i, CAMPOS[i].nome.toUpperCase()]), campo, i => { if (i !== campo) novoCampo(modo, i); renderTreino(); }));
  ops.appendChild(v88Seg('TAMANHO', MODOS.map((m, i) => [i, (i + 1) + 'v' + (i + 1)]), modo, i => { if (i !== modo) novoCampo(i, campo); renderTreino(); }, 'v88-seg-curto'));
  ops.appendChild(v88Seg('DIFICULDADE', Object.keys(V88_DIF).map(k => [k, V88_DIF[k].nome]), V88T.dif, v => { V88T.dif = v; v88TreinoSalva(); renderTreino(); }));
  ops.appendChild(v88Seg('TREINO LIVRE', [[0, 'SEM RELÓGIO'], [2, '2 MIN'], [5, '5 MIN'], [10, '10 MIN']], V88T.dur, v => { V88T.dur = v; v88TreinoSalva(); renderTreino(); }));
}
const renderTreinoAntes88 = renderTreino;
renderTreino = function(){
  const r = renderTreinoAntes88.apply(this, arguments);
  try {
    v88TreinoOps();
    const c = trCards.get('cond'); if (c){ const t = c.b.querySelector('b'); if (t) t.textContent = 'Drible (condução)'; }
    const lv = trCards.get('livre'); if (lv) lv.desc.textContent = V88T.dur ? 'Você, a bola e os gols, com relógio de ' + V88T.dur + ' minutos: quantos gols você faz?' : 'Você, a bola e os gols. Sem relógio: chute à vontade.';
    if (V88T.dif !== 'normal') for (const [id, x] of trCards) if (id !== 'livre' && x.rec) x.rec.appendChild(nodo('i', 'v88-tr-dif', 'no ' + V88_DIF[V88T.dif].nome.toLowerCase() + ': o recorde só conta no Normal'));
  } catch (e) { console.error(e); }
  return r;
};

/* ---------------------------------------------------------------- 4) o treino livre com relógio (pausa: o relógio para) */
LB.trGrade && LB.trGrade.addEventListener('click', e => {
  const b = e.target.closest('.tr-card'); if (!b || b.dataset.tr !== 'livre' || !V88T.dur) return;
  setTimeout(() => { if (!lobby.aberto && !RQ.on) v88LivreComeca(); }, 60);
});
function v88LivreComeca(){
  v88LivreFim(true);
  const el = nodo('div', 'v88-livre'); el.setAttribute('role', 'timer'); el.setAttribute('aria-label', 'Relógio do treino livre');
  el.append(nodo('small', null, 'TREINO LIVRE'), nodo('b', 'v88-livre-t'), nodo('span', 'v88-livre-g'));
  (document.getElementById('wrap') || document.body).appendChild(el);
  V88T.livre = {el, resta:V88T.dur*60000, ult:performance.now(), gols:0, min:V88T.dur, T:setInterval(v88LivreTique, 200)};
  v88LivreTique();
}
function v88LivreTique(){
  const L = V88T.livre; if (!L) return;
  if (lobby.aberto || RQ.on || TR.on){ v88LivreFim(true); return; }
  const agora = performance.now(), dt = agora - L.ult; L.ult = agora;
  const parado = (typeof PAUSA !== 'undefined' && PAUSA.aberta) || document.hidden || (typeof editing !== 'undefined' && editing);
  if (!parado) L.resta = Math.max(0, L.resta - Math.min(dt, 1000));
  L.el.classList.toggle('pausado', !!parado);
  const s = Math.ceil(L.resta/1000);
  L.el.querySelector('.v88-livre-t').textContent = Math.floor(s/60) + ':' + String(s % 60).padStart(2, '0');
  L.el.querySelector('.v88-livre-g').textContent = L.gols + (L.gols === 1 ? ' gol' : ' gols');
  L.el.classList.toggle('fim', s <= 10);
  if (!L.resta) v88LivreFim(false);
}
function v88LivreFim(calado){
  const L = V88T.livre; if (!L) return;
  clearInterval(L.T); L.el.remove(); V88T.livre = null;
  if (calado) return;
  som.apito('fim');
  try { abrirLobby(); } catch (_) {}
  setTimeout(() => abrePop(c => {
    c.classList.add('v88-pop');
    c.append(nodo('span', 'pop-tag', 'TREINO LIVRE'), nodo('h2', null, 'TEMPO!'), nodo('p', 'pop-txt', 'Você fez ' + L.gols + (L.gols === 1 ? ' gol' : ' gols') + ' em ' + L.min + (L.min === 1 ? ' minuto.' : ' minutos.')));
    const a = nodo('div', 'pop-acoes');
    a.append(botaoPop('VOLTAR', '', () => { som.clique(); fechaPop(); }), botaoPop('DE NOVO', 'verde', () => { som.clique(); fechaPop(); trEscolhe('livre'); jogar(); setTimeout(v88LivreComeca, 60); }));
    c.appendChild(a);
  }), 250);
}

/* ---------------------------------------------------------------- 5) o treino com bots (a partida que não vale nada) */
function v88BotsTreino(){ return !!(RQ.on && !NET49.playing && X49.matchMode === 'treino'); }
function v88BotsPop(){
  const L = v88CamposTreino();
  if (L.indexOf(V88T.botsMapa) < 0) V88T.botsMapa = L[0];
  abrePop(c => {
    c.classList.add('v88-pop', 'v88-bots-pop');
    c.append(nodo('span', 'pop-tag', 'TREINO'), nodo('h2', null, 'TREINO COM BOTS'), nodo('p', 'pop-txt', 'Uma partida contra os bots para treinar: não mexe na patente e não dá moedas, XP nem missões. A física é a mesma de sempre.'));
    const box = nodo('div', 'v88-bots-ops'); c.appendChild(box);
    const pinta = () => {
      box.textContent = '';
      box.appendChild(v88Seg('TAMANHO', [[1, '1v1'], [2, '2v2'], [3, '3v3'], [4, '4v4']], V88T.botsN, v => { V88T.botsN = v; v88TreinoSalva(); pinta(); }));
      box.appendChild(v88Seg('CAMPO', L.map(i => [i, CAMPOS[i].nome.toUpperCase()]), V88T.botsMapa, v => { V88T.botsMapa = v; v88TreinoSalva(); pinta(); }));
      box.appendChild(v88Seg('BOTS', [['facil', 'FÁCEIS'], ['dificil', 'DIFÍCEIS'], ['aleatoria', 'SORTEIO']], V88T.botsNivel, v => { V88T.botsNivel = v; v88TreinoSalva(); pinta(); }));
      box.appendChild(v88Seg('TEMPO', [[2, '2 MIN'], [3, '3 MIN'], [5, '5 MIN']], V88T.botsDur, v => { V88T.botsDur = v; v88TreinoSalva(); pinta(); }));
    };
    pinta();
    const a = nodo('div', 'pop-acoes');
    a.append(botaoPop('VOLTAR', '', () => { som.clique(); fechaPop(); }), botaoPop('JOGAR', 'verde', () => { som.clique(); fechaPop(); v88BotsComeca(); }));
    c.appendChild(a);
  });
}
function v88BotsComeca(){
  if (NET49.playing || NET49.room) return v88Aviso('Saia da sala antes de treinar com os bots.');
  try { if (typeof V79R !== 'undefined' && V79R.busca && typeof v79BuscaCancela === 'function') v79BuscaCancela(); } catch (_) {}
  if (!V88T.botsAntes) V88T.botsAntes = {nivel:X49.nivelCas};
  X49.mode = 'treino'; X49.nivelCas = V88T.botsNivel; X49.jogo = 'futebol';
  try { x49Start(V88T.botsN, V88T.botsMapa); } catch (e) { console.error(e); v88Aviso('Não deu para começar o treino.'); v88BotsVolta(); }
}
function v88BotsVolta(){                                    // de volta ao lobby: o JOGAR continua sendo a ranqueada
  const a = V88T.botsAntes; if (!a) return;
  V88T.botsAntes = null; X49.mode = 'ranked'; X49.nivelCas = a.nivel; X49.jogo = 'futebol';
  X49.n = [1, 2, 3, 4].indexOf(CONTA.rq.n) >= 0 ? CONTA.rq.n : 2; X49.map = MAPA_RQ;
  try { x49Save(); } catch (_) {}
}
const rqComecaAntes88 = rqComeca;
rqComeca = function(){
  const r = rqComecaAntes88.apply(this, arguments);
  try { if (v88BotsTreino() && RQ.v80) RQ.v80 = {seg:V88T.botsDur*60, ot:60}; } catch (_) {}
  return r;
};
const x49ModeNameAntes88 = x49ModeName;
x49ModeName = function(){ if (!NET49.playing && X49.matchMode === 'treino') return 'TREINO COM BOTS'; return x49ModeNameAntes88.apply(this, arguments); };
// não vale nada: sem o evento da partida para a conta, sem as moedas da partida e dos gols, sem as missões e sem contar
// partida no perfil (as tampinhas que liberam com partidas completas); nas estatísticas do aparelho entra como TREINO
const v70EvInicioAntes88 = v70EvInicio;
v70EvInicio = function(){ if (v88BotsTreino()) return; return v70EvInicioAntes88.apply(this, arguments); };
const ecoPartidaAntes88 = ecoPartida;
ecoPartida = function(){ if (v88BotsTreino()) return null; return ecoPartidaAntes88.apply(this, arguments); };
const ecoPartidaFimAntes88 = ecoPartidaFim;
ecoPartidaFim = function(R, ctx){ if (ctx === 'treino') return; return ecoPartidaFimAntes88.apply(this, arguments); };
const ecoGolAntes88 = ecoGol;
ecoGol = function(tipo){
  if (tipo === 'livre' && V88T.livre) V88T.livre.gols++;
  if (tipo === 'partida' && v88BotsTreino()){ ganhoGol = 0; return; }
  return ecoGolAntes88.apply(this, arguments);
};
const estCtxAntes88 = estCtx;
estCtx = function(){ return v88BotsTreino() ? 'treino' : estCtxAntes88.apply(this, arguments); };
const estResultadoAntes88 = estResultado;
estResultado = function(R, ctx, info){ return estResultadoAntes88.call(this, R, v88BotsTreino() && ctx === 'casual' ? 'treino' : ctx, info); };
const pxHistoricoAntes88 = pxHistorico;
pxHistorico = function(R, ctx, o){ return pxHistoricoAntes88.call(this, R, v88BotsTreino() && ctx === 'casual' ? 'treino' : ctx, o); };
const x49RecordAntes88 = x49Record;
x49Record = function(R){
  if (!v88BotsTreino()) return x49RecordAntes88.apply(this, arguments);
  const s = {seq:X49.seq, bestSeq:X49.bestSeq, fastest:X49.fastest};
  const r = x49RecordAntes88.apply(this, arguments);
  Object.assign(X49, s);                                    // (a sequência de vitórias é das partidas de verdade)
  const h = X49.history[X49.history.length - 1]; if (h && h.at > Date.now() - 2000) h.ctx = 'treino';
  try { x49Save(); } catch (_) {}
  return r;
};
const rqFechaContaAntes88 = rqFechaConta;
rqFechaConta = function(){
  if (!v88BotsTreino()) return rqFechaContaAntes88.apply(this, arguments);
  const st = perfil.st, s = {partidas:st.partidas, concluidas:st.concluidas, vitorias:st.vitorias, semSofrer:st.semSofrer};
  const r = rqFechaContaAntes88.apply(this, arguments);
  Object.assign(st, s); try { perfilSalvar(); } catch (_) {}
  return r;
};
const abrirLobbyAntes88t = abrirLobby;
abrirLobby = function(){ const r = abrirLobbyAntes88t.apply(this, arguments); try { if (V88T.botsAntes && !RQ.on) v88BotsVolta(); } catch (_) {} return r; };
