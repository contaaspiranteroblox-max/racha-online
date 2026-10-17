"""RACHA v87.2 · moedas e gemas para testar o jogo (o presente de teste também na produção).

Confere no jogo de verdade (tests/build/racha_teste.html, com o config.js do build ao lado):
  1. o config.js do build liga o presente de teste (presente: true) e o jogo, na produção, dá 50.000 moedas e 5.000 gemas
     (o id teste-v87), sem o selo DEMONSTRAÇÃO; a janela do presente diz que é de teste (e não fala em demonstração);
  2. uma vez só: recarregar não dá de novo;
  3. a loja funciona com o presente (uma peça de moedas e uma de gemas, pelo tpCompra de sempre);
  4. presente: {id, moedas, gemas}: outro valor, e um id novo dá de novo no mesmo aparelho; os valores têm teto;
  5. presente: false (o lançamento): nada de presente, 500 moedas e 25 gemas;
  6. a demonstração continua igual (o presente v32 e o texto dela);
  7. nenhum erro de JavaScript.
A conta da plataforma (o login pelo jogo) também ganha o presente uma vez: o v87_site confere.
Uso: python3 tests/v872_presente_test.py"""
import re, sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from comum import abre, rt, roda, Placar, RAIZ, async_playwright

ESTADO = "({cfg:window.RACHA_CONFIG && window.RACHA_CONFIG.presente, modo:window.RACHA_MODO, m:CONTA.moedas, g:CONTA.gemas, ids:CONTA.presentes.slice(), pend:CONTA.presPend, selo:!!document.querySelector('.v70-demo')})"
# a janela do presente: a mesma fila que o jogo chama quando a apresentação fecha (o presente fica pendente até lá)
JANELA = """(() => {
  if (typeof ONB !== 'undefined' && (ONB.aberto || ONB.aquece)) onbFim();     // (a apresentação da primeira vez acaba, como o jogador faria)
  for (let i = 0; i < 6; i++){
    if (LB.pop.hidden) filaPops();
    if (LB.pop.hidden) break;
    const tag = LB.popCaixa.querySelector('.pop-tag');
    if (tag && tag.textContent === 'PRESENTE') return {txt:LB.popCaixa.querySelector('.pop-txt').textContent, premio:LB.popCaixa.querySelector('.pop-premio').textContent, pend:CONTA.presPend};
    fechaPop();
  }
  return null;
})()"""


async def recarrega(pg):
    await pg.reload()
    await pg.wait_for_function('() => typeof window.__RT === "function"', polling=100, timeout=20000)
    await pg.wait_for_timeout(500)


async def principal():
    P = Placar('v87.2 · moedas e gemas para testar o jogo')
    cfg = (RAIZ / 'app' / 'public' / 'game' / 'config.js').read_text(encoding='utf-8')
    P.confere(re.search(r"^\s*presente:\s*true\b", cfg, re.M) is not None, 'o config.js do build liga o presente de teste (presente: true)', '')
    erros_todos = []
    async with async_playwright() as pw:
        # ------------------------------------------------ 1) produção com o config.js do build
        print('\n1) produção com o config.js do build')
        b, pg, erros = await abre(pw, config_do_build=True); erros_todos += erros
        r = await rt(pg, ESTADO)
        P.confere(r['cfg'] is True and r['modo'] == 'producao' and r['m'] == 50500 and r['g'] == 5025 and r['ids'].count('teste-v87') == 1 and not r['selo'],
                  'produção: o jogo dá o presente de teste (500 + 50.000 moedas, 25 + 5.000 gemas), sem o selo DEMONSTRAÇÃO', r)
        j = await rt(pg, JANELA)
        P.confere(j is not None and j['txt'].startswith('Presente de teste') and 'DEMONSTRAÇÃO' not in j['txt'] and 'lançamento' not in j['txt']
                  and '50.000' in j['premio'] and '5.000' in j['premio'] and j['pend'] is None,
                  'a janela do presente diz que é de teste (+50.000 moedas, +5.000 gemas) e não fala em demonstração', j)
        await rt(pg, "(() => { if (!LB.pop.hidden) fechaPop(); filaPop.length = 0; return 1; })()")

        # ------------------------------------------------ 2) uma vez só
        print('\n2) uma vez só')
        await recarrega(pg)
        r2 = await rt(pg, ESTADO)
        P.confere(r2['m'] == 50500 and r2['g'] == 5025 and r2['ids'].count('teste-v87') == 1 and r2['pend'] is None,
                  'recarregar não dá o presente de novo (o mesmo saldo, nada pendente)', r2)

        # ------------------------------------------------ 3) a loja com o presente
        print('\n3) a loja com o presente')
        c = await rt(pg, """(() => {
          const m0 = CONTA.moedas, g0 = CONTA.gemas;
          const A = tpLe(tpMinha()); A.b = 'lt';                         // Listrada (raro: moedas)
          const ca = tpCusto(A), okA = tpCompra(A);
          const B = tpLe(tpMinha()); B.b = 'ou';                         // peça de gemas
          const cb = tpCusto(B), okB = tpCompra(B);
          return {okA, okB, ca, cb, pagouM:m0 - CONTA.moedas, pagouG:g0 - CONTA.gemas, tem:[TP.itens.has('b:lt'), TP.itens.has('b:ou')]};
        })()""")
        P.confere(c['okA'] and c['okB'] and c['ca']['m'] > 0 and c['cb']['g'] > 0 and c['pagouM'] == c['ca']['m'] + c['cb']['m'] and c['pagouG'] == c['ca']['g'] + c['cb']['g'] and all(c['tem']),
                  'a loja funciona com o presente: comprou uma peça de moedas (%s) e uma de gemas (%s), pelo preço de sempre' % (c['ca']['m'], c['cb']['g']), c)

        # ------------------------------------------------ 4) outro valor pelo config.js, no mesmo aparelho
        print('\n4) presente: {id, moedas, gemas}')
        antes = await rt(pg, "({m:CONTA.moedas, g:CONTA.gemas})")
        await pg.context.add_init_script("window.RACHA_CONFIG = {presente:{id:'loja2', moedas:100000, gemas:10000}};")
        await recarrega(pg)
        r3 = await rt(pg, ESTADO)
        P.confere(r3['m'] == antes['m'] + 100000 and r3['g'] == antes['g'] + 10000 and 'teste-loja2' in r3['ids'] and r3['ids'].count('teste-v87') == 1,
                  'presente: {id:"loja2", moedas:100000, gemas:10000} dá o valor novo no mesmo aparelho (um id novo dá de novo)', [antes, r3])
        await recarrega(pg)
        r4 = await rt(pg, ESTADO)
        P.confere(r4['m'] == r3['m'] and r4['g'] == r3['g'], 'e também uma vez só', r4)
        await b.close()

        b, pg, erros = await abre(pw, config={'presente': {'id': 'grande', 'moedas': 1e12, 'gemas': -5}}); erros_todos += erros
        r5 = await rt(pg, ESTADO)
        P.confere(r5['m'] == 500 + 10000000 and r5['g'] == 25 and 'teste-grande' in r5['ids'],
                  'os valores do config.js têm teto (até 10 milhões de moedas e 1 milhão de gemas; negativo vira 0)', r5)
        await b.close()

        # ------------------------------------------------ 5) o lançamento
        print('\n5) presente: false (o lançamento)')
        b, pg, erros = await abre(pw, config={'presente': False}); erros_todos += erros
        r6 = await rt(pg, ESTADO)
        P.confere(r6['m'] == 500 and r6['g'] == 25 and not [x for x in r6['ids'] if x.startswith('teste-') or x == 'v32'] and r6['pend'] is None,
                  'presente: false: sem presente (500 moedas e 25 gemas), como no lançamento', r6)
        await b.close()

        # ------------------------------------------------ 6) a demonstração continua igual
        print('\n6) a demonstração continua igual')
        b, pg, erros = await abre(pw, config={'modo': 'demo', 'presente': True}); erros_todos += erros
        r7 = await rt(pg, ESTADO)
        j7 = await rt(pg, JANELA)
        P.confere(r7['modo'] == 'demo' and r7['m'] == 50500 and r7['g'] == 5025 and 'v32' in r7['ids'] and not [x for x in r7['ids'] if x.startswith('teste-')] and r7['selo'],
                  'demonstração: o presente v32 de sempre (50.000 + 5.000) e o selo DEMONSTRAÇÃO', r7)
        P.confere(j7 is not None and 'DEMONSTRAÇÃO' in j7['txt'], 'e a janela da demonstração com o texto dela', j7)
        await b.close()

    reais = [e for e in erros_todos if 'Failed to load resource' not in e]
    P.confere(not reais, 'nenhum erro de JavaScript', reais[:3])
    return P.fim()


if __name__ == '__main__':
    roda(principal())
