#!/usr/bin/env python3
"""RACHA v95 · OS EMOJIS DA TAMPINHA: o atlas e os itens do catálogo.

De onde vêm: das três folhas de emojis que o dono do jogo mandou em 28/10/2026 (A, B e C). Cada emoji foi recortado num
círculo de 256 px (os recortes ficam fora do repositório: `python3 tools/v95/emojis_atlas.py <pasta dos recortes>`).
Ficaram de fora 27 emojis das folhas: os que eram personagens conhecidos (de filme, desenho, jogo ou marca) ou traziam o
escudo/logo de um time ou de uma marca — direito autoral de terceiros. O resto entra todo (inclusive os de arma, charuto e
folha: a pedido).

O que este script faz:
- monta o atlas tools/v95/emojis.webp (12 por linha, 176 px cada, WebP 80) e o tools/v95/emojis.json (onde cada um está);
- põe os itens no app/contracts/catalogo88.json (o MESMO catálogo do jogo e da plataforma): o tipo "emoji", a categoria
  EMOJIS na loja, o "emoji" nos tipos equipáveis e o padrão "emoji_nenhum" (a tampinha sem emoji). A raridade decide o
  preço: comum 600 moedas, raro 1.400, épico 2.800, lendário 150 gemas; 4 são de graça para todo mundo.
O build (tools/v95/v95.py) embute o atlas no racha.html (nada de arquivo de fora)."""
import json, math, sys, pathlib
from PIL import Image

AQUI = pathlib.Path(__file__).resolve().parent
RAIZ = AQUI.parent.parent
G, L, R, E, C = 'gratis', 'lendario', 'raro', 'epico', 'comum'
EM = [
 ('A00', 'diabo_racha', 'Diabo RACHA', L), ('A01', 'mumia_racha', 'Múmia RACHA', E), ('A04', 'gelo_armado', 'Gelo 100% Armado', E),
 ('A06', 'balaclava_armada', 'Balaclava Armada', E), ('A07', 'rei_racha', 'Rei RACHA', L), ('A08', 'pedra_rachada', 'Pedra Rachada', R),
 ('A10', 'fogo_racha', 'Fogo RACHA', L), ('A12', 'dreads_roxo', 'Dreads Roxo', E), ('A14', 'ouro_balas', 'Ouro e Balas', E),
 ('A15', 'ursinho_remendado', 'Ursinho Remendado', R), ('A16', 'raio_grana', 'Raio da Grana', E), ('A17', 'diabo_acorrentado', 'Diabo Acorrentado', E),
 ('A18', 'bucket_racha', 'Bucket RACHA', L), ('A19', 'folha_chapada', 'Folha Chapada', R), ('A21', 'cara_grana', 'Cara de Grana', E),
 ('A22', 'trovao_roxo', 'Trovão Roxo', R), ('A23', 'espinhos_racha', 'Espinhos RACHA', L), ('A24', 'ouro_armado', 'Ouro Armado', E),
 ('A25', 'palhaco_sinistro', 'Palhaço Sinistro', R), ('A26', 'chama_roxa', 'Chama Roxa', E), ('A28', 'cruz_rachada', 'Cruz Rachada', R),
 ('A29', 'ceifador', 'Ceifador', E), ('A30', 'lava_oculos', 'Lava de Óculos', R), ('A31', 'fumaca_branca', 'Fumaça Branca', R),
 ('A32', 'pitbull', 'Pitbull', R), ('A33', 'visao_noturna', 'Visão Noturna', E), ('A34', 'bala_ouro', 'Bala de Ouro', R),
 ('A35', 'oni', 'Oni', L), ('A36', 'gorro_racha', 'Gorro RACHA', L), ('A37', 'tubarao_brabo', 'Tubarão Brabo', E),
 ('A38', 'coroa_espinhos', 'Coroa de Espinhos', R), ('A39', 'camuflado_racha', 'Camuflado RACHA', L),
 ('B00', 'balaclava_vermelha', 'Balaclava Vermelha', E), ('B01', 'caveira_rica', 'Caveira Rica', E), ('B05', 'chama_violeta', 'Chama Violeta', E),
 ('B07', 'caveira_prece', 'Caveira em Prece', R), ('B08', 'cifrao', 'Cifrão', R), ('B09', 'cao_negro', 'Cão Negro', R),
 ('B11', 'bola8_ostentacao', 'Bola 8 Ostentação', E), ('B13', 'folha_fumaca', 'Folha da Fumaça', R), ('B14', 'gelo_ostentacao', 'Gelo Ostentação', R),
 ('B15', 'demonio_armado', 'Demônio Armado', E), ('B16', 'caveira_racha', 'Caveira RACHA', L), ('B17', 'rei_ouro', 'Rei de Ouro', E),
 ('B18', 'ursinho_pirata', 'Ursinho Pirata', R), ('B19', 'visao_verde', 'Visão Verde', R), ('B20', 'lava_negra', 'Lava Negra', R),
 ('B22', 'dentes_ouro', 'Dentes de Ouro', R), ('B24', 'bandana_fogo', 'Bandana de Fogo', E), ('B25', 'caveira_66', 'Caveira 66', R),
 ('B26', 'bone_racha_roxo', 'Boné RACHA Roxo', L), ('B27', 'rei_rachado', 'Rei Rachado', E), ('B28', 'soldado_brasil', 'Soldado Brasil', E),
 ('B29', 'kitsune', 'Kitsune', E), ('B30', 'correntes', 'Correntes', R), ('B31', 'xx', 'XX', R),
 ('B32', 'tubarao_armado', 'Tubarão Armado', E), ('B33', 'capacete_vermelho', 'Capacete Vermelho', R), ('B34', 'sorriso_xx', 'Sorriso XX', R),
 ('B35', 'raio_violeta', 'Raio Violeta', R), ('B37', 'leao_rei', 'Leão Rei', L), ('B38', 'risco_biologico', 'Risco Biológico', E),
 ('B39', 'samurai', 'Samurai', L), ('B41', 'caveira_azul', 'Caveira Azul', E), ('B43', 'bone_racha', 'Boné RACHA', L),
 ('B44', 'dreads', 'Dreads', R), ('B45', 'rei_caveira', 'Rei Caveira', E), ('B46', 'bandana_branca', 'Bandana Branca', R),
 ('B47', 'capacete_ouro', 'Capacete de Ouro', E),
 ('C00', 'diabinho', 'Diabinho', G), ('C01', 'mumia', 'Múmia', C), ('C02', 'gelo', 'Gelo', C), ('C03', 'boca_ouro', 'Boca de Ouro', R),
 ('C04', 'ninja', 'Ninja', R), ('C05', 'diabo_rei', 'Diabo Rei', R), ('C07', 'folha', 'Folha', C), ('C08', 'folha_acesa', 'Folha Acesa', C),
 ('C09', 'palhaco', 'Palhaço', C), ('C10', 'meia_caveira', 'Meia Caveira', R), ('C11', 'xx_facas', 'XX das Facas', R),
 ('C12', 'fantasma_estiloso', 'Fantasma Estiloso', C), ('C13', 'bola_fogo', 'Bola de Fogo', G), ('C15', 'apaixonado', 'Apaixonado', C),
 ('C16', 'meio_a_meio', 'Meio a Meio', C), ('C17', 'capuz_xx', 'Capuz XX', C), ('C18', 'anjinho', 'Anjinho', G),
 ('C20', 'planeta_roxo', 'Planeta Roxo', C), ('C21', 'visor_neon', 'Visor Neon', C), ('C22', 'alien', 'Alien', C),
 ('C23', 'mascara_gas', 'Máscara de Gás', C), ('C24', 'bola8', 'Bola 8', G), ('C26', 'pedra', 'Pedra', C), ('C27', 'derretendo', 'Derretendo', C),
 ('C28', 'bandana_vermelha', 'Bandana Vermelha', C), ('C29', 'trovao_azul', 'Trovão Azul', C), ('C30', 'charuto', 'Charuto', C),
 ('C31', 'grana', 'Grana', C), ('C34', 'camuflado', 'Camuflado', C), ('C35', 'radioativo', 'Radioativo', C), ('C36', 'tubarao', 'Tubarão', C),
 ('C38', 'gelo_rachado', 'Gelo Rachado', C), ('C39', 'chama_sombria', 'Chama Sombria', C),
]
PRECO = {G: (0, 0), C: (600, 0), R: (1400, 0), E: (2800, 0), L: (0, 150)}
DESC = {G: 'De graça para todo mundo: ponha na sua tampinha.', C: 'Um emoji no meio da sua tampinha.', R: 'Raro: chama atenção no campo.',
        E: 'Épico: pra quem joga de verdade.', L: 'Lendário: a cara do RACHA.'}
T, COLS, QUAL = 176, 12, 80


def itens():
    out = [{'id': 'emoji_nenhum', 'tipo': 'emoji', 'nome': 'Sem emoji', 'raridade': 'comum', 'moedas': 0, 'gemas': 0, 'gratis': True,
            'desc': 'A tampinha do jeito que ela é, sem emoji no meio.', 'visual': {'emoji': ''}}]
    for src, slug, nome, rar in EM:
        m, g = PRECO[rar]
        it = {'id': 'emoji_' + slug, 'tipo': 'emoji', 'nome': nome, 'raridade': 'comum' if rar == G else rar, 'moedas': m, 'gemas': g}
        if rar == G:
            it['gratis'] = True
        it['desc'] = DESC[rar]
        it['visual'] = {'emoji': slug}
        out.append(it)
    return out


def atlas(pasta):
    n = len(EM); rows = math.ceil(n / COLS)
    im = Image.new('RGBA', (COLS * T, rows * T), (0, 0, 0, 0)); mapa = {}
    for k, (src, slug, nome, rar) in enumerate(EM):
        e = Image.open(pasta / (src + '.png')).convert('RGBA').resize((T, T), Image.LANCZOS)
        x, y = (k % COLS) * T, (k // COLS) * T
        im.paste(e, (x, y)); mapa['emoji_' + slug] = [x, y]
    im.save(AQUI / 'emojis.webp', 'WEBP', quality=QUAL, method=6)
    (AQUI / 'emojis.json').write_text(json.dumps({'lado': T, 'p': mapa}, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
    return im.size


def _linha(it):                                          # um item numa linha, no formato do arquivo (o do prettier)
    def v(x):
        if isinstance(x, dict):
            return '{ ' + ', '.join(json.dumps(k, ensure_ascii=False) + ': ' + v(y) for k, y in x.items()) + ' }' if x else '{}'
        return json.dumps(x, ensure_ascii=False)
    return '    ' + v(it)


def catalogo():                                          # (o arquivo é escrito à mão: as trocas são no texto, o resto fica igual)
    arq = RAIZ / 'app' / 'contracts' / 'catalogo88.json'
    t = arq.read_text(encoding='utf-8')
    linhas = [l for l in t.split('\n') if '"tipo": "emoji"' not in l]          # (os emojis de antes saem: entram os de agora)
    t = '\n'.join(linhas)
    if '"id": "emojis"' not in t:
        a = '    { "id": "tampinhas", "nome": "TAMPINHAS" },\n'
        assert t.count(a) == 1
        t = t.replace(a, a + '    { "id": "emojis", "nome": "EMOJIS", "tipo": "emoji" },\n')
    a = '"tiposEquipaveis": ["bola", "efeito", "comemoracao", "gol", "banner", "avatar"]'
    if a in t:
        t = t.replace(a, '"tiposEquipaveis": ["bola", "efeito", "comemoracao", "gol", "banner", "avatar", "emoji"]')
    a = '"avatar": "av_tampinha" }'
    if '"emoji": "emoji_nenhum"' not in t:
        assert t.count(a) == 1
        t = t.replace(a, '"avatar": "av_tampinha", "emoji": "emoji_nenhum" }')
    # os itens: depois do último item (antes do "pacotes")
    i = t.index('\n  ],\n  "pacotes": [')
    t = t[:i].rstrip().rstrip(',') + ',\n' + ',\n'.join(_linha(it) for it in itens()) + t[i:]
    json.loads(t)                                         # (continua um JSON certo)
    arq.write_text(t, encoding='utf-8')


if __name__ == '__main__':
    assert len(EM) == len({e[0] for e in EM}) == len({e[1] for e in EM}), 'emoji repetido'
    if len(sys.argv) > 1:
        print('atlas', atlas(pathlib.Path(sys.argv[1])), round((AQUI / 'emojis.webp').stat().st_size / 1024), 'KB')
    catalogo()
    from collections import Counter
    print(len(EM), 'emojis', dict(Counter(e[3] for e in EM)))
