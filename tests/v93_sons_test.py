"""RACHA v93 · FASE 7 — OS SONS (passa/falha, com as medidas impressas). O áudio de verdade do Chromium (Web Audio), com o
motor de som do jogo instrumentado por fora (o AudioContext gravando o que o jogo cria):
  1. o limitador no fim da cadeia (o compressor entre o volume geral e a saída);
  2. o ataque de cada som (o volume começa quase em zero e sobe em 2–3 ms: sem o estalo seco do começo);
  3. o chute varia um pouco a cada vez (±3,5%) e o passe tem o som dele (mais curto e mais redondo que o chute);
  4. os sons com notas não variam (a moeda continua afinada: 1320 e 1760 Hz);
  5. muitos sons de uma vez (300 chutes e toques seguidos): no máximo 32 tocando juntos, sem erro;
  6. o começo: o bip do 3, 2, 1 e o JÁ! na contagem de uma partida contra os bots;
  7. os volumes separados (MÚSICA e EFEITOS) continuam valendo.
  python3 tests/v93_sons_test.py"""
import asyncio, json, sys
from comum import Placar, rt, roda, async_playwright, CHROME, FONTES, PAGINA, HARNESS

INSTRUMENTA = r"""(() => {
  const A = window.__aud = {comp:0, osc:[], ganhos:[], vivos:0, pico:0, conexoes:[]};
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
  const P = AC.prototype;
  const cc = P.createDynamicsCompressor; P.createDynamicsCompressor = function(){ A.comp++; const n = cc.apply(this, arguments); n.__comp = true; return n; };
  const co = P.createOscillator; P.createOscillator = function(){ const o = co.apply(this, arguments); o.frequency.__osc = o; o.__reg = {f:null, t:performance.now()}; A.osc.push(o.__reg);
    const st = o.start; o.start = function(){ A.vivos++; A.pico = Math.max(A.pico, A.vivos); const fim = () => { A.vivos--; }; o.addEventListener('ended', fim); return st.apply(this, arguments); }; return o; };
  const cb = P.createBufferSource; P.createBufferSource = function(){ const s = cb.apply(this, arguments); const st = s.start; s.start = function(){ if (!s.loop){ A.vivos++; A.pico = Math.max(A.pico, A.vivos); s.addEventListener('ended', () => { A.vivos--; }); } return st.apply(this, arguments); }; return s; };
  const cg = P.createGain; P.createGain = function(){ const g = cg.apply(this, arguments); g.gain.__g = {v:[]}; A.ganhos.push(g.gain.__g); return g; };
  const sv = AudioParam.prototype.setValueAtTime; AudioParam.prototype.setValueAtTime = function(v){ if (this.__osc && this.__osc.__reg.f == null) this.__osc.__reg.f = v; if (this.__g && this.__g.v.length < 3) this.__g.v.push(['s', v]); return sv.apply(this, arguments); };
  const lr = AudioParam.prototype.linearRampToValueAtTime; AudioParam.prototype.linearRampToValueAtTime = function(v){ if (this.__g && this.__g.v.length < 3) this.__g.v.push(['l', v]); return lr.apply(this, arguments); };
  const cn = AudioNode.prototype.connect; AudioNode.prototype.connect = function(d){ if (this.__comp || (d && d.__comp)) A.conexoes.push((this.__comp ? 'comp→' : '') + (d && d.__comp ? '→comp' : (d instanceof AudioDestinationNode ? 'saida' : 'no'))); return cn.apply(this, arguments); };
})();"""


async def abre_som(pw):
    """o jogo com o Web Audio instrumentado ANTES de carregar (o motor de som nasce no primeiro toque)"""
    b = await pw.chromium.launch(executable_path=CHROME, args=['--no-sandbox', '--autoplay-policy=no-user-gesture-required'])
    ctx = await b.new_context(viewport={'width': 844, 'height': 390}, has_touch=True)
    await ctx.add_init_script("document.addEventListener('DOMContentLoaded',()=>{const s=document.createElement('style');s.textContent=%s;document.head.prepend(s);});" % json.dumps(FONTES))
    await ctx.add_init_script('window.RACHA_CONFIG = {presente:false};')
    await ctx.add_init_script(INSTRUMENTA)
    pg = await ctx.new_page()
    erros = []
    pg.on('pageerror', lambda e: erros.append(str(e)[:300]))
    await pg.goto(PAGINA.resolve().as_uri())
    await pg.wait_for_function('() => typeof window.__RT === "function"', polling=100, timeout=20000)
    await pg.wait_for_timeout(600)
    await pg.evaluate("(() => { const o = document.getElementById('onb'); if (o) o.hidden = true; })()")
    await pg.evaluate("(() => { const b = [...document.querySelectorAll('#v84auth button')].find(x => /TREINAR OFFLINE/.test(x.textContent || '')); if (b) b.click(); })()")
    await pg.wait_for_timeout(100)
    await rt(pg, HARNESS)
    return b, pg, erros


async def principal():
    P = Placar('v93 · Fase 7 · os sons')
    async with async_playwright() as pw:
        b, pg, erros = await abre_som(pw)
        await pg.mouse.click(420, 200); await pg.wait_for_timeout(300)
        await rt(pg, "som.iniciar(); 1"); await pg.wait_for_timeout(300)
        st = await rt(pg, "({comp:__aud.comp, con:__aud.conexoes.slice(), ok:typeof som.contagem === 'function'})")
        P.confere(st['comp'] >= 1 and 'comp→saida' in st['con'] and st['ok'], '1) o limitador no fim da cadeia: o volume geral → o compressor → a saída', st)

        # (tudo numa chamada só: a música do lobby, que continua tocando, não entra no meio das medidas)
        sx = await rt(pg, """(() => { const o0 = __aud.osc.length, g0 = __aud.ganhos.length;
          som.chute(true); const o1 = __aud.osc.length; som.chute(true); const o2 = __aud.osc.length; som.chute(false);
          const o3 = __aud.osc.length, g1 = __aud.ganhos.length;
          return {fA:__aud.osc[o0] && __aud.osc[o0].f, fB:__aud.osc[o1] && __aud.osc[o1].f, fP:__aud.osc[o2] && __aud.osc[o2].f, n:o3 - o0, g:__aud.ganhos.slice(g0, g1).map(x => x.v)}; })()""")
        g = sx['g']; fA, fB, fP = sx['fA'], sx['fB'], sx['fP']
        ataque = len(g) >= 6 and all(v and v[0][0] == 's' and v[0][1] <= 0.001 and len(v) > 1 and v[1][0] == 'l' for v in g)
        P.confere(ataque, '2) o ataque: cada som (%d volumes de 2 chutes e 1 passe) começa em 0,0001 e sobe em linha (2–3 ms) — sem o estalo seco do começo' % len(g), g[:3])
        P.confere(fA and fB and fA != fB and abs(fA/188 - 1) <= .036 and abs(fB/188 - 1) <= .036 and fP and fP > 200,
                  '3) o chute varia um pouco a cada vez (%.1f e %.1f Hz, em volta de 188) e o passe tem o som dele (%.1f Hz, mais redondo)' % (fA or 0, fB or 0, fP or 0), [fA, fB, fP])
        mo = await rt(pg, """(() => { const a = __aud.osc.length; som.moeda(); const b = __aud.osc.length; som.moeda(); const c = __aud.osc.length;
          return [__aud.osc.slice(a, b).map(o => o.f), __aud.osc.slice(b, c).map(o => o.f)]; })()""")
        m1, m2 = mo
        P.confere(m1 == m2 == [1320, 1760], '4) os sons com notas não variam (a moeda: %s e %s)' % (m1, m2), [m1, m2])

        await pg.wait_for_timeout(600)
        pk = await rt(pg, "(() => { const base = __aud.vivos; __aud.pico = base; for (let i = 0; i < 300; i++){ if (i % 3) som.toque(.8); else som.chute(i % 2 === 0); } return {base, pico:__aud.pico}; })()")
        pico = pk['pico']                                   # (na mesma chamada: depois, a música do lobby continua com as notas dela)
        await pg.wait_for_timeout(200)
        P.confere(pico - pk['base'] <= 32, '5) 300 chutes e toques seguidos: no máximo %d sons novos juntos (o limite é 32; já tocavam %d da música), sem erro' % (pico - pk['base'], pk['base']), pk)

        await rt(pg, "(() => { window.__cont = []; const c0 = som.contagem; som.contagem = function(n){ window.__cont.push(n); return c0.apply(this, arguments); }; if (!lobby.aberto) abrirLobby(); X49.mode = 'casual'; x49Save(); x49Start(1, 0); return 1; })()")
        await pg.wait_for_timeout(3800)
        cont = await rt(pg, "window.__cont")
        P.confere(cont == [3, 2, 1, 0], '6) a contagem contra os bots: o bip do 3, 2, 1 e o JÁ! (%s)' % cont, cont)

        mx = await rt(pg, "(() => { som.setMistura(30, 70); const o = JSON.parse(localStorage.getItem('racha88-som') || '{}'); return o; })()")
        P.confere(mx.get('mus') == 30 and mx.get('efx') == 70, '7) os volumes separados continuam: MÚSICA 30%, EFEITOS 70%', mx)
        P.confere(not [e for e in erros if 'Failed to load' not in e], 'nenhum erro de JavaScript', erros[:3])
        await b.close()
    return P.fim()


if __name__ == '__main__':
    roda(principal())
