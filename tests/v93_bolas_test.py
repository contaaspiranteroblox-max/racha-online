"""RACHA v93 · FASE 6 — AS BOLAS LISAS E A CLÁSSICA LISA (passa/falha, com as medidas impressas).
O jogo de verdade logado na plataforma de teste (o catálogo e a loja de verdade, app/api) num celular deitado:
  1. o catálogo tem as 10 lisas (Roxo, Rosa, Verde-claro, Verde-escuro, Preto, Branco, Azul, Cinza, Marrom, Amarelo) e a
     Clássica Lisa (grátis), todas do tipo bola;
  2. a LOJA › BOLAS mostra as 11 (com a miniatura desenhada); a Clássica Lisa já é sua (no INVENTÁRIO também);
  3. comprar a Bola Rosa (1.200 moedas, o preço do servidor) e EQUIPAR: equipada na conta;
  4. na partida a bola aparece rosa e brilhante (o reflexo claro em cima, a borda escura) — e o tamanho da bola na física é o
     mesmo (B.r);
  5. EQUIPAR a Clássica Lisa: branca e chapada com o contorno preto (2D: sem o degradê);
  6. cada bola desenhada (no jogo e na miniatura) tem a cor dela no meio e o contorno escuro em volta (as escuras com o aro
     claro por dentro, para não sumirem no chão).
  python3 tests/v93_bolas_test.py"""
import asyncio, json, os, sys, tempfile, time
from comum import Placar, rt, async_playwright
from v88_cliente_test import Plataforma, conta, abre_logado, espera
from v93_itens_test import saldo, pop_bt, abre_item

LISAS = ['bola_lisa_roxa', 'bola_lisa_rosa', 'bola_lisa_verde_clara', 'bola_lisa_verde_escura', 'bola_lisa_preta', 'bola_lisa_branca',
         'bola_lisa_azul', 'bola_lisa_cinza', 'bola_lisa_marrom', 'bola_lisa_amarela']
AMOSTRA = """((cod, jogo) => {                                         // desenha a bola num canvas e lê o meio, a borda e o reflexo
  const it = v88Item(cod), c = document.createElement('canvas'); c.width = c.height = 120; const g = c.getContext('2d');
  if (jogo) v88DesenhaBolaJogo(g, 60, 60, 40, it); else v88BolaParada(g, 60, 60, 40, it);
  const px = (x, y) => Array.from(g.getImageData(x, y, 1, 1).data.slice(0, 3));
  return {meio:px(66, 66), borda:px(99, 60), reflexo:px(46, 42), base:it.visual.base};
})"""


def hexrgb(h):
    h = h.lstrip('#'); return [int(h[i:i+2], 16) for i in (0, 2, 4)]


def perto(a, b, tol):
    return all(abs(x - y) <= tol for x, y in zip(a, b))


async def principal():
    P = Placar('v93 · Fase 6 · as bolas lisas e a clássica lisa')
    banco = os.path.join(tempfile.mkdtemp(prefix='racha93b_'), 'p.sqlite')
    PL = Plataforma(banco).sobe()
    try:
        A = conta(PL, 'bolas93'); PL.q('loja.estado', None, A['token']); saldo(PL, A['pub'], 5000, 0)
        async with async_playwright() as pw:
            b, pg, erros = await abre_logado(pw, PL, 'bolas93', 844, 390)
            await espera(pg, "V88.carteiraOk", 8000)
            cat = await rt(pg, "CAT88.itens.filter(i => i.tipo === 'bola' && i.visual && (i.visual.padrao === 'lisa' || i.visual.padrao === 'plana')).map(i => [i.id, i.nome, i.moedas, !!i.gratis, i.visual.padrao])")
            ids = [x[0] for x in cat]
            P.confere(all(x in ids for x in LISAS) and 'bola_classica_lisa' in ids and len(cat) == 11 and all(x[2] == 1200 for x in cat if x[4] == 'lisa') and [x for x in cat if x[0] == 'bola_classica_lisa'][0][3],
                      '1) o catálogo: as 10 lisas (1.200 moedas) e a Clássica Lisa (grátis): %s' % ', '.join(x[1] for x in cat), cat)
            await rt(pg, "(() => { abreTela('loja'); V88S.cat = 'bolas'; v88LojaPinta(); return 1; })()"); await asyncio.sleep(.5)
            vis = await rt(pg, "[...document.querySelectorAll('#tela-loja .v88-item')].map(x => [x.getAttribute('aria-label'), !!x.querySelector('canvas')])")
            nomes = [x[0] for x in vis]
            await pg.screenshot(path='tests/saida/v93_bolas_loja.png')
            P.confere(all(n in nomes for n in [x[1] for x in cat]) and all(x[1] for x in vis), '2) a LOJA › BOLAS mostra as 11 com a miniatura (%d bolas na loja)' % len(vis), vis)
            await rt(pg, "(() => { V88S.cat = 'inventario'; v88LojaPinta(); return 1; })()"); await asyncio.sleep(.3)
            inv = await rt(pg, "[...document.querySelectorAll('#tela-loja .v88-item')].map(x => x.getAttribute('aria-label'))")
            P.confere('Clássica Lisa' in inv, '   a Clássica Lisa já é sua (no INVENTÁRIO)', inv[:12])
            ok = await abre_item(pg, 'bolas', 'bola_lisa_rosa')
            preco = await rt(pg, "document.querySelector('#pop-caixa') ? document.querySelector('#pop-caixa').textContent : ''")
            comprou = ok and await pop_bt(pg, 'COMPRAR')
            await asyncio.sleep(.4)
            confirma = await rt(pg, "document.querySelector('#pop-caixa') ? document.querySelector('#pop-caixa').textContent : ''")
            comprou = comprou and 'COMPRAR BOLA ROSA?' in confirma and await pop_bt(pg, 'COMPRAR')   # (a confirmação da compra, com o saldo depois)
            await asyncio.sleep(1.2)
            if await rt(pg, "LB.pop.hidden"): await abre_item(pg, 'bolas', 'bola_lisa_rosa')
            eq = await pop_bt(pg, 'EQUIPAR AGORA', 2500) or await pop_bt(pg, 'EQUIPAR')   # (o COMPRADO! oferece o EQUIPAR AGORA)
            await asyncio.sleep(1.2)
            srv = PL.q('loja.estado', None, A['token'])
            P.confere(comprou and eq and srv['equipados'].get('bola') == 'bola_lisa_rosa' and srv['carteira']['moedas'] == 3800 and '1.200' in preco,
                      '3) comprar a Bola Rosa (1.200, o preço do servidor) e EQUIPAR: equipada na conta (sobram %s moedas)' % srv['carteira']['moedas'], [comprou, eq, srv['equipados'], srv['carteira']])
            await rt(pg, "(() => { try { fechaPop(); } catch (_) {} fechaTela(); X49.mode = 'casual'; x49Save(); x49Start(1, 0); return 1; })()")
            await espera(pg, "RQ.on && !V93P.contagem", 8000)
            await asyncio.sleep(.5)
            br0 = await rt(pg, "B.r")
            bola = await rt(pg, """(() => { const c = cv, g = c.getContext('2d'), z = cam.z, k = c.width/W;
              const sx = (W/2 + (VIS.bx - cam.x)*z)*k, sy = (H/2 + (VIS.by - cam.y)*z)*k, r = B.r*z*k;
              const px = (x, y) => Array.from(g.getImageData(Math.round(x), Math.round(y), 1, 1).data.slice(0, 3));
              return {meio:px(sx + r*.15, sy + r*.15), reflexo:px(sx - r*.34, sy - r*.46), borda:px(sx + r*.97, sy), r, eq:v88Equipado('bola')}; })()""")
            await pg.screenshot(path='tests/saida/v93_bolas_rosa.png')
            m = bola['meio']
            P.confere(bola['eq'] == 'bola_lisa_rosa' and m[0] > 180 and m[1] < 150 and m[2] > 110 and sum(bola['reflexo']) > sum(m) and sum(bola['borda']) < sum(m) and br0 == await rt(pg, "B.r"),
                      '4) na partida a bola é rosa e brilhante (o meio %s, o reflexo mais claro, a borda escura) — e o B.r da física é o mesmo (%s)' % (m, br0), bola)
            await rt(pg, "(() => { rqSai(); abrirLobby(); return 1; })()")
            await abre_item(pg, 'bolas', 'bola_classica_lisa')
            eq2 = await pop_bt(pg, 'EQUIPAR')
            await asyncio.sleep(1.2)
            srv = PL.q('loja.estado', None, A['token'])
            cl = await rt(pg, AMOSTRA + "('bola_classica_lisa', true)")
            cl2 = await rt(pg, "((c) => { const it = v88Item(c), cn = document.createElement('canvas'); cn.width = cn.height = 120; const g = cn.getContext('2d'); v88DesenhaBolaJogo(g, 60, 60, 40, it); const px = (x, y) => Array.from(g.getImageData(x, y, 1, 1).data.slice(0, 3)); return [px(60, 60), px(40, 40), px(80, 75), px(98, 60)]; })('bola_classica_lisa')")
            P.confere(eq2 and srv['equipados'].get('bola') == 'bola_classica_lisa' and all(p == [255, 255, 255] for p in cl2[:3]) and sum(cl2[3]) < 60,
                      '5) a Clássica Lisa equipada: branca chapada (o meio, o alto e o baixo iguais: %s) e o contorno preto %s' % (cl2[0], cl2[3]), [eq2, srv['equipados'], cl2])
            ruins = []
            for cod in LISAS:
                for jogo in (True, False):
                    a = await rt(pg, AMOSTRA + "(%s, %s)" % (json.dumps(cod), 'true' if jogo else 'false'))
                    base = hexrgb(a['base'])
                    if not perto(a['meio'], base, 70) or sum(a['borda']) > sum(a['meio']) + 40 or sum(a['reflexo']) <= sum(a['meio']):
                        ruins.append([cod, jogo, a])
            P.confere(not ruins, '6) as 10 lisas desenhadas (no jogo e na miniatura): a cor de cada uma no meio, o reflexo mais claro e a borda escura', ruins[:3])
            P.confere(not [e for e in erros if 'WebSocket' not in e], 'nenhum erro de JavaScript', erros[:3])
            await b.close()
    finally:
        PL.desce()
    return P.fim()


if __name__ == '__main__':
    sys.exit(asyncio.run(principal()))
