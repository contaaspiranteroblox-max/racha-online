/* PROTÓTIPO COLYSEUS · TESTE 1 — A FÍSICA É A DO RACHA (o servidor autoritativo de sempre dentro da sala do Colyseus)
   1) o quadro em binário volta IGUAL ao do motor (16.200 quadros de partidas de bots: 1v1 a 4v4, COM CURVA, os chutes do
      Rachão, a vaga vazia) e é bem menor que o JSON de hoje;
   2) uma partida de verdade no Colyseus (dois aparelhos pelo SDK, com direções, toques de PASSE e de CHUTE), gravada na sala,
      roda de novo FORA do Colyseus e sem rede (o PartidaSala puro, os mesmos comandos nos mesmos passos): os quadros saem
      idênticos, um por um — embrulhar o motor na sala não mudou nada;
   3) o que os aparelhos receberam é exatamente o que o servidor calculou (o transporte não perde nada);
   4) o motor anda nos 60 passos por segundo de verdade (o relógio do RACHA, não o do Colyseus).
   node prototipos/colyseus/testes/t1_fisica.mjs */
import { createRequire } from 'node:module';
import { Placar, canon, RAIZ } from './comum.mjs';
import { novoEmpacotador, novoDesempacotador } from '../servidor/codec.mjs';
import { reproduz } from '../servidor/gravador.mjs';
import { sobe } from '../servidor/index.mjs';
import { Aparelho, ate, espera } from '../cliente/aparelho.mjs';
const require = createRequire(import.meta.url);
const { PartidaSala } = require(RAIZ + '/server/partida/sala.js');

const P = new Placar('protótipo Colyseus · 1 · a física é a do RACHA');

// ---------------------------------------------------------------- 1) o quadro em binário, sem perda
{
  let total = 0, dif = 0, bj = 0, bb = 0;
  for (const cfg of [{ n: 1 }, { n: 2 }, { n: 3, jogo: 'curva' }, { n: 4 }, { n: 2, chutes: { lob: true, curva: true, super: true } }, { n: 2, vazios: true }]) {
    const snaps = [];
    const jog = cfg.vazios ? [{ netId: null, nome: 'B', bot: 'dificil' }, { vazio: true }, { netId: null, nome: 'C', bot: 'dificil' }, { netId: null, nome: 'D', bot: 'dificil' }]
      : Array.from({ length: 2 * cfg.n }, (_, i) => ({ netId: null, nome: 'B' + i, bot: 'dificil' }));
    const p = new PartidaSala({ ...cfg, quadros: 60, jogadores: jog, onSnapshot: d => snaps.push(canon(d)) });
    for (let i = 0; i < 60 * 45; i++) p.passo();
    const E = novoEmpacotador(), D = novoDesempacotador();
    for (const s of snaps) {
      const Q = JSON.parse(s), u8 = E.empacota(Q), R = D.desempacota(u8);
      total++; bb += u8.length; bj += Buffer.byteLength(JSON.stringify({ type: 'snapshot', round: 1, data: Q }));
      if (canon(R) !== s) dif++;
    }
  }
  P.confere(total >= 15000 && dif === 0, 'o quadro em binário volta IGUAL ao do motor em ' + total + ' quadros (1v1 a 4v4, COM CURVA, os chutes do Rachão, a vaga vazia)', { total, dif });
  P.confere(bb < bj * 0.45, 'e é bem menor que o JSON de hoje: ' + Math.round(bj / total) + ' → ' + Math.round(bb / total) + ' bytes por quadro (' + Math.round(100 - 100 * bb / bj) + '% menor)', { bj, bb });
}

// ---------------------------------------------------------------- 2–4) a partida no Colyseus, gravada e reproduzida fora dele
{
  const s = await sobe({ sala: { gravar: true, r80: { seg: 600, prorrog: 60 } } });
  const url = 'ws://127.0.0.1:' + s.porta;
  const A = new Aparelho(url, { nome: 'Ana' }), B = new Aparelho(url, { nome: 'Beto' });
  const recebidos = [];
  A.aoQuadro = Q => recebidos.push(canon(Q));
  await A.entra('joinOrCreate', 'racha', { modo: 'casual', n: 1 });
  await B.entra('joinOrCreate', 'racha', { modo: 'casual', n: 1 });
  P.confere(await ate(() => A.comecou && B.comecou, 4000), 'os dois aparelhos caem na mesma sala casual 1v1 e a partida começa sozinha (sala cheia)', { a: A.sala.roomId, b: B.sala.roomId });
  // Ana corre em zigue-zague e toca PASSE e CHUTE de vez em quando; Beto vem para o meio e chuta
  let kcA = 0, pcA = 0, kcB = 0;
  A.joga(seq => { if (seq % 47 === 0) kcA++; if (seq % 71 === 0) pcA++; const a = seq / 40; return { x: Math.cos(a), y: Math.sin(a * 1.7) * 0.8, kc: kcA, pc: pcA }; });
  B.joga(seq => { if (seq % 53 === 0) kcB++; return { x: -0.9, y: Math.sin(seq / 30) * 0.5, kc: kcB }; });
  const t0 = Date.now(), sala = [...s.salas][0], tick0 = sala.partida ? sala.partida.tick : 0;
  await espera(8000);
  A.para(); B.para();
  const seg = (Date.now() - t0) / 1000, ticks = sala.partida.tick - tick0;
  await espera(300);
  const G = sala.gravacao, passos = sala.partida.tick;
  sala.partida.desligar();                                     // (para o motor: a reprodução compara os mesmos passos)
  P.confere(ticks / seg > 57 && ticks / seg < 63, 'o motor do RACHA anda nos 60 passos por segundo de verdade: ' + (ticks / seg).toFixed(1) + '/s', { ticks, seg });
  P.confere(G.comandos.length > 800 && G.comandos.some(c => c.cmd.kc > 0) && G.comandos.some(c => c.cmd.pc > 0), 'a sala gravou ' + G.comandos.length + ' comandos dos dois (com os toques de PASSE e CHUTE)', G.comandos.length);
  const R = reproduz(G, passos);
  const serv = G.quadros, n = Math.min(serv.length, R.quadros.length);
  let iguais = 0, primeiraDif = -1;
  for (let i = 0; i < n; i++) { if (serv[i] === R.quadros[i]) iguais++; else if (primeiraDif < 0) primeiraDif = i; }
  P.confere(n > 400 && iguais === n && serv.length === R.quadros.length, 'reproduzida FORA do Colyseus (o PartidaSala puro, sem rede): os ' + n + ' quadros saem idênticos, um por um', { n, iguais, primeiraDif, serv: serv.length, rep: R.quadros.length, a: primeiraDif >= 0 ? serv[primeiraDif].slice(0, 300) : '', b: primeiraDif >= 0 ? R.quadros[primeiraDif].slice(0, 300) : '' });
  const ultimo = JSON.parse(serv[serv.length - 1]);
  P.confere(ultimo.players.every(p => Number.isFinite(p[0]) && Number.isFinite(p[1])) && G.relogio.length > 1000 && R.relogioUsado === G.relogio.length, 'o relógio gravado foi usado inteiro (a reprodução fez as mesmas leituras, na mesma ordem)', { gravado: G.relogio.length, usado: R.relogioUsado });
  // o que a Ana recebeu = o que o servidor calculou (o começo da lista do servidor, na mesma ordem)
  const servC = serv.map(x => canon(JSON.parse(x)));        // (a mesma escrita dos dois lados: as chaves em ordem)
  let dif1 = -1; for (let i = 0; i < recebidos.length; i++) if (recebidos[i] !== servC[i]) { dif1 = i; break; }
  const ok = recebidos.length > 300 && dif1 < 0;
  P.confere(ok, 'o que o aparelho recebeu pelo Colyseus é exatamente o que o servidor calculou (' + recebidos.length + ' quadros, sem perda)', { recebidos: recebidos.length, dif1, a: dif1 >= 0 ? recebidos[dif1].slice(0, 400) : '', b: dif1 >= 0 ? servC[dif1].slice(0, 400) : '' });
  await A.sai(); await B.sai();
  await s.fecha();
}
process.exit(P.fim());
