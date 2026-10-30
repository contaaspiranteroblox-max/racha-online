"""v92 (aplicado por último, depois da v91): A MECÂNICA MAIS LISA, PRECISA E RESPONSIVA — a UI da v91 não muda.
- o núcleo compartilhado da física das salas (server/partida/nucleo.js: o MESMO arquivo que o servidor usa) colado no
  script principal, para a previsão do online rodar exatamente a conta do servidor;
- o código em tools/v92/*.js (na ordem de ARQUIVOS), colado no fim do script principal, depois do da v91:
  base.js (a cadência dos quadros, o desenho entre os passos, o toque armado, o analógico, a física de números do
  aparelho), db.js (o relógio do toque, o DB por estados no treino e o medidor do DB), rede.js (a previsão do online com o núcleo: a sua tampinha, a bola e o chute na hora), painel.js (o painel de
  ajustes e o medidor — só com experimental: true no config.js);
- o estilo do painel em app/public/game/v92.css (depois do v91.css; as mesmas cores, letras e contornos da v91).
A física da v91 é o padrão (os mesmos números). Para a versão de testes poder mexer nela, as constantes da física do
aparelho viram variáveis (let) — no bloco PHYS isso entra pelas trocas documentadas abaixo (SUBS_PHYS), que o build confere:
  · ATRITO_JOG_BOLA/ATRITO_TRAVE_BOLA e Q_PAREDE/Q_TRAVE/Q_REDE: const → let (o painel recalcula a partir do atrito e
    dos quiques);
  · o quique da tampinha no muro da área (0,65, no collide) vira V92_QJP (o mesmo 0,65 por padrão).
Fora do bloco: as constantes de AJUSTES (raios, massas, velocidade, forças, teto, freio, quiques, alcance, cooldown,
limiar) const → let, e o quique tampinha × tampinha (0,3, no rqColide) e o do muro dos bots (rqParedes) viram V92_QJJ e
V92_QJP. Com os valores padrão, o jogo é o mesmo da v91 (o v92_fisica_test confere)."""
import pathlib
AQUI = pathlib.Path(__file__).resolve().parent
RAIZ = AQUI.parent.parent
SUBS = []
SUBS_PHYS = []

# ---- o estilo do painel depois do da v91 · Fase 1: o do editor dos controles (v92-hud.css) por último
SUBS.append(('<link rel="stylesheet" href="./v91.css">\n', '<link rel="stylesheet" href="./v91.css">\n<link rel="stylesheet" href="./v92.css">\n<link rel="stylesheet" href="./v92-hud.css">\n'))

# ---- Fase 1 (tools/v92/hud.js): a opacidade dos controles vai de 0% a 100% (era de 25%): com 0% o controle some na partida
#      e o toque continua valendo no mesmo lugar (o toque nunca olhou a opacidade). Fora do bloco PHYS.
SUBS.append(('const TAM_MIN = .5, TAM_MAX = 1.5, OPAC_MIN = .25;',
             'const TAM_MIN = .5, TAM_MAX = 1.5, OPAC_MIN = 0;   // v92 Fase 1: a opacidade de 0% a 100% (era .25)'))

# ---- as constantes da física do aparelho viram variáveis (os mesmos valores; só a versão de testes muda)
for nome in ['R_JOG = U(2.0*ESCALA_JOG);', 'RAIO_CHUTE = U(2.5*ESCALA_JOG);', 'MASSA_JOG = 1.25;', 'VEL_JOG = U(14.1);',
             'FORCA_KICK = 212.5, FORCA_POWER = 340;', 'R_BOLA = U(1.0*ESCALA_BOLA);', 'MASSA_BOLA = 10;',
             'LIMITE_VEL_BOLA = U(46.75);', 'FATOR_BOLA = 0.99;', 'AMORT_ANGULAR = 0.5;', 'ATRITO_BOLA = 0.5;', 'QUIQUE_BOLA = 0;',
             'QUIQUE_TRAVE = 0.6;', 'QUIQUE_REDE = 0.15;', 'QUIQUE_PAREDE_BOLA = 0.65;', 'MARGEM_CHUTE = RAIO_CHUTE - R_JOG;',
             'ALCANCE_CHUTE = RAIO_CHUTE + R_BOLA;', 'COOLDOWN_BOTAO = 0.02;']:
    SUBS.append(('\nconst ' + nome, '\nlet ' + nome))
# o limiar do quique e, logo depois dele, as variáveis novas (declaradas no começo do script: valem antes de qualquer passo)
SUBS.append(('\nconst LIMIAR_QUIQUE = U(1);',
             '\nlet V92_QJJ = 0.3, V92_QJP = 0.65, V92_DIRECOES = 32;   // v92: tampinha × tampinha, tampinha × muro da área, direções do analógico (os da v91)'
             '\nlet LIMIAR_QUIQUE = U(1);'))
# os bots: o muro da área e tampinha × tampinha com as variáveis (fora do bloco PHYS)
SUBS.append(('  hitBox(q, JOG_X0, JOG_Y0, JOG_X1, JOG_Y1, 0.65, 0);\n', '  hitBox(q, JOG_X0, JOG_Y0, JOG_X1, JOG_Y1, V92_QJP, 0);\n'))
SUBS.append(('for (let k = i + 1; k < J.length; k++) hitBodies(J[i], J[k], .3, 0);', 'for (let k = i + 1; k < J.length; k++) hitBodies(J[i], J[k], V92_QJJ, 0);'))

# ---- dentro do bloco PHYS (as trocas documentadas)
SUBS_PHYS.append(('const ATRITO_JOG_BOLA = Math.sqrt(0.3*ATRITO_BOLA), ATRITO_TRAVE_BOLA = Math.sqrt(0.1*ATRITO_BOLA);',
                  'let ATRITO_JOG_BOLA = Math.sqrt(0.3*ATRITO_BOLA), ATRITO_TRAVE_BOLA = Math.sqrt(0.1*ATRITO_BOLA);   // v92: let (o painel de testes)'))
SUBS_PHYS.append(('const Q_PAREDE = Math.max(QUIQUE_BOLA, QUIQUE_PAREDE_BOLA), Q_TRAVE = Math.max(QUIQUE_BOLA, QUIQUE_TRAVE), Q_REDE = Math.max(QUIQUE_BOLA, QUIQUE_REDE);',
                  'let Q_PAREDE = Math.max(QUIQUE_BOLA, QUIQUE_PAREDE_BOLA), Q_TRAVE = Math.max(QUIQUE_BOLA, QUIQUE_TRAVE), Q_REDE = Math.max(QUIQUE_BOLA, QUIQUE_REDE);   // v92: let'))
SUBS_PHYS.append(('  hitBox(P, JOG_X0, JOG_Y0, JOG_X1, JOG_Y1, 0.65, 0);', '  hitBox(P, JOG_X0, JOG_Y0, JOG_X1, JOG_Y1, V92_QJP, 0);'))

# ---- o código: o núcleo do servidor + tools/v92/*.js
NUCLEO = (RAIZ / 'server' / 'partida' / 'nucleo.js').read_text(encoding='utf-8')
ARQUIVOS = [n for n in ('base.js', 'db.js', 'rede.js', 'painel.js', 'hud.js', 'fim.js') if (AQUI / n).exists()]   # Fase 1: hud.js (o editor dos controles)
CODIGO = '\n'.join((AQUI / n).read_text(encoding='utf-8') for n in ARQUIVOS)
SUBS.append(('\nmontaAbas();\nif (onbPrecisa()) onbAbre();',
             '\n/* ======================================================================= RACHA v92 · o núcleo (server/partida/nucleo.js) */\n;' + NUCLEO
             + '\n/* ======================================================================= RACHA v92 (tools/v92/*.js) */\n' + CODIGO
             + '\nmontaAbas();\nif (onbPrecisa()) onbAbre();'))
