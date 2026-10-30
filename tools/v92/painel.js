/* ======================================================================================================================
   RACHA v92 · O PAINEL DE AJUSTES DA VERSÃO DE TESTES (tools/v92/painel.js) — só com experimental: true no config.js.
   Mora dentro dos AJUSTES de sempre (a mesma janela, as mesmas letras, cores e botões da v91), numa aba nova: TESTES v92.
   Abre no lobby e na pausa da partida (AJUSTES › TESTES v92; no computador, F2). Partes:
     · PERFIS: o Padrão v92, o Restaurar v91 (tudo como era), duas memórias A e B para comparar (A ⇄ B com um toque, também
       no medidor da tela), a tabela do que muda entre eles, exportar e importar (texto JSON);
     · FÍSICA: tamanho da tampinha e da bola, alcance do chute, velocidade, peso, força do PASSE e do CHUTE, teto e freio da
       bola, giro, atritos e quiques (vale no treino e contra os bots na hora; na sala, o admin manda para o servidor de testes);
     · CONTROLES: o toque armado, as direções, a zona morta, a folga da direção, o analógico fixo/flutuante, a área de toque
       extra, os moldes e o tamanho dos botões (o editor de controles de sempre continua igual);
     · TELA: o desenho entre os passos, a cadência, o limite de FPS em passo inteiro, a câmera (mola, à frente), o aro justo
       e o medidor na tela;
     · ONLINE: a previsão (v91 ou v92), a bola na tela (servidor, misto, eu), o deslize das correções, 30 ou 60 quadros/s,
       o perfil da sala e o botão de mandar o perfil para a sala (o servidor só aceita com RACHA_EXPERIMENTAL=1);
     · MEDIDAS: FPS, passos por quadro, toques e chutes, e no online o ping, as correções, os passos/s do servidor e a fila;
     · DB: a mecânica do DB (PASSE + CHUTE) — a atual ou a por estados (experimental), as janelas e proteções em passos,
       a parede, o relógio do toque, e o medidor das tentativas (com a varredura da tela de toque). Na pausa, o botão
       DB: ATUAL ⇄ POR ESTADOS troca na hora (no treino; na sala vale o perfil da sala).
   Na versão oficial (sem experimental) nada disso é montado: o jogo usa o padrão da v92.
   ====================================================================================================================== */
const V92P = {sec:null, partes:{}, faixas:{}, segs:{}, chaves:{}, sub:'perfis', med:null, medT:0, tabela:null, estado:null};
const V92_NOMES_FIS = [                                          // [chave, título, nota, min, max, passo, formato]
  ['rJog', 'Tamanho da tampinha', 'o raio do corpo (o desenho acompanha)', 1.2, 3.2, .05, v => v.toFixed(2) + ' u'],
  ['margem', 'Alcance do chute a mais', 'quanto o anel do chute passa do corpo', 0, 1.5, .05, v => v.toFixed(2) + ' u'],
  ['rBola', 'Tamanho da bola', 'o raio da bola', .5, 1.8, .05, v => v.toFixed(2) + ' u'],
  ['velJog', 'Velocidade da tampinha', 'a corrida (no máximo do analógico)', 7, 24, .1, v => v.toFixed(1) + ' u/s'],
  ['massaJog', 'Peso da tampinha', 'mais pesada empurra mais os outros', .3, 6, .05, v => v.toFixed(2)],
  ['massaBola', 'Peso da bola', 'mais pesada: conduz mais colada e o chute sai mais fraco (Δv = força ÷ peso)', 2, 30, .5, v => v.toFixed(1)],
  ['forcaPasse', 'Força do PASSE', '', 80, 500, 2.5, v => v.toFixed(1)],
  ['forcaChute', 'Força do CHUTE', '', 120, 700, 2.5, v => v.toFixed(1)],
  ['limiteBola', 'Teto da bola', 'a velocidade máxima da bola', 20, 90, .25, v => v.toFixed(2) + ' u/s'],
  ['fatorBola', 'Freio da bola', 'quanto da velocidade a bola guarda a cada passo', .97, .998, .0005, v => v.toFixed(4) + ' · perde ' + Math.round((1 - Math.pow(v, 60))*100) + '%/s'],
  ['amortAngular', 'Giro da bola some', 'o efeito do giro diminuindo sozinho', 0, 4, .1, v => v.toFixed(1)],
  ['atritoBola', 'Atrito da bola', 'nas batidas o atrito faz a bola girar e desviar', 0, 1, .05, v => v.toFixed(2)],
  ['atritoJog', 'Atrito da tampinha', 'tampinha × bola', 0, 1, .05, v => v.toFixed(2)],
  ['quiqueBola', 'Quique tampinha × bola', '0 = a bola não quica no corpo (conduz colada)', 0, .9, .05, v => v.toFixed(2)],
  ['quiqueParede', 'Quique nas linhas', 'bola × linhas da quadra', 0, 1, .05, v => v.toFixed(2)],
  ['quiqueTrave', 'Quique na trave', '', 0, 1, .05, v => v.toFixed(2)],
  ['quiqueRede', 'Quique na rede', '', 0, .8, .05, v => v.toFixed(2)],
  ['quiqueJogJog', 'Quique tampinha × tampinha', 'a trombada', 0, 1, .05, v => v.toFixed(2)],
  ['quiqueJogParede', 'Quique da tampinha no muro', '', 0, 1, .05, v => v.toFixed(2)],
  ['limiarQuique', 'Batida lenta não quica', 'abaixo disso a batida não quica (a bola não treme encostada)', 0, 4, .1, v => v.toFixed(1) + ' u/s'],
];
const v92Num = v => String(v).replace('.', ',');
const v92Virgula = t => String(t).replace(/(\d)\.(\d)/g, '$1,$2');   // (os números com vírgula, como no resto do jogo)
function v92Fis(k){ const f = V92.cfg.fisica; return k === 'margem' ? +(f.raioChute - f.rJog).toFixed(3) : f[k]; }
function v92Fis91(k){ const f = V92_V91.fisica; return k === 'margem' ? +(f.raioChute - f.rJog).toFixed(3) : f[k]; }
function v92MudaFis(k, v){
  const f = Object.assign({}, V92.cfg.fisica);
  if (k === 'margem') f.raioChute = +(f.rJog + v).toFixed(3);
  else if (k === 'rJog'){ const m = f.raioChute - f.rJog; f.rJog = v; f.raioChute = +(v + m).toFixed(3); }
  else f[k] = v;
  V92.cfg.fisica = V92_NUC.perfilLimpo(f, V92_NUC.PERFIL_V92);
  v92Mudou();
}
function v92Mudou(){ V92.slot = ''; v92Salva(); v92Aplica(); }
function v92Usa(cfg, nome){ V92.cfg = v92Limpa(cfg, V92_PADRAO); V92.slot = nome || ''; v92Salva(); v92Aplica(); }

/* ---------------------------------------------------------------- as peças (o jeito dos ajustes da v70/v88) */
function v92Faixa(id, titulo, nota, min, max, passo, valor, fmt, fn, ref){
  const lin = v88AjFaixa('v92-' + id, titulo, min, max, passo, valor, v => v92Virgula(fmt(v)), fn);
  lin.classList.add('v92p-faixa');
  const sp = lin.querySelector('span');
  if (sp && (nota || ref != null)){ sp.textContent = ''; sp.append(nodo('b', null, titulo)); const s = nodo('small', 'v92p-nota'); s.textContent = (nota ? nota : '') + (ref != null ? (nota ? ' · ' : '') + 'v91: ' + v92Virgula(ref) : ''); sp.append(s); }
  return lin;
}
function v92Chave(id, titulo, nota, fn){
  const lin = ajxChave('v92-' + id, titulo, nota), b = lin.querySelector('button');
  b.addEventListener('click', () => { som.clique(); fn(b.getAttribute('aria-pressed') !== 'true'); v92PainelSync(); });
  V92P.chaves[id] = b;
  return lin;
}
function v92Seg(id, rotulo, itens, fn){                         // itens: [[valor, texto, nota?]]
  const g = nodo('div', 'ajx-seg v92p-seg'); g.setAttribute('role', 'group'); g.setAttribute('aria-label', rotulo);
  for (const [v, t, n] of itens){
    const b = novoBotao(n ? 'ajx-pre' : ''); b.dataset.v = String(v); b.setAttribute('aria-pressed', 'false');
    if (n){ b.append(nodo('b', null, t), nodo('small', null, n)); } else b.textContent = t;
    g.appendChild(b);
  }
  g.addEventListener('click', e => { const b = e.target.closest('button[data-v]'); if (!b) return; som.clique(); fn(b.dataset.v); v92PainelSync(); });
  V92P.segs[id] = g;
  return g;
}
function v92Acao(texto, fn, cls){ const b = novoBotao('ajx-acao' + (cls ? ' ' + cls : '')); b.textContent = texto; b.addEventListener('click', () => { som.clique(); fn(b); }); return b; }
function v92Grupo(titulo, nota){ return ajxGrupo(titulo, nota); }

/* ---------------------------------------------------------------- as partes */
function v92ParteP(sec){                                         // PERFIS
  const g = v92Grupo('O que está valendo');
  V92P.estado = nodo('p', 'ajx-nota v92p-estado'); V92P.estado.setAttribute('aria-live', 'polite');
  const lin = nodo('div', 'ajx-seg v92p-linha');
  lin.append(v92Acao('PADRÃO v92', () => v92Usa(V92_PADRAO, 'v92')), v92Acao('RESTAURAR v91', () => v92Usa(V92_V91, 'v91'), 'v92p-v91'));
  g.append(V92P.estado, lin);
  const ab = v92Grupo('Comparar: as memórias A e B', 'Guarde dois jeitos e troque entre eles com um toque (com as duas guardadas, a pausa da partida ganha o botão A ⇄ B).');
  const l1 = nodo('div', 'ajx-seg v92p-linha'), l2 = nodo('div', 'ajx-seg v92p-linha');
  l1.append(v92Acao('GUARDAR EM A', () => { V92.slots.A = v92Limpa(V92.cfg); V92.slot = 'A'; v92Salva(); v92PainelSync(); }),
            v92Acao('GUARDAR EM B', () => { V92.slots.B = v92Limpa(V92.cfg); V92.slot = 'B'; v92Salva(); v92PainelSync(); }));
  V92P.usaA = v92Acao('USAR A', () => { if (V92.slots.A) v92Usa(V92.slots.A, 'A'); });
  V92P.usaB = v92Acao('USAR B', () => { if (V92.slots.B) v92Usa(V92.slots.B, 'B'); });
  V92P.troca = v92Acao('A ⇄ B', () => v92TrocaAB());
  l2.append(V92P.usaA, V92P.usaB, V92P.troca);
  V92P.tabela = nodo('div', 'v92p-tabela');
  ab.append(l1, l2, V92P.tabela);
  const ex = v92Grupo('Levar para outro aparelho', 'Copie o texto e cole no outro aparelho (IMPORTAR).');
  const ta = nodo('textarea', 'v92p-json'); ta.rows = 4; ta.spellcheck = false; ta.setAttribute('aria-label', 'O texto dos ajustes');
  const l3 = nodo('div', 'ajx-seg v92p-linha');
  l3.append(v92Acao('EXPORTAR', () => { ta.value = JSON.stringify({racha:'v92', cfg:V92.cfg}); ta.select(); try { navigator.clipboard && navigator.clipboard.writeText(ta.value); x49Toast('Ajustes copiados.'); } catch (_) {} }),
            v92Acao('IMPORTAR', () => { try { const o = JSON.parse(ta.value); v92Usa(o.cfg || o, ''); x49Toast('Ajustes importados.'); } catch (_) { x49Toast('Esse texto não é um ajuste do RACHA.'); } }));
  ex.append(ta, l3);
  sec.append(g, ab, ex);
}
function v92ParteF(sec){                                         // FÍSICA
  const g = v92Grupo('A física de números', 'Vale na hora no treino e contra os bots. Na sala online vale o perfil da sala (veja ONLINE). O padrão da v92 tem os mesmos números da v91.');
  for (const [k, t, n, mi, ma, pa, fmt] of V92_NOMES_FIS){
    const lin = v92Faixa('f-' + k, t, n, mi, ma, pa, v92Fis(k), fmt, v => v92MudaFis(k, v), fmt(v92Fis91(k)));
    V92P.faixas['f-' + k] = [lin, () => v92Fis(k)];
    g.appendChild(lin);
  }
  V92P.dv = nodo('p', 'ajx-nota v92p-dv'); g.appendChild(V92P.dv);
  g.appendChild(v92Acao('VOLTAR A FÍSICA DA v91', () => { V92.cfg.fisica = V92_NUC.perfilLimpo(Object.assign({}, V92_V91.fisica, {bufferToque:V92.cfg.fisica.bufferToque, direcoes:V92.cfg.fisica.direcoes, cooldownBotao:V92.cfg.fisica.cooldownBotao}, v92SoDb(V92.cfg.fisica))); v92Mudou(); }, 'v92p-v91'));
  sec.append(g);
}
function v92ParteC(sec){                                         // CONTROLES
  const g1 = v92Grupo('O toque do PASSE e do CHUTE');
  const buf = v92Faixa('buf', 'Toque armado', 'o toque vale por estes passos esperando a bola chegar no alcance (1 passo = 16,7 ms)', 0, 15, 1, V92.cfg.fisica.bufferToque,
    v => v + (v === 1 ? ' passo' : ' passos') + ' · ' + Math.round(v*1000/60) + ' ms', v => { V92.cfg.fisica = V92_NUC.perfilLimpo(Object.assign({}, V92.cfg.fisica, {bufferToque:v})); v92Mudou(); }, '0 (sem)');
  V92P.faixas.buf = [buf, () => V92.cfg.fisica.bufferToque];
  const cool = v92Faixa('cool', 'Intervalo entre trocas de botão', 'segurar o mesmo botão sempre vale', 0, .1, .005, V92.cfg.fisica.cooldownBotao, v => Math.round(v*1000) + ' ms',
    v => { V92.cfg.fisica = V92_NUC.perfilLimpo(Object.assign({}, V92.cfg.fisica, {cooldownBotao:v})); v92Mudou(); }, '20 ms');
  V92P.faixas.cool = [cool, () => V92.cfg.fisica.cooldownBotao];
  const tq = v92Faixa('area', 'Área de toque a mais nos botões', 'px da tela virtual em volta do PASSE/CHUTE', 0, 60, 2, V92.cfg.areaToque, v => '+' + v + ' px', v => { V92.cfg.areaToque = v; v92Mudou(); }, '+0 px');
  V92P.faixas.area = [tq, () => V92.cfg.areaToque];
  g1.append(buf, cool, tq);
  const g2 = v92Grupo('O analógico');
  g2.appendChild(v92Seg('dir', 'Direções do analógico', [[8, '8'], [16, '16'], [32, '32'], [64, '64'], [0, 'LIVRE']], v => { V92.cfg.fisica = V92_NUC.perfilLimpo(Object.assign({}, V92.cfg.fisica, {direcoes:+v})); v92Mudou(); }));
  const n1 = nodo('p', 'ajx-nota', 'v91: 32 direções. Na sala, as direções são as do perfil da sala (o servidor arredonda igual).'); g2.appendChild(n1);
  const zl = v92Faixa('zl', 'Começa a andar com o dedo a', 'a zona morta (em % do curso do analógico)', .04, .45, .01, V92.cfg.zonaLiga, v => Math.round(v*100) + '%', v => { V92.cfg.zonaLiga = v; if (V92.cfg.zonaDesliga > v) V92.cfg.zonaDesliga = v; v92Mudou(); }, '20%');
  const zd = v92Faixa('zd', 'Para com o dedo abaixo de', '', .02, .4, .01, V92.cfg.zonaDesliga, v => Math.round(v*100) + '%', v => { V92.cfg.zonaDesliga = Math.min(v, V92.cfg.zonaLiga); v92Mudou(); }, '12%');
  const fd = v92Faixa('fd', 'Folga para trocar de direção', 'quanto o dedo passa da divisa antes de trocar (menos = mais solto)', 0, .12, .005, V92.cfg.folgaDir, v => (v*180/Math.PI).toFixed(1) + '°', v => { V92.cfg.folgaDir = v; v92Mudou(); }, '2,9°');
  V92P.faixas.zl = [zl, () => V92.cfg.zonaLiga]; V92P.faixas.zd = [zd, () => V92.cfg.zonaDesliga]; V92P.faixas.fd = [fd, () => V92.cfg.folgaDir];
  g2.append(zl, zd, fd);
  g2.appendChild(v92Seg('joy', 'Analógico fixo ou flutuante', [['fixo', 'FIXO', 'no mesmo lugar'], ['flut', 'FLUTUANTE', 'nasce onde o dedo toca']], v => {
    const f = v === 'flut'; hud.joy.adere = f; hud.joy.segue = f; try { salvar(); } catch (_) {}
  }));
  const g3 = v92Grupo('Os botões na tela', 'Os moldes mudam o lugar e o tamanho; o editor de controles de sempre continua no EDITAR CONTROLES.');
  const mol = [];
  for (const id in HUD_MOLDES) mol.push([id, HUD_MOLDES[id].nome]);
  g3.appendChild(v92Seg('molde', 'Moldes dos controles', mol, id => { try { hudAplicaMolde(id); salvar(); } catch (_) {} }));
  const tb = v92Faixa('tb', 'Tamanho do PASSE e do CHUTE', '', TAM_MIN, TAM_MAX, .05, hud.kick.s, v => Math.round(v*100) + '%', v => {
    try { for (const k of ['kick', 'power']){ hud[k].s = v; if (HUDM && HUDM.base && HUDM.base[k]) HUDM.base[k].s = v; } hudArruma('base'); salvar(); } catch (_) {}
  }, '100%');
  V92P.faixas.tb = [tb, () => hud.kick.s];
  g3.append(tb, v92Acao('EDITAR CONTROLES DA TELA', () => { try { ajxFecha(); if (lobby.aberto) return x49Toast('Abra um treino e use EDITAR CONTROLES na pausa.'); abrirEdicao(); } catch (_) {} }));
  sec.append(g1, g2, g3);
}
function v92ParteT(sec){                                         // TELA
  const g1 = v92Grupo('A fluidez');
  g1.appendChild(v92Seg('render', 'O desenho entre os passos da física', [['v91', 'v91', 'o último passo'], ['suave', 'SUAVE', 'entre passos (+16 ms)'], ['prever', 'PREVER', 'onde está agora']], v => { V92.cfg.render = v; v92Mudou(); }));
  g1.append(v92Chave('dt', 'Ajustar a cadência dos quadros', 'sem engasgo com o relógio da tela oscilando (v91: desligado no treino)', on => { V92.cfg.dtSnap = on; v92Mudou(); }),
            v92Chave('fpsi', 'Limite de FPS em passo inteiro', '90 Hz desenha 90/s; 120 Hz, 60/s iguais (v91: desligado)', on => { V92.cfg.fpsInteiro = on; v92Mudou(); }));
  const g2 = v92Grupo('A câmera', 'O modo, o enquadramento e a câmera firme continuam na aba Câmera.');
  const mo = v92Faixa('mola', 'Tempo da mola da câmera', '0 = o de cada estilo (Seguir jogador: 0,24 s)', 0, .6, .01, V92.cfg.camMola, v => v ? v.toFixed(2) + ' s' : 'padrão', v => { V92.cfg.camMola = v; v92Mudou(); }, 'padrão');
  const le = v92Faixa('lead', 'A câmera olha à frente da corrida', 'Seguir jogador', 0, .4, .01, V92.cfg.camLead, v => Math.round(v*100) + '%', v => { V92.cfg.camLead = v; v92Mudou(); }, '8%');
  V92P.faixas.mola = [mo, () => V92.cfg.camMola]; V92P.faixas.lead = [le, () => V92.cfg.camLead];
  g2.append(mo, le);
  const g3 = v92Grupo('O desenho');
  g3.append(v92Chave('aro', 'Aro mais justo na tampinha', 'o anel do alcance mais perto do corpo (a bola encosta onde o aro termina)', on => { V92.cfg.aroJusto = on; v92Mudou(); }),
            v92Chave('med', 'Medidor na tela', 'FPS, passos por quadro, ping e correções, embaixo no meio da tela', on => { V92.cfg.medidor = on; v92Mudou(); }));
  sec.append(g1, g2, g3);
}
function v92ParteO(sec){                                         // ONLINE
  const g1 = v92Grupo('A previsão de quem joga na sala', 'Vale a partir da próxima partida.');
  g1.appendChild(v92Seg('prev', 'A previsão', [['v91', 'v91', 'só a sua tampinha'], ['v92', 'v92', 'o núcleo do servidor']], v => { V92.cfg.previsao = v; v92Mudou(); }));
  g1.appendChild(v92Seg('bola', 'A bola na tela', [['servidor', 'SERVIDOR', 'como na v91'], ['misto', 'MISTO', 'prevista perto de você'], ['eu', 'PREVISTA', 'tudo na hora']], v => { V92.cfg.bolaPrev = v; v92Mudou(); }));
  const tc = v92Faixa('tau', 'Deslize das correções', 'quando a previsão erra, a diferença some em', 30, 250, 5, V92.cfg.tauCorr, v => Math.round(v) + ' ms', v => { V92.cfg.tauCorr = v; v92Mudou(); }, '90 ms');
  V92P.faixas.tau = [tc, () => V92.cfg.tauCorr];
  g1.appendChild(tc);
  const g2 = v92Grupo('A sala', 'O admin manda o perfil da física (o desta tela) e os quadros por segundo para a sala antes de começar. O servidor só aceita na versão de testes (RACHA_EXPERIMENTAL=1).');
  g2.appendChild(v92Seg('quad', 'Quadros do servidor por segundo', [[30, '30/s', 'o de sempre'], [60, '60/s', 'mais liso, mais dados']], v => { V92.cfg.quadros = +v; v92Mudou(); }));
  V92P.sala = nodo('p', 'ajx-nota v92p-sala'); V92P.sala.setAttribute('aria-live', 'polite');
  V92P.mandar = v92Acao('MANDAR PARA A SALA', () => v92MandaSala());
  g2.append(V92P.sala, V92P.mandar);
  sec.append(g1, g2);
}
function v92ParteM(sec){                                         // MEDIDAS
  const g = v92Grupo('Ao vivo', 'Atualiza a cada meio segundo enquanto esta parte está aberta.');
  V92P.med = nodo('div', 'v92p-med'); g.appendChild(V92P.med);
  g.appendChild(v92Acao('ZERAR AS MEDIDAS', () => { const M = V92.med; M.passos = [0, 0, 0, 0]; M.quadros.length = 0; M.toques = M.chutes = M.perdidos = 0; M.corr.length = 0; if (M.corrB) M.corrB.length = 0; M.chutesPrev = 0; v92PainelSync(); }));
  sec.append(g);
}

function v92SoDb(f){ const o = {}; for (const k in f) if (k.slice(0, 2) === 'db') o[k] = f[k]; return o; }
function v92MudaDb(o){ V92.cfg.fisica = V92_NUC.perfilLimpo(Object.assign({}, V92.cfg.fisica, o)); v92Mudou(); }
const V92_NOMES_DB = [                                           // [chave, título, nota, min, max, passo, formato]
  ['dbJanelaParada', 'Janela do DB parado', 'o CHUTE completa o DB até este tanto de passos depois do PASSE sair (0 = sem DB parado)', 0, 4, 1, v => v ? v + (v === 1 ? ' passo' : ' passos') + ' · ' + Math.round(v*1000/60) + ' ms' : 'sem DB parado'],
  ['dbProtecaoParada', 'Proteção da bola parada', 'depois da janela, outro chute na mesma bola não sai por este tanto de passos (0 = só a física)', 0, 10, 1, v => v ? v + ' passos · ' + Math.round(v*1000/60) + ' ms' : 'só a física'],
  ['dbVParada', 'Bola parada até', 'a velocidade em que a bola ainda conta como parada', 0, 6, .25, v => v.toFixed(2) + ' u/s'],
  ['dbParadaPassos', 'Parada há pouco', 'a bola que a tampinha acabou de empurrar chegando ainda conta como parada por este tanto de passos', 0, 12, 1, v => v + ' passos · ' + Math.round(v*1000/60) + ' ms'],
  ['dbJanelaMovel', 'Janela do DB andando', 'colado, girando, de lado, normal (só vale com a proteção abaixo)', 0, 6, 1, v => v ? v + (v === 1 ? ' passo' : ' passos') : 'sem DB andando'],
  ['dbProtecaoMovel', 'Proteção da bola andando', '0 = só a física decide (o padrão)', 0, 10, 1, v => v ? v + ' passos' : 'só a física'],
  ['dbMargemParede', 'Jogada de parede', 'a bola a menos que isto de uma linha, trave ou rede', 0, 6, .25, v => v.toFixed(2) + ' u'],
  ['dbAnulaMs', 'Regra de ms: anula até', 'o CHUTE até este tanto depois do PASSE é anulado (só com a regra de ms)', 0, 10, .5, v => v.toFixed(1) + ' ms'],
  ['dbJanelaMs', 'Regra de ms: completa até', 'até este tanto completa o DB; depois a bola parada "já saiu" (só com a regra de ms)', 1, 16, .5, v => v.toFixed(1) + ' ms'],
];
function v92ParteD(sec){                                         // DB (PASSE + CHUTE)
  const g1 = v92Grupo('A mecânica do DB', 'DB = o PASSE e logo depois o CHUTE na mesma bola (os dois somam e a bola sai no teto). No treino vale na hora; na sala vale o perfil da sala (ONLINE › MANDAR PARA A SALA, no servidor de testes). Nenhum botão espera: cada toque vale no passo em que chegou ou é anulado.');
  g1.appendChild(v92Seg('dbm', 'A mecânica do DB', [[0, 'ATUAL', 'a de sempre'], [1, 'POR ESTADOS', 'experimental']], v => v92MudaDb({dbModo:+v})));
  V92P.dbNota = nodo('p', 'ajx-nota v92p-dbnota'); g1.appendChild(V92P.dbNota);
  const grupos = {
    dbJanelaParada: v92Grupo('Bola parada em campo aberto', 'A bola parada (ou que a tampinha acabou de empurrar chegando), longe das linhas, traves e rede.'),
    dbJanelaMovel: v92Grupo('Bola andando', 'Colado, girando, de lado e o DB normal.'),
    dbMargemParede: v92Grupo('Na parede', 'Com a bola encostada numa linha, trave ou rede ela volta para o pé: por padrão a parede segue só a física.'),
    dbAnulaMs: v92Grupo('O relógio do toque', 'O aparelho mede o intervalo entre os dedos. No mesmo passo da física, ele desempata quem veio antes. A regra de ms (2–5 ms) é só para comparar: ela depende da tela de toque de cada aparelho.'),
  };
  let g = null;
  for (const [k, t, n, mi, ma, pa, fmt] of V92_NOMES_DB){
    if (grupos[k]){ g = grupos[k]; if (k === 'dbAnulaMs'){
      g.append(v92Chave('dbo', 'Quem veio antes no mesmo passo', 'pelo relógio do toque (desligado: no mesmo passo o PASSE sempre ganha)', on => v92MudaDb({dbOrdem:on ? 1 : 0})),
               v92Chave('dbr', 'DB parado pela regra de ms', 'menos de 2 ms anula, de 2 a 5 ms completa, depois a bola já saiu', on => v92MudaDb({dbRelogio:on ? 1 : 0})));
    } }
    const lin = v92Faixa('db-' + k, t, n + ' · padrão: ' + v92Virgula(fmt(V92_NUC.PERFIL_V92[k])), mi, ma, pa, V92.cfg.fisica[k], fmt, v => v92MudaDb({[k]:v}), null);   // (a v91 não tem estes ajustes: a referência é o padrão do DB por estados)
    V92P.faixas['db-' + k] = [lin, () => V92.cfg.fisica[k]];
    g.appendChild(lin);
    if (k === 'dbMargemParede') g.appendChild(v92Seg('dbp', 'A regra na parede', [[0, 'SÓ A FÍSICA', 'o padrão'], [1, 'IGUAL AO CAMPO ABERTO', 'janela e proteção']], v => v92MudaDb({dbParede:+v})));
  }
  const gm = v92Grupo('O medidor do DB', 'As últimas tentativas (a mais nova em cima), no treino e na sala. Os dedos: o CHUTE menos o PASSE pelo relógio do toque. "Regra de 2–5 ms": o que a regra proposta decidiria com esse intervalo.');
  V92P.dbVar = nodo('p', 'ajx-nota v92p-dbvar'); V92P.dbVar.setAttribute('aria-live', 'polite');
  V92P.dbMed = nodo('div', 'v92p-dbmed');
  gm.append(V92P.dbVar, V92P.dbMed, v92Acao('ZERAR O MEDIDOR', () => { V92D.tent.length = 0; V92D.vs.length = 0; V92D.ultChutes.length = 0; v92PintaDb(); }));
  sec.append(g1, grupos.dbJanelaParada, grupos.dbJanelaMovel, grupos.dbMargemParede, grupos.dbAnulaMs, gm);
}
function v92PintaDb(){
  if (!V92P.dbMed) return;
  const f = V92.cfg.fisica, on = f.dbModo === 1;
  if (V92P.dbNota) V92P.dbNota.textContent = on
    ? 'Por estados: os dois no mesmo passo = vale o PASSE (o CHUTE é anulado); o CHUTE apertado depois do PASSE sair completa o DB em até ' + f.dbJanelaParada + (f.dbJanelaParada === 1 ? ' passo' : ' passos') + ' com a bola parada; um chute consome os comandos (segurar não chuta de novo).'
    : 'Atual: o CHUTE tem a prioridade no mesmo passo e o DB sai quando a bola ainda está no alcance depois das travas de sempre (20 ms entre trocas de botão no aparelho, 33 ms entre chutes no servidor).';
  const v = v92DbVarredura();
  V92P.dbVar.textContent = v ? 'A tela de toque deste aparelho lê o dedo a cada ' + v92Virgula(v.ms.toFixed(1)) + ' ms (≈ ' + Math.round(1000/v.ms) + ' Hz' + (v.fonte === 'coalescidos' ? '' : ', estimativa pelos eventos') + '): o relógio do toque não separa dois dedos mais perto que isso.'
    : 'Ande com o analógico para medir a varredura da tela de toque deste aparelho.';
  V92P.dbMed.textContent = '';
  const T = V92D.tent.slice(-12).reverse();
  if (!T.length){ V92P.dbMed.appendChild(nodo('p', 'ajx-nota', 'Nenhuma tentativa ainda: jogue um treino e faça PASSE e CHUTE na bola.')); return; }
  for (const t of T){
    const [a, b] = v92DbTexto(t), l = nodo('div', 'v92p-medl v92p-dbl' + (t.res === 'DB' ? ' v92p-dbok' : /anul/.test(a) ? ' v92p-dban' : ''));
    l.append(nodo('b', null, a), nodo('span', null, b + (t.onde === 'online' ? ' · sala' : '')));
    if (t.dt != null) l.appendChild(nodo('small', null, 'regra de 2–5 ms: ' + v92DbLiteral(t.dt)));
    V92P.dbMed.appendChild(l);
  }
}

/* ---------------------------------------------------------------- a aba dentro dos AJUSTES */
(function v92MontaPainel(){
  if (!V92.exp || !AJX || !AJX.secs || AJX.secs.v92) return;
  const nav = AJX.raiz.querySelector('.ajx-abas'), corpo = AJX.raiz.querySelector('.ajx-corpo'); if (!nav || !corpo) return;
  const t = novoBotao('ajx-aba v92p-aba'); t.id = 'ajx-t-v92'; t.textContent = 'TESTES v92'; t.dataset.aba = 'v92';
  t.setAttribute('role', 'tab'); t.setAttribute('aria-controls', 'ajx-v92'); t.setAttribute('aria-selected', 'false'); t.tabIndex = -1;
  nav.insertBefore(t, nav.firstChild); AJX.abas.v92 = t;           // (a primeira aba: na versão de testes é a que mais se usa)
  const s = nodo('section', 'ajx-sec v92p'); s.id = 'ajx-v92'; s.dataset.aba = 'v92'; s.setAttribute('role', 'tabpanel'); s.setAttribute('aria-labelledby', t.id); s.hidden = true;
  corpo.appendChild(s); AJX.secs.v92 = s;
  AJX_ABAS.unshift(['v92', 'TESTES v92']);
  const topo = nodo('div', 'v92p-topo');
  topo.append(nodo('b', 'v92p-selo', 'VERSÃO DE TESTES'), nodo('span', 'v92p-sub', 'Mexa, jogue e compare. Nada disto aparece na versão oficial.'));
  const sub = v92Seg('sub', 'Partes do painel de testes', [['perfis', 'PERFIS'], ['fisica', 'FÍSICA'], ['controles', 'CONTROLES'], ['tela', 'TELA'], ['online', 'ONLINE'], ['medidas', 'MEDIDAS'], ['db', 'DB']], v => { V92P.sub = v; });
  sub.classList.add('v92p-subnav');
  s.append(topo, sub);
  const partes = {perfis:v92ParteP, fisica:v92ParteF, controles:v92ParteC, tela:v92ParteT, online:v92ParteO, medidas:v92ParteM, db:v92ParteD};
  for (const k in partes){ const d = nodo('div', 'v92p-parte'); d.dataset.parte = k; partes[k](d); s.appendChild(d); V92P.partes[k] = d; }
  V92P.sec = s;
  // (no celular deitado os Ajustes encolhem o que cabe sem rolar — v70.1; o painel de testes é comprido de propósito: fica
  // sempre no tamanho normal, com os alvos de toque de 36 px, e rola)
  new MutationObserver(() => { if (s.style.zoom){ s.style.zoom = ''; const c = s.parentElement; if (c && c.dataset.v70z) delete c.dataset.v70z; } }).observe(s, {attributes:true, attributeFilter:['style']});
  window.addEventListener('keydown', e => {                       // F2: abre direto no painel de testes (no computador)
    if (e.key !== 'F2' || e.repeat) return;
    e.preventDefault();
    try { if (AJX.raiz.hidden) ajxAbre('v92'); else if (AJX.aba === 'v92') ajxFecha(); else ajxAba('v92', true); } catch (_) {}
  });
  setInterval(() => { if (V92P.sec && !V92P.sec.hidden && V92P.sub === 'medidas') v92PintaMedidas(); if (V92P.sec && !V92P.sec.hidden && V92P.sub === 'db') v92PintaDb(); v92Medidor(); }, 500);
})();
const v92AjxSyncAntes = ajxSync;
ajxSync = function(){ const r = v92AjxSyncAntes.apply(this, arguments); try { v92PainelSync(); } catch (_) {} return r; };

function v92Pinta(seg, valor){ if (!seg) return; for (const b of seg.querySelectorAll('button[data-v]')){ const on = b.dataset.v === String(valor); b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); } }
function v92NomeCfg(c){
  const igual = (a, b) => JSON.stringify(v92Limpa(a)) === JSON.stringify(v92Limpa(b));
  if (igual(c, V92_PADRAO)) return 'o Padrão v92';
  if (igual(c, V92_V91)) return 'a v91 (tudo como era)';
  if (V92.slots.A && igual(c, V92.slots.A)) return 'a memória A';
  if (V92.slots.B && igual(c, V92.slots.B)) return 'a memória B';
  return 'um ajuste seu (' + v92Difs(c, V92_PADRAO).length + ' diferenças do Padrão v92)';
}
const V92_ROTULOS = {render:'Desenho', dtSnap:'Cadência', fpsInteiro:'FPS em passo inteiro', previsao:'Previsão online', bolaPrev:'Bola online', tauCorr:'Deslize (ms)', quadros:'Quadros/s',
  zonaLiga:'Zona morta (liga)', zonaDesliga:'Zona morta (desliga)', folgaDir:'Folga da direção', areaToque:'Área de toque', camMola:'Mola da câmera', camLead:'Câmera à frente', aroJusto:'Aro justo', medidor:'Medidor'};
for (const [k, t] of V92_NOMES_FIS) V92_ROTULOS['f.' + k] = t;
Object.assign(V92_ROTULOS, {'f.bufferToque':'Toque armado (passos)', 'f.direcoes':'Direções', 'f.cooldownBotao':'Intervalo dos botões', 'f.jogRede':'Rede segura a tampinha (sala)', 'f.raioChute':'Anel do chute', 'f.atritoTrave':'Atrito da trave',
  'f.dbModo':'DB por estados', 'f.dbParede':'DB: regra na parede', 'f.dbOrdem':'DB: ordem pelo relógio do toque', 'f.dbRelogio':'DB: regra de ms'});
for (const [k, t] of V92_NOMES_DB) V92_ROTULOS['f.' + k] = 'DB: ' + t.toLowerCase();
function v92Plano(c){ const o = {}; for (const k in c){ if (k === 'fisica') for (const j in c.fisica) o['f.' + j] = c.fisica[j]; else o[k] = c[k]; } return o; }
function v92Difs(a, b){ const pa = v92Plano(v92Limpa(a)), pb = v92Plano(v92Limpa(b)); return Object.keys(pa).filter(k => JSON.stringify(pa[k]) !== JSON.stringify(pb[k])); }
function v92Fmt(v){ return typeof v === 'boolean' ? (v ? 'sim' : 'não') : typeof v === 'number' ? v92Num(+v.toFixed(4)) : String(v); }
function v92PintaTabela(){
  const T = V92P.tabela; if (!T) return;
  T.textContent = '';
  const col = [['Agora', V92.cfg], ['A', V92.slots.A], ['B', V92.slots.B], ['v91', V92_V91]].filter(c => c[1]);
  const ks = new Set(); for (const [, c] of col) for (const k of v92Difs(c, V92_PADRAO)) ks.add(k);
  if (!ks.size){ T.appendChild(nodo('p', 'ajx-nota', 'Tudo igual ao Padrão v92.')); return; }
  const tb = nodo('table'), th = nodo('tr');
  th.append(nodo('th', null, ''), nodo('th', null, 'v92'), ...col.map(c => nodo('th', null, c[0])));
  tb.appendChild(th);
  const pd = v92Plano(V92_PADRAO);
  for (const k of ks){
    const tr = nodo('tr'); tr.appendChild(nodo('td', null, V92_ROTULOS[k] || k)); tr.appendChild(nodo('td', null, v92Fmt(pd[k])));
    for (const [, c] of col){ const v = v92Plano(v92Limpa(c))[k], td = nodo('td', null, v92Fmt(v)); if (JSON.stringify(v) !== JSON.stringify(pd[k])) td.className = 'v92p-dif'; tr.appendChild(td); }
    tb.appendChild(tr);
  }
  T.appendChild(tb);
}
function v92TrocaAB(){
  const A = V92.slots.A, Bm = V92.slots.B; if (!A || !Bm) return x49Toast('Guarde a memória A e a B antes.');
  const vai = V92.slot === 'A' ? 'B' : 'A', med = !!V92.cfg.medidor;
  v92Usa(Object.assign({}, vai === 'A' ? A : Bm, {medidor:med}), vai);   // (o medidor da tela fica como está: ele não entra na comparação)
  x49Toast('Usando a memória ' + vai + ' (' + v92Curto(V92.cfg) + ').');
}
function v92MandaSala(){
  const r = NET49.room;
  if (!r || !NET49.ws) return x49Toast('Entre numa sala primeiro.');
  if (!r.experimental) return x49Toast('Este servidor não é o de testes (RACHA_EXPERIMENTAL=1).');
  if (r.state === 'playing') return x49Toast('Espere a partida acabar para mudar a sala.');
  if (!(typeof slDono === 'function' && slDono(r))) return x49Toast('Só o admin da sala manda o perfil.');
  net49Send({type:'config', fisica:V92.cfg.fisica, quadros:V92.cfg.quadros});
  x49Toast('Perfil mandado para a sala.');
}
function v92PintaSala(){
  if (!V92P.sala) return;
  const r = NET49.room;
  if (!r){ V92P.sala.textContent = 'Fora de sala.'; V92P.mandar.disabled = true; return; }
  const f = r.fisica, C = f ? V92_NUC.perfilLimpo(f) : null;
  const dif = C ? Object.keys(C).filter(k => C[k] !== V92_NUC.PERFIL_V92[k]) : [];
  V92P.sala.textContent = 'Sala ' + (r.code || '') + ': ' + (r.nucleo ? 'servidor v92 (' + r.nucleo + ')' : 'servidor antigo (sem o núcleo: previsão da v91)') +
    (C ? ' · perfil ' + (dif.length ? 'com ' + dif.length + ' mudança(s) do padrão' : 'padrão v92') + ' · toque armado ' + C.bufferToque + ' · ' + (r.quadros || 30) + ' quadros/s' : '') +
    (r.experimental ? ' · aceita o perfil do admin' : ' · não aceita perfil (servidor oficial)');
  V92P.mandar.disabled = !(r.experimental && r.state !== 'playing' && typeof slDono === 'function' && slDono(r));
}
function v92Estat(){
  const M = V92.med, q = M.quadros, n = q.length || 1, cont = [0, 0, 0, 0];
  for (const k of q) cont[Math.min(3, k)]++;
  const c = M.corr.slice().sort((a, b) => a - b), cb = (M.corrB || []).slice().sort((a, b) => a - b);
  const med = a => a.length ? a.reduce((s, x) => s + x, 0)/a.length : null, p95 = a => a.length ? a[Math.floor(.95*(a.length - 1))] : null;
  return {fps:FPS.v, tela:FPS.tela ? 1000/FPS.tela : 0, passos:cont.map(x => Math.round(100*x/n)), toques:M.toques, chutes:M.chutes, perdidos:M.perdidos,
    online:v92RedeAtiva(), ping:NET49.ping, corr:med(c), corr95:p95(c), corrB95:p95(cb), tps:M.tps, fila:M.fila, prev:M.chutesPrev | 0};
}
function v92PintaMedidas(){
  if (!V92P.med) return;
  const e = v92Estat(), f = (v, d) => v == null ? '—' : v92Num(v.toFixed(d));
  const linhas = [
    ['FPS', e.fps + ' (tela de ' + Math.round(e.tela) + ' Hz)'],
    ['Passos da física por quadro', '0: ' + e.passos[0] + '% · 1: ' + e.passos[1] + '% · 2: ' + e.passos[2] + '% · 3+: ' + e.passos[3] + '%'],
    ['Toques e chutes (treino)', e.toques + ' toques · ' + e.chutes + ' chutes'],
  ];
  if (e.online || NET49.playing) linhas.push(
    ['Ping', Math.round(e.ping || 0) + ' ms'],
    ['Correção da sua tampinha', 'média ' + f(e.corr, 2) + ' px · 95% até ' + f(e.corr95, 2) + ' px'],
    ['Correção da bola', '95% até ' + f(e.corrB95, 1) + ' px'],
    ['Servidor', f(e.tps, 1) + ' passos/s · ' + (e.fila | 0) + ' comandos à frente'],
    ['Chutes previstos na hora', String(e.prev)]);
  V92P.med.textContent = '';
  for (const [a, b] of linhas){ const l = nodo('div', 'v92p-medl'); l.append(nodo('span', null, a), nodo('b', null, b)); V92P.med.appendChild(l); }
}
function v92Medidor(){                                           // o medidor pequeno na tela (só durante a partida)
  if (!V92.exp) return;
  let m = V92P.medidor;
  const quer = V92.cfg.medidor && !lobby.aberto;
  if (!quer){ if (m) m.hidden = true; return; }
  if (!m){ m = V92P.medidor = nodo('div', 'v92-medidor'); m.setAttribute('aria-hidden', 'true'); (document.getElementById('wrap') || document.body).appendChild(m); }
  m.hidden = false;
  const e = v92Estat(), f = (v, d) => v == null ? '—' : v92Num(v.toFixed(d));
  m.textContent = e.fps + ' fps · passos ×1 ' + e.passos[1] + '%' + (e.passos[0] + e.passos[2] + e.passos[3] ? ' (×0 ' + e.passos[0] + '%, ×2 ' + e.passos[2] + '%)' : '') +
    (NET49.playing ? ' · ping ' + Math.round(e.ping || 0) + ' ms · correção ' + f(e.corr, 2) + ' px · servidor ' + f(e.tps, 1) + '/s' : '') + (V92.slot ? ' · ' + (V92.slot.length === 1 ? 'memória ' : '') + V92.slot : '') + ' · ' + v92Curto(V92.cfg);
}
(function v92PausaAB(){                                          // o A ⇄ B na pausa (com as duas memórias guardadas)
  if (!V92.exp) return;
  const aj = document.getElementById('pa-ajustes'); if (!aj) return;
  const b = novoBotao('pa-bt v92-pa-ab'); b.id = 'pa-v92ab'; b.textContent = 'A ⇄ B'; b.hidden = true;
  const texto = () => 'A ⇄ B' + (V92.slot === 'A' || V92.slot === 'B' ? ' · agora ' + V92.slot + ' (' + v92Curto(V92.cfg) + ')' : '');
  b.addEventListener('click', () => { som.clique(); v92TrocaAB(); b.textContent = texto(); });
  aj.after(b);
  const d = novoBotao('pa-bt v92-pa-db'); d.id = 'pa-v92db';
  const textoD = () => 'DB: ' + (V92.cfg.fisica.dbModo === 1 ? 'POR ESTADOS' : 'ATUAL') + ' ⇄';
  d.addEventListener('click', () => {
    som.clique(); const vai = V92.cfg.fisica.dbModo === 1 ? 0 : 1; v92MudaDb({dbModo:vai}); d.textContent = textoD(); b.textContent = texto();
    x49Toast('DB ' + (vai ? 'por estados (experimental)' : 'atual') + (NET49.playing ? ' — na sala vale o perfil da sala' : '') + '.');
  });
  b.after(d);
  const antes = pausaAbre;
  pausaAbre = function(){ const r = antes.apply(this, arguments); b.hidden = !(V92.slots.A && V92.slots.B); b.textContent = texto(); d.textContent = textoD(); return r; };
})();
function v92PainelSync(){
  if (!V92P.sec) return;
  for (const k in V92P.partes) V92P.partes[k].hidden = k !== V92P.sub;
  v92Pinta(V92P.segs.sub, V92P.sub);
  for (const k in V92P.faixas){ const [lin, val] = V92P.faixas[k]; try { lin.v88Pinta(val()); } catch (_) {} }
  const c = V92.cfg;
  v92Pinta(V92P.segs.render, c.render); v92Pinta(V92P.segs.prev, c.previsao); v92Pinta(V92P.segs.bola, c.bolaPrev); v92Pinta(V92P.segs.quad, c.quadros);
  v92Pinta(V92P.segs.dir, c.fisica.direcoes); v92Pinta(V92P.segs.dbm, c.fisica.dbModo); v92Pinta(V92P.segs.dbp, c.fisica.dbParede); v92Pinta(V92P.segs.joy, hud.joy.adere ? 'flut' : 'fixo'); v92Pinta(V92P.segs.molde, typeof HUDM !== 'undefined' ? HUDM.molde : '');
  const ch = V92P.chaves; if (ch.dbo) ligado(ch.dbo, !!c.fisica.dbOrdem); if (ch.dbr) ligado(ch.dbr, !!c.fisica.dbRelogio); if (ch.dt) ligado(ch.dt, c.dtSnap); if (ch.fpsi) ligado(ch.fpsi, c.fpsInteiro); if (ch.aro) ligado(ch.aro, c.aroJusto); if (ch.med) ligado(ch.med, c.medidor);
  if (V92P.estado) V92P.estado.textContent = 'Agora vale ' + v92NomeCfg(c) + '.';
  if (V92P.usaA){ V92P.usaA.disabled = !V92.slots.A; V92P.usaB.disabled = !V92.slots.B; V92P.troca.disabled = !(V92.slots.A && V92.slots.B); }
  if (V92P.dv){ const f = c.fisica; V92P.dv.textContent = 'O PASSE dá ' + v92Num((f.forcaPasse/f.massaBola).toFixed(1)) + ' u/s à bola e o CHUTE ' + v92Num((f.forcaChute/f.massaBola).toFixed(1)) + ' u/s (v91: 21,3 e 34,0); a corrida é ' + v92Num(f.velJog.toFixed(1)) + ' u/s.'; }
  v92PintaTabela(); v92PintaSala();
  if (V92P.sub === 'medidas') v92PintaMedidas();
  if (V92P.sub === 'db') v92PintaDb();
}
