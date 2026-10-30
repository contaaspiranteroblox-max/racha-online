/* ======================================================================================================================
   RACHA v95 · O SENSOR E A TAMPINHA INICIAL (o pedido, com a imagem: "sensor ao redor do player deixe assim, porém dos
   parceiros de time deixe da cor do time; no personagem inicial bote roxo, branco e laranja, e se o cara cair no time roxo
   fica roxo, branco, roxo").
   · O SENSOR (o anel do alcance do chute em volta de cada um) agora é limpo e translúcido: um anel cheio e claro, com a borda
     de fora mais viva (ela continua marcando o alcance do chute) e uma sombra leve por baixo. O SEU é VERDE (como na imagem);
     o dos parceiros e o dos adversários ficam na cor do time de cada um (laranja no Time A, roxo no Time B). A ponta que mostra
     para onde cada um está virado também ficou limpa. A carga do chute armado (o tracejado que gira) continua igual. Vale na
     partida, no treino, nas salas, no replay (lá todos na cor do time) e na prévia dos times; o respingo e o rastro da bola
     continuam na cor do time de quem chutou.
   · A TAMPINHA INICIAL (a de quem não escolheu outra) virou a de listras em pé: ROXO, BRANCO e LARANJA (o modelo Tricolor, com
     a borda de sempre). No time ela fica com a cor do time dos lados: no Time A, LARANJA, BRANCO e LARANJA; no Time B, ROXO,
     BRANCO e ROXO — nas partidas, nas salas, com os bots e na Oficina (lá com a cor do time do mapa). As outras tampinhas
     (as compradas, as da conta e as personalizadas) ficam como são. As trocas de texto (TP_PADRAO_COD e TP_TIME_COD) estão no
     tools/v95/v95.py; a padrão da v80 (metade laranja, metade roxa) que chega de um jogo antigo vira esta.
   Só desenho: a física, o alcance e a força do chute não mudam.
   ====================================================================================================================== */
const V95S = {verde:'#3ee06c', anel:.42, borda:.9, sombra:.16};
TP.livres.add(TP_PADRAO_COD); TP_TIME_COD.forEach(c => TP.livres.add(c));   // (a inicial é de todo mundo: o Tricolor dela não cobra)

/* ---------------------------------------------------------------- a tampinha inicial (as listras) */
const V95_TIME_V80 = new Map([[TP_PADRAO_V80COD, TP_PADRAO_COD], [TP_TIME_V80[0], TP_TIME_COD[0]], [TP_TIME_V80[1], TP_TIME_COD[1]]]);
const tpSkinAntes95 = tpSkin;
tpSkin = function(cod){ return tpSkinAntes95.call(this, V95_TIME_V80.get(cod) || cod); };   // (a da v80, de um jogo antigo, vira a nova)
const tpNoTimeAntes95 = tpNoTime;
tpNoTime = function(cod, t){ return tpNoTimeAntes95.call(this, cod === TP_PADRAO_V80COD ? TP_PADRAO_COD : cod, t); };
const tpNoTimeSkAntes95 = tpNoTimeSk;
tpNoTimeSk = function(sk, t){ if (sk && sk.id === TP_PADRAO_V80COD) sk = tpSkin(TP_PADRAO_COD) || sk; return tpNoTimeSkAntes95.call(this, sk, t); };
function v95EhInicial(cod){                              // a inicial (de qualquer versão) ou a de um time dela?
  return !cod || cod === TP_PADRAO_COD || cod === TP_PADRAO_V80COD || cod === TP_PADRAO_PB || TP_TIME_COD.indexOf(cod) >= 0 || TP_TIME_V80.indexOf(cod) >= 0;
}
const V95_TAMPA_COR = new Map();
function v95TampaDaCor(cor){                             // a inicial com uma cor dos lados (a Oficina: a cor do time do mapa)
  const k = tpHex(cor, '#f5c542'); let c = V95_TAMPA_COR.get(k);
  if (!c){ c = tpCodigo(TP_PADRAO_V95(k, k)); if (V95_TAMPA_COR.size > 32) V95_TAMPA_COR.clear(); V95_TAMPA_COR.set(k, c); }
  return c;
}
try {                                                    // quem estava com a da v80 gravada passa para a nova
  if (TP.equipada && V95_TIME_V80.has(TP.equipada)){ TP.equipada = ''; tpSalva(); }
  if (V95_TIME_V80.has(perfil.skin)){ perfil.skin = tpMinha(); perfilSalvar(); }
} catch (_) {}

/* ---------------------------------------------------------------- o sensor: o anel limpo e translúcido */
function v95SpriteAnel(cor, rpx){
  const re = rpx*AROV.ate, ri = rpx*Math.max(1.02, AROV.de - .02), m = Math.ceil(re + rpx*.12 + 3);
  const c = document.createElement('canvas'); c.width = c.height = 2*m;
  const g = c.getContext('2d');
  const anel = () => { g.beginPath(); g.arc(m, m, re, 0, TAU); g.arc(m, m, ri, 0, TAU, true); };
  g.save(); g.translate(0, rpx*.06); anel(); g.fillStyle = 'rgba(4,8,16,' + V95S.sombra + ')'; g.fill(); g.restore();   // (a sombra leve: o anel "deita" no chão)
  anel(); g.fillStyle = corRgba(cor, V95S.anel); g.fill();
  let w = Math.max(1, rpx*.05);
  g.lineWidth = w; g.strokeStyle = corRgba(corMix(cor, '#ffffff', .32), V95S.borda);
  g.beginPath(); g.arc(m, m, re - w/2, 0, TAU); g.stroke();                       // (a borda de fora = o alcance do chute)
  w = Math.max(.75, rpx*.026);
  g.lineWidth = w; g.strokeStyle = corRgba(cor, .5);
  g.beginPath(); g.arc(m, m, ri + w/2, 0, TAU); g.stroke();
  return c;
}
const spriteHaloAntes95 = spriteHalo;
spriteHalo = function(cor, rpx, camada){                 // o anel parado ('p') é o novo; a carga ('c') continua a de antes
  if (camada !== 'p') return spriteHaloAntes95.apply(this, arguments);
  const key = cor + '|' + rpx + '|p95';
  let c = SPR_ARO.get(key);
  if (c) return c;
  if (SPR_ARO.size > 72) SPR_ARO.clear();
  c = v95SpriteAnel(cor, rpx);
  SPR_ARO.set(key, c);
  return c;
};
const SPR_TAG95 = new Map();
const spriteTagAntes95 = spriteTag;
spriteTag = function(cor, rpx, k){                       // a ponta (para onde está virado): um bico pequeno na cor do anel
  const key = cor + '|' + rpx + '|' + AROV.ate;
  let v = SPR_TAG95.get(key);
  if (!v){ if (SPR_TAG95.size > 16) SPR_TAG95.clear(); v = new Array(HALO.dirs); SPR_TAG95.set(key, v); }
  if (v[k]) return v[k];
  const re = rpx*AROV.ate, a = k/HALO.dirs*TAU, dc = re + rpx*.12, lado = Math.ceil(rpx*.78) + 2, h = lado/2;
  const c = document.createElement('canvas'); c.width = c.height = lado; c.dc = dc;
  const t = c.getContext('2d');
  t.translate(h - Math.cos(a)*dc, h - Math.sin(a)*dc); t.rotate(a);   // ((0, 0) = o centro do jogador, a ponta para a direita)
  const x0 = re + rpx*.01, x1 = re + rpx*.3, b = rpx*.17;
  t.beginPath(); t.moveTo(x1, 0); t.lineTo(x0, -b); t.lineTo(x0 + rpx*.07, 0); t.lineTo(x0, b); t.closePath();
  t.lineJoin = 'round'; t.lineWidth = Math.max(1, rpx*.05); t.strokeStyle = 'rgba(6,8,16,.38)'; t.stroke();
  t.fillStyle = corRgba(corMix(cor, '#ffffff', .18), .92); t.fill();
  return v[k] = c;
};
// o SEU anel é verde (o de quem você controla, ao vivo: no replay e assistindo, todos na cor do time)
function v95EuNoCampo(q){
  if (q !== P || RP.ativo || P.humano === false) return false;
  try { if (NET49.playing && NET49.localSlot < 0) return false; } catch (_) {}
  return true;
}
const V95SQ = {q:null};
const aroDeAntes95 = aroDe;
aroDe = function(g, q){ const o = V95SQ.q; V95SQ.q = q; try { return aroDeAntes95.apply(this, arguments); } finally { V95SQ.q = o; } };
/* ---------------------------------------------------------------- o sensor apertado: o BRANCO FORTE (o pedido: "quando é clicado fica
   um branco mais forte e some rapidamente; porém, se o player segurar, ele fica esse branco mais forte")
   · Apertou o PASSE ou o CHUTE: o anel acende num branco forte na hora. Segurando, ele fica branco (no CHUTE um pouco mais
     forte que no PASSE). Soltou — ou foi só um toque —, o branco some rápido (~0,22 s). No lugar da carga girando de antes.
   · Vale para você (o botão de verdade, o toque rápido também) e, online, para os outros (o botão de cada um vem no quadro
     do servidor); os bots e quem chuta sem a gente saber do botão (o replay) acendem no chute e apagam do mesmo jeito.
   Só desenho: o botão, o chute e a força não mudam. */
Object.assign(V95S, {passe:.86, some:220, segura:450});
function v95SpriteBranco(rpx){                               // o anel aceso: o mesmo anel, cheio de branco, com a borda de fora viva e um brilho curto
  const re = rpx*AROV.ate, ri = rpx*Math.max(1.02, AROV.de - .02), m = Math.ceil(re + rpx*.3 + 4);
  const c = document.createElement('canvas'); c.width = c.height = 2*m;
  const g = c.getContext('2d');
  const anel = () => { g.beginPath(); g.arc(m, m, re, 0, TAU); g.arc(m, m, ri, 0, TAU, true); };
  g.save(); g.shadowColor = 'rgba(255,255,255,.85)'; g.shadowBlur = Math.max(2, rpx*.22);
  anel(); g.fillStyle = 'rgba(255,255,255,.84)'; g.fill(); g.restore();
  const w = Math.max(1, rpx*.06);
  g.lineWidth = w; g.strokeStyle = '#ffffff'; g.beginPath(); g.arc(m, m, re - w/2, 0, TAU); g.stroke();
  g.lineWidth = Math.max(.75, rpx*.03); g.strokeStyle = 'rgba(255,255,255,.95)'; g.beginPath(); g.arc(m, m, ri + g.lineWidth/2, 0, TAU); g.stroke();
  return c;
}
function v95SpriteBrancoDe(rpx){
  const key = 'w|' + rpx + '|b95'; let c = SPR_ARO.get(key);
  if (!c){ if (SPR_ARO.size > 72) SPR_ARO.clear(); c = v95SpriteBranco(rpx); SPR_ARO.set(key, c); }
  return c;
}
function v95BotaoEu(){                                       // o seu botão agora: 3 = CHUTE, 2 = PASSE, 1 = solto (o dedo, o teclado ou o mouse)
  let b = 1;
  try { if (kickSegurado()) b = 2; if (powerSegurado()) b = 3; } catch (_) {}
  try { if (BOTAO.estado === 2 || BOTAO.estado === 3) b = Math.max(b, BOTAO.estado); } catch (_) {}
  return b;
}
function v95MarcaToque(){                                    // o toque rápido (apertou e soltou entre dois quadros): acende do mesmo jeito
  try { if (BOTAO.kickL || BOTAO.powerL){ P.v95B = performance.now(); P.v95F = BOTAO.powerL ? 1 : V95S.passe; } } catch (_) {}
}
function v95Aperto(q, luz){                                  // a força do branco (0 a 1) no anel de q agora
  if (!q) return luz > 0 ? 1 : 0;
  const agora = performance.now();
  let b = 1;
  if (q === P && !RP.ativo && P.humano !== false && !(NET49.playing && NET49.localSlot < 0)) b = v95BotaoEu();
  else if (q.v95Bt > 1 && agora - (q.v95BtT || 0) < V95S.segura) b = q.v95Bt;        // (online: o botão de cada um, no quadro do servidor)
  if (b > 1){ const f = b === 3 ? 1 : V95S.passe; q.v95B = agora; q.v95F = f; return f; }
  if (luz > 0 && !(agora - (q.v95B || -1e9) < 40)){ q.v95B = agora; q.v95F = 1; }   // (o chute que saiu: acende e apaga)
  const d = agora - (q.v95B || -1e9);
  if (!(d < V95S.some)) return 0;
  const k = 1 - d/V95S.some;
  return (q.v95F || 1)*k*k;
}
const aroJogAntes95 = aroJog;
aroJog = function(g, x, y, r, cor, ang, luz, giro, semTag){
  const q = V95SQ.q;
  if (q && v95EuNoCampo(q)) cor = V95S.verde;                // (só o desenho: o respingo e o rastro continuam na cor do time)
  const w = v95Aperto(q, luz);
  const v = aroJogAntes95.call(this, g, x, y, r, cor, ang, 0, giro, semTag);   // (sem a carga girando: o branco fica no lugar dela)
  if (w > .01){
    try {
      const rpx = tamPronto(r*K*cam.z), c = v95SpriteBrancoDe(rpx), m = c.width/2*r/rpx, a0 = g.globalAlpha;
      g.globalAlpha = a0*Math.min(1, w)*(V95S.luz || 1); g.drawImage(c, x - m, y - m, 2*m, 2*m); g.globalAlpha = a0;   // (v96: V95S.luz, o branco suave)
    } catch (_) {}
  }
  return v;
};
const amostraBotoesAntes95 = amostraBotoes;
amostraBotoes = function(){ v95MarcaToque(); return amostraBotoesAntes95.apply(this, arguments); };
if (typeof v92Comando === 'function'){ const v92ComandoAntes95 = v92Comando; v92Comando = function(){ v95MarcaToque(); return v92ComandoAntes95.apply(this, arguments); }; }
if (typeof ofjComando === 'function'){ const ofjComandoAntes95 = ofjComando; ofjComando = function(){ v95MarcaToque(); return ofjComandoAntes95.apply(this, arguments); }; }
const net49SnapshotAntes95s = net49Snapshot;
net49Snapshot = function(s){                                 // o botão de cada um no quadro do servidor (os 2 bits de baixo: 1 solto, 2 PASSE, 3 CHUTE)
  const r = net49SnapshotAntes95s.apply(this, arguments);
  try {
    if (s && Array.isArray(s.players) && Array.isArray(RQ.jog)){
      const agora = performance.now();
      s.players.forEach((v, i) => { const q = RQ.jog[i]; if (q && Array.isArray(v) && typeof v[7] === 'number'){ q.v95Bt = (v[7] & 3) || 1; q.v95BtT = agora; } });
    }
  } catch (_) {}
  return r;
};
// a Oficina desenha o próprio anel (tools/oficina/desenho.js): a mesma regra, pelo botão que vem no quadro (q.btn) e pelo chute
function v95ApertoOfi(q, eu){
  if (!q) return 0;
  const agora = performance.now();
  if (Number.isFinite(q.chuteT) && q.v95Ct !== q.chuteT){ if (q.v95Ct != null){ q.v95B = agora; q.v95F = 1; } q.v95Ct = q.chuteT; }
  let b = 1;
  if (eu){ b = v95BotaoEu(); try { if (P.v95B > (q.v95B || -1e9)){ q.v95B = P.v95B; q.v95F = P.v95F; } } catch (_) {} }
  else if (typeof q.btn === 'number') b = (q.btn & 3) || 1;
  if (b > 1){ const f = b === 3 ? 1 : V95S.passe; q.v95B = agora; q.v95F = f; return f; }
  const d = agora - (q.v95B || -1e9);
  if (!(d < V95S.some)) return 0;
  const k = 1 - d/V95S.some;
  return (q.v95F || 1)*k*k;
}
try { SPR_ARO.clear(); } catch (_) {}
window.RachaTimes95 = {
  verde:() => V95S.verde, inicial:() => TP_PADRAO_COD, doTime:t => TP_TIME_COD[t ? 1 : 0], daCor:v95TampaDaCor, ehInicial:v95EhInicial,
  antiga:() => TP_PADRAO_V80COD, desenho:cod => tpLe(cod), anel:(cor, rpx) => v95SpriteAnel(cor, rpx),
  branco:rpx => v95SpriteBranco(rpx), aperto:(q, luz) => v95Aperto(q, luz || 0), regra:() => ({passe:V95S.passe, some:V95S.some})
};
