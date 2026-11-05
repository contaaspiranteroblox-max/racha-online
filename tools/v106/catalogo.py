#!/usr/bin/env python3
"""RACHA v106 · os itens novos no catálogo (app/contracts/catalogo88.json — o MESMO do jogo e da plataforma, que confere cada
compra pelo preço daqui): as 6 bolas novas (depois das bolas de sempre) e as 6 mascotes (as tampinhas à venda, depois das
tampinhas exclusivas do ranking). O arquivo é escrito à mão: este script só troca as linhas destes itens (tira as de antes e
põe as de agora, no formato de uma linha por item) e confere que continua um JSON certo. Rode de novo se mudar a lista:
    python3 tools/v106/catalogo.py && python3 tools/aplicar_rua.py && node tests/plataforma/compila.cjs
Os padrões das bolas (praia, chamas, galaxia) são desenhados em tools/v106/bolas.js; as caras das mascotes (ar, op, mi,
lg, tu, jc) e a borda Medalhão (mh), em tools/v106/mascotes.js e tools/v106/conteudo.js."""
import json, pathlib

RAIZ = pathlib.Path(__file__).resolve().parent.parent.parent
ARQ = RAIZ / 'app' / 'contracts' / 'catalogo88.json'

BOLAS = [
    {'id': 'bola_praia', 'tipo': 'bola', 'nome': 'Bola de Praia', 'raridade': 'raro', 'moedas': 3000, 'gemas': 0,
     'desc': 'Os gomos do futevôlei: vermelho, azul e amarelo girando na areia.',
     'visual': {'padrao': 'praia', 'base': '#ffffff', 'cores': ['#e8322e', '#ffffff', '#2f74d8', '#ffffff', '#ffd23f', '#ffffff'], 'linha': '#1b2233'}},
    {'id': 'bola_arraia', 'tipo': 'bola', 'nome': 'Bola do Arraiá', 'raridade': 'raro', 'moedas': 3000, 'gemas': 0,
     'desc': 'As cores das bandeirinhas da festa junina, gomo por gomo.',
     'visual': {'padrao': 'praia', 'base': '#fff4dc', 'cores': ['#e53935', '#fdd835', '#43a047', '#1e88e5', '#fb8c00', '#d81b60', '#8e24aa', '#00acc1'], 'linha': '#2a1a10'}},
    {'id': 'bola_fogo', 'tipo': 'bola', 'nome': 'Bola de Fogo', 'raridade': 'epico', 'moedas': 0, 'gemas': 60,
     'desc': 'Pegando fogo: as labaredas dão a volta na bola a cada chute.',
     'visual': {'padrao': 'chamas', 'base': '#2a0a06', 'cores': ['#ff4d1a', '#ffb21f', '#fff1a0'], 'linha': '#160402'}},
    {'id': 'bola_macarico', 'tipo': 'bola', 'nome': 'Bola Maçarico', 'raridade': 'epico', 'moedas': 0, 'gemas': 70,
     'desc': 'A chama azul do maçarico: mais quente que a de fogo.',
     'visual': {'padrao': 'chamas', 'base': '#08112e', 'cores': ['#2563ff', '#5fd3ff', '#f2fdff'], 'linha': '#02061a'}},
    {'id': 'bola_galaxia', 'tipo': 'bola', 'nome': 'Bola Galáxia', 'raridade': 'lendario', 'moedas': 0, 'gemas': 150,
     'desc': 'Uma galáxia inteira rolando no campo: a nebulosa, as estrelas e os brilhos.',
     'visual': {'padrao': 'galaxia', 'base': '#0d0a2a', 'cores': ['#b44dff', '#ff4fa3', '#3ad6ff', '#6b5cff'], 'linha': '#05040f', 'estrela': '#fff6dc'}},
    {'id': 'bola_sertao', 'tipo': 'bola', 'nome': 'Céu do Sertão', 'raridade': 'lendario', 'moedas': 0, 'gemas': 150,
     'desc': 'O céu do sertão sem luz nenhuma por perto: a Via Láctea dando a volta na bola.',
     'visual': {'padrao': 'galaxia', 'faixa': True, 'base': '#061633', 'cores': ['#ffe6b0', '#7fb6ff', '#1fd1c1'], 'linha': '#020a14', 'estrela': '#fff3d0'}},
]

def _d(cara, metal, filete):                           # a tampinha da mascote: a cara ocupando tudo e a borda Medalhão
    return {'d': {'p': 'li', 'pc': ['#0b0a10', '#ffffff', '#1d1d1d'], 'b': 'mh', 'bc': [metal, filete], 'i': cara, 'ic': ['#ffffff', '#1d1d1d'], 'ip': [50, 50, 50, 0], 'ie': 0}, 'mascote': cara}

VEM = ' Vem com a cara e a borda Medalhão para o CRIAR TAMPINHA.'
MASCOTES = [
    {'id': 'tp_m_arara', 'tipo': 'tampinha', 'nome': 'Arara Invocada', 'raridade': 'lendario', 'moedas': 0, 'gemas': 150,
     'desc': 'A arara-azul de bico em gancho e olhar invocado, no medalhão.' + VEM, 'visual': _d('ar', '#2a56d8', '#ffd23f')},
    {'id': 'tp_m_oncapreta', 'tipo': 'tampinha', 'nome': 'Onça-Preta', 'raridade': 'lendario', 'moedas': 0, 'gemas': 150,
     'desc': 'A onça-preta rosnando, com as rosetas escondidas no pelo e os olhos verde-limão.' + VEM, 'visual': _d('op', '#a29fb5', '#c6ff3a')},
    {'id': 'tp_m_mico', 'tipo': 'tampinha', 'nome': 'Mico-Leão Bolado', 'raridade': 'lendario', 'moedas': 0, 'gemas': 150,
     'desc': 'O mico-leão-dourado de juba de fogo e dentes trincados.' + VEM, 'visual': _d('mi', '#d88a12', '#fff0a6')},
    {'id': 'tp_m_guara', 'tipo': 'tampinha', 'nome': 'Guará da Várzea', 'raridade': 'epico', 'moedas': 0, 'gemas': 80,
     'desc': 'O lobo-guará das orelhas enormes, de focinho preto e crina arrepiada.' + VEM, 'visual': _d('lg', '#b8461a', '#ffc46b')},
    {'id': 'tp_m_tucano', 'tipo': 'tampinha', 'nome': 'Tucano Marrento', 'raridade': 'epico', 'moedas': 0, 'gemas': 80,
     'desc': 'O tucano do bicão laranja, marrento que só.' + VEM, 'visual': _d('tu', '#2a2d36', '#ff9a1f')},
    {'id': 'tp_m_jacare', 'tipo': 'tampinha', 'nome': 'Jacaré Papo-Amarelo', 'raridade': 'epico', 'moedas': 0, 'gemas': 80,
     'desc': 'O jacaré de boca aberta e papo amarelo, pronto para morder a bola.' + VEM, 'visual': _d('jc', '#3a7d2a', '#f4d63e')},
]


def _linha(it):                                        # um item numa linha, no formato do arquivo (o mesmo do tools/v95/emojis_atlas.py)
    def v(x):
        if isinstance(x, dict):
            return '{ ' + ', '.join(json.dumps(k, ensure_ascii=False) + ': ' + v(y) for k, y in x.items()) + ' }' if x else '{}'
        if isinstance(x, list):
            return '[' + ', '.join(v(y) for y in x) + ']'
        return json.dumps(x, ensure_ascii=False)
    return '    ' + v(it) + ','


def escreve():
    t = ARQ.read_text(encoding='utf-8')
    ids = {it['id'] for it in BOLAS + MASCOTES}
    linhas = [l for l in t.split('\n') if not any('"id": "%s"' % i in l for i in ids)]   # (as de antes saem: entram as de agora)
    def depois(marca, novos):
        k = [i for i, l in enumerate(linhas) if marca in l]
        assert len(k) == 1, ('a marca do catálogo sumiu', marca, len(k))
        i = k[0]
        if not linhas[i].rstrip().endswith(','): linhas[i] = linhas[i].rstrip() + ','
        linhas[i + 1:i + 1] = [_linha(it) for it in novos]
    depois('"id": "bola_classica_lisa"', BOLAS)
    depois('"id": "banner_rk_craque_3"', MASCOTES)
    novo = '\n'.join(linhas)
    o = json.loads(novo)                                # (continua um JSON certo)
    cat = {it['id']: it for it in o['itens']}
    for it in BOLAS + MASCOTES:
        assert cat[it['id']] == it, it['id']
    ARQ.write_text(novo, encoding='utf-8')
    return len(o['itens'])


if __name__ == '__main__':
    n = escreve()
    print('catálogo:', n, 'itens ·', len(BOLAS), 'bolas e', len(MASCOTES), 'mascotes da v106 →', ARQ.relative_to(RAIZ))
