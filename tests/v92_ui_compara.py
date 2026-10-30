"""RACHA v92 · A UI DA v91 PRESERVADA: abre as mesmas telas na v91 original e na v92 (versão oficial, sem o experimental) com
o mesmo relógio de mentira e o mesmo sorteio (as animações ficam iguais nas duas) e compara as imagens pixel a pixel.
Não é passa/falha automático da bateria: gera as imagens lado a lado e uma tabela (a % de pixels diferentes por tela).
Uso: python3 tests/v92_ui_compara.py <racha_teste.html da v91> <pasta de saída> [--experimental]
     (a v92 é a página de teste deste build; RACHA_TESTE muda. --experimental abre a v92 como a VERSÃO DE TESTES, com o
     painel: mostra o que muda nela — a aba TESTES v92 nos AJUSTES)"""
import asyncio, json, os, sys, pathlib
from comum import abre, rt, async_playwright, PAGINA
from PIL import Image, ImageChops

FIXO = r"""(() => {                       // o relógio dos quadros e o sorteio fixos (antes do jogo abrir)
  let s = 20261021; Math.random = () => { s = (s*1664525 + 1013904223) >>> 0; return s/4294967296; };
  const fila = [], Q = window.__quadro = {t:1000, fila};
  window.requestAnimationFrame = cb => { fila.push(cb); return fila.length; };
  const ini = 1000; performance.now = () => Q.t; Date.now = (() => { const d0 = 1792540800000; return () => d0 + Q.t; })();
  Q.passo = (n, ms) => { for (let i = 0; i < n; i++){ Q.t += ms || 1000/60; const cbs = fila.splice(0); for (const cb of cbs){ try { cb(Q.t); } catch (e) {} } } };
  // (o sorteio do crypto também fixo — o número do jogador e os códigos — e as animações de CSS paradas no fim: senão
  // duas fotos da MESMA versão já saem diferentes; o controle v91 × v91 mostra isso)
  try { let c = 7; crypto.getRandomValues = a => { for (let i = 0; i < a.length; i++){ c = (c*1103515245 + 12345) >>> 0; a[i] = c & (a.BYTES_PER_ELEMENT === 1 ? 255 : a.BYTES_PER_ELEMENT === 2 ? 65535 : 0xffffffff); } return a; };
        let u = 0; crypto.randomUUID = () => '00000000-0000-4000-8000-' + String(++u).padStart(12, '0'); } catch (e) {}
  document.addEventListener('DOMContentLoaded', () => { const st = document.createElement('style'); st.textContent = '*,*::before,*::after{animation-duration:0s!important;animation-delay:0s!important;transition:none!important}'; document.head.appendChild(st); });
})();"""

TELAS = [
    ('inicio', None),
    ('perfil', "abreTela('perfil')"),
    ('cofre', "abreTela('cofre')"),
    ('loja', "abreTela('loja')"),
    ('ranking', "abreTela('ranking')"),
    ('salas', "abreTela('amigos')"),
    ('treino', "abreTela('treino')"),
    ('eventos', "abreTela('eventos')"),
    ('ajustes_audio', "ajxAbre('audio')"),
    ('ajustes_controles', "ajxAbre('controles')"),
    ('ajustes_camera', "ajxAbre('camera')"),
    ('partida_hud', "(() => { x49Start(2, 0); return 1; })()"),
    ('partida_pausa', "(() => { x49Start(2, 0); return 1; })()"),
]


async def foto(pw, pagina, w, h, dsf, nome, js, saida, cfg=None):
    os.environ['RACHA_TESTE'] = str(pagina)
    b, pg, erros = await abre(pw, w, h, dsf=dsf, pagina=pathlib.Path(pagina), config=cfg)
    try:
        await pg.add_init_script(FIXO)
        await pg.evaluate("(() => { try { localStorage.clear(); sessionStorage.clear(); } catch (e) {} })()")   # (o que a 1ª abertura sorteou sem o FIXO não vale)
        await pg.reload()
        await pg.wait_for_function('() => typeof window.__RT === "function"', polling=100, timeout=20000)
        await pg.evaluate("(() => { const o = document.getElementById('onb'); if (o) o.hidden = true; })()")
        await pg.evaluate("(() => { const b = [...document.querySelectorAll('#v84auth button')].find(x => /TREINAR OFFLINE/.test(x.textContent || '')); if (b) b.click(); })()")
        await pg.evaluate("window.__quadro.passo(30)")
        if js:
            try:
                await rt(pg, js)
            except Exception as e:
                print('   (', nome, e, ')')
        await pg.evaluate("window.__quadro.passo(90)")
        if nome == 'partida_hud' or nome == 'partida_pausa':
            await rt(pg, "(() => { try { rqVsFecha(); } catch (_) {} RQ.estado = 'saida'; return 1; })()")
            await pg.evaluate("window.__quadro.passo(60)")
        if nome == 'partida_pausa':
            await rt(pg, "pausaAbre()")
            await pg.evaluate("window.__quadro.passo(30)")
        await pg.wait_for_timeout(250)
        await pg.screenshot(path=str(saida))
    finally:
        await b.close()


async def principal():
    ref = pathlib.Path(sys.argv[1]); out = pathlib.Path(sys.argv[2]); out.mkdir(parents=True, exist_ok=True)
    cfg92 = {'experimental': True} if '--experimental' in sys.argv else None
    v92 = PAGINA
    res = []
    async with async_playwright() as pw:
        for (w, h, dsf, tam) in [(1280, 720, 1, 'pc'), (844, 390, 2, 'cel')]:
            for nome, js in TELAS:
                a = out / ('%s_%s_v91.png' % (tam, nome)); b = out / ('%s_%s_v92.png' % (tam, nome))
                await foto(pw, ref, w, h, dsf, nome, js, a)
                await foto(pw, v92, w, h, dsf, nome, js, b, cfg92)
                ia, ib = Image.open(a).convert('RGB'), Image.open(b).convert('RGB')
                dif = ImageChops.difference(ia, ib).convert('L').point(lambda v: 255 if v > 24 else 0)
                n = sum(1 for v in dif.getdata() if v) if True else 0
                pct = 100 * n / (ia.width * ia.height)
                lado = Image.new('RGB', (ia.width * 2 + 8, ia.height), (255, 0, 255))
                lado.paste(ia, (0, 0)); lado.paste(ib, (ia.width + 8, 0))
                lado.save(out / ('%s_%s_lado.png' % (tam, nome)))
                if n:
                    dif.save(out / ('%s_%s_dif.png' % (tam, nome)))
                res.append({'tela': nome, 'tamanho': tam, 'pixels_diferentes_%': round(pct, 3)})
                print('  %-4s %-20s %7.3f%% dos pixels diferentes' % (tam, nome, pct))
    (out / 'resumo.json').write_text(json.dumps(res, ensure_ascii=False, indent=1))
    return 0

if __name__ == '__main__':
    sys.exit(asyncio.run(principal()))
