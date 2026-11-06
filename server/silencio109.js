'use strict';
/* =====================================================================================================================
   RACHA v109 · O SILÊNCIO DA EQUIPE e a EXPULSÃO DA SALA no servidor das salas (o painel da staff: RACHA CONTROL).
   · SILÊNCIO: a staff calou o chat da conta por um tempo (5 min a 30 dias). Até lá a conta não manda nada em NENHUM chat das
     salas — o Chat do Brasil, o chat da sala e o da equipe, o dos amigos, o do clube — nem as falas e os emojis da partida.
     Quem tenta recebe o aviso com quanto falta e o motivo (o jogo de antes da v109 mostra o aviso dele de "silenciado").
     De onde vem:
       – montado na plataforma: a sessão do site traz o silêncio do banco já na conexão (req.racha.silencio) e a plataforma
         avisa na hora quando a staff cala ou tira o silêncio (silenciaConta) — a sessão é a palavra final;
       – separado dela: o bilhete assinado da conta traz z (até quando, em ms) e zm (o motivo). Um bilhete de ANTES do
         silêncio não tira o silêncio (só um bilhete assinado depois de o servidor saber dele).
   · EXPULSÃO: a staff tirou a conta da sala/partida em que ela está agora (a tampinha fica com o bot, como quem sai). Ela
     continua podendo jogar; só não volta para ESSA sala por 10 minutos.
   Nada aqui mexe na partida, na física, nos quadros nem no resultado.
   ===================================================================================================================== */
const {limpa} = require('./banco');

const PUB_RE = /^\d{1,9}$/;
const pub6 = p => String(Number(p)).padStart(6, '0');
const MAX_MS = 31 * 24 * 3600e3;                     // (o maior silêncio do painel é de 30 dias)
const EXPULSO_MS = 10 * 60e3;

function duracao(ms){                                 // "9 min", "3 horas", "5 dias"
  const min = Math.max(1, Math.ceil(ms / 60000));
  if (min < 60) return min + ' min';
  const h = Math.ceil(min / 60);
  if (h < 48) return h + (h === 1 ? ' hora' : ' horas');
  return Math.ceil(h / 24) + ' dias';
}
function texto(s, agora){
  return 'Você está silenciado no chat pela equipe do RACHA por mais ' + duracao(s.ate - agora) + '.' + (s.motivo ? ' Motivo: ' + s.motivo : '');
}
function contaDe(c){                                  // a conta (o ID público de 6 dígitos) desta conexão, ou null
  if (c.conta && PUB_RE.test(String(c.conta.idPublico || ''))) return pub6(c.conta.idPublico);
  if (c.contaSessao && PUB_RE.test(String(c.contaSessao.idPublico || ''))) return pub6(c.contaSessao.idPublico);
  if (typeof c.brasilConta === 'string' && /^c\d{1,9}$/.test(c.brasilConta)) return pub6(c.brasilConta.slice(1));
  return null;
}
function silencioDoBilhete(o){                        // (o z/zm do bilhete) → {ate, motivo} ou null
  const z = Number(o && o.z);
  return Number.isFinite(z) && z > 0 ? {ate:z, motivo:limpa(o.zm || '', 120)} : null;
}

function aplica(Turma){
  const P = Turma.prototype;
  P.v109Mapa = function(){ return this.silenciadas || (this.silenciadas = new Map()); };   // ID público → {ate, motivo, desde}

  /* a plataforma (montada aqui) calou a conta até `ate` (0 ou o passado: tirou o silêncio). Avisa as conexões da conta que
     estão nas salas (o jogo mostra o aviso). Devolve quantas conexões foram avisadas. */
  P.silenciaConta = function(pub, ate, motivo){
    if (!PUB_RE.test(String(pub))) return 0;
    const p = pub6(pub), agora = Date.now(), mapa = this.v109Mapa(), a = Number(ate) || 0;
    const s = a > agora ? {ate:Math.min(a, agora + MAX_MS), motivo:limpa(motivo || '', 120), desde:agora} : null;
    if (s) mapa.set(p, s); else mapa.delete(p);
    let n = 0;
    for (const c of this.clientes){
      if (!c.id || contaDe(c) !== p) continue;          // (só a conexão das salas: o Chat do Brasil sozinho fica sabendo ao falar)
      this.manda(c, s ? {type:'silenciado', ate:s.ate, motivo:s.motivo, texto:texto(s, agora)} : {type:'silenciado', ate:0, texto:'A equipe do RACHA tirou o seu silêncio: o chat está liberado.'});
      n++;
    }
    this.log('conta ' + p + (s ? ' silenciada no chat por ' + duracao(s.ate - agora) : ': silêncio tirado') + ' (RACHA CONTROL)' + (n ? ', ' + n + ' conexão(ões) avisada(s)' : ''));
    return n;
  };
  // montado na plataforma: o silêncio que a sessão trouxe (do banco, agora) — vale o que ela diz, com ou sem silêncio
  P.v109DaSessao = function(pub, s){
    if (!PUB_RE.test(String(pub || ''))) return;
    const p = pub6(pub), mapa = this.v109Mapa(), agora = Date.now(), ate = s && Number(s.ate);
    if (ate && ate > agora) mapa.set(p, {ate:Math.min(ate, agora + MAX_MS), motivo:limpa(s.motivo || '', 120), desde:agora});
    else mapa.delete(p);
  };
  // separado da plataforma: o silêncio do bilhete. Um bilhete assinado antes de o servidor saber do silêncio não o tira.
  P.v109DoBilhete = function(conta){
    if (!conta || !PUB_RE.test(String(conta.idPublico || ''))) return;
    const p = pub6(conta.idPublico), mapa = this.v109Mapa(), agora = Date.now(), at = mapa.get(p), t = Number(conta.t) || 0;
    const s = conta.silencio;
    if (s && s.ate > agora){ if (!at || t >= at.desde) mapa.set(p, {ate:Math.min(s.ate, agora + MAX_MS), motivo:s.motivo || '', desde:Math.max(t, at ? at.desde : 0)}); }
    else if (at && t > at.desde) mapa.delete(p);
  };
  // esta conexão está calada pela equipe? → o aviso (com quanto falta e o motivo) ou '' (pode falar)
  P.v109Calado = function(c){
    const p = c && contaDe(c); if (!p) return '';
    const mapa = this.v109Mapa(), s = mapa.get(p); if (!s) return '';
    const agora = Date.now();
    if (s.ate <= agora){ mapa.delete(p); return ''; }
    return texto(s, agora);
  };

  /* a plataforma (montada aqui) tirou a conta da sala em que ela está: sai como quem sai (o bot assume a tampinha), recebe o
     aviso e não volta para ESSA sala por 10 min. Devolve quantas conexões saíram de uma sala. */
  P.expulsaConta = function(pub, motivo){
    if (!PUB_RE.test(String(pub))) return 0;
    const id = 'c' + Number(pub), m = limpa(motivo || '', 120);
    let n = 0;
    for (const r of this.salas.values()){              // (quem caiu e tinha a vaga guardada também perde a vaga)
      if (r.reservas && r.reservas.has(id)){ r.reservas.delete(id); r.removidos.set(id, Date.now() + EXPULSO_MS); }
    }
    for (const c of [...this.clientes]){
      if (c.id !== id || !c.sala) continue;
      const r = this.salaDe(c); if (!r) continue;
      r.removidos.set(c.id, Date.now() + EXPULSO_MS);
      this.sai(c, 'kick');
      this.manda(c, {type:'left'});
      this.erro(c, 'A equipe do RACHA tirou você da sala.' + (m ? ' Motivo: ' + m : ''), 'expulso');
      n++;
    }
    this.log('conta ' + pub6(pub) + ' tirada da sala pela equipe (RACHA CONTROL): ' + n + ' conexão(ões)');
    return n;
  };
}

module.exports = {aplica, silencioDoBilhete, duracao, texto, contaDe};
