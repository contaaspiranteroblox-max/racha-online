"""RACHA v93 · as correções da revisão no aparelho (passa/falha): o replay do gol online nunca fica parado na tela.
Com o servidor da turma de verdade (o replay ligado) e dois navegadores — Ana (a admin) e Beto — numa sala 1v1 hospedada:
  1. o gol: o replay passa nos dois;
  2. a Ana ENCERRA a partida no meio do replay: nos dois o replay acaba junto e a tela do fim abre (antes o replay ficava
     parado no último quadro, embaixo da tela do fim);
  3. de volta ao lobby, uma partida contra os bots começa sem nenhum replay pendurado da partida online.
  python3 tests/v93_revisao_cli_test.py"""
import asyncio, json, os, sys
from comum import Placar, rt, async_playwright
from v92_hud_test import espera


async def principal():
    P = Placar('v93 · as correções da revisão no aparelho (o replay online)')
    os.environ['RACHA_CONTAGEM_MS'] = '0'; os.environ['RACHA_REPLAY'] = '1'; os.environ['RACHA_REPLAY_MS'] = '7000'
    from v92_online_test import sobe, JOGA
    import v92_online_medidas as MED
    srv, prx, url, ws = sobe(False)
    A = Bp = None
    try:
        async with async_playwright() as pw:
            A = await MED.sessao(pw, url, 'Ana', ws); Bp = await MED.sessao(pw, url, 'Beto', ws)
            for pg in (A, Bp):
                await rt(pg, "abreTela('amigos')")
            await espera(A, "!!NET49.id", 10000); await espera(Bp, "!!NET49.id", 10000)
            await rt(A, "(() => { Object.assign(SX.form, {onde:'online', pub:false, n:1, map:0, jogo:'futebol', tempo:0, bots:false, nome:'v93 revisao'}); sxCriar(); return 1; })()")
            cod = await espera(A, "NET49.room && NET49.room.code", 8000)
            await rt(Bp, "(() => { net49Send({type:'join', code:%s, slot:1}); return 1; })()" % json.dumps(cod))
            await espera(A, "NET49.room && NET49.room.members.length === 2", 8000)
            await rt(A, "(() => { const b = document.querySelector('.v70-sl-atalhos .entrar'); if (b && !b.hidden) b.click(); return 1; })()")
            await espera(A, "NET49.room.roster.indexOf(NET49.id) >= 0 && NET49.room.roster.every(Boolean)", 8000)
            await rt(A, "slIniciar()")
            ok = await espera(A, JOGA, 14000) and await espera(Bp, JOGA, 14000)
            for pg in (A, Bp):
                await rt(pg, "(() => { filaPop.length = 0; if (!LB.pop.hidden) fechaPop(); return 1; })()")
            await asyncio.sleep(1.2)
            print('\n1) o gol e o replay')
            await rt(A, "(() => { net49Send({type:'__teste_gol', time:P.time}); return 1; })()")
            rep = [await espera(pg, "V93P.replay && RP.ativo ? 1 : 0", 9000, 60) for pg in (A, Bp)]
            P.confere(ok and all(rep), '1) o gol: o replay passa nos dois', [ok, rep])
            print('\n2) ENCERRAR no meio do replay')
            await asyncio.sleep(.5)
            await rt(A, "(() => { net49Send({type:'adm', acao:'encerrar'}); return 1; })()")
            fim = [await espera(pg, "!RP.ativo && fimAberto() ? 1 : 0", 8000, 60) for pg in (A, Bp)]
            est = [await rt(pg, "({rp:RP.ativo, rep:!!V93P.replay, fim:fimAberto()})") for pg in (A, Bp)]
            await A.screenshot(path='tests/saida/v93_revisao_encerrar.png')
            P.confere(all(fim), '2) a Ana encerra no meio do replay: nos dois o replay acaba junto e a tela do fim abre', est)
            print('\n3) de volta ao lobby: contra os bots, sem replay pendurado')
            await rt(Bp, "(() => { const b = fimEl('fim-lobby'); if (b) b.click(); return 1; })()")
            await espera(Bp, "lobby.aberto ? 1 : 0", 8000)
            await rt(Bp, "(() => { try { if (NET49.room) net49Send({type:'leave'}); } catch (_) {} return 1; })()")
            await asyncio.sleep(.6)
            await rt(Bp, "(() => { if (!lobby.aberto) abrirLobby(); X49.mode = 'casual'; x49Save(); x49Start(1, 0); return 1; })()")
            bots = await espera(Bp, "RQ.on && !NET49.playing ? 1 : 0", 8000)
            await asyncio.sleep(1.0)
            fant = await rt(Bp, "({rp:RP.ativo, rep:!!V93P.replay})")
            P.confere(bots and not fant['rp'] and not fant['rep'], '3) de volta ao lobby, a partida contra os bots começa sem replay pendurado', [bots, fant])
            erros = [e for pg in (A, Bp) for e in pg.erros if 'WebSocket' not in e]
            P.confere(not erros, 'nenhum erro de JavaScript', erros[:3])
    finally:
        for pg in (A, Bp):
            if pg:
                try: await pg.b.close()
                except Exception: pass
        srv.terminate(); prx.terminate()
    return P.fim()


if __name__ == '__main__':
    sys.exit(asyncio.run(principal()))
