// Ferramentas dos testes automáticos — avaliado dentro do script do jogo por window.__RT (só existe na cópia de teste,
// tests/build/racha_teste.html). Nada aqui vai para o jogo publicado.
window.__T = (function(){
  const T = {};
  T.nome = q => q ? (q === P ? 'EU' : String(q.nome || '?')) : null;
  // uma partida contra bots, com o quadro do jogo parado: os testes dão os passos da física e mandam em todo mundo
  T.comeca = function(jogo, n, mapa){
    try { if (fimAberto()) fechaFim(); } catch (_) {}
    if (lobby.aberto){ lobby.aberto = false; LB.raiz.hidden = true; }   // (como o JOGAR: o lobby sai da frente)
    X49.mode = 'casual'; X49.jogo = jogo;
    rqComeca(n || 2, mapa || 0); rqVsComeca();
    ARB_PARADO = function(){ return true; };            // (o quadro do jogo não chama a física)
    rqBots = function(){};                               // (os bots não decidem: q.mx, q.my e q.chutar vêm do teste)
    RQ.autoH = true; P.mx = P.my = 0; P.chutar = 0;
    RQ.estado = 'jogo';
    return {meta:RQ.meta, jogo:RQ.jogo, n:RQ.n, td:!!RQ.td, tres:RQ.tres || 0, metaTxt:typeof mdMetaTxt === 'function' ? mdMetaTxt() : null};
  };
  T.poe = function(q, x, y){ q.x = q.ax = x; q.y = q.ay = y; q.vx = q.vy = 0; q.mx = q.my = 0; q.chutar = 0; };
  T.bola = function(x, y, vx, vy){ B.x = x; B.y = y; B.vx = vx || 0; B.vy = vy || 0; B.w = 0; B.cvT = 0; };
  T.limpa = function(){                                 // todo mundo longe da jogada, parado; a bola no meio; o lance zerado
    const c = [[LX0 + 70, LY0 + 70], [LX0 + 70, LY1 - 70], [CX - 70, LY0 + 70], [CX - 70, LY1 - 70], [CX + 70, LY0 + 70], [CX + 70, LY1 - 70], [LX1 - 70, LY0 + 70], [LX1 - 70, LY1 - 70]];
    RQ.jog.forEach((q, i) => T.poe(q, c[i % c.length][0], c[i % c.length][1]));
    T.bola(CX, CY); RQ.toques.length = 0; RQ.ultPor = [null, null]; RQ.chuteDe = null;
    if ('tdPortador' in RQ) RQ.tdPortador = null;
    RQ.estado = 'jogo';
  };
  T.time = t => RQ.jog.filter(q => q.time === t);
  T.bot = (t, k) => RQ.jog.filter(q => q.time === t && q !== P)[k || 0];
  // n ticks; antes(i) ajusta os comandos; para no tick do ponto e devolve o lance (antes de a faixa limpar o RQ.ev)
  T.passos = function(n, antes){
    for (let i = 0; i < n; i++){
      if (antes) antes(i);
      guardaAnterior(); physicsStep(STEP, 0, 0);
      if (RQ.estado === 'gol') return T.lance(i + 1);
    }
    return null;
  };
  T.lance = function(ticks){
    const e = RQ.ev, I = RP.golInfo ? Object.assign({}, RP.golInfo) : null;
    if (I && I.placar) I.placar = I.placar.slice();
    return {ticks:ticks || 0, placar:RQ.placar.slice(), time:e.gol, pts:e.pts | 0, autor:T.nome(e.autor), assist:T.nome(e.assist), contra:!!e.contra,
      contraDe:T.nome(e.contraDe), desvio:T.nome(e.desvio), golH:!!e.golH, assistH:!!e.assistH, golsH:RQ.golsH | 0, info:I};
  };
  T.faixa = function(){ rqEventos(); return {t:bannerTxt, s:bannerSub, azul:!!bannerAzul}; };   // a faixa do GOL! que o jogo mostraria
  T.aviso = () => RQ.aviso && RQ.aviso.t > 0 ? RQ.aviso.txt : '';
  // o jogador q encosta na bola: a bola parada colada nele, do lado (dx, dy)
  T.cola = function(q, dx, dy){ const l = Math.hypot(dx, dy) || 1, d = q.r + B.r + .5; T.bola(q.x + dx/l*d, q.y + dy/l*d); };
  // v70.2: os modos e mapas que saíram do jogo continuam no código (só não aparecem). Para testar a regra deles, os testes
  // ligam de novo SÓ NESTA PÁGINA (T.guardados) e voltam ao jogo de verdade com T.enxuto. O jogo publicado nunca chama isto.
  T.guardados = function(){ V702.modos = V702_TODOS.md.map(m => m.id); V702.mapas = CAMPOS.map((_, i) => i); v702Aplica(); return true; };
  T.enxuto = function(){ V702.modos = ['futebol', 'curva']; V702.mapas = [0, 4]; v702Aplica(); return true; };
  return T;
})();
true;
