"""RACHA v104 · o RANKING abre onde tem gente (passa/falha), com o jogo logado na plataforma de teste (o código de verdade de
app/api com SQLite; o servidor de teste agora entrega o null como a produção):
  1. a caixa de entrada (o correio e as mensagens) abre — a mensagens.listar sem entrada era o "expected object, received null";
  2. só com GOLS na temporada (ninguém jogou a ranqueada): o RANKING abre e, com a aba de PONTOS RANQUEADOS vazia, vai sozinho
     para GOLS, com o jogador no TOP;
  3. escolhida uma aba pela pessoa, ele não troca mais sozinho;
  4. nenhum erro de JavaScript.
  python3 tests/v104_ranking_test.py"""
import asyncio, os, sys, tempfile, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from comum import Placar, rt, async_playwright
from v88_cliente_test import Plataforma, conta, abre_logado, espera


async def principal():
    P = Placar('v104 · o correio de verdade e o ranking que abre onde tem gente')
    banco = os.path.join(tempfile.mkdtemp(prefix='racha104r-'), 'plataforma.sqlite')
    PL = Plataforma(banco).sobe()
    try:
        ana = conta(PL, 'anav104')
        t = PL.q('ranking.temporadas', None, ana['token'])
        L = t.get('lista') if isinstance(t, dict) else t
        tid = (L[0] if isinstance(L, list) and L else {}).get('id', 'T1')
        uid = PL.sql("SELECT id FROM usuarios WHERE username = ?", ['anav104'])[0]['id']
        agora = int(time.time()*1000)
        PL.sql("INSERT INTO ranking_sazonal (temporada, usuario_id, gols, assistencias, craques, partidas, gols_em, assistencias_em, craques_em, atualizado_em) VALUES (?, ?, 4, 0, 0, 2, ?, ?, ?, ?)", [tid, uid, agora, agora, agora, agora])
        async with async_playwright() as pw:
            bA, A, eA = await abre_logado(pw, PL, 'anav104')
            # 1) a caixa de entrada
            await rt(A, "(() => { document.querySelector('#lb .v88-caixa').click(); return 1; })()")
            cx = await espera(A, "v88Aberta('v88caixa') && Array.isArray(V88M.cartas) && Array.isArray(V88M.msgs) && !document.querySelector('#tela-v88caixa .v88-erro') ? V88M.cartas.length + V88M.msgs.length + 1 : 0", 8000)
            await asyncio.sleep(.4)
            await A.screenshot(path=os.path.join(os.path.dirname(os.path.abspath(__file__)), 'saida', 'v104_caixa.png'))
            P.confere(bool(cx), '1) a CAIXA DE ENTRADA abre (as cartas e as mensagens; antes: "expected object, received null")', cx)
            await rt(A, "(() => { if (lobby.tela) fechaTela(); return 1; })()")
            # 2) o ranking: PONTOS vazio → GOLS
            await rt(A, "(() => { V90RK.cat = 'pontos'; V90RK.dados = {}; abreTela('ranking'); return 1; })()")
            g = await espera(A, "V90RK.cat === 'gols' && !!document.querySelector('#tela-ranking .rk90-podio') ? (document.querySelector('#tela-ranking .rk90-podio').textContent || '').slice(0, 200) : ''", 10000)
            await A.screenshot(path=os.path.join(os.path.dirname(os.path.abspath(__file__)), 'saida', 'v104_ranking.png'))
            P.confere(bool(g) and 'anav104' in g.lower(), '2) o RANKING abre em PONTOS RANQUEADOS (vazia) e vai sozinho para GOLS, com a Ana no TOP', g)
            # 3) a pessoa escolhe a aba: fica
            await rt(A, "(() => { const b = [...document.querySelectorAll('#tela-ranking .rk90-aba')].find(x => /CRAQUE/.test(x.textContent)); if (b) b.click(); return 1; })()")
            await asyncio.sleep(2.0)
            c = await rt(A, "V90RK.cat")
            P.confere(c == 'craque', '3) escolhida a aba CRAQUE DO JOGO (vazia), ela fica (não troca sozinha)', c)
            erros = [e for e in eA if 'Failed to load resource' not in e]
            P.confere(not erros, '4) nenhum erro de JavaScript', erros[:3])
            await bA.close()
    finally:
        PL.desce()
    return P.fim()


if __name__ == '__main__':
    sys.exit(asyncio.run(principal()))
