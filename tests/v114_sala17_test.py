"""RACHA v114 · a sala personalizada com até 17 pessoas (passa/falha, no navegador, com fotos em tests/saida/).
Com o servidor da turma de verdade (tests/servidor_visitantes.cjs): a Ana (o jogo de verdade) cria a sala online e mais 16
pessoas entram (conexões de verdade ao servidor, abertas pela própria página: cada uma se apresenta e entra na sala):
  1. cabem 17 (a Ana + 16), e a 18ª ouve "A sala está cheia (17 pessoas)";
  2. a tela da sala da Ana mostra todo mundo: os times e quem assiste (a coluna rola), no PC e no celular deitado;
  3. a partida começa com os times em campo e o resto assistindo; nenhum erro de JavaScript. ~30 s.
  python3 tests/v114_sala17_test.py"""
import asyncio, json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from comum import Placar, rt, async_playwright, RAIZ
from v93_fase3_test import sessao
from v92_hud_test import espera
from v92_online_test import sobe

SAIDA = RAIZ / 'tests' / 'saida'
JOGA = "NET49.playing && NET49.localSlot >= 0 && NET49.lastTick > 0"
ENTRAM = r"""((url, code, n) => { window.__G = []; window.__GE = [];
  for (let i = 0; i < n; i++) {
    const w = new WebSocket(url), nome = 'Gente' + String(i + 1).padStart(2, '0');
    w.onopen = () => { w.send(JSON.stringify({type:'hello', name:nome, skin:'', flag:'BR'})); setTimeout(() => w.send(JSON.stringify({type:'join', code, spectate:true})), 150 + 40 * i); };
    w.onmessage = e => { try { const m = JSON.parse(e.data); if (m.type === 'error') window.__GE.push([nome, m.text || m.msg || JSON.stringify(m)]); } catch (_) {} };
    window.__G.push(w);
  }
  return n; })"""


async def principal():
    P = Placar('v114 · a sala personalizada com até 17 pessoas')
    srv, prx, url, ws = sobe(False)
    pgs = []
    try:
        async with async_playwright() as pw:
            A = await sessao(pw, url, 'Ana', ws, 1280, 720); B = await sessao(pw, url, 'Beto', ws, 844, 390)
            pgs = [A, B]
            for pg in pgs: await rt(pg, "abreTela('amigos')")
            for pg in pgs: await espera(pg, "!!NET49.id", 10000)
            await rt(A, "(() => { SX.criando = false; Object.assign(SX.form, {onde:'online', pub:true, n:4, map:0, jogo:'futebol', tempo:0, bots:false, nome:'Racha dos 17'}); sxCriar(); return 1; })()")
            cod = await espera(A, "NET49.room && NET49.room.code", 8000)
            await rt(B, "(() => { net49Send({type:'join', code:%s, slot:4}); return 1; })()" % json.dumps(cod))
            await espera(A, "NET49.room && NET49.room.members.length === 2", 8000)
            await A.evaluate("(a) => (%s)(a[0], a[1], a[2])" % ENTRAM, [ws, cod, 15])
            ok = await espera(A, "NET49.room && NET49.room.members.length === 17", 12000)
            n = await rt(A, "NET49.room.members.length")
            P.confere(ok and n == 17, '1) cabem 17 pessoas na sala (a Ana, o Beto e mais 15)', n)
            await A.evaluate("(a) => (%s)(a[0], a[1], a[2])" % ENTRAM.replace("window.__G = []; window.__GE = [];", ""), [ws, cod, 1])
            await asyncio.sleep(1.2)
            r = await A.evaluate("() => ({erros: window.__GE, n: null})")
            n = await rt(A, "NET49.room.members.length")
            P.confere(n == 17 and any('A sala está cheia (17 pessoas)' in e[1] for e in r['erros']), '1) a 18ª pessoa ouve "A sala está cheia (17 pessoas)"', [n, r['erros'][-2:]])
            await asyncio.sleep(.6)
            for pg, nome in ((A, 'pc'), (B, 'celular')):
                v = await rt(pg, r"""(() => { const el = SL.el, nomes = [...el.querySelectorAll('.sl-card')].map(c => c.textContent);
                  const esp = el.querySelector('.sl-esp, #sl-esp, .sl-espectadores, [data-time="esp"]') || [...el.querySelectorAll('.sl-col')].find(c => !c.classList.contains('sl-time'));
                  const doc = document.documentElement;
                  return {cartoes:nomes.length, gente:nomes.filter(t => /Gente\d\d/.test(t)).length, ana:nomes.some(t => /Ana/.test(t)), beto:nomes.some(t => /Beto/.test(t)),
                    rola:esp ? esp.scrollHeight > esp.clientHeight + 2 && /auto|scroll/.test(getComputedStyle(esp).overflowY + getComputedStyle(esp.querySelector('.sl-caixa') || esp).overflowY) : null,
                    vazaX:doc.scrollWidth > doc.clientWidth + 1}; })()""")
                SAIDA.mkdir(parents=True, exist_ok=True)
                await pg.screenshot(path=str(SAIDA / ('v114_sala17_%s.png' % nome)))
                P.confere(v['cartoes'] >= 17 and v['gente'] == 15 and v['ana'] and v['beto'] and not v['vazaX'],
                          '2) a tela da sala (%s) mostra as 17 pessoas, sem vazar para o lado' % nome, v)
            await rt(A, "slIniciar()")
            ok = [await espera(pg, JOGA, 15000) for pg in (A, B)]
            r = await rt(A, "(() => ({jog:RQ.jog.filter(p => !p.fora).length, membros:NET49.room.members.length}))()")
            P.confere(all(ok) and r['membros'] == 17, '3) a partida começa (a Ana e o Beto jogam; os outros 15 assistem)', [ok, r])
            for pg in pgs:
                P.confere(not pg.erros, '3) nenhum erro de JavaScript (%s)' % ('Ana' if pg is A else 'Beto'), pg.erros[:2])
    finally:
        for p in (prx, srv):
            if p:
                p.terminate()
    return P.fim()


if __name__ == '__main__':
    sys.exit(asyncio.run(principal()))
