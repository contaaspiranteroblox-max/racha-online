/* =====================================================================================================================
   PROTÓTIPO COLYSEUS · A PREVISÃO DO APARELHO (o mesmo princípio do jogo, sem navegador)
   O jogo de verdade já prevê a sua tampinha com o MESMO núcleo da física do servidor (server/partida/nucleo.js, que o
   build cola no racha.html) e reconcilia com o quadro do servidor. Aqui está o esqueleto disso para os testes do
   protótipo, em Node: cada comando que o aparelho manda anda a tampinha na hora (N.passoSolo: a mesma função que o
   servidor usa na recuperação da fila); quando chega um quadro, a tampinha volta para onde o servidor diz que ela estava
   no último comando que ele confirmou (o ack, players[i][4]) e anda de novo os comandos que ainda não foram confirmados.
   A "correção" é quanto a tampinha prevista pulou nessa hora (o que o jogador veria como um tranco).
   Na saída de bola vale a barreira (N.barreiraUm): por isso a previsão sabe o time da tampinha e quem dá a saída (o
   kickoff do quadro), como o tools/v92/rede.js faz (M.saidaTime = s.kickoff).
   ===================================================================================================================== */
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const N = require('../../../server/partida/nucleo.js');

export function novaPrevisao({ n }) {
  const C = N.resolve(N.perfilLimpo(null, N.PERFIL_V92));
  const M = { G: N.novoCampo(n), estado: 'jogo', saidaTime: 0 };
  const eu = { x: 0, y: 0, vx: 0, vy: 0, mx: 0, my: 0, r: C.R_JOG, m: C.MASSA_JOG };
  const pendentes = [];
  let comecou = false, correcoes = [];
  return {
    // o comando que acabou de sair do aparelho: a tampinha anda já (sem esperar o servidor)
    comando(c) {
      if (!comecou) return;
      pendentes.push(c);
      if (pendentes.length > 240) pendentes.shift();
      N.passoSolo(M, C, eu, c);
    },
    // o quadro do servidor: volta ao que ele confirmou e anda de novo o que falta confirmar
    quadro(Q, lugar) {
      const p = Q.players && Q.players[lugar]; if (!p) return null;
      const ack = p[4] | 0;
      while (pendentes.length && pendentes[0].seq <= ack) pendentes.shift();
      const antes = { x: eu.x, y: eu.y };
      eu.x = p[0]; eu.y = p[1]; eu.vx = p[2]; eu.vy = p[3]; eu.time = Math.floor(lugar / n); eu.k = lugar % n;
      M.estado = Q.state === 'saida' ? 'saida' : 'jogo'; M.saidaTime = Q.kickoff === 1 ? 1 : 0;
      for (const c of pendentes) N.passoSolo(M, C, eu, c);
      if (!comecou) { comecou = true; return null; }
      const d = Math.hypot(eu.x - antes.x, eu.y - antes.y);
      correcoes.push(d);
      return d;
    },
    pos: () => ({ x: eu.x, y: eu.y }),
    pendentes: () => pendentes.length,
    correcoes: () => correcoes.slice(),
    zera: () => { correcoes = []; },
  };
}
