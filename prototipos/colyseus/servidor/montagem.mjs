/* =====================================================================================================================
   PROTÓTIPO COLYSEUS · O COLYSEUS DENTRO DE UM SERVIDOR HTTP QUE JÁ EXISTE
   O RACHA já tem o seu servidor (server/servidor.js: os arquivos do jogo + o WebSocket da turma em "/"; ou a plataforma,
   app/api/boot.ts, com a turma montada nela). O Colyseus entra no MESMO servidor, sem tomar conta dele:
     · o HTTP: só os pedidos /matchmake/* vão para o Colyseus (a reserva da vaga); o resto continua com quem já atendia;
     · o WebSocket: só os caminhos das salas do Colyseus (/<processo>/<sala>) são dele; o "/" continua sendo da turma.
   (É a sequência que o próprio Colyseus usa no plugin do Vite: setup → transporte sem servidor próprio + attachToServer →
   setTransport → as salas → accept. Com o `new Server().listen()` o Colyseus responderia todos os pedidos HTTP.)
   Duas travas a mais que o padrão do Colyseus não tem:
     · a origem: o padrão do Colyseus devolve a origem de quem pediu no CORS (qualquer site); aqui vale a regra da turma
       (o mesmo endereço, localhost, ou a lista RACHA_ORIGENS; sem o cabeçalho Origin — um programa, não um navegador — passa);
     · o tamanho: cada mensagem do aparelho até 4 KB (o comando do jogo tem ~60 bytes).
   ===================================================================================================================== */
import { matchMaker, createNodeMatchmakingMiddleware } from '@colyseus/core';
import { setTransport } from '@colyseus/core/Transport';
import { WebSocketTransport } from '@colyseus/ws-transport';

export const CAMINHO_SALA = /^\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+\/?$/;
const caminho = req => { try { return new URL(req.url || '/', 'http://x').pathname; } catch (_) { return '/'; } };
export const ehSalaColyseus = req => CAMINHO_SALA.test(caminho(req));
export const ehMatchmake = req => caminho(req).startsWith('/matchmake/');

// a mesma regra da turma (server/turma.js · origemPermitida)
export function origemPermitida(origem, host, lista) {
  if (!origem) return true;
  if (Array.isArray(lista) && (lista.includes(origem) || lista.includes('*'))) return true;
  let u; try { u = new URL(origem); } catch (_) { return false; }
  if (host && u.host === String(host).toLowerCase()) return true;
  return ['localhost', '127.0.0.1', '[::1]'].includes(u.hostname);
}

export async function montaColyseus(httpServer, defineSalas, o = {}) {
  const origens = o.origens || [];
  await matchMaker.setup(o.presence, o.driver);          // (um processo: a memória local; vários: o Redis — ver a AVALIACAO.md)
  const transporte = new WebSocketTransport({ noServer: true, maxPayload: o.maxPayload || 4096 });
  transporte.attachToServer(httpServer, { filter: req => ehSalaColyseus(req) && origemPermitida(req.headers.origin, req.headers.host, origens) });
  setTransport(transporte);
  // o CORS: só as origens que a turma também aceitaria (o padrão do Colyseus aceita qualquer uma)
  matchMaker.controller.getCorsHeaders = function (headers) {
    const og = headers.get('origin');
    return og && origemPermitida(og, headers.get('host'), origens) ? { 'Access-Control-Allow-Origin': og, Vary: 'Origin' } : { 'Access-Control-Allow-Origin': 'null', Vary: 'Origin' };
  };
  defineSalas(matchMaker);
  await matchMaker.accept();
  const mm = createNodeMatchmakingMiddleware();
  return {
    transporte,
    // o pedaço do HTTP: /matchmake/* (com a trava da origem); o resto, next()
    matchmake(req, res, next) {
      if (!ehMatchmake(req)) return next();
      if (!origemPermitida(req.headers.origin, req.headers.host, origens)) { res.writeHead(403, { 'content-type': 'text/plain' }); res.end('origem recusada'); return; }
      // (o middleware do Colyseus 0.18 só põe o CORS no OPTIONS: a resposta do POST sai sem ele e o navegador de outra
      //  origem não consegue ler a vaga — aqui ela leva a origem permitida, e só ela)
      if (req.headers.origin) { res.setHeader('Access-Control-Allow-Origin', req.headers.origin); res.setHeader('Vary', 'Origin'); }
      return mm(req, res, next);
    },
    async fecha() {
      await matchMaker.gracefullyShutdown();
      transporte.shutdown();
      try { matchMaker.presence && matchMaker.presence.shutdown(); } catch (_) {}
      try { matchMaker.driver && await matchMaker.driver.shutdown(); } catch (_) {}
    },
  };
}
