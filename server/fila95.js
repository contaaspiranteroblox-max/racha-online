'use strict';
/* =====================================================================================================================
   RACHA v95 · A RANQUEADA AO VIVO: quantos estão online, quantos jogam agora e quantos procuram a ranqueada em cada
   tamanho de time (1v1, 2v2, 3v3, 4v4) — o JOGAR e a tela de busca do jogo mostram (o pedido: "quantos players estão
   procurando partida, players online").
   · {type:'fila_info'} → {type:'fila_info', online, jogando, salas, busca:[n1, n2, n3, n4]} (só contagens: nenhum nome, nenhum
     ID); o pedido tem ritmo próprio (2 por segundo, até 4 seguidos) — sem resposta quando passa;
   · quem está na fila recebe a contagem sozinho, no máximo a cada 2 s, enquanto procura (a volta da fila já roda a cada 1 s).
   ===================================================================================================================== */
function contagem(T){
  const busca = [0, 0, 0, 0];
  for (const e of T.filaEsp.values()) if (e && e.n >= 1 && e.n <= 4) busca[e.n - 1]++;
  let jogando = 0, salas = 0;
  for (const r of T.salas.values()){
    if (!r || !Array.isArray(r.members)) continue;
    if (r.state === 'playing'){ salas++; for (const m of r.members) if (m && !m.bot && m.slot >= 0) jogando++; }
  }
  return {online:T.porId.size, jogando, salas, busca};
}
function aplica(Turma){
  const P = Turma.prototype;
  P.filaInfo = function(c){
    if (!this.balde(c, 'fila_info', 2, 4)) return;
    this.manda(c, Object.assign({type:'fila_info'}, contagem(this)));
  };
  const filaTentaAntes = P.filaTenta;
  P.filaTenta = function(){
    const r = filaTentaAntes.apply(this, arguments);
    try {
      const agora = Date.now();
      if (this.filaEsp.size && (!this.f95T || agora - this.f95T >= 2000)){
        this.f95T = agora;
        const txt = JSON.stringify(Object.assign({type:'fila_info'}, contagem(this)));
        for (const e of this.filaEsp.values()) if (e && e.c) this.mandaTxt(e.c, txt);
      }
    } catch (_) {}
    return r;
  };
  Turma.ACOES.fila_info = 'filaInfo';
}
module.exports = {aplica, contagem};
