/* ======================================================================================================================
   RACHA v103 · OS SONS DO ONLINE (o pedido: "sons no online está bugado")
   O que acontecia (medido numa sala 1v1 com dois navegadores, contando cada som que tocava em cada um): no treino e contra
   os bots o laço do jogo toca os sons dos eventos da partida (rqEventos: o chute de QUALQUER um, o apito da saída depois de
   cada gol e o do fim; e a bola batendo na trave); no online o laço é o da rede (net49RemoteFrame) e só o SEU chute tocava
   (o da previsão) e o gol. O chute do outro time e dos companheiros, a trave, o apito da saída depois do gol e o apito final
   ficavam mudos. Agora, no online:
     · o CHUTE e o PASSE de cada um tocam quando o quadro do servidor mostra que ele chutou (o seu continua tocando na hora,
       pela previsão, sem repetir) — o CHUTE ou o PASSE pelos botões que o quadro traz (ou, sem eles, pela força da bola);
     · a TRAVE (ou o chinelo, no campo de chinelo) toca quando a bola bate nela no mundo previsto do aparelho (o mesmo do
       desenho), uma vez por batida;
     · o APITO da saída depois do gol e o APITO FINAL tocam na troca de estado da partida, uma vez por rodada.
   Quem assiste ouve os chutes e os apitos (não tem a previsão: a trave fica de fora). Nada muda no treino e contra os bots.
   ====================================================================================================================== */
const V103S = {traveT:0, fimRodada:-1, saidaT:0, n:{chute:0, trave:0, apito:0}};
function v103SomChuteOutro(v, s){
  const b = v[7] | 0, est = b & 3, vb = s && Array.isArray(s.ball) ? Math.hypot(s.ball[2] || 0, s.ball[3] || 0) : 0;
  const forte = est === 3 || (est !== 2 && vb > U(28.6));   // (o CHUTE sai a 36 u/s; o PASSE, a 21,25: pela força da bola)
  try { som.chute(forte); V103S.n.chute++; } catch (_) {}
}
if (typeof net49Snapshot === 'function'){
  const net49SnapshotAntes103s = net49Snapshot;
  net49Snapshot = function(s){
    const novo = !!(s && Array.isArray(s.players) && s.tick > NET49.lastTick && NET49.playing);
    const antes = novo ? RQ.jog.map(q => q ? q.chuteT : null) : null, estado0 = RQ.estado;
    const r = net49SnapshotAntes103s.apply(this, arguments);
    if (novo) try { v103SonsDoQuadro(s, antes, estado0); } catch (e) { console.error('v103 sons', e); }
    return r;
  };
}
function v103SonsDoQuadro(s, antes, estado0){
  const eu = NET49.localSlot;
  for (let i = 0; i < s.players.length; i++){                      // 1) os chutes dos outros (o seu toca na previsão)
    const q = RQ.jog[i], v = s.players[i];
    if (!q || !v || i === eu || q.fora || antes[i] == null) continue;
    if (v[5] > antes[i] && v[5] > 0) v103SomChuteOutro(v, s);
  }
  if (estado0 !== s.state){                                        // 3) os apitos: a saída depois do gol e o fim
    const rd = NET49.room ? NET49.room.round : 0, agora = performance.now();
    if (s.state === 'saida' && estado0 === 'gol' && agora - V103S.saidaT > 1500){ V103S.saidaT = agora; try { som.apito('curto'); V103S.n.apito++; } catch (_) {} }
    if (s.state === 'fim' && V103S.fimRodada !== rd){ V103S.fimRodada = rd; try { som.apito('fim'); V103S.n.apito++; } catch (_) {} }
  }
}
/* ---------------------------------------------------------------- 2) a trave no mundo previsto (o que está na tela) */
if (typeof v92PrevPasso === 'function'){
  const v92PrevPassoAntes103 = v92PrevPasso;
  v92PrevPasso = function(cmd, efeitos){
    const M = typeof V92N !== 'undefined' ? V92N.M : null;
    if (!efeitos || !M) return v92PrevPassoAntes103.apply(this, arguments);   // (o replay do rollback não toca nada)
    M.trave = 0;
    const r = v92PrevPassoAntes103.apply(this, arguments);
    if (M.trave > 0){
      const agora = performance.now();
      if (agora - V103S.traveT > 220){
        V103S.traveT = agora;
        try { if (typeof CAMPO !== 'undefined' && CAMPO && CAMPO.rede === false && typeof som.chinelo === 'function') som.chinelo(M.trave); else som.trave(M.trave); V103S.n.trave++; } catch (_) {}
      }
      M.trave = 0;
    }
    return r;
  };
}
window.RachaSons103 = {contagem:() => Object.assign({}, V103S.n)};
