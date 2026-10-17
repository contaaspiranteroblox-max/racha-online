#!/usr/bin/env python3
# RACHA v83 · SALAS 100% HOSPEDADAS — os 15 testes obrigatórios do plano, de ponta a ponta:
# o servidor de verdade (server/servidor.js) no ar e jogadores de verdade (WebSocket do navegador,
# via Playwright) em salas públicas, privadas e ranqueadas — ninguém é anfitrião em nenhuma.
# Roda:  python3 tests/v83_salas_ws_test.py   (precisa do Playwright com um Chromium; RACHA_CHROME aponta outro)
import json, subprocess, sys, time, os, base64, hmac, hashlib
from playwright.sync_api import sync_playwright

PORTA = 8978
SEGREDO = 'segredo-de-teste-v83-salas'
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

ok = falhou = 0
def confere(cond, txt, extra=None):
    global ok, falhou
    if cond: ok += 1; print('  ok   ' + txt)
    else: falhou += 1; print('  FALHOU  ' + txt + (('  ·  ' + json.dumps(extra, ensure_ascii=False)[:300]) if extra is not None else ''))

def bilhete(id_publico, nome):
    corpo = base64.urlsafe_b64encode(json.dumps({'p': id_publico, 'n': nome, 's': []}).encode()).rstrip(b'=').decode()
    sig = base64.urlsafe_b64encode(hmac.new(SEGREDO.encode(), corpo.encode(), hashlib.sha256).digest()).rstrip(b'=').decode()
    return corpo + '.' + sig

def selo_confere(txt):
    try:
        corpo, sig = txt.split('.', 1)
        certo = base64.urlsafe_b64encode(hmac.new(SEGREDO.encode(), corpo.encode(), hashlib.sha256).digest()).rstrip(b'=').decode()
        if sig != certo: return None
        return json.loads(base64.urlsafe_b64decode(corpo + '=='))
    except Exception:
        return None

def proc_stat(pid):
    with open('/proc/%d/stat' % pid) as f: partes = f.read().split()
    with open('/proc/%d/status' % pid) as f: status = f.read()
    rss = [int(l.split()[1]) for l in status.splitlines() if l.startswith('VmRSS')][0]
    return int(partes[13]) + int(partes[14]), rss   # utime + stime (jiffies), RSS em kB

proc = subprocess.Popen(
    ['node', os.path.join(RAIZ, 'server', 'servidor.js'), '--porta', str(PORTA), '--host', '127.0.0.1',
     '--memoria', '--segredo', SEGREDO, '--tempo-normal', '14', '--prorrogacao', '8'],
    stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
time.sleep(2.5)

try:
    with sync_playwright() as pw:
        chrome = os.environ.get('RACHA_CHROME')
        b = pw.chromium.launch(executable_path=chrome, args=['--no-sandbox']) if chrome else pw.chromium.launch(args=['--no-sandbox'])
        pag = b.new_page()
        pag.goto('http://127.0.0.1:%d/game/config.js' % PORTA)

        # ======================= PARTE 1 · a sala clássica hospedada (pública e privada) =======================
        r1 = pag.evaluate("""async ([porta, bilA, bilB, bilC]) => {
          const L = {erros: []};
          const cli = (bil, nome) => new Promise((res, rej) => {
            const ws = new WebSocket('ws://127.0.0.1:' + porta + '/');
            const c = {ws, nome, id: null, seq: 0, msgs: [], snaps: [], porTick: new Map(), bytes: 0, room: null, start: null, result: null, pong: [], say: []};
            ws.onopen = () => ws.send(JSON.stringify({type: 'hello', name: nome, conta: bil, skin: '', flag: 'BR'}));
            ws.onmessage = ev => {
              c.bytes += ev.data.length;
              const m = JSON.parse(ev.data);
              if (m.type === 'hello') { c.id = m.id; res(c); }
              else if (m.type === 'room') c.room = m.room;
              else if (m.type === 'rooms') c.rooms = m.list;
              else if (m.type === 'start') c.start = m;
              else if (m.type === 'snapshot') { c.snaps.push(m); if (m.data && m.data.tick != null) c.porTick.set(m.data.tick, m.data); }
              else if (m.type === 'result') c.result = m;
              else if (m.type === 'pong') c.pong.push(Date.now() - (m.time || Date.now()));
              else if (m.type === 'say') c.say.push(m);
              else if (m.type === 'erro' || m.type === 'error') L.erros.push(nome + ': ' + (m.msg || m.text || m.motivo));
            };
            ws.onerror = () => rej(new Error('ws falhou ' + nome));
            setTimeout(() => rej(new Error('hello demorou ' + nome)), 8000);
          });
          const manda = (c, obj) => c.ws.send(JSON.stringify(obj));
          const input = (c, x, y, button = 1, k = 0) => manda(c, {type: 'input', seq: ++c.seq, x, y, button, k});
          const espera = ms => new Promise(r => setTimeout(r, ms));
          const ate = async (fn, ms, rotulo) => { const t0 = Date.now(); while (!fn()) { if (Date.now() - t0 > ms) throw new Error('demorou: ' + rotulo); await espera(100); } };

          const A = await cli(bilA, 'Ana'), B = await cli(bilB, 'Bia'), C = await cli(bilC, 'Cris');

          // (1) a sala PÚBLICA aparece na lista
          manda(A, {type: 'create', name: 'Sala da Ana', n: 1, map: 4, jogo: 'futebol', tempo: 0, bots: true, pub: true});
          await ate(() => A.room && A.room.code, 5000, 'criar a sala pública');
          L.salaPub = A.room.code;
          manda(B, {type: 'list'});
          await ate(() => !!(B.rooms && B.rooms.some(x => x.code === L.salaPub)), 5000, 'a lista de salas com a sala da Ana');
          L.pubNaLista = true;

          // (2) a sala PRIVADA não aparece na lista e entra pelo código
          manda(C, {type: 'create', name: 'Fechada', n: 1, map: 0, jogo: 'curva', tempo: 0, bots: true, pub: false});
          await ate(() => C.room && C.room.code, 5000, 'criar a sala privada');
          L.salaPriv = C.room.code;
          manda(B, {type: 'list'});
          await espera(700);
          L.privForaDaLista = !B.rooms.some(x => x.code === L.salaPriv);
          manda(B, {type: 'join', code: L.salaPriv, rapido: true});
          await ate(() => B.room && B.room.code === L.salaPriv, 5000, 'entrar na privada pelo código');
          L.privPeloCodigo = true;
          L.privServidor = B.room.servidor === true && B.room.host === 'srv';
          manda(B, {type: 'leave'});
          await espera(400);

          // (3)+(4) dois clientes na MESMA partida, começada pelo admin
          manda(B, {type: 'join', code: L.salaPub, rapido: true});
          await ate(() => B.room && B.room.code === L.salaPub && B.room.roster.filter(Boolean).length >= 2, 5000, 'a Bia sentar na sala pública');
          L.rosterAntes = B.room.roster.slice();
          manda(A, {type: 'start'});
          await ate(() => !!A.start && !!B.start, 5000, 'o start chegar nos dois');
          L.startHostSrv = A.start.room.host === 'srv' && A.start.room.servidor === true;
          L.adminEhCriador = A.start.room.admin === A.id && B.start.room.admin === A.id;
          L.mesmaRodada = A.start.round === B.start.round;

          // ping do protocolo (latência de ida e volta no WebSocket)
          for (let i = 0; i < 5; i++) { manda(B, {type: 'ping', time: Date.now()}); await espera(200); }

          // (5)+(6) os quadros do servidor chegam nos DOIS e os comandos dos dois valem (o ack anda)
          const t0 = Date.now();
          while (Date.now() - t0 < 6000) {
            input(A, 1, 0); input(B, -1, 0);
            await espera(33);
          }
          L.snapsA = A.snaps.length; L.snapsB = B.snaps.length;
          const ackDe = (c) => { const s = c.snaps[c.snaps.length - 1]; const i = c.start.room.roster.indexOf(c.id); return s && i >= 0 ? s.data.players[i][4] : -1; };
          L.ackA = ackDe(A); L.ackB = ackDe(B);
          // a bola é a MESMA nos dois aparelhos (o servidor é a única fonte)
          let comuns = 0, iguais = 0;
          for (const [tk, d] of A.porTick) if (B.porTick.has(tk)) { comuns++; const e = B.porTick.get(tk); if (d.ball[0] === e.ball[0] && d.ball[1] === e.ball[1]) iguais++; }
          L.bolaComuns = comuns; L.bolaIguais = iguais;

          // (7) o criador tenta mandar quadro e resultado (a física do aparelho NÃO vale mais nada)
          manda(A, {type: 'snapshot', round: A.start.round, data: {tick: 99999, elapsed: 0, state: 'jogo', kickoff: 0, score: [9, 0], ball: [0, 0, 0, 0, 0], players: []}});
          manda(A, {type: 'finish', round: A.start.round, score: [9, 0]});
          await espera(1200);
          L.resultadoFalso = !!(A.result || B.result);
          const sReal = B.snaps[B.snaps.length - 1];
          L.placarReal = sReal ? sReal.data.score : null;
          L.seguiuDepoisDaTrapaça = B.snaps.length > L.snapsB;

          // (10) perda de pacotes: a Bia para de mandar comandos — a tampinha dela para, a partida segue
          const t1 = Date.now();
          while (Date.now() - t1 < 2500) { input(A, 0, 1); await espera(33); }
          const sB = A.snaps[A.snaps.length - 1], iB = A.start.room.roster.indexOf(B.id), iA = A.start.room.roster.indexOf(A.id);
          L.velBiaParada = Math.abs(sB.data.players[iB][2]) + Math.abs(sB.data.players[iB][3]) < 1;
          L.ackAnaAndou = sB.data.players[iA][4] > L.ackA;

          // (8) o criador CAI no meio da partida: só ele sai — a partida segue para os outros
          const adminAntes = B.room.admin;
          A.ws.close();
          await espera(2000);
          L.partidaSeguiu = B.snaps.length > 0 && (B.snaps[B.snaps.length - 1].data.tick - sB.data.tick) > 30;
          L.adminTransferido = B.room && B.room.admin === B.id && B.room.host === 'srv';
          L.salaAindaJogando = B.room && B.room.state === 'playing';
          L.avisoQueda = B.say.some(x => x.sys && /caiu/.test(x.text || ''));

          // (9) a reconexão: o criador volta em até 90 s e reassume a tampinha
          const A2 = await cli(bilA, 'Ana');
          manda(A2, {type: 'join', code: L.salaPub, slot: 0});   // a reserva guardou o lugar 0 por 90 s
          await ate(() => !!A2.start, 6000, 'o start da reconexão (sem isso a reserva falhou)');
          L.reconectouJogando = A2.start.room.state === 'playing' && !!A2.start.resume;
          L.voltouAdmin = A2.start.room.admin === B.id;   // o admin ficou com quem estava na sala
          const t2 = Date.now();
          while (Date.now() - t2 < 2000) { input(A2, 1, 1); input(B, 0, -1); await espera(33); }
          L.ackVolta = ackDe(A2) >= 0 && ackDe(A2) > 0;

          // (11) o fim da partida pelo servidor: a Ana vai embora de vez — o bot assume e joga
          // contra a Bia parada até a meta; o resultado e o selo chegam para quem ficou
          A2.ws.close();
          await espera(800);
          L.fim = await (async () => {
            const t3 = Date.now();
            while (!B.result && Date.now() - t3 < 240000) { await espera(500); }
            return B.result;
          })();
          L.golPayload = B.snaps.some(s => s.data.goal && typeof s.data.goal.name === 'string');
          window.__L1 = L; window.__cli = {A: A2, B, C, manda, input, espera, ate};
          return L;
        }""", [PORTA, bilhete(123, 'Ana'), bilhete(456, 'Bia'), bilhete(789, 'Cris')])

        print('1) a sala pública é hospedada no servidor')
        confere(r1['pubNaLista'], 'a sala pública apareceu na lista de salas')
        print('2) a sala privada (por código) também é hospedada')
        confere(r1['privForaDaLista'] and r1['privPeloCodigo'], 'a privada não aparece na lista e entra pelo código')
        confere(r1['privServidor'], 'a privada já nasce hospedada (host srv)')
        print('3) dois aparelhos na mesma partida · 4) o admin começa')
        confere(r1['startHostSrv'] and r1['mesmaRodada'], 'os dois receberam o start da MESMA partida, com host srv (ninguém é anfitrião)')
        confere(r1['adminEhCriador'], 'o criador é o admin (só a função de administrar)')
        print('5/11/12) os quadros do servidor: mesma bola, gol e placar sincronizados')
        confere(r1['snapsA'] > 120 and r1['snapsB'] > 120, 'quadros a ~30/s para os dois (%d e %d)' % (r1['snapsA'], r1['snapsB']))
        confere(r1['bolaComuns'] > 50 and r1['bolaIguais'] == r1['bolaComuns'], 'a bola é IDÊNTICA nos dois aparelhos em todos os %d ticks comuns' % r1['bolaComuns'])
        confere(r1['ackA'] > 60 and r1['ackB'] > 60, 'os comandos dos dois lados valem no servidor (acks %d e %d)' % (r1['ackA'], r1['ackB']))
        confere(r1['golPayload'], 'o gol chegou no quadro com a autoria (o pacote clássico)')
        print('7/15) a física do aparelho não vale nada (nem quadro, nem resultado)')
        confere(not r1['resultadoFalso'], 'snapshot e finish falsos do criador foram ignorados (nenhum resultado 9×0)')
        confere(r1['placarReal'] is not None and r1['placarReal'] != [9, 0] and r1['seguiuDepoisDaTrapaça'], 'a partida seguiu com o placar REAL do servidor: ' + str(r1['placarReal']))
        print('9) perda de pacotes: a tampinha para, a partida segue')
        confere(r1['velBiaParada'], 'sem comandos por 2,5 s, a tampinha da Bia parou (a regra do silêncio)')
        confere(r1['ackAnaAndou'], 'a Ana continuou jogando normalmente')
        print('5/6) o criador cai: só ele sai, a partida continua (a REGRA FUNDAMENTAL)')
        confere(r1['partidaSeguiu'] and r1['salaAindaJogando'], 'os quadros continuaram para a Bia e a sala segue jogando')
        confere(r1['adminTransferido'], 'só a função de admin passou para a Bia (a simulação nunca saiu do servidor)')
        confere(r1['avisoQueda'], 'a sala foi avisada da queda')
        print('10) a reconexão em até 90 s')
        confere(r1['reconectouJogando'], 'a Ana reconectou no MESMO lugar, com a partida rolando (resume)')
        confere(r1['ackVolta'], 'os comandos dela voltaram a valer')
        confere(r1['voltouAdmin'], 'o admin continuou com a Bia (não volta atrás sozinho)')
        print('8) o fim pelo servidor, com resultado e selo')
        confere(bool(r1['fim']), 'a partida terminou pelo servidor e o resultado chegou')
        if r1['fim']:
            confere(r1['fim']['valida'] is True, 'o resultado valeu (conferido)', r1['fim'])
            selo = selo_confere(r1['fim'].get('selo', ''))
            confere(bool(selo) and selo.get('j') == '000456', 'o selo da Bia confere na plataforma', selo)
        confere(not r1['erros'], 'nenhum erro de protocolo no caminho', r1['erros'])

        # ======================= PARTE 2 · a ranqueada também é 100% hospedada (v80) =======================
        r2 = pag.evaluate("""async ([porta, bilD, bilE]) => {
          const L = {erros: []};
          const cli = (bil, nome) => new Promise((res, rej) => {
            const ws = new WebSocket('ws://127.0.0.1:' + porta + '/');
            const c = {ws, nome, id: null, seq: 0, snaps: 0, room: null, start: null, result: null, relogios: 0};
            ws.onopen = () => ws.send(JSON.stringify({type: 'hello', name: nome, conta: bil, skin: '', flag: 'BR'}));
            ws.onmessage = ev => {
              const m = JSON.parse(ev.data);
              if (m.type === 'hello') { c.id = m.id; res(c); }
              else if (m.type === 'room') c.room = m.room;
              else if (m.type === 'start') c.start = m;
              else if (m.type === 'snapshot') c.snaps++;
              else if (m.type === 'relogio') c.relogios++;
              else if (m.type === 'result') c.result = m;
            };
            ws.onerror = () => rej(new Error('ws falhou ' + nome));
            setTimeout(() => rej(new Error('hello demorou ' + nome)), 8000);
          });
          const espera = ms => new Promise(r => setTimeout(r, ms));
          const D = await cli(bilD, 'Duda'), E = await cli(bilE, 'Enzo');
          D.ws.send(JSON.stringify({type: 'fila', n: 1, pts: 100}));
          E.ws.send(JSON.stringify({type: 'fila', n: 1, pts: 120}));
          const t0 = Date.now();
          while ((!D.start || !E.start) && Date.now() - t0 < 12000) await espera(150);
          if (!D.start || !E.start) throw new Error('a ranqueada não começou');
          L.roomRanked = D.start.room.ranked === true && D.start.room.servidor === true && D.start.room.host === 'srv' && D.start.room.admin === null;
          L.regraV80 = D.start.room.regra === 'v80';
          const t1 = Date.now();
          while (Date.now() - t1 < 3000) {
            D.ws.send(JSON.stringify({type: 'input', seq: ++D.seq, x: 1, y: 0, button: 1, k: 0}));
            E.ws.send(JSON.stringify({type: 'input', seq: ++E.seq, x: -1, y: 0, button: 1, k: 0}));
            await espera(33);
          }
          L.snapsD = D.snaps; L.relogiosD = D.relogios;
          const t2 = Date.now();
          while (!D.result && Date.now() - t2 < 60000) await espera(400);
          const t3 = Date.now();
          while (!E.result && Date.now() - t3 < 8000) await espera(200);
          L.fimD = D.result; L.fimE = E.result;
          return L;
        }""", [PORTA, bilhete(321, 'Duda'), bilhete(654, 'Enzo')])

        print('13/15) a RANQUEADA também é 100% hospedada (nenhuma partida competitiva usa a física do aparelho)')
        confere(r2['roomRanked'], 'a sala ranqueada nasceu no servidor (host srv, sem admin) e é ranqueada')
        confere(r2['regraV80'], 'a regra v80 vale (o relógio do servidor)')
        confere(r2['snapsD'] > 60, 'os quadros da ranqueada vêm do servidor')
        confere(r2['relogiosD'] >= 2, 'o relógio oficial chega a cada segundo')
        confere(bool(r2['fimD']) and bool(r2['fimE']), 'o fim da ranqueada chegou pelo servidor para os dois')
        if r2['fimD'] and r2['fimE']:
            confere(r2['fimD']['score'] == r2['fimE']['score'], 'o mesmo placar para os dois: ' + ' × '.join(map(str, r2['fimD']['score'])))
            confere(r2['fimD'].get('ranked') is True and r2['fimD']['valida'] is True, 'o resultado ranqueado valeu')
            selo_d = selo_confere(r2['fimD'].get('selo', ''))
            confere(bool(selo_d) and selo_d.get('k') == 1 and selo_d.get('j') == '000321', 'o selo da Duda é de RANQUEADA (k:1) na conta certa', selo_d)

        # ======================= PARTE 3 · várias partidas ao mesmo tempo + medição =======================
        cpu0, rss0 = proc_stat(proc.pid); tj0 = time.time()
        r3 = pag.evaluate("""async ([porta, bils]) => {
          const L = {salas: []};
          const espera = ms => new Promise(r => setTimeout(r, ms));
          const cli = (bil, nome) => new Promise((res, rej) => {
            const ws = new WebSocket('ws://127.0.0.1:' + porta + '/');
            const c = {ws, nome, id: null, seq: 0, snaps: 0, bytes: 0, room: null, start: null, result: null};
            ws.onopen = () => ws.send(JSON.stringify({type: 'hello', name: nome, conta: bil, skin: '', flag: 'BR'}));
            ws.onmessage = ev => {
              c.bytes += ev.data.length;
              const m = JSON.parse(ev.data);
              if (m.type === 'hello') { c.id = m.id; res(c); }
              else if (m.type === 'room') c.room = m.room;
              else if (m.type === 'start') c.start = m;
              else if (m.type === 'snapshot') c.snaps++;
              else if (m.type === 'result') c.result = m;
            };
            ws.onerror = () => rej(new Error('ws falhou ' + nome));
          });
          for (let i = 0; i < bils.length; i++) {
            const c = await cli(bils[i], 'Med' + i);
            c.ws.send(JSON.stringify({type: 'create', name: 'Medida ' + i, n: 2, map: i % 2 ? 0 : 4, jogo: i === 2 ? 'curva' : 'futebol', tempo: 0, bots: true, pub: false}));
            const t0 = Date.now();
            while (!c.room && Date.now() - t0 < 5000) await espera(100);
            c.ws.send(JSON.stringify({type: 'start'}));
            const t1 = Date.now();
            while (!c.start && Date.now() - t1 < 5000) await espera(100);
            L.salas.push(c);
          }
          const t2 = Date.now();
          while (Date.now() - t2 < 20000) {
            for (const c of L.salas) c.ws.send(JSON.stringify({type: 'input', seq: ++c.seq, x: 1, y: 0, button: 1, k: 0}));
            await espera(33);
          }
          return {snaps: L.salas.map(c => c.snaps), bytes: L.salas.map(c => c.bytes), codigos: L.salas.map(c => c.room && c.room.code)};
        }""", [PORTA, [bilhete(1001 + i, 'Med' + str(i)) for i in range(3)]])
        cpu1, rss1 = proc_stat(proc.pid); tj1 = time.time()

        print('14) várias partidas ao mesmo tempo · e a medição (CPU, RAM, banda, quadros)')
        confere(len(set(r3['codigos'])) == 3 and all(r3['codigos']), 'três salas independentes ao mesmo tempo', r3['codigos'])
        confere(all(s > 400 for s in r3['snaps']), 'as três receberam quadros o tempo todo (~30/s por 20 s): ' + str(r3['snaps']))
        hz = min(r3['snaps']) / 20.0
        cpu_pct = 100.0 * (cpu1 - cpu0) / ((tj1 - tj0) * os.sysconf('SC_CLK_TCK'))
        banda_kb_s = sum(r3['bytes']) / len(r3['bytes']) / 20.0 / 1024.0
        print('     · quadros por jogador: %.1f/s (o ritmo de 30/s da v82)' % hz)
        print('     · banda por jogador: %.1f KB/s de down (só os quadros + sala)' % banda_kb_s)
        print('     · CPU do servidor com 3 partidas + as anteriores: %.1f%% de um núcleo' % cpu_pct)
        print('     · RAM do servidor: %.1f MB' % (rss1 / 1024.0))
        confere(hz > 20, 'a taxa de quadros aguentou (acima de 20/s em todas)')
        confere(cpu_pct < 60, 'a CPU ficou folgada com as partidas simultâneas (%.1f%%)' % cpu_pct)
        b.close()

finally:
    proc.terminate()
    try: proc.wait(timeout=5)
    except Exception: proc.kill()

print('\nsalas 100%% hospedadas (v83): %d ok, %d falharam' % (ok, falhou))
sys.exit(1 if falhou else 0)
