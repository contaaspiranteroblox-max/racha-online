/* =====================================================================================================================
   RACHA v92 · OFICINA — OS PAINÉIS DO EDITOR (tools/oficina/paineis.js)
   À direita: as propriedades do que está selecionado (só as que valem para o tipo) ou, sem seleção, as abas do mapa:
   CAMPO, APARÊNCIA, FÍSICA, PARTIDA, LÓGICA (QUANDO → ENTÃO), CAMADAS, SPAWNS e VALIDAÇÃO. E a BIBLIOTECA de objetos.
   Cada campo muda o mapa na hora (o desenho acompanha) e, ao soltar, a mudança é conferida e entra no desfazer.
   ===================================================================================================================== */
/* ---------------------------------------------------------------- os campos do formulário */
function fLinha(rot, ...filhos) { return h('div.ofi-f', h('label.ofi-f-rot', { texto: rot }), h('div.ofi-f-val', ...filhos)); }
function fNum(rot, val, o, on) {                     // o deslizador e o número (sincronizados) · o = {min, max, passo, un, fator (o que mostra = valor × fator)}
  const f = o.fator || 1, mostra = v => arred(v * f, o.casas != null ? Math.pow(10, o.casas) : 100);
  const r = h('input.ofi-range', { type: 'range', min: o.min * f, max: o.max * f, step: (o.passo || 0.1) * f, value: mostra(val), 'aria-label': rot });
  const n = h('input.ofi-num', { type: 'number', min: o.min * f, max: o.max * f, step: (o.passo || 0.1) * f, value: mostra(val), 'aria-label': rot, inputMode: 'decimal' });
  const le = el => { let v = parseFloat(el.value); if (!Number.isFinite(v)) return null; return clamp(v / f, o.min, o.max); };
  r.addEventListener('input', () => { const v = le(r); if (v == null) return; n.value = mostra(v); on(v, false); });
  r.addEventListener('change', () => { const v = le(r); if (v != null) on(v, true); });
  n.addEventListener('change', () => { const v = le(n); if (v == null) { n.value = mostra(val); return; } r.value = mostra(v); n.value = mostra(v); on(v, true); });
  return fLinha(rot + (o.un ? ' (' + o.un + ')' : ''), r, n);
}
function fSel(rot, val, opcoes, on) {                // opcoes = [[valor, nome]] — até 4 curtas viram botões; mais, uma lista
  if (opcoes.length <= 4 && opcoes.every(x => String(x[1]).length <= 12)) {
    const seg = h('div.ofi-seg', { role: 'group', 'aria-label': rot });
    for (const [v, nome] of opcoes) { const b = botao(nome, () => { for (const x of seg.children) x.classList.remove('on'); b.classList.add('on'); on(v, true); }, 'ofi-seg-bt' + (v === val ? ' on' : '')); seg.appendChild(b); }
    return fLinha(rot, seg);
  }
  const s = h('select.ofi-sel', { 'aria-label': rot });
  for (const [v, nome] of opcoes) { const op = h('option', { value: String(v), texto: nome }); if (v === val) op.selected = true; s.appendChild(op); }
  s.addEventListener('change', () => { const o = opcoes.find(x => String(x[0]) === s.value); if (o) on(o[0], true); });
  return fLinha(rot, s);
}
function fBool(rot, val, on) {
  const b = h('button.ofi-chave', { type: 'button', role: 'switch', 'aria-checked': String(!!val), 'aria-label': rot }, h('i'));
  b.addEventListener('click', () => { const v = b.getAttribute('aria-checked') !== 'true'; b.setAttribute('aria-checked', String(v)); try { som.clique(); } catch (_) {} on(v, true); });
  return fLinha(rot, b);
}
const CORES_RAPIDAS = ['#ffffff', '#e9e5da', '#05060c', '#ff3b3b', '#ff8a1c', '#ffd23f', '#3cff6a', '#2fcf62', '#14d4f0', '#2f86ff', '#8b5cf6', '#ff3df2', '#d86a38', '#7d8aa8'];
function fCor(rot, val, on) {
  const i = h('input.ofi-cor', { type: 'color', value: val || '#ffffff', 'aria-label': rot });
  i.addEventListener('input', () => on(i.value, false)); i.addEventListener('change', () => on(i.value, true));
  const rap = h('div.ofi-cores');
  for (const c of CORES_RAPIDAS) rap.appendChild(h('button.ofi-cor-bt', { type: 'button', title: c, 'aria-label': 'cor ' + c, style: { background: c }, on: { click: () => { i.value = c; on(c, true); } } }));
  return fLinha(rot, i, rap);
}
function fTxt(rot, val, max, on, multi) {
  const i = multi ? h('textarea.ofi-in', { maxLength: max, rows: 3 }) : h('input.ofi-in', { type: 'text', maxLength: max, autocomplete: 'off' });
  i.value = val || ''; i.addEventListener('input', () => on(i.value, false)); i.addEventListener('change', () => on(i.value, true));
  return fLinha(rot, i);
}
const fTit = (t, ic) => h('div.ofi-p-tit', ic ? icone(ic) : null, h('b', { texto: t }));
const fNota = t => h('p.ofi-p-nota', { texto: t });
const fBotoes = (...b) => h('div.ofi-p-bts', ...b);

/* ---------------------------------------------------------------- os nomes (o que aparece para quem cria) */
const N_TIPO = { parede: 'Parede', arco: 'Parede curva', linha: 'Linha de pontos', obstaculo: 'Obstáculo', gol: 'Gol', zona: 'Zona', portal: 'Portal', portao: 'Portão', botao: 'Botão',
  interruptor: 'Interruptor', cronometro: 'Cronômetro', spawn: 'Ponto de nascimento', spawnBola: 'Spawn da bola', decoracao: 'Decoração', marcacao: 'Marcação', texto: 'Texto' };
const IC_TIPO = { parede: 'parede', arco: 'arco', linha: 'linha', obstaculo: 'retangulo', gol: 'gol', zona: 'zona', portal: 'portal', portao: 'portao', botao: 'botao', interruptor: 'botao', cronometro: 'relogio', spawn: 'pino', spawnBola: 'bola', decoracao: 'enfeite', marcacao: 'marca', texto: 'texto' };
const N_COLISAO = [['todos', 'Todos'], ['bola', 'Só a bola'], ['jogadores', 'Só jogador'], ['nenhum', 'Ninguém']];
const N_EFEITO = [['velocidade', 'Aceleração (mais rápido)'], ['lentidao', 'Lentidão'], ['impulso', 'Impulso (empurra)'], ['gravidade', 'Gravidade'], ['esteira', 'Esteira / plataforma'], ['rampa', 'Rampa 2D'],
  ['pontos', 'Área de pontos'], ['reinicio', 'Zona de reinício'], ['elimina', 'Eliminação'], ['nada', 'Só para a lógica']];
const N_AFETA = [['todos', 'Todos'], ['bola', 'Só a bola'], ['jogadores', 'Só jogadores']];
const N_EQUIPE = M => [[-1, 'Todos os times']].concat(M.partida.times.map((t, i) => [i, t.nome]));
const N_MOV = [['', 'Parado'], ['vaivem', 'Vai e volta'], ['circular', 'Em círculo'], ['girar', 'Girando']];
const N_MODO = { futebol: 'Futebol', futsal: 'Futsal', x1: 'X1', x2: 'X2', x3: 'X3', x4: 'X4', x5: 'X5', treino: 'Treino', corrida: 'Corrida', precisao: 'Precisão', labirinto: 'Labirinto',
  sobrevivencia: 'Sobrevivência', quatro_gols: 'Quatro gols', arena_circular: 'Arena circular', minigame: 'Minigame', livre: 'Livre' };
const N_CATEGORIA = { competitivo: 'Competitivo', criativo: 'Criativo', treinamento: 'Treinamento', minigame: 'Minigame', classico: 'Clássico', outro: 'Outro' };
const N_CAMADA = Object.fromEntries(RM.CAMADAS.map(c => [c.id, c.nome]));
const N_ICONE = { estrela: 'Estrela', coracao: 'Coração', raio: 'Raio', coroa: 'Coroa', bola: 'Bola', seta: 'Seta', chama: 'Chama', caveira: 'Caveira', trofeu: 'Troféu', nota: 'Nota musical', flor: 'Flor', lua: 'Lua' };

/* ---------------------------------------------------------------- o painel: refaz sem pular (v95)
   Mexer num valor refaz o painel (os campos que dependem dele aparecem ou somem). Antes ele voltava lá para cima a cada
   mudança; agora a rolagem fica onde estava e o campo que estava com o foco continua com ele. Se a mudança veio de um
   campo que está perdendo o foco (digitou um número e tocou em outro campo ou botão), o painel espera o toque acabar,
   para o toque não se perder (o campo tocado fica com o foco e o botão tocado funciona). */
const OFP = { chave: '', apertado: false, adiado: false, ligado: false };
function painelChave() { return OFE.sel.size ? 's:' + [...OFE.sel].sort().join(',') : 'a:' + OFE.aba; }
const painelControles = P => [...P.querySelectorAll('input,select,textarea,button')];
function painelLiga(P) {                             // (uma vez: o dedo/mouse apertado dentro do painel)
  if (OFP.ligado) return; OFP.ligado = true;
  P.addEventListener('pointerdown', () => { OFP.apertado = true; }, true);
  const solta = () => { if (!OFP.apertado) return; OFP.apertado = false; if (OFP.adiado) setTimeout(painelAdiado, 0); };
  addEventListener('pointerup', solta, true); addEventListener('pointercancel', solta, true);
}
function painelAtualiza() {
  const P = EDU.painel; if (!P || !OFE.M) return;
  painelLiga(P);
  const ev = window.event;                           // (a mudança de um campo que está perdendo o foco espera o toque acabar)
  if (ev && ev.type === 'change' && ev.isTrusted && ev.target && P.contains(ev.target) && document.activeElement !== ev.target) {
    if (!OFP.adiado) { OFP.adiado = true; if (!OFP.apertado) setTimeout(painelAdiado, 0); }
    return;
  }
  painelRefaz();
}
function painelAdiado() { if (OFP.adiado && !OFP.apertado) painelRefaz(); }
function painelRefaz() {
  OFP.adiado = false;
  const P = EDU.painel; if (!P || !OFE.M) return;
  const chave = painelChave(), mesma = chave === OFP.chave && !!P.firstChild;
  const c0 = P.querySelector('.ofi-p-corpo'), rol = mesma && c0 ? c0.scrollTop : 0;
  const a = document.activeElement, idx = mesma && a && a !== P && P.contains(a) ? painelControles(P).indexOf(a) : -1;
  painelMonta();
  OFP.chave = chave;
  const c1 = P.querySelector('.ofi-p-corpo'); if (c1 && rol) c1.scrollTop = rol;
  if (idx >= 0) { const n = painelControles(P)[idx]; if (n) try { n.focus({ preventScroll: true }); } catch (_) {} }
}
/* ---------------------------------------------------------------- o painel: monta o que vale agora */
function painelMonta() {
  if (!EDU.painel || !OFE.M) return;
  const P = EDU.painel; limpaFilhos(P);
  const objs = selObjs();
  if (objs.length) {
    const o = objs[0], varios = objs.length > 1;
    P.appendChild(h('div.ofi-p-topo', icone(varios ? 'multi' : IC_TIPO[o.tipo]), h('b', { texto: varios ? objs.length + ' objetos' : (o.nome || N_TIPO[o.tipo]) }),
      h('small', { texto: varios ? 'seleção' : N_TIPO[o.tipo] + ' · ' + o.id }), botao('', () => { OFE.sel.clear(); edEstado(); painelAtualiza(); OFE.sujo = true; }, 'ofi-x', 'fechar', 'Tirar a seleção')));
    const corpo = h('div.ofi-p-corpo'); P.appendChild(corpo);
    if (varios) propriedadesVarios(corpo, objs); else propriedades(corpo, o);
    return;
  }
  const abas = [['campo', 'campo', 'Campo'], ['aparencia', 'pincel', 'Aparência'], ['fisica', 'fisica', 'Física'], ['partida', 'apito', 'Partida'], ['logica', 'raio', 'Lógica'],
    ['camadas', 'camadas', 'Camadas'], ['spawns', 'pino', 'Spawns'], ['validar', OFE.erros.length ? 'alerta' : 'check', 'Validação']];
  const topo = h('div.ofi-p-abas', { role: 'tablist' });
  for (const [id, ic, nome] of abas) { const b = botao(nome, () => { OFE.aba = id; painelAtualiza(); }, 'ofi-p-aba' + (OFE.aba === id ? ' on' : '') + (id === 'validar' && OFE.erros.length ? ' erro' : ''), ic, nome); b.setAttribute('role', 'tab'); topo.appendChild(b); }
  P.appendChild(topo);
  const corpo = h('div.ofi-p-corpo'); P.appendChild(corpo);
  ({ campo: painelCampo, aparencia: painelAparencia, fisica: painelFisica, partida: painelPartida, logica: painelLogica, camadas: painelCamadas, spawns: painelSpawns, validar: painelValidar }[OFE.aba] || painelCampo)(corpo);
}
// muda um campo do objeto (o: o objeto do mapa de trabalho; ao confirmar, ele é trocado pelo limpo)
function mudaO(o, campo, conv) {
  const id = o.id;
  return (v, final) => { muda(M => { const x = M.objetos.find(y => y.id === id); if (!x) return; const val = conv ? conv(v, x) : v; if (campo.indexOf('.') > 0) { const [a, b] = campo.split('.'); x[a] = x[a] || {}; x[a][b] = val; } else x[campo] = val; }, final); if (!final) OFE.sujo = true; };
}
function propriedades(c, o) {
  const M = OFE.M;
  poe(c, fTit('Geral', 'cursor'),
    fTxt('Nome', o.nome, 24, mudaO(o, 'nome')),
    fNum('Posição X', o.x, { min: -RM.LIM.coordX, max: RM.LIM.coordX, passo: 0.1, un: 'u' }, mudaO(o, 'x')),
    fNum('Posição Y', o.y, { min: -RM.LIM.coordY, max: RM.LIM.coordY, passo: 0.1, un: 'u' }, mudaO(o, 'y')));
  if (['spawn', 'spawnBola', 'cronometro'].indexOf(o.tipo) < 0) poe(c, fNum('Rotação', o.rot, { min: 0, max: 359, passo: 1, un: '°' }, mudaO(o, 'rot')));
  switch (o.tipo) {
    case 'parede': case 'portao':
      poe(c, fNum('Comprimento', o.comp, { min: 0.5, max: o.tipo === 'portao' ? 120 : 240, passo: 0.5, un: 'u' }, mudaO(o, 'comp')), fNum('Espessura', o.esp, { min: 0.1, max: 8, passo: 0.1, un: 'u' }, mudaO(o, 'esp')));
      break;
    case 'arco':
      poe(c, fNum('Raio', o.raio, { min: 1, max: 120, passo: 0.5, un: 'u' }, mudaO(o, 'raio')), fNum('Abertura', o.abertura, { min: 5, max: 360, passo: 5, un: '°' }, mudaO(o, 'abertura')), fNum('Espessura', o.esp, { min: 0.1, max: 8, passo: 0.1, un: 'u' }, mudaO(o, 'esp')));
      break;
    case 'linha':
      poe(c, fNum('Espessura', o.esp, { min: 0.1, max: 8, passo: 0.1, un: 'u' }, mudaO(o, 'esp')), fBool('Fechada (liga o último ponto ao primeiro)', o.fechada, mudaO(o, 'fechada')),
        fNota(o.pontos.length + ' pontos. Arraste os quadradinhos amarelos; o "+" no meio de um lado põe um ponto novo.'),
        fBotoes(botao('TIRAR O ÚLTIMO PONTO', () => { if (o.pontos.length > 2) muda(M2 => { const x = M2.objetos.find(y => y.id === o.id); x.pontos.pop(); }); }, 'escuro')));
      break;
    case 'obstaculo': case 'decoracao': case 'zona': case 'marcacao': {
      const formas = o.tipo === 'zona' ? [['retangulo', 'Retângulo'], ['circulo', 'Círculo'], ['poligono', 'Polígono']] : o.tipo === 'marcacao' ? [['linha', 'Linha'], ['circulo', 'Círculo'], ['arco', 'Arco'], ['retangulo', 'Retângulo'], ['ponto', 'Ponto']]
        : o.tipo === 'decoracao' ? [['retangulo', 'Retângulo'], ['circulo', 'Círculo'], ['triangulo', 'Triângulo'], ['poligono', 'Polígono'], ['icone', 'Ícone']] : [['retangulo', 'Retângulo'], ['circulo', 'Círculo'], ['triangulo', 'Triângulo'], ['poligono', 'Polígono']];
      poe(c, fSel('Forma', o.forma, formas, mudaO(o, 'forma', (v, x) => { if (v === 'poligono' && !(x.pontos && x.pontos.length >= 3)) x.pontos = RM.poligonoDaForma('retangulo', x.w || 4, x.h || 4).map(p => [arred(p[0]), arred(p[1])]); return v; })));
      if (o.forma !== 'poligono' && o.forma !== 'ponto') poe(c, fNum('Largura', o.w, { min: 0.2, max: 220, passo: 0.5, un: 'u' }, mudaO(o, 'w')), fNum('Altura', o.h, { min: 0.2, max: 160, passo: 0.5, un: 'u' }, mudaO(o, 'h')));
      if (o.forma === 'poligono') poe(c, fNota(o.pontos.length + ' pontos: arraste os quadradinhos; o "+" põe um ponto novo.'), fBotoes(botao('TIRAR O ÚLTIMO PONTO', () => { if (o.pontos.length > 3) muda(M2 => { M2.objetos.find(y => y.id === o.id).pontos.pop(); }); }, 'escuro')));
      if (o.tipo === 'marcacao') poe(c, fNum('Espessura', o.esp, { min: 0.05, max: 3, passo: 0.05, un: 'u' }, mudaO(o, 'esp')), o.forma === 'arco' ? fNum('Abertura', o.abertura, { min: 5, max: 360, passo: 5, un: '°' }, mudaO(o, 'abertura')) : null, fBool('Tracejada', o.tracejada, mudaO(o, 'tracejada')));
      if (o.tipo === 'decoracao') poe(c, o.forma === 'icone' ? fSel('Ícone', o.icone, RM.ICONES_DECOR.map(k => [k, N_ICONE[k] || k]), mudaO(o, 'icone')) : fSel('Textura', o.textura, [['liso', 'Lisa'], ['listras', 'Listras'], ['pontos', 'Pontos']], mudaO(o, 'textura')),
        fCor('Segunda cor', o.cor2, mudaO(o, 'cor2')), fNum('Contorno', o.contorno, { min: 0, max: 2, passo: 0.1 }, mudaO(o, 'contorno')));
      if (o.tipo === 'obstaculo') poe(c, fSel('Textura', o.textura, [['liso', 'Lisa'], ['listras', 'Listras'], ['pontos', 'Pontos']], mudaO(o, 'textura')));
      if (o.tipo === 'zona') zonaCampos(c, o);
      break;
    }
    case 'gol':
      poe(c, fTit('Gol', 'gol'), fSel('Dono (quem defende)', o.dono, [[-1, 'Neutro (vale para todos)']].concat(M.partida.times.map((t, i) => [i, t.nome])), mudaO(o, 'dono')),
        fNum('Largura', o.largura, { min: 2, max: 80, passo: 0.5, un: 'u' }, mudaO(o, 'largura')), fNum('Profundidade', o.prof, { min: 0.5, max: 30, passo: 0.1, un: 'u' }, mudaO(o, 'prof')),
        fNum('Pontos por gol', o.pontos, { min: 1, max: 10, passo: 1 }, mudaO(o, 'pontos')), fSel('Detecção', o.det, [['linha', 'A bola cruza a linha'], ['area', 'A bola entra na área']], mudaO(o, 'det')),
        fBool('Traves (batem)', o.traves, mudaO(o, 'traves')), fBool('Rede (segura a bola)', o.rede, mudaO(o, 'rede')), fNum('Raio da trave', o.raioTrave, { min: 0.1, max: 2, passo: 0.05, un: 'u' }, mudaO(o, 'raioTrave')),
        fNota('A boca do gol fica do lado do ponto amarelo da rotação. Gire para virar o gol para onde quiser.'));
      break;
    case 'portal': {
      const outros = M.objetos.filter(x => x.tipo === 'portal' && x.id !== o.id);
      poe(c, fTit('Portal', 'portal'), fNum('Raio', o.raio, { min: 0.8, max: 12, passo: 0.1, un: 'u' }, mudaO(o, 'raio')),
        fSel('Leva para (o par)', o.par, [['', 'Ninguém (sem par)']].concat(outros.map(x => [x.id, (x.nome || 'Portal') + ' · ' + x.id])), (v, f) => muda(M2 => { const a = M2.objetos.find(y => y.id === o.id); a.par = v; const b = v && M2.objetos.find(y => y.id === v); if (b && !b.par) b.par = o.id; }, f)),
        fSel('Quem passa', o.afeta, N_AFETA, mudaO(o, 'afeta')), fSel('Saída', o.saida, [['mesma', 'Mesma direção'], ['angulo', 'No ângulo']], mudaO(o, 'saida')),
        o.saida === 'angulo' ? fNum('Ângulo de saída', o.dir, { min: 0, max: 359, passo: 5, un: '°' }, mudaO(o, 'dir')) : null,
        fNum('Espera entre usos', o.espera, { min: 5, max: 240, passo: 1, un: 'passos' }, mudaO(o, 'espera')));
      break;
    }
    case 'botao': case 'interruptor':
      poe(c, fTit(N_TIPO[o.tipo], 'botao'), fNum('Raio', o.raio, { min: 0.6, max: 10, passo: 0.1, un: 'u' }, mudaO(o, 'raio')), fSel('Acionado por', o.por, N_AFETA, mudaO(o, 'por')),
        fSel('Só para o time', o.equipe, N_EQUIPE(M), mudaO(o, 'equipe')),
        o.tipo === 'botao' ? fSel('Modo', o.modo, [['momentaneo', 'Enquanto apertado'], ['alterna', 'Liga e desliga']], mudaO(o, 'modo')) : null,
        fBool('Começa ligado', o.ligado, mudaO(o, 'ligado')), fNota('Use a LÓGICA para dizer o que ele faz (ex.: QUANDO apertarem o botão → ENTÃO abrir o portão).'));
      break;
    case 'cronometro':
      poe(c, fTit('Cronômetro', 'relogio'), fNum('Tempo', o.seg, { min: 0.5, max: 1800, passo: 0.5, un: 's' }, mudaO(o, 'seg')), fBool('Repete', o.repete, mudaO(o, 'repete')),
        fSel('Começa', o.inicia, [['partida', 'Com a partida'], ['manual', 'Pela lógica']], mudaO(o, 'inicia')), fBool('Mostrar na tela', o.mostra, mudaO(o, 'mostra')),
        fNota('Quando o tempo acaba, a lógica QUANDO "o cronômetro termina" dispara.'));
      break;
    case 'spawn':
      poe(c, fTit('Nascimento', 'pino'), fSel('Time', o.equipe, M.partida.times.map((t, i) => [i, t.nome]), mudaO(o, 'equipe')), fNum('Ordem (1 = primeiro)', o.ordem + 1, { min: 1, max: 16, passo: 1 }, mudaO(o, 'ordem', v => Math.round(v) - 1)));
      break;
    case 'texto':
      poe(c, fTit('Texto', 'texto'), fTxt('Texto', o.texto, RM.LIM.texto, mudaO(o, 'texto')), fNum('Tamanho', o.tam, { min: 0.6, max: 20, passo: 0.1, un: 'u' }, mudaO(o, 'tam')), fCor('Contorno', o.cor2, mudaO(o, 'cor2')));
      break;
  }
  if (['parede', 'arco', 'linha', 'obstaculo', 'portao'].indexOf(o.tipo) >= 0) {
    poe(c, fTit('Colisão', 'fisica'), fSel('Quem bate', o.colide, N_COLISAO, mudaO(o, 'colide')),
      fNum('Elasticidade (quique)', o.quique, { min: 0, max: 1.2, passo: 0.01 }, mudaO(o, 'quique')), fNum('Atrito', o.atrito, { min: 0, max: 1, passo: 0.01 }, mudaO(o, 'atrito')));
    if (o.tipo !== 'portao') poe(c, fNum('Some depois de (0 = nunca)', o.temp, { min: 0, max: 120, passo: 0.5, un: 's' }, mudaO(o, 'temp')));
  }
  if (o.tipo === 'portao') poe(c, fTit('Portão', 'portao'), fBool('Começa aberto', o.aberto, mudaO(o, 'aberto')), fNum('Abre sozinho a cada (0 = não)', o.ciclo, { min: 0, max: 120, passo: 0.5, un: 's' }, mudaO(o, 'ciclo')),
    o.ciclo > 0 ? fNum('Fica aberto', o.tempoAberto, { min: 0, max: 120, passo: 0.5, un: 's' }, mudaO(o, 'tempoAberto')) : null);
  // o movimento (os objetos que andam)
  if (['parede', 'arco', 'linha', 'obstaculo', 'portao', 'gol', 'zona', 'portal', 'botao', 'interruptor', 'decoracao', 'texto'].indexOf(o.tipo) >= 0) {
    const m = o.mov || null;
    poe(c, fTit('Movimento', 'girar'), fSel('Movimento', m ? m.tipo : '', N_MOV, (v, f) => muda(M2 => { const x = M2.objetos.find(y => y.id === o.id); if (!v) delete x.mov; else x.mov = Object.assign({ dx: 10, dy: 0, raio: 6, vel: v === 'girar' ? 10 : 6, fase: 0, auto: true }, x.mov || {}, { tipo: v }); }, f)));
    if (m) {
      if (m.tipo === 'vaivem') poe(c, fNum('Vai até X', m.dx, { min: -200, max: 200, passo: 0.5, un: 'u' }, mudaO(o, 'mov.dx')), fNum('Vai até Y', m.dy, { min: -160, max: 160, passo: 0.5, un: 'u' }, mudaO(o, 'mov.dy')));
      if (m.tipo === 'circular') poe(c, fNum('Raio da volta', m.raio, { min: 0.5, max: 100, passo: 0.5, un: 'u' }, mudaO(o, 'mov.raio')));
      poe(c, fNum('Velocidade', m.vel, { min: 0, max: m.tipo === 'girar' ? 60 : RM.LIM.velMov, passo: 0.5, un: m.tipo === 'girar' ? 'voltas/min' : 'u/s' }, mudaO(o, 'mov.vel')),
        fNum('Começa no ponto (fase)', m.fase, { min: 0, max: 1, passo: 0.05 }, mudaO(o, 'mov.fase')), fBool('Anda sozinho (sem a lógica)', m.auto, mudaO(o, 'mov.auto')),
        fNota('Rápido demais atravessaria a bola: a ponta fica no máximo de ' + RM.LIM.velMov + ' u/s.'));
    }
  }
  // a aparência e o resto (todos)
  poe(c, fTit('Aparência', 'pincel'));
  if (o.tipo !== 'spawn' && o.tipo !== 'spawnBola') poe(c, fCor('Cor', o.cor, mudaO(o, 'cor')), fNum('Opacidade', o.opac, { min: 0.05, max: 1, passo: 0.05 }, mudaO(o, 'opac')));
  poe(c, fSel('Camada', o.camada, RM.CAMADAS.map(x => [x.id, x.nome]), mudaO(o, 'camada')),
    fBool('Visível na partida', o.visivel, mudaO(o, 'visivel')), fBool('Ativo no começo', o.ativo, mudaO(o, 'ativo')),
    fBool('Bloqueado no editor', o.bloqueado, mudaO(o, 'bloqueado')), fBool('Oculto no editor', o.oculto, mudaO(o, 'oculto')),
    o.grupo ? fNota('No grupo ' + o.grupo + ' (tocar em um seleciona todos).') : null,
    fBotoes(botao('DUPLICAR', duplica, 'escuro', 'duplicar'), botao('EXCLUIR', exclui, 'verm', 'lixo')));
}
function zonaCampos(c, o) {
  const M = OFE.M;
  poe(c, fTit('Efeito da zona', 'zona'), fSel('Efeito', o.efeito, N_EFEITO, mudaO(o, 'efeito', (v, x) => { if (v === 'lentidao' && x.fator >= 1) x.fator = 0.5; if (v === 'velocidade' && x.fator <= 1) x.fator = 1.5; x.cor = { velocidade: '#14d4f0', lentidao: '#7d8aa8', impulso: '#ffd23f', gravidade: '#b197fc', esteira: '#3cb44b', rampa: '#d86a38', pontos: '#ffd23f', reinicio: '#56b4ff', elimina: '#ff3b3b', nada: '#ffffff' }[v] || x.cor; return v; })),
    fSel('Afeta', o.afeta, N_AFETA, mudaO(o, 'afeta')), fSel('Só para o time', o.equipe, N_EQUIPE(M), mudaO(o, 'equipe')));
  if (o.efeito === 'velocidade' || o.efeito === 'lentidao') poe(c, fNum('Fator da velocidade', o.fator, { min: 0.1, max: 3, passo: 0.05, un: '×' }, mudaO(o, 'fator')));
  if (['impulso', 'gravidade', 'esteira', 'rampa'].indexOf(o.efeito) >= 0) poe(c, fNum(o.efeito === 'esteira' ? 'Velocidade da esteira' : 'Força', o.forca, { min: -200, max: 200, passo: 1, un: o.efeito === 'esteira' ? 'u/s' : 'u/s²' }, mudaO(o, 'forca')),
    o.efeito === 'gravidade' ? fBool('Puxa para o centro (senão, na direção)', o.centro, mudaO(o, 'centro')) : null,
    !(o.efeito === 'gravidade' && o.centro) ? fNum('Direção', o.dir, { min: 0, max: 359, passo: 5, un: '°' }, mudaO(o, 'dir')) : null);
  if (o.efeito === 'pontos') poe(c, fNum('Pontos', o.pontosZ, { min: 1, max: 10, passo: 1 }, mudaO(o, 'pontosZ')), fBool('Recomeça com saída (senão, continua)', o.reinicia, mudaO(o, 'reinicia')),
    fNota('Sem time escolhido, o ponto é de quem tocou por último na bola.'));
  if (o.efeito === 'elimina') poe(c, fNota('Quem entra sai da rodada (volta na próxima saída). Com a vitória "sobrevivência", o último time de pé ganha a rodada.'));
}
function propriedadesVarios(c, objs) {
  const comum = k => objs.every(o => o[k] === objs[0][k]) ? objs[0][k] : undefined;
  const todos = campo => (v, final) => { muda(M => { for (const o of M.objetos) if (OFE.sel.has(o.id) && campo in o) o[campo] = v; }, final); if (!final) OFE.sujo = true; };
  poe(c, fNota('Os campos abaixo mudam todos os ' + objs.length + ' objetos selecionados.'),
    fCor('Cor', comum('cor') || objs[0].cor, todos('cor')), fNum('Opacidade', comum('opac') || 1, { min: 0.05, max: 1, passo: 0.05 }, todos('opac')),
    fSel('Camada', comum('camada') || objs[0].camada, RM.CAMADAS.map(x => [x.id, x.nome]), todos('camada')),
    fBool('Visível na partida', comum('visivel') !== false, todos('visivel')), fBool('Ativo no começo', comum('ativo') !== false, todos('ativo')));
  if (objs.every(o => 'colide' in o)) poe(c, fSel('Quem bate', comum('colide') || 'todos', N_COLISAO, todos('colide')), fNum('Elasticidade (quique)', comum('quique') == null ? 0.65 : comum('quique'), { min: 0, max: 1.2, passo: 0.01 }, todos('quique')));
  poe(c, fBotoes(botao('AGRUPAR', agrupa, 'escuro', 'agrupar'), botao('DUPLICAR', duplica, 'escuro', 'duplicar'), botao('EXCLUIR', exclui, 'verm', 'lixo')));
}

/* ---------------------------------------------------------------- CAMPO */
function painelCampo(c) {
  const M = OFE.M, k = M.campo, setC = campo => (v, final) => { muda(M2 => { M2.campo[campo] = v; }, final); if (!final) { OFE.sujo = true; } };
  poe(c, fTit('O campo', 'campo'),
    fSel('Formato', k.forma, [['retangulo', 'Retangular'], ['quadrado', 'Quadrado'], ['circulo', 'Circular'], ['octogono', 'Octogonal'], ['arena', 'Arena (cantos redondos)'], ['poligono', 'Assimétrico (pontos)'], ['livre', 'Livre (sem linhas)']],
      (v, f) => muda(M2 => { const kk = M2.campo; kk.forma = v; if (v === 'poligono' && !(kk.pontos && kk.pontos.length >= 3)) kk.pontos = [[-kk.w / 2, -kk.h / 2], [kk.w / 2, -kk.h * 0.35], [kk.w / 2, kk.h / 2], [-kk.w / 2, kk.h * 0.35]].map(p => [arred(p[0]), arred(p[1])]); if ((v === 'octogono' || v === 'arena') && !(kk.canto > 0.05)) kk.canto = arred(Math.min(kk.w, kk.h) * (v === 'octogono' ? 0.22 : 0.18)); if (v === 'livre') kk.borda = 'aberto'; }, f)));
  const tams = Object.entries(TAMANHOS).map(([id, t]) => botao(t.nome, () => muda(M2 => { M2.campo.w = t.w; M2.campo.h = t.h; M2.campo.margem = t.mx; M2.campo.margemY = t.my; reposicionaGols(M2); }), 'ofi-seg-bt' + (k.w === t.w && k.h === t.h ? ' on' : '')));
  poe(c, fLinha('Tamanho', h('div.ofi-seg.quebra', ...tams)),
    fNum('Largura', k.w, { min: RM.LIM.campoW[0], max: RM.LIM.campoW[1], passo: 1, un: 'u' }, (v, f) => { muda(M2 => { M2.campo.w = v; if (f) reposicionaGols(M2); }, f); if (!f) OFE.sujo = true; }),
    fNum('Altura', k.h, { min: RM.LIM.campoH[0], max: RM.LIM.campoH[1], passo: 1, un: 'u' }, (v, f) => { muda(M2 => { M2.campo.h = v; }, f); if (!f) OFE.sujo = true; }));
  if (k.forma === 'octogono' || k.forma === 'arena') poe(c, fNum(k.forma === 'arena' ? 'Raio do canto' : 'Corte do canto', k.canto, { min: 0, max: Math.min(k.w, k.h) / 2, passo: 0.5, un: 'u' }, setC('canto')));
  if (k.forma === 'poligono') poe(c, fNota('O contorno tem ' + (k.pontos || []).length + ' pontos.'), fBotoes(botao('DESENHAR O CONTORNO', () => { OFE.destinoPoli = 'campo'; escolheFerr('poli'); }, 'escuro', 'poligono')));
  poe(c, fSel('Bordas', k.borda, [['bola', 'Só a bola bate (o clássico)'], ['todos', 'Com paredes (todos batem)'], ['aberto', 'Aberto (sem paredes)']], setC('borda')));
  if (k.borda === 'aberto') poe(c, fSel('Bola fora do campo', k.laterais, [['parede', 'Bate na beira do mundo'], ['lateral', 'Volta na lateral'], ['reinicio', 'Recomeça com saída']], setC('laterais')));
  poe(c, fNum('Margem do jogador (lados)', k.margem, { min: RM.LIM.margem[0], max: RM.LIM.margem[1], passo: 0.5, un: 'u' }, setC('margem')),
    fNum('Margem do jogador (em cima/embaixo)', k.margemY, { min: RM.LIM.margem[0], max: RM.LIM.margem[1], passo: 0.5, un: 'u' }, setC('margemY')),
    fNota('A margem é o espaço fora das linhas onde a tampinha ainda anda (a linha tracejada).'),
    fTit('O mapa', 'mapa'), fTxt('Nome', M.nome, RM.LIM.nome, (v, f) => { muda(M2 => { M2.nome = v; }, f); edEstado(); }),
    fTxt('Descrição', M.descricao, RM.LIM.descricao, (v, f) => muda(M2 => { M2.descricao = v; }, f), true),
    fSel('Categoria', M.categoria, RM.CATEGORIAS.map(x => [x, N_CATEGORIA[x]]), (v, f) => muda(M2 => { M2.categoria = v; }, f)));
}
function reposicionaGols(M) {                          // o campo mudou de tamanho: os gols que estavam na beira acompanham
  const w = M.campo.w;
  for (const o of M.objetos) if (o.tipo === 'gol' && Math.abs(o.y) < M.campo.h / 2 && Math.abs(Math.abs(o.x) - (OFE.G ? OFE.G.w / 2 / RN.PX_POR_U : w / 2)) < 1.5) o.x = Math.sign(o.x || 1) * w / 2;
}

/* ---------------------------------------------------------------- APARÊNCIA */
function painelAparencia(c) {
  const A = OFE.M.aparencia, setA = k => (v, f) => { muda(M => { M.aparencia[k] = v; }, f); if (!f) OFE.sujo = true; }, setL = k => (v, f) => { muda(M => { M.aparencia.linhas[k] = v; }, f); if (!f) OFE.sujo = true; };
  const pisos = h('div.ofi-pisos');
  for (const [id, p] of Object.entries(PISOS)) {
    const b = h('button.ofi-piso' + (A.piso === id ? '.on' : ''), { type: 'button', title: p.nome, on: { click: () => { muda(M => { M.aparencia.piso = id; if (p.cor1) { M.aparencia.cor1 = p.cor1; M.aparencia.cor2 = p.cor2; M.aparencia.textura = p.textura; M.aparencia.escala = p.escala; } }); } } },
      h('i', { style: { background: p.cor1 ? 'linear-gradient(90deg,' + p.cor1 + ' 50%,' + p.cor2 + ' 50%)' : 'repeating-conic-gradient(#888 0 25%, #ccc 0 50%) 50% / 12px 12px' } }), h('span', { texto: p.nome }));
    pisos.appendChild(b);
  }
  poe(c, fTit('Piso', 'pincel'), pisos, fCor('Cor principal', A.cor1, setA('cor1')), fCor('Cor secundária', A.cor2, setA('cor2')),
    fSel('Textura', A.textura, Object.entries(NOMES_TEXTURA), setA('textura')), fNum('Tamanho da textura', A.escala, { min: 1, max: 30, passo: 0.5, un: 'u' }, setA('escala')),
    fTit('Linhas do campo', 'campo'), fBool('Mostrar as linhas', A.linhas.on, setL('on')), fCor('Cor das linhas', A.linhas.cor, setL('cor')), fNum('Espessura', A.linhas.esp, { min: 0.1, max: 1.5, passo: 0.05, un: 'u' }, setL('esp')),
    fBool('Linhas laterais (o contorno)', A.linhas.laterais, setL('laterais')), fBool('Linha do meio', A.linhas.meio, setL('meio')), fBool('Círculo central', A.linhas.centro, setL('centro')),
    fBool('Área do goleiro', A.linhas.areas, setL('areas')), fBool('Área de pênalti', A.linhas.penalti, setL('penalti')),
    fNota('Marcações personalizadas: na BIBLIOTECA › Decoração › Marcação.'),
    fTit('Fora do campo', 'mapa'), fSel('Fundo', A.fundo, Object.entries(NOMES_FUNDO), setA('fundo')), fCor('Cor do fundo', A.corFundo, setA('corFundo')),
    fSel('Iluminação', A.luz, Object.entries(NOMES_LUZ), setA('luz')));
  // a bola: a amostra em cima do piso do mapa (do jeito que vai aparecer na partida) e o estilo
  const amostra = h('canvas.ofi-bola-amostra', { width: 120, height: 72, 'aria-hidden': 'true' });
  try {
    const g = amostra.getContext('2d'); g.fillStyle = A.cor1 || '#2f8f4e'; g.fillRect(0, 0, 120, 72); g.fillStyle = A.cor2 || '#2a8045'; g.fillRect(60, 0, 60, 72);
    g.fillStyle = 'rgba(255,255,255,.55)'; g.fillRect(58, 0, 4, 72);
    DES.bola(g, 60, 36, 22, OFE.M);
  } catch (_) {}
  poe(c, fTit('Peças', 'retangulo'), fBool('Sombra nas peças sólidas', A.sombras !== false, setA('sombras')),
    fNota('A sombra mostra o que é sólido (paredes, curvas, linhas e obstáculos que batem): as peças parecem de verdade.'));
  poe(c, fTit('Bola', 'bola'), fLinha('Como fica', amostra),
    fSel('Estilo da bola', A.bola || 'branca', [['branca', 'Branca'], ['cor', 'Colorida'], ['racha', 'RACHA'], ['jogador', 'Equipada']], setA('bola')),
    A.bola === 'cor' ? fCor('Cor da bola', A.corBola, setA('corBola')) : null,
    fNota(A.bola === 'jogador' ? 'Equipada: cada um vê a bola que equipou na LOJA › BOLAS (as lisas, a Clássica Lisa…); quem não equipou nenhuma vê a branca. Só o desenho: o tamanho fica em FÍSICA › Bola.'
      : 'Branca: lisa, de contorno preto, a de sempre dos jogos de bolinha (fácil de ver em qualquer piso). O tamanho da bola fica em FÍSICA › Bola.'));
}

/* ---------------------------------------------------------------- FÍSICA */
const CAMPOS_BOLA = [
  ['limiteBola', 'Velocidade máxima', 'u/s', 1], ['massaChute', 'Aceleração do chute', '×', 0.05, 'extra'], ['fatorBola', 'Atrito no chão (freio)', '%', 0.001, 'inv'],
  ['quiqueParede', 'Elasticidade (parede)', '', 0.01], ['massaBola', 'Massa', '', 0.5], ['rBola', 'Tamanho (raio)', 'u', 0.05], ['quiqueTrave', 'Quique na trave', '', 0.01],
  ['quiqueRede', 'Quique na rede', '', 0.01], ['atritoBola', 'Resistência (atrito do contato)', '', 0.01], ['amortAngular', 'Rotação: o giro some em', '', 0.1], ['giroCurva', 'Efeito da curva', '×', 0.05, 'extra']];
const CAMPOS_JOG = [
  ['velJog', 'Velocidade', 'u/s', 0.1], ['acelJog', 'Aceleração', '', 0.01, 'extra'], ['freioJog', 'Deslize ao soltar o analógico', '%', 1, 'deslize'], ['atritoJog', 'Atrito', '', 0.01],   // (v97: a aceleração de 0,02 a 1, de 0,01 em 0,01)
  ['massaJog', 'Massa', '', 0.05], ['rJog', 'Tamanho (raio)', 'u', 0.05], ['forcaChute', 'Força do chute', '', 5], ['forcaPasse', 'Força do passe (impulso)', '', 5],
  ['recuo', 'Recuo do chute', '', 0.05, 'extra'], ['quiqueJogJog', 'Intensidade da colisão', '', 0.01], ['quiqueBola', 'Controle de condução', '%', 0.01, 'controle'], ['raioChute', 'Alcance do chute', 'u', 0.05]];
// v95: o DESLIZE DA TAMPINHA (soltou o analógico: quanto ela ainda anda). 0% = para na hora (o RACHA de sempre) e 100% = o
// freio mais leve do motor (0,03 por passo). A escala é linear na distância: solta, a tampinha anda (1 − f) ÷ f passos.
const DESLIZE_JOG_MAX = (1 - RM.EXTRA_LIM.freioJog[0]) / RM.EXTRA_LIM.freioJog[0];
const deslizeJogDe = f => (1 - f) / Math.max(1e-6, f) / DESLIZE_JOG_MAX * 100;
const freioDoDeslizeJog = p => arred(1 / (1 + clamp(p, 0, 100) / 100 * DESLIZE_JOG_MAX), 1e4);
// u: quanto a tampinha solta anda na velocidade máxima (a mesma conta do motor: v × (1 − f) a cada passo)
const deslizeJogU = R => R.extra.freioJog >= 1 ? 0 : R.perfil.velJog * (1 - R.extra.freioJog) / R.extra.freioJog / RN.TPS;
// v95: o anel do chute vale pelo menos o raio + 0,5 u (senão a tampinha grande não chutava): o alcance que vale de verdade
const alcanceValendo = R => Math.max(R.perfil.raioChute, R.perfil.rJog + RN.FOLGA_CHUTE);
/* ---------------------------------------------------------------- v97 (depois do teste): MISTURAR COM O RACHÃO
   A ponte da física (app/public/game/rachao/ponte.js, colada antes da Oficina: window.RachaPonte) traduz a BOLA, a
   TAMPINHA e o CHUTE do Rachão para os números do RACHA pelo comportamento (medido no tamanho da tampinha), cada um
   sozinho: a bola do Rachão com a tampinha e o chute do RACHA, e qualquer outra mistura. Vale no mapa (aba Física) e na
   física da sala (CRIAR SALA e os AJUSTES do admin). */
const PONTE = window.RachaPonte && window.RachaPonte.noRacha ? window.RachaPonte : null;
const N_PARTE_RCH = { bola: 'Bola', jogador: 'Tampinha', chute: 'Chute' };
// a física com uma parte do Rachão (ou de volta à do RACHA): sempre "personalizada", limpa nos limites do servidor
function fisicaMisturada(f, parte, jogo) {
  const R = RM.fisicaResolvida(f), n = PONTE.noRacha(R.perfil, R.extra, parte, PONTE.alvo(jogo)[parte]);
  return RM.limpaFisica({ preset: 'personalizado', perfil: Object.fromEntries(RM.PERFIL_CAMPOS.map(k => [k, n.perfil[k]])), extra: n.extra, colideParedes: R.colideParedes });
}
// as três linhas (Bola, Tampinha, Chute: RACHA | Rachão) com a frase de cada uma; R = a física resolvida
function misturaRachao(R, aoEscolher) {
  return PONTE.PARTES.map(parte => {
    const qual = PONTE.qualRacha(R.perfil, R.extra, parte), seg = h('div.ofi-seg.ofi-mistura-seg', { role: 'group', 'aria-label': N_PARTE_RCH[parte] + ': de qual jogo' });
    for (const [jogo, nome] of [['racha', 'RACHA'], ['rachao', 'Rachão']]) {
      const b = botao(nome, () => aoEscolher(parte, jogo), 'ofi-seg-bt' + (qual === jogo ? ' on' : ''));   // (a mesma de novo refaz a parte: mexeu num número e quer a do jogo de volta)
      b.dataset.parte = parte; b.dataset.jogo = jogo; b.setAttribute('aria-pressed', String(qual === jogo));
      seg.appendChild(b);
    }
    return h('div.ofi-mistura', { dados: { parte } }, fLinha(N_PARTE_RCH[parte], seg), h('small.ofi-mistura-tx', { texto: PONTE.texto('racha', parte, qual) }));
  });
}
const NOTA_MISTURA = 'Cada parte vem com o jeito do Rachão, medido pelo tamanho da tampinha: dá para jogar com a bola do Rachão e a tampinha e o chute do RACHA (e o contrário). Os números embaixo mostram o que mudou.';
function painelFisica(c) {
  const M = OFE.M, F = RM.fisicaResolvida(M.fisica), pre = M.fisica.preset;
  const prs = Object.entries(RM.PRESETS).map(([id, p]) => botao(p.nome, () => muda(M2 => { M2.fisica = { preset: id, perfil: {}, extra: {}, colideParedes: M2.fisica.colideParedes !== false }; }), 'ofi-seg-bt' + (pre === id ? ' on' : '')));
  poe(c, fTit('Física', 'fisica'), fNota('Vale só nas partidas da Oficina (privadas e personalizadas). A ranqueada e as salas comuns usam sempre a física oficial do RACHA.'),
    fLinha('Predefinição', h('div.ofi-seg.quebra', ...prs)));
  if (PONTE) poe(c, fTit('Misturar com o Rachão', 'rachao'), ...misturaRachao(F, (parte, jogo) => muda(M2 => { M2.fisica = fisicaMisturada(M2.fisica, parte, jogo); })), fNota(NOTA_MISTURA));
  const set = (k, tipo) => (v, final) => {
    muda(M2 => {
      if (M2.fisica.preset !== 'personalizado') { const R = RM.fisicaResolvida(M2.fisica); M2.fisica = { preset: 'personalizado', perfil: Object.fromEntries(RM.PERFIL_CAMPOS.map(x => [x, R.perfil[x]])), extra: Object.assign({}, R.extra), colideParedes: R.colideParedes }; }
      if (tipo === 'extra') M2.fisica.extra[k] = v; else M2.fisica.perfil[k] = v;
    }, final);
    if (!final) OFE.sujo = true;
  };
  const linha = ([k, nome, un, passo, tipo]) => {
    if (tipo === 'deslize') {                         // (v95: 0% para na hora · 100% desliza o máximo)
      const u = deslizeJogU(F);
      return [fNum(nome, deslizeJogDe(F.extra.freioJog), { min: 0, max: 100, passo: 1, un: '%', casas: 0 }, (v, f) => set('freioJog', 'extra')(freioDoDeslizeJog(v), f)),
        u > 0.05 ? h('p.ofi-p-nota.ofi-nota-deslize', { texto: 'Soltou o analógico na velocidade máxima: a tampinha ainda anda ~' + fmtU(u) + ' u.' }) : null];
    }
    if (tipo === 'extra') { const L = RM.EXTRA_LIM[k]; return fNum(nome, F.extra[k], { min: L[0], max: L[1], passo, un }, set(k, 'extra')); }
    const L = RN.LIMITES[k];
    if (tipo === 'inv') return fNum(nome, F.perfil[k], { min: L[0], max: L[1], passo, un: 'deslize' }, set(k));
    if (tipo === 'controle') return fNum(nome + ' (0 = a bola quica no pé)', 1 - F.perfil[k] / 0.9, { min: 0, max: 1, passo: 0.05 }, (v, f) => set(k)(arred((1 - v) * 0.9, 1000), f));
    if (k === 'raioChute') {                          // (v95: o anel nunca por dentro da tampinha — mostra o que vale)
      const ef = alcanceValendo(F);
      return [fNum(nome, F.perfil[k], { min: L[0], max: L[1], passo, un }, set(k)),
        ef > F.perfil[k] + 1e-6 ? h('p.ofi-p-nota.ofi-nota-alcance', { texto: 'Valendo ' + fmtU(ef) + ' u: o alcance acompanha o tamanho (pelo menos o raio + 0,5 u), senão a tampinha grande não chutava.' }) : null];
    }
    return fNum(nome, F.perfil[k], { min: L[0], max: L[1], passo, un }, set(k));
  };
  poe(c, fTit('Bola', 'bola'), ...CAMPOS_BOLA.map(linha), fBool('Bate nas paredes do mapa', F.colideParedes, (v, f) => muda(M2 => { M2.fisica.colideParedes = v; }, f)),
    fTit('Jogadores', 'pessoas'), ...CAMPOS_JOG.map(linha),
    fBotoes(botao('VOLTAR PARA O CLÁSSICO', () => muda(M2 => { M2.fisica = { preset: 'classico', perfil: {}, extra: {}, colideParedes: true }; }), 'escuro', 'girar')));
}

/* ---------------------------------------------------------------- PARTIDA */
function painelPartida(c) {
  const M = OFE.M, P = M.partida, setP = k => (v, f) => muda(M2 => { M2.partida[k] = v; }, f);
  poe(c, fTit('A partida', 'apito'),
    fSel('Modo', P.modo, RM.MODOS_JOGO.map(x => [x, N_MODO[x] || x]), setP('modo')),
    fSel('Jogo', P.jogo, [['futebol', 'Futebol'], ['curva', 'Com curva']], setP('jogo')),
    fSel('Número de times', P.equipes, [[1, '1'], [2, '2'], [3, '3'], [4, '4']], (v, f) => muda(M2 => { M2.partida.equipes = v; while (M2.partida.times.length < v) M2.partida.times.push({ nome: NOME_TIME(M2.partida.times.length), cor: RM.CORES_EQUIPE[M2.partida.times.length] }); M2.partida.times.length = v; }, f)),
    fNum('Jogadores por time', P.porTime, { min: 1, max: Math.max(1, Math.min(5, Math.floor(16 / P.equipes))), passo: 1 }, setP('porTime')),
    fNum('Mínimo por time (na sala)', P.porMin, { min: 1, max: P.porTime, passo: 1 }, setP('porMin')),
    fNum('Máximo por time (na sala)', P.porMax, { min: P.porTime, max: Math.max(1, Math.min(5, Math.floor(16 / P.equipes))), passo: 1 }, setP('porMax')));
  P.times.forEach((t, i) => poe(c, h('div.ofi-time', h('i', { style: { background: t.cor } }), h('b', { texto: NOME_TIME(i) })),
    fTxt('Nome do time', t.nome, 16, (v, f) => muda(M2 => { M2.partida.times[i].nome = v; }, f)), fCor('Cor do time', t.cor, (v, f) => muda(M2 => { M2.partida.times[i].cor = v; }, f))));
  poe(c, fTit('Fim da partida', 'trofeu'),
    fSel('Vitória', P.vitoria, [['gols', 'Por gols / pontos'], ['sobrevivencia', 'Sobrevivência (rodadas)']], setP('vitoria')),
    fNum(P.vitoria === 'sobrevivencia' ? 'Rodadas para vencer' : 'Gols para vencer (0 = sem limite)', P.meta, { min: 0, max: 99, passo: 1 }, setP('meta')),
    fNum('Tempo (0 = sem tempo)', P.tempo, { min: 0, max: 30, passo: 1, un: 'min' }, setP('tempo')),
    P.tempo > 0 ? fSel('Empate no fim do tempo', P.desempate, [['ouro', 'Gol de ouro'], ['empate', 'Fica empatado']], setP('desempate')) : null,
    P.tempo > 0 && P.desempate === 'ouro' ? fNum('Prorrogação (0 = sem limite)', P.prorrogacao, { min: 0, max: 10, passo: 1, un: 'min' }, setP('prorrogacao')) : null,
    P.tempo > 0 && P.equipes === 2 ? fBool('Troca de lado no intervalo', P.trocaLados, setP('trocaLados')) : null,
    fTit('Regras', 'escudo'),
    fSel('Depois do gol', P.reinicio, [['saida', 'Saída do meio'], ['bola', 'A bola volta (sem saída)'], ['continua', 'Continua (sem parar)']], setP('reinicio')),
    fSel('Saída', P.saida, P.equipes === 2 ? [['meio', 'Meio-campo'], ['circulo', 'Círculo'], ['livre', 'Livre']] : [['circulo', 'Círculo'], ['livre', 'Livre']], setP('saida')),
    fNum('Raio da saída', P.raioSaida, { min: 0, max: 40, passo: 0.5, un: 'u' }, setP('raioSaida')),
    fNum('Bola livre sem saída depois de', P.saidaLivre, { min: 2, max: 30, passo: 1, un: 's' }, setP('saidaLivre')),
    fSel('Gol contra', P.golContra, [['adversario', 'Ponto do adversário'], ['menos1', 'Tira um ponto'], ['nada', 'Não vale']], setP('golContra')),
    fBool('Colisão entre companheiros', P.colisaoAmigos, setP('colisaoAmigos')), fBool('Colisão entre adversários', P.colisaoAdversarios, setP('colisaoAdversarios')),
    fBool('Bots completam as vagas', P.bots, setP('bots')), fBool('Espectadores na sala', P.espectadores, setP('espectadores')),
    fBool('Linhas da bola para todos', !!P.linhas, (v, f) => muda(M2 => { if (v) M2.partida.linhas = true; else delete M2.partida.linhas; }, f)),   // v95
    fNota(P.linhas ? 'Ligado: o pontilhado do chute e o caminho da bola aparecem para todo mundo, em qualquer sala com este mapa e no TESTAR (a partida conta normal).'
      : 'Desligado: as linhas da bola só aparecem quando o curador da sala liga o RANK OFF (aí a partida não conta nas jogadas do mapa).'),
    fNota('A bola começa no SPAWN DA BOLA (ou no meio) e os jogadores nos SPAWNS (aba Spawns). O que sai do campo: aba Campo › Bordas.'),
    fTit('Goleiro', 'escudo'),
    fBool('Goleiro (a última vaga de cada time, com 3 ou mais por time)', P.goleiro, setP('goleiro')),
    fSel('Área do goleiro', P.areaGol, [['livre', 'Livre (sem regra)'], ['defesa', 'Só o goleiro do time (a defesa fica fora)'], ['todos', 'Só o goleiro, para todos (nem o adversário entra)']], setP('areaGol')),
    fBool('O goleiro não sai da área', P.goleiroPreso, setP('goleiroPreso')),
    fNota('A área é a caixa na frente de cada gol com dono (a mesma da marcação "Área do goleiro", que aparece sozinha quando há regra). Vale para as tampinhas; a bola entra e sai à vontade. Sem goleiro (desligado ou menos de 3 por time), a área fica fechada para o time inteiro. Na sala, a vaga do goleiro aparece com a etiqueta GOLEIRO; o bot que ocupar a vaga joga no gol.'));
}

/* ---------------------------------------------------------------- LÓGICA (QUANDO → ENTÃO) */
const N_QUANDO = [['inicio', 'a partida começa', ''], ['saida', 'sai uma saída de bola', ''], ['bola_entra', 'a bola entra na zona', 'zona'], ['bola_sai', 'a bola sai da zona', 'zona'],
  ['jogador_entra', 'um jogador entra na zona', 'zona'], ['jogador_sai', 'um jogador sai da zona', 'zona'], ['botao', 'apertam o botão', 'botao'], ['botao_solto', 'soltam o botão', 'botao'],
  ['interruptor_liga', 'o interruptor liga', 'botao'], ['interruptor_desliga', 'o interruptor desliga', 'botao'], ['cronometro', 'o cronômetro termina', 'cronometro'], ['tempo', 'chega o tempo de jogo', ''],
  ['a_cada', 'a cada N segundos', ''], ['gol', 'sai um gol', ''], ['gol_no', 'sai gol no gol', 'gol'], ['placar', 'um time chega aos pontos', ''], ['portal', 'alguém passa no portal', 'portal'], ['toque_objeto', 'a bola bate no objeto', 'solido']];
const N_ACAO = [['abrir', 'abrir o portão', 'portao'], ['fechar', 'fechar o portão', 'portao'], ['alternar', 'abrir/fechar o portão', 'portao'], ['ativar', 'ativar o objeto', 'qualquer'], ['desativar', 'desativar o objeto', 'qualquer'],
  ['alterna_ativo', 'ativar/desativar', 'qualquer'], ['mostrar', 'mostrar o objeto', 'qualquer'], ['ocultar', 'esconder o objeto', 'qualquer'], ['mover', 'mover o objeto', 'qualquer'], ['voltar', 'voltar o objeto ao lugar', 'qualquer'],
  ['cor', 'mudar a cor', 'qualquer'], ['bola_para', 'parar a bola', ''], ['bola_spawn', 'a bola volta ao spawn', ''], ['bola_vel', 'mudar a velocidade da bola', ''], ['pontos', 'dar pontos', ''],
  ['mensagem', 'mostrar mensagem', ''], ['efeito', 'efeito na tela', ''], ['cronometro_inicia', 'iniciar o cronômetro', 'cronometro'], ['cronometro_para', 'parar o cronômetro', 'cronometro'],
  ['interruptor', 'trocar o interruptor', 'botao'], ['fim', 'acabar a partida', '']];
const ALVOS = { zona: ['zona'], botao: ['botao', 'interruptor'], cronometro: ['cronometro'], gol: ['gol'], portal: ['portal'], portao: ['portao'], solido: ['parede', 'arco', 'linha', 'obstaculo', 'portao'],
  qualquer: ['parede', 'arco', 'linha', 'obstaculo', 'portao', 'gol', 'zona', 'portal', 'botao', 'interruptor', 'decoracao', 'texto', 'marcacao', 'cronometro'] };
function opcoesAlvo(tipo) { const l = ALVOS[tipo] || []; return OFE.M.objetos.filter(o => l.indexOf(o.tipo) >= 0).map(o => [o.id, (o.nome || N_TIPO[o.tipo]) + ' · ' + o.id]); }
function painelLogica(c) {
  const M = OFE.M;
  poe(c, fTit('Lógica: QUANDO → ENTÃO', 'raio'), fNota('Sem programar: escolha o que acontece e o que o mapa faz. O servidor só roda as ações desta lista (no máximo ' + RM.LIM.regras + ' regras e ' + RM.LIM.acoes + ' ações por regra).'));
  const mudaR = (k, fn) => (v, f) => muda(M2 => { fn(M2.logica[k], v); }, f !== false);
  M.logica.forEach((r, k) => {
    const q = N_QUANDO.find(x => x[0] === r.quando.tipo) || N_QUANDO[0], caixa = h('div.ofi-regra' + (r.on ? '' : '.off'));
    poe(caixa, h('div.ofi-regra-topo', h('b', { texto: 'Regra ' + (k + 1) }), h('span.ofi-esp'),
      botao('', () => muda(M2 => { M2.logica[k].on = !M2.logica[k].on; }), 'ofi-ic-bt', r.on ? 'olho' : 'olhoNao', r.on ? 'Desligar a regra' : 'Ligar a regra'),
      botao('', () => muda(M2 => { if (M2.logica.length < RM.LIM.regras) M2.logica.splice(k + 1, 0, JSON.parse(JSON.stringify(Object.assign({}, M2.logica[k], { id: 'r' + Date.now().toString(36).slice(-5) })))); }), 'ofi-ic-bt', 'duplicar', 'Duplicar a regra'),
      botao('', () => muda(M2 => { M2.logica.splice(k, 1); }), 'ofi-ic-bt', 'lixo', 'Apagar a regra')));
    poe(caixa, h('div.ofi-regra-q', h('em', { texto: 'QUANDO' })), fSel('Acontece', r.quando.tipo, N_QUANDO.map(x => [x[0], x[1]]), mudaR(k, (x, v) => { x.quando.tipo = v; const nq = N_QUANDO.find(y => y[0] === v); if (nq[2] && !opcoesAlvo(nq[2]).some(o => o[0] === x.quando.alvo)) x.quando.alvo = (opcoesAlvo(nq[2])[0] || [''])[0]; })));
    if (q[2]) { const op = opcoesAlvo(q[2]); poe(caixa, op.length ? fSel('Qual', r.quando.alvo, op, mudaR(k, (x, v) => { x.quando.alvo = v; })) : fNota('Ponha um objeto desse tipo no mapa primeiro.')); }
    if (['tempo', 'a_cada'].indexOf(r.quando.tipo) >= 0) poe(caixa, fNum('Segundos', r.quando.seg, { min: 0, max: 1800, passo: 1, un: 's' }, mudaR(k, (x, v) => { x.quando.seg = v; })));
    if (r.quando.tipo === 'placar') poe(caixa, fNum('Pontos', r.quando.valor, { min: 0, max: 99, passo: 1 }, mudaR(k, (x, v) => { x.quando.valor = Math.round(v); })));
    if (['saida', 'jogador_entra', 'jogador_sai', 'gol', 'gol_no', 'placar', 'portal'].indexOf(r.quando.tipo) >= 0) poe(caixa, fSel('De qual time', r.quando.equipe, N_EQUIPE(M), mudaR(k, (x, v) => { x.quando.equipe = v; })));
    poe(caixa, h('div.ofi-regra-q', h('em', { texto: 'ENTÃO' })));
    r.entao.forEach((a, j) => {
      const na = N_ACAO.find(x => x[0] === a.acao) || N_ACAO[0], linha = h('div.ofi-acao');
      const mudaA = fn => (v, f) => muda(M2 => { fn(M2.logica[k].entao[j], v); }, f !== false);
      poe(linha, h('div.ofi-acao-topo', h('small', { texto: (j + 1) + '.' }), h('span.ofi-esp'), botao('', () => muda(M2 => { M2.logica[k].entao.splice(j, 1); if (!M2.logica[k].entao.length) M2.logica.splice(k, 1); }), 'ofi-ic-bt', 'fechar', 'Tirar a ação')),
        fSel('Faz', a.acao, N_ACAO.map(x => [x[0], x[1]]), mudaA((x, v) => { x.acao = v; const n2 = N_ACAO.find(y => y[0] === v); if (n2[2] && !opcoesAlvo(n2[2]).some(o => o[0] === x.alvo)) x.alvo = (opcoesAlvo(n2[2])[0] || [''])[0]; })));
      if (na[2]) { const op = opcoesAlvo(na[2]); poe(linha, op.length ? fSel('Em', a.alvo, op, mudaA((x, v) => { x.alvo = v; })) : fNota('Ponha um objeto desse tipo no mapa primeiro.')); }
      if (a.acao === 'mover') poe(linha, fNum('Anda em X', a.dx, { min: -200, max: 200, passo: 0.5, un: 'u' }, mudaA((x, v) => { x.dx = v; })), fNum('Anda em Y', a.dy, { min: -160, max: 160, passo: 0.5, un: 'u' }, mudaA((x, v) => { x.dy = v; })));
      if (a.acao === 'mover' || a.acao === 'voltar' || a.acao === 'mensagem') poe(linha, fNum(a.acao === 'mensagem' ? 'Fica na tela' : 'Em quanto tempo', a.seg, { min: 0, max: 60, passo: 0.5, un: 's' }, mudaA((x, v) => { x.seg = v; })));
      if (a.acao === 'cor' || a.acao === 'mensagem' || a.acao === 'efeito') poe(linha, fCor('Cor', a.cor, mudaA((x, v) => { x.cor = v; })));
      if (a.acao === 'mensagem') poe(linha, fTxt('Mensagem', a.texto, 48, mudaA((x, v) => { x.texto = v; })));
      if (a.acao === 'efeito') poe(linha, fSel('Efeito', a.efeito, [['confete', 'Confete'], ['flash', 'Clarão'], ['tremor', 'Tremor'], ['brilho', 'Brilho']], mudaA((x, v) => { x.efeito = v; })));
      if (a.acao === 'bola_vel') poe(linha, fNum('Multiplica a velocidade', a.fator, { min: 0, max: 3, passo: 0.05, un: '×' }, mudaA((x, v) => { x.fator = v; })));
      if (a.acao === 'pontos') poe(linha, fSel('Para', a.equipe, [[-2, 'Quem tocou por último']].concat(M.partida.times.map((t, i) => [i, t.nome])), mudaA((x, v) => { x.equipe = v; })), fNum('Pontos (negativo tira)', a.valor, { min: -10, max: 10, passo: 1 }, mudaA((x, v) => { x.valor = Math.round(v); })));
      poe(caixa, linha);
    });
    if (r.entao.length < RM.LIM.acoes) poe(caixa, fBotoes(botao('AÇÃO', () => muda(M2 => { M2.logica[k].entao.push({ acao: 'mensagem', texto: 'Valeu!', seg: 2, cor: '#ffd23f' }); }), 'escuro', 'adicionar')));
    poe(caixa, fNum('Espera antes de fazer', r.atraso, { min: 0, max: 60, passo: 0.5, un: 's' }, mudaR(k, (x, v) => { x.atraso = v; })),
      fSel('Repetição', r.repete, [['sempre', 'Sempre'], ['uma', 'Uma vez'], ['vezes', 'N vezes']], mudaR(k, (x, v) => { x.repete = v; })),
      r.repete === 'vezes' ? fNum('Quantas vezes', r.vezes, { min: 1, max: 99, passo: 1 }, mudaR(k, (x, v) => { x.vezes = Math.round(v); })) : null,
      fNum('Intervalo mínimo entre disparos', r.espera, { min: 0, max: 60, passo: 0.5, un: 's' }, mudaR(k, (x, v) => { x.espera = v; })));
    c.appendChild(caixa);
  });
  if (M.logica.length < RM.LIM.regras) poe(c, fBotoes(botao('NOVA REGRA', () => muda(M2 => { M2.logica.push({ id: 'r' + Date.now().toString(36).slice(-6), on: true, quando: { tipo: 'inicio' }, entao: [{ acao: 'mensagem', texto: 'Bora!', seg: 2, cor: '#ffd23f' }], atraso: 0, repete: 'sempre', espera: 0 }); }), 'ama', 'adicionar')));
  if (!M.logica.length) poe(c, fNota('Exemplos: QUANDO apertam o botão → ENTÃO abrir o portão · QUANDO a bola entra na zona → ENTÃO dar 2 pontos · QUANDO chega 60 s → ENTÃO mover a parede.'));
}

/* ---------------------------------------------------------------- CAMADAS */
// (o que, além dos objetos, cada camada de baixo esconde no editor: o cenário, o piso e as linhas do campo)
const BASE_CAMADA = { fundo: 'o cenário em volta', texturas: 'o piso', marcacoes: 'as linhas do campo' };
function painelCamadas(c) {
  const M = OFE.M, cm = M.camadas;
  poe(c, fTit('Camadas', 'camadas'), fNota('A de cima é desenhada por cima. Ocultar e bloquear valem no editor; a ordem vale também na partida.'));
  cm.slice().reverse().forEach((cam, jr) => {
    const j = cm.length - 1 - jr, n = M.objetos.filter(o => o.camada === cam.id).length, base = BASE_CAMADA[cam.id];
    c.appendChild(h('div.ofi-camada' + (cam.visivel ? '' : '.oculta'),
      h('b', { texto: N_CAMADA[cam.id] || cam.id }), h('small', { texto: (base ? base + ' + ' : '') + n + (n === 1 ? ' objeto' : ' objetos') }), h('span.ofi-esp'),
      botao('', () => muda(M2 => { M2.camadas[j].visivel = !M2.camadas[j].visivel; }), 'ofi-ic-bt' + (cam.visivel ? '' : ' on'), cam.visivel ? 'olho' : 'olhoNao', cam.visivel ? 'Ocultar no editor' : 'Mostrar'),
      botao('', () => muda(M2 => { M2.camadas[j].bloqueada = !M2.camadas[j].bloqueada; }), 'ofi-ic-bt' + (cam.bloqueada ? ' on' : ''), cam.bloqueada ? 'cadeado' : 'aberto', cam.bloqueada ? 'Desbloquear' : 'Bloquear'),
      botao('', () => { if (j < cm.length - 1) muda(M2 => { const l = M2.camadas; [l[j], l[j + 1]] = [l[j + 1], l[j]]; }); }, 'ofi-ic-bt', 'subir', 'Subir'),
      botao('', () => { if (j > 0) muda(M2 => { const l = M2.camadas; [l[j], l[j - 1]] = [l[j - 1], l[j]]; }); }, 'ofi-ic-bt', 'baixar', 'Descer'),
      botao('', () => { OFE.sel = new Set(M.objetos.filter(o => o.camada === cam.id && !o.bloqueado).map(o => o.id)); edEstado(); painelAtualiza(); OFE.sujo = true; }, 'ofi-ic-bt', 'multi', 'Selecionar os objetos da camada')));
  });
  const ocultos = M.objetos.filter(o => o.oculto || o.bloqueado);
  if (ocultos.length) {
    poe(c, fTit('Ocultos e bloqueados', 'olhoNao'));
    for (const o of ocultos) c.appendChild(h('div.ofi-camada', icone(IC_TIPO[o.tipo]), h('b', { texto: o.nome || N_TIPO[o.tipo] }), h('small', { texto: (o.oculto ? 'oculto ' : '') + (o.bloqueado ? 'bloqueado' : '') }), h('span.ofi-esp'),
      botao('MOSTRAR E SOLTAR', () => { muda(M2 => { const x = M2.objetos.find(y => y.id === o.id); x.oculto = false; x.bloqueado = false; }); OFE.sel = new Set([o.id]); edEstado(); painelAtualiza(); }, 'escuro')));
  }
}

/* ---------------------------------------------------------------- SPAWNS */
function painelSpawns(c) {
  const M = OFE.M, G = OFE.G, P = M.partida;
  poe(c, fTit('Onde cada um nasce', 'pino'), fNota('Sem spawn, o time nasce na formação das salas, do lado do gol dele. Com spawns, cada jogador nasce no seu (pela ordem).'));
  for (let t = 0; t < P.equipes; t++) {
    const l = M.objetos.filter(o => o.tipo === 'spawn' && o.equipe === t);
    c.appendChild(h('div.ofi-camada', h('i.ofi-bola-cor', { style: { background: P.times[t].cor } }), h('b', { texto: P.times[t].nome }), h('small', { texto: l.length + ' de ' + P.porTime }), h('span.ofi-esp'),
      botao('+ SPAWN', () => { const s = RM.spawnDe(RM.novaPartida(M, { porTime: P.porMax, jogadores: [] }), { time: t, k: l.length, r: 0 }); poeObjeto({ tipo: 'spawn', equipe: t, ordem: l.length, x: enc((s[0] - G.CX) / RN.PX_POR_U), y: enc((s[1] - G.CY) / RN.PX_POR_U) }); }, 'escuro')));
  }
  poe(c, fBotoes(botao('GERAR AUTOMÁTICO', () => geraSpawns(), 'ama', 'pino'), botao('TIRAR TODOS', () => muda(M2 => { M2.objetos = M2.objetos.filter(o => o.tipo !== 'spawn'); }), 'escuro', 'lixo')));
  const temBola = M.objetos.some(o => o.tipo === 'spawnBola');
  poe(c, fTit('A bola', 'bola'), fNota(temBola ? 'A bola começa no spawn da bola.' : 'Sem spawn da bola, ela começa no meio do campo.'),
    temBola ? null : fBotoes(botao('+ SPAWN DA BOLA', () => { const [x, y] = centroVisto(); poeObjeto({ tipo: 'spawnBola', x, y }); }, 'escuro', 'bola')));
  const ruins = G.spawnsTodos.filter(s => OFE.problemasObj.has(M.objetos[s.obj].id));
  if (ruins.length) poe(c, h('div.ofi-erro', icone('alerta'), h('span', { texto: ruins.length + ' ponto(s) de nascimento em lugar ruim (dentro de parede ou fora da área): estão marcados em vermelho.' })));
}
function geraSpawns() {                                // a formação das salas vira spawns (dá para arrastar depois)
  const M = OFE.M, G = OFE.G, P = M.partida;
  muda(M2 => {
    M2.objetos = M2.objetos.filter(o => o.tipo !== 'spawn');
    const semSpawn = Object.assign({}, M2, { objetos: M2.objetos.filter(o => o.tipo !== 'spawn') });
    const Pp = RM.novaPartida(RM.limpa(semSpawn).mapa || M2, { porTime: P.porTime, jogadores: [] });
    for (let t = 0; t < P.equipes; t++) for (let k = 0; k < P.porTime; k++) {
      const s = RM.spawnDe(Pp, { time: t, k, r: 0 });
      M2.objetos.push(RM.limpaObjeto({ id: novoId('spawn') + t + k, tipo: 'spawn', equipe: t, ordem: k, x: arred((s[0] - G.CX) / RN.PX_POR_U), y: arred((s[1] - G.CY) / RN.PX_POR_U) }));
    }
  });
  aviso('Spawns gerados pela formação. Arraste para ajustar.');
}

/* ---------------------------------------------------------------- VALIDAÇÃO */
function painelValidar(c) {
  const M = OFE.M, G = OFE.G, tam = JSON.stringify(M).length;
  poe(c, fTit('Validação', OFE.erros.length ? 'alerta' : 'check'));
  if (!OFE.erros.length && !OFE.avisos.length) poe(c, h('div.ofi-ok', icone('check'), h('span', { texto: 'Tudo certo: o mapa pode ser testado e publicado.' })));
  for (const e of OFE.erros) poe(c, h('div.ofi-erro', icone('alerta'), h('span', { texto: e })));
  for (const a of OFE.avisos) poe(c, h('div.ofi-avisoP', icone('alerta'), h('span', { texto: a })));
  if (OFE.problemasObj.size) poe(c, fBotoes(botao('SELECIONAR OS OBJETOS COM PROBLEMA', () => { OFE.sel = new Set(OFE.problemasObj); edEstado(); painelAtualiza(); OFE.sujo = true; }, 'escuro', 'cursor')));
  const barra = (rot, v, max) => h('div.ofi-medida', h('span', { texto: rot }), h('div.ofi-barra', h('i', { style: { width: Math.min(100, v / max * 100) + '%', background: v > max * .85 ? '#ff3b3b' : v > max * .6 ? '#ffc21a' : '#2fcf62' } })), h('small', { texto: v + ' / ' + max }));
  poe(c, fTit('Tamanho e peso', 'ajustar'), barra('Objetos', M.objetos.length, RM.LIM.objetos), barra('Peças que colidem', G ? G.nSeg : 0, RM.LIM.segmentos),
    barra('Regras', M.logica.length, RM.LIM.regras), barra('Tamanho (KB)', Math.round(tam / 1024), Math.round(RM.LIM.bytes / 1024)),
    fNota('Os limites garantem a partida lisa em celular intermediário e no servidor.'));
}

/* ---------------------------------------------------------------- A BIBLIOTECA */
const BIBLIOTECA = [
  ['Paredes', 'parede', [
    ['Parede reta', 'parede', { tipo: 'parede', comp: 12 }], ['Parede diagonal', 'parede', { tipo: 'parede', comp: 12, rot: 45 }], ['Parede curva', 'arco', { tipo: 'arco', raio: 8, abertura: 90 }],
    ['Parede circular', 'circulo', { tipo: 'arco', raio: 8, abertura: 360 }], ['Parede invisível', 'olhoNao', { tipo: 'parede', comp: 12, visivel: false, nome: 'invisível' }],
    ['Só a bola bate', 'bola', { tipo: 'parede', comp: 12, colide: 'bola', cor: '#9fd8ff', nome: 'só a bola' }], ['Só o jogador bate', 'pessoas', { tipo: 'parede', comp: 12, colide: 'jogadores', cor: '#ffb0d0', nome: 'só jogador' }],
    ['Barreira móvel', 'girar', { tipo: 'parede', comp: 10, esp: 1, mov: { tipo: 'vaivem', dx: 0, dy: 10, vel: 6 }, cor: '#ffd23f', nome: 'barreira móvel' }],
    ['Barreira temporária', 'relogio', { tipo: 'parede', comp: 10, esp: 1, temp: 10, cor: '#ff8a1c', nome: 'some em 10 s' }],
    ['Linha de pontos', 'linha', 'ferr:linha']]],
  ['Obstáculos', 'retangulo', [
    ['Quadrado', 'retangulo', { tipo: 'obstaculo', forma: 'retangulo', w: 4, h: 4 }], ['Retângulo', 'retangulo', { tipo: 'obstaculo', forma: 'retangulo', w: 8, h: 3 }],
    ['Triângulo', 'triangulo', { tipo: 'obstaculo', forma: 'triangulo', w: 5, h: 5 }], ['Círculo', 'circulo', { tipo: 'obstaculo', forma: 'circulo', w: 4, h: 4 }],
    ['Polígono (desenhar)', 'poligono', 'poli:obstaculo'], ['Giratório', 'girar', { tipo: 'obstaculo', forma: 'retangulo', w: 12, h: 1, mov: { tipo: 'girar', vel: 12 }, cor: '#ff5c3a', nome: 'giratório' }],
    ['Para-choque', 'estrela', { tipo: 'obstaculo', forma: 'circulo', w: 3.5, h: 3.5, quique: 1.15, cor: '#ff3df2', nome: 'para-choque' }]]],
  ['Gols', 'gol', [
    ['Gol do Time A', 'gol', { tipo: 'gol', dono: 0, rot: 180 }], ['Gol do Time B', 'gol', { tipo: 'gol', dono: 1 }], ['Gol do Time C', 'gol', { tipo: 'gol', dono: 2, rot: 270 }], ['Gol do Time D', 'gol', { tipo: 'gol', dono: 3, rot: 90 }],
    ['Gol neutro', 'gol', { tipo: 'gol', dono: -1, largura: 10, nome: 'gol neutro' }], ['Gol móvel', 'girar', { tipo: 'gol', dono: -1, largura: 10, mov: { tipo: 'vaivem', dx: 0, dy: 12, vel: 5 }, nome: 'gol móvel' }],
    ['Gol especial (×2)', 'estrela', { tipo: 'gol', dono: -1, largura: 6, pontos: 2, det: 'area', cor: '#ffd23f', nome: 'gol especial' }]]],
  ['Zonas', 'zona', [
    ['Aceleração', 'raio', { tipo: 'zona', efeito: 'velocidade', fator: 1.5, w: 10, h: 8, cor: '#14d4f0' }], ['Lentidão', 'zona', { tipo: 'zona', efeito: 'lentidao', fator: 0.5, w: 10, h: 8, cor: '#7d8aa8' }],
    ['Impulso (boost)', 'adicionar', { tipo: 'zona', efeito: 'impulso', forca: 60, w: 8, h: 6, cor: '#ffd23f' }], ['Gravidade', 'circulo', { tipo: 'zona', efeito: 'gravidade', forca: 40, centro: true, forma: 'circulo', w: 12, h: 12, cor: '#b197fc' }],
    ['Esteira', 'distH', { tipo: 'zona', efeito: 'esteira', forca: 6, w: 14, h: 5, cor: '#3cb44b' }], ['Plataforma móvel', 'girar', { tipo: 'zona', efeito: 'esteira', forca: 0, w: 8, h: 8, mov: { tipo: 'vaivem', dx: 14, dy: 0, vel: 4 }, cor: '#3cb44b', nome: 'plataforma' }],
    ['Rampa 2D', 'triangulo', { tipo: 'zona', efeito: 'rampa', forca: 25, w: 10, h: 8, cor: '#d86a38' }], ['Área de pontos', 'estrela', { tipo: 'zona', efeito: 'pontos', pontosZ: 1, w: 6, h: 6, cor: '#ffd23f' }],
    ['Zona de reinício', 'girar', { tipo: 'zona', efeito: 'reinicio', w: 8, h: 8, cor: '#56b4ff' }], ['Eliminação (lava)', 'fogo', { tipo: 'zona', efeito: 'elimina', afeta: 'jogadores', w: 10, h: 6, cor: '#ff3b3b' }],
    ['Zona livre (só lógica)', 'zona', { tipo: 'zona', efeito: 'nada', w: 8, h: 8, cor: '#ffffff' }], ['Zona desenhada', 'poligono', 'poli:zona']]],
  ['Interativos', 'botao', [
    ['Portal (par)', 'portal', 'portal'], ['Portão', 'portao', { tipo: 'portao', comp: 10 }], ['Portão automático', 'relogio', { tipo: 'portao', comp: 10, ciclo: 4, tempoAberto: 2, nome: 'portão automático' }],
    ['Botão', 'botao', { tipo: 'botao' }], ['Interruptor', 'botao', { tipo: 'interruptor' }], ['Cronômetro', 'relogio', { tipo: 'cronometro', seg: 30 }]]],
  ['Nascimento', 'pino', [
    ['Spawn do Time A', 'pino', { tipo: 'spawn', equipe: 0 }], ['Spawn do Time B', 'pino', { tipo: 'spawn', equipe: 1 }], ['Spawn do Time C', 'pino', { tipo: 'spawn', equipe: 2 }], ['Spawn do Time D', 'pino', { tipo: 'spawn', equipe: 3 }],
    ['Spawn da bola', 'bola', { tipo: 'spawnBola' }]]],
  ['Decoração', 'enfeite', [
    ...RM.ICONES_DECOR.map(k => [N_ICONE[k] || k, 'enfeite', { tipo: 'decoracao', forma: 'icone', icone: k, w: 3, h: 3 }]),
    ['Forma', 'retangulo', { tipo: 'decoracao', forma: 'retangulo', w: 6, h: 3 }], ['Forma desenhada', 'poligono', 'poli:decoracao'], ['Texto', 'texto', { tipo: 'texto', texto: 'RACHA' }],
    ['Marcação: linha', 'marca', { tipo: 'marcacao', forma: 'linha', w: 10 }], ['Marcação: círculo', 'circulo', { tipo: 'marcacao', forma: 'circulo', w: 8, h: 8 }], ['Marcação: arco', 'arco', { tipo: 'marcacao', forma: 'arco', w: 10, h: 10 }],
    ['Marcação: retângulo', 'retangulo', { tipo: 'marcacao', forma: 'retangulo', w: 10, h: 6 }], ['Marcação: ponto', 'circulo', { tipo: 'marcacao', forma: 'ponto' }]]],
];
function abreBiblioteca() {
  let aba = OFE.abaLib || 0;
  janela('Biblioteca', (c, ctx) => {
    const tabs = h('div.ofi-lib-abas'), grade = h('div.ofi-lib');
    const mostra = () => {
      for (const [k, b] of [...tabs.children].entries()) b.classList.toggle('on', k === aba);
      limpaFilhos(grade);
      for (const [nome, ic, cru] of BIBLIOTECA[aba][2]) grade.appendChild(h('button.ofi-lib-it', { type: 'button', title: nome, on: { click: () => { ctx.fecha(null); usaBiblioteca(cru); } } }, icone(ic), h('span', { texto: nome })));
    };
    BIBLIOTECA.forEach(([nome, ic], k) => tabs.appendChild(botao(nome, () => { aba = OFE.abaLib = k; mostra(); }, 'ofi-lib-aba', ic)));
    poe(c, tabs, grade); mostra();
  }, [], 'ofi-jan-lib');
}
function usaBiblioteca(cru) {
  if (typeof cru === 'string') {
    if (cru.startsWith('ferr:')) return escolheFerr(cru.slice(5));
    if (cru.startsWith('poli:')) { OFE.destinoPoli = cru.slice(5); return escolheFerr('poli'); }
    if (cru === 'portal') {                          // o par de portais já ligado
      const [x, y] = centroVisto(), a = novoId('portal');
      const p1 = poeObjeto({ id: a, tipo: 'portal', x: enc(x - 8), y, par: '', cor: '#b197fc' }, false); if (!p1) return;
      const p2 = poeObjeto({ tipo: 'portal', x: enc(x + 8), y, par: p1.id, cor: '#ffb84d' }, false); if (!p2) return;
      muda(M => { M.objetos.find(o => o.id === p1.id).par = p2.id; });
      OFE.sel = new Set([p1.id, p2.id]); edEstado(); painelAtualiza(); aviso('Dois portais ligados: arraste cada um para o lugar.');
      return;
    }
  }
  const [x, y] = centroVisto(), o = Object.assign(JSON.parse(JSON.stringify(cru)), { x: cru.x != null ? cru.x : x, y: cru.y != null ? cru.y : y });
  if (o.tipo === 'gol' && !o.largura) o.largura = OFE.M.campo.h > 60 ? 20 : 14;
  if (o.tipo === 'spawn') o.ordem = OFE.M.objetos.filter(s => s.tipo === 'spawn' && s.equipe === o.equipe).length;
  if (o.tipo === 'spawnBola' && OFE.M.objetos.some(s => s.tipo === 'spawnBola')) { const sb = OFE.M.objetos.find(s => s.tipo === 'spawnBola'); OFE.sel = new Set([sb.id]); edEstado(); painelAtualiza(); return aviso('O mapa já tem o spawn da bola: ele está selecionado.'); }
  if ((o.tipo === 'gol' || o.tipo === 'spawn') && o.dono >= OFE.M.partida.equipes) aviso('Esse time não existe no mapa ainda: aumente o número de times em Partida.');
  poeObjeto(o);
  escolheFerr('sel');
}
