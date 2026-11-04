"""RACHA v103 · TELA CHEIA NO NAVEGADOR (ANDROID E IPHONE), O APP INSTALÁVEL (PWA) E O CAMPO ATÉ A BEIRADA (no navegador):
  1) os arquivos: o manifesto (o nome, RACHA, o início e o escopo na pasta do jogo, a tela cheia com a volta para standalone,
     deitado, as cores, os ícones 192/512 e os maskable), os PNG (os tamanhos de verdade; o do iPhone sem transparência), as
     etiquetas do <head> (o viewport igual ao de sempre) e o service worker (a rede primeiro, a versão no nome do cache,
     skipWaiting e clients.claim, só GET);
  2) os servidores: o servidor da turma entrega o manifesto como application/manifest+json e o sw.js como JavaScript, os dois
     com no-cache; a plataforma tem o mesmo acerto (o código: aqui não há node_modules para subir a plataforma);
  3) o app instalável de verdade (o servidor da turma em http://127.0.0.1, numa cópia da pasta app/public): o service worker
     registra no escopo /game/ e assume a página; o Chromium lê o manifesto sem erro; com a rede, o jogo novo chega na hora (a
     rede primeiro); sem o servidor, a cópia abre o jogo; na cópia só há arquivos da pasta do jogo (nada de /api/); o
     RACHA_CONFIG.sw = false tira o registro; em file:// nada é registrado;
  4) o botão: no Chromium (como no Android) entra e sai da tela cheia de verdade (o lobby, a chave dos Ajustes e o cantinho
     da pausa), pede a tela deitada e some em tela cheia; nada entra em tela cheia sozinho; em pé, a tela GIRE O CELULAR
     ganha o JOGAR EM TELA CHEIA (o foco continua nela); com o Safari do iPhone (sem a tela cheia de página) abre o GUIA (o
     foco no ENTENDI, o Esc fecha e o foco volta; nos Ajustes, o COMO FAZER); aberto pelo ícone (o app instalado, no
     Android e no iPhone), os botões somem;
  5) o lobby e a partida em 8 tamanhos deitados (640×360 a 1920×1080), sem e com as áreas seguras (a CDP
     Emulation.setSafeAreaInsetsOverride): os botões do lobby dentro da área segura e sem um por cima do outro e o fundo do
     lobby de ponta a ponta; na partida, o canvas (e com ele o HUD) exatamente onde sempre ficou — o maior 1920 × 888 que
     cabe na área segura, no meio dela —, os controles e os botões dentro da área segura e a MOLDURA (o campo, mais escuro)
     nas faixas em volta, atrás de tudo e sem pegar toque. Com RACHA_BASE=<a página de teste da versão anterior>, confere
     também que o canvas e os controles estão nos mesmos pixels de antes;
  6) a pausa: o cantinho TELA CHEIA com 44 px ou mais, dentro da caixa, sem cobrir o título, a linha de baixo e os botões (a
     grade dos botões igual: 4 botões); com a pausa aberta, as faixas escurecem junto.
  python3 tests/v103_tela_test.py          (as cópias de tela ficam em tests/saida/v103_*.png)
"""
import asyncio, io, json, math, os, pathlib, re, shutil, socket, subprocess, sys, tempfile, time, urllib.request
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from comum import Placar, rt, roda, RAIZ, PAGINA, FONTES, HARNESS, CHROME
from playwright.async_api import async_playwright

SAIDA = RAIZ / 'tests' / 'saida'; SAIDA.mkdir(exist_ok=True)
JOGO = RAIZ / 'app' / 'public' / 'game'
BASE = os.environ.get('RACHA_BASE')
FONTES_JS = "document.addEventListener('DOMContentLoaded',()=>{const s=document.createElement('style');s.textContent=%s;document.head.prepend(s);});" % json.dumps(FONTES)
IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1'
# o iPhone: o Safari do iPhone não tem a tela cheia de página (o fullscreenEnabled é falso e não há requestFullscreen)
SEM_API = """(() => {
  try { Object.defineProperty(Document.prototype, 'fullscreenEnabled', {get(){ return false; }, configurable:true}); } catch (e) {}
  try { Object.defineProperty(Document.prototype, 'webkitFullscreenEnabled', {get(){ return false; }, configurable:true}); } catch (e) {}
  try { Element.prototype.requestFullscreen = undefined; Element.prototype.webkitRequestFullscreen = undefined; } catch (e) {}
})();"""
# aberto pelo ícone: o display-mode do app instalado (o Chromium de teste não imita o display-mode: a matchMedia responde)
APP = """(() => { const mm = window.matchMedia.bind(window);
  window.matchMedia = q => /display-mode:\\s*(standalone|fullscreen)/.test(q) ? mm('(min-width: 0px)') : mm(q); })();"""
IOS_APP = "(() => { try { Object.defineProperty(Navigator.prototype, 'standalone', {get(){ return true; }, configurable:true}); } catch (e) {} })();"
# o que o jogo pede ao navegador: as opções do requestFullscreen e a orientação travada (o Chromium de teste não trava)
GRAVA = """(() => {
  window.__pedidos = []; window.__travas = []; window.__soltas = 0;
  const rf = Element.prototype.requestFullscreen;
  if (rf) Element.prototype.requestFullscreen = function(o){ window.__pedidos.push(o || null); return rf.apply(this, arguments); };
  const o = screen.orientation;
  if (o){ o.lock = function(t){ window.__travas.push(t); return Promise.resolve(); }; o.unlock = function(){ window.__soltas++; }; }
})();"""

TAMANHOS = [(640, 360), (740, 360), (844, 390), (915, 412), (932, 430), (1180, 820), (1280, 720), (1920, 1080)]
def insets_de(w, h):
    """as áreas seguras de um aparelho parecido com o tamanho"""
    if (w, h) == (844, 390): return {'top': 0, 'left': 47, 'right': 47, 'bottom': 21}    # iPhone 13/14 deitado (o entalhe e a barrinha)
    if (w, h) == (932, 430): return {'top': 0, 'left': 59, 'right': 59, 'bottom': 21}    # iPhone Pro Max deitado (a ilha)
    if (w, h) == (1180, 820): return {'top': 24, 'left': 0, 'right': 0, 'bottom': 20}    # iPad Air deitado (o relógio em cima e a barrinha)
    if h <= 430: return {'top': 0, 'left': 34, 'right': 0, 'bottom': 0}                  # Android com o furo da câmera de um lado
    return {'top': 0, 'left': 30, 'right': 30, 'bottom': 16}                             # (inventado: só para conferir a conta)


def sem_rede(erros):
    return [e for e in erros if 'Failed to load resource' not in e and 'ERR_' not in e]


async def pagina(b, w, h, ins=None, ua=None, init=(), arquivo=None, dsf=1, mobile=False, toque=True):
    """o jogo num contexto novo (com as áreas seguras antes de abrir, como no aparelho) — a mesma arrumação do comum.abre"""
    opts = dict(viewport={'width': w, 'height': h}, device_scale_factor=dsf, has_touch=toque)
    if ua: opts['user_agent'] = ua
    if mobile: opts['is_mobile'] = True
    ctx = await b.new_context(**opts)
    await ctx.add_init_script(FONTES_JS)
    await ctx.add_init_script('window.RACHA_CONFIG = %s;' % json.dumps({'presente': False}))
    for s in init:
        await ctx.add_init_script(s)
    pg = await ctx.new_page()
    erros = []
    pg.on('pageerror', lambda e: erros.append(str(e)[:300]))
    pg.on('console', lambda m: erros.append('console: ' + m.text[:200]) if m.type == 'error' else None)
    if ins:
        cdp = await ctx.new_cdp_session(pg)
        await cdp.send('Emulation.setSafeAreaInsetsOverride', {'insets': ins})
    await pg.goto(pathlib.Path(arquivo or PAGINA).resolve().as_uri())
    await pg.wait_for_function('() => typeof window.__RT === "function"', polling=100, timeout=20000)
    await pg.wait_for_timeout(600)
    await pg.evaluate("(() => { const o = document.getElementById('onb'); if (o) o.hidden = true; })()")
    await pg.evaluate("(() => { const b = [...document.querySelectorAll('#v84auth button')].find(x => /TREINAR OFFLINE/.test(x.textContent || '')); if (b) b.click(); })()")
    await pg.wait_for_timeout(150)
    await rt(pg, HARNESS)
    return ctx, pg, erros


def cruzam(a, b, folga=1):
    return a[0] < b[2] - folga and a[2] > b[0] + folga and a[1] < b[3] - folga and a[3] > b[1] + folga


def dentro(r, vw, vh, sa, folga=1.01):
    return r[0] >= sa['l'] - folga and r[1] >= sa['t'] - folga and r[2] <= vw - sa['r'] + folga and r[3] <= vh - sa['b'] + folga


def esperado(vw, vh, sa):
    """onde o canvas sempre ficou: o maior 1920 × 888 que cabe na área segura, no meio dela (o resize() de sempre)"""
    aw, ah = vw - sa['l'] - sa['r'], vh - sa['t'] - sa['b']
    s = min(max(200, aw) / 1920, max(120, ah) / 888)
    w, h = math.floor(1920 * s), math.floor(888 * s)
    return [sa['l'] + (aw - w) / 2, sa['t'] + (ah - h) / 2, w, h]


def textura(png, caixa):
    """quantas cores diferentes há na caixa da cópia de tela (o campo tem textura; uma faixa lisa tem uma cor só)"""
    from PIL import Image
    im = Image.open(io.BytesIO(png)).convert('RGB').crop(tuple(int(round(v)) for v in caixa))
    return len(set((r >> 3, g >> 3, b >> 3) for r, g, b in im.getdata())), sum(sum(p) for p in im.getdata()) / max(1, 3 * im.width * im.height)


LOBBY = """(() => {
  const vis = e => { if (!e) return false; const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return r.width > 2 && r.height > 2 && cs.display !== 'none' && cs.visibility !== 'hidden' && !e.closest('[hidden]'); };
  const cx = e => { const r = e.getBoundingClientRect(); return [r.left, r.top, r.right, r.bottom]; };
  const s = getComputedStyle(document.getElementById('lb-sa')), n = v => parseFloat(v) || 0;
  const sa = {t:n(s.paddingTop), r:n(s.paddingRight), b:n(s.paddingBottom), l:n(s.paddingLeft)};
  const L = [], poe = (nome, e) => { if (vis(e)) L.push([nome, cx(e)]); };
  poe('perfil', LB.eu);
  document.querySelectorAll('#lb .lb-topo .hm-grana').forEach((e, i) => poe('grana' + i, e));
  poe('correio', document.getElementById('lb-correio')); poe('telacheia', document.querySelector('#lb .v103-tela-bt')); poe('menu', document.querySelector('#lb .v102-menu-bt'));
  poe('tampinha', LB.emblema);
  document.querySelectorAll('#lb .v101-vaga').forEach((e, i) => poe('vaga' + i, e));
  document.querySelectorAll('#lb .v102-doca-bt').forEach(e => poe('atalho:' + e.textContent.trim(), e));
  poe('modo', LB.modo); poe('jogar', LB.jogar);
  const todos = [...LB.palco.querySelectorAll('button, [role=button]')].filter(e => vis(e) && !e.closest('.v102-gaveta')).map(e => [(e.getAttribute('aria-label') || e.id || String(e.className)).slice(0, 40), cx(e)]);
  // o fundo do lobby: a cena da v91/v101 (o #lb-fundo antigo fica escondido desde a v90) e o próprio #lb, opaco, de ponta a ponta
  const cena = (typeof V91 !== 'undefined' && V91.cena) || document.getElementById('lb-fundo'), f = cena.getBoundingClientRect(), lb = LB.raiz.getBoundingClientRect();
  const tb = document.querySelector('#lb .v103-tela-bt'), mb = document.querySelector('#lb .v102-menu-bt');
  const m = document.getElementById('v103-moldura');
  return {vw:innerWidth, vh:innerHeight, sa, L, todos, fundo:[Math.min(f.left, lb.left), Math.min(f.top, lb.top), Math.max(f.right, lb.right), Math.max(f.bottom, lb.bottom)],
    cena:[f.left, f.top, f.right, f.bottom], antesDoMenu:!!tb && !!mb && tb.nextElementSibling === mb,
    tela:vis(tb) ? cx(tb) : null, menu:vis(mb) ? cx(mb) : null, moldura:!!m && !m.hidden, estado:window.RachaTela103 ? RachaTela103.estado() : null};
})()"""

PARTIDA = """(() => {
  const r = cv.getBoundingClientRect(), s = getComputedStyle(document.documentElement), n = v => parseFloat(v) || 0;
  const sa = {t:n(s.paddingTop), r:n(s.paddingRight), b:n(s.paddingBottom), l:n(s.paddingLeft)};
  const k = r.width/W, ctl = [];
  for (const id of Object.keys(hud)){ try { if (!BASE[id] || !controleVisivel(id)) continue; const e = el(id); ctl.push([id, r.left + e.x*k, r.top + e.y*k, e.r*k]); } catch (_) {} }
  const b = BTN_PAUSA; ctl.push(['pausa', r.left + (b.x + b.w/2)*k, r.top + (b.y + b.h/2)*k, b.w/2*k]);
  const vis = e => { const q = e.getBoundingClientRect(), cs = getComputedStyle(e); return q.width > 2 && q.height > 2 && cs.display !== 'none' && cs.visibility !== 'hidden' && !e.closest('[hidden]'); };
  const botoes = [...document.querySelectorAll('#wrap button, #wrap [role=button]')].filter(vis).map(e => [(e.id || String(e.className) || e.tagName).slice(0, 30), (q => [q.left, q.top, q.right, q.bottom])(e.getBoundingClientRect())]);
  const m = document.getElementById('v103-moldura'), mr = m ? m.getBoundingClientRect() : null, ms = m ? getComputedStyle(m) : null;
  return {vw:innerWidth, vh:innerHeight, sa, cv:[r.left, r.top, r.width, r.height], ctl, botoes, hk:HUDX.k,
    moldura:!!m && !m.hidden, mr:mr ? [mr.left, mr.top, mr.width, mr.height] : null, mz:ms ? ms.zIndex : null, mpe:ms ? ms.pointerEvents : null,
    estado:window.RachaTela103 ? RachaTela103.estado() : null};
})()"""


# ---------------------------------------------------------------------------------------------------------------- 1) os arquivos
def arquivos(P):
    from PIL import Image
    print('1) os arquivos (o manifesto, os ícones, o <head> e o service worker)')
    m = json.loads((JOGO / 'manifest.webmanifest').read_text(encoding='utf-8'))
    P.confere(m.get('short_name') == 'RACHA' and m.get('name', '').startswith('RACHA'), 'manifesto: o nome e o nome curto RACHA', (m.get('name'), m.get('short_name')))
    P.confere(m.get('start_url') == './racha.html' and m.get('scope') == './', 'manifesto: o início e o escopo relativos à pasta do jogo', (m.get('start_url'), m.get('scope')))
    P.confere(m.get('display') == 'fullscreen' and (m.get('display_override') or [None])[0] == 'fullscreen' and 'standalone' in (m.get('display_override') or []),
              'manifesto: tela cheia, com a volta para standalone', (m.get('display'), m.get('display_override')))
    P.confere(m.get('orientation') == 'landscape', 'manifesto: deitado (landscape)', m.get('orientation'))
    cores = [m.get('theme_color', ''), m.get('background_color', '')]
    P.confere(all(re.fullmatch(r'#[0-9a-f]{6}', c) for c in cores), 'manifesto: a cor do tema e a do fundo (o azul-noite do jogo)', cores)
    vistos, ruins = set(), []
    for ic in m.get('icons', []):
        arq = JOGO / ic['src']
        try:
            im = Image.open(arq)
            w, h = (int(x) for x in ic['sizes'].split('x'))
            ok = im.format == 'PNG' and im.size == (w, h) and ic.get('type') == 'image/png'
            if ok: vistos.add((ic.get('purpose', 'any'), w))
            else: ruins.append((ic['src'], im.format, im.size))
        except Exception as e:
            ruins.append((ic['src'], str(e)[:80]))
    P.confere(not ruins and {('any', 192), ('any', 512), ('maskable', 192), ('maskable', 512)} <= vistos, 'manifesto: os ícones 192 e 512 (any e maskable), PNG do tamanho dito', (sorted(vistos), ruins))
    ap = Image.open(JOGO / 'icones' / 'apple-touch-icon.png')
    P.confere(ap.size == (180, 180) and ap.mode == 'RGB', 'o ícone do iPhone (apple-touch-icon) 180 × 180, sem transparência', (ap.size, ap.mode))
    opacos = all(Image.open(JOGO / 'icones' / n).convert('RGBA').getextrema()[3][0] == 255 for n in ('racha-maskable-192.png', 'racha-maskable-512.png'))
    P.confere(opacos, 'os maskable cobrem o quadrado todo (a máscara redonda do Android não deixa buraco)')
    html = (JOGO / 'racha.html').read_text(encoding='utf-8')
    cab = html[:html.index('<style>')]
    vp = re.findall(r'<meta name="viewport"[^>]*>', html)
    P.confere(vp == ['<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">'], 'o viewport igual ao de sempre (viewport-fit=cover; nada de zoom travado a mais)', vp)
    etiquetas = ['<meta name="theme-color" content="#0d0a22">', '<meta name="mobile-web-app-capable" content="yes">', '<meta name="apple-mobile-web-app-capable" content="yes">',
                 '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">', '<meta name="apple-mobile-web-app-title" content="RACHA">',
                 '<link rel="manifest" href="./manifest.webmanifest">', '<link rel="apple-touch-icon" sizes="180x180" href="./icones/apple-touch-icon.png">']
    faltam = [e for e in etiquetas if e not in cab]
    P.confere(not faltam, 'no <head>: o manifesto, o ícone do iPhone, a cor do tema e as etiquetas do app (iPhone e Android)', faltam)
    P.confere(html.count('RACHA v103 · tela cheia') == 1 and html.count('<link rel="stylesheet" href="./v103-tela.css">') == 1, 'o código e o estilo da v103 no jogo (uma vez)')
    sw = (JOGO / 'sw.js').read_text(encoding='utf-8')
    P.confere(all(x in sw for x in ('self.skipWaiting()', 'self.clients.claim()', "req.method !== 'GET'", "'racha-jogo-' + VERSAO", 'caches.delete', "fetch(req")),
              'o service worker: a rede primeiro, só GET, o cache com a versão, skipWaiting e clients.claim')
    chk = subprocess.run(['node', '--check', str(JOGO / 'sw.js')], capture_output=True, text=True)
    P.confere(chk.returncode == 0, 'o sw.js é JavaScript válido (node --check)', chk.stderr[:200])
    etapas = (RAIZ / 'tools' / 'aplicar_rua.py').read_text(encoding='utf-8')
    P.confere("'v102/v102',  " in etapas and "'v103/tela']" in etapas and etapas.index("'v103/tela']") > max(etapas.find("'v103/v103'"), etapas.find("'v103/controles'")),
              'a etapa v103/tela no fim da lista do build (depois das outras da v103: os embrulhos dela ficam por cima)')


# ---------------------------------------------------------------------------------------------------------------- 2) e 3) os servidores e o app instalável
SEM_PROXY = urllib.request.build_opener(urllib.request.ProxyHandler({}))
def livre():
    s = socket.socket(); s.bind(('127.0.0.1', 0)); p = s.getsockname()[1]; s.close(); return p
def sobe(estaticos, porta):
    proc = subprocess.Popen(['node', str(RAIZ / 'server' / 'servidor.js'), '--porta', str(porta), '--host', '127.0.0.1', '--memoria', '--visitantes', '--estaticos', str(estaticos)],
                            cwd=str(RAIZ), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    for _ in range(150):
        try:
            SEM_PROXY.open('http://127.0.0.1:%d/saude' % porta, timeout=1).read()
            return proc
        except Exception:
            time.sleep(.1)
    proc.kill()
    raise RuntimeError('o servidor da turma não subiu')
def pede(porta, caminho):
    with SEM_PROXY.open('http://127.0.0.1:%d%s' % (porta, caminho), timeout=10) as r:
        return r.status, r.headers.get('Content-Type', ''), r.headers.get('Cache-Control', ''), r.read()


async def servidores_e_app(P, pw):
    print('2) os servidores entregam o manifesto e o service worker do jeito certo')
    vite = (RAIZ / 'app' / 'api' / 'lib' / 'vite.ts').read_text(encoding='utf-8')
    P.confere('application/manifest+json' in vite and '"/game/sw.js"' in vite and vite.index('app.use("/game/*"') < vite.index('serveStatic({ root'),
              'a plataforma (app/api/lib/vite.ts): o manifesto como application/manifest+json e o sw.js como JavaScript, antes do serveStatic')
    pol = (RAIZ / 'app' / 'api' / 'boot.ts').read_text(encoding='utf-8') + (RAIZ / 'server' / 'servidor.js').read_text(encoding='utf-8')
    P.confere('fullscreen' not in ''.join(re.findall(r'Permissions-Policy[^\n]*', pol)), 'nenhum servidor bloqueia a tela cheia (Permissions-Policy)')
    tmp = pathlib.Path(tempfile.mkdtemp(prefix='racha_v103_'))
    pub = tmp / 'public'
    shutil.copytree(RAIZ / 'app' / 'public', pub)
    porta = livre()
    proc = sobe(pub, porta)
    b = None
    try:
        st, ct, cc, corpo = pede(porta, '/game/manifest.webmanifest')
        P.confere(st == 200 and ct.startswith('application/manifest+json') and 'no-cache' in cc and json.loads(corpo)['short_name'] == 'RACHA',
                  'o servidor da turma: o manifesto como application/manifest+json (no-cache)', (st, ct, cc))
        st, ct, cc, _ = pede(porta, '/game/sw.js')
        P.confere(st == 200 and ct.startswith('text/javascript') and 'no-cache' in cc, 'o servidor da turma: o sw.js como JavaScript (no-cache)', (st, ct, cc))
        st, ct, cc, _ = pede(porta, '/game/icones/racha-512.png')
        P.confere(st == 200 and ct == 'image/png', 'o servidor da turma: os ícones como image/png', (st, ct))

        print('3) o app instalável de verdade (http://127.0.0.1)')
        b = await pw.chromium.launch(executable_path=CHROME, args=['--no-sandbox'])
        ctx = await b.new_context(viewport={'width': 844, 'height': 390}, has_touch=True)
        await ctx.add_init_script(FONTES_JS)
        pg = await ctx.new_page()
        url = 'http://127.0.0.1:%d/game/racha.html' % porta
        await pg.goto(url)
        await pg.wait_for_function("window.RachaTela103 && RachaTela103.estado().sw !== 'registrando'", polling=200, timeout=30000)
        e = await pg.evaluate("RachaTela103.estado()")
        reg = await pg.evaluate("navigator.serviceWorker.ready.then(r => ({scope:r.scope, ativo:!!r.active}))")
        P.confere(e['sw'] == 'registrado' and reg['scope'] == 'http://127.0.0.1:%d/game/' % porta and reg['ativo'], 'o service worker registra no escopo da pasta do jogo (/game/) e fica ativo', (e['sw'], e['swErro'], reg))
        await pg.reload(); await pg.wait_for_function("!!window.RachaTela103", timeout=30000)
        ctl = await pg.evaluate("!!navigator.serviceWorker.controller && navigator.serviceWorker.controller.scriptURL")
        P.confere(bool(ctl) and ctl.endswith('/game/sw.js'), 'a página do jogo passa pelo service worker (controller)', ctl)
        cdp = await ctx.new_cdp_session(pg)
        man = await cdp.send('Page.getAppManifest')
        dados = json.loads(man.get('data') or '{}')
        P.confere(man.get('url', '').endswith('/game/manifest.webmanifest') and not man.get('errors') and dados.get('short_name') == 'RACHA', 'o Chromium lê o manifesto sem erro', (man.get('url'), man.get('errors')))
        try:
            inst = await cdp.send('Page.getInstallabilityErrors')
            outros = [x.get('errorId') for x in inst.get('installabilityErrors', []) if x.get('errorId') not in ('in-incognito',)]
            P.confere(not outros, 'o Chromium não vê motivo para não instalar (fora a janela anônima do teste)', inst.get('installabilityErrors'))
        except Exception as ex:
            print('  (sem Page.getInstallabilityErrors neste Chromium: %s)' % str(ex)[:80])
        # a rede primeiro: o jogo novo no servidor chega na hora (sem precisar fechar o app)
        arq = pub / 'game' / 'racha.html'
        arq.write_text(arq.read_text(encoding='utf-8').replace('<title>RACHA · Futebol de Rua</title>', '<title>RACHA · Futebol de Rua · nova</title>', 1), encoding='utf-8')
        await pg.reload(); await pg.wait_for_function("!!window.RachaTela103", timeout=30000)
        P.confere((await pg.title()).endswith('· nova'), 'com a rede, a versão nova do jogo chega na hora (a rede primeiro, não a cópia)', await pg.title())
        chaves = await pg.evaluate("caches.keys()")
        urls = await pg.evaluate("caches.open('racha-jogo-v103-1').then(c => c.keys()).then(ks => ks.map(r => r.url))")
        fora = [u for u in urls if not u.startswith('http://127.0.0.1:%d/game/' % porta) or '/api/' in u]
        P.confere(chaves == ['racha-jogo-v103-1'] and urls and not fora, 'a cópia: um cache só, com a versão no nome, e só arquivos da pasta do jogo (%d)' % len(urls), (chaves, fora[:3]))
        # sem o servidor (sem internet): a cópia abre o jogo
        proc.terminate(); proc.wait(timeout=10)
        await pg.reload(); await pg.wait_for_function("!!window.RachaTela103 && !!document.getElementById('lb')", timeout=30000)
        P.confere((await pg.title()).endswith('· nova'), 'sem o servidor, o jogo abre pela cópia (a última versão que veio da rede)', await pg.title())
        # RACHA_CONFIG.sw = false: o registro sai
        proc = sobe(pub, porta)
        pg2 = await ctx.new_page()
        await pg2.add_init_script('window.RACHA_CONFIG = {sw:false};')
        await pg2.goto(url); await pg2.wait_for_function("!!window.RachaTela103", timeout=30000)
        # (o pedido de tirar entra na fila do navegador: se ele estiver conferindo o sw.js da página, espera a vez)
        await pg2.wait_for_function("typeof RachaTela103.estado().swSaiu === 'number'", polling=200, timeout=20000)
        regs = await pg2.evaluate("navigator.serviceWorker.getRegistrations().then(rs => rs.length)")
        e2 = await pg2.evaluate("RachaTela103.estado()")
        P.confere(e2['sw'] == 'desligado' and e2['swSaiu'] == 1 and regs == 0, 'RACHA_CONFIG.sw = false tira o service worker (para desligar numa publicação)', (e2['sw'], e2['swSaiu'], regs))
    finally:
        if b: await b.close()
        try: proc.terminate(); proc.wait(timeout=10)
        except Exception: pass
        shutil.rmtree(tmp, ignore_errors=True)


# ---------------------------------------------------------------------------------------------------------------- 4) o botão
async def botao(P, b):
    print('4) o botão TELA CHEIA')
    # --- Android (o Chromium de teste: a tela cheia de página de verdade)
    ctx, pg, erros = await pagina(b, 844, 390, init=[GRAVA])
    try:
        e = await rt(pg, "RachaTela103.estado()")
        P.confere(e['modo'] == 'api' and e['botao'] and e['sw'] in ('inseguro', 'sem-suporte'), 'Android: o botão no lobby; em file:// nada de service worker', e)
        P.confere(await pg.evaluate("!document.fullscreenElement && __pedidos.length === 0"), 'nada entra em tela cheia sozinho ao abrir')
        await pg.touchscreen.tap(844 * .45, 390 * .04); await pg.wait_for_timeout(200)
        P.confere(await pg.evaluate("!document.fullscreenElement && __pedidos.length === 0"), 'nem tocando em outro lugar do lobby')
        await pg.click('#lb .v103-tela-bt'); await pg.wait_for_timeout(500)
        f = await pg.evaluate("({fs:document.fullscreenElement === document.documentElement, pedidos:__pedidos, travas:__travas, cls:document.documentElement.classList.contains('v103-tela'), e:RachaTela103.estado()})")
        P.confere(f['fs'] and f['pedidos'] == [{'navigationUI': 'hide'}], 'o botão do lobby põe o jogo em tela cheia (sem as barras do navegador)', f)
        P.confere(f['travas'] == ['landscape'], 'em tela cheia, pede a tela travada deitada', f['travas'])
        P.confere(f['e']['modo'] == 'tela' and not f['e']['botao'] and not f['e']['pausa'] and f['cls'], 'em tela cheia, o botão some (o do lobby e o da pausa)', f['e'])
        await rt(pg, "ajxAbre('visual'); true"); await pg.wait_for_timeout(300)
        a = await pg.evaluate("(() => { const c = document.getElementById('aj-tela'), l = c.closest('.aj-lin'); return {p:c.getAttribute('aria-pressed'), vis:!l.hidden && !c.hidden, tit:l.querySelector('.ajx-tx b').textContent, aba:!document.getElementById('ajx-visual').hidden}; })()")
        P.confere(a['p'] == 'true' and a['vis'] and a['tit'] == 'Tela cheia' and a['aba'], 'AJUSTES › Visual: a chave Tela cheia ligada', a)
        await pg.click('#aj-tela'); await pg.wait_for_timeout(500)
        s = await pg.evaluate("({fs:!!document.fullscreenElement, p:document.getElementById('aj-tela').getAttribute('aria-pressed'), soltas:__soltas, e:RachaTela103.estado()})")
        P.confere(not s['fs'] and s['p'] == 'false' and s['e']['modo'] == 'api' and s['e']['botao'] and s['soltas'] >= 1, 'a chave dos Ajustes sai da tela cheia (e solta a tela); o botão volta', s)
        await pg.screenshot(path=str(SAIDA / 'v103_ajustes_844x390.png'))
        await rt(pg, "ajxFecha(); jogar(); true"); await pg.wait_for_timeout(1000)
        await pg.touchscreen.tap(844 * .5, 390 * .45); await pg.wait_for_timeout(200)
        P.confere(await pg.evaluate("!document.fullscreenElement && __pedidos.length === 1"), 'na partida, tocar no campo não entra em tela cheia')
        await rt(pg, "pausaAbre(); true"); await pg.wait_for_timeout(350)
        await pg.click('#pa-tela'); await pg.wait_for_timeout(500)
        p = await rt(pg, "({fs:!!document.fullscreenElement, aberta:PAUSA.aberta, e:RachaTela103.estado()})")
        P.confere(p['fs'] and p['aberta'] and not p['e']['pausa'], 'o cantinho da PAUSA põe em tela cheia (a pausa continua aberta; o cantinho some)', p)
        await pg.evaluate("document.exitFullscreen()"); await pg.wait_for_timeout(400)
        P.confere(await rt(pg, "!document.fullscreenElement && RachaTela103.estado().pausa && RachaTela103.estado().modo === 'api'"), 'saiu da tela cheia (pelo navegador): o cantinho volta')
        js = sem_rede(erros)
        P.confere(not js, 'Android: sem erro de JavaScript', js[:3])
    finally:
        await ctx.close()

    # --- em pé no Android: a tela GIRE O CELULAR com o JOGAR EM TELA CHEIA (um toque: tela cheia e a tela travada deitada)
    ctx, pg, erros = await pagina(b, 390, 844, init=[GRAVA])
    try:
        await pg.wait_for_timeout(300)
        g = await pg.evaluate("""(() => { const g = document.getElementById('v70-gire'), t = document.getElementById('v70-gire-tela'), r = t.getBoundingClientRect();
          return {gire:!g.hidden, bt:!t.hidden, foco:document.activeElement === g, w:r.width, h:r.height, dentro:r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight, tx:t.textContent}; })()""")
        await pg.screenshot(path=str(SAIDA / 'v103_gire_390x844.png'))
        P.confere(g['gire'] and g['bt'] and g['tx'] == 'JOGAR EM TELA CHEIA' and g['h'] >= 44 and g['dentro'], 'em pé (Android): GIRE O CELULAR com o JOGAR EM TELA CHEIA', g)
        P.confere(g['foco'], 'o foco continua na tela de girar (como antes)', g)
        await pg.tap('#v70-gire-tela'); await pg.wait_for_timeout(500)
        f = await pg.evaluate("({fs:document.fullscreenElement === document.documentElement, pedidos:__pedidos, travas:__travas})")
        P.confere(f['fs'] and f['pedidos'] == [{'navigationUI': 'hide'}] and f['travas'] == ['landscape'], 'um toque: tela cheia e a tela travada deitada (o celular gira sozinho)', f)
        await pg.evaluate("document.exitFullscreen()"); await pg.wait_for_timeout(300)
        js = sem_rede(erros)
        P.confere(not js, 'em pé: sem erro de JavaScript', js[:3])
    finally:
        await ctx.close()

    # --- iPhone (o Safari do iPhone: sem a tela cheia de página) — o guia
    ctx, pg, erros = await pagina(b, 390, 844, ua=IPHONE, init=[SEM_API], dsf=3, mobile=True)
    try:
        await pg.wait_for_timeout(300)
        P.confere(await pg.evaluate("!document.getElementById('v70-gire').hidden && document.getElementById('v70-gire-tela').hidden"),
                  'em pé no iPhone: a tela de girar sem o botão (o guia é deitado, no lobby)')
    finally:
        await ctx.close()
    ins = insets_de(844, 390)
    ctx, pg, erros = await pagina(b, 844, 390, ins=ins, ua=IPHONE, init=[SEM_API], dsf=3, mobile=True)
    try:
        e = await rt(pg, "RachaTela103.estado()")
        P.confere(e['modo'] == 'guia' and e['ios'] and not e['api'] and e['botao'], 'iPhone: o botão no lobby abre o guia (o Safari do iPhone não tem a tela cheia de página)', e)
        await pg.click('#lb .v103-tela-bt'); await pg.wait_for_timeout(400)
        g = await pg.evaluate("""(() => { const g = document.getElementById('v103-guia'), c = g.querySelector('.v103-guia-caixa').getBoundingClientRect(), a = document.activeElement;
          return {vis:!g.hidden, tit:g.querySelector('h2').textContent, tx:g.textContent, foco:a && a.className, caixa:[c.left, c.top, c.right, c.bottom], vw:innerWidth, vh:innerHeight,
            modal:g.getAttribute('aria-modal'), inerte:document.getElementById('lb').inert, fs:!!document.fullscreenElement}; })()""")
        await pg.screenshot(path=str(SAIDA / 'v103_guia_iphone_844x390.png'))
        sa = {'t': ins['top'], 'r': ins['right'], 'b': ins['bottom'], 'l': ins['left']}
        P.confere(g['vis'] and g['tit'] == 'TELA CHEIA NO IPHONE' and 'Compartilhar' in g['tx'] and 'Adicionar à Tela de Início' in g['tx'] and not g['fs'],
                  'o guia: TELA CHEIA NO IPHONE — Compartilhar › Adicionar à Tela de Início (e nada de tela cheia de página)', g['tit'])
        P.confere(g['foco'] == 'v103-guia-ok' and g['modal'] == 'true' and g['inerte'], 'o guia prende o foco (no ENTENDI) e deixa o lobby inerte', g)
        P.confere(dentro(g['caixa'], g['vw'], g['vh'], sa), 'o guia cabe na área segura do iPhone', g['caixa'])
        await pg.keyboard.press('Escape'); await pg.wait_for_timeout(300)
        v = await pg.evaluate("({vis:!document.getElementById('v103-guia').hidden, foco:document.activeElement && document.activeElement.className})")
        P.confere(not v['vis'] and 'v103-tela-bt' in (v['foco'] or ''), 'o Esc fecha o guia e o foco volta para o botão', v)
        await rt(pg, "ajxAbre('visual'); true"); await pg.wait_for_timeout(300)
        a = await pg.evaluate("(() => { const l = document.querySelector('.v103-aj-tela'); return {tit:l.querySelector('.ajx-tx b').textContent, como:!document.getElementById('aj-tela-como').hidden, chave:!document.getElementById('aj-tela').hidden}; })()")
        P.confere(a['tit'] == 'Tela cheia no iPhone' and a['como'] and not a['chave'], 'AJUSTES › Visual no iPhone: Tela cheia no iPhone, com o COMO FAZER (sem a chave)', a)
        await pg.click('#aj-tela-como'); await pg.wait_for_timeout(300)
        P.confere(await pg.evaluate("!document.getElementById('v103-guia').hidden"), 'o COMO FAZER abre o guia')
        await pg.click('#v103-guia .v103-guia-ok'); await pg.wait_for_timeout(300)
        P.confere(await pg.evaluate("document.getElementById('v103-guia').hidden && !document.getElementById('pop-ajustes').hidden"), 'o ENTENDI fecha o guia (os Ajustes continuam abertos)')
        await rt(pg, "ajxFecha(); jogar(); true"); await pg.wait_for_timeout(900)
        await rt(pg, "pausaAbre(); true"); await pg.wait_for_timeout(350)
        await pg.click('#pa-tela'); await pg.wait_for_timeout(300)
        p = await pg.evaluate("({guia:!document.getElementById('v103-guia').hidden, pausa:!document.getElementById('pausa').hidden})")
        P.confere(p['guia'] and p['pausa'], 'o cantinho da PAUSA também abre o guia (por cima da pausa)', p)
        await pg.click('#v103-guia .v103-guia-x'); await pg.wait_for_timeout(300)
        P.confere(await rt(pg, "document.getElementById('v103-guia').hidden && PAUSA.aberta"), 'o X fecha o guia e a pausa continua')
        js = sem_rede(erros)
        P.confere(not js, 'iPhone: sem erro de JavaScript', js[:3])
    finally:
        await ctx.close()

    # --- aberto pelo ícone (o app instalado): no Android (display-mode) e no iPhone (navigator.standalone)
    for nome, init, ua in [('Android', [APP], None), ('iPhone', [SEM_API, IOS_APP], IPHONE)]:
        ctx, pg, erros = await pagina(b, 844, 390, ua=ua, init=init, mobile=bool(ua))
        try:
            e = await rt(pg, "RachaTela103.estado()")
            await rt(pg, "ajxAbre('visual'); true"); await pg.wait_for_timeout(250)
            a = await pg.evaluate("(() => { const c = document.getElementById('aj-tela'); return {p:c.getAttribute('aria-pressed'), d:c.disabled, nota:c.closest('.aj-lin').querySelector('small').textContent}; })()")
            t = await rt(pg, "[...LB.palco.querySelectorAll('button, [role=button]')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 2 && getComputedStyle(e).display !== 'none' && !e.closest('[hidden]') && !e.closest('.v102-gaveta'); }).length")
            P.confere(e['modo'] == 'app' and not e['botao'] and not e['pausa'] and t <= 13, 'aberto pelo ícone (%s): sem o botão (o lobby volta às 13 coisas para tocar)' % nome, (e, t))
            P.confere(a['p'] == 'true' and a['d'] and 'ícone' in a['nota'], 'aberto pelo ícone (%s): nos Ajustes, a tela cheia ligada (já abre assim)' % nome, a)
        finally:
            await ctx.close()


# ---------------------------------------------------------------------------------------------------------------- 5) o lobby e a partida nos tamanhos
async def mede_partida(b, w, h, ins, arquivo=None):
    ctx, pg, erros = await pagina(b, w, h, ins=ins, arquivo=arquivo)
    try:
        await rt(pg, "jogar(); true"); await pg.wait_for_timeout(1100)
        return await rt(pg, PARTIDA)
    finally:
        await ctx.close()


async def tamanhos(P, b):
    print('5) o lobby e a partida nos tamanhos deitados, sem e com as áreas seguras')
    for w, h in TAMANHOS:
        for ins in (None, insets_de(w, h)):
            nome = '%dx%d%s' % (w, h, ' com áreas %s' % '/'.join(str(ins[k]) for k in ('top', 'right', 'bottom', 'left')) if ins else '')
            tag = '%dx%d%s' % (w, h, '_ins' if ins else '')
            ctx, pg, erros = await pagina(b, w, h, ins=ins)
            try:
                c = await rt(pg, LOBBY)
                sa, vw, vh = c['sa'], c['vw'], c['vh']
                if ins:
                    P.confere(sa == {'t': ins['top'], 'r': ins['right'], 'b': ins['bottom'], 'l': ins['left']}, nome + ': o jogo lê as áreas seguras', sa)
                nomes = [n for n, _ in c['L']]
                P.confere('telacheia' in nomes and c['antesDoMenu'], nome + ': lobby — o TELA CHEIA na barra de cima, logo antes do MENU', nomes)
                fora = [n for n, r in c['todos'] if not dentro(r, vw, vh, sa)]
                P.confere(not fora, nome + ': lobby — os %d botões dentro da área segura' % len(c['todos']), fora[:5])
                cr = [(c['L'][i][0], c['L'][j][0]) for i in range(len(c['L'])) for j in range(i + 1, len(c['L'])) if cruzam(c['L'][i][1], c['L'][j][1])]
                P.confere(not cr, nome + ': lobby — nenhum botão por cima de outro (%d peças)' % len(c['L']), cr)
                f, ce = c['fundo'], c['cena']
                P.confere(f[0] <= 0 and f[1] <= 0 and f[2] >= vw - .5 and f[3] >= vh - .5 and ce[0] <= 1 and ce[1] <= 1 and ce[2] >= vw - 1 and ce[3] >= vh - 1 and not c['moldura'],
                          nome + ': lobby — o fundo (a cena) de ponta a ponta, por baixo das áreas seguras (a moldura fica para a partida)', (f, ce, c['moldura']))
                if (w, h) == (932, 430) and ins:
                    await pg.screenshot(path=str(SAIDA / ('v103_lobby_%s.png' % tag)))
                await rt(pg, "jogar(); true"); await pg.wait_for_timeout(1100)
                m = await rt(pg, PARTIDA)
                png = await pg.screenshot(path=str(SAIDA / ('v103_partida_%s.png' % tag)) if (w, h) in ((932, 430), (1180, 820), (640, 360)) else None)
                esp = esperado(vw, vh, m['sa'])
                P.confere(all(abs(a - e2) < .6 for a, e2 in zip(m['cv'], esp)), nome + ': partida — o canvas (e o HUD) onde sempre ficou: o maior 1920 × 888 no meio da área segura', (m['cv'], esp))
                ruins = [x[0] for x in m['ctl'] if not dentro([x[1] - x[3], x[2] - x[3], x[1] + x[3], x[2] + x[3]], vw, vh, m['sa'])]
                P.confere(not ruins and len(m['ctl']) >= 4, nome + ': partida — os controles (%s) dentro da área segura' % ', '.join(x[0] for x in m['ctl']), ruins)
                fb = [n for n, r in m['botoes'] if not dentro(r, vw, vh, m['sa'])]
                P.confere(not fb, nome + ': partida — os botões da tela (%d) dentro da área segura' % len(m['botoes']), fb[:4])
                r = m['cv']
                faixa = r[0] > .5 or r[1] > .5 or r[0] + r[2] < vw - .5 or r[1] + r[3] < vh - .5
                P.confere(m['moldura'] == faixa and (not faixa or (m['mr'] == [0, 0, vw, vh] and m['mz'] == '-1' and m['mpe'] == 'none')),
                          nome + ': partida — ' + ('a moldura cobre a tela atrás do jogo, sem pegar toque' if faixa else 'sem faixa, sem moldura'), (m['moldura'], m['mr'], m['mz'], m['mpe']))
                if faixa:
                    from PIL import Image
                    im = Image.open(io.BytesIO(png))
                    k = im.width / vw
                    caixa = None
                    if r[0] >= 10: caixa = (2 * k, (r[1] + 4) * k, (r[0] - 2) * k, (r[1] + r[3] - 4) * k)
                    elif r[1] >= 10: caixa = ((r[0] + 4) * k, 2 * k, (r[0] + r[2] - 4) * k, (r[1] - 2) * k)
                    if caixa:
                        n_cores, _ = textura(png, caixa)
                        P.confere(n_cores >= 12, nome + ': partida — na faixa, o campo continua (mais escuro), não uma cor lisa (%d cores)' % n_cores, n_cores)
                if BASE:
                    base = await mede_partida(b, w, h, ins, arquivo=BASE)
                    igual = all(abs(a - e2) < .01 for a, e2 in zip(m['cv'], base['cv'])) and len(m['ctl']) == len(base['ctl']) and all(
                        x[0] == y[0] and all(abs(p - q) < .01 for p, q in zip(x[1:], y[1:])) for x, y in zip(m['ctl'], base['ctl'])) and abs(m['hk'] - base['hk']) < 1e-9
                    P.confere(igual, nome + ': partida — o canvas, o HUD e os controles nos mesmos pixels da versão anterior (RACHA_BASE)', (m['cv'], base['cv']))
                js = sem_rede(erros)
                P.confere(not js, nome + ': sem erro de JavaScript', js[:3])
            finally:
                await ctx.close()


# ---------------------------------------------------------------------------------------------------------------- 6) a pausa
PAUSA_JS = """(() => {
  const t = document.getElementById('pa-tela'), r = t.getBoundingClientRect(), cx = document.querySelector('#pausa .pa-caixa').getBoundingClientRect();
  const txt = e => { const rg = document.createRange(); rg.selectNodeContents(e); const q = rg.getBoundingClientRect(); return [q.left, q.top, q.right, q.bottom]; };
  const bts = [...document.querySelectorAll('#pausa .pa-acoes .pa-bt')].filter(b => !b.hidden && b.getClientRects().length);
  return {t:[r.left, r.top, r.right, r.bottom], w:r.width, h:r.height, caixa:[cx.left, cx.top, cx.right, cx.bottom], tit:txt(document.getElementById('pa-tit')), rot:txt(document.getElementById('pa-rot')),
    bts:bts.map(b => [b.id, (q => [q.left, q.top, q.right, q.bottom])(b.getBoundingClientRect())]), duas:document.querySelector('#pausa .pa-acoes').classList.contains('v93-duas'),
    vis:!t.hidden && getComputedStyle(t).display !== 'none'};
})()"""


async def pausa(P, b):
    print('6) o cantinho TELA CHEIA na pausa')
    for w, h, ins in [(640, 360, None), (844, 390, insets_de(844, 390)), (932, 430, insets_de(932, 430)), (1280, 720, None)]:
        nome = '%dx%d%s' % (w, h, ' com áreas' if ins else '')
        ctx, pg, erros = await pagina(b, w, h, ins=ins)
        try:
            await rt(pg, "jogar(); true"); await pg.wait_for_timeout(1000)
            png0 = await pg.screenshot()
            await rt(pg, "pausaAbre(); true"); await pg.wait_for_timeout(400)
            p = await rt(pg, PAUSA_JS)
            P.confere(p['vis'] and p['w'] >= 44 and p['h'] >= 44, nome + ': pausa — o cantinho TELA CHEIA com %dx%d px' % (p['w'], p['h']), p)
            t = p['t']
            P.confere(t[0] >= p['caixa'][0] and t[2] <= p['caixa'][2] and t[1] >= p['caixa'][1] and t[3] <= p['caixa'][3], nome + ': pausa — dentro da caixa', (t, p['caixa']))
            cr = [n for n, r in [('PAUSA', p['tit']), ('linha de baixo', p['rot'])] + p['bts'] if cruzam(t, r, 0)]
            P.confere(not cr, nome + ': pausa — sem cobrir o título, a linha de baixo e os botões', cr)
            P.confere(len(p['bts']) == 4 and not p['duas'], nome + ': pausa — a grade dos botões igual (4 botões)', ([x[0] for x in p['bts']], p['duas']))
            if ins:
                png1 = await pg.screenshot(path=str(SAIDA / ('v103_pausa_%dx%d_ins.png' % (w, h))))
                m = await rt(pg, "(() => { const r = cv.getBoundingClientRect(); return [r.left, r.top, r.width, r.height]; })()")
                caixa = (2, m[1] + 6, m[0] - 2, m[1] + m[3] - 6)
                _, l0 = textura(png0, caixa); _, l1 = textura(png1, caixa)
                P.confere(l1 < l0 - 3, nome + ': com a pausa aberta, as faixas escurecem junto (%.0f → %.0f)' % (l0, l1), (l0, l1))
            js = sem_rede(erros)
            P.confere(not js, nome + ': sem erro de JavaScript', js[:3])
        finally:
            await ctx.close()
    # o Ultra leve: nada a mais para desenhar (as faixas lisas, na cor do fundo do mapa)
    ctx, pg, erros = await pagina(b, 932, 430, ins=insets_de(932, 430))
    try:
        await rt(pg, "graf = 'leve'; aplicaGraficos(); jogar(); true"); await pg.wait_for_timeout(900)
        u = await rt(pg, "({m:RachaTela103.estado().moldura, cor:document.body.style.backgroundColor, campo:CAMPO.fundo})")
        P.confere(not u['m'] and u['cor'] != '', 'no Ultra leve: sem a moldura (as faixas na cor do fundo do mapa)', u)
        await rt(pg, "graf = 'padrao'; aplicaGraficos(); abrirLobby(); true"); await pg.wait_for_timeout(400)
        u = await rt(pg, "({m:RachaTela103.estado().moldura, cor:document.body.style.backgroundColor})")
        P.confere(not u['m'] and u['cor'] == '', 'de volta ao lobby: a moldura some e a cor da página volta', u)
    finally:
        await ctx.close()


async def principal():
    P = Placar('v103 · tela cheia, o app instalável e o campo até a beirada')
    arquivos(P)
    async with async_playwright() as pw:
        await servidores_e_app(P, pw)
        b = await pw.chromium.launch(executable_path=CHROME, args=['--no-sandbox', '--autoplay-policy=no-user-gesture-required'])
        try:
            await botao(P, b)
            await tamanhos(P, b)
            await pausa(P, b)
        finally:
            await b.close()
    return P.fim()


if __name__ == '__main__':
    roda(principal())
