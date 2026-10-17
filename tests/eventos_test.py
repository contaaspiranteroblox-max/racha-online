"""Etapa 5 · os eventos da plataforma (RACHA_EVT) uma vez por partida e a paridade da CURVA (anfitrião × convidado).

Eventos: contra os bots o começo vale quando a bola rola (não na apresentação dos times); o fim vai uma vez (vitória,
derrota ou abandono); sair da apresentação não manda nada; a sala neste aparelho também manda começo e fim.
Curva: o chute de curva de quem joga de fora (v70Remoto/v70CvChuta) dá o mesmo efeito do botão do anfitrião
(cvAmostra/cvChuta) com a mesma carga; o CHUTE comum do convidado sai reto (sem a curva automática da v61).
Rodar: python3 tests/eventos_test.py
"""
from comum import abre, rt, roda, Placar, async_playwright

EV = """(() => { window.__ev = []; window.RACHA_EVT = {inicio:d => window.__ev.push(['inicio', d]), fim:d => window.__ev.push(['fim', d]), treino:() => {}}; return true; })()"""
LISTA = "window.__ev.map(e => e[0] + (e[1].abandonada ? ':ab' : '') + (e[1].online ? ':on' : ''))"

async def principal():
    P = Placar('Etapa 5 · eventos uma vez por partida e a paridade da curva')
    async with async_playwright() as pw:
        b, pg, erros = await abre(pw, 1280, 720)
        await rt(pg, EV)
        print('\n1) contra os bots')
        await rt(pg, "(() => { X49.mode = 'casual'; X49.jogo = 'futebol'; rqComeca(1, 0); return true; })()")
        P.confere(await rt(pg, LISTA) == [], 'a apresentação dos times (VS) ainda não manda o começo')
        await rt(pg, "rqSai(); abrirLobby(); true")
        P.confere(await rt(pg, LISTA) == [], 'saiu na apresentação: nem começo nem fim')
        await rt(pg, "(() => { X49.mode = 'casual'; X49.jogo = 'curva'; rqComeca(2, 4); rqVsComeca(); rqVsComeca(); return true; })()")   # v70.2: COM CURVA no Estádio
        ev = await rt(pg, "window.__ev.slice()")
        P.confere([e[0] for e in ev] == ['inicio'] and ev[0][1]['modo'] == 'curva' and ev[0][1]['mapa'] == 'gramado' and ev[0][1]['tamanho'] == 2, 'a bola rolou: um começo com o modo e o mapa (rqVsComeca duas vezes não repete)', ev)
        await rt(pg, "(() => { RQ.placar = [3, 1]; RQ.estado = 'jogo'; rqFim(); rqEventos(); rqFechaConta(false); rqFechaConta(false); return true; })()")
        ev = await rt(pg, "window.__ev.slice()")
        P.confere([e[0] for e in ev] == ['inicio', 'fim'] and ev[1][1]['placarNosso'] == 3 and not ev[1][1]['abandonada'], 'acabou: um fim com o placar (fechar a conta de novo não repete)', ev)
        await rt(pg, "(() => { fechaFim(); rqDeNovo(); return true; })()")
        await rt(pg, "(() => { RQ.estado = 'jogo'; rqPedeSaida(); rqPedeSaida(); return true; })()")
        P.confere(await rt(pg, LISTA) == ['inicio', 'fim', 'inicio', 'fim:ab'], 'JOGAR DE NOVO e desistir no meio: começo e fim (abandonada)', await rt(pg, LISTA))
        await rt(pg, "(() => { fechaFim(); rqSai(); X49.mode = 'casual'; X49.jogo = 'futebol'; rqComeca(1, 0); rqVsComeca(); RQ.estado = 'jogo'; rqSai(); return true; })()")
        P.confere((await rt(pg, LISTA))[-2:] == ['inicio', 'fim:ab'], 'saiu da partida por outro caminho (sem desistir): o fim vai como abandono', await rt(pg, LISTA))
        print('\n2) a sala neste aparelho')
        await rt(pg, EV)
        await rt(pg, "(() => { abrirLobby(); abreTela('amigos'); slocCria({n:1, map:0, jogo:'curva', tempo:0, name:'Aqui'}); return true; })()")
        await pg.wait_for_timeout(200)
        await rt(pg, "(() => { v70SlMontaComBots(); return true; })()")
        await pg.wait_for_timeout(200)
        await rt(pg, "slIniciar()")
        await pg.wait_for_timeout(400)
        ev = await rt(pg, "window.__ev.slice()")
        P.confere([e[0] for e in ev] == ['inicio'] and not ev[0][1].get('online') and ev[0][1]['modo'] == 'curva', 'a partida da sala neste aparelho manda o começo (não é online)', ev)
        await rt(pg, "(() => { RQ.placar = [3, 1]; RQ.estado = 'jogo'; rqFim(); return true; })()")
        await pg.wait_for_timeout(900)
        P.confere(await rt(pg, LISTA) == ['inicio', 'fim'], 'e o fim, uma vez', await rt(pg, LISTA))
        await rt(pg, "(() => { if (fimAberto()) fechaFim(); net49Send({type:'leave'}); return true; })()")
        await pg.wait_for_timeout(300)
        print('\n3) a curva: o chute de quem joga de fora = o botão do anfitrião')
        r = await rt(pg, r"""(() => {
          const T = window.__T; abrirLobby(); T.comeca('curva', 1, 0); T.limpa();
          const q = T.bot(1); P.x = P.ax = CX - U(4); P.y = P.ay = CY; P.vx = P.vy = 0;
          const c = .6, mx = 0, my = -1;                       // a carga 60% e o analógico para cima
          // o anfitrião: o botão dele (cvChuta)
          T.cola(P, 1, 0); B.cvT = 0; cvChuta(c, mx, my); const h = {cv:B.cv, cvT:B.cvT, vx:B.vx, vy:B.vy};
          // quem joga de fora, na mesma posição: v70CvChuta
          T.limpa(); q.x = q.ax = CX - U(4); q.y = q.ay = CY; q.vx = q.vy = 0; q.remote = true; q.humano = false; T.cola(q, 1, 0); B.cvT = 0;
          const ok = v70CvChuta(q, c, mx, my); const g = {cv:B.cv, cvT:B.cvT, vx:B.vx, vy:B.vy};
          // o CHUTE comum dele sai reto (a curva automática da v61 saiu)
          T.limpa(); q.x = q.ax = CX - U(4); q.y = q.ay = CY; T.cola(q, 1, 0); B.cvT = 0; rqChuta(q, FORCA_POWER); const reto = B.cvT;
          // a carga: segurando k=1 por 30 passos, o anfitrião carrega o convidado como o botão dele (30 × STEP ÷ CV_CARGA_S)
          q.cv70 = null; const f = {}; for (let i = 0; i < 30; i++) v70Remoto(q, f, true, {k:1});
          return {ok, h, g, reto, carga:q.cv70.carga, esperado:Math.min(1, 30*STEP/CV_CARGA_S)};
        })()""")
        P.confere(r['ok'] and abs(r['h']['cv'] - r['g']['cv']) < 1e-9 and abs(r['h']['cvT'] - r['g']['cvT']) < 1e-9, 'mesma carga e mesmo analógico: o mesmo efeito (B.cv) e a mesma duração (B.cvT)', r)
        P.confere(abs(r['h']['vx'] - r['g']['vx']) < 1e-6 and abs(r['h']['vy'] - r['g']['vy']) < 1e-6, 'e a mesma força do chute', [r['h'], r['g']])
        P.confere(r['reto'] == 0, 'o CHUTE comum de quem joga de fora sai reto (sem curva automática invisível)', r['reto'])
        P.confere(abs(r['carga'] - r['esperado']) < 1e-9, 'segurar a CURVA no comando carrega igual ao botão do anfitrião (30 passos)', [r['carga'], r['esperado']])
        P.confere(not [e for e in erros if 'Failed to load' not in e], 'nenhum erro de JavaScript', erros[:3])
        await b.close()
    return P.fim()

if __name__ == '__main__':
    roda(principal())
