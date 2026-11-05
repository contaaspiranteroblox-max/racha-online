"""RACHA v106 · AS BOLAS E AS MASCOTES NOVAS no jogo de verdade (no navegador) e na plataforma de teste.

· As peças: as 6 caras das mascotes (ar, op, mi, lg, tu, jc) nos lugares 87 a 92 dos ícones e a borda Medalhão no lugar 28
  das bordas — no FIM das listas: o código da tampinha inicial, das pré-projetadas, das animadas da v76/v96, da dos
  fundadores, das exclusivas do catálogo e da BOTÃO são os mesmos do master (os de sempre, guardados aqui embaixo); a cara
  Fundador continua no 86 e a Aura na 26 (o server/fundador96.js).
· As 6 mascotes desenhadas: sem erro em 40, 116 e 300 px e em vários instantes (a piscada); cada uma diferente da outra;
  nada fora do círculo; nítidas em 40 px (o contraste e a diferença entre elas medidos na tampinha de 40 px).
· As 6 bolas: cada uma diferente; nada fora do círculo (parada, e na partida só a sombra de sempre fora); girando sem erro
  (60 quadros com o giro de verdade, e o desenho muda com o giro).
· O catálogo: os 12 itens no app/contracts/catalogo88.json iguais aos do jogo, à venda, com a raridade e o preço coerentes.
· Sem a conta: as peças das mascotes não aparecem no editor, não se compram avulsas (a janela manda para a LOJA), não
  equipam pelo código colado e a sorteada não cai nelas; a LOJA › TAMPINHAS mostra as 6 MASCOTES à venda mesmo com as
  prontas escondidas (a v101); os bots nunca pegam (400 sorteios).
· Na plataforma de teste (o código de verdade de app/api, com o catálogo novo): comprar e EQUIPAR a ONÇA-PRETA e a BOLA DE
  FOGO pelos botões da LOJA (o servidor cobra o preço do catálogo e guarda na conta), com as prontas escondidas; a mascote
  aparece no editor só para quem tem (a cara e a borda Medalhão); entrar de novo (recarregar) mantém a mascote equipada e
  salva; na partida, a tampinha é a mascote e a bola é a de fogo.
Capturas: tests/saida/v106_conteudo_bolas.png, v106_conteudo_mascotes.png, v106_conteudo_loja.png (e _loja_compra), v106_conteudo_editor.png e
v106_conteudo_partida.png.
Rodar: python3 tests/v106_conteudo_test.py"""
import asyncio, json, os, re, subprocess, sys, tempfile, time
from comum import abre, rt, Placar, async_playwright, RAIZ
from v88_cliente_test import Plataforma, conta, abre_logado, espera
from v93_itens_test import saldo, pop_bt, abre_item
import comum; comum.SKINS_PRONTAS = False   # (o v93_itens_test liga as prontas ao ser importado: aqui é o jogo do lançamento, com elas escondidas)

SAIDA = RAIZ / 'tests' / 'saida'; SAIDA.mkdir(exist_ok=True)
CARAS = ['ar', 'op', 'mi', 'lg', 'tu', 'jc']
MASC = ['tp_m_arara', 'tp_m_oncapreta', 'tp_m_mico', 'tp_m_guara', 'tp_m_tucano', 'tp_m_jacare']
BOLAS = ['bola_praia', 'bola_arraia', 'bola_fogo', 'bola_macarico', 'bola_galaxia', 'bola_sertao']
# os códigos das tampinhas de sempre (tirados do build do master, antes da v106: python3 -c … no tests/build/racha_teste.html)
ANTES = {
    'inicial': 'T.AAAn1iQ-sSH5mW2TJQA', 'padraoCod': 'T.ACgDHm0-vPZ6fxf2oA', 'fund': 'T.NAVj_qX_-lAKFEA',
    'botao': 'T.NgAn378-sSH5mW2TJQA', 'botaoFina': 'T.NgAn378-sSH5mW2TJQAQ',
    'pre': {'classica': 'T.AAAn1iQ-sSH5mW2TJQA', 'brasa': 'T.AzkB6VElQwP-1G_9J__pP_zw0', 'mar': 'T.CrsSbo_h19xfi_9Pf____rJQyAA', 'ouro': 'T.HIjHhSHf9i__5v8UBc',
            'neon': 'T.HxhAVq8CghX-V1itXg', 'onca': 'T.A3LVadF9KJ0qNC3GowqNCrJkiAA', 'dragao': 'T.IVRj-1G_9J8MlKl9D3_pP8UBc', 'fenix': 'T.HTx46GDf2o3_pP_9J_-eGg',
            'chuteira': 'T.HJI4WNHHT6LhSHf9J8WNHA'},
    'sk76': {'Cria': 'T.JgSDzNHf9J8KFEA', 'Cristo': 'T.KASQu62R-H8KFEA', 'Brasil': 'T.KgSgfNS_9J8KFEA', 'Pitbull': 'T.LASy0JG_zp0KFEA', 'Deboche': 'T.LATB6X8aWv8KFEA',
             'Fé': 'T.JgTTZSHf-EUKFEA', 'Dragão': 'T.JgTjIPFf4o4KFEA', 'Galáxia': 'T.KgTxqV1nXv8KFEA', 'Pipa no céu': 'T.LgUD_pP_3pUKFEA', 'Baile': 'T.LAUQqSM_0WoKFEA',
             'Maré': 'T.KgUgc3uX_H8KFEA', 'Tempestade': 'T.KAUw6laz8P8KFEA', 'Ipê amarelo': 'T.MAVDJFF_-D0KFEA', 'Lava': 'T.MgVQ6GBf3pUKFEA'},
    'conta': {'tp_fundador': 'T.NAVj_qX_-lAKFEA', 'tp_t1_rua': 'T.HUDIQIEf9J__pPiBAhZMlAA', 'tp_t1_cristo': 'T.Huyb_pP-poY6OSrJkuAA', 'tp_t1_lenda': 'T.I2SoaIQUVnj_pPrJkuAA',
              'tp_t1_onca': 'T.HXM7pRPHSQj3qjnSQj3qjrJoqAA', 'tp_t1_asfalto': 'T.Jzx7-1Af9J_-1Af9J96GAf9J96GALJkuAA', 'tp_rk_gols_1': 'T.HIg7_FG_9LX1iQiBAhZMmAA',
              'tp_rk_craque_3': 'T.GWArZFTry4gqMQZKP_1iQ___9ZMmAA'},
}

CODIGOS = r"""(() => {
  const o = {inicial: tpCodigo(TP_PADRAO_D()), padraoCod: TP_PADRAO_COD, fund: RachaSkins96.codigoFundador(), pre: {}, sk76: {}, conta: {},
    botao: tpCodigo(Object.assign(TP_PADRAO_D(), {b: 'bt', bc: ['#f7f7f3', '#1d1d1d']})), botaoFina: tpCodigo(Object.assign(TP_PADRAO_D(), {b: 'bt', bc: ['#f7f7f3', '#1d1d1d'], bt: 1}))};
  for (const x of TP_PRE) o.pre[x.id] = tpCodigo(x.d);
  for (const x of SK76_PRE) o.sk76[x.nome] = x.cod;
  for (const it of CAT88.itens) if (it.tipo === 'tampinha' && it.visual && it.visual.d) o.conta[it.id] = tpCodigo(tpNorm(tpD(it.visual.d)));
  const M = RachaConteudo106.mascotes();
  return {o, lugares: {nI: TP_ICONES.length, nB: TP_BORDAS.length, caras: CARAS.map(id => TP_ICONES.findIndex(x => x.id === id)), mh: TP_BORDAS.findIndex(x => x.id === 'mh'),
      zw: TP_ICONES.findIndex(x => x.id === 'zw'), vw: TP_BORDAS.findIndex(x => x.id === 'vw'), bt: TP_BORDAS.findIndex(x => x.id === 'bt'),
      cara: CARAS.map(id => !!(TP_MAPA.i.get(id) || {}).cara && SK76_CARA.has(id))},
    ida: M.map(m => { const D = tpLe(m.codigo); return !!D && tpCodigo(D) === m.codigo && D.i === m.cara && D.b === 'mh'; }), codigos: M.map(m => m.codigo)};
})()""".replace('CARAS', json.dumps(CARAS))

# as mascotes desenhadas: os erros, a diferença entre elas, nada fora do círculo e a nitidez em 40 px
MASCOTES = r"""(() => {
  const hash = c => { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let h = 0; for (let i = 0; i < d.length; i += 4) h = (Math.imul(h ^ (d[i] | d[i + 1] << 8 | d[i + 2] << 16 | d[i + 3] << 24), 2654435761) + 0x9e3779b9) | 0; return h; };
  const fora = (c, R) => { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data, m = c.width/2; let n = 0; for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) if (Math.hypot(x + .5 - m, y + .5 - m) > R + 1.5 && d[(y*c.width + x)*4 + 3] > 8) n++; return n; };
  const quadro = (D, t, lado) => { const c = document.createElement('canvas'); c.width = c.height = lado; sk76Desenha(c.getContext('2d'), lado/2, lado/2, lado*.46, D, t, 1); return c; };
  const lum = (d, i) => .2126*d[i] + .7152*d[i + 1] + .0722*d[i + 2];
  const M = RachaConteudo106.mascotes(), erros = [], out = [], mini40 = [];
  for (const m of M){
    const D = tpLe(m.codigo); let o = {item: m.item};
    try {
      for (const lado of [40, 116, 300]) for (const t of [m.t0, 3.3, 7.9, 12.6, 30.2]) quadro(D, t, lado);
      o.fora = 0; for (const lado of [40, 116, 300]) o.fora += fora(tpMiniatura(D, lado), lado*.46);
      o.mini = hash(tpMiniatura(D, 116)); o.mini2 = hash(tpMiniatura(D, 116));
      // a piscada: algum instante com o olho fechado (diferente do aberto) e, depois, aberto de novo
      const aberto = hash(quadro(D, m.t0, 116)); let fechou = 0, voltou = 0;
      for (let t = 2.6; t < 14; t += .05){ const h = hash(quadro(D, t, 116)); if (h !== aberto) fechou++; else if (fechou) voltou++; }
      o.pisca = fechou > 0 && fechou < 40 && voltou > 0;
      // em 40 px (a tampinha da partida em tela pequena): o contraste do meio e o desenho para comparar
      const c = tpMiniatura(D, 40), d = c.getContext('2d').getImageData(0, 0, 40, 40).data, L = [], v = [];
      for (let y = 0; y < 40; y++) for (let x = 0; x < 40; x++){ const i = (y*40 + x)*4; v.push(d[i], d[i + 1], d[i + 2]); if (Math.hypot(x + .5 - 20, y + .5 - 20) < 12.5) L.push(lum(d, i)); }
      const med = L.reduce((a, b) => a + b, 0)/L.length, dp = Math.sqrt(L.reduce((a, b) => a + (b - med)*(b - med), 0)/L.length);
      const ord = L.slice().sort((a, b) => a - b); o.dp = +dp.toFixed(1); o.faixa = +(ord[Math.floor(ord.length*.95)] - ord[Math.floor(ord.length*.05)]).toFixed(1);
      mini40.push(v);
    } catch (e) { erros.push(m.item + ': ' + (e && e.message)); }
    out.push(o);
  }
  // a diferença média entre cada par em 40 px (0..255)
  let difMin = 999; for (let a = 0; a < mini40.length; a++) for (let b = a + 1; b < mini40.length; b++){ let s = 0; for (let i = 0; i < mini40[a].length; i++) s += Math.abs(mini40[a][i] - mini40[b][i]); difMin = Math.min(difMin, s/mini40[a].length); }
  return {erros, out, difMin: +difMin.toFixed(1), erroKit: window.RUA_SKINS76_ERRO || null};
})()"""

# as bolas: a diferença, nada fora do círculo (parada; na partida, só a sombra de sempre) e o giro de verdade
BOLAS_JS = r"""(ids => {
  const hash = c => { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let h = 0; for (let i = 0; i < d.length; i += 4) h = (Math.imul(h ^ (d[i] | d[i + 1] << 8 | d[i + 2] << 16 | d[i + 3] << 24), 2654435761) + 0x9e3779b9) | 0; return h; };
  const erros = [], out = [], R0 = Rm.slice();
  for (const id of ids){
    const it = v88Item(id), o = {id};
    try {
      const c = document.createElement('canvas'); c.width = c.height = 120; const g = c.getContext('2d'); v88BolaParada(g, 60, 60, 44, it);
      const d = g.getImageData(0, 0, 120, 120).data; let fora = 0, dentro = 0;
      for (let y = 0; y < 120; y++) for (let x = 0; x < 120; x++){ const k = (y*120 + x)*4, r = Math.hypot(x + .5 - 60, y + .5 - 60); if (r > 44 + 1.5 && d[k + 3] > 8) fora++; if (r < 40 && d[k + 3] > 250) dentro++; }
      o.fora = fora; o.cheia = dentro > 4500; o.hash = hash(c);
      // na partida (com a sombra de sempre): fora do círculo, só o preto translúcido da sombra — nenhuma cor
      const c2 = document.createElement('canvas'); c2.width = c2.height = 120; const g2 = c2.getContext('2d'); Rm.splice(0, 9, ...R0); v88DesenhaBolaJogo(g2, 56, 56, 40, it);
      const d2 = g2.getImageData(0, 0, 120, 120).data; let cor = 0;
      for (let y = 0; y < 120; y++) for (let x = 0; x < 120; x++){ const k = (y*120 + x)*4; if (Math.hypot(x + .5 - 56, y + .5 - 56) > 40 + 1.5 && d2[k + 3] > 8 && (d2[k] > 6 || d2[k + 1] > 6 || d2[k + 2] > 6)) cor++; }
      o.cor = cor;
      // girando: 60 quadros com o giro da bola de verdade (spinBallVel), desenhando em 24 px e em 60 px
      const hs = new Set(), c3 = document.createElement('canvas'); c3.width = c3.height = 64; const g3 = c3.getContext('2d');
      for (let f = 0; f < 60; f++){ spinBallVel(1/60, 160 + f*3, -90, 6, f % 2 ? .4 : 0); g3.clearRect(0, 0, 64, 64); v88DesenhaBolaJogo(g3, 32, 32, f % 2 ? 12 : 26, it); if (f % 10 === 0) hs.add(hash(c3)); }
      o.gira = hs.size >= 5;
    } catch (e) { erros.push(id + ': ' + (e && e.stack || e)); }
    out.push(o);
  }
  Rm.splice(0, 9, ...R0);
  return {erros, out};
})"""


def dif(a, b, caminho=''):
    """as diferenças entre dois dicionários de códigos (o de antes e o de agora)"""
    out = []
    for k, v in a.items():
        if isinstance(v, dict): out += dif(v, b.get(k, {}), caminho + k + '.')
        elif b.get(k) != v: out.append((caminho + k, v, b.get(k)))
    return out


async def folha_bolas(pg):
    await rt(pg, """(ids => { const c = document.createElement('canvas'); c.width = 1240; c.height = 420; c.id = 'ct106-folha';
      c.style.cssText = 'position:fixed;left:20px;top:20px;z-index:2147483647;border-radius:18px;box-shadow:0 8px 40px rgba(0,0,0,.6)';
      const g = c.getContext('2d'); const gr = g.createLinearGradient(0, 0, 0, 420); gr.addColorStop(0, '#3f7d3b'); gr.addColorStop(1, '#2c5e2a'); g.fillStyle = gr; g.fillRect(0, 0, 1240, 420);
      g.fillStyle = 'rgba(255,255,255,.12)'; for (let x = 0; x < 1240; x += 80) g.fillRect(x, 0, 40, 420);
      g.font = '700 18px "Barlow Condensed", sans-serif'; g.textAlign = 'center';
      const R0 = Rm.slice();
      ids.forEach((id, i) => { const it = v88Item(id), x = 105 + i*205;
        v88BolaParada(g, x, 110, 82, it);
        g.fillStyle = '#ffffff'; g.fillText(it.nome.toUpperCase() + ' · ' + v88Raridade(it.raridade).nome, x, 222);
        for (let k = 0; k < 4; k++){ spinBallVel(.22, 150, 60 + k*30, 6, .5); v88DesenhaBolaJogo(g, x - 66 + k*44, 280, 13, it); }
        for (let k = 0; k < 4; k++){ spinBallVel(.3, -120, 80, 6, 0); v88DesenhaBolaJogo(g, x - 66 + k*44, 345, 9, it); }
        g.fillStyle = 'rgba(255,255,255,.8)'; g.font = '600 13px "Barlow Condensed", sans-serif'; g.fillText('na partida (26 e 18 px), girando', x, 392); g.font = '700 18px "Barlow Condensed", sans-serif';
      });
      Rm.splice(0, 9, ...R0); document.body.appendChild(c); return true; })(%s)""" % json.dumps(BOLAS))
    await pg.wait_for_timeout(200)
    await pg.screenshot(path=str(SAIDA / 'v106_conteudo_bolas.png'), clip={'x': 20, 'y': 20, 'width': 1240, 'height': 420})
    await rt(pg, "(() => { document.getElementById('ct106-folha').remove(); return true; })()")


async def folha_mascotes(pg):
    await rt(pg, """(() => { const c = document.createElement('canvas'); c.width = 1240; c.height = 420; c.id = 'ct106-folha';
      c.style.cssText = 'position:fixed;left:20px;top:20px;z-index:2147483647;border-radius:18px;box-shadow:0 8px 40px rgba(0,0,0,.6)';
      const g = c.getContext('2d'); const gr = g.createLinearGradient(0, 0, 0, 420); gr.addColorStop(0, '#23194a'); gr.addColorStop(1, '#100b26'); g.fillStyle = gr; g.fillRect(0, 0, 1240, 420);
      g.font = '700 18px "Barlow Condensed", sans-serif'; g.textAlign = 'center';
      RachaConteudo106.mascotes().forEach((m, i) => { const D = tpLe(m.codigo), x = 105 + i*205, it = v88Item(m.item);
        g.drawImage(tpMiniatura(D, 190), x - 95, 12, 190, 190);
        g.fillStyle = '#ffffff'; g.fillText(m.nome.toUpperCase(), x, 226); g.fillStyle = v88Raridade(it.raridade).cor; g.fillText(v88Raridade(it.raridade).nome + ' · ' + it.gemas + ' GEMAS', x, 248);
        g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(x - 80, 268, 160, 120);
        g.drawImage(tpMiniatura(D, 40), x - 64, 300, 40, 40); g.drawImage(tpMiniatura(D, 64), x - 14, 288, 64, 64);
        g.fillStyle = 'rgba(255,255,255,.8)'; g.font = '600 13px "Barlow Condensed", sans-serif'; g.fillText('40 px · 64 px', x, 380); g.font = '700 18px "Barlow Condensed", sans-serif';
      });
      document.body.appendChild(c); return true; })()""")
    await pg.wait_for_timeout(200)
    await pg.screenshot(path=str(SAIDA / 'v106_conteudo_mascotes.png'), clip={'x': 20, 'y': 20, 'width': 1240, 'height': 420})
    await rt(pg, "(() => { document.getElementById('ct106-folha').remove(); return true; })()")


async def sem_conta(P):
    """o jogo aberto sem a plataforma (SÓ TREINAR OFFLINE): as peças, os desenhos, as bolas, o catálogo e o editor"""
    async with async_playwright() as pw:
        b, pg, erros = await abre(pw, 1280, 720)
        await pg.wait_for_function('() => window.__RT("typeof RachaConteudo106 === \'object\' && SK76.ok")', polling=100, timeout=10000)
        s = await rt(pg, CODIGOS)
        L = s['lugares']
        print('     ', json.dumps(L, ensure_ascii=False))
        P.confere(L['caras'] == list(range(87, 93)) and L['mh'] == 28 and L['nI'] == 93 and L['nB'] == 29 and all(L['cara']),
                  'as 6 caras das mascotes no fim dos ícones (87 a 92, com cara: true) e a borda Medalhão no fim das bordas (28)', L)
        P.confere(L['zw'] == 86 and L['vw'] == 26 and L['bt'] == 27, 'a cara Fundador continua no 86, a Aura na 26 e a BOTÃO na 27 (o servidor das salas olha esses lugares)', L)
        d = dif(ANTES, s['o'])
        P.confere(not d, 'os códigos das tampinhas de sempre são os mesmos do master: a inicial, %d pré-projetadas, as %d animadas, a dos fundadores, %d do catálogo e a BOTÃO (fina também)'
                  % (len(ANTES['pre']), len(ANTES['sk76']), len(ANTES['conta'])), d[:4])
        P.confere(all(s['ida']) and len(set(s['codigos'])) == 6, 'o código de cada mascote vai e volta igual (a cara dela e a borda Medalhão)', s['codigos'])
        srv = (RAIZ / 'server' / 'fundador96.js').read_text(encoding='utf-8')
        m = re.search(r"FUNDADOR = Object\.freeze\(\{ item: 'tp_fundador', borda: (\d+), icone: (\d+) \}\)", srv)
        P.confere(bool(m) and int(m.group(1)) == L['vw'] and int(m.group(2)) == L['zw'], 'o servidor das salas (server/fundador96.js) confere os mesmos lugares de antes', m and m.groups())
        # (as mascotes só com quem comprou: o servidor das salas e a plataforma olham os mesmos lugares do jogo)
        itens = [x['item'] for x in await rt(pg, "RachaConteudo106.mascotes().map(m => ({item: m.item}))")]
        lado = {}
        for arq, rx_borda in (('server/mascotes106.js', r"BORDA_MEDALHAO = (\d+);"), ('app/api/racha/mascotes.ts', r"BORDA_MEDALHAO = (\d+);")):
            tx = (RAIZ / arq).read_text(encoding='utf-8')
            pares = [(a, int(n)) for a, n in re.findall(r"item: [\"'](tp_m_[a-z0-9_]+)[\"'], icone: (\d+)", tx)]
            mb = re.search(rx_borda, tx)
            lado[arq] = (pares, int(mb.group(1)) if mb else None)
        P.confere(all(p == list(zip(itens, L['caras'])) and bd == L['mh'] for p, bd in lado.values()),
                  'o servidor das salas (server/mascotes106.js) e a plataforma (app/api/racha/mascotes.ts) conferem as mascotes nos mesmos lugares do jogo (as caras e a Medalhão)', lado)

        # ---------------------------------------------------------------- as mascotes desenhadas
        r = await rt(pg, MASCOTES)
        print('      40 px:', json.dumps([(o['item'][5:], o.get('dp'), o.get('faixa')) for o in r['out']]), '· menor diferença entre duas:', r['difMin'])
        P.confere(not r['erros'] and not r['erroKit'], 'as 6 mascotes desenham sem erro (40, 116 e 300 px; cinco instantes cada)', r['erros'][:3] or r['erroKit'])
        o = r['out']
        P.confere(len({x['mini'] for x in o}) == 6 and all(x['mini'] == x['mini2'] for x in o), 'cada mascote é diferente da outra (6 desenhos) e a miniatura sai sempre igual', [x['mini'] for x in o])
        P.confere(all(x['fora'] == 0 for x in o), 'nada fora do círculo da tampinha (em 40, 116 e 300 px)', [(x['item'], x['fora']) for x in o if x['fora']])
        P.confere(all(x['dp'] >= 28 and x['faixa'] >= 90 for x in o) and r['difMin'] >= 18,
                  'nítidas em 40 px: o meio de cada uma tem contraste (desvio ≥ 28 e faixa ≥ 90 de 255) e duas quaisquer diferem (≥ 18 de 255 em média)', [(x['item'], x['dp'], x['faixa']) for x in o] + [r['difMin']])
        P.confere(all(x['pisca'] for x in o), 'a animação leve: cada mascote pisca de vez em quando (o olho fecha um instante e abre de novo)', [(x['item'], x['pisca']) for x in o])
        await folha_mascotes(pg)

        # ---------------------------------------------------------------- as bolas
        r = await rt(pg, BOLAS_JS + '(%s)' % json.dumps(BOLAS))
        print('      bolas:', json.dumps(r['out']))
        P.confere(not r['erros'], 'as 6 bolas desenham sem erro (paradas, na partida e girando)', r['erros'][:2])
        o = r['out']
        P.confere(len({x['hash'] for x in o}) == 6 and all(x['cheia'] for x in o), 'cada bola é diferente da outra (6 desenhos, a bola cheia até a beirada)', o)
        P.confere(all(x['fora'] == 0 and x['cor'] == 0 for x in o), 'nada fora do círculo da bola (parada; na partida, fora dela só a sombra de sempre)', [(x['id'], x['fora'], x['cor']) for x in o])
        P.confere(all(x['gira'] for x in o), 'girando como a de sempre: 60 quadros com o giro de verdade (spinBallVel) e o desenho muda com o giro', [(x['id'], x['gira']) for x in o])
        pad = await rt(pg, "CAT88.itens.filter(i => i.tipo === 'bola' && RachaConteudo106.padroes().includes(i.visual.padrao)).map(i => i.visual.padrao)")
        velhos = await rt(pg, "[...new Set(CAT88.itens.filter(i => i.tipo === 'bola' && !RachaConteudo106.padroes().includes(i.visual.padrao)).map(i => i.visual.padrao))]")
        P.confere(sorted(set(pad)) == ['chamas', 'galaxia', 'praia'] and len(pad) == 6 and not set(pad) & set(velhos), '3 padrões novos (praia, chamas, galaxia), 2 bolas em cada, nenhum dos de antes (%s)' % ', '.join(velhos), [pad, velhos])
        await folha_bolas(pg)

        # ---------------------------------------------------------------- o catálogo (o mesmo arquivo do jogo e da plataforma)
        arq = {i['id']: i for i in json.loads((RAIZ / 'app' / 'contracts' / 'catalogo88.json').read_text(encoding='utf-8'))['itens']}
        jogo = await rt(pg, "(ids => ids.map(id => v88Item(id)))(%s)" % json.dumps(MASC + BOLAS))
        P.confere(all(j == arq.get(j['id']) for j in jogo if j) and len([j for j in jogo if j]) == 12, 'os 12 itens novos estão no app/contracts/catalogo88.json iguais aos do jogo (o CAT88 do build)', [j['id'] for j in jogo if j and j != arq.get(j['id'])])
        ok_preco = []
        for i in MASC + BOLAS:
            it = arq[i]; m, g, rar = it.get('moedas', 0), it.get('gemas', 0), it['raridade']
            certo = it.get('venda') is not False and not it.get('gratis') and (m > 0) != (g > 0) and (
                (it['tipo'] == 'tampinha' and ((rar == 'lendario' and g == 150) or (rar == 'epico' and g == 80))) or
                (it['tipo'] == 'bola' and ((rar == 'raro' and m == 3000) or (rar == 'epico' and 60 <= g <= 70) or (rar == 'lendario' and g == 150))))
            ok_preco.append((i, rar, m or g, certo))
        P.confere(all(x[3] for x in ok_preco), 'à venda, com a raridade e o preço coerentes: mascotes épicas 80 gemas e lendárias 150; bolas raras 3.000 moedas, épicas 60–70 gemas e lendárias 150', [x for x in ok_preco if not x[3]])
        P.confere(all(arq[i]['visual']['d']['b'] == 'mh' and arq[i]['visual']['d']['i'] == c for i, c in zip(MASC, CARAS)), 'cada mascote do catálogo é a cara dela com a borda Medalhão', [arq[i]['visual']['d'] for i in MASC])

        # ---------------------------------------------------------------- sem a conta: as peças não são suas
        r = await rt(pg, """(cods => {
          const D = tpLe(cods[0]), r = {tem: [tpTem('i', 'ar'), tpTem('b', 'mh')], equipa: tpEquipa(cods[0]), equipada: tpMinha() === cods[0], compra: tpCompra(D),
            faltam: tpFaltam(D).map(x => x.id + ':' + (x.loja || '')), custo: tpCusto(D), lojaPecas: ecoPecas().filter(x => x.it && x.it.loja).length, esconde: cods.map(c => v101Esconde(c)),
            prontas: RachaSemSkins101.esconde()};
          let bots = 0; for (let i = 0; i < 400; i++){ const L = tpLe(tpDoBot('bot-v106-' + i)); if (L && (RachaConteudo106.caras().includes(L.i) || L.b === 'mh')) bots++; }
          r.bots = bots; return r; })(%s)""" % json.dumps(s['codigos']))
        P.confere(r['tem'] == [False, False] and not r['equipa'] and not r['equipada'] and not r['compra'], 'sem a mascote: não tem as peças, não equipa (nem pelo código colado) e não compra avulsa', r)
        P.confere(sorted(r['faltam']) == ['ar:tp_m_arara', 'mh:tp_m_arara'] and r['custo'].get('loja') and r['lojaPecas'] == 0, 'o editor diz que faltam a cara e a Medalhão (as duas vêm com a mascote, na LOJA); a loja de peças não vende avulsas', r)
        P.confere(r['prontas'] and not any(r['esconde']), 'com as prontas escondidas (a v101), as mascotes são a exceção: nenhuma é escondida', r)
        P.confere(r['bots'] == 0, 'os bots nunca pegam as mascotes nem a borda Medalhão (400 sorteios)', r['bots'])
        await rt(pg, "(() => { abreTela('skins'); return true; })()"); await pg.wait_for_timeout(600)
        r = await rt(pg, """(cod => { const ids = aba => { ED.aba = aba; tpeAtualiza(true); return [...ED.el.faixa.children].map(b => b.dataset.id); };
          const i = ids('i'), bb = ids('b'), r = {i: i.filter(x => RachaConteudo106.caras().includes(x)), b: bb.filter(x => x === 'mh'), nI: i.length};
          let n = 0; for (let k = 0; k < 60; k++){ tpeAleatoria(); if (RachaConteudo106.caras().includes(ED.D.i) || ED.D.b === 'mh') n++; } r.sorteio = n;
          ED.hist.push(tpCopia(ED.D)); ED.D = tpLe(cod); tpeAtualiza(true); tpeConcluir(); r.pop = LB.pop.hidden ? '' : LB.popCaixa.textContent; r.cls = LB.popCaixa.className; fechaPop();
          return r; })(%s)""" % json.dumps(s['codigos'][0]))
        P.confere(r['i'] == [] and r['b'] == [] and r['sorteio'] == 0, 'no editor, sem a mascote: as caras e a Medalhão não aparecem na faixa e a sorteada nunca cai nelas (60 sorteios)', r)
        P.confere('VER NA LOJA' in r['pop'] and 'ct106-pop' in r['cls'] and 'Arara Invocada' in r['pop'], 'o EQUIPAR com uma peça das mascotes que não é sua: a janela explica e manda para a LOJA', r['pop'][:120])
        await rt(pg, "(() => { fechaTela(); const b = [...LB.popCaixa.querySelectorAll('button')].find(b => /DESCARTAR/.test(b.textContent)); if (!LB.pop.hidden && b) b.click(); return true; })()")
        await pg.wait_for_timeout(300)
        r = await rt(pg, """(() => { abreTela('loja'); V88S.cat = 'tampinhas'; v88LojaPinta();
          const cab = [...document.querySelectorAll('#tela-loja .ct106-loja-cab h3')].map(h => h.textContent), cards = [...document.querySelectorAll('#tela-loja .ct106-mascotes .v88-item')];
          return {cab, nomes: cards.map(b => b.getAttribute('aria-label')), canvas: cards.every(b => !!b.querySelector('canvas')), precos: cards.map(b => (b.querySelector('.v88-item-pe') || {}).textContent)}; })()""")
        nomes = await rt(pg, "RachaConteudo106.mascotes().map(m => m.nome)")
        P.confere(r['cab'] == ['MASCOTES'] and r['nomes'] == nomes and r['canvas'] and all(p for p in r['precos']), 'a LOJA › TAMPINHAS mostra as 6 MASCOTES à venda (o desenho e o preço), mesmo com as prontas escondidas', r)
        mini = await rt(pg, """(() => { const c = v88MiniItem('tp_m_arara', 96), d = c.getContext('2d').getImageData(c.width/2 - 2, c.height/2 - 2, 4, 4).data; let b = 0; for (let i = 0; i < d.length; i += 4) b += d[i + 2] - d[i]; return b; })()""")
        P.confere(mini != 0, 'a miniatura da mascote é o desenho dela (a v101 punha o "?" no lugar das tampinhas do catálogo)', mini)
        await rt(pg, "(() => { fechaTela(); return true; })()")
        js = [e for e in erros if 'Failed to load resource' not in e]
        P.confere(not js, 'sem a conta: nenhum erro de JavaScript', js[:3])
        await b.close()


async def com_conta(P):
    """na plataforma de teste: comprar e equipar a Onça-Preta e a Bola de Fogo pela conta, o editor, entrar de novo e a partida"""
    r = subprocess.run(['node', str(RAIZ / 'tests' / 'plataforma' / 'compila.cjs')], cwd=str(RAIZ), capture_output=True, text=True)   # (a plataforma de teste com o catálogo de agora)
    P.confere(r.returncode == 0, 'a plataforma de teste compilada com o catálogo de agora (tests/plataforma/compila.cjs)', (r.stdout + r.stderr)[-300:])
    banco = os.path.join(tempfile.mkdtemp(prefix='racha106-'), 'p.sqlite')
    PL = Plataforma(banco).sobe()
    try:
        A = conta(PL, 'mascote106'); PL.q('loja.estado', None, A['token']); saldo(PL, A['pub'], 20000, 1000)
        async with async_playwright() as pw:
            b, pg, erros = await abre_logado(pw, PL, 'mascote106', 1280, 720)
            await espera(pg, "V88.carteiraOk && !!V88.estado", 8000)
            P.confere(await rt(pg, "RachaSemSkins101.esconde()"), 'o jogo logado com as tampinhas prontas escondidas (a v101, como no lançamento)')
            # ---- a mascote: LOJA › TAMPINHAS › ONÇA-PRETA › COMPRAR › COMPRAR (a confirmação) › EQUIPAR AGORA
            # (o preço é o da loja de agora: a mascote pode estar nas ofertas da semana, com o desconto que o servidor dá)
            venda = await rt(pg, "(ids => ids.map(id => { const v = v88Venda(id); return v ? {m: v.moedas, g: v.gemas, base: v.base.gemas || v.base.moedas, d: v.desconto} : null; }))(%s)" % json.dumps(['tp_m_oncapreta', 'bola_fogo']))
            print('      preços de agora:', json.dumps(venda))
            g0 = PL.q('loja.estado', None, A['token'])['carteira']['gemas']
            ok = await abre_item(pg, 'tampinhas', 'tp_m_oncapreta')
            await pg.screenshot(path=str(SAIDA / 'v106_conteudo_loja_compra.png'))
            texto = await rt(pg, "LB.popCaixa.textContent")
            comprou = ok and str(venda[0]['g']) in texto and venda[0]['base'] == 150 and await pop_bt(pg, 'COMPRAR')
            await asyncio.sleep(.4)
            comprou = comprou and 'COMPRAR ONÇA-PRETA?' in await rt(pg, "LB.popCaixa.textContent") and await pop_bt(pg, 'COMPRAR')
            eq = await pop_bt(pg, 'EQUIPAR AGORA', 6000)
            await asyncio.sleep(1.4)
            srv = PL.q('loja.estado', None, A['token'])
            inv = [i if isinstance(i, str) else i.get('codigo') for i in srv['inventario']]
            cod = await rt(pg, "RachaConteudo106.codigo('tp_m_oncapreta')")
            tampa = PL.sql('select tampa from usuarios where id_publico = ?', [int(A['pub'])])[0]['tampa']
            P.confere(comprou and eq and 'tp_m_oncapreta' in inv and srv['carteira']['gemas'] == g0 - venda[0]['g'],
                      'COMPRAR a Onça-Preta na LOJA › TAMPINHAS › MASCOTES: o item na conta e −%d gemas (o preço do catálogo, 150%s, conferido no servidor)' % (venda[0]['g'], ', com %d%% de oferta da semana' % venda[0]['d'] if venda[0]['d'] else ''), [comprou, eq, srv['carteira'], g0, 'tp_m_oncapreta' in inv])
            r = await rt(pg, "(cod => ({minha: tpMinha() === cod, esconde: v101Esconde(cod), skin: (tpSkin(cod) || {desenho: {}}).desenho.i, perfil: perfil.skin === cod, livre: TP.livres.has(cod)}))(%s)" % json.dumps(cod))
            P.confere(r == {'minha': True, 'esconde': False, 'skin': 'op', 'perfil': True, 'livre': True} and tampa == cod,
                      'EQUIPAR AGORA: a Onça-Preta é a tampinha da conta (no lobby, no perfil e na coluna "tampa" da conta), mesmo com as prontas escondidas', [r, tampa == cod])
            r = await rt(pg, """(() => { V88S.cat = 'tampinhas'; v88LojaPinta(); const b = [...document.querySelectorAll('#tela-loja .ct106-mascotes .v88-item')].find(x => x.getAttribute('aria-label') === 'Onça-Preta');
              const t = document.querySelector('#tela-loja .tl-corpo'); if (t) t.scrollTop = 0;
              const primeiro = document.querySelector('#tela-loja .v88-loja-painel').firstElementChild;
              return {st: b ? (b.querySelector('.v88-item-pe') || {}).textContent : '', emCima: !!primeiro && primeiro.classList.contains('ct106-loja-masc')}; })()""")
            await asyncio.sleep(.4)
            await pg.screenshot(path=str(SAIDA / 'v106_conteudo_loja.png'))
            P.confere(r == {'st': 'EQUIPADA', 'emCima': True}, 'na LOJA › TAMPINHAS, as MASCOTES vêm em cima (antes das peças) e a Onça-Preta aparece EQUIPADA', r)
            # ---- a bola: LOJA › BOLAS › BOLA DE FOGO › COMPRAR › COMPRAR › EQUIPAR AGORA
            g1 = srv['carteira']['gemas']
            ok = await abre_item(pg, 'bolas', 'bola_fogo')
            comprou = ok and venda[1]['base'] == 60 and await pop_bt(pg, 'COMPRAR')
            await asyncio.sleep(.4)
            comprou = comprou and await pop_bt(pg, 'COMPRAR')
            eq = await pop_bt(pg, 'EQUIPAR AGORA', 6000)
            await asyncio.sleep(1.4)
            srv = PL.q('loja.estado', None, A['token'])
            inv = [i if isinstance(i, str) else i.get('codigo') for i in srv['inventario']]
            P.confere(comprou and eq and 'bola_fogo' in inv and srv['equipados'].get('bola') == 'bola_fogo' and srv['carteira']['gemas'] == g1 - venda[1]['g'] and await rt(pg, "v88Equipado('bola') === 'bola_fogo'"),
                      'COMPRAR e EQUIPAR a Bola de Fogo (−%d gemas): equipada na conta' % venda[1]['g'], [comprou, eq, srv['equipados'], srv['carteira'], g1])
            try:
                PL.m('loja.comprar', {'codigo': 'tp_m_arara', 'preco': {'moedas': 0, 'gemas': 1}}, A['token']); recusa = None
            except Exception as e:
                recusa = str(e)
            P.confere(recusa is not None and 'preço' in recusa, 'o preço da mascote mandado errado pelo aparelho: o servidor recusa (vale o do catálogo)', recusa)
            # ---- o editor: só as peças que são da conta (a cara da Onça-Preta e a Medalhão), e as mascotes no INVENTÁRIO
            await rt(pg, "(() => { fechaPop(); fechaTela(); abreTela('skins'); return true; })()"); await pg.wait_for_timeout(600)
            r = await rt(pg, """(() => { const ids = aba => { ED.aba = aba; tpeAtualiza(true); return [...ED.el.faixa.children].filter(b => b.classList.contains('ct106-masc')).map(b => b.dataset.id); };
              const r = {i: ids('i'), b: ids('b')}; ED.aba = 'inv'; tpeAtualiza(true);
              r.inv = [...ED.el.ctl.querySelectorAll('.ct106-inv-cards .tpe-card')].map(c => (c.querySelector('.tpe-card-n') || {}).textContent); r.tem = [tpTem('i', 'op'), tpTem('i', 'ar'), tpTem('b', 'mh')]; return r; })()""")
            P.confere(r == {'i': ['op'], 'b': ['mh'], 'inv': ['Onça-Preta'], 'tem': [True, False, True]}, 'no editor, para quem tem: a cara da Onça-Preta e a borda Medalhão (com o selo MASCOTE) e a mascote no INVENTÁRIO; a Arara (que não comprou) não aparece', r)
            await rt(pg, "(() => { ED.aba = 'i'; ED.D = tpLe(tpMinha()); tpeAtualiza(true); const b = ED.el.faixa.querySelector('.tpe-item[data-id=\"op\"]'); if (b) ED.el.faixa.scrollLeft = b.offsetLeft - ED.el.faixa.clientWidth/2; return true; })()")
            await espera(pg, "[...ED.el.faixa.children].every(b => b.querySelector('.tpe-mini-cv canvas'))", 10000)   # (as miniaturas da faixa saem aos poucos)
            await pg.wait_for_timeout(400)
            await pg.screenshot(path=str(SAIDA / 'v106_conteudo_editor.png'))
            # (a mascote numa salva: guardada junto, para conferir depois de entrar de novo)
            await rt(pg, "(cod => { fechaTela(); if (!TP.salvas.some(s => s.c === cod)) TP.salvas.unshift({c: cod, n: 'Minha onça', f: false}); tpSalva(); return true; })(%s)" % json.dumps(cod))
            await asyncio.sleep(2.5)
            # ---- entrar de novo (recarregar a página): a mascote continua equipada e salva (as peças entram antes da releitura da v105)
            await pg.reload()
            t0 = time.time()
            while time.time() - t0 < 25:
                try:
                    if await pg.evaluate('() => typeof window.__RT === "function" && !!window.__RT("v88Logado() && lobby.aberto")'): break
                except Exception: pass
                await asyncio.sleep(.3)
            await espera(pg, "!!V88.estado", 8000)
            r = await rt(pg, "(cod => ({minha: tpMinha() === cod, salva: TP.salvas.some(s => s.c === cod), adiada: !!TP.adiadas, bola: v88Equipado('bola')}))(%s)" % json.dumps(cod))
            P.confere(r == {'minha': True, 'salva': True, 'adiada': False, 'bola': 'bola_fogo'}, 'entrar de novo: a Onça-Preta continua equipada e salva (sem sumir) e a bola continua a de fogo', r)
            # ---- a partida: a tampinha é a mascote e a bola é a de fogo (girando); os bots sem as mascotes
            await rt(pg, "(() => { try { fechaPop(); } catch (_) {} try { fechaTela(); } catch (_) {} X49.mode = 'casual'; x49Save(); x49Start(1, 0); return 1; })()")
            await espera(pg, "RQ.on && !V93P.contagem", 10000)
            await asyncio.sleep(1.2)
            r = await rt(pg, """(() => { const c = cv, g = c.getContext('2d'), z = cam.z, k = c.width/W;
              const sx = (W/2 + (VIS.bx - cam.x)*z)*k, sy = (H/2 + (VIS.by - cam.y)*z)*k, rb = B.r*z*k;
              const d = g.getImageData(Math.round(sx - rb*.7), Math.round(sy - rb*.7), Math.max(2, Math.round(rb*1.4)), Math.max(2, Math.round(rb*1.4))).data;
              let quente = 0, n = 0; for (let i = 0; i < d.length; i += 4){ n++; if (d[i] > 150 && d[i] > d[i + 2] + 60) quente++; }
              const sk = skinAtual(); let comMascote = 0, total = 0;
              for (const q of RQ.jog){ if (q === P) continue; total++; const s2 = skinDoBot(q); const L = s2 && s2.desenho; if (L && (RachaConteudo106.caras().includes(L.i) || L.b === 'mh')) comMascote++; }
              return {eu: sk && sk.desenho ? sk.desenho.i : null, bola: v88BolaPadrao() ? v88BolaPadrao().id : null, quente: n ? quente/n : 0, comMascote, total}; })()""")
            P.confere(r['eu'] == 'op' and r['bola'] == 'bola_fogo' and r['quente'] > .08, 'na partida: a sua tampinha é a Onça-Preta e a bola é a de fogo (as labaredas na tela: %.0f%% de laranja e vermelho na bola)' % (r['quente']*100), r)
            P.confere(r['comMascote'] == 0, 'na partida, nenhum bot com mascote (%d bots)' % r['total'], r)
            await rt(pg, "(() => { posVisual(0); cam.mode = 'jogador'; return true; })()")
            await asyncio.sleep(.4)
            await pg.screenshot(path=str(SAIDA / 'v106_conteudo_partida.png'))
            await rt(pg, 'rqSai(); true')
            js = [e for e in erros if 'Failed to load resource' not in e]
            P.confere(not js, 'com a conta: nenhum erro de JavaScript', js[:3])
            await b.close()
    finally:
        PL.desce()


async def principal():
    P = Placar('v106 · as bolas e as mascotes novas')
    print('\n1) sem a conta: as peças, os códigos, os desenhos, o catálogo e o editor')
    await sem_conta(P)
    print('\n2) com a conta, na plataforma de teste: comprar, equipar, entrar de novo e a partida')
    await com_conta(P)
    return P.fim()


if __name__ == '__main__':
    sys.exit(asyncio.run(principal()))
