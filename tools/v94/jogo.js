/* ======================================================================================================================
   RACHA v94 · O PASSO DA FÍSICA COM O MOTOR PRÓPRIO (o treino, a partida contra os bots e o tutorial)
   Com o motor próprio valendo (V94.motor 'v94', num campo que ele conhece), o physicsStep do jogo vira:
     · antes: os bots decidem (a inteligência de sempre: rqBots) e cada um, como você, vira um COMANDO do motor — a direção
       e os toques no PASSE/CHUTE (contados, como os do aparelho no online); os companheiros do treino viram tampinhas
       cinemáticas (andam pela conta do treino e a bola bate neles); o paredão e os cones viram obstáculos;
     · o que o jogo mexeu por fora (a saída, o reinício, a bola presa no pé do companheiro) entra no motor como teleporte;
     · M.passo() faz o resto: o movimento, a bola, as batidas, os chutes e as combinações, a barreira da saída e o gol;
     · depois: as posições voltam para os objetos de sempre (P, B, RQ.jog, TR.npcs — o desenho, a câmera, o replay e os bots
       leem deles) e os EVENTOS do motor viram o que o jogo fazia: o som, a vibração, o aro, quem tocou (a autoria), o gol.
   Um mundo do motor por contexto (o treino livre, cada exercício, cada partida); ele é refeito quando o contexto muda.
   ====================================================================================================================== */
const V94J = {
  W:null, chave:'', epoca:0,
  corpos:[],                        // [{o, tipo:'humano'|'bot'|'npc'}] — o índice é o do mundo
  sombra:[], bolaS:null,            // o que foi escrito nos objetos no último passo (para achar os teleportes do jogo)
  cont:[],                          // por jogador: os contadores de toques {np, nc} e o que estava apertado
  obst:[],                          // os obstáculos do treino (o índice do motor → o objeto do treino)
  ev:[],                            // os eventos do último passo (o medidor e os testes)
  curva:{carga:0},                  // o espelho da carga da CURVA (o anel do HUD)
};
const V94_ORDEM_MS = 2;             // (a ordem do relógio do toque: o PASSE pelo menos 2 ms antes, na especificação)

function v94Vale(){                 // o passo desta vez é do motor próprio?
  if (!v94Ligado() || !V94.campoOk) return false;
  if (NET49.playing) return false;  // (a sala online é do servidor; este é o offline)
  if (RQ.on && RQ.jogo !== 'futebol' && RQ.jogo !== 'curva') return false;
  return true;
}
const v94m = v => v/V94_PX, v94p = v => v*V94_PX;   // px ↔ metro

/* ---------------------------------------------------------------- o mundo do contexto */
function v94Chave(){
  return (RQ.on ? 'rq:' + RQ.jogo + ':' + RQ.jog.length : TR.on ? 'tr:' + TR.id + ':' + TR.npcs.length + ':' + TR.paredes.length + ':' + TR.cones.length : 'livre')
    + '|' + GEO_VER + '|' + V94J.epoca + '|' + V94.n;
}
function v94MundoNovo(motivo){ V94J.chave = ''; if (v94Vale()) v94Garante(); }
function v94Garante(){
  const k = v94Chave();
  if (V94J.W && V94J.chave === k) return;
  V94J.chave = k;
  const corpos = [];
  if (RQ.on){
    for (const q of RQ.jog) corpos.push({o:q, tipo:q === P && !RQ.autoH ? 'humano' : q === P ? 'humanoAuto' : 'bot'});
  } else {
    corpos.push({o:P, tipo:'humano'});
    if (TR.on) for (const n of TR.npcs) corpos.push({o:n, tipo:'npc'});
  }
  const nivel = RQ.on && typeof RQ_NIVEIS !== 'undefined' && RQ_NIVEIS[RQ.nivel] ? RQ_NIVEIS[RQ.nivel].vel : 1;
  const jogadores = corpos.map(c => ({time:c.o === P ? (P.time || 0) : c.tipo === 'npc' ? 1 : (c.o.time | 0), cinematico:c.tipo === 'npc',
    fatorVel:c.tipo === 'bot' ? Math.max(0.5, Math.min(1.5, nivel)) : 1}));
  const W = V94M.mundo({n:V94.n || (modo + 1), jogo:RQ.on && RQ.jogo === 'curva' ? 'curva' : 'futebol', jogadores, R:V94.R});
  V94J.W = W; V94J.corpos = corpos; V94J.sombra = corpos.map(() => null); V94J.bolaS = null;
  V94J.cont = corpos.map(() => ({np:0, nc:0, p:false, c:false}));
  // os obstáculos do treino: o paredão (cápsulas: o raio do paredão é w.e em volta do segmento, então a espessura toda é 2·w.e)
  // e os cones (círculos); a bola e você batem neles
  V94J.obst = []; const L = [];
  if (TR.on){
    for (const w of TR.paredes){ V94J.obst.push({tipo:'parede', w}); L.push({tipo:'segmento', x0:v94m(w.x0), y0:v94m(w.y0), x1:v94m(w.x1), y1:v94m(w.y1), e:v94m(2*w.e), quique:typeof TR_QUIQUE_PAREDAO === 'number' ? TR_QUIQUE_PAREDAO : 0.6, afeta:'ambos'}); }
    for (const c of TR.cones){ V94J.obst.push({tipo:'cone', c}); L.push({tipo:'circulo', x:v94m(c.x), y:v94m(c.y), r:v94m(c.r), quique:0.45, afeta:'ambos'}); }
  }
  V94M.obstaculos(W, L);
  v94Empurra(true);
  // o mundo novo no meio de uma saída da partida (a partida acabou de ser montada, ou o motor foi trocado na pausa): a saída
  // continua do jeito do motor — a barreira e quem bate (as posições ficam onde estão)
  if (RQ.on && RQ.estado === 'saida'){ W.estado = 'saida'; W.saidaTime = RQ.saidaTime ? 1 : 0; }
}

/* ---------------------------------------------------------------- o jogo → o motor (os teleportes) */
function v94Pos(c){                                              // a posição do objeto em metros (os do treino são relativos ao centro)
  const o = c.o; return c.tipo === 'npc' ? [v94m(o.x), v94m(o.y)] : [v94m(o.x - CX), v94m(o.y - CY)];
}
function v94Empurra(tudo){
  const W = V94J.W;
  for (let j = 0; j < V94J.corpos.length; j++){
    const c = V94J.corpos[j], o = c.o, s = V94J.sombra[j], q = W.jog[j];
    if (c.tipo === 'npc'){                                       // (o companheiro anda pela velocidade que o treino deu: px por passo)
      const [x, y] = v94Pos(c);
      if (tudo || !s || s.x !== o.x || s.y !== o.y) V94M.poeJogador(W, j, x, y, v94m(o.vx*TICKS_POR_S), v94m(o.vy*TICKS_POR_S));
      else { q.vx = v94m(o.vx*TICKS_POR_S); q.vy = v94m(o.vy*TICKS_POR_S); }
      continue;
    }
    if (tudo || !s || s.x !== o.x || s.y !== o.y || s.vx !== o.vx || s.vy !== o.vy){
      const [x, y] = v94Pos(c); V94M.poeJogador(W, j, x, y, v94m(o.vx || 0), v94m(o.vy || 0));
    }
  }
  const s = V94J.bolaS;
  if (tudo || !s || s.x !== B.x || s.y !== B.y || s.vx !== B.vx || s.vy !== B.vy) V94M.poeBola(W, v94m(B.x - CX), v94m(B.y - CY), v94m(B.vx), v94m(B.vy));
  // a saída que a partida liberou por fora (o tempo da saída acabou): o motor libera também
  if (W.estado === 'saida' && !(RQ.on && RQ.estado === 'saida')) W.estado = 'jogo';
}
/* ---------------------------------------------------------------- o motor → o jogo */
function v94Puxa(){
  const W = V94J.W;
  for (let j = 0; j < V94J.corpos.length; j++){
    const c = V94J.corpos[j], o = c.o, q = W.jog[j];
    if (c.tipo === 'npc'){ o.x = v94p(q.x); o.y = v94p(q.y); V94J.sombra[j] = {x:o.x, y:o.y}; continue; }
    o.x = CX + v94p(q.x); o.y = CY + v94p(q.y); o.vx = v94p(q.vx); o.vy = v94p(q.vy);
    V94J.sombra[j] = {x:o.x, y:o.y, vx:o.vx, vy:o.vy};
  }
  const b = W.bola;
  B.x = CX + v94p(b.x); B.y = CY + v94p(b.y); B.vx = v94p(b.vx); B.vy = v94p(b.vy);
  B.w = 0;
  V94J.bolaS = {x:B.x, y:B.y, vx:B.vx, vy:B.vy};
}

/* ---------------------------------------------------------------- os comandos */
function v94Comando(j, mx, my, novoP, novoC, segP, segC, curva, ordem){
  const k = V94J.cont[j];
  if (novoP) k.np++;
  if (novoC) k.nc++;
  const cmd = {mx:mx || 0, my:my || 0, passe:segP ? 1 : 0, chute:segC ? 1 : 0, curva:curva ? 1 : 0, np:k.np, nc:k.nc};
  if (ordem != null && novoP && novoC) cmd.ordem = ordem;
  V94M.comando(V94J.W, j, cmd);
}
function v94BolaPerto(o){ return Math.hypot(B.x - o.x, B.y - o.y) <= ALCANCE_CHUTE; }
function v94ComandoHumano(mx, my){
  const segP = kickSegurado(), segC = powerSegurado();
  const tapP = !!BOTAO.kickL, tapC = !!BOTAO.powerL; BOTAO.kickL = BOTAO.powerL = false;
  const k = V94J.cont[0];
  let novoP = tapP || (segP && !k.p), novoC = tapC || (segC && !k.c);
  k.p = segP; k.c = segC;
  if (novoP || novoC){ try { V92.med.toques++; } catch (_) {} }
  if (TR.presa){ novoP = novoC = false; }                        // (a bola no pé do companheiro: ninguém chuta)
  // o treino de DOMÍNIO: o PASSE com a bola vindo domina (a bola fica com você) em vez de passar
  if (novoP && typeof trDominio === 'function' && trDominio() && v94BolaPerto(P)){
    const dx = P.x - B.x, dy = P.y - B.y, d = Math.hypot(dx, dy) || 1, vindo = (B.vx*dx + B.vy*dy)/d;
    if (vindo >= DOMINIO_VEL_MIN){
      B.vx = P.vx*DOMINIO_SEGUE; B.vy = P.vy*DOMINIO_SEGUE;
      efeitoDominio(); som.dominio(); TR.ev.dom = true; novoP = false;
    }
  }
  // a CURVA (só na partida com curva): segurar carrega, soltar chuta — a carga de verdade é a do motor; aqui o espelho do anel
  let curva = false;
  if (RQ.on && RQ.jogo === 'curva'){
    curva = cvSegurada() || CV.toque; CV.toque = false;
    if (RQ.estado !== 'jogo' && RQ.estado !== 'saida') curva = false;
    if (curva){ CV.segura = true; CV.carga = Math.min(1, CV.carga + STEP/V94.R.cargaTempo); }
    else if (CV.segura){ CV.segura = false; CV.carga = 0; }
  }
  let ordem = null;
  if (novoP && novoC && typeof V92D !== 'undefined' && V92D.tP > -1e8 && V92D.tC > -1e8) ordem = V92D.tC - V92D.tP;   // (o relógio do toque)
  v94Comando(0, mx, my, novoP, novoC, segP, segC, curva, ordem);
}
function v94ComandoBot(j, q){
  let novoP = false, novoC = false;
  if (q.chutar > 0){ if (q.chutar >= (FORCA_KICK + FORCA_POWER)/2) novoC = true; else novoP = true; q.chutar = 0; }   // (o bot aperta o botão que mais se parece com a força que queria)
  const parado = RQ.on && (RQ.estado === 'intro' || RQ.estado === 'fim');
  v94Comando(j, parado ? 0 : q.mx, parado ? 0 : q.my, novoP, novoC, false, false, false, null);
}

/* ---------------------------------------------------------------- os eventos do motor → o jogo */
function v94Eventos(ev){
  V94J.ev = ev;
  for (const e of ev){
    if (e.t === 'chute'){
      const c = V94J.corpos[e.j]; if (!c) continue;
      const q = c.o, forte = e.b !== 'passe', forca = forte ? FORCA_POWER : FORCA_KICK;
      RP.toque = Math.max(RP.toque, forte ? 2 : 1);
      if (RQ.on) RQ.chuteDe = {x:B.x, y:B.y, time:q.time || 0};
      if (q === P){
        try { V92.med.chutes++; } catch (_) {}
        fxChute(P, forte, true); som.chute(forte); stChute(); vibrarChute(forte);
        if (TR.on) TR.ev.chuteH = forte ? 2 : 1;
        if (RQ.on){ rqToque(P); P.chuteT = RQ.tick; rqHmChute(P, forca); }
        if (e.b === 'curva'){ CV.carga = 0; CV.segura = false; }
      } else if (c.tipo === 'bot') v94ChuteBot(q, forca);
    } else if (e.t === 'toque'){
      const c = V94J.corpos[e.j]; if (!c) continue;
      if (RQ.on) rqToque(c.o);
      if (TR.on){ if (c.o === P) TR.ev.toqueH = true; else if (c.tipo === 'npc') TR.ev.npc = c.o; }
    } else if (e.t === 'anulado'){                                 // (o medidor do painel: o toque que se perdeu)
      const c = V94J.corpos[e.j];
      if (c && c.o === P && e.motivo === 'expirou'){ try { V92.med.perdidos++; } catch (_) {} }
    } else if (e.t === 'trave'){
      const v = v94p(e.v); if (v > EV.trave) EV.trave = v;
    } else if (e.t === 'obstaculo'){
      const o = V94J.obst[e.i]; if (!o) continue;
      if (o.tipo === 'parede' && v94p(e.v) > 30) trParedeBateu(o.w, B.x - CX, B.y - CY, v94p(e.v)/TICKS_POR_S);
      else if (o.tipo === 'cone') trConeBateu(o.c);
    } else if (e.t === 'gol'){
      if (RQ.on) rqGol(e.lado);
      else if (TR.on){ if (!TR.ev.gol){ TR.ev.gol = e.lado; TR.ev.golY = B.y - CY; } }
      else if (goalT < 0){
        goals++; goalT = 0; spawnConfetti(); som.gol(); stGol(); perfilSalvar(); ecoGol('livre');
        rpMarcaGol({time:0, livre:true});
      }
    }
  }
}
function v94ChuteBot(q, forca){                                  // o que o rqChuta fazia depois de chutar (a conta da jogada dos bots)
  q.chuteT = RQ.tick; rqToque(q);
  const plan = q.plano;
  if (plan){
    if (plan.tipo === 'passe' || plan.tipo === 'tabela'){
      RQ.stats[plan.tipo === 'passe' ? 'passes' : 'tabelas']++;
      if (plan.finalidade === 'inversao') RQ.stats.inversoes++;
      const rece = plan.recebe;
      if (rece){ RQ.jogada[q.time] = {recebe:rece, passou:q, inicio:RQ.tick, ate:RQ.tick + Math.round((plan.chega || .65)*TICKS_POR_S) + 18};
        if (rece.papel === 'pivo') RQ.stats.pivos++; else if (rece.papel === 'apoio') RQ.stats.devolucoes++; else if (rece.papel === 'area') RQ.stats.cruzamentos++; }
      if (rece && !rece.humano){ const lead = plan.chega || .45; rece.corrida = {x:plan.rx == null ? plan.x : plan.rx, y:plan.ry == null ? plan.y : plan.ry, ate:RQ.tick + Math.round(lead*TICKS_POR_S) + 18}; }
      if (rece !== q) q.corrida = null;
    } else if (plan.tipo === 'chute') RQ.stats.chutes++; else if (plan.tipo === 'escape') RQ.stats.escapes++;
  }
  RQ.ev.chute = Math.max(RQ.ev.chute, forca >= FORCA_POWER ? 2 : 1);
  rqHmChute(q, forca);
  fxChute(q, forca >= FORCA_POWER);
}

/* ---------------------------------------------------------------- o passo */
const v94PassoAntes = physicsStep;
physicsStep = function(dt, mx, my){
  if (!v94Vale()) return v94PassoAntes.apply(this, arguments);
  try { V92.med.np = (V92.med.np | 0) + 1; } catch (_) {}
  v94Garante();
  if (TR.on) trPreArc();
  if (RQ.on){                                                    // (o rqPre sem o movimento: os bots decidem; o motor anda)
    RQ.tick++;
    if (RQ.estado === 'intro' || RQ.estado === 'fim'){ for (const q of RQ.bots){ q.ax = q.x; q.ay = q.y; q.mx = q.my = 0; q.chutar = 0; } }
    else { rqBots(); for (const q of RQ.bots){ q.ax = q.x; q.ay = q.y; } }
  }
  for (let j = 0; j < V94J.corpos.length; j++){
    const c = V94J.corpos[j];
    if (c.tipo === 'humano') v94ComandoHumano(mx, my);
    else if (c.tipo === 'humanoAuto' || c.tipo === 'bot') v94ComandoBot(j, c.o);
  }
  v94Empurra(false);
  const ev = V94M.passo(V94J.W);
  v94Puxa();
  v94Eventos(ev);
  if (TR.on) trPos();
  if (RQ.on) rqPos();
};

/* ---------------------------------------------------------------- a saída da partida pela regra do motor */
const v94SaidaAntes = rqSaida;
rqSaida = function(t){
  v94SaidaAntes(t);
  if (!v94Vale()) return;
  v94Garante();
  const W = V94J.W;
  V94M.saida(W, t);
  for (let j = 0; j < V94J.corpos.length; j++){
    const o = V94J.corpos[j].o, q = W.jog[j];
    o.x = o.ax = o.sx = CX + v94p(q.x); o.y = o.ay = o.sy = CY + v94p(q.y); o.vx = o.vy = 0;
  }
  B.x = CX; B.y = CY; B.vx = B.vy = 0; B.w = 0;
  v94Puxa(); guardaAnterior();
};
// (os contextos novos: o mundo é refeito)
const v94RqCriaAntes = rqCria; rqCria = function(){ V94J.epoca++; const r = v94RqCriaAntes.apply(this, arguments); V94J.epoca++; return r; };
const v94TrMontaAntes = trMonta; trMonta = function(){ V94J.epoca++; const r = v94TrMontaAntes.apply(this, arguments); V94J.epoca++; return r; };
const v94TrDesmontaAntes = trDesmonta; trDesmonta = function(){ V94J.epoca++; return v94TrDesmontaAntes.apply(this, arguments); };
function v94MotorMudou(era){ V94J.W = null; V94J.chave = ''; }
