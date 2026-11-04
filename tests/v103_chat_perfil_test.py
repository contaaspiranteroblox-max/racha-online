"""RACHA v103 · o perfil pelo chat (passa/falha), com o jogo logado na plataforma de teste (o código de verdade de app/api
com SQLite e o servidor das salas montado no mesmo endereço) e duas contas em dois navegadores (a Ana e o Beto):
  1. o Beto escreve no Chat do Brasil; a Ana toca no nome dele: a ficha tem o VER PERFIL (o primeiro botão; antes só
     aparecia com o jogo dentro do site);
  2. o VER PERFIL abre o perfil do Beto DENTRO do jogo (o mesmo do RANKING e dos AMIGOS: o nome e o ID dele);
  3. tocar na tampinha da ficha também abre o perfil;
  4. a ficha de quem escreveu (a sua) não tem o VER PERFIL de outra pessoa (tem o MEU PERFIL de sempre);
  5. nenhum erro de JavaScript.
  python3 tests/v103_chat_perfil_test.py"""
import asyncio, json, os, sys, tempfile
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from comum import Placar, rt, async_playwright
from v88_cliente_test import Plataforma, conta, abre_logado, espera


async def principal():
    P = Placar('v103 · o perfil pelo chat')
    banco = os.path.join(tempfile.mkdtemp(prefix='racha103c-'), 'plataforma.sqlite')
    PL = Plataforma(banco).sobe()
    try:
        ana, beto = conta(PL, 'anav103'), conta(PL, 'betov103')
        async with async_playwright() as pw:
            bA, A, eA = await abre_logado(pw, PL, 'anav103')
            bB, B, eB = await abre_logado(pw, PL, 'betov103')
            for pg in (A, B):
                await rt(pg, "(() => { try { BRASIL.aberto = true; brasilConecta(); } catch (_) {} return 1; })()")
            await espera(A, "BRASIL.estado === 'on' || (BRASIL.ws && BRASIL.ws.readyState === 1)", 10000)
            await espera(B, "BRASIL.estado === 'on' || (BRASIL.ws && BRASIL.ws.readyState === 1)", 10000)
            await rt(B, "(() => { brasilSend({type:'brasil_say', text:'bora racha agora'}); return 1; })()")
            m = await espera(A, "(() => { const m = BRASIL.msgs.find(x => /bora racha/.test(x.texto || x.text || '')); return m ? JSON.stringify(m) : ''; })()", 10000)
            P.confere(bool(m), 'a mensagem do Beto chega no Chat do Brasil da Ana')
            await rt(A, "(() => { const m = BRASIL.msgs.find(x => /bora racha/.test(x.texto || x.text || '')); window.RachaChat81.abreFicha(m, false); return 1; })()")
            await asyncio.sleep(.3)
            fic = await rt(A, "(() => { const F = C81.ficha; return {vis:!!F && !F.hidden, bts:[...F.querySelectorAll('.c81-f-bt span')].map(s => s.textContent), id:(F.querySelector('.c81-f-tx small') || {}).textContent || ''}; })()")
            P.confere(fic['vis'] and fic['bts'] and fic['bts'][0] == 'VER PERFIL' and beto['pub'] in fic['id'], '1) a ficha do Beto (o nome no chat) tem o VER PERFIL, o primeiro botão', fic)
            await A.screenshot(path='tests/saida/v103_chat_ficha.png')
            await rt(A, "(() => { [...C81.ficha.querySelectorAll('.c81-f-bt')].find(b => /VER PERFIL/.test(b.textContent)).click(); return 1; })()")
            pf = await espera(A, "(() => { const c = LB.popCaixa; return !LB.pop.hidden && c.classList.contains('v88-perfil-pop') && /betov103/i.test(c.textContent || '') ? (c.textContent || '').slice(0, 200) : ''; })()", 10000)
            await A.screenshot(path='tests/saida/v103_chat_perfil.png')
            P.confere(bool(pf) and beto['pub'] in pf, '2) o VER PERFIL abre o perfil do Beto dentro do jogo (o nome e o ID dele)', pf)
            await rt(A, "(() => { fechaPop(); return 1; })()"); await asyncio.sleep(.2)
            await rt(A, "(() => { const m = BRASIL.msgs.find(x => /bora racha/.test(x.texto || x.text || '')); window.RachaChat81.abreFicha(m, false); return 1; })()"); await asyncio.sleep(.3)
            await rt(A, "(() => { C81.ficha.querySelector('.c81-f-tampa').click(); return 1; })()")
            pf2 = await espera(A, "(() => !LB.pop.hidden && LB.popCaixa.classList.contains('v88-perfil-pop'))()", 8000)
            P.confere(bool(pf2), '3) tocar na tampinha da ficha também abre o perfil')
            await rt(A, "(() => { fechaPop(); return 1; })()")
            await rt(A, "(() => { brasilSend({type:'brasil_say', text:'eu mesma aqui'}); return 1; })()")
            await espera(A, "BRASIL.msgs.some(x => /eu mesma/.test(x.texto || x.text || ''))", 8000)
            eu = await rt(A, "(() => { const m = BRASIL.msgs.find(x => /eu mesma/.test(x.texto || x.text || '')); window.RachaChat81.abreFicha(m, false); return [...C81.ficha.querySelectorAll('.c81-f-bt span')].map(s => s.textContent); })()")
            await rt(A, "(() => { [...C81.ficha.querySelectorAll('.c81-f-bt')].find(b => /PERFIL/.test(b.textContent)).click(); return 1; })()")
            meu = await espera(A, "lobby.tela === 'perfil'", 6000)
            P.confere(('VER PERFIL' in eu or 'MEU PERFIL' in eu) and not any(x in eu for x in ('SILENCIAR', 'DENUNCIAR')) and bool(meu), '4) a ficha da sua mensagem abre o seu perfil do jogo (sem silenciar nem denunciar)', [eu, meu])
            await rt(A, "(() => { if (lobby.tela) fechaTela(); return 1; })()")
            # 5) na partida: o perfil por cima do jogo (a sala de verdade da plataforma, Ana × Beto)
            for pg in (A, B): await rt(pg, "abreTela('amigos')")
            await espera(A, "!!NET49.id", 10000); await espera(B, "!!NET49.id", 10000)
            await rt(A, "(() => { Object.assign(SX.form, {onde:'online', pub:false, n:1, map:0, jogo:'futebol', tempo:0, nome:'perfil'}); sxCriar(); return 1; })()")
            cod = await espera(A, "NET49.room && NET49.room.code", 8000)
            await rt(B, "(() => { net49Send({type:'join', code:%s, slot:1}); return 1; })()" % json.dumps(cod))
            await espera(A, "NET49.room && NET49.room.roster.every(Boolean)", 8000)
            await rt(A, "slIniciar()")
            jogando = await espera(A, "NET49.playing && NET49.localSlot >= 0 && !lobby.aberto", 15000)
            await espera(B, "NET49.playing && NET49.localSlot >= 0", 15000)
            await rt(B, "(() => { net49Send({type:'say', text:'passa a bola'}); return 1; })()")
            msg = await espera(A, "(() => { const l = (typeof SALA_CHAT !== 'undefined' && SALA_CHAT.msgs) || (NET49.chat || []); return 1; })()", 2000)
            await asyncio.sleep(1.0)
            vis = await rt(A, """(() => { const r = NET49.room, b = r.members.find(x => x.name !== NET49.name && x.id !== NET49.id);
              window.RachaChat81.abreFicha({id:b.id, name:b.name, text:'passa a bola', mid:'x'}, true);
              const k = [...C81.ficha.querySelectorAll('.c81-f-bt')].find(x => /VER PERFIL/.test(x.textContent)); if (!k) return {semBotao:true};
              k.click(); return {ok:1}; })()""")
            pj = await espera(A, """(() => { const p = LB.pop, c = LB.popCaixa; if (LB.raiz.hidden || p.hidden || !c.classList.contains('v88-perfil-pop')) return '';
              const r = c.getBoundingClientRect(); return r.width > 100 && r.top >= 0 && r.bottom <= innerHeight + 2 && NET49.playing && !lobby.aberto ? 'ok' : ''; })()""", 10000)
            await A.screenshot(path='tests/saida/v103_chat_perfil_partida.png')
            P.confere(bool(jogando) and vis.get('ok') and pj == 'ok', '5) na partida: o VER PERFIL abre o perfil por cima do jogo (antes não aparecia nada)', [jogando, vis, pj])
            await rt(A, "(() => { fechaPop(); return 1; })()"); await asyncio.sleep(.6)
            volta = await rt(A, "({raiz:LB.raiz.hidden, cls:LB.raiz.classList.contains('v103-pop-jogo'), jogando:NET49.playing})")
            P.confere(volta['raiz'] and not volta['cls'] and volta['jogando'], '5) fechar o perfil volta para a partida (a camada do lobby some de novo)', volta)
            erros = [e for e in eA + eB if 'Failed to load resource' not in e]
            P.confere(not erros, '6) nenhum erro de JavaScript', erros[:3])
            await bA.close(); await bB.close()
    finally:
        PL.desce()
    return P.fim()


if __name__ == '__main__':
    sys.exit(asyncio.run(principal()))
