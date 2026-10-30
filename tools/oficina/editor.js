/* =====================================================================================================================
   RACHA v92 · OFICINA — O EDITOR (tools/oficina/editor.js): a tela, a câmera, a seleção, as alças, as ferramentas,
   desfazer/refazer, o salvamento automático e a recuperação. Os painéis (propriedades, campo, aparência, física,
   partida, lógica, camadas, spawns, validação, biblioteca) moram em tools/oficina/paineis.js.
   Toque: um dedo seleciona e arrasta (ou desenha, com a ferramenta), dois dedos dão zoom e mexem a câmera, segurar um
   objeto soma ele à seleção. Mouse: a roda dá zoom, o botão do meio (ou o espaço) arrasta a câmera, Shift soma à seleção.
   ===================================================================================================================== */
const OFE = {
  aberto: false, reg: null, M: null, G: null, erros: [], avisos: [], sel: new Set(), ferr: 'sel', multi: false,
  grade: true, encaixa: true, passo: 0.5, cam: { x: 0, y: 0, z: 0.4 }, undo: [], redo: [], sujo: false, pend: null,
  salvoEm: 0, mudou: false, ptrs: new Map(), arr: null, desenho: null, painelAberto: true, aba: 'campo', clipe: null,
  dpr: 1, w: 0, h: 0, base: null, rev: 0, revBase: -1, autoT: 0, versaoT: 0, problemasObj: new Set(),
};
const MAX_UNDO = 120;

/* ---------------------------------------------------------------- o mapa, a validação e a revisão */
function recompila() {                               // o mapa de trabalho passa pela limpeza (os números nos limites) e vira geometria
  const r = RM.limpa(OFE.M);
  if (r.mapa) { OFE.M = r.mapa; }
  OFE.erros = r.ok ? [] : (r.erros || []); OFE.avisos = r.avisos || [];
  try { OFE.G = RM.compila(OFE.M); } catch (e) { console.error('Oficina (compilar):', e); }
  OFE.problemasObj = objetosComProblema();
  OFE.rev++; OFE.sujo = true;
  for (const id of [...OFE.sel]) if (!OFE.M.objetos.some(o => o.id === id)) OFE.sel.delete(id);
  try { painelAtualiza(); } catch (e) { console.error('Oficina (painel):', e); }
  return r;
}
function objetosComProblema() {                       // os objetos que o aviso aponta (o spawn dentro da parede, o portal sem par…)
  const s = new Set(), G = OFE.G, M = OFE.M; if (!G) return s;
  for (const p of G.portais) if (p.par < 0) s.add(p.id);
  for (const sp of G.spawnsTodos) if (RM.__interno.dentroDeSolido(G, sp.x, sp.y, G.C.R_JOG * 0.9, 2) || sp.x < G.GL || sp.x > G.GR || sp.y < G.GT || sp.y > G.GB) s.add(M.objetos[sp.obj].id);
  if (G.bola0.obj >= 0 && (RM.__interno.dentroDeSolido(G, G.bola0.x, G.bola0.y, G.C.R_BOLA * 0.9, 1) || G.bola0.x < G.GL || G.bola0.x > G.GR)) s.add(M.objetos[G.bola0.obj].id);
  return s;
}
// toda mudança passa por aqui: a foto para o desfazer (uma por gesto), a mudança e, no fim do gesto, a limpeza
function muda(fn, final) {
  if (!OFE.pend) { OFE.pend = JSON.stringify(OFE.M); }
  fn(OFE.M);
  OFE.sujo = true;
  if (final !== false) confirmaMuda();
}
function confirmaMuda() {
  if (!OFE.pend) return;
  const antes = OFE.pend; OFE.pend = null;
  const r = recompila();
  if (JSON.stringify(OFE.M) === antes) return r;      // (nada mudou de verdade)
  OFE.undo.push(antes); if (OFE.undo.length > MAX_UNDO) OFE.undo.shift();
  OFE.redo.length = 0;
  marcaMudanca();
  return r;
}
function desfaz() { if (OFE.pend) confirmaMuda(); const a = OFE.undo.pop(); if (!a) return aviso('Nada para desfazer.'); OFE.redo.push(JSON.stringify(OFE.M)); OFE.M = JSON.parse(a); recompila(); marcaMudanca(); }
function refaz() { const a = OFE.redo.pop(); if (!a) return aviso('Nada para refazer.'); OFE.undo.push(JSON.stringify(OFE.M)); OFE.M = JSON.parse(a); recompila(); marcaMudanca(); }
function marcaMudanca() {
  OFE.mudou = true; edEstado();
  clearTimeout(OFE.autoT); OFE.autoT = setTimeout(() => salvaRascunho(true), 2500);   // o salvamento automático
  clearTimeout(OFE.recT); OFE.recT = setTimeout(() => {                                // a recuperação (se o aparelho travar)
    if (OFE.reg) GAVETA.poe('recupera', { id: 'sessao', mapa: OFE.reg.id, t: Date.now(), dados: OFE.M }).catch(() => {});
  }, 600);
}
async function salvaRascunho(auto, nota) {
  if (!OFE.reg || !OFE.M) return false;
  if (auto && !OFE.aberto) return false;              // (o automático que ficou para depois de sair do editor não grava por cima do que mudou na central)
  if (OFE.pend) confirmaMuda();
  clearTimeout(OFE.autoT);
  const reg = OFE.reg, agora = Date.now();
  reg.mapa = JSON.parse(JSON.stringify(OFE.M)); reg.nome = OFE.M.nome; reg.editado = agora; reg.sujo = !!reg.remoto || reg.sujo;
  if (reg.remoto) reg.sujo = true;
  if (!auto || agora - (reg.thumbT || 0) > 30000) { reg.thumb = DES.miniatura(OFE.M, 160, 90); reg.thumbT = agora; }
  try {
    await GAVETA.poe('mapas', reg);
    if (!auto || agora - OFE.versaoT > 120000) { await GAVETA.novaVersao(reg.id, OFE.M, nota || (auto ? 'automático' : 'salvo'), auto); OFE.versaoT = agora; }
    await GAVETA.tira('recupera', 'sessao').catch(() => {});
    OFE.mudou = false; OFE.salvoEm = agora; edEstado();
    if (!auto) aviso('Mapa salvo no aparelho.');
    return true;
  } catch (e) { console.error('Oficina (salvar):', e); aviso('Não deu para salvar no aparelho (espaço cheio?). Publique o mapa (pode ser como privado) para não perder.', 'erro'); return false; }
}

/* ---------------------------------------------------------------- abrir e fechar o editor */
async function editorAbre(reg) {                     // reg = o rascunho do aparelho (GAVETA 'mapas')
  // (o editor ainda aberto com outro rascunho mudado — abrir outro por cima, a cópia do DUPLICAR: salva antes; e nenhum relógio do outro sobra)
  if (OFE.aberto && OFE.mudou && OFE.reg && OFE.reg.id !== reg.id) { try { await salvaRascunho(true); } catch (_) {} }
  clearTimeout(OFE.autoT); clearTimeout(OFE.recT);
  OFE.reg = reg; OFE.M = JSON.parse(JSON.stringify(reg.mapa)); OFE.undo = []; OFE.redo = []; OFE.sel.clear(); OFE.pend = null;
  OFE.ferr = 'sel'; OFE.desenho = null; OFE.arr = null; OFE.lanca = null; OFE.mudou = false; OFE.salvoEm = reg.editado || 0; OFE.versaoT = Date.now();
  OFE.aba = 'campo'; OFP.chave = '';                  // (v95: o painel de outro mapa não deixa a rolagem)
  OFI.mostra('editor');
  recompila();
  // a recuperação: o editor fechou sem salvar (o aparelho travou, a aba fechou)?
  try {
    const rec = await GAVETA.pega('recupera', 'sessao');
    if (rec && rec.mapa === reg.id && recuperaVale(rec, reg)) {
      const sim = await confirma('Recuperar alterações?', 'Este mapa tem alterações de ' + quando(rec.t) + ' que não foram salvas (o editor fechou antes). Quer recuperar?', 'RECUPERAR');
      if (sim) { OFE.undo.push(JSON.stringify(OFE.M)); OFE.M = rec.dados; recompila(); marcaMudanca(); aviso('Alterações recuperadas.'); }
      else await GAVETA.tira('recupera', 'sessao');
    }
  } catch (_) {}
  requestAnimationFrame(() => { edTamanho(); edAjusta(); });
}
async function editorSai() {
  if (OFE.pend) confirmaMuda();
  if (OFE.mudou) await salvaRascunho(true);
  clearTimeout(OFE.autoT); clearTimeout(OFE.recT);    // (o salvamento automático e a recuperação são da sessão que acabou)
  OFE.aberto = false;
  OFI.mostra('hub', { aba: 'meus' });
}
OFE.fechaJa = function () { if (OFE.mudou && OFE.reg) salvaRascunho(true); clearTimeout(OFE.autoT); clearTimeout(OFE.recT); OFE.aberto = false; };

/* ---------------------------------------------------------------- a tela do editor */
const EDU = {};                                       // os pedaços da tela (preenchidos no monta)
OFI.telas.editor = {
  monta() {
    const el = h('div.ofi-tela.ofi-ed', { tabIndex: -1 });
    // a barra de cima: voltar, o nome, desfazer, refazer, salvar, testar e o resto
    EDU.nome = botao('', () => renomeia(), 'ofi-ed-nome', null, 'Renomear o mapa');
    EDU.estado = h('span.ofi-ed-estado');
    EDU.desfaz = botao('', desfaz, 'ofi-ic-bt', 'desfazer', 'Desfazer (Ctrl+Z)');
    EDU.refaz = botao('', refaz, 'ofi-ic-bt', 'refazer', 'Refazer (Ctrl+Y)');
    el.appendChild(h('div.ofi-ed-topo',
      botao('', () => editorSai(), 'ofi-voltar', 'voltar', 'Voltar'), EDU.nome, EDU.estado, h('span.ofi-esp'),
      EDU.desfaz, EDU.refaz, botao('', () => salvaRascunho(false), 'ofi-ic-bt', 'salvar', 'Salvar (Ctrl+S)'),
      botao('TESTAR', () => edTestar(), 'ama ofi-ed-testar', 'play', 'Testar o mapa agora'),
      botao('', e => menuMais(e.currentTarget), 'ofi-ic-bt', 'mais', 'Mais: publicar, criar sala, versões…')));
    // as ferramentas (esquerda)
    EDU.ferr = h('div.ofi-ed-ferr', { role: 'toolbar', 'aria-label': 'Ferramentas' });
    for (const [id, ic, t] of FERRAMENTAS) EDU.ferr.appendChild(comDados(botao('', () => escolheFerr(id), 'ofi-ferr', ic, t), { f: id }));
    EDU.ferr.appendChild(h('span.ofi-esp'));
    EDU.ferr.appendChild(botao('', () => abreBiblioteca(), 'ofi-ferr ofi-ferr-lib', 'adicionar', 'Biblioteca de objetos'));
    // a tela (o canvas) e o recado da ferramenta
    EDU.cv = h('canvas.ofi-ed-cv', { 'aria-label': 'O mapa (toque para selecionar, dois dedos para zoom)' });
    EDU.dica = h('div.ofi-ed-dica', { hidden: true });
    EDU.tela = h('div.ofi-ed-tela', EDU.cv, EDU.dica);
    // o painel (direita)
    EDU.painel = h('div.ofi-ed-painel');
    EDU.meio = h('div.ofi-ed-meio', EDU.ferr, EDU.tela, EDU.painel);
    el.appendChild(EDU.meio);
    // a barra de baixo
    EDU.zoomTx = h('span.ofi-zoom-tx', { texto: '100%' });
    EDU.btGrade = botao('', () => { OFE.grade = !OFE.grade; edEstado(); OFE.sujo = true; }, 'ofi-ic-bt', 'grade', 'Grade');
    EDU.btIma = botao('', () => { OFE.encaixa = !OFE.encaixa; edEstado(); aviso(OFE.encaixa ? 'Encaixar: ligado (a grade de ' + String(OFE.passo).replace('.', ',') + ' u e as guias de alinhamento)' : 'Encaixar: desligado (sem grade e sem guias)'); }, 'ofi-ic-bt', 'ima', 'Encaixar na grade e nas guias');
    EDU.btMulti = botao('', () => { OFE.multi = !OFE.multi; edEstado(); aviso(OFE.multi ? 'Seleção múltipla: toque nos objetos para juntar' : 'Seleção múltipla desligada'); }, 'ofi-ic-bt', 'multi', 'Seleção múltipla');
    EDU.btPainel = botao('', () => { OFE.painelAberto = !OFE.painelAberto; edEstado(); requestAnimationFrame(() => { edTamanho(); }); }, 'ofi-ic-bt', 'painel', 'Mostrar/esconder o painel');
    EDU.selBar = h('div.ofi-ed-selbar');
    el.appendChild(h('div.ofi-ed-base',
      botao('BIBLIOTECA', () => abreBiblioteca(), 'ofi-ed-lib', 'adicionar'), EDU.btGrade, EDU.btIma, EDU.btMulti,
      botao('', () => zoomEm(1 / 1.25), 'ofi-ic-bt', 'zoomMenos', 'Menos zoom'), EDU.zoomTx, botao('', () => zoomEm(1.25), 'ofi-ic-bt', 'zoomMais', 'Mais zoom'),
      botao('', () => edAjusta(), 'ofi-ic-bt', 'ajustar', 'Ver o mapa inteiro'), botao('', () => { OFE.painelAberto = true; OFE.sel.clear(); OFE.aba = 'camadas'; edEstado(); painelAtualiza(); }, 'ofi-ic-bt', 'camadas', 'Camadas'),
      EDU.selBar, h('span.ofi-esp'), EDU.btPainel));
    edEventos(el);
    return el;
  },
  abre() { OFE.aberto = true; edEstado(); setTimeout(() => { edTamanho(); }, 0); laco(); },
  volta() { if (OFE.desenho) return cancelaDesenho(); if (OFE.sel.size) { OFE.sel.clear(); edEstado(); painelAtualiza(); OFE.sujo = true; return; } editorSai(); },
};
const FERRAMENTAS = [['sel', 'cursor', 'Selecionar e mover (V)'], ['mao', 'mao', 'Arrastar a câmera (H)'], ['parede', 'parede', 'Parede reta: arraste (W)'],
  ['arco', 'arco', 'Parede curva: arraste do centro (A)'], ['ret', 'retangulo', 'Obstáculo retangular: arraste (R)'], ['circ', 'circulo', 'Obstáculo redondo: arraste (C)'],
  ['zona', 'zona', 'Zona: arraste (Z)'], ['linha', 'linha', 'Linha de pontos: toque ponto a ponto (L)'], ['poli', 'poligono', 'Polígono: toque ponto a ponto (P)'],
  ['bola', 'chutar', 'Lançar a bola: arraste para onde ela vai (B)']];
function escolheFerr(id) {
  if (OFE.desenho && id !== OFE.ferr) cancelaDesenho();
  if (id !== 'bola') lancaPara();                    // (a bola de teste some quando troca de ferramenta)
  OFE.ferr = id; edEstado();
  const dicas = { parede: 'Arraste para desenhar a parede.', arco: 'Arraste do centro para fora: o raio da curva.', ret: 'Arraste para desenhar o obstáculo.', circ: 'Arraste do centro para fora.', zona: 'Arraste para desenhar a zona.',
    linha: 'Toque ponto a ponto. Toque em CONCLUIR quando acabar.', poli: 'Toque ponto a ponto. Toque no primeiro ponto (ou em CONCLUIR) para fechar.', mao: 'Arraste para mexer a câmera.',
    bola: 'Arraste para onde a bola vai (mais longe, mais forte): a linha mostra o caminho; solte para chutar.' };
  if (dicas[id]) aviso(dicas[id]);
}
function edEstado() {                                  // os botões acesos, o nome, o "salvo há…", o zoom, a barra da seleção
  if (!EDU.nome) return;
  EDU.nome.textContent = OFE.M ? OFE.M.nome : '';
  EDU.estado.textContent = OFE.mudou ? 'alterado' : OFE.salvoEm ? 'salvo ' + quando(OFE.salvoEm) : '';
  EDU.estado.classList.toggle('alterado', OFE.mudou);
  EDU.desfaz.disabled = !OFE.undo.length && !OFE.pend; EDU.refaz.disabled = !OFE.redo.length;
  for (const b of EDU.ferr.querySelectorAll('[data-f]')) b.classList.toggle('on', b.dataset.f === OFE.ferr);
  EDU.btGrade.classList.toggle('on', OFE.grade); EDU.btIma.classList.toggle('on', OFE.encaixa); EDU.btMulti.classList.toggle('on', OFE.multi);
  EDU.btPainel.classList.toggle('on', OFE.painelAberto);
  EDU.painel.hidden = !OFE.painelAberto; EDU.meio.classList.toggle('sem-painel', !OFE.painelAberto);
  EDU.zoomTx.textContent = Math.round(OFE.cam.z * 100 / 0.4) + '%';
  montaSelBar();
  const d = OFE.desenho;
  EDU.dica.hidden = !d;
  if (d) {
    limpaFilhos(EDU.dica);
    poe(EDU.dica, h('span', { texto: d.pts.length + (d.pts.length === 1 ? ' ponto' : ' pontos') + ' · ' + (d.tipo === 'poli' ? 'feche no primeiro ponto' : 'toque para pôr mais') }),
      botao('DESFAZER PONTO', () => { d.pts.pop(); OFE.sujo = true; edEstado(); }, 'escuro'), botao('CANCELAR', cancelaDesenho, 'escuro'),
      botao('CONCLUIR', concluiDesenho, 'ama', 'check'));
  }
}
function montaSelBar() {                               // os botões da seleção (aparecem quando tem algo selecionado)
  const b = EDU.selBar; limpaFilhos(b);
  const n = OFE.sel.size; b.hidden = !n; if (!n) return;
  const L = [['duplicar', 'Duplicar (Ctrl+D)', duplica], ['lixo', 'Excluir (Del)', exclui], ['copiar', 'Copiar (Ctrl+C)', copia], ['girar', 'Girar 15°', () => gira(15)],
    ['espelhaH', 'Espelhar na horizontal', () => espelha('h')], ['espelhaV', 'Espelhar na vertical', () => espelha('v')],
    ['ladoOposto', 'Copiar para o outro lado (times trocados)', copiaOutroLado], ['repetir', 'Repetir em fila ou em círculo', repeteDialogo],
    ['frente', 'Trazer para a frente', () => ordem(1)], ['tras', 'Mandar para trás', () => ordem(-1)]];
  if (n > 1) L.push(['agrupar', 'Agrupar (G)', agrupa], ['alinhaE', 'Alinhar à esquerda', () => alinha('e')], ['alinhaC', 'Centralizar na horizontal', () => alinha('c')], ['alinhaD', 'Alinhar à direita', () => alinha('d')],
    ['alinhaT', 'Alinhar em cima', () => alinha('t')], ['alinhaM', 'Centralizar na vertical', () => alinha('m')], ['alinhaB', 'Alinhar embaixo', () => alinha('b')]);
  if (n > 2) L.push(['distH', 'Distribuir na horizontal', () => distribui('h')], ['distV', 'Distribuir na vertical', () => distribui('v')]);
  if (selObjs().some(o => o.grupo)) L.push(['desagrupar', 'Desagrupar', desagrupa]);
  L.push([selObjs().every(o => o.bloqueado) ? 'aberto' : 'cadeado', 'Bloquear/desbloquear', bloqueia], [selObjs().every(o => o.oculto) ? 'olho' : 'olhoNao', 'Ocultar/mostrar no editor', oculta]);
  for (const [ic, t, f] of L) b.appendChild(botao('', f, 'ofi-ic-bt', ic, t));
}
if (OFE.clipe === null) { try { const c = sessionStorage.getItem('racha-oficina-clipe'); if (c) OFE.clipe = JSON.parse(c); } catch (_) {} }

/* ---------------------------------------------------------------- a câmera e o tamanho */
function edTamanho() {
  if (!EDU.cv || !EDU.tela) return;
  const r = EDU.tela.getBoundingClientRect(), dpr = Math.min(2.5, window.devicePixelRatio || 1);
  OFE.w = Math.max(1, r.width); OFE.h = Math.max(1, r.height); OFE.dpr = dpr;
  EDU.cv.width = Math.round(OFE.w * dpr); EDU.cv.height = Math.round(OFE.h * dpr);
  EDU.cv.style.width = OFE.w + 'px'; EDU.cv.style.height = OFE.h + 'px';
  OFE.sujo = true;
}
function painelCobre() {                              // (no celular o painel fica por cima da tela: a parte coberta não conta)
  const p = EDU.painel; if (!p || p.hidden) return 0;
  try { return getComputedStyle(p).position === 'absolute' ? p.getBoundingClientRect().width : 0; } catch (_) { return 0; }
}
function edAjusta() {                                 // o mapa inteiro na tela (na parte que o painel não cobre)
  const G = OFE.G; if (!G || !OFE.w) return;
  const pw = painelCobre(), pad = 24, bw = G.GR - G.GL + U(6), bh = G.GB - G.GT + U(6), aw = Math.max(120, OFE.w - pw);
  OFE.cam.z = clamp(Math.min((aw - pad * 2) / bw, (OFE.h - pad * 2) / bh), 0.05, 4);
  OFE.cam.x = G.CX + pw / 2 / OFE.cam.z; OFE.cam.y = G.CY; OFE.sujo = true; edEstado();
}
function zoomEm(f, sx, sy) {                          // zoom com o ponto (sx, sy) da tela parado
  const c = OFE.cam, z1 = clamp(c.z * f, 0.04, 6);
  if (sx == null) { sx = OFE.w / 2; sy = OFE.h / 2; }
  const wx = c.x + (sx - OFE.w / 2) / c.z, wy = c.y + (sy - OFE.h / 2) / c.z;
  c.z = z1; c.x = wx - (sx - OFE.w / 2) / z1; c.y = wy - (sy - OFE.h / 2) / z1;
  OFE.sujo = true; edEstado();
}
const telaParaMundo = (sx, sy) => [OFE.cam.x + (sx - OFE.w / 2) / OFE.cam.z, OFE.cam.y + (sy - OFE.h / 2) / OFE.cam.z];
const mundoParaTela = (wx, wy) => [(wx - OFE.cam.x) * OFE.cam.z + OFE.w / 2, (wy - OFE.cam.y) * OFE.cam.z + OFE.h / 2];
const mundoParaU = (wx, wy) => [(wx - OFE.G.CX) / RN.PX_POR_U, (wy - OFE.G.CY) / RN.PX_POR_U];
const uParaMundo = (x, y) => [OFE.G.CX + U(x), OFE.G.CY + U(y)];
const enc = v => OFE.encaixa ? Math.round(v / OFE.passo) * OFE.passo : arred(v, 100);
const encAng = a => OFE.encaixa ? Math.round(a / 15) * 15 : Math.round(a);

/* ---------------------------------------------------------------- a geometria dos objetos (o contorno local, a caixa, o toque) */
function contornoLocal(o) {                            // os pontos do contorno do objeto (u, no referencial dele, sem o giro)
  switch (o.tipo) {
    case 'parede': case 'portao': { const a = o.comp / 2, b = Math.max(o.esp, 0.5) / 2; return [[-a, -b], [a, -b], [a, b], [-a, b]]; }
    case 'arco': { const n = 16, out = [], a0 = -o.abertura / 2 * RAD, da = o.abertura * RAD / n, R1 = o.raio + o.esp / 2, R0 = Math.max(0, o.raio - o.esp / 2); for (let i = 0; i <= n; i++) out.push([Math.cos(a0 + da * i) * R1, Math.sin(a0 + da * i) * R1]); for (let i = n; i >= 0; i--) out.push([Math.cos(a0 + da * i) * R0, Math.sin(a0 + da * i) * R0]); return out; }
    case 'linha': return o.pontos.map(p => [p[0], p[1]]);
    case 'obstaculo': case 'decoracao': case 'zona': return o.forma === 'icone' ? RM.poligonoDaForma('retangulo', o.w, o.h) : RM.poligonoDaForma(o.forma, o.w, o.h, o.pontos);
    case 'marcacao': return o.forma === 'linha' ? [[-o.w / 2, -o.esp], [o.w / 2, -o.esp], [o.w / 2, o.esp], [-o.w / 2, o.esp]] : RM.poligonoDaForma(o.forma === 'retangulo' ? 'retangulo' : 'circulo', o.forma === 'ponto' ? 1 : o.w, o.forma === 'ponto' ? 1 : o.h);
    case 'gol': return [[0, -o.largura / 2 - o.raioTrave], [o.prof, -o.largura / 2 - o.raioTrave], [o.prof, o.largura / 2 + o.raioTrave], [0, o.largura / 2 + o.raioTrave]];
    case 'portal': case 'botao': case 'interruptor': return RM.poligonoDaForma('circulo', o.raio * 2, o.raio * 2);
    case 'texto': { const L = Math.max(1, Array.from(o.texto).length) * o.tam * 0.32, A = o.tam * 0.6; return [[-L, -A], [L, -A], [L, A], [-L, A]]; }
    case 'spawn': return RM.poligonoDaForma('circulo', 4, 4);
    case 'cronometro': return RM.poligonoDaForma('circulo', 3.2, 3.2);
    default: return RM.poligonoDaForma('circulo', 2, 2);
  }
}
function contornoMundo(o) {                            // o contorno em px do mundo (com o giro)
  const c = Math.cos(o.rot * RAD), s = Math.sin(o.rot * RAD), G = OFE.G;
  return contornoLocal(o).map(p => [G.CX + U(o.x + p[0] * c - p[1] * s), G.CY + U(o.y + p[0] * s + p[1] * c)]);
}
function caixaObj(o) { const pts = contornoMundo(o); let x0 = 1e18, y0 = 1e18, x1 = -1e18, y1 = -1e18; for (const p of pts) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); } return [x0, y0, x1, y1]; }
function caixaSel() { let b = null; for (const o of selObjs()) { const c = caixaObj(o); b = b ? [Math.min(b[0], c[0]), Math.min(b[1], c[1]), Math.max(b[2], c[2]), Math.max(b[3], c[3])] : c; } return b; }
const selObjs = () => OFE.M ? OFE.M.objetos.filter(o => OFE.sel.has(o.id)) : [];
const porId = id => OFE.M.objetos.find(o => o.id === id);
function tocaObjeto(o, wx, wy, tol) {                  // o ponto (px do mundo) está no objeto? (tol em px do mundo)
  const G = OFE.G, c = Math.cos(-o.rot * RAD), s = Math.sin(-o.rot * RAD), dx = (wx - G.CX) / RN.PX_POR_U - o.x, dy = (wy - G.CY) / RN.PX_POR_U - o.y;
  const lx = dx * c - dy * s, ly = dx * s + dy * c, t = tol / RN.PX_POR_U;
  switch (o.tipo) {
    case 'linha': { for (let i = 0; i < o.pontos.length - 1 + (o.fechada ? 1 : 0); i++) { const a = o.pontos[i], b = o.pontos[(i + 1) % o.pontos.length]; if (RM.distSeg(lx, ly, a[0], a[1], b[0], b[1]) <= o.esp / 2 + t) return true; } return false; }
    case 'arco': { const d = Math.hypot(lx, ly), a = Math.abs(Math.atan2(ly, lx)) / RAD; return Math.abs(d - o.raio) <= o.esp / 2 + t && a <= o.abertura / 2 + 4; }
    case 'parede': case 'portao': return Math.abs(lx) <= o.comp / 2 + t && Math.abs(ly) <= Math.max(o.esp, 0.5) / 2 + t;
  }
  const pts = contornoLocal(o);
  if (RM.pontoNoPoligono(lx, ly, pts)) return true;
  for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; if (RM.distSeg(lx, ly, a[0], a[1], b[0], b[1]) <= t) return true; }
  return false;
}
function objetoNoPonto(wx, wy) {                       // o de cima primeiro (a ordem do desenho), sem os bloqueados e os ocultos
  const cm = camadasDoMapa(OFE.M), l = objetosEmOrdem(OFE.M).reverse(), tol = 10 / OFE.cam.z;
  for (const { o } of l) {
    if (o.bloqueado || o.oculto || cm.vis.get(o.camada) === false || cm.bloq.get(o.camada)) continue;
    if (tocaObjeto(o, wx, wy, tol)) return o;
  }
  return null;
}
function selecionaComGrupo(o, soma) {
  const ids = o.grupo ? OFE.M.objetos.filter(x => x.grupo === o.grupo).map(x => x.id) : [o.id];
  if (!soma) OFE.sel.clear();
  if (soma && ids.every(id => OFE.sel.has(id))) ids.forEach(id => OFE.sel.delete(id)); else ids.forEach(id => OFE.sel.add(id));
}

/* ---------------------------------------------------------------- as alças (mudar o tamanho, girar, os pontos) */
function alcas() {                                    // [{tipo, x, y (tela), ...}] para a seleção de agora
  const L = [], objs = selObjs(); if (!objs.length || OFE.desenho) return L;
  const G = OFE.G;
  if (objs.length > 1 || objs[0].bloqueado) {
    if (objs.some(o => o.bloqueado)) return L;
    const b = caixaSel(), c = mundoParaTela((b[0] + b[2]) / 2, b[1]);
    L.push({ tipo: 'girarG', x: c[0], y: c[1] - 34 });
    return L;
  }
  const o = objs[0], cs = Math.cos(o.rot * RAD), sn = Math.sin(o.rot * RAD);
  const P = (lx, ly) => mundoParaTela(G.CX + U(o.x + lx * cs - ly * sn), G.CY + U(o.y + lx * sn + ly * cs));
  const pts = contornoLocal(o), topo = pts.reduce((m, p) => Math.min(m, p[1]), 0);
  const gira = ['spawn', 'spawnBola', 'cronometro'].indexOf(o.tipo) < 0;
  if (gira) { const a = P(0, topo), cc = P(0, 0), dx = a[0] - cc[0], dy = a[1] - cc[1], d = Math.hypot(dx, dy) || 1; L.push({ tipo: 'girar', x: a[0] + dx / d * 30, y: a[1] + dy / d * 30 }); }
  switch (o.tipo) {
    case 'parede': case 'portao': { const a = P(-o.comp / 2, 0), b = P(o.comp / 2, 0); L.push({ tipo: 'ponta', lado: -1, x: a[0], y: a[1] }, { tipo: 'ponta', lado: 1, x: b[0], y: b[1] }); break; }
    case 'arco': { const r = P(o.raio, 0); L.push({ tipo: 'raio', x: r[0], y: r[1] }); const a = o.abertura / 2 * RAD, e = P(Math.cos(a) * o.raio, Math.sin(a) * o.raio); L.push({ tipo: 'abertura', x: e[0], y: e[1] }); break; }
    case 'linha': o.pontos.forEach((p, k) => { const t = P(p[0], p[1]); L.push({ tipo: 'vert', k, x: t[0], y: t[1] }); });
      for (let k = 0; k < o.pontos.length - 1 + (o.fechada ? 1 : 0); k++) { const a = o.pontos[k], b = o.pontos[(k + 1) % o.pontos.length], t = P((a[0] + b[0]) / 2, (a[1] + b[1]) / 2); L.push({ tipo: 'meio', k, x: t[0], y: t[1] }); }
      break;
    case 'obstaculo': case 'decoracao': case 'zona': case 'marcacao':
      if (o.forma === 'poligono') {
        o.pontos.forEach((p, k) => { const t = P(p[0], p[1]); L.push({ tipo: 'vert', k, x: t[0], y: t[1] }); });
        o.pontos.forEach((p, k) => { const b = o.pontos[(k + 1) % o.pontos.length], t = P((p[0] + b[0]) / 2, (p[1] + b[1]) / 2); L.push({ tipo: 'meio', k, x: t[0], y: t[1] }); });
      } else if (o.forma === 'circulo' && o.tipo === 'obstaculo' && Math.abs(o.w - o.h) < 0.01) { const t = P(o.w / 2, 0); L.push({ tipo: 'raioC', x: t[0], y: t[1] }); }
      else if (o.forma !== 'ponto') { for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { const t = P(sx * o.w / 2, sy * o.h / 2); L.push({ tipo: 'canto', sx, sy, x: t[0], y: t[1] }); } }
      break;
    case 'gol': { const a = P(0, o.largura / 2), b = P(o.prof, 0); L.push({ tipo: 'largura', x: a[0], y: a[1] }, { tipo: 'prof', x: b[0], y: b[1] }); break; }
    case 'portal': case 'botao': case 'interruptor': { const t = P(o.raio, 0); L.push({ tipo: 'raioP', x: t[0], y: t[1] }); break; }
    case 'texto': { const t = P(pts[1][0], pts[2][1]); L.push({ tipo: 'tam', x: t[0], y: t[1] }); break; }
  }
  return L;
}
function alcaNoPonto(sx, sy) { const r = 22; let m = null, md = r; for (const a of alcas()) { const d = Math.hypot(a.x - sx, a.y - sy); if (d < md) { md = d; m = a; } } return m; }
// arrastar a alça a: muda o objeto o (nas coordenadas locais dele, em u)
function arrastaAlca(a, o, wx, wy) {
  const [ux, uy] = mundoParaU(wx, wy), c = Math.cos(-o.rot * RAD), s = Math.sin(-o.rot * RAD);
  const dx = ux - o.x, dy = uy - o.y, lx = dx * c - dy * s, ly = dx * s + dy * c;
  switch (a.tipo) {
    case 'girar': o.rot = ((encAng(Math.atan2(uy - o.y, ux - o.x) / RAD + 90) % 360) + 360) % 360; break;
    case 'ponta': {                                  // a outra ponta fica parada
      const outra = -a.lado * o.comp / 2, nova = enc(lx), comp = Math.max(0.5, Math.abs(nova - outra));
      const meio = (nova + outra) / 2, cs = Math.cos(o.rot * RAD), sn = Math.sin(o.rot * RAD);
      o.x = arred(o.x + meio * cs, 100); o.y = arred(o.y + meio * sn, 100); o.comp = arred(comp, 100);
      if (Math.sign(nova - outra) !== a.lado) { o.rot = (o.rot + 180) % 360; a.lado = -a.lado; }
      break;
    }
    case 'raio': o.raio = Math.max(1, enc(Math.hypot(lx, ly))); break;
    case 'abertura': o.abertura = clamp(Math.round(Math.abs(Math.atan2(ly, lx)) / RAD * 2), 5, 360); break;
    case 'vert': o.pontos[a.k] = [enc(lx), enc(ly)]; break;
    case 'raioC': o.w = o.h = Math.max(0.4, enc(Math.hypot(lx, ly) * 2)); break;
    case 'canto': o.w = Math.max(0.4, enc(Math.abs(lx) * 2)); o.h = Math.max(0.4, enc(Math.abs(ly) * 2)); break;
    case 'largura': o.largura = clamp(enc(Math.abs(ly) * 2), 2, 80); break;
    case 'prof': o.prof = clamp(enc(lx), 0.5, 30); break;
    case 'raioP': o.raio = clamp(enc(Math.hypot(lx, ly)), 0.6, 12); break;
    case 'tam': o.tam = clamp(arred(Math.abs(ly) / 0.6, 10), 0.6, 20); break;
  }
}

/* ---------------------------------------------------------------- o toque e o mouse na tela */
function edEventos(el) {
  const cv = EDU.cv;
  const pos = e => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  cv.addEventListener('pointerdown', e => {
    e.preventDefault(); try { cv.setPointerCapture(e.pointerId); } catch (_) {}
    const p = pos(e); OFE.ptrs.set(e.pointerId, { x: p[0], y: p[1], x0: p[0], y0: p[1] });
    if (OFE.ptrs.size === 2) {                     // dois dedos: zoom e câmera (o gesto de um dedo acaba aqui)
      if (OFE.arr && OFE.arr.tipo !== 'pinca') { if (OFE.arr.mexeu) confirmaMuda(); else if (OFE.pend) { OFE.M = JSON.parse(OFE.pend); OFE.pend = null; recompila(); } }
      clearTimeout(OFE.segT);
      const [a, b] = [...OFE.ptrs.values()];
      OFE.arr = { tipo: 'pinca', d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, z0: OFE.cam.z, c0: [(a.x + b.x) / 2, (a.y + b.y) / 2], cam0: { x: OFE.cam.x, y: OFE.cam.y } };
      return;
    }
    if (OFE.ptrs.size > 2) return;
    comecaGesto(p[0], p[1], e);
    if (OFE.arr) OFE.arr.toque = e.pointerType !== 'mouse';   // (a etiqueta das medidas fica em cima do dedo; no mouse, do lado)
  });
  cv.addEventListener('pointermove', e => {
    const q = OFE.ptrs.get(e.pointerId); if (!q) { if (e.pointerType === 'mouse') pairaMouse(pos(e)); return; }
    const p = pos(e); q.x = p[0]; q.y = p[1];
    const A = OFE.arr; if (!A) return;
    if (A.tipo === 'pinca') {
      const [a, b] = [...OFE.ptrs.values()]; if (!b) return;
      const d = Math.hypot(a.x - b.x, a.y - b.y) || 1, c = [(a.x + b.x) / 2, (a.y + b.y) / 2];
      const z = clamp(A.z0 * d / A.d0, 0.04, 6);
      const wx = A.cam0.x + (A.c0[0] - OFE.w / 2) / A.z0, wy = A.cam0.y + (A.c0[1] - OFE.h / 2) / A.z0;
      OFE.cam.z = z; OFE.cam.x = wx - (c[0] - OFE.w / 2) / z; OFE.cam.y = wy - (c[1] - OFE.h / 2) / z;
      OFE.sujo = true; edEstado(); return;
    }
    moveGesto(p[0], p[1], e);
  });
  const solta = e => {
    const q = OFE.ptrs.get(e.pointerId); if (!q) return;
    OFE.ptrs.delete(e.pointerId);
    const A = OFE.arr;
    if (A && A.tipo === 'pinca') { if (OFE.ptrs.size === 0) OFE.arr = null; else { const r = [...OFE.ptrs.values()][0]; r.x0 = r.x; r.y0 = r.y; OFE.arr = { tipo: 'nada' }; } return; }
    if (A && A.tipo === 'nada') { if (!OFE.ptrs.size) OFE.arr = null; return; }
    fimGesto(q.x, q.y, e, e.type === 'pointercancel');
  };
  cv.addEventListener('pointerup', solta); cv.addEventListener('pointercancel', solta);
  cv.addEventListener('wheel', e => { e.preventDefault(); const p = pos(e); zoomEm(Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015)), p[0], p[1]); }, { passive: false });
  cv.addEventListener('contextmenu', e => e.preventDefault());
  cv.addEventListener('dblclick', e => { if (OFE.desenho) { e.preventDefault(); concluiDesenho(); } });
  el.addEventListener('keydown', teclaEditor);
  window.addEventListener('keydown', e => { if (OFE.aberto && OFI.aberta && OFI.tela === 'editor' && !e.defaultPrevented && document.activeElement === document.body) teclaEditor(e); });
  window.addEventListener('keyup', e => { if (e.code === 'Space') OFE.espaco = false; });
  if (window.ResizeObserver) new ResizeObserver(() => { if (OFE.aberto) edTamanho(); }).observe(EDU.tela);
  window.addEventListener('resize', () => { if (OFE.aberto) setTimeout(edTamanho, 50); });
}
function pairaMouse(p) { const w = telaParaMundo(p[0], p[1]); const o = OFE.ferr === 'sel' ? objetoNoPonto(w[0], w[1]) : null; const a = alcaNoPonto(p[0], p[1]); EDU.cv.style.cursor = a ? (a.tipo.startsWith('girar') ? 'grab' : 'crosshair') : o ? 'move' : OFE.ferr === 'mao' ? 'grab' : OFE.ferr === 'sel' ? 'default' : 'crosshair'; }
function comecaGesto(sx, sy, e) {
  const [wx, wy] = telaParaMundo(sx, sy);
  const panear = OFE.ferr === 'mao' || e.button === 1 || e.button === 2 || OFE.espaco;
  if (panear) { OFE.arr = { tipo: 'pan', sx, sy, cam0: { x: OFE.cam.x, y: OFE.cam.y } }; return; }
  if (OFE.ferr === 'bola') { lancaPara(); OFE.arr = { tipo: 'mira', w0: [wx, wy], w1: [wx, wy], sx, sy }; OFE.sujo = true; return; }   // (lançar a bola)
  if (OFE.desenho || OFE.ferr === 'linha' || OFE.ferr === 'poli') { OFE.arr = { tipo: 'ponto', sx, sy }; return; }
  if (['parede', 'arco', 'ret', 'circ', 'zona'].indexOf(OFE.ferr) >= 0) { OFE.arr = { tipo: 'cria', w0: [wx, wy], w1: [wx, wy], sx, sy }; return; }
  let a = alcaNoPonto(sx, sy);
  if (a && !a.tipo.startsWith('girar') && OFE.sel.size === 1) {   // (a peça pequena na tela: o dedo dentro dela e mais perto do meio do que do quadradinho MOVE a peça)
    const o0 = selObjs()[0], dA = Math.hypot(a.x - sx, a.y - sy);
    if (o0 && dA > 6 && tocaObjeto(o0, wx, wy, 0)) { const c = mundoParaTela(...uParaMundo(o0.x, o0.y)); if (Math.hypot(c[0] - sx, c[1] - sy) < dA) a = null; }
  }
  if (a) {
    const objs = selObjs();
    OFE.arr = { tipo: 'alca', a, id: objs[0] && objs[0].id, sx, sy, mexeu: false }; tremeu(5);
    if (a.tipo === 'meio') {                       // o "+" no meio de um lado: um ponto novo ali
      muda(M => { const o = porId(OFE.arr.id); const p = o.pontos, b = p[(a.k + 1) % p.length]; if (p.length < RM.LIM.pontos) p.splice(a.k + 1, 0, [arred((p[a.k][0] + b[0]) / 2, 100), arred((p[a.k][1] + b[1]) / 2, 100)]); }, false);
      OFE.arr.a = { tipo: 'vert', k: a.k + 1 };
    }
    if (a.tipo === 'girarG') { const b = caixaSel(); OFE.arr.c = [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2]; OFE.arr.a0 = Math.atan2(wy - OFE.arr.c[1], wx - OFE.arr.c[0]); OFE.arr.orig = JSON.stringify(selObjs()); }
    return;
  }
  const o = objetoNoPonto(wx, wy), soma = OFE.multi || e.shiftKey;
  if (o) {
    if (soma) { selecionaComGrupo(o, true); edEstado(); painelAtualiza(); OFE.sujo = true; OFE.arr = { tipo: 'nada' }; return; }
    if (!OFE.sel.has(o.id)) { selecionaComGrupo(o, false); edEstado(); painelAtualiza(); }
    OFE.arr = { tipo: 'move', sx, sy, w0: [wx, wy], mexeu: false, orig: selObjs().map(x => ({ id: x.id, x: x.x, y: x.y })) };
    clearTimeout(OFE.segT);                          // segurar parado: soma à seleção (a seleção múltipla pelo toque)
    OFE.segT = setTimeout(() => { if (OFE.arr && OFE.arr.tipo === 'move' && !OFE.arr.mexeu) { OFE.multi = true; edEstado(); aviso('Seleção múltipla ligada: toque nos outros objetos.'); try { navigator.vibrate && navigator.vibrate(18); } catch (_) {} OFE.arr = { tipo: 'nada' }; } }, 550);
    OFE.sujo = true; return;
  }
  OFE.arr = { tipo: 'caixa', sx, sy, w0: [wx, wy], w1: [wx, wy], soma };
}
function moveGesto(sx, sy) {
  const A = OFE.arr; if (!A) return;
  A.ult = [sx, sy];
  const [wx, wy] = telaParaMundo(sx, sy), longe = Math.hypot(sx - (A.sx || sx), sy - (A.sy || sy)) > 5;
  if (A.tipo === 'mira') { A.w1 = [wx, wy]; OFE.sujo = true; return; }
  if (A.tipo === 'pan') { OFE.cam.x = A.cam0.x - (sx - A.sx) / OFE.cam.z; OFE.cam.y = A.cam0.y - (sy - A.sy) / OFE.cam.z; OFE.sujo = true; return; }
  if (A.tipo === 'cria') { A.w1 = [wx, wy]; OFE.sujo = true; return; }
  if (A.tipo === 'caixa') { A.w1 = [wx, wy]; A.mexeu = A.mexeu || longe; OFE.sujo = true; return; }
  if (A.tipo === 'move') {
    if (!A.mexeu && !longe) return;
    if (!A.mexeu) { A.mexeu = true; clearTimeout(OFE.segT); if (selObjs().some(o => o.bloqueado)) { aviso('Objeto bloqueado: desbloqueie para mover.'); OFE.arr = { tipo: 'nada' }; return; } }
    const [ddx, ddy, gx, gy] = guiasDoMove(A, (wx - A.w0[0]) / RN.PX_POR_U, (wy - A.w0[1]) / RN.PX_POR_U);   // (as guias: o meio, o alinhamento, o espelho)
    const chave = A.guia ? [A.guia.tx, A.guia.x, A.guia.ty, A.guia.y].join('|') : '';
    if (chave !== (A.guiaK || '')) { if (chave) tremeu(6); A.guiaK = chave; }
    muda(() => { for (const p of A.orig) { const o = porId(p.id); if (!o) continue; o.x = clamp(gx ? arred(p.x + ddx) : enc(p.x + ddx), -RM.LIM.coordX, RM.LIM.coordX); o.y = clamp(gy ? arred(p.y + ddy) : enc(p.y + ddy), -RM.LIM.coordY, RM.LIM.coordY); } }, false);
    return;
  }
  if (A.tipo === 'alca') {
    A.mexeu = true;
    if (A.a.tipo === 'girarG') {
      const ang = Math.atan2(wy - A.c[1], wx - A.c[0]) - A.a0, dg = OFE.encaixa ? Math.round(ang / RAD / 15) * 15 : Math.round(ang / RAD), orig = JSON.parse(A.orig);
      const [cx, cy] = mundoParaU(A.c[0], A.c[1]), c = Math.cos(dg * RAD), s = Math.sin(dg * RAD); A.dg = dg;
      muda(() => { for (const p of orig) { const o = porId(p.id); if (!o) continue; const dx = p.x - cx, dy = p.y - cy; o.x = arred(cx + dx * c - dy * s, 100); o.y = arred(cy + dx * s + dy * c, 100); o.rot = (((p.rot + dg) % 360) + 360) % 360; } }, false);
      return;
    }
    const o = porId(A.id); if (!o) return;
    muda(() => arrastaAlca(A.a, o, wx, wy), false);
  }
}
function fimGesto(sx, sy, e, cancelou) {
  const A = OFE.arr; OFE.arr = null; clearTimeout(OFE.segT);
  if (!A) return;
  const [wx, wy] = telaParaMundo(sx, sy);
  if (cancelou) { if (OFE.pend) { OFE.M = JSON.parse(OFE.pend); OFE.pend = null; recompila(); } OFE.sujo = true; return; }
  if (A.tipo === 'mira') return lancaSolta(A);
  if (A.tipo === 'move' || A.tipo === 'alca') { if (A.mexeu || OFE.pend) confirmaMuda(); edEstado(); OFE.sujo = true; return; }
  if (A.tipo === 'caixa') {
    if (!A.mexeu) { if (!A.soma) { OFE.sel.clear(); edEstado(); painelAtualiza(); } OFE.sujo = true; return; }
    const x0 = Math.min(A.w0[0], A.w1[0]), x1 = Math.max(A.w0[0], A.w1[0]), y0 = Math.min(A.w0[1], A.w1[1]), y1 = Math.max(A.w0[1], A.w1[1]);
    if (!A.soma) OFE.sel.clear();
    const cm = camadasDoMapa(OFE.M);
    for (const o of OFE.M.objetos) { if (o.bloqueado || o.oculto || cm.vis.get(o.camada) === false || cm.bloq.get(o.camada)) continue; const b = caixaObj(o); if (b[0] >= x0 && b[2] <= x1 && b[1] >= y0 && b[3] <= y1) OFE.sel.add(o.id); }
    edEstado(); painelAtualiza(); OFE.sujo = true; return;
  }
  if (A.tipo === 'cria') return criaArrastando(A);
  if (A.tipo === 'ponto') return pontoDesenho(wx, wy, sx, sy);
}

/* ---------------------------------------------------------------- criar objetos (arrastando, ou ponto a ponto) */
function novoId(tipo) { const p = { parede: 'w', arco: 'a', linha: 'l', obstaculo: 'b', gol: 'g', zona: 'z', portal: 'p', portao: 'q', botao: 'k', interruptor: 'i', cronometro: 't', spawn: 's', spawnBola: 'sb', decoracao: 'd', marcacao: 'm', texto: 'x' }[tipo] || 'o'; let n = OFE.M.objetos.length + 1, id; do { id = p + (n++).toString(36); } while (OFE.M.objetos.some(o => o.id === id)); return id; }
function poeObjeto(cru, seleciona) {                   // um objeto novo no mapa (passa pela limpeza)
  if (OFE.M.objetos.length >= RM.LIM.objetos) { aviso('O mapa já tem ' + RM.LIM.objetos + ' objetos (o máximo).', 'erro'); return null; }
  cru.id = cru.id && !OFE.M.objetos.some(o => o.id === cru.id) ? cru.id : novoId(cru.tipo);
  const o = RM.limpaObjeto(cru); if (!o) return null;
  muda(M => { M.objetos.push(o); });
  if (seleciona !== false) { OFE.sel.clear(); OFE.sel.add(o.id); edEstado(); painelAtualiza(); }
  tremeu(10);
  return o;
}
function centroVisto() { const w = telaParaMundo((OFE.w - painelCobre()) / 2, OFE.h / 2), [x, y] = mundoParaU(w[0], w[1]); return [enc(clamp(x, -RM.LIM.coordX, RM.LIM.coordX)), enc(clamp(y, -RM.LIM.coordY, RM.LIM.coordY))]; }
function criaArrastando(A) {
  const [x0, y0] = mundoParaU(A.w0[0], A.w0[1]), [x1, y1] = mundoParaU(A.w1[0], A.w1[1]);
  const a = [enc(x0), enc(y0)], b = [enc(x1), enc(y1)], dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy), pequeno = d < 0.8;
  let o = null;
  switch (OFE.ferr) {
    case 'parede': o = pequeno ? { tipo: 'parede', x: a[0], y: a[1], comp: 10 } : { tipo: 'parede', x: arred((a[0] + b[0]) / 2), y: arred((a[1] + b[1]) / 2), comp: arred(d), rot: ((Math.atan2(dy, dx) / RAD) + 360) % 360 }; break;
    case 'arco': o = { tipo: 'arco', x: a[0], y: a[1], raio: pequeno ? 8 : arred(d), abertura: 90, rot: pequeno ? 0 : ((Math.atan2(dy, dx) / RAD) + 360) % 360 }; break;
    case 'ret': o = pequeno ? { tipo: 'obstaculo', forma: 'retangulo', x: a[0], y: a[1], w: 6, h: 4 } : { tipo: 'obstaculo', forma: 'retangulo', x: arred((a[0] + b[0]) / 2), y: arred((a[1] + b[1]) / 2), w: Math.max(0.4, Math.abs(dx)), h: Math.max(0.4, Math.abs(dy)) }; break;
    case 'circ': o = { tipo: 'obstaculo', forma: 'circulo', x: a[0], y: a[1], w: pequeno ? 4 : arred(d * 2), h: pequeno ? 4 : arred(d * 2) }; break;
    case 'zona': o = pequeno ? { tipo: 'zona', x: a[0], y: a[1], w: 10, h: 8, efeito: 'velocidade' } : { tipo: 'zona', x: arred((a[0] + b[0]) / 2), y: arred((a[1] + b[1]) / 2), w: Math.max(0.5, Math.abs(dx)), h: Math.max(0.5, Math.abs(dy)), efeito: 'velocidade' }; break;
  }
  if (o) { poeObjeto(o); escolheFerr('sel'); }
  OFE.sujo = true;
}
function pontoDesenho(wx, wy, sx, sy) {
  const [ux, uy] = mundoParaU(wx, wy), p = [enc(ux), enc(uy)];
  if (!OFE.desenho) OFE.desenho = { tipo: OFE.ferr === 'poli' ? 'poli' : 'linha', pts: [], destino: OFE.destinoPoli || null };
  const d = OFE.desenho;
  if (d.tipo === 'poli' && d.pts.length >= 3) { const f = mundoParaTela(...uParaMundo(d.pts[0][0], d.pts[0][1])); if (Math.hypot(f[0] - sx, f[1] - sy) < 22) return concluiDesenho(); }
  if (d.pts.length >= RM.LIM.pontos) return aviso('No máximo ' + RM.LIM.pontos + ' pontos.');
  const u = d.pts[d.pts.length - 1]; if (u && u[0] === p[0] && u[1] === p[1]) return;
  d.pts.push(p); OFE.sujo = true; edEstado();
}
function cancelaDesenho() { OFE.desenho = null; OFE.destinoPoli = null; OFE.sujo = true; escolheFerr('sel'); edEstado(); }
async function concluiDesenho() {
  const d = OFE.desenho; if (!d) return;
  if (d.tipo === 'linha' && d.pts.length < 2) return aviso('A linha precisa de 2 pontos.');
  if (d.tipo === 'poli' && d.pts.length < 3) return aviso('O polígono precisa de 3 pontos.');
  OFE.desenho = null; edEstado();
  const cx = arred(d.pts.reduce((s, p) => s + p[0], 0) / d.pts.length), cy = arred(d.pts.reduce((s, p) => s + p[1], 0) / d.pts.length);
  const locais = d.pts.map(p => [arred(p[0] - cx), arred(p[1] - cy)]);
  if (d.tipo === 'linha') { poeObjeto({ tipo: 'linha', x: cx, y: cy, pontos: locais }); escolheFerr('sel'); return; }
  let destino = d.destino;
  if (!destino) destino = await janela('O que é este polígono?', c => c.appendChild(h('p.ofi-jan-tx', { texto: 'Escolha o que o desenho vira:' })),
    [{ rot: 'OBSTÁCULO', v: 'obstaculo', cls: 'escuro', ic: 'poligono' }, { rot: 'ZONA', v: 'zona', cls: 'escuro', ic: 'zona' }, { rot: 'DECORAÇÃO', v: 'decoracao', cls: 'escuro', ic: 'enfeite' }, { rot: 'CONTORNO DO CAMPO', v: 'campo', cls: 'ama', ic: 'campo' }]);
  OFE.destinoPoli = null;
  if (!destino) { escolheFerr('sel'); return; }
  if (destino === 'campo') { muda(M => { M.campo.forma = 'poligono'; M.campo.pontos = d.pts.map(p => [p[0], p[1]]); }); aviso('O campo agora tem o contorno desenhado.'); }
  else poeObjeto({ tipo: destino, forma: 'poligono', x: cx, y: cy, pontos: locais, w: 4, h: 4, efeito: 'velocidade' });
  escolheFerr('sel');
}

/* ---------------------------------------------------------------- as ações da seleção */
function exclui() { const n = OFE.sel.size; if (!n) return; muda(M => { M.objetos = M.objetos.filter(o => !OFE.sel.has(o.id)); limpaRefs(M); }); OFE.sel.clear(); edEstado(); painelAtualiza(); tremeu(20); aviso(n + (n > 1 ? ' objetos excluídos' : ' objeto excluído') + ' (Desfazer volta).'); }
function limpaRefs(M) { const ids = new Set(M.objetos.map(o => o.id)); M.logica = M.logica.filter(r => !r.quando.alvo || ids.has(r.quando.alvo)); for (const r of M.logica) r.entao = r.entao.filter(a => !a.alvo || ids.has(a.alvo)); M.logica = M.logica.filter(r => r.entao.length); }
function copia() { const l = selObjs(); if (!l.length) return; OFE.clipe = JSON.parse(JSON.stringify(l)); try { sessionStorage.setItem('racha-oficina-clipe', JSON.stringify(OFE.clipe)); } catch (_) {} aviso(l.length + (l.length > 1 ? ' objetos copiados' : ' objeto copiado')); }
function cola(desloca) {
  const l = OFE.clipe; if (!l || !l.length) return aviso('Nada copiado ainda.');
  if (OFE.M.objetos.length + l.length > RM.LIM.objetos) return aviso('Não cabe: o mapa ficaria com mais de ' + RM.LIM.objetos + ' objetos.', 'erro');
  const [cx, cy] = desloca == null ? centroVisto() : [null, null];
  const mx = l.reduce((s, o) => s + o.x, 0) / l.length, my = l.reduce((s, o) => s + o.y, 0) / l.length;
  const novos = [], mapaIds = new Map(), grupos = new Map();
  muda(M => {
    for (const o of l) {
      const n = JSON.parse(JSON.stringify(o)); n.id = novoId(n.tipo); mapaIds.set(o.id, n.id);
      if (n.grupo) { if (!grupos.has(n.grupo)) grupos.set(n.grupo, 'g' + Date.now().toString(36).slice(-5) + grupos.size); n.grupo = grupos.get(n.grupo); }
      if (cx != null) { n.x = enc(cx + (o.x - mx)); n.y = enc(cy + (o.y - my)); } else { n.x = arred(o.x + desloca); n.y = arred(o.y + desloca); }
      M.objetos.push(n); novos.push(n.id);
    }
    for (const id of novos) { const o = M.objetos.find(x => x.id === id); if (o.tipo === 'portal' && o.par) o.par = mapaIds.get(o.par) || ''; }
  });
  OFE.sel = new Set(novos); edEstado(); painelAtualiza(); tremeu(10);
}
function duplica() { const salva = OFE.clipe; OFE.clipe = JSON.parse(JSON.stringify(selObjs())); cola(2); OFE.clipe = salva; }
function gira(dg) { muda(() => { for (const o of selObjs()) o.rot = (((o.rot + dg) % 360) + 360) % 360; }); }
const SIM_Y = { gol: 1, arco: 1 }, SIM_X = { triangulo: 1 };   // (o que é simétrico em y: espelhar na horizontal vira 180 − giro)
function espelha(eixo) {
  const objs = selObjs(); if (!objs.length) return;
  const b = caixaSel(), [cx, cy] = mundoParaU((b[0] + b[2]) / 2, (b[1] + b[3]) / 2);
  muda(() => {
    for (const o of objs) {
      if (eixo === 'h') o.x = arred(2 * cx - o.x); else o.y = arred(2 * cy - o.y);
      const temPts = o.pontos && (o.tipo === 'linha' || o.forma === 'poligono');
      if (temPts) o.pontos = o.pontos.map(p => eixo === 'h' ? [-p[0], p[1]] : [p[0], -p[1]]);
      const simY = SIM_Y[o.tipo], simX = o.forma === 'triangulo';
      if (temPts) o.rot = ((360 - o.rot) % 360);
      else if (eixo === 'h') o.rot = simY ? ((540 - o.rot) % 360) : ((360 - o.rot) % 360);
      else o.rot = simX ? ((540 - o.rot) % 360) : ((360 - o.rot) % 360);
      if (o.dir != null) o.dir = eixo === 'h' ? ((540 - o.dir) % 360) : ((360 - o.dir) % 360);
      if (o.mov) { if (eixo === 'h') espelhaMov(o.mov); else if (o.mov.tipo === 'vaivem') o.mov.dy = -o.mov.dy; else o.mov.fase = arred((1 - (o.mov.fase || 0)) % 1, 1000); }
    }
  });
}
function ordem(d) {                                    // para a frente (d = 1) ou para trás (−1) dentro da camada
  const ids = OFE.sel; if (!ids.size) return;
  muda(M => { const fica = M.objetos.filter(o => !ids.has(o.id)), vai = M.objetos.filter(o => ids.has(o.id)); M.objetos = d > 0 ? fica.concat(vai) : vai.concat(fica); });
}
function agrupa() { if (OFE.sel.size < 2) return; const g = 'g' + Date.now().toString(36).slice(-6); muda(() => { for (const o of selObjs()) o.grupo = g; }); aviso('Agrupados: tocar em um seleciona o grupo.'); }
function desagrupa() { muda(() => { for (const o of selObjs()) o.grupo = ''; }); aviso('Desagrupados.'); }
function bloqueia() { const v = !selObjs().every(o => o.bloqueado); muda(() => { for (const o of selObjs()) o.bloqueado = v; }); aviso(v ? 'Bloqueado: não mexe pelo toque (desbloqueie no painel).' : 'Desbloqueado.'); if (v) { OFE.sel.clear(); edEstado(); painelAtualiza(); } }
function oculta() { const v = !selObjs().every(o => o.oculto); muda(() => { for (const o of selObjs()) o.oculto = v; }); aviso(v ? 'Oculto no editor (continua na partida). Mostre de novo em Camadas.' : 'Visível no editor.'); if (v) { OFE.sel.clear(); edEstado(); painelAtualiza(); } }
function alinha(k) {
  const objs = selObjs(); if (objs.length < 2) return; const B = caixaSel();
  muda(() => { for (const o of objs) { const b = caixaObj(o), [bx0, by0] = mundoParaU(b[0], b[1]), [bx1, by1] = mundoParaU(b[2], b[3]), [X0, Y0] = mundoParaU(B[0], B[1]), [X1, Y1] = mundoParaU(B[2], B[3]);
    if (k === 'e') o.x = arred(o.x + X0 - bx0); else if (k === 'd') o.x = arred(o.x + X1 - bx1); else if (k === 'c') o.x = arred(o.x + (X0 + X1) / 2 - (bx0 + bx1) / 2);
    else if (k === 't') o.y = arred(o.y + Y0 - by0); else if (k === 'b') o.y = arred(o.y + Y1 - by1); else if (k === 'm') o.y = arred(o.y + (Y0 + Y1) / 2 - (by0 + by1) / 2); } });
}
function distribui(eixo) {
  const objs = selObjs().slice().sort((a, b) => eixo === 'h' ? a.x - b.x : a.y - b.y); if (objs.length < 3) return;
  const a = eixo === 'h' ? objs[0].x : objs[0].y, b = eixo === 'h' ? objs[objs.length - 1].x : objs[objs.length - 1].y;
  muda(() => objs.forEach((o, i) => { const v = arred(a + (b - a) * i / (objs.length - 1)); if (eixo === 'h') o.x = v; else o.y = v; }));
}
function nudge(dx, dy) { if (!OFE.sel.size) return; muda(() => { for (const o of selObjs()) { if (o.bloqueado) continue; o.x = clamp(arred(o.x + dx), -RM.LIM.coordX, RM.LIM.coordX); o.y = clamp(arred(o.y + dy), -RM.LIM.coordY, RM.LIM.coordY); } }); }
const TECLA_FERR = { v: 'sel', h: 'mao', w: 'parede', a: 'arco', c: 'circ', z: 'zona', l: 'linha', p: 'poli', b: 'bola' };
function teclaEditor(e) {
  if (!OFE.aberto || document.querySelector('.ofi-jan-fundo')) return;
  const alvo = e.target; if (alvo && (alvo.tagName === 'INPUT' || alvo.tagName === 'TEXTAREA' || alvo.tagName === 'SELECT')) return;
  const ctrl = e.ctrlKey || e.metaKey, k = e.key.toLowerCase(), st = OFE.encaixa ? OFE.passo : 0.1, m = e.shiftKey ? 5 : 1;
  let feito = true;
  if (ctrl && k === 'z' && !e.shiftKey) desfaz(); else if (ctrl && (k === 'y' || (k === 'z' && e.shiftKey))) refaz();
  else if (ctrl && k === 'c') copia(); else if (ctrl && k === 'v') cola(); else if (ctrl && k === 'd') duplica(); else if (ctrl && k === 's') salvaRascunho(false);
  else if (ctrl && k === 'a') { OFE.sel = new Set(OFE.M.objetos.filter(o => !o.bloqueado && !o.oculto).map(o => o.id)); edEstado(); painelAtualiza(); }
  else if (k === 'delete' || k === 'backspace') exclui();
  else if (k === 'arrowleft') nudge(-st * m, 0); else if (k === 'arrowright') nudge(st * m, 0); else if (k === 'arrowup') nudge(0, -st * m); else if (k === 'arrowdown') nudge(0, st * m);
  else if (k === 'escape') OFI.volta();
  else if (k === 'enter' && OFE.desenho) concluiDesenho();
  else if (e.code === 'Space') { OFE.espaco = true; }
  else if (!ctrl && k === 'g') { if (e.shiftKey) desagrupa(); else agrupa(); }
  else if (!ctrl && k === 'r') gira(e.shiftKey ? -15 : 15);
  else if (!ctrl && TECLA_FERR[k]) escolheFerr(TECLA_FERR[k]);
  else if (!ctrl && k === 'f') edAjusta();
  else if (!ctrl && (k === '+' || k === '=')) zoomEm(1.25); else if (!ctrl && k === '-') zoomEm(1 / 1.25);
  else feito = false;
  if (feito) { e.preventDefault(); e.stopPropagation(); OFE.sujo = true; }
}
async function renomeia() {
  const n = await pergunta('Nome do mapa', 'Como o mapa vai se chamar?', OFE.M.nome, RM.LIM.nome);
  if (n == null) return; const t = RM.texto(n, RM.LIM.nome); if (!t) return aviso('O nome não pode ficar vazio.');
  muda(M => { M.nome = t; }); edEstado();
}

/* ---------------------------------------------------------------- o desenho do editor (só quando muda) */
function laco() {
  if (OFE.lacoOn) return; OFE.lacoOn = true;
  const passo = t => {
    if (!OFE.aberto || !OFI.aberta || OFI.tela !== 'editor') { OFE.lacoOn = false; return; }
    if (OFE.lanca) lancaPasso(t || performance.now());   // (a bola de teste: o motor do mapa, 60 passos por segundo)
    if (OFE.sujo) { OFE.sujo = false; try { desenhaEditor(); } catch (e) { console.error('Oficina (desenho do editor):', e); } }
    requestAnimationFrame(passo);
  };
  requestAnimationFrame(passo);
}
function desenhaEditor() {
  const cv = EDU.cv, g = cv.getContext('2d'), M = OFE.M, G = OFE.G; if (!M || !G) return;
  const dpr = OFE.dpr, z = OFE.cam.z;
  g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = M.aparencia.corFundo || '#1d2326'; g.fillRect(0, 0, cv.width, cv.height);
  const mundo = () => g.setTransform(dpr * z, 0, 0, dpr * z, dpr * (OFE.w / 2 - OFE.cam.x * z), dpr * (OFE.h / 2 - OFE.cam.y * z));
  // o fundo, o piso e as linhas: uma imagem pronta (refeita quando o mapa ou o zoom mudam bastante)
  const zb = Math.pow(2, Math.round(Math.log2(z * dpr) * 2) / 2);
  if (!OFE.base || OFE.base.rev !== OFE.rev || OFE.base.zb !== zb) {
    const area = G.MW * G.MH * zb * zb, sc = area > 6e6 ? zb * Math.sqrt(6e6 / area) : zb;
    const b = OFE.base && OFE.base.cv || document.createElement('canvas'); b.width = Math.max(1, Math.ceil(G.MW * sc)); b.height = Math.max(1, Math.ceil(G.MH * sc));
    const bg = b.getContext('2d'), cm = camadasDoMapa(M); bg.setTransform(sc, 0, 0, sc, 0, 0);   // (as camadas Fundo, Texturas e Marcações escondem o cenário, o piso e as linhas no editor)
    if (cm.vis.get('fundo') !== false) DES.fundo(bg, M, G);
    if (cm.vis.get('texturas') !== false) DES.piso(bg, M, G, sc);
    if (cm.vis.get('marcacoes') !== false) DES.linhas(bg, M, G);
    OFE.base = { cv: b, rev: OFE.rev, zb, sc };
  }
  mundo(); g.imageSmoothingEnabled = true;
  g.drawImage(OFE.base.cv, 0, 0, G.MW, G.MH);
  // a área do jogador (onde a tampinha anda) e a grade
  g.save(); g.setLineDash([10 / z, 8 / z]); g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 1.5 / z; g.strokeRect(G.GL, G.GT, G.GR - G.GL, G.GB - G.GT); g.restore();
  if (OFE.grade) desenhaGrade(g, G, z);
  const L = OFE.lanca && OFE.lanca.rev === OFE.rev ? OFE.lanca : null;   // (com a bola de teste correndo: os portões, os botões e o que anda, ao vivo)
  DES.objetos(g, M, G, L ? { editor: true, P: L.P, t: L.P.tick / RM.TPS } : { editor: true, t: 0 });
  DES.luz(g, M, G);
  // os pares dos portais (a linha que liga) e os problemas (os objetos com aviso)
  g.save(); g.setLineDash([8 / z, 8 / z]); g.lineWidth = 2 / z; g.strokeStyle = 'rgba(177,151,252,.7)';
  for (const o of M.objetos) if (o.tipo === 'portal' && o.par) { const p = porId(o.par); if (p && o.id < p.id) { g.beginPath(); g.moveTo(G.CX + U(o.x), G.CY + U(o.y)); g.lineTo(G.CX + U(p.x), G.CY + U(p.y)); g.stroke(); } }
  g.restore();
  for (const id of OFE.problemasObj) { const o = porId(id); if (!o) continue; const b = caixaObj(o); g.save(); g.strokeStyle = '#ff3b3b'; g.lineWidth = 3 / z; g.setLineDash([6 / z, 4 / z]); g.strokeRect(b[0] - 6 / z, b[1] - 6 / z, b[2] - b[0] + 12 / z, b[3] - b[1] + 12 / z); g.restore(); }
  // a seleção
  for (const o of selObjs()) { const pts = contornoMundo(o); g.save(); g.lineWidth = 2.5 / z; g.strokeStyle = o.bloqueado ? '#ff8a1a' : '#ffd21f'; g.setLineDash(o.grupo ? [7 / z, 4 / z] : []); caminhoPoli(g, pts); g.stroke(); g.restore(); }
  if (OFE.sel.size > 1) { const b = caixaSel(); g.save(); g.strokeStyle = 'rgba(255,210,31,.8)'; g.lineWidth = 1.5 / z; g.setLineDash([5 / z, 5 / z]); g.strokeRect(b[0], b[1], b[2] - b[0], b[3] - b[1]); g.restore(); }
  const A = OFE.arr;
  if (A && A.tipo === 'caixa' && A.mexeu) { g.save(); g.fillStyle = 'rgba(86,180,255,.15)'; g.strokeStyle = '#56b4ff'; g.lineWidth = 1.5 / z; const x0 = Math.min(A.w0[0], A.w1[0]), y0 = Math.min(A.w0[1], A.w1[1]); g.fillRect(x0, y0, Math.abs(A.w1[0] - A.w0[0]), Math.abs(A.w1[1] - A.w0[1])); g.strokeRect(x0, y0, Math.abs(A.w1[0] - A.w0[0]), Math.abs(A.w1[1] - A.w0[1])); g.restore(); }
  if (A && A.tipo === 'cria') desenhaPrevia(g, A, z);
  if (A && A.tipo === 'move' && A.mexeu) desenhaGuias(g, A, z);
  if (L) desenhaLanca(g, z);
  if (A && A.tipo === 'mira') desenhaMira(g, A, z);
  if (OFE.desenho) { const d = OFE.desenho; g.save(); g.strokeStyle = '#ffd21f'; g.fillStyle = '#ffd21f'; g.lineWidth = 3 / z; g.beginPath(); d.pts.forEach((p, i) => { const w = uParaMundo(p[0], p[1]); if (i) g.lineTo(w[0], w[1]); else g.moveTo(w[0], w[1]); }); if (d.tipo === 'poli' && d.pts.length > 2) { g.closePath(); g.fillStyle = 'rgba(255,210,31,.18)'; g.fill(); } g.stroke(); g.fillStyle = '#ffd21f'; for (const p of d.pts) { const w = uParaMundo(p[0], p[1]); g.beginPath(); g.arc(w[0], w[1], 6 / z, 0, TAU); g.fill(); } g.restore(); }
  // as alças (na tela)
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  for (const a of alcas()) {
    g.beginPath();
    if (a.tipo === 'girar' || a.tipo === 'girarG') { g.arc(a.x, a.y, 9, 0, TAU); g.fillStyle = '#56b4ff'; g.fill(); g.lineWidth = 2.5; g.strokeStyle = '#05060c'; g.stroke(); g.strokeStyle = '#fff'; g.lineWidth = 1.8; g.beginPath(); g.arc(a.x, a.y, 4.5, -.4, 4.4); g.stroke(); continue; }
    if (a.tipo === 'meio') { g.arc(a.x, a.y, 7, 0, TAU); g.fillStyle = 'rgba(255,255,255,.85)'; g.fill(); g.strokeStyle = '#05060c'; g.lineWidth = 2; g.stroke(); g.beginPath(); g.moveTo(a.x - 3.5, a.y); g.lineTo(a.x + 3.5, a.y); g.moveTo(a.x, a.y - 3.5); g.lineTo(a.x, a.y + 3.5); g.stroke(); continue; }
    g.rect(a.x - 7, a.y - 7, 14, 14); g.fillStyle = a.tipo === 'vert' ? '#ffd21f' : '#ffffff'; g.fill(); g.lineWidth = 2.5; g.strokeStyle = '#05060c'; g.stroke();
  }
  desenhaAvisoLanca(g);
  desenhaMedida(g);
}
function desenhaGrade(g, G, z) {
  let st = U(OFE.passo); while (st * z < 9) st *= 2;   // (sem linha demais na tela)
  const x0 = Math.floor((OFE.cam.x - OFE.w / 2 / z - G.CX) / st) * st + G.CX, x1 = OFE.cam.x + OFE.w / 2 / z, y0 = Math.floor((OFE.cam.y - OFE.h / 2 / z - G.CY) / st) * st + G.CY, y1 = OFE.cam.y + OFE.h / 2 / z;
  g.save(); g.lineWidth = 1 / z;
  for (let x = x0, i = Math.round((x0 - G.CX) / st); x <= x1; x += st, i++) { g.strokeStyle = i % 10 === 0 ? 'rgba(255,255,255,.22)' : i % 2 === 0 ? 'rgba(255,255,255,.1)' : 'rgba(255,255,255,.05)'; g.beginPath(); g.moveTo(x, y0); g.lineTo(x, y1); g.stroke(); }
  for (let y = y0, i = Math.round((y0 - G.CY) / st); y <= y1; y += st, i++) { g.strokeStyle = i % 10 === 0 ? 'rgba(255,255,255,.22)' : i % 2 === 0 ? 'rgba(255,255,255,.1)' : 'rgba(255,255,255,.05)'; g.beginPath(); g.moveTo(x0, y); g.lineTo(x1, y); g.stroke(); }
  g.strokeStyle = 'rgba(255,210,31,.35)'; g.lineWidth = 1.5 / z; g.beginPath(); g.moveTo(G.CX, y0); g.lineTo(G.CX, y1); g.moveTo(x0, G.CY); g.lineTo(x1, G.CY); g.stroke();
  g.restore();
}
function desenhaPrevia(g, A, z) {
  g.save(); g.strokeStyle = '#ffd21f'; g.fillStyle = 'rgba(255,210,31,.2)'; g.lineWidth = 3 / z; g.setLineDash([8 / z, 6 / z]);
  const [a, b] = [A.w0, A.w1], d = Math.hypot(b[0] - a[0], b[1] - a[1]);
  if (OFE.ferr === 'parede') { g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineWidth = U(0.6); g.stroke(); }
  else if (OFE.ferr === 'arco') { const ang = Math.atan2(b[1] - a[1], b[0] - a[0]); g.beginPath(); g.arc(a[0], a[1], d, ang - Math.PI / 4, ang + Math.PI / 4); g.lineWidth = U(0.6); g.stroke(); }
  else if (OFE.ferr === 'circ') { g.beginPath(); g.arc(a[0], a[1], d, 0, TAU); g.fill(); g.stroke(); }
  else { g.fillRect(Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1])); g.strokeRect(Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1])); }
  g.restore();
}

/* ---------------------------------------------------------------- testar, o menu do "mais" */
async function edTestar() {
  if (OFE.pend) confirmaMuda();
  const r = recompila();
  if (!r.ok) { OFE.painelAberto = true; OFE.sel.clear(); OFE.aba = 'validar'; edEstado(); painelAtualiza(); return aviso('O mapa tem problemas: veja em Validação.', 'erro'); }
  if (OFE.mudou) await salvaRascunho(true);
  OFJ.local(OFE.M, { volta: 'editor' });
}
function menuMais() {
  janela('Mais opções', (c, ctx) => {
    const it = (ic, t, sub, f) => c.appendChild(h('button.ofi-item', { type: 'button', on: { click: () => { ctx.fecha(null); f(); } } }, icone(ic), h('span', h('b', { texto: t }), h('small', { texto: sub }))));
    it('nuvem', 'PUBLICAR', 'Mandar para a comunidade (público, não listado ou privado)', () => publicaDialogo(OFE.reg, OFE.M));
    it('pessoas', 'TESTE MULTIPLAYER PRIVADO', 'Abrir uma sala fechada com este rascunho e chamar a galera', () => testeOnline());
    it('play', 'CRIAR SALA', 'Sala fechada com este rascunho, escolhendo os bots e a física da sala (tamanho da bola, chutes…)', () => criaSalaEditor());
    it('check', 'VALIDAR', 'Ver os erros e avisos do mapa', () => { OFE.painelAberto = true; OFE.sel.clear(); OFE.aba = 'validar'; edEstado(); painelAtualiza(); });
    it('relogio', 'VERSÕES', 'Voltar para uma versão salva antes', () => versoesDialogo());
    it('duplicar', 'DUPLICAR', 'Fazer uma cópia deste mapa', () => duplicaRascunho(OFE.reg));
    it('campo', 'CONFIGURAÇÕES DO MAPA', 'Campo, aparência, física e regras', () => { OFE.painelAberto = true; OFE.sel.clear(); OFE.aba = 'campo'; edEstado(); painelAtualiza(); });
  }, [], 'ofi-menu');
}
async function testeOnline() {
  if (OFE.pend) confirmaMuda();
  const r = recompila(); if (!r.ok) return aviso('O mapa tem problemas: veja em Validação.', 'erro');
  if (OFE.mudou) await salvaRascunho(true);
  if (!(await conecta())) return aviso('Sem servidor das salas agora: o teste multiplayer precisa da internet (ou do servidor da turma).', 'erro');
  OFS.criaSala({ mapaDados: OFE.M, pub: false, bots: true, n: OFE.M.partida.porTime, name: 'Teste: ' + OFE.M.nome }, 'editor');
}
async function criaSalaEditor() {
  if (OFE.pend) confirmaMuda();
  const r = recompila(); if (!r.ok) return aviso('O mapa tem problemas: veja em Validação.', 'erro');
  if (OFE.mudou) await salvaRascunho(true);
  criaSalaDialogo({ M: JSON.parse(JSON.stringify(OFE.M)), nome: OFE.M.nome, volta: 'editor' });
}
async function versoesDialogo() {
  if (!OFE.reg) return;
  if (OFE.mudou) await salvaRascunho(true);
  const l = await GAVETA.versoesDe(OFE.reg.id);
  const x = await janela('Versões salvas', (c, ctx) => {
    if (!l.length) c.appendChild(h('p.ofi-jan-tx', { texto: 'Nenhuma versão salva ainda.' }));
    for (const v of l) c.appendChild(h('button.ofi-item', { type: 'button', on: { click: () => ctx.fecha(v) } },
      icone(v.auto ? 'relogio' : 'salvar'), h('span', h('b', { texto: 'Versão ' + v.n + (v.nota ? ' · ' + v.nota : '') }), h('small', { texto: new Date(v.t).toLocaleString('pt-BR') + ' · ' + v.dados.objetos.length + ' objetos' }))));
  }, [{ rot: 'FECHAR', v: null, cls: 'escuro' }]);
  if (x) voltaVersao(x);
}
async function voltaVersao(x) {
  const ok = await confirma('Voltar para a versão ' + x.n + '?', 'O mapa de agora vira uma versão também (dá para voltar nele depois).', 'VOLTAR');
  if (!ok) return;
  await GAVETA.novaVersao(OFE.reg.id, OFE.M, 'antes de voltar para a ' + x.n, false);
  OFE.undo.push(JSON.stringify(OFE.M)); OFE.M = JSON.parse(JSON.stringify(x.dados)); recompila(); marcaMudanca(); await salvaRascunho(true);
  aviso('Voltou para a versão ' + x.n + '.');
}
