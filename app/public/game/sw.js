/* =====================================================================================================================
   RACHA v103 · o service worker do app instalado (o PWA): SEMPRE A REDE PRIMEIRO
   O jogo online só funciona com o jogo e o servidor na mesma versão: então nada aqui guarda o jogo para usar no lugar da
   rede. Cada pedido vai para a rede como sempre (o jogo novo chega na hora); a cópia guardada só aparece quando a rede
   falha (sem internet), para o app instalado ainda abrir e dar para treinar contra os bots.
   · só os pedidos GET desta pasta (o escopo: /game/), do mesmo endereço; o resto (a API da plataforma, o POST, os
     websockets das salas, as fontes de fora, os pedidos com Range) passa direto, como se o service worker nem existisse;
   · o jogo, os scripts, os estilos e o manifesto vão para a rede com "no-cache" (o navegador confere com o servidor;
     nada velho sai do cache do navegador);
   · a cópia fica num cache com a versão no nome; ao trocar a versão, o novo assume na hora (skipWaiting + clients.claim)
     e apaga os caches antigos;
   · a página só registra este arquivo por https (ou no localhost) e nunca em file:// (tools/v103/tela.js).
   Para desligar numa publicação: window.RACHA_CONFIG.sw = false (o config.js) — o jogo tira o registro deste arquivo.
   ===================================================================================================================== */
'use strict';
const VERSAO = 'v103-1';
const CACHE = 'racha-jogo-' + VERSAO;
const ESCOPO = new URL('./', self.location.href).pathname;          // (a pasta do jogo: /game/)
const JOGO = new URL('./racha.html', self.location.href).href;

self.addEventListener('install', () => { self.skipWaiting(); });
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    try {
      const nomes = await caches.keys();
      await Promise.all(nomes.filter(n => n.indexOf('racha-jogo-') === 0 && n !== CACHE).map(n => caches.delete(n)));
    } catch (_) {}
    await self.clients.claim();
  })());
});

function daPasta(req, url){                                          // este pedido é do jogo (e pode ter cópia)?
  if (req.method !== 'GET') return false;
  if (url.origin !== self.location.origin || url.pathname.indexOf(ESCOPO) !== 0) return false;
  if (/\/api\//.test(url.pathname)) return false;
  if (req.headers.has('range')) return false;
  if (req.cache === 'only-if-cached' && req.mode !== 'same-origin') return false;
  return true;
}
const CODIGO = /\.(html?|js|mjs|css|json|webmanifest)$/i;

self.addEventListener('fetch', e => {
  const req = e.request;
  let url;
  try { url = new URL(req.url); } catch (_) { return; }
  if (!daPasta(req, url)) return;
  const confere = req.cache === 'default' && (req.mode === 'navigate' || CODIGO.test(url.pathname) || url.pathname === ESCOPO);
  e.respondWith((async () => {
    try {
      const resp = await (confere ? fetch(req, {cache: 'no-cache'}) : fetch(req));
      if (resp && resp.status === 200 && resp.type === 'basic' && !/no-store/i.test(resp.headers.get('cache-control') || '')) {
        const copia = resp.clone();
        e.waitUntil(caches.open(CACHE).then(c => c.put(req, copia)).catch(() => {}));
      }
      return resp;
    } catch (erro) {                                                 // sem rede: a cópia (a página do jogo, para qualquer endereço dela)
      try {
        const c = await caches.open(CACHE);
        const guardada = (await c.match(req, {ignoreVary: true})) || (req.mode === 'navigate' && url.pathname.indexOf('rachao') < 0 ? await c.match(JOGO, {ignoreSearch: true}) : null);
        if (guardada) return guardada;
      } catch (_) {}
      throw erro;
    }
  })());
});
