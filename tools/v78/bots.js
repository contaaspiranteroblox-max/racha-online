/* =====================================================================
   v78 · OS BOTS DE RUA — a cabeça nova dos bots (a antiga não joga mais)
   O corpo é o mesmo de todo mundo: o bot só mexe no analógico (q.mx, q.my) e aperta PASSE ou CHUTE (q.chutar), com a
   mesma velocidade, o mesmo alcance e a mesma força que você. Nada aqui toca na física (o bloco PHYS fica igual).
   O que muda é o jeito de pensar, pensado para a partida ser divertida:
   · CADA BOT TEM UM JEITO (Fominha, Garçom, Matador, Paredão, Raçudo, Malandro) que muda de verdade o que ele faz:
     o Fominha dribla e chuta de longe, o Garçom procura o passe (de preferência para você), o Matador espera na frente,
     o Paredão segura atrás (no 3v3 e no 4v4 ele é o goleiro), o Raçudo corre atrás de toda bola e o Malandro corta
     passe, tabela na parede e, no COM CURVA, bate de curva. O jeito aparece na apresentação dos times.
   · SEUS COMPANHEIROS JOGAM COM VOCÊ: não roubam a bola de quem chega primeiro nela (você), abrem para receber,
     tocam para você quando você está livre e devolvem a tabelinha.
   · ADVERSÁRIOS QUE DÁ PARA VENCER: cada um percebe o lance com um atraso (como gente: Fácil mais, Difícil menos),
     erra a mira um pouco (mais quando está apertado), marca de mais longe no Fácil e às vezes dá o bote — e quem dá
     o bote pode levar o drible.
   · DEFESA DE RUA: sem goleiro (1v1, 2v2), com a bola na zona do chute e o caminho dela aberto, o último fica entre a
     bola e o gol; no 2v2 do Difícil os dois de lá não sobem juntos. No 3v3 e no 4v4 o goleiro-linha joga na linha com a
     bola longe e volta com ela chegando; adiantado, ele corta a bola de frente (não corre junto com ela para o gol) e,
     com ela rolando devagar, sai nela. O goleiro do Fácil sai mais do gol.
   · O PLACAR MEXE NO JOGO (só na casual contra os bots): o time de bots que abre vantagem relaxa e o que está perdendo
     de 2 aperta. A partida tende a ficar pegada até o fim. (No 3v3 e no 4v4, onde você pesa menos no time, os de lá
     jogam um tico mais soltos desde o começo.)
   · COMEMORAM: quem fez corre para a bandeirinha (cada jeito do seu modo) e os companheiros vão junto; quem levou para.
   · Nada aparece em cima da cabeça de ninguém (os nomes das jogadas saíram).
   ===================================================================== */
const B78_JEITOS = {
  fominha: {nome:'Fominha',  frase:'Quer a bola o tempo todo: dribla e chuta de longe.',              passe:.5,  voce:1,   chute:1.3,  longe:1.3,  conduz:1.6, drible:1.7, pressao:1.25, bote:1.4, parede:.7,  curva:1,   apoio:'frente', festa:'canto'},
  garcom:  {nome:'Garçom',   frase:'Joga para o time: procura o passe, de preferência para você.',   passe:1.7, voce:1.8, chute:.8,   longe:.8,   conduz:.8,  drible:.8,  pressao:.95,  bote:.9,  parede:1.1, curva:.9,  apoio:'meio',   festa:'abraco'},
  matador: {nome:'Matador',  frase:'Fica lá na frente esperando a bola para bater de primeira.',     passe:.85, voce:1.1, chute:1.6,  longe:1.1,  conduz:1,   drible:1,   pressao:.7,   bote:.8,  parede:.7,  curva:1.25,apoio:'area',   festa:'aviao'},
  paredao: {nome:'Paredão',  frase:'Segura a defesa e tira a bola de perto do gol.',                 passe:1.1, voce:1.2, chute:.75,  longe:.75,  conduz:.7,  drible:.6,  pressao:1,    bote:.7,  parede:.6,  curva:.6,  apoio:'tras',   festa:'palmas'},
  racudo:  {nome:'Raçudo',   frase:'Corre o jogo inteiro e não larga nenhuma bola.',                 passe:1,   voce:1.2, chute:1,    longe:1,    conduz:1.05,drible:1,   pressao:1.6,  bote:1.6, parede:.9,  curva:.9,  apoio:'perto',  festa:'volta'},
  malandro:{nome:'Malandro', frase:'Lê o jogo: corta passe, tabela na parede e bate com curva.',     passe:1.15,voce:1.3, chute:1.1,  longe:1,    conduz:1.1, drible:1.3, pressao:.9,   bote:.8,  parede:2,   curva:2,   apoio:'lado',   festa:'danca', antecipa:true}
};
const B78_NIVEL = {
  //       percebe o lance (ticks) · pensa a cada · erro de mira · alinhamento para bater (rad) · de onde chuta (u, até o gol) · distância da marcação (× encosto)
  facil:  {reacao:[17, 23], pensa:12, mira:.065, tol:.17, fino:.07, longe:24, marca:2.0, bote:.15, saida:[62, 92], hesita:.25, solta:22, trava:62, atras:0, gkSai:.94},
  dificil:{reacao:[8, 12],  pensa:6,  mira:.028, tol:.10, fino:.04, longe:30, marca:1.3, bote:.32, saida:[38, 58], hesita:.05, solta:15, trava:42, atras:1, gkSai:1}
};
const B78 = {
  on:true,                                       // (testes: false = a cabeça antiga, só para comparar)
  pv:{tick:-1, arr:[], buf:{pts:[], arr:[]}},    // a bola prevista (uma vez por tick)
  vAnt:{vx:0, vy:0}, lanceT:-99,                 // a última mudança brusca da bola (chute, batida)
  times:[null, null],
  cfg:{chance:.16, chanceFom:.07, ang:.16, angFom:.1, alcance:1, conduz:1, passe:1, gkLim:[.8, .8], folgaN:[1, 1, 1, 1.08, 1.12], ultimo:true, sobraAlta:.6, gkCorta:true, gkCobre:.34},   // (os pesos de ajuste: as medições da v78 usam)
  log:null, motivo:null,                         // (diagnóstico: B78.log = [] registra cada decisão; desligado no jogo)
  dbg:{pensou:0, chutes:0, passes:0, passesVoce:0, conducoes:0, alivios:0, bicos:0, paredes:0, curvas:0, dribles:0, botes:0, defesas:0}
};
const b78Cl = (v, a, b) => v < a ? a : v > b ? b : v;
const b78Gauss = () => (Math.random() + Math.random() + Math.random() - 1.5)*2;
function b78Dir(t){ return -rqLado(t); }                                     // para onde o time t ataca (+1 = direita)
function b78Humano(q){                                                       // gente de verdade mexendo nesse jogador agora?
  if (!q) return false;
  if (q.remote) return true;
  if (q !== P) return false;
  if (RQ.autoH) return false;
  if (NET49.playing && NET49.host && !P.netId) return false;                 // (você assistindo a sala: a sua vaga é um bot)
  return true;
}
function b78Casual(){ return X49.mode !== 'ranked' && !NET49.playing; }

/* ---------------------------------------------------------------- o jeito e o nível de cada um */
function b78Base(){ return B78_NIVEL[RQ.nivel] || B78_NIVEL.dificil; }
function b78Nv(q){                                                           // o nível dele agora (com o termômetro do placar)
  const b = q.b78 && q.b78.nv ? B78_NIVEL[q.b78.nv] || b78Base() : b78Base(), f = B78.times[q.time] ? B78.times[q.time].termo : 1;
  if (f === 1) return b;
  const c = q.b78.nvf && q.b78.nvf.f === f && q.b78.nvf.b === b ? q.b78.nvf.v : null; if (c) return c;
  const v = Object.assign({}, b, {reacao:[Math.round(b.reacao[0]*f), Math.round(b.reacao[1]*f)], pensa:Math.round(b.pensa*f), mira:b.mira*f*f, tol:b.tol*f,
    longe:b.longe/f, marca:b.marca*f, bote:b.bote/f, hesita:Math.min(.5, b.hesita*f*f)});
  q.b78.nvf = {f, b, v}; return v;
}
function b78Termometro(){                                                    // o time de bots que abre 2 gols relaxa; o que perde de 2 aperta
  const hum = [0, 0]; for (const q of RQ.jog) if (b78Humano(q)) hum[q.time]++;
  for (let t = 0; t < 2; t++){
    const S = B78.times[t]; if (!S) continue;
    let f = 1;
    if (b78Casual() && hum[1 - t] && !hum[t]){                              // (só os bots contra o seu time, na casual)
      const v = RQ.placar[t] - RQ.placar[1 - t];
      f = (v >= 3 ? 1.45 : v >= 2 ? 1.3 : v >= 1 ? 1.1 : v <= -2 ? .88 : 1)*(B78.cfg.folgaN[RQ.n] || 1);   // (no 3v3 e no 4v4 você pesa menos no time: os de lá jogam um tico mais soltos)
    }
    S.termo = f;
  }
}
const B78_ORDEM = {1:['fominha', 'matador', 'racudo', 'malandro'], 2:['fominha', 'garcom', 'matador', 'racudo', 'malandro', 'paredao']};
function b78Cria(){
  B78.times = [0, 1].map(() => ({chaser:null, gk:null, fase:'disputa', termo:1, papeis:new Map(), apoioT:0, saidaPor:null}));
  B78.pv.tick = -1; B78.lanceT = -99; B78.vAnt.vx = B78.vAnt.vy = 0; B78.escFila = null; B78.escFeita = null; B78.presoT = 0;
  for (const k in B78.dbg) B78.dbg[k] = 0;
  for (let t = 0; t < 2; t++){
    const mem = RQ.jog.filter(q => q.time === t), n = mem.length, bots = mem.filter(q => q !== P || RQ.autoH);
    let lista = (n === 1 ? B78_ORDEM[1] : B78_ORDEM[2]).slice();
    rqEmbaralha(lista);
    if (n >= 3){ lista = lista.filter(j => j !== 'paredao'); }               // no 3v3 e no 4v4 o Paredão é o goleiro (o mais de trás)
    let gk = null;
    if (n >= 3){ const cand = mem.filter(q => q !== P || RQ.autoH).filter(q => !q.remote); gk = cand.slice().sort((a, b) => b.k - a.k)[0] || null; }
    let i = 0;
    const comVoce = mem.some(o => b78Humano(o));                            // os seus companheiros jogam bem sempre: o nível escolhido é o dos adversários
    for (const q of mem){
      const j = q === gk ? 'paredao' : lista[i++ % lista.length];
      const nvId = comVoce && !NET49.playing ? 'dificil' : RQ.nivelTime ? RQ.nivelTime[q.time] : RQ.nivel, nv = B78_NIVEL[nvId] || b78Base();
      q.b78 = {jeito:j, J:B78_JEITOS[j], nv:nvId,
        reacao:nv.reacao[0] + Math.floor(Math.random()*(nv.reacao[1] - nv.reacao[0] + 1)) + (q === gk ? 6 : 0),   // (o goleiro percebe o chute um pouco depois)
        prox:1 + Math.floor(Math.random()*nv.pensa), papel:'apoio', alvo:null, plano:null, planoT:-99, solta:-99, contato:0, contatoT:-1,
        parado:true, spot:null, spotT:-99, recua:null, festa:null, hesitou:-99, bote:null, passouPara:null, passouT:-99, ultimoMexe:0, ultimoX:q.x, ultimoY:q.y,
        saidaEspera:0, nvf:null, drible:null};
      q.papel = q === gk ? 'gk' : 'apoio';
    }
    B78.times[t].gk = gk; RQ.gk[t] = gk;
  }
  b78Termometro();
}
function b78Saida(){                                                         // saída de bola: ninguém continua plano nenhum
  for (const q of RQ.jog){
    const s = q.b78; if (!s) continue;
    const nv = b78Nv(q);
    s.plano = null; s.alvo = null; s.spot = null; s.recua = null; s.festa = null; s.bote = null; s.drible = null; s.contato = 0; s.contatoT = -1; s.parado = true;
    s.saidaEspera = nv.saida[0] + Math.floor(Math.random()*(nv.saida[1] - nv.saida[0] + 1));
    q.contorno = null;
  }
  for (const S of B78.times) if (S){ S.chaser = null; S.papeis.clear(); S.saidaPor = null; }
  b78Termometro();
}

/* ---------------------------------------------------------------- a bola prevista e quem chega primeiro nela */
function b78Prev(){
  const P0 = B78.pv;
  if (P0.tick !== RQ.tick){ P0.arr = rqTrajeto(B.vx, B.vy, 75, 2/TICKS_POR_S, P0.buf); P0.tick = RQ.tick; }
  return P0.arr;
}
function b78Eta(q, pv){                                                     // segundos até ele alcançar a bola (no caminho previsto)
  const rr = RQ.geo.rr, n = pv.length;
  for (let i = 0; i < n; i++){ const p = pv[i], need = Math.max(0, Math.hypot(p.x - q.x, p.y - q.y) - rr*.92)/VEL_JOG; if (need <= p.t) return {t:p.t, p}; }
  const p = pv[n - 1]; return {t:p.t + Math.max(0, Math.hypot(p.x - q.x, p.y - q.y) - rr*.92)/VEL_JOG, p};
}
function b78Ausente(q){ return b78Humano(q) && q === P && RQ.tick - (q.b78 ? q.b78.ultimoMexe : 0) > 60*4; }   // você parado há 4 s: o time joga sem esperar
function b78ComEle(q){                                                       // a bola está com ele (encostada ou acabou de tocar)
  const rr = RQ.geo.rr, d = Math.hypot(B.x - q.x, B.y - q.y), u = RQ.toques[RQ.toques.length - 1];
  return d < rr*1.35 || (u && u.p === q && RQ.tick - u.tick < 30 && d < rr*2.4);
}

/* ---------------------------------------------------------------- o time se organiza (quem vai na bola, quem apoia, quem marca) */
function b78Organiza(){
  const pv = b78Prev(), G = RQ.geo, rr = G.rr;
  for (const q of RQ.jog){ const e = b78Eta(q, pv); q.b78eta = e.t; q.b78pt = e.p; }
  const best = [9, 9];
  for (const q of RQ.jog) if (q.b78eta < best[q.time]) best[q.time] = q.b78eta;
  for (let t = 0; t < 2; t++){
    const S = B78.times[t], mem = RQ.jog.filter(q => q.time === t), dir = b78Dir(t), own = rqGolX(t);
    // quem vai na bola: o bot que chega antes — mas se um companheiro de verdade (você) chega junto ou está com ela, ele vai e os bots não roubam
    let cb = null, ch = null;
    const bolaPerto = Math.abs(B.x - own) < G.L*.55 && Math.abs(B.y - CY) < G.A*.8;
    for (const q of mem){
      if (b78Humano(q)){ if (!ch || q.b78eta < ch.b78eta) ch = q; continue; }
      if (q === S.gk && !(bolaPerto && q.b78eta < .9)) continue;            // o goleiro só sai na bola perto do gol
      const e = q.b78eta + (RQ.tick < q.b78.solta ? .4 : 0);
      if (!cb || e < cb.e) cb = {q, e};
    }
    let chaser = cb ? cb.q : null;
    if (ch && !b78Ausente(ch) && (!cb || ch.b78eta <= cb.e + .2 || b78ComEle(ch))) chaser = ch;
    if (S.chaser && S.chaser !== chaser && mem.indexOf(S.chaser) >= 0 && chaser && !b78Humano(chaser) && !b78Humano(S.chaser)){
      if (S.chaser.b78eta < chaser.b78eta + .14 && RQ.tick >= (S.chaser.b78 ? S.chaser.b78.solta : 0)) chaser = S.chaser;   // (não fica trocando)
    }
    S.chaser = chaser; RQ.chaser[t] = chaser;
    const minha = best[t], deles = best[1 - t], chute = rqVaiProGol(t, B.x, B.y, B.vx, B.vy) && Math.hypot(B.vx, B.vy) > U(8);
    S.fase = chute ? 'defesa' : minha + .16 < deles ? 'ataque' : deles + .16 < minha ? 'defesa' : 'disputa';
  }
  // os papéis de quem não vai na bola
  for (let t = 0; t < 2; t++){
    const S = B78.times[t], mem = RQ.jog.filter(q => q.time === t), dir = b78Dir(t), own = rqGolX(t);
    S.papeis.clear();
    const livres = mem.filter(q => q !== S.chaser && !b78Humano(q));
    if (S.gk && livres.indexOf(S.gk) >= 0){                                  // o goleiro-linha (de rua): com a bola longe ele joga na linha; com ela chegando, volta para o gol
      const fundo = (B.x - own)*dir, lim = G.L*B78.cfg.gkLim[RQ.n >= 4 ? 1 : 0]*(b78Nv(S.gk).gkSai || 1);   // (o goleiro do Fácil sai mais do gol)
      S.papeis.set(S.gk, {papel:fundo > lim ? (S.fase === 'ataque' ? 'sobra' : 'cobre') : 'gk'});
    }
    const outros = livres.filter(q => q !== S.gk || (S.papeis.get(q) && S.papeis.get(q).papel !== 'gk'));
    if (S.gk && outros.indexOf(S.gk) >= 0) S.papeis.delete(S.gk);
    if (S.fase === 'ataque' || (S.fase === 'disputa' && S.chaser && S.chaser.b78eta < .5)){
      for (const q of outros) S.papeis.set(q, {papel:'apoio'});
      // no ataque, se ninguém fica atrás (2v2 e você no ataque), o mais de trás segura; no 2v2 do Difícil os dois bots
      // de lá não sobem juntos (perdeu a bola lá na frente, o gol ficava vazio)
      const doisBots = outros.length === 1 && mem.length === 2 && !S.gk && !mem.some(b78Humano) && b78Nv(outros[0]).atras;
      if (outros.length >= 2 || (outros.length === 1 && mem.length >= 2 && S.fase === 'disputa') || doisBots){
        const tras = outros.slice().sort((a, b) => (a.x - own)*dir - (b.x - own)*dir)[0];
        if (tras && (tras.b78.J.apoio === 'tras' || outros.length >= 2 || doisBots)) S.papeis.set(tras, {papel:'sobra', alta:doisBots && tras.b78.J.apoio !== 'tras'});
      }
      continue;
    }
    // defesa: marca quem ameaça (o mais perto do nosso gol), cobre o meio
    const deles = RQ.jog.filter(o => o.time !== t && o !== B78.times[1 - t].chaser);
    deles.sort((a, b) => Math.hypot(a.x - own, a.y - CY) - Math.hypot(b.x - own, b.y - CY));
    const marcados = new Set(), ord = outros.slice();
    // sem goleiro (o 2v2): com a bola na zona do chute e o caminho dela para o nosso gol aberto (quem foi na bola ainda não fechou),
    // o último fica entre a bola e o gol em vez de marcar (senão o chute de longe entrava com o gol vazio)
    let ultimo = null;
    if (B78.cfg.ultimo && !S.gk && ord.length && Math.hypot(B.x - own, B.y - CY) < G.L*1.3 && !b78Fecha(S.chaser, t))
      ultimo = ord.slice().sort((a, b) => Math.hypot(a.x - own, a.y - CY) - Math.hypot(b.x - own, b.y - CY))[0];
    for (const q of ord){
      if (q === ultimo){ S.papeis.set(q, {papel:'cobre', ultimo:true}); continue; }
      if (q.b78.J.apoio === 'tras' && ord.length > 1 && !S.gk){ S.papeis.set(q, {papel:'cobre'}); continue; }   // o Paredão cobre o meio (com goleiro no gol, todo mundo marca)
      const alvo = deles.filter(o => !marcados.has(o)).sort((a, b) => Math.hypot(a.x - q.x, a.y - q.y)*.5 + Math.hypot(a.x - own, a.y - CY) - (Math.hypot(b.x - q.x, b.y - q.y)*.5 + Math.hypot(b.x - own, b.y - CY)))[0];
      if (alvo && ((alvo.x - own)*dir < G.L*1.25 || S.gk)){ marcados.add(alvo); S.papeis.set(q, {papel:q.b78.J.antecipa ? 'corta' : 'marca', quem:alvo}); }
      else S.papeis.set(q, {papel:'cobre'});
    }
  }
}

function b78Fecha(c, t){                                                     // quem foi na bola já está entre ela e o nosso gol (tapando o gol)?
  if (!c) return false;
  const own = rqGolX(t), gx = own - B.x, gy = CY - B.y, gl = Math.hypot(gx, gy) || 1, ox = c.x - B.x, oy = c.y - B.y;
  const pr = (ox*gx + oy*gy)/gl, lat = Math.abs(ox*gy - oy*gx)/gl;
  return pr > 0 && pr < gl && lat < c.r*.8 && (c.r + B.r)/Math.max(pr, 1) > RQ.geo.gh/gl*.9;   // (perto da bola ele tapa o gol inteiro; longe, só um pedaço)
}

/* ---------------------------------------------------------------- andar */
function b78Anda(q, x, y, lim, segura){                                      // vai até o ponto; segura = só sai do lugar quando o ponto ficou longe
  const p = rqPontoJog(x, y, q.r*1.05); rqHmForaDe(q, p);
  let dx = p.x - q.x, dy = p.y - q.y; const d = Math.hypot(dx, dy), s = q.b78;
  const lm = Math.max(lim || 0, RQ.geo.vm*.75);
  if (segura && s.parado && d < RQ.geo.rr*.75){ q.mx = q.my = 0; return true; }
  if (d < lm){ q.mx = q.my = 0; s.parado = true; return true; }
  s.parado = false;
  let nx = dx/d, ny = dy/d;
  for (const o of RQ.jog){                                                   // não tromba no companheiro: passa do lado
    if (o === q || o.time !== q.time) continue;
    const ox = o.x - q.x, oy = o.y - q.y, proj = ox*nx + oy*ny, lat = ox*ny - oy*nx, span = q.r + o.r;
    if (proj > 0 && proj < span*2 && Math.abs(lat) < span*.96 && Math.hypot(ox, oy) > span*.6){ const sg = lat >= 0 ? 1 : -1, f = (span*2 - proj)*.45; dx -= ny*sg*f; dy += nx*sg*f; }
  }
  const l = Math.hypot(dx, dy) || 1; q.mx = dx/l; q.my = dy/l;
  return false;
}
function b78Desvia(q, raio){                                                 // indo para um lugar sem querer a bola: não passa por cima dela
  if (!q.mx && !q.my) return;
  const rx = B.x - q.x, ry = B.y - q.y, proj = rx*q.mx + ry*q.my, lat = rx*q.my - ry*q.mx, R = raio || RQ.geo.rr*1.15;
  if (proj > 0 && proj < R*2.2 && Math.abs(lat) < R){ const sg = lat >= 0 ? 1 : -1, c = Math.cos(.9), sn = Math.sin(.9)*sg, x = q.mx*c - q.my*sn; q.my = q.mx*sn + q.my*c; q.mx = x; }
}

/* ---------------------------------------------------------------- bater na bola (passe, chute, alívio) */
function b78Gira(ux, uy, a){ const c = Math.cos(a), s = Math.sin(a); return {x:ux*c - uy*s, y:ux*s + uy*c}; }
function b78Seguro(q, forca){                                                // o chute de agora não vai para o próprio gol (com as batidas)?
  const bx = B.x - q.x, by = B.y - q.y, d = Math.hypot(bx, by) || 1, dv = U(forca/B.m), vx = B.vx + bx/d*dv, vy = B.vy + by/d*dv;
  if (rqVaiProGol(q.time, B.x, B.y, vx, vy)) return false;
  if (rqHmContra(q, forca)) return false;
  if ((B.x - rqGolX(q.time))*b78Dir(q.time) < RQ.geo.L*.35){                // colado no próprio gol: nenhum companheiro no caminho (o desvio nele entrava)
    const v = Math.hypot(vx, vy) || 1, ux = vx/v, uy = vy/v, rr = RQ.geo.rr;
    for (const o of RQ.jog){
      if (o === q || o.time !== q.time) continue;
      const ox = o.x - B.x, oy = o.y - B.y, pr = ox*ux + oy*uy;
      if (pr > 0 && pr < rr*3 && Math.abs(ox*uy - oy*ux) < o.r + B.r) return false;
    }
  }
  return true;
}
function b78Bate(q, pl){                                                     // vai para trás da bola na mira do plano e bate quando alinhou
  const rr = RQ.geo.rr, nv = b78Nv(q);
  let a = pl.alvo ? rqHmMira(pl.alvo, pl.forca) : {x:pl.ax, y:pl.ay};
  if (pl.erro) a = b78Gira(a.x, a.y, pl.erro);
  const alvo = rqHmVolta(q, B, a.x, a.y, false);
  b78Anda(q, alvo.x, alvo.y, 1.2);
  const bx = B.x - q.x, by = B.y - q.y, d = Math.hypot(bx, by);
  if (!d || d > ALCANCE_CHUTE - 1.2 || RQ.tick - q.chuteT < 10) return false;
  const al = (bx*a.x + by*a.y)/d, espera = RQ.tick - pl.t0;
  const apertado = b78Apertado(q);
  const tol = al >= Math.cos(nv.fino) || ((apertado || espera > 26) && al >= Math.cos(nv.tol)) || (pl.tipo !== 'chute' && espera > 70 && al >= Math.cos(nv.tol*1.8));
  if (!tol) return false;
  if (!b78Seguro(q, pl.forca)) return false;
  if (pl.tipo !== 'alivio' && q.b78.hesitou < pl.t0 && Math.random() < nv.hesita){ q.b78.hesitou = RQ.tick; pl.t0 = RQ.tick - 10; return false; }   // às vezes ainda não bate
  q.chutar = pl.forca; q.mx = q.my = 0;
  q.plano = {tipo:pl.tipo === 'chute' ? 'chute' : pl.tipo === 'passe' || pl.tipo === 'devolve' ? 'passe' : pl.tipo === 'alivio' ? 'afasta' : 'escape',
    x:pl.alvo ? pl.alvo.x : B.x + a.x*rr*6, y:pl.alvo ? pl.alvo.y : B.y + a.y*rr*6, forca:pl.forca, recebe:pl.recebe || null, chega:pl.chega || .6, aim:a, cv:pl.cv || null, finalidade:pl.tipo};
  if (pl.tipo === 'passe' || pl.tipo === 'devolve'){ B78.dbg.passes++; if (pl.recebe && b78Humano(pl.recebe)) B78.dbg.passesVoce++; q.b78.solta = RQ.tick + nv.solta + 10; q.b78.passouPara = pl.recebe; q.b78.passouT = RQ.tick; }
  else { q.b78.solta = RQ.tick + nv.solta; }
  if (pl.tipo === 'chute') B78.dbg.chutes++; else if (pl.tipo === 'alivio') B78.dbg.alivios++; else if (pl.tipo === 'parede') B78.dbg.paredes++;
  if (pl.cv) B78.dbg.curvas++;
  q.b78.plano = null;
  return true;
}
function b78Chegando(q){                                                     // um adversário vindo na bola (perto e se aproximando)
  const rr = RQ.geo.rr;
  for (const o of RQ.jog){
    if (o.time === q.time) continue;
    const dx = B.x - o.x, dy = B.y - o.y, d = Math.hypot(dx, dy);
    if (d < rr*3.6 && (o.vx*dx + o.vy*dy)/(d || 1) > VEL_JOG*.4) return true;
  }
  return false;
}
function b78Apertado(q){                                                     // um adversário em cima da bola
  const rr = RQ.geo.rr;
  for (const o of RQ.jog) if (o.time !== q.time && Math.hypot(o.x - B.x, o.y - B.y) < rr*1.7) return true;
  return false;
}
function b78Bico(q){                                                         // preso na dividida: bate de onde está, se não for para o próprio gol
  const bx = B.x - q.x, by = B.y - q.y, d = Math.hypot(bx, by);
  if (!d || d > ALCANCE_CHUTE - 1 || RQ.tick - q.chuteT < 8) return false;
  for (const F of [FORCA_POWER, FORCA_KICK]){
    if (!b78Seguro(q, F)) continue;
    q.chutar = F; q.mx = q.my = 0; q.plano = {tipo:'escape', x:B.x + bx/d*100, y:B.y + by/d*100, forca:F, finalidade:'bico'};
    q.b78.plano = null; q.b78.solta = RQ.tick + 10; B78.dbg.bicos++;
    return true;
  }
  return false;
}

/* ---------------------------------------------------------------- com a bola: chutar, tocar, levar, aliviar, tabelar na parede */
function b78Linha(x0, y0, x1, y1, time, folga, ignora){                      // o caminho da bola: 1 = livre · .5 = arriscado (alguém perto) · 0 = fechado
  const ex = x1 - x0, ey = y1 - y0, L2 = ex*ex + ey*ey || 1; let v = 1;
  for (const o of RQ.jog){
    if (o.time === time) continue;
    const k = ((o.x - x0)*ex + (o.y - y0)*ey)/L2; if (k <= 0 || k > 1.05) continue;
    const dd = Math.hypot(x0 + ex*k - o.x, y0 + ey*k - o.y), m = o.r + B.r + folga;
    if (dd < m) return 0;
    if (o !== ignora && dd < m + U(1.4) + k*U(1.2)) v = .5;                  // (o goleiro só fecha com o corpo: o resto é a conta de até onde ele chega)
  }
  return v;
}
function b78Opcoes(q){
  const G = RQ.geo, rr = G.rr, J = q.b78.J, nv = b78Nv(q), dir = b78Dir(q.time), opp = rqGolX(1 - q.time), own = rqGolX(q.time), op = [];
  const campo = LX1 - LX0, dg = Math.hypot(opp - B.x, CY - B.y), apertado = b78Apertado(q);
  // CHUTE: pontos da boca do gol com o caminho aberto, longe do goleiro (de longe vale menos; o Fominha e o Matador arriscam mais)
  const C = B78.cfg, alcance = U(nv.longe)*J.longe*Math.pow((GOL_Y1 - GOL_Y0)/U(16), .7)*C.alcance;   // (gol maior, chute de mais longe)
  const angGol = Math.abs(Math.atan2(GOL_Y1 - B.y, opp - B.x) - Math.atan2(GOL_Y0 - B.y, opp - B.x));   // o tamanho do gol visto de onde a bola está
  const LG = B78.log ? (B78.motivo = {dg:Math.round(dg/PX_POR_U), alc:Math.round(alcance*1.3/PX_POR_U), ang:+angGol.toFixed(2), lane0:0, risco:0, chance:0, ok:0}) : null;
  if (dg < alcance*1.3 && (opp - B.x)*dir > rr*.3 && angGol > (J.chute >= 1.25 ? C.angFom : C.ang)){
    const gk = rqGoleiroDe(1 - q.time), gkLinha = gk && Math.abs(gk.x - opp) < U(7) ? gk : null, gh0 = (GOL_Y1 - GOL_Y0)/2 - B.r;
    const erro = Math.max(B.r*.5, dg*Math.tan(nv.tol*.6 + nv.mira));          // o quanto a bola dele costuma sair do ponto mirado, lá na linha
    for (let i = -4; i <= 4; i++){                                           // 9 pontos da boca do gol (os cantos também: perto do poste é arriscado, mas vale)
      const y = CY + i/4*(gh0 - B.r*.4), lv = b78Linha(B.x, B.y, opp, y, q.time, U(.1), gkLinha);   // (o goleiro conta à parte: até onde ele chega a tempo)
      if (!lv || (lv < 1 && J.chute < 1.25)){ if (LG){ if (!lv) LG.lane0++; else LG.risco++; } continue; }   // (com alguém no caminho só o Fominha e o Matador arriscam)
      let chance = 1;
      if (gkLinha){
        const dist = Math.hypot(opp - B.x, y - B.y), tc = dist/(U(FORCA_POWER/B.m)*.85), enc = gkLinha.r + B.r;
        const alc = VEL_JOG*Math.max(0, tc - (gkLinha.b78 ? gkLinha.b78.reacao/TICKS_POR_S : .2)), dy = Math.abs(y - gkLinha.y) - enc;
        chance = dy <= 0 ? 0 : b78Cl(dy/Math.max(1, alc), 0, 1);
      }
      const noAlvo = b78Cl((gh0 - Math.abs(y - CY))/erro*.7 + .25, 0, 1), pr = chance*noAlvo;   // (a chance de entrar: passar do goleiro e não ir para fora)
      if (pr < (J.chute >= 1.25 ? C.chanceFom : C.chance)){ if (LG) LG.chance++; continue; }
      if (LG) LG.ok++;
      const perto = 1 - dg/alcance;
      op.push({tipo:'chute', alvo:{x:opp + dir*B.r*2, y}, forca:FORCA_POWER, nota:(1.3 + perto*2.6 + pr*2.4)*(lv < 1 ? .65 : 1)*J.chute});
    }
  }
  // PASSE: para cada companheiro (você ganha um bônus; o Garçom adora); devolve a tabelinha para quem acabou de tocar
  const gkMeu = B78.times[q.time] ? B78.times[q.time].gk : null;
  for (const o of RQ.jog){
    if (o === q || o.time !== q.time || o === gkMeu) continue;
    const d = Math.hypot(o.x - B.x, o.y - B.y); if (d < rr*1.9 || d > G.L*1.7) continue;
    const forca = d > rr*6.5 ? FORCA_POWER : FORCA_KICK, vb = U(forca/B.m)*.82, tl = b78Cl(d/vb, .1, .6);
    const sp = Math.hypot(o.vx, o.vy), lead = sp > 1 ? Math.min(tl, rr*1.5/sp) : 0;
    const p = rqPonto(o.x + o.vx*lead, o.y + o.vy*lead, rr*.9), lv = b78Linha(B.x, B.y, p.x, p.y, q.time, U(.45));
    if (!lv) continue;
    const espaco = Math.min(rqEspaco(p.x, p.y, q.time), rr*5)/(rr*5), avanco = (p.x - B.x)*dir/G.L, perigo = (p.x - own)*dir < G.L*.35 ? -1 : 0;
    const humano = b78Humano(o);
    if (espaco < (humano ? .14 : .2)) continue;
    let nota = (.9 + avanco*1.1 + espaco*1.3 + perigo - d/G.L*.25)*J.passe*(lv < 1 ? .6 : 1);
    if (humano) nota = nota*J.voce*1.45 + .25;                                // (você: o bot gosta de tocar para você)
    const devolve = o === q.b78.recebeuDe && RQ.tick - (q.b78.recebeuT || -999) < 150 && (o.x - q.x)*dir > -rr;
    if (devolve) nota += .8*J.passe;
    if (apertado) nota += .45;
    else if (b78Chegando(q)) nota += .35;                                    // o marcador está chegando: toca antes
    op.push({tipo:devolve ? 'devolve' : 'passe', alvo:p, forca, recebe:o, chega:tl, nota});
  }
  // LEVAR: para o gol ou para o espaço; com marcador perto na frente, por um lado (o drible: o Fominha e o Malandro adoram)
  const gx = opp - B.x, gy = CY - B.y, base = Math.atan2(gy, gx);
  const marcFrente = RQ.jog.some(o => o.time !== q.time && Math.hypot(o.x - B.x, o.y - B.y) < rr*2.8 && ((o.x - B.x)*Math.cos(base) + (o.y - B.y)*Math.sin(base)) > 0);
  let perto = null, dp = 1e9;                                                // o marcador mais perto: protege a bola dele (leva para o outro lado)
  for (const o of RQ.jog) if (o.time !== q.time){ const d = Math.hypot(o.x - B.x, o.y - B.y); if (d < dp){ dp = d; perto = o; } }
  for (const da of [0, -.45, .45, -.9, .9, -1.4, 1.4]){
    const a = base + da, ux = Math.cos(a), uy = Math.sin(a), px = B.x + ux*rr*3.2, py = B.y + uy*rr*3.2;
    if (px < LX0 + rr*.6 || px > LX1 - rr*.6 || py < LY0 + rr*.6 || py > LY1 - rr*.6) continue;
    const espaco = Math.min(rqEspaco(px, py, q.time), rr*4)/(rr*4), livre = b78Linha(B.x, B.y, px, py, q.time, rr*.15);
    const drible = da !== 0 && marcFrente;
    let nota = (.4 + espaco*1.1 + (livre === 1 ? .35 : livre ? -.2 : -1) - Math.abs(da)*.3)*J.conduz + (drible ? .4*(J.drible - .9) : 0);
    if (perto && dp < rr*3.2){ const ox = (perto.x - B.x)/dp, oy = (perto.y - B.y)/dp, k = ux*ox + uy*oy, f = (rr*3.2 - dp)/(rr*1.6);
      nota += (k > 0 ? -k*1.3 : -k*.45)*Math.min(1.4, f); }                  // (para cima do marcador perde a bola; para longe dele protege)
    if (apertado && !drible) nota *= .7;
    if (marcFrente && J.drible < 1.25) nota *= .75;                          // marcador na frente: quem não é driblador procura outra coisa
    if ((opp - B.x)*dir < U(9) && Math.abs(B.y - CY) > G.gh && Math.sign(CY - B.y) === Math.sign(uy)) nota += .5;   // na linha de fundo, ao lado do gol: corta para o meio
    op.push({tipo:'conduz', ax:ux, ay:uy, nota, drible});
  }
  // ALÍVIO: perto do próprio gol e apertado
  if ((B.x - own)*dir < G.L*.5 && apertado){
    const sy = B.y >= CY ? 1 : -1;
    for (const a of [.55, .95, 1.25]){
      const ux = dir*Math.cos(a), uy = sy*Math.sin(a);
      op.push({tipo:'alivio', ax:ux, ay:uy, forca:FORCA_POWER, nota:(1.6 - (B.x - own)*dir/G.L)*(J.apoio === 'tras' ? 1.5 : 1)});
    }
  }
  // TABELA NA PAREDE: marcador na frente e a parede do lado: a bola bate na lateral e passa por ele
  const marc = RQ.jog.find(o => o.time !== q.time && Math.hypot(o.x - B.x, o.y - B.y) < rr*3.4 && ((o.x - B.x)*dir) > 0);
  if (marc && J.parede > .65){
    for (const wy of [LY0 + B.r, LY1 - B.r]){
      if (Math.abs(B.y - wy) > G.A*.45) continue;
      const tx = marc.x + dir*rr*2.6, ty = B.y + (marc.y - B.y)*.3;          // o lugar atrás do marcador
      const my = 2*wy - ty, ax = tx - B.x, ay = my - B.y, al = Math.hypot(ax, ay) || 1;
      const ux = ax/al, uy = ay/al, dv = U(FORCA_KICK/B.m), path = rqTrajeto(B.vx + ux*dv, B.vy + uy*dv, 34, .04);
      let bateu = false, passou = false, ok = true;
      for (const p of path){
        if (p.gol){ ok = false; break; }
        if (!bateu && Math.abs(p.y - wy) < B.r*1.5) bateu = true;
        if (p.t > .1 && RQ.jog.some(o => o.time !== q.time && Math.hypot(o.x - p.x, o.y - p.y) < o.r + B.r + U(.4) + p.t*VEL_JOG*.55)){ ok = false; break; }
        if (bateu && (p.x - marc.x)*dir > rr){ passou = true; break; }
      }
      if (ok && bateu && passou) op.push({tipo:'parede', ax:ux, ay:uy, forca:FORCA_KICK, nota:1.9*J.parede});
    }
  }
  return op;
}
function b78Escolhe(q, op){                                                  // a melhor quase sempre; às vezes a segunda (cada partida um pouco diferente)
  if (!op.length) return null;
  op.sort((a, b) => b.nota - a.nota);
  let e = op[0];
  if (op[1] && op[1].nota > e.nota*.86 && Math.random() < .3) e = op[1];
  return e;
}
function b78NovoPlano(q){
  const nv = b78Nv(q), J = q.b78.J, op = b78Opcoes(q), e = b78Escolhe(q, op);
  if (B78.log) B78.log.push({t:RQ.tick, q:q.nome, j:q.b78.jeito, time:q.time, b:[Math.round(B.x), Math.round(B.y)], dg:Math.round(Math.hypot(rqGolX(1 - q.time) - B.x, CY - B.y)/PX_POR_U), e:e && e.tipo, op:op.slice(0, 5).map(o => o.tipo + ':' + o.nota.toFixed(2)), m:B78.motivo});
  if (!e) return null;
  const pl = Object.assign({t0:RQ.tick, erro:0}, e);
  if (pl.tipo === 'chute') pl.erro = b78Gauss()*nv.mira*(b78Apertado(q) ? 1.6 : 1);
  else if (pl.tipo === 'passe' || pl.tipo === 'devolve') pl.erro = b78Gauss()*nv.mira*.8;
  if (pl.tipo === 'chute' && RQ.jogo === 'curva' && !q.remote && Math.random() < .3*J.curva){   // COM CURVA: às vezes bate de curva (por fora, a bola volta para o canto)
    const p = {tipo:'chute', x:pl.alvo.x, y:pl.alvo.y, aim:null};
    if (cvBotMira(q, p, .45 + Math.random()*.5) || cvBotMira(q, p, .3)){ pl.alvo = null; pl.ax = p.aim.x; pl.ay = p.aim.y; pl.cv = p.cv; }
  }
  if (pl.tipo === 'conduz') B78.dbg.conducoes++;
  if (pl.drible) B78.dbg.dribles++;
  q.b78.plano = pl; q.b78.planoT = RQ.tick; B78.dbg.pensou++;
  return pl;
}
function b78Corta(q, sempre){                                                // a bola chegou nele perto do próprio gol (ou ele defende): tira de primeira, se der
  const d = Math.hypot(B.x - q.x, B.y - q.y);
  if (!d || d > ALCANCE_CHUTE - 1 || RQ.tick - q.chuteT < 9) return false;
  const G = RQ.geo, bx = B.x - q.x, by = B.y - q.y, dir = b78Dir(q.time), own = rqGolX(q.time), k = (bx*dir)/d, fundo = (B.x - own)*dir;
  if (!sempre && fundo > G.L*.55) return false;
  if (!sempre && !b78Apertado(q) && !b78Chegando(q) && B.vx*dir > -U(7) && fundo > G.L*.3) return false;   // sem ninguém em cima e a bola mansa: domina e joga (não chuta para longe à toa)
  if (k < (fundo < G.L*.25 ? -.45 : -.15)) return false;                    // (para trás não; colado no gol, de lado também vale)
  for (const F of fundo < G.L*.6 ? [FORCA_POWER, FORCA_KICK] : [FORCA_KICK]){
    if (!b78Seguro(q, F)) continue;
    q.chutar = F; q.mx = q.my = 0; q.plano = {tipo:'afasta', x:B.x + bx/d*100, y:B.y + by/d*100, forca:F, finalidade:'corte'};
    q.b78.plano = null; q.b78.solta = RQ.tick + 8; B78.dbg.cortes = (B78.dbg.cortes || 0) + 1;
    return true;
  }
  return false;
}
function b78ComBola(q){                                                      // ele está na bola (perto o bastante para jogar)
  const s = q.b78, nv = b78Nv(q), rr = RQ.geo.rr;
  { const G = RQ.geo, own = rqGolX(q.time), fundo = (B.x - own)*b78Dir(q.time);
    const perigo = fundo < G.L*.38 && Math.abs(B.y - CY) < G.gh + rr*2.5;
    if (perigo || (fundo < G.L*.5 && b78Apertado(q))){                      // perto do próprio gol: tira de onde está (sem ficar rodando a bola)
      if (b78Corta(q, true)) return;
      if (fundo < rr*1.25 && Math.abs(B.y - CY) < G.gh + B.r && (q.x - B.x)*b78Dir(q.time) > -rr*.2){   // a bola em cima da linha do gol e ele do lado do campo:
        const sy = q.y >= B.y ? 1 : -1;                                       // empurrar daqui é gol contra — fica do lado dela, sem encostar
        b78Anda(q, B.x + b78Dir(q.time)*rr*.6, B.y + sy*rr*1.75, 2); return;
      }
      if (perigo){
        let pl = s.plano;
        if (!pl || pl.tipo !== 'alivio' || RQ.tick - s.planoT > 40){ const ax = B.x - own, ay = B.y - CY, al = Math.hypot(ax, ay) || 1; pl = s.plano = {tipo:'alivio', ax:ax/al, ay:ay/al, forca:FORCA_POWER, t0:RQ.tick, erro:0}; s.planoT = RQ.tick; }
        b78Bate(q, pl); return;
      }
    }
  }
  let pl = s.plano;
  let velho = !pl || RQ.tick - s.planoT > (pl.tipo === 'conduz' ? nv.pensa*2 + 6 : 60);
  if (!velho && RQ.tick - s.planoT >= nv.pensa && pl.alvo && (pl.tipo === 'passe' || pl.tipo === 'devolve' || pl.tipo === 'chute')
    && !rqLinhaLivre(B.x, B.y, pl.alvo.x, pl.alvo.y, q.time, U(.3))) velho = true;   // fecharam o caminho: pensa de novo
  if (velho || (pl.tipo === 'conduz' && RQ.tick - s.planoT >= nv.pensa)) pl = b78NovoPlano(q);
  if (!pl){ b78Anda(q, B.x, B.y, 1); return; }
  if (pl.tipo === 'conduz'){
    const alvo = rqHmVolta(q, B, pl.ax, pl.ay, true);
    b78Anda(q, alvo.x, alvo.y, 1);
    const d = Math.hypot(B.x - q.x, B.y - q.y);
    if (pl.drible && d < ALCANCE_CHUTE - 2 && RQ.tick - q.chuteT > 14 && b78Apertado(q)){   // o toquinho para o lado e sai correndo atrás
      const bx = B.x - q.x, by = B.y - q.y, al = (bx*pl.ax + by*pl.ay)/(d || 1);
      if (al > Math.cos(.35) && b78Seguro(q, FORCA_KICK)){ q.chutar = FORCA_KICK; q.mx = pl.ax; q.my = pl.ay; q.plano = {tipo:'escape', x:B.x + pl.ax*rr*3, y:B.y + pl.ay*rr*3, forca:FORCA_KICK, finalidade:'drible'}; s.plano = null; s.solta = RQ.tick + 4; }
    }
    return;
  }
  b78Bate(q, pl);
}

/* ---------------------------------------------------------------- sem a bola: pressionar, apoiar, marcar, cobrir, goleiro */
function b78Pressiona(q){                                                    // o adversário está com ela: fecha o caminho do gol e dá o bote
  const G = RQ.geo, rr = G.rr, s = q.b78, nv = b78Nv(q), J = s.J, own = rqGolX(q.time), dir = b78Dir(q.time);
  const d = Math.hypot(B.x - q.x, B.y - q.y);
  const dono = RQ.jog.filter(o => o.time !== q.time).sort((a, b) => Math.hypot(a.x - B.x, a.y - B.y) - Math.hypot(b.x - B.x, b.y - B.y))[0];
  const controla = dono && Math.hypot(dono.x - B.x, dono.y - B.y) < rr*1.5;
  if (RQ.tick >= (s.boteT || 0)){ s.boteT = RQ.tick + nv.pensa*2; s.bote = controla && d < rr*3.4 && Math.random() < nv.bote*J.bote ? RQ.tick + 24 : null; if (s.bote) B78.dbg.botes++; }
  if (!controla || (s.bote && RQ.tick < s.bote)){                            // bola solta (ou o bote): vai nela
    const a = b78Lado(q, B), alvo = rqHmVolta(q, B, a.x, a.y, false);   // (pelo lado certo: não empurra a bola para o próprio gol)
    b78Anda(q, alvo.x, alvo.y, 1);
    if (d < ALCANCE_CHUTE - 1 && RQ.tick - q.chuteT >= 10){
      const bx = B.x - q.x, by = B.y - q.y, k = (bx*dir)/d;
      if (k > -.2 && b78Seguro(q, FORCA_KICK)){ q.chutar = controla ? FORCA_KICK : FORCA_POWER; q.mx = q.my = 0; q.plano = {tipo:'escape', x:B.x + bx/d*100, y:B.y + by/d*100, forca:q.chutar, finalidade:'desarme'}; s.solta = RQ.tick + 8; }
    }
    return;
  }
  // marcando: entre a bola e o gol, a uma distância (o Fácil dá mais espaço) — o ponto acompanha a bola com atraso
  if (!s.visP || RQ.tick >= s.visPT){ s.visP = {x:B.x, y:B.y}; s.visPT = RQ.tick + Math.max(3, nv.pensa >> 1); }
  const V = s.visP, gx = own - V.x, gy = CY - V.y, gl = Math.hypot(gx, gy) || 1, m = rr*nv.marca;
  b78Anda(q, V.x + gx/gl*m, V.y + gy/gl*m, RQ.geo.vm*.8);
  if (d < ALCANCE_CHUTE - 1.5 && RQ.tick - q.chuteT >= 12){                  // chegou perto: tira (para longe do gol)
    const bx = B.x - q.x, by = B.y - q.y;
    if ((bx*dir)/d > .15 && b78Seguro(q, FORCA_KICK)){ q.chutar = FORCA_KICK; q.mx = q.my = 0; q.plano = {tipo:'escape', x:B.x + bx/d*100, y:B.y + by/d*100, forca:FORCA_KICK, finalidade:'desarme'}; s.solta = RQ.tick + 8; }
  }
}
function b78Lado(q, p){                                                     // de que lado ele quer chegar na bola: para mandar ela para o ataque (perto do próprio gol, para o lado)
  const dir = b78Dir(q.time), own = rqGolX(q.time), opp = rqGolX(1 - q.time), G = RQ.geo;
  let ax = opp - p.x, ay = (CY - p.y)*.6;
  if ((p.x - own)*dir < G.L*.45){ ax = dir*G.L*.5; ay = (p.y >= CY ? 1 : -1)*G.A*.9; }   // na defesa: tira para a lateral
  const l = Math.hypot(ax, ay) || 1; return {x:ax/l, y:ay/l};
}
function b78Busca(q){                                                        // a bola está vindo ou solta: vai no ponto em que alcança (o que ele viu), pelo lado certo
  const s = q.b78, rr = RQ.geo.rr, d = Math.hypot(B.x - q.x, B.y - q.y);
  if (d < rr*2.6) return b78ComBola(q);                                    // (perto: sente a bola de verdade)
  const p = s.alvo || B, a = b78Lado(q, p), w = rqHmVolta(q, p, a.x, a.y, false);
  b78Anda(q, w.x, w.y, 1);
}
function b78ApoioSpot(q){                                                   // onde ele se oferece: longe do bolo, com o passe livre, abrindo o campo (cada jeito do seu modo)
  const G = RQ.geo, rr = G.rr, J = q.b78.J, dir = b78Dir(q.time), opp = rqGolX(1 - q.time);
  const S = B78.times[q.time], bx = S.chaser ? B.x : q.x, by = S.chaser ? B.y : q.y;
  const frente = J.apoio === 'area' ? [5, 11] : J.apoio === 'frente' ? [3, 9] : J.apoio === 'tras' ? [-8, -3] : J.apoio === 'perto' ? [1, 6] : J.apoio === 'lado' ? [2, 8] : [2, 8];
  const ideal = J.apoio === 'perto' ? 4.5 : J.apoio === 'area' ? 9 : 7;      // a distância da bola que ele gosta (× encosto)
  let melhor = null;
  for (let i = 0; i < 4; i++) for (const fy of [-.8, -.5, -.2, .2, .5, .8]){
    const fx = (frente[0] + (frente[1] - frente[0])*i/3)*rr, p = rqPonto(bx + dir*fx, CY + fy*G.A, rr*1.1);
    if ((opp - p.x)*dir < rr*1.4) continue;
    const db = Math.hypot(p.x - bx, p.y - by), esp = Math.min(rqEspaco(p.x, p.y, q.time), rr*6)/rr;
    let nota = esp*.55 + (rqLinhaLivre(bx, by, p.x, p.y, q.time, rr*.25) ? 1.5 : -.8) - Math.abs(db/rr - ideal)*.22 - Math.hypot(p.x - q.x, p.y - q.y)/G.L*.5;
    for (const o of RQ.jog) if (o !== q && o.time === q.time){ const dd = Math.hypot(o.x - p.x, o.y - p.y); if (dd < rr*4.5) nota -= (rr*4.5 - dd)/rr*.6; }
    if (J.apoio === 'area') nota += (1 - Math.abs(opp - p.x)/(G.L*2))*1.4;
    if (J.apoio === 'lado') nota += Math.abs(fy)*.8;
    if (q.b78.spot && Math.hypot(p.x - q.b78.spot.x, p.y - q.b78.spot.y) < rr*1.4) nota += .45;   // (não fica trocando de lugar)
    if (!melhor || nota > melhor.nota) melhor = {x:p.x, y:p.y, nota};
  }
  return melhor;
}
function b78Apoio(q){
  const s = q.b78;
  if (!s.spot || RQ.tick - s.spotT > 22){ s.spot = b78ApoioSpot(q) || {x:q.sx, y:q.sy}; s.spotT = RQ.tick + Math.floor(Math.random()*6); }
  b78Anda(q, s.spot.x, s.spot.y, RQ.geo.rr*.35, true); b78Desvia(q);
}
function b78Sobra(q){                                                        // o que fica atrás quando o time ataca
  const G = RQ.geo, rr = G.rr, dir = b78Dir(q.time), own = rqGolX(q.time), V = q.b78.vis || B;
  const k = q.b78.alta ? B78.cfg.sobraAlta : .45, x = own + dir*b78Cl((V.x - own)*dir*k, rr*3, G.L*(q.b78.alta ? 1.15 : .95)), y = CY + (V.y - CY)*.35;   // (no 2v2 do Difícil, o que segura fica mais perto: ainda recebe o passe de volta)
  b78Anda(q, x, y, rr*.4, true); b78Desvia(q);
}
function b78Cobre(q){                                                        // entre a bola e o gol (sem encostar no goleiro)
  const G = RQ.geo, rr = G.rr, own = rqGolX(q.time), dir = b78Dir(q.time), gk = B78.times[q.time].gk, souGk = gk === q, V = q.b78.vis || B;
  const k = souGk ? B78.cfg.gkCobre : q.b78.J.apoio === 'tras' ? .34 : .5;      // (o goleiro-linha cobre mais perto do gol: volta a tempo)
  let x = own + (V.x - own)*k, y = CY + (V.y - CY)*k;
  const amea = RQ.jog.filter(o => o.time !== q.time && o !== B78.times[1 - q.time].chaser).sort((a, b) => Math.hypot(a.x - own, a.y - CY) - Math.hypot(b.x - own, b.y - CY))[0];
  if (amea){ const pu = q.b78.ultimo || souGk ? .08 : .3; x += (amea.x - x)*pu; y += (amea.y - y)*pu; }   // puxa para o lado de quem pode receber (o último e o goleiro quase não: ficam na linha do chute)
  if ((x - own)*dir < rr*(gk ? 3.2 : 1.6)) x = own + dir*rr*(gk ? 3.2 : 1.6);
  if (gk && gk !== q && Math.hypot(x - gk.x, y - gk.y) < rr*2.4){ const s = y >= gk.y ? 1 : -1; y = gk.y + s*rr*2.4; }
  b78Anda(q, x, y, rr*.3, true); b78Desvia(q);
}
function b78Marca(q, quem, corta){                                           // do lado do gol de quem ele marca (o Malandro fica na linha do passe)
  const rr = RQ.geo.rr, own = rqGolX(q.time), s = q.b78, V = s.vis || B, Q = s.quemVis || quem;
  if (!quem) return b78Cobre(q);
  let x, y;
  if (corta){ x = V.x + (Q.x - V.x)*.6; y = V.y + (Q.y - V.y)*.6; }
  else { const gx = own - Q.x, gy = CY - Q.y, gl = Math.hypot(gx, gy) || 1, m = rr*(Math.hypot(Q.x - V.x, Q.y - V.y) < rr*4 ? 2.6 : 1.8); x = Q.x + gx/gl*m + (V.x - Q.x)*.15; y = Q.y + gy/gl*m + (V.y - Q.y)*.15; }
  b78Anda(q, x, y, rr*.3, true); b78Desvia(q);
}
function b78Goleiro(q){                                                     // o goleiro: fecha o ângulo; no chute, vai no ponto em que a bola cruza (com o atraso dele)
  const G = RQ.geo, rr = G.rr, dir = b78Dir(q.time), own = rqGolX(q.time), linha = own + dir*q.r*.75, s = q.b78;
  if (!s.gkAlvo || RQ.tick >= s.gkT){
    s.gkT = RQ.tick + 4;
    if (RQ.tick >= s.prox - 1 || !s.gkAlvo){                                 // (ele só vê o chute depois do tempo de reação)
      const pv = b78Prev(); let cruza = null, corta = null, fica = false;
      for (const p of pv){ if (p.t > 0 && (p.x - linha)*dir <= 0){ if (Math.abs(p.y - CY) < G.gh - B.r*.2) cruza = p; break; } }   // (só vai no chute que entra: no que vai para fora, ele não desvia para dentro)
      const lenta = Math.hypot(B.vx, B.vy) < U(16);
      if (cruza && B78.cfg.gkCorta && ((q.x - linha)*dir > rr*1.2 || lenta)){  // adiantado (goleiro-linha) ou com a bola rolando devagar: sai nela pelo caminho, de frente
        for (const p of pv){
          if (p.t <= 0) continue; if ((p.x - linha)*dir <= 0) break;
          if ((q.x - p.x)*dir > rr*.3) continue;                                 // (só um ponto em que ele chega pelo lado do gol: por trás, o toque empurrava a bola para dentro)
          if (Math.max(0, Math.hypot(p.x - q.x, p.y - q.y) - rr*.85)/VEL_JOG <= p.t){ corta = p; break; }
        }
        if (!corta && !lenta && Math.max(0, Math.hypot(linha - q.x, cruza.y - q.y) - rr*.85)/VEL_JOG > cruza.t + .05) fica = true;   // não chega mais: não corre junto com ela
      }
      const erro = b78Gauss()*U(s.nv === 'facil' ? 1.8 : 1.1);                // (ele não acerta sempre o ponto exato; o do Fácil erra mais)
      s.gkCruza = corta ? {x:corta.x, y:corta.y + erro*.4, ate:RQ.tick + Math.round(corta.t*TICKS_POR_S) + 12}
        : fica ? {x:q.x, y:q.y, ate:RQ.tick + Math.round(cruza.t*TICKS_POR_S) + 10}
        : cruza && cruza.t < 1.3 ? {x:linha, y:cruza.y + erro, ate:RQ.tick + Math.round(cruza.t*TICKS_POR_S) + 20} : null;
    }
    let tx, ty;
    if (s.gkCruza && RQ.tick < s.gkCruza.ate){ tx = s.gkCruza.x; ty = s.gkCruza.y; }
    else {
      const dx = B.x - own, dy = B.y - CY, d = Math.hypot(dx, dy) || 1, prof = b78Cl(d*.16, q.r*.9, G.L*.2);
      tx = own + dx/d*prof; ty = CY + dy/d*prof;
      if ((tx - own)*dir < q.r*.75) tx = linha;
      ty = b78Cl(ty, GOL_Y0 - q.r*.3, GOL_Y1 + q.r*.3);
    }
    s.gkAlvo = {x:tx, y:ty};
  }
  b78Anda(q, s.gkAlvo.x, s.gkAlvo.y, RQ.geo.vm*.7);
  const d = Math.hypot(B.x - q.x, B.y - q.y);
  if (d < ALCANCE_CHUTE - 1 && RQ.tick - q.chuteT >= 10){                    // a bola chegou nele: tira
    const bx = B.x - q.x, by = B.y - q.y;
    if ((bx*dir)/d > -.1 && b78Seguro(q, FORCA_POWER)){ q.chutar = FORCA_POWER; q.mx = q.my = 0; q.plano = {tipo:'afasta', x:B.x + bx/d*100, y:B.y + by/d*100, forca:FORCA_POWER, finalidade:'defesa'}; B78.dbg.defesas++; q.b78.solta = RQ.tick + 10; }
  }
}

/* ---------------------------------------------------------------- a saída e a comemoração */
function b78Cobrador(t){
  const mem = RQ.jog.filter(q => q.time === t), k0 = mem.find(q => q.k === 0) || mem[0];
  if (!b78Humano(k0)) return k0;
  if (RQ.tick - RQ.saidaT0 < 60*5) return k0;                                // espera você dar a saída
  return mem.filter(q => !b78Humano(q)).sort((a, b) => Math.hypot(a.x - CX, a.y - CY) - Math.hypot(b.x - CX, b.y - CY))[0] || k0;
}
function b78SaidaBot(q){
  const s = q.b78, rr = RQ.geo.rr, dir = b78Dir(q.time), esp = RQ.tick - RQ.saidaT0;
  if (q.time === RQ.saidaTime && b78Cobrador(q.time) === q){
    if (esp < s.saidaEspera){ b78Anda(q, q.sx, q.sy, 1); return; }
    if (!s.plano){
      const amigos = RQ.jog.filter(o => o !== q && o.time === q.time);
      const o = amigos.sort((a, b) => Math.hypot(a.x - CX, a.y - CY) - Math.hypot(b.x - CX, b.y - CY))[0];
      const alvo = o ? {x:o.x, y:o.y} : {x:CX + dir*rr*5, y:CY + (Math.random() < .5 ? -1 : 1)*rr*4};
      s.plano = {tipo:'passe', alvo, forca:FORCA_KICK, recebe:o || null, chega:.5, t0:RQ.tick, erro:0};
    }
    b78Bate(q, s.plano);
    return;
  }
  if (B78.times[q.time] && B78.times[q.time].gk === q){ b78Anda(q, rqGolX(q.time) + dir*rr*1.1, CY, rr*.2); return; }   // o goleiro-linha espera a saída no gol (no 4v4 o lugar dele na formação é de lado)
  b78Anda(q, q.sx, q.sy, rr*.2);
}
function b78Festa(q){
  const t = RQ.golTime, autor = RQ.golAutor && RQ.golAutor.time === t ? RQ.golAutor : null, rr = RQ.geo.rr, s = q.b78;   // (o autor da regra única: no gol contra ninguém comemora)
  q.chutar = 0;
  if (q.time !== t || !autor || RQ.golT > 108){ q.mx = q.my = 0; return; }  // quem levou o gol para (e no fim todo mundo para)
  if (q === autor){
    if (!s.festa){ const gx = rqGolX(1 - t), dirv = b78Dir(t); s.festa = {x:gx - dirv*rr*2.4, y:q.y < CY ? LY0 + rr*1.2 : LY1 - rr*1.2, t0:RQ.tick}; }
    const f = s.festa, chegou = Math.hypot(f.x - q.x, f.y - q.y) < rr*1.2, k = RQ.tick - f.t0, J = s.J.festa;
    if (!chegou || J === 'canto' || J === 'abraco'){ b78Anda(q, f.x, f.y, 2); return; }
    if (J === 'aviao'){ const an = k/9; b78Anda(q, f.x + Math.cos(an)*rr*1.6, f.y + Math.sin(an)*rr*1.6, 1); return; }
    if (J === 'danca'){ const lado = Math.floor(k/7) % 2 ? 1 : -1; b78Anda(q, f.x + lado*rr*.9, f.y, 1); return; }
    if (J === 'palmas'){ const lado = Math.floor(k/5) % 2 ? 1 : -1; b78Anda(q, f.x, f.y + lado*rr*.6, 1); return; }
    if (J === 'volta'){ const an = k/14; b78Anda(q, f.x + Math.cos(an)*rr*3, f.y + Math.sin(an)*rr*1.4, 1); return; }
    b78Anda(q, f.x, f.y, 2); return;
  }
  if (Math.hypot(autor.x - q.x, autor.y - q.y) > rr*2.1) b78Anda(q, autor.x, autor.y, 2); else q.mx = q.my = 0;   // os companheiros vão abraçar (você também)
}

function b78Esquiva(q){                                                     // a bola vem forte para o lado do nosso gol mas vai para fora: sai da frente (o desvio nele entrava)
  const v = Math.hypot(B.vx, B.vy), dir = b78Dir(q.time); if (v < U(15) || B.vx*dir > 0) return false;
  const pv = b78Prev(), rr = RQ.geo.rr, own = rqGolX(q.time);
  let fora = false;
  for (const p of pv){
    if (p.gol) return false;                                                 // vai no gol: bloqueia (fica na frente)
    if ((p.x - own)*dir <= B.r*1.2){ fora = Math.abs(p.y - CY) > RQ.geo.gh + B.r*.6; break; }   // cruza a linha de fundo fora da boca do gol?
  }
  if (!fora) return false;                                                   // (só sai da frente do que vai para fora com certeza)
  for (const p of pv){
    if (p.t > .45) break;
    const dx = q.x - p.x, dy = q.y - p.y;
    if (Math.hypot(dx, dy) < q.r + B.r + U(.6)){
      const ux = B.vx/v, uy = B.vy/v, lat = dx*uy - dy*ux, sg = lat >= 0 ? 1 : -1;
      q.mx = uy*sg; q.my = -ux*sg; q.chutar = 0;                             // anda de lado, para fora do caminho
      return true;
    }
  }
  return false;
}
/* ---------------------------------------------------------------- cada bot, a cada tick */
function b78Bot(q){
  const s = q.b78; if (!s) return;
  q.chutar = 0;
  if (RQ.estado === 'gol') return b78Festa(q);
  if (RQ.estado === 'intro' || RQ.estado === 'fim'){ q.mx = q.my = 0; return; }
  if (RQ.estado === 'saida') return b78SaidaBot(q);
  const S = B78.times[q.time], nv = b78Nv(q), rr = RQ.geo.rr;
  // pensa (com o atraso dele): o papel e o ponto da bola que ele viu
  if (RQ.tick >= s.prox){
    s.prox = RQ.tick + Math.max(3, nv.pensa + (Math.random() < .5 ? -1 : 1));
    const pp = S.papeis.get(q);
    s.papel = S.chaser === q ? 'bola' : pp ? pp.papel : 'apoio';
    s.quem = pp ? pp.quem : null; s.ultimo = !!(pp && pp.ultimo); s.alta = !!(pp && pp.alta);
    s.vis = {x:B.x, y:B.y}; s.quemVis = s.quem ? {x:s.quem.x, y:s.quem.y} : null;   // (o que ele viu agora: até pensar de novo, joga com isso)
    if (s.papel === 'bola'){ s.alvo = q.b78pt ? {x:q.b78pt.x, y:q.b78pt.y} : {x:B.x, y:B.y}; }
    q.papel = s.papel === 'gk' ? 'gk' : s.papel === 'bola' ? 'bola' : s.papel;
  }
  const d = Math.hypot(B.x - q.x, B.y - q.y);
  // preso na dividida: chuta de onde está ou recua e volta
  if (d < rr*1.25 && Math.hypot(B.vx, B.vy) < U(4)){ if (s.contatoT < 0) s.contatoT = RQ.tick; } else s.contatoT = -1;
  if (s.recua){ if (RQ.tick < s.recua.ate){ b78Anda(q, q.x + s.recua.x*U(4), q.y + s.recua.y*U(4), 1); return; } s.recua = null; }
  if (s.contatoT >= 0 && RQ.tick - s.contatoT > nv.trava){
    s.contatoT = -1;
    if (b78Bico(q)) return;
    const rx = q.x - B.x, ry = q.y - B.y, rl = Math.hypot(rx, ry) || 1, a = (Math.random() - .5)*1.4, g = b78Gira(rx/rl, ry/rl, a);
    s.recua = {x:g.x, y:g.y, ate:RQ.tick + 10 + Math.floor(Math.random()*8)}; s.plano = null;
    return;
  }
  if ((s.papel === 'cobre' || s.papel === 'marca' || s.papel === 'corta' || s.papel === 'sobra') && b78Corta(q, false)) return;   // a bola chegou no defensor: tira
  if (s.papel !== 'gk' && b78Esquiva(q)) return;
  switch (s.papel){
    case 'bola':
      if (S.fase === 'defesa' && !b78ComEle(q)) return b78Pressiona(q);
      return b78Busca(q);
    case 'gk': return b78Goleiro(q);
    case 'sobra': return b78Sobra(q);
    case 'cobre': return b78Cobre(q);
    case 'marca': return b78Marca(q, s.quem, false);
    case 'corta': return b78Marca(q, s.quem, true);
    default: return b78Apoio(q);
  }
}
function b78Tick(){
  // a bola mudou de repente (chute, batida)? cada um percebe depois do seu tempo de reação
  const f = CAMPO.fatorBola;
  if (Math.hypot(B.vx - B78.vAnt.vx*f, B.vy - B78.vAnt.vy*f) > U(5)){
    B78.lanceT = RQ.tick;
    for (const q of RQ.jog) if (q.b78) q.b78.prox = Math.min(q.b78.prox, RQ.tick + q.b78.reacao);
  }
  B78.vAnt.vx = B.vx; B78.vAnt.vy = B.vy;
  // quem tocou por último (para a tabelinha)
  const u = RQ.toques[RQ.toques.length - 1], u2 = RQ.toques[RQ.toques.length - 2];
  if (u && u2 && u.p !== u2.p && u.p.time === u2.p.time && u.p.b78 && u.p.b78.recebeuT !== u.tick){ u.p.b78.recebeuDe = u2.p; u.p.b78.recebeuT = u.tick; }
  if (P.b78 && (Math.abs(P.vx) + Math.abs(P.vy) > 1 || RQ.tick - (P.chuteT || -99) < 2)) P.b78.ultimoMexe = RQ.tick;   // (você mexeu: anda ou chutou)
  b78Escalacao();
  if (RQ.estado === 'jogo' && (RQ.tick % 4 === 0 || !B78.times[0].chaser)) b78Organiza();
  // a bola presa entre os dois times por mais de 4 s: quem é bot e está nela dá um passo atrás (ela sai de lá)
  if (RQ.estado === 'jogo'){
    const rr = RQ.geo.rr; let t0 = 0, t1 = 0;
    if (Math.hypot(B.vx, B.vy) < U(3)) for (const q of RQ.jog) if (Math.hypot(q.x - B.x, q.y - B.y) < rr*1.7){ if (q.time) t1++; else t0++; }
    B78.presoT = t0 && t1 ? (B78.presoT || 0) + 1 : 0;
    if (B78.presoT > 240){
      B78.presoT = 0; B78.dbg.destravas = (B78.dbg.destravas || 0) + 1;
      for (const q of RQ.jog){
        if (!q.b78 || b78Humano(q) || Math.hypot(q.x - B.x, q.y - B.y) > rr*1.9) continue;
        const rx = q.x - B.x, ry = q.y - B.y, rl = Math.hypot(rx, ry) || 1;
        q.b78.recua = {x:rx/rl, y:ry/rl, ate:RQ.tick + 45}; q.b78.plano = null; q.b78.contatoT = -1;
      }
    }
  } else B78.presoT = 0;
  for (const q of RQ.bots) if (!q.remote) b78Bot(q);
  if (RQ.autoH || (NET49.playing && NET49.host && !P.netId)) b78Bot(P);
}

/* ---------------------------------------------------------------- a escalação: no começo, o jeito de cada bot (na faixa de cima, depois do sorteio) */
const B78_E = n => n.length < 2 ? n.join('') : n.slice(0, -1).join(', ') + ' E ' + n[n.length - 1];
function b78Escalacao(){
  const S = B78.times[0]; if (!S || NET49.playing || RQ.estado === 'gol' || RQ.estado === 'fim') return;
  if (B78.escFeita == null){
    const nome = q => q.b78.J.nome.toUpperCase() + (B78.times[q.time].gk === q ? ' NO GOL' : '');
    const meus = RQ.jog.filter(q => q.time === 0 && !b78Humano(q) && q.b78).map(nome), deles = RQ.jog.filter(q => q.time === 1 && q.b78).map(nome);
    const L = [];
    if (meus.length && meus.length + deles.length <= 3) L.push('COM VOCÊ: ' + B78_E(meus) + ' · CONTRA: ' + B78_E(deles));
    else { if (meus.length) L.push('COM VOCÊ: ' + B78_E(meus)); L.push('CONTRA: ' + B78_E(deles)); }
    B78.escFila = L; B78.escFeita = 0;
  }
  if (B78.escFila && B78.escFeita < B78.escFila.length && RQ.tick > 30 && RQ.aviso.t <= 0){ rqAvisa(B78.escFila[B78.escFeita++], '#ffd23f'); }
}

/* ---------------------------------------------------------------- ligações com o resto do jogo */
const rqBotsAntes78 = rqBots;
rqBots = function(){
  if (!B78.on || !B78.times[0] || (RQ.jogo !== 'futebol' && RQ.jogo !== 'curva')) return rqBotsAntes78.apply(this, arguments);
  b78Tick();
  for (const q of RQ.bots) if (q.remote) net49Control(q);                    // quem joga de fora (sala online)
};
const rqHmCriaAntes78 = rqHmCria;
rqHmCria = function(){ rqHmCriaAntes78.apply(this, arguments); try { b78Cria(); } catch (e) { B78.times = [null, null]; window.RUA_BOTS78_ERRO = String(e && e.stack); } };
const rqHmSaidaAntes78 = rqHmSaida;
rqHmSaida = function(){ rqHmSaidaAntes78.apply(this, arguments); try { if (B78.times[0]) b78Saida(); } catch (_) {} };
const rqGolAntes78 = rqGol;
rqGol = function(){ const r = rqGolAntes78.apply(this, arguments); try { b78Termometro(); } catch (_) {} return r; };
// nada em cima da cabeça: os nomes das jogadas (FINTA!, DRIBLE!, TABELA!, DOUBLE SHOT!) não aparecem mais (o balão "digitando" da sala fica)
const rqHmDesenhaTagsAntes78 = rqHmDesenhaTags;
rqHmDesenhaTags = function(g){ RQ_HM.tags.length = 0; return rqHmDesenhaTagsAntes78.apply(this, arguments); };
// a apresentação dos times: o jeito de cada bot
function b78NaApresentacao(){
  if (NET49.playing || !VS.v || !B78.times[0]) return;
  const nv = RQ_NIVEIS[RQ.nivel] ? RQ_NIVEIS[RQ.nivel].nome.toUpperCase() : '';
  for (const [ul, t] of [[VS.v, 0], [VS.a, 1]]){
    const mem = RQ.jog.filter(o => o.time === t);
    Array.from(ul.children).forEach((li, i) => {
      const q = mem[i]; if (!q || q.humano || !q.b78) return;
      const s = li.querySelector('small');
      const nq = RQ_NIVEIS[q.b78.nv] ? RQ_NIVEIS[q.b78.nv].nome.toUpperCase() : nv;   // (o nível em que ele joga: os seus companheiros, sempre no bom)
      if (s){ s.textContent = 'BOT · ' + nq + ' · ' + q.b78.J.nome.toUpperCase() + (q === B78.times[t].gk ? ' (GOLEIRO)' : ''); s.title = q.b78.J.frase; }
      li.title = q.nome + ' · ' + q.b78.J.nome + ': ' + q.b78.J.frase;
    });
  }
}
const rqVsAbreAntes78 = rqVsAbre;
rqVsAbre = function(){ const r = rqVsAbreAntes78.apply(this, arguments); try { b78NaApresentacao(); } catch (_) {} return r; };
window.RachaBots78 = {                                                       // (para os testes e para quem quiser olhar)
  versao:'78', jeitos:B78_JEITOS, niveis:B78_NIVEL,
  estado:() => ({on:B78.on, nivel:RQ.nivel, termo:B78.times.map(S => S ? S.termo : null), fase:B78.times.map(S => S ? S.fase : null),
    jogadores:RQ.jog.map(q => ({nome:q === P ? 'VOCÊ' : q.nome, time:q.time, humano:b78Humano(q), jeito:q.b78 ? q.b78.jeito : null, papel:q.b78 ? q.b78.papel : null,
      goleiro:!!(B78.times[q.time] && B78.times[q.time].gk === q), reacao:q.b78 ? q.b78.reacao : null})),
    contas:Object.assign({}, B78.dbg)})
};
