/* =====================================================================================================================
   PROTÓTIPO COLYSEUS · A FILA DA RANQUEADA (o QueueRoom do Colyseus 0.18, com o rank do BILHETE ASSINADO)
   Hoje (server/turma.js · fila, v79) quem procura a ranqueada diz os próprios pontos (m.pts) e a fila junta pelos pontos
   que o aparelho declarou — dá para mentir e cair com quem é mais fraco. Aqui a fila é o QueueRoom do próprio Colyseus
   (grupos a cada 1 s, os mais perto no rank juntos, o grupo incompleto com bots depois de um tempo), com três cuidados:
     · o rank vem do bilhete que a PLATAFORMA assinou (o campo rk: os pontos da patente) — o que o aparelho manda no pedido
       é ignorado (o QueueRoom de fábrica usa o options.rank do aparelho);
     · as opções da fila são só as do servidor (o QueueRoom de fábrica lê maxPlayers, maxWaitingCycles, allowIncompleteGroups…
       das opções do pedido, que trazem as do aparelho junto);
     · a sala ranqueada que a fila cria é privada e só aceita as contas que a fila chamou (contas: [...]); e a ranqueada
       direto pelo matchmaking (joinOrCreate) é recusada — só a fila abre ranqueada.
   O que a fila de hoje faz e esta ainda não: o grupo de amigos junto no mesmo time (v93: o teamId do QueueRoom serve para
   isso) e as duas esperas diferentes (2+ pessoas com bots aos 8 s; sozinho contra os bots aos 20 s) — aqui é uma espera só.
   ===================================================================================================================== */
import { QueueRoom, matchMaker, ServerError, ErrorCode } from '@colyseus/core';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { inteiro } = require('../../../server/banco.js');

/* C (do servidor): filaCiclos (quantos ciclos de 1 s até o grupo incompleto jogar com bots), filaFaixa (a diferença de
   rank aceita na hora) e filaAbre (quanto a faixa abre a cada ciclo de espera). contaDoBilhete(token) → a conta (ou null). */
export function criaFilaRanqueada(C, contaDoBilhete) {
  class FilaRanqueada extends QueueRoom {
    static async onAuth(token, options) {
      if (!inteiro(options && options.n, 1, 4, null)) throw new ServerError(ErrorCode.MATCHMAKE_INVALID_CRITERIA, 'tamanho inválido');
      const a = await contaDoBilhete(token);
      if (!a) throw new ServerError(ErrorCode.AUTH_FAILED, 'a ranqueada é só com a conta');
      return a;
    }
    onCreate(options) {
      const n = inteiro(options && options.n, 1, 4, 1);
      this.n = n;
      this.maxMessagesPerSecond = 20;
      super.onCreate({                                      // (só as opções do servidor)
        matchRoomName: 'racha', maxPlayers: 2 * n, allowIncompleteGroups: true, maxWaitingCycles: C.filaCiclos,
        compare: (c, g) => Math.abs(c.rank - g.averageRank) <= C.filaFaixa + C.filaAbre * (c.currentCycle | 0),
        onGroupReady: g => matchMaker.createRoom('racha', { modo: 'ranqueada', n, jogo: 'futebol', contas: g.clients.map(x => x.auth && x.auth.id).filter(Boolean) }),
      });
    }
    onJoin(client, options, auth) {
      // o rank do bilhete assinado; o pedido do aparelho (rank, teamId, maxPlayers…) não entra
      this.addToQueue(client, { rank: Number.isInteger(auth && auth.rk) ? auth.rk : 0, options: { modo: 'ranqueada', n: this.n, jogo: 'futebol' } });
    }
  }
  return FilaRanqueada;
}
