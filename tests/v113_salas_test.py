"""RACHA v113 · as salas personalizadas com 10 minutos e a saída do Time Vermelho (passa/falha, no navegador).
Com o servidor da turma de verdade (tests/servidor_visitantes.cjs) e dois navegadores (a Ana, que cria, e o Beto):
  1. o CRIAR SALA tem os 10 minutos no TEMPO; a sala online de 10 minutos mostra "10 min" nas regras;
  2. COMEÇAR: a partida tem 10:00 no relógio (RQ.tempoLim = 600) e a saída é do Time Vermelho, nos dois aparelhos, com
     quem bate do Vermelho no lado esquerdo;
  3. a sala neste aparelho (sem internet) de 10 minutos também começa com a saída do Vermelho;
  4. nenhum erro de JavaScript. ~40 s.
  python3 tests/v113_salas_test.py"""
import asyncio, json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from comum import Placar, rt, async_playwright
from v93_fase3_test import sessao
from v92_hud_test import espera
from v92_online_test import sobe

JOGA = "NET49.playing && NET49.localSlot >= 0 && NET49.lastTick > 0"
SAIDA = """(() => { const v = RQ.jog.find(p => p.time === 0 && p.k === 0), a = RQ.jog.find(p => p.time === 1 && p.k === 0);
  return {estado:RQ.estado, saida:RQ.saidaTime, lim:RQ.tempoLim, vermX:v ? Math.round(v.x) : null, azulX:a ? Math.round(a.x) : null}; })()"""


async def principal():
    P = Placar('v113 · as salas personalizadas com 10 minutos e a saída do Vermelho')
    srv, prx, url, ws = sobe(False)
    pgs = []
    try:
        async with async_playwright() as pw:
            A = await sessao(pw, url, 'Ana', ws, 1280, 720); B = await sessao(pw, url, 'Beto', ws)
            pgs = [A, B]
            for pg in pgs: await rt(pg, "abreTela('amigos')")
            for pg in pgs: await espera(pg, "!!NET49.id", 10000)
            # 1) o CRIAR SALA: o TEMPO vai até 10 minutos
            r = await rt(A, "(() => ({lista:SL_TEMPOS.slice(), txt:slTempo(10, 'futebol')}))()")
            P.confere(r['lista'] == [0, 2, 3, 5, 10] and r['txt'] == '10 minutos', '1) o TEMPO da sala: sem tempo, 2, 3, 5 e 10 minutos', r)
            await rt(A, "(() => { SX.criando = false; Object.assign(SX.form, {onde:'online', pub:false, n:1, map:0, jogo:'futebol', tempo:10, bots:false, nome:'Racha de 10'}); sxCriar(); return 1; })()")
            cod = await espera(A, "NET49.room && NET49.room.code", 8000)
            await rt(B, "(() => { net49Send({type:'join', code:%s, slot:1}); return 1; })()" % json.dumps(cod))
            await espera(A, "NET49.room && NET49.room.members.length === 2", 8000)
            await rt(A, "(() => { net49Send({type:'seat', team:0}); return 1; })()")
            await espera(A, "NET49.room.roster.indexOf(NET49.id) >= 0 && NET49.room.roster.every(Boolean)", 6000)
            await asyncio.sleep(.5)
            r = await rt(A, "(() => { const o = document.querySelector('#sl-ops .sl-op[data-k=\"tempo\"]'); return {tempo:NET49.room.tempo, txt:o ? o.textContent : ''}; })()")
            P.confere(r['tempo'] == 10 and '10 min' in r['txt'], '1) a sala online de 10 minutos: "10 min" nas regras', r)
            # 2) COMEÇAR
            await rt(A, "slIniciar()")
            ok = [await espera(pg, JOGA, 15000) for pg in (A, B)]
            P.confere(all(ok), '2) COMEÇAR: os dois jogam', ok)
            ea, eb = await rt(A, SAIDA), await rt(B, SAIDA)
            P.confere(ea['lim'] == 600 and eb['lim'] == 600, '2) a partida tem 10:00 de jogo (nos dois aparelhos)', [ea, eb])
            P.confere(ea['saida'] == 0 and eb['saida'] == 0, '2) a saída é do Time Vermelho (nos dois aparelhos)', [ea, eb])
            P.confere(ea['vermX'] is not None and ea['azulX'] is not None and ea['vermX'] < ea['azulX'], '2) quem bate a saída é do Vermelho, do lado esquerdo (o da Azul espera do outro lado)', ea)
            for pg in pgs:
                P.confere(not pg.erros, '4) nenhum erro de JavaScript (%s)' % ('Ana' if pg is A else 'Beto'), pg.erros[:2])
            for pg in pgs:
                await pg.b.close()
            pgs = []
            # 3) a sala neste aparelho
            L = await sessao(pw, url, 'Lia', ws)
            pgs = [L]
            await rt(L, "(() => { abreTela('amigos'); sxNovaSala(); Object.assign(SX.form, {onde:'aqui', jogo:'futebol', n:1, map:0, tempo:10}); amigosRender(); return 1; })()")
            await asyncio.sleep(.2)
            await rt(L, "(() => { document.querySelector('.sx-pe .sx-criar').click(); return 1; })()")
            ok = await espera(L, "NET49.room && NET49.room.local", 4000)
            await rt(L, "(() => { net49Send({type:'seat', team:0}); return 1; })()")
            await asyncio.sleep(.2)
            await rt(L, "slIniciar()")
            jog = await espera(L, "NET49.playing && RQ.on && (RQ.estado === 'saida' || RQ.estado === 'jogo')", 10000)
            e = await rt(L, SAIDA)
            e['local'], e['jogando'] = bool(ok), bool(jog)
            P.confere(ok and jog and e['lim'] == 600 and e['saida'] == 0 and e['vermX'] < e['azulX'], '3) a sala neste aparelho de 10 minutos também começa com a saída do Vermelho', e)
            P.confere(not L.erros, '4) nenhum erro de JavaScript (a sala neste aparelho)', L.erros[:2])
    finally:
        for p in (prx, srv):
            if p:
                p.terminate()
    return P.fim()


if __name__ == '__main__':
    sys.exit(asyncio.run(principal()))
