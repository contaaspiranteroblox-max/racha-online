'use strict';
/* RACHA · servidor da turma — o que fica guardado (um arquivo JSON, gravado de forma atômica) e as funções de apoio.
   Guarda: quem é quem (o token vira um id fixo; só o hash do token fica no arquivo), os números de cada um (partidas e
   vitórias que o servidor conferiu = os troféus), os clubes, os convites, os duelos 1v1 e a galeria de campeões.
   v88: e o histórico CURTO do chat dos amigos e do chat do clube (7 dias, as últimas 40/60 mensagens de cada conversa).
   As salas, o chat da sala e o Chat do Brasil vivem só na memória (somem quando o servidor reinicia). */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const VERSAO = 1;

class Banco {
  constructor(arquivo, log){
    this.arquivo = arquivo || null;               // sem arquivo: só na memória (os testes usam assim)
    this.log = log || (() => {});
    this.d = Banco.vazio();
    this.sujo = false; this.timer = null;
    this.carrega();
  }
  static vazio(){
    return {versao:VERSAO, tokens:{}, gente:{}, clubes:{}, convites:[], duelos:{}, campeoes:[], seq:{pub:0, clube:0, convite:0},
      dms:{}, clubeChat:{}};                         // v88: o histórico curto do chat dos amigos e do clube (7 dias; as últimas 40/60)
  }
  carrega(){
    if (!this.arquivo) return;
    let txt;
    try { txt = fs.readFileSync(this.arquivo, 'utf8'); }
    catch (e) { if (e.code !== 'ENOENT') this.log('não deu para ler ' + this.arquivo + ': ' + e.message); return; }
    try {
      const o = JSON.parse(txt);
      if (!o || o.versao !== VERSAO) throw new Error('versão desconhecida');
      const v = Banco.vazio();
      for (const k of Object.keys(v)) if (o[k] && typeof o[k] === typeof v[k]) v[k] = o[k];
      v.seq = Object.assign(Banco.vazio().seq, o.seq || {});
      this.d = v;
    } catch (e) {                                   // arquivo estragado: guarda uma cópia e começa do zero (não apaga nada)
      const copia = this.arquivo + '.estragado-' + Date.now();
      try { fs.copyFileSync(this.arquivo, copia); } catch (_) {}
      this.log('o arquivo ' + this.arquivo + ' não abriu (' + e.message + '); cópia em ' + copia + ', começando do zero');
    }
  }
  marca(){                                         // mudou: grava daqui a pouco (junta várias mudanças numa gravação)
    this.sujo = true;
    if (!this.timer && this.arquivo) this.timer = setTimeout(() => this.salva(), 700);
  }
  salva(){
    this.timer = null;
    if (!this.sujo || !this.arquivo) return true;
    const tmp = this.arquivo + '.tmp';
    try {
      fs.mkdirSync(path.dirname(this.arquivo), {recursive:true});
      fs.writeFileSync(tmp, JSON.stringify(this.d));
      fs.renameSync(tmp, this.arquivo);           // (a troca de nome é atômica: nunca fica um arquivo pela metade)
      this.sujo = false;
      return true;
    } catch (e) {
      this.log('não deu para gravar ' + this.arquivo + ': ' + e.message);
      if (!this.timer) this.timer = setTimeout(() => this.salva(), 5000);
      return false;
    }
  }
  salvaJa(){ if (this.timer){ clearTimeout(this.timer); this.timer = null; } return this.salva(); }
}

/* ---- apoio ---- */
const sha = s => crypto.createHash('sha256').update(String(s)).digest('hex');
const b64u = b => Buffer.from(b).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const deB64u = s => Buffer.from(String(s).replace(/-/g, '+').replace(/_/g, '/'), 'base64');
const novoToken = () => b64u(crypto.randomBytes(24));
const novoId = (p, n) => p + b64u(crypto.randomBytes(n || 6)).replace(/[-_]/g, '').slice(0, 9).toLowerCase();
// texto que veio de fora: sem controle nem < >, espaços juntos, no máximo n letras
const limpa = (s, n) => Array.from(String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f<>]/g, '').replace(/\s+/g, ' ').trim()).slice(0, n).join('');
// o nome como chave (sem acento, sem maiúscula, só letras e números): dois clubes não podem ter a mesma
const chaveNome = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 24);
const inteiro = (v, min, max, padrao) => Number.isInteger(v) && v >= min && v <= max ? v : padrao;

/* ---- assinatura (HMAC) do bilhete da conta e do selo do resultado ----
   Formato: base64url(JSON) + '.' + base64url(HMAC-SHA256(segredo, a parte de antes)). O mesmo segredo fica na plataforma
   (RACHA_SEGREDO_SALAS): ela emite o bilhete da conta e confere o selo do resultado online. */
function assina(segredo, obj){
  const corpo = b64u(JSON.stringify(obj));
  return corpo + '.' + b64u(crypto.createHmac('sha256', segredo).update(corpo).digest());
}
function confere(segredo, txt, agora){
  if (!segredo || typeof txt !== 'string' || txt.length > 8000) return null;   // v88: o bilhete leva os amigos e os bloqueios
  const i = txt.indexOf('.'); if (i < 1) return null;
  const corpo = txt.slice(0, i), sig = deB64u(txt.slice(i + 1));
  const certo = crypto.createHmac('sha256', segredo).update(corpo).digest();
  if (sig.length !== certo.length || !crypto.timingSafeEqual(sig, certo)) return null;
  let o; try { o = JSON.parse(deB64u(corpo).toString('utf8')); } catch (_) { return null; }
  if (!o || typeof o !== 'object') return null;
  if (typeof o.e === 'number' && o.e < (agora || Date.now())) return null;     // vencido
  return o;
}

module.exports = {Banco, sha, novoToken, novoId, limpa, chaveNome, inteiro, assina, confere, b64u};
