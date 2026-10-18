#!/usr/bin/env python3
"""RACHA v88 — tira do JOGO DE VERDADE a lista das peças da tampinha (bordas, formas, padrões e ícones, com a raridade e o
preço de cada uma) e grava em app/contracts/catalogo_tampinhas.json: é com ESSA lista que a plataforma confere cada compra
(o servidor nunca aceita o preço que vem do aparelho). Rode depois de mudar as peças da tampinha:
    python3 tools/aplicar_rua.py && python3 tools/v88/extrai_catalogo.py
O teste tests/v88_catalogo_test.py confere que o arquivo gravado é igual ao que o jogo tem (os dois lados não divergem)."""
import asyncio, json, sys, pathlib
RAIZ = pathlib.Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(RAIZ / 'tests'))
from comum import abre, rt, async_playwright   # noqa: E402

SAIDA = RAIZ / 'app' / 'contracts' / 'catalogo_tampinhas.json'
JS = """(() => {
  const L = [];
  const tipos = [['b', TP_BORDAS, 'Borda'], ['f', TP_FORMAS, 'Forma'], ['p', TP_PADROES, 'Padrão'], ['i', TP_ICONES, 'Ícone']];
  for (const [t, lista, nomeTipo] of tipos) for (const it of lista) {
    if (!it || !it.id || it.id === '--') continue;
    const pr = TP_PRECO[it.pr] || TP_PRECO.gratis;
    L.push({k: t + ':' + it.id, tipo: t, id: it.id, nome: String(it.nome || it.id), tipoNome: nomeTipo, raridade: it.pr, moedas: pr.m | 0, gemas: pr.g | 0, anim: !!(it.anim || it.cara)});
  }
  return {pecas: L, precos: TP_PRECO};
})()"""


async def extrai():
    async with async_playwright() as pw:
        b, pg, erros = await abre(pw)
        dados = await rt(pg, JS)
        await b.close()
    return dados


def gera(dados):
    pecas = sorted(dados['pecas'], key=lambda x: ('bfpi'.index(x['tipo']), x['k']))
    return {
        '_sobre': 'Gerado por tools/v88/extrai_catalogo.py a partir do jogo (TP_BORDAS, TP_FORMAS, TP_PADROES, TP_ICONES e TP_PRECO). '
                  'Não edite à mão: mude as peças no jogo e rode o script de novo.',
        'precos': {k: {'moedas': v['m'], 'gemas': v['g'], 'nome': v['nome']} for k, v in dados['precos'].items()},
        'pecas': pecas,
    }


if __name__ == '__main__':
    d = gera(asyncio.run(extrai()))
    SAIDA.write_text(json.dumps(d, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    pagas = [p for p in d['pecas'] if p['raridade'] != 'gratis']
    print('catálogo das tampinhas:', len(d['pecas']), 'peças (', len(pagas), 'pagas ) →', SAIDA.relative_to(RAIZ))
