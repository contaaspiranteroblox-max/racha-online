/* ======================================================================================================================
   RACHA v105 · O TAMANHO DA BORDA (e a tampinha SEM BORDA)
   O pedido (05/11/2026): "crie uma função tamanho da borda, sem borda, na skin".
   No CRIAR TAMPINHA, na aba BORDA: o TAMANHO DA BORDA, com SEM · FINA · NORMAL · GROSSA (a NORMAL é a de sempre). Vale para
   toda borda — a BOTÃO, as de dentes, as acesas e com as caras animadas — e é grátis.
     · FINA e GROSSA: o desenho do meio cresce ou diminui e a borda em volta fica mais fina ou mais grossa (na BOTÃO, o aro
       branco com 4,5% ou 17% do raio, a normal com 9%; nas de dentes, o meio com 80% ou 66% do raio, o normal com 74%);
     · SEM BORDA: a tampinha fica só com o desenho, cheio até a beirada (do tamanho da BOTÃO), chapado — sem a saia, os dentes,
       o aro, o contorno, a luz e a animação do aro aceso (com uma cara animada, a cara ocupa a tampinha inteira).
   O código da tampinha leva o tamanho no FIM (2 bits, só quando não é a normal: tools/v105/borda.py troca o tpCodigo, o tpLe
   e o tpCopia): os códigos de sempre não mudam, e o jogo de antes (que para de ler antes do fim) mostra a mesma tampinha com
   a borda normal. O servidor das salas e a plataforma só olham o começo do código (a peça dos fundadores) e o tamanho (até 44
   letras) — o código mais comprido, com o tamanho, fica com 39. Só desenho: o tamanho da tampinha, o alcance e a física não
   mudam.
   ====================================================================================================================== */
// (as quatro abaixo são declarações: valem desde o começo do script — o tpTampa e o tpLe as chamam — e não dependem de nada
//  que é criado depois)
function tpBordaTam(D){ return D && D.k === 'T' ? (D.bt | 0) & 3 : 0; }   // 0 normal · 1 fina · 2 grossa · 3 sem borda
function tpSemBorda(D){ return tpBordaTam(D) === 3; }
function tpMiolo(D){ const k = tpBordaTam(D); return k === 1 ? .8 : k === 2 ? .66 : k === 3 ? .97 : .74; }   // o raio do meio nas bordas de dentes (e nas caras)
function tpSoDesenho(g, x, y, r, D, semente){                // SEM BORDA: o desenho cheio até a beirada (o raio de fora da BOTÃO)
  let cara = null;
  try { const A = typeof sk76Anim === 'function' ? sk76Anim(D) : null; cara = A && A.cara; } catch (_) {}
  if (cara){ sk76Cara(g, x, y, r, D, cara, cara.t0); return; }
  const R = r*.97;
  g.save(); g.beginPath(); g.arc(x, y, R, 0, TP_TAU); g.clip();
  tpPintaTampo(g, x, y, R, D, semente);
  g.restore();
}

// a saia (os dentes, o aro da BOTÃO, o aro aceso) não aparece SEM BORDA — em todo lugar que pinta a saia sozinha (a cara animada
// e a imagem pronta dela)
const tpSaiaAntes105b = tpSaia;
tpSaia = function(g, x, y, r, D){ if (tpSemBorda(D)) return; return tpSaiaAntes105b.apply(this, arguments); };
// o emoji em cima da tampinha cobre o meio dela (SEM BORDA: a tampinha inteira)
if (typeof emjRaio === 'function'){
  const emjRaioAntes105b = emjRaio;
  emjRaio = function(r, D){
    if (D && D.k !== 'E'){
      if (tpSemBorda(D)) return r*.97;
      if (tpBordaTam(D) && !(v102EhBotao(D) || v105DeFabrica(D))) return r*tpMiolo(D);
    }
    return emjRaioAntes105b.apply(this, arguments);
  };
}

/* ---------------------------------------------------------------- o editor: TAMANHO DA BORDA, na aba BORDA */
const V105_BT = [[3, 'SEM', 'Sem borda'], [1, 'FINA', 'Borda fina'], [0, 'NORMAL', 'Borda normal'], [2, 'GROSSA', 'Borda grossa']];
const V105_BT_NOME = ['', 'borda fina', 'borda grossa', 'sem borda'];
function v105BtPinta(){                                       // a escolhida acesa e a nota de baixo (sem borda: o que acontece)
  const E = ED.el; if (!E || !E.btSeg || !ED.D) return;
  const k = tpBordaTam(ED.D);
  for (const b of E.btSeg.children){ const on = +b.dataset.bt === k; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); }
  if (E.semGeo && ED.aba === 'b' && ED.modo === 'T' && k === 3) E.semGeo.textContent = 'Sem borda: a tampinha fica só com o desenho. Escolha um tamanho para a borda voltar.';
}
const tpeControlesAntes105b = tpeControles;
tpeControles = function(){
  const r = tpeControlesAntes105b.apply(this, arguments);
  try {
    const E = ED.el; E.btSeg = null;
    if (ED.aba === 'b' && ED.modo === 'T'){
      const bl = tpeBloco('tpe-btam', 'TAMANHO DA BORDA'), seg = nodo('div', 'tpe-seg tpe-btam-seg');
      seg.setAttribute('role', 'group'); seg.setAttribute('aria-label', 'Tamanho da borda');
      for (const [v, rot, nome] of V105_BT){ const b = novoBotao('tpe-op', nome); b.dataset.bt = String(v); b.textContent = rot; seg.appendChild(b); }
      bl.appendChild(seg);
      const cores = E.ctl.querySelector('.tpe-cores');
      if (cores) cores.insertAdjacentElement('afterend', bl); else E.ctl.prepend(bl);
      E.btSeg = seg;
      seg.addEventListener('click', e => {
        const b = e.target.closest('[data-bt]'); if (!b || !ED.D) return;
        const v = +b.dataset.bt; if (tpBordaTam(ED.D) === v) return;
        som.clique();
        tpeMuda(D => { D.bt = v; });
        tpeSincroniza(); tpeMinis();                           // (as miniaturas das bordas no tamanho novo)
      });
      v105BtPinta();
    }
  } catch (e) { console.error('v105 tamanho da borda', e); }
  return r;
};
const tpeSincronizaAntes105b = tpeSincroniza;
tpeSincroniza = function(){ const r = tpeSincronizaAntes105b.apply(this, arguments); try { v105BtPinta(); } catch (_) {} return r; };
const tpeDescreveAntes105b = tpeDescreve;                     // (o nome falado da tampinha grande: "… · borda fina")
tpeDescreve = function(D){ const s = tpeDescreveAntes105b.apply(this, arguments); const k = tpBordaTam(D); return k ? s + ' · ' + V105_BT_NOME[k] : s; };
window.RachaBorda105 = {tamanho:D => tpBordaTam(D), miolo:D => tpMiolo(D), nomes:V105_BT.map(x => x[1])};
