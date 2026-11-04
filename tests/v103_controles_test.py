"""v103 · OS CONTROLES DO JEITO DE CADA UM — o controle (a API Gamepad, com um controle simulado no navegador, como no
tests/v88_controle_test.py), o teclado e o analógico sem atraso (tools/v103/controles.js):
  1) Ajustes › Controles › Controle com um DualSense (PlayStation): o grupo antes do teclado, os botões com ✕ ○ □ △ L1 R1…,
     e os nomes mudando quando outro controle conecta (Xbox A B X Y, genérico "Botão n");
  2) a troca de botão: toca na ação e aperta o botão no controle (CHUTE no □: o CURVA fica com o ○), cancelar (Esc), o
     tempo esgotado, o direcional e o botão do sistema recusados;
  3) as regras de conflito: o botão sai da ação que tinha dois; o único botão de uma ação troca de lugar (nenhuma fica sem
     botão) ou a troca é recusada; Backspace apaga o segundo; os menus têm os botões deles;
  4) os jeitos prontos (PADRÃO, ESTILO FIFA, INVERTIDO) e o V88PAD.troca da v88;
  5) guardado: depois de recarregar continua; o "Trocar A e B" guardado pela v88 vira o INVERTIDO; com o armazenamento
     bloqueado o jogo funciona (só não guarda);
  6) na partida: o CHUTE no □ chuta de verdade (a mesma força da tecla K) e o ✕ passa; os menus seguem o mapa (CONFIRMAR e
     VOLTAR) e o START é a pausa;
  7) o teclado: a seção aparece no computador, a PAUSA na tecla P, a CAVADINHA trocada para o E arma a cavadinha na sala
     com os chutes do Rachão (e o controle arma, curva e segura o SUPER), as dicas com as teclas e os botões de cada um;
  8) o analógico da tela começa a andar a 6% do curso (era 15%) no MESMO quadro, o dedo parado (4%) não anda; quem tinha o
     padrão antigo guardado nos ajustes finos passa para o novo;
  9) o controle sem quadro de atraso (a direção nova vale no quadro em que o controle mudou), a zona morta menor e o
     deslizante dela, a direção igual à do analógico da tela (as 32 direções ou a livre do motor próprio);
 10) a vibração do controle no chute (vibrationActuator) e o botão TESTAR; 11) o celular deitado.
Capturas: tests/saida/v103_controle_ps.png, v103_controle_ps_2.png, v103_captura.png, v103_teclado.png, v103_celular.png.

Rodar:  python3 tests/v103_controles_test.py
"""
import json, math, time
from comum import abre, rt, roda, Placar, async_playwright, RAIZ, CHROME, HARNESS, FONTES

SAIDA = RAIZ / 'tests' / 'saida'; SAIDA.mkdir(exist_ok=True)
ID_PS = 'DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)'
ID_XBOX = 'Xbox Wireless Controller (STANDARD GAMEPAD Vendor: 045e Product: 0b13)'
ID_GEN = 'USB Gamepad (STANDARD GAMEPAD Vendor: 0079 Product: 0006)'

# um controle "standard" simulado (o navegador de teste não tem controle); vibra=True põe um vibrationActuator que anota
PAD = r"""((id, vibra, mapa) => {
  const velho = window.__pad;
  if (velho){ velho.connected = false; window.__pads = [null, null, null, null]; const e = new Event('gamepaddisconnected'); e.gamepad = velho; window.dispatchEvent(e); }
  const bts = []; for (let i = 0; i < 17; i++) bts.push({pressed:false, value:0, touched:false});
  window.__vib = window.__vib || [];
  const va = vibra ? {type:'dual-rumble', playEffect(t, o){ window.__vib.push([t, o]); return Promise.resolve('complete'); }, reset(){ return Promise.resolve('complete'); }} : null;
  window.__pad = {id, index:0, connected:true, mapping:mapa == null ? 'standard' : mapa, axes:[0, 0, 0, 0], buttons:bts, timestamp:0, vibrationActuator:va};
  window.__pads = [window.__pad, null, null, null];
  Object.defineProperty(navigator, 'getGamepads', {configurable:true, value:() => window.__pads});
  const e = new Event('gamepadconnected'); e.gamepad = window.__pad; window.dispatchEvent(e);
  return true; })(%s, %s, %s)"""


def pad(id, vibra=False, mapa='standard'):
    return PAD % (json.dumps(id), 'true' if vibra else 'false', json.dumps(mapa))


SOLTA = "(() => { window.__pad.axes = [0, 0, 0, 0]; for (const b of window.__pad.buttons){ b.pressed = false; b.value = 0; } return 1; })()"
EST = "RachaControles103.estado()"
UM_QUADRO = "() => new Promise(r => requestAnimationFrame(() => r(true)))"


def bt(i, on):
    return "(() => { const b = window.__pad.buttons[%d]; b.pressed = %s; b.value = %d; return 1; })()" % (i, 'true' if on else 'false', 1 if on else 0)


def eixo(x, y):
    return "(() => { window.__pad.axes[0] = %r; window.__pad.axes[1] = %r; return 1; })()" % (x, y)


async def quadros(pg, n=2):                              # espera n quadros do jogo (o controle é lido no começo de cada um)
    for _ in range(n):
        await pg.evaluate(UM_QUADRO)


async def toque(pg, i, ms=120):                          # apertar e soltar: o jogo vê o botão apertado e solto (mesmo com a máquina ocupada)
    await rt(pg, bt(i, True)); await quadros(pg); await pg.wait_for_timeout(ms)
    await rt(pg, bt(i, False)); await quadros(pg); await pg.wait_for_timeout(60)


async def espera(pg, js, ms=6000):
    t0 = time.time()
    while True:
        try:
            v = await rt(pg, js)
        except Exception:
            v = None
        if v:
            return v
        if (time.time() - t0)*1000 > ms:
            return v
        await pg.wait_for_timeout(80)


async def slot(pg, acao, i):                              # o clique de verdade (o Playwright rola até ele)
    await pg.click('#pop-ajustes .v103-slot[data-pad="%s"][data-i="%d"]' % (acao, i))
    await pg.wait_for_timeout(80)


async def recarrega(pg):
    await pg.reload()
    await pg.wait_for_function('() => typeof window.__RT === "function"', polling=100, timeout=20000)
    await pg.wait_for_timeout(600)
    await pg.evaluate("(() => { const o = document.getElementById('onb'); if (o) o.hidden = true; const b = [...document.querySelectorAll('#v84auth button')].find(x => /TREINAR OFFLINE/.test(x.textContent || '')); if (b) b.click(); })()")
    await pg.wait_for_timeout(100)
    await rt(pg, HARNESS)


async def abre_bloqueado(pw):
    """o jogo com o armazenamento bloqueado (localStorage joga erro, como no modo privado de alguns navegadores)"""
    b = await pw.chromium.launch(executable_path=CHROME, args=['--no-sandbox', '--autoplay-policy=no-user-gesture-required'])
    ctx = await b.new_context(viewport={'width': 1280, 'height': 720}, has_touch=False)
    await ctx.add_init_script("document.addEventListener('DOMContentLoaded',()=>{const s=document.createElement('style');s.textContent=%s;document.head.prepend(s);});" % json.dumps(FONTES))
    await ctx.add_init_script('window.RACHA_CONFIG = {"presente": false};')
    await ctx.add_init_script("Object.defineProperty(window, 'localStorage', {configurable:true, get(){ throw new DOMException('O armazenamento está bloqueado', 'SecurityError'); }});")
    pg = await ctx.new_page()
    erros = []
    pg.on('pageerror', lambda e: erros.append(str(e)[:300]))
    pg.on('console', lambda m: erros.append('console: ' + m.text[:200]) if m.type == 'error' else None)
    from comum import PAGINA
    await pg.goto(PAGINA.resolve().as_uri())
    await pg.wait_for_function('() => typeof window.__RT === "function"', polling=100, timeout=20000)
    await pg.wait_for_timeout(600)
    await pg.evaluate("(() => { const o = document.getElementById('onb'); if (o) o.hidden = true; const b = [...document.querySelectorAll('#v84auth button')].find(x => /TREINAR OFFLINE/.test(x.textContent || '')); if (b) b.click(); })()")
    await pg.wait_for_timeout(100)
    await rt(pg, HARNESS)
    return b, pg, erros


COLA = "(() => { P.vx = P.vy = 0; B.x = P.x + P.r + B.r + .5; B.y = P.y; B.vx = B.vy = 0; B.w = 0; return 1; })()"
VEL = "Math.hypot(B.vx, B.vy)"
TREINO = "(() => { if (RQ.on) rqSai(); if (!AJX.raiz.hidden) ajxFecha(); abrirLobby(); trEscolhe('livre'); jogarTreino(); return 1; })()"
# o dedo no analógico da tela (o fixo: o toque no meio dele e o dedo andando f do curso para a direita)
DEDO = r"""((tipo, f) => { const rc = cv.getBoundingClientRect(), k = rc.width / W, e = hud.joy, R = JOY.max*e.al*e.s;
  cv.dispatchEvent(new PointerEvent(tipo, {pointerId:7, clientX:rc.left + (e.x + R*f)*k, clientY:rc.top + e.y*k, bubbles:true, cancelable:true, pointerType:'touch', isPrimary:true}));
  return 1; })(%s, %r)"""
JOGA = "NET49.playing && !NET49.host && NET49.localSlot >= 0 && NET49.lastTick > 0 && !(V93P.contagem && v93Contando())"
DICA_TREINO = 'WASD mover · Espaço passe · K chute · R reiniciar · 1-4 tamanho · C campo · T treino · H HUD · Esc lobby'


async def principal():
    P = Placar('v103 · os controles (o controle, o teclado e o analógico sem atraso)')
    async with async_playwright() as pw:
        b, pg, erros = await abre(pw, 1280, 720, toque=False)
        u = await rt(pg, "U(1)")

        # ---------------------------------------------------------------- 1) o grupo e o controle do PlayStation
        print('\n1) Ajustes › Controles › Controle')
        r = await rt(pg, """(() => { ajxAbre('controles'); const s = AJX.secs.controles, gs = [...s.querySelectorAll(':scope > .ajx-grupo')];
          const g = document.querySelector('.v103-pad'), tec = TECLA.lista.closest('.ajx-grupo'), U = RachaControles103.V103.ui;
          return {st:U.st.textContent, corpo:U.corpo.hidden, ordem:gs.indexOf(g) >= 0 && gs.indexOf(g) < gs.indexOf(tec), grupos:document.querySelectorAll('#pop-ajustes .v88-aj-pad').length, ativo:V88PAD.ativo}; })()""")
        P.confere(r['st'].startswith('Nenhum controle') and r['corpo'] and r['ordem'] and r['grupos'] == 1 and not r['ativo'],
                  'sem controle: o grupo Controle (um só, antes do Teclado) diz que não tem e fica curto', r)
        await rt(pg, pad(ID_PS)); await pg.wait_for_timeout(250)
        r = await rt(pg, """(() => { const U = RachaControles103.V103.ui, s = a => document.querySelector('.v103-slot[data-pad="' + a + '"][data-i="0"]');
          return {st:U.st.textContent, corpo:U.corpo.hidden, fam:RachaControles103.estado().fam,
            passe:[s('passe').dataset.bt, s('passe').getAttribute('aria-label')], chute:[s('chute').dataset.bt, s('chute').getAttribute('aria-label')],
            ps:!!s('chute').querySelector('.v103-gl.v103-ps svg'), sup:s('sup').textContent, cav:s('cav').getAttribute('aria-label'), pausa:s('pausa').textContent,
            jeitos:[...document.querySelectorAll('.v103-jeito')].map(b => [b.dataset.jeito, b.getAttribute('aria-pressed'), [...b.querySelectorAll('small .v103-gl')].map(g => g.dataset.bt).join('')]),
            ginga:document.querySelector('.v103-grupo[data-grupo="ginga"]').hidden, linhas:document.querySelectorAll('.v103-acao[data-pad]').length}; })()""")
        P.confere(r['st'].startswith('Conectado: DualSense Wireless Controller') and 'PlayStation' in r['st'] and not r['corpo'] and r['fam'] == 'ps',
                  'conectou um DualSense: "Conectado", os botões do PlayStation e o resto do grupo aparece', r['st'])
        P.confere(r['passe'][0] == '0' and 'xis' in r['passe'][1] and r['chute'][0] == '1' and 'bola' in r['chute'][1] and r['ps'] and r['sup'] == 'R2' and 'triângulo' in r['cav'] and r['pausa'] == 'OPTIONS',
                  'os botões com os nomes do PlayStation: PASSE ✕, CHUTE ○ (desenhados), CAVADINHA △, SUPER R2, PAUSA OPTIONS', r)
        P.confere(r['jeitos'] == [['padrao', 'true', '01'], ['fifa', 'false', '021'], ['invertido', 'false', '10']] and r['ginga'] and r['linhas'] == 12,
                  'os jeitos prontos com os botões deste controle (PADRÃO aceso) e as 12 ações (a GINGA guardada fica escondida)', r)
        ROLA = "(() => { const g = document.querySelector(%s), c = AJX.raiz.querySelector('.ajx-corpo'); c.scrollTop += g.getBoundingClientRect().top - c.getBoundingClientRect().top - 6; return 1; })()"
        await rt(pg, ROLA % json.dumps('.v103-pad'))
        await pg.wait_for_timeout(200)
        await pg.screenshot(path=str(SAIDA / 'v103_controle_ps.png'))
        await rt(pg, ROLA % json.dumps('.v103-grupo[data-grupo="rachao"]'))
        await pg.wait_for_timeout(150)
        await pg.screenshot(path=str(SAIDA / 'v103_controle_ps_2.png'))

        print('\n2) outro controle: os nomes mudam')
        NOMES = "(() => ['passe', 'chute', 'curva', 'sup', 'pausa'].map(a => document.querySelector('.v103-slot[data-pad=\"' + a + '\"][data-i=\"0\"]').textContent))()"
        await rt(pg, pad(ID_XBOX)); await pg.wait_for_timeout(250)
        x = await rt(pg, NOMES); stx = await rt(pg, "RachaControles103.V103.ui.st.textContent")
        await rt(pg, pad(ID_GEN)); await pg.wait_for_timeout(250)
        g = await rt(pg, NOMES)
        await rt(pg, pad('Controle esquisito (Vendor: 1234 Product: 5678)', False, '')); await pg.wait_for_timeout(250)
        n = await rt(pg, "({st:RachaControles103.V103.ui.st.textContent, fam:RachaControles103.estado().fam})")
        await rt(pg, pad(ID_PS)); await pg.wait_for_timeout(250)
        p = await rt(pg, NOMES)
        P.confere(x == ['A', 'B', 'X', 'RT', 'MENU'] and 'Xbox' in stx, 'um controle do Xbox: A, B, X, RT e MENU', [x, stx])
        P.confere(g == ['Botão 1', 'Botão 2', 'Botão 3', 'Botão 8', 'Botão 10'], 'um controle genérico: "Botão n"', g)
        P.confere(n['fam'] == 'gen' and 'mapa diferente do padrão' in n['st'], 'um controle sem o mapa padrão: os botões numerados e o aviso', n)
        P.confere(p[0] == '' and p[3] == 'R2' and p[4] == 'OPTIONS', 'o DualSense de volta: os símbolos do PlayStation (desenhados) de novo', p)

        # ---------------------------------------------------------------- 3) a troca de botão
        print('\n3) a troca: toca na ação e aperta o botão no controle')
        await slot(pg, 'chute', 0)
        r = await rt(pg, "(() => { const s = document.querySelector('.v103-slot[data-pad=\"chute\"][data-i=\"0\"]'); return {e:RachaControles103.estado(), txt:s.textContent, on:s.classList.contains('on'), lin:s.closest('.v103-acao').classList.contains('v103-cap')}; })()")
        P.confere(r['e']['cap'] == {'id': 'chute', 'i': 0} and r['txt'] == 'aperte…' and r['on'] and r['lin'] and r['e']['msg'].startswith('Aperte no controle o botão para CHUTE…'),
                  'tocou no CHUTE: "aperte…" e o aviso para apertar o botão no controle (com o tempo)', r)
        await pg.screenshot(path=str(SAIDA / 'v103_captura.png'))
        await toque(pg, 2)
        r = await rt(pg, "({e:RachaControles103.estado(), salvo:JSON.parse(localStorage.getItem('racha-controle-v103'))})")
        P.confere(r['e']['mapa']['chute'] == [2] and r['e']['mapa']['curva'] == [1] and r['e']['cap'] is None and r['e']['msg'] == '□ agora é CHUTE e ○ foi para CURVA (os dois trocaram).',
                  'apertou o □: o CHUTE fica no □ e a CURVA (que era do □) fica com o ○ — nenhuma ação sem botão', r['e'])
        P.confere(r['salvo']['mapa']['chute'] == [2] and r['e']['jeito'] == 'fifa', 'fica guardado (racha-controle-v103) e é o ESTILO FIFA', [r['salvo']['mapa'], r['e']['jeito']])
        # cancelar, o tempo e os botões que não valem
        await slot(pg, 'passe', 0); await pg.keyboard.press('Escape'); await pg.wait_for_timeout(100)
        r = await rt(pg, "({e:RachaControles103.estado(), aberta:!AJX.raiz.hidden})")
        P.confere(r['e']['cap'] is None and r['e']['msg'] == 'Troca cancelada.' and r['aberta'] and r['e']['mapa']['passe'] == [0], 'Esc cancela a troca (e os Ajustes continuam abertos)', r)
        await slot(pg, 'passe', 0); await slot(pg, 'passe', 0)
        r = await rt(pg, EST)
        P.confere(r['cap'] is None and r['msg'] == 'Troca cancelada.', 'tocar de novo na mesma ação também cancela', r['msg'])
        await rt(pg, "RachaControles103.V103.capMs = 700"); await slot(pg, 'passe', 0); await pg.wait_for_timeout(1100)
        r = await rt(pg, EST); await rt(pg, "RachaControles103.V103.capMs = 8000")
        P.confere(r['cap'] is None and r['msg'] == 'Tempo esgotado: nada mudou.' and r['mapa']['passe'] == [0], 'sem apertar nada, o tempo acaba e nada muda', r['msg'])
        await slot(pg, 'passe', 0); await toque(pg, 12)
        r1 = await rt(pg, EST)
        await toque(pg, 16)
        r2 = await rt(pg, EST)
        await pg.keyboard.press('Escape'); await pg.wait_for_timeout(80)
        P.confere(r1['cap'] and 'direcional' in r1['msg'] and r2['cap'] and 'do sistema' in r2['msg'] and r2['mapa']['passe'] == [0],
                  'o direcional (é para andar) e o botão do sistema (PS) não valem: a troca continua esperando', [r1['msg'], r2['msg']])

        # ---------------------------------------------------------------- 4) as regras de conflito
        print('\n4) as regras de conflito')
        await slot(pg, 'passe', 1); await toque(pg, 6)
        r = await rt(pg, EST)
        P.confere(r['mapa']['passe'] == [0] and r['mapa']['finta'] == [6] and r['msg'] == 'L2 é o único botão de FINTA: troque aquele primeiro.',
                  'o segundo botão do PASSE no L2 (o único da FINTA): recusado, ninguém fica sem botão', r['msg'])
        await slot(pg, 'passe', 1); await toque(pg, 8)
        r = await rt(pg, EST)
        P.confere(r['mapa']['passe'] == [0, 8] and r['msg'] == 'CREATE agora é PASSE.', 'um botão livre (CREATE) vira o segundo do PASSE', r)
        await slot(pg, 'chute', 1); await toque(pg, 8)
        r = await rt(pg, EST)
        P.confere(r['mapa']['chute'] == [2, 8] and r['mapa']['passe'] == [0] and r['msg'] == 'CREATE agora é CHUTE (saiu de PASSE).', 'o CREATE vai para o CHUTE e sai do PASSE (que tinha dois)', r['msg'])
        await slot(pg, 'chute', 1); await pg.keyboard.press('Backspace'); await pg.wait_for_timeout(80)
        r = await rt(pg, EST)
        P.confere(r['mapa']['chute'] == [2] and r['msg'] == 'Segundo botão apagado.', 'Backspace apaga o segundo botão', r['mapa']['chute'])
        await slot(pg, 'pausa', 0); await toque(pg, 0)
        r = await rt(pg, EST)
        P.confere(r['mapa']['pausa'] == [0] and r['mapa']['passe'] == [9] and r['msg'] == '✕ agora é PAUSA e OPTIONS foi para PASSE (os dois trocaram).',
                  'a PAUSA no ✕ (o único do PASSE): os dois trocam (o PASSE fica no OPTIONS)', r['msg'])
        unico = await rt(pg, """(() => { const m = RachaControles103.estado().mapa, ok = Object.values(m).every(l => l.length >= 1 && l.length <= 2);
          const usados = {}; let rep = false; for (const k in m){ const e = (k === 'ok' || k === 'volta') ? 'm' : 'j'; for (const b of m[k]){ if (usados[e + b]) rep = true; usados[e + b] = 1; } } return ok && !rep; })()""")
        P.confere(unico, 'depois de tudo: toda ação com 1 ou 2 botões e nenhum botão em duas ações (na partida e nos menus)', unico)
        await slot(pg, 'ok', 0); await toque(pg, 2)
        r = await rt(pg, EST)
        P.confere(r['mapa']['ok'] == [2] and r['mapa']['chute'] == [2] and r['mapa']['volta'] == [1], 'nos menus os botões são à parte: CONFIRMAR no □ não tira o □ do CHUTE', r['mapa'])

        # ---------------------------------------------------------------- 5) os jeitos prontos e o V88PAD.troca
        print('\n5) os jeitos prontos')
        J = await rt(pg, "JSON.parse(JSON.stringify(RachaControles103.JEITOS))")
        await pg.click('#pop-ajustes .v103-jeito[data-jeito="fifa"]'); await pg.wait_for_timeout(80)
        r = await rt(pg, "({e:RachaControles103.estado(), on:[...document.querySelectorAll('.v103-jeito')].map(b => b.getAttribute('aria-pressed'))})")
        P.confere(r['e']['mapa'] == J['fifa']['mapa'] and r['e']['jeito'] == 'fifa' and r['on'] == ['false', 'true', 'false'] and r['e']['msg'] == 'ESTILO FIFA: ✕ passe, □ chute, ○ curva.',
                  'ESTILO FIFA: ✕ passe, □ chute, ○ curva (o botão aceso)', r)
        await pg.click('#pop-ajustes .v103-jeito[data-jeito="invertido"]'); await pg.wait_for_timeout(80)
        r = await rt(pg, "({e:RachaControles103.estado(), troca:V88PAD.troca, velho:JSON.parse(localStorage.getItem('racha88-controle'))})")
        m = r['e']['mapa']
        P.confere(m['passe'] == [1] and m['chute'] == [0] and m['ok'] == [1] and m['volta'] == [0] and r['troca'] is True and r['velho']['troca'] is True,
                  'INVERTIDO (o "Trocar A e B" da v88): ○ passe, ✕ chute e os menus trocados; V88PAD.troca diz que sim', r)
        await pg.click('#pop-ajustes .v103-jeito[data-jeito="padrao"]'); await pg.wait_for_timeout(80)
        r = await rt(pg, "(() => { const a = {troca:V88PAD.troca, jeito:RachaControles103.estado().jeito}; V88PAD.troca = true; a.depois = RachaControles103.estado().jeito; V88PAD.troca = false; a.volta = RachaControles103.estado().jeito; return a; })()")
        P.confere(r == {'troca': False, 'jeito': 'padrao', 'depois': 'invertido', 'volta': 'padrao'}, 'PADRÃO de volta; V88PAD.troca = true/false (o jeito da v88) troca e destroca', r)

        # ---------------------------------------------------------------- 6) guardado: recarregar
        print('\n6) guardado no aparelho')
        await pg.click('#pop-ajustes .v103-jeito[data-jeito="fifa"]')
        await rt(pg, "(() => { const i = document.querySelector('#v103-zona'); i.value = '20'; i.dispatchEvent(new Event('input', {bubbles:true})); return 1; })()")
        await pg.click('#v103-vibra'); await pg.wait_for_timeout(80)
        antes = await rt(pg, EST)
        await recarrega(pg)
        depois = await rt(pg, EST)
        await rt(pg, pad(ID_PS)); await pg.wait_for_timeout(200)
        P.confere(antes['jeito'] == 'fifa' and abs(antes['zona'] - .2) < 1e-9 and antes['vibra'] is False and depois['mapa'] == antes['mapa'] and abs(depois['zona'] - .2) < 1e-9 and depois['vibra'] is False,
                  'depois de recarregar: o ESTILO FIFA, a zona morta de 20% e a vibração desligada continuam', [antes['zona'], depois['zona'], depois['jeito'], depois['vibra']])

        # ---------------------------------------------------------------- 7) na partida: o CHUTE no □ chuta de verdade
        print('\n7) na partida (o treino livre) com o ESTILO FIFA')
        await rt(pg, "(() => { const i = document.querySelector('#v103-zona'); i.value = '12'; i.dispatchEvent(new Event('input', {bubbles:true})); RachaControles103.V103.vibra = true; return 1; })()")
        await rt(pg, TREINO); await pg.wait_for_timeout(1200)
        P.confere(await rt(pg, "v88PadEmJogo()"), 'o treino livre abre e o controle vale para a partida')
        vel = {}
        for nome, faz in [('pad_quadrado', 2), ('pad_xis', 0), ('tec_K', 'KeyK'), ('tec_espaco', 'Space')]:
            await rt(pg, COLA); await pg.wait_for_timeout(60); await rt(pg, COLA)
            if isinstance(faz, int):
                await toque(pg, faz, 90)
            else:
                await pg.focus('#c'); await pg.keyboard.down(faz); await pg.wait_for_timeout(90); await pg.keyboard.up(faz); await pg.wait_for_timeout(120)
            vel[nome] = await rt(pg, VEL)
            await pg.wait_for_timeout(450)
        P.confere(vel['pad_quadrado'] > vel['pad_xis'] > 0 and abs(vel['pad_quadrado'] - vel['tec_K']) <= .2*vel['tec_K'] and abs(vel['pad_xis'] - vel['tec_espaco']) <= .2*vel['tec_espaco'],
                  'o □ CHUTA (%.1f u/s, a tecla K: %.1f) e o ✕ PASSA (%.1f u/s, o Espaço: %.1f) — o mesmo caminho do teclado' % (vel['pad_quadrado']/u, vel['tec_K']/u, vel['pad_xis']/u, vel['tec_espaco']/u), vel)
        # o START (OPTIONS) é a pausa; nos menus o ○ (VOLTAR) fecha
        await toque(pg, 9)
        r1 = await rt(pg, "PAUSA.aberta")
        await toque(pg, 9)
        r2 = await rt(pg, "PAUSA.aberta")
        await toque(pg, 9); await toque(pg, 1)
        r3 = await rt(pg, "PAUSA.aberta")
        P.confere(r1 is True and r2 is False and r3 is False, 'OPTIONS abre a pausa e fecha; com ela aberta o ○ (VOLTAR) também fecha', [r1, r2, r3])

        # ---------------------------------------------------------------- 8) os menus seguem o mapa
        print('\n8) os menus seguem o mapa (CONFIRMAR e VOLTAR)')
        await rt(pg, "(() => { abrirLobby(); return 1; })()"); await pg.wait_for_timeout(300)
        async def foca():                                   # (os Ajustes põem o foco na aba deles logo depois de abrir: espera e põe na Controles)
            await rt(pg, "(() => { ajxAbre('audio'); return 1; })()"); await pg.wait_for_timeout(250)
            return await rt(pg, "(() => { AJX.abas.controles.focus(); return document.activeElement === AJX.abas.controles; })()")
        await foca(); await toque(pg, 0)
        r1 = await rt(pg, "({aba:AJX.aba, aberta:!AJX.raiz.hidden})")
        await toque(pg, 1)
        r2 = await rt(pg, "({aberta:!AJX.raiz.hidden})")
        P.confere(r1 == {'aba': 'controles', 'aberta': True} and r2 == {'aberta': False}, 'ESTILO FIFA: ✕ confirma (aperta a aba Controles) e ○ volta (fecha os Ajustes)', [r1, r2])
        await rt(pg, "RachaControles103.jeito('invertido')")
        await foca(); await toque(pg, 1)
        r1 = await rt(pg, "({aba:AJX.aba, aberta:!AJX.raiz.hidden})")
        await toque(pg, 0)
        r2 = await rt(pg, "({aberta:!AJX.raiz.hidden})")
        P.confere(r1 == {'aba': 'controles', 'aberta': True} and r2 == {'aberta': False}, 'INVERTIDO: ○ confirma e ✕ volta (o "Trocar A e B" de antes)', [r1, r2])
        await rt(pg, "RachaControles103.jeito('fifa')")
        await rt(pg, "(() => { document.activeElement && document.activeElement.blur && document.activeElement.blur(); return 1; })()")
        await toque(pg, 13)
        r = await rt(pg, "({jogar:document.activeElement === LB.jogar, foco:document.body.classList.contains('v88-pad-foco')})")
        P.confere(r['jogar'] and r['foco'], 'o direcional anda nos menus (o primeiro é o JOGAR)', r)

        # ---------------------------------------------------------------- 9) o teclado
        print('\n9) o teclado')
        await rt(pg, "(() => { ajxAbre('controles'); return 1; })()"); await pg.wait_for_timeout(200)
        r = await rt(pg, """(() => { const g = TECLA.lista.closest('.ajx-grupo'), l = TECLA.lista.querySelector('.ajx-tbt[data-acao="pausa"][data-i="0"]');
          return {vis:g.offsetParent !== null && getComputedStyle(g).display !== 'none', pausa:l && l.textContent, acoes:TECLAS_ACOES.map(a => a[0]),
            rotulo:l && l.closest('.ajx-tecla').querySelector('b').textContent}; })()""")
        P.confere(r['vis'] and r['pausa'] == 'P' and 'PAUSA' in r['rotulo'] and all(a in r['acoes'] for a in ['passe', 'chute', 'curva', 'cav', 'cve', 'cvd', 'sup', 'finta', 'drible', 'pausa']),
                  'o Teclado aparece no computador com todas as ações da partida (PASSE … SUPER, FINTA, DRIBLE e a PAUSA no P)', r)
        await rt(pg, "(() => { const g = TECLA.lista.closest('.ajx-grupo'), c = AJX.raiz.querySelector('.ajx-corpo'); c.scrollTop = g.offsetTop + 260; return 1; })()")
        await pg.wait_for_timeout(150)
        await pg.click('.ajx-teclas .ajx-tbt[data-acao=cav][data-i="0"]'); await pg.keyboard.press('KeyE'); await pg.wait_for_timeout(80)
        r = await rt(pg, "({cav:TECLA.acoes.cav.slice(), e:teclaCanon('KeyE'), q:teclaCanon('KeyQ'), msg:TECLA.msg.textContent})")
        P.confere(r['cav'] == ['KeyE'] and r['e'] == 'KeyQ' and r['q'] != 'KeyQ' and r['msg'].startswith('E agora é CAVADINHA'), 'a CAVADINHA trocada para o E pelo Teclado (o Q fica livre)', r)
        await pg.screenshot(path=str(SAIDA / 'v103_teclado.png'))
        # a PAUSA no P (abre e fecha) e as dicas com as teclas de cada um
        await rt(pg, TREINO); await pg.wait_for_timeout(1000)
        await pg.focus('#c'); await pg.keyboard.press('KeyP'); await pg.wait_for_timeout(450)
        r1 = await rt(pg, "PAUSA.aberta")
        await pg.keyboard.press('KeyP'); await pg.wait_for_timeout(150)
        r2 = await rt(pg, "PAUSA.aberta")
        P.confere(r1 is True and r2 is False, 'P abre a pausa e fecha (o Esc continua)', [r1, r2])
        d1 = await rt(pg, "RachaControles103.dica()")
        await rt(pg, "(() => { TECLA.acoes.passe = ['KeyE', 'KeyJ']; TECLA.acoes.cav = ['KeyQ']; teclaSalva(); return 1; })()")
        d2 = await rt(pg, "RachaControles103.dica()")
        await rt(pg, "(() => { TECLA.acoes = teclaPadrao(); teclaSalva(); return 1; })()")
        await toque(pg, 2, 60); await pg.wait_for_timeout(100)
        d3 = await rt(pg, "({d:RachaControles103.dica(), u:RachaControles103.estado().usando})")
        await pg.keyboard.press('ArrowLeft'); await pg.wait_for_timeout(60)
        d4 = await rt(pg, "RachaControles103.dica()")
        P.confere(d1 == DICA_TREINO and d2 == DICA_TREINO.replace('Espaço passe', 'E passe') and d3['u'] and d3['d'] == 'Analógico mover · ✕ passe · □ chute · OPTIONS pausa' and d4 == DICA_TREINO,
                  'a dica do começo: a de sempre no padrão, a tecla trocada (E passe), os botões do controle quando joga com ele', [d1, d2, d3, d4])
        t = await rt(pg, "(() => { const a = tuPassos().map(p => p.como); RachaControles103.V103.tecladoT = 0; RachaControles103.V103.toqueT = 0; V88PAD.usouT = performance.now(); return {tec:a, pad:tuPassos().map(p => p.como)}; })()")
        P.confere(t['tec'][0] == 'Teclado: WASD ou setas.' and t['pad'][0].startswith('Controle:') and t['pad'][2] == 'CHUTE: botão □.' and t['pad'][3] == 'PASSE: botão ✕.',
                  'o tutorial: as teclas de andar de sempre e, de controle, "CHUTE: botão □" e "PASSE: botão ✕"', t)

        # ---------------------------------------------------------------- 10) os chutes do Rachão na sala neste aparelho (o teclado e o controle)
        print('\n10) os chutes do Rachão na sala (a tecla trocada e o controle)')
        await rt(pg, "(() => { TECLA.acoes.cav = ['KeyE']; teclaSalva(); if (!lobby.aberto) abrirLobby(); return 1; })()")
        await pg.wait_for_timeout(500)                          # (o lobby abrindo: as telas se arrumam antes)
        ok = False
        for _ in range(2):                                      # (a sala neste aparelho, como no tests/v99_chutes_online_test.py)
            await rt(pg, "(() => { abreTela('amigos'); sxNovaSala(); Object.assign(SX.form, {onde:'aqui', jogo:'futebol', n:1, chutes:{lob:true, curva:true, super:true}}); amigosRender(); return 1; })()")
            await pg.wait_for_timeout(300)
            await rt(pg, "(() => { document.querySelector('.sx-pe .sx-criar').click(); return 1; })()")
            ok = await espera(pg, "NET49.room && NET49.room.local && NET49.room.chutes && NET49.room.chutes.super", 4000)
            if ok:
                break
        await rt(pg, "(() => { net49Send({type:'seat', team:0}); return 1; })()"); await pg.wait_for_timeout(250)
        await rt(pg, "slIniciar()")
        ok = ok and await espera(pg, "NET49.playing && !NET49.host && V92N.on && RachaSalas99.estado().local", 9000)
        ok = ok and await espera(pg, JOGA, 12000)
        await rt(pg, "(() => { const c = document.getElementById('v99-cartao'); if (c) c.remove(); return 1; })()")
        P.confere(bool(ok), 'a sala neste aparelho com os três chutes começou', '' if ok else await rt(pg, "(() => { const c = document.querySelector('.sx-pe .sx-criar'); return {room:!!NET49.room, local:NET49.room && NET49.room.local, playing:NET49.playing, slot:NET49.localSlot, tick:NET49.lastTick, lobby:lobby.aberto, tela:lobby.tela, criar:c && [c.textContent, c.disabled, c.offsetParent !== null], form:JSON.stringify(SX.form).slice(0, 200), pop:!LB.pop.hidden && LB.pop.textContent.slice(0, 120), toast:X49UI.toast && X49UI.toast.textContent, aviso:LB.aviso && LB.aviso.textContent}; })()"))
        if ok:
            await pg.focus('#c')
            e0 = await rt(pg, "RachaChutes99.estado()")
            await pg.keyboard.press('KeyE'); await pg.wait_for_timeout(150)
            e1 = await rt(pg, "RachaChutes99.estado()")
            await toque(pg, 3, 80)
            e2 = await rt(pg, "RachaChutes99.estado()")
            await toque(pg, 4, 80); await toque(pg, 5, 80)
            e3 = await rt(pg, "RachaChutes99.estado()")
            P.confere(e1['lb'] == e0['lb'] + 1 and e2['lb'] == e1['lb'] + 1 and e3['ce'] == e2['ce'] + 1 and e3['cd'] == e2['cd'] + 1,
                      'a CAVADINHA na tecla E e no △ do controle; as curvas no L1 e no R1', [e0['lb'], e1['lb'], e2['lb'], e3['ce'], e3['cd']])
            card = await rt(pg, "[cr99Tecla('cav'), cr99Tecla('sup'), RachaControles103.dica()]")
            await rt(pg, bt(7, True)); await pg.wait_for_timeout(300)
            s1 = await rt(pg, "({su:RachaChutes99.estado().su, pad:RachaControles103.estado().supPad, seg:RachaSalas99.partida().jog[0].cr.segura})")
            await rt(pg, bt(7, False)); await pg.wait_for_timeout(250)
            s2 = await rt(pg, "({su:RachaChutes99.estado().su, pad:RachaControles103.estado().supPad})")
            P.confere(s1['su'] and s1['pad'] and s1['seg'] and not s2['su'] and not s2['pad'], 'segurar o R2 carrega o SUPER (o motor da sala vê) e soltar solta', [s1, s2])
            P.confere(card[0] == '△' and card[1] == 'R2' and '△ cavadinha' in card[2] and 'L1/R1 curva' in card[2] and 'R2 super' in card[2],
                      'o cartão e a dica dos chutes mostram os botões do controle (△, L1/R1, R2)', card)
            await rt(pg, "(() => { net49Send({type:'leave'}); return 1; })()")
            await espera(pg, "!SLOC.on", 4000)
        await rt(pg, "(() => { TECLA.acoes = teclaPadrao(); teclaSalva(); if (!lobby.aberto) abrirLobby(); return 1; })()")

        # ---------------------------------------------------------------- 11) o analógico da tela: 6% e no mesmo quadro
        print('\n11) o analógico da tela sem espera')
        r = await rt(pg, "(() => { ajfAbre('controles'); const o = {zl:V92.cfg.zonaLiga, zd:V92.cfg.zonaDesliga, padrao:[V92_PADRAO.zonaLiga, V92_PADRAO.zonaDesliga], faixa:AJF.faixas.zl[0].querySelector('output').textContent}; ajfFecha(false); ajxFecha(); return o; })()")
        P.confere(r['zl'] == .06 and r['zd'] == .04 and r['padrao'] == [.06, .04] and r['faixa'] == '6%', 'o padrão novo: começa a andar a 6% do curso e para abaixo de 4% (os ajustes finos mostram 6%)', r)
        await rt(pg, SOLTA); await rt(pg, TREINO); await pg.wait_for_timeout(1000)
        res = {}
        await rt(pg, DEDO % (json.dumps('pointerdown'), 0.0))
        for f in [.04, .08, .05, .03]:
            await rt(pg, DEDO % (json.dumps('pointermove'), f))
            res[f] = await pg.evaluate("() => new Promise(r => requestAnimationFrame(() => r(window.__RT('V92.ultInp.mx'))))")
        await rt(pg, "(() => { V92.cfg.zonaLiga = .15; V92.cfg.zonaDesliga = .09; AN.ativo = false; return 1; })()")
        await rt(pg, DEDO % (json.dumps('pointermove'), .08))
        velho = await pg.evaluate("() => new Promise(r => requestAnimationFrame(() => r(window.__RT('V92.ultInp.mx'))))")
        await rt(pg, "(() => { V92.cfg.zonaLiga = .06; V92.cfg.zonaDesliga = .04; return 1; })()")
        await rt(pg, DEDO % (json.dumps('pointerup'), 0.0))
        P.confere(res[.04] == 0 and res[.08] == 1 and res[.05] == 1 and res[.03] == 0 and velho == 0,
                  'o dedo a 8%% do curso já anda NO MESMO QUADRO (com os 15%% de antes, não); a 4%% (o dedo parado) não anda; andando, só para abaixo de 4%%', [res, velho])

        # ---------------------------------------------------------------- 12) o controle sem quadro de atraso e a zona morta
        print('\n12) o controle: sem quadro de atraso e a zona morta')
        await pg.wait_for_timeout(300)
        lat = []
        for _ in range(5):
            await rt(pg, eixo(0, 0)); await pg.evaluate(UM_QUADRO); await pg.evaluate(UM_QUADRO)
            lat.append(await pg.evaluate("() => new Promise(r => { window.__pad.axes[0] = 1; requestAnimationFrame(() => r(window.__RT('V92.ultInp.mx'))); })"))
        P.confere(lat == [1]*5, 'o analógico do controle vale no MESMO quadro em que mudou (a v88 só usava no quadro seguinte)', lat)
        zm = {}
        await rt(pg, eixo(0, 0)); await pg.evaluate(UM_QUADRO); await pg.evaluate(UM_QUADRO)   # (parado: a zona morta é de quem está parado)
        for v in [.1, .14, .11, .09]:
            await rt(pg, eixo(v, 0)); await pg.evaluate(UM_QUADRO); await pg.evaluate(UM_QUADRO)
            zm[v] = await rt(pg, "V88PAD.mx")
        P.confere(zm[.1] == 0 and zm[.14] == 1 and zm[.11] == 1 and zm[.09] == 0, 'a zona morta do controle: parado a 0,10 do curso, anda a 0,14 (era 0,28); andando, só para abaixo de 0,10', zm)
        a = math.radians(10)
        await rt(pg, eixo(math.cos(a), math.sin(a))); await pg.wait_for_timeout(100)
        r = await rt(pg, """(() => { const i = getInput(), o = {ang:Math.atan2(i.my, i.mx)*180/Math.PI, igual:i === V92.ultInp};
          const antes = v94Entrada; v94Entrada = () => true; try { const j = getInput(); o.v94 = Math.atan2(j.my, j.mx)*180/Math.PI; o.v94igual = JSON.stringify(j) === JSON.stringify(v94Direcao(V88PAD.mx, V88PAD.my)); } finally { v94Entrada = antes; }
          return o; })()""")
        P.confere(abs(r['ang'] - 11.25) < .01 and r['igual'] and abs(r['v94'] - 10) < .1 and r['v94igual'],
                  'a direção do controle é a do analógico da tela: 10° vira o setor de 11,25° (32 direções) e, no motor próprio, fica livre (10°); o desenho usa o mesmo', r)
        await rt(pg, SOLTA)
        # o deslizante da zona morta (e o analógico desenhado nos Ajustes)
        await rt(pg, "(() => { abrirLobby(); ajxAbre('controles'); const i = document.querySelector('#v103-zona'); i.value = '30'; i.dispatchEvent(new Event('input', {bubbles:true})); return 1; })()")
        await rt(pg, eixo(.25, 0)); await pg.wait_for_timeout(150)
        z1 = await rt(pg, "({z:RachaControles103.estado().zona, anda:RachaControles103.estado().andando, cls:document.querySelector('.v103-alvo').classList.contains('anda'), out:document.querySelector('.v103-zona output').textContent})")
        await rt(pg, eixo(.35, 0)); await pg.wait_for_timeout(150)
        z2 = await rt(pg, "({anda:RachaControles103.estado().andando, cls:document.querySelector('.v103-alvo').classList.contains('anda'), pt:document.querySelector('.v103-alvo-pt').style.transform})")
        await rt(pg, "(() => { const i = document.querySelector('#v103-zona'); i.value = '12'; i.dispatchEvent(new Event('input', {bubbles:true})); return 1; })()")
        await rt(pg, SOLTA)
        P.confere(abs(z1['z'] - .3) < 1e-9 and not z1['anda'] and not z1['cls'] and z1['out'] == '30%' and z2['anda'] and z2['cls'] and 'translate(7.7px' in z2['pt'],
                  'o deslizante: zona morta de 30% (0,25 parado, 0,35 anda) e o analógico desenhado ao vivo nos Ajustes', [z1, z2])

        # ---------------------------------------------------------------- 13) a vibração do controle no chute
        print('\n13) a vibração do controle')
        await rt(pg, pad(ID_PS, True)); await pg.wait_for_timeout(250)
        r = await rt(pg, "(() => { window.__vib.length = 0; const t = document.querySelector('.v103-testa'); t.click(); return {dis:t.disabled, n:window.__vib.length, tipo:window.__vib[0] && window.__vib[0][0], nota:document.querySelector('#v103-vibra').closest('.aj-lin').querySelector('small').textContent}; })()")
        P.confere(not r['dis'] and r['n'] == 1 and r['tipo'] == 'dual-rumble' and 'treme' in r['nota'], 'com o vibrationActuator: TESTAR vibra o controle (dual-rumble)', r)
        await rt(pg, TREINO); await pg.wait_for_timeout(1000)
        await rt(pg, "window.__vib.length = 0")
        await rt(pg, COLA); await pg.wait_for_timeout(60); await rt(pg, COLA); await toque(pg, 2, 90); await pg.wait_for_timeout(100)
        v1 = await rt(pg, "window.__vib.map(v => v[1].strongMagnitude)")
        await rt(pg, "(() => { RachaControles103.V103.vibra = false; window.__vib.length = 0; return 1; })()")
        await pg.wait_for_timeout(400)
        await rt(pg, COLA); await pg.wait_for_timeout(60); await rt(pg, COLA); await toque(pg, 2, 90); await pg.wait_for_timeout(100)
        v2 = await rt(pg, "window.__vib.length")
        await rt(pg, "RachaControles103.V103.vibra = true")
        P.confere(len(v1) == 1 and v1[0] >= .6 and v2 == 0, 'o CHUTE de controle vibra o controle (forte); com a vibração desligada, não', [v1, v2])
        ruins = [e for e in erros if 'Failed to load resource' not in e]
        P.confere(not ruins and not await rt(pg, "RachaControles103.estado().erro"), 'nenhum erro de JavaScript', ruins[:3])
        await b.close()

        # ---------------------------------------------------------------- 14) o que estava guardado antes: a v88 e os ajustes finos
        print('\n14) o que estava guardado antes (o "Trocar A e B" da v88 e o analógico de 15%)')
        guardado = {'racha88-controle': json.dumps({'on': True, 'troca': True}),
                    'racha-ajustes-finos-v1': json.dumps({'v': 1, 'cfg': {'linhaChute': 'chute', 'linhaBola': True, 'linhaTam': 'media', 'extrapola': 40},
                                                         'v92': {'render': 'prever', 'zonaLiga': .15, 'zonaDesliga': .09, 'folgaDir': .03, 'areaToque': 10}}),
                    'racha-teclas-v1': json.dumps({'passe': ['KeyP', 'KeyJ']})}
        b, pg, erros = await abre(pw, 1280, 720, toque=False, armazenamento=guardado)
        r = await rt(pg, """(() => ({e:RachaControles103.estado(), troca:V88PAD.troca, zl:V92.cfg.zonaLiga, zd:V92.cfg.zonaDesliga, area:V92.cfg.areaToque, ext:AJF.cfg.extrapola,
          salvo:JSON.parse(localStorage.getItem('racha-ajustes-finos-v1')).v92.zonaLiga, pausa:TECLA.acoes.pausa.slice(), p:teclaCanon('KeyP')}))()""")
        P.confere(r['e']['jeito'] == 'invertido' and r['troca'] is True, 'o "Trocar A e B" ligado na v88 vira o jeito INVERTIDO', r['e']['mapa'])
        P.confere(r['zl'] == .06 and r['zd'] == .04 and r['salvo'] == .06 and r['area'] == 10 and r['ext'] == 40,
                  'os ajustes finos guardados com o analógico de antes (15% / 9%) passam para 6% / 4% (o resto do que a pessoa escolheu fica)', r)
        P.confere(r['pausa'] == [] and r['p'] == 'Space', 'quem já usava o P (para o PASSE) continua com ele: a PAUSA nova fica só no Esc', [r['pausa'], r['p']])
        P.confere(not [e for e in erros if 'Failed to load resource' not in e], 'nenhum erro com o que estava guardado', erros[:3])
        await b.close()
        b, pg, erros = await abre(pw, 1280, 720, toque=False, armazenamento={'racha88-controle': json.dumps({'on': False, 'troca': False}),
                                                                             'racha-ajustes-finos-v1': json.dumps({'v': 1, 'cfg': {}, 'v92': {'zonaLiga': .25, 'zonaDesliga': .09}})})
        await rt(pg, pad(ID_PS)); await pg.wait_for_timeout(250)
        r = await rt(pg, "(() => { ajxAbre('controles'); return {on:V88PAD.on, ativo:V88PAD.ativo, st:RachaControles103.V103.ui.st.textContent, zl:V92.cfg.zonaLiga, jeito:RachaControles103.estado().jeito}; })()")
        P.confere(r['on'] is False and not r['ativo'] and 'desligado' in r['st'] and r['zl'] == .25 and r['jeito'] == 'padrao',
                  'o controle desligado na v88 continua desligado; a zona morta escolhida (25%) continua a dela', r)
        await b.close()

        # ---------------------------------------------------------------- 15) o armazenamento bloqueado
        print('\n15) com o armazenamento bloqueado')
        b, pg, erros = await abre_bloqueado(pw)
        await rt(pg, pad(ID_PS)); await pg.wait_for_timeout(250)
        await rt(pg, "(() => { ajxAbre('controles'); return 1; })()"); await pg.wait_for_timeout(150)
        await slot(pg, 'chute', 0); await toque(pg, 3)
        r = await rt(pg, EST)
        await rt(pg, TREINO); await pg.wait_for_timeout(900)
        await rt(pg, COLA); await pg.wait_for_timeout(60); await rt(pg, COLA); await toque(pg, 3, 90)
        v = await rt(pg, VEL)
        ruins = [e for e in erros if 'Failed to load resource' not in e]
        P.confere(r['mapa']['chute'] == [3] and v > 20*u and not ruins, 'sem o armazenamento o jogo abre, a troca vale (CHUTE no △) e chuta; nada de erro', [r['mapa']['chute'], v/u, ruins[:3]])
        await b.close()

        # ---------------------------------------------------------------- 16) o celular deitado
        print('\n16) o celular deitado (844 × 390) com um controle')
        b, pg, erros = await abre(pw, 844, 390, toque=True, dsf=2)
        await rt(pg, pad(ID_PS)); await pg.wait_for_timeout(250)
        await rt(pg, "(() => { ajxAbre('controles'); return 1; })()"); await pg.wait_for_timeout(500)
        r = await rt(pg, """(() => { const g = document.querySelector('.v103-pad'), fora = [...g.querySelectorAll('button, input, .v103-alvo')].filter(e => e.getClientRects().length).filter(e => { const q = e.getBoundingClientRect(); return q.right > innerWidth + 1 || q.left < -1; }).map(e => e.className);
          const c = AJX.raiz.querySelector('.ajx-corpo'); c.scrollTop = g.offsetTop - 4;
          return {fora, compacto:AJX.raiz.classList.contains('v70-compacto'), larg:document.scrollingElement.scrollWidth <= innerWidth + 1, corpo:!RachaControles103.V103.ui.corpo.hidden}; })()""")
        await pg.wait_for_timeout(150)
        await pg.screenshot(path=str(SAIDA / 'v103_celular.png'))
        P.confere(not r['fora'] and r['larg'] and r['corpo'], 'no celular deitado o grupo do controle cabe na largura (nada passa da tela)', r)
        ruins = [e for e in erros if 'Failed to load resource' not in e]
        P.confere(not ruins, 'nenhum erro no celular', ruins[:3])
        await b.close()
    return P.fim()


if __name__ == '__main__':
    roda(principal())
