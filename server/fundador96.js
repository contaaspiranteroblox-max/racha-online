'use strict';
/* =====================================================================================================================
   RACHA v96 · A TAMPINHA DOS FUNDADORES no servidor das salas.
   A tampinha ultra rara (a cara Fundador e a borda Aura dos Fundadores) é só das 30 primeiras contas que entraram no jogo:
   a plataforma entrega (app/api/racha/fundador.ts) e põe no bilhete assinado da conta (q.fundador = "tp_fundador", junto
   com os cosméticos equipados). A tampinha viaja como o código de sempre (T.xxxx) e qualquer um poderia montar o código
   na mão: aqui, quem não é fundador e aparece com uma das duas peças fica com a tampinha padrão — no cartão da sala, na
   partida, na lista e no Chat do Brasil. Ninguém mais vê a tampinha falsa. O resto do código da tampinha não muda.
   O código (tools/tampa_rua.js: tpCodigo): 'T.' + 6 bits por letra — 2 da versão, 5 da borda (o lugar em TP_BORDAS), 6 do
   padrão, 7 do ícone (o lugar em TP_ICONES) e o resto. As peças novas ficam no fim das listas (os lugares não mudam): a
   Aura dos Fundadores é a 27ª borda (índice 26) e a cara Fundador o 87º ícone (índice 86) — o tests/v96_skins_test.py
   confere com o jogo.
   ===================================================================================================================== */
const TP_B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const M106 = require('./mascotes106');                 // v106: as peças das mascotes (a cara e a Medalhão) só com quem comprou
const FUNDADOR = Object.freeze({ item: 'tp_fundador', borda: 26, icone: 86 });

function pecasDoCodigo(s) {                              // {borda, padrao, icone} (os lugares nas listas) ou null
  if (typeof s !== 'string' || s.length < 6 || !(s[0] === 'T' || s[0] === 'E') || s[1] !== '.') return null;
  let v = 0;
  for (const ch of s.slice(2, 6)) { const k = TP_B64.indexOf(ch); if (k < 0) return null; v = v * 64 + k; }   // (24 bits)
  const bit = (de, n) => (v >> (24 - de - n)) & ((1 << n) - 1);
  if (bit(0, 2) !== 0) return null;
  return { tipo: s[0], borda: bit(2, 5), padrao: bit(7, 6), icone: bit(13, 7) };
}
// a tampinha usa uma peça dos fundadores? (no escudo do clube, a borda é outra lista: só o ícone conta)
function temPecaFundador(s) {
  const p = pecasDoCodigo(s); if (!p) return false;
  return p.icone === FUNDADOR.icone || (p.tipo === 'T' && p.borda === FUNDADOR.borda);
}
function ehFundador(c) { return !!(c && c.rel && c.rel.cos && c.rel.cos.fundador === FUNDADOR.item); }
function skinValida(c, s) {                             // v106: + as peças das mascotes (server/mascotes106.js)
  if (temPecaFundador(s) && !ehFundador(c)) return '';
  return M106.podeUsar(c, pecasDoCodigo(s)) ? s : '';
}

function aplica(Turma) {
  const P = Turma.prototype;
  // a tampinha que a pessoa pediu (guardada) e a que os outros veem (conferida); mudou: o cartão da sala acompanha
  P.f96Confere = function (c) {
    if (!c || !c.id) return;
    const pedida = c.skinPedida != null ? c.skinPedida : c.skin, vale = skinValida(c, pedida);
    if (vale === c.skin) return;
    c.skin = vale;
    const g = this.b && this.b.d && this.b.d.gente ? this.b.d.gente[c.id] : null;
    if (g) g.skin = vale;
    const r = c.sala ? this.salas.get(c.sala) : null, eu = r && r.members.find(x => x.id === c.id);
    if (eu) { eu.skin = vale; this.salaMuda(r); }             // (a partida desenha pela tampinha do cartão da sala)
  };
  const helloAntes = P.hello;
  P.hello = function (c, m) {
    const r = helloAntes.apply(this, arguments);
    if (c && c.id) { c.skinPedida = c.skin; this.f96Confere(c); }
    return r;
  };
  const profileAntes = P.profile;
  P.profile = function (c, m) {                          // (trocou a tampinha: a pedida é a nova; a que vale, conferida)
    const r = profileAntes.apply(this, arguments);
    if (c && c.id) { if (m && typeof m.skin === 'string' && c.skin === m.skin) c.skinPedida = c.skin; this.f96Confere(c); }
    return r;
  };
  if (typeof P.v88Relacoes === 'function') {             // (as relações chegaram ou mudaram: o bilhete diz se é fundador)
    const relAntes = P.v88Relacoes;
    P.v88Relacoes = function (c) {
      const r = relAntes.apply(this, arguments);
      try { if (c && c.id) this.f96Confere(c); } catch (_) {}
      return r;
    };
  }
  if (typeof P.brasilRecebe === 'function') {            // (o Chat do Brasil mostra a tampinha ao lado do nome)
    const brAntes = P.brasilRecebe;
    P.brasilRecebe = function (c, m) {
      const r = brAntes.apply(this, arguments);
      try { if (c && m && m.type === 'brasil_join' && c.skin && skinValida(c, c.skin) !== c.skin) c.skin = ''; } catch (_) {}   // (v106: e as mascotes)
      return r;
    };
  }
}

module.exports = { FUNDADOR, pecasDoCodigo, temPecaFundador, ehFundador, skinValida, aplica };
