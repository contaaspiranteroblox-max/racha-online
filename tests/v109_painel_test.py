"""RACHA v109 · OS DOIS PAINÉIS no navegador (passa/falha, com fotos em tests/saida/): as páginas de verdade do app/src (o
RACHA CONTROL: AdminPage, PainelDono, PainelStaff, PainelComum) juntadas pelo tests/ui_site/compila_ui.cjs, falando com a
PLATAFORMA DE TESTE (as rotas de app/api com SQLite e o servidor das salas montado). Confere, pelos botões:
  1. o 2FA com QR CODE: a tela mostra o QR (o leitor de QR do OpenCV lê o otpauth:// dele), a chave de 32 letras em grupos de
     4 é a mesma do QR, e o código tirado do QR entra — o Dono cai no PAINEL DO DONO (as abas dele);
  2. o Dono coloca um Moderador na staff pela aba Staff; o Moderador entra (o QR dele) e cai no PAINEL DA STAFF: as abas da
     staff, o aviso do que o cargo pode, e na ficha do jogador NÃO tem selo, carteira nem item (só a moderação);
  3. o Moderador silencia o chat de um jogador por 1 dia (os tempos dele vão até 10 dias), a ficha mostra "SEM CHAT", ele
     aparece em PUNIDOS e em MEUS REGISTROS;
  4. o Dono vê o que o Moderador fez (os REGISTROS e a VISÃO GERAL) e, na ficha, dá o verificado e moedas;
  5. o Dono reseta o 2FA do Moderador pela aba Staff;
  6. o jogo (a cópia de teste) mostra o aviso do silêncio que o servidor das salas manda (no Chat do Brasil e no aviso ao vivo);
  7. o painel da staff no celular (390 × 844) sem rolagem para o lado; nenhum erro de JavaScript.
  python3 tests/v109_painel_test.py"""
import asyncio, base64, hashlib, hmac, json, os, struct, subprocess, sys, tempfile, time, urllib.parse
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from comum import Placar, RAIZ, CHROME, rt
from playwright.async_api import async_playwright
from v881_painel_test import Plataforma, texto

SAIDA = RAIZ / 'tests' / 'saida'
SENHA = 'Dono-Painel-109z'
USADOS = set()


def totp(segredo):                                          # (um passo livre por login: o servidor não aceita o mesmo código 2 vezes)
    limpo = segredo.replace(' ', '').upper()
    chave = base64.b32decode(limpo + '=' * (-len(limpo) % 8))
    while True:
        p = int(time.time() // 30)
        for d in (0, 1, -1):
            if (limpo, p + d) not in USADOS:
                USADOS.add((limpo, p + d))
                h = hmac.new(chave, struct.pack('>Q', p + d), hashlib.sha1).digest()
                o = h[-1] & 15
                return '%06d' % ((struct.unpack('>I', h[o:o + 4])[0] & 0x7fffffff) % 1000000)
        time.sleep(30 - time.time() % 30 + .1)


def le_qr(png):                                             # o QR code da tela, lido pelo OpenCV
    import numpy as np, cv2
    img = cv2.imdecode(np.frombuffer(png, np.uint8), cv2.IMREAD_GRAYSCALE)
    for det in (cv2.QRCodeDetectorAruco(), cv2.QRCodeDetector()):
        try:
            t, _, _ = det.detectAndDecode(img)
            if t: return t
        except Exception:
            pass
    return ''


async def login_qr(pg, base, usuario, senha):
    """O login pelo navegador lendo o QR code (como o app autenticador): devolve (o otpauth lido, a chave mostrada)."""
    await pg.goto(base + '/tests/build/ui_site.html#/admin')
    await pg.wait_for_selector('input[placeholder="Usuário da equipe"]', timeout=8000)
    await pg.fill('input[placeholder="Usuário da equipe"]', usuario)
    await pg.fill('input[placeholder="Senha"]', senha)
    await pg.get_by_role('button', name='ENTRAR NO PAINEL').click()
    await pg.wait_for_selector('[data-testid=qr-2fa]', timeout=6000)
    png = await pg.locator('[data-testid=qr-2fa]').screenshot()
    url = le_qr(png)
    chave = await texto(pg, '[data-testid=chave-2fa]', 3000)
    seg = urllib.parse.parse_qs(urllib.parse.urlparse(url).query).get('secret', [''])[0] if url else ''
    await pg.fill('input[placeholder="000000"]', totp(seg or (chave or '').replace(' ', '')))
    await pg.get_by_role('button', name='CONFIRMAR 2FA').click()
    await pg.wait_for_selector('text=SAIR DO PAINEL', timeout=8000)
    await asyncio.sleep(.3)
    return url, chave


async def clica(pg, sel):
    await pg.locator(sel).first.click()
    await asyncio.sleep(.15)


async def confirma(pg):
    await pg.wait_for_selector('[data-testid=confirmar-ok]', timeout=4000)
    await pg.locator('[data-testid=confirmar-ok]').click()
    await asyncio.sleep(.4)


async def abas(pg):
    return [x.strip() for x in await pg.locator('[data-testid=abas-painel] button').all_inner_texts()]


def token_painel(PL, usuario, senha):                       # (o login do painel pela API, para preparar as contas)
    lp = PL.m('admin.loginPainel', {'username': usuario, 'senha': senha})
    uid = PL.sql('SELECT id FROM usuarios WHERE username = ?', [usuario])[0]['id']
    seg = PL.sql('SELECT segredo FROM totp WHERE usuario_id = ?', [uid])[0]['segredo']
    PL.m('admin.verificar2fa', {'token': lp['token'], 'codigo': totp(seg)})
    return lp['token']


async def principal():
    P = Placar('v109 · os dois painéis do RACHA CONTROL no navegador')
    r = subprocess.run(['node', str(RAIZ / 'tests' / 'ui_site' / 'compila_ui.cjs')], capture_output=True, text=True)
    if r.returncode != 0:
        print(r.stdout, r.stderr); return 1
    SAIDA.mkdir(parents=True, exist_ok=True)
    banco = os.path.join(tempfile.mkdtemp(prefix='racha109p-'), 'plataforma.sqlite')
    PL = Plataforma(banco, {'RACHA_OWNER_PASSWORD': SENHA}).sobe()
    erros_js = []
    try:
        async with async_playwright() as pw:
            b = await pw.chromium.launch(executable_path=CHROME, args=['--no-sandbox'])
            css = os.environ.get('RACHA_CSS_PAINEL')            # (opcional: o CSS do site compilado, para as fotos saírem com o visual de verdade)
            if css and os.path.exists(css):
                _novo = b.new_context
                async def _com_css(*a, **k):
                    ctx = await _novo(*a, **k)
                    await ctx.add_init_script("document.addEventListener('DOMContentLoaded',()=>{if(!location.pathname.includes('ui_site'))return;const s=document.createElement('style');s.textContent=%s;document.head.appendChild(s);document.body.style.background='#120d2b';document.body.style.color='#fff8e7';});" % json.dumps(open(css, encoding='utf-8').read()))
                    return ctx
                b.new_context = _com_css
            ctxD = await b.new_context(viewport={'width': 1280, 'height': 900})
            pgD = await ctxD.new_page()
            pgD.on('pageerror', lambda e: erros_js.append('dono: ' + str(e)[:300]))

            print('\n1) o 2FA com QR code (o Dono)')
            url, chave = await login_qr(pgD, PL.base, 'dono', SENHA)
            seg = urllib.parse.parse_qs(urllib.parse.urlparse(url).query).get('secret', [''])[0] if url else ''
            P.confere(url.startswith('otpauth://totp/RACHA%3Adono?secret=') and len(seg) == 32 and chave and chave.replace(' ', '') == seg and len(chave.split(' ')) == 8,
                      'o QR code da tela é lido (otpauth:// com a chave de 32 letras) e a chave mostrada em 8 grupos de 4 é a mesma', [url, chave])
            P.confere(await pgD.locator('[data-testid=painel-dono]').count() == 1, 'o código tirado do QR entra: o Dono cai no PAINEL DO DONO')
            a = await abas(pgD)
            P.confere(all(x in a for x in ['🏠 Visão geral', '👥 Jogadores', '🛡 Staff', '📜 Registros', '🚩 Denúncias', '⛔ Punidos', '🎁 Presentes', '📅 Eventos', '👤 Contas']),
                      'as abas do painel do Dono (visão geral, jogadores, staff, registros, denúncias, punidos, presentes, eventos, contas)', a)
            await pgD.screenshot(path=str(SAIDA / 'v109_painel_dono.png'))

            # as contas (pela API do painel do Dono)
            donoTok = token_painel(PL, 'dono', SENHA)
            for u, n in [('mod109', 'Mod Bia'), ('jog109', 'Craque Zé'), ('jog2x109', 'Outro Craque')]:
                PL.m('donoContas.criar', {'username': u, 'nomeExibicao': n, 'senha': 'senha1234', 'aceiteTermos': True}, donoTok)
            pubJ = '%06d' % PL.sql("SELECT id_publico FROM usuarios WHERE username = 'jog109'")[0]['id_publico']

            print('\n2) o Dono coloca o Moderador na staff; o Moderador cai no painel da staff')
            await clica(pgD, '[data-testid=aba-staff]')
            await pgD.fill('[data-testid=staff-termo]', 'mod109')
            await pgD.select_option('[data-testid=staff-cargo]', 'moderador')
            await clica(pgD, '[data-testid=staff-adicionar]')
            await confirma(pgD)
            membro = await texto(pgD, '[data-testid^=membro-]:has-text("Mod Bia")', 5000)
            P.confere(membro and 'Moderador' in membro and 'esperando' not in membro and '— sem' in membro, 'o Moderador aparece na equipe (o 2FA ainda sem configurar)', membro)
            ctxS = await b.new_context(viewport={'width': 1280, 'height': 900})
            pgS = await ctxS.new_page()
            pgS.on('pageerror', lambda e: erros_js.append('staff: ' + str(e)[:300]))
            urlS, chaveS = await login_qr(pgS, PL.base, 'mod109', 'senha1234')
            P.confere(urlS.startswith('otpauth://totp/RACHA%3Amod109?secret=') and await pgS.locator('[data-testid=painel-staff]').count() == 1,
                      'o Moderador configura o 2FA pelo QR code e cai no PAINEL DA STAFF', urlS)
            aS = await abas(pgS)
            aviso = await texto(pgS, '[data-testid=painel-staff] >> text=Tudo o que você faz aqui fica registrado para o Dono', 3000)
            P.confere(aS == ['👥 Jogadores', '🚩 Denúncias', '⛔ Punidos', '📜 Meus registros'] and aviso and 'até 10 dias' in aviso and 'só do Dono' in aviso,
                      'as abas da staff (jogadores, denúncias, punidos, meus registros — sem presentes, staff, registros de todos, eventos, contas) e o aviso do que o cargo pode', [aS, aviso])

            print('\n3) o Moderador silencia o chat de um jogador')
            await pgS.fill('[data-testid=busca-jogador]', pubJ)
            await clica(pgS, '[data-testid=resultado-' + pubJ + ']')
            await pgS.wait_for_selector('[data-testid=ficha-jogador]', timeout=6000)
            await pgS.wait_for_selector('[data-testid=moderar]', timeout=6000)
            semDono = await pgS.locator('[data-testid=selos-dono], [data-testid=carteira-dono]').count()
            tempos = [x.strip() for x in await pgS.locator('[data-testid=sel-silencio] option').all_inner_texts()]
            P.confere(semDono == 0 and tempos == ['5 min', '10 min', '1 hora', '1 dia', '5 dias', '10 dias'], 'na ficha da staff: só a moderação (sem selo, carteira nem item) e os tempos do Moderador (até 10 dias)', [semDono, tempos])
            await pgS.fill('[data-testid=motivo-moderacao]', 'Xingou no chat do Brasil')
            await pgS.select_option('[data-testid=sel-silencio]', str(24 * 60))
            await clica(pgS, '[data-testid=acao-silenciar]')
            await confirma(pgS)
            av = await texto(pgS, '[data-testid=aviso-painel]', 5000)
            sil = await texto(pgS, '[data-testid=ficha-silencio]', 5000)
            P.confere(av and 'sem chat por 1 dia' in av and sil and 'SEM CHAT' in sil, 'silenciar pelo painel: o aviso "ficou sem chat por 1 dia" e a ficha mostra SEM CHAT', [av, sil])
            await pgS.screenshot(path=str(SAIDA / 'v109_painel_staff_ficha.png'))
            await clica(pgS, '[data-testid=aba-punidos]')
            pun = await texto(pgS, '[data-testid=punido-' + pubJ + ']', 5000)
            await clica(pgS, '[data-testid=aba-registros]')
            meus = await texto(pgS, '[data-testid=aba-meus-registros-conteudo]', 5000)
            P.confere(pun and 'SILÊNCIO NO CHAT' in pun and 'Xingou' in pun and meus and 'Silenciou o chat' in meus and 'Craque Zé' in meus, 'o jogador aparece em PUNIDOS e a ação em MEUS REGISTROS', [pun, meus and meus[:300]])

            print('\n4) o Dono vê o que a staff fez e dá o verificado e moedas')
            await clica(pgD, '[data-testid=aba-registros]')
            reg = await texto(pgD, '[data-testid=registros-dono]', 6000)
            await asyncio.sleep(.5)
            reg = await texto(pgD, '[data-testid=lista-registros]', 6000)
            P.confere(reg and 'Mod Bia' in reg and 'Silenciou o chat' in reg and 'Xingou no chat do Brasil' in reg and 'Craque Zé' in reg, 'os REGISTROS do Dono: o Moderador silenciou o chat do Craque Zé (com o motivo)', reg and reg[:400])
            await pgD.screenshot(path=str(SAIDA / 'v109_painel_dono_registros.png'))
            await clica(pgD, '[data-testid=aba-geral]')
            res = await texto(pgD, '[data-testid=resumo-staff]', 6000)
            P.confere(res and 'Mod Bia' in res, 'a VISÃO GERAL mostra o Moderador no resumo da staff', res)
            await pgD.screenshot(path=str(SAIDA / 'v109_painel_dono_visao.png'))
            await clica(pgD, '[data-testid=aba-jogadores]')
            await pgD.fill('[data-testid=busca-jogador]', pubJ)
            await clica(pgD, '[data-testid=resultado-' + pubJ + ']')
            await pgD.wait_for_selector('[data-testid=selos-dono]', timeout=6000)
            await clica(pgD, '[data-testid=selo-verificado]')
            await confirma(pgD)
            await pgD.fill('[data-testid=carteira-moedas]', '250')
            await pgD.fill('[data-testid=carteira-motivo]', 'Campeão do torneio')
            await clica(pgD, '[data-testid=acao-carteira]')
            await confirma(pgD)
            av2 = await texto(pgD, '[data-testid=aviso-painel]', 5000)
            selos = PL.sql("SELECT selo FROM selos s JOIN usuarios u ON u.id = s.usuario_id WHERE u.username = 'jog109'")
            P.confere(av2 and 'Carteira de Craque Zé' in av2 and any(x['selo'] == 'verificado' for x in selos), 'na ficha do Dono: dar o verificado e 250 moedas (o aviso com o saldo novo)', [av2, selos])
            await pgD.screenshot(path=str(SAIDA / 'v109_painel_dono_ficha.png'))

            print('\n5) o Dono reseta o 2FA do Moderador')
            await clica(pgD, '[data-testid=aba-staff]')
            await pgD.wait_for_selector('[data-testid^=membro-abre-]', timeout=6000)
            pubM = '%06d' % PL.sql("SELECT id_publico FROM usuarios WHERE username = 'mod109'")[0]['id_publico']
            await clica(pgD, '[data-testid=membro-abre-' + pubM + ']')
            await pgD.screenshot(path=str(SAIDA / 'v109_painel_dono_staff.png'))
            await clica(pgD, '[data-testid=membro-2fa-' + pubM + ']')
            await confirma(pgD)
            av3 = await texto(pgD, '[data-testid=aviso-painel]', 5000)
            n2fa = PL.sql('SELECT COUNT(*) AS n FROM totp t JOIN usuarios u ON u.id = t.usuario_id WHERE u.username = ?', ['mod109'])[0]['n']
            await pgS.reload()
            await pgS.wait_for_selector('input[placeholder="Usuário da equipe"]', timeout=8000)
            P.confere(av3 and 'QR code novo' in av3 and n2fa == 0, 'resetar o 2FA do Moderador pela aba Staff: o 2FA dele zera e a sessão do painel cai (volta para o login)', [av3, n2fa])

            print('\n6) o jogo mostra o aviso do silêncio')
            ctxJ = await b.new_context(viewport={'width': 1100, 'height': 700})
            pgJ = await ctxJ.new_page()
            pgJ.on('pageerror', lambda e: erros_js.append('jogo: ' + str(e)[:300]))
            await pgJ.goto(PL.base + '/tests/build/racha_teste.html')
            await pgJ.wait_for_function('() => typeof window.__RT === "function"', timeout=20000)
            r1 = await pgJ.evaluate("""() => { const t = 'Você está silenciado no chat pela equipe do RACHA por mais 1 dia. Motivo: Xingou';
              __RT("net49Message({type:'silenciado', ate:Date.now() + 864e5, texto:" + JSON.stringify(t) + "})");
              return {toast:(document.getElementById('x49-toast') || {}).textContent || '', aviso:__RT("LB && LB.aviso ? LB.aviso.textContent : ''"), lobby:__RT("lobby.aberto"), estado:window.RachaSilencio109 && window.RachaSilencio109.estado()}; }""")
            # (na partida — o lobby fechado — o mesmo aviso vai para o de baixo, o #x49-toast; o lobby volta como estava)
            r1b = await pgJ.evaluate("""() => { const antes = __RT("lobby.aberto"); __RT("lobby.aberto = false");
              __RT("net49Message({type:'silenciado', ate:0, texto:'O seu chat está liberado.'})");
              const r = {toast:(document.getElementById('x49-toast') || {}).textContent || '', aviso:__RT("LB && LB.aviso ? LB.aviso.textContent : ''"), estado:window.RachaSilencio109.estado()};
              __RT("lobby.aberto = " + JSON.stringify(!!antes)); return r; }""")
            r2 = await pgJ.evaluate("""() => { const t = 'Você está silenciado no chat pela equipe do RACHA por mais 23 horas. Motivo: Xingou';
              __RT("brasilMsg({type:'brasil_error', reason:'silenciado', texto:" + JSON.stringify(t) + "})");
              const lb = document.querySelector('#lb .aviso, #lbAviso, .lb-aviso'); return {toast:(document.getElementById('x49-toast') || {}).textContent || '', erro81:__RT("C81.erro ? C81.erro.textContent : ''"), aviso:__RT("LB && LB.aviso ? LB.aviso.textContent : ''")}; }""")
            r3 = await pgJ.evaluate("""() => { __RT("brasilMsg({type:'brasil_error', reason:'silenciado'})"); return {erro81:__RT("C81.erro ? C81.erro.textContent : ''"), aviso:__RT("LB && LB.aviso ? LB.aviso.textContent : ''"), toast:(document.getElementById('x49-toast') || {}).textContent || ''}; }""")
            P.confere((('por mais 1 dia' in r1['toast']) != ('por mais 1 dia' in (r1['aviso'] or ''))) and r1['estado'] and r1['estado']['ate'] > time.time() * 1000
                      and 'liberado' in r1b['toast'] and 'liberado' not in (r1b['aviso'] or '') and r1b['estado']['ate'] == 0,
                      'o aviso ao vivo do silêncio aparece no jogo UMA vez (com quanto falta e o motivo: no lobby, o balão do lobby; na partida, o de baixo) e o "liberado" também', [r1, r1b])
            P.confere(any('por mais 23 horas' in (r2[k] or '') for k in ('toast', 'erro81', 'aviso')), 'no Chat do Brasil, o aviso do servidor (com quanto falta) no lugar do "silenciado por denúncias"', r2)
            P.confere(any('por denúncias' in (r3[k] or '') for k in ('toast', 'erro81', 'aviso')), 'sem o texto (um servidor de antes), o aviso de antes continua', r3)
            await ctxJ.close()

            print('\n7) o painel da staff no celular')
            ctxC = await b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
            pgC = await ctxC.new_page()
            pgC.on('pageerror', lambda e: erros_js.append('celular: ' + str(e)[:300]))
            PL.m('admin.definirCargo', {'termo': 'jog2x109', 'cargo': 'ajudante', 'confirmacao': True}, donoTok)
            await login_qr(pgC, PL.base, 'jog2x109', 'senha1234')
            await pgC.fill('[data-testid=busca-jogador]', pubJ)
            await clica(pgC, '[data-testid=resultado-' + pubJ + ']')
            await pgC.wait_for_selector('[data-testid=ficha-jogador]', timeout=6000)
            larg = await pgC.evaluate('() => ({doc:document.documentElement.scrollWidth, tela:window.innerWidth})')
            temposA = [x.strip() for x in await pgC.locator('[data-testid=sel-silencio] option').all_inner_texts()]
            P.confere(larg['doc'] <= larg['tela'] + 1 and temposA == ['5 min', '10 min', '1 hora'] and await pgC.locator('[data-testid=sel-banir]').count() == 0,
                      'no celular (390 px) o painel da staff não rola para o lado; o Ajudante silencia até 1 hora e não bane', [larg, temposA])
            await pgC.screenshot(path=str(SAIDA / 'v109_painel_staff_celular.png'), full_page=True)
            await ctxC.close()
            await ctxS.close(); await ctxD.close(); await b.close()
    finally:
        PL.desce()
    P.confere(not erros_js, 'nenhum erro de JavaScript', erros_js[:5])
    return P.fim()


if __name__ == '__main__':
    sys.exit(asyncio.run(principal()))
