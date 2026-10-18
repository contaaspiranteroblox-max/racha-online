"""v73 · o TESTE da v72 saiu e o sensor (o halo em volta dos jogadores) ficou mais transparente.

· O TESTE saiu inteiro: sem o cartão no TREINAMENTO (os 8 de sempre, na mesma ordem), sem o código dele (TST, tstAtivo,
  os ganchos tstVelJog/tstTetoBola no bloco de física) e sem o v72.css; a escolha que ele guardava some do aparelho; a
  tecla do DRIBLE nos Ajustes volta a ficar escondida fora da GINGA (como na v70.2).
· O sensor: a imagem pronta do halo (o anel de cada jogador, na cor do time) sai com 45% da força, com o mesmo desenho e o
  mesmo tamanho (a borda de fora continua no alcance do chute); a ponta com 70%; o contorno do time (cheio = casa,
  tracejado = visitante) com 40%; a carga do chute armado fica igual. Medido nos pixels das imagens prontas e no que o
  quadro da partida desenha de verdade (o caminho ativo: aroDe → aroJog → spriteHalo/spriteTag e v70Contorno).
· Fora disso nada muda: com RACHA_REF=<racha_teste.html da v71.1> o bloco de física é o mesmo, byte a byte, e o mesmo
  roteiro (treino livre e partida contra os bots, 900 passos cada) dá exatamente o mesmo caminho nas duas versões.
Capturas em tests/saida/v73_*.png (a partida 3v3, o chute armado e o treino; computador e celular deitado). Isto mede a
página no Chromium de teste; se o visual agrada é com quem joga.

Rodar:  python3 tests/v73_test.py
        RACHA_REF=<racha_teste.html da v71.1> python3 tests/v73_test.py   (com a comparação entre as versões)
"""
import json, os, pathlib
from comum import abre, rt, roda, Placar, async_playwright, RAIZ, PAGINA

SAIDA = RAIZ / 'tests' / 'saida'; SAIDA.mkdir(exist_ok=True)

# as imagens prontas: a força (alfa máximo), quantos pixels aparecem e o tamanho, antes (a função de antes) e agora
SPRITES = r"""(() => {
  const alfa = c => { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let mx = 0, n = 0, soma = 0;
    for (let i = 3; i < d.length; i += 4){ if (d[i] > mx) mx = d[i]; if (d[i] > 8) n++; soma += d[i]; } return {mx, n, soma, w:c.width, h:c.height}; };
  const out = {};
  const escala = (a, b, f) => { const x = a.getContext('2d').getImageData(0, 0, a.width, a.height).data, y = b.getContext('2d').getImageData(0, 0, b.width, b.height).data;
    if (a.width !== b.width || a.height !== b.height) return 999; let m = 0; for (let i = 3; i < x.length; i += 4) m = Math.max(m, Math.abs(x[i] - Math.round(y[i]*f))); return m; };
  for (const [nome, cor] of [['preto', TIME71[0].base], ['branco', TIME71[1].base]]){
    const rpx = 40;
    out[nome] = {halo:alfa(spriteHalo(cor, rpx, 'p')), haloAntes:alfa(spriteHaloAntes73(cor, rpx, 'p')),
                 tag:alfa(spriteTag(cor, rpx, 7)), tagAntes:alfa(spriteTagAntes73(cor, rpx, 7)), dc:[spriteTag(cor, rpx, 7).dc, spriteTagAntes73(cor, rpx, 7).dc],
                 carga:alfa(spriteHalo(cor, rpx, 'c')), cargaAntes:alfa(spriteHaloAntes73(cor, rpx, 'c')),
                 difHalo:escala(spriteHalo(cor, rpx, 'p'), spriteHaloAntes73(cor, rpx, 'p'), SENSOR73.halo),
                 difTag:escala(spriteTag(cor, rpx, 7), spriteTagAntes73(cor, rpx, 7), SENSOR73.tag)};
  }
  out.prevSkins = alfa(spriteAro(TIME71[0].base, 40, 'b')).mx;           // (a prévia dos times em SKINS usa o mesmo halo)
  out.SENSOR73 = SENSOR73;
  return out;
})()"""

# o que o quadro da partida desenha de verdade: as imagens do halo e o traço do contorno (com a força em que saem)
QUADRO = r"""(() => {
  __T.comeca('futebol', 3, 0); __T.limpa();
  const pr = __T.time(0), br = __T.time(1);
  __T.poe(P, CX - U(9), CY); __T.poe(pr.filter(q => q !== P)[0], CX - U(12), CY + U(12)); __T.poe(br[0], CX + U(9), CY); __T.poe(br[1], CX + U(4), CY - U(13));
  __T.bola(CX, CY + U(1)); try { rqVsFecha(); } catch (_) {}
  const C = CanvasRenderingContext2D.prototype, di = C.drawImage, st = C.stroke, imgs = [], tracos = [];
  C.drawImage = function(img){ if (this === ctx && img && img.width && img.getContext) imgs.push({img, a:this.globalAlpha}); return di.apply(this, arguments); };   // (só o que vai para a tela: não a montagem das imagens prontas)
  C.stroke = function(){ const s = String(this.strokeStyle).replace(/\s/g, ''); if (this === ctx && s === 'rgba(12,10,22,0.9)') tracos.push({a:+this.globalAlpha.toFixed(3), tracejado:this.getLineDash().length > 0}); return st.apply(this, arguments); };
  try { desenhaAros(ctx); } finally { C.drawImage = di; C.stroke = st; }
  const mx = c => { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let m = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > m) m = d[i]; return m; };
  const halos = imgs.filter(o => o.img.dc == null), pontas = imgs.filter(o => o.img.dc != null);
  const forca = l => l.length ? Math.max(...l.map(o => Math.round(mx(o.img)*o.a))) : -1;
  return {halos:halos.length, pontas:pontas.length, maiorHalo:forca(halos), maiorPonta:forca(pontas), jogadores:RQ.jog.length, tracos};
})()"""

# a mesma partida nas duas versões (v71.1 e v73): o caminho de todo mundo, tick a tick, num número só
ROTEIRO = r"""(() => {
  let s = 12345; Math.random = () => { s = (s*16807) % 2147483647; return (s - 1)/2147483646; };
  ARB_PARADO = function(){ return true; };
  let h = 0; const mix = v => { const x = Math.round(v*1e6); h = (Math.imul(h ^ x, 2654435761) + 0x9e3779b9) | 0; };
  const reg = () => { mix(P.x); mix(P.y); mix(P.vx); mix(P.vy); mix(B.x); mix(B.y); mix(B.vx); mix(B.vy); mix(B.w); };
  const dirs = [[1,0],[1,.4],[.2,1],[-1,.3],[0,-1],[1,-1],[1,0],[0,0]];
  trEscolhe('livre'); P.x = START_P.x; P.y = START_P.y; P.vx = P.vy = 0; B.x = CX; B.y = CY; B.vx = B.vy = 0; B.w = 0; resetBotoes();
  for (let i = 0; i < 900; i++){
    const d = dirs[Math.floor(i/40) % dirs.length];
    if (i % 53 === 7) BOTAO.kickL = true; if (i % 97 === 30) BOTAO.powerL = true; if (i % 150 === 149) keys.KeyG = !keys.KeyG;
    guardaAnterior(); physicsStep(STEP, d[0], d[1]); reg();
  }
  keys.KeyG = false; const livre = h; h = 0;
  __T.comeca('futebol', 2, 0); __T.limpa();
  const bots = RQ.jog.filter(q => q !== P);
  for (let i = 0; i < 900; i++){
    const d = dirs[Math.floor(i/35) % dirs.length];
    P.mx = d[0]; P.my = d[1]; if (i % 61 === 9) P.chutar = FORCA_KICK; if (i % 113 === 40) P.chutar = FORCA_POWER;
    bots.forEach((q, k) => { const e = dirs[(Math.floor(i/50) + k*3) % dirs.length]; q.mx = e[0]; q.my = e[1]; if ((i + k*17) % 89 === 0) q.chutar = FORCA_KICK; });
    guardaAnterior(); physicsStep(STEP, 0, 0); reg(); for (const q of bots){ mix(q.x); mix(q.y); }
    if (RQ.estado === 'gol') __T.limpa();
  }
  return {livre, partida:h};
})()"""

CENA = r"""(() => { __T.comeca('futebol', 3, 0); __T.limpa(); const pr = __T.time(0), br = __T.time(1);
  __T.poe(P, CX - U(9), CY); __T.poe(pr.filter(q => q !== P)[0], CX - U(12), CY + U(12)); __T.poe(br[0], CX + U(9), CY); __T.poe(br[1], CX + U(4), CY - U(13));
  __T.bola(CX, CY + U(1)); try { rqVsFecha(); } catch (_) {} return true; })()"""


def bloco(p):
    t = pathlib.Path(p).read_text(encoding='utf-8')
    return t[t.index('/*PHYS_START*/'):t.index('/*PHYS_END*/')]


async def principal():
    P = Placar('v73 · o TESTE saiu e o sensor ficou mais transparente')
    ref = os.environ.get('RACHA_REF')
    async with async_playwright() as pw:
        # ---------------------------------------------------------------- o TESTE saiu
        html = (RAIZ / 'app' / 'public' / 'game' / 'racha.html').read_text(encoding='utf-8')
        bl = bloco(RAIZ / 'app' / 'public' / 'game' / 'racha.html')
        P.confere('tstVelJog' not in bl and 'tstTetoBola' not in bl and 'tstAtivo' not in html and 'v72.css' not in html,
                  'o TESTE saiu do jogo: nem os ganchos no bloco de física, nem o código, nem o v72.css')
        P.confere(not (RAIZ / 'tools' / 'v72').exists() and not (RAIZ / 'app' / 'public' / 'game' / 'v72.css').exists(), 'os arquivos do TESTE saíram do projeto (tools/v72 e v72.css)')
        if ref and pathlib.Path(ref).exists():
            P.confere(bloco(PAGINA) == bloco(ref), 'o bloco de física é o mesmo da v71.1, byte a byte')
        b, pg, erros = await abre(pw, 1280, 720, armazenamento={'racha-teste-modo-v72': 'classico'})
        r = await rt(pg, """(() => { abreTela('treino'); const g = LB.trGrade, cs = [...g.querySelectorAll('.tr-card')];
          return {n:cs.length, tst:!!g.querySelector('.tst-card'), outros:cs.filter(c => c.dataset.tr).map(c => c.dataset.tr),
            codigo:[typeof TST, typeof tstAtivo, typeof tstComeca, !!TR_INFO.teste, !!TR_X.teste], css:!!document.querySelector('link[href*="v72"]'),
            guardado:localStorage.getItem('racha-teste-modo-v72')}; })()""")
        # v88: os 8 de sempre continuam primeiro, na mesma ordem; depois entram POSICIONAMENTO, DEFESA, GOLEIRO e o TREINO COM BOTS
        P.confere(r['n'] == 12 and not r['tst'] and r['outros'] == ['livre', 'cruz', 'dom', 'passe', 'tabela', 'final', 'cond', 'posic', 'defesa', 'goleiro'],
                  'TREINAMENTO: os 8 cartões de sempre, na mesma ordem, sem o TESTE (v88: + posicionamento, defesa, goleiro e com bots)', r)
        P.confere(r['codigo'] == ['undefined', 'undefined', 'undefined', False, False] and not r['css'], 'no jogo aberto não sobra nada do TESTE (código e estilo)', r)
        P.confere(r['guardado'] is None, 'a escolha que o TESTE guardava (IGUAL/CLÁSSICO) some do aparelho', r)
        await pg.screenshot(path=str(SAIDA / 'v73_treino_cartoes.png'))
        r = await rt(pg, """(() => { fechaTela(); abrirEdicao(); fecharEdicao(false);
          return [...document.querySelectorAll('.ajx-tecla')].filter(l => getComputedStyle(l).display !== 'none').map(l => l.querySelector('b').textContent); })()""")
        P.confere(not any('DRIBLE' in t or 'CORRIDA' in t or 'TESTE' in t for t in r), 'Ajustes › Teclado: a tecla do DRIBLE volta a ficar escondida fora da GINGA (sem a CORRIDA do TESTE)', r)

        # ---------------------------------------------------------------- o sensor mais transparente
        s = await rt(pg, SPRITES)
        print('    imagens:', json.dumps({k: (v if not isinstance(v, dict) else {kk: (vv['mx'] if isinstance(vv, dict) else vv) for kk, vv in v.items()}) for k, v in s.items()}, ensure_ascii=False))
        ok_halo = ok_forma = ok_tag = ok_carga = True
        for nome in ('preto', 'branco'):
            x = s[nome]
            ok_halo &= x['haloAntes']['mx'] == 255 and abs(x['halo']['mx'] - round(255*.45)) <= 2
            ok_forma &= x['halo']['w'] == x['haloAntes']['w'] and x['difHalo'] <= 1 and x['difTag'] <= 1
            ok_tag &= abs(x['tag']['mx'] - round(x['tagAntes']['mx']*.7)) <= 2 and x['dc'][0] == x['dc'][1]
            ok_carga &= x['carga'] == x['cargaAntes']
        P.confere(ok_halo, 'o halo (o "sensor") sai com 45% da força nos dois times (antes: 100%)', s)
        P.confere(ok_forma, 'o mesmo desenho e o mesmo tamanho, pixel a pixel (só a força muda): a borda de fora continua no alcance do chute', s)
        P.confere(ok_tag, 'a ponta (para onde cada um está virado) com 70%, no mesmo lugar', s)
        P.confere(ok_carga, 'a carga do chute armado (o tracejado que gira) continua igual', s)
        P.confere(abs(s['prevSkins'] - round(255*.45)) <= 2, 'a prévia dos times em SKINS mostra o mesmo halo transparente', s['prevSkins'])
        q = await rt(pg, QUADRO)
        tr = q['tracos']
        P.confere(q['halos'] == q['jogadores'] and 0 < q['maiorHalo'] <= round(255*.45) + 2 and 0 < q['maiorPonta'] <= round(255*.7) + 2,
                  'no quadro da partida (3v3), o halo de todo mundo sai com 45% e as pontas com 70% (nenhum acima)', q)
        P.confere(len(tr) == q['jogadores'] and all(abs(t['a'] - .4) < .01 for t in tr) and sum(t['tracejado'] for t in tr) == 3,
                  'o contorno do time sai com 40% (0,9 × 0,4 = 0,36) e continua cheio no Preto e tracejado no Branco', tr)
        await pg.wait_for_timeout(400)
        await rt(pg, CENA); await pg.wait_for_timeout(500)
        await pg.screenshot(path=str(SAIDA / 'v73_partida.png'))
        await rt(pg, "BOTAO.livre = true; BOTAO.estado = 3; true"); await pg.wait_for_timeout(400)
        await pg.screenshot(path=str(SAIDA / 'v73_armado.png'))
        await rt(pg, "BOTAO.livre = false; BOTAO.estado = 1; rqSai(); trEscolhe('livre'); P.x = CX - U(10); P.y = CY; B.x = CX + U(4); B.y = CY; true"); await pg.wait_for_timeout(500)
        await pg.screenshot(path=str(SAIDA / 'v73_treino.png'))

        # ---------------------------------------------------------------- a física: o mesmo caminho da v71.1
        if ref and pathlib.Path(ref).exists():
            novo = await rt(pg, ROTEIRO)
            b2, pg2, e2 = await abre(pw, 1280, 720, pagina=pathlib.Path(ref))
            antigo = await rt(pg2, ROTEIRO)
            await b2.close()
            P.confere(novo == antigo, 'o mesmo roteiro (treino livre e partida contra os bots, 900 passos cada) dá o mesmo caminho na v71.1 e na v73', {'v73': novo, 'ref': antigo})
        else:
            print('  (sem RACHA_REF: a comparação com a v71.1 fica de fora)')
        rede = [e for e in erros if 'Failed to load resource' in e]
        P.confere(not [e for e in erros if e not in rede], 'nenhum erro de JavaScript (computador)', [e for e in erros if e not in rede][:3])
        await b.close()

        # ---------------------------------------------------------------- no celular deitado
        b, pg, erros = await abre(pw, 844, 390, dsf=3)
        await rt(pg, CENA); await pg.wait_for_timeout(600)
        await pg.screenshot(path=str(SAIDA / 'v73_partida_844x390.png'))
        q = await rt(pg, QUADRO)
        P.confere(q['halos'] == q['jogadores'] and 0 < q['maiorHalo'] <= round(255*.45) + 2 and len(q['tracos']) == q['jogadores'] and all(abs(t['a'] - .4) < .01 for t in q['tracos']),
                  '844x390: o halo transparente e o contorno leve também no celular', q)
        rede = [e for e in erros if 'Failed to load resource' in e]
        P.confere(not [e for e in erros if e not in rede], '844x390: nenhum erro de JavaScript', [e for e in erros if e not in rede][:3])
        await b.close()
    return P.fim()


roda(principal())
