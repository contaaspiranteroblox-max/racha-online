"""RACHA v92 · OS CONTROLES NO CELULAR, COM TOQUES DE VERDADE (passa/falha, com as medidas impressas).
O Chromium faz de conta que é um celular deitado (tela pequena e densa, toque, o navegador do celular) e os toques chegam
pelo mesmo caminho de um dedo (CDP Input.dispatchTouchEvent → touchstart/pointerdown no canvas do jogo, com vários dedos ao
mesmo tempo). O relógio dos quadros é o de mentira dos testes da v92: cada quadro da tela é dado pelo teste. Em cada
versão — a v92 (o padrão), a v91 pelo A ⇄ B (o perfil "v91" dentro da v92) e, se der o arquivo, a v91 ORIGINAL — confere:
  1. o HUD: o PASSE, o CHUTE, o analógico e a pausa no mesmo lugar e do mesmo tamanho da v91, inteiros na tela, em três
     celulares (iPhone 844 × 390, Android 915 × 412 e um pequeno 667 × 375);
  2. a bola e as tampinhas: o mesmo tamanho na tela e a mesma câmera da v91;
  3. o PASSE e o CHUTE com o dedo: com a bola no alcance um toque chuta, com a mesma força da v91;
  4. o toque armado com o dedo: um toque de 40 ms, 60 ms antes de a bola chegar, chuta na v92 (na v91 se perde);
  5. o analógico com o dedo: 8 direções (a tampinha anda para onde o dedo foi) e soltar para; o dedo a 17% do curso anda
     na v92 (na v91, não);
  6. dois dedos: o analógico segurado e um toque no CHUTE — chuta e continua andando;
  7. as colisões: um lance com o dedo (a tampinha conduz a bola, bate no bot, chuta na trave e corre para o canto) igual
     ao da v91 passo a passo;
  8. a fluidez com o dedo no analógico (60 Hz com o relógio oscilando, 90 Hz e 120 Hz): os quadros com 0 ou 2 passos, o
     ritmo dos desenhos e o tremido da tampinha na tela (onde ela aparece em cada desenho × a corrida lisa);
  9. o iPhone: a vibração do toque armado sai no toque (na v91 só vibrava com a bola já no alcance);
 10. a versão de testes: tocar na pausa e no A ⇄ B troca as memórias (desde a v94: B = o motor de antes, A = o próprio) e o
     CONTINUAR volta ao jogo.
Isto é o navegador de teste fazendo de conta: não substitui o teste nos celulares de verdade (Safari no iPhone e Chrome no
Android), que confere a sensação, o toque do vidro, a vibração e o desempenho.
Uso: python3 tests/v92_celular_test.py [<racha_teste.html da v91 original>]"""
import asyncio, json, math, os, pathlib, statistics, sys
from comum import Placar, rt, async_playwright, RAIZ, CHROME, HARNESS, FONTES, PAGINA

RELOGIO = (RAIZ / 'tests' / 'v92_medidas.py').read_text(encoding='utf-8').split('RELOGIO = r"""', 1)[1].split('"""', 1)[0]
IV60 = 1000 / 60
UA_IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'
UA_ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36'
CELULARES = {'iPhone': (844, 390, 3, UA_IPHONE), 'Android': (915, 412, 2.625, UA_ANDROID), 'pequeno': (667, 375, 2, UA_IPHONE)}

# a partida de treino contra 1 bot, parado num canto; os contadores de passos, chutes e o rastro do lance
PREP = r"""(() => {
  try { if (fimAberto()) fechaFim(); } catch (_) {}
  x49Start(1, 0); try { rqVsFecha(); } catch (_) {}
  rqBots = function(){}; RQ.estado = 'jogo'; RQ.autoH = false;
  ARB_PARADO = function(){ return false; };
  for (const q of RQ.bots){ q.x = q.ax = LX1 - 80; q.y = q.ay = LY0 + 80; q.vx = q.vy = q.mx = q.my = 0; }
  window.__np = 0; window.__nk = []; window.__tr = null; window.__hap = 0;
  const ps = physicsStep; physicsStep = function(){
    const r = ps.apply(this, arguments); window.__np++;
    if (window.__tr){ const q = RQ.bots[0]; window.__tr.push([P.x, P.y, P.vx, P.vy, B.x, B.y, B.vx, B.vy, q.x, q.y]); }
    return r; };
  window.__nr = 0; const rd = render; render = function(){ window.__nr++; return rd.apply(this, arguments); };
  const dk = doKick; doKick = function(power){ const ok = dk.apply(this, arguments); if (ok) window.__nk.push({forte:!!power, np:window.__np, v:Math.hypot(B.vx, B.vy)}); return ok; };
  window.addEventListener('click', e => { if (HAP.el && e.target === HAP.el) window.__hap++; }, true);   // (a vibração do iPhone)
  window.__vib = 0;
  if (navigator.vibrate){ const v0 = navigator.vibrate.bind(navigator); navigator.vibrate = function(){ window.__vib++; try { return v0.apply(null, arguments); } catch (_) { return false; } }; }   // (a do Android)
  return 1;
})()"""
# tudo parado: a tampinha, a bola e o bot onde o teste manda, os botões soltos
POE = r"""((px, py, bx, by, bvx, bvy) => {
  RQ.estado = 'jogo'; P.x = P.ax = px; P.y = P.ay = py; P.vx = P.vy = 0; P.mx = P.my = 0;
  B.x = bx; B.y = by; B.vx = bvx || 0; B.vy = bvy || 0; B.w = 0; resetBotoes();
  for (const q of RQ.bots){ q.x = q.ax = LX1 - 80; q.y = q.ay = LY0 + 80; q.vx = q.vy = q.mx = q.my = 0; }
  guardaAnterior(); return 1; })"""
GEO = r"""(() => {
  const r = cv.getBoundingClientRect(), kx = r.width/W, ky = r.height/H;
  const c = k => { const e = el(k); return {x:+(r.left + e.x*kx).toFixed(2), y:+(r.top + e.y*ky).toFixed(2), r:+(e.r*kx).toFixed(2)}; };
  const p = BTN_PAUSA;
  return {cv:[r.left, r.top, r.width, r.height], kx, ky, vw:innerWidth, vh:innerHeight, kick:c('kick'), power:c('power'), joy:c('joy'),
    joyR:+(JOY.max*hud.joy.al*hud.joy.s*kx).toFixed(2), adere:!!hud.joy.adere,
    pausa:[+(r.left + (p.x + p.w/2)*kx).toFixed(2), +(r.top + (p.y + p.h/2)*ky).toFixed(2), +(p.w*kx).toFixed(2)],
    rb:R_BOLA, rj:R_JOG, u:U(1), alc:ALCANCE_CHUTE, vel:VEL_JOG};
})()"""
VISTA = r"""(() => { const r = cv.getBoundingClientRect(), kx = r.width/W;
  return {z:+cam.z.toFixed(6), cx:+cam.x.toFixed(3), cy:+cam.y.toFixed(3), bola_px:+(R_BOLA*cam.z*kx).toFixed(3), tampa_px:+(R_JOG*cam.z*kx).toFixed(3),
          px:+VIS.px.toFixed(3), py:+VIS.py.toFixed(3)}; })()"""
# a bola vindo; quantos passos até ela entrar no alcance
VEM = r"""(() => {
  RQ.estado = 'jogo'; P.x = CX; P.y = CY + U(4); P.vx = P.vy = 0; resetBotoes();
  B.x = P.x + ALCANCE_CHUTE + U(5); B.y = P.y; B.vx = -U(12); B.vy = 0; B.w = 0; guardaAnterior();
  const f = (typeof CAMPO !== 'undefined' && CAMPO.fatorBola) || FATOR_BOLA;
  let x = B.x, vx = B.vx, n = 0;
  while (x - P.x > ALCANCE_CHUTE && n < 600){ vx *= f; x += vx*STEP; n++; }
  return n; })()"""
# n quadros com o dedo segurando o analógico (o relógio da tela: iv ms ± sd, no lugar de cada quadro na grade da tela)
FLUIDO = r"""((iv, sd, n, fase) => {
  // o tremido é medido nos quadros DESENHADOS (um quadro que o jogo não desenha deixa a imagem anterior na tela): onde a
  // tampinha aparece × onde ela estaria naquele instante correndo reto e liso (a reta que melhor passa pelos pontos), em px
  // da tela; e o ritmo dos desenhos (o intervalo entre dois desenhos, em quadros da tela)
  let s = 7; const rnd = () => { s = (s*1664525 + 1013904223) >>> 0; return s/4294967296; };
  const gauss = () => { let u = 0; while (!u) u = rnd(); return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*rnd()); };
  const Q = window.__quadro, r = cv.getBoundingClientRect(), kx = r.width/W;
  P.x = P.ax = GL + U(3); P.y = P.ay = CY + U(10); B.x = GL + U(3); B.y = LY0 + U(4); B.vx = B.vy = 0; guardaAnterior();
  for (let i = 0; i < 45; i++) Q.passo(iv);
  if (typeof acc !== 'undefined') acc = STEP*fase;
  let zero = 0, dois = 0, tres = 0; const t0 = Q.t, pts = [], cams = [], gaps = []; let nr = window.__nr, ult = -1;
  for (let i = 0; i < n; i++){
    const a = window.__np;
    Q.passo(Math.max(Q.t + .1, t0 + (i + 1)*iv + gauss()*sd) - Q.t);
    const k = window.__np - a; if (k === 0) zero++; else if (k === 2) dois++; else if (k >= 3) tres++;
    if (window.__nr !== nr){ nr = window.__nr; pts.push([(i + 1)*iv, VIS.px*cam.z*kx]); cams.push([(i + 1)*iv, cam.x*cam.z*kx]); if (ult >= 0) gaps.push(i - ult); ult = i; }
  }
  const reta = v => { const m = v.length, mt = v.reduce((p, q) => p + q[0], 0)/m, mx = v.reduce((p, q) => p + q[1], 0)/m;
    let a = 0, b = 0; for (const [t, x] of v){ a += (t - mt)*(x - mx); b += (t - mt)*(t - mt); }
    const vel = b ? a/b : 0, res = v.map(([t, x]) => x - (mx + vel*(t - mt)));
    return {px_por_quadro:+(vel*iv).toFixed(3), tremido:+Math.sqrt(res.reduce((p, q) => p + q*q, 0)/m).toFixed(3), pior:+Math.max(...res.map(Math.abs)).toFixed(3)}; };
  const g = {}; for (const x of gaps) g[x] = (g[x] | 0) + 1;
  return {zero, dois, tres, quadros:n, desenhos:pts.length, ritmo:g, tampa:reta(pts), camera:reta(cams), fim:P.x < GR - U(3)};
})"""


class Dedos:
    """Os dedos na tela (CDP): cada evento manda todos os dedos que estão encostados, como o navegador do celular recebe."""
    def __init__(self, cdp):
        self.cdp, self.vivos = cdp, {}

    async def _manda(self, tipo):
        pts = [{'x': x, 'y': y, 'id': i, 'radiusX': 9, 'radiusY': 9, 'force': 1} for i, (x, y) in self.vivos.items()]
        await self.cdp.send('Input.dispatchTouchEvent', {'type': tipo, 'touchPoints': pts})

    async def poe(self, i, x, y):
        self.vivos[i] = (x, y); await self._manda('touchStart')

    async def move(self, i, x, y):
        self.vivos[i] = (x, y); await self._manda('touchMove')

    async def tira(self, i):
        # (no CDP deste Chromium o touchEnd solta os dedos que vão na lista: para tirar um dedo e deixar os outros, manda só ele)
        x, y = self.vivos.pop(i)
        await self.cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': [{'x': x, 'y': y, 'id': i, 'radiusX': 9, 'radiusY': 9, 'force': 1}]})


async def quadros(pg, n, iv=IV60):
    await pg.evaluate("([n, iv]) => { for (let i = 0; i < n; i++) window.__quadro.passo(iv); return 1; }", [n, iv])


async def abre_cel(pw, pagina, cel, config=None, ios=False, perfil='v92'):
    w, h, dsf, ua = CELULARES[cel]
    b = await pw.chromium.launch(executable_path=CHROME, args=['--no-sandbox', '--autoplay-policy=no-user-gesture-required'])
    ctx = await b.new_context(viewport={'width': w, 'height': h}, device_scale_factor=dsf, has_touch=True, is_mobile=True, user_agent=ua)
    await ctx.add_init_script("document.addEventListener('DOMContentLoaded',()=>{const s=document.createElement('style');s.textContent=%s;document.head.prepend(s);});" % json.dumps(FONTES))
    cfg = dict(config or {}); cfg.setdefault('presente', False)
    await ctx.add_init_script('window.RACHA_CONFIG = %s;' % json.dumps(cfg))
    if ios:   # o iPhone não tem navigator.vibrate (a vibração do jogo lá é o truque do interruptor)
        await ctx.add_init_script("try { delete Navigator.prototype.vibrate; } catch (e) {}")
    await ctx.add_init_script(RELOGIO)
    pg = await ctx.new_page()
    erros = []
    pg.on('pageerror', lambda e: erros.append(str(e)[:300]))
    pg.on('console', lambda m: erros.append('console: ' + m.text[:200]) if m.type == 'error' else None)
    await pg.goto(pathlib.Path(pagina).resolve().as_uri())
    await pg.wait_for_function('() => typeof window.__RT === "function"', polling=100, timeout=30000)
    await pg.wait_for_timeout(600)
    await pg.evaluate("(() => { const o = document.getElementById('onb'); if (o) o.hidden = true; })()")
    await pg.evaluate("(() => { const b = [...document.querySelectorAll('#v84auth button')].find(x => /TREINAR OFFLINE/.test(x.textContent || '')); if (b) b.click(); })()")
    await pg.wait_for_timeout(150)
    await rt(pg, HARNESS)
    await rt(pg, PREP)
    await rt(pg, perfil_js(perfil))                            # (o perfil antes do primeiro quadro: a câmera e tudo começam iguais)
    await pg.evaluate("window.__quadro.liga()")
    await quadros(pg, 30)
    # (o relógio de mentira pula do relógio de verdade para o dele ao ligar: a cadência da v92 guarda esse pulo como uma
    # diferença de até 6 ms, que num celular de verdade não existe — lá ela começa em 0 e só anda se a tela não for de
    # 60 Hz certinho. Zera, como num aparelho que já vinha rodando.)
    await rt(pg, "(() => { if (typeof V92Q !== 'undefined') V92Q.der = 0; return 1; })()")
    cdp = await ctx.new_cdp_session(pg)
    return b, pg, Dedos(cdp), erros


def perfil_js(nome):
    if nome == 'v92':
        # (v103: o CHUTE do padrão ficou 6% mais forte, 340 → 360 — este teste compara a v92 com a v91 com a MESMA física, então
        #  a sessão da v92 roda com o CHUTE de antes; a força nova é conferida no v86_chute, no v92_nucleo e no v92_db)
        return "(() => { if (typeof V92 !== 'undefined'){ const c = v92Limpa(V92_PADRAO); c.fisica = Object.assign({}, c.fisica, {forcaChute: 340, atritoJogJog: 0, viraNaHora: 0, direcoes: 32}); V92.cfg = c; v92Aplica(); } return 1; })()"
    if nome == 'v91 (A ⇄ B)':
        return "(() => { V92.cfg = v92Limpa(V92_V91); v92Aplica(); return 1; })()"
    return "1"


def cli(g, x, y):
    return g['cv'][0] + x * g['kx'], g['cv'][1] + y * g['ky']


async def toque(pg, d, g, botao, quadros_dentro=2):
    """um toque rápido no botão (o dedo 5): encosta, quadros_dentro quadros, solta"""
    c = g[botao]
    await d.poe(5, c['x'], c['y']); await quadros(pg, quadros_dentro); await d.tira(5)


# ------------------------------------------------------------------------------------------------ as cenas
async def cena_chutes(pg, d, g):
    out = {}
    for botao, forte in (('kick', False), ('power', True)):
        await rt(pg, POE + "(CX, CY, CX + ALCANCE_CHUTE - U(.5), CY, 0, 0)")
        n0 = len(await rt(pg, "window.__nk"))
        await toque(pg, d, g, botao); await quadros(pg, 4)
        nk = (await rt(pg, "window.__nk"))[n0:]
        out[botao] = {'chutou': len(nk) == 1 and nk[0]['forte'] == forte, 'v': round(nk[0]['v'], 6) if nk else None, 'n': len(nk)}
    return out


async def cena_armado(pg, d, g, ofs=-60, dur=40):
    n = await rt(pg, VEM)
    t_chega = n * 1000 / 60
    t_a, t_s = t_chega + ofs, t_chega + ofs + dur
    n0 = len(await rt(pg, "window.__nk")); h0 = await rt(pg, "window.__hap"); v0 = await rt(pg, "window.__vib")
    ap = so = False; hap_toque = None
    c = g['power']
    for i in range(n + 30):
        prox = (i + 1) * IV60
        if not ap and t_a <= prox:
            await d.poe(5, c['x'], c['y']); ap = True
            hap_toque = (await rt(pg, "window.__hap")) - h0
        if ap and not so and t_s <= prox:
            await d.tira(5); so = True
        await quadros(pg, 1)
    if not so:
        await d.tira(5)
    nk = (await rt(pg, "window.__nk"))[n0:]
    return {'chutou': len(nk) >= 1, 'vibrou_no_toque': hap_toque, 'vibrou': (await rt(pg, "window.__hap")) - h0, 'vibrou_android': (await rt(pg, "window.__vib")) - v0}


async def cena_analogico(pg, d, g):
    out = []
    for ang in range(0, 360, 45):
        await rt(pg, POE + "(CX, CY, LX0 + U(4), LY0 + U(4), 0, 0)")
        x0, y0 = g['joy']['x'], g['joy']['y']                 # (o dedo pousa no meio do analógico e vai para o lado)
        a = math.radians(ang); R = g['joyR'] * .92
        await d.poe(1, x0, y0); await quadros(pg, 1)
        await d.move(1, x0 + R * .5 * math.cos(a), y0 + R * .5 * math.sin(a)); await quadros(pg, 1)
        await d.move(1, x0 + R * math.cos(a), y0 + R * math.sin(a)); await quadros(pg, 24)
        v = await rt(pg, "({vx:P.vx, vy:P.vy, joy:joy.id !== null})")
        await d.tira(1); await quadros(pg, 40)
        s = await rt(pg, "({v:Math.hypot(P.vx, P.vy), joy:joy.id !== null})")
        med = (math.degrees(math.atan2(v['vy'], v['vx'])) + 360) % 360
        erro = abs((med - ang + 180) % 360 - 180)
        out.append({'ang': ang, 'medido': round(med, 2), 'erro': round(erro, 3), 'vel': round(math.hypot(v['vx'], v['vy']) / g['u'], 3),
                    'segurando': v['joy'], 'depois': round(s['v'] / g['u'], 3), 'solto': not s['joy']})
    return out


async def cena_pouco(pg, d, g, frac=.17):
    await rt(pg, POE + "(CX, CY, LX0 + U(4), LY0 + U(4), 0, 0)")
    x0, y0 = g['joy']['x'], g['joy']['y']
    await d.poe(1, x0, y0); await quadros(pg, 1)
    await d.move(1, x0 + g['joyR'] * frac, y0); await quadros(pg, 20)
    v = await rt(pg, "Math.hypot(P.vx, P.vy)/U(1)")
    await d.tira(1); await quadros(pg, 30)
    return round(v, 3)


async def cena_dois_dedos(pg, d, g):
    await rt(pg, POE + "(CX - U(16), CY, LX0 + U(4), LY0 + U(4), 0, 0)")
    x0, y0 = g['joy']['x'], g['joy']['y']
    await d.poe(1, x0, y0); await quadros(pg, 1)
    await d.move(1, x0 + g['joyR'] * .92, y0); await quadros(pg, 18)
    await rt(pg, "(() => { B.x = P.x + ALCANCE_CHUTE - U(.5); B.y = P.y; B.vx = P.vx; B.vy = P.vy; B.w = 0; return 1; })()")
    n0 = len(await rt(pg, "window.__nk"))
    c = g['power']
    await d.poe(2, c['x'], c['y']); await quadros(pg, 2); await d.tira(2); await quadros(pg, 8)
    r = await rt(pg, "({joy:joy.id !== null, vx:P.vx/U(1), dedos:ptrs.size})")
    nk = (await rt(pg, "window.__nk"))[n0:]
    await d.tira(1); await quadros(pg, 3)
    solto = await rt(pg, "({joy:joy.id !== null, dedos:ptrs.size})")
    return {'chutou': len(nk) == 1 and nk[0]['forte'], 'segue_andando': r['joy'] and r['vx'] > .5 * g['vel'] / g['u'], 'vx': round(r['vx'], 3),
            'dedos_depois_do_chute': r['dedos'], 'soltou_tudo': not solto['joy'] and solto['dedos'] == 0}


async def cena_lance(pg, d, g):
    """o lance com o dedo: conduz para a direita (a tampinha bate na bola e a bola no bot), chuta forte na trave de baixo
    do gol da direita com o segundo dedo, corre para o canto de baixo e solta. Devolve o rastro passo a passo e a câmera."""
    await rt(pg, POE + "(CX - U(20), CY, CX - U(15.5), CY + U(.4), 0, 0)")
    # (a câmera parte do mesmo estado nas versões: antes do relógio de mentira ligar, quadros de verdade em número diferente
    # em cada página deixam a mola da câmera um tiquinho diferente; o lance começa com a câmera assentada no lugar)
    await rt(pg, "(() => { const q = RQ.bots[0]; q.x = q.ax = CX + U(6); q.y = q.ay = CY - U(.8); q.vx = q.vy = q.mx = q.my = 0; updateCamera(0, true); window.__tr = []; return 1; })()")
    cam = []
    x0, y0 = g['joy']['x'], g['joy']['y']; R = g['joyR'] * .92
    await d.poe(1, x0, y0); await quadros(pg, 1)
    await d.move(1, x0 + R, y0)
    for i in range(150):
        await quadros(pg, 1)
        if i % 10 == 0:
            cam.append(await rt(pg, "[+cam.x.toFixed(4), +cam.y.toFixed(4), +cam.z.toFixed(5)]"))
    # Pare um passo antes do chute: no perfil v92 um toque fora do alcance
    # fica armado, ao contrário da v91. Essa diferença é testada separadamente.
    await d.tira(1); await quadros(pg, 1)
    await rt(pg, """(() => { const t = [LX1, GOL_Y1], dx = t[0] - P.x, dy = t[1] - P.y, l = Math.hypot(dx, dy);
                     B.x = P.x + dx/l*(ALCANCE_CHUTE - U(.5)); B.y = P.y + dy/l*(ALCANCE_CHUTE - U(.5)); B.vx = B.vy = 0; B.w = 0; return 1; })()""")
    c = g['power']
    await d.poe(2, c['x'], c['y']); await quadros(pg, 2); await d.tira(2)
    await d.poe(1, x0, y0); await quadros(pg, 1)
    await d.move(1, x0 + R * math.cos(math.pi / 4), y0 + R * math.sin(math.pi / 4))
    for i in range(170):
        await quadros(pg, 1)
        if i % 10 == 0:
            cam.append(await rt(pg, "[+cam.x.toFixed(4), +cam.y.toFixed(4), +cam.z.toFixed(5)]"))
    await d.tira(1); await quadros(pg, 40)
    tr = await rt(pg, "(() => { const t = window.__tr; window.__tr = null; return t; })()")
    return tr, cam


def resumo_lance(tr, g):
    """o que aconteceu no lance (para conferir que as colisões aconteceram mesmo)"""
    u = g['u']
    toca_bola = any(math.hypot(p[0] - p[4], p[1] - p[5]) < (g['rj'] + g['rb']) * 1.02 for p in tr)
    bot_mexeu = math.hypot(tr[-1][8] - tr[0][8], tr[-1][9] - tr[0][9]) > .05 * u
    quiques = sum(1 for a, b in zip(tr, tr[1:]) if a[6] * b[6] < 0 or a[7] * b[7] < -1e-9)
    return {'passos': len(tr), 'tampinha_na_bola': toca_bola, 'bot_empurrado': bot_mexeu, 'quiques_da_bola': quiques,
            'fim_tampinha': [round(tr[-1][0] / u, 2), round(tr[-1][1] / u, 2)], 'fim_bola': [round(tr[-1][4] / u, 2), round(tr[-1][5] / u, 2)]}


def compara_rastros(a, b):
    if len(a) != len(b):
        return {'igual': False, 'passos': [len(a), len(b)]}
    dif = max((abs(x - y) for p, q in zip(a, b) for x, y in zip(p, q)), default=0)
    primeiro = next((i for i, (p, q) in enumerate(zip(a, b)) if any(abs(x - y) > 1e-9 for x, y in zip(p, q))), None)
    return {'igual': dif <= 1e-9, 'maior_diferenca': dif, 'primeiro_passo_diferente': primeiro, 'passos': len(a)}


async def cena_pausa_ab(pg, d, g):
    """na versão de testes: toca na pausa, espera meio segundo, toca no A ⇄ B duas vezes e no CONTINUAR"""
    p = g['pausa']
    await d.poe(5, p[0], p[1]); await quadros(pg, 1); await d.tira(5); await quadros(pg, 1)
    aberta = await rt(pg, "PAUSA.aberta")
    await quadros(pg, 32)                                       # (a pausa engole o toque dos primeiros 400 ms)
    out = {'pausa_abriu': aberta, 'trocas': []}
    for _ in range(2):
        r = await pg.evaluate("(() => { const b = document.getElementById('pa-v92ab'); if (!b || b.hidden) return null; const q = b.getBoundingClientRect(); return [q.left + q.width/2, q.top + q.height/2, q.width, q.height]; })()")
        if not r:
            out['trocas'].append(None); break
        await d.poe(6, r[0], r[1]); await d.tira(6)
        await pg.wait_for_timeout(80); await quadros(pg, 1)
        out['trocas'].append(await rt(pg, "({slot:V92.slot, perfil:v92Curto(V92.cfg), botao:document.getElementById('pa-v92ab').textContent, render:V92.cfg.render, armado:V92_FIS.BUFFER_TOQUE, motor:V94.motor})"))
        out['alvo_px'] = [round(r[2], 1), round(r[3], 1)]
    r = await pg.evaluate("(() => { const q = document.getElementById('pa-continuar').getBoundingClientRect(); return [q.left + q.width/2, q.top + q.height/2]; })()")
    await d.poe(6, r[0], r[1]); await d.tira(6); await pg.wait_for_timeout(80); await quadros(pg, 3)
    out['continuou'] = not await rt(pg, "PAUSA.aberta")
    return out


# ------------------------------------------------------------------------------------------------ o teste
async def principal(v91_original=None):
    P = Placar('v92 · os controles no celular com toques de verdade (iPhone e Android de mentira)')
    versoes = [('v92', PAGINA), ('v91 (A ⇄ B)', PAGINA)] + ([('v91 original', v91_original)] if v91_original else [])
    res = {}
    async with async_playwright() as pw:
        print('\n1) o HUD em três celulares (o mesmo lugar e o mesmo tamanho da v91)')
        geos = {}
        for cel in CELULARES:
            for nome, pag in versoes:
                if nome == 'v91 (A ⇄ B)':
                    continue
                b, pg, d, erros = await abre_cel(pw, pag, cel)
                try:
                    geos[(cel, nome)] = await rt(pg, GEO)
                finally:
                    await b.close()
        for cel in CELULARES:
            g = geos[(cel, 'v92')]
            dentro = all(g[k]['x'] - g[k]['r'] >= -1 and g[k]['x'] + g[k]['r'] <= g['vw'] + 1 and g[k]['y'] - g[k]['r'] >= -1 and g[k]['y'] + g[k]['r'] <= g['vh'] + 1 for k in ('kick', 'power'))
            longe = math.hypot(g['kick']['x'] - g['power']['x'], g['kick']['y'] - g['power']['y']) > g['kick']['r'] + g['power']['r']
            P.confere(dentro and longe and min(g['kick']['r'], g['power']['r']) * 2 >= 44,
                      '%s (%d × %d): o PASSE (%.0f px) e o CHUTE (%.0f px) inteiros na tela, sem se encostar, maiores que 44 px (o mínimo do iPhone)'
                      % (cel, g['vw'], g['vh'], g['kick']['r'] * 2, g['power']['r'] * 2), g)
            if v91_original:
                o = geos[(cel, 'v91 original')]
                chaves = ('kick', 'power', 'joy', 'pausa', 'joyR', 'adere', 'cv')
                P.confere(all(g[k] == o[k] for k in chaves), '%s: os botões, o analógico e a pausa no mesmo lugar e do mesmo tamanho da v91 original' % cel,
                          {k: (g[k], o[k]) for k in chaves if g[k] != o[k]})

        print('\n2-8) no iPhone de mentira (844 × 390), com o dedo')
        for nome, pag in versoes:
            b, pg, d, erros = await abre_cel(pw, pag, 'iPhone', ios=True, perfil=nome)
            try:
                g = await rt(pg, GEO)
                r = res[nome] = {'geo': g}
                await rt(pg, POE + "(CX, CY, CX + U(8), CY, 0, 0)"); await quadros(pg, 90)
                r['vista'] = await rt(pg, VISTA)
                r['lance'], r['camera'] = await cena_lance(pg, d, g)   # (primeiro: as versões chegam aqui do mesmo jeito)
                r['chutes'] = await cena_chutes(pg, d, g)
                r['armado'] = await cena_armado(pg, d, g)
                r['armado_no_alcance'] = await cena_armado(pg, d, g, ofs=10, dur=40)
                r['analogico'] = await cena_analogico(pg, d, g)
                r['pouco'] = await cena_pouco(pg, d, g)
                r['dois'] = await cena_dois_dedos(pg, d, g)
                x0, y0 = g['joy']['x'], g['joy']['y']
                await d.poe(1, x0, y0); await quadros(pg, 1); await d.move(1, x0 + g['joyR'] * .92, y0)
                r['fluidez'] = {
                    '60 Hz ±1 ms': await rt(pg, FLUIDO + "(1000/60, 1, 170, .02)"),
                    '90 Hz': await rt(pg, FLUIDO + "(1000/90, .3, 250, .5)"),
                    '120 Hz': await rt(pg, FLUIDO + "(1000/120, .3, 330, .5)")}
                await d.tira(1); await quadros(pg, 5)
                r['erros'] = [e for e in erros if 'Failed to load resource' not in e]
            finally:
                await b.close()
            print('   %s: chutes %s · armado %s · pouco %s · dois dedos %s' % (nome, r['chutes'], r['armado'], r['pouco'], r['dois']))

        v92, v91 = res['v92'], res['v91 (A ⇄ B)']
        ori = res.get('v91 original')
        ref = ori or v91
        nome_ref = 'a v91 original' if ori else 'o perfil v91'
        print('\n2) a bola, as tampinhas e a câmera')
        P.confere(v92['vista']['bola_px'] == ref['vista']['bola_px'] and v92['vista']['tampa_px'] == ref['vista']['tampa_px'] and v92['vista']['z'] == ref['vista']['z'],
                  'a bola (%.1f px de raio) e a tampinha (%.1f px) do mesmo tamanho na tela que %s, com o mesmo zoom da câmera'
                  % (v92['vista']['bola_px'], v92['vista']['tampa_px'], nome_ref), [v92['vista'], ref['vista']])
        def dcam(a, b):
            return max([abs(x - y) for p, q in zip(a, b) for x, y in zip(p, q)] + [0 if len(a) == len(b) else 1e9])
        if ori:
            d1 = dcam(v91['camera'], ori['camera'])
            P.confere(d1 < 1e-3, 'o perfil v91 do A ⇄ B: a câmera faz no lance com o dedo o mesmo caminho da v91 original (posição e zoom a cada 10 quadros)', d1)
        d2 = dcam(v92['camera'], ref['camera']); zoom = all(p[2] == q[2] for p, q in zip(v92['camera'], ref['camera']))
        passo = v92['geo']['vel'] / 60
        P.confere(zoom and d2 < passo, 'v92: a mesma câmera (o mesmo zoom em todo o lance), seguindo a tampinha DESENHADA — onde ela está na hora, não no '
                  'último passo: no máximo %.1f px do mundo (%.1f px na tela) da v91, menos que um passo da corrida (%.1f px)'
                  % (d2, d2 * v92['vista']['z'] * v92['geo']['kx'], passo), [v92['camera'][:4], ref['camera'][:4]])
        print('\n3) o PASSE e o CHUTE com o dedo')
        for nome, r in res.items():
            c = r['chutes']
            P.confere(c['kick']['chutou'] and c['power']['chutou'] and c['power']['v'] > c['kick']['v'],
                      '%s: com a bola no alcance, um toque no PASSE passa e um no CHUTE chuta forte (bola a %.0f e %.0f u/s)'
                      % (nome, c['kick']['v'] / r['geo']['u'], c['power']['v'] / r['geo']['u']), c)
        P.confere(all(res[n]['chutes'][k]['v'] == ref['chutes'][k]['v'] for n in res for k in ('kick', 'power')),
                  'a força do PASSE e do CHUTE é a mesma em todas (a mesma física da v91)', {n: res[n]['chutes'] for n in res})
        print('\n4) o toque armado com o dedo')
        P.confere(v92['armado']['chutou'], 'v92: um toque de 40 ms no CHUTE, 60 ms antes de a bola entrar no alcance, chuta', v92['armado'])
        P.confere(not v91['armado']['chutou'] and (not ori or not ori['armado']['chutou']), 'v91: o mesmo toque se perde (%s)' % ('na v91 original e no perfil v91' if ori else 'no perfil v91'),
                  [v91['armado'], ori and ori['armado']])
        P.confere(all(res[n]['armado_no_alcance']['chutou'] for n in res), 'o toque com a bola já no alcance chuta em todas', {n: res[n]['armado_no_alcance'] for n in res})
        print('\n5) o analógico com o dedo')
        for nome, r in res.items():
            a = r['analogico']
            P.confere(all(x['erro'] < .5 and x['segurando'] and abs(x['vel'] - r['geo']['vel'] / r['geo']['u']) < .05 for x in a),
                      '%s: nas 8 direções a tampinha anda para onde o dedo foi (erro máximo %.2f°) na velocidade cheia' % (nome, max(x['erro'] for x in a)), a)
            P.confere(all(x['solto'] and x['depois'] < .25 * x['vel'] for x in a), '%s: soltar o dedo solta o analógico e a tampinha freia' % nome, [(x['ang'], x['depois']) for x in a])
        P.confere(v92['pouco'] > 1 and v91['pouco'] == 0 and (not ori or ori['pouco'] == 0),
                  'o dedo a 17%% do curso: a tampinha anda na v92 (%.1f u/s) e fica parada na v91 (zona morta de 20%%)' % v92['pouco'], [v92['pouco'], v91['pouco'], ori and ori['pouco']])
        print('\n6) dois dedos')
        for nome, r in res.items():
            dd = r['dois']
            P.confere(dd['chutou'] and dd['segue_andando'] and dd['dedos_depois_do_chute'] == 1 and dd['soltou_tudo'],
                      '%s: segurando o analógico, um toque no CHUTE chuta e a tampinha continua andando (%.1f u/s); soltando, tudo solta' % (nome, dd['vx']), dd)
        print('\n7) as colisões no lance com o dedo')
        rs = resumo_lance(v92['lance'], v92['geo'])
        P.confere(rs['tampinha_na_bola'] and rs['bot_empurrado'] and rs['quiques_da_bola'] >= 1,
                  'o lance tem as colisões: a tampinha na bola, o bot empurrado e %d quiques da bola (trave, rede ou parede)' % rs['quiques_da_bola'], rs)
        cmp = compara_rastros(v92['lance'], ref['lance'])
        P.confere(cmp['igual'], 'o lance inteiro (%d passos: tampinha, bola e bot) é igual ao d%s, passo a passo' % (cmp['passos'], nome_ref[1:]), cmp)
        if ori:
            c2 = compara_rastros(v91['lance'], ori['lance'])
            P.confere(c2['igual'], 'e o perfil v91 do A ⇄ B dá o mesmo lance da v91 original', c2)
        print('\n8) a fluidez com o dedo no analógico (nos quadros desenhados: onde a tampinha aparece × a corrida lisa)')
        for hz in ('60 Hz ±1 ms', '90 Hz', '120 Hz'):
            for nome, r in res.items():
                f = r['fluidez'][hz]
                print('   %-12s %-13s quadros com 0 passos: %3d · com 2: %3d · desenhos %3d de %3d (ritmo %s) · tremido da tampinha %.2f px (pior %.2f) · da câmera %.2f px'
                      % (hz, nome, f['zero'], f['dois'], f['desenhos'], f['quadros'], f['ritmo'], f['tampa']['tremido'], f['tampa']['pior'], f['camera']['tremido']))
        f92, f91 = v92['fluidez'], (ori or v91)['fluidez']
        h = '60 Hz ±1 ms'
        P.confere(f92[h]['zero'] == 0 and f92[h]['dois'] == 0 and f92[h]['tampa']['tremido'] < .1 and f92[h]['camera']['tremido'] < .1,
                  '60 Hz com o relógio oscilando: na v92 todo quadro com 1 passo e a tampinha anda lisa (tremido %.2f px; %s: %.2f px, com %d quadros de 0 passos e %d de 2)'
                  % (f92[h]['tampa']['tremido'], nome_ref, f91[h]['tampa']['tremido'], f91[h]['zero'], f91[h]['dois']), [f92[h], f91[h]])
        P.confere(f92['90 Hz']['desenhos'] >= f92['90 Hz']['quadros'] - 2 and f92['90 Hz']['tampa']['tremido'] < .15,
                  '90 Hz: a v92 desenha todo quadro da tela (%d de %d) e a tampinha anda lisa (tremido %.2f px; %s: %d desenhos, %.2f px)'
                  % (f92['90 Hz']['desenhos'], f92['90 Hz']['quadros'], f92['90 Hz']['tampa']['tremido'], nome_ref, f91['90 Hz']['desenhos'], f91['90 Hz']['tampa']['tremido']), [f92['90 Hz'], f91['90 Hz']])
        P.confere(list(f92['120 Hz']['ritmo']) == ['2'] and f92['120 Hz']['tampa']['tremido'] < .1,
                  '120 Hz (com o limite de 60 FPS): a v92 desenha 1 de cada 2 quadros, sempre no mesmo ritmo, e a tampinha anda lisa (tremido %.2f px; %s: %.2f px, ritmo %s)'
                  % (f92['120 Hz']['tampa']['tremido'], nome_ref, f91['120 Hz']['tampa']['tremido'], f91['120 Hz']['ritmo']), [f92['120 Hz'], f91['120 Hz']])
        print('\n9) o iPhone: a vibração no toque armado')
        P.confere(v92['armado']['vibrou_no_toque'] == 1 and v92['armado_no_alcance']['vibrou_no_toque'] == 1,
                  'v92: o toque armado vibra na hora do toque (como o toque com a bola no alcance)', [v92['armado'], v92['armado_no_alcance']])
        P.confere(v91['armado']['vibrou'] == 0 and v91['armado_no_alcance']['vibrou_no_toque'] == 1 and (not ori or (ori['armado']['vibrou'] == 0 and ori['armado_no_alcance']['vibrou_no_toque'] == 1)),
                  'v91: só vibra com a bola já no alcance (o toque adiantado não chuta nem vibra)', [v91['armado'], ori and ori['armado']])
        for nome, r in res.items():
            P.confere(not r['erros'], 'nenhum erro de JavaScript (%s, com os toques)' % nome, r['erros'][:3])

        print('\n9b) no Android de mentira (915 × 412): os botões, o toque armado, o analógico, dois dedos e a vibração')
        for nome, pag in [x for x in versoes if x[0] != 'v91 (A ⇄ B)' or not v91_original]:
            b, pg, d, erros = await abre_cel(pw, pag, 'Android', perfil=nome)
            try:
                g = await rt(pg, GEO)
                ch = await cena_chutes(pg, d, g); ar = await cena_armado(pg, d, g); an = await cena_analogico(pg, d, g); dd = await cena_dois_dedos(pg, d, g)
                er = [e for e in erros if 'Failed to load resource' not in e]
            finally:
                await b.close()
            v92n = nome == 'v92'
            P.confere(ch['kick']['chutou'] and ch['power']['chutou'] and ch['power']['v'] == res['v92']['chutes']['power']['v'] and dd['chutou'] and dd['segue_andando']
                      and all(x['erro'] < .5 and x['solto'] for x in an) and not er,
                      'Android, %s: o PASSE e o CHUTE com o dedo (a mesma força), as 8 direções do analógico e os dois dedos funcionam, sem erro de JavaScript' % nome,
                      {'chutes': ch, 'dois': dd, 'analogico': [x['erro'] for x in an], 'erros': er[:2]})
            P.confere(ar['chutou'] == v92n and ar['vibrou_android'] == (1 if v92n else 0),
                      'Android, %s: o toque 60 ms adiantado %s' % (nome, 'chuta e vibra quando o chute sai' if v92n else 'se perde (sem chute e sem vibração)'), ar)
        print('\n10) a versão de testes no celular: a pausa e o A ⇄ B com o dedo')
        for cel in ('iPhone', 'Android'):
            b, pg, d, erros = await abre_cel(pw, PAGINA, cel, config={'experimental': True}, ios=cel == 'iPhone')
            try:
                g = await rt(pg, GEO)
                ab = await cena_pausa_ab(pg, d, g)
                t = ab['trocas']
                # (v110: desde a v94 as memórias são B = o Padrão v92 com o motor de antes e A = o motor próprio — era v91 e v92)
                P.confere(ab['pausa_abriu'] and len(t) == 2 and t[0] and t[0]['slot'] == 'B' and t[0]['perfil'] == 'v92' and t[0]['motor'] == 'v93'
                          and t[1] and t[1]['slot'] == 'A' and t[1]['perfil'] == 'v94' and t[1]['motor'] == 'v94'
                          and t[0]['render'] == t[1]['render'] == 'prever' and t[0]['armado'] == t[1]['armado'] == 6 and ab['continuou'],
                          '%s: o toque na pausa abre; o toque no A ⇄ B troca para o motor de antes (B) e de volta para o próprio (A: "%s"); o CONTINUAR volta ao jogo'
                          % (cel, t[1]['botao'] if len(t) == 2 and t[1] else '?'), ab)
                P.confere(not [e for e in erros if 'Failed to load resource' not in e], 'nenhum erro de JavaScript (%s, versão de testes)' % cel, erros[:3])
            finally:
                await b.close()
    return P.fim()


if __name__ == '__main__':
    sys.exit(asyncio.run(principal(sys.argv[1] if len(sys.argv) > 1 else None)))
