"""RACHA v96 (depois do teste) · A CONTA FORA DOS AJUSTES e O ANEL DO CHUTE SUAVE (no navegador).
Os pedidos: "tire o modo conta das configurações" e "quando o jogador chuta a bola, o arco ao redor tem que ser uma opacidade
baixa".
· AJUSTES: 6 abas (Áudio, Visual, Controles, Câmera, Acessibilidade e Privacidade) — a Conta saiu, também das setas do
  teclado; o "Chat do Brasil" e o "Chat na tela" ficam em Privacidade (em cima, e continuam lá quando a aba se pinta de
  novo), funcionando; os avisos do chat dizem Ajustes › Privacidade.
· A janela SUA CONTA (pelo selo ao lado do ID no PERFIL, com o toque ou o teclado, e por quem chama ajxAbre('conta')): sem
  as abas, só a conta — o cartão SEM CONTA com o ENTRAR e o CRIAR CONTA, o EXPORTAR e o IMPORTAR, o ZERAR PROGRESSO —, sem
  o Servidor do jogo; o PRONTO e o Escape fecham, e os AJUSTES voltam a ser os de sempre (com as abas, sem a conta).
· O anel do chute: segurando o CHUTE, o branco por cima do anel é suave (V95S.luz = 0,3): na tela, o anel clareia bem menos
  que o branco forte de antes (medido nos pixels do anel), mas ainda aparece; a Oficina usa o mesmo.
· No celular deitado (844x390): as 6 abas numa linha e a SUA CONTA cabem na tela.
Capturas em tests/saida/v96_conta_*.png.
Rodar: python3 tests/v96_conta_test.py"""
import json
from comum import abre, rt, roda, Placar, async_playwright, RAIZ

SAIDA = RAIZ / 'tests' / 'saida'; SAIDA.mkdir(exist_ok=True)
ABAS = ['Áudio', 'Visual', 'Controles', 'Câmera', 'Acessibilidade', 'Privacidade']

# a luz média do anel do jogador na tela (o anel entre 1,04 e 1,22 × o raio, como o desenho do sensor)
ANEL = r"""(() => { const c = document.getElementById('c'), g = c.getContext('2d'), r0 = cv.getBoundingClientRect(), k = c.width / r0.width, z = cam.z;
  const x = (W / 2 + (P.x - cam.x) * z) * r0.width / W * k, y = (H / 2 + (P.y - cam.y) * z) * r0.height / H * k, r = R_JOG * z * r0.width / W * k;
  const a = Math.ceil(r * 1.3), d = g.getImageData(Math.round(x - a), Math.round(y - a), 2 * a, 2 * a).data; let s = 0, n = 0;
  for (let j = 0; j < 2 * a; j++) for (let i = 0; i < 2 * a; i++) { const q = Math.hypot(i - a + .5, j - a + .5) / r; if (q > 1.08 && q < 1.18) { const o = (j * 2 * a + i) * 4; s += .2126 * d[o] + .7152 * d[o + 1] + .0722 * d[o + 2]; n++; } }
  return n ? s / n : 0; })()"""


async def principal():
    P = Placar('v96 · a conta fora dos Ajustes e o anel do chute suave')
    async with async_playwright() as pw:
        b, pg, erros = await abre(pw, 1280, 720)
        html = (RAIZ / 'app' / 'public' / 'game' / 'racha.html').read_text(encoding='utf-8')

        # ---------------------------------------------------------------- 1) os AJUSTES sem a aba Conta
        await rt(pg, "ajxAbre('audio'); true"); await pg.wait_for_timeout(300)
        r = await rt(pg, "({abas: [...document.querySelectorAll('#pop-ajustes .ajx-abas > .ajx-aba')].map(b => b.textContent.trim()), ids: AJX_ABAS.map(a => a[0]), conta: !AJX.secs.conta.hidden, tit: document.getElementById('ajx-tit').textContent})")
        P.confere(r['abas'] == ABAS and 'conta' not in r['ids'] and not r['conta'] and r['tit'] == 'AJUSTES', 'AJUSTES: 6 abas (Áudio, Visual, Controles, Câmera, Acessibilidade e Privacidade); a Conta saiu', r)
        await rt(pg, "ajxAba('social', true); true")
        await pg.keyboard.press('ArrowRight'); await pg.wait_for_timeout(100)
        um = await rt(pg, "AJX.aba")
        await pg.keyboard.press('End'); await pg.wait_for_timeout(100)
        fim = await rt(pg, "AJX.aba")
        P.confere(um == 'audio' and fim == 'social', 'as setas do teclado passam só pelas 6 (de Privacidade a seta vai para Áudio; o End para em Privacidade)', [um, fim])
        await rt(pg, "ajxAba('social', true); true"); await pg.wait_for_timeout(300)
        r = await rt(pg, """(() => { const s = AJX.secs.social, g = s.firstElementChild;
          return {primeiro: g && g.classList.contains('v96-aj-chat'), tit: g && (g.querySelector('.ajx-h') || {}).textContent, chaves: g ? [...g.querySelectorAll('.aj-chave')].map(b => b.id) : [], visivel: !s.hidden}; })()""")
        P.confere(r['primeiro'] and r['tit'] == 'Chat' and r['chaves'] == ['aj-chat', 'aj-chat-tela'] and r['visivel'], 'Privacidade começa pelo Chat: o "Chat do Brasil" e o "Chat na tela"', r)
        await pg.screenshot(path=str(SAIDA / 'v96_conta_privacidade.png'))
        r = await rt(pg, """(() => { const t = document.getElementById('aj-chat-tela'), a0 = t.getAttribute('aria-pressed'); t.click(); const a1 = t.getAttribute('aria-pressed'), o1 = RachaChat81.oculto();
          t.click(); const a2 = t.getAttribute('aria-pressed'), o2 = RachaChat81.oculto(); v88AjSocial(); const g = AJX.secs.social.firstElementChild;
          return {a: [a0, a1, a2], o: [o1, o2], depois: !!(g && g.classList.contains('v96-aj-chat') && g.contains(t))}; })()""")
        P.confere(r['a'] == ['true', 'false', 'true'] and r['o'] == [True, False] and r['depois'], 'as chaves do chat funcionam lá (o Chat na tela desliga e liga) e continuam em cima quando a aba se pinta de novo', r)
        P.confere('Para voltar: Ajustes › Privacidade › Chat na tela.' in html and 'ligue em Ajustes › Privacidade › Chat na tela.' in html and 'Ajustes › Conta › Chat' not in html,
                  'os avisos do chat dizem onde ficou: Ajustes › Privacidade › Chat na tela')
        await rt(pg, "ajxFecha(); true"); await pg.wait_for_timeout(200)

        # ---------------------------------------------------------------- 2) a janela SUA CONTA pelo selo do perfil
        await rt(pg, "abreTela('perfil'); true"); await pg.wait_for_timeout(500)
        r = await rt(pg, "(() => { const s = document.querySelector('#tela-perfil .pf-ident'); return {txt: s.textContent, role: s.getAttribute('role'), tab: s.tabIndex, selo: s.classList.contains('v96-selo')}; })()")
        P.confere(r['role'] == 'button' and r['tab'] == 0 and r['selo'], 'no PERFIL, o selo ao lado do ID ("%s") é um botão' % r['txt'], r)
        await pg.click('#tela-perfil .pf-ident'); await pg.wait_for_timeout(400)
        r = await rt(pg, """(() => { const S = AJX.secs.conta, vis = n => !!n && n.offsetParent !== null && !n.closest('[hidden]'), card = S.querySelector('.c82-card');
          return {aberta: RachaConta96.aberta(), pop: !LB.pop.hidden, tit: document.getElementById('ajx-tit').textContent, nav: getComputedStyle(document.querySelector('#pop-ajustes .ajx-abas')).display,
            secs: Object.keys(AJX.secs).filter(k => !AJX.secs[k].hidden), primeiro: S.firstElementChild === card, h: card && (card.querySelector('h3') || {}).textContent,
            bts: card ? [...card.querySelectorAll('button')].map(b => b.textContent) : [], exp: vis(document.getElementById('aj-exporta')) && vis(document.getElementById('aj-importa')),
            zerar: vis(LB.zerar), serv: vis(document.getElementById('aj-serv')), titulos: [...S.querySelectorAll('h3.aj-sec')].filter(vis).map(h => h.textContent),
            chat: S.contains(document.getElementById('aj-chat'))}; })()""")
        P.confere(r['aberta'] and not r['pop'] and r['tit'] == 'SUA CONTA' and r['nav'] == 'none' and r['secs'] == ['conta'], 'tocar no selo abre a janela SUA CONTA: sem as abas, só a conta', r)
        P.confere(r['primeiro'] and r['h'] == 'SEM CONTA' and r['bts'] == ['ENTRAR', 'CRIAR CONTA'] and r['exp'] and r['zerar'], 'sem conta: o cartão SEM CONTA (ENTRAR e CRIAR CONTA), o EXPORTAR e o IMPORTAR do progresso e o ZERAR PROGRESSO', r)
        P.confere(not r['serv'] and r['titulos'] == [] and not r['chat'], 'o Servidor do jogo e os títulos AVANÇADO e CONTA não aparecem; o chat não está mais aqui', r)
        await pg.screenshot(path=str(SAIDA / 'v96_conta_sua_conta.png'))
        await pg.keyboard.press('Escape'); await pg.wait_for_timeout(300)
        r = await rt(pg, "({fechou: AJX.raiz.hidden, modo: RachaConta96.aberta(), tit: document.getElementById('ajx-tit').textContent})")
        P.confere(r['fechou'] and not r['modo'] and r['tit'] == 'AJUSTES', 'o Escape fecha a SUA CONTA (e a janela volta a ser a dos Ajustes)', r)
        await rt(pg, "document.querySelector('#tela-perfil .pf-ident').focus(); true")
        await pg.keyboard.press('Enter'); await pg.wait_for_timeout(400)
        r = await rt(pg, "({modo: RachaConta96.aberta(), foco: document.activeElement && document.activeElement.textContent})")
        P.confere(r['modo'] and r['foco'] == 'ENTRAR', 'pelo teclado (Enter no selo) também abre, com o foco no primeiro botão (ENTRAR)', r)
        await rt(pg, "document.getElementById('aj-ok').click(); true"); await pg.wait_for_timeout(300)
        await rt(pg, "ajxAbre(); true"); await pg.wait_for_timeout(300)
        r = await rt(pg, "({tit: document.getElementById('ajx-tit').textContent, nav: getComputedStyle(document.querySelector('#pop-ajustes .ajx-abas')).display, secs: Object.keys(AJX.secs).filter(k => !AJX.secs[k].hidden), aba: AJX.aba})")
        P.confere(r['tit'] == 'AJUSTES' and r['nav'] != 'none' and len(r['secs']) == 1 and 'conta' not in r['secs'], 'depois do PRONTO, a engrenagem abre os AJUSTES de sempre (com as abas e sem a conta)', r)
        await rt(pg, "ajxFecha(); ajxAbre('conta'); true"); await pg.wait_for_timeout(300)
        r = await rt(pg, "({modo: RachaConta96.aberta(), secs: Object.keys(AJX.secs).filter(k => !AJX.secs[k].hidden)})")
        P.confere(r['modo'] and r['secs'] == ['conta'], "quem chama ajxAbre('conta') (os caminhos de antes) abre a SUA CONTA", r)
        await rt(pg, "ajxFecha(); fechaTela(); true"); await pg.wait_for_timeout(300)

        # ---------------------------------------------------------------- 3) o anel do chute suave
        await rt(pg, """(() => { __T.comeca('futebol', 1, 4); __T.limpa(); __T.poe(P, CX - U(14), CY); __T.bola(CX + U(16), CY - U(10)); posVisual(0); cam.mode = 'fixa'; updateCamera(0, true); buildStatic(); return true; })()""")
        await pg.wait_for_timeout(4200)
        await rt(pg, "(() => { __T.poe(P, CX - U(14), CY); __T.bola(CX + U(16), CY - U(10)); posVisual(0); return true; })()")
        luz = {}
        for nome, js in (('parado', "keys.KeyK = false; V95S.luz = .3;"), ('forte', "V95S.luz = 1; keys.KeyK = true;"), ('suave', "V95S.luz = .3; keys.KeyK = true;")):
            await rt(pg, "(() => { " + js + " return true; })()"); await pg.wait_for_timeout(300)
            luz[nome] = round(await rt(pg, ANEL), 1)
            if nome == 'suave': await pg.screenshot(path=str(SAIDA / 'v96_conta_anel.png'))
        await rt(pg, "keys.KeyK = false; true")
        dF, dS = luz['forte'] - luz['parado'], luz['suave'] - luz['parado']
        print('     a luz do anel (0 a 255):', luz)
        P.confere(abs(await rt(pg, "V95S.luz") - .3) < 1e-9 and dF > 40 and 2 < dS < .45 * dF,
                  'segurando o CHUTE, o anel clareia bem menos que o branco forte de antes (+%.0f contra +%.0f), mas ainda aparece' % (dS, dF), luz)
        P.confere('g.globalAlpha = Math.min(1, wb) * luz;' in html and "a0*Math.min(1, w)*(V95S.luz || 1)" in html, 'a Oficina e a partida usam o mesmo branco suave (V95S.luz)')
        await rt(pg, "rqSai(); true")
        rede = [e for e in erros if 'Failed to load resource' in e]
        P.confere(not [e for e in erros if e not in rede], 'nenhum erro de JavaScript', [e for e in erros if e not in rede][:3])
        await b.close()

        # ---------------------------------------------------------------- 4) no celular deitado
        b, pg, erros = await abre(pw, 844, 390, dsf=2)
        await rt(pg, "ajxAbre('audio'); true"); await pg.wait_for_timeout(400)
        r = await rt(pg, """(() => { const bs = [...document.querySelectorAll('#pop-ajustes .ajx-abas > .ajx-aba')].map(b => b.getBoundingClientRect()), cx = document.querySelector('#pop-ajustes .ajx-caixa').getBoundingClientRect();
          return {n: bs.length, linha: bs.every(r => Math.abs(r.top - bs[0].top) < 2), dentro: bs.every(r => r.left >= cx.left - 1 && r.right <= cx.right + 1), compacto: AJX.raiz.classList.contains('v70-compacto')}; })()""")
        P.confere(r['n'] == 6 and r['linha'] and r['dentro'], '844x390: as 6 abas numa linha, dentro da janela', r)
        await pg.screenshot(path=str(SAIDA / 'v96_conta_ajustes_844x390.png'))
        await rt(pg, "ajxFecha(); ajxAbre('conta'); true"); await pg.wait_for_timeout(400)
        r = await rt(pg, """(() => { const cx = document.querySelector('#pop-ajustes .ajx-caixa').getBoundingClientRect(), ok = document.getElementById('aj-ok').getBoundingClientRect();
          return {cabe: cx.top >= -1 && cx.bottom <= innerHeight + 1 && cx.left >= -1 && cx.right <= innerWidth + 1, pronto: ok.top >= -1 && ok.bottom <= innerHeight + 1 && ok.height >= 30, tit: document.getElementById('ajx-tit').textContent}; })()""")
        P.confere(r['cabe'] and r['pronto'] and r['tit'] == 'SUA CONTA', '844x390: a SUA CONTA cabe na tela, com o PRONTO', r)
        await pg.screenshot(path=str(SAIDA / 'v96_conta_sua_conta_844x390.png'))
        rede = [e for e in erros if 'Failed to load resource' in e]
        P.confere(not [e for e in erros if e not in rede], '844x390: nenhum erro de JavaScript', [e for e in erros if e not in rede][:3])
        await b.close()
    return P.fim()


roda(principal())
