/* =====================================================================================================================
   PROTÓTIPO COLYSEUS · UM APARELHO DE MENTIRA (o cliente do Colyseus, em Node, para os testes)
   Usa o SDK do Colyseus 0.18 (@colyseus/sdk) do jeito que o jogo usaria: o bilhete da plataforma no Authorization, a
   entrada pelo matchmaking (joinOrCreate / create / joinById), o quadro em binário (codec.mjs) e os comandos no mesmo
   formato do jogo de hoje ({seq, x, y, button, k, kc, pc}), 60 por segundo num acumulador (como o tools/v92/rede.js).
   Com prever: true, a previsão da sua tampinha (previsao.mjs) anda com cada comando e se corrige a cada quadro.
   A queda e a volta (o que o jogo faria):
     · o SDK volta sozinho quando a conexão cai (1006: trocou do Wi-Fi para o 4G) — aqui com as tentativas cobrindo a
       janela de 90 s da sala (o padrão do SDK desiste em ~56 s) e valendo desde 1,5 s depois de entrar (o padrão é 5 s);
     · os comandos que ficaram para trás na queda NÃO são mandados na volta (maxEnqueuedMessages 0): a fila do motor
       recomeça na volta, e comando velho só atrasaria a tampinha;
     · o freio do jogo de hoje: depois de 2 s sem nenhum quadro, o aparelho para de mandar comandos (o apagão não vira uma
       rajada de comandos quando a internet volta) e recomeça no primeiro quadro;
     · na volta (a mensagem 'i' com volta), a previsão recomeça do quadro-chave;
     · a volta pela conta (outro aparelho, ou a página recarregada sem o token): POST /racha/volta com o bilhete.
   ===================================================================================================================== */
import { Client } from '@colyseus/sdk';
import { novoDesempacotador } from '../servidor/codec.mjs';
import { novaPrevisao } from './previsao.mjs';

export const RECONEXAO = { maxRetries: 25, minUptime: 1500, maxEnqueuedMessages: 0 };
export const FREIO_MS = 2000;

export class Aparelho {
  constructor(endereco, { bilhete = null, nome = 'Aparelho', prever = false, reconexao = RECONEXAO, freio = FREIO_MS } = {}) {
    this.endereco = endereco;
    this.sdk = new Client(endereco);
    this.bilhete = bilhete;
    if (bilhete) this.sdk.auth.token = bilhete;
    this.nome = nome; this.prever = prever; this.reconexao = reconexao; this.freio = freio;
    this.D = novoDesempacotador();
    this.nQuadros = 0; this.ultimo = null; this.info = null; this.selo = null; this.fim = null; this.comecou = null;
    this.avisos = []; this.gols = []; this.saidas = []; this.quedas = 0; this.voltas = 0; this.bytesQuadros = 0;
    this.seq = 0; this.timer = null; this.prev = null; this.aoQuadro = null; this.acks = []; this.ack = 0;
    this.tQuadro = 0; this.freados = 0; this.marcas = []; this.mandados = 0;
  }
  marca(ev, extra) { this.marcas.push({ t: Date.now(), ev, ...(extra || {}) }); }
  async entra(metodo, nomeOuId, opcoes = {}) {
    // (a recusa do servidor tem um código numérico — sala cheia, bilhete inválido…: não adianta tentar de novo; a falha da
    //  rede no meio da entrada vem sem código — o jogo tenta mais uma vez, como aqui)
    for (let k = 0; ; k++) {
      try {
        const sala = await this.sdk[metodo](nomeOuId, { nome: this.nome, ...opcoes });
        this.liga(sala);
        return sala;
      } catch (e) {
        if (k >= 1 || (e && typeof e.code === 'number')) throw e;
        this.tentouDeNovo = (this.tentouDeNovo | 0) + 1; this.marca('entrada de novo', { erro: String(e && (e.message || e.code)) });
        await espera(300);
      }
    }
  }
  // a ranqueada: entra na fila (o bilhete diz quem é e o rank), espera a vaga ('seat'), entra na sala e confirma
  async fila(n, extra = {}, ms = 30000) {
    const f = await this.sdk.joinOrCreate('fila', { ...extra, n });
    this.salaFila = f; this.naFila = 0;
    return new Promise((ok, erro) => {
      const prazo = setTimeout(() => erro(new Error('a fila não chamou em ' + ms + ' ms')), ms);
      f.onMessage('clients', k => { this.naFila = k; });
      f.onMessage('seat', async seat => {
        try { const sala = await this.sdk.consumeSeatReservation(seat); this.liga(sala); f.send('confirm'); clearTimeout(prazo); this.marca('fila chamou'); ok(sala); }
        catch (e) { clearTimeout(prazo); erro(e); }
      });
      f.onLeave(code => { if (!this.sala) { clearTimeout(prazo); erro(Object.assign(new Error('a fila fechou'), { code })); } });
    });
  }
  // a vaga que o servidor reservou (a fila, ou a sala da turma pela ponte): entra direto, sem o matchmaking
  async vaga(seat) { const sala = await this.sdk.consumeSeatReservation(seat); this.liga(sala); return sala; }
  async volta(token) {                                     // a volta "na mão" (o SDK devolve uma sala nova: os ouvidos de novo)
    const sala = await this.sdk.reconnect(token || this.sala.reconnectionToken);
    this.liga(sala);
    return sala;
  }
  // a volta pela conta: pede o token da vaga guardada (o bilhete prova a conta) e volta com ele
  async voltaPelaConta() {
    const http = this.endereco.replace(/^ws/, 'http');
    const r = await fetch(http + '/racha/volta', { method: 'POST', headers: this.bilhete ? { authorization: 'Bearer ' + this.bilhete } : {} });
    if (r.status !== 200) { const e = new Error('volta pela conta: ' + r.status); e.code = r.status; throw e; }
    const { token } = await r.json();
    return this.volta(token);
  }
  liga(sala) {
    this.sala = sala;
    if (sala.reconnection && this.reconexao) Object.assign(sala.reconnection, this.reconexao);
    sala.onMessage('q', bytes => {
      const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
      this.bytesQuadros += u8.length;
      const Q = this.D.desempacota(u8);
      this.ultimo = Q; this.nQuadros++; this.tQuadro = performance.now();
      if (this.info && Q.players[this.info.lugar]) { this.ack = Q.players[this.info.lugar][4]; this.acks.push(this.ack); }
      if (this.prev && this.info) this.correcao = this.prev.quadro(Q, this.info.lugar);   // (quanto a previsão pulou neste quadro)
      if (this.aoQuadro) this.aoQuadro(Q);
    });
    sala.onMessage('i', m => {
      this.info = m;
      if (m.volta) { this.marca('volta'); if (this.prever) this.prev = novaPrevisao({ n: m.n }); }   // (a previsão recomeça do quadro-chave)
      else if (this.prever && !this.prev) this.prev = novaPrevisao({ n: m.n });
    });
    sala.onMessage('comeca', m => { this.comecou = m; });
    sala.onMessage('gol', g => { this.gols.push(g); });
    sala.onMessage('aviso', t => { this.avisos.push(t); });
    sala.onMessage('selo', s => { this.selo = s; });
    sala.onMessage('fim', m => { this.fim = m; });
    if (typeof sala.onDrop === 'function') sala.onDrop(code => { this.quedas++; this.marca('queda', { code }); });
    if (typeof sala.onReconnect === 'function') sala.onReconnect(() => { this.voltas++; this.marca('reconectou'); });
    sala.onLeave(code => { this.saidas.push(code); this.marca('saiu', { code }); this.para(); });
  }
  manda(tipo, m) { this.sala.send(tipo, m); }
  // os comandos, 60 por segundo de verdade: dir(seq) → {x, y, button?, kc?, pc?}
  joga(dir) {
    this.para();
    const t0 = performance.now(); let feitos = 0;
    const laco = () => {
      const agora = performance.now();
      const alvo = Math.floor((agora - t0) * 60 / 1000);
      // (o freio: 2 s sem quadro → não manda; o primeiro quadro solta)
      if (this.freio && this.nQuadros > 0 && agora - this.tQuadro > this.freio) { this.freados += alvo - feitos; feitos = alvo; }
      while (feitos < alvo) {
        feitos++;
        const d = dir(this.seq + 1) || {};
        const c = { seq: ++this.seq, x: d.x || 0, y: d.y || 0, button: d.button || 1, k: 0, kc: d.kc | 0, pc: d.pc | 0 };
        try { this.sala.send('c', c); this.mandados++; } catch (_) {}
        if (this.prev) this.prev.comando(c);
      }
      this.timer = setTimeout(laco, Math.max(1, t0 + (feitos + 1) * 1000 / 60 - performance.now()));
    };
    laco();
  }
  para() { if (this.timer) { clearTimeout(this.timer); this.timer = null; } }
  // a página fechou de repente (sem "tchau"): a conexão cai sem consentimento e este aparelho não tenta voltar
  some() { this.para(); try { this.sala.reconnection.enabled = false; } catch (_) {} try { this.sala.leave(false); } catch (_) {} }
  async sai() { this.para(); try { await this.sala.leave(true); } catch (_) {} }
}

export const espera = ms => new Promise(ok => setTimeout(ok, ms));
export async function ate(cond, ms, passo = 20) { const fim = Date.now() + ms; while (Date.now() < fim) { if (cond()) return true; await espera(passo); } return !!cond(); }
