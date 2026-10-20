// RACHA · a conferência do MULTIPLAYER: abre uma conexão WebSocket nas salas (o mesmo endereço do site), manda o "hello"
// como o jogo manda e espera a resposta do servidor (5 s). Não cria sala, não entra em partida e não grava nada.
// Uso: node verifica_salas.mjs http://127.0.0.1:3000
const base = process.argv[2] || 'http://127.0.0.1:3000';
const ws = new WebSocket(base.replace(/^http/, 'ws') + '/', { headers: { Origin: base } });
const fim = (cod, txt) => { console.log((cod ? '  ✖ ' : '  ✔ ') + txt); try { ws.close(); } catch (_) {} process.exit(cod); };
const t = setTimeout(() => fim(1, 'as salas não responderam em 5 s'), 5000);
ws.onopen = () => ws.send(JSON.stringify({ type: 'hello', name: 'conferencia-deploy' }));
ws.onmessage = (e) => {
  let m = null; try { m = JSON.parse(e.data); } catch (_) {}
  if (m && typeof m.type === 'string') { clearTimeout(t); fim(0, 'as salas responderam (' + m.type + ')'); }
};
ws.onerror = () => { clearTimeout(t); fim(1, 'não deu para conectar nas salas (WebSocket)'); };
