"""RACHA v92 · a mecânica mais lisa, precisa e responsiva — e o painel da versão de testes. Confere:

OFFLINE (o relógio dos quadros de mentira, como no v92_medidas):
  1. a versão oficial não tem o painel (sem experimental no config.js) e usa o padrão da v92;
  2. a física padrão é a da v91: os mesmos números e o MESMO lance de 900 passos tique a tique (tests/v92/ref_v91_trajeto.json,
     gravado na v91 original com tests/v92/trajeto.js);
  3. a cadência: em 60 Hz com o relógio oscilando em volta do quadro da tela, todo quadro com 1 passo (com o perfil v91,
     alguns com 0 e com 2); em 90 Hz, um desenho por quadro da tela (com o perfil v91, 60/s); 1 minuto numa tela de
     59,94 Hz e o relógio à deriva: o jogo acompanha o relógio sem salto de passos nem intervalo negativo; telas 1% mais
     rápida e mais lenta: a tampinha desenhada anda lisa quando um quadro fica com 0 ou 2 passos;
  4. o desenho 'prever' fica entre o último passo e o próximo; o 'suave', entre o anterior e o último;
  5. o toque armado: um toque de 40 ms, 60 ms antes de a bola chegar, vira chute (com o perfil v91, não);
  6. o analógico: anda com o dedo a 17% do curso (v91: só a partir de 20%);
  1b. num celular que já usou a versão de testes, a versão oficial ignora o ajuste guardado (o padrão da v92 vale), e não
     tem a aba TESTES v92, o medidor, o A ⇄ B da pausa nem o F2;
VERSÃO DE TESTES (experimental: true):
  7. o painel mora nos AJUSTES (a primeira aba), com as 7 partes, e cabe no celular deitado; as memórias já vêm prontas
     (A = Padrão v92, B = v91) e o A ⇄ B da pausa troca as duas com um toque;
  8. mexer na física pelo painel muda o jogo na hora (velocidade, tamanho da bola e da tampinha, o aro acompanha o alcance),
     o Restaurar v91 volta tudo, as memórias A e B trocam, exportar → importar devolve o mesmo;
  9. nenhum erro de JavaScript.
Uso: python3 tests/v92_test.py   (o online da v92 fica no tests/v92_online_test.py)"""
import asyncio, json, pathlib
from comum import Placar, abre, rt, async_playwright, RAIZ

RELOGIO = (RAIZ / 'tests' / 'v92_medidas.py').read_text(encoding='utf-8').split('RELOGIO = r"""', 1)[1].split('"""', 1)[0]
TRAJETO = (RAIZ / 'tests' / 'v92' / 'trajeto.js').read_text(encoding='utf-8')
REF = json.loads((RAIZ / 'tests' / 'v92' / 'ref_v91_trajeto.json').read_text(encoding='utf-8'))

PREPARA = r"""(() => {
  try { if (fimAberto()) fechaFim(); } catch (_) {}
  x49Start(1, 0); try { rqVsFecha(); } catch (_) {}
  rqBots = function(){}; RQ.estado = 'jogo'; RQ.autoH = false;
  ARB_PARADO = function(){ return false; };             // (o lance roteirizado de antes parou o quadro do jogo: volta a andar)
  for (const q of RQ.bots){ q.x = q.ax = LX1 - 80; q.y = q.ay = LY0 + 80; q.vx = q.vy = q.mx = q.my = 0; }
  window.__np = 0; window.__nr = 0; window.__nk = 0;
  const ps = physicsStep; physicsStep = function(){ window.__np++; return ps.apply(this, arguments); };
  const rd = render; render = function(){ window.__nr++; return rd.apply(this, arguments); };
  const dk = doKick; doKick = function(){ const ok = dk.apply(this, arguments); if (ok) window.__nk++; return ok; };
  return 1;
})()"""

# n quadros da tela de iv ms com o relógio oscilando sd ms. modelo 'vsync' (o de um aparelho de verdade): cada quadro cai
# perto do seu lugar na grade da tela (o erro não acumula); 'deriva': cada intervalo sorteado (o erro acumula — o pior caso).
# fase: o resto do relógio da física no começo (0,02 = a fase mais difícil, perto da divisa entre dois passos).
# Devolve os quadros com 0, 2 e 3+ passos, os intervalos negativos, os desenhos, os passos e o tempo de verdade, e o andar
# da tampinha DESENHADA quadro a quadro (correndo para a direita: nunca volta; 'inc' = os avanços longe do muro).
CADENCIA = r"""((iv, sd, n, modelo, fase) => {
  let s = 99; const rnd = () => { s = (s*1664525 + 1013904223) >>> 0; return s/4294967296; };
  const gauss = () => { let u = 0; while (!u) u = rnd(); return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*rnd()); };
  const Q = window.__quadro, R = JOY.max*hud.joy.al;
  P.x = GL + U(3); P.y = CY + U(10); P.vx = P.vy = 0; guardaAnterior();
  joy.id = 77; joy.dx = R; joy.dy = 0;
  for (let i = 0; i < 12; i++) Q.passo(iv*1.6);        // (um começo engasgado, como o de um aparelho ocupado: o ritmo medido tem de se acertar)
  for (let i = 0; i < 20; i++) Q.passo(iv);
  acc = STEP*(fase == null ? .02 : fase);
  let zero = 0, dois = 0, tres = 0, neg = 0, volta = 0, l0 = last, x0 = VIS.px, pula = 4;
  const np0 = window.__np, nr0 = window.__nr, t0 = Q.t, inc = [];
  for (let i = 0; i < n; i++){
    const a = window.__np;
    const alvo = modelo === 'deriva' ? Q.t + Math.max(1, iv + gauss()*sd) : Math.max(Q.t + .1, t0 + (i + 1)*iv + gauss()*sd);
    Q.passo(alvo - Q.t);
    const k = window.__np - a;
    if (k === 0) zero++; else if (k === 2) dois++; else if (k >= 3) tres++;
    if (last < l0 - 1e-9) neg++; l0 = last;
    if (pula > 0) pula--;
    else { if (VIS.px < x0 - 1e-6) volta++; inc.push(VIS.px - x0); }
    x0 = VIS.px;
    if (P.x > GR - U(10)){ P.x = GL + U(3); guardaAnterior(); pula = 2; }   // (perto do muro: volta para o começo, correndo igual; os 2 quadros seguintes não contam)
  }
  const m = inc.length ? inc.reduce((p, q) => p + q, 0)/inc.length : 0;
  const r = {zero, dois, tres, neg, volta, desenhos:window.__nr - nr0, passos:window.__np - np0, real:+(Q.t - t0).toFixed(1),
             incMin:inc.length ? +(Math.min(...inc)/m).toFixed(3) : null, incMax:inc.length ? +(Math.max(...inc)/m).toFixed(3) : null};
  joy.id = null; joy.dx = joy.dy = 0;
  return r;
})"""

TOQUE = r"""((ofs, dur) => {               // a bola vem; um toque de dur ms começando ofs ms antes/depois de ela entrar no alcance
  const Q = window.__quadro, iv = 1000/60;
  RQ.estado = 'jogo'; P.x = CX; P.y = CY + U(4); P.vx = P.vy = 0; resetBotoes();
  B.x = P.x + ALCANCE_CHUTE + U(5); B.y = P.y; B.vx = -U(12); B.vy = 0; B.w = 0; guardaAnterior();
  let x = B.x, vx = B.vx, n = 0;
  while (x - P.x > ALCANCE_CHUTE && n < 600){ vx *= CAMPO.fatorBola; x += vx*STEP; n++; }
  const tChega = Q.t + n*STEP*1000, tA = tChega + ofs, tS = tA + dur, nk0 = window.__nk;
  let ap = false, so = false;
  for (let i = 0; i < n + 30; i++){
    const prox = Q.t + iv;
    if (!ap && tA <= prox){ keys.Space = true; BOTAO.kickL = true; ap = true; }
    if (ap && !so && tS <= prox){ keys.Space = false; so = true; }
    Q.passo(iv);
  }
  keys.Space = false; resetBotoes();
  return window.__nk !== nk0;
})"""


async def abre_relogio(pw, **kw):
    b, pg, erros = await abre(pw, **kw)
    await pg.add_init_script(RELOGIO)
    await pg.reload()
    await pg.wait_for_function('() => typeof window.__RT === "function"', polling=100, timeout=20000)
    await pg.wait_for_timeout(500)
    await pg.evaluate("(() => { const o = document.getElementById('onb'); if (o) o.hidden = true; })()")
    await pg.evaluate("(() => { const b = [...document.querySelectorAll('#v84auth button')].find(x => /TREINAR OFFLINE/.test(x.textContent || '')); if (b) b.click(); })()")
    await pg.wait_for_timeout(150)
    from comum import HARNESS
    await rt(pg, HARNESS)
    return b, pg, erros


async def principal():
    P = Placar('v92 · a mecânica (cadência, desenho, toque armado, analógico) e o painel da versão de testes')
    async with async_playwright() as pw:
        # ------------------------------------------------------------------ a versão oficial
        print('\n1) a versão oficial (sem experimental no config.js)')
        b, pg, erros = await abre_relogio(pw, w=1280, h=720, config={'experimental': False})
        try:
            o = await rt(pg, "({exp:V92.exp, aba:!!(AJX.secs && AJX.secs.v92), tab:!!document.getElementById('ajx-t-v92'), padrao:JSON.stringify(V92.cfg) === JSON.stringify(v92Limpa(V92_PADRAO)), render:V92.cfg.render})")
            P.confere(not o['exp'] and not o['aba'] and not o['tab'], 'sem experimental: o painel de testes não existe (nem a aba nos AJUSTES)', o)
            P.confere(o['padrao'] and o['render'] == 'prever', 'o jogo usa o padrão da v92 (desenho "prever", cadência, toque armado, previsão online)', o)
            print('\n2) a física padrão é a da v91')
            n = await rt(pg, "({vel:VEL_JOG/U(1), passe:FORCA_KICK, chute:FORCA_POWER, rj:R_JOG/U(1), rb:R_BOLA/U(1), teto:LIMITE_VEL_BOLA/U(1), fator:FATOR_BOLA, alc:ALCANCE_CHUTE/U(1), mb:MASSA_BOLA, mj:MASSA_JOG, qp:Q_PAREDE, qt:Q_TRAVE, qr:Q_REDE, qjj:V92_QJJ, qjp:V92_QJP, dirs:V92_DIRECOES, cool:COOLDOWN_BOTAO})")
            esperado = {'vel': 14.1, 'passe': 212.5, 'chute': 360, 'rj': 2, 'rb': 1, 'teto': 46.75, 'fator': .99, 'alc': 3.5, 'mb': 10, 'mj': 1.25, 'qp': .65, 'qt': .6, 'qr': .15, 'qjj': .3, 'qjp': .65, 'dirs': 32, 'cool': .02}
            P.confere(all(abs(n[k] - v) < 1e-9 for k, v in esperado.items()), 'os números da física do aparelho são os da v91 com o CHUTE da v103 (velocidade 14,1 u/s, PASSE 212,5, CHUTE 360, bola 46,75 u/s, 0,99…)', n)
            # (v103: o CHUTE padrão ficou 6% mais forte — o lance roda com o CHUTE de antes, 340: o que se confere aqui é a física
            #  tique a tique, igual à v91 com os mesmos números)
            tr = await rt(pg, "(() => { const fp = FORCA_POWER; FORCA_POWER = 340; try { return eval(%s); } finally { FORCA_POWER = fp; } })()" % json.dumps(TRAJETO))
            dif = next((i for i, (a, c) in enumerate(zip(tr, REF)) if a != c), None)
            P.confere(len(tr) == len(REF) and dif is None, 'o mesmo lance de 900 passos (2v2, bots, chutes, gols) dá exatamente as mesmas posições da v91 original (com o CHUTE de antes)', {'dif': dif, 'n': len(tr)})
            await rt(pg, PREPARA)
            await pg.evaluate("window.__quadro.liga()")
            print('\n3) a cadência e o limite de FPS')
            c92 = await rt(pg, CADENCIA + "(1000/60, 1, 240, 'vsync', .02)")
            c92_90 = await rt(pg, CADENCIA + "(1000/90, .3, 270, 'vsync', .5)")
            c92_5994 = await rt(pg, CADENCIA + "(1000/59.94, .5, 3600, 'vsync', .5)")     # 1 minuto numa tela de 59,94 Hz
            c92_rap = await rt(pg, CADENCIA + "(1000/60.6, .5, 300, 'vsync', .3)")       # uma tela 1% mais rápida que 60 Hz
            c92_len = await rt(pg, CADENCIA + "(1000/59.4, .5, 300, 'vsync', .7)")       # e uma 1% mais lenta
            c92_der = await rt(pg, CADENCIA + "(1000/60, 1, 600, 'deriva', .5)")         # o relógio à deriva (o pior caso)
            await rt(pg, "(() => { V92.cfg = v92Limpa(V92_V91); v92Aplica(); return 1; })()")
            c91 = await rt(pg, CADENCIA + "(1000/60, 1, 240, 'vsync', .02)")
            c91_90 = await rt(pg, CADENCIA + "(1000/90, .3, 270, 'vsync', .5)")
            await rt(pg, "(() => { V92.cfg = v92Limpa(V92_PADRAO); v92Aplica(); return 1; })()")
            S = 1000 / 60
            P.confere(c92['zero'] == 0 and c92['dois'] == 0 and c92['tres'] == 0,
                      '60 Hz com o relógio oscilando ±1 ms em volta do quadro, na fase mais difícil: todo quadro com 1 passo (0 sem, 0 com 2, de 240)', c92)
            P.confere(c91['zero'] >= 3, 'com o perfil v91 o mesmo relógio deixa quadros sem passo (%d de 240) e com 2 (%d): a chave funciona' % (c91['zero'], c91['dois']), c91)
            P.confere(c92_90['desenhos'] >= 260, 'tela de 90 Hz: um desenho por quadro da tela (%d de 270)' % c92_90['desenhos'], c92_90)
            P.confere(c91_90['desenhos'] <= 190, 'com o perfil v91 a tela de 90 Hz desenha 2 de cada 3 (%d de 270)' % c91_90['desenhos'], c91_90)
            atraso = abs(c92_5994['passos'] * S - c92_5994['real'])
            P.confere(c92_5994['tres'] == 0 and c92_5994['neg'] == 0 and c92_5994['dois'] <= 6 and atraso <= 6 + S + 1,
                      '1 minuto numa tela de 59,94 Hz: o jogo acompanha o relógio (%.1f ms de diferença) com %d quadros de 2 passos, nenhum de 3 e nenhum intervalo negativo' % (atraso, c92_5994['dois']), c92_5994)
            lisa = lambda c: c['neg'] == 0 and c['volta'] == 0 and c['incMin'] >= .9 and c['incMax'] <= 1.1
            P.confere(c92_rap['zero'] >= 1 and lisa(c92_rap) and c92_len['dois'] >= 1 and lisa(c92_len),
                      'telas 1%% mais rápida e mais lenta que 60 Hz: quando um quadro fica com 0 ou 2 passos, a tampinha desenhada anda lisa (avanço por quadro entre %.2f e %.2f da média; nunca volta)'
                      % (min(c92_rap['incMin'], c92_len['incMin']), max(c92_rap['incMax'], c92_len['incMax'])), [c92_rap, c92_len])
            atraso = abs(c92_der['passos'] * S - c92_der['real'])
            P.confere(c92_der['neg'] == 0 and c92_der['tres'] == 0 and atraso <= 6 + S + 1,
                      'o relógio à deriva (cada intervalo ±1 ms, o erro acumulando): o jogo acompanha (%.1f ms de diferença), sem intervalo negativo nem quadro de 3 passos' % atraso, c92_der)
            print('\n4) o desenho entre os passos')
            dr = await rt(pg, r"""(() => {
              const Q = window.__quadro, R = JOY.max*hud.joy.al, out = {prever:[], suave:[]};
              for (const m of ['prever', 'suave']){
                V92.cfg.render = m; P.x = GL + U(3); P.y = CY; P.vx = P.vy = 0; guardaAnterior(); joy.id = 77; joy.dx = R; joy.dy = 0;
                for (let i = 0; i < 10; i++) Q.passo(1000/60);
                for (let i = 0; i < 40; i++){ Q.passo(1000/120); out[m].push([VIS.px - P.x, P.x - ANT.px, VIS.px - ANT.px]); }
              }
              V92.cfg.render = 'prever'; joy.id = null; joy.dx = joy.dy = 0; return out; })()""")
            ok_p = all(-1e-6 <= a <= 268 / 60 + 1e-6 for a, _, _ in dr['prever'])
            ok_s = all(-1e-6 <= c <= d + 1e-6 for _, d, c in dr['suave'])
            P.confere(ok_p, "'prever': a tampinha desenhada fica entre o último passo e o próximo (0 a 4,5 px à frente)", dr['prever'][:4])
            P.confere(ok_s, "'suave': a tampinha desenhada fica entre o passo anterior e o último", dr['suave'][:4])
            print('\n5) o toque armado')
            t92 = await rt(pg, TOQUE + "(-60, 40)")
            await rt(pg, "(() => { V92.cfg.fisica = V92_NUC.perfilLimpo(Object.assign({}, V92.cfg.fisica, {bufferToque:0})); v92Aplica(); return 1; })()")
            t91 = await rt(pg, TOQUE + "(-60, 40)")
            await rt(pg, "(() => { V92.cfg = v92Limpa(V92_PADRAO); v92Aplica(); return 1; })()")
            t0 = await rt(pg, TOQUE + "(0, 40)")
            P.confere(t92, 'um toque de 40 ms, 60 ms antes de a bola chegar no alcance, vira chute (o toque fica armado)', t92)
            P.confere(not t91, 'sem o toque armado (o da v91), o mesmo toque se perde', t91)
            P.confere(t0, 'o toque na hora certa continua valendo', t0)
            print('\n6) o analógico')
            an = await rt(pg, r"""(() => {
              const R = JOY.max*hud.joy.al, r = {};
              for (const [nome, cfg] of [['v92', V92_PADRAO], ['v91', V92_V91]]){
                V92.cfg = v92Limpa(cfg); v92Aplica();
                AN.ativo = false; AN.setor = null; joy.id = 77; joy.dx = R*.17; joy.dy = 0;
                const d = getInput(); r[nome] = !!(d.mx || d.my);
              }
              joy.id = null; joy.dx = joy.dy = 0; V92.cfg = v92Limpa(V92_PADRAO); v92Aplica(); return r; })()""")
            P.confere(an['v92'] and not an['v91'], 'com o dedo a 17% do curso a tampinha anda (zona morta de 15%); com o perfil v91 (20%), não', an)
            P.confere(not [e for e in erros if 'Failed to load resource' not in e], 'nenhum erro de JavaScript na versão oficial', erros[:3])
        finally:
            await b.close()
        # ------------------------------------------------------------------ a versão oficial num aparelho que já teve a de testes
        print('\n1b) a versão oficial num celular que já usou a versão de testes (o ajuste guardado não vale)')
        guardado = {'cfg': {'render': 'v91', 'medidor': True, 'zonaLiga': .3, 'fisica': {'velJog': 20, 'rBola': 1.6, 'rJog': 3, 'forcaChute': 500}},
                    'slots': {'A': {'medidor': True}, 'B': {'render': 'v91'}}, 'slot': 'B', 'versao': 'v92.1'}
        b, pg, erros = await abre(pw, 844, 390, dsf=2, config={'experimental': False}, armazenamento={'racha-v92-testes': json.dumps(guardado)})
        try:
            await rt(pg, "(() => { x49Start(1, 0); try { rqVsFecha(); } catch (_) {} return 1; })()")
            await pg.wait_for_timeout(1300)                    # (o medidor da versão de testes se pinta a cada 0,5 s)
            o = await rt(pg, r"""(() => {
              const r = {exp:V92.exp, pub:window.RACHA_V92 && window.RACHA_V92.experimental, cfgExp:!!(window.RACHA_CONFIG && window.RACHA_CONFIG.experimental),
                padrao:JSON.stringify(V92.cfg) === JSON.stringify(v92Limpa(V92_PADRAO)), slots:!!(V92.slots.A || V92.slots.B),
                vel:VEL_JOG/U(1), rb:R_BOLA/U(1), rj:R_JOG/U(1), chute:FORCA_POWER, buf:V92_FIS.BUFFER_TOQUE,
                aba:!!document.getElementById('ajx-t-v92'), sec:!!document.getElementById('ajx-v92'), med:!!document.querySelector('.v92-medidor'),
                abas:[...document.querySelectorAll('#pop-ajustes .ajx-abas > *')].map(n => n.textContent.trim())};
              pausaAbre(); r.ab = !!document.getElementById('pa-v92ab'); r.pausa = [...document.querySelectorAll('#pausa button, .pa-bt')].filter(n => !n.hidden).map(n => n.textContent.trim()); pausaFecha();
              window.dispatchEvent(new KeyboardEvent('keydown', {key:'F2', code:'F2', bubbles:true}));
              r.f2 = !AJX.raiz.hidden; try { ajxFecha(); } catch (_) {}
              return r; })()""")
            P.confere(not o['exp'] and o['pub'] is False and not o['cfgExp'], 'a versão oficial: o modo de testes desligado (window.RACHA_V92.experimental = false)', o)
            P.confere(o['padrao'] and not o['slots'] and abs(o['vel'] - 14.1) < 1e-9 and o['rb'] == 1 and o['rj'] == 2 and o['chute'] == 360 and o['buf'] == 6,
                      'o ajuste da versão de testes guardado no aparelho (velocidade 20, bola 1,6, CHUTE 500, desenho v91) é ignorado: vale o padrão da v92', o)
            P.confere(not o['aba'] and not o['sec'] and not o['med'] and not o['ab'] and not o['f2'] and not any('TESTES' in a for a in o['abas']),
                      'sem a aba TESTES v92 nos AJUSTES, sem o medidor, sem o A ⇄ B na pausa e o F2 não abre nada', o)
            P.confere(not [e for e in erros if 'Failed to load resource' not in e], 'nenhum erro de JavaScript (versão oficial com o armazenamento da de testes)', erros[:3])
        finally:
            await b.close()
        # ------------------------------------------------------------------ a versão de testes
        print('\n7) a versão de testes: o painel nos AJUSTES')
        b, pg, erros = await abre(pw, 844, 390, dsf=2, config={'experimental': True})
        try:
            o = await rt(pg, "({exp:V92.exp, primeira:document.querySelector('#pop-ajustes .ajx-abas').firstElementChild.id, partes:Object.keys(V92P.partes)})")
            P.confere(o['exp'] and o['primeira'] == 'ajx-t-v92', 'com experimental: true a aba TESTES v92 é a primeira dos AJUSTES', o)
            ini = await rt(pg, "({A:V92.slots.A && v92Curto(V92.slots.A), B:V92.slots.B && v92Curto(V92.slots.B), slot:V92.slot, agora:v92Curto(V92.cfg)})")
            P.confere(ini == {'A': 'v92', 'B': 'v91', 'slot': 'A', 'agora': 'v92'}, 'num aparelho novo as memórias já vêm prontas: A = o Padrão v92 (valendo) e B = a v91 (tudo como era)', ini)
            P.confere(o['partes'] == ['perfis', 'fisica', 'controles', 'tela', 'online', 'medidas', 'db'], 'as 7 partes: perfis, física, controles, tela, online, medidas e DB', o['partes'])
            await rt(pg, "ajxAbre('v92')")
            await pg.wait_for_timeout(300)
            cabe = []
            for sub in ['perfis', 'fisica', 'controles', 'tela', 'online', 'medidas', 'db']:
                await rt(pg, "(() => { V92P.sub = %r; v92PainelSync(); return 1; })()" % sub)
                await pg.wait_for_timeout(80)
                m = await pg.evaluate("""(() => { const s = document.getElementById('ajx-v92'), vw = innerWidth; const fora = [];
                  for (const n of s.querySelectorAll('button, input, textarea')){ if (n.closest('[hidden]')) continue; const r = n.getBoundingClientRect(); if (!r.width) continue;
                    if (r.left < -1 || r.right > vw + 1) fora.push(n.textContent || n.id); if (n.tagName === 'BUTTON' && Math.min(r.width, r.height) < 31.5) fora.push('pequeno: ' + (n.textContent || n.id) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height)); }
                  return fora; })()""")
                cabe.append((sub, m))
            P.confere(all(not m for _, m in cabe), 'no celular deitado (844 × 390) os botões e deslizantes das 7 partes cabem na largura, com 32 px ou mais (o mesmo alvo dos Ajustes compactos da v70)', [c for c in cabe if c[1]])
            print('\n8) mexer pelo painel muda o jogo na hora')
            await rt(pg, "ajxFecha()")
            await rt(pg, "(() => { x49Start(1, 0); try { rqVsFecha(); } catch (_) {} return 1; })()")
            await pg.wait_for_timeout(300)
            await rt(pg, "(() => { V92.cfg.medidor = true; pausaAbre(); return 1; })()")
            await pg.wait_for_timeout(500)                     # (a pausa engole o clique dos primeiros 400 ms: o "clique fantasma" do toque que a abriu)
            pb = await rt(pg, r"""(() => {
              const b = document.getElementById('pa-v92ab'), r = {vis:!!b && !b.hidden, t0:b && b.textContent};
              b.click(); r.t1 = b.textContent; r.c1 = {render:V92.cfg.render, buf:V92_FIS.BUFFER_TOQUE, zona:V92.cfg.zonaLiga, prev:V92.cfg.previsao, med:V92.cfg.medidor};
              b.click(); r.t2 = b.textContent; r.c2 = {render:V92.cfg.render, buf:V92_FIS.BUFFER_TOQUE, zona:V92.cfg.zonaLiga, prev:V92.cfg.previsao, med:V92.cfg.medidor};
              pausaFecha(); V92.cfg.medidor = false; return r; })()""")
            P.confere(pb['vis'] and pb['t0'] == 'A ⇄ B · agora A (v92)' and pb['t1'] == 'A ⇄ B · agora B (v91)' and pb['t2'] == 'A ⇄ B · agora A (v92)',
                      'na pausa da partida o A ⇄ B já está lá (sem guardar nada) e diz qual está valendo: v92 → v91 → v92', pb)
            P.confere(pb['c1'] == {'render': 'v91', 'buf': 0, 'zona': .2, 'prev': 'v91', 'med': True} and pb['c2'] == {'render': 'prever', 'buf': 6, 'zona': .15, 'prev': 'v92', 'med': True},
                      'o A ⇄ B troca o jogo inteiro (desenho, toque armado, analógico, previsão online) e o medidor da tela fica como estava', pb)
            r = await rt(pg, r"""(() => {
              const antes = {vel:VEL_JOG, rb:B.r, rj:P.r, aro:AROV.ate, bot:RQ.jog.find(q => q !== P).r};
              v92MudaFis('velJog', 18); v92MudaFis('rBola', 1.4); v92MudaFis('rJog', 2.5); v92MudaFis('margem', .9);
              const depois = {vel:VEL_JOG/U(1), rb:B.r/U(1), rj:P.r/U(1), alc:ALCANCE_CHUTE/U(1), aro:AROV.ate, bot:RQ.jog.find(q => q !== P).r/U(1)};
              v92Usa(V92_V91, 'v91');
              const v91 = {vel:VEL_JOG/U(1), rb:B.r/U(1), rj:P.r/U(1), aro:AROV.ate, render:V92.cfg.render, buf:V92_FIS.BUFFER_TOQUE};
              return {antes, depois, v91}; })()""")
            d = r['depois']
            P.confere(abs(d['vel'] - 18) < 1e-9 and abs(d['rb'] - 1.4) < 1e-9 and abs(d['rj'] - 2.5) < 1e-9 and abs(d['bot'] - 2.5) < 1e-9,
                      'a velocidade, a bola e a tampinha (a sua e a dos bots) mudam na hora', d)
            P.confere(abs(d['alc'] - (2.5 + .9 + 1.4)) < 1e-9 and abs(d['aro'] - 1.245 * (3.4 / 2.5) / 1.25) < 1e-6, 'o alcance do chute segue o anel e o tamanho da bola; o aro desenhado acompanha o alcance', d)
            v = r['v91']
            P.confere(abs(v['vel'] - 14.1) < 1e-9 and abs(v['rb'] - 1) < 1e-9 and abs(v['rj'] - 2) < 1e-9 and abs(v['aro'] - 1.245) < 1e-9 and v['render'] == 'v91' and v['buf'] == 0,
                      'o Restaurar v91 volta tudo (física, aro, desenho e o toque sem armar)', v)
            ab = await rt(pg, r"""(() => {
              v92Usa(V92_PADRAO, 'v92'); V92.slots.A = v92Limpa(V92.cfg);
              v92MudaFis('forcaChute', 400); V92.slots.B = v92Limpa(V92.cfg); V92.slot = 'B';
              v92TrocaAB(); const a = {slot:V92.slot, chute:FORCA_POWER};
              v92TrocaAB(); const b = {slot:V92.slot, chute:FORCA_POWER};
              const txt = JSON.stringify({racha:'v92', cfg:V92.cfg}); v92Usa(V92_V91); v92Usa(JSON.parse(txt).cfg);
              const volta = JSON.stringify(V92.cfg) === JSON.stringify(v92Limpa(JSON.parse(txt).cfg));
              let salvo = null; try { salvo = JSON.parse(localStorage.getItem(V92_CHAVE)); } catch (_) {}
              return {a, b, volta, salvo:!!(salvo && salvo.slots && salvo.slots.A && salvo.slots.B)}; })()""")
            P.confere(ab['a']['slot'] == 'A' and ab['a']['chute'] == 360 and ab['b']['slot'] == 'B' and ab['b']['chute'] == 400, 'as memórias A e B trocam com um toque (o CHUTE 360 ⇄ 400)', ab)
            P.confere(ab['volta'] and ab['salvo'], 'exportar → importar devolve o mesmo ajuste, e o aparelho guarda o cfg e as memórias', ab)
            pa = await rt(pg, "(() => { pausaAbre(); const b = document.getElementById('pa-v92ab'); const r = {tem:!!b, visivel:b && !b.hidden}; pausaFecha(); return r; })()")
            P.confere(pa['tem'] and pa['visivel'], 'com as duas memórias guardadas, a pausa ganha o botão A ⇄ B', pa)
            P.confere(not [e for e in erros if 'Failed to load resource' not in e], 'nenhum erro de JavaScript na versão de testes', erros[:3])
        finally:
            await b.close()
    return P.fim()

if __name__ == '__main__':
    import sys
    sys.exit(asyncio.run(principal()))
