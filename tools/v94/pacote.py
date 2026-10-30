#!/usr/bin/env python3
"""RACHA v94 · monta o ZIP da VERSÃO DE TESTES ou o da VERSÃO OFICIAL (a mesma arrumação de sempre: os arquivos na raiz,
sem pasta em volta). Igual ao tools/v92/pacote.py, com o motor próprio: confere que ele está no jogo, leva os dois .bat de
testes e o LEIA-ME-v94-TESTES.md só na versão de testes, e põe no config.js de testes a linha comentada do motor.
- gera o jogo de novo (tools/aplicar_rua.py) e confere que a página publicada está em dia;
- leva os arquivos que o git acompanha (do jeito que estão na pasta: o .bat com CRLF), sem tests/build, node_modules,
  __pycache__ nem server/dados (o .gitignore de sempre);
- VERSÃO DE TESTES (o padrão): o app/public/game/config.js ganha `experimental: true` (o painel de testes) — o config.js do
  repositório continua o da versão oficial (sem o painel);
- VERSÃO OFICIAL (--producao): o config.js do repositório como está (SEM o experimental: o painel não existe), sem o
  INICIAR-TESTES-NO-WINDOWS.bat (ele liga o RACHA_EXPERIMENTAL=1 no servidor) e sem o LEIA-ME-v92-TESTES.md; o ZIP é
  aberto de novo e conferido (nenhum arquivo liga o modo de testes);
- grava ao lado o resumo (SHA-256 e tamanho).
Uso: python3 tools/v92/pacote.py [--producao] <saida.zip>"""
import hashlib, pathlib, subprocess, sys, zipfile, time

RAIZ = pathlib.Path(__file__).resolve().parent.parent.parent
args = [a for a in sys.argv[1:] if not a.startswith('--')]
PRODUCAO = '--producao' in sys.argv[1:]
saida = pathlib.Path(args[0] if args else RAIZ / ('racha-online-v94.zip' if PRODUCAO else 'racha-online-v94-testes.zip')).resolve()

r = subprocess.run([sys.executable, str(RAIZ / 'tools' / 'aplicar_rua.py')], cwd=RAIZ, capture_output=True, text=True)
if r.returncode or 'fisica identica' not in r.stdout:
    sys.exit('o build falhou:\n' + r.stdout + r.stderr)
sujos = subprocess.run(['git', 'status', '--porcelain'], cwd=RAIZ, capture_output=True, text=True).stdout.strip()
if sujos:
    print('aviso: há mudanças não gravadas no git (elas entram no ZIP do jeito que estão na pasta):\n' + sujos)
arqs = subprocess.run(['git', 'ls-files', '-z', '--cached', '--others', '--exclude-standard'], cwd=RAIZ, capture_output=True).stdout.decode().split('\0')
arqs = sorted(a for a in arqs if a and (RAIZ / a).is_file())
SO_TESTES = {'INICIAR-TESTES-NO-WINDOWS.bat', 'INICIAR-TESTES-MOTOR-NOVO-NO-WINDOWS.bat', 'LEIA-ME-v92-TESTES.md', 'LEIA-ME-v94-TESTES.md'}
if PRODUCAO:
    arqs = [a for a in arqs if a not in SO_TESTES]

CONFIG = 'app/public/game/config.js'
cfg = (RAIZ / CONFIG).read_text(encoding='utf-8')
assert 'experimental' not in cfg.split('window.RACHA_CONFIG', 1)[1], 'o config.js do repositório tem de ser o da versão oficial'
marca = "  presente: true            // v87.2: o presente de TESTE (moedas e gemas) — apague esta linha no lançamento\n"
assert marca in cfg, 'o config.js mudou: confira a linha do presente'
if PRODUCAO:
    cfg_zip = cfg
else:
    cfg_zip = cfg.replace(marca, marca.rstrip('\n').replace('  presente: true ', '  presente: true,') + '\n'
                          + "  experimental: true,       // v92: A VERSÃO DE TESTES (o painel AJUSTES › TESTES). Para a versão oficial, apague esta linha.\n"
                          + "  // motor: 'v94'           // v94: tire as duas barras do começo para escolher o motor de todos, sem o painel ('v94' = o próprio, 'v93' = o de antes)\n")
    assert 'experimental: true' in cfg_zip

t0 = time.localtime()
with zipfile.ZipFile(saida, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
    for a in arqs:
        info = zipfile.ZipInfo(a, date_time=t0[:6])
        info.compress_type = zipfile.ZIP_DEFLATED
        info.external_attr = (0o755 if a.endswith(('.sh', '.bat')) else 0o644) << 16
        dados = cfg_zip.encode('utf-8') if a == CONFIG else (RAIZ / a).read_bytes()
        z.writestr(info, dados)

# a conferência do ZIP pronto
with zipfile.ZipFile(saida) as z:
    nomes = set(z.namelist())
    c = z.read(CONFIG).decode('utf-8')
    jogo = z.read('app/public/game/racha.html')
    assert jogo == (RAIZ / 'app/public/game/racha.html').read_bytes(), 'o racha.html do ZIP não é o do build'
    assert b'window.RACHA_CONFIG.experimental === true' in jogo, 'o jogo perdeu a trava do modo de testes'
    assert b"const VERSAO = '94.0'" in jogo and b'raiz.RachaMotor = motor' in jogo, 'o motor próprio não está no jogo'
    assert 'server/partida/motor.js' in nomes and 'server/partida/sala94.js' in nomes, 'faltam os arquivos do motor no servidor'
    tem_exp = 'experimental: true' in c
    if PRODUCAO:
        assert not tem_exp and not (nomes & SO_TESTES), 'o ZIP da versão oficial ligaria o modo de testes'
        for n in nomes:   # nenhum arquivo do ZIP liga o servidor de testes (fora a documentação e os testes, que só o citam)
            if n.endswith(('.bat', '.sh', '.yaml', '.yml', 'Dockerfile', 'package.json', 'Procfile')) and not n.startswith('tests/'):
                assert b'RACHA_EXPERIMENTAL=1' not in z.read(n), n + ' liga o RACHA_EXPERIMENTAL'
    else:
        assert tem_exp and 'INICIAR-TESTES-NO-WINDOWS.bat' in nomes and 'INICIAR-TESTES-MOTOR-NOVO-NO-WINDOWS.bat' in nomes and 'LEIA-ME-v94-TESTES.md' in nomes
h = hashlib.sha256(saida.read_bytes()).hexdigest()
print('ok ·', 'VERSÃO OFICIAL (sem o painel)' if PRODUCAO else 'VERSÃO DE TESTES (com o painel)', '·', saida, '·', len(arqs), 'arquivos ·',
      round(saida.stat().st_size / 1048576, 1), 'MB · sha256', h)
