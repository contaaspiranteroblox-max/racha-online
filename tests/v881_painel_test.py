"""v88.1 · o RACHA CONTROL e o login do SITE num navegador de verdade, pelos botões: as páginas de verdade do app/src
(AdminPage, a aba CONTAS, EntrarPage, RedefinirPage) juntadas pelo tests/ui_site/compila_ui.cjs com o React desta máquina e
um cliente de teste no lugar do @trpc/react-query, falando com a PLATAFORMA DE TESTE (as rotas de app/api com SQLite) com
os cookies de verdade. Confere: o login do painel com o 2FA (a chave em grupos de 4), o painel continuando aberto depois de
recarregar (o cookie do painel), a aba CONTAS só para o Dono, criar conta (a senha gerada aparece uma vez), os erros, a
senha nova, abrir e fechar o cadastro (o site esconde o "Criar conta"), o ZERAR CONTAS e o SAIR DO PAINEL sem derrubar a
sessão do jogo.
  python3 tests/v881_painel_test.py
"""
import asyncio, base64, hashlib, hmac, json, os, re, struct, subprocess, sys, tempfile, time, socket, urllib.request, urllib.parse, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from comum import Placar, RAIZ, CHROME
from playwright.async_api import async_playwright

SENHA = 'Dono-Painel-881a'


def porta_livre():
    s = socket.socket(); s.bind(('127.0.0.1', 0)); p = s.getsockname()[1]; s.close(); return p


def totp(segredo, t=None):                                  # (o mesmo TOTP do app/api/racha/security.ts)
    chave = base64.b32decode(segredo.replace(' ', '').upper() + '=' * (-len(segredo.replace(' ', '')) % 8))
    passo = int((t or time.time()) // 30)
    h = hmac.new(chave, struct.pack('>Q', passo), hashlib.sha1).digest()
    o = h[-1] & 15
    return '%06d' % ((struct.unpack('>I', h[o:o + 4])[0] & 0x7fffffff) % 1000000)


class Plataforma:
    def __init__(self, banco, env):
        self.banco, self.env, self.p, self.porta = banco, env, None, None

    def sobe(self):
        self.porta = porta_livre()
        env = {k: v for k, v in os.environ.items() if k not in ('RACHA_CADASTRO', 'RACHA_OWNER_PASSWORD', 'RACHA_PRESENTE_TESTE')}
        env.update(self.env)
        self.p = subprocess.Popen(['node', str(RAIZ / 'tests' / 'plataforma' / 'servidor.mjs'), '--porta', str(self.porta), '--teste', '--banco', self.banco, '--sem-compilar'],
                                  cwd=str(RAIZ), env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
        t0 = time.time()
        while time.time() - t0 < 40:
            try:
                with urllib.request.urlopen(self.base + '/__teste/saude', timeout=1) as r:
                    if json.loads(r.read()).get('ok'): return self
            except Exception:
                time.sleep(.25)
        raise RuntimeError('a plataforma de teste não subiu')

    @property
    def base(self):
        return 'http://127.0.0.1:%d' % self.porta

    def desce(self):
        if self.p:
            self.p.terminate()
            try: self.p.wait(5)
            except Exception: self.p.kill()
            self.p = None

    def api(self, proc, inp=None, token=None, query=False):
        corpo = json.dumps({'0': {'json': inp}})
        url = self.base + '/api/trpc/' + proc + '?batch=1' + ('&input=' + urllib.parse.quote(corpo) if query else '')
        req = urllib.request.Request(url, data=None if query else corpo.encode(), method='GET' if query else 'POST',
                                     headers={'content-type': 'application/json', **({'authorization': 'Bearer ' + token} if token else {})})
        try:
            with urllib.request.urlopen(req, timeout=15) as r: l = json.loads(r.read())
        except urllib.error.HTTPError as e:
            l = json.loads(e.read())
        um = l[0]
        if 'error' in um: raise RuntimeError(um['error']['json']['message'])
        return um['result']['data']['json']

    def q(self, proc, inp=None, token=None): return self.api(proc, inp, token, True)
    def m(self, proc, inp=None, token=None): return self.api(proc, inp, token, False)

    def sql(self, sql, params=None):
        req = urllib.request.Request(self.base + '/__teste/sql', data=json.dumps({'sql': sql, 'params': params or []}).encode(), method='POST', headers={'content-type': 'application/json'})
        with urllib.request.urlopen(req, timeout=10) as r: return json.loads(r.read()).get('linhas')


def tenta(f):
    try: return f(), None
    except Exception as e: return None, str(e)


async def texto(pg, sel, ms=6000):
    try:
        await pg.wait_for_selector(sel, timeout=ms)
        return (await pg.inner_text(sel)).strip()
    except Exception:
        return None


async def espera_texto(pg, sel, cond, ms=6000):
    t0 = time.time(); v = None
    while (time.time() - t0) * 1000 < ms:
        v = await texto(pg, sel, 500)
        if v is not None and cond(v): return v
        await asyncio.sleep(.1)
    return v


async def login_painel(pg, base, usuario, senha, segredo=None):
    """O login do RACHA CONTROL pelos botões; devolve (chave do 2FA, erro mostrado). Com o 2FA já configurado o painel não
    mostra a chave: segredo() traz o segredo do banco de teste (o que o app autenticador da pessoa teria)."""
    await pg.goto(base + '/tests/build/ui_site.html#/admin')
    await pg.wait_for_selector('input[placeholder="Usuário da equipe"]', timeout=8000)
    await pg.fill('input[placeholder="Usuário da equipe"]', usuario)
    await pg.fill('input[placeholder="Senha"]', senha)
    await pg.get_by_role('button', name='ENTRAR NO PAINEL').click()
    chave = await texto(pg, '[data-testid=chave-2fa]', 5000)
    if not chave and segredo and await pg.locator('input[placeholder="000000"]').count():
        chave = segredo()
    if not chave:
        return None, await texto(pg, 'form div.rounded-xl.border-2', 1500)
    await pg.fill('input[placeholder="000000"]', totp(chave))
    await pg.get_by_role('button', name='CONFIRMAR 2FA').click()
    await pg.wait_for_selector('text=SAIR DO PAINEL', timeout=8000)   # (o "RACHA CONTROL" também está na tela do login: espera o painel)
    await asyncio.sleep(.3)
    return chave, None


async def principal():
    P = Placar('v88.1 · o RACHA CONTROL e o login do site no navegador')
    r = subprocess.run(['node', str(RAIZ / 'tests' / 'ui_site' / 'compila_ui.cjs')], capture_output=True, text=True)
    if r.returncode != 0:
        print(r.stdout, r.stderr); return 1
    banco = os.path.join(tempfile.mkdtemp(prefix='racha881p-'), 'plataforma.sqlite')
    PL = Plataforma(banco, {'RACHA_OWNER_PASSWORD': SENHA}).sobe()
    erros_js = []
    try:
        async with async_playwright() as pw:
            b = await pw.chromium.launch(executable_path=CHROME, args=['--no-sandbox'])
            ctx = await b.new_context(viewport={'width': 1280, 'height': 860})
            pg = await ctx.new_page()
            pg.on('pageerror', lambda e: erros_js.append(str(e)))

            print('1) o login do SITE com o cadastro fechado (o padrão)')
            await pg.goto(PL.base + '/tests/build/ui_site.html#/entrar')
            aviso = await texto(pg, '[data-testid=aviso-cadastro-fechado]')
            abas = [x.strip() for x in await pg.locator('div.mb-5 button').all_inner_texts()]
            P.confere(aviso and 'dono do RACHA' in aviso and abas == ['Entrar', 'Recuperar'], 'sem o "Criar conta" e com o aviso: as contas novas saem do Dono', (abas, aviso))
            await pg.locator('form input').first.fill('dono')
            await pg.fill('form input[type=password]', SENHA)
            await pg.get_by_role('button', name='ENTRAR', exact=True).click()
            P.confere(await texto(pg, '[data-testid=inicio]', 6000) is not None, 'o Dono entra pelo login do site (a página antes nem compilava: os imports apontavam para arquivos que não existem)')
            cookies = {c['name']: c for c in await ctx.cookies()}
            P.confere('racha_sessao' in cookies and cookies['racha_sessao']['httpOnly'], 'a sessão do jogo fica no cookie (HttpOnly)', list(cookies))

            print('\n2) o login do RACHA CONTROL com o 2FA')
            _, err = await login_painel(pg, PL.base, 'dono', 'Racha@Dono1')
            P.confere(err is not None and ('Credenciais' in err or 'manual' in err), 'a senha do manual não entra no painel', err)
            chave, err = await login_painel(pg, PL.base, 'dono', SENHA)
            P.confere(chave and re.fullmatch(r'([A-Z2-7]{4} ){4}[A-Z2-7]{4}', chave), 'a chave do 2FA aparece em grupos de 4 (fácil de digitar no app autenticador)', chave)
            P.confere(await pg.get_by_role('button', name='👤 Contas').count() == 1, 'o painel abre depois do 2FA, com a aba 👤 Contas (o Dono)')
            await pg.reload()
            await pg.wait_for_selector('text=SAIR DO PAINEL', timeout=8000)
            P.confere(await pg.get_by_role('button', name='👤 Contas').count() == 1 and await pg.locator('input[placeholder="Usuário da equipe"]').count() == 0,
                      'recarregando a página o painel continua aberto (o cookie do painel agora vale nas rotas do painel)')

            print('\n3) a aba CONTAS: criar uma conta')
            await pg.get_by_role('button', name='👤 Contas').click()
            P.confere(await espera_texto(pg, '[data-testid=total-contas]', lambda v: v == '1') == '1' and await texto(pg, '[data-testid=proxima-conta]') == '000002'
                      and await texto(pg, '[data-testid=cadastro-estado]') == 'CADASTRO FECHADO', 'o resumo: 1 conta, a próxima é a 000002, cadastro fechado')
            await pg.get_by_label('Usuário (login)').fill('Kauã Silva')
            await pg.get_by_label('Nome no jogo').fill('Kauã')
            await pg.get_by_label('O jogador aceitou os termos').check()
            await pg.get_by_role('button', name='CRIAR CONTA', exact=True).click()
            alerta = await texto(pg, '[data-testid=aba-contas] [role=alert]', 3000)
            P.confere(alerta and 'letras minúsculas' in alerta, 'o usuário com espaço e acento é recusado antes de ir para o servidor', alerta)
            await pg.get_by_label('Usuário (login)').fill('kauazin7')
            await pg.get_by_role('button', name='CRIAR CONTA', exact=True).click()
            await pg.wait_for_selector('[data-testid=credenciais]', timeout=6000)
            cid, cus, cse = await texto(pg, '[data-testid=cred-id]'), await texto(pg, '[data-testid=cred-usuario]'), await texto(pg, '[data-testid=cred-senha]')
            P.confere(cid == '000002' and cus == 'kauazin7' and cse and re.fullmatch(r'[A-Za-z2-9]{4}-[A-Za-z2-9]{4}-[A-Za-z2-9]{4}', cse),
                      'a conta 000002 criada: o usuário e a senha gerada aparecem uma vez (com o COPIAR PARA MANDAR)', (cid, cus, cse))
            entrou, e = tenta(lambda: PL.m('auth.entrar', {'identificador': 'kauazin7', 'senha': cse}))
            P.confere(entrou and entrou['conta']['idPublico'] == '000002', 'o jogador entra no jogo com o usuário e a senha mostrados', e)
            await pg.get_by_role('button', name='JÁ ANOTEI').click()
            P.confere(await pg.locator('[data-testid=credenciais]').count() == 0 and await espera_texto(pg, '[data-testid=total-contas]', lambda v: v == '2') == '2',
                      'fechado o cartão, a senha não aparece mais e a lista tem 2 contas')
            await pg.get_by_label('Usuário (login)').fill('kauazin7')
            await pg.get_by_label('Nome no jogo').fill('Outro')
            await pg.get_by_label('O jogador aceitou os termos').check()
            await pg.get_by_role('button', name='CRIAR CONTA', exact=True).click()
            alerta = await espera_texto(pg, '[data-testid=aba-contas] [role=alert]', lambda v: 'em uso' in v, 4000)
            P.confere(alerta and 'em uso' in alerta, 'o usuário repetido: o servidor recusa e a mensagem aparece limpa', alerta)

            print('\n4) a senha nova')
            linha = pg.locator('[data-testid=lista-contas] > div', has_text='000002')
            await linha.get_by_role('button', name='SENHA NOVA').click()
            await pg.get_by_role('button', name='GERAR').click()
            await pg.wait_for_selector('[data-testid=credenciais]', timeout=6000)
            nova = await texto(pg, '[data-testid=cred-senha]')
            velha, ev = tenta(lambda: PL.m('auth.entrar', {'identificador': 'kauazin7', 'senha': cse}))
            ok_nova, en = tenta(lambda: PL.m('auth.entrar', {'identificador': 'kauazin7', 'senha': nova}))
            P.confere(nova and nova != cse and not velha and ok_nova, 'a senha nova vale e a de antes não', (ev, en))
            await pg.get_by_role('button', name='JÁ ANOTEI').click()

            print('\n5) a aba CONTAS é só do Dono')
            uid = PL.sql("SELECT id FROM usuarios WHERE username = 'kauazin7'")[0]['id']
            PL.sql("INSERT INTO cargos (usuario_id, cargo, concedido_por, permissoes, criado_em) VALUES (?, 'administrador', 1, NULL, ?)", [uid, int(time.time() * 1000)])
            ctx2 = await b.new_context(viewport={'width': 1280, 'height': 860})
            pg2 = await ctx2.new_page()
            await login_painel(pg2, PL.base, 'kauazin7', nova)
            abas2 = [x.strip() for x in await pg2.locator('div.overflow-x-auto button').all_inner_texts()]
            P.confere(abas2 and '👤 Contas' not in abas2 and '👥 Jogadores' in abas2, 'o administrador da equipe entra no painel, mas sem a aba Contas', abas2)
            await ctx2.close()
            PL.sql("UPDATE cargos SET cargo = 'dono' WHERE usuario_id = ?", [uid])
            ctx2 = await b.new_context(viewport={'width': 1280, 'height': 860})
            pg2 = await ctx2.new_page()
            await login_painel(pg2, PL.base, 'kauazin7', nova, lambda: PL.sql('SELECT segredo FROM totp WHERE usuario_id = ?', [uid])[0]['segredo'])
            abas2 = [x.strip() for x in await pg2.locator('div.overflow-x-auto button').all_inner_texts()]
            P.confere(abas2 and '👤 Contas' not in abas2 and '🛡 Equipe' in abas2, 'nem um segundo Dono (o cargo dado pelo painel): a aba Contas é só da conta 000001', abas2)
            await ctx2.close()
            PL.sql('DELETE FROM cargos WHERE usuario_id = ?', [uid])

            print('\n6) abrir e fechar o cadastro: o site mostra e esconde o "Criar conta"')
            await pg.get_by_role('button', name='ABRIR O CADASTRO').click()
            P.confere(await espera_texto(pg, '[data-testid=cadastro-estado]', lambda v: v == 'CADASTRO ABERTO') == 'CADASTRO ABERTO' and PL.q('auth.cadastro')['aberto'] is True,
                      'aberto pelo botão (e o servidor diz aberto)')
            ctx3 = await b.new_context(viewport={'width': 420, 'height': 860})
            pg3 = await ctx3.new_page()
            await pg3.goto(PL.base + '/tests/build/ui_site.html#/entrar')
            await pg3.wait_for_selector('div.mb-5 button', timeout=6000)
            await asyncio.sleep(.6)
            abas3 = [x.strip() for x in await pg3.locator('div.mb-5 button').all_inner_texts()]
            P.confere(abas3 == ['Entrar', 'Criar conta', 'Recuperar'] and await pg3.locator('[data-testid=aviso-cadastro-fechado]').count() == 0,
                      'com o cadastro aberto, o site mostra o "Criar conta" de novo', abas3)
            await pg.get_by_role('button', name='FECHAR O CADASTRO').click()
            P.confere(await espera_texto(pg, '[data-testid=cadastro-estado]', lambda v: v == 'CADASTRO FECHADO') == 'CADASTRO FECHADO' and PL.q('auth.cadastro')['aberto'] is False,
                      'e fechado de novo')
            await pg3.reload()
            await pg3.wait_for_selector('[data-testid=aviso-cadastro-fechado]', timeout=6000)
            P.confere([x.strip() for x in await pg3.locator('div.mb-5 button').all_inner_texts()] == ['Entrar', 'Recuperar'], 'o site volta a esconder o "Criar conta"')
            await ctx3.close()

            print('\n7) ZERAR CONTAS')
            await pg.get_by_label('Sua senha').fill(SENHA)
            await pg.get_by_label('Escreva ZERAR').fill('zerar')
            P.confere(await pg.get_by_role('button', name='ZERAR AS CONTAS').is_disabled(), 'com a palavra errada (minúscula) o botão nem acende')
            await pg.get_by_label('Escreva ZERAR').fill('ZERAR')
            await pg.get_by_role('button', name='ZERAR AS CONTAS').click()
            st = await espera_texto(pg, '[data-testid=aba-contas] [role=status]', lambda v: 'Pronto' in v, 6000)
            P.confere(st and '1 conta(s) apagada(s)' in st and '000001' in st and '000002' in st, 'zerado: 1 conta apagada, você é a 000001 e a próxima vai ser a 000002', st)
            P.confere(await espera_texto(pg, '[data-testid=total-contas]', lambda v: v == '1') == '1' and await texto(pg, '[data-testid=proxima-conta]') == '000002', 'o resumo volta para 1 conta')
            P.confere([x['username'] for x in PL.sql('SELECT username FROM usuarios')] == ['dono'], 'no banco, sobrou só a conta do Dono')

            print('\n8) SAIR DO PAINEL não derruba a sessão do jogo')
            await pg.get_by_role('button', name='SAIR DO PAINEL').click()
            await pg.wait_for_selector('input[placeholder="Usuário da equipe"]', timeout=6000)
            eu = await pg.evaluate("""async () => { const r = await fetch('/api/trpc/auth.eu?batch=1&input=' + encodeURIComponent(JSON.stringify({0:{json:null}})), {credentials:'include'}); return (await r.json())[0].result.data.json; }""")
            ep = await pg.evaluate("""async () => { const r = await fetch('/api/trpc/admin.estadoPainel?batch=1&input=' + encodeURIComponent(JSON.stringify({0:{json:null}})), {credentials:'include'}); return (await r.json())[0].result.data.json; }""")
            P.confere(eu.get('logado') and eu['conta']['idPublico'] == '000001' and not ep.get('logado'), 'saiu do painel (a sessão do painel acabou) e o jogo continua logado', (eu.get('logado'), ep))
            P.confere(not erros_js, 'nenhum erro de JavaScript nas páginas', erros_js[:3])
            await b.close()
    finally:
        PL.desce()
    return P.fim()


if __name__ == '__main__':
    sys.exit(asyncio.run(principal()))
