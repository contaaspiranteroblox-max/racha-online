/* ======================================================================================================================
   RACHA rua v77 · as peças tiradas das imagens enviadas do LOBBY e do PERFIL (tools/v77/pecas.py): o fundo do lobby limpo
   (a quadra no morro com o Rio no fim de tarde, sem os botões), o letreiro RACHA com a coroa e a faixa FUTEBOL DE RUA, os
   ícones dos botões e o banner do perfil. O build embute as imagens aqui (o jogo continua um arquivo que funciona sem
   internet). Se uma delas não abrir, cada parte cai no desenho de antes (o fundo da v75, o RACHA escrito, os desenhos da v71).
   ====================================================================================================================== */
const V77P = {fundo:/*FUNDO77*/null, letreiro:/*LETREIRO77*/null, icones:/*ICONES77*/null, banner:/*BANNER77*/null};
const V77 = {img:{}, ok:{}, depois:{}};
function v77Abre(nome){                                     // abre uma imagem embutida; quem precisa dela se inscreve em V77.depois[nome]
  const d = V77P[nome]; if (!d || !d.src || V77.img[nome]) return V77.img[nome] || null;
  const im = new Image(); V77.img[nome] = im;
  const pronto = () => { V77.ok[nome] = true; for (const f of V77.depois[nome] || []) try { f(); } catch (_) {} };
  im.onload = pronto;
  im.onerror = () => { V77.ok[nome] = false; window.RUA_V77_ERRO = (window.RUA_V77_ERRO || '') + nome + ' não abriu; '; };
  im.src = d.src;
  if (im.complete && im.naturalWidth) V77.ok[nome] = true;
  return im;
}
function v77Quando(nome, f){ (V77.depois[nome] = V77.depois[nome] || []).push(f); if (V77.ok[nome]) try { f(); } catch (_) {} }
for (const n of ['fundo', 'letreiro', 'icones', 'banner']) v77Abre(n);

/* ---- os ícones: um recorte da folha (icones.webp) do tamanho pedido, como fundo de um <i> (nítido em qualquer escala) */
const V77IC = V77P.icones && V77P.icones.p ? V77P.icones : null;
if (V77IC) document.documentElement.style.setProperty('--v77-ic', 'url("' + V77IC.src + '")');
function v77Ic(nome, w, h, cls){                            // cabe em w × h (px do lugar onde vai), sem deformar
  const i = document.createElement('i'); i.className = 'v77-ic' + (cls ? ' ' + cls : ''); i.setAttribute('aria-hidden', 'true');
  const p = V77IC && V77IC.p[nome]; if (!p) return i;
  const k = Math.min(w/p[2], (h || w)/p[3]);
  i.dataset.ic = nome;
  i.style.width = (p[2]*k).toFixed(2) + 'px'; i.style.height = (p[3]*k).toFixed(2) + 'px';
  i.style.backgroundSize = (V77IC.w*k).toFixed(2) + 'px ' + (V77IC.h*k).toFixed(2) + 'px';
  i.style.backgroundPosition = (-p[0]*k).toFixed(2) + 'px ' + (-p[1]*k).toFixed(2) + 'px';
  return i;
}
// a moeda e a gema de todo o jogo (.ic-moeda, .ic-gema: 1,25em) viram as das imagens — uma moeda só e uma gema só, em todo lugar
(function v77Moedas(){
  if (!V77IC) return;
  const css = [];
  for (const [cls, nome] of [['ic-moeda', 'moeda'], ['ic-gema', 'gema']]){
    const p = V77IC.p[nome]; if (!p) continue;
    const L = 1.25/Math.max(p[2], p[3]);                   // em por px da folha
    const ox = (Math.max(p[2], p[3]) - p[2])/2*L, oy = (Math.max(p[2], p[3]) - p[3])/2*L;
    css.push('.' + cls + '{ background:var(--v77-ic) no-repeat ' + (ox - p[0]*L).toFixed(4) + 'em ' + (oy - p[1]*L).toFixed(4) + 'em / ' + (V77IC.w*L).toFixed(4) + 'em ' + (V77IC.h*L).toFixed(4) + 'em !important;'
      + ' box-shadow:none !important; border-radius:0 !important; }', '.' + cls + '::after{ content:none !important; display:none !important; }');
  }
  const st = document.createElement('style'); st.id = 'v77-moedas'; st.textContent = css.join('\n'); document.head.appendChild(st);
})();
