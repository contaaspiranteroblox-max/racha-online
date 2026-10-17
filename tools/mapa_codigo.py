#!/usr/bin/env python3
"""RACHA · o mapa das redefinições: que funções do jogo foram trocadas por versões posteriores e QUAL está valendo.

O racha.html é montado em camadas (o jogo-base, as versões v67–v69, as etapas da v70, a v71, a v73–v82 e a v84; a v85
mudou o jogo-base e as camadas no lugar, com o núcleo da física em server/partida/nucleo_fisica.js): muitas funções são declaradas
uma vez e depois trocadas por uma versão nova que chama a anterior (const xAntes70 = x; x = function(){ ... }).
Este script lê o jogo gerado (app/public/game/racha.html) e lista, para cada função trocada, quantas vezes ela foi
definida e de qual arquivo vem a versão ATIVA (a última). Serve para confirmar qual implementação vale antes de mexer
e para acompanhar a redução das camadas.

Rodar: python3 tools/mapa_codigo.py            (escreve tools/MAPA_REDEFINICOES.md e mostra o resumo)
"""
import re, pathlib, collections

RAIZ = pathlib.Path(__file__).resolve().parent.parent
JOGO = RAIZ / 'app' / 'public' / 'game' / 'racha.html'
FONTES = [('tools/v84/' + p.name, p) for p in sorted((RAIZ / 'tools' / 'v84').glob('*.js'))] + \
         [('server/partida/nucleo_fisica.js (núcleo FR-85)', RAIZ / 'server' / 'partida' / 'nucleo_fisica.js')] + \
         [('tools/v82/' + p.name, p) for p in sorted((RAIZ / 'tools' / 'v82').glob('*.js'))] + \
         [('tools/v81/' + p.name, p) for p in sorted((RAIZ / 'tools' / 'v81').glob('*.js'))] + \
         [('tools/v80/' + p.name, p) for p in sorted((RAIZ / 'tools' / 'v80').glob('*.js'))] + \
         [('tools/v79/' + p.name, p) for p in sorted((RAIZ / 'tools' / 'v79').glob('*.js'))] + \
         [('tools/v78/' + p.name, p) for p in sorted((RAIZ / 'tools' / 'v78').glob('*.js'))] + \
         [('tools/v77/' + p.name, p) for p in sorted((RAIZ / 'tools' / 'v77').glob('*.js'))] + \
         [('tools/v76/' + p.name, p) for p in sorted((RAIZ / 'tools' / 'v76').glob('*.js'))] + \
         [('tools/v75/' + p.name, p) for p in sorted((RAIZ / 'tools' / 'v75').glob('*.js'))] + \
         [('tools/v74/' + p.name, p) for p in sorted((RAIZ / 'tools' / 'v74').glob('*.js'))] + \
         [('tools/v73/' + p.name, p) for p in sorted((RAIZ / 'tools' / 'v73').glob('*.js'))] + \
         [('tools/v71/' + p.name, p) for p in sorted((RAIZ / 'tools' / 'v71').glob('*.js'))] + \
         [('tools/v70/' + p.name, p) for p in sorted((RAIZ / 'tools' / 'v70').glob('*.js'))] + \
         [('tools/' + n, RAIZ / 'tools' / n) for n in ('clubes_rua.js', 'editor_rua.js', 'tampa_rua.js', 'salas_rua.js', 'partida_rua.js')] + \
         [('tools/v84/' + p.name + ' (troca)', p) for p in sorted((RAIZ / 'tools' / 'v84').glob('*.py'))] + \
         [('tools/v82/' + p.name + ' (troca)', p) for p in sorted((RAIZ / 'tools' / 'v82').glob('*.py'))] + \
         [('tools/v80/' + p.name + ' (troca)', p) for p in sorted((RAIZ / 'tools' / 'v80').glob('*.py'))] + \
         [('tools/v71/' + p.name + ' (troca)', p) for p in sorted((RAIZ / 'tools' / 'v71').glob('*.py'))] + \
         [('tools/v70/' + p.name + ' (troca)', p) for p in sorted((RAIZ / 'tools' / 'v70').glob('*.py'))] + \
         [('backup/racha.html (jogo-base)', RAIZ / 'backup' / 'racha.html')]
TEXTOS = [(n, p.read_text(encoding='utf-8')) for n, p in FONTES if p.exists()]

html = JOGO.read_text(encoding='utf-8')
a = html.index('/*PHYS_START*/'); i0 = html.rfind('<script>', 0, a); i1 = html.index('</script>', a)
js = html[i0:i1].split('\n')

DECL = re.compile(r'^\s*(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(')
TROCA = re.compile(r'^\s*([A-Za-z_$][\w$]*)\s*=\s*(?:async\s+)?(?:function\b|\([^)]*\)\s*=>|[A-Za-z_$][\w$]*\s*=>)')
defs = collections.defaultdict(list)                   # nome -> [(linha, texto)]
declaradas = set()
for n, l in enumerate(js, 1):
    m = DECL.match(l)
    if m: defs[m.group(1)].append((n, l.strip())); declaradas.add(m.group(1)); continue
    m = TROCA.match(l)
    if m: defs[m.group(1)].append((n, l.strip()))
trocadas = {k: v for k, v in defs.items() if k in declaradas and len(v) > 1}

def origem(ln):
    for k in (3, 2, 1):                                # o trecho (3 linhas) diz de onde veio; uma linha curta só aparece em vários
        t = '\n'.join(js[ln - 1:ln - 1 + k]).strip()
        achou = [nome for nome, fonte in TEXTOS if t in fonte]
        if len(achou) == 1 or (achou and k == 1): return achou[0]
    return '(troca no build)'

linhas = ['# RACHA · as funções trocadas por versões posteriores (gerado por tools/mapa_codigo.py)', '',
          'Para cada função do jogo que foi declarada e depois trocada: quantas definições ela tem no racha.html gerado e',
          'de onde vem a versão que VALE (a última). Antes de corrigir algo, confira aqui qual implementação está ativa.', '',
          '| função | definições | a que vale vem de | linha no script |', '|---|---:|---|---:|']
por_origem = collections.Counter()
for nome, v in sorted(trocadas.items(), key=lambda kv: (-len(kv[1]), kv[0])):
    ln, txt = v[-1]; o = origem(ln); por_origem[o] += 1
    linhas.append('| `%s` | %d | %s | %d |' % (nome, len(v), o, ln))
linhas += ['', '## Resumo', '', '* funções declaradas no script principal: %d' % len(declaradas),
           '* funções trocadas pelo menos uma vez: %d (%.0f%%)' % (len(trocadas), 100*len(trocadas)/max(1, len(declaradas))),
           '* definições a mais (camadas): %d' % sum(len(v) - 1 for v in trocadas.values()), '', 'A versão que vale, por arquivo:', '']
linhas += ['* %s: %d' % (o, n) for o, n in por_origem.most_common()]
(RAIZ / 'tools' / 'MAPA_REDEFINICOES.md').write_text('\n'.join(linhas) + '\n', encoding='utf-8')
print('funções declaradas: %d · trocadas: %d · definições a mais: %d' % (len(declaradas), len(trocadas), sum(len(v) - 1 for v in trocadas.values())))
for nome, v in sorted(trocadas.items(), key=lambda kv: -len(kv[1]))[:12]:
    print('  %-22s %d definições · vale: %s' % (nome, len(v), origem(v[-1][0])))
print('tabela completa: tools/MAPA_REDEFINICOES.md')
