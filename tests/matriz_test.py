"""Etapa 6 · a matriz: os modos × os mapas × 1v1 a 4v4 e os sete treinos, pelo caminho de verdade (JOGAR com o modo,
o mapa e o tamanho; o laço do jogo rodando, bots decidindo, teclado de verdade). v70.2: ficaram 2 modos (FUTEBOL e COM
CURVA) e 2 mapas (a ARENA e o ESTÁDIO de grama): 16 partidas.

Em cada partida: abre com 2n jogadores no mapa e no modo pedidos e com a meta do modo; a seta segurada (para longe do
meio: na saída do adversário o círculo é dele) move a sua tampinha; com a bola livre (a regra dos 8 s sem saída) os bots
se mexem; a sua tampinha fica dentro da tela; nenhum erro de JavaScript.
Em cada treino: abre, sai do cartão de abertura sozinho (os exercícios), a tampinha anda e nenhum erro.

Isto prova que tudo ABRE e RESPONDE. Não prova equilíbrio, desempenho em celular nem que cada jogada dá certo.
Rodar: python3 tests/matriz_test.py   (≈ 1 min; as fotos de cada modo e mapa ficam em tests/saida/e6_modo_*.png)
"""
import sys
from comum import abre, rt, roda, Placar, async_playwright, RAIZ

MODOS = ['futebol', 'curva']                          # v70.2: os modos que ficaram (os outros estão guardados no código)
META = {'futebol': 3, 'curva': 3}
MAPAS = [(0, 'Arena'), (4, 'Estádio')]                 # v70.2: a Arena e o Estádio de grama (índice 4 do CAMPOS)
CAMPO_ID = {0: 'arena', 4: 'estadio'}
SAIDA = RAIZ / 'tests' / 'saida'

COMECA = """(() => {
  if (typeof fimAberto === 'function' && fimAberto()) fechaFim();
  if (RQ.on) rqSai();
  abrirLobby();
  for (const m of ['curva']) if (CONTA.vistos.indexOf('intro:' + m) < 0) CONTA.vistos.push('intro:' + m);
  X49.mode = 'casual'; X49.jogo = '%s';
  x49Start(%d, %d); rqVsComeca();
  return {jogo:RQ.jogo, n:RQ.jog.length, campo:CAMPO.id, esperado:CAMPOS[%d].id, meta:RQ.meta, lobby:lobby.aberto, est:RQ.estado};
})()"""
POS = "({cx:CX, x:P.x, y:P.y, bots:RQ.jog.filter(q => q !== P).map(q => [q.x, q.y]), est:RQ.estado, z:cam.z, sx:W/2 + (P.x - cam.x)*cam.z, sy:H/2 + (P.y - cam.y)*cam.z, W, H, u:U(1)})"


async def principal():
    so = sys.argv[1:] or MODOS
    P = Placar('Etapa 6 · matriz: 2 modos × 2 mapas × 1v1–4v4 e os 7 treinos')
    async with async_playwright() as pw:
        b, pg, erros = await abre(pw, 1280, 720)
        for md in [m for m in MODOS if m in so]:
            print('\n· ' + md)
            for mapa, nome_mapa in MAPAS:
                falhas, linha = [], []
                for n in range(1, 5):
                    e0 = len(erros)
                    a = await rt(pg, COMECA % (md, n, mapa, mapa))
                    if a['jogo'] != md or a['n'] != 2*n or a['campo'] != a['esperado'] or a['meta'] != META[md] or a['lobby']:
                        falhas.append('%dv%d abriu errado %s' % (n, n, a)); continue
                    t0 = await rt(pg, "RQ.tick")                 # (os mapas desenhados pintam o cenário na primeira vez: espera o jogo andar)
                    for _ in range(40):
                        if await rt(pg, "RQ.tick") >= t0 + 12: break
                        await pg.wait_for_timeout(100)
                    await pg.focus('#c')
                    p0 = await rt(pg, POS)
                    seta = 'ArrowLeft' if p0['x'] < p0['cx'] else 'ArrowRight'   # para longe do meio: na saída do adversário o círculo é dele
                    await pg.keyboard.down(seta); await pg.wait_for_timeout(700); await pg.keyboard.up(seta)
                    p1 = await rt(pg, POS)
                    await rt(pg, "(() => { if (RQ.estado === 'saida') RQ.estado = 'jogo'; return true; })()")   # (a regra dos 8 s sem saída: a bola fica livre)
                    await pg.wait_for_timeout(1300)
                    p2 = await rt(pg, POS)
                    andou = abs(p1['x'] - p0['x']) + abs(p1['y'] - p0['y'])
                    bots = max([abs(q2[0] - q1[0]) + abs(q2[1] - q1[1]) for q1, q2 in zip(p1['bots'], p2['bots'])] or [0])
                    na_tela = 0 <= p2['sx'] <= p2['W'] and 0 <= p2['sy'] <= p2['H']
                    novos = [x for x in erros[e0:] if 'Failed to load' not in x]
                    linha.append('%dv%d: andou %.1fu, bots %.1fu, %s' % (n, n, andou/p0['u'], bots/p0['u'], p2['est']))
                    if andou < p0['u'] or bots < p0['u']*.5 or not na_tela or novos:
                        falhas.append('%dv%d andou=%.1f bots=%.1f tela=%s erros=%s' % (n, n, andou/p0['u'], bots/p0['u'], na_tela, novos[:1]))
                    if n == 2:
                        await pg.screenshot(path=str(SAIDA / ('e6_modo_%s_%s.png' % (md, CAMPO_ID[mapa]))))
                print('   mapa %d: %s' % (mapa, ' · '.join(linha)))
                P.confere(not falhas, '%-9s %-8s 1v1 a 4v4: abre certo, a tampinha anda, os bots jogam, você na tela' % (md, nome_mapa), falhas)
        await rt(pg, "(() => { if (RQ.on) rqSai(); abrirLobby(); return true; })()")

        print('\n· os sete treinos')
        for tid in ['livre', 'cruz', 'dom', 'passe', 'tabela', 'final', 'cond']:
            e0 = len(erros)
            a = await rt(pg, "(() => { if (RQ.on) rqSai(); abrirLobby(); trEscolhe('%s'); jogarTreino(); return {id:TR.id, on:TR.on, fase:TR.fase, lobby:lobby.aberto}; })()" % tid)
            await pg.wait_for_timeout(3200)                 # o cartão de abertura dura 2,5 s
            f = await rt(pg, "({fase:TR.fase, on:TR.on, x:P.x, u:U(1)})")
            await pg.focus('#c')
            await pg.keyboard.down('ArrowUp'); await pg.wait_for_timeout(600); await pg.keyboard.up('ArrowUp')
            g = await rt(pg, "({x:P.x, y:P.y})")
            await pg.keyboard.down('ArrowDown'); await pg.wait_for_timeout(600); await pg.keyboard.up('ArrowDown')
            h = await rt(pg, "({x:P.x, y:P.y})")
            andou = abs(h['y'] - g['y']) + abs(g['x'] - f['x'])
            novos = [x for x in erros[e0:] if 'Failed to load' not in x]
            ok = a['id'] == tid and not a['lobby'] and (tid == 'livre' or (a['on'] and f['fase'] != 'intro')) and andou > f['u'] and not novos
            P.confere(ok, 'treino %-7s abre%s e a tampinha anda (%.1f u)' % (tid, '' if tid == 'livre' else ', passa da abertura (' + f['fase'] + ')', andou/f['u']), [a, f, novos[:1]])
        await rt(pg, "(() => { abrirLobby(); return true; })()")
        P.confere(not [e for e in erros if 'Failed to load' not in e], 'nenhum erro de JavaScript em toda a matriz', erros[:3])
        await b.close()
    return P.fim()


if __name__ == '__main__':
    roda(principal())
