/* ======================================================================================================================
   RACHA v105 · O CHAT NA TELA DO LOBBY (a barra da partida, embaixo, no meio)
   O pedido (04/11/2026): "quero um chat visível na tela do lobby igual o dentro da partida lá em baixo".
   A barra da partida é a do chat da v81 (#cb: a etiqueta, NOME: a última mensagem, o número das não lidas e o ^) — o mesmo nó
   muda de lugar sozinho (o menu, as telas, a sala, a partida). No lobby ela existia desde a v81, mas a v90 a guardou (o lobby
   novo não tinha vão para ela) e, desde a v102, o chat ficou só no MENU. Agora ela volta para a tela inicial com a cara da
   da partida (o grafite meio transparente) e o Chat do Brasil:
     · o lugar: embaixo, no vão entre a barra de atalhos (SALAS, TREINO, OFICINA, COFRE) e o JOGAR, embaixo da tampinha (centrada
       nela quando dá), sem encostar em nada; nos apertados (o iPhone com o entalhe e a barra de baixo, o 800 × 336), logo em
       cima da barra de atalhos; medido só quando o lobby muda de tamanho (o lbLayout e o ResizeObserver das peças em volta) —
       nada por quadro; sem lugar nenhum, ela não aparece e o chat continua no MENU;
     · no celular, nunca menos de 40 px de verdade de altura (a etiqueta vira só a bandeira quando a barra fica estreita);
     · o que aparece e o que acontece ao tocar são os da v81: a mensagem nova troca o texto na hora (com o número das não
       lidas), tocar abre o painel (as mensagens recentes, o campo e o ENVIAR; o quadrado de cima abre o Chat do Brasil inteiro)
       e minimizar volta para a barra; o nome abre a ficha (VER PERFIL da v88/v103 para quem tem conta);
     · sem servidor (ou com a chave "Chat na tela" desligada) ela não aparece, como antes; com o servidor fora do ar, diz
       "Chat do Brasil fora do ar"; com o Chat do Brasil desligado nos Ajustes (logado, a barra fica pelos amigos e o clube),
       diz isso;
     · a janela que abre por cima do lobby (o VER PERFIL, o BLOQUEAR…) fecha o painel do chat antes: o painel fica por cima de
       todo o lobby e a janela ficava escondida atrás dele.
   Na partida a barra é a de sempre (a da v81, embaixo do campo); o lobby fechado leva a barra junto (nada por cima do HUD).
   Nada da partida, da física, da rede ou da conta muda.
   ====================================================================================================================== */
const V105C = {raf:0, ro:null, vistos:new Set(), sujo:true, medidas:0, pos:null};
const V105C_MARGEM = 16;      // (no palco) entre a barra e a barra de atalhos, o MODO e o JOGAR
const V105C_ACIMA = 10;       // (no palco) entre a barra e a tampinha (ou a vaga do grupo) em cima
const V105C_ALTURA = 56;      // a altura da barra da partida (.c81-jogo), no palco
const V105C_LARGURA = 600;    // a largura máxima (a da barra do menu da v81), no palco
const V105C_MIN_REAL = 40;    // a altura mínima de verdade (px da tela): o dedo e a leitura no celular
const V105C_MIN_LARG = 150;   // abaixo disso (px da tela) não tem lugar

function v105ChatPode(){            // o lobby da v102, deitado (em pé fica o lobby de antes, sem a barra)
  try { return typeof V102L !== 'undefined' && V102L.on && !!V102L.doca && !LB.raiz.classList.contains('retrato'); } catch (_) { return false; }
}
function v105Agenda(){ V105C.sujo = true; if (!V105C.raf) V105C.raf = requestAnimationFrame(v105Mede); }
function v105Observa(els){      // o tamanho das peças em volta (a barra de atalhos ganha ou perde um botão, o grupo, o MODO)
  if (typeof ResizeObserver !== 'function') return;
  if (!V105C.ro) V105C.ro = new ResizeObserver(() => v105Agenda());
  for (const e of els) if (e && !V105C.vistos.has(e)){ V105C.vistos.add(e); V105C.ro.observe(e); }
}
function v105Solta(p){          // sem lugar: a barra não aparece no lobby (a v90 a guarda) e o chat continua no MENU
  p.classList.remove('v105-chat', 'v105-curta', 'v105-meio');
  document.documentElement.style.removeProperty('--v105-cb-topo');
  V105C.pos = {lugar:false};
}

/* ---------------------------------------------------------------- 1) o lugar (medido quando o lobby muda de tamanho) */
function v105Mede(){
  V105C.raf = 0;
  const p = LB.palco;
  if (!p || !lobby.aberto || LB.raiz.hidden) return;                  // (o lobby fechado: mede de novo quando ele abrir)
  if (!v105ChatPode()){ v105Solta(p); V105C.sujo = false; return; }
  const pr = p.getBoundingClientRect(), s = PALCO.s || 1;
  if (pr.width < 2 || pr.height < 2) return;                          // (o palco escondido por uma tela: fica para depois)
  const caixa = e => {
    if (!e || e.hidden || e.closest('[hidden]')) return null;
    const r = e.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return null;
    return {l:(r.left - pr.left)/s, t:(r.top - pr.top)/s, r:(r.right - pr.left)/s, b:(r.bottom - pr.top)/s};
  };
  const vagas = Array.from(LB.palco.querySelectorAll('.v101-vaga')), topo = LB.palco.querySelector('.lb-topo');
  v105Observa([V102L.doca, LB.jogar, LB.modo, LB.emblema].concat(vagas));
  const d = caixa(V102L.doca), j = caixa(LB.jogar), m = caixa(LB.modo), e = caixa(LB.emblema), t = caixa(topo);
  if (!d || !j || !e) return;                                         // (ainda montando: o próximo lbLayout mede)
  V105C.medidas++; V105C.sujo = false;
  const W = pr.width/s, H = pr.height/s;                              // (o palco, em px do palco)
  // o que a barra não pode cobrir: a barra de atalhos, o JOGAR, o MODO, a tampinha, a barra de cima e as vagas do grupo (com
  // o GRUPO escrito embaixo delas)
  const obst = [d, j, e].concat(m ? [m] : [], t ? [t] : []);
  for (const v of vagas){ const c = caixa(v); if (c) obst.push({l:c.l, t:c.t, r:c.r, b:c.b + (c.b - c.t)*.55}); }
  const livre = q => q.l >= 0 && q.t >= 0 && q.r <= W && q.b <= H && !obst.some(o => q.l < o.r + 8 && q.r > o.l - 8 && q.t < o.b + 8 && q.b > o.t - 8);
  // a altura: a da barra da partida, nunca menos de 40 px de verdade (o celular deitado encolhe o palco a 0,42)
  const k0 = Math.max(1, Math.min(1.8, V105C_MIN_REAL/(V105C_ALTURA*s)));
  let q = null;
  // 1º) embaixo, no meio: entre a barra de atalhos e o JOGAR (e o MODO, em cima dele), embaixo da tampinha (centrada nela
  //     quando dá), na linha de baixo dos atalhos; apertada, encolhe até 34 px de verdade antes de desistir daqui
  {
    const esq = d.r + V105C_MARGEM, dir = Math.min(j.l, m ? m.l : j.l) - V105C_MARGEM, larg = Math.min(V105C_LARGURA*k0, dir - esq);
    if (larg*s >= V105C_MIN_LARG){
      const cx = Math.max(esq + larg/2, Math.min(dir - larg/2, (e.l + e.r)/2)), x0 = cx - larg/2, x1 = cx + larg/2;
      let teto = e.b;
      for (const o of obst) if (o !== d && o !== j && o !== m && o !== t && o.r > x0 && o.l < x1 && o.b < d.b) teto = Math.max(teto, o.b);
      const k = Math.min(k0, (d.b - teto - V105C_ACIMA)/V105C_ALTURA);
      const c = {l:x0, r:x1, b:d.b, t:d.b - V105C_ALTURA*k, k, onde:'meio'};
      if (V105C_ALTURA*k*s >= 34 && livre(c)) q = c;
    }
  }
  // 2º) sem lugar embaixo da tampinha (o iPhone com o entalhe e a barra de baixo, o 800 × 336) ou apertada demais lá (menos de
  //     200 px de verdade, o 568 × 320): em cima da barra de atalhos, da largura dela, à esquerda da tampinha (se for mais larga)
  if (!q || (q.r - q.l)*s < 200){
    const x0 = d.l, b = d.t - 12, t0 = b - V105C_ALTURA*k0;
    let x1 = Math.min(d.r, d.l + V105C_LARGURA*k0, e.l - V105C_MARGEM);
    for (const o of obst) if (o !== d && o.t < b + 8 && o.b > t0 - 8 && o.r > x0 && o.l < x1) x1 = Math.min(x1, o.l - V105C_MARGEM);   // (o amigo do grupo do lado: ela encurta)
    const c = {l:x0, r:x1, b, t:t0, k:k0, onde:'atalhos'};
    if ((x1 - x0)*s >= V105C_MIN_LARG && livre(c) && (!q || x1 - x0 > q.r - q.l)) q = c;
  }
  if (!q) return v105Solta(p);
  const larg = q.r - q.l, curta = larg < 430*q.k;
  p.style.setProperty('--v105-x', q.l.toFixed(1) + 'px');
  p.style.setProperty('--v105-w', larg.toFixed(1) + 'px');
  p.style.setProperty('--v105-b', (H - q.b).toFixed(1) + 'px');
  p.style.setProperty('--v105-k', q.k.toFixed(4));
  p.classList.toggle('v105-curta', curta); p.classList.toggle('v105-meio', q.onde === 'meio');
  p.classList.add('v105-chat');
  // o aviso de baixo (x49Toast, no meio) sobe para não cobrir a barra do meio (em px da tela, da beirada de baixo até o topo dela)
  if (q.onde === 'meio') document.documentElement.style.setProperty('--v105-cb-topo', Math.round(innerHeight - (pr.top + q.t*s)) + 'px');
  else document.documentElement.style.removeProperty('--v105-cb-topo');
  V105C.pos = {lugar:true, onde:q.onde, x:Math.round(q.l), w:Math.round(larg), base:Math.round(q.b), alto:Math.round(q.b - q.t), k:+q.k.toFixed(3), curta, s:+s.toFixed(4)};
}

/* ---------------------------------------------------------------- 2) os ganchos (todos por evento: nada por quadro) */
// o lobby mudou de tamanho (a janela, a tela cheia, girar o aparelho, o Tamanho da interface, abrir o lobby)
const lbLayoutAntes105 = lbLayout;
lbLayout = function(){ const r = lbLayoutAntes105.apply(this, arguments); try { v105Agenda(); } catch (_) {} return r; };
// a v81 media o vão da fileira de baixo de novo a cada segundo enquanto a barra estava no lobby (no lobby da v102 a medida
// dela não acha o vão e só limpava o estilo): no lobby da v102 quem põe a barra no lugar é a v105, só quando muda
const c81LobbyAjustaAntes105 = c81LobbyAjusta;
c81LobbyAjusta = function(){ if (v105ChatPode()) return; return c81LobbyAjustaAntes105.apply(this, arguments); };
// a barra: os textos da v81 (pela mensagem nova, pelo estado da conexão e quando ela muda de lugar); ao chegar no lobby com a
// medida velha (o lobby mudou de tamanho com uma tela aberta), mede de novo
const cbPintaAntes105 = cbPinta;
cbPinta = function(){
  const r = cbPintaAntes105.apply(this, arguments);
  try {
    if (CB.el && CB.onde === 'lobby'){
      if (V105C.sujo && !V105C.raf) v105Agenda();
      // logado, a barra fica pelos amigos e o clube mesmo com o Chat do Brasil desligado nos Ajustes: diz isso (não "fora do ar")
      if (!brasilLigado() && !c81Ultima()){ CB.msg.textContent = ''; CB.msg.appendChild(nodo('i', null, 'Chat do Brasil desligado nos Ajustes')); }
    }
  } catch (_) {}
  return r;
};
// desligar o Chat do Brasil nos Ajustes (logado, a barra continua pelos amigos e o clube): a barra troca na hora
const brasilDesligaAntes105 = brasilDesliga;
brasilDesliga = function(){ const r = brasilDesligaAntes105.apply(this, arguments); try { cbPinta(); } catch (_) {} return r; };
// a janela por cima do lobby (o perfil do VER PERFIL, o BLOQUEAR, a denúncia…): o painel do chat fica por cima de todo o lobby
// (z-index 220 × 30) e a janela ficava escondida atrás dele — o painel fecha antes (a barra continua embaixo). Vale também
// para o perfil que a v103 abre por cima da partida (a camada .v103-pop-jogo); uma janela que abre com o lobby escondido
// (a partida) não mexe no chat
const abrePopAntes105 = abrePop;
abrePop = function(){
  try { if (CB.aberto && (lobby.aberto || LB.raiz.classList.contains('v103-pop-jogo'))) cbFecha(); } catch (_) {}
  return abrePopAntes105.apply(this, arguments);
};

try { v105Agenda(); } catch (e) { console.error('v105 chat', e); }
window.RachaChatLobby105 = {
  estado:() => ({pos:V105C.pos, medidas:V105C.medidas, sujo:V105C.sujo, onde:CB.onde, aberto:CB.aberto, pode:v105ChatPode(),
    visivel:!!CB.el && !CB.el.hidden && getComputedStyle(CB.el).display !== 'none'}),
  mede:() => { v105Mede(); return V105C.pos; }
};
