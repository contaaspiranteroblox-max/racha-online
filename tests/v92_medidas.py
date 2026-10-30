"""RACHA v92 · AS MEDIDAS da mecânica (antes × depois). Não é teste de passa/falha: mede e grava num JSON.

Roda na página de teste de qualquer versão (RACHA_TESTE=<racha_teste.html>), então dá para medir a v91 original e a v92
com o MESMO instrumento:
  python3 tests/v92_medidas.py offline [saida.json]     — cadência e tremida da tela no treino contra bots (sem rede)
  python3 tests/v92_medidas.py chute   [saida.json]     — a janela do toque: quantos ms antes/depois da bola chegar o toque vale

offline: o navegador de teste não tem tela de verdade, então o relógio dos quadros é de MENTIRA e controlado aqui
(requestAnimationFrame e performance.now trocados antes do jogo abrir): 60, 59,94, 90, 120, 144 e 30 Hz, com o relógio
oscilando em volta do quadro da tela (como no celular: o erro de cada quadro não acumula) e, como pior caso, à deriva
(cada intervalo sorteado: o erro acumula). Cada cenário roda em 5 fases do relógio da física (onde o resto do relógio cai
em relação ao passo: na v91 o resultado depende disso) e a tabela dá a média. Em cada quadro grava onde a tampinha, a
bola e a câmera foram DESENHADAS (VIS e cam) e quantos passos da física rodaram. Mede:
  · passos por quadro (a % de quadros com 0 e com 2 passos — "trancos" de cadência);
  · a tremida: o quanto o andar desenhado foge do andar ideal (velocidade constante) nos instantes em que a tela mostra
    cada quadro, em px do mundo e em % do passo;
  · a tremida NA TELA: a tampinha em relação à câmera (é o que o olho vê quando a câmera segue o jogador);
  · o atraso de resposta: do quadro em que o analógico muda até a tampinha desenhada começar a andar.
chute: a bola rolando até a tampinha parada e um toque no PASSE (apertar e soltar: 40 ms e 90 ms) em vários instantes
antes/depois de a bola entrar no alcance; conta quais toques viraram chute.
"""
import asyncio, json, math, os, sys, statistics as st
from comum import abre, rt, async_playwright

RELOGIO = r"""(() => {          // o relógio de mentira dos quadros (antes do jogo abrir)
  const fila = []; const rafReal = window.requestAnimationFrame.bind(window), nowReal = performance.now.bind(performance);
  const Q = window.__quadro = {ativo:false, t:0, fila, n:0};
  window.requestAnimationFrame = cb => { if (!Q.ativo) return rafReal(cb); fila.push(cb); return ++Q.n; };
  performance.now = () => Q.ativo ? Q.t : nowReal();
  Q.liga = () => { Q.t = nowReal(); Q.ativo = true; };
  Q.passo = ms => { Q.t += ms; const cbs = fila.splice(0); for (const cb of cbs) { try { cb(Q.t); } catch (e) { console.error('quadro', e && e.message); } } };
})();"""

PREPARA = r"""(() => {           // um 1v1 contra um bot parado, no Estádio (o mapa das salas), câmera seguindo o jogador
  try { if (fimAberto()) fechaFim(); } catch (_) {}
  x49Start(1, 0);
  try { rqVsFecha(); } catch (_) {}
  rqBots = function(){};                                 // o bot não decide nada (fica parado)
  RQ.estado = 'jogo';
  for (const q of RQ.bots){ q.x = q.ax = LX1 - 80; q.y = q.ay = LY0 + 80; q.vx = q.vy = q.mx = q.my = 0; }
  P.x = CX - U(20); P.y = CY + U(8); P.vx = P.vy = 0; B.x = CX + U(25); B.y = CY - U(12); B.vx = B.vy = 0; guardaAnterior();
  cam.mode = 'seguir';
  window.__np = 0; window.__nr = 0;
  if (!window.__psEmb){ const ps = physicsStep; physicsStep = function(){ window.__np++; return ps.apply(this, arguments); };
    const rd = render; render = function(){ window.__nr++; return rd.apply(this, arguments); };
    const dk = doKick; doKick = function(){ const ok = dk.apply(this, arguments); if (ok) window.__nk = (window.__nk | 0) + 1; return ok; }; window.__psEmb = 1; }
  return {VEL_JOG, STEP, R:JOY.max*hud.joy.al, modoRender:typeof V92 !== 'undefined' ? V92.cfg.render : 'v91'};
})()"""

# um cenário de cadência: n quadros com o intervalo dado (ms) e o relógio oscilando (sd, ms); a tampinha correndo para a
# direita (o analógico no máximo) e, ao mesmo tempo, a bola rolando sozinha para a esquerda.
# modelo 'vsync' (o de um aparelho de verdade): cada quadro cai perto do seu lugar na grade da tela, o erro não acumula;
# 'deriva': cada intervalo sorteado, o erro acumula (o pior caso). fase: o resto do relógio da física quando começa (em
# passos) — na v91 o resultado depende de onde ele cai, então cada cenário roda em 5 fases e a tabela dá a média.
CADENCIA = r"""((iv, sd, n, semente, modelo, fase) => {
  let s = semente >>> 0; const rnd = () => { s = (s*1664525 + 1013904223) >>> 0; return s/4294967296; };
  const gauss = () => { let u = 0, v = 0; while (!u) u = rnd(); v = rnd(); return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v); };
  const Q = window.__quadro;
  const R = JOY.max*hud.joy.al;
  P.x = GL + U(3); P.y = CY + U(10); P.vx = P.vy = 0; B.x = LX1 - U(4); B.y = CY - U(14); B.vx = -U(30); B.vy = 0; B.w = 0; guardaAnterior();
  joy.id = 77; joy.dx = R; joy.dy = 0;
  for (let i = 0; i < Math.round(250/iv); i++) Q.passo(iv);   // embala por 0,25 s (velocidade máxima, câmera acompanhando)
  if (fase != null) acc = STEP*fase;
  const out = [];
  const t0 = Q.t;
  for (let i = 0; i < n; i++){
    const alvo = modelo === 'deriva' ? Q.t + Math.max(1, iv + sd*gauss()) : Math.max(Q.t + .1, t0 + (i + 1)*iv + sd*gauss());
    const np0 = window.__np, nr0 = window.__nr;
    Q.passo(alvo - Q.t);
    // [12] o instante em que a tela MOSTRA o quadro: no 'vsync', o lugar dele na grade da tela (o relógio que o jogo lê
    // oscila, a tela não); na 'deriva', o próprio relógio
    out.push([Q.t, VIS.px, VIS.py, VIS.bx, VIS.by, cam.x, cam.y, cam.z, window.__np - np0, P.x, B.x, window.__nr - nr0,
              modelo === 'deriva' ? Q.t : t0 + (i + 1)*iv]);
  }
  joy.id = null; joy.dx = joy.dy = 0;
  return out;
})"""
FASES = (.02, .2, .4, .6, .8)

# o atraso de resposta: parado; num quadro o analógico vai para a direita; conta o tempo até a tampinha DESENHADA andar
RESPOSTA = r"""((iv, sd, rep, semente) => {
  let s = semente >>> 0; const rnd = () => { s = (s*1664525 + 1013904223) >>> 0; return s/4294967296; };
  const Q = window.__quadro, R = JOY.max*hud.joy.al, res = [];
  for (let k = 0; k < rep; k++){
    P.x = CX - U(10); P.y = CY + U(10); P.vx = P.vy = 0; B.x = LX1 - U(6); B.y = LY0 + U(6); B.vx = B.vy = 0; guardaAnterior();
    joy.id = null; joy.dx = joy.dy = 0;
    for (let i = 0; i < 12; i++) Q.passo(iv + (rnd() - .5)*2*sd);
    // o dedo encosta num instante qualquer ENTRE dois quadros da tela: o relógio não para ali (nenhum quadro extra é
    // desenhado nesse instante; o próximo quadro vem no ritmo da tela) e o tempo conta a partir do toque
    const x0 = VIS.px, t0 = Q.t + rnd()*iv;
    joy.id = 77; joy.dx = R; joy.dy = 0;
    let t = null;
    for (let i = 0; i < 20 && t === null; i++){ Q.passo(iv + (rnd() - .5)*2*sd); if (VIS.px - x0 > .5) t = Q.t - t0; }
    res.push(t);
  }
  joy.id = null; joy.dx = joy.dy = 0;
  return res;
})"""

# a janela do toque: a bola vem rolando de frente; o toque (keydown + keyup do Espaço, o mesmo caminho do botão da tela:
# BOTAO.kickL e o "segurando") começa em `ofs` ms em relação ao instante em que a bola entra no alcance
TOQUE = r"""((ofs, dur, iv, vbola) => {
  const Q = window.__quadro;
  RQ.estado = 'jogo';
  P.x = CX; P.y = CY + U(4); P.vx = P.vy = 0; resetBotoes();
  B.x = P.x + ALCANCE_CHUTE + U(5); B.y = P.y; B.vx = -vbola; B.vy = 0; B.w = 0; guardaAnterior();   // (a bola começa 5 u antes do alcance)
  const nk0 = window.__nk | 0;
  // quando a bola entra no alcance: simula o caminho dela (o freio de cada passo) com a mesma conta da física
  let x = B.x, vx = B.vx, n = 0;
  while (x - P.x > ALCANCE_CHUTE && n < 600){ vx *= CAMPO.fatorBola; x += vx*STEP; n++; }
  const tChega = Q.t + n*STEP*1000;                      // (com um passo por quadro a 60 Hz: o passo n acontece no quadro n)
  let apertou = false, soltou = false, chutou = null;
  const tAperta = tChega + ofs, tSolta = tAperta + dur;
  for (let i = 0; i < n + 40; i++){
    // os eventos acontecem ENTRE os quadros, no instante certo (antes do quadro que vem depois deles)
    const prox = Q.t + iv;
    if (!apertou && tAperta <= prox){ keys.Space = true; BOTAO.kickL = true; apertou = true; }
    if (apertou && !soltou && tSolta <= prox){ keys.Space = false; soltou = true; }
    Q.passo(iv);
    if ((window.__nk | 0) !== nk0 && chutou === null) chutou = Q.t - tChega;   // (doKick devolveu true: o chute saiu)
  }
  keys.Space = false; resetBotoes();
  return {chutou, n};
})"""


def resumo_cadencia(d, vel):
    n_tela = len(d)
    dur_s = ((d[-1][12] - d[0][12]) if len(d[0]) > 12 else (d[-1][0] - d[0][0])) / 1000
    desenhos = [r for r in d if r[11] > 0]             # só os quadros que a tela desenhou de novo (os outros repetem a imagem)
    tm = lambda r: r[12] if len(r) > 12 else r[0]      # (o instante em que a tela mostra o quadro)
    iv = [tm(desenhos[i]) - tm(desenhos[i - 1]) for i in range(1, len(desenhos))]
    irreg = 100 * st.pstdev(iv) / st.mean(iv) if len(iv) > 2 else 0
    np_todos = [r[8] for r in d]
    d = desenhos
    t = [tm(r) for r in d]; px = [r[1] for r in d]; cx = [r[5] for r in d]; z = [r[7] for r in d]; bx = [r[3] for r in d]
    np_ = np_todos
    n = len(np_)
    dist = {k: sum(1 for v in np_ if v == k) * 100 / n for k in (0, 1, 2)}
    dist['3+'] = sum(1 for v in np_ if v >= 3) * 100 / n
    # tremida do jogador (mundo): desvio do andar desenhado em relação ao andar ideal (vel × tempo do quadro)
    err = []
    for i in range(1, len(px)):
        dt = (t[i] - t[i - 1]) / 1000
        err.append((px[i] - px[i - 1]) - vel * dt)
    passo_px = vel / 60
    rms = math.sqrt(sum(e * e for e in err) / len(err))
    parados = sum(1 for i in range(1, len(px)) if abs(px[i] - px[i - 1]) < 0.01) * 100 / (len(px) - 1)
    # na tela: a tampinha em relação à câmera (× zoom): a segunda diferença (o "tranco" de um quadro para o outro)
    tela = [(px[i] - cx[i]) * z[i] for i in range(len(px))]
    d2 = [tela[i + 1] - 2 * tela[i] + tela[i - 1] for i in range(1, len(px) - 1)]
    rms_tela = math.sqrt(sum(e * e for e in d2) / len(d2))
    # a bola rolando sozinha: o andar desenhado contra o ideal (a bola freia devagar: a 2ª diferença mede o tranco)
    d2b = [bx[i + 1] - 2 * bx[i] + bx[i - 1] for i in range(1, len(bx) - 1)]
    # (só enquanto a bola anda livre: sem batida — o primeiro 1 s)
    dur = (t[-1] - t[0]) / 1000
    d2b = d2b[:max(10, int(len(d2b) * 1.0 / max(dur, 1e-6)))]
    rms_bola = math.sqrt(sum(e * e for e in d2b) / len(d2b)) if d2b else 0
    return {'desenhos_por_s': round(len(desenhos) / dur_s, 1), 'ritmo_irregular_%': round(irreg, 1),
            'passos_por_quadro_%': {k: round(v, 1) for k, v in dist.items()},
            'tremida_jogador_px': round(rms, 2), 'tremida_jogador_%_do_passo': round(100 * rms / passo_px, 1),
            'quadros_parados_%': round(parados, 1), 'tranco_na_tela_px': round(rms_tela, 2), 'tranco_bola_px': round(rms_bola, 2)}


def media_resumos(rs):
    """a média dos resumos das fases (e o pior caso da tremida e do tranco na tela)"""
    out = {}
    for k, v in rs[0].items():
        if isinstance(v, dict):
            out[k] = {kk: round(st.mean(r[k][kk] for r in rs), 1) for kk in v}
        else:
            out[k] = round(st.mean(r[k] for r in rs), 2)
    out['tranco_na_tela_pior_fase_px'] = max(r['tranco_na_tela_px'] for r in rs)
    out['quadros_parados_pior_fase_%'] = max(r['quadros_parados_%'] for r in rs)
    return out


async def offline(saida):
    res = {}
    async with async_playwright() as pw:
        b, pg, erros = await abre(pw, 1280, 720)
        try:
            await pg.add_init_script(RELOGIO)
            await pg.reload()
            await pg.wait_for_function('() => typeof window.__RT === "function"', polling=100, timeout=20000)
            await pg.wait_for_timeout(600)
            await pg.evaluate("(() => { const o = document.getElementById('onb'); if (o) o.hidden = true; })()")
            await pg.evaluate("(() => { const b = [...document.querySelectorAll('#v84auth button')].find(x => /TREINAR OFFLINE/.test(x.textContent || '')); if (b) b.click(); })()")
            await pg.wait_for_timeout(200)
            info = await rt(pg, PREPARA)
            await pg.evaluate("window.__quadro.liga()")
            vel = info['VEL_JOG']
            res['versao'] = info.get('modoRender')
            cenarios = [('60 Hz', 1000 / 60, 0.0, 'vsync'), ('60 Hz oscilando (±1 ms)', 1000 / 60, 1.0, 'vsync'), ('59,94 Hz', 1000 / 59.94, 0.3, 'vsync'),
                        ('90 Hz', 1000 / 90, 0.3, 'vsync'), ('120 Hz', 1000 / 120, 0.3, 'vsync'), ('144 Hz', 1000 / 144, 0.3, 'vsync'),
                        ('30 Hz (celular fraco)', 1000 / 30, 1.5, 'vsync'), ('60 Hz à deriva (±1 ms acumulando: o pior caso)', 1000 / 60, 1.0, 'deriva')]
            res['cadencia'] = {}
            res['cadencia_por_fase'] = {}
            for nome, iv, sd, modelo in cenarios:
                rs = []
                for fase in FASES:                                   # 2 s de corrida em cada fase (a tampinha não chega no muro)
                    d = await rt(pg, CADENCIA + "(%r, %r, %d, %d, %s, %r)" % (iv, sd, int(round(2000 / iv)), 12345, json.dumps(modelo), fase))
                    rs.append(resumo_cadencia(d, vel))
                res['cadencia_por_fase'][nome] = rs
                res['cadencia'][nome] = media_resumos(rs)
                print('  %-26s %s' % (nome, json.dumps(res['cadencia'][nome], ensure_ascii=False)))
            res['resposta_ms'] = {}
            for nome, iv, sd in [('60 Hz', 1000 / 60, 0.3), ('120 Hz', 1000 / 120, 0.3), ('30 Hz', 1000 / 30, 1.0)]:
                r = await rt(pg, RESPOSTA + "(%r, %r, %d, %d)" % (iv, sd, 40, 777))
                ok = [x for x in r if x is not None]
                res['resposta_ms'][nome] = {'media': round(st.mean(ok), 1), 'max': round(max(ok), 1), 'n': len(ok)}
                print('  resposta %-8s %s' % (nome, res['resposta_ms'][nome]))
            res['erros_js'] = [e for e in erros if 'Failed to load resource' not in e][:5]
        finally:
            await b.close()
    return res


async def chute(saida):
    res = {}
    async with async_playwright() as pw:
        b, pg, erros = await abre(pw, 1280, 720)
        try:
            await pg.add_init_script(RELOGIO)
            await pg.reload()
            await pg.wait_for_function('() => typeof window.__RT === "function"', polling=100, timeout=20000)
            await pg.wait_for_timeout(600)
            await pg.evaluate("(() => { const o = document.getElementById('onb'); if (o) o.hidden = true; })()")
            await pg.evaluate("(() => { const b = [...document.querySelectorAll('#v84auth button')].find(x => /TREINAR OFFLINE/.test(x.textContent || '')); if (b) b.click(); })()")
            await pg.wait_for_timeout(200)
            await rt(pg, PREPARA)
            await pg.evaluate("window.__quadro.liga()")
            U = await rt(pg, "U(1)")
            for dur in (40, 90):
                for vb_u in (6, 15):
                    linha = {}
                    for ofs in range(-200, 61, 10):
                        r = await rt(pg, TOQUE + "(%d, %d, %r, %r)" % (ofs, dur, 1000 / 60, vb_u * U))
                        linha[ofs] = r['chutou'] is not None
                    vale = [o for o, v in linha.items() if v]
                    jan = (min(vale), max(vale)) if vale else None
                    chave = 'toque de %d ms, bola a %d u/s' % (dur, vb_u)
                    res[chave] = {'janela_ms': jan, 'largura_ms': (jan[1] - jan[0] + 10) if jan else 0,
                                  'valeu': ''.join('X' if linha[o] else '.' for o in sorted(linha))}
                    print('  %-30s janela %s ms (%s ms de largura)   %s' % (chave, jan, res[chave]['largura_ms'], res[chave]['valeu']))
            res['legenda'] = 'cada caractere: um toque começando de -200 a +60 ms (de 10 em 10) em relação à bola entrar no alcance; X = virou chute'
            res['erros_js'] = [e for e in erros if 'Failed to load resource' not in e][:5]
        finally:
            await b.close()
    return res


async def principal():
    modo = sys.argv[1] if len(sys.argv) > 1 else 'offline'
    saida = sys.argv[2] if len(sys.argv) > 2 else None
    print('RACHA v92 · medidas:', modo, '·', os.environ.get('RACHA_TESTE', '(a página de teste deste build)'))
    r = await (offline(saida) if modo == 'offline' else chute(saida))
    if saida:
        with open(saida, 'w', encoding='utf-8') as f:
            json.dump(r, f, ensure_ascii=False, indent=1)
        print('gravado em', saida)
    return 0

if __name__ == '__main__':
    sys.exit(asyncio.run(principal()))
