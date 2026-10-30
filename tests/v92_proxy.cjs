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
   Responde "ok <comando>" na saída padrão. */
const net = require('net');
const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i > 0 ? process.argv[i + 1] : d; };
const PORTA = +arg('porta', 9100), DESTINO = +arg('destino', 9000);
let ATRASO = +arg('atraso', 50), OSCILA = +arg('oscila', 0);
const HOST = arg('host', '127.0.0.1');
const vivos = new Set();
let apagadoAte = 0;

function canal(de, para) {                                  // atrasa cada pedaço; nunca entrega fora de ordem
  let ultimo = 0;
  de.on('data', buf => {
    const agora = Date.now();
    let quando = agora + ATRASO + (OSCILA ? (Math.random() * 2 - 1) * OSCILA : 0);
    if (quando < apagadoAte + ATRASO) quando = apagadoAte + ATRASO;   // (o apagão: chega depois que a internet volta)
    if (quando < ultimo) quando = ultimo;                    // (a oscilação não troca a ordem)
    ultimo = quando;
    setTimeout(() => { if (!para.destroyed) para.write(buf); }, Math.max(0, quando - agora));
  });
  de.on('end', () => setTimeout(() => para.end(), Math.max(0, apagadoAte - Date.now()) + ATRASO + OSCILA + 5));
  de.on('error', () => para.destroy());
  de.on('close', () => { vivos.delete(de); });
}
net.createServer(cli => {
  cli.setNoDelay(true);
  const srv = net.connect(DESTINO, HOST);
  srv.setNoDelay(true);
  vivos.add(cli); vivos.add(srv);
  canal(cli, srv); canal(srv, cli);
  srv.on('error', () => cli.destroy());
  cli.on('close', () => { if (!srv.destroyed) setTimeout(() => srv.destroy(), ATRASO); });
  srv.on('close', () => { if (!cli.destroyed) setTimeout(() => cli.destroy(), Math.max(0, apagadoAte - Date.now()) + ATRASO); });
}).listen(PORTA, HOST, () => console.log('proxy ' + PORTA + ' → ' + DESTINO + ' · ' + ATRASO + ' ms (± ' + OSCILA + ') em cada sentido'));

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
