/* ======================================================================================================================
   RACHA v92 · FASE 1 — O EDITOR DOS CONTROLES DA TELA, DE NOVO (tools/v92/hud.js; o estilo em app/public/game/v92-hud.css)
   O pedido: "recriar a experiência de edição do HUD para ser simples, rápida e confortável no celular" — o painel de tamanho
   e opacidade ficava no meio da tela, na frente dos botões (difícil de arrastar e de posicionar) e às vezes as posições se
   perdiam. A física, a sensibilidade dos comandos (o analógico, a área de toque, o toque armado) e o visual da v91 NÃO
   mudam: aqui só entra o editor (e o que ele guarda). O que mudou:
    1) A BARRA: no lugar da janela do meio, uma barra compacta (uma linha de botões de 44 px) que se arrasta pelo ⠿, recolhe
       no ▾ e sai sozinha de cima do controle escolhido (e, se der, de cima de todos). O tamanho, a opacidade e as opções
       abrem numa caixinha presa a ela, também fora do controle escolhido. Nada fica parado no meio da tela.
    2) EDIÇÃO LIVRE: qualquer controle se arrasta com o dedo para qualquer lugar (onde ficava o painel também). Soltar não
       empurra mais o botão para outro lugar (o v70 "escorregava" o botão que encostava em outro: era a posição perdida);
       se encostar, o contorno fica vermelho e a barra oferece ARRUMAR.
    3) A SELEÇÃO: tocar num controle escolhe ele (o contorno amarelo e o nome); o nome na barra abre a lista de todos (até
       o invisível). Dois dedos em cima do controle mudam o tamanho (a pinça).
    4) A PRÉVIA NA HORA: posição, tamanho e opacidade mudam na tela enquanto o dedo mexe.
    5) DESFAZER e REFAZER (↶ ↷; no teclado, Ctrl+Z e Ctrl+Y): cada gesto é um passo, sem restaurar o HUD inteiro.
    6) O SALVAMENTO AUTOMÁTICO: cada mudança fica guardada no aparelho (o rascunho). Se o editor fechar sem salvar (o app
       fechou, o celular desligou, a partida acabou no meio), o rascunho volta: no menu (CONTINUAR EDITANDO, SALVAR ASSIM,
       DESCARTAR) e ao abrir o editor. Sair pelo ✕ com mudanças pergunta antes (o Esc também).
    7) OS LAYOUTS: até 8 jeitos com nome (novo, renomear, excluir, os moldes de sempre), trocados com um toque — no editor,
       na pausa e em Ajustes › Controles.
    8) NA CONTA: os layouts vão com o progresso da conta (a chave racha-hud-layouts-v1, em app/contracts/progresso.ts e
       tools/v82/inicio.js): em outro aparelho, ou depois de limpar o cache, eles voltam ao entrar na conta. Com dois
       aparelhos mexendo, as listas se juntam (cada layout fica com a versão mais nova; o excluído não volta).
    9) A OPACIDADE DE 0% A 100% (era de 25%): com 0% o controle some na partida e o toque continua valendo no mesmo lugar;
       no editor ele aparece como um fantasma tracejado, para dar para achar e arrastar.
   10) O MODO TESTE (▶): no treino, o jogo anda com os controles ainda não salvos (dá para correr e chutar); numa partida
       (contra os bots ou online), o teste só mostra o que cada toque acertaria — nada vai para o servidor e a partida não
       muda (contra os bots ela fica parada, como no editor).
   11) RESTAURAR ESTE BOTÃO (nas opções do controle): só ele volta ao lugar, ao tamanho e à opacidade do molde.
   12) O CELULAR DEITADO: a barra mora dentro da área segura (o notch, a ilha e a barra de gestos ficam de fora), se arruma
       quando a tela gira ou muda de tamanho, e os controles continuam na tela virtual de sempre (1920 × 888, a mesma
       proporção em todo aparelho).
   ====================================================================================================================== */
const HE_CHAVE_LAYOUTS = 'racha-hud-layouts-v1';   // os layouts (vão para a conta com o progresso)
const HE_CHAVE_ESPELHO = 'racha-hud-espelho:';      // + o dono: a última lista vista NESTE aparelho (para juntar com a da conta)
const HE_CHAVE_RASCUNHO = 'racha-hud-rascunho-v1';  // as mudanças ainda não salvas do editor (o salvamento automático)
const HE_CHAVE_BARRA = 'racha-hud-barra-v1';        // onde a barra fica e se está recolhida (só deste aparelho)
const HE_CHAVE_DONO_HUD = 'racha-hud-dono';         // de quem é o HUD guardado no aparelho (racha-treino-hud-v11)
const HE_MAX_LAYOUTS = 8, HE_MAX_HIST = 60, HE_NOME_MAX = 20, HE_HIST_RASCUNHO = 15;
const HE_ORDEM = ['joy', 'kick', 'power', 'curva', 'reset', 'finta', 'drible'];   // a ordem da lista dos controles
const HE = {
  store:null, aberto:false, teste:false, testeReal:false, salvo:null, snapAntigo:null, hist:[], refaz:[], gesto:null, sujo:false,
  ptrs:new Map(), drag:null, pinca:null, teclaT:0, sb:new Map(), sbUlt:'', todosAntes:false,
  pop:'', popAncora:null, popDados:{}, barra:{px:null, py:null, recolhida:false}, barraDrag:null, barraAgora:null,
  layoutT:0, rascT:0, vigiaT:0, nuvemT:0, aviso:null, recupera:null, nuvemRecusada:false, falhouGravar:false, el:{}, aj:null
};
function heLe(k){ try { const s = localStorage.getItem(k); return s ? JSON.parse(s) : null; } catch (_) { return null; } }
function heGrava(k, v){
  try { const s = JSON.stringify(v); if (localStorage.getItem(k) !== s) localStorage.setItem(k, s); return localStorage.getItem(k) === s; } catch (_) { return false; }
}
function heApaga(k){ try { localStorage.removeItem(k); } catch (_) {} }
function heDono(){ try { return (window.RACHA82 && window.RACHA82.dono) || 'convidado'; } catch (_) { return 'convidado'; } }
const heNum = (v, lo, hi, d) => typeof v === 'number' && isFinite(v) ? Math.max(lo, Math.min(hi, v)) : d;
const heLimpa = (s, n, d) => { const t = Array.from(String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f<>]/g, '').replace(/\s+/g, ' ').trim()).slice(0, n).join(''); return t || d; };
const heNomeDe = k => BASE[k] ? BASE[k].nome : String(k || '').toUpperCase();

/* ---------------------------------------------------------------- 1) o estado dos controles (o que o editor muda e guarda) */
function heObjBase(k){ return HUD_TROCA.indexOf(k) >= 0 ? HUDM.base[k] : hud[k]; }   // (o PASSE e o CHUTE do layout de sempre, fora da GINGA)
function heCopiaCtl(k, e){
  const o = {x:+e.x, y:+e.y, s:+e.s, a:+e.a, fx:e.fx !== false};   // fx: os efeitos ao pressionar (v93: desligado, o botão fica parado)
  if ('oc' in e) o.oc = !!e.oc;
  if (k === 'joy'){ o.adere = !!e.adere; o.segue = !!e.segue; o.km = +e.km; o.al = +e.al; }
  return o;
}
function heEstado(){                                             // {base:{joy, kick…}, ginga:{kick, power, finta, drible}, molde}
  const base = {}, ginga = {};
  for (const k in HUD_PADRAO) base[k] = heCopiaCtl(k, heObjBase(k));
  for (const k of HUD_TROCA) ginga[k] = heCopiaCtl(k, HUDM.ginga[k]);
  return {base, ginga, molde:HUDM.molde};
}
function heEstadoPadrao(){
  const base = {}, ginga = {};
  for (const k in HUD_PADRAO) base[k] = heCopiaCtl(k, HUD_PADRAO[k]);
  for (const k of HUD_TROCA) ginga[k] = heCopiaCtl(k, HUD_GINGA_PADRAO[k]);
  return {base, ginga, molde:'destro'};
}
function heLimpaCtl(k, s, d){                                     // um controle que veio de fora (guardado, da conta): só o conhecido, nos limites
  const o = Object.assign({}, d);
  if (!s || typeof s !== 'object') return o;
  o.x = heNum(s.x, 0, W, d.x); o.y = heNum(s.y, 0, H, d.y); o.s = heNum(s.s, TAM_MIN, TAM_MAX, d.s); o.a = heNum(s.a, OPAC_MIN, 1, d.a);
  o.fx = typeof s.fx === 'boolean' ? s.fx : d.fx !== false;
  if ('oc' in d && typeof s.oc === 'boolean') o.oc = s.oc;
  if (k === 'joy'){
    if (typeof s.adere === 'boolean') o.adere = s.adere;
    if (typeof s.segue === 'boolean') o.segue = s.segue;
    o.km = heNum(s.km, KM_MIN, KM_MAX, d.km); o.al = heNum(s.al, AL_MIN, AL_MAX, d.al);
  }
  return o;
}
function heLimpaEstado(o){
  const d = heEstadoPadrao(), base = {}, ginga = {};
  for (const k in HUD_PADRAO) base[k] = heLimpaCtl(k, o && o.base && o.base[k], d.base[k]);
  for (const k of HUD_TROCA) ginga[k] = heLimpaCtl(k, o && o.ginga && o.ginga[k], d.ginga[k]);
  return {base, ginga, molde:o && typeof o.molde === 'string' && HUD_MOLDES[o.molde] ? o.molde : 'destro'};
}
function heAplicaCtl(k, e, s){
  if (!e || !s) return;
  e.s = heNum(s.s, TAM_MIN, TAM_MAX, e.s); e.a = heNum(s.a, OPAC_MIN, 1, e.a);
  e.fx = typeof s.fx === 'boolean' ? s.fx : true;
  if ('oc' in e && typeof s.oc === 'boolean') e.oc = s.oc;
  if (k === 'joy'){
    if (typeof s.adere === 'boolean') e.adere = s.adere;
    if (typeof s.segue === 'boolean') e.segue = s.segue;
    e.km = heNum(s.km, KM_MIN, KM_MAX, e.km); e.al = heNum(s.al, AL_MIN, AL_MAX, e.al);
  }
  e.x = heNum(s.x, 0, W, e.x); e.y = heNum(s.y, 0, H, e.y);
}
function heAplica(st){                                           // escreve nos objetos de sempre (hud, HUDM.base e HUDM.ginga): quem desenha e quem toca vê na hora
  if (!st) return;
  for (const k in HUD_PADRAO){ heAplicaCtl(k, heObjBase(k), st.base && st.base[k]); hudPrende('base', k); }
  for (const k of HUD_TROCA){ heAplicaCtl(k, HUDM.ginga[k], st.ginga && st.ginga[k]); hudPrende('ginga', k); }
  if (typeof st.molde === 'string' && HUD_MOLDES[st.molde]) HUDM.molde = st.molde;
  hudModoConfere();
}
function heChave(st){                                            // (para comparar dois estados: os números arredondados)
  if (!st || !st.base) return '';
  const r = (v, n) => Math.round((+v || 0)*n)/n;
  const f = (k, c) => !c ? '-' : k + ':' + r(c.x, 10) + ',' + r(c.y, 10) + ',' + r(c.s, 1000) + ',' + r(c.a, 1000) + ',' + (c.oc ? 1 : 0) + (c.fx === false ? 'p' : '')
    + (k === 'joy' ? ',' + (c.adere ? 1 : 0) + (c.segue ? 1 : 0) + ',' + r(c.km, 1000) + ',' + r(c.al, 1000) : '');
  let s = (st.molde || '') + '|';
  for (const k in HUD_PADRAO) s += f(k, st.base[k]) + ';';
  s += '|';
  for (const k of HUD_TROCA) s += f(k, st.ginga && st.ginga[k]) + ';';
  return s;
}
const heIgual = (a, b) => !!a && !!b && heChave(a) === heChave(b);

/* ---------------------------------------------------------------- 2) os layouts (a lista guardada; vai para a conta) */
function heNovoId(){ let s = 'l'; for (let i = 0; i < 9; i++) s += 'abcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random()*36)]; return s; }
function heNovoLayout(nome, st, prov){                           // prov: o começo automático (o padrão, ou o HUD de outra pessoa): some quando chegar um de verdade
  const t = Date.now();
  return {id:heNovoId(), nome:heLimpa(nome, HE_NOME_MAX, 'Layout'), criado:t, atualizado:prov ? 0 : t, prov:!!prov, estado:heLimpaEstado(st)};
}
function heCorta(lista, ativo){                                  // no máximo 8: saem os mais antigos (nunca o que está em uso)
  if (lista.length <= HE_MAX_LAYOUTS) return lista;
  const fora = lista.filter(L => L.id !== ativo).sort((a, b) => a.atualizado - b.atualizado).slice(0, lista.length - HE_MAX_LAYOUTS).map(L => L.id);
  return lista.filter(L => fora.indexOf(L.id) < 0);
}
function heNomesUnicos(lista){                                   // dois "Principal" (cada aparelho criou o seu): o segundo vira "Principal 2"
  const usados = new Set();
  for (const L of lista){
    let n = L.nome, i = 2;
    while (usados.has(n.toLowerCase())){ const suf = ' ' + i++; n = Array.from(L.nome).slice(0, HE_NOME_MAX - suf.length).join('') + suf; }
    L.nome = n; usados.add(n.toLowerCase());
  }
}
function heLimpaStore(o){                                        // a lista que veio de fora (guardada, da conta, de outra versão): conferida
  if (!o || typeof o !== 'object' || o.v !== 1 || !Array.isArray(o.lista)) return null;
  const vistos = new Set(), lista = [];
  for (const L of o.lista){
    if (!L || typeof L !== 'object' || typeof L.id !== 'string' || !/^l[a-z0-9]{3,16}$/.test(L.id) || vistos.has(L.id)) continue;
    vistos.add(L.id);
    lista.push({id:L.id, nome:heLimpa(L.nome, HE_NOME_MAX, 'Layout ' + (lista.length + 1)), criado:heNum(L.criado, 0, 9e15, 0),
      atualizado:heNum(L.atualizado, 0, 9e15, 0), prov:L.prov === true, estado:heLimpaEstado(L.estado)});
  }
  if (!lista.length) return null;
  const apagados = Array.isArray(o.apagados) ? o.apagados.filter(a => a && typeof a.id === 'string' && /^l[a-z0-9]{3,16}$/.test(a.id) && Number.isFinite(a.quando))
    .slice(-40).map(a => ({id:a.id, quando:a.quando})) : [];
  const ativo = typeof o.ativo === 'string' && vistos.has(o.ativo) ? o.ativo : lista[0].id;
  heNomesUnicos(lista);
  return {v:1, ativo, ativoEm:heNum(o.ativoEm, 0, 9e15, 0), lista:heCorta(lista, ativo), apagados};
}
function heJunta(A, B){                                          // duas listas (a da conta × a deste aparelho): cada layout com a versão mais nova
  if (!A) return B; if (!B) return A;
  const tomb = new Map();
  for (const t of A.apagados.concat(B.apagados)) if (!tomb.has(t.id) || tomb.get(t.id) < t.quando) tomb.set(t.id, t.quando);
  const por = new Map();
  for (const L of A.lista.concat(B.lista)){ const j = por.get(L.id); if (!j || L.atualizado > j.atualizado) por.set(L.id, L); }
  let lista = Array.from(por.values()).filter(L => !(tomb.has(L.id) && tomb.get(L.id) >= L.atualizado));
  if (lista.some(L => !L.prov)) lista = lista.filter(L => !L.prov);   // (o começo automático sai quando há um de verdade)
  if (!lista.length) lista = [A.lista[0]];
  lista.sort((a, b) => a.criado - b.criado || (a.id < b.id ? -1 : 1));
  lista = lista.map(L => Object.assign({}, L));
  heNomesUnicos(lista);
  const pref = A.ativoEm >= B.ativoEm ? [A, B] : [B, A];
  const ativo = pref.map(s => s.ativo).find(id => lista.some(L => L.id === id)) || lista[0].id;
  const apagados = Array.from(tomb, ([id, quando]) => ({id, quando})).sort((a, b) => a.quando - b.quando).slice(-40);
  return {v:1, ativo, ativoEm:Math.max(A.ativoEm, B.ativoEm), lista:heCorta(lista, ativo), apagados};
}
function heAtivo(){ return HE.store.lista.find(L => L.id === HE.store.ativo) || HE.store.lista[0]; }
function heGravaStore(){
  const ok = heGrava(HE_CHAVE_LAYOUTS, HE.store);
  heGrava(HE_CHAVE_ESPELHO + heDono(), HE.store);
  HE.falhouGravar = !ok;
  return ok;
}
const heSalvarBase = salvar;                                     // o salvar de sempre (racha-treino-hud-v11: o HUD, a câmera e o resto)
function heSalvarAparelho(){ try { heSalvarBase(); } catch (_) {} }
function heIniciaLayouts(){
  const dono = heDono();
  const S = heLimpaStore(heLe(HE_CHAVE_LAYOUTS)), M = heLimpaStore(heLe(HE_CHAVE_ESPELHO + dono));
  let st = heJunta(S, M);
  const atual = heEstado(), padrao = heIgual(atual, heEstadoPadrao());
  let donoHud = null; try { donoHud = localStorage.getItem(HE_CHAVE_DONO_HUD); } catch (_) {}
  const meu = donoHud === null || donoHud === dono;             // (null: o aparelho ainda não tinha a Fase 1: o HUD é de quem joga aqui)
  if (!st){                                                      // a primeira vez: o HUD que está no aparelho vira o layout "Principal"
    const L = heNovoLayout('Principal', atual, padrao || !meu);
    st = {v:1, ativo:L.id, ativoEm:L.prov ? 0 : Date.now(), lista:[L], apagados:[]};
  } else if (!M && donoHud === null && !padrao && !st.lista.some(L => heIgual(L.estado, atual))){
    // a lista veio da conta (outro aparelho) e este aparelho tinha o HUD dele, mexido: ele vira mais um layout e fica valendo
    const L = heNovoLayout('Deste aparelho', atual, false);
    st.lista.push(L); heNomesUnicos(st.lista); st.ativo = L.id; st.ativoEm = Date.now(); st.lista = heCorta(st.lista, st.ativo);
  }
  HE.store = st;
  const A = heAtivo();
  if (!heIgual(heEstado(), A.estado)){ heAplica(A.estado); heSalvarAparelho(); }
  heGravaStore();
  try { localStorage.setItem(HE_CHAVE_DONO_HUD, dono); } catch (_) {}
}
// o HUD mudou por fora do editor (os moldes e o tamanho do painel de testes, o analógico fixo/flutuante…): vale para o layout em uso
salvar = function(){
  const r = heSalvarBase.apply(this, arguments);
  try { if (!HE.aberto && HE.store) heGuardaNoAtivo(); } catch (_) {}
  return r;
};
function heGuardaNoAtivo(){
  const st = heEstado(), L = heAtivo();
  if (heIgual(st, L.estado)) return;
  L.estado = heLimpaEstado(st); L.atualizado = Date.now(); L.prov = false;
  heGravaStore(); heNuvemLogo();
}
function heUsaLayout(id){                                        // trocar o layout em uso (fora do editor: na pausa e nos Ajustes)
  const L = HE.store.lista.find(x => x.id === id); if (!L) return null;
  HE.store.ativo = id; HE.store.ativoEm = Date.now();
  heAplica(L.estado); heSalvarAparelho(); heGravaStore(); heNuvemLogo();
  return L;
}

/* ---------------------------------------------------------------- 3) a conta (os layouts vão com o progresso; ver tools/v82) */
function heNuvemLogo(){
  clearTimeout(HE.nuvemT);
  HE.nuvemT = setTimeout(() => { try { const C = window.RachaContas82; if (C && C.conta && C.conta()) C.envia(false); } catch (_) {} }, 1800);
}
function heNuvemEstado(){
  let C = null, conta = null; try { C = window.RachaContas82; conta = C && C.conta ? C.conta() : null; } catch (_) {}
  if (!conta) return {cls:'', txt:'Só neste aparelho. Entre na sua conta para guardar os layouts na nuvem.'};
  if (HE.nuvemRecusada) return {cls:'ruim', txt:'A conta não aceitou os layouts (a plataforma é de antes da Fase 1): ficam neste aparelho.'};
  const e = C.estado ? C.estado() : '';
  if (e === 'salvando') return {cls:'', txt:'Salvando na conta ' + conta.idPublico + '…'};
  if (e === 'erro') return {cls:'ruim', txt:'Sem falar com a conta agora: salvo neste aparelho, sobe quando der.'};
  if (e === 'conflito') return {cls:'ruim', txt:'A conta tem outra cópia: escolha no menu qual fica (os layouts se juntam).'};
  return {cls:'ok', txt:'Na conta ' + conta.idPublico + (e === 'salvo' ? ' · salvo' : '')};
}
(function heNuvemTrava(){                                         // uma plataforma antiga recusa a chave nova: o progresso continua subindo, sem ela
  const R = window.RACHA82; if (!R || typeof R.copia !== 'function') return;
  try { HE.nuvemRecusada = sessionStorage.getItem('racha-hud-nuvem-recusada') === '1'; } catch (_) {}
  const antes = R.copia;
  R.copia = function(){ const o = antes.apply(this, arguments); if (HE.nuvemRecusada && o) delete o[HE_CHAVE_LAYOUTS]; return o; };
  setInterval(() => {
    try {
      const C = window.RachaContas82, c = C && C.C82;
      if (!HE.nuvemRecusada && c && c.estado === 'erro' && String(c.erro || '').indexOf(HE_CHAVE_LAYOUTS) >= 0){
        HE.nuvemRecusada = true; try { sessionStorage.setItem('racha-hud-nuvem-recusada', '1'); } catch (_) {}
        C.envia(true);
      }
    } catch (_) {}
  }, 5000);
})();

/* ---------------------------------------------------------------- 4) o rascunho (o salvamento automático) */
function heRascunhoAgenda(){ clearTimeout(HE.rascT); HE.rascT = setTimeout(heRascunhoGrava, 250); }
function heRascunhoGrava(){
  clearTimeout(HE.rascT); HE.rascT = 0;
  if (!HE.aberto || !HE.store) return;
  const st = heEstado();
  if (heIgual(st, HE.salvo)){ heApaga(HE_CHAVE_RASCUNHO); return; }   // (igual ao salvo: não há o que recuperar)
  heGrava(HE_CHAVE_RASCUNHO, {v:1, dono:heDono(), layout:HE.store.ativo, quando:Date.now(), estado:st,
    hist:HE.hist.slice(-HE_HIST_RASCUNHO).map(h => ({st:h.st, rotulo:h.rotulo})), sel});
}
function heRascunhoLe(){
  const o = heLe(HE_CHAVE_RASCUNHO);
  if (!o || o.v !== 1 || o.dono !== heDono() || typeof o.layout !== 'string' || !o.estado) return null;
  const hist = Array.isArray(o.hist) ? o.hist.slice(-HE_HIST_RASCUNHO).filter(h => h && h.st).map(h => ({st:heLimpaEstado(h.st), rotulo:heLimpa(h.rotulo, 48, 'mudança')})) : [];
  return {layout:o.layout, quando:heNum(o.quando, 0, 9e15, 0), estado:heLimpaEstado(o.estado), hist, sel:typeof o.sel === 'string' && BASE[o.sel] ? o.sel : null};
}
function heRecuperaConfere(){
  const r = heRascunhoLe();
  const L = r && HE.store.lista.find(x => x.id === r.layout);
  if (!r || !L || heIgual(r.estado, L.estado)){ if (r) heApaga(HE_CHAVE_RASCUNHO); HE.recupera = null; return null; }
  HE.recupera = r; return r;
}
function heHa(ms){
  const s = Math.max(0, Math.round((Date.now() - ms)/1000));
  return s < 60 ? 'agora há pouco' : s < 3600 ? 'há ' + Math.round(s/60) + ' min' : s < 86400 ? 'há ' + Math.round(s/3600) + ' h' : 'há ' + Math.round(s/86400) + (Math.round(s/86400) === 1 ? ' dia' : ' dias');
}
function heRecuperaPop(){                                         // no menu: o editor fechou sem salvar da última vez
  const r = HE.recupera; if (!r) return false;
  const L = HE.store.lista.find(x => x.id === r.layout); if (!L){ HE.recupera = null; return false; }
  abrePop(c => {
    c.append(nodo('span', 'pop-tag', 'CONTROLES'), nodo('h2', null, 'MUDANÇAS NÃO SALVAS'),
      nodo('p', 'pop-txt', 'O editor dos controles fechou antes de você salvar (layout "' + L.nome + '", ' + heHa(r.quando) + '). As posições ficaram guardadas neste aparelho.'));
    const a = nodo('div', 'pop-acoes');
    a.append(botaoPop('DESCARTAR', '', () => { som.clique(); heApaga(HE_CHAVE_RASCUNHO); HE.recupera = null; fechaPop(); aviso('Mudanças descartadas'); }),
      botaoPop('SALVAR ASSIM', '', () => {
        som.clique(); HE.recupera = null;
        L.estado = heLimpaEstado(r.estado); L.atualizado = Date.now(); L.prov = false;
        if (L.id === HE.store.ativo){ heAplica(L.estado); heSalvarAparelho(); }
        heGravaStore(); heApaga(HE_CHAVE_RASCUNHO); heNuvemLogo(); fechaPop(); aviso('Controles salvos');
      }),
      botaoPop('CONTINUAR EDITANDO', 'verde', () => { som.clique(); HE.recupera = null; fechaPop(); try { abreTreinoLivreParaEditar(); } catch (_) {} }));
    c.appendChild(a);
  });
  return true;
}
const heFilaVolta = () => filaPops();
const heFilaAntes = filaPops;
filaPops = function(){
  const r = heFilaAntes.apply(this, arguments);
  try {
    if (HE.recupera && lobby.aberto && !HE.aberto){
      const livre = LB.pop.hidden && !(typeof ONB !== 'undefined' && (ONB.aberto || ONB.aquece)) && !(window.RachaContas82 && RachaContas82.C82 && RachaContas82.C82.popAberto);
      if (livre) heRecuperaPop();
      else if (filaPop.indexOf(heFilaVolta) < 0) filaPop.push(heFilaVolta);   // (depois da janela que está aberta)
    }
  } catch (_) {}
  return r;
};

/* ---------------------------------------------------------------- 5) desfazer e refazer (cada gesto é um passo) */
function heGestoComeca(rotulo){ if (!HE.gesto) HE.gesto = {antes:heEstado(), rotulo}; }
function heGestoFim(){
  const g = HE.gesto; HE.gesto = null; clearTimeout(HE.teclaT); HE.teclaT = 0;
  if (!g || heIgual(g.antes, heEstado())) return false;
  HE.hist.push({st:g.antes, rotulo:g.rotulo}); if (HE.hist.length > HE_MAX_HIST) HE.hist.shift();
  HE.refaz.length = 0;
  heMudou();
  return true;
}
function heAcao(rotulo, fn){ heGestoFim(); heGestoComeca(rotulo); try { fn(); } finally { if (!heGestoFim()) heSync(); } }
function heMudou(){
  if (!HE.aberto) return;
  HE.sujo = !heIgual(heEstado(), HE.salvo);
  heRascunhoAgenda(); heSync(); heLayoutLogo();
}
function heDesfaz(){
  heGestoFim();
  const h = HE.hist.pop(); if (!h) return;
  HE.refaz.push({st:heEstado(), rotulo:h.rotulo});
  heAplica(h.st); if (!controleVisivel(sel)) sel = 'power';
  heAvisa('Desfeito: ' + h.rotulo, ''); heMudou(); if (HE.pop) heMontaPop();
}
function heRefaz(){
  heGestoFim();
  const h = HE.refaz.pop(); if (!h) return;
  HE.hist.push({st:heEstado(), rotulo:h.rotulo});
  heAplica(h.st); if (!controleVisivel(sel)) sel = 'power';
  heAvisa('Refeito: ' + h.rotulo, ''); heMudou(); if (HE.pop) heMontaPop();
}
function heTeclaGesto(rotulo){                                   // (as setas do teclado: os toques seguidos viram um passo só)
  heGestoComeca(rotulo); clearTimeout(HE.teclaT); HE.teclaT = setTimeout(() => heGestoFim(), 700);
}

/* ---------------------------------------------------------------- 6) abrir, salvar, sair, interromper */
function heAbre(){
  if (HE.aberto){ if (HE.teste) heTesteSai(); return; }
  if (editing || lobby.aberto || !HE.store) return;
  HUDM.todos = false; HUDM.editaGinga = RQ.on && RQ.jogo === 'ginga';
  HE.snapAntigo = JSON.stringify(estadoHud());                  // (o volume, a câmera e o resto voltam no "sair sem salvar", como no Cancelar de antes)
  editing = true; limparEntrada(); hudModoConfere();
  joy.id = null; joy.dx = joy.dy = 0; joy.ativo = false; ptrs.clear(); drag.id = null;
  for (const k in keys) keys[k] = false;
  acc = 0; guardaAnterior();                                     // o jogo fica parado enquanto você edita (offline; online ele segue no servidor e a sua tampinha fica parada)
  HE.aberto = true; HE.teste = false; HE.testeReal = false; HE.pop = ''; HE.popDados = {}; HE.hist = []; HE.refaz = []; HE.gesto = null; HE.aviso = null;
  HE.ptrs.clear(); HE.drag = HE.pinca = null; HE.sb.clear();
  heAplica(heAtivo().estado);                                    // (o editor parte do que está salvo no layout em uso)
  HE.salvo = heEstado(); HE.sujo = false;
  const r = heRascunhoLe();                                      // o salvamento automático: as mudanças de antes que não foram salvas
  if (r && r.layout === HE.store.ativo && !heIgual(r.estado, HE.salvo)){
    heAplica(r.estado); HE.hist = r.hist.slice(); if (r.sel) sel = r.sel; HE.sujo = true;
    HE.aviso = {t:'Voltaram as mudanças que não tinham sido salvas (' + heHa(r.quando) + ').', cls:'bom', ate:Date.now() + 9000, acao:'DESCARTAR', fn:() => {
      heGestoFim(); HE.hist = []; HE.refaz = []; heAplica(HE.salvo); heApaga(HE_CHAVE_RASCUNHO); HE.aviso = null; heMudou(); heAvisa('Mudanças descartadas.', '');
    }};
  }
  HE.recupera = null; HE.barraAgora = null;                     // (a barra começa onde quem joga deixou da última vez)
  if (!controleVisivel(sel)) sel = controleVisivel('power') ? 'power' : 'joy';
  heMonta();
  try { cv.style.cursor = 'default'; } catch (_) {}
  ui.painel.hidden = false;
  heSync(); heLayout(true);
  heVigia(true);
}
function heCommit(){                                             // as mudanças valem: o layout em uso, o aparelho e (com a conta) a nuvem
  heGestoFim();
  const st = heEstado(), L = heAtivo();
  if (!heIgual(st, L.estado) || L.prov){ L.estado = heLimpaEstado(st); L.atualizado = Date.now(); L.prov = false; }
  const ok = heGravaStore();
  heSalvarAparelho();
  HE.salvo = heEstado(); HE.sujo = false;
  heApaga(HE_CHAVE_RASCUNHO);
  heNuvemLogo();
  return ok;
}
function heFecha(salva){
  if (!HE.aberto) return;
  if (HE.teste) heTesteSai();
  heCancelaGestos();
  let ok = true;
  if (salva){
    ok = heCommit();
    if (!ok){                                                    // v94 (do RACHA-v92-melhorado): o aparelho não guardou — o editor fica
      HE.sujo = true;                                            //  aberto (dá para tentar de novo ou cancelar) e diz o motivo
      try { x49Toast('Não foi possível salvar os controles neste aparelho (o armazenamento está cheio ou bloqueado). Libere espaço e salve de novo, ou cancele.'); } catch (_) {}
      return;
    }
  }
  else {
    heGestoFim();
    try { if (HE.snapAntigo) restauraHud(JSON.parse(HE.snapAntigo)); } catch (_) {}
    heAplica(HE.salvo);
    heApaga(HE_CHAVE_RASCUNHO);
  }
  heEncerra();
  if (salva){
    let conta = null; try { conta = window.RachaContas82 && RachaContas82.conta && RachaContas82.conta(); } catch (_) {}
    const nome = heAtivo().nome;
    try { x49Toast('Controles salvos · ' + nome + (conta && !HE.nuvemRecusada ? ' · indo para a conta' : '')); } catch (_) {}
  }
}
function heEncerra(){
  editing = false; HUDM.editaGinga = false; HUDM.todos = false; hudModoConfere();
  drag.id = null; ptrs.clear(); HE.ptrs.clear(); HE.drag = HE.pinca = null; HE.sb.clear();
  HE.aberto = false; HE.teste = false; HE.testeReal = false; HE.pop = ''; HE.popDados = {}; HE.aviso = null;
  if (HE.el.pop){ HE.el.pop.hidden = true; HE.el.pop.textContent = ''; }
  ui.painel.hidden = true; ui.painel.classList.remove('he-arrastando');
  try { cv.style.cursor = ''; } catch (_) {}
  limparEntrada(); last = performance.now();
  heVigia(false); heGravaBarra();
  try { cv.focus({preventScroll:true}); } catch (_) {}
}
function hePedeFechar(deEsc){                                    // o ✕ e o Esc: primeiro fecha o que estiver aberto por cima
  if (!HE.aberto) return;
  if (HE.pop){
    if (HE.popDados.nome){ HE.popDados.nome = null; heMontaPop(); heLayout(true); return; }
    heFechaPop(); if (deEsc) return;
  }
  if (HE.teste){ heTesteSai(); return; }
  heGestoFim();
  if (!HE.sujo){ heFecha(false); return; }
  heAbrePop('conf', HE.el.sair);
}
function heInterrompe(){                                         // o editor fechou sem ninguém pedir (a partida acabou, voltou ao menu): o rascunho fica
  if (!HE.aberto) return;
  heCancelaGestos(); heGestoFim(); heRascunhoGrava();
  if (HE.teste){ HE.teste = false; HUDM.todos = !!HE.todosAntes; }
  heAplica(HE.salvo);                                            // o jogo segue com os controles salvos; as mudanças esperam no rascunho
  heEncerra();
  if (heRecuperaConfere() && lobby.aberto){ try { filaPops(); } catch (_) {} }
}
function heVigia(on){ clearInterval(HE.vigiaT); HE.vigiaT = on ? setInterval(heVigiaPasso, 300) : 0; }
function heVigiaPasso(){
  if (!HE.aberto){ heVigia(false); return; }
  if (lobby.aberto || fimAberto() || trFimAberto()){ heInterrompe(); return; }
  if (HE.aviso && HE.aviso.ate && HE.aviso.ate < Date.now()){ HE.aviso = null; heSync(); heLayoutLogo(); }
  const b = HE.barraAgora, A = heArea();
  if (b && A.w > 0 && (b.x + b.w > A.w + 2 || b.y + b.h > A.h + 2)) heLayout(true);   // (a tela girou ou mudou de tamanho)
}
function heAvisa(t, cls, ms){
  HE.aviso = {t, cls:cls || '', ate:Date.now() + (ms || 3200)};
  heSync(); heLayoutLogo();
}

/* ---------------------------------------------------------------- 7) o toque no editor: escolher, arrastar e a pinça */
function heEscalaTela(){ const r = cv.getBoundingClientRect(); return r.width/W || 1; }   // px da tela por px da tela virtual
function heAlvo(x, y){                                           // o controle debaixo do dedo: o centro mais perto (pelo tamanho de cada um)
  const pad = 10/heEscalaTela();
  let best = null, bd = Infinity;
  for (const k of HE_ORDEM){
    if (!controleVisivel(k)) continue;
    const c = el(k), r = Math.max(c.r, 40), d = Math.hypot(x - c.x, y - c.y);
    if (d > r + pad) continue;
    const s = d/r - (k === sel ? .06 : 0);                       // (empate: fica o que já está escolhido)
    if (s < bd){ bd = s; best = k; }
  }
  return best;
}
function heArrastando(on){ if (ui.painel) ui.painel.classList.toggle('he-arrastando', !!on); }
function heDown(e){
  const p = vpos(e), x = p[0], y = p[1];
  try { cv.setPointerCapture(e.pointerId); } catch (_) {}
  HE.ptrs.set(e.pointerId, {x, y});
  if (HE.drag && !HE.pinca && HE.ptrs.size === 2){ heComecaPinca(); return; }
  if (HE.ptrs.size > 1) return;
  const k = heAlvo(x, y);
  if (!k) return;
  const c = hud[k];
  HE.drag = {id:e.pointerId, k, ox:c.x - x, oy:c.y - y, x0:x, y0:y, mexeu:false};
  if (k !== sel){ sel = k; heSync(); heLayoutLogo(); }
}
function heMoveP(e){
  const q = HE.ptrs.get(e.pointerId); if (!q) return false;
  const p = vpos(e); q.x = p[0]; q.y = p[1];
  if (HE.pinca){ hePincaMove(); return true; }
  const d = HE.drag; if (!d || d.id !== e.pointerId) return true;
  if (!d.mexeu){
    if (Math.hypot(q.x - d.x0, q.y - d.y0) < 6/heEscalaTela()) return true;   // (um tremidinho do dedo não arrasta: é escolher)
    d.mexeu = true; heGestoComeca('mover ' + heNomeDe(d.k)); heArrastando(true);
  }
  const c = hud[d.k]; c.x = q.x + d.ox; c.y = q.y + d.oy; prender(d.k);
  return true;
}
function heUp(e){
  if (!HE.ptrs.has(e.pointerId)) return false;
  HE.ptrs.delete(e.pointerId);
  if (HE.pinca){ if (HE.ptrs.size < 2) heFimPinca(); return true; }
  const d = HE.drag;
  if (d && d.id === e.pointerId){
    HE.drag = null; heArrastando(false);
    if (d.mexeu){ heGestoFim(); heRascunhoGrava(); }
    else if (HE.barra.recolhida) heRecolhe(false);               // um toque (sem arrastar) é escolher: as opções aparecem
    heSync(); heLayoutLogo();
  }
  return true;
}
function heComecaPinca(){
  const d = HE.drag, [a, b] = Array.from(HE.ptrs.values());
  HE.pinca = {k:d.k, d0:Math.max(20, Math.hypot(a.x - b.x, a.y - b.y)), s0:hud[d.k].s};
  if (!d.mexeu){ d.mexeu = true; heGestoComeca('tamanho do ' + heNomeDe(d.k)); }
  else if (HE.gesto) HE.gesto.rotulo = 'mover e mudar o tamanho do ' + heNomeDe(d.k);
  heArrastando(true);
}
function hePincaMove(){
  const P2 = HE.pinca, v = Array.from(HE.ptrs.values()); if (!P2 || v.length < 2) return;
  const dd = Math.hypot(v[0].x - v[1].x, v[0].y - v[1].y);
  hud[P2.k].s = Math.round(Math.max(TAM_MIN, Math.min(TAM_MAX, P2.s0*dd/P2.d0))*100)/100; prender(P2.k);
  heSyncValores();
}
function heFimPinca(){
  const P2 = HE.pinca; HE.pinca = null;
  const resto = Array.from(HE.ptrs.entries())[0];
  if (resto && HE.drag){                                          // o dedo que ficou continua arrastando
    const [id, q] = resto, c = hud[P2.k];
    HE.drag = {id, k:P2.k, ox:c.x - q.x, oy:c.y - q.y, x0:q.x, y0:q.y, mexeu:true};
  } else { HE.drag = null; heArrastando(false); heGestoFim(); heRascunhoGrava(); heSync(); heLayoutLogo(); }
}
function heCancelaGestos(){                                      // (o sistema tirou o dedo: o que foi feito até ali fica)
  const tinha = HE.drag || HE.pinca;
  HE.ptrs.clear(); HE.drag = HE.pinca = null; HE.sb.clear(); heArrastando(false);
  if (tinha) heGestoFim();
}
// a escuta do toque: no editor (e no teste de partida) o canvas é do editor; no teste do treino, do jogo
window.addEventListener('pointerdown', e => {
  if (!HE.aberto) return;
  if (e.target !== cv){
    if (HE.pop && HE.el.pop && !HE.el.pop.contains(e.target) && !(HE.el.barra && HE.el.barra.contains(e.target))) heFechaPop();
    return;
  }
  if (!editing){ if (HE.teste && HE.testeReal) heTesteObserva(e); return; }
  e.stopImmediatePropagation(); e.preventDefault();
  try { cv.focus({preventScroll:true}); } catch (_) {}
  if (HE.pop) heFechaPop();
  if (HE.teste){ heSbDown(e); return; }
  heDown(e);
}, true);
window.addEventListener('pointermove', e => {
  if (!HE.aberto || !editing) return;
  const usou = HE.teste ? heSbMove(e) : heMoveP(e);
  if (usou){ e.stopImmediatePropagation(); e.preventDefault(); }
}, true);
function heFimToque(e){
  if (!HE.aberto || !editing) return;
  const usou = HE.teste ? heSbUp(e) : heUp(e);
  if (usou) e.stopImmediatePropagation();
}
window.addEventListener('pointerup', heFimToque, true);
window.addEventListener('pointercancel', heFimToque, true);
window.addEventListener('keydown', e => {                       // o teclado no editor: desfazer, refazer, as setas movem, + e − mudam o tamanho
  if (!HE.aberto || !editing || HE.teste) return;
  const t = e.target; if (t && t.closest && t.closest('input:not([type=range]), textarea, select, [contenteditable="true"]')) return;
  const mod = e.ctrlKey || e.metaKey;
  if (mod && (e.code === 'KeyZ' || e.code === 'KeyY')){
    e.preventDefault(); e.stopImmediatePropagation();
    if (e.code === 'KeyY' || e.shiftKey) heRefaz(); else heDesfaz();
    return;
  }
  if (mod || e.altKey || (t && t.matches && t.matches('input[type=range]'))) return;
  const passo = e.shiftKey ? 20 : 4;
  const dx = e.code === 'ArrowLeft' ? -passo : e.code === 'ArrowRight' ? passo : 0, dy = e.code === 'ArrowUp' ? -passo : e.code === 'ArrowDown' ? passo : 0;
  if (dx || dy){
    e.preventDefault(); e.stopImmediatePropagation();
    heTeclaGesto('mover ' + heNomeDe(sel)); const c = hud[sel]; c.x += dx; c.y += dy; prender(sel); heMudou();
    return;
  }
  if (e.key === '+' || e.key === '=' || e.key === '-' || e.key === '_'){
    e.preventDefault(); e.stopImmediatePropagation();
    heTeclaGesto('tamanho do ' + heNomeDe(sel)); const c = hud[sel];
    c.s = Math.round(Math.max(TAM_MIN, Math.min(TAM_MAX, c.s + ((e.key === '+' || e.key === '=') ? .05 : -.05)))*100)/100; prender(sel); heMudou();
  }
}, true);
function heSalvaTudoJa(){ if (HE.aberto){ heGestoFim(); heRascunhoGrava(); } heGravaBarra(); }
document.addEventListener('visibilitychange', () => { if (document.hidden){ if (HE.aberto) heCancelaGestos(); heSalvaTudoJa(); } });
window.addEventListener('pagehide', heSalvaTudoJa);
window.addEventListener('beforeunload', heSalvaTudoJa);
window.addEventListener('blur', () => { if (HE.aberto){ heCancelaGestos(); heSalvaTudoJa(); } });
window.addEventListener('resize', () => { if (HE.aberto){ heLayoutLogo(); setTimeout(heLayoutLogo, 350); } });
window.addEventListener('orientationchange', () => { if (HE.aberto) setTimeout(() => heLayout(true), 400); });

/* ---------------------------------------------------------------- 8) o modo teste */
function heTesteToque(x, y){                                     // o que o toque acertaria na partida (a mesma ordem do toque do jogo)
  if (hitRet(BTN_PAUSA, x, y, 12)) return 'pausa';
  if (!RQ.on && typeof arcHitSel === 'function' && arcHitSel(x, y)) return 'seletor';
  if (controleVisivel('reset') && hit(x, y, el('reset'), 8)) return 'reset';
  const b = botaoPerto(x, y); if (b) return b;                   // (PASSE, CHUTE, CURVA… com a área de toque a mais da versão de testes)
  if (joyZona(x, y)) return 'joy';
  return '';
}
function heTesteNome(a){ return a === 'pausa' ? 'PAUSA' : a === 'seletor' ? 'SELETOR DO TREINO' : a ? heNomeDe(a) : 'NADA (fora dos controles)'; }
function heTesteEntra(){
  if (!HE.aberto || HE.teste) return;
  heGestoFim(); heFechaPop(); heCancelaGestos();
  HE.teste = true; HE.todosAntes = HUDM.todos; HUDM.todos = false; HE.sbUlt = null;
  HE.testeReal = !RQ.on && !NET49.playing;                       // no treino, o jogo anda; numa partida, só o toque é mostrado
  if (HE.testeReal){ editing = false; hudModoConfere(); limparEntrada(); last = performance.now(); }
  heRascunhoGrava();
  heSync(); heLayout(true);
}
function heTesteSai(){
  if (!HE.teste) return;
  HE.teste = false; HUDM.todos = !!HE.todosAntes;
  if (HE.testeReal){ limparEntrada(); editing = true; hudModoConfere(); joy.id = null; ptrs.clear(); acc = 0; guardaAnterior(); }
  HE.testeReal = false; HE.sb.clear();
  if (!controleVisivel(sel)) sel = 'power';
  heSync(); heLayout(true);
}
function heTesteObserva(e){                                      // (o teste do treino: o jogo trata o toque; aqui só o nome na pílula)
  try { const p = vpos(e); HE.sbUlt = heTesteToque(p[0], p[1]); heSyncTeste(); } catch (_) {}
}
function heSbDown(e){
  const p = vpos(e), a = heTesteToque(p[0], p[1]);
  try { cv.setPointerCapture(e.pointerId); } catch (_) {}
  HE.sb.set(e.pointerId, {a, x:p[0], y:p[1], x0:p[0], y0:p[1], t:performance.now()});
  HE.sbUlt = a; heSyncTeste();
  return true;
}
function heSbMove(e){ const s = HE.sb.get(e.pointerId); if (!s) return false; const p = vpos(e); s.x = p[0]; s.y = p[1]; return true; }
function heSbUp(e){ if (!HE.sb.has(e.pointerId)) return false; HE.sb.delete(e.pointerId); return true; }
function heSyncTeste(){
  const E = HE.el; if (!E.tstSub) return;
  E.tstSub.textContent = HE.sbUlt !== null ? 'Toque: ' + heTesteNome(HE.sbUlt)
    : HE.testeReal ? 'Jogue à vontade · nada é salvo' : 'Só o toque · nada vai para a partida';
}

/* ---------------------------------------------------------------- 9) o desenho por cima dos controles (no canvas) */
function heZonas(){ try { return hudZonas(); } catch (_) { return []; } }
drawEditOverlay = function(){
  if (HE.teste){ heDesenhaTeste(); return; }
  const g = ctx;
  g.save();
  g.setLineDash([10, 8]); g.lineWidth = 3; g.strokeStyle = 'rgba(255,255,255,.28)';   // as áreas fixas (a pausa e o placar): onde o toque é delas
  for (const z of heZonas()) g.strokeRect(z.x0 + 2, z.y0 + 2, z.x1 - z.x0 - 4, z.y1 - z.y0 - 4);
  g.setLineDash([]);
  const ruins = new Set();
  try { for (const c of hudConflitos(HUDM.atual)){ if (c.a && controleVisivel(c.a)) ruins.add(c.a); if (c.b && controleVisivel(c.b)) ruins.add(c.b); } } catch (_) {}
  const ordem = ORDEM_TOQUE.filter(k => k !== sel && controleVisivel(k)).concat(controleVisivel(sel) ? [sel] : []);   // o escolhido por cima
  const t = performance.now();
  for (const k of ordem){
    const e = hud[k], r = rCtl(k)*e.s, on = k === sel, inv = e.a < .2;
    if (inv){                                                    // o invisível: um fantasma, para achar e arrastar (na partida ele não aparece)
      g.save(); g.beginPath(); g.arc(e.x, e.y, r, 0, TAU); g.fillStyle = 'rgba(255,255,255,' + (.1 + .1*(.2 - e.a)/.2) + ')'; g.fill();
      g.clip(); g.strokeStyle = 'rgba(255,255,255,.22)'; g.lineWidth = 4;
      for (let i = -r*2; i < r*2; i += 26){ g.beginPath(); g.moveTo(e.x + i, e.y - r); g.lineTo(e.x + i + r*2, e.y + r); g.stroke(); }
      g.restore();
    }
    if (on){
      const pulso = .5 + .5*Math.sin(t/260);
      g.beginPath(); g.arc(e.x, e.y, r + 12, 0, TAU); g.lineWidth = 16; g.strokeStyle = 'rgba(255,210,31,' + (.16 + .14*pulso) + ')'; g.stroke();
      g.beginPath(); g.arc(e.x, e.y, r + 10, 0, TAU); g.lineWidth = 7; g.strokeStyle = '#ffd21f'; g.stroke();
      g.lineWidth = 2.5; g.strokeStyle = '#05060c'; g.beginPath(); g.arc(e.x, e.y, r + 14, 0, TAU); g.stroke();
    } else {
      g.beginPath(); g.arc(e.x, e.y, r + 8, 0, TAU); g.setLineDash([16, 12]); g.lineWidth = 4.5; g.strokeStyle = 'rgba(255,255,255,.9)'; g.stroke(); g.setLineDash([]);
    }
    if (ruins.has(k)){ g.beginPath(); g.arc(e.x, e.y, r + (on ? 22 : 16), 0, TAU); g.setLineDash([18, 10]); g.lineWidth = 6; g.strokeStyle = '#ff4b3a'; g.stroke(); g.setLineDash([]); }
    // o nome: em cima do controle, embaixo ou do lado — onde não cai em cima de outro controle nem sai da tela
    const nome = heNomeDe(k) + (inv ? ' · ' + (e.a < .005 ? 'INVISÍVEL' : Math.round(e.a*100) + '%') : '');
    g.font = '24px ' + FONT; const w = g.measureText(nome).width + 30, h = 34;
    let lx = e.x, ly = e.y - r - h/2 - 16, melhor = Infinity;
    for (const [cx, cy] of [[e.x, e.y - r - h/2 - 16], [e.x, e.y + r + h/2 + 16], [e.x - r - w/2 - 12, e.y], [e.x + r + w/2 + 12, e.y]]){
      const x = Math.max(w/2 + 4, Math.min(W - w/2 - 4, cx)), y = Math.max(h/2 + 4, Math.min(H - h/2 - 4, cy));
      let c = Math.hypot(x - cx, y - cy)*4;                       // (empurrado para dentro da tela: pode cair em cima dele mesmo)
      for (const o of ordem){ const q = el(o), dx = Math.max(Math.abs(x - q.x) - w/2, 0), dy = Math.max(Math.abs(y - q.y) - h/2, 0); if (Math.hypot(dx, dy) < q.r) c += 1000; }
      if (c < melhor - 1){ melhor = c; lx = x; ly = y; }
    }
    rr(g, lx - w/2, ly - h/2, w, h, h/2);
    g.fillStyle = on ? '#ffd21f' : 'rgba(8,14,40,.9)'; g.fill();
    g.lineWidth = 3; g.strokeStyle = on ? '#05060c' : 'rgba(255,255,255,.55)'; g.stroke();
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = on ? '#2a1d00' : '#ffffff'; g.fillText(nome, lx, ly + 1);
  }
  if (HE.pinca){                                                 // a pinça: o tamanho grande, no meio do controle
    const e = hud[HE.pinca.k], s = Math.round(e.s*100) + '%';
    g.font = '56px ' + FONT; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
    g.lineWidth = 10; g.strokeStyle = '#05060c'; g.strokeText(s, e.x, e.y); g.fillStyle = '#ffd21f'; g.fillText(s, e.x, e.y);
  }
  g.restore();
};
hudDesenhaAvisos = function(){};                                 // (o aviso de encostado agora é o contorno vermelho do drawEditOverlay)
function heDesenhaTeste(){                                       // o teste numa partida: o que cada dedo acertaria
  const g = ctx;
  g.save();
  try { drawPausaBtn(); } catch (_) {}
  for (const s of HE.sb.values()){
    const a = s.a;
    if (a === 'joy'){
      const e = hud.joy, R = JOY.max*e.al*e.s, cx = e.adere ? s.x0 : e.x, cy = e.adere ? s.y0 : e.y;
      let dx = s.x - cx, dy = s.y - cy; const l = Math.hypot(dx, dy); if (l > R){ dx *= R/l; dy *= R/l; }
      g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.lineWidth = 6; g.strokeStyle = 'rgba(255,210,31,.75)'; g.setLineDash([14, 10]); g.stroke(); g.setLineDash([]);
      g.beginPath(); g.arc(cx + dx, cy + dy, JOY.knob*e.km*e.s*.9, 0, TAU); g.fillStyle = 'rgba(255,210,31,.55)'; g.fill(); g.lineWidth = 4; g.strokeStyle = '#05060c'; g.stroke();
      heEtiqueta(g, 'ANALÓGICO', cx, cy - R - 30);
    } else if (a && hud[a]){
      const e = hud[a], r = rCtl(a)*e.s;
      g.beginPath(); g.arc(e.x, e.y, r + 10, 0, TAU); g.lineWidth = 9; g.strokeStyle = '#ffd21f'; g.stroke();
      heEtiqueta(g, heNomeDe(a) + ' ✓', e.x, e.y - r - 34);
    } else if (a === 'pausa'){
      const b = BTN_PAUSA; g.lineWidth = 7; g.strokeStyle = '#ffd21f'; g.strokeRect(b.x - 6, b.y - 6, b.w + 12, b.h + 12);
      heEtiqueta(g, 'PAUSA', b.x + b.w/2, b.y + b.h + 34);
    } else {
      g.beginPath(); g.arc(s.x, s.y, 34, 0, TAU); g.lineWidth = 5; g.strokeStyle = 'rgba(255,255,255,.75)'; g.stroke();
      heEtiqueta(g, a === 'seletor' ? 'SELETOR' : 'NADA', s.x, s.y - 62);
    }
  }
  g.restore();
}
function heEtiqueta(g, s, x, y){
  g.font = '26px ' + FONT; const w = g.measureText(s).width + 32, h = 38;
  x = Math.max(w/2 + 4, Math.min(W - w/2 - 4, x)); y = Math.max(h/2 + 4, Math.min(H - h/2 - 4, y));
  rr(g, x - w/2, y - h/2, w, h, h/2); g.fillStyle = '#ffd21f'; g.fill(); g.lineWidth = 3; g.strokeStyle = '#05060c'; g.stroke();
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#2a1d00'; g.fillText(s, x, y + 1);
}

/* ---------------------------------------------------------------- 10) a barra, a caixinha e as pílulas (HTML) */
const HE_IC = {
  grip:'<g fill="currentColor"><circle cx="8.5" cy="6" r="2"/><circle cx="15.5" cy="6" r="2"/><circle cx="8.5" cy="12" r="2"/><circle cx="15.5" cy="12" r="2"/><circle cx="8.5" cy="18" r="2"/><circle cx="15.5" cy="18" r="2"/></g>',
  tam:'<g fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9.5V4h5.5M20 14.5V20h-5.5M4 4l6.2 6.2M20 20l-6.2-6.2"/></g>',
  opa:'<circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="2.6"/><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor"/>',
  opc:'<g fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="12" cy="12" r="3.4"/><path d="M12 2.8v2.6M12 18.6v2.6M2.8 12h2.6M18.6 12h2.6M5.5 5.5l1.9 1.9M16.6 16.6l1.9 1.9M18.5 5.5l-1.9 1.9M7.4 16.6l-1.9 1.9"/></g>',
  desfaz:'<g fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 5L4 9.5 8.5 14"/><path d="M4.5 9.5H14a6 6 0 0 1 0 12h-3"/></g>',
  refaz:'<g fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M15.5 5L20 9.5 15.5 14"/><path d="M19.5 9.5H10a6 6 0 0 0 0 12h3"/></g>',
  teste:'<path d="M7.5 4.8l11.5 7.2-11.5 7.2z" fill="currentColor" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>',
  layouts:'<g fill="currentColor"><rect x="3" y="3.5" width="18" height="4.6" rx="1.6"/><rect x="3" y="9.7" width="18" height="4.6" rx="1.6"/><rect x="3" y="15.9" width="11" height="4.6" rx="1.6"/></g>',
  salva:'<path d="M4.5 12.5l4.7 4.7L19.5 6.8" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>',
  fecha:'<path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>',
  desce:'<path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>',
  sobe:'<path d="M6 15l6-6 6 6" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>',
  volta:'<g fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3"/><path d="M4 4.5v4.8h4.8"/></g>',
  para:'<rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor"/>',
  menos:'<path d="M6 12h12" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/>',
  mais:'<path d="M6 12h12M12 6v12" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/>',
  novo:'<path d="M6 12h12M12 6v12" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>',
  copia:'<g fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"><rect x="8.5" y="8.5" width="11.5" height="11.5" rx="2"/><path d="M15.5 8.5V5.5a1.5 1.5 0 0 0-1.5-1.5H5.5A1.5 1.5 0 0 0 4 5.5V14a1.5 1.5 0 0 0 1.5 1.5h3"/></g>',
  lapis:'<g fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"><path d="M4 20l1-4.5L15.8 4.7a2.1 2.1 0 0 1 3 3L8 18.5z"/><path d="M13.8 6.7l3 3"/></g>',
  lixo:'<g fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13"/></g>',
  ima:'<g fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="12" cy="12" r="7.5"/><path d="M12 7.5v9M7.5 12h9"/></g>'
};
function heIcone(n){ return '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + (HE_IC[n] || '') + '</svg>'; }
function heBt(cls, rotulo, ic, texto){
  const b = novoBotao('he-bt' + (cls ? ' ' + cls : ''), rotulo);
  if (ic) b.insertAdjacentHTML('beforeend', heIcone(ic));
  if (texto != null) b.appendChild(nodo('b', null, texto));
  return b;
}
function heMonta(){
  if (HE.el.barra) return;
  const P = ui.painel, E = HE.el;
  const velho = nodo('div', 'he-velho'); velho.hidden = true;      // o painel antigo fica guardado e escondido (as referências de sempre continuam valendo)
  while (P.firstChild) velho.appendChild(P.firstChild);
  P.appendChild(velho);
  P.classList.add('he'); P.removeAttribute('role'); P.removeAttribute('aria-label');
  // a barra
  const barra = E.barra = nodo('div', 'he-barra'); barra.setAttribute('role', 'toolbar'); barra.setAttribute('aria-label', 'Editar os controles da tela');
  const grip = heBt('he-grip', 'Arrastar a barra (ela também sai sozinha de cima do controle escolhido)', 'grip');
  const selB = E.selB = heBt('he-sel', 'Escolher o controle'); E.selNome = nodo('b', null, 'PASSE'); selB.appendChild(E.selNome); selB.insertAdjacentHTML('beforeend', heIcone('desce'));
  const tam = E.tam = heBt('he-val', 'Tamanho do controle escolhido', 'tam'); E.tamV = nodo('b', null, '100%'); tam.appendChild(E.tamV);
  const opa = E.opa = heBt('he-val', 'Opacidade do controle escolhido (0% = invisível, o toque continua valendo)', 'opa'); E.opaV = nodo('b', null, '100%'); opa.appendChild(E.opaV);
  const opc = E.opc = heBt('', 'Opções e restaurar o controle escolhido', 'opc');
  const desf = E.desf = heBt('', 'Desfazer', 'desfaz'), refz = E.refz = heBt('', 'Refazer', 'refaz');
  const tst = E.tst = heBt('', 'Testar os controles sem salvar', 'teste'); tst.appendChild(nodo('span', 'he-rot', 'TESTAR'));
  const lay = E.lay = heBt('', 'Layouts: trocar, criar, renomear, moldes', 'layouts'); E.layNome = nodo('span', 'he-rot', 'LAYOUTS'); lay.appendChild(E.layNome);
  if (ui.salvar) ui.salvar.removeAttribute('id');
  if (ui.canc) ui.canc.removeAttribute('id');
  if (ui.rest) ui.rest.removeAttribute('id');
  const ok = E.ok = heBt('he-ok', 'Salvar e sair do editor', 'salva', 'SALVAR'); ok.id = 'hp-salvar'; ui.salvar = ok;
  const sair = E.sair = heBt('he-sair', 'Fechar o editor', 'fecha'); sair.id = 'hp-canc'; ui.canc = sair;
  const rec = E.rec = heBt('he-recolhe', 'Recolher a barra', 'desce');
  const sep = cls => { const s = nodo('span', 'he-sep' + (cls ? ' ' + cls : '')); s.setAttribute('aria-hidden', 'true'); return s; };
  const av = E.aviso = nodo('div', 'he-aviso'); av.hidden = true; av.setAttribute('aria-live', 'polite');
  E.avisoTx = nodo('span'); E.avisoBt = heBt('', ''); E.avisoBt.hidden = true; av.append(E.avisoTx, E.avisoBt);
  // duas partes: o controle escolhido (o nome, o tamanho, a opacidade, as opções) e o resto; numa linha quando cabe entre os
  // controles, em duas quando a tela é estreita (o heLayout escolhe o jeito que não cobre nada)
  const g1 = nodo('div', 'he-g1'), g2 = nodo('div', 'he-g2');
  g1.append(grip, selB, tam, opa, opc);
  g2.append(sep('he-sep-g'), desf, refz, sep(), tst, lay, ok, sair, rec);
  barra.append(g1, g2, av);
  // o "restaurar o padrão" de sempre (#hp-rest) mora na caixinha dos layouts
  const rest = E.rest = heBt('he-perigo', 'Restaurar o padrão: todos os controles deste layout', 'volta', 'RESTAURAR TUDO'); rest.id = 'hp-rest'; ui.rest = rest;
  rest.addEventListener('click', () => {
    som.clique();
    heAcao('restaurar o padrão', () => { hudPadrao(); hudModoConfere(); });
    if (!controleVisivel(sel)) sel = 'power';
    heAvisa('Tudo de volta ao padrão. SALVAR para manter (↶ desfaz).', 'bom', 4200); if (HE.pop) heMontaPop();
  });
  // a barra recolhida
  const mini = E.mini = nodo('div', 'he-mini'); mini.hidden = true; mini.setAttribute('role', 'toolbar'); mini.setAttribute('aria-label', 'Editor dos controles (barra recolhida)');
  const grip2 = heBt('he-grip', 'Arrastar', 'grip'), abre = heBt('he-abre', 'Abrir a barra do editor', 'sobe', 'CONTROLES');
  mini.append(grip2, abre);
  // a pílula do modo teste
  const teste = E.teste = nodo('div', 'he-teste'); teste.hidden = true; teste.setAttribute('role', 'toolbar'); teste.setAttribute('aria-label', 'Modo teste dos controles');
  const grip3 = heBt('he-grip', 'Arrastar', 'grip'), luz = nodo('i', 'he-tst-luz'); luz.setAttribute('aria-hidden', 'true');
  const tx = nodo('div', 'he-tst-tx'); E.tstTit = nodo('b', null, 'MODO TESTE'); E.tstSub = nodo('small', null, ''); E.tstSub.setAttribute('aria-live', 'polite'); tx.append(E.tstTit, E.tstSub);
  const volta = heBt('', 'Voltar ao editor', 'para', 'VOLTAR'), ok2 = heBt('he-ok', 'Salvar e sair', 'salva', 'SALVAR');
  teste.append(grip3, luz, tx, volta, ok2);
  // a caixinha
  const pop = E.pop = nodo('div', 'he-pop'); pop.hidden = true; pop.setAttribute('role', 'dialog');
  P.append(barra, mini, teste, pop);
  // o que cada um faz
  for (const gp of [grip, grip2, grip3]){
    gp.addEventListener('pointerdown', e => heBarraPega(e, gp.parentElement));
    gp.addEventListener('pointermove', heBarraMove);
    gp.addEventListener('pointerup', heBarraSolta); gp.addEventListener('pointercancel', heBarraSolta);
    gp.addEventListener('click', e => e.preventDefault());
    gp.addEventListener('keydown', e => {                       // (no teclado: as setas movem a barra)
      const d = {ArrowLeft:[-24, 0], ArrowRight:[24, 0], ArrowUp:[0, -24], ArrowDown:[0, 24]}[e.code]; if (!d) return;
      e.preventDefault(); e.stopPropagation();
      const A = heArea(), b = HE.barraAgora || {x:0, y:0, w:gp.parentElement.offsetWidth, h:gp.parentElement.offsetHeight};
      heBarraPoe(b.x + d[0], b.y + d[1], b.w, b.h, A); heLayout(false);
    });
  }
  selB.addEventListener('click', () => { som.clique(); heAlternaPop('sel', selB); });
  tam.addEventListener('click', () => { som.clique(); heAlternaPop('tam', tam); });
  opa.addEventListener('click', () => { som.clique(); heAlternaPop('opa', opa); });
  opc.addEventListener('click', () => { som.clique(); heAlternaPop('opc', opc); });
  lay.addEventListener('click', () => { som.clique(); heAlternaPop('lay', lay); });
  desf.addEventListener('click', () => { som.clique(); heDesfaz(); });
  refz.addEventListener('click', () => { som.clique(); heRefaz(); });
  tst.addEventListener('click', () => { som.clique(); heTesteEntra(); });
  ok.addEventListener('click', () => { som.clique(); heFecha(true); });
  sair.addEventListener('click', () => { som.clique(); hePedeFechar(false); });
  rec.addEventListener('click', () => { som.clique(); heRecolhe(true); });
  abre.addEventListener('click', () => { som.clique(); heRecolhe(false); });
  volta.addEventListener('click', () => { som.clique(); heTesteSai(); });
  ok2.addEventListener('click', () => { som.clique(); heFecha(true); });
  E.avisoBt.addEventListener('click', () => { som.clique(); const a = E.avisoBt.__acao; if (a) a(); });
}
function heSyncValores(){                                        // (só os números: a cada passo da pinça e do deslizante)
  const E = HE.el; if (!E.tamV) return;
  const e = hud[sel] || hud.kick;
  E.tamV.textContent = Math.round(e.s*100) + '%';
  E.opaV.textContent = (e.a < .005 ? '0' : Math.round(e.a*100)) + '%';
  if (HE.pop === 'tam' || HE.pop === 'opa') heSyncPopValores();
}
function heSync(){
  const E = HE.el; if (!E.barra) return;
  const e = hud[sel] || hud.kick;
  E.selNome.textContent = heNomeDe(sel);
  heSyncValores();
  E.desf.disabled = !HE.hist.length && !HE.gesto; E.refz.disabled = !HE.refaz.length;
  E.desf.title = HE.hist.length ? 'Desfazer: ' + HE.hist[HE.hist.length - 1].rotulo : 'Nada para desfazer';
  E.refz.title = HE.refaz.length ? 'Refazer: ' + HE.refaz[HE.refaz.length - 1].rotulo : 'Nada para refazer';
  E.ok.classList.toggle('sujo', HE.sujo);
  E.layNome.textContent = heAtivo().nome.toUpperCase();
  E.barra.hidden = !HE.aberto || HE.teste || HE.barra.recolhida;
  E.mini.hidden = !HE.aberto || HE.teste || !HE.barra.recolhida;
  E.teste.hidden = !HE.aberto || !HE.teste;
  for (const [b, p] of [[E.selB, 'sel'], [E.tam, 'tam'], [E.opa, 'opa'], [E.opc, 'opc'], [E.lay, 'lay']]) b.setAttribute('aria-expanded', String(HE.pop === p));
  E.opa.classList.toggle('he-zero', e.a < .005);
  // a linha de aviso: o que acabou de acontecer, ou os controles encostados
  let t = '', cls = '', acao = null, rot = '';
  if (HE.aviso && (!HE.aviso.ate || HE.aviso.ate > Date.now())){ t = HE.aviso.t; cls = HE.aviso.cls; if (HE.aviso.acao){ acao = HE.aviso.fn; rot = HE.aviso.acao; } }
  else if (!HE.teste){
    let cs = []; try { cs = hudConflitos(HUDM.atual).filter(c => controleVisivel(c.a) && (!c.b || controleVisivel(c.b))); } catch (_) {}
    if (cs.length){
      const c = cs[0];
      t = '⚠ ' + (c.zona ? heNomeDe(c.a) + ' cobre ' + c.zona : heNomeDe(c.a) + ' encosta no ' + heNomeDe(c.b)) + (cs.length > 1 ? ' (+' + (cs.length - 1) + ')' : '') + ': o toque pode cair no controle errado.';
      cls = 'ruim'; rot = 'ARRUMAR';
      acao = () => { heAcao('arrumar os encostados', () => hudArruma(HUDM.atual)); heAvisa('Pronto: nenhum controle encostado.', 'bom'); };
    }
  }
  E.aviso.hidden = !t || !!HE.pop; E.avisoTx.textContent = t; E.aviso.className = 'he-aviso' + (cls ? ' ' + cls : '');   // (com a caixinha aberta, o aviso espera)
  E.avisoBt.hidden = !acao; E.avisoBt.__acao = acao; if (acao){ E.avisoBt.textContent = rot; E.avisoBt.setAttribute('aria-label', rot); }
  if (HE.teste){ E.tstTit.textContent = HE.testeReal ? 'MODO TESTE · TREINO' : 'MODO TESTE · SÓ O TOQUE'; heSyncTeste(); }
}
function heRecolhe(on){
  heFechaPop();
  HE.barra.recolhida = !!on; heGravaBarra();
  heSync(); heLayout(false);
  try { (on ? HE.el.mini.querySelector('.he-abre') : HE.el.rec).focus({preventScroll:true}); } catch (_) {}
}
function heGravaBarra(){ heGrava(HE_CHAVE_BARRA, {px:HE.barra.px, py:HE.barra.py, recolhida:!!HE.barra.recolhida}); }
(function(){ const o = heLe(HE_CHAVE_BARRA); if (o){ HE.barra.px = heNum(o.px, 0, 1, null); HE.barra.py = heNum(o.py, 0, 1, null); HE.barra.recolhida = o.recolhida === true; } })();

/* ---- arrastar a barra pelo ⠿ ---- */
function heBarraPega(e, alvo){
  e.preventDefault(); e.stopPropagation();
  heFechaPop();
  const r = alvo.getBoundingClientRect();
  HE.barraDrag = {id:e.pointerId, el:alvo, ox:e.clientX - r.left, oy:e.clientY - r.top, mexeu:false};
  try { e.currentTarget.setPointerCapture(e.pointerId); } catch (_) {}
}
function heBarraMove(e){
  const d = HE.barraDrag; if (!d || d.id !== e.pointerId) return;
  e.preventDefault();
  const A = heArea(), wr = heWrapRect();
  d.mexeu = true;
  heBarraPoe(e.clientX - wr.left - d.ox, e.clientY - wr.top - d.oy, d.el.offsetWidth, d.el.offsetHeight, A, d.el);
}
function heBarraPoe(x, y, w, h, A, alvo){                       // põe a barra (e guarda o lugar como a preferência de quem joga)
  x = Math.max(6, Math.min(A.w - w - 6, x)); y = Math.max(6, Math.min(A.h - h - 6, y));
  const n = alvo || heAlvoBarra();
  heMoveEl(n, x, y, true);
  HE.barraAgora = {x, y, w, h, el:n, duas:n.classList.contains('he-2l')};
  HE.barra.px = A.w - w - 12 > 0 ? (x - 6)/(A.w - w - 12) : .5; HE.barra.py = A.h - h - 12 > 0 ? (y - 6)/(A.h - h - 12) : 0;
}
function heBarraSolta(e){
  const d = HE.barraDrag; if (!d || d.id !== e.pointerId) return;
  HE.barraDrag = null; heGravaBarra(); heLayout(false);         // (se ficou em cima do controle escolhido, ela sai de lado)
}

/* ---- onde a barra fica: longe do controle escolhido (e, se der, de todos), perto de onde quem joga deixou ---- */
function heWrapRect(){ const w = document.getElementById('wrap'); return w ? w.getBoundingClientRect() : {left:0, top:0, width:innerWidth, height:innerHeight}; }
function heArea(){ const r = heWrapRect(); return {w:r.width, h:r.height}; }
function heAlvoBarra(){ const E = HE.el; return HE.teste ? E.teste : HE.barra.recolhida ? E.mini : E.barra; }
function heCirculos(){                                           // os controles na tela, em px do #wrap
  const c = cv.getBoundingClientRect(), wr = heWrapRect(), k = c.width/W, out = [];
  for (const id of HE_ORDEM){ if (!controleVisivel(id)) continue; const e = el(id); out.push({id, x:c.left - wr.left + e.x*k, y:c.top - wr.top + e.y*k, r:e.r*k + 10}); }
  if (HE.teste){ const b = BTN_PAUSA; out.push({id:'pausa', x:c.left - wr.left + (b.x + b.w/2)*k, y:c.top - wr.top + (b.y + b.h/2)*k, r:b.w*.75*k}); }
  return out;
}
function heObstaculos(){                                         // o que já fica fixo na tela (a barra da sala online, o medidor, o relógio do treino)
  const wr = heWrapRect(), out = [];
  for (const s of ['#x49-onlinebar', '.v92-medidor', '.v88-livre', '.tu-painel']){
    for (const n of document.querySelectorAll(s)){ if (n.hidden || n.closest('[hidden]') || !n.getClientRects().length) continue; const r = n.getBoundingClientRect(); if (r.width < 2) continue; out.push({x:r.left - wr.left, y:r.top - wr.top, w:r.width, h:r.height}); }
  }
  return out;
}
function heSobra(R, o){ const nx = Math.max(R.x, Math.min(R.x + R.w, o.x)), ny = Math.max(R.y, Math.min(R.y + R.h, o.y)), d = Math.hypot(o.x - nx, o.y - ny); return d >= o.r ? 0 : o.r - d; }
const heCruza = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
function heCusto(R, circ, obst, peso){                         // peso: quanto pesa cobrir os outros controles (a caixinha, que fecha logo, pesa menos)
  let c = 0; const pw = peso == null ? 1 : peso;
  for (const o of circ){
    const s = heSobra(R, o); if (!s) continue;
    c += (o.id === sel && !HE.teste) || HE.teste ? 1e6 + s*1e3 : (2600 + s*14)*pw;   // (nunca em cima do escolhido; no teste, de nenhum)
  }
  for (const o of obst) if (heCruza(R, o)) c += 1800*pw;
  return c;
}
function heCandidatos(A, w, h, pref){
  const m = 6, maxX = Math.max(m, A.w - w - m), maxY = Math.max(m, A.h - h - m), out = [{x:pref.x, y:pref.y}];
  for (let i = 0; i <= 8; i++){ const x = m + (maxX - m)*i/8; out.push({x, y:m}, {x, y:maxY}); }
  for (const x of [m, maxX, (m + maxX)/2]) out.push({x, y:(m + maxY)/2, meio:true});
  return out.map(p => ({x:Math.max(m, Math.min(maxX, p.x)), y:Math.max(m, Math.min(maxY, p.y)), meio:!!p.meio}));
}
function hePrefDe(A, w, h){
  const m = 6;
  if (HE.barra.px == null || HE.barra.py == null) return {x:(A.w - w)/2, y:m};   // o padrão: em cima, no meio (onde o placar fica; no editor ele não pega toque)
  return {x:m + HE.barra.px*Math.max(0, A.w - w - 2*m), y:m + HE.barra.py*Math.max(0, A.h - h - 2*m)};
}
function heMoveEl(n, x, y, semAnim){
  if (!n) return;
  n.classList.toggle('he-sem-anim', !!semAnim);
  n.style.transform = 'translate(' + Math.round(x) + 'px,' + Math.round(y) + 'px)';
}
function heLayoutLogo(){ if (HE.layoutT) return; HE.layoutT = requestAnimationFrame(() => { HE.layoutT = 0; heLayout(false); }); }
function heLayout(semAnim){
  if (!HE.aberto || !HE.el.barra || HE.barraDrag) return;
  const A = heArea(); if (!(A.w > 0 && A.h > 0)) return;
  const alvo = heAlvoBarra(); if (!alvo || alvo.hidden) return;
  const maxW = Math.max(120, A.w - 12);
  const circ = heCirculos(), obst = heObstaculos();
  const P = HE.el.pop, comPop = !!HE.pop && !HE.teste && !HE.barra.recolhida && !P.hidden;
  const jeitosPop = comPop ? hePopJeitos(P, A, circ) : [];
  const av = HE.el.aviso, avH = alvo === HE.el.barra && av && !av.hidden ? av.offsetHeight + 7 : 0;
  const jeitos = alvo === HE.el.barra ? [false, true] : [null];  // a barra: numa linha ou em duas (a mais estreita passa entre os controles)
  // a barra é "parada": fica onde está enquanto não cobrir o controle escolhido (abrir e fechar a caixinha não a faz pular);
  // quando precisa sair, vai para o lugar livre mais perto. Ao abrir o editor (ou trocar barra ⇄ recolhida ⇄ teste), parte
  // de onde quem joga deixou a barra da última vez.
  const cur = HE.barraAgora && HE.barraAgora.el === alvo ? HE.barraAgora : null;
  let melhor = null;
  for (const duas of jeitos){
    if (duas !== null) alvo.classList.toggle('he-2l', duas);
    alvo.style.maxWidth = 'none'; alvo.classList.remove('he-aperta');
    let w = alvo.offsetWidth, h = alvo.offsetHeight;             // (o tamanho de verdade, sem cortar)
    if (w > maxW){
      if (duas === false) continue;                              // (numa linha não cabe na tela)
      alvo.style.maxWidth = maxW + 'px'; alvo.classList.add('he-aperta'); w = alvo.offsetWidth; h = alvo.offsetHeight;   // (tela muito estreita: cada parte quebra também)
    }
    const pref = hePrefDe(A, w, h);
    const cands = heCandidatos(A, w, h, pref); if (cur) cands.push({x:Math.max(6, Math.min(A.w - w - 6, cur.x)), y:Math.max(6, Math.min(A.h - h - 6, cur.y))});
    for (const c of cands){
      const R = {x:c.x, y:c.y, w, h}, embaixo = c.y + h/2 > A.h/2;
      const Rav = avH ? (embaixo ? {x:c.x, y:c.y - avH, w, h:h + avH} : {x:c.x, y:c.y, w, h:h + avH}) : R;   // (com a tira do aviso junto)
      let custo = heCusto(Rav, circ, obst) + (c.meio ? 5000 : 0) + (duas ? 60 : 0)
        + (cur ? Math.hypot(c.x - cur.x, c.y - cur.y)*1.2 + Math.hypot(c.x - pref.x, c.y - pref.y)*.25 + (duas !== cur.duas ? 150 : 0) : Math.hypot(c.x - pref.x, c.y - pref.y)*1.2);
      let pr = null;
      if (comPop){                                                // a caixinha: junto da barra (em cima ou embaixo) ou solta numa beira; larga, estreita ou sem as dicas
        let mp = null;
        for (const v of jeitosPop) for (const q of hePopRects(R, A, v.pw, v.ph)){
          const cq = heCusto(q, circ, obst, .3) + (q.corta ? 400 : 0) + q.longe*.4 + v.extra + (q.solta ? 120 : 0);
          if (!mp || cq < mp.c) mp = {c:cq, q, v};
        }
        pr = mp; custo += mp.c;
      }
      if (!melhor || custo < melhor.custo) melhor = {x:c.x, y:c.y, w, h, custo, pr, duas, embaixo, aperta:alvo.classList.contains('he-aperta')};
    }
  }
  if (!melhor) return;
  if (melhor.duas !== null) alvo.classList.toggle('he-2l', melhor.duas);
  alvo.classList.toggle('he-aperta', !!melhor.aperta); alvo.style.maxWidth = melhor.aperta ? maxW + 'px' : 'none';
  alvo.classList.toggle('he-baixo', !!melhor.embaixo);
  heMoveEl(alvo, melhor.x, melhor.y, semAnim);
  HE.barraAgora = {x:melhor.x, y:melhor.y, w:melhor.w, h:melhor.h, duas:melhor.duas, el:alvo};
  if (comPop && melhor.pr){
    const {q, v} = melhor.pr;
    hePopMede(P, v.mw, v.curta);                                  // (volta ao jeito escolhido: medir os outros mudou a largura)
    P.style.maxHeight = Math.floor(q.h) + 'px'; heMoveEl(P, q.x, q.y, true);
  }
}
function hePopMede(P, mw, curta){
  P.style.maxHeight = 'none'; P.style.maxWidth = Math.floor(mw) + 'px';
  P.classList.toggle('he-estreita', mw < 430); P.classList.toggle('he-curta', !!curta);
  return {mw, curta:!!curta, pw:P.offsetWidth, ph:P.offsetHeight, vaza:P.scrollWidth > P.clientWidth + 2};
}
function hePopJeitos(P, A, circ){                                // a caixinha em vários jeitos: a natural; mais estreita, para caber do lado do controle escolhido
  const m = 6, larga = Math.max(160, A.w - 2*m), out = [];   // (numa tela pequena); e sem as dicas (mais baixa). Cada um custa um pouco mais que o anterior
  const v0 = hePopMede(P, larga, false); v0.extra = 0; out.push(v0);
  const dica = !!P.querySelector('.he-dica');
  if (dica){ const c = hePopMede(P, larga, true); c.extra = 110; out.push(c); }
  const S = circ.find(o => o.id === sel), ws = [330];
  if (S) ws.push(Math.floor(S.x - S.r - m - 4), Math.floor(A.w - m - (S.x + S.r) - 4));
  const vistos = [v0.pw];                                     // (perto da natural não muda nada)
  for (const w0 of ws){
    const w = Math.min(v0.pw - 1, w0);
    if (w < 250 || vistos.some(x => Math.abs(x - w) < 12)) continue;
    vistos.push(w);
    for (const curta of dica ? [false, true] : [false]){
      const v = hePopMede(P, w, curta); if (v.vaza) continue;     // (não coube nem quebrando as linhas)
      v.extra = curta ? 170 : 60; out.push(v);
    }
  }
  return out;
}
function hePopRects(B, A, pw, ph){                               // os lugares da caixinha: embaixo e em cima da barra; alinhada com o botão que abriu, com a barra ou com as beiras
  const m = 6, out = [], an = HE.popAncora;
  let ax = B.x + B.w/2; if (an && an.offsetParent) ax = B.x + an.offsetLeft + an.offsetWidth/2;
  const xs = [ax - pw/2, B.x, B.x + B.w - pw, m, A.w - pw - m, (A.w - pw)/2];
  for (const embaixo of [true, false]){
    const esp = embaixo ? A.h - (B.y + B.h) - m - 6 : B.y - m - 6; if (esp < 60) continue;
    const h = Math.min(ph, esp);
    for (const x0 of xs){
      const x = Math.max(m, Math.min(A.w - pw - m, x0));
      out.push({x, y:embaixo ? B.y + B.h + 6 : B.y - 6 - h, w:pw, h, corta:h < ph - 1, longe:Math.abs(x + pw/2 - ax)});
    }
  }
  // soltas: nas beiras e nos cantos da tela, sem encostar na barra (quando junto dela a caixinha cobriria o controle escolhido)
  const hs = Math.min(ph, A.h - 2*m), Bm = {x:B.x - 4, y:B.y - 4, w:B.w + 8, h:B.h + 8}, by = B.y + B.h/2;
  for (const x0 of [m, A.w - pw - m, (A.w - pw)/2]) for (const y0 of [m, A.h - hs - m, (A.h - hs)/2]){
    const q = {x:Math.max(m, Math.min(A.w - pw - m, x0)), y:Math.max(m, Math.min(A.h - hs - m, y0)), w:pw, h:hs, corta:hs < ph - 1, solta:true};
    if (heCruza(q, Bm)) continue;
    q.longe = Math.abs(q.x + pw/2 - ax) + Math.abs(q.y + hs/2 - by)*.5; out.push(q);
  }
  if (!out.length){ const h = Math.max(60, A.h - 2*m); out.push({x:Math.max(m, (A.w - pw)/2), y:m, w:pw, h:Math.min(ph, h), corta:ph > h, longe:0}); }
  return out;
}

/* ---------------------------------------------------------------- 11) a caixinha de cada ajuste */
function heAlternaPop(tipo, ancora){ if (HE.pop === tipo) heFechaPop(); else heAbrePop(tipo, ancora); }
function heAbrePop(tipo, ancora){
  heGestoFim();
  HE.pop = tipo; HE.popAncora = ancora || null; HE.popDados = tipo === 'troca' ? {para:HE.popDados.para} : {};
  heMontaPop(); HE.el.pop.hidden = false;
  heSync(); heLayout(true);
  try { const f = HE.el.pop.querySelector('input[type=range], button'); if (f && !(window.matchMedia && matchMedia('(pointer:coarse)').matches)) f.focus({preventScroll:true}); } catch (_) {}
}
function heFechaPop(){
  if (!HE.pop) return;
  heGestoFim();
  HE.pop = ''; HE.popDados = {}; HE.popAncora = null;
  if (HE.el.pop){ HE.el.pop.hidden = true; HE.el.pop.textContent = ''; }
  heSync(); heLayoutLogo();
}
function heTit(t, sub){ const d = nodo('div', 'he-pop-tit'); d.appendChild(document.createTextNode(t)); if (sub){ d.appendChild(document.createTextNode(' · ')); d.appendChild(nodo('span', null, sub)); } return d; }
function hePinta(r){ r.style.setProperty('--p', ((r.value - r.min)/((r.max - r.min) || 1)*100) + '%'); }
function heFaixaLinha(rotulo, min, max, get, set, rotHist, rotA11y){   // um deslizante com − e + (5%) e o número; vale na hora (a prévia) e cada gesto é um passo do desfazer
  const lin = nodo('div', 'he-linha');
  if (rotulo) lin.appendChild(nodo('span', null, rotulo));
  const menos = heBt('', 'Menos (' + rotA11y + ')', 'menos'), mais = heBt('', 'Mais (' + rotA11y + ')', 'mais');
  const r = nodo('input', 'he-faixa-r'); r.type = 'range'; r.min = String(Math.round(min*100)); r.max = String(Math.round(max*100)); r.step = '1';
  r.setAttribute('aria-label', rotA11y);
  const out = nodo('output'); out.setAttribute('aria-hidden', 'true');
  const pinta = () => { const v = Math.round(get()*100); r.value = String(v); out.textContent = v + '%'; hePinta(r); };
  r.addEventListener('pointerdown', () => heGestoComeca(rotHist));
  r.addEventListener('input', () => { heGestoComeca(rotHist); set(+r.value/100); out.textContent = r.value + '%'; hePinta(r); heSyncValores(); heRascunhoAgenda(); });
  r.addEventListener('change', () => { heGestoFim(); heMudou(); });
  const passo = d => { som.clique(); heAcao(rotHist, () => set(Math.max(min, Math.min(max, Math.round((get() + d)*100)/100)))); pinta(); heSyncValores(); heMudou(); };
  menos.addEventListener('click', () => passo(-.05)); mais.addEventListener('click', () => passo(.05));
  lin.append(menos, r, mais, out);
  lin.__pinta = pinta; pinta();
  return lin;
}
function heSyncPopValores(){ for (const l of HE.el.pop.querySelectorAll('.he-linha')) if (l.__pinta && !l.contains(document.activeElement)) l.__pinta(); const n = HE.el.pop.querySelector('.he-nota-opa'); if (n) n.textContent = heNotaOpa(); }
function heNotaOpa(){ const e = hud[sel]; return e && e.a < .005 ? 'Invisível na partida: o toque continua valendo no mesmo lugar (aqui no editor ele aparece tracejado).' : '0% deixa o controle invisível na partida — o toque continua valendo no mesmo lugar.'; }
function heChaveBt(rotulo, get, troca, rotHist){
  const b = novoBotao('he-bt he-chave'); b.append(nodo('i'), nodo('span', null, rotulo));
  const pinta = () => b.setAttribute('aria-pressed', String(!!get()));
  b.addEventListener('click', () => { som.clique(); if (rotHist) heAcao(rotHist, troca); else { troca(); heSync(); } pinta(); heLayoutLogo(); });
  pinta(); return b;
}
function heNoConjunto(k){ return HUDM.atual === 'ginga' ? (k === 'joy' || HUD_TROCA.indexOf(k) >= 0) : !(k === 'finta' || k === 'drible'); }
function heOnde(k){ return k === 'curva' ? 'no COM CURVA' : k === 'reset' ? 'no treino' : k === 'finta' || k === 'drible' ? 'na GINGA' : ''; }
function heMontaPop(){
  const P = HE.el.pop; if (!P) return;
  P.textContent = '';
  const k = sel, nome = heNomeDe(k), tipo = HE.pop;
  P.setAttribute('aria-label', {sel:'Escolher o controle', tam:'Tamanho', opa:'Opacidade', opc:'Opções do controle', lay:'Layouts', conf:'Salvar as mudanças?', troca:'Trocar de layout'}[tipo] || 'Editor');
  if (tipo === 'tam'){
    P.appendChild(heTit('TAMANHO', nome));
    P.appendChild(heFaixaLinha(k === 'joy' ? 'Tudo' : '', TAM_MIN, TAM_MAX, () => hud[sel].s, v => { hud[sel].s = v; prender(sel); }, 'tamanho do ' + nome, 'Tamanho do ' + nome));
    if (k === 'joy'){
      P.appendChild(heFaixaLinha('Alcance', AL_MIN, AL_MAX, () => hud.joy.al, v => { hud.joy.al = v; prender('joy'); }, 'alcance do analógico', 'Alcance do analógico'));
      P.appendChild(heFaixaLinha('Bolinha', KM_MIN, KM_MAX, () => hud.joy.km, v => { hud.joy.km = v; prender('joy'); }, 'bolinha do analógico', 'Tamanho da bolinha do analógico'));
    }
    P.appendChild(nodo('p', 'he-nota he-dica', 'Dica: com dois dedos em cima do controle, abra ou feche a pinça para mudar o tamanho direto na tela.'));
  } else if (tipo === 'opa'){
    P.appendChild(heTit('OPACIDADE', nome));
    P.appendChild(heFaixaLinha('', OPAC_MIN, 1, () => hud[sel].a, v => { hud[sel].a = v; }, 'opacidade do ' + nome, 'Opacidade do ' + nome));
    const f = nodo('div', 'he-faixa');
    for (const v of [0, .25, .5, .75, 1]){
      const b = heBt('', 'Opacidade ' + Math.round(v*100) + '%', null, Math.round(v*100) + '%');
      b.addEventListener('click', () => { som.clique(); heAcao('opacidade do ' + nome, () => { hud[sel].a = v; }); heSyncValores(); heMudou(); });
      f.appendChild(b);
    }
    P.appendChild(f);
    P.appendChild(nodo('p', 'he-nota he-dica he-nota-opa', heNotaOpa()));
  } else if (tipo === 'opc'){
    P.appendChild(heTit('OPÇÕES', nome));
    const g = nodo('div', 'he-grade');
    if (k === 'joy'){
      g.appendChild(heChaveBt('Fixo na tela', () => !hud.joy.adere && !hud.joy.segue, () => {
        if (!hud.joy.adere && !hud.joy.segue){ hud.joy.adere = true; hud.joy.segue = true; } else { hud.joy.adere = false; hud.joy.segue = false; hud.joy.oc = false; }
        heMontaPop();
      }, 'analógico fixo ou flutuante'));
      g.appendChild(heChaveBt('Nasce onde tocar', () => hud.joy.adere, () => { hud.joy.adere = !hud.joy.adere; heMontaPop(); }, 'nasce onde tocar'));
      g.appendChild(heChaveBt('Vai com o dedo', () => hud.joy.segue, () => { hud.joy.segue = !hud.joy.segue; heMontaPop(); }, 'vai com o dedo'));
    }
    if (k !== 'reset') g.appendChild(heChaveBt('Esconde quando solta', () => !!hud[sel].oc, () => { hud[sel].oc = !hud[sel].oc; }, 'esconde quando solta (' + nome + ')'));
    g.appendChild(heChaveBt('Efeitos ao pressionar', () => hud[sel].fx !== false, () => { hud[sel].fx = hud[sel].fx === false; }, 'efeitos ao pressionar (' + nome + ')'));   // v93: desligado, o botão fica parado (o toque é o mesmo)
    if (g.children.length) P.appendChild(g);
    const M = HUD_MOLDES[HUDM.molde] || HUD_MOLDES.destro;
    const rb = heBt('he-larga', 'Restaurar só este controle', 'volta', 'RESTAURAR ESTE CONTROLE'); rb.style.marginTop = '6px';
    rb.addEventListener('click', () => { som.clique(); heRestauraBotao(sel); });
    P.append(rb, nodo('p', 'he-nota he-dica', 'Só o ' + nome + ' volta ao lugar, ao tamanho e à opacidade do molde ' + M.nome + '. Os outros controles ficam como estão.'));
  } else if (tipo === 'sel'){
    P.appendChild(heTit('CONTROLES', 'toque para escolher'));
    const g = nodo('div', 'he-grade');
    for (const id of HE_ORDEM){
      if (!heNoConjunto(id) || !hud[id]) continue;
      const e = hud[id], vis = controleVisivel(id);
      const b = novoBotao('he-bt he-escolha' + (id === sel ? ' on' : '')); b.setAttribute('aria-pressed', String(id === sel));
      b.append(nodo('i'), nodo('b', null, heNomeDe(id)), nodo('small', null, vis ? Math.round(e.s*100) + '% · ' + (e.a < .005 ? 'invisível' : Math.round(e.a*100) + '%') : 'só ' + heOnde(id)));
      b.addEventListener('click', () => { som.clique(); if (!vis){ HUDM.todos = true; hudModoConfere(); } sel = id; heFechaPop(); heSync(); heLayout(false); });
      g.appendChild(b);
    }
    P.appendChild(g);
    const t = heChaveBt('Mostrar todos os controles (também os de outros modos)', () => HUDM.todos, () => { HUDM.todos = !HUDM.todos; hudModoConfere(); if (!controleVisivel(sel)) sel = 'power'; heMontaPop(); heLayout(false); }, null);
    t.style.marginTop = '6px'; t.classList.add('he-larga'); P.appendChild(t);
  } else if (tipo === 'lay') heMontaLayouts(P);
  else if (tipo === 'conf'){
    P.appendChild(heTit('SALVAR AS MUDANÇAS?', ''));
    P.appendChild(nodo('p', 'he-nota', 'Você mexeu nos controles do layout "' + heAtivo().nome + '". As mudanças ainda não foram salvas.'));
    const f = nodo('div', 'he-faixa');
    const s = heBt('he-verde', 'Salvar e sair', 'salva', 'SALVAR'), n = heBt('he-perigo', 'Sair sem salvar', 'fecha', 'SAIR SEM SALVAR'), c = heBt('', 'Continuar editando', null, 'CONTINUAR');
    s.addEventListener('click', () => { som.clique(); heFecha(true); });
    n.addEventListener('click', () => { som.clique(); heFecha(false); try { x49Toast('Saiu sem salvar: os controles ficaram como estavam.'); } catch (_) {} });
    c.addEventListener('click', () => { som.clique(); heFechaPop(); });
    f.append(s, n, c); P.appendChild(f);
  } else if (tipo === 'troca'){
    const pd = HE.popDados.para, nv = pd && typeof pd === 'object' && pd.novo ? pd : null, para = nv || HE.store.lista.find(x => x.id === pd);
    P.appendChild(heTit(nv ? 'CRIAR O LAYOUT NOVO?' : 'TROCAR DE LAYOUT?', nv ? nv.novo : para ? para.nome : ''));
    P.appendChild(nodo('p', 'he-nota', 'O layout "' + heAtivo().nome + '" tem mudanças que ainda não foram salvas.'));
    const f = nodo('div', 'he-faixa');
    const s = heBt('he-verde', nv ? 'Salvar e criar' : 'Salvar e trocar', 'salva', nv ? 'SALVAR E CRIAR' : 'SALVAR E TROCAR'),
      n = heBt('he-perigo', nv ? 'Criar sem salvar' : 'Trocar sem salvar', null, nv ? 'CRIAR SEM SALVAR' : 'TROCAR SEM SALVAR'), c = heBt('', 'Cancelar', null, 'CANCELAR');
    s.addEventListener('click', () => { som.clique(); if (para) heTrocaLayout(nv || para.id, true); });
    n.addEventListener('click', () => { som.clique(); if (para) heTrocaLayout(nv || para.id, false); });
    c.addEventListener('click', () => { som.clique(); heAbrePop('lay', HE.el.lay); });
    f.append(s, n, c); P.appendChild(f);
  }
}
function heMontaLayouts(P){
  const nv = heNuvemEstado(), t = heTit('LAYOUTS', ''), st = nodo('span', 'he-nuvem' + (nv.cls ? ' ' + nv.cls : ''), nv.txt); t.appendChild(st); P.appendChild(t);
  const cols = nodo('div', 'he-cols'), c1 = nodo('div'), c2 = nodo('div');
  const D = HE.popDados;
  if (D.nome){                                                   // o nome (de um novo ou do que está em uso)
    c1.appendChild(nodo('div', 'he-sub', D.nome.modo === 'novo' ? 'NOME DO LAYOUT NOVO' : D.nome.modo === 'copia' ? 'NOME DA CÓPIA' : 'NOVO NOME'));
    const lin = nodo('div', 'he-linha'), inp = nodo('input', 'he-nome'); inp.type = 'text'; inp.maxLength = HE_NOME_MAX; inp.value = D.nome.valor || ''; inp.setAttribute('aria-label', 'Nome do layout'); inp.autocomplete = 'off'; inp.spellcheck = false;
    const okB = heBt('he-verde', 'Confirmar o nome', 'salva', 'OK'), cB = heBt('', 'Cancelar', 'fecha');
    const confirma = () => {
      const n = heLimpa(inp.value, HE_NOME_MAX, '');
      if (!n){ inp.focus(); heAvisa('Escreva um nome para o layout.', 'ruim'); return; }
      som.clique();
      const modo = D.nome.modo; HE.popDados.nome = null;
      if (modo === 'novo'){ if (heNovoPede(n)) return; } else if (modo === 'copia') heNovoDoEditor(n); else heRenomeia(n);
      heMontaPop(); heLayout(true);
    };
    okB.addEventListener('click', confirma); cB.addEventListener('click', () => { som.clique(); HE.popDados.nome = null; heMontaPop(); heLayout(true); });
    inp.addEventListener('keydown', e => { if (e.key === 'Enter'){ e.preventDefault(); confirma(); } });
    lin.append(inp, okB, cB); c1.appendChild(lin);
    c1.appendChild(nodo('p', 'he-nota', D.nome.modo === 'novo' ? 'O layout novo começa com os controles no lugar padrão.'
      : D.nome.modo === 'copia' ? 'A cópia começa igual aos controles que estão na tela agora (o "' + heAtivo().nome + '" fica como foi salvo).' : 'Até ' + HE_NOME_MAX + ' letras.'));
    setTimeout(() => { try { inp.focus(); inp.select(); } catch (_) {} }, 30);
  } else {
    c1.appendChild(nodo('div', 'he-sub', 'SEUS LAYOUTS · toque para usar'));
    const g = nodo('div', 'he-lista');
    for (const L of HE.store.lista){
      const on = L.id === HE.store.ativo, b = novoBotao('he-bt he-escolha' + (on ? ' on' : ''), (on ? 'Em uso: ' : 'Usar o layout ') + L.nome); b.setAttribute('aria-pressed', String(on));
      b.append(nodo('i'), nodo('b', null, L.nome));
      if (on && HE.sujo) b.appendChild(nodo('small', null, 'mudou'));
      b.addEventListener('click', () => { som.clique(); heTrocaPede(L.id); });
      g.appendChild(b);
    }
    c1.appendChild(g);
    const f = nodo('div', 'he-faixa');
    const novo = heBt('', 'Criar um layout novo (com os controles no lugar padrão)', 'novo', 'NOVO'), dup = heBt('', 'Duplicar: um layout novo igual aos controles de agora', 'copia', 'DUPLICAR'),
      ren = heBt('', 'Renomear o layout em uso', 'lapis', 'NOME'), exc = heBt('he-exclui', 'Excluir o layout em uso', 'lixo', '');
    novo.disabled = dup.disabled = HE.store.lista.length >= HE_MAX_LAYOUTS; exc.disabled = HE.store.lista.length < 2;
    novo.addEventListener('click', () => { som.clique(); HE.popDados.nome = {modo:'novo', valor:heNomeLivre()}; heMontaPop(); heLayout(true); });
    dup.addEventListener('click', () => { som.clique(); HE.popDados.nome = {modo:'copia', valor:heNomeCopia()}; heMontaPop(); heLayout(true); });
    ren.addEventListener('click', () => { som.clique(); HE.popDados.nome = {modo:'renomear', valor:heAtivo().nome}; heMontaPop(); heLayout(true); });
    exc.addEventListener('click', () => heExcluiPede(exc));
    f.append(novo, dup, ren, exc); c1.appendChild(f);
    if (HE.store.lista.length >= HE_MAX_LAYOUTS) c1.appendChild(nodo('p', 'he-nota', 'São ' + HE_MAX_LAYOUTS + ' layouts no máximo: exclua um para criar outro.'));
  }
  c2.appendChild(nodo('div', 'he-sub', 'MOLDES · lugar e tamanho de todos'));
  const mol = nodo('div', 'he-faixa');
  for (const id in HUD_MOLDES){
    const M = HUD_MOLDES[id], b = heBt(HUDM.molde === id ? 'on' : '', 'Molde ' + M.nome + ': ' + M.nota, null, M.nome); b.title = M.nota;
    b.addEventListener('click', () => { som.clique(); heAcao('molde ' + M.nome, () => hudAplicaMolde(id)); if (!controleVisivel(sel)) sel = 'power'; heAvisa('Molde ' + M.nome + ': ' + M.nota + '.', 'bom', 3800); heMontaPop(); heLayout(false); });
    mol.appendChild(b);
  }
  mol.appendChild(HE.el.rest);                                  // (o "restaurar o padrão" de sempre: todos os controles deste layout)
  if (typeof v702Modo === 'function' && v702Modo('ginga')){       // (a GINGA saiu do jogo na v70.2: o layout dela só aparece com o modo de volta)
    mol.appendChild(heChaveBt('Layout da GINGA', () => HUDM.editaGinga, () => { HUDM.editaGinga = !HUDM.editaGinga; if (HUDM.editaGinga) HUDM.todos = false; hudModoConfere(); if (!controleVisivel(sel)) sel = 'power'; heMontaPop(); heLayout(false); }, null));
  }
  c2.appendChild(mol);
  cols.append(c1, c2); P.appendChild(cols);
}
function heNomeCopia(){ const b = heAtivo().nome.slice(0, HE_NOME_MAX - 2), usados = new Set(HE.store.lista.map(L => L.nome.toLowerCase())); for (let i = 2; i < 99; i++){ const n = (b + ' ' + i).slice(0, HE_NOME_MAX); if (!usados.has(n.toLowerCase())) return n; } return b; }
function heNomeLivre(){ const usados = new Set(HE.store.lista.map(L => L.nome.toLowerCase())); for (let i = 2; i < 99; i++){ const n = 'Layout ' + i; if (!usados.has(n.toLowerCase())) return n; } return 'Layout'; }
function heTrocaPede(id){
  if (id === HE.store.ativo){ heFechaPop(); return; }
  heGestoFim();
  if (HE.sujo){ HE.popDados.para = id; heAbrePop('troca', HE.el.lay); return; }
  heTrocaLayout(id, false);
}
function heNovoPede(nome){                                       // NOVO: com mudanças por salvar, pergunta antes (SALVAR E CRIAR / CRIAR SEM SALVAR)
  if (HE.store.lista.length >= HE_MAX_LAYOUTS){ heAvisa('São ' + HE_MAX_LAYOUTS + ' layouts no máximo: exclua um para criar outro.', 'ruim'); return false; }
  heGestoFim();
  if (HE.sujo){ HE.popDados.para = {novo:nome}; heAbrePop('troca', HE.el.lay); return true; }
  heNovoPadrao(nome, false); return false;
}
function heNovoPadrao(nome, salvaAntes){
  if (salvaAntes) heCommit();
  heGestoFim();
  const L = heNovoLayout(nome, heEstadoPadrao(), false);
  HE.store.lista.push(L); heNomesUnicos(HE.store.lista);
  HE.store.ativo = L.id; HE.store.ativoEm = Date.now();
  heAplica(L.estado); HE.salvo = heEstado(); HE.hist = []; HE.refaz = []; HE.sujo = false;
  heGravaStore(); heSalvarAparelho(); heApaga(HE_CHAVE_RASCUNHO); heNuvemLogo();
  if (!controleVisivel(sel)) sel = 'power';
  heAvisa('Layout "' + L.nome + '" criado (controles no lugar padrão) e em uso.', 'bom');
}
function heTrocaLayout(id, salvaAntes){
  if (id && typeof id === 'object' && id.novo){ heNovoPadrao(id.novo, salvaAntes); HE.popDados = {}; heFechaPop(); heLayout(false); return; }
  const L = HE.store.lista.find(x => x.id === id); if (!L) return;
  if (salvaAntes) heCommit();
  heGestoFim();
  HE.store.ativo = id; HE.store.ativoEm = Date.now();
  heAplica(L.estado); HE.salvo = heEstado(); HE.hist = []; HE.refaz = []; HE.sujo = false;
  heGravaStore(); heSalvarAparelho(); heApaga(HE_CHAVE_RASCUNHO); heNuvemLogo();
  if (!controleVisivel(sel)) sel = 'power';
  heFechaPop(); heAvisa('Layout "' + L.nome + '" em uso.', 'bom'); heLayout(false);
}
function heNovoDoEditor(nome){
  if (HE.store.lista.length >= HE_MAX_LAYOUTS){ heAvisa('São ' + HE_MAX_LAYOUTS + ' layouts no máximo: exclua um para criar outro.', 'ruim'); return; }
  heGestoFim();
  const L = heNovoLayout(nome, heEstado(), false);
  HE.store.lista.push(L); heNomesUnicos(HE.store.lista);
  HE.store.ativo = L.id; HE.store.ativoEm = Date.now();
  HE.salvo = heEstado(); HE.hist = []; HE.refaz = []; HE.sujo = false;
  heGravaStore(); heSalvarAparelho(); heApaga(HE_CHAVE_RASCUNHO); heNuvemLogo();
  heAvisa('Layout "' + L.nome + '" criado e em uso.', 'bom');
}
function heRenomeia(nome){
  const L = heAtivo(); L.nome = nome; L.atualizado = Date.now(); L.prov = false;
  heNomesUnicos(HE.store.lista.filter(x => x !== L).concat([L]));   // (se o nome já existe, este ganha o número: "Canhoto 2")
  heGravaStore(); heNuvemLogo();
  heAvisa('Agora o layout se chama "' + L.nome + '".', 'bom');
}
function heExcluiPede(b){
  if (HE.store.lista.length < 2) return;
  const agora = Date.now();
  if (!HE.popDados.exclui || agora - HE.popDados.exclui > 3000){
    HE.popDados.exclui = agora; b.classList.add('he-perigo', 'confirma'); const t = b.querySelector('b'); if (t) t.textContent = 'TOQUE DE NOVO'; try { som.erro(); } catch (_) {}
    setTimeout(() => { if (HE.popDados.exclui === agora && b.isConnected){ HE.popDados.exclui = 0; b.classList.remove('he-perigo', 'confirma'); if (t) t.textContent = ''; } }, 3000);
    return;
  }
  som.clique(); heGestoFim();
  const L = heAtivo();
  HE.store.lista = HE.store.lista.filter(x => x.id !== L.id); HE.store.apagados.push({id:L.id, quando:agora}); HE.store.apagados = HE.store.apagados.slice(-40);
  const prox = HE.store.lista[0];
  HE.store.ativo = prox.id; HE.store.ativoEm = agora;
  heAplica(prox.estado); HE.salvo = heEstado(); HE.hist = []; HE.refaz = []; HE.sujo = false;
  heGravaStore(); heSalvarAparelho(); heApaga(HE_CHAVE_RASCUNHO); heNuvemLogo();
  if (!controleVisivel(sel)) sel = 'power';
  HE.popDados = {}; heMontaPop(); heAvisa('Layout "' + L.nome + '" excluído. Em uso: "' + prox.nome + '".', ''); heLayout(false);
}
function heRestauraBotao(k){                                     // só este volta ao molde (o lugar e o tamanho) e ao padrão (a opacidade, o jeito)
  const gingaSet = HUDM.atual === 'ginga' && HUD_TROCA.indexOf(k) >= 0;
  const d = gingaSet ? HUD_GINGA_PADRAO[k] : HUD_PADRAO[k]; if (!d) return;
  const M = HUD_MOLDES[HUDM.molde] || HUD_MOLDES.destro, v = HUDM.molde !== 'destro' ? (gingaSet ? M.ginga : M.base)[k] : null;
  heAcao('restaurar o ' + heNomeDe(k), () => {
    const e = hud[k]; Object.assign(e, JSON.parse(JSON.stringify(d))); e.fx = true;   // (os efeitos ao pressionar voltam ligados, como no padrão)
    if (v){ e.x = v[0]; e.y = v[1]; e.s = v[2]; }
    prender(k);
  });
  heAvisa(heNomeDe(k) + ' voltou ao padrão' + (HUDM.molde !== 'destro' ? ' do molde ' + M.nome : '') + ' (↶ desfaz).', 'bom');
  if (HE.pop) heMontaPop(); heLayout(false);
}

/* ---------------------------------------------------------------- 12) o resto do jogo usa o editor novo */
abrirEdicao = function(){ heAbre(); };
fecharEdicao = function(ok){ heFecha(!!ok); };                   // (true = salvar e sair · false = sair sem salvar, como o Cancelar de antes)
editDown = function(){};                                         // (o toque do editor mora na escuta acima)
posicionaPainel = function(){ if (HE.aberto) heLayoutLogo(); };
hudSolta = function(){ if (HE.aberto) heSync(); };               // Fase 1: soltar não empurra mais o controle (ele fica onde o dedo deixou)
const heSyncPanelAntes = syncPanel;
syncPanel = function(){ const r = heSyncPanelAntes.apply(this, arguments); if (HE.aberto) heSync(); return r; };
// a pausa: com dois ou mais layouts, um botão troca o layout em uso (na hora, também no online)
(function hePausaLayout(){
  const hudBt = document.getElementById('pa-hud'); if (!hudBt) return;
  const b = novoBotao('pa-bt he-pa-layout'); b.id = 'pa-layout';
  const pinta = () => {                                          // (só entra na pausa com dois ou mais layouts: com um, nem ocupa lugar)
    const L = HE.store ? heAtivo() : null, mostra = !!HE.store && HE.store.lista.length >= 2;
    if (!mostra){ if (b.isConnected) b.remove(); return; }
    if (!b.isConnected) hudBt.after(b);
    b.textContent = ''; const ic = nodo('i', 'v71-ic'); ic.innerHTML = heIcone('layouts');
    b.append(ic, document.createTextNode('LAYOUT ⇄'), nodo('small', null, L ? L.nome.toUpperCase() : ''));
    b.setAttribute('aria-label', 'Trocar o layout dos controles (agora: ' + (L ? L.nome : '') + ')');
  };
  b.addEventListener('click', () => {
    som.clique(); if (!HE.store || HE.store.lista.length < 2) return;
    const l = HE.store.lista, i = l.findIndex(x => x.id === HE.store.ativo), L = heUsaLayout(l[(i + 1) % l.length].id);
    pinta(); if (L) try { x49Toast('Controles: ' + L.nome); } catch (_) {}
  });
  HE.paLayout = pinta; pinta();
  const antes = pausaAbre;
  pausaAbre = function(){ const r = antes.apply(this, arguments); try { pinta(); } catch (_) {} return r; };
})();
// Ajustes › Controles: o layout em uso (com dois ou mais, um toque troca)
(function heAjustesLayout(){
  const b = document.getElementById('ajx-editar'), g = b && b.parentElement; if (!g) return;
  const nota = nodo('p', 'ajx-nota'), box = nodo('div', 'ajx-seg he-aj-layouts'); box.setAttribute('role', 'group'); box.setAttribute('aria-label', 'Layout dos controles em uso');
  g.append(nota, box); HE.aj = {nota, box};
})();
function heAjSync(){
  if (!HE.aj || !HE.store) return;
  const {nota, box} = HE.aj, l = HE.store.lista;
  box.textContent = '';
  nota.textContent = l.length > 1 ? 'Layout em uso (toque para trocar):' : 'Layout em uso: ' + heAtivo().nome + '. No editor (LAYOUTS) dá para criar outros com nome.';
  box.hidden = l.length < 2;
  for (const L of l){
    const on = L.id === HE.store.ativo, x = novoBotao(on ? 'on' : ''); x.textContent = L.nome; x.setAttribute('aria-pressed', String(on));
    x.addEventListener('click', () => { som.clique(); const u = heUsaLayout(L.id); heAjSync(); if (u) try { x49Toast('Controles: ' + u.nome); } catch (_) {} });
    box.appendChild(x);
  }
}
if (typeof ajxSync === 'function'){ const heAjxAntes = ajxSync; ajxSync = function(){ const r = heAjxAntes.apply(this, arguments); try { heAjSync(); } catch (_) {} return r; }; }

// o Esc com o editor aberto (a camada de cima, em tools/v70/polimento.js): fecha o que estiver por cima e pergunta antes de perder as mudanças
try { for (const d of V70C_LISTA) if (d.q === '#hp') d.fecha = () => hePedeFechar(true); } catch (_) {}

/* ---------------------------------------------------------------- 13) começa */
try { heIniciaLayouts(); } catch (e) { try { console.error('RACHA Fase 1 · os layouts não abriram:', e); } catch (_) {} if (!HE.store){ const L = heNovoLayout('Principal', heEstado(), false); HE.store = {v:1, ativo:L.id, ativoEm:0, lista:[L], apagados:[]}; } }
try { heRecuperaConfere(); } catch (_) {}
setTimeout(() => { try { if (HE.recupera && lobby.aberto && !HE.aberto) filaPops(); } catch (_) {} }, 1500);
window.RACHA_HUD = {versao:'v92-fase1', layouts:() => HE.store && HE.store.lista.map(L => ({id:L.id, nome:L.nome, ativo:L.id === HE.store.ativo})), aberto:() => HE.aberto};
