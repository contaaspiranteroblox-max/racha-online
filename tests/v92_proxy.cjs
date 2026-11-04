'use strict';
/* RACHA v92 · um "4G de mentira" para os testes: um proxy TCP que atrasa cada pedaço de dado nos dois sentidos (a mesma
   ordem de chegada, como no TCP de verdade), com uma oscilação opcional. Fica entre o navegador de teste e o servidor da
   turma: o WebSocket do jogo passa por ele, então o comando sobe atrasado e o quadro desce atrasado.
   Uso: node tests/v92_proxy.cjs --porta 9100 --destino 9000 --atraso 50 --oscila 10 [--controle]
        (--atraso = ms em cada sentido: ida e volta = 2×; --oscila = ± ms aleatórios por pedaço)
   --controle: lê comandos na entrada padrão, um por linha (os testes de reconexão da v92):
        apaga MS   a internet some por MS ms sem cair a conexão: nada passa, e o que ficou parado chega depois, em ordem
                   (o TCP de verdade segura e reenvia) — um soluço curto ou um apagão;
        corta      as conexões abertas caem agora (os dois lados): como trocar do Wi-Fi para o 4G;
        atraso MS  muda o atraso de cada sentido; oscila MS muda a oscilação.
   Responde "ok <comando>" na saída padrão.
   v102 (as medidas do online liso, tests/v102_rede_medidas.py) — opcionais; sem eles o proxy é o mesmo de antes:
     --pico MS --pico-cada MS   os picos do rádio do celular: em cada conexão (os dois sentidos juntos: é o rádio de UM
                                aparelho), em média a cada pico-cada ms (sorteado), nada passa por MS ms; o que ficou parado
                                chega depois, em ordem e de uma vez (o TCP segura e reenvia);
     --rajada P --rajada-ms MS  os pacotes que chegam juntos: cada pedaço, com a chance P (0..1), fica parado mais 10..MS ms
                                (o que vem atrás dele espera e chega junto);
     --semente N                o sorteio repetível (a mesma rede de mentira em duas medidas);
     --estat                    no fim (SIGTERM), uma linha "estat {...}" com o que passou (pedaços, picos, rajadas). */
const net = require('net');
const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i > 0 ? process.argv[i + 1] : d; };
const PORTA = +arg('porta', 9100), DESTINO = +arg('destino', 9000);
let ATRASO = +arg('atraso', 50), OSCILA = +arg('oscila', 0);
const HOST = arg('host', '127.0.0.1');
const PICO = +arg('pico', 0), PICO_CADA = +arg('pico-cada', 0), RAJADA = +arg('rajada', 0), RAJADA_MS = +arg('rajada-ms', 40);
const vivos = new Set();
let apagadoAte = 0;
// (v102) o sorteio: com --semente, repetível (mulberry32); sem ela, o Math.random de sempre
let rnd = Math.random;
if (arg('semente', null) !== null) { let a = (+arg('semente', 1)) >>> 0; rnd = () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const EST = { pedacos: 0, bytes: 0, picos: 0, rajadas: 0, conexoes: 0 };

function canal(de, para, radio) {                           // atrasa cada pedaço; nunca entrega fora de ordem
  let ultimo = 0;
  de.on('data', buf => {
    const agora = Date.now();
    let quando = agora + ATRASO + (OSCILA ? (rnd() * 2 - 1) * OSCILA : 0);
    if (RAJADA > 0 && rnd() < RAJADA) { quando += 10 + rnd() * Math.max(0, RAJADA_MS - 10); EST.rajadas++; }   // (v102: a rajada)
    if (quando < apagadoAte + ATRASO) quando = apagadoAte + ATRASO;   // (o apagão: chega depois que a internet volta)
    if (radio && quando < radio.ate + ATRASO) quando = radio.ate + ATRASO;   // (v102: o pico do rádio deste aparelho)
    if (quando < ultimo) quando = ultimo;                    // (a oscilação não troca a ordem)
    ultimo = quando; EST.pedacos++; EST.bytes += buf.length;
    setTimeout(() => { if (!para.destroyed) para.write(buf); }, Math.max(0, quando - agora));
  });
  de.on('end', () => setTimeout(() => para.end(), Math.max(0, Math.max(apagadoAte, radio ? radio.ate : 0) - Date.now()) + ATRASO + OSCILA + (RAJADA > 0 ? RAJADA_MS : 0) + 5));
  de.on('error', () => para.destroy());
  de.on('close', () => { vivos.delete(de); });
}
function novoRadio() {                                      // (v102) os picos de UM aparelho: os dois sentidos da conexão param juntos
  const r = { ate: 0, t: null };
  if (!(PICO > 0 && PICO_CADA > 0)) return r;
  const proximo = () => {
    const espera = -Math.log(1 - rnd()) * PICO_CADA;         // (em média a cada PICO_CADA ms)
    r.t = setTimeout(() => { r.ate = Math.max(r.ate, Date.now() + PICO); EST.picos++; proximo(); }, espera);
    if (r.t.unref) r.t.unref();
  };
  proximo();
  return r;
}
net.createServer(cli => {
  cli.setNoDelay(true);
  const srv = net.connect(DESTINO, HOST);
  srv.setNoDelay(true);
  vivos.add(cli); vivos.add(srv); EST.conexoes++;
  const radio = novoRadio();
  canal(cli, srv, radio); canal(srv, cli, radio);
  srv.on('error', () => cli.destroy());
  cli.on('close', () => { if (radio.t) clearTimeout(radio.t); if (!srv.destroyed) setTimeout(() => srv.destroy(), ATRASO); });
  srv.on('close', () => { if (!cli.destroyed) setTimeout(() => cli.destroy(), Math.max(0, apagadoAte - Date.now()) + ATRASO); });
}).listen(PORTA, HOST, () => console.log('proxy ' + PORTA + ' → ' + DESTINO + ' · ' + ATRASO + ' ms (± ' + OSCILA + ') em cada sentido'
  + (PICO > 0 && PICO_CADA > 0 ? ' · picos de ' + PICO + ' ms a cada ~' + PICO_CADA + ' ms' : '') + (RAJADA > 0 ? ' · rajadas ' + RAJADA + ' (até ' + RAJADA_MS + ' ms)' : '')));

if (process.argv.includes('--estat')) {
  const fim = () => { console.log('estat ' + JSON.stringify(EST)); process.exit(0); };
  process.on('SIGTERM', fim); process.on('SIGINT', fim);
}
if (process.argv.includes('--controle')) {
  let resto = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', txt => {
    resto += txt;
    let i;
    while ((i = resto.indexOf('\n')) >= 0) {
      const linha = resto.slice(0, i).trim(); resto = resto.slice(i + 1);
      const [cmd, v] = linha.split(/\s+/);
      if (cmd === 'apaga') apagadoAte = Math.max(apagadoAte, Date.now() + (+v || 0));
      else if (cmd === 'corta') { for (const s of vivos) s.destroy(); vivos.clear(); }
      else if (cmd === 'atraso') ATRASO = +v || 0;
      else if (cmd === 'oscila') OSCILA = +v || 0;
      else continue;
      console.log('ok ' + linha);
    }
  });
}
