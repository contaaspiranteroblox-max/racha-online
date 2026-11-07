"""RACHA v115 · a partida da sala personalizada limpa (passa/falha, no navegador, com fotos em tests/saida/).
Com o servidor da turma de verdade (tests/servidor_visitantes.cjs): a Ana (árbitra, joga, celular deitado 844 × 390), o Beto
(joga, PC 1280 × 720) e o Caio (assiste, celular deitado) numa sala online 1v1:
  1. a faixa de cima vira só os botões quadrados do lado da pausa (sem o texto "SALA … · árbitro"): quem joga tem o SALA;
     quem assiste tem SALA, CÂMERA e SAIR; nada encosta nos botões do placar (falas, jogadores, emoji) nem no PASSE;
  2. o FPS e o ping no canto de baixo à esquerda, com números;
  3. o SALA abre a sala; a CÂMERA troca quem ela acompanha; a pausa do árbitro fica só no aviso grande do meio da tela (sem
     repetir na faixa); o SAIR de quem assiste sai da sala;
  4. a ranqueada fica como antes (RANQUEADA ONLINE e o MENU, sem a caixinha do FPS);
  5. nenhum erro de JavaScript. ~50 s.
  python3 tests/v115_limpa_test.py"""
import asyncio, json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from comum import Placar, rt, async_playwright, RAIZ
from v93_fase3_test import sessao
from v92_hud_test import espera
from v92_online_test import sobe

SAIDA = RAIZ / 'tests' / 'saida'
JOGA = "NET49.playing && NET49.localSlot >= 0 && NET49.lastTick > 0"
VE = r"""(() => { const bar = X49UI.onlinebar, c = cv.getBoundingClientRect(), k = c.width/W, P = BTN_PAUSA;
  const pausa = {l:c.left + P.x*k, t:c.top + P.y*k, r:c.left + (P.x + P.w)*k, b:c.top + (P.y + P.h)*k};
  const vis = e => !!e && !e.hidden && !e.closest('[hidden]') && getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().width > 2;
  const bts = [...bar.querySelectorAll(':scope > button')].filter(vis).map(b => { const r = b.getBoundingClientRect(); return {id:b.id || b.className, l:r.left, t:r.top, r:r.right, b:r.bottom, nome:b.getAttribute('aria-label') || b.textContent}; });
  const obs = []; for (const o of [V93F.el.bt, V93P.el.bt, EMO106.el.bt]) if (vis(o)) { const r = o.getBoundingClientRect(); obs.push({l:r.left, t:r.top, r:r.right, b:r.bottom}); }
  try { if (controleVisivel('passe')) { const e = el('passe'); obs.push({l:c.left + (e.x - e.r)*k, t:c.top + (e.y - e.r)*k, r:c.left + (e.x + e.r)*k, b:c.top + (e.y + e.r)*k}); } } catch (_) {}
  const cruza = (a, o) => a.l < o.r && a.r > o.l && a.t < o.b && a.b > o.t;
  const fps = document.getElementById('v115-fps'), fr = fps.getBoundingClientRect();
  return {limpa:bar.classList.contains('v115-limpa'), texto:vis(X49UI.netText), txt:X49UI.netText.textContent, bts, pausa,
    junto:bts.length > 0 && bts.every(b => b.l >= pausa.r - 1 && b.l < pausa.r + 30 + bts.length*70 && b.t < pausa.b) || (bts.length > 0 && bts.every(b => b.t >= pausa.b - 1)),
    batem:bts.some(b => obs.some(o => cruza(b, o))) || bts.some(b => cruza(b, pausa)),
    fps:{vis:vis(fps), f:fps.querySelector('.v115-f').textContent, p:fps.querySelector('.v115-v').textContent, rot:[...fps.querySelectorAll('span')].map(s => s.textContent), l:fr.left, b:fr.bottom, alto:innerHeight}}; })()"""


async def principal():
    P = Placar('v115 · a partida da sala personalizada limpa')
    srv, prx, url, ws = sobe(False)
    pgs = []
    try:
        async with async_playwright() as pw:
            A = await sessao(pw, url, 'Ana', ws, 844, 390); B = await sessao(pw, url, 'Beto', ws, 1280, 720); C = await sessao(pw, url, 'Caio', ws, 844, 390)
            pgs = [A, B, C]
            for pg in pgs: await rt(pg, "abreTela('amigos')")
            for pg in pgs: await espera(pg, "!!NET49.id", 10000)
            await rt(A, "(() => { SX.criando = false; Object.assign(SX.form, {onde:'online', pub:false, n:1, map:0, jogo:'futebol', tempo:2, bots:false, nome:'Racha limpo'}); sxCriar(); return 1; })()")
            cod = await espera(A, "NET49.room && NET49.room.code", 8000)
            await rt(B, "(() => { net49Send({type:'join', code:%s, slot:1}); return 1; })()" % json.dumps(cod))
            await rt(C, "(() => { net49Send({type:'join', code:%s, spectate:true}); return 1; })()" % json.dumps(cod))
            await espera(A, "NET49.room && NET49.room.members.length === 3", 8000)
            await rt(A, "(() => { net49Send({type:'seat', team:0}); return 1; })()")
            await espera(A, "NET49.room.roster.every(Boolean)", 6000)
            await rt(A, "slIniciar()")
            ok = [await espera(pg, JOGA, 15000) for pg in (A, B)] + [await espera(C, "NET49.playing && NET49.lastTick > 0", 15000)]
            P.confere(all(ok), 'a partida começou (a Ana e o Beto jogam, o Caio assiste)', ok)
            await asyncio.sleep(2.4)
            SAIDA.mkdir(parents=True, exist_ok=True)
            for pg, nome in ((A, 'ana_celular'), (B, 'beto_pc'), (C, 'caio_assiste')):
                await pg.screenshot(path=str(SAIDA / ('v115_%s.png' % nome)))
            va, vb, vc = await rt(A, VE), await rt(B, VE), await rt(C, VE)
            for v, nome in ((va, 'Ana'), (vb, 'Beto')):
                P.confere(v['limpa'] and not v['texto'] and len(v['bts']) == 1 and v['bts'][0]['nome'] == 'Abrir a sala',
                          '1) %s (joga): sem o texto "SALA … · árbitro", só o botão SALA' % nome, v)
                P.confere(v['junto'] and not v['batem'], '1) %s: o botão fica do lado da pausa, sem encostar no placar, nas falas, no emoji nem no PASSE' % nome, v)
            P.confere(vc['limpa'] and not vc['texto'] and [b['id'] for b in vc['bts']] == ['v115-sala', 'x49-camera', 'v88-espec-sair'],
                      '1) o Caio (assiste): SALA, CÂMERA e SAIR, só os desenhos', vc['bts'])
            P.confere(vc['junto'] and not vc['batem'], '1) o Caio: a fila do lado da pausa, sem encostar em nada', vc)
            for v, nome in ((va, 'Ana'), (vb, 'Beto'), (vc, 'Caio')):
                f = v['fps']
                P.confere(f['vis'] and f['l'] < 40 and f['alto'] - f['b'] < 30 and f['rot'] == ['FPS', 'Ping'] and f['f'].isdigit() and int(f['f']) > 5 and f['p'].isdigit() and int(f['p']) > 0,
                          '2) %s: o FPS e o ping no canto de baixo à esquerda' % nome, f)
            # 3) os botões
            await rt(A, "(() => { X49UI.onlinebar.querySelector('button.v115-sala').click(); return 1; })()"); await asyncio.sleep(.4)
            r = await rt(A, "(() => ({aberta:!!(SJ.raiz && !SJ.raiz.hidden)}))()")
            P.confere(r['aberta'], '3) o SALA abre a sala', r)
            await rt(A, "(() => { salaJogoFecha(); return 1; })()"); await asyncio.sleep(.3)
            a0 = await rt(C, "ESPEC.alvo")
            await rt(C, "(() => { document.getElementById('x49-camera').click(); return 1; })()"); await asyncio.sleep(.3)
            a1 = await rt(C, "ESPEC.alvo")
            P.confere(a0 == -1 and a1 != -1, '3) a CÂMERA do Caio troca quem ela acompanha (da bola para um jogador)', [a0, a1])
            await rt(A, "(() => { arbPausa(true); return 1; })()")
            ok = await espera(B, "/PAUSADA/.test(X49UI.netText.textContent)", 5000)
            await asyncio.sleep(.5)
            r = await rt(B, "(() => ({faixa:getComputedStyle(X49UI.netText).display !== 'none', aviso:X49UI.onlinebar.classList.contains('v115-aviso'), pausada:!!(ARB.pausado || NET49.paused)}))()")
            await B.screenshot(path=str(SAIDA / 'v115_beto_pausada.png'))
            P.confere(ok and r['pausada'] and not r['faixa'] and not r['aviso'], '3) a pausa do árbitro: o Beto vê o aviso grande da pausa, sem repetir o texto na faixa', r)
            await rt(A, "(() => { arbPausa(false); return 1; })()")
            ok = await espera(B, "!/PAUSADA/.test(X49UI.netText.textContent)", 6000)
            P.confere(ok, '3) o jogo voltou')
            await rt(C, "(() => { document.getElementById('v88-espec-sair').click(); return 1; })()")
            ok = await espera(C, "!NET49.playing", 6000)
            r = await rt(C, "(() => ({limpa:X49UI.onlinebar.classList.contains('v115-limpa'), barra:!X49UI.onlinebar.hidden, fps:!document.getElementById('v115-fps').hidden}))()")
            P.confere(ok and not r['barra'] and not r['fps'], '3) o SAIR do Caio sai da partida (a faixa e o FPS somem)', r)
            for pg, nome in ((A, 'Ana'), (B, 'Beto'), (C, 'Caio')):
                P.confere(not pg.erros, '5) nenhum erro de JavaScript (%s)' % nome, pg.erros[:2])
            for pg in pgs:
                await pg.b.close()
            # 4) a ranqueada
            R = await sessao(pw, url, 'Rui', ws, 844, 390)
            pgs = [R]
            await rt(R, "abreTela('amigos')"); await espera(R, "!!NET49.id", 10000)
            await rt(R, "(() => { abrirLobby(); net49Send({type:'fila', n:1, pts:0}); return 1; })()"); await asyncio.sleep(.5)
            await rt(R, "(() => { net49Send({type:'fila_bots'}); return 1; })()")
            ok = await espera(R, JOGA, 15000)
            await rt(R, "(() => { filaPop.length = 0; if (!LB.pop.hidden) fechaPop(); return 1; })()")
            await asyncio.sleep(1.5)
            r = await rt(R, "(() => ({ranked:!!(NET49.room && NET49.room.ranked), limpa:X49UI.onlinebar.classList.contains('v115-limpa'), txt:X49UI.netText.textContent, menu:X49UI.onlinebar.querySelector('button').textContent, fps:!document.getElementById('v115-fps').hidden}))()")
            P.confere(ok and r['ranked'] and not r['limpa'] and r['txt'].startswith('RANQUEADA ONLINE') and r['menu'] == 'MENU' and not r['fps'],
                      '4) a ranqueada fica como antes (RANQUEADA ONLINE e o MENU, sem a caixinha do FPS)', r)
            P.confere(not R.erros, '5) nenhum erro de JavaScript (a ranqueada)', R.erros[:2])
    finally:
        for p in (prx, srv):
            if p:
                p.terminate()
    return P.fim()


if __name__ == '__main__':
    sys.exit(asyncio.run(principal()))
