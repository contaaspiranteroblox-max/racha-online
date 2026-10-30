/* ==================================================================================================================
   RACHA v93 · Fase 1 — O TUTORIAL NO CELULAR: instruções curtas, organizadas e bem posicionadas
   Antes: o painel do passo era grande (até 40% da altura num celular pequeno), os recados ("ATRÁS DA BOLA: A MIRA ESTÁ NO
   GOL") eram desenhados no meio do campo — em cima da tampinha —, os seletores do treino (TAMANHO · CAMPO · TREINO)
   ficavam embaixo, entre o analógico e o CHUTE, e o aviso ARMADO ia sempre em cima do botão (onde fica o PASSE).
   Agora:
   1) os textos dos 5 passos são curtos (uma frase; as teclas só aparecem no computador);
   2) o recado de cada tentativa aparece DENTRO do painel (uma linha colorida), não solto no campo;
   3) o painel procura o lugar: em cima ou embaixo, na largura que couber, sem ficar em cima de nenhum controle (nem da pausa)
      — com o editor de HUD novo os controles podem estar em qualquer lugar;
   4) no tutorial os seletores do treino somem (e não pegam o toque);
   5) os avisos perto dos botões (o ARMADO e a carga da CURVA) vão para o lado livre (v93RotuloLugar, em base.js).
   Nada aqui mexe na física nem nos comandos: o tutorial é o mesmo (os mesmos passos e as mesmas conferências).
   ================================================================================================================== */
const V93TU = {aviso:null, lugarK:''};
const v93Toque = () => { try { return matchMedia('(pointer:coarse)').matches || navigator.maxTouchPoints > 0; } catch (_) { return false; } };

/* ---------------------------------------------------------------- 1) os textos curtos */
TR_INFO.tut.obj = 'Cinco passos rápidos: andar, mirar, chutar, passar e o armado.';
TR_INFO.tut.dica = 'Leva um minuto · PULAR quando quiser';
tuPassos = function(){
  const pc = !v93Toque(), ps = tuTecla('passe'), ch = tuTecla('chute');
  return [
    {tit:'ANDAR', txt:'Arraste o analógico até o círculo amarelo.', como:pc ? 'Teclado: WASD ou setas.' : ''},
    {tit:'ATRÁS DA BOLA', txt:'Pare no círculo, atrás da bola, de frente para o gol.', como:'Ainda não chute: só se posicione.'},
    {tit:'CHUTE', txt:'Encoste na bola e toque CHUTE. Quem mira é a sua posição.', como:pc && ch ? 'CHUTE: tecla ' + ch + '.' : ''},
    {tit:'PASSE', txt:'Mire no companheiro aceso e toque PASSE (a batida fraca).', como:pc && ps ? 'PASSE: tecla ' + ps + '.' : ''},
    {tit:'BOTÃO ARMADO', txt:'Segure CHUTE antes de chegar na bola: encostou, a batida sai.', como:''}
  ];
};

/* ---------------------------------------------------------------- 2) o recado dentro do painel */
function v93TuAvisoEl(){
  const el = TU.el; if (!el) return null;
  let a = el.querySelector('.tu-aviso');
  if (!a){ a = nodo('p', 'tu-aviso'); a.setAttribute('aria-live', 'polite'); const pts = el.querySelector('.tu-pontos'); el.insertBefore(a, pts); }
  return a;
}
function v93TuAviso(){
  const a = v93TuAvisoEl(); if (!a) return;
  const av = TR.aviso, on = av && av.t > 0 && TR.fase !== 'intro' && av.txt;
  const k = on ? av.txt + '|' + av.cor : '';
  if (V93TU.aviso === k) return;
  V93TU.aviso = k;
  a.hidden = !on; a.textContent = on ? av.txt : ''; a.style.color = on ? av.cor : '';
  const como = TU.el.querySelector('.tu-como'); if (como) como.classList.toggle('v93-sob', !!on);   // (o recado fica no lugar da linha do "como")
  V93TU.lugarK = '';                                           // (a altura mudou: confere o lugar de novo)
}
const trHudAntes93 = trHud;
trHud = function(g){                                           // o tutorial: o painel (DOM) e o recado dentro dele — nada solto no campo
  if (TR.id !== 'tut') return trHudAntes93(g);
  tuPainel(); v93TuAviso();
};

/* ---------------------------------------------------------------- 3) o lugar do painel */
// os controles e a pausa em px da tela (círculos e retângulos)
function v93TuObst(){
  const c = cv.getBoundingClientRect(), k = c.width/W, out = [];
  for (const id of HE_ORDEM){ if (!controleVisivel(id)) continue; const e = el(id); out.push({x:c.left + e.x*k, y:c.top + e.y*k, r:e.r*k + 8}); }
  const P = BTN_PAUSA; out.push({x:c.left + (P.x + P.w/2)*k, y:c.top + (P.y + P.h/2)*k, r:Math.max(P.w, P.h)*.62*k + 6});
  return out;
}
tuLugar = function(el){
  try {
    const c = cv.getBoundingClientRect(), wrap = el.offsetParent || document.getElementById('wrap'), wr = wrap ? wrap.getBoundingClientRect() : {left:0, top:0, right:innerWidth, bottom:innerHeight};
    const obst = v93TuObst(), m = 8, x0 = Math.max(wr.left, c.left) + m, x1 = Math.min(wr.right, c.right) - m;   // (o campo já fica dentro da área segura)
    el.style.transform = 'none'; el.style.bottom = 'auto'; el.style.right = 'auto';
    const poe = (x, y, w) => { el.style.width = Math.round(w) + 'px'; el.style.left = Math.round(x - wr.left) + 'px'; el.style.top = Math.round(y - wr.top) + 'px'; };
    if (c.top - wr.top >= 150){                               // em pé: o painel fica em cima do campo, fora dele
      const w = Math.min(560, x1 - x0); el.style.width = w + 'px'; poe((x0 + x1 - w)/2, Math.max(wr.top + m, c.top - el.offsetHeight - 10), w); return;
    }
    let melhor = null;
    for (const w0 of [560, 480, 420, 360, 300, 250]){
      const w = Math.min(w0, x1 - x0); el.style.width = w + 'px';
      const h = el.offsetHeight || 90;
      const ys = [c.top + 6, c.bottom - h - 6];
      for (let iy = 0; iy < ys.length; iy++){
        const y = ys[iy];
        for (let i = 0; i <= 16; i++){
          const x = x0 + (x1 - x0 - w)*i/16, R = {x, y, w, h};
          let custo = iy*60 + Math.abs(x + w/2 - (x0 + x1)/2)*.15 + (560 - w)*.4;   // (prefere em cima, no meio e largo)
          for (const o of obst){ const sb = heSobra(R, o); if (sb) custo += 5000 + sb*40; }
          if (!melhor || custo < melhor.custo) melhor = {x, y, w, h, custo};
        }
      }
    }
    poe(melhor.x, melhor.y, melhor.w);
    V93TU.lugar = melhor;
  } catch (_) {}
};
const tuPainelAntes93 = tuPainel;
tuPainel = function(esconde){
  tuPainelAntes93(esconde);
  const el = TU.el; if (!el || el.hidden) return;
  el.classList.add('v93-tu');
  const lk = innerWidth + 'x' + innerHeight + '|' + (TR.rod || 0) + '|' + TR.fase + '|' + HE_ORDEM.map(k => { const e = hud[k]; return e && controleVisivel(k) ? Math.round(e.x) + ',' + Math.round(e.y) + ',' + Math.round(e.s*100) : '-'; }).join(';');
  if (V93TU.lugarK !== lk){ V93TU.lugarK = lk; tuLugar(el); }
};

/* ---------------------------------------------------------------- 4) no tutorial os seletores do treino somem */
const v93NoTut = () => TR.on && TR.id === 'tut' && !RQ.on;
const drawSeletoresAntes93 = drawSeletores;
drawSeletores = function(){ if (v93NoTut()) return; return drawSeletoresAntes93.apply(this, arguments); };
const arcHitSelAntes93 = arcHitSel;
arcHitSel = function(x, y, pad){ if (v93NoTut()) return null; return arcHitSelAntes93(x, y, pad); };
