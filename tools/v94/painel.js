/* ======================================================================================================================
   RACHA v94 · o MOTOR no painel de testes (AJUSTES › TESTES — só na versão de testes, como o resto do painel).
   Uma parte nova, MOTOR: qual motor vale (o próprio, v94, ou o de antes) com o nome sempre à vista, o PADRÃO v94 (volta os
   números da especificação) e os números do motor próprio, em unidades de jogo (d = o diâmetro da tampinha). Os dois motores
   têm números separados (o `fisica` é do motor de antes, o `fisica94` do próprio): trocar de motor não mistura nada, e as
   memórias A/B guardam o motor junto (A ⇄ B compara o motor de antes com o próprio no mesmo lance).
   ====================================================================================================================== */
const V94_D = 0.8;                                               // (m) o diâmetro da tampinha — a régua do painel
const v94Fd = v => v92Virgula((v/V94_D).toFixed(2));
const V94_NOMES = [                                             // [chave, título, nota, formato]  (o mínimo e o máximo vêm do motor)
  ['g', 'O movimento'],
  ['vMax', 'Velocidade da tampinha', 'a corrida', v => v94Fd(v) + ' d/s · ' + v92Virgula(v.toFixed(2)) + ' m/s'],
  ['aAcel', 'Arrancada', 'de parado até a corrida em', v => Math.round(V94.R ? V94.R.vMax/v*1000 : 0) + ' ms (' + Math.round(v) + ' m/s²)'],
  ['aPara', 'Parada', 'da corrida até parar em', v => Math.round(V94.R ? V94.R.vMax/v*1000 : 0) + ' ms (' + Math.round(v) + ' m/s²)'],
  ['aVira', 'Inversão', 'de um lado até o outro em', v => Math.round(V94.R ? 2*V94.R.vMax/v*1000 : 0) + ' ms (' + Math.round(v) + ' m/s²)'],
  ['g', 'A bola'],
  ['meiaVida', 'Freio da bola', 'a bola perde metade da velocidade em', v => v92Virgula(v.toFixed(2)) + ' s'],
  ['atritoRolamento', 'Atrito do chão', 'o freio que faz a bola parar de vez', v => v92Virgula(v.toFixed(2)) + ' m/s²'],
  ['vMaxBola', 'Teto da bola', 'a bola mais rápida', v => v94Fd(v) + ' d/s'],
  ['g', 'As batidas'],
  ['quiqueParede', 'Quique nas linhas', '', v => v92Virgula(v.toFixed(2))],
  ['retParede', 'Raspão nas linhas', 'quanto da velocidade de lado fica', v => Math.round(v*100) + '%'],
  ['quiqueTrave', 'Quique na trave', '', v => v92Virgula(v.toFixed(2))],
  ['quiqueRede', 'Quique na rede', '', v => v92Virgula(v.toFixed(2))],
  ['quiqueJog', 'Trombada (tampinha × tampinha)', '', v => v92Virgula(v.toFixed(2))],
  ['quiqueConducao', 'Domínio', 'a bola que chega volta com', v => Math.round(v*100) + '% da velocidade'],
  ['impulsoConducao', 'Toque da condução', 'empurrando, a bola sai à frente a', v => v94Fd(v) + ' d/s'],
  ['pesoBola', 'Peso da bola na corrida', 'quanto a tampinha sente a bola', v => Math.round(v*100) + '%'],
  ['g', 'O chute'],
  ['vPasse', 'PASSE', 'a bola sai a', v => v94Fd(v) + ' d/s'],
  ['vChute', 'CHUTE', 'a bola sai a', v => v94Fd(v) + ' d/s'],
  ['folgaChute', 'Alcance a mais', 'além de encostar', v => v94Fd(v) + ' d'],
  ['heranca', 'Bola a favor ajuda', 'da velocidade que a bola já tinha', v => Math.round(v*100) + '%'],
  ['herancaLado', 'O chute limpa o lado', 'da velocidade de lado que fica', v => Math.round(v*100) + '%'],
  ['herancaCorrida', 'Chute correndo', 'da corrida que entra no chute', v => Math.round(v*100) + '%'],
  ['herancaCombo', 'PASSE → CHUTE', 'do PASSE que entra no CHUTE da combinação', v => Math.round(v*100) + '%'],
  ['g', 'Os comandos'],
  ['janelaToque', 'Toque antecipado', 'o toque espera a bola por', v => v + ' passos · ' + Math.round(v*1000/60) + ' ms'],
  ['intervaloMin', 'Intervalo entre chutes', '', v => v + ' passos · ' + Math.round(v*1000/60) + ' ms'],
  ['janelaParada', 'Combinação com a bola parada', 'o CHUTE até este tanto depois do PASSE', v => v + (v === 1 ? ' passo' : ' passos')],
  ['janelaMovel', 'Combinação com a bola andando', '', v => v + (v === 1 ? ' passo' : ' passos')],
  ['protecaoParada', 'Proteção da bola parada', 'depois da janela, o CHUTE é anulado até', v => v ? v + ' passos' : 'sem proteção'],
  ['g', 'O campo'],
  ['areaPorJogador', 'Espaço de cada jogador', 'o tamanho do campo cresce com o time', v => Math.round(v) + ' d²'],
  ['proporcao1', 'Comprimento ÷ largura (1 VS 1)', '', v => v92Virgula(v.toFixed(2))],
  ['bocaFator', 'Tamanho do gol', 'a boca em fração da largura', v => Math.round(v*100) + '%'],
];
function v94MudaFis(k, v){
  const f = Object.assign({}, V92.cfg.fisica94); f[k] = v;
  V92.cfg.fisica94 = V94M.perfil(f);
  v92Mudou();
}
function v94ParteMotor(sec){
  const g = v92Grupo('O motor da partida', 'O próprio (v94) foi escrito pela especificação de docs/v94; o de antes é o que o jogo usava até a v93. Vale no treino e contra os bots na hora; na sala online vale o motor da sala.');
  V94P.estado = nodo('p', 'ajx-nota v94p-estado'); V94P.estado.setAttribute('aria-live', 'polite');
  g.append(V94P.estado, v92Seg('motor', 'O motor da partida', [['v94', 'MOTOR PRÓPRIO', 'v94'], ['v93', 'MOTOR DE ANTES', 'até a v93']], v => {
    V92.cfg.motor = v === 'v94' ? 'v94' : 'v93'; v92Mudou();
  }));
  const lin = nodo('div', 'ajx-seg v92p-linha');
  lin.append(v92Acao('PADRÃO v94', () => v92Usa(v94CfgPadrao(), 'v94')));
  g.appendChild(lin);
  sec.appendChild(g);
  if (!V94M) return;
  const ga = v92Grupo('O analógico e a câmera', 'Com o motor próprio a direção vai contínua (a inclinação não muda a velocidade); para comparar, dá para arredondar em 32, 16 ou 8 direções. A câmera dos vídeos mostra 23 × 13 d e puxa pouco para a bola.');
  ga.appendChild(v92Seg('direcoes94', 'As direções do analógico', [['0', 'LIVRE', 'contínua'], ['32', '32'], ['16', '16'], ['8', '8']], v => {
    V92.cfg.direcoes94 = [0, 8, 16, 32].includes(+v) ? +v : 0; v92Mudou();
  }));
  ga.appendChild(v92Seg('camera94', 'A câmera', [['obs', 'A DOS VÍDEOS', '23 × 13 d · puxa pouco para a bola'], ['antes', 'A DE ANTES', 'o enquadramento de sempre']], v => {
    V92.cfg.camera94 = v === 'antes' ? 'antes' : 'obs'; v92Mudou();
  }));
  sec.appendChild(ga);
  let grupo = null;
  for (const it of V94_NOMES){
    if (it[0] === 'g'){ grupo = v92Grupo(it[1]); sec.appendChild(grupo); continue; }
    const [k, t, n, fmt] = it, L = V94M.LIMITES[k], p0 = V94_PERFIL_PADRAO[k];
    const passo = Number.isInteger(p0) && Number.isInteger(L[0]) && Number.isInteger(L[1]) && L[1] - L[0] <= 40 ? 1 : (L[1] - L[0])/200;
    const lin = v92Faixa('m-' + k, t, n, L[0], L[1], passo, V92.cfg.fisica94[k], fmt, v => v94MudaFis(k, v), fmt(p0).replace(/^v94: /, ''));
    const s = lin.querySelector('small.v92p-nota'); if (s) s.textContent = s.textContent.replace('v91:', 'padrão:');
    V92P.faixas['m-' + k] = [lin, () => V92.cfg.fisica94[k]];
    grupo.appendChild(lin);
  }
  V94P.campo = nodo('p', 'ajx-nota v94p-campo'); sec.appendChild(V94P.campo);
}
const V94P = {estado:null, campo:null};
(function(){
  if (!V92P.sec || !V92P.segs.sub) return;                       // (a versão oficial não tem o painel)
  const b = novoBotao(''); b.dataset.v = 'motor'; b.setAttribute('aria-pressed', 'false'); b.textContent = 'MOTOR';
  V92P.segs.sub.insertBefore(b, V92P.segs.sub.firstChild);
  const d = nodo('div', 'v92p-parte'); d.dataset.parte = 'motor';
  v94ParteMotor(d);
  V92P.sec.insertBefore(d, V92P.partes.perfis || null); V92P.partes.motor = d;
  V92P.sub = 'motor';
  // (o botão PADRÃO v92 dos PERFIS passa a deixar claro que é o motor de antes)
  for (const x of V92P.partes.perfis.querySelectorAll('button')) if (/PADRÃO v92/.test(x.textContent)) x.textContent = 'PADRÃO v92 (MOTOR DE ANTES)';
})();
function v94NomeMotor(c){ return c && c.motor === 'v94' ? 'o MOTOR PRÓPRIO (v94)' : 'o MOTOR DE ANTES (até a v93)'; }
const v94NomeCfgAntes = v92NomeCfg;
v92NomeCfg = function(c){
  const igual = (a, b) => JSON.stringify(v92Limpa(a)) === JSON.stringify(v92Limpa(b));
  if (igual(c, v94CfgPadrao())) return 'o Padrão v94 (o motor próprio)';
  return v94NomeCfgAntes(c) + ' · com ' + v94NomeMotor(c);
};
const v94PlanoAntes = v92Plano;
v92Plano = function(c){
  const o = v94PlanoAntes(Object.assign({}, c, {fisica94:undefined}));
  delete o.fisica94;
  if (c && c.fisica94) for (const k in c.fisica94) o['m.' + k] = c.fisica94[k];
  return o;
};
V92_ROTULOS.motor = 'Motor'; V92_ROTULOS.direcoes94 = 'Direções do analógico (motor próprio)'; V92_ROTULOS.camera94 = 'Câmera (motor próprio)';
for (const it of V94_NOMES) if (it[0] !== 'g') V92_ROTULOS['m.' + it[0]] = 'Motor próprio: ' + it[1].toLowerCase();
const v94SyncAntes = v92PainelSync;
v92PainelSync = function(){
  v94SyncAntes();
  if (!V92P.sec) return;
  const c = V92.cfg;
  v92Pinta(V92P.segs.motor, c.motor); v92Pinta(V92P.segs.direcoes94, c.direcoes94 | 0); v92Pinta(V92P.segs.camera94, c.camera94 || 'obs');
  if (V94P.estado) V94P.estado.textContent = 'Agora vale ' + v94NomeMotor(c) + (c.motor === 'v94' ? (JSON.stringify(c.fisica94) === JSON.stringify(V94_PERFIL_PADRAO) ? ', com os números padrão.' : ', com números ajustados.') : '.');
  const so94 = c.motor === 'v94';
  // (não misturar: os números de um motor ficam apagados enquanto vale o outro — a física de números, o DB, o toque armado,
  //  o intervalo dos botões e as direções da v92 são do motor de antes; os da parte MOTOR, do próprio)
  const doAntes = k => k.slice(0, 2) === 'f-' || k.slice(0, 3) === 'db-' || k === 'buf' || k === 'cool';
  for (const k in V92P.faixas){
    const lin = V92P.faixas[k][0];
    if (k.slice(0, 2) === 'm-') lin.style.opacity = so94 ? '' : '.45';
    else if (doAntes(k)) lin.style.opacity = so94 ? '.45' : '';
  }
  if (V92P.segs.dir) V92P.segs.dir.style.opacity = so94 ? '.45' : '';
  if (V94P.campo && V94M && V94.R){
    const t = [1, 2, 3, 4].map(n => { const G = V94M.campo(n, V94.R); return n + ' VS ' + n + ': ' + v94Fd(G.L) + ' × ' + v94Fd(G.W) + ' d (gol ' + v94Fd(G.boca) + ' d)'; });
    V94P.campo.textContent = 'O campo de cada tamanho: ' + t.join(' · ') + '.';
  }
};
// as memórias A e B prontas para comparar os dois motores (uma vez por aparelho: as que você guardar depois ficam)
(function(){
  if (!V92.exp || !V94M) return;
  let feito = false; try { feito = localStorage.getItem('racha-v94-ab') === '1'; } catch (_) {}
  if (feito) return;
  V92.slots.A = v94CfgPadrao();
  V92.slots.B = v92Limpa(Object.assign({}, V92_PADRAO, {motor:'v93'}), V92_PADRAO);
  try { localStorage.setItem('racha-v94-ab', '1'); } catch (_) {}
  v92Salva();
})();
// na pausa: MOTOR ⇄ (troca o motor na hora, no treino e contra os bots); o DB da v92 é do motor de antes (some com o próprio)
(function(){
  if (!V92.exp) return;
  const d = document.getElementById('pa-v92db'), ab = document.getElementById('pa-v92ab'); if (!d) return;
  const m = novoBotao('pa-bt v94-pa-motor'); m.id = 'pa-v94motor';
  const texto = () => 'MOTOR: ' + (V92.cfg.motor === 'v94' ? 'PRÓPRIO' : 'DE ANTES') + ' ⇄';
  m.addEventListener('click', () => {
    som.clique(); V92.cfg.motor = V92.cfg.motor === 'v94' ? 'v93' : 'v94'; v92Mudou();
    m.textContent = texto(); d.hidden = V92.cfg.motor === 'v94'; if (ab) ab.textContent = ab.textContent.replace(/\(.*\)$/, '(' + v92Curto(V92.cfg) + ')');
    x49Toast('Agora vale ' + v94NomeMotor(V92.cfg) + (NET49.playing ? ' — na sala vale o motor da sala' : '') + '.');
  });
  d.after(m);
  const antes = pausaAbre;
  pausaAbre = function(){ const r = antes.apply(this, arguments); m.textContent = texto(); d.hidden = V92.cfg.motor === 'v94'; return r; };
})();
// MANDAR PARA A SALA (o admin, no servidor de testes): o motor e os números do motor próprio vão junto com o perfil de antes
const v94MandaSalaAntes = v92MandaSala;
v92MandaSala = function(){
  const r = NET49.room;
  if (!r || !NET49.ws || !r.experimental || r.state === 'playing' || !(typeof slDono === 'function' && slDono(r))) return v94MandaSalaAntes.apply(this, arguments);
  net49Send({type:'config', fisica:V92.cfg.fisica, quadros:V92.cfg.quadros, motor:V92.cfg.motor === 'v94' ? 'v94' : 'v93', fisica94:V92.cfg.fisica94});
  x49Toast('Perfil mandado para a sala (' + (V92.cfg.motor === 'v94' ? 'motor próprio' : 'motor de antes') + ').');
};
const v94PintaSalaAntes = v92PintaSala;
v92PintaSala = function(){
  v94PintaSalaAntes.apply(this, arguments);
  const r = NET49.room; if (!V92P.sala || !r || !r.servidor) return;
  V92P.sala.textContent += ' · motor da sala: ' + (r.motor === 'v94' ? 'o PRÓPRIO (v94)' : 'o de antes') + (r.motorRodada && r.motorRodada !== r.motor ? ' (esta rodada: ' + (r.motorRodada === 'v94' ? 'o próprio' : 'o de antes') + ')' : '');
};
