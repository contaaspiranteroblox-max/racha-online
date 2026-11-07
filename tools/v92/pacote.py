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
    # v105: o jogo de corpo e a virada na hora (o núcleo e a partida contra os bots) e o contato desenhado no online
    assert {'tools/v105/corpo.py', 'tools/v105/corpo.js', 'tools/v105/rede.py', 'tools/v105/rede.js'} <= nomes, 'faltam os arquivos da v105 no ZIP'
    assert all(x in jogo for x in (b'window.RachaCorpo105', b'window.RachaContato105Jogo', b'viraNaHora')), 'o jogo do ZIP não tem a v105'
    # v105: o chat na tela do lobby (a barra da partida, embaixo, entre os atalhos e o JOGAR)
    assert {'app/public/game/v105-chat.css', 'tools/v105/chat_lobby.py', 'tools/v105/chat_lobby.js'} <= nomes, 'faltam os arquivos da v105 (o chat no lobby) no ZIP'
    assert b'window.RachaChatLobby105' in jogo and b'<link rel="stylesheet" href="./v105-chat.css">' in jogo, 'o jogo do ZIP não tem o chat no lobby da v105'
    # v105: as tampinhas criadas ficam (a leitura do começo não recusa mais as peças que entram depois) e a borda BOTÃO chapada para todo mundo
    assert {'tools/v105/cosmeticos.py', 'tools/v105/cosmeticos.js', 'tests/v105_cosmeticos_test.py'} <= nomes, 'faltam os arquivos da v105 no ZIP'
    assert all(x in jogo for x in (b'window.RachaCosmeticos105', b'TP.adiadas = {', b'R84.manterViva === true')), 'o jogo do ZIP não tem a v105'
    # v105: o TAMANHO DA BORDA da tampinha (sem · fina · normal · grossa; o tamanho no fim do código)
    assert {'tools/v105/borda.py', 'tools/v105/borda.js', 'tests/v105_borda_test.py'} <= nomes, 'faltam os arquivos da v105 (o tamanho da borda) no ZIP'
    assert all(x in jogo for x in (b'window.RachaBorda105', b'function tpSoDesenho', b'TAMANHO DA BORDA')), 'o jogo do ZIP não tem o tamanho da borda da v105'
    # v106: as bolas e as mascotes novas (os 3 padrões de bola, as 6 mascotes em medalhão e a borda Medalhão; os itens no catálogo)
    assert {'tools/v106/conteudo.py', 'tools/v106/conteudo.js', 'tools/v106/mascotes.js', 'tools/v106/bolas.js', 'tools/v106/catalogo.py', 'tests/v106_conteudo_test.py'} <= nomes, 'faltam os arquivos da v106 (as bolas e as mascotes) no ZIP'
    assert all(x in jogo for x in (b'window.RachaConteudo106', b'function msc106Mascote', b'function bl106Desenha', b'"tp_m_oncapreta"', b'"bola_sertao"')), 'o jogo do ZIP não tem as bolas e as mascotes da v106'
    # v106: os emojis da partida (o balão em cima da tampinha, a cruz dos 5, o online e a API do COFRE)
    assert {'tools/v106/emotes.py', 'tools/v106/emotes.js', 'app/public/game/v106-emotes.css', 'server/emotes106.js', 'tests/v106_emotes_test.py',
            'tests/v106_emotes_servidor_test.js'} <= nomes, 'faltam os arquivos da v106 (os emojis da partida) no ZIP'
    assert all(x in jogo for x in (b'window.RachaEmotes106', b'<link rel="stylesheet" href="./v106-emotes.css">', b"'racha-emotes-v106'")), 'o jogo do ZIP não tem os emojis da partida da v106'
    assert b"emotes106.aplica(Turma)" in z.read('server/turma.js'), 'o servidor do ZIP não tem os emojis da partida da v106'
    # v106: as mascotes só com quem comprou (o servidor das salas e a plataforma conferem as peças delas)
    assert {'server/mascotes106.js', 'app/api/racha/mascotes.ts', 'tests/v106_mascotes_servidor_test.mjs'} <= nomes, 'faltam os arquivos da v106 (as mascotes no servidor) no ZIP'
    assert b"require('./mascotes106')" in z.read('server/fundador96.js') and b'mascotesDaConta' in z.read('app/api/racha/v88/comum.ts'), 'o servidor do ZIP não confere as mascotes da v106'
    # v106: o COFRE no estilo das fotos (o pedestal, as abas CARTÕES · SKIN · EMOJI · ESCUDO DO CLUBE · BOLA · MAIS e os cartões bege)
    assert {'app/public/game/v106-cofre.css', 'tools/v106/cofre.py', 'tools/v106/cofre.js', 'tests/v106_cofre_test.py'} <= nomes, 'faltam os arquivos da v106 (o cofre) no ZIP'
    assert all(x in jogo for x in (b'window.RachaCofre106', b'<link rel="stylesheet" href="./v106-cofre.css">', b'CRIAR\\nPERSONALIZADO')), 'o jogo do ZIP não tem o cofre da v106'
    # v107: o perfil pelo nome (a janelinha PERFIL · CONVIDAR · DENUNCIAR no chat, o cartão da sala e o painel da partida) e o convite pelo chat
    assert {'app/public/game/v107-perfil.css', 'tools/v107/perfil.py', 'tools/v107/perfil.js', 'server/convite107.js', 'tests/v107_perfil_test.py',
            'tests/v107_convite_servidor_test.mjs'} <= nomes, 'faltam os arquivos da v107 (o perfil pelo nome e o convite pelo chat) no ZIP'
    assert all(x in jogo for x in (b'window.RachaPerfil107', b'<link rel="stylesheet" href="./v107-perfil.css">', b'function pf107Posiciona')), 'o jogo do ZIP não tem a janelinha do nome da v107'
    assert b"require('./convite107').aplica(Turma" in z.read('server/turma.js'), 'o servidor do ZIP não tem o convite pelo chat da v107'
    # v107: o árbitro arrastando os jogadores na sala (o cartão) e na partida (sem segurar), e a faixa de quem foi movido
    assert {'app/public/game/v107-painel.css', 'tools/v107/painel.py', 'tools/v107/painel.js', 'tests/v107_painel_test.py'} <= nomes, 'faltam os arquivos da v107 (arrastar na sala e na partida) no ZIP'
    assert all(x in jogo for x in (b'window.RachaPainel107', b'<link rel="stylesheet" href="./v107-painel.css">', b'function pn107AlvoSala', b'function pn107LeLinha')), 'o jogo do ZIP não tem o arrastar da v107'
    # v107: os gestos do emoji e das falas (segurar e arrastar: a cruz no meio da tela, o aro e o X; a cruz das frases e o COFRE)
    assert {'app/public/game/v107-gestos.css', 'tools/v107/gestos.py', 'tools/v107/gestos.js', 'tests/v107_gestos_test.py'} <= nomes, 'faltam os arquivos da v107 (os gestos) no ZIP'
    assert all(x in jogo for x in (b'window.RachaGestos107', b'<link rel="stylesheet" href="./v107-gestos.css">', b"'racha-falas-v107'")), 'o jogo do ZIP não tem os gestos da v107'
    # v107: o anel do chute bem branco (o V95S.luz de volta a 1 e o branco opaco, na partida e na Oficina)
    assert {'tools/v107/chute.py', 'tools/v107/chute.js', 'tests/v107_chute_test.py'} <= nomes, 'faltam os arquivos da v107 (o anel do chute) no ZIP'
    assert all(x in jogo for x in (b'window.RachaChute107', b'function v107SpriteBranco', b"g.fillStyle = '#ffffff'; g.fill(); g.restore();")), 'o jogo do ZIP não tem o anel do chute bem branco da v107'   # (v111: o código, não o comentário — o jogo vai sem comentários)
    # v108: o online sem câmera lenta (o deslize com prazo, o pulo pelo somado e o replay uma vez por quadro da tela) e, no
    # servidor das salas, o ritmo dos comandos num balde e o motor que alcança 12 passos
    assert {'tools/v108/lento.py', 'tools/v108/lento.js', 'server/partida/ritmo108.js', 'tests/v108_lento_test.py', 'tests/v108_rede_test.mjs',
            'tests/v108_servidor_test.mjs'} <= nomes, 'faltam os arquivos da v108 (o online sem câmera lenta) no ZIP'
    assert all(x in jogo for x in (b'window.RachaLento108', b'function v108Anda', b'function v108Cabe', b"MODS['./ritmo108']")), 'o jogo do ZIP não tem o online sem câmera lenta da v108'
    sala = z.read('server/partida/sala.js')
    assert all(x in sala for x in (b"require('./ritmo108')", b'R108.passa(q.ritmo, ag)', b'const MOTOR_ALCANCA =')) and b'MAX_CMD_S' not in sala, 'o servidor do ZIP não tem o ritmo dos comandos e o motor da v108'
    # v109: os dois painéis do RACHA CONTROL (o do Dono e o da staff), o 2FA com QR code e o silêncio do chat nas salas
    assert {'tools/v109/silencio.py', 'tools/v109/silencio.js', 'server/silencio109.js', 'app/api/racha/v109/staff.ts', 'app/api/racha/v109/dono.ts',
            'app/api/racha/v109/comum109.ts', 'app/src/pages/PainelDono.tsx', 'app/src/pages/PainelStaff.tsx', 'app/src/pages/PainelComum.tsx',
            'app/src/lib/qr109.ts', 'app/db/migrations/v109_painel.sql', 'deploy/bin/racha-2fa', 'tests/v109_painel_test.py',
            'tests/v109_painel_servidor_test.mjs', 'tests/v109_silencio_salas_test.js'} <= nomes, 'faltam os arquivos da v109 (os dois painéis) no ZIP'
    assert b'window.RachaSilencio109' in jogo, 'o jogo do ZIP não tem o aviso do silêncio da v109'
    assert b'silencio109.aplica(Turma)' in z.read('server/turma.js'), 'o servidor do ZIP não tem o silêncio da equipe da v109'
    # v110: o botão de metal e as sombras (a BOTÃO como nas imagens; a sombra por dentro em todas as tampinhas)
    assert {'tools/v110/botao.py', 'tools/v110/botao.js', 'tests/v110_botao_test.py'} <= nomes, 'faltam os arquivos da v110 (o botão de metal) no ZIP'
    assert b'window.RachaBotao110' in jogo, 'o jogo do ZIP não tem o botão de metal da v110'
    # v111: o jogo mais leve — as imagens de versões antigas que não aparecem mais viram o pontinho e o jogo vai sem os comentários
    # e sem o recuo (a cópia completa fica em tests/build, fora do ZIP); e os tipos do server/ip.js (o tsc -b do CI)
    assert {'tools/v111/enxuga.py', 'tests/v111_enxuga_test.mjs', 'server/ip.d.ts'} <= nomes, 'faltam os arquivos da v111 (o jogo mais leve) no ZIP'
    assert jogo.count(b'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7') == 5 and b'/*PHYS_START*/' in jogo \
        and 'RACHA v103 · tela cheia'.encode() not in jogo, 'o jogo do ZIP não é o enxuto da v111'
    # v112: o online sem travar a tela (a página sem mudar a cada quadro, o placar sem medir texto), o medidor da partida e o
    # colchão da fila de comandos no servidor (desligado por padrão: RACHA_COLCHAO=1 liga)
    assert {'tools/v112/v112.py', 'tools/v112/tela.js', 'tools/v112/diag.js', 'server/partida/colchao112.js', 'tests/v112_tela_test.py',
            'tests/v112_colchao_test.mjs', 'tests/v112/sim.mjs', 'tests/v112/pareado.mjs', 'tests/v112_fps_medidas.py'} <= nomes, 'faltam os arquivos da v112 no ZIP'
    assert all(x in jogo for x in (b'window.RachaDiag', b'window.RachaTela112', b"MODS['./colchao112']", b"medeTxt(linha, '24px ' + FONT) + 36")), 'o jogo do ZIP não tem a v112'
    assert b"require('./colchao112')" in sala and b"process.env.RACHA_COLCHAO === '1'" in sala, 'o servidor do ZIP não tem o colchão da v112 (desligado por padrão)'
    # v114: a sala personalizada com até 17 pessoas
    assert 'tests/v114_sala17_test.py' in nomes and b'const MAX_GENTE = 17' in z.read('server/turma.js'), 'o ZIP não tem a v114 (a sala com 17)'
    # v113: as salas personalizadas com 10 minutos e a saída do Time Vermelho no começo
    assert {'tools/v113/v113.py', 'tests/v113_salas_test.mjs', 'tests/v113_salas_test.py'} <= nomes, 'faltam os arquivos da v113 no ZIP'
    assert b'const SL_TEMPOS = [0, 2, 3, 5, 10]' in jogo and b'this.saidaTime = this.ranked ? this.agora() % 2 : 0' in sala, 'o ZIP não tem a v113'
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
