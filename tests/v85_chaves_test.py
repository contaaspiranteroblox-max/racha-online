"""RACHA v85 · as chaves salvas do treino trocaram de prefixo (a etapa 3 da auditoria tirou o nome do outro jogo das chaves):
quem já tinha o jogo salvo não perde nada. Confere que o jogo leva, uma vez, o que estava nas chaves antigas
(<prefixo>-treino-perfil-v1, -hud-v11, -som-v1, -campo-v1, -modo-v1) para as novas (racha-treino-*), também dentro das
gavetas das contas (racha-guarda:*) e na cópia antiga da conta (RACHA82.migraChaves). O teste usa um prefixo neutro
("jogoantigo"): a regra reconhece a chave pelo formato, com qualquer prefixo que não seja racha-.
Uso: python3 tests/v85_chaves_test.py"""
import asyncio, json, sys
from comum import abre, rt, roda, Placar, async_playwright

PERFIL = json.dumps({'nome': 'Zeca', 'st': {'partidas': 7, 'concluidas': 6, 'vitorias': 4}})


async def principal():
    P = Placar('v85 · as chaves antigas do treino vão para as novas')
    async with async_playwright() as pw:
        # 1) o aparelho com as chaves antigas
        b, pg, erros = await abre(pw, 1280, 720, armazenamento={'jogoantigo-treino-perfil-v1': PERFIL, 'jogoantigo-treino-campo-v1': 'estadio',
                                                                 'racha-guarda:c999': json.dumps({'jogoantigo-treino-perfil-v1': '{"nome":"Outro"}', 'racha-tampa-v1': '{}'})})
        r = await rt(pg, "({nome:perfil.nome, partidas:perfil.st.partidas | 0, vit:perfil.st.vitorias | 0, campo:localStorage.getItem('racha-treino-campo-v1'),"
                         " velhas:Object.keys(localStorage).filter(k => /^jogoantigo-/.test(k)), migrou:window.RACHA82 && window.RACHA82.migrou,"
                         " gaveta:JSON.parse(localStorage.getItem('racha-guarda:c999') || 'null')})")
        P.confere(r['nome'] == 'Zeca' and r['partidas'] == 7 and r['vit'] == 4, 'o perfil antigo (nome e estatísticas) continua no jogo', r)
        P.confere(r['campo'] == 'estadio', 'o campo escolhido foi para a chave nova', r['campo'])
        P.confere(r['velhas'] == [] and r['migrou'] == 2, 'as chaves antigas saíram do aparelho (2 levadas)', r)
        g = r['gaveta'] or {}
        P.confere(g.get('racha-treino-perfil-v1') == '{"nome":"Outro"}' and 'jogoantigo-treino-perfil-v1' not in g and g.get('racha-tampa-v1') == '{}',
                  'a gaveta de outra conta neste aparelho também passou para os nomes novos', g)
        # a cópia antiga da conta (v82–v84) passa pelo mesmo mapa
        m = await rt(pg, "(() => { const o = {'jogoantigo-treino-perfil-v1':'p', 'jogoantigo-treino-hud-v11':'h', 'racha-tampa-v1':'t', 'streetball-treino-v1':'e'}; const mudou = RACHA82.migraChaves(o); return {mudou, o}; })()")
        P.confere(m['mudou'] and m['o'] == {'racha-treino-perfil-v1': 'p', 'racha-treino-hud-v11': 'h', 'racha-tampa-v1': 't', 'streetball-treino-v1': 'e'},
                  'a cópia da conta com os nomes antigos vira a de nomes novos (as outras chaves ficam como estão)', m)
        P.confere(not [e for e in erros if 'Failed to load resource' not in e], 'nenhum erro de JavaScript', erros[:3])
        await b.close()
        # 2) a chave nova já existe: ela fica (a antiga só sai)
        b, pg, erros = await abre(pw, 1280, 720, armazenamento={'jogoantigo-treino-perfil-v1': PERFIL, 'racha-treino-perfil-v1': json.dumps({'nome': 'Novo', 'st': {'partidas': 1}})})
        r = await rt(pg, "({nome:perfil.nome, velhas:Object.keys(localStorage).filter(k => /^jogoantigo-/.test(k))})")
        P.confere(r['nome'] == 'Novo' and r['velhas'] == [], 'com a chave nova já gravada, ela fica e a antiga sai', r)
        # 3) nada antigo: nada muda
        await b.close()
        b, pg, erros = await abre(pw, 1280, 720)
        r = await rt(pg, "({migrou:window.RACHA82 && window.RACHA82.migrou || 0, nome:perfil.nome})")
        P.confere(r['migrou'] == 0, 'sem chave antiga, nada é levado', r)
        await b.close()
    return P.fim()

if __name__ == '__main__':
    roda(principal())
