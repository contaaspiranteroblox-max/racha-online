/* ======================================================================================================================
   RACHA v103 · OS CONTROLES DO JEITO DE CADA UM (tools/v103/controles.js; o estilo em app/public/game/v103-controles.css)
   O pedido (03/11/2026): "crie uma função nas configurações para configurar o controle — chute no quadrado etc., várias
   coisas — e pra PC também caso não tenha" e "caso tenha algum delay no analógico, retire".
   1) O CONTROLE (Ajustes › Controles › Controle): cada ação com o botão que o jogador quiser — toca na ação e aperte o botão
      no controle (Esc ou 8 s sem apertar cancela). Cada ação tem até dois botões; o botão que já era de outra ação sai de lá
      (se era o único dela, as duas trocam de botão: nenhuma ação fica sem botão). Os jeitos prontos: PADRÃO (A passe, B
      chute), ESTILO FIFA (✕ passe, □ chute, ○ curva) e INVERTIDO (o "Trocar A e B" da v88: quem tinha ligado continua com
      ele). Os nomes dos botões são os do controle ligado (PlayStation ✕ ○ □ △ L1 R1 L2 R2 · Xbox A B X Y LB RB LT RT ·
      Nintendo · ou "Botão n") e mudam quando outro controle conecta. Mais: a zona morta do analógico do controle (com o
      analógico desenhado ao vivo), a vibração do controle no chute (vibrationActuator, quando o navegador tem) e o VOLTAR AO
      PADRÃO. Nos menus, CONFIRMAR e VOLTAR também têm botão (o START continua sendo a pausa).
   2) SEM ATRASO: o controle é lido no COMEÇO de cada quadro do jogo (a v88 lia num laço à parte que rodava DEPOIS do quadro:
      a partida usava o controle do quadro anterior); a zona morta do analógico é redonda, menor (12%, era 28%) e ajustável,
      e a direção é a mesma do analógico da tela (as 32 direções com a mesma folga, ou a direção livre do motor próprio) — o
      que vai para o servidor no online é o mesmo que a previsão usa (o getInput de sempre).
      O analógico da tela começa a andar a 6% do curso (era 15%; ver controles.py) — quem tinha o padrão antigo guardado nos
      ajustes finos passa para o novo uma vez.
   3) O TECLADO: a PAUSA também numa tecla (P; o Esc continua), as dicas do começo da partida e do tutorial com as teclas que
      o jogador escolheu (ou os botões do controle, para quem joga com ele) e o cartão dos chutes do Rachão com o botão.
   Guardado em racha-controle-v103 (tudo com try/catch: sem o armazenamento o jogo funciona, só não guarda).
   ====================================================================================================================== */
const V103_CHAVE = 'racha-controle-v103';
const V103_ACOES = [                                   // [id, nome, o que faz, o grupo] — a ordem da lista dos Ajustes
  ['passe', 'PASSE', 'batida fraca', 'jogo'],
  ['chute', 'CHUTE', 'batida forte', 'jogo'],
  ['curva', 'CURVA', 'segure para carregar · COM CURVA', 'jogo'],
  ['pausa', 'PAUSA', 'abre e fecha o menu da partida', 'jogo'],
  ['cav', 'CAVADINHA', 'arma o próximo chute por cima', 'rachao'],
  ['cve', 'CURVA ESQUERDA', 'o próximo chute entorta para a esquerda', 'rachao'],
  ['cvd', 'CURVA DIREITA', 'o próximo chute entorta para a direita', 'rachao'],
  ['sup', 'SUPER CHUTE', 'segure para carregar e solte', 'rachao'],
  ['finta', 'FINTA', 'ameaça o chute (o marcador cai)', 'ginga'],
  ['drible', 'DRIBLE', 'arranca com um toquinho na bola', 'ginga'],
  ['ok', 'CONFIRMAR', 'aperta o botão aceso', 'menu'],
  ['volta', 'VOLTAR', 'o mesmo do Esc', 'menu']
];
const V103_GRUPOS = [['jogo', 'Na partida'], ['rachao', 'Chutes do Rachão · nas salas que ligam'], ['ginga', 'GINGA'], ['menu', 'Nos menus']];
const V103_ACAO = new Map(V103_ACOES.map(a => [a[0], a]));
const v103Escopo = id => { const a = V103_ACAO.get(id); return a && a[3] === 'menu' ? 'menu' : 'jogo'; };   // (a partida e os menus nunca valem juntos)
// os jeitos prontos (no mapa padrão dos controles: 0 = o de baixo, 1 = o da direita, 2 = o da esquerda, 3 = o de cima)
const V103_BASE = {curva:[2], pausa:[9], cav:[3], cve:[4], cvd:[5], sup:[7], finta:[6], drible:[10]};
const V103_JEITOS = {
  padrao:   {nome:'PADRÃO', mapa:Object.assign({passe:[0], chute:[1]}, V103_BASE, {ok:[0], volta:[1]}), mostra:[['passe', 0], ['chute', 1]]},
  fifa:     {nome:'ESTILO FIFA', mapa:Object.assign({}, V103_BASE, {passe:[0], chute:[2], curva:[1], ok:[0], volta:[1]}), mostra:[['passe', 0], ['chute', 2], ['curva', 1]]},
  invertido:{nome:'INVERTIDO', mapa:Object.assign({passe:[1], chute:[0]}, V103_BASE, {ok:[1], volta:[0]}), mostra:[['passe', 1], ['chute', 0]]}
};
const V103_ZONA = .12, V103_CAP_MS = 8000;
const V103 = {
  mapa:null, zona:V103_ZONA, vibra:true,
  cap:null, capT:0, capMs:V103_CAP_MS,                 // a troca de botão em andamento: {id, i, t0, segura, aviso}
  andando:false, ax:0, ay:0, mag:0,                     // o analógico do controle (andando, o eixo e a força reescalada)
  supPad:false, teclaV:false,                           // o SUPER segurado pelo controle · a tecla do SUPER (o V) segurada
  tecladoT:0, toqueT:0, idVisto:'', fam:'xbox', ui:null, erro:null, quadros:0
};

/* ---------------------------------------------------------------- 1) o que fica guardado */
function v103Copia(m){ const o = {}; for (const k in m) o[k] = m[k].slice(); return o; }
// (os botões 12 a 16 só não valem num controle de mapa padrão — o direcional e o do sistema; a troca recusa na hora. Num
// controle sem o mapa padrão eles podem ser botões de verdade: o guardado fica)
function v103Valido(i){ return Number.isInteger(i) && i >= 0 && i < 32; }
function v103Limpa(o){                                 // um mapa de fora (guardado): só o conhecido; botão repetido no mesmo escopo = o padrão
  const P = V103_JEITOS.padrao.mapa, m = {};
  for (const [id] of V103_ACOES){
    let l = o && Array.isArray(o[id]) ? o[id].filter(v103Valido) : null;
    if (l) l = l.filter((i, k) => l.indexOf(i) === k).slice(0, 2);
    m[id] = l && l.length ? l : null;
  }
  for (const esc of ['jogo', 'menu']){                   // conferência: cada botão numa ação só (por escopo)
    const usados = new Map();
    for (const [id] of V103_ACOES){
      if (v103Escopo(id) !== esc || !m[id]) continue;
      for (const b of m[id]){ if (usados.has(b)) return v103Copia(P); usados.set(b, id); }
    }
    for (const [id] of V103_ACOES){                        // (a ação que faltou: o botão do padrão, se estiver livre; senão um livre)
      if (v103Escopo(id) !== esc || m[id]) continue;
      const livre = [P[id][0]].concat([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]).find(b => !usados.has(b));
      if (livre == null) return v103Copia(P);
      m[id] = [livre]; usados.set(livre, id);
    }
  }
  return m;
}
function v103Carrega(){
  let o = null;
  try { o = JSON.parse(localStorage.getItem(V103_CHAVE) || 'null'); } catch (_) { o = null; }
  if (o && typeof o === 'object' && o.mapa){
    V103.mapa = v103Limpa(o.mapa);
    if (typeof o.on === 'boolean') V88PAD.on = o.on;
    const z = Number(o.zona); if (Number.isFinite(z) && z >= .05 && z <= .4) V103.zona = Math.round(z*100)/100;
    V103.vibra = o.vibra !== false;
    return;
  }
  // a primeira vez: o que a v88 guardava (racha88-controle: ligado e o "Trocar A e B") vira o jeito INVERTIDO
  V103.mapa = v103Limpa(V88PAD.troca88 ? V103_JEITOS.invertido.mapa : V103_JEITOS.padrao.mapa);
}
function v103Salva(){
  try { localStorage.setItem(V103_CHAVE, JSON.stringify({v:1, on:V88PAD.on, mapa:V103.mapa, zona:V103.zona, vibra:V103.vibra})); }
  catch (_) { try { uiAvisoSalvar(); } catch (_) {} }
  try { v88PadSalva(); } catch (_) {}                    // (e o da v88: ligado e o A/B, para quem voltar a uma versão de antes)
}
// o "Trocar A e B" da v88 (V88PAD.troca) continua valendo de fora: ligado = B no PASSE e no CONFIRMAR, A no CHUTE e no VOLTAR
V88PAD.troca88 = !!V88PAD.troca;
function v103EhInvertido(){ const m = V103.mapa; return !!m && m.passe.indexOf(1) >= 0 && m.chute.indexOf(0) >= 0; }
Object.defineProperty(V88PAD, 'troca', {configurable:true, enumerable:true,
  get(){ return V103.mapa ? v103EhInvertido() : !!V88PAD.troca88; },
  set(v){
    if (!V103.mapa){ V88PAD.troca88 = !!v; return; }
    if (!!v === v103EhInvertido()) return;
    const a = v ? 1 : 0, b = v ? 0 : 1;
    v103Atribui('passe', 0, a); v103Atribui('chute', 0, b); v103Atribui('ok', 0, a); v103Atribui('volta', 0, b);
    v103Salva(); v103Pinta();
  }});
v103Carrega();

/* ---------------------------------------------------------------- 2) os nomes dos botões (a família pelo nome do controle) */
const V103_NOMES = {
  ps:      ['✕', '○', '□', '△', 'L1', 'R1', 'L2', 'R2', 'SHARE', 'OPTIONS', 'L3', 'R3', '↑', '↓', '←', '→', 'PS'],
  xbox:    ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'VIEW', 'MENU', 'LS', 'RS', '↑', '↓', '←', '→', 'XBOX'],
  nintendo:['B', 'A', 'Y', 'X', 'L', 'R', 'ZL', 'ZR', '−', '+', 'LS', 'RS', '↑', '↓', '←', '→', 'HOME']
};
const V103_FALA_PS = ['xis', 'bola', 'quadrado', 'triângulo'];
const V103_FAMILIA = {ps:'PlayStation', xbox:'Xbox', nintendo:'Nintendo', gen:'genérico'};
function v103Familia(g){                               // a família pelo nome que o navegador dá ao controle (e o fabricante)
  if (!g) return V103.fam;
  if (g.mapping !== 'standard') return 'gen';            // (sem o mapa padrão o número do botão é o do aparelho: "Botão n")
  const s = String(g.id || '').toLowerCase();
  if (/045e|xbox|xinput|x-box/.test(s)) return 'xbox';
  if (/057e|nintendo|switch|joy-con|pro controller/.test(s)) return 'nintendo';
  if (/054c|playstation|dualshock|dualsense|sony|wireless controller/.test(s)) return 'ps';
  return 'gen';
}
function v103Nome(i, fam){                             // o nome curto (texto) do botão i
  fam = fam || V103.fam;
  if (fam === 'gen') return 'Botão ' + (i + 1);
  const L = V103_NOMES[fam];
  if (fam === 'ps'){ const id = String(V103.idVisto).toLowerCase(); if (i === 8 && /dualsense|0ce6|0df2/.test(id)) return 'CREATE'; }
  if (fam === 'xbox' && /360/.test(String(V103.idVisto))){ if (i === 8) return 'BACK'; if (i === 9) return 'START'; }
  return L && L[i] != null ? L[i] : 'Botão ' + (i + 1);
}
function v103Fala(i, fam){ fam = fam || V103.fam; return fam === 'ps' && i <= 3 ? V103_FALA_PS[i] : v103Nome(i, fam); }   // (para o leitor de tela)
const V103_SVG_PS = [                                  // os símbolos do PlayStation desenhados (a fonte do aparelho pode não ter)
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/></svg>',
  '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="6.6" fill="none" stroke="currentColor" stroke-width="3.2"/></svg>',
  '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5.6" y="5.6" width="12.8" height="12.8" rx="1.4" fill="none" stroke="currentColor" stroke-width="3.2"/></svg>',
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4.8l7.6 13.2H4.4z" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/></svg>'
];
function v103Glifo(i, fam){                            // o botão desenhado (um chip com a cor do controle)
  fam = fam || V103.fam;
  const s = nodo('span', 'v103-gl v103-' + fam + ' v103-b' + i + (i <= 3 ? ' v103-face' : ''));
  if (fam === 'ps' && i <= 3) s.innerHTML = V103_SVG_PS[i]; else s.textContent = v103Nome(i, fam);
  s.dataset.bt = String(i);
  return s;
}
const v103NomeAcao = id => { const a = V103_ACAO.get(id); return a ? a[1] : id; };
const v103Botoes = id => (V103.mapa && V103.mapa[id]) || [];

/* ---------------------------------------------------------------- 3) a troca de um botão (as regras de conflito) */
// id = a ação, i = 0 (o primeiro botão) ou 1 (o segundo), b = o botão. Devolve {ok, msg}. Nenhuma ação fica sem botão.
function v103Atribui(id, i, b){
  const M = V103.mapa, esc = v103Escopo(id), cs = (M[id] || []).slice(), nb = v103Nome(b), na = v103NomeAcao(id);
  const j = cs.indexOf(b);
  if (j === i) return {ok:true, msg:nb + ' já é ' + na + '.'};
  if (j >= 0){                                           // (o outro botão da mesma ação: os dois trocam de lugar)
    if (cs[i] == null) return {ok:true, msg:nb + ' já é ' + na + '.'};
    const t = cs[i]; cs[i] = b; cs[j] = t; M[id] = cs;
    return {ok:true, msg:nb + ' agora é o primeiro botão de ' + na + '.'};
  }
  let dono = null;
  for (const [o] of V103_ACOES) if (o !== id && v103Escopo(o) === esc && (M[o] || []).indexOf(b) >= 0) dono = o;
  let extra = '';
  if (dono){
    const l = M[dono];
    if (l.length > 1){ M[dono] = l.filter(x => x !== b); extra = ' (saiu de ' + v103NomeAcao(dono) + ')'; }
    else if (cs[i] != null){ M[dono] = [cs[i]]; extra = ' e ' + v103Nome(cs[i]) + ' foi para ' + v103NomeAcao(dono) + ' (os dois trocaram)'; }
    else return {ok:false, msg:nb + ' é o único botão de ' + v103NomeAcao(dono) + ': troque aquele primeiro.'};
  }
  if (i === 0 || !cs.length) cs[0] = b; else cs[1] = b;
  M[id] = cs.filter((x, k) => x != null && cs.indexOf(x) === k).slice(0, 2);
  return {ok:true, msg:nb + ' agora é ' + na + extra + '.'};
}
function v103Jeito(id){                                 // um dos jeitos prontos (a zona morta e a vibração não mudam)
  const J = V103_JEITOS[id]; if (!J) return;
  v103CapFim(null);
  V103.mapa = v103Limpa(J.mapa); v103Salva(); v103Pinta();
  v103Msg(J.nome + ': ' + J.mostra.map(([a, b]) => v103Nome(b) + ' ' + v103NomeAcao(a).toLowerCase()).join(', ') + '.');
}
function v103Iguais(a, b){ return V103_ACOES.every(([id]) => JSON.stringify(a[id] || []) === JSON.stringify(b[id] || [])); }   // (ação por ação)
function v103JeitoAtual(){
  for (const id in V103_JEITOS) if (v103Iguais(V103.mapa, V103_JEITOS[id].mapa)) return id;
  return '';
}

/* ---------------------------------------------------------------- 4) ler o controle: no começo de cada quadro do jogo */
function v103Bt(g, i){                                  // apertado? (os gatilhos L2/R2 são analógicos: só com mais de 40%)
  const b = g.buttons[i]; if (!b) return false;
  const v = +b.value || 0;
  if (g.mapping === 'standard' && (i === 6 || i === 7)) return v > .4 || (!!b.pressed && !(v > 0));
  return !!b.pressed || v > .5;
}
function v103PadLe(){
  const g = V88PAD.on ? v88Pad() : null;
  if (!g){
    if (V88PAD.ativo || V88PAD.segura.kick || V88PAD.segura.power || V88PAD.segura.curva || V103.supPad){ v103PadSolta(true); V88PAD.ativo = false; v103Pinta(); }
    if (V103.cap) v103CapFim('O controle saiu: troca cancelada.');
    V88PAD.ant = []; V103.ax = V103.ay = V103.mag = 0; V103.andando = false;
    return;
  }
  V88PAD.ativo = true; V103.quadros++;
  const vid = g.id + '|' + g.mapping;
  if (V103.idVisto !== vid){ V103.idVisto = vid; V103.fam = v103Familia(g); V88PAD.nome = g.id; v103Pinta(); }
  const n = g.buttons.length, bt = new Array(n), novo = new Array(n);
  let algum = false;
  for (let i = 0; i < n; i++){ bt[i] = v103Bt(g, i); novo[i] = bt[i] && !V88PAD.ant[i]; if (bt[i]) algum = true; }
  // a direção: o direcional (na hora) ou o analógico esquerdo (zona morta redonda; liga na borda dela e solta um pouco antes)
  const ax = +g.axes[0] || 0, ay = +g.axes[1] || 0, pad = g.mapping === 'standard';
  const dx = pad ? (bt[15] ? 1 : 0) - (bt[14] ? 1 : 0) : 0, dy = pad ? (bt[13] ? 1 : 0) - (bt[12] ? 1 : 0) : 0;
  const l = Math.hypot(ax, ay), z = V103.zona;
  let mx = 0, my = 0, menuX = 0, menuY = 0;
  if (dx || dy){ const k = Math.hypot(dx, dy); mx = dx/k; my = dy/k; menuX = dx; menuY = dy; V103.andando = true; V103.mag = 1; }
  else {
    if (l > (V103.andando ? z*.8 : z)){ mx = ax/l; my = ay/l; V103.andando = true; } else V103.andando = false;
    V103.mag = l > z ? Math.min(1, (l - z)/(1 - z)) : 0;      // (a força reescalada: 0 na borda da zona morta, 1 no fim do curso)
    if (l > .5){ menuX = ax; menuY = ay; }                  // (nos menus o analógico só anda com vontade: metade do curso)
  }
  V88PAD.mx = mx; V88PAD.my = my; V103.ax = ax; V103.ay = ay;
  if (mx || my || algum) V88PAD.usouT = performance.now();
  // o que cada ação tem apertado agora; "apertou agora" = nenhum botão dela estava apertado no quadro anterior (com o mapa de
  // agora: o botão que continua apertado depois de uma troca não vira um aperto novo da ação que ele ganhou)
  const prev = V88PAD.ant, cur = {};
  for (const [id] of V103_ACOES){ const l2 = V103.mapa[id] || []; let s = false; for (const b of l2) if (bt[b]) { s = true; break; } cur[id] = s; }
  const ap = id => cur[id] && !v103Botoes(id).some(b => prev[b]);
  try {
    if (V103.cap) v103CapLe(bt, novo);                    // trocando um botão: o aperto é da troca (não anda nos menus nem joga)
    else {
      if (AJX.raiz && !AJX.raiz.hidden) v103AoVivo(bt, novo);
      if (v88PadEmJogo()) v103PadJogo(cur, ap);
      else v103PadMenu(cur, ap, novo, menuX, menuY);
    }
  } finally { V88PAD.ant = bt; }
}
function v103PadJogo(cur, ap){                          // na partida: o mesmo caminho do teclado (e dos dedos na tela)
  const kick = cur.passe, power = cur.chute, curva = cur.curva;
  if (ap('passe')) BOTAO.kickL = true;
  if (ap('chute')) BOTAO.powerL = true;
  if (ap('curva') && typeof CV !== 'undefined') CV.toque = true;
  keys.Space = kick || !!keys.__teclaSpace; keys.KeyK = power || !!keys.__teclaKeyK; keys.KeyU = curva || !!keys.__teclaKeyU;
  V88PAD.segura = {kick, power, curva};
  if (ap('finta')) fazFinta();
  if (ap('drible')) fazDrible();
  // os chutes do Rachão (só nas salas que ligam): os toques e o SUPER segurado
  let o = null, livre = false;
  try { livre = typeof cr99Livre === 'function' && cr99Livre(); o = livre ? cr99Op() : null; } catch (_) {}
  if (o){
    if (ap('cav') && o.lob) cr99Toca('cav');
    if (ap('cve') && o.curva) cr99Toca('cve');
    if (ap('cvd') && o.curva) cr99Toca('cvd');
  }
  const sup = !!(o && o.super && cur.sup);
  if (sup){ V103.supPad = true; CR99.suTecla = true; }
  else if (V103.supPad){ V103.supPad = false; if (typeof CR99 !== 'undefined') CR99.suTecla = !!V103.teclaV; }   // soltou: o super sai (como soltar o V)
  if (ap('pausa')) pausaAbre();
}
function v103PadMenu(cur, ap, novo, menuX, menuY){      // nos menus: andar entre os botões, confirmar e voltar
  if (V88PAD.segura.kick || V88PAD.segura.power || V88PAD.segura.curva || V103.supPad) v103PadSolta(true);
  const dir = v88PadRepete('d', menuX, menuY);
  if (dir) v88PadAnda(dir);
  if (ap('ok')){ v88PadConfirma(); return; }
  const ok = v103Botoes('ok');
  if (ap('volta') || (novo[8] && ok.indexOf(8) < 0 && v103Botoes('pausa').indexOf(8) < 0)){ v88PadVolta(); return; }   // (o SELECT também volta)
  if (ap('pausa')){ if (PAUSA.aberta) pausaFecha(); else v88PadVolta(); }
}
function v103PadSolta(cancela){                         // solta tudo o que o controle segurava (o teclado continua)
  if (V88PAD.segura.kick) keys.Space = !!keys.__teclaSpace;
  if (V88PAD.segura.power) keys.KeyK = !!keys.__teclaKeyK;
  if (V88PAD.segura.curva) keys.KeyU = !!keys.__teclaKeyU;
  if (V103.supPad){                                      // o SUPER carregando: sair da partida ou o controle sumir não chuta (cancela)
    V103.supPad = false;
    try { if (cancela && !V103.teclaV && CR99.suToque == null) CR99.sx++; CR99.suTecla = !!V103.teclaV; } catch (_) {}
  }
  V88PAD.segura = {kick:false, power:false, curva:false}; V88PAD.mx = V88PAD.my = 0; V88PAD.setor = null;
}
v88PadSolta = function(){ return v103PadSolta(true); };   // (a v88 chama ao desconectar)
v88PadLaco = function(){ V88PAD.raf = 0; };               // (o laço à parte da v88 sai: quem lê é o quadro do jogo, antes de tudo)
const frameAntes103 = frame;
frame = function(now){
  try { v103PadLe(); } catch (e) { V103.erro = String(e && e.stack || e); }
  return frameAntes103.apply(this, arguments);
};
// a tecla do SUPER segurada no teclado (para o controle e o teclado juntos não se atrapalharem)
window.addEventListener('keydown', e => { V103.tecladoT = performance.now(); if (!e.repeat && teclaCanon(e.code) === 'KeyV') V103.teclaV = true; }, true);
window.addEventListener('keyup', e => {
  if (teclaCanon(e.code) !== 'KeyV') return;
  V103.teclaV = false;
  if (V103.supPad) try { CR99.suTecla = true; } catch (_) {}   // (o controle ainda segura: o super continua carregando)
}, true);
window.addEventListener('blur', () => { V103.teclaV = false; });
document.addEventListener('pointerdown', () => { V103.toqueT = performance.now(); }, true);

/* ---------------------------------------------------------------- 5) a direção: a mesma regra do analógico da tela */
function v103PadDirecao(){
  const mx = V88PAD.mx, my = V88PAD.my;
  if (typeof v94Entrada === 'function' && v94Entrada()){ V88PAD.setor = null; return v94Direcao(mx, my); }   // (o motor próprio: a direção livre, igual ao toque)
  const n = V92_DIRECOES, ang = Math.atan2(my, mx);
  if (!n){ V88PAD.setor = null; return {mx:Math.cos(ang), my:Math.sin(ang)}; }
  const S = TAU/n, folga = V92.cfg ? V92.cfg.folgaDir : AN_FOLGA;
  let k = Math.round(ang/S);
  if (V88PAD.setor != null && V88PAD.n103 === n){ let d = ang - V88PAD.setor*S; d = Math.atan2(Math.sin(d), Math.cos(d)); if (Math.abs(d) < S/2 + folga) k = V88PAD.setor; }
  k = ((k % n) + n) % n; V88PAD.setor = k; V88PAD.n103 = n;
  return {mx:Math.cos(k*S), my:Math.sin(k*S)};
}
const getInputAntes103 = getInput;
getInput = function(){
  if (V88PAD.ativo && (V88PAD.mx || V88PAD.my) && v88PadEmJogo()){
    const r = v103PadDirecao();
    V92.ultInp = r;                                        // (o desenho que prevê usa o mesmo que a física e o online vão usar)
    return r;
  }
  V88PAD.setor = null;
  return getInputAntes103.apply(this, arguments);
};

/* ---------------------------------------------------------------- 6) a vibração do controle no chute */
vibrarChute = function(power){
  const r = vibrarChuteAntes88.apply(this, arguments);   // (o celular: o de sempre; o tremidinho do controle passa a ser este)
  v103Treme(power, false);
  return r;
};
function v103Treme(forte, teste){
  try {
    const g = V88PAD.ativo && v88Pad();
    if (!g || (!teste && (!V103.vibra || performance.now() - V88PAD.usouT > 5000))) return false;
    const a = g.vibrationActuator; if (!a || typeof a.playEffect !== 'function') return false;
    const p = a.playEffect('dual-rumble', {startDelay:0, duration:forte ? 90 : 45, strongMagnitude:forte ? .7 : .3, weakMagnitude:forte ? .45 : .25});
    if (p && p.catch) p.catch(() => {});
    return true;
  } catch (_) { return false; }
}
const v103Vibra = g => !!(g && g.vibrationActuator && typeof g.vibrationActuator.playEffect === 'function');

/* ---------------------------------------------------------------- 7) trocar um botão: "aperte o botão no controle…" */
function v103CapComeca(id, i, el){
  if (V103.cap && V103.cap.id === id && V103.cap.i === i){ v103CapFim('Troca cancelada.'); return; }
  try { if (TECLA.captura){ TECLA.captura = null; teclaSync(); } } catch (_) {}   // (a troca de tecla do teclado para)
  const g = v88Pad();
  if (!g){ v103Msg('Ligue o controle e aperte um botão dele primeiro.'); return; }
  const segura = new Set(); g.buttons.forEach((_, k) => { if (v103Bt(g, k)) segura.add(k); });   // (o botão que abriu a troca não conta)
  V103.cap = {id, i, t0:performance.now(), segura};
  clearInterval(V103.capT); V103.capT = setInterval(v103CapTempo, 200);
  v103CapTempo(); v103Pinta();
}
function v103CapTempo(){
  const c = V103.cap; if (!c){ clearInterval(V103.capT); return; }
  const falta = V103.capMs - (performance.now() - c.t0);
  if (falta <= 0 || !AJX.raiz || AJX.raiz.hidden){ v103CapFim(falta <= 0 ? 'Tempo esgotado: nada mudou.' : null); return; }
  const qual = c.i ? 'o segundo botão' : 'o botão';
  v103Msg((c.aviso || 'Aperte no controle ' + qual + ' para ' + v103NomeAcao(c.id) + '…') + ' (' + Math.ceil(falta/1000) + ' s · Esc cancela' + (c.i ? ' · Backspace apaga o segundo' : '') + ')', 'cap');
  const U = V103.ui; if (U && U.tempo) U.tempo.style.transform = 'scaleX(' + Math.max(0, falta/V103.capMs).toFixed(3) + ')';
}
function v103CapFim(msg){
  if (!V103.cap) return;
  V103.cap = null; clearInterval(V103.capT);
  if (msg) v103Msg(msg);
  v103Pinta();
}
function v103CapLe(bt, novo){
  const c = V103.cap;
  for (const k of Array.from(c.segura)) if (!bt[k]) c.segura.delete(k);
  let b = -1;
  for (let i = 0; i < novo.length; i++) if (novo[i] && !c.segura.has(i)){ b = i; break; }
  if (b < 0) return;
  const g = v88Pad(), padrao = !g || g.mapping === 'standard';
  if (padrao && b >= 12 && b <= 15){ c.aviso = 'O direcional anda (e o analógico também): escolha outro botão.'; v103CapTempo(); return; }   // (a troca continua esperando)
  if (padrao && b === 16){ c.aviso = 'Esse botão é do sistema: escolha outro.'; v103CapTempo(); return; }
  const r = v103Atribui(c.id, c.i, b);
  V103.cap = null; clearInterval(V103.capT);
  if (r.ok) v103Salva(); else try { som.erro(); } catch (_) {}
  v103Msg(r.msg, r.ok ? 'ok' : 'erro');
  v103Pinta();
  try { som.clique(); } catch (_) {}
}
// o Esc com a troca em andamento cancela a troca e não fecha os Ajustes: o Escape das janelas (polimento, na captura) fecha a
// de cima pelo fecha dela — o dos Ajustes passa a cancelar a troca primeiro (como o do teclado, que ele já respeitava)
try { for (const d of V70C_LISTA) if (d.q === '#pop-ajustes' && typeof d.fecha === 'function'){ const f = d.fecha; d.fecha = function(){ if (V103.cap){ v103CapFim('Troca cancelada.'); return; } return f.apply(this, arguments); }; } } catch (_) {}
window.addEventListener('keydown', e => {               // (o Esc que não passou pelas janelas e o Backspace no segundo botão)
  const c = V103.cap; if (!c) return;
  if (e.code === 'Escape'){ e.preventDefault(); e.stopImmediatePropagation(); v103CapFim('Troca cancelada.'); return; }
  if ((e.code === 'Backspace' || e.code === 'Delete') && c.i === 1){
    e.preventDefault(); e.stopImmediatePropagation();
    const l = V103.mapa[c.id] || []; V103.mapa[c.id] = l.slice(0, 1);
    V103.cap = null; clearInterval(V103.capT); v103Salva(); v103Msg('Segundo botão apagado.', 'ok'); v103Pinta();
  }
}, true);

/* ---------------------------------------------------------------- 8) Ajustes › Controles › Controle */
function v103Msg(t, tipo){
  const U = V103.ui; if (!U) return;
  U.msg.textContent = t || '';
  U.msg.className = 'ajx-nota v103-msg' + (tipo ? ' ' + tipo : '');
  U.tempo.hidden = tipo !== 'cap';
}
(function v103Monta(){
  const sec = AJX.secs && AJX.secs.controles; if (!sec) return;
  const velho = V88PAD.ui && V88PAD.ui.st ? V88PAD.ui.st.closest('.ajx-grupo') : null;
  const g = ajxGrupo('Controle (Bluetooth ou com fio)', 'Ligue o controle no aparelho e aperte um botão dele aqui no jogo. O toque e o teclado continuam valendo junto.');
  g.classList.add('v88-aj-pad', 'v103-pad');
  const st = nodo('p', 'ajx-nota v88-pad-st'); st.setAttribute('aria-live', 'polite');
  const on = v88AjChave('v88-pad-on', 'Usar o controle', 'Desligado, o jogo ignora o controle', V88PAD.on, v => {
    V88PAD.on = v; if (!v){ v103PadSolta(true); v103CapFim(null); }
    v103Salva(); v103Pinta();
  });
  const corpo = nodo('div', 'v103-corpo');
  // os jeitos prontos
  const sj = nodo('p', 'v103-sub', 'Jeito de jogar');
  const jeitos = nodo('div', 'ajx-seg v103-jeitos'); jeitos.setAttribute('role', 'group'); jeitos.setAttribute('aria-label', 'Jeitos prontos do controle');
  for (const id in V103_JEITOS){
    const b = novoBotao('ajx-pre v103-jeito'); b.dataset.jeito = id; b.setAttribute('aria-pressed', 'false');
    b.append(nodo('b', null, V103_JEITOS[id].nome), nodo('small', 'v103-jeito-bts'));
    jeitos.appendChild(b);
  }
  jeitos.addEventListener('click', e => { const b = e.target.closest('[data-jeito]'); if (!b) return; try { som.clique(); } catch (_) {} v103Jeito(b.dataset.jeito); });
  const nj = nodo('p', 'ajx-nota v103-pers');
  // os botões de cada ação
  const sb = nodo('p', 'v103-sub', 'Os botões');
  const nb = nodo('p', 'ajx-nota', 'Toque numa ação e aperte o botão no controle. Se o botão já era de outra ação, ele sai de lá (ou os dois trocam).');
  const lista = nodo('div', 'v103-lista');
  for (const [gr, tit] of V103_GRUPOS){
    const bloco = nodo('div', 'v103-grupo'); bloco.dataset.grupo = gr;
    bloco.appendChild(nodo('p', 'v103-sub v103-sub2', tit));
    if (gr === 'jogo'){                                    // (o andar não troca: o analógico esquerdo e o direcional)
      const lin = nodo('div', 'aj-lin ajx-lin v103-acao v103-andar'), tx = nodo('span', 'ajx-tx');
      tx.append(nodo('b', null, 'ANDAR'), nodo('small', null, 'o analógico esquerdo ou o direcional'));
      const fixo = nodo('span', 'v103-fixo'); fixo.setAttribute('aria-hidden', 'true'); fixo.textContent = 'L ✚';
      lin.append(tx, fixo); bloco.appendChild(lin);
    }
    for (const [id, nome, nota, grupo] of V103_ACOES){
      if (grupo !== gr) continue;
      const lin = nodo('div', 'aj-lin ajx-lin v103-acao'); lin.dataset.pad = id;   // (as classes e o data-acao do teclado ficam só no teclado)
      const tx = nodo('span', 'ajx-tx'); tx.append(nodo('b', null, nome), nodo('small', null, nota));
      const caixa = nodo('div', 'v103-bts');
      for (const i of [0, 1]){ const b = novoBotao('v103-slot'); b.dataset.pad = id; b.dataset.i = String(i); caixa.appendChild(b); }
      lin.append(tx, caixa); bloco.appendChild(lin);
    }
    lista.appendChild(bloco);
  }
  lista.addEventListener('click', e => { const b = e.target.closest('.v103-slot'); if (!b) return; try { som.clique(); } catch (_) {} v103CapComeca(b.dataset.pad, +b.dataset.i, b); });
  const msg = nodo('p', 'ajx-nota v103-msg'); msg.setAttribute('aria-live', 'polite');
  const tempo = nodo('i', 'v103-tempo'); tempo.hidden = true; tempo.setAttribute('aria-hidden', 'true');
  // o analógico do controle: a zona morta (com o analógico de agora desenhado)
  const sa = nodo('p', 'v103-sub', 'Analógico do controle');
  const zona = v88AjFaixa('v103-zona', 'Zona morta', 5, 40, 1, Math.round(V103.zona*100), v => v + '%', v => { V103.zona = v/100; v103Salva(); v103PintaAlvo(); });
  zona.classList.add('v103-zona');
  const alvo = nodo('span', 'v103-alvo'); alvo.setAttribute('aria-hidden', 'true');
  const az = nodo('i', 'v103-alvo-zona'), ap = nodo('b', 'v103-alvo-pt'); alvo.append(az, ap); zona.appendChild(alvo);
  const nz = nodo('p', 'ajx-nota', 'Abaixo disso a tampinha fica parada (o analógico gasto não anda sozinho). Menos = começa a andar antes. O círculo mostra o analógico agora.');
  // a vibração
  const vib = v88AjChave('v103-vibra', 'Vibrar o controle no chute', 'O controle treme de leve quando a bola sai do pé', V103.vibra, v => { V103.vibra = v; v103Salva(); v103Pinta(); if (v) v103Treme(false, true); });
  const testa = novoBotao('v103-slot v103-testa', 'Testar a vibração do controle'); testa.textContent = 'TESTAR';
  testa.addEventListener('click', () => { try { som.clique(); } catch (_) {} if (!v103Treme(true, true)) v103Msg('Este controle não vibra pelo navegador.'); });
  vib.insertBefore(testa, vib.querySelector('.aj-chave'));
  const rest = novoBotao('ajx-rest'); rest.id = 'v103-rest'; rest.textContent = 'Voltar o controle ao padrão';
  rest.addEventListener('click', () => {
    try { som.clique(); } catch (_) {}
    v103CapFim(null);
    V103.mapa = v103Limpa(V103_JEITOS.padrao.mapa); V103.zona = V103_ZONA; V103.vibra = true;
    v103Salva(); v103Pinta(); v103Msg('O controle voltou ao padrão.', 'ok');
  });
  corpo.append(sj, jeitos, nj, sb, nb, lista, msg, tempo, sa, zona, nz, vib, rest);
  g.append(st, on, corpo);
  const tecl = TECLA.lista && TECLA.lista.closest('.ajx-grupo');
  if (tecl && tecl.parentNode === sec) sec.insertBefore(g, tecl); else sec.appendChild(g);   // (antes do teclado: quem liga um controle quer ver ele primeiro)
  if (velho) velho.remove();
  V103.ui = {g, st, on, corpo, jeitos, nj, lista, msg, tempo, zona, alvo, az, ap, vib, testa, rest};
  V88PAD.ui = {st, on, tr:corpo, mapa:lista};              // (os nomes da v88: o status, a chave, o resto e a lista)
  v103Pinta();
})();
function v103Pinta(){
  const U = V103.ui; if (!U) return;
  const g = V88PAD.on ? v88Pad() : null, fam = g ? v103Familia(g) : V103.fam;
  if (g) V103.fam = fam;
  U.st.textContent = !navigator.getGamepads ? 'Este navegador não reconhece controles.'
    : !V88PAD.on ? 'O controle está desligado aqui (o jogo ignora ele).'
    : g ? 'Conectado: ' + v88PadNome(g.id) + ' · botões ' + (fam === 'gen' ? 'numerados' : 'do ' + V103_FAMILIA[fam]) + (g.mapping === 'standard' ? '' : ' (mapa diferente do padrão: confira os botões aqui)')
    : 'Nenhum controle conectado agora: ligue o controle e aperte um botão dele (os botões aparecem aqui).';
  ligado(U.on.querySelector('button'), V88PAD.on);
  U.corpo.hidden = !g; U.lista.hidden = !g;               // (sem controle, o grupo fica curto: cabe no celular deitado)
  if (!g) return;
  // os jeitos prontos: os botões de cada um com os nomes deste controle
  const atual = v103JeitoAtual();
  for (const b of U.jeitos.querySelectorAll('[data-jeito]')){
    const J = V103_JEITOS[b.dataset.jeito], sm = b.querySelector('small');
    sm.textContent = '';
    J.mostra.forEach(([a, k], n) => { if (n) sm.append(document.createTextNode(' · ')); sm.append(v103Glifo(k, fam), document.createTextNode(' ' + v103NomeAcao(a).toLowerCase())); });
    b.setAttribute('aria-pressed', String(b.dataset.jeito === atual));
    b.setAttribute('aria-label', J.nome + ': ' + J.mostra.map(([a, k]) => v103Fala(k, fam) + ' ' + v103NomeAcao(a).toLowerCase()).join(', '));
  }
  U.nj.textContent = atual ? '' : 'Personalizado: do seu jeito (os jeitos prontos trocam tudo de uma vez).';
  U.nj.hidden = !!atual;
  // as ações
  const ginga = typeof v702Modo !== 'function' || v702Modo('ginga');
  for (const bl of U.lista.querySelectorAll('.v103-grupo')) bl.hidden = bl.dataset.grupo === 'ginga' && !ginga;   // (a GINGA está guardada: aparece quando voltar)
  for (const b of U.lista.querySelectorAll('.v103-slot')){
    const id = b.dataset.pad, i = +b.dataset.i, cs = v103Botoes(id), k = cs[i], cap = !!V103.cap && V103.cap.id === id && V103.cap.i === i;
    b.textContent = '';
    if (cap) b.textContent = 'aperte…'; else if (k != null) b.appendChild(v103Glifo(k, fam)); else b.textContent = '+';
    b.classList.toggle('on', cap); b.classList.toggle('vazia', k == null && !cap);
    b.dataset.bt = k != null ? String(k) : '';
    b.setAttribute('aria-pressed', String(cap));
    b.setAttribute('aria-label', v103NomeAcao(id) + ': ' + (cap ? 'aperte o botão no controle' : k != null ? 'botão ' + v103Fala(k, fam) + '. Toque para trocar' : (i ? 'sem segundo botão. Toque para escolher' : 'sem botão')));
    b.closest('.v103-acao').classList.toggle('v103-cap', !!V103.cap && V103.cap.id === id);
  }
  const vale = v103Vibra(g);
  const vb = U.vib.querySelector('.aj-chave'); ligado(vb, V103.vibra);
  const small = U.vib.querySelector('small'); if (small) small.textContent = vale ? 'O controle treme de leve quando a bola sai do pé' : 'Este controle não vibra pelo navegador (a chave fica guardada para outro)';
  U.testa.disabled = !vale;
  try { U.zona.v88Pinta(Math.round(V103.zona*100)); } catch (_) {}
  v103PintaAlvo();
}
v88PadPinta = v103Pinta;                                  // (a v88 chama quando um controle conecta ou sai)
function v103PintaAlvo(){                                // o analógico de agora dentro do círculo (a zona morta tracejada)
  const U = V103.ui; if (!U) return;
  const R = 22, s = Math.min(1, Math.hypot(V103.ax, V103.ay)) || 0, a = Math.atan2(V103.ay, V103.ax);
  U.az.style.width = U.az.style.height = (2*R*V103.zona + 2).toFixed(1) + 'px';
  U.ap.style.transform = 'translate(' + (Math.cos(a)*s*R).toFixed(1) + 'px,' + (Math.sin(a)*s*R).toFixed(1) + 'px)';
  U.alvo.classList.toggle('anda', V103.andando);
}
function v103AoVivo(bt, novo){                           // com os Ajustes abertos: a ação do botão apertado acende e o analógico aparece
  const U = V103.ui; if (!U || AJX.secs.controles.hidden || U.corpo.hidden) return;
  if (V103.quadros % 2 === 0) v103PintaAlvo();
  for (let i = 0; i < novo.length; i++){
    if (!novo[i]) continue;
    for (const [id] of V103_ACOES){
      if (v103Botoes(id).indexOf(i) < 0) continue;
      const lin = U.lista.querySelector('.v103-acao[data-pad="' + id + '"]'); if (!lin) continue;
      lin.classList.remove('v103-aceso'); void lin.offsetWidth; lin.classList.add('v103-aceso');
      clearTimeout(lin._v103t); lin._v103t = setTimeout(() => lin.classList.remove('v103-aceso'), 420);
    }
  }
}
// (a troca de tecla do teclado e a do controle: uma de cada vez)
try { if (TECLA.lista) TECLA.lista.addEventListener('click', e => { if (e.target.closest('.ajx-tbt') && V103.cap) v103CapFim(null); }, true); } catch (_) {}
const ajxSyncAntes103 = ajxSync;
ajxSync = function(){ const r = ajxSyncAntes103.apply(this, arguments); try { v103Pinta(); } catch (_) {} return r; };

/* ---------------------------------------------------------------- 9) o teclado: a PAUSA numa tecla (o Esc continua) */
(function v103TeclaPausa(){                              // a tecla nova (P) não tira a tecla que o jogador já escolheu para outra ação
  let o = null; try { o = JSON.parse(localStorage.getItem(TECLA.chave) || 'null'); } catch (_) {}
  if (!o || typeof o !== 'object' || (Array.isArray(o.pausa) && o.pausa.length)) return;
  const usadas = new Set();
  for (const [id] of TECLAS_ACOES) if (id !== 'pausa') for (const c of TECLA.acoes[id] || []) usadas.add(c);
  const l = TECLA.acoes.pausa || [], f = l.filter(c => !usadas.has(c));
  if (f.length !== l.length){ TECLA.acoes.pausa = f; teclaMonta(); try { teclaSync(); } catch (_) {} }
})();
window.addEventListener('keydown', e => {
  if (e.repeat || e.ctrlKey || e.metaKey || e.altKey || lobby.aberto || teclaCanon(e.code) !== 'KeyP') return;
  const t = e.target; if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;   // (escrevendo no chat: é letra)
  if (PAUSA.aberta){ e.preventDefault(); pausaFecha(); }
  else if (typeof pausaPode === 'function' && pausaPode()){ e.preventDefault(); pausaAbre(); }
});

/* ---------------------------------------------------------------- 10) as dicas com as teclas (ou os botões) de cada um */
function v103PadUsando(){                                // jogando de controle agora (mexeu nele depois do teclado e do toque)
  return !!(V88PAD.on && V88PAD.ativo && V88PAD.usouT > 0 && V88PAD.usouT >= V103.tecladoT && V88PAD.usouT >= V103.toqueT);
}
function v103RotuloPad(id){                              // o botão da ação (o primeiro), para quem joga de controle; '' se não
  if (!v103PadUsando()) return '';
  const b = v103Botoes(id)[0];
  return b == null ? '' : v103Nome(b);
}
const v103Tecla = id => { try { const c = (TECLA.acoes[id] || [])[0]; return c ? teclaNome(c) : ''; } catch (_) { return ''; } };
function v103Mover(longo){                               // WASD (e as setas): as teclas de andar que o jogador escolheu
  const l1 = ['cima', 'esq', 'baixo', 'dir'].map(id => { try { const c = (TECLA.acoes[id] || [])[0]; return c ? teclaNome(c) : ''; } catch (_) { return ''; } }).join('');
  const l2 = ['cima', 'esq', 'baixo', 'dir'].map(id => { try { const c = (TECLA.acoes[id] || [])[1]; return c ? teclaNome(c) : ''; } catch (_) { return ''; } }).join('');
  const nome = s => s === '↑←↓→' ? 'setas' : s;
  if (!longo) return l1 === '↑←↓→' ? 'Setas' : l1 || nome(l2);
  return [nome(l1), nome(l2)].filter(Boolean).join(' ou ');
}
function v103Chutes(nome){                               // os chutes do Rachão da sala (na dica): Q cavadinha · Z/X curva · V super
  let o = null; try { o = typeof cr99Op === 'function' ? cr99Op() : null; } catch (_) {}
  if (!o) return '';
  const p = [], cv = [nome('cve'), nome('cvd')].filter(Boolean).join('/');
  if (o.lob && nome('cav')) p.push(nome('cav') + ' cavadinha');
  if (o.curva && cv) p.push(cv + ' curva');
  if (o.super && nome('sup')) p.push(nome('sup') + ' super');
  return p.length ? ' · ' + p.join(' · ') : '';
}
function v103Dica(){                                      // a linha do começo da partida (era fixa: "WASD mover · Espaço passe · K chute…")
  if (v103PadUsando()){
    const n = id => { const b = v103Botoes(id)[0]; return b == null ? '' : v103Nome(b); }, p = ['Analógico mover'];
    if (n('passe')) p.push(n('passe') + ' passe');
    if (n('chute')) p.push(n('chute') + ' chute');
    if (RQ.on && RQ.jogo === 'curva' && n('curva')) p.push(n('curva') + ' curva (segure)');
    if (RQ.on && RQ.jogo === 'ginga'){ if (n('finta')) p.push(n('finta') + ' finta'); if (n('drible')) p.push(n('drible') + ' drible'); }
    return p.join(' · ') + v103Chutes(n) + (n('pausa') ? ' · ' + n('pausa') + ' ' + (NET49.playing ? 'menu' : 'pausa') : '');
  }
  const t = v103Tecla;
  let s = v103Mover(false) + ' mover' + (t('passe') ? ' · ' + t('passe') + ' passe' : '') + (t('chute') ? ' · ' + t('chute') + ' chute' : '');
  if (RQ.on){
    if (RQ.jogo === 'curva') s += t('curva') ? ' · ' + t('curva') + ' curva (segure)' : '';
    else if (RQ.jogo === 'ginga') s += (t('finta') ? ' · ' + t('finta') + ' finta' : '') + (t('drible') ? ' · ' + t('drible') + ' drible' : '');
    return s + v103Chutes(t) + (t('hud') ? ' · ' + t('hud') + ' HUD' : '') + ' · Esc ' + (NET49.playing ? 'menu' : 'sair (conta derrota)');
  }
  return s + ' · R reiniciar · 1-4 tamanho · C campo · T treino' + (t('hud') ? ' · ' + t('hud') + ' HUD' : '') + ' · Esc lobby';
}
// o tutorial (Primeiros toques): as teclas de andar que valem e, para quem joga de controle, os botões dele
const tuPassosAntes103 = tuPassos;
tuPassos = function(){
  const L = tuPassosAntes103.apply(this, arguments);
  try {
    const pad = v103PadUsando(), nome = id => { const b = v103Botoes(id)[0]; return b == null ? '' : v103Nome(b); };
    for (const p of L){
      if (pad){
        if (p.tit === 'ANDAR') p.como = 'Controle: o analógico esquerdo ou o direcional.';
        else if (p.tit === 'CHUTE' && nome('chute')) p.como = 'CHUTE: botão ' + nome('chute') + '.';
        else if (p.tit === 'PASSE' && nome('passe')) p.como = 'PASSE: botão ' + nome('passe') + '.';
      } else if (p.tit === 'ANDAR' && /WASD ou setas/.test(p.como || '')) p.como = p.como.replace('WASD ou setas', v103Mover(true));
    }
  } catch (_) {}
  return L;
};

/* ---------------------------------------------------------------- 11) o analógico da tela: quem tinha o padrão antigo guardado */
// O padrão novo (6% / 4%) vem do V92_PADRAO (controles.py). Os ajustes finos guardam todos os números quando alguém mexe em
// qualquer um: quem guardou com o analógico no padrão de antes (15% / 9%) passa para o novo uma vez (quem escolheu outro
// número continua com o dele). A versão de testes (o painel) guarda do jeito dela: lá nada muda.
(function v103AnalogicoNovo(){
  if (V92.exp) return;
  let feito = '1'; try { feito = localStorage.getItem('racha-v103-analogico'); } catch (_) { return; }
  if (feito === '1') return;
  try {
    const o = JSON.parse(localStorage.getItem(AJF_CHAVE) || 'null'), s = o && o.v92;
    if (s && s.zonaLiga === .15 && s.zonaDesliga === .09){
      V92.cfg = v92Limpa(Object.assign({}, V92.cfg, {zonaLiga:V92_PADRAO.zonaLiga, zonaDesliga:V92_PADRAO.zonaDesliga}), V92_PADRAO);
      ajfSalva();                                          // (a zona morta é lida a cada quadro: nada mais a aplicar)
    }
  } catch (_) {}
  try { localStorage.setItem('racha-v103-analogico', '1'); } catch (_) {}
})();

window.RachaControles103 = {                             // (os testes olham por aqui)
  estado: () => ({mapa:v103Copia(V103.mapa), zona:V103.zona, vibra:V103.vibra, on:V88PAD.on, ativo:V88PAD.ativo, fam:V103.fam, cap:V103.cap && {id:V103.cap.id, i:V103.cap.i},
    jeito:v103JeitoAtual(), mx:V88PAD.mx, my:V88PAD.my, mag:V103.mag, andando:V103.andando, supPad:V103.supPad, usando:v103PadUsando(), quadros:V103.quadros, erro:V103.erro,
    msg:V103.ui ? V103.ui.msg.textContent : ''}),
  jeito: v103Jeito, atribui: v103Atribui, nome: v103Nome, familia: v103Familia, dica: v103Dica, V103, JEITOS: V103_JEITOS
};
