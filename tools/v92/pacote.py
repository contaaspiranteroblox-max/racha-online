#!/usr/bin/env python3
"""RACHA v92 · monta o ZIP da VERSÃO DE TESTES ou o da VERSÃO OFICIAL (a mesma arrumação do ZIP da v91: os arquivos na
raiz, sem pasta em volta).
- gera o jogo de novo (tools/aplicar_rua.py) e confere que a página publicada está em dia;
- leva os arquivos que o git acompanha (do jeito que estão na pasta: o .bat com CRLF), sem tests/build, node_modules,
  __pycache__ nem server/dados (o .gitignore de sempre);
- VERSÃO DE TESTES (o padrão): o app/public/game/config.js ganha `experimental: true` (o painel de testes) — o config.js do
  repositório continua o da versão oficial (sem o painel);
- VERSÃO OFICIAL (--producao): o config.js do repositório como está (SEM o experimental: o painel não existe), sem o
  INICIAR-TESTES-NO-WINDOWS.bat (ele liga o RACHA_EXPERIMENTAL=1 no servidor) e sem o LEIA-ME-v92-TESTES.md (nem os da v94:
  o INICIAR-TESTES-MOTOR-NOVO-NO-WINDOWS.bat e o LEIA-ME-v94-TESTES.md); o ZIP é
  aberto de novo e conferido (nenhum arquivo liga o modo de testes);
- grava ao lado o resumo (SHA-256 e tamanho).
- v100 (segurança): nenhum arquivo de segredo, banco, chave ou pacote entra (.env, *.db/*.sqlite, *.pem/*.key, as chaves do
  Android *.jks/*.keystore, *.zip — o ZIP de testes deixado na pasta ia para dentro da oficial): a lista abaixo os tira e a
  conferência do ZIP pronto recusa se algum aparecer; os arquivos fora do git que entram são listados;
- v100: --lancamento = a VERSÃO OFICIAL sem o presente de teste (a linha `presente: true` do config.js sai e a conferência
  garante): é a do lançamento (o site e o APK). A --producao continua com o presente (o site de teste).
Uso: python3 tools/v92/pacote.py [--producao | --lancamento] <saida.zip>"""
import fnmatch, hashlib, pathlib, subprocess, sys, zipfile, time

RAIZ = pathlib.Path(__file__).resolve().parent.parent.parent
args = [a for a in sys.argv[1:] if not a.startswith('--')]
LANCAMENTO = '--lancamento' in sys.argv[1:]
PRODUCAO = '--producao' in sys.argv[1:] or LANCAMENTO
saida = pathlib.Path(args[0] if args else RAIZ / ('racha-online-v92.zip' if PRODUCAO else 'racha-online-v92-testes.zip')).resolve()

r = subprocess.run([sys.executable, str(RAIZ / 'tools' / 'aplicar_rua.py')], cwd=RAIZ, capture_output=True, text=True)
if r.returncode or 'fisica identica' not in r.stdout:
    sys.exit('o build falhou:\n' + r.stdout + r.stderr)
sujos = subprocess.run(['git', 'status', '--porcelain'], cwd=RAIZ, capture_output=True, text=True).stdout.strip()
if sujos:
    print('aviso: há mudanças não gravadas no git (elas entram no ZIP do jeito que estão na pasta):\n' + sujos)
arqs = subprocess.run(['git', 'ls-files', '-z', '--cached', '--others', '--exclude-standard'], cwd=RAIZ, capture_output=True).stdout.decode().split('\0')
arqs = sorted(a for a in arqs if a and (RAIZ / a).is_file())
# v100 (segurança): o que nunca vai num ZIP (nem que esteja na pasta sem estar no .gitignore)
PROIBIDOS = ['.env', '.env.*', '*.db', '*.db-wal', '*.db-shm', '*.db-journal', '*.sqlite', '*.sqlite3', '*.sqlite-*', '*.zip', '*.pem',
             '*.key', '*.jks', '*.keystore', '*.p12', '*.pfx', '*.bundle', 'id_rsa*', '*.log', '*.tar', '*.tar.gz', '*.tgz', '*.7z', '*.rar']
PERMITIDOS = {'app/.env.example'}                      # (o exemplo, sem segredo nenhum)
def proibido(a):
    nome = a.rsplit('/', 1)[-1]
    return a not in PERMITIDOS and any(fnmatch.fnmatch(nome, p) for p in PROIBIDOS)
fora = [a for a in arqs if proibido(a)]
if fora:
    print('v100: ficaram fora do ZIP (segredo, banco, chave ou pacote):', ', '.join(fora))
arqs = [a for a in arqs if not proibido(a)]
rastreados = set(subprocess.run(['git', 'ls-files', '-z', '--cached'], cwd=RAIZ, capture_output=True).stdout.decode().split('\0'))
novos = [a for a in arqs if a not in rastreados]
if novos:
    print('aviso: %d arquivo(s) fora do git entram no ZIP (confira se são do jogo):' % len(novos), ', '.join(novos[:20]) + (' …' if len(novos) > 20 else ''))
# (v96: e os da v94 — o motor novo em testes —, que também ligam o RACHA_EXPERIMENTAL: a oficial não leva nenhum)
SO_TESTES = {'INICIAR-TESTES-NO-WINDOWS.bat', 'LEIA-ME-v92-TESTES.md', 'INICIAR-TESTES-MOTOR-NOVO-NO-WINDOWS.bat', 'LEIA-ME-v94-TESTES.md'}
if PRODUCAO:
    arqs = [a for a in arqs if a not in SO_TESTES]

CONFIG = 'app/public/game/config.js'
cfg = (RAIZ / CONFIG).read_text(encoding='utf-8')
assert 'experimental' not in cfg.split('window.RACHA_CONFIG', 1)[1], 'o config.js do repositório tem de ser o da versão oficial'
marca = "  presente: true            // v87.2: o presente de TESTE (moedas e gemas) — apague esta linha no lançamento\n"
assert marca in cfg, 'o config.js mudou: confira a linha do presente'
if LANCAMENTO:                                          # v100: o lançamento não tem o presente de teste
    cfg_zip = cfg.replace(marca, '')
    assert 'presente:' not in cfg_zip.split('window.RACHA_CONFIG = Object.assign(', 1)[1], 'o config.js do lançamento ainda tem o presente de teste'
elif PRODUCAO:
    cfg_zip = cfg
else:
    cfg_zip = cfg.replace(marca, marca.rstrip('\n').replace('  presente: true ', '  presente: true,') + '\n'
                          + "  experimental: true        // v92: A VERSÃO DE TESTES (o painel AJUSTES › TESTES v92). Para a versão oficial, apague esta linha.\n")
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
    rach = 'app/public/game/rachao/rachao.html'           # v97: o Rachão (a página gerada do original guardado e a Oficina de estádios ao lado)
    assert rach in nomes and z.read(rach) == (RAIZ / rach).read_bytes(), 'o Rachão do ZIP não é o do build'
    assert {'app/public/game/rachao/estadios.js', 'app/public/game/rachao/estadios.css', 'app/public/game/rachao/ponte.js', 'backup/rachao.html'} <= nomes, 'faltam arquivos do Rachão no ZIP'
    rmot = 'server/partida/rachao_motor.js'                # v98: as salas online do Rachão (o motor gerado da página, a partida e o quadro dos dois lados)
    assert {'app/public/game/rachao/quadro.js', 'app/public/game/rachao/rede.js', 'server/partida/rachao.js', rmot} <= nomes, 'faltam arquivos das salas do Rachão no ZIP'
    assert z.read(rmot) == (RAIZ / rmot).read_bytes(), 'o motor do Rachão do servidor no ZIP não é o do build'
    assert {'app/public/game/v99.css', 'tools/v99/chutes.js', 'tools/v99/salas.js', 'tools/v99/v99.py'} <= nomes, 'faltam os arquivos da v99 no ZIP'   # v99: os chutes do Rachão nas salas
    assert b'window.RachaSalaLocal' in jogo and b'window.RachaChutes99' in jogo, 'o jogo do ZIP não tem os chutes do Rachão nas salas (v99)'
    assert {'app/public/game/v101.css', 'tools/v101/v101.py', 'tools/v101/lobby.js', 'tools/v101/semskins.js'} <= nomes, 'faltam os arquivos da v101 no ZIP'   # v101: o lobby da imagem da noite e só o CRIAR TAMPINHA
    assert b'window.RachaLobby101' in jogo and b'window.RachaSemSkins101' in jogo, 'o jogo do ZIP não tem o lobby da v101 nem as prontas guardadas'
    # v102: a borda BOTÃO, o anel e o lobby com o MENU (no jogo) e o correio que reconhece a chave repetida do drizzle (na plataforma)
    assert {'app/public/game/v102.css', 'tools/v102/v102.py', 'tools/v102/borda.js', 'tools/v102/lobby.js', 'app/api/racha/erros.ts'} <= nomes, 'faltam os arquivos da v102 no ZIP'
    assert b'window.RachaLobby102' in jogo and b'v102SpriteAnel' in jogo, 'o jogo do ZIP não tem o lobby nem o anel da v102'
    # v102 (parte 2): o online mais liso (as direções e o crédito no quadro)
    assert 'tools/v102/liso.js' in nomes and b'RachaLiso102' in jogo, 'falta o online mais liso da v102 no ZIP'
    # v103: o lobby de dia, as salas sem bots, o árbitro, a ranqueada contra os bots no servidor, o perfil pelo chat e os sons do online
    assert {'app/public/game/v103.css', 'tools/v103/v103.py', 'tools/v103/lobby_dia.js', 'tools/v103/salas.js', 'tools/v103/arbitro.js',
            'tools/v103/ranqueada.js', 'tools/v103/chat_perfil.js', 'tools/v103/sons.js', 'tools/v103/arte/fundo_dia.webp'} <= nomes, 'faltam os arquivos da v103 no ZIP'
    assert all(x in jogo for x in (b'window.RachaArbitro103', b'window.RachaSalas103', b'window.RachaRanqueada103', b'window.RachaChatPerfil103', b'window.RachaSons103')), 'o jogo do ZIP não tem a v103'
    # v103 · controles: o controle e o teclado do jeito de cada um (Ajustes › Controles) e o analógico sem atraso
    assert {'app/public/game/v103-controles.css', 'tools/v103/controles.py', 'tools/v103/controles.js'} <= nomes, 'faltam os controles da v103 no ZIP'
    # v103 · tela: a tela cheia (o botão, o guia do iPhone e o campo até a beirada) e o app instalável (o manifesto, o service worker e os ícones)
    V103 = {'app/public/game/v103-tela.css', 'app/public/game/manifest.webmanifest', 'app/public/game/sw.js', 'app/public/game/icones/racha-192.png',
            'app/public/game/icones/racha-512.png', 'app/public/game/icones/racha-maskable-192.png', 'app/public/game/icones/racha-maskable-512.png',
            'app/public/game/icones/apple-touch-icon.png', 'tools/v103/tela.py', 'tools/v103/tela.js', 'tools/v103/icones.py'}
    assert V103 <= nomes, 'faltam os arquivos da v103 no ZIP: ' + ', '.join(sorted(V103 - nomes))
    assert b'window.RachaTela103' in jogo and b'rel="manifest" href="./manifest.webmanifest"' in jogo, 'o jogo do ZIP não tem a tela cheia nem o manifesto da v103'
    # v104: o painel dos jogadores com o árbitro arrastando, a tela inteira só com o jogo e o ranking que abre onde tem gente
    assert {'app/public/game/v104.css', 'tools/v104/v104.py', 'tools/v104/painel.js', 'tools/v104/tela_inteira.js', 'tools/v104/ranking.js'} <= nomes, 'faltam os arquivos da v104 no ZIP'
    assert all(x in jogo for x in (b'window.RachaPainel104', b'window.RachaTelaInteira104', b'window.RachaRanking104')), 'o jogo do ZIP não tem a v104'
    # v101: as migrações do banco que o deploy aplica (deploy/migracoes.conf) vão no ZIP (antes o app/.gitignore as deixava de fora)
    migr = [l.split()[0] for l in (RAIZ / 'deploy' / 'migracoes.conf').read_text(encoding='utf-8').splitlines() if l.strip() and not l.lstrip().startswith('#')]
    assert migr and all('app/db/migrations/' + m in nomes for m in migr), 'faltam migrações do banco no ZIP: ' + ', '.join(m for m in migr if 'app/db/migrations/' + m not in nomes)
    proibidos = sorted(n for n in nomes if proibido(n))      # v100: nenhum segredo, banco, chave ou pacote dentro do ZIP
    assert not proibidos, 'o ZIP levaria arquivos que não podem sair: ' + ', '.join(proibidos)
    if LANCAMENTO:
        assert 'presente:' not in c.split('window.RACHA_CONFIG = Object.assign(', 1)[1], 'o ZIP do lançamento tem o presente de teste'
    tem_exp = 'experimental: true' in c
    if PRODUCAO:
        assert not tem_exp and not (nomes & SO_TESTES), 'o ZIP da versão oficial ligaria o modo de testes'
        for n in nomes:   # nenhum arquivo do ZIP liga o servidor de testes (fora a documentação e os testes, que só o citam)
            if n.endswith(('.bat', '.sh', '.yaml', '.yml', 'Dockerfile', 'package.json', 'Procfile')) and not n.startswith('tests/'):
                assert b'RACHA_EXPERIMENTAL=1' not in z.read(n), n + ' liga o RACHA_EXPERIMENTAL'
    else:
        assert tem_exp and 'INICIAR-TESTES-NO-WINDOWS.bat' in nomes
h = hashlib.sha256(saida.read_bytes()).hexdigest()
print('ok ·', 'LANÇAMENTO (sem o painel e sem o presente de teste)' if LANCAMENTO else 'VERSÃO OFICIAL (sem o painel)' if PRODUCAO else 'VERSÃO DE TESTES (com o painel)', '·', saida, '·', len(arqs), 'arquivos ·',
      round(saida.stat().st_size / 1048576, 1), 'MB · sha256', h)
