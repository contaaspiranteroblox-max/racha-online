(function(){   /* RACHA rua v82 · AS CONTAS — antes do jogo carregar (o build põe este script antes do script do jogo).
   1) Quem está jogando: a conta da plataforma (window.parent.RACHA_JOGO, só a v82 ou mais nova) ou ninguém (sem conta).
   2) Cada conta tem o seu progresso neste aparelho: as chaves de progresso (as mesmas de app/contracts/progresso.ts) são
      de um dono só ('racha-dono': '' = sem conta, 'c123' = a conta 000123). Se quem joga agora é outro, o progresso de
      antes vai para a gaveta dele ('racha-guarda:<dono>') e o de quem chegou sai da gaveta — tudo antes do jogo ler.
   3) A cópia da conta (a plataforma carrega antes do jogo abrir): se ela é mais nova que a deste aparelho e aqui não tem
      nada que ainda não foi para a conta, ela entra no lugar (o jogo já começa com ela). Se os dois mudaram, o jogo
      pergunta qual fica (tools/v82/conta.js). Conta nova (sem cópia) com progresso do aparelho sem conta: o jogo pergunta
      se leva para a conta.
   Nada disso roda sem a plataforma (o jogo aberto direto, a prévia): aí o progresso é o de sempre, de quem joga sem conta. */
  'use strict';
  var CHAVES = ['streetball-conta-v1', 'racha-treino-perfil-v1', 'streetball-v49', 'racha-tampa-v1', 'racha-tampa-rascunho-v1',
    'racha-clubes-v1', 'streetball-treino-v1', 'streetball-recordes-v1', 'racha-v71-padrao', 'racha-v80-padrao'];
  var R = window.RACHA82 = {chaves:CHAVES, dono:'', conta:null, pl:null, nuvem:undefined, meta:null, trocou:false, de:'', aplicou:false, conflito:null, primeira:null, sujo:false};
  var LS = null; try { LS = window.localStorage; } catch (e) { return; }
  function le(k){ try { return LS.getItem(k); } catch (e) { return null; } }
  function grava(k, v){ try { if (v === null || v === undefined) LS.removeItem(k); else LS.setItem(k, String(v)); } catch (e) {} }
  function copia(){ var o = {}; for (var i = 0; i < CHAVES.length; i++){ var v = le(CHAVES[i]); if (v !== null) o[CHAVES[i]] = v; } return o; }
  function poe(o){ for (var i = 0; i < CHAVES.length; i++){ var k = CHAVES[i]; grava(k, o && Object.prototype.hasOwnProperty.call(o, k) && typeof o[k] === 'string' ? o[k] : null); } }
  function json(s){ try { return JSON.parse(s); } catch (e) { return null; } }
  // v85: as chaves do treino trocaram de prefixo (o antigo era o nome de outro jogo; ver PROVENIENCIA.md). Antes de tudo, o
  // que estava nas chaves antigas vai para as novas, uma vez (se a nova já existe, ela fica): neste aparelho, nas gavetas das
  // contas (racha-guarda:*) e no que o conta.js deixou preparado (racha-82-entra:*). A cópia antiga da conta (v82–v84) passa
  // pelo mesmo mapa quando chega (R.migraChaves, no decide e no QUAL PROGRESSO FICA?).
  var ANTIGA = /^(?!racha-)[a-z0-9]+-treino-(perfil-v1|hud-v11|som-v1|campo-v1|modo-v1)$/;
  function migraObj(o){                                   // {chave: valor}: os nomes antigos viram os novos (true se mudou)
    if (!o || typeof o !== 'object') return false;
    var mudou = false;
    for (var k in o){
      if (!Object.prototype.hasOwnProperty.call(o, k)) continue;
      var m = ANTIGA.exec(k); if (!m) continue;
      var nova = 'racha-treino-' + m[1];
      if (!Object.prototype.hasOwnProperty.call(o, nova)) o[nova] = o[k];
      delete o[k]; mudou = true;
    }
    return mudou;
  }
  R.migraChaves = migraObj;
  try {
    var ks = []; for (var iK = 0; iK < LS.length; iK++) ks.push(LS.key(iK));
    for (var jK = 0; jK < ks.length; jK++){
      var kA = ks[jK] || '', mA = ANTIGA.exec(kA);
      if (mA){ var nA = 'racha-treino-' + mA[1]; if (le(nA) === null) grava(nA, le(kA)); grava(kA, null); R.migrou = (R.migrou | 0) + 1; continue; }
      if (/^racha-(guarda|82-entra):/.test(kA)){
        var oA = json(le(kA));
        if (oA && typeof oA === 'object' && (migraObj(oA) || (oA.chaves && migraObj(oA.chaves)))) grava(kA, JSON.stringify(oA));
      }
    }
  } catch (e) {}
  // (o JSON de cada chave em forma única — os campos em ordem alfabética —: o jogo regrava os mesmos dados em outra ordem ao
  // abrir, e isso não é mudança; sem isto, abrir o jogo de novo "mudava" o progresso e podia perguntar QUAL FICA à toa)
  function canon(v){
    if (Array.isArray(v)){ var a = []; for (var i = 0; i < v.length; i++) a.push(v[i] === undefined ? 'null' : canon(v[i])); return '[' + a.join(',') + ']'; }
    if (v && typeof v === 'object'){ var ks = Object.keys(v).sort(), o = []; for (var j = 0; j < ks.length; j++) if (v[ks[j]] !== undefined) o.push(JSON.stringify(ks[j]) + ':' + canon(v[ks[j]])); return '{' + o.join(',') + '}'; }
    var t = JSON.stringify(v); return t === undefined ? 'null' : t;
  }
  // (da chave do X49, só o que o jogo lê ao abrir: ele grava também o que é da partida de agora — matchMode, matchStarted, que
  // muda a cada vez — e isso não é progresso)
  var LIDOS = {'streetball-v49':['mode', 'camera', 'ball', 'border', 'uniform', 'celebration', 'jogo', 'niveis', 'n', 'map', 'seq', 'bestSeq', 'longest', 'fastest',
    'history', 'contactSync', 'vistos', 'evVisto', 'nivelCas']};
  function forma(k, s){
    try {
      var v = JSON.parse(s), l = LIDOS[k];
      if (l && v && typeof v === 'object' && !Array.isArray(v)){ var o = {}; for (var i = 0; i < l.length; i++) if (Object.prototype.hasOwnProperty.call(v, l[i])) o[l[i]] = v[l[i]]; v = o; }
      return canon(v);
    } catch (e) { return String(s); }
  }
  R.hash = function(o){                                   // (o resumo da cópia: FNV-1a 32 bits, chave por chave em ordem fixa)
    var h = 0x811c9dc5, s = '';
    for (var i = 0; i < CHAVES.length; i++){ var k = CHAVES[i]; if (o && typeof o[k] === 'string') s += k + '\u0001' + forma(k, o[k]) + '\u0002'; }
    for (var j = 0; j < s.length; j++){ h ^= s.charCodeAt(j); h = Math.imul(h, 0x01000193) >>> 0; }
    return ('0000000' + h.toString(16)).slice(-8) + ':' + s.length;
  };
  R.temProgresso = function(o){                           // tem algo de verdade (não só o que o jogo cria na primeira vez)
    if (!o) return false;
    var c = json(o['streetball-conta-v1']), p = json(o['racha-treino-perfil-v1']), t = json(o['racha-tampa-v1']);
    var st = p && p.st || {};
    return !!((st.partidas | 0) > 0 || (st.treinos | 0) > 0 || (c && ((c.rq && (c.rq.pts | 0) > 0) || (Array.isArray(c.skins) && c.skins.length) || (c.xp | 0) > 0))
      || (t && ((Array.isArray(t.itens) && t.itens.length) || (Array.isArray(t.salvas) && t.salvas.length))));
  };
  R.copia = copia; R.poe = poe;
  // 1) quem está jogando
  try {
    var pl = window.parent && window.parent !== window ? window.parent.RACHA_JOGO : null;
    if (pl && typeof pl.conta === 'function' && (pl.versao | 0) >= 82){
      var c = pl.conta();
      if (c && c.idPublico && /^\d{1,9}$/.test(String(c.idPublico))){ R.conta = c; R.dono = 'c' + String(Number(c.idPublico)); R.pl = pl; }
    }
  } catch (e) {}
  // 2) de quem é o progresso que está nas chaves
  var atual = le('racha-dono') || '';
  if (!/^(c\d{1,9})?$/.test(atual)) atual = '';
  if (atual !== R.dono){
    grava('racha-guarda:' + (atual || 'convidado'), JSON.stringify(copia()));
    var g = json(le('racha-guarda:' + (R.dono || 'convidado')));
    poe(g && typeof g === 'object' ? g : {});
    grava('racha-guarda:' + (R.dono || 'convidado'), null);   // (o de quem chegou agora mora nas chaves)
    grava('racha-dono', R.dono);
    R.trocou = true; R.de = atual;
  }
  if (!R.dono) return;
  // 3) a cópia da conta
  var meta = json(le('racha-nuvem:' + R.dono));
  if (!meta || typeof meta !== 'object') meta = {versao:0, hash:'', salvoEm:0, primeira:false};
  R.meta = meta;
  R.salvaMeta = function(){ grava('racha-nuvem:' + R.dono, JSON.stringify(R.meta)); };
  // o que o conta.js deixou preparado antes de abrir o jogo de novo (a cópia da conta escolhida, o progresso que foi para a
  // conta): entra aqui, antes do jogo ler — escrever direto nas chaves não serve (o jogo grava o que tem na memória ao fechar)
  var prep = json(le('racha-82-entra:' + R.dono));
  if (prep && prep.chaves && typeof prep.chaves === 'object'){
    poe(prep.chaves);
    if (prep.meta && typeof prep.meta === 'object') for (var mk in prep.meta) if (Object.prototype.hasOwnProperty.call(prep.meta, mk)) meta[mk] = prep.meta[mk];
    if (prep.hashDaCopia) meta.hash = R.hash(prep.chaves);
    R.salvaMeta();
    if (prep.limpaConvidado) grava('racha-guarda:convidado', null);
    R.preparou = true;
  }
  grava('racha-82-entra:' + R.dono, null);
  R.prepara = function(chaves, metaNova, opc){              // (o conta.js usa: guarda e abre o jogo de novo)
    var o = {chaves:chaves, meta:metaNova || {}};
    if (opc && opc.limpaConvidado) o.limpaConvidado = true;
    if (opc && opc.hashDaCopia) o.hashDaCopia = true;
    grava('racha-82-entra:' + R.dono, JSON.stringify(o));
  };
  // o que fazer com a cópia da conta: 'aplicou' (aqui, antes do jogo) | 'aplicar' (no conta.js: a cópia chegou depois — vai
  // preparada e o jogo abre de novo) | 'conflito' | 'primeira' | 'nada'
  R.decide = function(n, depois){
    if (n && n.dados && n.dados.chaves) migraObj(n.dados.chaves);   // v85: a cópia antiga da conta, com os nomes antigos
    var m = R.meta, aqui = copia();
    R.nuvem = n; R.conflito = null; R.primeira = null;
    R.sujo = m.versao ? R.hash(aqui) !== m.hash : R.temProgresso(aqui);   // o que mudou aqui e ainda não foi para a conta
    if (n && typeof n === 'object' && (n.versao | 0) > (m.versao | 0) && n.dados && n.dados.chaves){
      if (!R.sujo || R.hash(n.dados.chaves) === R.hash(aqui)){
        var mn = {versao:n.versao | 0, hash:R.hash(n.dados.chaves), salvoEm:+n.salvoEm || Date.now(), primeira:true};
        if (depois){ R.prepara(n.dados.chaves, mn); return 'aplicar'; }
        poe(n.dados.chaves); for (var k2 in mn) m[k2] = mn[k2];
        R.salvaMeta(); R.aplicou = true; R.sujo = false; return 'aplicou';
      }
      R.conflito = n; return 'conflito';                   // os dois mudaram: o jogo pergunta (conta.js)
    }
    if (n === null && !m.versao && !m.primeira && !R.temProgresso(aqui)){
      var conv = json(le('racha-guarda:convidado'));     // a conta ainda não tem cópia: o aparelho tem progresso sem conta?
      if (conv && R.temProgresso(conv)){ R.primeira = conv; return 'primeira'; }
    }
    return 'nada';
  };
  var n; try { n = R.pl.progresso && typeof R.pl.progresso.inicial === 'function' ? R.pl.progresso.inicial() : undefined; } catch (e) { n = undefined; }
  if (n !== undefined) R.decide(n); else R.sujo = meta.versao ? R.hash(copia()) !== meta.hash : R.temProgresso(copia());
})();
