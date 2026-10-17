#!/usr/bin/env python3
# RACHA v83 · o teste de ponta a ponta: o servidor de verdade (server/servidor.js) no ar, dois jogadores de
# verdade (WebSocket do navegador, via Playwright) jogando uma partida AUTORITATIVA inteira — o servidor
# simula, manda os quadros, apita o fim e assina o selo da ranqueada, que a plataforma confere como sempre.
# Roda:  python3 tests/v83_ws_test.py   (precisa do Playwright com um Chromium; RACHA_CHROME aponta outro)
import json, subprocess, sys, time, os, base64, hmac, hashlib
from playwright.sync_api import sync_playwright

PORTA = 8977
SEGREDO = 'segredo-de-teste-v83'
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

# sobe o servidor de verdade (em memória, com a partida encurtada para o teste)
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
        pag.goto('http://127.0.0.1:%d/game/config.js' % PORTA)   # (qualquer página do servidor, só para ter origem)
        resultado = pag.evaluate("""async ([porta, bilA, bilB]) => {
          const log = {quadrosA: 0, quadrosB: 0, gols: [], fimA: null, fimB: null, bemA: null, bemB: null, erros: [], comeca: false};
          function jogador(bil, nome, quem) {
            return new Promise((resolve, rejeita) => {
              const ws = new WebSocket('ws://127.0.0.1:' + porta + '/');
              const cli = {ws, seq: 0};
              ws.onopen = () => ws.send(JSON.stringify({type: 'hello', name: nome, conta: bil, skin: '', flag: 'BR'}));
              ws.onmessage = ev => {
                const m = JSON.parse(ev.data);
                if (m.type === 'hello') ws.send(JSON.stringify({type: 'auto_entrar', n: 1, ranked: true}));
                else if (m.type === 'auto_bemvindo') { log['bem' + quem] = m; }
                else if (m.type === 'auto_comeca') { log.comeca = true; resolve(cli); }
                else if (m.type === 'auto_q') log['quadros' + quem]++;
                else if (m.type === 'auto_gol') log.gols.push(m);
                else if (m.type === 'auto_fim') log['fim' + quem] = m;
                else if (m.type === 'auto_erro') log.erros.push(m.msg);
              };
              ws.onerror = () => rejeita(new Error('ws falhou'));
              setTimeout(() => rejeita(new Error('demorou para começar')), 20000);
            });
          }
          const [A, B] = await Promise.all([jogador(bilA, 'Ana', 'A'), jogador(bilB, 'Bia', 'B')]);
          // joga ~4 s: a Ana vai para a direita (para cima da bola) e chuta quando chega perto
          const t0 = Date.now();
          let chutes = 0;
          while (Date.now() - t0 < 4000) {
            A.ws.send(JSON.stringify({type: 'auto_cmd', seq: ++A.seq, x: 1, y: 0, k: chutes < 6 && A.seq % 25 === 0 ? 2 : 0}));
            B.ws.send(JSON.stringify({type: 'auto_cmd', seq: ++B.seq, x: 0, y: 0, k: 0}));
            await new Promise(r => setTimeout(r, 33));
          }
          // espera o apito (14 s de jogo + comemorações)
          const t1 = Date.now();
          while (!log.fimA && Date.now() - t1 < 25000) await new Promise(r => setTimeout(r, 200));
          return log;
        }""", [PORTA, bilhete(123, 'Ana'), bilhete(456, 'Bia')])
        b.close()

    print('1) a conexão e a partida')
    confere(bool(resultado['bemA']) and resultado['bemA']['n'] == 1, 'a Ana entrou na partida autoritativa (o bem-vindo com o campo)')
    confere(bool(resultado['bemB']), 'a Bia entrou na mesma partida')
    confere(resultado['comeca'], 'a partida começou quando lotou')
    confere(not resultado['erros'], 'nenhum erro no caminho', resultado['erros'])
    print('2) os quadros do servidor')
    confere(resultado['quadrosA'] > 100, 'a Ana recebeu os quadros do servidor (20/s: %d)' % resultado['quadrosA'])
    confere(resultado['quadrosB'] > 100, 'a Bia recebeu os mesmos quadros (%d)' % resultado['quadrosB'])
    print('3) o fim e o selo')
    confere(bool(resultado['fimA']), 'o fim chegou pelo servidor')
    if resultado['fimA']:
        confere(resultado['fimA']['ranked'] is True and resultado['fimA']['motivo'] in ('tempo', 'empate', 'meta', 'gol_de_ouro'), 'o resultado é do servidor: ' + str(resultado['fimA']['motivo']))
        selo = selo_confere(resultado['fimA'].get('selo', ''))
        confere(bool(selo) and selo.get('k') == 1 and selo.get('j') == '000123' and selo.get('n') == 1, 'o selo da Ana confere na plataforma (k:1, a conta certa)', selo)
    if resultado['fimB']:
        selo_b = selo_confere(resultado['fimB'].get('selo', ''))
        confere(bool(selo_b) and selo_b.get('j') == '000456', 'o selo da Bia confere (a conta dela)')
        if resultado['fimA'] and resultado['fimB']:
            confere(resultado['fimA']['placar'] == resultado['fimB']['placar'], 'os dois viram o mesmo placar: ' + ' × '.join(map(str, resultado['fimA']['placar'])))
    print('   (gols na partida: %d)' % len(resultado['gols']))
finally:
    proc.terminate()
    try: proc.wait(timeout=5)
    except Exception: proc.kill()

print('\nws autoritativo (v83): %d ok, %d falharam' % (ok, falhou))
sys.exit(1 if falhou else 0)
