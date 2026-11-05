"""RACHA v92 · OS DOIS ZIPs PRONTOS, do jeito que vão para um servidor (passa/falha). Para cada ZIP: descompacta numa pasta
nova, sobe `node server.js` como o Render sobe (o oficial sem nada; o de testes com RACHA_EXPERIMENTAL=1, como o
INICIAR-TESTES-NO-WINDOWS.bat), abre o endereço num "celular" (844 × 390, toque) e confere:
  VERSÃO OFICIAL (tools/v92/pacote.py --producao):
    1. o ZIP não tem o INICIAR-TESTES-NO-WINDOWS.bat nem o experimental no config.js;
    2. o jogo abre sem erro, com window.RACHA_V92 = {experimental: false}: sem a aba TESTES v92 nos AJUSTES e o F2 não abre nada;
    3. a sala do servidor oficial não aceita o perfil da física do admin (mandou 18 u/s e 30 quadros/s: fica o padrão,
       14,1 u/s, o toque armado de 6 passos e 60 quadros/s — v105: o padrão das salas passou de 30 para 60 quadros/s, então o
       admin pede 30 para o teste ver a diferença);
  VERSÃO DE TESTES (tools/v92/pacote.py):
    4. o jogo abre com o modo de testes (a aba TESTES v92 é a primeira dos AJUSTES; o F2 abre o painel);
    5. a sala do servidor de testes aceita o perfil do admin (18 u/s e 30 quadros/s).
  NOS DOIS (v98): o servidor tem as salas do Rachão (o motor do Rachão gerado da página: a sala, o COMEÇAR e os quadros);
  NOS DOIS (v99): o servidor tem os chutes do Rachão nas salas do RACHA (a sala com a cavadinha, a curva e o super, os quadros com a bola no alto).
  v100 (segurança), com o 3º ZIP (tools/v92/pacote.py --lancamento): o do lançamento sem o painel, sem o experimental, sem o
  presente de teste no config.js e, como os outros dois, sem segredo, banco, chave, log nem pacote (.env, *.db, *.zip, *.pem, *.jks…).
Uso: python3 tests/v92_pacote_test.py <racha-online-v92.zip> <racha-online-v92-testes.zip> [<lancamento.zip>]"""
import asyncio, fnmatch, json, os, shutil, subprocess, sys, tempfile, time, zipfile, urllib.request
from comum import Placar, async_playwright, CHROME
from online_test import porta_livre

SALA = r"""(async (porta) => {             // o protocolo das salas, cru: hello → create → config (como o painel do admin manda)
  const ws = new WebSocket('ws://127.0.0.1:' + porta + '/'), msgs = [];
  const espera = (f, ms) => new Promise(res => { const t0 = Date.now(); const v = () => { const m = msgs.find(f); if (m || Date.now() - t0 > ms) return res(m || null); setTimeout(v, 50); }; v(); });
  ws.onmessage = e => { try { msgs.push(JSON.parse(e.data)); } catch (_) {} };
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; setTimeout(rej, 5000); });
  ws.send(JSON.stringify({type:'hello', name:'Pacote'}));
  if (!await espera(m => m.type === 'hello', 5000)) return {erro:'sem hello'};
  ws.send(JSON.stringify({type:'create', n:1, pub:false, name:'pacote'}));
  const r0 = await espera(m => m.type === 'room', 5000); if (!r0) return {erro:'sem sala'};
  msgs.length = 0;
  ws.send(JSON.stringify({type:'config', fisica:{velJog:18}, quadros:30}));   // (v105: o padrão é 60; o admin pede 30 para a diferença aparecer)
  await new Promise(res => setTimeout(res, 800));
  const r1 = [...msgs].reverse().find(m => m.type === 'room') || r0;
  ws.close();
  const f = r1.room.fisica || {};
  return {experimental:r1.room.experimental, nucleo:r1.room.nucleo, velJog:f.velJog, bufferToque:f.bufferToque, jogRede:f.jogRede, quadros:r1.room.quadros};
})"""

SALA_RCH = r"""(async (porta) => {         // v98: a sala do Rachão pelo protocolo cru (hello com rch:1 → create com o campo → start → os quadros do motor)
  const ws = new WebSocket('ws://127.0.0.1:' + porta + '/'), msgs = [];
  const espera = (f, ms) => new Promise(res => { const t0 = Date.now(); const v = () => { const m = msgs.find(f); if (m || Date.now() - t0 > ms) return res(m || null); setTimeout(v, 50); }; v(); });
  ws.onmessage = e => { try { msgs.push(JSON.parse(e.data)); } catch (_) {} };
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; setTimeout(rej, 5000); });
  ws.send(JSON.stringify({type:'hello', name:'Pacote', rch:1}));
  if (!await espera(m => m.type === 'hello', 5000)) return {erro:'sem hello'};
  ws.send(JSON.stringify({type:'create', rachao:{campo:'fliper', modo:'chaos', tempo:120}, n:1, pub:false}));
  const rs = await espera(m => m.type === 'rachao_sala', 5000), r0 = await espera(m => m.type === 'room' && m.room && m.room.rachao, 5000);
  if (!rs || !r0) { ws.close(); return {erro:'sem a sala do Rachão', msgs:msgs.filter(m => m.type === 'error').map(m => m.msg || m.text || m.codigo)}; }
  ws.send(JSON.stringify({type:'start'}));
  const q = await espera(m => m.type === 'rq' && m.d && Array.isArray(m.d.j), 12000);
  ws.close();
  return {campo:rs.campo, nome:r0.room.rachao.info.nome, resumo:r0.room.rachao.resumo, jogadores:q ? q.d.j.length : -1, bolas:q ? q.d.b.length : -1};
})"""

SALA_CR = r"""(async (porta) => {          // v99: os chutes do Rachão numa sala do RACHA (hello com cr:1 → create com os chutes → start → o quadro com bz e cr)
  const ws = new WebSocket('ws://127.0.0.1:' + porta + '/'), msgs = [];
  const espera = (f, ms) => new Promise(res => { const t0 = Date.now(); const v = () => { const m = msgs.find(f); if (m || Date.now() - t0 > ms) return res(m || null); setTimeout(v, 50); }; v(); });
  ws.onmessage = e => { try { msgs.push(JSON.parse(e.data)); } catch (_) {} };
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; setTimeout(rej, 5000); });
  ws.send(JSON.stringify({type:'hello', name:'Pacote', cr:1}));
  const h = await espera(m => m.type === 'hello', 5000); if (!h) return {erro:'sem hello'};
  ws.send(JSON.stringify({type:'create', n:1, pub:false, bots:true, name:'chutes', chutes:{lob:true, curva:true, super:true}}));
  const r0 = await espera(m => m.type === 'room' && m.room && m.room.chutes, 5000); if (!r0) { ws.close(); return {erro:'sem a sala com os chutes', cr:h.cr}; }
  ws.send(JSON.stringify({type:'seat', team:0})); await new Promise(res => setTimeout(res, 300));
  ws.send(JSON.stringify({type:'start'}));
  const q = await espera(m => m.type === 'snapshot' && m.data && Array.isArray(m.data.bz), 12000);
  ws.close();
  return {cr:h.cr, chutes:r0.room.chutes, bz:q ? q.data.bz.length : -1, estados:q && Array.isArray(q.data.cr) ? q.data.cr.length : -1};
})"""


def sobe(pasta, experimental):
    porta = porta_livre()
    env = dict(os.environ)
    env.pop('RACHA_EXPERIMENTAL', None); env.pop('RACHA_FISICA', None); env.pop('RACHA_MOTOR', None)
    env['PORT'] = str(porta); env['HOST'] = '127.0.0.1'
    if experimental:
        env['RACHA_EXPERIMENTAL'] = '1'
    srv = subprocess.Popen(['node', 'server.js', '--memoria'], cwd=pasta, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, env=env)
    for _ in range(100):
        try:
            urllib.request.urlopen('http://127.0.0.1:%d/saude' % porta, timeout=1).read(); break
        except Exception:
            time.sleep(0.1)
    return srv, porta


# v100 (segurança): o que nunca vai num ZIP (a mesma lista do tools/v92/pacote.py)
PROIBIDOS = ['.env', '.env.*', '*.db', '*.db-wal', '*.db-shm', '*.db-journal', '*.sqlite', '*.sqlite3', '*.sqlite-*', '*.zip', '*.pem',
             '*.key', '*.jks', '*.keystore', '*.p12', '*.pfx', '*.bundle', 'id_rsa*', '*.log', '*.tar', '*.tar.gz', '*.tgz', '*.7z', '*.rar']
def proibidos(nomes):
    return sorted(n for n in nomes if n != 'app/.env.example' and any(fnmatch.fnmatch(n.rsplit('/', 1)[-1], p) for p in PROIBIDOS))


def confere_lancamento(P, zipp):
    with zipfile.ZipFile(zipp) as z:
        nomes = set(z.namelist())
        cfg = z.read('app/public/game/config.js').decode('utf-8')
    corpo = cfg.split('window.RACHA_CONFIG = Object.assign(', 1)[-1]
    P.confere('presente:' not in corpo and 'experimental: true' not in cfg and 'INICIAR-TESTES-NO-WINDOWS.bat' not in nomes,
              'o ZIP do lançamento: o config.js sem o presente de teste e sem o experimental, sem o .bat de testes', corpo[:300])
    P.confere(not proibidos(nomes), 'e sem segredo, banco, chave, log nem pacote dentro', proibidos(nomes))
    P.confere(not any(n.startswith('tests/build/') or n.endswith('racha_teste.html') for n in nomes), 'e sem a cópia de teste do jogo (a do gancho window.__RT)',
              sorted(n for n in nomes if 'racha_teste' in n))


async def confere(pw, P, zipp, experimental):
    nome = 'de testes' if experimental else 'oficial'
    pasta = tempfile.mkdtemp(prefix='racha-pacote-')
    try:
        with zipfile.ZipFile(zipp) as z:
            nomes = set(z.namelist())
            cfg = z.read('app/public/game/config.js').decode('utf-8')
            z.extractall(pasta)
        P.confere(not proibidos(nomes), 'v100: o ZIP %s não leva segredo, banco, chave, log nem pacote' % nome, proibidos(nomes))
        if not experimental:
            P.confere('INICIAR-TESTES-NO-WINDOWS.bat' not in nomes and 'experimental: true' not in cfg and 'LEIA-ME-v92-TESTES.md' not in nomes,
                      'o ZIP oficial não tem o .bat de testes, o LEIA-ME de testes nem o experimental no config.js', sorted(n for n in nomes if 'TESTES' in n))
        srv, porta = sobe(pasta, experimental)
        b = await pw.chromium.launch(executable_path=CHROME, args=['--no-sandbox'])
        try:
            ctx = await b.new_context(viewport={'width': 844, 'height': 390}, device_scale_factor=3, has_touch=True, is_mobile=True)
            pg = await ctx.new_page()
            erros = []
            pg.on('pageerror', lambda e: erros.append(str(e)[:300]))
            pg.on('console', lambda m: erros.append('console: ' + m.text[:200]) if m.type == 'error' else None)
            await pg.goto('http://127.0.0.1:%d/' % porta)
            await pg.wait_for_function('() => window.RACHA_V92 && document.getElementById("pop-ajustes")', polling=100, timeout=30000)
            await pg.wait_for_timeout(800)
            o = await pg.evaluate("""(() => ({v92:window.RACHA_V92, url:location.pathname, aba:!!document.getElementById('ajx-t-v92'),
              primeira:(document.querySelector('#pop-ajustes .ajx-abas') || {}).firstElementChild ? document.querySelector('#pop-ajustes .ajx-abas').firstElementChild.id : null}))()""")
            await pg.evaluate("window.dispatchEvent(new KeyboardEvent('keydown', {key:'F2', code:'F2', bubbles:true}))")
            await pg.wait_for_timeout(300)
            o['f2'] = await pg.evaluate("(() => { const p = document.getElementById('pop-ajustes'), s = document.getElementById('ajx-v92'); return {aberto:!!p && !p.hidden, testes:!!s && !s.hidden}; })()")
            s = await pg.evaluate(SALA + '(%d)' % porta)
            if experimental:
                P.confere(o['v92'] == {'versao': 'v92.1', 'experimental': True} and o['aba'] and o['primeira'] == 'ajx-t-v92' and o['f2']['testes'],
                          'a versão de testes abre com o painel (a aba TESTES v92 é a primeira dos AJUSTES; o F2 abre o painel)', o)
                P.confere(s.get('experimental') is True and s.get('velJog') == 18 and s.get('quadros') == 30,
                          'o servidor de testes (RACHA_EXPERIMENTAL=1) aceita o perfil do admin: 18 u/s e 30 quadros/s', s)
            else:
                P.confere(o['url'] == '/game/racha.html' and o['v92'] == {'versao': 'v92.1', 'experimental': False} and not o['aba'] and not o['f2']['aberto'],
                          'a versão oficial abre (/game/racha.html) com o modo de testes desligado: sem a aba TESTES v92 e o F2 não abre nada', o)
                P.confere(s.get('experimental') is False and s.get('velJog') == 14.1 and s.get('bufferToque') == 6 and s.get('jogRede') == 1 and s.get('quadros') == 60 and s.get('nucleo') == 'v92.1',
                          'o servidor oficial não aceita o perfil do admin (mandou 18 u/s e 30/s): fica o padrão (14,1 u/s, toque armado 6, a rede segura, 60 quadros/s da v105)', s)
            r = await pg.evaluate(SALA_RCH + '(%d)' % porta)
            P.confere(r.get('campo') == 'fliper' and r.get('nome') == 'Fliperama' and 'Caos' in (r.get('resumo') or '') and r.get('jogadores') == 2 and r.get('bolas', 0) >= 1,
                      'v98: o servidor do ZIP %s tem as salas do Rachão (o Fliperama no Caos 1x1: a sala, o COMEÇAR e os quadros do motor do Rachão)' % nome, r)
            r = await pg.evaluate(SALA_CR + '(%d)' % porta)
            P.confere(r.get('cr') == 1 and r.get('chutes') == {'lob': True, 'curva': True, 'super': True} and r.get('bz') == 5 and r.get('estados') == 2,
                      'v99: o servidor do ZIP %s tem os chutes do Rachão nas salas (a sala com os três, os quadros com a bola no alto e o estado de cada um)' % nome, r)
            P.confere(not [e for e in erros if 'Failed to load resource' not in e], 'nenhum erro de JavaScript (a versão %s servida pelo node server.js)' % nome, erros[:3])
        finally:
            await b.close()
            srv.terminate()
            try: srv.wait(5)
            except Exception: srv.kill()
    finally:
        shutil.rmtree(pasta, ignore_errors=True)


async def principal(oficial, testes, lancamento=None):
    P = Placar('v92 · os ZIPs prontos (o oficial sem o painel; o de testes com o painel), servidos pelo node server.js')
    async with async_playwright() as pw:
        print('\n1) o ZIP da versão oficial'); await confere(pw, P, oficial, False)
        print('\n2) o ZIP da versão de testes'); await confere(pw, P, testes, True)
    if lancamento:
        print('\n3) v100: o ZIP do lançamento (--lancamento)'); confere_lancamento(P, lancamento)
    return P.fim()


if __name__ == '__main__':
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    sys.exit(asyncio.run(principal(sys.argv[1], sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else None)))
