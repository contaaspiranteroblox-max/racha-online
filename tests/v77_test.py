"""v77 · o jogo com a cara das imagens enviadas: o LOBBY e o PERFIL como nas imagens, cada botão abrindo só a sua tela (com
a mesma barra em cima) e o MAPA PRINCIPAL (a Arena) virando a quadra da imagem (verde, áreas amarelas, círculo azul).

· As peças das imagens vão embutidas pelo build e abrem: o fundo do lobby limpo, o letreiro, os ícones, o banner do perfil e o
  kit da quadra. O fundo do lobby é a imagem limpa (conferido pixel a pixel no meio da tela, contra a própria imagem), o
  letreiro fica em cima da tampinha, os botões têm os desenhos da imagem, o EVENTOS entra na coluna da direita, os AMIGOS
  no topo e a tampinha do meio é desenhada reta, sem a bola do lado. Não tem fileira de tampinhas no lobby: trocar de
  tampinha é pela TAMPINHA (o editor).
· Cada botão abre só a sua tela: nenhuma tela tem abas que levam para outras telas; o título é o do botão; em cima de todas,
  o VOLTAR, as moedas e as gemas, o chat, os amigos e os ajustes (e eles funcionam); atrás, a quadra do lobby escurecida.
· O PERFIL: a tampinha reta na quadra à esquerda; à direita o cartão com o banner, a tampinha no aro, o nível no hexágono, o
  nome, o ID (copiar), o XP e as abas VISÃO GERAL · ESTATÍSTICAS · CONQUISTAS · PARTIDAS (uma por vez, com os números de
  verdade); tocar na tampinha abre o editor e o VOLTAR traz de volta ao perfil; as sub-abas antigas levam às novas.
· A QUADRA: as mesmas medidas, paredes, gols e marcas da Arena de antes (de 1v1 a 4v4) e, com RACHA_REF, o mesmo bloco de
  física e o mesmo caminho da bola da v71.1; as cores da imagem nos lugares certos de cada tamanho (o verde, o amarelo das
  áreas, o azul do meio, o piso, o muro de cima), o Ultra leve liso, a prévia do JOGAR e, na Tela parada, as casas de fora.
· No celular deitado (844 × 390): o lobby, o perfil e as telas cabem sem rolar e sem erro.
Isto mede o desenho no Chromium de teste; se fica bonito no aparelho é com quem joga (as capturas ficam em tests/saida/v77_*).

Rodar: python3 tests/v77_test.py            (RACHA_REF=<racha_teste.html da v71.1> compara a física e o caminho da bola)
"""
import json, os, pathlib
from comum import abre, rt, roda, Placar, async_playwright, RAIZ

SAIDA = RAIZ / 'tests' / 'saida'; SAIDA.mkdir(exist_ok=True)
REF = os.environ.get('RACHA_REF')

ESPERA = "(() => V77.ok.fundo && V77.ok.letreiro && V77.ok.icones && V77.ok.banner && QD.ok)()"

# o fundo do lobby: amostras no meio da tela (sem o véu de cima e de baixo) contra a imagem limpa, no mesmo encaixe
FUNDO = r"""(() => {
  const s = PALCO.s, dpr = PALCO.dpr, sa = PALCO.sa, w = PALCO.vw/s, h = PALCO.vh/s, ox = sa.l/s, oy = sa.t/s;
  const E = l77Encaixe(w, h, PALCO.cx + ox, PALCO.cy + oy), fe = LB.fundo.getContext('2d');
  const c = document.createElement('canvas'); c.width = V77P.fundo.w; c.height = V77P.fundo.h; const xi = c.getContext('2d'); xi.drawImage(V77.img.fundo, 0, 0);
  const media = (g, x, y, n) => { const d = g.getImageData(Math.round(x) - (n >> 1), Math.round(y) - (n >> 1), n, n).data; let r = 0, gg = 0, b = 0;
    for (let i = 0; i < d.length; i += 4){ r += d[i]; gg += d[i + 1]; b += d[i + 2]; } const k = d.length/4; return [r/k, gg/k, b/k].map(Math.round); };
  const out = [];
  for (const [fx, fy] of [[.3, .3], [.5, .34], [.7, .3], [.36, .5], [.64, .52], [.5, .58]]){
    const x = w*fx, y = 150 + (h - 400)*fy, ix = (x - E.x)/E.s, iy = (y - E.y)/E.s;
    out.push({tela:media(fe, x*s*dpr, y*s*dpr, 6), imagem:media(xi, ix, iy, Math.max(2, Math.round(6/(E.s*s*dpr))))});
  }
  return {s:+E.s.toFixed(3), amostras:out, cobre:E.x <= .5 && E.y <= .5 && E.x + E.W >= w - .5 && E.y + E.H >= h - .5};
})()"""

LOBBY = r"""(() => {
  const vis = e => !!e && getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().width > 2;
  const marca = document.querySelector('#rx .rx-marca'), let_ = marca && marca.querySelector('.v77-letreiro'), cap = LB.emblema.getBoundingClientRect(), lr = let_ && let_.getBoundingClientRect();
  const tiles = [...document.querySelectorAll('#rx .v71-tile')].map(b => ({t:b.querySelector(':scope > b').textContent, ic:(b.querySelector('i .v77-ic') || {}).dataset ? b.querySelector('i .v77-ic').dataset.ic : null}));
  const topo = [...document.querySelectorAll('#lb .lb-topo .tp-dir > *')].filter(vis).map(e => e.id || e.className.split(' ').filter(c => /tp-ic|hm-grana|v77-amg/.test(c)).join('.'));
  const cvs = [...LB.palco.querySelectorAll('canvas')].filter(vis).map(c => c.id || c.className);
  return {let:vis(let_) && marca.classList.contains('v77-com-letreiro'), letEmCima:!!lr && lr.bottom <= cap.top + cap.height*.25 && Math.abs((lr.left + lr.right)/2 - (cap.left + cap.right)/2) < cap.width*.6,
    logoLido:document.querySelector('#rx .rx-logo').textContent, tiles, topo, cvs, xp:(document.getElementById('v77-xp') || {}).textContent,
    modo:[LB.modo.querySelector('.v71-modo-tx b').textContent, (LB.modo.querySelector('.v77-modo-nm') || {}).textContent],
    premio:!!LB.missoes.querySelector('.mi-premio .v77-pilha') && /^\d/.test(LB.missoes.querySelector('.mi-premio b').textContent), estrela:!!LB.missoes.querySelector('.v77-mi-ic'),
    v77:LB.raiz.classList.contains('v77'), carrossel:document.querySelectorAll('#lb-palco .tp-carrossel, #lb-palco .v77-carrossel, #lb-palco [class*=carross]').length};
})()"""

# a tampinha do meio: desenhada reta (sem rodar) e sem a bola do lado
TAMPA = r"""(() => {
  const C = CanvasRenderingContext2D.prototype, rot = C.rotate; let giros = 0, bolas = 0; const db = drawBall;
  C.rotate = function(a){ if (this.canvas === LB.brilho && Math.abs(a) > 1e-6) giros++; return rot.apply(this, arguments); };
  drawBall = function(){ bolas++; return db.apply(this, arguments); };
  try { pintaBrilho(1.234); } finally { C.rotate = rot; drawBall = db; }
  return {giros, bolas};
})()"""

# cada tela: só ela (sem abas de outras telas), o título dela, a barra de cima e a quadra atrás
TELAS = [('perfil', 'PERFIL'), ('ranking', 'RANKING'), ('replays', 'REPLAYS'), ('amigos', 'SALAS'), ('clube', 'CLUBE'), ('copa', 'EVENTOS'), ('chat', 'CHAT DO BRASIL'),
         ('comunidade', 'AMIGOS'), ('loja', 'LOJA'), ('treino', 'TREINO'), ('skins', 'SUA TAMPINHA')]
TELA = r"""((id) => {
  if (lobby.tela){ ED.saindo = true; fechaTela(); ED.saindo = false; }
  abreTela(id);
  const T = TELAS[id].el, cab = T.querySelector('.tl-cab.v77-cab'), vis = e => !!e && getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().width > 2;
  const abas = [...T.querySelectorAll('.tl-abas')].filter(vis).length;
  return {tela:lobby.tela, h2:cab && cab.querySelector('h2').textContent, abas, voltar:vis(cab && cab.querySelector('.tl-voltar')), grana:cab ? [...cab.querySelectorAll('.lb-grana')].filter(vis).length : 0,
    icones:cab ? [...cab.querySelectorAll('.v77-cab-bt')].filter(vis).map(b => b.getAttribute('aria-label')) : [], atras:LB.raiz.classList.contains('v77-tela') && getComputedStyle(document.getElementById('lb-rolagem')).visibility === 'hidden'};
})"""

PERFIL = r"""(() => {
  const vis = e => !!e && !e.hidden && getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().width > 2;
  const P = V77T.pf, abas = [...P.abas.children].map(b => [b.textContent, b.getAttribute('aria-selected')]);
  const partes = ['geral', 'est', 'conq', 'hist'].map(k => vis(P[k]) ? 1 : 0).join('');
  const num = id => document.getElementById(id).textContent;
  return {abas, partes, nome:document.getElementById('lb-nome-txt').textContent, id:PF.uid.textContent, nv:P.nv.textContent.replace(/\s+/g, ''), xp:document.getElementById('pf-xp-tx').textContent,
    tempo:P.tTempo.textContent, seq:P.tSeq.textContent, gols:num('st-gols'), assist:num('st-assist'), vit:num('st-vitorias'), part:num('st-partidas'), aprov:num('st-aprov'),
    banner:getComputedStyle(P.ban).backgroundImage.indexOf('data:image/webp') >= 0, letreiro:vis(P.ban.querySelector('.v77-pf-letreiro')), copia:vis(P.id.querySelector('.v77-pf-copia')),
    lado:vis(document.querySelector('#tela-perfil .pf-lado')), pais:!!P.pais.firstChild, tits:P.tits.children.length};
})()"""
# os números de verdade: um jogo de partidas e gols gravado antes de abrir
ESTAT = r"""(() => { perfil.est = {'casual|futebol':{p:6, c:5, v:4, d:1, a:1, m:9, pt:9, as:3, ss:2, t:3725}, 'liga|futebol':{p:2, c:2, v:1, d:1, m:2, pt:2, as:1, t:600}};
  X49.bestSeq = 3; perfilSalvar(); return true; })()"""

# a tampinha do perfil: reta (sem os raios girando da v34) e com a sombra no chão
TAMPA_PERFIL = r"""(() => {
  const C = CanvasRenderingContext2D.prototype, rot = C.rotate; let giros = 0;
  C.rotate = function(a){ if (this.canvas === PF.palco && Math.abs(a) > 1e-6) giros++; return rot.apply(this, arguments); };
  try { pintaPalcoPerfil(2.5); } finally { C.rotate = rot; }
  const c = PF.palco, g = c.getContext('2d'), d = g.getImageData(Math.round(c.width/2), Math.round(c.height*.6), 1, 1).data, canto = g.getImageData(4, 4, 1, 1).data;
  return {giros, meio:d[3], canto:canto[3], w:c.width};
})()"""

# a quadra: as medidas e a física (as mesmas da Arena de antes, de 1v1 a 4v4) e as cores nos lugares certos
GEO = r"""(() => { const out = [];
  for (let n = 1; n <= 4; n++){ __T.comeca('futebol', n, 0);
    out.push({MW, MH, GL, GR, GT, GB, LX0, LX1, LY0, LY1, CX, CY, GOL_PROF, GOL_Y0, GOL_Y1, REDE_E, POST_R, fator:CAMPO.fatorBola, QUADRO_W, QUADRO_H,
      posts:JSON.stringify(POSTS), wall:JSON.stringify(WALL_SEGS), net:JSON.stringify(NET_SEGS), jog:JSON.stringify(JOG_SEGS), obst:JSON.stringify(OBST), marcas:JSON.stringify(MARCAS)});
    rqSai(); }
  return out; })()"""
CHUTE = r"""(() => { const T = __T; T.comeca('futebol', 2, 0); T.limpa();
  T.poe(P, CX - U(14), CY + U(3)); T.cola(P, 1, -.35); P.chutar = FORCA_POWER; const cam = [];
  T.passos(300, i => { if (i > 0) P.chutar = 0; cam.push(Math.round((B.x - CX)*1000)/1000, Math.round((B.y - CY)*1000)/1000); });
  rqSai(); return cam.join(','); })()"""
CORES = r"""((n) => { __T.comeca('futebol', n, 0); __T.limpa(); cam.mode = 'fixa'; updateCamera(0, true);
  const qs0 = wantQS; wantQS = () => .5; try { buildStatic(); } finally { wantQS = qs0; }
  const g = stat.getContext('2d'), k = stat.width/MW, M = MARCAS;
  const px = (x, y) => [...g.getImageData(Math.round(x*k), Math.round(y*k), 1, 1).data].slice(0, 3);
  const media = (x, y, r) => { const d = g.getImageData(Math.round((x - r)*k), Math.round((y - r)*k), Math.max(1, Math.round(2*r*k)), Math.max(1, Math.round(2*r*k))).data; let s = [0, 0, 0], c = 0;
    for (let i = 0; i < d.length; i += 4){ s[0] += d[i]; s[1] += d[i + 1]; s[2] += d[i + 2]; c++; } return s.map(v => Math.round(v/c)); };
  const r = {n, verde:media(CX - (CX - LINHAS.x0)*.45, CY + (LINHAS.y1 - CY)*.6, U(1.2)), amarelo:media(LINHAS.x0 + M.areaW*.78, CY + M.areaH*.3, U(.8)),
    azul:media(CX + M.circulo*.35, CY - M.circulo*.35, U(.8)), piso:media((GL + LINHAS.x0)/2, CY + (GB - CY)*.72, U(.6)),
    muro:media(CX - (GR - GL)*.32, GT*.55, U(.5)), lado:media(GL*.5, CY + U(9), U(.8)), err:window.RUA_QUADRA77_ERRO || null};
  rqSai(); return r; })"""
FORA = r"""(() => { __T.comeca('futebol', 2, 0); __T.limpa(); cam.mode = 'fixa'; updateCamera(0, true); buildStatic();
  const C = CanvasRenderingContext2D.prototype, di = C.drawImage; let usou = 0;
  C.drawImage = function(img){ if (this === ctx && img === QD_FORA.c) usou++; return di.apply(this, arguments); };
  try { render(0); } finally { C.drawImage = di; }
  const d = ctx.getImageData(Math.round(3*K), Math.round(cv.height/2), 1, 1).data;
  const r = {usou, c:!!QD_FORA.c, borda:[d[0], d[1], d[2]], fundo:CAMPO.fundo, visivel:cam.x - W/(2*cam.z) < 0}; rqSai(); return r; })()"""


def perto(a, b, t=24):
    return all(abs(x - y) <= t for x, y in zip(a, b))


def tom(c, nome):
    r, g, b = c
    return {'verde': g > r + 25 and g > b + 15, 'amarelo': r > 150 and g > 100 and b < 90 and r > b + 80, 'azul': b > r + 30 and b > 70,
            'piso': r > g > b and r > 90 and r - b > 20, 'muro': 40 < r < 190 and abs(r - g) < 40, 'lado': max(c) > 40}[nome]


async def principal():
    P = Placar('v77 · o lobby, o perfil, as telas e o mapa principal das imagens enviadas')
    html = (RAIZ / 'app' / 'public' / 'game' / 'racha.html').read_text(encoding='utf-8')
    fonte = '\n'.join((RAIZ / 'tools' / 'v77' / n).read_text(encoding='utf-8') for n in ('pecas.js', 'quadra.js'))
    P.confere(all(fonte.count(m) == 1 for m in ('/*FUNDO77*/null', '/*LETREIRO77*/null', '/*ICONES77*/null', '/*BANNER77*/null', '/*KIT77*/null'))
              and all(('const %s = {src:"data:image/webp;base64,' % n) in html or ('%s:{src:"data:image/webp;base64,' % n) in html for n in ('fundo', 'letreiro', 'icones', 'banner'))
              and 'const QD_KIT = {src:"data:image/webp;base64,' in html and '<link rel="stylesheet" href="./v77.css">' in html,
              'as peças das imagens (o fundo, o letreiro, os ícones, o banner e o kit da quadra) e o v77.css vão no jogo pelo build')
    async with async_playwright() as pw:
        # ---------------------------------------------------------------- o lobby (computador e celular deitado)
        for (w, h, d, toque) in [(1280, 720, 1, False), (1440, 900, 1, False), (844, 390, 2.185, True), (667, 375, 2, True)]:
            nome = '%dx%d' % (w, h)
            b, pg, erros = await abre(pw, w, h, dsf=d, toque=toque)
            await pg.wait_for_function('() => window.__RT(%s)' % json.dumps(ESPERA), polling=100, timeout=15000)
            await rt(pg, "(() => { abrirLobby(); LB.fundo.dataset.k = ''; pintaFundoLobby(); return true; })()"); await pg.wait_for_timeout(500)
            await pg.screenshot(path=str(SAIDA / ('v77_lobby_%s.png' % nome)))
            f = await rt(pg, FUNDO)
            P.confere(all(perto(a['tela'], a['imagem']) for a in f['amostras']) and f['cobre'], '%s: o fundo do lobby é a imagem limpa (6 amostras, cor a cor) e cobre a tela' % nome, f)
            l = await rt(pg, LOBBY)
            if (w, h) == (1280, 720):
                P.confere(l['v77'] and l['let'] and l['letEmCima'] and l['logoLido'] == 'RACHA', 'o letreiro da imagem (RACHA, a coroa e FUTEBOL DE RUA) em cima da tampinha; o nome RACHA continua para o leitor de tela', l)
                P.confere([t['t'] for t in l['tiles']] == ['LOJA', 'TAMPINHA', 'CLUBE', 'TREINO', 'SALAS', 'AMIGOS', 'RANKING', 'EVENTOS']
                          and [t['ic'] for t in l['tiles']] == ['loja', 'tampinha', 'clube', 'treino', 'salas', 'amigos', 'ranking', 'eventos'],
                          'os 8 botões dos lados com os desenhos da imagem (o EVENTOS entrou na coluna da direita)', l['tiles'])
                P.confere(l['topo'][-3:] == ['lb-chat', 'tp-ic.v77-amg', 'lb-ajustes'] and l['topo'].count('hm-grana') == 2, 'em cima: moedas e gemas com o +, o chat, os AMIGOS e os ajustes (como na imagem)', l['topo'])
                P.confere(l['xp'] == '0 / 100' and l['modo'] == ['2 VS 2', 'RANQUEADA · ESTÁDIO'] and l['premio'] and l['estrela'],
                          'você com o XP em números; o MODO com o tamanho grande (2 VS 2) e embaixo o que vai ser jogado (v79: RANQUEADA · ESTÁDIO); os DESAFIOS com a estrela e o prêmio na pilha de moedas', l)
                P.confere(l['carrossel'] == 0 and sorted(l['cvs']) == sorted(['lb-brilho', 'lb-eu-cv']) or l['carrossel'] == 0 and 'lb-brilho' in l['cvs'] and len(l['cvs']) <= 2,
                          'sem a fileira de tampinhas embaixo: no lobby só a sua tampinha (trocar é na TAMPINHA)', l['cvs'])
                t = await rt(pg, TAMPA)
                P.confere(t['giros'] == 0 and t['bolas'] == 0, 'a tampinha do meio é desenhada reta (sem girar) e sem a bola do lado', t)
                e = await rt(pg, "(() => { document.querySelector('#rx .v77-eventos').click(); const a = lobby.tela; fechaTela(); document.querySelector('#lb .lb-topo .v77-amg').click(); const b = lobby.tela; fechaTela(); return [a, b]; })()")
                P.confere(e == ['copa', 'comunidade'], 'o EVENTOS abre a Copa dos Amigos (a tela EVENTOS) e os AMIGOS do topo, a tela AMIGOS', e)
            rede = [x for x in erros if 'Failed to load resource' in x]
            P.confere(not [x for x in erros if x not in rede], '%s: nenhum erro de JavaScript no lobby' % nome, [x for x in erros if x not in rede][:3])
            await b.close()

        # ---------------------------------------------------------------- as telas e o perfil (computador)
        b, pg, erros = await abre(pw, 1280, 720, toque=False)
        await pg.wait_for_function('() => window.__RT(%s)' % json.dumps(ESPERA), polling=100, timeout=15000)
        res = {}
        for tid, tit in TELAS:
            r = await rt(pg, '(%s)(%s)' % (TELA, json.dumps(tid))); await pg.wait_for_timeout(200)
            res[tid] = r
            if tid in ('perfil', 'ranking', 'clube'): await pg.screenshot(path=str(SAIDA / ('v77_tela_%s.png' % tid)))
        ok = all(res[t]['tela'] == t and res[t]['h2'] == tit and res[t]['abas'] == 0 and res[t]['voltar'] and res[t]['grana'] == 2 and res[t]['icones'] == ['Chat do Brasil', 'Amigos', 'Ajustes'] and res[t]['atras']
                 for t, tit in TELAS)
        P.confere(ok, '%d telas: cada uma só com o que é dela (sem abas de outras telas), o título do botão, o VOLTAR, moedas e gemas e os 3 ícones; a quadra atrás' % len(TELAS), res)
        r = await rt(pg, """(() => { abreTela('ranking'); TELAS.ranking.el.querySelector('.v77-cab-chat').click(); const a = lobby.tela;
          TELAS.chat.el.querySelector('.v77-cab-aj').click(); const aj = !LB.aj.hidden; ajxFecha && ajxFecha(); fechaTela(); return {a, aj}; })()""")
        P.confere(r['a'] == 'chat' and r['aj'], 'os ícones da barra funcionam (o chat abre o Chat do Brasil; a engrenagem, os Ajustes)', r)

        await rt(pg, ESTAT); await rt(pg, "(() => { if (lobby.tela) fechaTela(); abreTela('perfil'); return true; })()"); await pg.wait_for_timeout(400)
        p = await rt(pg, PERFIL)
        P.confere([a[0] for a in p['abas']] == ['VISÃO GERAL', 'ESTATÍSTICAS', 'CONQUISTAS', 'PARTIDAS'] and p['abas'][0][1] == 'true' and p['partes'] == '1000' and p['lado'],
                  'PERFIL: as abas VISÃO GERAL · ESTATÍSTICAS · CONQUISTAS · PARTIDAS (abre na VISÃO GERAL, com a tampinha ao lado)', p)
        P.confere(p['gols'] == '11' and p['assist'] == '4' and p['vit'] == '5' and p['part'] == '7' and p['aprov'] == '71%' and p['tempo'] == '1h 12min' and p['seq'].startswith('3'),
                  'VISÃO GERAL com os números de verdade: gols, assistências, vitórias, partidas, aproveitamento, tempo em campo e a melhor sequência', p)
        P.confere(p['banner'] and p['letreiro'] and p['copia'] and p['pais'] and p['nv'] == 'NV1' and (p['xp'].endswith('XP') or 'XP PARA O' in p['xp']) and p['id'] and p['tits'] == 7,   # (v78: o XP por extenso: NÍVEL 1 · FALTAM … XP PARA O 2)
                  'o cartão da imagem: o banner com o letreiro, o nível no hexágono, o nome com a bandeira, o ID com o copiar, o XP e os 7 títulos', p)
        t = await rt(pg, TAMPA_PERFIL)
        P.confere(t['giros'] == 0 and t['meio'] > 200 and t['canto'] == 0, 'a tampinha do perfil é reta como a do lobby (sem os raios girando) e fica na quadra', t)
        vistas = {}
        for k in ('est', 'conq', 'hist', 'geral'):
            await pg.click('#v77-pf-t-' + k); await pg.wait_for_timeout(250)
            vistas[k] = await rt(pg, "(() => { const C = document.querySelector('#tela-perfil .pf-corpo'); return {partes:['geral', 'est', 'conq', 'hist'].map(q => V77T.pf[q].hidden ? 0 : 1).join(''), rola:C.scrollHeight > C.clientHeight + 2}; })()")
            await pg.screenshot(path=str(SAIDA / ('v77_perfil_%s.png' % k)))
        P.confere(vistas['est']['partes'] == '0100' and vistas['conq']['partes'] == '0010' and vistas['hist']['partes'] == '0001' and vistas['geral']['partes'] == '1000' and not any(v['rola'] for v in vistas.values()),
                  'cada aba mostra só a parte dela e nada rola', vistas)
        r = await rt(pg, "(() => { V70PF.parte = 'hist'; v70PfAplica(); const a = V77T.parte; V70PF.parte = 'cartao'; v70PfAplica(); return [a, V77T.parte]; })()")
        P.confere(r == ['hist', 'geral'], 'as sub-abas antigas (PARTIDAS, CARTÃO) levam às novas', r)
        r = await rt(pg, "(() => { PF.palcoBox.click(); const a = lobby.tela; ED.saindo = true; fechaTela(); ED.saindo = false; return [a, lobby.tela]; })()")
        P.confere(r == ['skins', 'perfil'], 'tocar na tampinha do perfil abre o editor (TAMPINHA) e o VOLTAR traz de volta ao perfil', r)
        rede = [x for x in erros if 'Failed to load resource' in x]
        P.confere(not [x for x in erros if x not in rede], 'nenhum erro de JavaScript (telas e perfil)', [x for x in erros if x not in rede][:3])
        await b.close()

        # ---------------------------------------------------------------- a quadra (o mapa principal)
        b, pg, erros = await abre(pw, 1280, 720)
        await pg.wait_for_function('() => window.__RT("QD.ok")', polling=100, timeout=15000)
        geo = await rt(pg, GEO)
        cores = []
        for n in (1, 2, 3, 4):
            c = await rt(pg, '(%s)(%d)' % (CORES, n)); cores.append(c)
            await rt(pg, "(() => { __T.comeca('futebol', %d, 0); __T.limpa(); cam.mode = 'fixa'; updateCamera(0, true); buildStatic(); return true; })()" % n); await pg.wait_for_timeout(300)
            await pg.screenshot(path=str(SAIDA / ('v77_quadra_%dv%d.png' % (n, n))))
        bons = [all(tom(c[k], k) for k in ('verde', 'amarelo', 'azul', 'piso', 'muro', 'lado')) and not c['err'] for c in cores]
        P.confere(all(bons), '1v1 a 4v4: o verde da quadra, o amarelo das áreas, o azul do meio, o piso em volta, o muro de cima e as escadas dos lados, nos lugares de cada tamanho', cores)
        await rt(pg, "graf = 'leve'; true")
        lv = await rt(pg, '(%s)(2)' % CORES)
        await rt(pg, "(() => { __T.comeca('futebol', 2, 0); __T.limpa(); cam.mode = 'fixa'; updateCamera(0, true); buildStatic(); return true; })()"); await pg.wait_for_timeout(300)
        await pg.screenshot(path=str(SAIDA / 'v77_quadra_ultraleve.png'))
        await rt(pg, "graf = GRAF_PADRAO; true")
        P.confere(perto(lv['verde'], [53, 108, 60], 6) and perto(lv['amarelo'], [211, 150, 42], 6) and perto(lv['azul'], [42, 83, 117], 6) and not lv['err'], 'Ultra leve: as mesmas cores, lisas (sem textura nem cenário)', lv)
        fo = await rt(pg, FORA)
        P.confere(fo['usou'] >= 1 and fo['c'] and fo['visivel'] and fo['borda'] != [75, 61, 53], 'na Tela parada, onde a tela passa do mapa, entram as casas de fora (a imagem de fora do mundo)', fo)
        # (v79: o JOGAR é só a ranqueada, no Estádio: a prévia da Arena é desenhada com o botão dela à mostra, só para o teste)
        await rt(pg, "(() => { abrirLobby(); abreJogar('casual'); RQP.mapas.querySelector('[data-m=\\\"0\\\"]').hidden = false; pintaMapas(); return true; })()"); await pg.wait_for_timeout(1500)
        pv = await rt(pg, """(() => { const c = RQP.mapas.querySelector('[data-m="0"] canvas'), g = c.getContext('2d'), key = [...PREV_MORRO.keys()].find(k => k.startsWith('0-')) || null;
          const p = key && PREV_MORRO.get(key), y = Math.round(p ? p.cy + 3 : c.height/2), d = g.getImageData(0, y, c.width, 1).data, tons = {amarelo:0, verde:0, azul:0};
          for (let i = 0; i < d.length; i += 4){ const [r, gg, b] = [d[i], d[i + 1], d[i + 2]];
            if (r > 150 && gg > 100 && b < 90 && r > b + 80) tons.amarelo++; else if (gg > r + 25 && gg > b + 15) tons.verde++; else if (b > r + 30 && b > 70) tons.azul++; }
          return {key, y, tons}; })()""")
        await pg.screenshot(path=str(SAIDA / 'v77_jogar_previa.png'))
        await rt(pg, "fechaRanqueada(); true")
        P.confere(pv['key'] and pv['tons']['amarelo'] >= 6 and pv['tons']['verde'] >= 6 and pv['tons']['azul'] >= 4, 'a prévia da ARENA no JOGAR é a quadra nova (na linha do meio: o amarelo das áreas, o verde e o azul do círculo)', pv)
        r = await rt(pg, "(() => { window.RUA_QUADRA77_ERRO = null; const q = quadra77; quadra77 = () => { throw new Error('teste: erro na quadra nova'); }; __T.comeca('futebol', 2, 0); buildStatic(); quadra77 = q; const e = window.RUA_QUADRA77_ERRO, ok = !!stat && stat.width > 10; rqSai(); return {e:String(e || ''), ok}; })()")
        P.confere('teste: erro na quadra nova' in r['e'] and r['ok'], 'com erro no desenho novo, o erro fica guardado e entra a Arena de antes (o jogo não quebra)', r)
        if REF and pathlib.Path(REF).exists():
            b2, pg2, e2 = await abre(pw, 1280, 720, pagina=pathlib.Path(REF))
            geo2 = await rt(pg2, GEO); ch2 = await rt(pg2, CHUTE)
            await b2.close()
            ch = await rt(pg, CHUTE)
            P.confere(geo == geo2, '1v1 a 4v4: as mesmas medidas, paredes, traves, redes, marcas e fator da bola da Arena da v71.1', [g for g, h in zip(geo, geo2) if g != h][:2])
            P.confere(ch == ch2 and len(ch) > 1000, 'o mesmo chute dá o mesmo caminho da bola (300 passos) na v71.1 e na v77', [ch[:60], ch2[:60]])
            fis = lambda t: t[t.index('/*PHYS_START*/'):t.index('/*PHYS_END*/')]
            P.confere(fis(html) == fis(pathlib.Path(REF).read_text(encoding='utf-8')), 'o bloco de física é o mesmo da v71.1, byte a byte')
        else:
            print('  (sem RACHA_REF: a comparação com a v71.1 fica de fora)')
        rede = [x for x in erros if 'Failed to load resource' in x]
        P.confere(not [x for x in erros if x not in rede], 'nenhum erro de JavaScript (a quadra)', [x for x in erros if x not in rede][:3])
        await b.close()

        # ---------------------------------------------------------------- no celular deitado: tudo cabe sem rolar
        cabe = (RAIZ / 'tests' / 'cabe.js').read_text(encoding='utf-8')
        b, pg, erros = await abre(pw, 844, 390, dsf=2)
        await pg.wait_for_function('() => window.__RT(%s)' % json.dumps(ESPERA), polling=100, timeout=15000)
        cab = {}
        for nome, js in [('lobby', "abrirLobby(); true"), ('perfil', "abreTela('perfil'); true"), ('perfil-conq', "v77PfParte('conq'); true"), ('perfil-hist', "v77PfParte('hist'); true"),
                         ('ranking', "fechaTela(); abreTela('ranking'); true"), ('eventos', "fechaTela(); abreTela('copa'); true"), ('amigos', "fechaTela(); abreTela('comunidade'); true"), ('chat', "fechaTela(); abreTela('chat'); true")]:
            await rt(pg, js); await pg.wait_for_timeout(450)
            m = await pg.evaluate(cabe + '("#lb, #pop-ajustes, #cp")')
            cab[nome] = {'rola': m['rola'], 'fora': m['fora']}
            await pg.screenshot(path=str(SAIDA / ('v77_cel_%s.png' % nome)))
        P.confere(all(not v['rola'] and not v['fora'] for v in cab.values()), '844x390: o lobby, o perfil (VISÃO GERAL, CONQUISTAS, PARTIDAS) e as telas cabem sem rolar', cab)
        rede = [x for x in erros if 'Failed to load resource' in x]
        P.confere(not [x for x in erros if x not in rede], '844x390: nenhum erro de JavaScript', [x for x in erros if x not in rede][:3])
        await b.close()
    return P.fim()


roda(principal())
