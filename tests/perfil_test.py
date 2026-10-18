"""Etapa 4 · perfil, estatísticas, inventário e economia — o que muda no progresso do jogador.

  · demonstração × produção: o presente de teste (50.000 moedas e 5.000 gemas) só na demonstração
  · compra atômica: o saldo e as peças na mesma gravação; se a gravação falhar, nada é cobrado nem liberado
  · a tampinha da conta restaurada não volta a ser cobrada ao abrir o editor (a v69 trocava a lista e cobrava de novo)
  · zerar o progresso: apaga também o histórico, as sequências e os recordes das partidas; mantém nome, ID e configurações;
    desenhos, replays e clube local só se marcar
  · estatísticas por contexto (casual, liga, online, treino) e modo; vitórias, derrotas, empates e abandonos
  · finalização: chute/passe rumo ao gol (no alvo ou CHUTE na direção do gol); passe para o lado não conta; conversão
  · títulos de participação contam partida concluída (abandono não avança o Boleiro)
  · missões do dia (sorteio fixo do dia), bônus e série; limites do treino livre e dos exercícios
  · troca de gemas com confirmação e DESFAZER; a dificuldade da casual (Fácil, Difícil, Aleatória) e a da liga pelo elo
  · editor: o botão diz o que faz (VOLTAR / EQUIPAR / COMPRAR E EQUIPAR + preço), o rascunho volta, o aviso de sair sem
    equipar, o inventário (buscar, favoritar, renomear, duplicar, apagar com DESFAZER)
  · salvamento: exportar/importar e o aviso quando a gravação falha

Rodar:  python3 tests/perfil_test.py
"""
import json
from comum import abre, rt, roda, Placar, async_playwright, RAIZ

SAIDA = RAIZ / 'tests' / 'saida'; SAIDA.mkdir(exist_ok=True)


async def principal():
    P = Placar('Etapa 4 · perfil, estatísticas, inventário e economia')
    async with async_playwright() as pw:
        # ---------------------------------------------------------------- demonstração × produção
        print('\n· demonstração × produção')
        b, pg, erros = await abre(pw)
        r = await rt(pg, "({modo:window.RACHA_MODO, m:CONTA.moedas, g:CONTA.gemas, selo:!!document.querySelector('.v70-demo')})")
        P.confere(r['modo'] == 'producao' and r['m'] == 500 and r['g'] == 25 and not r['selo'], 'produção (padrão): começa com 500 moedas e 25 gemas, sem presente e sem selo', r)
        await b.close()
        b, pg, erros2 = await abre(pw, config={'modo': 'demo'})
        r = await rt(pg, "({modo:window.RACHA_MODO, m:CONTA.moedas, g:CONTA.gemas, selo:!!document.querySelector('.v70-demo')})")
        P.confere(r['modo'] == 'demo' and r['m'] == 50500 and r['g'] == 5025 and r['selo'], 'demonstração: presente de teste (50.000 + 5.000) e o selo DEMONSTRAÇÃO', r)
        await b.close()

        b, pg, erros = await abre(pw)
        # ---------------------------------------------------------------- compra atômica
        print('\n· compra: saldo e peças juntos')
        r = await rt(pg, """(() => {
          CONTA.moedas = 1000; contaSalvar();
          const D = tpLe(tpMinha()); D.b = 'df';                              // Dentada fina (comum, 300)
          const ok = tpCompra(D), salvo = JSON.parse(localStorage.getItem(CHAVE_CONTA));
          return {ok, m:CONTA.moedas, tem:TP.itens.has('b:df'), salvoM:salvo.moedas, salvoPeca:salvo.pecas.indexOf('b:df') >= 0};
        })()""")
        P.confere(r['ok'] and r['m'] == 700 and r['tem'] and r['salvoM'] == 700 and r['salvoPeca'], 'compra: a mesma gravação da conta tem o saldo novo e a peça', r)
        r = await rt(pg, """(async () => {
          // o navegador sem espaço: enche o armazenamento até não caber nem 1 letra (a gravação de verdade falha)
          const lixo = []; let n = 0;
          for (const tam of [1 << 20, 1 << 17, 1 << 14, 1 << 11, 256, 32, 8, 4, 2, 1]){ const s = 'x'.repeat(tam); for (;;){ try { localStorage.setItem('_' + n.toString(36), s); lixo.push('_' + n.toString(36)); n++; } catch (_) { break; } } }
          const D = tpLe(tpMinha()); D.b = 'dl';                              // Dentada larga (comum, 300)
          let ok; try { ok = tpCompra(D); } finally { for (const k of lixo) localStorage.removeItem(k); }
          await new Promise(r => setTimeout(r, 40));
          const salvo = JSON.parse(localStorage.getItem(CHAVE_CONTA)), tp = JSON.parse(localStorage.getItem(TP_CHAVE) || '{}');
          return {ok, m:CONTA.moedas, tem:TP.itens.has('b:dl'), salvoM:salvo.moedas, tpTem:(tp.itens || []).indexOf('b:dl') >= 0, falhas:PX_SAVE.falhas,
            aviso:!!PX_SAVE.el && !PX_SAVE.el.hidden};
        })()""")
        P.confere(r['ok'] is False and r['m'] == 700 and not r['tem'] and r['salvoM'] == 700 and not r['tpTem'], 'gravação falhou: a compra não acontece (nem moeda paga, nem peça liberada)', r)
        P.confere(r['falhas'] >= 1 and r['aviso'], 'falha de gravação não passa calada: o aviso aparece', r)
        await rt(pg, "if (PX_SAVE.el) PX_SAVE.el.hidden = true; PX_SAVE.falhas = 0; true")
        # a peça comprada volta depois de recarregar, mesmo sem o arquivo das tampinhas (ela mora na conta)
        await rt(pg, "localStorage.removeItem(TP_CHAVE); true")
        await pg.reload(); await pg.wait_for_function('() => typeof window.__RT === "function"', polling=100)
        await pg.wait_for_timeout(400)
        r = await rt(pg, "({tem:TP.itens.has('b:df'), m:CONTA.moedas})")
        P.confere(r['tem'] and r['m'] == 700, 'depois de recarregar: a peça continua sua (veio da conta) e o saldo é o pago', r)

        # ---------------------------------------------------------------- a tampinha da conta não é cobrada de novo
        print('\n· a tampinha restaurada da conta')
        r = await rt(pg, """(async () => {
          const D = tpLe(tpMinha()); D.b = 'ou'; D.p = 'gx'; D.i = 'co';          // peças de gemas (ninguém comprou)
          const cod = tpCodigo(D);
          tpePlataforma = () => ({conta:() => ({idPublico:'R7K2Q', nome:'Ana da Laje', tampa:cod}), inventario:() => Promise.resolve(['skin_fundador']), clubes:null});
          TP.livres.add(cod);                                                  // o que o clbTampaDaConta faz quando o jogo abre
          ED.contaT = 0; abreTela('skins'); await new Promise(r => setTimeout(r, 120));
          const custo = tpCusto(tpLe(cod)), conta = TP.conta.slice();
          fechaTela();
          return {custo, conta, livres:TP.livres.size};
        })()""")
        P.confere(r['custo']['m'] == 0 and r['custo']['g'] == 0 and 'skin_fundador' in r['conta'], 'abrir o editor (que lê as skins da conta) não faz a tampinha da conta voltar a custar', r)
        r = await rt(pg, "(() => { renderPerfil(); return {id:PF.uid.textContent, selo:document.querySelector('#tela-perfil .pf-ident').textContent, nome:perfil.nome}; })()")
        P.confere(r['id'] == 'R7K2Q' and 'CONTA' in r['selo'] and r['nome'] == 'Ana da Laje', 'logado: o cartão mostra o ID e o nome da conta (os mesmos do clube e dos convites)', r)
        r = await rt(pg, "(() => { tpePlataforma = () => null; renderPerfil(); return {id:PF.uid.textContent, uid:perfil.uid, selo:document.querySelector('#tela-perfil .pf-ident').textContent}; })()")
        P.confere(r['id'] == r['uid'] and ('LOCAL' in r['selo'] or 'NESTE APARELHO' in r['selo']), 'sem conta: o cartão diz que o perfil é deste aparelho (v78: NESTE APARELHO; era LOCAL) e mostra o ID deste aparelho', r)
        await b.close()

        # ---------------------------------------------------------------- estatísticas por contexto e modo
        print('\n· estatísticas por contexto e modo')
        b, pg, erros = await abre(pw)
        r = await rt(pg, """(() => { const T = window.__T;
          T.comeca('futebol', 1, 0); RQ.placar = [3, 1]; rqFim(); rqEventos();       // casual: vitória
          const a = Object.assign({}, perfil.est['casual|futebol']);
          X49.mode = 'ranked'; rqComeca(1, 0); RQ.estado = 'jogo'; RQ.placar = [0, 2]; rqFim(); rqEventos();   // liga: derrota
          const l = Object.assign({}, perfil.est['liga|futebol']);
          X49.mode = 'casual'; X49.jogo = 'curva'; rqComeca(1, 0); RQ.estado = 'jogo'; RQ.placar = [2, 1]; rqAbandona();   // casual com curva: abandono (v70.2: era o basquete, que saiu)
          const ab = Object.assign({}, perfil.est['casual|curva']), h = X49.history[X49.history.length - 1];
          return {a, l, ab, h, partidas:perfil.st.partidas, conc:perfil.st.concluidas};
        })()""")
        P.confere(r['a'].get('c') == 1 and r['a'].get('v') == 1 and not r['a'].get('d'), 'casual: 1 concluída, 1 vitória', r['a'])
        P.confere(r['l'].get('c') == 1 and r['l'].get('d') == 1 and not r['l'].get('ss'), 'liga contra bots: 1 derrota, no grupo da liga', r['l'])
        P.confere(r['ab'].get('a') == 1 and not r['ab'].get('c'), 'abandono: conta à parte (não vira concluída)', r['ab'])
        P.confere(r['h'] and r['h'].get('aband') and r['h'].get('jogo') == 'curva', 'o abandono entra nas ÚLTIMAS PARTIDAS (com o modo)', r['h'])
        r = await rt(pg, """(() => {
          rqSai(); NET49.playing = true; NET49.host = false; NET49.localSlot = 0; NET49.room = {code:'K9P', local:false, pub:true}; NET49.onlineGols = 2; NET49.onlineAssist = 0;
          RQ.jogo = 'futebol'; P.time = 0;
          try { net49Result({round:7, score:[2, 2], winner:-1}); } catch (e) { return {erro:String(e)}; }
          const o = Object.assign({}, perfil.est['online|futebol']), h = X49.history[X49.history.length - 1];
          NET49.playing = false; NET49.room = null; try { fechaFim(); } catch (_) {}
          return {o, emp:h && h.emp, ctx:h && h.ctx};
        })()""")
        P.confere(r.get('o', {}).get('e') == 1 and r.get('emp') and r.get('ctx') == 'online', 'sala online com empate: conta EMPATE no online (e no histórico)', r)
        # o título Boleiro: abandono não avança, concluída avança
        r = await rt(pg, "({bol:TITULO_MAP.get('boleiro').valor(), req:TITULO_MAP.get('boleiro').req, conc:estSoma('c', EST_PARTIDA, null), aband:estSoma('a', EST_PARTIDA, null)})")
        P.confere(r['bol'] == r['conc'] == 3 and r['aband'] == 1, 'Boleiro conta partidas CONCLUÍDAS (3), não o abandono', r)
        # a tela do perfil: os seletores e os cartões
        r = await rt(pg, """(() => { abreTela('perfil'); PX.ctx = 'casual'; PX.modo = 'curva'; pxEstRender();
          const cards = Array.from(document.querySelectorAll('#tela-perfil .pf-est-grade .card')).map(c => c.querySelector('small').textContent + '=' + c.querySelector('b').textContent);
          PX.ctx = 'tudo'; PX.modo = 'todos'; pxEstRender();
          const tudo = Array.from(document.querySelectorAll('#tela-perfil .pf-est-grade .card')).map(c => c.querySelector('small').textContent + '=' + c.querySelector('b').textContent);
          return {cards, tudo, aprov:$('st-aprov').textContent, part:$('st-partidas').textContent}; })()""")
        P.confere('ABANDONOS=1' in r['cards'] and 'GOLS=0' in r['cards'] and not any(c.startswith('PONTOS') or c.startswith('CESTAS') for c in r['cards']), 'perfil › casual › com curva: gols e abandonos separados (sem cartão de cesta/pontos)', r['cards'])
        P.confere('PARTIDAS=3' in r['tudo'] and 'VITÓRIAS=1' in r['tudo'] and 'DERROTAS=1' in r['tudo'] and 'EMPATES=1' in r['tudo'] and 'ABANDONOS=1' in r['tudo'], 'perfil › tudo: 3 concluídas = 1 vitória + 1 derrota + 1 empate; 1 abandono', r['tudo'])
        P.confere(r['part'] == '3' and r['aprov'] == '33%', 'o cartão: partidas concluídas (3) e aproveitamento das concluídas (33%)', r)
        await pg.screenshot(path=str(SAIDA / 'e4_perfil_1280x720.png'))
        # finalizações: no alvo, pra fora (CHUTE rumo ao gol) e o passe para o lado
        r = await rt(pg, """(() => { const T = window.__T;
          fechaTela(); X49.mode = 'casual';
          T.comeca('futebol', 1, 0); T.limpa(); const b0 = Object.assign({}, perfil.est['casual|futebol']);
          const k = (dx, dy, f, x, y) => { T.limpa(); T.poe(P, x, y); T.cola(P, dx, dy); P.chutar = f; T.passos(3, i => { if (i > 0) P.chutar = 0; }); };
          k(1, 0, FORCA_POWER, LX1 - 420, CY);                       // no alvo (CHUTE de frente para o gol)
          k(1, -.9, FORCA_POWER, LX1 - 420, CY + 150);                // pra fora: CHUTE na direção do gol (uns 22° fora do meio), que sai
          k(0, 1, FORCA_KICK, CX + 100, CY - 200);                    // PASSE para o lado: não é finalização
          k(-1, 0, FORCA_POWER, CX - 200, CY);                        // CHUTE para trás, no próprio campo: não é
          const b1 = perfil.est['casual|futebol'];
          return {f:(b1.f || 0) - (b0.f || 0), fa:(b1.fa || 0) - (b0.fa || 0)};
        })()""")
        P.confere(r['f'] == 2 and r['fa'] == 1, 'finalizações: CHUTE no alvo e CHUTE rumo ao gol contam; passe para o lado e chute para trás, não', r)
        r = await rt(pg, """(() => { const T = window.__T;
          T.limpa(); T.poe(P, LX1 - 260, CY); T.cola(P, 1, 0); const b0 = Object.assign({}, perfil.est['casual|futebol']);
          P.chutar = FORCA_POWER; const g = T.passos(240, i => { if (i > 0) P.chutar = 0; }); rqEventos();
          const b1 = perfil.est['casual|futebol'];
          return {gol:!!g && g.golH, fg:(b1.fg || 0) - (b0.fg || 0), m:(b1.m || 0) - (b0.m || 0)};
        })()""")
        P.confere(r['gol'] and r['fg'] == 1 and r['m'] == 1, 'gol de finalização: conta o gol e a conversão', r)
        await rt(pg, "rqSai(); abrirLobby(); true"); await pg.wait_for_timeout(300)

        # ---------------------------------------------------------------- zerar o progresso
        print('\n· zerar o progresso')
        r = await rt(pg, """(() => {
          perfil.nome = 'Biel'; perfil.bio = 'bola no pé'; perfilSalvar();
          CONTA.moedas = 4321; CONTA.menosAnim = true; CONTA.musica = false; contaSalvar();
          X49.seq = 4; X49.bestSeq = 7; X49.fastest = 61; X49.longest = 22.5; x49Save();
          TR.recs['arcade:cruz'] = {pts:20, est:3}; trSalvaRecs();
          TP.salvas = [{c:tpMinha(), n:'Minha', f:false}]; tpSalva();
          rpEscreve({v:1, salvos:[], recentes:[{id:1, modo:'arcade', t:Date.now()}]}, 'recentes');
          CLB_LOCAL.clubes = [{id:'Lx', nome:'Laje FC', descricao:'', pais:'BR', tipo:'publico', trofeuMinimo:0, escudo:tpCodigo(TP_ESCUDO_D()), criadoEm:1}]; CLB_LOCAL.meu = 'Lx'; clbLocalSalva();
          const uid = perfil.uid;
          pxZerar({});
          const x = JSON.parse(localStorage.getItem(X49_KEY));
          return {uid0:uid, uid:perfil.uid, nome:perfil.nome, bio:perfil.bio, m:CONTA.moedas, est:Object.keys(perfil.est).length, st:perfil.st.partidas + perfil.st.concluidas,
            seq:x.seq, best:x.bestSeq, fast:x.fastest, longe:x.longest, hist:x.history.length, recs:Object.keys(TR.recs).length, pecas:TP.itens.size + CONTA.pecas.length,
            anim:CONTA.menosAnim, mus:CONTA.musica, salvas:TP.salvas.length, rec:rpLe().recentes.length, clube:CLB_LOCAL.meu, liga:CONTA.rq.pts + CONTA.rq.jogos};
        })()""")
        P.confere(r['uid'] == r['uid0'] and r['nome'] == 'Biel' and r['bio'] == 'bola no pé', 'zerar mantém o nome, o ID e a bio', r)
        P.confere(r['m'] == 500 and r['est'] == 0 and r['st'] == 0 and r['recs'] == 0 and r['pecas'] == 0 and r['liga'] == 0, 'zerar apaga moedas, estatísticas, recordes dos treinos, peças e a liga', r)
        P.confere(r['seq'] == 0 and r['best'] == 0 and r['fast'] == 0 and r['longe'] == 0 and r['hist'] == 0, 'zerar apaga também o histórico, as sequências e os recordes das partidas (a v69 deixava)', r)
        P.confere(r['anim'] is True and r['mus'] is False, 'zerar mantém as configurações (reduzir animações, música)', r)
        P.confere(r['salvas'] == 1 and r['rec'] == 1 and r['clube'] == 'Lx', 'sem marcar: os desenhos, os replays e o clube deste aparelho ficam', r)
        r = await rt(pg, "(() => { pxZerar({desenhos:true, replays:true, clube:true}); return {salvas:TP.salvas.length, rec:rpLe().recentes.length + rpLe().salvos.length, clube:CLB_LOCAL.meu}; })()")
        P.confere(r['salvas'] == 0 and r['rec'] == 0 and r['clube'] is None, 'marcando as três: apaga os desenhos, os replays e o clube deste aparelho', r)
        # a janela: o que apaga e o que fica
        await rt(pg, "ajxAbre('conta'); true"); await pg.wait_for_timeout(200)
        await pg.click('#lb-zerar'); await pg.wait_for_timeout(300)
        r = await rt(pg, "({tx:LB.popCaixa.textContent, ops:LB.popCaixa.querySelectorAll('.v70-op').length})")
        P.confere('APAGA' in r['tx'] and 'FICA' in r['tx'] and 'histórico' in r['tx'].lower() and 'Nome, ID' in r['tx'] and r['ops'] >= 2, 'a janela de zerar diz o que apaga, o que fica e tem as escolhas', r['tx'][:160])
        await pg.screenshot(path=str(SAIDA / 'e4_zerar_1280x720.png'))
        await rt(pg, "fechaPop(); true")

        # ---------------------------------------------------------------- economia: limites, missões, troca, dificuldade
        print('\n· economia')
        r = await rt(pg, """(() => {
          CONTA.cap = null; CONTA.livre = {dia:-1, n:0}; const m0 = CONTA.moedas, s0 = CONTA.semana.gols;
          for (let i = 0; i < 20; i++) ecoGol('livre');
          const livre = {m:CONTA.moedas - m0, top:CONTA.semana.gols - s0};
          const pr = []; for (let i = 0; i < 4; i++) pr.push(ecoTreino(3, false, 'arcade:passe').p.m);
          return {livre, pr, nota:ecoTreino(1, false, 'arcade:passe').nota};
        })()""")
        P.confere(r['livre']['m'] == 15*4 and r['livre']['top'] == 10, 'treino livre: moedas só nos 15 primeiros gols do dia; Top com até 10', r['livre'])
        P.confere(r['pr'][:3] == [100, 100, 100] and r['pr'][3] == 20 and 'reduzido' in r['nota'], 'exercício: prêmio cheio 3 vezes no dia, depois 20% (e a tela explica)', r)
        r = await rt(pg, """(() => {
          CONTA.missoes = null; const a = ecoMissoes().l.map(x => x.id + ':' + x.alvo + ':' + x.arg); CONTA.missoes = null; const b = ecoMissoes().l.map(x => x.id + ':' + x.alvo + ':' + x.arg);
          CONTA.missoes = {dia:diaId(), bonus:false, l:[{id:'concluir', alvo:2, arg:null, p:0, ok:false}, {id:'assist', alvo:1, arg:null, p:0, ok:false}, {id:'vencer', alvo:1, arg:null, p:0, ok:false}]};   // (v79: as de modo viraram as do treino)
          const R = {placar:[3, 0], venceu:true, golsH:2, assistH:1, n:2, mapa:0, jogo:'curva'};
          ecoPartidaFim(R, 'casual', {abandono:false, empate:false, sofreu:false});
          ecoPartidaFim(Object.assign({}, R, {jogo:'futebol'}), 'casual', {abandono:true, empate:false, sofreu:false});
          const M = ecoMissoes().l.map(x => x.p);
          return {a, b, M};
        })()""")
        P.confere(r['a'] == r['b'] and len(r['a']) == 3, 'missões: as 3 do dia são as mesmas o dia todo (sorteio fixo)', r['a'])
        P.confere(r['M'] == [1, 1, 1], 'missões contam a partida concluída (assistência e vitória) e ignoram o abandono', r['M'])
        await rt(pg, "missoesAbre(); true"); await pg.wait_for_timeout(250)
        await pg.screenshot(path=str(SAIDA / 'e4_missoes_1280x720.png'))
        r = await rt(pg, "(() => { const m0 = CONTA.moedas; const bt = Array.from(LB.popCaixa.querySelectorAll('.lb-btn')).find(b => b.textContent === 'PEGAR'); if (bt) bt.click(); return {pegou:CONTA.moedas - m0, ok:CONTA.missoes.l.filter(x => x.ok).length}; })()")
        P.confere(r['pegou'] > 0 and r['ok'] == 1, 'PEGAR paga a missão (uma vez)', r)
        await rt(pg, "fechaPop(); true")
        # a troca de gemas: confirmação e DESFAZER
        await rt(pg, "CONTA.gemas = 100; CONTA.moedas = 500; contaSalvar(); abreTela('loja'); true"); await pg.wait_for_timeout(300)
        await pg.screenshot(path=str(SAIDA / 'e4_loja_1280x720.png'))
        await pg.evaluate("document.querySelector('#tela-loja .v88-cat[data-cat=\"ofertas\"]').click()"); await pg.wait_for_timeout(200)   # (v88: a troca de gemas mora em OFERTAS)
        await pg.evaluate("document.querySelector('#lj-trocas .lj-troca').click()"); await pg.wait_for_timeout(200)
        r = await rt(pg, "({pop:!LB.pop.hidden, tx:LB.popCaixa.textContent, g:CONTA.gemas})")
        P.confere(r['pop'] and 'TROCAR GEMAS' in r['tx'] and r['g'] == 100, 'a troca de gemas pede confirmação (nada muda antes)', r['tx'][:80])
        await rt(pg, "Array.from(LB.popCaixa.querySelectorAll('.lb-btn')).find(b => b.textContent === 'TROCAR').click(); true"); await pg.wait_for_timeout(150)
        r = await rt(pg, "({g:CONTA.gemas, m:CONTA.moedas, desfaz:!V70D.el.hidden})")
        P.confere(r['g'] == 70 and r['m'] == 1100 and r['desfaz'], 'confirmou: 30 gemas viram 600 moedas, com DESFAZER na tela', r)
        await pg.click('.v70-desfaz-bt'); await pg.wait_for_timeout(100)
        r = await rt(pg, "({g:CONTA.gemas, m:CONTA.moedas})")
        P.confere(r['g'] == 100 and r['m'] == 500, 'DESFAZER devolve as gemas', r)
        await rt(pg, "fechaTela(); true")
        r = await rt(pg, """(() => {
          const conta = n => { const o = {}; for (let i = 0; i < 400; i++){ const v = rqSorteiaNivel(); o[v] = (o[v] || 0) + 1; } return o; };
          X49.mode = 'casual'; X49.nivelCas = 'facil'; const f = conta(); X49.nivelCas = 'dificil'; const d = conta();
          X49.nivelCas = 'aleatoria'; X49.niveis = []; const seq = []; for (let i = 0; i < 60; i++) seq.push(rqSorteiaNivel());
          let tres = false; for (let i = 2; i < seq.length; i++) if (seq[i] === seq[i - 1] && seq[i] === seq[i - 2]) tres = true;
          X49.mode = 'ranked'; CONTA.rq.pts = 0; const br = conta(); CONTA.rq.pts = 2000; const di = conta(); CONTA.rq.pts = 0; X49.mode = 'casual';   // (v79: 2.000 = Diamante III)
          return {f, d, tres, br:(br.dificil || 0)/400, di:(di.dificil || 0)/400};
        })()""")
        P.confere(r['f'].get('facil') == 400 and r['d'].get('dificil') == 400, 'casual: Fácil e Difícil escolhidos valem em todas as partidas', r)
        P.confere(not r['tres'], 'casual Aleatória: nunca 3 iguais seguidas', r)
        P.confere(.15 < r['br'] < .35 and .7 < r['di'] < .9, 'ranqueada contra bots: o Difícil cresce com a patente (Bronze ~25%, Diamante ~80%)', r)
        await rt(pg, "abreJogar('casual'); true"); await pg.wait_for_timeout(300)
        r = await rt(pg, "({bts:Array.from(document.querySelectorAll('.v70-bots-seg button')).map(b => b.textContent), nota:document.querySelector('.v70-bots-nota').textContent})")
        P.confere(r['bts'] == ['FÁCIL', 'DIFÍCIL', 'ALEATÓRIA'], 'JOGAR › CASUAL tem a escolha dos bots: Fácil, Difícil, Aleatória', r)
        await pg.screenshot(path=str(SAIDA / 'e4_jogar_casual_1280x720.png'))
        await rt(pg, "fechaRanqueada(); true")

        # ---------------------------------------------------------------- o editor e o inventário
        print('\n· editor e inventário')
        r = await rt(pg, """(async () => {
          CONTA.moedas = 5000; contaSalvar(); TP.salvas = []; tpSalva(); tpeApagaRascunho();
          abreTela('skins'); await new Promise(r => setTimeout(r, 60));
          const rot = () => ED.el.ok.querySelector('b').textContent + (ED.el.ok.querySelector('.tpe-ok-preco').textContent ? ' ' + ED.el.ok.querySelector('.tpe-ok-preco').textContent : '');
          const a = rot();
          tpeCarrega(Object.assign(tpCopia(ED.D), {b:'ls'})); tpeRodape(); const b = rot();      // Lisa (grátis)
          tpeCarrega(Object.assign(tpCopia(ED.D), {b:'lt'})); tpeRodape(); const c = rot();      // Listrada (raro, 800)
          return {a, b, c};
        })()""")
        P.confere(r['a'] == 'VOLTAR' and r['b'] == 'EQUIPAR' and r['c'].startswith('COMPRAR E EQUIPAR') and '800' in r['c'], 'o botão diz o que faz: VOLTAR · EQUIPAR · COMPRAR E EQUIPAR 800', r)
        # o rascunho: ir para a loja e voltar
        r = await rt(pg, """(async () => {
          const cod = tpCodigo(ED.D); abreTela('loja'); await new Promise(r => setTimeout(r, 60)); abreTela('skins'); await new Promise(r => setTimeout(r, 60));
          return {igual:tpCodigo(ED.D) === cod, rasc:ED.rasc, aviso:!ED.el.rasc.hidden};
        })()""")
        P.confere(r['igual'] and r['rasc'] and r['aviso'], 'rascunho: foi para a loja e voltou, o desenho continua (com o aviso de rascunho)', r)
        # sair com mudança: o aviso
        await pg.evaluate("document.querySelector('#tela-skins .tl-voltar').click()"); await pg.wait_for_timeout(200)
        r = await rt(pg, "({tela:lobby.tela, pop:!LB.pop.hidden, tx:LB.popCaixa.textContent})")
        P.confere(r['tela'] == 'skins' and r['pop'] and 'SAIR SEM EQUIPAR' in r['tx'], 'VOLTAR com mudança não equipada: avisa antes de sair', r['tx'][:60])
        await pg.screenshot(path=str(SAIDA / 'e4_sair_1280x720.png'))
        await rt(pg, "Array.from(LB.popCaixa.querySelectorAll('.lb-btn')).find(b => b.textContent === 'SAIR E GUARDAR').click(); true"); await pg.wait_for_timeout(150)
        r = await rt(pg, "({tela:lobby.tela, rasc:!!tpeLeRascunho()})")
        P.confere(r['tela'] is None and r['rasc'], 'SAIR E GUARDAR: fecha e o rascunho fica guardado', r)
        # comprar e equipar: o saldo de depois e a peça equipada
        r = await rt(pg, """(async () => {
          abreTela('skins'); await new Promise(r => setTimeout(r, 60));
          const m0 = CONTA.moedas; tpeConcluir(); await new Promise(r => setTimeout(r, 30));
          const tx = LB.popCaixa.textContent;
          Array.from(LB.popCaixa.querySelectorAll('.lb-btn')).find(b => /COMPRAR E EQUIPAR/.test(b.textContent)).click();
          await new Promise(r => setTimeout(r, 60));
          return {tx, pago:m0 - CONTA.moedas, equip:tpLe(tpMinha()).b, tela:lobby.tela, rasc:!!tpeLeRascunho()};
        })()""")
        P.confere('Saldo depois' in r['tx'] and r['pago'] == 800 and r['equip'] == 'lt' and r['tela'] is None and not r['rasc'], 'COMPRAR E EQUIPAR: mostra o saldo de depois, cobra 800, equipa e apaga o rascunho', r)
        # o inventário
        r = await rt(pg, """(async () => {
          abreTela('skins'); await new Promise(r => setTimeout(r, 60));
          const D1 = tpCopia(ED.D), D2 = Object.assign(tpCopia(ED.D), {p:'bo'}), D3 = Object.assign(tpCopia(ED.D), {p:'xd'});
          TP.salvas = [{c:tpCodigo(D1), n:'Laje', f:false}, {c:tpCodigo(D2), n:'Bolinha', f:false}, {c:tpCodigo(D3), n:'Xadrez da quebrada', f:false}]; tpSalva();
          ED.aba = 'inv'; tpeAtualiza(true); await new Promise(r => setTimeout(r, 30));
          const nomes = () => Array.from(ED.el.ctl.querySelectorAll('.tpe-salvas .tpe-card-n')).map(n => n.textContent);
          const n0 = nomes();
          const s = TP.salvas[2]; s.f = true; tpeInvAtualiza(); const fav = nomes()[0];
          ED.busca = 'bol'; tpeInvGrade(); const busca = nomes(); ED.busca = ''; tpeInvGrade();
          tpeSalvaMenu(TP.salvas[1]); await new Promise(r => setTimeout(r, 20));
          Array.from(LB.popCaixa.querySelectorAll('.lb-btn')).find(b => b.textContent === 'DUPLICAR').click(); await new Promise(r => setTimeout(r, 20));
          const dup = TP.salvas.map(x => x.n);
          tpeSalvaMenu(TP.salvas[0]); await new Promise(r => setTimeout(r, 20));
          Array.from(LB.popCaixa.querySelectorAll('.lb-btn')).find(b => b.textContent === 'APAGAR').click(); await new Promise(r => setTimeout(r, 20));
          const apagou = TP.salvas.map(x => x.n), desf = !V70D.el.hidden;
          V70D.el.querySelector('.v70-desfaz-bt').click(); await new Promise(r => setTimeout(r, 20));
          const volta = TP.salvas.map(x => x.n);
          const salvo = JSON.parse(localStorage.getItem(TP_CHAVE)).salvas.map(x => x.n + (x.f ? '★' : ''));
          return {n0, fav, busca, dup, apagou, desf, volta, salvo};
        })()""")
        P.confere(r['fav'] == 'Xadrez da quebrada', 'favoritar: a favorita vai para o começo da lista', r)
        P.confere(r['busca'] == ['Bolinha'], 'buscar pelo nome (sem acento e sem maiúscula)', r['busca'])
        P.confere(r['dup'] == ['Laje', 'Bolinha', 'Bolinha (cópia)', 'Xadrez da quebrada'], 'duplicar cria a cópia logo depois', r['dup'])
        P.confere(r['apagou'][0] == 'Bolinha' and r['desf'] and r['volta'][0] == 'Laje', 'apagar some na hora, com DESFAZER que devolve no mesmo lugar', r)
        P.confere('Xadrez da quebrada★' in r['salvo'], 'favorita e nomes ficam salvos no aparelho', r['salvo'])
        r = await rt(pg, """(async () => {
          tpeSalvaMenu(TP.salvas[0]); await new Promise(r => setTimeout(r, 20));
          Array.from(LB.popCaixa.querySelectorAll('.lb-btn')).find(b => b.textContent === 'RENOMEAR').click(); await new Promise(r => setTimeout(r, 200));
          const i = LB.popCaixa.querySelector('input'); i.value = 'Laje do Biel';
          Array.from(LB.popCaixa.querySelectorAll('.lb-btn')).find(b => b.textContent === 'SALVAR').click(); await new Promise(r => setTimeout(r, 20));
          return TP.salvas[0].n;
        })()""")
        P.confere(r == 'Laje do Biel', 'renomear um desenho salvo', r)
        await pg.screenshot(path=str(SAIDA / 'e4_inventario_1280x720.png'))
        await rt(pg, "fechaPop(); ED.saindo = true; fechaTela(); ED.saindo = false; true")

        # ---------------------------------------------------------------- salvamento: exportar e importar
        print('\n· salvamento')
        r = await rt(pg, """(() => {
          const a = pxExporta(), k = Object.keys(a.dados);
          const ok = pxImportaTexto(JSON.stringify(a)), ruim = pxImportaTexto('{"x":1}');
          return {k:k.length, conta:k.indexOf(CHAVE_CONTA) >= 0, perfil:k.indexOf(CHAVE_PERFIL) >= 0, token:k.some(x => x.indexOf('online-token') >= 0), ok:ok.n, ruim:ruim.erro || ''};
        })()""")
        P.confere(r['conta'] and r['perfil'] and not r['token'] and r['ok'] == r['k'], 'exportar leva a conta e o perfil (sem os tokens online); importar confere o arquivo', r)
        P.confere(r['ruim'] != '', 'importar recusa arquivo que não é do RACHA', r['ruim'])
        rede = [e for e in erros if 'Failed to load resource' in e]
        P.confere(not [e for e in erros if e not in rede], 'nenhum erro de JavaScript', [e for e in erros if e not in rede][:3])
        await b.close()
    return P.fim()


if __name__ == '__main__':
    roda(principal())
