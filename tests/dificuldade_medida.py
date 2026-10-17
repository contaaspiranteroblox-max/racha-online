"""Etapa 4 · medida da dificuldade dos bots (Fácil × Difícil) com partidas simuladas inteiras.

O "jogador" é a própria IA do jogo jogando no seu lugar (RQ.autoH), num nível fixo de referência; os bots (companheiro e
adversários) jogam no nível da partida. Para cada combinação: vitórias do seu time, gols a favor e contra, duração, gols de
saída (até 4 s depois da saída) e bola parada (mais de 3 s sem andar). Isto compara os níveis entre si: NÃO prova equilíbrio
contra pessoas (a IA de referência não joga como gente). Serve para ver se o Difícil é de fato mais difícil, e quanto.

Rodar:  python3 tests/dificuldade_medida.py [partidas por combinação, padrão 12]
"""
import sys, json
from comum import abre, rt, roda, Placar, async_playwright, RAIZ

JS = r"""((ref, nivel, n, mapa, semente) => {
  if (lobby.aberto){ lobby.aberto = false; LB.raiz.hidden = true; }
  let s = semente; const rnd = Math.random; Math.random = () => { s = (s*16807) % 2147483647; return (s - 1)/2147483646; };
  try {
    RQ.forcaNivel = nivel; X49.mode = 'casual'; X49.jogo = 'futebol'; rqComeca(n, mapa); rqVsComeca();
    ARB_PARADO = function(){ return true; }; RQ.autoH = true;
    const nvAntes = rqNv; rqNv = q => q === P ? RQ_NIVEIS[ref] : nvAntes(q);
    let saidaT = 0, golSaida = 0, parado = 0, paradas = 0, posse = [0, 0], fim = false, t = 0;
    for (; t < 60*60*8 && !fim; t++){
      guardaAnterior(); physicsStep(STEP, 0, 0);
      if (RQ.estado === 'saida') saidaT = RQ.tick;
      if (RQ.ev.gol >= 0 && RQ.tick - saidaT <= 4*60) golSaida++;
      if (RQ.estado === 'jogo'){
        if (Math.hypot(B.vx, B.vy) < U(.6)){ if (++parado === 180) paradas++; } else parado = 0;
        const u = RQ.toques[RQ.toques.length - 1]; if (u) posse[u.p.time]++;
      }
      rqEventos();
      if (RQ.estado === 'fim') fim = true;
    }
    rqNv = nvAntes;
    return {fim, placar:RQ.placar.slice(), seg:RQ.t, golSaida, paradas, posse0:posse[0]/Math.max(1, posse[0] + posse[1])};
  } finally { Math.random = rnd; RQ.forcaNivel = null; }
})"""


async def principal():
    N = int(sys.argv[1]) if len(sys.argv) > 1 else 12
    P = Placar('Etapa 4 · medida da dificuldade (partidas simuladas)')
    linhas = []
    async with async_playwright() as pw:
        b, pg, erros = await abre(pw, 1280, 720)
        res = {}
        for n in (1, 2):
            for ref in ('facil', 'dificil'):
                for nivel in ('facil', 'dificil'):
                    tot = {'v': 0, 'gf': 0, 'gc': 0, 'seg': 0.0, 'saida': 0, 'paradas': 0, 'posse': 0.0, 'fim': 0}
                    for i in range(N):
                        r = await rt(pg, JS + "(%s, %s, %d, %d, %d)" % (json.dumps(ref), json.dumps(nivel), n, i % 4, 7919*(i + 1) + 31*n))
                        tot['fim'] += r['fim']; tot['v'] += r['placar'][0] > r['placar'][1]; tot['gf'] += r['placar'][0]; tot['gc'] += r['placar'][1]
                        tot['seg'] += r['seg']; tot['saida'] += r['golSaida']; tot['paradas'] += r['paradas']; tot['posse'] += r['posse0']
                    res[(n, ref, nivel)] = tot
                    l = '%dv%d · referência %-7s × bots %-7s · vitórias %2d/%d · gols %.1f × %.1f · %4.0f s · gols de saída %.2f/partida · bola parada %.2f/partida · posse %2.0f%%' % (
                        n, n, ref, nivel, tot['v'], N, tot['gf']/N, tot['gc']/N, tot['seg']/N, tot['saida']/N, tot['paradas']/N, 100*tot['posse']/N)
                    print('  ' + l); linhas.append(l)
                    P.confere(tot['fim'] == N, '%dv%d %s×%s: todas as %d partidas terminaram' % (n, n, ref, nivel, N), tot)
        await b.close()
        for n in (1, 2):
            for ref in ('facil', 'dificil'):
                f, d = res[(n, ref, 'facil')], res[(n, ref, 'dificil')]
                P.confere(f['v'] >= d['v'] and f['gc'] <= d['gc'] + 1, '%dv%d · referência %s: contra o Fácil ganha mais (ou igual) e sofre menos do que contra o Difícil' % (n, n, ref), [f['v'], d['v'], f['gc'], d['gc']])
        rede = [e for e in erros if 'Failed to load resource' in e]
        P.confere(not [e for e in erros if e not in rede], 'nenhum erro de JavaScript', [e for e in erros if e not in rede][:3])
    (RAIZ / 'tests' / 'saida' / 'dificuldade.txt').write_text('\n'.join(linhas) + '\n', encoding='utf-8')
    return P.fim()


if __name__ == '__main__':
    roda(principal())
