"""v75 · o fundo do lobby é a imagem enviada (a quadra da favela com o Rio de Janeiro atrás, no fim de tarde).

· A imagem (1844 × 853) vai embutida no jogo pelo build e abre; o fundo do lobby é ela — conferido pixel a pixel no meio da
  tela (onde não há véu) contra a própria imagem, em 5 tamanhos de tela (computador e celular deitado).
· O encaixe: a imagem cobre a tela inteira em qualquer tamanho (do celular ao monitor largo, deitado e em pé), o alto dela
  fica logo abaixo da fileira de cima (o Cristo aparece: nenhum botão, nem o letreiro RACHA, fica em cima dele) e o meio da
  quadra fica embaixo da tampinha (ela fica em pé na quadra, entre a linha do fundo e o círculo do meio).
· O que fica de fora da imagem (as beiradas, atrás dos botões) é a própria imagem espelhada dos lados e o céu dela em cima.
· Enquanto a imagem abre: um degradê nas cores dela. Se não abrir: o cenário desenhado de antes (o lobby.js com o véu
  da v71) — o lobby nunca fica vazio nem dá erro.
· O resto do lobby não muda (os botões, o letreiro, a tampinha): as outras suítes (v71, interface, celular) conferem.
v77: o lobby da v77 põe a outra imagem enviada por cima (tools/v77/lobby.js); este teste desliga essa camada
  (window.RUA_FUNDO77_DESLIGA) e confere a da v75, que continua de reserva — o fundo da v77 é conferido no tests/v77_test.py.
Capturas em tests/saida/v75_lobby_*.png. Se a imagem agrada no lugar é com quem joga; isto mede o encaixe e as cores.

Rodar: python3 tests/v75_test.py
"""
import json
from comum import abre, rt, roda, Placar, async_playwright, RAIZ

SAIDA = RAIZ / 'tests' / 'saida'; SAIDA.mkdir(exist_ok=True)

# o encaixe (em px do palco) e o que o fundo do lobby mostra: as amostras do canvas contra a imagem esperada
CONFERE = r"""(() => {
  const s = PALCO.s, dpr = PALCO.dpr, sa = PALCO.sa, w = PALCO.vw/s, h = PALCO.vh/s, ox = sa.l/s, oy = sa.t/s;
  const chao = PALCO.cy + 92 + oy, cx = PALCO.cx + ox, X = {ret:!!PALCO.ret};
  const E = l75Encaixe(w, h, chao, cx, X), B = L75_BORDA, ext = l75Estendida();
  const fe = LB.fundo.getContext('2d'), xe = ext.getContext('2d');
  const media = (g, x, y, n) => { const d = g.getImageData(Math.round(x) - (n >> 1), Math.round(y) - (n >> 1), n, n).data; let r = 0, gg = 0, b = 0;
    for (let i = 0; i < d.length; i += 4){ r += d[i]; gg += d[i + 1]; b += d[i + 2]; } const k = d.length/4; return [r/k, gg/k, b/k].map(Math.round); };
  const lado = Math.min(560, w*.32), amostras = [];
  for (const [fx, fy] of [[.38, .3], [.5, .36], [.62, .32], [.44, .52], [.58, .55], [.5, .62]]){
    const x = lado + (w - 2*lado)*fx, y = 160 + (h - 450)*fy;           // (no meio: sem o véu dos lados, de cima e de baixo)
    const ix = (x - (E.x - B.lado*E.s))/E.s, iy = (y - (E.y - B.topo*E.s))/E.s;
    amostras.push({tela:media(fe, x*s*dpr, y*s*dpr, 6), imagem:media(xe, ix, iy, Math.max(2, Math.round(6/(E.s*s*dpr))))});
  }
  const im = p => [E.x + p[0]*E.s, E.y + p[1]*E.s];                      // px da imagem → px do palco
  const r = LB.fundo.getBoundingClientRect(), tela = p => [r.left + p[0]*s, r.top + p[1]*s];
  const cristo = [[1250, 24], [1222, 36], [1280, 36], [1250, 60], [1250, 92]].map(p => tela(im(p)));
  const cobre = e => !!e && (!!e.closest('button, a, input, [role=button]') || getComputedStyle(e).backgroundColor !== 'rgba(0, 0, 0, 0)' || getComputedStyle(e).backgroundImage !== 'none');   // (um botão ou algo pintado; as caixas de arrumar, transparentes, não cobrem)
  const topo = cristo.map(([x, y]) => { const e = document.elementsFromPoint(x, y)[0]; return cobre(e) ? (e.id || e.className || e.tagName) : 'livre'; });
  const logo = document.querySelector('.rx-logo'), lr = logo && getComputedStyle(logo).display !== 'none' ? logo.getBoundingClientRect() : null;
  const sobreLogo = !!lr && cristo.some(([x, y]) => x > lr.left && x < lr.right && y > lr.top && y < lr.bottom);
  return {w:Math.round(w), h:Math.round(h), ret:X.ret, s:+E.s.toFixed(3), amostras, topo, sobreLogo,
    quadra:{meioX:Math.round(im(L75.foco)[0]), cx:Math.round(cx), fundoY:Math.round(im([0, 572])[1]), meioY:Math.round(im([0, 720])[1]), pe:Math.round(PALCO.cy + oy + EMB.R*1.12)},   // (pe: o chão da tampinha, onde fica o anel da luz)
    cobre:[E.x - B.lado*E.s <= .5, E.y - B.topo*E.s <= .5, E.x + (LOBBY75.w + B.lado)*E.s >= w - .5, E.y + E.H >= h - .5]};
})()"""

# o encaixe em tamanhos de palco que o teste não abre de verdade (monitor bem largo, em pé, quadrado): cobre sempre
ENCAIXES = r"""(() => { const B = L75_BORDA, out = [];
  for (const [w, h, ret] of [[1920, 888, false], [1578, 888, false], [1500, 1125, false], [2400, 888, false], [3000, 888, false], [888, 888, false], [900, 1402, true], [640, 1600, true]]){
    const E = l75Encaixe(w, h, h*.7, w/2, {ret});
    out.push({w, h, ok:E.x - B.lado*E.s <= .5 && E.y - B.topo*E.s <= .5 && E.x + (LOBBY75.w + B.lado)*E.s >= w - .5 && E.y + E.H >= h - .5});
  }
  return out; })()"""

HASH = r"""(() => { const d = LB.fundo.getContext('2d').getImageData(0, 0, LB.fundo.width, LB.fundo.height).data; let h = 0;
  for (let i = 0; i < d.length; i += 16) h = (Math.imul(h ^ (d[i] | d[i + 1] << 8 | d[i + 2] << 16), 2654435761) + 0x9e3779b9) | 0; return h; })()"""


def perto(a, b, t=22):
    return all(abs(x - y) <= t for x, y in zip(a, b))


async def principal():
    P = Placar('v75 · o fundo do lobby é a imagem enviada')
    html = (RAIZ / 'app' / 'public' / 'game' / 'racha.html').read_text(encoding='utf-8')
    fonte = (RAIZ / 'tools' / 'v75' / 'lobby.js').read_text(encoding='utf-8')
    P.confere('const LOBBY75 = {src:"data:image/webp;base64,' in html and '",w:1844,h:853}' in html and fonte.count('/*FUNDO75*/null') == 1,
              'a imagem do lobby (1844 × 853) vai embutida no jogo pelo build')
    async with async_playwright() as pw:
        for (w, h, d) in [(1920, 888, 1), (1280, 720, 1), (1024, 768, 1), (844, 390, 3), (667, 375, 2)]:
            b, pg, erros = await abre(pw, w, h, dsf=d)
            await pg.wait_for_function('() => window.__RT("L75.ok")', polling=100, timeout=10000)
            await rt(pg, "(() => { window.RUA_FUNDO77_DESLIGA = true; l75Repinta(); return true; })()")   # v77: o fundo da v77 por cima é desligado (a v75 fica de reserva)
            await pg.wait_for_timeout(500)
            r = await rt(pg, CONFERE)
            nome = '%dx%d' % (w, h)
            iguais = [perto(a['tela'], a['imagem']) for a in r['amostras']]
            P.confere(all(iguais), '%s: o fundo do lobby é a imagem (6 amostras no meio da tela, cor a cor)' % nome, r['amostras'])
            P.confere(all(r['cobre']), '%s: a imagem cobre a tela inteira (sem beirada vazia)' % nome, r['cobre'])
            P.confere(all(t == 'livre' for t in r['topo']) and not r['sobreLogo'],
                      '%s: o Cristo aparece — nenhum botão nem o letreiro RACHA em cima dele' % nome, [r['topo'], r['sobreLogo']])
            q = r['quadra']
            P.confere(abs(q['meioX'] - q['cx']) <= 60 and q['fundoY'] < q['pe'] < q['meioY'],
                      '%s: a tampinha fica em pé na quadra (o meio da quadra embaixo dela, entre a linha do fundo e o círculo)' % nome, q)
            await pg.screenshot(path=str(SAIDA / ('v75_lobby_%s.png' % nome)))
            if (w, h) == (1280, 720):
                e = await rt(pg, ENCAIXES)
                P.confere(all(x['ok'] for x in e), 'em qualquer palco (monitor bem largo, quadrado, em pé) a imagem cobre tudo', e)
                h0 = await rt(pg, HASH)
                r2 = await rt(pg, "(() => { L75.erro = true; window.RUA_ERRO = null; l75Repinta(); return {err:window.RUA_ERRO || window.RUA_LOBBY75_ERRO || null}; })()")
                h1 = await rt(pg, HASH)
                await pg.screenshot(path=str(SAIDA / 'v75_lobby_sem_imagem.png'))
                r3 = await rt(pg, "(() => { L75.erro = false; L75.ok = false; l75Repinta(); const d = LB.fundo.getContext('2d').getImageData(Math.round(LB.fundo.width/2), Math.round(LB.fundo.height*.45), 1, 1).data; return [d[0], d[1], d[2]]; })()")
                h2 = await rt(pg, HASH)
                await rt(pg, "(() => { L75.ok = true; l75Repinta(); return true; })()")
                h3 = await rt(pg, HASH)
                P.confere(h1 != h0 and not r2['err'], 'se a imagem não abrir, entra o cenário desenhado de antes (sem erro)', [h0, h1, r2])
                P.confere(h2 not in (h0, h1) and h3 == h0, 'enquanto abre, o degradê nas cores dela; quando abre, a imagem de novo (igual)', [h0, h2, h3, r3])
            rede = [x for x in erros if 'Failed to load resource' in x]
            P.confere(not [x for x in erros if x not in rede], '%s: nenhum erro de JavaScript' % nome, [x for x in erros if x not in rede][:3])
            await b.close()
    return P.fim()


roda(principal())
