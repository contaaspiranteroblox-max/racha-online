/* =====================================================================================================================
   PROTÓTIPO COLYSEUS · A PONTE: A SALA DA TURMA COMEÇA A PARTIDA NO COLYSEUS (a fase 2 da migração, AVALIACAO.md)
   A turma (server/turma.js) continua dona da sala inteira: a lista, o lobby, os times, o admin, o chat, os convites, a copa.
   Só a PARTIDA muda de casa: quando o admin aperta COMEÇAR, a turma pede ao Colyseus uma sala de partida com os lugares
   que ELA decidiu e uma vaga reservada para cada um, e manda a vaga de cada aparelho pelo canal de sempre (o WebSocket da
   turma). O aparelho entra na partida com a vaga (sdk.consumeSeatReservation), sem passar pelo matchmaking — e quem não
   está na lista da turma não entra nem com o id da sala na mão.
   É o mesmo caminho que a fila da ranqueada usa (fila.mjs): a sala criada pelo servidor, as vagas reservadas pelo servidor.
   ===================================================================================================================== */
import { matchMaker } from '@colyseus/core';

/* jogadores: [{ lugar, auth: {id, publico, nome, conta} }] — a conta como a turma já conhece (o id 'c123' da conta, ou o do
   visitante; o publico '000123' só das contas). Devolve {sala, vagas: Map(id → a vaga para mandar ao aparelho)}. */
export async function partidaDaTurma({ codigo, n, jogo = 'futebol', jogadores }) {
  const lugares = jogadores.map(j => ({ id: String(j.auth.id), lugar: j.lugar | 0 }));
  const sala = await matchMaker.createRoom('racha', { modo: 'turma', n, jogo, codigo, lugares });
  const vagas = new Map();
  for (const j of jogadores) vagas.set(String(j.auth.id), await matchMaker.reserveSeatFor(sala, { modo: 'turma', n, jogo }, { ...j.auth, id: String(j.auth.id) }));
  return { sala: sala.roomId, vagas };
}
