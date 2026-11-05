"""RACHA v106 · OS EMOJIS DA PARTIDA (tools/v106/emotes.js, app/public/game/v106-emotes.css e server/emotes106.js):
  1) os emojis desenhados: os 20 da lista (os mesmos ids do servidor), cada um com a carinha laranja, o branco do balão e o
     contorno, nada fora do balão (os pixels contra o caminho do balão), cada um diferente dos outros (os pixels de par em par),
     a imagem pronta guardada (desenhar de novo não faz outra; o "pop" não enche o cache) e a folha com todos
     (tests/saida/v106_emotes_grade.png);
  2) a cruz dos 5: o padrão, o poeSlot (troca, grava em racha-emotes-v106 e avisa pelo mudou), o que não vale, a leitura ao
     abrir de novo (e o que estava estragado), a chave na cópia da conta (tools/v82 e app/contracts/progresso.ts);
  3) o botão e a cruz no HUD em 6 tamanhos (o iPhone com o entalhe, o 667 × 375, o Android, o 1280 × 720, o 1920 × 1080 e o
     treino): dentro da tela e da área segura, sem encostar nos controles, na pausa, no placar e nos outros dois botões; a cruz
     com alvos de 44 px ou mais, fora dos controles, abrindo no toque e fechando com o toque fora
     (tests/saida/v106_emotes_cruz_844x390.png e _1280x720.png);
  4) o balão em cima da tampinha (contra os bots): aparece com o emoji escolhido no toque, a pontinha apontando para a
     tampinha (em cima da setinha VOCÊ), os pixels na tela, segue a tampinha que anda, some em 2,5 s, o "pop" (e sem ele com
     Reduzir animações), o intervalo (o botão mostrando a espera; no máximo 3 em 6 s) e os bots depois do gol
     (tests/saida/v106_emotes_balao.png);
  5) a chave dos Ajustes › Visual (Emojis dos outros na partida: ligada; desligada, os dos outros somem e o seu fica; guardada);
  6) o teclado: E abre a cruz, 1 a 5 mandam, Esc fecha sem abrir a pausa, o E que virou tecla de uma ação não abre; e o
     controle: o SELECT abre, o direcional manda o do lado e o SELECT de novo manda o do meio;
  7) online com duas sessões (o servidor da turma de verdade): o emoji de um aparece em cima da tampinha dele na tela do outro,
     o servidor conferindo o id e o ritmo pela rede, os dos outros desligados, o jogo de antes ignorando a mensagem nova e o
     botão longe da barra da sala no celular (tests/saida/v106_emotes_online_844x390.png);
  8) o servidor (node tests/v106_emotes_servidor_test.js: a lista, o ritmo, quem joga, o bloqueio, o silêncio);
  e nenhum erro de JavaScript.
  python3 tests/v106_emotes_test.py   (--sem-online: sem as partes 7 e 8)"""
import asyncio, json, math, os, re, subprocess, sys, time
from comum import Placar, rt, RAIZ, PAGINA, FONTES, HARNESS, CHROME, async_playwright
from online_test import porta_livre, sessao, espera

SAIDA = RAIZ / 'tests' / 'saida'; SAIDA.mkdir(exist_ok=True)
COMECA = "(() => { if (!lobby.aberto) abrirLobby(); X49.mode = 'casual'; x49Save(); x49Start(1, 0); return 1; })()"
TREINO = "(() => { jogar(); return 1; })()"
PADRAO = ['valeu', 'rindo', 'comemorando', 'bravo', 'chorando']
ERROS = []


def sem_rede(erros):
    return [e for e in erros if 'Failed to load resource' not in e and 'ERR_' not in e and 'WebSocket' not in e]


async def pagina(b, w, h, ins=None, toque=True, armazenamento=None, movimento=None):
    """o jogo num contexto novo (com as áreas seguras antes de abrir, como no aparelho) — a arrumação do comum.abre"""
    ctx = await b.new_context(viewport={'width': w, 'height': h}, has_touch=toque)
    await ctx.add_init_script("document.addEventListener('DOMContentLoaded',()=>{const s=document.createElement('style');s.textContent=%s;document.head.prepend(s);});" % json.dumps(FONTES))
    await ctx.add_init_script('window.RACHA_CONFIG = %s;' % json.dumps({'presente': False}))
    if armazenamento:
        await ctx.add_init_script("try{const o=%s;for(const k in o)localStorage.setItem(k,o[k]);}catch(e){}" % json.dumps(armazenamento))
    pg = await ctx.new_page()
    erros = []
    pg.on('pageerror', lambda e: erros.append(str(e)[:300]))
    pg.on('console', lambda m: erros.append('console: ' + m.text[:200]) if m.type == 'error' else None)
    if movimento:
        await pg.emulate_media(reduced_motion=movimento)
    if ins:
        cdp = await ctx.new_cdp_session(pg)
        await cdp.send('Emulation.setSafeAreaInsetsOverride', {'insets': ins})
    await pg.goto(PAGINA.resolve().as_uri())
    await pg.wait_for_function('() => typeof window.__RT === "function"', polling=100, timeout=30000)
    await pg.wait_for_timeout(600)
    await pg.evaluate("(() => { const o = document.getElementById('onb'); if (o) o.hidden = true; })()")
    await pg.evaluate("(() => { const b = [...document.querySelectorAll('#v84auth button')].find(x => /TREINAR OFFLINE/.test(x.textContent || '')); if (b) b.click(); })()")
    await pg.wait_for_timeout(150)
    await rt(pg, HARNESS)
    pg.erros = erros
    return ctx, pg


def cruza(a, b, folga=0):
    return bool(a) and bool(b) and a[0] < b[2] - folga and a[2] > b[0] + folga and a[1] < b[3] - folga and a[3] > b[1] + folga


def no_circulo(r, c, folga=0):
    """o retângulo r encosta no círculo c = [id, x, y, raio]?"""
    nx = max(r[0], min(c[1], r[2])); ny = max(r[1], min(c[2], r[3]))
    return math.hypot(nx - c[1], ny - c[2]) < c[3] - folga


GEO = """(() => {
  const c = cv.getBoundingClientRect(), k = c.width/W, hk = HUDX.k || 1;
  const s = getComputedStyle(document.documentElement), n = v => parseFloat(v) || 0;
  const sa = {t:n(s.paddingTop), r:n(s.paddingRight), b:n(s.paddingBottom), l:n(s.paddingLeft)};
  const R = e => { if (!e || e.hidden) return null; const q = e.getBoundingClientRect(), cs = getComputedStyle(e); if (q.width < 2 || cs.display === 'none' || e.closest('[hidden]')) return null; return [q.left, q.top, q.right, q.bottom]; };
  const ctl = [];
  for (const id of HE_ORDEM){ if (!controleVisivel(id)) continue; const e = el(id); ctl.push([id, c.left + e.x*k, c.top + e.y*k, e.r*k]); }
  const b = BTN_PAUSA, pausa = [c.left + b.x*k, c.top + b.y*k, c.left + (b.x + b.w)*k, c.top + (b.y + b.h)*k];
  let placar = null; try { if (RQ.on){ const pw = v80PlacarW()*hk; placar = [c.left + (W/2 - pw/2)*k, c.top, c.left + (W/2 + pw/2)*k, c.top + (PLACAR80.y + PLACAR80.h)*hk*k]; } } catch (_) {}
  return {vw:innerWidth, vh:innerHeight, sa, cv:[c.left, c.top, c.right, c.bottom], ctl, pausa, placar, est:RachaEmotes106.estado(),
    bt:R(EMO106.el.bt), cruz:R(EMO106.el.cruz), ops:EMO106.el.ops.map(R), jog:R(V93P.el && V93P.el.bt), falas:R(V93F.el && V93F.el.bt), barra:R(X49UI.onlinebar)};
})()"""


# ---------------------------------------------------------------------------------------------------------------- 1) os emojis desenhados
PIXELS = """(() => {
  const N = 124, cx = 58, cy = 56, r = 48, out = [], fotos = [];
  const cv1 = document.createElement('canvas'); cv1.width = cv1.height = N; const g = cv1.getContext('2d', {willReadFrequently:true});
  const cm = document.createElement('canvas'); cm.width = cm.height = N; const gm = cm.getContext('2d', {willReadFrequently:true});
  for (const e of RachaEmotes106.lista()){
    g.clearRect(0, 0, N, N); const desenhou = RachaEmotes106.desenha(g, e.id, cx, cy, r);
    gm.clearRect(0, 0, N, N); emo106BalaoCaminho(gm, cx, cy, r, EMO106_PONTA_GRADE, 1.3*r); gm.fillStyle = gm.strokeStyle = '#000'; gm.lineWidth = 3; gm.fill(); gm.stroke();
    const a = g.getImageData(0, 0, N, N).data, m = gm.getImageData(0, 0, N, N).data;
    let fora = 0, cheio = 0, laranja = 0, branco = 0, escuro = 0;
    for (let i = 0; i < a.length; i += 4){
      if (a[i + 3] <= 10) continue;
      cheio++; if (m[i + 3] < 10) fora++;
      const R = a[i], G = a[i + 1], B = a[i + 2];
      if (a[i + 3] > 200 && R > 200 && G > 80 && G < 215 && B < 90) laranja++;
      if (a[i + 3] > 200 && R > 235 && G > 235 && B > 235) branco++;
      if (a[i + 3] > 200 && R + G + B < 160) escuro++;
    }
    out.push({id:e.id, nome:e.nome, desenhou, fora, cheio, laranja, branco, escuro});
    fotos.push(Array.from(a));
  }
  // de par em par: quantos pixels mudam de verdade (a soma das diferenças de cor > 90) na carinha
  let menor = null;
  for (let i = 0; i < fotos.length; i++) for (let j = i + 1; j < fotos.length; j++){
    const A = fotos[i], B = fotos[j]; let d = 0;
    for (let p = 0; p < A.length; p += 4) if (Math.abs(A[p] - B[p]) + Math.abs(A[p + 1] - B[p + 1]) + Math.abs(A[p + 2] - B[p + 2]) > 90) d++;
    if (!menor || d < menor.d) menor = {d, a:out[i].id, b:out[j].id};
  }
  const face = Math.round(Math.PI*Math.pow(r*EMO106_FACE, 2));
  return {lista:out, menor, face};
})()"""

FOLHA = """(() => {
  const L = RachaEmotes106.lista(), cols = 5, cel = 210, c = document.createElement('canvas');
  c.width = cols*cel; c.height = Math.ceil(L.length/cols)*cel + 70; c.id = 'v106-folha';
  Object.assign(c.style, {position:'fixed', left:'0px', top:'0px', zIndex:99999});
  const g = c.getContext('2d'), fundo = g.createLinearGradient(0, 0, 0, c.height); fundo.addColorStop(0, '#1d2f6b'); fundo.addColorStop(1, '#0d1638');
  g.fillStyle = fundo; g.fillRect(0, 0, c.width, c.height);
  g.font = '34px ' + FONT; g.fillStyle = '#ffd23f'; g.textAlign = 'center'; g.fillText('RACHA · OS EMOJIS DA PARTIDA (v106)', c.width/2, 46);
  L.forEach((e, i) => {
    const x = (i % cols)*cel, y = 70 + Math.floor(i/cols)*cel;
    g.fillStyle = 'rgba(255,255,255,.06)'; g.beginPath(); g.roundRect(x + 10, y + 6, cel - 20, cel - 16, 18); g.fill();
    RachaEmotes106.desenha(g, e.id, x + cel/2 + 4, y + 86, 66);
    g.font = '19px ' + FONT; g.fillStyle = '#ffffff'; g.fillText(e.nome, x + cel/2, y + cel - 24);
  });
  document.body.appendChild(c);
  return [c.width, c.height];
})()"""


async def emojis(P, b):
    print('\n1) os emojis desenhados (os 20, nada fora do balão, cada um diferente)')
    ctx, pg = await pagina(b, 1100, 980, toque=False)
    try:
        lista = await rt(pg, "RachaEmotes106.lista()")
        ids = [e['id'] for e in lista]
        P.confere(len(lista) == 20 and len(set(ids)) == 20 and len(set(e['nome'] for e in lista)) == 20 and all(re.fullmatch(r'[a-z_]+', i) for i in ids),
                  'a lista: 20 emojis, ids e nomes sem repetir (os ids só com letras minúsculas e _)', ids)
        nomes = [e['nome'] for e in lista]
        quer = ['RINDO', 'CHORANDO DE RIR', 'BRAVO', 'FURIOSO', 'TRISTE', 'CHORANDO', 'SURPRESO', 'ASSUSTADO', 'PISCADA', 'NA MORAL', 'APAIXONADO', 'PENSANDO',
                'ZOANDO', 'SONO', 'AFF', 'CONFIANTE', 'COMEMORANDO', 'NERVOSO', 'DESCONFIADO', 'VALEU']
        P.confere(sorted(nomes) == sorted(quer), 'os nomes em português (RINDO, CHORANDO DE RIR, NA MORAL, ZOANDO, AFF, VALEU…)', nomes)
        srv = (RAIZ / 'server' / 'emotes106.js').read_text(encoding='utf-8')
        m = re.search(r"const EMOTES = Object\.freeze\(\[(.*?)\]\)", srv, re.S)
        ids_srv = re.findall(r"'([a-z_]+)'", m.group(1)) if m else []
        P.confere(ids_srv == ids, 'o servidor (server/emotes106.js) tem a mesma lista, na mesma ordem', [ids_srv, ids])
        api = await rt(pg, "Object.keys(RachaEmotes106)")
        P.confere(all(k in api for k in ('lista', 'desenha', 'slots', 'poeSlot', 'padrao', 'mudou')), 'a API do COFRE: lista, desenha, slots, poeSlot, padrao e mudou (window.RachaEmotes106)', api)
        px = await rt(pg, PIXELS)
        L = px['lista']
        ruins = [x for x in L if not x['desenhou'] or x['cheio'] < 4000 or x['laranja'] < 900 or x['branco'] < 250 or x['escuro'] < 150]
        P.confere(not ruins, 'cada emoji desenhado: a carinha laranja, o branco do balão e o contorno escuro (todos os 20)', ruins or [(x['id'], x['laranja'], x['branco'], x['escuro']) for x in L][:4])
        fora = [(x['id'], x['fora']) for x in L if x['fora']]
        P.confere(not fora, 'nada fora do balão: nenhum pixel dos 20 passa do contorno nem da pontinha', fora)
        mn = px['menor']
        P.confere(mn and mn['d'] >= .05*px['face'], 'cada um diferente dos outros: o par mais parecido (%s × %s) ainda muda %d pixels (%.0f%% da carinha)' % (mn['a'], mn['b'], mn['d'], 100.0*mn['d']/px['face']), mn)
        # a imagem pronta: desenhar de novo no mesmo tamanho não faz outra; o "pop" da partida (px fixo) não enche o cache
        ca = await rt(pg, """(() => { const c = document.createElement('canvas'); c.width = c.height = 200; const g = c.getContext('2d');
          RachaEmotes106.desenha(g, 'rindo', 100, 100, 40); const n0 = EMO106_CACHE.size, img = emo106Rosto('rindo', 80);
          for (let i = 0; i < 30; i++) RachaEmotes106.desenha(g, 'rindo', 100, 100, 40);
          const n1 = EMO106_CACHE.size;
          for (let i = 0; i < 30; i++){ g.save(); g.translate(100, 140); g.scale(.35 + i*.03, .35 + i*.03); g.translate(-100, -140); emo106Desenha(g, 'valeu', 100, 100, 40, {ponta:Math.PI/2, px:80}); g.restore(); }
          return {n0, n1, n2:EMO106_CACHE.size, mesma:emo106Rosto('rindo', 80) === img}; })()""")
        P.confere(ca['n1'] == ca['n0'] and ca['mesma'] and ca['n2'] <= ca['n1'] + 1, 'a imagem pronta fica guardada: 30 desenhos iguais não fazem outra, e o "pop" (30 tamanhos) usa uma só', ca)
        tam = await rt(pg, FOLHA)
        await pg.wait_for_timeout(200)
        el = await pg.query_selector('#v106-folha')
        await el.screenshot(path=str(SAIDA / 'v106_emotes_grade.png'))
        print('  (a folha com todos: tests/saida/v106_emotes_grade.png, %d × %d)' % (tam[0], tam[1]))
    finally:
        ERROS.extend(sem_rede(pg.erros)); await ctx.close()


# ---------------------------------------------------------------------------------------------------------------- 2) a cruz dos 5 e a gravação
async def lugares(P, b):
    print('\n2) a cruz dos 5: o padrão, o poeSlot, a gravação e a cópia da conta')
    ctx, pg = await pagina(b, 1280, 720, toque=False)
    try:
        s = await rt(pg, "({slots:RachaEmotes106.slots(), padrao:RachaEmotes106.padrao(), lugares:RachaEmotes106.lugares(), chave:localStorage.getItem('racha-emotes-v106')})")
        P.confere(s['slots'] == PADRAO and s['padrao'] == PADRAO and s['lugares'] == ['cima', 'esquerda', 'meio', 'direita', 'baixo'] and s['chave'] is None,
                  'o padrão: VALEU em cima, RINDO à esquerda, COMEMORANDO no meio, BRAVO à direita e CHORANDO embaixo (nada gravado ainda)', s)
        r = await rt(pg, """(() => { window.__avisos = []; window.__solta = RachaEmotes106.mudou(s => window.__avisos.push(s));
          const a = RachaEmotes106.poeSlot(2, 'na_moral'); return {a, slots:RachaEmotes106.slots(), chave:JSON.parse(localStorage.getItem('racha-emotes-v106')), avisos:window.__avisos.slice()}; })()""")
        P.confere(r['a'] == ['valeu', 'rindo', 'na_moral', 'bravo', 'chorando'] and r['slots'] == r['a'] and r['chave'] == {'v': 1, 's': r['a']} and r['avisos'] == [r['a']],
                  'poeSlot(2, NA MORAL): o meio troca, grava em racha-emotes-v106 e o mudou avisa (uma vez, com os 5)', r)
        r = await rt(pg, "(() => { window.__avisos = []; const a = RachaEmotes106.poeSlot(0, 'rindo'); return {a, avisos:window.__avisos.slice()}; })()")
        P.confere(r['a'] == ['rindo', 'valeu', 'na_moral', 'bravo', 'chorando'] and len(r['avisos']) == 1, 'o emoji que já estava em outro lugar troca com ele (sem repetir)', r)
        r = await rt(pg, """(() => { window.__avisos = []; const v = [RachaEmotes106.poeSlot(5, 'sono'), RachaEmotes106.poeSlot(-1, 'sono'), RachaEmotes106.poeSlot(1, 'xyz'), RachaEmotes106.poeSlot('a', 'sono'), RachaEmotes106.poeSlot(1, null)];
          return {v, slots:RachaEmotes106.slots(), avisos:window.__avisos.length}; })()""")
        P.confere(r['v'] == [None]*5 and r['slots'] == ['rindo', 'valeu', 'na_moral', 'bravo', 'chorando'] and r['avisos'] == 0, 'o que não vale (lugar fora de 0 a 4, emoji fora da lista) não muda nada e não avisa', r)
        r = await rt(pg, "(() => { window.__solta(); window.__avisos = []; RachaEmotes106.poeSlot(4, 'sono'); return {n:window.__avisos.length, slots:RachaEmotes106.slots()}; })()")
        P.confere(r['n'] == 0 and r['slots'][4] == 'sono', 'o mudou devolve o "parar de avisar"', r)
        cp = await rt(pg, "({chaves:window.RACHA82 ? RACHA82.chaves.slice() : null, copia:window.RACHA82 ? Object.keys(RACHA82.copia()) : null})")
        P.confere(cp['chaves'] and 'racha-emotes-v106' in cp['chaves'] and 'racha-emotes-v106' in cp['copia'] and 'racha-emotes-outros-v106' not in cp['chaves'],
                  'a chave vai na cópia do progresso da conta (tools/v82: RACHA82.chaves e a cópia); o "mostrar os dos outros" fica no aparelho', cp)
        contrato = (RAIZ / 'app' / 'contracts' / 'progresso.ts').read_text(encoding='utf-8')
        P.confere('"racha-emotes-v106"' in contrato.split('PROGRESSO_CHAVES', 1)[1].split('] as const', 1)[0], 'a plataforma aceita a chave (app/contracts/progresso.ts: PROGRESSO_CHAVES)')
        # abrir de novo: os lugares ficam; o que estava estragado (repetido, de fora da lista) é arrumado com o padrão
        await pg.reload(); await pg.wait_for_function('() => typeof window.__RT === "function"', timeout=30000); await pg.wait_for_timeout(500)
        s = await rt(pg, "RachaEmotes106.slots()")
        P.confere(s == ['rindo', 'valeu', 'na_moral', 'bravo', 'sono'], 'abrindo o jogo de novo, os 5 continuam', s)
        await rt(pg, "localStorage.setItem('racha-emotes-v106', JSON.stringify({v:1, s:['rindo', 'rindo', 'nao_existe', 7]}))")
        await pg.reload(); await pg.wait_for_function('() => typeof window.__RT === "function"', timeout=30000); await pg.wait_for_timeout(500)
        s = await rt(pg, "RachaEmotes106.slots()")
        P.confere(s[0] == 'rindo' and len(set(s)) == 5 and s[1:] == ['valeu', 'comemorando', 'bravo', 'chorando'], 'a chave estragada (repetido, fora da lista, faltando) volta arrumada: o que valia fica e o resto vem do padrão', s)
        await rt(pg, "localStorage.setItem('racha-emotes-v106', '{isto não é json')")
        await pg.reload(); await pg.wait_for_function('() => typeof window.__RT === "function"', timeout=30000); await pg.wait_for_timeout(500)
        s = await rt(pg, "RachaEmotes106.slots()")
        P.confere(s == PADRAO, '   e sem JSON nenhum: o padrão', s)
    finally:
        ERROS.extend(sem_rede(pg.erros)); await ctx.close()


# ---------------------------------------------------------------------------------------------------------------- 3) o botão e a cruz no HUD
TAMANHOS = [('iPhone (o entalhe)', 844, 390, {'top': 0, 'left': 47, 'right': 47, 'bottom': 21}, 'bots', True),
            ('667 × 375', 667, 375, None, 'bots', True),
            ('Android 740 × 360 (o furo)', 740, 360, {'top': 0, 'left': 34, 'right': 0, 'bottom': 0}, 'bots', True),
            ('1280 × 720', 1280, 720, None, 'bots', False),
            ('1920 × 1080', 1920, 1080, None, 'bots', False),
            ('o treino 844 × 390', 844, 390, None, 'treino', True)]


async def hud(P, b):
    print('\n3) o botão e a cruz no HUD em vários tamanhos (sem cobrir nada)')
    for nome, w, h, ins, modo, toque in TAMANHOS:
        ctx, pg = await pagina(b, w, h, ins=ins, toque=toque)
        try:
            await rt(pg, COMECA if modo == 'bots' else TREINO)
            pode = await espera(pg, "RachaEmotes106.estado().pode && !EMO106.el.bt.hidden && !!EMO106.lugar" + (" && RQ.estado === 'jogo' && !V93P.contagem" if modo == 'bots' else ''), 12000)
            await asyncio.sleep(.5)
            g = await rt(pg, GEO)
            bt, sa = g['bt'], g['sa']
            dentro = bool(bt) and bt[0] >= sa['l'] - 1 and bt[1] >= sa['t'] - 1 and bt[2] <= g['vw'] - sa['r'] + 1 and bt[3] <= g['vh'] - sa['b'] + 1
            ctl = [c[0] for c in g['ctl'] if bt and no_circulo(bt, c)]
            outros = [k for k in ('pausa', 'placar', 'jog', 'falas', 'barra') if cruza(bt, g[k])]
            P.confere(bool(pode) and dentro and bt[2] - bt[0] >= 36 and not ctl and not outros,
                      '%s: o botão do emoji (%d px) dentro da tela e da área segura, sem encostar em controle, pausa, placar ou nos outros botões' % (nome, round(bt[2] - bt[0]) if bt else 0), [bt, sa, ctl, outros, g['est']['lugar']])
            # abre com o toque (ou o clique) de verdade
            cx, cy = (bt[0] + bt[2])/2, (bt[1] + bt[3])/2
            if toque: await pg.touchscreen.tap(cx, cy)
            else: await pg.mouse.click(cx, cy)
            await pg.wait_for_timeout(350)
            g2 = await rt(pg, GEO)
            cz, ops = g2['cruz'], g2['ops']
            alvos = [round(min(o[2] - o[0], o[3] - o[1])) for o in ops if o]
            ctl2 = [c[0] for c in g2['ctl'] if cz and any(no_circulo(o, c) for o in ops if o)]
            na_tela = bool(cz) and all(o and o[0] >= 0 and o[1] >= 0 and o[2] <= g2['vw'] and o[3] <= g2['vh'] for o in ops)
            P.confere(g2['est']['cruz'] and bool(cz) and len(alvos) == 5 and min(alvos) >= 44 and na_tela and not ctl2,
                      '   tocar no botão abre a cruz: os 5 lugares com %d px ou mais, na tela, fora dos controles' % (min(alvos) if alvos else 0), [cz, alvos, ctl2, na_tela])
            emo = await rt(pg, "EMO106.el.ops.map(b => b.dataset.e)")
            P.confere(emo == g2['est']['slots'], '   cada lugar com o seu emoji (cima, esquerda, meio, direita, baixo)', [emo, g2['est']['slots']])
            if (w, h, modo) in ((844, 390, 'bots'), (1280, 720, 'bots')):
                await pg.screenshot(path=str(SAIDA / ('v106_emotes_cruz_%dx%d.png' % (w, h))))
            # tocar fora (no campo, longe de tudo) fecha
            fx, fy = g2['cv'][0] + (g2['cv'][2] - g2['cv'][0])*.5, g2['cv'][1] + (g2['cv'][3] - g2['cv'][1])*.86
            if toque: await pg.touchscreen.tap(fx, fy)
            else: await pg.mouse.click(fx, fy)
            await pg.wait_for_timeout(250)
            fechou = await rt(pg, "!EMO106.cruz && EMO106.el.cruz.hidden")
            P.confere(fechou, '   tocar fora da cruz fecha', fechou)
        finally:
            ERROS.extend(sem_rede(pg.erros)); await ctx.close()


# ---------------------------------------------------------------------------------------------------------------- 4) o balão em cima da tampinha
FICA = "(() => { for (const b of EMO106.baloes.values()) b.t0 = EMO106.relogio - 500; return 1; })()"
DES = "(() => { const d = (EMO106.desenhados || [])[0] || null; if (!d) return null; return Object.assign({}, d, {z:cam.z, vis:[W/2 + (VIS.px - cam.x)*cam.z, H/2 + (VIS.py - cam.y)*cam.z], kc:cv.getBoundingClientRect().width/W, mundo:[VIS.px, VIS.py]}); })()"


def cor(png, x, y):
    from PIL import Image
    import io
    im = Image.open(io.BytesIO(png)).convert('RGB')
    return im.getpixel((int(round(x)), int(round(y))))


async def balao(P, b):
    print('\n4) o balão em cima da tampinha (contra os bots, 1280 × 720)')
    ctx, pg = await pagina(b, 1280, 720, toque=False)
    try:
        await rt(pg, "(() => { opc.replay = false; return 1; })()")
        await rt(pg, COMECA)
        await espera(pg, "RachaEmotes106.estado().pode && !!EMO106.lugar && RQ.estado === 'jogo'", 12000)
        await asyncio.sleep(.4)
        g = await rt(pg, GEO)
        bt = g['bt']
        await pg.mouse.click((bt[0] + bt[2])/2, (bt[1] + bt[3])/2); await pg.wait_for_timeout(300)
        g = await rt(pg, GEO)
        meio = g['ops'][2]
        await rt(pg, "(() => { window.__arb0 = ARB_PARADO; ARB_PARADO = () => true; return 1; })()")   # (a física parada só para a foto: a tampinha e a bola não andam)
        await pg.mouse.click((meio[0] + meio[2])/2, (meio[1] + meio[3])/2)
        await pg.wait_for_timeout(450)
        d = await rt(pg, DES)
        e = await rt(pg, "RachaEmotes106.estado()")
        P.confere(d and d['k'] == 'eu' and d['e'] == 'comemorando' and not e['cruz'] and e['baloes'] and e['baloes'][0]['e'] == 'comemorando',
                  'tocar no meio da cruz: o balão com o COMEMORANDO aparece em cima da sua tampinha e a cruz fecha', [d, e['cruz']])
        if d:
            em_cima = abs(d['ponta'][0] - d['alvo'][0]) < 1 and d['ponta'][1] < d['alvo'][1] - d['rq'] and d['y'] + d['r'] < d['ponta'][1] + 1 and not d['baixo']
            P.confere(em_cima and abs(d['x'] - d['alvo'][0]) < 1, 'a pontinha aponta para a tampinha (embaixo do balão, na direção dela, em cima da setinha VOCÊ)', d)
            P.confere(d['r']*d['kc']*2 >= 44 and d['r'] >= d['rq'], 'do tamanho da tampinha na câmera (o balão com %d px, a tampinha com %d px; nunca menos de 44 px)' % (round(2*d['r']*d['kc']), round(2*d['rq']*d['kc'])), d)
            await asyncio.sleep(.2)
            d = await rt(pg, DES)
            png = await pg.screenshot()
            c0 = g['cv']
            k = d['kc']
            centro = cor(png, c0[0] + d['x']*k, c0[1] + d['y']*k)
            aneis = [cor(png, c0[0] + (d['x'] + math.cos(a)*d['r']*.865)*k, c0[1] + (d['y'] + math.sin(a)*d['r']*.865)*k) for a in (-math.pi/2, -math.pi/4, -3*math.pi/4, 0, math.pi)]
            brancos = sum(1 for c in aneis if min(c) > 225)
            P.confere(centro[0] > 200 and 110 < centro[1] < 238 and centro[2] < 160 and centro[0] - centro[2] > 90 and brancos >= 4,
                      'na tela: o laranja da carinha no meio do balão e o branco do balão em volta (os pixels de verdade do canvas: %d de 5 no branco)' % brancos, [centro, aneis])
            x0, y0 = max(0, c0[0] + (d['x'] - 330)*k), max(0, c0[1] + (d['y'] - 150)*k)
            x1, y1 = min(1280, c0[0] + (d['x'] + 330)*k), min(720, c0[1] + (d['alvo'][1] + 150)*k)
            await rt(pg, FICA)                                   # (a foto leva tempo com a máquina ocupada: o balão volta para o meio da vida dele)
            await pg.screenshot(path=str(SAIDA / 'v106_emotes_balao.png'), clip={'x': x0, 'y': y0, 'width': x1 - x0, 'height': y1 - y0})
        await rt(pg, "(() => { ARB_PARADO = window.__arb0; return 1; })()")
        # segue a tampinha que anda (o teclado: D por 0,6 s)
        await rt(pg, "(() => { EMO106.envios = []; return 1; })()")
        m0 = await rt(pg, "[VIS.px, VIS.py]")
        await rt(pg, "RachaEmotes106.manda('valeu')")
        amostras = []
        await rt(pg, "keys.KeyD = true; keys.KeyS = true; true")
        for _ in range(6):
            await asyncio.sleep(.1)
            amostras.append(await rt(pg, "(() => { const d = (EMO106.desenhados || [])[0]; if (!d) return null; const q = P, a = [W/2 + (VIS.px - cam.x)*cam.z, H/2 + (VIS.py - cam.y)*cam.z]; return {alvo:d.alvo, agora:a, x:d.x, mundo:[VIS.px, VIS.py], e:d.e}; })()"))
        await rt(pg, "keys.KeyD = false; keys.KeyS = false; true")
        m1 = await rt(pg, "[VIS.px, VIS.py]")
        junto = all(a and a['e'] == 'valeu' and abs(a['alvo'][0] - a['agora'][0]) < 40 and abs(a['alvo'][1] - a['agora'][1]) < 40 for a in amostras)
        andou = math.hypot(m1[0] - m0[0], m1[1] - m0[1])
        P.confere(junto and andou > 40, 'o balão acompanha a tampinha que anda (%d px de campo em 0,6 s; a pontinha sempre nela)' % andou, [amostras[:2], andou])
        # some em 2,5 s (o relógio do balão: a medida é a idade dele, não o relógio do teste — a máquina ocupada atrasa as leituras)
        await rt(pg, "(() => { EMO106.envios = []; EMO106.baloes.clear(); RachaEmotes106.manda('sono'); window.__t0 = performance.now(); return 1; })()")
        vida = []
        for _ in range(60):
            v = await rt(pg, "(() => { const d = (EMO106.desenhados || [])[0]; return [Math.round(performance.now() - window.__t0), d ? Math.round(d.t) : -1, EMO106.baloes.size]; })()")
            vida.append(v)
            if v[1] < 0 and v[2] == 0 and v[0] > 500: break
            await asyncio.sleep(.1)
        vis = [v for v in vida if v[1] >= 0]
        P.confere(vis and max(v[1] for v in vis) >= 1800 and max(v[1] for v in vis) < 2500 and vida[-1][1] < 0 and vida[-1][2] == 0 and vida[-1][0] < 8000,
                  'o balão some sozinho em 2,5 s (visto até %d ms de vida; sumiu)' % (max(v[1] for v in vis) if vis else -1), vida[-4:])
        # o pop: entra pequeno, passa um pouco do tamanho e assenta; some encolhendo. Com Reduzir animações, sem o pop
        pop = await rt(pg, "[0, 60, 120, 230, 1200, 2350, 2500].map(t => { const p = emo106Pop(t, false); return [+p.esc.toFixed(3), +p.alfa.toFixed(3)]; })")
        calmo = await rt(pg, "[0, 60, 120, 230, 1200, 2350].map(t => emo106Pop(t, true).esc)")
        P.confere(pop[0][0] < .4 and pop[1][0] < pop[2][0] and pop[2][0] > 1.1 and pop[3][0] == 1 and pop[4] == [1, 1] and pop[5][0] < 1 and pop[5][1] < 1 and pop[6][1] == 0,
                  'o "pop": entra pequeno, passa do tamanho (%.2f) e assenta; no fim some encolhendo' % pop[2][0], pop)
        P.confere(calmo == [1]*6, '   com Reduzir animações: sem o pop (sempre do tamanho certo)', calmo)
        await rt(pg, "(() => { CONTA.menosAnim = true; CONTA.menosAnimEscolha = true; v70AplicaCalmo(); EMO106.envios = []; RachaEmotes106.manda('sono'); return 1; })()")
        await asyncio.sleep(.05)
        c1 = await rt(pg, "(() => { const d = (EMO106.desenhados || [])[0]; return d ? {esc:d.esc, t:Math.round(d.t), e:d.e} : null; })()")
        await rt(pg, "(() => { CONTA.menosAnim = false; v70AplicaCalmo(); return 1; })()")
        P.confere(c1 and c1['e'] == 'sono' and c1['esc'] == 1, '   (na partida, com Reduzir animações ligado: o balão já entra do tamanho certo)', c1)
        # o intervalo: o segundo logo em seguida não vai; o botão mostra a espera; depois de 1,5 s vai
        await rt(pg, "(() => { EMO106.envios = []; EMO106.baloes.clear(); return 1; })()")
        dois = await rt(pg, "(() => { const um = RachaEmotes106.manda('rindo'); return {um, foi:RachaEmotes106.manda('bravo'), espera:RachaEmotes106.estado().espera, e:[...EMO106.baloes.values()].map(b => b.e)}; })()")
        um = dois['um']
        await asyncio.sleep(.3)
        bt_espera = await rt(pg, "({cls:EMO106.el.bt.classList.contains('espera'), p:parseFloat(EMO106.el.bt.style.getPropertyValue('--emo106-p')), cruz:EMO106.el.cruz.classList.contains('espera'), vis:getComputedStyle(EMO106.el.bt.querySelector('.emo106-espera')).display})")
        P.confere(um and not dois['foi'] and dois['espera'] > 1300 and dois['e'] == ['rindo'], 'o intervalo: o segundo emoji logo em seguida não vai (falta %d ms)' % dois['espera'], dois)
        P.confere(bt_espera['cls'] and 0 < bt_espera['p'] < 1 and bt_espera['vis'] == 'block', '   o botão mostra a espera (o setor escuro que vai sumindo: %.2f)' % (bt_espera['p'] or 0), bt_espera)
        await asyncio.sleep(1.3)
        tres = await rt(pg, "({foi:RachaEmotes106.manda('bravo'), cls:EMO106.el.bt.classList.contains('espera')})")
        P.confere(tres['foi'], '   depois de 1,5 s, o próximo vai', tres)
        raj = await rt(pg, "(() => { const a = performance.now(); EMO106.envios = [a - 4200, a - 2600, a - 1600]; return {espera:emo106Espera(a), foi:RachaEmotes106.manda('sono')}; })()")
        P.confere(not raj['foi'] and 1500 < raj['espera'] <= 1800, '   e no máximo 3 em 6 s (o 4º espera o primeiro dos três sair: %d ms)' % raj['espera'], raj)
        # os bots depois do gol (às vezes: 1 em 4): um de quem levou lamenta (no 1x1 o seu time só tem você)
        await rt(pg, "(() => { EMO106.envios = []; EMO106.baloes.clear(); window.__r0 = Math.random; Math.random = () => .1; window.__nb = emo106BotsGol(0); Math.random = window.__r0; return 1; })()")
        nb = await rt(pg, "window.__nb")
        bot = await espera(pg, "(() => { const d = (EMO106.desenhados || []).find(x => /^bot:/.test(x.k)); return d ? {k:d.k, e:d.e} : null; })()", 3000, 60)
        nada = await rt(pg, "(() => { EMO106.baloes.clear(); window.__r0 = Math.random; Math.random = () => .9; const n = emo106BotsGol(0); Math.random = window.__r0; return n; })()")
        P.confere(nb == 1 and bot and bot['e'] in ('triste', 'bravo') and nada == 0, 'os bots: depois do gol, às vezes (1 em 4) o bot de quem levou mostra TRISTE ou BRAVO em cima da tampinha dele', [nb, bot, nada])
        await espera(pg, "RQ.estado === 'jogo' || RQ.estado === 'saida'", 8000)
        gol = await rt(pg, """(() => { const f0 = emo106BotsGol, a = RQ.placar.slice(); let t = null; emo106BotsGol = x => { t = x; return 0; };
          try { rqGol(1); } finally { emo106BotsGol = f0; } const fez = RQ.placar[0] > a[0] ? 0 : RQ.placar[1] > a[1] ? 1 : -1; return {t, fez, placar:RQ.placar.slice()}; })()""")
        P.confere(gol['fez'] >= 0 and gol['t'] == gol['fez'], '   o gol de verdade chama o sorteio (com o time que marcou)', gol)
    finally:
        ERROS.extend(sem_rede(pg.erros)); await ctx.close()


# ---------------------------------------------------------------------------------------------------------------- 5) a chave dos Ajustes
async def ajustes(P, b):
    print('\n5) Ajustes › Visual: os emojis dos outros na partida')
    ctx, pg = await pagina(b, 1280, 720, toque=False)
    try:
        await rt(pg, "ajxAbre('visual'); 1"); await pg.wait_for_timeout(300)
        a = await rt(pg, """(() => { const b = document.getElementById('aj-emotes-outros'), l = b && b.closest('.aj-lin'), ant = l && l.previousElementSibling;
          return {tem:!!b, p:b && b.getAttribute('aria-pressed'), tit:l && l.querySelector('b').textContent, nota:l && l.querySelector('small').textContent, sec:l && l.closest('.ajx-sec').dataset.aba,
            depois:ant && ant.querySelector('#aj-replay') ? 'replay' : ant && ant.textContent.slice(0, 30), vis:!!l && l.getBoundingClientRect().height > 10}; })()""")
        P.confere(a['tem'] and a['p'] == 'true' and a['tit'] == 'Emojis dos outros na partida' and a['sec'] == 'visual' and a['depois'] == 'replay' and a['vis'],
                  'Ajustes › Visual, depois do Replay do gol: "Emojis dos outros na partida", ligada no começo', a)
        await pg.click('#aj-emotes-outros'); await pg.wait_for_timeout(200)
        a = await rt(pg, "({p:document.getElementById('aj-emotes-outros').getAttribute('aria-pressed'), outros:RachaEmotes106.estado().outros, chave:localStorage.getItem('racha-emotes-outros-v106')})")
        P.confere(a == {'p': 'false', 'outros': False, 'chave': '0'}, 'tocar desliga (e fica guardado no aparelho)', a)
        await pg.screenshot(path=str(SAIDA / 'v106_emotes_ajustes.png'))
        await rt(pg, "ajxFecha(); 1")
        await rt(pg, "(() => { opc.replay = false; return 1; })()")
        await rt(pg, COMECA)
        await espera(pg, "RachaEmotes106.estado().pode && RQ.estado === 'jogo'", 12000)
        r = await rt(pg, "(() => { EMO106.envios = []; const q = RQ.jog.find(x => x !== P); emo106Mostra(q, 'zoando', true); RachaEmotes106.manda('valeu'); return 1; })()")
        await asyncio.sleep(.3)
        d = await rt(pg, "RachaEmotes106.estado().desenhados.map(x => x.k + ':' + x.e)")
        P.confere(d == ['eu:valeu'], 'desligada: o balão do bot (e dos outros) não aparece; o seu aparece', d)
        await rt(pg, "ajxAbre('visual'); 1"); await pg.wait_for_timeout(200)
        await pg.click('#aj-emotes-outros'); await pg.wait_for_timeout(200)
        await rt(pg, "ajxFecha(); 1"); await pg.wait_for_timeout(200)
        await rt(pg, "(() => { const q = RQ.jog.find(x => x !== P); emo106Mostra(q, 'zoando', true); return 1; })()")
        await asyncio.sleep(.3)
        d = await rt(pg, "RachaEmotes106.estado().desenhados.map(x => x.k.replace(/:\\d+$/, '') + ':' + x.e).sort()")
        chave = await rt(pg, "localStorage.getItem('racha-emotes-outros-v106')")
        P.confere('bot:zoando' in d and chave is None, 'ligada de novo: os dos outros voltam a aparecer', [d, chave])
    finally:
        ERROS.extend(sem_rede(pg.erros)); await ctx.close()
    ctx, pg = await pagina(b, 1280, 720, toque=False, armazenamento={'racha-emotes-outros-v106': '0'})
    try:
        a = await rt(pg, "({outros:RachaEmotes106.estado().outros, p:document.getElementById('aj-emotes-outros').getAttribute('aria-pressed')})")
        P.confere(a == {'outros': False, 'p': 'false'}, '   desligada e o jogo aberto de novo: continua desligada', a)
    finally:
        ERROS.extend(sem_rede(pg.erros)); await ctx.close()


# ---------------------------------------------------------------------------------------------------------------- 6) o teclado
PAD = r"""(() => {
  const bts = []; for (let i = 0; i < 17; i++) bts.push({pressed:false, value:0, touched:false});
  window.__pad = {id:'Controle de teste (STANDARD GAMEPAD Vendor: 045e Product: 02e0)', index:0, connected:true, mapping:'standard', axes:[0, 0, 0, 0], buttons:bts, timestamp:0, vibrationActuator:null};
  window.__pads = [window.__pad, null, null, null];
  Object.defineProperty(navigator, 'getGamepads', {configurable:true, value:() => window.__pads});
  const e = new Event('gamepadconnected'); e.gamepad = window.__pad; window.dispatchEvent(e);
  return true; })()"""


async def toque_pad(pg, i, ms=140):
    await rt(pg, "(() => { const b = window.__pad.buttons[%d]; b.pressed = true; b.value = 1; return 1; })()" % i)
    await pg.wait_for_timeout(ms)
    await rt(pg, "(() => { const b = window.__pad.buttons[%d]; b.pressed = false; b.value = 0; return 1; })()" % i)
    await pg.wait_for_timeout(140)


async def teclado(P, b):
    print('\n6) o teclado (E abre a cruz, 1 a 5 mandam, Esc fecha) e o controle (SELECT e o direcional)')
    ctx, pg = await pagina(b, 1280, 720, toque=False)
    try:
        await rt(pg, "(() => { opc.replay = false; return 1; })()")
        await rt(pg, COMECA)
        await espera(pg, "RachaEmotes106.estado().pode && RQ.estado === 'jogo'", 12000)
        await pg.mouse.click(640, 690); await pg.wait_for_timeout(100)
        await pg.keyboard.press('KeyE'); await pg.wait_for_timeout(200)
        aberta = await rt(pg, "EMO106.cruz && !EMO106.el.cruz.hidden")
        await pg.keyboard.press('Digit4'); await pg.wait_for_timeout(300)
        d = await rt(pg, "({cruz:EMO106.cruz, e:(EMO106.desenhados[0] || {}).e})")
        P.confere(aberta and d == {'cruz': False, 'e': 'bravo'}, 'E abre a cruz; o 4 manda o da direita (BRAVO) e fecha', [aberta, d])
        await pg.keyboard.press('KeyE'); await pg.wait_for_timeout(150)
        await pg.keyboard.press('Escape'); await pg.wait_for_timeout(250)
        f = await rt(pg, "({cruz:EMO106.cruz, pausa:PAUSA.aberta})")
        P.confere(f == {'cruz': False, 'pausa': False}, 'Esc fecha a cruz sem abrir a pausa', f)
        await asyncio.sleep(1.6)
        await rt(pg, "EMO106.baloes.clear()")
        await pg.keyboard.press('Digit2'); await pg.wait_for_timeout(250)
        n = await rt(pg, "EMO106.baloes.size")
        P.confere(n == 0, 'sem a cruz aberta, os números não mandam nada', n)
        await rt(pg, "(() => { TECLA.acoes.passe = ['Space', 'KeyE']; teclaSalva(); return 1; })()")
        await pg.keyboard.press('KeyE'); await pg.wait_for_timeout(200)
        x = await rt(pg, "({cruz:EMO106.cruz, mapa:TECLA.mapa.KeyE})")
        await rt(pg, "(() => { TECLA.acoes = teclaPadrao(); teclaSalva(); return 1; })()")
        P.confere(not x['cruz'] and x['mapa'] == 'Space', 'o E escolhido para uma ação (Ajustes › Controles › Teclado) fica com ela: a cruz não abre', x)
        # o controle (um controle "standard" de mentira, como no tests/v88_controle_test.py)
        await rt(pg, PAD); await pg.wait_for_timeout(300)
        await rt(pg, "(() => { EMO106.envios = []; EMO106.baloes.clear(); return 1; })()")
        await toque_pad(pg, 8)
        c1 = await rt(pg, "EMO106.cruz")
        await toque_pad(pg, 12)
        d1 = await rt(pg, "({cruz:EMO106.cruz, e:[...EMO106.baloes.values()].map(b => b.e)})")
        await asyncio.sleep(1.6)
        await rt(pg, "EMO106.baloes.clear()")
        await toque_pad(pg, 8); await toque_pad(pg, 8)
        d2 = await rt(pg, "({cruz:EMO106.cruz, e:[...EMO106.baloes.values()].map(b => b.e)})")
        P.confere(c1 and d1 == {'cruz': False, 'e': ['valeu']} and d2 == {'cruz': False, 'e': ['comemorando']},
                  'no controle: o SELECT abre a cruz, o direcional para cima manda o de cima (VALEU) e o SELECT de novo manda o do meio (COMEMORANDO)', [c1, d1, d2])
    finally:
        ERROS.extend(sem_rede(pg.erros)); await ctx.close()


# ---------------------------------------------------------------------------------------------------------------- 7) online com duas sessões
JOGA = "NET49.playing && !NET49.host && NET49.localSlot >= 0 && NET49.lastTick > 0"


async def online(P, pw):
    print('\n7) online com duas sessões (o servidor da turma de verdade)')
    porta = porta_livre()
    srv = subprocess.Popen(['node', str(RAIZ / 'tests' / 'servidor_visitantes.cjs'), '--porta', str(porta), '--host', '127.0.0.1', '--memoria', '--estaticos', str(RAIZ),
                            '--nome', 'Teste v106', '--sem-p2p'], stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    time.sleep(.9)
    url = 'http://127.0.0.1:%d/tests/build/racha_teste.html' % porta
    A = Bp = None
    try:
        A = await sessao(pw, url, 'Ana', 844, 390); Bp = await sessao(pw, url, 'Beto')
        for pg in (A, Bp):
            await rt(pg, "abreTela('amigos')")
        await espera(A, "!!NET49.id", 10000); await espera(Bp, "!!NET49.id", 10000)
        await rt(A, "(() => { Object.assign(SX.form, {onde:'online', pub:true, n:1, map:0, jogo:'futebol', tempo:0, bots:false, nome:'v106'}); sxCriar(); return 1; })()")
        cod = await espera(A, "NET49.room && NET49.room.code", 8000)
        await rt(Bp, "(() => { net49Send({type:'join', code:%s, slot:1}); return 1; })()" % json.dumps(cod))
        await espera(A, "NET49.room && NET49.room.members.length === 2", 8000)
        await rt(A, "(() => { const b = document.querySelector('.v70-sl-atalhos .entrar'); if (b) b.click(); return 1; })()")
        await espera(A, "NET49.room.roster.indexOf(NET49.id) >= 0 && NET49.room.roster.every(Boolean)", 8000)
        await rt(A, "slIniciar()")
        ok = await espera(A, JOGA, 12000) and await espera(Bp, JOGA, 12000)
        for pg in (A, Bp):
            await rt(pg, "(() => { filaPop.length = 0; if (!LB.pop.hidden) fechaPop(); return 1; })()")
        pode = await espera(A, "RachaEmotes106.estado().pode", 8000) and await espera(Bp, "RachaEmotes106.estado().pode", 8000)
        P.confere(bool(ok and pode), 'a sala 1v1 no servidor: os dois jogando, com o botão do emoji', [await rt(A, "NET49.room && NET49.room.state"), pode])
        idA = await rt(A, "NET49.id")
        env = await rt(A, "(() => { window.__env = []; const ws = NET49.ws, s0 = ws.send.bind(ws); ws.send = t => { try { const m = JSON.parse(t); if (m.type === 'emote') window.__env.push(m); } catch (_) {} return s0(t); }; return RachaEmotes106.manda('zoando'); })()")
        chegou = await espera(Bp, "EMO106.recebidos >= 1 && (EMO106.desenhados || []).length > 0", 5000, 50)
        await asyncio.sleep(.15)
        vb = await rt(Bp, """(() => { const d = EMO106.desenhados[0], q = RQ.jog.find(x => x.netId === %s); if (!d || !q) return null; const a = VIS.a == null ? 1 : VIS.a;
          const wx = q.ax + (q.x - q.ax)*a + (q.ex || 0), wy = q.ay + (q.y - q.ay)*a + (q.ey || 0), sx = W/2 + (wx - cam.x)*cam.z, sy = H/2 + (wy - cam.y)*cam.z;
          return {k:d.k, e:d.e, dx:Math.round(d.alvo[0] - sx), dy:Math.round(d.alvo[1] - sy), acima:d.y < sy}; })()""" % json.dumps(idA))
        va = await rt(A, "((EMO106.desenhados || [])[0] || {}).k")
        envios = await rt(A, "window.__env")
        P.confere(env and envios == [{'type': 'emote', 'e': 'zoando'}], 'a Ana manda ZOANDO: vai para o servidor {type:"emote", e:"zoando"}', envios)
        P.confere(bool(chegou) and vb and vb['k'] == idA and vb['e'] == 'zoando' and abs(vb['dx']) < 30 and abs(vb['dy']) < 30 and vb['acima'] and va == idA,
                  'o Beto vê o balão da Ana em cima da tampinha DELA na tela dele (e a Ana vê o dela)', [chegou, vb, va])
        await rt(Bp, FICA)
        await Bp.screenshot(path=str(SAIDA / 'v106_emotes_balao_online.png'))
        # o servidor confere o ritmo e o id (o jogo passado por cima, direto pela rede)
        await asyncio.sleep(1.15)
        n0 = await rt(Bp, "EMO106.recebidos")
        await rt(A, "(() => { for (let i = 0; i < 6; i++) net49Send({type:'emote', e:'rindo'}); return 1; })()")
        await asyncio.sleep(.8)
        n1 = await rt(Bp, "EMO106.recebidos")
        P.confere(n1 - n0 == 1, 'pela rede: 6 emojis seguidos (o aparelho passado por cima), o servidor deixa passar 1 (1 a cada 1 s)', [n0, n1])
        await asyncio.sleep(1.15)
        await rt(A, "(() => { for (const e of ['xyz', 'RINDO', '', 7, null]) net49Send({type:'emote', e}); net49Send({type:'emote'}); return 1; })()")
        await asyncio.sleep(.8)
        n2 = await rt(Bp, "EMO106.recebidos")
        P.confere(n2 == n1, '   o que não é da lista não chega (o servidor confere o id)', [n1, n2])
        # os dos outros desligados no Beto: chega, mas não aparece
        await rt(Bp, "(() => { EMO106.outros = false; emo106GravaOutros(); return 1; })()")
        await asyncio.sleep(.3)
        await rt(A, "(() => { EMO106.envios = []; return RachaEmotes106.manda('valeu'); })()")
        chegou2 = await espera(Bp, "EMO106.recebidos > %d" % n2, 4000, 50)
        await asyncio.sleep(.25)
        dB = await rt(Bp, "RachaEmotes106.estado().desenhados.length")
        await rt(Bp, "(() => { EMO106.outros = true; emo106GravaOutros(); return 1; })()")
        P.confere(bool(chegou2) and dB == 0, 'com "Emojis dos outros" desligado, o do outro chega e não aparece', [chegou2, dB])
        # o jogo de antes: o net49Message de antes da v106 recebe a mensagem nova e não faz nada (nem erro, nem aviso)
        antes = await rt(Bp, """(() => { const t0 = (document.getElementById('x49-toast') || {}).textContent || '', n = EMO106.baloes.size; let erro = '';
          try { net49MessageAntes106({type:'emote', id:%s, e:'rindo'}); net49MessageAntes106({type:'emote'}); net49MessageAntes106({type:'emote', id:5, e:{}}); } catch (e) { erro = String(e); }
          return {erro, toast:((document.getElementById('x49-toast') || {}).textContent || '') === t0, n:EMO106.baloes.size === n, jogando:NET49.playing}; })()""" % json.dumps(idA))
        P.confere(antes == {'erro': '', 'toast': True, 'n': True, 'jogando': True}, 'o jogo de antes (o net49Message sem a v106) ignora a mensagem nova: nem erro, nem aviso, a partida segue', antes)
        # no celular, online: o botão não encosta na barra da sala (SALA XXXX · ms), no canto de cima
        await asyncio.sleep(.6)
        g = await rt(A, GEO)
        P.confere(g['barra'] and g['bt'] and not cruza(g['bt'], g['barra']) and not cruza(g['bt'], g['jog']) and not cruza(g['bt'], g['falas']) and not any(no_circulo(g['bt'], c) for c in g['ctl']),
                  'no celular (844 × 390), online: o botão do emoji longe da barra da sala, dos outros botões e dos controles', [g['bt'], g['barra'], g['est']['lugar']])
        await A.screenshot(path=str(SAIDA / 'v106_emotes_online_844x390.png'))
        er = [e for pg in (A, Bp) for e in sem_rede(pg.erros)]
        P.confere(not er, '   nenhum erro de JavaScript (online)', er[:3])
    finally:
        for pg in (A, Bp):
            if pg:
                try: await pg.b.close()
                except Exception: pass
        srv.terminate()
        try: srv.wait(timeout=5)
        except Exception: srv.kill()


# ---------------------------------------------------------------------------------------------------------------- 8) o servidor (Node)
def servidor(P):
    print('\n8) o servidor (node tests/v106_emotes_servidor_test.js)')
    r = subprocess.run(['node', str(RAIZ / 'tests' / 'v106_emotes_servidor_test.js')], cwd=str(RAIZ), capture_output=True, text=True, timeout=120)
    n = 0
    for linha in r.stdout.splitlines():
        m = re.match(r'\s+(ok|FALHOU)\s+(.*)', linha)
        if m:
            n += 1
            P.confere(m.group(1) == 'ok', 'servidor: ' + m.group(2).strip())
    P.confere(r.returncode == 0 and n >= 20, '   o teste do servidor terminou sem falha (%d verificações)' % n, (r.stdout + r.stderr)[-400:])


async def principal():
    P = Placar('v106 · os emojis da partida')
    async with async_playwright() as pw:
        b = await pw.chromium.launch(executable_path=CHROME, args=['--no-sandbox', '--autoplay-policy=no-user-gesture-required'])
        try:
            await emojis(P, b)
            await lugares(P, b)
            await hud(P, b)
            await balao(P, b)
            await ajustes(P, b)
            await teclado(P, b)
        finally:
            await b.close()
        if '--sem-online' not in sys.argv:
            await online(P, pw)
    if '--sem-online' not in sys.argv:
        servidor(P)
    P.confere(not ERROS, 'nenhum erro de JavaScript (contra os bots, o treino, os Ajustes e o teclado)', ERROS[:4])
    return P.fim()


if __name__ == '__main__':
    sys.exit(asyncio.run(principal()))
