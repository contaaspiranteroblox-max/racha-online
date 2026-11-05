'use strict';
/* =====================================================================================================================
   RACHA v106 · AS MASCOTES no servidor das salas (só quem comprou aparece com elas).
   As 6 mascotes à venda (tools/v106/conteudo.js: os itens tp_m_* do catálogo) trazem duas peças que viajam dentro do código
   da tampinha (T.xxxx), pelo lugar nas listas do jogo: a CARA de cada mascote (os ícones 87 a 92, na ordem abaixo) e a borda
   MEDALHÃO (a borda 28, que vem com qualquer mascote). O jogo só deixa montar a tampinha com elas quem tem a mascote na
   conta; aqui vale o mesmo para quem monta o código na mão: a plataforma põe as mascotes da conta nas relações (mascotes: os
   itens tp_m_* do inventário; no bilhete assinado, m) e, como na tampinha dos fundadores (server/fundador96.js, que chama
   este arquivo), quem aparece com uma peça de mascote que não comprou fica com a tampinha padrão — no cartão da sala, na
   partida, na lista e no Chat do Brasil. Quem comprou agora: a plataforma avisa na hora (empurraRelacoes) e a tampinha
   pedida volta a valer. O tests/v106_mascotes_servidor_test.mjs confere os lugares com o jogo.
   ===================================================================================================================== */
const MASCOTES = Object.freeze([
  Object.freeze({ item: 'tp_m_arara', icone: 87 }),
  Object.freeze({ item: 'tp_m_oncapreta', icone: 88 }),
  Object.freeze({ item: 'tp_m_mico', icone: 89 }),
  Object.freeze({ item: 'tp_m_guara', icone: 90 }),
  Object.freeze({ item: 'tp_m_tucano', icone: 91 }),
  Object.freeze({ item: 'tp_m_jacare', icone: 92 }),
]);
const BORDA_MEDALHAO = 28;
const ITEM_RE = /^tp_m_[a-z0-9_]{2,30}$/;
const PORICONE = new Map(MASCOTES.map(m => [m.icone, m.item]));

// as mascotes que vieram nas relações (a lista da plataforma ou o m do bilhete): só os itens tp_m_*, sem repetir
function lista(v) {
  return Array.isArray(v) ? [...new Set(v.filter(x => typeof x === 'string' && ITEM_RE.test(x)))].slice(0, 30) : [];
}
// a peça p ({tipo, borda, icone}: o fundador96.pecasDoCodigo) usa uma peça de mascote?
function usaPeca(p) {
  return !!p && (PORICONE.has(p.icone) || (p.tipo === 'T' && p.borda === BORDA_MEDALHAO));
}
// pode aparecer com ela? (sem peça de mascote, sempre; a cara pede a mascote dela; a Medalhão, qualquer mascote)
function podeUsar(c, p) {
  if (!usaPeca(p)) return true;
  const tem = c && c.rel && c.rel.masc instanceof Set ? c.rel.masc : null;
  if (!tem || !tem.size) return false;
  const item = PORICONE.get(p.icone);
  return !item || tem.has(item);
}

module.exports = { MASCOTES, BORDA_MEDALHAO, lista, usaPeca, podeUsar };
