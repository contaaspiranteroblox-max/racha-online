'use strict';
/* RACHA v94 · a tabela dos parâmetros do motor próprio (docs/v94/PARAMETROS.md), tirada do próprio motor: o padrão, a
   faixa aceita, a unidade, o mesmo número em unidades de jogo (d = o diâmetro da tampinha, 0,8 m) e de onde veio
   ([obs] = medido nos vídeos, docs/v94/OBSERVACOES_VIDEOS.md; [dec] = decisão de projeto, sem confirmação nos vídeos).
   Uso: node tools/v94/parametros.js > docs/v94/PARAMETROS.md */
const M = require('../../server/partida/motor.js');
const d = 0.8, P = M.PADRAO, L = M.LIMITES;
const v = x => String(+x.toFixed(4)).replace('.', ',');
// chave: [o que faz, unidade, conversão para o jogo ('d' = m → d · 'ds' = m/s → d/s · 'ms' = passos → ms · 's' · '' ), origem]
const T = {
  vMax: ['a corrida da tampinha (a inclinação do analógico não muda)', 'm/s', 'ds', '[obs O3: 3,5–3,9 d/s]'],
  aAcel: ['a aceleração de arrancada', 'm/s²', 'acel', '[obs O4: ≤ 33–67 ms]'],
  aPara: ['a aceleração de parada (alvo zero)', 'm/s²', 'acel', '[obs O4]'],
  aVira: ['a aceleração na inversão (alvo contra a velocidade)', 'm/s²', 'acel2', '[obs O5: a mais rápida em 67 ms]'],
  zonaMorta: ['abaixo disto o comando é zero (só corta ruído; a zona morta de verdade é a do HUD)', '—', '', '[dec]'],
  meiaVida: ['o freio proporcional da bola: perde metade da velocidade neste tempo', 's', '', '[obs O7: ≈ 0,55 por segundo, com o atrito]'],
  atritoRolamento: ['o freio constante da bola (ela para de vez)', 'm/s²', '', '[dec]'],
  vParou: ['abaixo disto a bola para', 'm/s', 'ds', '[dec]'],
  vMaxBola: ['o teto da bola', 'm/s', 'ds', '[dec] acima do chute mais forte observado (O6)'],
  quiqueParede: ['quique da bola nas linhas', '—', '', '[dec]'], retParede: ['o que fica da velocidade de lado nas linhas', '—', '', '[dec]'],
  quiqueTrave: ['quique da bola na trave', '—', '', '[dec]'], retTrave: ['o que fica de lado na trave', '—', '', '[dec]'],
  quiqueRede: ['quique da bola na rede', '—', '', '[dec]'], retRede: ['o que fica de lado na rede', '—', '', '[dec]'],
  limiarQuique: ['batida mais lenta que isto não quica', 'm/s', 'ds', '[dec]'],
  quiqueJog: ['quique tampinha × tampinha', '—', '', '[dec]'],
  quiqueConducao: ['a bola que chega numa tampinha volta com esta fração (o domínio)', '—', '', '[dec]'],
  retConducao: ['o que fica da velocidade de lado da bola na tampinha', '—', '', '[dec]'],
  pesoBola: ['quanto a tampinha sente a bola (perde velocidade na direção dela)', '—', '', '[dec]'],
  impulsoConducao: ['empurrando, a bola sai pelo menos isto mais rápida que a tampinha (os toques da condução)', 'm/s', 'ds', '[dec]'],
  folgaChute: ['o alcance do chute além de encostar', 'm', 'd', '[dec] (o anel desenhado é maior: O2)'],
  vPasse: ['a velocidade do PASSE com a bola parada', 'm/s', 'ds', '[obs O6: ≈ 6,1 d/s, um caso]'],
  vChute: ['a velocidade do CHUTE com a bola parada', 'm/s', 'ds', '[obs O6: 9,4–10,2 d/s]'],
  heranca: ['quanto da velocidade que a bola já tinha a favor fica no chute', '—', '', '[dec]'],
  herancaLado: ['quanto da velocidade de lado da bola fica no chute', '—', '', '[dec]'],
  herancaCorrida: ['quanto da corrida da tampinha (na direção do chute) entra no chute', '—', '', '[dec]'],
  herancaCombo: ['a herança do CHUTE que completa o PASSE → CHUTE', '—', '', '[dec]'],
  janelaToque: ['o toque solto espera a bola por este tanto (o toque antecipado)', 'passos', 'ms', '[dec]'],
  intervaloMin: ['o mínimo entre dois chutes do mesmo jogador', 'passos', 'ms', '[dec]'],
  janelaParada: ['PASSE → CHUTE com a bola parada: o CHUTE até este tanto depois do PASSE', 'passos', 'ms', '[dec] (o DB parado difícil, pedido da v92)'],
  janelaMovel: ['PASSE → CHUTE com a bola andando', 'passos', 'ms', '[dec]'],
  protecaoParada: ['com a bola parada, o CHUTE depois da janela é anulado até este tanto', 'passos', 'ms', '[dec]'],
  protecaoMovel: ['o mesmo com a bola andando (0 = só a física decide)', 'passos', 'ms', '[dec]'],
  vParada: ['a bola "parada" para a combinação', 'm/s', 'ds', '[dec]'],
  paradaPassos: ['a bola que estava parada até este tanto antes ainda conta como parada', 'passos', 'ms', '[dec]'],
  cargaTempo: ['a CURVA carrega de 0 a 100% neste tempo', 's', '', '[dec]'], armadoTempo: ['solta, a CURVA fica armada por este tempo', 's', '', '[dec]'],
  vCurva0: ['a velocidade do chute de CURVA sem carga', 'm/s', 'ds', '[dec]'], vCurva1: ['o que a carga cheia soma', 'm/s', 'ds', '[dec]'],
  curvaK0: ['o efeito da CURVA sem carga', '1/s', '', '[dec]'], curvaK1: ['o que a carga cheia soma ao efeito', '1/s', '', '[dec]'],
  curvaT0: ['quanto tempo o efeito dura sem carga', 's', '', '[dec]'], curvaT1: ['o que a carga cheia soma ao tempo', 's', '', '[dec]'],
  areaPorJogador: ['o espaço de cada jogador (o campo cresce com o time)', 'd²', '', '[dec]'],
  proporcao1: ['comprimento ÷ largura no 1 VS 1', '—', '', '[dec]'], proporcaoPasso: ['quanto a proporção cai a cada jogador a mais', '—', '', '[dec]'],
  margemLado: ['da linha lateral ao limite da tampinha', 'd', '', '[obs O10: ≈ 1,3 d]'], margemFundo: ['da linha de fundo ao limite da tampinha', 'd', '', '[obs O10: ≈ 2,7 d]'],
  bocaBase: ['a boca do gol: a parte fixa', 'd', '', '[dec]'], bocaFator: ['a boca do gol: a fração da largura do campo', '—', '', '[dec]'],
  fundoGol: ['a profundidade do gol', 'd', '', '[dec]'], raioTrave: ['o raio da trave', 'd', '', '[dec]'],
  circuloBase: ['o círculo central: a parte fixa', 'd', '', '[dec]'], circuloFator: ['o círculo central: a fração da largura', '—', '', '[dec]'],
};
const R = M.resolve(P);
const jogo = (k, x) => {
  const c = T[k] ? T[k][2] : '';
  if (c === 'ds') return v(x / d) + ' d/s';
  if (c === 'd') return v(x / d) + ' d';
  if (c === 'ms') return Math.round(x * 1000 / 60) + ' ms';
  if (c === 'acel') return '0 → corrida em ' + Math.round(R.vMax / x * 1000) + ' ms';
  if (c === 'acel2') return '+corrida → −corrida em ' + Math.round(2 * R.vMax / x * 1000) + ' ms';
  return '';
};
const out = ['# RACHA v94 · os parâmetros do motor próprio', '',
  'Tirados do próprio motor (`server/partida/motor.js`: `M.PADRAO` e `M.LIMITES`) por `node tools/v94/parametros.js`. d = o diâmetro',
  'da tampinha (0,8 m); 1 passo = 1/60 s. **[obs]** = o número veio de uma medida dos vídeos (com a confiança de',
  '`docs/v94/OBSERVACOES_VIDEOS.md`); **[dec]** = decisão de projeto, sem confirmação nos vídeos. Todos ficam no painel',
  'AJUSTES › TESTES › MOTOR (os do campo valem a partir da próxima partida).', '',
  '| chave | o que faz | padrão | unidade | no jogo | faixa aceita | origem |', '|---|---|---|---|---|---|---|'];
for (const k of Object.keys(P)) {
  const t = T[k] || ['', '', '', ''];
  out.push('| `' + k + '` | ' + t[0] + ' | ' + v(P[k]) + ' | ' + t[1] + ' | ' + jogo(k, P[k]) + ' | ' + v(L[k][0]) + ' – ' + v(L[k][1]) + ' | ' + t[3] + ' |');
}
out.push('', 'Fixos (não são parâmetros): o raio da tampinha 0,40 m (d/2), o raio da bola 0,20 m ([obs O1: 0,47–0,50 do diâmetro]), o passo',
  'de 1/60 s, os subpassos (2 a 16, cada um com no máximo 0,35 × o raio da bola de deslocamento) e o "encostar" do evento toque',
  '(a distância entre os centros ≤ rJ + rB + 0,02 m).');
const sem = Object.keys(P).filter(k => !T[k]);
if (sem.length) out.push('', '(sem descrição: ' + sem.join(', ') + ')');
console.log(out.join('\n'));
