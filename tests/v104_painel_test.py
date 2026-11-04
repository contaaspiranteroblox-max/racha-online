"""RACHA v104 · o painel dos jogadores na partida e o árbitro arrastando (passa/falha). Com o servidor da turma de verdade
(tests/servidor_visitantes.cjs) e três navegadores numa sala 2v2 sem bots: a Ana (a árbitra, no computador), o Beto (no time B)
e o Caio (assistindo):
  1. o painel (o botão das pessoas) mostra os nomes e as vagas sem gente como VAGA LIVRE (antes: um "Jogador" de mentira);
  2. a árbitra vê a dica e o banco sempre à mão; o Beto (não é o árbitro) não vê a dica e segurar não faz nada;
  3. a Ana SEGURA o Caio (no banco) e solta numa VAGA LIVRE do time A: ele entra na hora, com a partida rolando;
  4. a Ana segura o Beto e solta no BANCO: ele vai para o banco (a vaga dele fica livre);
  5. a Ana segura o Beto (no banco) e solta em cima do Caio: o Beto entra no lugar e o Caio vai para o banco (troca);
  6. a Ana segura o Caio (no banco) e solta na cor do time B: ele entra na primeira vaga livre do time B;
  7. o placar e o relógio seguem (a partida não reinicia) e nenhum erro de JavaScript.
  python3 tests/v104_painel_test.py"""
import asyncio, json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from comum import Placar, rt
from v93_fase3_test import sessao
from v92_hud_test import espera
from playwright.async_api import async_playwright

JOGA = "NET49.playing && NET49.localSlot >= 0 && NET49.lastTick > 0"
SAIDA = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'saida')
LINHAS = """(() => { const p = V93P.el.p; if (!p || p.hidden) return null;
  const L = s => [...p.querySelectorAll(s)].map(li => ({t:(li.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 40), id:li.dataset.id || null, slot:li.dataset.slot != null ? +li.dataset.slot : null, vaga:li.classList.contains('v104-vaga')}));
  return {a:L('.v95-pj-t[data-time="0"] li'), b:L('.v95-pj-t[data-time="1"] li'), banco:L('.v95-pj-fora li'), dica:!!p.querySelector('.v104-dica'), bancoVazio:!!p.querySelector('.v104-banco-vazio')}; })()"""


async def centro(pg, sel):
    r = await pg.evaluate("s => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return [r.left + r.width/2, r.top + r.height/2]; }", sel)
    return r


async def arrasta(pg, de, para, segura=0.65, foto=None):
    a = await centro(pg, de); b = await centro(pg, para)
    if not a or not b: return False
    await pg.mouse.move(a[0], a[1]); await pg.mouse.down(); await asyncio.sleep(segura)
    for k in range(1, 11):
        await pg.mouse.move(a[0] + (b[0] - a[0])*k/10, a[1] + (b[1] - a[1])*k/10); await asyncio.sleep(.03)
    if foto: await pg.screenshot(path=foto)
    await pg.mouse.up(); await asyncio.sleep(.2)
    return True


async def principal():
    P = Placar('v104 · o painel dos jogadores e o árbitro arrastando')
    from v92_online_test import sobe
    srv, prx, url, ws = sobe(False)
    A = Bp = Cp = None
    try:
        async with async_playwright() as pw:
            A = await sessao(pw, url, 'Ana', ws); Bp = await sessao(pw, url, 'Beto', ws); Cp = await sessao(pw, url, 'Caio', ws)
            for pg in (A, Bp, Cp): await rt(pg, "abreTela('amigos')")
            for pg in (A, Bp, Cp): await espera(pg, "!!NET49.id", 10000)
            await rt(A, "(() => { Object.assign(SX.form, {onde:'online', pub:false, n:2, map:0, jogo:'futebol', tempo:0, nome:'v104 painel'}); sxCriar(); return 1; })()")
            cod = await espera(A, "NET49.room && NET49.room.code", 8000)
            await rt(A, "(() => { const b = document.querySelector('.v70-sl-atalhos .entrar'); if (b && !b.hidden) b.click(); return 1; })()")
            await rt(Bp, "(() => { net49Send({type:'join', code:%s, slot:2}); return 1; })()" % json.dumps(cod))
            await rt(Cp, "(() => { net49Send({type:'join', code:%s, spectate:true}); return 1; })()" % json.dumps(cod))
            await espera(A, "NET49.room && NET49.room.members.length === 3 && NET49.room.roster[0] === NET49.id && !!NET49.room.roster[2]", 8000)
            await rt(A, "slIniciar()")
            ok = await espera(A, JOGA, 12000) and await espera(Bp, JOGA, 12000)
            await espera(Cp, "NET49.playing && NET49.localSlot < 0", 10000)
            for pg in (A, Bp, Cp): await rt(pg, "(() => { filaPop.length = 0; if (!LB.pop.hidden) fechaPop(); return 1; })()")
            await rt(A, "(() => { net49Send({type:'__teste_gol', time:P.time}); return 1; })()")
            pl0 = await espera(A, "RQ.placar[0] + RQ.placar[1] === 1 ? RQ.placar.join('×') : ''", 6000)
            ids = {n: await rt(pg, "NET49.id") for n, pg in (('ana', A), ('beto', Bp), ('caio', Cp))}
            P.confere(ok and pl0 == '1×0', 'a sala 2v2 sem bots começa (Ana no A, Beto no B, Caio assistindo) e sai um gol (1 × 0)', [ok, pl0])

            # 1) o painel: os nomes e a VAGA LIVRE
            for pg in (A, Bp): await rt(pg, "(() => { v93PainelAlterna(true); return 1; })()")
            await asyncio.sleep(.6)
            la = await rt(A, LINHAS); lb = await rt(Bp, LINHAS)
            await A.screenshot(path=os.path.join(SAIDA, 'v104_painel_arbitro.png'))
            nomes = [x['t'] for x in la['a'] + la['b']]
            vagas = [x for x in la['a'] + la['b'] if x['vaga']]
            P.confere(la and any('Ana' in t for t in nomes) and any('Beto' in t for t in nomes) and len(vagas) == 2 and all('VAGA LIVRE' in v['t'] for v in vagas)
                      and not any('Jogador' in t for t in nomes) and any('Caio' in x['t'] for x in la['banco']),
                      '1) o painel mostra a Ana e o Beto nos times, o Caio no banco e as duas vagas sem gente como VAGA LIVRE (nenhum "Jogador" de mentira)', la)
            P.confere(la['dica'] and not lb['dica'], '2) a árbitra vê a dica (segure e arraste); o Beto não', [la['dica'], lb['dica']])
            # o Beto tenta arrastar a Ana: nada acontece
            await arrasta(Bp, '.v95-pj li[data-id="%s"]' % ids['ana'], '.v95-pj-fora')
            await asyncio.sleep(.8)
            r0 = await rt(A, "NET49.room.roster.slice()")
            P.confere(r0[0] == ids['ana'] and r0[2] == ids['beto'], '2) segurar no painel do Beto (não é o árbitro) não mexe em ninguém', r0)

            # 3) o Caio do banco para a VAGA LIVRE do time A (o lugar 1)
            await arrasta(A, '.v95-pj-fora li[data-id="%s"]' % ids['caio'], '.v95-pj li[data-slot="1"]', foto=os.path.join(SAIDA, 'v104_painel_arrastando.png'))
            c3 = await espera(Cp, "NET49.playing && NET49.localSlot === 1 ? 1 : 0", 6000)
            await asyncio.sleep(.5)
            await A.screenshot(path=os.path.join(SAIDA, 'v104_painel_entrou.png'))
            P.confere(c3 and (await rt(A, "NET49.room.roster[1]")) == ids['caio'], '3) a árbitra segura o Caio (banco) e solta na VAGA LIVRE do time A: ele entra na hora, com a partida rolando', c3)

            # 4) o Beto para o BANCO
            await asyncio.sleep(2.8)                              # (o servidor aceita 3 ações a cada 8 s)
            await arrasta(A, '.v95-pj li[data-id="%s"]' % ids['beto'], '.v95-pj-fora')
            b4 = await espera(Bp, "NET49.playing && NET49.localSlot < 0 ? 1 : 0", 6000)
            await asyncio.sleep(.5)
            l4 = await rt(A, LINHAS)
            P.confere(b4 and any(ids['beto'] == x['id'] for x in l4['banco']) and sum(1 for x in l4['b'] if x['vaga']) == 2,
                      '4) a árbitra segura o Beto e solta no BANCO: ele vai para o banco e o time B fica com as vagas livres', [b4, l4['b'], l4['banco']])

            # 5) o Beto (banco) em cima do Caio: trocam
            await asyncio.sleep(2.8)
            await arrasta(A, '.v95-pj-fora li[data-id="%s"]' % ids['beto'], '.v95-pj li[data-id="%s"]' % ids['caio'])
            b5 = await espera(Bp, "NET49.playing && NET49.localSlot === 1 ? 1 : 0", 6000)
            c5 = await espera(Cp, "NET49.playing && NET49.localSlot < 0 ? 1 : 0", 6000)
            P.confere(b5 and c5, '5) a árbitra solta o Beto (banco) em cima do Caio: o Beto entra no lugar e o Caio vai para o banco', [b5, c5])

            # 6) o Caio (banco) na cor do time B: a primeira vaga livre do B
            await asyncio.sleep(2.8)
            await asyncio.sleep(.4)
            ok6 = await arrasta(A, '.v95-pj-fora li[data-id="%s"]' % ids['caio'], '.v95-pj-t[data-time="1"] li[data-slot="2"]')
            c6 = await espera(Cp, "NET49.playing && NET49.localSlot >= 2 ? NET49.localSlot : 0", 6000)
            P.confere(ok6 and c6 in (2, 3), '6) a árbitra solta o Caio no time B: ele entra no time B (lugar %s)' % c6, c6)

            # 7) a partida seguiu
            pl = await rt(A, "RQ.placar.join('×')"); rel = await rt(A, "NET49.playing && RQ.estado !== 'fim'")
            erros = [e for pg in (A, Bp, Cp) for e in pg.erros if 'WebSocket' not in e]
            P.confere(pl == '1×0' and rel, '7) o placar continua (%s) e a partida segue (sem reiniciar)' % pl, [pl, rel])
            P.confere(not erros, '7) nenhum erro de JavaScript', erros[:3])
    finally:
        for pg in (A, Bp, Cp):
            if pg:
                try: await pg.b.close()
                except Exception: pass
        srv.terminate(); prx.terminate()
    return P.fim()


if __name__ == '__main__':
    sys.exit(asyncio.run(principal()))
