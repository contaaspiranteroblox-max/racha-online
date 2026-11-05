/* ======================================================================================================================
   RACHA v105 · AS TAMPINHAS CRIADAS FICAM NA CONTA E A BORDA BOTÃO É A DE TODO MUNDO
   O pedido (05/11/2026): "quando o jogador cria uma skin aí ele reloga no jogo a skin some" e "quero a borda lisa padrão no
   jogo, a inicial para geral, e deixe mais parecido: essa borda parece que tem uma sombra ali por dentro, deixe bem
   parecido" (com as duas imagens das tampinhas de botão listradas na grama).

   1) A TAMPINHA CRIADA QUE SUMIA. As criadas (a equipada e as SALVAS) moram na chave racha-tampa-v1 (no aparelho; e na conta,
      dentro da cópia do progresso: tools/v82, progresso.salvar).
      A CAUSA (reproduzida na v104 sem conta nenhuma, só abrindo o jogo de novo): o tools/tampa_rua.js lê essa chave no começo
      do script, ANTES de as peças que entram depois — as caras e os aros animados da v76 e da v96 e a BOTÃO da v102 (o lugar
      27) — estarem nas listas. O tpLe recusava o código de toda tampinha feita com uma dessas peças (e guardava o "inválido"
      no TP_LIDOS para a sessão inteira): a equipada voltava a ser a inicial e a salva sumia do inventário; a gravação seguinte
      apagava de vez, no aparelho e, com a cópia, na conta (e em outro aparelho, a mesma leitura recusava de novo). Como a v102
      pôs a BOTÃO no editor a pedido, quase toda tampinha nova passou a sumir ao "relogar".
      O conserto: a leitura do começo guarda o que ainda não dá para ler (TP.adiadas: tools/v105/cosmeticos.py) e, no fim do
      script, com todas as peças, a v105 limpa os "inválidos" do TP_LIDOS e devolve a equipada e as salvas (v105Adiadas).
      E a cópia na conta, que vinha atrasada (também reproduzido na plataforma de teste, com o código de verdade de app/api):
      ela só ia de 8 a 12 s depois da última mudança (o vigia de 4 em 4 s, 5 s parado e 15 s entre um envio e outro), nunca no
      meio da partida — e o SAIR DA CONTA encerrava a sessão ANTES de mandar o que faltava (o envio do pagehide já saía sem a
      sessão; fechando o app, o fetch comum é cortado com a página). Criou e saiu (ou fechou o app) logo em seguida: em outro
      aparelho entrava a cópia velha (a equipada de antes; a coluna "tampa" da conta, que já tinha a nova, só valia sem nada
      equipado) e esse aparelho mandava a cópia velha como a mais nova; de volta ao primeiro, QUAL PROGRESSO FICA? — com O DA
      CONTA a criada sumia ali também (com O DESTE APARELHO, sumia o que o outro tinha). Para isso:
      · logo depois de cada mudança nas tampinhas (equipar, salvar, renomear, favoritar, apagar) a cópia vai para a conta em
        ~1 s (e de novo, se mudar no meio do envio);
      · o SAIR DA CONTA manda o que falta e espera a resposta (até 4,5 s) antes de encerrar a sessão;
      · com o app indo para o fundo ou fechando, o envio da cópia sai com keepalive (o navegador termina de mandar mesmo com a
        página fechando; até 60 KB — acima disso, o envio de sempre);
      · as tampinhas JUNTAM em vez de uma cópia apagar a outra: quando os dois lados mudaram (QUAL PROGRESSO FICA?, as duas
        escolhas) e no LEVAR O PROGRESSO PARA A CONTA, as salvas dos dois lados ficam (as apagadas de propósito não voltam:
        cada salva leva a hora em que mudou e cada apagada fica marcada) e a equipada é a equipada por último (a hora do
        equipar vai junto, "te");
      · a tampinha da conta (a coluna "tampa", gravada em cada equipar) que este aparelho nunca viu entra nas salvas (e é
        equipada se aqui estiver a inicial): mesmo com a cópia atrasada, a criada não some.
   2) A BORDA BOTÃO PARA TODO MUNDO. A tampinha inicial (e as do time, as da Oficina e as de versões antigas) e toda tampinha
      que ficou com a borda de fábrica — a Clássica no cinza da inicial (#c7cdd3 depois de salva), de quem nunca mexeu na
      borda — aparecem com a BOTÃO, de aro branco. Os códigos não mudam (os de sempre continuam valendo, em todo lugar e em
      todas as versões): é só o desenho. A borda escolhida de propósito fica: no editor, a Clássica escolhida (ou pintada) no
      cinza da inicial vira um tom acima (#c9cdd3, igual a olho) para não ser lida como "de fábrica". As tampinhas novas já
      nascem com a BOTÃO (o editor abre a inicial com a BOTÃO de aro branco).
   3) A BOTÃO NO ESTILO DA IMAGEM: chapada — sem o degradê de relevo do aro, sem o brilho, sem a sombra por dentro e sem a luz
      de esmalte no desenho —: o contorno escuro fino e firme por fora, o aro branco liso, um filete escuro fino entre o aro e
      o desenho e o desenho cheio no meio, nas proporções medidas nas imagens (o desenho até 84% do raio de fora, o filete com
      3,5%, o aro com 9% e o contorno com 3,5%; o contorno nunca mais fino que 1,2 px, o filete que 1 px e o aro que 1,6 px).
      O aro de fábrica é branco (#f7f7f3). O tamanho da tampinha, o alcance e a física não mudam.
   As horas das tampinhas (a de cada salva, a do equipar e as apagadas) moram no TP.v105 e vão na mesma chave racha-tampa-v1
   (as trocas de texto do tampa_rua.js estão no tools/v105/cosmeticos.py: a leitura e o tpSalva de sempre).
   ====================================================================================================================== */
const V105 = {aro:'#f7f7f3', tinta:'rgba(16,12,22,.96)', filete:'rgba(16,12,22,.9)', meio:.84, cinza:'', desvio:'',
  snap:null, snapEq:'', equipando:false, empT:0, saindo:false, juntou:new WeakSet(), hashOrig:new WeakMap(),
  dicas:new Set(), equivale:new Map(), envios:0, ultimoEnvio:0};

/* ================================================================ 2 e 3) a BOTÃO chapada e a borda de fábrica */
try { V105.cinza = v105Q(tpLe(TP_PADRAO_COD).bc[0]) || '#c7cdd3'; } catch (_) { V105.cinza = '#c7cdd3'; }   // (o cinza da saia da inicial, como o código guarda)
V105.desvio = v105Q('#' + (parseInt(V105.cinza.slice(1, 3), 16) + 2).toString(16).padStart(2, '0') + V105.cinza.slice(3)) || '#c9cdd3';   // (um tom acima: a Clássica escolhida de propósito)
function v105Q(hex){                                       // a cor como o código guarda (7 bits por canal: a do editor e a salva batem)
  if (!TP_HEX.test(hex || '')) return '';
  const n = parseInt(hex.slice(1), 16), ch = x => { const v = (x >> 1) & 127; return ((v << 1) | (v >> 6)).toString(16).padStart(2, '0'); };
  return '#' + ch(n >> 16 & 255) + ch(n >> 8 & 255) + ch(n & 255);
}
function v105DeFabrica(D){                                  // a borda que ninguém escolheu: a Clássica no cinza da inicial
  return !!D && D.k === 'T' && D.b === 'cl' && Array.isArray(D.bc) && v105Q(D.bc[0]) === V105.cinza;
}
function v105ComBotao(D){ const d = tpCopia(D); d.b = V102_BORDA.id; d.bc = [V105.aro, d.bc[1] || '#1d1d1d']; return d; }
function v105Norm(cod){                                     // o código como ele aparece (a de fábrica com a BOTÃO)
  if (typeof cod !== 'string' || !cod) return cod;
  let r = V105.equivale.get(cod);
  if (r === undefined){
    r = cod;
    try { const D = tpEhCodigo(cod) ? tpLe(cod) : null; if (D && v105DeFabrica(D)) r = tpCodigo(v105ComBotao(D)); } catch (_) {}
    if (V105.equivale.size > 400) V105.equivale.clear();
    V105.equivale.set(cod, r);
  }
  return r;
}
const v105Mesma = (a, b) => a === b || (!!a && !!b && v105Norm(a) === v105Norm(b));

// as medidas da BOTÃO (r = o raio de fora, como o das outras bordas — a ponta dos dentes): o desenho, o filete, o aro e o contorno
// (o aro do TAMANHO DA BORDA, tools/v105/borda.js: a normal com 9% do raio, a fina com 4,5% e a grossa com 17%)
const V105_ARO_TAM = [[.09, 1.6], [.045, 1], [.17, 2.4]];
function v105Medidas(r, D){
  const R = r*.97, wC = Math.max(1.2, R*.035), wF = Math.max(1, R*.035);
  const k = typeof tpBordaTam === 'function' ? tpBordaTam(D) : 0, [ka, mina] = V105_ARO_TAM[k] || V105_ARO_TAM[0];
  const rt = Math.min(R*(k ? 1 : V105.meio), R - wC - wF - Math.max(mina, R*ka));   // (pequena: o aro nunca fica mais fino que 1,6 px — a fina, 1 px)
  return {R, wC, wF, rt};
}
// o aro chapado: o branco liso (a cor 1 da borda: o ARO) e o contorno escuro firme por fora — sem relevo e sem brilho
v102Aro = function(g, x, y, r, D){
  if (typeof tpSemBorda === 'function' && tpSemBorda(D)) return;   // (SEM BORDA: nada em volta do desenho)
  const M = v105Medidas(r, D), aro = (D && D.bc && TP_HEX.test(D.bc[0] || '') && D.bc[0]) || V105.aro;
  g.beginPath(); g.arc(x, y, M.R, 0, TP_TAU); g.fillStyle = aro; g.fill();
  g.lineWidth = M.wC; g.strokeStyle = V105.tinta; g.beginPath(); g.arc(x, y, M.R - M.wC/2, 0, TP_TAU); g.stroke();
};
// a tampinha inteira com a BOTÃO: o aro, o desenho cheio no meio (chapado: sem a luz de esmalte) e o filete escuro entre os dois
v102Botao = function(g, x, y, r, D, semente){
  if (typeof tpSemBorda === 'function' && tpSemBorda(D)) return tpSoDesenho(g, x, y, r, D, semente);   // (SEM BORDA: só o desenho)
  const M = v105Medidas(r, D), rd = M.rt + M.wF*.5;
  v102Aro(g, x, y, r, D);
  g.save(); g.beginPath(); g.arc(x, y, rd, 0, TP_TAU); g.clip();
  tpPintaTampo(g, x, y, rd, D, semente);
  g.restore();
  g.lineWidth = M.wF; g.strokeStyle = V105.filete; g.beginPath(); g.arc(x, y, M.rt + M.wF/2, 0, TP_TAU); g.stroke();
};
// a borda de fábrica aparece como a BOTÃO (em todo desenho: a partida, o lobby, o perfil, as miniaturas, o chat, o replay)
const tpTampaAntes105 = tpTampa;
tpTampa = function(g, x, y, r, D, semente){ return tpTampaAntes105.call(this, g, x, y, r, v105DeFabrica(D) ? v105ComBotao(D) : D, semente); };
const tpSaiaAntes105 = tpSaia;                              // (a cara animada: o aro do botão no lugar dos dentes)
tpSaia = function(g, x, y, r, D){ return tpSaiaAntes105.call(this, g, x, y, r, v105DeFabrica(D) ? v105ComBotao(D) : D); };
if (typeof emjRaio === 'function'){                         // (o emoji cobre o desenho do botão inteiro, até o filete)
  const emjRaioAntes105 = emjRaio;
  emjRaio = function(r, D){ if (D && D.k !== 'E' && (v102EhBotao(D) || v105DeFabrica(D))) return v105Medidas(r, D).rt; return emjRaioAntes105.apply(this, arguments); };
}
if (typeof tpeDescreve === 'function'){ const tpeDescreveAntes105 = tpeDescreve; tpeDescreve = function(D){ return tpeDescreveAntes105.call(this, v105DeFabrica(D) ? v105ComBotao(D) : D); }; }

// o editor: a inicial (e a de fábrica) abre com a BOTÃO de aro branco — a criada a partir dela já nasce com a BOTÃO; sem mexer
// em nada, ela continua sendo a mesma (o VOLTAR, o rascunho e o EQUIPAR a reconhecem: a inicial continua a inicial, com as
// cores do time na partida)
const v105Converte = D => (D && D.k === 'T' && v105DeFabrica(D)) ? v105ComBotao(D) : D;
const tpeComecaAntes105 = tpeComeca;
tpeComeca = function(){
  const r = tpeComecaAntes105.apply(this, arguments);
  try {
    if (ED.modo === 'T'){
      if (ED.D) ED.D = v105Converte(ED.D);
      const B = ED.base && tpLe(ED.base); if (B && v105DeFabrica(B)) ED.base = tpCodigo(v105ComBotao(B));
    }
  } catch (e) { console.error('v105 editor', e); }
  return r;
};
const tpeTrocaAntes105 = tpeTroca;
tpeTroca = function(D){ return tpeTrocaAntes105.call(this, ED.modo === 'T' ? v105Converte(D) : D); };
const tpeCarregaAntes105 = tpeCarrega;
tpeCarrega = function(D){ return tpeCarregaAntes105.call(this, ED.modo === 'T' ? v105Converte(D) : D); };
const tpeMudaAntes105 = tpeMuda;
tpeMuda = function(fn, junta){                              // a Clássica escolhida de propósito no cinza da inicial: um tom acima
  return tpeMudaAntes105.call(this, D => { fn(D); try { if (ED.modo === 'T' && v105DeFabrica(D)) D.bc[0] = V105.desvio; } catch (_) {} }, junta);
};
const tpeMudouAntes105 = tpeMudou;
tpeMudou = function(){
  try { if (ED.modo === 'T' && ED.D && v105Mesma(tpCodigo(ED.D), tpMinha())) return false; } catch (_) {}
  return tpeMudouAntes105.apply(this, arguments);
};
const tpeAplicaAntes105 = tpeAplica;
tpeAplica = function(cod){
  try { if (ED.modo !== 'E' && cod !== tpMinha() && v105Mesma(cod, tpMinha())){ tpeApagaRascunho(); fechaTela(); return; } } catch (_) {}
  return tpeAplicaAntes105.apply(this, arguments);
};
const tpeNomeDeAntes105 = tpeNomeDe;
tpeNomeDe = function(D){
  const n = tpeNomeDeAntes105.apply(this, arguments);
  try { if (D && D.k === 'T' && n === 'Personalizada'){ const cod = tpCodigo(D), sv = TP.salvas.find(s => v105Mesma(s.c, cod)); if (sv) return sv.n; } } catch (_) {}
  return n;
};
const tpeSalvarInvAntes105 = tpeSalvarInv;
tpeSalvarInv = function(){
  try { const cod = tpCodigo(ED.D); if (TP.salvas.some(s => s.c !== cod && v105Mesma(s.c, cod))){ aviso('Essa já está salva'); return; } } catch (_) {}
  return tpeSalvarInvAntes105.apply(this, arguments);
};

/* ================================================================ 1) as criadas na conta */
const v105Chave = s => s.c + '\u0001' + s.n;
const V105_PECA = /^[bfpi]:[a-z0-9-]{2}$/;
function v105Lido(txt){ try { const o = typeof txt === 'string' ? JSON.parse(txt) : txt; return o && typeof o === 'object' && !Array.isArray(o) ? o : null; } catch (_) { return null; } }
function v105LimpaSalva(s){
  if (!s || !tpEhCodigo(s.c) || s.c[0] !== 'T' || !tpLe(s.c)) return null;
  const n = Array.from(semLixo(String(s.n || ''))).slice(0, 20).join('').trim() || 'Minha tampinha';
  const o = {c:s.c, n, f:s.f === true};
  if (Number.isFinite(+s.t) && +s.t > 0) o.t = Math.floor(+s.t);
  return o;
}
function v105LimpaTumbas(l){
  const m = new Map();
  for (const x of Array.isArray(l) ? l : []){
    if (!x || !tpEhCodigo(x.c) || typeof x.n !== 'string' || !(+x.t > 0)) continue;
    const k = x.c + '\u0001' + x.n; if (!m.has(k) || m.get(k).t < +x.t) m.set(k, {c:x.c, n:x.n, t:Math.floor(+x.t)});
  }
  return [...m.values()].sort((a, b) => b.t - a.t).slice(0, 64);
}
// junta duas cópias da racha-tampa-v1 (a e b: {itens, salvas, equipada, te, x}); nos empates, fica o de "a"
function v105Junta(a, b){
  a = a || {}; b = b || {};
  const itens = [...new Set([...(Array.isArray(a.itens) ? a.itens : []), ...(Array.isArray(b.itens) ? b.itens : [])].filter(k => typeof k === 'string' && V105_PECA.test(k)))];
  const x = v105LimpaTumbas([...(Array.isArray(a.x) ? a.x : []), ...(Array.isArray(b.x) ? b.x : [])]);
  const morta = new Map(x.map(t => [t.c + '\u0001' + t.n, t.t]));
  const m = new Map(), ordem = [];
  for (const lado of [a, b]) for (const s0 of Array.isArray(lado.salvas) ? lado.salvas : []){
    const s = v105LimpaSalva(s0); if (!s) continue;
    const k = v105Chave(s), t = s.t || 0;
    if (morta.has(k) && morta.get(k) >= t) continue;      // (apagada de propósito depois desta: não volta)
    if (!m.has(k)){ m.set(k, s); ordem.push(k); }
    else if ((m.get(k).t || 0) < t) m.set(k, s);
  }
  let salvas = ordem.map((k, i) => [m.get(k), i]).sort((p, q) => (q[0].t || 0) - (p[0].t || 0) || p[1] - q[1]).map(p => p[0]);
  while (salvas.length > 24){                                 // (o inventário tem 24 lugares: sai a mais velha que não é favorita)
    let i = salvas.length - 1; while (i >= 0 && salvas[i].f) i--;
    salvas.splice(i >= 0 ? i : salvas.length - 1, 1);
  }
  const ok = c => typeof c === 'string' && (c === '' || (tpEhCodigo(c) && c[0] === 'T' && !!tpLe(c)));
  const ta = +a.te || 0, tb = +b.te || 0;
  let equipada = ok(a.equipada) ? a.equipada : '', te = ta;
  if (tb > ta && ok(b.equipada)){ equipada = b.equipada; te = tb; }
  const o = {itens, salvas, equipada};
  if (te) o.te = te;
  if (x.length) o.x = x;
  return o;
}
// as horas (a de cada salva, a do equipar e as apagadas) moram no TP.v105: o tampa_rua.js lê e o tpSalva de sempre grava, junto
// da chave racha-tampa-v1 (as trocas estão no tools/v105/cosmeticos.py) — assim nenhuma gravação de antes desta etapa as perde
const V105T = () => TP.v105 || (TP.v105 = {te:0, x:[]});
function v105LeHoras(){ const T = V105T(); T.te = +T.te > 0 ? Math.floor(+T.te) : 0; T.x = v105LimpaTumbas(T.x); }
function v105Fotografa(){ V105.snap = new Map(TP.salvas.map(s => [v105Chave(s), !!s.f])); V105.snapEq = TP.equipada; }
function v105Marca(){                                        // o que mudou desde a última gravação ganha a hora de agora
  if (!V105.snap) v105Fotografa();
  const agora = Date.now(), vistas = new Set();
  for (const s of TP.salvas){
    if (!s || typeof s !== 'object') continue;
    const k = v105Chave(s); vistas.add(k);
    if (!V105.snap.has(k) || V105.snap.get(k) !== !!s.f) s.t = agora;
  }
  const T = V105T();
  for (const [k] of V105.snap) if (!vistas.has(k)){ const i = k.indexOf('\u0001'); T.x.unshift({c:k.slice(0, i), n:k.slice(i + 1), t:agora}); }
  // (a equipada tirada sem equipar outra — o ZERAR PROGRESSO, as trocas das versões antigas —: fica marcada, para a tampinha
  //  da conta não voltar sozinha num outro aparelho; o nome vazio não casa com nenhuma salva)
  if (!V105.equipando && V105.snapEq && !TP.equipada) T.x.unshift({c:V105.snapEq, n:'', t:agora});
  if (T.x.length > 64) T.x.length = 64;
  if (V105.equipando) T.te = agora;
  v105Fotografa();
}
const tpSalvaAntes105 = tpSalva;
tpSalva = function(){
  try { v105Marca(); } catch (e) { console.error('v105 marca', e); }
  const r = tpSalvaAntes105.apply(this, arguments);
  try { v105Empurra(); } catch (_) {}
  return r;
};
const tpEquipaAntes105 = tpEquipa;
tpEquipa = function(cod){
  V105.equipando = true;
  try { return tpEquipaAntes105.apply(this, arguments); } finally { V105.equipando = false; }
};

// a cópia para a conta logo depois da mudança (o vigia da v82 esperava de 8 a 12 s e nunca no meio da partida)
function v105Pode(){
  try { return !!(C82.conta && R82.dono && R82.meta && R82.nuvem !== undefined && !C82.bloqueio && c82Pl()); } catch (_) { return false; }
}
function v105Sujo(){ try { const h = R82.hash(R82.copia()); return !(R82.meta.versao && h === R82.meta.hash); } catch (_) { return false; } }
function v105Empurra(ms){
  clearTimeout(V105.empT);
  V105.empT = setTimeout(v105EmpurraJa, ms || 1100);
}
function v105EmpurraJa(){
  V105.empT = 0;
  if (!v105Pode() || !v105Sujo()) return;
  if (C82.enviando || Date.now() - V105.ultimoEnvio < 2500){ v105Empurra(1500); return; }   // (um de cada vez; o limite da conta é 60 cópias em 10 min)
  V105.ultimoEnvio = Date.now(); V105.envios++;
  c82Envia(false);
}
// o SAIR DA CONTA manda o que falta antes de encerrar a sessão (no máximo ms)
function v105Descarrega(ms){
  return new Promise(res => {
    const t0 = Date.now(); let tentou = 0;
    const passo = () => {
      try {
        if (!v105Pode()) return res(false);
        if (!C82.enviando && !v105Sujo()) return res(true);
        if (Date.now() - t0 > ms) return res(false);
        if (!C82.enviando){
          if (tentou >= 2) return res(false);
          tentou++; V105.ultimoEnvio = Date.now(); V105.envios++; c82Envia(false);
        }
      } catch (_) { return res(false); }
      setTimeout(passo, 120);
    };
    passo();
  });
}
if (typeof v84Sair === 'function'){
  const v84SairAntes105 = v84Sair;
  v84Sair = function(){
    if (V105.saindo) return;
    V105.saindo = true;
    const args = arguments, ctx = this;
    let vai = false; try { vai = v105Pode() && (C82.enviando || v105Sujo()); } catch (_) {}
    if (vai){ try { aviso('Salvando o progresso na conta…'); } catch (_) {} }
    clearTimeout(V105.empT);
    (vai ? v105Descarrega(4500) : Promise.resolve(true)).then(() => { V105.saindo = false; return v84SairAntes105.apply(ctx, args); }, () => { V105.saindo = false; return v84SairAntes105.apply(ctx, args); });
  };
}
// o app indo para o fundo (ou fechando): o envio da cópia sai com keepalive (o login_cedo.js lê RACHA84.manterViva no fetch)
(function v105Fundo(){
  const marca = v => { try { if (window.RACHA84) window.RACHA84.manterViva = v; } catch (_) {} };
  document.addEventListener('visibilitychange', () => marca(document.visibilityState === 'hidden'), true);   // (antes do envio da v82)
  window.addEventListener('pagehide', () => marca(true), true);
  window.addEventListener('pageshow', () => marca(false));
})();

// os dois lados mudaram (QUAL PROGRESSO FICA?): as tampinhas juntam — o da conta leva as daqui; este aparelho fica com as da conta
function v105Agora(){ try { tpSalva(); } catch (_) {} try { return v105Lido(localStorage.getItem(TP_CHAVE)) || {}; } catch (_) { return {}; } }
function v105Aplica(o){                                     // a junta na memória e no aparelho (sem avisar a sala: a escolha vem depois)
  if (!o) return;
  TP.salvas = (o.salvas || []).map(v105LimpaSalva).filter(Boolean);
  if (typeof o.equipada === 'string' && (o.equipada === '' || (tpEhCodigo(o.equipada) && tpLe(o.equipada)))) TP.equipada = o.equipada;
  TP.v105 = {te:+o.te > 0 ? Math.floor(+o.te) : 0, x:v105LimpaTumbas(o.x)};
  v105Fotografa();
  tpSalvaAntes105();                                         // (sem marcar nada como novo: é a junta)
  try { perfil.skin = tpMinha(); perfilSalvar(); EMB.pop = 1; EMB.leveFeito = false; PFP.feito = false; if (lobby.aberto) lbRender(); } catch (_) {}
}
function v105JuntaNoConflito(n){
  const ch = n && n.dados && n.dados.chaves;
  if (!ch || typeof ch !== 'object' || V105.juntou.has(ch)) return;
  V105.juntou.add(ch);
  try { V105.hashOrig.set(ch, R82.hash(ch)); } catch (_) {}   // (a cópia da conta como veio: o que juntou daqui vai para a conta depois)
  const conta = v105Lido(ch['racha-tampa-v1']), aqui = v105Agora();
  if (!conta && !(aqui.salvas || []).length && !aqui.equipada) return;
  ch['racha-tampa-v1'] = JSON.stringify(v105Junta(conta || {}, aqui));   // O DA CONTA: nos empates, o da conta
  v105Aplica(v105Junta(aqui, conta || {}));                                  // O DESTE APARELHO: nos empates, o daqui
}
function v105JuntaNaPrimeira(conv){                         // LEVAR O PROGRESSO PARA A CONTA: as tampinhas da conta neste aparelho ficam
  if (!conv || typeof conv !== 'object' || V105.juntou.has(conv)) return;
  V105.juntou.add(conv);
  const aqui = v105Agora();
  if (!(aqui.salvas || []).length && !aqui.equipada) return;
  conv['racha-tampa-v1'] = JSON.stringify(v105Junta(v105Lido(conv['racha-tampa-v1']) || {}, aqui));
}
const c82ConflitoAntes105 = c82Conflito;
c82Conflito = function(n){ try { v105JuntaNoConflito(n); } catch (e) { console.error('v105 conflito', e); } return c82ConflitoAntes105.apply(this, arguments); };
const c82PrimeiraAntes105 = c82Primeira;
c82Primeira = function(conv){ try { v105JuntaNaPrimeira(conv); } catch (e) { console.error('v105 primeira', e); } return c82PrimeiraAntes105.apply(this, arguments); };
if (R82 && typeof R82.prepara === 'function'){              // (O DA CONTA: a hora da cópia como ela veio — o que juntou daqui fica "a mandar")
  const preparaAntes105 = R82.prepara;
  R82.prepara = function(chaves, meta, opc){
    try {
      const h = chaves && V105.hashOrig.get(chaves);
      if (h && opc && opc.hashDaCopia){ meta = Object.assign({}, meta, {hash:h}); opc = Object.assign({}, opc); delete opc.hashDaCopia; }
    } catch (_) {}
    return preparaAntes105.call(this, chaves, meta, opc);
  };
}

// a tampinha da conta (a coluna "tampa", gravada em cada equipar) que este aparelho nunca viu: entra nas salvas
function v105Conhecida(c){
  if (c === TP.equipada || TP.salvas.some(s => s.c === c)) return true;
  return V105T().x.some(t => t.c === c);
}
function v105DaConta(c){
  try {
    const cod = c && c.tampa;
    if (!tpEhCodigo(cod) || cod[0] !== 'T' || !tpLe(cod) || V105.dicas.has(cod)) return;
    if (!v105Pode() || C82.recarrega || (typeof RQ !== 'undefined' && RQ.on)) return;   // (depois de a cópia da conta chegar, fora da partida)
    V105.dicas.add(cod);
    if (v105Conhecida(cod)) return;
    if (typeof v95EhInicial === 'function' && v95EhInicial(cod)) return;
    if (typeof v101Esconde === 'function' && v101Esconde(cod)) return;
    if (typeof sk96CodTemFund === 'function' && sk96CodTemFund(cod) && !(typeof sk96TemFundador === 'function' && sk96TemFundador())) return;
    TP.livres.add(cod);
    if (TP.salvas.length < 24) TP.salvas.unshift({c:cod, n:'Da conta', f:false});
    if (!TP.equipada) tpEquipa(cod); else tpSalva();
  } catch (e) { console.error('v105 da conta', e); }
}
(function v105OuveConta(){
  const pl = (() => { try { return c82Pl(); } catch (_) { return null; } })();
  if (pl && typeof pl.ouvir === 'function'){ try { pl.ouvir(ev => { if (ev && ev.tipo === 'conta' && ev.conta) V105.contaNova = ev.conta; }); } catch (_) {} }
  setInterval(() => { if (V105.contaNova) v105DaConta(V105.contaNova); }, 2000);   // (a conta que chegou do servidor, depois de a cópia chegar)
})();

/* ================================================================ A CAUSA: as criadas com as peças que entram depois */
// O tampa_rua.js lê a racha-tampa-v1 antes de as peças da v76, da v96 e da v102 (a BOTÃO) entrarem nas listas: o código de
// quem usava uma delas não abria (e o "inválido" ficava guardado no TP_LIDOS para a sessão inteira). A leitura de lá agora
// guarda o que não deu para ler (TP.adiadas: tools/v105/cosmeticos.py); aqui, com todas as peças, lê de novo e devolve — na
// ordem de antes, com as que entraram por outro caminho no fim — e grava (o aparelho e, depois, a conta).
function v105Adiadas(){
  try { for (const [k, v] of [...TP_LIDOS]) if (v === null) TP_LIDOS.delete(k); } catch (_) {}   // (os "inválidos" de antes das peças novas)
  const A = TP.adiadas; if (!A) return false;
  delete TP.adiadas;
  const valida = c => tpEhCodigo(c) && c[0] === 'T' && !!tpLe(c);
  let mudou = false;
  if (Array.isArray(A.salvas) && A.salvas.length){
    const atuais = new Map(TP.salvas.map(s => [v105Chave(s), s])), novas = [];
    for (const s0 of A.salvas){
      if (!s0 || !valida(s0.c)) continue;
      const s = v105LimpaSalva(s0); if (!s) continue;
      const k = v105Chave(s); if (novas.some(x => v105Chave(x) === k)) continue;
      novas.push(atuais.get(k) || s); atuais.delete(k);
    }
    for (const s of atuais.values()) novas.push(s);
    if (novas.length !== TP.salvas.length || novas.some((s, i) => s !== TP.salvas[i])){ TP.salvas = novas.slice(0, 24); mudou = true; }
  }
  if (A.equipada && valida(A.equipada) && TP.equipada !== A.equipada){ TP.equipada = A.equipada; mudou = true; }
  if (mudou){
    V105.recuperou = {equipada:TP.equipada === A.equipada, salvas:TP.salvas.length};
    tpSalvaAntes105();
    try { perfil.skin = tpMinha(); perfilSalvar(); } catch (_) {}
  }
  return mudou;
}

/* ================================================================ começo */
try { v105Adiadas(); } catch (e) { console.error('v105 adiadas', e); }
try { v105LeHoras(); v105Fotografa(); } catch (e) { console.error('v105 horas', e); }
try { if (C82.conflitoAberto && R82.conflito) v105JuntaNoConflito(R82.conflito); } catch (_) {}   // (dentro do site: a pergunta já veio no começo)
try { if (R82.primeira && !C82.primeiraRespondida) v105JuntaNaPrimeira(R82.primeira); } catch (_) {}
try {                                                         // (o que já foi desenhado com a borda de antes é refeito)
  if (typeof sk76Refaz === 'function') sk76Refaz(); else TP_SPR.clear();
  if (typeof CLB_MINI !== 'undefined') CLB_MINI.clear();
  if (typeof V88C !== 'undefined' && V88C.mini) V88C.mini.clear();
  if (typeof BRASIL !== 'undefined' && BRASIL.tampas && BRASIL.tampas.clear) BRASIL.tampas.clear();
  if (typeof V91 !== 'undefined' && V91.moldes) for (const k in V91.moldes) V91.moldes[k].key = '';
} catch (_) {}
window.RachaCosmeticos105 = {deFabrica:v105DeFabrica, comBotao:v105ComBotao, norm:v105Norm, mesma:v105Mesma, medidas:v105Medidas, junta:v105Junta,
  estado:() => ({te:V105T().te, tumbas:V105T().x.slice(), envios:V105.envios, cinza:V105.cinza, desvio:V105.desvio}), empurra:v105EmpurraJa, descarrega:v105Descarrega, V105};
