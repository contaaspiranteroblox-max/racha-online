'use strict';
/* =====================================================================================================================
   RACHA v106 · OS EMOJIS DA PARTIDA no servidor das salas (o balão com a reação em cima da tampinha; o jogo: tools/v106/emotes.js).
   cliente → servidor: emote {e} (o id de um dos 20 emojis da lista fixa abaixo — a mesma do jogo; o tests/v106_emotes_test.py
   confere que as duas listas são iguais). Servidor → cliente: emote {id, e} para todos da sala (o id de rede de quem mandou),
   menos para quem mandou (o aparelho dele já mostrou) e para quem tem bloqueio com ele (o bloqueio da v88, dos dois lados).
   · só de quem está numa sala com a partida rolando e jogando nela (quem assiste não tem tampinha em campo; quem não está
     numa sala é ignorado) e não está silenciado nela pelas denúncias (como as falas da v93);
   · só os 20 da lista (nada de texto livre: nada para o filtro); o que não é da lista é ignorado;
   · no ritmo: no máximo 1 a cada 1 s e 3 a cada 5 s — o resto é ignorado, sem erro. O ritmo é da pessoa na sala (como o das
     falas): reconectar não zera. O jogo espera 1,5 s entre um e outro e no máximo 3 em 6 s (nunca chega no limite daqui).
   O jogo de antes (sem a v106) não manda emote e ignora o emote que chega (o net49Message de antes não faz nada com um tipo
   que não conhece). Nada aqui mexe na partida, na física, nos quadros nem no resultado.
   ===================================================================================================================== */
const EMOTES = Object.freeze(['rindo', 'chorando_rir', 'comemorando', 'valeu', 'na_moral', 'piscada', 'zoando', 'confiante', 'apaixonado', 'surpreso',
  'pensando', 'desconfiado', 'aff', 'nervoso', 'assustado', 'sono', 'triste', 'chorando', 'bravo', 'furioso']);
const EMOTES_SET = new Set(EMOTES);
const RITMO = Object.freeze({intervalo:1000, janela:5000, max:3});

// o ritmo de uma pessoa (as horas dos últimos que passaram): passa se o último foi há 1 s ou mais e não houve 3 nos últimos 5 s
function ritmoOk(lista, agora){
  while (lista.length && agora - lista[0] >= RITMO.janela) lista.shift();
  if (lista.length && agora - lista[lista.length - 1] < RITMO.intervalo) return false;
  if (lista.length >= RITMO.max) return false;
  lista.push(agora);
  return true;
}

function aplica(Turma){
  const P = Turma.prototype;
  P.emote = function(c, m){
    const r = this.salaDe(c); if (!r || r.state !== 'playing') return;
    const eu = r.members.find(x => x.id === c.id); if (!eu || eu.slot < 0) return;   // (quem assiste não tem tampinha)
    const e = m && typeof m.e === 'string' ? m.e : ''; if (!EMOTES_SET.has(e)) return;
    const agora = typeof this.agora === 'function' ? this.agora() : Date.now();
    if ((r.silencio && r.silencio.get(c.id) || 0) > Date.now()) return;               // (silenciado nesta sala por denúncias)
    if (typeof this.v109Calado === 'function'){ const cal = this.v109Calado(c); if (cal) return this.erro(c, cal, 'silenciado_staff'); }   // v109: o silêncio da equipe
    const rm = r.emotes106 || (r.emotes106 = new Map());
    let lista = rm.get(c.id); if (!lista) rm.set(c.id, lista = []);
    if (!ritmoOk(lista, agora)) return;
    const txt = JSON.stringify({type:'emote', id:c.id, e});
    for (const x of r.members){
      if (x.bot || x.id === c.id) continue;
      const cl = this.porId.get(x.id); if (!cl || cl.sala !== r.code) continue;
      if (typeof this.v88Bloqueado === 'function' && this.v88Bloqueado(c, cl)) continue;
      this.mandaTxt(cl, txt);
    }
  };
  Turma.ACOES.emote = 'emote';
}

module.exports = {EMOTES, RITMO, ritmoOk, aplica};
