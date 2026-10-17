// ============================================================================
// RACHA v82 — As decisões do fim de partida que não dependem do banco (o jogoRouter usa; os testes também)
//   · motivoResultadoOnline: por que um resultado online não vale (o selo do servidor das salas já conferido pela
//     assinatura — aqui só o conteúdo: a conta, o placar, o modo, a validade e, na ranqueada, k = 1 e o tamanho do time);
//   · acaoRanqueada: o que a partida faz com a patente da conta (a conta da partida, a desistência ou nada).
// Sem imports.
// ============================================================================

export type SeloLido = { j: string; p: [number, number]; m: string; t: number; k?: number; n?: number };

export function motivoResultadoOnline(
  selo: SeloLido | null,
  o: { valida: boolean; idPublico: string; placarNosso: number; placarDeles: number; modo: string; ranqueada: boolean; tamanho: number | null; agora: number },
): string {
  if (!o.valida) return "O servidor da turma não validou esse resultado.";
  if (!selo) return "Resultado online sem o selo do servidor da turma.";
  if (selo.j !== o.idPublico) return "Esse selo é de outra conta.";
  if (selo.p[0] !== o.placarNosso || selo.p[1] !== o.placarDeles) return "O placar não bate com o que o servidor conferiu.";
  if (selo.m !== o.modo) return "O modo não bate com o que o servidor conferiu.";
  if (o.agora - selo.t > 40 * 60 * 1000) return "Esse selo venceu.";
  if (o.ranqueada && selo.k !== 1) return "Esse selo não é de uma partida ranqueada.";
  if (o.ranqueada && o.tamanho && selo.n !== o.tamanho) return "O tamanho do time não bate com o que o servidor conferiu.";
  return "";
}

export type AcaoRanqueada = "partida" | "desistencia" | "nenhuma" | "mudou";

// ranqueada/online: o que a partida disse no começo · fimOnline, abandonada, valida: o que o fim disse ·
// motivoOnline: o que motivoResultadoOnline devolveu (vazio = valeu)
export function acaoRanqueada(o: { ranqueada: boolean; online: boolean; fimOnline: boolean; abandonada: boolean; valida: boolean; motivoOnline: string }): AcaoRanqueada {
  if (!o.ranqueada) return "nenhuma";
  if (o.abandonada) return "desistencia"; // (desistir tira pontos mesmo sem selo: ninguém se pune de mentira)
  if (o.fimOnline !== o.online) return "mudou";
  if (!o.valida) return "nenhuma"; // a partida parou (o servidor, a rede): sem pontos
  if (o.online && o.motivoOnline) return "nenhuma";
  return "partida";
}
