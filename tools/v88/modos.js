/* ======================================================================================================================
   RACHA v88 · A ESCOLHA DO MODO E DO CAMPO (na folha do MODO de sempre, a do botão ao lado do JOGAR)
   Em cima, os três jeitos de jogar, cada um levando para o lugar dele (nada novo por trás: são as telas de sempre):
   · RANQUEADA: a folha de sempre (a patente, o tamanho do time 1v1 a 4v4 e o JOGAR RANQUEADA, que procura gente online e
     completa com bots);
   · SALAS: a tela das salas (pública ou privada, com os amigos: o campo, o modo e o tempo escolhidos na sala);
   · TREINO: a tela dos exercícios (o treino livre, os exercícios e o treino com bots).
   Embaixo, os CAMPOS que existem no jogo (os mesmos das salas e do treino), cada um com o desenho de verdade, o nome e os
   modos em que vale. A ranqueada é sempre no campo oficial (a regra do servidor); os outros aparecem com "SALAS · TREINO" e,
   tocados, levam a uma sala nova nesse campo (a tela de criar sala, com ele escolhido) ou ao treino nele.
   ====================================================================================================================== */
const V88MD = {montado:false};
const V88_MODOS = [
  {id:'ranked', nome:'RANQUEADA', desc:'Online + bots · vale patente', ic:'trofeu'},
  {id:'salas', nome:'SALAS', desc:'Com a galera · pública ou privada', ic:'amigos'},
  {id:'treino', nome:'TREINO', desc:'Exercícios, livre e com bots', ic:'treino'}
];
function v88ModosDoCampo(i){                               // em que modos o campo vale (o da ranqueada é fixo: MAPA_RQ)
  const L = ['SALAS', 'TREINO'];
  return i === MAPA_RQ ? ['RANQUEADA'].concat(L) : L;
}
function v88ModosMonta(){
  if (V88MD.montado || !RQP.raiz) return;
  const linhas = RQP.raiz.querySelector('.rq-linhas'); if (!linhas) return;
  V88MD.montado = true;
  const h = nodo('div', 'rq-sub v88-md-sub', 'JOGAR')   /* (div, não h3: o v71.css esconde o 4º h3 da folha) */, row = nodo('div', 'v88-md'); row.setAttribute('role', 'group'); row.setAttribute('aria-label', 'O que jogar');
  for (const m of V88_MODOS){
    const b = novoBotao('v88-md-b' + (m.id === 'ranked' ? ' on' : ''), m.nome + ': ' + m.desc); b.dataset.md = m.id;
    b.setAttribute('aria-pressed', String(m.id === 'ranked'));
    b.append(v88IcEl(m.ic, 'v88-md-ic'), nodo('b', null, m.nome), nodo('small', null, m.desc));
    b.addEventListener('click', e => { e.stopPropagation(); som.clique(); v88ModoVai(m.id); });
    row.appendChild(b);
  }
  linhas.insertBefore(row, linhas.firstChild); linhas.insertBefore(h, row);
  // os campos: o nome e os modos de cada um (o desenho é o de sempre, do pintaMapas)
  for (const b of RQP.mapas.children){
    const i = +b.dataset.m; if (!CAMPOS[i]) continue;
    if (!b.querySelector('.v88-mapa-modos')) b.appendChild(nodo('small', 'v88-mapa-modos', v88ModosDoCampo(i).join(' · ')));
  }
  RQP.mapas.addEventListener('click', e => {                 // (na ranqueada o campo é o oficial: o outro leva às salas ou ao treino nele)
    const b = e.target.closest('[data-m]'); if (!b || +b.dataset.m === MAPA_RQ) return;
    e.stopImmediatePropagation(); som.clique();
    v88CampoOutro(+b.dataset.m);
  }, true);
}
function v88CampoOutro(i){                                 // um campo que não é o da ranqueada: jogar nele numa sala ou no treino
  const C = CAMPOS[i]; if (!C) return;
  abrePop(c => {
    c.classList.add('v88-pop', 'v88-campo-pop');
    c.append(nodo('span', 'pop-tag', 'CAMPO'), nodo('h2', null, String(C.nome).toUpperCase()));
    c.appendChild(nodo('p', 'pop-txt', 'Na ranqueada o campo é sempre o oficial (' + String(CAMPOS[MAPA_RQ].nome).toUpperCase() + ', a regra do servidor). Este campo vale nas salas e no treino:'));
    const a = nodo('div', 'pop-acoes');
    a.append(
      botaoPop('CRIAR SALA NELE', 'verde', () => {
        som.clique(); fechaPop();
        if (NET49.room) return v88Aviso('Saia da sala em que você está para criar outra.');
        fechaRanqueada(); SX.form.map = i; abreTela('amigos'); sxNovaSala();
      }),
      botaoPop('TREINAR NELE', 'amarelo', () => { som.clique(); fechaPop(); fechaRanqueada(); if (i !== campo) novoCampo(modo, i); abreTela('treino'); }),
      botaoPop('VOLTAR', '', () => { som.clique(); fechaPop(); }));
    c.appendChild(a);
  });
}
function v88ModoVai(id){
  if (id === 'ranked') return;                              // (já está nela)
  fechaRanqueada();
  if (id === 'salas'){ if (NET49.playing) return v88Aviso('Saia da partida antes.'); abreTela('sala'); return; }
  if (id === 'treino') abreTela('treino');
}
function v88ModosPinta(){
  if (!V88MD.montado) return;
  const L = v88CamposTreino();
  for (const b of RQP.mapas.children){
    const i = +b.dataset.m, existe = !!CAMPOS[i] && L.indexOf(i) >= 0;
    b.hidden = !existe;                                       // (os campos que o jogo tem hoje: os mesmos das salas e do treino)
    const fora = existe && i !== MAPA_RQ;
    b.classList.toggle('v88-mapa-fora', fora); b.style.order = i === MAPA_RQ ? '-1' : '';   // (o da ranqueada primeiro)
    b.removeAttribute('aria-disabled');
    b.setAttribute('aria-label', !CAMPOS[i] ? '' : fora ? CAMPOS[i].nome + ': vale nas salas e no treino (não na ranqueada) — criar uma sala ou treinar nele' : CAMPOS[i].nome + ': o campo da ranqueada');
  }
  for (const hh of RQP.raiz.querySelectorAll('.rq-linhas h3.rq-sub')) if (hh.textContent.trim() === 'CAMPO') hh.textContent = 'CAMPOS';
}
const renderRanqueadaAntes88 = renderRanqueada;
renderRanqueada = function(){
  const r = renderRanqueadaAntes88.apply(this, arguments);
  try { v88ModosMonta(); v88ModosPinta(); } catch (e) { console.error(e); }
  return r;
};
