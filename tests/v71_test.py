"""v71 · PRETO × BRANCO e o LOBBY NOVO.

Confere no jogo de verdade (a cópia de teste do build):
  · os times são o TIME PRETO e o TIME BRANCO em todo lugar: as cores (rqCor, skinDoTime, a sala), os nomes nas telas e no
    menu do árbitro, o placar (o número legível em cima de cada cor) e a tela do fim;
    v80: os times viraram o TIME A (laranja #FF6A00) e o TIME B (roxo #7A3FC4) e a padrão virou a Listras metade laranja e
    metade roxa (toda laranja no A, toda roxa no B): as verificações de cor e de nome abaixo seguem a v80 (o resto é o mesmo);
  · a tampinha PADRÃO é metade preta e metade branca; na partida ela vira a do time (toda preta no Preto, toda branca no
    Branco) — a sua, a dos bots, a de quem está na sala online e a do cartão da sala; outra tampinha (personalizada ou
    modelo pronto) continua como é; quem estava com a amarela (a padrão até a v70.2) passa para a nova uma vez;
  · v77: as partes que mudaram com o lobby e o perfil da imagem enviada (o EVENTOS na coluna da direita, o MODO com o tamanho
    grande, os cabeçalhos sem as abas de outras telas e o perfil em VISÃO GERAL · ESTATÍSTICAS · CONQUISTAS · PARTIDAS) seguem a v77.
  · o lobby novo: os botões quadrados nos lugares (LOJA, TAMPINHA, CLUBE e TREINO à esquerda; SALAS, AMIGOS e RANKING à
    direita), a LIGA no topo, o MODO colado no JOGAR, o que saiu da tela não entra no Tab; cada botão abre o destino certo;
    em cada tamanho nada sai da tela e nada se cobre; os toques têm 44 px fora do celular deitado (lá, como na v69/v70.1,
    tudo cabe: os quadrados e o JOGAR passam de 44 px);
  · o JOGAR (a folha): cabe sem rolar no computador e no celular deitado, na CASUAL e na LIGA; o MODO tem o desenho.
    v79: a CASUAL saiu (o JOGAR é só a ranqueada, no Estádio): o MODO diz RANQUEADA · ESTÁDIO, a LIGA (a sua patente) abre
    as PATENTES e o JOGAR abre a BUSCA da partida; a folha é conferida só na ranqueada.
  · v71.1 · as telas de dentro no estilo do lobby: nenhum azul-marinho sobrando nas telas, janelas, Ajustes, pausa e fim
    (fora as cores de dado: a bolinha de cada rival e o desenho de cada exercício); o cabeçalho, as abas e o VOLTAR com a
    cara nova; o PERFIL em partes também no computador (era uma página de 6 telas de altura); a tampinha padrão com o nome
    PADRÃO; a cor da raridade nas peças da loja; os desenhos da pausa e das abas dos Ajustes; o JOGAR DE NOVO amarelo; as
    escolhas da sala sem o nome cortado; no celular deitado nenhuma tela encolhe abaixo de 0,72 para caber.
Isto não prova se o novo visual agrada nem a leitura em cada celular de verdade: é a inspeção do que abre e responde.
Rodar: python3 tests/v71_test.py
"""
import json
from comum import abre, rt, roda, Placar, async_playwright

# o que a partida desenha: troca o drawPlayer por um espião durante um quadro do render
DESENHO = """(() => {
  const vistos = [], aJ = botaoJogo, aP = drawPlayer; let dentro = 0;
  botaoJogo = function(g, x, y, r, sk){ if (!dentro) vistos.push({x:Math.round(x), y:Math.round(y), id:sk && sk.id}); return aJ.apply(this, arguments); };
  drawPlayer = function(g, x, y, r, sk){ vistos.push({x:Math.round(x), y:Math.round(y), id:sk && sk.id}); dentro++; try { return aP.apply(this, arguments); } finally { dentro--; } };
  try { render(0); } finally { botaoJogo = aJ; drawPlayer = aP; }
  const a = VIS.a == null ? 1 : VIS.a;
  const quem = RQ.jog.map(q => ({eu:q === P, time:q.time, x:Math.round(q === P ? VIS.px : q.ax + (q.x - q.ax)*a + (q.ex || 0)), y:Math.round(q === P ? VIS.py : q.ay + (q.y - q.ay)*a + (q.ey || 0))}));
  const b1 = RQ.jog.find(q => q.time === 1);
  return {vistos, quem, t0:TP_TIME_COD[0], t1:TP_TIME_COD[1], replay:[rpSkinDe(P, true) === TP_TIME_COD[0], rpSkinDe(b1, false) === TP_TIME_COD[1]]};
})()"""
LUGARES = [('loja', '#rx .v71-tile[data-loja]', "tela", 'loja'), ('tampinha', '#rx .v71-tile[data-rx="skins"]', "tela", 'skins'),
           ('clube', '#rx .v71-tile[data-rx="clube"]', "tela", 'clube'), ('treino', '#rx .v71-tile[data-rx="treino"]', "tela", 'treino'),
           ('salas', '#rx .v71-tile[data-rx="salas"]', "tela", 'amigos'), ('amigos', '#rx .v71-tile[data-rx="amigos"]', "tela", 'comunidade'),
           ('ranking', '#rx .v71-tile[data-rx="ranking"]', "tela", 'ranking'), ('liga', '.lb-topo .v71-liga', "pat", True),
           ('modo', '#lb-modo', "rq", 'ranked'), ('desafios', '#lb-missoes', "pop", True), ('chat', '#lb-chat', "tela", 'chat'),
           ('perfil', '#lb-eu', "tela", 'perfil'), ('moedas', '.lb-topo .hm-grana', "tela", 'loja'), ('ajustes', '#lb-ajustes', "aj", True),
           ('tampinha do meio', '#lb-emblema', "tela", 'skins'), ('jogar', '#lb-jogar', "busca", True)]
ESTADO = "(() => ({tela:lobby.tela, rq:RQP.raiz.hidden ? null : JG.aba, pop:!LB.pop.hidden, aj:!LB.aj.hidden, partida:RQ.on && !lobby.aberto, pat:!!(V79P.el && !V79P.el.hidden), busca:!!RachaRanqueada79.busca() || (RQ.on && !lobby.aberto)}))()"
FECHA = """(() => { v79PatentesFecha(); v79BuscaCancela(); if (!LB.pop.hidden) fechaPop(); if (!LB.aj.hidden) LB.aj.hidden = true; if (!RQP.raiz.hidden) fechaRanqueada();
  if (lobby.tela){ ED.saindo = true; fechaTela(); ED.saindo = false; } if (!lobby.aberto){ if (RQ.on) rqSai(); abrirLobby(); } return true; })()"""
# v71.1 · as telas (as mesmas do celular_test, sem as da partida) e a varredura do azul-marinho que sobrou
TELAS71 = [('perfil', "abreTela('perfil'); true"), ('ranking', "abreTela('ranking'); true"), ('replays', "abreTela('replays'); true"), ('loja', "abreTela('loja'); true"),
  ('treino', "abreTela('treino'); true"), ('tampinha', "abreTela('skins'); true"), ('comunidade', "abreTela('comunidade'); true"), ('salas', "abreTela('amigos'); true"),
  ('criar sala', "abreTela('amigos'); sxNovaSala(); true"), ('clube', "abreTela('clube'); true"), ('copa', "abreTela('copa'); true"), ('chat', "abreTela('chat'); true"),
  ('sala', "abreTela('amigos'); slocCria({n:2, map:4, jogo:'futebol', tempo:0, name:'T'}); v70SlMontaComBots(); true"), ('desafios', "document.getElementById('lb-missoes').click(); true"),
  ('ajustes', "ajxAbre('visual'); true"), ('jogar', "abreJogar('casual'); true")]
LIMPA71 = """(() => { try { if (!LB.pop.hidden) fechaPop(); } catch (_) {} try { ajxFecha(); } catch (_) {} try { if (!RQP.raiz.hidden) fechaRanqueada(); } catch (_) {}
  try { if (NET49.room) net49Send({type:'leave'}); } catch (_) {} try { if (lobby.tela){ ED.saindo = true; fechaTela(); ED.saindo = false; } } catch (_) {}
  if (!lobby.aberto){ try { if (RQ.on) rqSai(); } catch (_) {} abrirLobby(); } return true; })()"""
MARINHO = r"""(() => {
  const hue = (r, g, b) => { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn)/2, d = mx - mn; if (!d) return null;
    const s = l > .5 ? d/(2 - mx - mn) : d/(mx + mn); let h = mx === r ? (g - b)/d + (g < b ? 6 : 0) : mx === g ? (b - r)/d + 2 : (r - g)/d + 4; return {h:h*60, s}; };
  const nav = t => [...String(t).matchAll(/rgba?\((\d+), (\d+), (\d+)(?:, ([\d.]+))?\)/g)].filter(m => !(m[4] !== undefined && +m[4] < .15)).filter(m => { const c = hue(+m[1], +m[2], +m[3]); return c && c.h >= 222 && c.h <= 236 && c.s >= .2; }).map(m => m[0]);
  const raizes = [...document.querySelectorAll('#lb-camada > :not([hidden]), #pop-ajustes:not([hidden]), #pausa:not([hidden]), #fim:not([hidden])')];
  const L = new Set();
  for (const R of raizes) for (const e of [R, ...R.querySelectorAll('*')]){
    if (e.closest('svg') || e.matches('.lb-bola, .tr-ic, .pf-st > i')) continue;   // (as cores de dado: a bolinha de cada rival, o desenho de cada exercício e de cada número)
    const r = e.getBoundingClientRect(); if (!r.width || !r.height) continue;
    const cs = getComputedStyle(e); if (cs.visibility === 'hidden') continue;
    const c = [...nav(cs.backgroundColor), ...nav(cs.backgroundImage), ...(parseFloat(cs.borderTopWidth) ? nav(cs.borderTopColor) : []), ...nav(cs.color)];
    if (c.length) L.add((e.id ? '#' + e.id : e.tagName.toLowerCase()) + '.' + String(e.className).split(' ')[0] + ' ' + c[0]);
  }
  return [...L].slice(0, 6);
})()"""

# as caixas de tudo que se toca no lobby (deitado): visível, dentro da tela, sem cobrir outra, e o tamanho de verdade
CAIXAS = """(() => {
  const sel = ['#lb-eu', '.lb-topo .v71-liga', '.lb-topo .hm-grana', '#lb-chat', '#lb-ajustes', '#rx .v71-tile', '#lb-missoes', '#lb-modo', '#lb-jogar'];
  const L = [];
  for (const s of sel) for (const e of document.querySelectorAll(s)){
    const cs = getComputedStyle(e); if (cs.display === 'none' || e.closest('[hidden]')) continue;
    const r = e.getBoundingClientRect(); L.push({n:(e.getAttribute('aria-label') || e.id || s).slice(0, 18), l:r.left, t:r.top, r:r.right, b:r.bottom, w:r.width, h:r.height});
  }
  const fora = L.filter(c => c.l < -1 || c.t < -1 || c.r > innerWidth + 1 || c.b > innerHeight + 1).map(c => c.n);
  const cobre = [];
  for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++){ const a = L[i], b = L[j];
    if (a.l < b.r - 1 && b.l < a.r - 1 && a.t < b.b - 1 && b.t < a.b - 1) cobre.push(a.n + ' × ' + b.n); }
  const pequenos = L.filter(c => c.w < 43.5 || c.h < 43.5).map(c => c.n + ' ' + Math.round(c.w) + 'x' + Math.round(c.h));
  const tiles = L.filter(c => /^(Loja|Tampinha|Clube|Treino|Salas|Amigos|Ranking)$/.test(c.n));
  return {n:L.length, fora, cobre, pequenos, menorTile:Math.round(Math.min(...tiles.map(c => Math.min(c.w, c.h)))),
    jogar:Math.round(document.getElementById('lb-jogar').getBoundingClientRect().height), cabe:LB.raiz.classList.contains('v70-cabe')};
})()"""


async def principal():
    P = Placar('v71 · preto × branco e o lobby novo')
    async with async_playwright() as pw:
        b, pg, erros = await abre(pw, 1280, 720)

        print('\n1) os dois times: o TIME PRETO e o TIME BRANCO')
        r = await rt(pg, """({c0:rqCor(0), c1:rqCor(1), s0:skinDoTime(0).cor, s1:skinDoTime(1).cor, sala:SALA_COR.map(s => s.nome + ' ' + s.cor),
          lb:LB.raiz.classList.contains('v71')})""")
        P.confere(r['c0']['base'] == '#ff6a00' and r['c1']['base'] == '#7a3fc4' and r['s0'] == '#ff6a00' and r['s1'] == '#7a3fc4', '(v80) as cores dos times: laranja (#FF6A00) e roxo (#7A3FC4), no halo, no placar e na torcida', r)
        P.confere(r['c0']['txt'] == '#ffffff' and r['c1']['txt'] == '#ffffff', '(v80) a letra em cima de cada cor dá para ler (branca no laranja e no roxo, com sombra)', [r['c0']['txt'], r['c1']['txt']])
        P.confere(r['sala'] == ['Time A #ff6a00', 'Time B #7a3fc4'], '(v80) a sala: Time A e Time B', r['sala'])
        txt = await pg.evaluate("document.documentElement.innerHTML")
        velhos = [p for p in ('Equipe Azul', 'EQUIPE AZUL', 'Time Vermelho', 'TIME VERMELHO') if p in txt]
        P.confere(not velhos, 'nenhum "Time Vermelho" ou "Equipe Azul" na página', velhos)

        print('\n2) a tampinha padrão: metade/metade (v80: laranja e roxo, na Listras); na partida, a do time')
        r = await rt(pg, """(() => { const D = tpLe(TP_PADRAO_COD), A = tpLe(TP_TIME_COD[0]), B = tpLe(TP_TIME_COD[1]);
          return {minha:tpMinha() === TP_PADRAO_COD, perfil:perfil.skin === TP_PADRAO_COD, p:D.p, pc:D.pc.slice(0, 2), a:[A.p, A.pc[0]], b:[B.p, B.pc[0]], icone:[D.i, A.i, B.i]}; })()""")
        lar = lambda c: c == '#ff6a00'                                      # (o código guarda a cor arredondada: o roxo vira #7a3ec5)
        rox = lambda c: c in ('#7a3fc4', '#7a3ec5')
        P.confere(r['minha'] and r['perfil'] and r['p'] == 'ls' and lar(r['pc'][0]) and rox(r['pc'][1]), '(v80) a padrão (a de quem não escolheu outra) é a Listras: laranja e roxo', r)
        P.confere(r['a'][0] == 'ls' and lar(r['a'][1]) and r['b'][0] == 'ls' and rox(r['b'][1]) and r['icone'] == ['--', '--', '--'], '(v80) as duas do time: toda laranja e toda roxa, sem ícone', r)
        for n in (1, 3):
            await rt(pg, "__T.comeca('futebol', %d, 0); true" % n)
            d = await rt(pg, DESENHO)
            ok = True; det = []
            for q in d['quem']:
                perto = [v for v in d['vistos'] if abs(v['x'] - q['x']) <= 2 and abs(v['y'] - q['y']) <= 2]
                esperado = d['t0'] if q['time'] == 0 else d['t1']
                if not perto or perto[0]['id'] != esperado: ok = False; det.append(q)
            P.confere(ok and len(d['vistos']) == 2*n, '%dv%d contra os bots: você e o seu time na do time da esquerda, o adversário na do outro (o que o quadro desenha)' % (n, n), det or len(d['vistos']))
            P.confere(all(d['replay']), '%dv%d: o replay guarda a tampinha já na cor do time (a sua e a do bot)' % (n, n), d['replay'])
            await rt(pg, "rqSai(); true")
        r = await rt(pg, """(() => { const outra = tpCodigo(TP_PRE[1].d), sk = tpSkin(outra);
          return {outra:outra !== TP_PADRAO_COD, fica:[tpNoTimeSk(sk, 0).id === outra, tpNoTimeSk(sk, 1).id === outra], codigo:[tpNoTime(outra, 0) === outra, tpNoTime(outra, 1) === outra]}; })()""")
        P.confere(r['outra'] and all(r['fica']) and all(r['codigo']), 'com outra tampinha (um modelo pronto) nada muda: a mesma nos dois times', r)
        r = await rt(pg, """(() => { const c = tpCodigo(TP_PRE[1].d);
          return {padrao:[net49Skin({netSkin:TP_PADRAO_COD, time:0}).id === TP_TIME_COD[0], net49Skin({netSkin:TP_PADRAO_COD, time:1}).id === TP_TIME_COD[1]],
            outra:net49Skin({netSkin:c, time:1}).id === c, bot:[net49Skin({time:0}).id === TP_TIME_COD[0], net49Skin({time:1}).id === TP_TIME_COD[1]],
            antiga:net49Skin({netSkin:TP_PADRAO_ANTIGO, time:1}).id === TP_PADRAO_ANTIGO, classica:tpNoTimeSk(tpSkin(TP_PADRAO_ANTIGO), 0).id === TP_PADRAO_ANTIGO}; })()""")
        P.confere(all(r['padrao']) and r['outra'] and all(r['bot']), 'na sala online: quem usa a padrão fica na cor do time; outra tampinha fica como é; o bot da vaga na cor do time', r)
        P.confere(r['antiga'] and r['classica'], 'a Clássica amarela (a padrão até a v70.2) agora é um modelo como os outros: escolhida, fica amarela', r)
        await rt(pg, "(() => { abrirLobby(); abreTela('amigos'); slocCria({n:2, map:4, jogo:'futebol', tempo:0, name:'Teste'}); return true; })()"); await pg.wait_for_timeout(500)
        await rt(pg, "(() => { v70SlMontaComBots(); return true; })()"); await pg.wait_for_timeout(500)
        r = await rt(pg, """(() => { SL.av.clear(); slRender();                 // (só o que a sala desenha agora)
          const R = NET49.room, m = R.members.filter(x => x.slot >= 0).map(x => ({slot:x.slot, t:Math.floor(x.slot/R.n), skin:x.skin === TP_PADRAO_COD || x.skin === tpMinha()}));
          const k = [...SL.av.keys()];
          return {m, preto:k.some(x => x.indexOf(TP_TIME_COD[0] + '|') === 0), branco:k.some(x => x.indexOf(TP_TIME_COD[1] + '|') === 0), metade:k.some(x => x.indexOf(TP_PADRAO_COD + '|') === 0),
            cols:[...document.querySelectorAll('#tela-sala .sl-fita')].map(e => e.textContent.trim()).filter(Boolean)}; })()""")
        P.confere(r['preto'] and r['branco'] and not r['metade'], 'a sala neste aparelho: os cartões de quem está num time mostram a tampinha do time (v80: laranja e roxa), nunca a metade', r)
        await pg.focus('#tela-sala .sl-azul .sl-vaga') if await pg.evaluate("!!document.querySelector('#tela-sala .sl-azul .sl-vaga')") else None
        h = await rt(pg, "(() => { const v = document.querySelector('#tela-sala .sl-azul .sl-vaga'); if (v) v.click(); const h = document.querySelector('#lb-pop h2'); return h ? h.textContent : (document.querySelector('#tela-sala .sl-azul') || {}).textContent; })()")
        P.confere('TIME B' in (h or '').upper(), '(v80) o árbitro: "QUEM VAI PARA O TIME B?" (ou a coluna do Time B)', h)
        await rt(pg, "(() => { if (!LB.pop.hidden) fechaPop(); net49Send({type:'leave'}); fechaTela(); abrirLobby(); return true; })()")

        print('\n3) o placar, a tela do fim e a saída de bola')
        await rt(pg, "(() => { __T.comeca('futebol', 2, 4); RQ.placar = [3, 1]; RQ.estado = 'jogo'; rqFim(); if (!fimAberto()) rqMostraFim(); return true; })()")   # (com o quadro parado do teste, a tela do fim não vem sozinha)
        await pg.wait_for_timeout(700)
        r = await rt(pg, """(() => { const v = fimEl('fim-v'), a = fimEl('fim-a'); const cs = e => e ? [getComputedStyle(e).backgroundColor, getComputedStyle(e).color] : null;
          return {v:cs(v), a:cs(a), aberto:fimAberto()}; })()""")
        P.confere(r['v'] and r['v'][0] == 'rgb(255, 106, 0)' and r['v'][1] == 'rgb(255, 255, 255)' and r['a'][0] == 'rgb(122, 63, 196)' and r['a'][1] == 'rgb(255, 255, 255)',
                  '(v80) a tela do fim: o número branco em cima do laranja (Time A) e em cima do roxo (Time B)', r)
        r = await rt(pg, """(() => { fechaFim(); rqSai(); __T.comeca('futebol', 2, 0); RQ.estado = 'saida';
          const cores = []; const antes = CanvasRenderingContext2D.prototype.fillRect;
          const g = document.createElement('canvas').getContext('2d'); g.fillRect = function(){ cores.push(String(this.fillStyle)); return antes.apply(this, arguments); };
          RQ.saidaTime = 1; desenhaSaidaArco(g); const branco = cores.slice(); cores.length = 0; RQ.saidaTime = 0; desenhaSaidaArco(g);
          RQ.estado = 'jogo'; return {branco, preto:cores.slice()}; })()""")
        P.confere('#7a3fc4' in r['branco'] and any('rgba(10' in c or 'rgba(10, 12, 14' in c for c in r['branco']) and '#ff6a00' in r['preto'], '(v80) a saída de bola na cor de quem bate (roxo e laranja), com o contorno', r)
        await rt(pg, "rqSai(); abrirLobby(); true")

        print('\n4) quem estava com a amarela (a padrão até a v70.2) passa para a nova uma vez')
        await b.close()
        b, pg, erros2 = await abre(pw, 1280, 720, armazenamento={'racha-tampa-v1': json.dumps({'itens': [], 'salvas': [], 'equipada': 'T.AAAn1iQ-sSH5mW2TJQA'})})
        r = await rt(pg, "({eq:TP.equipada, minha:tpMinha() === TP_PADRAO_COD, perfil:perfil.skin === TP_PADRAO_COD, marca:localStorage.getItem('racha-v71-padrao'), antiga:TP_PADRAO_ANTIGO})")
        P.confere(r['antiga'] == 'T.AAAn1iQ-sSH5mW2TJQA' and r['eq'] == '' and r['minha'] and r['perfil'] and r['marca'] == '1', 'a amarela salva como "equipada" vira a padrão nova (e fica marcado)', r)
        st = await rt(pg, "(() => { TP.equipada = TP_PADRAO_ANTIGO; tpSalva(); return {tampa:localStorage.getItem('racha-tampa-v1'), marca:localStorage.getItem('racha-v71-padrao')}; })()")
        await b.close()
        # (v72: o jogo aberto de novo com o que ficou gravado — num navegador novo com esse armazenamento, em vez do reload: num
        #  Chromium recém-aberto o localStorage às vezes ainda não estava no disco quando o reload vinha, e a conferência falhava à toa)
        b, pg, erros3 = await abre(pw, 1280, 720, armazenamento={k: v for k, v in {'racha-tampa-v1': st['tampa'], 'racha-v71-padrao': st['marca']}.items() if v is not None})
        r = await rt(pg, "({eq:TP.equipada === TP_PADRAO_ANTIGO, marca:localStorage.getItem('racha-v71-padrao')})")
        P.confere(st['marca'] == '1' and r['eq'] and r['marca'] == '1', 'depois disso vale a escolha: quem equipar a Clássica amarela de novo continua com ela (a troca não roda de novo)', [st, r])
        P.confere(not [e for e in erros + erros2 + erros3 if 'Failed to load' not in e], 'nenhum erro de JavaScript (times)', (erros + erros2 + erros3)[:3])
        await b.close()

        print('\n5) o lobby novo: os lugares e os destinos')
        b, pg, erros = await abre(pw, 1280, 720)
        r = await rt(pg, """(() => { const nomes = s => [...document.querySelectorAll(s)].map(b => b.querySelector(':scope > b').textContent);
          const fora = ['[data-rx="comunidade"]', '.rx-bt[data-rx="chat"]', '.rx-amg'].map(s => { const e = document.querySelector('#lb ' + s); return e && getComputedStyle(e).display === 'none' && e.tabIndex === -1; });
          const pa = document.querySelector('#lb [data-rx="passe"]'), passe = !!pa && !!pa.closest('.lb-topo') && getComputedStyle(pa).display !== 'none' && pa.tabIndex === 0;   // (v88: o PASSE voltou, no topo, para o Passe RACHA)
          const liga = document.querySelector('.lb-topo .v71-liga');
          return {esq:nomes('#rx .v71-esq > .rx-bt'), dir:nomes('#rx .v71-dir > .rx-bt'), fora, passe, liga:!!liga && liga.previousElementSibling === LB.eu, elo:document.getElementById('lb-rq-elo').textContent === rqElo(CONTA.rq.pts).nome,
            nv:document.getElementById('v71-nv').textContent === String(nivelInfo(CONTA.xp).n), pronto:getComputedStyle(document.querySelector('.rx-pronto')).display,
            rotulos:[...document.querySelectorAll('#rx .v71-tile')].every(b => (b.getAttribute('aria-label') || '').toUpperCase().indexOf(b.querySelector(':scope > b').textContent) >= 0)}; })()""")
        P.confere(r['esq'] == ['LOJA', 'TAMPINHA', 'CLUBE', 'TREINO'] and r['dir'] == ['SALAS', 'AMIGOS', 'RANKING', 'EVENTOS'], 'os botões quadrados: LOJA, TAMPINHA, CLUBE, TREINO à esquerda; SALAS, AMIGOS, RANKING e (v77) EVENTOS à direita', r)
        P.confere(all(r['fora']) and r['pronto'] == 'none', 'saíram da tela e do Tab: COMUNIDADE, o CHAT grande e o ícone repetido das SALAS (e o "Pronto, fulano!")', r['fora'])
        P.confere(r['passe'], 'v88: o PASSE (o botão de sempre, que estava escondido) voltou no topo, para o Passe RACHA, e entra no Tab', r['passe'])
        P.confere(r['liga'] and r['elo'] and r['nv'], 'a LIGA no topo, do lado do seu cartão (o elo certo); o nível no selo da tampinha', r)
        P.confere(r['rotulos'], 'o nome lido de cada botão contém a palavra escrita nele (TREINO, não "Treinamento")', r)
        r = await rt(pg, """(() => { CONTA.rq.n = 3; lbRender();
          const t = LB.modo.querySelector('.v71-modo-tx b').textContent, s = LB.modo.querySelector('.v77-modo-nm').textContent, ic = LB.modo.querySelector('.v71-modo-ic .v77-ic').dataset.ic, j = LB.jogar.getAttribute('aria-label');
          CONTA.rq.n = 2; lbRender();
          return {t, s, ic, j, volta:LB.modo.querySelector('.v71-modo-tx b').textContent + ' · ' + LB.modo.querySelector('.v77-modo-nm').textContent}; })()""")
        P.confere(r['t'] == '3 VS 3' and r['s'] == 'RANQUEADA · ESTÁDIO' and r['ic'] == 'campo' and '3 contra 3, no Estádio' in r['j'] and r['volta'] == '2 VS 2 · RANQUEADA · ESTÁDIO',
                  'o MODO mostra o que vai ser jogado (v79: o tamanho da ranqueada e RANQUEADA · ESTÁDIO) e o JOGAR diz o mesmo para o leitor de tela', r)
        for nome, sel, tipo, alvo in LUGARES:
            await rt(pg, FECHA); await pg.wait_for_timeout(420)
            await pg.click(sel); await pg.wait_for_timeout(500)
            e = await rt(pg, ESTADO)
            ok = (e['tela'] == alvo) if tipo == 'tela' else (e['rq'] == alvo) if tipo == 'rq' else bool(e[tipo])
            P.confere(ok, '%-16s → abre %s' % (nome, alvo if tipo in ('tela', 'rq') else tipo), e)
        await rt(pg, FECHA)
        P.confere(not [e for e in erros if 'Failed to load' not in e], 'nenhum erro de JavaScript (lobby)', erros[:3])
        await b.close()

        print('\n6) o lobby em cada tamanho e o JOGAR (a folha)')
        for (w, h, toque) in [(1280, 720, False), (1920, 1080, False), (1024, 768, True), (844, 390, True), (667, 375, True), (800, 336, True)]:
            b, pg, erros = await abre(pw, w, h, toque=toque)
            await pg.wait_for_timeout(300)
            c = await rt(pg, CAIXAS)
            pequeno_ok = (not c['pequenos']) if not c['cabe'] else (c['menorTile'] >= 44 and c['jogar'] >= 44)
            P.confere(c['n'] >= 15 and not c['fora'] and not c['cobre'] and pequeno_ok,
                      '%dx%d: %d botões do lobby dentro da tela, nenhum por cima do outro, %s' % (w, h, c['n'], 'quadrados e JOGAR ≥ 44 px (celular deitado)' if c['cabe'] else 'todos ≥ 44 px'), c)
            for aba in ('ranked',):                              # (v79: a CASUAL saiu; o JOGAR é só a ranqueada)
                f = await rt(pg, """(() => { abreJogar('%s'); const c = RQP.raiz.querySelector('.rq-caixa'), r = c.getBoundingClientRect(), bt = RQP.buscar.getBoundingClientRect();
                  return {cabe:r.top >= -1 && r.bottom <= innerHeight + 1 && bt.bottom <= innerHeight + 1, rola:c.scrollHeight > c.clientHeight + 2, z:c.dataset.v70z || null,
                    icones:[...RQP.modos.querySelectorAll('.rq-modo:not(.v702-fora) .v71-md-ic svg')].length, botao:Math.round(bt.height)}; })()""" % aba)
                await pg.wait_for_timeout(250)
                P.confere(f['cabe'] and not f['rola'] and f['botao'] >= 44 and (aba == 'ranked' or f['icones'] == 2), '%dx%d: JOGAR › %s cabe sem rolar, o JOGAR à vista%s' % (w, h, 'CASUAL' if aba == 'casual' else 'RANQUEADA', ' (encolheu %s)' % f['z'] if f['z'] else ''), f)
                await rt(pg, "fechaRanqueada(); true")
            P.confere(not [e for e in erros if 'Failed to load' not in e], '%dx%d: nenhum erro de JavaScript' % (w, h), erros[:3])
            await b.close()

        print('\n7) v71.1 · as telas de dentro no estilo do lobby')
        b, pg, erros = await abre(pw, 1280, 720, toque=False)
        r = await rt(pg, "({tema:!!document.querySelector('link[href=\"./v71-tema.css\"]'), sx:getComputedStyle(document.documentElement).getPropertyValue('--k').trim(), var:getComputedStyle(LB.raiz).getPropertyValue('--sx-azul').trim()})")
        P.confere(r['tema'] and r['var'] == '#23272d', 'o v71-tema.css (gerado no build) está na página e o tema das telas é o carvão (--sx-azul #23272d)', r)
        sobra = {}
        for nome, js in TELAS71:
            await rt(pg, LIMPA71); await pg.wait_for_timeout(200)
            await rt(pg, js); await pg.wait_for_timeout(450)
            m = await rt(pg, MARINHO)
            if m: sobra[nome] = m
        P.confere(not sobra, '%d telas e janelas sem azul-marinho (fundo, borda e letra)' % len(TELAS71), sobra)
        await rt(pg, LIMPA71)
        cabs = {}
        for nome, js in [('perfil', "abreTela('perfil'); true"), ('loja', "abreTela('loja'); true"), ('treino', "abreTela('treino'); true"), ('comunidade', "abreTela('comunidade'); true"), ('ranking', "abreTela('ranking'); true")]:
            await rt(pg, LIMPA71); await rt(pg, js); await pg.wait_for_timeout(300)
            cabs[nome] = await rt(pg, """(() => { const T = TELAS[lobby.tela].el, v = T.querySelector('.tl-voltar'), on = T.querySelector('.tl-aba.on, .tl-aba[aria-selected=true]'), cv = getComputedStyle(v);
              const escuro = c => (c.match(/\\d+/g) || [255, 255, 255]).slice(0, 3).reduce((a, x) => a + +x, 0) < 40;
              return {voltar:parseFloat(cv.borderTopWidth) >= 3 && escuro(cv.borderTopColor) && v.getBoundingClientRect().height >= 44, aba:!on, abas:!T.querySelector('.tl-abas'),
                h2:/rgb\\(6, 6, 7\\)/.test(getComputedStyle(T.querySelector('.tl-cab h2')).textShadow), carteira:T.querySelectorAll('.tl-cab .lb-grana').length === 2, icones:T.querySelectorAll('.tl-cab .v77-cab-bt').length === 3}; })()""")
        P.confere(all(all(v.values()) for v in cabs.values()), 'cabeçalhos (v77): o VOLTAR quadrado de contorno grosso (≥ 44 px), o título com contorno, sem abas de outras telas, as moedas e os 3 ícones', cabs)
        await rt(pg, LIMPA71); await rt(pg, "abreTela('perfil'); true"); await pg.wait_for_timeout(300)
        partes = {}
        for p in ('geral', 'est', 'conq', 'hist'):
            await pg.click('#v77-pf-t-' + p); await pg.wait_for_timeout(250)
            partes[p] = await rt(pg, """(() => { const C = document.querySelector('#tela-perfil .pf-corpo'), d = s => { const e = C.querySelector(s); return !e.hidden && getComputedStyle(e).display !== 'none'; };
              return {vis:[d('.v77-pf-geral'), d('.v77-pf-est'), d('.v77-pf-conq'), d('.v77-pf-hist')].map(Number).join(''), telas:+(C.scrollHeight/C.clientHeight).toFixed(2),
                lado:getComputedStyle(C.querySelector('.pf-lado')).visibility !== 'hidden', sel:document.querySelector('#v77-pf-t-%s').getAttribute('aria-selected')}; })()""" % p)
        esperado = {'geral': '1000', 'est': '0100', 'conq': '0010', 'hist': '0001'}
        P.confere(all(partes[p]['vis'] == esperado[p] and partes[p]['sel'] == 'true' for p in esperado) and partes['geral']['lado'] and max(v['telas'] for v in partes.values()) <= 1.0,
                  'PERFIL no computador em partes (v77: VISÃO GERAL com a tampinha ao lado · ESTATÍSTICAS · CONQUISTAS · PARTIDAS): cada parte cabe sem rolar', partes)
        r = await rt(pg, "({pf:document.getElementById('pf-skin').textContent, nome:tpeNomeDe(tpLe(TP_PADRAO_COD)), outra:tpeNomeDe(TP_PRE[1].d) === TP_PRE[1].nome})")
        P.confere(r['pf'] == 'PADRÃO' and r['nome'] == 'Padrão' and r['outra'], 'a tampinha padrão se chama PADRÃO no perfil e no editor (era "Personalizada"); os modelos prontos ficam com o nome deles', r)
        await rt(pg, LIMPA71); await rt(pg, "abreTela('loja'); true"); await pg.wait_for_timeout(300)
        r = await rt(pg, "[...document.querySelectorAll('#tela-loja .v70-lj-peca')].map(b => [b.dataset.r, (b.querySelector('small') || {}).textContent])")
        ok = len(r) == 4 and all(x[0] in ('comum', 'raro', 'epico', 'lendario') and {'comum': 'COMUM', 'raro': 'RARO', 'epico': 'ÉPICO', 'lendario': 'LENDÁRIO'}[x[0]] in x[1] for x in r)
        P.confere(ok, 'LOJA: as 4 peças do dia com a faixa da cor da raridade certa', r)
        await rt(pg, LIMPA71); await rt(pg, "ajxAbre('audio'); true"); await pg.wait_for_timeout(300)
        r = await rt(pg, "[...document.querySelectorAll('#pop-ajustes .ajx-aba')].map(b => !!b.querySelector('.v71-ic svg') && getComputedStyle(b.querySelector('.v71-ic')).display !== 'none')")
        P.confere(len(r) == 7 and all(r), 'AJUSTES: as 7 abas com o desenho delas (no computador; v88: + PRIVACIDADE)', r)
        await rt(pg, "ajxFecha(); jogar(); true"); await pg.wait_for_timeout(700)
        await rt(pg, "pausaAbre(); true"); await pg.wait_for_timeout(300)
        r = await rt(pg, """[...document.querySelectorAll('#pausa .pa-acoes > .pa-bt')].map(b => ({t:b.textContent.trim(), ic:!!b.querySelector('.v71-ic svg'), h:Math.round(b.getBoundingClientRect().height)}))""")
        P.confere(len(r) == 4 and all(x['ic'] and x['h'] >= 44 for x in r), 'PAUSA: CONTINUAR, EDITAR CONTROLES, AJUSTES e SAIR com desenho e ≥ 44 px', r)
        await rt(pg, "pausaFecha(); rqSai(); X49.mode = 'casual'; X49.jogo = 'futebol'; x49Start(2, 0); rqVsComeca(); true"); await pg.wait_for_timeout(500)
        await rt(pg, "(() => { RQ.placar = [3, 1]; RQ.estado = 'jogo'; rqFim(); if (!fimAberto()) rqMostraFim(); return true; })()"); await pg.wait_for_timeout(700)
        r = await rt(pg, "({de:getComputedStyle(fimEl('fim-denovo')).backgroundImage.indexOf('rgb(255, 210, 63)') >= 0, cx:getComputedStyle(document.querySelector('#fim .fim-caixa')).borderTopWidth, lobby:getComputedStyle(fimEl('fim-lobby')).color})")
        P.confere(r['de'] and r['cx'] == '5px' and r['lobby'] == 'rgb(255, 255, 255)', 'FIM: a moldura grossa, o JOGAR DE NOVO amarelo e o LOBBY escuro', r)
        await rt(pg, "fechaFim(); rqSai(); abrirLobby(); true")
        P.confere(not [e for e in erros if 'Failed to load' not in e], 'nenhum erro de JavaScript (telas de dentro, computador)', erros[:3])
        await b.close()
        for (w, h) in [(1280, 720), (844, 390)]:
            b, pg, erros = await abre(pw, w, h, toque=(w < 1000))
            await rt(pg, "(() => { abreTela('amigos'); slocCria({n:2, map:4, jogo:'futebol', tempo:0, name:'T'}); v70SlMontaComBots(); return true; })()"); await pg.wait_for_timeout(600)
            r = await rt(pg, "[...document.querySelectorAll('#tela-sala .sl-op b')].map(b => [b.textContent, b.scrollWidth <= b.clientWidth + 1])")
            P.confere(len(r) == 5 and all(x[1] for x in r), '%dx%d: a sala mostra TIMES, CAMPO, MODO, TEMPO e BOTS sem cortar o nome' % (w, h), r)
            await rt(pg, "(() => { net49Send({type:'leave'}); fechaTela(); return true; })()")
            if w < 1000:
                zs = {}
                for nome, js in TELAS71:
                    await rt(pg, LIMPA71); await pg.wait_for_timeout(200)
                    await rt(pg, js); await pg.wait_for_timeout(500)
                    z = await rt(pg, "Math.min(1, ...[...document.querySelectorAll('[data-v70z]')].map(e => +e.dataset.v70z))")
                    if z < 1: zs[nome] = z
                P.confere(not zs or min(zs.values()) >= .72, '%dx%d: nenhuma tela encolhe abaixo de 0,72 para caber (v71: a loja 0,75)' % (w, h), zs)
                await rt(pg, "(() => { ajxAbre('visual'); return true; })()"); await pg.wait_for_timeout(300)
                r = await rt(pg, "({compacto:AJX.raiz.classList.contains('v70-compacto'), ic:[...document.querySelectorAll('#pop-ajustes .ajx-aba .v71-ic')].every(i => getComputedStyle(i).display === 'none')})")
                P.confere(r['compacto'] and r['ic'], '%dx%d: nos Ajustes compactos as abas ficam só com o nome (cabem as seis numa linha)' % (w, h), r)
                await rt(pg, "ajxFecha(); jogar(); true"); await pg.wait_for_timeout(700); await rt(pg, "pausaAbre(); true"); await pg.wait_for_timeout(300)
                r = await rt(pg, """(() => { const c = document.querySelector('#pausa .pa-caixa').getBoundingClientRect(); return {cabe:c.top >= 0 && c.bottom <= innerHeight, bts:[...document.querySelectorAll('#pausa .pa-acoes > .pa-bt')].map(b => Math.round(b.getBoundingClientRect().height))}; })()""")
                P.confere(r['cabe'] and all(x >= 44 for x in r['bts']), '%dx%d: a PAUSA cabe na tela com os 4 botões ≥ 44 px' % (w, h), r)
                await rt(pg, "pausaFecha(); true")
            P.confere(not [e for e in erros if 'Failed to load' not in e], '%dx%d: nenhum erro de JavaScript (telas de dentro)' % (w, h), erros[:3])
            await b.close()
    return P.fim()


if __name__ == '__main__':
    roda(principal())
