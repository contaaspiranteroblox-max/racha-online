'use strict';
/* RACHA v100 (segurança) · o endereço de quem conecta, sem acreditar no que o próprio cliente escreve.

   O X-Forwarded-For é uma lista: cada proxy ACRESCENTA, no fim, o endereço de quem falou com ele. O começo da lista vem
   do cliente — qualquer um escreve ali o que quiser (era assim que dava para trocar de "IP" a cada tentativa de senha e
   furar os limites por IP). Só valem os endereços que um proxy NOSSO acrescentou.

   A regra: se quem conectou no socket é um proxy confiável (o próprio computador, a rede interna 10/8, 172.16/12,
   192.168/16, fc00::/7, fe80::/10, ou os da variável RACHA_PROXIES), a lista é lida da direita para a esquerda, pulando os
   proxies — o primeiro que não é proxy é o cliente. Se quem conectou NÃO é um proxy confiável, vale o socket (e a lista é
   ignorada). Com o Caddy ou o nginx na frente (deploy/), o socket é 127.0.0.1 e o último da lista é o cliente.

   A CLOUDFLARE (o Render passa por ela; um site com a nuvem laranja também): dentro de uma lista que já começou num proxy
   nosso, os endereços da Cloudflare (a lista pública dela, abaixo) também contam como proxy — no Render chega
   "cliente, <Cloudflare>" e vale o cliente, não o endereço da Cloudflare (senão todo mundo que passa pelo mesmo ponto da
   Cloudflare dividiria os mesmos limites e o mesmo teto de conexões). Quando a lista acaba num endereço da Cloudflare (o
   proxy da frente trocou a lista pelo endereço dela), vale o CF-Connecting-IP, que a Cloudflare escreve.

   IPv6: o endereço vale pelo bloco /64 (a casa ou o celular do jogador; ninguém troca de "IP" dentro do próprio bloco
   para furar os limites).

   RACHA_PROXIES: mais endereços de proxies confiáveis (separados por vírgula; aceita prefixo IPv4 e IPv6, ex.
   "100.64.0.0/10, 2001:db8::/32"); a palavra "cloudflare" põe a lista da Cloudflare como proxy também no socket (o Node
   recebendo direto da Cloudflare, sem o Caddy/nginx no meio); "sem-cloudflare" não confia na Cloudflare em lugar nenhum.
   RACHA_PROXIES=nenhum: não confia em proxy nenhum (o socket sempre vale) — para o servidor exposto direto na internet. */
const net = require('net');

// a lista pública da Cloudflare (https://www.cloudflare.com/ips/, conferida em 30/10/2026)
const CLOUDFLARE = ['173.245.48.0/20', '103.21.244.0/22', '103.22.200.0/22', '103.31.4.0/22', '141.101.64.0/18', '108.162.192.0/18',
  '190.93.240.0/20', '188.114.96.0/20', '197.234.240.0/22', '198.41.128.0/17', '162.158.0.0/15', '104.16.0.0/13', '104.24.0.0/14',
  '172.64.0.0/13', '131.0.72.0/22',
  '2400:cb00::/32', '2606:4700::/32', '2803:f800::/32', '2405:b500::/32', '2405:8100::/32', '2a06:98c0::/29', '2c0f:f248::/32'];
const INTERNOS = ['127.0.0.0/8', '10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16', '::1/128', 'fc00::/7', 'fe80::/10'];

const v4 = ip => { const p = ip.split('.').map(Number); return p.length === 4 && p.every(n => Number.isInteger(n) && n >= 0 && n <= 255) ? ((p[0] << 24) >>> 0) + (p[1] << 16) + (p[2] << 8) + p[3] : null; };
function v6(ip){                                         // o endereço IPv6 como um número de 128 bits (BigInt) · null se não for
  if (!net.isIPv6(ip)) return null;
  let s = ip.toLowerCase();
  const fim4 = /(\d+\.\d+\.\d+\.\d+)$/.exec(s);          // (::ffff:1.2.3.4, 64:ff9b::1.2.3.4: os 32 bits do fim escritos como IPv4)
  if (fim4){ const n = v4(fim4[1]); if (n === null) return null; s = s.slice(0, -fim4[1].length) + (n >>> 16).toString(16) + ':' + (n & 0xffff).toString(16); }
  const metades = s.split('::');
  if (metades.length > 2) return null;
  const a = metades[0] ? metades[0].split(':') : [], b = metades.length === 2 && metades[1] ? metades[1].split(':') : [];
  const partes = metades.length === 2 ? a.concat(new Array(Math.max(0, 8 - a.length - b.length)).fill('0'), b) : a;
  if (partes.length !== 8) return null;
  let r = 0n;
  for (const p of partes){ if (!/^[0-9a-f]{1,4}$/.test(p)) return null; r = (r << 16n) | BigInt(parseInt(p, 16)); }
  return r;
}
const limpaIp = s => {                                   // "::ffff:1.2.3.4" → "1.2.3.4"; "[::1]:443" e "1.2.3.4:80" → sem a porta; "fe80::1%eth0" → sem a zona
  let t = String(s || '').trim();
  if (!t) return '';
  if (t[0] === '[') { const f = t.indexOf(']'); t = f > 0 ? t.slice(1, f) : t; }
  else if (/^\d+\.\d+\.\d+\.\d+:\d+$/.test(t)) t = t.slice(0, t.lastIndexOf(':'));
  const z = t.indexOf('%'); if (z > 0) t = t.slice(0, z);
  if (/^::ffff:\d+\.\d+\.\d+\.\d+$/i.test(t)) t = t.slice(7);
  return net.isIP(t) ? t.toLowerCase() : '';
};
function dentro(ip, prefixo){                            // ip dentro de "a.b.c.d/n" ou "x:y::/n" (ou igual ao endereço)
  const [base, bits] = String(prefixo).split('/');
  if (bits === undefined) return limpaIp(base) === ip;
  const n = Number(bits);
  if (net.isIPv4(ip) && net.isIPv4(base)){
    const a = v4(ip), b = v4(base);
    if (a === null || b === null || !(Number.isInteger(n) && n >= 0 && n <= 32)) return false;
    const m = n === 0 ? 0 : (0xffffffff << (32 - n)) >>> 0;
    return ((a & m) >>> 0) === ((b & m) >>> 0);
  }
  if (net.isIPv6(ip) && net.isIPv6(base)){
    const a = v6(ip), b = v6(base);
    if (a === null || b === null || !(Number.isInteger(n) && n >= 0 && n <= 128)) return false;
    const m = n === 0 ? 0n : ((1n << BigInt(n)) - 1n) << BigInt(128 - n);
    return (a & m) === (b & m);
  }
  return false;
}
function config(){                                       // o que a RACHA_PROXIES diz (lido a cada vez: os testes trocam a variável)
  const t = String(process.env.RACHA_PROXIES || '').trim();
  if (/^(nenhum|0|nao|não|false)$/i.test(t)) return null;
  const itens = t.split(',').map(s => s.trim()).filter(Boolean);
  return {extras:itens.filter(s => !/^(sem-)?cloudflare$/i.test(s)), cfNoSocket:itens.some(s => /^cloudflare$/i.test(s)), semCf:itens.some(s => /^sem-cloudflare$/i.test(s))};
}
const ehCloudflare = ip => { ip = limpaIp(ip); return !!ip && CLOUDFLARE.some(p => dentro(ip, p)); };
// quem conectou no socket pode falar pelo cliente? (o próprio computador, a rede interna, os de RACHA_PROXIES)
function proxyConfiavel(ip, cfg){
  ip = limpaIp(ip); if (!ip) return false;
  cfg = cfg === undefined ? config() : cfg;
  if (cfg === null) return false;                        // RACHA_PROXIES=nenhum
  if (cfg.extras.some(p => dentro(ip, p))) return true;
  if (cfg.cfNoSocket && ehCloudflare(ip)) return true;
  return INTERNOS.some(p => dentro(ip, p));
}
// a chave do endereço: o IPv4 como está; o IPv6 pelo bloco /64 ("2804:14c:1:2::/64")
function chaveIp(ip){
  ip = limpaIp(ip); if (!ip || !net.isIPv6(ip)) return ip;
  const n = v6(ip); if (n === null) return ip;
  const h = []; for (let i = 7; i >= 4; i--) h.push(((n >> BigInt(16*i)) & 0xffffn).toString(16));
  return h.join(':') + '::/64';
}
// remoto: o endereço do socket · xff: o X-Forwarded-For (texto) · real: o X-Real-IP · cf: o CF-Connecting-IP
function ipBruto(remoto, xff, real, cf){
  const sock = limpaIp(remoto), cfg = config();
  if (!proxyConfiavel(sock, cfg)) return sock || '';     // (sem proxy na frente: vale o socket; o cabeçalho é do cliente)
  const txt = String(xff || '').trim();
  const pulaCf = !cfg.semCf;
  if (!txt){                                             // (o proxy não mandou a lista: o X-Real-IP dele, senão o socket)
    const r = limpaIp(real);
    if (r && pulaCf && ehCloudflare(r) && limpaIp(cf)) return limpaIp(cf);
    return r || sock;
  }
  const lista = txt.split(',').map(limpaIp);
  let viuCf = false;
  for (let i = lista.length - 1; i >= 0; i--){            // da direita para a esquerda: o primeiro que não é proxy é o cliente
    const x = lista[i];
    if (!x) break;                                       // (um pedaço estragado: o que está à esquerda dele é do cliente e não vale)
    if (pulaCf && ehCloudflare(x)){ viuCf = true; continue; }
    if (!proxyConfiavel(x, cfg)) return x;
  }
  // (só proxies na lista: depois da Cloudflare, o CF-Connecting-IP que ela escreveu; só a rede interna — quem joga na mesma
  //  rede do servidor —, o da direita, o que o NOSSO proxy acrescentou)
  if (viuCf && limpaIp(cf)) return limpaIp(cf);
  return lista[lista.length - 1] || limpaIp(real) || sock;
}
function ipDe(remoto, xff, real, cf){ return chaveIp(ipBruto(remoto, xff, real, cf)); }
// a requisição do Node (http.IncomingMessage): o socket e os cabeçalhos
function ipCliente(req){
  if (!req) return '';
  const h = req.headers || {};
  return ipDe(req.socket && req.socket.remoteAddress, h['x-forwarded-for'], h['x-real-ip'], h['cf-connecting-ip']);
}
// o pedido chegou por https? (o próprio socket com TLS, ou o X-Forwarded-Proto de um proxy confiável)
function httpsDe(remoto, proto, tls){
  if (tls) return true;
  if (!proxyConfiavel(remoto)) return false;
  return /^https$/i.test(String(proto || '').split(',').pop().trim());
}

module.exports = { ipDe, ipCliente, httpsDe, proxyConfiavel, limpaIp, chaveIp, ehCloudflare, dentro };
