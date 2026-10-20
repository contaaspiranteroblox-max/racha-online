"""v90 (aplicado por último, depois da v88): A NOVA TEMÁTICA E O RANKING DA TEMPORADA.
- o estilo em app/public/game/v90.css (depois do v88.css): painéis em preto fosco, roxo e laranja (os dois times),
  amarelo no JOGAR, pouco brilho;
- o código em tools/v90/*.js (na ordem de ARQUIVOS), colado no fim do script principal, logo antes da arrumação final
  (montaAbas, a primeira vez, o lobby): a tela de RANKING (os dados vêm da plataforma: app/api/racha/v90/ranking.ts) e
  a tela inicial nova.
A física NÃO muda (o build continua conferindo o bloco de física)."""
import pathlib
AQUI = pathlib.Path(__file__).resolve().parent
SUBS = []

# ---- o estilo da v90 depois de todos os outros
SUBS.append(('<link rel="stylesheet" href="./v88.css">\n', '<link rel="stylesheet" href="./v88.css">\n<link rel="stylesheet" href="./v90.css">\n'))

# ---- o código da v90, antes da arrumação final do script principal
ARQUIVOS = [n for n in ('ranking.js', 'inicio.js', 'perfil.js') if (AQUI / n).exists()]
CODIGO = '\n'.join((AQUI / n).read_text(encoding='utf-8') for n in ARQUIVOS)
# o cenário da tela inicial (desenho vetorial, dentro do HTML: usa as fontes do jogo e não pede arquivo de fora)
CEN = AQUI / 'cenario.svg'
if CEN.exists() and CODIGO.strip():
    import json, re
    svg = re.sub(r'>\s+<', '><', CEN.read_text(encoding='utf-8')).strip()
    CODIGO = 'const V90_CENARIO_SVG = ' + json.dumps(svg, ensure_ascii=False) + ';\n' + CODIGO
if CODIGO.strip():
    SUBS.append(('\nmontaAbas();\nif (onbPrecisa()) onbAbre();',
                 '\n/* ======================================================================= RACHA v90 (tools/v90/*.js) */\n' + CODIGO
                 + '\nmontaAbas();\nif (onbPrecisa()) onbAbre();'))
