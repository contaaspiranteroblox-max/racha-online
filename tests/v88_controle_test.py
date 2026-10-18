"""v88 · o CONTROLE (a API Gamepad) com um controle simulado no navegador — o Chromium de teste não tem controle de verdade,
então a página ganha um navigator.getGamepads() que devolve um controle "standard" (os mesmos botões e eixos de um controle
Bluetooth comum) e o evento gamepadconnected. Confere o caminho inteiro do tools/v88/controle.js com o jogo de verdade:
  · conectar: os Ajustes › Controles mostram o controle e a lista dos botões (sem controle, o grupo fica curto);
  · nos menus: o direcional anda entre os botões, A confirma (abre a tela) e B volta (o Esc);
  · na partida (o treino livre): o analógico anda nas MESMAS 32 direções do analógico da tela e na MESMA velocidade do
    teclado (ninguém fica mais rápido de controle); A = PASSE e B = CHUTE com a mesma força do teclado; TROCAR A E B; START
    abre e fecha a pausa; desconectar solta tudo;
  · o toque e o teclado continuam valendo (o teclado anda com o controle conectado e parado).

Rodar:  python3 tests/v88_controle_test.py
"""
import json, math
from comum import abre, rt, roda, Placar, async_playwright

PAD = r"""(() => {
  const bts = []; for (let i = 0; i < 17; i++) bts.push({pressed:false, value:0, touched:false});
  window.__pad = {id:'Controle de teste (STANDARD GAMEPAD Vendor: 045e Product: 02e0)', index:0, connected:true, mapping:'standard', axes:[0, 0, 0, 0], buttons:bts, timestamp:0, vibrationActuator:null};
  window.__pads = [window.__pad, null, null, null];
  Object.defineProperty(navigator, 'getGamepads', {configurable:true, value:() => window.__pads});
  const e = new Event('gamepadconnected'); e.gamepad = window.__pad; window.dispatchEvent(e);
  return true; })()"""
SOLTA = "(() => { window.__pad.axes = [0, 0, 0, 0]; for (const b of window.__pad.buttons){ b.pressed = false; b.value = 0; } return 1; })()"


def bt(i, on):
    return "(() => { const b = window.__pad.buttons[%d]; b.pressed = %s; b.value = %d; return 1; })()" % (i, 'true' if on else 'false', 1 if on else 0)


def eixo(x, y):
    return "(() => { window.__pad.axes[0] = %r; window.__pad.axes[1] = %r; return 1; })()" % (x, y)


async def toque(pg, i, ms=120):
    await rt(pg, bt(i, True)); await pg.wait_for_timeout(ms); await rt(pg, bt(i, False)); await pg.wait_for_timeout(120)


# a bola parada colada na frente da tampinha (para a direita), o jogador parado: quanto ela sai depois do PASSE/CHUTE
COLA = "(() => { P.vx = P.vy = 0; B.x = P.x + P.r + B.r + .5; B.y = P.y; B.vx = B.vy = 0; B.w = 0; return 1; })()"
VEL = "Math.hypot(B.vx, B.vy)"


async def principal():
    P = Placar('v88 · o controle Bluetooth (API Gamepad, com um controle simulado no navegador)')
    async with async_playwright() as pw:
        b, pg, erros = await abre(pw, 1280, 720, toque=False)
        print('\n1) sem controle e conectando')
        r = await rt(pg, "(() => { ajxAbre('controles'); const U = V88PAD.ui; return {st:U.st.textContent, tr:U.tr.hidden, mapa:U.mapa.hidden, ativo:V88PAD.ativo}; })()")
        P.confere(not r['ativo'] and 'Nenhum controle' in r['st'] and r['tr'] and r['mapa'], 'sem controle: o grupo diz que não tem e fica curto (o A/B e a lista aparecem quando conecta)', r)
        await rt(pg, PAD); await pg.wait_for_timeout(250)
        r = await rt(pg, "(() => { const U = V88PAD.ui; return {st:U.st.textContent, tr:U.tr.hidden, mapa:U.mapa.hidden, itens:U.mapa.children.length, ativo:V88PAD.ativo}; })()")
        P.confere(r['ativo'] and r['st'].startswith('Conectado: Controle de teste') and not r['tr'] and not r['mapa'] and r['itens'] == 6,
                  'conectou: os Ajustes › Controles mostram o controle, o TROCAR A E B e a lista dos 6 botões', r)

        print('\n2) nos menus: andar, confirmar e voltar')
        await toque(pg, 1)                                  # B = Esc: fecha os Ajustes
        r = await rt(pg, "({aj:!AJX.raiz.hidden, tela:lobby.tela || ''})")
        P.confere(not r['aj'], 'B (voltar) fecha os Ajustes, como o Esc', r)
        await rt(pg, "(() => { document.activeElement && document.activeElement.blur && document.activeElement.blur(); return 1; })()")
        await toque(pg, 13)                                 # o direcional para baixo: sem foco, vai para o JOGAR
        r = await rt(pg, "({jogar:document.activeElement === LB.jogar, foco:document.body.classList.contains('v88-pad-foco')})")
        P.confere(r['jogar'] and r['foco'], 'o direcional acende um botão (o primeiro é o JOGAR) e o foco aparece', r)
        await toque(pg, 14)                                 # para a esquerda: o MODO, colado no JOGAR
        r = await rt(pg, "({modo:document.activeElement === LB.modo, nome:(document.activeElement && (document.activeElement.getAttribute('aria-label') || document.activeElement.textContent) || '').slice(0, 40)})")
        P.confere(r['modo'], 'para a esquerda: o MODO (o vizinho do JOGAR)', r)
        await rt(pg, "(() => { document.querySelector('#rx .rx-bt[data-loja]').focus(); return 1; })()")
        await toque(pg, 0)                                  # A confirma: abre a LOJA
        await pg.wait_for_timeout(300)
        r = await rt(pg, "({tela:lobby.tela || ''})")
        P.confere(r['tela'] == 'loja', 'A (confirmar) aperta o botão aceso: abre a LOJA', r)
        await toque(pg, 1)
        await pg.wait_for_timeout(300)
        r = await rt(pg, "({tela:lobby.tela || ''})")
        P.confere(r['tela'] == '', 'B (voltar) fecha a LOJA', r)

        print('\n3) na partida (o treino livre)')
        await rt(pg, "(() => { if (RQ.on) rqSai(); abrirLobby(); trEscolhe('livre'); jogarTreino(); return 1; })()")
        await pg.wait_for_timeout(1200)
        em = await rt(pg, "v88PadEmJogo()")
        P.confere(em, 'o treino livre abre e o controle passa a valer para a partida', em)
        # as 32 direções: 10° vai para o setor de 11,25° mais perto; a força sai inteira (o mesmo do analógico da tela)
        a = math.radians(10)
        await rt(pg, eixo(math.cos(a), math.sin(a))); await pg.wait_for_timeout(150)
        r = await rt(pg, "(() => { const i = getInput(); return {mx:i.mx, my:i.my, ang:Math.atan2(i.my, i.mx)*180/Math.PI, mag:Math.hypot(i.mx, i.my)}; })()")
        P.confere(abs(r['ang'] - 11.25) < .01 and abs(r['mag'] - 1) < 1e-6, 'o analógico do controle (10°) entra no setor de 11,25° (as 32 direções do toque), com a força inteira', r)
        await rt(pg, eixo(.2, .1)); await pg.wait_for_timeout(150)
        r = await rt(pg, "(() => { const i = getInput(); return {mx:i.mx || 0, my:i.my || 0}; })()")
        P.confere(abs(r['mx']) < 1e-6 and abs(r['my']) < 1e-6, 'abaixo da zona morta do controle (0,28 do eixo): parado', r)
        # a mesma velocidade do teclado: 600 ms para a direita com o controle e com a seta
        await rt(pg, SOLTA); await pg.wait_for_timeout(300)
        x0 = await rt(pg, "(() => { P.x = CX - U(150); P.y = CY; P.vx = P.vy = 0; return P.x; })()")
        await rt(pg, eixo(1, 0)); await pg.wait_for_timeout(600); await rt(pg, SOLTA)
        await pg.wait_for_timeout(500)
        dpad = await rt(pg, "P.x") - x0
        x1 = await rt(pg, "(() => { P.x = CX - U(150); P.y = CY; P.vx = P.vy = 0; return P.x; })()")
        await pg.focus('#c')
        await pg.keyboard.down('ArrowRight'); await pg.wait_for_timeout(600); await pg.keyboard.up('ArrowRight')
        await pg.wait_for_timeout(500)
        dtec = await rt(pg, "P.x") - x1
        u = await rt(pg, "U(1)")
        P.confere(dpad > 20*u and dtec > 20*u and abs(dpad - dtec) <= .15*max(dpad, dtec), 'a mesma velocidade do teclado: em 0,6 s o controle anda %.0f u e a seta %.0f u' % (dpad/u, dtec/u), [dpad, dtec])
        # A = PASSE e B = CHUTE, com a mesma força do teclado (Espaço = PASSE, K = CHUTE)
        vel = {}
        for nome, faz in [('pad_A', lambda: toque(pg, 0, 90)), ('pad_B', lambda: toque(pg, 1, 90)), ('tec_espaco', None), ('tec_K', None)]:
            await rt(pg, COLA); await pg.wait_for_timeout(60); await rt(pg, COLA)
            if faz:
                await faz()
            else:
                await pg.focus('#c')
                tecla = 'Space' if nome == 'tec_espaco' else 'KeyK'
                await pg.keyboard.down(tecla); await pg.wait_for_timeout(90); await pg.keyboard.up(tecla); await pg.wait_for_timeout(120)
            vel[nome] = await rt(pg, "(() => { const v = %s; return v; })()" % VEL)
            await pg.wait_for_timeout(500)
        ok = vel['pad_A'] > 0 and vel['pad_B'] > vel['pad_A']
        P.confere(ok, 'A sai como PASSE e B como CHUTE (mais forte): a bola sai do pé a %.1f e %.1f u/s' % (vel['pad_A']/u, vel['pad_B']/u), vel)
        P.confere(abs(vel['pad_A'] - vel['tec_espaco']) <= .2*vel['tec_espaco'] and abs(vel['pad_B'] - vel['tec_K']) <= .2*vel['tec_K'],
                  'a mesma força do teclado: PASSE %.1f × %.1f u/s (Espaço) e CHUTE %.1f × %.1f u/s (K)' % (vel['pad_A']/u, vel['tec_espaco']/u, vel['pad_B']/u, vel['tec_K']/u), vel)
        # TROCAR A E B
        await rt(pg, "(() => { V88PAD.troca = true; return 1; })()")
        await rt(pg, COLA); await pg.wait_for_timeout(60); await rt(pg, COLA)
        await toque(pg, 0, 90)
        va = await rt(pg, VEL)
        await rt(pg, "(() => { V88PAD.troca = false; return 1; })()")
        P.confere(abs(va - vel['pad_B']) <= .2*vel['pad_B'], 'TROCAR A E B ligado: o A sai como CHUTE (%.1f u/s)' % (va/u), va)
        await pg.wait_for_timeout(400)
        # START: a pausa (e de volta)
        await toque(pg, 9)
        r1 = await rt(pg, "PAUSA.aberta")
        await toque(pg, 9)
        r2 = await rt(pg, "PAUSA.aberta")
        P.confere(r1 is True and r2 is False, 'START abre a pausa e, de novo, volta para a partida', [r1, r2])
        # o teclado continua valendo com o controle conectado (e parado)
        x2 = await rt(pg, "(() => { P.x = CX - U(150); P.y = CY; P.vx = P.vy = 0; return P.x; })()")
        await pg.focus('#c')
        await pg.keyboard.down('ArrowRight'); await pg.wait_for_timeout(400); await pg.keyboard.up('ArrowRight')
        await pg.wait_for_timeout(300)
        d2 = await rt(pg, "P.x") - x2
        P.confere(d2 > 10*u, 'com o controle conectado e parado, o teclado anda normal (%.0f u)' % (d2/u), d2)
        # desconectar: solta tudo
        await rt(pg, eixo(1, 0)); await rt(pg, bt(0, True)); await pg.wait_for_timeout(150)
        await rt(pg, "(() => { window.__pad.connected = false; window.__pads = [null, null, null, null]; const e = new Event('gamepaddisconnected'); e.gamepad = window.__pad; window.dispatchEvent(e); return 1; })()")
        await pg.wait_for_timeout(250)
        r = await rt(pg, "(() => { const i = getInput(); return {ativo:V88PAD.ativo, espaco:!!keys.Space, mx:i.mx || 0}; })()")
        P.confere(not r['ativo'] and not r['espaco'] and abs(r['mx']) < 1e-6, 'desconectou: o controle sai e nada fica apertado', r)
        ruins = [e for e in erros if 'Failed to load resource' not in e]
        P.confere(not ruins, 'nenhum erro de JavaScript', ruins[:3])
        await b.close()
    return P.fim()


if __name__ == '__main__':
    roda(principal())
