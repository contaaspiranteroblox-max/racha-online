"""RACHA v103 · as salas personalizadas sem bots e o árbitro mais simples (passa/falha, com fotos em tests/saida/).
Com o servidor da turma de verdade (tests/servidor_visitantes.cjs) e quatro navegadores — a Ana (a árbitra, 1280 × 720), o
Beto, o Caio e a Duda — numa sala online 2v2:
  1. a sala: sem o quadro BOTS nas regras, as vagas dizem VAGA LIVRE, a legenda do árbitro é uma só (sem o apito), o botão
     ADMIN da tela da sala saiu; o CRIAR SALA online não tem a escolha dos bots;
  2. a FICHA (tocar no cartão do Beto): MUDAR PARA O TIME B, PÔR NO BANCO, TORNAR ÁRBITRO, REMOVER DA SALA e CANCELAR — sem
     o APITO; tocar numa VAGA LIVRE do Time B pergunta QUEM ENTRA e põe o Caio lá;
  3. começa com um a menos (Ana e Beto × Caio): a vaga vazia não tem bot, o quadro diz qual está vazia (fora) e o jogo não
     desenha nem aponta a tampinha dela;
  4. sem reiniciar: a Duda entra na sala no meio da partida (assistindo) e a árbitra põe ela na vaga vazia pela FICHA — a
     tampinha dela aparece no campo, o placar e o relógio continuam;
  5. o Beto sai no meio: a vaga dele fica vazia (sem bot) para todo mundo;
  6. a pausa da árbitra: VOCÊ É O ÁRBITRO com TIMES E JOGADORES, PAUSAR PARA TODOS e ENCERRAR PARTIDA; a faixa de cima diz
     "· árbitro" (sem "admin · apito"); o painel dos times com os nomes novos (OUTRO TIME, BANCO, ÁRBITRO, vaga livre).
  python3 tests/v103_salas_test.py"""
import asyncio, json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from comum import Placar, rt, async_playwright, RAIZ
from v93_fase3_test import sessao
from v92_hud_test import espera
from v92_online_test import sobe

SAIDA = RAIZ / 'tests' / 'saida'
JOGA = "NET49.playing && NET49.localSlot >= 0 && NET49.lastTick > 0"


async def foto(pg, nome):
    SAIDA.mkdir(parents=True, exist_ok=True)
    await pg.screenshot(path=str(SAIDA / nome))


async def principal():
    P = Placar('v103 · as salas sem bots e o árbitro mais simples')
    srv, prx, url, ws = sobe(False)
    pgs = []
    try:
        async with async_playwright() as pw:
            A = await sessao(pw, url, 'Ana', ws, 1280, 720); B = await sessao(pw, url, 'Beto', ws); C = await sessao(pw, url, 'Caio', ws)
            pgs = [A, B, C]
            for pg in pgs: await rt(pg, "abreTela('amigos')")
            for pg in pgs: await espera(pg, "!!NET49.id", 10000)
            # o CRIAR SALA online: sem a escolha dos bots
            cria = await rt(A, """(() => { SX.criando = true; SX.form.onde = 'online'; amigosRender();
              const g = [...document.querySelectorAll('.sx-grade2 > *')]; const bots = g.find(x => /^\\s*BOTS\\b/.test(x.textContent || ''));
              return {tem:g.length, botsVisivel:!!(bots && !bots.hidden && bots.offsetParent)}; })()""")
            P.confere(cria and cria['tem'] >= 4 and not cria['botsVisivel'], '1) o CRIAR SALA online não tem a escolha dos bots (só a sala neste aparelho tem)', cria)
            await rt(A, "(() => { SX.criando = false; Object.assign(SX.form, {onde:'online', pub:false, n:2, map:0, jogo:'futebol', tempo:0, bots:true, nome:'Racha da Ana'}); sxCriar(); return 1; })()")
            cod = await espera(A, "NET49.room && NET49.room.code", 8000)
            await rt(B, "(() => { net49Send({type:'join', code:%s, slot:1}); return 1; })()" % json.dumps(cod))
            await rt(C, "(() => { net49Send({type:'join', code:%s, spectate:true}); return 1; })()" % json.dumps(cod))
            await espera(A, "NET49.room && NET49.room.members.length === 3", 8000)
            await asyncio.sleep(.8)
            sala = await rt(A, """(() => { const el = SL.el, r = NET49.room;
              return {bots:r.bots, regras:[...el.querySelectorAll('#sl-ops .sl-op')].map(x => x.dataset.k), vagas:[...el.querySelectorAll('.sl-vaga')].map(x => x.textContent),
                leg:(el.querySelector('.sl-legenda') || {}).textContent || '', apito:el.querySelectorAll('.sl-card .sl-arb:not(.p)').length,
                admBt:!!(el.querySelector('.v93-sl-adm') && !el.querySelector('.v93-sl-adm').hidden && el.querySelector('.v93-sl-adm').offsetParent)}; })()""")
            await foto(A, 'v103_sala.png')
            P.confere(sala['bots'] is False and 'bots' not in sala['regras'] and len(sala['regras']) >= 4, '1) a sala online não tem bots: o quadro BOTS saiu das regras', sala)
            P.confere(sala['vagas'] and all(v == 'VAGA LIVRE' for v in sala['vagas']), '1) as vagas sem gente dizem VAGA LIVRE (não BOT)', sala['vagas'])
            P.confere('ÁRBITRO: Ana' in sala['leg'] and 'apito' not in sala['leg'].lower() and 'partida rolando' in sala['leg'] and not sala['apito'] and not sala['admBt'],
                      '1) um árbitro só: a legenda sem o apito (vale com a partida rolando) e sem o botão ADMIN repetido', sala)
            # 2) a ficha do Beto
            await rt(A, "(() => { const c = [...document.querySelectorAll('#tela-sala .sl-card')].find(x => /Beto/.test(x.textContent)); c.click(); return 1; })()")
            await asyncio.sleep(.4)
            ficha = await rt(A, """(() => { const c = LB.popCaixa, bts = [...c.querySelectorAll('.lb-btn')];
              const vis = bts.every(b => { const r = b.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight && r.width > 40; });
              return {pop:!LB.pop.hidden, tit:(c.querySelector('h2') || {}).textContent, bts:bts.map(b => b.textContent), vis}; })()""")
            await foto(A, 'v103_ficha.png')
            P.confere(ficha['pop'] and ficha['bts'][:4] == ['MUDAR PARA O TIME B', 'PÔR NO BANCO', 'TORNAR ÁRBITRO', 'REMOVER DA SALA'] and ficha['bts'][-1] == 'CANCELAR'
                      and not any('APITO' in b for b in ficha['bts']) and ficha['vis'], '2) a FICHA do Beto: mudar de time, banco, tornar árbitro, remover e cancelar (sem o apito), tudo à vista', ficha)
            await rt(A, "(() => { fechaPop(); return 1; })()")
            # a vaga livre do Time B: quem entra?
            await rt(A, "(() => { const v = document.querySelector('#tela-sala #sl-c1 .sl-vaga'); v.click(); return 1; })()"); await asyncio.sleep(.4)
            qe = await rt(A, "(() => ({tit:(LB.popCaixa.querySelector('h2') || {}).textContent, bts:[...LB.popCaixa.querySelectorAll('.lb-btn')].map(b => b.textContent)}))()")
            await foto(A, 'v103_quem_entra.png')
            P.confere(qe['tit'] == 'QUEM ENTRA NO TIME B?' and any(b.startswith('Caio') for b in qe['bts']), '2) tocar na VAGA LIVRE do Time B pergunta quem entra (o Caio, que assiste)', qe)
            await rt(A, "(() => { [...LB.popCaixa.querySelectorAll('.lb-btn')].find(b => b.textContent.startsWith('Caio')).click(); return 1; })()")
            ok = await espera(A, "(() => { const r = NET49.room, c = r.members.find(m => m.name === 'Caio'); return c && c.slot >= 2; })()", 6000)
            P.confere(bool(ok), '2) o Caio entra no Time B pela vaga (o servidor confere: só a árbitra)')
            # 3) começa com um a menos
            await rt(A, "slIniciar()")
            ok = await espera(A, JOGA, 15000) and await espera(B, JOGA, 15000) and await espera(C, JOGA, 15000)
            for pg in pgs: await rt(pg, "(() => { filaPop.length = 0; if (!LB.pop.hidden) fechaPop(); return 1; })()")
            await asyncio.sleep(1.2)
            st = await rt(A, """(() => { const r = NET49.room, livre = r.roster.findIndex(x => !x); const q = RQ.jog[livre];
              const sx = W/2 + (q.x - cam.x)*cam.z, sy = H/2 + (q.y - cam.y)*cam.z;
              return {livre, fora:window.RachaSalas103.fora(), naTela:sx > -50 && sx < W + 50 && sy > -50 && sy < H + 50, n:RQ.jog.length, bots:RQ.jog.filter(x => x && x.bot && !x.fora).length,
                prev:!!(V92N.M && V92N.M.jog[livre] && V92N.M.jog[livre].fora)}; })()""")
            P.confere(ok and st['fora'] == [st['livre']] and not st['naTela'] and st['prev'], '3) começa com um a menos: a vaga vazia não tem bot, o quadro diz qual é (fora) e a tampinha não aparece', st)
            seta = await rt(A, """(() => { let n = 0; const m = marcadorFora; marcadorFora = function(){ n++; return m.apply(this, arguments); };
              try { const g = document.createElement('canvas').getContext('2d'); desenhaForaDaTela(g); } finally { marcadorFora = m; }
              const fora = RQ.jog.filter(q => q.fora).length; return {setas:n, fora}; })()""")
            P.confere(seta['fora'] == 1 and seta['setas'] <= 3, '3) a setinha de quem está fora da tela não aponta para a vaga vazia', seta)
            await foto(A, 'v103_jogo_um_a_menos.png')
            # 4) a Duda entra no meio da partida e a árbitra põe ela na vaga, sem reiniciar
            D = await sessao(pw, url, 'Duda', ws); pgs.append(D)
            await rt(D, "abreTela('amigos')"); await espera(D, "!!NET49.id", 10000)
            await rt(D, "(() => { net49Send({type:'join', code:%s}); return 1; })()" % json.dumps(cod))
            await espera(A, "NET49.room.members.some(m => m.name === 'Duda')", 8000)
            antes = await rt(A, "({placar:RQ.placar.slice(), round:NET49.room.round, tick:NET49.lastTick})")
            await rt(A, "(() => { const r = NET49.room; window.RachaArbitro103.ficha(r.members.find(m => m.name === 'Duda')); return 1; })()"); await asyncio.sleep(.4)
            fd = await rt(A, "(() => [...LB.popCaixa.querySelectorAll('.lb-btn')].map(b => b.textContent))()")
            await foto(A, 'v103_ficha_no_jogo.png')
            await rt(A, "(() => { [...LB.popCaixa.querySelectorAll('.lb-btn')].find(b => b.textContent === 'PÔR NO TIME B').click(); return 1; })()")
            okD = await espera(D, JOGA, 10000)
            await asyncio.sleep(1.0)
            depois = await rt(A, """(() => { const r = NET49.room, i = r.roster.indexOf(r.members.find(m => m.name === 'Duda').id), q = RQ.jog[i];
              return {i, fora:window.RachaSalas103.fora(), placar:RQ.placar.slice(), round:r.round, tick:NET49.lastTick, noCampo:q && q.x > LINHAS.x0 && q.x < LINHAS.x1 && q.y > LINHAS.y0 && q.y < LINHAS.y1}; })()""")
            P.confere('PÔR NO TIME B' in fd and okD and depois['fora'] == [] and depois['noCampo'] and depois['round'] == antes['round'] and depois['tick'] > antes['tick'],
                      '4) sem reiniciar: a Duda entra no meio da partida e a árbitra põe ela na vaga — a tampinha aparece no campo, a rodada é a mesma', [fd, antes, depois])
            # 5) o Beto sai: a vaga dele fica vazia
            await rt(B, "(() => { net49Send({type:'leave'}); return 1; })()")
            ok5 = await espera(A, "window.RachaSalas103.fora().length === 1", 8000)
            st5 = await rt(A, "(() => ({fora:window.RachaSalas103.fora(), bots:RQ.jog.filter(q => q && !q.fora && !q.netId && q !== P).length, painel:(window.V93P && V93P.painel) ? 1 : 0}))()")
            P.confere(bool(ok5) and st5['bots'] == 0, '5) o Beto sai no meio: a vaga dele fica vazia para todos (nenhum bot no lugar)', st5)
            # 6) a pausa da árbitra e o painel dos times
            await rt(A, "pausaAbre(); 1"); await asyncio.sleep(.4)
            pa = await rt(A, """(() => { const box = document.getElementById('pa-arb'), adm = document.getElementById('pa-adm');
              return {vis:box && !box.hidden, tit:(box.querySelector('.pa-arb-tit') || {}).textContent, bts:[...box.querySelectorAll('button')].map(b => b.textContent.trim()), dentro:!!(adm && box.contains(adm)),
                faixa:X49UI.netText ? X49UI.netText.textContent : ''}; })()""")
            await foto(A, 'v103_pausa.png')
            P.confere(pa['vis'] and pa['tit'].strip().endswith('VOCÊ É O ÁRBITRO') and pa['dentro'] and pa['bts'][0] == 'TIMES E JOGADORES' and 'PAUSAR PARA TODOS' in pa['bts'] and 'ENCERRAR PARTIDA' in pa['bts'],
                      '6) a pausa da árbitra: TIMES E JOGADORES, PAUSAR PARA TODOS e ENCERRAR PARTIDA juntos', pa)
            P.confere('árbitro' in pa['faixa'] and 'admin' not in pa['faixa'] and 'apito' not in pa['faixa'], '6) a faixa de cima diz "· árbitro" (sem "admin · apito")', pa['faixa'])
            await rt(A, "(() => { document.getElementById('pa-adm').click(); return 1; })()"); await asyncio.sleep(.5)
            pn = await rt(A, "(() => { const el = V93A.el; return {cab:el.querySelector('.v93-adm-cab b').textContent, bts:[...el.querySelectorAll('.v93-adm-bt')].map(b => b.textContent), nomes:[...el.querySelectorAll('.v93-adm-nome')].map(x => x.textContent)}; })()")
            await foto(A, 'v103_painel.png')
            P.confere(pn['cab'].startswith('ÁRBITRO') and 'OUTRO TIME' in pn['bts'] and 'BANCO' in pn['bts'] and 'MOVER' not in pn['bts'] and 'RESERVA' not in pn['bts'] and 'vaga livre' in pn['nomes'] and 'Bot' not in pn['nomes'],
                      '6) o painel dos times com os nomes novos (OUTRO TIME, BANCO, ÁRBITRO, vaga livre)', pn)
            erros = [e for pg in pgs for e in pg.erros if 'Failed to load resource' not in e]
            P.confere(not erros, 'nenhum erro de JavaScript', erros[:3])
            for pg in pgs: await pg.b.close()
    finally:
        srv.terminate(); prx.terminate()
    return P.fim()


if __name__ == '__main__':
    sys.exit(asyncio.run(principal()))
