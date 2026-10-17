"""Etapa 3 · controles da tela: moldes sem botões encostados (nem em cima da pausa/placar), layout da GINGA que cobre menos
campo (v70.2: a GINGA saiu do jogo; o layout dela fica guardado e é conferido com o modo ligado só no teste), Mostrar todos, Salvar/Cancelar/Restaurar (o volume volta no Cancelar) e o que fica guardado.

Rodar:  python3 tests/controles_test.py
"""
import json
from comum import abre, rt, roda, Placar, async_playwright

MOLDES = r"""(() => {
  const out = {};
  for (const hk of [1, 1.8]){
    HUDX.k = hk; BTN_PAUSA.w = BTN_PAUSA.h = Math.round(84*hk);
    for (const id in HUD_MOLDES){ hudAplicaMolde(id); out[id + '@' + hk] = {base:hudConflitos('base').length, ginga:hudConflitos('ginga').length}; }
  }
  hudAplica(); hudAplicaMolde('destro');
  return out;
})()"""

COBERTURA = r"""(() => {                       // a área de tela coberta pelos botões da GINGA: antes (todos no layout base) e agora (layout próprio)
  const area = ks => { let a = 0; const N = 160, M = 74; for (let i = 0; i < N; i++) for (let j = 0; j < M; j++){ const x = (i + .5)*W/N, y = (j + .5)*H/M; if (ks.some(([e, r]) => Math.hypot(x - e.x, y - e.y) <= r)) a++; } return a/(N*M); };
  const r = (k, e) => (k === 'joy' ? JOY.aro*e.al + JOY.knob*e.km + 4 : BASE[k].r)*e.s;
  const antes = ['kick', 'power', 'finta', 'drible'].map(k => { const e = Object.assign({}, HUD_PADRAO[k]); return [e, r(k, e)]; });
  const agora = ['kick', 'power', 'finta', 'drible'].map(k => { const e = Object.assign({}, HUD_GINGA_PADRAO[k]); return [e, r(k, e)]; });
  // a faixa do meio da tela (onde a jogada acontece): x entre 25% e 85% da largura
  const meio = ks => { let a = 0; const N = 120, M = 60; for (let i = 0; i < N; i++) for (let j = 0; j < M; j++){ const x = W*.25 + (i + .5)*W*.6/N, y = (j + .5)*H/M; if (ks.some(([e, rr]) => Math.hypot(x - e.x, y - e.y) <= rr)) a++; } return a/(N*M); };
  return {antes:+area(antes).toFixed(3), agora:+area(agora).toFixed(3), meioAntes:+meio(antes).toFixed(3), meioAgora:+meio(agora).toFixed(3)};
})()"""

EDITOR = r"""(() => {
  const T = __T; T.guardados();                          // (v70.2: a GINGA saiu do jogo; o código e o layout dela ficaram guardados e o teste liga só aqui)
  T.comeca('ginga', 2, 0); T.limpa();
  abrirEdicao();
  const r = {conjNaGinga:HUDM.atual, visiveis:ORDEM_TOQUE.filter(k => controleVisivel(k))};
  const vol0 = som.volume, x0 = hud.kick.x;
  som.setVolume(15); hud.kick.x = 900;                 // mexe no volume e num botão durante a edição
  fecharEdicao(false);                                  // Cancelar
  r.cancelVolume = som.volume === vol0; r.cancelBotao = hudObj('ginga', 'kick').x === x0;
  rqSai();
  T.comeca('futebol', 2, 0); abrirEdicao();
  r.conjNoFutebol = HUDM.atual; r.visFut = ORDEM_TOQUE.filter(k => controleVisivel(k));
  document.getElementById('hed-todos').click(); r.visTodos = ORDEM_TOQUE.filter(k => controleVisivel(k));
  document.querySelector('#hp [data-molde=canhoto]').click();
  r.joyCanhoto = hud.joy.x > W/2 && hud.kick.x < W/2;
  fecharEdicao(true);                                   // Salvar
  const salvo = JSON.parse(localStorage.getItem('racha-treino-hud-v11') || '{}');
  r.salvoMolde = salvo.molde; r.salvoJoyX = salvo.hud && salvo.hud.joy && salvo.hud.joy.x; r.salvoGinga = !!salvo.hudGinga;
  abrirEdicao(); ui.rest.click(); r.restDestro = hud.joy.x < W/2 && HUDM.molde === 'destro'; fecharEdicao(false);
  r.cancelDepoisRest = hud.joy.x > W/2;                 // o Restaurar só vale ao Salvar
  // soltar um botão em cima do outro: ele escorrega para fora
  abrirEdicao(); HUDM.todos = false; hudModoConfere();
  hud.kick.x = hud.power.x; hud.kick.y = hud.power.y - 30; hudSolta('kick'); r.soltouLivre = hudConflitos(HUDM.atual).length === 0;
  hud.power.x = BTN_PAUSA.x + 30; hud.power.y = BTN_PAUSA.y + 30; hudSolta('power'); r.pausaLivre = hudConflitos(HUDM.atual).length === 0;
  fecharEdicao(false); hudAplicaMolde('destro'); salvar();
  rqSai(); T.enxuto();
  return r;
})()"""


async def principal():
    P = Placar('Etapa 3 · controles da tela')
    async with async_playwright() as pw:
        b, pg, erros = await abre(pw, 844, 390)
        r = await rt(pg, MOLDES)
        print('    moldes:', json.dumps(r))
        for k, v in r.items():
            P.confere(v['base'] == 0 and v['ginga'] == 0, 'molde %s: nenhum botão encostado nem em cima da pausa/placar' % k, v)
        r = await rt(pg, COBERTURA)
        print('    GINGA, parte da tela coberta pelos 4 botões:', json.dumps(r))
        P.confere(r['meioAgora'] < r['meioAntes'] * .6, 'na GINGA os quatro botões cobrem bem menos do meio da tela', r)
        r = await rt(pg, EDITOR)
        print('    editor:', json.dumps(r))
        P.confere(r['conjNaGinga'] == 'ginga' and set(r['visiveis']) == {'joy', 'kick', 'power', 'finta', 'drible'}, '(guardado) na GINGA o editor abre com os controles dela')
        P.confere(r['cancelVolume'] and r['cancelBotao'], 'Cancelar volta o volume e os botões (70% → 15% → Cancelar = 70%)', r)
        P.confere(r['conjNoFutebol'] == 'base' and set(r['visFut']) == {'joy', 'kick', 'power'}, 'no futebol o editor mostra só os do futebol', r['visFut'])
        P.confere('curva' in r['visTodos'], 'Mostrar todos mostra também a CURVA', r['visTodos'])
        P.confere(r['joyCanhoto'], 'molde Canhoto: analógico à direita, botões à esquerda')
        P.confere(r['salvoMolde'] == 'canhoto' and r['salvoJoyX'] and r['salvoJoyX'] > 960 and r['salvoGinga'], 'Salvar guarda o molde, os lugares e o layout da GINGA', r)
        P.confere(r['restDestro'] and r['cancelDepoisRest'], 'Restaurar mostra o padrão, mas só vale ao Salvar (Cancelar desfaz)', r)
        P.confere(r['soltouLivre'] and r['pausaLivre'], 'soltar em cima de outro botão (ou da pausa) escorrega para um lugar livre', r)
        print('\n· teclado: trocar teclas (Ajustes › Controles)')
        await rt(pg, "rqSai(); if (!lobby.aberto) abrirLobby(); localStorage.removeItem('racha-teclas-v1'); TECLA.acoes = teclaPadrao(); teclaMonta(); teclaSync(); true")
        await rt(pg, "ajxAbre('controles'); true"); await pg.wait_for_timeout(150)
        clica = lambda sel: pg.evaluate("(s => { const b = document.querySelector(s); b.scrollIntoView({block:'center'}); b.click(); })", sel)
        await clica('.ajx-tbt[data-acao=passe][data-i="0"]'); await pg.keyboard.press('KeyE'); await pg.wait_for_timeout(80)
        await clica('.ajx-tbt[data-acao=passe][data-i="1"]'); await pg.keyboard.press('KeyK'); await pg.wait_for_timeout(80)
        st = await rt(pg, "({passe:TECLA.acoes.passe.slice(), chute:TECLA.acoes.chute.slice(), e:teclaCanon('KeyE'), k:teclaCanon('KeyK'), espaco:teclaCanon('Space'), l:teclaCanon('KeyL'), msg:TECLA.msg.textContent, salvo:localStorage.getItem('racha-teclas-v1')})")
        print('    ', json.dumps(st, ensure_ascii=False))
        P.confere(st['passe'] == ['KeyE', 'KeyK'] and st['e'] == 'Space' and st['k'] == 'Space', 'E e K viram PASSE', st)
        P.confere(st['chute'] == ['KeyL'] and st['l'] == 'KeyK', 'K saiu do CHUTE (que fica com o L)', st)
        P.confere(st['espaco'].startswith('_livre_'), 'o Espaço, que saiu do PASSE, fica sem efeito', st)
        P.confere('saiu de CHUTE' in st['msg'] and st['salvo'] and 'KeyE' in st['salvo'], 'avisa de onde a tecla saiu e fica guardado', st['msg'])
        await clica('.ajx-tbt[data-acao=chute][data-i="0"]'); await pg.keyboard.press('Escape'); await pg.wait_for_timeout(60)
        st2 = await rt(pg, "({chute:TECLA.acoes.chute.slice(), aberta:!LB.aj.hidden})")
        P.confere(st2['chute'] == ['KeyL'] and st2['aberta'], 'Esc cancela a troca (e não fecha os ajustes)', st2)
        await pg.evaluate("document.getElementById('ajx-teclas-rest').click()")
        st3 = await rt(pg, "({passe:TECLA.acoes.passe.slice(), chute:TECLA.acoes.chute.slice()})")
        P.confere(st3 == {'passe': ['Space', 'KeyJ'], 'chute': ['KeyK', 'KeyL']}, 'voltar as teclas ao padrão', st3)
        await rt(pg, "TECLA.acoes.passe = ['KeyE', 'KeyJ']; teclaSalva(); LB.aj.hidden = true; true")
        await rt(pg, "__T.comeca('futebol', 2, 0); __T.limpa(); BOTAO.kickL = false; true")
        await pg.evaluate("window.dispatchEvent(new KeyboardEvent('keydown', {code:'KeyE', key:'e', bubbles:true}))")
        jogo = await rt(pg, "({kickL:BOTAO.kickL, space:!!keys.Space})")
        await pg.evaluate("window.dispatchEvent(new KeyboardEvent('keyup', {code:'KeyE', key:'e', bubbles:true}))")
        P.confere(jogo['kickL'] and jogo['space'], 'na partida, a tecla nova faz o PASSE', jogo)
        await rt(pg, "TECLA.acoes = teclaPadrao(); teclaSalva(); true")

        print('\n· chute armado: o botão avisa e pisca quando a bola sai')
        r = await rt(pg, r"""(() => {
          const T = __T; T.comeca('futebol', 2, 0); T.limpa(); RQ.autoH = false;
          T.poe(P, CX - 300, CY); T.bola(CX + 200, CY);           // bola longe
          const textos = []; const tf = txt; txt = function(g, s){ textos.push(s); return tf.apply(this, arguments); };
          keys.KeyK = true; ARMADO.desde = 0;
          for (let i = 0; i < 20; i++){ amostraBotoes(STEP); }
          ARMADO.desde = performance.now() - 400; ctx.setTransform(K, 0, 0, K, 0, 0); desenhaArmado();
          const armado = textos.indexOf('ARMADO · ENCOSTE NA BOLA') >= 0;
          T.bola(P.x + P.r + B.r + 2, P.y); amostraBotoes(STEP);  // a bola chega ao alcance com o botão seguro: o chute sai
          const saiu = ARMADO.saiu === 'power' && performance.now() - ARMADO.saiuT < 200 && Math.hypot(B.vx, B.vy) > 50;
          keys.KeyK = false; amostraBotoes(STEP); txt = tf;
          return {armado, saiu};
        })()""")
        print('    ', json.dumps(r))
        P.confere(r['armado'], 'segurando CHUTE com a bola longe aparece ARMADO · ENCOSTE NA BOLA')
        P.confere(r['saiu'], 'ao encostar na bola o chute sai e o botão pisca')

        rede = [e for e in erros if 'Failed to load resource' in e]
        P.confere(not [e for e in erros if e not in rede], 'nenhum erro de JavaScript', [e for e in erros if e not in rede][:4])
        await b.close()
    return P.fim()

roda(principal())
