'use strict';
/* RACHA v92 · O DB (PASSE + CHUTE) POR ESTADOS — sem navegador (passa/falha).
   Confere, com a física das salas (server/partida/nucleo.js) e o motor da sala de verdade (server/partida/sala.js):
     0. o modo 0 (o DB atual, o padrão e a versão oficial) é EXATAMENTE o de antes: o núcleo novo × a cópia de antes
        (tests/v92_db/ref_nucleo_v92.js), em todos os cenários, intervalos e fases; o perfil padrão tem dbModo 0;
     1. as 9 regras pedidas, uma a uma, no DB por estados (dbModo 1);
     2. o consumo dos comandos, o mínimo entre chutes, a regra de ms (dbRelogio) e o estado que vai no quadro;
     3. as dificuldades: a chance do melhor jogador em cada cenário (parado, parado correndo, colado, girando, de lado,
        normal, parede), o DB atual × o por estados;
     4. o servidor de verdade × a previsão do aparelho: o mesmo resultado em todas as jogadas (com o DB atual não: o
        servidor recusa o CHUTE no passo seguinte e a previsão mostra o DB), também com a rede atrasando os comandos — o
        ping não muda a decisão.
   Uso: node tests/v92_db_test.cjs */
const L = require('./v92_db/lab.cjs');
const { servidor } = require('./v92_db/servidor.cjs');
const REF = require('./v92_db/ref_nucleo_v92.js');
const S = require('../server/partida/sala.js');
const N = L.N, STEP = L.STEP;

let ok = 0; const falhas = [];
const confere = (c, o, d) => { if (c) { ok++; console.log('  OK      ' + o); } else { falhas.push(o); console.log('  FALHOU  ' + o + (d !== undefined ? '  ·  ' + JSON.stringify(d).slice(0, 400) : '')); } return c; };
const t0 = Date.now();
const EXP = L.PERFIS.exp, V92 = N.PERFIL_V92;
const com = (o) => Object.assign({}, EXP, o);
const nuc = perfil => ({ maq: 'nuc', perfil });
const uma = (cen, perfil, toques, o) => L.jogada(cen, nuc(perfil), toques, o);
const f = r => r.imp.map(x => x.f + '@' + x.passo).join(' ');
const evs = r => r.ev.map(e => e.e);

/* ================================================================ 0. o modo 0 é o de antes */
console.log('\n0) o DB atual (dbModo 0) não mudou');
confere(V92.dbModo === 0 && N.PERFIL_V91.dbModo === 0, 'o perfil padrão (v92) e o da v91 têm dbModo 0: a versão oficial usa o DB atual');
{
  const p = N.perfilLimpo({ dbModo: 7, dbJanelaParada: 2.6, dbProtecaoParada: 99, dbVParada: -3, dbRelogio: 0.4, dbAnulaMs: 'x', dbJanelaMs: 40, lixo: 1 });
  confere(p.dbModo === 1 && p.dbJanelaParada === 3 && p.dbProtecaoParada === 12 && p.dbVParada === 0 && p.dbRelogio === 0 && p.dbAnulaMs === V92.dbAnulaMs && p.dbJanelaMs === 16 && !('lixo' in p),
    'o perfil de fora é limpo: só os campos conhecidos, inteiros arredondados, sim/não, cortados nos limites', p);
  confere(N.PERFIL_V92.forcaPasse === 212.5 && EXP.forcaPasse === 212.5 && EXP.forcaChute === N.PERFIL_V92.forcaChute && EXP.forcaChute === 360 && EXP.raioChute === 2.5,
    'o DB por estados não mexe na física: a força do PASSE (212,5), a do CHUTE (360 desde a v103) e o alcance (2,5 + 1 u) são os do padrão');
}
{
  let n = 0, dif = 0; const ex = [];
  for (const cen of L.NOMES) for (const perfil of [N.PERFIL_V91, V92]) {
    const t00 = L.CENARIOS[cen](N.resolve(perfil)).t0;
    for (const d of L.DELTAS) for (let fa = 0; fa < 12; fa += 2) for (const dur of [30, 120]) {
      const tP = t00 + (fa + 0.5) * STEP / 12, toques = [{ tipo: 'p', t: tP, dur }, { tipo: 'c', t: tP + d, dur }];
      for (const maq of ['nuc', 'srv']) {
        const a = L.jogada(cen, { maq, perfil }, toques, { fase: fa }), b = L.jogada(cen, { maq, perfil }, toques, { fase: fa, nucleo: REF });
        n++;
        if (f(a) !== f(b) || Math.abs(a.vmax - b.vmax) > 1e-9) { dif++; if (ex.length < 3) ex.push([cen, d, fa, f(a), f(b)]); }
      }
    }
  }
  confere(dif === 0, 'o núcleo novo com dbModo 0 dá os MESMOS chutes e a mesma bola que o núcleo de antes (' + n + ' jogadas: 8 cenários × 23 intervalos × 6 fases × 2 durações × v91/v92 × previsão/servidor)', ex);
}

/* ================================================================ 1. as 9 regras */
console.log('\n1) as regras pedidas (DB por estados)');
// parado: o passo 12 vai de 183,3 a 200 ms (um toque nesse intervalo vale no passo 12)
{
  const r1 = uma('parado', EXP, [{ tipo: 'c', t: 195, dur: 30 }]), r1p = uma('parado', EXP, [{ tipo: 'p', t: 195, dur: 30 }]);
  confere(f(r1) === 'c@12' && f(r1p) === 'p@12', '1. sem atraso: o CHUTE e o PASSE sozinhos saem no mesmo passo do toque (nenhum toque espera)', [f(r1), f(r1p)]);
  const sim = uma('parado', EXP, [{ tipo: 'p', t: 190, dur: 30 }, { tipo: 'c', t: 190, dur: 30 }]);
  const sim2 = uma('parado', EXP, [{ tipo: 'p', t: 186, dur: 30 }, { tipo: 'c', t: 197, dur: 30 }]);
  confere(f(sim) === 'p@12' && evs(sim).includes('anulaMesmoPasso') && f(sim2) === 'p@12',
    '2. os dois no mesmo passo: a prioridade é do PASSE e o CHUTE é anulado (juntos ou com o CHUTE 11 ms depois, ainda no mesmo passo)', [f(sim), evs(sim), f(sim2)]);
  const r3 = uma('parado', EXP, [{ tipo: 'p', t: 190, dur: 30 }, { tipo: 'c', t: 191.5, dur: 30 }]);
  confere(f(r3) === 'p@12', '3. o CHUTE 1,5 ms depois do PASSE é anulado', f(r3));
  // 4: os dois toques dos dois lados da divisa do passo: o CHUTE cai no passo seguinte
  const r4 = uma('parado', EXP, [{ tipo: 'p', t: 198, dur: 30 }, { tipo: 'c', t: 202, dur: 30 }]);
  const r4b = uma('parado', EXP, [{ tipo: 'p', t: 195, dur: 30 }, { tipo: 'c', t: 211, dur: 30 }]);
  confere(f(r4) === 'p@12 c@13' && r4.vmax > 46.7 && f(r4b) === 'p@12 c@13',
    '4. o CHUTE que chega no passo seguinte ao PASSE completa o DB (4 ms depois, do outro lado da divisa do passo, ou 16 ms) — a bola no teto, 46,75 u/s', [f(r4), r4.vmax, f(r4b)]);
  // 5: a bola parada já saiu do alcance: com a tampinha parada é a física; correndo atrás da bola, a proteção
  const r5a = uma('parado', EXP, [{ tipo: 'p', t: 195, dur: 30 }, { tipo: 'c', t: 225, dur: 30 }]);
  const tc = L.CENARIOS.parado_correndo(N.resolve(EXP)).t0;
  const r5b = uma('parado_correndo', EXP, [{ tipo: 'p', t: tc + 1, dur: 30 }, { tipo: 'c', t: tc + 1 + 30, dur: 30 }]);
  const r5c = uma('parado_correndo', V92, [{ tipo: 'p', t: tc + 1, dur: 30 }, { tipo: 'c', t: tc + 1 + 30, dur: 30 }]);
  confere(!r5a.db && !r5b.db && evs(r5b).includes('foraDaJanela') && r5c.db,
    '5. a bola inicialmente parada, em campo aberto: o CHUTE 2 passos depois do PASSE não pega mais — de pé ela já saiu do alcance; correndo atrás dela, a proteção anula (no DB atual esse DB sai)', [f(r5a), f(r5b), evs(r5b), f(r5c)]);
  // 6: o PASSE segurado é consumido ao encostar; um CHUTE depois completa o DB; segurando, não chuta de novo
  const r6b = uma('parado', EXP, [{ tipo: 'p', t: 150, dur: 600 }]);
  const pP = r6b.imp.length ? r6b.imp[0].passo : -1;     // (o passo em que o PASSE segurado saiu)
  const r6 = uma('parado', EXP, [{ tipo: 'p', t: 150, dur: 400 }, { tipo: 'c', t: pP * STEP + 5, dur: 30 }]);
  const r6v = L.jogada('parado', { maq: 'srv', perfil: V92 }, [{ tipo: 'p', t: 150, dur: 400 }, { tipo: 'c', t: pP * STEP + 5, dur: 30 }]);
  confere(r6.db && r6.gap === 1 && r6b.imp.length === 1 && !r6v.db,
    '6. o PASSE segurado sai ao encostar e deixa de valer (segurando 600 ms: um PASSE só); o CHUTE no passo seguinte completa o DB, com o PASSE ainda apertado (no servidor de hoje, não: 33 ms)', [f(r6), f(r6b), f(r6v)]);
  // (segurando o PASSE chegando correndo, ele sai na BORDA do alcance — 3,4 u, antes de encostar — e a bola já sai do
  // alcance antes do passo seguinte: o DB não sai em nenhuma das duas mecânicas; é a física, não a regra)
  const rb = uma('parado_correndo', EXP, [{ tipo: 'p', t: 120, dur: 600 }]), pb = rb.imp.length ? rb.imp[0].passo : -1;
  const rb2 = uma('parado_correndo', EXP, [{ tipo: 'p', t: 120, dur: 400 }, { tipo: 'c', t: pb * STEP + 5, dur: 30 }]);
  const rb3 = uma('parado_correndo', V92, [{ tipo: 'p', t: 120, dur: 400 }, { tipo: 'c', t: pb * STEP + 5, dur: 30 }]);
  confere(!rb2.db && !rb3.db, '   (segurando o PASSE chegando correndo, ele sai na borda do alcance e a bola foge antes do passo seguinte: sem DB nas duas mecânicas — a física)', [f(rb2), f(rb3)]);
  // 7: o CHUTE primeiro: a prioridade é dele (no mesmo passo, pelo relógio do toque; ou num passo antes)
  const r7 = uma('parado', EXP, [{ tipo: 'c', t: 188, dur: 30 }, { tipo: 'p', t: 192, dur: 30 }]);
  const r7b = uma('parado_correndo', EXP, [{ tipo: 'c', t: tc - 16, dur: 30 }, { tipo: 'p', t: tc + 2, dur: 30 }]);
  confere(f(r7) === 'c@12' && evs(r7).includes('anulaPasse') && r7b.imp.length === 1 && r7b.imp[0].f === 'c',
    '7. o CHUTE primeiro: ele sai e o PASSE logo depois é anulado (no mesmo passo pelo relógio do toque; no passo seguinte pela proteção da bola parada)', [f(r7), evs(r7), f(r7b), evs(r7b)]);
  const r7c = uma('parado', com({ dbOrdem: 0 }), [{ tipo: 'c', t: 188, dur: 30 }, { tipo: 'p', t: 192, dur: 30 }]);
  confere(f(r7c) === 'p@12', '   (sem o relógio do toque, dbOrdem 0: no mesmo passo o PASSE sempre ganha)', f(r7c));
  // 8: o DB andando continua: colado, girando, de lado e normal
  const db8 = {};
  for (const cen of ['colado', 'girando', 'lateral', 'normal']) {
    const t = L.CENARIOS[cen](N.resolve(EXP)).t0, a = uma(cen, EXP, [{ tipo: 'p', t: t + 1, dur: 30 }, { tipo: 'c', t: t + 1 + 16.6, dur: 30 }]);
    db8[cen] = a.db ? a.gap : 0;
  }
  const tn = L.CENARIOS.normal(N.resolve(EXP)).t0, n2 = uma('normal', EXP, [{ tipo: 'p', t: tn + 1, dur: 30 }, { tipo: 'c', t: tn + 1 + 30, dur: 30 }]);
  confere(db8.colado === 1 && db8.girando === 1 && db8.lateral === 1 && db8.normal === 1 && n2.db && n2.gap === 2,
    '8. o DB andando continua: colado, girando e de lado com o CHUTE no passo seguinte; o normal também com 2 passos (a bola fica mais no alcance)', [db8, f(n2)]);
  // 9: a parede: só a física decide por padrão; com dbParede 1, as regras do campo aberto
  const tw = L.CENARIOS.parede(N.resolve(EXP)).t0, toqW = [{ tipo: 'p', t: tw - 4, dur: 30 }, { tipo: 'c', t: tw - 4 + 50, dur: 30 }];
  const w0 = uma('parede', EXP, toqW), w1 = uma('parede', com({ dbParede: 1 }), toqW), wv = uma('parede', V92, toqW);
  confere(w0.db && w0.gap === 3 && wv.db && !w1.db && evs(w1).includes('foraDaJanela'),
    '9. na parede a bola volta para o pé: o DB 3 passos depois continua (como hoje); só com dbParede 1 a parede usa a janela do campo aberto', [f(w0), f(wv), f(w1)]);
  const ctxW = w0.ev.find(e => e.e === 'passe');
  confere(ctxW && ctxW.ctx === 2, '   (a jogada de parede é reconhecida: a bola a menos de 2 u da linha)', ctxW);
}

/* ================================================================ 2. o consumo, o mínimo, a regra de ms e o quadro */
console.log('\n2) o consumo dos comandos, o mínimo entre chutes, a regra de ms e o estado no quadro');
{
  const tc = L.CENARIOS.parado_correndo(N.resolve(EXP)).t0;
  // o CHUTE apertado antes do PASSE sair (os dois armados esperando a bola) não completa o DB
  const a = uma('parado_correndo', EXP, [{ tipo: 'p', t: 150, dur: 20 }, { tipo: 'c', t: 175, dur: 20 }]);
  confere(a.imp.length === 1 && a.imp[0].f === 'p' && evs(a).includes('consumido'), 'um chute consome o outro comando: o CHUTE apertado antes do PASSE sair (os dois esperando a bola) não sai depois', [f(a), evs(a)]);
  // um toque armado que não encontra a bola expira
  const b = uma('parado_correndo', EXP, [{ tipo: 'c', t: 20, dur: 10 }]);
  confere(b.imp.length === 0 && evs(b).includes('expirou'), 'o toque armado vale pelos passos do bufferToque e depois expira (a bola longe)', [f(b), evs(b)]);
  // o mínimo entre dois chutes fora do par do DB (os 2 passos do servidor): na parede, CHUTE e logo depois PASSE
  const tw = L.CENARIOS.parede(N.resolve(EXP)).t0;
  const c = uma('parede', EXP, [{ tipo: 'c', t: tw - 4, dur: 20 }, { tipo: 'p', t: tw - 4 + 14, dur: 20 }]);
  confere(c.imp.length === 2 && c.imp[0].f === 'c' && c.imp[1].passo - c.imp[0].passo === 2, 'fora do par PASSE → CHUTE vale o mínimo de 2 passos entre chutes (o PASSE armado espera o passo dele, sem atraso a mais)', f(c));
  // a regra de ms (dbRelogio 1): no mesmo passo, 3 ms completa (os dois na mesma hora); 1 ms anula; do outro lado da divisa, 8 ms anula
  const R = com({ dbRelogio: 1 });
  const m3 = uma('parado', R, [{ tipo: 'p', t: 190, dur: 30 }, { tipo: 'c', t: 193, dur: 30 }]);
  const m1 = uma('parado', R, [{ tipo: 'p', t: 190, dur: 30 }, { tipo: 'c', t: 191, dur: 30 }]);
  const m8 = uma('parado', R, [{ tipo: 'p', t: 196, dur: 30 }, { tipo: 'c', t: 204, dur: 30 }]);
  const m4 = uma('parado', R, [{ tipo: 'p', t: 198, dur: 30 }, { tipo: 'c', t: 202, dur: 30 }]);
  confere(f(m3) === 'p@12 c@12' && m3.vmax > 46.7 && f(m1) === 'p@12' && f(m8) === 'p@12' && f(m4) === 'p@12 c@13',
    'a regra de ms (para comparar): 3 ms completa no mesmo passo, 1 ms anula, 8 ms já não pega (a bola parada "saiu"), 4 ms do outro lado da divisa completa', [f(m3), f(m1), f(m8), f(m4)]);
  // a varredura da tela de toque: com 120 Hz (8,33 ms) o relógio do toque não vê 2–5 ms — os dedos caem na mesma leitura ou 8,33 ms longe
  let dbs = 0, n = 0;
  for (let fa = 0; fa < 24; fa++) for (const d of [2, 3, 4, 5]) { n++; const r = uma('parado', R, [{ tipo: 'p', t: 186 + fa * 0.5, dur: 30 }, { tipo: 'c', t: 186 + fa * 0.5 + d, dur: 30 }], { varredura: 1000 / 120, fase: fa }); if (r.db) dbs++; }
  confere(dbs === 0, 'com a tela de toque lendo a 120 Hz, a regra de 2–5 ms nunca dá o DB (' + dbs + ' de ' + n + '): o intervalo medido é 0 ou 8,3 ms', dbs);
  // o estado da máquina no quadro: compactar e voltar dá a mesma máquina (a previsão continua do servidor)
  let iguais = 0, tot = 0;
  for (const cen of ['parado', 'parado_correndo', 'colado', 'parede']) for (let k = 0; k < 18; k++) {
    const t = L.CENARIOS[cen](N.resolve(EXP)).t0, toq = [{ tipo: 'p', t: t - 20 + k * 3, dur: 15 + k * 7 }, { tipo: 'c', t: t - 6 + k * 4, dur: 20 }];
    const C = N.resolve(com({ dbRelogio: k % 2 })), r = L.jogada(cen, nuc(com({ dbRelogio: k % 2 })), toq, {});
    for (let corte = 2; corte < 40; corte += 3) {
      // roda a máquina até o corte, compacta, descompacta numa nova e segue as duas com os mesmos comandos
      const A = L.jogada(cen, nuc(com({ dbRelogio: k % 2 })), toq, { passos: corte });
      const b1 = N.novoBotao(), b2 = N.novoBotao();
      const W = L.CENARIOS[cen](C).M, W2 = L.CENARIOS[cen](C).M;
      for (const c of A.cmds) { N.botaoComando(b1, c, C); N.botaoTick(W, C, W.jog[0], b1, (q, fo) => N.chute(W, C, q, fo)); N.passo(W, C, null); }
      const ack = A.cmds[A.cmds.length - 1].seq;
      N.dbUnpack(b2, N.dbPack(b1, ack), ack); b2.kc = b1.kc; b2.pc = b1.pc; b2.hp = b1.hp; b2.hc = b1.hc;
      W2.B = Object.assign({}, W.B); W2.jog[0] = Object.assign({}, W.jog[0]);
      let mesmo = true;
      for (const c of r.cmds.slice(corte)) {
        const x1 = N.botaoComando(b1, c, C), x2 = N.botaoComando(b2, c, C);
        const k1 = N.botaoTick(W, C, W.jog[0], b1, (q, fo) => N.chute(W, C, q, fo)), k2 = N.botaoTick(W2, C, W2.jog[0], b2, (q, fo) => N.chute(W2, C, q, fo));
        N.passo(W, C, null); N.passo(W2, C, null);
        if (x1 !== x2 || k1 !== k2 || W.B.vx !== W2.B.vx) { mesmo = false; break; }
      }
      tot++; if (mesmo) iguais++;
    }
  }
  confere(iguais === tot, 'o estado do DB que vai no quadro do servidor (compactado) devolve a mesma máquina: ' + iguais + ' de ' + tot + ' cortes no meio das jogadas seguem iguais');
}

/* ================================================================ 3. as dificuldades */
console.log('\n3) as dificuldades (a chance do DB por cenário: o jogador com os dedos mais certinhos, ±5 e ±10 ms, e o comum, 15±8 / 30±12 ms)');
const TAB = {};
{
  const mecs = { 'atual (servidor)': L.MECS['v92 servidor'], 'atual (treino)': L.MECS['v92 treino'], 'por estados': L.MECS.estados };
  for (const cen of L.NOMES) {
    TAB[cen] = {};
    for (const m in mecs) {
      const ls = L.varre(cen, mecs[m]);
      TAB[cen][m] = { m5: L.melhor(ls, 5).chance, m10: L.melhor(ls, 10).chance, c15: L.chance(ls, 15, 8), c30: L.chance(ls, 30, 12) };
    }
    const p = x => String(Math.round(x * 100)).padStart(3) + '%';
    console.log('  ' + cen.padEnd(16) + Object.keys(mecs).map(m => m + ': ' + p(TAB[cen][m].m5) + p(TAB[cen][m].m10) + ' |' + p(TAB[cen][m].c15) + p(TAB[cen][m].c30)).join('   '));
  }
  const E = c => TAB[c]['por estados'], A = c => TAB[c]['atual (servidor)'];
  confere(E('parado_correndo').m10 < A('parado_correndo').m10 - 0.2 && E('parado_correndo').c30 < A('parado_correndo').c30 - 0.3,
    'o DB parado chegando na bola (o fácil de hoje) fica bem mais difícil: o melhor jogador ±10 ms cai de ' + Math.round(A('parado_correndo').m10 * 100) + '% para ' + Math.round(E('parado_correndo').m10 * 100) + '%, o comum (30±12 ms) de ' + Math.round(A('parado_correndo').c30 * 100) + '% para ' + Math.round(E('parado_correndo').c30 * 100) + '%');
  confere(['parado', 'parado_correndo', 'colado', 'girando', 'lateral'].every(c => Math.abs(E(c).m10 - E('colado').m10) < 0.03) && E('normal').m10 > E('colado').m10 + 0.05 && E('parede').m10 > E('normal').m10,
    'por estados as dificuldades ficam em três degraus: parado, colado, girando e de lado (o CHUTE no passo seguinte) < normal (até 2 passos) < parede (a bola volta)');
  confere(E('parede').m10 === A('parede').m10 && E('normal').m10 === A('normal').m10, 'a parede e o DB normal ficam como no servidor de hoje');
}

/* ================================================================ 4. o servidor de verdade × a previsão */
console.log('\n4) o servidor de verdade × a previsão do aparelho');
{
  const rel = JSON.parse(require('fs').readFileSync(__dirname + '/v92_db/relogio_motor_carga.json', 'utf8')).t;
  const conta = (perfil, o) => {
    let n = 0, dif = 0, dbs = 0, susp = 0; const ex = [];
    for (const cen of o.cens || L.NOMES) {
      const t00 = L.CENARIOS[cen](N.resolve(perfil)).t0;
      for (const d of [0, 4, 8, 12, 16, 20, 25, 30, 40]) for (let fa = 0; fa < 12; fa += o.passo || 1) {
        const tP = t00 + (fa + 0.5) * STEP / 12, toques = [{ tipo: 'p', t: tP, dur: 40 }, { tipo: 'c', t: tP + d, dur: 40 }];
        const s = servidor(cen, perfil, toques, Object.assign({ fase: fa }, o.extra ? o.extra(fa, d) : {}));
        n++; dbs += s.lab.db ? 1 : 0; susp += s.susp.length ? 1 : 0;
        const kS = s.imp.map(x => x.passo), kP = s.lab.imp.map(x => x.passo);
        const atras = (o.extra && o.extra(fa, d).desloca) || 0;
        if (Math.abs(s.vmax - s.lab.vmax) > 0.05 || kS.length !== kP.length || kS.some((x, i) => x - atras !== kP[i])) { dif++; if (ex.length < 2) ex.push([cen, d, fa, s.lab.vmax.toFixed(2), s.vmax.toFixed(2), kP, kS]); }
      }
    }
    return { n, dif, dbs, susp, ex };
  };
  const a = conta(V92, {}), a2 = conta(V92, { extra: () => ({ prev: 'prev92' }) }), b2 = conta(V92, { extra: fa => ({ prev: 'prev92', relogio: rel, sorte: fa }) });
  const e = conta(EXP, {}), e2 = conta(EXP, { extra: fa => ({ relogio: rel, sorte: fa }) });
  console.log('  DB atual com a previsão de antes: ' + a.dif + ' de ' + a.n + ' jogadas com outro resultado na tela (' + a.susp + ' viram registro de "chute_rapido" no servidor)');
  confere(a.dif > 100 && a.susp > 100, 'DB atual, a previsão de ANTES (o núcleo sozinho): o servidor recusa o CHUTE no passo seguinte ao PASSE e a previsão mostra o DB — o jogador via a bola sair e voltar', [a.dif, a.susp]);
  confere(a2.dif === 0 && b2.dif === 0, 'DB atual, a previsão de AGORA (o mínimo de 2 passos entre chutes, igual ao servidor, que agora conta em passos e não no relógio de parede): o mesmo resultado nas ' + a2.n + ' jogadas, também com o relógio do motor oscilando', [a2.ex, b2.ex]);
  // o servidor de antes, no relógio de parede (o laboratório, com os instantes medidos do motor): o DB no 2º passo às vezes recusado
  { let n = 0, rec = 0; for (const cen of ['parado_correndo', 'normal']) { const t00 = L.CENARIOS[cen](N.resolve(V92)).t0; for (let fa = 0; fa < 12; fa++) for (const d of [20, 25, 30]) for (let so = 0; so < 4; so++) {
      const tP = t00 + (fa + 0.5) * STEP / 12, tq = [{ tipo: 'p', t: tP, dur: 40 }, { tipo: 'c', t: tP + d, dur: 40 }];
      const x = L.jogada(cen, { maq: 'srv', perfil: V92, relogio: rel }, tq, { fase: fa, sorte: so }), y = L.jogada(cen, { maq: 'srv92', perfil: V92 }, tq, { fase: fa });
      if (y.db) { n++; if (!x.db) rec++; } } }
    confere(rec > 0, 'o servidor de ANTES (33 ms no relógio de parede, com o relógio medido do motor com carga) recusava ' + rec + ' de ' + n + ' DBs com o CHUTE 2 passos depois — a carga do servidor decidia; em passos, nenhum', rec); }
  confere(e.dif === 0 && e2.dif === 0 && e.susp === 0, 'DB por estados: o servidor e a previsão chegam ao MESMO resultado em todas as ' + e.n + ' jogadas (também com o relógio do motor oscilando: ' + e2.dif + ' diferenças), sem registro de chute suspeito', [e.ex, e2.ex]);
  // a rede: os comandos chegam atrasados (o mesmo atraso em todos) — o servidor decide igual, só mais tarde
  const estaticos = ['parado', 'parado_correndo', 'colado', 'girando', 'parede'];
  const atrasos = [];
  for (const at of [2, 6, 12]) {
    const r = conta(EXP, { cens: estaticos, passo: 3, extra: () => ({ atrasos: new Array(200).fill(at), desloca: at, passos: 70 }) });
    atrasos.push(r.dif);
  }
  confere(atrasos.every(x => x === 0), 'com a rede atrasando os comandos (33, 100 e 200 ms em cada sentido = ping de 67 a 400 ms) o servidor decide o DB igual, só mais tarde: o ping não decide nada', atrasos);
  // a rede oscilando (os comandos chegam em rajadas, na ordem, como no TCP): o quanto a decisão muda
  let n = 0, dif = 0;
  for (const cen of estaticos) for (let sorte = 0; sorte < 6; sorte++) {
    const C = N.resolve(EXP), t00 = L.CENARIOS[cen](C).t0;
    let s = sorte * 7 + 3; const rnd = () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; };
    const at = []; let ult = 0;
    for (let i = 0; i < 200; i++) { let x = 3 + Math.floor(rnd() * 5); if (i + x < ult) x = ult - i; ult = i + x; at.push(x); }   // (3 a 7 passos: 50–117 ms, sem trocar a ordem)
    for (const d of [8, 16, 25]) {
      const tP = t00 + 5, toques = [{ tipo: 'p', t: tP, dur: 40 }, { tipo: 'c', t: tP + d, dur: 40 }];
      const r = servidor(cen, EXP, toques, { atrasos: at, passos: 80 });
      const dbS = r.imp.length >= 2 && r.imp[0].f === 'p' && r.imp[1].f === 'c';
      n++; if (r.lab.db !== dbS) dif++;
    }
  }
  console.log('  com a rede oscilando (3 a 7 passos de atraso, em rajadas): o DB decidido diferente em ' + dif + ' de ' + n + ' jogadas');
  confere(dif <= Math.ceil(n * 0.1), 'com a rede oscilando (os comandos chegando em rajadas) a decisão do DB quase sempre é a mesma: ' + dif + ' de ' + n + ' diferentes (o resto da diferença é a posição, que a correção da previsão já cuida)', dif);
}

/* ================================================================ 5. o servidor: o quadro e a entrada */
console.log('\n5) o servidor: o quadro e os campos novos do comando');
{
  const mk = perfil => new S.PartidaSala({ n: 1, jogo: 'futebol', jogadores: [{ netId: 'a', nome: 'A' }, { netId: 'b', nome: 'B' }], fisica: perfil, fisicaBase: perfil, agora: () => 1000 });
  const p0 = mk(V92), p1 = mk(EXP);
  p0.entrada('a', { seq: 1, x: 0, y: 0, button: 2, kc: 1, pc: 0, bh: 1, dt: 31 }); p1.entrada('a', { seq: 1, x: 0, y: 0, button: 2, kc: 1, pc: 0, bh: 1, dt: 31 });
  p0.passo(); p1.passo();
  const q0 = p0.quadro(), q1 = p1.quadro();
  confere(q0.players.every(v => v.length === 8) && q1.players[0].length === 9 && typeof q1.players[0][8] === 'number',
    'o quadro só ganha o estado do DB por estados (players[i][8]) com dbModo 1; com o DB atual é o mesmo de antes (8 campos)', [q0.players[0].length, q1.players[0].length]);
  p1.entrada('a', { seq: 2, x: 0, y: 0, button: 1, bh: 9, dt: 5000 });
  const f1 = p1.jog[0].fila.fila[p1.jog[0].fila.fila.length - 1];
  confere(f1 && f1.bh === undefined && f1.dt === undefined, 'o servidor ignora bh e dt fora dos limites (bh 0–3; dt ±100 ms)', f1);
}

console.log('\nRACHA v92 · DB por estados: ' + ok + '/' + (ok + falhas.length) + ' verificações ok em ' + ((Date.now() - t0) / 1000).toFixed(1) + ' s');
for (const x of falhas) console.log('  - falhou: ' + x);
process.exit(falhas.length ? 1 : 0);
