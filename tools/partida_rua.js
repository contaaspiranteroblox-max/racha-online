/* =====================================================================
   RACHA rua · v67 — entra no fim do script principal (o aplicar_rua.py cola este arquivo antes do montaAbas()).
   Só controles na tela, câmera e desenho: o bloco da física (PHYS) não muda e a entrada continua a mesma
   (o getInput devolve as mesmas direções de sempre).
   1) O analógico novo: maior, com uma tampinha de manipulador, e fixo na tela por padrão.
   2) Mais câmeras: À frente do jogador, Seguir a bola e Transmissão (além de Seguir jogador e Tela parada).
   3) Sem skins: todo mundo (você, os bots, o treino, o replay, o online) joga com a tampinha lisa na cor do time.
   ===================================================================== */

/* ---------------------------------------------------------------- 1) o analógico */
// A 100%: base de raio 170 (era 129), manipulador de raio 60 (era 32) e curso de 128 (era 100). O toque pega num círculo de 300.
JOY.knob = 60; JOY.max = 128; JOY.aro = 110; JOY.zone = 300;
Object.assign(HUD_PADRAO.joy, {x:262, y:640, s:1, a:1, oc:false, adere:false, segue:false, km:1, al:1});   // fixo no canto de baixo
try {
  if (!localStorage.getItem('racha-analogico-v67')){   // uma vez: todo mundo ganha o analógico novo, fixo na tela
    Object.assign(hud.joy, HUD_PADRAO.joy); prender('joy');
    localStorage.setItem('racha-analogico-v67', '1'); salvar();
  }
} catch (_) {}

joyAroCorpo = function(g, anel){                        // a base: um círculo de quadra pintado no asfalto (imagem pronta)
  const R = anel - 4;
  const gb = g.createRadialGradient(0, 0, R*.15, 0, 0, R);
  gb.addColorStop(0, 'rgba(23,26,28,.3)'); gb.addColorStop(1, 'rgba(23,26,28,.6)');
  g.beginPath(); g.arc(0, 0, R, 0, TAU); g.fillStyle = gb; g.fill();
  g.lineWidth = 9; g.strokeStyle = 'rgba(15,16,17,.72)'; g.beginPath(); g.arc(0, 0, R, 0, TAU); g.stroke();    // o aro: cal com a beirada escura
  g.lineWidth = 5; g.strokeStyle = 'rgba(243,239,228,.96)'; g.beginPath(); g.arc(0, 0, R, 0, TAU); g.stroke();
  g.setLineDash([10, 9]); g.lineWidth = 3; g.strokeStyle = 'rgba(243,239,228,.36)';                       // o círculo do meio, tracejado
  g.beginPath(); g.arc(0, 0, R*.5, 0, TAU); g.stroke(); g.setLineDash([]);
  for (let i = 0; i < 8; i++){                                                                               // as setas: 4 grandes e 4 pequenas
    const grande = i % 2 === 0, s = grande ? 15 : 9;
    g.save(); g.rotate(i*TAU/8); g.translate(R*.79, 0);
    g.beginPath(); g.moveTo(s*.75, 0); g.lineTo(-s*.45, -s*.8); g.lineTo(-s*.45, s*.8); g.closePath();
    g.fillStyle = grande ? 'rgba(243,239,228,.92)' : 'rgba(243,239,228,.45)'; g.fill();
    if (grande){ g.lineWidth = 2.5; g.lineJoin = 'round'; g.strokeStyle = 'rgba(15,16,17,.55)'; g.stroke(); }
    g.restore();
  }
};
joyPinoCorpo = function(g, kr, kx, ky){                 // o manipulador: uma tampinha amarela vista de cima (imagem pronta)
  const n = 21, fora = kr - 1, dentro = kr*.87;
  g.save(); g.translate(kx, ky);
  g.beginPath();                                                                                              // a saia de metal com os dentes
  for (let i = 0; i < n*2; i++){ const a = i*Math.PI/n, r = i % 2 ? dentro : fora; if (i) g.lineTo(Math.cos(a)*r, Math.sin(a)*r); else g.moveTo(r, 0); }
  g.closePath();
  const gs = g.createLinearGradient(-kr, -kr, kr, kr); gs.addColorStop(0, '#ffe58a'); gs.addColorStop(1, '#b97f0c');
  g.fillStyle = gs; g.fill(); g.lineJoin = 'round'; g.lineWidth = 3; g.strokeStyle = '#0f1011'; g.stroke();
  const R2 = kr*.79, gt = g.createRadialGradient(-kr*.25, -kr*.3, kr*.05, 0, 0, R2);                       // o tampo esmaltado
  gt.addColorStop(0, '#fff3b8'); gt.addColorStop(.45, '#f5c542'); gt.addColorStop(1, '#d69611');
  g.beginPath(); g.arc(0, 0, R2, 0, TAU); g.fillStyle = gt; g.fill();
  g.lineWidth = 2.5; g.strokeStyle = 'rgba(110,70,0,.6)'; g.stroke();
  g.setLineDash([3, 4]); g.lineWidth = 2; g.strokeStyle = 'rgba(110,70,0,.32)';                            // o friso de dentro
  g.beginPath(); g.arc(0, 0, R2*.64, 0, TAU); g.stroke(); g.setLineDash([]);
  g.beginPath(); g.ellipse(-kr*.27, -kr*.31, kr*.3, kr*.13, -.7, 0, TAU); g.fillStyle = 'rgba(255,255,255,.55)'; g.fill();   // o brilho
  g.restore();
};
// O analógico inteiro passa a ser desenhado aqui, a cada quadro: a sombra, a base, a fatia acesa na direção em que
// você anda (por cima da base), a luz e a tampinha. O desenho de antes continua rodando, só que invisível.
function joyDesenha(){
  const j = hud.joy, va = ctlVis.joy; if (!(va > .004)) return;
  const g = ctx, c = joyCentro(), kr = JOY.knob*j.km, anel = JOY.aro*j.al + kr, R = anel - 4, q = escHud(j.s);
  g.save(); g.translate(c.x, c.y); g.scale(j.s, j.s); g.globalAlpha = j.a*va;
  if (!G().plano){                                      // a sombra no chão
    const gs = g.createRadialGradient(0, 10, R*.75, 0, 10, R*1.14);
    gs.addColorStop(0, 'rgba(0,0,0,.26)'); gs.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gs; g.beginPath(); g.arc(0, 10, R*1.14, 0, TAU); g.fill();
  }
  pintaHud(g, sprHud('joyAro|' + anel, q, anel + 6, anel + 6, anel + 6, anel + 6, h => joyAroCorpo(h, anel)));
  if (joy.id !== null){
    if (joy.ativo){
      const ang = AN.setor !== null ? AN.setor*TAU/NF.DIRECOES : Math.atan2(joy.dy, joy.dx);   // a direção que o jogo usa (v85: 256 direções)
      const gf = g.createRadialGradient(0, 0, R*.18, 0, 0, R - 3);
      gf.addColorStop(0, 'rgba(245,197,66,0)'); gf.addColorStop(1, 'rgba(245,197,66,.62)');
      g.fillStyle = gf; g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, R - 3, ang - .42, ang + .42); g.closePath(); g.fill();
      g.lineCap = 'round';                               // o arco aceso do lado de fora do aro (contorno escuro: aparece no verde e no amarelo)
      g.lineWidth = 13; g.strokeStyle = 'rgba(15,16,17,.6)'; g.beginPath(); g.arc(0, 0, R + 13, ang - .4, ang + .4); g.stroke();
      g.lineWidth = 7; g.strokeStyle = '#f5c542'; g.beginPath(); g.arc(0, 0, R + 13, ang - .4, ang + .4); g.stroke();
    }
    const gk = g.createRadialGradient(joy.dx, joy.dy, kr*.55, joy.dx, joy.dy, kr*1.5);   // a luz debaixo da tampinha
    gk.addColorStop(0, 'rgba(245,197,66,.45)'); gk.addColorStop(1, 'rgba(245,197,66,0)');
    g.fillStyle = gk; g.beginPath(); g.arc(joy.dx, joy.dy, kr*1.5, 0, TAU); g.fill();
  }
  g.translate(joy.dx, joy.dy);
  pintaHud(g, sprHud('joyPino|' + kr, q, kr + 4, kr + 4, kr + 4, kr + 4, h => joyPinoCorpo(h, kr, 0, 0)));
  g.restore();
}
const drawControlsAntes67 = drawControls;
drawControls = function(dt){
  const a = hud.joy.a; hud.joy.a = 0;                   // o analógico antigo desenha transparente (os botões seguem iguais)
  try { drawControlsAntes67(dt); } finally { hud.joy.a = a; }
  try { joyDesenha(); } catch (_) {}
};

/* ---------------------------------------------------------------- 2) as câmeras */
// v70: a câmera inteira (os estilos, o À frente, a proteção do jogador, os enquadramentos) mora no updateCamera do jogo
// (tools/v70/camera.py). Aqui ficam só os botões do painel até o painel novo de Ajustes › Câmera.
const CAM_NOTA = {
  jogador:'Segue você. Zoom: mais = mais perto · Deslocamento: 0 = em cima de você, 10 = no meio entre você e a bola',
  frente:'Segue você e mostra mais do campo para onde você corre: dá para ver quem vem',
  bola:'A câmera vai atrás da bola. O zoom vale; o deslocamento é só do Seguir jogador',
  tv:'Como na TV: corre de lado acompanhando a bola e quase não sobe nem desce',
  fixa:'Tela parada mostra o campo inteiro: o zoom e o deslocamento só valem com a câmera andando'
};
const CAM_BTS = [[ui.seguir, 'jogador'], [$('hp-frente'), 'frente'], [$('hp-bola'), 'bola'], [$('hp-tv'), 'tv'], [ui.fixa, 'fixa']].filter(p => p[0]);
for (const [b, k] of CAM_BTS){
  if (k === 'fixa') continue;                           // (o Tela parada continua com o clique de sempre)
  b.addEventListener('click', () => { cam.mode = 'seguir'; cam.estilo = k; syncPanel(); });
}

/* ---------------------------------------------------------------- o EDITAR HUD: Fixo na tela e as câmeras */
const hpFixo = $('hp-fixo');
if (hpFixo) hpFixo.addEventListener('click', () => {
  const fixo = !hud.joy.adere && !hud.joy.segue;
  if (fixo){ hud.joy.adere = true; hud.joy.segue = true; }   // desliga o Fixo: volta a aparecer onde você toca
  else { hud.joy.adere = false; hud.joy.segue = false; hud.joy.oc = false; }
  syncPanel();
});
const syncPanelAntes67 = syncPanel;
syncPanel = function(){
  syncPanelAntes67();
  if (hpFixo) ligado(hpFixo, !hud.joy.adere && !hud.joy.segue);
  if (sel === 'joy') ui.cnota.textContent = 'Fixo: fica sempre no mesmo lugar · Adere: aparece onde você toca · Seguir: anda atrás do dedo · Ocultar: some ao soltar';
  const seg = cam.mode === 'seguir', est = seg ? cam.estilo : 'fixa';
  for (const [b, k] of CAM_BTS){ b.classList.toggle('on', k === est); b.setAttribute('aria-pressed', String(k === est)); }
  ui.desl.disabled = !(seg && cam.estilo === 'jogador');
  ui.nota.textContent = CAM_NOTA[est] || '';
  if (editing && !ui.painel.hidden) posicionaPainel();
};

/* ---------------------------------------------------------------- 3) sem skins */
const SEM_SKIN = SKINS[0];                              // a tampinha (a inicial): a única que fica
SEM_SKIN.cor = '#f5c542';                               // o seu time de amarelo; o adversário, na cor contrária (azul)
CONTRA.clear(); NA_COR61.clear();
skinPorId = () => SEM_SKIN;                             // você (e qualquer um que viria com uma skin salva) = a tampinha
skinDoBot = q => skinDoTime(q && (q.time != null ? q.time : q.funcao === 'gk' ? 1 : 0) ? 1 : 0);   // os bots e o treino: a tampinha do time
for (const k in BOTAO_TIPOS) if (k !== 'tampinha') BOTAO_TIPOS[k] = BOTAO_TIPOS.tampinha;            // qualquer disco antigo (replay salvo, online) sai como tampinha
const drawBotaoAntes67 = drawBotao, botaoProntoAntes67 = botaoPronto;
drawBotao = function(g, x, y, r, sk, avatar, sombra, est){ return drawBotaoAntes67(g, x, y, r, sk, null, sombra, est); };      // lisa: sem texto nem emblema no meio
botaoPronto = function(g, x, y, r, sk, avatar, est, esc){ return botaoProntoAntes67(g, x, y, r, sk, null, est, esc); };
Object.assign(X49, {ball:'classic', border:'plain', uniform:'plain', celebration:'confetti'});    // os efeitos (que eram skins) no padrão
previewSk49 = null;

// a tela SKINS some: quem chamava por ela (a tampinha do meio do lobby, o perfil, os avisos) vai para o PERFIL
const abreTelaAntes67 = abreTela;
abreTela = function(id, volta){ if (id === 'skins' || id === 'botoes' || id === 'vestiario') id = 'perfil'; return abreTelaAntes67(id, volta); };
GRUPOS.vestiario.abas = GRUPOS.vestiario.abas.filter(a => a[0] !== 'skins');
GRUPOS.vestiario.titulo = 'LOJA';
for (let i = LJ_PACOTES.length - 1; i >= 0; i--) if (LJ_PACOTES[i][3] === 'disco') LJ_PACOTES.splice(i, 1);   // o pacote que dava um disco

// a primeira vez: em vez de escolher, mostra a tampinha
onbTampas = function(){
  const box = $('onb-tampas'); if (!box) return;
  box.textContent = ''; ONB.escolha = SEM_SKIN.id;
  const b = novoBotao('onb-tampa on', 'Tampinha'); b.dataset.sk = SEM_SKIN.id;
  const cvT = document.createElement('canvas'); cvT.width = cvT.height = Math.round(150*dprL()); b.appendChild(cvT);
  const g = cvT.getContext('2d'); g.scale(dprL(), dprL()); drawBotao(g, 75, 75, 62, SEM_SKIN, null, false, EST0);
  b.append(nodo('b', null, 'Tampinha'), nodo('small', null, 'na cor do seu time'));
  box.appendChild(b);
  const p2 = $('onb-2'); if (!p2) return;
  const h = p2.querySelector('h2'), t = p2.querySelector('p.pop-txt');
  if (h) h.textContent = 'ESSA É A SUA TAMPINHA';
  if (t) t.textContent = 'No RACHA todo mundo joga de tampinha: o seu time de amarelo, o adversário de azul. Agora, 20 segundos de aquecimento.';
};

// quem comprou skin recebe de volta o que pagou (uma vez por aparelho); os avisos da coleção e dos discos liberados não aparecem mais
const VOLTA67 = {m:0, g:0, n:0};
(function(){
  if (CONTA.presentes.indexOf('v67-sem-skins') >= 0) return;
  let m = 0, gm = 0, n = 0;
  for (const id of new Set(CONTA.skins)){ const s = SKIN_MAP.get(id); if (!s || !s.loja) continue; n++; m += s.m || 0; gm += s.g || 0; }
  CONTA.presentes.push('v67-sem-skins');
  if (CONTA.presentes.indexOf('v61') < 0) CONTA.presentes.push('v61');
  for (const u of ULTRAS49) if (CONTA.presentes.indexOf('ultra-' + u.id) < 0) CONTA.presentes.push('ultra-' + u.id);
  if (n){ CONTA.moedas = Math.min(1e9, CONTA.moedas + m); CONTA.gemas = Math.min(1e9, CONTA.gemas + gm); Object.assign(VOLTA67, {m, g:gm, n}); }
  CONTA.skins = [];
  contaSalvar();
})();
const segueFila67 = () => { const f = filaPop.shift(); if (f) setTimeout(f, 60); };
popNovosBotoes = segueFila67; popUltra61 = segueFila67;
const filaPopsAntes67 = filaPops;
filaPops = function(){
  if (VOLTA67.n && LB.pop.hidden && !(typeof ONB !== 'undefined' && (ONB.aberto || ONB.aquece))){
    const v = Object.assign({}, VOLTA67); VOLTA67.n = 0;
    filaPop.push(() => filaPops());
    abrePop(c => {
      c.append(nodo('span', 'pop-tag', 'NOVIDADE'), nodo('h2', null, 'SEM SKINS'),
        nodo('p', 'pop-txt', 'Agora todo mundo joga de tampinha, na cor do time. ' + (v.n === 1 ? 'A skin que você comprou saiu do jogo: o que você pagou voltou para a sua conta.' : 'As ' + v.n + ' skins que você comprou saíram do jogo: o que você pagou voltou para a sua conta.')));
      linhaPremio(c, v.m, v.g, 0);
      const a = nodo('div', 'pop-acoes'); a.appendChild(botaoPop('OK', 'verde', () => { som.clique(); fechaPop(); })); c.appendChild(a);
    });
    som.nivel();
    return;
  }
  return filaPopsAntes67();
};

// a trilha do lobby (ficava dentro de SKINS) agora fica nos AJUSTES
const ajFaixa = $('aj-faixa');
if (ajFaixa){
  FAIXAS.forEach((f, i) => { const b = novoBotao(''); b.dataset.faixa = String(i); b.textContent = f.nome.split(' ')[0].toUpperCase(); b.title = f.nome; ajFaixa.appendChild(b); });
  ajFaixa.addEventListener('click', e => {
    const b = e.target.closest('button[data-faixa]'); if (!b) return;
    CONTA.faixa = +b.dataset.faixa; CONTA.musica = true; contaSalvar(); lbMusica(); syncAjustes(); som.clique();
  });
}
const syncAjustesAntes67 = syncAjustes;
syncAjustes = function(){
  syncAjustesAntes67();
  if (ajFaixa) for (const b of ajFaixa.children) b.classList.toggle('on', !!CONTA.musica && +b.dataset.faixa === CONTA.faixa);
};
