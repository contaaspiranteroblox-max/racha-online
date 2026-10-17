"""Comum aos testes automáticos do RACHA (Playwright + Chromium).

Os testes abrem tests/build/racha_teste.html — a mesma página que o build gera em app/public/game/racha.html, com um
gancho a mais (window.__RT) para ler e montar situações de jogo por dentro. O build (tools/aplicar_rua.py) gera as duas.
Variáveis: RACHA_TESTE=<arquivo .html> troca a página testada (ex.: a cópia da versão anterior, para comparar).
"""
import asyncio, json, os, sys, pathlib, time
from playwright.async_api import async_playwright

RAIZ = pathlib.Path(__file__).resolve().parent.parent
PAGINA = pathlib.Path(os.environ.get('RACHA_TESTE', RAIZ / 'tests' / 'build' / 'racha_teste.html'))
CHROME = os.environ.get('RACHA_CHROME', '/opt/pw-browsers/chromium')
HARNESS = (RAIZ / 'tests' / 'harness.js').read_text(encoding='utf-8')
# as fontes do jogo vêm do Google Fonts (sem internet, o jogo usa as do sistema); nos testes não há internet, então estes
# nomes locais só evitam a espera do carregamento no Chromium de teste (ver app/public/game/fontes/LEIA-ME.txt)
FONTES = """
@font-face{font-family:'Barlow Condensed';src:local('TeXGyreHerosCondensed-Bold');font-weight:600 900;}
@font-face{font-family:'Lilita One';src:local('Poppins-Bold');}
@font-face{font-family:'Anton';src:local('TeXGyreHerosCondensed-Bold');}
"""


class Placar:
    """Junta os resultados: cada verificação vira uma linha OK/FALHOU; no fim, o resumo e o código de saída."""
    def __init__(self, nome):
        self.nome, self.ok, self.falhas, self.t0 = nome, 0, [], time.time()

    def confere(self, cond, oque, detalhe=''):
        if cond:
            self.ok += 1
            print('  OK      ' + oque)
        else:
            self.falhas.append(oque)
            print('  FALHOU  ' + oque + ('  ·  ' + str(detalhe) if detalhe != '' else ''))
        return cond

    def fim(self):
        n = self.ok + len(self.falhas)
        print('\n%s: %d/%d verificações ok em %.1f s' % (self.nome, self.ok, n, time.time() - self.t0))
        for f in self.falhas:
            print('  - falhou: ' + f)
        return 0 if not self.falhas else 1


async def abre(pw, w=1280, h=720, toque=True, dsf=1.0, pagina=None, armazenamento=None, config=None, sem_onb=True, movimento=None, offline=True, config_do_build=False):
    """Abre o jogo num navegador novo. Devolve (navegador, página, erros). armazenamento: dict para o localStorage antes de abrir.
    config: dict para window.RACHA_CONFIG (ex.: {'modo': 'demo'}) · sem_onb=False deixa a primeira vez aparecer ·
    movimento='reduce' imita o sistema com "reduzir movimento" ligado (prefers-reduced-motion).
    v87.2: o config.js do build liga o presente de TESTE na produção (presente: true, para testar a loja); os testes abrem
    como o lançamento — presente: false, a não ser que o config do teste diga o presente ou seja a demonstração.
    config_do_build=True abre com o config.js do build como ele está (nada por cima)."""
    b = await pw.chromium.launch(executable_path=CHROME, args=['--no-sandbox', '--autoplay-policy=no-user-gesture-required'])
    ctx = await b.new_context(viewport={'width': w, 'height': h}, device_scale_factor=dsf, has_touch=toque)
    await ctx.add_init_script("document.addEventListener('DOMContentLoaded',()=>{const s=document.createElement('style');s.textContent=%s;document.head.prepend(s);});" % json.dumps(FONTES))
    if not config_do_build:
        config = dict(config or {})
        if 'presente' not in config and config.get('modo') != 'demo':
            config['presente'] = False
        await ctx.add_init_script('window.RACHA_CONFIG = %s;' % json.dumps(config))
    if armazenamento:
        await ctx.add_init_script("try{const o=%s;for(const k in o)localStorage.setItem(k,o[k]);}catch(e){}" % json.dumps(armazenamento))
    pg = await ctx.new_page()
    erros = []
    pg.on('pageerror', lambda e: erros.append(str(e)[:300]))
    pg.on('console', lambda m: erros.append('console: ' + m.text[:200]) if m.type == 'error' else None)
    if movimento:
        await pg.emulate_media(reduced_motion=movimento)
    await pg.goto((pagina or PAGINA).resolve().as_uri())
    await pg.wait_for_function('() => typeof window.__RT === "function"', polling=100, timeout=20000)
    await pg.wait_for_timeout(600)
    if sem_onb:
        await pg.evaluate("(() => { const o = document.getElementById('onb'); if (o) o.hidden = true; })()")
    if offline:   # v84 (login obrigatório sem o site): o teste escolhe SÓ TREINAR OFFLINE, como quem joga sem a plataforma
        await pg.evaluate("(() => { const b = [...document.querySelectorAll('#v84auth button')].find(x => /TREINAR OFFLINE/.test(x.textContent || '')); if (b) b.click(); })()")
        await pg.wait_for_timeout(100)
    await rt(pg, HARNESS)
    return b, pg, erros


async def rt(pg, js):
    """Avalia js dentro do script do jogo (com acesso às variáveis internas)."""
    return await pg.evaluate('s => window.__RT(s)', js)


def roda(corrotina):
    sys.exit(asyncio.run(corrotina))
