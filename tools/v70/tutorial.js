/* ==================================================================================================================
   RACHA rua v70 · Etapa 4 — PRIMEIROS TOQUES (o tutorial), O DOMÍNIO, AS INTRODUÇÕES DOS MODOS E OS INDICADORES
   1) PRIMEIROS TOQUES: cinco passos curtos no motor dos treinos (o mesmo campo, a mesma física e os mesmos botões):
      andar até o círculo · ficar ATRÁS da bola · CHUTE (a bola sai do centro da tampinha para o centro da bola) · PASSE (a
      batida fraca na mesma direção: não escolhe companheiro sozinho) · o botão ARMADO (segurou longe da bola: a batida sai
      quando encostar). Abre na primeira vez (no lugar do aquecimento de 20 s), fica no TREINAMENTO e pula quando quiser.
   2) O DOMÍNIO: o cartão e o campo dizem que, só nesse treino, o PASSE domina a bola que vem (depois volta a ser passe).
   3) Os modos: na primeira partida de COM CURVA, GINGA, VÔLEI, AMERICANO e BASQUETE, um cartão curto com os controles e a
      pontuação (e o COMO JOGA no JOGAR › CASUAL, para ver de novo).
   4) Os controles especiais: a carga da CURVA em porcentagem (e o CHEIA · SOLTE), a espera da FINTA e do DRIBLE em
      segundos, e a janela do GOL DE GINGA (vale 2) com o tempo que falta, embaixo do placar.
   5) Na apresentação dos times, os bots aparecem como BOT com o nível de verdade (Fácil/Difícil), não com um elo inventado.
   Nada aqui mexe na física: o tutorial só põe a bola e você no lugar, como os outros treinos.
   ================================================================================================================== */

/* ---------------------------------------------------------------- 1) PRIMEIROS TOQUES */
TR_INFO.tut = {nome:'Primeiros toques', rod:5, est:[1, 3, 5],
  obj:'Andar, ficar atrás da bola, chutar, passar e o botão armado: cinco passos curtos.', dica:'Leva um minuto · pule quando quiser'};
const TU = {antes:null, onb:false, el:null, passoVisto:-1, fim:false};
const tuTecla = a => { try { const c = (TECLA.acoes[a] || [])[0]; return c ? teclaNome(c) : ''; } catch (_) { return ''; } };
function tuPassos(){                                    // os textos (com as teclas que valem agora: o jogador pode ter trocado)
  const mv = 'WASD ou setas', ps = tuTecla('passe'), ch = tuTecla('chute');
  return [
    {tit:'ANDAR', txt:'Leve a sua tampinha até o círculo amarelo.', como:'Toque: arraste o analógico. Teclado: ' + mv + '.'},
    {tit:'FIQUE ATRÁS DA BOLA', txt:'A bola sai na direção da sua tampinha para a bola. Pare no círculo, atrás dela, com o gol na frente.', como:'Ainda não chute: só se posicione.'},
    {tit:'CHUTE', txt:'Encoste na bola e toque CHUTE. A força é sempre a mesma: quem mira é a sua posição.', como:'CHUTE: o botão de baixo' + (ch ? ' · tecla ' + ch : '') + '. Faça o gol.'},
    {tit:'PASSE', txt:'PASSE é uma batida mais fraca, na mesma direção. Ele NÃO escolhe o companheiro sozinho: fique atrás da bola mirando nele.', como:'PASSE: o botão de cima' + (ps ? ' · tecla ' + ps : '') + '. Passe para o companheiro aceso.'},
    {tit:'BOTÃO ARMADO', txt:'Segure CHUTE antes de chegar na bola: aparece ARMADO. Continue segurando e encoste: a batida sai sozinha e o botão pisca.', como:'Assim você chega batendo, sem esperar o toque certo.'}
  ];
}
TR_X.tut = {
  monta(){
    const G = TR.G;
    TR.st = {passos:0};
    TR.tuComp = null;
    TR.motor.poeJog(-G.L*.5, -G.A*.15);
    TR.motor.poeBola(G.L*.35, -G.A*.45, 0, 0);
    TU.passoVisto = -1; TU.fim = false; tuPainel();
  },
  prep(){
    const G = TR.G, rp = G.rp, r = TR.r, k = TR.rod; r.prepT = 24; r.pausaT = 70; r.t0 = TR.tk; r.armou = false; r.passou = 0;
    r.etapa = k <= 2 ? 'vem' : '';                       // (o círculo pisca forte, como o do Domínio)
    TR.zonas.length = 0; trAcende(null); TR.rec = [];
    if (k === 1){                                       // andar até o círculo
      TR.zonas.push({x:G.L*.02, y:G.A*.35, r:rp*1.7});   // (na metade de baixo: o painel do passo fica em cima)
      TR.motor.poeBola(G.L*.35, -G.A*.45, 0, 0);
    } else if (k === 2 || k === 3){                     // atrás da bola (e o chute)
      const bx = G.L*.42; r.bola = {x:bx, y:0};
      TR.motor.poeBola(bx, 0, 0, 0);
      if (k === 2) TR.zonas.push({x:bx - (rp + G.rb + rp*1.05), y:0, r:rp*1.15});
      if (k === 3 && trDist(TR.jog, r.bola) > rp*6) TR.motor.poeJog(bx - rp*3.2, 0);
    } else if (k === 4){                                // o passe para o companheiro aceso
      if (!TR.tuComp) TR.tuComp = trNpc({funcao:'comp', time:0, txt:'10'});
      const n = TR.tuComp; trCasa(n, G.L*.2, -G.A*.5); trAcende(n); TR.rec = [n];
      TR.motor.poeBola(-G.L*.08, -G.A*.1, 0, 0); TR.motor.poeJog(-G.L*.3, G.A*.05);
    } else {                                            // o botão armado
      if (TR.tuComp){ trAcende(null); trCasa(TR.tuComp, -G.L*.62, -G.A*.62); }
      TR.motor.poeBola(G.L*.32, -G.A*.2, 0, 0); TR.motor.poeJog(-G.L*.18, G.A*.28);
    }
    tuPainel();
  },
  vai(){},
  jogo(){
    const G = TR.G, rp = G.rp, r = TR.r, ev = TR.ev, b = TR.bola, k = TR.rod;
    trToques();
    const certo = txt => { som.ok(); trAviso(txt, '#9dff6b'); TR.st.passos = k; trFimRodada(); };
    const repete = txt => { trFalha(txt); TR.rod--; trFimRodada(); };
    if (k === 1){
      const z = TR.zonas[0]; if (z && trDist(TR.jog, z) <= z.r - rp*.25) certo('ISSO! VOCÊ ANDA COM O ANALÓGICO');
    } else if (k === 2){
      if (trDist(b, r.bola) > G.rb*1.5){ TR.motor.poeBola(r.bola.x, r.bola.y, 0, 0); trAviso('AINDA NÃO CHUTE: SÓ FIQUE ATRÁS DA BOLA', '#ffe45e'); }
      const z = TR.zonas[0]; if (z && trDist(TR.jog, z) <= z.r) certo('ATRÁS DA BOLA: A MIRA ESTÁ NO GOL');
    } else if (k === 3){
      if (ev.chuteH === 1) trAviso('ESSE FOI O PASSE (FRACO). AGORA É O CHUTE', '#ffe45e');
      if (ev.gol > 0){
        TR.banner = 'GOL!'; goalT = 0; spawnConfetti(); som.gol();
        if (r.chutes) return certo('GOL! FOI A SUA POSIÇÃO QUE MIROU');
        return repete('ENTROU, MAS SEM CHUTE. AGORA COM O CHUTE');
      }
      if (ev.gol < 0) return repete('GOL CONTRA! FIQUE DO OUTRO LADO DA BOLA');
      if (r.chutes && trVel(b) < G.vJog*.25 && TR.tk - r.ultT > 50) return repete('QUASE! ATRÁS DA BOLA, MIRANDO NO GOL, E CHUTE DE NOVO');
      if (!r.chutes && TR.tk - r.t0 > 60*20 && !r.dica){ r.dica = true; trAviso('A LINHA PONTILHADA MOSTRA PARA ONDE A BOLA VAI', '#ffe45e'); }
    } else if (k === 4){
      const n = TR.tuComp;
      if (ev.chuteH === 2){ r.passou = 2; trAviso('ESSE FOI O CHUTE (FORTE). USE O PASSE', '#ffe45e'); }
      else if (ev.chuteH === 1) r.passou = 1;
      if (n && trPegou(n, rp*.6)){
        if (r.passou === 1) return certo('PASSE CERTO! VOCÊ MIROU NELE');
        return repete(r.passou === 2 ? 'CHEGOU, MAS FOI CHUTE. AGORA COM O PASSE' : 'TOQUE PASSE PARA A BOLA IR ATÉ ELE');
      }
      if (ev.gol) return repete('A BOLA ENTROU NO GOL. AGORA É PASSE PARA O COMPANHEIRO');
      if (r.passou && trVel(b) < G.vJog*.2 && TR.tk - r.ultT > 60) return repete('ERROU A MIRA: FIQUE ATRÁS DA BOLA, NA LINHA DELE');
    } else {
      if (ARMADO.desde && performance.now() - ARMADO.desde > 150 && !r.armou){ r.armou = performance.now(); trAviso('ARMADO! AGORA ENCOSTE NA BOLA', '#ffe45e'); }
      if (ev.chuteH){
        if (r.armou && ARMADO.saiuT >= r.armou) return certo('SAIU SOZINHA QUANDO ENCOSTOU!');
        trAviso('SAIU, MAS SEM ARMAR: SEGURE O CHUTE ANTES DE ENCOSTAR', '#ffe45e');
        TR.motor.poeBola(G.L*.32, -G.A*.2, 0, 0); TR.motor.poeJog(-G.L*.18, G.A*.28); r.armou = false;
      }
    }
  },
  resumo(){ return 'Você andou, se posicionou, chutou, passou e usou o botão armado.'; }
};
function tutComeca(o){                                   // abre o tutorial (do lobby, do TREINAMENTO ou da primeira vez)
  o = o || {};
  if (!TU.antes || TR.id !== 'tut') TU.antes = {id:TR.id === 'tut' ? 'livre' : TR.id, modo};
  TU.onb = !!o.onb;
  if (RQ.on) rqSai();
  TR.id = 'tut';
  if (modo > 1) novoCampo(1, campo);                     // (num campo grande o caminho fica longo: o tutorial usa o 2v2)
  else trMonta();
  if (lobby.aberto) jogar();
}
function tuSai(){                                        // deixa o tutorial: o treino de antes volta a ser o escolhido
  if (TR.id !== 'tut') return;
  const a = TU.antes || {id:'livre', modo}; TU.antes = null;
  TR.id = TR_LISTA.indexOf(a.id) >= 0 ? a.id : 'livre';
  tuPainel(true);
  if (a.modo !== modo && a.modo != null) novoCampo(a.modo, campo); else trMonta();
}
function tuMarcaVisto(){ if (CONTA.vistos.indexOf('tut') < 0){ CONTA.vistos.push('tut'); contaSalvar(); return true; } return false; }
function tuPainel(esconde){                              // o painel do passo (em cima, no tamanho real da tela; lido pelo leitor de tela)
  let el = TU.el;
  if (!el){
    el = TU.el = nodo('div', 'tu-painel'); el.setAttribute('role', 'region'); el.setAttribute('aria-label', 'Primeiros toques');
    const cab = nodo('div', 'tu-cab'), passo = nodo('small', 'tu-passo'), pular = novoBotao('tu-pular');
    pular.textContent = 'PULAR'; pular.setAttribute('aria-label', 'Pular o tutorial');
    pular.addEventListener('click', () => { som.clique(); tuPula(); });
    cab.append(passo, pular);
    const tit = nodo('b', 'tu-tit'), tx = nodo('p', 'tu-txt'), como = nodo('p', 'tu-como'), pts = nodo('div', 'tu-pontos');
    tx.setAttribute('aria-live', 'polite');
    el.append(cab, tit, tx, como, pts); el.hidden = true;
    (document.getElementById('wrap') || document.body).appendChild(el);
  }
  const on = !esconde && TR.on && TR.id === 'tut' && !lobby.aberto && !TU.fim;
  el.hidden = !on || PAUSA.aberta || editing;
  if (!on) return;
  const lk = innerWidth + 'x' + innerHeight + '|' + HUDX.k + '|' + (hud.kick ? Math.round(hud.kick.x) + ',' + Math.round(hud.kick.y) : '') + '|' + (TR.rod || 0);
  if (TU.lugarK !== lk && !el.hidden){ TU.lugarK = lk; tuLugar(el); }
  const k = Math.max(1, Math.min(5, TR.rod || 1)), P5 = tuPassos()[k - 1];
  if (TR.fase === 'intro'){ el.querySelector('.tu-passo').textContent = 'PRIMEIROS TOQUES'; el.querySelector('.tu-tit').textContent = 'VAMOS LÁ'; el.querySelector('.tu-txt').textContent = TR_INFO.tut.obj; el.querySelector('.tu-como').textContent = TR_INFO.tut.dica; }
  else if (TU.passoVisto !== k){
    TU.passoVisto = k;
    el.querySelector('.tu-passo').textContent = 'PRIMEIROS TOQUES · PASSO ' + k + ' DE 5';
    el.querySelector('.tu-tit').textContent = P5.tit; el.querySelector('.tu-txt').textContent = P5.txt; el.querySelector('.tu-como').textContent = P5.como;
  }
  const pts = el.querySelector('.tu-pontos');
  if (pts.childNodes.length !== 5){ pts.textContent = ''; for (let i = 0; i < 5; i++) pts.appendChild(nodo('i')); }
  Array.from(pts.children).forEach((d, i) => { d.classList.toggle('ok', i < (TR.st.passos || 0)); d.classList.toggle('agora', i === k - 1 && TR.fase !== 'intro'); });
}
function tuLugar(el){                                   // o painel no maior vão livre do alto da tela (sem cobrir pausa, PASSE, CHUTE...); sem vão, embaixo
  try {
    const css = HUDX.css || 1, r0 = cv.getBoundingClientRect(), vw = innerWidth, alt = el.offsetHeight || 140;
    const obst = (yTopo, yFim) => {                       // os pedaços [x0, x1] ocupados entre yTopo e yFim (px da tela)
      const l = [[r0.left + (BTN_PAUSA.x - 16)*css, r0.left + (BTN_PAUSA.x + BTN_PAUSA.w + 16)*css, r0.top + BTN_PAUSA.y*css, r0.top + (BTN_PAUSA.y + BTN_PAUSA.h)*css]];
      for (const k of ORDEM_TOQUE.concat(['joy'])){
        const e = hud[k]; if (!e || !controleVisivel(k)) continue;
        const r = (k === 'joy' ? JOY.aro*hud.joy.al + JOY.knob*hud.joy.km : BASE[k].r)*(e.s || 1);
        l.push([r0.left + (e.x - r - 12)*css, r0.left + (e.x + r + 12)*css, r0.top + (e.y - r)*css, r0.top + (e.y + r)*css]);
      }
      return l.filter(o => o[3] > yTopo && o[2] < yFim).map(o => [o[0], o[1]]).sort((a, b) => a[0] - b[0]);
    };
    const vao = (yTopo, yFim) => {                        // o maior vão horizontal livre nessa faixa
      let x = 8, melhor = [0, 0];
      for (const [a, b] of obst(yTopo, yFim).concat([[vw - 8, vw]])){ if (a - x > melhor[1] - melhor[0]) melhor = [x, a]; x = Math.max(x, b); }
      return melhor;
    };
    if (r0.top >= alt + 54){                             // tela em pé: sobra espaço em cima do campo (o painel fica fora dele)
      el.style.top = Math.max(48, r0.top - alt - 10) + 'px'; el.style.bottom = 'auto'; el.style.left = (vw/2) + 'px'; el.style.width = Math.min(640, vw - 24) + 'px'; return;
    }
    const topo = Math.max(8, r0.top + 6), cima = vao(topo, topo + alt);
    const larg = c => Math.min(640, c[1] - c[0] - 12);
    if (larg(cima) >= 300){ el.style.top = topo + 'px'; el.style.bottom = 'auto'; el.style.left = ((cima[0] + cima[1])/2) + 'px'; el.style.width = larg(cima) + 'px'; return; }
    const fim = Math.min(innerHeight, r0.bottom) - 6, baixo = vao(fim - alt, fim);
    if (larg(baixo) >= 260){ el.style.top = 'auto'; el.style.bottom = (innerHeight - fim) + 'px'; el.style.left = ((baixo[0] + baixo[1])/2) + 'px'; el.style.width = larg(baixo) + 'px'; return; }
    el.style.top = topo + 'px'; el.style.bottom = 'auto'; el.style.left = (vw/2) + 'px'; el.style.width = Math.min(640, vw - 24) + 'px';
  } catch (_) {}
}
function tuPula(){                                       // PULAR: marca como visto e volta (na primeira vez, para o lobby com o convite de jogar)
  tuMarcaVisto(); TU.fim = true; tuPainel(true);
  const onb = TU.onb; TU.onb = false;
  abrirLobby();
  if (onb) tuConvite(false);
}
function tuConvite(feito){                               // (lobby) o convite para a primeira partida
  const pop = () => abrePop(c => {
    c.append(nodo('span', 'pop-tag', feito ? 'PRIMEIROS TOQUES' : 'BEM-VINDO'), nodo('h2', null, 'AGORA É JOGAR'),
      nodo('p', 'pop-txt', 'Toque em JOGAR para a primeira partida (casual, contra bots). O TREINAMENTO tem os exercícios e o tutorial, e as SALAS juntam a galera.'));
    const a = nodo('div', 'pop-acoes');
    a.append(botaoPop('DEPOIS', '', () => { som.clique(); fechaPop(); }), botaoPop('JOGAR', 'amarelo', () => { som.clique(); fechaPop(); X49.mode = 'casual'; x49Save(); jogoRapido(); }));
    c.appendChild(a);
  });
  if (LB.pop.hidden) pop(); else filaPop.unshift(pop);
}
// o fim do tutorial: a tela de fim do treino com o resumo (e um prêmio na primeira vez)
const trAcabaAntes70t = trAcaba;
trAcaba = function(){
  if (TR.id !== 'tut') return trAcabaAntes70t();
  TR.fase = 'fim'; TR.ft = 0; TR.presa = null; TR.motor.solta(); trAcende(null);
  const primeira = tuMarcaVisto(), p = primeira ? {m:100, xp:20, g:0} : null;
  TR.fim = {valor:5, est:3, novo:false, ant:null, txt:TR_X.tut.resumo(), premio:p ? {p, subiu:ganha(p)} : null};
  TR.fimT = 0; TU.fim = true; tuPainel(true); som.apito('fim');
};
const trUiMostraAntes70t = trUiMostra;
trUiMostra = function(){
  trUiMostraAntes70t();
  if (TR.id !== 'tut' || !TR.fim) return;
  TRF.pts.textContent = '5/5'; TRF.un.textContent = 'PASSOS'; TRF.rec.textContent = 'PRIMEIROS TOQUES CONCLUÍDOS'; TRF.rec.classList.add('novo');
  TRF.prox.textContent = TU.onb ? 'JOGAR A PRIMEIRA PARTIDA' : 'JOGAR UMA PARTIDA'; TRF.denovo.textContent = 'REPETIR';
};
TRF.prox.addEventListener('click', e => {                 // (no tutorial, o PRÓXIMO vira a primeira partida)
  if (TR.id !== 'tut') return;
  e.stopImmediatePropagation(); som.clique(); trUiFecha();
  TU.onb = false; tuSai(); X49.mode = 'casual'; x49Save(); x49Start(X49.n, X49.map);
}, true);
const abrirLobbyAntes70t = abrirLobby;
abrirLobby = function(inicio){                            // saiu do tutorial pelo lobby (pausa, fim, pular): o treino de antes volta
  const r = abrirLobbyAntes70t(inicio);
  if (TR.id === 'tut'){ TU.fim = true; tuSai(); }
  if (TU.el) TU.el.hidden = true;
  return r;
};
const trHudAntes70t = trHud;
trHud = function(g){                                      // no tutorial o painel de cima é o de DOM (o placar do treino não precisa)
  if (TR.id !== 'tut') return trHudAntes70t(g);
  tuPainel();
  const av = TR.aviso;
  if (av.t > 0 && TR.fase !== 'intro'){
    const k = HUDX.k || 1, y = H - 215*k;
    g.save(); g.globalAlpha = Math.min(1, av.t/.35); g.font = (30*k) + 'px ' + FONT; const w = Math.min(W - 40, g.measureText(av.txt).width + 40*k);
    rr(g, W/2 - w/2, y - 26*k, w, 52*k, 26*k); g.fillStyle = 'rgba(8,10,28,.78)'; g.fill(); g.restore();
    g.save(); g.globalAlpha = Math.min(1, av.t/.35); txt(g, av.txt, W/2, y, Math.min(30*k, 30*k*(W - 80)/Math.max(1, w)), av.cor, 'rgba(5,10,25,.95)', 6*k); g.restore();
  }
};
const trDesenhaChaoAntes70t = trDesenhaChao;
trDesenhaChao = function(g){                              // a linha da mira no tutorial e o recado do domínio no campo
  trDesenhaChaoAntes70t(g);
  if (!TR.on) return;
  const G = TR.G, rp = G.rp, t = trT, b = TR.bola, j = TR.jog;
  if (TR.id === 'tut' && (TR.rod === 2 || TR.rod === 3) && TR.fase !== 'intro'){
    const dx = b.x - j.x, dy = b.y - j.y, d = Math.hypot(dx, dy) || 1, ux = dx/d, uy = dy/d, L = Math.min(G.L*1.4, rp*16);
    g.save(); g.setLineDash([rp*.38, rp*.3]); g.lineDashOffset = -t*rp*1.4; g.lineWidth = rp*.12; g.strokeStyle = 'rgba(255,236,120,.85)'; g.lineCap = 'round';
    g.beginPath(); g.moveTo(j.x, j.y); g.lineTo(b.x + ux*L, b.y + uy*L); g.stroke(); g.setLineDash([]);
    trSeta(g, b.x + ux*(L - rp*1.6), b.y + uy*(L - rp*1.6), b.x + ux*L, b.y + uy*L, rp*.16, 'rgba(255,236,120,.95)');
    g.restore();
  }
  if (TR.id === 'tut' && TR.rod === 1 && TR.fase === 'jogo' && TR.zonas[0]){   // a seta da sua tampinha até o círculo
    const z = TR.zonas[0], dx = z.x - j.x, dy = z.y - j.y, d = Math.hypot(dx, dy);
    if (d > z.r + rp*1.5){ const ux = dx/d, uy = dy/d, a = .55 + .35*Math.sin(t*6); trSeta(g, j.x + ux*rp*1.5, j.y + uy*rp*1.5, j.x + ux*Math.min(d - z.r, rp*4.2), j.y + uy*Math.min(d - z.r, rp*4.2), rp*.16, 'rgba(255,236,120,' + a + ')'); }
    g.save(); g.lineWidth = rp*.14; g.strokeStyle = 'rgba(255,214,64,' + (.5 + .4*Math.sin(t*5)) + ')'; g.beginPath(); g.arc(z.x, z.y, z.r*(1.08 + .06*Math.sin(t*5)), 0, TAU); g.stroke(); g.restore();
  }
  if (TR.id === 'dom' && trDominio()){                    // só no Domínio: enquanto a bola vem, o PASSE domina
    for (const z of TR.zonas){ txt(g, 'AGORA O PASSE DOMINA', z.x, z.y - z.r - rp*.9, rp*.62, '#ffe45e', 'rgba(20,12,0,.92)', rp*.12); }
  }
};
const trMetaTxtAntes70t = trMetaTxt;
trMetaTxt = function(){ return TR.id === 'tut' ? '5 PASSOS · UM MINUTO' : trMetaTxtAntes70t(); };
// o cartão PRIMEIROS TOQUES no TREINAMENTO (antes dos 7 treinos)
(function tuCartao(){
  const grade = LB.trGrade; if (!grade) return;
  const b = novoBotao('tr-card tu-card'); b.dataset.tu = '1';
  const ic = nodo('span', 'tr-ic'); ic.style.setProperty('--c', '#2fa84f');
  ic.innerHTML = '<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="20" cy="40" r="12" fill="#fff"/><circle cx="44" cy="40" r="7" fill="#fff" stroke="#14301c" stroke-width="2.5"/><path d="M20 22V10M14 16l6-6 6 6" fill="none" stroke="#fff" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M33 40h3" stroke="#fff" stroke-width="4" stroke-linecap="round"/></svg>';
  b.append(ic, nodo('b', null, 'Primeiros toques'), nodo('span', null, 'O tutorial: andar, ficar atrás da bola, CHUTE, PASSE e o botão armado. Um minuto.'), nodo('em'));
  grade.insertBefore(b, grade.firstChild);
  b.addEventListener('click', e => { e.stopPropagation(); som.clique(); if (lobby.tela){ TELAS[lobby.tela].el.hidden = true; lobby.tela = null; } tutComeca(); });
  const renderTreinoAntes70t = renderTreino;
  renderTreino = function(){
    renderTreinoAntes70t();
    const em = b.querySelector('em'); em.textContent = '';
    em.append(nodo('i', null, CONTA.vistos.indexOf('tut') >= 0 ? 'feito ✓ · repita quando quiser' : 'comece por aqui · +100 moedas na primeira vez'));
  };
})();
// a primeira vez: depois do nome e da tampinha, o tutorial (no lugar do aquecimento de 20 s)
(function tuOnboarding(){
  const v = $('onb-bora'); if (!v) return;
  const n = v.cloneNode(true); v.replaceWith(n); n.textContent = 'BORA TREINAR';
  n.addEventListener('click', () => {
    som.clique(); if (ONB.escolha && ONB.escolha !== perfil.skin) equipaBotao(ONB.escolha);
    ONB.aberto = false; ONB.el.hidden = true; onbFim();
    tutComeca({onb:true});
  });
  const onbTampasAntes70t = onbTampas;
  onbTampas = function(){
    onbTampasAntes70t();
    const t = document.querySelector('#onb-2 p.pop-txt');
    if (t) t.textContent = t.textContent.replace(/Agora, 20 segundos de aquecimento\./, 'Agora, um treino rápido de primeiros toques: andar, chutar e passar (um minuto).');
  };
  const p2 = document.querySelector('#onb-2 p.pop-txt'); if (p2) p2.textContent = p2.textContent.replace(/Agora, 20 segundos de aquecimento\./, 'Agora, um treino rápido de primeiros toques: andar, chutar e passar (um minuto).');
})();

/* ---------------------------------------------------------------- 2) O DOMÍNIO explicado */
TR_INFO.dom.obj = 'Vá para o círculo e aperte PASSE quando a bola chegar: só neste treino, enquanto a bola vem, o PASSE DOMINA (amortece e prende a bola no pé). Depois ele volta a ser passe: mire no companheiro aceso.';
TR_INFO.dom.dica = 'Dominou no círculo: 2 · passe certo: 1 · o PASSE domina só enquanto a bola vem';

/* ---------------------------------------------------------------- 3) os modos: o cartão de como joga */
const TU_MODOS = {
  futebol:  {t:'FUTEBOL', l:[['META', 'Gol entre as traves. Primeiro a 3 gols.'], ['CHUTE E PASSE', 'A bola sai do centro da sua tampinha para o centro da bola: quem mira é a posição.']]},
  curva:    {t:'COM CURVA', l:[['CURVA', 'Segure CURVA para carregar (o anel enche; a porcentagem aparece). Solte para chutar: mais carga, mais efeito.'], ['O LADO', 'O analógico escolhe para onde a bola entorta. A linha pontilhada mostra o caminho.'], ['PASSE E CHUTE', 'Saem retos, como no futebol.'], ['META', 'Primeiro a 3 gols.']]},
  ginga:    {t:'GINGA', l:[['DRIBLE', 'Arranca com um toquinho na bola. Depois precisa recarregar (os segundos aparecem no botão).'], ['FINTA', 'Ameaça o chute sem bater: o goleiro e quem marca de perto caem.'], ['GOL DE GINGA', 'Gol logo depois de uma jogada que deu certo vale 2. Embaixo do placar aparece o tempo da janela.'], ['META', 'Primeiro a 5 pontos.']]},
  volei:    {t:'VÔLEI', l:[['A REDE', 'Ninguém passa do meio-campo: cada time fica do seu lado.'], ['PONTO', 'A bola no fundo deles vale 1, em qualquer lugar da linha.'], ['META', 'Primeiro a 3 pontos.']]},
  americano:{t:'AMERICANO', l:[['TOUCHDOWN', 'Só vale cruzando o fundo deles COM a bola no pé. Chutão de longe não conta.'], ['DEFESA', 'Encoste em quem leva a bola para tirar dele.'], ['META', 'Primeiro a 3 touchdowns.']]},
  basquete: {t:'BASQUETE', l:[['CESTA', 'Bola no aro: 2 pontos.'], ['DE TRÊS', 'Arremesso de fora do arco pontilhado: 3 pontos. Vale o arremesso que entrou, não um antigo.'], ['META', 'Primeiro a 12 pontos.']]}
};
const TUI = {el:null, aberto:false, depois:null};
function tuIntroAbre(md, depois){                         // o cartão (no tamanho real da tela, por cima da apresentação)
  const D = TU_MODOS[md]; if (!D){ if (depois) depois(); return; }
  let el = TUI.el;
  if (!el){
    el = TUI.el = nodo('div', 'tu-intro'); el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-labelledby', 'tu-intro-t');
    const cx = nodo('div', 'tu-intro-cx'), tag = nodo('span', 'tu-intro-tag', 'COMO JOGA'), h = nodo('h2'); h.id = 'tu-intro-t';
    const ul = nodo('dl', 'tu-intro-l'), bt = novoBotao('tu-intro-ok'); bt.textContent = 'BORA!';
    bt.addEventListener('click', () => { som.clique(); tuIntroFecha(); });
    el.addEventListener('keydown', e => { if (e.key === 'Escape' || e.key === 'Enter'){ e.preventDefault(); e.stopPropagation(); tuIntroFecha(); } if (e.key === 'Tab'){ e.preventDefault(); bt.focus(); } });
    cx.append(tag, h, ul, bt); el.appendChild(cx); el.hidden = true;
    (document.getElementById('wrap') || document.body).appendChild(el);
  }
  el.querySelector('h2').textContent = D.t;
  const ul = el.querySelector('.tu-intro-l'); ul.textContent = '';
  for (const [a, b] of D.l) ul.append(nodo('dt', null, a), nodo('dd', null, b));
  TUI.depois = depois || null; TUI.aberto = true; TUI.volta = document.activeElement; el.hidden = false; joy.id = null; ptrs.clear(); resetBotoes();
  setTimeout(() => { try { el.querySelector('.tu-intro-ok').focus({preventScroll:true}); } catch (_) {} }, 30);
}
function tuIntroFecha(){
  if (!TUI.el) return;
  TUI.el.hidden = true; TUI.aberto = false;
  const f = TUI.depois; TUI.depois = null; if (f) f();
  try { if (TUI.volta && document.contains(TUI.volta) && !TUI.volta.closest('[hidden]')) TUI.volta.focus({preventScroll:true}); else cv.focus({preventScroll:true}); } catch (_) {}
}
const rqVsAbreAntes70t = rqVsAbre;
rqVsAbre = function(){                                     // a primeira partida de cada modo: o cartão antes da apresentação seguir
  rqVsAbreAntes70t();
  tuBotsNaApresentacao();
  const md = RQ.jogo || 'futebol', k = 'intro:' + md;
  if (md !== 'futebol' && !NET49.playing && CONTA.vistos.indexOf(k) < 0){ CONTA.vistos.push(k); contaSalvar(); tuIntroAbre(md); }
};
const rqSaiAntes70t = rqSai;
rqSai = function(){ if (TUI.aberto){ TUI.depois = null; tuIntroFecha(); } return rqSaiAntes70t.apply(this, arguments); };   // (saiu da partida com o cartão aberto: ele fecha junto)
const ARB_PARADOAntes70t = ARB_PARADO;
ARB_PARADO = function(){ return TUI.aberto || ARB_PARADOAntes70t(); };   // (com o cartão aberto a partida espera: a física não anda)
function tuBotsNaApresentacao(){                           // os bots com o nível de verdade (o elo do bot era inventado e não mudava a força)
  if (NET49.playing || !VS.v) return;
  const nv = RQ_NIVEIS[RQ.nivel] ? RQ_NIVEIS[RQ.nivel].nome.toUpperCase() : '';
  for (const [ul, t] of [[VS.v, 0], [VS.a, 1]]){
    const bots = RQ.jog.filter(o => o.time === t);
    Array.from(ul.children).forEach((li, i) => {
      const q = bots[i]; if (!q || q.humano) return;
      const s = li.querySelector('small'), ins = li.querySelector('.vs-ins');
      if (s) s.textContent = 'BOT · ' + nv + (q.hm && q.hm.estilo ? ' · ' + q.hm.estilo.nome.toUpperCase() : '');
      if (ins){ ins.textContent = 'BOT'; ins.classList.add('vs-bot'); }
    });
  }
}
(function tuComoJoga(){                                    // JOGAR › CASUAL: o COMO JOGA do modo escolhido
  const desc = document.getElementById('rq-modo-desc'); if (!desc) return;
  const b = novoBotao('lb-btn tu-como-joga'); b.textContent = 'COMO JOGA';
  b.addEventListener('click', () => { som.clique(); tuIntroAbre(RQP.jogo || 'futebol'); });
  desc.insertAdjacentElement('afterend', b);
  const renderRanqueadaAntes70t = renderRanqueada;
  renderRanqueada = function(){ renderRanqueadaAntes70t(); b.hidden = JG.aba === 'ranked'; b.setAttribute('aria-label', 'Como joga: ' + MD_MAP.get(RQP.jogo || 'futebol').nome); };
})();

/* ---------------------------------------------------------------- 4) os controles especiais: carga, espera e a janela da ginga */
const v61BtnAntes70t = v61Btn;
v61Btn = function(k){
  v61BtnAntes70t(k);
  if (editing || !RQ.on || (ctlVis[k] || 0) <= .004) return;
  const e = hud[k], r = BASE[k].r*e.s, g = ctx;
  if (k === 'curva' && (CV.segura || CV.arma > 0)){        // a carga em porcentagem (e o CHEIA · SOLTE)
    const c = CV.segura ? CV.carga : CV.armaC, s = CV.arma > 0 && !CV.segura ? 'ARMADA · ENCOSTE' : c >= 1 ? 'CHEIA · SOLTE!' : 'CARGA ' + Math.round(c*100) + '%';
    const ty = e.y - r - 40 >= 24 ? e.y - r - 40 : e.y + r + 40, tx = Math.max(130, Math.min(W - 130, e.x));
    g.save(); g.font = '24px ' + FONT; const w = g.measureText(s).width + 26; rr(g, tx - w/2, ty - 20, w, 40, 20); g.fillStyle = 'rgba(8,10,28,.84)'; g.fill(); g.restore();
    txt(g, s, tx, ty, 24, c >= 1 ? '#aef52a' : '#7fe8ff', 'rgba(5,10,25,.95)', 4);
  } else if (k === 'finta' || k === 'drible'){             // a espera em segundos, no meio da fatia escura
    const cd = (k === 'finta' ? P.gnCdF : P.gnCdD) || 0, falta = (cd - RQ.tick)/TICKS_POR_S;
    if (falta > .05) txt(g, falta.toFixed(1).replace('.', ','), e.x, e.y - r*.12, Math.max(26, r*.42), '#ffffff', 'rgba(5,10,25,.95)', 6);
  }
};
const rqPlacar70Antes70t = rqPlacar70;
rqPlacar70 = function(g){                                   // a janela do GOL DE GINGA embaixo do placar (vale 2 enquanto o tempo corre)
  rqPlacar70Antes70t(g);
  if (RQ.jogo !== 'ginga' || (RQ.estado !== 'jogo' && RQ.estado !== 'saida')) return;
  const meu = NET49.playing ? (NET49.localSlot < 0 ? 0 : P.time) : 0, y0 = RQ.aviso.t > 0 || RQ.estado === 'saida' ? 118 : 74;
  let y = y0;
  for (const t of [meu, 1 - meu]){
    const m = GN.mov[t]; if (!m) continue;
    const resta = gnTk(GN_JANELA) - (RQ.tick - m.tick); if (resta <= 0 || gnTocou(1 - t, m.tick)) continue;
    const s = resta/TICKS_POR_S, nosso = t === meu, frac = Math.max(0, Math.min(1, resta/gnTk(GN_JANELA)));
    const tx = (nosso ? 'GOL DE GINGA VALE 2 · ' : 'GINGA DELES · ') + s.toFixed(1).replace('.', ',') + ' s', w = 380;
    rr(g, W/2 - w/2, y, w, 40, 20); g.fillStyle = 'rgba(8,10,28,.74)'; g.fill();
    rr(g, W/2 - w/2 + 8, y + 31, (w - 16)*frac, 5, 2.5); g.fillStyle = nosso ? '#ffd23f' : '#ff8a7a'; g.fill();
    txt(g, tx, W/2, y + 17, 21, nosso ? '#ffe45e' : '#ffb4a8', 'rgba(5,10,25,.95)', 5);
    y += 46;
  }
};
