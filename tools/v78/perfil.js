/* ======================================================================================================================
   RACHA rua v78 · O PERFIL MAIS FÁCIL DE ENTENDER E A TAMPINHA MAIOR (o pedido: "faça um perfil mais fácil de entender porém
   com a mesma ideia e a tampinha maior na tela" · "as tampinhas maiores eu quero só no lobby, não no jogo em si").
   Qual implementação valia: o perfil da v77 (tools/v77/telas.js: v77PfMonta, a VISÃO GERAL com 3 cartões e 5 números; o palco
   pintaPalcoPerfil com a tampinha reta) e o lobby da v77 (tools/v77/lobby.js: pintaBrilho com R = EMB.R × V77L.esc e o centro em
   RUA_LOBBY.layout). A v78 embrulha os dois, sem apagar nada:
   · LOBBY: a tampinha do meio maior (1,4×), um pouco mais para baixo (o letreiro continua inteiro em cima dela);
   · PERFIL › VISÃO GERAL: a mesma ideia (a tampinha na quadra à esquerda e o cartão à direita), com menos coisa e mais clara:
     o nível escrito por extenso com quanto falta para o próximo, 4 números grandes com o nome inteiro (PARTIDAS, VITÓRIAS, GOLS,
     ASSISTÊNCIAS), uma frase que explica o seu momento ("Você ganhou 5 de 9 partidas…") e a sua frase (a bio) inteira;
   · a tampinha do perfil maior (1,4×).
   Na partida nada muda: o tamanho da tampinha em campo é o da física (igual para todo mundo).
   ====================================================================================================================== */
const V78P = {feito:false, esc:1.15, cy:.655};

/* ---- o lobby: a tampinha maior ---- */
(function(){
  if (typeof V77L === 'undefined' || !V77L.on) return;
  V77L.esc = V78P.esc;                                       // (era 0,82: 1,4× maior)
  if (window.RUA_LOBBY && typeof RUA_LOBBY.layout === 'function'){
    const layoutAntes78 = RUA_LOBBY.layout;
    RUA_LOBBY.layout = function(P, palco){
      const r = layoutAntes78.apply(this, arguments);
      try { if (V77L.on && !LB.raiz.classList.contains('retrato')){ P.cy = Math.round(P.h*V78P.cy); palco.style.setProperty('--rx-cy', P.cy + 'px'); } } catch (_) {}
      return r;
    };
  }
  try { LB.fundo.dataset.k = ''; } catch (_) {}
})();

/* ---- o perfil: a tampinha maior no palco ---- */
const pintaPalcoPerfilAntes78 = pintaPalcoPerfil;
pintaPalcoPerfil = function(t){
  if (typeof V77L === 'undefined' || !V77L.on || !V77T.pf) return pintaPalcoPerfilAntes78.apply(this, arguments);
  const box = PF.palcoBox, c = PF.palco, w = box.clientWidth, h = box.clientHeight;
  if (w < 20 || h < 20) return;
  const k = (PALCO.sc || PALCO.s)*(G().plano ? 0.75 : Math.min(window.devicePixelRatio || 1, 2)), key = w + 'x' + h + '@' + k.toFixed(3);
  if (c.dataset.k !== key){ c.style.width = w + 'px'; c.style.height = h + 'px'; c.width = Math.max(1, Math.round(w*k)); c.height = Math.max(1, Math.round(h*k)); c.dataset.k = key; }
  const g = c.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, c.width, c.height); g.setTransform(k, 0, 0, k, 0, 0);
  if (V77T.parte !== 'geral') return;                       // (nas outras abas o cartão cobre a tampinha)
  const sk = skinAtual(), R = Math.min(w*.42, h*.35, 220), x = w/2, y0 = h*.58, bob = Math.sin(t*1.7)*3, y = y0 + bob;   // (era min(w×0,3; h×0,25; 150))
  V78P.R = R;
  let gr = g.createRadialGradient(x, y0 + R*.9, 6, x, y0 + R*.9, R*2.2);
  gr.addColorStop(0, 'rgba(255,196,110,.16)'); gr.addColorStop(1, 'rgba(255,196,110,0)');
  g.fillStyle = gr; g.beginPath(); g.ellipse(x, y0 + R*.9, R*2.2, R*.55, 0, 0, TAU); g.fill();
  g.save(); g.translate(x + R*.06, y0 + R*.97); g.scale(1 - bob*.006, .2);
  gr = g.createRadialGradient(0, 0, 6, 0, 0, R*1.18); gr.addColorStop(0, 'rgba(4,4,8,.72)'); gr.addColorStop(.6, 'rgba(4,4,8,.42)'); gr.addColorStop(1, 'rgba(4,4,8,0)');
  g.fillStyle = gr; g.beginPath(); g.arc(0, 0, R*1.18, 0, TAU); g.fill(); g.restore();
  botaoPronto(g, x, y, R, sk, perfil.avatar, {t, bx:null, by:null, id:0, humor:''}, k);
};

/* ---- o perfil: a VISÃO GERAL mais clara ---- */
function v78PfMonta(){
  const P = V77T.pf; if (!P || V78P.feito) return !!P;
  const geral = P.geral, cards = geral.querySelector('.v77-pf-cards'), nums = geral.querySelector('.v77-pf-nums');
  geral.classList.add('v78-pf');
  // os 4 números grandes, com o nome inteiro (o aproveitamento vira a frase)
  const num4 = nodo('div', 'v78-pf-num4'); num4.setAttribute('role', 'list'); num4.setAttribute('aria-label', 'Seus números');
  for (const sid of ['st-partidas', 'st-vitorias', 'st-gols', 'st-assist']){
    const b = $(sid), st = b && b.closest('.pf-st'); if (!st) continue;
    st.classList.add('v78-st'); st.setAttribute('role', 'listitem'); num4.appendChild(st);
  }
  const ap = $('st-aprov'), apSt = ap && ap.closest('.pf-st'); if (apSt){ apSt.hidden = true; apSt.classList.add('v78-escondido'); geral.appendChild(apSt); }
  // a frase do seu momento
  const frase = nodo('p', 'v78-pf-frase'); frase.setAttribute('aria-live', 'polite');
  // a sua frase (a bio), inteira, numa linha só do cartão
  const bio = cards && cards.querySelector('.v77-pf-bio');
  if (bio){ bio.classList.add('v78-pf-bio'); const s = bio.querySelector('.v77-pf-card-cab small'); if (s) s.textContent = 'SUA BIO'; }
  for (const c of cards ? cards.querySelectorAll('.v77-pf-tempo, .v77-pf-seq') : []){ c.hidden = true; c.classList.add('v78-escondido'); }
  geral.textContent = '';
  geral.append(num4, frase);
  if (bio) geral.appendChild(bio);
  if (cards){ cards.hidden = true; geral.appendChild(cards); }
  if (nums){ nums.hidden = true; geral.appendChild(nums); }
  if (apSt) geral.appendChild(apSt);
  V78P.frase = frase; V78P.num4 = num4; V78P.feito = true;
  return true;
}
function v78Plural(n, um, varios){ return fmtNum(n) + ' ' + (n === 1 ? um : varios); }
function v78PfFrase(){                                        // uma frase só, em português de gente, com os números de verdade
  const f = V78P.frase; if (!f) return;
  const st = perfil.st || {}, jog = Math.max(0, Number($('st-partidas') && $('st-partidas').textContent.replace(/\D/g, '')) || 0);
  const vit = Math.max(0, Number($('st-vitorias') && $('st-vitorias').textContent.replace(/\D/g, '')) || 0);
  const gols = Math.max(0, Number($('st-gols') && $('st-gols').textContent.replace(/\D/g, '')) || 0);
  const seq = X49.bestSeq || 0;
  f.textContent = '';
  if (!jog){ f.append('Você ainda não jogou. Toque em ', nodo('b', null, 'JOGAR'), ': cada partida dá XP para subir de nível e moedas para a loja.'); return; }
  const pct = Math.round(100*vit/jog);
  f.append('Você ganhou ', nodo('b', null, fmtNum(vit) + ' de ' + v78Plural(jog, 'partida', 'partidas')), ' (' + pct + '%) e fez ', nodo('b', null, v78Plural(gols, 'gol', 'gols')), '.');
  if (seq >= 2) f.append(' Melhor sequência: ', nodo('b', null, seq + ' vitórias seguidas'), '.');
}
function v78PfNivel(){                                        // o nível por extenso e quanto falta para o próximo
  const P = V77T.pf; if (!P) return;
  const nv = nivelInfo(CONTA.xp), xt = $('pf-xp-tx'), falta = Math.max(0, nv.prox - nv.atual);
  if (xt) xt.textContent = 'NÍVEL ' + nv.n + ' · FALTAM ' + fmtNum(falta) + ' XP PARA O ' + (nv.n + 1);
  const bar = P.id.querySelector('.pf-xp'); if (bar) bar.setAttribute('aria-label', 'Nível ' + nv.n + ': ' + fmtNum(nv.atual) + ' de ' + fmtNum(nv.prox) + ' XP; faltam ' + fmtNum(falta) + ' para o nível ' + (nv.n + 1));
  const sel = P.id.querySelector('.pf-ident'); if (sel){ const conta = sel.classList.contains('conta'); sel.textContent = conta ? 'CONTA' : 'NESTE APARELHO'; sel.title = conta ? 'O seu perfil está na sua conta' : 'O seu perfil fica guardado neste aparelho'; }
  const idr = P.id.querySelector('.v77-pf-idrot'); if (idr) idr.textContent = 'SEU ID:';
}
const renderPerfilAntes78 = renderPerfil;
renderPerfil = function(){
  const r = renderPerfilAntes78.apply(this, arguments);
  try {
    if (typeof V77L === 'undefined' || !V77L.on || !V77T.pf) return r;
    v78PfMonta();
    for (const [sid, nome] of [['st-partidas', 'PARTIDAS'], ['st-vitorias', 'VITÓRIAS'], ['st-gols', 'GOLS'], ['st-assist', 'ASSISTÊNCIAS']]){
      const el = $(sid) && $(sid).nextElementSibling; if (el && el.textContent !== nome) el.textContent = nome;
    }
    v78PfNivel(); v78PfFrase();
  } catch (e) { window.RUA_PERFIL78_ERRO = String(e && e.stack); }
  return r;
};
